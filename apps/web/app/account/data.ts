import type { FunctionName } from '@basis/shared';
import type * as CustomerSdk from '@basis/shared/dataconnect/customer';
import type { DataConnect, QueryRef } from 'firebase/data-connect';
import { useCallback, useEffect, useState } from 'react';

// Reads go through the `customer` connector, always to the server (the web
// SDK would otherwise answer from its own cache); writes go through the
// portal functions, which repeat every check.

type Sdk = typeof CustomerSdk;

export const LOAD_FAILED = 'This could not be loaded just now. Try again in a moment.';

async function tools() {
  const [{ dataConnect }, { executeQuery }, sdk] = await Promise.all([import('./firebase'), import('firebase/data-connect'), import('@basis/shared/dataconnect/customer')]);
  return { dataConnect, executeQuery, sdk };
}

/** Runs one connector query, fresh from the server. */
export async function read<Data, Vars>(build: (sdk: Sdk, dc: DataConnect) => QueryRef<Data, Vars>): Promise<Data> {
  const { dataConnect, executeQuery, sdk } = await tools();
  try {
    const { data } = await executeQuery(build(sdk, dataConnect), { fetchPolicy: 'SERVER_ONLY' });
    return data;
  } catch (error) {
    // The database's own message is for us, not for the customer.
    console.error(error);
    throw new Error(LOAD_FAILED, { cause: error });
  }
}

export interface Loaded<T> {
  readonly data: T | undefined;
  readonly error: string;
  readonly loading: boolean;
  readonly reload: () => void;
}

export function useRead<T>(load: () => Promise<T>, deps: readonly unknown[]): Loaded<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    load()
      .then((value) => live && setData(value))
      .catch((caught: unknown) => live && setError(caught instanceof Error ? caught.message : 'This could not be loaded.'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { data, error, loading, reload };
}

/** A portal function; the error carries the function's own message. */
export async function call<TInput, TResult>(name: FunctionName, input: TInput): Promise<TResult> {
  const [{ functions }, { httpsCallable }] = await Promise.all([import('./firebase'), import('firebase/functions')]);
  try {
    const result = await httpsCallable<TInput, TResult>(functions, name)(input);
    return result.data;
  } catch (error) {
    const message = typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : 'The request failed.';
    const details = typeof error === 'object' && error && 'details' in error ? (error as { details: unknown }).details : undefined;
    const fields = details && typeof details === 'object' ? Object.values(details as Record<string, string>).join(' ') : '';
    throw new Error(fields ? `${message} ${fields}` : message, { cause: error });
  }
}

/** Opens a document behind sign-in: fetched with the person's token, shown in a new tab. */
export async function openDocument(href: string): Promise<void> {
  const tab = window.open('', '_blank');
  const [{ auth, apiUrl }] = await Promise.all([import('./firebase')]);
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(apiUrl(href), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    tab?.close();
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? 'The document could not be opened.');
  }
  const url = URL.createObjectURL(await response.blob());
  if (tab) tab.location.href = url;
  else window.location.href = url;
}
