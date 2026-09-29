const {chromium} = require('./lib').pw;
const mk = (n,t) => `<div class="tgme_widget_message" data-post="c/1893051/${n}">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${t}</div>
  <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>`;
const html = `<html><body>
  ${mk(503,'#بیت_کوین لانگ ورود 60000 حد ضرر 59000 تارگت 62000 تارگت 64000')}
  ${mk(502,'#اتریوم شورت ورود 3000 استاپ 3100 تارگت 2800')}
  ${mk(501,'#سولانا لانگ ورود 150 حد ضرر 140 تارگت 170')}</body></html>`;

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:412,height:1000}});
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  p.on('dialog', d => d.accept());
  await p.route('**', r => { const u=r.request().url();
    if (u.includes('localhost:8899')) return r.continue();
    if (u.includes('t.me/s/')) return r.fulfill({status:200,
      headers:{'content-type':'text/html','access-control-allow-origin':'*'}, body:html});
    return r.abort(); });
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(4000);
  await p.evaluate(() => { PRICES=new Map([['BTC',60200],['ETH',3020],['SOL',152]]);
                           SYMBOLS=new Set(PRICES.keys()); SYMVER++; renderAll(); });

  console.log('=== نردبان در فرم ورود ===');
  // «بررسی و ورود» حالا یک مرحله است: مستقیم فرم ورود
  await p.evaluate(() => [...document.querySelectorAll('#list .card button')]
    .find(b => b.textContent.includes('بررسی و ورود')).click());

  await p.waitForTimeout(800);
  console.log('  نردبان:', await p.$('#entLad .ladder') ? '✅ هست' : '❌ نیست');
  console.log('  دستگیره‌ی کشیدنی:', await p.$('#entLad .hs2') ? '✅' : '❌');
  console.log('  کشویی مارجین و اهرم:', await p.$('#r_m') && await p.$('#r_l') ? '✅' : '❌');
  const before = await p.evaluate(() => ({s:document.querySelector('#f_s').value,
                                          l:document.querySelector('#f_l').value}));
  console.log('  قبل از کشیدن → استاپ', before.s, '| اهرم', before.l);

  // کشیدن دستگیره‌ی استاپ
  const hs = await p.$('#entLad .hs2');
  const box = await hs.boundingBox();
  const lad = await (await p.$('#entLad .ladder')).boundingBox();
  await p.mouse.move(box.x+box.width/2, box.y+box.height/2);
  await p.mouse.down();
  await p.mouse.move(lad.x + lad.width*0.30, box.y+box.height/2, {steps:8});
  await p.mouse.up();
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => ({s:document.querySelector('#f_s').value,
                                         l:document.querySelector('#f_l').value,
                                         kv:[...document.querySelectorAll('#prev .k')].map(k=>k.textContent.trim())}));
  console.log('  بعد از کشیدن  → استاپ', after.s, '| اهرم', after.l,
    after.s !== before.s ? '✅ استاپ عوض شد' : '❌',
    after.l !== before.l ? '✅ اهرم بازحساب شد' : '❌');
  console.log(' ', after.kv.join(' | '));

  // کشویی مارجین
  await p.evaluate(() => { const r=document.querySelector('#r_m'); r.value=25;
                           r.dispatchEvent(new Event('input',{bubbles:true})); });
  await p.waitForTimeout(400);
  console.log('  کشویی مارجین → کادر عدد:', await p.$eval('#f_m', e=>e.value),
    await p.$eval('#f_m', e=>e.value)==='25' ? '✅' : '❌');
  await p.screenshot({path:require('./lib').out('entlad.png')});
  await p.click('#cx'); await p.waitForTimeout(400);

  console.log('\n=== آرشیو ===');
  const chips = () => p.$$eval('#fbar .fb:not(.fday)', e => e.map(x=>x.querySelector('span').textContent.trim()));
  console.log('  تب‌ها:', (await chips()).join(' | '));
  const n0 = await p.$$eval('#list .card', e=>e.length);
  await p.evaluate(() => [...document.querySelectorAll('#list .card .ftray .fchip')]
    .find(b => b.textContent.trim()==='آرشیو').click());
  await p.waitForTimeout(500);
  const n1 = await p.$$eval('#list .card', e=>e.length);
  console.log('  کارت‌ها:', n0, '→', n1, n1===n0-1 ? '✅ از فعال رفت' : '❌');
  await p.evaluate(() => [...document.querySelectorAll('#fbar .fside .fb')]
    .find(c => c.textContent.includes('آرشیو')).click());
  await p.waitForTimeout(500);
  console.log('  در تب آرشیو:', await p.$$eval('#list .card', e=>e.length), 'کارت',
    (await p.$$eval('#list .card .ftray .fchip[aria-pressed="true"]', e=>e.map(x=>x.textContent.trim()))).includes('آرشیو') ? '✅ کلید آرشیو روشن است' : '❌');
  await p.evaluate(() => [...document.querySelectorAll('#list .card .ftray .fchip')]
    .find(b => b.textContent.trim()==='آرشیو').click());
  await p.waitForTimeout(500);
  console.log('  بعد از برگرداندن، آرشیو:', await p.$$eval('#list .card', e=>e.length), 'کارت (باید ۰)');

  // ماندگاری
  await p.evaluate(() => { DB.archived['c/1893051/502']=Date.now(); save(); });
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(4000);
  console.log('  بعد از رفرش، فعال:', await p.$$eval('#list .card', e=>e.length), 'کارت (باید ۲)');
  await b.close();
})();
