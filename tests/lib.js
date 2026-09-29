/* چیزهای مشترک تست‌ها: playwright، ریشه‌ی مخزن و پوشه‌ی خروجی (عکس‌ها) */
const path = require('path'), os = require('os'), fs = require('fs');
let pw;
try { pw = require('playwright'); }
catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }   // محیطی که playwright سراسری دارد
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.TEST_OUT || path.join(os.tmpdir(), 'signaldesk-tests');
fs.mkdirSync(OUT, { recursive: true });
module.exports = {
  pw, ROOT, OUT,
  root: p => path.join(ROOT, p || ''),
  out: p => { const f = path.join(OUT, p || ''); fs.mkdirSync(p && !p.endsWith('/') && path.extname(f) ? path.dirname(f) : f, { recursive: true });
    return f + (p && p.endsWith('/') ? '/' : ''); }
};
