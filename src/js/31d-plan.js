/* ==================== نقشه‌ی معامله‌ی کوتاه‌مدت (برای رادار) ====================
   «پیشنهاد برنامه» (قاعده‌های شکست کف/سقف و تقاطع میانگین) برداشته شد؛ رادار همین کار را با مدل
   سنجیده انجام می‌دهد. فقط نقشه ماند: ورود = بسته شدن کندل، استاپ = 1.5 برابر ATR یک‌ساعته
   (بین 0.6٪ و سقف ایزوله)، هدف = تارگت اول تنظیمات (به R)، حداکثر 24 ساعت. */
const AS_HOLD=24;
function asAtr(C,i){let s=0,n=0;for(let j=Math.max(1,i-13);j<=i;j++){const k=C[j],pc=C[j-1].c;s+=Math.max(k.h-k.l,Math.abs(k.h-pc),Math.abs(k.l-pc));n++;}return n?s/n:null;}
/* ATR روی کندل‌های n ساعته که از کندل یک‌ساعته ساخته می‌شوند (14 کندل، آخری به i ختم می‌شود) */
function asAtrN(C,i,n){if(!(n>1))return asAtr(C,i);let s=0,k=0;
  for(let b=0;b<14;b++){const e=i-b*n,st=e-n+1;if(st<1)break;let h=-Infinity,l=Infinity;for(let j=st;j<=e;j++){h=Math.max(h,C[j].h);l=Math.min(l,C[j].l);}
    const pc=C[st-1].c;s+=Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc));k++;}
  return k?s/k:null;}
/* ---- حجم: پروفایل حجم 30 روزه و شکست از فشردگی ----
   پروفایل: حجم هر کندل یک‌ساعته روی محدوده‌ی قیمتش پخش می‌شود (48 خانه)؛ «سطح پرحجم» (HVN) خانه‌ای است که از دو
   همسایه‌اش بیشتر و دست‌کم 1.3 برابر میانگین است: قیمت آن‌جا مکث یا برمی‌گردد (تارگت طبیعی). */
function volLevels(C,i){
  const n=Math.min(720,i+1),a=i-n+1;if(n<48)return null;let lo=Infinity,hi=-Infinity;
  for(let j=a;j<=i;j++){lo=Math.min(lo,C[j].l);hi=Math.max(hi,C[j].h);}
  const B=48,w=(hi-lo)/B;if(!(w>0))return null;const v=new Float64Array(B);
  for(let j=a;j<=i;j++){const k=C[j],b0=Math.max(0,Math.floor((k.l-lo)/w)),b1=Math.min(B-1,Math.floor((k.h-lo)/w)),per=(k.v||0)/(b1-b0+1);for(let b=b0;b<=b1;b++)v[b]+=per;}
  const mean=v.reduce((s,x)=>s+x,0)/B;if(!(mean>0))return null;const nodes=[];let poc=0;
  for(let b=0;b<B;b++){if(v[b]>v[poc])poc=b;if(b>0&&b<B-1&&v[b]>=v[b-1]&&v[b]>=v[b+1]&&v[b]>1.3*mean)nodes.push(+(lo+(b+0.5)*w).toPrecision(8));}
  return {nodes,poc:+(lo+(poc+0.5)*w).toPrecision(8)};
}
/* سطح پرحجم بعدی در جهت معامله، دست‌کم نیم برابر فاصله‌ی استاپ دورتر از ورود */
function volTarget(vp,E,dir,sd){if(!vp)return null;const s=dir==='short'?-1:1,min=E*(1+s*0.5*(sd||0.01));
  const L=vp.nodes.filter(x=>(x-min)*s>0).sort((a,b)=>(a-b)*s);return L.length?L[0]:null;}
/* شکست از فشردگی با حجم در 3 کندل اخیر: 12 کندل قبلش در محدوده‌ی حداکثر 4×ATR، کندل شکست با حجم دست‌کم
   1.5 برابر میانگین 20 کندل و بسته شدن بیرون از محدوده. «حجم دیررس»: در 6 کندل اخیر دست‌کم 3 کندل پرحجم و
   حرکت بیش از 3×ATR در یک جهت؛ یعنی حرکت انجام شده و دیر رسیده‌ایم. */
function volSignal(C,i){
  if(i<40)return null;const atr=asAtr(C,i);if(!(atr>0))return null;
  const av=k=>{let s=0,n=0;for(let j=Math.max(0,k-20);j<k;j++){s+=C[j].v||0;n++;}return n?s/n:0;};
  let bo=null;
  for(let j=i;j>=i-2;j--){let ph=-Infinity,pl=Infinity;for(let q=j-12;q<j;q++){ph=Math.max(ph,C[q].h);pl=Math.min(pl,C[q].l);}
    const rv=(C[j].v||0)/(av(j)||Infinity);
    if(ph-pl<=4*atr&&rv>=1.5){if(C[j].c>ph){bo={d:1,t:C[j].t,lo:C[j].l,hi:C[j].h,rv:+rv.toFixed(2)};break;}if(C[j].c<pl){bo={d:-1,t:C[j].t,lo:C[j].l,hi:C[j].h,rv:+rv.toFixed(2)};break;}}}
  let hv=0;for(let j=i-5;j<=i;j++)if((C[j].v||0)>=1.5*(av(j)||Infinity))hv++;
  const mv=(C[i].c-C[i-6].c)/atr;
  return {bo,late:hv>=3&&Math.abs(mv)>=3?Math.sign(mv):0};
}
/* استاپ ساختاری: زیر کف کندل شکست (اگر هست)، وگرنه زیر کف 6 کندل اخیر (برای شورت بالای سقف)؛ 0.1٪ حاشیه */
function volStop(C,i,dir,vs){const s=dir==='short'?-1:1;
  if(vs&&vs.bo&&vs.bo.d===s)return +((s>0?vs.bo.lo:vs.bo.hi)*(1-s*0.001)).toPrecision(8);
  let x=s>0?Infinity:-Infinity;for(let j=Math.max(0,i-5);j<=i;j++)x=s>0?Math.min(x,C[j].l):Math.max(x,C[j].h);
  return isFinite(x)?+(x*(1-s*0.001)).toPrecision(8):null;}
/* hz: افق رادار (atrH: کندل ATR به ساعت، atrM: چند برابر ATR)؛ بی hz همان 1.5×ATR یک‌ساعته */
function asPlan(C,i,dir,E,hz){
  hz=hz||{atrH:1,atrM:1.5};E=E||C[i].c;const atr=asAtrN(C,i,hz.atrH);if(!atr||!(E>0))return null;
  const sd=Math.min(Math.max(hz.atrM*atr/E,0.006),isoMaxSd()/100), sign=dir==='long'?1:-1, rr=+(S.rMul&&S.rMul[0])||1.5;
  return {dir,E,SL:+(E*(1-sign*sd)).toPrecision(8),TP:+(E*(1+sign*sd*rr)).toPrecision(8),sd,rr};
}
/* سیگنال برای فرم ورود و خروجی صرافی */
function asSig(x){return {isSignal:true,ticker:x.tk,direction:x.dir,dirSet:true,entry:x.pl.E,stop:x.pl.SL,targets:[x.pl.TP],
  market:'futures',marketGuess:false,leverage:null,trigger:null,tier2:null,hasNum:true};}
