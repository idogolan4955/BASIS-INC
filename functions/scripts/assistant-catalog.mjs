// Builds the catalogue BASIS AI works from: every query and mutation of the
// platform connector, and every callable function with its input schema and
// the roles it admits, read from the sources so it can never drift from them.
// Run by `pnpm --filter @basis/functions build`; the output is committed so a
// change shows in review.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, '..', 'src', 'assistant', 'catalog.json');

// ---------------------------------------------------------------- connector operations

const connectorDir = join(root, 'dataconnect', 'platform');
const operations = [];
for (const file of readdirSync(connectorDir).filter((name) => name.endsWith('.gql')).sort()) {
  const source = readFileSync(join(connectorDir, file), 'utf8');
  const pattern = /((?:^#.*\n)*)^(query|mutation)\s+(\w+)\s*(\([\s\S]*?\))?\s*@auth\(([\s\S]*?)\)\s*\{/gm;
  for (const match of source.matchAll(pattern)) {
    const [, comments, kind, name, variables, auth] = match;
    const note = comments.split('\n').map((line) => line.replace(/^#\s?/, '').trim()).filter(Boolean).join(' ');
    operations.push({
      kind,
      name,
      module: file.replace(/\.gql$/, ''),
      variables: (variables ?? '').replace(/\s+/g, ' ').replace(/^\(|\)$/g, '').trim(),
      auth: authOf(auth),
      ...(note ? { note } : {}),
    });
  }
}

function authOf(expression) {
  const level = expression.match(/level:\s*(\w+)/)?.[1];
  if (level) return level === 'USER' ? 'any signed-in role' : level.toLowerCase();
  const roles = [...expression.matchAll(/role\s*==\s*'(\w+)'/g)].map((m) => m[1]);
  const listed = expression.match(/role\s+in\s+\[([^\]]+)\]/)?.[1];
  if (listed) roles.push(...listed.split(',').map((item) => item.trim().replace(/['"]/g, '')));
  return roles.length ? [...new Set(roles)].join(', ') : expression.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------- callable functions

const functionsDir = join(here, '..', 'src');
const files = [...readdirSync(functionsDir).filter((name) => name.endsWith('.ts')).map((name) => join(functionsDir, name)), ...readdirSync(join(functionsDir, 'mail')).filter((name) => name.endsWith('.ts')).map((name) => join(functionsDir, 'mail', name))];

// Balanced text from an opening bracket.
function balanced(source, start) {
  const open = source[start];
  const close = open === '(' ? ')' : open === '{' ? '}' : ']';
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "'" || char === '"' || char === '`') {
      const end = source.indexOf(char, index + 1);
      index = end < 0 ? source.length : end;
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

const commands = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  // Schema constants of the file: `const name = z.…` and `const name = otherSchema.extend(…)`.
  const schemas = new Map();
  for (const match of source.matchAll(/^(?:export\s+)?const\s+(\w+)\s*=\s*((?:z\.|\w+\.(?:extend|merge|pick|omit|partial)\())/gm)) {
    const start = match.index + match[0].length - match[2].length;
    const end = source.indexOf(';\n', start);
    schemas.set(match[1], source.slice(start, end < 0 ? undefined : end).trim());
  }
  // Role lists: `const NAME = ['owner', …] as const` in the file.
  const roleLists = new Map();
  for (const match of source.matchAll(/^(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*(\[[^\]]*\])/gm)) {
    const roles = [...match[2].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    if (roles.length) roleLists.set(match[1], roles);
  }
  for (const match of source.matchAll(/^export const (\w+) = onCall(?:<[^>]*>)?\(/gm)) {
    const name = match[1];
    const body = balanced(source, match.index + match[0].length - 1);
    const roleCall = body.match(/requireRole\(\s*\w+\s*,\s*(\[[^\]]*\]|\w+)\s*,\s*['`"]([^'`"]+)['`"]/);
    let roles = 'any signed-in role';
    if (roleCall) {
      const list = roleCall[1].startsWith('[') ? [...roleCall[1].matchAll(/'(\w+)'/g)].map((m) => m[1]) : roleLists.get(roleCall[1]);
      roles = list?.length ? list.join(', ') : roleCall[1];
    }
    // The input: `<schema>.parse(request.data)`, `.safeParse(…)` or `parse(<schema>, request.data)`,
    // the schema possibly extended inline. Read backwards from the call to the expression's start.
    let expression = '';
    const call = body.match(/\.(?:safeParse|parse)\(request\.data(?: \?\? \{\})?\)/);
    if (call) {
      let index = call.index - 1;
      let depth = 0;
      while (index >= 0) {
        const char = body[index];
        if (')]}'.includes(char)) depth += 1;
        else if ('([{'.includes(char)) {
          if (depth === 0) break;
          depth -= 1;
        } else if (depth === 0 && !/[\w.$]/.test(char)) break;
        index -= 1;
      }
      expression = body.slice(index + 1, call.index).trim();
    } else {
      expression = body.match(/\bparse\(\s*(\w+)\s*,\s*request\.data/)?.[1] ?? '';
    }
    let input = '';
    if (expression) {
      const used = new Set();
      const collect = (text) => {
        for (const [key, value] of schemas) {
          if (!used.has(key) && new RegExp(`\\b${key}\\b`).test(text)) {
            used.add(key);
            collect(value);
          }
        }
      };
      collect(expression);
      const definitions = [...used].reverse().map((key) => `const ${key} = ${schemas.get(key)};`);
      input = [...definitions, `input: ${expression}`].join('\n');
    }
    commands.push({ name, module: file.slice(functionsDir.length + 1).replace(/\.ts$/, ''), action: roleCall?.[2] ?? '', roles, input });
  }
}

operations.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
commands.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
const next = `${JSON.stringify({ operations, commands }, null, 1)}\n`;
let previous = '';
try {
  previous = readFileSync(out, 'utf8');
} catch {}
if (previous !== next) writeFileSync(out, next);
console.log(`assistant catalog: ${operations.filter((o) => o.kind === 'query').length} queries, ${operations.filter((o) => o.kind === 'mutation').length} mutations, ${commands.length} commands${previous === next ? ' (unchanged)' : ''}`);
