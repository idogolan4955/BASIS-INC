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
  /** Callable, owner and operations: run the alert rules now. */
  evaluateAlerts: 'evaluateAlerts',
  /** Scheduled: consume domain events, evaluate alert rules. */
  sweepEvents: 'sweepEvents',
} as const;

export type FunctionName = (typeof FUNCTION_NAMES)[keyof typeof FUNCTION_NAMES];

export const FUNCTIONS_REGION = 'europe-west1';
