import type { CustomerMeData } from '@basis/shared/dataconnect/customer';
import type { CustomerUserRole } from '@basis/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { IN_APP } from '../native/platform';
import { useLocale } from './i18n';

// Who is signed in to the portal. A customer login carries the claim
// role = customer and has an active place in an account; a staff login on
// the portal is told so and offered the platform instead.

export type Me = CustomerMeData['customerUsers'][number];

export type Session =
  | { readonly status: 'loading' }
  | { readonly status: 'signed_out' }
  | { readonly status: 'not_customer'; readonly email: string }
  | { readonly status: 'inactive'; readonly email: string }
  /** Signed in, but BASIS could not be asked who they are (no connection, or the service is down). */
  | { readonly status: 'unreachable'; readonly email: string }
  | { readonly status: 'ready'; readonly me: Me; readonly role: CustomerUserRole };

const Context = createContext<{ session: Session; refresh: () => void }>({ session: { status: 'loading' }, refresh: () => undefined });

export function PortalSession({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let stop = () => undefined as void;
    let cancelled = false;
    void (async () => {
      const [{ auth, dataConnect, functions }, { onAuthStateChanged }, { executeQuery }, sdk, { httpsCallable }] = await Promise.all([
        import('./firebase'),
        import('firebase/auth'),
        import('firebase/data-connect'),
        import('@basis/shared/dataconnect/customer'),
        import('firebase/functions'),
      ]);
      stop = onAuthStateChanged(auth, async (user) => {
        if (cancelled) return;
        if (!user) {
          setSession({ status: 'signed_out' });
          return;
        }
        let token: Awaited<ReturnType<typeof user.getIdTokenResult>>;
        try {
          token = await user.getIdTokenResult();
        } catch {
          // An expired token cannot be renewed without a connection.
          setSession({ status: 'unreachable', email: user.email ?? '' });
          return;
        }
        if (token.claims['role'] !== 'customer') {
          setSession({ status: 'not_customer', email: user.email ?? '' });
          return;
        }
        try {
          const { data } = await executeQuery(sdk.customerMeRef(dataConnect), { fetchPolicy: 'SERVER_ONLY' });
          const me = data.customerUsers[0];
          if (!me || me.status !== 'active' || me.account.status !== 'active') {
            setSession({ status: 'inactive', email: user.email ?? '' });
            return;
          }
          setSession({ status: 'ready', me, role: me.role as unknown as CustomerUserRole });
          // Once a browser session: the last sign-in staff see on the account.
          const key = `basis.portal.seen.${user.uid}`;
          try {
            if (!window.sessionStorage.getItem(key)) {
              window.sessionStorage.setItem(key, '1');
              void httpsCallable(functions, 'customerSignedIn')({});
            }
          } catch {
            // Without storage it is recorded on every load, which is harmless.
          }
        } catch {
          // The read itself failed: that says nothing about the account, only about the way to it.
          setSession({ status: 'unreachable', email: user.email ?? '' });
        }
      });
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [tick]);
  // In the app, a signed-in person's phone is registered for their notifications, in their language.
  const { locale } = useLocale();
  const ready = session.status === 'ready';
  useEffect(() => {
    if (!IN_APP || !ready) return;
    void import('../native/push').then(({ syncPush }) => syncPush(locale)).catch(() => undefined);
  }, [ready, locale]);
  return <Context.Provider value={{ session, refresh: () => setTick((value) => value + 1) }}>{children}</Context.Provider>;
}

export const useSession = () => useContext(Context);

export function useMe(): { me: Me; role: CustomerUserRole } {
  const { session } = useSession();
  if (session.status !== 'ready') throw new Error('The account page rendered without a signed-in customer.');
  return { me: session.me, role: session.role };
}

export async function signOut(): Promise<void> {
  if (IN_APP) await import('../native/push').then(({ releasePush }) => releasePush());
  const [{ auth }, { signOut: out }] = await Promise.all([import('./firebase'), import('firebase/auth')]);
  await out(auth);
}
