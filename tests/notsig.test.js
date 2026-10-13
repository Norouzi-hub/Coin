/* کانال‌سنج: «سیگنال نیست» برای چارت‌هایی که فقط چون هشتگ داشتند سیگنال حساب شدند —
   در فهرست «نیاز به بررسی» و در برگه‌ی «عددها از روی چارت»، با «برگرداندن» */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},H=36e5;
   audRun=()=>{};      // سنجش واقعی لازم نیست
   const mk=(n,tk,h)=>({id:'ccoineres/'+n,num:n,text:'#'+tk,img:'https://cdn4.telesco.pe/file/c'+n+'.jpg',date:new Date(Date.now()-h*H),link:'https://t.me/ccoineres/'+n});
   POSTS.unshift(mk(998,'XRP',3),mk(997,'ETH',5));KGEN++;
   const has=id=>audRows().some(x=>x.p.id===id);
   o.in0=has('ccoineres/998')&&has('ccoineres/997');
   go('audit',true);audList='bad';AUDOPEN='فهرست سیگنال‌ها';renderAudit();await W(80);
   // XRP در داده‌ی نمونه یک سیگنال متنی هم دارد؛ چارت تازه جدیدترین است و اول فهرست می‌آید
   const rows=tk=>[...document.querySelectorAll('#vAudit .arow2')].filter(x=>(x.querySelector('.tick')||{}).textContent===tk), row=tk=>rows(tk)[0];
   const n0=rows('XRP').length;
   const btn=row('XRP')&&[...row('XRP').querySelectorAll('.ar4 button')].find(x=>x.textContent==='سیگنال نیست');
   o.btn=!!btn;btn.click();await W(80);
   o.gone=!has('ccoineres/998')&&OVERRIDE['ccoineres/998'].sig===false&&rows('XRP').length===n0-1;
   o.feed=!isOpenSig(POSTS.find(x=>x.id==='ccoineres/998'));
   const u=document.querySelector('#toast .tundo');o.toast=document.querySelector('#toast').textContent;
   u.click();await W(80);o.back=has('ccoineres/998')&&!OVERRIDE['ccoineres/998']&&rows('XRP').length===n0;
   // از برگه‌ی «عددها از روی چارت»: دومی را «سیگنال نیست» کن، برگه به بعدی می‌رود
   sheetImgFill(['ccoineres/997','ccoineres/998'],new Map(),0);await W(150);
   o.sheetBtn=!!document.querySelector('#ns');document.querySelector('#ns').click();await W(150);
   o.sheetNext=(document.querySelector('#sheet h3')||{}).textContent||'';
   o.gone2=!has('ccoineres/997')&&has('ccoineres/998');
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(r.in0,'دو چارت بی‌عدد در کانال‌سنج');
 ok(r.btn,'دکمه‌ی «سیگنال نیست» روی ردیف');
 ok(r.gone&&r.feed,'زدنش: از کانال‌سنج و فهرست سیگنال‌ها بیرون رفت');
 ok(/سیگنال نیست/.test(r.toast)&&r.back,'«برگرداندن» برش می‌گرداند');
 ok(r.sheetBtn&&/2 از 2/.test(r.sheetNext)&&r.gone2,'در برگه‌ی «عددها از روی چارت» هم هست و به بعدی می‌رود');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
