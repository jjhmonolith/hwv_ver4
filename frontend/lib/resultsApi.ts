const API_BASE =
  process.env.NEXT_PUBLIC_EXPRESS_API_URL || "http://localhost:4010";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("teacherToken");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ResultSummary {
  id: string;
  student_name: string;
  student_id: string | null;
  interview_mode: "chat" | "voice";
  total_time_used: number;
  total_turns: number;
  overall_comment: string | null;
  started_at: string;
  completed_at: string;
}

export interface TopicData {
  id: string;
  title: string;
  timeUsed: number;
  timeLimit: number;
  conversations: Array<{
    role: "ai" | "student";
    text: string;
    timestamp?: number;
  }>;
}

export interface ResultDetail {
  id: string;
  session_id: string;
  student_name: string;
  student_id: string | null;
  interview_mode: "chat" | "voice";
  topics_data: {
    extractedText: string;
    topics: TopicData[];
  };
  summary: {
    strengths: string[];
    weaknesses: string[];
    overallComment: string;
  } | null;
  started_at: string;
  completed_at: string;
  total_time_used: number;
  total_turns: number;
}

export interface SessionStats {
  session_id: string;
  session_title: string;
  result_count: number;
  avg_time_used: number | null;
  avg_turns: number | null;
  first_result_at: string | null;
  last_result_at: string | null;
}

// 결과 저장 (인증 불필요 - 학생용)
export async function saveResult(
  sessionId: string,
  data: {
    studentName: string;
    studentId?: string;
    interviewMode: "chat" | "voice";
    topicsData: {
      extractedText: string;
      topics: Array<{
        id: string;
        title: string;
        timeUsed: number;
        timeLimit: number;
        conversations: Array<{
          role: "ai" | "student";
          text: string;
          timestamp?: number;
        }>;
      }>;
    };
    summary: {
      strengths: string[];
      weaknesses: string[];
      overallComment: string;
    } | null;
    startedAt: string;
  }
): Promise<{ resultId: string; completedAt: string }> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "결과 저장 실패");
  }
  return res.json();
}

// 세션별 결과 목록 (교사용)
export async function fetchResults(
  sessionId: string
): Promise<ResultSummary[]> {
  const res = await fetch(
    `${API_BASE}/api/sessions/${sessionId}/results`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("결과 목록 조회 실패");
  const data = await res.json();
  return data.results;
}

// 결과 상세 (교사용)
export async function fetchResult(resultId: string): Promise<ResultDetail> {
  const res = await fetch(`${API_BASE}/api/results/${resultId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("결과 조회 실패");
  const data = await res.json();
  return data.result;
}

// 결과 삭제 (교사용)
export async function deleteResult(resultId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/results/${resultId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("결과 삭제 실패");
}

// 세션 통계 (교사용)
export async function fetchSessionStats(
  sessionId: string
): Promise<SessionStats> {
  const res = await fetch(
    `${API_BASE}/api/sessions/${sessionId}/stats`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("통계 조회 실패");
  const data = await res.json();
  return data.stats;
}
