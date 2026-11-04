import { describe, expect, it } from 'vitest';
import { budgetSpent, compareSourcing, costingMargin, developmentHealth, gateCheck, developmentLandedCost, nextStages, slugOf, stageCounts, type GateFacts } from './development';
import { localDate } from './local-date';

const facts = (over: Partial<GateFacts> = {}): GateFacts => ({ hasDescription: true, fileRoles: ['inspiration'], sourcingCount: 1, selectedSourcing: true, sampleRequested: true, latestSampleVerdict: 'approved', costingBases: ['quotation'], ...over });

describe('the gate', () => {
  it('opens only when the facts are there', () => {
    expect(gateCheck('concept', facts())).toEqual([]);
    expect(gateCheck('concept', facts({ fileRoles: [], hasDescription: false }))).toHaveLength(2);
    expect(gateCheck('feasibility', facts({ sourcingCount: 0 }))).toEqual(['At least one sourcing candidate.']);
    expect(gateCheck('sampling', facts({ selectedSourcing: false, sampleRequested: false }))).toHaveLength(1);
    expect(gateCheck('sampling', facts({ selectedSourcing: false, sampleRequested: true }))).toEqual([]);
    expect(gateCheck('approved_for_production', facts({ latestSampleVerdict: 'revise', costingBases: ['estimate'] }))).toHaveLength(2);
    expect(gateCheck('approved_for_production', facts())).toEqual([]);
    expect(gateCheck('commercial', facts())).toHaveLength(1);
  });
  it('knows where a stage may go', () => {
    expect(nextStages('idea')).toContain('concept');
    expect(nextStages('sampling')).toContain('revision');
    expect(nextStages('revision')).toContain('approved_for_production');
    expect(nextStages('commercial')).toEqual([]);
    expect(nextStages('on_hold')).toContain('sampling');
  });
});

describe('health', () => {
  const today = localDate('2026-11-04');
  it('reads late, awaiting verdict, quiet and closed from the dates', () => {
    expect(developmentHealth({ stage: 'sampling', targetLaunch: localDate('2027-03-01'), lastActivityAt: '2026-11-01T00:00:00Z', latestSample: { verdict: 'pending', receivedOn: localDate('2026-11-01') } }, today)).toBe('on_track');
    expect(developmentHealth({ stage: 'sampling', targetLaunch: null, lastActivityAt: '2026-11-01T00:00:00Z', latestSample: { verdict: 'pending', receivedOn: localDate('2026-10-20') } }, today)).toBe('awaiting_verdict');
    expect(developmentHealth({ stage: 'concept', targetLaunch: null, lastActivityAt: '2026-10-01T00:00:00Z', latestSample: null }, today)).toBe('quiet');
    expect(developmentHealth({ stage: 'concept', targetLaunch: localDate('2026-10-30'), lastActivityAt: '2026-11-03T00:00:00Z', latestSample: null }, today)).toBe('late');
    expect(developmentHealth({ stage: 'commercial', targetLaunch: localDate('2026-01-01'), lastActivityAt: '2026-01-01T00:00:00Z', latestSample: null }, today)).toBe('closed');
  });
});

describe('money', () => {
  const costing = { unitCost: '120000', packagingCost: '15000', freightCost: '8000', dutyCost: '12000', otherCost: '0', plannedPrice: '390000' };
  it('sums the landed cost and reads the margin', () => {
    expect(developmentLandedCost(costing)).toBe('155000');
    expect(costingMargin(costing)).toEqual({ margin: '235000', marginBasisPoints: 6025 });
    expect(costingMargin({ ...costing, plannedPrice: null })).toBeNull();
  });
  it('adds up what development has cost, counting other currencies', () => {
    const spent = budgetSpent(
      [{ costAmount: '1200000', costCurrency: 'USD' }, { costAmount: '900000', costCurrency: 'EUR' }, { costAmount: null, costCurrency: 'USD' }],
      [{ developmentCost: '5000000', toolingCost: '2500000', currency: 'USD', isSelected: true }, { developmentCost: '9000000', toolingCost: null, currency: 'USD', isSelected: false }],
      'USD',
    );
    expect(spent).toEqual({ spent: '8700000', otherCurrencies: 1 });
  });
  it('ranks candidates by unit cost in the base currency', () => {
    const rows = compareSourcing(
      [
        { id: 'a', unitCost: '100000', currency: 'USD', status: 'quoted' as const, isSelected: false },
        { id: 'b', unitCost: '80000', currency: 'EUR', status: 'quoted' as const, isSelected: true },
        { id: 'c', unitCost: null, currency: 'USD', status: 'candidate' as const, isSelected: false },
        { id: 'd', unitCost: '50000', currency: 'USD', status: 'dropped' as const, isSelected: false },
      ],
      (amount, currency) => (currency === 'EUR' ? (BigInt(amount) * 11n / 10n).toString() : amount),
    );
    expect(rows.map((row) => `${row.id}:${row.rank ?? '-'}`)).toEqual(['b:1', 'a:2', 'c:-', 'd:-']);
  });
  it('counts the open stages and makes slugs', () => {
    expect(stageCounts([{ stage: 'idea' }, { stage: 'idea' }, { stage: 'sampling' }, { stage: 'dropped' }]).filter((entry) => entry.count > 0)).toEqual([{ stage: 'idea', count: 2 }, { stage: 'sampling', count: 1 }]);
    expect(slugOf('  Silk Robe — Night ')).toBe('silk-robe-night');
  });
});
