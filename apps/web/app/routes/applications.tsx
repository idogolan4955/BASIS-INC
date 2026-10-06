import { Link } from 'react-router';
import { applications, productByCode } from '../site/catalog';
import { meta as siteMeta } from '../site/shell';
import { Display, Eyebrow, Hand, Section } from '../site/ui';

export function meta() {
  return siteMeta('Applications', 'Start from the garment problem: corsetry, illusion, lining, veils and volume, and the BASIS fabrics that solve each.', '/applications');
}

export default function Applications() {
  return (
    <>
      <Section className="pb-8">
        <Eyebrow>Applications</Eyebrow>
        <Display as="h1" className="mt-4 text-[clamp(3rem,8vw,8rem)]">
          Start from the garment.
        </Display>
        <p className="mt-6 max-w-lg text-lg text-ink-soft">Each application names the problem, the fabrics that solve it and how they are cut.</p>
      </Section>
      <Section className="pt-0">
        <ul className="divide-y divide-line border-y border-line">
          {applications.map((application, index) => (
            <li key={application.slug}>
              <Link to={`/applications/${application.slug}`} className="grid gap-4 py-8 md:grid-cols-[6rem_1fr_1fr] md:items-baseline">
                <span className="code text-ink-muted">{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <Display as="p" className="text-[clamp(1.75rem,4vw,3.25rem)]">
                    {application.name}
                  </Display>
                  <span className="mt-2 block text-ink-soft">{application.problem}</span>
                </span>
                <span className="flex flex-wrap gap-x-6 gap-y-2 md:justify-end">
                  {application.fabrics.map((code) => (
                    <Hand key={code} className="text-xl">
                      {productByCode(code)?.name ?? code}
                    </Hand>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
