import { Panel, ShadeDot } from '@basis/ui';
import { Link } from 'react-router';
import { useProducts, useShades } from '../../data/catalog';
import { ModuleTitle, ProductsTabs } from './ProductsIndex';
import { useT } from '../../i18n';

// The Shade System: one shade language across products, packaging, samples
// and the website. Shades are circles, as the brand booklet draws them.

export function Shades() {
  const t = useT();
  const shades = useShades();
  const products = useProducts();
  const productName = new Map((products.data ?? []).map((product) => [product.code, product.name]));
  const collections = [...new Set((shades.data ?? []).map((shade) => shade.collection))];

  return (
    <>
      <ModuleTitle number="02" title={t('Shade System')}>{t('One shade language. A shade exists once; each product offers it when its SKU is approved.')}</ModuleTitle>
      <ProductsTabs active="shades" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {shades.isPending && <p className="text-ink-muted">{t('Loading shades')}</p>}
        {collections.map((collection) => (
          <Panel key={collection || 'all'} title={collection || 'Shades'}>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shades.data
                ?.filter((shade) => shade.collection === collection)
                .map((shade) => (
                  <li key={shade.code} className="flex gap-5 rounded-[var(--radius-panel)] border border-line bg-panel p-5">
                    <ShadeDot hex={shade.hex} name={shade.name} code={shade.code} size="lg" className="size-20" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-3">
                        <span className="text-base font-medium">{shade.name}</span>
                        <span className="code text-ink-muted">{shade.code}</span>
                      </p>
                      <p className="code mt-1 text-ink-muted">{shade.hex.toUpperCase()} on screen</p>
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.8125rem]">
                        {shade.availableIn.map((code) => (
                          <Link key={code} to={`/products/${code}`} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                            {productName.get(code) ?? code}
                          </Link>
                        ))}
                        {shade.pendingIn.map((code) => (
                          <span key={code} className="text-ink-muted">
                            {productName.get(code) ?? code} (pending)
                          </span>
                        ))}
                        {shade.availableIn.length === 0 && shade.pendingIn.length === 0 && <span className="text-ink-muted">{t('Not offered yet')}</span>}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
        <p className="max-w-prose text-[0.8125rem] text-ink-muted">{t('Screen colours are approximations. The physical standard and its Lab values govern shade matching; samples settle any doubt.')}</p>
      </div>
    </>
  );
}
