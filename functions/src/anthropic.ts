import Anthropic from '@anthropic-ai/sdk';
import { defineSecret, defineString } from 'firebase-functions/params';

// The Anthropic API, for every function that calls Claude (the mail
// classifier, BASIS AI). The key is the owner's secret; a key that is not
// scoped to one workspace must name the workspace on every request, which
// ANTHROPIC_WORKSPACE_ID does (in functions/.env; not a secret).

export const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
export const ANTHROPIC_WORKSPACE_ID = defineString('ANTHROPIC_WORKSPACE_ID', { default: '' });

/** The key, or '' when it is missing or holds the `unset` placeholder. */
export function anthropicKey(): string {
  const value = process.env[ANTHROPIC_API_KEY.name]?.trim() ?? '';
  return value === 'unset' ? '' : value;
}

export function anthropicClient(options: { maxRetries?: number; timeout?: number } = {}): Anthropic {
  const workspace = ANTHROPIC_WORKSPACE_ID.value().trim();
  return new Anthropic({ apiKey: anthropicKey(), ...options, ...(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {}) });
}

/** What to tell a person when the API refuses the key itself. */
export function keyProblem(error: unknown): string | null {
  if (error instanceof Anthropic.AuthenticationError) return 'The Anthropic key was refused. Set a valid ANTHROPIC_API_KEY.';
  if (error instanceof Anthropic.BadRequestError && /workspace/i.test(error.message)) return 'The Anthropic key is not scoped to a workspace. Create a key inside a workspace in the Anthropic Console and set it as ANTHROPIC_API_KEY, or set ANTHROPIC_WORKSPACE_ID in functions/.env.';
  return null;
}
