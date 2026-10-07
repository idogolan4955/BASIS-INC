import { entityPath, formatLocalDate } from '@basis/shared';
import { Button, Ledger, Panel, Td, Th, Tr } from '@basis/ui';
import { Link } from 'react-router';
import { DOCUMENT_KIND_LABEL, documentFilename, useDocumentsFor, useFileDocument, type FiledDocument } from '../data/documents';
import { useDocument, type DocumentKind } from '../lib/documents';
import { useT } from '../i18n';

// The documents filed on a record, and the generated ones it can still file.

const size = (bytes: number) => (bytes === 0 ? '—' : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export function DocumentRows({ documents, showEntity = false, shareText }: { documents: readonly FiledDocument[]; showEntity?: boolean; shareText: (document: FiledDocument) => string }) {
  const t = useT();
  const actions = useDocument();
  return (
    <>
      {actions.error && (
        <p role="alert" className="px-5 py-3 text-[0.8125rem] font-medium text-critical">
          {actions.error}
        </p>
      )}
      <Ledger caption={t('Documents')}>
        <thead>
          <tr>
            <Th>{t('Document')}</Th>
            <Th>{t('Kind')}</Th>
            {showEntity && <Th>{t('Record')}</Th>}
            <Th>{t('Issued')}</Th>
            <Th>{t('Filed')}</Th>
            <Th numeric>{t('Size')}</Th>
            <Th>{t('Keeps')}</Th>
            <Th>{t('Actions')}</Th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <Tr key={document.id}>
              <Td className="font-medium">
                {document.title}
                {document.number && <span className="code ms-2 font-normal text-ink-muted">{document.number}</span>}
              </Td>
              <Td className="text-ink-soft">{t(DOCUMENT_KIND_LABEL[document.kind] ?? document.kind)}</Td>
              {showEntity && (
                <Td>
                  {document.links.map((link) => (
                    <Link key={`${link.entityType}-${link.entityId}`} to={entityPath(link.entityType, link.entityId)} className="code me-3 underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {link.entityId}
                    </Link>
                  ))}
                </Td>
              )}
              <Td className="code whitespace-nowrap text-ink-soft">{document.issuedOn ? formatLocalDate(document.issuedOn) : '—'}</Td>
              <Td className="code whitespace-nowrap text-ink-soft">{document.createdAt.slice(0, 10)}</Td>
              <Td numeric className="text-ink-soft">{size(document.sizeBytes)}</Td>
              <Td className="text-ink-soft">{document.storagePath.startsWith('generated://') ? 'Regenerated on open' : 'Stored copy'}</Td>
              <Td>
                <span className="flex gap-1">
                  <Button size="sm" variant="quiet" onClick={() => actions.openFiled(document.storagePath, documentFilename(document))} busy={actions.busy === document.storagePath} busyLabel={t('Opening')}>{t('Open')}</Button>
                  <Button size="sm" variant="quiet" onClick={() => actions.shareFiled(document.storagePath, documentFilename(document), shareText(document))} busy={actions.busy === `share:${document.storagePath}`} busyLabel={t('Sharing')}>{t('WhatsApp')}</Button>
                </span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Ledger>
    </>
  );
}

export function DocumentsPanel({
  entityType,
  entityId,
  generated,
  canFile,
  shareText,
}: {
  entityType: string;
  entityId: string;
  /** The generated documents this record can file now. */
  generated: readonly { kind: DocumentKind; label: string; available: boolean }[];
  canFile: boolean;
  shareText: string;
}) {
  const t = useT();
  const documents = useDocumentsFor(entityType, entityId);
  const file = useFileDocument();
  const rows = documents.data ?? [];
  return (
    <Panel
      title={t('Documents')}
      count={rows.length}
      flush
      action={
        canFile && (
          <span className="flex flex-wrap items-center gap-2">
            {file.error && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {file.error.message}
              </span>
            )}
            {generated
              .filter((candidate) => candidate.available)
              .map((candidate) => (
                <Button key={candidate.kind} size="sm" onClick={() => file.mutate({ kind: candidate.kind, number: entityId, entityType })} busy={file.isPending && file.variables?.kind === candidate.kind} busyLabel={t('Filing')}>
                  File {candidate.label}
                </Button>
              ))}
          </span>
        )
      }
    >
      {documents.isPending ? (
        <p className="px-5 py-6 text-ink-muted">{t('Loading documents')}</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-ink-muted">{t('Nothing filed yet. A filed document keeps the version that was sent; the buttons above file the current one.')}</p>
      ) : (
        <DocumentRows documents={rows} shareText={() => shareText} />
      )}
    </Panel>
  );
}
