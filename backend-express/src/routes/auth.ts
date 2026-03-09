import { Router, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db/connection";
import {
  teacherAuth,
  AuthenticatedRequest,
} from "../middleware/teacherAuth";
import { loginLimiter, registerLimiter } from "../middleware/rateLimiter";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "hwv4-jwt-secret-key";

// 로그인
router.post("/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "이메일과 비밀번호가 필요합니다" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash, name FROM teachers WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
      return;
    }

    const teacher = result.rows[0];
    const valid = await bcrypt.compare(password, teacher.password_hash);

    if (!valid) {
      res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
      return;
    }

    const token = jwt.sign(
      { id: teacher.id, email: teacher.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다" });
  }
});

// 회원가입
router.post("/auth/register", registerLimiter, async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "이메일과 비밀번호가 필요합니다" });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO teachers (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [email, passwordHash, name || null]
    );

    const teacher = result.rows[0];
    const token = jwt.sign(
      { id: teacher.id, email: teacher.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
      },
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(409).json({ error: "이미 등록된 이메일입니다" });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "회원가입 처리 중 오류가 발생했습니다" });
  }
});

// 현재 사용자 정보
router.get(
  "/auth/me",
  teacherAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await pool.query(
        "SELECT id, email, name FROM teachers WHERE id = $1",
        [req.teacher!.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
        return;
      }

      res.json({ teacher: result.rows[0] });
    } catch (err) {
      console.error("Me error:", err);
      res.status(500).json({ error: "사용자 정보 조회 중 오류가 발생했습니다" });
    }
  }
);

export default router;
