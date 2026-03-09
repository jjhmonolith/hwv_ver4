"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSpeechSynthesis, useWhisperRecognition } from "@/hooks/useSpeech";
import { VolumeIndicator } from "./VolumeIndicator";
import type { Conversation } from "@/types/interview";

interface VoicePanelProps {
  currentQuestion: string | null;
  conversations: Conversation[];
  onAnswer: (text: string) => void;
  isAiGenerating: boolean;
  isTopicExpired: boolean;
  onSpeakingChange: (speaking: boolean) => void;
  onListeningChange: (listening: boolean) => void;
  onTranscribingChange: (transcribing: boolean) => void;
}

export function VoicePanel({
  currentQuestion,
  conversations,
  onAnswer,
  isAiGenerating,
  isTopicExpired,
  onSpeakingChange,
  onListeningChange,
  onTranscribingChange,
}: VoicePanelProps) {
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();
  const {
    isListening,
    isTranscribing,
    volumeLevel,
    startListening,
    stopListening,
    resetTranscript,
  } = useWhisperRecognition();

  const lastQuestionRef = useRef<string | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // 상태 변경 전파
  useEffect(() => {
    onSpeakingChange(isSpeaking);
  }, [isSpeaking, onSpeakingChange]);

  useEffect(() => {
    onListeningChange(isListening);
  }, [isListening, onListeningChange]);

  useEffect(() => {
    onTranscribingChange(isTranscribing);
  }, [isTranscribing, onTranscribingChange]);

  // 스크롤 자동 이동
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  // AI 질문 재생 후 자동 마이크 활성화
  const playQuestionAndListen = useCallback(
    async (question: string) => {
      await speak(question, {
        onEnd: () => {
          if (!isTopicExpired) {
            startListening();
          }
        },
        onError: () => {
          if (!isTopicExpired) {
            startListening();
          }
        },
      });
    },
    [speak, startListening, isTopicExpired]
  );

  // 새 질문이 오면 자동 재생
  useEffect(() => {
    if (
      currentQuestion &&
      currentQuestion !== lastQuestionRef.current &&
      !isSpeaking &&
      !isListening &&
      !isTranscribing
    ) {
      lastQuestionRef.current = currentQuestion;
      playQuestionAndListen(currentQuestion);
    }
  }, [
    currentQuestion,
    isSpeaking,
    isListening,
    isTranscribing,
    playQuestionAndListen,
  ]);

  // 녹음 중지 및 제출
  const handleStopAndSubmit = useCallback(async () => {
    const transcript = await stopListening();
    if (transcript.trim()) {
      onAnswer(transcript);
    }
    resetTranscript();
  }, [stopListening, onAnswer, resetTranscript]);

  // 주제 만료 시 자동 중지
  useEffect(() => {
    if (isTopicExpired && (isSpeaking || isListening)) {
      stopSpeaking();
      if (isListening) {
        handleStopAndSubmit();
      }
    }
  }, [
    isTopicExpired,
    isSpeaking,
    isListening,
    stopSpeaking,
    handleStopAndSubmit,
  ]);

  return (
    <div className="flex flex-col h-full" data-testid="voice-panel">
      {/* 상태 표시 */}
      <div className="p-4 border-b border-gray-200">
        {isSpeaking && (
          <div
            className="flex items-center gap-2 text-blue-600"
            data-testid="tts-playing"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
            </span>
            AI가 말하는 중...
          </div>
        )}
        {isListening && (
          <div
            className="flex items-center gap-2 text-green-600"
            data-testid="listening"
          >
            <VolumeIndicator level={volumeLevel} />
            <span>녹음 중... (버튼을 눌러 제출)</span>
          </div>
        )}
        {isTranscribing && (
          <div
            className="flex items-center gap-2 text-yellow-600"
            data-testid="transcribing"
          >
            <svg
              className="animate-spin h-4 w-4"
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
            음성 인식 중...
          </div>
        )}
        {isAiGenerating && !isSpeaking && (
          <div
            className="flex items-center gap-2 text-purple-600"
            data-testid="ai-generating"
          >
            <svg
              className="animate-spin h-4 w-4"
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
            AI 응답 생성 중...
          </div>
        )}
        {!isSpeaking &&
          !isListening &&
          !isTranscribing &&
          !isAiGenerating && (
            <div className="text-gray-400 text-sm">대기 중...</div>
          )}
      </div>

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
              <span className="text-xs opacity-60 block mb-1">
                {conv.role === "ai" ? "AI" : "나"}
              </span>
              <p className="text-sm leading-relaxed">{conv.text}</p>
            </div>
          </div>
        ))}
        <div ref={conversationEndRef} />
      </div>

      {/* 컨트롤 버튼 */}
      <div className="p-4 border-t border-gray-200">
        {isListening ? (
          <button
            onClick={handleStopAndSubmit}
            className="w-full py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            data-testid="stop-recording"
          >
            <span className="text-lg">&#127908;</span>
            녹음 중지 및 제출
          </button>
        ) : (
          <button
            onClick={() => startListening()}
            disabled={
              isSpeaking || isTranscribing || isAiGenerating || isTopicExpired
            }
            className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="start-recording"
          >
            <span className="text-lg">&#127908;</span>
            {isTopicExpired ? "시간 초과" : "녹음 시작"}
          </button>
        )}
      </div>
    </div>
  );
}
