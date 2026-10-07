const {chromium} = require('./lib').pw;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({permissions:['notifications']});
  const p = await ctx.newPage({viewport:{width:412,height:900}});
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await p.route('**', r => r.request().url().includes('localhost:8899') ? r.continue() : r.abort());
  await p.addInitScript(() => {
    window.__notes = [];
    class FakeNotification { constructor(t,o){ window.__notes.push(t+' | '+(o&&o.body||'')); } }
    FakeNotification.permission = 'granted';
    FakeNotification.requestPermission = async () => 'granted';
    window.Notification = FakeNotification;
  });
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);

  await p.evaluate(() => {
    S.feat.notify = true; S.adv = Object.assign(advCfg(), {on:true}); S.adv.cats.pos = true;
    DB.positions = [ensureBase({id:'x1',ticker:'BTC',dir:'long',entry:60000,stop:59000,
      margin:10,lev:3,targets:[62000,64000],status:'open',openedAt:Date.now()})];
    save();
  });

  const fire = px => p.evaluate(v => { PRICES = new Map([['BTC', v]]); SYMBOLS = new Set(['BTC']);
                                       checkAlerts(); }, px);
  const notes = () => p.evaluate(() => window.__notes.slice());

  await fire(60500); console.log('قیمت ۶۰۵۰۰ (عادی)      →', (await notes()).length, 'اعلان', (await notes()).length===0 ? '✅' : '❌');
  await fire(59200); console.log('قیمت ۵۹۲۰۰ (نزدیک استاپ) →', (await notes()).slice(-1)[0] || '—');
  await fire(59200); console.log('همان قیمت دوباره        →', (await notes()).length, 'اعلان (نباید تکرار شود)');
  await fire(62100); console.log('قیمت ۶۲۱۰۰ (تارگت ۱)    →', (await notes()).slice(-1)[0] || '—');
  await fire(64500); console.log('قیمت ۶۴۵۰۰ (تارگت ۲)    →', (await notes()).slice(-1)[0] || '—');
  await fire(58000); console.log('قیمت ۵۸۰۰۰ (استاپ خورد) →', (await notes()).slice(-1)[0] || '—');

  // خاموش کردن هشدارها
  await p.evaluate(() => { S.adv.cats.pos = false; window.__notes = []; });
  await fire(57000);
  console.log('با کلید خاموش           →', (await notes()).length, 'اعلان', (await notes()).length===0 ? '✅ رفت' : '❌');
  await b.close();
})();
