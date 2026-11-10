import { FUNCTION_NAMES, type CustomerUserRole } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// The customer portal as staff see it on a customer's page: the company's
// portal account, its people and the invitations sent. Read through the
// platform connector; invitations, roles and suspensions go through the
// portal functions, which keep the rules (one person, one account; a staff
// email never becomes a customer; an account always keeps an active admin).

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('../lib/connector').then((m) => m.platform())]);
  return { dc: dataConnect, sdk };
}
const sample = async () => (await import('./sample-portal')).samplePortal;

export type PortalUserStatus = 'invited' | 'active' | 'suspended';

export interface PortalUserView {
  readonly uid: string;
  readonly name: string;
  readonly email: string;
  readonly role: CustomerUserRole;
  readonly status: PortalUserStatus;
  readonly lastSignInAt: string | null;
  readonly createdAt: string;
  readonly contactName: string;
}

export interface PortalInvitationView {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: CustomerUserRole;
  readonly expiresAt: string;
  readonly acceptedAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
}

export interface PortalAccountView {
  readonly id: string;
  readonly kind: 'trade' | 'consumer';
  readonly displayName: string;
  readonly memberNumber: string;
  readonly status: 'active' | 'suspended' | 'closed';
  readonly currency: string;
  readonly createdAt: string;
  readonly users: readonly PortalUserView[];
  readonly invitations: readonly PortalInvitationView[];
}

export interface InviteInput {
  readonly companyId: string;
  readonly email: string;
  readonly name?: string;
  readonly contactId?: string;
  readonly role: CustomerUserRole;
}

/** The token is shown once: only its hash is kept. */
export interface InviteResult {
  readonly token: string;
  readonly expiresAt: string;
  readonly invitationId: string;
  readonly accountId: string;
  readonly memberNumber: string;
}

export interface SetUserInput {
  readonly uid: string;
  readonly role?: CustomerUserRole;
  readonly status?: 'active' | 'suspended';
}

/** The customer company's portal account, or null before anyone from it was invited. */
export function useCustomerAccess(companyId: string) {
  return useQuery({
    queryKey: ['portal', 'access', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<PortalAccountView | null> => {
      if (isSample) return (await sample()).access(companyId);
      const { dc, sdk } = await live();
      const { data } = await sdk.listCustomerAccess(dc, { companyId });
      const row = data.customerAccounts[0];
      if (!row) return null;
      return {
        id: row.id,
        kind: row.kind,
        displayName: row.displayName,
        memberNumber: row.memberNumber,
        status: row.status,
        currency: row.currency,
        createdAt: row.createdAt,
        users: row.users.map((user) => ({ uid: user.uid, name: user.name, email: user.email, role: user.role, status: user.status, lastSignInAt: user.lastSignInAt ?? null, createdAt: user.createdAt, contactName: user.contact?.name ?? '' })),
        invitations: row.invitations.map((invitation) => ({ id: invitation.id, email: invitation.email, name: invitation.name ?? '', role: invitation.role, expiresAt: invitation.expiresAt, acceptedAt: invitation.acceptedAt ?? null, revokedAt: invitation.revokedAt ?? null, createdAt: invitation.createdAt })),
      };
    },
  });
}

function usePortalMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      // The functions also write the customer's timeline.
      await Promise.all([client.invalidateQueries({ queryKey: ['portal'] }), client.invalidateQueries({ queryKey: ['timeline'] })]);
    },
  });
}

export function useInviteCustomerUser() {
  return usePortalMutation(async (input: InviteInput): Promise<InviteResult> => {
    if (isSample) return (await sample()).invite(input);
    return callFunction<InviteInput, InviteResult>(FUNCTION_NAMES.inviteCustomerUser, input);
  });
}

export function useRevokeCustomerInvitation() {
  return usePortalMutation(async (invitationId: string) => {
    if (isSample) return (await sample()).revoke(invitationId);
    return callFunction<{ invitationId: string }, { revoked: boolean }>(FUNCTION_NAMES.revokeCustomerInvitation, { invitationId });
  });
}

export function useSetCustomerUser() {
  return usePortalMutation(async (input: SetUserInput) => {
    if (isSample) return (await sample()).setUser(input);
    return callFunction<SetUserInput, { uid: string; role: CustomerUserRole; status: string }>(FUNCTION_NAMES.setCustomerUser, input);
  });
}
