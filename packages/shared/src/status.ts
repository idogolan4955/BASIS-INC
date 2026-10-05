// Three kinds of status, never merged into one field (docs/DOMAIN_MODEL.md §1):
// lifecycle state is explicit; health and progress are derived from facts.

export const HEALTH = ['on_track', 'at_risk', 'delayed', 'blocked'] as const;
export type Health = (typeof HEALTH)[number];

export const ALERT_SEVERITIES = ['info', 'caution', 'critical'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATES = ['open', 'acknowledged', 'resolved'] as const;
export type AlertState = (typeof ALERT_STATES)[number];

export const TASK_STATES = ['open', 'done', 'cancelled'] as const;
export type TaskState = (typeof TASK_STATES)[number];

/** The five status tones of the design system. Every domain state maps to exactly one. */
export const STATUS_TONES = ['positive', 'caution', 'critical', 'transit', 'neutral'] as const;
export type StatusTone = (typeof STATUS_TONES)[number];

export const HEALTH_TONE: Record<Health, StatusTone> = {
  on_track: 'positive',
  at_risk: 'caution',
  delayed: 'critical',
  blocked: 'critical',
};

export const HEALTH_LABEL: Record<Health, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  delayed: 'Delayed',
  blocked: 'Blocked',
};

export const SEVERITY_TONE: Record<AlertSeverity, StatusTone> = {
  info: 'transit',
  caution: 'caution',
  critical: 'critical',
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: 'Notice',
  caution: 'Warning',
  critical: 'Critical',
};
