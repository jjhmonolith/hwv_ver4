"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSessions, type Session } from "@/lib/teacherApi";
import { SessionCard } from "@/components/teacher/SessionCard";

export default function SessionsListPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "active" | "closed">(
    "all"
  );

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all"
      ? sessions
      : sessions.filter((s) => s.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">세션 관리</h1>
        <Link
          href="/teacher/sessions/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          새 세션 만들기
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "draft", "active", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all"
              ? "전체"
              : f === "draft"
              ? "준비 중"
              : f === "active"
              ? "활성"
              : "종료됨"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          {filter === "all"
            ? "세션이 없습니다"
            : "해당 상태의 세션이 없습니다"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
