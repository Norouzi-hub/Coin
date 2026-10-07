const {chromium} = require('./lib').pw;
// متنِ «POST-n» یادداشت است و خودش آرشیو می‌شود؛ ترتیب در سطل آرشیو سنجیده می‌شود

// صفحه‌ی جعلی t.me با شماره‌ی پست‌های مشخص
const page_ = (nums, before) => `<html><body>${
  nums.map(n => `
  <div class="tgme_widget_message" data-post="ccoineres/${n}">
    <div class="tgme_widget_message_bubble">
      <div class="tgme_widget_message_text">POST-${n}</div>
      <time datetime="2026-09-${String(10 + (n % 20)).padStart(2,'0')}T10:00:00+00:00"></time>
    </div>
  </div>`).join('')
}${before ? `<a class="tme_messages_more" data-before="${before}"></a>` : ''}</body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await p.route('**', async route => {
    const url = route.request().url();
    if (url.includes('localhost:8899')) return route.continue();
    if (url.includes('t.me/s/')) {
      const before = new URL(url).searchParams.get('before');
      // بدون before: تازه‌ها 200..204 ؛ با before: قدیمی‌ترها 194..198
      const body = before ? page_([198,197,196,195,194], null) : page_([204,203,202,201,200], '200');
      return route.fulfill({status:200, headers:{'content-type':'text/html','access-control-allow-origin':'*'}, body});
    }
    return route.abort();
  });

  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.evaluate(() => { sigFilter = "all"; bucket = "arch"; renderSignals(); });
  await p.waitForFunction(() => document.querySelectorAll('#list .card').length > 0, {timeout:20000});

  const first = await p.$$eval('#list .card', els =>
    els.map(e => (e.textContent.match(/POST-\d+/) || ['?'])[0]));
  console.log('بعد از بروزرسانی اول :', first.join('  '));

  // حالا «پست‌های قدیمی‌تر»
  await p.click('#btnMore');
  await p.waitForTimeout(3000);
  await p.evaluate(() => { sigFilter = "all"; bucket = "arch"; renderSignals(); });
  await p.evaluate(() => { sigFilter = "all"; bucket = "arch"; renderSignals(); });
  await p.waitForFunction(() => document.querySelectorAll('#list .card').length > 5, {timeout:25000});
  const after = await p.$$eval('#list .card', els =>
    els.map(e => (e.textContent.match(/POST-\d+/) || ['?'])[0]));
  console.log('بعد از گرفتن قدیمی‌ها:', after.join('  '));

  const nums = after.map(s => parseInt(s.replace('POST-',''),10));
  const desc = nums.every((v,i) => i===0 || nums[i-1] >= v);
  console.log('ترتیب از جدید به قدیم؟', desc ? 'بله ✅' : 'خیر ❌');
  await b.close();
})();
