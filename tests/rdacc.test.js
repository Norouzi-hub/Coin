/* بالای «بازار › سیگنال‌ها»: چهار کارت تاشوی یکسان (وضعیت، هوا، بازار کل، ارزها و واچ‌لیست)؛ بسته = خلاصه، باز = تکمیلی؛
   باز/بسته می‌ماند؛ «تازه کن» روی سرکارت کارت را باز نمی‌کند؛ مرتب‌سازی درست بالای سیگنال‌ها */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const H=36e5,T0=Math.floor(Date.now()/H)*H-H,W=ms=>new Promise(r=>setTimeout(r,ms)),o={};
   const mk=(sc,dir)=>({dir,best:dir,sc,sL:sc,sS:20,since:T0,p:0.6,t:T0,px:1,parts:{btc:-0.5,mtot:-0.5,mmc:-0.5},pl:{dir,E:1,SL:0.97,TP:1.045,sd:0.03,rr:1.5}});
   RD.coins={AAA:mk(90,'long'),BBB:mk(85,'short')};RD.rank=['AAA','BBB'];RD.at=Date.now();
   try{localStorage.removeItem('signaldesk.rdacc');}catch(e){}RDACC={};RDV='sig';go('radar',true);renderAll();await W(80);
   const g=document.getElementById('rdView'),A=[...g.querySelectorAll('details.rdacc')];
   o.n=A.length;o.closed=A.every(d=>!d.open);o.titles=A.map(d=>d.querySelector('.rdat>b').textContent).join('|');
   o.hero=A[0].querySelector('summary').textContent;o.heroRefresh=!!A[0].querySelector('summary [data-rdrun]');
   o.wx=A[1].querySelector('summary').textContent;o.wxBody=A[1].querySelectorAll('.rdwxb').length;
   // سرتیتر لیست و مرتب‌سازی، درست قبل از اولین گروه
   const lh=g.querySelector('.rdlisth'),nx=lh&&lh.nextElementSibling;o.sortAbove=!!(lh&&lh.querySelector('select')&&nx&&nx.classList.contains('rdsh'));
   o.noSortInBar=!document.querySelector('#rdFbar select');
   // باز کردن هوا می‌ماند
   A[1].open=true;await W(50);renderRadar();await W(50);o.kept=document.querySelectorAll('#rdView details.rdacc')[1].open;
   // دکمه‌ی سرکارت باز نمی‌کند
   const h0=document.querySelector('#rdView details.rdhero'),btn=h0.querySelector('summary [data-rdrun]');btn.onclick=null;btn.disabled=false;btn.click();await W(50);o.btnNoToggle=!h0.open;
   o.sw=document.documentElement.scrollWidth;
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,900));
 ok(r.n===4&&r.closed,'چهار کارت تاشو، همه بسته');
 ok(/ارزها و واچ‌لیست/.test(r.titles)&&/بازار کل/.test(r.titles),'عنوان‌ها: '+r.titles);
 ok(/ارز/.test(r.hero)&&r.heroRefresh,'وضعیت بسته: تعداد ارز و زمان، «تازه کن» در دسترس');
 ok(/لانگ: نامناسب/.test(r.wx)&&/شورت: مناسب/.test(r.wx)&&r.wxBody===4,'هوا بسته: چراغ لانگ/شورت؛ باز: چهار جزء');
 ok(r.sortAbove&&r.noSortInBar,'مرتب‌سازی درست بالای سیگنال‌ها (نه در نوار فیلتر)');
 ok(r.kept,'باز بودن کارت بعد از رسم دوباره می‌ماند');
 ok(r.btnNoToggle,'دکمه‌ی سرکارت کارت را باز نمی‌کند');
 ok(r.sw<=392,'بی اسکرول افقی ('+r.sw+')');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
