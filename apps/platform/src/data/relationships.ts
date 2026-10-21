import { FUNCTION_NAMES, isLocalDate, opportunityView, todayIn, type CustomerTier, type InteractionKind, type InteractionView, type OpportunityFacts, type OpportunitySource, type OpportunityStage, type OpportunityView, type PriceListView } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// Price lists, opportunities and interactions. Read from the connector,
// written through the relationship functions.

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('../lib/connector').then((m) => m.platform())]);
  return { dc: dataConnect, sdk };
}
const sample = async () => (await import('./sample-relationships')).sampleRelationships;
const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
const asDate = (value: string | null | undefined) => (value && isLocalDate(value) ? value : null);
const nameOf = (company: { legalName: string; tradingName?: string | null }) => company.tradingName || company.legalName;

export function usePriceLists() {
  return useQuery({
    queryKey: ['relationships', 'price-lists'],
    queryFn: async (): Promise<PriceListView[]> => {
      if (isSample) return (await sample()).priceLists();
      const { dc, sdk } = await live();
      const { data } = await sdk.listPriceLists(dc);
      return data.priceLists.map((row) => ({
        id: row.code,
        name: row.name,
        currency: row.currency,
        tier: (row.tier as CustomerTier | null) ?? null,
        validFrom: asDate(row.validFrom),
        validTo: asDate(row.validTo),
        isDefault: row.isDefault,
        updatedAt: row.updatedAt ?? '',
        lines: [
          ...row.priceListItems_on_priceList.map((line) => ({ id: line.id, skuCode: line.sku.code, productCode: null, minQuantity: line.minQuantity, unitPrice: line.unitPrice })),
          ...row.priceListProductItems_on_priceList.map((line) => ({ id: line.id, skuCode: null, productCode: line.product.code, minQuantity: line.minQuantity, unitPrice: line.unitPrice })),
        ],
      }));
    },
  });
}

export function useOpportunities() {
  return useQuery({
    queryKey: ['relationships', 'opportunities'],
    queryFn: async (): Promise<OpportunityView[]> => {
      const day = today();
      if (isSample) return (await sample()).opportunities().then((rows) => rows.map((row) => opportunityView(row, day)));
      const { dc, sdk } = await live();
      const { data } = await sdk.listOpportunities(dc);
      return data.opportunities.map((row) => {
        const facts: OpportunityFacts = {
          id: row.id,
          customerId: row.customer.id,
          customerName: nameOf(row.customer),
          title: row.title,
          stage: row.stage as OpportunityStage,
          source: (row.source as OpportunitySource | null) ?? null,
          value: row.value ?? null,
          currency: row.currency,
          expectedClose: asDate(row.expectedClose),
          ownerUid: row.owner?.uid ?? '',
          ownerName: row.owner?.name ?? '',
          quoteNumber: row.quote?.number ?? null,
          orderNumber: row.order?.number ?? null,
          lostReason: row.lostReason ?? '',
          notes: row.notes ?? '',
          lastActivityAt: row.lastActivityAt,
          createdAt: row.createdAt,
          closedAt: row.closedAt ?? null,
        };
        return opportunityView(facts, day);
      });
    },
  });
}

type InteractionRow = { id: string; kind: string; occurredAt: string; summary: string; nextStep?: string | null; nextOn?: string | null; customer: { id: string; legalName: string; tradingName?: string | null }; contact?: { name: string } | null; opportunity?: { id: string; title: string } | null; by?: { name: string } | null };
const interactionView = (row: InteractionRow): InteractionView => ({ id: row.id, customerId: row.customer.id, customerName: nameOf(row.customer), contactName: row.contact?.name ?? '', opportunityId: row.opportunity?.id ?? null, opportunityTitle: row.opportunity?.title ?? '', kind: row.kind as InteractionKind, occurredAt: row.occurredAt, summary: row.summary, nextStep: row.nextStep ?? '', nextOn: asDate(row.nextOn), byName: row.by?.name ?? '' });

export function useInteractions(customerId?: string, limit = 200) {
  return useQuery({
    queryKey: ['relationships', 'interactions', customerId ?? 'all', limit],
    queryFn: async (): Promise<InteractionView[]> => {
      if (isSample) return (await sample()).interactions(customerId);
      const { dc, sdk } = await live();
      if (customerId) {
        const { data } = await sdk.listInteractions(dc, { customerId, limit });
        return data.interactions.map((row) => interactionView(row as InteractionRow));
      }
      const { data } = await sdk.listRecentInteractions(dc, { limit });
      return data.interactions.map((row) => interactionView(row as InteractionRow));
    },
  });
}

// ---------------------------------------------------------------- commands

export interface PriceListInput { code: string; name: string; currency: string; tier: CustomerTier | null; validFrom: string | null; validTo: string | null; isDefault: boolean; notes: string; lines: { skuCode?: string; productCode?: string; minQuantity: string; unitPrice: string }[] }
export interface OpportunityInput { id?: string; customerId: string; title: string; stage: OpportunityStage; source: OpportunitySource | null; value: string | null; currency: string; expectedClose: string | null; quoteNumber: string | null; lostReason: string; notes: string }
export interface InteractionInput { customerId: string; contactId?: string; opportunityId?: string; kind: InteractionKind; occurredAt?: string; summary: string; nextStep: string; nextOn: string | null; taskForNextStep: boolean }

function command<TInput, TResult>(name: keyof typeof FUNCTION_NAMES, sampleCall: (input: TInput) => Promise<TResult>) {
  return () => {
    const client = useQueryClient();
    return useMutation({
      mutationFn: async (input: TInput): Promise<TResult> => {
        if (isSample) return sampleCall(input);
        return callFunction<TInput, TResult>(FUNCTION_NAMES[name], input);
      },
      onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['relationships'] }), client.invalidateQueries({ queryKey: ['timeline'] }), client.invalidateQueries({ queryKey: ['operations'] })]),
    });
  };
}

export const useSavePriceList = command<PriceListInput, { code: string }>('savePriceList', async (input) => (await sample()).savePriceList(input));
export const useSaveOpportunity = command<OpportunityInput, { id: string }>('saveOpportunity', async (input) => (await sample()).saveOpportunity(input));
export const useLogInteraction = command<InteractionInput, { id: string; taskId: string | null }>('logInteraction', async (input) => (await sample()).logInteraction(input));
