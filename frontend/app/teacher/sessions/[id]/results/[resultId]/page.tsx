"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchResult, deleteResult, type ResultDetail } from "@/lib/resultsApi";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function ResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const sessionId = params.id as string;
  const resultId = params.resultId as string;

  useEffect(() => {
    fetchResult(resultId)
      .then(setResult)
      .catch(() => {
        router.push(`/teacher/sessions/${sessionId}`);
      })
      .finally(() => setLoading(false));
  }, [resultId, sessionId, router]);

  const handleDelete = async () => {
    if (!confirm("이 결과를 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await deleteResult(resultId);
      router.push(`/teacher/sessions/${sessionId}`);
    } catch {
      alert("삭제에 실패했습니다");
      setDeleting(false);
    }
  };

  if (loading || !result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const topics = result.topics_data?.topics || [];
  const currentTopic = topics[selectedTopic];

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/teacher/sessions/${sessionId}`)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            &larr; 세션으로 돌아가기
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {result.student_name}님의 인터뷰 결과
              </h1>
              <p className="text-gray-600 mt-1">
                {result.interview_mode === "voice" ? "음성 모드" : "채팅 모드"}{" "}
                &middot; 총 {formatTime(result.total_time_used)} 소요 &middot;{" "}
                {result.total_turns}회 대화
                {result.student_id && ` · ${result.student_id}`}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(result.completed_at).toLocaleString("ko-KR")}
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deleting ? "삭제 중..." : "결과 삭제"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 평가 결과 */}
          <div className="lg:col-span-1 space-y-4">
            {result.summary ? (
              <>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="font-semibold text-lg text-green-700 mb-3">
                    강점
                  </h2>
                  <ul className="space-y-2">
                    {result.summary.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="text-gray-700 flex gap-2 text-sm"
                      >
                        <span className="text-green-500 shrink-0">&#10003;</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="font-semibold text-lg text-orange-700 mb-3">
                    개선점
                  </h2>
                  <ul className="space-y-2">
                    {result.summary.weaknesses.map((w, i) => (
                      <li
                        key={i}
                        className="text-gray-700 flex gap-2 text-sm"
                      >
                        <span className="text-orange-500 shrink-0">&#9651;</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="font-semibold text-lg text-gray-900 mb-3">
                    종합 평가
                  </h2>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {result.summary.overallComment}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
                평가 결과가 없습니다
              </div>
            )}
          </div>

          {/* 오른쪽: 대화 내용 */}
          <div className="lg:col-span-2">
            {/* 주제 탭 */}
            {topics.length > 0 && (
              <>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {topics.map((topic, idx) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(idx)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedTopic === idx
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>

                {/* 대화 내용 */}
                {currentTopic && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900">
                        {currentTopic.title}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {formatTime(currentTopic.timeUsed)} /{" "}
                        {formatTime(currentTopic.timeLimit)}
                      </span>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {currentTopic.conversations.map((conv, idx) => (
                        <div
                          key={idx}
                          className={`flex ${
                            conv.role === "ai"
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              conv.role === "ai"
                                ? "bg-gray-100 text-gray-900"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {conv.role === "ai" ? "AI" : "학생"}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">
                              {conv.text}
                            </p>
                          </div>
                        </div>
                      ))}
                      {currentTopic.conversations.length === 0 && (
                        <p className="text-center text-gray-400 py-4">
                          대화 내용이 없습니다
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
