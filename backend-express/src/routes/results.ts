import { Router, Response } from "express";
import { pool } from "../db/connection";
import {
  teacherAuth,
  AuthenticatedRequest,
} from "../middleware/teacherAuth";
import { resultSaveLimiter } from "../middleware/rateLimiter";

const router = Router();

// 결과 저장 (인터뷰 완료 시 - 인증 불필요)
router.post("/sessions/:sessionId/results", resultSaveLimiter, async (req, res) => {
  const { sessionId } = req.params;
  const {
    studentName,
    studentId,
    interviewMode,
    topicsData,
    summary,
    startedAt,
  } = req.body;

  if (!studentName || !interviewMode || !topicsData) {
    res.status(400).json({ error: "필수 정보가 누락되었습니다" });
    return;
  }

  try {
    // 세션 확인
    const sessionResult = await pool.query(
      "SELECT id FROM sessions WHERE id = $1 AND status = 'active'",
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      res
        .status(404)
        .json({ error: "세션을 찾을 수 없거나 종료되었습니다" });
      return;
    }

    // 통계 계산
    const topics = topicsData.topics || [];
    const totalTimeUsed = topics.reduce(
      (sum: number, t: { timeUsed?: number }) => sum + (t.timeUsed || 0),
      0
    );
    const totalTurns = topics.reduce(
      (sum: number, t: { conversations?: unknown[] }) =>
        sum + (t.conversations?.length || 0),
      0
    );

    // 결과 저장
    const result = await pool.query(
      `INSERT INTO interview_results
       (session_id, student_name, student_id, interview_mode, topics_data, summary,
        started_at, total_time_used, total_turns)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, completed_at`,
      [
        sessionId,
        studentName,
        studentId || null,
        interviewMode,
        JSON.stringify(topicsData),
        summary ? JSON.stringify(summary) : null,
        startedAt || new Date().toISOString(),
        totalTimeUsed,
        totalTurns,
      ]
    );

    res.status(201).json({
      resultId: result.rows[0].id,
      completedAt: result.rows[0].completed_at,
    });
  } catch (err) {
    console.error("Save result error:", err);
    res.status(500).json({ error: "결과 저장 중 오류가 발생했습니다" });
  }
});

// 세션별 결과 목록 조회 (교사용)
router.get(
  "/sessions/:sessionId/results",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;

    try {
      // 세션 소유권 확인
      const sessionResult = await pool.query(
        "SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2",
        [sessionId, req.teacher!.id]
      );

      if (sessionResult.rows.length === 0) {
        res.status(404).json({ error: "세션을 찾을 수 없습니다" });
        return;
      }

      // 결과 목록 조회
      const results = await pool.query(
        `SELECT
          id, student_name, student_id, interview_mode,
          total_time_used, total_turns,
          summary->>'overallComment' as overall_comment,
          started_at, completed_at
         FROM interview_results
         WHERE session_id = $1
         ORDER BY completed_at DESC`,
        [sessionId]
      );

      res.json({ results: results.rows });
    } catch (err) {
      console.error("List results error:", err);
      res
        .status(500)
        .json({ error: "결과 목록 조회 중 오류가 발생했습니다" });
    }
  }
);

// 결과 상세 조회 (교사용)
router.get(
  "/results/:resultId",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { resultId } = req.params;

    try {
      const result = await pool.query(
        `SELECT r.*
         FROM interview_results r
         JOIN sessions s ON r.session_id = s.id
         WHERE r.id = $1 AND s.teacher_id = $2`,
        [resultId, req.teacher!.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "결과를 찾을 수 없습니다" });
        return;
      }

      res.json({ result: result.rows[0] });
    } catch (err) {
      console.error("Get result error:", err);
      res.status(500).json({ error: "결과 조회 중 오류가 발생했습니다" });
    }
  }
);

// 결과 삭제 (교사용)
router.delete(
  "/results/:resultId",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { resultId } = req.params;

    try {
      const result = await pool.query(
        `DELETE FROM interview_results
         WHERE id = $1
         AND session_id IN (SELECT id FROM sessions WHERE teacher_id = $2)
         RETURNING id`,
        [resultId, req.teacher!.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "결과를 찾을 수 없습니다" });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Delete result error:", err);
      res.status(500).json({ error: "결과 삭제 중 오류가 발생했습니다" });
    }
  }
);

// 세션 통계 조회 (교사용)
router.get(
  "/sessions/:sessionId/stats",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;

    try {
      // 세션 소유권 확인
      const sessionCheck = await pool.query(
        "SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2",
        [sessionId, req.teacher!.id]
      );

      if (sessionCheck.rows.length === 0) {
        res.status(404).json({ error: "세션을 찾을 수 없습니다" });
        return;
      }

      const result = await pool.query(
        "SELECT * FROM session_result_stats WHERE session_id = $1",
        [sessionId]
      );

      if (result.rows.length === 0) {
        res.json({
          stats: {
            result_count: 0,
            avg_time_used: 0,
            avg_turns: 0,
          },
        });
        return;
      }

      res.json({ stats: result.rows[0] });
    } catch (err) {
      console.error("Get stats error:", err);
      res.status(500).json({ error: "통계 조회 중 오류가 발생했습니다" });
    }
  }
);

export default router;
