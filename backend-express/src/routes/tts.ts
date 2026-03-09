import { Router } from "express";
import { textToSpeech } from "../services/elevenlabs";
import { speechLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/tts", speechLimiter, async (req, res) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    if (text.length > 5000) {
      res.status(400).json({ error: "text too long (max 5000 chars)" });
      return;
    }

    const audioBuffer = await textToSpeech(text, voiceId);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.length),
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;
