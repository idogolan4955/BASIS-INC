const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const ActionState = {
  open: "open",
  in_progress: "in_progress",
  verification: "verification",
  closed: "closed",
}
exports.ActionState = ActionState;

const AlertSeverity = {
  info: "info",
  caution: "caution",
  critical: "critical",
}
exports.AlertSeverity = AlertSeverity;

const AlertState = {
  open: "open",
  acknowledged: "acknowledged",
  resolved: "resolved",
}
exports.AlertState = AlertState;

const AllocationKind = {
  estimate: "estimate",
  final: "final",
}
exports.AllocationKind = AllocationKind;

const CompanyRoleKind = {
  supplier: "supplier",
  factory_operator: "factory_operator",
  customer: "customer",
  freight_forwarder: "freight_forwarder",
  customs_broker: "customs_broker",
  carrier: "carrier",
  inspection_agency: "inspection_agency",
  warehouse_operator: "warehouse_operator",
}
exports.CompanyRoleKind = CompanyRoleKind;

const CompanyStatus = {
  prospect: "prospect",
  active: "active",
  inactive: "inactive",
}
exports.CompanyStatus = CompanyStatus;

const ContactStatus = {
  active: "active",
  left: "left",
}
exports.ContactStatus = ContactStatus;

const CustomerTier = {
  standard: "standard",
  preferred: "preferred",
  key: "key",
}
exports.CustomerTier = CustomerTier;

const CustomerType = {
  designer: "designer",
  atelier: "atelier",
  salon: "salon",
  manufacturer: "manufacturer",
  distributor: "distributor",
  wholesaler: "wholesaler",
}
exports.CustomerType = CustomerType;

const Disposition = {
  release: "release",
  rework: "rework",
  reject: "reject",
  accept_with_concession: "accept_with_concession",
}
exports.Disposition = Disposition;

const DocumentKind = {
  commercial_invoice: "commercial_invoice",
  packing_list: "packing_list",
  bill_of_lading: "bill_of_lading",
  air_waybill: "air_waybill",
  certificate_of_origin: "certificate_of_origin",
  certificate: "certificate",
  inspection_report: "inspection_report",
  technical_sheet: "technical_sheet",
  quotation: "quotation",
  purchase_order: "purchase_order",
  contract: "contract",
  photo: "photo",
  other: "other",
}
exports.DocumentKind = DocumentKind;

const HandlingUnitKind = {
  roll: "roll",
  carton: "carton",
  pallet: "pallet",
  container_load: "container_load",
}
exports.HandlingUnitKind = HandlingUnitKind;

const Health = {
  on_track: "on_track",
  at_risk: "at_risk",
  delayed: "delayed",
  blocked: "blocked",
}
exports.Health = Health;

const InspectionResult = {
  pass: "pass",
  conditional_pass: "conditional_pass",
  fail: "fail",
}
exports.InspectionResult = InspectionResult;

const InspectionState = {
  scheduled: "scheduled",
  in_progress: "in_progress",
  submitted: "submitted",
  signed_off: "signed_off",
  cancelled: "cancelled",
}
exports.InspectionState = InspectionState;

const InspectionType = {
  lab_dip: "lab_dip",
  inline: "inline",
  pre_shipment: "pre_shipment",
  receiving: "receiving",
}
exports.InspectionType = InspectionType;

const LoadType = {
  fcl: "fcl",
  lcl: "lcl",
  none: "none",
}
exports.LoadType = LoadType;

const LocationType = {
  factory: "factory",
  warehouse: "warehouse",
  consolidation_hub: "consolidation_hub",
  port: "port",
  airport: "airport",
  office: "office",
  customer_site: "customer_site",
}
exports.LocationType = LocationType;

const LotQualityState = {
  pending: "pending",
  on_hold: "on_hold",
  released: "released",
  rejected: "rejected",
}
exports.LotQualityState = LotQualityState;

const MovementReason = {
  receipt: "receipt",
  transfer: "transfer",
  pick: "pick",
  ship: "ship",
  adjust: "adjust",
  return: "return",
  sample_cut: "sample_cut",
  scrap: "scrap",
}
exports.MovementReason = MovementReason;

const PrincipalType = {
  staff: "staff",
  supplier: "supplier",
  customer: "customer",
}
exports.PrincipalType = PrincipalType;

const ProductStatus = {
  draft: "draft",
  active: "active",
  discontinued: "discontinued",
}
exports.ProductStatus = ProductStatus;

const PurchaseOrderState = {
  draft: "draft",
  issued: "issued",
  confirmed: "confirmed",
  closed: "closed",
  cancelled: "cancelled",
}
exports.PurchaseOrderState = PurchaseOrderState;

const QuoteState = {
  draft: "draft",
  sent: "sent",
  accepted: "accepted",
  declined: "declined",
  expired: "expired",
}
exports.QuoteState = QuoteState;

const Role = {
  owner: "owner",
  operations: "operations",
  purchasing: "purchasing",
  qc: "qc",
  logistics: "logistics",
  sales: "sales",
  marketing: "marketing",
  finance: "finance",
  viewer: "viewer",
  supplier: "supplier",
  customer: "customer",
}
exports.Role = Role;

const RunState = {
  planned: "planned",
  active: "active",
  completed: "completed",
  cancelled: "cancelled",
}
exports.RunState = RunState;

const SalesOrderState = {
  draft: "draft",
  confirmed: "confirmed",
  shipped: "shipped",
  closed: "closed",
  cancelled: "cancelled",
}
exports.SalesOrderState = SalesOrderState;

const ShadeStatus = {
  active: "active",
  inactive: "inactive",
}
exports.ShadeStatus = ShadeStatus;

const ShipmentFlow = {
  inbound: "inbound",
  outbound: "outbound",
  direct: "direct",
  transfer: "transfer",
}
exports.ShipmentFlow = ShipmentFlow;

const ShipmentState = {
  draft: "draft",
  booked: "booked",
  closed: "closed",
  cancelled: "cancelled",
}
exports.ShipmentState = ShipmentState;

const SkuStatus = {
  development: "development",
  sampling: "sampling",
  active: "active",
  phase_out: "phase_out",
  discontinued: "discontinued",
}
exports.SkuStatus = SkuStatus;

const StockLocationKind = {
  physical: "physical",
  at_supplier: "at_supplier",
  in_transit: "in_transit",
  customer: "customer",
  scrap: "scrap",
  adjustment: "adjustment",
  samples: "samples",
}
exports.StockLocationKind = StockLocationKind;

const TaskState = {
  open: "open",
  done: "done",
  cancelled: "cancelled",
}
exports.TaskState = TaskState;

const TransportMode = {
  sea: "sea",
  air: "air",
  courier: "courier",
  road: "road",
}
exports.TransportMode = TransportMode;

const UomDimension = {
  length: "length",
  mass: "mass",
  count: "count",
}
exports.UomDimension = UomDimension;

const UserStatus = {
  invited: "invited",
  active: "active",
  suspended: "suspended",
}
exports.UserStatus = UserStatus;

const connectorConfig = {
  connector: 'platform',
  service: 'basis',
  location: 'europe-west1'
};
exports.connectorConfig = connectorConfig;

const listFamiliesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListFamilies');
}
listFamiliesRef.operationName = 'ListFamilies';
exports.listFamiliesRef = listFamiliesRef;

exports.listFamilies = function listFamilies(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listFamiliesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listProductsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProducts');
}
listProductsRef.operationName = 'ListProducts';
exports.listProductsRef = listProductsRef;

exports.listProducts = function listProducts(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listProductsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getProductRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetProduct', inputVars);
}
getProductRef.operationName = 'GetProduct';
exports.getProductRef = getProductRef;

exports.getProduct = function getProduct(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getProductRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listSkusRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListSkus');
}
listSkusRef.operationName = 'ListSkus';
exports.listSkusRef = listSkusRef;

exports.listSkus = function listSkus(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listSkusRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getSkuRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetSku', inputVars);
}
getSkuRef.operationName = 'GetSku';
exports.getSkuRef = getSkuRef;

exports.getSku = function getSku(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getSkuRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getSkuSourcingRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetSkuSourcing', inputVars);
}
getSkuSourcingRef.operationName = 'GetSkuSourcing';
exports.getSkuSourcingRef = getSkuSourcingRef;

exports.getSkuSourcing = function getSkuSourcing(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getSkuSourcingRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listShadesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListShades');
}
listShadesRef.operationName = 'ListShades';
exports.listShadesRef = listShadesRef;

exports.listShades = function listShades(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listShadesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listPutUpsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPutUps');
}
listPutUpsRef.operationName = 'ListPutUps';
exports.listPutUpsRef = listPutUpsRef;

exports.listPutUps = function listPutUps(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listPutUpsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const upsertFamilyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertFamily', inputVars);
}
upsertFamilyRef.operationName = 'UpsertFamily';
exports.upsertFamilyRef = upsertFamilyRef;

exports.upsertFamily = function upsertFamily(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertFamilyRef(dcInstance, inputVars));
}
;

const upsertProductRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertProduct', inputVars);
}
upsertProductRef.operationName = 'UpsertProduct';
exports.upsertProductRef = upsertProductRef;

exports.upsertProduct = function upsertProduct(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertProductRef(dcInstance, inputVars));
}
;

const insertVariantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertVariant', inputVars);
}
insertVariantRef.operationName = 'InsertVariant';
exports.insertVariantRef = insertVariantRef;

exports.insertVariant = function insertVariant(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertVariantRef(dcInstance, inputVars));
}
;

const updateVariantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateVariant', inputVars);
}
updateVariantRef.operationName = 'UpdateVariant';
exports.updateVariantRef = updateVariantRef;

exports.updateVariant = function updateVariant(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateVariantRef(dcInstance, inputVars));
}
;

const upsertShadeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertShade', inputVars);
}
upsertShadeRef.operationName = 'UpsertShade';
exports.upsertShadeRef = upsertShadeRef;

exports.upsertShade = function upsertShade(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertShadeRef(dcInstance, inputVars));
}
;

const upsertPutUpRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertPutUp', inputVars);
}
upsertPutUpRef.operationName = 'UpsertPutUp';
exports.upsertPutUpRef = upsertPutUpRef;

exports.upsertPutUp = function upsertPutUp(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertPutUpRef(dcInstance, inputVars));
}
;

const upsertSkuRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertSku', inputVars);
}
upsertSkuRef.operationName = 'UpsertSku';
exports.upsertSkuRef = upsertSkuRef;

exports.upsertSku = function upsertSku(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertSkuRef(dcInstance, inputVars));
}
;

const setSkuStatusRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SetSkuStatus', inputVars);
}
setSkuStatusRef.operationName = 'SetSkuStatus';
exports.setSkuStatusRef = setSkuStatusRef;

exports.setSkuStatus = function setSkuStatus(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(setSkuStatusRef(dcInstance, inputVars));
}
;

const updateProductDetailsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateProductDetails', inputVars);
}
updateProductDetailsRef.operationName = 'UpdateProductDetails';
exports.updateProductDetailsRef = updateProductDetailsRef;

exports.updateProductDetails = function updateProductDetails(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateProductDetailsRef(dcInstance, inputVars));
}
;

const setSkuPublicRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SetSkuPublic', inputVars);
}
setSkuPublicRef.operationName = 'SetSkuPublic';
exports.setSkuPublicRef = setSkuPublicRef;

exports.setSkuPublic = function setSkuPublic(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(setSkuPublicRef(dcInstance, inputVars));
}
;

const insertSupplierItemRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertSupplierItem', inputVars);
}
insertSupplierItemRef.operationName = 'InsertSupplierItem';
exports.insertSupplierItemRef = insertSupplierItemRef;

exports.insertSupplierItem = function insertSupplierItem(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertSupplierItemRef(dcInstance, inputVars));
}
;

const insertSupplierPriceRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertSupplierPrice', inputVars);
}
insertSupplierPriceRef.operationName = 'InsertSupplierPrice';
exports.insertSupplierPriceRef = insertSupplierPriceRef;

exports.insertSupplierPrice = function insertSupplierPrice(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertSupplierPriceRef(dcInstance, inputVars));
}
;

const listShadeStandardsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListShadeStandards', inputVars);
}
listShadeStandardsRef.operationName = 'ListShadeStandards';
exports.listShadeStandardsRef = listShadeStandardsRef;

exports.listShadeStandards = function listShadeStandards(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listShadeStandardsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const insertShadeStandardRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertShadeStandard', inputVars);
}
insertShadeStandardRef.operationName = 'InsertShadeStandard';
exports.insertShadeStandardRef = insertShadeStandardRef;

exports.insertShadeStandard = function insertShadeStandard(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertShadeStandardRef(dcInstance, inputVars));
}
;

const listQuotesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListQuotes');
}
listQuotesRef.operationName = 'ListQuotes';
exports.listQuotesRef = listQuotesRef;

exports.listQuotes = function listQuotes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listQuotesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getQuoteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetQuote', inputVars);
}
getQuoteRef.operationName = 'GetQuote';
exports.getQuoteRef = getQuoteRef;

exports.getQuote = function getQuote(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getQuoteRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listSalesOrdersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListSalesOrders');
}
listSalesOrdersRef.operationName = 'ListSalesOrders';
exports.listSalesOrdersRef = listSalesOrdersRef;

exports.listSalesOrders = function listSalesOrders(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listSalesOrdersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getSalesOrderRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetSalesOrder', inputVars);
}
getSalesOrderRef.operationName = 'GetSalesOrder';
exports.getSalesOrderRef = getSalesOrderRef;

exports.getSalesOrder = function getSalesOrder(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getSalesOrderRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const stockForSkuRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'StockForSku', inputVars);
}
stockForSkuRef.operationName = 'StockForSku';
exports.stockForSkuRef = stockForSkuRef;

exports.stockForSku = function stockForSku(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(stockForSkuRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listSalesOrdersForRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListSalesOrdersFor', inputVars);
}
listSalesOrdersForRef.operationName = 'ListSalesOrdersFor';
exports.listSalesOrdersForRef = listSalesOrdersForRef;

exports.listSalesOrdersFor = function listSalesOrdersFor(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listSalesOrdersForRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getShipmentCostsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetShipmentCosts', inputVars);
}
getShipmentCostsRef.operationName = 'GetShipmentCosts';
exports.getShipmentCostsRef = getShipmentCostsRef;

exports.getShipmentCosts = function getShipmentCosts(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getShipmentCostsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getAllocationRunRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAllocationRun', inputVars);
}
getAllocationRunRef.operationName = 'GetAllocationRun';
exports.getAllocationRunRef = getAllocationRunRef;

exports.getAllocationRun = function getAllocationRun(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getAllocationRunRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listLotCostsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListLotCosts');
}
listLotCostsRef.operationName = 'ListLotCosts';
exports.listLotCostsRef = listLotCostsRef;

exports.listLotCosts = function listLotCosts(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listLotCostsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listLotCostsForRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListLotCostsFor', inputVars);
}
listLotCostsForRef.operationName = 'ListLotCostsFor';
exports.listLotCostsForRef = listLotCostsForRef;

exports.listLotCostsFor = function listLotCostsFor(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listLotCostsForRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listFxRatesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListFxRates');
}
listFxRatesRef.operationName = 'ListFxRates';
exports.listFxRatesRef = listFxRatesRef;

exports.listFxRates = function listFxRates(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listFxRatesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listStockLocationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListStockLocations');
}
listStockLocationsRef.operationName = 'ListStockLocations';
exports.listStockLocationsRef = listStockLocationsRef;

exports.listStockLocations = function listStockLocations(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listStockLocationsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listStockBalancesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListStockBalances');
}
listStockBalancesRef.operationName = 'ListStockBalances';
exports.listStockBalancesRef = listStockBalancesRef;

exports.listStockBalances = function listStockBalances(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listStockBalancesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listStockMovementsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListStockMovements', inputVars);
}
listStockMovementsRef.operationName = 'ListStockMovements';
exports.listStockMovementsRef = listStockMovementsRef;

exports.listStockMovements = function listStockMovements(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listStockMovementsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listRecentMovementsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRecentMovements', inputVars);
}
listRecentMovementsRef.operationName = 'ListRecentMovements';
exports.listRecentMovementsRef = listRecentMovementsRef;

exports.listRecentMovements = function listRecentMovements(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listRecentMovementsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listReceiptsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListReceipts');
}
listReceiptsRef.operationName = 'ListReceipts';
exports.listReceiptsRef = listReceiptsRef;

exports.listReceipts = function listReceipts(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listReceiptsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listReorderPoliciesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListReorderPolicies');
}
listReorderPoliciesRef.operationName = 'ListReorderPolicies';
exports.listReorderPoliciesRef = listReorderPoliciesRef;

exports.listReorderPolicies = function listReorderPolicies(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listReorderPoliciesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listRollPositionsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRollPositions', inputVars);
}
listRollPositionsRef.operationName = 'ListRollPositions';
exports.listRollPositionsRef = listRollPositionsRef;

exports.listRollPositions = function listRollPositions(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listRollPositionsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listShipmentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListShipments');
}
listShipmentsRef.operationName = 'ListShipments';
exports.listShipmentsRef = listShipmentsRef;

exports.listShipments = function listShipments(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listShipmentsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getShipmentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetShipment', inputVars);
}
getShipmentRef.operationName = 'GetShipment';
exports.getShipmentRef = getShipmentRef;

exports.getShipment = function getShipment(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getShipmentRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listShippableUnitsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListShippableUnits');
}
listShippableUnitsRef.operationName = 'ListShippableUnits';
exports.listShippableUnitsRef = listShippableUnitsRef;

exports.listShippableUnits = function listShippableUnits(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listShippableUnitsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listLocationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListLocations');
}
listLocationsRef.operationName = 'ListLocations';
exports.listLocationsRef = listLocationsRef;

exports.listLocations = function listLocations(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listLocationsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDocumentRequirementsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDocumentRequirements');
}
listDocumentRequirementsRef.operationName = 'ListDocumentRequirements';
exports.listDocumentRequirementsRef = listDocumentRequirementsRef;

exports.listDocumentRequirements = function listDocumentRequirements(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDocumentRequirementsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listCompaniesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCompanies');
}
listCompaniesRef.operationName = 'ListCompanies';
exports.listCompaniesRef = listCompaniesRef;

exports.listCompanies = function listCompanies(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCompaniesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getCompanyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCompany', inputVars);
}
getCompanyRef.operationName = 'GetCompany';
exports.getCompanyRef = getCompanyRef;

exports.getCompany = function getCompany(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getCompanyRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listFactoriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListFactories');
}
listFactoriesRef.operationName = 'ListFactories';
exports.listFactoriesRef = listFactoriesRef;

exports.listFactories = function listFactories(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listFactoriesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const insertCompanyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertCompany', inputVars);
}
insertCompanyRef.operationName = 'InsertCompany';
exports.insertCompanyRef = insertCompanyRef;

exports.insertCompany = function insertCompany(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertCompanyRef(dcInstance, inputVars));
}
;

const updateCompanyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateCompany', inputVars);
}
updateCompanyRef.operationName = 'UpdateCompany';
exports.updateCompanyRef = updateCompanyRef;

exports.updateCompany = function updateCompany(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateCompanyRef(dcInstance, inputVars));
}
;

const archiveCompanyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ArchiveCompany', inputVars);
}
archiveCompanyRef.operationName = 'ArchiveCompany';
exports.archiveCompanyRef = archiveCompanyRef;

exports.archiveCompany = function archiveCompany(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(archiveCompanyRef(dcInstance, inputVars));
}
;

const addCompanyRoleRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddCompanyRole', inputVars);
}
addCompanyRoleRef.operationName = 'AddCompanyRole';
exports.addCompanyRoleRef = addCompanyRoleRef;

exports.addCompanyRole = function addCompanyRole(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addCompanyRoleRef(dcInstance, inputVars));
}
;

const removeCompanyRoleRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'RemoveCompanyRole', inputVars);
}
removeCompanyRoleRef.operationName = 'RemoveCompanyRole';
exports.removeCompanyRoleRef = removeCompanyRoleRef;

exports.removeCompanyRole = function removeCompanyRole(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(removeCompanyRoleRef(dcInstance, inputVars));
}
;

const insertContactRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertContact', inputVars);
}
insertContactRef.operationName = 'InsertContact';
exports.insertContactRef = insertContactRef;

exports.insertContact = function insertContact(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertContactRef(dcInstance, inputVars));
}
;

const updateContactRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateContact', inputVars);
}
updateContactRef.operationName = 'UpdateContact';
exports.updateContactRef = updateContactRef;

exports.updateContact = function updateContact(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateContactRef(dcInstance, inputVars));
}
;

const insertLocationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertLocation', inputVars);
}
insertLocationRef.operationName = 'InsertLocation';
exports.insertLocationRef = insertLocationRef;

exports.insertLocation = function insertLocation(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertLocationRef(dcInstance, inputVars));
}
;

const insertFactoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertFactory', inputVars);
}
insertFactoryRef.operationName = 'InsertFactory';
exports.insertFactoryRef = insertFactoryRef;

exports.insertFactory = function insertFactory(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertFactoryRef(dcInstance, inputVars));
}
;

const upsertSupplierProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertSupplierProfile', inputVars);
}
upsertSupplierProfileRef.operationName = 'UpsertSupplierProfile';
exports.upsertSupplierProfileRef = upsertSupplierProfileRef;

exports.upsertSupplierProfile = function upsertSupplierProfile(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(upsertSupplierProfileRef(dcInstance, inputVars));
}
;

const listPurchaseOrdersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPurchaseOrders');
}
listPurchaseOrdersRef.operationName = 'ListPurchaseOrders';
exports.listPurchaseOrdersRef = listPurchaseOrdersRef;

exports.listPurchaseOrders = function listPurchaseOrders(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listPurchaseOrdersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getPurchaseOrderRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPurchaseOrder', inputVars);
}
getPurchaseOrderRef.operationName = 'GetPurchaseOrder';
exports.getPurchaseOrderRef = getPurchaseOrderRef;

exports.getPurchaseOrder = function getPurchaseOrder(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getPurchaseOrderRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getPurchaseOrderCostsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPurchaseOrderCosts', inputVars);
}
getPurchaseOrderCostsRef.operationName = 'GetPurchaseOrderCosts';
exports.getPurchaseOrderCostsRef = getPurchaseOrderCostsRef;

exports.getPurchaseOrderCosts = function getPurchaseOrderCosts(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getPurchaseOrderCostsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listProductionRunsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProductionRuns');
}
listProductionRunsRef.operationName = 'ListProductionRuns';
exports.listProductionRunsRef = listProductionRunsRef;

exports.listProductionRuns = function listProductionRuns(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listProductionRunsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getProductionRunRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetProductionRun', inputVars);
}
getProductionRunRef.operationName = 'GetProductionRun';
exports.getProductionRunRef = getProductionRunRef;

exports.getProductionRun = function getProductionRun(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getProductionRunRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getLotRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetLot', inputVars);
}
getLotRef.operationName = 'GetLot';
exports.getLotRef = getLotRef;

exports.getLot = function getLot(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getLotRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listProcessTemplatesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProcessTemplates');
}
listProcessTemplatesRef.operationName = 'ListProcessTemplates';
exports.listProcessTemplatesRef = listProcessTemplatesRef;

exports.listProcessTemplates = function listProcessTemplates(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listProcessTemplatesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const operationsFactsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'OperationsFacts');
}
operationsFactsRef.operationName = 'OperationsFacts';
exports.operationsFactsRef = operationsFactsRef;

exports.operationsFacts = function operationsFacts(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(operationsFactsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const acknowledgeAlertRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AcknowledgeAlert', inputVars);
}
acknowledgeAlertRef.operationName = 'AcknowledgeAlert';
exports.acknowledgeAlertRef = acknowledgeAlertRef;

exports.acknowledgeAlert = function acknowledgeAlert(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(acknowledgeAlertRef(dcInstance, inputVars));
}
;

const createTaskRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTask', inputVars);
}
createTaskRef.operationName = 'CreateTask';
exports.createTaskRef = createTaskRef;

exports.createTask = function createTask(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createTaskRef(dcInstance, inputVars));
}
;

const completeTaskRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CompleteTask', inputVars);
}
completeTaskRef.operationName = 'CompleteTask';
exports.completeTaskRef = completeTaskRef;

exports.completeTask = function completeTask(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(completeTaskRef(dcInstance, inputVars));
}
;

const addNoteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddNote', inputVars);
}
addNoteRef.operationName = 'AddNote';
exports.addNoteRef = addNoteRef;

exports.addNote = function addNote(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addNoteRef(dcInstance, inputVars));
}
;

const updateMyPreferencesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMyPreferences', inputVars);
}
updateMyPreferencesRef.operationName = 'UpdateMyPreferences';
exports.updateMyPreferencesRef = updateMyPreferencesRef;

exports.updateMyPreferences = function updateMyPreferences(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars);
  return executeMutation(updateMyPreferencesRef(dcInstance, inputVars));
}
;

const recordEventRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'RecordEvent', inputVars);
}
recordEventRef.operationName = 'RecordEvent';
exports.recordEventRef = recordEventRef;

exports.recordEvent = function recordEvent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(recordEventRef(dcInstance, inputVars));
}
;

const resolveAlertRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ResolveAlert', inputVars);
}
resolveAlertRef.operationName = 'ResolveAlert';
exports.resolveAlertRef = resolveAlertRef;

exports.resolveAlert = function resolveAlert(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(resolveAlertRef(dcInstance, inputVars));
}
;

const reopenTaskRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ReopenTask', inputVars);
}
reopenTaskRef.operationName = 'ReopenTask';
exports.reopenTaskRef = reopenTaskRef;

exports.reopenTask = function reopenTask(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(reopenTaskRef(dcInstance, inputVars));
}
;

const listInspectionsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListInspections');
}
listInspectionsRef.operationName = 'ListInspections';
exports.listInspectionsRef = listInspectionsRef;

exports.listInspections = function listInspections(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listInspectionsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listInspectionsForRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListInspectionsFor', inputVars);
}
listInspectionsForRef.operationName = 'ListInspectionsFor';
exports.listInspectionsForRef = listInspectionsForRef;

exports.listInspectionsFor = function listInspectionsFor(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listInspectionsForRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getInspectionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetInspection', inputVars);
}
getInspectionRef.operationName = 'GetInspection';
exports.getInspectionRef = getInspectionRef;

exports.getInspection = function getInspection(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getInspectionRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listInspectionTemplatesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListInspectionTemplates');
}
listInspectionTemplatesRef.operationName = 'ListInspectionTemplates';
exports.listInspectionTemplatesRef = listInspectionTemplatesRef;

exports.listInspectionTemplates = function listInspectionTemplates(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listInspectionTemplatesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listCorrectiveActionsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCorrectiveActions');
}
listCorrectiveActionsRef.operationName = 'ListCorrectiveActions';
exports.listCorrectiveActionsRef = listCorrectiveActionsRef;

exports.listCorrectiveActions = function listCorrectiveActions(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCorrectiveActionsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getMeRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMe');
}
getMeRef.operationName = 'GetMe';
exports.getMeRef = getMeRef;

exports.getMe = function getMe(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getMeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listUsersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListUsers');
}
listUsersRef.operationName = 'ListUsers';
exports.listUsersRef = listUsersRef;

exports.listUsers = function listUsers(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listUsersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listOpenAlertsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListOpenAlerts');
}
listOpenAlertsRef.operationName = 'ListOpenAlerts';
exports.listOpenAlertsRef = listOpenAlertsRef;

exports.listOpenAlerts = function listOpenAlerts(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listOpenAlertsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMyTasksRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyTasks');
}
listMyTasksRef.operationName = 'ListMyTasks';
exports.listMyTasksRef = listMyTasksRef;

exports.listMyTasks = function listMyTasks(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMyTasksRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listTimelineRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTimeline', inputVars);
}
listTimelineRef.operationName = 'ListTimeline';
exports.listTimelineRef = listTimelineRef;

exports.listTimeline = function listTimeline(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listTimelineRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDocumentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDocuments');
}
listDocumentsRef.operationName = 'ListDocuments';
exports.listDocumentsRef = listDocumentsRef;

exports.listDocuments = function listDocuments(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDocumentsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDocumentsForRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDocumentsFor', inputVars);
}
listDocumentsForRef.operationName = 'ListDocumentsFor';
exports.listDocumentsForRef = listDocumentsForRef;

exports.listDocumentsFor = function listDocumentsFor(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listDocumentsForRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listCountriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCountries');
}
listCountriesRef.operationName = 'ListCountries';
exports.listCountriesRef = listCountriesRef;

exports.listCountries = function listCountries(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCountriesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listCurrenciesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCurrencies');
}
listCurrenciesRef.operationName = 'ListCurrencies';
exports.listCurrenciesRef = listCurrenciesRef;

exports.listCurrencies = function listCurrencies(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCurrenciesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listUomsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListUoms');
}
listUomsRef.operationName = 'ListUoms';
exports.listUomsRef = listUomsRef;

exports.listUoms = function listUoms(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listUomsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listIncotermsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListIncoterms');
}
listIncotermsRef.operationName = 'ListIncoterms';
exports.listIncotermsRef = listIncotermsRef;

exports.listIncoterms = function listIncoterms(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listIncotermsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listLegalEntitiesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListLegalEntities');
}
listLegalEntitiesRef.operationName = 'ListLegalEntities';
exports.listLegalEntitiesRef = listLegalEntitiesRef;

exports.listLegalEntities = function listLegalEntities(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listLegalEntitiesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listStaffRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListStaff');
}
listStaffRef.operationName = 'ListStaff';
exports.listStaffRef = listStaffRef;

exports.listStaff = function listStaff(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listStaffRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listOpenTasksRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListOpenTasks');
}
listOpenTasksRef.operationName = 'ListOpenTasks';
exports.listOpenTasksRef = listOpenTasksRef;

exports.listOpenTasks = function listOpenTasks(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listOpenTasksRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listApiTokensRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListApiTokens');
}
listApiTokensRef.operationName = 'ListApiTokens';
exports.listApiTokensRef = listApiTokensRef;

exports.listApiTokens = function listApiTokens(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listApiTokensRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listConnectorsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListConnectors');
}
listConnectorsRef.operationName = 'ListConnectors';
exports.listConnectorsRef = listConnectorsRef;

exports.listConnectors = function listConnectors(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listConnectorsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMessagesForRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMessagesFor', inputVars);
}
listMessagesForRef.operationName = 'ListMessagesFor';
exports.listMessagesForRef = listMessagesForRef;

exports.listMessagesFor = function listMessagesFor(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMessagesForRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listInquiriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListInquiries');
}
listInquiriesRef.operationName = 'ListInquiries';
exports.listInquiriesRef = listInquiriesRef;

exports.listInquiries = function listInquiries(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listInquiriesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
