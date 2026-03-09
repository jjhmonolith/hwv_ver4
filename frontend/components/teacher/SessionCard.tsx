"use client";

import Link from "next/link";
import type { Session } from "@/lib/teacherApi";

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
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
      : "text-gray-500 bg-gray-100";

  const modeLabel =
    session.interview_mode === "voice"
      ? "음성"
      : session.interview_mode === "chat"
      ? "채팅"
      : "학생 선택";

  return (
    <Link href={`/teacher/sessions/${session.id}`}>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-gray-900 text-lg">
            {session.title}
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>

        {session.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {session.description}
          </p>
        )}

        <div className="flex gap-4 text-xs text-gray-400">
          <span>토픽 {session.topic_count}개</span>
          <span>{Math.floor(session.topic_duration / 60)}분/토픽</span>
          <span>{modeLabel}</span>
        </div>

        {session.status === "active" && session.access_code && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">접속 코드: </span>
            <span className="font-mono font-bold text-blue-600 tracking-wider">
              {session.access_code}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
