/**
 * Core domain types for AI Interviewer Pro.
 * Shared by the browser app, serverless API handlers and tests.
 */

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';

export type InterviewType =
  | 'hr'
  | 'behavioral'
  | 'technical'
  | 'project'
  | 'situational'
  | 'role'
  | 'mixed';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ResponseMode = 'typed' | 'spoken';

export type QuestionCategory =
  | 'introduction'
  | 'behavioral'
  | 'technical'
  | 'system-design'
  | 'project'
  | 'situational'
  | 'role-specific'
  | 'hr'
  | 'problem-solving'
  | 'communication';

export type QuestionSource = 'ai' | 'fallback' | 'bank';

export interface EvaluationCriterion {
  id: string;
  label: string;
  /** Relative weight 1-3; normalised before scoring. */
  weight: number;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  /** Primary skill this question probes (e.g. "System design"). */
  skill: string;
  criteria: EvaluationCriterion[];
  /** Suggested answer structure / rubric used during evaluation. */
  answerStructure: string[];
  source: QuestionSource;
  /** Seconds the candidate is encouraged to spend. */
  timeLimitSeconds: number;
  /** Set when this question was generated as a follow-up. */
  followUpFor?: string;
}

export interface InterviewConfig {
  role: string;
  experience: ExperienceLevel;
  industry: string;
  type: InterviewType;
  difficulty: Difficulty;
  questionCount: number;
  durationMinutes: number;
  mode: ResponseMode;
  jobDescription: string;
  resumeText: string;
  followUps: boolean;
}

export type DimensionId =
  | 'relevance'
  | 'completeness'
  | 'clarity'
  | 'structure'
  | 'specificity'
  | 'technical'
  | 'evidence'
  | 'communication';

export interface DimensionScore {
  id: DimensionId;
  label: string;
  /** 0-100 */
  score: number;
  /** Concrete evidence from the submitted answer. */
  evidence: string;
}

export type EvaluationGrade = 'needs-work' | 'developing' | 'solid' | 'strong';

export type EvaluationEngine = 'ai' | 'heuristic';

export interface Evaluation {
  questionId: string;
  /** 0-100 overall practice score. */
  overall: number;
  grade: EvaluationGrade;
  dimensions: DimensionScore[];
  strengths: string[];
  weaknesses: string[];
  missing: string[];
  suggestions: string[];
  /** Example of a stronger answer structure - never "the only right answer". */
  modelAnswerOutline: string[];
  engine: EvaluationEngine;
  /** Honest description of how this evaluation was produced. */
  disclaimer: string;
  evaluatedAt: string;
}

export type SessionState =
  | 'ready'
  | 'started'
  | 'question'
  | 'answering'
  | 'submitted'
  | 'feedback'
  | 'next-question'
  | 'completed'
  | 'abandoned';

export interface AnswerRecord {
  questionId: string;
  /** Final answer text (typed or corrected transcript). */
  text: string;
  /** Rough draft preserved while answering. */
  draft: string;
  submittedAt?: string;
  /** Seconds spent answering (excluding pauses). */
  durationSeconds: number;
  skipped: boolean;
  evaluation?: Evaluation;
  evaluationEngine?: EvaluationEngine;
}

export interface InterviewSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  config: InterviewConfig;
  state: SessionState;
  questionIndex: number;
  questions: InterviewQuestion[];
  answers: Record<string, AnswerRecord>;
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  /** When the active question moved into ANSWERING. */
  answerStartedAt?: string;
  /** Accumulated paused milliseconds before "now". */
  pausedMs: number;
  /** True when the AI provider produced the question set. */
  generatedByAi: boolean;
}

export interface SavedQuestion {
  id: string;
  question: InterviewQuestion;
  savedAt: string;
  practisedCount: number;
  lastPractisedAt?: string;
  lastScore?: number;
}

export interface PracticeRecord {
  questionId: string;
  question: InterviewQuestion;
  answer: string;
  evaluation?: Evaluation;
  practisedAt: string;
}

export interface PersonalGoal {
  id: string;
  label: string;
  /** Target number of completed interviews. */
  targetSessions: number;
  /** Target overall score 0-100. */
  targetScore: number;
  createdAt: string;
}

export interface Profile {
  name: string;
  email: string;
  /** 'local' = data stored only in this browser (no cloud account). */
  authMode: 'local';
  createdAt: string;
  targetRole?: string;
}

export interface Preferences {
  soundCues: boolean;
  readQuestionsAloud: boolean;
  speechRate: number;
  speechLang: string;
  /** Consent to send microphone audio to a remote transcription provider. */
  allowRemoteTranscription: boolean;
  autoReadAloud: boolean;
}

export interface AppSettings {
  profile: Profile | null;
  preferences: Preferences;
}

export const DEFAULT_PREFERENCES: Preferences = {
  soundCues: false,
  readQuestionsAloud: false,
  speechRate: 1,
  speechLang: 'en-US',
  allowRemoteTranscription: false,
  autoReadAloud: false,
};

export interface ScoreTrendPoint {
  date: string;
  overall: number;
  label: string;
}
