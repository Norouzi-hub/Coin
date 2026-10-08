/* چرخنده‌ی خودکار دکمه‌ها: هر دکمه‌ای که کاری (شبکه یا کار طولانی) شروع کند تا پایانش چرخنده می‌گیرد؛
   دکمه‌ی بی‌کار، تب‌ها، و زدن وسط یک کار طولانیِ پس‌زمینه نه */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms));
   while(NET.n||WORK.n)await W(100);
   const mk=(t,fn,par)=>{const x=document.createElement('button');x.className='btn sm';x.textContent=t;x.onclick=fn;(par||document.body).appendChild(x);return x;};
   // 1) دکمه‌ای که بعد از 100ms درخواست شبکه می‌فرستد (700ms)
   const a=mk('A',()=>setTimeout(()=>{netStart();setTimeout(netEnd,700);},100));a.click();await W(300);
   const a1=a.classList.contains('abusy')&&a.getAttribute('aria-busy')==='true',st=getComputedStyle(a,'::after').animationName;await W(1000);const a2=a.classList.contains('abusy');
   // 2) دکمه‌ی بی‌کار
   const c=mk('C',()=>{});c.click();await W(300);const c1=c.classList.contains('abusy');
   // 3) کار طولانی با busyRun
   const d=mk('D',()=>busyRun(W(600)));d.click();await W(100);const d1=d.classList.contains('abusy');await W(1000);const d2=d.classList.contains('abusy');
   // 4) وسط کار پس‌زمینه (WORK) زدن دکمه‌ای که فقط درخواست‌های آن را می‌بیند
   workStart();const e=mk('E',()=>{});e.click();netStart();await W(200);const e1=e.classList.contains('abusy');netEnd();workEnd();
   // 5) تب‌های پایین چرخنده نمی‌گیرند
   const tab=document.querySelector('#tabs button');tab.click();netStart();await W(200);const t1=tab.classList.contains('abusy');netEnd();
   // 6) دکمه‌ای که خودش حالت در حال کار دارد (btnBusy) دوباره نمی‌گیرد
   const f=mk('F',()=>{btnBusy(f,true,'…');netStart();setTimeout(()=>{netEnd();btnBusy(f,false);},300);});f.click();await W(100);const f1=f.classList.contains('abusy');await W(500);
   return {a1,st,a2,c1,d1,d2,e1,t1,f1};});
 console.log('   ',JSON.stringify(r));
 ok(r.a1&&r.st==='spin','دکمه‌ای که درخواست شبکه فرستاد: چرخنده و aria-busy');
 ok(!r.a2,'بعد از تمام شدن درخواست: چرخنده برداشته شد');
 ok(!r.c1,'دکمه‌ی بی‌کار چرخنده نمی‌گیرد');
 ok(r.d1&&!r.d2,'کار طولانیِ بی‌شبکه (busyRun): چرخنده تا پایان');
 ok(!r.e1&&!r.t1,'وسط کار پس‌زمینه و روی تب‌ها: چرخنده‌ی بی‌جا نه');
 ok(!r.f1,'دکمه‌ای با حالت «در حال کار» خودش، دوباره نمی‌گیرد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
