/* رادار: قانون‌های کیفیت سیگنال — مدل زیان‌ده، خلاف حال بازار، سقف هم‌جهت، ستاره با ارز کم، خروجی بررسی */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 // حالت پایه: پنج لانگ و یک شورت، همه با کارنامه‌ی 4 ستاره در همه‌ی حال‌ها
 await p.evaluate(()=>{window.__mk=(o)=>{const now=Date.now(),pl=(E,d)=>({dir:d,E,SL:d==='long'?E*0.98:E*1.02,TP:d==='long'?E*1.03:E*0.97,sd:0.02,rr:1.5});
   const c=(n,w,r,g,lb)=>({n,w,r,g,lb}),w=Array(RD_FEAT.length+1).fill(0),T=['L1','L2','L3','L4','L5','S1'];
   T.forEach((t,i)=>{SYMBOLS.add(t);PRICES.set(t,10+i);});SYMVER++;
   RD=Object.assign({v:5,at:now,mt0:now,n:6,list:T,reg:null,fund:{},rank:T,M:{long:{w,q:[]},short:{w,q:[]}},ex:'tp',
     calib:{long:c(400,240,80,60,0.1),short:c(200,110,20,40,0.05),'long|85-95':c(200,120,40,50,0.15),'short|85-95':c(100,60,20,40,0.15)},
     coins:Object.fromEntries(T.map((t,i)=>[t,{sc:90-i,dir:t[0]==='L'?'long':'short',best:t[0]==='L'?'long':'short',parts:{},px:10+i,t:now-36e5,flow:true,pl:pl(10+i,t[0]==='L'?'long':'short')}]))},o||{});
   RB.items=[];RDV='sig';go('radar',true);renderRadar();};});
 const st=()=>p.evaluate(()=>{const L=rdList();return {ok:L.filter(x=>x.ok).map(x=>x.tk).join(','),why:Object.fromEntries(L.filter(x=>!x.ok).map(x=>[x.tk,x.why])),
   stars:L.map(x=>x.stars).join(','),hero:(document.querySelector('#rdView .rdhero')||{}).className||'',ht:(document.querySelector('#rdView .rdhero')||{}).textContent||''};});

 console.log('=== سقف هم‌جهت ===');
 await p.evaluate(()=>__mk());let s=await st();console.log('   ',JSON.stringify(s).slice(0,300));
 ok(s.ok==='L1,L2,L3,S1'&&s.why.L4==='cap'&&s.why.L5==='cap','از پنج لانگ فقط سه تای بالا «قابل گرفتن»؛ بقیه «سقف هم‌جهت»');
 ok(/go/.test(s.hero)&&/4 فرصت قابل گرفتن/.test(s.ht),'کارت وضعیت سبز: «4 فرصت قابل گرفتن»');
 await p.evaluate(()=>{const now=Date.now();RB.items.push({id:'o1',k:'test',tk:'X1',dir:'long',st:'open',t:now,E:1,SL:0.98,sd:0.02},{id:'o2',k:'test',tk:'X2',dir:'long',st:'open',t:now,E:1,SL:0.98,sd:0.02});renderRadar();});
 s=await st();ok(s.ok==='L1,S1'&&s.why.L2==='cap'&&/باز: 2 لانگ/.test(s.ht),'با دو لانگ باز (تست)، فقط یک لانگ تازه ('+s.ok+')');
 // تست بیشتر از سقف: می‌پرسد (این‌جا «نه»)
 p.once('dialog',d=>d.dismiss());
 const t3=await p.evaluate(()=>{RB.items.push({id:'o3',k:'test',tk:'X3',dir:'long',st:'open',t:Date.now(),E:1,SL:0.98,sd:0.02});const x=rdList().find(y=>y.tk==='L1');return !!rbAdd('test',x);});
 ok(!t3,'چهارمین تست هم‌جهت: می‌پرسد و با «نه» ثبت نمی‌شود');
 const au=await p.evaluate(()=>{RB.items=[];return rbLogAuto();});
 ok(au===4,'دفتر پیشنهادها هم سقف دارد: 3 لانگ + 1 شورت ('+au+')');
 // سنجش: در هر جهت حداکثر 3 معامله‌ی هم‌زمان
 const ev=await p.evaluate(()=>{const H=36e5,t0=Date.now()-500*H,F=RD_F0,SS=[];
   for(const tk of ['A','B','C','D','E','F']){const t=[],X=[],R={long:[],short:[]},J={long:[],short:[]},G=[];
     for(let i=0;i<100;i++){const x=new Array(F).fill(0);x[0]=1;t.push(t0+i*2*H);X.push(...x);G.push(null);R.long.push(1);R.short.push(-1);J.long.push(t0+i*2*H+5*H);J.short.push(t0+i*2*H+5*H);}
     SS.push({tk,t,X:Float32Array.from(X),R,J,G,F});}
   const w=new Array(RD_FEAT.length+1).fill(0);w[0]=3;const M={long:{w,q:Array.from({length:101},(_,k)=>k/100)},short:{w:w.map(x=>-x),q:Array.from({length:101},(_,k)=>k/100)}};
   const cal={},rel={long:Array.from({length:6},()=>[0,0,0]),short:Array.from({length:6},()=>[0,0,0])},recs=[];
   const capN=rdEvalFold(SS,M,t0,t0+1000*H,cal,rel,new Map(),recs);
   let mx=0;for(const r of recs){const n=recs.filter(q=>q.d===r.d&&q.t<=r.t&&q.t+5*H>r.t).length;mx=Math.max(mx,n);}
   return {n:recs.length,capN,mx};});
 console.log('   ',JSON.stringify(ev));
 ok(ev.mx===3&&ev.capN>0&&ev.n>0,'سنجش بیرون از یادگیری: هرگز بیش از 3 معامله‌ی هم‌جهت باز ('+ev.n+' معامله، '+ev.capN+' کنار رفت)');

 console.log('=== مدل زیان‌ده ===');
 await p.evaluate(()=>__mk({calib:{long:{n:400,w:150,r:-40,g:60,lb:-0.2},short:{n:200,w:80,r:-10,g:40,lb:-0.2},'long|85-95':{n:200,w:120,r:40,g:50,lb:0.15},'short|85-95':{n:100,w:60,r:20,g:40,lb:0.15}}}));
 s=await st();ok(!s.ok&&s.why.L1==='neg'&&/stop/.test(s.hero)&&/امروز معامله نکن/.test(s.ht),'میانگین کل منفی: «امروز معامله نکن» و هیچ سیگنالی قابل گرفتن نیست');
 const mv=await p.evaluate(()=>{RDV='model';renderRadar();const t=document.getElementById('rdView').textContent;RDV='sig';return t;});
 ok(/مدل در هر دو جهت زیان‌ده است/.test(mv)&&/میانگین هر معامله/.test(mv)&&/لانگ/.test(mv),'زیرتب «کارنامه»: عددهای کل و هر جهت، و هشدار');
 // فقط لانگ‌ها زیان‌ده: شورت‌ها بسته نمی‌شوند
 await p.evaluate(()=>__mk({calib:{long:{n:400,w:150,r:-40,g:60,lb:-0.2},short:{n:200,w:120,r:30,g:40,lb:0.05},'long|85-95':{n:200,w:120,r:40,g:50,lb:0.15},'short|85-95':{n:100,w:60,r:20,g:40,lb:0.15}}}));
 s=await st();const mv2=await p.evaluate(()=>{RDV='model';renderRadar();const t=document.getElementById('rdView').textContent;RDV='sig';renderRadar();return t;});
 console.log('   ',JSON.stringify(s).slice(0,300));
 ok(s.ok==='S1'&&['L1','L2','L3','L4','L5'].every(t=>s.why[t]==='neg')&&!/stop/.test(s.hero)&&/لانگ‌های مدل در کل زیان‌ده‌اند/.test(s.ht)&&/فقط شورت/.test(s.ht),
   'فقط لانگ‌ها زیان‌ده: لانگ‌ها بسته، شورت «قابل گرفتن»؛ کارت قرمز نمی‌آید و هشدار می‌گوید فقط شورت');
 ok(/لانگ‌های مدل در کل زیان‌ده‌اند/.test(mv2)&&!/هر دو جهت/.test(mv2),'«کارنامه»: هشدار فقط برای لانگ');
 // و برعکس: شورت‌ها زیان‌ده، لانگ‌ها آزاد
 await p.evaluate(()=>__mk({calib:{long:{n:400,w:240,r:60,g:60,lb:0.05},short:{n:200,w:70,r:-30,g:40,lb:-0.3},'long|85-95':{n:200,w:120,r:40,g:50,lb:0.15},'short|85-95':{n:100,w:60,r:20,g:40,lb:0.15}}}));
 s=await st();ok(s.ok==='L1,L2,L3'&&s.why.S1==='neg','فقط شورت‌ها زیان‌ده: سه لانگ قابل گرفتن، شورت بسته');

 console.log('=== خلاف حال بازار ===');
 await p.evaluate(()=>__mk({reg:'bear'}));s=await st();
 ok(s.why.L1==='reg'&&s.ok==='S1','بازار نزولی: لانگ بی سابقه‌ی همین حال بازار «خلاف حال بازار»؛ شورت آزاد');
 await p.evaluate(()=>__mk({reg:'bear',calib:Object.assign({},RD.calib,{'long|bear|85-95':{n:60,w:40,r:15,g:20,lb:0.08}})}));s=await st();
 ok(['L1','L2','L3','S1'].every(t=>s.ok.split(',').includes(t))&&s.why.L4==='cap','اگر لانگ‌ها در همین بازار نزولی هم 3 ستاره دارند، مجازند');

 console.log('=== ارزهای کم ===');
 await p.evaluate(()=>__mk({ncoin:12}));s=await st();
 const r50=await p.evaluate(()=>!!document.querySelector('#rdView [data-rd50]'));
 ok(s.stars.split(',').every(x=>+x<=3)&&/50 ارز/.test(s.ht)&&r50,'با 12 ارز: ستاره حداکثر 3، هشدار «دست‌کم 50 ارز» و دکمه‌ی «رساندن به 50 ارز»');
 await p.evaluate(()=>__mk({ncoin:40}));s=await st();
 ok(s.stars.split(',').some(x=>+x===4)&&/50 ارز/.test(s.ht),'با 40 ارز: ستاره‌ی 4 برمی‌گردد ولی هشدار می‌ماند');
 await p.evaluate(()=>__mk({ncoin:60}));s=await st();ok(!/50 ارز/.test(s.ht),'با 60 ارز: هشداری نیست');

 console.log('=== خروجی بررسی ===');
 const ex=await p.evaluate(()=>{__mk({ncoin:60});const x=rdList().find(y=>y.tk==='L1');x.parts={t4:1,divr:1,rsi:0};const it=rbAdd('test',x,true);
   RBL.res=[{it,C:[],st:{lev:10,mfe:0.6,tMfe:null,mfe24:0.6,mae:-0.2,stopAt:null,touch:{},full:false}}];const j=JSON.parse(rbLabExport());RBL.res=null;
   return {v:j.v,h:!!j.model.health,cap:j.model.cap,w:!!j.model.weights,pv:j.trades[0].pv,why:j.trades[0].why};});
 console.log('   ',JSON.stringify(ex));
 ok(ex.v===2&&ex.h&&ex.cap===3&&ex.w&&ex.pv&&ex.pv.t4===1&&ex.pv.divr===1&&!('rsi' in ex.pv),'خروجی: سلامت مدل، سقف، وزن‌ها و عامل‌های لحظه‌ی ورود هر تست');
 const btn=await p.evaluate(()=>{RDV='test';renderRadar();const b=!!document.querySelector('#rdView .rbtop [data-rbl="dl"]');RDV='sig';renderRadar();return b;});
 ok(btn,'دکمه‌ی «خروجی برای بررسی» بالای «آزمایشی»');

 console.log('=== تغییر ستاره و راهنما ===');
 const sc=await p.evaluate(()=>{const now=Date.now(),c=(n,w,r,g,lb)=>({n,w,r,g,lb});
   __mk({ncoin:60,calib:{long:c(400,240,80,60,0.1),short:c(200,110,20,40,0.05),'long|95+':c(200,140,80,50,0.3),'long|85-95':c(200,100,10,50,-0.05),'short|85-95':c(100,60,20,40,0.15)}});
   RDSTH={};RD.coins.L1.sc=96;renderRadar();const s1=rdList().find(x=>x.tk==='L1').stars;
   RD.coins.L1.sc=88;RD.reg='bear';RD.mt0=now+1;renderRadar();const x=rdList().find(y=>y.tk==='L1');
   const card=document.querySelector('#rdView .rdit[data-rd="L1"]');
   return {s1,s2:x.stars,pill:(card.querySelector('.rdchg')||{}).textContent||'',det:(card.querySelector('.rdchgd')||{}).textContent||'',saved:!!(lsGet('signaldesk.rdsth')||{}).L1};});
 console.log('   ',JSON.stringify(sc).slice(0,400));
 ok(sc.s1===5&&sc.s2===2&&sc.pill==='قبلاً 5★ → الان 2★'&&/95\+ به 85-95/.test(sc.det)&&/روند بیت‌کوین/.test(sc.det)&&/مدل از نو یاد گرفت/.test(sc.det)&&sc.saved,
   'ستاره‌ی 5 → 2: روی کارت «قبلاً 5★ → الان 2★» و دلیل‌ها (دسته‌ی امتیاز، روند بیت‌کوین، یادگیری دوباره)');
 const gd=await p.evaluate(async()=>{document.querySelector('#rdView [data-rdhelp]').click();await new Promise(r=>setTimeout(r,300));
   const t=document.getElementById('sheet').textContent;closeSheet();return t;});
 ok(/امتیاز چیست/.test(gd)&&/احتمال برد نیست/.test(gd)&&/فرق 2 و 3 ستاره/.test(gd)&&/چرا ستاره‌ی یک ارز عوض می‌شود/.test(gd)&&/کِی مجاز به ورودیم/.test(gd)&&/تا کی صبر/.test(gd),'دکمه‌ی «راهنما»: امتیاز، ستاره، تغییر ستاره، کِی ورود و تا کی صبر');
 await p.waitForTimeout(400);

 console.log('=== چیدمان ===');
 const ui=await p.evaluate(()=>{__mk({ncoin:60});const g=document.getElementById('rdView');
   const card=g.querySelector('.rdit'),det=card&&card.querySelector('details.rdmore');
   return {segs:[...document.querySelectorAll('#rdFbar .fseg .fb')].map(b=>b.getBoundingClientRect().height),groups:[...g.querySelectorAll('.rdsh b')].map(x=>x.textContent).join(','),
     kv:card&&card.querySelectorAll('.rdkv>div').length,det:!!det&&!det.open,mk:!!g.querySelector('details.rdmk'),noPanel:!g.querySelector('.rdpan'),sw:document.documentElement.scrollWidth};});
 console.log('   ',JSON.stringify(ui));
 ok(ui.segs.length===4&&ui.segs.every(h=>h>=38&&h<60),'چهار زیرتب، هر کدام دکمه‌ی کامل (نه فشرده)');
 ok(ui.groups==='قابل گرفتن,بی اعتبار کافی'&&ui.kv===3&&ui.det&&ui.mk&&ui.noPanel,'سیگنال‌ها: دو گروه، سه عدد اصلی، جزئیات بسته، بازار کل تاشو؛ جدول‌ها در «کارنامه»');
 ok(ui.sw<=392,'بی اسکرول افقی ('+ui.sw+')');
 await p.screenshot({path:(process.env.TEST_OUT||'/tmp/signaldesk-tests')+'/logs/rdgate.png',fullPage:true});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
