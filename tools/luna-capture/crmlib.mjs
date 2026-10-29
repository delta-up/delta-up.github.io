// Shared: open the CRM showcase harness in a page.
export async function openCrm(page, { dark = true } = {}) {
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.route((u) => u.pathname.startsWith('/api/'), (r) => r.fulfill({ json: {} }));
  await page.route('**/socket.io/**', (r) => r.abort());
  await page.goto('http://127.0.0.1:3010/vazirmatn.css');
  await page.setContent(`<link rel="stylesheet" href="/vazirmatn.css"><style>html,body{margin:0}body{background:${dark ? '#020617' : '#f8fafc'}}#test-root{min-height:100vh}</style><div id="test-root"></div>`);
  await page.evaluate(async (dark) => {
    document.documentElement.dir = 'rtl';
    document.documentElement.classList.toggle('dark', dark);
    const refresh = await import('/@react-refresh'); refresh.default.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (t) => t; window.__vite_plugin_react_preamble_installed__ = true;
    const runtime = await import('/utils/i18n/runtime.ts'); await runtime.loadUiCatalog();
    const { mountLunaCrmShowcase } = await import('/tests/local/fixtures/lunaCrmShowcaseHarness.tsx');
    mountLunaCrmShowcase();
  }, dark);
  await page.getByText('سیمان البرزکوه').first().waitFor({ timeout: 120000 });
}
