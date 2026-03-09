const PYTHON_API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";
const EXPRESS_API_BASE =
  process.env.NEXT_PUBLIC_EXPRESS_API_URL || "http://localhost:4010";

// 폴백 질문
const FALLBACK_QUESTIONS = [
  "이 과제에서 가장 중요한 개념은 무엇인가요?",
  "이 내용을 자신의 말로 설명해 주세요.",
  "이 과제를 통해 무엇을 배웠나요?",
  "이 주제와 관련된 실제 사례를 들어볼 수 있나요?",
  "이 내용을 다른 사람에게 어떻게 설명하시겠어요?",
];

// 폴백 주제
const FALLBACK_TOPICS = [
  { id: "t1", title: "핵심 개념 이해" },
  { id: "t2", title: "실제 적용 방법" },
  { id: "t3", title: "학습 내용 정리" },
];

export interface AnalyzeResponse {
  topics: Array<{ id: string; title: string }>;
  text: string;
  fallback?: boolean;
}

export interface QuestionResponse {
  question: string;
  fallback?: boolean;
}

export interface SummaryResponse {
  summary: {
    strengths: string[];
    weaknesses: string[];
    overallComment: string;
  };
  fallback?: boolean;
}

async function fetchJson<T>(
  baseUrl: string,
  path: string,
  body: object
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API 요청 실패: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // PDF 분석 → 주제 추출 (Python FastAPI)
  analyze: async (pdfBase64: string): Promise<AnalyzeResponse> => {
    try {
      return await fetchJson(PYTHON_API_BASE, "/api/analyze", { pdfBase64 });
    } catch (error) {
      console.error("Analyze failed, using fallback:", error);
      return {
        topics: FALLBACK_TOPICS,
        text: "PDF 분석에 실패하여 기본 주제로 진행합니다.",
        fallback: true,
      };
    }
  },

  // 다음 질문 생성 (Python FastAPI) + 폴백
  question: async (params: {
    topic: { id: string; title: string };
    assignmentText: string;
    previousQA: Array<{ role: string; text: string }>;
    studentAnswer: string;
    interviewMode: "chat" | "voice";
  }): Promise<QuestionResponse> => {
    try {
      return await fetchJson(PYTHON_API_BASE, "/api/question", params);
    } catch (error) {
      console.error("Question generation failed, using fallback:", error);
      const fallbackIndex =
        params.previousQA.length % FALLBACK_QUESTIONS.length;
      return {
        question: FALLBACK_QUESTIONS[fallbackIndex],
        fallback: true,
      };
    }
  },

  // 최종 평가 (Python FastAPI)
  summary: async (params: {
    transcript: string;
    topics: Array<{ title: string }>;
    assignmentText: string;
    interviewMode: "chat" | "voice";
  }): Promise<SummaryResponse> => {
    try {
      return await fetchJson(PYTHON_API_BASE, "/api/summary", params);
    } catch (error) {
      console.error("Summary generation failed:", error);
      return {
        summary: {
          strengths: ["인터뷰를 완료하셨습니다."],
          weaknesses: [
            "평가 생성에 실패했습니다. 나중에 다시 시도해주세요.",
          ],
          overallComment:
            "기술적 문제로 상세 평가를 제공할 수 없습니다.",
        },
        fallback: true,
      };
    }
  },

  // TTS (Express 백엔드)
  tts: async (text: string): Promise<Blob> => {
    const response = await fetch(`${EXPRESS_API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("TTS failed");
    return response.blob();
  },

  // STT (Express 백엔드)
  stt: async (audioBlob: Blob, context?: string): Promise<string> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    if (context) formData.append("context", context);

    const response = await fetch(`${EXPRESS_API_BASE}/api/stt`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("STT failed");
    const data = await response.json();
    return data.text || "";
  },
};
