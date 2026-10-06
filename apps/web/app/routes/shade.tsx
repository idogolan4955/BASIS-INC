import { Link, useParams } from 'react-router';
import { products, shadeBySlug, shades } from '../site/catalog';
import { meta as siteMeta } from '../site/shell';
import { Cta, Display, Eyebrow, Hand, Index, Label, Section, ShadeCircle } from '../site/ui';
import { NotFound } from './not-found';

export function meta({ params }: { params: { shade: string } }) {
  const shade = shadeBySlug(params.shade);
  return shade ? siteMeta(`${shade.name} · Shade`, `${shade.name} (${shade.code}) in the BASIS Shade System, across ${products.length} fabrics.`, `/shades/${shade.slug}`) : siteMeta('Not found', '');
}

export default function ShadePage() {
  const { shade: slug = '' } = useParams();
  const shade = shadeBySlug(slug);
  if (!shade) return <NotFound />;
  const others = shades.filter((candidate) => candidate.code !== shade.code);
  return (
    <>
      <section className="grid md:grid-cols-2">
        <div className="aspect-square md:aspect-auto md:min-h-[70vh]" style={{ backgroundColor: shade.hex }} role="img" aria-label={`${shade.name}, ${shade.code}`} />
        <div className="flex flex-col justify-end px-4 py-12 md:px-12 md:py-20">
          <Eyebrow>
            <Link to="/shades" className="hover:underline">
              Shade System
            </Link>{' '}
            · {shade.code}
          </Eyebrow>
          <Display as="h1" className="mt-4 text-[clamp(3rem,9vw,8rem)]">
            {shade.name}
          </Display>
          <Label className="mt-8 max-w-sm" title={`Shade · ${shade.code}`} rows={[{ k: 'Name', v: shade.name }, { k: 'Code', v: <span className="code">{shade.code}</span> }, { k: 'Collection', v: shade.collection === 'SKIN' ? 'Skin tones' : 'Neutrals' }, { k: 'Reference', v: 'Physical standard, measured per lot' }]} />
          <div className="mt-8">
            <Cta to={`/samples?shade=${shade.slug}`}>Request samples</Cta>
          </div>
        </div>
      </section>
      <Section>
        <Eyebrow>Available in</Eyebrow>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {products.map((product) => (
            <li key={product.code}>
              <Link to={`/fabrics/${product.familySlug}/${product.slug}`} className="flex items-baseline justify-between gap-4 py-4 hover:underline">
                <span className="flex items-baseline gap-3">
                  <Index>{String(product.index).padStart(2, '0')}</Index>
                  <Hand className="text-2xl">{product.name}</Hand>
                </span>
                <span className="text-sm text-ink-muted">Confirmed per production standard</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section className="bg-milk pt-10">
        <Eyebrow>The other shades</Eyebrow>
        <ul className="mt-6 flex flex-wrap gap-6">
          {others.map((candidate) => (
            <li key={candidate.code}>
              <Link to={`/shades/${candidate.slug}`} className="flex flex-col items-start gap-2">
                <ShadeCircle shade={candidate} size="lg" />
                <span className="text-sm">
                  {candidate.name} <Index>{candidate.code}</Index>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
