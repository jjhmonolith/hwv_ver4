import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import ttsRouter from "./routes/tts";
import sttRouter from "./routes/stt";
import authRouter from "./routes/auth";
import sessionsRouter from "./routes/sessions";
import resultsRouter from "./routes/results";
import { globalLimiter } from "./middleware/rateLimiter";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 4010;

// CORS 멀티 오리진 지원
const frontendUrls = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // 서버 간 호출 (origin 없음) 또는 허용 목록에 있으면 통과
      if (!origin || frontendUrls.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(globalLimiter);
app.use(express.json({ limit: "15mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "express" });
});

// 음성 API
app.use("/api", ttsRouter);
app.use("/api", sttRouter);

// 교사 인증 + 세션 관리 API
app.use("/api", authRouter);
app.use("/api", sessionsRouter);
app.use("/api", resultsRouter);

app.listen(PORT, () => {
  console.log(`Express backend running on port ${PORT}`);
});
