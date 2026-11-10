// Builds the portal of the brand site (apps/web) for the app, as a single-page
// app in apps/web/build-app, and copies it into www/, which `cap sync ios`
// puts inside the app. The site that Hosting serves (apps/web/build) is never
// touched by this.
//
//   node scripts/bundle.mjs            production: Firebase in the cloud
//   node scripts/bundle.mjs --local    the local emulators, for the Simulator
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const web = join(here, '..', 'web');
const client = join(web, 'build-app', 'client');
const www = join(here, 'www');
const local = process.argv.includes('--local');

const env = { ...process.env, VITE_BASIS_APP: '1', ...(local ? { VITE_BASIS_LOCAL: '1' } : {}) };
execFileSync('pnpm', ['--filter', '@basis/web', 'typecheck'], { stdio: 'inherit' });
rmSync(join(web, 'build-app'), { recursive: true, force: true });
execFileSync('pnpm', ['--filter', '@basis/web', 'exec', 'react-router', 'build'], { stdio: 'inherit', env });
if (!existsSync(join(client, 'index.html'))) throw new Error('The app build has no index.html.');

rmSync(www, { recursive: true, force: true });
cpSync(client, www, { recursive: true });
console.log(`Bundled the portal for the app${local ? ' against the local emulators' : ''} into ${www}`);
