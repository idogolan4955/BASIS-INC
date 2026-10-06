import { families, products, shades } from '../site/catalog';
import { meta as siteMeta } from '../site/shell';
import { Cta, Display, Eyebrow, Section } from '../site/ui';

export function meta() {
  return siteMeta('About', 'BASIS INC. is a foundation-fabric brand for bridal construction: one range, one shade language, one standard, supplied internationally.', '/about');
}

export default function About() {
  return (
    <>
      <Section className="pb-8">
        <Eyebrow>About</Eyebrow>
        <Display as="h1" className="mt-4 max-w-[16ch] text-[clamp(2.75rem,8vw,7rem)]">
          The basis of the dress.
        </Display>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-5 text-lg leading-relaxed text-ink-soft">
            <p>Bridal is built from the inside out. The mesh that shapes, the lining that touches the skin, the tulle that carries the volume: these decide how a gown holds, moves and feels, and they are the fabrics a designer can least afford to guess.</p>
            <p>BASIS INC. exists to make those fabrics a known quantity. {products.length} products in {families.length} families, named for what they do; {shades.length} shades defined once and controlled lot by lot; a production standard and a technical sheet behind every roll.</p>
            <p>We supply designers, salons, ateliers, dress and fashion manufacturers and distributors internationally, from production in Asia through our own quality control to delivery.</p>
          </div>
          <div className="grid gap-6 self-start border-y border-charcoal/70 py-6 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            {[
              [String(products.length).padStart(2, '0'), 'fabrics'],
              [String(shades.length).padStart(2, '0'), 'shades'],
              ['01', 'standard'],
            ].map(([figure, label]) => (
              <div key={label}>
                <p className="font-display text-[clamp(3rem,6vw,5rem)] leading-none tracking-[-0.02em]">{figure}</p>
                <p className="code mt-2 uppercase tracking-[0.18em] text-ink-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Cta to="/fabrics">The fabrics</Cta>
          <Cta to="/wholesale" variant="secondary">
            Wholesale
          </Cta>
        </div>
      </Section>
    </>
  );
}
