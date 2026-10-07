/* ==================== نوسان‌سنج ==================== */
/* «بُرد یا باخت» نمی‌گوید قیمت بعد از ورود چطور رفت و برگشت. اینجا برای هر سیگنال می‌سنجیم:
   - چند بار به تارگت ۱ رسید و برگشت و دوباره رسید
   - چند بار تا نزدیکِ استاپ آمد بی‌آنکه بخورد، و چند بار بعد از تارگت ۱ به ورود برگشت
   - عمیق‌ترین افت پیش از سود و بیشترین سودِ در دسترس (به R: فاصله‌ی ورود تا استاپ = ۱R)
   - «باند»: با اهرم و درصدِ روی مارجینِ خودت (مثلاً ۲۰٪ با اهرم ۱۰ = ۲٪ حرکت قیمت) چند بار به
     +باند رسید، چند بار به −باند، و چند بار از یک سر به سرِ دیگر رفت (همان «+۲۰ و بعد −۲۰»)
   و برای یک توکن بدون سیگنال: در چند روز اخیر چند حرکتِ دست‌کم به اندازه‌ی باند داشته و آیا با
   آن اهرم لیکوئید می‌شدی.
   فقط وقتی دکمه را بزنی می‌سنجد (کندل گرفتن برای صدها سیگنال سنگین است)؛ نتیجه می‌ماند.

   «لمس دوباره» فقط وقتی شمرده می‌شود که قیمت در این فاصله دست‌کم ۰.۵R عقب کشیده باشد؛ وگرنه
   لرزیدن روی خودِ تارگت ده بار حساب می‌شد. داخل هر کندل ترتیبِ تقریبی: کندل سبز اول کف بعد سقف،
   کندل قرمز اول سقف بعد کف. */
const SWKEY='signaldesk.swing.v1', SWOPTKEY='signaldesk.swopt.v1';
const SWING=lsGet(SWKEY)||{};                   // شناسه‌ی پست ← {k, at, prof}
const SWOPT=Object.assign({lev:10,roi:20,win:'sig',near:0.75,hys:0.5,days:3,tk:'',tf:'5m',dir:'auto',me:'',mt:'',ms:'',mg:'',open:'tok',
  style:'scalp',tmax:60,tearly:20,miss:2,costX:3,flt:{}},lsGet(SWOPTKEY)||{});
/* سبک: اسکلپ (اندیکاتورها، حداکثر حدود یک ساعت) یا رنج (کف و سقف چند ساعت تا چند روز) */
const SW_STYLE={scalp:'اسکلپ (تا ۱ ساعت)',range:'رنج (ساعت‌ها تا روزها)'};
const swScalp=()=>SWOPT.style!=='range';
/* چند شرطِ تأیید می‌تواند رد شود و باز هم وارد شود (۹۹ = بدون تأیید) */
const SW_TMAX={5:'۵ دقیقه',10:'۱۰ دقیقه',15:'۱۵ دقیقه',30:'۳۰ دقیقه',60:'۶۰ دقیقه',90:'۹۰ دقیقه',120:'۱۲۰ دقیقه'}, SW_TEARLY={0:'خاموش',2:'۲ دقیقه در ضرر',3:'۳ دقیقه در ضرر',5:'۵ دقیقه در ضرر',10:'۱۰ دقیقه در ضرر',20:'۲۰ دقیقه در ضرر',30:'۳۰ دقیقه در ضرر'};
/* تارگت دست‌کم چند برابرِ کارمزد و لغزش باشد تا معامله «ارزش» داشته باشد */
const SW_COSTX={1.5:'۱.۵ برابر',2:'۲ برابر',3:'۳ برابر',4:'۴ برابر'};
const SW_MISS={0:'هیچ (همه برقرار)',1:'۱ شرط',2:'۲ شرط',3:'۳ شرط',99:'بی‌محدودیت (بدون تأیید)'};
const swMissTxt=m=>+m>=99?'بدون تأیید':+m===0?'همه‌ی شرط‌ها':'حداکثر '+faN(m)+' شرطِ رد';
/* تایم‌فریم: کوچک‌تر یعنی ترتیبِ بالا و پایینِ داخل هر کندل دقیق‌تر، ولی کندل بیشتر و کندتر */
const SW_TF={'1m':'۱ دقیقه','3m':'۳ دقیقه','5m':'۵ دقیقه','30m':'۳۰ دقیقه','1h':'۱ ساعت'};
const SW_TFBASE={'3m':'1m','30m':'5m'};        // اگر هیچ منبعی این را نداشت، از کوچک‌تر ساخته می‌شود
const SW_WIN={sig:'تا پایان سیگنال',h24:'۲۴ ساعت',d3:'۳ روز',d7:'۷ روز'};
const SW_WINH={h24:24,d3:72,d7:168};
const swOptSave=()=>lsSet(SWOPTKEY,SWOPT);
function swSave(){
  const ks=Object.keys(SWING);
  if(ks.length>400)ks.sort((a,b)=>(SWING[a].at||0)-(SWING[b].at||0)).slice(0,ks.length-400).forEach(k=>delete SWING[k]);
  try{lsSet(SWKEY,SWING);}catch(e){}
}
const swBand=o=>(+o.roi||20)/(+o.lev||10)/100;                  // باند به کسرِ حرکت قیمت
const swKey=(inp,o)=>JSON.stringify([audKey(inp,audRules()),o.win,+o.lev,+o.roi,+o.near,+o.hys,o.tf||'5m']);
const swTfMs=o=>IVMS[o.tf]||IVMS['5m'];

/* هر کندل → چهار نقطه به ترتیب تقریبی */
function swPts(C){
  const P=[];
  for(const k of C){
    const up=k.c>=k.o;
    P.push({t:k.t,p:k.o},{t:k.t,p:up?k.l:k.h},{t:k.t,p:up?k.h:k.l},{t:k.t,p:k.c});
  }
  return P;
}
/* زیگزاگ: هر «حرکت» یعنی دست‌کم th (کسر) از آخرین قله/کف، تا برگشتِ دست‌کم th */
function swZigzag(P,th){
  const legs=[];if(!P.length||!(th>0))return legs;
  let hi=P[0].p,lo=P[0].p,tHi=P[0].t,tLo=P[0].t,dir=0,piv=P[0].p,ext=P[0].p,tPiv=P[0].t,tExt=P[0].t;
  for(const {p,t} of P){
    if(dir===0){
      if(p>hi){hi=p;tHi=t;}if(p<lo){lo=p;tLo=t;}
      if(hi/lo-1>=th){dir=p===hi?1:-1;piv=dir>0?lo:hi;tPiv=dir>0?tLo:tHi;ext=p;tExt=t;}
      continue;
    }
    if(dir>0){
      if(p>ext){ext=p;tExt=t;}
      else if(ext/p-1>=th){legs.push({up:true,pct:(ext/piv-1)*100,from:piv,to:ext,tFrom:tPiv,tTo:tExt});piv=ext;tPiv=tExt;ext=p;tExt=t;dir=-1;}
    }else{
      if(p<ext){ext=p;tExt=t;}
      else if(p/ext-1>=th){legs.push({up:false,pct:(1-ext/piv)*100,from:piv,to:ext,tFrom:tPiv,tTo:tExt});piv=ext;tPiv=tExt;ext=p;tExt=t;dir=1;}
    }
  }
  if(dir!==0){const pct=dir>0?(ext/piv-1)*100:(1-ext/piv)*100;if(pct>=th*100)legs.push({up:dir>0,pct,open:true,from:piv,to:ext,tFrom:tPiv,tTo:tExt});}
  return legs;
}
/* نمونه‌برداری برای نمودار کوچک: در هر سطل هم کمینه و هم بیشینه، تا قله‌ها گم نشوند */
function swSpark(vals,n){
  if(vals.length<=n*2)return vals.map(v=>+v.toFixed(2));
  const out=[],step=vals.length/n;
  for(let i=0;i<n;i++){
    const s=vals.slice(Math.floor(i*step),Math.floor((i+1)*step));if(!s.length)continue;
    let a=s[0],b=s[0],ia=0,ib=0;s.forEach((v,j)=>{if(v<a){a=v;ia=j;}if(v>b){b=v;ib=j;}});
    (ia<ib?[a,b]:[b,a]).forEach(v=>out.push(+v.toFixed(2)));
  }
  return out;
}
const legStat=L=>({n:L.length,avg:L.length?L.reduce((s,x)=>s+x.pct,0)/L.length:null,max:L.length?Math.max(...L.map(x=>x.pct)):null,
  up:L.filter(x=>x.up).length,dn:L.filter(x=>!x.up).length});

/* پروفایل یک سیگنال. r: خروجی audWalk روی همین کندل‌ها (برای لحظه‌ی فعال شدن و پایان). تابع خالص است. */
function swingProfile(inp,C,r,o){
  if(!r||!r.tAct)return {act:false,st:r?r.st:'?'};
  const sign=inp.dir==='long'?1:-1, E=inp.entry, risk=Math.abs(E-inp.stop);
  const tEnd=o.win==='sig'?(r.fin&&r.tEnd?r.tEnd:Infinity):r.tAct+SW_WINH[o.win]*36e5, tfm=swTfMs(o);
  const W=C.filter(k=>k.t>=r.tAct&&k.t<=tEnd);
  if(!W.length)return {act:false,st:r.st};
  const P=swPts(W), tpR=inp.tps.length?(inp.tps[0]-E)*sign/risk:null;
  const a=swBand(o), liqF=1/(+o.lev||10)-MMR, near=+o.near||0.75, hys=+o.hys||0.5;
  let mfe=-Infinity,mae=Infinity,maeB=0,tpN=0,armTp=true,top=false,beN=0,nearN=0,armNear=true,stopN=0,armStop=true,tTp=null;
  let plusN=0,minusN=0,flips=0,side=0,armP=true,armM=true,liqT=null,minM=Infinity,maxM=-Infinity;
  const mv=[];
  for(const q of P){
    const x=(q.p-E)*sign/risk, m=(q.p-E)*sign/E;
    mv.push(m*100);
    if(x>mfe)mfe=x;if(x<mae)mae=x;if(m<minM)minM=m;if(m>maxM)maxM=m;
    if(tTp==null&&x<maeB)maeB=x;
    if(tpR!=null){
      if(armTp&&x>=tpR){tpN++;armTp=false;top=true;if(tTp==null)tTp=q.t;}
      else if(!armTp&&x<=tpR-hys)armTp=true;
      if(top&&x<=0){beN++;top=false;}
    }
    if(armNear&&x<=-near&&x>-1){nearN++;armNear=false;}else if(!armNear&&x>=-near+hys/2)armNear=true;
    if(armStop&&x<=-1){stopN++;armStop=false;}else if(!armStop&&x>=-1+hys)armStop=true;
    if(m>=a){if(armP){plusN++;armP=false;}if(side===-1)flips++;side=1;}
    else if(m<=-a){if(armM){minusN++;armM=false;}if(side===1)flips++;side=-1;}
    if(m<=0)armP=true;if(m>=0)armM=true;
    if(liqT==null&&liqF>0&&m<=-liqF)liqT=q.t;
  }
  const lg=legStat(swZigzag(P,a)), last=W[W.length-1];
  return {act:true,st:r.st,tAct:r.tAct,tEnd:Math.min(tEnd,last.t+tfm),hours:(Math.min(tEnd,last.t+tfm)-r.tAct)/36e5,
    open:o.win==='sig'?!r.fin:last.t+tfm<tEnd,
    tpR,tpN,beN,nearN,stopN,tTp,mfeR:mfe,maeR:mae,maeBR:tpR!=null&&tTp!=null?maeB:null,
    mfeP:maxM*100,maeP:minM*100,aP:a*100,plusN,minusN,flips,liqT,liqP:liqF*100,
    legs:lg.n,legAvg:lg.avg,legMax:lg.max,
    tpP:inp.tps.length?(inp.tps[0]-E)*sign/E*100:null,stopP:-risk/E*100,spark:swSpark(mv,70),
    scalp:inp.tps.length?scalpSummary(rangeScalp(W,scalpCfg(inp,o,r.tAct)),8):null};
}
/* کف و سقفِ رنج از نقطه‌های چرخش، و تغییر قیمت در بخشِ اخیر. مشترکِ کارت تصمیم و ربات اسکلپ
   (ربات همین را در هر لحظه فقط با کندل‌های تا همان لحظه صدا می‌زند).
   فقط از بخشِ اخیرِ دوره (۲۴ ساعت آخر، یا نیمه‌ی دوم اگر دوره کوتاه‌تر است): اگر قیمت در این
   مدت روند گرفته، میانه‌ی کل دوره رنجی را پیشنهاد می‌داد که قیمت مدت‌هاست از آن بیرون رفته.
   هر نقطه‌ی چرخش یک بار (قبلاً «تا»ی یک حرکت و «از»ِ حرکت بعد دو بار شمرده می‌شد)، و «چند بار»
   یعنی چند کف/سقف واقعاً نزدیکِ همان سطح (در نیم‌باند) بوده. C: کندل‌ها، P: swPts همان کندل‌ها. */
function swCore(C,P,a){
  const L=swZigzag(P,a);
  const med=v=>{if(!v.length)return null;const b=v.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;};
  const tEndAll=C[C.length-1].t, span=tEndAll-C[0].t, tCut=tEndAll-Math.min(864e5,span/2);
  const pivs=L.map(l=>({p:l.from,t:l.tFrom,low:l.up}));
  const lastL=L[L.length-1];if(lastL&&!lastL.open)pivs.push({p:lastL.to,t:lastL.tTo,low:!lastL.up});
  let rec=pivs.filter(x=>x.t>=tCut);
  if(rec.filter(x=>x.low).length<2||rec.filter(x=>!x.low).length<2)rec=pivs;
  const lows=rec.filter(x=>x.low).map(x=>x.p), highs=rec.filter(x=>!x.low).map(x=>x.p);
  const supp=med(lows), res=med(highs);
  const near=(arr,v)=>v==null?0:arr.filter(x=>Math.abs(x/v-1)<=a/2).length;
  const iCut=C.findIndex(k=>k.t>=tCut);
  return {L,supp,res,nLow:near(lows,supp),nHigh:near(highs,res),
    recH:(tEndAll-Math.min(...rec.map(x=>x.t).concat([tEndAll])))/36e5,
    recChg:(C[C.length-1].c/C[Math.max(0,iCut)].o-1)*100,last:C[C.length-1].c};
}
/* پروفایل یک توکن بدون سیگنال: حرکت‌های دست‌کم به اندازه‌ی باند و خطر لیکوئید */
function coinProfile(C,o){
  if(!C.length)return null;
  const P=swPts(C), a=swBand(o), liqF=1/(+o.lev||10)-MMR;
  const core=swCore(C,P,a), L=core.L, lg=legStat(L);
  let hi=-Infinity,lo=Infinity;for(const k of C){if(k.h>hi)hi=k.h;if(k.l<lo)lo=k.l;}
  const p0=C[0].o, hours=(C[C.length-1].t+swTfMs(o)-C[0].t)/36e5;
  // نوسان ساعتی: میانگینِ (سقف−کف)/کف در هر ساعت
  const hr=new Map();for(const k of C){const h=Math.floor(k.t/36e5);const v=hr.get(h)||{h:-Infinity,l:Infinity};v.h=Math.max(v.h,k.h);v.l=Math.min(v.l,k.l);hr.set(h,v);}
  const hrs=[...hr.values()].map(v=>(v.h/v.l-1)*100);
  return {from:C[0].t,to:C[C.length-1].t+swTfMs(o),hours,aP:a*100,liqP:liqF*100,lev:+o.lev,roi:+o.roi,tf:o.tf||'5m',
    supp:core.supp,res:core.res,recH:core.recH,
    hi,lo,rangeP:(hi/lo-1)*100,legs:lg.n,up:lg.up,dn:lg.dn,legAvg:lg.avg,legMax:lg.max,
    overLiq:L.filter(x=>x.pct/100>=liqF).length,hrAvg:hrs.length?hrs.reduce((s,v)=>s+v,0)/hrs.length:null,
    perDay:hours>0?lg.n/(hours/24):null,last:core.last,
    nLow:core.nLow,nHigh:core.nHigh,recChg:core.recChg,
    spark:swSpark(P.map(q=>(q.p/p0-1)*100),70)};
}

/* ==== اسکلپ رنج: رفت‌وبرگشت بین ورود و تارگت ۱ ====
   لانگ روی کفِ رنج (L)، بستن روی سقف (H) و همان‌جا شورت، بستن روی کف و دوباره لانگ… (stop-and-reverse)
   اولین معامله در جهتِ خودت و روی نقطه‌ی ورودِ خودت. استاپ هر معامله به همان فاصله‌ی استاپِ تو:
   لانگ زیر L، شورت بالای H. بعد از استاپ منتظر می‌ماند تا قیمت دوباره به L یا H برسد. بدون استاپ،
   لیکوئید با همان اهرم = −۱۰۰٪ مارجین. کارمزد رفت‌وبرگشت روی هر معامله کم می‌شود.
   داخل کندل همان ترتیبِ تقریبی (سبز: کف بعد سقف). تابع خالص است. */
function scalpCfg(inp,o,t0){
  const sign=inp.dir==='long'?1:-1, E=inp.entry, T=inp.tps[0];
  const L=sign>0?E:T, H=sign>0?T:E, d=inp.stop?Math.abs(E-inp.stop):null;
  return {L,H,first:inp.dir,d,lev:+o.lev||10,fee:+S.fee||0,mg:+o.mg||+S.cap||10,t0:t0||0};
}
/* سطح‌های هر طرف: ورود، تارگت و «خلاف جهت» (استاپ یا لیکوئید، هر کدام نزدیک‌تر) */
function scalpLv(cfg,side){
  const {L,H,d,lev}=cfg, liqF=1/lev-MMR;
  if(side==='long'){const sl=d!=null?L-d:null, lq=liqF>0?L*(1-liqF):null;
    const adv=sl!=null&&lq!=null?Math.max(sl,lq):sl!=null?sl:lq;return {en:L,tp:H,adv,liq:lq!=null&&adv===lq&&(sl==null||lq>sl)};}
  const sl=d!=null?H+d:null, lq=liqF>0?H*(1+liqF):null;
  const adv=sl!=null&&lq!=null?Math.min(sl,lq):sl!=null?sl:lq;return {en:H,tp:L,adv,liq:lq!=null&&adv===lq&&(sl==null||lq<sl)};
}
const scalpRoi=(cfg,side,en,ex,liq)=>liq?-100:((ex-en)/en*(side==='long'?1:-1)*cfg.lev*100-cfg.fee*cfg.lev);
/* یک قدم از اسکلپ رنج روی نقطه‌های تازه. st حالتِ ماندگار است و همین‌جا عوض می‌شود:
   {pos:{side,en,t}|null, started, prev} — همان تابع هم برای آزمون گذشته (همه‌ی کندل‌ها یک‌جا)
   و هم برای اجرای زنده (هر بار چند نقطه‌ی تازه) به کار می‌رود. خروجی: معامله‌های بسته‌شده در این قدم. */
function scalpStep(P,cfg,st){
  const {L,H}=cfg, out=[];
  if(!(L>0&&H>L)||!P.length)return out;
  const cross=(a,b,x)=>(a<x&&b>=x)||(a>x&&b<=x)||(a===x&&b===x);
  for(const q of P){
    const b=q.p, first=st.prev==null;let cur=first?b:st.prev;
    for(let g=0;g<8;g++){
      if(!st.pos){
        // منتظر ورود: اول فقط ورودِ خودت؛ بعد از آن هر کدام از دو سرِ رنج
        const cand=st.started?[['long',L],['short',H]]:[[cfg.first,cfg.first==='long'?L:H]];
        let hit=null;
        for(const [side,x] of cand)if(cross(cur,b,x)||(first&&g===0&&Math.abs(b-x)/x<1e-9)){
          if(!hit||Math.abs(x-cur)<Math.abs(hit[1]-cur))hit=[side,x];}
        if(!hit)break;
        st.pos={side:hit[0],en:hit[1],t:q.t};st.started=true;cur=hit[1];continue;
      }
      const pos=st.pos, v=scalpLv(cfg,pos.side);
      const towardTp=pos.side==='long'?b>cur:b<cur;
      if(towardTp&&cross(cur,b,v.tp)){
        out.push({side:pos.side,en:pos.en,ex:v.tp,t0:pos.t,t1:q.t,win:true,roi:scalpRoi(cfg,pos.side,pos.en,v.tp,false)});
        st.pos={side:pos.side==='long'?'short':'long',en:v.tp,t:q.t};cur=v.tp;continue;   // همان‌جا برعکس
      }
      if(!towardTp&&v.adv!=null&&cross(cur,b,v.adv)){
        out.push({side:pos.side,en:pos.en,ex:v.adv,t0:pos.t,t1:q.t,win:false,liq:v.liq,roi:scalpRoi(cfg,pos.side,pos.en,v.adv,v.liq)});
        st.pos=null;cur=v.adv;continue;
      }
      break;
    }
    st.prev=b;
  }
  return out;
}
function rangeScalp(C,cfg){
  const st={pos:null,started:false,prev:null};
  const P=swPts(C.filter(k=>k.t>=(cfg.t0||0)));
  const out=scalpStep(P,cfg,st);
  if(!P.length||!(cfg.L>0&&cfg.H>cfg.L))return {trades:out,open:null,cfg};
  const lastP=P[P.length-1].p, pos=st.pos;
  const open=pos?{side:pos.side,en:pos.en,t0:pos.t,px:lastP,roi:scalpRoi(cfg,pos.side,pos.en,lastP,false)}:null;
  return {trades:out,open,cfg};
}
function scalpSummary(r,keep){
  const T=r.trades, mg=r.cfg.mg;
  const w=T.filter(x=>x.win), l=T.filter(x=>!x.win);
  let streak=0,maxL=0;for(const x of T){if(x.win)streak=0;else maxL=Math.max(maxL,++streak);}
  const sumRoi=T.reduce((s,x)=>s+x.roi,0);
  return {L:r.cfg.L,H:r.cfg.H,lev:r.cfg.lev,mg,fee:r.cfg.fee,d:r.cfg.d,
    n:T.length,longW:w.filter(x=>x.side==='long').length,shortW:w.filter(x=>x.side==='short').length,
    stops:l.filter(x=>!x.liq).length,liqs:l.filter(x=>x.liq).length,
    winRoi:w.length?w[0].roi:null,sumRoi,usd:sumRoi/100*mg,maxL,
    avgH:T.length?T.reduce((s,x)=>s+(x.t1-x.t0),0)/T.length/36e5:null,
    open:r.open,trades:keep?T.slice(-keep):T};
}
/* سناریوی دستی: «اگر روی این قیمت وارد شده بودم». ورود = اولین کندلی در دوره که قیمت از ورود
   گذشته. تارگت ۱ و استاپِ خالی از باند حساب می‌شوند (+باند / −باند روی مارجین). برخلاف سیگنال،
   با خوردن استاپ تمام نمی‌شود: تا آخر دوره می‌شمارد که چند بار خورد و چند بار برگشت. */
function manualScenario(o,px0){
  const dir=o.dir==='short'?'short':'long', sign=dir==='long'?1:-1, a=swBand(o);
  const E=+normDig(String(o.me||'')).replace(/,/g,'')||px0;
  if(!(E>0))return null;
  let tp=+normDig(String(o.mt||'')).replace(/,/g,''), st=+normDig(String(o.ms||'')).replace(/,/g,'');
  const tpAuto=!(tp>0&&(tp-E)*sign>0), stAuto=!(st>0&&(E-st)*sign>0);
  // عددی داده شده ولی با جهت نمی‌خواند (مثلاً تارگتِ لانگ زیر ورود): باند جایش می‌نشیند و گفته می‌شود
  const tpBad=tpAuto&&tp>0?tp:null, stBad=stAuto&&st>0?st:null;
  if(tpAuto)tp=+(E*(1+sign*a)).toPrecision(8);
  if(stAuto)st=+(E*(1-sign*a)).toPrecision(8);
  return {tk:o.tk,dir,entry:E,entryAuto:!(+normDig(String(o.me||'')).replace(/,/g,'')>0),stop:st,tps:[tp],tpAuto,stAuto,tpBad,stBad};
}
function manualProfile(C,o,sc){
  const sign=sc.dir==='long'?1:-1, E=sc.entry;
  let iAct=-1;
  for(let i=0;i<C.length;i++){const k=C[i];if(k.l<=E&&k.h>=E){iAct=i;break;}}
  if(iAct<0)return {act:false,why:(C.length&&(C[0].o-E)*sign>0?'above':'below')};
  const r={tAct:C[iAct].t,fin:false,st:'open'};
  const pr=swingProfile(Object.assign({},sc,{t0:C[0].t}),C,r,Object.assign({},o,{win:'sig'}));
  // اسکلپ رنج با فهرستِ کامل معامله‌ها (برای سیگنال‌ها فقط چند تای آخر نگه داشته می‌شود)
  if(pr.act)pr.scalp=scalpSummary(rangeScalp(C.filter(k=>k.t>=r.tAct),scalpCfg(sc,o,r.tAct)),0);
  return pr;
}

/* ---- گرفتن کندل: هر تایم‌فریم، چند درخواست پشت هم تا بازه پوشیده شود ---- */
function swAggr(C,ms){
  const out=[];
  for(const k of C){const t=Math.floor(k.t/ms)*ms, b=out[out.length-1];
    if(b&&b.t===t){b.h=Math.max(b.h,k.h);b.l=Math.min(b.l,k.l);b.c=k.c;b.v+=k.v||0;}
    else out.push({t,o:k.o,h:k.h,l:k.l,c:k.c,v:k.v||0});}
  return out;
}
async function swCandlesTf(tk,tf,from,to,stop,x){
  try{return await swCandles(tk,from,to,stop,tf,x);}
  catch(e){
    const base=SW_TFBASE[tf];if(!base)throw e;
    const C=await swCandles(tk,from,to,null,base,x);
    return swAggr(C,IVMS[tf]);
  }
}
/* ---- گرفتن کندل (پایه): حداکثر ۸ درخواستِ ۱۰۰۰تایی (x.maxReq برای بیشتر؛ x.quiet: بی‌گزارش) ---- */
async function swCandles(tk,from,to,stop,tf,x){
  tf=tf||'5m';x=x||{};const ms=IVMS[tf], maxReq=x.maxReq||(tf==='1m'||tf==='3m'?8:4);
  const out=[];let s=Math.floor(from/ms)*ms;
  for(let n=0;n<maxReq&&s<to;n++){
    const lim=Math.min(1000,Math.ceil((to-s)/ms)+1);
    /* هر تکه یک بار دوباره امتحان می‌شود؛ اگر باز نشد و تکه‌های قبلی آمده‌اند، همان‌ها می‌مانند
       (روی شبکه‌ی ناپایدار یک درخواستِ شکست‌خورده کل سنجش را بی‌نتیجه نکند) */
    let c;
    try{c=await audCandles(tk,tf,s,lim,x.quiet);}
    catch(e){try{c=await audCandles(tk,tf,s,lim,x.quiet);}catch(e2){if(out.length){out.cut=true;break;}throw e2;}}
    const nc=c.filter(k=>k.t>=s&&k.t<=to&&!(out.length&&k.t<=out[out.length-1].t));
    if(!nc.length)break;
    out.push(...nc);s=out[out.length-1].t+ms;
    if(stop&&stop(out))break;
    if(nc.length<lim*0.5)break;                    // منبع بیشتر از این نداشت
  }
  return out;
}
async function swOne(p,inp,o){
  const R=audRules(), pre=audPre(inp);
  if(pre)return {act:false,st:'bad',why:pre};
  const tf=o.tf||'5m', start=Math.ceil(inp.t0/IVMS[tf])*IVMS[tf];
  const winH=o.win==='sig'?(R.days*24):SW_WINH[o.win];
  const to=Math.min(Date.now(),start+R.entryDays*864e5+winH*36e5);
  let r=null;
  const C=await swCandlesTf(inp.tk,tf,start,to,cs=>{
    r=audWalk(inp,cs,R);
    if(!r.tAct)return false;
    return o.win==='sig'?r.fin:cs[cs.length-1].t>=r.tAct+winH*36e5;
  });
  if(!C.length)return {act:false,st:'bad',why:'nocandle'};
  if(Math.abs(inp.entry-C[0].o)/C[0].o>0.3)return {act:false,st:'bad',why:'px'};
  r=audWalk(inp,C,R);
  return swingProfile(inp,C,r,o);
}

const swOf=(p,inp)=>{const s=SWING[p.id];return s&&s.k===swKey(inp,SWOPT)?s.prof:null;};

/* ---- نمودار کوچک: حرکت قیمت (٪ در جهت معامله) با خط‌های ورود، باند، تارگت ۱ و استاپ ---- */
function swSvg(sp,lines,h){
  h=h||64;const W=300;
  if(!sp||sp.length<2)return '';
  const vals=sp.concat(lines.map(l=>l.v).filter(v=>v!=null&&isFinite(v)));
  let lo=Math.min(...vals),hi=Math.max(...vals);if(hi-lo<1e-9){hi+=1;lo-=1;}
  const pad=(hi-lo)*0.08;lo-=pad;hi+=pad;
  const Y=v=>(h-(v-lo)/(hi-lo)*h).toFixed(1), X=i=>(i/(sp.length-1)*W).toFixed(1);
  let s='<svg class="swsvg" viewBox="0 0 '+W+' '+h+'" preserveAspectRatio="none" role="img" aria-label="مسیر قیمت">';
  for(const l of lines)if(l.v!=null&&isFinite(l.v))
    s+='<line x1="0" x2="'+W+'" y1="'+Y(l.v)+'" y2="'+Y(l.v)+'" class="swl '+l.c+'"/>';
  s+='<polyline fill="none" class="swp" points="'+sp.map((v,i)=>X(i)+','+Y(v)).join(' ')+'"/></svg>';
  return s;
}
const swLines=pr=>[{v:0,c:'e'},{v:pr.aP,c:'b'},{v:-pr.aP,c:'b'},{v:pr.tpP,c:'t'},{v:pr.stopP,c:'s'}];
const swLegend='<div class="swleg"><i class="t"></i>تارگت ۱<i class="e"></i>ورود<i class="b"></i>باند<i class="s"></i>استاپ</div>';
const z0=v=>Math.abs(v)<0.005?0:v;         // «−0.00٪» نشان داده نشود
const fmtNum=v=>v==null||!isFinite(v)?'—':String(+(+v).toFixed(v<1?2:1));

/* ---- پنل‌ها ----
   تب اسکلپ: دو بخشِ آکاردئونی (فقط یکی باز): تنظیم‌ها، بررسی توکن و سناریوی دستی.
   نوسانِ یک سیگنال: از برگه‌ی همان سیگنال در کانال‌سنج («نوسان»، sheetSwing). */
const swRerender=()=>{if(view==='scalp')renderScalp();else if(view==='audit')renderAudit();};
/* تنظیم‌های سنجش (تب اسکلپ، صفحه‌ی «تنظیم») */
function swOptBody(b){
  const o=SWOPT;
  b.appendChild(el('div','tgl','سبک'));
  const sy=el('div','pbpick');
  for(const [k,v] of Object.entries(SW_STYLE)){const x=el('button','pbc'+((swScalp()?'scalp':'range')===k?' on':''),v);x.type='button';
    x.setAttribute('aria-pressed',(swScalp()?'scalp':'range')===k);x.onclick=()=>{o.style=k;if(k==='scalp'&&IVMS[o.tf]>3e5)o.tf='1m';swOptSave();SWCOIN=null;swRerender();};sy.appendChild(x);}
  b.appendChild(sy);
  b.appendChild(el('div','hint',swScalp()?'اسکلپ: تصمیم با اندیکاتورها (بولینگر، RSI، EMA، VWAP، حجم، بیت‌کوین) روی کندل کوتاه؛ تارگت به اندازه‌ی نوسانِ یک ساعت؛ اگر تا سقف زمان نرسید، بسته می‌شود.'
    :'رنج: کف و سقفِ برگشت‌های چند ساعت تا چند روز اخیر؛ روی کف لانگ، روی سقف شورت. معامله‌ها ممکن است ساعت‌ها باز بمانند.'));
  const g=el('div','grid swopt');
  g.innerHTML='<div class="fld"><label>اهرم</label><input id="swLev" type="number" min="1" max="125" step="1" inputmode="decimal" value="'+o.lev+'"></div>'+
    '<div class="fld"><label>باند روی مارجین (٪)</label><input id="swRoi" type="number" min="1" max="500" step="1" inputmode="decimal" value="'+o.roi+'"></div>'+
    '<div class="fld"><label>بازه‌ی سیگنال</label><select id="swWin">'+Object.entries(SW_WIN).map(([k,v])=>'<option value="'+k+'"'+(o.win===k?' selected':'')+'>'+v+'</option>').join('')+'</select></div>';
  b.appendChild(g);
  if(swScalp()){
    const g2=el('div','grid swopt');
    const opt=(id,m,v)=>'<select id="'+id+'">'+Object.entries(m).map(([k,t])=>'<option value="'+k+'"'+(String(k)===String(v)?' selected':'')+'>'+t+'</option>').join('')+'</select>';
    g2.innerHTML='<div class="fld"><label>حداکثر نگه‌داری</label>'+opt('swTmax',SW_TMAX,o.tmax)+'</div>'+
      '<div class="fld"><label>خروج زود</label>'+opt('swTearly',SW_TEARLY,o.tearly)+'</div>'+
      '<div class="fld"><label>ضریب کارمزد</label>'+opt('swCostX',SW_COSTX,o.costX||3)+'</div>'+
      '<div class="fld"><label>حداکثر شرطِ ردشده</label>'+opt('swMiss',SW_MISS,o.miss)+'</div>';
    b.appendChild(g2);
    b.appendChild(el('div','tgl','شرط‌های تأیید (هر کدام یک امتیاز)'));
    const fl=el('div','pbpick scflt');
    for(const [k,v] of Object.entries(SC_FLT)){const on=(o.flt||{})[k]!==false, x=el('button','pbc'+(on?' on':''),v);x.type='button';x.dataset.k=k;
      x.setAttribute('aria-pressed',on);x.onclick=()=>{o.flt=Object.assign({},o.flt);o.flt[k]=!on?true:false;swOptSave();swRerender();};fl.appendChild(x);}
    b.appendChild(fl);
    b.appendChild(el('div','hint','«حداکثر نگه‌داری» اندازه‌ی تارگت را هم تعیین می‌کند: برای ۵ تا ۱۰ دقیقه تارگت به اندازه‌ی نوسانِ معمولِ همان چند دقیقه است (کندل ۱ دقیقه‌ای بگذار). '+
      '«خروج زود»: اگر بعد از این مدت هنوز در سود نبود، همان‌جا بسته می‌شود. «ضریب کارمزد»: تارگت دست‌کم چند برابرِ کارمزد و لغزش باشد؛ کمترش معامله‌ی بیشتر ولی با سودِ خالصِ کمتر. '+
      'در «تست‌ها» اثر هر شرط جدا نشان داده می‌شود؛ شرطی که کمک نکرد را خاموش کن.'));
    if(+o.tmax<=10&&IVMS[o.tf]>6e4)b.appendChild(el('div','flag i','<i>i</i><span>برای نگه‌داریِ '+faN(o.tmax)+' دقیقه، کندل ۱ دقیقه‌ای بهتر است؛ با کندل '+SW_TF[o.tf]+' شاید فقط یکی دو کندل در هر معامله باشد.</span>'));
    g2.querySelectorAll('select').forEach(i=>i.onchange=()=>{o.tmax=+$('#swTmax').value||60;o.tearly=+$('#swTearly').value||0;o.costX=+$('#swCostX').value||3;o.miss=+$('#swMiss').value;swOptSave();swRerender();});
  }
  b.appendChild(el('div','tgl','تایم‌فریم کندل'));
  const tf=el('div','pbpick swtf');
  for(const [k,v] of Object.entries(SW_TF)){const x=el('button','pbc'+((o.tf||'5m')===k?' on':''),v);x.type='button';
    x.setAttribute('aria-pressed',(o.tf||'5m')===k);x.onclick=()=>{o.tf=k;swOptSave();swRerender();};tf.appendChild(x);}
  b.appendChild(tf);
  b.appendChild(el('div','hint','کوچک‌تر = دقیق‌تر (ترتیبِ بالا و پایینِ داخل هر کندل) ولی کندتر؛ ۱ و ۳ دقیقه‌ای حداکثر حدود '+
    '۵ و ۱۶ روز را پوشش می‌دهند. همین تنظیم‌ها برای نوسانِ سیگنال‌ها در کانال‌سنج هم به کار می‌رود؛ عوضشان کنی، آن‌ها باید دوباره سنجیده شوند.'));
  const read=()=>{
    o.lev=Math.min(125,Math.max(1,parseFloat(normDig($('#swLev').value))||10));
    o.roi=Math.min(500,Math.max(1,parseFloat(normDig($('#swRoi').value))||20));
    o.win=$('#swWin').value in SW_WIN?$('#swWin').value:'sig';
    swOptSave();swRerender();
  };
  g.querySelectorAll('input,select').forEach(i=>i.onchange=read);
  }
/* بررسی توکن و ورود دستی (تب اسکلپ، صفحه‌ی «بررسی») */
function swTokBody(b){
  const o=SWOPT;
  const tks=[...new Set(POSTS.map(p=>sigOf(p).ticker).filter(Boolean))].sort();
  b.innerHTML='<div class="grid swopt">'+
  '<div class="fld"><label>نماد</label><input id="swTk" dir="ltr" list="swTkL" placeholder="مثلاً SOL" value="'+esc(o.tk||'')+'">'+
    '<datalist id="swTkL">'+tks.map(t=>'<option value="'+esc(t)+'">').join('')+'</datalist></div>'+
  (swScalp()?'':'<div class="fld"><label>دوره</label><select id="swDays"><option value="0.5">۱۲ ساعت اخیر</option><option value="1">۱ روز اخیر</option><option value="3">۳ روز اخیر</option><option value="7">۷ روز اخیر</option></select></div>')+
  '<div class="fld"><label>جهت</label><select id="swDir"><option value="auto">خودکار (از کارت)</option><option value="long">لانگ</option><option value="short">شورت</option></select></div>'+
  '<div class="fld"><label>نقطه‌ی ورود</label><input id="swMe" dir="ltr" inputmode="decimal" placeholder="خالی = فقط نوسان توکن" value="'+esc(o.me||'')+'"></div>'+
  '<div class="fld"><label>تارگت ۱</label><input id="swMt" dir="ltr" inputmode="decimal" placeholder="خالی = +باند" value="'+esc(o.mt||'')+'"></div>'+
  '<div class="fld"><label>حد ضرر</label><input id="swMs" dir="ltr" inputmode="decimal" placeholder="خالی = −باند" value="'+esc(o.ms||'')+'"></div>'+
  '<div class="fld"><label>مارجین هر معامله ($)</label><input id="swMg" dir="ltr" inputmode="decimal" placeholder="'+esc(String(S.cap||10))+'" value="'+esc(o.mg||'')+'"></div>'+
  '</div><div class="srow"><button class="btn pri" id="swTkGo">'+ic('search')+'<span>بسنج</span></button>'+
  '<button class="btn" id="swClr">پاک کردن ورود</button></div><div id="swCoin"></div>';
  setTimeout(()=>{
  if($('#swDays'))$('#swDays').value=String(o.days||3);$('#swDir').value=o.dir||'auto';
  const read=()=>{o.tk=String($('#swTk').value||'').trim().toUpperCase().replace(/USDT$/,'');if($('#swDays'))o.days=+$('#swDays').value||3;
    o.dir=$('#swDir').value;o.me=$('#swMe').value.trim();o.mt=$('#swMt').value.trim();o.ms=$('#swMs').value.trim();o.mg=$('#swMg').value.trim();swOptSave();
    if(SWCOIN)paintSwCoin();};
  b.querySelectorAll('input,select').forEach(i=>i.onchange=read);
  $('#swClr').onclick=()=>{$('#swMe').value=$('#swMt').value=$('#swMs').value='';read();};
  $('#swTkGo').onclick=async e=>{
    read();
    if(!/^[A-Z0-9]{2,15}$/.test(o.tk))return toast('نماد را بنویس، مثلاً SOL','err');
    const go=e.currentTarget;btnBusy(go,true,'در حال گرفتن کندل');
    try{
      const oo=Object.assign({},o);let C,sd=null,ser=null;
      if(swScalp()){
        // اسکلپ: کندل ۱ دقیقه‌ایِ ۲۶ ساعت اخیر (و بیت‌کوین برای شرطش)، تصمیم روی آخرین کندلِ بسته
        const to=Date.now(), from=to-SC_HIST;
        const X=(await ccGet(o.tk,'1m',from,to,{maxReq:4})).filter(k=>k.t>=from);
        if(!X.length)throw new Error('empty');
        let BX=null;
        if((o.flt||{}).btc!==false&&o.tk!=='BTC')BX=(await ccGet('BTC','1m',from,to,{maxReq:4}).catch(()=>[])).filter(k=>k.t>=from);
        ser=scSeries(X,6e4,o.tf||'1m',BX);
        sd=scDecide(ser.at(Math.floor(to/ser.tfms)*ser.tfms),scOpt(oo));
        C=ser.TF;
      }else{
        const to=Date.now();C=await swCandlesTf(o.tk,o.tf||'5m',to-o.days*864e5,to);
        if(!C.length)throw new Error('empty');
      }
      const pr=coinProfile(C,oo);
      // جهت «خودکار»: همان که کارت می‌گوید (یا اگر صبر است، سمتی که قیمت به آن نزدیک‌تر است)
      if(oo.dir!=='long'&&oo.dir!=='short')oo.dir=sd?sd.side:(swDecide(pr,oo).side||'long');
      const sc=o.me?manualScenario(oo,null):null;
      const mp=sc?manualProfile(C,oo,sc):null;
      SWCOIN={tk:o.tk,o:oo,pr,sc,mp,sd,ser,at:Date.now()};
      paintSwCoin();
    }catch(err){toast('کندل '+o.tk+' نیامد'+(AUDQ.err?' — '+AUDQ.err:''),'err');}
    btnBusy(go,false);
  };
  paintSwCoin();
  },0);
  }
/* نمایش اسکلپ رنج. full: فهرست کامل معامله‌ها (سناریوی دستی)؛ وگرنه فقط خلاصه */
const swMg=()=>+normDig(String(SWOPT.mg||'')).replace(/,/g,'')||+S.cap||10;
function scalpHtml(sc,full){
  if(!sc)return '';
  const mg=swMg(), lev=sc.lev, f=sc.fee*lev;
  const lw=(sc.H-sc.L)/sc.L*lev*100-f, sw=(sc.H-sc.L)/sc.H*lev*100-f, usd=sc.sumRoi/100*mg;
  const k=(l,v,c,sub)=>stHtml(l,v,c,sub);
  const hm=t=>{const s=jStampFa(new Date(t));return '<bdi>'+s.slice(5)+'</bdi>';};
  let h='<div class="scalp"><div class="sechd">اسکلپ رنج: لانگ روی <b dir="ltr">'+fmtPrice(sc.L)+'</b> ⇄ شورت روی <b dir="ltr">'+fmtPrice(sc.H)+'</b></div>';
  if(!sc.n&&!sc.open){h+='<div class="hint">در این بازه قیمت به نقطه‌ی ورود نرسید یا هیچ معامله‌ای کامل نشد.</div></div>';return h;}
  h+='<div class="stats">'+
    k('معامله‌ی کامل',faN(sc.n),sc.n?'':'m',faN(sc.longW)+' لانگ و '+faN(sc.shortW)+' شورت سر تارگت')+
    k('هر بُرد روی مارجین','+'+fmtNum(lw)+'٪','u','لانگ؛ شورت +'+fmtNum(sw)+'٪ · بعد از کارمزد')+
    k('استاپ / لیکوئید',faN(sc.stops)+' / '+faN(sc.liqs),sc.stops+sc.liqs?'d':'u',sc.d!=null?'استاپ '+fmtPrice(sc.d)+' آن سوی رنج':'بی‌استاپ')+
    k('جمع روی مارجین',fmtPct(z0(sc.sumRoi)),cls(sc.sumRoi),'هر معامله با مارجین ثابت')+
    k('سود/ضرر با $'+fmtNum(mg),fmtUsd(usd),cls(usd),'اهرم '+fmtNum(lev)+'x')+
    k('باخت پیاپی',faN(sc.maxL),sc.maxL>=2?'d':'','بیشترین'+(sc.avgH!=null?' · نگه‌داری '+fmtNum(sc.avgH)+' ساعت':''))+
  '</div>';
  if(sc.open)h+='<div class="flag i"><i>i</i><span>الان یک <b>'+(sc.open.side==='long'?'لانگ':'شورت')+'</b> از '+fmtPrice(sc.open.en)+
    ' باز است ('+hm(sc.open.t0)+')؛ با قیمت آخر '+fmtPrice(sc.open.px)+' روی مارجین '+fmtPct(z0(sc.open.roi))+'.</span></div>';
  if(sc.trades&&sc.trades.length){
    const rows=sc.trades.map(x=>'<tr><td class="sd '+x.side+'">'+(x.side==='long'?'لانگ':'شورت')+'</td>'+
      '<td><span class="num" dir="ltr">'+fmtPrice(x.en)+' → '+fmtPrice(x.ex)+'</span><small>'+hm(x.t1)+'</small></td>'+
      '<td class="num '+(x.roi>=0?'u':'d')+'"><bdi>'+(x.liq?'لیکوئید':fmtPct(z0(x.roi)))+'</bdi></td></tr>').join('');
    h+='<details class="sec sub2 sctr"'+(full&&sc.trades.length<=12?' open':'')+'><summary>'+(full?'همه‌ی معامله‌ها':'آخرین معامله‌ها')+' ('+faN(sc.trades.length)+')</summary>'+
      '<div class="tscroll"><table class="tp"><thead><tr><th>جهت</th><th>ورود → خروج · بسته شد</th><th>روی مارجین</th></tr></thead><tbody>'+rows+'</tbody></table></div></details>';
  }
  h+='<div class="hint">اولین معامله در جهتِ خودت روی ورود؛ سرِ هر تارگت بسته و همان‌جا برعکس. استاپِ هر معامله همان فاصله‌ی استاپِ تو آن سوی رنج است؛ '+
    'بعد از استاپ صبر می‌کند تا قیمت دوباره به یکی از دو سر برسد. لغزش و فاندینگ حساب نشده؛ گذشته است، نه تضمین.</div></div>';
  return h;
}
/* ---- تصمیم ساده: لانگ، شورت یا صبر ----
   دو سؤال: روندِ روز اخیر چیست (بالا / پایین / درجا)، و قیمت الان کجای رنج است (کف / وسط / سقف).
   روند بالا: فقط لانگ از کف. روند پایین: فقط شورت از سقف. درجا: کف لانگ، سقف شورت. وسط رنج: صبر.
   قیمت بیرون از رنج: رنج شکسته، اسکلپ نه. تابع خالص است. */
function swDecide(pr,o){
  if(!pr||pr.supp==null||pr.res==null||!(pr.res>pr.supp))return {act:'none'};
  const a=pr.aP/100, lev=+o.lev||10, fee=+S.fee||0;
  const trend=pr.recChg>=2*pr.aP?'up':pr.recChg<=-2*pr.aP?'down':'flat';
  const pos=(pr.last-pr.supp)/(pr.res-pr.supp);
  const where=pr.last>pr.res*(1+a)?'above':pr.last<pr.supp*(1-a)?'below':pos<=0.33?'bottom':pos>=0.67?'top':'mid';
  let act='wait', side;
  if(where==='above'||where==='below'){act='out';side=trend==='down'?'short':'long';}
  else if(trend==='up'){side='long';if(where==='bottom')act='long';}
  else if(trend==='down'){side='short';if(where==='top')act='short';}
  else{side=where==='top'?'short':'long';if(where!=='mid')act=side;}
  const L=side==='long';
  const entry=L?pr.supp:pr.res, tp=L?pr.res:pr.supp, stop=L?pr.supp*(1-a):pr.res*(1+a);
  const winP=Math.abs(tp/entry-1)*lev*100-fee*lev, lossP=Math.abs(stop/entry-1)*lev*100+fee*lev;
  // اهرمی که بزرگ‌ترین حرکتِ دوره (با ۲۰٪ حاشیه) لیکوئیدش نکند
  const safeLev=pr.legMax?Math.max(1,Math.floor(1/((pr.legMax/100)*1.2+MMR))):lev;
  return {act,side,trend,where,entry,tp,stop,winP,lossP,lev,safeLev,pos};
}
const SW_TREND={up:'صعودی ↗',down:'نزولی ↘',flat:'درجا (رنج) ↔'};
/* اگر همین کارت را خودکار دنبال می‌کردی: روی گذشته (تست) یا از همین حالا (ربات) — 30c-scalpbot.js */
const swDecBtns=()=>'<div class="srow swdecb"><button class="btn pri sm" id="swDecBt">'+ic('bars')+'<span>تست خودکار این روش روی روزهای گذشته</span></button>'+
  '<button class="btn sm" id="swDecBot">'+ic('play')+'<span>ربات خودکار از همین حالا</span></button></div>';
const SW_WHERE={bottom:'نزدیک کفِ رنج',mid:'وسطِ رنج',top:'نزدیک سقفِ رنج',above:'بالاتر از رنج (شکسته)',below:'پایین‌تر از رنج (شکسته)'};
function swDecideHtml(d,pr,o){
  if(d.act==='none')return '<div class="swdec wait"><div class="dv">نمی‌شود گفت</div><div class="dw">در این دوره حرکتی به اندازه‌ی باند ('+fmtNum(pr.aP)+'٪) نبود؛ باند را کوچک‌تر یا دوره را بلندتر کن.</div>'+swDecBtns()+'</div>';
  const mg=swMg(), S2=d.side==='long'?'لانگ':'شورت';
  const head=d.act==='long'?'الان: لانگ':d.act==='short'?'الان: شورت':d.act==='out'?'صبر کن — رنج شکسته شده':'صبر کن';
  const why=d.act==='out'?'قیمت از رنجِ اخیر بیرون زده؛ تا رنجِ تازه‌ای شکل نگیرد اسکلپِ رنج معنی ندارد.'
    :d.act==='wait'?(d.trend==='up'?'روند صعودی است؛ فقط لانگ، آن هم وقتی قیمت به کف برگردد.'
      :d.trend==='down'?'روند نزولی است؛ فقط شورت، آن هم وقتی قیمت به سقف برگردد.'
      :'قیمت وسط رنج است؛ نه سودِ کافی دارد نه استاپِ نزدیک.')
    :(d.trend==='flat'?'رنج درجاست و قیمت '+SW_WHERE[d.where]+' است.':'هم‌جهت با روند، و قیمت '+SW_WHERE[d.where]+' است.');
  const plan=(d.act==='wait'?'صبر کن تا قیمت به <b dir="ltr">'+fmtPrice(d.entry)+'</b> برسد، بعد '+S2+':':'برنامه:');
  return '<div class="swdec '+(d.act==='long'?'long':d.act==='short'?'short':'wait')+'">'+
    '<div class="dv">'+head+'</div>'+
    '<div class="dw">روند روز اخیر: <b>'+SW_TREND[d.trend]+'</b> ('+fmtPct(pr.recChg)+') · قیمت الان <b dir="ltr">'+fmtPrice(pr.last)+'</b>: '+SW_WHERE[d.where]+'</div>'+
    '<div class="dw">'+why+'</div>'+
    (d.act!=='out'?'<div class="dplan">'+plan+
      '<div class="dnum"><span><i>ورود '+S2+'</i><b dir="ltr">'+fmtPrice(d.entry)+'</b></span><span><i>تارگت</i><b dir="ltr" class="u">'+fmtPrice(d.tp)+'</b></span><span><i>استاپ</i><b dir="ltr" class="d">'+fmtPrice(d.stop)+'</b></span></div>'+
      '<div class="dw">با '+fmtNum(d.lev)+'x و $'+fmtNum(mg)+': هر بُرد حدود <b class="u">'+fmtUsd(d.winP/100*mg)+'</b> · هر استاپ حدود <b class="d">'+fmtUsd(-d.lossP/100*mg)+'</b> (با کارمزد)</div>'+
      '</div>':'')+
    (d.safeLev<d.lev?'<div class="flag d"><i>!</i><span>بزرگ‌ترین حرکتِ این دوره '+fmtNum(pr.legMax)+'٪ بود؛ با '+fmtNum(d.lev)+'x یک حرکتِ این‌چنینی لیکوئیدت می‌کند. اهرم حداکثر <b>'+faN(d.safeLev)+'x</b>.</span></div>':'')+
    swDecBtns()+
  '</div>';
}
let SWCOIN=null;
function paintSwCoin(){
  const box=$('#swCoin');if(!box)return;
  if(!SWCOIN||!SWCOIN.pr){box.innerHTML='';return;}
  const {tk,o,pr,sc,mp,sd,ser}=SWCOIN;
  const k=(l,v,c,sub)=>stHtml(l,v,c,sub);
  const lev=o.lev;
  let h='';
  // ── تصمیم ساده (اول از همه): اسکلپ با اندیکاتورها، یا رنج ──
  const dec=sd?Object.assign({},sd,{entry:sd.plan.en,tp:sd.plan.tp,stop:sd.plan.stop}):swDecide(pr,o);
  h+=sd?scDecideHtml(sd,o)+scIndHtml(sd,ser):swDecideHtml(dec,pr,o);
  // ── سناریوی دستی ──
  if(sc){
    const sign=sc.dir==='long'?1:-1, pct=v=>(v-sc.entry)*sign/sc.entry*100;
    h+='<div class="swres"><div class="swh"><b dir="ltr">'+esc(tk)+'</b><span class="pill '+sc.dir+'">'+(sc.dir==='long'?'لانگ':'شورت')+'</span>'+
      '<span>ورود '+fmtPrice(sc.entry)+' · تارگت ۱ '+fmtPrice(sc.tps[0])+(sc.tpAuto?' (+باند)':'')+' · استاپ '+fmtPrice(sc.stop)+(sc.stAuto?' (−باند)':'')+'</span></div>';
    if(sc.tpBad||sc.stBad)h+='<div class="flag i"><i>i</i><span>'+
      (sc.tpBad?'تارگت '+fmtPrice(sc.tpBad)+' برای '+(sc.dir==='long'?'لانگ':'شورت')+' طرف اشتباهِ ورود است؛ ':'')+
      (sc.stBad?'استاپ '+fmtPrice(sc.stBad)+' طرف اشتباهِ ورود است؛ ':'')+'به‌جایش باند گذاشته شد.</span></div>';
    if(!mp||!mp.act){
      h+='<div class="flag i"><i>i</i><span>قیمت در این دوره به '+fmtPrice(sc.entry)+' نرسید'+
        (mp&&mp.why?(mp.why==='above'?' (همیشه بالاتر بود)':' (همیشه پایین‌تر بود)'):'')+'. دوره را بلندتر کن یا ورود را عوض کن.</span></div>';
    }else{
      h+=swSvg(mp.spark,swLines(mp),80)+swLegend+
        '<div class="stats">'+
          k('ورود فعال شد',jStampFa(new Date(mp.tAct)).slice(11)||'—','','<bdi>'+jStampFa(new Date(mp.tAct)).slice(0,10)+'</bdi> · <bdi>'+fmtNum(mp.hours)+'</bdi> ساعت پیش')+
          k('لمس تارگت ۱',faN(mp.tpN),mp.tpN?'u':'m',fmtPct(pct(sc.tps[0]))+' · روی مارجین '+fmtNum(pct(sc.tps[0])*lev)+'٪')+
          k('برگشت به ورود بعد از تارگت',faN(mp.beN),mp.beN?'w':'u','')+
          k('خوردن استاپ',faN(mp.stopN),mp.stopN?'d':'u',faN(mp.nearN)+' بار نزدیکش')+
          k('±'+fmtNum(o.roi)+'٪ روی مارجین',faN(mp.plusN)+' / '+faN(mp.minusN),'',faN(mp.flips)+' رفت‌وآمد از سر به سر')+
          k('سقف / کف',fmtPct(z0(mp.mfeP))+' / '+fmtPct(z0(mp.maeP)),'',mp.maeBR!=null?'افت پیش از تارگت '+fmtR(mp.maeBR):'')+
          k('لیکوئید با '+fmtNum(lev)+'x',mp.liqT?'می‌شد':'نه',mp.liqT?'d':'u',mp.liqT?jStampFa(new Date(mp.liqT)):'فاصله '+fmtNum(mp.liqP)+'٪')+
        '</div>'+
        '<div class="hint">بعد از خوردن استاپ هم شمارش ادامه دارد (برای دیدن رفتار قیمت)؛ «خوردن استاپ» یعنی چند بار به آن رسید.</div>'+
        scalpHtml(mp.scalp,true)+
        (mp.scalp?'<div class="srow"><button class="btn pri sm" id="swScLive">'+ic('play')+'<span>ربات با همین رنج (خودکار، از همین حالا)</span></button></div>':'');
    }
    h+='</div>';
  }
  // ── نوسان توکن ──
  const verdict=pr.legs===0?['i','در این دوره هیچ حرکتی به اندازه‌ی باند نبود']
    :pr.overLiq?['d',faN(pr.overLiq)+' حرکت از فاصله‌ی لیکوئید ('+fmtNum(pr.liqP)+'٪) بزرگ‌تر بود؛ با اهرم '+fmtNum(lev)+'x بدون استاپ، یک بار خلاف جهت بودن کافی بود']
    :['u','هیچ حرکتی از فاصله‌ی لیکوئید بزرگ‌تر نبود؛ ولی این گذشته است، نه تضمین آینده'];
  h+='<details class="sec sub2 swmore"><summary>جزئیات نوسانِ '+esc(tk)+'</summary><div class="swres">'+
    '<div class="swh"><b dir="ltr">'+esc(tk)+'</b><span>نوسان '+(pr.hours<24?fmtNum(pr.hours)+' ساعت':faN(Math.round(pr.hours/24*10)/10)+' روز')+' · کندل '+SW_TF[pr.tf]+' · الان '+fmtPrice(pr.last)+'</span></div>'+
    swSvg(pr.spark,[{v:0,c:'e'}],70)+
    '<div class="stats">'+
      k('حرکت‌های دست‌کم '+fmtNum(pr.aP)+'٪',faN(pr.legs),pr.legs?'u':'m',faN(pr.up)+' بالا · '+faN(pr.dn)+' پایین'+(pr.perDay!=null?' · روزی '+fmtNum(pr.perDay):''))+
      k('میانگین هر حرکت',pr.legAvg==null?'—':fmtNum(pr.legAvg)+'٪','', pr.legAvg==null?'':'روی مارجین '+fmtNum(pr.legAvg*lev)+'٪')+
      k('بزرگ‌ترین حرکت',pr.legMax==null?'—':fmtNum(pr.legMax)+'٪',pr.legMax!=null&&pr.legMax>=pr.liqP?'d':'',pr.legMax==null?'':'روی مارجین '+fmtNum(pr.legMax*lev)+'٪')+
      k('کف تا سقف دوره',fmtNum(pr.rangeP)+'٪','',fmtPrice(pr.lo)+' تا '+fmtPrice(pr.hi))+
      k('نوسان هر ساعت',pr.hrAvg==null?'—':fmtNum(pr.hrAvg)+'٪','','میانگین سقف تا کف')+
      k('لیکوئید با '+fmtNum(lev)+'x',fmtNum(pr.liqP)+'٪',pr.overLiq?'d':'u',faN(pr.overLiq)+' حرکت بزرگ‌تر از آن')+
    '</div>'+
    '<div class="flag '+verdict[0]+'"><i>'+(verdict[0]==='d'?'!':'i')+'</i><span>'+verdict[1]+'.</span></div>';
  // ── پیشنهاد ورود و تارگت از کف و سقف‌های برگشت ──
  if(pr.supp!=null&&pr.res!=null&&pr.res>pr.supp){
    const w=(pr.res/pr.supp-1)*100;
    const out=pr.last>pr.res*(1+pr.aP/100)?'بالاتر':pr.last<pr.supp*(1-pr.aP/100)?'پایین‌تر':null;
    h+='<div class="swsug"><b>پیشنهاد از کف و سقف‌های برگشتِ '+(pr.recH!=null&&pr.recH<pr.hours-1?fmtNum(pr.recH)+' ساعت اخیر':'همین دوره')+'</b>'+
      (out?'<div class="flag d"><i>!</i><span>قیمت الان ('+fmtPrice(pr.last)+') از این رنج '+out+' رفته؛ رنج شکسته شده و این پیشنهاد فعلاً به کار نمی‌آید. دوره را کوتاه‌تر کن.</span></div>':'')+
      '<div>کف‌ها حوالی <b dir="ltr">'+fmtPrice(pr.supp)+'</b> ('+faN(pr.nLow)+' برگشت نزدیکش) · سقف‌ها حوالی <b dir="ltr">'+fmtPrice(pr.res)+'</b> ('+faN(pr.nHigh)+' برگشت) · فاصله '+fmtNum(w)+'٪'+
      ' = روی مارجین '+fmtNum(w*lev)+'٪</div>'+
      '<div class="srow"><button class="btn sm" id="swUseL">لانگ از کف، تارگت سقف</button><button class="btn sm" id="swUseS">شورت از سقف، تارگت کف</button></div>'+
      '<div class="hint">میانه‌ی نقطه‌های چرخشِ حرکت‌های دست‌کم '+fmtNum(pr.aP)+'٪ است، نه پیش‌بینی. استاپ را آن سوی کف/سقف بگذار؛ اگر قیمت از رنج بیرون بزند این حساب به هم می‌خورد.</div></div>';
  }
  h+='<div class="hint">«حرکت» یعنی دست‌کم '+fmtNum(pr.aP)+'٪ از آخرین سقف یا کف (= '+fmtNum(o.roi)+'٪ روی مارجین با اهرم '+fmtNum(lev)+'x)، '+
      'تا وقتی قیمت به همان اندازه برگردد. نوسان‌های ریزتر از کندل '+SW_TF[pr.tf]+' دیده نمی‌شوند.</div></div></details>';
  box.innerHTML=h;
  // تست خودکار و ربات: همین کارت، خودکار؛ ربات رنج ثابت از سناریوی دستی
  const dbt=$('#swDecBt');
  if(dbt)dbt.onclick=()=>{SWOPT.btTk=tk;SWOPT.open='bt';swOptSave();swRerender();btRun([tk]);
    setTimeout(()=>{const n=$('#btProg');if(n)n.scrollIntoView({block:'center',behavior:'smooth'});},60);};
  const dbo=$('#swDecBot');
  if(dbo)dbo.onclick=()=>botStartSheet({mode:sd?'scalp':'auto',tk});
  const sl=$('#swScLive');
  if(sl&&sc)sl.onclick=()=>{const c=scalpCfg(sc,o);botStartSheet({mode:'fix',tk,first:sc.dir,L:c.L,H:c.H,d:c.d,lev:c.lev,mg:swMg()});};
  const use=(dir,e,t)=>{const fx=v=>String(+(+v).toPrecision(6));
    SWOPT.dir=dir;SWOPT.me=fx(e);SWOPT.mt=fx(t);SWOPT.ms='';swOptSave();
    $('#swDir').value=dir;$('#swMe').value=SWOPT.me;$('#swMt').value=SWOPT.mt;$('#swMs').value='';
    toast('ورود و تارگت گذاشته شد؛ «بسنج» را بزن','info');$('#swTkGo').scrollIntoView({block:'center'});};
  const ul=$('#swUseL'), us=$('#swUseS');
  if(ul)ul.onclick=()=>use('long',pr.supp,pr.res);
  if(us)us.onclick=()=>use('short',pr.res,pr.supp);
}
/* جزئیات نوسانِ یک سیگنال؛ اگر سنجیده نشده، همین‌جا با یک دکمه */
function sheetSwing(p){
  const inp=audInput(p);if(!inp)return toast('این پست سیگنالِ قابل سنجش نیست','err');
  const pr=swOf(p,inp), o=SWOPT;
  const body=!pr?'<div class="hint">هنوز سنجیده نشده. با «بسنج» کندل‌های '+SW_TF[o.tf||'5m']+' همین سیگنال گرفته می‌شود.</div>'
   :!pr.act?'<div class="hint">'+(pr.st==='none'?'ورود این سیگنال فعال نشد.':pr.why==='nocandle'?'کندل این نماد نیامد.':'قابل سنجش نیست.')+'</div>'
   :swSvg(pr.spark,swLines(pr),90)+swLegend+
    '<div class="kv">'+
      '<div class="k"><b>بازه</b><span>'+jStampFa(new Date(pr.tAct))+' · '+fmtNum(pr.hours)+' ساعت'+(pr.open?' (هنوز ادامه دارد)':'')+'</span></div>'+
      (pr.tpR!=null?'<div class="k"><b>لمس تارگت ۱</b><span class="u">'+faN(pr.tpN)+' بار</span></div>':'')+
      (pr.tpN?'<div class="k"><b>برگشت به ورود بعد از تارگت ۱</b><span class="'+(pr.beN?'w':'u')+'">'+faN(pr.beN)+' بار</span></div>':'')+
      '<div class="k"><b>نزدیک استاپ (−'+fmtNum(o.near)+'R)</b><span class="'+(pr.nearN?'w':'u')+'">'+faN(pr.nearN)+' بار</span></div>'+
      '<div class="k"><b>رسیدن به استاپ</b><span class="'+(pr.stopN?'d':'u')+'">'+faN(pr.stopN)+' بار</span></div>'+
      (pr.maeBR!=null?'<div class="k"><b>افت پیش از تارگت ۱</b><span class="d">'+fmtR(pr.maeBR)+'</span></div>':'')+
      '<div class="k"><b>بیشترین سود در دسترس</b><span class="u">'+fmtR(pr.mfeR)+' · '+fmtPct(z0(pr.mfeP))+'</span></div>'+
      '<div class="k"><b>بیشترین افت</b><span class="d">'+fmtR(pr.maeR)+' · '+fmtPct(z0(pr.maeP))+'</span></div>'+
      '<div class="k"><b>رسیدن به +'+fmtNum(o.roi)+'٪ / −'+fmtNum(o.roi)+'٪ روی مارجین</b><span>'+faN(pr.plusN)+' / '+faN(pr.minusN)+' بار</span></div>'+
      '<div class="k"><b>رفت‌وآمد از سر به سر</b><span class="'+(pr.flips?'w':'')+'">'+faN(pr.flips)+' بار</span></div>'+
      '<div class="k"><b>حرکت‌های دست‌کم '+fmtNum(pr.aP)+'٪</b><span>'+faN(pr.legs)+(pr.legAvg!=null?' · میانگین '+fmtNum(pr.legAvg)+'٪':'')+'</span></div>'+
      '<div class="k"><b>لیکوئید با '+fmtNum(o.lev)+'x</b><span class="'+(pr.liqT?'d':'u')+'">'+(pr.liqT?'می‌شد · '+jStampFa(new Date(pr.liqT)):'نه')+'</span></div>'+
    '</div>'+scalpHtml(pr.scalp,false);
  openSheet('<h3>نوسان · '+esc(inp.tk)+' <span class="pill '+inp.dir+'">'+(inp.dir==='long'?'لانگ':'شورت')+'</span></h3>'+
    '<div class="sub">ورود '+fmtPrice(inp.entry)+' · استاپ '+fmtPrice(inp.stop)+(inp.tps.length?' · تارگت ۱ '+fmtPrice(inp.tps[0]):'')+
      ' · باند ±'+fmtNum(o.roi)+'٪ با '+fmtNum(o.lev)+'x · '+SW_WIN[o.win]+' · کندل '+SW_TF[o.tf||'5m']+'</div>'+body+
    '<div class="srow"><button class="btn pri" id="swGo">'+(pr?'دوباره بسنج':'بسنج')+'</button><button class="btn" id="cx">بستن</button></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#swGo').onclick=async e=>{
       btnBusy(e.currentTarget,true,'در حال گرفتن کندل');
       try{const prof=await swOne(p,inp,Object.assign({},SWOPT));SWING[p.id]={k:swKey(inp,SWOPT),at:Date.now(),prof};swSave();
         closeSheet();setTimeout(()=>{sheetSwing(p);swRerender();},260);}
       catch(err){toast('کندل نیامد'+(AUDQ.err?' — '+AUDQ.err:''),'err');btnBusy(e.currentTarget,false);}
     };
   });
}
