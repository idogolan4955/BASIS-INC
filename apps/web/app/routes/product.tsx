import { Link, useParams } from 'react-router';
import { SITE, applications, productBySlug, putUp, shades } from '../site/catalog';
import { meta as siteMeta } from '../site/shell';
import { Cta, Display, Eyebrow, Hand, Index, Label, Material, Section, ShadeCircle } from '../site/ui';
import { NotFound } from './not-found';

export function meta({ params }: { params: { family: string; product: string } }) {
  const product = productBySlug(params.family, params.product);
  return product ? siteMeta(product.name, `${product.tagline}. ${product.description}`, `/fabrics/${product.familySlug}/${product.slug}`) : siteMeta('Not found', '');
}

export default function Product() {
  const { family = '', product: slug = '' } = useParams();
  const product = productBySlug(family, slug);
  if (!product) return <NotFound />;
  const specs = product.specs as Record<string, string>;
  const variant = product.variants[0];
  const related = applications.filter((application) => (application.fabrics as readonly string[]).includes(product.code));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    brand: { '@type': 'Brand', name: 'BASIS INC.' },
    description: product.description,
    category: product.familyName,
    url: `${SITE.url}/fabrics/${product.familySlug}/${product.slug}`,
    material: product.familyName,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="px-4 pb-10 pt-10 md:px-12 md:pt-16 lg:px-24">
        <Eyebrow>
          <Link to="/fabrics" className="hover:underline">
            Fabrics
          </Link>{' '}
          ·{' '}
          <Link to={`/fabrics/${product.familySlug}`} className="hover:underline">
            {product.familyName}
          </Link>{' '}
          · {String(product.index).padStart(2, '0')}
        </Eyebrow>
        <div className="mt-6 grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <Hand className="block text-[clamp(3rem,11vw,10rem)]">{product.name}</Hand>
            <p className="mt-4 font-display text-[clamp(1.5rem,3vw,2.5rem)] leading-tight tracking-[-0.01em]">{product.tagline}</p>
            <p className="mt-4 max-w-md text-lg text-ink-soft">{product.description}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Cta to={`/samples?product=${product.slug}`}>Request samples</Cta>
            <Cta to="/wholesale" variant="secondary">
              Wholesale
            </Cta>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-[1fr_1fr]">
        <Material kind={product.structure} hex={product.structure === 'tulle' ? '#F2E9DC' : product.structure === 'lining' ? '#E6DBC8' : '#CFA585'} className="aspect-square md:aspect-auto md:min-h-[60vh]" label={`${product.name}, drawn from its construction`} />
        <div className="px-4 py-10 md:px-12 md:py-16">
          <Label
            title={`Specification · ${product.code}`}
            rows={[
              { k: 'Primary role', v: specs['primaryRole'] ?? '—' },
              { k: 'Stretch', v: specs['stretchBehaviour'] ?? '—' },
              { k: 'Transparency', v: specs['transparency'] ?? '—' },
              { k: 'Support', v: specs['supportLevel'] ?? '—' },
              { k: 'Hand feel', v: specs['handFeel'] ?? '—' },
              { k: 'Best use', v: specs['bestUse'] ?? '—' },
              { k: 'Width', v: variant ? `${variant.widthCm} cm` : 'Per production standard' },
              { k: 'Composition', v: 'Confirmed per production standard' },
              { k: 'Weight', v: 'Confirmed per production standard' },
              { k: 'Put-up', v: `${putUp.name}. ${putUp.wrap}` },
              { k: 'Origin', v: 'Made for BASIS INC.' },
            ]}
          />
          <p className="mt-4 text-sm text-ink-muted">A technical data sheet with the confirmed values accompanies every production standard and every sample.</p>
        </div>
      </section>

      <Section className="bg-milk">
        <Eyebrow>Shades</Eyebrow>
        <Display className="mt-4 text-[clamp(2rem,4.5vw,4rem)]">{product.name} in the Shade System.</Display>
        <ul className="mt-8 grid grid-cols-3 gap-6 md:grid-cols-6">
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
        <p className="mt-6 max-w-xl text-sm text-ink-muted">Availability per shade is confirmed as the fabric is approved in production. Request the sample kit to see the fabric in the shade, on skin, in daylight.</p>
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
