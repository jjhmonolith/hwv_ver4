"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { InterviewSettings, InterviewMode } from "@/types/interview";

interface UploadCardProps {
  onUpload: (file: File, settings: InterviewSettings) => void;
  isLoading?: boolean;
  sessionSettings?: InterviewSettings;
}

export function UploadCard({
  onUpload,
  isLoading,
  sessionSettings,
}: UploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<InterviewSettings>(
    sessionSettings || {
      topicCount: 3,
      topicDuration: 180,
      interviewMode: "student_choice",
    }
  );
  // sessionSettings가 비동기로 로드되므로 prop 변경 시 동기화
  useEffect(() => {
    if (sessionSettings) {
      setSettings(sessionSettings);
    }
  }, [sessionSettings]);

  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = useCallback((selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      setError("PDF 파일만 업로드 가능합니다.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }
    setFile(selectedFile);
    setError(null);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;
      validateAndSetFile(selectedFile);
    },
    [validateAndSetFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) validateAndSetFile(droppedFile);
    },
    [validateAndSetFile]
  );

  const handleSubmit = useCallback(() => {
    if (!file) {
      setError("PDF 파일을 선택해주세요.");
      return;
    }
    onUpload(file, settings);
  }, [file, settings, onUpload]);

  return (
    <div
      className="max-w-lg w-full mx-auto bg-white rounded-2xl shadow-lg p-8"
      data-testid="upload-card"
    >
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
        과제 PDF 업로드
      </h2>

      {/* 드래그 앤 드롭 영역 */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : file
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
          data-testid="file-input"
        />

        {file ? (
          <div>
            <div className="text-3xl mb-2">&#128196;</div>
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {(file.size / 1024 / 1024).toFixed(1)}MB
            </p>
          </div>
        ) : (
          <div>
            <div className="text-3xl mb-2">&#128228;</div>
            <p className="text-gray-600">
              PDF 파일을 드래그하거나 클릭하여 선택
            </p>
            <p className="text-sm text-gray-400 mt-1">최대 10MB</p>
          </div>
        )}
      </div>

      {/* 설정 (세션 참가 시 숨김) */}
      {!sessionSettings && <div className="mt-6 space-y-4">
        <div className="flex gap-4">
          <label className="flex-1">
            <span className="text-sm font-medium text-gray-700">주제 개수</span>
            <select
              value={settings.topicCount}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  topicCount: Number(e.target.value),
                }))
              }
              disabled={isLoading}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
          </label>

          <label className="flex-1">
            <span className="text-sm font-medium text-gray-700">주제별 시간</span>
            <select
              value={settings.topicDuration}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  topicDuration: Number(e.target.value),
                }))
              }
              disabled={isLoading}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={60}>1분</option>
              <option value={120}>2분</option>
              <option value={180}>3분</option>
              <option value={300}>5분</option>
              <option value={600}>10분</option>
            </select>
          </label>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-700">인터뷰 모드</span>
          <div className="mt-2 flex gap-2">
            {[
              { value: "student_choice", label: "학생 선택" },
              { value: "chat", label: "채팅" },
              { value: "voice", label: "음성" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    interviewMode: option.value as InterviewMode | "student_choice",
                  }))
                }
                disabled={isLoading}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  settings.interviewMode === option.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>}

      {error && (
        <p
          className="mt-4 text-sm text-red-600 text-center"
          data-testid="error-message"
        >
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || isLoading}
        className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="submit-button"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            분석 중...
          </span>
        ) : (
          "분석 시작"
        )}
      </button>
    </div>
  );
}
