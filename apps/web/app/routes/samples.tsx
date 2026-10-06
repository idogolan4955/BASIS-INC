import { useNavigate, useSearchParams } from 'react-router';
import { products, shades } from '../site/catalog';
import { Checks, Input, IntakeForm, Select, Textarea } from '../site/forms';
import { meta as siteMeta } from '../site/shell';
import { Display, Eyebrow, Hand, Index, Section, ShadeCircle } from '../site/ui';

export function meta() {
  return siteMeta('Request samples', 'Request BASIS fabric samples and the shade kit: who you are, what you make, which fabrics and shades, where to send them.', '/samples');
}

const CUSTOMER_TYPES = ['Bridal designer', 'Bridal salon', 'Atelier', 'Dress manufacturer', 'Fashion manufacturer', 'Distributor / wholesaler', 'Other'];

export default function Samples() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preset = { product: params.get('product'), shade: params.get('shade') };
  return (
    <>
      <Section className="pb-6">
        <Eyebrow>Samples</Eyebrow>
        <Display as="h1" className="mt-4 text-[clamp(2.75rem,8vw,7rem)]">
          See it on skin, in daylight.
        </Display>
        <p className="mt-6 max-w-lg text-lg text-ink-soft">Tell us who you are and what you make, choose the fabrics and shades, and the samples go out with their technical sheets. Trade customers only.</p>
      </Section>
      <Section className="relative pt-0">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <IntakeForm kind="sample_request" submitLabel="Request samples" onDone={(reference) => navigate(`/samples/confirmation?ref=${encodeURIComponent(reference)}`)}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Your name" name="name" required autoComplete="name" />
              <Input label="Company" name="company" required autoComplete="organization" />
              <Input label="Email" name="email" type="email" required autoComplete="email" />
              <Input label="Phone" name="phone" type="tel" autoComplete="tel" />
              <Select label="What you make" name="customerType" required>
                <option value="">Choose</option>
                {CUSTOMER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              <Input label="Country" name="country" required autoComplete="country-name" />
            </div>
            <Checks
              label="Fabrics"
              name="products"
              options={products.map((product) => ({
                value: product.code,
                checked: preset.product === product.slug,
                label: (
                  <span className="flex items-baseline gap-2">
                    <Index>{String(product.index).padStart(2, '0')}</Index>
                    <Hand className="text-lg">{product.name}</Hand>
                  </span>
                ),
              }))}
            />
            <Checks
              label="Shades"
              name="shades"
              options={shades.map((shade) => ({
                value: shade.code,
                checked: preset.shade === shade.slug,
                label: (
                  <span className="flex items-center gap-2">
                    <ShadeCircle shade={shade} size="sm" />
                    {shade.name}
                  </span>
                ),
              }))}
            />
            <Input label="Delivery address" name="address" required autoComplete="street-address" placeholder="Street, city, postal code" />
            <Textarea label="Notes" name="message" placeholder="The garment, the construction, what you are comparing against." />
          </IntakeForm>
          <aside className="lg:pt-2">
            <div className="border border-charcoal/70 bg-milk p-5">
              <p className="code uppercase tracking-[0.18em]">What arrives</p>
              <ul className="mt-4 space-y-3 text-sm text-ink-soft">
                <li>A swatch of each fabric chosen, in the shades chosen, labelled with product code and shade code.</li>
                <li>The shade kit on request: every shade on every fabric, against the physical standard.</li>
                <li>A technical data sheet per fabric with the confirmed values.</li>
              </ul>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
