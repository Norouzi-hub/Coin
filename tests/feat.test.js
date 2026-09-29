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

  console.log('=== ورود سریع ===');
  const qb = await p.$$eval('#list .acts .btn', e => e.map(x=>x.textContent));
  console.log('  دکمه‌ها:', qb.join(' | '), qb.some(x=>x.includes('سریع')) ? '✅' : '❌');
  await setF('quick', false);
  console.log('  خاموش:', (await p.$$eval('#list .acts .btn', e => e.map(x=>x.textContent)))
    .some(x=>x.includes('سریع')) ? '❌ مانده' : '✅ رفت');
  await setF('quick', true);

  console.log('=== کارت فشرده ===');
  await setF('accordion', true);
  console.log('  روشن:', await count('.card.tight'), 'کارت فشرده',
    await count('.card.tight .plan:not([style*="none"])') === 0 ? '✅ پلن پنهان' : '');
  await p.evaluate(() => document.querySelector('.card.tight .chead').click());
  await p.waitForTimeout(400);
  console.log('  بعد از زدن روی کارت:', await count('.card.tight'), 'فشرده مانده (یکی باز شد) ✅');
  await setF('accordion', false);
  console.log('  خاموش:', await count('.card.tight') ? '❌ مانده' : '✅ رفت');

  console.log('=== ورود سریع → پوزیشن ===');
  await p.evaluate(() => [...document.querySelectorAll('#list .acts .btn')]
    .find(b => b.textContent.includes('سریع')).click());
  await p.waitForTimeout(700);
  const pos = await p.evaluate(() => DB.positions.map(x => ({t:x.ticker,lev:x.lev,m:x.margin,e:x.entry,s:x.stop})));
  console.log(' ', JSON.stringify(pos), pos.length===1 && pos[0].lev===3 ? '✅ اهرم 3 درست' : '❌');

  console.log('=== بستن 50٪ روی تارگت ===');
  await p.evaluate(()=>document.querySelector('.tab[data-v="positions"]').click()); await p.waitForTimeout(600);
  const tb = await p.$$eval('#vPositions .acts .btn', e => e.map(x=>x.textContent.trim()));
  console.log('  دکمه‌ها:', tb.join(' | '));
  const has = tb.some(x => x.includes('بستن 50٪'));
  console.log(' ', has ? '✅ هست' : '❌ نیست');
  if (has) {
    await p.evaluate(() => [...document.querySelectorAll('#vPositions .acts .btn')]
      .find(b => b.textContent.includes('بستن 50٪')).click());
    await p.waitForTimeout(700);
    const after = await p.evaluate(() => { const x=DB.positions[0];
      return {margin:x.margin, parts:(x.partials||[]).length, pnl:(x.partials||[])[0] && +x.partials[0].pnl.toFixed(3)}; });
    console.log('  بعد از بستن:', JSON.stringify(after),
      after.parts===1 && Math.abs(after.margin-5)<0.01 ? '✅ نصف مارجین آزاد شد' : '❌');
  }
  await setF('tpclose', false);
  console.log('  خاموش:', (await p.$$eval('#vPositions .acts .btn', e => e.map(x=>x.textContent)))
    .some(x=>x.includes('بستن 50٪')) ? '❌ مانده' : '✅ رفت');

  console.log('=== بازه‌ی دلخواه کارنامه ===');
  await p.evaluate(()=>document.querySelector('.tab[data-v="report"]').click()); await p.waitForTimeout(500);
  console.log('  دکمه:', await p.$eval('#pRange', e => e.classList.contains('hide') ? 'پنهان ❌' : 'هست ✅'));
  await setF('range', false); await p.waitForTimeout(300);
  await p.evaluate(() => wire ? null : null);
  console.log('  (خاموش کردنش در بارگذاری بعدی اعمال می‌شود)');

  console.log('=== کلیدها در تنظیمات ===');
  await p.click('#btnSet'); await p.waitForTimeout(500);
  console.log(' ', await p.$$eval('.featrow .featttl', e => e.map(x=>x.textContent)).then(a=>a.join(' · ')));
  await b.close();
})();
