import { Button, Ledger, Panel, StatusChip, Td, Th, Tr } from '@basis/ui';
import { useState } from 'react';
import { INQUIRY_KIND_LABEL, useInquiries, useMarkInquiry, type InquiryView } from '../../data/inquiries';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 09, inquiries: what the website sent in, newest first, until it is
// answered and becomes a lead.

function Detail({ inquiry }: { inquiry: InquiryView }) {
  return (
    <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
      {[
        ['Email', inquiry.email],
        ['Phone', inquiry.phone],
        ['Country', inquiry.country],
        ['Business', inquiry.customerType],
        ['Topic', inquiry.topic],
        ['Fabrics', inquiry.products.join(', ')],
        ['Shades', inquiry.shades.join(', ')],
        ['Volume', inquiry.volume],
        ['Address', inquiry.address],
        ['From page', inquiry.page],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <dt className="caps text-ink-muted">{label}</dt>
            <dd className="mt-0.5">{value}</dd>
          </div>
        ))}
      {inquiry.message && (
        <div className="sm:col-span-2">
          <dt className="caps text-ink-muted">Message</dt>
          <dd className="mt-0.5 whitespace-pre-line">{inquiry.message}</dd>
        </div>
      )}
    </dl>
  );
}

export function Inquiries() {
  const inquiries = useInquiries();
  const mark = useMarkInquiry();
  const [open, setOpen] = useState<string | null>(null);
  const rows = inquiries.data ?? [];
  return (
    <>
      <ModuleTitle number="09" title="Customers">
        Inquiries from the website: sample requests, wholesale applications, messages.
      </ModuleTitle>
      <div className="px-5 py-6 lg:px-8">
        <Panel title="Inquiries" count={rows.filter((inquiry) => inquiry.state === 'new').length} flush>
          {inquiries.isPending ? (
            <p className="px-5 py-6 text-ink-muted">Loading inquiries</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-6 text-ink-muted">Nothing has come in from the website yet.</p>
          ) : (
            <Ledger caption="Inquiries">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Kind</Th>
                  <Th>From</Th>
                  <Th>Country</Th>
                  <Th>Received</Th>
                  <Th>State</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inquiry) => (
                  <>
                    <Tr key={inquiry.id}>
                      <Td>
                        <button type="button" onClick={() => setOpen(open === inquiry.id ? null : inquiry.id)} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink" aria-expanded={open === inquiry.id}>
                          {inquiry.reference}
                        </button>
                      </Td>
                      <Td className="text-ink-soft">{INQUIRY_KIND_LABEL[inquiry.kind] ?? inquiry.kind}</Td>
                      <Td className="font-medium">
                        {inquiry.company || inquiry.name}
                        {inquiry.company && <span className="ms-2 font-normal text-ink-muted">{inquiry.name}</span>}
                      </Td>
                      <Td className="text-ink-soft">{inquiry.country || '—'}</Td>
                      <Td className="code whitespace-nowrap text-ink-soft">{inquiry.createdAt.slice(0, 10)}</Td>
                      <Td>
                        <StatusChip tone={inquiry.state === 'new' ? 'caution' : 'positive'}>{inquiry.state === 'new' ? 'New' : 'Handled'}</StatusChip>
                      </Td>
                      <Td>
                        <Button size="sm" variant="quiet" onClick={() => mark.mutate({ reference: inquiry.reference, state: inquiry.state === 'new' ? 'handled' : 'new' })} busy={mark.isPending && mark.variables?.reference === inquiry.reference} busyLabel="Saving">
                          {inquiry.state === 'new' ? 'Mark handled' : 'Reopen'}
                        </Button>
                      </Td>
                    </Tr>
                    {open === inquiry.id && (
                      <tr key={`${inquiry.id}-detail`} className="bg-bone">
                        <Td colSpan={7}>
                          <Detail inquiry={inquiry} />
                        </Td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
    </>
  );
}
