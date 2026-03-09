"use client";

import { useRouter } from "next/navigation";
import { SessionForm } from "@/components/teacher/SessionForm";
import { createSession, type CreateSessionInput } from "@/lib/teacherApi";
import { useState } from "react";

export default function NewSessionPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const handleCreate = async (input: CreateSessionInput) => {
    setError("");
    try {
      const session = await createSession(input);
      router.push(`/teacher/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 생성 실패");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        새 세션 만들기
      </h1>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <SessionForm onSubmit={handleCreate} />
    </div>
  );
}
