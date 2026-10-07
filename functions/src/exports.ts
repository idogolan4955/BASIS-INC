import {
  LEDGERS,
  columnsFor,
  cubicMetresMilli,
  exportFilename,
  lotQuantities,
  availableToShip,
  metresNumber,
  runProgress,
  toCsv,
  type ExportColumn,
  type ExportFormat,
  type ExportLedger,
  type ExportRow,
  type MilestoneFacts,
} from '@basis/shared';
import { shipmentDates, shipmentStage, shipmentTotals, type LegFacts, type ShipmentState } from '@basis/shared';
import ExcelJS from 'exceljs';
import { failure, graphql, type Caller } from './lib';

// Ledger exports: the rows a screen shows, as CSV or XLSX. Cost columns are
// removed for roles without cost access before anything is written.

export interface ExportScope {
  readonly run?: string;
  readonly po?: string;
  readonly lot?: string;
}

const money = (stored: string | null | undefined) => (stored ? Number(BigInt(stored)) / 10000 : null);
const kilos = (grams: number | null | undefined) => (grams === null || grams === undefined ? null : grams / 1000);
const QUALITY = { pending: 'Awaiting inspection', on_hold: 'On hold', released: 'Released', rejected: 'Rejected' } as const;

type Rolls = { measuredLength: string; handlingUnitContents_on_roll: { handlingUnit: { number: string } }[] }[];
const lotFacts = (lot: { qualityState: keyof typeof QUALITY; rolls_on_lot: Rolls; handlingUnitContents_on_lot: { quantity: string | null }[] }) =>
  lotQuantities(
    lot.rolls_on_lot.map((roll) => ({ measuredLength: roll.measuredLength, packedIn: roll.handlingUnitContents_on_roll[0]?.handlingUnit.number ?? null })),
    lot.handlingUnitContents_on_lot.map((content) => content.quantity ?? '0'),
  );

async function purchaseOrders(): Promise<ExportRow[]> {
  const { purchaseOrders } = await graphql<{ purchaseOrders: { number: string; state: string; currency: string; namedPlace: string | null; paymentTerms: string | null; issuedOn: string | null; confirmedOn: string | null; requestedExFactory: string | null; supplier: { legalName: string; tradingName: string | null }; incoterm: { code: string } | null; purchaseOrderLines_on_purchaseOrder: { quantity: string; unitPrice: string }[] }[] }>(
    `query { purchaseOrders(orderBy: { createdAt: DESC }, limit: 2000) { number state currency namedPlace paymentTerms issuedOn confirmedOn requestedExFactory supplier { legalName tradingName } incoterm { code } purchaseOrderLines_on_purchaseOrder { quantity unitPrice } } }`,
  );
  return purchaseOrders.map((po) => {
    const quantity = po.purchaseOrderLines_on_purchaseOrder.reduce((sum, line) => sum + BigInt(line.quantity), 0n);
    const amount = po.purchaseOrderLines_on_purchaseOrder.reduce((sum, line) => sum + (BigInt(line.unitPrice) * BigInt(line.quantity)) / 1000n, 0n);
    return {
      number: po.number,
      supplier: po.supplier.tradingName || po.supplier.legalName,
      state: po.state,
      currency: po.currency,
      incoterm: po.incoterm?.code ?? null,
      namedPlace: po.namedPlace,
      issuedOn: po.issuedOn,
      confirmedOn: po.confirmedOn,
      requestedExFactory: po.requestedExFactory,
      lines: po.purchaseOrderLines_on_purchaseOrder.length,
      quantityM: metresNumber(quantity),
      amount: Number(amount) / 10000,
      paymentTerms: po.paymentTerms,
    };
  });
}

async function purchaseOrderLines(scope: ExportScope): Promise<ExportRow[]> {
  const { purchaseOrders } = await graphql<{ purchaseOrders: { number: string; currency: string; purchaseOrderLines_on_purchaseOrder: { lineNo: number; quantity: string; unitPrice: string; overTolerancePercent: number | null; underTolerancePercent: number | null; sku: { code: string; product: { name: string }; variant: { name: string }; shade: { name: string } } }[] }[] }>(
    scope.po
      ? `query ($po: String!) { purchaseOrders(where: { number: { eq: $po } }, limit: 1) { number currency purchaseOrderLines_on_purchaseOrder(orderBy: { lineNo: ASC }) { lineNo quantity unitPrice overTolerancePercent underTolerancePercent sku { code product { name } variant { name } shade { name } } } } }`
      : `query { purchaseOrders(orderBy: { createdAt: DESC }, limit: 2000) { number currency purchaseOrderLines_on_purchaseOrder(orderBy: { lineNo: ASC }) { lineNo quantity unitPrice overTolerancePercent underTolerancePercent sku { code product { name } variant { name } shade { name } } } } }`,
    scope.po ? { po: scope.po } : undefined,
  );
  return purchaseOrders.flatMap((po) =>
    po.purchaseOrderLines_on_purchaseOrder.map((line) => ({
      order: po.number,
      lineNo: line.lineNo,
      sku: line.sku.code,
      product: line.sku.product.name,
      variant: line.sku.variant.name,
      shade: line.sku.shade.name,
      quantityM: metresNumber(line.quantity),
      overTolerance: line.overTolerancePercent,
      underTolerance: line.underTolerancePercent,
      unitPrice: money(line.unitPrice),
      amount: Number((BigInt(line.unitPrice) * BigInt(line.quantity)) / 1000n) / 10000,
      currency: po.currency,
    })),
  );
}

async function productionRuns(scope: ExportScope): Promise<ExportRow[]> {
  const { productionRuns } = await graphql<{ productionRuns: { number: string; state: string; health: string; templateName: string | null; plannedStart: string; plannedEnd: string; forecastEnd: string | null; actualEnd: string | null; purchaseOrder: { number: string; supplier: { legalName: string; tradingName: string | null } }; productionRunLines_on_run: { plannedQuantity: string; producedQuantity: string }[]; productionMilestones_on_run: MilestoneFacts[]; lots_on_run: { qualityState: keyof typeof QUALITY; rolls_on_lot: Rolls; handlingUnitContents_on_lot: { quantity: string | null }[] }[] }[] }>(
    `query ($po: String) { productionRuns(where: ${scope.po ? '{ purchaseOrder: { number: { eq: $po } } }' : '{}'}, orderBy: { createdAt: DESC }, limit: 2000) {
       number state health templateName plannedStart plannedEnd forecastEnd actualEnd purchaseOrder { number supplier { legalName tradingName } }
       productionRunLines_on_run { plannedQuantity producedQuantity } productionMilestones_on_run { key state plannedEnd forecastEnd actualEnd }
       lots_on_run { qualityState rolls_on_lot { measuredLength handlingUnitContents_on_roll { handlingUnit { number } } } handlingUnitContents_on_lot { quantity } } } }`,
    { po: scope.po ?? null },
  );
  return productionRuns.map((run) => ({
    number: run.number,
    order: run.purchaseOrder.number,
    supplier: run.purchaseOrder.supplier.tradingName || run.purchaseOrder.supplier.legalName,
    template: run.templateName,
    state: run.state,
    health: run.health,
    plannedStart: run.plannedStart,
    plannedEnd: run.plannedEnd,
    forecastEnd: run.forecastEnd,
    actualEnd: run.actualEnd,
    progress: Math.round(runProgress(run.productionMilestones_on_run) * 100),
    quantityM: metresNumber(run.productionRunLines_on_run.reduce((sum, line) => sum + BigInt(line.plannedQuantity), 0n)),
    producedM: metresNumber(run.productionRunLines_on_run.reduce((sum, line) => sum + BigInt(line.producedQuantity), 0n)),
    readyM: metresNumber(availableToShip(run.lots_on_run.map((lot) => ({ qualityState: lot.qualityState, packedQuantity: lotFacts(lot).packedQuantity })))),
  }));
}

async function lots(scope: ExportScope): Promise<ExportRow[]> {
  const { lots } = await graphql<{ lots: { number: string; millLotRef: string | null; producedQuantity: string; producedOn: string | null; qualityState: keyof typeof QUALITY; run: { number: string; purchaseOrder: { number: string } }; sku: { code: string; product: { name: string }; shade: { name: string } }; rolls_on_lot: Rolls; handlingUnitContents_on_lot: { quantity: string | null }[] }[] }>(
    `query ($run: String) { lots(where: ${scope.run ? '{ run: { number: { eq: $run } } }' : '{}'}, orderBy: { createdAt: DESC }, limit: 5000) {
       number millLotRef producedQuantity producedOn qualityState run { number purchaseOrder { number } } sku { code product { name } shade { name } }
       rolls_on_lot { measuredLength handlingUnitContents_on_roll { handlingUnit { number } } } handlingUnitContents_on_lot { quantity } } }`,
    { run: scope.run ?? null },
  );
  return lots.map((lot) => {
    const facts = lotFacts(lot);
    return {
      number: lot.number,
      run: lot.run.number,
      order: lot.run.purchaseOrder.number,
      sku: lot.sku.code,
      product: lot.sku.product.name,
      shade: lot.sku.shade.name,
      millLotRef: lot.millLotRef,
      producedOn: lot.producedOn,
      reportedM: metresNumber(lot.producedQuantity),
      measuredM: facts.rollCount > 0 ? metresNumber(facts.measuredQuantity) : null,
      rolls: facts.rollCount,
      packedRolls: facts.packedRollCount,
      quality: QUALITY[lot.qualityState],
      readyM: lot.qualityState === 'released' ? metresNumber(facts.packedQuantity) : 0,
    };
  });
}

async function rolls(scope: ExportScope): Promise<ExportRow[]> {
  const where = scope.lot ? `{ lot: { number: { eq: $lot } } }` : scope.run ? `{ lot: { run: { number: { eq: $run } } } }` : `{}`;
  const { rolls } = await graphql<{ rolls: { number: string; measuredLength: string; usableWidthCm: number | null; weightG: number | null; grade: string | null; defectPoints: number | null; lot: { number: string; sku: { code: string; shade: { name: string } } }; handlingUnitContents_on_roll: { handlingUnit: { number: string } }[] }[] }>(
    `query ($lot: String, $run: String) { rolls(where: ${where}, orderBy: { number: ASC }, limit: 10000) {
       number measuredLength usableWidthCm weightG grade defectPoints lot { number sku { code shade { name } } } handlingUnitContents_on_roll { handlingUnit { number } } } }`,
    { lot: scope.lot ?? null, run: scope.run ?? null },
  );
  return rolls.map((roll) => ({
    number: roll.number,
    lot: roll.lot.number,
    sku: roll.lot.sku.code,
    shade: roll.lot.sku.shade.name,
    lengthM: metresNumber(roll.measuredLength),
    usableWidthCm: roll.usableWidthCm,
    weightKg: kilos(roll.weightG),
    grade: roll.grade,
    defectPoints: roll.defectPoints,
    packedIn: roll.handlingUnitContents_on_roll[0]?.handlingUnit.number ?? null,
  }));
}

async function handlingUnits(scope: ExportScope): Promise<ExportRow[]> {
  const { handlingUnits } = await graphql<{ handlingUnits: { number: string; kind: string; marks: string | null; lengthCm: number | null; widthCm: number | null; heightCm: number | null; grossWeightG: number | null; netWeightG: number | null; packedOn: string | null; run: { number: string } | null; handlingUnitContents_on_handlingUnit: { quantity: string | null; roll: { measuredLength: string; lot: { number: string; sku: { code: string } } } | null; lot: { number: string; sku: { code: string } } | null }[] }[] }>(
    `query ($run: String) { handlingUnits(where: ${scope.run ? '{ run: { number: { eq: $run } } }' : '{}'}, orderBy: { createdAt: ASC }, limit: 5000) {
       number kind marks lengthCm widthCm heightCm grossWeightG netWeightG packedOn run { number }
       handlingUnitContents_on_handlingUnit { quantity roll { measuredLength lot { number sku { code } } } lot { number sku { code } } } } }`,
    { run: scope.run ?? null },
  );
  return handlingUnits.map((unit) => {
    const contents = unit.handlingUnitContents_on_handlingUnit;
    const cbm = cubicMetresMilli(unit.lengthCm, unit.widthCm, unit.heightCm);
    return {
      number: unit.number,
      run: unit.run?.number ?? null,
      kind: unit.kind,
      marks: unit.marks,
      lots: [...new Set(contents.map((content) => content.roll?.lot.number ?? content.lot?.number ?? ''))].filter(Boolean).join(', '),
      skus: [...new Set(contents.map((content) => content.roll?.lot.sku.code ?? content.lot?.sku.code ?? ''))].filter(Boolean).join(', '),
      rolls: contents.filter((content) => content.roll).length,
      quantityM: metresNumber(contents.reduce((sum, content) => sum + BigInt(content.roll ? content.roll.measuredLength : (content.quantity ?? '0')), 0n)),
      lengthCm: unit.lengthCm,
      widthCm: unit.widthCm,
      heightCm: unit.heightCm,
      cbm: cbm === null ? null : cbm / 1000,
      grossKg: kilos(unit.grossWeightG),
      netKg: kilos(unit.netWeightG),
      packedOn: unit.packedOn,
    };
  });
}

async function skus(): Promise<ExportRow[]> {
  const { skus } = await graphql<{ skus: { code: string; status: string; isPublic: boolean; rollTracking: boolean; product: { name: string }; variant: { name: string }; shade: { code: string; name: string }; putUp: { name: string } }[] }>(
    `query { skus(orderBy: { code: ASC }, limit: 5000) { code status isPublic rollTracking product { name } variant { name } shade { code name } putUp { name } } }`,
  );
  return skus.map((sku) => ({ code: sku.code, product: sku.product.name, variant: sku.variant.name, shade: sku.shade.name, shadeCode: sku.shade.code, putUp: sku.putUp.name, status: sku.status, public: sku.isPublic ? 'yes' : 'no', rollTracking: sku.rollTracking ? 'yes' : 'no' }));
}

async function shipments(): Promise<ExportRow[]> {
  const { shipments } = await graphql<{
    shipments: { number: string; state: ShipmentState; health: string; flow: string; mode: string; loadType: string; incoterm: { code: string } | null; origin: { name: string; city: string | null }; destination: { name: string; city: string | null }; forwarder: { legalName: string; tradingName: string | null } | null;
      shipmentLegs_on_shipment: LegFacts[]; shipmentLines_on_shipment: { purchaseOrderLine: { purchaseOrder: { number: string } } }[];
      handlingUnits_on_shipment: { kind: 'carton' | 'pallet' | 'roll' | 'container_load'; lengthCm: number | null; widthCm: number | null; heightCm: number | null; grossWeightG: number | null; netWeightG: number | null; parent: { number: string } | null; handlingUnitContents_on_handlingUnit: { quantity: string | null; roll: { number: string; measuredLength: string } | null }[] }[] }[];
  }>(
    `query { shipments(orderBy: { createdAt: DESC }, limit: 5000) { number state health flow mode loadType incoterm { code } origin { name city } destination { name city } forwarder { legalName tradingName }
       shipmentLegs_on_shipment(orderBy: { sequence: ASC }) { type sequence plannedEtd plannedEta etd eta atd ata }
       shipmentLines_on_shipment { purchaseOrderLine { purchaseOrder { number } } }
       handlingUnits_on_shipment { kind lengthCm widthCm heightCm grossWeightG netWeightG parent { number } handlingUnitContents_on_handlingUnit { quantity roll { number measuredLength } } } } }`,
  );
  return shipments.map((shipment) => {
    const dates = shipmentDates(shipment.shipmentLegs_on_shipment);
    const totals = shipmentTotals(
      shipment.handlingUnits_on_shipment.map((unit) => {
        const contents = unit.handlingUnitContents_on_handlingUnit.map((content) => ({ rollNumber: content.roll?.number ?? null, lotNumber: '', skuCode: '', quantity: content.roll ? content.roll.measuredLength : (content.quantity ?? '0') }));
        return { kind: unit.kind, contents, quantity: contents.reduce((sum, content) => sum + BigInt(content.quantity), 0n).toString(), cbmMilli: cubicMetresMilli(unit.lengthCm, unit.widthCm, unit.heightCm), grossWeightG: unit.grossWeightG, netWeightG: unit.netWeightG, parentNumber: unit.parent?.number ?? null };
      }),
    );
    return {
      number: shipment.number,
      state: shipment.state,
      stage: shipmentStage(shipment.state, shipment.shipmentLegs_on_shipment),
      health: shipment.health,
      flow: shipment.flow,
      mode: shipment.mode === 'sea' ? `sea ${shipment.loadType.toUpperCase()}` : shipment.mode,
      incoterm: shipment.incoterm?.code ?? null,
      origin: shipment.origin.city || shipment.origin.name,
      destination: shipment.destination.city || shipment.destination.name,
      forwarder: shipment.forwarder ? shipment.forwarder.tradingName || shipment.forwarder.legalName : null,
      etd: dates.etd,
      eta: dates.eta,
      plannedEta: dates.plannedEta,
      orders: [...new Set(shipment.shipmentLines_on_shipment.map((line) => line.purchaseOrderLine.purchaseOrder.number))].join(', '),
      cartons: totals.cartons,
      rolls: totals.rolls,
      quantityM: metresNumber(totals.metres),
      cbm: totals.cbmMilli === null ? null : totals.cbmMilli / 1000,
      grossKg: kilos(totals.grossWeightG),
    };
  });
}

async function stock(): Promise<ExportRow[]> {
  const [{ stockBalances }, { lotCosts }] = await Promise.all([
    graphql<{ stockBalances: { onHand: string; rolls: number; updatedAt: string; sku: { code: string; product: { name: string }; shade: { name: string } }; lot: { number: string }; location: { name: string; kind: string } }[] }>(
      `query { stockBalances(where: { onHand: { ne: 0 } }, orderBy: { updatedAt: DESC }, limit: 5000) { onHand rolls updatedAt sku { code product { name } shade { name } } lot { number } location { name kind } } }`,
    ),
    graphql<{ lotCosts: { landedUnitCost: string; lot: { number: string } }[] }>(`query { lotCosts(limit: 5000) { landedUnitCost lot { number } } }`),
  ]);
  const landed = new Map(lotCosts.map((cost) => [cost.lot.number, cost.landedUnitCost]));
  return stockBalances
    .filter((balance) => balance.location.kind === 'physical')
    .map((balance) => ({ sku: balance.sku.code, product: balance.sku.product.name, shade: balance.sku.shade.name, lot: balance.lot.number, location: balance.location.name, quantityM: metresNumber(balance.onHand), rolls: balance.rolls, landedUnitCost: landed.has(balance.lot.number) ? Number(landed.get(balance.lot.number)) / 10000 : null, updated: balance.updatedAt.slice(0, 10) }));
}

const SOURCES: Record<ExportLedger, (scope: ExportScope) => Promise<ExportRow[]>> = {
  'purchase-orders': purchaseOrders,
  'purchase-order-lines': purchaseOrderLines,
  'production-runs': productionRuns,
  lots,
  rolls,
  'handling-units': handlingUnits,
  skus,
  shipments,
  stock,
};

async function xlsx(title: string, columns: readonly ExportColumn[], rows: readonly ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BASIS platform';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(title.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ header: column.label, key: column.key, width: Math.max(12, Math.min(40, column.label.length + 4)) }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    const cells: Record<string, string | number | Date | null> = {};
    for (const column of columns) {
      const value = row[column.key] ?? null;
      cells[column.key] = column.kind === 'date' && typeof value === 'string' ? new Date(`${value}T00:00:00Z`) : value;
    }
    sheet.addRow(cells);
  }
  for (const column of columns) {
    if (column.kind === 'date') sheet.getColumn(column.key).numFmt = 'dd mmm yyyy';
    if (column.kind === 'number') sheet.getColumn(column.key).numFmt = '#,##0.###';
  }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** The rows and the columns a role receives, for machines reading JSON. */
export async function exportRows(ledger: ExportLedger, caller: Caller, scope: ExportScope): Promise<{ columns: readonly ExportColumn[]; rows: ExportRow[] }> {
  const columns = columnsFor(ledger, caller.role);
  const rows = (await SOURCES[ledger](scope)).map((row) => Object.fromEntries(columns.map((column) => [column.key, row[column.key] ?? null])));
  return { columns, rows };
}

export async function renderExport(ledger: ExportLedger, format: ExportFormat, caller: Caller, scope: ExportScope): Promise<{ body: Buffer; filename: string; contentType: string }> {
  const definition = LEDGERS[ledger];
  for (const key of ['run', 'po', 'lot'] as const) {
    if (scope[key] && !definition.scopes.includes(key)) throw failure('validation', `${definition.title} cannot be narrowed by ${key}.`);
  }
  const columns = columnsFor(ledger, caller.role);
  const rows = await SOURCES[ledger](scope);
  const scopeTag = scope.lot ?? scope.run ?? scope.po;
  const filename = exportFilename(ledger, format, scopeTag);
  if (format === 'csv') return { body: Buffer.from(toCsv(columns, rows), 'utf8'), filename, contentType: 'text/csv; charset=utf-8' };
  return { body: await xlsx(definition.title, columns, rows), filename, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
}
