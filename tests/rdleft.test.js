/* کارت سیگنال رادار: کنار «تا ساعت …» ورود Limit، زمان باقی‌مانده («1 ساعت و 10 دقیقه مانده»)،
   زیر نیم ساعت نارنجی، بعد از مهلت فقط «مهلت گذشت»، و خودش هر چند ثانیه به‌روز می‌شود؛ همین در تب «امروز» */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const H=36e5,M=6e4,W=ms=>new Promise(r=>setTimeout(r,ms)),o={},now=Date.now();
   // مهلت = شروع کندل + 3 ساعت؛ t را طوری می‌چینیم که مهلت 70، 20 و منفی 10 دقیقه باشد
   const dlT=left=>now+left*M-(1+RB_LIMH)*H;
   const mk=(sc,left)=>({dir:'long',best:'long',sc,sL:sc,sS:20,since:dlT(left),p:sc/100,t:dlT(left),px:100,parts:{btc:0.5,mtot:0.5,mmc:0.5},pl:{dir:'long',E:100,SL:97,TP:104.5,sd:0.03,rr:1.5}});
   RD.coins={AAA:mk(80,70.3),BBB:mk(85,20.3),CCC:mk(90,-10)};RD.rank=['AAA','BBB','CCC'];RD.at=now;
   S.rdWx=false;RDV='sig';go('radar',true);renderAll();await W(100);
   const box=tk=>{const c=document.querySelector('#rdView .rdit[data-rd="'+tk+'"] .rdkv>div');return c?{tx:c.textContent,w:!!c.querySelector('.rdleft.w'),n:c.querySelectorAll('.rdleft').length}:null;};
   o.a=box('AAA');o.b=box('BBB');o.c=box('CCC');
   o.txt=[rdLeftTxt(45*M),rdLeftTxt(2*H),rdLeftTxt(2*H+5*M),rdLeftTxt(-1)];
   // گذر زمان: مهلت BBB تمام شد
   const e=document.querySelector('#rdView .rdit[data-rd="BBB"] .rdleft');e.dataset.dl=String(Date.now()-1000);rdLeftTick();
   o.tick=e.textContent+'|'+e.classList.contains('d');
   // تب «امروز»: هر فرصت رادار با همان زمان مانده، و تست منتظر Limit با نزدیک‌ترین مهلت
   const rl=rdList;rdList=()=>[RD.coins.AAA,RD.coins.BBB].map((x,i)=>Object.assign({tk:i?'BBB':'AAA',ok:true},x));
   const pk=RB.pend;RB.pend=[{id:'pw1',k:'test',tk:'AAA',dir:'long',E:100,SL:97,dl:now+15.9*M},{id:'pw2',k:'test',tk:'BBB',dir:'long',E:100,SL:97,dl:now+50*M}];
   S.focus=true;focusApply();go('focus',true);renderAll();await W(100);
   o.fc=[...document.querySelectorAll('#focusBody .fcrd')].map(b=>b.textContent);
   o.fcw=!!document.querySelector('#focusBody .fcrd[data-fcrd="BBB"] .rdleft.w');
   o.fct=(document.querySelector('#focusBody [data-fc="tests"]')||{}).textContent||'';
   document.querySelector('#focusBody .fcrd[data-fcrd="BBB"]').click();await W(200);
   o.fgo=view==='radar'&&RDV==='sig';
   rdList=rl;RB.pend=pk;S.focus=false;focusApply();
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(r.a&&/تا \d\d:\d\d/.test(r.a.tx)&&/1 ساعت و 10 دقیقه مانده/.test(r.a.tx)&&!r.a.w,'«تا HH:MM» و «1 ساعت و 10 دقیقه مانده»: '+(r.a&&r.a.tx));
 ok(r.b&&/20 دقیقه مانده/.test(r.b.tx)&&r.b.w,'زیر نیم ساعت: «20 دقیقه مانده» نارنجی');
 ok(r.c&&/مهلت گذشت/.test(r.c.tx)&&r.c.n===0,'مهلت گذشته: فقط «مهلت گذشت»، بی شمارش');
 ok(r.txt.join('|')==='45 دقیقه مانده|2 ساعت مانده|2 ساعت و 5 دقیقه مانده|مهلت گذشت','قالب‌ها: '+r.txt.join(' | '));
 ok(r.tick==='مهلت گذشت|true','با گذر زمان خودش به‌روز می‌شود');
 ok(r.fc.length===2&&/AAA.*1 ساعت و 10 دقیقه مانده/.test(r.fc[0])&&/BBB.*20 دقیقه مانده/.test(r.fc[1])&&r.fcw,'تب «امروز»: هر فرصت رادار با زمان مانده (زیر نیم ساعت نارنجی): '+r.fc.join(' | '));
 ok(/2 منتظر Limit/.test(r.fct)&&/15 دقیقه مانده/.test(r.fct),'تب «امروز»: تست‌های منتظر Limit با نزدیک‌ترین مهلت: '+r.fct);
 ok(r.fgo,'زدن فرصت ← کارت خودش در «بازار»');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
