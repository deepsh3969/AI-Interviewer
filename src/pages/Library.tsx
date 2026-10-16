import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Tabs } from '../components/ui.js';
import {
  QUESTION_BANK,
  bucketLabel,
  type BucketKey,
  type BankEntry,
} from '../lib/questionBank.js';
import type { Difficulty, InterviewQuestion, SavedQuestion } from '../lib/types.js';
import { randomId, hashString } from '../lib/id.js';
import { buildCriteria } from '../lib/rubrics.js';
import { useStore } from '../state/store.js';
import { useToast } from '../state/toast.js';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const CATEGORIES = [
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

function entryId(entry: BankEntry): string {
  return `fb_${hashString(entry.text)}`;
}

function entryToQuestion(entry: BankEntry): InterviewQuestion {
  return {
    id: entryId(entry),
    text: entry.text,
    category: entry.category,
    difficulty: entry.difficulty,
    skill: entry.skill,
    criteria: buildCriteria(entry.criteria),
    answerStructure: entry.structure,
    source: 'bank',
    timeLimitSeconds: entry.category === 'behavioral' ? 180 : entry.category === 'system-design' ? 300 : 150,
  };
}

interface LibraryItem {
  question: InterviewQuestion;
  bucket: BucketKey;
}

function buildLibrary(): LibraryItem[] {
  const seen = new Set<string>();
  const out: LibraryItem[] = [];
  for (const key of Object.keys(QUESTION_BANK) as BucketKey[]) {
    for (const entry of QUESTION_BANK[key]) {
      if (seen.has(entry.text)) continue;
      seen.add(entry.text);
      out.push({ question: entryToQuestion(entry), bucket: key });
    }
  }
  return out;
}

const LIBRARY = buildLibrary();

export default function Library() {
  const { db, update } = useStore();
  const { push } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: 'all' | 'saved' = searchParams.get('view') === 'saved' ? 'saved' : 'all';

  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState<'all' | BucketKey>('all');
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all');
  const [category, setCategory] = useState<'all' | string>('all');

  function setView(next: 'all' | 'saved') {
    setSearchParams(next === 'saved' ? { view: 'saved' } : {});
  }

  const savedIds = useMemo(() => new Set(db.savedQuestions.map((s) => s.question.id)), [db.savedQuestions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARY.filter((item) => {
      if (q && !item.question.text.toLowerCase().includes(q) && !item.question.skill.toLowerCase().includes(q))
        return false;
      if (difficulty !== 'all' && item.question.difficulty !== difficulty) return false;
      if (category !== 'all' && item.question.category !== category) return false;
      if (bucket !== 'all' && item.bucket !== bucket) return false;
      return true;
    });
  }, [query, bucket, difficulty, category]);

  function toggleSave(question: InterviewQuestion) {
    if (savedIds.has(question.id)) {
      update((database) => ({
        ...database,
        savedQuestions: database.savedQuestions.filter((s) => s.question.id !== question.id),
      }));
      push('Removed from saved questions.', 'success');
      return;
    }
    const entry: SavedQuestion = {
      id: randomId('sq'),
      question,
      savedAt: new Date().toISOString(),
      practisedCount: 0,
    };
    update((database) => ({ ...database, savedQuestions: [entry, ...database.savedQuestions] }));
    push('Saved to your library.', 'success');
  }

  const savedSection = (
    <section className={view === 'saved' ? '' : 'mt-8'}>
      <div className="grid gap-3">
        {db.savedQuestions.map((saved) => (
          <Card key={saved.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-ink">{saved.question.text}</p>
              <p className="faint mt-1">
                practised {saved.practisedCount}× ·{' '}
                {saved.lastScore !== undefined ? `last score ${saved.lastScore}` : 'not practised yet'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/practice/${saved.question.id}`} className="btn-secondary">
                Practise
              </Link>
              <Button variant="ghost" onClick={() => toggleSave(saved.question)}>
                Remove
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );

  return (
    <div>
      <PageHeader
        title="Question library"
        subtitle="Curated practice questions from the built-in bank - labelled as curated content, never AI output. Save favourites and practise them one at a time."
        actions={
          <Link to="/dashboard" className="btn-ghost">
            Dashboard
          </Link>
        }
      />

      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'all', label: `All questions (${LIBRARY.length})` },
            { id: 'saved', label: `Saved (${db.savedQuestions.length})` },
          ]}
          active={view}
          onChange={(id) => setView(id === 'saved' ? 'saved' : 'all')}
        />
      </div>

      {view === 'saved' ? (
        db.savedQuestions.length === 0 ? (
          <EmptyState
            title="No saved questions yet"
            description="Save questions from the library to build your own practice set - they stay on this device."
            action={
              <Button variant="primary" onClick={() => setView('all')}>
                Browse all questions
              </Button>
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-faint">
              {db.savedQuestions.length} saved · {db.practice.length} practice attempts recorded
            </p>
            {savedSection}
          </>
        )
      ) : (
        <>
          <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Search" htmlFor="lib-search">
          <Input
            id="lib-search"
            placeholder="e.g. rate limiter, STAR, SQL…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field label="Role family" htmlFor="lib-bucket">
          <Select id="lib-bucket" value={bucket} onChange={(e) => setBucket(e.target.value as 'all' | BucketKey)}>
            <option value="all">All families</option>
            <option value="software">{bucketLabel('software')}</option>
            <option value="data">{bucketLabel('data')}</option>
            <option value="product">{bucketLabel('product')}</option>
            <option value="design">{bucketLabel('design')}</option>
            <option value="marketing">{bucketLabel('marketing')}</option>
            <option value="support">{bucketLabel('support')}</option>
            <option value="generic">{bucketLabel('generic')}</option>
          </Select>
        </Field>
        <Field label="Difficulty" htmlFor="lib-diff">
          <Select id="lib-diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'all' | Difficulty)}>
            <option value="all">Any difficulty</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" htmlFor="lib-cat">
          <Select id="lib-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <p className="mb-3 text-xs text-ink-faint">
        Showing {filtered.length} of {LIBRARY.length} questions · {db.savedQuestions.length} saved ·{' '}
        {db.practice.length} practice attempts recorded
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="No questions match"
          description="Try clearing the search or widening the filters."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setBucket('all');
                setDifficulty('all');
                setCategory('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map(({ question, bucket: itemBucket }) => (
            <Card key={question.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="accent">{bucketLabel(itemBucket)}</Badge>
                <Badge>{question.category}</Badge>
                <Badge tone={question.difficulty === 'hard' ? 'warn' : 'neutral'}>{question.difficulty}</Badge>
                <Badge>{question.skill}</Badge>
                <Badge>curated bank</Badge>
              </div>
              <p className="mt-2 text-sm font-medium text-ink">{question.text}</p>
              <ul className="mt-2 flex flex-wrap gap-2 text-xs text-ink-faint">
                {question.answerStructure.slice(0, 3).map((step) => (
                  <li key={step} className="rounded border border-line bg-panel-2 px-2 py-0.5">
                    {step}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => navigate(`/practice/${question.id}`)}>
                  Practise now
                </Button>
                <Button variant={savedIds.has(question.id) ? 'secondary' : 'ghost'} onClick={() => toggleSave(question)}>
                  {savedIds.has(question.id) ? 'Saved ✓' : 'Save'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

          {db.savedQuestions.length > 0 ? savedSection : null}
        </>
      )}
    </div>
  );
}
