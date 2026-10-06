import { ASSISTANT_COMMANDS, EXPORT_LEDGERS, LEDGERS } from '@basis/shared';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

// The BASIS assistant: an MCP server that lets an AI assistant read the
// platform and run its commands with an API token issued in Settings. It
// talks only to the platform's /api; every role check runs there.

const API_URL = (process.env['BASIS_API_URL'] ?? 'https://basis-inc-hq.web.app/api').replace(/\/$/, '');
const TOKEN = process.env['BASIS_API_TOKEN'];
if (!TOKEN) {
  console.error('BASIS_API_TOKEN is not set. Issue a token in Settings › Connectors › Assistant.');
  process.exit(1);
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string; details?: unknown };
    throw new Error(`${response.status}: ${body.message ?? response.statusText}${body.details ? ` ${JSON.stringify(body.details)}` : ''}`);
  }
  return response;
}

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });

const server = new McpServer({ name: 'basis-assistant', version: '0.1.0' });

server.registerTool(
  'basis_attention',
  { title: 'What needs attention', description: 'Open alerts and open tasks on the BASIS Gateway: delays, payments due, quality holds, missing data.', inputSchema: {} },
  async () => text(await (await api('/attention')).json()),
);

server.registerTool(
  'basis_ledger',
  {
    title: 'Read a ledger',
    description: `Rows of a BASIS ledger as JSON. Ledgers: ${EXPORT_LEDGERS.join(', ')}. Scope narrows to one record: run (RUN-26-0001), po (PO-26-0001) or lot (LOT-26-0001) where the ledger allows it: ${EXPORT_LEDGERS.map((key) => `${key} [${LEDGERS[key].scopes.join(', ') || 'none'}]`).join('; ')}.`,
    inputSchema: { ledger: z.enum(EXPORT_LEDGERS), run: z.string().optional(), po: z.string().optional(), lot: z.string().optional() },
  },
  async ({ ledger, run, po, lot }) => {
    const query = new URLSearchParams(Object.entries({ run, po, lot }).filter((entry): entry is [string, string] => Boolean(entry[1])));
    return text(await (await api(`/export/${ledger}.json${query.size ? `?${query}` : ''}`)).json());
  },
);

server.registerTool(
  'basis_document',
  {
    title: 'Get a document',
    description: 'Renders a BASIS document as PDF and saves it locally: purchase-order (PO number), packing-list (run number) or roll-labels (lot number). Returns the file path.',
    inputSchema: { kind: z.enum(['purchase-order', 'packing-list', 'roll-labels']), number: z.string().regex(/^[A-Z]{2,4}-\d{2}-\d{4}$/) },
  },
  async ({ kind, number }) => {
    const response = await api(`/pdf/${kind}/${number}`);
    const filename = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? `${number}.pdf`;
    const dir = join(tmpdir(), 'basis-assistant');
    await mkdir(dir, { recursive: true });
    const path = join(dir, filename);
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
    return text({ path, filename, bytes: (await (await import('node:fs/promises')).stat(path)).size });
  },
);

server.registerTool(
  'basis_command',
  {
    title: 'Run a command',
    description: `Runs a BASIS command on the owner's behalf, with the token's role. Commands: ${ASSISTANT_COMMANDS.join(', ')}. Inputs follow the platform's functions, e.g. issuePurchaseOrder {number}, updateMilestone {runNumber, milestoneId, state, forecastEnd?, delayReason?, note?}, recordLot {runNumber, skuCode, rolls:[{measuredLength}]}, packHandlingUnit {runNumber, kind, rollNumbers}, setLotQuality {number, state, note}, fileGeneratedDocument {kind, number}, sendDocumentEmail {kind, number, to, subject, message?}. Quantities and prices are fixed-point strings (metres × 1000, prices × 10000).`,
    inputSchema: { name: z.enum(ASSISTANT_COMMANDS), input: z.record(z.string(), z.unknown()).default({}) },
  },
  async ({ name, input }) => text(await (await api(`/commands/${name}`, { method: 'POST', body: JSON.stringify(input) })).json()),
);

await server.connect(new StdioServerTransport());
