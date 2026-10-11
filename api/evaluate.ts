import { z } from 'zod';
import { chatJson } from '../server/ai';
import { respondProviderFailure } from '../server/failures';
import {
  RateLimiter,
  clientIp,
  fail,
  json,
  methodNotAllowed,
  readJsonBody,
  type ApiHandler,
} from '../server/http';
import { aiConfig } from '../server/env';
import { aiEvaluationSchema, evaluationMessages, requestQuestionSchema } from '../server/prompts';
import { rubricForQuestion } from '../src/lib/rubrics';
import type { InterviewQuestion } from '../src/lib/types';

const limiter = new RateLimiter(60_000, 24);

const MAX_ANSWER_CHARS = 8000;

const bodySchema = z.object({
  question: requestQuestionSchema,
  answer: z.string().min(1),
  config: z.object({
    role: z.string().max(80),
    experience: z.enum(['entry', 'mid', 'senior', 'lead']),
    industry: z.string().max(80).optional().default(''),
  }),
  includeFollowUp: z.boolean().optional().default(false),
});

const handler: ApiHandler = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const ip = clientIp(req);
  if (limiter.check(ip)) {
    res.setHeader('Retry-After', '60');
    return fail(res, 429, 'rate_limited', 'Too many evaluation requests. Try again in a minute.');
  }

  const body = await readJsonBody(req);
  if (!body.ok) {
    return fail(
      res,
      body.reason === 'too_large' ? 413 : 400,
      body.reason === 'too_large' ? 'answer_too_long' : 'invalid_request',
      body.reason === 'too_large' ? 'Request body is too large.' : 'Request body must be valid JSON.',
    );
  }

  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return fail(res, 400, 'invalid_request', 'Evaluation request failed validation.', {
      issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }

  const answer = parsed.data.answer.trim();
  if (answer.length === 0) {
    return fail(res, 400, 'invalid_request', 'An answer is required.');
  }
  if (answer.length > MAX_ANSWER_CHARS) {
    return fail(res, 413, 'answer_too_long', `Answers must be ${MAX_ANSWER_CHARS} characters or fewer.`);
  }

  if (!aiConfig().configured) {
    return fail(
      res,
      503,
      'ai_not_configured',
      'AI evaluation is not configured on this deployment. The client will use the labelled rule-based fallback.',
    );
  }

  const question: InterviewQuestion = {
    ...parsed.data.question,
    source: 'ai',
    timeLimitSeconds: 180,
  };

  try {
    const { system, user } = evaluationMessages({
      question,
      answer,
      config: parsed.data.config,
      includeFollowUp: parsed.data.includeFollowUp,
    });
    const { data, model } = await chatJson({
      system,
      user,
      schema: aiEvaluationSchema,
      maxTokens: 2500,
      temperature: 0.2,
    });

    // Guard: only rubric dimensions for this question may be scored, once each.
    const allowed = new Set(rubricForQuestion(question).map((d) => d.id));
    const dimensions = data.dimensions.filter((d) => allowed.has(d.id));
    const uniqueIds = new Set(dimensions.map((d) => d.id));
    if (dimensions.length < 3 || uniqueIds.size !== dimensions.length) {
      return fail(
        res,
        502,
        'upstream_error',
        'The AI evaluation did not cover enough rubric dimensions for this question.',
      );
    }

    return json(res, 200, {
      overall: Math.round(data.overall),
      dimensions: dimensions.map((d) => ({ id: d.id, score: Math.round(d.score), evidence: d.evidence })),
      strengths: data.strengths.slice(0, 6),
      weaknesses: data.weaknesses.slice(0, 6),
      missing: data.missing.slice(0, 6),
      suggestions: data.suggestions.slice(0, 6),
      modelAnswerOutline: data.modelAnswerOutline.slice(0, 8),
      followUp: parsed.data.includeFollowUp ? (data.followUp ?? null) : null,
      followUpSource: parsed.data.includeFollowUp && data.followUp ? 'ai' : null,
      model,
    });
  } catch (err) {
    return respondProviderFailure(res, err);
  }
};

export default handler;
