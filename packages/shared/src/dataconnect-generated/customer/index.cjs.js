const { queryRef, executeQuery, validateArgsWithOptions, validateArgs } = require('firebase/data-connect');

const CustomerUserRole = {
  admin: "admin",
  buyer: "buyer",
  viewer: "viewer",
}
exports.CustomerUserRole = CustomerUserRole;

const Health = {
  on_track: "on_track",
  at_risk: "at_risk",
  delayed: "delayed",
  blocked: "blocked",
}
exports.Health = Health;

const LoadType = {
  fcl: "fcl",
  lcl: "lcl",
  none: "none",
}
exports.LoadType = LoadType;

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

const SalesOrderState = {
  draft: "draft",
  confirmed: "confirmed",
  shipped: "shipped",
  closed: "closed",
  cancelled: "cancelled",
}
exports.SalesOrderState = SalesOrderState;

const ShipmentState = {
  draft: "draft",
  booked: "booked",
  closed: "closed",
  cancelled: "cancelled",
}
exports.ShipmentState = ShipmentState;

const TransportMode = {
  sea: "sea",
  air: "air",
  courier: "courier",
  road: "road",
}
exports.TransportMode = TransportMode;

const UserStatus = {
  invited: "invited",
  active: "active",
  suspended: "suspended",
}
exports.UserStatus = UserStatus;

const connectorConfig = {
  connector: 'customer',
  service: 'basis',
  location: 'europe-west1'
};
exports.connectorConfig = connectorConfig;

const customerMeRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerMe');
}
customerMeRef.operationName = 'CustomerMe';
exports.customerMeRef = customerMeRef;

exports.customerMe = function customerMe(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerMeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerQuotesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerQuotes');
}
customerQuotesRef.operationName = 'CustomerQuotes';
exports.customerQuotesRef = customerQuotesRef;

exports.customerQuotes = function customerQuotes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerQuotesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerQuoteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerQuote', inputVars);
}
customerQuoteRef.operationName = 'CustomerQuote';
exports.customerQuoteRef = customerQuoteRef;

exports.customerQuote = function customerQuote(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(customerQuoteRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerOrdersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerOrders');
}
customerOrdersRef.operationName = 'CustomerOrders';
exports.customerOrdersRef = customerOrdersRef;

exports.customerOrders = function customerOrders(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerOrdersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerOrderRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerOrder', inputVars);
}
customerOrderRef.operationName = 'CustomerOrder';
exports.customerOrderRef = customerOrderRef;

exports.customerOrder = function customerOrder(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(customerOrderRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerShipmentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerShipments');
}
customerShipmentsRef.operationName = 'CustomerShipments';
exports.customerShipmentsRef = customerShipmentsRef;

exports.customerShipments = function customerShipments(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerShipmentsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerShipmentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerShipment', inputVars);
}
customerShipmentRef.operationName = 'CustomerShipment';
exports.customerShipmentRef = customerShipmentRef;

exports.customerShipment = function customerShipment(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(customerShipmentRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerShipmentLinesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerShipmentLines', inputVars);
}
customerShipmentLinesRef.operationName = 'CustomerShipmentLines';
exports.customerShipmentLinesRef = customerShipmentLinesRef;

exports.customerShipmentLines = function customerShipmentLines(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(customerShipmentLinesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerInvoicesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerInvoices');
}
customerInvoicesRef.operationName = 'CustomerInvoices';
exports.customerInvoicesRef = customerInvoicesRef;

exports.customerInvoices = function customerInvoices(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerInvoicesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerSampleRequestsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerSampleRequests');
}
customerSampleRequestsRef.operationName = 'CustomerSampleRequests';
exports.customerSampleRequestsRef = customerSampleRequestsRef;

exports.customerSampleRequests = function customerSampleRequests(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerSampleRequestsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerTeamRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerTeam');
}
customerTeamRef.operationName = 'CustomerTeam';
exports.customerTeamRef = customerTeamRef;

exports.customerTeam = function customerTeam(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerTeamRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerInvitationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerInvitations');
}
customerInvitationsRef.operationName = 'CustomerInvitations';
exports.customerInvitationsRef = customerInvitationsRef;

exports.customerInvitations = function customerInvitations(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerInvitationsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerAddressesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerAddresses');
}
customerAddressesRef.operationName = 'CustomerAddresses';
exports.customerAddressesRef = customerAddressesRef;

exports.customerAddresses = function customerAddresses(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerAddressesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const customerCountriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'CustomerCountries');
}
customerCountriesRef.operationName = 'CustomerCountries';
exports.customerCountriesRef = customerCountriesRef;

exports.customerCountries = function customerCountries(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(customerCountriesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
