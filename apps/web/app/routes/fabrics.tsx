import { Link } from 'react-router';
import { SITE, families } from '../site/catalog';
import { meta as siteMeta } from '../site/shell';
import { Display, Eyebrow, Hand, Index, Material, Section } from '../site/ui';

export function meta() {
  return siteMeta('Fabrics', `The BASIS range: ${families.map((family) => family.name).join(', ')}. ${SITE.tagline}.`, '/fabrics');
}

export default function Fabrics() {
  return (
    <>
      <Section className="pb-8 md:pb-12">
        <Eyebrow>Fabrics</Eyebrow>
        <Display as="h1" className="mt-4 text-[clamp(3rem,8vw,8rem)]">
          Three families.
        </Display>
        <p className="mt-6 max-w-lg text-lg text-ink-soft">Each family is defined by what it does in a gown. Each product by what it does within the family.</p>
      </Section>
      <Section className="pt-0">
        <ul className="grid gap-12 md:grid-cols-3">
          {families.map((family, index) => (
            <li key={family.code} className="flex flex-col">
              <Link to={`/fabrics/${family.slug}`} className="group">
                <Material kind={family.structure} hex={family.structure === 'tulle' ? '#F2E9DC' : family.structure === 'lining' ? '#E6DBC8' : '#CFA585'} className="aspect-[4/5] w-full" label={`${family.name}, drawn from its construction`} />
                <div className="mt-5 flex items-baseline gap-4">
                  <Index className="text-base">{String(index + 1).padStart(2, '0')}</Index>
                  <Display as="h2" className="text-[clamp(2rem,4vw,3.5rem)] transition-transform duration-700 ease-[var(--ease-soft)] group-hover:translate-x-1">{family.name}</Display>
                </div>
                <p className="mt-3 text-ink-soft">{family.role.lead}</p>
              </Link>
              <ul className="mt-5 divide-y divide-line border-y border-line">
                {family.products.map((product) => (
                  <li key={product.code}>
                    <Link to={`/fabrics/${family.slug}/${product.slug}`} className="flex items-baseline justify-between gap-4 py-3 hover:underline">
                      <span className="flex items-baseline gap-3">
                        <Index>{String(product.index).padStart(2, '0')}</Index>
                        <Hand className="text-xl">{product.name}</Hand>
                      </span>
                      <span className="text-end text-sm text-ink-muted">{product.tagline}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
