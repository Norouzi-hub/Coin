/* چیزهای مشترک تست‌ها: playwright، ریشه‌ی مخزن و پوشه‌ی خروجی (عکس‌ها) */
const path = require('path'), os = require('os'), fs = require('fs');
let pw;
try { pw = require('playwright'); }
catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }   // محیطی که playwright سراسری دارد
/* برنامه روی «بازار» باز می‌شود؛ تست‌ها (نوشته‌شده برای شروع از «سیگنال‌ها») همان‌جا شروع می‌کنند،
   مگر تستی خودش window.__startView را بگذارد (اسکریپتِ بعدی برنده است) */
{const START="window.__startView=window.__startView||'signals'", _launch=pw.chromium.launch.bind(pw.chromium);
 pw.chromium.launch=async(...a)=>{const b=await _launch(...a),nc=b.newContext.bind(b),np=b.newPage.bind(b);
   b.newContext=async(...o)=>{const c=await nc(...o);await c.addInitScript(START);return c;};
   b.newPage=async(...o)=>{const p=await np(...o);await p.addInitScript(START);return p;};
   return b;};}
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.TEST_OUT || path.join(os.tmpdir(), 'signaldesk-tests');
fs.mkdirSync(OUT, { recursive: true });
/* تست‌هایی که «دیروز/امروز» می‌شمارند به ساعت اجرا حساس‌اند (بعد از نیمه‌شب تهران، 26 ساعت پیش «پریروز» است).
   این لحظه‌ی ثابت (آخرین ساعت 14 به وقت تهران، پیش از الان) را هم برای پست‌ها و هم برای ساعت مرورگر به کار ببر. */
function tehranAfternoon(){const off=3.5*36e5, loc=Date.now()+off;let t=Math.floor(loc/864e5)*864e5+14*36e5;if(t>loc)t-=864e5;return t-off;}
module.exports = {
  pw, ROOT, OUT, tehranAfternoon,
  root: p => path.join(ROOT, p || ''),
  out: p => { const f = path.join(OUT, p || ''); fs.mkdirSync(p && !p.endsWith('/') && path.extname(f) ? path.dirname(f) : f, { recursive: true });
    return f + (p && p.endsWith('/') ? '/' : ''); }
};
