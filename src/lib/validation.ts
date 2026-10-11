import { z } from 'zod';

const trim = (s: string) => s.trim();

export const experienceLevels = ['entry', 'mid', 'senior', 'lead'] as const;
export const interviewTypes = [
  'hr',
  'behavioral',
  'technical',
  'project',
  'situational',
  'role',
  'mixed',
] as const;
export const difficulties = ['easy', 'medium', 'hard'] as const;
export const responseModes = ['typed', 'spoken'] as const;

export const interviewConfigSchema = z.object({
  role: z
    .string()
    .trim()
    .min(2, 'Target role must be at least 2 characters.')
    .max(80, 'Target role must be 80 characters or fewer.')
    .transform(trim),
  experience: z.enum(experienceLevels),
  industry: z
    .string()
    .trim()
    .max(80, 'Industry must be 80 characters or fewer.')
    .transform(trim)
    .default(''),
  type: z.enum(interviewTypes),
  difficulty: z.enum(difficulties),
  questionCount: z
    .number()
    .int('Question count must be a whole number.')
    .min(3, 'Choose at least 3 questions.')
    .max(20, 'Choose at most 20 questions.'),
  durationMinutes: z
    .number()
    .int('Session duration must be a whole number of minutes.')
    .min(5, 'Sessions must be at least 5 minutes.')
    .max(120, 'Sessions must be at most 120 minutes.'),
  mode: z.enum(responseModes),
  jobDescription: z
    .string()
    .max(8000, 'Job description must be 8000 characters or fewer.')
    .default(''),
  resumeText: z
    .string()
    .max(8000, 'Resume text must be 8000 characters or fewer.')
    .default(''),
  followUps: z.boolean().default(true),
});

export type InterviewConfigInput = z.input<typeof interviewConfigSchema>;

export const interviewConfigSchemaWithWarnings = interviewConfigSchema.superRefine((cfg, ctx) => {
  if (cfg.questionCount > 12 && cfg.durationMinutes < 15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['durationMinutes'],
      message: 'A session with more than 12 questions needs at least 15 minutes.',
    });
  }
  const roughWords = cfg.jobDescription.trim().split(/\s+/).filter(Boolean).length;
  if (cfg.jobDescription.trim().length > 0 && roughWords < 15) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['jobDescription'],
      message: 'Job description looks too short to be useful (at least 15 words). Leave it empty to skip.',
    });
  }
});

export function validateConfig(
  input: unknown,
): { ok: true; value: z.infer<typeof interviewConfigSchema> } | { ok: false; issues: string[] } {
  const parsed = interviewConfigSchemaWithWarnings.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, issues: parsed.error.issues.map((i) => `${i.path.join('.') || 'config'}: ${i.message}`) };
}

export const questionSourceSchema = z.enum(['ai', 'fallback', 'bank']);

export const evaluationCriterionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  weight: z.number().min(1).max(3),
});

export const interviewQuestionSchema = z.object({
  id: z.string().min(1).max(120),
  text: z.string().min(8).max(800),
  category: z.enum([
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
  ]),
  difficulty: z.enum(difficulties),
  skill: z.string().min(1).max(80),
  criteria: z.array(evaluationCriterionSchema).min(1).max(8),
  answerStructure: z.array(z.string().min(1).max(300)).min(1).max(10),
  source: questionSourceSchema,
  timeLimitSeconds: z.number().int().min(30).max(900),
  followUpFor: z.string().max(120).optional(),
});

export const questionSetResponseSchema = z.object({
  questions: z.array(interviewQuestionSchema).min(1).max(20),
  source: z.enum(['ai', 'fallback']),
  model: z.string().max(120).nullable(),
  note: z.string().max(600).optional(),
});

const gradeFor = (overall: number): 'needs-work' | 'developing' | 'solid' | 'strong' => {
  if (overall < 40) return 'needs-work';
  if (overall < 60) return 'developing';
  if (overall < 80) return 'solid';
  return 'strong';
};

export const dimensionIdSchema = z.enum([
  'relevance',
  'completeness',
  'clarity',
  'structure',
  'specificity',
  'technical',
  'evidence',
  'communication',
]);

export const evaluationObjectSchema = z.object({
  overall: z.number().min(0).max(100),
  dimensions: z
    .array(
      z.object({
        id: dimensionIdSchema,
        score: z.number().min(0).max(100),
        evidence: z.string().min(1).max(600),
      }),
    )
    .min(3)
    .max(8),
  strengths: z.array(z.string().min(1).max(400)).max(6),
  weaknesses: z.array(z.string().min(1).max(400)).max(6),
  missing: z.array(z.string().min(1).max(400)).max(6),
  suggestions: z.array(z.string().min(1).max(400)).max(6),
  modelAnswerOutline: z.array(z.string().min(1).max(400)).min(2).max(8),
});

export const evaluationSchema = evaluationObjectSchema.superRefine((val, ctx) => {
    const ids = new Set(val.dimensions.map((d) => d.id));
    if (ids.size !== val.dimensions.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dimensions'], message: 'Duplicate dimension ids.' });
    }
    for (const d of val.dimensions) {
      if (d.evidence.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dimensions', d.id, 'evidence'],
          message: 'Each dimension needs concrete evidence drawn from the answer.',
        });
      }
    }
    if (val.overall < 60 && val.weaknesses.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weaknesses'],
        message: 'Scores below 60 must list at least one weakness.',
      });
    }
  });

export type EvaluationPayload = z.infer<typeof evaluationSchema>;

/** Finalise a validated AI payload into a full Evaluation record. */
export function toEvaluation(
  payload: EvaluationPayload,
  questionId: string,
  engine: 'ai' | 'heuristic',
  disclaimer: string,
  now = new Date(),
): import('./types').Evaluation {
  return {
    questionId,
    overall: Math.round(payload.overall),
    grade: gradeFor(payload.overall),
    dimensions: payload.dimensions.map((d) => ({ ...d, score: Math.round(d.score), label: dimensionLabel(d.id) })),
    strengths: payload.strengths.slice(0, 6),
    weaknesses: payload.weaknesses.slice(0, 6),
    missing: payload.missing.slice(0, 6),
    suggestions: payload.suggestions.slice(0, 6),
    modelAnswerOutline: payload.modelAnswerOutline.slice(0, 8),
    engine,
    disclaimer,
    evaluatedAt: now.toISOString(),
  };
}

export function dimensionLabel(id: import('./types').DimensionId): string {
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

export function gradeForScore(overall: number): 'needs-work' | 'developing' | 'solid' | 'strong' {
  return gradeFor(overall);
}
