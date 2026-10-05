// Human-readable document numbers: PO-26-0041, SHP-26-0014.
// The sequence value is allocated inside the transaction that creates the document.

export const SEQUENCE_PREFIXES = {
  purchaseOrder: 'PO',
  productionRun: 'RUN',
  inspection: 'INS',
  correctiveAction: 'CAR',
  shipment: 'SHP',
  quotation: 'QTN',
  rfq: 'RFQ',
  quote: 'QUO',
  salesOrder: 'SO',
  sampleRequest: 'SMP',
  lot: 'LOT',
} as const;

export type SequenceKey = keyof typeof SEQUENCE_PREFIXES;

export interface BusinessNumber {
  readonly prefix: string;
  readonly year: number;
  readonly sequence: number;
}

const MIN_SEQUENCE_DIGITS = 4;
const PATTERN = /^([A-Z]{2,4})-(\d{2})-(\d{4,})$/;

export function formatBusinessNumber({ prefix, year, sequence }: BusinessNumber): string {
  if (!/^[A-Z]{2,4}$/.test(prefix)) throw new RangeError(`Invalid prefix: "${prefix}"`);
  if (!Number.isInteger(sequence) || sequence < 1) throw new RangeError(`Invalid sequence: ${sequence}`);
  const shortYear = String(year % 100).padStart(2, '0');
  return `${prefix}-${shortYear}-${String(sequence).padStart(MIN_SEQUENCE_DIGITS, '0')}`;
}

export function parseBusinessNumber(text: string): BusinessNumber | null {
  const match = PATTERN.exec(text.trim().toUpperCase());
  if (!match) return null;
  return { prefix: match[1] ?? '', year: 2000 + Number(match[2]), sequence: Number(match[3]) };
}

export function isBusinessNumber(text: string): boolean {
  return parseBusinessNumber(text) !== null;
}
