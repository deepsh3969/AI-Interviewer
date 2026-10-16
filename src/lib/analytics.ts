import type { DimensionId, InterviewSession, ScoreTrendPoint } from './types.js';
import { dimensionLabel, gradeForScore } from './validation.js';
import { activeElapsedMs } from './timer.js';

export interface TrendPoint extends ScoreTrendPoint {
  sessionId: string;
}

export interface SkillBreakdownEntry {
  skill: string;
  attempts: number;
  evaluated: number;
  averageScore: number | null;
  level: 'needs-work' | 'developing' | 'solid' | 'strong' | null;
}

export interface HistorySummary {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  abandonedSessions: number;
  totalPracticeSeconds: number;
  averageScore: number | null;
  averageGrade: string | null;
  trend: TrendPoint[];
  trendAvailable: boolean;
  trendNote: string | null;
  dimensionAverages: { id: DimensionId; label: string; score: number; count: number }[];
  skillBreakdown: SkillBreakdownEntry[];
  frequentMisses: { label: string; count: number; of: number }[];
  recommendedAreas: string[];
  recent: {
    id: string;
    role: string;
    type: string;
    state: string;
    date: string;
    score: number | null;
    questionCount: number;
  }[];
  notes: string[];
}

const MIN_TREND_POINTS = 3;

function sessionScore(session: InterviewSession): number | null {
  const scores = session.questions
    .map((q) => session.answers[q.id]?.evaluation?.overall)
    .filter((s): s is number => typeof s === 'number');
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function summarizeHistory(sessions: InterviewSession[], now = new Date()): HistorySummary {
  const notes: string[] = [];
  const completed = sessions.filter((s) => s.state === 'completed');
  const inProgress = sessions.filter((s) => !['completed', 'abandoned'].includes(s.state));
  const abandoned = sessions.filter((s) => s.state === 'abandoned');

  const totalPracticeSeconds = Math.round(
    sessions.reduce((sum, s) => {
      if (!s.startedAt) return sum;
      const end = s.completedAt ? Date.parse(s.completedAt) : now.getTime();
      return sum + activeElapsedMs(s, end);
    }, 0) / 1000,
  );

  const scored = completed
    .map((s) => ({ s, score: sessionScore(s) }))
    .filter((x): x is { s: InterviewSession; score: number } => x.score !== null)
    .sort((a, b) => Date.parse(a.s.completedAt ?? a.s.createdAt) - Date.parse(b.s.completedAt ?? b.s.createdAt));

  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, x) => sum + x.score, 0) / scored.length)
    : null;

  const trend: TrendPoint[] = scored.map(({ s, score }) => ({
    sessionId: s.id,
    date: (s.completedAt ?? s.createdAt).slice(0, 10),
    overall: score,
    label: `${s.config.role} · ${s.config.type}`,
  }));

  const trendAvailable = trend.length >= MIN_TREND_POINTS;
  const trendNote = trendAvailable
    ? null
    : `Score trends need at least ${MIN_TREND_POINTS} completed interviews with evaluations (you have ${trend.length}).`;

  if (trend.length > 0 && trend.length < MIN_TREND_POINTS) notes.push(trendNote ?? '');
  if (completed.length === 0) notes.push('No completed interviews yet - finish a session to unlock analytics.');
  notes.push('Scores describe practice answers only. They do not measure personality, honesty, speaking confidence or hiring odds.');

  // Dimension averages over all evaluated answers in completed sessions
  const dimBuckets = new Map<DimensionId, number[]>();
  let evaluatedAnswers = 0;
  for (const s of completed) {
    for (const q of s.questions) {
      const ev = s.answers[q.id]?.evaluation;
      if (!ev) continue;
      evaluatedAnswers += 1;
      for (const d of ev.dimensions) {
        const arr = dimBuckets.get(d.id) ?? [];
        arr.push(d.score);
        dimBuckets.set(d.id, arr);
      }
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

  // Frequent misses: dimensions below 60 across evaluated answers
  const frequentMisses: { label: string; count: number; of: number }[] = dimensionAverages
    .map((d) => ({
      label: d.label,
      count: completed.reduce((acc, s) => {
        const hits = s.questions.filter((q) => {
          const dim = s.answers[q.id]?.evaluation?.dimensions.find((x) => x.id === d.id);
          return dim && dim.score < 60;
        }).length;
        return acc + hits;
      }, 0),
      of: evaluatedAnswers,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Skill breakdown
  const skillMap = new Map<string, { scores: number[]; attempts: number }>();
  for (const s of completed) {
    for (const q of s.questions) {
      const entry = skillMap.get(q.skill) ?? { scores: [], attempts: 0 };
      entry.attempts += 1;
      const ev = s.answers[q.id]?.evaluation;
      if (ev) entry.scores.push(ev.overall);
      skillMap.set(q.skill, entry);
    }
  }
  const skillBreakdown: SkillBreakdownEntry[] = [...skillMap.entries()]
    .map(([skill, { scores, attempts }]): SkillBreakdownEntry => {
      const averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      const level: SkillBreakdownEntry['level'] =
        averageScore === null
          ? null
          : averageScore < 40
            ? 'needs-work'
            : averageScore < 60
              ? 'developing'
              : averageScore < 80
                ? 'solid'
                : 'strong';
      return { skill, attempts, evaluated: scores.length, averageScore, level };
    })
    .sort((a, b) => (b.attempts - a.attempts) || (a.skill.localeCompare(b.skill)));

  const recommendedAreas = skillBreakdown
    .filter((s) => s.averageScore !== null && s.averageScore < 65)
    .sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))
    .slice(0, 4)
    .map((s) => s.skill);

  const recent = [...sessions]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      role: s.config.role,
      type: s.config.type,
      state: s.state,
      date: s.updatedAt.slice(0, 10),
      score: sessionScore(s),
      questionCount: s.questions.length,
    }));

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    inProgressSessions: inProgress.length,
    abandonedSessions: abandoned.length,
    totalPracticeSeconds,
    averageScore,
    averageGrade: averageScore === null ? null : gradeForScore(averageScore),
    trend,
    trendAvailable,
    trendNote,
    dimensionAverages,
    skillBreakdown,
    frequentMisses,
    recommendedAreas,
    recent,
    notes: notes.filter(Boolean),
  };
}
