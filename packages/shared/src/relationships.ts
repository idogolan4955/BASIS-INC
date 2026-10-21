// The relationship side of selling: price lists a quote starts from, the
// opportunities a customer is in and where each stands, and the interactions
// that move them. Money is fixed-point ten-thousandths; quantities
// fixed-point metres.

import type { CustomerTier } from './commercial';
import type { LocalDate } from './local-date';
import { daysBetween } from './local-date';
import type { StatusTone } from './status';

// ---------------------------------------------------------------- price lists

export interface PriceListLineView {
  readonly id: string;
  /** One of the two is set: a SKU's own price, or a product-wide price. */
  readonly skuCode: string | null;
  readonly productCode: string | null;
  /** Fixed-point metres from which this price applies. */
  readonly minQuantity: string;
  /** Fixed-point money per metre. */
  readonly unitPrice: string;
}

export interface PriceListView {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
  /** A list for one tier, or for every customer when null. */
  readonly tier: CustomerTier | null;
  readonly validFrom: LocalDate | null;
  readonly validTo: LocalDate | null;
  readonly isDefault: boolean;
  readonly lines: readonly PriceListLineView[];
  readonly updatedAt: string;
}

export interface PriceLookup {
  readonly skuCode: string;
  readonly productCode: string;
  readonly tier: CustomerTier | null;
  readonly currency: string;
  /** Fixed-point metres. */
  readonly quantity: string;
  readonly on: LocalDate;
}

export interface PriceMatch {
  readonly unitPrice: string;
  readonly listId: string;
  readonly listName: string;
  readonly by: 'sku' | 'product';
}

/** Whether a list applies to a customer tier and currency on a day. */
export function listApplies(list: Pick<PriceListView, 'currency' | 'tier' | 'validFrom' | 'validTo'>, tier: CustomerTier | null, currency: string, on: LocalDate): boolean {
  if (list.currency !== currency) return false;
  if (list.tier !== null && list.tier !== tier) return false;
  if (list.validFrom !== null && on < list.validFrom) return false;
  if (list.validTo !== null && on > list.validTo) return false;
  return true;
}

/**
 * The price a quote line starts from: the customer's tier list before the
 * general one, a SKU line before a product line, the highest quantity break
 * the quantity reaches. Nothing found means the person types the price.
 */
export function priceFor(lists: readonly PriceListView[], lookup: PriceLookup): PriceMatch | null {
  const applicable = lists.filter((list) => listApplies(list, lookup.tier, lookup.currency, lookup.on)).sort((a, b) => Number(b.tier !== null) - Number(a.tier !== null) || Number(b.isDefault) - Number(a.isDefault) || b.updatedAt.localeCompare(a.updatedAt));
  const quantity = BigInt(lookup.quantity);
  for (const list of applicable) {
    for (const by of ['sku', 'product'] as const) {
      const candidates = list.lines
        .filter((line) => (by === 'sku' ? line.skuCode === lookup.skuCode : line.skuCode === null && line.productCode === lookup.productCode))
        .filter((line) => BigInt(line.minQuantity) <= quantity)
        .sort((a, b) => (BigInt(b.minQuantity) > BigInt(a.minQuantity) ? 1 : BigInt(b.minQuantity) < BigInt(a.minQuantity) ? -1 : 0));
      const best = candidates[0];
      if (best) return { unitPrice: best.unitPrice, listId: list.id, listName: list.name, by };
    }
  }
  return null;
}

// ---------------------------------------------------------------- opportunities

export const OPPORTUNITY_STAGES = ['lead', 'qualified', 'sampling', 'quoting', 'negotiating', 'won', 'lost'] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];
export const OPEN_STAGES: readonly OpportunityStage[] = ['lead', 'qualified', 'sampling', 'quoting', 'negotiating'];
export const OPPORTUNITY_STAGE_LABEL: Record<OpportunityStage, string> = { lead: 'Lead', qualified: 'Qualified', sampling: 'Sampling', quoting: 'Quoting', negotiating: 'Negotiating', won: 'Won', lost: 'Lost' };
export const OPPORTUNITY_STAGE_TONE: Record<OpportunityStage, StatusTone> = { lead: 'neutral', qualified: 'neutral', sampling: 'transit', quoting: 'transit', negotiating: 'caution', won: 'positive', lost: 'critical' };

export const OPPORTUNITY_SOURCES = ['website', 'referral', 'fair', 'outreach', 'existing', 'other'] as const;
export type OpportunitySource = (typeof OPPORTUNITY_SOURCES)[number];
export const OPPORTUNITY_SOURCE_LABEL: Record<OpportunitySource, string> = { website: 'Website', referral: 'Referral', fair: 'Trade fair', outreach: 'Outreach', existing: 'Existing customer', other: 'Other' };

/** Days without an interaction after which an open opportunity has gone quiet. */
export const QUIET_AFTER_DAYS = 14;

export interface OpportunityFacts {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly title: string;
  readonly stage: OpportunityStage;
  readonly source: OpportunitySource | null;
  /** Fixed-point money, the order this would become. */
  readonly value: string | null;
  readonly currency: string;
  readonly expectedClose: LocalDate | null;
  readonly ownerUid: string;
  readonly ownerName: string;
  readonly quoteNumber: string | null;
  readonly orderNumber: string | null;
  readonly lostReason: string;
  readonly notes: string;
  /** The last interaction logged against it, or its creation. */
  readonly lastActivityAt: string;
  readonly createdAt: string;
  readonly closedAt: string | null;
}

export type OpportunityHealth = 'active' | 'quiet' | 'overdue' | 'closed';
export const OPPORTUNITY_HEALTH_LABEL: Record<OpportunityHealth, string> = { active: 'Active', quiet: 'Quiet', overdue: 'Past expected close', closed: 'Closed' };
export const OPPORTUNITY_HEALTH_TONE: Record<OpportunityHealth, StatusTone> = { active: 'positive', quiet: 'caution', overdue: 'critical', closed: 'neutral' };

export interface OpportunityView extends OpportunityFacts {
  readonly health: OpportunityHealth;
  readonly daysSinceActivity: number;
}

/** Health is read from the dates: closed stages are closed; an expected close in the past is overdue; silence is quiet. */
export function opportunityHealth(facts: Pick<OpportunityFacts, 'stage' | 'expectedClose' | 'lastActivityAt'>, today: LocalDate): { health: OpportunityHealth; daysSinceActivity: number } {
  const since = daysBetween(facts.lastActivityAt.slice(0, 10) as LocalDate, today);
  if (facts.stage === 'won' || facts.stage === 'lost') return { health: 'closed', daysSinceActivity: since };
  if (facts.expectedClose !== null && facts.expectedClose < today) return { health: 'overdue', daysSinceActivity: since };
  if (since > QUIET_AFTER_DAYS) return { health: 'quiet', daysSinceActivity: since };
  return { health: 'active', daysSinceActivity: since };
}

export function opportunityView(facts: OpportunityFacts, today: LocalDate): OpportunityView {
  return { ...facts, ...opportunityHealth(facts, today) };
}

/** The stage a quote's state implies, when it is further along than the opportunity. */
export function stageFromQuote(state: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired', current: OpportunityStage): OpportunityStage {
  const rank = (stage: OpportunityStage) => OPPORTUNITY_STAGES.indexOf(stage);
  const implied: OpportunityStage = state === 'accepted' ? 'won' : state === 'declined' ? 'lost' : state === 'sent' ? 'negotiating' : 'quoting';
  if (current === 'won' || current === 'lost') return current;
  if (implied === 'lost') return implied;
  return rank(implied) > rank(current) ? implied : current;
}

export interface StageSummary {
  readonly stage: OpportunityStage;
  readonly count: number;
  /** Fixed-point money, in `currency`; opportunities in other currencies are counted, not summed. */
  readonly value: string;
  readonly otherCurrencies: number;
}

/** What sits in each stage: count and value in the base currency. */
export function pipelineSummary(opportunities: readonly Pick<OpportunityFacts, 'stage' | 'value' | 'currency'>[], currency: string): StageSummary[] {
  return OPPORTUNITY_STAGES.map((stage) => {
    const own = opportunities.filter((opportunity) => opportunity.stage === stage);
    let value = 0n;
    let other = 0;
    for (const opportunity of own) {
      if (opportunity.value === null) continue;
      if (opportunity.currency === currency) value += BigInt(opportunity.value);
      else other += 1;
    }
    return { stage, count: own.length, value: value.toString(), otherCurrencies: other };
  });
}

/** Won over closed, in percent; null before anything closed. */
export function winRate(opportunities: readonly Pick<OpportunityFacts, 'stage'>[]): number | null {
  const won = opportunities.filter((opportunity) => opportunity.stage === 'won').length;
  const lost = opportunities.filter((opportunity) => opportunity.stage === 'lost').length;
  return won + lost === 0 ? null : Math.round((won * 100) / (won + lost));
}

// ---------------------------------------------------------------- interactions

export const INTERACTION_KINDS = ['call', 'email', 'meeting', 'visit', 'sample', 'note'] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];
export const INTERACTION_KIND_LABEL: Record<InteractionKind, string> = { call: 'Call', email: 'Email', meeting: 'Meeting', visit: 'Visit', sample: 'Sample sent', note: 'Note' };

export interface InteractionView {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly contactName: string;
  readonly opportunityId: string | null;
  readonly opportunityTitle: string;
  readonly kind: InteractionKind;
  readonly occurredAt: string;
  readonly summary: string;
  readonly nextStep: string;
  readonly nextOn: LocalDate | null;
  readonly byName: string;
}

/** Next steps that are due by a day, oldest first. */
export function nextStepsDue(interactions: readonly InteractionView[], today: LocalDate): InteractionView[] {
  return interactions.filter((interaction) => interaction.nextStep.trim() !== '' && interaction.nextOn !== null && interaction.nextOn <= today).sort((a, b) => a.nextOn!.localeCompare(b.nextOn!));
}
