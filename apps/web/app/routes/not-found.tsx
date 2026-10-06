import { Cta, Display, Section } from '../site/ui';

export function NotFound() {
  return (
    <Section>
      <Display as="h1" className="text-[clamp(2.5rem,6vw,5rem)]">
        Not in the range.
      </Display>
      <p className="mt-4 text-ink-soft">The page you asked for does not exist here.</p>
      <Cta to="/fabrics" variant="secondary" className="mt-8">
        The fabrics
      </Cta>
    </Section>
  );
}
