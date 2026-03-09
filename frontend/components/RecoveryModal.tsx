"use client";

import { useCallback } from "react";
import { Modal } from "./Modal";

interface RecoveryModalProps {
  isOpen: boolean;
  savedAt: number;
  currentTopicIndex: number;
  totalTopics: number;
  onRecover: () => void;
  onDiscard: () => void;
}

export function RecoveryModal({
  isOpen,
  savedAt,
  currentTopicIndex,
  totalTopics,
  onRecover,
  onDiscard,
}: RecoveryModalProps) {
  const formatSavedTime = useCallback((timestamp: number) => {
    const diffMinutes = Math.round((Date.now() - timestamp) / 60000);

    if (diffMinutes < 1) return "방금 전";
    if (diffMinutes < 60) return `${diffMinutes}분 전`;

    return new Date(timestamp).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onDiscard} closeOnOverlayClick={false}>
      <div className="text-center" data-testid="recovery-modal">
        <div className="text-4xl mb-3">&#128269;</div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          이전 인터뷰 발견
        </h2>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600 space-y-1">
          <p>저장 시간: {formatSavedTime(savedAt)}</p>
          <p>
            진행 상황: {currentTopicIndex + 1} / {totalTopics} 주제
          </p>
        </div>

        <p className="text-gray-700 mb-6">
          이전 인터뷰를 이어서 하시겠습니까?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onRecover}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            data-testid="recover-button"
          >
            이어서 하기
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            data-testid="discard-button"
          >
            새로 시작
          </button>
        </div>
      </div>
    </Modal>
  );
}
