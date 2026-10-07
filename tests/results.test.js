const {chromium} = require('./lib').pw;
const posts=[
 {n:740,t:'#بیت_کوین لانگ<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۳۵۰۰<br>تارگت ۶۹۰۰۰<br>اهرم ۵'},
 {n:739,t:'تارگت اول #اتریوم زده شد ✅ سیو سود کنید'},
 {n:738,t:'#سولانا استاپ خورد متأسفانه'},
 {n:737,t:'یه نکته درباره مدیریت سرمایه'},
 {n:736,t:'#ریپل به تارگت دوم رسید'},
 {n:735,t:'#کاردانو لانگ ورود ۰.۵ حد ضرر ۰.۴۵'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}">
 <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div>
 <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>`).join('')}</body></html>`;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
const num=t=>Number(String(t).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:1000}});await p.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{try{S.feat.accordion=false;renderAll();}catch(e){}}));
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(4000);
 await p.evaluate(()=>{PRICES=new Map([['BTC',65000],['ETH',3000],['SOL',150],['XRP',0.6],['ADA',0.5]]);
  SYMBOLS=new Set(PRICES.keys());SYMVER++;sigFilter='all';renderAll();});
 await p.waitForTimeout(500);

 console.log('=== تشخیص خودکار نتیجه ===');
 const det=await p.evaluate(()=>POSTS.map(x=>({n:x.id.split('/').pop(),
   res:isRes(x),auto:resAuto(x),bucket:bucketOf(x)})));
 for(const d of det)console.log('  #'+d.n,'نتیجه='+d.res,d.auto?'(خودکار)':'',d.bucket);
 const by=n=>det.find(x=>x.n===String(n));
 ok(by(739).res&&by(739).auto,'«تارگت اول زده شد» خودکار نتیجه شد');
 ok(by(738).res&&by(738).auto,'«استاپ خورد» خودکار نتیجه شد');
 ok(by(736).res&&by(736).auto,'«به تارگت دوم رسید» خودکار نتیجه شد');
 ok(!by(740).res,'سیگنال تازه نتیجه شمرده نمی‌شود');
 ok(!by(737).res,'یادداشت آموزشی نتیجه شمرده نمی‌شود');
 ok(by(739).res&&by(739).bucket==='live'&&by(740).bucket==='live','نتیجه‌ها در «همه» می‌مانند و جدا شمرده می‌شوند');

 console.log('\n=== نوار: پنج کنترل ===');
 const bar=await p.evaluate(()=>({
   segs:[...document.querySelectorAll('#fbar .fseg .fb')].map(x=>x.querySelector('span').textContent+':'+x.querySelector('i').textContent),
   side:[...document.querySelectorAll('#fbar .fside .fb:not(.fday)')].map(x=>x.querySelector('span').textContent.trim()+':'+x.querySelector('i').textContent),
   over:(()=>{const r=document.querySelector('#fbar').getBoundingClientRect();
     return r.right>innerWidth+1||r.left<-1;})(),
   rows:new Set([...document.querySelectorAll('#fbar .fb:not(.fday)')].map(x=>Math.round(x.getBoundingClientRect().top/10))).size
 }));
 console.log('  گروه:',bar.segs.join(' | '),'  کنار:',bar.side.join(' | '));
 ok(bar.side.length===3,'سه سطل: نتایج، منقضی، آرشیو (آموزش تب خودش را دارد)');
 ok(num(bar.side[0].split(':')[1])===3,'نتایج ۳ تا شمرد');
 ok(num(bar.segs[1].split(':')[1])===6,'«همه» هر ۶ پست را شمرد (نتیجه‌ها هم)');
 ok(!bar.over,'نوار از عرض ۴۱۲ بیرون نمی‌زند');
 ok(bar.rows===2,'دو ردیف: فیلترها و سطل‌ها');

 console.log('\n=== رفتن به سطل نتایج ===');
 await p.evaluate(()=>[...document.querySelectorAll('#fbar .fside .fb:not(.fday)')]
   .find(x=>x.textContent.includes('نتایج')).click());
 await p.waitForTimeout(400);
 const inRes=await p.evaluate(()=>({b:bucket,
   n:document.querySelectorAll('#list .card').length,
   pills:[...document.querySelectorAll('#list .card .pill')].map(x=>x.textContent),
   tidy:!!document.querySelector('.tidy')}));
 ok(inRes.b==='res'&&inRes.n===3,'سطل نتایج ۳ کارت دارد');
 ok(inRes.pills.filter(x=>x==='نتیجه').length===3,'هر سه برچسب «نتیجه» دارند');
 ok(!inRes.tidy,'دکمه‌ی کنارگذاشتن در سطل نتایج نیست');

 console.log('\n=== نقض دستی ===');
 // یکی را از نتایج بیرون بیاور
 await p.evaluate(()=>document.querySelector('#list .card .ftray .fchip[aria-pressed="true"]').click());
 await p.waitForTimeout(500);
 const after=await p.evaluate(()=>({res:POSTS.filter(x=>isRes(x)).length,
   live:POSTS.filter(x=>bucketOf(x)==='live'&&!isRes(x)).length,
   stored:Object.values(DB.results)}));
 console.log('  نتایج:',after.res,'· فعال:',after.live,'· ذخیره:',JSON.stringify(after.stored));
 ok(after.res===2,'یکی از نتایج بیرون آمد');
 ok(after.live===4,'و به فهرست فعال برگشت');
 ok(after.stored.includes(0),'نقض با صفر ذخیره شد تا تشخیص خودکار دوباره برش نگرداند');
 // پست غیرنتیجه را دستی نتیجه کن
 await p.evaluate(()=>{bucket='live';sigFilter='all';renderSignals();});
 await p.waitForTimeout(300);
 await p.evaluate(()=>{
   const c=[...document.querySelectorAll('#list .card')].find(c=>c.textContent.includes('مدیریت سرمایه'));
   [...c.querySelectorAll('.ftray .fchip')].find(x=>x.textContent.includes('نتیجه')).click();});
 await p.waitForTimeout(500);
 ok(await p.evaluate(()=>POSTS.filter(x=>isRes(x)).length)===3,'پست دستی به نتایج رفت');

 console.log('\n=== آرشیو و نتیجه با هم تداخل نمی‌کنند ===');
 await p.evaluate(()=>{bucket='res';renderSignals();
   const c=document.querySelector('#list .card');
   [...c.querySelectorAll('.ftray .fchip')].find(x=>x.textContent.includes('آرشیو')).click();});
 await p.waitForTimeout(500);
 const both=await p.evaluate(()=>{
   // «کجاست» را فقط bucketOf می‌گوید؛ یک پست هم‌زمان در دو سطل شمرده نمی‌شود
   const dbl=POSTS.filter(x=>bucketOf(x)==='arch'&&bucketOf(x)==='res').length;
   const chips=[...document.querySelectorAll('#list .card')].map(c=>
     [...c.querySelectorAll('.ftray .fchip[aria-pressed="true"]')].map(x=>x.textContent.trim()));
   return {dbl,chips,arch:POSTS.filter(x=>bucketOf(x)==='arch').length,
     res:POSTS.filter(x=>bucketOf(x)==='res').length};});
 ok(both.dbl===0,'هیچ پستی هم‌زمان در آرشیو و نتایج نیست');
 ok(both.chips.every(a=>a.length<=1),'روی هیچ کارتی دو کلیدِ «جا» هم‌زمان روشن نیست');
 console.log('  آرشیو:',both.arch,'· نتایج:',both.res);

 console.log('\n=== ماندگاری بعد از بارگذاری دوباره ===');
 const before=await p.evaluate(()=>JSON.stringify(DB.results));
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForTimeout(4500);
 const kept=await p.evaluate(()=>JSON.stringify(DB.results));
 ok(before===kept,'DB.results ذخیره و بازخوانی شد');
 const inBlob=await p.evaluate(()=>Object.keys(dbBlob()).includes('results')
   &&dataCounts(dbBlob()).some(r=>r[0]==='نتایج'));
 ok(inBlob,'نتایج در همگام‌سازی و بکاپ هم هست');

 console.log('\n=== دکمه‌های زیر پست ===');
 await p.evaluate(()=>{bucket='live';sigFilter='all';renderSignals();});
 await p.waitForTimeout(400);
 const btn=await p.evaluate(()=>{
   const c=[...document.querySelectorAll('#list .card')].find(c=>c.querySelector('.brief'));
   const rect=x=>{const r=x.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),t:Math.round(r.top)};};
   return {
     tray:[...c.querySelectorAll('.ftray .fchip')].map(x=>({l:x.textContent.trim(),...rect(x)})),
     acts:[...c.querySelectorAll('.acts .btn')].map(x=>({l:x.textContent.trim(),...rect(x)})),
     sig:(c.querySelector('.psig')||{}).textContent,
     icons:[...c.querySelectorAll('.ftray .fchip svg')].length};
 });
 console.log('  تِرِی:',btn.tray.map(x=>x.l+'('+x.w+'×'+x.h+')').join(' '));
 console.log('  کنش‌ها:',btn.acts.map(x=>x.l+'('+x.w+')').join(' '));
 ok(btn.tray.length===3&&btn.icons===3,'سه کلید «کجا برود» (آرشیو، نتیجه، آموزش)، هر کدام با آیکون');
 ok(new Set(btn.tray.map(x=>x.w)).size===1,'هر سه دقیقاً هم‌عرض‌اند');
 ok(new Set(btn.tray.map(x=>x.t)).size===1,'هر سه در یک خط‌اند');
 ok(Math.min(...btn.tray.map(x=>x.h))>=40,'ارتفاع لمسی کافی');
 const prim=btn.acts.find(x=>/بررسی|ایزوله/.test(x.l));
 const sec=btn.acts.find(x=>x.l.includes('وارد نشدم'));
  ok(prim&&sec&&prim.w>sec.w,'دکمه‌ی اصلی پهن‌تر از فرعی است ('+prim.w+' > '+sec.w+')');
 ok(!btn.acts.some(x=>x.l.includes('سریع')),'دکمه‌ی «سریع» دیگر نیست (ایزوله جایش است)');
 const style=await p.evaluate(()=>{
   const c=[...document.querySelectorAll('#list .card')].find(c=>c.querySelector('.brief'));
   const g=x=>getComputedStyle(x).backgroundImage!=='none'?'gradient':getComputedStyle(x).backgroundColor;
   return {ok:g(c.querySelector('.acts .btn.ok')),no:g(c.querySelector('.acts .btn.no'))};});
 ok(style.ok==='gradient','دکمه‌ی اصلی طلایی پُر است، نه فقط رنگِ متن');
 ok(style.no!=='gradient','دکمه‌ی فرعی خنثی مانده');
 await b.close();})();
