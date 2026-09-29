const {chromium} = require('./lib').pw;
const D=h=>new Date(Date.now()-h*3600e3).toISOString();
const posts=[
 {n:960,h:1,t:'#بیت_کوین لانگ<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۳۵۰۰<br>تارگت ۶۹۰۰۰'},
 {n:959,h:2,t:'خبر فوری: #بیت_کوین به ۶۵۰۰۰ رسید؛ هدف بعدی ۷۰۰۰۰ است'},
 {n:958,h:30,t:'تارگت ۲ #سولانا زده شد ✅ سیو سود کنید'},
 {n:957,h:50,t:'ثبت نام در کمپین: روی لینک عضویت کلیک کنید.'},
 {n:956,h:30,t:'#اتریوم شورت<br>ورود ۳۰۰۰<br>حد ضرر ۳۱۰۰'},
 {n:955,h:24*10,t:'صبح بخیر دوستان، امروز بازار آرومه'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div><time datetime="${D(p.h)}"></time></div></div>`).join('')}</body></html>`;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:1000}});const p=await ctx.newPage();
 p.on('pageerror',e=>{bad++;console.log('PAGEERROR:',e.message)});p.on('dialog',d=>d.accept());
 await ctx.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(3000);
 await p.evaluate(()=>{ACCOPEN=null;});
 const ids=async()=>p.$$eval('#list .card',e=>e.map(c=>c.dataset.id.split('/').pop()).join(','));
 const clickFc=async(txt,sel='#fbar .fc')=>{await p.$$eval(sel,(bs,t)=>{const x=bs.find(b=>b.textContent.includes(t));if(!x)throw new Error('no chip '+t);x.click();},txt);await p.waitForTimeout(150);};
 console.log('=== فیلتر نوع در «همه» ===');
 await p.$$eval('#fbar .fb:not(.fday)',bs=>bs.find(b=>b.textContent.includes('همه')).click());
 await p.waitForTimeout(150);
 ok(await p.$$eval('#fbar .frow',r=>r.length)===1&&await p.$$eval('#fbar .fday select',r=>r.length)===1,'ردیف چیپ نوع + انتخاب‌گر روز');
 await clickFc('خبر');ok(await ids()==='959','خبر: '+await ids());
 await clickFc('اطلاع‌رسانی');ok(await ids()==='957','اطلاع‌رسانی: '+await ids());
 await clickFc('سیگنال');ok(await ids()==='960,956','سیگنال: '+await ids());
 const on=await p.$$eval('#fbar .fc.on',e=>e.map(x=>x.textContent));ok(on.length===1,'فقط یک چیپ نوع روشن: '+on);
 console.log('=== فیلتر روز ===');
 await clickFc('همه');   // kind all
 await p.selectOption('#fbar .fday select','today');await p.waitForTimeout(150);
 ok(await ids()==='960,959','امروز: '+await ids());
 await p.selectOption('#fbar .fday select','yest');await p.waitForTimeout(150);
 ok(await ids()==='958,956','دیروز: '+await ids());
 await p.selectOption('#fbar .fday select','week');await p.waitForTimeout(150);
 ok(await ids()==='960,959,958,957,956','7 روز: '+await ids());
 await p.selectOption('#fbar .fday select','range');await p.waitForTimeout(150);
 ok(await p.$$eval('#fbar .frange input',e=>e.length)===2,'بازه: دو ورودی تاریخ');
 const d2=new Date(Date.now()-2*864e5), d0=new Date(Date.now()-864e5);
 const iso=d=>d.toLocaleDateString('en-CA',{timeZone:'Asia/Tehran'});
 await p.fill('#fbar .frange label:nth-child(1) input',iso(d2));
 await p.$eval('#fbar .frange label:nth-child(1) input',i=>i.dispatchEvent(new Event('change')));
 await p.fill('#fbar .frange label:nth-child(2) input',iso(d0));
 await p.$eval('#fbar .frange label:nth-child(2) input',i=>i.dispatchEvent(new Event('change')));
 await p.waitForTimeout(150);
 ok(await ids()==='958,957,956','بازه‌ی پریروز تا دیروز: '+await ids());
 console.log('=== ماندگاری ===');
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 ok(await ids()==='958,957,956','بعد از بارگذاری دوباره همان بازه و همان «همه»: '+await ids());
 await p.selectOption('#fbar .fday select','all');await p.waitForTimeout(150);
 console.log('=== دسته‌ی خودم ===');
 // روی کارت 959 دکمه‌ی دسته
 await p.evaluate(()=>{S.feat.accordion=false;renderSignals();});
 const tray=await p.$$eval('#list .card[data-id$="/959"] .ftray .fchip',e=>e.map(x=>x.textContent));
 ok(tray.length===4&&tray[3]==='دسته','۴ کلید زیر پست، چهارمی «دسته»: '+tray);
 await p.$$eval('#list .card[data-id$="/959"] .ftray .fchip',e=>e[3].click());await p.waitForTimeout(400);
 await p.fill('#catN','مهم');await p.click('#catAdd');await p.waitForTimeout(150);
 ok(await p.$$eval('#catls .catt.on',e=>e.length)===1,'دسته ساخته شد و پست داخلش رفت');
 await p.fill('#catN','بلندمدت');await p.press('#catN','Enter');await p.waitForTimeout(150);
 await p.click('#cx');await p.waitForTimeout(450);
 // 957 هم به «مهم»
 await p.$$eval('#list .card[data-id$="/957"] .ftray .fchip',e=>e[3].click());await p.waitForTimeout(400);
 await p.$$eval('#catls .catt',e=>e.find(x=>x.textContent.includes('مهم')).click());await p.waitForTimeout(100);
 await p.click('#cx');await p.waitForTimeout(450);
 await clickFc('مهم');ok(await ids()==='959,957','دسته‌ی مهم: '+await ids());
 const lbl=await p.$eval('#list .card[data-id$="/959"] .ftray .fchip:nth-child(4)',e=>e.textContent);
 ok(lbl.includes('مهم')&&lbl.includes('+1'),'برچسب کلید دسته: '+lbl);
 // آرشیو کردن 957 — هنوز در دسته
 await p.evaluate(()=>{DB.archived[POSTS.find(x=>x.id.endsWith('/957')).id]=Date.now();save();renderSignals();});
 ok(await ids()==='959,957','پست آرشیوشده در دسته‌اش می‌ماند: '+await ids());
 // برداشتن 959 از دسته
 await p.$$eval('#list .card[data-id$="/959"] .ftray .fchip',e=>e[3].click());await p.waitForTimeout(400);
 await p.$$eval('#catls .catt',e=>e.find(x=>x.textContent.includes('مهم')).click());await p.waitForTimeout(100);
 await p.click('#cx');await p.waitForTimeout(450);
 ok(await ids()==='957','برداشتن از دسته: '+await ids());
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 ok(await ids()==='957','بعد از بارگذاری دوباره دسته‌ی «مهم» هنوز انتخاب است: '+await ids());
 await p.screenshot({path:require('./lib').out('cats.png')});
 // مدیریت: پاک کردن دسته
 await p.$$eval('#fbar .fc.add',e=>e[0].click());await p.waitForTimeout(400);
 ok(await p.$$eval('#catls .catrow',e=>e.length)===2,'ورق مدیریت: ۲ دسته');
 await p.$$eval('#catls .catrow',e=>e.find(x=>x.textContent.includes('مهم')).querySelector('.dgr').click());await p.waitForTimeout(100);
 await p.click('#cx');await p.waitForTimeout(450);
 const blob=await p.evaluate(()=>({cats:DB.cats.map(c=>c.n),pcat:Object.keys(DB.pcat).length,view:VIEW.cat}));
 ok(blob.cats.join()==='بلندمدت'&&blob.pcat===1&&blob.view==='','پاک شد و فیلتر به «همه» برگشت: '+JSON.stringify(blob));
 ok(await ids()==='960,959,958,956,955','همه‌ی پست‌های فعال: '+await ids());
 const bk=await p.evaluate(()=>Object.keys(dbBlob()).includes('cats')&&Object.keys(dbBlob()).includes('pcat'));
 ok(bk,'دسته‌ها در پشتیبان و همگام‌سازی هستند');
 console.log(bad?'✗'+bad:'✔ همه درست');
 await b.close();
})();
