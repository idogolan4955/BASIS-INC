import { onRequest } from 'firebase-functions/v2/https';
import { REGION } from './lib';

// Plain HTTP, behind Hosting's /api/** rewrite. Public intake, webhooks,
// exports and PDFs join this router as their modules are built.

export const api = onRequest({ region: REGION }, (request, response) => {
  const path = request.path.replace(/^\/api/, '') || '/';

  if (request.method === 'GET' && path === '/health') {
    response.json({ ok: true, service: 'basis', region: REGION, time: new Date().toISOString() });
    return;
  }

  response.status(404).json({ error: 'not_found', message: `No endpoint at ${path}.` });
});
