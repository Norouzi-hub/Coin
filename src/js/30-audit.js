/* ==================== کانال‌سنج ==================== */
/* هدف برنامه سنجیدن کانال است، نه فقط معاملات خودت. تا نسخه‌ی 1 تنها چیزی که به
   کانال نگاه می‌کرد، گزارش «نگرفته‌ها» بود که با قیمتِ همین لحظه حساب می‌کرد: سیگنالی
   که هفته‌ی پیش تارگت زد و بعد ریخت، باخت دیده می‌شد. اینجا هر سیگنال از لحظه‌ی دقیق
   انتشار، کندل‌به‌کندل با قیمت واقعی جلو می‌رود تا معلوم شود واقعاً چه شد.
   منبع کندل: بایننس اسپات، بعد بایننس فیوچرز، بعد MEXC (همان قالب). اولی که برای یک
   نماد جواب داد یادش می‌ماند. نتیجه‌ی قطعی یک بار حساب و نگه داشته می‌شود. */
const AUDKEY='signaldesk.audit.v2', AUDSRCKEY='signaldesk.audsrc.v1';
let AUD=(()=>{const a=lsGet(AUDKEY);return a&&a.v===2&&a.r&&typeof a.r==='object'?a.r:{};})();
const AUDSRC=lsGet(AUDSRCKEY)||{};
const audSave=()=>lsSet(AUDKEY,{v:2,r:AUD});
const AUD_DEF={days:30,entryDays:3,tol:1,rule:'tp1'};
const audRules=()=>Object.assign({},AUD_DEF,S.aud||{});
const DAY=86400000;
const AUD_WHY={
  'no-ticker':'نماد تشخیص داده نشد',
  'no-entry':'نقطه‌ی ورود ندارد',
  'no-stop':'حد ضرر ندارد — بدون استاپ، برد و باخت تعریف ندارد',
  'no-date':'زمان انتشار معلوم نیست',
  'bad-stop':'استاپ با جهت معامله نمی‌خواند',
  'px':'قیمتِ اعلامی با قیمت بازار در لحظه‌ی انتشار بیش از 30٪ فاصله دارد — احتمالاً نماد اشتباه خوانده شده',
  'nocandle':'کندلِ این نماد از هیچ منبعی نیامد',
  'far-sl':'استاپِ گرفته‌شده از سیگنالِ قبلیِ همین نماد بیش از 30٪ با ورود فاصله دارد'
};
const AUD_NONE={timeout:'قیمت در مهلت ورود به نقطه‌ی ورود نرسید',
  ran:'قیمت بدون برگشتن به نقطه‌ی ورود، مستقیم به تارگت رفت — قابل گرفتن نبود',
  inval:'قبل از فعال شدنِ ورود، قیمت از استاپ گذشت'};

/* پست‌های پیگیریِ کانال («ورود مجدد مجازید»، «تریگر 0.0133 ست کنید»، «اگر 4 ساعته بالای 83700
   بست ورود مجازه») استاپ و تارگت را تکرار نمی‌کنند؛ همان‌های آخرین سیگنالِ استاپ‌دارِ همین
   نماد (تا ۴۵ روز پیش) معتبر است. نمایه یک بار ساخته می‌شود، نه برای هر پست. */
let PREVIX=null,PREVV='';
function prevSigOf(p,tk){
  const v=POSTS.length+'|'+(POSTS[0]&&POSTS[0].id)+'|'+SYMVER+'|'+KGEN;
  if(v!==PREVV){
    PREVV=v;PREVIX=new Map();
    for(const q of POSTS){
      if(!q.date)continue;
      const ov=OVERRIDE[q.id]||{}, g=q.origText?parseSignal(q.origText):parseSignal(q.text,q.id);
      const t=ov.ticker||g.ticker, st=ov.stop!=null?ov.stop:g.stop;
      if(!t||!st||!(ov.sig!=null?ov.sig:g.isSignal)||(ov.sig!==true&&isRes(q)))continue;
      if(!PREVIX.has(t))PREVIX.set(t,[]);
      PREVIX.get(t).push({t:+q.date,id:q.id,stop:st,tps:g.targets||[],dir:ov.dir||g.direction});
    }
    for(const l of PREVIX.values())l.sort((a,b)=>a.t-b.t);
  }
  const l=PREVIX.get(tk), t0=p.date?+p.date:0;
  if(!l||!t0)return null;
  let best=null;
  for(const x of l){if(x.t>=t0)break;if(x.id!==p.id&&t0-x.t<=45*DAY)best=x;}
  return best;
}
/* تارگت‌های در جهتِ سود از ورود؛ اگر کانال نداده، تارگت اولِ تنظیماتِ خودت (به R) فرض و صریح نوشته می‌شود */
function audTps(inp){
  const sign=inp.dir==='long'?1:-1, E=inp.entry, SL=inp.stop;
  let tps=(inp.tgs||[]).filter(t=>isFinite(t)&&t>0&&E&&(t-E)*sign>0);
  tps=[...new Set(tps)].sort((a,b)=>(a-b)*sign).slice(0,5);
  inp.tpAssumed=false;
  if(!tps.length&&E&&SL&&(E-SL)*sign>0){
    tps=[+(E+sign*(S.rMul[0]||1.5)*Math.abs(E-SL)).toPrecision(8)];inp.tpAssumed=true;
  }
  inp.tps=tps;
  return inp;
}
/* ورودیِ سنجش: عددهای «اولین نسخه‌ی» پست (اگر کانال بعداً ویرایشش کرده، ملاک همان است
   که اول منتشر شد) به‌علاوه‌ی اصلاح دستیِ تو، چون پارسر همیشه درست نمی‌خواند.
   ورودِ بازار (mktE): پست عددِ ورود نداده («ورود مجازه»)؛ ورود = قیمت لحظه‌ی انتشار، که موقع
   سنجش از اولین کندل گرفته و در نتیجه (e0) نگه داشته می‌شود. */
function audInput(p){
  const ov=OVERRIDE[p.id]||{};
  const base=p.origText?parseSignal(p.origText):parseSignal(p.text,p.id);
  const sig=Object.assign({},base);
  if(ov.ticker)sig.ticker=ov.ticker;
  if(ov.sig!=null)sig.isSignal=!!ov.sig;
  if(ov.market){sig.market=ov.market;sig.marketGuess=false;}
  if(ov.trigger!=null)sig.trigger=ov.trigger;
  if(!sig.isSignal)return null;
  if(ov.sig!==true&&isRes(p))return null;      // پستِ نتیجه سیگنالِ تازه نیست
  const inh=sig.stop==null&&ov.stop==null&&sig.ticker?prevSigOf(p,sig.ticker):null;
  if(inh){
    sig.stop=inh.stop;
    if(!sig.dirSet)sig.direction=inh.dir;
    if(!(sig.targets||[]).length)sig.targets=inh.tps;
  }
  const I=planInputsOf(p,sig,ov,null);
  const mktE=!I.entry&&ov.entry==null&&!!sig.mktEntry;
  const inp={tk:sig.ticker||null,dir:I.dir,entry:I.entry||null,trig:sig.trigger!=null?sig.trigger:null,
    stop:I.stop||null,tgs:sig.targets||[],mkt:I.market,t0:p.date?+p.date:null,
    mktE,inh:inh?{id:inh.id,t:inh.t}:null};
  audTps(inp);
  const a=mktE?AUD[p.id]:null;
  if(a&&a.e0&&a.k===audKey(inp,audRules())){inp.entry=a.e0;audTps(inp);}
  return inp;
}
/* کلیدِ ورودِ بازار از قیمتِ پرشده مستقل است، وگرنه بعد از هر سنجش کلید عوض می‌شد */
const audKey=(inp,R)=>JSON.stringify([inp.tk,inp.dir,inp.mktE?'mkt':inp.entry,inp.trig,inp.stop,inp.mktE?inp.tgs:inp.tps,inp.t0,
  R.days,R.entryDays,R.tol]);
function audPre(inp){
  if(!inp.tk)return 'no-ticker';
  if(!inp.entry&&!inp.mktE)return 'no-entry';
  if(!inp.stop)return 'no-stop';
  if(!inp.t0)return 'no-date';
  if(inp.entry&&(inp.entry-inp.stop)*(inp.dir==='long'?1:-1)<=0)return 'bad-stop';
  return null;
}

/* قلب کانال‌سنج: شبیه‌سازیِ کندل‌به‌کندلِ یک سیگنال. تابع خالص است — بی‌شبکه و
   بی‌صفحه — تا بشود جدا آزمودش.
   نوع ورود از قیمت لحظه‌ی انتشار معلوم می‌شود:
     mkt   قیمت در ±tol ورود است → همان لحظه فعال
     limit قیمت در جهت سود از ورود جلوتر است → منتظر برگشت به ورود
     break قیمت هنوز به ورود نرسیده (یا «بالای X» گفته) → منتظر شکستن
   پُر شدن همیشه با همان عددِ اعلامی حساب می‌شود؛ یعنی به نفع کانال، نه علیهش.
   وقتی داخل یک کندل دو رویدادی رخ داده که ترتیبشان نتیجه را عوض می‌کند و هندسه ترتیب
   را معلوم نمی‌کند، حدس نمی‌زنیم: amb برمی‌گردد و بیرون از اینجا کندلِ ریزتر گرفته می‌شود. */
function audWalk(inp,C,R){
  const sign=inp.dir==='long'?1:-1;
  const up=(k,x)=>sign>0?k.h>=x:k.l<=x;      // قیمت در جهت سود به x رسید
  const dn=(k,x)=>sign>0?k.l<=x:k.h>=x;      // قیمت در جهت ضرر به x رسید
  const out={st:'open',fin:false,px0:C.length?C[0].o:null,mode:null,tAct:null,tStop:null,
    tTp:[],tBE:null,nLad:null,late:false,chase:false,why:null,amb:null,close:null,tEnd:null};
  if(!C.length)return out;
  const E=inp.entry, SL=inp.stop, T=inp.tps, px0=out.px0, tol=(R.tol||0)/100, t0=inp.t0;
  if(T.length&&(px0-T[0])*sign>=0)out.late=true;                   // تارگت اول پیش از انتشار رسیده بود
  else if(T.length&&(px0-E)*sign>0&&(px0-E)/(T[0]-E)>0.5)out.chase=true;  // بیشترِ راه رفته بود
  const trigAhead=inp.trig!=null&&(inp.trig-px0)*sign>0;
  const mode=trigAhead?'break':(Math.abs(px0-E)/E<=tol?'mkt':((px0-E)*sign>0?'limit':'break'));
  const A=trigAhead?inp.trig:E;
  out.mode=mode;
  /* مسیر قیمت بعد از فعال شدن، روی پله‌های «استاپ، ورود، تارگت‌ها»: هر بار که قیمت به پله‌ی
     تازه‌ای بالا رفت (+شماره) یا تا پله‌ای پایین برگشت (−شماره−1). با همین، هر سبک خروجی
     (پله‌ای، ریسک‌فری، استاپ دنباله‌دار) بدون گرفتن دوباره‌ی کندل شبیه‌سازی می‌شود.
     ترتیب داخل هر کندل همان قاعده‌ی بالاست: اول برگشت، بعد پیشروی (محتاطانه). */
  const Lv=[SL,E].concat(T), P=[];out.path=P;
  let top=1,lastAdv=1,pEnd=false;
  const pPush=v=>{if(P.length<160)P.push(v);};
  const pAdv=(k,skipE)=>{if(pEnd)return;
    for(let j=0;j<lastAdv;j++){if(j===1&&skipE)continue;
      if(dn(k,Lv[j])){pPush(-(j+1));lastAdv=j;if(j===0)pEnd=true;break;}}};
  const pFav=k=>{if(pEnd)return;
    for(let j=Lv.length-1;j>top&&j>=2;j--)if(up(k,Lv[j])){pPush(j);top=j;lastAdv=j;break;}};
  let active=mode==='mkt', nx=0;
  if(active)out.tAct=C[0].t;
  const end=(k,st)=>{if(st)out.st=st;out.fin=true;out.tEnd=k.t;};
  for(let i=0;i<C.length;i++){
    const k=C[i];
    let justActivated=false;
    if(!active){
      const hitA=mode==='limit'?dn(k,A):up(k,A);
      const hitS=dn(k,SL), hitT=T.length&&up(k,T[0]);
      if(!hitA){
        if(mode==='limit'&&hitT){out.why='ran';end(k,'none');return out;}
        if(mode==='break'&&hitS){out.why='inval';end(k,'none');return out;}
        if(k.t-t0>R.entryDays*DAY){out.why='timeout';end(k,'none');return out;}
        continue;
      }
      if(mode==='limit'){
        if(hitT){out.amb={t:k.t,i};return out;}      // اول تارگت بود (فرار) یا اول ورود؟
        active=true;out.tAct=k.t;justActivated=true;
        pAdv(k,true);
        // پایین آمدن از ورود تا استاپ ترتیبِ اجباری دارد
        if(hitS){out.tStop=k.t;end(k,'loss');return out;}
        continue;
      }
      // break: رسیدن به تارگت از مسیرِ ورود می‌گذرد، ولی استاپ آن طرف است
      if(hitS){out.amb={t:k.t,i};return out;}
      active=true;out.tAct=k.t;justActivated=true;
    }
    const hitS=dn(k,SL), hitT=nx<T.length&&up(k,T[nx]);
    if(hitS&&hitT&&nx===0&&!(justActivated&&mode==='break')){out.amb={t:k.t,i};return out;}
    // در کندلِ شکست، رسیدن به تارگت پیش از برگشت است (همان فرضِ پایین)
    if(justActivated&&mode==='break'){pFav(k);pAdv(k,true);}else{pAdv(k,justActivated);pFav(k);}
    // بعد از تارگت اول، اگر یک کندل هم تارگت بعدی و هم استاپ را لمس کرد، محتاطانه
    // استاپ را اول می‌گیریم؛ بُرد بودنش دیگر عوض نمی‌شود
    // برگشت به ورود فقط از کندلِ بعد از تارگت اول: داخل همان کندل معلوم نیست کفِ کندل
    // قبل از تارگت بوده یا بعدش — و در کندلِ شکست، قطعاً قبلش بوده
    if(nx>0&&out.tBE==null&&dn(k,E)){out.tBE=k.t;out.nLad=nx;}
    if(hitT&&!(hitS&&nx>0)){
      while(nx<T.length&&up(k,T[nx])){out.tTp[nx]=k.t;nx++;}
      out.st='win';
    }
    if(hitS){out.tStop=k.t;end(k,out.st==='win'?'win':'loss');return out;}
    if(T.length&&nx>=T.length){end(k,'win');return out;}
    if(k.t-(out.tAct||t0)>R.days*DAY){
      out.close={t:k.t,px:k.c};end(k,out.st==='win'?'win':'exp');return out;
    }
  }
  const last=C[C.length-1];
  out.close={t:last.t,px:last.c};out.tEnd=last.t;
  return out;                                         // هنوز باز یا منتظر ورود
}

/* R هر سیگنال با قانونِ امتیازدهیِ انتخاب‌شده:
   tp1    همه در تارگت اول
   ladder سه پله‌ی مساوی روی تارگت‌های کانال؛ بعد از تارگت اول، استاپ به نقطه‌ی ورود */
function audR(r,inp,rule){
  if(!r||!inp||!inp.entry||!inp.stop)return null;
  const sign=inp.dir==='long'?1:-1, risk=Math.abs(inp.entry-inp.stop), E=inp.entry, T=inp.tps;
  const rOf=px=>((px-E)*sign)/risk;
  if(r.st==='loss')return -1;
  if(r.st==='exp')return r.close?rOf(r.close.px):null;
  if(r.st==='open')return r.tAct&&r.close?rOf(r.close.px):null;
  if(r.st!=='win'||!T.length)return null;
  if(rule!=='ladder')return rOf(T[0]);
  const n=Math.min(3,T.length);
  const reached=r.tTp.filter(x=>x!=null).length;
  const hit=Math.max(1,Math.min(n,r.tBE!=null?(r.nLad||1):reached));
  let sum=0;
  for(let i=0;i<hit;i++)sum+=rOf(T[i]);
  const rest=n-hit;
  if(rest>0&&r.tBE==null&&r.close)sum+=rest*Math.max(0,rOf(r.close.px));
  return sum/n;
}


