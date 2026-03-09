"use client";

import type { InterviewSummary, Topic } from "@/types/interview";

interface ResultCardProps {
  summary: InterviewSummary;
  topics: Topic[];
  onReset: () => void;
}

export function ResultCard({ summary, topics, onReset }: ResultCardProps) {
  return (
    <div
      className="max-w-2xl w-full mx-auto bg-white rounded-2xl shadow-lg p-8"
      data-testid="result-card"
    >
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
        인터뷰 결과
      </h2>

      {/* 주제 요약 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
          다룬 주제
        </h3>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <span
              key={topic.id}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
            >
              {topic.title}
            </span>
          ))}
        </div>
      </div>

      {/* 강점 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
          <span>&#9989;</span> 강점
        </h3>
        <ul className="space-y-2">
          {summary.strengths.map((s, idx) => (
            <li
              key={idx}
              className="pl-4 border-l-2 border-green-300 text-gray-700"
            >
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* 개선점 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-orange-700 mb-3 flex items-center gap-2">
          <span>&#128161;</span> 개선점
        </h3>
        <ul className="space-y-2">
          {summary.weaknesses.map((w, idx) => (
            <li
              key={idx}
              className="pl-4 border-l-2 border-orange-300 text-gray-700"
            >
              {w}
            </li>
          ))}
        </ul>
      </div>

      {/* 종합 평가 */}
      <div className="mb-8 bg-gray-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <span>&#128221;</span> 종합 평가
        </h3>
        <p className="text-gray-700 leading-relaxed">
          {summary.overallComment}
        </p>
      </div>

      {/* 다시 시작 버튼 */}
      <button
        onClick={onReset}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        data-testid="restart-button"
      >
        새 인터뷰 시작
      </button>
    </div>
  );
}
