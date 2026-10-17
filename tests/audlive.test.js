/* کانال‌سنج «در جریان»: سود/ضرر لحظه‌ای هر سیگنال (R، ٪، دلار) و جمع کل، مدت باز بودن، رنگ سبز/قرمز ردیف،
   «بستن با قیمت الان» (نتیجه با همان قیمت، در کارنامه؛ «باز کردن دوباره») و قاعده‌ی بستن روی نتیجه‌ی سنجش */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},D=864e5,H=36e5,now=Date.now();
   const ar=audRun,am=audMeasureOne;audRun=()=>{};audMeasureOne=async()=>{};
   const mk=(n,tk,h)=>({id:'ccoineres/'+n,num:n,text:'#'+tk+'\nخرید '+(tk==='XRP'?'2.5':'3000')+'\nاستاپ '+(tk==='XRP'?'2':'2500')+'\nتارگت '+(tk==='XRP'?'4':'4000'),date:new Date(now-h*H),link:'https://t.me/ccoineres/'+n});
   const A=mk(981,'XRP',50),B=mk(980,'ETH',30);POSTS.unshift(A,B);KGEN++;
   const R=audRules(),set=(x,tAct)=>{const i=audInput(x);AUD[x.id]={k:audKey(i,R),st:'open',fin:false,at:now,tAct,tTp:[],close:{t:now-6e5,px:i.entry}};return i;};
   const iA=set(A,now-2*D-5*H),iB=set(B,now-20*H);
   const kp=new Map(PRICES);PRICES.set('XRP',2.75);PRICES.set('ETH',2900);     // XRP +0.5R، ETH −0.2R
   go('audit',true);audList='open';AUDOPEN='فهرست سیگنال‌ها';renderAudit();await W(100);
   const row=tk=>[...document.querySelectorAll('#vAudit .arow2')].find(x=>(x.querySelector('.tick')||{}).textContent===tk&&x.querySelector('.arnow'));
   o.a={cls:row('XRP').className,now:row('XRP').querySelector('.arnow').textContent};o.b={cls:row('ETH').className,now:row('ETH').querySelector('.arnow').textContent};
   o.sum=(document.querySelector('#vAudit .audopen')||{}).textContent||'';
   // بستن XRP با قیمت الان
   const cb=[...row('XRP').querySelectorAll('.ar4 button')].find(x=>/بستن با قیمت الان/.test(x.textContent));o.cbtn=!!cb;cb.click();await W(300);
   const y=audRows().find(z=>z.p.id===A.id);o.closed={st:y.r.st,cut:!!y.r.cut,R:y.R,px:OVERRIDE[A.id]&&OVERRIDE[A.id].cut&&OVERRIDE[A.id].cut.px};
   o.jobs=audJobs().some(j=>j.p.id===A.id);
   audList='all';renderAudit();await W(100);
   const ra=[...document.querySelectorAll('#vAudit .arow2')].find(x=>(x.querySelector('.tick')||{}).textContent==='XRP'&&/بسته \(دستی\)/.test(x.textContent));
   o.row=ra?ra.querySelector('.ar1').textContent+'|'+ra.querySelector('.arnow').textContent+'|'+ra.className:'';
   const ub=ra&&[...ra.querySelectorAll('.ar4 button')].find(x=>/باز کردن دوباره/.test(x.textContent));o.ubtn=!!ub;ub&&ub.click();await W(100);
   o.reopen=audRows().find(z=>z.p.id===A.id).r.st;
   // قاعده‌ی بستن روی نتیجه‌ی سنجش: استاپِ پیش از بستن می‌ماند؛ تارگتِ بعد از بستن حساب نمی‌شود
   const base={st:'loss',fin:true,tAct:now-5*H,tStop:now-3*H,tEnd:now-3*H,tTp:[]};
   o.c1=audCut(base,{cut:{t:now-H,px:9}}).st;
   const w={st:'win',fin:true,tAct:now-5*H,tTp:[now-4*H,now-30*6e4],tEnd:now-30*6e4,close:null};
   const c2=audCut(w,{cut:{t:now-2*H,px:9}});o.c2=c2.st+'|'+c2.tTp.filter(Boolean).length+'|'+!!c2.cut;
   o.c3=audCut({st:'open',fin:false,tAct:null,tTp:[]},{cut:{t:now,px:9}}).st+'|'+audCut({st:'open',fin:false,tAct:null,tTp:[]},{cut:{t:now,px:9}}).why;
   o.dur=[audDur(40*6e4),audDur(5*H),audDur(2*D+3*H),audDur(3*D)].join('|');
   POSTS.splice(POSTS.indexOf(A),1);POSTS.splice(POSTS.indexOf(B),1);KGEN++;delete AUD[A.id];delete AUD[B.id];delete OVERRIDE[A.id];delete OVERRIDE[B.id];
   PRICES.clear();kp.forEach((v,k)=>PRICES.set(k,v));audRun=ar;audMeasureOne=am;
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,1600));
 ok(/\bup\b/.test(r.a.cls)&&/\+0\.50R/.test(r.a.now)&&/\+10٪/.test(r.a.now)&&/زنده/.test(r.a.now)&&/باز 2 روز و 5 ساعت/.test(r.a.now),'XRP در سود: سبز، +0.50R، +10٪، زنده، «باز 2 روز و 5 ساعت» · '+r.a.now);
 ok(/\bdn\b/.test(r.b.cls)&&/-0\.20R|−0\.20R/.test(r.b.now)&&/باز 20 ساعت/.test(r.b.now),'ETH در ضرر: قرمز، −0.20R، «باز 20 ساعت» · '+r.b.now);
 ok(/الان جمعاً \+0\.30R/.test(r.sum)&&/1 در سود/.test(r.sum)&&/1 در ضرر/.test(r.sum)&&/میانگین باز بودن/.test(r.sum),'خلاصه: جمع +0.30R، 1 در سود و 1 در ضرر، میانگین باز بودن · '+r.sum.slice(0,160));
 ok(r.cbtn&&r.closed.st==='exp'&&r.closed.cut&&Math.abs(r.closed.R-0.5)<1e-9&&r.closed.px===2.75&&!r.jobs,'«بستن با قیمت الان»: نتیجه با 2.75 (+0.5R) و دیگر در صف سنجش نیست '+JSON.stringify(r.closed));
 ok(/بسته \(دستی\)/.test(r.row)&&/\+0\.50R/.test(r.row)&&/دستی بسته شد روی 2\.75/.test(r.row)&&/\bup\b/.test(r.row),'ردیف بسته: «بسته (دستی) +0.50R» سبز · '+r.row.slice(0,160));
 ok(r.ubtn&&r.reopen==='open','«باز کردن دوباره» برمی‌گرداند');
 ok(r.c1==='loss'&&r.c2==='win|1|true'&&r.c3==='none|manual','قاعده‌ی بستن: استاپِ پیش از بستن می‌ماند، تارگتِ بعدش نه، منتظر ورود ← «فعال نشد (دستی)» '+[r.c1,r.c2,r.c3]);
 ok(r.dur==='40 دقیقه|5 ساعت|2 روز و 3 ساعت|3 روز','قالب مدت: '+r.dur);
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
