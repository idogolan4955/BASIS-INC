import { useState } from 'react';
import { Link } from 'react-router';
import { call, openDocument, useRead } from './data';
import { Empty, Failed, Loading, PageTitle, portalMeta } from './frame';
import { Alert } from './fields';
import { date } from './format';
import { useLocale, useT } from './i18n';
import { DOCUMENT_KIND } from './labels';

export const meta = () => portalMeta('Documents');

interface DocumentRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly number: string | null;
  readonly issuedOn: string | null;
  readonly record: string;
  readonly recordType: 'quote' | 'sales_order' | 'shipment';
  readonly href: string;
}

const RECORD_PATH = { quote: 'quotes', sales_order: 'orders', shipment: 'shipments' } as const;

export default function Documents() {
  const t = useT();
  const { locale } = useLocale();
  const loaded = useRead(() => call<object, { documents: DocumentRow[] }>('customerDocuments', {}), []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const open = async (doc: DocumentRow) => {
    setError('');
    setBusy(doc.id);
    try {
      await openDocument(doc.href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('The document could not be opened.'));
    } finally {
      setBusy('');
    }
  };
  const documents = loaded.data?.documents ?? [];
  const groups = [...new Map(documents.map((doc) => [doc.record, documents.filter((item) => item.record === doc.record)])).entries()];
  return (
    <div>
      <PageTitle title={t('Documents')}>{t('Quotations, packing lists, shipping papers and certificates for your quotes, orders and shipments.')}</PageTitle>
      {error && (
        <div className="mb-6">
          <Alert>{error}</Alert>
        </div>
      )}
      {loaded.loading && !loaded.data ? (
        <Loading />
      ) : loaded.error ? (
        <Failed message={loaded.error} onRetry={loaded.reload} />
      ) : documents.length === 0 ? (
        <Empty>{t('No documents yet.')}</Empty>
      ) : (
        <div className="grid gap-10">
          {groups.map(([record, docs]) => (
            <section key={record}>
              <Link to={`/account/${RECORD_PATH[docs[0]!.recordType]}/${record}`} className="code uppercase tracking-[0.14em] text-ink-muted hover:text-ink" dir="ltr">
                {record}
              </Link>
              <ul className="mt-2 border-t border-charcoal/70">
                {docs.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
                    <span>
                      <span className="code me-3 text-ink-muted">{t(DOCUMENT_KIND[doc.kind] ?? 'Document')}</span>
                      {doc.title}
                      {doc.issuedOn && <span className="ms-2 text-sm text-ink-muted">{date(doc.issuedOn, locale)}</span>}
                    </span>
                    <button type="button" onClick={() => void open(doc)} disabled={busy === doc.id} className="code uppercase tracking-[0.14em] underline decoration-nude-deep underline-offset-[6px] disabled:opacity-60">
                      {busy === doc.id ? t('Opening') : t('Open')}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
