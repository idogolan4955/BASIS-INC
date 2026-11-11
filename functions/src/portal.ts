import {
  CUSTOMER_ROLE_LABEL,
  CUSTOMER_USER_ROLES,
  INVITATION_DAYS,
  MEMBER_PREFIX,
  PORTAL_STAFF_ROLES,
  customerCan,
  customerMayOpenDocument,
  invitationState,
  isRole,
  leavesAnAdmin,
  loginDeletion,
  quoteStanding,
  todayIn,
  type CustomerAction,
  type CustomerUserRole,
} from '@basis/shared';
import { createHash, randomBytes } from 'node:crypto';
import { logger } from 'firebase-functions';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { applyQuoteTransition } from './commercial';
import { createInquiryRecord } from './intake';
import { REGION, audit, auth, callerOf, failure, graphql, requireRole, type Caller } from './lib';
import { allocateNumber, timeline } from './manufacturing';

// The customer portal's functions (docs/CUSTOMER_PORTAL_PLAN.md §3, §11.2).
// Customers sign in with the claim role = customer, which no staff function
// accepts; these functions check that claim, the person's CustomerUser row
// and their role inside the account before they do anything, and every
// record they touch is found through the person's own account, never through
// an id that would let one customer reach another's.

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const role = z.enum(CUSTOMER_USER_ROLES);
const id = z.string().regex(/^[0-9a-f-]{32,36}$/i);

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

/** The callable client sends a field left empty as null; for the portal's inputs, null and absent mean the same. */
function withoutNulls(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null));
}

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const parsed = schema.safeParse(withoutNulls(data));
  if (!parsed.success) validationFailure(parsed.error);
  return parsed.data;
}

// ---------------------------------------------------------------- who is asking

export interface CustomerCaller {
  readonly uid: string;
  readonly name: string;
  readonly email: string;
  readonly role: CustomerUserRole;
  readonly accountId: string;
  readonly accountName: string;
  readonly companyId: string | null;
}

interface CustomerUserRow {
  uid: string;
  name: string;
  email: string;
  role: CustomerUserRole;
  status: string;
  account: { id: string; status: string; displayName: string; company: { id: string } | null };
}

export async function customerCallerOf(request: CallableRequest<unknown>): Promise<CustomerCaller> {
  if (!request.auth || request.auth.token['role'] !== 'customer') throw failure('forbidden', 'Sign in to your BASIS account first.');
  const { customerUser } = await graphql<{ customerUser: CustomerUserRow | null }>(
    `query ($uid: String!) { customerUser(key: { uid: $uid }) { uid name email role status account { id status displayName company { id } } } }`,
    { uid: request.auth.uid },
  );
  if (!customerUser || customerUser.status !== 'active' || customerUser.account.status !== 'active') throw failure('forbidden', 'This account is not active. Write to BASIS.');
  return { uid: customerUser.uid, name: customerUser.name, email: customerUser.email, role: customerUser.role, accountId: customerUser.account.id, accountName: customerUser.account.displayName, companyId: customerUser.account.company?.id ?? null };
}

function requireCustomer(caller: CustomerCaller, action: CustomerAction, what: string): void {
  if (!customerCan(caller.role, action)) throw failure('forbidden', `${what} is not available to a ${CUSTOMER_ROLE_LABEL[caller.role].toLowerCase()} in your account. Ask your account's admin.`);
}

const isCustomerRequest = (request: CallableRequest<unknown>) => request.auth?.token['role'] === 'customer';

/** Staff who manage portal users, or the account's own admin. Returns who acts and on which account. */
async function managerOf(request: CallableRequest<unknown>, accountId: string): Promise<{ uid: string; name: string; staff: boolean }> {
  if (isCustomerRequest(request)) {
    const caller = await customerCallerOf(request);
    if (caller.accountId !== accountId) throw failure('not_found', 'No such person in your account.');
    requireCustomer(caller, 'manage_team', 'Managing the team');
    return { uid: caller.uid, name: caller.name, staff: false };
  }
  const caller = callerOf(request);
  requireRole(caller, PORTAL_STAFF_ROLES, 'Managing customer accounts');
  return { uid: caller.uid, name: await staffName(caller), staff: true };
}

async function staffName(caller: Caller): Promise<string> {
  const { user } = await graphql<{ user: { name: string } | null }>(`query ($uid: String!) { user(key: { uid: $uid }) { name } }`, { uid: caller.uid });
  return user?.name ?? 'BASIS';
}

// ---------------------------------------------------------------- accounts and invitations

interface AccountRow {
  id: string;
  displayName: string;
  memberNumber: string;
  status: string;
  company: { id: string } | null;
}

/** The trade account of a customer company, opened the first time someone from it is invited. */
async function tradeAccountOf(companyId: string): Promise<AccountRow> {
  const { customerAccounts } = await graphql<{ customerAccounts: AccountRow[] }>(
    `query ($companyId: UUID!) { customerAccounts(where: { company: { id: { eq: $companyId } } }, limit: 1) { id displayName memberNumber status company { id } } }`,
    { companyId },
  );
  if (customerAccounts[0]) return customerAccounts[0];
  const { company } = await graphql<{ company: { id: string; legalName: string; tradingName: string | null; defaultCurrency: { code: string } | null; companyRoles_on_company: { kind: string }[]; customerProfiles_on_company: { currency: string | null }[] } | null }>(
    `query ($id: UUID!) { company(id: $id) { id legalName tradingName defaultCurrency { code } companyRoles_on_company { kind } customerProfiles_on_company(limit: 1) { currency } } }`,
    { id: companyId },
  );
  if (!company) throw failure('not_found', 'That company does not exist.');
  if (!company.companyRoles_on_company.some((item) => item.kind === 'customer')) throw failure('invariant_violation', 'Only a customer company can have a portal account. Give it the customer role first.');
  const memberNumber = await allocateNumber(MEMBER_PREFIX);
  const displayName = company.tradingName || company.legalName;
  const currency = company.customerProfiles_on_company[0]?.currency || company.defaultCurrency?.code || 'USD';
  const { customerAccount_insert } = await graphql<{ customerAccount_insert: { id: string } }>(
    `mutation ($companyId: UUID!, $displayName: String!, $memberNumber: String!, $currency: String!) {
      customerAccount_insert(data: { kind: trade, companyId: $companyId, displayName: $displayName, memberNumber: $memberNumber, currency: $currency, status: active }) }`,
    { companyId, displayName, memberNumber, currency },
  );
  return { id: customerAccount_insert.id, displayName, memberNumber, status: 'active', company: { id: companyId } };
}

/** One person, one customer account; a staff login never doubles as a customer. */
async function assertInvitable(email: string, accountId: string): Promise<void> {
  const { customerUsers } = await graphql<{ customerUsers: { account: { id: string } }[] }>(`query ($email: String!) { customerUsers(where: { email: { eq: $email } }, limit: 1) { account { id } } }`, { email });
  if (customerUsers[0]) throw failure('conflict', customerUsers[0].account.id === accountId ? `${email} already has access to this account.` : `${email} already belongs to another BASIS customer account.`);
  try {
    const existing = await auth.getUserByEmail(email);
    const claim = existing.customClaims?.['role'];
    if (isRole(claim) || claim === 'supplier') throw failure('conflict', `${email} is a BASIS staff login. A customer needs their own email address.`);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    // auth/user-not-found: a new person, as expected.
  }
}

async function openInvitation(accountId: string, input: { email: string; name?: string | undefined; contactId?: string | undefined; role: CustomerUserRole }, createdByUid: string): Promise<{ token: string; expiresAt: string; invitationId: string }> {
  const email = input.email.trim().toLowerCase();
  await assertInvitable(email, accountId);
  // A new invitation replaces any still open for the same person.
  await graphql(
    `mutation ($accountId: UUID!, $email: String!) { customerInvitation_updateMany(where: { account: { id: { eq: $accountId } }, email: { eq: $email }, acceptedAt: { isNull: true }, revokedAt: { isNull: true } }, data: { revokedAt_expr: "request.time" }) }`,
    { accountId, email },
  );
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITATION_DAYS * 86_400_000).toISOString();
  const { customerInvitation_insert } = await graphql<{ customerInvitation_insert: { id: string } }>(
    `mutation ($accountId: UUID!, $email: String!, $name: String, $contactId: UUID, $role: CustomerUserRole!, $tokenHash: String!, $expiresAt: Timestamp!, $uid: String!) {
      customerInvitation_insert(data: { accountId: $accountId, email: $email, name: $name, contactId: $contactId, role: $role, tokenHash: $tokenHash, expiresAt: $expiresAt, createdByUid: $uid }) }`,
    { accountId, email, name: input.name?.trim() || null, contactId: input.contactId ?? null, role: input.role, tokenHash: hash(token), expiresAt, uid: createdByUid },
  );
  return { token, expiresAt, invitationId: customerInvitation_insert.id };
}

const inviteInput = z.object({
  /** Staff: the customer company. Customers invite into their own account and leave it out. */
  companyId: id.optional(),
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(160).optional(),
  contactId: id.optional(),
  role: role.default('buyer'),
});

/**
 * Invites a person into a customer account and returns the one-time token,
 * shown once to whoever invited them; only its hash is kept. Staff invite
 * into any customer company (opening its account the first time); a
 * customer admin invites colleagues into their own.
 */
export const inviteCustomerUser = onCall({ region: REGION }, async (request) => {
  const input = parse(inviteInput, request.data);
  let accountId: string;
  let companyId: string | null;
  let actor: { uid: string; name: string; staff: boolean };
  let memberNumber: string;
  if (isCustomerRequest(request)) {
    const caller = await customerCallerOf(request);
    requireCustomer(caller, 'manage_team', 'Inviting colleagues');
    accountId = caller.accountId;
    companyId = caller.companyId;
    actor = { uid: caller.uid, name: caller.name, staff: false };
    const { customerAccount } = await graphql<{ customerAccount: { memberNumber: string } }>(`query ($id: UUID!) { customerAccount(id: $id) { memberNumber } }`, { id: accountId });
    memberNumber = customerAccount.memberNumber;
  } else {
    const caller = callerOf(request);
    requireRole(caller, PORTAL_STAFF_ROLES, 'Inviting customers to the portal');
    if (!input.companyId) throw failure('validation', 'Choose the customer company.');
    const account = await tradeAccountOf(input.companyId);
    if (account.status !== 'active') throw failure('invariant_violation', `The account ${account.memberNumber} is ${account.status}.`);
    accountId = account.id;
    companyId = input.companyId;
    memberNumber = account.memberNumber;
    actor = { uid: caller.uid, name: await staffName(caller), staff: true };
  }
  const invitation = await openInvitation(accountId, { email: input.email, name: input.name, contactId: input.contactId, role: input.role }, actor.uid);
  await audit(actor.uid, 'portal.invite', 'customer_account', accountId, null, { email: input.email.toLowerCase(), role: input.role, by: actor.staff ? 'staff' : 'customer_admin' });
  if (companyId) await timeline('customer', companyId, 'portal', actor.uid, `Portal invitation for ${input.email.toLowerCase()} as ${CUSTOMER_ROLE_LABEL[input.role].toLowerCase()}, by ${actor.name}`);
  return { ...invitation, accountId, memberNumber };
});

const revokeInput = z.object({ invitationId: id });

export const revokeCustomerInvitation = onCall({ region: REGION }, async (request) => {
  const { invitationId } = parse(revokeInput, request.data);
  const { customerInvitation } = await graphql<{ customerInvitation: { id: string; email: string; acceptedAt: string | null; revokedAt: string | null; account: { id: string; company: { id: string } | null } } | null }>(
    `query ($id: UUID!) { customerInvitation(id: $id) { id email acceptedAt revokedAt account { id company { id } } } }`,
    { id: invitationId },
  );
  if (!customerInvitation) throw failure('not_found', 'No such invitation.');
  const actor = await managerOf(request, customerInvitation.account.id);
  if (customerInvitation.acceptedAt) throw failure('invariant_violation', 'This invitation was accepted; suspend the person instead.');
  if (customerInvitation.revokedAt) return { revoked: true };
  await graphql(`mutation ($id: UUID!) { customerInvitation_update(id: $id, data: { revokedAt_expr: "request.time" }) }`, { id: invitationId });
  await audit(actor.uid, 'portal.invitation_revoked', 'customer_account', customerInvitation.account.id, null, { email: customerInvitation.email });
  return { revoked: true };
});

// ---------------------------------------------------------------- accepting an invitation (signed out)

interface InvitationRow {
  id: string;
  email: string;
  name: string | null;
  role: CustomerUserRole;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdByUid: string;
  contact: { id: string } | null;
  account: { id: string; status: string; displayName: string; company: { id: string } | null };
}

async function invitationOf(token: string): Promise<InvitationRow | null> {
  const { customerInvitations } = await graphql<{ customerInvitations: InvitationRow[] }>(
    `query ($tokenHash: String!) { customerInvitations(where: { tokenHash: { eq: $tokenHash } }, limit: 1) { id email name role expiresAt acceptedAt revokedAt createdByUid contact { id } account { id status displayName company { id } } } }`,
    { tokenHash: hash(token) },
  );
  return customerInvitations[0] ?? null;
}

const tokenInput = z.object({ token: z.string().min(20).max(200) });

/** What the invitation page shows before the person sets a password. No sign-in needed: the token is the proof. */
export const customerInvitationInfo = onCall({ region: REGION }, async (request) => {
  const { token } = parse(tokenInput, request.data);
  const invitation = await invitationOf(token);
  if (!invitation) return { state: 'unknown' as const };
  const state = invitationState(invitation);
  return { state, email: invitation.email, name: invitation.name ?? '', role: invitation.role, accountName: invitation.account.displayName };
});

const acceptInput = tokenInput.extend({ name: z.string().trim().min(2).max(160), password: z.string().min(8, 'At least 8 characters').max(128) });

export const acceptCustomerInvitation = onCall({ region: REGION }, async (request) => {
  const input = parse(acceptInput, request.data);
  const invitation = await invitationOf(input.token);
  if (!invitation) throw failure('not_found', 'This invitation link is not valid. Ask BASIS for a new one.');
  const state = invitationState(invitation);
  if (state === 'accepted') throw failure('conflict', 'This invitation was already used. Sign in with your email and password.');
  if (state !== 'open') throw failure('invariant_violation', `This invitation has ${state === 'expired' ? 'expired' : 'been withdrawn'}. Ask BASIS for a new one.`);
  if (invitation.account.status !== 'active') throw failure('invariant_violation', 'This account is not active. Write to BASIS.');
  await assertInvitable(invitation.email, invitation.account.id);

  // The link proves the address: the account is created verified, with the password the person chose.
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(invitation.email);
    uid = existing.uid;
    await auth.updateUser(uid, { password: input.password, displayName: input.name, emailVerified: true, disabled: false });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    const created = await auth.createUser({ email: invitation.email, password: input.password, displayName: input.name, emailVerified: true });
    uid = created.uid;
  }
  await auth.setCustomUserClaims(uid, { role: 'customer' });
  await graphql(
    `mutation ($uid: String!, $email: String!, $name: String!, $companyId: UUID, $invitedBy: String!) {
      user_upsert(data: { uid: $uid, email: $email, name: $name, role: customer, principalType: customer, companyId: $companyId, status: active, invitedByUid: $invitedBy, updatedAt_expr: "request.time" }) }`,
    { uid, email: invitation.email, name: input.name, companyId: invitation.account.company?.id ?? null, invitedBy: invitation.createdByUid },
  );
  await graphql(
    `mutation ($uid: String!, $accountId: UUID!, $contactId: UUID, $name: String!, $email: String!, $role: CustomerUserRole!, $invitedBy: String!, $invitationId: UUID!) {
      customerUser_insert(data: { uid: $uid, accountId: $accountId, contactId: $contactId, name: $name, email: $email, role: $role, status: active, invitedByUid: $invitedBy })
      customerInvitation_update(id: $invitationId, data: { acceptedAt_expr: "request.time" })
    }`,
    { uid, accountId: invitation.account.id, contactId: invitation.contact?.id ?? null, name: input.name, email: invitation.email, role: invitation.role, invitedBy: invitation.createdByUid, invitationId: invitation.id },
  );
  await audit(uid, 'portal.invitation_accepted', 'customer_account', invitation.account.id, null, { email: invitation.email, role: invitation.role });
  if (invitation.account.company) await timeline('customer', invitation.account.company.id, 'portal', uid, `${input.name} (${invitation.email}) joined the portal as ${CUSTOMER_ROLE_LABEL[invitation.role].toLowerCase()}`);
  return { email: invitation.email };
});

// ---------------------------------------------------------------- the team

const setUserInput = z.object({ uid: z.string().min(1).max(128), role: role.optional(), status: z.enum(['active', 'suspended']).optional() });

export const setCustomerUser = onCall({ region: REGION }, async (request) => {
  const input = parse(setUserInput, request.data);
  if (!input.role && !input.status) throw failure('validation', 'Choose a role or a status.');
  const { customerUser } = await graphql<{ customerUser: { uid: string; email: string; role: CustomerUserRole; status: string; account: { id: string; company: { id: string } | null; customerUsers_on_account: { uid: string; role: CustomerUserRole; status: string }[] } } | null }>(
    `query ($uid: String!) { customerUser(key: { uid: $uid }) { uid email role status account { id company { id } customerUsers_on_account { uid role status } } } }`,
    { uid: input.uid },
  );
  if (!customerUser) throw failure('not_found', 'No such person.');
  const actor = await managerOf(request, customerUser.account.id);
  if (!actor.staff && actor.uid === input.uid && input.status === 'suspended') throw failure('invariant_violation', 'You cannot suspend yourself.');
  const change = { uid: input.uid, ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}) };
  if (!leavesAnAdmin(customerUser.account.customerUsers_on_account, change)) throw failure('invariant_violation', 'The account needs at least one active admin. Make someone else admin first.');
  await graphql(
    `mutation ($uid: String!, $role: CustomerUserRole!, $status: UserStatus!) { customerUser_update(key: { uid: $uid }, data: { role: $role, status: $status }) }`,
    { uid: input.uid, role: input.role ?? customerUser.role, status: input.status ?? customerUser.status },
  );
  if (input.status && input.status !== customerUser.status) {
    await auth.updateUser(input.uid, { disabled: input.status === 'suspended' });
    if (input.status === 'suspended') await auth.revokeRefreshTokens(input.uid);
  }
  await audit(actor.uid, 'portal.user_changed', 'customer_account', customerUser.account.id, { role: customerUser.role, status: customerUser.status }, { uid: input.uid, role: input.role ?? customerUser.role, status: input.status ?? customerUser.status });
  if (customerUser.account.company) await timeline('customer', customerUser.account.company.id, 'portal', actor.uid, `${customerUser.email}: ${[input.role ? CUSTOMER_ROLE_LABEL[input.role].toLowerCase() : '', input.status ?? ''].filter(Boolean).join(', ')}, by ${actor.name}`);
  return { uid: input.uid, role: input.role ?? customerUser.role, status: input.status ?? customerUser.status };
});

/** Called by the portal after sign-in: the last sign-in staff see, and the person's account in one answer. */
export const customerSignedIn = onCall({ region: REGION }, async (request) => {
  const caller = await customerCallerOf(request);
  await graphql(`mutation ($uid: String!) { customerUser_update(key: { uid: $uid }, data: { lastSignInAt_expr: "request.time" }) }`, { uid: caller.uid });
  return { name: caller.name, role: caller.role, accountName: caller.accountName };
});

// ---------------------------------------------------------------- the app: notifications and deleting a login

const pushInput = z.object({
  token: z.string().min(20).max(512),
  platform: z.enum(['ios']),
  locale: z.enum(['en', 'he']),
  appVersion: z.string().max(32).optional(),
});

/** The BASIS app keeps this phone's notification token against the signed-in person (functions/src/notify.ts). */
export const registerPushDevice = onCall({ region: REGION }, async (request) => {
  const caller = await customerCallerOf(request);
  const input = parse(pushInput, request.data);
  await graphql(
    `mutation ($token: String!, $uid: String!, $platform: String!, $locale: String!, $appVersion: String) {
      pushDevice_upsert(data: { token: $token, customerUserUid: $uid, platform: $platform, locale: $locale, appVersion: $appVersion, lastSeenAt_expr: "request.time" }) }`,
    { token: input.token, uid: caller.uid, platform: input.platform, locale: input.locale, appVersion: input.appVersion ?? null },
  );
  return { registered: true };
});

/** Before signing out: the phone stops receiving the person's notifications. Only their own token goes. */
export const unregisterPushDevice = onCall({ region: REGION }, async (request) => {
  if (!request.auth || request.auth.token['role'] !== 'customer') throw failure('forbidden', 'Sign in to your BASIS account first.');
  const { token } = parse(z.object({ token: z.string().min(20).max(512) }), request.data);
  await graphql(`mutation ($token: String!, $uid: String!) { pushDevice_deleteMany(where: { token: { eq: $token }, customerUser: { uid: { eq: $uid } } }) }`, { token, uid: request.auth.uid });
  return { unregistered: true };
});

/**
 * A person deletes their own login (App Store guideline 5.1.1(v)): the login
 * and its password, their place in the account and their User row, their
 * conversations with the site assistant and their phones' tokens. The
 * company's quotes, orders, invoices, documents, inquiries and timeline stay:
 * they are the company's business records with BASIS. The last active admin
 * of an account with other active people makes a colleague admin first.
 */
export const deleteMyLogin = onCall({ region: REGION }, async (request) => {
  const caller = await customerCallerOf(request);
  const { customerUser } = await graphql<{ customerUser: { uid: string; name: string; email: string; role: CustomerUserRole; account: { id: string; displayName: string; company: { id: string } | null; customerUsers_on_account: { uid: string; role: CustomerUserRole; status: string }[] } } | null }>(
    `query ($uid: String!) { customerUser(key: { uid: $uid }) { uid name email role account { id displayName company { id } customerUsers_on_account { uid role status } } } }`,
    { uid: caller.uid },
  );
  if (!customerUser) throw failure('not_found', 'This login has no place in a BASIS account.');
  if (loginDeletion(customerUser.account.customerUsers_on_account, caller.uid) === 'last_admin') {
    throw failure('invariant_violation', `You are the last admin of ${customerUser.account.displayName}. Make a colleague admin on the Team page first, then delete your login.`);
  }
  // No one can sign in with it from here on, whatever happens next.
  await auth.updateUser(caller.uid, { disabled: true });
  await auth.revokeRefreshTokens(caller.uid);
  // Written while the person still exists (both point at their User row); the
  // entries keep their words, without the link, once the row is gone.
  await audit(caller.uid, 'portal.login_deleted', 'customer_account', customerUser.account.id, { email: customerUser.email, role: customerUser.role }, null);
  if (customerUser.account.company) await timeline('customer', customerUser.account.company.id, 'portal', caller.uid, `${customerUser.name} (${customerUser.email}) deleted their portal login`);
  await graphql(`mutation ($uid: String!) { siteConversation_deleteMany(where: { uid: { eq: $uid } }) }`, { uid: caller.uid });
  await graphql(
    `mutation ($uid: String!) {
      pushDevice_deleteMany(where: { customerUser: { uid: { eq: $uid } } })
      customerUser_delete(key: { uid: $uid })
      user_delete(key: { uid: $uid })
    }`,
    { uid: caller.uid },
  );
  try {
    await auth.deleteUser(caller.uid);
  } catch (error) {
    // The login stays disabled; nothing of the person is left to reach with it.
    logger.error('deleteMyLogin: the Auth user could not be deleted', { uid: caller.uid, error: String(error) });
  }
  return { deleted: true };
});

// ---------------------------------------------------------------- quotes and samples

export const answerInput = z.object({
  number: z.string().regex(/^QUO-\d{2}-\d{4}$/),
  decision: z.enum(['accept', 'decline']),
  reason: z.string().trim().max(500).optional(),
  requestedDelivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** The customer accepts or declines a sent quote; accepting opens the confirmed sales order, as when sales records it. */
export const respondToQuote = onCall({ region: REGION }, async (request) => {
  const caller = await customerCallerOf(request);
  return answerQuote(caller, parse(answerInput, request.data));
});

/** Shared by the portal's button and the site assistant's confirmed proposal. */
export async function answerQuote(caller: CustomerCaller, input: z.infer<typeof answerInput>): Promise<{ number: string; state: string; orderNumber: string | null }> {
  requireCustomer(caller, 'answer_quote', 'Answering quotes');
  if (!caller.companyId) throw failure('not_found', `No quote ${input.number}.`);
  const { quotes } = await graphql<{ quotes: { number: string; state: string; validUntil: string | null }[] }>(
    `query ($number: String!, $companyId: UUID!) { quotes(where: { number: { eq: $number }, customer: { id: { eq: $companyId } } }, limit: 1) { number state validUntil } }`,
    { number: input.number, companyId: caller.companyId },
  );
  const quote = quotes[0];
  if (!quote) throw failure('not_found', `No quote ${input.number}.`);
  const standing = quoteStanding(quote, todayIn('UTC'));
  if (standing !== 'awaiting_answer') throw failure('invariant_violation', standing === 'expired' ? `${quote.number} is no longer valid. Ask BASIS for a new quote.` : `${quote.number} has already been answered.`);
  return applyQuoteTransition({ number: quote.number, to: input.decision === 'accept' ? 'accepted' : 'declined', ...(input.reason ? { reason: input.reason } : {}), ...(input.requestedDelivery ? { requestedDelivery: input.requestedDelivery } : {}) }, caller.uid, `in the portal by ${caller.name}`);
}

export const samplesInput = z.object({
  products: z.array(z.string().max(16)).max(20).default([]),
  shades: z.array(z.string().max(8)).max(40).default([]),
  message: z.string().trim().max(4000).optional(),
  addressId: id.optional(),
});

export const requestCustomerSamples = onCall({ region: REGION }, async (request) => {
  const caller = await customerCallerOf(request);
  return askForSamples(caller, parse(samplesInput, request.data), 'portal');
});

/** Shared by the portal's form and the site assistant's confirmed proposal. */
export async function askForSamples(caller: CustomerCaller, input: z.infer<typeof samplesInput>, source: 'portal' | 'assistant'): Promise<{ reference: string }> {
  requireCustomer(caller, 'request_samples', 'Requesting samples');
  if (input.products.length === 0 && input.shades.length === 0 && !input.message) throw failure('validation', 'Choose fabrics or shades, or say what you need.');
  let address: string | null = null;
  if (input.addressId) {
    const { customerAddresses } = await graphql<{ customerAddresses: { location: { name: string; addressLine1: string | null; addressLine2: string | null; city: string | null; postalCode: string | null; country: { name: string } | null } }[] }>(
      `query ($id: UUID!, $accountId: UUID!) { customerAddresses(where: { id: { eq: $id }, account: { id: { eq: $accountId } } }, limit: 1) { location { name addressLine1 addressLine2 city postalCode country { name } } } }`,
      { id: input.addressId, accountId: caller.accountId },
    );
    const location = customerAddresses[0]?.location;
    if (!location) throw failure('not_found', 'No such address in your account.');
    address = [location.name, location.addressLine1, location.addressLine2, [location.postalCode, location.city].filter(Boolean).join(' '), location.country?.name].filter(Boolean).join(', ');
  }
  const reference = await createInquiryRecord(
    { kind: 'sample_request', name: caller.name, company: caller.accountName, email: caller.email, phone: null, country: null, customerType: null, topic: 'portal', message: input.message ?? null, details: { products: input.products, shades: input.shades, volume: null, address, url: null }, context: { page: '/account/samples', portal: true } },
    source,
    null,
    caller.accountId,
  );
  if (caller.companyId) await timeline('customer', caller.companyId, 'portal', caller.uid, `${reference}: samples asked for ${source === 'assistant' ? 'through the site assistant' : 'in the portal'} by ${caller.name}`);
  return { reference };
}

// ---------------------------------------------------------------- addresses

const addressInput = z.object({
  id: id.optional(),
  kind: z.enum(['ship', 'bill']),
  name: z.string().trim().min(1).max(160),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(32).optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  isDefault: z.boolean().default(false),
});

export const saveCustomerAddress = onCall({ region: REGION }, async (request) => {
  const caller = await customerCallerOf(request);
  requireCustomer(caller, 'manage_addresses', 'Keeping addresses');
  const input = parse(addressInput, request.data);
  const place = { name: input.name, addressLine1: input.addressLine1, addressLine2: input.addressLine2 || null, city: input.city, region: input.region || null, postalCode: input.postalCode || null, countryCode: input.countryCode };
  let addressId = input.id;
  if (addressId) {
    const { customerAddresses } = await graphql<{ customerAddresses: { id: string; location: { id: string } }[] }>(
      `query ($id: UUID!, $accountId: UUID!) { customerAddresses(where: { id: { eq: $id }, account: { id: { eq: $accountId } } }, limit: 1) { id location { id } } }`,
      { id: addressId, accountId: caller.accountId },
    );
    const existing = customerAddresses[0];
    if (!existing) throw failure('not_found', 'No such address in your account.');
    await graphql(
      `mutation ($id: UUID!, $name: String!, $addressLine1: String, $addressLine2: String, $city: String, $region: String, $postalCode: String, $countryCode: String) {
        location_update(id: $id, data: { name: $name, addressLine1: $addressLine1, addressLine2: $addressLine2, city: $city, region: $region, postalCode: $postalCode, countryCode: $countryCode }) }`,
      { id: existing.location.id, ...place },
    );
    await graphql(`mutation ($id: UUID!, $kind: String!) { customerAddress_update(id: $id, data: { kind: $kind }) }`, { id: addressId, kind: input.kind });
  } else {
    const { location_insert } = await graphql<{ location_insert: { id: string } }>(
      `mutation ($companyId: UUID, $name: String!, $addressLine1: String, $addressLine2: String, $city: String, $region: String, $postalCode: String, $countryCode: String) {
        location_insert(data: { companyId: $companyId, type: customer_site, name: $name, addressLine1: $addressLine1, addressLine2: $addressLine2, city: $city, region: $region, postalCode: $postalCode, countryCode: $countryCode }) }`,
      { companyId: caller.companyId, ...place },
    );
    const { customerAddress_insert } = await graphql<{ customerAddress_insert: { id: string } }>(
      `mutation ($accountId: UUID!, $locationId: UUID!, $kind: String!) { customerAddress_insert(data: { accountId: $accountId, locationId: $locationId, kind: $kind, isDefault: false }) }`,
      { accountId: caller.accountId, locationId: location_insert.id, kind: input.kind },
    );
    addressId = customerAddress_insert.id;
  }
  // One default per kind: the first address of a kind is its default.
  const { customerAddresses: ofKind } = await graphql<{ customerAddresses: { id: string; isDefault: boolean }[] }>(
    `query ($accountId: UUID!, $kind: String!) { customerAddresses(where: { account: { id: { eq: $accountId } }, kind: { eq: $kind } }) { id isDefault } }`,
    { accountId: caller.accountId, kind: input.kind },
  );
  const makeDefault = input.isDefault || !ofKind.some((address) => address.isDefault && address.id !== addressId);
  if (makeDefault) {
    await graphql(`mutation ($accountId: UUID!, $kind: String!) { customerAddress_updateMany(where: { account: { id: { eq: $accountId } }, kind: { eq: $kind } }, data: { isDefault: false }) }`, { accountId: caller.accountId, kind: input.kind });
    await graphql(`mutation ($id: UUID!) { customerAddress_update(id: $id, data: { isDefault: true }) }`, { id: addressId });
  }
  return { id: addressId };
});

export const removeCustomerAddress = onCall({ region: REGION }, async (request) => {
  const caller = await customerCallerOf(request);
  requireCustomer(caller, 'manage_addresses', 'Keeping addresses');
  const { id: addressId } = parse(z.object({ id }), request.data);
  const removed = await graphql<{ customerAddress_deleteMany: number }>(
    `mutation ($id: UUID!, $accountId: UUID!) { customerAddress_deleteMany(where: { id: { eq: $id }, account: { id: { eq: $accountId } } }) }`,
    { id: addressId, accountId: caller.accountId },
  );
  if (removed.customerAddress_deleteMany !== 1) throw failure('not_found', 'No such address in your account.');
  return { removed: true };
});

// ---------------------------------------------------------------- documents

export interface CustomerDocument {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly number: string | null;
  readonly issuedOn: string | null;
  readonly record: string;
  readonly recordType: 'quote' | 'sales_order' | 'shipment';
  /** Where the portal opens it: a filed file or a document rendered from the records. */
  readonly href: string;
}

/** The numbers of the caller's own quotes (as sent), orders and shipments, with each shipment's flow. */
export async function customerRecords(companyId: string): Promise<{ quotes: string[]; orders: string[]; shipments: { number: string; flow: string }[] }> {
  const data = await graphql<{ quotes: { number: string }[]; salesOrders: { number: string }[]; shipments: { number: string; flow: string }[] }>(
    `query ($companyId: UUID!) {
      quotes(where: { customer: { id: { eq: $companyId } }, state: { in: [sent, accepted, declined, expired] } }, limit: 500) { number }
      salesOrders(where: { customer: { id: { eq: $companyId } }, state: { in: [confirmed, shipped, closed, cancelled] } }, limit: 500) { number }
      shipments(where: { state: { ne: cancelled }, consignee: { id: { eq: $companyId } } }, limit: 500) { number flow }
    }`,
    { companyId },
  );
  return { quotes: data.quotes.map((row) => row.number), orders: data.salesOrders.map((row) => row.number), shipments: data.shipments };
}

export const customerDocuments = onCall({ region: REGION }, async (request) => {
  const caller = await customerCallerOf(request);
  if (!caller.companyId) return { documents: [] };
  const records = await customerRecords(caller.companyId);
  const flowOf = new Map(records.shipments.map((row) => [row.number, row.flow]));
  const ids = [...records.quotes, ...records.orders, ...records.shipments.map((row) => row.number)];
  const documents: CustomerDocument[] = [];
  if (ids.length) {
    const { documentLinks } = await graphql<{ documentLinks: { entityType: string; entityId: string; document: { id: string; kind: string; title: string; number: string | null; issuedOn: string | null; archivedAt: string | null } }[] }>(
      `query ($ids: [String!]!) { documentLinks(where: { entityType: { in: ["quote", "sales_order", "shipment"] }, entityId: { in: $ids } }, limit: 1000) { entityType entityId document { id kind title number issuedOn archivedAt } } }`,
      { ids },
    );
    const seen = new Set<string>();
    for (const link of documentLinks) {
      const own = (link.entityType === 'quote' && records.quotes.includes(link.entityId)) || (link.entityType === 'sales_order' && records.orders.includes(link.entityId)) || (link.entityType === 'shipment' && flowOf.has(link.entityId));
      if (!own || link.document.archivedAt || seen.has(link.document.id)) continue;
      if (!customerMayOpenDocument(link.document.kind, link.entityType, flowOf.get(link.entityId))) continue;
      if (link.entityType === 'shipment' && !(await shipmentIsOnlyTheirs(link.entityId, caller.companyId))) continue;
      seen.add(link.document.id);
      documents.push({ id: link.document.id, kind: link.document.kind, title: link.document.title, number: link.document.number, issuedOn: link.document.issuedOn, record: link.entityId, recordType: link.entityType as CustomerDocument['recordType'], href: `/api/customer/files/${link.document.id}` });
    }
  }
  // Rendered from the records whenever opened: each quote as sent, and each outbound shipment's packing list.
  const filedQuotes = new Set(documents.filter((doc) => doc.kind === 'quotation').map((doc) => doc.record));
  for (const number of records.quotes) if (!filedQuotes.has(number)) documents.push({ id: `quote-${number}`, kind: 'quotation', title: `Quotation ${number}`, number, issuedOn: null, record: number, recordType: 'quote', href: `/api/pdf/quote/${number}` });
  for (const shipment of records.shipments) if (shipment.flow === 'outbound' && (await shipmentIsOnlyTheirs(shipment.number, caller.companyId))) documents.push({ id: `packing-${shipment.number}`, kind: 'packing_list', title: `Packing list ${shipment.number}`, number: shipment.number, issuedOn: null, record: shipment.number, recordType: 'shipment', href: `/api/pdf/shipment-packing-list/${shipment.number}` });
  return { documents };
});

// ---------------------------------------------------------------- the portal over plain HTTP (PDFs and files)

/** A customer's ID token on a plain HTTP request, or null when the bearer is not a customer. */
export async function httpCustomerOf(authorization: string | undefined): Promise<CustomerCaller | null> {
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token || token.startsWith('bsk_')) return null;
  let claims: Awaited<ReturnType<typeof auth.verifyIdToken>>;
  try {
    claims = await auth.verifyIdToken(token);
  } catch {
    return null;
  }
  if (claims['role'] !== 'customer') return null;
  return customerCallerOf({ auth: { uid: claims.uid, token: claims } } as unknown as CallableRequest<unknown>);
}

/** Every line on the shipment is the customer's: a consolidated shipment's papers would show other customers' goods. */
async function shipmentIsOnlyTheirs(number: string, companyId: string): Promise<boolean> {
  const { shipments } = await graphql<{ shipments: { flow: string; shipmentLines_on_shipment: { salesOrderLine: { order: { customer: { id: string } } } | null }[] }[] }>(
    `query ($number: String!) { shipments(where: { number: { eq: $number } }, limit: 1) { flow shipmentLines_on_shipment { salesOrderLine { order { customer { id } } } } } }`,
    { number },
  );
  const shipment = shipments[0];
  if (!shipment || shipment.flow !== 'outbound' || shipment.shipmentLines_on_shipment.length === 0) return false;
  return shipment.shipmentLines_on_shipment.every((line) => line.salesOrderLine?.order.customer.id === companyId);
}

/** Which rendered documents a customer may open: their own quotes as sent, and the packing list of a shipment that carries only their goods. */
export async function customerMayRender(caller: CustomerCaller, kind: string, number: string): Promise<boolean> {
  if (!caller.companyId) return false;
  if (kind === 'quote') {
    const { quotes } = await graphql<{ quotes: { number: string }[] }>(
      `query ($number: String!, $companyId: UUID!) { quotes(where: { number: { eq: $number }, customer: { id: { eq: $companyId } }, state: { in: [sent, accepted, declined, expired] } }, limit: 1) { number } }`,
      { number, companyId: caller.companyId },
    );
    return quotes.length === 1;
  }
  if (kind === 'shipment-packing-list') return shipmentIsOnlyTheirs(number, caller.companyId);
  return false;
}

/** A filed document a customer may download: linked to one of their records, of a kind they may see. */
export async function customerFile(caller: CustomerCaller, documentId: string): Promise<{ storagePath: string; mimeType: string; title: string } | null> {
  if (!caller.companyId) return null;
  const { document } = await graphql<{ document: { kind: string; title: string; storagePath: string; mimeType: string; archivedAt: string | null; documentLinks_on_document: { entityType: string; entityId: string }[] } | null }>(
    `query ($id: UUID!) { document(id: $id) { kind title storagePath mimeType archivedAt documentLinks_on_document { entityType entityId } } }`,
    { id: documentId },
  );
  if (!document || document.archivedAt) return null;
  const records = await customerRecords(caller.companyId);
  const flowOf = new Map(records.shipments.map((row) => [row.number, row.flow]));
  for (const link of document.documentLinks_on_document) {
    const own = (link.entityType === 'quote' && records.quotes.includes(link.entityId)) || (link.entityType === 'sales_order' && records.orders.includes(link.entityId)) || (link.entityType === 'shipment' && flowOf.has(link.entityId));
    if (!own || !customerMayOpenDocument(document.kind, link.entityType, flowOf.get(link.entityId))) continue;
    if (link.entityType === 'shipment' && !(await shipmentIsOnlyTheirs(link.entityId, caller.companyId))) continue;
    return { storagePath: document.storagePath, mimeType: document.mimeType, title: document.title };
  }
  return null;
}
