import { FUNCTIONS_REGION, exportFilename, toCsv, type ExportColumn, type ExportFormat, type ExportLedger, type ExportRow } from '@basis/shared';
import { useState } from 'react';

// Generated documents and ledger exports come from the `api` function: in
// development straight from the emulator, in production behind Hosting's
// /api rewrite. The browser fetches with the session token and hands the
// file over, shares it, or opens it.

export type DocumentKind = 'purchase-order' | 'packing-list' | 'roll-labels';

const base = import.meta.env.DEV ? `http://127.0.0.1:5001/basis-inc/${FUNCTIONS_REGION}/api` : '/api';

async function authorised(path: string): Promise<Response> {
  const { auth } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in first.');
  const token = await user.getIdToken();
  const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    let message = 'The request failed.';
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // The body was not JSON; the status is all there is.
    }
    throw new Error(message);
  }
  return response;
}

const filenameOf = (response: Response, fallback: string) => response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? fallback;

export async function fetchDocument(kind: DocumentKind, number: string): Promise<{ blob: Blob; filename: string }> {
  const response = await authorised(`/pdf/${kind}/${encodeURIComponent(number)}`);
  return { blob: await response.blob(), filename: filenameOf(response, `${number}.pdf`) };
}

export async function fetchExport(ledger: ExportLedger, format: ExportFormat, scope: Record<string, string | undefined> = {}): Promise<{ blob: Blob; filename: string }> {
  const query = new URLSearchParams(Object.entries(scope).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  const response = await authorised(`/export/${ledger}.${format}${query ? `?${query}` : ''}`);
  return { blob: await response.blob(), filename: filenameOf(response, exportFilename(ledger, format)) };
}

/** A filed document: Storage paths open through Storage, generator paths through the api. */
export async function fetchFiled(storagePath: string, filename: string): Promise<{ blob: Blob; filename: string }> {
  const generated = storagePath.match(/^generated:\/\/pdf\/([a-z-]+)\/(.+)$/);
  if (generated) return fetchDocument(generated[1] as DocumentKind, generated[2]!);
  const [{ app }, { getStorage, ref, getBlob }] = await Promise.all([import('./firebase'), import('firebase/storage')]);
  const blob = await getBlob(ref(getStorage(app), storagePath));
  return { blob, filename };
}

export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** CSV built in the browser from rows already on screen; what sample mode offers. */
export function saveCsv(ledger: ExportLedger, columns: readonly ExportColumn[], rows: readonly ExportRow[], scope?: string): void {
  saveFile(new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' }), exportFilename(ledger, 'csv', scope));
}

/**
 * Hands a document to another app. On a phone the share sheet takes the file
 * itself, which is how it reaches WhatsApp; elsewhere the file is saved and a
 * WhatsApp message opens with the document named, ready for the file.
 */
export async function shareFile(blob: Blob, filename: string, text: string): Promise<'shared' | 'saved'> {
  const file = new File([blob], filename, { type: blob.type || 'application/pdf' });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text });
      return 'shared';
    } catch (failure) {
      if (failure instanceof DOMException && failure.name === 'AbortError') return 'shared';
    }
  }
  saveFile(blob, filename);
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${filename}`)}`, '_blank', 'noopener');
  return 'saved';
}

/** One busy flag and one error for the document actions a sheet offers. */
export function useDocument() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The document could not be produced.');
    } finally {
      setBusy(null);
    }
  };
  return {
    busy,
    error,
    open: (kind: DocumentKind, number: string) =>
      run(kind, async () => {
        const { blob, filename } = await fetchDocument(kind, number);
        saveFile(blob, filename);
      }),
    share: (kind: DocumentKind, number: string, text: string) =>
      run(`share:${kind}`, async () => {
        const { blob, filename } = await fetchDocument(kind, number);
        await shareFile(blob, filename, text);
      }),
    openFiled: (storagePath: string, filename: string) =>
      run(storagePath, async () => {
        const file = await fetchFiled(storagePath, filename);
        saveFile(file.blob, file.filename);
      }),
    shareFiled: (storagePath: string, filename: string, text: string) =>
      run(`share:${storagePath}`, async () => {
        const file = await fetchFiled(storagePath, filename);
        await shareFile(file.blob, file.filename, text);
      }),
    exportLedger: (ledger: ExportLedger, format: ExportFormat, scope?: Record<string, string | undefined>) =>
      run(`export:${ledger}:${format}`, async () => {
        const { blob, filename } = await fetchExport(ledger, format, scope);
        saveFile(blob, filename);
      }),
  };
}
