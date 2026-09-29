const {chromium} = require('./lib').pw;
const html = `<html><body><div class="tgme_widget_message" data-post="c/1893051/500">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">#بیت_کوین لانگ ورود 60000 حد ضرر 59000</div>
  <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div></body></html>`;

const tap = async (p, label) => {
  await p.evaluate(l => {
    const b = [...document.querySelectorAll('#lockPad button')].find(x => x.textContent.trim() === l);
    if (!b) throw new Error('کلید پیدا نشد: ' + l);
    b.click();
  }, label);
  await p.waitForTimeout(120);
};
const fa = s => s;   // اعداد برنامه حالا لاتین‌اند
const enter = async (p, pin) => { for (const c of pin) await tap(p, fa(c)); await tap(p, 'تأیید'); await p.waitForTimeout(350); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  p.on('dialog', d => d.accept());
  await p.route('**', r => {
    const u = r.request().url();
    if (u.includes('localhost:8899')) return r.continue();
    if (u.includes('t.me/s/')) return r.fulfill({status:200,
      headers:{'content-type':'text/html','access-control-allow-origin':'*'}, body:html});
    return r.abort();
  });
  const vis = () => p.evaluate(() => !document.querySelector('#lockv').classList.contains('hide'));

  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(4000);
  console.log('بدون رمز، قفل نشان داده می‌شود؟', await vis() ? 'بله ❌' : 'خیر ✅');

  // گذاشتن رمز
  await p.click('#btnSet'); await p.waitForTimeout(400);
  await p.evaluate(()=>{document.querySelector('#setVeil .sec[data-sec="lock"]').open=true;});
  await p.waitForTimeout(250);
  await p.click('#btnLockSet'); await p.waitForTimeout(400);
  await enter(p, '1379');                       // بار اول
  await enter(p, '1379');                       // تأیید
  console.log('بعد از گذاشتن رمز، وضعیت:', await p.$eval('#lockState', e => e.textContent));

  // رمز خام نباید در حافظه باشد
  const raw = await p.evaluate(() => localStorage.getItem('signaldesk.lock.v1'));
  console.log('رمز خام در حافظه؟', raw.includes('1379') ? 'بله ❌' : 'خیر ✅ (' + JSON.parse(raw).hash.slice(0,16) + '…)');

  // بارگذاری دوباره → باید قفل بیاید
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3500);
  console.log('بعد از رفرش قفل آمد؟', await vis() ? 'بله ✅' : 'خیر ❌');

  // رمز غلط
  await enter(p, '0000');
  console.log('رمز غلط →', await vis() ? 'بسته ماند ✅' : 'باز شد ❌',
    '| پیام:', await p.$eval('#lockMsg', e => e.textContent.trim()));

  // رمز درست
  await enter(p, '1379');
  console.log('رمز درست →', await vis() ? 'بسته ماند ❌' : 'باز شد ✅');

  // برداشتن قفل
  await p.click('#btnSet'); await p.waitForTimeout(400);
  await p.click('#btnLockOff'); await p.waitForTimeout(400);
  await enter(p, '1379');
  console.log('بعد از برداشتن، وضعیت:', await p.$eval('#lockState', e => e.textContent),
    '| کلید حافظه:', await p.evaluate(() => localStorage.getItem('signaldesk.lock.v1')) === null ? 'پاک شد ✅' : 'مانده ❌');
  await b.close();
})();
