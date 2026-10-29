// Records the Luna voice stage (real UI, scripted demo data) answering a factory CEO with the profit key on.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';

const base = 'http://127.0.0.1:3010';
const out = process.env.OUT || 'media';
const size = { width: 1280, height: 720 };
fs.mkdirSync(out, { recursive: true });

const SRC = 'موتور سود · دادهٔ نمایشی';
const ready = { id: 'v0', kind: 'headline', text: 'کلید سود روشن است. حالا هر جواب، به تومان است.', highlight: 'به تومان' };
const bars = { id: 'v1', kind: 'bars', title: 'سود ماهانهٔ هر گزینه (میلیون تومان)', source: SRC,
  items: [{ label: 'رفع گلوگاه خط رنگ‌کاری', value: 1850 }, { label: 'دو فروشندهٔ جدید', value: 420 }, { label: 'کمپین تبلیغاتی', value: 260 }] };
const stat = { id: 'v2', kind: 'stat', title: 'هزینهٔ هر هفته تأخیر', value: '۴۳۰', delta: 'میلیون تومان', deltaTone: 'down',
  text: 'سودی که تا راه‌افتادن خط دوم رنگ‌کاری، هر هفته روی میز می‌ماند', source: SRC };
const steps = { id: 'v3', kind: 'steps', title: 'پیشنهاد لونا',
  items: [{ label: 'خرید کورهٔ دوم رنگ همین ماه تأیید شود' }, { label: 'تا تحویل کوره، شیفت شب برای رنگ‌کاری' }, { label: 'استخدام فروشنده، بعد از رفع گلوگاه' }] };
const order = (...v) => v.map((x) => ({ panel: 'visual', id: x.id }));

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: out + '/raw-profit', size } });
const page = await context.newPage();
const TC = Date.now();
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.route('**/socket.io/**', (r) => r.abort());
await page.route((u) => u.pathname.startsWith('/api/'), (r) => r.fulfill({ json: [] }));
await page.goto(base + '/vazirmatn.css');
await page.setContent('<link rel="stylesheet" href="/vazirmatn.css"><style>html,body{margin:0;background:#0b0a1a}</style><div id="test-root"></div>');
await page.evaluate(async () => {
  document.documentElement.dir = 'rtl';
  document.documentElement.classList.add('dark');
  const refresh = await import('/@react-refresh'); refresh.default.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (t) => t; window.__vite_plugin_react_preamble_installed__ = true;
  const runtime = await import('/utils/i18n/runtime.ts'); await runtime.loadUiCatalog();
  const { mountBrainVoiceBoardHarness } = await import('/tests/local/fixtures/brainVoiceBoardHarness.tsx');
  mountBrainVoiceBoardHarness();
});
await page.locator('.brain-voice').waitFor({ state: 'visible', timeout: 120000 });
const set = (p) => page.evaluate((x) => window.__bvSet(x), p);
const wait = (ms) => page.waitForTimeout(ms);
// A soft cursor ring, so viewers see the profit key being pressed.
await page.addStyleTag({ content: '#cur{position:fixed;z-index:99999;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 6px rgba(255,255,255,.18);pointer-events:none;transition:left .9s cubic-bezier(.3,.8,.3,1),top .9s cubic-bezier(.3,.8,.3,1),transform .15s;opacity:0}#cur.on{opacity:1}#cur.press{transform:scale(.7)}' });
await page.evaluate(() => { const c = document.createElement('div'); c.id = 'cur'; c.style.left = '640px'; c.style.top = '520px'; document.body.appendChild(c); });

await set({ status: 'listening', board: true, visuals: [], boardOrder: [], panels: [], taskBatch: null, checkIn: null, moneyAvailable: true, money: false, caption: null });
await wait(2500); // settle + time to trim the start
const T0 = Date.now();
await wait(1200);
const btn = page.locator('.brain-voice__btn--money');
const box = await btn.boundingBox();
await page.evaluate(({ x, y }) => { const c = document.getElementById('cur'); c.classList.add('on'); c.style.left = x + 'px'; c.style.top = y + 'px'; }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
await wait(1100);
await page.evaluate(() => document.getElementById('cur').classList.add('press'));
await btn.click();
await wait(200);
await page.evaluate(() => { const c = document.getElementById('cur'); c.classList.remove('press'); });
await wait(500);
await page.evaluate(() => document.getElementById('cur').classList.remove('on'));
await set({ status: 'speaking', caption: { role: 'assistant', text: 'کلید سود فعال شد؛ اکنون آماده پاسخگویی به سؤالات مالی شما هستم.' }, visuals: [ready], boardOrder: order(ready) });
await wait(3400);
await set({ status: 'listening', caption: { role: 'user', text: 'لونا، سه ماه آینده پول را کجا خرج کنیم که بیشترین سود را بدهد؟' } });
await wait(3600);
await set({ status: 'thinking', caption: null });
await wait(1600);
await set({ status: 'speaking', caption: { role: 'assistant', text: 'گلوگاه شما فروش نیست؛ خط رنگ‌کاری است. رفع آن ماهانه حدود ۱٫۸ میلیارد تومان سود می‌آورد.' }, visuals: [ready, bars], boardOrder: order(ready, bars) });
await wait(5200);
await set({ caption: { role: 'assistant', text: 'هر هفته که خط دوم رنگ‌کاری دیر راه بیفتد، حدود ۴۳۰ میلیون تومان سود روی میز می‌ماند.' }, visuals: [ready, bars, stat], boardOrder: order(ready, bars, stat) });
await wait(5000);
await set({ caption: { role: 'assistant', text: 'پیشنهاد من: اول گلوگاه رنگ‌کاری، بعد فروشنده.' }, visuals: [ready, bars, stat, steps], boardOrder: order(ready, bars, stat, steps) });
await wait(5200);
await set({ status: 'listening', caption: null });
await wait(1500);
const T1 = Date.now();
// Poster frame: the money answer.
await set({ status: 'speaking', caption: { role: 'assistant', text: 'گلوگاه شما فروش نیست؛ خط رنگ‌کاری است. رفع آن ماهانه حدود ۱٫۸ میلیارد تومان سود می‌آورد.' }, visuals: [ready, bars], boardOrder: order(ready, bars) });
await page.locator('.bv-board__dots, .bv-board').first().waitFor().catch(() => {});
const video = page.video();
await wait(2600);
await page.screenshot({ path: out + '/profit-poster.png' });
// Stills of the board for the gallery (desktop, 2x for crispness).
await context.close();
const videoPath = await video.path();
fs.writeFileSync(out + '/profit-timing.json', JSON.stringify({ video: videoPath, start: (T0 - TC) / 1000, length: (T1 - T0) / 1000 }));
console.log('video', videoPath, 'len', (T1 - T0) / 1000);
await browser.close();
