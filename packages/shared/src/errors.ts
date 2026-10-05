// Expected failures are values, not exceptions. One taxonomy for the whole system.

export const ERROR_CODES = [
  'validation',
  'not_found',
  'forbidden',
  'conflict',
  'invariant_violation',
  'external_failure',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface DomainError {
  readonly code: ErrorCode;
  readonly message: string;
  /** Field-level messages for `validation`; context for the others. */
  readonly details?: Readonly<Record<string, string>>;
}

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: DomainError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(code: ErrorCode, message: string, details?: Record<string, string>): Result<T> {
  return { ok: false, error: details ? { code, message, details } : { code, message } };
}

export function isDomainError(value: unknown): value is DomainError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    (ERROR_CODES as readonly string[]).includes(String((value as { code: unknown }).code))
  );
}
