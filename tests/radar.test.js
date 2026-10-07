/* رادار بازار: امتیاز لانگ/شورت از ۸ عامل، سنجش روی گذشته، اولویت‌بندی، تب «بازار» */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== موتور ===');
 const e=await p.evaluate(()=>{const H=36e5,t0=Math.floor(Date.now()/H)*H-1000*H;
   const mk=f=>{const C=[];let v=100;for(let i=0;i<1000;i++){const o=v;v=f(i,v);C.push({t:t0+i*H,o,h:Math.max(o,v)*1.002,l:Math.min(o,v)*0.998,c:v,v:1000+(i>995?3000:0)});}return C;};
   const up=mk((i,v)=>v*(1+0.002+0.004*Math.sin(i/7))), dn=mk((i,v)=>v*(1-0.002+0.004*Math.sin(i/7))), fl=mk((i,v)=>100+Math.sin(i/9)*0.8);
   const sc=C=>{const P=rdPrep(C,up);const s=rdScore(P,C.length-1);return {net:s.net,dir:rdDir(s.net),parts:s.parts};};
   const a=sc(up),b=sc(dn),c=sc(fl);
   // در طول روند صعودی (نه فقط کندل آخر): بیشترِ ۲۰۰ کندل آخر لانگ، هیچ‌کدام شورت
   const PU=rdPrep(up,up),dirs=[];for(let i=800;i<1000;i++)dirs.push(rdDir(rdScore(PU,i).net));
   a.longs=dirs.filter(x=>x==='long').length;a.shorts=dirs.filter(x=>x==='short').length;
   // پیش‌نگری نه: امتیازِ کندل i با کندل‌های بعدی عوض نمی‌شود
   const BB=up.map(k=>Object.assign({},k)), P1=rdPrep(up.slice(0,800),BB), P2=rdPrep(up,BB), s1=rdScore(P1,799).net, s2=rdScore(P2,799).net;
   const cal={};rdBacktest(rdPrep(up,up),cal);
   return {a,b:{net:b.net,dir:b.dir,btc:b.parts.btc},c:{net:c.net,dir:c.dir},s1,s2,cal};});
 console.log('   ',JSON.stringify({a:e.a.net,b:e.b,c:e.c,s1:e.s1,s2:e.s2,cal:e.cal}));
 ok(e.a.longs>=120&&e.a.shorts===0&&e.a.parts.t4>0,'روند صعودی پایدار ← بیشتر لانگ ('+e.a.longs+' از 200)، هیچ شورت');
 ok(e.b.dir==='short'&&e.b.btc>0,'روند نزولی ← شورت؛ عامل بیت‌کوین (صعودی) خلافش حساب شد ('+e.b.net+')');
 ok(e.c.dir==='wait','بازار رنج ← «صبر» ('+e.c.net+')');
 ok(e.s1===e.s2,'امتیاز هر کندل فقط از گذشته (بی نگاه به آینده)');
 const k=Object.keys(e.cal);ok(k.length&&k.every(x=>/^long\|/.test(x))&&e.cal[k[0]].n>20,'سنجش گذشته: نمونه‌های لانگ در روند صعودی '+JSON.stringify(e.cal));

 console.log('=== اولویت و تب «بازار» ===');
 const t=await p.evaluate(()=>{const now=Date.now();['RDA','RDB','RDC','RDD'].forEach((x,i)=>{SYMBOLS.add(x);PRICES.set(x,10+i);});SYMVER++;
   const pl=(E,d)=>({dir:d,E,SL:d==='long'?E*0.98:E*1.02,TP:d==='long'?E*1.03:E*0.97,sd:0.02,rr:1.5});
   const parts={t4:1,t1:1,macd:1,rsi:0.6,brk:0,vol:0.5,btc:1,ext:0};
   RD={v:2,at:now,n:20,W:null,reg:null,fund:{RDA:0.06,RDB:0.01},rank:['RDA','RDB','RDC','RDD'],
     calib:{'long|60+':{n:120,w:72,r:30},'long|45-60':{n:200,w:96,r:30},'short|30-45':{n:90,w:36,r:-9}},
     coins:{RDA:{net:52,dir:'long',flow:true,parts,rsi:62,rv:1.3,atrPct:1,px:10,pl:pl(10,'long')},
            RDB:{net:75,dir:'long',flow:true,parts,rsi:66,rv:1.9,atrPct:1,px:11,pl:pl(11,'long')},
            RDC:{net:-35,dir:'short',parts:{t4:-1,t1:-1,macd:-1,rsi:-0.3,brk:-1,vol:0,btc:1,ext:0},rsi:44,rv:1,atrPct:1,px:12,pl:pl(12,'short')},
            RDD:{net:12,dir:'wait',parts,rsi:51,rv:1,atrPct:1,px:13,pl:null}}};
   const L=rdList();bucket='live';sigFilter='mkt';go('signals',true);renderAll();
   const G=document.getElementById('glance'), it=[...G.querySelectorAll('.rdit')];
   return {order:L.map(x=>x.tk+':'+(x.ok?1:0)).join(','),segs:[...document.querySelectorAll('#fbar .fseg .fb span')].map(x=>x.textContent).join(','),
     n:[...document.querySelectorAll('#fbar .fseg .fb')][1].querySelector('i').textContent,
     items:it.map(x=>x.querySelector('.glit').textContent),first:it[0]&&it[0].textContent,wait:(G.querySelector('.rdwait')||{}).textContent||'',cards:document.querySelectorAll('#list .card').length,
     weak:it.filter(x=>x.classList.contains('weak')).length};});
 console.log('   ',JSON.stringify(Object.assign({},t,{first:t.first&&t.first.slice(0,200)})));
 ok(t.segs==='الان چه کنم؟,بازار,در انتظار,همه','تب «بازار» کنار «الان چه کنم؟»: '+t.segs);
 ok(t.order==='RDB:1,RDA:1,RDC:0,RDD:0','اولویت با رتبه: RDB (4★، +0.25R) بعد RDA (3★، +0.15R)، شورت RDC (1★) و صبر آخر — '+t.order);
 ok(t.n==='2'&&t.weak===1,'عدد تب = فرصت‌های با رتبه‌ی خوب (۲)؛ شورت RDC کم‌رنگ');
 ok(/^1RDBلانگامتیاز 75/.test(t.items[0])&&/120 بار/.test(t.first)&&/★★★★☆/.test(t.first)&&/✓ روند 4 ساعته صعودی/.test(t.first),'ردیف اول: رتبه، نماد، جهت، امتیاز، سابقه و دلیل‌ها');
 ok(/صبر/.test(t.wait)&&/RDD/.test(t.wait)&&t.cards===0,'«صبر» جدا؛ کارت پستی در این تب نیست');
 const f=await p.evaluate(()=>{const w=[...document.querySelectorAll('#glance .rdit')].find(x=>x.dataset.rd==='RDA');return w.textContent;});
 ok(/فاندینگ 0.06٪ \(لانگ‌ها شلوغ\)/.test(f),'فاندینگ بالا به‌عنوان اطلاع');
 await p.evaluate(()=>document.querySelector('#glance .rdit[data-rd="RDB"] [data-a="iso"]').click());await p.waitForTimeout(600);
 ok(await p.evaluate(()=>/RDB/.test(document.querySelector('#sheet').textContent)&&+document.querySelector('#f_e').value===11),'«ایزوله» فرم ورود RDB را باز کرد');
 await p.evaluate(()=>closeSheet());await p.waitForTimeout(400);
 const u=await p.evaluate(()=>{RDCAP={at:Date.now(),list:['BTC','USDT','ETH','USDC','STETH','XRP','WBTC','SOL','BNB','FDUSD','DOGE']};return rdUniverse(5).join(',');});
 ok(u==='BTC,ETH,XRP,SOL,BNB','فهرست ارزها بی استیبل و توکن‌های بسته‌بندی‌شده: '+u);
 console.log('=== جریان پول، ریسک‌فری، یادگیری وزن ===');
 const fz=await p.evaluate(()=>{const H=36e5,t0=Math.floor(Date.now()/H)*H-400*H,C=[];
   for(let i=0;i<400;i++){const o=100+Math.sin(i/5),c=100+Math.sin((i+1)/5);C.push({t:t0+i*H,o,h:Math.max(o,c)+0.3,l:Math.min(o,c)-0.3,c,v:1000});}
   const m=f=>new Map(C.map((k,i)=>[k.t,f(i)]));
   const FL={top:m(()=>1.6),glob:m(()=>3.3),taker:m(()=>0.65),oi:m(i=>1e6*(1+i*0.01))};
   const r=rdParts(rdPrep(C,C,FL),399);
   // ریسک‌فری: قیمت به +1R رسید و برگشت به ورود ← حدود صفر، نه −1R
   const pl={dir:'long',E:100,SL:98,TP:103,sd:0.02,rr:1.5};
   const W=[{t:0,o:100,h:100,l:100,c:100},{t:1,o:100,h:102.2,l:100.5,c:102},{t:2,o:102,h:102,l:99.9,c:100},{t:3,o:100,h:100,l:97,c:97}];
   const w=rdWalk(W.concat(new Array(30).fill({t:9,o:97,h:97,l:97,c:97})),0,pl);
   // یادگیری: عاملی که حرکت بعد را پیش‌بینی می‌کند وزن مثبت بزرگ می‌گیرد
   // بازه‌های ۲۴ ساعته با جریان پایدار: خرید تهاجمی غالب ← قیمت در همان بازه بالا می‌رود
   const mk=seed=>{const C2=[];let v=100,rnd=seed;const R=()=>{rnd=(rnd*9301+49297)%233280;return rnd/233280-0.5;};
     const tk=new Map();let f=1;
     for(let i=0;i<1000;i++){if(i%24===0)f=R()>0?1:-1;const t=t0+i*H, o=v;v*=1+f*0.002+R()*0.004;tk.set(t,f>0?1.3:0.77);
       C2.push({t,o,h:Math.max(o,v)*1.001,l:Math.min(o,v)*0.999,c:v,v:1000});}
     return rdPrep(C2,null,{taker:tk});};
   const L=rdLearn([mk(7),mk(11),mk(23)]);
   return {p:r.p,m:r.m,w,W:L.W,n:L.n};});
 console.log('   ',JSON.stringify({p:fz.p,w:fz.w,W:fz.W}));
 ok(fz.p.whale<0&&Math.abs(fz.m.wl-61.5)<1&&Math.abs(fz.m.rl-76.7)<1,'نهنگ‌ها 62٪ لانگ، مردم 77٪ لانگ ← «نهنگ‌ها شورت‌تر از مردم» (منفی)');
 ok(fz.p.crowd<0,'مردم بیش از 70٪ لانگ ← ازدحام، منفی برای لانگ');
 ok(fz.p.taker<0&&Math.abs(fz.m.tb-39.4)<1,'خرید تهاجمی 39٪ ← منفی');
 ok(fz.p.oi!==null&&fz.m.doi>0,'OI رو به بالا محاسبه شد');
 ok(fz.w&&fz.w.how==='be'&&fz.w.R<0&&fz.w.R>-0.3,'ریسک‌فری بعد از +1R: برگشت به ورود ← '+(fz.w&&fz.w.R.toFixed(2))+'R نه −1R');
 ok(fz.W.taker>10,'یادگیری: عاملِ پیش‌بین (خرید تهاجمی) وزن مثبتِ قابل توجه گرفت: '+fz.W.taker);

 console.log('=== پنل کارنامه و کار امروز ===');
 const pn=await p.evaluate(()=>{const c=(n,w,r)=>({n,w,r});
   RD.reg='bear';RD.calib={'long':c(300,120,-30),'short':c(280,160,40),'long|bear':c(120,40,-24),'short|bear':c(110,70,33),
     'long|30-45':c(150,60,-15),'long|45-60':c(100,45,0),'long|60+':c(50,25,5),'short|30-45':c(140,78,8),'short|45-60':c(90,55,25),'short|60+':c(50,32,16),
     'short|bear|45-60':c(40,26,12),'short|bear|30-45':c(50,28,3),'long|bear|30-45':c(60,20,-15)};
   RD.W={t4:30,t1:10,macd:5,rsi:-5,brk:0,vol:5,btc:15,ext:0,whale:15,crowd:10,taker:5,oi:0};
   paintGlance();const P=document.querySelector('#glance .rdpan');return P?P.textContent:'';});
 console.log('   ',pn.slice(0,260));
 ok(/در بازار نزولی/.test(pn)&&/در همه‌ی حال‌های بازار/.test(pn),'دو جدول: حال بازار امروز و همه');
 ok(/کار امروز: فقط شورت‌های امتیاز (60\+|45-60)/.test(pn)&&/لانگ در این حال بازار زیان داده/.test(pn),'«کار امروز»: شورت 45-60؛ لانگ نه');
 ok(/RSI \(برعکس\) 5/.test(pn)&&/بی‌اثر یا بی‌داده: شکست 7 روزه/.test(pn),'وزن‌های یادگرفته، با «برعکس» و «بی‌اثر»');

 console.log('=== بررسی کامل با داده‌ی فیوچرز ===');
 await ctx.route('**/futures/data/**',r=>{const u=r.request().url(),H=36e5,now=Math.floor(Date.now()/H)*H;
   const row=i=>{const t=now-(499-i)*H;return /taker/.test(u)?{buySellRatio:String(1+0.2*Math.sin(i/9)),timestamp:t}:/openInterest/.test(u)?{sumOpenInterestValue:String(1e8*(1+i*0.001)),timestamp:t}:{longShortRatio:String(/top/.test(u)?1.4+0.3*Math.sin(i/11):2+0.5*Math.cos(i/13)),timestamp:t};};
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(/BTCUSDT|ETHUSDT/.test(u)?Array.from({length:500},(_,i)=>row(i)):[])});});
 const full=await p.evaluate(async()=>{RD.n=5;RD.at=0;await rdScan(true);
   bucket='live';sigFilter='mkt';renderAll();
   return {n:RD.rank.length,nflow:RD.nflow,btc:RD.coins.BTC&&{wl:RD.coins.BTC.wl,rl:RD.coins.BTC.rl,tb:RD.coins.BTC.tb,flow:RD.coins.BTC.flow},sol:RD.coins.SOL&&RD.coins.SOL.flow,
     W:RD.W,cal:Object.keys(RD.calib).length,pan:!!document.querySelector('#glance .rdpan'),reg:RD.reg};});
 console.log('   ',JSON.stringify(full));
 ok(full.n>=3&&full.nflow===2,'بررسی کامل: '+full.n+' ارز، داده‌ی جریان برای BTC و ETH');
 ok(full.btc&&full.btc.flow&&full.btc.wl>50&&full.btc.rl>60&&full.btc.tb>0&&full.sol===false,'BTC با نهنگ/مردم/تهاجمی؛ SOL بی داده‌ی فیوچرز');
 ok(full.W&&Object.keys(full.W).length===12&&full.cal>0&&full.pan,'وزن‌های یادگرفته، کارنامه و پنل ساخته شد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
