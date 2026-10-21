import { addDays, localDate, stageFromQuote, todayIn, type InteractionView, type OpportunityFacts, type PriceListView } from '@basis/shared';
import type { InteractionInput, OpportunityInput, PriceListInput } from './relationships';

// SAMPLE DATA for `--mode sample`: a wholesale price list and a key-account
// list, a handful of opportunities across the pipeline, and the calls and
// visits behind them. The same rules as the functions apply.

const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
const ago = (days: number, hour = 10) => `${addDays(today(), -days)}T${String(hour).padStart(2, '0')}:00:00Z`;

const CUSTOMERS: Record<string, string> = { 'co-avelline': 'Maison Avelline', 'co-solenne': 'Atelier Solenne', 'co-novia': 'Novia Estudio', 'co-halden': 'Halden Bridal', 'co-lorena': 'Casa Lorena Atelier' };

const store = {
  priceLists: [
    { id: 'WS-2026', name: 'Wholesale 2026', currency: 'EUR', tier: null, validFrom: localDate('2026-01-01'), validTo: null, isDefault: true, updatedAt: ago(60), lines: [
      { id: 'pl-1', skuCode: null, productCode: 'PWM', minQuantity: '0', unitPrice: '72000' },
      { id: 'pl-2', skuCode: null, productCode: 'PWM', minQuantity: '500000', unitPrice: '68000' },
      { id: 'pl-3', skuCode: null, productCode: 'ILM', minQuantity: '0', unitPrice: '64000' },
      { id: 'pl-4', skuCode: null, productCode: 'N58', minQuantity: '0', unitPrice: '66000' },
      { id: 'pl-5', skuCode: null, productCode: 'SHL', minQuantity: '0', unitPrice: '52500' },
      { id: 'pl-6', skuCode: null, productCode: 'BTL', minQuantity: '0', unitPrice: '48000' },
      { id: 'pl-7', skuCode: 'PWM-160-SK02', productCode: null, minQuantity: '0', unitPrice: '74000' },
    ] },
    { id: 'KEY-2026', name: 'Key accounts 2026', currency: 'EUR', tier: 'key', validFrom: localDate('2026-01-01'), validTo: null, isDefault: false, updatedAt: ago(30), lines: [
      { id: 'pl-8', skuCode: null, productCode: 'PWM', minQuantity: '0', unitPrice: '64000' },
      { id: 'pl-9', skuCode: null, productCode: 'SHL', minQuantity: '0', unitPrice: '47000' },
      { id: 'pl-10', skuCode: null, productCode: 'BTL', minQuantity: '0', unitPrice: '43000' },
    ] },
  ] as Mutable<PriceListView>[],
  opportunities: [
    { id: 'opp-1', customerId: 'co-solenne', customerName: 'Atelier Solenne', title: 'Spring collection foundation layers', stage: 'negotiating', source: 'fair', value: '81600000', currency: 'EUR', expectedClose: addDays(today(), 12), ownerUid: 'sample-sales', ownerName: 'Sales', quoteNumber: 'QUO-26-0018', orderNumber: null, lostReason: '', notes: 'Met at Première Vision. Wants Skin 02 across the range.', lastActivityAt: ago(2), createdAt: ago(20), closedAt: null },
    { id: 'opp-2', customerId: 'co-novia', customerName: 'Novia Estudio', title: 'Illusion mesh for the bodice line', stage: 'quoting', source: 'website', value: '32000000', currency: 'EUR', expectedClose: addDays(today(), 30), ownerUid: 'sample-sales', ownerName: 'Sales', quoteNumber: 'QUO-26-0017', orderNumber: null, lostReason: '', notes: '', lastActivityAt: ago(1), createdAt: ago(9), closedAt: null },
    { id: 'opp-3', customerId: 'co-halden', customerName: 'Halden Bridal', title: 'Second salon, full shade kit', stage: 'sampling', source: 'existing', value: '18000000', currency: 'GBP', expectedClose: addDays(today(), 45), ownerUid: 'sample-owner', ownerName: 'Owner', quoteNumber: null, orderNumber: null, lostReason: '', notes: 'Kit sent 3 weeks ago; chase.', lastActivityAt: ago(19), createdAt: ago(28), closedAt: null },
    { id: 'opp-4', customerId: 'co-lorena', customerName: 'Casa Lorena Atelier', title: 'Tulle for the veil atelier', stage: 'lead', source: 'referral', value: null, currency: 'USD', expectedClose: null, ownerUid: 'sample-sales', ownerName: 'Sales', quoteNumber: null, orderNumber: null, lostReason: '', notes: 'Referred by Avelline.', lastActivityAt: ago(4), createdAt: ago(4), closedAt: null },
    { id: 'opp-5', customerId: 'co-avelline', customerName: 'Maison Avelline', title: 'Autumn order, Powermesh and lining', stage: 'won', source: 'existing', value: '97350000', currency: 'EUR', expectedClose: addDays(today(), -14), ownerUid: 'sample-owner', ownerName: 'Owner', quoteNumber: 'QUO-26-0016', orderNumber: 'SO-26-0041', lostReason: '', notes: '', lastActivityAt: ago(14), createdAt: ago(40), closedAt: ago(14) },
    { id: 'opp-6', customerId: 'co-novia', customerName: 'Novia Estudio', title: 'Lining trial, 300 m', stage: 'lost', source: 'outreach', value: '15750000', currency: 'EUR', expectedClose: addDays(today(), -30), ownerUid: 'sample-sales', ownerName: 'Sales', quoteNumber: null, orderNumber: null, lostReason: 'Stayed with the local supplier on price', notes: '', lastActivityAt: ago(31), createdAt: ago(70), closedAt: ago(31) },
  ] as Mutable<OpportunityFacts>[],
  interactions: [
    { id: 'int-1', customerId: 'co-solenne', customerName: 'Atelier Solenne', contactName: 'Giulia Ferrante', opportunityId: 'opp-1', opportunityTitle: 'Spring collection foundation layers', kind: 'meeting', occurredAt: ago(2, 11), summary: 'Reviewed QUO-26-0018 line by line. Wants 60-day terms on the first order; price accepted.', nextStep: 'Send revised terms', nextOn: addDays(today(), 1), byName: 'Sales' },
    { id: 'int-2', customerId: 'co-solenne', customerName: 'Atelier Solenne', contactName: 'Giulia Ferrante', opportunityId: 'opp-1', opportunityTitle: 'Spring collection foundation layers', kind: 'sample', occurredAt: ago(12, 9), summary: 'Shade kit and 2 m of Powermesh Skin 02 sent by courier.', nextStep: '', nextOn: null, byName: 'Sales' },
    { id: 'int-3', customerId: 'co-novia', customerName: 'Novia Estudio', contactName: '', opportunityId: 'opp-2', opportunityTitle: 'Illusion mesh for the bodice line', kind: 'email', occurredAt: ago(1, 16), summary: 'Asked for the Illusion Stretch Mesh technical sheet and the Milk standard.', nextStep: 'Send QUO-26-0017', nextOn: today(), byName: 'Sales' },
    { id: 'int-4', customerId: 'co-halden', customerName: 'Halden Bridal', contactName: 'Nora Halden', opportunityId: 'opp-3', opportunityTitle: 'Second salon, full shade kit', kind: 'call', occurredAt: ago(19, 14), summary: 'Opening the second salon in spring; wants the full kit on the wall.', nextStep: 'Chase on the kit', nextOn: addDays(today(), -5), byName: 'Owner' },
    { id: 'int-5', customerId: 'co-avelline', customerName: 'Maison Avelline', contactName: 'Claire Dubois', opportunityId: 'opp-5', opportunityTitle: 'Autumn order, Powermesh and lining', kind: 'visit', occurredAt: ago(14, 10), summary: 'Signed off the autumn order at the atelier; SO-26-0041 confirmed.', nextStep: '', nextOn: null, byName: 'Owner' },
  ] as Mutable<InteractionView>[],
  sequence: { opp: 6, int: 5 },
};

export const sampleRelationships = {
  async priceLists(): Promise<PriceListView[]> {
    return structuredClone(store.priceLists);
  },
  async savePriceList(input: PriceListInput): Promise<{ code: string }> {
    if (input.isDefault) for (const list of store.priceLists) if (list.currency === input.currency) list.isDefault = false;
    const lines = input.lines.map((line, index) => ({ id: `pl-${input.code}-${index}`, skuCode: line.skuCode ?? null, productCode: line.productCode ?? null, minQuantity: line.minQuantity, unitPrice: line.unitPrice }));
    const record = { id: input.code, name: input.name, currency: input.currency, tier: input.tier, validFrom: input.validFrom && localDate(input.validFrom), validTo: input.validTo && localDate(input.validTo), isDefault: input.isDefault, updatedAt: new Date().toISOString(), lines } as Mutable<PriceListView>;
    const index = store.priceLists.findIndex((list) => list.id === input.code);
    if (index >= 0) store.priceLists[index] = record;
    else store.priceLists.push(record);
    return { code: input.code };
  },

  async opportunities(): Promise<OpportunityFacts[]> {
    return structuredClone(store.opportunities);
  },
  async saveOpportunity(input: OpportunityInput): Promise<{ id: string }> {
    if (input.stage === 'lost' && !input.lostReason.trim()) throw new Error('Say why it was lost.');
    const closed = input.stage === 'won' || input.stage === 'lost';
    const existing = input.id ? store.opportunities.find((opportunity) => opportunity.id === input.id) : undefined;
    const facts = { customerId: input.customerId, customerName: CUSTOMERS[input.customerId] ?? input.customerId, title: input.title.trim(), stage: input.stage, source: input.source, value: input.value, currency: input.currency, expectedClose: input.expectedClose ? localDate(input.expectedClose) : null, quoteNumber: input.quoteNumber, lostReason: input.stage === 'lost' ? input.lostReason.trim() : '', notes: input.notes, closedAt: closed ? (existing?.closedAt ?? new Date().toISOString()) : null };
    if (existing) {
      Object.assign(existing, facts);
      return { id: existing.id };
    }
    store.sequence.opp += 1;
    const id = `opp-${store.sequence.opp}`;
    store.opportunities.unshift({ ...facts, id, ownerUid: 'sample-owner', ownerName: 'Owner', orderNumber: null, lastActivityAt: new Date().toISOString(), createdAt: new Date().toISOString() });
    return { id };
  },
  /** The sample quote transitions call this so the pipeline follows the quote. */
  followQuote(quoteNumber: string, state: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired', orderNumber: string | null): void {
    for (const opportunity of store.opportunities) {
      if (opportunity.quoteNumber !== quoteNumber) continue;
      const next = stageFromQuote(state, opportunity.stage);
      opportunity.stage = next;
      opportunity.lastActivityAt = new Date().toISOString();
      if (orderNumber) opportunity.orderNumber = orderNumber;
      if (next === 'won' || next === 'lost') opportunity.closedAt ??= new Date().toISOString();
      if (next === 'lost' && !opportunity.lostReason) opportunity.lostReason = 'Quote declined';
    }
  },

  async interactions(customerId?: string): Promise<InteractionView[]> {
    const rows = customerId ? store.interactions.filter((interaction) => interaction.customerId === customerId) : store.interactions;
    return structuredClone([...rows].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));
  },
  async logInteraction(input: InteractionInput): Promise<{ id: string; taskId: string | null }> {
    store.sequence.int += 1;
    const id = `int-${store.sequence.int}`;
    const opportunity = input.opportunityId ? store.opportunities.find((candidate) => candidate.id === input.opportunityId) : undefined;
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    store.interactions.unshift({ id, customerId: input.customerId, customerName: CUSTOMERS[input.customerId] ?? input.customerId, contactName: '', opportunityId: opportunity?.id ?? null, opportunityTitle: opportunity?.title ?? '', kind: input.kind, occurredAt, summary: input.summary.trim(), nextStep: input.nextStep.trim(), nextOn: input.nextOn ? localDate(input.nextOn) : null, byName: 'Owner' });
    if (opportunity) opportunity.lastActivityAt = occurredAt;
    return { id, taskId: input.taskForNextStep && input.nextStep.trim() ? `task-${id}` : null };
  },
};
