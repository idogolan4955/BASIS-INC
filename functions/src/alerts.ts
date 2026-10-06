import { onCall } from 'firebase-functions/v2/https';
import { REGION, callerOf, graphql, requireRole } from './lib';

// The attention engine. Each rule is a small pure decision over facts that
// yields findings; the engine turns findings into alerts, keeps open ones
// fresh and resolves those whose fact has gone away. The Gateway shows the
// result and never lets anyone type an alert in.

type Severity = 'info' | 'caution' | 'critical';
type Role = 'owner' | 'operations' | 'purchasing' | 'qc' | 'logistics' | 'sales' | 'marketing' | 'finance';

export interface Finding {
  readonly entityType: string;
  readonly entityId: string;
  readonly title: string;
  readonly detail: string;
  readonly severity: Severity;
  readonly ownerRole: Role;
  /** Stable for one fact; a change of fact changes the key. */
  readonly dedupeKey: string;
}

export interface Rule {
  readonly key: string;
  readonly evaluate: (now: Date) => Promise<Finding[]>;
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

interface ProductFacts {
  code: string;
  name: string;
  status: string;
  isPublic: boolean;
  skus_on_product: { code: string; status: string; isPublic: boolean }[];
  productVariants_on_product: { fullCode: string; name: string; status: string; widthCm: number | null; gsm: number | null }[];
}

async function productFacts(): Promise<ProductFacts[]> {
  const { products } = await graphql<{ products: ProductFacts[] }>(
    `query { products { code name status isPublic
       skus_on_product { code status isPublic }
       productVariants_on_product { fullCode name status widthCm gsm } } }`,
  );
  return products;
}

export const RULES: Rule[] = [
  {
    key: 'catalog.product_without_skus',
    async evaluate() {
      return (await productFacts())
        .filter((product) => product.status === 'active' && product.skus_on_product.length === 0)
        .map((product) => ({
          entityType: 'product',
          entityId: product.code,
          title: `${product.name} has no SKUs`,
          detail: 'An active product with nothing to sell. Add a variant and its SKUs.',
          severity: 'caution',
          ownerRole: 'purchasing',
          dedupeKey: `catalog.product_without_skus:${product.code}`,
        }));
    },
  },
  {
    key: 'catalog.published_without_active_sku',
    async evaluate() {
      return (await productFacts())
        .filter((product) => product.isPublic && !product.skus_on_product.some((sku) => sku.status === 'active'))
        .map((product) => ({
          entityType: 'product',
          entityId: product.code,
          title: `${product.name} is published with no active SKU`,
          detail: 'The website shows a product that cannot be ordered. Approve a SKU or unpublish the product.',
          severity: 'caution',
          ownerRole: 'marketing',
          dedupeKey: `catalog.published_without_active_sku:${product.code}`,
        }));
    },
  },
  {
    key: 'catalog.active_sku_unpublished',
    async evaluate() {
      return (await productFacts()).flatMap((product) =>
        product.skus_on_product
          .filter((sku) => sku.status === 'active' && !sku.isPublic)
          .map((sku) => ({
            entityType: 'sku',
            entityId: sku.code,
            title: `${sku.code} is active but not published`,
            detail: `${product.name}: the SKU can be ordered but does not appear on the website.`,
            severity: 'info' as Severity,
            ownerRole: 'marketing' as Role,
            dedupeKey: `catalog.active_sku_unpublished:${sku.code}`,
          })),
      );
    },
  },
  {
    key: 'catalog.variant_specification_incomplete',
    async evaluate() {
      return (await productFacts()).flatMap((product) =>
        product.productVariants_on_product
          .filter((variant) => variant.status === 'active' && (variant.widthCm === null || variant.gsm === null))
          .map((variant) => ({
            entityType: 'product',
            entityId: product.code,
            title: `${product.name} ${variant.name}: specification incomplete`,
            detail: `${[variant.widthCm === null ? 'width' : '', variant.gsm === null ? 'GSM' : ''].filter(Boolean).join(' and ')} not confirmed for ${variant.fullCode}.`,
            severity: 'info' as Severity,
            ownerRole: 'purchasing' as Role,
            dedupeKey: `catalog.variant_specification_incomplete:${variant.fullCode}:${variant.widthCm === null ? 'w' : ''}${variant.gsm === null ? 'g' : ''}`,
          })),
      );
    },
  },
  {
    key: 'documents.expiring',
    async evaluate(now) {
      const { documents } = await graphql<{ documents: { id: string; title: string; kind: string; expiresOn: string | null }[] }>(
        `query { documents(where: { archivedAt: { isNull: true }, expiresOn: { isNull: false } }) { id title kind expiresOn } }`,
      );
      const today = isoDate(now);
      return documents.flatMap((document) => {
        const days = daysBetween(today, document.expiresOn!);
        if (days > 30) return [];
        const expired = days < 0;
        return [
          {
            entityType: 'document',
            entityId: document.id,
            title: expired ? `${document.title} has expired` : `${document.title} expires in ${days} day${days === 1 ? '' : 's'}`,
            detail: `${document.kind.replace(/_/g, ' ')}, ${expired ? 'expired on' : 'valid until'} ${document.expiresOn}.`,
            severity: expired ? 'critical' : 'caution',
            ownerRole: 'operations',
            dedupeKey: `documents.expiring:${document.id}:${expired ? 'expired' : 'soon'}`,
          } satisfies Finding,
        ];
      });
    },
  },
  {
    key: 'tasks.overdue',
    async evaluate(now) {
      const { tasks } = await graphql<{ tasks: { id: string; title: string; dueOn: string | null; assignee: { name: string; role: Role } | null }[] }>(
        `query { tasks(where: { state: { eq: open }, dueOn: { isNull: false } }) { id title dueOn assignee { name role } } }`,
      );
      const today = isoDate(now);
      return tasks
        .filter((task) => daysBetween(task.dueOn!, today) > 0)
        .map((task) => {
          const late = daysBetween(task.dueOn!, today);
          return {
            entityType: 'task',
            entityId: task.id,
            title: `Task overdue: ${task.title}`,
            detail: `${late} day${late === 1 ? '' : 's'} past its due date${task.assignee ? `, assigned to ${task.assignee.name}` : ''}.`,
            severity: late > 7 ? 'critical' : 'caution',
            ownerRole: task.assignee?.role ?? 'operations',
            dedupeKey: `tasks.overdue:${task.id}`,
          } satisfies Finding;
        });
    },
  },
  {
    key: 'parties.supplier_without_contact',
    async evaluate() {
      const { companies } = await graphql<{
        companies: { id: string; legalName: string; tradingName: string | null; companyRoles_on_company: { kind: string }[]; contacts_on_company: { status: string }[] }[];
      }>(`query { companies(where: { archivedAt: { isNull: true } }) { id legalName tradingName companyRoles_on_company { kind } contacts_on_company { status } } }`);
      return companies
        .filter((company) => company.companyRoles_on_company.some((role) => role.kind === 'supplier') && !company.contacts_on_company.some((contact) => contact.status === 'active'))
        .map((company) => ({
          entityType: 'supplier',
          entityId: company.id,
          title: `${company.tradingName || company.legalName} has no contact`,
          detail: 'A supplier with nobody to write to. Add the person who handles orders.',
          severity: 'info' as Severity,
          ownerRole: 'purchasing' as Role,
          dedupeKey: `parties.supplier_without_contact:${company.id}`,
        }));
    },
  },
];

interface ExistingAlert {
  id: string;
  ruleKey: string;
  dedupeKey: string;
  state: 'open' | 'acknowledged' | 'resolved';
  title: string;
  detail: string | null;
}

/** Runs every rule and reconciles the alert table with what the facts say now. */
export async function evaluateRules(now = new Date()): Promise<{ raised: number; refreshed: number; resolved: number }> {
  const counts = { raised: 0, refreshed: 0, resolved: 0 };
  const { alerts } = await graphql<{ alerts: ExistingAlert[] }>(
    `query { alerts(where: { state: { ne: resolved } }) { id ruleKey dedupeKey state title detail } }`,
  );
  const existing = new Map(alerts.map((alert) => [alert.dedupeKey, alert]));

  for (const rule of RULES) {
    const findings = await rule.evaluate(now);
    const seen = new Set<string>();
    for (const finding of findings) {
      seen.add(finding.dedupeKey);
      const current = existing.get(finding.dedupeKey);
      if (current) {
        await graphql(
          `mutation ($id: UUID!, $title: String!, $detail: String) { alert_update(id: $id, data: { title: $title, detail: $detail, lastSeen_expr: "request.time" }) }`,
          { id: current.id, title: finding.title, detail: finding.detail },
        );
        counts.refreshed += 1;
      } else {
        // A resolved alert with the same key may exist; the unique dedupe key
        // means we revive it rather than insert a duplicate.
        const { alerts: dormant } = await graphql<{ alerts: { id: string }[] }>(
          `query ($key: String!) { alerts(where: { dedupeKey: { eq: $key } }, limit: 1) { id } }`,
          { key: finding.dedupeKey },
        );
        if (dormant[0]) {
          await graphql(
            `mutation ($id: UUID!, $title: String!, $detail: String) {
              alert_update(id: $id, data: { state: open, title: $title, detail: $detail, resolvedAt: null, acknowledgedAt: null, acknowledgedByUid: null, firstSeen_expr: "request.time", lastSeen_expr: "request.time" }) }`,
            { id: dormant[0].id, title: finding.title, detail: finding.detail },
          );
        } else {
          await graphql(
            `mutation ($ruleKey: String!, $entityType: String!, $entityId: String!, $severity: AlertSeverity!, $title: String!, $detail: String, $ownerRole: Role, $dedupeKey: String!) {
              alert_insert(data: { ruleKey: $ruleKey, entityType: $entityType, entityId: $entityId, severity: $severity, state: open, title: $title, detail: $detail, ownerRole: $ownerRole, dedupeKey: $dedupeKey }) }`,
            {
              ruleKey: rule.key,
              entityType: finding.entityType,
              entityId: finding.entityId,
              severity: finding.severity,
              title: finding.title,
              detail: finding.detail,
              ownerRole: finding.ownerRole,
              dedupeKey: finding.dedupeKey,
            },
          );
        }
        counts.raised += 1;
      }
    }
    for (const alert of alerts) {
      if (alert.ruleKey === rule.key && !seen.has(alert.dedupeKey)) {
        await graphql(`mutation ($id: UUID!) { alert_update(id: $id, data: { state: resolved, resolvedAt_expr: "request.time" }) }`, { id: alert.id });
        counts.resolved += 1;
      }
    }
  }
  return counts;
}

/** Owners and operations can run the checks on demand from the Gateway. */
export const evaluateAlerts = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations'], 'Running the checks');
  return evaluateRules();
});
