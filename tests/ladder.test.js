const {chromium} = require('./lib').pw;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:412,height:1000}});
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await p.route('**', r => r.request().url().includes('localhost:8899') ? r.continue() : r.abort());
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);

  // همان پوزیشن ASTER: ورود و استاپ نزدیک هم، قیمت خیلی دور
  await p.evaluate(() => {
    PRICES = new Map([['ASTER',0.7078]]); SYMBOLS = new Set(['ASTER']); SYMVER++;
    DB.positions = [ensureBase({id:'a1',ticker:'ASTER',dir:'long',entry:0.07344,stop:0.055,
      stop0:0.055,margin:10,baseMargin:10,lev:5,targets:[0.09,0.095],status:'open',
      openedAt:Date.now(),partials:[],log:[]})];
    save(); go('positions');
  });
  await p.waitForTimeout(900);

  const overlaps = await p.evaluate(() => {
    const out = [];
    for (const sel of ['.lb.bot, .slb', '.lb.top']) {
      const items = [...document.querySelectorAll('.ladder ' + sel)]
        .map(e => ({t: e.textContent.trim().slice(0,22), r: e.getBoundingClientRect()}))
        .filter(x => x.r.width > 0).sort((a,b) => a.r.left - b.r.left);
      for (let i=1;i<items.length;i++) {
        const A = items[i-1], B = items[i];
        const hOver = B.r.left < A.r.right;                 // افقی تداخل دارند
        const vOver = B.r.top < A.r.bottom && A.r.top < B.r.bottom;  // و عمودی هم
        if (hOver && vOver) out.push(A.t + ' ↔ ' + B.t);
      }
    }
    return out;
  });
  console.log('برچسب‌های روی هم افتاده:', overlaps.length ? overlaps : 'هیچ ✅');

  const box = await p.evaluate(() => {
    const l = document.querySelector('.ladder'), c = l.closest('.card');
    const lr = l.getBoundingClientRect(), cr = c.getBoundingClientRect();
    return {out: lr.bottom > cr.bottom + 2 || lr.top < cr.top - 2, h: Math.round(lr.height)};
  });
  console.log('ارتفاع نردبان:', box.h + 'px', '| بیرون‌زدگی از کارت:', box.out ? 'بله ❌' : 'خیر ✅');

  const el = await p.$('.ladder');
  await el.screenshot({path:require('./lib').out('ladder.png')});
  await b.close();
})();
