import { quoteStanding, quoteTotal, type LocalDate } from '@basis/shared';
import { read, useRead } from './data';
import { Cell, Chip, Empty, Failed, Ledger, Loading, PageTitle, Row, portalMeta } from './frame';
import { date, money, today } from './format';
import { useLocale, useT } from './i18n';
import { QUOTE } from './labels';

export const meta = () => portalMeta('Quotes');

export default function Quotes() {
  const t = useT();
  const { locale } = useLocale();
  const loaded = useRead(() => read((sdk, dc) => sdk.customerQuotesRef(dc)), []);
  const now = today() as LocalDate;
  return (
    <div>
      <PageTitle title={t('Quotes')}>{t('Every quote BASIS has sent you. Accept one and the order opens at once.')}</PageTitle>
      {loaded.loading && !loaded.data ? (
        <Loading />
      ) : loaded.error ? (
        <Failed message={loaded.error} onRetry={loaded.reload} />
      ) : loaded.data!.quotes.length === 0 ? (
        <Empty>{t('No quotes yet. When BASIS sends you one, it is here to read, download and answer.')}</Empty>
      ) : (
        <Ledger head={[t('Quote'), t('Sent'), t('Valid until'), t('Total'), t('Standing')]}>
          {loaded.data!.quotes.map((quote) => {
            const standing = QUOTE[quoteStanding(quote, now)];
            return (
              <Row key={quote.number} to={`/account/quotes/${quote.number}`}>
                <Cell code>{quote.number}</Cell>
                <Cell>{date(quote.sentOn, locale)}</Cell>
                <Cell>{date(quote.validUntil, locale)}</Cell>
                <Cell code>{money(quoteTotal(quote.lines), quote.currency)}</Cell>
                <Cell>
                  <Chip tone={standing.tone}>{t(standing.label)}</Chip>
                </Cell>
              </Row>
            );
          })}
        </Ledger>
      )}
    </div>
  );
}
