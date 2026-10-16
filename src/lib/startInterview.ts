import type { InterviewConfig } from './types.js';
import { validateConfig } from './validation.js';
import { generateQuestionSet } from './apiClient.js';
import { createSession } from './session.js';
import { upsertSession } from './storage.js';

export interface StartInterviewResult {
  ok: boolean;
  sessionId?: string;
  issues?: string[];
  source?: 'ai' | 'fallback';
  model?: string | null;
  note?: string;
  count?: number;
  error?: string;
}

/**
 * Shared entry point for starting a real interview session:
 * validate config -> generate questions (AI or labelled fallback) -> persist -> return id.
 * Used by the interview setup page and the dashboard quick-start panel.
 */
export async function startInterview(config: InterviewConfig): Promise<StartInterviewResult> {
  const validation = validateConfig(config);
  if (!validation.ok) return { ok: false, issues: validation.issues };

  const result = await generateQuestionSet(validation.value);
  const session = createSession(validation.value, result.questions, result.source === 'ai');
  const save = upsertSession(session);
  if (!save.ok) return { ok: false, error: save.error };

  return {
    ok: true,
    sessionId: session.id,
    source: result.source,
    model: result.model,
    note: result.note,
    count: result.questions.length,
  };
}
