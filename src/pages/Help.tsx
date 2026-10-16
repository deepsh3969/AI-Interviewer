import type { ReactNode } from 'react';
import { LifeBuoy, MessageSquareWarning, ShieldCheck, Sparkles, Volume2 } from 'lucide-react';
import { Card, PageHeader } from '../components/ui.js';

const ISSUES_URL = 'https://github.com/deepsh3969/AI-Interviewer/issues';

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-line bg-panel px-4 py-3">
      <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:hidden">
        <span className="flex items-center justify-between gap-3">
          {question}
          <span className="text-ink-faint transition-transform group-open:rotate-45" aria-hidden>
            +
          </span>
        </span>
      </summary>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-dim">{children}</div>
    </details>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-2" aria-hidden>
          {icon}
        </span>
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export default function Help() {
  return (
    <div>
      <PageHeader
        title="Help & support"
        subtitle="How the app works, what it can and cannot do, and where to report problems."
        actions={
          <a href={ISSUES_URL} target="_blank" rel="noreferrer" className="btn-secondary">
            <MessageSquareWarning size={15} aria-hidden />
            Report an issue
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section icon={<Sparkles size={15} />} title="Interviews & evaluation">
            <Faq question="How do I start a mock interview?">
              <p>
                Use <strong>Quick start</strong> on the overview page or <strong>Practice Interview</strong> in the
                menu. Pick a role, type, difficulty and question count; the session opens with generated questions.
                Answer by voice or type, and a report is produced at the end.
              </p>
            </Faq>
            <Faq question="Where do the questions and feedback come from?">
              <p>
                When an AI provider is configured on the server (OpenAI/Anthropic API key), questions and evaluations
                come from that provider and are labelled with the model.                 Without a key, the app falls back to a
                curated question bank and a rule-based evaluator - both labelled clearly as fallback.
              </p>
            </Faq>
            <Faq question="Is the score a real interview score?">
              <p>
                No. Scores are <strong>practice-only feedback</strong> and may contain errors. They are not a hiring
                assessment and not a prediction of real interview outcomes. Use them to spot weak areas and structure
                practice.
              </p>
            </Faq>
            <Faq question="Why does the app say “Fallback mode”?">
              <p>
                The status chip in the top bar reflects the current provider: <strong>AI ready</strong> when an AI
                provider is configured, <strong>Fallback mode</strong> when questions come from the built-in bank.
              </p>
            </Faq>
          </Section>

          <Section icon={<Volume2 size={15} />} title="Speech & microphone">
            <Faq question="Voice answers are not working">
              <p>
                Spoken answers use your browser's speech recognition (Web Speech API). Check microphone permission for
                this site in your browser settings, and prefer Chrome/Edge which support it best. Typed answers always
                work as a fallback.
              </p>
            </Faq>
            <Faq question="No sound during questions">
              <p>
                Question read-aloud uses speech synthesis and can be muted from the interview toolbar. If nothing
                plays, check the system volume and the tab's audio; typed question text is always visible.
              </p>
            </Faq>
          </Section>
        </div>

        <div className="space-y-6">
          <Section icon={<ShieldCheck size={15} />} title="Data & privacy">
            <Faq question="Where is my data stored?">
              <p>
                Everything (profile, sessions, answers, settings) is stored in this browser's localStorage under a
                single key. Nothing is uploaded, and there are no passwords. Clearing site data removes it
                permanently.
              </p>
            </Faq>
            <Faq question="Is there cloud sync or accounts?">
              <p>
                No. This deployment is local-only: sign-in just switches the local profile on this device. Multi-device
                sync is not configured and is listed as a known limitation.
              </p>
            </Faq>
          </Section>

          <Section icon={<LifeBuoy size={15} />} title="Known limitations">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-dim">
              <li>No cloud sync, team dashboards or notifications - they do not exist in this build.</li>
              <li>Heuristic fallback evaluations are rule-based and clearly labelled; treat them as guidance only.</li>
              <li>Speech recognition depends on browser support and microphone permission.</li>
              <li>Charts and trends only appear once enough real session history exists - nothing is padded.</li>
              <li>Single light theme; no account recovery (local profile only).</li>
            </ul>
          </Section>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Still stuck?</h2>
            <p className="mt-2 text-sm text-ink-dim">
              Open a GitHub issue with steps to reproduce, your browser and what you expected. Include whether the
              status chip says AI ready or Fallback mode.
            </p>
            <a href={ISSUES_URL} target="_blank" rel="noreferrer" className="btn-primary mt-3 inline-flex">
              <MessageSquareWarning size={15} aria-hidden />
              Report an issue on GitHub
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}
