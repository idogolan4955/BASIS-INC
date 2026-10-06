import type { Role } from './access';

// How the platform reaches the outside, and who may act through it.

export const CONNECTOR_KEYS = ['email', 'whatsapp', 'assistant'] as const;
export type ConnectorKey = (typeof CONNECTOR_KEYS)[number];

export const EMAIL_PROVIDERS = ['resend', 'postmark'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];
export const EMAIL_PROVIDER_LABEL: Record<EmailProvider, string> = { resend: 'Resend', postmark: 'Postmark' };

export interface EmailSettings {
  readonly provider: EmailProvider | '';
  readonly fromName: string;
  readonly fromAddress: string;
  readonly replyTo: string;
}

export interface WhatsappSettings {
  /** The number the share sheet and wa.me links open to, when one is given. */
  readonly businessNumber: string;
}

export interface AssistantSettings {
  /** The role the assistant's tokens are issued with; never above the owner's. */
  readonly defaultRole: Role;
}

/** The secret each connector needs, by the name the owner sets with `firebase functions:secrets:set`. */
export const CONNECTOR_SECRETS: Record<ConnectorKey, readonly string[]> = {
  email: ['EMAIL_API_KEY'],
  whatsapp: [],
  assistant: [],
};

export interface ConnectorView {
  readonly key: ConnectorKey;
  readonly settings: EmailSettings | WhatsappSettings | AssistantSettings | null;
  readonly updatedAt: string | null;
  /** Which of the connector's secrets are present where the functions run. */
  readonly secrets: readonly { readonly name: string; readonly present: boolean }[];
}

export interface ApiTokenView {
  readonly id: string;
  readonly name: string;
  readonly prefix: string;
  readonly role: Role;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly lastUsedAt: string | null;
  readonly revokedAt: string | null;
}

export interface MessageView {
  readonly id: string;
  readonly channel: string;
  readonly recipient: string;
  readonly subject: string;
  readonly status: string;
  readonly error: string;
  readonly sentAt: string;
}

/** Commands a machine may run through /api/commands/<name> with a token. */
export const ASSISTANT_COMMANDS = [
  'createPurchaseOrder',
  'issuePurchaseOrder',
  'confirmPurchaseOrder',
  'cancelPurchaseOrder',
  'createProductionRun',
  'updateMilestone',
  'recordLot',
  'packHandlingUnit',
  'setLotQuality',
  'fileGeneratedDocument',
  'sendDocumentEmail',
  'evaluateAlerts',
] as const;
export type AssistantCommand = (typeof ASSISTANT_COMMANDS)[number];
export function isAssistantCommand(value: string): value is AssistantCommand {
  return (ASSISTANT_COMMANDS as readonly string[]).includes(value);
}
