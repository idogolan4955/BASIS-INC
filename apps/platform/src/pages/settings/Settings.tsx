import { CONNECTOR_SECRETS, EMAIL_PROVIDERS, EMAIL_PROVIDER_LABEL, ROLES, ROLE_LABELS, type AssistantSettings, type EmailSettings, type Role, type WhatsappSettings } from '@basis/shared';
import { Button, Dialog, Ledger, Panel, SelectField, StatusChip, Td, TextField, Th, Tr, cn } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { NavLink } from 'react-router';
import { useApiTokens, useConnectors, useCreateApiToken, useRevokeApiToken, useSaveConnector, type IssuedToken } from '../../data/settings';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 15, Connectors: how the platform reaches the outside. Secrets are
// never typed here; each connector names the secret the owner sets in the
// terminal and shows whether the functions can see it.

function SettingsTabs({ active }: { active: 'connectors' }) {
  return (
    <nav aria-label="Settings sections" className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      <NavLink to="/settings" end className={cn('-mb-px flex h-11 items-center border-b-2 text-sm', active === 'connectors' ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted')}>
        Connectors
      </NavLink>
    </nav>
  );
}

function SecretRow({ name, present, emulator }: { name: string; present: boolean; emulator: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="code">{name}</span>
      <StatusChip tone={present ? 'positive' : 'caution'}>{present ? 'Set' : 'Not set'}</StatusChip>
      {!present && (
        <span className="text-ink-muted">
          Set it in your terminal: <span className="code">firebase functions:secrets:set {name}</span>
          {emulator && (
            <>
              {' '}
              · locally in <span className="code">functions/.secret.local</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}

function EmailConnector({ settings, secrets, emulator, canEdit }: { settings: EmailSettings | null; secrets: readonly { name: string; present: boolean }[]; emulator: boolean; canEdit: boolean }) {
  const save = useSaveConnector();
  const [form, setForm] = useState<EmailSettings>({ provider: settings?.provider ?? '', fromName: settings?.fromName ?? 'BASIS INC.', fromAddress: settings?.fromAddress ?? '', replyTo: settings?.replyTo ?? '' });
  const set = (key: keyof EmailSettings) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ key: 'email', settings: { ...form } });
  };
  const ready = Boolean(form.provider && form.fromAddress) && secrets.every((secret) => secret.present);
  return (
    <Panel title="Email" action={<StatusChip tone={ready ? 'positive' : 'caution'}>{ready ? 'Ready' : 'Not configured'}</StatusChip>}>
      <p className="mb-4 max-w-2xl text-sm text-ink-soft">
        Purchase orders, packing lists and labels leave as attachments from this address. Pick a provider, set the sender, and give the functions the provider’s API key by name; the key never passes through this screen.
      </p>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Provider" value={form.provider} onChange={set('provider')} disabled={!canEdit}>
          <option value="">Choose a provider</option>
          {EMAIL_PROVIDERS.map((provider) => (
            <option key={provider} value={provider}>
              {EMAIL_PROVIDER_LABEL[provider]}
            </option>
          ))}
        </SelectField>
        <TextField label="Sender name" value={form.fromName} onChange={set('fromName')} disabled={!canEdit} />
        <TextField label="From address" type="email" value={form.fromAddress} onChange={set('fromAddress')} placeholder="orders@basis-inc.com" disabled={!canEdit} help="A domain verified with the provider." />
        <TextField label="Reply-to" type="email" value={form.replyTo} onChange={set('replyTo')} disabled={!canEdit} />
        <div className="space-y-2 sm:col-span-2">
          {secrets.map((secret) => (
            <SecretRow key={secret.name} name={secret.name} present={secret.present} emulator={emulator} />
          ))}
        </div>
        {canEdit && (
          <div className="flex items-center justify-end gap-3 sm:col-span-2">
            {save.error && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {save.error.message}
              </span>
            )}
            <Button type="submit" variant="primary" busy={save.isPending} busyLabel="Saving">
              Save email settings
            </Button>
          </div>
        )}
      </form>
    </Panel>
  );
}

function WhatsappConnector({ settings, canEdit }: { settings: WhatsappSettings | null; canEdit: boolean }) {
  const save = useSaveConnector();
  const [number, setNumber] = useState(settings?.businessNumber ?? '');
  return (
    <Panel title="WhatsApp" action={<StatusChip tone="neutral">Share sheet</StatusChip>}>
      <p className="mb-4 max-w-2xl text-sm text-ink-soft">
        Documents reach WhatsApp through the phone’s share sheet, or on a desktop by saving the file and opening a message. The WhatsApp Business API, with delivery and history, joins with the messaging work in Growth.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate({ key: 'whatsapp', settings: { businessNumber: number.trim() } });
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <TextField label="Business number" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="+972 50 000 0000" help="Shown on documents as the number to reach BASIS on." disabled={!canEdit} />
        {canEdit && (
          <div className="flex items-end justify-end">
            <Button type="submit" busy={save.isPending} busyLabel="Saving">
              Save
            </Button>
          </div>
        )}
      </form>
    </Panel>
  );
}

function IssueTokenDialog({ open, onClose, defaultRole, onIssued }: { open: boolean; onClose: () => void; defaultRole: Role; onIssued: (token: IssuedToken) => void }) {
  const create = useCreateApiToken();
  const [form, setForm] = useState({ name: '', role: defaultRole, expiresInDays: '365' });
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Name the token after what will hold it.');
    try {
      const issued = await create.mutateAsync({ name: form.name.trim(), role: form.role, expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : undefined });
      onIssued(issued);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The token could not be issued.');
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Issue a token" description="For an assistant or an integration. Every action it takes runs with this role, as you, and is audited with the token named on the request.">
      <form onSubmit={submit} className="grid gap-4">
        <TextField label="Name" required value={form.name} onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))} placeholder="Ido’s assistant (Claude)" />
        <SelectField label="Role" value={form.role} onChange={(event) => setForm((f) => ({ ...f, role: event.target.value as Role }))}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </SelectField>
        <TextField label="Expires in" type="number" min={1} max={730} unit="days" value={form.expiresInDays} onChange={(event) => setForm((f) => ({ ...f, expiresInDays: event.target.value }))} help="Leave empty for a token that does not expire." />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel="Issuing">
            Issue token
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function AssistantConnector({ settings, canEdit }: { settings: AssistantSettings | null; canEdit: boolean }) {
  const tokens = useApiTokens();
  const revoke = useRevokeApiToken();
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssuedToken | null>(null);
  const [copied, setCopied] = useState(false);
  const apiUrl = `${window.location.origin}/api`;
  const config = JSON.stringify({ mcpServers: { basis: { command: 'node', args: ['/path/to/BASIS INC/apps/assistant/dist/index.js'], env: { BASIS_API_URL: apiUrl, BASIS_API_TOKEN: issued?.token ?? 'bsk_…' } } } }, null, 2);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The clipboard is not available here; the text is on screen to select.
    }
  };
  const rows = tokens.data ?? [];
  return (
    <>
      <Panel
        title="Assistant and API"
        count={rows.filter((token) => !token.revokedAt).length}
        action={canEdit && <Button size="sm" variant="primary" onClick={() => setIssuing(true)}>Issue token</Button>}
      >
        <p className="mb-4 max-w-2xl text-sm text-ink-soft">
          A personal AI assistant acts on the platform through the <span className="code">basis</span> MCP server with a token issued here: it reads the attention ledger and the ledgers, renders documents, and runs the same commands the screens do, with the token’s role, as the person who issued it, and a full audit trail. Tokens are shown once.
        </p>
        {issued && (
          <div className="mb-5 rounded-[var(--radius-panel)] border border-line bg-bone p-4">
            <p className="caps text-ink-soft">Token issued · shown once</p>
            <p className="code mt-2 break-all text-sm">{issued.token}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => copy(issued.token)}>
                {copied ? 'Copied' : 'Copy token'}
              </Button>
              <Button size="sm" onClick={() => copy(config)}>
                Copy MCP configuration
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setIssued(null)}>
                Done
              </Button>
            </div>
            <pre className="code mt-3 overflow-x-auto whitespace-pre text-xs text-ink-soft">{config}</pre>
          </div>
        )}
        {rows.length === 0 ? (
          <p className="text-ink-muted">No tokens yet.</p>
        ) : (
          <Ledger caption="API tokens">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Prefix</Th>
                <Th>Role</Th>
                <Th>Issued</Th>
                <Th>Last used</Th>
                <Th>Expires</Th>
                <Th>State</Th>
                {canEdit && <Th>Action</Th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((token) => (
                <Tr key={token.id}>
                  <Td className="font-medium">{token.name}</Td>
                  <Td className="code">{token.prefix}…</Td>
                  <Td className="text-ink-soft">{ROLE_LABELS[token.role]}</Td>
                  <Td className="code text-ink-soft">{token.createdAt.slice(0, 10)}</Td>
                  <Td className="code text-ink-soft">{token.lastUsedAt ? token.lastUsedAt.slice(0, 16).replace('T', ' ') : '—'}</Td>
                  <Td className="code text-ink-soft">{token.expiresAt ? token.expiresAt.slice(0, 10) : 'Never'}</Td>
                  <Td>
                    <StatusChip tone={token.revokedAt ? 'critical' : 'positive'}>{token.revokedAt ? 'Revoked' : 'Active'}</StatusChip>
                  </Td>
                  {canEdit && (
                    <Td>
                      {!token.revokedAt && (
                        <Button size="sm" variant="quiet" onClick={() => revoke.mutate(token.id)} busy={revoke.isPending && revoke.variables === token.id} busyLabel="Revoking">
                          Revoke
                        </Button>
                      )}
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Ledger>
        )}
        <p className="mt-4 text-[0.8125rem] text-ink-muted">
          Endpoints a token reaches: <span className="code">GET /api/attention</span>, <span className="code">GET /api/export/&lt;ledger&gt;.json|csv|xlsx</span>, <span className="code">GET /api/pdf/&lt;kind&gt;/&lt;number&gt;</span>, <span className="code">POST /api/commands/&lt;command&gt;</span>. Set-up for the MCP server is in <span className="code">apps/assistant/README.md</span>.
        </p>
      </Panel>
      {canEdit && <IssueTokenDialog key={issuing ? 'open' : 'closed'} open={issuing} onClose={() => setIssuing(false)} defaultRole={settings?.defaultRole ?? 'owner'} onIssued={setIssued} />}
    </>
  );
}

export function Settings() {
  const session = useRequiredSession();
  const connectors = useConnectors();
  const canEdit = session.role === 'owner';
  const data = connectors.data;
  const find = <T,>(key: 'email' | 'whatsapp' | 'assistant') => (data?.connectors.find((connector) => connector.key === key)?.settings ?? null) as T | null;
  return (
    <>
      <ModuleTitle number="15" title="Settings">
        Connectors: email, WhatsApp, and the assistant that acts on your behalf.
      </ModuleTitle>
      <SettingsTabs active="connectors" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {connectors.isPending ? (
          <p className="text-ink-muted">Loading connectors</p>
        ) : connectors.error ? (
          <p className="text-critical">Connectors could not be loaded. {connectors.error.message}</p>
        ) : (
          <>
            <EmailConnector key={JSON.stringify(find('email'))} settings={find<EmailSettings>('email')} secrets={data?.connectors.find((connector) => connector.key === 'email')?.secrets ?? CONNECTOR_SECRETS.email.map((name) => ({ name, present: false }))} emulator={data?.emulator ?? false} canEdit={canEdit} />
            <WhatsappConnector key={JSON.stringify(find('whatsapp'))} settings={find<WhatsappSettings>('whatsapp')} canEdit={canEdit} />
            <AssistantConnector settings={find<AssistantSettings>('assistant')} canEdit={canEdit} />
          </>
        )}
      </div>
    </>
  );
}
