# Telegram form deployment

The published home page posts `modules` and `message` to
`https://deltaup-lead.karnil227.workers.dev`. The receiving Cloudflare Worker
must run the current `tools/lead-worker.js` source. Updating GitHub Pages alone
does not update that Worker.

In the Cloudflare dashboard, open **Workers & Pages → deltaup-lead → Edit code**,
replace the Worker code with `tools/lead-worker.js`, and deploy. Preserve the
existing `BOT_TOKEN` and `CHAT_ID` secrets. The allowed origins include
`https://karnil.ir` and `https://www.karnil.ir` as well as the legacy domains.

Local verification (mocks Telegram; does not send notifications):

```sh
node --test tools/lead-worker.test.mjs
```

After deploying, select modules on the live home page, enter a customer message,
and submit the form. Confirm that the Telegram notification includes both
`🧩 ماژول‌ها:` and `💬 پیام:` with the submitted values.
