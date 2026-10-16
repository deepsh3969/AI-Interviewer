import type { DimensionId, EvaluationCriterion, InterviewQuestion, QuestionCategory } from './types.js';
import { dimensionLabel } from './validation.js';

interface DimSpec {
  id: DimensionId;
  weight: number;
}

/**
 * Question-specific rubrics. Different categories are judged on different
 * dimensions so a technical answer is not scored with the same lens as a
 * behavioral STAR answer.
 */
const RUBRIC_BY_CATEGORY: Record<QuestionCategory, DimSpec[]> = {
  behavioral: [
    { id: 'relevance', weight: 2 },
    { id: 'completeness', weight: 2 },
    { id: 'structure', weight: 3 },
    { id: 'evidence', weight: 3 },
    { id: 'specificity', weight: 2 },
    { id: 'communication', weight: 2 },
  ],
  technical: [
    { id: 'technical', weight: 3 },
    { id: 'relevance', weight: 2 },
    { id: 'clarity', weight: 2 },
    { id: 'structure', weight: 2 },
    { id: 'completeness', weight: 2 },
    { id: 'specificity', weight: 2 },
  ],
  'system-design': [
    { id: 'technical', weight: 3 },
    { id: 'structure', weight: 3 },
    { id: 'completeness', weight: 2 },
    { id: 'specificity', weight: 2 },
    { id: 'relevance', weight: 2 },
    { id: 'communication', weight: 1 },
  ],
  project: [
    { id: 'structure', weight: 3 },
    { id: 'evidence', weight: 3 },
    { id: 'specificity', weight: 2 },
    { id: 'relevance', weight: 2 },
    { id: 'technical', weight: 1 },
    { id: 'communication', weight: 2 },
  ],
  situational: [
    { id: 'relevance', weight: 2 },
    { id: 'structure', weight: 3 },
    { id: 'completeness', weight: 2 },
    { id: 'specificity', weight: 2 },
    { id: 'communication', weight: 2 },
  ],
  introduction: [
    { id: 'relevance', weight: 3 },
    { id: 'structure', weight: 2 },
    { id: 'completeness', weight: 2 },
    { id: 'communication', weight: 3 },
    { id: 'clarity', weight: 2 },
  ],
  hr: [
    { id: 'relevance', weight: 3 },
    { id: 'structure', weight: 2 },
    { id: 'completeness', weight: 2 },
    { id: 'communication', weight: 2 },
  ],
  'role-specific': [
    { id: 'relevance', weight: 3 },
    { id: 'specificity', weight: 2 },
    { id: 'completeness', weight: 2 },
    { id: 'technical', weight: 2 },
    { id: 'communication', weight: 2 },
  ],
  'problem-solving': [
    { id: 'structure', weight: 3 },
    { id: 'technical', weight: 2 },
    { id: 'relevance', weight: 2 },
    { id: 'specificity', weight: 2 },
    { id: 'clarity', weight: 2 },
  ],
  communication: [
    { id: 'communication', weight: 3 },
    { id: 'clarity', weight: 3 },
    { id: 'structure', weight: 2 },
    { id: 'relevance', weight: 2 },
  ],
};

export function rubricForCategory(category: QuestionCategory): DimSpec[] {
  return RUBRIC_BY_CATEGORY[category] ?? RUBRIC_BY_CATEGORY.hr;
}

export function rubricForQuestion(question: Pick<InterviewQuestion, 'category'>): DimSpec[] {
  return rubricForCategory(question.category);
}

/** Question-specific evaluation criteria (distinct from scoring dimensions). */
export function buildCriteria(labels: string[]): EvaluationCriterion[] {
  const unique = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
  return unique.slice(0, 5).map((label, i) => ({
    id: `crit_${i + 1}`,
    label,
    weight: i === 0 ? 3 : 2,
  }));
}

export function dimensionWeight(category: QuestionCategory, id: DimensionId): number {
  return rubricForCategory(category).find((d) => d.id === id)?.weight ?? 1;
}

/** Weighted overall score from dimension scores, rounded. */
export function weightedOverall(
  category: QuestionCategory,
  scores: { id: DimensionId; score: number }[],
): number {
  const rubric = rubricForCategory(category);
  const ids = new Set(rubric.map((r) => r.id));
  const applicable = scores.filter((s) => ids.has(s.id));
  const list = applicable.length > 0 ? applicable : scores;
  if (list.length === 0) return 0;
  let totalWeight = 0;
  let sum = 0;
  for (const s of list) {
    const w = dimensionWeight(category, s.id);
    sum += s.score * w;
    totalWeight += w;
  }
  return totalWeight === 0 ? 0 : Math.round(sum / totalWeight);
}

export function rubricLabels(category: QuestionCategory): string[] {
  return rubricForCategory(category).map((d) => dimensionLabel(d.id));
}
