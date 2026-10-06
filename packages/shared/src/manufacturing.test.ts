import { describe, expect, it } from 'vitest';
import { localDate } from './local-date';
import { planMilestones, propagateForecasts, runForecastEnd, runHealth, runProgress, runStateFrom, type ChainMilestone, type MilestoneFacts, type TemplateStep } from './manufacturing';

const steps: TemplateStep[] = [
  { key: 'yarn', name: 'Yarn', category: 'materials', sequence: 1, durationDays: 7, dependsOnKey: null, gate: 'none' },
  { key: 'knit', name: 'Knitting', category: 'production', sequence: 2, durationDays: 10, dependsOnKey: 'yarn', gate: 'none' },
  { key: 'dye', name: 'Dyeing', category: 'production', sequence: 3, durationDays: 7, dependsOnKey: 'knit', gate: 'approval' },
  { key: 'inspect', name: 'Inspection', category: 'quality', sequence: 4, durationDays: 2, dependsOnKey: null, gate: 'inspection' },
];

const today = localDate('2026-10-06');
const m = (overrides: Omit<Partial<MilestoneFacts>, 'plannedEnd'> & { key: string; plannedEnd: string }): MilestoneFacts => ({
  state: 'pending',
  forecastEnd: null,
  actualEnd: null,
  ...overrides,
  plannedEnd: localDate(overrides.plannedEnd),
});

describe('planning', () => {
  it('chains steps by dependency and by order', () => {
    const planned = planMilestones(steps, localDate('2026-10-01'));
    expect(planned.map((step) => [step.key, step.plannedStart, step.plannedEnd])).toEqual([
      ['yarn', '2026-10-01', '2026-10-08'],
      ['knit', '2026-10-08', '2026-10-18'],
      ['dye', '2026-10-18', '2026-10-25'],
      ['inspect', '2026-10-25', '2026-10-27'],
    ]);
  });
});

describe('health', () => {
  it('is on track when nothing has slipped or come due', () => {
    expect(runHealth([m({ key: 'a', plannedEnd: '2026-10-20' }), m({ key: 'b', plannedEnd: '2026-10-30' })], today)).toBe('on_track');
  });

  it('is at risk when a step slipped a little or is due without starting', () => {
    expect(runHealth([m({ key: 'a', plannedEnd: '2026-10-20', forecastEnd: localDate('2026-10-22') })], today)).toBe('at_risk');
    expect(runHealth([m({ key: 'a', plannedEnd: '2026-10-07' })], today)).toBe('at_risk');
  });

  it('is delayed when a step is past its expected end or slipped more than two days', () => {
    expect(runHealth([m({ key: 'a', plannedEnd: '2026-10-05' })], today)).toBe('delayed');
    expect(runHealth([m({ key: 'a', plannedEnd: '2026-10-20', forecastEnd: localDate('2026-10-25') })], today)).toBe('delayed');
  });

  it('ignores finished steps and reports blocked first', () => {
    expect(runHealth([m({ key: 'a', plannedEnd: '2026-09-01', state: 'done', actualEnd: localDate('2026-09-20') })], today)).toBe('on_track');
    expect(runHealth([m({ key: 'a', plannedEnd: '2026-09-01' }), m({ key: 'b', plannedEnd: '2026-10-20', state: 'blocked' })], today)).toBe('blocked');
  });
});

describe('derived run facts', () => {
  const milestones = [
    m({ key: 'a', plannedEnd: '2026-10-02', state: 'done', actualEnd: localDate('2026-10-03') }),
    m({ key: 'b', plannedEnd: '2026-10-10', state: 'in_progress', forecastEnd: localDate('2026-10-12') }),
    m({ key: 'c', plannedEnd: '2026-10-15' }),
  ];

  it('forecasts the end from the latest expected step', () => {
    expect(runForecastEnd(milestones)).toBe('2026-10-15');
    expect(runForecastEnd([milestones[1]!])).toBe('2026-10-12');
  });

  it('follows the steps into active and completed', () => {
    expect(runStateFrom(milestones, 'planned')).toBe('active');
    expect(runStateFrom(milestones.map((x) => ({ ...x, state: 'done' as const })), 'active')).toBe('completed');
    expect(runStateFrom(milestones.map((x) => ({ ...x, state: 'pending' as const })), 'planned')).toBe('planned');
    expect(runStateFrom(milestones, 'cancelled')).toBe('cancelled');
  });

  it('measures progress without counting skipped steps', () => {
    expect(runProgress(milestones)).toBeCloseTo(1 / 3);
    expect(runProgress([...milestones, m({ key: 'd', plannedEnd: '2026-10-20', state: 'skipped' })])).toBeCloseTo(1 / 3);
  });
});

describe('forecast propagation', () => {
  const chain = (overrides: Partial<ChainMilestone>[]): ChainMilestone[] =>
    planMilestones(steps, localDate('2026-10-01')).map((step, index) => ({
      key: step.key,
      sequence: step.sequence,
      dependsOnKey: step.dependsOnKey,
      plannedStart: step.plannedStart,
      plannedEnd: step.plannedEnd,
      state: 'pending',
      forecastEnd: null,
      actualEnd: null,
      ...overrides[index],
    }));

  it('leaves the plan alone when nothing slipped', () => {
    const result = propagateForecasts(chain([]));
    expect([...result.values()]).toEqual([null, null, null, null]);
  });

  it('pushes dependents when a step slips', () => {
    const result = propagateForecasts(chain([{ state: 'done', actualEnd: localDate('2026-10-08') }, { state: 'in_progress', forecastEnd: localDate('2026-10-23') }]));
    expect(result.get('knit')).toBe('2026-10-23');
    expect(result.get('dye')).toBe('2026-10-30');
    expect(result.get('inspect')).toBe('2026-11-01');
  });

  it('clears a stale forecast on a pending step once upstream recovers', () => {
    const result = propagateForecasts(chain([{ state: 'done', actualEnd: localDate('2026-10-08') }, { forecastEnd: localDate('2026-10-25') }]));
    expect(result.get('knit')).toBeNull();
  });

  it('keeps the forecast on the step being worked', () => {
    const result = propagateForecasts(chain([{ state: 'in_progress', forecastEnd: localDate('2026-10-12') }]));
    expect(result.get('yarn')).toBe('2026-10-12');
  });
});
