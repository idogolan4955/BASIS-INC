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
import { deleteGoal, reorderGoals, saveGoal } from './boards';
import { logInteraction, saveOpportunity, savePriceList } from './relationships';
import { recordDevelopmentDecision, saveBrandAsset, saveCollection, saveDevelopmentCosting, saveDevelopmentPart, saveDevelopmentProduct, saveDevelopmentSample, saveDevelopmentSourcing, saveProductCategory, transitionDevelopment } from './development';
import { inviteUser, setUserRole } from './users';
import { actOnMail, classifyMail, classifyMailNow, decideMailAction, connectMailbox, disconnectMailbox, getMailAttachment, importMailMessage, mailStatus, saveMailRule, sortMailMessage, syncMail, syncMailboxNow } from './mail';
import { askAssistant, decideAssistantAction } from './assistant';
import { siteAssistant, siteAssistantDecide, siteAssistantHistory } from './assistant/site';
import { acceptCustomerInvitation, customerDocuments, customerInvitationInfo, customerSignedIn, inviteCustomerUser, removeCustomerAddress, requestCustomerSamples, respondToQuote, revokeCustomerInvitation, saveCustomerAddress, setCustomerUser } from './portal';

// Exported names must be exactly the registry in @basis/shared; the type
// check fails when a function is added on one side only.
const registry: Record<FunctionName, unknown> = {
  api,
  evaluateAlerts,
  askAssistant,
  decideAssistantAction,
  siteAssistant,
  siteAssistantDecide,
  siteAssistantHistory,
  inviteCustomerUser,
  revokeCustomerInvitation,
  customerInvitationInfo,
  acceptCustomerInvitation,
  setCustomerUser,
  customerSignedIn,
  respondToQuote,
  requestCustomerSamples,
  saveCustomerAddress,
  removeCustomerAddress,
  customerDocuments,
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
  saveGoal,
  reorderGoals,
  deleteGoal,
  savePriceList,
  saveOpportunity,
  logInteraction,
  saveProductCategory,
  saveCollection,
  saveBrandAsset,
  saveDevelopmentProduct,
  transitionDevelopment,
  saveDevelopmentPart,
  saveDevelopmentSample,
  saveDevelopmentSourcing,
  saveDevelopmentCosting,
  recordDevelopmentDecision,
  connectMailbox,
  disconnectMailbox,
  syncMailboxNow,
  mailStatus,
  syncMail,
  importMailMessage,
  actOnMail,
  sortMailMessage,
  saveMailRule,
  getMailAttachment,
  classifyMail,
  classifyMailNow,
  decideMailAction,
};
void registry;

export { api, evaluateAlerts, askAssistant, decideAssistantAction, siteAssistant, siteAssistantDecide, siteAssistantHistory, inviteCustomerUser, revokeCustomerInvitation, customerInvitationInfo, acceptCustomerInvitation, setCustomerUser, customerSignedIn, respondToQuote, requestCustomerSamples, saveCustomerAddress, removeCustomerAddress, customerDocuments, inviteUser, setUserRole, sweepEvents, createPurchaseOrder, issuePurchaseOrder, confirmPurchaseOrder, cancelPurchaseOrder, createProductionRun, updateMilestone, recordLot, packHandlingUnit, setLotQuality, fileGeneratedDocument, sendDocumentEmail, createApiToken, revokeApiToken, saveConnector, connectorStatus, markInquiry, createInspection, recordInspection, submitInspection, signOffInspection, createCorrectiveAction, updateCorrectiveAction, createShipment, updateShipment, assignHandlingUnits, removeHandlingUnits, bookShipment, cancelShipment, updateLeg, recordShipmentCost, recordCustomsEntry, setFxRate, allocateShipmentCosts, createStockLocation, receiveShipment, recordStockMovement, setReorderPolicy, upsertCustomerProfile, saveQuote, transitionQuote, createSalesOrder, transitionSalesOrder, allocateSalesOrder, shipSalesOrder, recordInvoice, saveGoal, reorderGoals, deleteGoal, savePriceList, saveOpportunity, logInteraction, saveProductCategory, saveCollection, saveBrandAsset, saveDevelopmentProduct, transitionDevelopment, saveDevelopmentPart, saveDevelopmentSample, saveDevelopmentSourcing, saveDevelopmentCosting, recordDevelopmentDecision, connectMailbox, disconnectMailbox, syncMailboxNow, mailStatus, syncMail, importMailMessage, actOnMail, sortMailMessage, saveMailRule, getMailAttachment, classifyMail, classifyMailNow, decideMailAction };
