"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { joinSession, type Session } from "@/lib/teacherApi";
import Link from "next/link";

export default function JoinSessionPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    joinSession(code)
      .then(setSession)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "세션을 찾을 수 없습니다")
      )
      .finally(() => setLoading(false));
  }, [code]);

  const handleStart = () => {
    if (!session) return;

    const sessionConfig = {
      sessionId: session.id,
      topicCount: session.topic_count,
      topicDuration: session.topic_duration,
      interviewMode: session.interview_mode,
      sessionTitle: session.title,
    };

    localStorage.setItem("sessionConfig", JSON.stringify(sessionConfig));
    router.push("/interview");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">세션 확인 중...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md mx-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-red-500 text-xl mb-4">
              {error || "세션을 찾을 수 없습니다"}
            </div>
            <p className="text-gray-500 mb-6">
              코드를 다시 확인하거나 교사에게 문의하세요
            </p>
            <Link
              href="/join"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              다시 입력하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const modeLabel =
    session.interview_mode === "voice"
      ? "음성 인터뷰"
      : session.interview_mode === "chat"
      ? "채팅 인터뷰"
      : "모드 선택 가능";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-sm text-blue-600 font-medium mb-1">
              세션 참가
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {session.title}
            </h1>
            {session.description && (
              <p className="text-gray-500 mt-2">{session.description}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">토픽 수</span>
              <span className="font-medium text-gray-900">
                {session.topic_count}개
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">토픽당 시간</span>
              <span className="font-medium text-gray-900">
                {Math.floor(session.topic_duration / 60)}분
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">인터뷰 모드</span>
              <span className="font-medium text-gray-900">{modeLabel}</span>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            인터뷰 시작하기
          </button>

          <div className="mt-4 text-center">
            <Link
              href="/join"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              다른 코드 입력
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
