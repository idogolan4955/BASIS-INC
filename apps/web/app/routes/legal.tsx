import { useParams } from 'react-router';
import { meta as siteMeta } from '../site/shell';
import { Display, Eyebrow, Section } from '../site/ui';
import { NotFound } from './not-found';

const PAGES: Record<string, { title: string; summary: string; body: string[] }> = {
  privacy: {
    title: 'Privacy',
    summary: 'What BASIS INC. collects on this site and why.',
    body: [
      'This site collects what you give it in a form: your name, company, contact details, what you make, which fabrics and shades you asked about, and a delivery address for samples. It is used to answer you, to send what you asked for and to open a trade relationship if you want one.',
      'Submissions are stored in our own operating platform. They are not sold or passed to third parties, other than the carriers that deliver samples and the email service that carries our replies.',
      'You can ask what we hold on you, ask for it to be corrected, or ask for it to be deleted, by writing to us through the contact page.',
    ],
  },
  terms: {
    title: 'Terms',
    summary: 'The terms on which BASIS INC. supplies trade customers.',
    body: [
      'BASIS INC. supplies trade customers only. Prices, minimums, lead times and payment terms are agreed on application and confirmed on each order; nothing on this site is an offer.',
      'Fabrics are supplied to a production standard stated on their technical sheet, within the tolerances it gives. Shade is matched to the BASIS physical standard; screens are not a reference.',
      'Samples are supplied for evaluation. Claims about delivered goods are made against the lot and roll identity on the label.',
    ],
  },
  cookies: {
    title: 'Cookies',
    summary: 'This site does not set tracking cookies.',
    body: ['This site is static and sets no cookies of its own. It loads no third-party analytics or advertising scripts. If that changes, this page will say so first.'],
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
      <div className="mt-8 max-w-2xl space-y-5 text-lg leading-relaxed text-ink-soft">
        {page.body.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>
    </Section>
  );
}
