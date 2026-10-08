/* نوار کارهای در حال انجام: نام کار، درصد، رفتن به بخش، توقف/ادامه/لغو؛ کار کوتاه دیده نمی‌شود */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),bar=document.getElementById('jobBar');
   while(JOBS.size)await W(100);
   // کار کوتاه: دیده نمی‌شود
   jobSet('qq',{title:'کوتاه'});await W(200);jobEnd('qq');await W(700);const short=bar.classList.contains('hide');
   // کار ساختگی با گام‌ها
   let n=0,went=0;const J=jobSet('tt',{title:'کار آزمایشی',pause:true,cancel:true,pct:()=>n*10,msg:()=>'گام '+n,go:()=>{went++;}});
   const run=(async()=>{for(let i=0;i<10;i++){if(!(await jobGate('tt')))return 'stopped';n++;await W(150);}return 'done';})();
   await W(900);const txt=bar.textContent,vis=!bar.classList.contains('hide'),pct=(bar.querySelector('.jpct')||{}).textContent;
   bar.querySelector('[data-job="tt"] [data-jp]').click();const n1=n;await W(800);const n2=n,paused=!!bar.querySelector('.job.paused');
   bar.querySelector('[data-job="tt"] [data-jp]').click();await W(400);const n3=n;
   bar.querySelector('[data-job="tt"] [data-jgo]').click();
   bar.querySelector('[data-job="tt"] [data-jx]').click();const res=await run;jobEnd('tt');await W(200);
   // سنجش کانال واقعی: در نوار با نام و رفتن به کانال‌سنج؛ توقف واقعاً می‌ایستد
   const ar=audRun();await W(30);const A=JOBS.get('aud');let ad1=null,ad2=null,ab='';
   if(A){A.paused=true;await W(900);ad1=AUDQ.done;await W(600);ad2=AUDQ.done;ab=bar.textContent;
     bar.querySelector('[data-job="aud"] [data-jgo]').click();A.paused=false;}
   await ar;await W(200);const av=view;
   return {short,txt,vis,pct,n1,n2,n3,paused,went,res,aud:!!A,ad1,ad2,ab,av,end:bar.classList.contains('hide')||!bar.textContent.includes('سنجش کانال')};});
 console.log('   ',JSON.stringify(r));
 ok(r.short,'کار زیر 0.6 ثانیه در نوار نمی‌آید');
 ok(r.vis&&/کار آزمایشی/.test(r.txt)&&/گام/.test(r.txt)&&/\d+%/.test(r.pct),'نوار: نام کار، مرحله و درصد ('+r.pct+')');
 ok(r.paused&&r.n2===r.n1&&r.n3>r.n2,'توقف: گام‌ها ایستادند؛ ادامه: دوباره راه افتاد');
 ok(r.went===1,'زدن روی کار ← رفتن به همان بخش');
 ok(r.res==='stopped','لغو: کار بین دو گام ایستاد');
 ok(r.aud&&r.ad1===r.ad2&&/سنجش کانال/.test(r.ab)&&r.av==='audit'&&r.end,'سنجش کانال در نوار؛ توقفش واقعاً می‌ایستد؛ زدنش ← کانال‌سنج؛ بعد از پایان از نوار می‌رود');
 await p.screenshot({path:(process.env.TEST_OUT||'/tmp/signaldesk-tests')+'/logs/jobs.png'});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
