import {
  MONEY_DECIMALS,
  QUANTITY_DECIMALS,
  availableToShip,
  cubicMetresMilli,
  formatFixed,
  formatLocalDate,
  lotQuantities,
  type LocalDate,
} from '@basis/shared';
import PDFDocument from 'pdfkit';
import { failure, graphql } from './lib';

// The documents BASIS puts in front of a supplier, a forwarder or a roll:
// purchase order, packing list, roll labels. Rendered from the same records
// the screens read, in the brand's own type, with nothing retyped.

// The bundle is CommonJS; the font files ship with their packages.
const font = (pkg: string, file: string) => require.resolve(`@fontsource/${pkg}/files/${file}`);
const FONTS = {
  brand: font('archivo', 'archivo-latin-700-normal.woff'),
  display: font('eb-garamond', 'eb-garamond-latin-400-normal.woff'),
  displayMedium: font('eb-garamond', 'eb-garamond-latin-500-normal.woff'),
  displayItalic: font('eb-garamond', 'eb-garamond-latin-400-italic.woff'),
  sans: font('source-sans-3', 'source-sans-3-latin-400-normal.woff'),
  sansBold: font('source-sans-3', 'source-sans-3-latin-600-normal.woff'),
  mono: font('martian-mono', 'martian-mono-latin-400-normal.woff'),
};

const INK = '#2B2724';
const MUTED = '#6F655C';
const LINE = '#E3D8C8';
const LINE_SOFT = '#ECE5D9';
const BONE = '#F3EEE6';
const COCOA = '#6B4F3F';

const MARGIN = { top: 92, bottom: 64, left: 48, right: 48 };

type Doc = PDFKit.PDFDocument;

const thousands = (value: bigint, decimals: number, digits: number) => {
  const text = formatFixed(value, decimals, digits);
  const [whole, fraction] = text.split('.');
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
};
const metres = (stored: string | bigint, digits = 1) => `${thousands(BigInt(stored), QUANTITY_DECIMALS, digits)} m`;
const money = (stored: string | bigint, currency: string) => `${thousands(BigInt(stored), MONEY_DECIMALS, 2)} ${currency}`;
const date = (value: string | null | undefined) => (value ? formatLocalDate(value as LocalDate) : '—');
const kilos = (grams: number | null | undefined) => (grams === null || grams === undefined ? '—' : `${(grams / 1000).toFixed(1)} kg`);
const cbm = (milli: number | null) => (milli === null ? '—' : (milli / 1000).toFixed(3));

interface Page {
  readonly kind: string;
  readonly number: string;
  readonly issuer: string;
}

const pageWidth = (doc: Doc) => doc.page.width;
const pageHeight = (doc: Doc) => doc.page.height;
const contentWidth = (doc: Doc) => pageWidth(doc) - MARGIN.left - MARGIN.right;
const bottomOf = (doc: Doc) => pageHeight(doc) - MARGIN.bottom;

function open(page: Page, options: { size?: [number, number] | 'A4'; landscape?: boolean; margins?: typeof MARGIN } = {}): { doc: Doc; finish: () => Promise<Buffer> } {
  const doc = new PDFDocument({
    size: options.size ?? 'A4',
    layout: options.landscape ? 'landscape' : 'portrait',
    margins: options.margins ?? MARGIN,
    bufferPages: true,
    info: { Title: `${page.kind} ${page.number}`, Author: 'BASIS INC.', Creator: 'BASIS platform' },
  });
  for (const [name, path] of Object.entries(FONTS)) doc.registerFont(name, path);
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return {
    doc,
    finish: async () => {
      doc.end();
      return done;
    },
  };
}

/** The band on every page of a document, and the page numbers once all pages exist. */
function chrome(doc: Doc, page: Page): () => void {
  const band = () => {
    const { left, right } = MARGIN;
    const width = contentWidth(doc);
    doc.save();
    doc.font('brand').fontSize(13).fillColor(INK).text('BASIS', left, 40, { characterSpacing: 2.6, lineBreak: false });
    doc.font('sans').fontSize(7).fillColor(MUTED).text('INC.', left + 58, 44, { characterSpacing: 1.2, lineBreak: false });
    doc.font('display').fontSize(11).fillColor(MUTED).text(page.kind.toUpperCase(), left, 38, { width, align: 'right', characterSpacing: 1.6, lineBreak: false });
    doc.font('mono').fontSize(9).fillColor(INK).text(page.number, left, 54, { width, align: 'right', lineBreak: false });
    doc.moveTo(left, 72).lineTo(pageWidth(doc) - right, 72).lineWidth(0.6).strokeColor(INK).stroke();
    doc.restore();
  };
  band();
  doc.on('pageAdded', band);
  return () => {
    const range = doc.bufferedPageRange();
    const generated = new Date().toISOString().slice(0, 10);
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      // The footer sits inside the bottom margin; without this PDFKit would
      // start a new page for it.
      const margins = doc.page.margins;
      doc.page.margins = { ...margins, bottom: 0 };
      const y = pageHeight(doc) - 40;
      const { left, right } = MARGIN;
      const width = contentWidth(doc);
      doc.save();
      doc.moveTo(left, y - 10).lineTo(pageWidth(doc) - right, y - 10).lineWidth(0.4).strokeColor(LINE).stroke();
      doc.font('sans').fontSize(7.5).fillColor(MUTED);
      doc.text(page.issuer, left, y, { lineBreak: false });
      doc.text(`Page ${index - range.start + 1} of ${range.count}`, left, y, { width, align: 'center', lineBreak: false });
      doc.text(`Generated ${generated} by the BASIS platform`, left, y, { width, align: 'right', lineBreak: false });
      doc.restore();
      doc.page.margins = margins;
    }
  };
}

function title(doc: Doc, text: string, meta?: string): void {
  doc.font('display').fontSize(26).fillColor(INK).text(text, MARGIN.left, MARGIN.top, { lineBreak: false });
  if (meta) doc.font('sans').fontSize(9.5).fillColor(MUTED).text(meta, MARGIN.left, MARGIN.top + 32, { width: contentWidth(doc), height: 12, ellipsis: true });
  doc.y = MARGIN.top + (meta ? 54 : 40);
}

function label(doc: Doc, text: string, x: number, y: number): void {
  doc.font('display').fontSize(8).fillColor(MUTED).text(text.toUpperCase(), x, y, { characterSpacing: 1.4, lineBreak: false });
}

/** Label-over-value facts in a strip, the way the sheets show them. Weights share the width. */
function facts(doc: Doc, items: { label: string; value: string }[], weights?: number[]): void {
  const { left } = MARGIN;
  const width = contentWidth(doc);
  const share = weights ?? items.map(() => 1);
  const total = share.reduce((sum, weight) => sum + weight, 0);
  const top = doc.y + 8;
  const height = 36;
  doc.save();
  doc.rect(left, top, width, height).fillColor(BONE).fill();
  doc.restore();
  let x = left;
  items.forEach((item, index) => {
    const column = (width * (share[index] ?? 1)) / total;
    label(doc, item.label, x + 10, top + 7);
    doc.font('display').fontSize(11.5).fillColor(INK).text(item.value, x + 10, top + 19, { width: column - 16, height: 13, ellipsis: true });
    x += column;
  });
  doc.y = top + height + 14;
}

function block(doc: Doc, heading: string, lines: readonly string[], x: number, y: number, width: number): number {
  label(doc, heading, x, y);
  let cursor = y + 13;
  lines
    .filter((line) => line.trim())
    .forEach((line, index) => {
      doc.font(index === 0 ? 'sansBold' : 'sans').fontSize(9.5).fillColor(INK).text(line, x, cursor, { width, height: 12, ellipsis: true });
      cursor += 13;
    });
  return cursor;
}

interface Column {
  readonly key: string;
  readonly label: string;
  readonly width: number;
  readonly align?: 'left' | 'right';
  readonly font?: 'sans' | 'mono' | 'sansBold';
}

type Cell = string | { readonly main: string; readonly sub?: string };

const GAP = 6;
const SIZE: Record<NonNullable<Column['font']>, number> = { sans: 8.5, sansBold: 8.5, mono: 7.5 };

/** A ruled ledger that continues on the next page under its own header. */
function table(doc: Doc, columns: readonly Column[], rows: readonly Record<string, Cell>[], options: { total?: Record<string, Cell>; caption?: string } = {}): void {
  const { left } = MARGIN;
  const positions: number[] = [];
  let x = left;
  for (const column of columns) {
    positions.push(x);
    x += column.width;
  }
  const header = () => {
    const y = doc.y;
    doc.font('display').fontSize(7).fillColor(MUTED);
    columns.forEach((column, index) => {
      doc.text(column.label.toUpperCase(), positions[index]!, y, { width: column.width - GAP, align: column.align ?? 'left', characterSpacing: 0.8, lineBreak: false });
    });
    doc.moveTo(left, y + 12).lineTo(x, y + 12).lineWidth(0.6).strokeColor(INK).stroke();
    doc.y = y + 17;
  };
  const cellOf = (cell: Cell | undefined) => (typeof cell === 'string' ? { main: cell } : (cell ?? { main: '' }));
  const heightOf = (row: Record<string, Cell>) =>
    Math.max(
      ...columns.map((column) => {
        const cell = cellOf(row[column.key]);
        const face = column.font ?? 'sans';
        doc.font(face).fontSize(SIZE[face]);
        const main = doc.heightOfString(cell.main, { width: column.width - GAP });
        doc.font('sans').fontSize(7.5);
        const sub = cell.sub ? doc.heightOfString(cell.sub, { width: column.width - GAP }) : 0;
        return main + sub;
      }),
    ) + 9;
  const draw = (row: Record<string, Cell>, height: number, strong = false) => {
    const y = doc.y;
    columns.forEach((column, index) => {
      const cell = cellOf(row[column.key]);
      const face = strong ? 'sansBold' : (column.font ?? 'sans');
      doc.font(face).fontSize(SIZE[face]).fillColor(INK);
      doc.text(cell.main, positions[index]!, y + 4.5, { width: column.width - GAP, align: column.align ?? 'left' });
      if (cell.sub) {
        doc.font('sans').fontSize(7.5).fillColor(MUTED);
        doc.text(cell.sub, positions[index]!, doc.y, { width: column.width - GAP, align: column.align ?? 'left' });
      }
    });
    doc.y = y + height;
    doc.moveTo(left, doc.y).lineTo(x, doc.y).lineWidth(0.4).strokeColor(strong ? INK : LINE_SOFT).stroke();
  };
  const room = (height: number) => {
    if (doc.y + height > bottomOf(doc)) {
      doc.addPage();
      doc.y = MARGIN.top;
      header();
    }
  };

  if (options.caption) {
    if (doc.y + 60 > bottomOf(doc)) {
      doc.addPage();
      doc.y = MARGIN.top;
    }
    label(doc, options.caption, left, doc.y);
    doc.y += 16;
  }
  header();
  for (const row of rows) {
    const height = heightOf(row);
    room(height);
    draw(row, height);
  }
  if (options.total) {
    const height = heightOf(options.total);
    room(height);
    draw(options.total, height, true);
  }
  doc.y += 14;
}

function paragraph(doc: Doc, heading: string, text: string): void {
  if (!text.trim()) return;
  doc.font('sans').fontSize(9.5);
  const height = doc.heightOfString(text, { width: contentWidth(doc) }) + 28;
  if (doc.y + height > bottomOf(doc)) {
    doc.addPage();
    doc.y = MARGIN.top;
  }
  label(doc, heading, MARGIN.left, doc.y);
  doc.y += 14;
  doc.font('sans').fontSize(9.5).fillColor(INK).text(text, MARGIN.left, doc.y, { width: contentWidth(doc), lineGap: 2 });
  doc.y += 14;
}

type Address = { addressLine1?: string | null; addressLine2?: string | null; city?: string | null; region?: string | null; postalCode?: string | null; country?: { name: string } | null } | null | undefined;
const addressLines = (location: Address): string[] =>
  location ? [location.addressLine1 ?? '', location.addressLine2 ?? '', [location.postalCode, location.city, location.region].filter(Boolean).join(' '), location.country?.name ?? ''] : [];

// ---------------------------------------------------------------- purchase order

interface PoRow {
  number: string;
  state: string;
  version: number;
  currency: string;
  namedPlace: string | null;
  paymentTerms: string | null;
  issuedOn: string | null;
  confirmedOn: string | null;
  requestedExFactory: string | null;
  notes: string | null;
  legalEntity: { name: string; taxId: string | null; country: { name: string } } | null;
  supplier: { legalName: string; tradingName: string | null; registrationId: string | null; taxId: string | null; country: { name: string } | null; locations_on_company: NonNullable<Address>[] };
  factory: { location: NonNullable<Address> & { name: string } } | null;
  incoterm: { code: string } | null;
  purchaseOrderLines_on_purchaseOrder: { lineNo: number; quantity: string; uom: string; unitPrice: string; overTolerancePercent: number | null; underTolerancePercent: number | null; requestedExFactory: string | null; sku: { code: string; product: { code: string; name: string }; variant: { name: string; widthCm: number | null }; shade: { code: string; name: string } } }[];
  paymentMilestones_on_purchaseOrder: { label: string; percent: number | null; amount: string | null; trigger: string; dueOn: string | null; paidOn: string | null }[];
}

const TRIGGER_WORDS: Record<string, string> = { on_order: 'On order', before_shipment: 'Before shipment', after_bl: 'Against BL copy', on_arrival: 'On arrival', on_date: 'On the date' };
const TRIGGER_ORDER = ['on_order', 'before_shipment', 'after_bl', 'on_arrival', 'on_date'];

export async function renderPurchaseOrder(number: string): Promise<{ pdf: Buffer; filename: string }> {
  const { purchaseOrders } = await graphql<{ purchaseOrders: PoRow[] }>(
    `query ($number: String!) { purchaseOrders(where: { number: { eq: $number } }, limit: 1) {
       number state version currency namedPlace paymentTerms issuedOn confirmedOn requestedExFactory notes
       legalEntity { name taxId country { name } }
       supplier { legalName tradingName registrationId taxId country { name } locations_on_company(limit: 1) { addressLine1 addressLine2 city region postalCode country { name } } }
       factory { location { name addressLine1 addressLine2 city region postalCode country { name } } }
       incoterm { code }
       purchaseOrderLines_on_purchaseOrder(orderBy: { lineNo: ASC }) { lineNo quantity uom unitPrice overTolerancePercent underTolerancePercent requestedExFactory sku { code product { code name } variant { name widthCm } shade { code name } } }
       paymentMilestones_on_purchaseOrder { label percent amount trigger dueOn paidOn } } }`,
    { number },
  );
  const po = purchaseOrders[0];
  if (!po) throw failure('not_found', `No purchase order ${number}.`);
  if (po.state === 'draft') throw failure('invariant_violation', 'A draft has no document yet; issue the order first.');

  const issuer = po.legalEntity?.name ?? 'BASIS INC.';
  const page = { kind: 'Purchase order', number: po.number, issuer };
  const { doc, finish } = open(page);
  const paginate = chrome(doc, page);

  title(doc, `Purchase order ${po.number}`, `${po.state === 'cancelled' ? 'Cancelled · ' : ''}Version ${po.version} · Issued ${date(po.issuedOn)}${po.confirmedOn ? ` · Confirmed ${date(po.confirmedOn)}` : ''}`);

  const half = (contentWidth(doc) - 24) / 2;
  const top = doc.y + 6;
  const supplierLines = [po.supplier.legalName, po.supplier.tradingName && po.supplier.tradingName !== po.supplier.legalName ? po.supplier.tradingName : '', ...addressLines(po.supplier.locations_on_company[0]), po.supplier.registrationId ? `Reg. ${po.supplier.registrationId}` : '', po.supplier.taxId ? `Tax ${po.supplier.taxId}` : ''];
  let leftEnd = block(doc, 'Supplier', supplierLines, MARGIN.left, top, half);
  if (po.factory) leftEnd = block(doc, 'Factory', [po.factory.location.name, ...addressLines(po.factory.location)], MARGIN.left, leftEnd + 8, half);
  const buyerLines = [issuer, po.legalEntity?.country.name ?? '', po.legalEntity?.taxId ? `Tax ${po.legalEntity.taxId}` : ''];
  let rightEnd = block(doc, 'Buyer', buyerLines, MARGIN.left + half + 24, top, half);
  rightEnd = block(doc, 'Delivery terms', [[po.incoterm?.code, po.namedPlace].filter(Boolean).join(' ') || 'As agreed', po.requestedExFactory ? `Requested ex-factory ${date(po.requestedExFactory)}` : ''], MARGIN.left + half + 24, rightEnd + 8, half);
  doc.y = Math.max(leftEnd, rightEnd) + 4;

  const totalQuantity = po.purchaseOrderLines_on_purchaseOrder.reduce((sum, line) => sum + BigInt(line.quantity), 0n);
  facts(
    doc,
    [
      { label: 'Currency', value: po.currency },
      { label: 'Payment terms', value: po.paymentTerms || 'As agreed' },
      { label: 'Lines', value: String(po.purchaseOrderLines_on_purchaseOrder.length) },
      { label: 'Total quantity', value: metres(totalQuantity, 0) },
    ],
    [0.8, 2.4, 0.7, 1.1],
  );

  const width = contentWidth(doc);
  const columns: Column[] = [
    { key: 'no', label: 'No.', width: 26, font: 'mono' },
    { key: 'sku', label: 'SKU', width: 86, font: 'mono' },
    { key: 'description', label: 'Description', width: width - 26 - 86 - 62 - 66 - 74 - 80 },
    { key: 'quantity', label: 'Quantity', width: 62, align: 'right' },
    { key: 'tolerance', label: 'Tolerance', width: 66, align: 'right' },
    { key: 'price', label: 'Unit price', width: 74, align: 'right' },
    { key: 'amount', label: 'Amount', width: 80, align: 'right' },
  ];
  let total = 0n;
  const rows = po.purchaseOrderLines_on_purchaseOrder.map((line) => {
    const amount = (BigInt(line.unitPrice) * BigInt(line.quantity)) / 10n ** BigInt(QUANTITY_DECIMALS);
    total += amount;
    return {
      no: String(line.lineNo).padStart(2, '0'),
      sku: line.sku.code,
      description: { main: `${line.sku.product.name}, ${line.sku.variant.name}`, sub: `${line.sku.shade.name} (${line.sku.shade.code})${line.sku.variant.widthCm ? ` · ${line.sku.variant.widthCm} cm` : ''}${line.requestedExFactory ? ` · ex-factory ${date(line.requestedExFactory)}` : ''}` },
      quantity: `${thousands(BigInt(line.quantity), QUANTITY_DECIMALS, 0)} ${line.uom}`,
      tolerance: line.overTolerancePercent === null && line.underTolerancePercent === null ? '—' : `+${line.overTolerancePercent ?? 0}% / −${line.underTolerancePercent ?? 0}%`,
      price: `${formatFixed(BigInt(line.unitPrice), MONEY_DECIMALS, 4)} / ${line.uom}`,
      amount: thousands(amount, MONEY_DECIMALS, 2),
    };
  });
  table(doc, columns, rows, { total: { description: `Total, ${po.currency}`, quantity: `${thousands(totalQuantity, QUANTITY_DECIMALS, 0)} ${po.purchaseOrderLines_on_purchaseOrder[0]?.uom ?? 'm'}`, amount: thousands(total, MONEY_DECIMALS, 2) } });

  const payments = [...po.paymentMilestones_on_purchaseOrder].sort((a, b) => TRIGGER_ORDER.indexOf(a.trigger) - TRIGGER_ORDER.indexOf(b.trigger));
  if (payments.length > 0) {
    table(
      doc,
      [
        { key: 'label', label: 'Payment', width: 180 },
        { key: 'trigger', label: 'Falls due', width: 130 },
        { key: 'due', label: 'Due on', width: 90 },
        { key: 'amount', label: 'Amount', width: width - 400, align: 'right' },
      ],
      payments.map((payment) => ({
        label: payment.label,
        trigger: TRIGGER_WORDS[payment.trigger] ?? payment.trigger,
        due: date(payment.dueOn),
        amount: payment.amount ? money(payment.amount, po.currency) : payment.percent !== null ? `${payment.percent}%` : '—',
      })),
      { caption: 'Payment schedule' },
    );
  }

  paragraph(doc, 'Notes', po.notes ?? '');
  paragraph(
    doc,
    'Terms',
    `Quantities are in ${po.purchaseOrderLines_on_purchaseOrder[0]?.uom ?? 'm'} within the stated tolerances. Each lot is subject to inspection against the BASIS specification and the approved shade standard before release. Prices on this document are confidential to the parties.`,
  );

  // Signatures, kept together on one page.
  if (doc.y + 90 > bottomOf(doc)) {
    doc.addPage();
    doc.y = MARGIN.top;
  }
  const signY = doc.y + 30;
  for (const [index, party] of [`For ${issuer}`, `For ${po.supplier.legalName}`].entries()) {
    const x = MARGIN.left + index * (half + 24);
    doc.moveTo(x, signY + 28).lineTo(x + half, signY + 28).lineWidth(0.5).strokeColor(INK).stroke();
    doc.font('sans').fontSize(8.5).fillColor(MUTED).text(party, x, signY + 33, { width: half, lineBreak: false });
    doc.text('Name, date', x, signY + 45, { width: half, lineBreak: false });
  }

  paginate();
  return { pdf: await finish(), filename: `${po.number}-purchase-order-v${po.version}.pdf` };
}

// ---------------------------------------------------------------- packing list

interface RunRow {
  number: string;
  state: string;
  purchaseOrder: { number: string; supplier: { legalName: string; tradingName: string | null }; incoterm: { code: string } | null; namedPlace: string | null; legalEntity: { name: string } | null };
  factory: { location: { name: string; city: string | null; country: { name: string } | null } } | null;
  lots_on_run: { number: string; qualityState: 'pending' | 'on_hold' | 'released' | 'rejected'; sku: { code: string; product: { name: string }; shade: { name: string } }; rolls_on_lot: { number: string; rollNo: number; measuredLength: string; handlingUnitContents_on_roll: { handlingUnit: { number: string } }[] }[]; handlingUnitContents_on_lot: { quantity: string | null; handlingUnit: { number: string } }[] }[];
  handlingUnits_on_run: { number: string; kind: string; marks: string | null; lengthCm: number | null; widthCm: number | null; heightCm: number | null; grossWeightG: number | null; netWeightG: number | null; packedOn: string | null; parent: { number: string } | null; handlingUnitContents_on_handlingUnit: { quantity: string | null; roll: { number: string; rollNo: number; measuredLength: string; lot: { number: string; sku: { code: string } } } | null; lot: { number: string; sku: { code: string } } | null }[] }[];
}

const QUALITY_WORDS = { pending: 'Awaiting inspection', on_hold: 'On hold', released: 'Released', rejected: 'Rejected' } as const;

export async function renderPackingList(runNumber: string): Promise<{ pdf: Buffer; filename: string }> {
  const { productionRuns } = await graphql<{ productionRuns: RunRow[] }>(
    `query ($number: String!) { productionRuns(where: { number: { eq: $number } }, limit: 1) {
       number state
       purchaseOrder { number namedPlace supplier { legalName tradingName } incoterm { code } legalEntity { name } }
       factory { location { name city country { name } } }
       lots_on_run(orderBy: { createdAt: ASC }) { number qualityState sku { code product { name } shade { name } } rolls_on_lot(orderBy: { rollNo: ASC }) { number rollNo measuredLength handlingUnitContents_on_roll { handlingUnit { number } } } handlingUnitContents_on_lot { quantity handlingUnit { number } } }
       handlingUnits_on_run(orderBy: { createdAt: ASC }) { number kind marks lengthCm widthCm heightCm grossWeightG netWeightG packedOn parent { number }
         handlingUnitContents_on_handlingUnit { quantity roll { number rollNo measuredLength lot { number sku { code } } } lot { number sku { code } } } } } }`,
    { number: runNumber },
  );
  const run = productionRuns[0];
  if (!run) throw failure('not_found', `No production run ${runNumber}.`);
  if (run.handlingUnits_on_run.length === 0) throw failure('invariant_violation', 'Nothing is packed yet.');

  const issuer = run.purchaseOrder.legalEntity?.name ?? 'BASIS INC.';
  const page = { kind: 'Packing list', number: run.number, issuer };
  // Landscape: a carton line carries ten facts.
  const { doc, finish } = open(page, { landscape: true });
  const paginate = chrome(doc, page);

  const units = run.handlingUnits_on_run.map((unit) => {
    const contents = unit.handlingUnitContents_on_handlingUnit;
    const rolls = contents.filter((content) => content.roll);
    const quantity = contents.reduce((sum, content) => sum + BigInt(content.roll ? content.roll.measuredLength : (content.quantity ?? '0')), 0n);
    const lots = [...new Set(contents.map((content) => content.roll?.lot.number ?? content.lot?.number ?? ''))].filter(Boolean);
    const skus = [...new Set(contents.map((content) => content.roll?.lot.sku.code ?? content.lot?.sku.code ?? ''))].filter(Boolean);
    return { ...unit, rolls, quantity, lots, skus, cbmMilli: cubicMetresMilli(unit.lengthCm, unit.widthCm, unit.heightCm) };
  });
  const totals = {
    units: units.length,
    rolls: units.reduce((sum, unit) => sum + unit.rolls.length, 0),
    quantity: units.reduce((sum, unit) => sum + unit.quantity, 0n),
    cbm: units.some((unit) => unit.cbmMilli !== null) ? units.reduce((sum, unit) => sum + (unit.cbmMilli ?? 0), 0) : null,
    gross: units.some((unit) => unit.grossWeightG !== null) ? units.reduce((sum, unit) => sum + (unit.grossWeightG ?? 0), 0) : null,
    net: units.some((unit) => unit.netWeightG !== null) ? units.reduce((sum, unit) => sum + (unit.netWeightG ?? 0), 0) : null,
  };
  const lots = run.lots_on_run.map((lot) => {
    const rolls = lot.rolls_on_lot.map((roll) => ({ measuredLength: roll.measuredLength, packedIn: roll.handlingUnitContents_on_roll[0]?.handlingUnit.number ?? null }));
    return { ...lot, ...lotQuantities(rolls, lot.handlingUnitContents_on_lot.map((content) => content.quantity ?? '0')) };
  });
  const ready = availableToShip(lots);

  title(doc, `Packing list ${run.number}`, `Purchase order ${run.purchaseOrder.number} · ${run.purchaseOrder.supplier.tradingName || run.purchaseOrder.supplier.legalName}${run.factory ? `, ${run.factory.location.name}${run.factory.location.city ? `, ${run.factory.location.city}` : ''}` : ''}${run.purchaseOrder.incoterm ? ` · ${[run.purchaseOrder.incoterm.code, run.purchaseOrder.namedPlace].filter(Boolean).join(' ')}` : ''}`);
  facts(
    doc,
    [
      { label: 'Cartons', value: String(totals.units) },
      { label: 'Rolls', value: String(totals.rolls) },
      { label: 'Metres', value: metres(totals.quantity) },
      { label: 'CBM', value: cbm(totals.cbm) },
      { label: 'Gross', value: kilos(totals.gross) },
      { label: 'Net', value: kilos(totals.net) },
      { label: 'Released and packed', value: metres(ready) },
    ],
    [1, 1, 1.2, 1, 1, 1, 1.6],
  );

  const width = contentWidth(doc);
  const fixed = 84 + 112 + 40 + 64 + 84 + 50 + 60 + 60;
  table(
    doc,
    [
      { key: 'unit', label: 'Carton', width: 84, font: 'mono' },
      { key: 'marks', label: 'Marks', width: width - fixed },
      { key: 'lot', label: 'Lot · SKU', width: 112, font: 'mono' },
      { key: 'rolls', label: 'Rolls', width: 40, align: 'right' },
      { key: 'metres', label: 'Metres', width: 64, align: 'right' },
      { key: 'size', label: 'L×W×H cm', width: 84, align: 'right' },
      { key: 'cbm', label: 'CBM', width: 50, align: 'right' },
      { key: 'gross', label: 'Gross', width: 60, align: 'right' },
      { key: 'net', label: 'Net', width: 60, align: 'right' },
    ],
    units.map((unit) => ({
      unit: unit.number,
      marks: unit.marks ?? '—',
      lot: { main: unit.lots.join('\n'), sub: unit.skus.join('\n') },
      rolls: String(unit.rolls.length || '—'),
      metres: thousands(unit.quantity, QUANTITY_DECIMALS, 1),
      size: unit.lengthCm && unit.widthCm && unit.heightCm ? `${unit.lengthCm} × ${unit.widthCm} × ${unit.heightCm}` : '—',
      cbm: cbm(unit.cbmMilli),
      gross: kilos(unit.grossWeightG),
      net: kilos(unit.netWeightG),
    })),
    {
      total: { unit: `${totals.units} cartons`, rolls: String(totals.rolls), metres: thousands(totals.quantity, QUANTITY_DECIMALS, 1), cbm: cbm(totals.cbm), gross: kilos(totals.gross), net: kilos(totals.net) },
    },
  );

  table(
    doc,
    [
      { key: 'lot', label: 'Lot', width: 96, font: 'mono' },
      { key: 'sku', label: 'SKU', width: 96, font: 'mono' },
      { key: 'product', label: 'Product', width: width - 96 - 96 - 60 - 80 - 110 },
      { key: 'rolls', label: 'Rolls', width: 60, align: 'right' },
      { key: 'packed', label: 'Packed', width: 80, align: 'right' },
      { key: 'quality', label: 'Quality', width: 110, align: 'right' },
    ],
    lots.map((lot) => ({
      lot: lot.number,
      sku: lot.sku.code,
      product: `${lot.sku.product.name}, ${lot.sku.shade.name}`,
      rolls: String(lot.rollCount || '—'),
      packed: lot.rollCount > 0 ? `${lot.packedRollCount} of ${lot.rollCount}` : metres(lot.packedQuantity),
      quality: QUALITY_WORDS[lot.qualityState],
    })),
    { caption: 'Lots' },
  );

  // Roll detail: which roll sits in which carton, with its measured length.
  const detail = units
    .filter((unit) => unit.rolls.length > 0)
    .map((unit) => ({
      unit: unit.number,
      rolls: unit.rolls.map((content) => `${content.roll!.lot.number.slice(-4)}-${String(content.roll!.rollNo).padStart(2, '0')} · ${formatFixed(BigInt(content.roll!.measuredLength), QUANTITY_DECIMALS, 1)} m`).join('    '),
    }));
  if (detail.length > 0) {
    table(
      doc,
      [
        { key: 'unit', label: 'Carton', width: 84, font: 'mono' },
        { key: 'rolls', label: 'Rolls (lot-no. · measured length)', width: width - 84 },
      ],
      detail,
      { caption: 'Roll detail' },
    );
  }

  paginate();
  return { pdf: await finish(), filename: `${run.number}-packing-list.pdf` };
}

// ---------------------------------------------------------------- shipment packing list

interface ShipmentPackingRow {
  number: string;
  mode: string;
  loadType: string;
  namedPlace: string | null;
  incoterm: { code: string } | null;
  consigneeName: string | null;
  origin: { name: string; city: string | null; country: { name: string } | null };
  destination: { name: string; city: string | null; country: { name: string } | null };
  forwarder: { legalName: string; tradingName: string | null } | null;
  shipmentLegs_on_shipment: { type: string; plannedEtd: string | null; plannedEta: string | null; etd: string | null; eta: string | null; atd: string | null; ata: string | null; vessel: string | null; voyage: string | null }[];
  shipmentReferences_on_shipment: { type: string; value: string }[];
  shipmentLines_on_shipment: { quantity: string; purchaseOrderLine: { lineNo: number; purchaseOrder: { number: string; legalEntity: { name: string } | null }; sku: { code: string; product: { name: string }; shade: { name: string } } }; lot: { number: string } }[];
  handlingUnits_on_shipment: RunRow['handlingUnits_on_run'];
}

/** The packing list of a shipment: every package it carries, whichever runs they came from, with the lines by order and lot. */
export async function renderShipmentPackingList(shipmentNumber: string): Promise<{ pdf: Buffer; filename: string }> {
  const { shipments } = await graphql<{ shipments: ShipmentPackingRow[] }>(
    `query ($number: String!) { shipments(where: { number: { eq: $number } }, limit: 1) {
       number mode loadType namedPlace consigneeName incoterm { code }
       origin { name city country { name } } destination { name city country { name } } forwarder { legalName tradingName }
       shipmentLegs_on_shipment(orderBy: { sequence: ASC }) { type plannedEtd plannedEta etd eta atd ata vessel voyage }
       shipmentReferences_on_shipment { type value }
       shipmentLines_on_shipment { quantity purchaseOrderLine { lineNo purchaseOrder { number legalEntity { name } } sku { code product { name } shade { name } } } lot { number } }
       handlingUnits_on_shipment(orderBy: { createdAt: ASC }) { number kind marks lengthCm widthCm heightCm grossWeightG netWeightG packedOn parent { number }
         handlingUnitContents_on_handlingUnit { quantity roll { number rollNo measuredLength lot { number sku { code } } } lot { number sku { code } } } } } }`,
    { number: shipmentNumber },
  );
  const shipment = shipments[0];
  if (!shipment) throw failure('not_found', `No shipment ${shipmentNumber}.`);
  if (shipment.handlingUnits_on_shipment.length === 0) throw failure('invariant_violation', 'Nothing is loaded yet.');

  const issuer = shipment.shipmentLines_on_shipment[0]?.purchaseOrderLine.purchaseOrder.legalEntity?.name ?? 'BASIS INC.';
  const page = { kind: 'Packing list', number: shipment.number, issuer };
  const { doc, finish } = open(page, { landscape: true });
  const paginate = chrome(doc, page);

  const units = shipment.handlingUnits_on_shipment.map((unit) => {
    const contents = unit.handlingUnitContents_on_handlingUnit;
    const rolls = contents.filter((content) => content.roll);
    const quantity = contents.reduce((sum, content) => sum + BigInt(content.roll ? content.roll.measuredLength : (content.quantity ?? '0')), 0n);
    const lots = [...new Set(contents.map((content) => content.roll?.lot.number ?? content.lot?.number ?? ''))].filter(Boolean);
    const skus = [...new Set(contents.map((content) => content.roll?.lot.sku.code ?? content.lot?.sku.code ?? ''))].filter(Boolean);
    return { ...unit, rolls, quantity, lots, skus, cbmMilli: cubicMetresMilli(unit.lengthCm, unit.widthCm, unit.heightCm) };
  });
  const outer = units.filter((unit) => !unit.parent);
  const totals = {
    cartons: units.filter((unit) => unit.kind === 'carton').length,
    pallets: units.filter((unit) => unit.kind === 'pallet').length,
    rolls: units.reduce((sum, unit) => sum + unit.rolls.length, 0),
    quantity: units.reduce((sum, unit) => sum + unit.quantity, 0n),
    cbm: outer.some((unit) => unit.cbmMilli !== null) ? outer.reduce((sum, unit) => sum + (unit.cbmMilli ?? 0), 0) : null,
    gross: outer.some((unit) => unit.grossWeightG !== null) ? outer.reduce((sum, unit) => sum + (unit.grossWeightG ?? 0), 0) : null,
    net: units.some((unit) => unit.netWeightG !== null) ? units.reduce((sum, unit) => sum + (unit.netWeightG ?? 0), 0) : null,
  };
  const place = (location: ShipmentPackingRow['origin']) => [location.name, location.city, location.country?.name].filter(Boolean).join(', ');
  const main = shipment.shipmentLegs_on_shipment.find((leg) => leg.type === 'main_carriage');
  const first = shipment.shipmentLegs_on_shipment[0];
  const last = shipment.shipmentLegs_on_shipment[shipment.shipmentLegs_on_shipment.length - 1];
  const mode = shipment.mode === 'sea' ? `Sea ${shipment.loadType.toUpperCase()}` : shipment.mode[0]!.toUpperCase() + shipment.mode.slice(1);
  const references = shipment.shipmentReferences_on_shipment.map((reference) => `${reference.type.toUpperCase()} ${reference.value}`).join(' · ');

  title(doc, `Packing list ${shipment.number}`, `${mode} · ${place(shipment.origin)} → ${place(shipment.destination)}${shipment.incoterm ? ` · ${[shipment.incoterm.code, shipment.namedPlace].filter(Boolean).join(' ')}` : ''}${shipment.forwarder ? ` · ${shipment.forwarder.tradingName || shipment.forwarder.legalName}` : ''}${references ? ` · ${references}` : ''}`);
  facts(
    doc,
    [
      { label: 'Cartons', value: String(totals.cartons) },
      { label: 'Pallets', value: String(totals.pallets || '—') },
      { label: 'Rolls', value: String(totals.rolls) },
      { label: 'Metres', value: metres(totals.quantity) },
      { label: 'CBM', value: cbm(totals.cbm) },
      { label: 'Gross', value: kilos(totals.gross) },
      { label: 'Net', value: kilos(totals.net) },
      { label: 'ETD', value: first ? (first.atd ?? first.etd ?? first.plannedEtd ?? '—') : '—' },
      { label: 'ETA', value: last ? (last.ata ?? last.eta ?? last.plannedEta ?? '—') : '—' },
      { label: 'Vessel / flight', value: main?.vessel ? `${main.vessel}${main.voyage ? ` ${main.voyage}` : ''}` : '—' },
    ],
    [1, 1, 1, 1.2, 1, 1, 1, 1.2, 1.2, 1.6],
  );

  const width = contentWidth(doc);
  const fixed = 84 + 112 + 40 + 64 + 84 + 50 + 60 + 60;
  table(
    doc,
    [
      { key: 'unit', label: 'Package', width: 84, font: 'mono' },
      { key: 'marks', label: 'Marks', width: width - fixed },
      { key: 'lot', label: 'Lot · SKU', width: 112, font: 'mono' },
      { key: 'rolls', label: 'Rolls', width: 40, align: 'right' },
      { key: 'metres', label: 'Metres', width: 64, align: 'right' },
      { key: 'size', label: 'L×W×H cm', width: 84, align: 'right' },
      { key: 'cbm', label: 'CBM', width: 50, align: 'right' },
      { key: 'gross', label: 'Gross', width: 60, align: 'right' },
      { key: 'net', label: 'Net', width: 60, align: 'right' },
    ],
    units.map((unit) => ({
      unit: unit.number,
      marks: `${unit.marks ?? '—'}${unit.parent ? `  (on ${unit.parent.number})` : ''}`,
      lot: { main: unit.lots.join('\n'), sub: unit.skus.join('\n') },
      rolls: String(unit.rolls.length || '—'),
      metres: thousands(unit.quantity, QUANTITY_DECIMALS, 1),
      size: unit.lengthCm && unit.widthCm && unit.heightCm ? `${unit.lengthCm} × ${unit.widthCm} × ${unit.heightCm}` : '—',
      cbm: cbm(unit.cbmMilli),
      gross: kilos(unit.grossWeightG),
      net: kilos(unit.netWeightG),
    })),
    {
      total: { unit: `${totals.cartons} cartons${totals.pallets ? `, ${totals.pallets} pallets` : ''}`, rolls: String(totals.rolls), metres: thousands(totals.quantity, QUANTITY_DECIMALS, 1), cbm: cbm(totals.cbm), gross: kilos(totals.gross), net: kilos(totals.net) },
    },
  );

  table(
    doc,
    [
      { key: 'order', label: 'Order · line', width: 110, font: 'mono' },
      { key: 'lot', label: 'Lot', width: 96, font: 'mono' },
      { key: 'sku', label: 'SKU', width: 96, font: 'mono' },
      { key: 'product', label: 'Product', width: width - 110 - 96 - 96 - 90 },
      { key: 'metres', label: 'Metres', width: 90, align: 'right' },
    ],
    shipment.shipmentLines_on_shipment.map((line) => ({
      order: `${line.purchaseOrderLine.purchaseOrder.number} · ${line.purchaseOrderLine.lineNo}`,
      lot: line.lot.number,
      sku: line.purchaseOrderLine.sku.code,
      product: `${line.purchaseOrderLine.sku.product.name}, ${line.purchaseOrderLine.sku.shade.name}`,
      metres: metres(line.quantity),
    })),
    { caption: 'Lines', total: { order: `${shipment.shipmentLines_on_shipment.length} lines`, metres: metres(shipment.shipmentLines_on_shipment.reduce((sum, line) => sum + BigInt(line.quantity), 0n)) } },
  );

  const detail = units
    .filter((unit) => unit.rolls.length > 0)
    .map((unit) => ({
      unit: unit.number,
      rolls: unit.rolls.map((content) => `${content.roll!.lot.number.slice(-4)}-${String(content.roll!.rollNo).padStart(2, '0')} · ${formatFixed(BigInt(content.roll!.measuredLength), QUANTITY_DECIMALS, 1)} m`).join('    '),
    }));
  if (detail.length > 0) {
    table(doc, [{ key: 'unit', label: 'Package', width: 84, font: 'mono' }, { key: 'rolls', label: 'Rolls (lot-no. · measured length)', width: width - 84 }], detail, { caption: 'Roll detail' });
  }

  paginate();
  return { pdf: await finish(), filename: `${shipment.number}-packing-list.pdf` };
}

// ---------------------------------------------------------------- roll labels

interface LotRow {
  number: string;
  millLotRef: string | null;
  sku: { code: string; product: { code: string; name: string }; variant: { name: string; widthCm: number | null }; shade: { code: string; name: string } };
  run: { factory: { location: { country: { name: string } | null } } | null; purchaseOrder: { supplier: { country: { name: string } | null } } };
  rolls_on_lot: { number: string; rollNo: number; measuredLength: string; usableWidthCm: number | null }[];
}

/** One 100 × 60 mm label per roll: shade, product code and lot on one line; width, length and origin on the next. */
export async function renderRollLabels(lotNumber: string): Promise<{ pdf: Buffer; filename: string }> {
  const { lots } = await graphql<{ lots: LotRow[] }>(
    `query ($number: String!) { lots(where: { number: { eq: $number } }, limit: 1) {
       number millLotRef sku { code product { code name } variant { name widthCm } shade { code name } }
       run { factory { location { country { name } } } purchaseOrder { supplier { country { name } } } }
       rolls_on_lot(orderBy: { rollNo: ASC }) { number rollNo measuredLength usableWidthCm } } }`,
    { number: lotNumber },
  );
  const lot = lots[0];
  if (!lot) throw failure('not_found', `No lot ${lotNumber}.`);
  if (lot.rolls_on_lot.length === 0) throw failure('invariant_violation', 'This lot has no rolls to label.');

  const W = 283.46;
  const H = 170.08;
  const pad = 16;
  const { doc, finish } = open({ kind: 'Roll labels', number: lot.number, issuer: 'BASIS INC.' }, { size: [W, H], margins: { top: pad, bottom: 0, left: pad, right: pad } });
  const origin = lot.run.factory?.location.country?.name ?? lot.run.purchaseOrder.supplier.country?.name ?? '';

  lot.rolls_on_lot.forEach((roll, index) => {
    if (index > 0) doc.addPage();
    doc.font('brand').fontSize(10).fillColor(INK).text('BASIS', pad, pad, { characterSpacing: 2, lineBreak: false });
    doc.font('mono').fontSize(7.5).fillColor(MUTED).text(roll.number, pad, pad + 1, { width: W - pad * 2, align: 'right', lineBreak: false });
    doc.moveTo(pad, pad + 16).lineTo(W - pad, pad + 16).lineWidth(0.5).strokeColor(INK).stroke();

    doc.font('display').fontSize(26).fillColor(INK).text(lot.sku.shade.name, pad, pad + 26, { width: W - pad * 2, lineBreak: false });
    doc.font('mono').fontSize(9).fillColor(INK).text(`${lot.sku.product.code}  ·  ${lot.number}`, pad, pad + 60, { width: W - pad * 2, lineBreak: false });
    doc.font('sans').fontSize(8.5).fillColor(MUTED).text(`${lot.sku.product.name}, ${lot.sku.variant.name} · ${lot.sku.code}`, pad, pad + 74, { width: W - pad * 2, lineBreak: false });

    const width = roll.usableWidthCm ?? lot.sku.variant.widthCm;
    const line3 = [width ? `${width} cm` : '', metres(roll.measuredLength), origin ? `Made in ${origin}` : ''].filter(Boolean).join('   ·   ');
    doc.moveTo(pad, H - pad - 30).lineTo(W - pad, H - pad - 30).lineWidth(0.4).strokeColor(LINE).stroke();
    doc.font('display').fontSize(12).fillColor(INK).text(line3, pad, H - pad - 22, { width: W - pad * 2, lineBreak: false });
    doc.font('mono').fontSize(7).fillColor(COCOA).text(lot.millLotRef ? `Mill lot ${lot.millLotRef}` : '', pad, H - pad - 6, { width: W - pad * 2, align: 'right', lineBreak: false });
  });

  return { pdf: await finish(), filename: `${lot.number}-roll-labels.pdf` };
}
