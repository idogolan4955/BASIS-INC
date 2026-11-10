import { FUNCTIONS_REGION, type FunctionName } from '@basis/shared';

// Callable Cloud Functions. Development talks to the emulator.

export async function callFunction<TInput, TResult>(name: FunctionName, input: TInput): Promise<TResult> {
  const [{ app }, { getFunctions, httpsCallable, connectFunctionsEmulator }] = await Promise.all([import('./firebase'), import('firebase/functions')]);
  const functions = getFunctions(app, FUNCTIONS_REGION);
  if (import.meta.env.DEV) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  const callable = httpsCallable<TInput, TResult>(functions, name);
  try {
    const result = await callable(input);
    return result.data;
  } catch (error) {
    // Surface the function's own message; the generic "INTERNAL" helps nobody.
    const message = typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : 'The request failed.';
    const details = typeof error === 'object' && error && 'details' in error ? (error as { details: unknown }).details : undefined;
    const fields = details && typeof details === 'object' ? Object.values(details as Record<string, string>).join(' ') : '';
    throw new Error(fields ? `${message} ${fields}` : message);
  }
}

/** A callable that streams progress while it works; `onChunk` sees each chunk, the promise the result. */
export async function streamFunction<TInput, TChunk, TResult>(name: FunctionName, input: TInput, onChunk: (chunk: TChunk) => void): Promise<TResult> {
  const [{ app }, { getFunctions, httpsCallable, connectFunctionsEmulator }] = await Promise.all([import('./firebase'), import('firebase/functions')]);
  const functions = getFunctions(app, FUNCTIONS_REGION);
  if (import.meta.env.DEV) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  const callable = httpsCallable<TInput, TResult, TChunk>(functions, name, { timeout: 600_000 });
  try {
    const { stream, data } = await callable.stream(input);
    for await (const chunk of stream) onChunk(chunk);
    return await data;
  } catch (error) {
    const message = typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : 'The request failed.';
    throw new Error(message);
  }
}
