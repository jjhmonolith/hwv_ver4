import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!client) {
    client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }
  return client;
}

export async function textToSpeech(
  text: string,
  voiceId?: string
): Promise<Buffer> {
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

  const audio = await getClient().textToSpeech.convert(vid, {
    text,
    modelId: model,
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
    },
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audio) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
