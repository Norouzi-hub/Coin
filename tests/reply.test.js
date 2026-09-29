const {chromium} = require('./lib').pw;
// پست ۵۰۳ ریپلای به ۵۰۱ است — دقیقاً حالت «رسید به نقطه ورود»
const html = `<html><body>
 <div class="tgme_widget_message" data-post="c/1893051/503">
  <div class="tgme_widget_message_bubble">
   <a class="tgme_widget_message_reply" href="https://t.me/c/1893051/501">
     <div class="tgme_widget_message_text">#سولانا لانگ ورود ۱۵۰ حد ضرر ۱۴۰</div></a>
   <div class="tgme_widget_message_text">به نقطه ورود رسید</div>
   <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>
 <div class="tgme_widget_message" data-post="c/1893051/502">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">#بیت_کوین لانگ ورود 60000 حد ضرر 59000 تارگت 62000</div>
  <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>
 <div class="tgme_widget_message" data-post="c/1893051/501">
  <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">#سولانا لانگ ورود ۱۵۰ حد ضرر ۱۴۰ تارگت ۱۷۰ — توضیح کامل استراتژی اینجا</div>
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
  await p.evaluate(() => { PRICES=new Map([['BTC',60300],['SOL',151]]);
                           SYMBOLS=new Set(PRICES.keys()); SYMVER++; sigFilter='all'; renderAll(); });
  await p.waitForTimeout(400);

  console.log('=== جزئیات بسته به‌صورت پیش‌فرض ===');
  console.log('  پلن باز:', await p.$$eval('#list .plan', e=>e.length), '(باید ۰)');
  console.log('  خلاصه:', await p.$$eval('#list .brief', e=>e.length), 'کارت');
  const bk = await p.$$eval('#list .brief .bk b', e=>e.slice(0,3).map(x=>x.textContent));
  console.log('  خانه‌های خلاصه:', bk.join(' · '));
  const btns = await p.$$eval('#list .brief .acts .btn', e=>e.map(x=>x.textContent.trim()));
  console.log('  دکمه‌ها:', [...new Set(btns)].join(' | '));

  console.log('\n=== «وارد نشدم» نباید بازش کند ===');
  await p.evaluate(() => [...document.querySelectorAll('#list .brief .btn')]
    .find(b => b.textContent.includes('وارد نشدم')).click());
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('#ok').click());   // ثبت دلیل
  await p.waitForTimeout(600);
  console.log('  بعد از «وارد نشدم» → پلن باز:', await p.$$eval('#list .plan', e=>e.length), '(باید ۰)');

  console.log('\n=== «بررسی و ورود» یک مرحله: مستقیم فرم ورود ===');
  await p.evaluate(() => [...document.querySelectorAll('#list .brief .btn')]
    .find(b => b.textContent.includes('بررسی و ورود')).click());
  await p.waitForTimeout(500);
  console.log('  فرم ورود باز شد:', await p.$('#levRow') ? '✅' : '❌', '| پلنِ کارت:', await p.$$eval('#list .plan', e=>e.length)===0 ? '✅ نیست' : '❌');
  await p.click('#cx'); await p.waitForTimeout(400);
  console.log('\n=== پست اصلیِ ریپلای ===');
  console.log('  سربرگ ریپلای:', await p.$('.replyhead') ? '✅ هست' : '❌');
  console.log('  قبل از باز کردن، متن کامل:', await p.$$eval('.replyfull', e=>e.length), '(باید ۰)');
  await p.evaluate(() => document.querySelector('.replyhead').click());
  await p.waitForTimeout(500);
  const full = await p.evaluate(() => {
    const f = document.querySelector('.replyfull'); if (!f) return null;
    return {sig:[...f.querySelectorAll('.replysig span')].map(x=>x.textContent),
            txt:(f.querySelector('.replytxt')||{}).textContent.slice(0,50),
            go:!!([...f.querySelectorAll('button')].find(b=>b.textContent.includes('رفتن')))};
  });
  console.log('  خلاصه‌ی سیگنال اصلی:', full && full.sig.join(' · '));
  console.log('  متن کامل:', full && full.txt);
  console.log('  دکمه‌ی رفتن به پست اصلی:', full && full.go ? '✅' : '❌');
  await p.screenshot({path:require('./lib').out('reply.png')});
  await b.close();
})();
