import { documentsCheck, expectedEta, expectedEtd, legStatus, lowStock, shipmentDates, type DocumentRequirementRule, type LegFacts, type LocalDate } from '@basis/shared';
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
    key: 'production.milestone_overdue',
    async evaluate(now) {
      const { productionRuns } = await graphql<{
        productionRuns: { number: string; state: string; productionMilestones_on_run: { id: string; name: string; state: string; plannedEnd: string; forecastEnd: string | null }[] }[];
      }>(`query { productionRuns(where: { state: { in: [planned, active] } }) { number state productionMilestones_on_run { id name state plannedEnd forecastEnd } } }`);
      const today = isoDate(now);
      return productionRuns.flatMap((run) =>
        run.productionMilestones_on_run
          .filter((milestone) => milestone.state !== 'done' && milestone.state !== 'skipped')
          .map((milestone) => ({ milestone, late: daysBetween(milestone.forecastEnd ?? milestone.plannedEnd, today) }))
          .filter(({ late }) => late > 0)
          .map(({ milestone, late }) => ({
            entityType: 'production_run',
            entityId: run.number,
            title: `${run.number}: ${milestone.name} is ${late} day${late === 1 ? '' : 's'} late`,
            detail: `Expected to finish ${milestone.forecastEnd ?? milestone.plannedEnd}, still ${milestone.state.replace('_', ' ')}.`,
            severity: (late > 3 ? 'critical' : 'caution') as Severity,
            ownerRole: 'purchasing' as Role,
            dedupeKey: `production.milestone_overdue:${milestone.id}`,
          })),
      );
    },
  },
  {
    key: 'production.run_health',
    async evaluate() {
      const { productionRuns } = await graphql<{ productionRuns: { number: string; health: string; forecastEnd: string | null; plannedEnd: string }[] }>(
        `query { productionRuns(where: { state: { in: [planned, active] }, health: { in: [at_risk, delayed, blocked] } }) { number health forecastEnd plannedEnd } }`,
      );
      return productionRuns.map((run) => ({
        entityType: 'production_run',
        entityId: run.number,
        title: `${run.number} is ${run.health.replace('_', ' ')}`,
        detail: run.forecastEnd && run.forecastEnd !== run.plannedEnd ? `Planned to finish ${run.plannedEnd}, now expected ${run.forecastEnd}.` : `Planned to finish ${run.plannedEnd}.`,
        severity: (run.health === 'at_risk' ? 'caution' : 'critical') as Severity,
        ownerRole: 'purchasing' as Role,
        dedupeKey: `production.run_health:${run.number}:${run.health}`,
      }));
    },
  },
  {
    key: 'payments.due',
    async evaluate(now) {
      const { paymentMilestones } = await graphql<{
        paymentMilestones: { id: string; label: string; dueOn: string | null; paidOn: string | null; amount: string | null; purchaseOrder: { number: string; currency: string; state: string } }[];
      }>(`query { paymentMilestones(where: { paidOn: { isNull: true }, dueOn: { isNull: false } }) { id label dueOn paidOn amount purchaseOrder { number currency state } } }`);
      const today = isoDate(now);
      return paymentMilestones
        .filter((payment) => payment.purchaseOrder.state !== 'cancelled' && daysBetween(today, payment.dueOn!) <= 7)
        .map((payment) => {
          const late = daysBetween(payment.dueOn!, today);
          return {
            entityType: 'purchase_order',
            entityId: payment.purchaseOrder.number,
            title: late > 0 ? `${payment.purchaseOrder.number}: ${payment.label} is ${late} day${late === 1 ? '' : 's'} overdue` : `${payment.purchaseOrder.number}: ${payment.label} due ${payment.dueOn}`,
            detail: `${payment.purchaseOrder.currency} payment to the supplier, ${late > 0 ? 'unpaid' : 'falling due'}.`,
            severity: (late > 0 ? 'critical' : 'caution') as Severity,
            ownerRole: 'finance' as Role,
            dedupeKey: `payments.due:${payment.id}:${late > 0 ? 'late' : 'soon'}`,
          };
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
  {
    key: 'quality.inspection_overdue',
    async evaluate(now) {
      const { inspections } = await graphql<{ inspections: { number: string; type: string; state: string; scheduledOn: string | null; entityId: string; submittedAt: string | null }[] }>(
        `query { inspections(where: { state: { in: [scheduled, in_progress, submitted] } }, limit: 500) { number type state scheduledOn entityId submittedAt } }`,
      );
      const today = isoDate(now);
      const findings: Finding[] = [];
      for (const inspection of inspections) {
        if ((inspection.state === 'scheduled' || inspection.state === 'in_progress') && inspection.scheduledOn && daysBetween(inspection.scheduledOn, today) > 0) {
          findings.push({ entityType: 'inspection', entityId: inspection.number, title: `${inspection.number} is ${daysBetween(inspection.scheduledOn, today)} days past its date`, detail: `${inspection.type.replace('_', ' ')} inspection of ${inspection.entityId}, scheduled ${inspection.scheduledOn}, not submitted.`, severity: 'caution' as Severity, ownerRole: 'qc' as Role, dedupeKey: `quality.inspection_overdue:${inspection.number}` });
        }
        if (inspection.state === 'submitted' && inspection.submittedAt && daysBetween(inspection.submittedAt.slice(0, 10), today) >= 2) {
          findings.push({ entityType: 'inspection', entityId: inspection.number, title: `${inspection.number} waiting ${daysBetween(inspection.submittedAt.slice(0, 10), today)} days for sign-off`, detail: `${inspection.entityId} cannot move until the inspection is signed off.`, severity: 'caution' as Severity, ownerRole: 'qc' as Role, dedupeKey: `quality.sign_off_waiting:${inspection.number}` });
        }
      }
      return findings;
    },
  },
  {
    key: 'quality.action_overdue',
    async evaluate(now) {
      const { correctiveActions } = await graphql<{ correctiveActions: { number: string; title: string; dueOn: string | null; state: string; ownerName: string | null }[] }>(
        `query { correctiveActions(where: { state: { in: [open, in_progress, verification] } }, limit: 500) { number title dueOn state ownerName } }`,
      );
      const today = isoDate(now);
      return correctiveActions
        .filter((action) => action.dueOn && daysBetween(action.dueOn, today) > 0)
        .map((action) => ({ entityType: 'corrective_action', entityId: action.number, title: `${action.number} is ${daysBetween(action.dueOn!, today)} days overdue`, detail: `${action.title}${action.ownerName ? `, with ${action.ownerName}` : ''}; ${action.state.replace('_', ' ')}.`, severity: 'caution' as Severity, ownerRole: 'qc' as Role, dedupeKey: `quality.action_overdue:${action.number}` }));
    },
  },
  {
    key: 'logistics.shipment_dates',
    async evaluate(now) {
      const { shipments } = await graphql<{ shipments: { number: string; destination: { name: string }; shipmentLegs_on_shipment: (LegFacts & { id: string; toLocation: { name: string; city: string | null } | null })[] }[] }>(
        `query { shipments(where: { state: { eq: booked } }, limit: 500) { number destination { name } shipmentLegs_on_shipment(orderBy: { sequence: ASC }) { id type sequence plannedEtd plannedEta etd eta atd ata toLocation { name city } } } }`,
      );
      const today = isoDate(now) as LocalDate;
      const findings: Finding[] = [];
      for (const shipment of shipments) {
        const legs = shipment.shipmentLegs_on_shipment;
        const { eta, plannedEta } = shipmentDates(legs);
        const slip = eta && plannedEta ? daysBetween(plannedEta, eta) : 0;
        if (slip >= 1 && legs.some((leg) => legStatus(leg) !== 'arrived')) {
          findings.push({ entityType: 'shipment', entityId: shipment.number, title: `${shipment.number}: arrival slipped by ${slip} day${slip === 1 ? '' : 's'}`, detail: `Planned to reach ${shipment.destination.name} ${plannedEta}, now expected ${eta}.`, severity: slip >= 3 ? 'critical' : 'caution', ownerRole: 'logistics', dedupeKey: `logistics.eta_slipped:${shipment.number}:${eta}` });
        }
        const current = legs.find((leg) => legStatus(leg) !== 'arrived');
        if (!current) continue;
        const label = current.type.replace(/_/g, ' ');
        if (legStatus(current) === 'pending') {
          const departure = expectedEtd(current);
          const late = departure ? daysBetween(departure, today) : 0;
          if (late >= 1) findings.push({ entityType: 'shipment', entityId: shipment.number, title: `${shipment.number}: ${label} has not departed`, detail: `Due to leave ${departure}, ${late} day${late === 1 ? '' : 's'} ago; no departure recorded.`, severity: late > 2 ? 'critical' : 'caution', ownerRole: 'logistics', dedupeKey: `logistics.departure_overdue:${current.id}` });
        } else {
          const arrival = expectedEta(current);
          const late = arrival ? daysBetween(arrival, today) : 0;
          if (late >= 1) findings.push({ entityType: 'shipment', entityId: shipment.number, title: `${shipment.number}: ${label} overdue at ${current.toLocation ? current.toLocation.city || current.toLocation.name : 'destination'}`, detail: `Expected ${arrival}, ${late} day${late === 1 ? '' : 's'} ago; no arrival recorded.`, severity: late > 3 ? 'critical' : 'caution', ownerRole: 'logistics', dedupeKey: `logistics.arrival_overdue:${current.id}` });
        }
      }
      return findings;
    },
  },
  {
    key: 'logistics.document_missing',
    async evaluate(now) {
      const [{ shipments }, { documentRequirements }] = await Promise.all([
        graphql<{ shipments: { number: string; mode: string; flow: string; destination: { country: { code: string } | null }; shipmentLegs_on_shipment: LegFacts[] }[] }>(
          `query { shipments(where: { state: { in: [draft, booked] } }, limit: 500) { number mode flow destination { country { code } } shipmentLegs_on_shipment(orderBy: { sequence: ASC }) { type sequence plannedEtd plannedEta etd eta atd ata } } }`,
        ),
        graphql<{ documentRequirements: { mode: string | null; flow: string | null; documentKind: string; daysBeforeEtd: number; destinationCountry: { code: string } | null }[] }>(
          `query { documentRequirements(limit: 200) { mode flow documentKind daysBeforeEtd destinationCountry { code } } }`,
        ),
      ]);
      if (documentRequirements.length === 0) return [];
      const rules: DocumentRequirementRule[] = documentRequirements.map((rule) => ({ mode: rule.mode as DocumentRequirementRule['mode'], flow: rule.flow as DocumentRequirementRule['flow'], destinationCountry: rule.destinationCountry?.code ?? null, documentKind: rule.documentKind, daysBeforeEtd: rule.daysBeforeEtd }));
      const today = isoDate(now) as LocalDate;
      const findings: Finding[] = [];
      for (const shipment of shipments) {
        const { etd } = shipmentDates(shipment.shipmentLegs_on_shipment);
        if (!etd) continue;
        const { documentLinks } = await graphql<{ documentLinks: { document: { kind: string; archivedAt: string | null } }[] }>(
          `query ($id: String!) { documentLinks(where: { entityType: { eq: "shipment" }, entityId: { eq: $id } }) { document { kind archivedAt } } }`,
          { id: shipment.number },
        );
        const filed = documentLinks.filter((link) => !link.document.archivedAt).map((link) => link.document.kind);
        const check = documentsCheck(rules, { mode: shipment.mode as never, flow: shipment.flow as never, destinationCountry: shipment.destination.country?.code ?? null, etd }, filed, today);
        for (const item of check) {
          if (item.filed || !item.dueOn || daysBetween(today, item.dueOn) > 3) continue;
          const kind = item.documentKind.replace(/_/g, ' ');
          const departed = shipment.shipmentLegs_on_shipment.some((leg) => legStatus(leg) !== 'pending');
          findings.push({
            entityType: 'shipment',
            entityId: shipment.number,
            title: `${shipment.number}: ${kind} missing${departed ? ' after departure' : ' before departure'}`,
            detail: `Required ${item.dueOn} for a ${shipment.mode} shipment departing ${etd}; nothing filed.`,
            severity: item.overdue ? 'critical' : 'caution',
            ownerRole: 'logistics',
            dedupeKey: `logistics.document_missing:${shipment.number}:${item.documentKind}`,
          });
        }
      }
      return findings;
    },
  },
  {
    key: 'costing.final_pending',
    async evaluate(now) {
      const { shipments } = await graphql<{ shipments: { number: string; destination: { name: string }; shipmentLegs_on_shipment: LegFacts[]; costAllocationRuns_on_shipment: { kind: string }[]; shipmentCosts_on_shipment: { kind: string }[] }[] }>(
        `query { shipments(where: { state: { eq: booked } }, limit: 500) { number destination { name } shipmentLegs_on_shipment(orderBy: { sequence: ASC }) { type sequence plannedEtd plannedEta etd eta atd ata } costAllocationRuns_on_shipment { kind } shipmentCosts_on_shipment { kind } } }`,
      );
      const today = isoDate(now) as LocalDate;
      return shipments
        .filter((shipment) => shipment.shipmentLegs_on_shipment.length > 0 && shipment.shipmentLegs_on_shipment.every((leg) => legStatus(leg) === 'arrived') && !shipment.costAllocationRuns_on_shipment.some((run) => run.kind === 'final'))
        .map((shipment) => {
          const delivered = shipmentDates(shipment.shipmentLegs_on_shipment).eta;
          const days = delivered ? daysBetween(delivered, today) : 0;
          return { shipment, days };
        })
        .filter(({ days }) => days >= 7)
        .map(({ shipment, days }) => ({
          entityType: 'shipment',
          entityId: shipment.number,
          title: `${shipment.number}: landed cost not final`,
          detail: `Delivered to ${shipment.destination.name} ${days} days ago; ${shipment.shipmentCosts_on_shipment.some((cost) => cost.kind === 'actual') ? 'actual costs recorded but not finalised' : 'no actual costs recorded yet'}.`,
          severity: (days > 30 ? 'critical' : 'caution') as Severity,
          ownerRole: 'finance' as Role,
          dedupeKey: `costing.final_pending:${shipment.number}`,
        }));
    },
  },
  {
    key: 'inventory.low_stock',
    async evaluate() {
      const [{ stockBalances }, { reorderPolicies }] = await Promise.all([
        graphql<{ stockBalances: { onHand: string; sku: { code: string }; lot: { number: string }; location: { id: string; kind: string } }[] }>(`query { stockBalances(where: { onHand: { gt: 0 } }, limit: 5000) { onHand sku { code } lot { number } location { id kind } } }`),
        graphql<{ reorderPolicies: { reorderPoint: string; targetLevel: string; sku: { code: string; product: { name: string }; shade: { name: string } } }[] }>(`query { reorderPolicies(limit: 2000) { reorderPoint targetLevel sku { code product { name } shade { name } } } }`),
      ]);
      const low = lowStock(
        stockBalances.map((balance) => ({ skuCode: balance.sku.code, lotNumber: balance.lot.number, locationId: balance.location.id, onHand: balance.onHand, physical: balance.location.kind === 'physical' })),
        reorderPolicies.map((policy) => ({ skuCode: policy.sku.code, reorderPoint: policy.reorderPoint, targetLevel: policy.targetLevel })),
      );
      const metres = (stored: string) => `${(Number(stored) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 0 })} m`;
      return low.map((item) => {
        const sku = reorderPolicies.find((policy) => policy.sku.code === item.skuCode)!.sku;
        return {
          entityType: 'sku',
          entityId: item.skuCode,
          title: `${sku.product.name}, ${sku.shade.name}: stock below reorder point`,
          detail: `${metres(item.available)} available against a reorder point of ${metres(item.reorderPoint)}; ${metres(item.shortfall)} to reach the target.`,
          severity: (item.available === '0' ? 'critical' : 'caution') as Severity,
          ownerRole: 'purchasing' as Role,
          dedupeKey: `inventory.low_stock:${item.skuCode}`,
        };
      });
    },
  },
  {
    key: 'inventory.arrived_unreceived',
    async evaluate(now) {
      const { shipments } = await graphql<{ shipments: { number: string; destination: { name: string }; shipmentLegs_on_shipment: LegFacts[] }[] }>(
        `query { shipments(where: { state: { eq: booked } }, limit: 500) { number destination { name } shipmentLegs_on_shipment(orderBy: { sequence: ASC }) { type sequence plannedEtd plannedEta etd eta atd ata } } }`,
      );
      const today = isoDate(now) as LocalDate;
      return shipments
        .map((shipment) => ({ shipment, main: shipment.shipmentLegs_on_shipment.find((leg) => leg.type === 'main_carriage') }))
        .filter(({ main }) => main?.ata && daysBetween(main.ata, today) >= 2)
        .map(({ shipment, main }) => ({
          entityType: 'shipment',
          entityId: shipment.number,
          title: `${shipment.number} arrived and is not received`,
          detail: `Main carriage arrived ${main!.ata}, ${daysBetween(main!.ata!, today)} days ago; nothing is in stock yet.`,
          severity: (daysBetween(main!.ata!, today) > 7 ? 'critical' : 'caution') as Severity,
          ownerRole: 'logistics' as Role,
          dedupeKey: `inventory.arrived_unreceived:${shipment.number}`,
        }));
    },
  },
  {
    key: 'orders.quote_expiring',
    async evaluate(now) {
      const { quotes } = await graphql<{ quotes: { number: string; state: string; validUntil: string | null; customer: { legalName: string; tradingName: string | null } }[] }>(
        `query { quotes(where: { state: { eq: sent }, validUntil: { isNull: false } }, limit: 500) { number state validUntil customer { legalName tradingName } } }`,
      );
      const today = isoDate(now);
      return quotes
        .map((quote) => ({ quote, days: daysBetween(today, quote.validUntil!) }))
        .filter(({ days }) => days <= 3)
        .map(({ quote, days }) => ({
          entityType: 'quote',
          entityId: quote.number,
          title: days < 0 ? `${quote.number} to ${quote.customer.tradingName || quote.customer.legalName} has expired` : `${quote.number} to ${quote.customer.tradingName || quote.customer.legalName} expires in ${days} day${days === 1 ? '' : 's'}`,
          detail: `Sent and unanswered; valid until ${quote.validUntil}. Follow up, extend, or mark it declined.`,
          severity: (days < 0 ? 'caution' : 'info') as Severity,
          ownerRole: 'sales' as Role,
          dedupeKey: `orders.quote_expiring:${quote.number}:${days < 0 ? 'expired' : 'soon'}`,
        }));
    },
  },
  {
    key: 'orders.unfulfilled',
    async evaluate(now) {
      const { salesOrders } = await graphql<{ salesOrders: { number: string; requestedDelivery: string | null; customer: { legalName: string; tradingName: string | null }; salesOrderLines_on_order: { quantity: string; allocations_on_orderLine: { quantity: string; shippedOn: string | null }[] }[] }[] }>(
        `query { salesOrders(where: { state: { eq: confirmed } }, limit: 500) { number requestedDelivery customer { legalName tradingName } salesOrderLines_on_order { quantity allocations_on_orderLine { quantity shippedOn } } } }`,
      );
      const today = isoDate(now);
      return salesOrders.flatMap((order) => {
        const ordered = order.salesOrderLines_on_order.reduce((sum, line) => sum + BigInt(line.quantity), 0n);
        const held = order.salesOrderLines_on_order.reduce((sum, line) => sum + line.allocations_on_orderLine.reduce((inner, allocation) => inner + BigInt(allocation.quantity), 0n), 0n);
        const customer = order.customer.tradingName || order.customer.legalName;
        const daysToDelivery = order.requestedDelivery ? daysBetween(today, order.requestedDelivery) : null;
        if (daysToDelivery === null || daysToDelivery > 7) return [];
        if (held >= ordered) {
          return daysToDelivery < 0
            ? [{ entityType: 'sales_order', entityId: order.number, title: `${order.number} for ${customer} is ${-daysToDelivery} day${daysToDelivery === -1 ? '' : 's'} past its delivery date`, detail: 'Stock is held; it has not shipped.', severity: 'critical' as Severity, ownerRole: 'logistics' as Role, dedupeKey: `orders.unfulfilled:${order.number}:late` }]
            : [];
        }
        return [{ entityType: 'sales_order', entityId: order.number, title: `${order.number} for ${customer}: stock short ${daysToDelivery < 0 ? 'past' : 'ahead of'} its delivery date`, detail: `${(Number(ordered - held) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 0 })} m not held; requested ${order.requestedDelivery}.`, severity: (daysToDelivery < 0 ? 'critical' : 'caution') as Severity, ownerRole: 'sales' as Role, dedupeKey: `orders.unfulfilled:${order.number}:short` }];
      });
    },
  },
  {
    key: 'customers.inquiry_new',
    async evaluate() {
      const { inquiries } = await graphql<{ inquiries: { reference: string; kind: string; name: string; company: string | null; country: string | null; createdAt: string }[] }>(
        `query { inquiries(where: { state: { eq: "new" } }, orderBy: { createdAt: DESC }, limit: 200) { reference kind name company country createdAt } }`,
      );
      const words: Record<string, string> = { sample_request: 'Sample request', wholesale: 'Wholesale application', contact: 'Message' };
      return inquiries.map((inquiry) => ({
        entityType: 'inquiry',
        entityId: inquiry.reference,
        title: `${words[inquiry.kind] ?? 'Inquiry'} from ${inquiry.company || inquiry.name}${inquiry.country ? `, ${inquiry.country}` : ''}`,
        detail: `Received ${inquiry.createdAt.slice(0, 10)} on the website; nobody has answered yet.`,
        severity: (inquiry.kind === 'contact' ? 'info' : 'caution') as Severity,
        ownerRole: 'sales' as Role,
        dedupeKey: `customers.inquiry_new:${inquiry.reference}`,
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
