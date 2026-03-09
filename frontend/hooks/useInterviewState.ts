"use client";

import { useState, useCallback } from "react";
import type {
  InterviewPhase,
  InterviewMode,
  Topic,
  InterviewSettings,
  InterviewSummary,
  InterviewState,
} from "@/types/interview";

const initialState: InterviewState = {
  phase: "upload",
  topics: [],
  currentTopicIndex: 0,
  extractedText: "",
  interviewMode: "chat",
  aiGenerating: false,
  summary: null,
  error: null,
};

export function useInterviewState(settings: InterviewSettings) {
  const [state, setState] = useState<InterviewState>(initialState);

  const initializeTopics = useCallback(
    (topics: Array<{ id: string; title: string }>, text: string) => {
      const normalizedTopics: Topic[] = topics
        .slice(0, settings.topicCount)
        .map((t, idx) => ({
          id: t.id,
          title: t.title,
          timeLeft: settings.topicDuration,
          totalTime: settings.topicDuration,
          conversations: [],
          status: (idx === 0 ? "active" : "pending") as Topic["status"],
          started: false,
        }));

      setState((prev) => ({
        ...prev,
        topics: normalizedTopics,
        extractedText: text,
        currentTopicIndex: 0,
        phase: "prep",
      }));

      return normalizedTopics;
    },
    [settings.topicCount, settings.topicDuration]
  );

  const startTopic = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentTopicIndex: index,
      topics: prev.topics.map((t, i) => ({
        ...t,
        status: (i === index
          ? "active"
          : i < index
            ? "done"
            : "pending") as Topic["status"],
        started: i === index ? true : t.started,
      })),
      phase: "interview",
    }));
  }, []);

  const addConversation = useCallback(
    (role: "ai" | "student", text: string) => {
      setState((prev) => ({
        ...prev,
        topics: prev.topics.map((t, i) =>
          i === prev.currentTopicIndex
            ? {
                ...t,
                conversations: [
                  ...t.conversations,
                  { role, text, timestamp: Date.now() },
                ],
                started: true,
              }
            : t
        ),
      }));
    },
    []
  );

  const nextTopic = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentTopicIndex + 1;

      if (nextIndex >= prev.topics.length) {
        return {
          ...prev,
          phase: "finalizing" as InterviewPhase,
          topics: prev.topics.map((t) => ({
            ...t,
            status: "done" as Topic["status"],
          })),
        };
      }

      return {
        ...prev,
        currentTopicIndex: nextIndex,
        topics: prev.topics.map((t, i) => ({
          ...t,
          status: (i === nextIndex
            ? "active"
            : i < nextIndex
              ? "done"
              : "pending") as Topic["status"],
        })),
      };
    });
  }, []);

  const setAiGenerating = useCallback((generating: boolean) => {
    setState((prev) => ({ ...prev, aiGenerating: generating }));
  }, []);

  const setPhase = useCallback((phase: InterviewPhase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  const setInterviewMode = useCallback((mode: InterviewMode) => {
    setState((prev) => ({ ...prev, interviewMode: mode }));
  }, []);

  const setSummary = useCallback((summary: InterviewSummary) => {
    setState((prev) => ({ ...prev, summary, phase: "result" }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const restoreState = useCallback((savedState: InterviewState) => {
    setState(savedState);
  }, []);

  return {
    state,
    initializeTopics,
    startTopic,
    addConversation,
    nextTopic,
    setAiGenerating,
    setPhase,
    setInterviewMode,
    setSummary,
    setError,
    reset,
    restoreState,
  };
}
