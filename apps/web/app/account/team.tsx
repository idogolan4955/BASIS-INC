import { CUSTOMER_ROLE_LABEL, CUSTOMER_ROLE_SUMMARY, CUSTOMER_USER_ROLES, customerCan, invitationLink, type CustomerUserRole } from '@basis/shared';
import { useState, type FormEvent } from 'react';
import { call, read, useRead } from './data';
import { Button, Cell, Chip, Failed, Ledger, Loading, PageTitle, Row, portalMeta } from './frame';
import { Alert, Choice, Field } from './fields';
import { date } from './format';
import { useLocale, useT } from './i18n';
import { useMe } from './session';

export const meta = () => portalMeta('Team');

export default function Team() {
  const t = useT();
  const { locale } = useLocale();
  const { me, role } = useMe();
  const admin = customerCan(role, 'manage_team');
  const loaded = useRead(async () => {
    const [team, invitations] = await Promise.all([read((sdk, dc) => sdk.customerTeamRef(dc)), admin ? read((sdk, dc) => sdk.customerInvitationsRef(dc)) : Promise.resolve({ customerInvitations: [] })]);
    return { users: team.customerUsers, invitations: invitations.customerInvitations };
  }, [me.uid, admin]);
  const [inviting, setInviting] = useState(false);
  const [newRole, setNewRole] = useState<CustomerUserRole>('buyer');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const act = async (key: string, run: () => Promise<unknown>) => {
    setError('');
    setBusy(key);
    try {
      await run();
      loaded.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('That could not be done.'));
    } finally {
      setBusy('');
    }
  };

  const invite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void act('invite', async () => {
      const result = await call<object, { token: string }>('inviteCustomerUser', { email: String(form.get('email') ?? '').trim(), name: String(form.get('name') ?? '').trim() || undefined, role: newRole });
      setLink(invitationLink(window.location.origin, result.token));
      setCopied(false);
      setInviting(false);
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <PageTitle
        title={t('Team')}
        action={
          admin && !inviting ? (
            <Button onClick={() => { setInviting(true); setLink(''); }}>{t('Invite a colleague')}</Button>
          ) : undefined
        }
      >
        {t('Who from your company uses this account, and what each may do.')}
      </PageTitle>

      {link && (
        <div role="status" className="mb-8 grid gap-3 border border-charcoal/70 bg-milk p-5">
          <p className="code uppercase tracking-[0.18em]">{t('The invitation link')}</p>
          <p className="text-sm text-ink-soft">{t('Send it to your colleague yourself. It works once, for 14 days, and is shown only now.')}</p>
          <p className="code break-all border border-line bg-bone px-3 py-2 text-sm" dir="ltr">
            {link}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void copy()}>
              {copied ? t('Copied') : t('Copy the link')}
            </Button>
            <a href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center border border-charcoal px-6 font-medium hover:bg-sand/60">
              {t('Send on WhatsApp')}
            </a>
          </div>
        </div>
      )}

      {inviting && (
        <form onSubmit={invite} className="mb-10 grid gap-5 border border-charcoal/70 bg-milk p-5 md:grid-cols-2">
          <Field label={t('Email')} name="email" type="email" required autoComplete="off" dir="ltr" />
          <Field label={t('Name')} name="name" />
          <div className="md:col-span-2">
            <Choice label={t('Role')} name="role" value={newRole} onChange={(value) => setNewRole(value as CustomerUserRole)}>
              {CUSTOMER_USER_ROLES.map((option) => (
                <option key={option} value={option}>
                  {t(CUSTOMER_ROLE_LABEL[option])}
                </option>
              ))}
            </Choice>
            <p className="mt-1.5 text-sm text-ink-muted">{t(CUSTOMER_ROLE_SUMMARY[newRole])}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <Button type="submit" busy={busy === 'invite'}>
              {t('Create the invitation')}
            </Button>
            <Button variant="quiet" onClick={() => setInviting(false)}>
              {t('Cancel')}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-6">
          <Alert>{error}</Alert>
        </div>
      )}

      {loaded.loading && !loaded.data ? (
        <Loading />
      ) : loaded.error ? (
        <Failed message={loaded.error} onRetry={loaded.reload} />
      ) : (
        <>
          <Ledger head={[t('Name'), t('Email'), t('Role'), t('Last signed in'), admin ? '' : t('Standing')]}>
            {loaded.data!.users.map((user) => (
              <Row key={user.uid}>
                <Cell>
                  {user.name}
                  {user.uid === me.uid && <span className="ms-2 text-sm text-ink-muted">({t('you')})</span>}
                </Cell>
                <Cell code>{user.email}</Cell>
                <Cell>
                  {admin && user.uid !== me.uid ? (
                    <select
                      aria-label={t('Role of {name}', { name: user.name })}
                      value={user.role}
                      disabled={Boolean(busy)}
                      onChange={(event) => void act(`role-${user.uid}`, () => call('setCustomerUser', { uid: user.uid, role: event.target.value }))}
                      className="h-10 border border-charcoal/40 bg-milk px-2"
                    >
                      {CUSTOMER_USER_ROLES.map((option) => (
                        <option key={option} value={option}>
                          {t(CUSTOMER_ROLE_LABEL[option])}
                        </option>
                      ))}
                    </select>
                  ) : (
                    t(CUSTOMER_ROLE_LABEL[user.role as unknown as CustomerUserRole])
                  )}
                </Cell>
                <Cell>{user.lastSignInAt ? date(user.lastSignInAt, locale) : '—'}</Cell>
                <Cell>
                  {admin && user.uid !== me.uid ? (
                    <button type="button" disabled={Boolean(busy)} onClick={() => void act(`status-${user.uid}`, () => call('setCustomerUser', { uid: user.uid, status: user.status === 'suspended' ? 'active' : 'suspended' }))} className="text-sm underline underline-offset-4 disabled:opacity-60">
                      {user.status === 'suspended' ? t('Restore') : t('Suspend')}
                    </button>
                  ) : (
                    <Chip tone={user.status === 'active' ? 'positive' : 'neutral'}>{user.status === 'active' ? t('Active') : t('Suspended')}</Chip>
                  )}
                </Cell>
              </Row>
            ))}
          </Ledger>
          {admin && loaded.data!.invitations.length > 0 && (
            <div className="mt-10">
              <p className="code mb-3 uppercase tracking-[0.14em] text-ink-muted">{t('Invitations not yet accepted')}</p>
              <Ledger head={[t('Email'), t('Role'), t('Expires'), '']}>
                {loaded.data!.invitations.map((invitation) => {
                  const expired = new Date(invitation.expiresAt).getTime() < Date.now();
                  return (
                    <Row key={invitation.id}>
                      <Cell code>{invitation.email}</Cell>
                      <Cell>{t(CUSTOMER_ROLE_LABEL[invitation.role as unknown as CustomerUserRole])}</Cell>
                      <Cell>{expired ? <Chip tone="neutral">{t('Expired')}</Chip> : date(invitation.expiresAt, locale)}</Cell>
                      <Cell>
                        <button type="button" disabled={Boolean(busy)} onClick={() => void act(`revoke-${invitation.id}`, () => call('revokeCustomerInvitation', { invitationId: invitation.id }))} className="text-sm underline underline-offset-4 disabled:opacity-60">
                          {t('Withdraw')}
                        </button>
                      </Cell>
                    </Row>
                  );
                })}
              </Ledger>
            </div>
          )}
        </>
      )}
    </div>
  );
}
