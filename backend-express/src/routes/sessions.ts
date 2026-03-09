import { Router, Response } from "express";
import { pool } from "../db/connection";
import {
  teacherAuth,
  AuthenticatedRequest,
} from "../middleware/teacherAuth";
import { joinLimiter } from "../middleware/rateLimiter";

const router = Router();

// 세션 목록 조회
router.get(
  "/sessions",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, title, description, topic_count, topic_duration, interview_mode,
                access_code, status, created_at, activated_at, closed_at
         FROM sessions
         WHERE teacher_id = $1
         ORDER BY created_at DESC`,
        [req.teacher!.id]
      );

      res.json({ sessions: result.rows });
    } catch (err) {
      console.error("List sessions error:", err);
      res.status(500).json({ error: "세션 목록 조회 중 오류가 발생했습니다" });
    }
  }
);

// 세션 생성
router.post(
  "/sessions",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { title, description, topicCount, topicDuration, interviewMode } =
      req.body;

    if (!title) {
      res.status(400).json({ error: "세션 제목이 필요합니다" });
      return;
    }

    try {
      const result = await pool.query(
        `INSERT INTO sessions (teacher_id, title, description, topic_count, topic_duration, interview_mode)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, description, topic_count, topic_duration, interview_mode, status, created_at`,
        [
          req.teacher!.id,
          title,
          description || null,
          topicCount || 3,
          topicDuration || 180,
          interviewMode || "student_choice",
        ]
      );

      res.status(201).json({ session: result.rows[0] });
    } catch (err) {
      console.error("Create session error:", err);
      res.status(500).json({ error: "세션 생성 중 오류가 발생했습니다" });
    }
  }
);

// 세션 상세 조회
router.get(
  "/sessions/:id",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2`,
        [req.params.id, req.teacher!.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "세션을 찾을 수 없습니다" });
        return;
      }

      res.json({ session: result.rows[0] });
    } catch (err) {
      console.error("Get session error:", err);
      res.status(500).json({ error: "세션 조회 중 오류가 발생했습니다" });
    }
  }
);

// 세션 활성화 (access code 생성)
router.patch(
  "/sessions/:id/activate",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const codeResult = await pool.query(
        "SELECT generate_access_code() as code"
      );
      const accessCode = codeResult.rows[0].code;

      const result = await pool.query(
        `UPDATE sessions
         SET status = 'active', access_code = $1, activated_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND teacher_id = $3 AND status = 'draft'
         RETURNING *`,
        [accessCode, req.params.id, req.teacher!.id]
      );

      if (result.rows.length === 0) {
        res.status(400).json({ error: "세션을 활성화할 수 없습니다" });
        return;
      }

      res.json({ session: result.rows[0] });
    } catch (err) {
      console.error("Activate session error:", err);
      res.status(500).json({ error: "세션 활성화 중 오류가 발생했습니다" });
    }
  }
);

// 세션 종료
router.patch(
  "/sessions/:id/close",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await pool.query(
        `UPDATE sessions
         SET status = 'closed', closed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND teacher_id = $2 AND status = 'active'
         RETURNING *`,
        [req.params.id, req.teacher!.id]
      );

      if (result.rows.length === 0) {
        res.status(400).json({ error: "세션을 종료할 수 없습니다" });
        return;
      }

      res.json({ session: result.rows[0] });
    } catch (err) {
      console.error("Close session error:", err);
      res.status(500).json({ error: "세션 종료 중 오류가 발생했습니다" });
    }
  }
);

// 학생용: Access Code로 세션 조회 (인증 불필요)
router.get("/sessions/join/:code", joinLimiter, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, topic_count, topic_duration, interview_mode
       FROM sessions
       WHERE access_code = $1 AND status = 'active'`,
      [String(req.params.code).toUpperCase()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "세션을 찾을 수 없거나 종료되었습니다" });
      return;
    }

    res.json({ session: result.rows[0] });
  } catch (err) {
    console.error("Join session error:", err);
    res.status(500).json({ error: "세션 조회 중 오류가 발생했습니다" });
  }
});

export default router;
