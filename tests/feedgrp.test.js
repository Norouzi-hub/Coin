const {chromium}=require('./lib').pw;const {route,seed}=require('./fixture.js');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:800},hasTouch:true,isMobile:true});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));let dlg=0;p.on('dialog',d=>{dlg++;d.accept();});
 await route(ctx);await p.goto('http://localhost:8899/index.html');await p.evaluate(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3500);
 const touch=(sel,pts)=>p.evaluate(({sel,pts})=>{const t=document.querySelector(sel);const mk=(x,y)=>new Touch({identifier:1,target:t,clientX:x,clientY:y});
   t.dispatchEvent(new TouchEvent('touchstart',{touches:[mk(...pts[0])],bubbles:true}));
   for(const q of pts.slice(1))t.dispatchEvent(new TouchEvent('touchmove',{touches:[mk(...q)],bubbles:true}));
   t.dispatchEvent(new TouchEvent('touchend',{touches:[],bubbles:true}));},{sel,pts});
 // 7) متن خام جمع
 const c7=await p.evaluate(()=>{S.feat.accordion=false;renderSignals();const c=document.querySelector('#list .card[data-id$="/920"]');return {cl:c.querySelector('.txt').className,b:c.querySelector('.more')?.textContent};});
 ok(/clamp2/.test(c7.cl)&&c7.b==='متن کامل','سیگنال خوانده‌شده: متن دو خطی + «متن کامل» '+JSON.stringify(c7));
 // 8) کشیدن به راست = آرشیو
 await touch('#list .card[data-id$="/920"]',[[100,300],[140,302],[200,303],[300,305]]);await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!!DB.archived['ccoineres/920']),'کشیدن به راست → آرشیو');
 ok(await p.evaluate(()=>document.querySelector('#toast.undo.on .tundo')?.textContent==='برگرداندن'),'پیغام با «برگرداندن»');
 await p.click('#toast .tundo');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!DB.archived['ccoineres/920']),'برگرداندن آرشیو را پس گرفت');
 // کشیدن به چپ = وارد نشدم
 await touch('#list .card[data-id$="/918"]',[[300,300],[260,301],[180,302],[60,303]]);await p.waitForTimeout(500);
 ok(await p.evaluate(()=>DB.decisions['ccoineres/918']?.action==='skipped'),'کشیدن به چپ → وارد نشدم');
 // حرکت عمودی نباید کاری کند
 await touch('#list .card[data-id$="/915"]',[[200,300],[205,360],[210,450]]);await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!DB.archived['ccoineres/915']&&!DB.decisions['ccoineres/915']),'حرکت عمودی کاری نمی‌کند');
 // 9) آرشیو با دکمه و برگرداندن، بدون پنجره
 const d0=dlg;await p.evaluate(()=>document.querySelector('#list .card[data-id$="/915"] .fchip').click());await p.waitForTimeout(300);
 ok(dlg===d0&&await p.evaluate(()=>!!DB.archived['ccoineres/915']),'دکمه‌ی آرشیو بدون پنجره‌ی تأیید');
 await p.evaluate(()=>{go('positions',true);});await p.waitForTimeout(300);
 const n0=await p.evaluate(()=>DB.positions.length);
 await p.evaluate(()=>{const id=DB.positions[0].id;POSOPEN.add(id);POSMENU.add(id);renderPositions();document.querySelector('#posList .pmore .btn.dgr').click();});await p.waitForTimeout(300);
 const n1=await p.evaluate(()=>DB.positions.length);
 ok(dlg===d0&&n1===n0-1,'حذف پوزیشن بدون پنجره: '+n0+'→'+n1);
 await p.click('#toast .tundo');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>DB.positions.length)===n0,'برگرداندن پوزیشن حذف‌شده');
 // 10) سربرگ روز چسبان
 await p.evaluate(()=>{go('signals',true);});await p.waitForTimeout(200);
 ok(await p.evaluate(()=>getComputedStyle(document.querySelector('.dsep')).position==='sticky'&&parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdrH'))>30),'سربرگ روز چسبان زیر سربرگ');
 // 11) پست تازه شناور
 await p.evaluate(()=>{window.scrollTo(0,1200);showIncoming(3,1);});await p.waitForTimeout(200);
 ok(await p.evaluate(()=>document.getElementById('incoming').classList.contains('float')&&/↑/.test(document.getElementById('incoming').textContent)),'«3 پست تازه ↑» شناور وقتی پایین صفحه‌ای');
 await p.screenshot({path:require('./lib').out('crawl/feed_float.png')});
 await p.click('#incoming');await p.waitForTimeout(800);
 ok(await p.evaluate(()=>window.scrollY<50),'زدن به بالا می‌برد');
 // 3) کشیدن به پایین
 await p.evaluate(()=>window.scrollTo(0,0));
 const r0=await p.evaluate(()=>{window.__rf=0;const o=refresh;window.refresh=(...a)=>{window.__rf++;return o(...a);};return 1;});
 await touch('#vSignals',[[200,200],[200,260],[200,340],[200,400]]);await p.waitForTimeout(300);
 ok(await p.evaluate(()=>window.__rf)===1,'کشیدن به پایین یک بروزرسانی شروع کرد');
 console.log('errors',errs);console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
