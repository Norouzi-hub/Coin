/* سرتیتر چسبان روزها («امروز · …») همیشه درست زیر سربرگ می‌ایستد، حتی وقتی نوار کارها
   (بررسی بازار، سنجش کانال، …) در سربرگ باز یا بسته می‌شود — قبلاً ارتفاع سربرگ فقط یک بار
   اندازه گرفته می‌شد و سرتیتر وسط صفحه روی عکس پست می‌افتاد */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={};
   go('signals',true);sigFilter='all';renderAll();await W(200);
   const hdr=document.querySelector('header'),vh=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdrH'));
   // سرتیتر روزی که بعد از اسکرول چسبیده؛ فاصله‌ی بالایش تا پایین سربرگ
   const gap=async()=>{const seps=[...document.querySelectorAll('#vSignals .dsep')];if(!seps.length)return null;
     const s=seps[0];window.scrollTo(0,s.getBoundingClientRect().top+scrollY+400);await W(150);
     const st=seps.filter(x=>Math.abs(x.getBoundingClientRect().top-parseFloat(getComputedStyle(x).top))<2);
     const x=st[st.length-1]||s;return Math.round(x.getBoundingClientRect().top-hdr.getBoundingClientRect().bottom);};
   o.n=document.querySelectorAll('#vSignals .dsep').length;
   o.h0=[Math.round(vh()),hdr.offsetHeight];o.g0=await gap();
   // نوار کار باز شد: سربرگ بلندتر
   jobSet('tst',{title:'کار آزمایشی',pause:true,cancel:true,pct:()=>40,msg:()=>'۲ از ۵'});await W(1000);
   o.h1=[Math.round(vh()),hdr.offsetHeight];o.g1=await gap();
   jobEnd('tst');await W(400);
   o.h2=[Math.round(vh()),hdr.offsetHeight];o.g2=await gap();
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(r.n>0,'فهرست سیگنال‌ها سرتیتر روز دارد ('+r.n+')');
 ok(r.h1[1]>r.h0[1],'نوار کار سربرگ را بلندتر کرد ('+r.h0[1]+' ← '+r.h1[1]+')');
 ok(r.h0[0]===r.h0[1]&&r.h1[0]===r.h1[1]&&r.h2[0]===r.h2[1],'اندازه‌ی سربرگ همیشه به‌روز: '+JSON.stringify([r.h0,r.h1,r.h2]));
 ok([r.g0,r.g1,r.g2].every(g=>g!=null&&Math.abs(g)<=1),'سرتیتر چسبیده درست زیر سربرگ (فاصله: '+[r.g0,r.g1,r.g2].join('، ')+')');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
