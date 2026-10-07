/* ==================== رادار بازار: ارزهای اول بازار، لانگ یا شورت، با احتمال و کارنامه‌ی صادق ====================
   داده (برای هر ارز، بی استیبل‌کوین و توکن‌های بسته‌بندی‌شده):
   - کندل یک‌ساعته‌ی ~125 روز (3000 کندل) در IndexedDB؛ بار اول کامل، بعد فقط کندل‌های تازه
   - جریان پول از فیوچرز بایننس (همان داده‌ی جدول‌های کوین‌گلس)؛ بایننس فقط ~20 روز اخیر را می‌دهد،
     پس هر بار که می‌گیریم روی گوشی جمع می‌شود تا تاریخچه‌اش کم‌کم بلند شود
   22 عامل: روند 4 و 1 ساعته، MACD، RSI، شکست 7 روزه، حجم، روند بیت‌کوین، فاصله از میانگین، قدرت نسبی
   به بیت‌کوین (7 روز)، روند روزانه (EMA50)، فشردگی نوسان، نهنگ‌ها در برابر مردم، ازدحام مردم، خرید/فروش
   تهاجمی، OI همراه قیمت، حال بازار (صعودی/نزولی)، و کل بازار: TOTAL، TOTAL2، TOTAL3، دامیننس بیت‌کوین و تتر.
   مدل: رگرسیون لجستیک (با کوچک‌سازی L2)، جدا برای لانگ و شورت، مستقیم روی نتیجه‌ی همان معامله‌ای که
   پیشنهاد می‌شود (استاپ 1.5×ATR، هدف تارگت اول، ریسک‌فری بعد از +1R، حداکثر 24 ساعت، بعد از کارمزد):
   «آیا سود داد؟». همه‌ی عامل‌ها با هم سنجیده می‌شوند، پس عامل‌های هم‌معنی دوبار شمرده نمی‌شوند.
   امتیاز = صدک احتمال مدل در گذشته (امتیاز 90 = از 90٪ لحظه‌های گذشته امیدوارکننده‌تر)؛ سیگنال از 70 به بالا.
   کارنامه‌ی صادق: آزمون پیش‌رونده (یادگیری روی گذشته، سنجش روی دوره‌ی بعد، سه بار)، برای هر ارز در هر
   لحظه فقط یک معامله‌ی باز، و ستاره از «بدترین حالت محتمل» (کران پایین 90٪، با خوشه‌بندی روزانه چون
   ارزها با هم بالا و پایین می‌روند). */
const RD_KEY='signaldesk.radar.v4', RD_HIST=3000, RD_STEP=10, RD_MAX=100, RD_MIN=70;
const RD_CF=['t4','t1','macd','rsi','brk','vol','btc','ext','rs','d50','volc','whale','crowd','taker','oi','rbull','rbear'];
/* عامل‌های کل بازار (برای همه‌ی ارزها در یک لحظه یکی): همه طوری که «+» یعنی به نفع بالا رفتن */
const RD_MF=['mtot','mt2','mt3','mbd','mud'], RD_FEAT=RD_CF.concat(RD_MF), RD_F0=RD_CF.length;
const RD_FLOW=['whale','crowd','taker','oi'], RD_NOSIGN=['volc','rbull','rbear'];
const RD_FA={t4:'روند 4 ساعته',t1:'روند 1 ساعته',macd:'MACD',rsi:'RSI',brk:'شکست 7 روزه',vol:'حجم',btc:'روند بیت‌کوین',ext:'فاصله از میانگین',
  rs:'قدرت نسبی به بیت‌کوین',d50:'روند روزانه',volc:'فشردگی نوسان',
  whale:'نهنگ‌ها در برابر مردم',crowd:'ازدحام مردم',taker:'خرید/فروش تهاجمی',oi:'Open Interest',rbull:'بازار صعودی',rbear:'بازار نزولی',
  mtot:'کل بازار (TOTAL)',mt2:'TOTAL2',mt3:'TOTAL3 (آلت‌ها)',mbd:'دامیننس بیت‌کوین',mud:'دامیننس تتر'};
const RD_B=['70-85','85-95','95+'];
const RD_SKIP=/^(USDT|USDC|FDUSD|TUSD|DAI|BUSD|USDP|USDD|USDE|SUSDE|USDS|PYUSD|USD0|USD1|RLUSD|EURC|EURT|PAXG|XAUT|WBTC|WETH|WBETH|STETH|WSTETH|WEETH|CBBTC|BTCB|RETH|METH|LEO|BSC-USD|BFUSD|USDF)$/;
const rdEmpty=()=>({v:4,at:0,n:0,coins:{},calib:{},rel:null,M:null,fund:{},rank:[],reg:null,nflow:0,ns:0});
let RD=(()=>{const a=lsGet(RD_KEY);return a&&a.v===4?a:rdEmpty();})();
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
function rdPrep(C,B,FL){
  const H=36e5,c=C.map(k=>k.c),v=C.map(k=>k.v||0);
  const e20=emaArr(c,20),e50=emaArr(c,50),m12=emaArr(c,12),m26=emaArr(c,26);
  const macd=c.map((_,i)=>m12[i]-m26[i]),sig=emaArr(macd,9),hist=macd.map((x,i)=>x-sig[i]),rsi=rsiArr(c,14);
  const F=swAggr(C,4*H),f=F.map(k=>k.c),f20=emaArr(f,20),f50=emaArr(f,50),fIdx=new Map(F.map((k,j)=>[k.t,j]));
  const D=swAggr(C,24*H),d50=emaArr(D.map(k=>k.c),50),dIdx=new Map(D.map((k,j)=>[k.t,j]));
  // ATR (میانگین ساده‌ی 14 TR) و جمع تجمعی TR برای «فشردگی نوسان»
  const tr=C.map((k,i)=>i?Math.max(k.h-k.l,Math.abs(k.h-C[i-1].c),Math.abs(k.l-C[i-1].c)):k.h-k.l), pre=[0];
  for(let i=0;i<tr.length;i++)pre.push(pre[i]+tr[i]);
  let bt=null,bc=null;
  if(B&&B.length>250&&B!==C){const BF=swAggr(B,4*H),bf=BF.map(k=>k.c),b20=emaArr(bf,20),b50=emaArr(bf,50);
    bt=new Map(BF.map((k,j)=>[k.t,j>=50?clamp1((b20[j]-b50[j])/b50[j]/0.01):null]));bc=new Map(B.map(k=>[k.t,k.c]));}
  return {C,c,v,e20,e50,hist,rsi,F,f20,f50,fIdx,D,d50,dIdx,pre,bt,bc,FL:FL||null,reg:rdRegMap(B||C)};
}
/* عامل‌ها در کندل i (بسته‌شده): هر کدام حدود −1..+1، یا null اگر داده نیست */
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
/* معامله با ریسک‌فری: بعد از +1R استاپ به ورود (از کندل بعد) */
function rdWalk(C,i,pl){
  const sign=pl.dir==='long'?1:-1, cost=(2*(+S.fee||0)+(+S.slip||0))/100/pl.sd, R1=pl.E*(1+sign*pl.sd);
  let be=false;
  for(let j=i+1;j<C.length&&j<=i+AS_HOLD;j++){
    const k=C[j], stop=be?pl.E:pl.SL;
    if(sign>0?k.l<=stop:k.h>=stop)return {R:(be?0:-1)-cost,j,how:be?'be':'sl'};
    if(sign>0?k.h>=pl.TP:k.l<=pl.TP)return {R:pl.rr-cost,j,how:'tp'};
    if(!be&&(sign>0?k.h>=R1:k.l<=R1))be=true;
  }
  const end=Math.min(C.length-1,i+AS_HOLD);if(end<i+AS_HOLD)return null;
  return {R:(C[end].c-pl.E)*sign/(pl.E*pl.sd)-cost,j:end,how:'time'};
}
/* نمونه‌های یک ارز: هر 2 ساعت، عامل‌ها و نتیجه‌ی معامله‌ی لانگ و شورت از همان لحظه */
function rdSamples(P,tk){
  const C=P.C,H=36e5,F=RD_F0,last=C[C.length-1].t+H>Date.now()?C.length-2:C.length-1;
  const t=[],X=[],R={long:[],short:[]},J={long:[],short:[]},G=[];
  for(let i=210;i<=last-AS_HOLD;i+=2){
    const r=rdParts(P,i);if(!r)continue;
    const w={};
    for(const d of ['long','short']){const pl=asPlan(C,i,d);w[d]=pl&&rdWalk(C,i,pl);}
    if(!w.long||!w.short)continue;
    t.push(C[i].t);X.push(...rdVec(r.p));G.push(P.reg?P.reg(C[i].t):null);
    for(const d of ['long','short']){R[d].push(w[d].R);J[d].push(C[w[d].j].t);}
  }
  return {tk,t,X:Float32Array.from(X),R,J,G,F};
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
function rdFit(SS,d,tEnd){
  const F=RD_FEAT.length,F0=RD_F0,K=F+1,rows=[];
  for(const s of SS)for(let q=0;q<s.t.length;q++)if(s.J[d][q]<tEnd)rows.push(s,q);
  const n=rows.length/2;if(n<300)return null;
  const step=Math.max(1,Math.ceil(n/40000)), lam=0.02*n/step;
  const w=new Float64Array(K);
  for(let it=0;it<7;it++){
    const g=new Float64Array(K),A=new Float64Array(K*K),x=new Float64Array(K);x[F]=1;
    for(let r=0;r<rows.length;r+=2*step){const s=rows[r],q=rows[r+1],o=q*F0,X=s.X,mr=RDMF.get(s.t[q]);
      let z=w[F];for(let k=0;k<F;k++){x[k]=k<F0?X[o+k]:mr?mr[k-F0]:0;z+=w[k]*x[k];}
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
/* ---- کارنامه‌ی صادق ---- */
function rdAdd(cal,k,R,t){const o=cal[k]||(cal[k]={n:0,w:0,r:0,d:{}});o.n++;o.r+=R;if(R>0)o.w++;
  const day=Math.floor(t/864e5),x=o.d[day]||(o.d[day]=[0,0]);x[0]+=R;x[1]++;}
/* میانگین و کران پایین 90٪ با خوشه‌بندی روزانه (معامله‌های یک روز با هم حرکت می‌کنند) */
function rdSum(o){const D=Object.values(o.d),G=D.length,m=o.r/o.n;let v=0;for(const [r,n] of D)v+=(r-n*m)**2;
  const se=G>1?Math.sqrt(v*G/(G-1))/o.n:Infinity;return {n:o.n,w:o.w,r:+o.r.toFixed(3),g:G,lb:+(m-1.2816*se).toFixed(3)};}
/* سنجش یک دوره با مدلی که آن دوره را ندیده: برای هر ارز در هر لحظه فقط یک معامله‌ی باز */
function rdEvalFold(SS,M,a,b,cal,rel,busy){
  const F=RD_F0;
  for(const s of SS){let free=busy.get(s.tk)||0;
    for(let q=0;q<s.t.length;q++){const t=s.t[q];if(t<a||t>=b)continue;
      const o=q*F,mr=RDMF.get(t),pL=rdPred(M.long,s.X,o,mr),pS=rdPred(M.short,s.X,o,mr);
      for(const [d,p] of [['long',pL],['short',pS]]){const bi=Math.min(5,Math.max(0,Math.floor(p*10)-2)),x=rel[d][bi];x[0]++;x[1]+=p;if(s.R[d][q]>0)x[2]++;
        rdAdd(cal,'base|'+d,s.R[d][q],t);}
      const sL=rdPct(M.long,pL),sS=rdPct(M.short,pS),d=sL>=sS?'long':'short',sc=Math.max(sL,sS);
      if(sc<RD_MIN||t<free)continue;
      const R=s.R[d][q],bk=rdBucket(sc),g=s.G[q];free=s.J[d][q];
      rdAdd(cal,d,R,t);rdAdd(cal,d+'|'+bk,R,t);if(g){rdAdd(cal,d+'|'+g,R,t);rdAdd(cal,d+'|'+g+'|'+bk,R,t);}
    }
    busy.set(s.tk,free);}
}
/* آزمون پیش‌رونده روی نیمه‌ی دوم (سه دوره) + مدل نهایی روی همه برای الان */
async function rdModel(){
  const SS=[...RDS.values()].filter(s=>s.t.length);if(!SS.length)return false;
  let t0=Infinity,t1=-Infinity;for(const s of SS){t0=Math.min(t0,s.t[0]);t1=Math.max(t1,s.t[s.t.length-1]);}
  const cut=[0.5,2/3,5/6,1].map(f=>t0+(t1-t0)*f);cut[3]=t1+1;
  const cal={},rel={long:Array.from({length:6},()=>[0,0,0]),short:Array.from({length:6},()=>[0,0,0])},busy=new Map();
  for(let k=0;k<3;k++){
    RDQ.msg='سنجش صادقانه: دوره‌ی '+(k+1)+' از 3 (یادگیری روی گذشته، سنجش روی بعدش)…';RDQ.pm=k/4;rdPaintProg();await rdYield();
    const M={long:rdFit(SS,'long',cut[k])};await rdYield();M.short=rdFit(SS,'short',cut[k]);
    if(M.long&&M.short)rdEvalFold(SS,M,cut[k],cut[k+1],cal,rel,busy);
  }
  RDQ.msg='یادگیری مدل نهایی روی همه‌ی داده…';RDQ.pm=3/4;rdPaintProg();await rdYield();
  const ML=rdFit(SS,'long',Infinity);await rdYield();const MS=rdFit(SS,'short',Infinity);
  RDQ.msg='';RDQ.pm=1;
  if(!ML||!MS)return false;
  const C2={};for(const k in cal)C2[k]=rdSum(cal[k]);
  Object.assign(RD,{mt0:Date.now(),M:{long:ML,short:MS},calib:C2,rel,ns:SS.reduce((s,x)=>s+x.t.length,0),span:[t0,t1],ncoin:SS.length});
  return true;
}
/* ستاره از کارنامه‌ی بیرون از یادگیری: 0 = نمونه‌ی کم، 1 = زیان، 2 = سود ولی شاید شانس، 3+ = حتی در بدترین حالت محتمل سود */
function rdStars(o){if(!o||o.n<20||(o.g||0)<5)return 0;const a=o.r/o.n;return a<=0?1:o.lb<=0?2:o.lb<0.1?3:o.lb<0.25?4:5;}
const rdStarHtml=s=>s?'<span class="rdst s'+s+'" title="'+s+' از 5">'+'★'.repeat(s)+'<i>'+'☆'.repeat(5-s)+'</i></span>':'<span class="rdst s0">نمونه‌ی کم</span>';
const rdCell=o=>{if(!o||!o.n)return '<small>—</small>';const a=Math.round(o.r/o.n*100)/100||0;return rdStarHtml(rdStars(o))+'<small><b class="'+cls(a)+'" dir="ltr">'+(a?fmtR(a):'0.00R')+'</b></small><small>'+faN(Math.round(o.w/o.n*100))+'٪ برد</small><small class="n">'+faN(o.n)+' بار</small><small class="n">'+faN(o.g||0)+' روز</small>';};

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
  // همه‌ی ارزهای بررسی‌شده (نه فقط آن‌هایی که همین بار در حافظه‌اند)، تا بازسازی هر بار یکی باشد
  for(const tk of new Set([...RDS.keys(),...(RD.rank||[])])){if(tk==='BTC'||tk==='ETH'||RD_STB.test(tk))continue;const c=MD.caps[tk]&&MD.caps[tk][0];if(!c)continue;
    const a=rel(await local(tk));if(!a)continue;An+=c;for(let i=0;i<N;i++)A[i]+=c*a[i];}
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
      clamp1(-(bd[i]-bd[i-24])/1.0),clamp1(-(ud[i]-ud[i-24])/0.3)]);}
  const L=N-1;
  RD.mkl={totE:(tot[L]/em[L]-1)*100,t2c:(t2[L]/t2[L-24]-1)*100,t3c:(t3[L]/t3[L-24]-1)*100,bdD:bd[L]-bd[L-24],udD:ud[L]-ud[L-24],cov:+(1-Rn/Tn).toFixed(3)};
  // نمودار کوچک 7 روزه (هر 4 ساعت)
  const pick=a=>{const o=[];for(let i=Math.max(0,N-168);i<N;i+=4)o.push(+a[i].toPrecision(5));o.push(+a[L].toPrecision(5));return o;};
  RD.mk7={tot:pick(tot),t2:pick(t2),t3:pick(t3),bd:pick(bd),ud:pick(ud),ed:pick(ed)};
  return true;
}
/* بررسی پله‌پله: «more» = ده ارز بعدی، «refresh» = تازه کردن همه‌ی ارزهای بررسی‌شده (ده‌تا‌ده‌تا) */
async function rdScan(mode){
  if(RDQ.on)return;
  mode=mode||'refresh';
  const want=mode==='more'?Math.min(RD_MAX,(RD.n||0)+RD_STEP):Math.max(RD.n||0,RD_STEP);
  Object.assign(RDQ,{on:true,done:0,n:0,msg:'گرفتن فهرست ارزها (ارزش بازار از CoinGecko)…',t0:Date.now(),tc:0,pm:0,fin:false,mode});RDQ.cur.clear();
  clearInterval(RDQ.iv);RDQ.iv=setInterval(rdPaintProg,1000);rdPaintProg();
  try{
    await Promise.all([rdCapLoad(),mdLoad()]);
    // refresh: داده‌ی تازه برای همه؛ more و learn: فقط ارزهای تازه از شبکه، بقیه از حافظه
    const U=rdUniverse(want), fresh=tk=>mode==='refresh'||!RDS.has(tk);
    // مدل و ستاره‌ها پایدار می‌مانند: فقط روزی یک بار، با «10 ارز بعدی» یا «یادگیری دوباره» از نو یاد گرفته می‌شوند
    const fit=mode==='learn'||mode==='more'||!RD.M||Date.now()-(RD.mt0||0)>24*36e5;
    RDQ.n=U.filter(tk=>fresh(tk)||!RDS.has(tk)).length;RDQ.msg='گرفتن تاریخچه‌ی بیت‌کوین (برای روند و حال بازار)…';rdPaintProg();
    let B=null;try{B=await rdCandles('BTC',true);}catch(e){}
    if(B){RDQ.msg='بازسازی تاریخچه‌ی TOTAL و دامیننس‌ها…';rdPaintProg();try{await rdMktBuild(B);}catch(e){}}
    RDQ.msg='';RDQ.tc=Date.now();
    if(B&&B.length>30){const H=36e5,k=B[B.length-1].t+H>Date.now()?B.length-2:B.length-1;RD.reg=rdRegMap(B)(B[k].t)||RD.reg;}
    const fundP=rdFundLoad();
    const one=async tk=>{
      if(!fresh(tk)&&RDS.has(tk))return false;
      RDQ.cur.set(tk,1);rdPaintProg();
      try{const [C,FL]=await Promise.all([tk==='BTC'&&B?B:rdCandles(tk,fresh(tk)),rdFlow(tk,fresh(tk))]);
        RDQ.cur.set(tk,2);rdPaintProg();await rdYield();
        if(C&&C.length>300){const P=rdPrep(C,B||C,FL),s=rdSamples(P,tk);s.live=rdLiveOf(P);RDS.set(tk,s);}}
      catch(e){}
      RDQ.cur.delete(tk);return true;
    };
    for(let a=0;a<U.length;a+=RD_STEP){
      const q=U.slice(a,a+RD_STEP);
      const worker=async()=>{while(q.length){const tk=q.shift();if(await one(tk)){RDQ.done++;rdPaintProg();}}};
      await Promise.all([worker(),worker(),worker()]);
      // مدل: بار اول بعد از همان ده ارز اول (تا زود چیزی دیده شود)، و آخر کار روی همه؛ در میانه همان مدل قبلی
      RDQ.fin=a+RD_STEP>=U.length;
      if(!RD.M||RDQ.fin){const m0=Date.now();RDQ.pm=0;
        if(B){RDQ.msg='بازسازی تاریخچه‌ی TOTAL و دامیننس‌ها…';rdPaintProg();try{await rdMktBuild(B);}catch(e){}}
        if(fit||!RD.M){await rdModel();if(RDQ.fin)RD.mt=Date.now()-m0;}
        RDQ.pm=1;}
      rdLive(U);
      if(view==='signals')renderSignals();
    }
    RD.fund=(await fundP)||RD.fund||{};
    if(RDQ.n)RD.ct=Math.round((Date.now()-RDQ.tc)/RDQ.n);
    rdLive(U);RD.at=Date.now();rdSave();
    try{rbLogAuto();}catch(e){}
  }finally{RDQ.on=false;RDQ.msg='';RDQ.cur.clear();clearInterval(RDQ.iv);}
  if(view==='signals')renderSignals();
}
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
  RD.coins=coins;RD.rank=rank;RD.n=Math.max(RD.n||0,Math.min(U.length,RD_MAX));
  RD.nflow=rank.filter(t=>coins[t].flow).length;
}
/* نوار پیشرفت: درصد، کار الان، زمان گذشته و تخمین مانده (85٪ گرفتن ارزها، 15٪ سنجش و یادگیری) */
const rdMmss=ms=>{const s=Math.max(0,Math.round(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
function rdProgInner(){
  const now=Date.now(),n=RDQ.n,d=RDQ.done;
  let pct=n?85*d/n:2;if(RDQ.fin)pct=85+15*RDQ.pm;pct=Math.max(1,Math.min(99,Math.round(pct)));
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
  const b=$('#rdProg');if(b)b.textContent=RDQ.on?'':(RD.at?ageTxt(RD.at):'');
  if(!RDQ.on&&box)box.remove();
}
/* رتبه‌ی هر ارز: کارنامه‌ی همان جهت و شدت در همان حال بازار (اگر بس است)، وگرنه بی حال بازار */
function rdRate(x){
  if(x.dir==='wait')return null;
  const b=rdBucket(x.sc), c1=RD.reg?RD.calib[x.dir+'|'+RD.reg+'|'+b]:null, c2=RD.calib[x.dir+'|'+b];
  const o=rdStars(c1)?c1:c2;return o?{o,stars:rdStars(o),exp:o.n?o.r/o.n:null,lb:o.lb,reg:o===c1}:null;
}
function rdList(){
  const out=[];
  for(const tk of RD.rank){const x=RD.coins[tk];if(!x)continue;
    const rt=rdRate(x), exp=rt?rt.exp:null;
    out.push(Object.assign({tk,rt,cb:rt&&rt.o,exp,stars:rt?rt.stars:0,ok:!!rt&&rt.stars>=3},x));}
  out.sort((a,b)=>(b.ok-a.ok)||(b.stars-a.stars)||(((b.rt&&b.rt.lb)??-9)-((a.rt&&a.rt.lb)??-9))||(b.sc-a.sc));
  return out;
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
  const sp=RD.span?Math.round((RD.span[1]-RD.span[0])/864e5/2):0;
  let h='<div class="rdpan"><div class="mkh"><b>'+ic('bars')+'کارنامه‌ی سیگنال‌ها</b><small>'+(sp?faN(sp)+' روز آخر، ':'')+'بیرون از یادگیری</small></div>';
  const tbl=(title,pre)=>'<div class="sechd">'+title+'</div><table class="rdtab"><thead><tr><th></th><th>همه</th>'+RD_B.map(b=>'<th dir="ltr">'+b+'</th>').join('')+'</tr></thead><tbody>'+
    ['long','short'].map(d=>'<tr><td><span class="pill '+d+'">'+(d==='long'?'لانگ':'شورت')+'</span></td><td>'+rdCell(cal[d+pre])+'</td>'+RD_B.map(b=>'<td>'+rdCell(cal[d+pre+'|'+b])+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  if(reg)h+=tbl('در بازار '+RDREG_FA[reg]+' (مثل الان'+(MKT&&MKT.btc!=null?': بیت‌کوین '+fmtPct(MKT.btc)+' در 24 ساعت':'')+')','|'+reg);
  h+=tbl('در همه‌ی حال‌های بازار','');
  const bl=cal['base|long'],bs=cal['base|short'];
  h+='<div class="hint rdcap">ستون‌ها: امتیاز (صدک؛ 90 یعنی از 90٪ لحظه‌های گذشته امیدوارکننده‌تر). هر خانه: ستاره، میانگین R بعد از کارمزد، درصد برد، تعداد معامله و روزها. '+
    '<b>ستاره‌ی 3 به بالا</b> یعنی حتی در بدترین حالتِ محتمل (90٪) سودده بوده؛ 2 ستاره یعنی سود داده ولی ممکن است شانس باشد.'+
    (bl&&bs?' برای مقایسه، معامله در هر لحظه بی‌انتخاب: لانگ <b class="'+cls(bl.r/bl.n)+'" dir="ltr">'+fmtR(bl.r/bl.n)+'</b>، شورت <b class="'+cls(bs.r/bs.n)+'" dir="ltr">'+fmtR(bs.r/bs.n)+'</b>.':'')+'</div>';
  // کار امروز: دسته‌های جهت×شدت که در حال بازار امروز (یا در کل) بدترین حالتشان هم سود است
  const cand=[];
  for(const d of ['long','short'])for(const b of RD_B){const o=reg?cal[d+'|'+reg+'|'+b]:null, p=rdStars(o)?o:cal[d+'|'+b];
    if(rdStars(p)>=3)cand.push({d,b,o:p,a:p.r/p.n});}
  cand.sort((x,y)=>y.o.lb-x.o.lb);
  const bad=['long','short'].filter(d=>{const o=reg&&rdStars(cal[d+'|'+reg])?cal[d+'|'+reg]:cal[d];return rdStars(o)===1;});
  const nm=x=>'<b>'+(x.d==='long'?'لانگ':'شورت')+'‌های امتیاز <bdi dir="ltr">'+x.b+'</bdi></b> ('+faN(rdStars(x.o))+' ستاره، '+faN(Math.round(x.o.w/x.o.n*100))+'٪ برد، <bdi dir="ltr">'+fmtR(x.a)+'</bdi>)';
  h+='<div class="flag '+(cand.length?'u':'w')+' rdtodo"><i>'+(cand.length?'✓':'!')+'</i><span><b>کار امروز:</b> '+
    (cand.length?'فقط '+cand.slice(0,2).map(nm).join(' و ')+'.':'هیچ دسته‌ای هنوز سابقه‌ی مطمئن (3 ستاره) ندارد — صبر کن، با «تست» امتحان کن یا ارزهای بیشتری بررسی کن.')+
    (bad.length?' '+bad.map(d=>(d==='long'?'لانگ':'شورت')).join(' و ')+' در این حال بازار زیان داده؛ نگیر.':'')+'</span></div>';
  // صداقت مدل: احتمالی که گفت در برابر آنچه شد
  if(RD.rel){const lab=['زیر 30٪','30-40٪','40-50٪','50-60٪','60-70٪','70٪+'];
    h+='<details class="sec sub2"><summary>صداقت مدل: گفت چقدر، شد چقدر</summary><table class="rdtab rdrel"><thead><tr><th>مدل گفت</th><th>لانگ: شد</th><th>شورت: شد</th></tr></thead><tbody>'+
      lab.map((l,i)=>{const c=d=>{const x=RD.rel[d][i];return x[0]>=30?'<b>'+faN(Math.round(x[2]/x[0]*100))+'٪</b><small class="n">'+faN(x[0])+' بار</small>':'<small>—</small>';};
        return RD.rel.long[i][0]>=30||RD.rel.short[i][0]>=30?'<tr><td dir="ltr">'+l+'</td><td>'+c('long')+'</td><td>'+c('short')+'</td></tr>':'';}).join('')+
      '</tbody></table><div class="hint">اگر ستون «شد» نزدیک «گفت» است و با آن بالا می‌رود، مدل واقعاً چیزی می‌فهمد؛ اگر همه یکی است، عامل‌ها پیش‌بینی ندارند.</div></details>';}
  // وزن‌های یادگرفته (برای شورت، علامت عامل‌های جهت‌دار برعکس می‌شود تا «+» یعنی به نفع همان معامله)
  if(RD.M){h+='<details class="sec sub2"><summary>وزن عامل‌ها (یادگرفته از '+faN(RD.ns||0)+' نمونه'+(RD.ncoin?' در '+faN(RD.ncoin)+' ارز':'')+')</summary><div class="rdwts">';
    for(const d of ['long','short']){const w=RD.M[d].w,ks=RD_FEAT.map((k,n)=>[k,d==='short'&&!RD_NOSIGN.includes(k)?-w[n]:w[n]]).filter(x=>Math.abs(x[1])>=0.02).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
      h+='<div><b>'+(d==='long'?'لانگ':'شورت')+':</b> '+(ks.length?ks.map(([k,v])=>'<span class="pill '+(v>0?'mut':'lose')+'">'+esc(RD_FA[k])+' <bdi dir="ltr">'+(v>0?'+':'−')+Math.abs(v).toFixed(2)+'</bdi></span>').join(''):'هیچ عاملی اثر روشن نداشت')+'</div>';}
    h+='<div class="hint">«+» یعنی این عامل به نفع همین جهت بوده؛ «−» یعنی برعکسِ انتظار عمل کرده. عامل‌های کم‌اثر نشان داده نمی‌شوند.</div></div></details>';}
  return h+'</div>';
}
function rdRowHtml(x,i){
  const z=x.pl?isoSize(x.pl.E,x.pl.SL):null, f=RD.fund&&RD.fund[x.tk], R=rdReasons(x), dn=x.dir==='long'?'لانگ':'شورت';
  return '<div class="glsig rdit'+(x.ok?'':' weak')+'" data-rd="'+esc(x.tk)+'"><div class="glit"><span class="rdrk">'+faN(i+1)+'</span><b dir="ltr">'+esc(x.tk)+'</b><span class="pill '+x.dir+'">'+dn+'</span>'+
      '<span class="rdsc '+(x.dir==='long'?'u':'d')+'">امتیاز '+faN(x.sc)+'</span>'+rdStarHtml(x.stars)+'</div>'+
    (x.cb?'<div class="glnum glh2">سابقه‌ی '+dn+'‌های امتیاز '+rdBucket(x.sc)+(x.rt.reg?' در بازار '+RDREG_FA[RD.reg]:'')+': '+faN(x.cb.n)+' بار در '+faN(x.cb.g||0)+' روز، '+faN(Math.round(x.cb.w/x.cb.n*100))+'٪ برد، میانگین <b class="'+cls(x.cb.r/x.cb.n)+'" dir="ltr">'+fmtR(x.cb.r/x.cb.n)+'</b>'+
      (x.cb.lb!=null&&isFinite(x.cb.lb)?'، بدترین حالت محتمل <b class="'+cls(x.cb.lb)+'" dir="ltr">'+fmtR(x.cb.lb)+'</b>':'')+'</div>':'')+
    (x.p!=null?'<div class="glnum">احتمال سود به گفته‌ی مدل: <b>'+faN(Math.round(x.p*100))+'٪</b>'+(x.since?' · سیگنال از ساعت <b dir="ltr">'+rdHH(x.since)+'</b>':'')+'</div>':'')+
    (x.wl!=null||x.rl!=null||x.tb!=null?'<div class="glnum rdflow">'+[x.wl!=null?'نهنگ‌ها <b>'+faN(Math.round(x.wl))+'٪</b> لانگ':'',x.rl!=null?'مردم <b>'+faN(Math.round(x.rl))+'٪</b> لانگ':'',
      x.tb!=null?'خرید تهاجمی <b>'+faN(Math.round(x.tb))+'٪</b>':'',x.doi!=null?'OI <b class="'+cls(x.doi)+'">'+fmtPct(x.doi)+'</b> (6 ساعت)':''].filter(Boolean).join(' · ')+'</div>':'')+
    '<div class="glnum rdwhy">'+R.map(r=>'<span class="pill '+(r.good==null?'mut':r.good?'win':'lose')+'">'+(r.good?'✓ ':r.good===false?'✗ ':'')+esc(r.t)+'</span>').join('')+
      (f!=null&&Math.abs(f)>=0.03?'<span class="pill mut" title="فاندینگ فیوچرز؛ در امتیاز نیست">فاندینگ '+fmtNum(f)+'٪ '+(f>0?'(لانگ‌ها شلوغ)':'(شورت‌ها شلوغ)')+'</span>':'')+
      (!x.flow?'<span class="pill mut">بی داده‌ی فیوچرز بایننس</span>':'')+'</div>'+
    (x.pl?'<div class="glnum">ورود <b dir="ltr">'+fmtPrice(x.pl.E)+'</b> · استاپ <b dir="ltr">'+fmtPrice(x.pl.SL)+'</b> ('+fmtNum(x.pl.sd*100)+'٪) · هدف <b dir="ltr">'+fmtPrice(x.pl.TP)+'</b> · ریسک‌فری در <bdi dir="ltr">+1R</bdi> · حداکثر '+faN(AS_HOLD)+' ساعت</div>':'')+
    '<div class="glact">'+(z?'<button class="btn sm ok" data-a="iso">'+ic('shield')+'<span>ایزوله '+faN(z.lev)+'x · '+fmtUsd(z.margin)+'</span></button>':'')+
      (x.pl?'<button class="btn sm" data-a="test" title="معامله‌ی آزمایشی: مثل واقعی دنبال می‌شود، بی پول">'+ic('flag')+'<span>تست</span></button>':'')+
      '<button class="btn sm side" data-a="copy" title="برای اپ صرافی">'+ic('share')+'</button></div></div>';
}
let RDV=(()=>{try{return localStorage.getItem('signaldesk.rdview')||'sig';}catch(e){return 'sig';}})();
function rdHtml(){
  const L=rdList(), act=L.filter(x=>x.dir!=='wait'), wait=L.filter(x=>x.dir==='wait'), ob=rbOpen();
  let h='<div class="glh"><b>'+ic('trend')+'رادار بازار</b><span>'+(L.length?faN(L.filter(x=>x.ok).length)+' فرصت با رتبه‌ی خوب از '+faN(L.length)+' ارز':'')+'</span></div><div class="glb">';
  h+='<div class="pbpick rdv">'+[['sig','سیگنال‌ها'],['test','آزمایشی'+(ob.test?' ('+faN(ob.test)+' باز)':'')],['log','دفتر پیشنهادها']].map(([k,t])=>'<button class="pbc'+(RDV===k?' on':'')+'" data-rdv="'+k+'">'+t+'</button>').join('')+'</div>';
  if(RDV!=='sig')return h+rbHtml(RDV)+'</div>';
  const n=RD.n||0;
  h+='<div class="rdbar"><span class="rdcnt">'+(n?'ارز 1 تا '+faN(Math.min(n,RD.rank.length||n))+' از '+faN(RD_MAX):'')+'</span>'+
    (n<RD_MAX?'<button class="btn sm" data-rdmore="1"'+(RDQ.on?' disabled':'')+'>'+ic('plus')+'<span>'+faN(RD_STEP)+' ارز بعدی</span></button>':'')+
    '<button class="btn sm" data-rdrun="1"'+(RDQ.on?' disabled':'')+'>'+ic('refresh')+'<span>تازه کن</span></button><small id="rdProg">'+(RDQ.on?'':RD.at?ageTxt(RD.at):'')+'</small></div>'+(RDQ.on?rdProgHtml():'');
  // چرا امتیاز عوض می‌شود: فقط با بسته شدن هر کندل ساعتی، و مدل/ستاره فقط وقتی دوباره یاد گرفته شود
  {const tt=Object.values(RD.coins).map(x=>x.t||0),t=tt.length?Math.max(...tt):0;
   if(t&&RD.mt0)h+='<div class="hint rdtime">امتیازها برای کندلِ بسته‌شده‌ی ساعت <b dir="ltr">'+rdHH(t+36e5)+'</b> است و تا بسته شدن کندل بعدی ('+'<b dir="ltr">'+rdHH(t+2*36e5)+'</b>) عوض نمی‌شود. '+
     'مدل و ستاره‌ها '+ageTxt(RD.mt0)+' یاد گرفته شده‌اند و روزی یک بار (یا با «10 ارز بعدی») از نو یاد گرفته می‌شوند. '+
     '<button class="lnk" data-rdlearn="1"'+(RDQ.on?' disabled':'')+'>یادگیری دوباره</button></div>';}
  if(!RD.at&&!RDQ.on)h+='<div class="hint">هنوز بررسی نشده؛ همین الان 10 ارز اول شروع می‌شود (بار اول هر ارز ~125 روز تاریخچه می‌گیرد؛ چند ثانیه برای هر ارز).</div>';
  if((!MKT||Date.now()-MKT.at>MK_TTL)&&Date.now()-MKTRY>120000){MKTRY=Date.now();const was=MKT&&MKT.at;
    mktLoad().then(m=>{if(m&&m.at!==was&&view==='signals')paintGlance();}).catch(()=>{});}
  if(MKT)h+=mktHtml(MKT,null);
  h+=mdHtml();
  h+=rdPanelHtml();
  act.forEach((x,i)=>{h+=rdRowHtml(x,i);});
  if(wait.length)h+='<div class="hint rdwait"><b>صبر</b> (امتیاز زیر '+faN(RD_MIN)+'): '+wait.map(x=>esc(x.tk)+' <span class="'+(x.best==='long'?'win':'lose')+'">'+(x.best==='long'?'L':'S')+faN(x.sc)+'</span>').join('، ')+'</div>';
  h+='<div class="hint">مدل: رگرسیون لجستیک، جدا برای لانگ و شورت، روی نتیجه‌ی همین معامله (بعد از کارمزد و با ریسک‌فری). 22 عامل: قیمت، بیت‌کوین، قدرت نسبی، روند روزانه، نوسان، جریان پول فیوچرز بایننس'+
    (RD.nflow!=null?' ('+faN(RD.nflow)+' ارز داده‌اش را داشتند)':'')+'، و کل بازار (TOTAL، TOTAL2، TOTAL3، دامیننس بیت‌کوین و تتر)'+(RD.mkl&&RD.mkl.cov?'؛ تاریخچه‌اش از ارزهای بررسی‌شده بازسازی شده که '+faN(Math.round(RD.mkl.cov*100))+'٪ کل بازارند':'')+'. کارنامه با آزمون پیش‌رونده: مدل هر دوره را ندیده سنجیده شده. سود گذشته تضمین آینده نیست؛ «تست» بزن و در «دفتر پیشنهادها» ببین در عمل چه شد.</div></div>';
  return h;
}
function paintRadar(g){
  g.className='glance gltab';g.innerHTML=rdHtml();
  if(!RDQ.on&&(Date.now()-RD.at>30*60000||!RD.rank.length))setTimeout(()=>rdScan('refresh'),300);
  try{rbCatchUp();}catch(e){}
  g.querySelectorAll('[data-rdv]').forEach(b=>b.onclick=()=>{RDV=b.dataset.rdv;try{localStorage.setItem('signaldesk.rdview',RDV);}catch(e){}paintRadar(g);});
  const mo=g.querySelector('[data-rdmore]');if(mo)mo.onclick=()=>{rdScan('more');paintRadar(g);};
  const r=g.querySelector('[data-rdrun]');if(r)r.onclick=()=>{rdScan('refresh');paintRadar(g);};
  const ln=g.querySelector('[data-rdlearn]');if(ln)ln.onclick=()=>{rdScan('learn');paintRadar(g);};
  if(RDV!=='sig'){rbBind(g);return;}
  g.querySelectorAll('.rdit').forEach(w=>{const x=rdList().find(y=>y.tk===w.dataset.rd);if(!x||!x.pl)return;
    const k={tk:x.tk,k:'radar',t:RD.at,pl:x.pl,dir:x.dir};
    w.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
      const p={id:'radar/'+x.tk+'/'+RD.at,num:0,text:'رادار بازار: '+x.tk+' '+(x.dir==='long'?'لانگ':'شورت')+' · امتیاز '+x.sc,date:new Date(),link:null,img:null,auto:true};
      if(b.dataset.a==='test'){rbAdd('test',x);paintRadar(g);return;}
      if(b.dataset.a==='iso'){const z=isoSize(x.pl.E,x.pl.SL);
        sheetEnter(p,asSig(k),{stop:x.pl.SL,lev:z?z.lev:null,amt:z?z.margin:null,market:'futures'},PRICES.get(x.tk)||x.pl.E,
          {iso:true,note:'رادار بازار · امتیاز '+x.sc+(x.stars?' · '+x.stars+'★':''),until:Date.now()+AS_HOLD*36e5});}
      else copyExch(p,asSig(k),{stop:x.pl.SL,market:'futures'},PRICES.get(x.tk)||x.pl.E);});});
}
