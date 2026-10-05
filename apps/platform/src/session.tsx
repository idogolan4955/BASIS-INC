import { ROLE_LABELS, isRole, type Role } from '@basis/shared';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSample } from './data/source';

// Who is using the platform. Live mode reads Firebase Auth and the role from
// the custom claim. Sample mode provides a stand-in whose role can be switched
// to check what each role sees.

export interface Session {
  readonly uid: string;
  readonly name: string;
  readonly email: string;
  readonly initials: string;
  readonly role: Role;
  readonly signOut: () => Promise<void>;
  /** Present only in sample mode. */
  readonly setRole?: (role: Role) => void;
}

export type SessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'signed_out' }
  | { readonly status: 'no_role'; readonly email: string; readonly signOut: () => Promise<void> }
  | { readonly status: 'ready'; readonly session: Session };

const SessionContext = createContext<SessionState>({ status: 'loading' });

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return `${first}${last}`.toUpperCase();
}

function useSampleSession(): SessionState {
  const [role, setRole] = useState<Role>('owner');
  return useMemo(() => {
    const label = ROLE_LABELS[role];
    return {
      status: 'ready',
      session: {
        uid: `sample-${role}`,
        name: label,
        email: `${role}@sample.invalid`,
        initials: initialsOf(label),
        role,
        signOut: async () => undefined,
        setRole,
      },
    };
  }, [role]);
}

function useLiveSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    void (async () => {
      const [{ auth }, { onAuthStateChanged, signOut }] = await Promise.all([import('./lib/firebase'), import('firebase/auth')]);
      if (cancelled) return;
      const leave = () => signOut(auth);
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          setState({ status: 'signed_out' });
          return;
        }
        const token = await user.getIdTokenResult();
        const role = token.claims['role'];
        const email = user.email ?? '';
        if (!isRole(role)) {
          setState({ status: 'no_role', email, signOut: leave });
          return;
        }
        const name = user.displayName?.trim() || email;
        setState({
          status: 'ready',
          session: { uid: user.uid, name, email, initials: initialsOf(name), role, signOut: leave },
        });
      });
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}

function SampleProvider({ children }: { children: ReactNode }) {
  const state = useSampleSession();
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

function LiveProvider({ children }: { children: ReactNode }) {
  const state = useLiveSession();
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  return isSample ? <SampleProvider>{children}</SampleProvider> : <LiveProvider>{children}</LiveProvider>;
}

export function useSessionState(): SessionState {
  return useContext(SessionContext);
}

export function useRequiredSession(): Session {
  const state = useContext(SessionContext);
  if (state.status !== 'ready') throw new Error('No session');
  return state.session;
}
