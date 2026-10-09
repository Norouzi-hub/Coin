/* ==================== رادار بازار: ارزهای اول بازار، لانگ یا شورت، با احتمال و کارنامه‌ی صادق ====================
   داده (برای هر ارز، بی استیبل‌کوین و توکن‌های بسته‌بندی‌شده):
   - کندل یک‌ساعته‌ی ~125 روز (3000 کندل) در IndexedDB؛ بار اول کامل، بعد فقط کندل‌های تازه
   - جریان پول از فیوچرز بایننس (همان داده‌ی جدول‌های کوین‌گلس)؛ بایننس فقط ~20 روز اخیر را می‌دهد،
     پس هر بار که می‌گیریم روی گوشی جمع می‌شود تا تاریخچه‌اش کم‌کم بلند شود
   عامل‌ها: روند 4 و 1 ساعته، MACD، RSI (1 و 4 ساعته)، شکار نقدینگی (اسپرینگ وایکوف)، CPR روزانه، شکست 7 روزه، میانگین 200 و شیبش، ADX، بولینگر، VWAP، OBV، مومنتوم 14 روزه،
   بازده 24 ساعته، جای قیمت در سقف/کف 30 روزه، فاندینگ، حجم، روند بیت‌کوین، فاصله از میانگین، قدرت نسبی
   به بیت‌کوین (7 روز)، روند روزانه (EMA50)، فشردگی نوسان، نهنگ‌ها در برابر مردم، ازدحام مردم، خرید/فروش
   تهاجمی، OI همراه قیمت، حال بازار (صعودی/نزولی)، کل بازار: TOTAL، TOTAL2، TOTAL3، دامیننس بیت‌کوین و تتر، و پهنای بازار (RSI و MACD همه‌ی ارزها).
   مدل: رگرسیون لجستیک (با کوچک‌سازی L2)، جدا برای لانگ و شورت، مستقیم روی نتیجه‌ی همان معامله‌ای که
   پیشنهاد می‌شود (استاپ 1.5×ATR، هدف تارگت اول، ریسک‌فری بعد از +1R، حداکثر 24 ساعت، بعد از کارمزد):
   «آیا سود داد؟». همه‌ی عامل‌ها با هم سنجیده می‌شوند، پس عامل‌های هم‌معنی دوبار شمرده نمی‌شوند.
   امتیاز = صدک احتمال مدل در گذشته (امتیاز 90 = از 90٪ لحظه‌های گذشته امیدوارکننده‌تر)؛ سیگنال از 70 به بالا.
   کارنامه‌ی صادق: آزمون پیش‌رونده (یادگیری روی گذشته، سنجش روی دوره‌ی بعد، سه بار)، برای هر ارز در هر
   لحظه فقط یک معامله‌ی باز، و ستاره از «بدترین حالت محتمل» (کران پایین 90٪، با خوشه‌بندی روزانه چون
   ارزها با هم بالا و پایین می‌روند). */
const RD_KEY='signaldesk.radar.v5', RD_HIST=3000, RD_STEP=10, RD_MAX=150, RD_MIN=70;
/* RD_CAP: حداکثر معامله‌ی باز هم‌جهت (ارزها با هم بالا و پایین می‌روند؛ 20 لانگ هم‌زمان یعنی یک شرط بزرگ).
   RD_NC_OK: کمترین تعداد ارز برای اعتماد به ستاره‌ها؛ زیر RD_NC_MIN ستاره حداکثر 3 است. */
const RD_CAP=3, RD_NC_OK=50, RD_NC_MIN=30;
const RD_CF=['t4','t1','macd','rsi','brk','vol','btc','ext','rs','d50','volc','whale','crowd','taker','oi','rbull','rbear',
  // عامل‌های شناخته‌شده‌ی دیگر (هر کدام فقط اگر در آزمون بیرون از یادگیری کمک کند وزن می‌گیرد):
  'ma200','ma200s','adx','bbp','vwap','obv','mom','r24','hl30','fund',
  // عامل‌های کوتاه‌مدت: کندل برگشتی (سایه)، برگشت RSI از اشباع، حرکت یک ساعت اخیر بیت‌کوین
  'wick','rsit','btc1',
  // واگرایی 1 ساعته: قیمت کف/سقف تازه می‌زند ولی RSI یا هیستوگرام MACD نه
  'divr','divm',
  // باریکی CPR روزانه، و تغییر ساختار 1 ساعته (شکست آخرین سقفِ پایین‌تر یا کفِ بالاتر)
  // (RSI 4 ساعته، StochRSI، جای قیمت نسبت به CPR، شکار نقدینگی و پهنای RSI بازار امتحان شدند و در سه یادگیری
  //  پشت‌سرهم با 79 تا 136 ارز در هر دو جهت کم‌اثر بودند؛ برداشته شدند تا مدل روی نویز یاد نگیرد)
  'cprw','mss'];
/* عامل‌های کل بازار (برای همه‌ی ارزها در یک لحظه یکی): همه طوری که «+» یعنی به نفع بالا رفتن */
const RD_MF=['mtot','mt2','mt3','mbd','mud','mmc'], RD_FEAT=RD_CF.concat(RD_MF), RD_F0=RD_CF.length;
const RD_FLOW=['whale','crowd','taker','oi'], RD_NOSIGN=['volc','rbull','rbear','cprw'];
const RD_FA={t4:'روند 4 ساعته',t1:'روند 1 ساعته',macd:'MACD',rsi:'RSI',brk:'شکست 7 روزه',vol:'حجم',btc:'روند بیت‌کوین',ext:'فاصله از میانگین',
  rs:'قدرت نسبی به بیت‌کوین',d50:'روند روزانه',volc:'فشردگی نوسان',
  whale:'نهنگ‌ها در برابر مردم',crowd:'ازدحام مردم',taker:'خرید/فروش تهاجمی',oi:'Open Interest',rbull:'بازار صعودی',rbear:'بازار نزولی',
  ma200:'میانگین 200 (4 ساعته)',ma200s:'شیب میانگین 200',adx:'قدرت روند (ADX)',bbp:'باند بولینگر',vwap:'VWAP روزانه',obv:'OBV (حجم تجمعی)',
  mom:'مومنتوم 14 روزه',r24:'بازده 24 ساعته',hl30:'جای قیمت در سقف/کف 30 روزه',fund:'فاندینگ',wick:'کندل برگشتی (سایه)',divr:'واگرایی RSI (1 ساعته)',divm:'واگرایی MACD (1 ساعته)',rsit:'برگشت RSI از اشباع',btc1:'بیت‌کوین در 1 ساعت',
  mss:'تغییر ساختار (1 ساعته)',cprw:'باریکی CPR',
  mtot:'کل بازار (TOTAL)',mt2:'TOTAL2',mt3:'TOTAL3 (آلت‌ها)',mbd:'دامیننس بیت‌کوین',mud:'دامیننس تتر',mmc:'پهنای بازار: MACD همه‌ی ارزها'};
const RD_B=['70-85','85-95','95+'];
const RD_SKIP=/^(USDT|USDC|FDUSD|TUSD|DAI|BUSD|USDP|USDD|USDE|SUSDE|USDS|PYUSD|USD0|USD1|RLUSD|EURC|EURT|PAXG|XAUT|WBTC|WETH|WBETH|STETH|WSTETH|WEETH|CBBTC|BTCB|RETH|METH|LEO|BSC-USD|BFUSD|USDF)$/;
const rdEmpty=()=>({v:5,at:0,n:0,coins:{},calib:{},rel:null,M:null,fund:{},rank:[],reg:null,nflow:0,ns:0});
let RD=(()=>{const a=lsGet(RD_KEY);return a&&a.v===5?a:rdEmpty();})();
const RDQ={on:false,done:0,n:0,msg:'',t0:0,tc:0,cur:new Map(),pm:0,fin:false,iv:null};
const RDS=new Map(), RDMF=new Map();   // RDMF: ساعت ← عامل‌های کل بازار                       // نمونه‌های هر ارز (فقط در حافظه‌ی همین بار)
const rdSave=()=>lsSet(RD_KEY,RD);
const rdYield=()=>new Promise(r=>setTimeout(r,0));

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
/* همه‌ی سری‌های لازم؛ 4 ساعته و روزانه فقط از کندل‌های کاملِ گذشته (بی نگاه به آینده) */
function rdPrep(C,B,FL,FU){
  const H=36e5,c=C.map(k=>k.c),v=C.map(k=>k.v||0);
  const e20=emaArr(c,20),e50=emaArr(c,50),m12=emaArr(c,12),m26=emaArr(c,26);
  const macd=c.map((_,i)=>m12[i]-m26[i]),sig=emaArr(macd,9),hist=macd.map((x,i)=>x-sig[i]),rsi=rsiArr(c,14);
  const F=swAggr(C,4*H),f=F.map(k=>k.c),f20=emaArr(f,20),f50=emaArr(f,50),fIdx=new Map(F.map((k,j)=>[k.t,j]));
  const D=swAggr(C,24*H),d50=emaArr(D.map(k=>k.c),50),dIdx=new Map(D.map((k,j)=>[k.t,j]));
  // ATR (میانگین ساده‌ی 14 TR) و جمع تجمعی TR برای «فشردگی نوسان»
  const tr=C.map((k,i)=>i?Math.max(k.h-k.l,Math.abs(k.h-C[i-1].c),Math.abs(k.l-C[i-1].c)):k.h-k.l), pre=[0];
  for(let i=0;i<tr.length;i++)pre.push(pre[i]+tr[i]);
  // میانگین 200 روی کندل 4 ساعته (~33 روز) و ADX وایلدر (14) روی همان
  const f200=emaArr(f,200), adx=new Array(F.length).fill(null), adir=new Array(F.length).fill(0);
  {let atr=0,sp=0,sm=0,ax=null;const n=14;
    for(let j=1;j<F.length;j++){const a=F[j],b=F[j-1],up=a.h-b.h,dn=b.l-a.l,trj=Math.max(a.h-a.l,Math.abs(a.h-b.c),Math.abs(a.l-b.c));
      const pdm=up>dn&&up>0?up:0,mdm=dn>up&&dn>0?dn:0;
      if(j<=n){atr+=trj;sp+=pdm;sm+=mdm;if(j<n)continue;}else{atr=atr-atr/n+trj;sp=sp-sp/n+pdm;sm=sm-sm/n+mdm;}
      const pdi=atr>0?100*sp/atr:0,mdi=atr>0?100*sm/atr:0,dx=pdi+mdi>0?100*Math.abs(pdi-mdi)/(pdi+mdi):0;
      ax=ax==null?dx:(ax*(n-1)+dx)/n;if(j>=2*n){adx[j]=ax;adir[j]=Math.sign(pdi-mdi);}}}
  // OBV: حجم تجمعی با علامت حرکت قیمت
  const obv=new Array(c.length).fill(0);for(let i=1;i<c.length;i++)obv[i]=obv[i-1]+(c[i]>c[i-1]?v[i]:c[i]<c[i-1]?-v[i]:0);
  let bt=null,bc=null;
  if(B&&B.length>250&&B!==C){const BF=swAggr(B,4*H),bf=BF.map(k=>k.c),b20=emaArr(bf,20),b50=emaArr(bf,50);
    bt=new Map(BF.map((k,j)=>[k.t,j>=50?clamp1((b20[j]-b50[j])/b50[j]/0.01):null]));bc=new Map(B.map(k=>[k.t,k.c]));}
  return {C,c,v,e20,e50,hist,rsi,F,f20,f50,fIdx,D,d50,dIdx,pre,bt,bc,f200,adx,adir,obv,FU:FU&&FU.length?FU:null,FL:FL||null,reg:rdRegMap(B||C)};
}
/* عامل‌ها در کندل i (بسته‌شده): هر کدام حدود −1..+1، یا null اگر داده نیست */
/* واگرایی کلاسیک روی 1 ساعته: کف (یا سقف) تازه‌ی قیمت در برابر کف (سقف) قبلی، در حالی که نوسانگر o خلافش را نشان می‌دهد.
   کف/سقف فقط وقتی حساب است که 2 کندل بعدش هم بسته شده باشد (بی نگاه به آینده)؛ کف تازه باید در 12 کندل اخیر باشد،
   کف قبلی 5 تا 48 کندل پیش‌ترش، و از کف تازه تا الان قیمت آن را نشکسته باشد.
   خروجی: +1 واگرایی مثبت (به نفع بالا رفتن)، −1 منفی، 0 هیچ؛ با تازگی کم‌رنگ‌تر می‌شود. mn: کمترین فاصله‌ی نوسانگر */
function rdDiv(C,o,i,mn){
  const pv=(k,lo)=>{if(k<2||k+2>i)return false;for(let q=k-2;q<=k+2;q++)if(q!==k&&(lo?C[q].l<C[k].l:C[q].h>C[k].h))return false;return true;};
  let out=0;
  for(const lo of [true,false]){
    let k1=-1;for(let k=i-2;k>=i-12;k--)if(pv(k,lo)){k1=k;break;}
    if(k1<0)continue;
    let k0=-1;for(let k=k1-5;k>=k1-48&&k>=2;k--)if(pv(k,lo)){k0=k;break;}
    if(k0<0||o[k0]==null||o[k1]==null)continue;
    let ok=true;for(let q=k1+1;q<=i;q++)if(lo?C[q].l<C[k1].l:C[q].h>C[k1].h){ok=false;break;}
    if(!ok)continue;
    const fr=1-0.5*(i-k1-2)/10;
    if(lo&&C[k1].l<C[k0].l&&o[k1]-o[k0]>mn)out+=fr;
    if(!lo&&C[k1].h>C[k0].h&&o[k0]-o[k1]>mn)out-=fr;
  }
  return clamp1(out);
}
/* تغییر ساختار (Market Structure Shift) روی 1 ساعته: آخرین سقفِ تأییدشده (2 کندل هر طرف) پایین‌تر از سقف قبلی بود
   (روند نزولی) و حالا قیمت بالای آن بسته شده: +1، با تازگی کم‌رنگ‌تر (شکست در 3 کندل اخیر). برعکس برای کفِ بالاتر: −1. */
function rdMss(C,i){
  const pv=(k,hi)=>{if(k<2||k+2>i)return false;for(let q=k-2;q<=k+2;q++)if(q!==k&&(hi?C[q].h>=C[k].h:C[q].l<=C[k].l))return false;return true;};
  let out=0;
  for(const hi of [true,false]){
    let k1=-1,k0=-1;for(let k=i-3;k>=Math.max(2,i-72);k--)if(pv(k,hi)){if(k1<0)k1=k;else{k0=k;break;}}
    if(k0<0)continue;
    const L=hi?C[k1].h:C[k1].l;
    if(hi?!(C[k1].h<C[k0].h):!(C[k1].l>C[k0].l))continue;          // سقفِ پایین‌تر / کفِ بالاتر
    let f=-1;for(let q=k1+1;q<=i;q++)if(hi?C[q].c>L:C[q].c<L){f=q;break;}
    if(f<0||i-f>3)continue;
    if(hi?C[i].c<=L:C[i].c>=L)continue;                                // برگشته، دیگر شکست نیست
    out+=(hi?1:-1)*(1-0.25*(i-f));
  }
  return clamp1(out);
}
function rdParts(P,i){
  const {C,c,v,e20,e50,hist,rsi,f20,f50,fIdx,D,d50,dIdx,pre,bt,bc,FL}=P, H=36e5;
  if(i<200)return null;
  const j=fIdx.get(Math.floor((C[i].t+H)/(4*H))*4*H-4*H);
  if(j==null||j<50)return null;
  const atr=(pre[i+1]-pre[i-13])/14;if(!(atr>0))return null;
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
  // قدرت نسبی: بازده 7 روزه منهای بیت‌کوین (10٪ اختلاف = کامل)
  p.rs=null;let rsv=null;
  if(bc){const b0=bc.get(C[i-168].t),b1=bc.get(C[i].t);if(b0&&b1){rsv=(c[i]/c[i-168]-b1/b0)*100;p.rs=clamp1(rsv/10);}}
  // روند روزانه: فاصله از EMA50 روزانه‌ی آخرین روز کامل
  const jd=dIdx.get(Math.floor((C[i].t+H)/(24*H))*24*H-24*H);
  p.d50=jd!=null&&jd>=50?clamp1((c[i]/d50[jd]-1)/0.1):null;
  // فشردگی نوسان: ATR الان در برابر میانگین 30 روز (+ یعنی آرام‌تر از معمول)
  let vr=null;p.volc=null;
  if(i>=720){const avg=(pre[i+1]-pre[i-719])/720;if(avg>0){vr=atr/avg;p.volc=clamp1((1-vr)/0.5);}}
  const g=P.reg?P.reg(C[i].t):null;p.rbull=g==='bull'?1:0;p.rbear=g==='bear'?1:0;
  const m={rsi:r,rv,atrPct:atr/c[i]*100,rsv,vr};
  // میانگین 200 (4 ساعته) و شیبش در 5 روز
  const {f200,adx,adir,obv,FU}=P;
  p.ma200=j>=200?clamp1((c[i]/f200[j]-1)/0.08):null;
  p.ma200s=j>=230?clamp1((f200[j]/f200[j-30]-1)/0.03):null;
  // ADX: قدرت روند (40 = کامل) با جهت +DI/−DI
  p.adx=adx[j]!=null?adir[j]*Math.min(1,adx[j]/40):null;m.adx=adx[j];
  // بولینگر (20، 2) روی 1 ساعته: %B
  {let s1=0,s2=0;for(let q=i-19;q<=i;q++){s1+=c[q];s2+=c[q]*c[q];}const mu=s1/20,sd=Math.sqrt(Math.max(0,s2/20-mu*mu));
    p.bbp=sd>0?clamp1(((c[i]-(mu-2*sd))/(4*sd)-0.5)*2):0;m.bbp=sd>0?(c[i]-(mu-2*sd))/(4*sd)*100:50;}
  // VWAP 24 ساعته: فاصله به ATR
  {let pv=0,vv=0;for(let q=i-23;q<=i;q++){const tp=(C[q].h+C[q].l+c[q])/3;pv+=tp*v[q];vv+=v[q];}
    p.vwap=vv>0?clamp1((c[i]-pv/vv)/atr/3):null;}
  // OBV: جهت حجم در 24 ساعت (−1 همه فروش، +1 همه خرید)
  {let vv=0;for(let q=i-23;q<=i;q++)vv+=v[q];p.obv=vv>0?clamp1((obv[i]-obv[i-24])/vv):null;}
  // مومنتوم 14 روزه و بازده 24 ساعته
  p.mom=i>=336?clamp1((c[i]/c[i-336]-1)/0.25):null;m.mom=i>=336?(c[i]/c[i-336]-1)*100:null;
  p.r24=clamp1((c[i]/c[i-24]-1)/0.06);m.r24=(c[i]/c[i-24]-1)*100;
  // جای قیمت میان کف و سقف 30 روز کامل گذشته
  {const jd2=dIdx.get(Math.floor((C[i].t+H)/(24*H))*24*H-24*H);
    if(jd2!=null&&jd2>=29){let lo=Infinity,hi=-Infinity;for(let q=jd2-29;q<=jd2;q++){if(D[q].l<lo)lo=D[q].l;if(D[q].h>hi)hi=D[q].h;}
      p.hl30=hi>lo?clamp1(((c[i]-lo)/(hi-lo)-0.5)*2):0;}else p.hl30=null;}
  // فاندینگ: آخرین نرخ منتشرشده تا بسته شدن کندل (٪؛ 0.05٪ = کامل)
  p.fund=null;
  if(FU){const tt=C[i].t+H;let lo2=0,hi2=FU.length-1;if(FU[0][0]<=tt){while(lo2<hi2){const md=(lo2+hi2+1)>>1;if(FU[md][0]<=tt)lo2=md;else hi2=md-1;}
    if(tt-FU[lo2][0]<=9*H){p.fund=clamp1(FU[lo2][1]/0.05);m.fu=FU[lo2][1];}}}
  // کوتاه‌مدت: سایه‌ی پایین در برابر بالا (رد شدن کف/سقف)، RSI که از زیر 35 برگشته یا از بالای 65 افتاده، و بیت‌کوین در یک ساعت
  {const k=C[i],rg=k.h-k.l;p.wick=rg>0?clamp1(((Math.min(k.o,k.c)-k.l)-(k.h-Math.max(k.o,k.c)))/rg):0;}
  {const lo3=Math.min(rsi[i],rsi[i-1],rsi[i-2]),hi3=Math.max(rsi[i],rsi[i-1],rsi[i-2]);
    p.rsit=lo3<=35&&rsi[i]>rsi[i-1]?1:hi3>=65&&rsi[i]<rsi[i-1]?-1:0;}
  // واگرایی 1 ساعته (RSI: دست‌کم 2 واحد؛ MACD: دست‌کم 5٪ ATR)
  p.divr=rdDiv(C,rsi,i,2);p.divm=rdDiv(C,hist,i,0.05*atr);
  // باریکی CPR (محدوده‌ی پیوت مرکزی روز کامل قبل: P=(H+L+C)/3، BC=(H+L)/2، TC=2P−BC):
  // باریک‌تر از میانگین 20 روز = روز رونددار محتمل‌تر (+)
  p.cprw=null;
  if(jd!=null&&jd>=21){const w=x=>{const pp=(x.h+x.l+x.c)/3;return Math.abs(pp-(x.h+x.l)/2)*2/pp;},d=D[jd];
    let wa=0;for(let q=jd-20;q<jd;q++)wa+=w(D[q]);wa/=20;m.cprw=w(d)*100;p.cprw=wa>0?clamp1(1-w(d)/wa):0;}
  p.mss=rdMss(C,i);
  p.btc1=null;if(bc){const b0=bc.get(C[i].t-H),b1=bc.get(C[i].t);if(b0&&b1){p.btc1=clamp1((b1/b0-1)*100/1.5);m.b1=(b1/b0-1)*100;}}
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
const rdVec=p=>RD_CF.map(k=>p[k]==null?0:p[k]);
const rdHH=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':00';};
const rdBucket=s=>s>=95?'95+':s>=85?'85-95':'70-85';
/* ---- نقشه‌های خروج (همه به واحد R) ----
   هر سه روی همان سیگنال‌ها در آزمون پیش‌رونده سنجیده می‌شوند و بهترین (بیشترین میانگین R
   بیرون از یادگیری) خودکار انتخاب می‌شود؛ معامله‌ی آزمایشی و پوزیشن رادار با همان خارج می‌شوند.
   t: پله‌های هدف، f: سهمی که در هر پله بسته می‌شود، st: استاپ بعد از هر پله، be: ریسک‌فری بی بستن،
   trail: استاپ متحرک به فاصله‌ی چند R پشت بیشترین سود (بعد از پله‌ی اول). */
const RD_EXSW=0.03;   // کمترین برتری (R) برای عوض شدن نقشه‌ی خروج «خودکار» یک جهت
const RD_EXN=['tp','lad','trl','sar','q03','q05','q075','q1','q05c','h05','t1h'];
const rdExPlans=()=>{const rr=+(S.rMul&&S.rMul[0])||1.5;return {
  tp:{n:'هدف ثابت',d:'همه در +'+rr+'R؛ در +1R استاپ به ورود',t:[rr],f:[1],st:[0],be:1},
  lad:{n:'سیو سود پله‌ای',d:'نصف در +1R و استاپ به ورود؛ یک‌چهارم در +2R و استاپ به +1R؛ باقی در +3R',t:[1,2,3],f:[.5,.25,.25],st:[0,1,2]},
  trl:{n:'سیو سود + استاپ متحرک',d:'نصف در +1R و استاپ به ورود؛ باقی با استاپ متحرک 1R پشت بیشترین سود',t:[1],f:[.5],st:[0],trail:1},
  // خروج سریع (از تحلیل مسیر واقعی تست‌ها: بیشتر سیگنال‌ها زود +0.5R می‌دهند و بعد برمی‌گردند)
  // Parabolic SAR (0.02، گام 0.02، سقف 0.2) روی کندل یک‌ساعته، از لحظه‌ی ورود: استاپ هر ساعت بالاتر می‌آید
  sar:{n:'سیو سود + استاپ SAR',d:'نصف در +0.5R و استاپ به ورود؛ استاپ از اول با Parabolic SAR یک‌ساعته بالا می‌آید',t:[0.5],f:[.5],st:[0],sar:[0.02,0.2]},
  q03:{n:'خروج سریع +0.3R',d:'همه در +0.3R',t:[0.3],f:[1],st:[0]},
  q05:{n:'خروج سریع +0.5R',d:'همه در +0.5R',t:[0.5],f:[1],st:[0]},
  q075:{n:'همه در +0.75R',d:'همه در +0.75R',t:[0.75],f:[1],st:[0]},
  q1:{n:'همه در +1R',d:'همه در +1R (1:1)',t:[1],f:[1],st:[0]},
  // استاپ با بسته شدن کندل یک‌ساعته (نه با لمس): سایه‌ی شکار استاپ نمی‌زندش؛ استاپ اضطراری در −1.5R
  // (در −2R، تست‌های واقعی −2.07R و −2.05R دادند؛ یک باخت چهار برد را می‌برد)
  q05c:{n:'+0.5R، استاپ با بسته شدن کندل',d:'همه در +0.5R؛ استاپ فقط وقتی کندل یک‌ساعته آن طرفش بسته شود (اضطراری در −1.5R)',t:[0.5],f:[1],st:[0],cs:1.5},
  h05:{n:'نصف در +0.5R',d:'نصف در +0.5R و استاپ به ورود؛ باقی در +1.5R',t:[0.5,1.5],f:[.5,.5],st:[0,0]},
  t1h:{n:'خروج بعد از 1 ساعت',d:'بعد از یک ساعت با قیمت همان لحظه (استاپ سر جایش)',t:[],f:[],st:[],tmax:1}};};
const exNew=()=>({rem:1,acc:0,stop:-1,k:0,peak:0,be:false,tpf:0});
/* ---- هزینه‌ی هر معامله ----
   «کارمزد رفت‌وبرگشت» تنظیمات (تیکر/مارکت) و «کارمزد میکر رفت‌وبرگشت» (Limit) هر کدام نصف‌نصف برای ورود و خروج.
   با «سفارش Limit»: ورود و خروج در هدف‌ها میکرند؛ استاپ، ریسک‌فری، استاپ متحرک و خروج زمانی همیشه مارکت‌اند (تیکر + لغزش).
   قبلاً کارمزد رفت‌وبرگشت دو بار شمرده می‌شد و لغزش روی همه‌ی خروج‌ها. tpf: سهمی از حجم که در هدف‌ها بسته شده. */
function rdFees(){const tk=Math.max(0,+S.fee||0)/2, mk=S.feeMk!=null&&S.feeMk!==''?Math.max(0,+S.feeMk||0)/2:Math.min(tk,0.02), lm=S.rdOrd!=='mkt';
  return {tk,mk,slip:Math.max(0,+S.slip||0),lm,inF:lm?mk:tk,tpF:lm?mk:tk};}
const rdCostSig=()=>{const f=rdFees();return [f.tk,f.mk,f.slip,f.lm?1:0,'v2'].join('|');};
/* هزینه به R: ورود + سهم هدف‌ها با کارمزد هدف + بقیه با مارکت و لغزش */
const exCost=(x,sd,F)=>{F=F||rdFees();const t=Math.min(1,Math.max(0,(x&&x.tpf)||0));return (F.inF+t*F.tpF+(1-t)*(F.tk+F.slip))/100/sd;};
/* بدترین حالت (خروج با استاپ): برای کنار گذاشتن معامله‌ای که استاپش آن‌قدر نزدیک است که کارمزد آن را می‌خورد */
const RD_MAXC=0.15;
const exCostSl=(sd,F)=>{F=F||rdFees();return (F.inF+F.tk+F.slip)/100/sd;};
/* یک قدم (کندل یا قیمت): fav بهترین و adv بدترین R در این قدم؛ اول استاپ (محافظه‌کار)، بعد پله‌ها.
   تغییر استاپ از قدم بعد اثر می‌کند. true یعنی معامله تمام شد. */
/* cl: R بسته شدن کندل یک‌ساعته (فقط برای نقشه‌ی «استاپ با بسته شدن»، P.cs = استاپ اضطراری به R).
   تا وقتی استاپ همان استاپ اول است، لمس آن را نمی‌زند: اول اضطراری، بعد بسته شدن کندل، بعد هدف‌ها (محافظه‌کار). */
/* bar: کندل یک‌ساعته‌ی کامل {f: بیشترین R، a: کمترین R} برای به‌روز کردن SAR (فقط P.sar) */
function exStep(x,P,fav,adv,cl,bar){
  if(P.cs&&x.stop<0){
    if(adv<=-P.cs){x.acc+=x.rem*-P.cs;x.rem=0;x.how='sl';x.out=-P.cs;return true;}
    if(cl!=null&&cl<=x.stop){const o=Math.max(cl,-P.cs);x.acc+=x.rem*o;x.rem=0;x.how='sl';x.out=o;return true;}
  }else if(adv<=x.stop){x.acc+=x.rem*x.stop;x.rem=0;x.how=x.stop>0||(x.stop>-1&&x.stop!==0)?'trail':x.stop===0?'be':'sl';x.out=x.stop;return true;}
  let ns=x.stop;
  while(x.k<P.t.length&&fav>=P.t[x.k]){const f=Math.min(x.rem,P.f[x.k]);x.acc+=f*P.t[x.k];x.rem-=f;x.tpf=(x.tpf||0)+f;ns=Math.max(ns,P.st[x.k]);x.k++;
    if(x.rem<=1e-9){x.rem=0;x.how='tp';x.out=P.t[x.k-1];return true;}}
  if(P.be&&fav>=P.be)ns=Math.max(ns,0);
  x.peak=Math.max(x.peak,fav);
  if(P.trail&&x.k>=1)ns=Math.max(ns,x.peak-P.trail);
  if(P.sar&&bar){                                  // SAR کلاسیک به واحد R؛ از قدم بعد اثر می‌کند
    if(x.sar==null){x.sar=-1;x.ep=0;x.af=P.sar[0];x.a1=null;}
    if(bar.f>x.ep){x.ep=bar.f;x.af=Math.min(P.sar[1],x.af+P.sar[0]);}
    let s2=x.sar+x.af*(x.ep-x.sar);const lim=Math.min(bar.a,x.a1==null?bar.a:x.a1);if(s2>lim)s2=lim;
    x.a1=bar.a;x.sar=s2;ns=Math.max(ns,s2);}
  x.stop=ns;x.be=ns>=0;return false;
}
const exR=(x,nowR)=>x.acc+x.rem*nowR;
/* یک معامله روی کندل‌های بعدی با هر سه نقشه: R خالص (بعد از کارمزد) و کندل خروج */
function rdWalkX(C,i,pl,F){
  F=F||rdFees();
  const sign=pl.dir==='long'?1:-1, u=pl.E*pl.sd, PL=rdExPlans(), out={}, cs=x=>exCost(x,pl.sd,F);
  const st={};for(const k of RD_EXN)st[k]=exNew();
  let left=RD_EXN.length, j0=i+1;
  // سفارش Limit در قیمت بسته شدن کندل: تا 2 کندل بعد باید قیمت به آن برسد، وگرنه معامله‌ای نیست
  if(F.lm){while(j0<=i+2&&j0<C.length&&!(sign>0?C[j0].l<=pl.E:C[j0].h>=pl.E))j0++;
    if(j0>i+2){if(i+AS_HOLD>C.length-1)return null;const o={R:0,j:Math.min(C.length-1,i+2),how:'nofill',c:0};for(const n of RD_EXN)out[n]=o;return out;}}
  for(let j=j0;j<C.length&&j<=i+AS_HOLD&&left;j++){
    const k=C[j], fav=sign>0?(k.h-pl.E)/u:(pl.E-k.l)/u, adv=sign>0?(k.l-pl.E)/u:(pl.E-k.h)/u, cl=(k.c-pl.E)*sign/u, bar={f:fav,a:adv};
    for(const n of RD_EXN){if(out[n])continue;
      if(exStep(st[n],PL[n],fav,adv,cl,bar)){const c=cs(st[n]);out[n]={R:st[n].acc-c,j,how:st[n].how,c};left--;}
      else if(PL[n].tmax&&j-i>=PL[n].tmax){const c=cs(st[n]);out[n]={R:exR(st[n],(k.c-pl.E)*sign/u)-c,j,how:'time',c};left--;}}
  }
  if(left){const end=i+AS_HOLD;if(end>C.length-1)return null;
    const cR=(C[end].c-pl.E)*sign/u;for(const n of RD_EXN)if(!out[n]){const c=cs(st[n]);out[n]={R:exR(st[n],cR)-c,j:end,how:'time',c};}}
  return out;
}
/* نمونه‌های یک ارز: هر 2 ساعت، عامل‌ها و نتیجه‌ی معامله‌ی لانگ و شورت از همان لحظه */
function rdSamples(P,tk){
  const C=P.C,H=36e5,F=RD_F0,last=C[C.length-1].t+H>Date.now()?C.length-2:C.length-1;
  const t=[],X=[],R={long:[],short:[]},J={long:[],short:[]},G=[],RX={long:[],short:[]},CX={long:[],short:[]},DV=[],SD=[],Fe=rdFees();
  for(let i=210;i<=last-AS_HOLD;i+=2){
    const r=rdParts(P,i);if(!r)continue;
    const w={};let sd0=0;
    for(const d of ['long','short']){const pl=asPlan(C,i,d);if(pl)sd0=pl.sd;w[d]=pl&&rdWalkX(C,i,pl,Fe);}
    if(!w.long||!w.short)continue;
    t.push(C[i].t);X.push(...rdVec(r.p));G.push(P.reg?P.reg(C[i].t):null);
    // واگرایی هر لحظه (هر کدام از RSI یا MACD): برای جدول «اثر واگرایی»
    DV.push(Math.sign((r.p.divr||0)+(r.p.divm||0)));SD.push(sd0);
    // برچسب مدل و «یک معامله در هر لحظه» با نقشه‌ی هدف ثابت؛ R هر سه نقشه برای انتخاب نقشه‌ی خروج
    for(const d of ['long','short']){R[d].push(w[d].tp.R);J[d].push(C[w[d].tp.j].t);for(const n of RD_EXN){RX[d].push(w[d][n].R);CX[d].push(w[d][n].c||0);}}
  }
  return {tk,t,X:Float32Array.from(X),R,J,G,F,RX:{long:Float32Array.from(RX.long),short:Float32Array.from(RX.short)},CX:{long:Float32Array.from(CX.long),short:Float32Array.from(CX.short)},DV:Int8Array.from(DV),SD:Float32Array.from(SD)};
}
/* حال الانِ یک ارز (آخرین کندل بسته) و نقشه‌ی هر دو جهت */
function rdLiveOf(P){
  const C=P.C,H=36e5,i=C[C.length-1].t+H>Date.now()?C.length-2:C.length-1;
  const r=rdParts(P,i);if(!r)return null;
  return {t:C[i].t,x:rdVec(r.p),parts:r.p,m:r.m,px:P.c[i],flow:!!P.FL,pl:{long:asPlan(C,i,'long'),short:asPlan(C,i,'short')}};
}
const rdPlanAt=(pl,E)=>{if(!pl)return null;E=E>0?E:pl.E;const s=pl.dir==='long'?1:-1;
  return {dir:pl.dir,E,SL:+(E*(1-s*pl.sd)).toPrecision(8),TP:+(E*(1+s*pl.sd*pl.rr)).toPrecision(8),sd:pl.sd,rr:pl.rr};};

/* ---- رگرسیون لجستیک با L2 (نیوتن) ---- */
function rdSolve(A,b,K){
  const M=Array.from({length:K},(_,i)=>{const r=new Array(K+1);for(let j=0;j<K;j++)r[j]=A[i*K+j];r[K]=b[i];return r;});
  for(let c=0;c<K;c++){let p=c;for(let r=c+1;r<K;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;
    if(Math.abs(M[p][c])<1e-12)return null;[M[c],M[p]]=[M[p],M[c]];
    for(let r=0;r<K;r++)if(r!==c){const f=M[r][c]/M[c][c];if(f)for(let j=c;j<=K;j++)M[r][j]-=f*M[c][j];}}
  return M.map((r,i)=>r[K]/r[i]);
}
const rdSig=z=>1/(1+Math.exp(-z));
function rdPred(M,X,o,mr){if(!M)return null;const w=M.w,F=w.length-1;let z=w[F];for(let k=0;k<RD_F0;k++)z+=w[k]*X[o+k];
  if(mr)for(let j=0;j<F-RD_F0;j++)z+=w[RD_F0+j]*mr[j];return rdSig(z);}
/* صدک احتمال در میان پیش‌بینی‌های دوره‌ی یادگیری: 0..100 */
function rdPct(M,p){if(!M||p==null)return 0;const q=M.q;let lo=0,hi=q.length;while(lo<hi){const m=(lo+hi)>>1;if(q[m]<=p)lo=m+1;else hi=m;}return Math.max(0,lo-1);}
/* یادگیری روی نمونه‌هایی که معامله‌شان پیش از tEnd تمام شده (بی نشت از دوره‌ی سنجش) */
function rdFit(SS,d,tEnd,mask,w0){
  const F=RD_FEAT.length,F0=RD_F0,K=F+1,rows=[];
  for(const s of SS)for(let q=0;q<s.t.length;q++)if(s.J[d][q]<tEnd)rows.push(s,q);
  const n=rows.length/2;if(n<300)return null;
  const step=Math.max(1,Math.ceil(n/25000)), lam=0.02*n/step;
  const w=new Float64Array(K);if(w0)for(let k=0;k<K;k++)w[k]=mask&&k<F&&!mask[k]?0:+w0[k]||0;
  for(let it=0;it<7;it++){
    const g=new Float64Array(K),A=new Float64Array(K*K),x=new Float64Array(K);x[F]=1;
    for(let r=0;r<rows.length;r+=2*step){const s=rows[r],q=rows[r+1],o=q*F0,X=s.X,mr=RDMF.get(s.t[q]);
      let z=w[F];for(let k=0;k<F;k++){x[k]=mask&&!mask[k]?0:k<F0?X[o+k]:mr?mr[k-F0]:0;z+=w[k]*x[k];}
      const p=rdSig(z),e=p-(s.R[d][q]>0?1:0),v=Math.max(p*(1-p),1e-6);
      for(let a=0;a<K;a++){const xa=x[a];if(!xa)continue;g[a]+=e*xa;for(let b=a;b<K;b++)if(x[b])A[a*K+b]+=v*xa*x[b];}}
    for(let a=0;a<F;a++){g[a]+=lam*w[a];A[a*K+a]+=lam;}A[F*K+F]+=1e-6;
    for(let a=0;a<K;a++)for(let b=0;b<a;b++)A[a*K+b]=A[b*K+a];
    const dw=rdSolve(A,g,K);if(!dw)break;let mx=0;
    for(let a=0;a<K;a++){w[a]-=dw[a];mx=Math.max(mx,Math.abs(dw[a]));}
    if(mx<1e-4)break;
  }
  const M={w:Array.from(w,x=>+x.toFixed(5)),n};
  const ps=[];for(let r=0;r<rows.length;r+=2*Math.max(1,Math.ceil(n/6000)))ps.push(rdPred(M,rows[r].X,rows[r+1]*F0,RDMF.get(rows[r].t[rows[r+1]])));
  ps.sort((a,b)=>a-b);M.q=Array.from({length:101},(_,k)=>+ps[Math.min(ps.length-1,Math.floor(k/100*(ps.length-1)))].toFixed(5));
  return M;
}
/* هرس خودکار عامل‌ها (روی همان داده‌ی یادگیری، پس سنجش بیرون از یادگیری صادق می‌ماند):
   - کم‌اثر: |وزن| زیر RD_WEAK
   - تکراری: دو عامل با همبستگی |r| ≥ RD_DUP؛ آنکه وزن کمتری دارد کنار می‌رود
   بعد مدل فقط با عامل‌های مانده دوباره یاد می‌گیرد. M.drop: عامل ← 'w' یا 'd:عامل هم‌ارزش' */
const RD_WEAK=0.03, RD_DUP=0.85;
function rdCorr(SS,d,tEnd){
  const F=RD_FEAT.length,F0=RD_F0,rows=[];
  for(const s of SS)for(let q=0;q<s.t.length;q++)if(s.J[d][q]<tEnd)rows.push(s,q);
  const n=rows.length/2,step=Math.max(1,Math.ceil(n/8000)),S1=new Float64Array(F),S2=new Float64Array(F*F),x=new Float64Array(F);let m=0;
  for(let r=0;r<rows.length;r+=2*step){const s=rows[r],q=rows[r+1],o=q*F0,mr=RDMF.get(s.t[q]);m++;
    for(let k=0;k<F;k++){x[k]=k<F0?s.X[o+k]:mr?mr[k-F0]:0;S1[k]+=x[k];}
    for(let a=0;a<F;a++){const xa=x[a];if(xa)for(let b=a;b<F;b++)S2[a*F+b]+=xa*x[b];}}
  const R=new Float64Array(F*F);if(m<2)return R;
  const sd=k=>Math.sqrt(Math.max(0,S2[k*F+k]/m-(S1[k]/m)**2));
  for(let a=0;a<F;a++)for(let b=a+1;b<F;b++){const v=sd(a)*sd(b);R[a*F+b]=v>1e-9?(S2[a*F+b]/m-S1[a]/m*S1[b]/m)/v:0;}
  return R;
}
function rdFitP(SS,d,tEnd){
  const M0=rdFit(SS,d,tEnd);if(!M0)return null;
  const F=RD_FEAT.length,mask=new Uint8Array(F).fill(1),drop={},aw=k=>Math.abs(M0.w[k]);
  for(let k=0;k<F;k++)if(aw(k)<RD_WEAK){mask[k]=0;drop[RD_FEAT[k]]='w';}
  const R=rdCorr(SS,d,tEnd),P=[];
  for(let a=0;a<F;a++)for(let b=a+1;b<F;b++)if(Math.abs(R[a*F+b])>=RD_DUP)P.push([Math.abs(R[a*F+b]),a,b]);
  P.sort((x,y)=>y[0]-x[0]);
  for(const [,a,b] of P){if(!mask[a]||!mask[b])continue;const [lo,hi]=aw(a)<aw(b)?[a,b]:[b,a];mask[lo]=0;drop[RD_FEAT[lo]]='d:'+RD_FEAT[hi];}
  if(!Object.keys(drop).length||mask.reduce((s,x)=>s+x,0)<5)return M0;
  const M=rdFit(SS,d,tEnd,mask,M0.w);if(!M)return M0;
  M.drop=drop;return M;
}
/* ---- کارنامه‌ی صادق ---- */
function rdAdd(cal,k,R,t){const o=cal[k]||(cal[k]={n:0,w:0,r:0,d:{}});o.n++;o.r+=R;if(R>0)o.w++;
  const day=Math.floor(t/864e5),x=o.d[day]||(o.d[day]=[0,0]);x[0]+=R;x[1]++;}
/* میانگین و کران پایین 90٪ با خوشه‌بندی روزانه (معامله‌های یک روز با هم حرکت می‌کنند) */
function rdSum(o){const D=Object.values(o.d),G=D.length,m=o.r/o.n;let v=0;for(const [r,n] of D)v+=(r-n*m)**2;
  const se=G>1?Math.sqrt(v*G/(G-1))/o.n:Infinity;return {n:o.n,w:o.w,r:+o.r.toFixed(3),g:G,lb:+(m-1.2816*se).toFixed(3)};}
/* سنجش یک دوره با مدلی که آن دوره را ندیده: برای هر ارز در هر لحظه فقط یک معامله‌ی باز */
function rdEvalFold(SS,M,a,b,cal,rel,busy,recs,open){
  // اول همه‌ی لحظه‌های امتیاز 70+ همه‌ی ارزها، بعد به ترتیب زمان (و در یک لحظه، امتیاز بالاتر اول):
  // هر ارز یک معامله‌ی باز، و در هر جهت حداکثر RD_CAP معامله‌ی باز هم‌زمان (مثل واقعیت)
  const F=RD_F0, Q=[], Fe=rdFees();open=open||{long:[],short:[]};let costN=0;
  for(const s of SS)
    for(let q=0;q<s.t.length;q++){const t=s.t[q];if(t<a||t>=b)continue;
      const o=q*F,mr=RDMF.get(t),pL=rdPred(M.long,s.X,o,mr),pS=rdPred(M.short,s.X,o,mr);
      for(const [d,p] of [['long',pL],['short',pS]]){const bi=Math.min(5,Math.max(0,Math.floor(p*10)-2)),x=rel[d][bi];x[0]++;x[1]+=p;if(s.R[d][q]>0)x[2]++;
        if(s.RX)RD_EXN.forEach((n,e)=>rdAdd(cal,'base|'+n+'|'+d,s.RX[d][q*RD_EXN.length+e],t));else rdAdd(cal,(recs?'base|tp|':'base|')+d,s.R[d][q],t);}
      const sL=rdPct(M.long,pL),sS=rdPct(M.short,pS),sc=Math.max(sL,sS);
      // معامله‌ای که استاپش آن‌قدر نزدیک است که کارمزد بیش از RD_MAXC R می‌خورد، گرفته نمی‌شود (در زنده هم)
      if(sc>=RD_MIN&&!(s.SD&&s.SD[q]>0&&exCostSl(s.SD[q],Fe)>RD_MAXC))Q.push({s,q,t,sc,d:sL>=sS?'long':'short'});
      else if(sc>=RD_MIN)costN++;}
  Q.sort((x,y)=>x.t-y.t||y.sc-x.sc);
  let capped=0;
  for(const {s,q,t,sc,d} of Q){
    if(t<(busy.get(s.tk)||0))continue;
    const od=open[d];for(let i=od.length-1;i>=0;i--)if(od[i]<=t)od.splice(i,1);
    if(od.length>=RD_CAP){capped++;continue;}
    const end=s.J[d][q];busy.set(s.tk,end);od.push(end);
    const bk=rdBucket(sc),g=s.G[q];
    if(recs)recs.push({d,bk,g,t,R:s.RX?RD_EXN.map((_,e)=>s.RX[d][q*RD_EXN.length+e]):RD_EXN.map(()=>s.R[d][q]),dv:s.DV?s.DV[q]*(d==='long'?1:-1):0,
      C:s.CX?RD_EXN.map((_,e)=>s.CX[d][q*RD_EXN.length+e]):null,sd:s.SD?s.SD[q]:null});
    else{const R=s.R[d][q];rdAdd(cal,d,R,t);rdAdd(cal,d+'|'+bk,R,t);if(g){rdAdd(cal,d+'|'+g,R,t);rdAdd(cal,d+'|'+g+'|'+bk,R,t);}}
  }
  if(recs)recs.costN=(recs.costN||0)+costN;
  return capped;
}
/* آزمون پیش‌رونده روی نیمه‌ی دوم (سه دوره) + مدل نهایی روی همه برای الان */
async function rdModel(){
  const SS=[...RDS.values()].filter(s=>s.t.length);if(!SS.length)return false;
  let t0=Infinity,t1=-Infinity;for(const s of SS){t0=Math.min(t0,s.t[0]);t1=Math.max(t1,s.t[s.t.length-1]);}
  const cut=[0.5,2/3,5/6,1].map(f=>t0+(t1-t0)*f);cut[3]=t1+1;
  const cal={},rel={long:Array.from({length:6},()=>[0,0,0]),short:Array.from({length:6},()=>[0,0,0])},busy=new Map(),recs=[],open={long:[],short:[]};let capN=0;
  for(let k=0;k<3;k++){
    if(!(await jobGate('radar')))return false;          // لغو: مدل قبلی می‌ماند
    RDQ.msg='سنجش صادقانه: دوره‌ی '+(k+1)+' از 3 (یادگیری روی گذشته، سنجش روی بعدش)…';RDQ.pm=k/4;rdPaintProg();await rdYield();
    const M={long:rdFitP(SS,'long',cut[k])};await rdYield();M.short=rdFitP(SS,'short',cut[k]);
    if(M.long&&M.short)capN+=rdEvalFold(SS,M,cut[k],cut[k+1],cal,rel,busy,recs,open);
  }
  if(!(await jobGate('radar')))return false;
  RDQ.msg='یادگیری مدل نهایی روی همه‌ی داده…';RDQ.pm=3/4;rdPaintProg();await rdYield();
  const ML=rdFitP(SS,'long',Infinity);await rdYield();const MS=rdFitP(SS,'short',Infinity);
  RDQ.msg='';RDQ.pm=1;
  if(!ML||!MS)return false;
  // نقشه‌ی خروج: هر سه روی همان معامله‌های بیرون از یادگیری؛ بیشترین میانگین R برنده است
  const exs={};RD_EXN.forEach((n,e)=>{const o={};for(const r of recs){rdAdd(o,r.d,r.R[e],r.t);rdAdd(o,'all',r.R[e],r.t);}
    exs[n]={};for(const k in o)exs[n][k]=rdSum(o[k]);});
  let ex='tp';for(const n of RD_EXN)if(exs[n].all&&exs[ex].all&&exs[n].all.r/exs[n].all.n>exs[ex].all.r/exs[ex].all.n+0.005)ex=n;
  // هر جهت نقشه‌ی خودش: بیشترین میانگین R همان جهت (با دست‌کم 30 معامله)؛ وگرنه همان بهترینِ کل.
  // (قبلاً یکی برای هر دو جهت بود و شورت‌های زیان‌ده، که اصلاً گرفته نمی‌شوند، انتخاب لانگ را عوض می‌کردند)
  const exD={};for(const d of ['long','short']){let b=null;
    for(const n of RD_EXN){const o=exs[n][d];if(!o||o.n<30)continue;if(!b||o.r/o.n>exs[b][d].r/exs[b][d].n+0.005)b=n;}
    exD[d]=b||ex;}
  // ثبات: اختلاف نقشه‌ها اغلب در حد نویز است (خطای آماری حدود ±0.05R)، پس نقشه‌ی قبلی هر جهت می‌ماند
  // مگر تازه دست‌کم RD_EXSW بیشتر بدهد و کران پایینش هم بدتر نباشد
  const exHold={};
  for(const d of ['long','short']){const pv=RD.exD&&RD.exD[d],a=exs[exD[d]]&&exs[exD[d]][d],b=pv&&exs[pv]&&exs[pv][d];
    if(!pv||pv===exD[d]||!a||!b||b.n<30)continue;
    const gain=a.r/a.n-b.r/b.n;
    if(!(gain>=RD_EXSW&&a.lb>=b.lb)){exHold[d]={keep:pv,cand:exD[d],gain:+gain.toFixed(3)};exD[d]=pv;}}
  const eD={long:RD_EXN.indexOf(exD.long),short:RD_EXN.indexOf(exD.short)};
  for(const r of recs){const R=r.R[eD[r.d]];rdAdd(cal,r.d,R,r.t);rdAdd(cal,r.d+'|'+r.bk,R,r.t);if(r.g){rdAdd(cal,r.d+'|'+r.g,R,r.t);rdAdd(cal,r.d+'|'+r.g+'|'+r.bk,R,r.t);}}
  // اثر واگرایی: همان معامله‌ها (نقشه‌ی خروج انتخاب‌شده) در سه دسته — واگرایی هم‌جهت، بی واگرایی، خلاف جهت
  const dvc={};for(const r of recs){const k=r.dv>0?'al':r.dv<0?'ag':'no';rdAdd(dvc,r.d+'|'+k,r.R[eD[r.d]],r.t);rdAdd(dvc,'all|'+k,r.R[eD[r.d]],r.t);}
  const divs={};for(const k in dvc)divs[k]=rdSum(dvc[k]);
  // هزینه‌ی میانگین هر معامله (به R) با روش فعلی، در برابر «همه با مارکت» و روش قبلی (کارمزد دو بار)
  let cost=null;{const Fe=rdFees(),C=recs.filter(r=>r.C&&r.sd>0);if(C.length){let a=0,m=0,o=0;
    for(const r of C){a+=r.C[eD[r.d]];m+=(2*Fe.tk+Fe.slip)/100/r.sd;o+=(4*Fe.tk+Fe.slip)/100/r.sd;}
    cost={avg:+(a/C.length).toFixed(4),mkt:+(m/C.length).toFixed(4),old:+(o/C.length).toFixed(4),n:C.length,skip:recs.costN||0,lm:Fe.lm};}}
  for(const d of ['long','short'])if(cal['base|'+exD[d]+'|'+d])cal['base|'+d]=cal['base|'+exD[d]+'|'+d];
  const C2={};for(const k in cal)if(!/^base\|[a-z0-9]+\|/.test(k))C2[k]=rdSum(cal[k]);
  Object.assign(RD,{ex,exD,exHold,exs,divs,cost,cs:rdCostSig(),capN,cap:RD_CAP,mt0:Date.now(),M:{long:ML,short:MS},calib:C2,rel,ns:SS.reduce((s,x)=>s+x.t.length,0),span:[t0,t1],ncoin:SS.length});
  return true;
}
/* ستاره از کارنامه‌ی بیرون از یادگیری: 0 = نمونه‌ی کم، 1 = زیان، 2 = سود ولی شاید شانس، 3+ = حتی در بدترین حالت محتمل سود */
function rdStars(o){if(!o||o.n<20||(o.g||0)<5)return 0;const a=o.r/o.n;return a<=0?1:o.lb<=0?2:o.lb<0.1?3:o.lb<0.25?4:5;}
const rdStarHtml=s=>s?'<span class="rdst s'+s+'" title="'+s+' از 5">'+'★'.repeat(s)+'<i>'+'☆'.repeat(5-s)+'</i></span>':'<span class="rdst s0">نمونه‌ی کم</span>';
const rdCell=o=>{if(!o||!o.n)return '<small>—</small>';const a=Math.round(o.r/o.n*100)/100||0;return rdStarHtml(rdStars(o))+'<small><b class="'+cls(a)+'" dir="ltr">'+(a?fmtR(a):'0.00R')+'</b></small><small>'+faN(Math.round(o.w/o.n*100))+'٪ برد</small><small class="n">'+faN(o.n)+' بار</small><small class="n">'+faN(o.g||0)+' روز</small>';};

/* ---- فهرست ارزها: ارزش بازار (CoinGecko، روزی یک بار)، وگرنه حجم ---- */
const RDCAP_KEY='signaldesk.mcap.v1';
let RDCAP=lsGet(RDCAP_KEY)||null;
/* 500 ارز اول (دو صفحه)، روزی یک بار؛ برای «بازه‌ی رتبه» تا رتبه‌ی حدود 450 (بی استیبل‌ها) */
async function rdCapLoad(){
  if(RDCAP&&RDCAP.deep&&Date.now()-RDCAP.at<864e5)return RDCAP;
  const u=pg=>'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page='+pg;
  const o={json:true,timeout:15000,kind:'px',quiet:true,label:'ارزش بازار (CoinGecko)',validate:d=>Array.isArray(d)&&d.length>=10};
  try{const a=await fetchVia(u(1),o);let b=null;try{b=await fetchVia(u(2),o);}catch(e){}
    const list=[],px={};for(const x of a.data.concat(b?b.data:[])){const t=String(x.symbol||'').toUpperCase();if(t&&!list.includes(t)){list.push(t);if(+x.current_price>0)px[t]=+x.current_price;}}
    RDCAP={at:Date.now(),list,px,deep:true};lsSet(RDCAP_KEY,RDCAP);}catch(e){}
  return RDCAP;
}
/* فهرست رتبه‌ای ارزها (بی استیبل، توکن بسته‌بندی‌شده و اهرمی): رتبه‌ی i = U[i-1] */
function rdUniverse(n){
  const src=RDCAP&&RDCAP.list&&RDCAP.list.length?RDCAP.list:(MKT&&MKT.top)||['BTC','ETH','XRP','BNB','SOL','DOGE','TRX','ADA','LINK','AVAX','SUI','XLM','TON','HBAR','BCH','LTC','DOT','NEAR','APT','UNI'];
  const out=[];
  for(const t of src){if(!/^[A-Z0-9]{2,12}$/.test(t)||RD_SKIP.test(t)||MK_STABLE.test(t)||MK_LEV.test(t))continue;if(!out.includes(t))out.push(t);if(out.length>=n)break;}
  return out;
}
let RDFAV=(()=>{try{return JSON.parse(localStorage.getItem('signaldesk.rdfav')||'[]');}catch(e){return [];}})();
const rdFavSave=()=>{try{localStorage.setItem('signaldesk.rdfav',JSON.stringify(RDFAV));}catch(e){}};
const rdIsFav=tk=>RDFAV.includes(tk);
function rdFavToggle(tk){RDFAV=rdIsFav(tk)?RDFAV.filter(x=>x!==tk):RDFAV.concat(tk);rdFavSave();return rdIsFav(tk);}
/* فهرستِ ارزهایی که رادار دنبال می‌کند (به ترتیب افزودن)؛ نسخه‌ی قبل فقط «n ارز اول» داشت */
const rdListOf=()=>Array.isArray(RD.list)&&RD.list.length?RD.list:rdUniverse(Math.max(RD.n||0,RD_STEP));
/* «20-40»، «200 تا 231»، یا نمادها «ETH, SOL pepe» ← فهرست نمادها */
function rdParsePick(txt){
  const t=normDig(String(txt||'')).trim();if(!t)return [];
  const m=t.match(/^(\d{1,3})\s*(?:-|–|تا|to)\s*(\d{1,3})$/i);
  if(m){const a=Math.max(1,Math.min(+m[1],+m[2])),b=Math.min(500,Math.max(+m[1],+m[2]));return rdUniverse(b).slice(a-1,b);}
  if(/^\d{1,3}$/.test(t)){const r=+t;return rdUniverse(r).slice(r-1,r);}
  return [...new Set((t.toUpperCase().match(/[A-Z0-9]{2,15}/g)||[]).filter(x=>!/^\d+$/.test(x)&&!RD_SKIP.test(x)))];
}
const rdRankOf=tk=>{const U=rdUniverse(500);const i=U.indexOf(tk);return i<0?null:i+1;};
async function rdFundLoad(){
  try{const got=await fetchVia('https://fapi.binance.com/fapi/v1/premiumIndex',{json:true,timeout:10000,kind:'px',quiet:true,label:'فاندینگ',validate:d=>Array.isArray(d)&&d.length>20});
    const m={};for(const x of got.data)if(/USDT$/.test(x.symbol))m[x.symbol.slice(0,-4)]=+x.lastFundingRate*100;return m;}catch(e){return null;}
}
/* کندل یک‌ساعته‌ی ~125 روز در IndexedDB؛ fresh=false یعنی بی شبکه، فقط اگر چیزی ذخیره نیست */
async function rdCandles(tk,fresh){
  const H=36e5,key='rdc:'+tk,now=Date.now(),from=Math.floor((now-RD_HIST*H)/H)*H;
  const st=await idbGet(key);let rows=st&&Array.isArray(st.rows)?st.rows:[];
  const needOld=!(st&&st.noOld)&&(!rows.length||rows[0][0]>from+48*H);
  if(rows.length&&!fresh&&!needOld)return rows.map(r=>({t:r[0],o:r[1],h:r[2],l:r[3],c:r[4],v:r[5]}));
  const m=new Map(rows.map(r=>[r[0],r]));let noOld=!!(st&&st.noOld),got=0;
  const pull=async(a,b)=>{for(let t=a;t<b;t+=1000*H){const C=await audCandles(tk,'1h',t,1000,true);got+=C.length;
    for(const k of C)m.set(k.t,[k.t,k.o,k.h,k.l,k.c,k.v||0]);if(C.length<900)break;}};
  try{
    if(needOld){const end=rows.length?rows[0][0]:now;await pull(from,end);
      const first=Math.min(...m.keys());if(first>from+48*H)noOld=true;}   // ارز تازه: قدیمی‌تر از این ندارد
    const last=m.size?Math.max(...m.keys()):from;
    if(now-last>H||now-(st&&st.at||0)>5*60000)await pull(last,now);   // کندل آخرِ ذخیره‌شده شاید نیمه بوده
  }catch(e){if(!m.size)throw e;}
  rows=[...m.values()].sort((a,b)=>a[0]-b[0]).filter(r=>r[0]>=from-24*H);
  if(got)await idbSet(key,{rows,noOld,at:now});
  return rows.map(r=>({t:r[0],o:r[1],h:r[2],l:r[3],c:r[4],v:r[5]}));
}
/* جریان پول از فیوچرز بایننس: 4 سری یک‌ساعته؛ هر بار روی تاریخچه‌ی ذخیره‌شده اضافه می‌شود (تا 180 روز) */
const RD_FLS=[['top','topLongShortPositionRatio','longShortRatio'],['glob','globalLongShortAccountRatio','longShortRatio'],
  ['taker','takerlongshortRatio','buySellRatio'],['oi','openInterestHist','sumOpenInterestValue']];
async function rdFlow(tk,fresh){
  const H=36e5,key='rdf:'+tk,now=Date.now(),st=await idbGet(key)||{};
  const toMaps=o=>{if(!o||o.none)return null;const fl={};let any=false;for(const [k] of RD_FLS){fl[k]=o[k]&&o[k].length?new Map(o[k]):null;if(fl[k])any=true;}return any?fl:null;};
  if(st.at&&(!fresh||(st.none&&now-st.at<864e5)||now-st.at<20*60000))return toMaps(st);
  const base='https://fapi.binance.com/futures/data/';
  const get=async(path,f,lim)=>{try{const got=await fetchVia(base+path+'?symbol='+tk+'USDT&period=1h&limit='+lim,{json:true,timeout:12000,kind:'px',quiet:true,label:'جریان '+tk,validate:d=>Array.isArray(d)});
      const out=[];for(const x of got.data){const v=+x[f];if(v>0)out.push([Math.floor(+x.timestamp/H)*H,v]);}return out;}catch(e){return null;}};
  const res=await Promise.all(RD_FLS.map(([k,path,f])=>{const a=st[k],last=a&&a.length?a[a.length-1][0]:0;
    return get(path,f,last?Math.max(30,Math.min(500,Math.ceil((now-last)/H)+3)):500);}));
  if(res.every(r=>r===null))return toMaps(st);                       // شبکه نبود: همان ذخیره
  const keep=now-180*864e5,o={at:now};let any=false;
  RD_FLS.forEach(([k],n)=>{const m=new Map(st[k]||[]);for(const [t,v] of res[n]||[])m.set(t,v);
    o[k]=[...m].filter(x=>x[0]>=keep).sort((a,b)=>a[0]-b[0]);if(o[k].length)any=true;});
  if(!any)o.none=true;
  await idbSet(key,o);
  return toMaps(o);
}
/* ---- تاریخچه‌ی ساعتیِ TOTAL، TOTAL2، TOTAL3 و دامیننس‌ها ----
   CoinGecko تاریخچه‌ی کل بازار را رایگان نمی‌دهد؛ پس از کندل‌هایی که داریم بازسازی می‌شود:
   ارزش هر ارز در هر ساعت = ارزش امروزش × (قیمت آن ساعت ÷ قیمت امروز)، تتر از تاریخچه‌ی روزانه‌ی عرضه‌اش،
   استیبل‌های دیگر ثابت، و باقی بازار (ارزهای بررسی‌نشده) هم‌پای آلت‌های بررسی‌شده. ساعت آخر دقیقاً
   برابر عدد CoinGecko است؛ هرچه ارز بیشتری بررسی شود، گذشته دقیق‌تر بازسازی می‌شود. */
const RD_STB=/^(USDC|FDUSD|TUSD|DAI|BUSD|USDP|USDD|USDE|SUSDE|USDS|PYUSD|USD0|USD1|RLUSD|EURC|BFUSD|USDF|USDT0|USDX|GHO|FRAX|LUSD|CRVUSD|USDG|USDB|USYC|BUIDL)$/;
async function rdUsdtHist(){
  const st=await idbGet('rdusdt');if(st&&Date.now()-st.at<864e5)return st.c;
  try{const got=await fetchVia('https://api.coingecko.com/api/v3/coins/tether/market_chart?vs_currency=usd&days=130&interval=daily',
      {json:true,timeout:12000,kind:'px',quiet:true,label:'عرضه‌ی تتر (CoinGecko)',validate:d=>d&&Array.isArray(d.market_caps)});
    const c=got.data.market_caps.filter(x=>x[1]>0);if(c.length>10){await idbSet('rdusdt',{at:Date.now(),c});return c;}}catch(e){}
  return st?st.c:null;
}
async function rdMktBuild(B){
  RDMF.clear();
  const r=mdMetrics(MD);if(!r||!B||B.length<400)return false;
  const H=36e5,iN=B[B.length-1].t+H>Date.now()?B.length-2:B.length-1,T=B.slice(0,iN+1).map(k=>k.t),N=T.length;
  const rel=C=>{if(!C||C.length<50)return null;const m=new Map(C.map(k=>[k.t,k.c]));const cn=m.get(T[N-1])||C[C.length-1].c;
    const a=new Float64Array(N);let last=null;for(let i=0;i<N;i++){const v=m.get(T[i]);if(v)last=v;a[i]=(last??C[0].c)/cn;}return a;};
  const local=async tk=>{const st=await idbGet('rdc:'+tk);return st&&st.rows?st.rows.map(x=>({t:x[0],c:x[4]})):null;};
  const Tn=MD.tot,Bn=Tn*MD.pct.btc/100,En=Tn*MD.pct.eth/100,Un=Tn*MD.pct.usdt/100;
  const sb=rel(B),se=rel(await local('ETH'));if(!sb||!se)return false;
  const A=new Float64Array(N);let An=0;
  // پهنای بازار (مثل نقشه‌ی حرارتی RSI و MACD): برای هر ساعت، RSI و MACD 4 ساعته‌ی آخرین کندل کامل هر ارز، با وزن برابر
  const bS=new Float64Array(N),bN=new Uint16Array(N),bM=new Uint16Array(N),bO=new Uint16Array(N),bB=new Uint16Array(N);
  const brAdd=C=>{if(!C)return;const bt=[],bv=[];for(const k of C)if((k.t+H)%(4*H)===0){bt.push(k.t);bv.push(k.c);}if(bv.length<60)return;
    const rs=rsiArr(bv,14),m12=emaArr(bv,12),m26=emaArr(bv,26),mc=bv.map((_,q)=>m12[q]-m26[q]),sg=emaArr(mc,9),ix=new Map(bt.map((t,q)=>[t,q]));
    for(let i=0;i<N;i++){const q=ix.get(Math.floor((T[i]+H)/(4*H))*4*H-H);if(q==null||q<40)continue;
      bS[i]+=rs[q];bN[i]++;if(mc[q]>sg[q])bM[i]++;if(rs[q]<30)bO[i]++;if(rs[q]>70)bB[i]++;}};
  // همه‌ی ارزهای بررسی‌شده (نه فقط آن‌هایی که همین بار در حافظه‌اند)، تا بازسازی هر بار یکی باشد
  for(const tk of new Set([...RDS.keys(),...(RD.rank||[])])){if(RD_STB.test(tk))continue;
    const Cl=tk==='BTC'?B:await local(tk);brAdd(Cl);if(tk==='BTC'||tk==='ETH')continue;const c=MD.caps[tk]&&MD.caps[tk][0];if(!c)continue;
    const a=rel(Cl);if(!a)continue;An+=c;for(let i=0;i<N;i++)A[i]+=c*a[i];}
  if(!RDS.has('BTC')&&!(RD.rank||[]).includes('BTC'))brAdd(B);
  const BR=i=>bN[i]>=8?[clamp1((bM[i]/bN[i]-0.5)*2)]:[0];      // (میانگین RSI همه برای نمایش می‌ماند؛ در مدل نه)
  let Sn=0;for(const k in MD.caps)if(RD_STB.test(k))Sn+=MD.caps[k][0];
  const Rn=Math.max(0,Tn-Bn-En-Un-Sn-An);
  // عرضه‌ی تتر: درون‌یابی روزانه؛ نسبت به امروز
  const uc=await rdUsdtHist(), uAt=t=>{if(!uc||!uc.length)return 1;const last=uc[uc.length-1][1];
    if(t<=uc[0][0])return uc[0][1]/last;for(let j=1;j<uc.length;j++)if(t<=uc[j][0]){const [t0,v0]=uc[j-1],[t1,v1]=uc[j];return (v0+(v1-v0)*(t-t0)/(t1-t0))/last;}return 1;};
  const tot=new Float64Array(N),t2=new Float64Array(N),t3=new Float64Array(N),bd=new Float64Array(N),ud=new Float64Array(N),ed=new Float64Array(N);
  for(let i=0;i<N;i++){const b=Bn*sb[i],e=En*se[i],alt=An>0?A[i]/An:(b+e)/(Bn+En),u=Un*uAt(T[i]),x=b+e+A[i]+u+Sn+Rn*alt;
    tot[i]=x;t2[i]=x-b;t3[i]=x-b-e;bd[i]=b/x*100;ud[i]=u/x*100;ed[i]=e/x*100;}
  const em=emaArr(Array.from(tot),168);
  for(let i=192;i<N;i++){
    RDMF.set(T[i],[clamp1((tot[i]/em[i]-1)/0.05),clamp1((t2[i]/t2[i-24]-1)*100/5),clamp1((t3[i]/t3[i-24]-1)*100/5),
      clamp1(-(bd[i]-bd[i-24])/1.0),clamp1(-(ud[i]-ud[i-24])/0.3),...BR(i)]);}
  const L=N-1;
  RD.mkl={totE:(tot[L]/em[L]-1)*100,t2c:(t2[L]/t2[L-24]-1)*100,t3c:(t3[L]/t3[L-24]-1)*100,bdD:bd[L]-bd[L-24],udD:ud[L]-ud[L-24],cov:+(1-Rn/Tn).toFixed(3),
    br:bN[L]>=8?{n:bN[L],rsi:bS[L]/bN[L],os:bO[L]/bN[L]*100,ob:bB[L]/bN[L]*100,mc:bM[L]/bN[L]*100,rsi24:bN[L-24]>=8?bS[L-24]/bN[L-24]:null}:null};
  // نمودار کوچک 7 روزه (هر 4 ساعت)
  const pick=a=>{const o=[];for(let i=Math.max(0,N-168);i<N;i+=4)o.push(+a[i].toPrecision(5));o.push(+a[L].toPrecision(5));return o;};
  RD.mk7={tot:pick(tot),t2:pick(t2),t3:pick(t3),bd:pick(bd),ud:pick(ud),ed:pick(ed)};
  return true;
}
/* تاریخچه‌ی فاندینگ فیوچرز بایننس (هر 8 ساعت)، در IndexedDB و هر بار فقط تکه‌ی تازه */
async function rdFundH(tk,fresh){
  const H=36e5,key='rdfu:'+tk,now=Date.now(),st=await idbGet(key)||{};
  if(st.at&&(!fresh||(st.none&&now-st.at<864e5)||now-st.at<4*H))return st.a||null;
  const last=st.a&&st.a.length?st.a[st.a.length-1][0]:0, from=last?last+1:now-130*864e5;
  try{const got=await fetchVia('https://fapi.binance.com/fapi/v1/fundingRate?symbol='+tk+'USDT&startTime='+from+'&limit=1000',
      {json:true,timeout:12000,kind:'px',quiet:true,minLen:2,label:'فاندینگ '+tk,validate:d=>Array.isArray(d)});
    const m=new Map(st.a||[]);for(const x of got.data){const r=+x.fundingRate;if(isFinite(r))m.set(+x.fundingTime,r*100);}
    const a=[...m].filter(x=>x[0]>=now-180*864e5).sort((x,y)=>x[0]-y[0]);
    const o={at:now,a,none:!a.length};await idbSet(key,o);return a.length?a:null;}
  catch(e){return st.a||null;}
}
/* بررسی پله‌پله: «more» = ده ارز بعدی، «refresh» = تازه کردن همه‌ی ارزهای بررسی‌شده (ده‌تا‌ده‌تا) */
async function rdScan(mode,add){
  if(RDQ.on)return;
  mode=mode||'refresh';if(RDQ.next===mode)RDQ.next=null;workStart();
  Object.assign(RDQ,{on:true,done:0,n:0,msg:'گرفتن فهرست ارزها (ارزش بازار از CoinGecko)…',t0:Date.now(),tc:0,pm:0,fin:false,mode});RDQ.cur.clear();
  clearInterval(RDQ.iv);RDQ.iv=setInterval(rdPaintProg,1000);rdPaintProg();
  jobSet('radar',{title:mode==='learn'?'یادگیری مدل رادار':mode==='refresh'?'بررسی بازار':'بررسی ارزهای تازه',pause:true,cancel:true,
    pct:()=>rdPctNow(),msg:()=>RDQ.msg||(RDQ.n?'ارز '+faN(Math.min(RDQ.n,RDQ.done+1))+' از '+faN(RDQ.n):''),
    go:()=>{RDV=mode==='learn'?'model':'sig';try{localStorage.setItem('signaldesk.rdview',RDV);}catch(e){}if(view==='radar')renderRadar();else go('radar');}});
  // دکمه‌ها همان لحظه حالت «در حال کار» بگیرند (بررسی خودکار هم از همین‌جا می‌گذرد)
  setTimeout(rdRepaintNow,0);
  try{
    await Promise.all([rdCapLoad(),mdLoad()]);
    // فهرست: refresh همان فهرست؛ more ده ارز بعدیِ رتبه‌ای که در فهرست نیست؛ add نمادها/بازه/واچ‌لیست
    const L0=rdListOf().slice();
    let extra=mode==='more'?rdUniverse(500).filter(t=>!L0.includes(t)).slice(0,RD_STEP):mode==='add'?(add||[]).filter(t=>!L0.includes(t)):[];
    const room=RD_MAX-L0.length;
    if(extra.length>room){RDQ.over=extra.length-room;extra=extra.slice(0,Math.max(0,room));}else RDQ.over=0;
    const U=L0.concat(extra);RD.list=U;
    // refresh: داده‌ی تازه برای همه؛ بقیه: فقط ارزهای تازه از شبکه، بقیه از حافظه
    const fresh=tk=>mode==='refresh'||!RDS.has(tk);
    // مدل و ستاره‌ها پایدار می‌مانند: فقط روزی یک بار، با «10 ارز بعدی» یا «یادگیری دوباره» از نو یاد گرفته می‌شوند
    // روش هزینه یا کارمزدها عوض شده: نمونه‌ها با هزینه‌ی تازه از نو ساخته و مدل دوباره یاد گرفته می‌شود
    if(RD.cs!==rdCostSig())RDS.clear();
    const fit=RD.cs!==rdCostSig()||mode==='learn'||((mode==='more'||mode==='add')&&extra.length>0)||!RD.M||!RD.M.long||RD.M.long.w.length!==RD_FEAT.length+1||Date.now()-(RD.mt0||0)>24*36e5;
    RDQ.fail=[];RDQ.alias=[];
    RDQ.n=U.filter(tk=>fresh(tk)||!RDS.has(tk)).length;RDQ.msg='گرفتن تاریخچه‌ی بیت‌کوین (برای روند و حال بازار)…';rdPaintProg();
    let B=null;try{B=await rdCandles('BTC',true);}catch(e){}
    if(B){RDQ.msg='بازسازی تاریخچه‌ی TOTAL و دامیننس‌ها…';rdPaintProg();try{await rdMktBuild(B);}catch(e){}}
    RDQ.msg='';RDQ.tc=Date.now();
    if(B&&B.length>30){const H=36e5,k=B[B.length-1].t+H>Date.now()?B.length-2:B.length-1;RD.reg=rdRegMap(B)(B[k].t)||RD.reg;}
    const fundP=rdFundLoad();
    const one=async tk=>{
      if(!fresh(tk)&&RDS.has(tk))return false;
      RDQ.cur.set(tk,1);rdPaintProg();
      try{const [C,FL,FU]=await Promise.all([tk==='BTC'&&B?B:rdCandles(tk,fresh(tk)),rdFlow(tk,fresh(tk)),rdFundH(tk,fresh(tk))]);
        RDQ.cur.set(tk,2);rdPaintProg();await rdYield();
        // ارز هم‌نام: صرافی زیر همین نماد ارز دیگری دارد (آخرین قیمت بیش از 30٪ با CoinGecko فرق دارد)
        const cg=RDCAP&&RDCAP.px&&RDCAP.px[tk],lc=C&&C.length?C[C.length-1].c:0;
        if(cg>0&&lc>0&&Math.abs(lc/cg-1)>0.3){RDQ.fail.push(tk);RDQ.alias=(RDQ.alias||[]).concat(tk);delete RD.coins[tk];RDS.delete(tk);}
        else if(C&&C.length>300){const P=rdPrep(C,B||C,FL,FU),s=rdSamples(P,tk);s.live=rdLiveOf(P);RDS.set(tk,s);}
        else if(!RD.coins[tk])RDQ.fail.push(tk);}
      catch(e){if(!RD.coins[tk])RDQ.fail.push(tk);}
      RDQ.cur.delete(tk);return true;
    };
    for(let a=0;a<U.length;a+=RD_STEP){
      const q=U.slice(a,a+RD_STEP);
      const worker=async()=>{while(q.length){if(!(await jobGate('radar')))return;const tk=q.shift();if(!tk)return;if(await one(tk)){RDQ.done++;rdPaintProg();}}};
      await Promise.all([worker(),worker(),worker()]);
      if(jobStopped('radar'))break;           // لغو: داده‌ی گرفته‌شده در حافظه می‌ماند، مدل قبلی سر جایش
      // مدل: بار اول بعد از همان ده ارز اول (تا زود چیزی دیده شود)، و آخر کار روی همه؛ در میانه همان مدل قبلی
      RDQ.fin=a+RD_STEP>=U.length;
      if(!RD.M||RDQ.fin){const m0=Date.now();RDQ.pm=0;
        if(B){RDQ.msg='بازسازی تاریخچه‌ی TOTAL و دامیننس‌ها…';rdPaintProg();try{await rdMktBuild(B);}catch(e){}}
        if(fit||!RD.M){await rdModel();if(RDQ.fin)RD.mt=Date.now()-m0;}
        RDQ.pm=1;}
      rdLive(U);
      rdRepaintNow();
    }
    RD.fund=(await fundP)||RD.fund||{};
    if(RDQ.n)RD.ct=Math.round((Date.now()-RDQ.tc)/RDQ.n);
    // نمادی که هیچ صرافی کندلش را نداد از فهرست بیرون می‌رود
    if(RDQ.fail.length){RD.list=RD.list.filter(t=>!RDQ.fail.includes(t));
      const al=RDQ.alias||[],nc=RDQ.fail.filter(t=>!al.includes(t));
      toast((nc.length?'کندل نیامد، از فهرست بیرون رفت: '+nc.join('، '):'')+(al.length?(nc.length?' · ':'')+'صرافی زیر این نماد ارز دیگری دارد (قیمت با CoinGecko نمی‌خواند)، بیرون رفت: '+al.join('، '):''),'err');}
    if(RDQ.over)toast('سقف فهرست '+faN(RD_MAX)+' ارز است؛ '+faN(RDQ.over)+' ارز اضافه نشد','err');
    rdLive(RD.list);RD.at=Date.now();rdSave();
    try{rbLogAuto();}catch(e){}
  }finally{RDQ.on=false;RDQ.msg='';RDQ.cur.clear();clearInterval(RDQ.iv);workEnd();if(jobStopped('radar'))RDQ.next=null;jobEnd('radar');}
  if(RDQ.next){const m=RDQ.next;RDQ.next=null;setTimeout(()=>rdScan(m),50);}
  rdRepaintNow();
}
function rdRemove(tk){RD.list=rdListOf().filter(t=>t!==tk);RD.rank=RD.rank.filter(t=>t!==tk);delete RD.coins[tk];RDS.delete(tk);rdSave();}
/* حال الانِ ارزها با مدل فعلی */
function rdLive(U){
  const M=RD.M,coins={},rank=[];
  for(const tk of U){const s=RDS.get(tk);const L=s&&s.live;if(!L){if(RD.coins[tk]){coins[tk]=RD.coins[tk];rank.push(tk);}continue;}
    const mr=RDMF.get(L.t)||null, mp={};if(mr)RD_MF.forEach((k,j)=>mp[k]=mr[j]);
    const pL=M?rdPred(M.long,L.x,0,mr):null,pS=M?rdPred(M.short,L.x,0,mr):null,sL=rdPct(M&&M.long,pL),sS=rdPct(M&&M.short,pS);
    const d=sL>=sS?'long':'short',sc=Math.max(sL,sS),dir=M&&sc>=RD_MIN?d:'wait';
    const was=RD.coins[tk], since=dir==='wait'?null:was&&was.dir===dir&&was.since?was.since:L.t+36e5;
    coins[tk]=Object.assign({dir,best:d,sc,sL,sS,since,p:d==='long'?pL:pS,parts:Object.assign({},L.parts,mp),px:L.px,t:L.t,flow:L.flow,
      pl:dir==='wait'?null:rdPlanAt(L.pl[d],PRICES.get(tk)||L.px)},L.m);
    rank.push(tk);}
  RD.coins=coins;RD.rank=rank;RD.n=rank.length;
  RD.nflow=rank.filter(t=>coins[t].flow).length;
}
/* نوار پیشرفت: درصد، کار الان، زمان گذشته و تخمین مانده (85٪ گرفتن ارزها، 15٪ سنجش و یادگیری) */
const rdMmss=ms=>{const s=Math.max(0,Math.round(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const rdPctNow=()=>{const n=RDQ.n,d=RDQ.done;let pct=n?85*d/n:2;if(RDQ.fin)pct=85+15*RDQ.pm;return Math.max(1,Math.min(99,Math.round(pct)));};
/* دکمه‌های بررسی رادار: همانی که زده شد چرخنده و درصد می‌گیرد؛ بقیه تا پایان خاموش‌اند.
   «یادگیری دوباره» وسط یک بررسی دیگر خاموش نمی‌شود: در صف می‌رود و بعدش خودش اجرا می‌شود. */
function rdBtn(attr,icon,label,mode,busy,cls){
  const me=RDQ.on&&RDQ.mode===mode,q=mode==='learn'&&RDQ.next==='learn';
  if(me||q)return '<button class="btn sm is-busy'+(cls?' '+cls:'')+'" '+attr+' disabled aria-busy="true"><span class="bspin"></span><span>'+(me?busy+' <b data-rdpct dir="ltr">'+rdPctNow()+'%</b>':'در صف: بعد از بررسی فعلی')+'</span></button>';
  return '<button class="btn sm'+(cls?' '+cls:'')+'" '+attr+(RDQ.on&&mode!=='learn'?' disabled':'')+'>'+ic(icon)+'<span>'+label+'</span></button>';
}
function rdProgInner(){
  const now=Date.now(),n=RDQ.n,d=RDQ.done;
  const pct=rdPctNow();
  const STG={1:'دریافت',2:'محاسبه'};
  const stage=RDQ.msg||(n?(RDQ.mode==='more'?'ارزهای تازه: ':'')+'ارز '+faN(Math.min(n,d+1))+' از '+faN(n)+
    (RDQ.cur.size?' · '+[...RDQ.cur].map(([tk,st])=>'<b dir="ltr">'+esc(tk)+'</b> '+STG[st]).join('، '):''):'آماده‌سازی…');
  // تخمین: سرعت همین بار، وگرنه بار قبل؛ به‌علاوه‌ی زمان سنجش بار قبل
  let eta=null;const per=d&&RDQ.tc?(now-RDQ.tc)/d:RD.ct||null, mt=RD.mt||4000;
  if(RDQ.fin&&!RDQ.msg&&d>=n)eta=null;else if(RDQ.fin&&RDQ.msg)eta=mt*(1-RDQ.pm);else if(per&&n)eta=per*(n-d)+mt;
  return '<div class="rdpb"><i style="width:'+pct+'%"></i></div><div class="rdpt"><b class="rdpp">'+faN(pct)+'٪</b><span class="rdps">'+stage+'</span>'+
    '<span class="rdtm">'+ic('clock')+'<bdi dir="ltr">'+rdMmss(now-RDQ.t0)+'</bdi>'+(eta!=null?' · حدود <bdi dir="ltr">'+rdMmss(eta)+'</bdi> مانده':'')+'</span></div>';
}
const rdProgHtml=()=>'<div class="rdprog" id="rdProgBox">'+rdProgInner()+'</div>';
function rdPaintProg(){
  const box=$('#rdProgBox');if(box&&RDQ.on)box.innerHTML=rdProgInner();
  if(RDQ.on)for(const x of document.querySelectorAll('[data-rdpct]'))x.textContent=rdPctNow()+'%';
  const b=$('#rdProg');if(b)b.textContent=RDQ.on?'':(RD.at?ageTxt(RD.at):'');
  if(!RDQ.on&&box)box.remove();
}
/* سلامت مدل: میانگین همه‌ی سیگنال‌های 70+ بیرون از یادگیری (با سقف هم‌جهت و نقشه‌ی خروج انتخاب‌شده)،
   برای هر جهت جدا: زیانِ لانگ‌ها شورت‌های خوب را نمی‌بندد (و برعکس). d[جهت].neg: آن جهت با دست‌کم 30 معامله زیان‌ده؛
   neg: هر دو جهت زیان‌ده (یا یکی زیان‌ده و دیگری بی سابقه) ← «امروز معامله نکن» */
function rdHealth(){
  const c=RD.calib||{},one=o=>{const n=o?o.n:0;return {n,avg:n?o.r/n:null,win:n?o.w/n:null,neg:n>=30&&o.r/n<=0};};
  const d={long:one(c.long),short:one(c.short)},L=c.long,Sh=c.short,n=d.long.n+d.short.n,r=(L?L.r:0)+(Sh?Sh.r:0),w=(L?L.w:0)+(Sh?Sh.w:0);
  const bad=k=>d[k].neg||d[k].n<30, neg=(d.long.neg||d.short.neg)&&bad('long')&&bad('short');
  const nc=RD.ncoin!=null?RD.ncoin:null;
  return {n,avg:n?r/n:null,win:n?w/n:null,neg,d,nc,few:nc!=null&&nc<RD_NC_OK,cap:nc!=null&&nc<RD_NC_MIN?3:5};
}
/* خلاف حال بازار: لانگ در بازار نزولی یا شورت در بازار صعودی */
const rdAgainst=d=>(RD.reg==='bear'&&d==='long')||(RD.reg==='bull'&&d==='short');
/* معامله‌های باز هم‌جهت، هر دفتر جدا: 'real' پوزیشن‌های واقعیِ رادار (برای «قابل گرفتن»)، 'test' معامله‌های آزمایشی
   (فقط برای پرسیدن پیش از تست تازه). تست‌های امتحانی جلوی سیگنال واقعی را نمی‌گیرند. */
function rdOpenDir(d,book){
  let n=0;
  if(book==='test'){try{for(const it of RB.items)if(it.k==='test'&&it.st==='open'&&it.dir===d)n++;}catch(e){}return n;}
  try{for(const p of DB.positions||[])if(p.status==='open'&&p.dir===d&&posSrc(p).sub==='radar')n++;}catch(e){}
  return n;
}
/* رتبه‌ی هر ارز: کارنامه‌ی همان جهت و شدت در همان حال بازار (اگر بس است)، وگرنه بی حال بازار */
function rdRate(x){
  if(x.dir==='wait')return null;
  const b=rdBucket(x.sc), c1=RD.reg?RD.calib[x.dir+'|'+RD.reg+'|'+b]:null, c2=RD.calib[x.dir+'|'+b];
  const o=rdStars(c1)?c1:c2;if(!o)return null;
  const s0=rdStars(o),stars=Math.min(s0,rdHealth().cap);
  return {o,stars,s0,exp:o.n?o.r/o.n:null,lb:o.lb,reg:o===c1};
}
/* RD_WHY: چرا سیگنالی «قابل گرفتن» نیست */
const RD_WHY={cost:'استاپ خیلی نزدیک؛ کارمزد زیادی از سود می‌خورد',stars:'سابقه‌ی مطمئن (3 ستاره) ندارد',neg:'این جهت در کل زیان‌ده است',reg:'خلاف روند بیت‌کوین',cap:'سقف '+RD_CAP+' پوزیشن واقعیِ هم‌جهت پر است'};
function rdList(){
  const H=rdHealth(),out=[];
  for(const tk of RD.rank){const x=RD.coins[tk];if(!x)continue;
    const rt=rdRate(x), exp=rt?rt.exp:null, stars=rt?rt.stars:0;
    let why=null;
    if(x.dir!=='wait'){
      if(x.pl&&x.pl.sd>0&&exCostSl(x.pl.sd)>RD_MAXC)why='cost';
      else if(stars<3)why='stars';
      else if(H.d[x.dir].neg)why='neg';
      else if(rdAgainst(x.dir)&&!rt.reg)why='reg';}
    out.push(Object.assign({tk,rt,cb:rt&&rt.o,exp,stars,ok:x.dir!=='wait'&&!why,why},x));}
  const rank=(a,b)=>(b.ok-a.ok)||(b.stars-a.stars)||(((b.rt&&b.rt.lb)??-9)-((a.rt&&a.rt.lb)??-9))||(b.sc-a.sc);
  out.sort(rank);
  // سقف هم‌جهت: بازها (تست و واقعی) + فرصت‌های بالای فهرست
  const used={long:rdOpenDir('long','real'),short:rdOpenDir('short','real')};
  for(const x of out)if(x.ok){if(used[x.dir]>=RD_CAP){x.ok=false;x.why='cap';}else used[x.dir]++;}
  try{rdStarTrack(out);}catch(e){}
  return out.sort(rank);
}
const rdCount=()=>rdList().filter(x=>x.ok).length;
/* دلیل‌ها: سهم هر عامل در احتمالِ همان جهت (وزن × مقدار)؛ ✓ یعنی به نفع این معامله */
function rdReasons(x){
  const d=x.dir==='wait'?x.best:x.dir, M=RD.M&&RD.M[d], it=[];if(!M)return it;
  RD_FEAT.forEach((k,n)=>{const v=x.parts[k];if(v==null||Math.abs(v)<0.25)return;const c=M.w[n]*v;if(Math.abs(c)<0.02)return;
    let t=RD_FA[k];
    if(k==='t4'||k==='t1'||k==='btc'||k==='d50')t+=v>0?' صعودی':' نزولی';
    else if(k==='macd')t+=v>0?' مثبت':' منفی';
    else if(k==='rsi')t+=' '+fmtNum(x.rsi)+(x.rsi>75?' (اشباع خرید)':x.rsi<25?' (اشباع فروش)':'');
    else if(k==='brk')t=v>0?'شکست سقف 7 روزه':'شکست کف 7 روزه';
    else if(k==='vol')t='حجم '+fmtNum(x.rv)+' برابر میانگین '+(v>0?'با رشد':'با ریزش');
    else if(k==='ext')t='خیلی دور از میانگین';
    else if(k==='rs')t=(v>0?'قوی‌تر':'ضعیف‌تر')+' از بیت‌کوین ('+fmtPct(x.rsv)+' در 7 روز)';
    else if(k==='volc')t=v>0?'نوسان آرام‌تر از معمول':'نوسان تندتر از معمول';
    else if(k==='whale')t=v>0?'نهنگ‌ها لانگ‌تر از مردم':'نهنگ‌ها شورت‌تر از مردم';
    else if(k==='crowd')t=v>0?'مردم بیشتر شورت‌اند':'مردم بیش از حد لانگ‌اند';
    else if(k==='taker')t=v>0?'خرید تهاجمی غالب':'فروش تهاجمی غالب';
    else if(k==='oi')t='OI '+fmtPct(x.doi)+' با قیمت '+fmtPct(x.dp);
    else if(k==='ma200')t=(v>0?'بالای':'زیر')+' میانگین 200 (4 ساعته)';
    else if(k==='ma200s')t='میانگین 200 '+(v>0?'رو به بالا':'رو به پایین');
    else if(k==='adx')t=(x.adx!=null&&x.adx>=25?'روند قوی':'روند ضعیف')+' '+(v>0?'صعودی':'نزولی')+' (ADX '+fmtNum(x.adx||0)+')';
    else if(k==='bbp')t=v>0?'نزدیک باند بالای بولینگر':'نزدیک باند پایین بولینگر';
    else if(k==='vwap')t=(v>0?'بالای':'زیر')+' VWAP روزانه';
    else if(k==='obv')t=v>0?'حجم خرید غالب (OBV)':'حجم فروش غالب (OBV)';
    else if(k==='mom')t='مومنتوم 14 روزه '+fmtPct(x.mom);
    else if(k==='r24')t='بازده 24 ساعته '+fmtPct(x.r24);
    else if(k==='hl30')t=v>0?'نزدیک سقف 30 روزه':'نزدیک کف 30 روزه';
    else if(k==='fund')t='فاندینگ '+fmtNum(x.fu)+'٪ '+(v>0?'(لانگ‌ها شلوغ)':'(شورت‌ها شلوغ)');
    else if(k==='wick')t=v>0?'سایه‌ی پایین بلند (کف رد شد)':'سایه‌ی بالا بلند (سقف رد شد)';
    else if(k==='rsit')t=v>0?'RSI از اشباع فروش برگشت':'RSI از اشباع خرید افتاد';
    else if(k==='divr'||k==='divm')t=(v>0?'واگرایی مثبت ':'واگرایی منفی ')+(k==='divr'?'RSI':'MACD')+' (1 ساعته؛ '+(v>0?'کف پایین‌تر، نوسانگر بالاتر':'سقف بالاتر، نوسانگر پایین‌تر')+')';
    else if(k==='btc1')t='بیت‌کوین '+fmtPct(x.b1)+' در 1 ساعت';
    else if(k==='mss')t=v>0?'شکست آخرین سقفِ پایین‌تر (ساختار 1 ساعته صعودی شد)':'شکست آخرین کفِ بالاتر (ساختار 1 ساعته نزولی شد)';
    else if(k==='cprw')t=v>0?'CPR باریک (روز رونددار محتمل‌تر)':'CPR پهن (روز رنج محتمل‌تر)';
    else if(k==='mmc'){const b=RD.mkl&&RD.mkl.br;t=(b?faN(Math.round(b.mc))+'٪':v>0?'بیشتر':'کمتر')+' ارزها MACD 4 ساعته‌ی مثبت';}
    else if(k==='mtot')t='کل بازار (TOTAL) '+(v>0?'بالای':'زیر')+' میانگین 7 روزه';
    else if(k==='mt2'||k==='mt3'){const q=RD.mkl&&RD.mkl[k==='mt2'?'t2c':'t3c'];t=RD_FA[k]+' '+(q!=null?fmtPct(q):v>0?'رو به بالا':'رو به پایین')+' در 24 ساعت';}
    else if(k==='mbd'||k==='mud'){const q=RD.mkl&&RD.mkl[k==='mbd'?'bdD':'udD'];t=RD_FA[k]+' '+(v>0?'در حال افت':'در حال رشد')+(q!=null?' ('+(q>0?'+':'')+q.toFixed(2)+' واحد در 24 ساعت)':'');}
    it.push({t,good:x.dir==='wait'?null:c>0,w:Math.abs(c)});});
  return it.sort((a,b)=>b.w-a.w).slice(0,8);
}
const RDREG_FA={bull:'صعودی',flat:'خنثی',bear:'نزولی'};
/* پنل «کارنامه و کار امروز»: لانگ و شورت در هر شدت امتیاز، در کل و در حال بازار امروز */
function rdPanelHtml(){
  const cal=RD.calib||{}, reg=RD.reg;
  if(!Object.keys(cal).length)return '';
  const tbl=(pre)=>'<table class="rdtab"><thead><tr><th></th><th>همه</th>'+RD_B.map(b=>'<th dir="ltr">'+b+'</th>').join('')+'</tr></thead><tbody>'+
    ['long','short'].map(d=>'<tr><td><span class="pill '+d+'">'+(d==='long'?'لانگ':'شورت')+'</span></td><td>'+rdCell(cal[d+pre])+'</td>'+RD_B.map(b=>'<td>'+rdCell(cal[d+pre+'|'+b])+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  const sec=(title,body,open,cl)=>'<details class="sec sub2 rdsec'+(cl?' '+cl:'')+'"'+(open?' open':'')+'><summary>'+title+'</summary>'+body+'</details>';
  const bl=cal['base|long'],bs=cal['base|short'];
  let h='<div class="rdpan">';
  if(reg)h+=sec('در بازار '+RDREG_FA[reg]+' (مثل الان)',tbl('|'+reg),true);
  h+=sec('در همه‌ی حال‌های بازار',tbl('')+
    '<div class="hint rdcap">ستون‌ها: امتیاز (صدک؛ 90 یعنی از 90٪ لحظه‌های گذشته امیدوارکننده‌تر). هر خانه: ستاره، میانگین R بعد از کارمزد، درصد برد، تعداد معامله و روزها. '+
    '<b>3 ستاره به بالا</b> یعنی حتی در بدترین حالتِ محتمل (90٪) سودده بوده؛ 2 ستاره یعنی سود داده ولی ممکن است شانس باشد.'+
    (bl&&bs?' برای مقایسه، معامله در هر لحظه بی‌انتخاب: لانگ <b class="'+cls(bl.r/bl.n)+'" dir="ltr">'+fmtR(bl.r/bl.n)+'</b>، شورت <b class="'+cls(bs.r/bs.n)+'" dir="ltr">'+fmtR(bs.r/bs.n)+'</b>.':'')+'</div>',!reg);
  // نقشه‌ی خروج: همه روی همان معامله‌های بیرون از یادگیری
  if(RD.exs){const PL=rdExPlans();
    h+=sec('نقشه‌ی خروج: '+faN(RD_EXN.length)+' جور خروج روی همان سیگنال‌ها','<table class="rdtab rdex"><thead><tr><th></th><th>لانگ</th><th>شورت</th><th>همه</th></tr></thead><tbody>'+
      RD_EXN.map(n=>{const o=RD.exs[n]||{},on=d=>rdExAuto(d)===n,ck=d=>on(d)?'<b class="rdexck">✓</b>':'';
        return '<tr class="'+(on('long')||on('short')?'on':'')+'"><td>'+esc(PL[n].n)+'</td><td>'+ck('long')+rdCell(o.long)+'</td><td>'+ck('short')+rdCell(o.short)+'</td><td>'+rdCell(o.all)+'</td></tr>';}).join('')+
      '</tbody></table>'+(RD.exHold?['long','short'].filter(d=>RD.exHold[d]).map(d=>{const x=RD.exHold[d];return '<div class="hint rdhold">'+(d==='long'?'لانگ':'شورت')+': «'+esc(PL[x.keep].n)+'» ماند؛ «'+esc(PL[x.cand].n)+'» فقط <bdi dir="ltr">'+fmtR(x.gain)+'</bdi> بهتر بود (برای عوض شدن دست‌کم <bdi dir="ltr">+'+RD_EXSW+'R</bdi> و کران پایینِ نه بدتر لازم است).</div>';}).join(''):'')+
      '<div class="hint rdcap">✓ = نقشه‌ی هر جهت: بیشترین میانگین R <b>در همان جهت</b>، ولی فقط وقتی عوض می‌شود که دست‌کم <bdi dir="ltr">+'+RD_EXSW+'R</bdi> بهتر باشد (اختلاف کمتر در حد نویز است)؛ لانگ و شورت هر کدام نقشه‌ی خودشان را دارند و «تست» و «ایزوله» با همان (یا نقشه‌ای که در «آزمایشی» انتخاب کنی) خارج می‌شوند. '+RD_EXN.map(n=>'<b>'+esc(PL[n].n)+'</b>: '+esc(PL[n].d)).join('. ')+'.</div>');}
  // اثر واگرایی 1 ساعته روی همان سیگنال‌ها
  if(RD.divs){const D=RD.divs,row=(k,t)=>'<tr><td>'+t+'</td><td>'+rdCell(D['long|'+k])+'</td><td>'+rdCell(D['short|'+k])+'</td><td>'+rdCell(D['all|'+k])+'</td></tr>';
    // حکم برای هر جهت جدا: واگرایی ممکن است برای لانگ کمک کند و برای شورت نه
    const av=x=>x&&x.n?x.r/x.n:null, one=d=>{const a=D[d+'|al'],o=D[d+'|no'],fa=d==='long'?'لانگ':'شورت';
      if(!a||!o||a.n<20)return fa+': نمونه‌ی واگرایی هنوز کم است'+(a?' ('+faN(a.n)+' بار)':'');
      const x=av(a),y=av(o);
      return x>y+0.03?'<b class="win">'+fa+': واگرایی هم‌جهت بهتر بوده</b> ('+fmtR(x)+' در برابر '+fmtR(y)+'، '+faN(a.n)+' بار)':
        x<y-0.03?'<b class="lose">'+fa+': واگرایی هم‌جهت کمکی نکرده</b> ('+fmtR(x)+' در برابر '+fmtR(y)+')':fa+': تفاوت روشنی نساخته ('+fmtR(x)+' در برابر '+fmtR(y)+')';};
    const vd=one('long')+'. '+one('short')+'.';
    h+=sec('اثر واگرایی 1 ساعته (RSI یا MACD)','<table class="rdtab rddiv"><thead><tr><th></th><th>لانگ</th><th>شورت</th><th>همه</th></tr></thead><tbody>'+
      row('al','هم‌جهت با سیگنال')+row('no','بی واگرایی')+row('ag','خلاف سیگنال')+'</tbody></table>'+
      '<div class="hint rdcap">'+vd+' واگرایی مثبت: قیمت کف پایین‌تری زده ولی RSI/MACD کف بالاتری (فروش دارد ضعیف می‌شود)؛ منفی برعکس در سقف. فقط کف/سقف‌های 12 ساعت اخیر که 2 کندل بعدشان بسته شده و هنوز شکسته نشده‌اند. «هم‌جهت» یعنی واگرایی مثبت برای لانگ یا منفی برای شورت.</div>');}
  // صداقت مدل: احتمالی که گفت در برابر آنچه شد
  if(RD.rel){const lab=['زیر 30٪','30-40٪','40-50٪','50-60٪','60-70٪','70٪+'];
    h+=sec('صداقت مدل: گفت چقدر، شد چقدر','<table class="rdtab rdrel"><thead><tr><th>مدل گفت</th><th>لانگ: شد</th><th>شورت: شد</th></tr></thead><tbody>'+
      lab.map((l,i)=>{const c=d=>{const x=RD.rel[d][i];return x[0]>=30?'<b>'+faN(Math.round(x[2]/x[0]*100))+'٪</b><small class="n">'+faN(x[0])+' بار</small>':'<small>—</small>';};
        return RD.rel.long[i][0]>=30||RD.rel.short[i][0]>=30?'<tr><td dir="ltr">'+l+'</td><td>'+c('long')+'</td><td>'+c('short')+'</td></tr>':'';}).join('')+
      '</tbody></table><div class="hint">اگر ستون «شد» نزدیک «گفت» است و با آن بالا می‌رود، مدل واقعاً چیزی می‌فهمد؛ اگر همه یکی است، عامل‌ها پیش‌بینی ندارند.</div>');}
  // وزن‌های یادگرفته (برای شورت، علامت عامل‌های جهت‌دار برعکس می‌شود تا «+» یعنی به نفع همان معامله)
  if(RD.M){let b='<div class="rdwts">';
    for(const d of ['long','short']){const w=RD.M[d].w,ks=RD_FEAT.map((k,n)=>[k,d==='short'&&!RD_NOSIGN.includes(k)?-w[n]:w[n]]).filter(x=>Math.abs(x[1])>=0.02).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
      b+='<div><b>'+(d==='long'?'لانگ':'شورت')+':</b> '+(ks.length?ks.map(([k,v])=>'<span class="pill '+(v>0?'mut':'lose')+'">'+esc(RD_FA[k])+' <bdi dir="ltr">'+(v>0?'+':'−')+Math.abs(v).toFixed(2)+'</bdi></span>').join(''):'هیچ عاملی اثر روشن نداشت')+'</div>';}
    for(const d of ['long','short']){const D=RD.M[d].drop;if(!D||!Object.keys(D).length)continue;
      const wk=Object.keys(D).filter(k=>D[k]==='w'),dp=Object.keys(D).filter(k=>D[k]!=='w');
      b+='<div class="rddrop"><b>کنار گذاشته در '+(d==='long'?'لانگ':'شورت')+' ('+faN(wk.length+dp.length)+'):</b> '+
        (wk.length?'<span class="hint">کم‌اثر:</span> '+wk.map(k=>'<span class="pill mut">'+esc(RD_FA[k]||k)+'</span>').join(''):'')+
        (dp.length?' <span class="hint">تکراری:</span> '+dp.map(k=>'<span class="pill mut" title="همبستگی بالا">'+esc(RD_FA[k]||k)+' ≈ '+esc(RD_FA[D[k].slice(2)]||D[k].slice(2))+'</span>').join(''):'')+'</div>';}
    b+='<div class="hint">«+» یعنی این عامل به نفع همین جهت بوده؛ «−» یعنی برعکسِ انتظار عمل کرده. عامل‌های کم‌اثر (|وزن| زیر '+RD_WEAK+') و تکراری (همبستگی '+RD_DUP+' به بالا با عاملی قوی‌تر) خودکار کنار می‌روند و مدل بی آن‌ها دوباره یاد می‌گیرد؛ این کار در هر دوره‌ی سنجش هم فقط با داده‌ی یادگیری همان دوره انجام می‌شود.</div></div>';
    h+=sec('وزن عامل‌ها (یادگرفته از '+faN(RD.ns||0)+' نمونه'+(RD.ncoin?' در '+faN(RD.ncoin)+' ارز':'')+')',b);}
  return h+'</div>';
}
/* زیرتب «کارنامه»: خلاصه‌ی مدل در چند عدد، بعد جدول‌ها (تاشو) */
function rdModelHtml(){
  const H=rdHealth();
  let h='';
  if(!RD.M)return '<div class="empty">هنوز مدلی یاد گرفته نشده؛ در «سیگنال‌ها» «تازه کن» را بزن.</div>';
  const sp=RD.span?Math.round((RD.span[1]-RD.span[0])/864e5/2):0;
  const kpi=(v,l,c)=>'<div class="rdk"><b class="'+(c||'')+'" dir="ltr">'+v+'</b><small>'+l+'</small></div>';
  const kd=d=>{const o=H.d[d];return kpi(o.n?fmtR(o.avg):'—',(d==='long'?'لانگ':'شورت')+(o.n?' · '+faN(Math.round(o.win*100))+'٪ برد · '+faN(o.n):''),o.n?cls(o.avg):'');};
  h+='<div class="rdkpis">'+kpi(H.avg!=null?fmtR(H.avg):'—','میانگین هر معامله · '+faN(H.n)+(sp?' در '+faN(sp)+' روز':''),H.avg!=null?cls(H.avg):'')+kd('long')+kd('short')+kpi(faN(RD.ncoin||0),'ارز',H.few?'w':'')+'</div>';
  h+='<button class="btn sm rdhelpb rdhelpl" data-rdhelp="1">'+ic('info')+'<span>راهنما: امتیاز و ستاره یعنی چه؟ کِی وارد شوم؟</span></button>';
  h+='<div class="hint">همه‌ی سیگنال‌های امتیاز '+faN(RD_MIN)+'+، روی دوره‌ای که مدل ندیده، با نقشه‌ی خروج انتخاب‌شده، بعد از کارمزد، هر ارز یک معامله و در هر جهت حداکثر '+faN(RD_CAP)+' معامله‌ی هم‌زمان'+
    (RD.capN?' (سقف هم‌جهت '+faN(RD.capN)+' معامله‌ی هم‌زمانِ اضافه را کنار گذاشت)':'')+'.</div>';
  if(RD.cost){const c=RD.cost,r=v=>'<b dir="ltr">'+fmtNum(v)+'R</b>';
    h+='<div class="rdcost">'+ic('coin')+'<span>هزینه‌ی هر معامله به‌طور میانگین '+r(c.avg)+(c.lm?' با سفارش Limit (با Market می‌شد '+r(c.mkt)+')':' با سفارش Market')+
      '؛ این عددها بعد از کم کردن همین هزینه‌اند.'+(c.skip?' '+faN(c.skip)+' معامله که استاپشان آن‌قدر نزدیک بود که کارمزد بیش از '+RD_MAXC+'R می‌خورد، کنار گذاشته شد.':'')+
      ' <button class="lnk" data-gos="1">تنظیم کارمزد</button></span></div>';}
  if(H.neg)h+='<div class="flag d"><i>!</i><span><b>مدل در هر دو جهت زیان‌ده است.</b> تا وقتی یکی مثبت نشده، هیچ سیگنالی «قابل گرفتن» نیست؛ ارزهای بیشتر یا چند روز داده‌ی تازه کمک می‌کند.</span></div>';
  else for(const d of ['long','short'])if(H.d[d].neg)h+='<div class="flag d"><i>!</i><span><b>'+(d==='long'?'لانگ‌ها':'شورت‌ها')+'ی مدل در کل زیان‌ده‌اند.</b> فقط '+(d==='long'?'شورت':'لانگ')+'‌ها می‌توانند «قابل گرفتن» باشند؛ هر جهت جدا سنجیده می‌شود.</span></div>';
  if(H.few)h+='<div class="flag w"><i>!</i><span>ستاره‌ها روی '+faN(H.nc)+' ارز ساخته شده‌اند؛ برای اعتماد دست‌کم '+faN(RD_NC_OK)+' ارز لازم است'+(H.cap<5?' (زیر '+faN(RD_NC_MIN)+' ارز، ستاره‌ی هر سیگنال حداکثر 3 است)':'')+'.</span></div>';
  const tt=Object.values(RD.coins).map(x=>x.t||0),t=tt.length?Math.max(...tt):0;
  if(RD.mt0)h+='<div class="hint rdtime">'+(t?'امتیازها برای کندلِ بسته‌شده‌ی ساعت <b dir="ltr">'+rdHH(t+36e5)+'</b> است و تا بسته شدن کندل بعدی (<b dir="ltr">'+rdHH(t+2*36e5)+'</b>) عوض نمی‌شود. ':'')+
    'مدل و ستاره‌ها '+ageTxt(RD.mt0)+' یاد گرفته شده‌اند و روزی یک بار (یا با ارزهای تازه) از نو یاد گرفته می‌شوند.</div>'+
    '<div class="glact rdlearnw">'+rdBtn('data-rdlearn="1"','undo','یادگیری دوباره','learn','در حال یادگیری','ok')+'</div>';
  h+=rdPanelHtml();
  h+='<div class="hint">مدل: رگرسیون لجستیک، جدا برای لانگ و شورت، روی نتیجه‌ی همین معامله (بعد از کارمزد). '+faN(RD_FEAT.length)+' عامل: قیمت، RSI 1 و 4 ساعته، میانگین 200، ADX، بولینگر، VWAP، OBV، مومنتوم، بیت‌کوین، قدرت نسبی، روند روزانه، نوسان، فاندینگ، واگرایی 1 ساعته، شکار نقدینگی (اسپرینگ وایکوف)، CPR روزانه، جریان پول فیوچرز بایننس'+
    (RD.nflow!=null?' ('+faN(RD.nflow)+' ارز داده‌اش را داشتند)':'')+'، کل بازار (TOTAL، TOTAL2، TOTAL3، دامیننس بیت‌کوین و تتر) و پهنای بازار (RSI و MACD 4 ساعته‌ی همه‌ی ارزها)'+(RD.mkl&&RD.mkl.cov?'؛ تاریخچه‌اش از ارزهای بررسی‌شده بازسازی شده که '+faN(Math.round(RD.mkl.cov*100))+'٪ کل بازارند':'')+'. کارنامه با آزمون پیش‌رونده: مدل هر دوره را ندیده سنجیده شده. سود گذشته تضمین آینده نیست؛ «تست» بزن و در «دفتر» ببین در عمل چه شد.</div>';
  return h;
}
/* ---- ستاره‌ی دیروز و امروز: هر وقت ستاره‌ی یک ارز عوض شد، قبلی و دلیلش نگه داشته می‌شود ----
   ستاره مال «دسته» است (جهت × بازه‌ی امتیاز × روند بیت‌کوین) و از کارنامه‌ی مدل می‌آید؛ پس با عوض شدن
   امتیاز، روند بیت‌کوین یا یادگیری دوباره‌ی مدل عوض می‌شود، حتی اگر خود ارز تغییری نکرده باشد. */
const RDSTH_KEY='signaldesk.rdsth';
let RDSTH=(()=>{const a=lsGet(RDSTH_KEY);return a&&typeof a==='object'?a:{};})();
function rdStarTrack(L){
  let dirty=false;const now=Date.now();
  for(const x of L){if(x.dir==='wait')continue;
    const cur={s:x.stars,bk:rdBucket(x.sc),reg:RD.reg||null,mt:RD.mt0||0,dir:x.dir,at:now},o=RDSTH[x.tk];
    if(!o||!o.cur){RDSTH[x.tk]={cur};dirty=true;continue;}
    const c=o.cur;
    if(c.s!==cur.s||c.dir!==cur.dir){
      const why=[];
      if(c.dir!==cur.dir)why.push('جهت از '+(c.dir==='long'?'لانگ':'شورت')+' به '+(cur.dir==='long'?'لانگ':'شورت')+' عوض شد');
      if(c.bk!==cur.bk)why.push('امتیاز از دسته‌ی '+c.bk+' به '+cur.bk+' رفت');
      if(c.reg!==cur.reg)why.push('روند بیت‌کوین از '+(RDREG_FA[c.reg]||'نامعلوم')+' به '+(RDREG_FA[cur.reg]||'نامعلوم')+' رفت');
      if(c.mt!==cur.mt)why.push('مدل از نو یاد گرفت و کارنامه دوباره حساب شد');
      if(!why.length)why.push('کارنامه‌ی همین دسته یا قانون‌های اعتبار به‌روز شد');
      RDSTH[x.tk]={cur,prev:Object.assign({},c,{why})};dirty=true;}
    else if(c.bk!==cur.bk||c.reg!==cur.reg||c.mt!==cur.mt){o.cur=cur;dirty=true;}}
  if(dirty)lsSet(RDSTH_KEY,RDSTH);
}
/* تغییر ستاره در 36 ساعت اخیر (برای کارت) */
const rdStarChg=x=>{const o=RDSTH[x.tk];return o&&o.prev&&o.cur&&o.cur.s===x.stars&&Date.now()-o.cur.at<36*36e5&&o.prev.s!==x.stars?o.prev:null;};
function rdStarChgHtml(x,full){const p=rdStarChg(x);if(!p)return '';
  const up=x.stars>p.s;
  if(!full)return '<span class="pill '+(up?'win':'mut')+' rdchg" title="'+esc(p.why.join('؛ '))+'">قبلاً '+faN(p.s)+'★ → الان '+faN(x.stars)+'★</span>';
  return '<div class="glnum rdchgd">ستاره از <b>'+faN(p.s)+'</b> ('+ageTxt(p.at)+') به <b>'+faN(x.stars)+'</b> رسید: '+esc(p.why.join('؛ '))+'. '+
    'ستاره مال «دسته» است (جهت، بازه‌ی امتیاز و روند بیت‌کوین)، نه خود ارز.</div>';}

/* راهنمای تب «بازار»: امتیاز، ستاره، کِی وارد شویم و تا کی صبر کنیم */
function rdGuideHtml(){
  const sec=(t,b,open)=>'<details class="sec sub2 rdgd"'+(open?' open':'')+'><summary>'+t+'</summary><div class="rdgdb">'+b+'</div></details>';
  return '<h3>'+ic('info')+'راهنمای رادار بازار</h3><div class="rdguide">'+
  sec('برنامه چه کار می‌کند؟','<ol>'+
    '<li><b>داده جمع می‌کند:</b> برای هر ارز حدود 125 روز کندل یک‌ساعته، جریان پول فیوچرز (نهنگ‌ها، مردم، خرید/فروش تهاجمی، Open Interest)، فاندینگ و کل بازار (TOTAL و دامیننس‌ها).</li>'+
    '<li><b>گذشته را دوباره بازی می‌کند:</b> در هر 2 ساعتِ گذشته '+faN(RD_FEAT.length)+' عامل را حساب می‌کند (روند، RSI، MACD، واگرایی، حجم، بیت‌کوین، جریان پول و …) و می‌بیند اگر همان لحظه لانگ یا شورت می‌گرفتیم چه می‌شد: استاپ 1.5 برابر نوسان معمول، خروج با نقشه‌ی خروج، حداکثر '+faN(AS_HOLD)+' ساعت، بعد از کارمزد.</li>'+
    '<li><b>یاد می‌گیرد:</b> جدا برای لانگ و شورت، کدام ترکیب عامل‌ها قبل از معامله‌ی سودده بوده.</li>'+
    '<li><b>خودش را صادقانه امتحان می‌کند:</b> روی بخشی از گذشته یاد می‌گیرد و روی بخش بعدی که <b>ندیده</b> سنجیده می‌شود (سه دور)؛ هر ارز یک معامله‌ی باز و در هر جهت حداکثر '+faN(RD_CAP)+' معامله‌ی هم‌زمان. نتیجه همان «کارنامه» است.</li></ol>'+
    '<p><b>R چیست؟</b> 1R یعنی مبلغی که اگر استاپ بخورد از دست می‌دهی ('+(typeof rbFix==='function'&&rbFix()?'در تست‌ها: مارجین '+fmtUsd(+S.tMg)+' × اهرم × فاصله‌ی استاپ؛ با 10 دلار، اهرم 10 و استاپ 2٪ یعنی حدود 2 دلار':'ریسک هر معامله در تنظیمات: '+fmtUsd(riskUsd()))+'). +0.2R یعنی به‌طور میانگین هر معامله 0.2 برابر ریسکش سود داده.</p>',true)+
  sec('امتیاز چیست؟','<p>امتیاز <b>احتمال برد نیست</b>؛ می‌گوید وضعیت الانِ این ارز در مقایسه با همه‌ی لحظه‌های گذشته چقدر امیدوارکننده است. <b>امتیاز 90</b> یعنی از 90٪ لحظه‌های گذشته امیدوارکننده‌تر.</p>'+
    '<ul><li>زیر '+faN(RD_MIN)+': سیگنال نیست (فهرست «صبر»).</li><li>'+faN(RD_MIN)+' به بالا: سیگنال است؛ جهتش لانگ یا شورت، هر کدام امتیاز بالاتری دارد.</li><li>در سه دسته سنجیده می‌شود: 70-85، 85-95، 95+.</li>'+
    '<li>امتیاز فقط با بسته شدن هر کندل یک‌ساعته عوض می‌شود. احتمال واقعی به گفته‌ی مدل در «جزئیات» هر کارت است.</li></ul>')+
  sec('امتیاز از کجا می‌آید و چرا عوض می‌شود؟','<ol>'+
    '<li><b>عامل‌ها:</b> با بسته شدن هر کندل یک‌ساعته، '+faN(RD_FEAT.length)+' عامل این ارز حساب می‌شود (روند، RSI، MACD، واگرایی، حجم، جریان پول، بیت‌کوین، کل بازار …)؛ هر کدام عددی بین −1 و +1.</li>'+
    '<li><b>احتمال:</b> مدل هر عامل را در وزنی که یاد گرفته ضرب می‌کند و جمعشان را به «احتمال سود» تبدیل می‌کند (جدا برای لانگ و شورت). این عدد در «جزئیات» کارت است و معمولاً بین 35 تا 55٪ است؛ فرق‌ها کوچک‌اند.</li>'+
    '<li><b>امتیاز:</b> همین احتمال در کنار احتمال‌های همه‌ی لحظه‌های گذشته (همه‌ی ارزها) چیده می‌شود؛ امتیاز = جایش در این صف. 97 یعنی فقط 3٪ لحظه‌های گذشته از این امیدوارکننده‌تر بوده‌اند. برای همین امتیاز را می‌شود بین ارزها و روزها مقایسه کرد.</li>'+
    '<li><b>جهت:</b> امتیاز لانگ و شورت جدا حساب می‌شود؛ هر کدام بالاتر و '+faN(RD_MIN)+'+ باشد، سیگنال همان است. در فهرست «صبر» مثلاً «L62» یعنی بهترین جهت لانگ با امتیاز 62.</li></ol>'+
    '<p><b>امتیاز این وقت‌ها عوض می‌شود:</b></p><ul>'+
    '<li><b>هر ساعت با کندل تازه:</b> قیمت، RSI، جریان پول و بقیه عوض می‌شوند. وسط ساعت ثابت است چون فقط کندل بسته‌شده حساب می‌شود.</li>'+
    '<li><b>با کل بازار:</b> بیت‌کوین، TOTAL و دامیننس‌ها برای همه‌ی ارزها یکی‌اند؛ اگر بازار بچرخد، امتیاز همه با هم بالا یا پایین می‌رود.</li>'+
    '<li><b>با یادگیری دوباره‌ی مدل:</b> وزن‌ها و صف لحظه‌های گذشته عوض می‌شوند، پس همان وضعیت ممکن است امتیاز دیگری بگیرد.</li></ul>'+
    '<p><b>امتیاز و ستاره با هم:</b> امتیاز می‌گوید «الان چقدر استثنایی است»، ستاره می‌گوید «در گذشته وقتی امتیاز همین‌قدر بود، واقعاً سود داد یا نه». امتیاز بالا با ستاره‌ی کم یعنی مدل هیجان‌زده است ولی هیجانش در این دسته جواب نداده. <b>امتیاز بالاتر همیشه بهتر نیست:</b> گاهی 85-95 سابقه‌ی بهتری از 95+ دارد (وضعیت‌های خیلی افراطی زودتر برمی‌گردند)؛ برای همین هر دسته جدا ستاره می‌گیرد.</p>'+
    '<p>برچسب‌های ✓ و ✗ روی کارت عامل‌هایی‌اند که امتیاز را بالا (✓) یا پایین (✗) برده‌اند؛ همه در «جزئیات».</p>')+
  sec('ستاره‌ها چه می‌گویند؟','<p>ستاره کارنامه‌ی <b>همان دسته</b> است (همان جهت، همان بازه‌ی امتیاز و اگر سابقه بس باشد همان روند بیت‌کوین) در امتحانی که مدل ندیده بود. حداکثر 5 ستاره.</p>'+
    '<table class="rdtab rdgt"><tbody>'+
    '<tr><td>'+rdStarHtml(0)+'</td><td>کمتر از 20 معامله یا 5 روز سابقه؛ هنوز معلوم نیست</td></tr>'+
    '<tr><td>'+rdStarHtml(1)+'</td><td>در گذشته <b>ضرر</b> داده</td></tr>'+
    '<tr><td>'+rdStarHtml(2)+'</td><td>سود داده ولی <b>ممکن است شانس بوده باشد</b></td></tr>'+
    '<tr><td>'+rdStarHtml(3)+'</td><td>حتی در بدترین حالت محتمل هم سودده</td></tr>'+
    '<tr><td>'+rdStarHtml(5)+'</td><td>بدترین حالت محتمل هم سود خوبی داشته (4: دست‌کم +0.1R، 5: دست‌کم +0.25R)</td></tr></tbody></table>'+
    '<p><b>فرق 2 و 3 ستاره مهم‌ترین نکته است.</b> میانگین سود کافی نیست؛ چند روز خوب می‌تواند آن را بالا ببرد. برنامه حساب می‌کند «در 90٪ حالت‌ها میانگین واقعی دست‌کم چقدر است» و چون ارزها با هم بالا و پایین می‌روند، معامله‌های یک روز را یک نمونه می‌شمارد. اگر حتی این عدد بدبینانه مثبت باشد، 3 ستاره؛ اگر میانگین مثبت ولی عدد بدبینانه نه، 2 ستاره.</p>'+
    '<p>تا '+faN(RD_NC_MIN)+' ارز بررسی نشده، هیچ سیگنالی بیش از 3 ستاره نمی‌گیرد؛ برای اعتماد دست‌کم '+faN(RD_NC_OK)+' ارز لازم است.</p>')+
  sec('چرا ستاره‌ی یک ارز عوض می‌شود؟','<p>ستاره مال <b>دسته</b> است، نه خود ارز؛ پس بی آنکه ارز کاری کرده باشد عوض می‌شود وقتی:</p><ul>'+
    '<li><b>امتیاز دسته‌اش عوض شود:</b> مثلاً از 95+ (که سابقه‌اش 5 ستاره بود) به 85-95 (که 2 ستاره است). امتیاز هر ساعت با کندل تازه جابه‌جا می‌شود.</li>'+
    '<li><b>روند بیت‌کوین عوض شود:</b> بیت‌کوین در 24 ساعت بیش از 2٪ بریزد (نزولی) یا بالا برود (صعودی). از آن لحظه کارنامه‌ی همان حال بازار ملاک است که می‌تواند خیلی فرق کند؛ لانگی که در بازار خنثی 5 ستاره بود در بازار نزولی ممکن است 2 ستاره باشد.</li>'+
    '<li><b>مدل از نو یاد بگیرد:</b> روزی یک بار، با ارزهای تازه یا با «یادگیری دوباره». داده‌ی تازه و ارزهای بیشتر کارنامه را دقیق‌تر می‌کند؛ ستاره‌ای که روی نمونه‌ی کم بالا بود معمولاً پایین می‌آید.</li>'+
    '<li><b>قانون‌های اعتبار:</b> با کمتر از '+faN(RD_NC_MIN)+' ارز سقف 3 ستاره؛ و سنجش با سقف '+faN(RD_CAP)+' معامله‌ی هم‌جهت سخت‌گیرتر از قبل است.</li></ul>'+
    '<p>روی هر کارت اگر ستاره در 36 ساعت اخیر عوض شده باشد، «قبلاً N★ → الان M★» می‌آید و دلیلش در «جزئیات».</p>')+
  sec('کِی مجاز به ورودیم؟','<p>وقتی سیگنال در گروه سبز <b>«قابل گرفتن»</b> است؛ یعنی همه با هم:</p><ol>'+
    '<li>امتیاز '+faN(RD_MIN)+' یا بیشتر</li><li><b>3 ستاره یا بیشتر</b></li><li>همان جهت (لانگ یا شورت) در کل زیان‌ده نیست</li>'+
    '<li>خلاف روند بیت‌کوین نیست (لانگ وقتی بیت‌کوین بیش از 2٪ ریخته)، مگر همان دسته در همین حال بازار 3 ستاره داشته باشد</li>'+
    '<li>در آن جهت کمتر از '+faN(RD_CAP)+' پوزیشن واقعیِ باز از رادار داری (تست‌ها سقف جدای خودشان را دارند و این‌جا شمرده نمی‌شوند)</li></ol>'+
    '<p>اگر یکی نباشد، کارت در «بی اعتبار کافی» است و دلیلش با برچسب قرمز روی خودش.</p>')+
  sec('روال عملی: کارت بالای صفحه','<ul>'+
    '<li><b class="win">سبز «N فرصت قابل گرفتن»:</b> همان‌ها را با «ایزوله» بگیر (اندازه با ریسک ثابت حساب شده). برای ورود بهتر «جزئیات» ← «تأیید 5 دقیقه‌ای». بعد کاری لازم نیست: خروج با نقشه و حداکثر '+faN(AS_HOLD)+' ساعت.</li>'+
    '<li><b>زرد «فرصت مطمئنی نیست»:</b> وارد نشو؛ اگر خواستی «تست» بزن.</li>'+
    '<li><b class="lose">قرمز «امروز معامله نکن»:</b> هر دو جهت در امتحان زیان داده‌اند؛ معامله‌ی واقعی نه.</li></ul>'+
    '<p><b>هر چند وقت؟</b> امتیاز ساعتی و مدل روزی یک بار عوض می‌شود؛ هر یکی دو ساعت سر زدن کافی است.</p>'+
    '<p><b>تا کی صبر؟</b> تا چیزی در گروه سبز بیاید؛ ممکن است چند ساعت یا چند روز. با کارت قرمز، صبر یعنی بهتر کردن مدل: «رساندن به '+faN(RD_NC_OK)+' ارز»، چند روز داده‌ی تازه، و فقط تست.</p>')+
  sec('یک واقعیت','<p>حتی سیگنال 3 تا 5 ستاره هم زیاد می‌بازد؛ درصد برد معمولاً 45 تا 60٪ است. سود از <b>میانگین</b> می‌آید، نه تک‌تک معامله‌ها. ریسک هر معامله را ثابت و کوچک نگه دار، حداکثر '+faN(RD_CAP)+' معامله‌ی هم‌جهت بگیر و بعد از ده‌ها معامله قضاوت کن. ستاره‌ها از گذشته‌اند و آینده را تضمین نمی‌کنند؛ «دفتر» همین را می‌سنجد.</p>')+
  '</div><div class="srow"><button class="btn" id="cx">بستن</button></div>';
}
function rdGuide(){openSheet(rdGuideHtml(),sh=>{const c=sh.querySelector('#cx');if(c)c.onclick=closeSheet;});}
/* کارت سیگنال: سربرگ (نماد، جهت، امتیاز، ستاره)، سه عدد اصلی، چند برچسب، دکمه‌ها؛ بقیه در «جزئیات» */
function rdRowHtml(x,i){
  const z=x.pl?isoSize(x.pl.E,x.pl.SL):null, f=RD.fund&&RD.fund[x.tk], R=rdReasons(x), dn=x.dir==='long'?'لانگ':'شورت';
  const rk=rdRankOf(x.tk), ex=rbExEff(x.dir), PL=rdExPlans()[ex], dv=rdDivOf(x);
  const tags=[];
  if(!x.ok&&x.why)tags.push('<span class="pill lose rdwhy0">'+esc(x.why==='neg'?(x.dir==='long'?'لانگ‌ها':'شورت‌ها')+'ی مدل در کل زیان‌ده‌اند':RD_WHY[x.why]+(x.why==='reg'?' ('+RDREG_FA[RD.reg]+')':''))+'</span>');
  {const c=rdStarChgHtml(x);if(c)tags.push(c);}
  if(dv)tags.push('<span class="pill '+(dv>0?'win':'lose')+' rddv">'+(dv>0?'✓ واگرایی هم‌جهت':'✗ واگرایی خلاف')+'</span>');
  R.slice(0,dv?2:3).forEach(r=>tags.push('<span class="pill '+(r.good==null?'mut':r.good?'win':'lose')+'">'+(r.good?'✓ ':r.good===false?'✗ ':'')+esc(r.t)+'</span>'));
  const kv=x.pl?'<div class="rdkv"><div><small>ورود</small><b dir="ltr">'+fmtPrice(x.pl.E)+'</b></div><div><small>استاپ</small><b dir="ltr">'+fmtPrice(x.pl.SL)+'</b><small dir="ltr">'+fmtNum(x.pl.sd*100)+'%</small></div>'+
    '<div><small>خروج</small><b>'+esc(PL?PL.n:'')+'</b></div></div>':'';
  return '<div class="glsig rdit'+(x.ok?' ok':' weak')+'" data-rd="'+esc(x.tk)+'">'+
    '<div class="glit"><span class="rdrk">'+faN(i+1)+'</span>'+
      '<button class="rdfavb'+(rdIsFav(x.tk)?' on':'')+'" data-a="fav" title="واچ‌لیست" aria-label="واچ‌لیست">'+(rdIsFav(x.tk)?'★':'☆')+'</button><b dir="ltr" class="rdtk">'+esc(x.tk)+'</b>'+(rk?'<small class="rdcap" title="رتبه‌ی ارزش بازار">#'+rk+'</small>':'')+
      '<span class="pill '+x.dir+'">'+dn+'</span>'+
      '<span class="rdsc '+(x.dir==='long'?'u':'d')+'">امتیاز '+faN(x.sc)+'</span>'+rdStarHtml(x.stars)+'</div>'+
    kv+
    (tags.length?'<div class="glnum rdwhy">'+tags.join('')+'</div>':'')+
    '<div class="glact">'+(z?'<button class="btn sm '+(x.ok?'ok':'')+'" data-a="iso">'+ic('shield')+'<span>ایزوله '+faN(z.lev)+'x · '+fmtUsd(z.margin)+'</span></button>':'')+
      (x.pl?'<button class="btn sm" data-a="test" title="معامله‌ی آزمایشی: مثل واقعی دنبال می‌شود، بی پول">'+ic('flag')+'<span>تست</span></button>':'')+'</div>'+
    '<details class="rdmore"><summary>جزئیات و دلیل‌ها</summary>'+rdStarChgHtml(x,true)+
      (x.cb?'<div class="glnum">سابقه‌ی '+dn+'‌های امتیاز '+rdBucket(x.sc)+(x.rt.reg?' در بازار '+RDREG_FA[RD.reg]:'')+': '+faN(x.cb.n)+' بار در '+faN(x.cb.g||0)+' روز، '+faN(Math.round(x.cb.w/x.cb.n*100))+'٪ برد، میانگین <b class="'+cls(x.cb.r/x.cb.n)+'" dir="ltr">'+fmtR(x.cb.r/x.cb.n)+'</b>'+
        (x.cb.lb!=null&&isFinite(x.cb.lb)?'، بدترین حالت محتمل <b class="'+cls(x.cb.lb)+'" dir="ltr">'+fmtR(x.cb.lb)+'</b>':'')+(x.rt&&x.rt.s0>x.stars?' (ستاره‌ی خامش '+faN(x.rt.s0)+'؛ با ارزهای کم حداکثر '+faN(x.stars)+')':'')+'</div>':'')+
      (x.p!=null?'<div class="glnum">احتمال سود به گفته‌ی مدل: <b>'+faN(Math.round(x.p*100))+'٪</b>'+(x.since?' · سیگنال از ساعت <b dir="ltr">'+rdHH(x.since)+'</b>':'')+'</div>':'')+
      (x.wl!=null||x.rl!=null||x.tb!=null?'<div class="glnum rdflow">'+[x.wl!=null?'نهنگ‌ها <b>'+faN(Math.round(x.wl))+'٪</b> لانگ':'',x.rl!=null?'مردم <b>'+faN(Math.round(x.rl))+'٪</b> لانگ':'',
        x.tb!=null?'خرید تهاجمی <b>'+faN(Math.round(x.tb))+'٪</b>':'',x.doi!=null?'OI <b class="'+cls(x.doi)+'">'+fmtPct(x.doi)+'</b> (6 ساعت)':''].filter(Boolean).join(' · ')+'</div>':'')+
      '<div class="glnum rdwhy">'+R.map(r=>'<span class="pill '+(r.good==null?'mut':r.good?'win':'lose')+'">'+(r.good?'✓ ':r.good===false?'✗ ':'')+esc(r.t)+'</span>').join('')+
        (f!=null&&Math.abs(f)>=0.03?'<span class="pill mut" title="فاندینگ فیوچرز">فاندینگ '+fmtNum(f)+'٪ '+(f>0?'(لانگ‌ها شلوغ)':'(شورت‌ها شلوغ)')+'</span>':'')+
        (!x.flow?'<span class="pill mut">بی داده‌ی فیوچرز بایننس</span>':'')+'</div>'+
      rdDivHtml(x)+rdConfHtml(x)+
      (x.pl?'<div class="glnum">هدف ثابت <b dir="ltr">'+fmtPrice(x.pl.TP)+'</b> · حداکثر '+faN(AS_HOLD)+' ساعت</div><div class="glnum rbplan">'+rbPlanTxt({E:x.pl.E,sd:x.pl.sd,dir:x.dir,ex})+'</div>'+
        (()=>{const F=rdFees(),lo=exCost({tpf:1},x.pl.sd,F),hi=exCost({tpf:0},x.pl.sd,F);
          return '<div class="glnum rdord">'+(F.lm?'سفارش: ورود <b>Limit</b> روی <b dir="ltr">'+fmtPrice(x.pl.E)+'</b> و هدف‌ها هم Limit (کارمزد میکر)؛ استاپ مارکت. ':'سفارش: Market. ')+
            'هزینه‌ی این معامله <b dir="ltr">'+fmtNum(lo)+(hi-lo>0.005?'–'+fmtNum(hi):'')+'R</b></div>';})():'')+
      '<div class="glact">'+(x.pl?'<button class="btn sm side" data-a="copy" title="برای اپ صرافی">'+ic('share')+'<span>کپی برای صرافی</span></button>':'')+
        '<button class="btn sm side" data-a="rm" title="بیرون از فهرست رادار">'+ic('x')+'<span>بیرون از فهرست</span></button></div>'+
    '</details></div>';
}
/* واگرایی هم‌جهت/خلاف برای این سیگنال (+1 هم‌جهت، −1 خلاف، 0 هیچ) */
const rdDivOf=x=>{if(!x||!x.parts||x.dir==='wait')return 0;const v=Math.sign((x.parts.divr||0)+(x.parts.divm||0));return v*(x.dir==='long'?1:-1);};
function rdDivHtml(x){const v=rdDivOf(x);if(!v)return '';
  const k=[x.parts.divr?'RSI':'',x.parts.divm?'MACD':''].filter(Boolean).join(' و ');
  return '<div class="glnum"><span class="pill '+(v>0?'win':'lose')+' rddv">'+(v>0?'✓ واگرایی هم‌جهت ':'✗ واگرایی خلاف ')+k+' (1 ساعته)</span></div>';}
let RDPICKOPEN=false;
/* ---- تأیید ورود 5 دقیقه‌ای ----
   رادار جهت را برای چند ساعت آینده می‌گوید؛ این تأیید می‌گوید الان قیمت کجای باند بولینگرِ 5 دقیقه‌ای است.
   لانگِ رادار نزدیک باند پایین (عقب‌نشینی) ورود بهتری است تا وسط یک جهش. فقط راهنمای زمان ورود است؛
   در کارنامه‌ی رادار سنجیده نشده. */
const RDCF=new Map();let RDCFQ=false;
async function rdConf(tk){
  const M5=3e5,X=await audCandles(tk,'5m',Math.floor((Date.now()-330*M5)/M5)*M5,330,true);
  const ser=scSeries(X,M5,'5m',null), d=scDecide(ser.at(Date.now()),scOpt({lev:+S.maxLev||10}));
  RDCF.set(tk,{at:Date.now(),d});return d;
}
function rdConfPump(list){
  if(RDCFQ)return;const todo=list.filter(x=>{const c=RDCF.get(x.tk);return !c||Date.now()-c.at>5*60e3;}).slice(0,6);if(!todo.length)return;
  RDCFQ=true;(async()=>{let n=0;for(const x of todo){try{await rdConf(x.tk);n++;}catch(e){RDCF.set(x.tk,{at:Date.now(),d:null});}}
    RDCFQ=false;if(n&&view==='radar'&&RDV==='sig')renderRadar();})();
}
function rdConfHtml(x){
  const c=RDCF.get(x.tk),d=c&&c.d;if(!d||!d.x)return '';
  const dir=x.dir,px=d.x,band=dir==='long'?px.bbL:px.bbU;
  let cl='mut',t;
  if(d.act===dir){cl='win';t='✓ تأیید 5 دقیقه‌ای: قیمت کنار باند '+(dir==='long'?'پایین':'بالا')+' است؛ جای ورود خوب';}
  else if(d.act&&d.act!=='wait'&&d.act!==dir||(d.why!=='mid'&&d.side!==dir)){cl='lose';t='⚠ 5 دقیقه‌ای خلاف جهت: قیمت کنار باند '+(dir==='long'?'بالا':'پایین')+'؛ برای ورود بهتر صبر کن تا نزدیک '+fmtPrice(band);}
  else if(d.why==='mid')t='ورود بهتر (عقب‌نشینی 5 دقیقه‌ای): نزدیک '+fmtPrice(band);
  else t='نزدیک جای ورود؛ تأیید 5 دقیقه‌ای کامل نیست ('+faN(d.score)+' از '+faN(d.checks.length)+')';
  return '<div class="glnum"><span class="pill '+cl+' rdconf" title="بولینگر و RSI روی کندل 5 دقیقه‌ای؛ راهنمای زمان ورود، سنجیده در کارنامه نیست">'+esc(t)+'</span></div>';
}
let RDV=(()=>{try{const v=localStorage.getItem('signaldesk.rdview')||'sig';return ['sig','test','model','log'].includes(v)?v:'sig';}catch(e){return 'sig';}})();
let RDMKOPEN=(()=>{try{return localStorage.getItem('signaldesk.rdmk')==='1';}catch(e){return false;}})();
/* کارت «وضعیت امروز»: یک حکم روشن، چند برچسب، هشدارها و دکمه‌های اصلی */
function rdHeroHtml(L){
  const H=rdHealth(), ok=L.filter(x=>x.ok), n=rdListOf().length;
  const opn={long:rdOpenDir('long','real'),short:rdOpenDir('short','real')},opt={long:rdOpenDir('long','test'),short:rdOpenDir('short','test')};
  let st,title,sub;
  if(!RD.at&&!RDQ.on){st='wait';title='هنوز بررسی نشده';sub='همین الان '+faN(RD_STEP)+' ارز اول بررسی می‌شود (بار اول هر ارز ~125 روز تاریخچه می‌گیرد؛ چند ثانیه برای هر ارز).';}
  else if(H.neg){st='stop';title='امروز معامله نکن';sub='مدل در هر دو جهت زیان‌ده است: لانگ <b dir="ltr">'+(H.d.long.n?fmtR(H.d.long.avg):'—')+'</b>، شورت <b dir="ltr">'+(H.d.short.n?fmtR(H.d.short.avg):'—')+'</b> میانگین هر معامله‌ی گذشته (بیرون از یادگیری). فقط «تست» بزن.';}
  else if(ok.length){st='go';title=faN(ok.length)+' فرصت قابل گرفتن';
    sub=ok.slice(0,4).map(x=>'<b dir="ltr">'+esc(x.tk)+'</b> '+(x.dir==='long'?'لانگ':'شورت')).join('، ')+(ok.length>4?' و '+faN(ok.length-4)+' تای دیگر':'')+'. پایین‌تر ببین و «ایزوله» یا «تست» بزن.';}
  else if(RD.M){st='wait';title='فرصت مطمئنی نیست';
    const L2=L.filter(x=>x.dir!=='wait'),w=k=>L2.filter(x=>x.why===k).length;
    sub=(L2.length?faN(L2.length)+' سیگنال هست ولی '+[w('stars')?faN(w('stars'))+' تا سابقه‌ی مطمئن ندارند':'',w('reg')?faN(w('reg'))+' تا خلاف روند بیت‌کوین‌اند':'',w('neg')?faN(w('neg'))+' تا در جهتی‌اند که مدل در کل زیان‌ده است':'',w('cap')?faN(w('cap'))+' تا پشت سقف هم‌جهت‌اند':''].filter(Boolean).join('، ')+'. ':'')+
      'صبر کن، «تست» بزن یا ارزهای بیشتری بررسی کن.';}
  else{st='wait';title='در حال یادگیری…';sub='بعد از گرفتن داده‌ی ارزها، مدل یاد می‌گیرد و سیگنال‌ها این‌جا می‌آیند.';}
  const chips=[];
  if(RD.reg)chips.push('<span class="rdchip '+(RD.reg==='bull'?'u':RD.reg==='bear'?'d':'')+'" title="روند بیت‌کوین (همان که مدل و ستاره‌ها با آن سنجیده می‌شوند)">روند بیت‌کوین '+RDREG_FA[RD.reg]+(MKT&&MKT.btc!=null?' · <bdi dir="ltr">'+fmtPct(MKT.btc)+'</bdi> در 24h':'')+'</span>');
  if(RD.mt0)chips.push('<span class="rdchip">مدل '+ageTxt(RD.mt0)+' · '+faN(RD.ncoin||n)+' ارز</span>');
  if(RD.ex)chips.push('<span class="rdchip">خروج: '+rbExTxt()+'</span>');
  if(opn.long||opn.short)chips.push('<span class="rdchip'+(opn.long>=RD_CAP||opn.short>=RD_CAP?' w':'')+'" title="پوزیشن‌های واقعیِ رادار">باز واقعی: '+faN(opn.long)+' لانگ · '+faN(opn.short)+' شورت (سقف '+faN(RD_CAP)+')</span>');
  if(opt.long||opt.short)chips.push('<span class="rdchip" title="معامله‌های آزمایشی؛ سقف خودشان را دارند و جلوی سیگنال واقعی را نمی‌گیرند">تست باز: '+faN(opt.long)+' لانگ · '+faN(opt.short)+' شورت</span>');
  let h='<div class="rdhero '+st+'"><div class="rdht"><i>'+(st==='go'?'✓':st==='stop'?'✕':'…')+'</i><div><b>'+title+'</b><span>'+sub+'</span></div></div>'+
    (chips.length?'<div class="rdchips">'+chips.join('')+'</div>':'');
  // یک جهت زیان‌ده: فقط همان جهت بسته است
  if(!H.neg)for(const d of ['long','short'])if(H.d[d].neg){const o=d==='long'?'short':'long';
    h+='<div class="rdwarn bad"><span><b>'+(d==='long'?'لانگ‌ها':'شورت‌ها')+'ی مدل در کل زیان‌ده‌اند</b> (میانگین <bdi dir="ltr">'+fmtR(H.d[d].avg)+'</bdi> در '+faN(H.d[d].n)+' معامله)؛ فعلاً فقط '+(o==='long'?'لانگ':'شورت')+
      (H.d[o].n?' (میانگین <bdi dir="ltr">'+fmtR(H.d[o].avg)+'</bdi>)':'')+' می‌تواند «قابل گرفتن» باشد.</span></div>';}
  if(H.few&&RD.M){const need=Math.max(0,Math.min(RD_NC_OK,RD_MAX)-n);
    h+='<div class="rdwarn"><span>ستاره‌ها روی '+faN(H.nc)+' ارز ساخته شده‌اند؛ برای اعتماد دست‌کم '+faN(RD_NC_OK)+' ارز لازم است'+(H.cap<5?' (فعلاً ستاره حداکثر 3)':'')+'.</span>'+
      (need?rdBtn('data-rd50="1"','plus','رساندن به '+faN(RD_NC_OK)+' ارز','add','در حال بررسی ارزها'):'')+'</div>';}
  h+='<div class="rdbar"><span class="rdcnt">'+(n?faN(n)+' ارز':'')+'</span><small id="rdProg">'+(RDQ.on?'':RD.at?ageTxt(RD.at):'')+'</small>'+
    rdBtn('data-rdrun="1"','refresh','تازه کن','refresh','در حال تازه کردن')+
    '<button class="btn sm rdhelpb" data-rdhelp="1" title="امتیاز، ستاره، کِی وارد شوم" aria-label="راهنما">'+ic('info')+'<span>راهنما</span></button>'+
    (n<RD_MAX?rdBtn('data-rdmore="1"','plus',faN(RD_STEP)+' ارز بعدی','more','در حال بررسی'):'')+'</div>'+
    (RDQ.on?rdProgHtml():'')+'</div>';
  return h;
}
/* بازار کل در یک خط؛ با زدن، کارت‌های حال بازار، TOTAL و دامیننس‌ها باز می‌شود */
function rdMktHtml(){
  if((!MKT||Date.now()-MKT.at>MK_TTL)&&Date.now()-MKTRY>120000){MKTRY=Date.now();const was=MKT&&MKT.at;
    mktLoad().then(m=>{if(m&&m.at!==was)rdRepaintNow();}).catch(()=>{});}
  let r=null;try{r=mdMetrics(MD);}catch(e){}
  const bits=[];
  if(MKT)bits.push('24h <b>'+MK_REG_FA[MKT.reg]+'</b>');
  if(r){bits.push('TOTAL <bdi dir="ltr" class="'+cls(r.tot[1])+'">'+fmtPct(r.tot[1])+'</bdi>');bits.push('BTC.D <bdi dir="ltr">'+fmtNum(r.bd[0])+'%</bdi>');bits.push('USDT.D <bdi dir="ltr">'+fmtNum(r.ud[0])+'%</bdi>');}
  return mkStripHtml(bits);
}
/* نوار تاشوی «بازار کل» (مشترک «بازار» و «الان چه کنم؟»): یک خط خلاصه، با زدن حال بازار و TOTAL و دامیننس‌ها */
function mkStripHtml(bits){
  if(!bits){bits=[];let r=null;try{r=mdMetrics(MD);}catch(e){}
    if(MKT)bits.push('24h <b>'+MK_REG_FA[MKT.reg]+'</b>');
    if(r){bits.push('TOTAL <bdi dir="ltr" class="'+cls(r.tot[1])+'">'+fmtPct(r.tot[1])+'</bdi>');bits.push('BTC.D <bdi dir="ltr">'+fmtNum(r.bd[0])+'%</bdi>');}}
  return '<details class="rdmk"'+(RDMKOPEN?' open':'')+'><summary>'+ic('bars')+'<span class="rdmkh">بازار کل</span><span class="rdmks">'+(bits.length?bits.join(' · '):'در حال گرفتن…')+'</span></summary>'+
    (MKT?mktHtml(MKT,null):'')+mdHtml()+'</details>';
}
function mkStripBind(g){const mk=g.querySelector('.rdmk');if(mk)mk.ontoggle=()=>{RDMKOPEN=mk.open;try{localStorage.setItem('signaldesk.rdmk',RDMKOPEN?'1':'0');}catch(e){}};}
function rdHtml(){
  const L=rdList(), ob=rbOpen();
  if(RDV==='test'||RDV==='log')return '<div class="glb">'+rbHtml(RDV)+'</div>';
  if(RDV==='model')return '<div class="glb">'+(RDQ.on?rdProgHtml():'')+rdModelHtml()+'</div>';
  const fv=x=>!VIEW.mktFav||rdIsFav(x.tk);
  const fd=VIEW.mktDir||'all', sig=L.filter(x=>x.dir!=='wait'), act=sig.filter(x=>(fd==='all'||x.dir===fd)&&(!VIEW.mktOk||x.ok)&&(!VIEW.mktDiv||rdDivOf(x)>0)&&fv(x)),
    hid=sig.length-act.length, wait=L.filter(x=>x.dir==='wait').filter(fv);
  let h='<div class="glb">'+rdHeroHtml(L);
  // انتخاب ارزها: بازه‌ی رتبه، نماد، واچ‌لیست
  const LL=rdListOf();
  h+='<details class="sec sub2 rdpick"'+(RDPICKOPEN?' open':'')+'><summary>'+ic('search')+'انتخاب ارزها و واچ‌لیست'+(RDFAV.length?' ('+faN(RDFAV.length)+' ★)':'')+'</summary>'+
    '<div class="rdpk"><input id="rdPickIn" placeholder="20-40 · 200 تا 231 · ETH, SOL, PEPE" autocomplete="off" dir="auto"><button class="btn sm ok" data-rdadd="1"'+(RDQ.on?' disabled':'')+'>'+ic('plus')+'<span>بررسی</span></button></div>'+
    '<div class="hint">بازه‌ی رتبه (ارزش بازار CoinGecko، بی استیبل‌کوین‌ها؛ تا حدود 450) یا یک یا چند نماد با فاصله یا ویرگول. فقط ارزهای تازه گرفته می‌شوند و مدل با آن‌ها دوباره یاد می‌گیرد. سقف فهرست '+faN(RD_MAX)+' ارز.</div>'+
    '<div class="rdfav">'+(RDFAV.length?RDFAV.map(t=>'<span class="pill gold" data-favtk="'+esc(t)+'">★ <b dir="ltr">'+esc(t)+'</b>'+(LL.includes(t)?'':' <small>(بررسی‌نشده)</small>')+'</span>').join(''):'<span class="hint">واچ‌لیست خالی است؛ روی ☆ هر ارز بزن.</span>')+'</div>'+
    '<div class="srow">'+(RDFAV.length?'<button class="btn sm" data-rdfavscan="1"'+(RDQ.on?' disabled':'')+'>'+ic('star')+'<span>بررسی واچ‌لیست</span></button>':'')+
      '<button class="btn sm side" data-rdreset="1"'+(RDQ.on?' disabled':'')+'>'+ic('undo')+'<span>از نو: فقط '+faN(RD_STEP)+' ارز اول'+(RDFAV.length?' و واچ‌لیست':'')+'</span></button></div></details>';
  h+=rdMktHtml();
  const okL=act.filter(x=>x.ok), weak=act.filter(x=>!x.ok);let i=0;
  if(okL.length)h+='<div class="rdsh go"><b>قابل گرفتن</b><i>'+faN(okL.length)+'</i></div>'+okL.map(x=>rdRowHtml(x,i++)).join('');
  if(weak.length)h+='<div class="rdsh"><b>بی اعتبار کافی</b><i>'+faN(weak.length)+'</i><small>فقط برای «تست»</small></div>'+weak.map(x=>rdRowHtml(x,i++)).join('');
  if(!act.length&&RD.at)h+='<div class="empty">'+(hid?'با فیلتر بالای صفحه سیگنالی نماند.':VIEW.mktFav?'هیچ‌کدام از ارزهای واچ‌لیست الان سیگنال ندارد؛ «انتخاب ارزها» ← «بررسی واچ‌لیست».':'الان هیچ ارزی امتیاز '+faN(RD_MIN)+'+ ندارد.')+'</div>';
  if(hid&&act.length)h+='<div class="hint">'+faN(hid)+' سیگنال دیگر با فیلتر بالای صفحه پنهان است.</div>';
  if(wait.length)h+='<details class="sec sub2 rdwait"><summary><b>صبر</b> ('+faN(wait.length)+' ارز با امتیاز زیر '+faN(RD_MIN)+')</summary><div class="rdwl">'+
    wait.map(x=>'<span class="pill mut">'+(rdIsFav(x.tk)?'★':'')+'<b dir="ltr">'+esc(x.tk)+'</b> <span class="'+(x.best==='long'?'win':'lose')+'">'+(x.best==='long'?'L':'S')+faN(x.sc)+'</span></span>').join('')+'</div></details>';
  return h+'</div>';
}
/* تب «بازار» (مستقل، در نوار پایین): نوار فیلتر خودش و همان رادار */
const rdRepaintNow=()=>{if(view==='radar')renderRadar();};
function rdFbar(){
  const bar=$('#rdFbar');if(!bar)return;bar.innerHTML='';
  const chip=(row,label,on,fn)=>{const b=el('button','fc'+(on?' on':''),'<span>'+label+'</span>');b.setAttribute('aria-pressed',on?'true':'false');b.onclick=fn;row.appendChild(b);return b;};
  const set=o=>{Object.assign(VIEW,o);lsSet(VIEWKEY,VIEW);renderRadar();};
  const seg=el('div','fseg');seg.setAttribute('role','tablist');
  const ob=rbOpen();
  for(const [k,t,n,ti] of [['sig','سیگنال‌ها',rdCount(),'فرصت‌های قابل گرفتن'],['test','آزمایشی',ob.test,'معامله‌های آزمایشی باز'],['model','کارنامه',null,'مدل چقدر درست گفته'],['log','دفتر',null,'دفتر پیشنهادها: همه‌ی پیشنهادها و نتیجه‌شان']]){
    const b=el('button','fb'+(RDV===k?' on':''),'<span>'+t+'</span>'+(n!=null?'<i>'+faN(n)+'</i>':''));b.title=ti;b.setAttribute('role','tab');b.setAttribute('aria-selected',RDV===k?'true':'false');
    b.onclick=()=>{RDV=k;try{localStorage.setItem('signaldesk.rdview',RDV);}catch(e){}renderRadar();window.scrollTo({top:0,behavior:'smooth'});};seg.appendChild(b);}
  bar.appendChild(seg);
  if(RDV!=='sig')return;
  const row=el('div','frow ftab rdflt'),g=el('div','fcg');g.appendChild(el('span','fcl','جهت'));
  for(const [v,t] of [['all','همه'],['long','لانگ'],['short','شورت']])chip(g,t,(VIEW.mktDir||'all')===v,()=>set({mktDir:v}));
  row.appendChild(g);
  chip(row,'فقط قابل گرفتن',!!VIEW.mktOk,()=>set({mktOk:!VIEW.mktOk}));
  chip(row,'واگرایی هم‌جهت',!!VIEW.mktDiv,()=>set({mktDiv:!VIEW.mktDiv}));
  chip(row,'★ واچ‌لیست',!!VIEW.mktFav,()=>set({mktFav:!VIEW.mktFav}));
  bar.appendChild(row);
}
function renderRadar(){const g=$('#rdView');if(!g)return;paintRadar(g);}
function paintRadar(g){
  rdFbar();g.className='rdview';g.innerHTML=rdHtml();
  if(!RDQ.on&&(Date.now()-RD.at>30*60000||!RD.rank.length))setTimeout(()=>rdScan('refresh'),300);
  try{rbCatchUp();}catch(e){}
  const mo=g.querySelector('[data-rdmore]');if(mo)mo.onclick=()=>{rdScan('more');paintRadar(g);};
  const r=g.querySelector('[data-rdrun]');if(r)r.onclick=()=>{rdScan('refresh');paintRadar(g);};
  const ln=g.querySelector('[data-rdlearn]');if(ln)ln.onclick=()=>{
    if(RDQ.on){RDQ.next='learn';toast('بعد از تمام شدن بررسی فعلی، مدل از نو یاد می‌گیرد','info');}else rdScan('learn');paintRadar(g);};
  const pk=g.querySelector('.rdpick');if(pk)pk.ontoggle=()=>{RDPICKOPEN=pk.open;};
  const ad=g.querySelector('[data-rdadd]'),inp=g.querySelector('#rdPickIn');
  const doAdd=()=>{const L=rdParsePick(inp.value);if(!L.length){toast('بازه (مثلاً 20-40) یا نماد (مثلاً ETH SOL) بنویس','err');return;}
    const nw=L.filter(t=>!rdListOf().includes(t));toast(nw.length?faN(nw.length)+' ارز تازه بررسی می‌شود: '+nw.slice(0,8).join('، ')+(nw.length>8?'…':''):'همه‌شان در فهرست‌اند؛ تازه می‌شوند','info');
    rdScan(nw.length?'add':'refresh',nw);paintRadar(g);};
  if(ad)ad.onclick=doAdd;if(inp)inp.onkeydown=e=>{if(e.key==='Enter')doAdd();};
  const r50=g.querySelector('[data-rd50]');if(r50)r50.onclick=()=>{const L0=rdListOf(),nw=rdUniverse(RD_NC_OK).filter(t=>!L0.includes(t)).slice(0,Math.max(0,RD_MAX-L0.length));
    if(!nw.length)return;toast(faN(nw.length)+' ارز تازه بررسی می‌شود (چند دقیقه)','info');rdScan('add',nw);paintRadar(g);};
  g.querySelectorAll('[data-rdhelp]').forEach(b=>b.onclick=rdGuide);
  g.querySelectorAll('[data-gos]').forEach(b=>b.onclick=()=>{openPanel('setVeil');setTimeout(()=>{const f=$('#sFeeMk');if(f){const d=f.closest('details');if(d)d.open=true;f.scrollIntoView({block:'center',behavior:'smooth'});}},150);});
  mkStripBind(g);
  const fs=g.querySelector('[data-rdfavscan]');if(fs)fs.onclick=()=>{VIEW.mktFav=true;lsSet(VIEWKEY,VIEW);rdScan('add',RDFAV.slice());renderRadar();};
  const rs=g.querySelector('[data-rdreset]');if(rs)rs.onclick=async()=>{if(!(await askConfirm({title:'فهرست رادار از نو',tone:'danger',msg:'فهرست به '+faN(RD_STEP)+' ارز اول'+(RDFAV.length?' و واچ‌لیست':'')+' برمی‌گردد و بقیه‌ی ارزها از رادار بیرون می‌روند.',ok:'از نو',cancel:'نه'})))return;
    const keep=new Set(rdUniverse(RD_STEP).concat(RDFAV));for(const t of rdListOf())if(!keep.has(t))rdRemove(t);
    RD.list=[...keep];rdSave();rdScan('add',[]);paintRadar(g);};
  g.querySelectorAll('[data-favtk]').forEach(b=>b.onclick=()=>{rdFavToggle(b.dataset.favtk);paintRadar(g);});
  if(RDV!=='sig'){rbBind(g);return;}
  // تأیید ورود 5 دقیقه‌ای برای چند سیگنال بالای فهرست (پنج دقیقه در حافظه)
  try{rdConfPump(rdList().filter(x=>x.dir!=='wait').slice(0,6));}catch(e){}
  g.querySelectorAll('.rdit').forEach(w=>{const x=rdList().find(y=>y.tk===w.dataset.rd);if(!x)return;
    const fb=w.querySelector('[data-a="fav"]');if(fb)fb.onclick=e=>{e.stopPropagation();const on=rdFavToggle(x.tk);toast(on?x.tk+' به واچ‌لیست آمد':x.tk+' از واچ‌لیست رفت','info');paintRadar(g);};
    const rmb=w.querySelector('[data-a="rm"]');if(rmb)rmb.onclick=()=>{rdRemove(x.tk);toast(x.tk+' از فهرست رادار بیرون رفت','info');paintRadar(g);};
    if(!x.pl)return;
    const k={tk:x.tk,k:'radar',t:RD.at,pl:x.pl,dir:x.dir};
    w.querySelectorAll('[data-a]:not([data-a="fav"]):not([data-a="rm"])').forEach(b=>b.onclick=()=>{
      const p={id:'radar/'+x.tk+'/'+RD.at,num:0,text:'رادار بازار: '+x.tk+' '+(x.dir==='long'?'لانگ':'شورت')+' · امتیاز '+x.sc,date:new Date(),link:null,img:null,auto:true};
      if(b.dataset.a==='test'){const r=rbAddAsk(x);paintRadar(g);r.then(v=>{if(v)paintRadar(g);});return;}
      if(b.dataset.a==='iso'){const z=isoSize(x.pl.E,x.pl.SL),ex=rbExEff(x.dir),sg=asSig(k);
        // نقشه‌ی خروج رادار روی پوزیشن واقعی: تارگت‌ها به واحد R و سبک خروج هم‌ارز
        // (lad/trl: پله‌های +1R/+2R/+3R با سیو سود؛ q05: همه در +0.5R؛ h05: نصف در +0.5R و باقی در +1.5R؛ t1h: بستن خودکار بعد از 1 ساعت)
        // همیشه سه تارگت: تارگت اول همان نقشه‌ی رادار است و سبک انتخاب‌شده همان را اجرا می‌کند؛ دو تارگت بعدی
        // برای سبک‌های دیگر («همه در تارگت 2»، «متعادل»، «پله‌ای») است تا هر کدام عدد خودش را بدهد (با یک تارگت همه یکی می‌شدند)
        const sn=x.dir==='long'?1:-1,tR=r=>+(x.pl.E*(1+sn*x.pl.sd*r)).toPrecision(8),
          M={tp:[[1.5,3,5],'s1'],lad:[[1,2,3],'rd'],trl:[[1,2,3],'rd'],q03:[[0.3,0.6,1],'s1'],q05:[[0.5,1,1.5],'s1'],q075:[[0.75,1.5,2.25],'s1'],q1:[[1,2,3],'s1'],
            q05c:[[0.5,1,1.5],'s1'],sar:[[0.5,1.5,2.5],'bal'],h05:[[0.5,1.5,2.5],'bal'],t1h:[[0.5,1,1.5],'s1']}[ex];
        if(M)sg.targets=M[0].map(tR);
        sheetEnter(p,sg,{stop:x.pl.SL,lev:z?z.lev:null,amt:z?z.margin:null,market:'futures'},PRICES.get(x.tk)||x.pl.E,
          {iso:true,untilAuto:true,pb:M?M[1]:'s1',note:(rdFees().lm?'ورود Limit · ':'')+'رادار بازار · امتیاز '+x.sc+(x.stars?' · '+x.stars+'★':'')+(ex!=='tp'?' · خروج: '+rdExPlans()[ex].n:''),until:Date.now()+(ex==='t1h'?1:AS_HOLD)*36e5});}
      else copyExch(p,asSig(k),{stop:x.pl.SL,market:'futures'},PRICES.get(x.tk)||x.pl.E);});});
}
