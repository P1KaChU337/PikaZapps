/* Перерисовка картинок сайта (assets/img/*.webp) из canvas-сцен в scenes.html.
   Нужен Playwright с Chromium:  npm i -D playwright && npx playwright install chromium
   Запуск:  node tools/artgen/render.js            — все сцены
            node tools/artgen/render.js hero fox   — только указанные
   OUT_DIR=путь — сохранить в другую папку (по умолчанию assets/img). */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.env.OUT_DIR || path.join(__dirname, '..', '..', 'assets', 'img');
const JOBS = {
  hero: [1920, 1080], circuit: [1200, 900], globe: [1200, 900], phone: [900, 1100], fox: [800, 800],
  reactor: [960, 600], looniee: [960, 600], autovote: [960, 600], lasserver: [960, 600],
  las: [960, 600], bridge: [960, 600], casino: [960, 600], nwbot: [960, 600],
};

(async () => {
  const only = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[scene error]', e.message));
  await page.goto('file://' + path.join(__dirname, 'scenes.html'));
  await page.waitForTimeout(1500); // шрифты Google Fonts
  const save = async (name, w, h, file = name) => {
    const url = await page.evaluate(([n, w, h]) => window.render(n, w, h), [name, w, h]);
    fs.writeFileSync(path.join(OUT, `${file}.webp`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('✓', file);
  };
  for (const [name, [w, h]] of Object.entries(JOBS)) {
    if (only.length && !only.includes(name)) continue;
    await save(name, w, h);
    if (name === 'hero') await save(name, 960, 540, 'hero-960');
  }
  await browser.close();
})();
