/* نقشه‌ی خروج هر جهت جدا، یک تست باز برای هر ارز، و دکمه‌ی پیدای «راهنما» */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{
   const c=(n,r)=>({n,w:Math.round(n/2),r,g:20,lb:0});
   RD.ex='q05';RD.exD={long:'trl',short:'q05'};RD.exs={};for(const n of RD_EXN)RD.exs[n]={long:c(100,n==='trl'?9:2),short:c(100,n==='q05'?-3:-9),all:c(200,n==='q05'?1:-5)};
   RBEX='auto';
   const e={l:rbExEff('long'),s:rbExEff('short'),txt:rbExTxt()};
   const pl=d=>({E:10,SL:d==='long'?9.8:10.2,TP:d==='long'?10.3:9.7,sd:0.02,rr:1.5,dir:d});
   RB.items=[];
   const a=rbAdd('test',{tk:'ZZQ',dir:'long',pl:pl('long'),sc:90});
   const b2=rbAdd('test',{tk:'ZZQ',dir:'short',pl:pl('short'),sc:90});const msg=[...document.querySelectorAll('.toast,#toast')].map(x=>x.textContent).join('|');
   const b3=rbAdd('test',{tk:'ZZQ',dir:'long',pl:pl('long'),sc:90});
   const s1=rbAdd('test',{tk:'ZZR',dir:'short',pl:pl('short'),sc:90});
   // دستی: یک نقشه برای هر دو
   RBEX='lad';const m={l:rbExEff('long'),s:rbExEff('short'),txt:rbExTxt()};RBEX='auto';
   RDV='test';go('radar',true);renderRadar();const G=document.getElementById('rdView'),sum=(G.querySelector('.rbexw summary')||{}).textContent||'',pick=(G.querySelector('.rbex')||{}).textContent||'';
   RDV='sig';renderRadar();const hb=document.querySelector('#rdView [data-rdhelp]'),cs=hb&&getComputedStyle(hb);
   return {e,a:a&&a.ex,b2:!!b2,b3:!!b3,s1:s1&&s1.ex,msg,m,sum,pick,hb:hb&&hb.className,bc:cs&&cs.borderTopColor,col:cs&&cs.color,gold:getComputedStyle(document.documentElement).getPropertyValue('--gold').trim()};});
 console.log('   ',JSON.stringify(r));
 ok(r.e.l==='trl'&&r.e.s==='q05'&&/لانگ/.test(r.e.txt)&&/شورت/.test(r.e.txt),'خودکار: لانگ با «متحرک»، شورت با «خروج سریع» (هر جهت بهترینِ خودش)');
 ok(r.a==='trl'&&r.s1==='q05','تست لانگ با نقشه‌ی لانگ، تست شورت با نقشه‌ی شورت ثبت شد');
 ok(!r.b2&&!r.b3&&/برای هر ارز یک تست باز/.test(r.msg),'یک تست باز برای هر ارز: شورتِ همان ارز ثبت نشد و دلیلش گفته شد');
 ok(r.m.l==='lad'&&r.m.s==='lad'&&!/شورت/.test(r.m.txt),'انتخاب دستی: یک نقشه برای هر دو جهت');
 ok(/لانگ/.test(r.sum)&&/خودکار/.test(r.sum)&&/L /.test(r.pick)&&/S /.test(r.pick)&&/بهترینِ همان جهت/.test(r.pick),'«آزمایشی»: نقشه‌ی هر جهت و عدد لانگ (L) و شورت (S) کنار هر نقشه');
 ok(/\bbtn\b/.test(r.hb)&&/rdhelpb/.test(r.hb),'«راهنما» دکمه‌ی طلایی است ('+r.col+')');
 // راهنما در کارنامه هم دکمه است
 await p.screenshot({path:(process.env.TEST_OUT||'/tmp/signaldesk-tests')+'/logs/rdexd.png'});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
