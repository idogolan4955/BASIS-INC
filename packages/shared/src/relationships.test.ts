import { describe, expect, it } from 'vitest';
import { localDate } from './local-date';
import { nextStepsDue, opportunityHealth, pipelineSummary, priceFor, stageFromQuote, winRate, type PriceListView } from './relationships';

const lists: PriceListView[] = [
  { id: 'gen', name: 'Wholesale 2026', currency: 'EUR', tier: null, validFrom: localDate('2026-01-01'), validTo: null, isDefault: true, updatedAt: '2026-01-01T00:00:00Z', lines: [
    { id: '1', skuCode: null, productCode: 'PWM', minQuantity: '0', unitPrice: '72000' },
    { id: '2', skuCode: null, productCode: 'PWM', minQuantity: '500000', unitPrice: '68000' },
    { id: '3', skuCode: 'PWM-160-SK02', productCode: 'PWM', minQuantity: '0', unitPrice: '74000' },
  ] },
  { id: 'key', name: 'Key accounts', currency: 'EUR', tier: 'key', validFrom: null, validTo: null, isDefault: false, updatedAt: '2026-02-01T00:00:00Z', lines: [{ id: '4', skuCode: null, productCode: 'PWM', minQuantity: '0', unitPrice: '64000' }] },
  { id: 'usd', name: 'US list', currency: 'USD', tier: null, validFrom: null, validTo: localDate('2026-06-30'), isDefault: false, updatedAt: '2026-01-01T00:00:00Z', lines: [{ id: '5', skuCode: null, productCode: 'PWM', minQuantity: '0', unitPrice: '80000' }] },
];
const on = localDate('2026-10-21');

describe('price lists', () => {
  it('prefers the tier list, then the SKU line, then the highest quantity break reached', () => {
    expect(priceFor(lists, { skuCode: 'PWM-160-SK02', productCode: 'PWM', tier: 'key', currency: 'EUR', quantity: '100000', on })).toMatchObject({ unitPrice: '64000', listId: 'key', by: 'product' });
    expect(priceFor(lists, { skuCode: 'PWM-160-SK02', productCode: 'PWM', tier: 'standard', currency: 'EUR', quantity: '100000', on })).toMatchObject({ unitPrice: '74000', by: 'sku' });
    expect(priceFor(lists, { skuCode: 'PWM-160-MLK', productCode: 'PWM', tier: 'standard', currency: 'EUR', quantity: '100000', on })).toMatchObject({ unitPrice: '72000' });
    expect(priceFor(lists, { skuCode: 'PWM-160-MLK', productCode: 'PWM', tier: 'standard', currency: 'EUR', quantity: '500000', on })).toMatchObject({ unitPrice: '68000' });
  });
  it('respects currency and validity, and says nothing when nothing applies', () => {
    expect(priceFor(lists, { skuCode: 'PWM-160-MLK', productCode: 'PWM', tier: null, currency: 'USD', quantity: '1000', on })).toBeNull();
    expect(priceFor(lists, { skuCode: 'PWM-160-MLK', productCode: 'PWM', tier: null, currency: 'USD', quantity: '1000', on: localDate('2026-03-01') })).toMatchObject({ unitPrice: '80000' });
    expect(priceFor(lists, { skuCode: 'BTL-160-MLK', productCode: 'BTL', tier: null, currency: 'EUR', quantity: '1000', on })).toBeNull();
  });
});

describe('opportunities', () => {
  const today = localDate('2026-10-21');
  it('reads health from the dates', () => {
    expect(opportunityHealth({ stage: 'quoting', expectedClose: null, lastActivityAt: '2026-10-20T10:00:00Z' }, today)).toEqual({ health: 'active', daysSinceActivity: 1 });
    expect(opportunityHealth({ stage: 'quoting', expectedClose: null, lastActivityAt: '2026-09-20T10:00:00Z' }, today).health).toBe('quiet');
    expect(opportunityHealth({ stage: 'quoting', expectedClose: localDate('2026-10-01'), lastActivityAt: '2026-10-20T10:00:00Z' }, today).health).toBe('overdue');
    expect(opportunityHealth({ stage: 'won', expectedClose: localDate('2026-10-01'), lastActivityAt: '2026-08-01T10:00:00Z' }, today).health).toBe('closed');
  });
  it('lets a quote pull the stage forward, never back, and never reopens a closed one', () => {
    expect(stageFromQuote('draft', 'sampling')).toBe('quoting');
    expect(stageFromQuote('sent', 'quoting')).toBe('negotiating');
    expect(stageFromQuote('draft', 'negotiating')).toBe('negotiating');
    expect(stageFromQuote('accepted', 'negotiating')).toBe('won');
    expect(stageFromQuote('declined', 'quoting')).toBe('lost');
    expect(stageFromQuote('sent', 'won')).toBe('won');
  });
  it('sums the pipeline per stage in one currency and counts the rest', () => {
    const summary = pipelineSummary([
      { stage: 'quoting', value: '1000000', currency: 'EUR' },
      { stage: 'quoting', value: '500000', currency: 'USD' },
      { stage: 'quoting', value: null, currency: 'EUR' },
      { stage: 'won', value: '2000000', currency: 'EUR' },
    ], 'EUR');
    expect(summary.find((entry) => entry.stage === 'quoting')).toEqual({ stage: 'quoting', count: 3, value: '1000000', otherCurrencies: 1 });
    expect(summary.find((entry) => entry.stage === 'lead')?.count).toBe(0);
    expect(winRate([{ stage: 'won' }, { stage: 'won' }, { stage: 'lost' }, { stage: 'quoting' }])).toBe(67);
    expect(winRate([{ stage: 'quoting' }])).toBeNull();
  });
});

describe('interactions', () => {
  it('lists next steps that are due, oldest first', () => {
    const base = { id: '', customerId: 'c', customerName: 'C', contactName: '', opportunityId: null, opportunityTitle: '', kind: 'call' as const, occurredAt: '', summary: '', byName: '' };
    const due = nextStepsDue([
      { ...base, id: 'a', nextStep: 'Send swatches', nextOn: localDate('2026-10-22') },
      { ...base, id: 'b', nextStep: 'Call back', nextOn: localDate('2026-10-19') },
      { ...base, id: 'c', nextStep: '', nextOn: localDate('2026-10-01') },
      { ...base, id: 'd', nextStep: 'Visit', nextOn: localDate('2026-10-21') },
    ], localDate('2026-10-21'));
    expect(due.map((entry) => entry.id)).toEqual(['b', 'd']);
  });
});
