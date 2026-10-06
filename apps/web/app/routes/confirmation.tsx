import { useSearchParams } from 'react-router';
import { meta as siteMeta } from '../site/shell';
import { Cta, Display, Eyebrow, Section } from '../site/ui';

export function meta() {
  return siteMeta('Request received', 'Your sample request has reached BASIS INC.', '/samples/confirmation');
}

export default function Confirmation() {
  const [params] = useSearchParams();
  const reference = params.get('ref');
  return (
    <Section>
      <Eyebrow>Samples</Eyebrow>
      <Display as="h1" className="mt-4 text-[clamp(2.75rem,8vw,7rem)]">
        Received.
      </Display>
      <p className="mt-6 max-w-lg text-lg text-ink-soft">Your request is with us. We confirm by email, with a date for the samples to leave.</p>
      {reference && (
        <p className="mt-4 text-sm text-ink-muted">
          Reference <span className="code text-ink">{reference}</span>
        </p>
      )}
      <Cta to="/fabrics" variant="secondary" className="mt-10">
        Back to the fabrics
      </Cta>
    </Section>
  );
}
