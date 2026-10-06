import { FUNCTION_NAMES, type LocalDate } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import type { DocumentKind } from '../lib/documents';
import { isSample } from './source';

// Filed documents: what hangs off a record, and the whole index for module 12.

export const DOCUMENT_KIND_LABEL: Record<string, string> = {
  commercial_invoice: 'Commercial invoice',
  packing_list: 'Packing list',
  bill_of_lading: 'Bill of lading',
  air_waybill: 'Air waybill',
  certificate_of_origin: 'Certificate of origin',
  certificate: 'Certificate',
  inspection_report: 'Inspection report',
  technical_sheet: 'Technical sheet',
  quotation: 'Quotation',
  purchase_order: 'Purchase order',
  contract: 'Contract',
  photo: 'Photo',
  other: 'Other',
};

export interface FiledDocument {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly number: string;
  readonly issuedOn: LocalDate | null;
  readonly expiresOn: LocalDate | null;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
  readonly uploadedBy: string;
  /** Where it hangs: entity type and id, with the link's role. */
  readonly links: readonly { entityType: string; entityId: string; role: string }[];
}

export const documentFilename = (document: FiledDocument) => `${document.number || document.title}.pdf`.replace(/\s+/g, '-');

// Sample mode keeps filings in memory for the session, seeded with one filed order.
const sampleDocuments: FiledDocument[] = [
  { id: 'doc-41', kind: 'purchase_order', title: 'Purchase order PO-26-0041', number: 'PO-26-0041', issuedOn: '2026-09-12' as LocalDate, expiresOn: null, storagePath: 'generated://pdf/purchase-order/PO-26-0041', mimeType: 'application/pdf', sizeBytes: 25498, createdAt: '2026-09-12T08:10:00Z', uploadedBy: 'Sample Owner', links: [{ entityType: 'purchase_order', entityId: 'PO-26-0041', role: 'generated' }] },
  { id: 'doc-40', kind: 'purchase_order', title: 'Purchase order PO-26-0040', number: 'PO-26-0040', issuedOn: '2026-09-02' as LocalDate, expiresOn: null, storagePath: 'generated://pdf/purchase-order/PO-26-0040', mimeType: 'application/pdf', sizeBytes: 24910, createdAt: '2026-09-02T09:00:00Z', uploadedBy: 'Sample Owner', links: [{ entityType: 'purchase_order', entityId: 'PO-26-0040', role: 'generated' }] },
];

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

type Row = { id: string; kind: string; title: string; number?: string | null; issuedOn?: string | null; expiresOn?: string | null; storagePath: string; mimeType: string; sizeBytes: number; createdAt: string; uploadedBy?: { name: string } | null };
const view = (row: Row, links: FiledDocument['links']): FiledDocument => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  number: row.number ?? '',
  issuedOn: (row.issuedOn ?? null) as LocalDate | null,
  expiresOn: (row.expiresOn ?? null) as LocalDate | null,
  storagePath: row.storagePath,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  createdAt: row.createdAt,
  uploadedBy: row.uploadedBy?.name ?? '',
  links,
});

export function useDocumentsFor(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['documents', entityType, entityId],
    queryFn: async (): Promise<FiledDocument[]> => {
      if (isSample) return sampleDocuments.filter((document) => document.links.some((link) => link.entityType === entityType && link.entityId === entityId));
      const { dc, sdk } = await live();
      const { data } = await sdk.listDocumentsFor(dc, { entityType, entityId });
      return data.documentLinks.map((link) => view(link.document, [{ entityType, entityId, role: link.role ?? '' }]));
    },
  });
}

export function useAllDocuments() {
  return useQuery({
    queryKey: ['documents', 'all'],
    queryFn: async (): Promise<FiledDocument[]> => {
      if (isSample) return [...sampleDocuments];
      const { dc, sdk } = await live();
      const { data } = await sdk.listDocuments(dc);
      return data.documents.map((row) => view(row, row.documentLinks_on_document.map((link) => ({ entityType: link.entityType, entityId: link.entityId, role: link.role ?? '' }))));
    },
  });
}

export function useFileDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: DocumentKind; number: string; entityType: string }): Promise<void> => {
      if (isSample) {
        const kind = input.kind === 'purchase-order' ? 'purchase_order' : input.kind === 'packing-list' ? 'packing_list' : 'other';
        const title = `${input.kind === 'purchase-order' ? 'Purchase order' : input.kind === 'packing-list' ? 'Packing list' : 'Roll labels'} ${input.number}`;
        sampleDocuments.unshift({ id: `doc-${Date.now()}`, kind, title, number: input.number, issuedOn: new Date().toISOString().slice(0, 10) as LocalDate, expiresOn: null, storagePath: `generated://pdf/${input.kind}/${input.number}`, mimeType: 'application/pdf', sizeBytes: 0, createdAt: new Date().toISOString(), uploadedBy: 'Sample session', links: [{ entityType: input.entityType, entityId: input.number, role: 'generated' }] });
        return;
      }
      await callFunction(FUNCTION_NAMES.fileGeneratedDocument, { kind: input.kind, number: input.number });
    },
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['documents'] }), client.invalidateQueries({ queryKey: ['timeline'] })]),
  });
}
