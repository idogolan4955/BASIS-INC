// Writes sitemap.xml and robots.txt into the built site from the paths the
// catalog prerenders. Runs after `react-router build`.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve('build/client');
const base = 'https://basis-inc.web.app';
// The prerendered pages are directories with index.html; list them.
function pages(dir, prefix = '') {
  const result = [];
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === 'assets' || entry.startsWith('.')) continue;
      result.push(...pages(path, `${prefix}/${entry}`));
    } else if (entry === 'index.html') {
      result.push(prefix || '/');
    }
  }
  return result;
}
const urls = pages(out).sort();
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  resolve(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${base}${url}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
writeFileSync(resolve(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
console.log(`sitemap: ${urls.length} pages`);
