import { FUNCTION_NAMES, type AskAssistantInput, type AskAssistantResult, type AssistantActionKind, type AssistantActionState, type AssistantActionView, type AssistantProgress, type AssistantThreadSummary, type AssistantThreadView, type DecideAssistantActionInput } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { callFunction, streamFunction } from '../lib/functions';
import { isSample } from './source';

// BASIS AI's data. Threads, messages and actions are read through the
// connector, each person their own; asking and deciding go through the
// assistant functions, which hold the Anthropic key and run approved actions.

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('../lib/connector').then((m) => m.platform())]);
  return { dc: dataConnect, sdk };
}
const sample = async () => (await import('./sample-assistant')).sampleAssistant;

const actionOf = (row: { id: string; toolUseId: string; command: string; input: unknown; summary: string; state: string; decidedBy?: { name: string } | null; decidedAt?: string | null; result?: unknown; error?: string | null; createdAt: string }): AssistantActionView => {
  const [kind, name] = row.command.includes(':') ? (row.command.split(':') as [AssistantActionKind, string]) : (['command', row.command] as [AssistantActionKind, string]);
  return { id: row.id, toolUseId: row.toolUseId, kind, name, input: (row.input ?? {}) as Record<string, unknown>, summary: row.summary, state: row.state as AssistantActionState, decidedByName: row.decidedBy?.name ?? '', decidedAt: row.decidedAt ?? null, result: row.result ?? null, error: row.error ?? '', createdAt: row.createdAt };
};

export function useAssistantThreads() {
  return useQuery({
    queryKey: ['assistant', 'threads'],
    queryFn: async (): Promise<AssistantThreadSummary[]> => {
      if (isSample) return (await sample()).threads();
      const { dc, sdk } = await live();
      const { data } = await sdk.listAssistantThreads(dc);
      return data.assistantThreads.map((row) => ({ id: row.id, title: row.title, lastActivityAt: row.lastActivityAt }));
    },
  });
}

export function useAssistantThread(id: string | undefined) {
  return useQuery({
    queryKey: ['assistant', 'thread', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<AssistantThreadView | null> => {
      if (!id) return null;
      if (isSample) return (await sample()).thread(id);
      const { dc, sdk } = await live();
      const { data } = await sdk.getAssistantThread(dc, { id });
      const row = data.assistantThreads[0];
      if (!row) return null;
      return {
        id: row.id,
        title: row.title,
        lastActivityAt: row.lastActivityAt,
        messages: row.messages.map((message) => ({ id: message.id, seq: message.seq, role: message.role as 'user' | 'assistant', content: Array.isArray(message.content) ? (message.content as unknown[]) : [], createdAt: message.createdAt })),
        actions: row.actions.map(actionOf),
      };
    },
  });
}

export interface PendingAction {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly createdAt: string;
  readonly threadId: string;
  readonly threadTitle: string;
}

export function usePendingAssistantActions() {
  return useQuery({
    queryKey: ['assistant', 'pending'],
    queryFn: async (): Promise<PendingAction[]> => {
      if (isSample) return (await sample()).pending();
      const { dc, sdk } = await live();
      const { data } = await sdk.listPendingAssistantActions(dc);
      return data.assistantActions.map((row) => ({ id: row.id, name: row.command.split(':').pop() ?? row.command, summary: row.summary, createdAt: row.createdAt, threadId: row.thread.id, threadTitle: row.thread.title }));
    },
  });
}

/** Asks in a thread (or starts one). `progress` says what the assistant is doing while it works. */
export function useAskAssistant() {
  const client = useQueryClient();
  const [progress, setProgress] = useState<AssistantProgress | null>(null);
  const mutation = useMutation({
    mutationFn: async (input: AskAssistantInput): Promise<AskAssistantResult> => {
      if (isSample) return (await sample()).ask(input);
      return streamFunction<AskAssistantInput, AssistantProgress, AskAssistantResult>(FUNCTION_NAMES.askAssistant, input, (chunk) => {
        setProgress(chunk);
        // Each step is stored as it happens; showing it keeps the page honest about what was read.
        void client.invalidateQueries({ queryKey: ['assistant', 'thread', input.threadId] });
      });
    },
    onSettled: async () => {
      setProgress(null);
      await client.invalidateQueries({ queryKey: ['assistant'] });
    },
  });
  return { ...mutation, progress };
}

export function useDecideAssistantAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: DecideAssistantActionInput): Promise<{ state: AssistantActionState; error?: string }> => {
      if (isSample) return (await sample()).decide(input);
      return callFunction(FUNCTION_NAMES.decideAssistantAction, input);
    },
    onSettled: async () => {
      // An approved action changes records anywhere in the platform.
      await client.invalidateQueries();
    },
  });
}

export function useArchiveAssistantThread() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isSample) return (await sample()).archive(id);
      const { dc, sdk } = await live();
      await sdk.archiveAssistantThread(dc, { id });
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ['assistant'] });
    },
  });
}
