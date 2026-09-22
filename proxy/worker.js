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
  'api.mexc.com',
  'api.gateio.ws',
  'www.okx.com',
  'api.kucoin.com',
  'api.bitget.com'
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

const allowed = host => ALLOW.some(h => host === h || host.endsWith('.' + h));

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
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
