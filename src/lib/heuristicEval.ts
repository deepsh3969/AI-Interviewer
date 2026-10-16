import type { DimensionId, Evaluation, InterviewQuestion } from './types.js';
import { dimensionLabel, toEvaluation } from './validation.js';
import { rubricForQuestion, weightedOverall } from './rubrics.js';

/**
 * Non-AI fallback evaluation.
 *
 * This is a transparent, rule-based heuristic: it counts measurable text
 * signals (length, structure words, question keyword overlap, quantified
 * results, example markers) and maps them to dimension scores with explicit
 * caps. It does NOT understand meaning. It is never described as AI.
 */
export const HEURISTIC_DISCLAIMER =
  'Rule-based practice heuristic (length, structure and keyword signals). It is not AI, it does not understand your answer, and it cannot judge correctness. Treat the score as a rough prompt for improvement only.';

const STOPWORDS = new Set(
  'a an and are as at be but by for from has have how i in is it its me of on or our so the this to was we what when where which who why will with you your about into over after before than then them they'.split(
    ' ',
  ),
);

const FILLERS = [
  'basically',
  'actually',
  'literally',
  'honestly',
  'kind of',
  'sort of',
  'you know',
  'i mean',
  'um',
  'uh',
];

const STRUCTURE_WORDS = [
  'first',
  'second',
  'then',
  'next',
  'finally',
  'after that',
  'because',
  'therefore',
  'so that',
  'as a result',
  'consequently',
  'in addition',
  'however',
  'overall',
];

const EXAMPLE_WORDS = ['for example', 'for instance', 'such as', 'specifically', 'namely', 'to illustrate'];

const STAR_WORDS = {
  situation: ['situation', 'context', 'when', 'at the time', 'we were'],
  task: ['task', 'goal', 'my responsibility', 'needed to', 'had to'],
  action: ['i did', 'i built', 'i led', 'i decided', 'i implemented', 'i proposed', 'i analysed', 'i analyzed', 'we shipped'],
  result: ['result', 'outcome', 'as a result', 'we achieved', 'reduced', 'increased', 'improved', 'delivered', 'grew'],
};

const TRADEOFF_WORDS = [
  'trade-off',
  'tradeoff',
  'assumption',
  'constraint',
  'alternative',
  'compare',
  'complexity',
  'latency',
  'throughput',
  'failure',
  'risk',
  'downside',
  'cons',
];

export interface TextSignals {
  words: number;
  sentences: number;
  paragraphs: number;
  lower: string;
  metricCount: number;
  exampleHits: number;
  structureHits: number;
  fillerHits: number;
  starHits: Record<keyof typeof STAR_WORDS, number>;
  starTotal: number;
  overlap: { matched: number; total: number; ratio: number };
  avgSentenceWords: number;
  longestSentence: number;
  tradeoffHits: number;
}

export function questionTerms(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9%]+/)) {
    if (raw.length < 4 || STOPWORDS.has(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

export function extractSignals(question: InterviewQuestion, answer: string): TextSignals {
  const lower = answer.toLowerCase();
  const words = answer.split(/\s+/).filter(Boolean);
  const sentences = answer.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 2);
  const paragraphs = answer.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
  const sentenceLengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);

  const terms = questionTerms(`${question.text} ${question.skill}`);
  const matched = terms.filter((t) => lower.includes(t)).length;

  const countIn = (list: string[], hay: string) =>
    list.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0);

  const starHits = {
    situation: countIn(STAR_WORDS.situation, lower),
    task: countIn(STAR_WORDS.task, lower),
    action: countIn(STAR_WORDS.action, lower),
    result: countIn(STAR_WORDS.result, lower),
  } as Record<keyof typeof STAR_WORDS, number>;

  return {
    words: words.length,
    sentences: sentences.length,
    paragraphs: Math.max(1, paragraphs.length),
    lower,
    metricCount: (answer.match(/\b\d+(\.\d+)?\s*%|\b\d+\s*(users|customers|hours|days|weeks|ms|seconds|requests|people|times|x)\b/gi) || [])
      .length,
    exampleHits: countIn(EXAMPLE_WORDS, lower),
    structureHits: countIn(STRUCTURE_WORDS, lower),
    fillerHits: FILLERS.reduce((acc, f) => acc + (lower.split(f).length - 1), 0),
    starHits,
    starTotal: Object.values(starHits).reduce((a, b) => a + (b > 0 ? 1 : 0), 0),
    overlap: { matched, total: terms.length, ratio: terms.length === 0 ? 0 : matched / terms.length },
    avgSentenceWords: sentenceLengths.length
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0,
    longestSentence: sentenceLengths.length ? Math.max(...sentenceLengths) : 0,
    tradeoffHits: countIn(TRADEOFF_WORDS, lower),
  };
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

interface DimResult {
  score: number;
  evidence: string;
}

function scoreDimension(id: DimensionId, question: InterviewQuestion, s: TextSignals): DimResult {
  switch (id) {
    case 'relevance': {
      const score = clamp(Math.round(30 + s.overlap.ratio * 85), 0, 90);
      return {
        score,
        evidence: `Keyword overlap with the question: ${s.overlap.matched} of ${s.overlap.total} key terms appear in the answer.`,
      };
    }
    case 'completeness': {
      let score = s.words >= 120 ? 60 : s.words >= 70 ? 50 : s.words >= 40 ? 38 : 22;
      if (s.paragraphs >= 2) score += 8;
      if (s.structureHits >= 3) score += 10;
      if (s.words < 50) score = Math.min(score, 45);
      return { score: clamp(score, 0, 85), evidence: `Answer length is ${s.words} words across ${s.paragraphs} paragraph(s); structure markers found: ${s.structureHits}.` };
    }
    case 'clarity': {
      const avg = s.avgSentenceWords;
      let score = avg >= 8 && avg <= 26 ? 80 : avg > 34 ? 55 : avg >= 6 ? 65 : 50;
      score -= Math.min(25, s.fillerHits * 5);
      if (s.longestSentence > 45) score -= 8;
      return { score: clamp(score, 0, 88), evidence: `Average sentence length is ${avg.toFixed(1)} words; filler phrases found: ${s.fillerHits}.` };
    }
    case 'structure': {
      const behavioral = ['behavioral', 'project', 'situational'].includes(question.category);
      let score = 25 + Math.min(35, s.structureHits * 9);
      if (behavioral) score += s.starTotal * 9;
      if (s.paragraphs >= 2) score += 6;
      if (s.words < 40) score = Math.min(score, 45);
      return { score: clamp(score, 0, 86), evidence: behavioral ? `Structural cues present in ${s.starTotal} of 4 categories (situation, task, action, result); sequencing words: ${s.structureHits}.` : `Sequencing and connective words found: ${s.structureHits}; paragraphs: ${s.paragraphs}.` };
    }
    case 'specificity': {
      let score = 25 + s.metricCount * 14;
      if (s.metricCount === 0) score = Math.min(score, 50);
      if (s.exampleHits > 0) score += 8;
      return { score: clamp(score, 0, 85), evidence: `Quantified results or metrics found: ${s.metricCount}; example phrases: ${s.exampleHits}.` };
    }
    case 'technical': {
      const terms = questionTerms(`${question.skill} ${question.text}`);
      const matchedTech = terms.filter((t) => s.lower.includes(t)).length;
      let score = 30 + Math.round((terms.length ? matchedTech / terms.length : 0) * 45);
      if (s.tradeoffHits > 0) score += 12;
      if (s.words < 40) score = Math.min(score, 45);
      return { score: clamp(score, 0, 82), evidence: `Domain terms from the question used in the answer: ${matchedTech}/${terms.length}; trade-off or assumption words: ${s.tradeoffHits}.` };
    }
    case 'evidence': {
      let score = 22 + s.exampleHits * 12 + s.metricCount * 10;
      if (s.exampleHits === 0 && s.metricCount === 0) score = Math.min(score, 45);
      return { score: clamp(score, 0, 84), evidence: `Example phrases: ${s.exampleHits}; quantified results: ${s.metricCount}.` };
    }
    case 'communication': {
      let score = s.words >= 80 ? 70 : s.words >= 45 ? 55 : 35;
      if (s.fillerHits > 3) score -= 10;
      if (s.avgSentenceWords > 30) score -= 8;
      if (s.words > 900) score -= 10;
      return { score: clamp(score, 0, 86), evidence: `Answer is ${s.words} words with ${s.sentences} sentences; filler phrases: ${s.fillerHits}.` };
    }
    default:
      return { score: 40, evidence: 'No measurable signal for this dimension.' };
  }
}

function weaknessFor(id: DimensionId, s: TextSignals): string | null {
  switch (id) {
    case 'specificity':
      return s.metricCount === 0 ? 'No quantified results, metrics or concrete numbers were mentioned.' : null;
    case 'evidence':
      return s.exampleHits === 0 ? 'No example phrases ("for example", "such as") ground the claims in a real case.' : null;
    case 'structure':
      return s.structureHits < 2 && s.starTotal < 2 ? 'The answer lacks a visible structure: few sequencing or cause-effect cues.' : null;
    case 'completeness':
      return s.words < 60 ? 'The answer is very short and likely leaves out context, action and result.' : null;
    case 'relevance':
      return s.overlap.ratio < 0.35 ? 'Several key terms from the question are never addressed in the answer.' : null;
    case 'clarity':
      return s.avgSentenceWords > 32 ? 'Long sentences make the answer hard to follow; break them into shorter ones.' : null;
    case 'communication':
      return s.fillerHits > 3 ? 'Several filler phrases reduce precision in the delivery.' : null;
    case 'technical':
      return s.tradeoffHits === 0 ? 'No trade-offs, assumptions or constraints are discussed.' : null;
    default:
      return null;
  }
}

function strengthFor(id: DimensionId, s: TextSignals): string | null {
  if (id === 'specificity' && s.metricCount >= 2) return 'Uses quantified results, which makes claims checkable.';
  if (id === 'structure' && s.starTotal >= 3) return 'Covers situation, task, action and result - a strong behavioral shape.';
  if (id === 'evidence' && s.exampleHits >= 1) return 'Grounds the answer with a concrete example.';
  if (id === 'relevance' && s.overlap.ratio >= 0.6) return 'Stays closely on topic, addressing most key terms from the question.';
  if (id === 'clarity' && s.avgSentenceWords >= 8 && s.avgSentenceWords <= 26) return 'Sentences are a readable length and easy to follow.';
  if (id === 'completeness' && s.words >= 140) return 'Provides enough detail to cover context, action and outcome.';
  if (id === 'technical' && s.tradeoffHits >= 2) return 'Discusses trade-offs or constraints instead of only the happy path.';
  return null;
}

export function heuristicEvaluate(question: InterviewQuestion, answer: string, now = new Date()): Evaluation {
  const s = extractSignals(question, answer);
  const rubric = rubricForQuestion(question);
  const dimensions = rubric.map((d) => ({ id: d.id, ...scoreDimension(d.id, question, s) }));
  const rawOverall = weightedOverall(
    question.category,
    dimensions.map((d) => ({ id: d.id, score: d.score })),
  );
  // Heuristic scores are deliberately capped: simple rules never award an "excellent" result.
  const overall = Math.min(rawOverall, 78);

  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const strengths = dimensions
    .map((d) => strengthFor(d.id, s))
    .filter((x): x is string => Boolean(x))
    .slice(0, 4);
  const weaknesses = sorted
    .map((d) => weaknessFor(d.id, s))
    .filter((x): x is string => Boolean(x))
    .slice(0, 4);

  const missing: string[] = [];
  if (s.metricCount === 0) missing.push('Quantified impact (a number, percentage or time saved).');
  if (['behavioral', 'project'].includes(question.category) && s.starTotal < 3)
    missing.push('A complete situation-task-action-result arc.');
  if (s.exampleHits === 0 && ['behavioral', 'project', 'role-specific'].includes(question.category))
    missing.push('A concrete example from your own experience.');
  if (s.words < 50) missing.push('Enough detail to show your reasoning.');
  if (s.overlap.ratio < 0.35) missing.push('Direct engagement with the terms used in the question.');

  const suggestions: string[] = [];
  if (s.words < 90) suggestions.push('Aim for 90-200 words so you can include context, action and result.');
  if (s.metricCount === 0) suggestions.push('Add one measurable outcome ("reduced build time by 30%").');
  if (s.structureHits < 2) suggestions.push('Signpost your answer with sequencing words (first, then, as a result).');
  if (s.fillerHits > 2) suggestions.push('Replace filler phrases with short pauses instead.');
  if (question.category === 'technical' && s.tradeoffHits === 0)
    suggestions.push('Name one trade-off or assumption to show depth.');
  if (suggestions.length === 0) suggestions.push('Rehearse once more out loud and cut any sentence that does not add information.');

  const outline = question.answerStructure.length
    ? question.answerStructure
    : ['Context', 'Your actions', 'Result', 'What you learned'];

  return toEvaluation(
    {
      overall,
      dimensions: dimensions.map((d) => ({ id: d.id, score: d.score, evidence: d.evidence })),
      strengths: strengths.length ? strengths : ['Answer addressed the question directly.'],
      weaknesses: weaknesses.length ? weaknesses : ['No single glaring issue detected by the rule set - practise refining detail.'],
      missing,
      suggestions,
      modelAnswerOutline: outline,
    },
    question.id,
    'heuristic',
    HEURISTIC_DISCLAIMER,
    now,
  );
}

export function dimensionName(id: DimensionId): string {
  return dimensionLabel(id);
}
