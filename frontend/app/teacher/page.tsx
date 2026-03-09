"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSessions, type Session } from "@/lib/teacherApi";
import { SessionCard } from "@/components/teacher/SessionCard";

export default function TeacherDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeSessions = sessions.filter((s) => s.status === "active");
  const draftSessions = sessions.filter((s) => s.status === "draft");
  const closedSessions = sessions.filter((s) => s.status === "closed");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <Link
          href="/teacher/sessions/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          새 세션 만들기
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-blue-600">
            {activeSessions.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">활성 세션</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-gray-600">
            {draftSessions.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">준비 중</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-gray-400">
            {closedSessions.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">종료됨</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">로딩 중...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">아직 세션이 없습니다</p>
          <Link
            href="/teacher/sessions/new"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            첫 세션을 만들어 보세요
          </Link>
        </div>
      ) : (
        <div>
          {activeSessions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                활성 세션
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}
          {draftSessions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                준비 중인 세션
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {draftSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}
          {closedSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                종료된 세션
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {closedSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
