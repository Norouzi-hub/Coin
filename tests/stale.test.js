const {chromium} = require('./lib').pw;
const D=d=>new Date(Date.now()-d*864e5).toISOString();
const posts=[
 {n:760,d:0.2,t:'هنوز میشه وارد شد، ناحیه خوبیه',reply:750},
 {n:759,d:0.5,t:'#سولانا هنوز قابل ورود نیست، صبر کنید'},
 {n:758,d:1,  t:'#بیت_کوین لانگ<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۳۵۰۰<br>تارگت ۶۹۰۰۰'},
 {n:757,d:2,  t:'#کاردانو همچنان معتبره، می‌تونید بگیرید'},
 {n:756,d:3,  t:'#بایننس_کوین لانگ<br>ورود ۶۰۰<br>حد ضرر ۵۸۰'},
 {n:755,d:9,  t:'#کاردانو لانگ<br>ورود ۰.۵<br>حد ضرر ۰.۴۵<br>تارگت ۰.۶'},
 {n:752,d:10, t:'#سولانا لانگ<br>ورود ۱۵۰<br>حد ضرر ۱۴۰'},
 {n:751,d:11, t:'#ریپل لانگ<br>ورود ۰.۶<br>حد ضرر ۰.۵۵'},
 {n:750,d:12, t:'#اتریوم لانگ<br>ورود ۳۰۰۰<br>حد ضرر ۲۸۵۰<br>تارگت ۳۳۰۰'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}">
 <div class="tgme_widget_message_bubble">${p.reply?`<a class="tgme_widget_message_reply" href="https://t.me/c/1893051/${p.reply}"><div class="tgme_widget_message_text">اتریوم لانگ</div></a>`:''}
 <div class="tgme_widget_message_text">${p.t}</div>
 <time datetime="${D(p.d)}"></time></div></div>`).join('')}</body></html>`;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
const fa=t=>+String(t).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:1000}});await p.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{try{S.feat.accordion=false;renderAll();}catch(e){}}));
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(4000);
 await p.evaluate(()=>{PRICES=new Map([['BTC',65000],['ETH',3000],['SOL',150],['XRP',0.6],['ADA',0.5],['BNB',600]]);
  SYMBOLS=new Set(PRICES.keys());SYMVER++;sigFilter='sig';renderAll();});
 await p.waitForTimeout(500);
 const st=await p.evaluate(()=>POSTS.map(x=>({n:x.id.split('/').pop(),sig:sigOf(x).isSignal,tk:sigOf(x).ticker,stale:isStale(x),hint:(reentryHint(x)||{}).id||null})));
 console.log('  ',JSON.stringify(st));
 const S_=Object.fromEntries(st.map(x=>[x.n,x]));
 ok(!S_[758].stale&&!S_[756].stale,'سیگنال‌های ۱ و ۳ روزه تازه‌اند');
 ok(S_[755].stale&&S_[752].stale&&S_[750].stale,'سیگنال‌های ۹ تا ۱۲ روزه قدیمی‌اند');
 ok(/760$/.test(S_[750].hint||''),'اشاره‌ی ریپلای‌شده‌ی «هنوز میشه وارد شد» به ETH وصل شد');
 ok(/757$/.test(S_[755].hint||''),'اشاره‌ی «همچنان معتبره، می‌تونید بگیرید» با نماد به ADA وصل شد');
 ok(!S_[752].hint,'«هنوز قابل ورود نیست» اشاره حساب نشد (نفی)');
 ok(!S_[751].hint,'XRP بی‌اشاره ماند');

 const fb=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#fbar .fseg .fb')].map(b=>[b.querySelector('span').textContent,b.querySelector('i').textContent])));
 console.log('  ',JSON.stringify(fb));
 ok(fa(fb['در انتظار'])===2,'«در انتظار» فقط دو سیگنال تازه');
 ok(fa(fb['سیگنال‌ها'])===2,'«سیگنال‌ها» فقط دو سیگنال زنده؛ منقضی‌ها بیرون‌اند');
 const nExp=await p.evaluate(()=>+[...document.querySelectorAll('#fbar .fbucket')].find(b=>b.textContent.includes('منقضی')).querySelector('i').textContent);
 ok(nExp===4,'سطل «منقضی»: ۴ سیگنال');
 ok(fa(await p.$eval('#cSig',e=>e.textContent))===2,'شمارنده‌ی تب ۲');

 const cardInfo=async n=>p.evaluate(n=>{const c=[...document.querySelectorAll('#list .card')].find(c=>c.dataset.id.endsWith('/'+n));
   if(!c)return null;return {old:c.classList.contains('old'),pills:[...c.querySelectorAll('.pill')].map(x=>x.textContent),
    brief:!!c.querySelector('.brief'),stale:!!c.querySelector('.stale'),hint:c.querySelector('.stalehint')?.textContent||null,
    quick:!!c.querySelector('.brief .btn.side'),revBtn:c.querySelector('.stale .btn')?.className};},n);
 await p.evaluate(()=>{bucket='exp';renderSignals();});
 const e750=await cardInfo(750), e751=await cardInfo(751);
 await p.evaluate(()=>{bucket='live';renderSignals();});
 const e758=await cardInfo(758);
 console.log('  ',JSON.stringify(e750));
 ok(e750.stale&&!e750.brief&&e750.pills.includes('منقضی'),'کارت ETH: برچسب منقضی، بدون دکمه‌ی ورود');
 ok((e750.hint||'').includes('هنوز میشه وارد شد'),'متن اشاره‌ی کانال روی کارت');
 ok(/\bok\b/.test(e750.revBtn),'دکمه‌ی برگرداندن با اشاره پررنگ است');
 ok(e751.stale&&!e751.hint&&/side/.test(e751.revBtn),'XRP: برگرداندن دستی کم‌رنگ، بی‌اشاره');
 ok(e758.brief&&!e758.stale&&!e758.old,'BTC تازه دکمه‌های ورود دارد');

 // فیلتر در انتظار
 await p.evaluate(()=>{sigFilter='new';renderSignals();});
 const ids=await p.$$eval('#list .card',e=>e.map(c=>c.dataset.id.split('/').pop()));
 ok(JSON.stringify(ids)==='["758","756"]','فیلتر «در انتظار»: '+ids);
 await p.evaluate(()=>{sigFilter='sig';renderSignals();});

 // برگرداندن
 await p.evaluate(()=>{bucket='exp';renderSignals();});
 await p.evaluate(()=>[...document.querySelectorAll('#list .card')].find(c=>c.dataset.id.endsWith('/750')).querySelector('.stale .btn').click());
 await p.waitForTimeout(400);
 await p.evaluate(()=>{bucket='live';renderSignals();});
 const r750=await cardInfo(750);
 ok(r750.brief&&!r750.stale&&r750.pills.includes('برگشته'),'ETH برگشت: دکمه‌های ورود و برچسب «برگشته»');
 ok(await p.evaluate(()=>DB.revived['c/1893051/750'].by==='ch'),'ثبت شد که به اشاره‌ی کانال برگشته');
 ok(fa(await p.$eval('#cSig',e=>e.textContent))===3,'شمارنده‌ی تب ۳ شد');
 // ماندگاری
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForTimeout(3500);
 await p.evaluate(()=>{PRICES=new Map([['BTC',65000],['ETH',3000],['SOL',150],['XRP',0.6],['ADA',0.5],['BNB',600]]);SYMBOLS=new Set(PRICES.keys());SYMVER++;renderAll();});
 await p.waitForTimeout(300);
 ok(!(await p.evaluate(()=>isStale(POSTS.find(x=>x.id.endsWith('/750'))))),'بعد از رفرش هم برگشته ماند');
 // قدیمی کن
 await p.evaluate(()=>[...[...document.querySelectorAll('#list .card')].find(c=>c.dataset.id.endsWith('/750')).querySelectorAll('.brief .btn')].find(b=>b.textContent==='منقضی کن').click());
 await p.waitForTimeout(300);
 await p.evaluate(()=>{bucket='exp';renderSignals();});
 ok((await cardInfo(750)).stale,'«منقضی کن» برش گرداند به منقضی');
 await p.evaluate(()=>{bucket='live';renderSignals();});

 // عمر سیگنال از تنظیمات
 await p.evaluate(()=>{S.staleDays=10;renderAll();});
 const s10=await p.evaluate(()=>['755','751','750'].map(n=>isStale(POSTS.find(x=>x.id.endsWith('/'+n)))));
 ok(JSON.stringify(s10)==='[false,true,true]','با عمر ۱۰ روز: ۹ روزه تازه، ۱۱ و ۱۲ روزه قدیمی '+JSON.stringify(s10));
 await p.evaluate(()=>{S.staleDays=7;renderAll();});

 // سفارش منتظر
 await p.evaluate(()=>{const now=Date.now();
   DB.pending=[{id:'w1',postId:'c/1893051/752',ticker:'SOL',dir:'long',trigger:160,side:'up',market:'futures',entry:160,stop:140,targets:[],at:now-9*864e5,hit:null,postAt:now-10*864e5},
               {id:'w2',postId:'c/1893051/756',ticker:'BNB',dir:'long',trigger:610,side:'up',market:'futures',entry:610,stop:580,targets:[],at:now-2*864e5,hit:null}];
   save();PRICES.set('SOL',165);PRICES.set('BNB',615);checkPending();renderAll();});
 const pw=await p.evaluate(()=>DB.pending.map(w=>({id:w.id,hit:!!w.hit})));
 ok(JSON.stringify(pw)==='[{"id":"w1","hit":false},{"id":"w2","hit":true}]','سفارش منتظرِ قدیمی هشدار نداد، تازه داد '+JSON.stringify(pw));
 await p.evaluate(()=>{go('positions',true);posFilter='pending';renderPositions();});
 await p.waitForTimeout(300);
 const pc=await p.$$eval('#posList .card',e=>e.map(c=>({old:c.classList.contains('old'),pill:[...c.querySelectorAll('.pill')].map(x=>x.textContent).join('|'),fill:!c.querySelector('.acts .btn:not(.hide)')?.textContent.includes('برداشتن')})));
 console.log('  ',JSON.stringify(pc));
 ok(pc.some(x=>x.old&&x.pill.includes('قدیمی شد')),'کارت منتظرِ قدیمی برچسب «قدیمی شد» دارد');
 ok(fa(await p.$eval('#cWait',e=>e.textContent))===1,'شمارنده‌ی منتظرها فقط فعال‌ها را می‌شمرد');
 await p.screenshot({path:require('./lib').out('stale_pending.png')});

 // پشتیبان همه‌چیز را می‌برد
 const ex=await p.evaluate(()=>Object.keys(Object.assign({v:5},dbBlob(),{settings:S})));
 ok(['results','edits','gone','revived'].every(k=>ex.includes(k)),'پشتیبان: نتایج/ویرایش/حذف/برگشته هم هست');

 await p.evaluate(()=>{go('signals',true);bucket='exp';renderSignals();});
 await p.waitForTimeout(300);
 const eh=await p.evaluateHandle(()=>[...document.querySelectorAll('#list .card')].find(c=>c.dataset.id.endsWith('/750')));
 await eh.asElement().screenshot({path:require('./lib').out('stale_card.png')});
 await b.close();
})();
