"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 6) {
      router.push(`/join/${trimmed}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            세션 참가
          </h1>
          <p className="text-gray-500 mb-8">
            교사에게 받은 접속 코드를 입력하세요
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().slice(0, 6))
              }
              maxLength={6}
              className="w-full text-center text-3xl font-mono font-bold tracking-[0.3em] px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
              placeholder="______"
              autoFocus
            />

            <button
              type="submit"
              disabled={code.trim().length !== 6}
              className="w-full mt-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              참가하기
            </button>
          </form>

          <div className="mt-6">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
