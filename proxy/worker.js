/* واسط شخصی میز سیگنال — روی Cloudflare Workers
 *
 * چرا لازم است: واسط‌های عمومی رایگان (allorigins، codetabs، cors.lol و …) یا شلوغ‌اند،
 * یا حالا کلید API می‌خواهند، یا روی شبکه‌ی ایران فیلترند. این فایل همان کار را می‌کند
 * ولی فقط برای تو، پس نه صف دارد نه سهمیه.
 *
 * نصب:
 *   ۱) در dash.cloudflare.com → Workers & Pages → Create → Worker
 *   ۲) محتوای همین فایل را جایگزین کد پیش‌فرض کن و Deploy بزن
 *   ۳) آدرسی که می‌دهد را در تنظیمات برنامه، کادر «واسط شخصی» بگذار، به این شکل:
 *        https://<اسم-ورکر>.<اکانت>.workers.dev/?url={url}
 *
 * آدرس workers.dev روی بعضی شبکه‌های ایران باز نیست. اگر باز نشد، در تب Settings → Domains
 * یک دامنه‌ی خودت را به ورکر وصل کن و همان آدرس را در برنامه بگذار.
 *
 * هشدار تلگرام وقتی برنامه بسته است (اختیاری) — پایین همین فایل، بخش «هشدار تلگرام» را ببین.
 */

/* فقط این میزبان‌ها؛ وگرنه ورکرِ تو تبدیل می‌شود به پروکسی باز برای همه‌ی اینترنت */
const ALLOW = [
  't.me',
  'telesco.pe',          // عکس پست‌ها (خروجی PDF/PNG آموزش)
  'cdn-telegram.org',
  'api.binance.com',
  'fapi.binance.com',   // کندلِ کوین‌هایی که فقط فیوچرز دارند (کانال‌سنج)
  'api.mexc.com',
  'api.gateio.ws',
  'www.okx.com',
  'api.kucoin.com',
  'api.bitget.com'
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

const allowed = host => ALLOW.some(h => host === h || host.endsWith('.' + h));

/* ---------- انبار داده ----------
 * برای اینکه داده‌ی برنامه روی همه‌ی دستگاه‌ها یکی باشد، ورکر یک جای ذخیره هم دارد.
 * لازم است در تنظیمات ورکر اینها را بسازی:
 *   Storage & Databases → KV → یک namespace بساز → در ورکر با نام STORE وصلش کن
 *   Settings → Variables and Secrets → یک Secret به نام SYNC_TOKEN با یک رمز طولانی
 * بدون SYNC_TOKEN هیچ‌کس نمی‌تواند داده را بخواند یا بنویسد.
 */
const KEY = 'signaldesk';

function authed(request, env) {
  const want = env && env.SYNC_TOKEN;
  if (!want) return false;
  const got = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  // مقایسه‌ی طول‌ثابت تا از روی زمانِ پاسخ نشود رمز را حدس زد
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

async function handleDb(request, env) {
  if (!env || !env.STORE) return json({ error: 'kv-missing',
    message: 'انبار KV به ورکر وصل نشده. در تنظیمات ورکر یک KV namespace با نام STORE ببند.' }, 500);
  if (!env.SYNC_TOKEN) return json({ error: 'token-missing',
    message: 'رمز همگام‌سازی تعریف نشده. یک Secret به نام SYNC_TOKEN بساز.' }, 500);
  if (!authed(request, env)) return json({ error: 'unauthorized', message: 'رمز همگام‌سازی درست نیست' }, 401);

  const cur = JSON.parse((await env.STORE.get(KEY)) || 'null') || { rev: 0, at: 0, data: null };

  if (request.method === 'GET') return json(cur);

  if (request.method === 'PUT') {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad-json' }, 400); }
    if (!body || typeof body !== 'object' || body.data === undefined)
      return json({ error: 'bad-body', message: 'data لازم است' }, 400);

    // هم‌زمانی خوش‌بینانه: اگر دستگاه دیگری وسط کار نوشته باشد، نسخه جا نمی‌افتد و
    // به‌جای پاک کردنش، نسخه‌ی فعلی برگردانده می‌شود تا برنامه تصمیم بگیرد.
    if (Number(body.rev) !== Number(cur.rev))
      return json({ error: 'conflict', server: cur }, 409);

    const next = { rev: Number(cur.rev) + 1, at: Date.now(), data: body.data };
    await env.STORE.put(KEY, JSON.stringify(next));
    return json({ rev: next.rev, at: next.at });
  }
  return json({ error: 'method' }, 405);
}

const json = (obj, status) => new Response(JSON.stringify(obj), {
  status: status || 200,
  headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS)
});

export default {
  // هر دقیقه (با Cron Trigger): قیمت پوزیشن‌های باز را می‌سنجد و سر استاپ و تارگت پیام می‌دهد
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tgCheck(env).catch(() => null));
  },
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const path = new URL(request.url).pathname;
    if (path === '/db') return handleDb(request, env);
    if (path.startsWith('/tg/')) return handleTg(request, env, path.slice(4));
    if (path === '/feed' || path.startsWith('/feed/')) return handleFeed(request, env, path.slice(6));
    if (path.startsWith('/f/')) return serveFeed(request, env, path.slice(3));

    if (request.method !== 'GET') return text('فقط GET', 405);

    const raw = new URL(request.url).searchParams.get('url');
    if (!raw) return text('پارامتر url لازم است', 400);

    let target;
    try { target = new URL(raw); } catch { return text('آدرس درست نیست', 400); }
    if (target.protocol !== 'https:') return text('فقط https', 400);
    if (!allowed(target.hostname)) return text('این میزبان مجاز نیست: ' + target.hostname, 403);

    let upstream;
    try {
      upstream = await fetch(target.toString(), {
        headers: {
          // t.me بدون این هدرها نسخه‌ی خالی یا صفحه‌ی «برنامه را باز کن» می‌دهد
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                        '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'follow',
        cf: { cacheTtl: 20, cacheEverything: true }   // ۲۰ ثانیه کش: بروزرسانی هر دقیقه را سبک می‌کند
      });
    } catch (e) {
      return text('به مقصد نرسید: ' + (e && e.message ? e.message : e), 502);
    }

    const headers = new Headers(CORS);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8');
    headers.set('Cache-Control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};

const text = (msg, status) =>
  new Response(msg, { status, headers: Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, CORS) });

/* ==================== هشدار تلگرام ====================
 * برنامه فقط وقتی باز است قیمت را می‌بیند. این بخش همان داده‌ی همگام‌سازی (KV) را هر دقیقه
 * می‌خواند و اگر پوزیشنی به استاپ، نزدیکِ استاپ، لیکوئید یا تارگتِ پله‌ی بعدیِ نقشه رسید،
 * با ربات تلگرامِ خودت پیام می‌دهد. به صرافی کاری ندارد و پوزیشن را هم عوض نمی‌کند؛ ثبتِ
 * بسته شدن را خود برنامه دفعه‌ی بعد که بازش کنی از روی کندل‌ها انجام می‌دهد.
 *
 * راه‌اندازی (یک بار):
 *   ۱) همگام‌سازی باید روشن باشد (STORE و SYNC_TOKEN بالا).
 *   ۲) در تلگرام به @BotFather پیام بده، /newbot بزن و توکنی که می‌دهد را بردار.
 *   ۳) در ورکر: Settings → Variables and Secrets → یک Secret به نام TG_BOT_TOKEN با همان توکن.
 *   ۴) در ورکر: Settings → Triggers → Cron Triggers → Add → «* * * * *» (هر دقیقه).
 *   ۵) به ربات خودت در تلگرام یک پیام بده (مثلاً /start).
 *   ۶) در برنامه: تنظیمات → همگام‌سازی → «وصل کردن تلگرام». ورکر شناسه‌ی چتت را پیدا و ذخیره می‌کند.
 */
const TGKEY = 'signaldesk:tg';          // {chat, at}
const ALKEY = 'signaldesk:alerted';     // {کلید هشدار: زمان} تا هر هشدار یک بار بیاید

async function handleTg(request, env, action) {
  if (!env || !env.STORE || !env.SYNC_TOKEN) return json({ error: 'sync-missing',
    message: 'اول همگام‌سازی را راه بینداز (STORE و SYNC_TOKEN).' }, 500);
  if (!authed(request, env)) return json({ error: 'unauthorized', message: 'رمز همگام‌سازی درست نیست' }, 401);
  if (!env.TG_BOT_TOKEN) return json({ error: 'bot-missing',
    message: 'توکن ربات تعریف نشده. در ورکر یک Secret به نام TG_BOT_TOKEN بساز.' }, 400);
  const cfg = JSON.parse((await env.STORE.get(TGKEY)) || 'null') || {};

  if (action === 'status') return json({ linked: !!cfg.chat, name: cfg.name || null, at: cfg.at || 0 });

  if (action === 'link') {
    const r = await tgApi(env, 'getUpdates', { limit: 50 });
    if (!r || !r.ok) return json({ error: 'tg', message: 'تلگرام جواب نداد: ' + ((r && r.description) || '—') }, 502);
    const msgs = (r.result || []).map(u => u.message || u.edited_message).filter(m => m && m.chat && m.chat.type === 'private');
    const m = msgs[msgs.length - 1];
    if (!m) return json({ error: 'no-chat', message: 'پیامی به ربات پیدا نشد. اول به ربات خودت در تلگرام یک پیام بده (مثلاً /start) و دوباره بزن.' }, 404);
    const next = { chat: m.chat.id, name: [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' ') || m.chat.username || '', at: Date.now() };
    await env.STORE.put(TGKEY, JSON.stringify(next));
    await tgSend(env, next.chat, '✅ میز سیگنال وصل شد.\nاز این به بعد سر استاپ و تارگت پوزیشن‌های بازت همین‌جا خبر می‌دهم — حتی وقتی برنامه بسته است.');
    return json({ linked: true, name: next.name });
  }
  if (action === 'unlink') {
    await env.STORE.delete(TGKEY);
    return json({ linked: false });
  }
  if (action === 'test') {
    if (!cfg.chat) return json({ error: 'not-linked', message: 'هنوز وصل نشده' }, 400);
    const r = await tgSend(env, cfg.chat, '🔔 پیام آزمایشی میز سیگنال — هشدارها همین‌جا می‌آیند.');
    return r && r.ok ? json({ ok: true }) : json({ error: 'tg', message: 'نفرستاد: ' + ((r && r.description) || '—') }, 502);
  }
  if (action === 'check') return json(await tgCheck(env));
  return json({ error: 'action' }, 404);
}

async function tgApi(env, method, body) {
  try {
    const r = await fetch('https://api.telegram.org/bot' + env.TG_BOT_TOKEN + '/' + method, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {})
    });
    return await r.json();
  } catch (e) { return { ok: false, description: String(e && e.message || e) }; }
}
const tgSend = (env, chat, text) => tgApi(env, 'sendMessage', { chat_id: chat, text, disable_web_page_preview: true });

/* قیمت: مارک پرایس فیوچرز برای فیوچرز، قیمت اسپات برای اسپات؛ هر کدام با یک منبع جایگزین */
async function getJson(url) {
  try { const r = await fetch(url, { cf: { cacheTtl: 15 } }); return r.ok ? await r.json() : null; } catch { return null; }
}
async function markPrices() {
  const m = new Map();
  const add = (sym, px) => {
    if (!sym || !(px > 0) || !sym.endsWith('USDT')) return;
    let b = sym.slice(0, -4), k = 1;
    const mm = b.match(/^(1000000|100000|10000|1000|1M)([A-Z0-9]+)$/);
    if (mm) { k = mm[1] === '1M' ? 1e6 : +mm[1]; b = mm[2]; }
    if (!m.has(b) || k === 1) m.set(b, px / k);
  };
  const bn = await getJson('https://fapi.binance.com/fapi/v1/premiumIndex');
  if (Array.isArray(bn)) for (const x of bn) add(x.symbol, parseFloat(x.markPrice));
  if (m.size < 20) {
    const ok = await getJson('https://www.okx.com/api/v5/public/mark-price?instType=SWAP');
    for (const x of (ok && ok.data) || []) if (/-USDT-SWAP$/.test(x.instId)) add(x.instId.replace('-USDT-SWAP', 'USDT'), parseFloat(x.markPx));
  }
  return m;
}
async function spotPrices() {
  const m = new Map();
  const bn = await getJson('https://api.binance.com/api/v3/ticker/price');
  if (Array.isArray(bn)) for (const x of bn) if (x.symbol.endsWith('USDT')) m.set(x.symbol.slice(0, -4), parseFloat(x.price));
  if (m.size < 20) {
    const g = await getJson('https://api.gateio.ws/api/v4/spot/tickers');
    if (Array.isArray(g)) for (const x of g) if (/_USDT$/.test(x.currency_pair)) m.set(x.currency_pair.slice(0, -5), parseFloat(x.last));
  }
  return m;
}

const fmt = v => {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  return a >= 1000 ? v.toFixed(1).replace(/\.0$/, '') : a >= 1 ? v.toFixed(3).replace(/\.?0+$/, '') : v.toPrecision(4);
};
const MMR = 0.005;
function pbStop(p, c) {
  const pb = p.pb; if (!pb) return null;
  let lvl = 0;
  if (pb.trail && c >= 1) lvl = c; else if (pb.be && c >= pb.be) lvl = 1;
  return lvl === 0 ? null : lvl === 1 ? p.entry : pb.tps[lvl - 2];
}

/* یک دور بررسی. خروجی برای «check» دستی: چند پوزیشن و چند پیام */
async function tgCheck(env) {
  if (!env || !env.STORE || !env.TG_BOT_TOKEN) return { skipped: 'config' };
  const cfg = JSON.parse((await env.STORE.get(TGKEY)) || 'null');
  if (!cfg || !cfg.chat) return { skipped: 'not-linked' };
  const db = JSON.parse((await env.STORE.get(KEY)) || 'null');
  const data = db && db.data;
  if (!data || !Array.isArray(data.positions)) return { skipped: 'no-data' };
  const feat = (data.settings && data.settings.feat) || {};
  if (feat.alerts === false) return { skipped: 'alerts-off' };
  const open = data.positions.filter(p => p && p.status === 'open' && p.entry > 0 && p.ticker);
  if (!open.length) return { open: 0, sent: 0 };

  const needFut = open.some(p => p.kind !== 'spot'), needSpot = open.some(p => p.kind === 'spot');
  const [mark, spot] = await Promise.all([needFut ? markPrices() : new Map(), (needSpot || needFut) ? spotPrices() : new Map()]);
  const done = JSON.parse((await env.STORE.get(ALKEY)) || '{}');
  const now = Date.now(), msgs = [];
  const fire = (key, text) => { if (done[key]) return; done[key] = now; msgs.push(text); };

  for (const p of open) {
    const fut = p.kind !== 'spot';
    const px = (fut && mark.get(p.ticker)) || spot.get(p.ticker);
    if (!(px > 0)) continue;
    const sign = p.dir === 'short' ? -1 : 1;
    const side = fut ? (sign > 0 ? 'لانگ' : 'شورت') + ' ' + p.lev + 'x' : 'اسپات';
    const head = p.ticker + ' ' + side;
    const src = fut && mark.get(p.ticker) ? 'مارک' : 'قیمت';
    const liq = fut && p.lev > 1.05 && 1 / p.lev - MMR > 0 ? p.entry * (1 - sign * (1 / p.lev - MMR)) : null;
    if (liq != null && (px - liq) * sign <= 0 && (!p.stop || (p.stop - liq) * sign < 0)) {
      fire(p.id + ':liq', '⛔️ ' + head + ' — قیمت از لیکوئید (' + fmt(liq) + ') رد شد\n' + src + ': ' + fmt(px));
      continue;
    }
    if (p.stop > 0) {
      if ((px - p.stop) * sign <= 0) {
        fire(p.id + ':stop:' + p.stop, '🔴 ' + head + ' — به حد ضرر رسید\n' + src + ': ' + fmt(px) + ' · استاپ: ' + fmt(p.stop) +
          '\nبرنامه را باز کن تا بسته شدنش ثبت شود.');
        continue;
      }
      const d = Math.abs(p.entry - p.stop);
      if (d > 0 && Math.abs(px - p.stop) / d < 0.25)
        fire(p.id + ':near:' + p.stop, '🟠 ' + head + ' — نزدیک حد ضرر\n' + src + ': ' + fmt(px) + ' · استاپ: ' + fmt(p.stop));
    }
    if (p.pb && Array.isArray(p.pb.tps)) {
      const i = p.pbc || 0;
      if (i < p.pb.tps.length && (px - p.pb.tps[i]) * sign >= 0) {
        const bits = [];
        const f = p.pb.parts && p.pb.parts[i];
        if (f > 0) bits.push('ببند ' + Math.round(f * 100) + '٪');
        const sp = pbStop(p, i + 1), prev = i ? pbStop(p, i) : null;
        if (sp != null && sp !== prev) bits.push('استاپ ← ' + (sp === p.entry ? 'ورود' : fmt(sp)));
        fire(p.id + ':pb' + i, '🟢 ' + head + ' — به تارگت ' + (i + 1) + ' (' + fmt(p.pb.tps[i]) + ') رسید\n' +
          'طبق نقشه: ' + (bits.join(' · ') || 'فقط رد شو') + '\n' + src + ': ' + fmt(px));
      }
    } else {
      const tg = (p.targets || []).filter(t => t > 0 && (t - p.entry) * sign > 0).sort((a, b) => (a - b) * sign);
      tg.forEach((t, i) => { if ((px - t) * sign >= 0) fire(p.id + ':tp' + i, '🟢 ' + head + ' — به تارگت ' + (i + 1) + ' (' + fmt(t) + ') رسید\n' + src + ': ' + fmt(px)); });
    }
  }

  let sent = 0;
  for (const t of msgs.slice(0, 10)) { const r = await tgSend(env, cfg.chat, t); if (r && r.ok) sent++; }
  if (msgs.length) {
    // کلیدهای پوزیشن‌های بسته‌شده و خیلی قدیمی پاک می‌شوند تا انبار بزرگ نشود
    const live = new Set(open.map(p => String(p.id)));
    for (const k of Object.keys(done)) if (!live.has(k.split(':')[0]) || now - done[k] > 30 * 864e5) delete done[k];
    await env.STORE.put(ALKEY, JSON.stringify(done));
  }
  return { open: open.length, sent, pending: msgs.length };
}

/* ==================== لینک خروجی سیگنال‌ها ====================
 * برنامه قالب‌های ICS/RSS/CSV/JSON را می‌سازد و اینجا می‌گذارد (PUT /feed با رمز همگام‌سازی).
 * برنامه‌ی دیگر (تقویم، برنامه‌ریز، گوگل‌شیت…) بدون رمز از لینک /f/<کلید>/signals.<قالب> می‌خواند.
 * کلید یک رشته‌ی تصادفی جداست، نه SYNC_TOKEN: لینک فقط سیگنال‌ها را نشان می‌دهد و با
 * «لینک تازه» (POST /feed/rotate) باطل می‌شود.
 */
const FEEDKEY = 'signaldesk:feed';       // {at, n, files:{ics,rss,csv,json}}
const FEEDKEYK = 'signaldesk:feedkey';   // کلید لینک
const FEED_TYPES = { ics: 'text/calendar; charset=utf-8', rss: 'application/rss+xml; charset=utf-8',
  csv: 'text/csv; charset=utf-8', json: 'application/json; charset=utf-8' };
const newKey = () => { const a = new Uint8Array(18); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };

async function handleFeed(request, env, action) {
  if (!env || !env.STORE || !env.SYNC_TOKEN) return json({ error: 'sync-missing',
    message: 'اول همگام‌سازی را راه بینداز (STORE و SYNC_TOKEN).' }, 500);
  if (!authed(request, env)) return json({ error: 'unauthorized', message: 'رمز همگام‌سازی درست نیست' }, 401);
  let key = await env.STORE.get(FEEDKEYK);
  if (action === 'rotate' && request.method === 'POST') {
    key = newKey(); await env.STORE.put(FEEDKEYK, key);
    return json({ key });
  }
  if (action === '' && request.method === 'PUT') {
    let body; try { body = await request.json(); } catch { return json({ error: 'bad-json' }, 400); }
    const files = body && body.files;
    if (!files || typeof files !== 'object' || !Object.keys(FEED_TYPES).every(k => typeof files[k] === 'string'))
      return json({ error: 'bad-body', message: 'files با چهار قالب لازم است' }, 400);
    if (!key) { key = newKey(); await env.STORE.put(FEEDKEYK, key); }
    const at = Date.now();
    await env.STORE.put(FEEDKEY, JSON.stringify({ at, n: Number(body.n) || 0, files }));
    return json({ key, at });
  }
  if (action === 'info') {
    const cur = JSON.parse((await env.STORE.get(FEEDKEY)) || 'null');
    return json({ key: key || null, at: cur ? cur.at : 0, n: cur ? cur.n : 0 });
  }
  return json({ error: 'action' }, 404);
}

async function serveFeed(request, env, rest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return text('فقط GET', 405);
  const m = rest.match(/^([A-Za-z0-9_-]{16,64})\/signals\.(ics|rss|csv|json)$/);
  if (!m || !env || !env.STORE) return text('پیدا نشد', 404);
  const key = await env.STORE.get(FEEDKEYK);
  // مقایسه‌ی طول‌ثابت، مثل رمز همگام‌سازی
  let diff = !key || key.length !== m[1].length ? 1 : 0;
  if (!diff) for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ m[1].charCodeAt(i);
  if (diff) return text('این لینک معتبر نیست یا عوض شده', 404);
  const cur = JSON.parse((await env.STORE.get(FEEDKEY)) || 'null');
  if (!cur || !cur.files) return text('هنوز چیزی منتشر نشده', 404);
  const headers = Object.assign({}, CORS, {
    'Content-Type': FEED_TYPES[m[2]],
    'Cache-Control': 'public, max-age=300',
    'Last-Modified': new Date(cur.at).toUTCString(),
    'Content-Disposition': 'inline; filename="signals.' + m[2] + '"'
  });
  return new Response(request.method === 'HEAD' ? null : cur.files[m[2]], { status: 200, headers });
}
