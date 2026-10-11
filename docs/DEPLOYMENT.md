# Deployment

## Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New Project** → import the repo. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
3. The functions in `api/` are picked up automatically as serverless endpoints (`/api/status`, `/api/questions`, `/api/evaluate`, `/api/transcribe`).
4. Add environment variables in Project Settings → Environment Variables:
   - `LLM_API_KEY`, `LLM_ENDPOINT` (optional, defaults to OpenAI), `LLM_MODEL`, `LLM_TIMEOUT_MS` (optional)
   - `SPEECH_PROVIDER=deepgram`, `SPEECH_API_KEY`, `SPEECH_ENDPOINT` (optional)
5. Redeploy. Check `GET /api/status` - it returns `{ aiConfigured, speechConfigured, model, version }` without leaking secrets.

Without any AI keys the app still deploys and works: questions come from the built-in bank and scoring uses the labelled rule-based heuristic.

## Any Node host

```bash
npm ci
npm run build        # emits dist/
npm run dev:api      # or run handlers behind your own reverse proxy on :8787
npx vite preview     # serves dist/ (configure a proxy for /api if needed)
```

`server/dev-server.ts` hosts the same handler modules the serverless platform uses, so local behaviour matches production logic.
