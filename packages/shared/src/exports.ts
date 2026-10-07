import type { Role } from './access';
import { canViewCosts } from './access';

// Ledger exports: one definition per ledger, shared by the function that
// renders CSV and XLSX and by the sample interface that renders CSV in the
// browser. Columns marked `cost` are left out for roles without cost access,
// in the data, not in the file's styling.

export type ExportFormat = 'csv' | 'xlsx';
export const EXPORT_FORMATS: readonly ExportFormat[] = ['csv', 'xlsx'];

export interface ExportColumn {
  readonly key: string;
  readonly label: string;
  /** Numbers are written as numbers; everything else as text. */
  readonly kind?: 'text' | 'number' | 'date';
  readonly cost?: boolean;
}

export interface LedgerDefinition {
  readonly key: ExportLedger;
  readonly title: string;
  readonly columns: readonly ExportColumn[];
  /** Query-string filters the ledger accepts: `run`, `po`, `lot`. */
  readonly scopes: readonly ('run' | 'po' | 'lot')[];
}

export const EXPORT_LEDGERS = ['purchase-orders', 'purchase-order-lines', 'production-runs', 'lots', 'rolls', 'handling-units', 'skus', 'shipments', 'stock'] as const;
export type ExportLedger = (typeof EXPORT_LEDGERS)[number];

export function isExportLedger(value: string): value is ExportLedger {
  return (EXPORT_LEDGERS as readonly string[]).includes(value);
}

export const LEDGERS: Record<ExportLedger, LedgerDefinition> = {
  'purchase-orders': {
    key: 'purchase-orders',
    title: 'Purchase orders',
    scopes: [],
    columns: [
      { key: 'number', label: 'Order' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'state', label: 'State' },
      { key: 'currency', label: 'Currency' },
      { key: 'incoterm', label: 'Incoterm' },
      { key: 'namedPlace', label: 'Named place' },
      { key: 'issuedOn', label: 'Issued', kind: 'date' },
      { key: 'confirmedOn', label: 'Confirmed', kind: 'date' },
      { key: 'requestedExFactory', label: 'Requested ex-factory', kind: 'date' },
      { key: 'lines', label: 'Lines', kind: 'number' },
      { key: 'quantityM', label: 'Quantity (m)', kind: 'number' },
      { key: 'amount', label: 'Amount', kind: 'number', cost: true },
      { key: 'paymentTerms', label: 'Payment terms' },
    ],
  },
  'purchase-order-lines': {
    key: 'purchase-order-lines',
    title: 'Purchase order lines',
    scopes: ['po'],
    columns: [
      { key: 'order', label: 'Order' },
      { key: 'lineNo', label: 'Line', kind: 'number' },
      { key: 'sku', label: 'SKU' },
      { key: 'product', label: 'Product' },
      { key: 'variant', label: 'Variant' },
      { key: 'shade', label: 'Shade' },
      { key: 'quantityM', label: 'Quantity (m)', kind: 'number' },
      { key: 'overTolerance', label: 'Over %', kind: 'number' },
      { key: 'underTolerance', label: 'Under %', kind: 'number' },
      { key: 'unitPrice', label: 'Unit price', kind: 'number', cost: true },
      { key: 'amount', label: 'Amount', kind: 'number', cost: true },
      { key: 'currency', label: 'Currency', cost: true },
    ],
  },
  'production-runs': {
    key: 'production-runs',
    title: 'Production runs',
    scopes: ['po'],
    columns: [
      { key: 'number', label: 'Run' },
      { key: 'order', label: 'Order' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'template', label: 'Process' },
      { key: 'state', label: 'State' },
      { key: 'health', label: 'Health' },
      { key: 'plannedStart', label: 'Planned start', kind: 'date' },
      { key: 'plannedEnd', label: 'Planned end', kind: 'date' },
      { key: 'forecastEnd', label: 'Expected end', kind: 'date' },
      { key: 'actualEnd', label: 'Actual end', kind: 'date' },
      { key: 'progress', label: 'Progress %', kind: 'number' },
      { key: 'quantityM', label: 'Quantity (m)', kind: 'number' },
      { key: 'producedM', label: 'Produced (m)', kind: 'number' },
      { key: 'readyM', label: 'Ready to ship (m)', kind: 'number' },
    ],
  },
  lots: {
    key: 'lots',
    title: 'Lots',
    scopes: ['run'],
    columns: [
      { key: 'number', label: 'Lot' },
      { key: 'run', label: 'Run' },
      { key: 'order', label: 'Order' },
      { key: 'sku', label: 'SKU' },
      { key: 'product', label: 'Product' },
      { key: 'shade', label: 'Shade' },
      { key: 'millLotRef', label: 'Mill lot' },
      { key: 'producedOn', label: 'Produced', kind: 'date' },
      { key: 'reportedM', label: 'Reported (m)', kind: 'number' },
      { key: 'measuredM', label: 'Measured (m)', kind: 'number' },
      { key: 'rolls', label: 'Rolls', kind: 'number' },
      { key: 'packedRolls', label: 'Packed rolls', kind: 'number' },
      { key: 'quality', label: 'Quality' },
      { key: 'readyM', label: 'Ready to ship (m)', kind: 'number' },
    ],
  },
  rolls: {
    key: 'rolls',
    title: 'Rolls',
    scopes: ['run', 'lot'],
    columns: [
      { key: 'number', label: 'Roll' },
      { key: 'lot', label: 'Lot' },
      { key: 'sku', label: 'SKU' },
      { key: 'shade', label: 'Shade' },
      { key: 'lengthM', label: 'Length (m)', kind: 'number' },
      { key: 'usableWidthCm', label: 'Usable width (cm)', kind: 'number' },
      { key: 'weightKg', label: 'Weight (kg)', kind: 'number' },
      { key: 'grade', label: 'Grade' },
      { key: 'defectPoints', label: 'Defect points', kind: 'number' },
      { key: 'packedIn', label: 'Packed in' },
    ],
  },
  'handling-units': {
    key: 'handling-units',
    title: 'Cartons and pallets',
    scopes: ['run'],
    columns: [
      { key: 'number', label: 'Unit' },
      { key: 'run', label: 'Run' },
      { key: 'kind', label: 'Kind' },
      { key: 'marks', label: 'Marks' },
      { key: 'lots', label: 'Lots' },
      { key: 'skus', label: 'SKUs' },
      { key: 'rolls', label: 'Rolls', kind: 'number' },
      { key: 'quantityM', label: 'Metres', kind: 'number' },
      { key: 'lengthCm', label: 'L (cm)', kind: 'number' },
      { key: 'widthCm', label: 'W (cm)', kind: 'number' },
      { key: 'heightCm', label: 'H (cm)', kind: 'number' },
      { key: 'cbm', label: 'CBM', kind: 'number' },
      { key: 'grossKg', label: 'Gross (kg)', kind: 'number' },
      { key: 'netKg', label: 'Net (kg)', kind: 'number' },
      { key: 'packedOn', label: 'Packed', kind: 'date' },
    ],
  },
  shipments: {
    key: 'shipments',
    title: 'Shipments',
    scopes: [],
    columns: [
      { key: 'number', label: 'Shipment' },
      { key: 'state', label: 'State' },
      { key: 'stage', label: 'Stage' },
      { key: 'health', label: 'Health' },
      { key: 'flow', label: 'Flow' },
      { key: 'mode', label: 'Mode' },
      { key: 'incoterm', label: 'Incoterm' },
      { key: 'origin', label: 'Origin' },
      { key: 'destination', label: 'Destination' },
      { key: 'forwarder', label: 'Forwarder' },
      { key: 'etd', label: 'ETD', kind: 'date' },
      { key: 'eta', label: 'ETA', kind: 'date' },
      { key: 'plannedEta', label: 'Planned ETA', kind: 'date' },
      { key: 'orders', label: 'Orders' },
      { key: 'cartons', label: 'Cartons', kind: 'number' },
      { key: 'rolls', label: 'Rolls', kind: 'number' },
      { key: 'quantityM', label: 'Metres', kind: 'number' },
      { key: 'cbm', label: 'CBM', kind: 'number' },
      { key: 'grossKg', label: 'Gross (kg)', kind: 'number' },
    ],
  },
  stock: {
    key: 'stock',
    title: 'Stock',
    scopes: [],
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'product', label: 'Product' },
      { key: 'shade', label: 'Shade' },
      { key: 'lot', label: 'Lot' },
      { key: 'location', label: 'Place' },
      { key: 'quantityM', label: 'On hand (m)', kind: 'number' },
      { key: 'rolls', label: 'Rolls', kind: 'number' },
      { key: 'landedUnitCost', label: 'Landed cost per m', kind: 'number', cost: true },
      { key: 'updated', label: 'Updated', kind: 'date' },
    ],
  },
  skus: {
    key: 'skus',
    title: 'SKUs',
    scopes: [],
    columns: [
      { key: 'code', label: 'SKU' },
      { key: 'product', label: 'Product' },
      { key: 'variant', label: 'Variant' },
      { key: 'shade', label: 'Shade' },
      { key: 'shadeCode', label: 'Shade code' },
      { key: 'putUp', label: 'Put-up' },
      { key: 'status', label: 'Status' },
      { key: 'public', label: 'On the website' },
      { key: 'rollTracking', label: 'Roll tracking' },
    ],
  },
};

export type ExportValue = string | number | null;
export type ExportRow = Record<string, ExportValue>;

/** The columns a role receives: cost columns only with cost access. */
export function columnsFor(ledger: ExportLedger, role: Role): readonly ExportColumn[] {
  return LEDGERS[ledger].columns.filter((column) => !column.cost || canViewCosts(role));
}

function csvCell(value: ExportValue): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'number' ? String(value) : value;
  // Quote when the text carries a separator, a quote or a line break; double
  // the quotes inside. A leading formula character is neutralised so a sheet
  // never executes what a mill typed into a reference.
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/** RFC 4180 with CRLF and a UTF-8 byte-order mark, which is what spreadsheets open cleanly. */
export function toCsv(columns: readonly ExportColumn[], rows: readonly ExportRow[]): string {
  const lines = [columns.map((column) => csvCell(column.label)).join(',')];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column.key] ?? null)).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** Fixed-point thousandths to a plain number for a spreadsheet cell. */
export function metresNumber(stored: string | bigint | null | undefined): number | null {
  if (stored === null || stored === undefined) return null;
  return Number(BigInt(stored)) / 1000;
}

export function exportFilename(ledger: ExportLedger, format: ExportFormat, scope?: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `basis-${ledger}${scope ? `-${scope}` : ''}-${stamp}.${format}`;
}
