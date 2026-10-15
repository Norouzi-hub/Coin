/* کانال‌سنج: «مرور یکی‌یکی» سیگنال‌های ناقص — نماد و تلگرام در برگه، «کنار بگذار» (فقط از سنجش)،
   «برگرداندن همه»، «کنار گذاشتن همه» با پرسش، دکمه‌ی «عدد بزن» روی ردیف و دکمه‌ی نقشه */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},H=36e5,$q=s=>document.querySelector(s);
   audRun=()=>{};
   const mk=(n,tk,h)=>({id:'ccoineres/'+n,num:n,text:'#'+tk,img:'https://cdn4.telesco.pe/file/c'+n+'.jpg',date:new Date(Date.now()-h*H),link:'https://t.me/ccoineres/'+n});
   POSTS.unshift(mk(998,'XRP',3),mk(997,'ETH',5));KGEN++;
   const has=id=>audRows().some(x=>x.p.id===id), A='ccoineres/998', B='ccoineres/997';
   let Q=audFixQ();o.q=Q.map(q=>q.id+':'+q.why).join();
   // فهرست «نیاز به بررسی»
   go('audit',true);audList='bad';AUDOPEN='فهرست سیگنال‌ها';renderAudit();await W(80);
   const btns=[...document.querySelectorAll('#vAudit .panel .srow button')].map(x=>x.textContent);
   o.listBtn=btns.some(t=>/مرور یکی‌یکی \(\d+\)/.test(t))&&btns.some(t=>/کنار گذاشتن همه/.test(t));
   o.rowBtn=[...document.querySelectorAll('#vAudit .arow2 .ar4 button')].filter(x=>x.textContent==='عدد بزن').length;
   // برگه: نماد، لینک تلگرام، «کنار بگذار»
   sheetAudFix(Q,0);await W(150);
   o.h1=$q('#sheet h3').textContent;o.tk=($q('#f_tk')||{}).value;o.tg=!!$q('#sheet a[href^="https://t.me/"]');o.ax=!!$q('#ax');
   $q('#ax').click();await W(150);
   o.skipped=!!(OVERRIDE[A]&&OVERRIDE[A].noAud)&&!has(A)&&!OVERRIDE[A].sig===!0;
   o.feed=isOpenSig(POSTS.find(x=>x.id===A))!==false;
   o.h2=$q('#sheet h3').textContent;
   // دومی: نماد را عوض کن و عدد بزن
   $q('#f_tk').value='eth/usdt';$q('#f_st').value='3300';$q('#f_t1').value='2900';$q('#ok').click();await W(150);
   o.filled=OVERRIDE[B]&&OVERRIDE[B].stop===3300&&OVERRIDE[B].ticker==='ETH'&&OVERRIDE[B].tps.join()==='2900';
   o.closed=!$q('#veil').classList.contains('open');
   // وضعیت سنجش: «برگرداندن همه»
   AUDOPEN=null;renderAudit();await W(80);
   const u=[...document.querySelectorAll('#audBody .audiag button')].find(x=>/برگرداندن همه/.test(x.textContent));
   o.unBtn=!!u;u&&u.click();await W(80);o.back=has(A)&&!(OVERRIDE[A]&&OVERRIDE[A].noAud);
   // «کنار گذاشتن همه» (با پرسش)
   audList='bad';AUDOPEN='فهرست سیگنال‌ها';renderAudit();await W(80);
   const k=[...document.querySelectorAll('#vAudit .panel .srow button')].find(x=>/کنار گذاشتن همه/.test(x.textContent));
   k.click();await W(300);o.all=!has(A)&&audFixQ().length===0;
   audUnskipAll();await W(50);
   // «پست نتیجه است»: یادآوری سیگنال قدیمی ← به «نتایج»، بیرون از سنجش
   sheetAudFix([{id:A,why:'px',rows:new Set([A])}],0);await W(150);
   o.pxHint=/سیگنال قدیمی/.test($q('#sheet').textContent);$q('#rs').click();await W(150);
   o.res=isRes(POSTS.find(x=>x.id===A))&&!has(A);
   $q('#toast .tundo').click();await W(80);o.resBack=!isRes(POSTS.find(x=>x.id===A))&&has(A);
   // نقشه: دکمه‌ی «مرور یکی‌یکی» برگه را باز می‌کند
   S.plan={start:Date.now(),done:{},dec:{},base:plSnap()};
   const t=plTasks(1).find(x=>x[0]==='w1fill');o.planBtn=t[5]&&t[5][0];t[5][1]();await W(200);
   o.planSheet=!$q('#veil').classList.contains('hide')&&/عددها از روی چارت/.test($q('#sheet h3').textContent);
   closeSheet();S.plan=null;
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(/ccoineres\/998:img-sl/.test(r.q)&&/ccoineres\/997:img-sl/.test(r.q),'دو چارت بی‌عدد در صف «مرور یکی‌یکی»');
 ok(r.listBtn&&r.rowBtn>=2,'بالای «نیاز به بررسی»: «مرور یکی‌یکی» و «کنار گذاشتن همه»؛ روی ردیف‌ها «عدد بزن»');
 ok(/1 از/.test(r.h1)&&r.tk==='XRP'&&r.tg&&r.ax,'برگه: شماره، نماد، لینک تلگرام و «کنار بگذار»');
 ok(r.skipped&&r.feed,'«کنار بگذار»: از سنجش بیرون، در فهرست سیگنال‌ها مانده');
 ok(/2 از/.test(r.h2),'بعد از «کنار بگذار» به بعدی رفت');
 ok(r.filled&&r.closed,'نماد عوض‌شده (eth/usdt ← ETH) و عددها ثبت شد؛ آخرین بود و برگه بسته شد');
 ok(r.unBtn&&r.back,'«برگرداندن همه» در وضعیت سنجش');
 ok(r.all,'«کنار گذاشتن همه» با پرسش، صف خالی شد');
 ok(r.pxHint&&r.res&&r.resBack,'«پست نتیجه است»: راهنما برای قیمت دور، به «نتایج» و بیرون از سنجش، با برگرداندن');
 ok(r.planBtn==='مرور یکی‌یکی'&&r.planSheet,'نقشه › «مرور یکی‌یکی» برگه را باز می‌کند');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
