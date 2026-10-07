/* رادار بازار v3: عامل‌ها، مدل لجستیک، کارنامه‌ی صادق، بارگذاری ده‌تایی، معامله‌ی آزمایشی و دفتر پیشنهادها */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 // کندل ساختگیِ پیوسته (تابع زمان، پس صفحه‌ها با هم جورند) برای هر نماد؛ شمارش درخواست‌ها
 const REQ={},PXN={};
 await ctx.route(/klines\?symbol=/,r=>{const u=r.request().url(),m=u.match(/symbol=([A-Z0-9]+)USDT&interval=(\w+)&startTime=(\d+)&limit=(\d+)/);
   if(!m)return r.fallback();const [,s,iv,st,lim]=m,ms={'1h':36e5,'5m':3e5}[iv];if(!ms||s==='GRAM')return r.fallback();
   REQ[s+':'+iv]=(REQ[s+':'+iv]||0)+1;
   const sd=[...s].reduce((a,c)=>a+c.charCodeAt(0),0)%17, H=36e5, base={BTC:60000,ETH:3000}[s]||10+sd;
   const P=PXN[s+':'+iv];
   const px=t=>P?P(t):base*(1+0.06*Math.sin(t/H/41+sd)+0.03*Math.sin(t/H/13+2*sd)+0.012*Math.sin(t/H/3.1+sd)+0.004*Math.sin(t/H*1.7));
   const out=[],now=Date.now();
   for(let t=+st;t<now&&out.length<+lim;t+=ms){const o=px(t),c=px(t+ms),w=Math.abs(c-o)*0.6+o*0.0015;out.push([t,String(o),String(Math.max(o,c)+w),String(Math.min(o,c)-w),String(c),String(1000+400*Math.sin(t/H/5+sd)),t+ms-1]);}
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(out)});});
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
   const S1=rdSamples(P,'UP');
   return {p:r.p,rsv:r.m.rsv,same:JSON.stringify(v1)===JSON.stringify(v2),n:S1.t.length,F:S1.F,xl:S1.X.length,
     longWin:S1.R.long.filter(x=>x>0).length/S1.t.length, shortWin:S1.R.short.filter(x=>x>0).length/S1.t.length,exitOk:S1.J.long.every((j,q)=>j>S1.t[q])};});
 console.log('   ',JSON.stringify(e).slice(0,400));
 ok(e.p.t4>0&&e.p.rs>0&&e.p.d50>0&&e.p.volc!=null,'روند صعودی قوی‌تر از بیت‌کوین ← روند 4ساعته، قدرت نسبی و روند روزانه مثبت');
 ok(e.same,'عامل‌های هر کندل فقط از گذشته (بی نگاه به آینده)');
 ok(e.n>500&&e.xl===e.n*e.F&&e.exitOk,'نمونه‌ها: هر 2 ساعت، 17 عامل، خروج بعد از ورود ('+e.n+')');
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
   RD={v:3,at:now,n:10,reg:null,fund:{RDA:0.06,RDB:0.01},rank:['RDA','RDB','RDC','RDD'],M:{long:{w,q:[]},short:{w:w.map(x=>-x),q:[]}},
     calib:{'long|95+':c(120,72,30,40,0.12),'long|85-95':c(200,96,30,50,0.04),'short|70-85':c(90,36,-9,30,-0.3)},
     coins:{RDA:{sc:88,dir:'long',best:'long',p:0.46,flow:true,parts,rsi:62,rv:1.3,rsv:4,px:10,pl:pl(10,'long')},
            RDB:{sc:97,dir:'long',best:'long',p:0.52,flow:true,parts,rsi:66,rv:1.9,rsv:6,px:11,pl:pl(11,'long')},
            RDC:{sc:75,dir:'short',best:'short',p:0.4,parts:{t4:-1,t1:-1,macd:-1,rsi:-0.3,brk:-1,vol:0,btc:1,ext:0,rs:-0.5},rsi:44,rv:1,rsv:-5,px:12,pl:pl(12,'short')},
            RDD:{sc:55,dir:'wait',best:'long',parts,rsi:51,rv:1,px:13,pl:null}}};
   RDV='sig';const L=rdList();bucket='live';sigFilter='mkt';go('signals',true);renderAll();
   const G=document.getElementById('glance'), it=[...G.querySelectorAll('.rdit')];
   return {order:L.map(x=>x.tk+':'+(x.ok?1:0)).join(','),segs:[...document.querySelectorAll('#fbar .fseg .fb span')].map(x=>x.textContent).join(','),
     n:[...document.querySelectorAll('#fbar .fseg .fb')][1].querySelector('i').textContent,
     items:it.map(x=>x.querySelector('.glit').textContent),first:it[0]&&it[0].textContent,wait:(G.querySelector('.rdwait')||{}).textContent||'',cards:document.querySelectorAll('#list .card').length,
     weak:it.filter(x=>x.classList.contains('weak')).length,more:!!G.querySelector('[data-rdmore]'),cnt:(G.querySelector('.rdcnt')||{}).textContent,
     tabs:[...G.querySelectorAll('[data-rdv]')].map(x=>x.textContent).join(',')};});
 console.log('   ',JSON.stringify(Object.assign({},t,{first:t.first&&t.first.slice(0,260)})));
 ok(t.segs==='الان چه کنم؟,بازار,در انتظار,همه','تب «بازار» کنار «الان چه کنم؟»: '+t.segs);
 ok(t.order==='RDB:1,RDA:1,RDC:0,RDD:0','اولویت: RDB (4★) بعد RDA (3★)، شورت RDC (1★) و صبر آخر — '+t.order);
 ok(t.n==='2'&&t.weak===1,'عدد تب = فرصت‌های با رتبه‌ی خوب (۲)؛ شورت RDC کم‌رنگ');
 ok(/^1RDBلانگامتیاز 97/.test(t.items[0])&&/120 بار در 40 روز/.test(t.first)&&/★★★★☆/.test(t.first)&&/✓ روند 4 ساعته صعودی/.test(t.first)&&/احتمال سود به گفته‌ی مدل: 52٪/.test(t.first)&&/بدترین حالت محتمل/.test(t.first),'ردیف اول: رتبه، امتیاز، ستاره، سابقه با روزها، احتمال، دلیل‌ها');
 ok(/صبر/.test(t.wait)&&/RDD/.test(t.wait)&&t.cards===0,'«صبر» جدا؛ کارت پستی در این تب نیست');
 ok(t.more&&/ارز 1 تا 4 از 100/.test(t.cnt)&&t.tabs==='سیگنال‌ها,آزمایشی,دفتر پیشنهادها','دکمه‌ی «10 ارز بعدی» و سه زیرتب');
 await p.evaluate(()=>document.querySelector('#glance .rdit[data-rd="RDB"] [data-a="iso"]').click());await p.waitForTimeout(600);
 ok(await p.evaluate(()=>/RDB/.test(document.querySelector('#sheet').textContent)&&+document.querySelector('#f_e').value===11),'«ایزوله» فرم ورود RDB را باز کرد');
 await p.evaluate(()=>closeSheet());await p.waitForTimeout(400);
 const u=await p.evaluate(()=>{RDCAP={at:Date.now(),list:['BTC','USDT','ETH','USDC','STETH','XRP','WBTC','SOL','BNB','FDUSD','DOGE']};return rdUniverse(5).join(',');});
 ok(u==='BTC,ETH,XRP,SOL,BNB','فهرست ارزها بی استیبل و توکن‌های بسته‌بندی‌شده: '+u);

 console.log('=== معامله‌ی آزمایشی ===');
 const T30=Date.now()-30*36e5;PXN['XRP:5m']=t=>t<T30+5*36e5?2:1.9;
 const bk=await p.evaluate(async(t0)=>{RB.items=[];
   document.querySelector('#glance .rdit[data-rd="RDB"] [data-a="test"]').click();
   const it=RB.items[0], tab=[...document.querySelectorAll('#glance [data-rdv]')].map(x=>x.textContent).join(',');
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
   RDV='test';paintGlance();const G=document.getElementById('glance');
   return {r1,i2:{st:i2.st,R:i2.R},i3:{st:i3.st,R:i3.R,xt:i3.xt-t0},dup,tab,txt:G.textContent,rows:G.querySelectorAll('.rbrow').length};},T30);
 console.log('   ',JSON.stringify(Object.assign({},bk,{txt:bk.txt.slice(0,300)})));
 ok(bk.tab.includes('آزمایشی (1 باز)')&&bk.dup===null,'«تست» ثبت شد (زیرتب: آزمایشی (1 باز))؛ تکراری ثبت نمی‌شود');
 ok(bk.r1.be&&bk.r1.st==='be'&&bk.r1.R<0&&bk.r1.R>-0.3,'ریسک‌فری بعد از +1R و بسته شدن در ورود ← '+bk.r1.R+'R');
 ok(bk.i2.st==='tp'&&bk.i2.R>1.3,'به هدف رسید ← +'+bk.i2.R+'R');
 ok(bk.i3.st==='sl'&&bk.i3.R<-1&&bk.i3.xt>5*36e5&&bk.i3.xt<6*36e5,'برنامه بسته بود: از کندل 5 دقیقه‌ای استاپ خورده پیدا شد ('+bk.i3.R+'R)');
 ok(bk.rows===3&&/نتیجه3 بسته/.test(bk.txt)&&/پولی در کار نیست/.test(bk.txt),'زیرتب آزمایشی: جمع‌بندی و 3 ردیف');

 console.log('=== بررسی کامل: ده‌تا‌ده‌تا، IndexedDB، دفتر پیشنهادها ===');
 const full=await p.evaluate(async()=>{RB.items=[];RD=rdEmpty();RDS.clear();RDV='sig';
   RDCAP={at:Date.now(),list:['BTC','ETH','SOL','XRP','ADA','DOGE','DOT','LINK','AVAX','NEAR','UNI','APT']};
   bucket='live';sigFilter='mkt';renderAll();
   const t0=performance.now(),pr=rdScan('refresh');const seen=[];
   for(let i=0;i<40&&RDQ.on;i++){await new Promise(r=>setTimeout(r,100));const b=document.getElementById('rdProgBox');if(b)seen.push(b.textContent);}
   await pr;const ms=Math.round(performance.now()-t0);renderAll();
   const st=await idbGet('rdc:ETH'),fl=await idbGet('rdf:ETH');
   return {ms,n:RD.n,rank:RD.rank.length,nflow:RD.nflow,M:!!(RD.M&&RD.M.long&&RD.M.short),cal:Object.keys(RD.calib).length,rel:!!RD.rel,
     eth:RD.coins.ETH&&{wl:RD.coins.ETH.wl,flow:RD.coins.ETH.flow,sc:RD.coins.ETH.sc},sol:RD.coins.SOL&&RD.coins.SOL.flow,
     rows:st&&st.rows.length,flow:fl&&fl.top&&fl.top.length,pan:!!document.querySelector('#glance .rdpan'),
     auto:RB.items.filter(i=>i.k==='auto').length,sig:rdList().filter(x=>x.dir!=='wait').length,seen:seen.filter((x,i)=>i%5===0),gone:!document.getElementById('rdProgBox')};});
 console.log('   ',JSON.stringify(full),JSON.stringify(REQ));
 ok(full.seen.length>2&&full.seen.every(x=>/\d+٪/.test(x)&&/\d:\d\d/.test(x))&&full.seen.some(x=>/ارز \d+ از 10/.test(x))&&full.gone,'نوار پیشرفت: درصد، کار الان و تایمر؛ آخر کار برداشته شد');
 ok(full.n===10&&full.rank===10,'بار اول فقط 10 ارز اول ('+full.rank+')، در '+full.ms+'ms');
 ok(full.rows>=2990&&full.flow>=490,'تاریخچه در IndexedDB: '+full.rows+' کندل یک‌ساعته، '+full.flow+' ساعت جریان پول');
 ok(full.M&&full.cal>0&&full.rel&&full.pan,'مدل لانگ و شورت، کارنامه، صداقت مدل و پنل ساخته شد');
 ok(full.eth&&full.eth.flow&&full.eth.wl>50&&full.sol===false&&full.nflow===2,'ETH با داده‌ی نهنگ/مردم؛ SOL بی فیوچرز');
 ok(full.auto===full.sig,'همه‌ی پیشنهادهای 70+ در «دفتر پیشنهادها» ثبت شد ('+full.auto+')');
 const mk2=await p.evaluate(()=>{const r=mdMetrics(MD);RDV='sig';bucket='live';sigFilter='mkt';paintGlance();const G=document.getElementById('glance');
   const tiles=[...G.querySelectorAll('.mdt')].map(x=>x.textContent);sigFilter='now';paintGlance();const now=!!document.querySelector('#glance .mdbox');sigFilter='mkt';paintGlance();
   return {r,tiles,flags:[...G.querySelectorAll('.mdbox .flag')].map(x=>x.textContent),now,mf:RDMF.size,w:RD.M&&RD.M.long.w.length,last:RD.mk7&&{tot:RD.mk7.tot.slice(-1)[0],bd:RD.mk7.bd.slice(-1)[0],ud:RD.mk7.ud.slice(-1)[0],n:RD.mk7.tot.length},mkl:RD.mkl,
     mrow:[...RDMF.values()].slice(-1)[0]};});
 console.log('   ',JSON.stringify(mk2).slice(0,900));
 ok(mk2.r&&Math.abs(mk2.r.t3[0]-3.2e12*(1-0.575-0.121))<1e6&&mk2.r.bd[1]>0.3&&mk2.r.ud[1]>0.1&&mk2.r.t3[1]<mk2.r.tot[1],'TOTAL3 = بی BTC و ETH؛ دامیننس بیت‌کوین و تتر بالا رفت، آلت‌ها ضعیف‌تر');
 ok(mk2.tiles.length===6&&/TOTAL3/.test(mk2.tiles.join())&&/USDT\.D/.test(mk2.tiles.join())&&/\$3\.20T/.test(mk2.tiles[0])&&/57\.50%/.test(mk2.tiles[3])&&mk2.now,'شش کارت جدا: TOTAL، TOTAL2، TOTAL3، BTC.D، USDT.D، ETH.D (در «بازار» و «الان چه کنم؟»)');
 ok(mk2.flags.some(x=>/پول به تتر فرار/.test(x))&&mk2.flags.some(x=>/روز آلت‌کوین نیست/.test(x)),'خوانش: فرار به تتر و ضعف آلت‌ها');
 ok(mk2.mf>2000&&mk2.w===23&&mk2.last&&Math.abs(mk2.last.tot/3.2e12-1)<0.001&&Math.abs(mk2.last.bd-57.5)<0.01&&mk2.last.n>40&&mk2.mrow.length===5,'تاریخچه‌ی ساعتی کل بازار بازسازی شد ('+mk2.mf+' ساعت)، ساعت آخر = CoinGecko؛ 5 عامل بازار در مدل');
 const R0=Object.assign({},REQ);
 const more=await p.evaluate(async()=>{await rdScan('more');return {n:RD.n,rank:RD.rank.length,uni:RD.rank.includes('UNI')&&RD.rank.includes('APT')};});
 const d=k=>(REQ[k]||0)-(R0[k]||0);
 console.log('   ',JSON.stringify(more),'ETH:',d('ETH:1h'),'UNI:',d('UNI:1h'));
 ok(more.rank===12&&more.uni&&d('ETH:1h')===0&&d('UNI:1h')>=3,'«10 ارز بعدی»: فقط ارزهای تازه گرفته شد (ETH: 0 درخواست، UNI: '+d('UNI:1h')+')');
 const R1=Object.assign({},REQ);
 await p.evaluate(async()=>{RB.items=[];const st=await idbGet('rdc:ETH');st.at-=10*60000;await idbSet('rdc:ETH',st);await rdScan('refresh');});
 const d1=k=>(REQ[k]||0)-(R1[k]||0);
 ok(d1('ETH:1h')===1,'تازه کردن: فقط کندل‌های تازه (ETH: '+d1('ETH:1h')+' درخواست)');
 const lg=await p.evaluate(()=>{RDV='log';paintGlance();const G=document.getElementById('glance');return G.textContent;});
 ok(/آزمون واقعیِ آینده/.test(lg)&&/باز \(/.test(lg),'زیرتب «دفتر پیشنهادها»');
 const mk=await p.evaluate(()=>{RDV='sig';MKT={at:Date.now(),n:650,up:93,down:545,flat:12,med:-5.8,btc:-3.2,bins:[50,80,90,60,50,20,10,5,3,2,1],reg:'bear2',src:'Binance',top:[]};paintGlance();
   const d=document.querySelector('#glance .mkwhy');return d?d.textContent:'';});
 ok(/650 ارزِ بازار اسپات Binance/.test(mk)&&/545 بیش از 0.3٪ ریخته‌اند/.test(mk)&&/خیلی نزولی/.test(mk),'«حال بازار»: توضیح عددها');
 await p.screenshot({path:'/tmp/signaldesk-tests/logs/radar.png',fullPage:true});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
