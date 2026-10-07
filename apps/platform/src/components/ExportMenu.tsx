import { EXPORT_FORMATS, LEDGERS, columnsFor, type ExportLedger, type ExportRow } from '@basis/shared';
import { Button, cn } from '@basis/ui';
import { DownloadSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { isSample } from '../data/source';
import { saveCsv, useDocument } from '../lib/documents';
import { useRequiredSession } from '../session';
import { useT } from '../i18n';

// A ledger leaves as a file: CSV or XLSX from the api, or CSV built here in
// sample mode from the rows on screen.

export function ExportMenu({ ledger, scope, rows, size = 'sm' }: { ledger: ExportLedger; scope?: Record<string, string | undefined>; rows?: readonly ExportRow[]; size?: 'sm' | 'md' }) {
  const t = useT();
  const session = useRequiredSession();
  const documents = useDocument();
  const [open, setOpen] = useState(false);
  const scopeTag = scope ? Object.values(scope).find(Boolean) : undefined;
  const choose = (format: 'csv' | 'xlsx') => {
    setOpen(false);
    if (isSample) {
      if (rows) saveCsv(ledger, columnsFor(ledger, session.role), rows, scopeTag);
      return;
    }
    void documents.exportLedger(ledger, format, scope);
  };
  const formats = isSample ? (['csv'] as const) : EXPORT_FORMATS;
  return (
    <span className="relative inline-flex items-center gap-2">
      {documents.error && (
        <span role="alert" className="text-[0.8125rem] font-medium text-critical">
          {documents.error}
        </span>
      )}
      <Button size={size} onClick={() => setOpen((value) => !value)} busy={documents.busy?.startsWith('export:') ?? false} busyLabel={t('Preparing')} aria-haspopup="menu" aria-expanded={open} disabled={isSample && !rows}>
        <DownloadSimple size={14} aria-hidden="true" />
        {t('Export')}
      </Button>
      {open && (
        <>
          <button type="button" aria-label={t('Close')} className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <span role="menu" className="absolute end-0 top-full z-20 mt-1 min-w-40 rounded-[var(--radius-panel)] border border-line bg-panel py-1 shadow-[0_8px_24px_-12px_rgba(43,39,36,0.35)]">
            {formats.map((format) => (
              <button
                key={format}
                role="menuitem"
                type="button"
                onClick={() => choose(format)}
                className={cn('flex w-full items-center justify-between gap-4 px-3 py-2 text-start text-sm hover:bg-sunken')}
              >
                <span>{t(LEDGERS[ledger].title)}</span>
                <span className="code text-ink-muted">{format.toUpperCase()}</span>
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}
