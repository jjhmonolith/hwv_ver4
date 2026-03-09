"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchSession,
  activateSession,
  closeSession,
  type Session,
} from "@/lib/teacherApi";
import {
  fetchResults,
  type ResultSummary,
} from "@/lib/resultsApi";
import { AccessCodeDisplay } from "@/components/teacher/AccessCodeDisplay";
import Link from "next/link";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}분 ${secs}초`;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const sessionId = params.id as string;

  useEffect(() => {
    fetchSession(sessionId)
      .then((s) => {
        setSession(s);
        // 결과 목록도 로드
        setResultsLoading(true);
        fetchResults(sessionId)
          .then(setResults)
          .catch(() => {})
          .finally(() => setResultsLoading(false));
      })
      .catch(() => setError("세션을 불러올 수 없습니다"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleActivate = async () => {
    setActionLoading(true);
    setError("");
    try {
      const updated = await activateSession(sessionId);
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "활성화 실패");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    setActionLoading(true);
    setError("");
    try {
      const updated = await closeSession(sessionId);
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "종료 실패");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 py-12">로딩 중...</div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{error || "세션을 찾을 수 없습니다"}</p>
        <Link href="/teacher/sessions" className="text-blue-600 hover:text-blue-800">
          세션 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const modeLabel =
    session.interview_mode === "voice"
      ? "음성 전용"
      : session.interview_mode === "chat"
      ? "채팅 전용"
      : "학생 선택";

  const statusLabel =
    session.status === "draft"
      ? "준비 중"
      : session.status === "active"
      ? "활성"
      : "종료됨";

  const statusColor =
    session.status === "active"
      ? "text-green-600 bg-green-50"
      : session.status === "draft"
      ? "text-yellow-600 bg-yellow-50"
      : "text-gray-600 bg-gray-100";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.push("/teacher/sessions")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; 세션 목록
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {session.title}
            </h1>
            {session.description && (
              <p className="text-gray-500 mt-2">{session.description}</p>
            )}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500">토픽 수</div>
            <div className="text-xl font-bold text-gray-900">
              {session.topic_count}개
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500">토픽당 시간</div>
            <div className="text-xl font-bold text-gray-900">
              {Math.floor(session.topic_duration / 60)}분
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500">인터뷰 모드</div>
            <div className="text-xl font-bold text-gray-900">{modeLabel}</div>
          </div>
        </div>

        {session.status === "active" && session.access_code && (
          <div className="mb-6">
            <AccessCodeDisplay code={session.access_code} />
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          {session.status === "draft" && (
            <button
              onClick={handleActivate}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? "처리 중..." : "세션 활성화"}
            </button>
          )}
          {session.status === "active" && (
            <button
              onClick={handleClose}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? "처리 중..." : "세션 종료"}
            </button>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>생성일: {new Date(session.created_at).toLocaleString("ko-KR")}</p>
          {session.activated_at && (
            <p>
              활성화일:{" "}
              {new Date(session.activated_at).toLocaleString("ko-KR")}
            </p>
          )}
          {session.closed_at && (
            <p>
              종료일: {new Date(session.closed_at).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      </div>

      {/* 인터뷰 결과 섹션 */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          인터뷰 결과 ({results.length}건)
        </h2>

        {resultsLoading ? (
          <div className="text-center text-gray-500 py-8">로딩 중...</div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            아직 완료된 인터뷰가 없습니다
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <Link
                key={result.id}
                href={`/teacher/sessions/${sessionId}/results/${result.id}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {result.student_name}
                    </h3>
                    {result.student_id && (
                      <p className="text-sm text-gray-500">
                        {result.student_id}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      result.interview_mode === "voice"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {result.interview_mode === "voice" ? "음성" : "채팅"}
                  </span>
                </div>

                <div className="mt-2 flex gap-4 text-sm text-gray-600">
                  <span>
                    소요 시간: {formatTime(result.total_time_used)}
                  </span>
                  <span>대화 턴: {result.total_turns}회</span>
                </div>

                {result.overall_comment && (
                  <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                    {result.overall_comment}
                  </p>
                )}

                <p className="mt-2 text-xs text-gray-400">
                  {new Date(result.completed_at).toLocaleString("ko-KR")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
