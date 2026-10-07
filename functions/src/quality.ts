import { inspectionResult, lotStateFor, measurementOutcome, signOffAllowed, type CheckFacts, type Disposition, type InspectionResult } from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole } from './lib';
import { allocateNumber, applyLotQuality, timeline } from './manufacturing';

// Quality: an inspection opens from a template against a lot or a run, is
// recorded check by check (often on a phone at the mill), earns its result
// from what was recorded, and its sign-off moves the lot and the gated
// milestone. Corrective actions follow findings and close on verification.

const QC = ['owner', 'operations', 'qc'] as const;
const SIGN_OFF = ['owner', 'qc'] as const;
const today = () => new Date().toISOString().slice(0, 10);
const int64 = z.string().regex(/^-?\d+$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

// ---------------------------------------------------------------- open

const createInput = z.object({
  type: z.enum(['lab_dip', 'inline', 'pre_shipment', 'receiving']),
  /** A lot number or a run number. */
  subject: z.string().regex(/^(LOT|RUN)-\d{2}-\d{4}$/),
  templateId: z.string().optional(),
  scheduledOn: date.optional(),
  location: z.string().max(160).optional(),
  inspectorName: z.string().max(160).optional(),
  sampleSize: z.string().max(80).optional(),
});

interface TemplateRow {
  id: string;
  name: string;
  inspectionTemplateChecks_on_template: { key: string; sequence: number; category: string; parameter: string; method: string | null; kind: string; unit: string | null; expected: string | null; toleranceMinus: string | null; tolerancePlus: string | null; isCritical: boolean }[];
}

export const createInspection = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, QC, 'Opening inspections');
  const parsed = createInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;

  let lotId: string | null = null;
  let runId: string | null;
  let familyCode: string | null = null;
  let entityType: 'lot' | 'production_run';
  if (input.subject.startsWith('LOT-')) {
    const { lots } = await graphql<{ lots: { id: string; run: { id: string }; sku: { product: { family: { code: string } } } }[] }>(
      `query ($number: String!) { lots(where: { number: { eq: $number } }, limit: 1) { id run { id } sku { product { family { code } } } } }`,
      { number: input.subject },
    );
    const lot = lots[0];
    if (!lot) throw failure('not_found', `No lot ${input.subject}.`);
    lotId = lot.id;
    runId = lot.run.id;
    familyCode = lot.sku.product.family.code;
    entityType = 'lot';
  } else {
    const { productionRuns } = await graphql<{ productionRuns: { id: string; productionRunLines_on_run: { purchaseOrderLine: { sku: { product: { family: { code: string } } } } }[] }[] }>(
      `query ($number: String!) { productionRuns(where: { number: { eq: $number } }, limit: 1) { id productionRunLines_on_run(limit: 1) { purchaseOrderLine { sku { product { family { code } } } } } } }`,
      { number: input.subject },
    );
    const run = productionRuns[0];
    if (!run) throw failure('not_found', `No production run ${input.subject}.`);
    runId = run.id;
    familyCode = run.productionRunLines_on_run[0]?.purchaseOrderLine.sku.product.family.code ?? null;
    entityType = 'production_run';
  }

  const { inspectionTemplates } = await graphql<{ inspectionTemplates: TemplateRow[] }>(
    input.templateId
      ? `query ($id: UUID!) { inspectionTemplates(where: { id: { eq: $id } }, limit: 1) { id name inspectionTemplateChecks_on_template(orderBy: { sequence: ASC }) { key sequence category parameter method kind unit expected toleranceMinus tolerancePlus isCritical } } }`
      : `query ($type: InspectionType!, $family: String) { inspectionTemplates(where: { type: { eq: $type }, isDefault: { eq: true } }, orderBy: { createdAt: ASC }, limit: 10) { id name family { code } inspectionTemplateChecks_on_template(orderBy: { sequence: ASC }) { key sequence category parameter method kind unit expected toleranceMinus tolerancePlus isCritical } } }`,
    input.templateId ? { id: input.templateId } : { type: input.type, family: familyCode },
  );
  // A family-specific template wins over the general one.
  const template = (inspectionTemplates as (TemplateRow & { family?: { code: string } | null })[]).find((candidate) => candidate.family?.code === familyCode) ?? inspectionTemplates.find((candidate) => !(candidate as { family?: unknown }).family) ?? inspectionTemplates[0];
  if (!template) throw failure('invariant_violation', `No inspection template for ${input.type}. Add one in Settings.`);

  const number = await allocateNumber('INS');
  const { inspection_insert } = await graphql<{ inspection_insert: { id: string } }>(
    `mutation ($number: String!, $type: InspectionType!, $templateId: UUID!, $entityType: String!, $entityId: String!, $lotId: UUID, $runId: UUID, $scheduledOn: Date, $location: String, $inspectorName: String, $sampleSize: String, $uid: String!) {
      inspection_insert(data: { number: $number, type: $type, state: scheduled, templateId: $templateId, entityType: $entityType, entityId: $entityId, lotId: $lotId, runId: $runId, scheduledOn: $scheduledOn, location: $location, inspectorName: $inspectorName, sampleSize: $sampleSize, createdByUid: $uid }) }`,
    { number, type: input.type, templateId: template.id, entityType, entityId: input.subject, lotId, runId, scheduledOn: input.scheduledOn ?? null, location: input.location ?? null, inspectorName: input.inspectorName ?? null, sampleSize: input.sampleSize ?? null, uid: caller.uid },
  );
  for (const check of template.inspectionTemplateChecks_on_template) {
    await graphql(
      `mutation ($inspectionId: UUID!, $key: String!, $sequence: Int!, $category: CheckCategory!, $parameter: String!, $method: String, $kind: CheckKind!, $unit: String, $expected: Int64, $minus: Int64, $plus: Int64, $critical: Boolean!) {
        inspectionCheck_insert(data: { inspectionId: $inspectionId, key: $key, sequence: $sequence, category: $category, parameter: $parameter, method: $method, kind: $kind, unit: $unit, expected: $expected, toleranceMinus: $minus, tolerancePlus: $plus, isCritical: $critical, outcome: pending }) }`,
      { inspectionId: inspection_insert.id, key: check.key, sequence: check.sequence, category: check.category, parameter: check.parameter, method: check.method, kind: check.kind, unit: check.unit, expected: check.expected, minus: check.toleranceMinus, plus: check.tolerancePlus, critical: check.isCritical },
    );
  }
  await audit(caller.uid, 'inspection.create', 'inspection', number, null, { type: input.type, subject: input.subject, template: template.name });
  await emit('inspection.created', 'inspection', number, { type: input.type, subject: input.subject });
  await timeline('inspection', number, 'created', caller.uid, `${template.name} on ${input.subject}${input.scheduledOn ? `, scheduled ${input.scheduledOn}` : ''}`);
  await timeline(entityType, input.subject, 'inspection_opened', caller.uid, `${number} opened: ${template.name}`);
  return { number, id: inspection_insert.id, template: template.name, checks: template.inspectionTemplateChecks_on_template.length };
});

// ---------------------------------------------------------------- record

const recordInput = z.object({
  number: z.string().min(1),
  performedOn: date.optional(),
  location: z.string().max(160).optional(),
  sampleSize: z.string().max(80).optional(),
  note: z.string().max(4000).optional(),
  checks: z.array(z.object({ id: z.string().min(1), outcome: z.enum(['pending', 'pass', 'fail', 'not_applicable']).optional(), measured: int64.nullable().optional(), note: z.string().max(1000).nullable().optional() })).max(100).default([]),
  readings: z.array(z.object({ rollNumber: z.string().optional(), illuminant: z.string().max(16).default('D65'), lStar: z.number().int(), aStar: z.number().int(), bStar: z.number().int(), deltaE: z.number().int().min(0), visualGrade: z.string().max(16).optional(), standardRef: z.string().max(80).optional() })).max(200).default([]),
  defects: z.array(z.object({ rollNumber: z.string().optional(), type: z.string().min(1).max(80), points: z.number().int().min(1).max(4), positionM: int64.optional(), sizeCm: z.number().int().positive().optional(), note: z.string().max(1000).optional() })).max(500).default([]),
  /** Ids of readings or defects to remove. */
  removeReadings: z.array(z.string()).max(200).default([]),
  removeDefects: z.array(z.string()).max(500).default([]),
});

interface InspectionRow {
  id: string;
  number: string;
  state: string;
  type: string;
  entityType: string;
  entityId: string;
  result: string | null;
  lot: { id: string; number: string; producedQuantity: string; rolls_on_lot: { id: string; number: string; measuredLength: string }[] } | null;
  run: { id: string; number: string; productionMilestones_on_run: { id: string; key: string; gate: string; state: string }[] } | null;
  template: { maxDefectPointsPer100m: number | null; maxDeltaE: number | null } | null;
  inspectionChecks_on_inspection: { id: string; key: string; category: string; kind: string; isCritical: boolean; outcome: string; measured: string | null; expected: string | null; toleranceMinus: string | null; tolerancePlus: string | null }[];
  shadeReadings_on_inspection: { id: string; deltaE: number }[];
  defects_on_inspection: { id: string; points: number; roll: { number: string } | null }[];
  correctiveActions_on_inspection: { id: string; state: string }[];
  concession: string | null;
}

async function loadInspection(number: string): Promise<InspectionRow> {
  const { inspections } = await graphql<{ inspections: InspectionRow[] }>(
    `query ($number: String!) { inspections(where: { number: { eq: $number } }, limit: 1) {
       id number state type entityType entityId result concession
       lot { id number producedQuantity rolls_on_lot(orderBy: { rollNo: ASC }) { id number measuredLength } }
       run { id number productionMilestones_on_run(orderBy: { sequence: ASC }) { id key gate state } }
       template { maxDefectPointsPer100m maxDeltaE }
       inspectionChecks_on_inspection(orderBy: { sequence: ASC }) { id key category kind isCritical outcome measured expected toleranceMinus tolerancePlus }
       shadeReadings_on_inspection { id deltaE }
       defects_on_inspection { id points roll { number } }
       correctiveActions_on_inspection { id state } } }`,
    { number },
  );
  const inspection = inspections[0];
  if (!inspection) throw failure('not_found', `No inspection ${number}.`);
  return inspection;
}

/** Metres the inspection looked at: the rolls defects were found on, or the lot. */
function inspectedMetres(inspection: InspectionRow): string {
  const rolls = inspection.lot?.rolls_on_lot ?? [];
  const touched = new Set(inspection.defects_on_inspection.map((defect) => defect.roll?.number).filter(Boolean));
  if (touched.size > 0) return rolls.filter((roll) => touched.has(roll.number)).reduce((sum, roll) => sum + BigInt(roll.measuredLength), 0n).toString();
  if (rolls.length > 0) return rolls.reduce((sum, roll) => sum + BigInt(roll.measuredLength), 0n).toString();
  return inspection.lot?.producedQuantity ?? '0';
}

function derivedResult(inspection: InspectionRow): InspectionResult | null {
  const checks: CheckFacts[] = inspection.inspectionChecks_on_inspection.map((check) => ({ key: check.key, category: check.category as CheckFacts['category'], kind: check.kind as CheckFacts['kind'], isCritical: check.isCritical, outcome: check.outcome as CheckFacts['outcome'], measured: check.measured, expected: check.expected, toleranceMinus: check.toleranceMinus, tolerancePlus: check.tolerancePlus }));
  return inspectionResult(
    checks,
    inspection.defects_on_inspection.map((defect) => ({ points: defect.points, rollNumber: defect.roll?.number ?? null })),
    inspection.shadeReadings_on_inspection,
    inspectedMetres(inspection),
    { maxDefectPointsPer100m: inspection.template?.maxDefectPointsPer100m ?? null, maxDeltaE: inspection.template?.maxDeltaE ?? null },
  );
}

export const recordInspection = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, QC, 'Recording inspections');
  const parsed = recordInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const inspection = await loadInspection(input.number);
  if (inspection.state === 'signed_off' || inspection.state === 'cancelled') throw failure('invariant_violation', `${input.number} is ${inspection.state.replace('_', ' ')} and cannot change.`);
  const rollId = (number: string | undefined) => {
    if (!number) return null;
    const roll = inspection.lot?.rolls_on_lot.find((candidate) => candidate.number === number);
    if (!roll) throw failure('validation', `${number} is not a roll of this lot.`, { rollNumber: number });
    return roll.id;
  };

  for (const check of input.checks) {
    const existing = inspection.inspectionChecks_on_inspection.find((candidate) => candidate.id === check.id);
    if (!existing) throw failure('validation', 'A check that is not on this inspection.', { checks: check.id });
    const measured = check.measured === undefined ? existing.measured : check.measured;
    // A measurement decides its own outcome from the tolerance; pass/fail checks are told.
    const outcome = existing.kind === 'measurement' && measured !== null ? measurementOutcome({ measured, expected: existing.expected, toleranceMinus: existing.toleranceMinus, tolerancePlus: existing.tolerancePlus }) : (check.outcome ?? existing.outcome);
    await graphql(`mutation ($id: UUID!, $outcome: CheckOutcome!, $measured: Int64, $note: String) { inspectionCheck_update(id: $id, data: { outcome: $outcome, measured: $measured, note: $note }) }`, { id: check.id, outcome, measured, note: check.note ?? null });
  }
  for (const id of input.removeReadings) await graphql(`mutation ($id: UUID!) { shadeReading_delete(id: $id) }`, { id });
  for (const id of input.removeDefects) await graphql(`mutation ($id: UUID!) { defect_delete(id: $id) }`, { id });
  for (const reading of input.readings) {
    await graphql(
      `mutation ($inspectionId: UUID!, $rollId: UUID, $illuminant: String!, $l: Int!, $a: Int!, $b: Int!, $deltaE: Int!, $grade: String, $standard: String) {
        shadeReading_insert(data: { inspectionId: $inspectionId, rollId: $rollId, illuminant: $illuminant, lStar: $l, aStar: $a, bStar: $b, deltaE: $deltaE, visualGrade: $grade, standardRef: $standard }) }`,
      { inspectionId: inspection.id, rollId: rollId(reading.rollNumber), illuminant: reading.illuminant, l: reading.lStar, a: reading.aStar, b: reading.bStar, deltaE: reading.deltaE, grade: reading.visualGrade ?? null, standard: reading.standardRef ?? null },
    );
  }
  for (const defect of input.defects) {
    await graphql(
      `mutation ($inspectionId: UUID!, $rollId: UUID, $type: String!, $points: Int!, $position: Int64, $size: Int, $note: String) {
        defect_insert(data: { inspectionId: $inspectionId, rollId: $rollId, type: $type, points: $points, positionM: $position, sizeCm: $size, note: $note }) }`,
      { inspectionId: inspection.id, rollId: rollId(defect.rollNumber), type: defect.type, points: defect.points, position: defect.positionM ?? null, size: defect.sizeCm ?? null, note: defect.note ?? null },
    );
  }
  const state = inspection.state === 'scheduled' ? 'in_progress' : inspection.state;
  await graphql(
    `mutation ($id: UUID!, $state: InspectionState!, $performedOn: Date, $location: String, $sampleSize: String, $note: String, $uid: String!, $name: String) {
      inspection_update(id: $id, data: { state: $state, performedOn: $performedOn, location: $location, sampleSize: $sampleSize, note: $note, inspectorUid: $uid, inspectorName: $name, updatedAt_expr: "request.time" }) }`,
    { id: inspection.id, state, performedOn: input.performedOn ?? today(), location: input.location ?? null, sampleSize: input.sampleSize ?? null, note: input.note ?? null, uid: caller.uid, name: caller.email ?? null },
  );
  const after = await loadInspection(input.number);
  const result = derivedResult(after);
  return { number: input.number, state, result, checks: after.inspectionChecks_on_inspection.length, readings: after.shadeReadings_on_inspection.length, defects: after.defects_on_inspection.length };
});

// ---------------------------------------------------------------- submit and sign off

export const submitInspection = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, QC, 'Submitting inspections');
  const { number } = z.object({ number: z.string().min(1) }).parse(request.data);
  const inspection = await loadInspection(number);
  if (inspection.state !== 'in_progress' && inspection.state !== 'scheduled') throw failure('invariant_violation', `${number} is ${inspection.state.replace('_', ' ')}.`);
  const result = derivedResult(inspection);
  if (!result) {
    const pending = inspection.inspectionChecks_on_inspection.filter((check) => check.outcome === 'pending').length;
    throw failure('invariant_violation', `${pending} ${pending === 1 ? 'check is' : 'checks are'} still pending.`);
  }
  await graphql(`mutation ($id: UUID!, $result: InspectionResult!) { inspection_update(id: $id, data: { state: submitted, result: $result, submittedAt_expr: "request.time", updatedAt_expr: "request.time" }) }`, { id: inspection.id, result });
  await audit(caller.uid, 'inspection.submit', 'inspection', number, { state: inspection.state }, { state: 'submitted', result });
  await emit('inspection.submitted', 'inspection', number, { result, subject: inspection.entityId });
  await timeline('inspection', number, 'status_changed', caller.uid, `Submitted: ${result.replace('_', ' ')}`);
  await timeline(inspection.entityType, inspection.entityId, 'inspection_submitted', caller.uid, `${number} submitted: ${result.replace('_', ' ')}, awaiting sign-off`);
  return { number, result };
});

const signOffInput = z.object({
  number: z.string().min(1),
  disposition: z.enum(['release', 'rework', 'reject', 'accept_with_concession']),
  concession: z.string().max(2000).default(''),
  note: z.string().max(2000).default(''),
});

export const signOffInspection = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, SIGN_OFF, 'Signing off inspections');
  const parsed = signOffInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const inspection = await loadInspection(input.number);
  if (inspection.state !== 'submitted') throw failure('invariant_violation', 'Only a submitted inspection is signed off.');
  const result = (inspection.result ?? derivedResult(inspection)) as InspectionResult | null;
  if (!result) throw failure('invariant_violation', 'The inspection has no result yet.');
  const openActions = inspection.correctiveActions_on_inspection.filter((action) => action.state !== 'closed').length;
  const refusal = signOffAllowed(result, input.disposition as Disposition, openActions, input.concession);
  if (refusal) throw failure('invariant_violation', refusal);

  await graphql(
    `mutation ($id: UUID!, $disposition: Disposition!, $concession: String, $note: String, $uid: String!) {
      inspection_update(id: $id, data: { state: signed_off, disposition: $disposition, concession: $concession, note: $note, signedOffByUid: $uid, signedOffAt_expr: "request.time", updatedAt_expr: "request.time" }) }`,
    { id: inspection.id, disposition: input.disposition, concession: input.concession || null, note: input.note || null, uid: caller.uid },
  );
  const words = `${result.replace('_', ' ')}, ${input.disposition.replace(/_/g, ' ')}`;
  // The disposition moves the lot; the gated inspection milestone follows a release.
  if (inspection.lot) {
    await applyLotQuality(inspection.lot.number, lotStateFor(input.disposition as Disposition), `${input.number} signed off: ${words}${input.concession ? ` (${input.concession})` : ''}`, caller.uid, input.number);
  }
  if (inspection.run && (input.disposition === 'release' || input.disposition === 'accept_with_concession') && (inspection.type === 'pre_shipment' || inspection.type === 'inline')) {
    const gate = inspection.run.productionMilestones_on_run.find((milestone) => milestone.gate === 'inspection' && milestone.state !== 'done' && milestone.state !== 'skipped');
    if (gate) {
      const { updateMilestoneCore } = await import('./manufacturing');
      await updateMilestoneCore(inspection.run.number, gate.id, { state: 'done', actualEnd: today(), note: `${input.number}: ${words}` }, { ...caller, viaInspection: input.number });
    }
  }
  await audit(caller.uid, 'inspection.sign_off', 'inspection', input.number, { state: 'submitted' }, { state: 'signed_off', disposition: input.disposition, concession: input.concession });
  await emit('inspection.signed_off', 'inspection', input.number, { result, disposition: input.disposition, subject: inspection.entityId });
  await timeline('inspection', input.number, 'status_changed', caller.uid, `Signed off: ${words}${input.note ? `. ${input.note}` : ''}`);
  return { number: input.number, result, disposition: input.disposition };
});

// ---------------------------------------------------------------- corrective actions

const actionInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional(),
  inspectionNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  supplierId: z.string().optional(),
  ownerName: z.string().max(160).optional(),
  dueOn: date.optional(),
});

export const createCorrectiveAction = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, QC, 'Opening corrective actions');
  const parsed = actionInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  let inspectionId: string | null = null;
  let lotId: string | null = null;
  let entity: { type: string; id: string } | null = null;
  if (input.inspectionNumber) {
    const inspection = await loadInspection(input.inspectionNumber);
    inspectionId = inspection.id;
    lotId = inspection.lot?.id ?? null;
    entity = { type: 'inspection', id: inspection.number };
  } else if (input.lotNumber) {
    const { lots } = await graphql<{ lots: { id: string }[] }>(`query ($number: String!) { lots(where: { number: { eq: $number } }, limit: 1) { id } }`, { number: input.lotNumber });
    if (!lots[0]) throw failure('not_found', `No lot ${input.lotNumber}.`);
    lotId = lots[0].id;
    entity = { type: 'lot', id: input.lotNumber };
  }
  const number = await allocateNumber('CAR');
  const { correctiveAction_insert } = await graphql<{ correctiveAction_insert: { id: string } }>(
    `mutation ($number: String!, $title: String!, $description: String, $inspectionId: UUID, $lotId: UUID, $supplierId: UUID, $ownerName: String, $dueOn: Date, $uid: String!) {
      correctiveAction_insert(data: { number: $number, title: $title, description: $description, inspectionId: $inspectionId, lotId: $lotId, supplierId: $supplierId, ownerName: $ownerName, dueOn: $dueOn, state: open, createdByUid: $uid }) }`,
    { number, title: input.title, description: input.description ?? null, inspectionId, lotId, supplierId: input.supplierId ?? null, ownerName: input.ownerName ?? null, dueOn: input.dueOn ?? null, uid: caller.uid },
  );
  await audit(caller.uid, 'corrective_action.create', 'corrective_action', number, null, { title: input.title, inspection: input.inspectionNumber ?? null, lot: input.lotNumber ?? null });
  await emit('corrective_action.created', 'corrective_action', number, { title: input.title });
  await timeline('corrective_action', number, 'created', caller.uid, input.title);
  if (entity) await timeline(entity.type, entity.id, 'action_opened', caller.uid, `${number}: ${input.title}`);
  return { number, id: correctiveAction_insert.id };
});

const updateActionInput = z.object({
  number: z.string().min(1),
  state: z.enum(['open', 'in_progress', 'verification', 'closed']).optional(),
  rootCause: z.string().max(4000).optional(),
  action: z.string().max(4000).optional(),
  ownerName: z.string().max(160).optional(),
  dueOn: date.nullable().optional(),
  note: z.string().max(2000).optional(),
});

export const updateCorrectiveAction = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, QC, 'Updating corrective actions');
  const parsed = updateActionInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const { correctiveActions } = await graphql<{ correctiveActions: { id: string; state: string; rootCause: string | null; action: string | null; ownerName: string | null; dueOn: string | null; inspection: { number: string } | null }[] }>(
    `query ($number: String!) { correctiveActions(where: { number: { eq: $number } }, limit: 1) { id state rootCause action ownerName dueOn inspection { number } } }`,
    { number: input.number },
  );
  const current = correctiveActions[0];
  if (!current) throw failure('not_found', `No corrective action ${input.number}.`);
  const state = input.state ?? current.state;
  // Closing is a verification: only QC or the owner, and only from verification.
  if (state === 'closed' && current.state !== 'closed') {
    requireRole(caller, SIGN_OFF, 'Closing corrective actions');
    if (current.state !== 'verification' && input.state === 'closed') throw failure('invariant_violation', 'An action is verified before it closes: move it to verification first.');
  }
  await graphql(
    `mutation ($id: UUID!, $state: ActionState!, $rootCause: String, $action: String, $ownerName: String, $dueOn: Date, $verifiedBy: String, $verified: Boolean!) {
      updateAction: correctiveAction_update(id: $id, data: { state: $state, rootCause: $rootCause, action: $action, ownerName: $ownerName, dueOn: $dueOn, verifiedByUid: $verifiedBy, updatedAt_expr: "request.time" }) }`,
    { id: current.id, state, rootCause: input.rootCause ?? current.rootCause, action: input.action ?? current.action, ownerName: input.ownerName ?? current.ownerName, dueOn: input.dueOn === undefined ? current.dueOn : input.dueOn, verifiedBy: state === 'closed' ? caller.uid : null, verified: state === 'closed' },
  );
  if (state === 'closed') await graphql(`mutation ($id: UUID!) { correctiveAction_update(id: $id, data: { verifiedAt_expr: "request.time" }) }`, { id: current.id });
  await audit(caller.uid, 'corrective_action.update', 'corrective_action', input.number, { state: current.state }, { state, note: input.note ?? null });
  await emit('corrective_action.updated', 'corrective_action', input.number, { state });
  if (state !== current.state || input.note) await timeline('corrective_action', input.number, state !== current.state ? 'status_changed' : 'note', caller.uid, `${state.replace('_', ' ')}${input.note ? `: ${input.note}` : ''}`);
  return { number: input.number, state };
});
