"use client";

export default function InterviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">&#128221;</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          인터뷰 중 오류가 발생했습니다
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          {error.message || "인터뷰 진행 중 문제가 발생했습니다."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            홈으로
          </a>
        </div>
      </div>
    </div>
  );
}
