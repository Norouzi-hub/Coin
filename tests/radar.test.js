/* رادار بازار v3: عامل‌ها، مدل لجستیک، کارنامه‌ی صادق، بارگذاری ده‌تایی، معامله‌ی آزمایشی و دفتر پیشنهادها */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
const RD_EXN_OK=f=>['tp','lad','trl','sar','q03','q05','q075','q1','q05c','h05','t1h'].includes(f.exP)&&f.exs&&f.extab;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 // کندل ساختگیِ پیوسته (تابع زمان، پس صفحه‌ها با هم جورند) برای هر نماد؛ شمارش درخواست‌ها
 const REQ={},PXN={};
 await ctx.route(/klines\?symbol=/,r=>{const u=r.request().url(),m=u.match(/symbol=([A-Z0-9]+)USDT&interval=(\w+)&startTime=(\d+)&limit=(\d+)/);
   if(!m)return r.fallback();const [,s,iv,st,lim]=m,ms={'1h':36e5,'5m':3e5}[iv];if(!ms||s==='GRAM')return r.fallback();
   // درخواست 1000 ساعت اخیرِ mkCandles (رویدادهای کارت‌ها و پیشنهاد برنامه) مال رادار نیست؛ جدا شمرده می‌شود
   const mk=iv==='1h'&&Math.abs(Date.now()-1000*36e5-(+st))<3*36e5;
   REQ[s+':'+iv+(mk?':mk':'')]=(REQ[s+':'+iv+(mk?':mk':'')]||0)+1;
   const sd=[...s].reduce((a,c)=>a+c.charCodeAt(0),0)%17, H=36e5, base={BTC:60000,ETH:3000}[s]||10+sd;
   const P=PXN[s+':'+iv];
   const px=t=>P?P(t):base*(1+0.06*Math.sin(t/H/41+sd)+0.03*Math.sin(t/H/13+2*sd)+0.012*Math.sin(t/H/3.1+sd)+0.004*Math.sin(t/H*1.7));
   const out=[],now=Date.now();
   for(let t=+st;t<now&&out.length<+lim;t+=ms){const o=px(t),c=px(t+ms),w=Math.abs(c-o)*0.6+o*0.0015;out.push([t,String(o),String(Math.max(o,c)+w),String(Math.min(o,c)-w),String(c),String(1000+400*Math.sin(t/H/5+sd)),t+ms-1]);}
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(out)});});
 await ctx.route('**/fapi/v1/fundingRate**',r=>{const u=r.request().url(),n=Date.now(),st=+(u.match(/startTime=(\d+)/)||[0,n-130*864e5])[1];REQ['fund']=(REQ['fund']||0)+1;
   const out=[];for(let t=Math.ceil(st/(8*36e5))*8*36e5;t<n&&out.length<1000;t+=8*36e5)out.push({symbol:'X',fundingTime:t,fundingRate:String(0.0001*(1+Math.sin(t/864e5)))});
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(/BTCUSDT|ETHUSDT/.test(u)?out:[])});});
 await ctx.route('**/futures/data/**',r=>{const u=r.request().url(),H=36e5,now=Math.floor(Date.now()/H)*H,lim=+(u.match(/limit=(\d+)/)||[0,500])[1];
   REQ['flow']=(REQ['flow']||0)+1;
   const row=i=>{const t=now-(lim-1-i)*H;return /taker/.test(u)?{buySellRatio:String(1+0.2*Math.sin(t/H/9)),timestamp:t}:/openInterest/.test(u)?{sumOpenInterestValue:String(1e8*(1+Math.sin(t/H/50)*0.1)),timestamp:t}:{longShortRatio:String(/top/.test(u)?1.4+0.3*Math.sin(t/H/11):2+0.5*Math.cos(t/H/13)),timestamp:t};};
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(/BTCUSDT|ETHUSDT/.test(u)?Array.from({length:lim},(_,i)=>row(i)):[])});});
 // CoinGecko: کل بازار، ارزش بازار هر ارز، عرضه‌ی تتر
 const CG=[['BTC',1.84e12,-1.5],['ETH',3.872e11,-3],['USDT',1.664e11,0.05],['SOL',8e10,-4],['XRP',7e10,-4],['ADA',3e10,-5],['USDC',6e10,0],['DOGE',2.5e10,-6],['DOT',1e10,-5],['LINK',9e9,-5],['AVAX',8e9,-5],['NEAR',6e9,-5],['UNI',5e9,-4],['APT',4e9,-4]];
 await ctx.route('**/api.coingecko.com/**',r=>{const u=r.request().url(),J=b=>r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(b)});
   if(/\/global/.test(u))return J({data:{total_market_cap:{usd:3.2e12},market_cap_change_percentage_24h_usd:-2.5,market_cap_percentage:{btc:57.5,eth:12.1,usdt:5.2}}});
   if(/coins\/markets/.test(u))return J(CG.map(([s,c,ch])=>({symbol:s.toLowerCase(),market_cap:c,market_cap_change_percentage_24h:ch})));
   if(/tether\/market_chart/.test(u)){const D=864e5,n=Date.now();return J({market_caps:Array.from({length:131},(_,i)=>[n-(130-i)*D,1.5e11+i*1.25e8])});}
   return r.fallback();});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== عامل‌ها و نمونه‌ها ===');
 const e=await p.evaluate(()=>{const H=36e5,t0=Math.floor(Date.now()/H)*H-1500*H;
   const mk=f=>{const C=[];let v=100;for(let i=0;i<1500;i++){const o=v;v=f(i,v);C.push({t:t0+i*H,o,h:Math.max(o,v)*1.002,l:Math.min(o,v)*0.998,c:v,v:1000});}return C;};
   const up=mk((i,v)=>v*(1+0.002+0.004*Math.sin(i/7))), B=mk((i,v)=>v*(1+0.0005+0.004*Math.sin(i/9)));
   const P=rdPrep(up,B), r=rdParts(P,1400);
   // پیش‌نگری نه: عامل‌های کندل i با کندل‌های بعدی عوض نمی‌شوند
   const v1=rdVec(rdParts(rdPrep(up.slice(0,1201),B),1200).p), v2=rdVec(rdParts(rdPrep(up,B),1200).p);
   const H2=36e5,FU=[];for(let t=up[0].t;t<=up[up.length-1].t;t+=8*H2)FU.push([t,0.03]);
   const r2=rdParts(rdPrep(up,B,null,FU),1400);
   const S1=rdSamples(P,'UP');
   return {p2:r2.p,adx:r2.m.adx,p:r.p,rsv:r.m.rsv,same:JSON.stringify(v1)===JSON.stringify(v2),n:S1.t.length,F:S1.F,xl:S1.X.length,
     longWin:S1.R.long.filter(x=>x>0).length/S1.t.length, shortWin:S1.R.short.filter(x=>x>0).length/S1.t.length,exitOk:S1.J.long.every((j,q)=>j>S1.t[q])};});
 console.log('   ',JSON.stringify(e).slice(0,400));
 ok(e.p.t4>0&&e.p.rs>0&&e.p.d50>0&&e.p.volc!=null,'روند صعودی قوی‌تر از بیت‌کوین ← روند 4ساعته، قدرت نسبی و روند روزانه مثبت');
 ok(e.same,'عامل‌های هر کندل فقط از گذشته (بی نگاه به آینده)');
 ok(e.p2.ma200>0&&e.p2.ma200s>0&&e.p2.adx>0&&e.adx>20&&e.p2.mom>0&&e.p2.obv>0&&e.p2.hl30>0.5,'عامل‌های تازه در روند صعودی: بالای میانگین 200 و رو به بالا، ADX '+Math.round(e.adx)+' صعودی، مومنتوم و OBV مثبت، نزدیک سقف 30 روزه');
 ok(Math.abs(e.p2.fund-0.6)<1e-9&&!('hs' in e.p2)&&!('wknd' in e.p2)&&e.p2.bbp!=null&&e.p2.vwap!=null,'فاندینگ 0.03٪ ← 0.6؛ بولینگر، VWAP؛ ساعت روز و آخر هفته برداشته شد');
 ok(e.n>500&&e.xl===e.n*e.F&&e.exitOk,'نمونه‌ها: هر 2 ساعت، '+e.F+' عامل قیمتی، خروج بعد از ورود ('+e.n+')');
 ok(e.longWin>e.shortWin,'در روند صعودی لانگ بیشتر سود داده تا شورت ('+e.longWin.toFixed(2)+' در برابر '+e.shortWin.toFixed(2)+')');

 console.log('=== مدل لجستیک و کارنامه‌ی صادق ===');
 const m=await p.evaluate(()=>{
   // نمونه‌های ساختگی: «خرید تهاجمی» (ستون 13) لانگ را پیش‌بینی می‌کند، بقیه نویز
   let rnd=7;const R=()=>{rnd=(rnd*9301+49297)%233280;return rnd/233280;};
   const F=RD_F0,ti=RD_FEAT.indexOf('taker'),H=36e5,t0=Date.now()-3000*H,SS=[];
   for(const tk of ['A','B','C']){const t=[],X=[],Rr={long:[],short:[]},J={long:[],short:[]},G=[];
     for(let i=0;i<1400;i++){const x=Array.from({length:F},()=>R()*2-1);x[F-1]=x[F-2]=0;const tt=t0+i*2*H;
       const pw=1/(1+Math.exp(-(2.2*x[ti]-0.3)));const win=R()<pw;
       t.push(tt);X.push(...x);G.push('flat');Rr.long.push(win?1.4:-1.1);Rr.short.push(!win?1.4:-1.1);J.long.push(tt+6*H);J.short.push(tt+6*H);}
     SS.push({tk,t,X:Float32Array.from(X),R:Rr,J,G,F});}
   const ML=rdFit(SS,'long',Infinity),MS=rdFit(SS,'short',Infinity);
   const qs=ML.q, mono=qs.every((v,i)=>!i||v>=qs[i-1]);
   const cal={},rel={long:Array.from({length:6},()=>[0,0,0]),short:Array.from({length:6},()=>[0,0,0])};
   rdEvalFold(SS,{long:ML,short:MS},t0,t0+3000*H,cal,rel,new Map());
   const L=rdSum(cal.long),A=cal['long|95+']&&rdSum(cal['long|95+']);
   // بی هم‌پوشانی: هر ارز در هر 6 ساعت حداکثر یک معامله ← حداکثر 1400×3/3
   const tot=(cal.long?cal.long.n:0)+(cal.short?cal.short.n:0);
   const top=rdPct(ML,0.99),lo=rdPct(ML,0.01);
   return {wl:ML.w[ti],ws:MS.w[ti],other:Math.max(...ML.w.slice(0,F).filter((_,i)=>i!==ti).map(Math.abs)),mono,top,lo,L,A,tot,base:rdSum(cal['base|long']),
     st:[rdStars({n:10,w:5,r:3,g:9,lb:.2}),rdStars({n:50,w:20,r:-3,g:9,lb:-.2}),rdStars({n:50,w:30,r:5,g:9,lb:-.01}),rdStars({n:50,w:30,r:8,g:9,lb:.05}),rdStars({n:50,w:30,r:20,g:9,lb:.3}),rdStars({n:50,w:30,r:20,g:3,lb:.3})]};});
 console.log('   ',JSON.stringify(m));
 ok(m.wl>1.2&&m.ws<-1.2&&m.other<0.4,'مدل عامل پیش‌بین را پیدا کرد: لانگ +'+m.wl.toFixed(2)+'، شورت '+m.ws.toFixed(2)+'؛ بقیه کوچک ('+m.other.toFixed(2)+')');
 ok(m.mono&&m.top===100&&m.lo===0,'امتیاز = صدک احتمال (0 تا 100)');
 ok(m.L&&m.L.r/m.L.n>m.base.r/m.base.n+0.3&&m.L.lb<m.L.r/m.L.n&&m.L.g>10,'کارنامه: لانگ‌های امتیاز 70+ بسیار بهتر از بی‌انتخاب؛ کران پایین کمتر از میانگین');
 ok(m.tot<=1400,'برای هر ارز در هر لحظه فقط یک معامله ('+m.tot+' معامله از 4200 لحظه)');
 ok(JSON.stringify(m.st)==='[0,1,2,3,5,0]','ستاره: نمونه‌ی کم، زیان، شاید شانس، مطمئن، عالی، روزهای کم ← '+JSON.stringify(m.st));

 console.log('=== اولویت و تب «بازار» ===');
 const t=await p.evaluate(()=>{const now=Date.now();['RDA','RDB','RDC','RDD'].forEach((x,i)=>{SYMBOLS.add(x);PRICES.set(x,10+i);});SYMVER++;
   const pl=(E,d)=>({dir:d,E,SL:d==='long'?E*0.98:E*1.02,TP:d==='long'?E*1.03:E*0.97,sd:0.02,rr:1.5});
   const F=RD_FEAT.length,w=Array(F+1).fill(0);w[RD_FEAT.indexOf('t4')]=0.8;w[RD_FEAT.indexOf('rs')]=0.5;
   const parts={t4:1,t1:1,macd:1,rsi:0.6,brk:0,vol:0.5,btc:1,ext:0,rs:0.6,d50:0.4,volc:0,rbull:0,rbear:0};
   const c=(n,w,r,g,lb)=>({n,w,r,g,lb});
   RD={v:5,at:now,n:10,list:['RDA','RDB','RDC','RDD'],reg:null,fund:{RDA:0.06,RDB:0.01},rank:['RDA','RDB','RDC','RDD'],M:{long:{w,q:[]},short:{w:w.map(x=>-x),q:[]}},
     calib:{'long|95+':c(120,72,30,40,0.12),'long|85-95':c(200,96,30,50,0.04),'short|70-85':c(90,36,-9,30,-0.3)},
     coins:{RDA:{sc:88,dir:'long',best:'long',p:0.46,flow:true,parts,rsi:62,rv:1.3,rsv:4,px:10,pl:pl(10,'long')},
            RDB:{sc:97,dir:'long',best:'long',p:0.52,flow:true,parts,rsi:66,rv:1.9,rsv:6,px:11,pl:pl(11,'long')},
            RDC:{sc:75,dir:'short',best:'short',p:0.4,parts:{t4:-1,t1:-1,macd:-1,rsi:-0.3,brk:-1,vol:0,btc:1,ext:0,rs:-0.5},rsi:44,rv:1,rsv:-5,px:12,pl:pl(12,'short')},
            RDD:{sc:55,dir:'wait',best:'long',parts,rsi:51,rv:1,px:13,pl:null}}};
   RDV='sig';const L=rdList();bucket='live';sigFilter='all';go('signals',true);renderAll();
   const segs=[...document.querySelectorAll('#fbar .fseg .fb span')].map(x=>x.textContent).join(',');go('radar',true);renderAll();
   const G=document.getElementById('rdView'), it=[...G.querySelectorAll('.rdit')];
   return {order:L.map(x=>x.tk+':'+(x.ok?1:0)).join(','),segs,n:document.getElementById('cRad').textContent,tab:!!document.querySelector('.tab[data-v="radar"]')&&!document.getElementById('vRadar').classList.contains('hide'),
     items:it.map(x=>x.querySelector('.glit').textContent),first:it[0]&&it[0].textContent,wait:(G.querySelector('.rdwait')||{}).textContent||'',cards:G.querySelectorAll('.card').length,
     weak:it.filter(x=>x.classList.contains('weak')).length,more:!!G.querySelector('[data-rdmore]'),cnt:(G.querySelector('.rdcnt')||{}).textContent,
     tabs:[...document.querySelectorAll('#rdFbar .fseg .fb span')].map(x=>x.textContent).join(',')};});
 console.log('   ',JSON.stringify(Object.assign({},t,{first:t.first&&t.first.slice(0,260)})));
 ok(t.segs==='الان چه کنم؟,در انتظار,همه'&&t.tab,'«بازار» تب مستقل در نوار پایین؛ از سیگنال‌ها بیرون رفت: '+t.segs);
 ok(t.order==='RDB:1,RDA:1,RDC:0,RDD:0','اولویت: RDB (4★) بعد RDA (3★)، شورت RDC (1★) و صبر آخر — '+t.order);
 ok(t.n==='2'&&t.weak===1,'عدد تب پایین = فرصت‌های با رتبه‌ی خوب (۲)؛ شورت RDC کم‌رنگ');
 ok(/^1☆RDBلانگامتیاز 97/.test(t.items[0])&&/120 بار در 40 روز/.test(t.first)&&/★★★★☆/.test(t.first)&&/✓ روند 4 ساعته صعودی/.test(t.first)&&/احتمال سود به گفته‌ی مدل: 52٪/.test(t.first)&&/بدترین حالت محتمل/.test(t.first),'ردیف اول: رتبه، امتیاز، ستاره، سابقه با روزها، احتمال، دلیل‌ها');
 ok(/صبر/.test(t.wait)&&/RDD/.test(t.wait)&&t.cards===0,'«صبر» جدا؛ کارت پستی در این تب نیست');
 ok(t.more&&/^4 ارز/.test(t.cnt)&&t.tabs==='سیگنال‌ها,آزمایشی,کارنامه,دفتر','دکمه‌ی «10 ارز بعدی» و چهار زیرتب (سیگنال‌ها، آزمایشی، کارنامه، دفتر)');
 await p.evaluate(()=>document.querySelector('#rdView .rdit[data-rd="RDB"] [data-a="iso"]').click());await p.waitForTimeout(600);
 ok(await p.evaluate(()=>/RDB/.test(document.querySelector('#sheet').textContent)&&+document.querySelector('#f_e').value===11),'«ایزوله» فرم ورود RDB را باز کرد');
 await p.evaluate(()=>closeSheet());await p.waitForTimeout(400);
 const u=await p.evaluate(()=>{RDCAP={at:Date.now(),list:['BTC','USDT','ETH','USDC','STETH','XRP','WBTC','SOL','BNB','FDUSD','DOGE']};return rdUniverse(5).join(',');});
 ok(u==='BTC,ETH,XRP,SOL,BNB','فهرست ارزها بی استیبل و توکن‌های بسته‌بندی‌شده: '+u);

 console.log('=== معامله‌ی آزمایشی ===');
 const T30=Date.now()-30*36e5;PXN['XRP:5m']=t=>t<T30+5*36e5?2:1.9;
 const bk=await p.evaluate(async(t0)=>{RB.items=[];RBEX='tp';   // این بخش: نقشه‌ی «هدف ثابت»
   document.querySelector('#rdView .rdit[data-rd="RDB"] [data-a="test"]').click();
   const it=RB.items[0], tab=[...document.querySelectorAll('#rdFbar .fseg .fb')].map(x=>x.textContent).join(',');
   const dup=rbAdd('test',rdList().find(x=>x.tk==='RDB'));
   // قیمت: +1R (ریسک‌فری) بعد برگشت به ورود
   PRICES.set('RDB',11*1.021);rbCheck();const be=it.be;PRICES.set('RDB',10.99);rbCheck();
   const r1={st:it.st,R:it.R,be};
   // دومی: به هدف
   const x=rdList().find(x=>x.tk==='RDA');PRICES.set('RDA',10);const i2=rbAdd('test',x,true);PRICES.set('RDA',10.31);rbCheck();
   // سومی: وقتی برنامه بسته بود (30 ساعت پیش) ← از کندل 5 دقیقه‌ای؛ قیمت ساختگی به استاپ می‌خورد
   const H=36e5;
   const i3={id:'tx',k:'test',tk:'XRP',dir:'long',t:t0,E:2,SL:1.95,TP:2.1,sd:0.025,rr:2,be:false,st:'open'};RB.items.push(i3);
   await rbCatchUp(true);
   RDV='test';renderRadar();const G=document.getElementById('rdView');
   return {r1,i2:{st:i2.st,R:i2.R},i3:{st:i3.st,R:i3.R,xt:i3.xt-t0},dup,tab,txt:G.textContent,rows:G.querySelectorAll('.rbrow').length};},T30);
 console.log('   ',JSON.stringify(Object.assign({},bk,{txt:bk.txt.slice(0,300)})));
 ok(bk.tab.includes('آزمایشی1')&&bk.dup===null,'«تست» ثبت شد (زیرتب: آزمایشی با عدد 1)؛ تکراری ثبت نمی‌شود');
 ok(bk.r1.be&&bk.r1.st==='be'&&bk.r1.R<0&&bk.r1.R>-0.3,'ریسک‌فری بعد از +1R و بسته شدن در ورود ← '+bk.r1.R+'R');
 ok(bk.i2.st==='tp'&&bk.i2.R>1.3,'به هدف رسید ← +'+bk.i2.R+'R');
 ok(bk.i3.st==='sl'&&bk.i3.R<-1&&bk.i3.xt>5*36e5&&bk.i3.xt<6*36e5,'برنامه بسته بود: از کندل 5 دقیقه‌ای استاپ خورده پیدا شد ('+bk.i3.R+'R)');
 ok(bk.rows===3&&/نتیجه3 بسته/.test(bk.txt)&&/پولی در کار نیست/.test(bk.txt),'زیرتب آزمایشی: جمع‌بندی و 3 ردیف');

 console.log('=== نقشه‌ی خروج: سیو سود ===');
 const T3=Date.now()-3*36e5;PXN['XRP:5m']=t=>t<T3+36e5?2:t<T3+2*36e5?2.06:1.99;
 const ex=await p.evaluate(async(t3)=>{RB.items=[];const PL=rdExPlans();
   // پله‌ای: نصف در +1R، استاپ به ورود؛ یک‌چهارم در +2R، استاپ به +1R؛ برگشت به +1R ← باقی همان‌جا
   const L=exNew();exStep(L,PL.lad,1.05,0.2);const a1={k:L.k,rem:L.rem,stop:L.stop};exStep(L,PL.lad,2.1,1.5);const a2={k:L.k,rem:L.rem,stop:L.stop};
   const e1=exStep(L,PL.lad,2.2,0.9);
   // متحرک: نصف در +1R؛ بیشترین سود +3R ← استاپ +2R؛ برگشت ← باقی در +2R
   const T=exNew();exStep(T,PL.trl,1.2,0.3);exStep(T,PL.trl,3,2.5);const ts=T.stop;const e2=exStep(T,PL.trl,2.6,1.9);
   // تست زنده با «پله‌ای»: +1R ← سیو 50٪ و استاپ به ورود؛ برگشت به ورود ← بسته با سودِ همان نصف
   RBEX='lad';PRICES.set('RDB',11);const it=rbAdd('test',rdList().find(x=>x.tk==='RDB'),true);
   PRICES.set('RDB',11*1.0205);rbCheck();const s1={k:it.x.k,rem:it.x.rem,st:it.st,live:rbLiveR(it,11*1.0205)};
   RDV='test';renderRadar();const mid=document.getElementById('rdView').textContent;
   PRICES.set('RDB',10.999);rbCheck();
   // معامله‌ی بازِ قدیمی (بی نقشه، 3 ساعت پیش): از لحظه‌ی ورود با کندل 5 دقیقه‌ای و نقشه‌ی تازه دوباره حساب می‌شود
   const old={id:'old1',k:'test',tk:'XRP',dir:'long',t:t3,E:2,SL:1.95,TP:2.075,sd:0.025,rr:1.5,be:false,st:'open'};RB.items.push(old);
   const n=rbReplan(null,true);await rbCatchUp(true);
   renderRadar();const G=document.getElementById('rdView');
   return {a1,a2,e1,ladR:L.acc,ts,e2,trR:T.acc,s1,mid,it:{st:it.st,R:it.R},n,old:{ex:old.ex,st:old.st,R:old.R,k:old.x&&old.x.k},
     pick:(G.querySelector('.rbexw')||{}).textContent||''};},T3);
 console.log('   ',JSON.stringify(Object.assign({},ex,{mid:ex.mid.slice(0,200),pick:ex.pick.slice(0,160)})));
 ok(ex.a1.k===1&&ex.a1.rem===0.5&&ex.a1.stop===0&&ex.a2.k===2&&ex.a2.stop===1&&ex.e1&&Math.abs(ex.ladR-1.25)<1e-9,'پله‌ای: نصف در +1R (استاپ ورود)، یک‌چهارم در +2R (استاپ +1R)، باقی در +1R ← +1.25R');
 ok(ex.ts===2&&ex.e2&&Math.abs(ex.trR-1.5)<1e-9,'متحرک: نصف در +1R، استاپ 1R پشت بیشترین سود (+3R ← +2R)، باقی در +2R ← +1.5R');
 ok(ex.s1.k===1&&ex.s1.rem===0.5&&ex.s1.st==='open'&&/سیو شد 50٪/.test(ex.mid),'تست زنده: در +1R نصف سیو شد و معامله باز ماند');
 ok(ex.it.st==='be'&&ex.it.R>0.3&&ex.it.R<0.5,'برگشت به ورود: بسته با سود همان نصف ('+ex.it.R+'R) — قبلاً صفر می‌شد');
 ok(ex.n>=1&&ex.old.ex==='lad'&&ex.old.k===1&&ex.old.st==='be'&&ex.old.R>0.3,'معامله‌ی باز قدیمی با نقشه‌ی تازه از لحظه‌ی ورود دوباره حساب شد ('+ex.old.st+' '+ex.old.R+'R)');
 ok(/نقشه‌ی خروج/.test(ex.pick)&&/خودکار/.test(ex.pick)&&/استاپ متحرک/.test(ex.pick),'انتخاب نقشه‌ی خروج در «آزمایشی»');

 console.log('=== بررسی کامل: ده‌تا‌ده‌تا، IndexedDB، دفتر پیشنهادها ===');
 const full=await p.evaluate(async()=>{RB.items=[];RD=rdEmpty();RDS.clear();RDV='sig';
   RDCAP={at:Date.now(),list:['BTC','ETH','SOL','XRP','ADA','DOGE','DOT','LINK','AVAX','NEAR','UNI','APT']};
   renderAll();
   const t0=performance.now(),pr=rdScan('refresh');const seen=[];
   for(let i=0;i<40&&RDQ.on;i++){await new Promise(r=>setTimeout(r,100));const b=document.getElementById('rdProgBox');if(b)seen.push(b.textContent);}
   await pr;const ms=Math.round(performance.now()-t0);renderAll();
   const st=await idbGet('rdc:ETH'),fl=await idbGet('rdf:ETH');
   const L=rdList().filter(x=>x.dir!=='wait'),capd=['long','short'].reduce((a,d)=>a+Math.min(RD_CAP,L.filter(x=>x.dir===d).length),0),
     aopen=['long','short'].map(d=>RB.items.filter(i=>i.k==='auto'&&i.dir===d).length);
   RDV='model';renderRadar();const pan=!!document.querySelector('#rdView .rdpan'),extab=!!document.querySelector('#rdView .rdex');RDV='sig';renderRadar();
   return {ms,n:RD.n,rank:RD.rank.length,nflow:RD.nflow,M:!!(RD.M&&RD.M.long&&RD.M.short),cal:Object.keys(RD.calib).length,rel:!!RD.rel,
     eth:RD.coins.ETH&&{wl:RD.coins.ETH.wl,flow:RD.coins.ETH.flow,sc:RD.coins.ETH.sc,fund:RD.coins.ETH.parts.fund},solfund:RD.coins.SOL&&RD.coins.SOL.parts.fund,sol:RD.coins.SOL&&RD.coins.SOL.flow,
     rows:st&&st.rows.length,flow:fl&&fl.top&&fl.top.length,pan,capd,aopen,
     exP:RD.ex,exs:!!(RD.exs&&RD.exs.lad&&RD.exs.lad.all),extab,exD:RD.exD,exDok:['long','short'].every(d=>{const av=n=>{const o=RD.exs[n][d];return o&&o.n>=30?o.r/o.n:null;},b=RD.exD[d],ab=av(b);
       return RD_EXN.includes(b)&&(ab==null?b===RD.ex:RD_EXN.every(n=>av(n)==null||av(n)<=ab+0.005));}),auto:RB.items.filter(i=>i.k==='auto').length,sig:rdList().filter(x=>x.dir!=='wait').length,seen:seen.filter((x,i)=>i%5===0),gone:!document.getElementById('rdProgBox')};});
 console.log('   ',JSON.stringify(full),JSON.stringify(REQ));
 ok(full.seen.length>2&&full.seen.every(x=>/\d+٪/.test(x)&&/\d:\d\d/.test(x))&&full.seen.some(x=>/ارز \d+ از 10/.test(x))&&full.gone,'نوار پیشرفت: درصد، کار الان و تایمر؛ آخر کار برداشته شد');
 ok(full.n===10&&full.rank===10,'بار اول فقط 10 ارز اول ('+full.rank+')، در '+full.ms+'ms');
 ok(full.rows>=2990&&full.flow>=490,'تاریخچه در IndexedDB: '+full.rows+' کندل یک‌ساعته، '+full.flow+' ساعت جریان پول');
 const cst=await p.evaluate(()=>{RDV='model';renderRadar();const t=(document.querySelector('#rdView .rdcost')||{}).textContent||'';RDV='sig';renderRadar();return {c:RD.cost,t,cs:RD.cs===rdCostSig()};});
 console.log('   ',JSON.stringify(cst).slice(0,300));
 ok(cst.c&&cst.c.n>0&&cst.c.avg>0&&cst.c.avg<cst.c.mkt&&cst.c.mkt<cst.c.old&&cst.cs&&/هزینه‌ی هر معامله/.test(cst.t)&&/Limit/.test(cst.t),'«کارنامه»: هزینه‌ی میانگین هر معامله با Limit کمتر از Market و هر دو کمتر از روش قبلی');
 ok(RD_EXN_OK(full),'سه نقشه‌ی خروج بیرون از یادگیری سنجیده شد؛ بهترین: '+full.exP);
 ok(full.exD&&full.exDok,'نقشه‌ی خروج برای هر جهت جدا: بهترینِ همان جهت (لانگ '+(full.exD&&full.exD.long)+'، شورت '+(full.exD&&full.exD.short)+')');
 ok(full.M&&full.cal>0&&full.rel&&full.pan,'مدل لانگ و شورت، کارنامه، صداقت مدل و پنل ساخته شد');
 ok(full.eth&&full.eth.fund!=null&&full.solfund==null,'تاریخچه‌ی فاندینگ: ETH دارد، SOL (بی فیوچرز) ندارد');
 ok(full.eth&&full.eth.flow&&full.eth.wl>50&&full.sol===false&&full.nflow===2,'ETH با داده‌ی نهنگ/مردم؛ SOL بی فیوچرز');
 ok(full.auto===full.capd&&full.aopen.every(n=>n<=3),'پیشنهادهای 70+ در «دفتر پیشنهادها» ثبت شد، هر جهت حداکثر 3 باز ('+full.auto+' از '+full.sig+')');
 const mk2=await p.evaluate(()=>{const r=mdMetrics(MD);RDV='sig';renderRadar();const G=document.getElementById('rdView');
   const tiles=[...G.querySelectorAll('.mdt')].map(x=>x.textContent);go('signals',true);bucket='live';sigFilter='now';paintGlance();const now=!!document.querySelector('#glance .mdbox');go('radar',true);renderRadar();
   return {r,tiles,flags:[...G.querySelectorAll('.mdbox .flag')].map(x=>x.textContent),now,mf:RDMF.size,w:RD.M&&RD.M.long.w.length,last:RD.mk7&&{tot:RD.mk7.tot.slice(-1)[0],bd:RD.mk7.bd.slice(-1)[0],ud:RD.mk7.ud.slice(-1)[0],n:RD.mk7.tot.length},mkl:RD.mkl,
     mrow:[...RDMF.values()].slice(-1)[0],nF:RD_FEAT.length};});
 console.log('   ',JSON.stringify(mk2).slice(0,900));
 ok(mk2.r&&Math.abs(mk2.r.t3[0]-3.2e12*(1-0.575-0.121))<1e6&&mk2.r.bd[1]>0.3&&mk2.r.ud[1]>0.1&&mk2.r.t3[1]<mk2.r.tot[1],'TOTAL3 = بی BTC و ETH؛ دامیننس بیت‌کوین و تتر بالا رفت، آلت‌ها ضعیف‌تر');
 ok(mk2.tiles.length===6&&/TOTAL3/.test(mk2.tiles.join())&&/USDT\.D/.test(mk2.tiles.join())&&/\$3\.20T/.test(mk2.tiles[0])&&/57\.50%/.test(mk2.tiles[3])&&mk2.now,'شش کارت جدا: TOTAL، TOTAL2، TOTAL3، BTC.D، USDT.D، ETH.D (در «بازار» و «الان چه کنم؟»)');
 ok(mk2.flags.some(x=>/پول به تتر فرار/.test(x))&&mk2.flags.some(x=>/روز آلت‌کوین نیست/.test(x)),'خوانش: فرار به تتر و ضعف آلت‌ها');
 ok(mk2.mf>2000&&mk2.w===mk2.nF+1&&mk2.last&&Math.abs(mk2.last.tot/3.2e12-1)<0.001&&Math.abs(mk2.last.bd-57.5)<0.01&&mk2.last.n>40&&mk2.mrow.length===7,'تاریخچه‌ی ساعتی کل بازار بازسازی شد ('+mk2.mf+' ساعت)، ساعت آخر = CoinGecko؛ 7 عامل بازار (با پهنای RSI و MACD) در مدل');
 // واگرایی 1 ساعته: کف پایین‌تر با RSI بالاتر = مثبت؛ شکسته شدن کف یا RSI پایین‌تر = هیچ
 const dv=await p.evaluate(()=>{const mk=(brk)=>Array.from({length:60},(_,q)=>{const l=Math.min(10+0.1*Math.abs(q-30),9.5+0.1*Math.abs(q-50))-(brk&&q===54?1:0);return {t:q*36e5,o:l+0.5,h:l+1,l,c:l+0.5};});
   const o=Array.from({length:60},()=>50);o[30]=25;o[50]=35;const o2=o.slice();o2[50]=20;
   const sh=mk(false).map(k=>({t:k.t,o:-k.o,h:-k.l,l:-k.h,c:-k.c})),oS=o.map(x=>100-x);
   return {bull:rdDiv(mk(false),o,55,2),brk:rdDiv(mk(true),o,55,2),none:rdDiv(mk(false),o2,55,2),bear:rdDiv(sh,oS,55,2),
     divs:RD.divs&&Object.keys(RD.divs).sort().join(','),tbl:(RDV='model',renderRadar(),(document.querySelector('#rdView .rddiv')||{}).textContent||''),f:RD_FEAT.includes('divr')&&RD_FEAT.includes('divm'),
     chip:(RDV='sig',renderRadar(),[...document.querySelectorAll('#rdFbar .fc')].map(x=>x.textContent).join(','))};});
 console.log('   ',JSON.stringify(Object.assign({},dv,{tbl:dv.tbl.slice(0,120)})));
 ok(Math.abs(dv.bull-0.85)<1e-9&&dv.brk===0&&dv.none===0&&Math.abs(dv.bear+0.85)<1e-9,'واگرایی: مثبت در کف، منفی در سقف؛ کف شکسته یا RSI پایین‌تر = هیچ');
 ok(dv.f&&/all\|no/.test(dv.divs)&&/هم‌جهت با سیگنال/.test(dv.tbl)&&/خلاف سیگنال/.test(dv.tbl)&&/واگرایی هم‌جهت/.test(dv.chip),'عامل واگرایی در مدل، جدول «اثر واگرایی» (کارنامه) و فیلتر «واگرایی هم‌جهت»');
 // هرس خودکار: عامل تکراری (کپی یک عامل دیگر) و عامل‌های بی‌اثر کنار می‌روند و وزنشان صفر می‌شود
 const pr=await p.evaluate(()=>{const N=3000,F0=RD_F0,X=new Float32Array(N*F0),R={long:[],short:[]},J={long:[],short:[]},t=[];let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
   for(let q=0;q<N;q++){let z=0;for(let k=0;k<6;k++){const v=rnd()<0.5?-1:1;X[q*F0+k]=v;z+=v*(k+1)*0.25;}X[q*F0+6]=X[q*F0];
     const y=rnd()<1/(1+Math.exp(-z))?1:-1;R.long.push(y);R.short.push(-y);J.long.push(q);J.short.push(q);t.push(q*36e5);}
   const M=rdFitP([{tk:'Z',t,X,R,J}],'long',Infinity),D=M.drop||{},k6=RD_FEAT[6],k0=RD_FEAT[0];
   return {dup:D[k6]==='d:'+k0||D[k0]==='d:'+k6,w0:M.w[D[k6]?0:6],weak:Object.values(D).filter(x=>x==='w').length,kept:[1,2,3,4,5].every(k=>!D[RD_FEAT[k]]),zero:Object.keys(D).every(k=>M.w[RD_FEAT.indexOf(k)]===0),nF:RD_FEAT.length};});
 console.log('   ',JSON.stringify(pr));
 ok(pr.dup&&pr.kept&&pr.zero&&pr.weak>=pr.nF-8&&Math.abs(pr.w0)>0.1,'هرس خودکار: کپیِ یک عامل «تکراری» و عامل‌های بی‌اثر «کم‌اثر» کنار رفتند؛ عامل‌های مفید ماندند');
 // خروج سریع: همه در +0.5R، نصف در +0.5R، و خروج بعد از 1 ساعت با قیمت همان لحظه
 const qx=await p.evaluate(()=>{const C=Array.from({length:30},(_,j)=>j===0?{t:0,o:10,h:10,l:10,c:10}:j===1?{t:36e5,o:10,h:10.05,l:9.95,c:10.04}:{t:j*36e5,o:10.1,h:10.32,l:10.05,c:10.3});
   const cT=exCost({tpf:1},0.02),cM=exCost({tpf:0},0.02),w=rdWalkX(C,0,{dir:'long',E:10,sd:0.02});
   return {n:RD_EXN.length,q:+(w.q05.R+cT).toFixed(6),qj:w.q05.j,h:+(w.h05.R+cT).toFixed(6),t:+(w.t1h.R+cM).toFixed(6),tj:w.t1h.j,th:w.t1h.how,rows:(()=>{RDV='model';renderRadar();const n=document.querySelectorAll('#rdView .rdex tbody tr').length;RDV='sig';renderRadar();return n;})()};});
 console.log('   ',JSON.stringify(qx));
 ok(qx.n===11&&qx.rows===11&&qx.q===0.5&&qx.qj===2&&qx.h===1&&qx.t===0.2&&qx.tj===1&&qx.th==='time','خروج سریع در سنجش: +0.5R، نصف +0.5R/باقی +1.5R، بعد از 1 ساعت (+0.2R)؛ یازده ردیف در جدول نقشه‌ی خروج');
 // هزینه: کارمزد رفت‌وبرگشت یک بار (نه دو بار)؛ Limit برای ورود و هدف، مارکت + لغزش برای استاپ؛ استاپ خیلی نزدیک کنار می‌رود
 const cm=await p.evaluate(()=>{const keep={fee:S.fee,feeMk:S.feeMk,slip:S.slip,rdOrd:S.rdOrd};Object.assign(S,{fee:0.1,feeMk:0.04,slip:0.05,rdOrd:'lmt'});
   const a={tp:exCost({tpf:1},0.02),sl:exCost({tpf:0},0.02),half:exCost({tpf:0.5},0.02),tight:exCostSl(0.006),ok2:exCostSl(0.02)};
   S.rdOrd='mkt';a.mtp=exCost({tpf:1},0.02);a.msl=exCost({tpf:0},0.02);
   // Limit که قیمت به آن نرسید: معامله‌ای نیست
   S.rdOrd='lmt';const C=Array.from({length:30},(_,j)=>({t:j*36e5,o:10+j*0.2,h:10.1+j*0.2,l:j?10.05+j*0.2:10,c:10+j*0.2}));
   const w=rdWalkX(C,0,{dir:'long',E:10,sd:0.02});a.nf=w&&w.tp.how;a.sig=rdCostSig();Object.assign(S,keep);return a;});
 console.log('   ',JSON.stringify(cm));
 const near=(x,y)=>Math.abs(x-y)<1e-9;
 ok(near(cm.tp,0.02)&&near(cm.sl,0.06)&&near(cm.half,0.04)&&near(cm.mtp,0.05)&&near(cm.msl,0.075),'هزینه با استاپ 2٪: Limit تا هدف 0.02R، تا استاپ 0.06R؛ همه مارکت 0.05–0.075R (قبلاً همیشه 0.125R)');
 ok(cm.tight>0.15&&cm.ok2<0.15&&cm.nf==='nofill'&&/v2/.test(cm.sig),'استاپ 0.6٪ (هزینه بیش از 0.15R) کنار می‌رود؛ Limit بی‌لمس = بی‌معامله');
 const R0=Object.assign({},REQ);
 const more=await p.evaluate(async()=>{await rdScan('more');return {n:RD.n,rank:RD.rank.length,uni:RD.rank.includes('UNI')&&RD.rank.includes('APT')};});
 const d=k=>(REQ[k]||0)-(R0[k]||0);
 console.log('   ',JSON.stringify(more),'ETH:',d('ETH:1h'),'UNI:',d('UNI:1h'));
 ok(more.rank===12&&more.uni&&d('ETH:1h')===0&&d('UNI:1h')>=3,'«10 ارز بعدی»: فقط ارزهای تازه گرفته شد (ETH: 0 درخواست، UNI: '+d('UNI:1h')+')');
 // انتخاب آزاد: بازه‌ی رتبه، نماد، واچ‌لیست، بیرون بردن
 const pk=await p.evaluate(async()=>{const a=rdParsePick('3-5').join(','),b=rdParsePick('۲ تا ۳').join(','),c=rdParsePick('eth, sol  PEPE').join(','),d=rdParsePick('12').join(',');
   rdRemove('APT');const r0=RD.rank.includes('APT');
   await rdScan('add',rdParsePick('APT LINK'));
   const fav=rdFavToggle('UNI');RDV='sig';VIEW.mktFav=true;renderRadar();
   const rows=[...document.querySelectorAll('#rdView .rdit')].map(x=>x.dataset.rd),wt=(document.querySelector('#rdView .rdwait')||{}).textContent||'',
     pick=(document.querySelector('#rdView .rdpick')||{}).textContent||'';VIEW.mktFav=false;renderRadar();
   return {a,b,c,d,r0,apt:RD.list.includes('APT')&&RD.rank.includes('APT'),fav,rows,wt,pick,list:RD.list.length};});
 console.log('   ',JSON.stringify(pk).slice(0,500));
 ok(pk.a==='SOL,XRP,ADA'&&pk.b==='ETH,SOL'&&pk.c==='ETH,SOL,PEPE'&&pk.d==='APT','«3-5»، «۲ تا ۳»، نمادها و یک رتبه ← '+pk.a+' | '+pk.b+' | '+pk.c+' | '+pk.d);
 ok(!pk.r0&&pk.apt&&pk.list===12,'بیرون بردن APT و برگرداندنش با نماد');
 ok(pk.fav&&pk.rows.every(t=>t==='UNI')&&(pk.rows.length===1||/UNI/.test(pk.wt))&&/واچ‌لیست/.test(pk.pick),'واچ‌لیست: ستاره و «فقط واچ‌لیست»');
 const R1=Object.assign({},REQ);
 const stb=await p.evaluate(async()=>{RB.items=[];const st=await idbGet('rdc:ETH');st.at-=10*60000;await idbSet('rdc:ETH',st);
   const snap=()=>({mt0:RD.mt0,cal:JSON.stringify(RD.calib),sc:RD.rank.map(t=>t+':'+RD.coins[t].sc+':'+RD.coins[t].dir+':'+RD.coins[t].since).join(',')});
   const a=snap();await rdScan('refresh');const b=snap();
   RDV='model';renderRadar();const hint=(document.querySelector('#rdView .rdtime')||{}).textContent||'',lb=document.querySelector('#rdView .rdlearnw [data-rdlearn]');
   const btn=!!lb&&lb.classList.contains('btn')&&!lb.disabled&&/یادگیری دوباره/.test(lb.textContent);RDV='sig';renderRadar();
   await rdScan('learn');const c=snap();
   // وسط یک بررسی: «تازه کن» چرخنده و درصد دارد؛ «کارنامه» نوار پیشرفت دارد؛ «یادگیری دوباره» خاموش نیست و در صف می‌رود
   st.at-=10*60000;await idbSet('rdc:ETH',st);
   const run=rdScan('refresh');await new Promise(r=>setTimeout(r,20));const rb=document.querySelector('#rdView [data-rdrun]'),busy=!!rb&&rb.classList.contains('is-busy')&&!!rb.querySelector('.bspin')&&!!rb.querySelector('[data-rdpct]');
   RDV='model';renderRadar();const prog=!!document.querySelector('#rdView #rdProgBox'),l2=document.querySelector('#rdView [data-rdlearn]'),en=!!l2&&!l2.disabled;
   l2.click();const l3=document.querySelector('#rdView [data-rdlearn]'),q=RDQ.next==='learn'&&/در صف/.test(l3.textContent)&&l3.classList.contains('is-busy');
   await run;await new Promise(r=>{const t0=Date.now(),iv=setInterval(()=>{if((!RDQ.on&&RD.mt0>c.mt0)||Date.now()-t0>60000){clearInterval(iv);r();}},100);});
   const d=snap();RDV='sig';renderRadar();
   return {same:a.mt0===b.mt0&&a.cal===b.cal&&a.sc===b.sc,learn:c.mt0>a.mt0,hint,btn,busy,prog,en,q,queued:d.mt0>c.mt0};});
 ok(stb.same,'«تازه کن» در همان ساعت: مدل، ستاره‌ها و امتیازها همان می‌مانند');
 ok(stb.learn&&stb.btn&&/امتیازها برای کندلِ بسته‌شده‌ی ساعت/.test(stb.hint),'«یادگیری دوباره» دکمه است و مدل را از نو می‌سازد؛ توضیح زمان امتیاز');
 ok(stb.busy&&stb.prog,'وسط بررسی: «تازه کن» چرخنده و درصد دارد؛ «کارنامه» هم نوار پیشرفت');
 ok(stb.en&&stb.q&&stb.queued,'«یادگیری دوباره» وسط بررسی خاموش نیست: در صف می‌رود و بعدش خودش اجرا می‌شود');
 const d1=k=>(REQ[k]||0)-(R1[k]||0);
 ok(d1('ETH:1h')===2,'تازه کردن: فقط کندل‌های تازه (ETH: '+d1('ETH:1h')+' درخواست در دو بار تازه کردن)');
 const lg=await p.evaluate(()=>{RDV='log';renderRadar();const G=document.getElementById('rdView');return G.textContent;});
 ok(/آزمون واقعیِ آینده/.test(lg)&&/باز \(/.test(lg),'زیرتب «دفتر پیشنهادها»');
 const mk=await p.evaluate(()=>{RDV='sig';MKT={at:Date.now(),n:650,up:93,down:545,flat:12,med:-5.8,btc:-3.2,bins:[50,80,90,60,50,20,10,5,3,2,1],reg:'bear2',src:'Binance',top:[]};renderRadar();
   const d=document.querySelector('#rdView .mkwhy');return d?d.textContent:'';});
 ok(/650 ارزِ بازار اسپات Binance/.test(mk)&&/545 بیش از 0.3٪ ریخته‌اند/.test(mk)&&/خیلی نزولی/.test(mk),'«حال بازار»: توضیح عددها');
 await p.screenshot({path:'/tmp/signaldesk-tests/logs/radar.png',fullPage:true});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
