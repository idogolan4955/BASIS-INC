import { describe, expect, it } from 'vitest';
import {
  audienceFloorForParty,
  audiencesFor,
  awaitingReply,
  combineAudiences,
  containerCheckDigit,
  detectNoise,
  extractContainerNumbers,
  extractReferences,
  firstMatchingRule,
  isAtLeastAsRestrictive,
  matchKnownReferences,
  resolveSender,
  sortByFacts,
  trimQuoted,
  workingHoursBetween,
  type MailRuleView,
  type SortInput,
} from './mail';

const base: SortInput = { fromAddress: 'someone@example.com', subject: 'Hello', headers: {}, senderCompanyRoles: [], senderKnown: false, references: [], thread: null, rule: null };

describe('audiences', () => {
  it('reads by role', () => {
    expect(audiencesFor('owner')).toEqual(['general', 'commercial', 'supply', 'logistics', 'owner']);
    expect(audiencesFor('sales')).toEqual(['general', 'commercial']);
    expect(audiencesFor('qc')).toEqual(['general']);
    expect(audiencesFor('purchasing')).toEqual(['general', 'supply', 'logistics']);
    expect(audiencesFor('viewer')).toEqual([]);
  });

  it('combines without ever widening', () => {
    expect(combineAudiences('general', 'supply')).toBe('supply');
    expect(combineAudiences('logistics', 'supply')).toBe('supply');
    expect(combineAudiences('commercial', 'supply')).toBe('owner');
    expect(combineAudiences('commercial', null, undefined)).toBe('commercial');
    expect(combineAudiences()).toBe('general');
    for (const a of ['general', 'commercial', 'supply', 'logistics', 'owner'] as const) {
      for (const b of ['general', 'commercial', 'supply', 'logistics', 'owner'] as const) {
        const combined = combineAudiences(a, b);
        expect(isAtLeastAsRestrictive(combined, a)).toBe(true);
        expect(isAtLeastAsRestrictive(combined, b)).toBe(true);
      }
    }
  });

  it('takes the floor from the sender company', () => {
    expect(audienceFloorForParty(['supplier'])).toBe('supply');
    expect(audienceFloorForParty(['freight_forwarder'])).toBe('logistics');
    expect(audienceFloorForParty(['customer'])).toBe('commercial');
    expect(audienceFloorForParty(['customer', 'supplier'])).toBe('owner');
    expect(audienceFloorForParty(['inspection_agency'])).toBeNull();
  });
});

describe('references', () => {
  it('finds platform numbers in any spelling, once', () => {
    expect(extractReferences('Re: PO-26-0003 and po 26-0003, see SHP-26-0004; not XPO-26-0001 or PO-26-00031')).toEqual([
      { entityType: 'purchase_order', entityId: 'PO-26-0003' },
      { entityType: 'shipment', entityId: 'SHP-26-0004' },
    ]);
    expect(extractReferences('DEV-26-0012 samples')).toEqual([{ entityType: 'development_product', entityId: 'DEV-26-0012' }]);
  });

  it('checks container numbers by their digit', () => {
    expect(containerCheckDigit('CSQU305438')).toBe(3);
    expect(extractContainerNumbers('Container CSQU 305438 3 loaded; CSQU3054384 is a typo')).toEqual(['CSQU3054383']);
  });

  it('matches recorded references as whole tokens', () => {
    const known = [{ value: 'MEDU1234567', shipment: 'SHP-26-0004' }, { value: '160-1234 5675', shipment: 'SHP-26-0005' }, { value: 'AB12', shipment: 'SHP-26-0006' }];
    expect(matchKnownReferences('BL no. medu1234567 attached. AWB 160-1234 5675. ref AB12', known).map((entry) => entry.shipment)).toEqual(['SHP-26-0004', 'SHP-26-0005']);
    expect(matchKnownReferences('XMEDU12345678', known)).toEqual([]);
  });
});

describe('senders', () => {
  const known = [
    { contactId: 'c1', companyId: 'mill', email: 'Li.Wei@shaoxing-mill.cn' },
    { contactId: 'c2', companyId: 'mill', email: 'sales@shaoxing-mill.cn' },
    { contactId: 'c3', companyId: 'atelier', email: 'noa@gmail.com' },
    { contactId: 'c4', companyId: 'a', email: 'x@shared.com' },
    { contactId: 'c5', companyId: 'b', email: 'y@shared.com' },
  ];
  it('resolves by address, then by a company domain', () => {
    expect(resolveSender('li.wei@SHAOXING-mill.cn', known)).toEqual({ contactId: 'c1', companyId: 'mill', basis: 'address' });
    expect(resolveSender('qc@shaoxing-mill.cn', known)).toEqual({ contactId: null, companyId: 'mill', basis: 'domain' });
    expect(resolveSender('noa@gmail.com', known).companyId).toBe('atelier');
    expect(resolveSender('other@gmail.com', known).companyId).toBeNull();
    expect(resolveSender('z@shared.com', known).companyId).toBeNull();
  });
});

describe('noise', () => {
  it('reads newsletters and automatic mail from headers', () => {
    expect(detectNoise({ 'List-Unsubscribe': '<mailto:x>' }, 'news@brand.com')).toBe('newsletter');
    expect(detectNoise({ 'Auto-Submitted': 'auto-replied' }, 'li@mill.cn')).toBe('notification');
    expect(detectNoise({ 'Auto-Submitted': 'no' }, 'li@mill.cn')).toBeNull();
    expect(detectNoise({}, 'no-reply@accounts.google.com')).toBe('notification');
    expect(detectNoise({}, 'li@mill.cn')).toBeNull();
  });
});

describe('rules', () => {
  const rule = (id: string, sort: number, match: MailRuleView['match'], extra: Partial<MailRuleView> = {}): MailRuleView => ({ id, match, category: null, audience: null, ownerRole: null, skipModel: false, ignore: false, sort, ...extra });
  it('takes the first match in order, and never matches an empty rule', () => {
    const rules = [rule('b', 2, { fromDomain: 'bank.co.il' }), rule('a', 1, { fromDomain: '@co.il', subjectContains: 'statement' }), rule('empty', 0, {})];
    expect(firstMatchingRule(rules, { fromAddress: 'info@mail.bank.co.il', subject: 'Monthly STATEMENT', headers: {} })?.id).toBe('a');
    expect(firstMatchingRule(rules, { fromAddress: 'info@bank.co.il', subject: 'Hi', headers: {} })?.id).toBe('b');
    expect(firstMatchingRule(rules, { fromAddress: 'info@other.com', subject: 'Hi', headers: {} })).toBeNull();
  });
});

describe('sorting by facts', () => {
  it('keeps unknown mail with the owner, unsorted', () => {
    expect(sortByFacts(base)).toMatchObject({ category: 'other', audience: 'owner', state: 'needs_review', basis: 'none' });
  });

  it('sorts a supplier by the company, and its floor holds', () => {
    expect(sortByFacts({ ...base, senderCompanyRoles: ['supplier'], senderKnown: true })).toMatchObject({ category: 'supplier_correspondence', audience: 'supply', ownerRole: 'purchasing', state: 'sorted', basis: 'sender' });
    // A supplier's newsletter is still supplier mail as far as who reads it.
    expect(sortByFacts({ ...base, headers: { 'List-Id': 'news' }, senderCompanyRoles: ['supplier'], senderKnown: true })).toMatchObject({ category: 'newsletter', audience: 'supply', state: 'ignored' });
  });

  it('sorts an unknown sender by the records it names', () => {
    expect(sortByFacts({ ...base, references: [{ entityType: 'shipment' }] })).toMatchObject({ category: 'logistics', audience: 'logistics', basis: 'reference' });
  });

  it('lets a reply inherit its thread, and the owner rule win', () => {
    expect(sortByFacts({ ...base, thread: { category: 'customer_correspondence', audience: 'commercial' } })).toMatchObject({ category: 'customer_correspondence', audience: 'commercial', basis: 'thread' });
    const rule: MailRuleView = { id: 'r', match: { fromDomain: 'bank.co.il' }, category: 'finance_admin', audience: null, ownerRole: null, skipModel: true, ignore: false, sort: 0 };
    expect(sortByFacts({ ...base, rule, senderCompanyRoles: ['customer'] })).toMatchObject({ category: 'finance_admin', audience: 'owner', ownerRole: 'owner', skipModel: true, basis: 'rule' });
  });

  it('never lets a rule widen the audience', () => {
    const rule: MailRuleView = { id: 'r', match: { fromDomain: 'mill.cn' }, category: 'marketing', audience: 'general', ownerRole: null, skipModel: false, ignore: false, sort: 0 };
    expect(sortByFacts({ ...base, rule, senderCompanyRoles: ['supplier'] }).audience).toBe('supply');
  });
});

describe('replies', () => {
  it('counts working hours only', () => {
    // Friday 12:00 to Monday 12:00 UTC: Friday's 12 hours and Monday's 12.
    expect(workingHoursBetween(new Date('2026-11-06T12:00:00Z'), new Date('2026-11-09T12:00:00Z'))).toBe(24);
  });

  it('waits a working day after the last inbound message', () => {
    expect(awaitingReply({ lastInboundAt: '2026-11-06T12:00:00Z', lastOutboundAt: null }, new Date('2026-11-09T11:00:00Z'))).toBe(false);
    expect(awaitingReply({ lastInboundAt: '2026-11-06T12:00:00Z', lastOutboundAt: null }, new Date('2026-11-09T12:00:00Z'))).toBe(true);
    expect(awaitingReply({ lastInboundAt: '2026-11-06T12:00:00Z', lastOutboundAt: '2026-11-06T13:00:00Z' }, new Date('2026-11-12T12:00:00Z'))).toBe(false);
  });
});

describe('bodies', () => {
  it('trims quoted history in several languages', () => {
    expect(trimQuoted('Thanks, confirmed.\n\nOn Mon, 2 Nov 2026 at 10:00, Ido <ido@basis.com> wrote:\n> old')).toBe('Thanks, confirmed.');
    expect(trimQuoted('好的\n\n发件人: Ido\n发送时间: ...')).toBe('好的');
    expect(trimQuoted('Fine\n> quoted\n> more')).toBe('Fine');
    expect(trimQuoted('> only quoted')).toBe('> only quoted');
  });
});
