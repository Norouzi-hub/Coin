#!/usr/bin/env node
/* ساخت index.html از src/
 *
 * برنامه روی گوشی و GitHub Pages همچنان «یک فایل» است (index.html)؛ ولی نوشتن و خواندنِ یک
 * فایل ده‌هزار خطی سخت است. پس کد در src/ تکه‌تکه است:
 *   src/index.html   پوسته‌ی HTML، با دو نشانه: /*@css*\/ داخل <style> و //@js داخل <script>
 *   src/css/*.css    به ترتیب نام، جای /*@css*\/
 *   src/js/*.js      به ترتیب نام (شماره‌ی اول نام = ترتیب اجرا)، جای //@js
 *
 *   node tools/build.js           index.html را می‌سازد
 *   node tools/build.js --check   فقط می‌سنجد index.html با src یکی است (برای CI)؛ فرق = خروج 1
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'src');
const cat = dir => fs.readdirSync(path.join(SRC, dir)).filter(f => !f.startsWith('.')).sort()
  .map(f => fs.readFileSync(path.join(SRC, dir, f), 'utf8').replace(/\n$/, '')).join('\n');

function build() {
  const tpl = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  if (tpl.split('/*@css*/').length !== 2 || tpl.split('\n//@js\n').length !== 2)
    throw new Error('src/index.html باید دقیقاً یک /*@css*/ و یک //@js داشته باشد');
  // با تابع جایگزین، تا $ داخل کد الگوی replace حساب نشود
  return tpl.replace('/*@css*/', () => cat('css')).replace('\n//@js\n', () => '\n' + cat('js') + '\n');
}

const out = build(), target = path.join(ROOT, 'index.html');
if (process.argv.includes('--check')) {
  const cur = fs.readFileSync(target, 'utf8');
  if (cur !== out) {
    const a = cur.split('\n'), b = out.split('\n');
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    console.error('✗ index.html با src/ یکی نیست (اولین فرق در خط ' + (i + 1) + '). «node tools/build.js» را اجرا کن و هر دو را کامیت کن.');
    process.exit(1);
  }
  console.log('✓ index.html با src/ یکی است');
} else {
  fs.writeFileSync(target, out);
  console.log('✓ index.html ساخته شد (' + Math.round(Buffer.byteLength(out) / 1024) + ' KB)');
}
