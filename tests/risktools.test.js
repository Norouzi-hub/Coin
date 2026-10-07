/* پیشنهادهای ۱۱ تا ۲۰: لیکوئید پیش از استاپ، سقف زمان، قفل باخت پیاپی، ریسک‌فری و دنباله‌دار،
   هم‌جهت، سقف تعداد، بستن سریع با «چرا بستم» */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);

 console.log('=== ۱۴ و ۱۵: ریسک‌فری و دنباله‌دار ===');
 const rm=await p.evaluate(()=>{
   Object.assign(S,{beAt:2,trail:3,fee:0.1});
   const q=ensureBase({id:'rq1',ticker:'RQA',kind:'futures',dir:'long',entry:100,stop:90,stop0:90,margin:10,lev:5,targets:[120],openedAt:Date.now()-36e5,status:'open',partials:[],log:[]});
   const ev=[];
   riskManage(q,101,101,Date.now(),ev);const s0=q.stop;
   riskManage(q,102.5,102.5,Date.now(),ev);const s1=q.stop;
   riskManage(q,106,106,Date.now(),ev);const s2=q.stop;
   riskManage(q,104,104,Date.now(),ev);const s3=q.stop;
   return {s0,s1,s2,s3,ev:ev.map(e=>e.k).join(),log:q.log.length};});
 console.log('   ',JSON.stringify(rm));
 ok(rm.s0===90,'+۱٪: هنوز دست نخورد');
 ok(Math.abs(rm.s1-100.1)<1e-6,'+۲٫۵٪: ریسک‌فری (ورود + کارمزد = 100.1)');
 ok(Math.abs(rm.s2-102.82)<1e-6&&rm.s3===rm.s2,'دنباله‌دار ۳٪ پشت ۱۰۶ ← 102.82؛ برگشت قیمت استاپ را عقب نمی‌برد');
 ok(rm.ev==='be,trail','رویدادها: ریسک‌فری و فعال شدن دنباله‌دار');

 console.log('=== ۱۳، ۱۶، ۲۰: پیش از ورود ===');
 const g=await p.evaluate(()=>{
   const now=Date.now(), mk=(id,dir,st,pnlSign,h)=>ensureBase({id,ticker:'G'+id,kind:'futures',dir,entry:100,stop:95,stop0:95,margin:10,lev:5,targets:[],
     openedAt:now-h*36e5-36e5,status:st,exitPrice:st==='closed'?(pnlSign>0?105:96):null,closedAt:st==='closed'?now-h*36e5:null,fees:0,partials:[],log:[]});
   DB.positions=[mk('c1','long','closed',-1,0.2),mk('c2','long','closed',-1,0.5),mk('c3','long','closed',1,3),
     mk('o1','long','open'),mk('o2','long','open'),mk('o3','short','open')];
   S.lossLock=2;
   const gate=riskGateExtra('long');
   S.lossLock=3;const g3=riskGateExtra('short');
   return {gate,g3,streak:lossStreak().n};});
 console.log('    '+g.gate.join(' | '));
 ok(g.streak===2&&/2 باخت پیاپی/.test(g.gate[0]),'۲ باخت پیاپی ← قفل تا فردا');
 ok(g.gate.some(x=>/3 پوزیشن لانگ هم‌زمان/.test(x)),'۲ لانگ باز + لانگ تازه ← هشدار هم‌جهت');
 ok(!g.g3.some(x=>/باخت پیاپی/.test(x))&&!g.g3.some(x=>/هم‌زمان داری/.test(x)),'با قفل ۳ و شورت تازه: نه قفل، نه هم‌جهت');

 console.log('=== ۱۱، ۱۲، ۱۸: روی کارت پوزیشن ===');
 await p.evaluate(()=>{const now=Date.now();
   DB.positions=[ensureBase({id:'k1',ticker:'BTC',kind:'futures',dir:'long',entry:60000,stop:54000,stop0:54000,margin:10,lev:20,targets:[66000],
     openedAt:now-5*36e5,until:now-60000,status:'open',partials:[],log:[]})];
   PRICES.set('BTC',61000);POSOPEN.add('k1');save();go('positions',true);renderAll();});
 await p.waitForTimeout(500);
 const k=await p.evaluate(()=>{const c=document.getElementById('pos-k1');return {pills:[...c.querySelectorAll('.chead .pill')].map(x=>x.textContent).join('|'),
   flag:[...c.querySelectorAll('.flag.d')].map(x=>x.textContent).join('|'),q:!![...c.querySelectorAll('.acts .btn')].find(x=>/^بستن$/.test(x.textContent.trim()))};});
 console.log('   ',JSON.stringify(k));
 ok(/مهلت گذشت/.test(k.pills),'سقف زمانِ گذشته ← «مهلت گذشت»');
 ok(/لیکوئید پیش از استاپ/.test(k.flag),'اهرم ۲۰ با استاپ ۱۰٪ ← «لیکوئید پیش از استاپ»');
 ok(k.q,'دکمه‌ی «بستن» (با قیمت لحظه)');
 await p.evaluate(()=>[...document.querySelectorAll('#pos-k1 .acts .btn')].find(x=>/^بستن$/.test(x.textContent.trim())).click());await p.waitForTimeout(400);
 await p.evaluate(()=>document.querySelector('#sheet [data-w="time"]').click());await p.waitForTimeout(400);
 const cl=await p.evaluate(()=>{posFilter='closed';renderAll();const q=DB.positions.find(x=>x.id==='k1');return {st:q.status,ex:q.exitPrice,why:q.why,pill:[...document.querySelectorAll('#pos-k1 .chead .pill')].map(x=>x.textContent).join('|')};});
 console.log('   ',JSON.stringify(cl));
 ok(cl.st==='closed'&&cl.ex===61000&&cl.why==='time','بستن سریع با «سقف زمان»: روی 61000 بسته شد');
 ok(/بستم: سقف زمان/.test(cl.pill),'روی کارت بسته: «بستم: سقف زمان»');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
