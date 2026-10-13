/* آرشیو خودکار کمتر پست کانال را پنهان کند: عکس با متن کوتاه و پست‌هایی که نماد ارز دارند (PUMPUSDT، #BTC) در «همه» می‌مانند؛
   اطلاع‌رسانی (لینک، کمپین) هنوز آرشیو؛ پست تازه‌ای که خودکار آرشیو شد بالای «همه» دیده می‌شود */
const {chromium} = require('./lib').pw;
const T0=require('./lib').tehranAfternoon();
const D=h=>new Date(T0-h*3600e3).toISOString();
const posts=[
 {n:970,h:1,t:'',img:true},                                                     // فقط عکس (کارت سود)
 {n:969,h:2,t:'PUMPUSDT 35x short رفت تو سود'},                                  // نماد انگلیسی، بی کلمه‌ی فارسی سیگنال
 {n:968,h:3,t:'ثبت نام در کمپین: روی لینک عضویت کلیک کنید.'},                     // اطلاع‌رسانی ← آرشیو
 {n:967,h:4,t:'صبح بخیر دوستان، امروز بازار آرومه'},                              // یادداشت ← آرشیو
 {n:966,h:5,t:'#بیت_کوین لانگ<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۳۵۰۰<br>تارگت ۶۹۰۰۰'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}"><div class="tgme_widget_message_bubble">${p.img?'<a class="tgme_widget_message_photo_wrap" style="background-image:url(\'https://cdn4.telesco.pe/file/x.jpg\')"></a>':''}${p.t?`<div class="tgme_widget_message_text">${p.t}</div>`:''}<time datetime="${D(p.h)}"></time></div></div>`).join('')}</body></html>`;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:1000}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await ctx.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.clock.install({time:T0});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(3000);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms));
   const by=n=>POSTS.find(x=>x.id.endsWith('/'+n));
   const o={n:POSTS.length,img:!!(by(970)&&by(970).img),b:Object.fromEntries([970,969,968,967,966].map(n=>[n,by(n)?bucketOf(by(n)):'?']))};
   go('signals',true);bucket='live';sigFilter='all';setView({});await W(200);
   const w=document.querySelector('#list .autoarch');o.strip=w?w.textContent:'';
   if(w){w.querySelector('button').click();await W(200);o.bucket=bucket;o.archIds=[...document.querySelectorAll('#list .card')].map(c=>c.dataset.id.split('/').pop()).join(',');}
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(r.n===5&&r.img,'پنج پست آمد؛ پست فقط‌عکس عکس دارد');
 ok(r.b[970]==='live'&&r.b[969]==='live'&&r.b[966]==='live','عکس بی‌متن، «PUMPUSDT … short» و سیگنال در «همه» می‌مانند');
 ok(r.b[968]==='arch'&&r.b[967]==='arch','اطلاع‌رسانی (کمپین/لینک) و یادداشت معمولی هنوز خودکار آرشیو');
 ok(/2 پست تازه‌ی کانال/.test(r.strip)&&/آرشیو/.test(r.strip),'بالای «همه»: «2 پست تازه‌ی کانال خودکار به آرشیو رفت …»');
 ok(r.bucket==='arch'&&/968/.test(r.archIds)&&/967/.test(r.archIds),'«دیدن» ← آرشیو با همان پست‌ها');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
