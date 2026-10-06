import { Link, useParams } from 'react-router';
import { applications, familyBySlug, shades } from '../site/catalog';
import { meta as siteMeta } from '../site/shell';
import { Cta, Display, Eyebrow, Hand, Index, Material, Section, ShadeCircle } from '../site/ui';
import { NotFound } from './not-found';

export function meta({ params }: { params: { family: string } }) {
  const family = familyBySlug(params.family);
  return family ? siteMeta(family.name, `${family.role.lead} ${family.role.body}`, `/fabrics/${family.slug}`) : siteMeta('Not found', '');
}

const SPEC_ROWS = [
  ['primaryRole', 'Primary role'],
  ['stretchBehaviour', 'Stretch behaviour'],
  ['transparency', 'Transparency'],
  ['supportLevel', 'Support level'],
  ['handFeel', 'Hand feel'],
  ['bestUse', 'Best use'],
] as const;

export default function Family() {
  const { family: slug = '' } = useParams();
  const family = familyBySlug(slug);
  if (!family) return <NotFound />;
  const related = applications.filter((application) => application.fabrics.some((code) => family.products.some((product) => product.code === code)));
  return (
    <>
      <section className="grid md:grid-cols-2">
        <Material kind={family.structure} hex={family.structure === 'tulle' ? '#F2E9DC' : family.structure === 'lining' ? '#E6DBC8' : '#CFA585'} className="aspect-[4/3] md:aspect-auto md:min-h-[70vh]" label={`${family.name}, drawn from its construction`} />
        <div className="flex flex-col justify-end px-4 py-12 md:px-12 md:py-20">
          <Eyebrow>Fabrics · {family.name}</Eyebrow>
          <Display as="h1" className="mt-4 text-[clamp(3rem,9vw,8rem)]">
            {family.name}
          </Display>
          <p className="mt-6 max-w-md text-xl text-ink">{family.role.lead}</p>
          <p className="mt-4 max-w-md text-ink-soft">{family.role.body}</p>
          <div className="mt-8">
            <Cta to="/samples">Request samples</Cta>
          </div>
        </div>
      </section>

      <Section>
        <Eyebrow>{family.products.length > 1 ? 'The products, compared' : 'The product'}</Eyebrow>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-t border-charcoal/70 text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className="code py-3 pr-4 align-bottom uppercase tracking-[0.14em] text-ink-muted" />
                {family.products.map((product) => (
                  <th key={product.code} scope="col" className="py-3 pr-4 align-bottom">
                    <Link to={`/fabrics/${family.slug}/${product.slug}`} className="flex flex-col gap-1 hover:underline">
                      <Index>{String(product.index).padStart(2, '0')}</Index>
                      <Hand className="text-2xl md:text-3xl">{product.name}</Hand>
                      <span className="text-sm font-normal text-ink-soft">{product.tagline}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-y border-line">
              {SPEC_ROWS.map(([key, label]) => (
                <tr key={key}>
                  <th scope="row" className="code py-3 pr-4 font-normal uppercase tracking-[0.12em] text-ink-muted">
                    {label}
                  </th>
                  {family.products.map((product) => (
                    <td key={product.code} className="py-3 pr-4">
                      {(product.specs as Record<string, string>)[key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-xl text-sm text-ink-muted">Composition, GSM, width, stretch percentage and shade availability are confirmed per production standard and published on each product's technical sheet.</p>
      </Section>

      <Section className="bg-milk">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Shades</Eyebrow>
            <Display className="mt-4 text-[clamp(2rem,4.5vw,4rem)]">In the Shade System.</Display>
            <p className="mt-4 max-w-md text-ink-soft">Availability per shade is confirmed as each fabric is approved in production. The sample kit is the reference; screens are not.</p>
          </div>
          <ul className="flex flex-wrap gap-6">
            {shades.map((shade) => (
              <li key={shade.code}>
                <Link to={`/shades/${shade.slug}`} className="flex flex-col items-start gap-2">
                  <ShadeCircle shade={shade} size="lg" />
                  <span className="text-sm">
                    {shade.name} <Index>{shade.code}</Index>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {related.length > 0 && (
        <Section>
          <Eyebrow>Applications</Eyebrow>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {related.map((application) => (
              <li key={application.slug}>
                <Link to={`/applications/${application.slug}`} className="flex flex-col gap-1 py-5 hover:underline md:flex-row md:items-baseline md:justify-between">
                  <span className="text-xl">{application.name}</span>
                  <span className="text-sm text-ink-soft">{application.problem}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
