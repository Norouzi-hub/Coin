/* چیزهای مشترک تست‌ها: playwright، ریشه‌ی مخزن و پوشه‌ی خروجی (عکس‌ها) */
const path = require('path'), os = require('os'), fs = require('fs');
let pw;
try { pw = require('playwright'); }
catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }   // محیطی که playwright سراسری دارد
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
