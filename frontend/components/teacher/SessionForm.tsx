"use client";

import { useState } from "react";
import type { CreateSessionInput } from "@/lib/teacherApi";

interface SessionFormProps {
  onSubmit: (input: CreateSessionInput) => Promise<void>;
}

export function SessionForm({ onSubmit }: SessionFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicCount, setTopicCount] = useState(3);
  const [topicDuration, setTopicDuration] = useState(180);
  const [interviewMode, setInterviewMode] = useState("student_choice");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        title,
        description: description || undefined,
        topicCount,
        topicDuration,
        interviewMode,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          세션 제목 *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          placeholder="예: 2학년 1반 과제 인터뷰"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          설명 (선택)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          placeholder="세션에 대한 간단한 설명"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            토픽 수
          </label>
          <select
            value={topicCount}
            onChange={(e) => setTopicCount(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}개
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            토픽당 시간
          </label>
          <select
            value={topicDuration}
            onChange={(e) => setTopicDuration(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value={60}>1분</option>
            <option value={120}>2분</option>
            <option value={180}>3분</option>
            <option value={300}>5분</option>
            <option value={600}>10분</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          인터뷰 모드
        </label>
        <div className="flex gap-3">
          {[
            { value: "student_choice", label: "학생 선택" },
            { value: "voice", label: "음성 전용" },
            { value: "chat", label: "채팅 전용" },
          ].map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setInterviewMode(mode.value)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                interviewMode === mode.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !title}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "생성 중..." : "세션 만들기"}
      </button>
    </form>
  );
}
