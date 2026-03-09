"use client";

import { memo } from "react";
import type { Topic } from "@/types/interview";
import { formatTime } from "@/lib/utils";

interface TopicPanelProps {
  topics: Topic[];
  currentTopicIndex: number;
  timeLeft: number;
  isExpired: boolean;
  onNextTopic: () => void;
}

const TopicChip = memo(function TopicChip({
  topic,
  idx,
  isCurrent,
}: {
  topic: Topic;
  idx: number;
  isCurrent: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
        isCurrent
          ? "bg-blue-50 text-blue-700 font-medium"
          : topic.status === "done"
            ? "bg-green-50 text-green-700"
            : "bg-gray-50 text-gray-500"
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs border shrink-0">
        {topic.status === "done"
          ? "\u2713"
          : topic.status === "active"
            ? "\u25CF"
            : idx + 1}
      </span>
      <span className="truncate">{topic.title}</span>
    </div>
  );
});

export const TopicPanel = memo(function TopicPanel({
  topics,
  currentTopicIndex,
  timeLeft,
  isExpired,
  onNextTopic,
}: TopicPanelProps) {
  const currentTopic = topics[currentTopicIndex];
  const isLastTopic = currentTopicIndex === topics.length - 1;

  return (
    <div
      className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-3 md:p-4 flex md:flex-col gap-3 md:gap-4 items-center md:items-stretch shrink-0"
      data-testid="topic-panel"
    >
      {/* 타이머 */}
      <div className="text-center shrink-0">
        <div
          className={`text-2xl md:text-4xl font-mono font-bold ${
            isExpired
              ? "text-red-600"
              : timeLeft <= 30
                ? "text-orange-500"
                : "text-gray-900"
          }`}
          data-testid="timer"
        >
          {formatTime(timeLeft)}
        </div>
        {isExpired && (
          <p className="text-xs md:text-sm text-red-600 mt-1">시간 초과</p>
        )}
      </div>

      {/* 현재 주제 (데스크톱) */}
      <div className="hidden md:block border-t pt-3">
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          현재 주제
        </span>
        <h3 className="font-semibold text-gray-900 mt-1">
          {currentTopic?.title || "-"}
        </h3>
      </div>

      {/* 주제 목록 - 모바일: 가로 스크롤, 데스크톱: 세로 */}
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:flex-1 min-w-0">
        {topics.map((topic, idx) => (
          <TopicChip
            key={topic.id}
            topic={topic}
            idx={idx}
            isCurrent={idx === currentTopicIndex}
          />
        ))}
      </div>

      {/* 다음 주제 버튼 */}
      {currentTopic?.started && (
        <button
          onClick={onNextTopic}
          className="shrink-0 py-2 md:py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm md:text-base md:w-full"
          data-testid="next-topic-button"
        >
          {isLastTopic ? "인터뷰 완료" : "다음 주제로"}
        </button>
      )}
    </div>
  );
});
