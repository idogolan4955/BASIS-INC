import { FUNCTIONS_REGION, isRole, type ErrorCode, type Role } from '@basis/shared';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDataConnect } from 'firebase-admin/data-connect';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

export const REGION = FUNCTIONS_REGION;
const SERVICE_ID = 'basis';

if (getApps().length === 0) initializeApp();

export const auth = getAuth();

// The Admin SDK runs with full access; every function checks the caller first.
const dataConnect = getDataConnect({ serviceId: SERVICE_ID, location: REGION });

export async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const result = (await dataConnect.executeGraphql(query, { variables })) as { data: T; errors?: { message: string }[] };
  if (result.errors?.length) {
    throw new HttpsError('internal', result.errors.map((error) => error.message).join('; '));
  }
  return result.data;
}

// The one error taxonomy, mapped onto callable error codes.
const CODE_MAP: Record<ErrorCode, 'invalid-argument' | 'not-found' | 'permission-denied' | 'aborted' | 'failed-precondition' | 'unavailable'> = {
  validation: 'invalid-argument',
  not_found: 'not-found',
  forbidden: 'permission-denied',
  conflict: 'aborted',
  invariant_violation: 'failed-precondition',
  external_failure: 'unavailable',
};

export function failure(code: ErrorCode, message: string, details?: Record<string, string>): HttpsError {
  return new HttpsError(CODE_MAP[code], message, details);
}

export interface Caller {
  readonly uid: string;
  readonly role: Role;
  readonly email?: string;
  /** Set when a machine acts with a token issued by `uid`. */
  readonly via?: string;
  /** Set when an inspection's sign-off closes a gated milestone. */
  readonly viaInspection?: string;
}

/** The signed-in caller with a known role, or a `forbidden` failure. */
export function callerOf(request: CallableRequest<unknown>): Caller {
  const token = request.auth?.token;
  if (!request.auth || !token) throw failure('forbidden', 'Sign in first.');
  const role = token['role'];
  if (!isRole(role)) throw failure('forbidden', 'This account has no role yet.');
  const caller: Caller = { uid: request.auth.uid, role };
  return typeof token.email === 'string' ? { ...caller, email: token.email } : caller;
}

/** The caller of a plain HTTP request: a session's ID token, or an API token issued in Settings. */
export async function httpCallerOf(authorization: string | undefined): Promise<Caller> {
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw failure('forbidden', 'Sign in first.');
  if (token.startsWith('bsk_')) {
    const { tokenCallerOf } = await import('./connectors');
    const caller = await tokenCallerOf(token);
    if (caller) return caller;
  }
  let claims: Awaited<ReturnType<typeof auth.verifyIdToken>>;
  try {
    claims = await auth.verifyIdToken(token);
  } catch {
    throw failure('forbidden', 'The session has expired; sign in again.');
  }
  const role = claims['role'];
  if (!isRole(role)) throw failure('forbidden', 'This account has no role yet.');
  const caller: Caller = { uid: claims.uid, role };
  return typeof claims.email === 'string' ? { ...caller, email: claims.email } : caller;
}

export function requireRole(caller: Caller, allowed: readonly Role[], action: string): void {
  if (!allowed.includes(caller.role)) {
    throw failure('forbidden', `${action} is not available to the ${caller.role} role.`);
  }
}

/** Every privileged change leaves an audit record with who, what, before and after. */
export async function audit(
  actorUid: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await graphql(
    `mutation Audit($actorUid: String!, $action: String!, $entityType: String!, $entityId: String!, $before: Any, $after: Any) {
      auditEvent_insert(data: { actorUid: $actorUid, action: $action, entityType: $entityType, entityId: $entityId, before: $before, after: $after })
    }`,
    { actorUid, action, entityType, entityId, before: before ?? null, after: after ?? null },
  );
}

/** Every state change also goes to the outbox for the sweep to act on. */
export async function emit(type: string, aggregateType: string, aggregateId: string, payload: unknown): Promise<void> {
  await graphql(
    `mutation Emit($type: String!, $aggregateType: String!, $aggregateId: String!, $payload: Any) {
      domainEvent_insert(data: { type: $type, aggregateType: $aggregateType, aggregateId: $aggregateId, payload: $payload })
    }`,
    { type, aggregateType, aggregateId, payload: payload ?? null },
  );
}
