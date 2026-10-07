import { HttpsError, onRequest } from 'firebase-functions/v2/https';
import { REGION, httpCallerOf, requireRole } from './lib';
import { exportRows, renderExport } from './exports';
import { receiveInquiry } from './intake';
import { renderPackingList, renderPurchaseOrder, renderRollLabels, renderShipmentPackingList } from './pdf';
import { EXPORT_FORMATS, isAssistantCommand, isExportLedger, type ExportFormat } from '@basis/shared';
import type { CallableFunction, CallableRequest } from 'firebase-functions/v2/https';
import { graphql } from './lib';

// Plain HTTP, behind Hosting's /api/** rewrite. Public intake, webhooks,
// exports and PDFs join this router as their modules are built.

const COST_ROLES = ['owner', 'operations', 'purchasing', 'finance'] as const;
const GOODS_ROLES = ['owner', 'operations', 'purchasing', 'qc', 'logistics'] as const;

const PDF_ROUTES: Record<string, { roles: readonly (typeof COST_ROLES)[number][] | readonly (typeof GOODS_ROLES)[number][]; action: string; render: (number: string) => Promise<{ pdf: Buffer; filename: string }> }> = {
  'purchase-order': { roles: COST_ROLES, action: 'The purchase order document', render: renderPurchaseOrder },
  'packing-list': { roles: GOODS_ROLES, action: 'The packing list', render: renderPackingList },
  'roll-labels': { roles: GOODS_ROLES, action: 'Roll labels', render: renderRollLabels },
  'shipment-packing-list': { roles: GOODS_ROLES, action: 'The shipment packing list', render: renderShipmentPackingList },
};

const STATUS: Record<string, number> = { 'invalid-argument': 400, 'not-found': 404, 'permission-denied': 403, aborted: 409, 'failed-precondition': 412, unavailable: 503 };

export const api = onRequest({ region: REGION, cors: [/^http:\/\/localhost:\d+$/, /\.web\.app$/, /\.firebaseapp\.com$/], memory: '512MiB' }, async (request, response) => {
  const path = request.path.replace(/^\/api/, '') || '/';

  // Public intake from the site. Sample requests share the endpoint with a kind.
  if (request.method === 'POST' && (path === '/inquiries' || path === '/sample-requests')) {
    await receiveInquiry(request, response);
    return;
  }

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

  // /export/<ledger>.<csv|xlsx|json>?run=&po=&lot=: a ledger as a file, cost columns for cost roles only.
  const exported = path.match(/^\/export\/([a-z-]+)\.(csv|xlsx|json)$/);
  if (request.method === 'GET' && exported) {
    const ledger = exported[1]!;
    const format = exported[2] as ExportFormat | 'json';
    if (!isExportLedger(ledger) || (format !== 'json' && !EXPORT_FORMATS.includes(format))) {
      response.status(404).json({ error: 'not_found', message: `No export ${ledger}.${format}.` });
      return;
    }
    try {
      const caller = await httpCallerOf(request.get('authorization'));
      const scope = Object.fromEntries((['run', 'po', 'lot'] as const).map((key) => [key, typeof request.query[key] === 'string' && /^[A-Z]{2,4}-\d{2}-\d{4}$/.test(request.query[key] as string) ? (request.query[key] as string) : undefined]));
      if (format === 'json') {
        const { rows, columns } = await exportRows(ledger, caller, scope);
        response.set('Cache-Control', 'private, no-store');
        response.json({ ledger, columns, rows });
        return;
      }
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

  // /attention: what the Gateway shows, for a machine.
  if (request.method === 'GET' && path === '/attention') {
    try {
      await httpCallerOf(request.get('authorization'));
      const data = await graphql<{ alerts: unknown[]; tasks: unknown[] }>(
        `query { alerts(where: { state: { in: [open, acknowledged] } }, orderBy: { lastSeen: DESC }, limit: 200) { id ruleKey entityType entityId severity state title detail ownerRole firstSeen lastSeen }
                 tasks(where: { state: { eq: open } }, orderBy: { dueOn: ASC }, limit: 200) { id title details dueOn entityType entityId assignee { name } } }`,
      );
      response.set('Cache-Control', 'private, no-store');
      response.json(data);
    } catch (error) {
      const status = error instanceof HttpsError ? (STATUS[error.code] ?? 500) : 500;
      response.status(status).json({ error: error instanceof HttpsError ? error.code : 'internal', message: error instanceof Error ? error.message : 'Failed.' });
    }
    return;
  }

  // /commands/<name>: the callable commands, for a token or a session. The
  // same function runs, with the same role checks; only the transport differs.
  const command = path.match(/^\/commands\/([A-Za-z]+)$/);
  if (request.method === 'POST' && command) {
    const name = command[1]!;
    if (!isAssistantCommand(name)) {
      response.status(404).json({ error: 'not_found', message: `No command ${name}.` });
      return;
    }
    try {
      const caller = await httpCallerOf(request.get('authorization'));
      const functions = (await import('./index')) as unknown as Record<string, CallableFunction<unknown, unknown>>;
      const callable = functions[name]!;
      const synthetic = { data: request.body, auth: { uid: caller.uid, token: { role: caller.role, ...(caller.email ? { email: caller.email } : {}) } }, rawRequest: request, acceptsStreaming: false } as unknown as CallableRequest<unknown>;
      const result = await callable.run(synthetic);
      if (caller.via) console.info('command', name, 'by', caller.uid, 'via', caller.via);
      response.set('Cache-Control', 'private, no-store');
      response.json({ result });
    } catch (error) {
      if (error instanceof HttpsError) {
        response.status(STATUS[error.code] ?? 500).json({ error: error.code, message: error.message, details: error.details ?? null });
        return;
      }
      console.error('command', name, error);
      response.status(500).json({ error: 'internal', message: 'The command failed.' });
    }
    return;
  }

  response.status(404).json({ error: 'not_found', message: `No endpoint at ${path}.` });
});
