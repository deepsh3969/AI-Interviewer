# AI Interviewer Pro

Realistic mock interviews with speech input, structured AI feedback and career-preparation analytics. Local-first: everything you practise stays in your browser unless you configure a server-side AI provider.

**Live:** https://ai-interviewer-pro-drab.vercel.app · **Repo:** https://github.com/deepsh3969/AI-Interviewer

## What it does

- **Configure an interview** - role, experience level, industry, interview type, difficulty, question count and time budget.
- **Answer by voice or text** - browser Web Speech API for on-device dictation; optional remote transcription (Deepgram) when a provider key is configured server-side.
- **Structured evaluation** - every answer is scored on relevance, completeness, clarity, structure, specificity, technical accuracy, evidence and communication. Feedback always says whether it came from AI or the labelled rule-based heuristic.
- **Interview reports** - overall practice score, strongest/weakest answers, recurring weaknesses, recommended next practice, printable to PDF.
- **Skill analytics** - dimension averages, skill levels, frequently missed criteria, score trends (only when there is enough real history).
- **Question library** - curated starter bank (70+ questions across software, data, product, design, marketing, support and general categories), clearly labelled as curated content, never AI output.
- **Local practice mode** - no cloud account, no passwords. Sessions, drafts, saved questions, goals and settings live in `localStorage` under `ai-interviewer-pro.v1`. Export or delete your data any time from Settings.

## Honest limitations

- Feedback is practice guidance only. It is **not** a hiring score and says nothing about personality, confidence or emotion.
- When no AI provider is configured, question generation falls back to the deterministic bank and scoring uses a rule-based heuristic, explicitly labelled as such (heuristic overall scores are capped).
- Remote speech transcription requires a server-side provider key. On-device dictation works best in Chrome/Edge. Audio is never recorded or stored by this app; remote transcription only sends audio when you explicitly press the button and have consented in Settings.
- Trends and insights are only shown with enough evaluated history - the app does not extrapolate.

## Quick start

```bash
npm install
npm run dev        # frontend on http://localhost:5173
npm run dev:api    # local API server on http://localhost:8787 (proxied by /api)
```

Without `npm run dev:api` the UI still works - question generation and evaluation fall back locally and are labelled accordingly.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run dev:api` | Local Node server hosting the serverless-style handlers |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` / `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest suite |

## AI & speech configuration

The API routes read environment variables (server-side only):

| Variable | Purpose |
| --- | --- |
| `LLM_API_KEY` | API key for an OpenAI-compatible chat endpoint |
| `LLM_ENDPOINT` | Chat completions URL (defaults to OpenAI) |
| `LLM_MODEL` | Model name (e.g. `gpt-4o-mini`) |
| `LLM_TIMEOUT_MS` | Upstream timeout (default 25000) |
| `SPEECH_PROVIDER` | Currently `deepgram` |
| `SPEECH_API_KEY` | Deepgram (or compatible) key for `/api/transcribe` |
| `SPEECH_ENDPOINT` | Optional transcription endpoint override |

Deployment targets (Vercel or similar) expose the handlers in `api/` as serverless functions. Locally the same files run under `server/dev-server.ts` on port 8787.

## Stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · React Router 7 · Recharts · Zod · Vitest · ESLint

## License

MIT
