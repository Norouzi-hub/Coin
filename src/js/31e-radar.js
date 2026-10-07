/* ==================== رادار بازار: ۲۰ تا ۱۰۰ ارز اول، لانگ یا شورت، با امتیاز، رتبه و کارنامه ====================
   ۱۲ عامل برای هر ارز (بی استیبل‌کوین و توکن‌های بسته‌بندی‌شده):
   - قیمت (کندل یک‌ساعته‌ی ~41 روز): روند 4 و 1 ساعته (EMA20/50)، MACD، RSI، شکست 7 روزه، حجم نسبی،
     روند بیت‌کوین، فاصله از میانگین
   - جریان پول (فیوچرز بایننس، 1 ساعته، ~20 روز؛ همان داده‌ی جدول‌های کوین‌گلس): نهنگ‌ها در برابر مردم
     (نسبت پوزیشن تریدرهای بزرگ ÷ نسبت حساب‌های همه)، ازدحام مردم (برعکس)، خرید/فروش تهاجمی، Open Interest همراه قیمت
   وزن‌ها دستی نیستند: روی 60٪ اولِ دوره یاد گرفته می‌شوند (شیب هر عامل نسبت به حرکت 12 ساعت بعد، با
   کوچک‌سازی برای نمونه‌ی کم) و کارنامه فقط روی 40٪ آخر سنجیده می‌شود (بیرون از یادگیری).
   نقشه‌ی هر معامله: استاپ 1.5×ATR، هدف تارگت اول تنظیمات، ریسک‌فری بعد از +1R، حداکثر 24 ساعت، بعد از کارمزد.
   کارنامه به تفکیک جهت، شدت امتیاز و حال بازار (بیت‌کوین 24 ساعت قبل) ← ستاره و «کار امروز». */
const RD_KEY='signaldesk.radar.v2', RD_TH=30;
const RD_W0={t4:20,t1:15,macd:15,rsi:10,brk:10,vol:10,btc:15,ext:5,whale:0,crowd:0,taker:0,oi:0};
const RD_FLOW=['whale','crowd','taker','oi'];
const RD_FA={t4:'روند 4 ساعته',t1:'روند 1 ساعته',macd:'MACD',rsi:'RSI',brk:'شکست 7 روزه',vol:'حجم',btc:'بیت‌کوین',ext:'فاصله از میانگین',
  whale:'نهنگ‌ها در برابر مردم',crowd:'ازدحام مردم',taker:'خرید/فروش تهاجمی',oi:'Open Interest'};
const RD_SKIP=/^(USDT|USDC|FDUSD|TUSD|DAI|BUSD|USDP|USDD|USDE|SUSDE|USDS|PYUSD|USD0|USD1|RLUSD|EURC|EURT|PAXG|XAUT|WBTC|WETH|WBETH|STETH|WSTETH|WEETH|CBBTC|BTCB|RETH|METH|LEO|BSC-USD|BFUSD|USDF)$/;
let RD=(()=>{const a=lsGet(RD_KEY);return a&&a.v===2?a:{v:2,at:0,n:20,coins:{},calib:{},W:null,wn:0,fund:{},rank:[],reg:null};})();
const RDQ={on:false,done:0,n:0};
const rdW=()=>RD.W||RD_W0;

/* ---- اندیکاتورها (آرایه‌ای، یک بار برای همه‌ی کندل‌ها) ---- */
function emaArr(a,n){const k=2/(n+1),o=new Array(a.length);let e=a[0];for(let i=0;i<a.length;i++){e=i?a[i]*k+e*(1-k):a[0];o[i]=e;}return o;}
function rsiArr(c,n){const o=new Array(c.length).fill(50);let g=0,l=0;
  for(let i=1;i<c.length;i++){const d=c[i]-c[i-1],up=Math.max(d,0),dn=Math.max(-d,0);
    if(i<=n){g+=up/n;l+=dn/n;}else{g=(g*(n-1)+up)/n;l=(l*(n-1)+dn)/n;}
    if(i>=n)o[i]=l===0?100:100-100/(1+g/l);}
  return o;}
const clamp1=v=>Math.max(-1,Math.min(1,v));
/* حال بازار در هر لحظه: تغییر 24 ساعته‌ی بیت‌کوین (نزولی ≤ −2٪، صعودی ≥ +2٪) */
function rdRegMap(B){if(!B||!B.length)return null;const m=new Map(B.map(k=>[k.t,k.c]));
  return t=>{const a=m.get(t-24*36e5),b=m.get(t);return a&&b?regOfBtc((b/a-1)*100):null;};}
/* همه‌ی سری‌های لازم؛ 4 ساعته فقط از کندل‌های کاملِ گذشته؛ جریان پول با یک ساعت تأخیر (بی نگاه به آینده) */
function rdPrep(C,B,FL){
  const H=36e5,c=C.map(k=>k.c),v=C.map(k=>k.v||0);
  const e20=emaArr(c,20),e50=emaArr(c,50),m12=emaArr(c,12),m26=emaArr(c,26);
  const macd=c.map((_,i)=>m12[i]-m26[i]),sig=emaArr(macd,9),hist=macd.map((x,i)=>x-sig[i]),rsi=rsiArr(c,14);
  const F=swAggr(C,4*H),f=F.map(k=>k.c),f20=emaArr(f,20),f50=emaArr(f,50),fIdx=new Map(F.map((k,j)=>[k.t,j]));
  let bt=null;
  if(B&&B.length>250&&B!==C){const BF=swAggr(B,4*H),bf=BF.map(k=>k.c),b20=emaArr(bf,20),b50=emaArr(bf,50);
    bt=new Map(BF.map((k,j)=>[k.t,j>=50?clamp1((b20[j]-b50[j])/b50[j]/0.01):null]));}
  return {C,c,v,e20,e50,hist,rsi,F,f20,f50,fIdx,bt,FL:FL||null,reg:rdRegMap(B||C)};
}
/* عامل‌ها در کندل i (بسته‌شده): هر کدام −1..+1، یا null اگر داده نیست */
function rdParts(P,i){
  const {C,c,v,e20,e50,hist,rsi,f20,f50,fIdx,bt,FL}=P, H=36e5;
  if(i<200)return null;
  const j=fIdx.get(Math.floor((C[i].t+H)/(4*H))*4*H-4*H);
  if(j==null||j<50)return null;
  const atr=asAtr(C,i);if(!atr)return null;
  const p={};
  p.t4=clamp1((f20[j]-f50[j])/f50[j]/0.01);
  p.t1=(Math.sign(c[i]-e50[i])+Math.sign(e20[i]-e50[i]))/2;
  p.macd=0.6*Math.sign(hist[i])+0.4*Math.sign(hist[i]-hist[i-1]);
  const r=rsi[i];p.rsi=r>75?-0.5:r<25?0.5:clamp1((r-50)/20);
  let lo=Infinity,hi=-Infinity;for(let q=i-168;q<i;q++){if(C[q].l<lo)lo=C[q].l;if(C[q].h>hi)hi=C[q].h;}
  p.brk=c[i]>hi?1:c[i]<lo?-1:0;
  let a=0;for(let q=i-26;q<i-2;q++)a+=v[q];a/=24;const rv=a>0?(v[i]+v[i-1]+v[i-2])/3/a:1;
  p.vol=Math.sign(c[i]-c[i-3])*(rv>=1.5?1:Math.max(0,(rv-1)/0.5));
  p.btc=bt?(bt.get(Math.floor((C[i].t+H)/(4*H))*4*H-4*H)??0):0;
  const ex=(c[i]-e20[i])/atr;p.ext=Math.abs(ex)>3?-Math.sign(ex):0;
  const m={rsi:r,rv,atrPct:atr/c[i]*100};
  // جریان پول: مقدارِ ساعتِ همان کندل (منتشرشده تا بسته شدنش)
  const t=C[i].t;
  for(const k of RD_FLOW)p[k]=null;
  if(FL){
    const wr=FL.top&&FL.top.get(t), rr=FL.glob&&FL.glob.get(t);
    if(wr>0&&rr>0){p.whale=clamp1((Math.log(wr)-Math.log(rr))/0.4);m.wl=wr/(1+wr)*100;}
    if(rr>0){const sh=rr/(1+rr);p.crowd=sh>0.7?-clamp1((sh-0.7)/0.1):sh<0.4?clamp1((0.4-sh)/0.1):0;m.rl=sh*100;}
    if(FL.taker){const xs=[t,t-H,t-2*H].map(q=>FL.taker.get(q)).filter(x=>x>0);
      if(xs.length){const av=xs.reduce((s,x)=>s+x,0)/xs.length;p.taker=clamp1(Math.log(av)/0.15);m.tb=av/(1+av)*100;}}
    if(FL.oi){const o1=FL.oi.get(t),o0=FL.oi.get(t-6*H);
      if(o1>0&&o0>0&&i>=6){const doi=(o1/o0-1)*100,dp=(c[i]/c[i-6]-1)*100;
        p.oi=Math.sign(dp)*(doi>0?1:-0.5)*Math.min(1,Math.abs(doi)/2);m.doi=doi;m.dp=dp;}}
  }
  return {p,m};
}
const rdNet=(p,W)=>{let s=0;for(const k in W)if(p[k]!=null)s+=W[k]*p[k];return Math.round(s);};
function rdScore(P,i,W){const r=rdParts(P,i);if(!r)return null;return Object.assign({net:rdNet(r.p,W||rdW()),parts:r.p},r.m);}
const rdDir=net=>net>=RD_TH?'long':net<=-RD_TH?'short':'wait';
const rdBucket=a=>a>=60?'60+':a>=45?'45-60':'30-45';
/* معامله با ریسک‌فری: بعد از +1R استاپ به ورود (از کندل بعد) */
function rdWalk(C,i,pl){
  const sign=pl.dir==='long'?1:-1, cost=(2*(+S.fee||0)+(+S.slip||0))/100/pl.sd, R1=pl.E*(1+sign*pl.sd);
  let be=false;
  for(let j=i+1;j<C.length&&j<=i+AS_HOLD;j++){
    const k=C[j], stop=be?pl.E:pl.SL;
    if(sign>0?k.l<=stop:k.h>=stop)return {R:(be?0:-1)-cost,how:be?'be':'sl'};
    if(sign>0?k.h>=pl.TP:k.l<=pl.TP)return {R:pl.rr-cost,how:'tp'};
    if(!be&&(sign>0?k.h>=R1:k.l<=R1))be=true;
  }
  const end=Math.min(C.length-1,i+AS_HOLD);if(end<i+AS_HOLD)return null;
  return {R:(C[end].c-pl.E)*sign/(pl.E*pl.sd)-cost,how:'time'};
}
/* یادگیری وزن‌ها (60٪ اول هر ارز): شیب هر عامل نسبت به حرکت 12 ساعت بعد (به ATR)، کوچک‌شده برای نمونه‌ی کم */
function rdLearn(Ps){
  const S0={};
  for(const P of Ps){const C=P.C, split=Math.floor(C.length*0.6);
    for(let i=210;i<split&&i<C.length-13;i+=2){
      const r=rdParts(P,i);if(!r)continue;const atr=asAtr(C,i);if(!atr)continue;
      const fr=Math.max(-4,Math.min(4,(P.c[i+12]-P.c[i])/atr));
      for(const k in r.p){const x=r.p[k];if(x==null||x===0)continue;const o=S0[k]||(S0[k]={xy:0,xx:0,n:0});o.xy+=x*fr;o.xx+=x*x;o.n++;}
    }}
  const W={};let tot=0,n=0;
  for(const k of Object.keys(RD_W0)){const o=S0[k];if(!o||o.xx<=0){W[k]=0;continue;}
    W[k]=(o.xy/o.xx)*(o.n/(o.n+300));tot+=Math.abs(W[k]);n=Math.max(n,o.n);}
  if(tot<1e-6)return {W:RD_W0,n:0};
  for(const k in W)W[k]=+(W[k]/tot*100).toFixed(1);
  return {W,n};
}
/* کارنامه (40٪ آخر، بیرون از یادگیری): جهت × شدت × حال بازار */
function rdCalib(Ps,W,cal){
  const add=(k,R)=>{const o=cal[k]||(cal[k]={n:0,w:0,r:0});o.n++;o.r+=R;if(R>0)o.w++;};
  for(const P of Ps){const C=P.C, split=Math.floor(C.length*0.6);
    for(let i=Math.max(210,split);i<C.length-25;i+=2){
      const r=rdParts(P,i);if(!r)continue;const net=rdNet(r.p,W),d=rdDir(net);if(d==='wait')continue;
      const pl=asPlan(C,i,d);if(!pl)continue;const w=rdWalk(C,i,pl);if(!w)continue;
      const b=rdBucket(Math.abs(net)), g=P.reg&&P.reg(C[i].t);
      add(d+'|'+b,w.R);add(d,w.R);if(g){add(d+'|'+g+'|'+b,w.R);add(d+'|'+g,w.R);}
    }}
  return cal;
}
// سازگاری: سنجش ساده‌ی یک ارز با وزن فعلی (تست‌های قدیمی)
function rdBacktest(P,cal){
  const C=P.C,W=rdW();
  for(let i=210;i<C.length-25;i+=2){const s=rdScore(P,i,W);if(!s)continue;const d=rdDir(s.net);if(d==='wait')continue;
    const pl=asPlan(C,i,d);if(!pl)continue;const w=asWalk(C,i,pl);if(!w)continue;
    const k=d+'|'+rdBucket(Math.abs(s.net)),o=cal[k]||(cal[k]={n:0,w:0,r:0});o.n++;o.r+=w.R;if(w.R>0)o.w++;}
}
/* ستاره از میانگین R (حداقل 30 نمونه) */
function rdStars(o){if(!o||o.n<30)return 0;const a=o.r/o.n;return a<=0?1:a<0.1?2:a<0.2?3:a<0.35?4:5;}
const rdStarHtml=s=>s?'<span class="rdst s'+s+'" title="'+s+' از 5">'+'★'.repeat(s)+'<i>'+'☆'.repeat(5-s)+'</i></span>':'<span class="rdst s0">نمونه‌ی کم</span>';
const rdCell=o=>{if(!o||!o.n)return '<small>—</small>';const a=Math.round(o.r/o.n*100)/100||0;return rdStarHtml(rdStars(o))+'<small><b class="'+cls(a)+'" dir="ltr">'+(a?fmtR(a):'0.00R')+'</b></small><small>'+faN(Math.round(o.w/o.n*100))+'٪ برد</small><small class="n">'+faN(o.n)+' بار</small>';};

/* ---- فهرست ارزها: ارزش بازار (CoinGecko، روزی یک بار)، وگرنه حجم ---- */
const RDCAP_KEY='signaldesk.mcap.v1';
let RDCAP=lsGet(RDCAP_KEY)||null;
async function rdCapLoad(){
  if(RDCAP&&Date.now()-RDCAP.at<864e5)return RDCAP;
  try{const got=await fetchVia('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1',
      {json:true,timeout:12000,kind:'px',quiet:true,label:'ارزش بازار (CoinGecko)',validate:d=>Array.isArray(d)&&d.length>50});
    RDCAP={at:Date.now(),list:got.data.map(x=>String(x.symbol||'').toUpperCase())};lsSet(RDCAP_KEY,RDCAP);}catch(e){}
  return RDCAP;
}
function rdUniverse(n){
  const src=RDCAP&&RDCAP.list&&RDCAP.list.length?RDCAP.list:(MKT&&MKT.top)||['BTC','ETH','XRP','BNB','SOL','DOGE','TRX','ADA','LINK','AVAX','SUI','XLM','TON','HBAR','BCH','LTC','DOT','NEAR','APT','UNI'];
  const out=[];
  for(const t of src){if(!/^[A-Z0-9]{2,12}$/.test(t)||RD_SKIP.test(t)||MK_STABLE.test(t)||MK_LEV.test(t))continue;if(!out.includes(t))out.push(t);if(out.length>=n)break;}
  return out;
}
async function rdFundLoad(){
  try{const got=await fetchVia('https://fapi.binance.com/fapi/v1/premiumIndex',{json:true,timeout:10000,kind:'px',quiet:true,label:'فاندینگ',validate:d=>Array.isArray(d)&&d.length>20});
    const m={};for(const x of got.data)if(/USDT$/.test(x.symbol))m[x.symbol.slice(0,-4)]=+x.lastFundingRate*100;return m;}catch(e){return null;}
}
/* جریان پول از فیوچرز بایننس: 4 سری یک‌ساعته (~20 روز)، نیم ساعت در حافظه؛ ارز بی‌فیوچرز ← null */
const RDFL=new Map();
async function rdFlow(tk){
  const c=RDFL.get(tk);if(c&&Date.now()-c.at<30*60000)return c.fl;
  const H=36e5, base='https://fapi.binance.com/futures/data/', q='?symbol='+tk+'USDT&period=1h&limit=500';
  const get=async(path,f)=>{try{const got=await fetchVia(base+path+q,{json:true,timeout:12000,kind:'px',quiet:true,label:'جریان '+tk,validate:d=>Array.isArray(d)});
      const m=new Map();for(const x of got.data){const v=+x[f];if(v>0)m.set(Math.floor(+x.timestamp/H)*H,v);}return m.size?m:null;}catch(e){return null;}};
  const [top,glob,taker,oi]=await Promise.all([get('topLongShortPositionRatio','longShortRatio'),get('globalLongShortAccountRatio','longShortRatio'),
    get('takerlongshortRatio','buySellRatio'),get('openInterestHist','sumOpenInterestValue')]);
  const fl=top||glob||taker||oi?{top,glob,taker,oi}:null;
  RDFL.set(tk,{at:Date.now(),fl});
  return fl;
}
async function rdScan(force){
  if(RDQ.on)return;
  if(!force&&Date.now()-RD.at<30*60000&&RD.rank.length)return;
  await rdCapLoad();
  const U=rdUniverse(RD.n||20);
  Object.assign(RDQ,{on:true,done:0,n:U.length});rdPaintProg();
  let B=null;try{B=await mkCandles('BTC');}catch(e){}
  const fundP=rdFundLoad();
  const Ps={}, q=U.slice();
  const worker=async()=>{while(q.length){const tk=q.shift();
    try{const [C,FL]=await Promise.all([tk==='BTC'&&B?B:mkCandles(tk),rdFlow(tk)]);
      if(C&&C.length>300)Ps[tk]=rdPrep(C,B||C,FL);}
    catch(e){}
    RDQ.done++;rdPaintProg();}};
  await Promise.all([worker(),worker()]);
  const all=Object.values(Ps), L=rdLearn(all), cal=rdCalib(all,L.W,{});
  const coins={}, regNow=B?rdRegMap(B)(B[B.length-1].t):null;
  for(const [tk,P] of Object.entries(Ps)){
    const i=P.C.length-1, r=rdParts(P,i);if(!r)continue;
    const net=rdNet(r.p,L.W), d=rdDir(net);
    coins[tk]=Object.assign({net,dir:d,parts:r.p,px:P.c[i],flow:!!P.FL,
      pl:d==='wait'?null:asPlan(P.C,i,d,PRICES.get(tk)||P.c[i])},r.m);
  }
  const fund=await fundP;
  RD=Object.assign(RD,{v:2,at:Date.now(),coins,calib:cal,W:L.W,wn:L.n,fund:fund||RD.fund||{},rank:U.filter(t=>coins[t]),reg:regNow,
    nflow:Object.values(Ps).filter(P=>P.FL).length});
  lsSet(RD_KEY,RD);RDQ.on=false;
  if(view==='signals')renderSignals();
}
const rdPaintProg=()=>{const b=$('#rdProg');if(b)b.textContent=RDQ.on?'در حال بررسی '+faN(RDQ.done)+' از '+faN(RDQ.n)+' ارز…':(RD.at?ageTxt(RD.at):'');};
/* رتبه‌ی هر ارز: کارنامه‌ی همان جهت و شدت در همان حال بازار (اگر 30 نمونه دارد)، وگرنه بی‌حال بازار */
function rdRate(x){
  if(x.dir==='wait')return null;
  const b=rdBucket(Math.abs(x.net)), c1=RD.reg?RD.calib[x.dir+'|'+RD.reg+'|'+b]:null, c2=RD.calib[x.dir+'|'+b];
  const o=c1&&c1.n>=30?c1:c2;return o?{o,stars:rdStars(o),exp:o.n>=20?o.r/o.n:null,reg:o===c1}:null;
}
function rdList(){
  const out=[];
  for(const tk of RD.rank){const x=RD.coins[tk];if(!x)continue;
    const rt=rdRate(x), exp=rt?rt.exp:null;
    out.push(Object.assign({tk,rt,cb:rt&&rt.o,exp,stars:rt?rt.stars:0,ok:exp!=null&&exp>0.03&&(rt.stars>=3)},x));}
  out.sort((a,b)=>(b.ok-a.ok)||(b.stars-a.stars)||((b.exp??-9)-(a.exp??-9))||(Math.abs(b.net)-Math.abs(a.net)));
  return out;
}
const rdCount=()=>rdList().filter(x=>x.ok).length;
function rdReasons(x){
  const W=rdW(), want=x.dir==='short'?-1:1, it=[];
  for(const k of Object.keys(RD_W0)){const v=x.parts[k];if(v==null||Math.abs(v)<0.25||!W[k])continue;
    const eff=Math.sign(W[k]*v);           // اثر واقعی روی امتیاز (وزن منفی یعنی برعکس عمل کرده)
    let t=RD_FA[k];
    if(k==='t4'||k==='t1'||k==='btc')t+=v>0?' صعودی':' نزولی';
    else if(k==='macd')t+=v>0?' مثبت':' منفی';
    else if(k==='rsi')t+=' '+fmtNum(x.rsi)+(x.rsi>75?' (اشباع خرید)':x.rsi<25?' (اشباع فروش)':'');
    else if(k==='brk')t=v>0?'شکست سقف 7 روزه':'شکست کف 7 روزه';
    else if(k==='vol')t='حجم '+fmtNum(x.rv)+' برابر میانگین '+(v>0?'با رشد':'با ریزش');
    else if(k==='ext')t='خیلی دور از میانگین';
    else if(k==='whale')t=v>0?'نهنگ‌ها لانگ‌تر از مردم':'نهنگ‌ها شورت‌تر از مردم';
    else if(k==='crowd')t=v>0?'مردم بیشتر شورت‌اند':'مردم بیش از حد لانگ‌اند';
    else if(k==='taker')t=v>0?'خرید تهاجمی غالب':'فروش تهاجمی غالب';
    else if(k==='oi')t='OI '+fmtPct(x.doi)+' با قیمت '+fmtPct(x.dp);
    it.push({t,good:x.dir==='wait'?null:eff===want,w:Math.round(Math.abs(W[k]*v))});
  }
  return it.sort((a,b)=>b.w-a.w).slice(0,8);
}
const RDREG_FA={bull:'صعودی',flat:'خنثی',bear:'نزولی'};
/* پنل «کارنامه و کار امروز»: لانگ و شورت در هر شدت امتیاز، در کل و در حال بازار امروز */
function rdPanelHtml(){
  const cal=RD.calib||{}, reg=RD.reg, B=['30-45','45-60','60+'];
  if(!Object.keys(cal).length)return '';
  let h='<div class="rdpan"><div class="mkh"><b>'+ic('bars')+'کارنامه‌ی سیگنال‌ها</b><small>40٪ آخرِ دوره، بیرون از یادگیری</small></div>';
  const tbl=(title,pre)=>'<div class="sechd">'+title+'</div><table class="rdtab"><thead><tr><th></th><th>همه</th>'+B.map(b=>'<th dir="ltr">'+b+'</th>').join('')+'</tr></thead><tbody>'+
    ['long','short'].map(d=>'<tr><td><span class="pill '+d+'">'+(d==='long'?'لانگ':'شورت')+'</span></td><td>'+rdCell(cal[d+pre])+'</td>'+B.map(b=>'<td>'+rdCell(cal[d+pre+'|'+b])+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+
    '<div class="hint rdcap">ستون‌ها: شدت امتیاز. هر خانه: ستاره، میانگین R بعد از کارمزد، درصد برد، تعداد.</div>';
  if(reg)h+=tbl('در بازار '+RDREG_FA[reg]+' (مثل الان'+(MKT&&MKT.btc!=null?': بیت‌کوین '+fmtPct(MKT.btc)+' در 24 ساعت':'')+')','|'+reg);
  h+=tbl('در همه‌ی حال‌های بازار','');
  // کار امروز: بهترین دسته‌ی جهت×شدت در حال بازار امروز
  const cand=[];
  for(const d of ['long','short'])for(const b of B){const o=reg?cal[d+'|'+reg+'|'+b]:null, p=o&&o.n>=30?o:cal[d+'|'+b];
    if(p&&p.n>=30)cand.push({d,b,o:p,a:p.r/p.n,reg:p===o});}
  cand.sort((x,y)=>y.a-x.a);
  const good=cand.filter(x=>x.a>0.1), bad=['long','short'].filter(d=>{const o=reg?cal[d+'|'+reg]:cal[d];return o&&o.n>=30&&o.r/o.n<=0;});
  const nm=x=>'<b>'+(x.d==='long'?'لانگ':'شورت')+'‌های امتیاز <bdi dir="ltr">'+x.b+'</bdi></b> ('+faN(rdStars(x.o))+' ستاره، '+faN(Math.round(x.o.w/x.o.n*100))+'٪ برد، <bdi dir="ltr">'+fmtR(x.a)+'</bdi>)';
  h+='<div class="flag '+(good.length?'u':'w')+' rdtodo"><i>'+(good.length?'✓':'!')+'</i><span><b>کار امروز:</b> '+
    (good.length?'فقط '+good.slice(0,2).map(nm).join(' و ')+'.':'هیچ دسته‌ای در این حال بازار سابقه‌ی خوب ندارد — صبر کن یا ریسک را خیلی کم کن.')+
    (bad.length?' '+bad.map(d=>(d==='long'?'لانگ':'شورت')).join(' و ')+' در این حال بازار زیان داده؛ نگیر.':'')+'</span></div>';
  // وزن‌های یادگرفته
  const W=rdW(), ks=Object.keys(RD_W0).filter(k=>W[k]).sort((a,b)=>Math.abs(W[b])-Math.abs(W[a]));
  h+='<details class="sec sub2"><summary>وزن عامل‌ها (یادگرفته از 60٪ اول، '+faN(RD.wn||0)+' نمونه)</summary><div class="rdwts">'+
    ks.map(k=>'<span class="pill '+(W[k]>0?'mut':'lose')+'">'+esc(RD_FA[k])+' '+(W[k]>0?'':'(برعکس) ')+faN(Math.abs(Math.round(W[k])))+'</span>').join('')+
    (Object.keys(RD_W0).filter(k=>!W[k]).length?'<div class="hint">بی‌اثر یا بی‌داده: '+Object.keys(RD_W0).filter(k=>!W[k]).map(k=>esc(RD_FA[k])).join('، ')+'</div>':'')+'</div></details>';
  return h+'</div>';
}
function rdHtml(){
  const L=rdList(), act=L.filter(x=>x.dir!=='wait'), wait=L.filter(x=>x.dir==='wait');
  let h='<div class="glh"><b>'+ic('trend')+'رادار بازار</b><span>'+(L.length?faN(L.filter(x=>x.ok).length)+' فرصت با رتبه‌ی خوب از '+faN(L.length)+' ارز':'')+'</span></div><div class="glb">';
  h+='<div class="rdbar"><div class="pbpick rdn">'+[20,50,100].map(n=>'<button class="pbc'+((RD.n||20)===n?' on':'')+'" data-rdn="'+n+'">'+faN(n)+' ارز اول</button>').join('')+'</div>'+
    '<button class="btn sm" data-rdrun="1"'+(RDQ.on?' disabled':'')+'>'+ic('refresh')+'<span>بررسی دوباره</span></button><small id="rdProg">'+(RDQ.on?'':RD.at?ageTxt(RD.at):'')+'</small></div>';
  if(!RD.at&&!RDQ.on)h+='<div class="hint">هنوز بررسی نشده؛ همین الان شروع می‌شود (بار اول چند دقیقه).</div>';
  if(MKT)h+=mktHtml(MKT,null);
  h+=rdPanelHtml();
  act.forEach((x,i)=>{
    const z=x.pl?isoSize(x.pl.E,x.pl.SL):null, f=RD.fund&&RD.fund[x.tk];
    const R=rdReasons(x);
    h+='<div class="glsig rdit'+(x.ok?'':' weak')+'" data-rd="'+esc(x.tk)+'"><div class="glit"><span class="rdrk">'+faN(i+1)+'</span><b dir="ltr">'+esc(x.tk)+'</b><span class="pill '+x.dir+'">'+(x.dir==='long'?'لانگ':'شورت')+'</span>'+
      '<span class="rdsc '+(x.net>0?'u':'d')+'">امتیاز '+faN(Math.abs(x.net))+'</span>'+rdStarHtml(x.stars)+'</div>'+
      (x.cb?'<div class="glnum glh2">سابقه‌ی '+(x.dir==='long'?'لانگ':'شورت')+'‌های امتیاز '+rdBucket(Math.abs(x.net))+(x.rt.reg?' در بازار '+RDREG_FA[RD.reg]:'')+': '+faN(x.cb.n)+' بار، '+faN(Math.round(x.cb.w/x.cb.n*100))+'٪ برد، میانگین <b class="'+cls(x.cb.r/x.cb.n)+'">'+fmtR(x.cb.r/x.cb.n)+'</b></div>':'')+
      (x.wl!=null||x.rl!=null||x.tb!=null?'<div class="glnum rdflow">'+[x.wl!=null?'نهنگ‌ها <b>'+faN(Math.round(x.wl))+'٪</b> لانگ':'',x.rl!=null?'مردم <b>'+faN(Math.round(x.rl))+'٪</b> لانگ':'',
        x.tb!=null?'خرید تهاجمی <b>'+faN(Math.round(x.tb))+'٪</b>':'',x.doi!=null?'OI <b class="'+cls(x.doi)+'">'+fmtPct(x.doi)+'</b> (6 ساعت)':''].filter(Boolean).join(' · ')+'</div>':'')+
      '<div class="glnum rdwhy">'+R.map(r=>'<span class="pill '+(r.good==null?'mut':r.good?'win':'lose')+'">'+(r.good?'✓ ':r.good===false?'✗ ':'')+esc(r.t)+'</span>').join('')+
        (f!=null&&Math.abs(f)>=0.03?'<span class="pill mut" title="فاندینگ فیوچرز؛ در امتیاز نیست">فاندینگ '+fmtNum(f)+'٪ '+(f>0?'(لانگ‌ها شلوغ)':'(شورت‌ها شلوغ)')+'</span>':'')+
        (!x.flow?'<span class="pill mut">بی داده‌ی فیوچرز بایننس</span>':'')+'</div>'+
      (x.pl?'<div class="glnum">ورود <b dir="ltr">'+fmtPrice(x.pl.E)+'</b> · استاپ <b dir="ltr">'+fmtPrice(x.pl.SL)+'</b> ('+fmtNum(x.pl.sd*100)+'٪) · هدف <b dir="ltr">'+fmtPrice(x.pl.TP)+'</b> · ریسک‌فری در +1R · حداکثر '+faN(AS_HOLD)+' ساعت</div>':'')+
      '<div class="glact">'+(z?'<button class="btn sm ok" data-a="iso">'+ic('shield')+'<span>ایزوله '+faN(z.lev)+'x · '+fmtUsd(z.margin)+'</span></button>':'')+
        '<button class="btn sm side" data-a="copy" title="برای اپ صرافی">'+ic('share')+'</button></div></div>';
  });
  if(wait.length)h+='<div class="hint rdwait"><b>صبر</b> (امتیاز بین −'+faN(RD_TH)+' و +'+faN(RD_TH)+'): '+wait.map(x=>esc(x.tk)+' <span class="'+cls(x.net)+'" dir="ltr">'+(x.net>0?'+':'')+faN(x.net)+'</span>').join('، ')+'</div>';
  h+='<div class="hint">12 عامل: قیمت (روند 4 و 1 ساعته، MACD، RSI، شکست 7 روزه، حجم، بیت‌کوین، فاصله از میانگین) و جریان پول از فیوچرز بایننس (نهنگ‌ها در برابر مردم، ازدحام مردم، خرید/فروش تهاجمی، Open Interest'+
    (RD.nflow!=null?'؛ '+faN(RD.nflow)+' ارز داده‌اش را داشتند':'')+'). وزن‌ها روی 60٪ اول یاد گرفته و کارنامه روی 40٪ آخر سنجیده شده؛ ستاره‌ها از همان کارنامه. سود گذشته تضمین آینده نیست.</div></div>';
  return h;
}
function paintRadar(g){
  g.className='glance gltab';g.innerHTML=rdHtml();
  if(!RDQ.on&&(Date.now()-RD.at>30*60000||!RD.rank.length))setTimeout(()=>rdScan(),300);
  g.querySelectorAll('[data-rdn]').forEach(b=>b.onclick=()=>{RD.n=+b.dataset.rdn;lsSet(RD_KEY,RD);rdScan(true);paintRadar(g);});
  const r=g.querySelector('[data-rdrun]');if(r)r.onclick=()=>{rdScan(true);paintRadar(g);};
  g.querySelectorAll('.rdit').forEach(w=>{const x=rdList().find(y=>y.tk===w.dataset.rd);if(!x||!x.pl)return;
    const k={tk:x.tk,k:'radar',t:RD.at,pl:x.pl,dir:x.dir};
    w.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
      const p={id:'radar/'+x.tk+'/'+RD.at,num:0,text:'رادار بازار: '+x.tk+' '+(x.dir==='long'?'لانگ':'شورت')+' · امتیاز '+Math.abs(x.net),date:new Date(),link:null,img:null,auto:true};
      if(b.dataset.a==='iso'){const z=isoSize(x.pl.E,x.pl.SL);
        sheetEnter(p,asSig(k),{stop:x.pl.SL,lev:z?z.lev:null,amt:z?z.margin:null,market:'futures'},PRICES.get(x.tk)||x.pl.E,
          {iso:true,note:'رادار بازار · امتیاز '+Math.abs(x.net)+(x.stars?' · '+x.stars+'★':''),until:Date.now()+AS_HOLD*36e5});}
      else copyExch(p,asSig(k),{stop:x.pl.SL,market:'futures'},PRICES.get(x.tk)||x.pl.E);});});
}
