import type { DimensionId, Evaluation, InterviewSession, QuestionCategory } from './types';
import { dimensionLabel, gradeForScore } from './validation';
import { activeElapsedMs } from './timer';

export interface QuestionResult {
  index: number;
  questionId: string;
  text: string;
  category: QuestionCategory;
  skill: string;
  answerText: string;
  skipped: boolean;
  durationSeconds: number;
  score: number | null;
  grade: string | null;
  evaluation: Evaluation | null;
}

export interface RecurringWeakness {
  label: string;
  count: number;
  detail: string;
}

export interface InterviewReport {
  sessionId: string;
  role: string;
  interviewType: string;
  createdAt: string;
  completedAt: string | null;
  totalQuestions: number;
  answeredCount: number;
  skippedCount: number;
  evaluatedCount: number;
  practiceSeconds: number;
  overall: number | null;
  grade: string | null;
  questionResults: QuestionResult[];
  dimensionAverages: { id: DimensionId; label: string; score: number; count: number }[];
  strongest: QuestionResult[];
  needsWork: QuestionResult[];
  recurringWeaknesses: RecurringWeakness[];
  skillsDemonstrated: string[];
  revisionTopics: string[];
  nextPractice: string;
  /** False when too few answers were evaluated to draw reliable conclusions. */
  insightsAvailable: boolean;
  notes: string[];
  enginesUsed: string[];
}

const evaluationOf = (session: InterviewSession, questionId: string): Evaluation | undefined =>
  session.answers[questionId]?.evaluation;

export function buildReport(session: InterviewSession): InterviewReport {
  const notes: string[] = [];
  const questionResults: QuestionResult[] = session.questions.map((question, index) => {
    const answer = session.answers[question.id];
    const evaluation = evaluationOf(session, question.id) ?? null;
    return {
      index,
      questionId: question.id,
      text: question.text,
      category: question.category,
      skill: question.skill,
      answerText: answer?.text ?? '',
      skipped: answer?.skipped ?? !answer?.submittedAt,
      durationSeconds: answer?.durationSeconds ?? 0,
      score: evaluation ? evaluation.overall : null,
      grade: evaluation ? evaluation.grade : null,
      evaluation,
    };
  });

  const evaluated = questionResults.filter((r) => r.evaluation !== null);
  const answered = questionResults.filter((r) => !r.skipped && r.answerText.trim().length > 0);
  const skipped = questionResults.filter((r) => r.skipped);
  const enginesUsed = [...new Set(evaluated.map((r) => r.evaluation!.engine))];

  const overall = evaluated.length
    ? Math.round(evaluated.reduce((sum, r) => sum + (r.score ?? 0), 0) / evaluated.length)
    : null;

  // Dimension averages
  const dimBuckets = new Map<DimensionId, number[]>();
  for (const r of evaluated) {
    for (const d of r.evaluation!.dimensions) {
      const arr = dimBuckets.get(d.id) ?? [];
      arr.push(d.score);
      dimBuckets.set(d.id, arr);
    }
  }
  const dimensionAverages = [...dimBuckets.entries()]
    .map(([id, scores]) => ({
      id,
      label: dimensionLabel(id),
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => a.score - b.score);

  const byScore = [...evaluated].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const strongest = byScore.filter((r) => (r.score ?? 0) >= 60).slice(0, 3);
  const needsWork = [...byScore].reverse().filter((r) => (r.score ?? 0) < 60).slice(0, 3);

  // Recurring weaknesses: dimensions that scored below 60 in multiple answers.
  const recurringWeaknesses: RecurringWeakness[] = [];
  for (const r of evaluated) {
    for (const d of r.evaluation!.dimensions) {
      if (d.score >= 60) continue;
      const existing = recurringWeaknesses.find((w) => w.label === dimensionLabel(d.id));
      if (existing) existing.count += 1;
      else
        recurringWeaknesses.push({
          label: dimensionLabel(d.id),
          count: 1,
          detail: d.evidence,
        });
    }
  }
  recurringWeaknesses.sort((a, b) => b.count - a.count);

  const skillsDemonstrated = [
    ...new Set(evaluated.filter((r) => (r.score ?? 0) >= 60).map((r) => r.skill)),
  ];
  const weakSkills = evaluated.filter((r) => (r.score ?? 0) < 60).map((r) => r.skill);
  const revisionTopics = [...new Set(weakSkills)].slice(0, 6);

  const weakestDim = dimensionAverages[0];
  const nextPractice = overall === null
    ? 'Complete a short typed session first so a baseline can be established.'
    : weakestDim && weakestDim.score < 70
      ? `Run a focused ${session.config.type} session for ${session.config.role} targeting ${weakestDim.label.toLowerCase()} - keep answers to 90-150 words with one concrete example.`
      : `You are consistent on ${session.config.type} questions. Raise the difficulty and try a mixed interview for ${session.config.role}.`;

  const insightsAvailable = evaluated.length >= 3;
  if (!insightsAvailable) {
    notes.push(
      `Only ${evaluated.length} answer${evaluated.length === 1 ? '' : 's'} evaluated - insights are limited. Complete at least 3 evaluated answers for reliable patterns.`,
    );
  }
  if (skipped.length > 0) notes.push(`${skipped.length} question(s) were skipped and are excluded from scoring.`);
  if (enginesUsed.includes('heuristic')) {
    notes.push('Some answers were scored with the rule-based fallback heuristic, not AI. Those scores are rough signals only.');
  }
  if (overall === null) notes.push('No evaluated answers, so no overall score is shown.');
  notes.push('This is practice feedback, not a hiring assessment. It may contain errors.');

  return {
    sessionId: session.id,
    role: session.config.role,
    interviewType: session.config.type,
    createdAt: session.createdAt,
    completedAt: session.completedAt ?? null,
    totalQuestions: session.questions.length,
    answeredCount: answered.length,
    skippedCount: skipped.length,
    evaluatedCount: evaluated.length,
    practiceSeconds: Math.round(activeElapsedMs(session, session.completedAt ? Date.parse(session.completedAt) : Date.now()) / 1000),
    overall,
    grade: overall === null ? null : gradeForScore(overall),
    questionResults,
    dimensionAverages,
    strongest,
    needsWork,
    recurringWeaknesses: recurringWeaknesses.filter((w) => w.count >= 1).slice(0, 6),
    skillsDemonstrated,
    revisionTopics,
    nextPractice,
    insightsAvailable,
    notes,
    enginesUsed,
  };
}
