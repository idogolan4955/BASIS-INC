// Smoke test: talks to the built server over stdio the way an assistant does.
// Usage: BASIS_API_URL=... BASIS_API_TOKEN=... node scripts/smoke.mjs dist/index.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const transport = new StdioClientTransport({ command: 'node', args: [process.argv[2]], env: { ...process.env } });
const client = new Client({ name: 'smoke', version: '0.0.0' });
await client.connect(transport);
const tools = await client.listTools();
console.log('tools:', tools.tools.map((t) => t.name).join(', '));
const attention = await client.callTool({ name: 'basis_attention', arguments: {} });
console.log('attention:', attention.content[0].text.slice(0, 120).replace(/\n/g, ' '));
const ledger = await client.callTool({ name: 'basis_ledger', arguments: { ledger: 'lots', run: 'RUN-26-0001' } });
console.log('ledger:', JSON.parse(ledger.content[0].text).rows.map((r) => `${r.number} ${r.quality}`).join('; '));
const doc = await client.callTool({ name: 'basis_document', arguments: { kind: 'packing-list', number: 'RUN-26-0001' } });
console.log('document:', doc.content[0].text.replace(/\n/g, ' '));
const cmd = await client.callTool({ name: 'basis_command', arguments: { name: 'updateMilestone', input: { runNumber: 'RUN-26-0001', milestoneId: '00000000000000000000000000000000', state: 'done' } } });
console.log('command (expected not found):', (cmd.content[0].text).slice(0, 100));
await client.close();
