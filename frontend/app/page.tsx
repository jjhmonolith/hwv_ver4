import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <main className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            HW Validator
          </h1>
          <p className="text-gray-500 mb-8">
            AI 과제 인터뷰 시스템 Ver.4
          </p>

          <div className="space-y-3">
            <Link
              href="/interview"
              className="block w-full py-3 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              인터뷰 시작
            </Link>

            <Link
              href="/join"
              className="block w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              세션 참가 (접속 코드 입력)
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              href="/teacher/login"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              교사 로그인
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
