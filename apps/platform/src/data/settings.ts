import { FUNCTION_NAMES, type ApiTokenView, type ConnectorKey, type ConnectorView, type MessageView, type Role } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// Settings: connectors, tokens, people. Sample mode answers from memory.

const sampleTokens: ApiTokenView[] = [
  { id: 'tok-1', name: 'Ido’s assistant (Claude)', prefix: 'bsk_7k2m9x1a', role: 'owner', createdAt: '2026-09-20T09:00:00Z', expiresAt: null, lastUsedAt: '2026-10-06T07:40:00Z', revokedAt: null },
];
const sampleConnectors: ConnectorView[] = [
  { key: 'email', settings: { provider: 'resend', fromName: 'BASIS INC.', fromAddress: 'orders@basis-inc.example', replyTo: '' }, updatedAt: '2026-09-20T09:00:00Z', secrets: [{ name: 'EMAIL_API_KEY', present: true }] },
  { key: 'whatsapp', settings: { businessNumber: '' }, updatedAt: null, secrets: [] },
  { key: 'assistant', settings: { defaultRole: 'owner' }, updatedAt: '2026-09-20T09:00:00Z', secrets: [] },
];

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

export function useConnectors() {
  return useQuery({
    queryKey: ['settings', 'connectors'],
    queryFn: async (): Promise<{ connectors: ConnectorView[]; emulator: boolean }> => {
      if (isSample) return { connectors: sampleConnectors, emulator: false };
      return callFunction<Record<string, never>, { connectors: ConnectorView[]; emulator: boolean }>(FUNCTION_NAMES.connectorStatus, {});
    },
  });
}

export function useSaveConnector() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: ConnectorKey; settings: Record<string, string | number | boolean> }): Promise<void> => {
      if (isSample) {
        const index = sampleConnectors.findIndex((connector) => connector.key === input.key);
        if (index >= 0) sampleConnectors[index] = { ...sampleConnectors[index]!, settings: input.settings as never, updatedAt: new Date().toISOString() };
        return;
      }
      await callFunction(FUNCTION_NAMES.saveConnector, input);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['settings', 'connectors'] }),
  });
}

export function useApiTokens() {
  return useQuery({
    queryKey: ['settings', 'tokens'],
    queryFn: async (): Promise<ApiTokenView[]> => {
      if (isSample) return [...sampleTokens];
      const { dc, sdk } = await live();
      const { data } = await sdk.listApiTokens(dc);
      return data.apiTokens.map((token) => ({ id: token.id, name: token.name, prefix: token.prefix, role: token.role as Role, createdAt: token.createdAt, expiresAt: token.expiresAt ?? null, lastUsedAt: token.lastUsedAt ?? null, revokedAt: token.revokedAt ?? null }));
    },
  });
}

export interface IssuedToken {
  id: string;
  prefix: string;
  token: string;
  role: Role;
  expiresAt: string | null;
}

export function useCreateApiToken() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; role: Role; expiresInDays?: number }): Promise<IssuedToken> => {
      if (isSample) {
        const prefix = `bsk_${Math.random().toString(36).slice(2, 10)}`;
        const issued = { id: `tok-${Date.now()}`, prefix, token: `${prefix}_${Math.random().toString(36).slice(2).padEnd(40, 'x')}`, role: input.role, expiresAt: null };
        sampleTokens.unshift({ id: issued.id, name: input.name, prefix, role: input.role, createdAt: new Date().toISOString(), expiresAt: null, lastUsedAt: null, revokedAt: null });
        return issued;
      }
      return callFunction<typeof input, IssuedToken>(FUNCTION_NAMES.createApiToken, input);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['settings', 'tokens'] }),
  });
}

export function useRevokeApiToken() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (isSample) {
        const token = sampleTokens.find((candidate) => candidate.id === id);
        if (token) sampleTokens[sampleTokens.indexOf(token)] = { ...token, revokedAt: new Date().toISOString() };
        return;
      }
      await callFunction(FUNCTION_NAMES.revokeApiToken, { id });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['settings', 'tokens'] }),
  });
}

export function useMessagesFor(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['messages', entityType, entityId],
    queryFn: async (): Promise<MessageView[]> => {
      if (isSample) return [];
      const { dc, sdk } = await live();
      const { data } = await sdk.listMessagesFor(dc, { entityType, entityId });
      return data.messages.map((message) => ({ id: message.id, channel: message.channel, recipient: message.recipient, subject: message.subject ?? '', status: message.status, error: message.error ?? '', sentAt: message.sentAt }));
    },
  });
}

export function useSendDocumentEmail() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: 'purchase-order' | 'packing-list' | 'roll-labels' | 'shipment-packing-list'; number: string; to: string; subject: string; message: string }): Promise<void> => {
      if (isSample) throw new Error('Email leaves through the platform’s functions; the sample has none.');
      await callFunction(FUNCTION_NAMES.sendDocumentEmail, input);
    },
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['messages'] }), client.invalidateQueries({ queryKey: ['timeline'] })]),
  });
}
