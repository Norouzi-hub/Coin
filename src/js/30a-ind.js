/* ==================== اندیکاتورهای مشترک (از بخش اسکلپِ حذف‌شده) ====================
   بخش اسکلپ برداشته شد؛ این تکه‌ها جای دیگر به کار می‌آیند:
   - swAggr: کندل‌های بزرگ‌تر از کندل‌های کوچک (4 ساعته و روزانه‌ی رادار، رویدادهای حال بازار)
   - scSeries و scDecide: «تأیید ورود 5 دقیقه‌ای» رادار (قیمت کجای باند بولینگرِ 5 دقیقه‌ای است)
   - fmtNum و medOf: نمایش عدد و میانه
   همه‌ی اندیکاتورها «علّی»اند: مقدار کندل i فقط از کندل‌های 0 تا i ساخته می‌شود. */
const fmtNum=v=>v==null||!isFinite(v)?'—':String(+(+v).toFixed(v<1?2:1));
function swAggr(C,ms){
  const out=[];
  for(const k of C){const t=Math.floor(k.t/ms)*ms, b=out[out.length-1];
    if(b&&b.t===t){b.h=Math.max(b.h,k.h);b.l=Math.min(b.l,k.l);b.c=k.c;b.v+=k.v||0;}
    else out.push({t,o:k.o,h:k.h,l:k.l,c:k.c,v:k.v||0});}
  return out;
}
function indEma(v,n){
  const k=2/(n+1), out=new Array(v.length).fill(null);let e=null,s=0;
  for(let i=0;i<v.length;i++){
    if(i<n){s+=v[i];if(i===n-1){e=s/n;out[i]=e;}continue;}
    e=v[i]*k+e*(1-k);out[i]=e;
  }
  return out;
}
function indRsi(c,n){
  n=n||14;const out=new Array(c.length).fill(null);let ag=0,al=0;
  for(let i=1;i<c.length;i++){
    const d=c[i]-c[i-1], g=d>0?d:0, l=d<0?-d:0;
    if(i<=n){ag+=g/n;al+=l/n;if(i<n)continue;}
    else{ag=(ag*(n-1)+g)/n;al=(al*(n-1)+l)/n;}
    out[i]=al===0?(ag===0?50:100):100-100/(1+ag/al);
  }
  return out;
}
function indAtr(C,n){
  n=n||14;const out=new Array(C.length).fill(null);let a=null,s=0;
  for(let i=0;i<C.length;i++){
    const k=C[i], pc=i?C[i-1].c:k.o, tr=Math.max(k.h-k.l,Math.abs(k.h-pc),Math.abs(k.l-pc));
    if(i<n){s+=tr;if(i===n-1){a=s/n;out[i]=a;}}else{a=(a*(n-1)+tr)/n;out[i]=a;}
  }
  return out;
}
function indBB(c,n,m){
  n=n||20;m=m||2;const mid=new Array(c.length).fill(null), up=mid.slice(), lo=mid.slice();
  for(let i=n-1;i<c.length;i++){
    let s=0;for(let j=i-n+1;j<=i;j++)s+=c[j];
    const av=s/n;let q=0;for(let j=i-n+1;j<=i;j++)q+=(c[j]-av)*(c[j]-av);
    const sd=Math.sqrt(q/n);mid[i]=av;up[i]=av+m*sd;lo[i]=av-m*sd;
  }
  return {mid,up,lo};
}
/* VWAP روزانه (از ۰۰:۰۰ UTC = ۳:۳۰ تهران از نو). اگر منبع حجم نداد، میانگین ساده‌ی قیمت معمول */
function indVwap(C){
  const out=[];let day=null,pv=0,vv=0;
  for(const k of C){const d=Math.floor(k.t/864e5);if(d!==day){day=d;pv=0;vv=0;}
    const v=k.v>0?k.v:1;pv+=(k.h+k.l+k.c)/3*v;vv+=v;out.push(pv/vv);}
  return out;
}
/* حجم کندل نسبت به میانگینِ ۲۰ کندلِ قبلش */
function indVolR(C,n){
  n=n||20;const out=new Array(C.length).fill(null);let s=0;
  for(let i=0;i<C.length;i++){
    if(i>=n&&s>0)out[i]=(C[i].v||0)/(s/n);
    s+=C[i].v||0;if(i>=n)s-=C[i-n].v||0;
  }
  return out;
}
const medOf=v=>{if(!v.length)return null;const b=v.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;};

/* همه‌ی اندیکاتورها یک بار روی کل سری؛ at(T): وضعیتِ بازار در لحظه‌ی T فقط از کندل‌های بسته تا T.
   X: کندل‌های اجرا (۱ یا ۵ دقیقه‌ای)، tf: تایم‌فریم تصمیم، BX: کندل‌های بیت‌کوین (اختیاری) */
const SC_HIST=26*36e5;                  // تاریخچه‌ی لازم پیش از هر تصمیم: ۲۴ ساعت نوسان + EMA۵۰ِ ۱۵ دقیقه‌ای
function scSeries(X,xms,tf,BX){
  const tfms=Math.max(IVMS[tf]||3e5,xms), TF=tfms===xms?X:swAggr(X,tfms);
  const c=TF.map(k=>k.c);
  const rsi=indRsi(c,14), atr=indAtr(TF,14), bb=indBB(c,20,2), vw=indVwap(TF), vr=indVolR(TF,20);
  const Q=xms<=9e5?swAggr(X,9e5):[], qc=Q.map(k=>k.c), e20=indEma(qc,20), e50=indEma(qc,50);
  const HH=swAggr(X,36e5), hr=HH.map(k=>(k.h-k.l)/k.l*100);
  const lb=(A,f)=>{let lo=0,hi=A.length;while(lo<hi){const m=(lo+hi)>>1;if(f(A[m]))hi=m;else lo=m+1;}return lo;};
  const bms=BX&&BX.length>1?BX[1].t-BX[0].t:0;
  const memo=new Map();
  const at=T=>{
    if(memo.has(T))return memo.get(T);
    const i=lb(TF,k=>k.t+tfms>T)-1;let x=null;
    if(i>=25&&atr[i]!=null&&bb.mid[i]!=null&&rsi[i-2]!=null){
      const j=lb(Q,k=>k.t+9e5>T)-1, h=lb(HH,k=>k.t+36e5>T)-1, hs=h>=0?hr.slice(Math.max(0,h-23),h+1):[];
      let btc=null;
      if(bms){const b1=lb(BX,k=>k.t+bms>T)-1, b0=lb(BX,k=>k.t+bms>T-9e5)-1;
        if(b1>=0&&b0>=0&&b1>b0&&T-(BX[b1].t+bms)<=5*60e3)btc=(BX[b1].c/BX[b0].c-1)*100;}
      x={t:T,p:TF[i].c,k:TF[i],kp:TF[i-1],rsi:rsi[i],rsiP:rsi[i-1],rsiLo:Math.min(rsi[i],rsi[i-1],rsi[i-2]),rsiHi:Math.max(rsi[i],rsi[i-1],rsi[i-2]),
        atr:atr[i],bbU:bb.up[i],bbL:bb.lo[i],bbM:bb.mid[i],bbUp:bb.up[i-1],bbLp:bb.lo[i-1],vwap:vw[i],volR:vr[i],
        e20:j>=0?e20[j]:null,e50:j>=0?e50[j]:null,hm:hs.length>=4?medOf(hs):null,hn:hs.length,btc,i};
    }
    memo.set(T,x);return x;
  };
  return {TF,tfms,bb,vw,at};
}

const SC_FLT={trend:'روند ۱۵ دقیقه (EMA ۲۰/۵۰)',vwap:'سمتِ درستِ VWAP',rsi:'RSI از اشباع برگشته',rej:'کندل برگشتی',vol:'بدون شکستِ پرحجم',btc:'بیت‌کوین خلاف جهت نریخته'};
const SC_WHY={mid:'قیمت وسطِ باندهاست؛ نه سودِ کافی دارد نه استاپِ نزدیک.',score:'قیمت کنار باند است ولی تأیید کافی نیست.',
  cost:'تارگت در برابر کارمزد و لغزش کوچک است؛ این معامله ارزش ندارد.',in:'وارد شد',wild:'بیش از حد پرنوسان است؛ استاپ با این اهرم به لیکوئید نزدیک می‌شد.',nodata:'هنوز کندل کافی نیست.'};
/* o: {lev, fee, slip, miss: حداکثر شرطِ ردشده, flt:{trend,vwap,...}} — شرطِ خاموش هرگز رد نمی‌شود */
function scDecide(x,o){
  if(!x)return {act:'wait',why:'nodata',checks:[],score:0,need:0};
  const lev=+o.lev||10, cost=(+o.fee||0)+2*(+o.slip||0), flt=o.flt||{}, p=x.p;
  const w=x.bbU-x.bbL, pb=w>0?(p-x.bbL)/w:0.5;
  const trend=x.e20==null||x.e50==null?'flat':x.e20>x.e50&&p>x.e50?'up':x.e20<x.e50&&p<x.e50?'down':'flat';
  const hm=x.hm!=null?x.hm:x.atr/p*100*4;
  // نوسانِ معمول در همان مدتی که معامله باز می‌ماند: با جذرِ زمان (۵ دقیقه ≈ ۰.۲۹ نوسانِ یک ساعت)
  const tmax=+o.tmax||60, hmT=hm*Math.sqrt(tmax/60), costX=+o.costX||3;
  const near=pb<=0.15?'long':pb>=0.85?'short':null, side=near||(pb<0.5?'long':'short');
  const sg=side==='long'?1:-1, k=x.k, kp=x.kp, rng=k.h-k.l;
  const tpD=Math.min(Math.max(Math.abs(x.bbM-p),1.2*x.atr),0.6*hmT/100*p);
  const ext=sg>0?Math.min(k.l,kp.l):Math.max(k.h,kp.h);
  const slD=Math.max(1.2*x.atr,Math.abs(p-ext)+0.2*x.atr);
  const plan={side,en:p,tp:p+sg*tpD,stop:p-sg*slD,tpP:tpD/p*100,slP:slD/p*100};
  const all={
    trend:sg>0?trend!=='down':trend!=='up',
    vwap:sg>0?p>x.vwap:p<x.vwap,
    rsi:sg>0?x.rsiLo<=35&&x.rsi>x.rsiP:x.rsiHi>=65&&x.rsi<x.rsiP,
    rej:rng>0&&(sg>0?((Math.min(k.o,k.c)-k.l)/rng>=0.4&&k.c>=k.l+rng/2)||(kp.c<x.bbLp&&k.c>x.bbL)
                     :((k.h-Math.max(k.o,k.c))/rng>=0.4&&k.c<=k.h-rng/2)||(kp.c>x.bbUp&&k.c<x.bbU)),
    vol:!(x.volR!=null&&x.volR>=2&&(sg>0?k.c<k.o&&k.c<x.bbL:k.c>k.o&&k.c>x.bbU)),
    btc:x.btc==null||(sg>0?x.btc>-0.5:x.btc<0.5)
  };
  const keys=Object.keys(SC_FLT).filter(f=>flt[f]!==false&&!(f==='btc'&&x.btc==null));
  const checks=keys.map(f=>({k:f,ok:!!all[f]}));
  const score=checks.filter(c=>c.ok).length, miss=o.miss!=null?+o.miss:2, need=Math.max(0,keys.length-miss);
  const liqP=(1/lev-MMR)*100;
  let act='wait',why='';
  if(!near)why='mid';
  else if(plan.tpP<costX*cost)why='cost';
  else if(plan.slP>=liqP*0.8||plan.slP*lev>=60)why='wild';
  else if(checks.length-score>miss)why='score';
  else act=near;
  return {act,side,why,pb,trend,hm,hmT,tmax,costX,checks,score,need,plan,x,cost};
}
/* تنظیم‌های تصمیم 5 دقیقه‌ای (برای تأیید ورود رادار) */
const scOpt=o=>({lev:+o.lev||10,fee:o.fee!=null?+o.fee:+S.fee||0,slip:o.slip!=null?+o.slip:Math.max(0,+S.slip||0),
  miss:o.miss!=null?+o.miss:2,tmax:+o.tmax||60,costX:+o.costX||3,flt:Object.assign({},o.flt||{})});
