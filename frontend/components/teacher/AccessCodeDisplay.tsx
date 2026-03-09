"use client";

import { useState } from "react";

interface AccessCodeDisplayProps {
  code: string;
}

export function AccessCodeDisplay({ code }: AccessCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
      <div className="text-sm text-blue-600 font-medium mb-2">
        학생 접속 코드
      </div>
      <div className="text-4xl font-mono font-bold tracking-[0.3em] text-blue-900">
        {code}
      </div>
      <button
        onClick={handleCopy}
        className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        {copied ? "복사됨!" : "코드 복사"}
      </button>
      <p className="text-xs text-blue-500 mt-2">
        학생들에게 이 코드를 공유하세요
      </p>
    </div>
  );
}
