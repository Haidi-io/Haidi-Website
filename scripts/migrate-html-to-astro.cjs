/**
 * One-time helper: converts legacy *.html pages into src/pages/*.astro
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pagesDir = path.join(root, 'src', 'pages');

const PAGE_SCRIPTS = {
  'home.html': ['hero-variants.js', 'haidi-mocks.js', 'haidi-site.js', 'haidi-hero.js', 'haidi-tweaks.js'],
  'about.html': ['haidi-mocks.js', 'haidi-site.js', 'haidi-tweaks.js'],
  'product-overview.html': ['haidi-mocks.js', 'haidi-site.js', 'haidi-tweaks.js'],
  'contact.html': ['haidi-site.js', 'contact-form.js', 'haidi-tweaks.js'],
  'privacy.html': ['haidi-site.js'],
  'terms.html': ['haidi-site.js'],
  'security.html': ['haidi-site.js'],
  '404.html': ['haidi-site.js'],
};

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function fixLinks(html) {
  return html
    .replace(/href="contact\.html/g, 'href="/contact')
    .replace(/href="product-overview\.html/g, 'href="/product-overview')
    .replace(/href="about\.html/g, 'href="/about')
    .replace(/href="home\.html/g, 'href="/home')
    .replace(/href="privacy\.html/g, 'href="/privacy')
    .replace(/href="terms\.html/g, 'href="/terms')
    .replace(/href="security\.html/g, 'href="/security');
}

function extractBody(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) return '';
  let body = bodyMatch[1];
  body = body.replace(/^\s*<div data-chrome="header"><\/div>\s*/i, '');
  body = body.replace(/\s*<div data-chrome="footer"><\/div>[\s\S]*$/i, '');
  body = body.replace(/<script[\s\S]*?<\/script>\s*/gi, '');
  return fixLinks(body.trim());
}

function extractPageStyles(html) {
  const afterCss = html.split('href="assets/haidi.css"')[1] || '';
  const styleMatch = afterCss.match(/<style>([\s\S]*?)<\/style>/i);
  return styleMatch ? styleMatch[1].trim() : '';
}

function escapeForTemplate(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function astroPage(name, html) {
  const slug = name.replace('.html', '');
  const outName = slug === '404' ? '404.astro' : `${slug}.astro`;

  const title = extract(html, /<title>([^<]+)<\/title>/i);
  const description = extract(html, /<meta name="description" content="([^"]*)"/i);
  const canonical = extract(html, /<link rel="canonical" href="([^"]*)"/i);
  const ogTitle = extract(html, /<meta property="og:title" content="([^"]*)"/i);
  const ogDescription = extract(html, /<meta property="og:description" content="([^"]*)"/i);
  const ogUrl = extract(html, /<meta property="og:url" content="([^"]*)"/i);
  const noindex = /name="robots" content="noindex"/i.test(html);
  const jsonLd = extract(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);

  const bodyMatch = html.match(/<body([^>]*)>/i);
  const bodyAttrs = bodyMatch ? bodyMatch[1] : '';
  const nav = extract(bodyAttrs, /data-nav="([^"]*)"/i);
  const screenLabel = extract(bodyAttrs, /data-screen-label="([^"]*)"/i);

  const pageStyles = extractPageStyles(html);
  const body = extractBody(html);
  const scripts = PAGE_SCRIPTS[name] || ['haidi-site.js'];
  const heroVariants = scripts.includes('hero-variants.js');

  const props = [
    `title="${title.replace(/"/g, '\\"')}"`,
    description ? `description="${description.replace(/"/g, '\\"')}"` : '',
    canonical ? `canonical="${canonical}"` : '',
    ogTitle ? `ogTitle="${ogTitle.replace(/"/g, '\\"')}"` : '',
    ogDescription ? `ogDescription="${ogDescription.replace(/"/g, '\\"')}"` : '',
    ogUrl ? `ogUrl="${ogUrl}"` : '',
    nav ? `nav="${nav}"` : '',
    screenLabel ? `screenLabel="${screenLabel.replace(/"/g, '\\"')}"` : '',
    noindex ? 'noindex' : '',
    jsonLd ? 'jsonLd={jsonLd}' : '',
    heroVariants ? 'heroVariants' : '',
    `scripts={[${scripts.map((s) => `'${s}'`).join(', ')}]}`,
  ].filter(Boolean);

  const jsonLdBlock = jsonLd ? `const jsonLd = ${jsonLd};\n` : '';

  const styleBlock = pageStyles
    ? `\n  <style is:global>\n${pageStyles}\n  </style>\n`
    : '';

  const content = `---
import BaseLayout from '../layouts/BaseLayout.astro';
${jsonLdBlock}---

<BaseLayout ${props.join(' ')}>${styleBlock}
  <div set:html={\`${escapeForTemplate(body)}\`} />
</BaseLayout>
`;

  fs.writeFileSync(path.join(pagesDir, outName), content, 'utf8');
  console.log('  →', outName);
}

fs.mkdirSync(pagesDir, { recursive: true });
fs.mkdirSync(path.join(root, 'public', 'assets'), { recursive: true });

const assetsSrc = path.join(root, 'assets');
if (fs.existsSync(assetsSrc)) {
  for (const file of fs.readdirSync(assetsSrc)) {
    fs.copyFileSync(path.join(assetsSrc, file), path.join(root, 'public', 'assets', file));
  }
}

for (const file of ['robots.txt', 'sitemap.xml']) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(root, 'public', file));
}

const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html') && f !== 'index.html');
console.log('Migrating', htmlFiles.length, 'pages…');
htmlFiles.forEach((f) => {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  astroPage(f, html);
});

console.log('Done.');
