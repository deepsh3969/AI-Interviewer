# Architecture

## Overview

AI Interviewer Pro is a local-first React SPA with serverless-style API handlers that can run on Vercel (or any Node host) and are also hosted locally by `server/dev-server.ts`.

```
src/
  components/   shared UI (ui.tsx, AppShell, AppSidebar, TopBar, ErrorBoundary, charts)
  hooks/        useInterview (session engine), speech + recorder hooks
  lib/          domain logic: types, validation, session machine,
                question bank, heuristic eval, report, analytics,
                storage, api client
  pages/        route-level screens
  state/        store (localStorage-backed) + toasts
  styles/       Tailwind theme tokens and component classes
api/            serverless-style handlers (status, questions, evaluate, transcribe)
server/         shared HTTP helpers, env, AI client, local dev server
tests/          Vitest suite
```

## Session state machine

`READY → STARTED → QUESTION → ANSWERING → SUBMITTED → FEEDBACK → NEXT_QUESTION → COMPLETED`

- `PAUSE` is a flag (`pausedAt` / `pausedMs`) rather than a separate state.
- `ABANDONED` is terminal (user ends early).
- All transitions go through `src/lib/session.ts` (`transition` / `advance`); invalid events return typed errors. The UI never mutates `state` directly.

## Evaluation pipeline

1. Client sends `{ question, answer, config, includeFollowUp }` to `POST /api/evaluate`.
2. Server validates with Zod (`evaluationObjectSchema`), filters rubric dimensions to the question's rubric, de-duplicates dimension ids, and returns `502` on provider failure.
3. Client (`apiClient.evaluateAnswer`) falls back to `heuristicEvaluate` when the request fails (network, timeout, not configured, rate limited) and labels the result `engine: 'heuristic'` with a plain-language note.

Heuristic overall scores are capped at 78 so fallback scores never masquerade as confident AI grades.

## Data & privacy

- Single localStorage key: `ai-interviewer-pro.v1` (see `src/lib/storage.ts`).
- No passwords, no cookies, no server-side user store. `authMode` is always `'local'`.
- Settings offers JSON export and a typed-confirmation full wipe.

## Charts & accessibility

Recharts figures are wrapped with an accessible data-table toggle and `role="img"` labels (`src/components/charts.tsx`). Report and history tables use real `<table>` markup with headers.

## Testing

Vitest runs in a Node environment by default; DOM tests opt in with `/** @vitest-environment jsdom */`. API handler tests mock `fetch` and use unique `x-forwarded-for` IPs to avoid shared rate-limiter state. `resetEnvCache()` in `server/env.ts` isolates environment variables per test.
