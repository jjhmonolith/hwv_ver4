"use client";

import { useEffect, useCallback, useRef } from "react";
import type { InterviewState } from "@/types/interview";

const STORAGE_KEY = "hwv_interview_state";
const MAX_AGE_MINUTES = 120;
const SAVE_DEBOUNCE_MS = 1000;

interface SavedState extends InterviewState {
  savedAt: number;
}

export function useInterviewPersistence(
  state: InterviewState,
  enabled: boolean = true
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 디바운스 자동 저장
  useEffect(() => {
    if (!enabled) return;
    if (state.phase !== "interview" && state.phase !== "finalizing") return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const dataToSave: SavedState = {
        ...state,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state.topics, state.currentTopicIndex, state.phase, enabled, state]);

  // 복구 확인
  const checkRecovery = useCallback((): SavedState | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const data: SavedState = JSON.parse(saved);
      const ageMinutes = (Date.now() - data.savedAt) / 60000;

      if (ageMinutes > MAX_AGE_MINUTES) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return data;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, []);

  // 저장된 데이터 삭제
  const clearSaved = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { checkRecovery, clearSaved };
}
