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
  /** Callable, purchasing roles: a purchase order with its lines and payment schedule. */
  createPurchaseOrder: 'createPurchaseOrder',
  issuePurchaseOrder: 'issuePurchaseOrder',
  confirmPurchaseOrder: 'confirmPurchaseOrder',
  cancelPurchaseOrder: 'cancelPurchaseOrder',
  /** Callable, purchasing roles: open a run on a confirmed order from a process template. */
  createProductionRun: 'createProductionRun',
  /** Callable, production roles: move a milestone; the run's health follows. */
  updateMilestone: 'updateMilestone',
  /** Callable, production roles: a lot produced by a run, with its rolls. */
  recordLot: 'recordLot',
  /** Callable, production roles: pack rolls into a carton or pallet. */
  packHandlingUnit: 'packHandlingUnit',
  /** Callable, QC and owner: a lot's quality state, with the reason. */
  setLotQuality: 'setLotQuality',
  /** Callable: file a generated document (purchase order, packing list, labels) as a document record of its entity. */
  fileGeneratedDocument: 'fileGeneratedDocument',
  /** Callable: email a generated document through the email connector. */
  sendDocumentEmail: 'sendDocumentEmail',
  /** Callable, owner only: connectors and tokens. */
  createApiToken: 'createApiToken',
  revokeApiToken: 'revokeApiToken',
  saveConnector: 'saveConnector',
  connectorStatus: 'connectorStatus',
  /** Callable, commercial roles: an inquiry from the site has been answered. */
  markInquiry: 'markInquiry',
  /** Callable, QC and operations: inspections, from opening to sign-off. */
  createInspection: 'createInspection',
  recordInspection: 'recordInspection',
  submitInspection: 'submitInspection',
  signOffInspection: 'signOffInspection',
  /** Callable, QC and operations: corrective actions. */
  createCorrectiveAction: 'createCorrectiveAction',
  updateCorrectiveAction: 'updateCorrectiveAction',
  /** Callable, logistics roles: shipments, their packages, booking and legs. */
  createShipment: 'createShipment',
  updateShipment: 'updateShipment',
  assignHandlingUnits: 'assignHandlingUnits',
  removeHandlingUnits: 'removeHandlingUnits',
  bookShipment: 'bookShipment',
  cancelShipment: 'cancelShipment',
  updateLeg: 'updateLeg',
  /** Callable, logistics cost roles: costs, customs and rates; landed cost allocation for owner, operations and finance. */
  recordShipmentCost: 'recordShipmentCost',
  recordCustomsEntry: 'recordCustomsEntry',
  setFxRate: 'setFxRate',
  allocateShipmentCosts: 'allocateShipmentCosts',
  /** Callable, stock roles: places, receiving, movements; reorder points for purchasing. */
  createStockLocation: 'createStockLocation',
  receiveShipment: 'receiveShipment',
  recordStockMovement: 'recordStockMovement',
  setReorderPolicy: 'setReorderPolicy',
  /** Callable, sales roles: customers, quotes, orders; fulfilment for logistics too; invoices for finance. */
  upsertCustomerProfile: 'upsertCustomerProfile',
  saveQuote: 'saveQuote',
  transitionQuote: 'transitionQuote',
  createSalesOrder: 'createSalesOrder',
  transitionSalesOrder: 'transitionSalesOrder',
  allocateSalesOrder: 'allocateSalesOrder',
  shipSalesOrder: 'shipSalesOrder',
  recordInvoice: 'recordInvoice',
  /** Callable, sales roles: price lists, opportunities and the interactions that move them. */
  savePriceList: 'savePriceList',
  saveOpportunity: 'saveOpportunity',
  logInteraction: 'logInteraction',
  /** Callable, development roles: the department's records. Sourcing and costing for the cost roles; production approval for the owner. */
  saveProductCategory: 'saveProductCategory',
  saveCollection: 'saveCollection',
  saveBrandAsset: 'saveBrandAsset',
  saveDevelopmentProduct: 'saveDevelopmentProduct',
  transitionDevelopment: 'transitionDevelopment',
  saveDevelopmentPart: 'saveDevelopmentPart',
  saveDevelopmentSample: 'saveDevelopmentSample',
  saveDevelopmentSourcing: 'saveDevelopmentSourcing',
  saveDevelopmentCosting: 'saveDevelopmentCosting',
  recordDevelopmentDecision: 'recordDevelopmentDecision',
  /** Callable, owner: a goal saved or changed, the board reordered, a goal removed. */
  saveGoal: 'saveGoal',
  reorderGoals: 'reorderGoals',
  deleteGoal: 'deleteGoal',
  /** Module 19, Mail: the mailbox connection and its sync (owner), the status of its secrets. */
  connectMailbox: 'connectMailbox',
  disconnectMailbox: 'disconnectMailbox',
  syncMailboxNow: 'syncMailboxNow',
  mailStatus: 'mailStatus',
  /** Scheduled, every five minutes: read what arrived in the mailbox over IMAP. */
  syncMail: 'syncMail',
  /** Callable: a saved .eml stored and sorted like synced mail. */
  importMailMessage: 'importMailMessage',
  /** Callable: what a person does from a message (link, task, inquiry, interaction, file, company, done). */
  actOnMail: 'actOnMail',
  /** Callable, owner and operations: a message's category and audience set by a person. */
  sortMailMessage: 'sortMailMessage',
  /** Callable, owner: the sorting rules. */
  saveMailRule: 'saveMailRule',
  /** Callable: an attachment's bytes after the audience check. */
  getMailAttachment: 'getMailAttachment',
  /** Scheduled, every five minutes: the classifier (Claude) sorts new mail and proposes actions. */
  classifyMail: 'classifyMail',
  /** Callable, owner and operations: sort one message with the classifier now. */
  classifyMailNow: 'classifyMailNow',
  /** Callable: accept or dismiss a proposed action. */
  decideMailAction: 'decideMailAction',
  /** Callable, owner and operations: run the alert rules now. */
  evaluateAlerts: 'evaluateAlerts',
  /** Callable, every staff role: BASIS AI answers in a thread, reading as the caller and proposing actions. */
  askAssistant: 'askAssistant',
  /** Callable: approve or reject an action BASIS AI proposed; approval runs it as the caller. */
  decideAssistantAction: 'decideAssistantAction',
  /** Customer portal: staff (owner, operations, sales) or a customer admin invite into an account; the token is shown once. */
  inviteCustomerUser: 'inviteCustomerUser',
  revokeCustomerInvitation: 'revokeCustomerInvitation',
  /** Signed out: what an invitation link is for, and accepting it with a name and a password. */
  customerInvitationInfo: 'customerInvitationInfo',
  acceptCustomerInvitation: 'acceptCustomerInvitation',
  /** Staff or a customer admin: a person's role in the account, or suspend and restore them. */
  setCustomerUser: 'setCustomerUser',
  /** Customer: after sign-in (last sign-in), answering a quote, asking for samples, addresses, documents. */
  customerSignedIn: 'customerSignedIn',
  respondToQuote: 'respondToQuote',
  requestCustomerSamples: 'requestCustomerSamples',
  saveCustomerAddress: 'saveCustomerAddress',
  removeCustomerAddress: 'removeCustomerAddress',
  customerDocuments: 'customerDocuments',
  /** The assistant on the brand site: anonymous visitors and signed-in customers; actions wait for the visitor's click. */
  siteAssistant: 'siteAssistant',
  siteAssistantDecide: 'siteAssistantDecide',
  siteAssistantHistory: 'siteAssistantHistory',
  /** Scheduled: consume domain events, evaluate alert rules. */
  sweepEvents: 'sweepEvents',
} as const;

export type FunctionName = (typeof FUNCTION_NAMES)[keyof typeof FUNCTION_NAMES];

export const FUNCTIONS_REGION = 'europe-west1';
