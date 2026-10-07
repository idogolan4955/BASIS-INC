import { FUNCTION_NAMES, fulfilmentOf, isLocalDate, lineTotal, orderTotal, type CustomerProfileView, type CustomerTier, type CustomerType, type LocalDate, type QuoteDetail, type QuoteState, type QuoteSummary, type SalesOrderDetail, type SalesOrderState, type SalesOrderSummary, type StockForAllocation } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// Commercial data: quotes, sales orders with their allocations and invoices,
// customer terms, and the stock a line can draw on. Fulfilment is derived
// from allocations and shipments here as in the functions.

const asDate = (value: string | null | undefined): LocalDate | null => (value && isLocalDate(value) ? value : null);

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}
const sample = async () => (await import('./sample-commercial')).sampleCommercial;

type QuoteRow = { id: string; number: string; state: QuoteState; currency: string; validUntil?: string | null; createdAt: string; customer: { id: string; legalName: string; tradingName?: string | null }; quoteLines_on_quote: { quantity: string; unitPrice: string; sku: { product: { name: string } } }[]; salesOrders_on_quote: { number: string }[] };
const quoteSummary = (row: QuoteRow): QuoteSummary => ({ id: row.id, number: row.number, state: row.state, customerId: row.customer.id, customerName: row.customer.tradingName || row.customer.legalName, currency: row.currency, validUntil: asDate(row.validUntil), total: orderTotal(row.quoteLines_on_quote), lineCount: row.quoteLines_on_quote.length, products: [...new Set(row.quoteLines_on_quote.map((line) => line.sku.product.name))], orderNumber: row.salesOrders_on_quote[0]?.number ?? null, createdAt: row.createdAt });

type OrderRow = { id: string; number: string; state: SalesOrderState; currency: string; requestedDelivery?: string | null; confirmedOn?: string | null; createdAt: string; customer: { id: string; legalName: string; tradingName?: string | null }; salesOrderLines_on_order: { id: string; quantity: string; unitPrice: string; sku: { product: { name: string } }; allocations_on_orderLine: { quantity: string; shippedOn?: string | null; shipment?: { number: string } | null }[] }[] };
export function orderSummary(row: OrderRow): SalesOrderSummary {
  const lines = row.salesOrderLines_on_order.map((line) => ({ quantity: line.quantity, allocated: line.allocations_on_orderLine.filter((allocation) => !allocation.shippedOn).reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n).toString(), shipped: line.allocations_on_orderLine.filter((allocation) => allocation.shippedOn).reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n).toString() }));
  const fulfilment = fulfilmentOf(lines, row.state === 'closed');
  return { id: row.id, number: row.number, state: row.state, stage: fulfilment.stage, progress: fulfilment.progress, customerId: row.customer.id, customerName: row.customer.tradingName || row.customer.legalName, currency: row.currency, requestedDelivery: asDate(row.requestedDelivery), total: orderTotal(row.salesOrderLines_on_order), metres: row.salesOrderLines_on_order.reduce((sum, line) => sum + BigInt(line.quantity), 0n).toString(), lineCount: row.salesOrderLines_on_order.length, products: [...new Set(row.salesOrderLines_on_order.map((line) => line.sku.product.name))], shipmentNumbers: [...new Set(row.salesOrderLines_on_order.flatMap((line) => line.allocations_on_orderLine.map((allocation) => allocation.shipment?.number ?? '')))].filter(Boolean), confirmedOn: asDate(row.confirmedOn), createdAt: row.createdAt };
}

export function useQuotes() {
  return useQuery({
    queryKey: ['commercial', 'quotes'],
    queryFn: async (): Promise<QuoteSummary[]> => {
      if (isSample) return (await sample()).quotes();
      const { dc, sdk } = await live();
      const { data } = await sdk.listQuotes(dc);
      return data.quotes.map((row) => quoteSummary(row as QuoteRow));
    },
  });
}

export function useQuote(number: string) {
  return useQuery({
    queryKey: ['commercial', 'quote', number],
    queryFn: async (): Promise<QuoteDetail | null> => {
      if (isSample) return (await sample()).quote(number);
      const { dc, sdk } = await live();
      const { data } = await sdk.getQuote(dc, { number });
      const row = data.quotes[0];
      if (!row) return null;
      return {
        ...quoteSummary({ ...row, quoteLines_on_quote: row.quoteLines_on_quote } as unknown as QuoteRow),
        contactName: row.contact?.name ?? '',
        incoterm: row.incoterm?.code ?? '',
        namedPlace: row.namedPlace ?? '',
        paymentTerms: row.paymentTerms ?? '',
        notes: row.notes ?? '',
        sentOn: asDate(row.sentOn),
        lines: row.quoteLines_on_quote.map((line) => ({ id: line.id, lineNo: line.lineNo, skuCode: line.sku.code, productName: line.sku.product.name, shadeCode: line.sku.shade.code, shadeName: line.sku.shade.name, shadeHex: line.sku.shade.hex ?? '#CCCCCC', quantity: line.quantity, unitPrice: line.unitPrice, leadTimeDays: line.leadTimeDays ?? null, note: line.note ?? '' })),
      };
    },
  });
}

export function useSalesOrders() {
  return useQuery({
    queryKey: ['commercial', 'orders'],
    queryFn: async (): Promise<SalesOrderSummary[]> => {
      if (isSample) return (await sample()).orders();
      const { dc, sdk } = await live();
      const { data } = await sdk.listSalesOrders(dc);
      return data.salesOrders.map((row) => orderSummary(row as OrderRow));
    },
  });
}

export function useSalesOrder(number: string) {
  return useQuery({
    queryKey: ['commercial', 'order', number],
    queryFn: async (): Promise<SalesOrderDetail | null> => {
      if (isSample) return (await sample()).order(number);
      const { dc, sdk } = await live();
      const { data } = await sdk.getSalesOrder(dc, { number });
      const row = data.salesOrders[0];
      if (!row) return null;
      return {
        ...orderSummary(row as unknown as OrderRow),
        quoteNumber: row.quote?.number ?? null,
        contactName: row.contact?.name ?? '',
        incoterm: row.incoterm?.code ?? '',
        namedPlace: row.namedPlace ?? '',
        paymentTerms: row.paymentTerms ?? '',
        shipToName: row.shipToName ?? '',
        shipToAddress: row.shipToAddress ?? '',
        notes: row.notes ?? '',
        lines: row.salesOrderLines_on_order.map((line) => ({
          id: line.id,
          lineNo: line.lineNo,
          skuCode: line.sku.code,
          productName: line.sku.product.name,
          shadeCode: line.sku.shade.code,
          shadeName: line.sku.shade.name,
          shadeHex: line.sku.shade.hex ?? '#CCCCCC',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          allocated: line.allocations_on_orderLine.filter((allocation) => !allocation.shippedOn).reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n).toString(),
          shipped: line.allocations_on_orderLine.filter((allocation) => allocation.shippedOn).reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n).toString(),
          allocations: line.allocations_on_orderLine.map((allocation) => ({ id: allocation.id, lotNumber: allocation.lot.number, rollNumber: allocation.roll?.number ?? null, locationName: allocation.location.name, quantity: allocation.quantity, shipped: Boolean(allocation.shippedOn) })),
        })),
        invoices: row.invoiceRefs_on_order.map((invoice) => ({ id: invoice.id, number: invoice.number, amount: invoice.amount, currency: invoice.currency, issuedOn: asDate(invoice.issuedOn), dueOn: asDate(invoice.dueOn), paidOn: asDate(invoice.paidOn) })),
      };
    },
  });
}

export function useCustomerOrders(customerId: string) {
  return useQuery({
    queryKey: ['commercial', 'customer', customerId],
    queryFn: async (): Promise<{ orders: SalesOrderSummary[]; profile: CustomerProfileView | null }> => {
      if (isSample) return (await sample()).customer(customerId);
      const { dc, sdk } = await live();
      const { data } = await sdk.listSalesOrdersFor(dc, { customerId });
      const profile = data.customerProfiles[0];
      return {
        orders: data.salesOrders.map((row) => orderSummary({ ...row, customer: { id: customerId, legalName: '' } } as OrderRow)),
        profile: profile ? { type: (profile.type ?? null) as CustomerType | null, tier: profile.tier as CustomerTier, paymentTerms: profile.paymentTerms ?? '', currency: profile.currency ?? '', notes: profile.notes ?? '' } : null,
      };
    },
  });
}

/** What a line can draw on: warehouses only, less what other open orders hold. */
export function useStockForSku(skuCode: string, enabled: boolean) {
  return useQuery({
    queryKey: ['commercial', 'stock', skuCode],
    enabled,
    queryFn: async (): Promise<StockForAllocation[]> => {
      if (isSample) return (await sample()).stockFor(skuCode);
      const { dc, sdk } = await live();
      const { data } = await sdk.stockForSku(dc, { skuCode });
      const held = data.allocations;
      return data.stockBalances
        .filter((balance) => balance.location.kind === 'physical')
        .map((balance) => {
          const heldHere = held.filter((allocation) => allocation.lot.number === balance.lot.number && allocation.location.id === balance.location.id);
          const heldRolls = new Set(heldHere.map((allocation) => allocation.roll?.number));
          const available = BigInt(balance.onHand) - heldHere.reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n);
          return { lotNumber: balance.lot.number, locationId: balance.location.id, locationName: balance.location.name, available: available.toString(), receivedAt: balance.lot.createdAt, rolls: balance.lot.rolls_on_lot.filter((roll) => roll.stockLocation?.id === balance.location.id && !heldRolls.has(roll.number) && BigInt(roll.remainingLength ?? '0') > 0n).map((roll) => ({ number: roll.number, remaining: roll.remainingLength ?? '0' })) };
        })
        .filter((entry) => BigInt(entry.available) > 0n);
    },
  });
}

export { lineTotal };

// ---------------------------------------------------------------- commands

export interface ProfileInput { companyId: string; type?: CustomerType | null; tier: CustomerTier; paymentTerms?: string | null; currency?: string | null; notes?: string | null }
export interface QuoteInput { number?: string; customerId: string; contactId?: string; currency: string; incotermCode?: string; namedPlace?: string; paymentTerms?: string; validUntil?: string; notes?: string; lines: { skuCode: string; quantity: string; unitPrice: string; leadTimeDays?: number; note?: string }[] }
export interface QuoteTransition { number: string; to: 'sent' | 'accepted' | 'declined'; reason?: string; requestedDelivery?: string }
export interface OrderInput { customerId: string; contactId?: string; currency: string; incotermCode?: string; namedPlace?: string; paymentTerms?: string; requestedDelivery?: string; shipToName?: string; shipToAddress?: string; notes?: string; lines: { skuCode: string; quantity: string; unitPrice: string }[]; confirm?: boolean }
export interface OrderTransition { number: string; to: 'confirmed' | 'cancelled' | 'closed'; reason?: string }
export interface AllocateOrderInput { number: string; allocations?: { lineId: string; lotNumber: string; rollNumber?: string; locationId: string; quantity: string }[] }
export interface ShipInput { number: string; mode?: 'courier' | 'air' | 'sea' | 'road'; destinationId?: string; departure?: string; carrier?: string; tracking?: string; note?: string }
export interface InvoiceInput { number: string; invoiceNumber: string; amount: string; currency?: string; issuedOn?: string; dueOn?: string; paidOn?: string | null; paidAmount?: string | null; externalId?: string }

function invalidate(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([client.invalidateQueries({ queryKey: ['commercial'] }), client.invalidateQueries({ queryKey: ['inventory'] }), client.invalidateQueries({ queryKey: ['logistics'] }), client.invalidateQueries({ queryKey: ['parties'] }), client.invalidateQueries({ queryKey: ['gateway'] }), client.invalidateQueries({ queryKey: ['operations'] }), client.invalidateQueries({ queryKey: ['timeline'] })]);
}

function command<TInput, TResult>(name: keyof typeof FUNCTION_NAMES, sampleCall: (input: TInput) => Promise<TResult>) {
  return () => {
    const client = useQueryClient();
    return useMutation({
      mutationFn: async (input: TInput): Promise<TResult> => {
        if (isSample) return sampleCall(input);
        return callFunction<TInput, TResult>(FUNCTION_NAMES[name], input);
      },
      onSuccess: () => invalidate(client),
    });
  };
}

export const useUpsertCustomerProfile = command<ProfileInput, { companyId: string }>('upsertCustomerProfile', async (input) => (await sample()).upsertProfile(input));
export const useSaveQuote = command<QuoteInput, { number: string; total: string }>('saveQuote', async (input) => (await sample()).saveQuote(input));
export const useTransitionQuote = command<QuoteTransition, { number: string; state: string; orderNumber: string | null }>('transitionQuote', async (input) => (await sample()).transitionQuote(input));
export const useCreateSalesOrder = command<OrderInput, { number: string; total: string }>('createSalesOrder', async (input) => (await sample()).createOrder(input));
export const useTransitionSalesOrder = command<OrderTransition, { number: string; state: string }>('transitionSalesOrder', async (input) => (await sample()).transitionOrder(input));
export const useAllocateSalesOrder = command<AllocateOrderInput, { number: string; results: { lineId: string; skuCode: string; allocated: string; short: string }[] }>('allocateSalesOrder', async (input) => (await sample()).allocate(input));
export const useShipSalesOrder = command<ShipInput, { number: string; shipmentNumber: string; metres: string; complete: boolean }>('shipSalesOrder', async (input) => (await sample()).ship(input));
export const useRecordInvoice = command<InvoiceInput, { number: string; invoiceNumber: string }>('recordInvoice', async (input) => (await sample()).invoice(input));
