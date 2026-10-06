import { Link, useParams } from 'react-router';
import { applicationBySlug, productByCode } from '../site/catalog';
import { meta as siteMeta } from '../site/shell';
import { Cta, Display, Eyebrow, Hand, Index, Material, Section } from '../site/ui';
import { NotFound } from './not-found';

export function meta({ params }: { params: { application: string } }) {
  const application = applicationBySlug(params.application);
  return application ? siteMeta(application.name, application.problem, `/applications/${application.slug}`) : siteMeta('Not found', '');
}

export default function Application() {
  const { application: slug = '' } = useParams();
  const application = applicationBySlug(slug);
  if (!application) return <NotFound />;
  const fabrics = application.fabrics.map((code) => productByCode(code)).filter((product): product is NonNullable<typeof product> => Boolean(product));
  return (
    <>
      <Section className="pb-8">
        <Eyebrow>
          <Link to="/applications" className="hover:underline">
            Applications
          </Link>
        </Eyebrow>
        <Display as="h1" className="mt-4 text-[clamp(2.75rem,8vw,7rem)]">
          {application.name}
        </Display>
        <p className="mt-6 max-w-lg text-xl">{application.problem}</p>
        <p className="mt-4 max-w-lg text-ink-soft">{application.notes}</p>
      </Section>
      <Section className="pt-0">
        <Eyebrow>Recommended fabrics</Eyebrow>
        <ul className="mt-6 grid gap-8 md:grid-cols-2">
          {fabrics.map((product) => (
            <li key={product.code}>
              <Link to={`/fabrics/${product.familySlug}/${product.slug}`} className="group block">
                <Material kind={product.structure} hex={product.structure === 'tulle' ? '#F2E9DC' : product.structure === 'lining' ? '#E6DBC8' : '#CFA585'} className="aspect-[5/3] w-full" />
                <span className="mt-4 flex items-baseline gap-3">
                  <Index>{String(product.index).padStart(2, '0')}</Index>
                  <Hand className="text-3xl">{product.name}</Hand>
                </span>
                <span className="mt-1 block text-ink-soft">{product.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Cta to="/samples" className="mt-10">
          Request samples
        </Cta>
      </Section>
    </>
  );
}
