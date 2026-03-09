"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type FormEvent,
} from "react";
import type { Conversation } from "@/types/interview";

interface ChatPanelProps {
  conversations: Conversation[];
  onSendMessage: (message: string) => void;
  isAiGenerating: boolean;
  isTopicExpired: boolean;
  streamingText: string;
}

export function ChatPanel({
  conversations,
  onSendMessage,
  isAiGenerating,
  isTopicExpired,
  streamingText,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 스크롤 자동 이동
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, streamingText]);

  // 포커스 관리
  useEffect(() => {
    if (!isAiGenerating && !isTopicExpired) {
      inputRef.current?.focus();
    }
  }, [isAiGenerating, isTopicExpired]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isAiGenerating || isTopicExpired) return;

      onSendMessage(trimmed);
      setInput("");
    },
    [input, isAiGenerating, isTopicExpired, onSendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col h-full" data-testid="chat-panel">
      {/* 대화 기록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversations.map((conv, idx) => (
          <div
            key={idx}
            className={`flex ${conv.role === "student" ? "justify-end" : "justify-start"}`}
            data-testid={`${conv.role}-message`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                conv.role === "ai"
                  ? "bg-gray-100 text-gray-900"
                  : "bg-blue-600 text-white"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {conv.text}
              </p>
            </div>
          </div>
        ))}

        {/* 스트리밍 응답 */}
        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-gray-100 text-gray-900">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5" />
              </p>
            </div>
          </div>
        )}

        {/* AI 생성 중 표시 */}
        {isAiGenerating && !streamingText && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-gray-100">
              <div className="flex items-center gap-1">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={conversationEndRef} />
      </div>

      {/* 입력 영역 */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-200"
      >
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isTopicExpired
                ? "시간이 초과되었습니다"
                : "답변을 입력하세요... (Enter로 전송)"
            }
            disabled={isAiGenerating || isTopicExpired}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isAiGenerating || isTopicExpired}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="send-button"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
}
