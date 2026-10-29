// Records the real CRM page filling itself from WhatsApp, Instagram, Telegram and the website (demo data), then opening a customer.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { openCrm } from './crmlib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.env.OUT || 'media';
const size = { width: 960, height: 600 };
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: size, recordVideo: { dir: out + '/raw-crm', size } });
const page = await context.newPage();
const TC = Date.now();
await openCrm(page, { dark: false });
await page.addStyleTag({ content: `
@keyframes lunaArrive{0%{transform:translateY(-18px) scale(.94);opacity:0}25%{opacity:1}55%{box-shadow:0 0 0 5px rgba(99,102,241,.45),0 12px 30px -10px rgba(99,102,241,.5)}100%{transform:none;box-shadow:0 0 0 0 rgba(99,102,241,0)}}
.luna-arrive{animation:lunaArrive 1.5s cubic-bezier(.2,.8,.2,1) both}
@keyframes lunaWarm{0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0)}40%{box-shadow:0 0 0 6px rgba(249,115,22,.5),0 12px 30px -10px rgba(249,115,22,.6)}}
.luna-warm{animation:lunaWarm 1.6s ease both}
#luna-cap{position:fixed;z-index:9999;bottom:22px;left:50%;transform:translate(-50%,16px);opacity:0;transition:all .45s cubic-bezier(.2,.8,.2,1);display:flex;gap:10px;align-items:center;background:#0f172a;color:#fff;font:600 15px Vazirmatn,sans-serif;padding:10px 18px;border-radius:999px;box-shadow:0 12px 30px -8px rgba(15,23,42,.45);white-space:nowrap;direction:rtl}
#luna-cap.on{opacity:1;transform:translate(-50%,0)}
#luna-cap i{width:10px;height:10px;border-radius:50%;display:inline-block}
#luna-cur{position:fixed;z-index:99999;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:3px solid #4f46e5;box-shadow:0 0 0 6px rgba(79,70,229,.2);pointer-events:none;transition:left .8s cubic-bezier(.3,.8,.3,1),top .8s cubic-bezier(.3,.8,.3,1),transform .15s;opacity:0}
#luna-cur.on{opacity:1}#luna-cur.press{transform:scale(.7)}` });
await page.evaluate(() => {
  const c = document.createElement('div'); c.id = 'luna-cap'; document.body.appendChild(c);
  const k = document.createElement('div'); k.id = 'luna-cur'; k.style.left = '560px'; k.style.top = '600px'; document.body.appendChild(k);
});
const COLORS = { whatsapp: '#22c55e', instagram: '#ec4899', telegram: '#38bdf8', website: '#8b5cf6' };
const cap = (text, color) => page.evaluate(({ text, color }) => {
  const c = document.getElementById('luna-cap');
  c.classList.remove('on');
  setTimeout(() => { c.innerHTML = (color ? `<i style="background:${color}"></i>` : '') + text; if (text) c.classList.add('on'); }, 180);
}, { text, color });
const flash = (name, cls) => page.evaluate(({ name, cls }) => {
  const el = [...document.querySelectorAll('p')].find((p) => p.textContent === name);
  const card = el?.closest('.rounded-2xl');
  if (card) { card.classList.remove(cls); void card.offsetWidth; card.classList.add(cls); }
}, { name, cls });
const wait = (ms) => page.waitForTimeout(ms);
const arrive = async (i, name, channel, label) => {
  await cap(`پیام تازه از ${label} · ${name} ← خودش وارد CRM شد`, COLORS[channel]);
  await page.evaluate((i) => window.__crmArrive(i), i);
  await page.getByText(name, { exact: true }).first().waitFor();
  await flash(name, 'luna-arrive');
  await wait(2300);
};

await wait(800);
const T0 = Date.now();
await cap('CRM فروش تجهیزات صنعتی · بدون تایپ', null);
await wait(1800);
await arrive(0, 'رب گلستان', 'whatsapp', 'واتس‌اپ');
await arrive(1, 'فولادکاران زاگرس', 'instagram', 'اینستاگرام');
await arrive(2, 'پارس‌کارتن', 'telegram', 'تلگرام');
await arrive(3, 'شهرک صنعتی شمس‌آباد · واحد ۱۲', 'website', 'سایت');
await cap('فولادکاران زاگرس دوباره پیام داد ← گرم شد: آمادهٔ تماس', '#f97316');
await page.evaluate(() => window.__crmWarm('d10', 'call_ready'));
await wait(300);
await flash('فولادکاران زاگرس', 'luna-warm');
await wait(2600);
// Open the hot customer, with a visible cursor.
const target = page.getByText('فولادکاران زاگرس', { exact: true }).first();
const box = await target.boundingBox();
await page.evaluate(({ x, y }) => { const k = document.getElementById('luna-cur'); k.classList.add('on'); k.style.left = x + 'px'; k.style.top = y + 'px'; }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
await cap('', null);
await wait(1000);
await page.evaluate(() => document.getElementById('luna-cur').classList.add('press'));
await target.click();
await wait(250);
await page.evaluate(() => { const k = document.getElementById('luna-cur'); k.classList.remove('press', 'on'); });
await wait(900);
await cap('گرمای مشتری، کانال ورود و ارزش معامله — در یک نگاه', null);
await wait(4200);
const T1 = Date.now();
const video = page.video();
await context.close();
const path = await video.path();
fs.writeFileSync(out + '/crm-timing.json', JSON.stringify({ video: path, start: (T0 - TC) / 1000, length: (T1 - T0) / 1000 }));
console.log(path, (T1 - T0) / 1000);
await browser.close();
