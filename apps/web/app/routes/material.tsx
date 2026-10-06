import { meta as siteMeta } from '../site/shell';
import { Cta, Display, Eyebrow, Index, Material, Section } from '../site/ui';

export function meta() {
  return siteMeta('Material', 'How BASIS fabrics are made, tested and controlled: production standards, shade control against a physical standard, lot consistency and inspection before release.', '/material');
}

const STEPS = [
  { title: 'A production standard per fabric', body: 'Composition, width, weight, stretch and recovery are fixed per fabric and confirmed before anything is published. The technical sheet is that standard, not a brochure.' },
  { title: 'Shade against a physical standard', body: 'Every shade exists once, as a physical reference. Lab dips are approved against it before dyeing; production lots are measured against it after.' },
  { title: 'Lot consistency', body: 'A lot is fabric produced and dyed together. It is the unit of shade consistency, and it follows the roll from the mill to your cutting table on the label.' },
  { title: 'Inspection before release', body: 'Shade deviation, usable width, weight, defects scored per roll, quantity and packaging. A lot is released only when it passes; what you receive is what was checked.' },
  { title: 'Roll identity', body: 'Each roll carries shade, product code and lot, width, measured length and origin. Reordering the same lot is a line on an order, not a conversation.' },
];

export default function MaterialPage() {
  return (
    <>
      <section className="grid md:grid-cols-2">
        <Material kind="tulle" hex="#F2E9DC" scale={2.6} className="aspect-[4/3] md:aspect-auto md:min-h-[60vh]" label="Tulle, drawn from its construction" />
        <div className="flex flex-col justify-end px-4 py-12 md:px-12 md:py-20">
          <Eyebrow>Material</Eyebrow>
          <Display as="h1" className="mt-4 text-[clamp(2.75rem,8vw,7rem)]">
            Controlled, not described.
          </Display>
          <p className="mt-6 max-w-md text-lg text-ink-soft">A foundation fabric is judged in construction, under tension, against skin. So it is specified in numbers, made to a standard and checked before it leaves.</p>
        </div>
      </section>
      <Section>
        <ol className="divide-y divide-line border-y border-line">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid gap-3 py-8 md:grid-cols-[6rem_1fr_1.4fr]">
              <Index className="text-base">{String(index + 1).padStart(2, '0')}</Index>
              <Display as="h2" className="text-[clamp(1.5rem,3vw,2.5rem)]">
                {step.title}
              </Display>
              <p className="text-ink-soft md:pt-2">{step.body}</p>
            </li>
          ))}
        </ol>
        <Cta to="/samples" className="mt-10">
          Request samples
        </Cta>
      </Section>
    </>
  );
}
