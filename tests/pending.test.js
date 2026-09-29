const {chromium} = require('./lib').pw;
const html = `<html><body>
 <div class="tgme_widget_message" data-post="c/1893051/601">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">#بیت_کوین لانگ بالای ۶۵۰۰۰ ورود حد ضرر ۶۳۰۰۰ تارگت ۷۰۰۰۰</div>
  <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>
 <div class="tgme_widget_message" data-post="c/1893051/600">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">این ارز رو همین الان بگیرید حد ضرر ۱۴۰ تارگت ۱۸۰ اهرم ۳</div>
  <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div></body></html>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:412,height:1000}});await p.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{try{S.feat.accordion=false;renderAll();}catch(e){}}));
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  p.on('dialog', d => d.accept());
  await p.route('**', r => { const u=r.request().url();
    if (u.includes('localhost:8899')) return r.continue();
    if (u.includes('t.me/s/')) return r.fulfill({status:200,
      headers:{'content-type':'text/html','access-control-allow-origin':'*'}, body:html});
    return r.abort(); });
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(4000);
  await p.evaluate(() => { PRICES=new Map([['BTC',62000],['SOL',150],['ETH',3000]]);
                           SYMBOLS=new Set(PRICES.keys()); SYMVER++; sigFilter='all'; renderAll(); });
  await p.waitForTimeout(400);

  console.log('=== پیشنهاد نماد و قیمت ===');
  // پست دوم: «solana» لاتین در متن، بدون هشتگ، بدون عدد ورود
  await p.evaluate(() => [...document.querySelectorAll('#list .card')][1]
    .querySelector('.padd').click());
  await p.waitForTimeout(600);
  // نماد را خودمان می‌زنیم و باید قیمت روز به‌عنوان ورود بیاید
  await p.fill('#f_tk','sol');
  await p.waitForTimeout(400);
  const dlg = await p.evaluate(() => ({
    tk: document.querySelector('#f_tk') ? document.querySelector('#f_tk').value : null,
    guesses: [...document.querySelectorAll('#guessRow [data-g]')].map(x=>x.textContent),
    note: (document.querySelector('#pxNote')||{}).textContent,
    en: (document.querySelector('#f_en')||{}).value,
    st: (document.querySelector('#f_st')||{}).value,
  }));
  console.log('  نماد بعد از تایپ:', dlg.tk);
  console.log('  پیشنهادها:', dlg.guesses.join(' · ') || '—');
  console.log('  یادداشت قیمت:', dlg.note);
  console.log('  ورود پرشده:', dlg.en, dlg.en === '150' ? '✅ از قیمت روز' : '❌');
  console.log('  استاپ از متن:', dlg.st, dlg.st === '140' ? '✅' : '❌');
  await p.click('#ok'); await p.waitForTimeout(700);
  console.log('  ورق بسته شد:', await p.$('#f_tk') ? 'نه ❌' : 'بله ✅');
  console.log('  بعد از ثبت، نماد کارت:',
    await p.$$eval('#list .card .tick', e=>e.map(x=>x.textContent)).then(a=>a.join(',')));

  console.log('\n=== سفارش منتظر ===');
  const waitBtn = await p.$$eval('#list .brief .btn', e=>e.map(x=>x.textContent.trim()));
  console.log('  دکمه‌ها:', [...new Set(waitBtn)].join(' | '));
  await p.evaluate(() => [...document.querySelectorAll('#list .brief .btn')]
    .find(b => b.textContent.includes('منتظر')).click());
  await p.waitForTimeout(600);
  console.log('  ثبت شد:', await p.evaluate(() => DB.pending.length), 'سفارش',
    await p.evaluate(() => DB.pending[0] && DB.pending[0].trigger), '(تریگر ۶۵۰۰۰)');

  await p.click('.tab[data-v="positions"]'); await p.waitForTimeout(500);
  await p.click('#pWait'); await p.waitForTimeout(500);
  console.log('  در تب منتظر:', await p.$$eval('#posList .card', e=>e.length), 'کارت');
  console.log('  شمارنده:', await p.$eval('#cWait', e=>e.textContent));
  const kv = await p.$$eval('#posList .bk', e=>e.map(x=>x.textContent.trim()));
  console.log(' ', kv.join(' | '));

  // قیمت به تریگر برسد
  await p.evaluate(() => { PRICES=new Map([['BTC',65200],['SOL',150]]); SYMBOLS=new Set(PRICES.keys());
                           checkPending(); renderAll(); });
  await p.waitForTimeout(600);
  console.log('  بعد از رسیدن قیمت → hit:', await p.evaluate(() => !!DB.pending[0].hit) ? '✅ ثبت شد' : '❌');
  console.log('  برچسب کارت:', await p.$$eval('#posList .pill', e=>e.map(x=>x.textContent)).then(a=>a.join(' ')));

  // تبدیل به پوزیشن
  await p.evaluate(() => document.querySelector('#posList .acts .btn').click());
  await p.waitForTimeout(800);
  console.log('  فرم ورود باز شد:', await p.$('#f_e') ? '✅' : '❌',
    '| ورود پیش‌فرض:', await p.$eval('#f_e', e=>e.value).catch(()=>'—'), '(باید ۶۵۰۰۰)');
  console.log('  از فهرست منتظرها رفت:', await p.evaluate(() => DB.pending.length) === 0 ? '✅' : '❌');
  await b.close();
})();
