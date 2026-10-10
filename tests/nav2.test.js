/* چینش نوار پایین: بازار، پوزیشن‌ها، سیگنال‌ها، سایر؛ کانال‌سنج داخل «سایر» و بی سنجش خودکار */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.addInitScript(()=>{window.__startView='radar';});await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms));
   const tabs=[...document.querySelectorAll('#tabs .tab:not(.hide)')].map(t=>t.dataset.v).join(','),start=view,startSel=document.querySelector('.tab[aria-selected="true"]').dataset.v,radVis=!document.getElementById('vRadar').classList.contains('hide')&&document.getElementById('vSignals').classList.contains('hide');
   document.querySelector('.tab[data-v="more"]').click();await W(200);
   const items=[...document.querySelectorAll('#vMore .moreit[data-go]:not(.hide)')].map(x=>x.dataset.go).join(',');
   const at0=AUDQ.at,jobs=audJobs().length;
   document.querySelector('.moreit[data-go="audit"]').click();await W(1500);
   const on=AUDQ.on,at1=AUDQ.at,sel=document.querySelector('.tab[aria-selected="true"]').dataset.v,vis=!document.getElementById('vAudit').classList.contains('hide');
   const btn=document.getElementById('audRunB'),bt=btn&&btn.textContent,crumb=!!document.querySelector('#vAudit .crumb');
   btn.click();await W(50);const on2=AUDQ.on;
   await new Promise(r=>{const t0=Date.now(),iv=setInterval(()=>{if(!AUDQ.on||Date.now()-t0>60000){clearInterval(iv);r();}},100);});
   return {start,startSel,radVis,tabs,items,jobs,on,at0,at1,sel,vis,bt,crumb,on2,after:AUDQ.at>at0};});
 console.log('   ',JSON.stringify(r));
 ok(r.start==='radar'&&r.startSel==='radar'&&r.radVis,'برنامه روی «بازار» باز می‌شود');
 ok(r.tabs==='radar,positions,signals,more','نوار پایین: بازار، پوزیشن‌ها، سیگنال‌ها، سایر');
 ok(r.items.startsWith('audit,'),'کانال‌سنج اولِ منوی «سایر»');
 ok(r.vis&&r.sel==='more'&&r.crumb,'کانال‌سنج باز شد، «سایر» روشن ماند و دکمه‌ی برگشت دارد');
 ok(r.jobs>0&&!r.on&&r.at1===r.at0,'با باز شدن، سنجش خودکار شروع نشد ('+r.jobs+' سیگنال منتظر)');
 ok(/سنجش/.test(r.bt)&&r.on2&&r.after,'با زدن «'+r.bt+'» سنجش انجام شد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
