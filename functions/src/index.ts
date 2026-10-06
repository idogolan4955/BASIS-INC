import type { FunctionName } from '@basis/shared';
import { evaluateAlerts } from './alerts';
import { api } from './api';
import { sweepEvents } from './sweep';
import { inviteUser, setUserRole } from './users';

// Exported names must be exactly the registry in @basis/shared; the type
// check fails when a function is added on one side only.
const registry: Record<FunctionName, unknown> = { api, evaluateAlerts, inviteUser, setUserRole, sweepEvents };
void registry;

export { api, evaluateAlerts, inviteUser, setUserRole, sweepEvents };
