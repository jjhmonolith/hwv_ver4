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

export interface Session {
  id: string;
  title: string;
  description: string | null;
  topic_count: number;
  topic_duration: number;
  interview_mode: string;
  access_code: string | null;
  status: "draft" | "active" | "closed";
  created_at: string;
  activated_at: string | null;
  closed_at: string | null;
}

export interface CreateSessionInput {
  title: string;
  description?: string;
  topicCount?: number;
  topicDuration?: number;
  interviewMode?: string;
}

export async function fetchSessions(): Promise<Session[]> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("세션 목록 조회 실패");
  const data = await res.json();
  return data.sessions;
}

export async function fetchSession(id: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("세션 조회 실패");
  const data = await res.json();
  return data.session;
}

export async function createSession(
  input: CreateSessionInput
): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "세션 생성 실패");
  }
  const data = await res.json();
  return data.session;
}

export async function activateSession(id: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions/${id}/activate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "세션 활성화 실패");
  }
  const data = await res.json();
  return data.session;
}

export async function closeSession(id: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions/${id}/close`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "세션 종료 실패");
  }
  const data = await res.json();
  return data.session;
}

export async function joinSession(
  code: string
): Promise<Session> {
  const res = await fetch(
    `${API_BASE}/api/sessions/join/${code.toUpperCase()}`
  );
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "세션을 찾을 수 없습니다");
  }
  const data = await res.json();
  return data.session;
}
