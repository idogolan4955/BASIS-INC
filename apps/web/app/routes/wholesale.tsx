import { useState } from 'react';
import { Input, IntakeForm, Select, Textarea } from '../site/forms';
import { meta as siteMeta } from '../site/shell';
import { Display, Eyebrow, Label, Section } from '../site/ui';

export function meta() {
  return siteMeta('Wholesale', 'The BASIS wholesale programme for designers, salons, ateliers, manufacturers and distributors: how ordering works, minimums and lead times in principle, and the application.', '/wholesale');
}

const TYPES = ['Bridal designer', 'Bridal salon', 'Atelier', 'Dress manufacturer', 'Fashion manufacturer', 'Distributor / wholesaler'];
const VOLUMES = ['Under 500 m a year', '500 to 2,000 m a year', '2,000 to 10,000 m a year', 'Over 10,000 m a year'];

export default function Wholesale() {
  const [reference, setReference] = useState<string | null>(null);
  return (
    <>
      <Section className="pb-8">
        <Eyebrow>Wholesale</Eyebrow>
        <Display as="h1" className="mt-4 text-[clamp(2.75rem,8vw,7rem)]">
          By the roll, in shade.
        </Display>
        <p className="mt-6 max-w-lg text-lg text-ink-soft">BASIS supplies trade customers: designers, salons, ateliers, dress and fashion manufacturers, distributors. Orders are placed by the roll, in the shades of the Shade System, with lot consistency and a technical sheet behind every fabric.</p>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-10 md:grid-cols-3">
          <Label title="How ordering works" rows={[{ k: 'Unit', v: 'Full rolls, 160 cm × 50 m' }, { k: 'Shade', v: 'From the Shade System; shade and lot on every roll label' }, { k: 'Documents', v: 'Technical sheet, packing list, invoice' }, { k: 'Samples', v: 'Swatches and the shade kit before a first order' }]} />
          <Label title="In principle" rows={[{ k: 'Minimum', v: 'One roll per fabric and shade; distributor minimums on application' }, { k: 'Lead time', v: 'From stock: days. From production: confirmed per order' }, { k: 'Terms', v: 'Agreed on application' }, { k: 'Shipping', v: 'Worldwide; terms per order' }]} />
          <Label title="Who it is for" rows={TYPES.map((type) => ({ k: '', v: type }))} />
        </div>
      </Section>
      <Section className="bg-milk" id="apply">
        <Eyebrow>Application</Eyebrow>
        <Display className="mt-4 text-[clamp(2rem,4.5vw,4rem)]">Open a wholesale account.</Display>
        {reference ? (
          <p className="mt-6 max-w-lg text-lg">
            Received, reference <span className="code">{reference}</span>. We come back to you by email.
          </p>
        ) : (
          <div className="mt-8 max-w-2xl">
            <IntakeForm kind="wholesale" submitLabel="Apply" onDone={setReference}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Your name" name="name" required autoComplete="name" />
                <Input label="Company" name="company" required autoComplete="organization" />
                <Input label="Email" name="email" type="email" required autoComplete="email" />
                <Input label="Phone" name="phone" type="tel" autoComplete="tel" />
                <Select label="Business" name="customerType" required>
                  <option value="">Choose</option>
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                <Input label="Country" name="country" required autoComplete="country-name" />
                <Select label="Expected volume" name="volume">
                  <option value="">Not sure yet</option>
                  {VOLUMES.map((volume) => (
                    <option key={volume} value={volume}>
                      {volume}
                    </option>
                  ))}
                </Select>
                <Input label="Website" name="url" type="url" placeholder="https://" />
              </div>
              <Textarea label="About your work" name="message" placeholder="What you make, where you sell, what you are looking for." />
            </IntakeForm>
          </div>
        )}
      </Section>
    </>
  );
}
