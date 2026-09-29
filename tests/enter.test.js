const {chromium} = require('./lib').pw;
const html = `<html><body><div class="tgme_widget_message" data-post="c/1893051/500">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">#بیت_کوین لانگ ورود 60000 حد ضرر 59000 تارگت 62000</div>
  <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div></body></html>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:412,height:900}});
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await p.route('**', r => { const u=r.request().url();
    if (u.includes('localhost:8899')) return r.continue();
    if (u.includes('t.me/s/')) return r.fulfill({status:200,
      headers:{'content-type':'text/html','access-control-allow-origin':'*'}, body:html});
    return r.abort(); });
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(4000);

  // فرم علامت‌گذاری دیگر اهرم نمی‌پرسد و می‌گوید پوزیشن باز نمی‌کند
  await p.evaluate(() => { sigFilter='all'; renderSignals(); });
  const markBtn = await p.$eval('#list .card .padd, #list .card .ftray .fchip', e => e.textContent.trim());
  console.log('نام دکمه:', markBtn, markBtn==='افزودن به سیگنال‌ها' ? '✅' : '(سیگنال است، فرم دیگر)');

  // باز کردن فرم ورود
  // «بررسی و ورود» حالا یک مرحله است: مستقیم فرم ورود
  await p.evaluate(() => [...document.querySelectorAll('#list .card button')]
    .find(b => b.textContent.includes('بررسی و ورود')).click());

  await p.waitForTimeout(600);

  const read = async () => p.evaluate(() => ({
    lev: document.querySelector('#f_l').value,
    ro:  document.querySelector('#f_l').readOnly,
    kv:  [...document.querySelectorAll('#prev .k')].map(k => k.textContent.trim()),
    warns: [...document.querySelectorAll('.rwarn')].map(w => w.className.split(' ')[1] + ': ' + w.textContent.slice(0,44)),
  }));

  let r = await read();
  console.log('\n— مارجین پیش‌فرض $10، اهرم خودکار —');
  console.log('  اهرم:', r.lev, '| فقط‌خواندنی:', r.ro ? '✅' : '❌', '| انتظار: 3');
  console.log(' ', r.kv.join(' | '));

  await p.fill('#f_m', '20'); await p.waitForTimeout(400);
  r = await read();
  console.log('\n— مارجین را $20 کردم —');
  console.log('  اهرم:', r.lev, '(باید همان ۳ بماند چون ریسک نسبت به مارجین است)');
  console.log(' ', r.kv.join(' | '));

  await p.fill('#f_m', '10');
  await p.click('#autoRow'); await p.fill('#f_l', '20'); await p.waitForTimeout(400);
  r = await read();
  console.log('\n— اهرم دستی ۲۰ —');
  console.log('  فقط‌خواندنی:', r.ro ? '❌ هنوز قفل است' : '✅ باز شد');
  console.log(' ', r.kv.join(' | '));
  r.warns.forEach(w => console.log('  ⚠', w));

  await p.fill('#f_l', '80'); await p.waitForTimeout(400);
  r = await read();
  console.log('\n— اهرم دستی ۸۰ (استاپ بعد از لیکوئید) —');
  console.log(' ', r.kv.join(' | '));
  r.warns.forEach(w => console.log('  ⚠', w));

  // بدون استاپ
  await p.click('#autoRow'); await p.fill('#f_s', ''); await p.waitForTimeout(400);
  r = await read();
  console.log('\n— بدون حد ضرر —');
  r.warns.forEach(w => console.log('  ⚠', w));
  await p.screenshot({path:require('./lib').out('enter.png')});
  await b.close();
})();
