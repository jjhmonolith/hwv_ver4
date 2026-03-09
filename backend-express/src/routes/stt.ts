import { Router } from "express";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import os from "os";
import { speechLimiter } from "../middleware/rateLimiter";

const router = Router();
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

router.post("/stt", speechLimiter, upload.single("audio"), async (req, res) => {
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: "audio file is required" });
    return;
  }

  try {
    const audioFile = fs.createReadStream(file.path);

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ko",
      prompt: (req.body.context as string) || "",
    });

    fs.unlinkSync(file.path);

    res.json({ text: transcription.text });
  } catch (error) {
    console.error("STT error:", error);

    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.status(500).json({ error: "STT transcription failed" });
  }
});

export default router;
