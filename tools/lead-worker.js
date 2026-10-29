// Cloudflare Worker: receives the demo form from delta-up.github.io and sends it to your Telegram.
// The bot token and your chat id live only in this Worker's secrets (BOT_TOKEN, CHAT_ID), never in the website.
const ORIGINS = ['https://delta-up.github.io'];
const clip = (v, n) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST' || !ORIGINS.includes(origin)) return new Response('Forbidden', { status: 403, headers: cors });
    let body;
    try { body = await request.json(); } catch { return new Response('Bad request', { status: 400, headers: cors }); }
    const name = clip(body.name, 80), org = clip(body.org, 120), phone = clip(body.phone, 30), need = clip(body.need, 40), lang = clip(body.lang, 5);
    if (!name || !org || phone.replace(/\D/g, '').length < 8 || clip(body.website, 1)) return new Response('Bad request', { status: 400, headers: cors });
    const text = `🔔 درخواست جدید از سایت دلتا آپ\n👤 ${name}\n🏢 ${org}\n📞 ${phone}\n🎯 ${need}\n🌐 ${lang}`;
    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.CHAT_ID, text }),
    });
    return new Response(r.ok ? 'ok' : 'telegram error', { status: r.ok ? 200 : 502, headers: cors });
  },
};
