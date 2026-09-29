const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
const H=36e5,D=h=>new Date(Date.now()-h*H).toISOString();
const post=(n,h,t,reply)=>`<div class="tgme_widget_message" data-post="ccoineres/${n}"><div class="tgme_widget_message_bubble">`+
 (reply?`<a class="tgme_widget_message_reply" href="https://t.me/ccoineres/${reply}"><div class="tgme_widget_message_text">x</div></a>`:'')+
 `<div class="tgme_widget_message_text">${t}</div><time datetime="${D(h)}"></time></div></div>`;
const html='<html><body>'+[
 post(800,5,'#بیت_کوین لانگ<br>ورود 100<br>حد ضرر 90<br>تارگت 110<br>تارگت 120<br>تارگت 130'),
 post(801,3,'تارگت اول بیت کوین زده شد ✅ سیو سود کنید',800),
 post(802,2,'استاپ رو بیارید روی 105',800),
 post(803,1.5,'ریسک فری کنید دوستان',800),
 post(804,1,'#بیت_کوین رو ببندید',0),
 post(805,0.5,'#اتریوم لانگ<br>ورود 3000<br>حد ضرر 2900<br>تارگت 3100')].join('')+'</body></html>';
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  if(u.includes('ticker/price'))return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify([{symbol:'BTCUSDT',price:'108'}].concat(Array.from({length:40},(_,i)=>({symbol:'Z'+i+'USDT',price:'1'}))))});
  return r.abort();});
 await p.addInitScript(()=>{if(sessionStorage.getItem('x'))return;sessionStorage.setItem('x',1);localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[
   {id:'a',ticker:'BTC',dir:'long',kind:'spot',entry:100,stop:90,margin:10,lev:1,openedAt:Date.now()-4*36e5,status:'open',targets:[110,120,130],partials:[],log:[],sigId:'ccoineres/800'}],
   decisions:{'ccoineres/800':{action:'taken',at:Date.now()-4*36e5,posId:'a'}},settings:{feat:{autoexec:false}}}));});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(3500);
 const f=await p.evaluate(()=>followsFor(DB.positions[0]).map(x=>x.q.id.split('/')[1]+':'+x.f.kind+(x.f.v?'='+x.f.v:'')+(x.f.n?'#'+x.f.n:'')+':'+x.how));
 console.log('   ',f.join(' | '));
 ok(f.includes('801:tp#1:reply'),'«تارگت اول زده شد سیو سود» ← سیو سود، از روی ریپلای');
 ok(f.includes('802:stop=105:reply'),'«استاپ رو بیارید روی 105» ← جابه‌جایی استاپ');
 ok(f.includes('803:be:reply'),'«ریسک فری کنید» ← استاپ روی ورود');
 ok(f.includes('804:close:guess'),'«#بیت_کوین رو ببندید» بدون ریپلای ← خروج (حدسی)');
 ok(!f.some(x=>x.startsWith('805')),'سیگنال تازه‌ی اتریوم پیگیری حساب نشد');
 await p.evaluate(()=>{POSOPEN.add('a');go('positions',true);renderAll();});await p.waitForTimeout(300);
 const pill=await p.evaluate(()=>document.querySelector('#pos-a .chead').textContent);
 ok(pill.includes('کانال: خروج'),'روی سربرگ کارت: «کانال: خروج» — '+pill);
 const n0=await p.evaluate(()=>document.querySelectorAll('#pos-a .fwi').length);
 ok(n0===4,'چهار پیگیری در کادر کانال: '+n0);
 // جابه‌جایی استاپ
 await p.evaluate(()=>[...document.querySelectorAll('#pos-a .fwi')].find(x=>x.textContent.includes('105')).querySelector('.btn.pri').click());
 await p.waitForTimeout(300);
 let a=await p.evaluate(()=>DB.positions[0]);
 ok(a.stop===105&&a.log.some(l=>l.t.includes('طبق پست کانال')),'استاپ روی 105 رفت و در تاریخچه ثبت شد');
 ok(await p.evaluate(()=>!!document.querySelector('#toast .tundo')),'با دکمه‌ی برگرداندن');
 const f2=await p.evaluate(()=>followsFor(DB.positions[0]).map(x=>x.q.id.split('/')[1]));
 ok(!f2.includes('802')&&!f2.includes('803'),'انجام‌شده‌ها رفتند؛ ریسک‌فری هم چون استاپ بالای ورود است دیگر لازم نیست — '+f2);
 await p.evaluate(()=>[...document.querySelectorAll('#pos-a .fwi')].find(x=>x.textContent.includes('ببندید')).querySelectorAll('.btn')[1].click());
 await p.waitForTimeout(200);
 a=await p.evaluate(()=>DB.positions[0]);
 ok(a.fdone&&a.fdone['ccoineres/804']==='skip'&&a.status==='open','«نادیده بگیر»: ثبت شد، پوزیشن دست نخورد');
 await p.evaluate(()=>[...document.querySelectorAll('#pos-a .fwi')].find(x=>x.textContent.includes('سیو')).querySelector('.btn.pri').click());
 await p.waitForTimeout(400);
 ok(await p.evaluate(()=>/بستن بخشی/.test(document.querySelector('#sheet')?.textContent||'')),'سیو سود بدون نقشه: ورق «بستن بخشی» باز شد');
 const e=await p.$('#pos-a');await e.screenshot({path:require('./lib').out('follow.png')});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
