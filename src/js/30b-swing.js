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
const SWOPT=Object.assign({lev:10,roi:20,win:'sig',near:0.75,hys:0.5,days:3,tk:'',tf:'5m',dir:'long',me:'',mt:'',ms:'',open:'tok'},lsGet(SWOPTKEY)||{});
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
  let hi=P[0].p,lo=P[0].p,dir=0,piv=P[0].p,ext=P[0].p;
  for(const {p} of P){
    if(dir===0){
      if(p>hi)hi=p;if(p<lo)lo=p;
      if(hi/lo-1>=th){dir=p===hi?1:-1;piv=dir>0?lo:hi;ext=p;}
      continue;
    }
    if(dir>0){
      if(p>ext)ext=p;
      else if(ext/p-1>=th){legs.push({up:true,pct:(ext/piv-1)*100,from:piv,to:ext});piv=ext;ext=p;dir=-1;}
    }else{
      if(p<ext)ext=p;
      else if(p/ext-1>=th){legs.push({up:false,pct:(1-ext/piv)*100,from:piv,to:ext});piv=ext;ext=p;dir=1;}
    }
  }
  if(dir!==0){const pct=dir>0?(ext/piv-1)*100:(1-ext/piv)*100;if(pct>=th*100)legs.push({up:dir>0,pct,open:true,from:piv,to:ext});}
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
    tpP:inp.tps.length?(inp.tps[0]-E)*sign/E*100:null,stopP:-risk/E*100,spark:swSpark(mv,70)};
}
/* پروفایل یک توکن بدون سیگنال: حرکت‌های دست‌کم به اندازه‌ی باند و خطر لیکوئید */
function coinProfile(C,o){
  if(!C.length)return null;
  const P=swPts(C), a=swBand(o), liqF=1/(+o.lev||10)-MMR;
  const L=swZigzag(P,a), lg=legStat(L);
  let hi=-Infinity,lo=Infinity;for(const k of C){if(k.h>hi)hi=k.h;if(k.l<lo)lo=k.l;}
  const p0=C[0].o, hours=(C[C.length-1].t+swTfMs(o)-C[0].t)/36e5;
  /* کف‌ها و سقف‌های برگشت (نقطه‌های چرخشِ زیگزاگ) — برای پیشنهاد ورود و تارگت در رنج */
  const med=a=>{if(!a.length)return null;const b=a.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;};
  const lows=[],highs=[];
  for(const l of L){(l.up?lows:highs).push(l.from);if(!l.open)(l.up?highs:lows).push(l.to);}
  // نوسان ساعتی: میانگینِ (سقف−کف)/کف در هر ساعت
  const hr=new Map();for(const k of C){const h=Math.floor(k.t/36e5);const v=hr.get(h)||{h:-Infinity,l:Infinity};v.h=Math.max(v.h,k.h);v.l=Math.min(v.l,k.l);hr.set(h,v);}
  const hrs=[...hr.values()].map(v=>(v.h/v.l-1)*100);
  return {from:C[0].t,to:C[C.length-1].t+swTfMs(o),hours,aP:a*100,liqP:liqF*100,lev:+o.lev,roi:+o.roi,tf:o.tf||'5m',
    supp:med(lows),res:med(highs),nLow:lows.length,nHigh:highs.length,
    hi,lo,rangeP:(hi/lo-1)*100,legs:lg.n,up:lg.up,dn:lg.dn,legAvg:lg.avg,legMax:lg.max,
    overLiq:L.filter(x=>x.pct/100>=liqF).length,hrAvg:hrs.length?hrs.reduce((s,v)=>s+v,0)/hrs.length:null,
    perDay:hours>0?lg.n/(hours/24):null,last:C[C.length-1].c,
    spark:swSpark(P.map(q=>(q.p/p0-1)*100),70)};
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
  return pr;
}

/* ---- گرفتن کندل: هر تایم‌فریم، چند درخواست پشت هم تا بازه پوشیده شود ---- */
function swAggr(C,ms){
  const out=[];
  for(const k of C){const t=Math.floor(k.t/ms)*ms, b=out[out.length-1];
    if(b&&b.t===t){b.h=Math.max(b.h,k.h);b.l=Math.min(b.l,k.l);b.c=k.c;}
    else out.push({t,o:k.o,h:k.h,l:k.l,c:k.c});}
  return out;
}
async function swCandlesTf(tk,tf,from,to,stop){
  try{return await swCandles(tk,from,to,stop,tf);}
  catch(e){
    const base=SW_TFBASE[tf];if(!base)throw e;
    const C=await swCandles(tk,from,to,null,base);
    return swAggr(C,IVMS[tf]);
  }
}
/* ---- گرفتن کندل (پایه): حداکثر ۸ درخواستِ ۱۰۰۰تایی ---- */
async function swCandles(tk,from,to,stop,tf){
  tf=tf||'5m';const ms=IVMS[tf], maxReq=tf==='1m'||tf==='3m'?8:4;
  const out=[];let s=Math.floor(from/ms)*ms;
  for(let n=0;n<maxReq&&s<to;n++){
    const lim=Math.min(1000,Math.ceil((to-s)/ms)+1);
    /* هر تکه یک بار دوباره امتحان می‌شود؛ اگر باز نشد و تکه‌های قبلی آمده‌اند، همان‌ها می‌مانند
       (روی شبکه‌ی ناپایدار یک درخواستِ شکست‌خورده کل سنجش را بی‌نتیجه نکند) */
    let c;
    try{c=await audCandles(tk,tf,s,lim);}
    catch(e){try{c=await audCandles(tk,tf,s,lim);}catch(e2){if(out.length){out.cut=true;break;}throw e2;}}
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

/* ---- صف سنجش: فقط با دکمه ---- */
const SWQ={on:false,n:0,done:0,fail:0,stop:false};
async function swRun(list){
  if(SWQ.on)return;
  const o=Object.assign({},SWOPT);
  Object.assign(SWQ,{on:true,n:list.length,done:0,fail:0,stop:false});
  paintSwProg();
  const work=list.slice();
  const worker=async()=>{
    while(work.length&&!SWQ.stop){
      const {p,inp}=work.shift();
      try{const prof=await swOne(p,inp,o);SWING[p.id]={k:swKey(inp,o),at:Date.now(),prof};}
      catch(e){SWQ.fail++;}
      SWQ.done++;paintSwProg();
    }
  };
  await Promise.all([worker(),worker()]);       // دو تا هم‌زمان؛ بیشتر، منبع‌های کندل را خسته می‌کند
  swSave();SWQ.on=false;
  if(!$('#vAudit').classList.contains('hide'))renderAudit();
  toast(SWQ.stop?'سنجش نوسان نیمه‌کاره متوقف شد':'نوسان '+faN(SWQ.done-SWQ.fail)+' سیگنال سنجیده شد','ok');
}
function paintSwProg(){
  const b=$('#swProg');if(!b)return;
  b.classList.toggle('hide',!SWQ.on);
  if(SWQ.on)b.innerHTML='<i style="width:'+(SWQ.n?SWQ.done/SWQ.n*100:0).toFixed(1)+'%"></i><span>'+faN(SWQ.done)+' از '+faN(SWQ.n)+
    (SWQ.fail?' · '+faN(SWQ.fail)+' ناموفق':'')+'</span>';
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
function swLine(pr){
  if(!pr||!pr.act)return '';
  const bits=[];
  if(pr.tpR!=null)bits.push(faN(pr.tpN)+' بار تارگت ۱');
  bits.push(faN(pr.nearN)+' بار نزدیک استاپ');
  if(pr.tpN)bits.push(faN(pr.beN)+' بار برگشت به ورود');
  bits.push(faN(pr.flips)+' بار ±'+fmtNum(pr.aP)+'٪');
  return bits.join(' · ');
}
const z0=v=>Math.abs(v)<0.005?0:v;         // «−0.00٪» نشان داده نشود
const fmtNum=v=>v==null||!isFinite(v)?'—':String(+(+v).toFixed(v<1?2:1));

/* ---- پنل در کانال‌سنج ----
   سه بخشِ آکاردئونی (فقط یکی باز): تنظیم‌ها، بررسی توکن و سناریوی دستی، سیگنال‌ها */
function swSection(id,title,sub,bodyFn){
  const open=SWOPT.open===id;
  const w=el('div','swsec'+(open?' on':''));w.dataset.id=id;
  const h=el('button','swsh','<b>'+title+'</b>'+(sub?'<span>'+sub+'</span>':'')+'<i class="chev"></i>');
  h.type='button';h.setAttribute('aria-expanded',open?'true':'false');
  h.onclick=()=>{
    const y0=h.getBoundingClientRect().top;
    SWOPT.open=open?'':id;swOptSave();renderAudit();
    // سربرگِ زده‌شده سر جایش بماند (رندر دوباره‌ی تب صفحه را نپراند)
    const nh=document.querySelector('.swsec[data-id="'+id+'"] .swsh');
    if(nh){const dy=nh.getBoundingClientRect().top-y0;if(Math.abs(dy)>0.5)window.scrollBy(0,dy);}
  };
  w.appendChild(h);
  if(open){const b=el('div','swsb');bodyFn(b);w.appendChild(b);}
  return w;
}
function buildSwingPanel(rows){
  const o=SWOPT, a=swBand(o)*100, liq=(1/(+o.lev||10)-MMR)*100;
  const c=el('div','panel swp');
  c.appendChild(el('div','panelhead','<b>نوسان‌سنج</b><span class="markhint">فقط وقتی بزنی می‌سنجد</span>'));
  c.appendChild(el('div','hint','باند <b>±'+fmtNum(o.roi)+'٪ روی مارجین</b> با اهرم <b>'+fmtNum(o.lev)+'x</b> = ±'+fmtNum(a)+'٪ حرکت قیمت · کندل '+SW_TF[o.tf||'5m']));
  if(liq<=a)c.appendChild(el('div','flag d','<i>!</i><span>با اهرم '+fmtNum(o.lev)+'x قیمت در حدود '+fmtNum(liq)+'٪ خلاف جهت لیکوئید می‌شود؛ یعنی پیش از رسیدن به −'+fmtNum(o.roi)+'٪ کل مارجین رفته است.</span>'));

  // ── تنظیم‌ها ──
  c.appendChild(swSection('opt','تنظیم‌ها','اهرم '+fmtNum(o.lev)+'x · باند '+fmtNum(o.roi)+'٪ · '+SW_TF[o.tf||'5m']+' · '+SW_WIN[o.win],b=>{
    const g=el('div','grid swopt');
    g.innerHTML='<div class="fld"><label>اهرم</label><input id="swLev" type="number" min="1" max="125" step="1" inputmode="decimal" value="'+o.lev+'"></div>'+
      '<div class="fld"><label>باند روی مارجین (٪)</label><input id="swRoi" type="number" min="1" max="500" step="1" inputmode="decimal" value="'+o.roi+'"></div>'+
      '<div class="fld"><label>بازه‌ی سیگنال</label><select id="swWin">'+Object.entries(SW_WIN).map(([k,v])=>'<option value="'+k+'"'+(o.win===k?' selected':'')+'>'+v+'</option>').join('')+'</select></div>';
    b.appendChild(g);
    b.appendChild(el('div','tgl','تایم‌فریم کندل'));
    const tf=el('div','pbpick swtf');
    for(const [k,v] of Object.entries(SW_TF)){const x=el('button','pbc'+((o.tf||'5m')===k?' on':''),v);x.type='button';
      x.setAttribute('aria-pressed',(o.tf||'5m')===k);x.onclick=()=>{o.tf=k;swOptSave();renderAudit();};tf.appendChild(x);}
    b.appendChild(tf);
    b.appendChild(el('div','hint','کوچک‌تر = دقیق‌تر (ترتیبِ بالا و پایینِ داخل هر کندل) ولی کندتر؛ ۱ و ۳ دقیقه‌ای حداکثر حدود '+
      '۵ و ۱۶ روز را پوشش می‌دهند. تایم‌فریم و باند برای هر دو بخش پایین است؛ عوضشان کنی، سیگنال‌ها باید دوباره سنجیده شوند.'));
    const read=()=>{
      o.lev=Math.min(125,Math.max(1,parseFloat(normDig($('#swLev').value))||10));
      o.roi=Math.min(500,Math.max(1,parseFloat(normDig($('#swRoi').value))||20));
      o.win=$('#swWin').value in SW_WIN?$('#swWin').value:'sig';
      swOptSave();renderAudit();
    };
    g.querySelectorAll('input,select').forEach(i=>i.onchange=read);
  }));

  // ── یک توکن و سناریوی دستی ──
  c.appendChild(swSection('tok','بررسی توکن و ورود دستی',o.tk?o.tk+(o.me?' · ورود '+o.me:''):'یک نماد، و اگر خواستی نقطه‌ی ورودِ خودت',b=>{
    const tks=[...new Set(POSTS.map(p=>sigOf(p).ticker).filter(Boolean))].sort();
    b.innerHTML='<div class="grid swopt">'+
      '<div class="fld"><label>نماد</label><input id="swTk" dir="ltr" list="swTkL" placeholder="مثلاً SOL" value="'+esc(o.tk||'')+'">'+
        '<datalist id="swTkL">'+tks.map(t=>'<option value="'+esc(t)+'">').join('')+'</datalist></div>'+
      '<div class="fld"><label>دوره</label><select id="swDays"><option value="0.5">۱۲ ساعت اخیر</option><option value="1">۱ روز اخیر</option><option value="3">۳ روز اخیر</option><option value="7">۷ روز اخیر</option></select></div>'+
      '<div class="fld"><label>جهت</label><select id="swDir"><option value="long">لانگ</option><option value="short">شورت</option></select></div>'+
      '<div class="fld"><label>نقطه‌ی ورود</label><input id="swMe" dir="ltr" inputmode="decimal" placeholder="خالی = فقط نوسان توکن" value="'+esc(o.me||'')+'"></div>'+
      '<div class="fld"><label>تارگت ۱</label><input id="swMt" dir="ltr" inputmode="decimal" placeholder="خالی = +باند" value="'+esc(o.mt||'')+'"></div>'+
      '<div class="fld"><label>حد ضرر</label><input id="swMs" dir="ltr" inputmode="decimal" placeholder="خالی = −باند" value="'+esc(o.ms||'')+'"></div>'+
      '</div><div class="srow"><button class="btn pri" id="swTkGo">'+ic('search')+'<span>بسنج</span></button>'+
      '<button class="btn" id="swClr">پاک کردن ورود</button></div><div id="swCoin"></div>';
    setTimeout(()=>{
      $('#swDays').value=String(o.days||3);$('#swDir').value=o.dir||'long';
      const read=()=>{o.tk=String($('#swTk').value||'').trim().toUpperCase().replace(/USDT$/,'');o.days=+$('#swDays').value||3;
        o.dir=$('#swDir').value;o.me=$('#swMe').value.trim();o.mt=$('#swMt').value.trim();o.ms=$('#swMs').value.trim();swOptSave();};
      b.querySelectorAll('input,select').forEach(i=>i.onchange=read);
      $('#swClr').onclick=()=>{$('#swMe').value=$('#swMt').value=$('#swMs').value='';read();};
      $('#swTkGo').onclick=async e=>{
        read();
        if(!/^[A-Z0-9]{2,15}$/.test(o.tk))return toast('نماد را بنویس، مثلاً SOL','err');
        const go=e.currentTarget;btnBusy(go,true,'در حال گرفتن کندل');
        try{
          const to=Date.now(), C=await swCandlesTf(o.tk,o.tf||'5m',to-o.days*864e5,to);
          if(!C.length)throw new Error('empty');
          const oo=Object.assign({},o), pr=coinProfile(C,oo);
          const sc=o.me?manualScenario(oo,null):null;
          const mp=sc?manualProfile(C,oo,sc):null;
          SWCOIN={tk:o.tk,o:oo,pr,sc,mp,at:Date.now()};
          paintSwCoin();
        }catch(err){toast('کندل '+o.tk+' نیامد'+(AUDQ.err?' — '+AUDQ.err:''),'err');}
        btnBusy(go,false);
      };
      paintSwCoin();
    },0);
  }));

  // ── سیگنال‌ها ──
  const meas=rows.filter(x=>x.inp.tk&&!audPre(x.inp)&&x.r&&x.r.tAct);
  const have=meas.filter(x=>swOf(x.p,x.inp)), todo=meas.filter(x=>!swOf(x.p,x.inp));
  c.appendChild(swSection('sig','سیگنال‌ها'+(AF.sym?' · '+esc(AF.sym):''),
    faN(have.length)+' از '+faN(meas.length)+' سنجیده'+(SWQ.on?' · در حال سنجش':''),b=>{
    const bar=el('div','srow');bar.style.marginTop='0';
    const bRun=el('button','btn pri sm',ic('bars')+'<span>'+(todo.length?'سنجش نوسان '+faN(todo.length)+' سیگنال':'همه سنجیده شده‌اند')+'</span>');
    bRun.disabled=!todo.length||SWQ.on;
    bRun.onclick=()=>swRun(todo.map(x=>({p:x.p,inp:x.inp})));
    bar.appendChild(bRun);
    if(have.length){const bAll=el('button','btn sm','دوباره همه ('+faN(meas.length)+')');bAll.disabled=SWQ.on;
      bAll.onclick=()=>swRun(meas.map(x=>({p:x.p,inp:x.inp})));bar.appendChild(bAll);}
    const bStop=el('button','btn sm'+(SWQ.on?'':' hide'),'توقف');bStop.onclick=()=>{SWQ.stop=true;};
    bar.appendChild(bStop);
    b.appendChild(bar);
    const pg=el('div','audprog'+(SWQ.on?'':' hide'));pg.id='swProg';b.appendChild(pg);
    if(!meas.length)b.appendChild(el('div','hint','هنوز سیگنالِ فعال‌شده‌ای در کانال‌سنج نیست؛ اول باید سنجیده شوند (ورودشان فعال شده باشد).'));
    else if(!have.length)b.appendChild(el('div','hint',faN(meas.length)+' سیگنال آماده‌ی سنجش'+(AF.sym||AF.dir!=='all'||AF.span?' (با فیلتر بالا)':'')+
      '. برای هر کدام کندل '+SW_TF[o.tf||'5m']+' گرفته می‌شود؛ چند دقیقه طول می‌کشد.'));
    else b.appendChild(swAggregate(have));
    setTimeout(paintSwProg,0);
  }));
  return c;
}
let SWCOIN=null;
function paintSwCoin(){
  const box=$('#swCoin');if(!box)return;
  if(!SWCOIN||!SWCOIN.pr){box.innerHTML='';return;}
  const {tk,o,pr,sc,mp}=SWCOIN;
  const k=(l,v,c,sub)=>stHtml(l,v,c,sub);
  const lev=o.lev;
  let h='';
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
        '<div class="hint">بعد از خوردن استاپ هم شمارش ادامه دارد (برای دیدن رفتار قیمت)؛ «خوردن استاپ» یعنی چند بار به آن رسید.</div>';
    }
    h+='</div>';
  }
  // ── نوسان توکن ──
  const verdict=pr.legs===0?['i','در این دوره هیچ حرکتی به اندازه‌ی باند نبود']
    :pr.overLiq?['d',faN(pr.overLiq)+' حرکت از فاصله‌ی لیکوئید ('+fmtNum(pr.liqP)+'٪) بزرگ‌تر بود؛ با اهرم '+fmtNum(lev)+'x بدون استاپ، یک بار خلاف جهت بودن کافی بود']
    :['u','هیچ حرکتی از فاصله‌ی لیکوئید بزرگ‌تر نبود؛ ولی این گذشته است، نه تضمین آینده'];
  h+='<div class="swres">'+
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
    h+='<div class="swsug"><b>پیشنهاد از کف و سقف‌های برگشتِ همین دوره</b>'+
      '<div>کف‌ها حوالی <b dir="ltr">'+fmtPrice(pr.supp)+'</b> ('+faN(pr.nLow)+' بار) · سقف‌ها حوالی <b dir="ltr">'+fmtPrice(pr.res)+'</b> ('+faN(pr.nHigh)+' بار) · فاصله '+fmtNum(w)+'٪'+
      ' = روی مارجین '+fmtNum(w*lev)+'٪</div>'+
      '<div class="srow"><button class="btn sm" id="swUseL">لانگ از کف، تارگت سقف</button><button class="btn sm" id="swUseS">شورت از سقف، تارگت کف</button></div>'+
      '<div class="hint">میانه‌ی نقطه‌های چرخشِ حرکت‌های دست‌کم '+fmtNum(pr.aP)+'٪ است، نه پیش‌بینی. استاپ را آن سوی کف/سقف بگذار؛ اگر قیمت از رنج بیرون بزند این حساب به هم می‌خورد.</div></div>';
  }
  h+='<div class="hint">«حرکت» یعنی دست‌کم '+fmtNum(pr.aP)+'٪ از آخرین سقف یا کف (= '+fmtNum(o.roi)+'٪ روی مارجین با اهرم '+fmtNum(lev)+'x)، '+
      'تا وقتی قیمت به همان اندازه برگردد. نوسان‌های ریزتر از کندل '+SW_TF[pr.tf]+' دیده نمی‌شوند.</div></div>';
  box.innerHTML=h;
  const use=(dir,e,t)=>{const fx=v=>String(+(+v).toPrecision(6));
    SWOPT.dir=dir;SWOPT.me=fx(e);SWOPT.mt=fx(t);SWOPT.ms='';swOptSave();
    $('#swDir').value=dir;$('#swMe').value=SWOPT.me;$('#swMt').value=SWOPT.mt;$('#swMs').value='';
    toast('ورود و تارگت گذاشته شد؛ «بسنج» را بزن','info');$('#swTkGo').scrollIntoView({block:'center'});};
  const ul=$('#swUseL'), us=$('#swUseS');
  if(ul)ul.onclick=()=>use('long',pr.supp,pr.res);
  if(us)us.onclick=()=>use('short',pr.res,pr.supp);
}
/* جمع‌بندی سیگنال‌های سنجیده‌شده + جدول نماد + پرنوسان‌ترین‌ها */
function swAggregate(have){
  const w=el('div');
  const P=have.map(x=>({x,pr:swOf(x.p,x.inp)})).filter(z=>z.pr&&z.pr.act);
  if(!P.length){w.appendChild(el('div','hint','هیچ‌کدام از سیگنال‌های سنجیده‌شده در این بازه داده نداشتند.'));return w;}
  const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
  const pct=(n,d)=>d?Math.round(n/d*100):null;
  const withTp=P.filter(z=>z.pr.tpN>0);
  const multiTp=withTp.filter(z=>z.pr.tpN>=2).length;
  const beBack=withTp.filter(z=>z.pr.beN>0).length;
  const nearAny=P.filter(z=>z.pr.nearN>0).length;
  const nearBefore=withTp.filter(z=>z.pr.maeBR!=null&&z.pr.maeBR<=-(+SWOPT.near||0.75)).length;
  const flipAny=P.filter(z=>z.pr.flips>0).length;
  const liqN=P.filter(z=>z.pr.liqT).length;
  const st=el('div','stats');
  st.innerHTML=
    stHtml('سنجیده',faN(P.length),'',faN(withTp.length)+' به تارگت ۱ رسید')+
    stHtml('میانگین لمس تارگت ۱',withTp.length?fmtNum(avg(withTp.map(z=>z.pr.tpN))):'—','u',pct(multiTp,withTp.length)!=null?pct(multiTp,withTp.length)+'٪ بیش از یک بار':'')+
    stHtml('برگشت به ورود بعد از تارگت ۱',pct(beBack,withTp.length)==null?'—':pct(beBack,withTp.length)+'٪',beBack?'w':'u','از سیگنال‌هایی که تارگت ۱ زدند')+
    stHtml('نزدیک استاپ',pct(nearAny,P.length)+'٪',nearAny?'w':'u','دست‌کم یک بار تا −'+fmtNum(SWOPT.near)+'R')+
    stHtml('افت پیش از سود',withTp.length?fmtR(avg(withTp.filter(z=>z.pr.maeBR!=null).map(z=>z.pr.maeBR))):'—','d',
      nearBefore?faN(nearBefore)+' تا پیش از سود تا نزدیک استاپ رفتند':'میانگین، پیش از تارگت ۱')+
    stHtml('بیشترین سود در دسترس',fmtR(avg(P.map(z=>z.pr.mfeR))),'u','میانگین MFE')+
    stHtml('رفت‌وآمد ±'+fmtNum(SWOPT.roi)+'٪',fmtNum(avg(P.map(z=>z.pr.flips))),flipAny?'w':'m',pct(flipAny,P.length)+'٪ دست‌کم یک بار از سر به سر')+
    stHtml('لیکوئید با '+fmtNum(SWOPT.lev)+'x',faN(liqN),liqN?'d':'u',pct(liqN,P.length)+'٪ سیگنال‌ها، بدون استاپ');
  w.appendChild(st);
  // جمله‌های قابل‌استفاده
  const tips=[];
  if(withTp.length>=3){
    if(pct(multiTp,withTp.length)>=50)tips.push('بیشتر سیگنال‌ها بیش از یک بار به تارگت ۱ رسیده‌اند؛ برای سیو سود عجله‌ی زیادی لازم نیست.');
    if(pct(beBack,withTp.length)>=40)tips.push(pct(beBack,withTp.length)+'٪ بعد از تارگت ۱ تا ورود برگشته‌اند؛ سیو بخشی از سود سر تارگت ۱ یا استاپ روی ورود منطقی است.');
    if(pct(nearBefore,withTp.length)>=30)tips.push(pct(nearBefore,withTp.length)+'٪ برنده‌ها پیش از سود تا نزدیک استاپ رفته‌اند؛ استاپ تنگ‌تر از این، برنده‌ها را هم می‌بُرد.');
  }
  if(P.length>=3&&pct(flipAny,P.length)>=40)tips.push(pct(flipAny,P.length)+'٪ سیگنال‌ها بین +'+fmtNum(SWOPT.roi)+'٪ و −'+fmtNum(SWOPT.roi)+'٪ رفت‌وآمد داشته‌اند؛ اگر رنج‌زدن را معامله می‌کنی، خروج سر باند و ورود دوباره کار می‌کند — به شرط استاپ.');
  if(liqN)tips.push('با اهرم '+fmtNum(SWOPT.lev)+'x و بدون استاپ، '+faN(liqN)+' سیگنال لیکوئید می‌شد؛ اهرم بالا فقط با استاپ واقعی.');
  if(tips.length)w.appendChild(el('div','swtips','<ul>'+tips.map(t=>'<li>'+t+'</li>').join('')+'</ul>'));
  // به تفکیک نماد
  const m=new Map();
  for(const z of P){const k=z.x.inp.tk, v=m.get(k)||{n:0,tp:0,fl:0,mfe:0,mae:0,liq:0};
    v.n++;v.tp+=z.pr.tpN;v.fl+=z.pr.flips;v.mfe+=z.pr.mfeP;v.mae+=z.pr.maeP;if(z.pr.liqT)v.liq++;m.set(k,v);}
  if(m.size>1){
    const tb=el('table','tp');
    tb.innerHTML='<thead><tr><th>نماد</th><th>تعداد</th><th>تارگت ۱</th><th>±باند</th><th>سقف</th><th>کف</th></tr></thead><tbody>'+
      [...m].sort((a,b)=>b[1].fl/b[1].n-a[1].fl/a[1].n).slice(0,15).map(([k,v])=>'<tr class="tap" data-s="'+esc(k)+'"><td>'+esc(k)+'</td><td class="num">'+faN(v.n)+
        '</td><td class="num">'+fmtNum(v.tp/v.n)+'</td><td class="num">'+fmtNum(v.fl/v.n)+'</td><td class="num u">'+fmtPct(v.mfe/v.n)+
        '</td><td class="num d">'+fmtPct(v.mae/v.n)+'</td></tr>').join('')+'</tbody>';
    tb.querySelector('tbody').onclick=e=>{const tr=e.target.closest('tr[data-s]');if(!tr)return;
      AF.sym=AF.sym===tr.dataset.s?'':tr.dataset.s;afSave();renderAudit();};
    w.appendChild(el('div','sechd','به تفکیک نماد (میانگین هر سیگنال)'));
    w.appendChild(tWrap(tb));
  }
  // پرنوسان‌ترین‌ها
  w.appendChild(el('div','sechd','پرنوسان‌ترین سیگنال‌ها'));
  const L=el('div','swlist');
  for(const z of P.slice().sort((a,b)=>b.pr.flips-a.pr.flips||b.pr.tpN-a.pr.tpN).slice(0,12)){
    const it=el('button','swit');it.type='button';
    it.innerHTML='<div class="swh"><b dir="ltr">'+esc(z.x.inp.tk)+'</b><span class="pill '+z.x.inp.dir+'">'+(z.x.inp.dir==='long'?'لانگ':'شورت')+'</span>'+
      '<span>'+(z.x.p.date?jStampFa(z.x.p.date).slice(0,10):'')+'</span></div>'+swSvg(z.pr.spark,swLines(z.pr),46)+
      '<div class="swl1">'+swLine(z.pr)+'</div>';
    it.onclick=()=>sheetSwing(z.x.p);
    L.appendChild(it);
  }
  w.appendChild(L);
  w.appendChild(el('div','hint','عددها از لحظه‌ی فعال شدن ورود، '+SW_WIN[SWOPT.win]+'. «لمس دوباره» فقط بعد از دست‌کم '+fmtNum(SWOPT.hys)+'R عقب‌نشینی شمرده می‌شود.'));
  return w;
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
    '</div>';
  openSheet('<h3>نوسان · '+esc(inp.tk)+' <span class="pill '+inp.dir+'">'+(inp.dir==='long'?'لانگ':'شورت')+'</span></h3>'+
    '<div class="sub">ورود '+fmtPrice(inp.entry)+' · استاپ '+fmtPrice(inp.stop)+(inp.tps.length?' · تارگت ۱ '+fmtPrice(inp.tps[0]):'')+
      ' · باند ±'+fmtNum(o.roi)+'٪ با '+fmtNum(o.lev)+'x · '+SW_WIN[o.win]+' · کندل '+SW_TF[o.tf||'5m']+'</div>'+body+
    '<div class="srow"><button class="btn pri" id="swGo">'+(pr?'دوباره بسنج':'بسنج')+'</button><button class="btn" id="cx">بستن</button></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#swGo').onclick=async e=>{
       btnBusy(e.currentTarget,true,'در حال گرفتن کندل');
       try{const prof=await swOne(p,inp,Object.assign({},SWOPT));SWING[p.id]={k:swKey(inp,SWOPT),at:Date.now(),prof};swSave();
         closeSheet();setTimeout(()=>{sheetSwing(p);if(!$('#vAudit').classList.contains('hide'))renderAudit();},260);}
       catch(err){toast('کندل نیامد'+(AUDQ.err?' — '+AUDQ.err:''),'err');btnBusy(e.currentTarget,false);}
     };
   });
}
