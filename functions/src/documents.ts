import { createHash } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, failure, graphql, requireRole } from './lib';
import { renderPackingList, renderPurchaseOrder, renderRollLabels } from './pdf';

// Filing: a generated document becomes a `Document` record linked to its
// record, with the rendered bytes kept in Storage where Storage is reachable.
// Without Storage (the local emulators without Java), the record still exists
// and points at the generator, so the document can always be opened again.

export type GeneratedKind = 'purchase-order' | 'packing-list' | 'roll-labels';

const GENERATED: Record<GeneratedKind, { documentKind: string; entityType: string; roles: readonly string[]; title: (number: string) => string; render: (number: string) => Promise<{ pdf: Buffer; filename: string }> }> = {
  'purchase-order': { documentKind: 'purchase_order', entityType: 'purchase_order', roles: ['owner', 'operations', 'purchasing', 'finance'], title: (number) => `Purchase order ${number}`, render: renderPurchaseOrder },
  'packing-list': { documentKind: 'packing_list', entityType: 'production_run', roles: ['owner', 'operations', 'purchasing', 'qc', 'logistics'], title: (number) => `Packing list ${number}`, render: renderPackingList },
  'roll-labels': { documentKind: 'other', entityType: 'lot', roles: ['owner', 'operations', 'purchasing', 'qc', 'logistics'], title: (number) => `Roll labels ${number}`, render: renderRollLabels },
};

export function isGeneratedKind(value: string): value is GeneratedKind {
  return value in GENERATED;
}

const storageReachable = () => !process.env['FUNCTIONS_EMULATOR'] || Boolean(process.env['FIREBASE_STORAGE_EMULATOR_HOST']);

/** Renders and files a generated document; returns the document id and where it lives. */
export async function fileGenerated(kind: GeneratedKind, number: string, actorUid: string): Promise<{ id: string; storagePath: string; filename: string; sizeBytes: number }> {
  const spec = GENERATED[kind];
  const { pdf, filename } = await spec.render(number);
  const checksum = createHash('sha256').update(pdf).digest('hex');
  const generated = `generated://pdf/${kind}/${number}`;
  let storagePath = generated;
  if (storageReachable()) {
    const path = `documents/${spec.entityType}/${number}/${filename}`;
    try {
      await getStorage().bucket().file(path).save(pdf, { contentType: 'application/pdf', metadata: { metadata: { checksum, generatedBy: 'basis-platform' } } });
      storagePath = path;
    } catch (error) {
      // The record is still filed; the bytes come from the generator until Storage is in place.
      console.warn('documents: storage unavailable, filing the generator path', error);
    }
  }
  const issuedOn = new Date().toISOString().slice(0, 10);
  const { document_insert } = await graphql<{ document_insert: { id: string } }>(
    `mutation ($kind: DocumentKind!, $title: String!, $number: String!, $issuedOn: Date!, $storagePath: String!, $size: Int!, $checksum: String!, $uid: String!) {
      document_insert(data: { kind: $kind, title: $title, number: $number, issuedOn: $issuedOn, storagePath: $storagePath, mimeType: "application/pdf", sizeBytes: $size, checksum: $checksum, uploadedByUid: $uid }) }`,
    { kind: spec.documentKind, title: spec.title(number), number, issuedOn, storagePath, size: pdf.length, checksum, uid: actorUid },
  );
  await graphql(`mutation ($documentId: UUID!, $entityType: String!, $entityId: String!, $role: String!) { documentLink_insert(data: { documentId: $documentId, entityType: $entityType, entityId: $entityId, role: $role }) }`, {
    documentId: document_insert.id,
    entityType: spec.entityType,
    entityId: number,
    role: 'generated',
  });
  await graphql(
    `mutation ($entityType: String!, $entityId: String!, $actorUid: String!, $payload: Any) {
      timelineEvent_insert(data: { entityType: $entityType, entityId: $entityId, kind: "document_filed", actorUid: $actorUid, payload: $payload }) }`,
    { entityType: spec.entityType, entityId: number, actorUid, payload: { summary: `${spec.title(number)} filed${storagePath === generated ? ' (regenerated on open until Storage is enabled)' : ''}` } },
  );
  await audit(actorUid, 'document.file', 'document', document_insert.id, null, { kind: spec.documentKind, entityType: spec.entityType, entityId: number, storagePath, sizeBytes: pdf.length });
  return { id: document_insert.id, storagePath, filename, sizeBytes: pdf.length };
}

const input = z.object({ kind: z.enum(['purchase-order', 'packing-list', 'roll-labels']), number: z.string().regex(/^[A-Z]{2,4}-\d{2}-\d{4}$/) });

export const fileGeneratedDocument = onCall({ region: REGION, memory: '512MiB' }, async (request) => {
  const caller = callerOf(request);
  const parsed = input.safeParse(request.data);
  if (!parsed.success) throw failure('validation', 'Choose a document and a record.');
  const spec = GENERATED[parsed.data.kind];
  requireRole(caller, spec.roles as never, 'Filing this document');
  return fileGenerated(parsed.data.kind, parsed.data.number, caller.uid);
});
