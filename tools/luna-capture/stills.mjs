import { createRequire } from 'node:module';
import { openCrm } from './crmlib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.env.OUT || 'media';
const b = await chromium.launch();
// CRM board after intake, 2x
const p = await b.newPage({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 2 });
await openCrm(p, { dark: false });
for (let i = 0; i < 4; i++) await p.evaluate((i) => window.__crmArrive(i), i);
await p.evaluate(() => window.__crmWarm('d10', 'call_ready'));
await p.waitForTimeout(1500);
await p.screenshot({ path: out + '/crm-board@2x.png' });
// Panel of the hot Instagram lead
await p.getByText('فولادکاران زاگرس', { exact: true }).first().click();
await p.waitForTimeout(2500);
await p.screenshot({ path: out + '/crm-panel-new@2x.png' });
// Luna stage stat, 2x
const q = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await q.route((u) => u.pathname.startsWith('/api/'), (r) => r.fulfill({ json: [] }));
await q.route('**/socket.io/**', (r) => r.abort());
await q.goto('http://127.0.0.1:3010/vazirmatn.css');
await q.setContent('<link rel="stylesheet" href="/vazirmatn.css"><style>html,body{margin:0;background:#0b0a1a}</style><div id="test-root"></div>');
await q.evaluate(async () => {
  document.documentElement.dir = 'rtl'; document.documentElement.classList.add('dark');
  const refresh = await import('/@react-refresh'); refresh.default.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (t) => t; window.__vite_plugin_react_preamble_installed__ = true;
  const runtime = await import('/utils/i18n/runtime.ts'); await runtime.loadUiCatalog();
  const { mountBrainVoiceBoardHarness } = await import('/tests/local/fixtures/brainVoiceBoardHarness.tsx');
  mountBrainVoiceBoardHarness();
});
await q.locator('.brain-voice').waitFor({ state: 'visible', timeout: 120000 });
const stat = { id: 'v2', kind: 'stat', title: 'هزینهٔ هر هفته تأخیر', value: '۴۳۰', delta: 'میلیون تومان', deltaTone: 'down', text: 'سودی که تا راه‌افتادن خط دوم رنگ‌کاری، هر هفته روی میز می‌ماند', source: 'موتور سود · دادهٔ نمایشی' };
await q.evaluate((stat) => window.__bvSet({ status: 'speaking', board: true, moneyAvailable: true, money: true, visuals: [stat], boardOrder: [{ panel: 'visual', id: stat.id }], panels: [], taskBatch: null, checkIn: null, caption: { role: 'assistant', text: 'هر هفته که خط دوم رنگ‌کاری دیر راه بیفتد، حدود ۴۳۰ میلیون تومان سود روی میز می‌ماند.' } }), stat);
await q.waitForTimeout(3500);
await q.screenshot({ path: out + '/luna-stat@2x.png' });
await b.close();
console.log('ok');
