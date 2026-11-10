import { INVITATION_DAYS, MEMBER_PREFIX, addDays, invitationState, leavesAnAdmin, todayIn } from '@basis/shared';
import type { InviteInput, InviteResult, PortalAccountView, PortalInvitationView, PortalUserView, SetUserInput } from './portal';

// SAMPLE DATA for `--mode sample`: two customers already on the portal, one
// with an invitation still open and one that has expired; the other sample
// customers have no account yet. The same rules as the portal functions
// apply: a person belongs to one account, a new invitation replaces an open
// one for the same email, and an account always keeps an active admin.

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type AccountRecord = Omit<Mutable<PortalAccountView>, 'users' | 'invitations'> & { companyId: string; users: Mutable<PortalUserView>[]; invitations: Mutable<PortalInvitationView>[] };

const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
const ago = (days: number, hour = 9) => `${addDays(today(), -days)}T${String(hour).padStart(2, '0')}:30:00Z`;
const ahead = (days: number) => `${addDays(today(), days)}T09:30:00Z`;

const store: { accounts: AccountRecord[]; sequence: number } = {
  sequence: 3,
  accounts: [
    {
      id: 'acct-avelline',
      companyId: 'co-avelline',
      kind: 'trade',
      displayName: 'Maison Avelline',
      memberNumber: `${MEMBER_PREFIX}-26-0001`,
      status: 'active',
      currency: 'EUR',
      createdAt: ago(21),
      users: [
        { uid: 'cu-claire', name: 'Claire Vautrin', email: 'claire@example.invalid', role: 'admin', status: 'active', lastSignInAt: ago(1, 8), createdAt: ago(20), contactName: 'Claire Vautrin' },
        { uid: 'cu-ines', name: 'Inès Moreau', email: 'ines@example.invalid', role: 'buyer', status: 'active', lastSignInAt: ago(6, 15), createdAt: ago(12), contactName: '' },
        { uid: 'cu-paul', name: 'Paul Garnier', email: 'paul@example.invalid', role: 'viewer', status: 'suspended', lastSignInAt: ago(40, 11), createdAt: ago(19), contactName: '' },
      ],
      invitations: [
        { id: 'inv-av-1', email: 'claire@example.invalid', name: 'Claire Vautrin', role: 'admin', expiresAt: addDays(today(), -7) + 'T09:30:00Z', acceptedAt: ago(20), revokedAt: null, createdAt: ago(21) },
        { id: 'inv-av-2', email: 'studio@example.invalid', name: 'Atelier studio', role: 'buyer', expiresAt: ahead(11), acceptedAt: null, revokedAt: null, createdAt: ago(3) },
      ],
    },
    {
      id: 'acct-solenne',
      companyId: 'co-solenne',
      kind: 'trade',
      displayName: 'Atelier Solenne',
      memberNumber: `${MEMBER_PREFIX}-26-0002`,
      status: 'active',
      currency: 'EUR',
      createdAt: ago(30),
      users: [{ uid: 'cu-giulia', name: 'Giulia Ferrante', email: 'giulia@example.invalid', role: 'admin', status: 'active', lastSignInAt: null, createdAt: ago(29), contactName: 'Giulia Ferrante' }],
      invitations: [{ id: 'inv-so-1', email: 'ordini@example.invalid', name: '', role: 'buyer', expiresAt: ago(2), acceptedAt: null, revokedAt: null, createdAt: ago(16) }],
    },
  ],
};

const COMPANY_NAMES: Record<string, string> = { 'co-avelline': 'Maison Avelline', 'co-solenne': 'Atelier Solenne', 'co-novia': 'Novia Estudio', 'co-halden': 'Halden Bridal', 'co-lorena': 'Casa Lorena Atelier' };

const view = (account: AccountRecord): PortalAccountView => {
  const { companyId: _companyId, ...rest } = account;
  return { ...rest, users: account.users.map((user) => ({ ...user })), invitations: [...account.invitations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((invitation) => ({ ...invitation })) };
};

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));

export const samplePortal = {
  access: (companyId: string): PortalAccountView | null => {
    const account = store.accounts.find((item) => item.companyId === companyId);
    return account ? view(account) : null;
  },

  invite: async (input: InviteInput): Promise<InviteResult> => {
    await pause();
    const email = input.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Check the email address.');
    if (email.endsWith('@basis.test') || email.endsWith('@sample.invalid')) throw new Error(`${email} is a BASIS staff login. A customer needs their own email address.`);
    for (const account of store.accounts) {
      if (account.users.some((user) => user.email === email)) throw new Error(account.companyId === input.companyId ? `${email} already has access to this account.` : `${email} already belongs to another BASIS customer account.`);
    }
    let account = store.accounts.find((item) => item.companyId === input.companyId);
    if (!account) {
      const name = COMPANY_NAMES[input.companyId];
      if (!name) throw new Error('Only a customer company can have a portal account. Give it the customer role first.');
      store.sequence += 1;
      account = { id: `acct-${input.companyId}`, companyId: input.companyId, kind: 'trade', displayName: name, memberNumber: `${MEMBER_PREFIX}-26-${String(store.sequence).padStart(4, '0')}`, status: 'active', currency: 'EUR', createdAt: new Date().toISOString(), users: [], invitations: [] };
      store.accounts.push(account);
    }
    // A new invitation replaces any still open for the same person.
    const now = new Date().toISOString();
    for (const invitation of account.invitations) if (invitation.email === email && invitationState(invitation) === 'open') invitation.revokedAt = now;
    const token = `sample-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    const invitation: Mutable<PortalInvitationView> = { id: `inv-${Date.now()}`, email, name: input.name?.trim() ?? '', role: input.role, expiresAt: new Date(Date.now() + INVITATION_DAYS * 86_400_000).toISOString(), acceptedAt: null, revokedAt: null, createdAt: now };
    account.invitations.push(invitation);
    return { token, expiresAt: invitation.expiresAt, invitationId: invitation.id, accountId: account.id, memberNumber: account.memberNumber };
  },

  revoke: async (invitationId: string) => {
    await pause();
    const invitation = store.accounts.flatMap((account) => account.invitations).find((item) => item.id === invitationId);
    if (!invitation) throw new Error('No such invitation.');
    if (invitation.acceptedAt) throw new Error('This invitation was accepted; suspend the person instead.');
    invitation.revokedAt ??= new Date().toISOString();
    return { revoked: true };
  },

  setUser: async (input: SetUserInput) => {
    await pause();
    const account = store.accounts.find((item) => item.users.some((user) => user.uid === input.uid));
    const user = account?.users.find((item) => item.uid === input.uid);
    if (!account || !user) throw new Error('No such person.');
    if (!leavesAnAdmin(account.users, { uid: input.uid, ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}) })) throw new Error('The account needs at least one active admin. Make someone else admin first.');
    if (input.role) user.role = input.role;
    if (input.status) user.status = input.status;
    return { uid: user.uid, role: user.role, status: user.status };
  },
};
