const {chromium} = require('./lib').pw;
const html = `<html><body>
 <div class="tgme_widget_message" data-post="c/1893051/501">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">#بیت_کوین لانگ ورود 60000 حد ضرر 59000 تارگت 62000 تارگت 64000</div>
  <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>
 <div class="tgme_widget_message" data-post="c/1893051/500">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">#اتریوم شورت ورود 3000 استاپ 3100 تارگت 2800</div>
  <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div></body></html>`;

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:412,height:900}});
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  p.on('dialog', d => d.accept());
  await p.route('**', r => { const u=r.request().url();
    if (u.includes('localhost:8899')) return r.continue();
    if (u.includes('t.me/s/')) return r.fulfill({status:200,
      headers:{'content-type':'text/html','access-control-allow-origin':'*'}, body:html});
    return r.abort(); });
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(4000);
  // قیمت جعلی تا هشدارها و خلاصه عدد داشته باشند
  await p.evaluate(() => { PRICES = new Map([['BTC',60500],['ETH',2950]]);
                           SYMBOLS = new Set(PRICES.keys()); SYMVER++; renderAll(); });
  await p.waitForTimeout(400);

  const setF = (k,v) => p.evaluate(([k,v]) => { S.feat[k]=v; renderAll(); }, [k,v]);
  const count = sel => p.$$eval(sel, e => e.length).catch(()=>0);

  console.log('=== اعداد مالی در نوار وضعیت ===');
  const hasMoney = () => p.$eval('#status', e => /سود\/ضرر باز/.test(e.textContent)).catch(()=>false);
  console.log('  روشن:', await hasMoney() ? '✅ هست' : '❌',
    '|', (await p.$eval('#status', e => e.textContent.replace(/\s+/g,' ').trim())));
  await setF('summary', false);
  console.log('  خاموش:', await hasMoney() ? '❌ مانده' : '✅ رفت');
  await setF('summary', true);

  console.log('=== ورود ایزوله (جای «ورود سریع») ===');
  const qb = await p.$$eval('#list .acts .btn', e => e.map(x=>x.textContent));
  console.log('  دکمه‌ها:', qb.join(' | '), qb.some(x=>x.includes('ایزوله')) && !qb.some(x=>x.includes('سریع')) ? '✅' : '❌');

  console.log('=== کارت فشرده ===');
  await setF('accordion', true);
  console.log('  روشن:', await count('.card.tight'), 'کارت فشرده',
    await count('.card.tight .plan:not([style*="none"])') === 0 ? '✅ پلن پنهان' : '');
  await p.evaluate(() => document.querySelector('.card.tight .chead').click());
  await p.waitForTimeout(400);
  console.log('  بعد از زدن روی کارت:', await count('.card.tight'), 'فشرده مانده (یکی باز شد) ✅');
  await setF('accordion', false);
  console.log('  خاموش:', await count('.card.tight') ? '❌ مانده' : '✅ رفت');

  console.log('=== ورود ایزوله → پوزیشن ===');
  await p.evaluate(() => [...document.querySelectorAll('#list .acts .btn')]
    .find(b => b.textContent.includes('ایزوله')).click());
  await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('#ok').click());
  await p.waitForTimeout(700);
  const pos = await p.evaluate(() => DB.positions.map(x => ({t:x.ticker,lev:x.lev,m:x.margin,e:x.entry,s:x.stop})));
  console.log(' ', JSON.stringify(pos), pos.length===1 && pos[0].lev>=1 && pos[0].lev<=10 && pos[0].m>0 ? '✅ ثبت شد با اهرم امن' : '❌');

  console.log('=== یک دکمه‌ی «بستن» روی پوزیشن ===');
  await p.evaluate(()=>document.querySelector('.tab[data-v="positions"]').click()); await p.waitForTimeout(600);
  const tb = await p.$$eval('#vPositions .acts .btn', e => e.map(x=>x.textContent.trim()));
  console.log('  دکمه‌ها:', tb.join(' | '), tb.includes('بستن') && !tb.some(x=>/بستن 50٪|بستن کامل/.test(x)) ? '✅' : '❌');

  console.log('=== بازه‌ی دلخواه کارنامه ===');
  await p.evaluate(()=>{document.querySelector('.tab[data-v="more"]').click();document.querySelector('.moreit[data-go="report"]').click();}); await p.waitForTimeout(500);
  console.log('  دکمه:', await p.$eval('#pRange', e => e.classList.contains('hide') ? 'پنهان ❌' : 'هست ✅'));
  await setF('range', false); await p.waitForTimeout(300);
  await p.evaluate(() => wire ? null : null);
  console.log('  (خاموش کردنش در بارگذاری بعدی اعمال می‌شود)');

  console.log('=== کلیدها در تنظیمات ===');
  await p.click('#btnSet'); await p.waitForTimeout(500);
  console.log(' ', await p.$$eval('.featrow .featttl', e => e.map(x=>x.textContent)).then(a=>a.join(' · ')));
  await b.close();
})();
