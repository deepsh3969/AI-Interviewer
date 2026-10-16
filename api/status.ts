import { aiConfig, speechConfig } from '../server/env.js';
import { json, methodNotAllowed, type ApiHandler } from '../server/http.js';

const VERSION = '1.0.0';

const handler: ApiHandler = (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const ai = aiConfig();
  const speech = speechConfig();
  return json(res, 200, {
    ok: true,
    version: VERSION,
    aiConfigured: ai.configured,
    model: ai.configured ? ai.model : null,
    speechConfigured: speech.configured,
    speechProvider: speech.provider,
  });
};

export default handler;
