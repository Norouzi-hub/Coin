const {chromium} = require('./lib').pw;
const D=h=>new Date(Date.now()-h*3600e3).toISOString();
const posts=[
 {n:960,h:1,t:'#بیت_کوین لانگ<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۳۵۰۰<br>تارگت ۶۹۰۰۰'},
 {n:959,h:2,t:'خبر فوری: #بیت_کوین به ۶۵۰۰۰ رسید؛ هدف بعدی ۷۰۰۰۰ است'},
 {n:958,h:3,t:'تارگت ۲ #سولانا زده شد ✅ سیو سود کنید'},
 {n:957,h:4,t:'ثبت نام در کمپین: روی لینک عضویت کلیک کنید. الان با 430 نفر رتبه 24 داریم'},
 {n:956,h:5,t:'#اتریوم شورت<br>ورود ۳۰۰۰<br>حد ضرر ۳۱۰۰'},
 {n:955,h:6,t:'صبح بخیر دوستان، امروز بازار آرومه'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div><time datetime="${D(p.h)}"></time></div></div>`).join('')}</body></html>`;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
const fa=t=>+String(t).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:1000}});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(3500);
 await p.evaluate(()=>{PRICES=new Map([['BTC',65100],['ETH',3000],['SOL',150]]);SYMBOLS=new Set(PRICES.keys());SYMVER++;PCACHE.clear();renderAll();});
 await p.waitForTimeout(300);
 console.log('=== نوع پست‌ها ===');
 const k=await p.evaluate(()=>Object.fromEntries(POSTS.map(x=>[x.id.split('/').pop(),postKind(x)])));
 console.log('  ',JSON.stringify(k));
 ok(k[960]==='sig'&&k[956]==='sig','دو سیگنال واقعی: سیگنال');
 ok(k[959]==='news','خبرِ «به ۶۵۰۰۰ رسید؛ هدف بعدی…» دیگر سیگنال نیست → خبر');
 ok(k[958]==='res','«تارگت ۲ زده شد» → نتیجه');
 ok(k[957]==='ann','کمپین/ثبت نام → اطلاع‌رسانی');
 ok(k[955]==='note','بقیه → یادداشت');
 const fb=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#fbar .fb:not(.fday)')].map(b=>[b.querySelector('span').textContent.trim(),b.querySelector('i').textContent])));
 console.log('  ',JSON.stringify(fb));
 ok(fb['سیگنال‌ها']==null&&fa(fb['در انتظار'])===2,'در انتظار: فقط ۲ سیگنال (بخش «سیگنال‌ها» برداشته شد)');
 ok(fa(fb['همه'])===3,'همه: سیگنال‌ها و نتیجه (خبر، اطلاع‌رسانی، یادداشت در آرشیو)');
 ok(fa(fb['آرشیو'])===3,'آرشیو: خبر، اطلاع‌رسانی و یادداشت خودشان آرشیو شدند');
 ok(fa(fb['نتایج'])===1,'نتایج: ۱');
 const ids=async()=>p.$$eval('#list .card',e=>e.map(c=>c.dataset.id.split('/').pop()));
 await p.evaluate(()=>{sigFilter='new';bucket='live';ACCOPEN=null;renderSignals();});
 ok(JSON.stringify(await ids())==='["960","956"]','در انتظار: '+await ids());
 await p.evaluate(()=>{bucket='res';renderSignals();});
 ok(JSON.stringify(await ids())==='["958"]','فیلتر نتایج: '+await ids());
 await p.evaluate(()=>{bucket='arch';renderSignals();});
 ok(JSON.stringify(await ids())==='["959","957","955"]','آرشیو: '+await ids());
 const pills=await p.evaluate(()=>[...document.querySelectorAll('#list .card')].map(c=>c.querySelector('.pill.kind')?.textContent||'—'));
 console.log('   برچسب‌ها:',JSON.stringify(pills));
 ok(pills.includes('خبر')&&pills.includes('اطلاع‌رسانی')&&pills.includes('یادداشت'),'برچسب خبر / اطلاع‌رسانی / یادداشت روی کارت‌های آرشیو');
 // برگرداندن یکی از آرشیو: دیگر خودکار آرشیو نمی‌شود
 await p.evaluate(()=>{setArch(POSTS.find(x=>x.id.endsWith('/959')).id,false);bucket='live';sigFilter='all';renderSignals();});
 ok((await ids()).includes('959'),'خبرِ برگردانده در «همه» ماند');
 ok(await p.evaluate(()=>!document.querySelector('#fbar .frow .fc')),'ردیف چیپ «نوع پست» برداشته شد');

 console.log('=== آکاردئون ===');
 await p.evaluate(()=>{setArch(POSTS.find(x=>x.id.endsWith('/959')).id,true);ACCOPEN=null;bucket='live';sigFilter='all';renderSignals();});
 const st=async()=>p.evaluate(()=>[...document.querySelectorAll('#list .card')].map(c=>c.classList.contains('accopen')?'O':(c.classList.contains('tight')?'-':'?')).join(''));
 ok(await st()==='O--','اول فقط کارت اول باز است: '+await st());
 await p.evaluate(()=>document.querySelectorAll('#list .card')[2].querySelector('.chead').click());
 await p.waitForTimeout(300);
 ok(await st()==='--O','زدن روی کارت ۳ → فقط ۳ باز، اولی بسته شد: '+await st());
 const sum=await p.evaluate(()=>document.querySelector('#list .card.tight .csum')?.textContent);
 ok(/ورود/.test(sum),'کارت بسته خلاصه‌ی یک‌خطی دارد: «'+sum+'»');
 await p.evaluate(()=>document.querySelectorAll('#list .card')[2].querySelector('.chead').click());
 await p.waitForTimeout(300);
 ok(await st()==='---','زدن روی سربرگ کارت باز → همه بسته');
 await p.evaluate(()=>{ACCOPEN=null;sigFilter='new';renderSignals();});
 await p.screenshot({path:require('./lib').out('acc.png')});

 console.log('=== کانال‌سنج ===');
 const au=await p.evaluate(()=>{const R=audRules();const rows=POSTS.map(x=>[x.id.split('/').pop(),!!audInput(x)]);return Object.fromEntries(rows);});
 ok(au[960]&&au[956]&&!au[959]&&!au[958]&&!au[957],'فقط سیگنال‌های واقعی سنجیده می‌شوند '+JSON.stringify(au));
 const q=await p.evaluate(()=>{
   const R=audRules();const btc=POSTS.find(x=>x.id.endsWith('/960')),eth=POSTS.find(x=>x.id.endsWith('/956'));
   AUD[btc.id]={k:audKey(audInput(btc),R),st:'win',fin:true,at:Date.now()-864e5,tTp:[1]};   // نتیجه‌ی قدیمیِ بی‌مسیر
   delete AUD[eth.id];                                                                        // سیگنالِ تازه‌ی نسنجیده
   const j=audJobs(false,true);return j.map(x=>({id:x.p.id.split('/').pop(),path:!!x.pathOnly}));});
 console.log('   صف:',JSON.stringify(q));
 ok(q.length===2&&q[0].id==='956'&&!q[0].path&&q[1].path,'سیگنال تازه اول صف، مسیرِ قدیمی آخر');
 // شکست گرفتن کندل برای کار «فقط مسیر» نباید نتیجه‌ی قبلی را خراب کند
 const kept=await p.evaluate(async()=>{
   const btc=POSTS.find(x=>x.id.endsWith('/960'));AUDQ.at=0;
   await audRun(false,true);                 // همه‌ی کندل‌ها در این تست بسته‌اند → شکست
   return {st:AUD[btc.id].st,err:AUDQ.err};});
 ok(kept.st==='win','بعد از شکستِ گرفتن مسیر، نتیجه‌ی «برد» سر جایش ماند');
 await b.close();
})();
