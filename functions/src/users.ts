import { ROLES, type Role } from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, auth, callerOf, emit, failure, graphql, requireRole } from './lib';

// Accounts exist by invitation only. An owner creates the account, the role
// goes into the custom claim (what @auth checks) and into the User row (what
// screens read), and the owner receives a link for the person to set a password.

const STAFF_ROLES = ROLES;

const inviteInput = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(160),
  role: z.enum(STAFF_ROLES),
  locale: z.string().trim().max(16).optional(),
  timeZone: z.string().trim().max(64).optional(),
});

async function setRoleClaim(uid: string, role: Role): Promise<void> {
  const current = (await auth.getUser(uid)).customClaims ?? {};
  await auth.setCustomUserClaims(uid, { ...current, role });
}

export const inviteUser = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner'], 'Inviting people');

  const parsed = inviteInput.safeParse(request.data);
  if (!parsed.success) {
    const details: Record<string, string> = {};
    for (const issue of parsed.error.issues) details[issue.path.join('.') || 'input'] = issue.message;
    throw failure('validation', 'Check the invitation details.', details);
  }
  const input = parsed.data;

  const existing = await auth.getUserByEmail(input.email).catch(() => null);
  if (existing) throw failure('conflict', 'An account with this email already exists.');

  const account = await auth.createUser({ email: input.email, displayName: input.name, emailVerified: false });
  await setRoleClaim(account.uid, input.role);

  await graphql(
    `mutation CreateUser($uid: String!, $email: String!, $name: String!, $role: Role!, $locale: String, $timeZone: String, $invitedByUid: String!) {
      user_insert(data: {
        uid: $uid, email: $email, name: $name, role: $role, principalType: staff,
        locale: $locale, timeZone: $timeZone, status: invited, invitedByUid: $invitedByUid
      })
    }`,
    {
      uid: account.uid,
      email: input.email,
      name: input.name,
      role: input.role,
      locale: input.locale ?? null,
      timeZone: input.timeZone ?? null,
      invitedByUid: caller.uid,
    },
  );

  await audit(caller.uid, 'user.invite', 'user', account.uid, null, { email: input.email, name: input.name, role: input.role });
  await emit('user.invited', 'user', account.uid, { email: input.email, role: input.role });

  // Email delivery is an integration for a later phase; until then the owner
  // passes the link on. It is returned once and never stored.
  const passwordSetupLink = await auth.generatePasswordResetLink(input.email);
  return { uid: account.uid, passwordSetupLink };
});

const setRoleInput = z.object({
  uid: z.string().trim().min(1).max(128),
  role: z.enum(STAFF_ROLES),
});

export const setUserRole = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner'], 'Changing roles');

  const parsed = setRoleInput.safeParse(request.data);
  if (!parsed.success) throw failure('validation', 'Check the role change.');
  const { uid, role } = parsed.data;

  if (uid === caller.uid && role !== 'owner') {
    throw failure('invariant_violation', 'An owner cannot remove their own owner role.');
  }

  const account = await auth.getUser(uid).catch(() => null);
  if (!account) throw failure('not_found', 'No account with this id.');
  const before = account.customClaims?.['role'] ?? null;

  await setRoleClaim(uid, role);
  await graphql(
    `mutation SetRole($uid: String!, $role: Role!) {
      user_update(key: { uid: $uid }, data: { role: $role, updatedAt_expr: "request.time" })
    }`,
    { uid, role },
  );
  await audit(caller.uid, 'user.set_role', 'user', uid, { role: before }, { role });
  await emit('user.role_changed', 'user', uid, { from: before, to: role });

  return { uid, role };
});
