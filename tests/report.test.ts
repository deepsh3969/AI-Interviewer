import { describe, expect, it } from 'vitest';
import { buildReport } from '../src/lib/report';
import { makeEvaluation, makeSession, runToCompletion, LONG_ANSWER } from './helpers';

function sessionWithEvaluations(): ReturnType<typeof makeSession> {
  let session = runToCompletion(makeSession({}, { questionCount: 4 }));
  const answers = { ...session.answers };
  session.questions.forEach((q, i) => {
    const prev = answers[q.id];
    answers[q.id] = {
      ...prev,
      text: prev?.skipped ? '' : LONG_ANSWER,
      submittedAt: prev?.submittedAt ?? new Date().toISOString(),
      durationSeconds: 90,
      evaluation: makeEvaluation({
        questionId: q.id,
        overall: [82, 45, 67, 52][i] ?? 60,
        grade: 'solid',
        dimensions: [
          { id: 'relevance', label: 'Relevance', score: [80, 40, 70, 50][i] ?? 60, evidence: 'Relevance evidence for the answer.' },
          { id: 'clarity', label: 'Clarity', score: [85, 55, 75, 58][i] ?? 60, evidence: 'Clarity evidence for the answer.' },
          { id: 'structure', label: 'Logical structure', score: [78, 42, 60, 48][i] ?? 60, evidence: 'Structure evidence for the answer.' },
        ],
        engine: i === 3 ? 'heuristic' : 'ai',
      }),
    };
  });
  session = { ...session, answers };
  return session;
}

describe('performance report', () => {
  it('computes overall, dimensions and per-question results from real evaluations', () => {
    const report = buildReport(sessionWithEvaluations());
    expect(report.overall).toBe(Math.round((82 + 45 + 67 + 52) / 4));
    expect(report.evaluatedCount).toBe(4);
    expect(report.questionResults).toHaveLength(4);
    expect(report.dimensionAverages.find((d) => d.id === 'relevance')?.score).toBe(Math.round((80 + 40 + 70 + 50) / 4));
    expect(report.insightsAvailable).toBe(true);
    expect(report.strongest[0].score).toBe(82);
    expect(report.needsWork[0].score).toBe(45);
    expect(report.enginesUsed).toContain('ai');
    expect(report.enginesUsed).toContain('heuristic');
    expect(report.notes.join(' ')).toMatch(/heuristic/i);
  });

  it('marks weak skills as revision topics and strong ones as demonstrated', () => {
    const report = buildReport(sessionWithEvaluations());
    expect(report.revisionTopics.length).toBeGreaterThan(0);
    expect(report.nextPractice.length).toBeGreaterThan(20);
    expect(report.recurringWeaknesses.length).toBeGreaterThan(0);
  });

  it('does not claim insights when too few answers were evaluated', () => {
    let session = runToCompletion(makeSession({}, { questionCount: 3 }));
    const answers = { ...session.answers };
    const first = session.questions[0];
    answers[first.id] = {
      ...answers[first.id],
      submittedAt: answers[first.id]?.submittedAt ?? new Date().toISOString(),
      evaluation: makeEvaluation({ questionId: first.id, overall: 70 }),
    };
    session = { ...session, answers };
    const report = buildReport(session);
    expect(report.evaluatedCount).toBe(1);
    expect(report.insightsAvailable).toBe(false);
    expect(report.notes.join(' ')).toMatch(/limited/i);
    expect(report.overall).toBe(70);
  });

  it('returns a null overall with no evaluations', () => {
    const report = buildReport(runToCompletion(makeSession({}, { questionCount: 3 })));
    expect(report.overall).toBeNull();
    expect(report.grade).toBeNull();
    expect(report.insightsAvailable).toBe(false);
    expect(report.notes.join(' ')).toMatch(/No evaluated answers/);
  });

  it('counts skipped questions and excludes them', () => {
    const base = makeSession({}, { questionCount: 3 });
    let session = runToCompletion(base);
    const answers = { ...session.answers };
    const second = session.questions[1];
    answers[second.id] = { ...answers[second.id], skipped: true, text: '', evaluation: undefined };
    session = { ...session, answers };
    const report = buildReport(session);
    expect(report.skippedCount).toBeGreaterThanOrEqual(1);
    expect(report.notes.join(' ')).toMatch(/skipped/i);
  });

  it('always states the practice-only disclaimer', () => {
    const report = buildReport(sessionWithEvaluations());
    expect(report.notes.join(' ')).toMatch(/practice feedback/i);
  });
});
