// Every Cloud Function is registered here. The interface calls functions by
// these names and `functions` exports exactly this set; the functions build
// fails if the two drift apart.

export const FUNCTION_NAMES = {
  /** HTTP: public intake, webhooks, exports, health. Behind Hosting `/api/**`. */
  api: 'api',
  /** Callable, owner only: create an account, set its role, return a set-password link. */
  inviteUser: 'inviteUser',
  /** Callable, owner only: change a person's role. */
  setUserRole: 'setUserRole',
  /** Callable, owner and operations: run the alert rules now. */
  evaluateAlerts: 'evaluateAlerts',
  /** Scheduled: consume domain events, evaluate alert rules. */
  sweepEvents: 'sweepEvents',
} as const;

export type FunctionName = (typeof FUNCTION_NAMES)[keyof typeof FUNCTION_NAMES];

export const FUNCTIONS_REGION = 'europe-west1';
