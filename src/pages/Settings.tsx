import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select } from '../components/ui';
import { fetchStatus, type ApiStatus } from '../lib/apiClient';
import { DEFAULT_PREFERENCES, type Preferences } from '../lib/types';
import { useStore } from '../state/store';
import { useToast } from '../state/toast';

const SPEECH_LANGS = ['en-US', 'en-GB', 'en-IN', 'es-ES', 'fr-FR', 'de-DE', 'hi-IN'];

export default function Settings() {
  const { db, update, refresh } = useStore();
  const { push } = useToast();

  const [prefs, setPrefs] = useState<Preferences>(db.preferences);
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  function savePrefs() {
    const result = update((database) => ({ ...database, preferences: prefs }));
    if (result.ok) push('Preferences saved.', 'success');
    else push(result.error, 'error');
  }

  function patch<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function checkStatus() {
    setChecking(true);
    const result = await fetchStatus();
    setStatus(result);
    setChecking(false);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-interviewer-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push('Export downloaded.', 'success');
  }

  function wipeAll() {
    const result = update(() => ({
      version: 1,
      profile: null,
      preferences: { ...DEFAULT_PREFERENCES },
      sessions: [],
      savedQuestions: [],
      practice: [],
      goals: [],
      drafts: {},
    }));
    if (result.ok) {
      push('All local data deleted.', 'success');
      refresh();
    } else push(result.error, 'error');
    setConfirmDelete(false);
    setDeleteText('');
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Accessibility, speech, privacy and deployment status."
        actions={
          <Link to="/profile" className="btn-ghost">
            Profile
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Speech &amp; accessibility</h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-dim">Read questions aloud (browser speech synthesis)</span>
              <input
                type="checkbox"
                checked={prefs.readQuestionsAloud}
                onChange={(e) => patch('readQuestionsAloud', e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-dim">Auto-read new questions when they appear</span>
              <input
                type="checkbox"
                checked={prefs.autoReadAloud}
                onChange={(e) => patch('autoReadAloud', e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-dim">Sound cues (timer warnings, submit)</span>
              <input
                type="checkbox"
                checked={prefs.soundCues}
                onChange={(e) => patch('soundCues', e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
            <Field label={`Speech rate (${prefs.speechRate.toFixed(2)}×)`} htmlFor="speech-rate">
              <input
                id="speech-rate"
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={prefs.speechRate}
                onChange={(e) => patch('speechRate', Number(e.target.value))}
                className="w-full accent-accent"
              />
            </Field>
            <Field label="Speech / recognition language" htmlFor="speech-lang">
              <Select
                id="speech-lang"
                value={prefs.speechLang}
                onChange={(e) => patch('speechLang', e.target.value)}
              >
                {SPEECH_LANGS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-start justify-between gap-3">
              <span className="text-sm text-ink-dim">
                Allow remote transcription
                <span className="faint mt-1 block">
                  When enabled, microphone audio is sent to the configured server-side speech provider (Deepgram).
                  When disabled, dictation stays on-device via the browser Web Speech API, which requires a modern
                  Chrome or Edge. This app never records or stores raw audio.
                </span>
              </span>
              <input
                type="checkbox"
                checked={prefs.allowRemoteTranscription}
                onChange={(e) => patch('allowRemoteTranscription', e.target.checked)}
                className="mt-1 h-4 w-4 accent-accent"
              />
            </label>
            <Button variant="primary" onClick={savePrefs}>
              Save preferences
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPrefs({ ...DEFAULT_PREFERENCES })}
            >
              Reset to defaults
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Deployment status</h2>
              <Button variant="secondary" onClick={checkStatus} disabled={checking}>
                {checking ? 'Checking…' : 'Check now'}
              </Button>
            </div>
            {status ? (
              <ul className="mt-3 space-y-2 text-sm text-ink-dim">
                <li>
                  AI provider:{' '}
                  {status.aiConfigured ? <Badge tone="success">configured</Badge> : <Badge tone="warn">not configured</Badge>}{' '}
                  {status.model ? <span className="faint">({status.model})</span> : null}
                </li>
                <li>
                  Speech transcription:{' '}
                  {status.speechConfigured ? (
                    <Badge tone="success">configured</Badge>
                  ) : (
                    <Badge tone="warn">not configured</Badge>
                  )}
                </li>
                <li className="faint">API version {status.version}</li>
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-dim">
                Not checked yet. Without a configured AI provider the app falls back to a curated question bank and a
                rule-based heuristic - clearly labelled in every report.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Data &amp; privacy</h2>
            <p className="mt-2 text-sm text-ink-dim">
              All sessions, answers, evaluations and goals live in this browser&apos;s localStorage under the key{' '}
              <code className="text-accent-2">ai-interviewer-pro.v1</code>. There is no cloud database.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-ink-faint">
              <li>• {db.sessions.length} sessions stored</li>
              <li>• {db.practice.length} practice records</li>
              <li>• {db.savedQuestions.length} saved questions</li>
              <li>• {Object.keys(db.drafts).length} answer drafts</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportData}>
                Export JSON
              </Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete all data
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        title="Delete all local data?"
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={wipeAll} disabled={deleteText !== 'DELETE'}>
              Delete everything
            </Button>
          </>
        }
      >
        <p>
          This wipes your profile, preferences, every interview session, answer, evaluation, saved question, practice
          record, goal and draft from this browser. It cannot be undone.
        </p>
        <p className="mt-2">
          Type <strong className="text-danger">DELETE</strong> to confirm.
        </p>
        <Input
          value={deleteText}
          onChange={(e) => setDeleteText(e.target.value)}
          placeholder="DELETE"
          className="mt-2"
          aria-label="Type DELETE to confirm"
        />
      </Modal>
    </div>
  );
}
