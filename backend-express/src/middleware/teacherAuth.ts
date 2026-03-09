import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "hwv4-jwt-secret-key";

export interface TeacherPayload {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  teacher?: TeacherPayload;
}

export function teacherAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "인증이 필요합니다" });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as TeacherPayload;
    req.teacher = payload;
    next();
  } catch {
    res.status(401).json({ error: "유효하지 않은 토큰입니다" });
  }
}
