import { Link } from 'react-router';
import { SITE, applications, families, products, shades } from '../site/catalog';
import { meta as siteMeta } from '../site/shell';
import { Cta, Display, Eyebrow, Hand, Index, Material, Rule, Section, ShadeCircle } from '../site/ui';

export function meta() {
  return siteMeta(SITE.name, SITE.description, '/');
}

export default function Home() {
  return (
    <>
      {/* One screen: what BASIS is. */}
      <section className="relative overflow-hidden px-4 pb-16 pt-10 md:px-12 md:pb-28 md:pt-20 lg:px-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[70%] text-nude-deep/70 [mask-image:linear-gradient(to_left,black_15%,transparent_90%)] md:w-[55%]">
          <Material kind="mesh" hex="transparent" scale={3.4} className="h-full" />
        </div>
        <div className="relative">
          <Eyebrow className="reveal">Foundation fabrics · {families.length} families · {products.length} fabrics · {shades.length} shades</Eyebrow>
          <Display as="h1" className="reveal mt-6 max-w-[14ch] text-[clamp(3.25rem,10vw,10rem)]">
            What a gown is built on.
          </Display>
          <p className="reveal-late mt-8 max-w-md text-lg leading-relaxed text-ink-soft md:text-xl">
            Powermesh, stretch mesh, lining and tulle, in one shade language, supplied to the people who construct bridal.
          </p>
          <div className="reveal-late mt-10 flex flex-wrap gap-3">
            <Cta to="/samples">Request samples</Cta>
            <Cta to="/fabrics" variant="secondary">
              The fabrics
            </Cta>
          </div>
        </div>
      </section>

      {/* The three families as material moments. */}
      <Section className="pt-0">
        <Rule />
        <ul className="divide-y divide-line">
          {families.map((family, index) => (
            <li key={family.code}>
              <Link to={`/fabrics/${family.slug}`} className="group grid gap-6 py-10 md:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:py-14">
                <Index className="text-base">{String(index + 1).padStart(2, '0')}</Index>
                <div>
                  <Display className="text-[clamp(2.5rem,7vw,6rem)] transition-transform duration-700 ease-[var(--ease-soft)] group-hover:translate-x-2">{family.name}</Display>
                  <p className="mt-3 max-w-md text-base text-ink-soft md:text-lg">{family.role.lead}</p>
                  <p className="mt-4 text-sm text-ink-muted">{family.products.map((product) => product.name).join(' · ')}</p>
                </div>
                <Material kind={family.structure} hex={family.structure === 'tulle' ? '#F2E9DC' : family.structure === 'lining' ? '#E6DBC8' : '#CFA585'} className="aspect-[4/3] w-full md:aspect-[5/4]" label={`${family.name}, drawn from its construction`} />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* Shade System teaser. */}
      <Section className="bg-milk">
        <div className="grid gap-10 md:grid-cols-2 md:items-end">
          <div>
            <Eyebrow>Shade System</Eyebrow>
            <Display className="mt-4 text-[clamp(2.5rem,6vw,5.5rem)]">Six shades. One language.</Display>
            <p className="mt-6 max-w-md text-lg text-ink-soft">The same six shades run through every fabric, every roll label, every sample card and every order, so a shade chosen on an illusion mesh is the shade that arrives on the lining.</p>
            <Cta to="/shades" variant="secondary" className="mt-8">
              The Shade System
            </Cta>
          </div>
          <ul className="grid grid-cols-3 gap-6 md:gap-8">
            {shades.map((shade) => (
              <li key={shade.code}>
                <Link to={`/shades/${shade.slug}`} className="group flex flex-col items-start gap-3">
                  <ShadeCircle shade={shade} size="lg" className="transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.04]" />
                  <span className="text-sm">
                    {shade.name} <Index>{shade.code}</Index>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Applications, and the hand. */}
      <Section>
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow>Applications</Eyebrow>
            <Display className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)]">Start from the garment.</Display>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {applications.map((application) => (
                <li key={application.slug}>
                  <Link to={`/applications/${application.slug}`} className="flex items-baseline justify-between gap-6 py-4 hover:underline">
                    <span className="text-lg">{application.name}</span>
                    <span className="code text-ink-muted">{application.fabrics.join(' · ')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-end gap-6">
            <ul className="flex flex-wrap gap-x-8 gap-y-4">
              {products.map((product) => (
                <li key={product.code}>
                  <Link to={`/fabrics/${product.familySlug}/${product.slug}`} className="flex items-baseline gap-3">
                    <Index>{String(product.index).padStart(2, '0')}</Index>
                    <Hand className="text-[clamp(1.75rem,4vw,3rem)]">{product.name}</Hand>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="max-w-md text-ink-soft">Every product is named in the hand on its roll and on the sample card; what you specify is what you receive.</p>
          </div>
        </div>
      </Section>

      {/* Wholesale invitation. */}
      <Section className="border-t border-charcoal/70">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <Display className="text-[clamp(2.25rem,5vw,4.5rem)]">A professional wholesale relationship.</Display>
          <div>
            <p className="max-w-md text-lg text-ink-soft">Designers, salons, ateliers and manufacturers order by the roll, in shade, with lot consistency and a technical sheet behind every fabric. Minimums and lead times in principle are on the wholesale page.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Cta to="/wholesale">Wholesale</Cta>
              <Cta to="/contact" variant="secondary">
                Contact
              </Cta>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
