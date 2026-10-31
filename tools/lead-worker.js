// Cloudflare Worker: receives the demo form from karnil.ir, deltaup.ir (and delta-up.github.io) and sends it to your Telegram.
// It also receives visitor reports from /track.js on the path /visit (one Telegram message per visit, edited as the visit goes on).
// The bot token and your chat id live only in this Worker's secrets (BOT_TOKEN, CHAT_ID), never in the website.
const ORIGINS = ['https://karnil.ir', 'https://www.karnil.ir', 'http://karnil.ir', 'https://deltaup.ir', 'https://www.deltaup.ir', 'https://delta-up.github.io', 'http://deltaup.ir'];
const clip = (v, n) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (new URL(request.url).pathname === '/visit') return visit(request, env, cors);
    if (request.method !== 'POST' || !ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403, headers: cors });
    let body;
    try { body = await request.json(); } catch { return new Response('Bad request', { status: 400, headers: cors }); }
    const name = clip(body.name, 80), org = clip(body.org, 120), phone = clip(body.phone, 30), need = clip(body.need, 40), modules = clip(body.modules, 600), message = clip(body.message, 1000), lang = clip(body.lang, 5);
    if (!name || !org || phone.replace(/\D/g, '').length < 8 || clip(body.website, 1)) return new Response('Bad request', { status: 400, headers: cors });
    const text = `🔔 درخواست جدید از سایت دلتا آپ\n👤 ${name}\n🏢 ${org}\n📞 ${phone}\n🎯 ${need}${modules ? `\n🧩 ماژول‌ها: ${modules}` : ''}${message ? `\n💬 پیام: ${message}` : ''}\n🌐 ${lang}`;
    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.CHAT_ID, text }),
    });
    if (r.ok) return new Response('ok', { headers: cors });
    const why = (await r.json().catch(() => ({}))).description || r.status;
    return new Response(`telegram error: ${why}`, { status: 502, headers: cors });
  },
};

/* ======================= visitor reports (/visit) ======================= */

const json = (o, cors, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (v, max = 1e13) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.min(x, max) : 0; };

async function sign(env, mid) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('visit:' + env.BOT_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(mid))));
  return [...sig.slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json().catch(() => ({ ok: false, description: String(r.status) }));
}

async function visit(request, env, cors) {
  const origin = request.headers.get('Origin') || '', referer = request.headers.get('Referer') || '';
  const allowed = ORIGINS.includes(origin) || (!origin && ORIGINS.some((o) => referer.startsWith(o + '/')));
  if (request.method !== 'POST' || !allowed) return new Response('Forbidden', { status: 403, headers: cors });
  const raw = await request.text();
  if (raw.length > 60000) return new Response('Too large', { status: 413, headers: cors });
  let b;
  try { b = JSON.parse(raw); } catch { return new Response('Bad request', { status: 400, headers: cors }); }
  if (!b || typeof b !== 'object' || !b.session || !b.visitor) return new Response('Bad request', { status: 400, headers: cors });

  const text = render(b, request);
  const opts = { chat_id: env.CHAT_ID, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } };
  const mid = Number(b.mid);
  if (b.type === 'update' && mid > 0) {
    if (String(b.tok) !== (await sign(env, mid))) return new Response('Forbidden', { status: 403, headers: cors });
    const r = await tg(env, 'editMessageText', { ...opts, message_id: mid });
    if (r.ok || /not modified/i.test(r.description || '')) return json({ mid, tok: b.tok }, cors);
    if (!/not found|can't be edited/i.test(r.description || '')) return json({ error: r.description }, cors, 502);
    // the old message is gone (deleted, or too old to edit): fall through and send a fresh one
  }
  const r = await tg(env, 'sendMessage', opts);
  if (!r.ok) return json({ error: r.description }, cors, 502);
  return json({ mid: r.result.message_id, tok: await sign(env, r.result.message_id) }, cors);
}

/* ---------- formatting helpers ---------- */

const TZ = 'Asia/Tehran';
function when(ms, opts) {
  try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { timeZone: TZ, ...opts }).format(new Date(ms)); } catch { return new Date(ms).toISOString(); }
}
function dur(ms) {
  const s = Math.round(num(ms) / 1000);
  if (s < 60) return `${s} ثانیه`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return r ? `${m} دقیقه و ${r} ثانیه` : `${m} دقیقه`;
  return `${Math.floor(m / 60)} ساعت و ${m % 60} دقیقه`;
}
function ago(ms) {
  const m = Math.round(num(ms) / 60000);
  if (m < 2) return 'همین الان';
  if (m < 60) return `${m} دقیقه پیش`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} ساعت پیش`;
  const d = Math.round(h / 24);
  return d < 60 ? `${d} روز پیش` : `${Math.round(d / 30)} ماه پیش`;
}
const bar = (x, max) => '▰'.repeat(Math.max(1, Math.round((x / max) * 8))) + '▱'.repeat(8 - Math.max(1, Math.round((x / max) * 8)));
const ordinal = (n) => ({ 1: 'اول', 2: 'دوم', 3: 'سوم', 4: 'چهارم', 5: 'پنجم' }[n] || `${n}ام`);

function source(src) {
  const u = (src && src.utm) || {}, ref = String((src && src.ref) || '');
  let host = '';
  try { host = ref ? new URL(ref).hostname.replace(/^www\./, '') : ''; } catch {}
  const R = [
    [/(^|\.)google\./, '🔎 جستجوی گوگل'], [/bing\.com/, '🔎 جستجوی بینگ'], [/yandex\./, '🔎 جستجوی یاندکس'], [/duckduckgo/, '🔎 داک‌داک‌گو'],
    [/yahoo\./, '🔎 یاهو'], [/(^|\.)(zarebin|gerdoo|parsijoo)\./, '🔎 موتور جستجوی ایرانی'], [/chatgpt\.com|openai\.com/, '🤖 ChatGPT'],
    [/perplexity/, '🤖 Perplexity'], [/claude\.ai/, '🤖 Claude'], [/gemini\.google|bard\.google/, '🤖 Gemini'],
    [/(^|\.)t\.me$|telegram/, '✈️ تلگرام'], [/instagram\.com/, '📸 اینستاگرام'], [/linkedin\.com|lnkd\.in/, '💼 لینکدین'],
    [/(^|\.)(t\.co|x\.com|twitter\.com)$/, '🐦 ایکس (توییتر)'], [/facebook\.com|fb\.me/, '📘 فیسبوک'], [/whatsapp/, '🟢 واتس‌اپ'],
    [/eitaa|rubika|bale\.ai|igap|soroush/, '💬 پیام‌رسان ایرانی'], [/youtube\.com|aparat\.com/, '🎞 ویدیو'], [/github\.(com|io)/, '🐙 گیت‌هاب'],
    [/divar\.ir|sheypoor/, '🛒 دیوار / شیپور'], [/mail\./, '✉️ ایمیل'],
  ];
  let label = '';
  if (u.utm_source) label = `🏷 کمپین: ${esc(u.utm_source, 40)}${u.utm_medium ? ' / ' + esc(u.utm_medium, 40) : ''}${u.utm_campaign ? ' / ' + esc(u.utm_campaign, 60) : ''}`;
  else if (u.gclid) label = '💰 تبلیغ گوگل (gclid)';
  else if (u.fbclid) label = '📘 فیسبوک / اینستاگرام (fbclid)';
  else if (host) label = (R.find(([re]) => re.test(host)) || [, '🔗 سایت دیگر'])[1];
  else label = '⌨️ مستقیم (تایپ آدرس، بوکمارک، یا لینک داخل اپ مثل تلگرام/واتس‌اپ)';
  const extra = [];
  if (host) extra.push(`<code>${esc(ref.replace(/^https?:\/\//, ''), 120)}</code>`);
  if (u.utm_term) extra.push(`کلمه: ${esc(u.utm_term, 60)}`);
  if (u.ref) extra.push(`ref=${esc(u.ref, 40)}`);
  return label + (extra.length ? `\n    ${extra.join(' · ')}` : '');
}

function device(e, hdrUa) {
  const ua = String(e.ua || hdrUa || '');
  let os = '', br = '', kind = '';
  let m;
  if ((m = ua.match(/Android ([\d.]+)/))) os = `Android ${m[1]}`;
  else if ((m = ua.match(/(iPhone|iPad|iPod).*? OS ([\d_]+)/))) os = `${m[1]} · iOS ${m[2].replace(/_/g, '.')}`;
  else if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if ((m = ua.match(/Windows NT ([\d.]+)/))) os = `Windows NT ${m[1]}`;
  else if ((m = ua.match(/Mac OS X ([\d_]+)/))) os = `macOS ${m[1].replace(/_/g, '.')}`;
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  if (e.platform && /Windows/.test(e.platform)) os = parseFloat(e.platform.split(' ')[1]) >= 13 ? 'Windows 11' : 'Windows 10';
  else if (e.platform && /Android|macOS/.test(e.platform)) os = e.platform.trim();
  const apps = [[/Instagram/, 'اپ اینستاگرام'], [/FBAN|FBAV/, 'اپ فیسبوک'], [/LinkedInApp/, 'اپ لینکدین'], [/Telegram/i, 'اپ تلگرام'], [/WhatsApp/, 'اپ واتس‌اپ'], [/Twitter/, 'اپ ایکس'], [/; wv\)/, 'مرورگر داخل یک اپ']];
  const app = apps.find(([re]) => re.test(ua));
  if (e.browser) br = e.browser;
  else if ((m = ua.match(/(Edg|OPR|SamsungBrowser|YaBrowser|Firefox|FxiOS|CriOS|Chrome|Version)\/([\d]+)/))) {
    br = { Edg: 'Edge', OPR: 'Opera', SamsungBrowser: 'Samsung Internet', YaBrowser: 'Yandex', FxiOS: 'Firefox', CriOS: 'Chrome', Version: 'Safari' }[m[1]] || m[1];
    br += ' ' + m[2];
  }
  kind = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? '📲 تبلت' : /Mobi|iPhone|Android/.test(ua) || e.mobile ? '📱 موبایل' : '💻 کامپیوتر';
  let model = e.model || '';
  if (!model && (m = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/)) && m[1] !== 'K') model = m[1];
  return [kind, esc(os, 40), esc(model, 40), esc(br, 30), app ? '(' + app[1] + ')' : ''].filter(Boolean).join(' · ');
}

function render(b, request) {
  // Telegram allows 4096 characters: drop the oldest actions until it fits
  for (let keep = 15; ; keep -= 3) {
    const text = build(b, request, Math.max(0, keep));
    if (text.length <= 4000 || keep <= 0) return text.length <= 4000 ? text : text.slice(0, 3990).replace(/<[^>]*$/, '') + '…';
  }
}

function build(b, request, keepEvents) {
  const s = b.session || {}, v = b.visitor || {}, e = b.env || {}, cf = request.cf || {};
  const n = Math.max(1, Math.round(num(v.n, 1e6)));
  const t0 = num(s.t0) || Date.now(), tNow = num(s.now) || Date.now();
  const online = s.on ? '🟢 آنلاین است' : `⚪️ رفت · ${when(tNow, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
  const L = [];

  // headline (this is what shows in the notification preview)
  const where = [cf.city, cf.country].filter(Boolean).join('، ');
  const lead = v.lead && v.lead.name ? ` · ${esc(v.lead.name, 40)}` : '';
  L.push(`<b>${n === 1 ? '🆕 بازدیدکنندهٔ جدید' : `🔁 بازدیدکنندهٔ قدیمی · بار ${ordinal(n)}`}${lead}</b>${where ? ' · ' + esc(where, 60) : ''}`);
  if (b.type === 'update') L.push(online);
  L.push('');

  // when / where / from
  L.push(`🕒 <b>ورود:</b> ${when(t0, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ساعت ${when(t0, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} <i>(وقت تهران)</i>`);
  if (e.tz && e.tz !== TZ) L.push(`    ساعت خود بازدیدکننده: ${esc(e.localTime, 5)} (${esc(e.tz, 40)})`);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const geo = [cf.city, cf.region, cf.country].filter(Boolean).map((x) => esc(x, 40)).join('، ');
  L.push(`📍 <b>مکان:</b> ${geo || 'نامشخص'}${cf.asOrganization ? ` · ${esc(cf.asOrganization, 60)}` : ''}`);
  if (ip) L.push(`    IP: <code>${esc(ip, 45)}</code>${cf.latitude ? ` · <a href="https://maps.google.com/?q=${num(cf.latitude, 90)},${Number(cf.longitude) || 0}">نقشه (تقریبی)</a>` : ''}`);
  L.push(`🔗 <b>از کجا آمد:</b> ${source(s.src)}`);
  L.push(`🚪 <b>صفحهٔ ورود:</b> ${esc(b.host, 40)}${esc(s.land, 80)}`);
  L.push('');

  // history
  if (n === 1) L.push('📚 <b>سابقه:</b> اولین بار است که می‌آید');
  else {
    L.push(`📚 <b>سابقه:</b> بار ${ordinal(n)} است · اولین بازدید ${ago(Date.now() - num(v.first))} · بازدید قبلی ${v.prev ? ago(Date.now() - num(v.prev)) : 'نامشخص'}`);
    if (v.firstSrc) L.push(`    بار اول از: ${source(v.firstSrc)}`);
  }
  if (v.lead && v.lead.name) L.push(`    ⭐️ ${num(v.lead.t) >= t0 ? 'در همین بازدید فرم داد' : 'قبلاً فرم داده'}: <b>${esc(v.lead.name, 60)}</b> · ${esc(v.lead.org, 80)} · <code>${esc(v.lead.phone, 20)}</code> (${ago(Date.now() - num(v.lead.t))})`);
  L.push('');

  // device
  L.push(`${device(e, request.headers.get('User-Agent'))}`);
  const dev = [`صفحه ${esc(e.scr, 20)}`, `پنجره ${esc(e.vp, 12)}`, `زبان مرورگر ${esc(e.lang, 40)}`, e.site ? `زبان سایت ${esc(e.site, 5)}` : '', e.net ? `اینترنت ${esc(e.net, 20)}` : '', e.dark ? 'حالت تاریک' : '', e.mem ? `${num(e.mem, 64)}GB RAM` : ''].filter(Boolean);
  L.push(`    ${dev.join(' · ')}`);
  L.push('');

  // engagement (only when the page sends updates; arrival reports stop here)
  if (b.type !== 'update') { L.push(`<i>🆔 بازدیدکننده ${esc(v.id, 16)}</i>`); return L.join('\n'); }
  const scroll = Object.entries(s.scroll || {}).filter(([, x]) => num(x) > 0).map(([p, x]) => `${esc(p, 20)} ${Math.round(num(x, 100))}%`).join('، ');
  L.push(`⏱ <b>مدت حضور:</b> ${dur(tNow - t0)} · فعال ${dur(s.act)}${scroll ? ` · اسکرول ${scroll}` : ''}`);
  const pages = (Array.isArray(s.pages) ? s.pages : []).slice(-12).map((p) => esc(p, 20));
  if (pages.length > 1) L.push(`👣 <b>مسیر:</b> ${pages.join(' ← ')}`);

  const sec = Object.entries(s.sec || {}).map(([k, x]) => [k, num(x)]).filter(([, x]) => x >= 2000).sort((a, c) => c[1] - a[1]).slice(0, 8);
  if (sec.length) {
    L.push('');
    L.push('🔥 <b>بیشترین توقف:</b>');
    const max = sec[0][1];
    sec.forEach(([k, x], i) => L.push(`${i + 1}. ${bar(x, max)} ${esc(k, 70)} — <b>${dur(x)}</b>`));
  } else if (num(s.act) < 5000) L.push('💨 بدون تعامل (هنوز چیزی ندیده یا سریع رفت)');

  const vid = Object.entries(s.vid || {}).filter(([, x]) => num(x) >= 2000);
  if (vid.length) L.push(`🎬 <b>تماشای ویدیو:</b> ${vid.map(([k, x]) => `${esc(k, 40)} ${dur(x)}`).join('، ')}`);

  const evs = keepEvents ? (Array.isArray(s.ev) ? s.ev : []).slice(-keepEvents) : [];
  if (evs.length) {
    L.push('');
    L.push('⚡️ <b>کارهایی که کرد:</b>');
    evs.forEach((x) => L.push(`${esc(x.i, 4)} ${x.h ? '<b>' : ''}${esc(x.x, 90)}${x.h ? '</b>' : ''} <i>${when(num(x.t), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</i>`));
  }

  L.push('');
  L.push(`<i>🆔 بازدیدکننده ${esc(v.id, 16)} · به‌روز شده ${when(tNow, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}</i>`);
  return L.join('\n');
}
