import type { Evaluation, InterviewConfig, InterviewQuestion, InterviewSession } from '../src/lib/types';
import { buildFallbackQuestions } from '../src/lib/questionBank';
import { advance, createSession, transition } from '../src/lib/session';

export function makeConfig(overrides: Partial<InterviewConfig> = {}): InterviewConfig {
  return {
    role: 'Software Engineer',
    experience: 'mid',
    industry: 'Fintech',
    type: 'mixed',
    difficulty: 'medium',
    questionCount: 4,
    durationMinutes: 30,
    mode: 'typed',
    jobDescription: '',
    resumeText: '',
    followUps: true,
    ...overrides,
  };
}

export function makeQuestions(count = 4, overrides: Partial<InterviewConfig> = {}): InterviewQuestion[] {
  return buildFallbackQuestions(makeConfig({ questionCount: count, ...overrides }));
}

export function makeSession(
  overrides: Partial<InterviewSession> = {},
  configOverrides: Partial<InterviewConfig> = {},
): InterviewSession {
  const config = makeConfig(configOverrides);
  const session = createSession(config, makeQuestions(config.questionCount, configOverrides), false);
  return { ...session, ...overrides };
}

export const LONG_ANSWER = [
  'In my previous role our deployment pipeline took about 45 minutes, which blocked the team from shipping more than once a day.',
  'My task was to reduce that without changing the test suite. I profiled each stage, found that dependency installation ran twice,',
  'and I introduced a shared cache plus parallelised the unit and integration jobs. As a result deployments dropped to 12 minutes,',
  'the team shipped roughly four times a day, and rollbacks became routine instead of exceptional. I documented the trade-off:',
  'the cache adds invalidation complexity, so we key it by lockfile hash and fall back to a cold build when it misses.',
].join(' ');

export function makeEvaluation(overrides: Partial<Evaluation> = {}): Evaluation {
  return {
    questionId: 'q1',
    overall: 72,
    grade: 'solid',
    dimensions: [
      { id: 'relevance', label: 'Relevance', score: 80, evidence: 'Addresses the question directly.' },
      { id: 'structure', label: 'Logical structure', score: 65, evidence: 'Some sequencing present.' },
      { id: 'completeness', label: 'Completeness', score: 70, evidence: 'Covers most of the answer structure.' },
    ],
    strengths: ['Clear opening'],
    weaknesses: ['Could add metrics'],
    missing: ['A measurable result'],
    suggestions: ['Add one number'],
    modelAnswerOutline: ['Context', 'Action', 'Result'],
    engine: 'heuristic',
    disclaimer: 'Rule-based practice heuristic.',
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Run a session forward to completion (answers every question). */
export function runToCompletion(session: InterviewSession, answer = LONG_ANSWER): InterviewSession {
  let current = session;
  for (let guard = 0; guard < 200; guard += 1) {
    if (current.state === 'completed' || current.state === 'abandoned') return current;
    if (current.state === 'feedback') {
      current = transition(current, { type: 'NEXT_QUESTION' }).session;
      continue;
    }
    if (current.state === 'next-question') {
      const advanced = advance(current);
      if (!advanced.ok) throw new Error(advanced.error);
      current = advanced.session;
      continue;
    }
    const target = current.state === 'ready' ? 'started' : 'feedback';
    const next = advanceTo(current, target, answer);
    current = next;
  }
  throw new Error('session did not complete');
}

export { LONG_ANSWER as DEFAULT_ANSWER };
export function advanceTo(session: InterviewSession, targetState: InterviewSession['state'], answer = LONG_ANSWER): InterviewSession {
  let current = session;
  const setState = (event: Parameters<typeof transition>[1]) => {
    const out = transition(current, event);
    if (!out.ok) throw new Error(`transition ${event.type} failed: ${out.error}`);
    current = out.session;
  };

  if (current.state === 'ready') setState({ type: 'START' });
  while (current.state !== targetState) {
    switch (current.state) {
      case 'started':
        setState({ type: 'SHOW_QUESTION' });
        break;
      case 'question':
        if (targetState === 'question') return current;
        setState({ type: 'BEGIN_ANSWER' });
        break;
      case 'answering':
        if (targetState === 'answering') return current;
        setState({ type: 'SUBMIT', text: answer });
        break;
      case 'submitted':
        if (targetState === 'submitted') return current;
        setState({ type: 'SHOW_FEEDBACK' });
        break;
      case 'feedback':
        if (targetState === 'feedback') return current;
        setState({ type: 'NEXT_QUESTION' });
        break;
      case 'next-question':
        setState({ type: 'SHOW_QUESTION' });
        break;
      default:
        throw new Error(`cannot reach ${targetState} from ${current.state}`);
    }
  }
  return current;
}
