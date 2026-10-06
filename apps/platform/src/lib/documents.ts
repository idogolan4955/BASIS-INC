import { FUNCTIONS_REGION } from '@basis/shared';
import { useState } from 'react';

// Generated documents (PDF) come from the `api` function: in development
// straight from the emulator, in production behind Hosting's /api rewrite.
// The browser fetches with the session token and hands the file over.

export type DocumentKind = 'purchase-order' | 'packing-list' | 'roll-labels';

const base = import.meta.env.DEV ? `http://127.0.0.1:5001/basis-inc/${FUNCTIONS_REGION}/api` : '/api';

export async function fetchDocument(kind: DocumentKind, number: string): Promise<{ blob: Blob; filename: string }> {
  const { auth } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in first.');
  const token = await user.getIdToken();
  const response = await fetch(`${base}/pdf/${kind}/${encodeURIComponent(number)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    let message = 'The document could not be generated.';
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // The body was not JSON; the status is all there is.
    }
    throw new Error(message);
  }
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${number}.pdf`;
  return { blob: await response.blob(), filename };
}

/** Fetches a document and opens it in a new tab, falling back to a download when the tab is blocked. */
export function useDocument() {
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = async (kind: DocumentKind, number: string) => {
    setBusy(kind);
    setError(null);
    try {
      const { blob, filename } = await fetchDocument(kind, number);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The document could not be generated.');
    } finally {
      setBusy(null);
    }
  };
  return { open, busy, error };
}
