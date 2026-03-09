"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseInterviewTimerProps {
  totalTime: number;
  currentTopicIndex: number;
  isTopicStarted: boolean;
  aiGenerating: boolean;
  isSpeaking: boolean;
  isTranscribing: boolean;
  isListening: boolean;
  interviewMode: "chat" | "voice";
}

interface UseInterviewTimerReturn {
  timeLeft: number;
  isExpired: boolean;
  resetTimer: () => void;
}

export function useInterviewTimer({
  totalTime,
  currentTopicIndex,
  isTopicStarted,
  aiGenerating,
  isSpeaking,
  isTranscribing,
  isListening,
  interviewMode,
}: UseInterviewTimerProps): UseInterviewTimerReturn {
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const prevTopicIndexRef = useRef(currentTopicIndex);
  const prevTotalTimeRef = useRef(totalTime);

  // totalTime 변경 시 타이머 동기화 (세션 설정 로드 후)
  useEffect(() => {
    if (totalTime !== prevTotalTimeRef.current) {
      setTimeLeft(totalTime);
      prevTotalTimeRef.current = totalTime;
    }
  }, [totalTime]);

  // 주제 변경 시 타이머 리셋
  useEffect(() => {
    if (currentTopicIndex !== prevTopicIndexRef.current) {
      setTimeLeft(totalTime);
      prevTopicIndexRef.current = currentTopicIndex;
    }
  }, [currentTopicIndex, totalTime]);

  // 타이머 틱 로직
  useEffect(() => {
    if (timeLeft <= 0) return;
    if (!isTopicStarted) return;

    let shouldTick: boolean;

    if (interviewMode === "voice") {
      // 음성 모드: 녹음 중에만 시간 차감
      shouldTick =
        isListening && !aiGenerating && !isSpeaking && !isTranscribing;
    } else {
      // 채팅 모드: AI 생성 중이 아닐 때 시간 차감
      shouldTick = !aiGenerating && !isSpeaking;
    }

    if (!shouldTick) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [
    timeLeft,
    isTopicStarted,
    aiGenerating,
    isSpeaking,
    isTranscribing,
    isListening,
    interviewMode,
  ]);

  const resetTimer = useCallback(() => {
    setTimeLeft(totalTime);
  }, [totalTime]);

  return {
    timeLeft,
    isExpired: timeLeft <= 0,
    resetTimer,
  };
}
