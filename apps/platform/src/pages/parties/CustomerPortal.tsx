import {
  CUSTOMER_ROLE_LABEL,
  CUSTOMER_ROLE_SUMMARY,
  CUSTOMER_USER_ROLES,
  INVITATION_DAYS,
  PORTAL_ORIGIN,
  PORTAL_STAFF_ROLES,
  formatLocalDate,
  invitationLink,
  invitationState,
  todayIn,
  type CompanyDetail,
  type CustomerUserRole,
  type InvitationState,
  type StatusTone,
} from '@basis/shared';
import { Button, Dialog, Ledger, Panel, SelectField, StatusChip, Td, TextField, Th, Tr } from '@basis/ui';
import { Check, Copy, Plus } from '@phosphor-icons/react';
import { useEffect, useState, type FormEvent } from 'react';
import { useCustomerAccess, useInviteCustomerUser, useRevokeCustomerInvitation, useSetCustomerUser, type InviteResult, type PortalInvitationView, type PortalUserStatus, type PortalUserView } from '../../data/portal';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';

// A customer's portal, as staff see it (docs/CUSTOMER_PORTAL_PLAN.md §4):
// the account its people sign in to, who they are and in which role, and
// the invitations still open. Owner, operations and sales invite, change
// roles and suspend; marketing and finance read.

const USER_TONE: Record<PortalUserStatus, StatusTone> = { active: 'positive', invited: 'transit', suspended: 'neutral' };
const USER_LABEL: Record<PortalUserStatus, string> = { active: 'Active', invited: 'Invited', suspended: 'Suspended' };
const ACCOUNT_TONE: Record<'active' | 'suspended' | 'closed', StatusTone> = { active: 'positive', suspended: 'caution', closed: 'neutral' };
const ACCOUNT_LABEL: Record<'active' | 'suspended' | 'closed', string> = { active: 'Active', suspended: 'Suspended', closed: 'Closed' };
const INVITATION_TONE: Record<InvitationState, StatusTone> = { open: 'transit', expired: 'caution', accepted: 'positive', revoked: 'neutral' };
const INVITATION_LABEL: Record<InvitationState, string> = { open: 'Waiting', expired: 'Expired', accepted: 'Accepted', revoked: 'Withdrawn' };

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
/** A timestamp as the calendar day it fell on here, in the one date format. */
const day = (iso: string) => formatLocalDate(todayIn(zone(), new Date(iso)));
/** Invitation links point at the site; in development, at the local site. */
const portalOrigin = () => (import.meta.env.DEV ? 'http://localhost:5174' : PORTAL_ORIGIN);

// ---------------------------------------------------------------- inviting

interface InviteDefaults {
  readonly email: string;
  readonly name: string;
  readonly role: CustomerUserRole;
}

function InviteDialog({ company, open, onClose, defaults }: { company: CompanyDetail; open: boolean; onClose: () => void; defaults: InviteDefaults }) {
  const t = useT();
  const invite = useInviteCustomerUser();
  const [form, setForm] = useState({ contactId: '', email: defaults.email, name: defaults.name, role: defaults.role });
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<(InviteResult & { to: string }) | null>(null);
  const [copied, setCopied] = useState(false);
  const withEmail = company.contacts.filter((contact) => contact.status === 'active' && contact.email);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSent(null);
    setCopied(false);
    setForm({ contactId: '', email: defaults.email, name: defaults.name, role: defaults.role });
  }, [open, defaults]);

  const pickContact = (contactId: string) => {
    const contact = withEmail.find((item) => item.id === contactId);
    setForm((current) => {
      if (contact) return { ...current, contactId, email: contact.email, name: contact.name };
      // Back to someone else: what the previous contact filled in goes with them.
      const previous = withEmail.find((item) => item.id === current.contactId);
      return { ...current, contactId, email: previous && current.email === previous.email ? '' : current.email, name: previous && current.name === previous.name ? '' : current.name };
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.email.trim()) return setError(t('Write the email address the person will sign in with.'));
    try {
      const result = await invite.mutateAsync({ companyId: company.id, email: form.email.trim(), role: form.role, ...(form.name.trim() ? { name: form.name.trim() } : {}), ...(form.contactId ? { contactId: form.contactId } : {}) });
      setSent({ ...result, to: form.name.trim() || form.email.trim().toLowerCase() });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The invitation could not be made.'));
    }
  };

  if (sent) {
    const link = invitationLink(portalOrigin(), sent.token);
    const message = `${company.name}: your BASIS INC. account is ready. Open this link to set your password: ${link}`;
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <Dialog open={open} onClose={onClose} title={t('Invitation ready')} description={t('Send this link to {name}. It works once, for {days} days, and it is shown only now.').replace('{name}', sent.to).replace('{days}', String(INVITATION_DAYS))}>
        <div className="grid gap-4">
          <p className="code break-all rounded-xs border border-line-strong bg-milk px-3 py-2.5 text-[0.8125rem]" dir="ltr">
            {link}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy}>
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              {copied ? t('Copied') : t('Copy link')}
            </Button>
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center border border-line-strong bg-panel px-4 text-sm text-ink hover:border-charcoal">
              {t('Share on WhatsApp')}
            </a>
          </div>
          <p className="text-[0.8125rem] text-ink-muted">
            {t('BASIS does not email invitations yet: no mail provider is connected. Send the link yourself. If it is lost, invite the person again; the new link replaces this one.')}
          </p>
          <p className="text-[0.8125rem] text-ink-soft">
            {t('Member number')} <span className="code ms-1" dir="ltr">{sent.memberNumber}</span>
          </p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={onClose}>
              {t('Close')}
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('Invite to the portal')} description={t('The person gets a one-time link to set a password and sign in to {company} on the BASIS site.').replace('{company}', company.name)}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {withEmail.length > 0 && (
          <SelectField label={t('Contact')} value={form.contactId} onChange={(event) => pickContact(event.target.value)} className="sm:col-span-2">
            <option value="">{t('Someone else')}</option>
            {withEmail.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
                {contact.title ? ` · ${contact.title}` : ''}
              </option>
            ))}
          </SelectField>
        )}
        <TextField label={t('Email')} type="email" required autoComplete="off" dir="ltr" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        <TextField label={t('Name')} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <SelectField label={t('Role in the account')} value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as CustomerUserRole }))} help={t(CUSTOMER_ROLE_SUMMARY[form.role])} className="sm:col-span-2">
          {CUSTOMER_USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {t(CUSTOMER_ROLE_LABEL[role])}
            </option>
          ))}
        </SelectField>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={invite.isPending} busyLabel={t('Inviting')}>
            {t('Make the link')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- suspending

function SuspendDialog({ user, onClose }: { user: PortalUserView | null; onClose: () => void }) {
  const t = useT();
  const setUser = useSetCustomerUser();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(null), [user]);
  const confirm = async () => {
    if (!user) return;
    setError(null);
    try {
      await setUser.mutateAsync({ uid: user.uid, status: 'suspended' });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The change could not be saved.'));
    }
  };
  return (
    <Dialog open={user !== null} onClose={onClose} title={user ? t('Suspend {name}?').replace('{name}', user.name) : ''} description={t('They are signed out at once and cannot sign in until restored. Nothing in the account changes, and they can be restored here at any time.')}>
      {error && (
        <p role="alert" className="mb-4 text-[0.8125rem] font-medium text-critical">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button variant="destructive" onClick={confirm} busy={setUser.isPending} busyLabel={t('Saving')}>
          {t('Suspend')}
        </Button>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- the tab

export function CustomerPortal({ company }: { company: CompanyDetail }) {
  const t = useT();
  const session = useRequiredSession();
  const manage = (PORTAL_STAFF_ROLES as readonly string[]).includes(session.role);
  const access = useCustomerAccess(company.id);
  const setUser = useSetCustomerUser();
  const revoke = useRevokeCustomerInvitation();
  const [inviting, setInviting] = useState<InviteDefaults | null>(null);
  const [suspending, setSuspending] = useState<PortalUserView | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (access.isPending) return <p className="text-ink-muted">{t('Loading the portal account')}</p>;
  if (access.error) return <p className="text-critical">{t('The portal account could not be loaded.')} {access.error.message}</p>;
  const account = access.data;
  const hasAdmin = account?.users.some((user) => user.role === 'admin' && user.status === 'active') ?? false;
  const firstInvite: InviteDefaults = { email: '', name: '', role: hasAdmin ? 'buyer' : 'admin' };

  const change = async (run: () => Promise<unknown>) => {
    setError(null);
    try {
      await run();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The change could not be saved.'));
    }
  };

  const dialogs = (
    <>
      {manage && <InviteDialog company={company} open={inviting !== null} onClose={() => setInviting(null)} defaults={inviting ?? firstInvite} />}
      {manage && <SuspendDialog user={suspending} onClose={() => setSuspending(null)} />}
    </>
  );

  if (!account) {
    return (
      <>
        <Panel title={t('Portal')}>
          <div className="max-w-2xl">
            <p className="font-medium">{t('{company} has no portal account yet.').replace('{company}', company.name)}</p>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">
              {t('The portal gives the customer’s people their quotes to accept or decline, their orders, shipments, invoices and documents, and sample requests, on the BASIS site under /account. They see only their own records, never costs or suppliers.')}
            </p>
            {manage ? (
              <>
                <p className="mt-2 text-[0.9375rem] text-ink-soft">{t('Inviting the first person opens the account and gives it a member number.')}</p>
                <div className="mt-5">
                  <Button variant="primary" onClick={() => setInviting(firstInvite)}>
                    <Plus size={14} aria-hidden="true" />
                    {t('Invite to the portal')}
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[0.8125rem] text-ink-muted">{t('Owner, operations and sales invite customers to the portal.')}</p>
            )}
          </div>
        </Panel>
        {dialogs}
      </>
    );
  }

  const people = account.users;
  const pending = account.invitations.filter((invitation) => {
    const state = invitationState(invitation);
    return state === 'open' || state === 'expired';
  });
  const active = people.filter((user) => user.status === 'active').length;
  const busyUser = setUser.isPending ? setUser.variables?.uid : undefined;
  const busyInvitation = revoke.isPending ? revoke.variables : undefined;

  // The dialogs keep the same place in the tree whether or not the account exists yet: the first
  // invitation opens the account, and the link it returns must survive that re-render, as it is shown only once.
  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel title={t('Portal account')} className="xl:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="caps text-ink-muted">{t('Member number')}</dt>
              <dd className="code mt-1 text-[0.9375rem]" dir="ltr">
                {account.memberNumber}
              </dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Status')}</dt>
              <dd className="mt-1">
                <StatusChip tone={ACCOUNT_TONE[account.status]}>{t(ACCOUNT_LABEL[account.status])}</StatusChip>
              </dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Currency')}</dt>
              <dd className="code mt-1">{account.currency}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Opened')}</dt>
              <dd className="code mt-1">{day(account.createdAt)}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('People')}</dt>
              <dd className="mt-1 text-sm">
                <span className="tabular">{active}</span> {t('active')}
                {people.length > active && (
                  <span className="text-ink-muted">
                    {' '}
                    · <span className="tabular">{people.length - active}</span> {t('suspended')}
                  </span>
                )}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="caps text-ink-muted">{t('Where they sign in')}</dt>
              <dd className="mt-1 text-sm">
                <a href={`${PORTAL_ORIGIN}/account`} target="_blank" rel="noreferrer" className="code underline decoration-line-strong underline-offset-4" dir="ltr">
                  {PORTAL_ORIGIN.replace(/^https:\/\//, '')}/account
                </a>
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel
          title={t('People')}
          count={people.length}
          className="xl:col-span-8"
          flush
          action={
            manage && (
              <Button size="sm" onClick={() => setInviting(firstInvite)}>
                <Plus size={14} aria-hidden="true" />
                {t('Invite')}
              </Button>
            )
          }
        >
          {people.length === 0 ? (
            <p className="px-5 py-6 text-ink-muted">{t('Nobody has accepted an invitation yet.')}</p>
          ) : (
            <Ledger caption={t('People with access to the portal')}>
              <thead>
                <tr>
                  <Th>{t('Name')}</Th>
                  <Th>{t('Email')}</Th>
                  <Th>{t('Role')}</Th>
                  <Th>{t('Status')}</Th>
                  <Th>{t('Last sign-in')}</Th>
                  {manage && <Th aria-label={t('Actions')} />}
                </tr>
              </thead>
              <tbody>
                {people.map((user) => (
                  <Tr key={user.uid}>
                    <Td className="whitespace-nowrap font-medium">
                      {user.name}
                      {user.contactName && user.contactName !== user.name && <span className="block text-[0.75rem] font-normal text-ink-muted">{user.contactName}</span>}
                    </Td>
                    <Td>
                      <a href={`mailto:${user.email}`} className="underline decoration-line-strong underline-offset-4" dir="ltr">
                        {user.email}
                      </a>
                    </Td>
                    <Td>
                      {manage ? (
                        <select
                          aria-label={t('Role of {name}').replace('{name}', user.name)}
                          value={user.role}
                          disabled={busyUser === user.uid}
                          onChange={(event) => change(() => setUser.mutateAsync({ uid: user.uid, role: event.target.value as CustomerUserRole }))}
                          className="h-8 rounded-xs border border-line-strong bg-milk px-2 text-[0.8125rem] text-ink focus-visible:border-charcoal focus-visible:outline-none"
                        >
                          {CUSTOMER_USER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {t(CUSTOMER_ROLE_LABEL[role])}
                            </option>
                          ))}
                        </select>
                      ) : (
                        t(CUSTOMER_ROLE_LABEL[user.role])
                      )}
                    </Td>
                    <Td>
                      <StatusChip tone={USER_TONE[user.status]}>{t(USER_LABEL[user.status])}</StatusChip>
                    </Td>
                    <Td className="code text-ink-soft">{user.lastSignInAt ? day(user.lastSignInAt) : <span className="text-ink-muted">{t('Never')}</span>}</Td>
                    {manage && (
                      <Td className="text-end">
                        {user.status === 'suspended' ? (
                          <Button size="sm" onClick={() => change(() => setUser.mutateAsync({ uid: user.uid, status: 'active' }))} busy={busyUser === user.uid} busyLabel={t('Saving')}>
                            {t('Restore')}
                          </Button>
                        ) : (
                          <Button size="sm" variant="quiet" onClick={() => setSuspending(user)}>
                            {t('Suspend')}
                          </Button>
                        )}
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
          {error && (
            <p role="alert" className="border-t border-line px-5 py-3 text-[0.8125rem] font-medium text-critical">
              {error}
            </p>
          )}
        </Panel>

        <Panel title={t('Invitations not accepted')} count={pending.length} className="xl:col-span-12" flush>
          {pending.length === 0 ? (
            <p className="px-5 py-6 text-ink-muted">{t('No invitation is waiting.')}</p>
          ) : (
            <Ledger caption={t('Invitations not accepted')}>
              <thead>
                <tr>
                  <Th>{t('Email')}</Th>
                  <Th>{t('Name')}</Th>
                  <Th>{t('Role')}</Th>
                  <Th>{t('State')}</Th>
                  <Th>{t('Sent')}</Th>
                  <Th>{t('Expires')}</Th>
                  {manage && <Th aria-label={t('Actions')} />}
                </tr>
              </thead>
              <tbody>
                {pending.map((invitation: PortalInvitationView) => {
                  const state = invitationState(invitation);
                  return (
                    <Tr key={invitation.id}>
                      <Td className="font-medium" dir="ltr">
                        {invitation.email}
                      </Td>
                      <Td className="text-ink-soft">{invitation.name || '—'}</Td>
                      <Td>{t(CUSTOMER_ROLE_LABEL[invitation.role])}</Td>
                      <Td>
                        <StatusChip tone={INVITATION_TONE[state]}>{t(INVITATION_LABEL[state])}</StatusChip>
                      </Td>
                      <Td className="code text-ink-soft">{day(invitation.createdAt)}</Td>
                      <Td className="code text-ink-soft">{day(invitation.expiresAt)}</Td>
                      {manage && (
                        <Td className="text-end">
                          <span className="inline-flex gap-2">
                            <Button size="sm" onClick={() => setInviting({ email: invitation.email, name: invitation.name, role: invitation.role })}>
                              {state === 'expired' ? t('Invite again') : t('New link')}
                            </Button>
                            {state === 'open' && (
                              <Button size="sm" variant="destructive" onClick={() => change(() => revoke.mutateAsync(invitation.id))} busy={busyInvitation === invitation.id} busyLabel={t('Withdrawing')}>
                                {t('Withdraw')}
                              </Button>
                            )}
                          </span>
                        </Td>
                      )}
                    </Tr>
                  );
                })}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {dialogs}
    </>
  );
}
