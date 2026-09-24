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
 */

/* فقط این میزبان‌ها؛ وگرنه ورکرِ تو تبدیل می‌شود به پروکسی باز برای همه‌ی اینترنت */
const ALLOW = [
  't.me',
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
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
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
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const path = new URL(request.url).pathname;
    if (path === '/db') return handleDb(request, env);

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
