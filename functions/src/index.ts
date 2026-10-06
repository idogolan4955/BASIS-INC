import type { FunctionName } from '@basis/shared';
import { evaluateAlerts } from './alerts';
import { api } from './api';
import { connectorStatus, createApiToken, revokeApiToken, saveConnector, sendDocumentEmail } from './connectors';
import { fileGeneratedDocument } from './documents';
import { cancelPurchaseOrder, confirmPurchaseOrder, createProductionRun, createPurchaseOrder, issuePurchaseOrder, packHandlingUnit, recordLot, setLotQuality, updateMilestone } from './manufacturing';
import { sweepEvents } from './sweep';
import { inviteUser, setUserRole } from './users';

// Exported names must be exactly the registry in @basis/shared; the type
// check fails when a function is added on one side only.
const registry: Record<FunctionName, unknown> = {
  api,
  evaluateAlerts,
  inviteUser,
  setUserRole,
  sweepEvents,
  createPurchaseOrder,
  issuePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  createProductionRun,
  updateMilestone,
  recordLot,
  packHandlingUnit,
  setLotQuality,
  fileGeneratedDocument,
  sendDocumentEmail,
  createApiToken,
  revokeApiToken,
  saveConnector,
  connectorStatus,
};
void registry;

export { api, evaluateAlerts, inviteUser, setUserRole, sweepEvents, createPurchaseOrder, issuePurchaseOrder, confirmPurchaseOrder, cancelPurchaseOrder, createProductionRun, updateMilestone, recordLot, packHandlingUnit, setLotQuality, fileGeneratedDocument, sendDocumentEmail, createApiToken, revokeApiToken, saveConnector, connectorStatus };
