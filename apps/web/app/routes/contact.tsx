import { useState } from 'react';
import { Input, IntakeForm, Select, Textarea } from '../site/forms';
import { meta as siteMeta } from '../site/shell';
import { Display, Eyebrow, Section } from '../site/ui';

export function meta() {
  return siteMeta('Contact', 'Reach BASIS INC.: samples, wholesale, technical questions, press.', '/contact');
}

export default function Contact() {
  const [reference, setReference] = useState<string | null>(null);
  return (
    <>
      <Section className="pb-8">
        <Eyebrow>Contact</Eyebrow>
        <Display as="h1" className="mt-4 text-[clamp(2.75rem,8vw,7rem)]">
          Write to us.
        </Display>
        <p className="mt-6 max-w-lg text-lg text-ink-soft">Samples, wholesale, a technical question about a fabric, press. Say which and we route it to the right person.</p>
      </Section>
      <Section className="pt-0">
        {reference ? (
          <p className="max-w-lg text-lg">
            Received, reference <span className="code">{reference}</span>. We answer by email.
          </p>
        ) : (
          <div className="max-w-2xl">
            <IntakeForm kind="contact" submitLabel="Send" onDone={setReference}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Your name" name="name" required autoComplete="name" />
                <Input label="Email" name="email" type="email" required autoComplete="email" />
                <Input label="Company" name="company" autoComplete="organization" />
                <Select label="Topic" name="topic" required>
                  <option value="">Choose</option>
                  <option>Samples</option>
                  <option>Wholesale</option>
                  <option>Technical question</option>
                  <option>Press</option>
                  <option>Other</option>
                </Select>
              </div>
              <Textarea label="Message" name="message" rows={6} />
            </IntakeForm>
          </div>
        )}
      </Section>
    </>
  );
}
