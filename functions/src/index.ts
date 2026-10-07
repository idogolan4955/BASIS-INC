import type { FunctionName } from '@basis/shared';
import { evaluateAlerts } from './alerts';
import { api } from './api';
import { connectorStatus, createApiToken, revokeApiToken, saveConnector, sendDocumentEmail } from './connectors';
import { fileGeneratedDocument } from './documents';
import { markInquiry } from './intake';
import { createCorrectiveAction, createInspection, recordInspection, signOffInspection, submitInspection, updateCorrectiveAction } from './quality';
import { cancelPurchaseOrder, confirmPurchaseOrder, createProductionRun, createPurchaseOrder, issuePurchaseOrder, packHandlingUnit, recordLot, setLotQuality, updateMilestone } from './manufacturing';
import { assignHandlingUnits, bookShipment, cancelShipment, createShipment, removeHandlingUnits, updateLeg, updateShipment } from './logistics';
import { allocateShipmentCosts, recordCustomsEntry, recordShipmentCost, setFxRate } from './costing';
import { createStockLocation, receiveShipment, recordStockMovement, setReorderPolicy } from './inventory';
import { allocateSalesOrder, createSalesOrder, recordInvoice, saveQuote, shipSalesOrder, transitionQuote, transitionSalesOrder, upsertCustomerProfile } from './commercial';
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
  markInquiry,
  createInspection,
  recordInspection,
  submitInspection,
  signOffInspection,
  createCorrectiveAction,
  updateCorrectiveAction,
  createShipment,
  updateShipment,
  assignHandlingUnits,
  removeHandlingUnits,
  bookShipment,
  cancelShipment,
  updateLeg,
  recordShipmentCost,
  recordCustomsEntry,
  setFxRate,
  allocateShipmentCosts,
  createStockLocation,
  receiveShipment,
  recordStockMovement,
  setReorderPolicy,
  upsertCustomerProfile,
  saveQuote,
  transitionQuote,
  createSalesOrder,
  transitionSalesOrder,
  allocateSalesOrder,
  shipSalesOrder,
  recordInvoice,
};
void registry;

export { api, evaluateAlerts, inviteUser, setUserRole, sweepEvents, createPurchaseOrder, issuePurchaseOrder, confirmPurchaseOrder, cancelPurchaseOrder, createProductionRun, updateMilestone, recordLot, packHandlingUnit, setLotQuality, fileGeneratedDocument, sendDocumentEmail, createApiToken, revokeApiToken, saveConnector, connectorStatus, markInquiry, createInspection, recordInspection, submitInspection, signOffInspection, createCorrectiveAction, updateCorrectiveAction, createShipment, updateShipment, assignHandlingUnits, removeHandlingUnits, bookShipment, cancelShipment, updateLeg, recordShipmentCost, recordCustomsEntry, setFxRate, allocateShipmentCosts, createStockLocation, receiveShipment, recordStockMovement, setReorderPolicy, upsertCustomerProfile, saveQuote, transitionQuote, createSalesOrder, transitionSalesOrder, allocateSalesOrder, shipSalesOrder, recordInvoice };
