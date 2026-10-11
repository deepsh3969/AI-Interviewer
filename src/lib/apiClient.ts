import { z } from 'zod';
import type { Evaluation, InterviewConfig, InterviewQuestion } from './types';
import {
  evaluationObjectSchema,
  interviewQuestionSchema,
  questionSetResponseSchema,
  validateConfig,
} from './validation';
import { buildFallbackQuestions } from './questionBank';
import { heuristicEvaluate } from './heuristicEval';

export type ApiErrorCode =
  | 'network'
  | 'timeout'
  | 'invalid_request'
  | 'ai_not_configured'
  | 'speech_not_configured'
  | 'rate_limited'
  | 'upstream_error'
  | 'upstream_timeout'
  | 'server_error'
  | 'unsupported';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(message: string, code: ApiErrorCode, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT = 25_000;

async function request<T>(
  path: string,
  body: unknown,
  schema: { parse: (v: unknown) => T },
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    if (!res.ok) {
      const err = (payload as { error?: { code?: string; message?: string } } | null)?.error;
      const code = (err?.code as ApiErrorCode) ?? 'server_error';
      throw new ApiError(err?.message ?? `Request failed with status ${res.status}.`, code, res.status);
    }
    return schema.parse(payload);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('The request timed out.', 'timeout', 0);
    }
    throw new ApiError('Could not reach the server. Check your connection.', 'network', 0);
  } finally {
    clearTimeout(timer);
  }
}

export interface ApiStatus {
  aiConfigured: boolean;
  model: string | null;
  speechConfigured: boolean;
  version: string;
}

export async function fetchStatus(): Promise<ApiStatus | null> {
  try {
    const res = await fetch('/api/status', { method: 'GET' });
    if (!res.ok) return null;
    return (await res.json()) as ApiStatus;
  } catch {
    return null;
  }
}

export interface QuestionGenResult {
  questions: InterviewQuestion[];
  source: 'ai' | 'fallback';
  model: string | null;
  note: string;
}

function humanFailure(code: ApiErrorCode): string {
  switch (code) {
    case 'ai_not_configured':
      return 'No AI provider is configured on this deployment - using the built-in fallback question bank.';
    case 'rate_limited':
      return 'The AI provider is rate limited right now - using the built-in fallback question bank.';
    case 'timeout':
    case 'upstream_timeout':
      return 'The AI provider timed out - using the built-in fallback question bank.';
    case 'network':
      return 'The question service is unreachable - using the built-in fallback question bank.';
    default:
      return 'The AI question service failed - using the built-in fallback question bank.';
  }
}

/** Generate the interview plan, falling back to the deterministic bank when AI is unavailable. */
export async function generateQuestionSet(config: InterviewConfig): Promise<QuestionGenResult> {
  const validation = validateConfig(config);
  if (!validation.ok) {
    throw new ApiError(validation.issues.join(' '), 'invalid_request', 400);
  }
  try {
    const data = await request(
      '/api/questions',
      { config: validation.value },
      questionSetResponseSchema,
      45_000,
    );
    return {
      questions: data.questions.map((q) => interviewQuestionSchema.parse(q)),
      source: data.source,
      model: data.model,
      note: data.note ?? '',
    };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'invalid_request') throw err;
    const code = err instanceof ApiError ? err.code : 'server_error';
    return {
      questions: buildFallbackQuestions(validation.value),
      source: 'fallback',
      model: null,
      note: humanFailure(code),
    };
  }
}

export interface EvaluationInput {
  question: InterviewQuestion;
  answer: string;
  config: Pick<InterviewConfig, 'role' | 'experience' | 'industry'>;
  includeFollowUp: boolean;
}

export interface EvaluationResult {
  evaluation: Evaluation;
  source: 'ai' | 'heuristic';
  model: string | null;
  followUp: string | null;
  followUpSource: 'ai' | 'heuristic' | null;
  note: string;
}

const evaluateResponseSchema = evaluationObjectSchema.extend({
  followUp: z.string().nullable().optional(),
  followUpSource: z.enum(['ai', 'heuristic']).nullable().optional(),
  model: z.string().nullable().optional(),
});

const RESPONSE_NOTE: Record<string, string> = {
  ai_not_configured: 'No AI provider is configured - scored with the rule-based fallback heuristic.',
  network: 'The evaluation service is unreachable - scored with the rule-based fallback heuristic.',
  timeout: 'The AI evaluation timed out - scored with the rule-based fallback heuristic.',
  upstream_timeout: 'The AI provider timed out - scored with the rule-based fallback heuristic.',
  rate_limited: 'The AI provider is rate limited - scored with the rule-based fallback heuristic.',
};

/** Deterministic non-AI follow-up probes derived from what the answer lacks. */
export function heuristicFollowUp(question: InterviewQuestion, answer: string): string | null {
  const lower = answer.toLowerCase();
  const words = answer.split(/\s+/).filter(Boolean).length;
  if (words < 12) return null;
  const hasMetric = /\d/.test(answer);
  if (!hasMetric) {
    return 'You described the work without numbers. What measurable result did it produce, and how did you verify it?';
  }
  if (question.category === 'behavioral' && !/(result|outcome|learned|achieved|reduced|increased|delivered)/i.test(lower)) {
    return 'Your story focuses on the actions. How did it end, and what did you personally learn from it?';
  }
  if (question.category === 'technical' && !/(trade-?off|assumption|constraint|because)/i.test(lower)) {
    return 'What assumption in your answer would you test first, and what trade-off did you accept?';
  }
  if (words < 60) {
    return 'That was a short answer. Can you add the specific context and one concrete example?';
  }
  return 'You mentioned a decision there - what alternative did you reject, and why?';
}

/** Evaluate an answer with AI when available, otherwise with the labelled rule-based heuristic. */
export async function evaluateAnswer(input: EvaluationInput): Promise<EvaluationResult> {
  const { question, answer, config, includeFollowUp } = input;
  try {
    const data = await request(
      '/api/evaluate',
      {
        question: {
          id: question.id,
          text: question.text,
          category: question.category,
          difficulty: question.difficulty,
          skill: question.skill,
          criteria: question.criteria,
          answerStructure: question.answerStructure,
        },
        answer,
        config,
        includeFollowUp,
      },
      evaluateResponseSchema,
      45_000,
    );
    const evaluation: Evaluation = {
      questionId: question.id,
      overall: Math.round(data.overall),
      grade: gradeFromScore(data.overall),
      dimensions: data.dimensions.map((d) => ({ ...d, score: Math.round(d.score), label: dimLabel(d.id) })),
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      missing: data.missing,
      suggestions: data.suggestions,
      modelAnswerOutline: data.modelAnswerOutline,
      engine: 'ai',
      disclaimer:
        'AI-generated practice feedback. It may contain errors and is not equivalent to a professional hiring assessment.',
      evaluatedAt: new Date().toISOString(),
    };
    return {
      evaluation,
      source: 'ai',
      model: data.model ?? null,
      followUp: data.followUp ?? null,
      followUpSource: data.followUpSource ?? (data.followUp ? 'ai' : null),
      note: '',
    };
  } catch (err) {
    const code = err instanceof ApiError ? err.code : 'server_error';
    if (err instanceof ApiError && err.code === 'invalid_request') throw err;
    const evaluation = heuristicEvaluate(question, answer);
    const followUp = includeFollowUp ? heuristicFollowUp(question, answer) : null;
    return {
      evaluation,
      source: 'heuristic',
      model: null,
      followUp,
      followUpSource: followUp ? 'heuristic' : null,
      note: RESPONSE_NOTE[code] ?? 'The evaluation service failed - scored with the rule-based fallback heuristic.',
    };
  }
}

function gradeFromScore(score: number): 'needs-work' | 'developing' | 'solid' | 'strong' {
  if (score < 40) return 'needs-work';
  if (score < 60) return 'developing';
  if (score < 80) return 'solid';
  return 'strong';
}

function dimLabel(id: string): string {
  const map: Record<string, string> = {
    relevance: 'Relevance',
    completeness: 'Completeness',
    clarity: 'Clarity',
    structure: 'Logical structure',
    specificity: 'Specificity',
    technical: 'Technical correctness',
    evidence: 'Evidence & examples',
    communication: 'Communication effectiveness',
  };
  return map[id] ?? id;
}

export interface TranscribeResult {
  text: string;
  provider: string;
}

/** Optional remote transcription (only when a provider is configured server-side). */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  language: string,
): Promise<TranscribeResult> {
  const schema = z.object({
    text: z.string(),
    provider: z.string(),
  });
  return request('/api/transcribe', { audio: audioBase64, mimeType, language }, schema, 60_000);
}
