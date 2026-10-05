const { queryRef, executeQuery, validateArgsWithOptions, validateArgs } = require('firebase/data-connect');

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

const connectorConfig = {
  connector: 'public',
  service: 'basis',
  location: 'europe-west1'
};
exports.connectorConfig = connectorConfig;

const listCountriesPublicRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCountriesPublic');
}
listCountriesPublicRef.operationName = 'ListCountriesPublic';
exports.listCountriesPublicRef = listCountriesPublicRef;

exports.listCountriesPublic = function listCountriesPublic(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCountriesPublicRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
