import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Textarea } from '../components/ui.js';
import { EvaluationBlock } from './InterviewRoom.js';
import { evaluateAnswer } from '../lib/apiClient.js';
import { QUESTION_BANK, bucketLabel, type BucketKey } from '../lib/questionBank.js';
import { hashString } from '../lib/id.js';
import { buildCriteria } from '../lib/rubrics.js';
import type { Evaluation, InterviewQuestion, PracticeRecord } from '../lib/types.js';
import { useStore } from '../state/store.js';
import { useToast } from '../state/toast.js';

function findBankQuestion(id: string): { question: InterviewQuestion; bucket: BucketKey } | null {
  for (const key of Object.keys(QUESTION_BANK) as BucketKey[]) {
    for (const entry of QUESTION_BANK[key]) {
      if (`fb_${hashString(entry.text)}` !== id) continue;
      return {
        question: {
          id,
          text: entry.text,
          category: entry.category,
          difficulty: entry.difficulty,
          skill: entry.skill,
          criteria: buildCriteria(entry.criteria),
          answerStructure: entry.structure,
          source: 'bank',
          timeLimitSeconds: entry.category === 'behavioral' ? 180 : 150,
        },
        bucket: key,
      };
    }
  }
  return null;
}

export default function Practice() {
  const { questionId } = useParams<{ questionId: string }>();
  const { db, update } = useStore();
  const { push } = useToast();

  const found = useMemo(() => (questionId ? findBankQuestion(questionId) : null), [questionId]);
  const savedEntry = db.savedQuestions.find((s) => s.question.id === questionId);

  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [engineNote, setEngineNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!found && !savedEntry) {
    return (
      <EmptyState
        title="Question not found"
        description="This practice question is not in the local bank. Pick one from the library."
        action={
          <Link to="/library" className="btn-primary">
            Open library
          </Link>
        }
      />
    );
  }

  const question = savedEntry?.question ?? found!.question;
  const bucket = found?.bucket ?? 'generic';
  const role = db.profile?.targetRole ?? question.skill;

  async function submit() {
    if (!answer.trim()) {
      push('Write or dictate an answer before submitting.', 'error');
      return;
    }
    setBusy(true);
    setEvaluation(null);
    setEngineNote('');
    try {
      const result = await evaluateAnswer({
        question,
        answer: answer.trim(),
        config: { role, experience: 'mid', industry: '' },
        includeFollowUp: false,
      });
      setEvaluation(result.evaluation);
      setEngineNote(result.note);
      const record: PracticeRecord = {
        questionId: question.id,
        question,
        answer: answer.trim(),
        evaluation: result.evaluation,
        practisedAt: new Date().toISOString(),
      };
      update((database) => {
        const practice = [record, ...database.practice].slice(0, 300);
        const savedQuestions = database.savedQuestions.map((s) =>
          s.question.id === question.id
            ? {
                ...s,
                practisedCount: s.practisedCount + 1,
                lastPractisedAt: record.practisedAt,
                lastScore: result.evaluation.overall,
              }
            : s,
        );
        return { ...database, practice, savedQuestions };
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Single-question practice"
        subtitle="Answer one curated question and get practice feedback. This is separate from a full interview session."
        actions={
          <Link to="/library" className="btn-ghost">
            Back to library
          </Link>
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="accent">{bucketLabel(bucket)}</Badge>
          <Badge>{question.category}</Badge>
          <Badge>{question.difficulty}</Badge>
          <Badge>{question.skill}</Badge>
          <Badge>curated bank question</Badge>
          {savedEntry ? <Badge tone="success">practised {savedEntry.practisedCount}×</Badge> : null}
        </div>
        <h2 className="mt-3 text-lg font-medium text-ink">{question.text}</h2>

        <div className="mt-4 rounded-lg border border-line bg-navy-900 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Suggested structure</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-dim">
            {question.answerStructure.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <label className="label mt-5" htmlFor="practice-answer">
          Your answer
        </label>
        <Textarea
          id="practice-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer, or think out loud first and type it up after…"
          rows={8}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Evaluating…' : 'Submit for feedback'}
          </Button>
          {busy ? <Spinner label="Working…" /> : null}
          <span className="text-xs text-ink-faint">
            {answer.trim() ? `${answer.trim().split(/\s+/).length} words` : 'empty'}
          </span>
        </div>
      </Card>

      {evaluation ? (
        <Card className="mt-4 p-5">
          <h3 className="text-sm font-semibold text-ink">Practice feedback</h3>
          {engineNote ? <p className="mt-1 text-xs text-warn">{engineNote}</p> : null}
          <EvaluationBlock evaluation={evaluation} />
          <p className="faint mt-3">
            Save this question from the library to track future practice scores, or start a full interview for a
            longer, multi-question experience.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
