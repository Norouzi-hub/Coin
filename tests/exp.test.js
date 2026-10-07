const {chromium}=require('./lib').pw;
const D=h=>new Date(Date.now()-h*3600e3).toISOString();
const posts=[
 {n:960,h:1,t:'#بیت_کوین لانگ<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۳۵۰۰<br>تارگت ۶۹۰۰۰'},
 {n:959,h:240,t:'#اتریوم شورت<br>ورود ۳۰۰۰<br>حد ضرر ۳۱۰۰'},
 {n:958,h:240,t:'#سولانا لانگ<br>ورود ۱۵۰<br>حد ضرر ۱۴۰'},
 {n:957,h:240,t:'#ریپل لانگ<br>ورود 2<br>حد ضرر 1.9'},
 {n:956,h:240,t:'خبر فوری: بازار امروز'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div><time datetime="${D(p.h)}"></time></div></div>`).join('')}</body></html>`;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});
 p.on('pageerror',e=>{bad++;console.log('PAGEERROR:',e.message)});p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{try{S.feat.accordion=false;}catch(e){}}));
 await p.route('**',r=>{const u=r.request().url();if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(3000);
 // 958: نگرفتم ؛ 957: وارد شدم و پوزیشن باز
 await p.evaluate(()=>{const id=n=>'c/1893051/'+n;
   DB.decisions[id(958)]={action:'skipped',at:Date.now()};
   DB.positions.push({id:'pp1',ticker:'XRP',dir:'long',status:'open',entry:2,stop:1.9,qty:1,openedAt:Date.now(),exits:[]});
   DB.decisions[id(957)]={action:'taken',at:Date.now(),posId:'pp1'};save();renderAll();});
 const fb=async()=>p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#fbar .fb:not(.fday)')].map(b=>[b.querySelector('span').textContent.trim(),+b.querySelector('i').textContent])));
 const ids=async()=>p.$$eval('#list .card',e=>e.map(c=>c.dataset.id.split('/').pop()).join(','));
 let c=await fb();console.log('  ',JSON.stringify(c));
 ok(c['منقضی']===2,'منقضی: ۲ (اتریوم بی‌تصمیم + سولانای نگرفته)');
 ok(c['سیگنال‌ها']===undefined,'بخش «سیگنال‌ها» برداشته شد (همان «همه» › سیگنال)');
 ok(c['همه']===2&&c['آرشیو']===1,'همه: منقضی‌ها شمرده نمی‌شوند (تازه، ریپل)؛ خبر در آرشیو');
 ok(c['در انتظار']===1,'در انتظار: ۱');
 await p.evaluate(()=>{bucket='live';sigFilter='sig';renderSignals();});
 ok(await ids()==='960,957'&&await p.evaluate(()=>sigFilter==='all'),'sigFilter قدیمی sig ← «همه»: '+await ids());
 await p.$$eval('#fbar .fbucket',bs=>bs.find(b=>b.textContent.includes('منقضی')).click());await p.waitForTimeout(200);
 ok(await ids()==='959,958','سطل منقضی: '+await ids());
 const card=await p.$eval('#list .card[data-id$="/959"]',c=>({pill:[...c.querySelectorAll('.pill')].map(x=>x.textContent).join('|'),rv:!!c.querySelector('.stale .btn'),enter:!!c.querySelector('.brief')}));
 ok(/منقضی/.test(card.pill)&&card.rv&&!card.enter,'کارت منقضی: برچسب، دکمه‌ی برگرداندن، بدون ورود');
 await p.screenshot({path:require('./lib').out('exp.png')});
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 ok(await ids()==='959,958','بعد از بارگذاری دوباره هنوز در «منقضی»');
 await p.$eval('#list .card[data-id$="/959"] .stale .btn',b=>b.click());await p.waitForTimeout(300);
 ok(await ids()==='958','برگرداندن دستی: از منقضی بیرون رفت');
 c=await fb();ok(c['منقضی']===1&&c['در انتظار']===2,'شمارنده‌ها بعد از برگرداندن: '+JSON.stringify(c));
 await p.$$eval('#fbar .fbucket',bs=>bs.find(b=>b.textContent.includes('منقضی')).click());await p.waitForTimeout(200);
 ok((await ids()).includes('959'),'اتریوم دوباره در فهرست فعال');
 const tab=await p.$eval('#cSig',e=>e.textContent);ok(tab==='2','شمارنده‌ی تب: '+tab);
 console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
