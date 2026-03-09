export type InterviewPhase =
  | "upload"
  | "analyzing"
  | "prep"
  | "interview"
  | "finalizing"
  | "result";

export type InterviewMode = "chat" | "voice";

export type TopicStatus = "pending" | "active" | "done";

export interface Topic {
  id: string;
  title: string;
  timeLeft: number;
  totalTime: number;
  conversations: Conversation[];
  status: TopicStatus;
  started: boolean;
}

export interface Conversation {
  role: "ai" | "student";
  text: string;
  timestamp?: number;
}

export interface InterviewSettings {
  topicCount: number;
  topicDuration: number;
  interviewMode: InterviewMode | "student_choice";
}

export interface InterviewSummary {
  strengths: string[];
  weaknesses: string[];
  overallComment: string;
}

export interface InterviewState {
  phase: InterviewPhase;
  topics: Topic[];
  currentTopicIndex: number;
  extractedText: string;
  interviewMode: InterviewMode;
  aiGenerating: boolean;
  summary: InterviewSummary | null;
  error: string | null;
}
