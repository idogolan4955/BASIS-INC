import { invoiceOutstanding, invoiceStanding, type LocalDate } from '@basis/shared';
import { Link } from 'react-router';
import { read, useRead } from './data';
import { Cell, Chip, Empty, Failed, Ledger, Loading, PageTitle, Row, portalMeta } from './frame';
import { date, money, today } from './format';
import { useLocale, useT } from './i18n';
import { INVOICE } from './labels';

export const meta = () => portalMeta('Invoices');

export default function Invoices() {
  const t = useT();
  const { locale } = useLocale();
  const loaded = useRead(() => read((sdk, dc) => sdk.customerInvoicesRef(dc)), []);
  const now = today() as LocalDate;
  const invoices = loaded.data?.invoiceRefs ?? [];
  const outstanding = new Map<string, bigint>();
  for (const invoice of invoices) outstanding.set(invoice.currency, (outstanding.get(invoice.currency) ?? 0n) + BigInt(invoiceOutstanding(invoice)));
  return (
    <div>
      <PageTitle title={t('Invoices')}>{t('What BASIS has invoiced you, and what is still open. Payment in the portal comes next; until then, pay by bank transfer as on the invoice.')}</PageTitle>
      {loaded.loading && !loaded.data ? (
        <Loading />
      ) : loaded.error ? (
        <Failed message={loaded.error} onRetry={loaded.reload} />
      ) : invoices.length === 0 ? (
        <Empty>{t('No invoices yet.')}</Empty>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap gap-x-10 gap-y-3">
            {[...outstanding.entries()].map(([currency, amount]) => (
              <div key={currency}>
                <p className="code uppercase tracking-[0.14em] text-ink-muted">{t('Outstanding')}</p>
                <p className="code mt-1 text-2xl" dir="ltr">
                  {money(amount.toString(), currency)}
                </p>
              </div>
            ))}
          </div>
          <Ledger head={[t('Invoice'), t('Order'), t('Issued'), t('Due'), t('Amount'), t('Outstanding'), t('Standing')]}>
            {invoices.map((invoice) => {
              const standing = INVOICE[invoiceStanding(invoice, now)];
              return (
                <Row key={`${invoice.order.number}-${invoice.number}`}>
                  <Cell code>{invoice.number}</Cell>
                  <Cell code>
                    <Link to={`/account/orders/${invoice.order.number}`} className="underline underline-offset-4">
                      {invoice.order.number}
                    </Link>
                  </Cell>
                  <Cell>{date(invoice.issuedOn, locale)}</Cell>
                  <Cell>{date(invoice.dueOn, locale)}</Cell>
                  <Cell code>{money(invoice.amount, invoice.currency)}</Cell>
                  <Cell code>{money(invoiceOutstanding(invoice), invoice.currency)}</Cell>
                  <Cell>
                    <Chip tone={standing.tone}>{t(standing.label)}</Chip>
                  </Cell>
                </Row>
              );
            })}
          </Ledger>
        </>
      )}
    </div>
  );
}
