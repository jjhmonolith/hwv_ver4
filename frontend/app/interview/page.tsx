"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useInterviewState } from "@/hooks/useInterviewState";
import { useInterviewTimer } from "@/hooks/useInterviewTimer";
import { useInterviewPersistence } from "@/hooks/useInterviewPersistence";
import { api } from "@/lib/api";
import { fileToBase64 } from "@/lib/utils";
import type { InterviewSettings, InterviewMode } from "@/types/interview";

import { UploadCard } from "@/components/UploadCard";
import { TopicPanel } from "@/components/TopicPanel";
import { VoicePanel } from "@/components/voice/VoicePanel";
import { ChatPanel } from "@/components/chatkit/ChatPanel";
import { ResultCard } from "@/components/ResultCard";
import { RecoveryModal } from "@/components/RecoveryModal";
import { saveResult } from "@/lib/resultsApi";

interface SessionConfig {
  sessionId: string;
  topicCount: number;
  topicDuration: number;
  interviewMode: string;
  sessionTitle: string;
}

export default function InterviewPage() {
  // 세션 설정 (접속 코드로 참가한 경우)
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(
    null
  );
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const interviewStartTimeRef = useRef<string>(new Date().toISOString());

  // 설정
  const [settings, setSettings] = useState<InterviewSettings>({
    topicCount: 3,
    topicDuration: 180,
    interviewMode: "student_choice",
  });

  // 인터뷰 상태 관리
  const {
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
  } = useInterviewState(settings);

  // 음성 상태 (VoicePanel에서 전파)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // 채팅 스트리밍
  const [streamingText, setStreamingText] = useState("");

  // 현재 질문 (음성 모드용)
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);

  // 모드 선택 대기
  const [showModeSelect, setShowModeSelect] = useState(false);

  // 복구 모달
  const [recoveryData, setRecoveryData] = useState<{
    savedAt: number;
    currentTopicIndex: number;
    totalTopics: number;
  } | null>(null);

  // 타이머
  const currentTopic = state.topics[state.currentTopicIndex];
  const { timeLeft, isExpired } = useInterviewTimer({
    totalTime: settings.topicDuration,
    currentTopicIndex: state.currentTopicIndex,
    isTopicStarted: currentTopic?.started || false,
    aiGenerating: state.aiGenerating,
    isSpeaking,
    isTranscribing,
    isListening,
    interviewMode: state.interviewMode,
  });

  // localStorage 저장
  const { checkRecovery, clearSaved } = useInterviewPersistence(state);

  // 첫 질문 생성 여부 추적
  const firstQuestionGeneratedRef = useRef(false);

  // 페이지 로드 시 세션 설정 + 복구 확인
  useEffect(() => {
    // 세션 설정 확인
    const configStr = localStorage.getItem("sessionConfig");
    if (configStr) {
      try {
        const config: SessionConfig = JSON.parse(configStr);
        setSessionConfig(config);
        setSettings({
          topicCount: config.topicCount,
          topicDuration: config.topicDuration,
          interviewMode: config.interviewMode as
            | InterviewMode
            | "student_choice",
        });
      } catch {
        // invalid config, ignore
      }
    }

    // 복구 확인
    const saved = checkRecovery();
    if (saved) {
      setRecoveryData({
        savedAt: saved.savedAt,
        currentTopicIndex: saved.currentTopicIndex,
        totalTopics: saved.topics.length,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 복구 처리
  const handleRecover = useCallback(() => {
    const saved = checkRecovery();
    if (saved) {
      restoreState(saved);
      setSettings({
        topicCount: saved.topics.length,
        topicDuration: saved.topics[0]?.totalTime || 180,
        interviewMode: saved.interviewMode,
      });
    }
    setRecoveryData(null);
  }, [checkRecovery, restoreState]);

  const handleDiscardRecovery = useCallback(() => {
    clearSaved();
    setRecoveryData(null);
  }, [clearSaved]);

  // PDF 업로드 및 분석
  const handleUpload = useCallback(
    async (file: File, uploadSettings: InterviewSettings) => {
      setSettings(uploadSettings);
      setPhase("analyzing");
      interviewStartTimeRef.current = new Date().toISOString();

      try {
        const base64 = await fileToBase64(file);
        const result = await api.analyze(base64);

        const topics = initializeTopics(result.topics, result.text);

        if (result.fallback) {
          setError("PDF 분석에 실패하여 기본 주제로 진행합니다.");
        }

        // 인터뷰 모드 결정
        if (uploadSettings.interviewMode === "student_choice") {
          setShowModeSelect(true);
        } else {
          setInterviewMode(uploadSettings.interviewMode as InterviewMode);
          await generateFirstQuestion(topics, result.text, uploadSettings.interviewMode as InterviewMode);
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError("파일 업로드에 실패했습니다.");
        setPhase("upload");
      }
    },
    [setPhase, initializeTopics, setError, setInterviewMode]
  );

  // 모드 선택
  const handleModeSelect = useCallback(
    async (mode: InterviewMode) => {
      setInterviewMode(mode);
      setShowModeSelect(false);
      await generateFirstQuestion(state.topics, state.extractedText, mode);
    },
    [state.topics, state.extractedText, setInterviewMode]
  );

  // 첫 질문 생성
  const generateFirstQuestion = useCallback(
    async (
      topics: typeof state.topics,
      extractedText: string,
      mode: InterviewMode
    ) => {
      if (topics.length === 0) return;

      setAiGenerating(true);
      startTopic(0);

      try {
        const result = await api.question({
          topic: { id: topics[0].id, title: topics[0].title },
          assignmentText: extractedText,
          previousQA: [],
          studentAnswer: "",
          interviewMode: mode,
        });

        addConversation("ai", result.question);

        if (mode === "voice") {
          setCurrentQuestion(result.question);
        }
      } catch (err) {
        console.error("First question error:", err);
        const fallback = "이 과제에서 가장 중요한 개념은 무엇인가요?";
        addConversation("ai", fallback);
        if (mode === "voice") {
          setCurrentQuestion(fallback);
        }
      } finally {
        setAiGenerating(false);
      }
    },
    [setAiGenerating, startTopic, addConversation]
  );

  // 학생 답변 처리 (채팅/음성 공통)
  const handleStudentAnswer = useCallback(
    async (answerText: string) => {
      if (!currentTopic || state.aiGenerating) return;

      addConversation("student", answerText);
      setAiGenerating(true);
      setStreamingText("");
      setCurrentQuestion(null);

      try {
        const result = await api.question({
          topic: { id: currentTopic.id, title: currentTopic.title },
          assignmentText: state.extractedText,
          previousQA: currentTopic.conversations.map((c) => ({
            role: c.role,
            text: c.text,
          })),
          studentAnswer: answerText,
          interviewMode: state.interviewMode,
        });

        addConversation("ai", result.question);

        if (state.interviewMode === "voice") {
          setCurrentQuestion(result.question);
        }
      } catch (err) {
        console.error("Question generation error:", err);
        const fallback = "계속 설명해 주세요.";
        addConversation("ai", fallback);
        if (state.interviewMode === "voice") {
          setCurrentQuestion(fallback);
        }
      } finally {
        setAiGenerating(false);
        setStreamingText("");
      }
    },
    [
      currentTopic,
      state.aiGenerating,
      state.extractedText,
      state.interviewMode,
      addConversation,
      setAiGenerating,
    ]
  );

  // 다음 주제 처리
  const handleNextTopic = useCallback(async () => {
    const nextIndex = state.currentTopicIndex + 1;

    if (nextIndex >= state.topics.length) {
      // 마지막 주제 → 결과 생성
      nextTopic();
      setAiGenerating(true);
      setCurrentQuestion(null);

      try {
        const transcript = state.topics
          .map(
            (t) =>
              `[${t.title}]\n${t.conversations.map((c) => `${c.role}: ${c.text}`).join("\n")}`
          )
          .join("\n\n");

        const result = await api.summary({
          transcript,
          topics: state.topics.map((t) => ({ title: t.title })),
          assignmentText: state.extractedText,
          interviewMode: state.interviewMode,
        });

        // 세션이 있으면 결과 저장
        if (sessionConfig?.sessionId && studentName) {
          try {
            await saveResult(sessionConfig.sessionId, {
              studentName,
              studentId: studentId || undefined,
              interviewMode: state.interviewMode,
              topicsData: {
                extractedText: state.extractedText,
                topics: state.topics.map((t) => ({
                  id: t.id,
                  title: t.title,
                  timeUsed: t.totalTime - t.timeLeft,
                  timeLimit: t.totalTime,
                  conversations: t.conversations,
                })),
              },
              summary: result.summary,
              startedAt: interviewStartTimeRef.current,
            });
          } catch (saveErr) {
            console.error("Result save error:", saveErr);
          }
        }

        setSummary(result.summary);
        clearSaved();
        localStorage.removeItem("sessionConfig");
      } catch (err) {
        console.error("Summary error:", err);
        setSummary({
          strengths: ["인터뷰를 완료하셨습니다."],
          weaknesses: ["평가 생성에 실패했습니다."],
          overallComment: "기술적 문제로 상세 평가를 제공할 수 없습니다.",
        });
      } finally {
        setAiGenerating(false);
      }
    } else {
      // 다음 주제로 이동
      nextTopic();
      setCurrentQuestion(null);
      setAiGenerating(true);

      try {
        const nextTopicData = state.topics[nextIndex];
        const result = await api.question({
          topic: { id: nextTopicData.id, title: nextTopicData.title },
          assignmentText: state.extractedText,
          previousQA: [],
          studentAnswer: "",
          interviewMode: state.interviewMode,
        });

        addConversation("ai", result.question);

        if (state.interviewMode === "voice") {
          setCurrentQuestion(result.question);
        }
      } catch (err) {
        console.error("Next topic question error:", err);
        const fallback = "이 주제에 대해 어떻게 생각하시나요?";
        addConversation("ai", fallback);
        if (state.interviewMode === "voice") {
          setCurrentQuestion(fallback);
        }
      } finally {
        setAiGenerating(false);
      }
    }
  }, [
    state.currentTopicIndex,
    state.topics,
    state.extractedText,
    state.interviewMode,
    nextTopic,
    setAiGenerating,
    setSummary,
    addConversation,
    clearSaved,
  ]);

  // 시간 만료 시 자동 다음 주제
  useEffect(() => {
    if (isExpired && state.phase === "interview" && !state.aiGenerating) {
      handleNextTopic();
    }
  }, [isExpired, state.phase, state.aiGenerating, handleNextTopic]);

  // 리셋 핸들러
  const handleReset = useCallback(() => {
    reset();
    clearSaved();
    setCurrentQuestion(null);
    setStreamingText("");
    setShowModeSelect(false);
    setSessionConfig(null);
    setStudentName("");
    setStudentId("");
    localStorage.removeItem("sessionConfig");
    firstQuestionGeneratedRef.current = false;
  }, [reset, clearSaved]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 복구 모달 */}
      {recoveryData && (
        <RecoveryModal
          isOpen={true}
          savedAt={recoveryData.savedAt}
          currentTopicIndex={recoveryData.currentTopicIndex}
          totalTopics={recoveryData.totalTopics}
          onRecover={handleRecover}
          onDiscard={handleDiscardRecovery}
        />
      )}

      {/* 업로드 페이즈 */}
      {state.phase === "upload" && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-lg">
            {/* 세션 참가 시 학생 정보 입력 */}
            {sessionConfig && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
                <div className="text-sm text-blue-600 font-medium mb-1">
                  세션 참가
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {sessionConfig.sessionTitle}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="이름을 입력하세요"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      학번 (선택)
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="학번을 입력하세요"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
            <UploadCard
              onUpload={handleUpload}
              sessionSettings={sessionConfig ? settings : undefined}
            />
          </div>
        </div>
      )}

      {/* 분석 중 */}
      {state.phase === "analyzing" && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <svg
              className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
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
            <h2 className="text-xl font-bold text-gray-900">
              과제를 분석하고 있습니다...
            </h2>
            <p className="text-gray-500 mt-2">잠시만 기다려주세요</p>
          </div>
        </div>
      )}

      {/* 모드 선택 */}
      {showModeSelect && state.phase === "prep" && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              인터뷰 모드 선택
            </h2>
            <p className="text-gray-500 mb-6">
              {state.topics.length}개 주제가 준비되었습니다
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleModeSelect("chat")}
                className="w-full py-4 px-6 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 transition-colors text-left"
              >
                <div className="font-semibold text-blue-900">
                  &#128172; 채팅 모드
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  텍스트로 질문에 답변합니다
                </p>
              </button>
              <button
                onClick={() => handleModeSelect("voice")}
                className="w-full py-4 px-6 bg-green-50 border-2 border-green-200 rounded-xl hover:border-green-400 transition-colors text-left"
              >
                <div className="font-semibold text-green-900">
                  &#127908; 음성 모드
                </div>
                <p className="text-sm text-green-600 mt-1">
                  음성으로 질문에 답변합니다
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 인터뷰 진행 */}
      {(state.phase === "interview" || state.phase === "prep") &&
        !showModeSelect && (
          <div className="flex flex-col md:flex-row h-screen">
            {/* 사이드 패널 */}
            <TopicPanel
              topics={state.topics}
              currentTopicIndex={state.currentTopicIndex}
              timeLeft={timeLeft}
              isExpired={isExpired}
              onNextTopic={handleNextTopic}
            />

            {/* 메인 영역 */}
            <main className="flex-1 flex flex-col min-h-0">
              {/* 모드 표시 헤더 */}
              <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {state.interviewMode === "voice"
                    ? "&#127908; 음성 모드"
                    : "&#128172; 채팅 모드"}
                </span>
                {state.error && (
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    {state.error}
                  </span>
                )}
              </div>

              {/* 모드별 패널 */}
              {state.interviewMode === "voice" ? (
                <VoicePanel
                  currentQuestion={currentQuestion}
                  conversations={currentTopic?.conversations || []}
                  onAnswer={handleStudentAnswer}
                  isAiGenerating={state.aiGenerating}
                  isTopicExpired={isExpired}
                  onSpeakingChange={setIsSpeaking}
                  onListeningChange={setIsListening}
                  onTranscribingChange={setIsTranscribing}
                />
              ) : (
                <ChatPanel
                  conversations={currentTopic?.conversations || []}
                  onSendMessage={handleStudentAnswer}
                  isAiGenerating={state.aiGenerating}
                  isTopicExpired={isExpired}
                  streamingText={streamingText}
                />
              )}
            </main>
          </div>
        )}

      {/* 결과 분석 중 */}
      {state.phase === "finalizing" && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <svg
              className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
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
            <h2 className="text-xl font-bold text-gray-900">
              인터뷰 결과를 분석하고 있습니다...
            </h2>
          </div>
        </div>
      )}

      {/* 결과 표시 */}
      {state.phase === "result" && state.summary && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <ResultCard
            summary={state.summary}
            topics={state.topics}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
