import { HttpsError, onRequest } from 'firebase-functions/v2/https';
import { REGION, httpCallerOf, requireRole } from './lib';
import { renderExport } from './exports';
import { renderPackingList, renderPurchaseOrder, renderRollLabels } from './pdf';
import { EXPORT_FORMATS, isExportLedger, type ExportFormat } from '@basis/shared';

// Plain HTTP, behind Hosting's /api/** rewrite. Public intake, webhooks,
// exports and PDFs join this router as their modules are built.

const COST_ROLES = ['owner', 'operations', 'purchasing', 'finance'] as const;
const GOODS_ROLES = ['owner', 'operations', 'purchasing', 'qc', 'logistics'] as const;

const PDF_ROUTES: Record<string, { roles: readonly (typeof COST_ROLES)[number][] | readonly (typeof GOODS_ROLES)[number][]; action: string; render: (number: string) => Promise<{ pdf: Buffer; filename: string }> }> = {
  'purchase-order': { roles: COST_ROLES, action: 'The purchase order document', render: renderPurchaseOrder },
  'packing-list': { roles: GOODS_ROLES, action: 'The packing list', render: renderPackingList },
  'roll-labels': { roles: GOODS_ROLES, action: 'Roll labels', render: renderRollLabels },
};

const STATUS: Record<string, number> = { 'invalid-argument': 400, 'not-found': 404, 'permission-denied': 403, aborted: 409, 'failed-precondition': 412, unavailable: 503 };

export const api = onRequest({ region: REGION, cors: [/^http:\/\/localhost:\d+$/, /\.web\.app$/, /\.firebaseapp\.com$/], memory: '512MiB' }, async (request, response) => {
  const path = request.path.replace(/^\/api/, '') || '/';

  if (request.method === 'GET' && path === '/health') {
    response.json({ ok: true, service: 'basis', region: REGION, time: new Date().toISOString() });
    return;
  }

  // /pdf/<document>/<number>: rendered on demand from the records, never stored retyped.
  const pdf = path.match(/^\/pdf\/([a-z-]+)\/([A-Z]{2,4}-\d{2}-\d{4})$/);
  if (request.method === 'GET' && pdf) {
    const route = PDF_ROUTES[pdf[1]!];
    if (!route) {
      response.status(404).json({ error: 'not_found', message: `No document kind ${pdf[1]}.` });
      return;
    }
    try {
      const caller = await httpCallerOf(request.get('authorization'));
      requireRole(caller, route.roles, route.action);
      const { pdf: buffer, filename } = await route.render(pdf[2]!);
      response.set('Content-Type', 'application/pdf');
      response.set('Content-Disposition', `inline; filename="${filename}"`);
      response.set('Cache-Control', 'private, no-store');
      response.send(buffer);
    } catch (error) {
      if (error instanceof HttpsError) {
        response.status(STATUS[error.code] ?? 500).json({ error: error.code, message: error.message, details: error.details ?? null });
        return;
      }
      console.error('pdf', error);
      response.status(500).json({ error: 'internal', message: 'The document could not be rendered.' });
    }
    return;
  }

  // /export/<ledger>.<csv|xlsx>?run=&po=&lot=: a ledger as a file, cost columns for cost roles only.
  const exported = path.match(/^\/export\/([a-z-]+)\.(csv|xlsx)$/);
  if (request.method === 'GET' && exported) {
    const ledger = exported[1]!;
    const format = exported[2] as ExportFormat;
    if (!isExportLedger(ledger) || !EXPORT_FORMATS.includes(format)) {
      response.status(404).json({ error: 'not_found', message: `No export ${ledger}.${format}.` });
      return;
    }
    try {
      const caller = await httpCallerOf(request.get('authorization'));
      const scope = Object.fromEntries((['run', 'po', 'lot'] as const).map((key) => [key, typeof request.query[key] === 'string' && /^[A-Z]{2,4}-\d{2}-\d{4}$/.test(request.query[key] as string) ? (request.query[key] as string) : undefined]));
      const { body, filename, contentType } = await renderExport(ledger, format, caller, scope);
      response.set('Content-Type', contentType);
      response.set('Content-Disposition', `attachment; filename="${filename}"`);
      response.set('Cache-Control', 'private, no-store');
      response.send(body);
    } catch (error) {
      if (error instanceof HttpsError) {
        response.status(STATUS[error.code] ?? 500).json({ error: error.code, message: error.message, details: error.details ?? null });
        return;
      }
      console.error('export', error);
      response.status(500).json({ error: 'internal', message: 'The export could not be produced.' });
    }
    return;
  }

  response.status(404).json({ error: 'not_found', message: `No endpoint at ${path}.` });
});
