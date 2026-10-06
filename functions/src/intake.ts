import { formatBusinessNumber } from '@basis/shared';
import type { Request, Response } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { onCall } from 'firebase-functions/v2/https';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole } from './lib';

// Public intake from the site: validated, rate-limited, stored as an
// Inquiry, raised on the Gateway. No account, no cookie, no tracking.

const inquiryInput = z.object({
  kind: z.enum(['sample_request', 'wholesale', 'contact']),
  name: z.string().trim().min(1).max(160),
  company: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(64).optional(),
  country: z.string().trim().max(120).optional(),
  customerType: z.string().trim().max(80).optional(),
  topic: z.string().trim().max(80).optional(),
  message: z.string().trim().max(4000).optional(),
  products: z.union([z.string(), z.array(z.string())]).optional(),
  shades: z.union([z.string(), z.array(z.string())]).optional(),
  volume: z.string().trim().max(80).optional(),
  address: z.string().trim().max(400).optional(),
  url: z.string().trim().max(200).optional(),
  website: z.string().max(0).optional(),
  context: z.object({ page: z.string().max(400).optional(), referrer: z.string().max(400).nullable().optional(), campaign: z.string().max(200).optional() }).optional(),
});

// A small in-memory window per instance: enough to blunt a script, not a
// substitute for the edge rules that come with production hardening.
const recent = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const LIMIT = 8;
function allowed(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((at) => now - at < WINDOW_MS);
  if (hits.length >= LIMIT) return false;
  hits.push(now);
  recent.set(ip, hits);
  return true;
}

const list = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]).map((entry) => entry.trim()).filter(Boolean).slice(0, 20);

export async function receiveInquiry(request: Request, response: Response): Promise<void> {
  const ip = (request.get('x-forwarded-for') ?? request.ip ?? '').split(',')[0]!.trim() || 'unknown';
  if (!allowed(ip)) {
    response.status(429).json({ error: 'rate_limited', message: 'Too many requests from here for now; try again in a few minutes.' });
    return;
  }
  const parsed = inquiryInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'validation', message: 'Check the name, email and the required fields.' });
    return;
  }
  const input = parsed.data;
  // The honeypot was filled: a bot. Answer as if accepted, store nothing.
  if (input.website) {
    response.json({ reference: formatBusinessNumber({ prefix: 'INQ', year: new Date().getFullYear(), sequence: 0 }) });
    return;
  }
  const year = new Date().getFullYear();
  const { numberSequence } = await graphql<{ numberSequence: { nextValue: number } | null }>(`query ($year: Int!) { numberSequence(key: { prefix: "INQ", year: $year }) { nextValue } }`, { year });
  const sequence = numberSequence?.nextValue ?? 1;
  await graphql(`mutation ($year: Int!, $next: Int!) { numberSequence_upsert(data: { prefix: "INQ", year: $year, nextValue: $next }) }`, { year, next: sequence + 1 });
  const reference = formatBusinessNumber({ prefix: 'INQ', year, sequence });
  const details = { products: list(input.products), shades: list(input.shades), volume: input.volume ?? null, address: input.address ?? null, url: input.url ?? null };
  await graphql(
    `mutation ($reference: String!, $kind: String!, $name: String!, $company: String, $email: String!, $phone: String, $country: String, $customerType: String, $topic: String, $message: String, $details: Any, $context: Any) {
      inquiry_insert(data: { reference: $reference, kind: $kind, name: $name, company: $company, email: $email, phone: $phone, country: $country, customerType: $customerType, topic: $topic, message: $message, details: $details, context: $context, state: "new" }) }`,
    { reference, kind: input.kind, name: input.name, company: input.company ?? null, email: input.email, phone: input.phone ?? null, country: input.country ?? null, customerType: input.customerType ?? null, topic: input.topic ?? null, message: input.message ?? null, details, context: { ...(input.context ?? {}), ip } },
  );
  await emit('inquiry.received', 'inquiry', reference, { kind: input.kind, country: input.country ?? null });
  response.status(201).json({ reference });
}

export const markInquiry = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations', 'sales', 'marketing'], 'Handling inquiries');
  const parsed = z.object({ reference: z.string().min(1), state: z.enum(['new', 'handled']) }).safeParse(request.data);
  if (!parsed.success) throw failure('validation', 'Choose the inquiry.');
  const { inquiries } = await graphql<{ inquiries: { id: string; state: string }[] }>(`query ($reference: String!) { inquiries(where: { reference: { eq: $reference } }, limit: 1) { id state } }`, { reference: parsed.data.reference });
  const inquiry = inquiries[0];
  if (!inquiry) throw failure('not_found', `No inquiry ${parsed.data.reference}.`);
  await graphql(
    parsed.data.state === 'handled'
      ? `mutation ($id: UUID!, $uid: String!) { inquiry_update(id: $id, data: { state: "handled", handledByUid: $uid, handledAt_expr: "request.time" }) }`
      : `mutation ($id: UUID!, $uid: String!) { inquiry_update(id: $id, data: { state: "new", handledByUid: $uid, handledAt: null }) }`,
    { id: inquiry.id, uid: caller.uid },
  );
  await audit(caller.uid, 'inquiry.state', 'inquiry', parsed.data.reference, { state: inquiry.state }, { state: parsed.data.state });
  await emit('inquiry.updated', 'inquiry', parsed.data.reference, { state: parsed.data.state });
  return { reference: parsed.data.reference, state: parsed.data.state };
});
