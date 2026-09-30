#!/usr/bin/env node
/**
 * Тестовая копия силатехники.рф на GitHub Pages — для показа заказчику
 * до выкладки на боевой домен. Берёт готовую сборку сайта (dist/) и:
 *
 *  - переписывает корневые адреса (/burenie, /_astro/…, /fonts/…) под
 *    подпапку GitHub Pages (/silatechniki-staging/…);
 *  - закрывает все страницы от поисковиков: meta robots noindex, nofollow
 *    и robots.txt с Disallow: /, карту сайта не выкладывает;
 *  - отключает отправку заявки: на Pages нет lead.php, а живые люди
 *    не должны оставлять здесь телефоны;
 *  - добавляет плашку «тестовая копия».
 *
 * canonical и разметка schema.org остаются с боевым адресом — так и нужно.
 *
 *   npm run build                             # из корня проекта
 *   node staging/scripts/build_staging.mjs
 *   python3 staging/scripts/check_staging.py
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'staging', 'docs');
const BASE = '/silatechniki-staging';

const BANNER =
  '<div style="position:relative;z-index:1000;background:#FAEBC8;color:#7E5900;' +
  'font:500 14px/1.4 system-ui,sans-serif;text-align:center;padding:8px 12px;border-bottom:1px solid #F2B01E">' +
  'Тестовая копия сайта для просмотра. Заявки отсюда не отправляются — ' +
  'звоните по телефону на странице.</div>';

// Заявку перехватываем раньше обработчика сайта (фаза захвата).
const FORM_STUB =
  '<script>document.addEventListener("submit",function(e){' +
  'if(e.target.matches&&e.target.matches("form[data-lead]")){e.preventDefault();e.stopImmediatePropagation();' +
  'alert("Это тестовая копия сайта: заявка не отправлена. Позвоните по телефону на странице.");}},true);</script>';

const prefix = (u) => (u.startsWith('//') ? u : BASE + u);

function rewriteHtml(html) {
  html = html
    // одиночные адреса в атрибутах
    .replace(/\b(href|src|action|poster|data-src)="(\/[^"]*)"/g, (m, a, u) => `${a}="${prefix(u)}"`)
    // srcset: список «адрес ширина»
    .replace(/\b(srcset|imagesrcset)="([^"]*)"/g, (m, a, v) =>
      `${a}="${v.replace(/(^|,\s*)(\/[^\s,]+)/g, (mm, sep, u) => sep + prefix(u))}"`)
    // url(/…) во встроенных стилях
    .replace(/url\((['"]?)(\/[^)'"]*)\1\)/g, (m, q, u) => `url(${q}${prefix(u)}${q})`)
    // индексация
    .replace(/<meta name="robots"[^>]*>/g, '')
    .replace('</head>', '<meta name="robots" content="noindex, nofollow">\n' + FORM_STUB + '\n</head>')
    .replace(/<link rel="sitemap"[^>]*>/g, '');
  return html.replace(/<body([^>]*)>/, (m) => m + BANNER);
}

function rewriteCss(css) {
  return css.replace(/url\((['"]?)(\/[^)'"]*)\1\)/g, (m, q, u) => `url(${q}${prefix(u)}${q})`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('Нет dist/ — сначала npm run build');
  process.exit(1);
}
fs.rmSync(OUT, { recursive: true, force: true });
let pages = 0;
for (const src of walk(DIST)) {
  const rel = path.relative(DIST, src);
  if (/^sitemap.*\.xml$/.test(rel) || rel.endsWith('.DS_Store')) continue;
  const dst = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (rel.endsWith('.html')) { fs.writeFileSync(dst, rewriteHtml(fs.readFileSync(src, 'utf8'))); pages++; }
  else if (rel.endsWith('.css')) fs.writeFileSync(dst, rewriteCss(fs.readFileSync(src, 'utf8')));
  else fs.copyFileSync(src, dst);
}
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
// Без .nojekyll GitHub Pages выбросит папку _astro (Jekyll игнорирует «_»).
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Страниц: ${pages} → ${path.relative(ROOT, OUT)}/ (база ${BASE})`);
