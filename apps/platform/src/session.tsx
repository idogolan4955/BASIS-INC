import { ROLE_LABELS, type Role } from '@basis/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { isSample } from './data/source';

// Who is using the platform. In sample mode this is a stand-in whose role can
// be switched to check what each role sees. Real sign-in (Firebase Auth, role
// in the custom claim) replaces the stand-in when authentication is connected.

export interface Session {
  readonly name: string;
  readonly initials: string;
  readonly role: Role;
  /** Present only in sample mode. */
  readonly setRole?: (role: Role) => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('owner');
  const session = useMemo<Session | null>(() => {
    if (!isSample) return null;
    const label = ROLE_LABELS[role];
    return { name: label, initials: label.slice(0, 2).toUpperCase(), role, setRole };
  }, [role]);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session | null {
  return useContext(SessionContext);
}

export function useRequiredSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('No session');
  return session;
}
