/* Visitor tracking -> Telegram (through tools/lead-worker.js, path /visit).
   Each visit sends one Telegram message on arrival, and nothing after that.
   Open any page with ?notrack once to stop tracking your own browser (?track undoes it). */
(function () {
  'use strict';
  var EP = 'https://deltaup-lead.karnil227.workers.dev/visit';
  var VKEY = 'kv-visitor', SKEY = 'kv-session', SESSION_GAP = 30 * 60 * 1000, IDLE = 60 * 1000;
  var ls; try { ls = window.localStorage; ls.setItem('kv-t', '1'); ls.removeItem('kv-t'); } catch (e) { return; }
  try {
    if (/[?&]notrack\b/.test(location.search)) ls.setItem('kv-off', '1');
    if (/[?&]track\b/.test(location.search)) ls.removeItem('kv-off');
  } catch (e) {}
  if (ls.getItem('kv-off') || navigator.webdriver || /bot|crawl|spider|slurp|preview|lighthouse|headless|pingdom|uptime/i.test(navigator.userAgent)) return;

  var now = Date.now();
  function rid() { return Math.random().toString(36).slice(2, 10) + now.toString(36).slice(-4); }
  function load(k) { try { return JSON.parse(ls.getItem(k)) || null; } catch (e) { return null; } }
  function save(k, v) { try { ls.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function clip(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ---------- page and section names ---------- */
  var path = location.pathname.replace(/index\.html$/, '') || '/';
  var PAGES = { '/': 'خانه', '/site/': 'سایت کامل', '/deck/': 'ارائه (اسلایدها)', '/form/': 'فرم' };
  var NAMES = {
    '/': { top: 'بالای صفحه (معرفی)', luna: 'لونا', profit: 'لایهٔ مدیریتی · کلید سود', sales: 'لایهٔ فروش', leak: 'ماشین‌حساب نشتی فروش',
      why: 'از مشکل شروع می‌کنیم', how: 'روش کار', measure: 'اندازه‌گیری Δ', layers: 'Δ چطور ساخته می‌شود', faq: 'سؤال‌های مدیران',
      build: 'ماژول‌های لونا (چیدن لونا)', contact: 'تماس / فرم درخواست' }
  };
  var pageName = PAGES[path] || path;
  function sectionName(el) {
    var id = el.id, n = NAMES[path] && NAMES[path][id];
    if (n) return n;
    var h = el.querySelector('h1,h2,h3'), t = h ? clip(h.innerText || h.textContent, 45) : '';
    var slide = (el.getAttribute('aria-label') || '').match(/^(\d+)\s*\/\s*(\d+)/);
    if (slide) return 'اسلاید ' + slide[1] + '/' + slide[2] + (t ? ' — ' + t : '');
    return t || id;
  }

  /* ---------- visitor (persists across visits) and session (30 min inactivity) ---------- */
  var v = load(VKEY), s = load(SKEY), isNewSession = !s || now - (s.seen || 0) > SESSION_GAP || !v;
  if (!v) v = { id: rid(), n: 0, first: now };
  var ref = document.referrer, refHost = '';
  try { refHost = ref ? new URL(ref).hostname : ''; } catch (e) {}
  var internal = refHost && refHost.replace(/^www\./, '') === location.hostname.replace(/^www\./, '');
  var q = new URLSearchParams(location.search), utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ref'].forEach(function (k) { if (q.get(k)) utm[k] = clip(q.get(k), 80); });

  if (isNewSession) {
    var src = { ref: internal ? '' : clip(ref, 300), utm: utm };
    s = { sid: rid(), t0: now, seen: now, mid: null, tok: null, n: v.n + 1, prev: v.last || 0, src: src,
      land: path + (location.hash || ''), pages: [], sec: {}, vid: {}, ev: [], act: 0, vis: 0, scroll: {}, on: 1 };
    v.n += 1; v.prevLast = v.last || 0; v.last = now;
    if (!v.src) v.src = src;
    save(VKEY, v);
  }
  s.pages.push(path); if (s.pages.length > 25) s.pages = s.pages.slice(-25);
  s.seen = now; s.on = 1; save(SKEY, s);

  /* ---------- per-page counters, merged into the shared session on every flush ---------- */
  var d = { act: 0, vis: 0, sec: {}, vid: {}, ev: [] }, maxScroll = 0, lastInput = now, lastFlush = 0, pend = null;
  function ev(icon, text, hot) {
    var last = d.ev[d.ev.length - 1];
    if (last && last.x === text) return;
    d.ev.push({ i: icon, x: clip(text, 70), t: Date.now(), h: hot ? 1 : 0 });
    if (hot) flush(true);
  }
  function merge() {
    var S = load(SKEY);
    if (!S || S.sid !== s.sid) S = s;
    S.act += d.act; S.vis += d.vis;
    Object.keys(d.sec).forEach(function (k) { S.sec[k] = (S.sec[k] || 0) + d.sec[k]; });
    Object.keys(d.vid).forEach(function (k) { S.vid[k] = (S.vid[k] || 0) + d.vid[k]; });
    S.ev = S.ev.concat(d.ev).slice(-40);
    S.scroll[path] = Math.max(S.scroll[path] || 0, maxScroll);
    S.seen = Date.now();
    d = { act: 0, vis: 0, sec: {}, vid: {}, ev: [] };
    s = S; save(SKEY, s); return s;
  }

  /* ---------- static facts about the browser / device ---------- */
  var env = {
    ua: clip(navigator.userAgent, 300), lang: clip((navigator.languages || [navigator.language]).slice(0, 3).join(', '), 40),
    tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ''; } })(),
    scr: screen.width + '×' + screen.height + (window.devicePixelRatio > 1 ? ' @' + Math.round(window.devicePixelRatio * 10) / 10 + 'x' : ''),
    vp: innerWidth + '×' + innerHeight, touch: navigator.maxTouchPoints > 0 ? 1 : 0,
    dark: window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0,
    net: navigator.connection ? clip((navigator.connection.effectiveType || '') + (navigator.connection.saveData ? ' save-data' : ''), 20) : '',
    mem: navigator.deviceMemory || 0, cpu: navigator.hardwareConcurrency || 0,
    site: (function () { try { return ls.getItem('du-lang') || document.documentElement.lang; } catch (e) { return ''; } })(),
    localTime: (function () { var t = new Date(); return ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2); })()
  };
  var hints = navigator.userAgentData && navigator.userAgentData.getHighEntropyValues
    ? Promise.race([navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'fullVersionList']).then(function (h) {
        env.model = clip(h.model, 40); env.platform = clip(h.platform + ' ' + (h.platformVersion || ''), 30); env.mobile = h.mobile ? 1 : 0;
        var b = (h.fullVersionList || []).filter(function (x) { return !/Not.?A.?Brand|Chromium/i.test(x.brand); })[0];
        if (b) env.browser = clip(b.brand + ' ' + b.version.split('.')[0], 30);
      }).catch(function () {}), new Promise(function (r) { setTimeout(r, 400); })])
    : Promise.resolve();

  /* ---------- sending ---------- */
  function payload(type) {
    var S = merge();
    return { type: type, mid: S.mid, tok: S.tok, sid: S.sid, page: path, pageName: pageName, host: location.hostname,
      visitor: { id: v.id, n: S.n, first: v.first, prev: S.prev, firstSrc: v.src && JSON.stringify(v.src) !== JSON.stringify(S.src) ? v.src : null, lead: v.lead || null },
      session: { t0: S.t0, now: Date.now(), src: S.src, land: S.land, pages: S.pages, sec: S.sec, vid: S.vid, ev: S.ev, act: S.act, vis: S.vis, scroll: S.scroll, on: S.on },
      env: env };
  }
  function post(body, wantReply) {
    var str = JSON.stringify(body);
    if (!wantReply && navigator.sendBeacon && document.visibilityState === 'hidden') {
      if (navigator.sendBeacon(EP, new Blob([str], { type: 'text/plain' }))) return Promise.resolve(null);
    }
    return fetch(EP, { method: 'POST', body: str, headers: { 'Content-Type': 'text/plain' }, keepalive: str.length < 60000, mode: 'cors', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json().catch(function () { return null; }) : null; }).catch(function () { return null; });
  }
  var starting = null;
  function start() {
    var S0 = load(SKEY) || s; S0.st = Date.now(); s.st = S0.st; save(SKEY, S0);
    starting = hints.then(function () { return post(payload('start'), true); }).then(function (r) {
      if (r && r.mid) { var S = load(SKEY) || s; S.mid = r.mid; S.tok = r.tok; s = S; save(SKEY, S); }
      starting = null; if (pend) { pend = null; flush(true); }
    });
  }
  function flush(force) {
    return; /* only the arrival is reported; the message is no longer edited afterwards */
    var t = Date.now();
    if (!force && t - lastFlush < 15000) return;
    if (starting) { pend = 1; return; }
    var S = load(SKEY) || s;
    if (S.sid === s.sid && S.mid) { s.mid = S.mid; s.tok = S.tok; }
    /* another page of this visit is still creating the message: wait for it instead of sending a second one */
    if (!s.mid && S.st && t - S.st < 8000 && document.visibilityState === 'visible') { setTimeout(function () { flush(true); }, 3000); return; }
    lastFlush = t;
    if (!s.mid) { var S1 = load(SKEY) || s; S1.st = t; save(SKEY, S1); }
    post(payload(s.mid ? 'update' : 'start'), !s.mid).then(function (r) {
      if (r && r.mid) { var S2 = load(SKEY) || s; S2.mid = r.mid; S2.tok = r.tok; s = S2; save(SKEY, S2); }
    });
  }

  /* ---------- engagement: sample once a second ---------- */
  ['scroll', 'mousemove', 'keydown', 'touchstart', 'click', 'wheel'].forEach(function (e) {
    addEventListener(e, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });
  function scrollPct() {
    var h = document.documentElement.scrollHeight - innerHeight;
    return h > 0 ? Math.min(100, Math.round(scrollY / h * 100)) : 100;
  }
  setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    d.vis += 1000;
    var playing = false;
    [].forEach.call(document.querySelectorAll('video'), function (vd) {
      if (!vd.paused && !vd.ended && !vd.loop) { playing = true; var k = videoName(vd); d.vid[k] = (d.vid[k] || 0) + 1000; }
    });
    if (Date.now() - lastInput > IDLE && !playing) return;
    d.act += 1000;
    maxScroll = Math.max(maxScroll, scrollPct());
    var dlg = document.querySelector('dialog[open]'), name;
    if (dlg) name = dlg.id === 'launch-film-dialog' ? '🎬 فیلم گفتگو با لونا' : 'پنجرهٔ ' + (dlg.id || 'باز');
    else {
      var el = document.elementFromPoint(innerWidth / 2, innerHeight / 2), sec = el && el.closest('section[id]');
      if (!sec) sec = [].filter.call(document.querySelectorAll('section[id]'), function (x) {
        var r = x.getBoundingClientRect(); return r.height && r.top <= innerHeight / 2 && r.bottom >= innerHeight / 2;
      })[0];
      name = sec ? sectionName(sec) : null;
    }
    if (name) { name = (path !== '/' ? pageName + ' › ' : '') + name; d.sec[name] = (d.sec[name] || 0) + 1000; }
  }, 1000);
  setInterval(function () { if (document.visibilityState === 'visible') flush(false); }, 60000);

  function videoName(vd) {
    var src = vd.currentSrc || vd.src || (vd.querySelector('source') || {}).src || '';
    if (/launch\/film/.test(src) || vd.closest('#launch-film-dialog')) return 'فیلم گفتگو با لونا';
    if (/profit/.test(src)) return 'ویدیو کلید سود'; if (/crm/.test(src)) return 'ویدیو CRM';
    return clip(src.split('/').pop() || 'ویدیو', 30);
  }

  /* ---------- notable actions ---------- */
  document.addEventListener('play', function (e) { if (e.target.tagName === 'VIDEO' && !e.target.loop) ev('▶️', 'پخش ' + videoName(e.target)); }, true);
  document.addEventListener('ended', function (e) { if (e.target.tagName === 'VIDEO' && !e.target.loop) ev('✅', videoName(e.target) + ' را تا آخر دید'); }, true);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a,button,summary,[role=button]');
    if (!a) return;
    var href = a.getAttribute('href') || '', label = clip(a.innerText || a.getAttribute('aria-label') || a.title || '', 40);
    if (/^tel:/.test(href)) return ev('📞', 'کلیک روی تماس ' + href.slice(4), true);
    if (/wa\.me|whatsapp/.test(href)) return ev('🟢', 'کلیک روی واتس‌اپ ' + (href.match(/wa\.me\/(\d+)/) || [])[1], true);
    if (/t\.me\//.test(href)) return ev('✈️', 'کلیک روی تلگرام ' + href.split('t.me/')[1], true);
    if (/^mailto:/.test(href)) return ev('✉️', 'کلیک روی ایمیل', true);
    if (/\.pdf($|\?)/i.test(href)) return ev('📄', 'دانلود ' + href.split('/').pop(), true);
    if (a.tagName === 'SUMMARY') return ev('❓', 'باز کردن: ' + label);
    if (/^https?:/.test(href) && a.hostname !== location.hostname) return ev('↗️', 'لینک بیرونی: ' + a.hostname);
    if (label && a.type !== 'submit') ev('👆', label);
  }, true);
  document.addEventListener('change', function (e) {
    if (e.target.id === 'langSel') ev('🌐', 'تغییر زبان به ' + e.target.value);
  }, true);
  var typed = {};
  document.addEventListener('input', function (e) {
    var f = e.target.form, sec = e.target.closest && e.target.closest('section[id]'), k = (f && f.id) || (sec && sec.id) || 'x';
    if (typed[k]) return; typed[k] = 1;
    ev('⌨️', k === 'lead' ? 'شروع به پر کردن فرم درخواست' : 'کار با ' + (sec ? sectionName(sec) : 'فرم'));
  }, true);
  document.addEventListener('copy', function () { ev('📋', 'کپی متن: ' + clip(String(getSelection()), 40)); }, true);

  /* lead form: remember who they are, so their next visits are recognised */
  var lead = document.getElementById('lead'), snap = null;
  if (lead) {
    document.addEventListener('submit', function (e) {
      if (e.target !== lead) return;
      var el = lead.elements;
      snap = { name: clip(el.name && el.name.value, 60), org: clip(el.org && el.org.value, 80), phone: clip(el.phone && el.phone.value, 20) };
      ev('📝', 'دکمهٔ ارسال فرم را زد');
    }, true);
    new MutationObserver(function () {
      if (lead.classList.contains('sent') && snap) {
        v.lead = { name: snap.name, org: snap.org, phone: snap.phone, t: Date.now() }; save(VKEY, v);
        ev('🎉', 'فرم ارسال شد: ' + snap.name + ' · ' + snap.org + ' · ' + snap.phone, true); snap = null;
      }
    }).observe(lead, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- lifecycle ---------- */
  document.addEventListener('visibilitychange', function () {
    var S = load(SKEY) || s;
    if (document.visibilityState === 'hidden') { S.on = 0; s.on = 0; save(SKEY, S); flush(true); }
    else {
      if (Date.now() - (S.seen || 0) > SESSION_GAP) { location.reload(); return; }
      S.on = 1; s.on = 1; save(SKEY, S); lastInput = Date.now(); flush(true);
    }
  });
  addEventListener('pagehide', function () { var S = load(SKEY) || s; S.on = 0; s.on = 0; save(SKEY, S); flush(true); });

  if (isNewSession && !s.mid) start();
  else setTimeout(function () { flush(true); }, 1500);
})();
