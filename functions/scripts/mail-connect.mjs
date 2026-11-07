#!/usr/bin/env node
// Connects the company mailbox to the platform (module 19, docs/MAIL_PLAN.md §2.2).
//
//   pnpm mail:connect --client-id <id>.apps.googleusercontent.com [--address basisinc25@gmail.com]
//
// Opens Google's consent page in the browser for read-only access, receives
// the answer on 127.0.0.1, and writes the refresh token straight into the
// Functions secret GMAIL_REFRESH_TOKEN through `firebase functions:secrets:set`.
// The token is never printed, logged or written to disk. The client secret is
// read from the secret GMAIL_CLIENT_SECRET, which the owner sets first.

import { spawn, execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { promisify } from 'node:util';

const run = promisify(execFile);
const PROJECT = 'basis-inc';
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const clientId = option('client-id', process.env.GMAIL_CLIENT_ID);
const address = option('address', 'basisinc25@gmail.com');

if (!clientId) {
  console.error('Give the OAuth client id: pnpm mail:connect --client-id <id>.apps.googleusercontent.com');
  process.exit(1);
}

async function clientSecret() {
  try {
    const { stdout } = await run('firebase', ['functions:secrets:access', 'GMAIL_CLIENT_SECRET', '--project', PROJECT]);
    const value = stdout.trim();
    if (!value || value === 'unset') throw new Error('empty');
    return value;
  } catch {
    console.error('GMAIL_CLIENT_SECRET is not set. First run: firebase functions:secrets:set GMAIL_CLIENT_SECRET');
    process.exit(1);
  }
}

function setSecret(name, value) {
  return new Promise((resolve, reject) => {
    const child = spawn('firebase', ['functions:secrets:set', name, '--project', PROJECT, '--data-file', '-', '--force'], { stdio: ['pipe', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`firebase exited with ${code}`))));
    child.stdin.end(value);
  });
}

const secret = await clientSecret();
const verifier = randomBytes(48).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(16).toString('hex');

const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const redirectUri = `http://127.0.0.1:${server.address().port}`;

const consent = new URL('https://accounts.google.com/o/oauth2/v2/auth');
consent.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',
  prompt: 'consent',
  login_hint: address,
  code_challenge: challenge,
  code_challenge_method: 'S256',
  state,
}).toString();

console.log(`Opening Google's consent page. Sign in as ${address} and allow read-only access.`);
console.log('If the browser does not open, paste this address into it:');
console.log(consent.toString());
spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [consent.toString()], { stdio: 'ignore', detached: true }).on('error', () => undefined);

const code = await new Promise((resolve, reject) => {
  server.on('request', (request, response) => {
    const url = new URL(request.url ?? '/', redirectUri);
    const page = (text) => {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><title>BASIS</title><p style="font-family:system-ui;margin:3rem">${text}</p>`);
    };
    if (url.searchParams.get('state') !== state) return page('This answer is not for this session. Close the tab.');
    if (url.searchParams.get('error')) {
      page('Access was not granted. Close the tab and run the command again.');
      return reject(new Error(url.searchParams.get('error')));
    }
    page('Done. The mailbox is connected; you can close this tab and return to the terminal.');
    resolve(url.searchParams.get('code'));
  });
});
server.close();

const token = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: clientId, client_secret: secret, code, code_verifier: verifier, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
}).then((response) => response.json());

if (!token.refresh_token) {
  console.error(`Google did not return a long-lived token (${token.error ?? 'no refresh_token'}). Check that the OAuth app is published "In production" and run the command again.`);
  process.exit(1);
}

const account = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${token.access_token}` } }).then((response) => response.json());
if (account.emailAddress?.toLowerCase() !== address.toLowerCase()) {
  console.error(`That consent was given by ${account.emailAddress ?? 'another account'}, not ${address}. Nothing was saved; run the command again signed in as ${address}.`);
  process.exit(1);
}

await setSecret('GMAIL_REFRESH_TOKEN', token.refresh_token);
console.log(`\n${address} is authorised (read-only). The token is in the secret GMAIL_REFRESH_TOKEN.`);
console.log('Next: Settings › Connectors › Mail › Connect, in the platform. Functions deployed before this pick the new secret up on their next deploy.');
