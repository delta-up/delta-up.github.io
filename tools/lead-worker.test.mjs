import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('./lead-worker.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('Karnil submissions forward selected modules and the customer message to Telegram', async () => {
  const originalFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body));
    return new Response('{"ok":true}');
  };
  try {
    for (const origin of ['https://karnil.ir', 'https://www.karnil.ir', 'https://deltaup.ir']) {
      const preflight = await worker.fetch(new Request('https://worker.test', { method: 'OPTIONS', headers: { Origin: origin } }), {});
      assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
      const response = await worker.fetch(new Request('https://worker.test', {
        method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test customer', org: 'Test company', phone: '09123456789', need: 'Luna', modules: 'مدیریت ارتباط با مشتری (وب‌سایت، اینستاگرام)، فروش', message: 'لطفاً برای دموی ماژول‌ها تماس بگیرید.\nThank you!', lang: 'fa' }),
      }), { BOT_TOKEN: 'test-token', CHAT_ID: 'test-chat' });
      assert.equal(response.status, 200);
      assert.equal(sent.at(-1).chat_id, 'test-chat');
      assert.ok(sent.at(-1).text.includes('🧩 ماژول‌ها: مدیریت ارتباط با مشتری (وب‌سایت، اینستاگرام)، فروش'));
      assert.ok(sent.at(-1).text.includes('💬 پیام: لطفاً برای دموی ماژول‌ها تماس بگیرید.\nThank you!'));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
