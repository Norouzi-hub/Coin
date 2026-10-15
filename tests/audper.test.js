/* کارنامه‌ی کانال: کاشی‌ها فقط سیگنال‌های همان‌لحظه (یادآوری‌ها جدا)، توضیح «در جریان»، بازه‌ی سنجش و آمار هفته‌به‌هفته */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},D=864e5;
   const now=Date.now(),inp=(t0,old)=>({tk:'X',dir:'long',entry:1,stop:0.9,tps:[1.1],tgs:[1.1],t0,old:!!old});
   let i=0;const row=(t0,st,R,old)=>({p:{id:'z'+(i++)},inp:inp(t0,old),r:{st,tTp:[],k:1},R});
   const R=[row(now-20*D,'win',1),row(now-20*D,'loss',-1),row(now-12*D,'loss',-1),row(now-5*D,'win',1),row(now-4*D,'none',null),row(now-2*D,'open',null),
     row(now-60*D,'win',3,true),row(now-50*D,'win',2,true)];
   const aR=audRows,aF=audFilter;audRows=()=>R;audFilter=x=>x;AUDOPEN=null;
   go('audit',true);renderAudit();await W(100);
   const sts=[...document.querySelectorAll('#audBody .stats')][0];
   const tile=n=>{const t=[...sts.querySelectorAll('.st')].find(x=>x.querySelector('b').textContent===n);return t?t.querySelector('span').textContent:'';};
   o.n=tile('سنجیده');o.wr=tile('نرخ برد');o.sum=tile('مجموع R');
   o.notes=[...sts.querySelectorAll('.stnote')].map(x=>x.textContent).join('|');
   o.per=(document.querySelector('#audBody .audper')||{}).textContent||'';
   const d=document.querySelector('#audBody .audwk');d.open=true;await W(30);
   o.wk=[...d.querySelectorAll('tbody tr')].map(x=>[...x.children].map(c=>c.textContent).join(' ')) ;o.keep=AUDWK;
   audRows=aR;audFilter=aF;
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(r.n==='4'&&r.wr==='50٪'&&/0\.00R/.test(r.sum),'کاشی‌ها فقط 4 سیگنال همان‌لحظه (یادآوری‌ها بیرون): '+r.n+' · '+r.wr+' · '+r.sum);
 ok(/2<\/?b?>? ?سیگنال قدیمیِ «از یادآوری» جدا|2 سیگنال قدیمیِ «از یادآوری» جدا/.test(r.notes)&&/2 برد/.test(r.notes),'یادآوری‌ها جدا: 2 برد');
 ok(/1 سیگنال هنوز «در جریان»/.test(r.notes),'توضیح «در جریان»');
 ok(/بازه‌ی سنجش:/.test(r.per)&&/6 سیگنال/.test(r.per)&&/2 یادآوری قدیمی جدا/.test(r.per),'بازه‌ی سنجش، تعداد و یادآوری‌های جدا: '+r.per);
 ok(r.wk.length>=3&&/کل 6 4 50٪/.test(r.wk[r.wk.length-1])&&r.keep,'جدول هفته‌به‌هفته با ردیف «کل» و باز ماندن: '+JSON.stringify(r.wk));
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
