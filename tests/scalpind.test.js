/* اسکلپ با اندیکاتورها: محاسبه‌ی اندیکاتورها، تصمیم و امتیاز تأیید، نبودِ نگاه به آینده، سقف زمان،
   تست خودکار با «اثر هر شرط»، کارت اسکلپ با جهت خودکار، و ربات اسکلپ */
const {pw,out}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
// نماد ساختگی RNG: موج ±۲٪ با دوره‌ی ۲ ساعت + لرزش ۷ دقیقه‌ای، با سایه و حجم
const rng=t=>100*(1+0.02*Math.sin(2*Math.PI*t/(2*36e5))+0.004*Math.sin(2*Math.PI*t/(7*6e4)));
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 await ctx.route(/api\.binance\.com\/api\/v3\/klines\?symbol=RNGUSDT/,r=>{
   const u=new URL(r.request().url()), ms={'1m':6e4,'3m':18e4,'5m':3e5}[u.searchParams.get('interval')]||6e4;
   const st=+u.searchParams.get('startTime'), lim=+u.searchParams.get('limit'), now=Date.now(), rows=[];
   for(let t=Math.ceil(st/ms)*ms;t<=now&&rows.length<lim;t+=ms){const o=rng(t),c=rng(t+ms),w=0.0012*o*(1+Math.sin(t/7e5));
     rows.push([t,String(o),String(Math.max(o,c)+w),String(Math.min(o,c)-w),String(c),String(100+50*Math.abs(Math.sin(t/9e5))),t+ms-1]);}
   r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(rows)});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);

 console.log('=== اندیکاتورها ===');
 const ind=await p.evaluate(()=>{
   const v=[1,2,3,4,5,6,7,8,9,10], up=Array.from({length:30},(_,i)=>100+i), zz=Array.from({length:40},(_,i)=>100+(i%2?1:-1));
   const C=[{t:0,o:10,h:11,l:9,c:10,v:1},{t:6e4,o:20,h:21,l:19,c:20,v:3},{t:864e5,o:30,h:31,l:29,c:30,v:2}];
   const V=Array.from({length:21},(_,i)=>({t:i*6e4,o:1,h:1,l:1,c:1,v:i<20?1:3}));
   const bb=indBB(Array(25).fill(5),20,2), at=indAtr(Array.from({length:20},(_,i)=>({t:i,o:100,h:101,l:99,c:100})),14);
   return {ema:indEma(v,3)[9],emaNull:indEma(v,3)[1],rsiUp:indRsi(up,14)[29],rsiZz:Math.round(indRsi(zz,14)[39]),
     bb:[bb.mid[24],bb.up[24],bb.lo[24],bb.mid[10]],vw:indVwap(C),vr:indVolR(V,20)[20],atr:at[19]};});
 ok(ind.ema===9&&ind.emaNull===null,'EMA ۳ روی ۱..۱۰ = ۹ (و پیش از ۳ کندل خالی)');
 ok(ind.rsiUp===100&&Math.abs(ind.rsiZz-50)<=5,'RSI: فقط بالا = ۱۰۰، بالا-پایینِ برابر ≈ ۵۰ ('+ind.rsiZz+')');
 ok(ind.bb.join(',')==='5,5,5,','بولینگر روی قیمت ثابت: میانه و باندها روی ۵؛ پیش از ۲۰ کندل خالی');
 ok(ind.vw[0]===10&&ind.vw[1]===17.5&&ind.vw[2]===30,'VWAP وزنی با حجم (۱۰، ۱۷.۵) و از نو در روز بعد (۳۰)');
 ok(ind.vr===3&&ind.atr===2,'حجم نسبی ×۳ و ATR = ۲');

 console.log('=== تصمیم اسکلپ و امتیاز ===');
 const dc=await p.evaluate(()=>{
   const base={p:100,k:{o:99.5,h:100.1,l:99,c:100},kp:{o:100,h:100.2,l:99.4,c:99.6},rsi:33,rsiP:28,rsiLo:25,rsiHi:40,atr:0.3,
     bbU:104,bbL:99.9,bbM:102,bbUp:104,bbLp:100.1,vwap:99,volR:1,e20:101,e50:100.5,hm:2,btc:-0.1,i:30};
   const o={lev:10,fee:0.05,slip:0.02,miss:2,flt:{}};
   const d=scDecide(base,o);
   const mid=scDecide(Object.assign({},base,{p:102,k:{o:102,h:102.2,l:101.8,c:102}}),o);
   const weak=scDecide(Object.assign({},base,{rsi:45,rsiP:46,rsiLo:44,vwap:101,e20:100,e50:101,k:{o:100.4,h:100.5,l:99.95,c:100},kp:{o:100.5,h:100.6,l:100,c:100.4}}),o);
   const cost=scDecide(Object.assign({},base,{atr:0.01,hm:0.05,bbM:100.05}),o);
   const wild=scDecide(Object.assign({},base,{atr:3}),Object.assign({},o,{lev:50}));
   const dump=scDecide(Object.assign({},base,{btc:-1.2}),o);
   const off=scDecide(Object.assign({},base,{btc:-1.2}),Object.assign({},o,{flt:{btc:false}}));
   const sh=scDecide(Object.assign({},base,{p:104,k:{o:104.5,h:105,l:103.9,c:104},kp:{o:104,h:104.6,l:103.8,c:104.4},rsi:68,rsiP:72,rsiHi:75,rsiLo:60,bbUp:104.2,vwap:105,e20:104,e50:104.5,btc:0.1}),o);
   return {d:{act:d.act,sc:d.score+'/'+d.checks.length,tp:+d.plan.tp.toFixed(3),st:+d.plan.stop.toFixed(3)},mid:mid.act+':'+mid.why,
     weak:weak.act+':'+weak.why+':'+weak.score,cost:cost.why,wild:wild.why,dump:dump.checks.find(c=>c.k==='btc').ok+':'+dump.score,
     off:off.checks.length+':'+off.act,sh:sh.act+':'+sh.score+'/'+sh.checks.length};});
 console.log('   ',JSON.stringify(dc));
 ok(dc.d.act==='long'&&dc.d.sc==='6/6','کنار باند پایین + روند و VWAP و RSI و کندل برگشتی و حجم و بیت‌کوین ← «الان لانگ» با ۶ از ۶');
 ok(dc.d.tp===101.2&&dc.d.st===98.94,'تارگت ۱۰۱.۲ (۶۰٪ نوسانِ یک ساعت)، استاپ ۹۸.۹۴ (زیر کفِ دو کندل)');
 ok(dc.mid==='wait:mid','وسط باندها ← صبر');
 ok(/^wait:score:[0-3]$/.test(dc.weak),'کنار باند ولی تأیید کم ← «صبر: تأیید کافی نیست» ('+dc.weak+')');
 ok(dc.cost==='cost','تارگت کوچک‌تر از ۳ برابرِ کارمزد و لغزش ← «ارزش ندارد»');
 ok(dc.wild==='wild','اهرم ۵۰ با نوسان زیاد ← استاپ نزدیک لیکوئید، گرفته نمی‌شود');
 ok(dc.dump==='false:5','بیت‌کوین ۱.۲٪ ریخته ← شرطِ بیت‌کوین برای لانگ رد (۵ از ۶)');
 ok(dc.off==='5:long','شرطِ خاموش شمرده نمی‌شود (۵ شرط) و تصمیم عوض می‌شود');
 ok(dc.sh.startsWith('short:'),'کنار باند بالا با RSI برگشته از اشباع خرید ← شورت ('+dc.sh+')');

 console.log('=== بی‌نگاه به آینده ===');
 const ca=await p.evaluate(()=>{
   const t0=Math.floor(Date.now()/6e4)*6e4-30*36e5, X=[];
   for(let i=0;i<1800;i++){const t=t0+i*6e4, o=100+5*Math.sin(i/37)+Math.sin(i/5), c=100+5*Math.sin((i+1)/37)+Math.sin((i+1)/5);X.push({t,o,h:Math.max(o,c)+0.2,l:Math.min(o,c)-0.2,c,v:10+i%7});}
   const T=t0+1500*6e4, full=scSeries(X,6e4,'5m',null).at(T), cut=scSeries(X.filter(k=>k.t+6e4<=T),6e4,'5m',null).at(T);
   const keys=['p','rsi','atr','bbU','bbL','vwap','volR','e20','e50','hm'];
   return {same:keys.every(k=>Math.abs((full[k]||0)-(cut[k]||0))<1e-9),k:full.k.t+3e5<=T};});
 ok(ca.same&&ca.k,'اندیکاتورها در لحظه‌ی T با و بدون کندل‌های بعد از T یکی‌اند (تست گذشته تقلب نمی‌کند)');

 console.log('=== سقف زمان و خروج زود ===');
 const tm=await p.evaluate(()=>{
   const x={p:100,k:{o:99.5,h:100.1,l:99,c:100},kp:{o:100,h:100.2,l:99.4,c:99.6},rsi:33,rsiP:28,rsiLo:25,rsiHi:40,atr:0.3,
     bbU:104,bbL:99.9,bbM:102,bbUp:104,bbLp:100.1,vwap:99,volR:1,e20:101,e50:100.5,hm:2,btc:null,i:30};
   const t0=Math.floor(Date.now()/6e4)*6e4-864e5, X=Array.from({length:70},(_,i)=>({t:t0+i*6e4,o:100,h:100,l:100,c:100,v:1}));
   const run=te=>{const cfg=botCfg({mode:'scalp',tf:'1m',lev:10,mg:10,save:'none',fee:0,slip:0,tmax:60,tearly:te,miss:2});
     const st=botInitSt(cfg,t0), ev=botRun(st,cfg,X,6e4,()=>x,t0+70*6e4);
     const c=ev.find(e=>e.k==='close');return c&&{by:c.x.by,min:(c.x.t1-c.x.t0)/6e4,sc:c.x.sc};};
   return {a:run(0),b:run(20)};});
 ok(tm.a&&tm.a.by==='time'&&tm.a.min===60&&tm.a.sc==='5/5','قیمت درجا: بعد از ۶۰ دقیقه با «سقف زمان» بسته شد (تأیید ۵ از ۵ ثبت شد)');
 ok(tm.b&&tm.b.by==='time'&&tm.b.min===20,'خروج زود: بعد از ۲۰ دقیقه بی‌سود بسته شد');

 console.log('=== تست خودکار اسکلپ با «اثر هر شرط» ===');
 const bt=await p.evaluate(async()=>{S.fee=0.02;S.slip=0;
   const r=await botBacktest('RNG',{style:'scalp',lev:10,tf:'5m',mg:10,tmax:60,tearly:0,miss:3,flt:{}},1);
   const all=Object.values(r.res).flatMap(v=>v.T);
   return {style:r.style,exec:r.exec,n:Object.fromEntries(Object.entries(r.res).map(([k,v])=>[k,v.s.n])),abl:r.abl.map(a=>a.k+':'+a.s.n),
     best:r.best,maxMin:Math.max(0,...all.map(x=>(x.t1-x.t0)/6e4)),bys:[...new Set(all.map(x=>x.by))].join(','),hold:r.res[r.best].s.hold};});
 console.log('   ',JSON.stringify(bt));
 ok(bt.style==='scalp'&&bt.exec==='1m','سبک اسکلپ، اجرا با کندل ۱ دقیقه‌ای');
 ok(bt.abl.length===7&&bt.abl[6].startsWith('all:'),'اثر هر شرط: ۶ شرط + «بدون هیچ تأیید»');
 ok(bt.abl.every(x=>+x.split(':')[1]>=bt.n[bt.best]),'بدون هر شرط، معامله کمتر نمی‌شود (شرطِ خاموش فقط آسان‌تر می‌کند)');
 ok(+bt.abl[6].split(':')[1]>0,'روی موجِ ساختگی معامله باز شد');
 ok(bt.maxMin<=61,'هیچ معامله‌ای بیش از ۶۰ دقیقه باز نماند (بیشینه '+bt.maxMin+' دقیقه)');

 console.log('=== رابط: کارت اسکلپ، جهت خودکار، اندیکاتورها ===');
 await p.evaluate(()=>{Object.assign(SWOPT,{style:'scalp',open:'tok',tf:'5m',lev:10,miss:3,flt:{},dir:'auto',me:'',mt:'',ms:'',tk:'RNG'});swOptSave();go('scalp',true);});
 await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!document.querySelector('#swDays')&&document.querySelector('#swDir').value==='auto'),'فرم اسکلپ: «دوره» ندارد؛ جهت پیش‌فرض «خودکار»');
 await p.evaluate(()=>document.querySelector('#swTkGo').click());
 for(let i=0;i<60&&!(await p.evaluate(()=>!!document.querySelector('#swCoin .swdec')));i++)await p.waitForTimeout(300);
 const ui=await p.evaluate(()=>({dv:document.querySelector('#swCoin .swdec .dv')?.textContent||'',chk:document.querySelectorAll('#swCoin .sccheck li').length,
   ind:!!document.querySelector('#swCoin .scind .scchart'),st:[...document.querySelectorAll('#swCoin .scind .st b')].map(x=>x.textContent).join('|'),side:SWCOIN&&SWCOIN.sd&&SWCOIN.sd.side}));
 console.log('   ',JSON.stringify(ui));
 ok(/^(الان: لانگ|الان: شورت|صبر کن)/.test(ui.dv)&&ui.chk===6,'کارت اسکلپ: تصمیم با فهرست ۶ شرط ✓/✗');
 ok(ui.ind&&/RSI/.test(ui.st)&&/VWAP/.test(ui.st)&&/بولینگر/.test(ui.st)&&/EMA/.test(ui.st),'اندیکاتورها: نمودار قیمت/بولینگر/VWAP و جدول RSI، EMA، VWAP، ATR، حجم، بیت‌کوین');
 const ce=await p.$('#swCoin .swdec');if(ce)await ce.screenshot({path:out('scalpind_card.png')});
 await p.evaluate(()=>{const i=document.querySelector('#swMe');i.value=String(+SWCOIN.sd.x.p.toPrecision(6));i.dispatchEvent(new Event('change'));document.querySelector('#swTkGo').click();});
 for(let i=0;i<60&&!(await p.evaluate(()=>!!(SWCOIN&&SWCOIN.sc)));i++)await p.waitForTimeout(300);
 ok(await p.evaluate(()=>SWCOIN.sc&&SWCOIN.sc.dir===SWCOIN.sd.side),'ورود دستی با جهت «خودکار»: جهت از کارت آمد ('+await p.evaluate(()=>SWCOIN.sc&&SWCOIN.sc.dir)+')');

 console.log('=== رابط: تنظیم‌ها ===');
 await p.evaluate(()=>{SWOPT.open='opt';swOptSave();renderScalp();});
 const op=await p.evaluate(()=>({tm:!!document.querySelector('#swTmax')&&!!document.querySelector('#swMiss'),fl:document.querySelectorAll('.scflt .pbc').length}));
 ok(op.tm&&op.fl===6,'تنظیم‌های اسکلپ: سقف زمان، خروج زود، حداقل امتیاز و ۶ شرط');
 await p.evaluate(()=>document.querySelector('.scflt .pbc[data-k="vwap"]').click());
 ok(await p.evaluate(()=>SWOPT.flt.vwap===false&&!document.querySelector('.scflt .pbc[data-k="vwap"]').classList.contains('on')),'خاموش کردن یک شرط');
 await p.evaluate(()=>{SWOPT.flt={};swOptSave();});

 console.log('=== رابط: تست خودکار و ربات اسکلپ ===');
 await p.evaluate(()=>{Object.assign(SWOPT,{open:'bt',btN:1,btTk:'RNG'});swOptSave();renderScalp();});
 ok(await p.evaluate(()=>!document.querySelector('#btD')&&/اسکلپ/.test(document.querySelector('.btrules').textContent)),'بخش تست در سبک اسکلپ: قاعده‌های اسکلپ، بی «رنج از»');
 await p.evaluate(()=>document.querySelector('#btGo').click());
 for(let i=0;i<80&&!(await p.evaluate(()=>!!document.querySelector('#btRes .btabl')));i++)await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.querySelectorAll('#btRes .btabl tbody tr').length===7),'جدول «اثر هر شرط» با ۷ ردیف');
 const be=await p.$('#btRes .btres');if(be)await be.screenshot({path:out('scalpind_bt.png')});
 await p.evaluate(()=>document.querySelector('#btRes [data-bot="RNG"]').click());await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/ربات اسکلپ/.test(document.querySelector('#sheet h3').textContent)&&!!document.querySelector('#bTmax')&&document.querySelectorAll('#bFlt .pbc').length===6),'فرم ربات اسکلپ با سقف زمان و شرط‌ها');
 await p.evaluate(()=>document.querySelector('#bGo').click());await p.waitForTimeout(500);
 const lv=await p.evaluate(async()=>{const b=botList()[0];
   b.st=botInitSt(b.cfg,Math.floor((Date.now()-4*36e5)/6e4)*6e4);b.at=Date.now()-4*36e5;
   await botTick(true);
   return {mode:b.cfg.mode,tmax:b.cfg.tmax,lag:Date.now()-b.st.lastT,n:b.tot.n,max:Math.max(0,...b.trades.map(x=>(x.t1-x.t0)/6e4)),plan:b.st.plan&&b.st.plan.act,
     card:document.querySelector('#bot-'+b.id)?.textContent.replace(/\s+/g,' ')||''};});
 console.log('   ',JSON.stringify(Object.assign({},lv,{card:lv.card.slice(0,140)})));
 ok(lv.mode==='scalp'&&lv.tmax===60&&lv.lag<3*60e3,'ربات اسکلپ ساخته شد و از روی کندل‌ها تا همین دقیقه جلو آمد');
 ok(lv.max<=61,'معامله‌های ربات هم حداکثر ۶۰ دقیقه ('+lv.n+' معامله)');
 ok(/ربات اسکلپ/.test(lv.card)&&/حداکثر/.test(lv.card),'کارت ربات: «ربات اسکلپ» و سقف زمان');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
