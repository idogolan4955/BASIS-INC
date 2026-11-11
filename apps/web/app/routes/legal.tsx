import { useParams } from 'react-router';
import { meta as siteMeta } from '../site/shell';
import { Display, Eyebrow, Section } from '../site/ui';
import { NotFound } from './not-found';

interface LegalPage {
  readonly title: string;
  readonly summary: string;
  readonly updated?: string;
  readonly sections: readonly { readonly heading?: string; readonly body: readonly string[] }[];
}

const PAGES: Record<string, LegalPage> = {
  privacy: {
    title: 'Privacy',
    summary: 'What BASIS INC. collects on this site, in the customer account and in the BASIS app, and why.',
    updated: '11 November 2026',
    sections: [
      {
        body: [
          'BASIS INC. supplies foundation fabrics to the trade. This page covers the public site, the customer account under /account, the assistant on the site, and the BASIS app for iPhone, which carries the same account. Nothing is sold, nothing is used for advertising, and nothing tracks you across other companies’ apps or sites.',
        ],
      },
      {
        heading: 'Forms on the site',
        body: [
          'A form collects what you give it: your name, company, contact details, what you make, the fabrics and shades you asked about, and a delivery address for samples. It is used to answer you, to send what you asked for and to open a trade relationship if you want one.',
        ],
      },
      {
        heading: 'Your account and the app',
        body: [
          'A customer account is opened by invitation. Your login holds your name, your email address, your role in your company’s account and when you last signed in. Your password is kept only in hashed form, by Google’s sign-in service (Firebase Authentication).',
          'What you see in the account — quotes, orders, shipments, invoices, documents, sample requests and addresses — is your company’s business record with BASIS. What you do in it (accepting a quote, asking for samples, inviting a colleague) is recorded on that record with your name, as it would be if you had written to us.',
        ],
      },
      {
        heading: 'Notifications in the app',
        body: [
          'If you allow notifications, the app registers your iPhone with Apple’s push service through Google Firebase Cloud Messaging and keeps the resulting token against your login, with the app’s language and version. It is used only to tell you that BASIS has sent you a quote or that a shipment has arrived. Signing out or deleting your login removes it; you can turn notifications off at any time in the iPhone’s Settings.',
        ],
      },
      {
        heading: 'The assistant',
        body: [
          'The assistant on the site and in the app is an AI. Before your first question it asks you to agree that what you write, and the records of your account it reads to answer you, are sent to Anthropic, the company whose model it runs on; Anthropic processes them under its commercial terms and does not use them to train models. What you write and what it answers are kept so that it can follow the conversation and so that a person in sales can pick it up; when you are signed in it reads only your own account’s records. For visitors who are not signed in, the network address is kept only as a one-way hash, to limit use.',
        ],
      },
      {
        heading: 'Who processes it',
        body: [
          'Google Cloud and Firebase host the site, the database, sign-in, our functions and notifications, in the European Union (europe-west1). Anthropic runs the assistant’s model. Apple delivers notifications to iPhones. Carriers deliver samples and an email service carries our replies. Each of them processes the data only to provide its service to BASIS, under terms that protect it at least as well as this page describes. No one else receives your data, and none of it is sold.',
        ],
      },
      {
        heading: 'How long it is kept',
        body: [
          'Your login, until you delete it. Your devices’ notification tokens, until you sign out on that device or delete your login. A signed-in customer’s conversations with the assistant, until the login is deleted; a visitor’s, for 90 days after its last message. Messages sent through the forms, and your company’s quotes, orders, invoices and shipping documents, for as long as the law requires business and tax records to be kept.',
        ],
      },
      {
        heading: 'Deleting your login',
        body: [
          'In the account, open Profile and choose Delete my login, on the site or in the app. It removes your login and its password, your name and email from our list of logins, your conversations with the assistant and your devices’ notification tokens, at once. Your company’s quotes, orders, invoices and documents stay with your company, because they are business and tax records. The last admin of an account that still has other people in it makes a colleague admin first.',
          'You can withdraw what you agreed to at any time: turn notifications off in the iPhone’s Settings, stop using the assistant, and ask us to delete its past conversations. You can also ask what we hold on you, ask for it to be corrected, or ask for it to be deleted, by writing to us through the contact page.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms',
    summary: 'The terms on which BASIS INC. supplies trade customers.',
    sections: [
      {
        body: [
          'BASIS INC. supplies trade customers only. Prices, minimums, lead times and payment terms are agreed on application and confirmed on each order; nothing on this site is an offer.',
          'Fabrics are supplied to a production standard stated on their technical sheet, within the tolerances it gives. Shade is matched to the BASIS physical standard; screens are not a reference.',
          'Samples are supplied for evaluation. Claims about delivered goods are made against the lot and roll identity on the label.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookies',
    summary: 'This site does not set tracking cookies.',
    sections: [
      {
        body: [
          'The public pages set no cookies of their own and load no third-party analytics or advertising scripts. If that changes, this page will say so first.',
          'When you sign in to your account, your browser keeps the sign-in in its own storage, not in a cookie, so that you stay signed in; signing out clears it. The assistant keeps the key to your conversation in the tab’s session storage, which the browser forgets when the tab closes. The BASIS app keeps the same things on the iPhone.',
        ],
      },
    ],
  },
};

export function meta({ params }: { params: { page: string } }) {
  const page = PAGES[params.page];
  return page ? siteMeta(page.title, page.summary, `/legal/${params.page}`) : siteMeta('Not found', '');
}

export default function Legal() {
  const { page: slug = '' } = useParams();
  const page = PAGES[slug];
  if (!page) return <NotFound />;
  return (
    <Section>
      <Eyebrow>Legal</Eyebrow>
      <Display as="h1" className="mt-4 text-[clamp(2.5rem,7vw,6rem)]">
        {page.title}
      </Display>
      {page.updated && <p className="code mt-6 uppercase tracking-[0.14em] text-ink-muted">Updated {page.updated}</p>}
      <div className="mt-8 max-w-2xl space-y-10 text-lg leading-relaxed text-ink-soft">
        {page.sections.map((section, index) => (
          <section key={section.heading ?? index} className="space-y-5">
            {section.heading && (
              <h2 className="code text-[0.8125rem] uppercase tracking-[0.18em] text-ink">
                <span className="me-3 text-ink-muted">{String(index).padStart(2, '0')}</span>
                {section.heading}
              </h2>
            )}
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </Section>
  );
}
