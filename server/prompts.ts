import { z } from 'zod';
import type { InterviewConfig, InterviewQuestion, DimensionId } from '../src/lib/types';
import { rubricForQuestion } from '../src/lib/rubrics';

export const QUESTION_CATEGORIES = [
  'introduction',
  'behavioral',
  'technical',
  'system-design',
  'project',
  'situational',
  'role-specific',
  'hr',
  'problem-solving',
  'communication',
] as const;

export const DIMENSION_IDS = [
  'relevance',
  'completeness',
  'clarity',
  'structure',
  'specificity',
  'technical',
  'evidence',
  'communication',
] as const;

/** Shape we ask the model to produce for a question set. */
export const aiQuestionSetSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().min(8).max(800),
        category: z.enum(QUESTION_CATEGORIES),
        difficulty: z.enum(['easy', 'medium', 'hard']),
        skill: z.string().min(1).max(80),
        criteria: z
          .array(z.object({ label: z.string().min(1).max(200) }))
          .min(2)
          .max(5),
        answerStructure: z.array(z.string().min(1).max(300)).min(3).max(6),
        timeLimitSeconds: z.number().int().min(60).max(900).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export type AiQuestionSet = z.infer<typeof aiQuestionSetSchema>;

/** Shape we ask the model to produce for a single answer evaluation. */
export const aiEvaluationSchema = z.object({
  overall: z.number().min(0).max(100),
  dimensions: z
    .array(
      z.object({
        id: z.enum(DIMENSION_IDS),
        score: z.number().min(0).max(100),
        evidence: z.string().min(10).max(600),
      }),
    )
    .min(3)
    .max(8),
  strengths: z.array(z.string().min(1).max(400)).max(6),
  weaknesses: z.array(z.string().min(1).max(400)).max(6),
  missing: z.array(z.string().min(1).max(400)).max(6),
  suggestions: z.array(z.string().min(1).max(400)).max(6),
  modelAnswerOutline: z.array(z.string().min(1).max(400)).min(2).max(8),
  followUp: z.string().min(10).max(400).optional(),
});

export type AiEvaluation = z.infer<typeof aiEvaluationSchema>;

const experienceText: Record<InterviewConfig['experience'], string> = {
  entry: 'early-career / entry level candidate',
  mid: 'mid-level candidate with a few years of experience',
  senior: 'senior candidate expected to handle ambiguity and mentor others',
  lead: 'lead / staff-level candidate expected to own direction and unblock teams',
};

export function questionGenerationMessages(config: InterviewConfig): { system: string; user: string } {
  const system = [
    'You generate realistic mock-interview questions for a practice platform.',
    'Return one JSON object: {"questions":[{"text","category","difficulty","skill","criteria":[{"label"}],"answerStructure":["step"],"timeLimitSeconds":n}]}',
    `Categories you may use: ${QUESTION_CATEGORIES.join(', ')}.`,
    'Rules:',
    '- Match the requested role, experience level, industry and interview type exactly.',
    '- Keep difficulty within one step of the requested difficulty; do not jump between easy and hard randomly.',
    '- Make questions distinct: no rephrasing duplicates, no generic filler.',
    '- criteria are 2-5 short, question-specific evaluation criteria an evaluator can check in an answer.',
    '- answerStructure is a 3-6 step suggested structure (a rubric), not a script.',
    '- timeLimitSeconds: 90-300 for most questions, up to 420 for system-design.',
    '- If a resume or job description is provided, only reference experience that is actually written there.',
    '  Never invent qualifications or claim the candidate has skills not present in the supplied text.',
    '- Do not include answers, greetings or commentary.',
  ].join('\n');

  const user = [
    'Interview configuration:',
    JSON.stringify(
      {
        targetRole: config.role,
        experienceLevel: `${config.experience} (${experienceText[config.experience]})`,
        industry: config.industry || 'unspecified',
        interviewType: config.type,
        difficulty: config.difficulty,
        questionCount: config.questionCount,
        jobDescription: config.jobDescription ? config.jobDescription.slice(0, 4000) : null,
        resumeText: config.resumeText ? config.resumeText.slice(0, 4000) : null,
      },
      null,
      2,
    ),
  ].join('\n');

  return { system, user };
}

export const requestQuestionSchema = z.object({
  id: z.string().min(1).max(120),
  text: z.string().min(8).max(800),
  category: z.enum(QUESTION_CATEGORIES),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  skill: z.string().min(1).max(80),
  criteria: z
    .array(z.object({ id: z.string().max(64), label: z.string().min(1).max(200), weight: z.number().min(1).max(3) }))
    .min(1)
    .max(8),
  answerStructure: z.array(z.string().min(1).max(300)).min(1).max(10),
});

export interface EvaluationRequest {
  question: InterviewQuestion;
  answer: string;
  config: Pick<InterviewConfig, 'role' | 'experience' | 'industry'>;
  includeFollowUp: boolean;
}

export function evaluationMessages(req: EvaluationRequest): { system: string; user: string } {
  const rubric = rubricForQuestion(req.question);
  const allowedIds = rubric.map((r) => r.id) as DimensionId[];

  const system = [
    'You are an interview coach evaluating a practice answer against a question-specific rubric.',
    'Return one JSON object with exactly these keys:',
    '{"overall":0-100,"dimensions":[{"id","score":0-100,"evidence"}],"strengths":[],"weaknesses":[],"missing":[],"suggestions":[],"modelAnswerOutline":[],"followUp":"optional"}',
    `Allowed dimension ids for this question: ${allowedIds.join(', ')}. Use only these ids.`,
    'Rules:',
    '- Score the submitted text only. Evidence must quote or paraphrase the answer.',
    '- Be rigorous: scores of 80+ require clearly correct, specific, well-structured content.',
    '- For behavioral questions, check situation-task-action-result coverage where relevant.',
    '- For technical questions, judge correctness of the explanation and reasoning; flag incorrect claims in weaknesses.',
    '- missing = required elements the answer does not contain at all.',
    '- suggestions = 2-5 concrete, doable improvements.',
    '- modelAnswerOutline = an illustrative outline of a stronger answer (short lines). It is not the only correct answer.',
    '- followUp: only when asked for - one short follow-up question that probes an unclear claim, a missing example,',
    '  or a deeper concept. Never repeat the original question with different wording.',
    '- Never infer personality, honesty, intelligence, emotion or mental state. Evaluate the text only.',
    '- This output is practice feedback and may contain errors; keep it specific and respectful.',
  ].join('\n');

  const user = [
    `Target role: ${req.config.role} (${req.config.experience}${req.config.industry ? `, ${req.config.industry}` : ''})`,
    '',
    'Question:',
    JSON.stringify(
      {
        text: req.question.text,
        category: req.question.category,
        difficulty: req.question.difficulty,
        skill: req.question.skill,
        criteria: req.question.criteria.map((c) => c.label),
        suggestedStructure: req.question.answerStructure,
      },
      null,
      2,
    ),
    '',
    `Candidate answer (${req.answer.split(/\s+/).filter(Boolean).length} words):`,
    req.answer.slice(0, 6000),
    '',
    req.includeFollowUp ? 'Include one followUp question.' : 'Do not include a followUp key.',
  ].join('\n');

  return { system, user };
}
