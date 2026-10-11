import type {
  AppSettings,
  InterviewSession,
  PersonalGoal,
  PracticeRecord,
  Preferences,
  Profile,
  SavedQuestion,
} from './types';
import { DEFAULT_PREFERENCES } from './types';

/**
 * Local-first persistence.
 *
 * All data lives in this browser's localStorage under a single versioned key.
 * There is no cloud sync unless a backend is configured later - the UI labels
 * this clearly as "Local practice mode".
 */
export const STORAGE_KEY = 'ai-interviewer-pro.v1';

export interface Database {
  version: 1;
  profile: Profile | null;
  preferences: Preferences;
  sessions: InterviewSession[];
  savedQuestions: SavedQuestion[];
  practice: PracticeRecord[];
  goals: PersonalGoal[];
  /** Draft answers keyed by `sessionId::questionId`, preserved across refreshes. */
  drafts: Record<string, string>;
}

const MAX_SESSIONS = 200;
const MAX_PRACTICE = 300;

export function emptyDatabase(): Database {
  return {
    version: 1,
    profile: null,
    preferences: { ...DEFAULT_PREFERENCES },
    sessions: [],
    savedQuestions: [],
    practice: [],
    goals: [],
    drafts: {},
  };
}

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__aip_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

let memoryFallback: Database = emptyDatabase();

export function loadDatabase(): Database {
  const storage = safeStorage();
  if (!storage) return memoryFallback;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyDatabase();
    const parsed = JSON.parse(raw) as Partial<Database>;
    return normalize(parsed);
  } catch {
    return emptyDatabase();
  }
}

function normalize(input: Partial<Database>): Database {
  const rawPrefs = { ...DEFAULT_PREFERENCES, ...(input.preferences ?? {}) };
  const speechRate =
    typeof rawPrefs.speechRate === 'number' && rawPrefs.speechRate >= 0.5 && rawPrefs.speechRate <= 2
      ? rawPrefs.speechRate
      : 1;
  const preferences: Preferences = {
    soundCues: Boolean(rawPrefs.soundCues),
    readQuestionsAloud: Boolean(rawPrefs.readQuestionsAloud),
    speechRate,
    speechLang: typeof rawPrefs.speechLang === 'string' && rawPrefs.speechLang.length > 0 ? rawPrefs.speechLang.slice(0, 12) : 'en-US',
    allowRemoteTranscription: Boolean(rawPrefs.allowRemoteTranscription),
    autoReadAloud: Boolean(rawPrefs.autoReadAloud),
  };
  return {
    version: 1,
    profile: input.profile && typeof input.profile === 'object' && input.profile.email ? input.profile : null,
    preferences,
    sessions: Array.isArray(input.sessions) ? input.sessions.slice(-MAX_SESSIONS) : [],
    savedQuestions: Array.isArray(input.savedQuestions) ? input.savedQuestions : [],
    practice: Array.isArray(input.practice) ? input.practice.slice(-MAX_PRACTICE) : [],
    goals: Array.isArray(input.goals) ? input.goals : [],
    drafts: input.drafts && typeof input.drafts === 'object' ? input.drafts : {},
  };
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export function saveDatabase(db: Database): SaveResult {
  memoryFallback = db;
  const storage = safeStorage();
  if (!storage) return { ok: true };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(db));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Browser storage is full or unavailable. Export your data and delete old sessions.' };
  }
}

export function updateDatabase(mutator: (db: Database) => Database): SaveResult {
  return saveDatabase(mutator(loadDatabase()));
}

/* ---------------- sessions ---------------- */

export function listSessions(): InterviewSession[] {
  return [...loadDatabase().sessions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function getSession(id: string): InterviewSession | null {
  return loadDatabase().sessions.find((s) => s.id === id) ?? null;
}

export function upsertSession(session: InterviewSession): SaveResult {
  return updateDatabase((db) => {
    const idx = db.sessions.findIndex((s) => s.id === session.id);
    const sessions = idx >= 0 ? [...db.sessions] : [...db.sessions, session];
    if (idx >= 0) sessions[idx] = session;
    // Keep the most recent sessions if the cap is exceeded.
    const trimmed =
      sessions.length > MAX_SESSIONS
        ? sessions.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, MAX_SESSIONS)
        : sessions;
    return { ...db, sessions: trimmed };
  });
}

export function deleteSession(id: string): SaveResult {
  return updateDatabase((db) => {
    const sessions = db.sessions.filter((s) => s.id !== id);
    const drafts = Object.fromEntries(Object.entries(db.drafts).filter(([k]) => !k.startsWith(`${id}::`)));
    return { ...db, sessions, drafts };
  });
}

/* ---------------- drafts ---------------- */

export function draftKey(sessionId: string, questionId: string): string {
  return `${sessionId}::${questionId}`;
}

export function saveDraft(sessionId: string, questionId: string, text: string): SaveResult {
  return updateDatabase((db) => ({ ...db, drafts: { ...db.drafts, [draftKey(sessionId, questionId)]: text } }));
}

export function getDraft(sessionId: string, questionId: string): string {
  return loadDatabase().drafts[draftKey(sessionId, questionId)] ?? '';
}

export function clearDraft(sessionId: string, questionId: string): SaveResult {
  return updateDatabase((db) => {
    const drafts = { ...db.drafts };
    delete drafts[draftKey(sessionId, questionId)];
    return { ...db, drafts };
  });
}

/* ---------------- saved questions & practice ---------------- */

export function listSavedQuestions(): SavedQuestion[] {
  return loadDatabase().savedQuestions;
}

export function isQuestionSaved(questionId: string): boolean {
  return listSavedQuestions().some((q) => q.question.id === questionId || q.id === questionId);
}

export function saveQuestion(entry: SavedQuestion): SaveResult {
  return updateDatabase((db) => {
    if (db.savedQuestions.some((q) => q.id === entry.id || q.question.id === entry.question.id)) return db;
    return { ...db, savedQuestions: [entry, ...db.savedQuestions] };
  });
}

export function removeSavedQuestion(id: string): SaveResult {
  return updateDatabase((db) => ({
    ...db,
    savedQuestions: db.savedQuestions.filter((q) => q.id !== id && q.question.id !== id),
  }));
}

export function recordPractice(entry: PracticeRecord): SaveResult {
  return updateDatabase((db) => {
    const savedQuestions = db.savedQuestions.map((q) =>
      q.question.id === entry.question.id
        ? {
            ...q,
            practisedCount: q.practisedCount + 1,
            lastPractisedAt: entry.practisedAt,
            lastScore: entry.evaluation?.overall ?? q.lastScore,
          }
        : q,
    );
    return { ...db, practice: [entry, ...db.practice].slice(0, MAX_PRACTICE), savedQuestions };
  });
}

export function listPractice(): PracticeRecord[] {
  return loadDatabase().practice;
}

/* ---------------- profile, goals, preferences ---------------- */

export function getSettings(): AppSettings {
  const db = loadDatabase();
  return { profile: db.profile, preferences: db.preferences };
}

export function setProfile(profile: Profile | null): SaveResult {
  return updateDatabase((db) => ({ ...db, profile }));
}

export function setPreferences(patch: Partial<Preferences>): SaveResult {
  return updateDatabase((db) => ({ ...db, preferences: { ...db.preferences, ...patch } }));
}

export function listGoals(): PersonalGoal[] {
  return loadDatabase().goals;
}

export function addGoal(goal: PersonalGoal): SaveResult {
  return updateDatabase((db) => ({ ...db, goals: [goal, ...db.goals].slice(0, 20) }));
}

export function removeGoal(id: string): SaveResult {
  return updateDatabase((db) => ({ ...db, goals: db.goals.filter((g) => g.id !== id) }));
}

/* ---------------- privacy ---------------- */

export function exportData(): string {
  return JSON.stringify(loadDatabase(), null, 2);
}

export function deleteAllData(): SaveResult {
  memoryFallback = emptyDatabase();
  const storage = safeStorage();
  if (!storage) return { ok: true };
  try {
    storage.removeItem(STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not clear browser storage.' };
  }
}
