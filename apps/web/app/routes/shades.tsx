import { Link } from 'react-router';
import { products, shadeCollections, shades } from '../site/catalog';
import { meta as siteMeta } from '../site/shell';
import { Cta, Display, Eyebrow, Index, Section, ShadeCircle } from '../site/ui';

export function meta() {
  return siteMeta('Shade System', `Six shades, one language across every BASIS fabric: ${shades.map((shade) => shade.name).join(', ')}.`, '/shades');
}

export default function Shades() {
  return (
    <>
      <Section className="pb-8">
        <Eyebrow>Shade System</Eyebrow>
        <Display as="h1" className="mt-4 text-[clamp(3rem,8vw,8rem)]">
          Six shades. One language.
        </Display>
        <p className="mt-6 max-w-lg text-lg text-ink-soft">A shade is defined once, against a physical standard, and controlled lot by lot. The same name and code run through every fabric, the roll label, the sample card and the order.</p>
      </Section>
      {shadeCollections.map((collection) => (
        <Section key={collection.code} className="border-t border-line pt-10">
          <Eyebrow>{collection.name}</Eyebrow>
          <ul className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {shades
              .filter((shade) => shade.collection === collection.code)
              .map((shade) => (
                <li key={shade.code}>
                  <Link to={`/shades/${shade.slug}`} className="group flex flex-col gap-4">
                    <ShadeCircle shade={shade} size="xl" className="transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.03]" />
                    <span className="flex items-baseline gap-3">
                      <Display as="p" className="text-[clamp(1.75rem,3vw,2.75rem)]">
                        {shade.name}
                      </Display>
                      <Index>{shade.code}</Index>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </Section>
      ))}
      <Section className="bg-milk">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <Display className="text-[clamp(2rem,4.5vw,4rem)]">Screens are not the reference.</Display>
          <div>
            <p className="max-w-md text-ink-soft">Colour on a screen is a suggestion. The shade kit carries every shade on every fabric, measured against the standard, to look at on skin and in daylight. It is how {products.length} fabrics are specified without surprise.</p>
            <Cta to="/samples" className="mt-8">
              Request the shade kit
            </Cta>
          </div>
        </div>
      </Section>
    </>
  );
}
