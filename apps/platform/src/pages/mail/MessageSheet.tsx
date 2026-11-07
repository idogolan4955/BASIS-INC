import {
  MAIL_ACTION_LABEL,
  MAIL_AUDIENCES,
  MAIL_AUDIENCE_LABEL,
  MAIL_AUDIENCE_READERS,
  MAIL_CATEGORIES,
  MAIL_CATEGORY_KEYS,
  MAIL_LINKABLE_ENTITIES,
  ROLES,
  ROLE_LABELS,
  canReadAudience,
  entityPath,
  isAtLeastAsRestrictive,
  isMailActionKind,
  trimQuoted,
  type MailAudience,
  type MailCategory,
  type Role,
} from '@basis/shared';
import { Button, CheckField, Dialog, EmptyState, LabelHeader, Ledger, Panel, PanelEmpty, SelectField, StatusChip, Td, TextArea, TextField, Th, Tr } from '@basis/ui';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { DOCUMENT_KIND_LABEL } from '../../data/documents';
import { fetchMailAttachment, useActOnMail, useMailMessage, useSortMail, type MailActInput, type MailDetail, type MailLinkView } from '../../data/mail';
import { useCompanies } from '../../data/parties';
import { useStaff } from '../../data/tasks';
import { saveFile } from '../../lib/documents';
import { useLocale, useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ENTITY_LABEL, MailTabs, categoryLabel, mailStateLabel, mailStateTone } from './Mail';

// One message: what it says, what it is about, and what a person does from it.
// Every action runs through the function that does that thing elsewhere in
// the platform, as the person who clicked.

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const fullDate = (iso: string, locale: string) => new Date(iso).toLocaleString(locale === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ACTING: readonly Role[] = ['owner', 'operations', 'purchasing', 'logistics', 'sales', 'marketing'];
const INQUIRY_ROLES: readonly Role[] = ['owner', 'operations', 'sales', 'marketing'];
const SELLING: readonly Role[] = ['owner', 'operations', 'sales'];
const COMPANY_ROLES: readonly Role[] = ['owner', 'operations', 'purchasing', 'sales'];
const FILING: readonly Role[] = ['owner', 'operations', 'purchasing', 'qc', 'logistics', 'sales'];
const SORTING: readonly Role[] = ['owner', 'operations'];

type DialogKind = 'link' | 'task' | 'inquiry' | 'interaction' | 'company' | 'sort' | { file: string };

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
      {error}
    </p>
  ) : null;
}

function ActionDialog({ title, description, open, onClose, onSubmit, busy, children, submitLabel }: { title: string; description?: ReactNode; open: boolean; onClose: () => void; onSubmit: () => void; busy: boolean; children: ReactNode; submitLabel: string }) {
  const t = useT();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="primary" type="submit" form="mail-action" busy={busy} busyLabel={t('Saving')}>{submitLabel}</Button>
        </>
      }
    >
      <form
        id="mail-action"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit();
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {children}
      </form>
    </Dialog>
  );
}

/** A record to act on: a type and its number, or a company from the register. */
function TargetFields({ value, onChange, allowNone = false, defaultLinks }: { value: MailLinkView | null; onChange: (value: MailLinkView | null) => void; allowNone?: boolean; defaultLinks: readonly MailLinkView[] }) {
  const t = useT();
  const companies = useCompanies();
  const type = value?.entityType ?? '';
  const isCompany = type === 'supplier' || type === 'customer';
  return (
    <>
      {defaultLinks.length > 0 && (
        <SelectField
          label={t('A record this mail is about')}
          value={value ? `${value.entityType}|${value.entityId}` : ''}
          onChange={(event) => {
            const [entityType, entityId] = event.target.value.split('|');
            onChange(entityType && entityId ? { entityType, entityId } : allowNone ? null : { entityType: 'purchase_order', entityId: '' });
          }}
          className="sm:col-span-2"
        >
          <option value="">{allowNone ? t('None') : t('Another record')}</option>
          {defaultLinks.map((link) => (
            <option key={`${link.entityType}|${link.entityId}`} value={`${link.entityType}|${link.entityId}`}>
              {t(ENTITY_LABEL[link.entityType] ?? link.entityType)} · {link.entityType === 'supplier' || link.entityType === 'customer' ? (companies.data?.find((company) => company.id === link.entityId)?.name ?? link.entityId) : link.entityId}
            </option>
          ))}
        </SelectField>
      )}
      <SelectField label={t('Record type')} value={type} onChange={(event) => onChange(event.target.value ? { entityType: event.target.value, entityId: '' } : null)}>
        <option value="">{allowNone ? t('None') : t('Choose')}</option>
        {MAIL_LINKABLE_ENTITIES.map((entity) => (
          <option key={entity} value={entity}>{t(ENTITY_LABEL[entity] ?? entity)}</option>
        ))}
      </SelectField>
      {type &&
        (isCompany ? (
          <SelectField label={t('Company')} value={value?.entityId ?? ''} onChange={(event) => onChange({ entityType: type, entityId: event.target.value })} required>
            <option value="">{t('Choose a company')}</option>
            {(companies.data ?? [])
              .filter((company) => (type === 'customer' ? company.roles.includes('customer') : !company.roles.includes('customer') || company.roles.length > 1))
              .map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
          </SelectField>
        ) : (
          <TextField label={t('Number')} value={value?.entityId ?? ''} onChange={(event) => onChange({ entityType: type, entityId: event.target.value.toUpperCase() })} placeholder="PO-26-0001" dir="ltr" required />
        ))}
    </>
  );
}

function useAct(onDone: () => void) {
  const act = useActOnMail();
  const [error, setError] = useState<string | null>(null);
  const run = (input: MailActInput) => {
    setError(null);
    act.mutate(input, { onSuccess: onDone, onError: (failure) => setError(failure.message) });
  };
  return { run, error, busy: act.isPending };
}

function LinkDialog({ message, onClose }: { message: MailDetail; onClose: () => void }) {
  const t = useT();
  const { run, error, busy } = useAct(onClose);
  const [target, setTarget] = useState<MailLinkView | null>(null);
  return (
    <ActionDialog open onClose={onClose} title={t('Link to a record')} description={t('The thread appears on the record’s Mail tab and its timeline.')} submitLabel={t('Link')} busy={busy} onSubmit={() => target?.entityId && run({ kind: 'link_record', messageId: message.id, target })}>
      <TargetFields value={target} onChange={setTarget} defaultLinks={[]} />
      <ErrorLine error={error} />
    </ActionDialog>
  );
}

function TaskDialog({ message, onClose }: { message: MailDetail; onClose: () => void }) {
  const t = useT();
  const staff = useStaff();
  const { run, error, busy } = useAct(onClose);
  const records = message.thread.links.filter((link) => link.entityType !== 'customer' && link.entityType !== 'supplier');
  const [form, setForm] = useState({ title: message.subject.replace(/^(re|fw|fwd|aw|tr):\s*/i, '').slice(0, 200), details: '', dueOn: '', assigneeUid: '' });
  const [target, setTarget] = useState<MailLinkView | null>(records[0] ? { entityType: records[0].entityType, entityId: records[0].entityId } : null);
  // A person who may not read this mail gets the task only on a record they can open.
  const readers = (staff.data ?? []).filter((person) => (ROLES as readonly string[]).includes(person.role));
  return (
    <ActionDialog
      open
      onClose={onClose}
      title={t('Create a task')}
      submitLabel={t('Create task')}
      busy={busy}
      onSubmit={() => run({ kind: 'create_task', messageId: message.id, title: form.title, details: form.details, dueOn: form.dueOn || null, assigneeUid: form.assigneeUid || null, target: target?.entityId ? target : null })}
    >
      <TextField label={t('Task')} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required className="sm:col-span-2" dir="auto" />
      <TextArea label={t('Details')} value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} className="sm:col-span-2" dir="auto" />
      <TextField label={t('Due')} type="date" value={form.dueOn} onChange={(event) => setForm({ ...form, dueOn: event.target.value })} dir="ltr" />
      <SelectField label={t('Assigned to')} value={form.assigneeUid} onChange={(event) => setForm({ ...form, assigneeUid: event.target.value })}>
        <option value="">{t('Nobody yet')}</option>
        {readers.map((person) => (
          <option key={person.uid} value={person.uid}>
            {person.name} · {t(ROLE_LABELS[person.role as Role] ?? person.role)}
            {!canReadAudience(person.role as Role, message.audience) ? ` · ${t('cannot read this mail')}` : ''}
          </option>
        ))}
      </SelectField>
      <TargetFields value={target} onChange={setTarget} allowNone defaultLinks={records} />
      <ErrorLine error={error} />
    </ActionDialog>
  );
}

function InquiryDialog({ message, onClose }: { message: MailDetail; onClose: () => void }) {
  const t = useT();
  const { run, error, busy } = useAct(onClose);
  const [form, setForm] = useState({ inquiryKind: 'contact' as 'sample_request' | 'wholesale' | 'contact', name: message.fromName || message.fromAddress, company: message.companyName, country: '' });
  return (
    <ActionDialog
      open
      onClose={onClose}
      title={t('Open an inquiry')}
      description={t('The sender joins the inquiries queue with the website’s, and the message opens to the commercial roles.')}
      submitLabel={t('Open inquiry')}
      busy={busy}
      onSubmit={() => run({ kind: 'create_inquiry', messageId: message.id, ...form })}
    >
      <SelectField label={t('Kind')} value={form.inquiryKind} onChange={(event) => setForm({ ...form, inquiryKind: event.target.value as typeof form.inquiryKind })}>
        <option value="sample_request">{t('Sample request')}</option>
        <option value="wholesale">{t('Wholesale application')}</option>
        <option value="contact">{t('Message')}</option>
      </SelectField>
      <TextField label={t('Name')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required dir="auto" />
      <TextField label={t('Company')} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} dir="auto" />
      <TextField label={t('Country')} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
      <ErrorLine error={error} />
    </ActionDialog>
  );
}

function InteractionDialog({ message, onClose }: { message: MailDetail; onClose: () => void }) {
  const t = useT();
  const { run, error, busy } = useAct(onClose);
  const [form, setForm] = useState({ summary: `${message.subject}`.slice(0, 400), nextStep: '', nextOn: '', taskForNextStep: false });
  if (!message.companyId) return null;
  return (
    <ActionDialog
      open
      onClose={onClose}
      title={t('Log on the customer')}
      description={t('An email interaction on {name}’s Relationship tab.', { name: message.companyName })}
      submitLabel={t('Log interaction')}
      busy={busy}
      onSubmit={() => run({ kind: 'log_interaction', messageId: message.id, customerId: message.companyId!, summary: form.summary, nextStep: form.nextStep, nextOn: form.nextOn || null, taskForNextStep: form.taskForNextStep })}
    >
      <TextArea label={t('Summary')} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} required className="sm:col-span-2" dir="auto" />
      <TextField label={t('Next step')} value={form.nextStep} onChange={(event) => setForm({ ...form, nextStep: event.target.value })} dir="auto" />
      <TextField label={t('By')} type="date" value={form.nextOn} onChange={(event) => setForm({ ...form, nextOn: event.target.value })} dir="ltr" />
      <CheckField label={t('Make the next step my task')} checked={form.taskForNextStep} onChange={(event) => setForm({ ...form, taskForNextStep: event.target.checked })} className="sm:col-span-2" />
      <ErrorLine error={error} />
    </ActionDialog>
  );
}

function FileDialog({ message, attachmentId, onClose }: { message: MailDetail; attachmentId: string; onClose: () => void }) {
  const t = useT();
  const { run, error, busy } = useAct(onClose);
  const attachment = message.attachments.find((entry) => entry.id === attachmentId);
  const records = message.thread.links.filter((link) => link.entityType !== 'customer' && link.entityType !== 'supplier');
  const guess = /\b(bl|b\/l|bill of lading)\b/i.test(attachment?.filename ?? '') ? 'bill_of_lading' : /invoice|\bci\b/i.test(attachment?.filename ?? '') ? 'commercial_invoice' : /packing/i.test(attachment?.filename ?? '') ? 'packing_list' : /quot|offer|price/i.test(attachment?.filename ?? '') ? 'quotation' : /\.(jpe?g|png|heic|webp)$/i.test(attachment?.filename ?? '') ? 'photo' : 'other';
  const [form, setForm] = useState({ documentKind: guess, title: (attachment?.filename ?? '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 200) });
  const [target, setTarget] = useState<MailLinkView | null>(records[0] ? { entityType: records[0].entityType, entityId: records[0].entityId } : null);
  if (!attachment) return null;
  return (
    <ActionDialog
      open
      onClose={onClose}
      title={t('File the attachment')}
      description={<span className="code" dir="ltr">{attachment.filename}</span>}
      submitLabel={t('File')}
      busy={busy}
      onSubmit={() => target?.entityId && run({ kind: 'file_attachment', messageId: message.id, attachmentId, documentKind: form.documentKind, title: form.title, target })}
    >
      <SelectField label={t('Kind')} value={form.documentKind} onChange={(event) => setForm({ ...form, documentKind: event.target.value })}>
        {Object.entries(DOCUMENT_KIND_LABEL).map(([kind, label]) => (
          <option key={kind} value={kind}>{t(label)}</option>
        ))}
      </SelectField>
      <TextField label={t('Title')} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required dir="auto" />
      <TargetFields value={target} onChange={setTarget} defaultLinks={records} />
      <ErrorLine error={error} />
    </ActionDialog>
  );
}

function CompanyDialog({ message, onClose }: { message: MailDetail; onClose: () => void }) {
  const t = useT();
  const { run, error, busy } = useAct(onClose);
  const domain = message.fromAddress.split('@')[1] ?? '';
  const [form, setForm] = useState({ legalName: '', role: 'supplier', contactName: message.fromName || message.fromAddress.split('@')[0] || '', countryCode: '' });
  return (
    <ActionDialog
      open
      onClose={onClose}
      title={t('Add the sender as a company')}
      description={t('Every message from {address} then belongs to the company, and its role decides who reads that mail.', { address: message.fromAddress })}
      submitLabel={t('Add company')}
      busy={busy}
      onSubmit={() => run({ kind: 'create_company', messageId: message.id, legalName: form.legalName, role: form.role, contactName: form.contactName, countryCode: form.countryCode.trim().toUpperCase() || null })}
    >
      <TextField label={t('Company name')} value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} placeholder={domain} required dir="auto" />
      <SelectField label={t('Role')} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
        <option value="supplier">{t('Supplier')}</option>
        <option value="odm">{t('ODM partner')}</option>
        <option value="customer">{t('Customer')}</option>
        <option value="freight_forwarder">{t('Freight forwarder')}</option>
        <option value="customs_broker">{t('Customs broker')}</option>
        <option value="carrier">{t('Carrier')}</option>
        <option value="inspection_agency">{t('Inspection agency')}</option>
      </SelectField>
      <TextField label={t('Contact')} value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} required dir="auto" />
      <TextField label={t('Country code')} value={form.countryCode} onChange={(event) => setForm({ ...form, countryCode: event.target.value })} maxLength={2} placeholder="CN" dir="ltr" />
      <ErrorLine error={error} />
    </ActionDialog>
  );
}

function SortDialog({ message, role, onClose }: { message: MailDetail; role: Role; onClose: () => void }) {
  const t = useT();
  const sortMail = useSortMail();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ category: (message.category in MAIL_CATEGORIES ? message.category : 'other') as MailCategory, audience: message.audience, ownerRole: (message.ownerRole ?? '') as Role | '' });
  // Anyone but the owner may only narrow who reads a message.
  const audiences = MAIL_AUDIENCES.filter((audience) => role === 'owner' || (isAtLeastAsRestrictive(audience, message.audience) && canReadAudience(role, audience)));
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('Sort this message')}
      description={t('Recorded as your decision; the facts that sorted it stay in its history.')}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="primary" type="submit" form="mail-sort" busy={sortMail.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </>
      }
    >
      <form
        id="mail-sort"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          sortMail.mutate({ messageId: message.id, category: form.category, audience: form.audience, ownerRole: form.ownerRole || null }, { onSuccess: onClose, onError: (failure) => setError(failure.message) });
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <SelectField label={t('Category')} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as MailCategory })}>
          {MAIL_CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>{t(MAIL_CATEGORIES[key].label)}</option>
          ))}
        </SelectField>
        <SelectField label={t('Department')} value={form.ownerRole} onChange={(event) => setForm({ ...form, ownerRole: event.target.value as Role | '' })}>
          <option value="">{t('As the category says')}</option>
          {ROLES.filter((entry) => entry !== 'viewer').map((entry) => (
            <option key={entry} value={entry}>{t(ROLE_LABELS[entry])}</option>
          ))}
        </SelectField>
        <SelectField label={t('Who may read it')} value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as MailAudience })} className="sm:col-span-2" help={MAIL_AUDIENCE_READERS[form.audience].map((reader) => t(ROLE_LABELS[reader])).join(', ')}>
          {audiences.map((audience) => (
            <option key={audience} value={audience}>{t(MAIL_AUDIENCE_LABEL[audience])}</option>
          ))}
        </SelectField>
        <ErrorLine error={error} />
      </form>
    </Dialog>
  );
}

function Body({ message }: { message: MailDetail }) {
  const t = useT();
  const [full, setFull] = useState(false);
  const fresh = trimQuoted(message.bodyText);
  const hasHistory = fresh.length < message.bodyText.trim().length;
  return (
    <Panel title={t('Message')}>
      <dl className="mb-4 grid gap-1 text-[0.8125rem] text-ink-soft">
        <div className="flex gap-2">
          <dt className="caps w-10 shrink-0 text-ink-muted">{t('To')}</dt>
          <dd className="min-w-0 truncate" dir="ltr">{message.to.map((entry) => entry.name ? `${entry.name} <${entry.address}>` : entry.address).join(', ') || '—'}</dd>
        </div>
        {message.cc.length > 0 && (
          <div className="flex gap-2">
            <dt className="caps w-10 shrink-0 text-ink-muted">{t('Cc')}</dt>
            <dd className="min-w-0 truncate" dir="ltr">{message.cc.map((entry) => entry.address).join(', ')}</dd>
          </div>
        )}
      </dl>
      {message.bodyText ? (
        <div className="max-w-3xl whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed" dir="auto">
          {full ? message.bodyText : fresh}
        </div>
      ) : (
        <p className="text-ink-muted">{message.hasHtml ? t('This message has only a formatted version; open it in Gmail to read it.') : t('The message has no text.')}</p>
      )}
      {hasHistory && (
        <Button size="sm" variant="quiet" className="mt-4" onClick={() => setFull(!full)}>
          {full ? t('Hide the quoted history') : t('Show the quoted history')}
        </Button>
      )}
    </Panel>
  );
}

function Attachments({ message, canFile, onFile }: { message: MailDetail; canFile: boolean; onFile: (id: string) => void }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  if (message.attachments.length === 0) return null;
  const open = async (id: string) => {
    setError(null);
    setOpening(id);
    try {
      const file = await fetchMailAttachment(id);
      saveFile(file.blob, file.filename);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setOpening(null);
    }
  };
  return (
    <Panel title={t('Attachments')} count={message.attachments.length} flush>
      {error && (
        <p role="alert" className="px-5 py-3 text-[0.8125rem] font-medium text-critical">
          {error}
        </p>
      )}
      <Ledger caption={t('Attachments')}>
        <thead>
          <tr>
            <Th>{t('File')}</Th>
            <Th numeric>{t('Size')}</Th>
            <Th>{t('Filed')}</Th>
            <Th>{t('Actions')}</Th>
          </tr>
        </thead>
        <tbody>
          {message.attachments.map((attachment) => (
            <Tr key={attachment.id}>
              <Td className="code" dir="ltr">{attachment.filename}</Td>
              <Td numeric>{size(attachment.sizeBytes)}</Td>
              <Td className="text-ink-soft">{attachment.documentId ? attachment.documentTitle || t('Filed') : '—'}</Td>
              <Td>
                <span className="flex gap-3">
                  <Button size="sm" variant="quiet" busy={opening === attachment.id} busyLabel={t('Opening')} onClick={() => void open(attachment.id)}>{t('Download')}</Button>
                  {canFile && !attachment.documentId && <Button size="sm" variant="quiet" onClick={() => onFile(attachment.id)}>{t('File on a record')}</Button>}
                </span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Ledger>
    </Panel>
  );
}

function Records({ message, companyName, canLink, onLink }: { message: MailDetail; companyName: string; canLink: boolean; onLink: () => void }) {
  const t = useT();
  return (
    <Panel title={t('Records')} count={message.thread.links.length} action={canLink ? <Button size="sm" onClick={onLink}>{t('Link to a record')}</Button> : undefined} flush>
      {message.thread.links.length === 0 ? (
        <PanelEmpty>{t('The message names no record and comes from no known company.')}</PanelEmpty>
      ) : (
        <ul className="divide-y divide-line">
          {message.thread.links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span>
                <span className="text-ink-muted">{t(ENTITY_LABEL[link.entityType] ?? link.entityType)}</span>{' '}
                <Link to={entityPath(link.entityType, link.entityId)} className="font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                  {link.entityType === 'supplier' || link.entityType === 'customer' ? (link.entityId === message.companyId ? companyName : t('Company')) : <span className="code" dir="ltr">{link.entityId}</span>}
                </Link>
              </span>
              <span className="text-[0.8125rem] text-ink-muted">{t(link.basis === 'reference' ? 'Named in the mail' : link.basis === 'sender' ? 'The sender' : link.basis === 'thread' ? 'From the thread' : 'Linked by a person')}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Sorting({ message, canSort, onSort }: { message: MailDetail; canSort: boolean; onSort: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const BASIS: Record<string, string> = { rule: 'By your rule', thread: 'As its thread', noise: 'A newsletter or automatic message', sender: 'By the sender’s company', reference: 'By the records it names', none: 'Nothing known: kept for the owner' };
  return (
    <Panel title={t('Sorting')} action={canSort ? <Button size="sm" onClick={onSort}>{t('Change')}</Button> : undefined} flush>
      <ul className="divide-y divide-line">
        {message.classifications.map((entry) => (
          <li key={entry.id} className="px-5 py-3 text-sm">
            <p>
              <span className="font-medium">{t(categoryLabel(entry.category))}</span>
              <span className="text-ink-muted"> · {t('read by')} {t(MAIL_AUDIENCE_LABEL[entry.audience])}{entry.ownerRole ? ` · ${t(ROLE_LABELS[entry.ownerRole])}` : ''}</span>
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
              {entry.method === 'person' ? t('Sorted by a person') : entry.method === 'model' ? t('Sorted by the classifier') : t(BASIS[entry.basis] ?? 'By the facts')} · <span className="code">{fullDate(entry.createdAt, locale)}</span>
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Thread({ message }: { message: MailDetail }) {
  const t = useT();
  const { locale } = useLocale();
  if (message.thread.messages.length < 2) return null;
  return (
    <Panel title={t('Thread')} count={message.thread.messages.length} flush>
      <ol className="divide-y divide-line">
        {message.thread.messages.map((entry) => (
          <li key={entry.id} className={entry.id === message.id ? 'bg-bone' : undefined}>
            <Link to={`/mail/${entry.id}`} className="block px-5 py-3 text-sm hover:bg-bone" aria-current={entry.id === message.id ? 'page' : undefined}>
              <span className="flex items-baseline justify-between gap-4">
                <span className="font-medium">{entry.direction === 'outbound' ? t('BASIS') : entry.fromName || entry.fromAddress}</span>
                <span className="code text-[0.8125rem] text-ink-muted">{fullDate(entry.sentAt, locale)}</span>
              </span>
              <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-muted" dir="auto">{entry.snippet}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function History({ message }: { message: MailDetail }) {
  const t = useT();
  const { locale } = useLocale();
  if (message.actions.length === 0) return null;
  return (
    <Panel title={t('Done from this message')} count={message.actions.length} flush>
      <ul className="divide-y divide-line">
        {message.actions.map((action) => (
          <li key={action.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
            <span>
              {t(isMailActionKind(action.kind) ? MAIL_ACTION_LABEL[action.kind] : action.kind)}
              {action.resultType && action.resultId && (action.resultType === 'inquiry' ? (
                <Link to={entityPath('inquiry', action.resultId)} className="code ms-2 underline decoration-line-strong underline-offset-4" dir="ltr">{action.resultId}</Link>
              ) : action.resultType === 'customer' || action.resultType === 'supplier' ? (
                <Link to={entityPath(action.resultType, action.resultId)} className="ms-2 underline decoration-line-strong underline-offset-4">{t('Open')}</Link>
              ) : null)}
              {action.targetType && action.targetId && action.targetType !== 'customer' && action.targetType !== 'supplier' && (
                <Link to={entityPath(action.targetType, action.targetId)} className="code ms-2 text-ink-soft underline decoration-line-strong underline-offset-4" dir="ltr">{action.targetId}</Link>
              )}
            </span>
            <span className="code text-[0.8125rem] text-ink-muted">{action.decidedAt ? fullDate(action.decidedAt, locale) : ''}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function MessageSheet() {
  const t = useT();
  const { locale } = useLocale();
  const { id = '' } = useParams();
  const session = useRequiredSession();
  const message = useMailMessage(id);
  const act = useActOnMail();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const data = message.data;
  if (message.isPending) return <p className="px-5 py-6 text-ink-muted lg:px-8">{t('Loading the message')}</p>;
  if (!data) {
    return (
      <>
        <MailTabs active="inbox" />
        <div className="px-5 py-6 lg:px-8">
          <EmptyState title={t('No such message')}>{t('It may have been sorted to a department your role does not read.')}</EmptyState>
        </div>
      </>
    );
  }
  const role = session.role;
  const acting = ACTING.includes(role);
  const isCustomer = data.companyRoles.includes('customer');
  const hasInquiry = data.thread.links.some((link) => link.entityType === 'inquiry');
  const simple = (kind: 'mark_done' | 'ignore' | 'reopen') => {
    setError(null);
    act.mutate({ kind, messageId: data.id }, { onError: (failure) => setError(failure.message) });
  };
  const close = () => setDialog(null);
  const done = data.state === 'done' || data.state === 'ignored';
  return (
    <>
      <LabelHeader
        code={data.fromAddress}
        title={data.subject || t('(no subject)')}
        subtitle={
          <>
            {data.direction === 'outbound' ? t('Sent from {mailbox}', { mailbox: data.mailboxAddress }) : data.fromName || data.fromAddress}
            {data.companyName && (
              <>
                {' · '}
                {data.companyId ? (
                  <Link to={entityPath(isCustomer ? 'customer' : 'supplier', data.companyId)} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">{data.companyName}</Link>
                ) : (
                  data.companyName
                )}
              </>
            )}
          </>
        }
        status={<StatusChip tone={mailStateTone(data.state)}>{t(mailStateLabel(data.state))}</StatusChip>}
        facts={[
          { label: t('Received'), value: <span className="code">{fullDate(data.sentAt, locale)}</span> },
          { label: t('Category'), value: t(categoryLabel(data.category)) },
          { label: t('Department'), value: data.ownerRole ? t(ROLE_LABELS[data.ownerRole]) : '—' },
          { label: t('Read by'), value: t(MAIL_AUDIENCE_LABEL[data.audience]) },
          { label: t('Thread'), value: t('{count} messages', { count: data.thread.messageCount }) },
          { label: t('Mailbox'), value: <span className="code" dir="ltr">{data.mailboxProvider === 'import' ? t('Imported file') : data.mailboxAddress}</span> },
        ]}
        actions={
          acting ? (
            done ? (
              <Button onClick={() => simple('reopen')} busy={act.isPending} busyLabel={t('Saving')}>{t('Reopen')}</Button>
            ) : (
              <>
                <Button variant="quiet" onClick={() => simple('ignore')}>{t('Ignore')}</Button>
                <Button variant="primary" onClick={() => simple('mark_done')} busy={act.isPending} busyLabel={t('Saving')}>{t('Done')}</Button>
              </>
            )
          ) : undefined
        }
      />
      <MailTabs active="inbox" />
      {error && (
        <p role="alert" className="px-5 pt-4 text-[0.8125rem] font-medium text-critical lg:px-8">
          {error}
        </p>
      )}
      <div className="grid gap-4 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        <div className="flex min-w-0 flex-col gap-4">
          <Body message={data} />
          <Attachments message={data} canFile={FILING.includes(role)} onFile={(attachmentId) => setDialog({ file: attachmentId })} />
          <Thread message={data} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {acting && (
            <Panel title={t('From this message')}>
              <div className="flex flex-col items-start gap-2">
                <Button onClick={() => setDialog('task')}>{t('Create a task')}</Button>
                {INQUIRY_ROLES.includes(role) && !hasInquiry && !data.companyId && <Button onClick={() => setDialog('inquiry')}>{t('Open an inquiry')}</Button>}
                {SELLING.includes(role) && isCustomer && <Button onClick={() => setDialog('interaction')}>{t('Log on the customer')}</Button>}
                {COMPANY_ROLES.includes(role) && !data.companyId && data.direction === 'inbound' && <Button onClick={() => setDialog('company')}>{t('Add the sender as a company')}</Button>}
              </div>
            </Panel>
          )}
          <Records message={data} companyName={data.companyName} canLink={acting} onLink={() => setDialog('link')} />
          <Sorting message={data} canSort={SORTING.includes(role)} onSort={() => setDialog('sort')} />
          <History message={data} />
        </div>
      </div>
      {dialog === 'link' && <LinkDialog message={data} onClose={close} />}
      {dialog === 'task' && <TaskDialog message={data} onClose={close} />}
      {dialog === 'inquiry' && <InquiryDialog message={data} onClose={close} />}
      {dialog === 'interaction' && <InteractionDialog message={data} onClose={close} />}
      {dialog === 'company' && <CompanyDialog message={data} onClose={close} />}
      {dialog === 'sort' && <SortDialog message={data} role={role} onClose={close} />}
      {dialog && typeof dialog === 'object' && <FileDialog message={data} attachmentId={dialog.file} onClose={close} />}
    </>
  );
}
