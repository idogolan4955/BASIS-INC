import { Button, Panel } from '@basis/ui';
import { useMemo, useState } from 'react';
import { DocumentRows } from '../../components/DocumentsPanel';
import { DOCUMENT_KIND_LABEL, useAllDocuments } from '../../data/documents';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 12: every document across modules, by kind, newest first.

export function Documents() {
  const documents = useAllDocuments();
  const [kind, setKind] = useState<string>('all');
  const rows = documents.data ?? [];
  const kinds = useMemo(() => [...new Set(rows.map((document) => document.kind))], [rows]);
  const shown = kind === 'all' ? rows : rows.filter((document) => document.kind === kind);
  return (
    <>
      <ModuleTitle number="12" title="Documents">
        Every document across modules: filed as sent, opened as kept, shared on.
      </ModuleTitle>
      <nav aria-label="Document kinds" className="flex flex-wrap gap-2 border-b border-line bg-panel px-5 py-3 lg:px-8">
        {['all', ...kinds].map((candidate) => (
          <Button key={candidate} size="sm" variant={kind === candidate ? 'primary' : 'secondary'} onClick={() => setKind(candidate)}>
            {candidate === 'all' ? `All · ${rows.length}` : `${DOCUMENT_KIND_LABEL[candidate] ?? candidate} · ${rows.filter((document) => document.kind === candidate).length}`}
          </Button>
        ))}
      </nav>
      <div className="px-5 py-6 lg:px-8">
        <Panel title="Documents" count={shown.length} flush>
          {documents.isPending ? (
            <p className="px-5 py-6 text-ink-muted">Loading documents</p>
          ) : shown.length === 0 ? (
            <p className="px-5 py-6 text-ink-muted">Nothing filed yet. Issue a purchase order, or file a packing list or roll labels from their records.</p>
          ) : (
            <DocumentRows documents={shown} showEntity shareText={(document) => `${document.title} from BASIS INC.`} />
          )}
        </Panel>
      </div>
    </>
  );
}
