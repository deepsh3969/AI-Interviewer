/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addGoal,
  clearDraft,
  deleteAllData,
  deleteSession,
  exportData,
  getDraft,
  getSession,
  listSavedQuestions,
  listSessions,
  loadDatabase,
  recordPractice,
  removeGoal,
  removeSavedQuestion,
  saveDraft,
  saveQuestion,
  setPreferences,
  setProfile,
  STORAGE_KEY,
  upsertSession,
} from '../src/lib/storage';
import { makeEvaluation, makeSession } from './helpers';

describe('local persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves sessions', () => {
    const session = makeSession();
    expect(upsertSession(session).ok).toBe(true);
    expect(getSession(session.id)?.id).toBe(session.id);
    expect(listSessions()).toHaveLength(1);
  });

  it('updates an existing session instead of duplicating it', () => {
    const session = makeSession();
    upsertSession(session);
    upsertSession({ ...session, state: 'completed', updatedAt: new Date().toISOString() });
    expect(listSessions()).toHaveLength(1);
    expect(getSession(session.id)?.state).toBe('completed');
  });

  it('persists drafts and clears them', () => {
    saveDraft('sess1', 'q1', 'draft text');
    expect(getDraft('sess1', 'q1')).toBe('draft text');
    expect(getDraft('sess1', 'q2')).toBe('');
    clearDraft('sess1', 'q1');
    expect(getDraft('sess1', 'q1')).toBe('');
  });

  it('deletes a session with its drafts', () => {
    const session = makeSession();
    upsertSession(session);
    saveDraft(session.id, session.questions[0].id, 'hello');
    deleteSession(session.id);
    expect(getSession(session.id)).toBeNull();
    expect(getDraft(session.id, session.questions[0].id)).toBe('');
  });

  it('saves and removes questions in the library', () => {
    const session = makeSession();
    const question = session.questions[0];
    saveQuestion({ id: question.id, question, savedAt: new Date().toISOString(), practisedCount: 0 });
    expect(listSavedQuestions()).toHaveLength(1);
    saveQuestion({ id: question.id, question, savedAt: new Date().toISOString(), practisedCount: 0 });
    expect(listSavedQuestions()).toHaveLength(1);
    removeSavedQuestion(question.id);
    expect(listSavedQuestions()).toHaveLength(0);
  });

  it('records practice attempts and updates counters on saved questions', () => {
    const session = makeSession();
    const question = session.questions[0];
    saveQuestion({ id: question.id, question, savedAt: new Date().toISOString(), practisedCount: 0 });
    recordPractice({
      questionId: question.id,
      question,
      answer: 'answer',
      evaluation: makeEvaluation({ overall: 77 }),
      practisedAt: new Date().toISOString(),
    });
    const saved = listSavedQuestions()[0];
    expect(saved.practisedCount).toBe(1);
    expect(saved.lastScore).toBe(77);
  });

  it('stores profile and preferences', () => {
    setProfile({ name: 'Ada', email: 'ada@example.com', authMode: 'local', createdAt: new Date().toISOString() });
    setPreferences({ speechRate: 1.25, readQuestionsAloud: true });
    const db = loadDatabase();
    expect(db.profile?.name).toBe('Ada');
    expect(db.preferences.speechRate).toBe(1.25);
    expect(db.preferences.readQuestionsAloud).toBe(true);
  });

  it('manages goals', () => {
    addGoal({ id: 'g1', label: '5 interviews', targetSessions: 5, targetScore: 75, createdAt: new Date().toISOString() });
    expect(loadDatabase().goals).toHaveLength(1);
    removeGoal('g1');
    expect(loadDatabase().goals).toHaveLength(0);
  });

  it('exports and deletes all data', () => {
    const session = makeSession();
    upsertSession(session);
    const exported = exportData();
    expect(exported).toContain(session.id);
    expect(deleteAllData().ok).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(listSessions()).toHaveLength(0);
  });

  it('recovers from corrupted storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadDatabase().sessions).toHaveLength(0);
  });

  it('ignores unexpected shapes', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: 'nope', preferences: { speechRate: 99 } }));
    const db = loadDatabase();
    expect(db.sessions).toEqual([]);
    expect(db.preferences.speechRate).toBe(1);
  });
});
