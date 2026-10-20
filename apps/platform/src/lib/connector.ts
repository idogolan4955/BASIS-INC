import { executeQuery, type QueryRef } from 'firebase/data-connect';

// The platform connector, read from the server every time. The Data Connect
// web SDK (0.7) answers `executeQuery` from its own cache by default, so a
// list read again after a change would come back unchanged. Here TanStack
// Query is the only cache: it is invalidated on every change, and each query
// goes to the server. Mutations pass through untouched.

type Platform = typeof import('@basis/shared/dataconnect/platform');
type AnyFunction = (...args: unknown[]) => unknown;

const SERVER_ONLY = { fetchPolicy: 'SERVER_ONLY' as const };

let cached: Promise<Platform> | null = null;

export function platform(): Promise<Platform> {
  cached ??= import('@basis/shared/dataconnect/platform').then((sdk) => {
    const wrapped = new Map<string | symbol, AnyFunction>();
    return new Proxy(sdk, {
      get(target, key) {
        const value = Reflect.get(target, key) as unknown;
        const ref = Reflect.get(target, `${String(key)}Ref`) as AnyFunction | undefined;
        if (typeof value !== 'function' || typeof ref !== 'function') return value;
        let fn = wrapped.get(key);
        if (!fn) {
          fn = (...args: unknown[]) => {
            // The Ref builder names the operation's kind without running it.
            let built: unknown;
            try {
              built = ref(...args);
            } catch {
              return (value as AnyFunction)(...args);
            }
            if (built && typeof built === 'object' && (built as { refType?: string }).refType === 'query') return executeQuery(built as QueryRef<unknown, unknown>, SERVER_ONLY);
            return (value as AnyFunction)(...args);
          };
          wrapped.set(key, fn);
        }
        return fn;
      },
    }) as Platform;
  });
  return cached;
}
