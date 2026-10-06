// The timeline a record carries: what happened to it, when, and by whom.

export interface TimelineEventView {
  readonly id: string;
  readonly kind: string;
  /** ISO timestamp. */
  readonly occurredAt: string;
  readonly note: string;
  readonly actorName: string;
  readonly payload: unknown;
}

export const EVENT_KIND_LABEL: Record<string, string> = {
  created: 'Created',
  updated: 'Details updated',
  note: 'Note',
  status_changed: 'Status changed',
  published: 'Published',
  unpublished: 'Unpublished',
  variant_added: 'Variant added',
  skus_added: 'SKUs added',
  sourcing_added: 'Sourcing added',
  standard_recorded: 'Shade standard recorded',
  contact_added: 'Contact added',
  role_changed: 'Role changed',
};

export function eventKindLabel(kind: string): string {
  return EVENT_KIND_LABEL[kind] ?? kind.replace(/_/g, ' ');
}
