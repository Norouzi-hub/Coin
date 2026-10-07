const {chromium} = require('./lib').pw;
const T0=require('./lib').tehranAfternoon();   // ساعت ثابت: نتیجه به ساعت اجرای تست بستگی ندارد
const D=h=>new Date(T0-h*3600e3).toISOString();
const posts=[
 {n:970,h:1,t:'#بیت_کوین لانگ<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۳۵۰۰'},
 {n:969,h:2,t:'خبر فوری: بازار آرام است'},
 {n:968,h:27,t:'#اتریوم شورت<br>ورود ۳۰۰۰<br>حد ضرر ۳۱۰۰'},
 {n:967,h:75,t:'#سولانا لانگ<br>ورود ۱۵۰<br>حد ضرر ۱۴۰'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div><time datetime="${D(p.h)}"></time></div></div>`).join('')}</body></html>`;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));
 await p.route('**',r=>{const u=r.request().url();if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});return r.abort();});
 await p.clock.install({time:T0});   // ساعت مرورگر هم همان لحظه
 await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3500);
 await p.evaluate(()=>{PRICES=new Map([['BTC',65100],['ETH',3000],['SOL',150]]);SYMBOLS=new Set(PRICES.keys());SYMVER++;PCACHE.clear();sigFilter='all';ACCOPEN='';renderAll();});
 await p.waitForTimeout(400);
 const seps=await p.$$eval('#list .dsep',e=>e.map(x=>x.textContent));
 console.log('  ',JSON.stringify(seps));
 ok(seps.length>=3&&seps[0].startsWith('امروز'),'جداکننده‌ها: امروز / دیروز / چند روز پیش');
 ok(seps.some(x=>x.startsWith('دیروز'))&&seps.some(x=>/^\d+ روز پیش/.test(x)),'دیروز و «N روز پیش»');
 const font=await p.evaluate(async()=>{await document.fonts.ready;return {loaded:document.fonts.check("16px 'Vazirmatn'"),ff:getComputedStyle(document.body).fontFamily};});
 ok(font.loaded,'فونت وزیرمتن بارگذاری شد ('+font.ff.split(',')[0]+')');
 const pers=await p.evaluate(()=>/[۰-۹]/.test(document.body.innerText));
 ok(!pers,'هیچ رقم فارسی روی صفحه نیست');
 await p.screenshot({path:require('./lib').out('days.png')});
 await p.evaluate(()=>{S.cal='jg';renderAll();});await p.waitForTimeout(300);
 const when=await p.$eval('#list .card .when',e=>e.textContent);
 const sep2=await p.$eval('#list .dsep span',e=>e.textContent);
 ok(/ · 20\d\d\//.test(when)&&/\(/.test(sep2),'تقویم «هر دو»: '+when+' | '+sep2);
 await p.evaluate(()=>{S.cal='g';renderAll();});await p.waitForTimeout(300);
 const w3=await p.$eval('#list .card .when',e=>e.textContent);
 ok(/20\d\d\//.test(w3)&&!/1405/.test(w3),'تقویم میلادی: '+w3);
 await b.close();})();
