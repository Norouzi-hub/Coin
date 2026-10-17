/* ==================== اجرای خودکار استاپ و نقشه ==================== */
/* برنامه به صرافی سفارش نمی‌فرستد؛ ثبتِ پوزیشن را همان‌طور که نقشه گفته جلو می‌برد:
   - استاپ بخورد (یا قیمت از لیکوئید رد شود): کل باقی‌مانده روی همان قیمت بسته می‌شود.
   - تارگتِ پله‌ی بعدی برسد: سهمِ آن پله بسته و استاپ طبق نقشه جابه‌جا می‌شود (چند پله با هم هم می‌شود).
   وقتی برنامه بسته بوده، قیمت زنده فقط «الان» را می‌گوید؛ فاصله با کندل پر می‌شود. اگر در یک
   کندل هم استاپ ممکن بوده هم تارگت، استاپ اول حساب می‌شود (بدبینانه، مثل آزمون کانال). */
const AUTOKEY='signaldesk.autoseen.v1';
const AUTOSEEN=lsGet(AUTOKEY)||{};           // آخرین لحظه‌ای که قیمتِ هر پوزیشن روی این دستگاه سنجیده شد
function autoSeenSave(){
  const live=new Set(DB.positions.filter(p=>p.status==='open').map(p=>p.id));
  for(const k of Object.keys(AUTOSEEN))if(!live.has(k))delete AUTOSEEN[k];
  lsSet(AUTOKEY,AUTOSEEN);
}
const autoOn=p=>F('autoexec')&&p.status==='open'&&!p.autoOff&&p.entry>0&&p.margin>0;
/* از کِی باید دوباره نگاه کرد: آخرین سنجش، ولی نه قبل از باز شدن یا آخرین دست‌کاریِ خودت
   (اگر استاپ را جابه‌جا کرده‌ای، قیمت‌های قبلش با استاپِ تازه سنجیده نمی‌شوند) */
function autoSince(p){
  const lg=(p.log||[]).reduce((a,l)=>Math.max(a,l.at||0),0);
  return Math.max(AUTOSEEN[p.id]||0,p.openedAt||0,lg);
}
/* سقف زمانِ نقشه (رادار): وقتی رسید، با قیمت همان لحظه بسته می‌شود */
const autoDue=(p,t)=>!!(p.untilAuto&&p.until&&t>=p.until);
const autoGap=()=>Math.max(4*60e3,(S.auto||0)*2500);
/* hi/lo: بالاترین و پایین‌ترین قیمتِ یک بازه؛ برای قیمت زنده هر دو یکی است */
function autoHit(p,hi,lo){
  const sign=p.dir==='long'?1:-1, bad=sign>0?lo:hi, good=sign>0?hi:lo;
  const liq=posMetrics(p).liqPrice;
  const st=p.stop>0&&(bad-p.stop)*sign<=0, lq=liq!=null&&(bad-liq)*sign<=0;
  // هر دو رد شده‌اند: آنکه به ورود نزدیک‌تر است اول خورده
  if(st||lq)return st&&(!lq||(p.stop-liq)*sign>=0)?{k:'stop',px:p.stop}:{k:'liq',px:liq};
  const i=p.pbc||0;
  if(p.pb&&i<p.pb.tps.length&&(good-p.pb.tps[i])*sign>=0)return {k:'tp',i};
  return null;
}
/* استاپ در صرافی «مارکت» اجرا می‌شود و معمولاً کمی بدتر از عددش پر می‌شود؛ بدون این،
   کارنامه‌ی بسته‌شده‌های خودکار خوش‌بینانه است */
const slipPx=(p,px)=>px*(1-(p.dir==='long'?1:-1)*(Math.max(0,+S.slip||0)/100));
function autoClose(p,px,at,kind){
  ensureBase(p);
  px=slipPx(p,px);
  p.status='closed';p.exitPrice=px;p.closedAt=at;
  p.fees=p.margin*p.lev*(S.fee/100);p.autoBy=kind;
  PENDING.delete(p.id);
  const m=posMetrics(p);
  logAdd(p,'close',(kind==='liq'?'خودکار: قیمت از لیکوئید رد شد؛ بسته شد روی ':kind==='time'?'خودکار: سقف زمان رسید؛ بسته شد روی ':'خودکار: استاپ خورد؛ بسته شد روی ')+
    fmtPrice(px)+' — '+fmtUsd(m.pnl)+(m.r!=null?' ('+fmtR(m.r)+')':''),at);
  return m.pnl;
}
/* یک بازه‌ی قیمت را روی پوزیشن اجرا می‌کند و رویدادها را به ev اضافه می‌کند */
/* قیمت اجرای پله: خود تارگت (مثل سفارش Limit که در صرافی گذاشته‌ای)، مگر قیمت هیچ‌وقت از تارگت رد نشده باشد و از اول جلوتر بوده
   (پوزیشن دیر ثبت شده: S با ورود 0.0249 وقتی قیمت 0.071 بود) — آن وقت بدترین قیمتِ همین بازه.
   prev: قیمت زنده‌ی قبلی (اگر قبلاً پیش از تارگت بوده، یعنی تارگت جلوی چشم رد شده ← خود تارگت).
   بی قیمت قبلی: فقط اگر بیش از یک‌چهارم R جلوتر است دیر ثبت شده حساب می‌شود (تکان کوچک از روی تارگت همان تارگت است) */
function autoFillPx(p,i,hi,lo,prev){
  const sg=p.dir==='long'?1:-1,tp=p.pb.tps[i],far=sg>0?lo:hi,risk=Math.abs(p.entry-((p.stop0!=null?p.stop0:p.stop)||p.entry))||Math.abs(tp-p.entry);
  if(prev!=null&&(prev-tp)*sg<0)return tp;
  return (far-tp)*sg>0.25*risk?far:tp;
}
const AUTOLP=new Map();        // آخرین قیمت زنده‌ی هر پوزیشن (فقط همین بار)
function autoFeed(p,hi,lo,at,ev,prev){
  for(let g=0;g<12&&p.status==='open';g++){
    const h=autoHit(p,hi,lo);
    if(!h)return;
    if(h.k!=='tp'){ev.push({p,k:h.k,pnl:autoClose(p,h.px,at,h.k)});return;}
    const pnl=pbApply(p,h.i,at,'خودکار: ',autoFillPx(p,h.i,hi,lo,prev));
    if(p.status==='closed')p.autoBy='tp';
    ev.push({p,k:'tp',i:h.i,pnl,stop:p.stop});
    // استاپِ تازه در همین کندل سنجیده نمی‌شود: معلوم نیست قیمت بعد از تارگت برگشته یا نه
    const f=p.dir==='long'?hi:lo;hi=lo=f;
  }
  // ریسک‌فری و دنباله‌دار با سمتِ خوبِ همین بازه؛ استاپِ تازه از بازه‌ی بعد سنجیده می‌شود
  if(p.status==='open')riskManage(p,hi,lo,at,ev);
}
function restoreSnap(snap){
  NOJUDGE=true;             // برگرداندن، خودش تخلف نیست (مثلاً استاپ به جای قبلش برمی‌گردد)
  const d=JSON.parse(snap);
  DB.positions=d.positions;fillDB(d);
  OVERRIDE=DB.overrides;PCACHE.clear();
}
function autoReport(ev,snap){
  save();renderAll();
  const one=e=>e.p.ticker+' '+(e.k==='be'?'ریسک‌فری شد (استاپ '+fmtPrice(e.stop)+')':e.k==='trail'?'استاپ دنباله‌دار فعال شد ('+fmtPrice(e.stop)+')':e.k==='tp'?'پله‌ی '+faN(e.i+1)+' نقشه اجرا شد':e.k==='liq'?'لیکوئید حساب شد':e.k==='time'?'سقف زمان رسید و بسته شد':'استاپ خورد و بسته شد')+
    (e.pnl?' · '+fmtUsd(e.pnl):'')+(e.k==='tp'&&e.p.status==='open'&&e.stop?' · استاپ '+(e.stop===e.p.entry?'روی ورود':fmtPrice(e.stop)):'');
  const msg=ev.length===1?one(ev[0]):'اجرای خودکار: '+ev.map(one).join('؛ ');
  const ids=[...new Set(ev.map(e=>e.p.id))];
  logIt('info','اجرای خودکار — '+msg);
  toastUndo(esc(msg),()=>{
    restoreSnap(snap);
    // وگرنه با قیمت بعدی دوباره اجرا می‌شود
    for(const id of ids){const q=DB.positions.find(x=>x.id===id);
      if(q){q.autoOff=true;logAdd(q,'plan','اجرای خودکار برگردانده شد؛ برای این پوزیشن خاموش ماند');}}
    save();renderAll();toast('برگشت؛ اجرای خودکار این پوزیشن خاموش شد','info');
  });
  const bad=ev.some(e=>e.k==='stop'||e.k==='liq');
  // پیغامِ «برگرداندن» همین بالاست؛ مشاور فقط در مرکز اعلان ثبت می‌کند، صدا می‌زند و اعلان گوشی می‌دهد
  advise('auto:'+ids.join(',')+':'+Date.now(),{cat:'pos',pri:bad?'hi':'mid',title:msg,silent:true,act:{t:'pos',id:ids[0]}});
  advBeep(bad?'hi':'mid');
  try{if(advCfg().vib&&!advQuiet()&&navigator.vibrate)navigator.vibrate(bad?[200,80,200]:[120,60,120]);}catch(e){}
  if(F('notify'))sysNotify('میز سیگنال',msg,'auto'+ids.join(','),{act:{t:'pos',id:ids[0]}});
}
/* با هر قیمت تازه: پوزیشن‌هایی که تازه سنجیده شده‌اند با قیمت زنده، بقیه (فاصله‌ی طولانی) با کندل.
   خروجی: آیا کاری انجام شد (تا هشدارهای همین لحظه روی پیغامِ «برگرداندن» ننشینند) */
function checkAutoExec(){
  if(!F('autoexec'))return false;
  const now=Date.now(), gap=autoGap(), ev=[], late=[];
  let snap=null;
  for(const p of DB.positions){
    if(!autoOn(p))continue;
    const px=pxOf(p);
    if(px==null)continue;
    if(now-autoSince(p)>gap){late.push(p);continue;}
    if(!snap&&(autoHit(p,px,px)||autoDue(p,now)))snap=JSON.stringify(dbBlob());
    autoFeed(p,px,px,now,ev,AUTOLP.get(p.id));AUTOLP.set(p.id,px);
    if(p.status==='open'&&autoDue(p,now))ev.push({p,k:'time',pnl:autoClose(p,px,now,'time')});
    AUTOSEEN[p.id]=now;
  }
  autoSeenSave();
  if(ev.length)autoReport(ev,snap);
  if(late.length)autoCatchUp(late);
  return ev.length>0;
}
const AUTOBUSY=new Set();
async function autoCatchUp(list){
  for(const p0 of list){
    if(AUTOBUSY.has(p0.id))continue;
    AUTOBUSY.add(p0.id);
    try{
      const since=autoSince(p0), now=Date.now();
      const iv=now-since<=3*864e5?'5m':'1h', ms=IVMS[iv];
      const t0=Math.ceil(since/ms)*ms;
      let cs=[], ok=true;
      if(now>t0){
        try{cs=(await audCandles(p0.ticker,iv,t0,Math.min(1000,Math.ceil((now-t0)/ms)+1))).filter(c=>c.t>=t0);}
        catch(e){ok=false;logIt('warn','اجرای خودکار: کندل '+p0.ticker+' نیامد؛ فقط قیمت فعلی سنجیده شد');}
      }
      // در این فاصله ممکن است پوزیشن عوض شده باشد (ویرایش، بستن، همگام‌سازی)
      const p=DB.positions.find(x=>x.id===p0.id);
      if(!p||!autoOn(p)||autoSince(p)!==since)continue;
      const snap=JSON.stringify(dbBlob()), ev=[];
      let seen=since;
      for(const c of cs){
        if(p.status!=='open')break;
        // سقف زمان وسط فاصله گذشته: با قیمت باز شدن اولین کندلِ بعد از آن بسته می‌شود
        if(autoDue(p,c.t)){ev.push({p,k:'time',pnl:autoClose(p,c.o,p.until,'time')});seen=c.t;break;}
        const end=Math.min(Date.now(),c.t+ms);
        autoFeed(p,c.h,c.l,end,ev);
        seen=end;
      }
      // کندل‌ها تا الان رسیده‌اند (یا نیامدند): قیمت زنده هم سنجیده می‌شود
      const px=pxOf(p), done=!ok||!cs.length||seen>=Date.now()-ms;
      if(done&&p.status==='open'&&px!=null){autoFeed(p,px,px,Date.now(),ev);if(p.status==='open'&&autoDue(p,Date.now()))ev.push({p,k:'time',pnl:autoClose(p,px,Date.now(),'time')});}
      AUTOSEEN[p.id]=done?Date.now():seen;
      autoSeenSave();
      if(ev.length)autoReport(ev,snap);
    }catch(e){logIt('err','اجرای خودکار '+p0.ticker+': '+e.message);}
    finally{AUTOBUSY.delete(p0.id);}
  }
}

/* ---- گرفتن کندل ---- */
const AUD_SRC=[
  {n:'Binance',u:(s,iv,st,l)=>'https://api.binance.com/api/v3/klines?symbol='+s+'USDT&interval='+iv+'&startTime='+st+'&limit='+l,
   iv:{'1m':'1m','3m':'3m','5m':'5m','30m':'30m','1h':'1h'},max:1000},
  {n:'Binance فیوچرز',u:(s,iv,st,l)=>'https://fapi.binance.com/fapi/v1/klines?symbol='+s+'USDT&interval='+iv+'&startTime='+st+'&limit='+l,
   iv:{'1m':'1m','3m':'3m','5m':'5m','30m':'30m','1h':'1h'},max:1500},
  {n:'MEXC',u:(s,iv,st,l)=>'https://api.mexc.com/api/v3/klines?symbol='+s+'USDT&interval='+iv+'&startTime='+st+'&limit='+l,
   iv:{'1m':'1m','5m':'5m','30m':'30m','1h':'60m'},max:1000},
  /* سه منبع دیگر، همان‌هایی که قیمت زنده هم از آن‌ها می‌آید. وقتی بایننس و MEXC از
     مسیرِ کاربر بسته‌اند (تحریم یا واسطِ خراب) قیمت می‌آمد ولی کندل نه، و همه‌ی سیگنال‌ها
     «کندل نیامد» می‌شدند. قالب پاسخ هر کدام فرق دارد، پس هر منبع مبدل خودش را دارد. */
  {n:'Gate',
   u:(s,iv,st,l)=>{const f=Math.floor(st/1000),sec={'1m':60,'5m':300,'30m':1800,'1h':3600}[iv];
     return 'https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair='+s+'_USDT&interval='+iv+'&from='+f+'&to='+(f+sec*(l-1));},
   iv:{'1m':'1m','5m':'5m','30m':'30m','1h':'1h'},max:1000,
   p:d=>d.map(k=>({t:+k[0]*1000,o:+k[5],h:+k[3],l:+k[4],c:+k[2],v:+k[6]||+k[1]||0}))},
  {n:'KuCoin',
   u:(s,iv,st,l)=>{const f=Math.floor(st/1000),sec={'1min':60,'3min':180,'5min':300,'30min':1800,'1hour':3600}[iv];
     return 'https://api.kucoin.com/api/v1/market/candles?type='+iv+'&symbol='+s+'-USDT&startAt='+f+'&endAt='+(f+sec*l);},
   iv:{'1m':'1min','3m':'3min','5m':'5min','30m':'30min','1h':'1hour'},max:1500,ok:d=>d&&Array.isArray(d.data),
   p:d=>d.data.map(k=>({t:+k[0]*1000,o:+k[1],h:+k[3],l:+k[4],c:+k[2],v:+k[5]||0}))},
  {n:'Bitget',
   u:(s,iv,st,l)=>{const ms={'1min':6e4,'3min':18e4,'5min':3e5,'30min':18e5,'1h':36e5}[iv];
     return 'https://api.bitget.com/api/v2/spot/market/candles?symbol='+s+'USDT&granularity='+iv+'&startTime='+st+'&endTime='+(st+ms*l)+'&limit='+l;},
   iv:{'1m':'1min','3m':'3min','5m':'5min','30m':'30min','1h':'1h'},max:1000,ok:d=>d&&Array.isArray(d.data),
   p:d=>d.data.map(k=>({t:+k[0],o:+k[1],h:+k[2],l:+k[3],c:+k[4],v:+k[5]||0}))}
];
// v: حجم (برای VWAP و حجم نسبی)
const audParse=(src,d)=>src.p?src.p(d):d.map(k=>({t:+k[0],o:+k[1],h:+k[2],l:+k[3],c:+k[4],v:+k[5]||0}));
/* ref: قیمتی که کندل اول باید نزدیکش باشد (مثلاً ورود معامله). صرافی‌ها گاهی زیر یک نماد ارز دیگری دارند
   (هم‌نام، قیمت چند برابر)؛ آن منبع کنار می‌رود و سراغ بعدی می‌رویم */
async function audCandles(sym,iv,start,limit,quiet,ref){
  /* اول منبعی که برای همین نماد جواب داده، بعد منبعی که آخرین بار برای هر نمادی جواب داده
     (اگر بایننس از مسیرِ تو بسته است، برای هر سیگنال از نو امتحانش نکنیم) */
  const order=AUD_SRC.map((_,i)=>i);
  for(const pref of [AUDSRC.$,AUDSRC[sym]])
    if(pref!=null&&AUD_SRC[pref]){order.splice(order.indexOf(pref),1);order.unshift(pref);}
  for(const i of order){
    const src=AUD_SRC[i];
    if(!src.iv[iv])continue;                         // این منبع این تایم‌فریم را ندارد
    try{
      /* fetchVia برای یک قیمت، مسیرها را مسابقه‌ای می‌فرستد. برای صدها کندل این یعنی
         چند برابر درخواست روی واسط‌ها؛ پس اگر مسیرِ سالمِ قیمت معلوم است، فقط همان. */
      const good=goodFor('px'), url=src.u(sym,src.iv[iv],start,Math.min(limit,src.max));
      const opt={json:true,timeout:12000,kind:'px',quiet:!!quiet,label:'کندل '+sym+' · '+src.n,validate:src.ok||(d=>Array.isArray(d))};
      let got=null;
      if(good)got=await fetchVia(url,Object.assign({onlyRoutes:[good]},opt)).catch(()=>null);
      if(!got)got=await fetchVia(url,opt);         // فقط اگر مسیر سالم برای این منبع جواب نداد
      // بعضی منبع‌ها جدید→قدیم می‌دهند؛ مرتب و فقط از لحظه‌ی خواسته‌شده به بعد
      const rows=audParse(src,got.data)
        .filter(k=>isFinite(k.t)&&isFinite(k.h)&&isFinite(k.l)&&k.h>0&&k.t>=start-1)
        .sort((a,b)=>a.t-b.t);
      if(!rows.length)continue;                      // این منبع این نماد را ندارد
      if(ref>0&&Math.abs(rows[0].c/ref-1)>0.3){AUDQ.err=src.n+': '+sym+' این صرافی ارز دیگری است (قیمت '+fmtPrice(rows[0].c)+')';continue;}
      AUDQ.err='';                                   // خطای منبع‌های قبلی دیگر مهم نیست
      if(AUDSRC[sym]!==i||AUDSRC.$!==i){AUDSRC[sym]=i;AUDSRC.$=i;lsSet(AUDSRCKEY,AUDSRC);}
      return rows;
    }catch(e){const m=e&&e.message||'';
      AUDQ.err=src.n+': '+(m==='no-route'?'از هیچ مسیری جواب نیامد':m.slice(0,80));}
  }
  throw new Error('nocandle');
}
const IVMS={'1m':60000,'3m':180000,'5m':300000,'30m':1800000,'1h':3600000};

async function audOne(job,R){
  const {p,k}=job;let inp=job.inp;
  // دوباره‌سنجیِ سیگنالی که قبلاً با قیمت بازار پر شده: از عدد خود کانال شروع کن، نه از قیمت پرشده‌ی قبلی
  if(inp.e1){inp=Object.assign({},inp,{entry:inp.e1,tps:inp.tps0||inp.tps});delete inp.e1;delete inp.tps0;}
  const pre=audPre(inp);
  if(pre){AUD[p.id]={k,st:'bad',why:pre,fin:true,at:Date.now()};return;}
  const start=Math.ceil(inp.t0/IVMS['5m'])*IVMS['5m'];   // فقط آینده‌ی بعد از انتشار
  let C=await audCandles(inp.tk,'5m',start,1000);
  const px0=C[0].o;
  // ورودِ بازار: قیمتِ اولین کندلِ بعد از انتشار
  if(inp.mktE){inp=audTps(Object.assign({},inp,{entry:px0}));
    if((px0-inp.stop)*(inp.dir==='long'?1:-1)<=0){AUD[p.id]={k,st:'bad',why:'bad-stop',px0,e0:px0,fin:true,at:Date.now()};return;}}
  if(Math.abs(inp.entry-px0)/px0>0.3){AUD[p.id]={k,st:'bad',why:'px',px0,fin:true,at:Date.now()};return;}
  if(inp.inh&&Math.abs(inp.entry-inp.stop)/inp.entry>0.3){AUD[p.id]={k,st:'bad',why:'far-sl',px0,fin:true,at:Date.now()};return;}
  /* «ورود به‌موقع با قیمت بازار»: قیمت لحظه‌ی انتشار تا «تحمل ورود» با عدد کانال فاصله دارد ← همان لحظه
     با قیمت بازار وارد شو (نه با عدد کانال). تارگت و استاپ همان عددهای کانال‌اند */
  let ef=false;
  if(R.fill==='mkt'&&!inp.mktE&&inp.entry&&!(inp.trig!=null&&(inp.trig-px0)*(inp.dir==='long'?1:-1)>0)&&
     Math.abs(px0-inp.entry)/inp.entry<=(R.tol||0)/100&&px0!==inp.entry&&(px0-inp.stop)*(inp.dir==='long'?1:-1)>0){
    inp=audTps(Object.assign({},inp,{e1:inp.entry,tps0:inp.tps,entry:px0}));ef=true;}
  let r=audWalk(inp,C,R);
  /* 1000 کندل 5 دقیقه‌ای حدود 83 ساعت است؛ اگر کار تمام نشد و کندل‌ها به امروز نرسیده، ادامه با کندل ساعتی.
     شرطِ «دقیقاً 1000 کندل آمد» برداشته شد: منبعی که کمتر می‌دهد (سقف 500، کندلِ جاافتاده) سیگنال را
     برای همیشه «در جریان» نگه می‌داشت، چون هر بار همان چند روز اول دوباره خوانده می‌شد */
  for(let n=0;n<3&&!r.fin&&!r.amb;n++){
    const last=C[C.length-1];
    if(Date.now()-last.t<=IVMS['1h'])break;
    const from=Math.floor((last.t+IVMS['5m'])/IVMS['1h'])*IVMS['1h'];
    const H=(await audCandles(inp.tk,'1h',from,1000).catch(()=>[])).filter(h=>h.t>last.t);
    if(!H.length)break;
    C=C.concat(H);r=audWalk(inp,C,R);
  }
  // ابهام: همان یک کندل را با کندل‌های ریزتر عوض کن و دوباره برو
  for(let n=0;r.amb&&n<4;n++){
    const i=r.amb.i, c0=C[i], nxt=C[i+1];
    const dur=(nxt?nxt.t:c0.t+IVMS['5m'])-c0.t;
    const iv=dur>IVMS['5m']?'5m':(dur>IVMS['1m']?'1m':null);
    if(!iv)break;
    const sub=await audCandles(inp.tk,iv,c0.t,Math.ceil(dur/IVMS[iv])).catch(()=>null);
    const inside=sub?sub.filter(x=>x.t>=c0.t&&x.t<c0.t+dur):[];
    if(!inside.length)break;
    C=C.slice(0,i).concat(inside,C.slice(i+1));
    r=audWalk(inp,C,R);
  }
  if(r.amb){r.st='amb';r.fin=true;}
  delete r.amb;
  if(r.tAct&&r.st!=='amb'){try{r.xg=audXGrid(inp,C,r.tAct);}catch(e){}}
  AUD[p.id]=Object.assign(r,{k,at:Date.now()},inp.mktE?{e0:inp.entry}:ef?{e0:inp.entry,ef:true}:{});
}

/* at: زمان آخرین سنجش؛ ماندگار، وگرنه بعد از هر بار باز کردن برنامه «هنوز سنجشی انجام نشده» می‌گفت */
const AUDATKEY='signaldesk.audat';
const AUDQ={on:false,n:0,done:0,fail:0,at:+(lsGet(AUDATKEY)||0)||0,err:''};
const audAtSave=()=>lsSet(AUDATKEY,AUDQ.at||0);
/* now: «در جریان»ها را هم بسنج حتی اگر کمتر از 20 دقیقه پیش سنجیده شده‌اند (دکمه‌ی دستی) */
function audJobs(force,needPath,now){
  const R=audRules(), fresh=!!now, out=[];now=Date.now();
  const paths=[];
  for(const p of POSTS){
    const inp=audInput(p);if(!inp)continue;
    const k=audKey(inp,R), a=AUD[p.id];
    if(a&&a.k===k&&!force){
      const noPath=needPath&&(!a.path||!a.xg||a.xg.v!==XG_V)&&['win','loss','exp'].includes(a.st);
      if(noPath){paths.push({p,inp,k,pathOnly:true});continue;}
      if(a.fin&&!(a.st==='bad'&&a.why==='nocandle'))continue;
      if(a.st==='bad'&&a.why==='nocandle'&&(a.tries||0)>=3)continue;
      if(!fresh&&now-(a.at||0)<20*60000)continue;        // تازه سنجیده شده
    }
    out.push({p,inp,k});
  }
  /* سیگنال‌های تازه اول؛ مسیرِ قیمتِ سیگنال‌های قدیمی (برای آزمایشگاه خروج) بعد، و هر بار
     حداکثر 40 تا — وگرنه صدها درخواستِ کندل جلوی سنجیدنِ سیگنال‌های امروز را می‌گرفت */
  out.sort((a,b)=>(b.inp.t0||0)-(a.inp.t0||0));
  paths.sort((a,b)=>(b.inp.t0||0)-(a.inp.t0||0));
  return out.concat(paths.slice(0,40));
}
async function audRun(force,needPath,fresh){
  if(AUDQ.on&&Date.now()-(AUDQ.t0||0)<10*60000)return;   // صفی که ده دقیقه گیر کرده، رها می‌شود
  const jobs=audJobs(force,needPath,fresh);
  if(!jobs.length){AUDQ.at=Date.now();audAtSave();paintAudProgress();return 0;}
  Object.assign(AUDQ,{on:true,n:jobs.length,done:0,fail:0,err:'',t0:Date.now()});
  jobSet('aud',{title:'سنجش کانال',pause:true,cancel:true,pct:()=>AUDQ.done/Math.max(1,AUDQ.n)*100,msg:()=>faN(AUDQ.done)+' از '+faN(AUDQ.n)+' سیگنال',go:()=>go('audit')});
  logIt('info','کانال‌سنج: '+jobs.length+' سیگنال در صف');
  paintAudProgress();
  const R=audRules(), failed=[];
  let idx=0, ok=0;
  // سه‌تا هم‌زمان: هم سریع است هم به محدودیت درخواستِ صرافی نمی‌خورد
  const worker=async()=>{
    while(idx<jobs.length){
      if(!(await jobGate('aud'))){idx=jobs.length;break;}
      if(idx>=jobs.length)break;            // وسط صبرِ «توقف»، بقیه‌ی کارگرها صف را تمام کرده‌اند
      const job=jobs[idx++];
      // هر سیگنال حداکثر 90 ثانیه؛ یک درخواستِ گیرکرده نباید کل صف را برای همیشه نگه دارد
      try{await Promise.race([audOne(job,R),new Promise((_,rj)=>setTimeout(()=>rj(new Error('timeout')),90000))]);ok++;}
      catch(e){failed.push(job);if(e&&e.message&&e.message!=='nocandle')AUDQ.err=e.message.slice(0,80);}
      AUDQ.done++;
      if(AUDQ.done%5===0){audSave();paintAudProgress();}
      if(!ok&&failed.length>=5)idx=jobs.length;          // شبکه قطع است؛ ادامه بی‌فایده
    }
  };
  await Promise.all([worker(),worker(),worker()]);
  // شکست فقط وقتی به حساب نماد گذاشته می‌شود که بقیه آمده باشند — یعنی شبکه سالم بوده
  if(ok){
    for(const j of failed){
      if(j.pathOnly)continue;              // نتیجه‌ی درستِ قبلی را به خاطرِ نگرفتنِ مسیر خراب نکن
      const a=AUD[j.p.id];
      AUD[j.p.id]={k:j.k,st:'bad',why:'nocandle',fin:false,
        tries:((a&&a.k===j.k&&a.tries)||0)+1,at:Date.now()};
    }
  }else if(failed.length)toast('کندل‌ها نیامد — اتصال یا واسط قیمت را بررسی کن'+(AUDQ.err?' ('+AUDQ.err+')':''),'err');
  Object.assign(AUDQ,{on:false,at:Date.now(),fail:failed.length});audAtSave();jobEnd('aud');
  logIt(failed.length&&!ok?'err':'info','کانال‌سنج: '+ok+' سنجیده، '+failed.length+' ناموفق'+(AUDQ.err?' · '+AUDQ.err:''));
  audSave();
  renderAll();
}
/* نشان تب کانال‌سنج (تعداد ادعاهای نادرست). حسابش برای راه‌اندازی عجله‌ای ندارد، پس
   بعد از نقاشی انجام می‌شود؛ در دفعه‌های بعد از حافظه می‌آید و آنی است. */
let audBadgeT=null;
function paintAudBadge(){
  if(audBadgeT)return;
  const run=()=>{audBadgeT=null;
    const nNo=claimsAll().filter(x=>x.vd.v==='no').length;
    const ca=$('#cAud');if(ca){ca.textContent=faN(nNo);ca.dataset.n=nNo;ca.classList.toggle('z',!nNo);
      ca.title=nNo?faN(nNo)+' ادعای نادرستِ کانال':'';}
    paintMoreBadge();};
  audBadgeT=(window.requestIdleCallback||setTimeout)(run,{timeout:1500});
}
function paintAudProgress(){
  const b=$('#audProg');if(!b)return;
  if(AUDQ.on){
    b.classList.remove('hide');
    b.innerHTML='<span>در حال سنجش '+faN(AUDQ.done)+' از '+faN(AUDQ.n)+'…</span>'+
      '<i style="--p:'+Math.round(AUDQ.done/Math.max(1,AUDQ.n)*100)+'%"></i>';
  }else if(AUDQ.fail){
    b.classList.remove('hide');
    b.innerHTML='<span style="color:var(--warn)">'+faN(AUDQ.fail)+' سیگنال کندل نگرفت'+
      (AUDQ.err?' — '+esc(AUDQ.err):'')+'. «سنجش» را دوباره بزن؛ اگر باز نشد، واسط قیمت یا فیلترشکن را عوض کن.</span>';
  }else b.classList.add('hide');
}

/* ---- ادعاهای کانال ---- */
/* پست نتیجه («تارگت دوم زد»، «استاپ خورد») به سیگنالِ اصلی‌اش ریپلای می‌زند و شناسه‌ی آن
   ذخیره است. اگر ریپلای نبود، آخرین سیگنالِ همان نماد تا 21 روز قبل — با برچسب «حدسی». */
const CLAIM_N={'اول':1,'دوم':2,'سوم':3,'چهارم':4,'پنجم':5};
function claimOf(p){
  const t=faNorm(normDig(p.text||''));
  if(/(?:استاپ|حد\s*ضرر)[^\n\d]{0,25}?(?:خورد|فعال\s*شد|زده\s*شد)|\bSL\s*hit\b/i.test(t))return {kind:'sl'};
  const m=t.match(/تارگت\s*(اول|دوم|سوم|چهارم|پنجم|\d)?/)||t.match(/\bTP\s*(\d)?/i);
  if(m&&RX_RESULT.test(t))return {kind:'tp',n:m[1]?(CLAIM_N[m[1]]||parseInt(m[1],10)||1):1};
  if(/سیو\s*سود|سود\s*(?:گرفته|زده|شناسایی)/.test(t))return {kind:'tp',n:1};
  if(/ریسک\s*فری|بریک\s*ایون|سر\s*به\s*سر/.test(t))return {kind:'be'};
  return null;
}
/* sigIdx: نماد → سیگنال‌ها به ترتیب زمان؛ یک بار برای همه‌ی پست‌های نتیجه ساخته می‌شود */
function claimTarget(p,sigIdx,byNum,inpOf){
  inpOf=inpOf||audInput;
  if(p.reply&&p.reply.id){
    const s=byNum?byNum.get(String(p.reply.id).split('/').pop()):findPost(p.reply.id);
    if(s&&s!==p&&inpOf(s))return {p:s,how:'reply'};
  }
  const tk=detectTicker(normDig(p.text||''));
  if(!tk||!p.date||!sigIdx)return null;
  const list=sigIdx.get(tk);if(!list)return null;
  let best=null;
  for(const s of list){
    if(+s.date>=+p.date)break;
    if(+p.date-+s.date<=21*DAY)best=s;
  }
  return best?{p:best,how:'guess'}:null;
}
function claimVerdict(c,cp,sp,inpOf){
  const inp=(inpOf||audInput)(sp), R=audRules(), a=AUD[sp.id];
  if(!inp||!a||a.k!==audKey(inp,R))return {v:'?',why:'سیگنال اصلی هنوز سنجیده نشده'};
  if(a.st==='bad')return {v:'?',why:AUD_WHY[a.why]||'سیگنال اصلی قابل سنجش نیست'};
  if(a.st==='amb')return {v:'?',why:'ترتیب رویدادها حتی با کندل یک‌دقیقه‌ای معلوم نشد'};
  const tc=(cp.date?+cp.date:Date.now())+IVMS['5m'];     // کندل از شروعش ثبت می‌شود
  if(c.kind==='tp'){
    const n=c.n||1;
    if(n>inp.tps.length)return {v:'?',why:'سیگنال اصلی تارگت '+faN(n)+' نداشت'};
    if(a.st==='none')return {v:'no',why:AUD_NONE[a.why]||'ورود فعال نشد'};
    const t=a.tTp[n-1];
    if(a.tStop&&a.tStop<=tc&&(t==null||a.tStop<t))
      return {v:'no',why:'قبل از تارگت '+faN(n)+'، استاپ خورده بود ('+jStampFa(new Date(a.tStop))+')'};
    if(t!=null&&t<=tc)return {v:'ok',why:'تارگت '+faN(n)+' واقعاً خورد ('+jStampFa(new Date(t))+')'};
    if(t!=null)return {v:'no',why:'در زمان این پست هنوز نرسیده بود؛ بعداً رسید ('+jStampFa(new Date(t))+')'};
    return {v:'no',why:'تا الان به تارگت '+faN(n)+' نرسیده'};
  }
  if(c.kind==='sl'){
    if(a.tStop&&a.tStop<=tc)return {v:'ok',why:'استاپ واقعاً خورد — باختش را گزارش کرده'};
    return {v:'?',why:'در داده‌ها استاپ دیده نشد'};
  }
  if(c.kind==='be')return a.tTp[0]!=null&&a.tTp[0]<=tc
    ?{v:'ok',why:'تارگت اول خورده بود؛ ریسک‌فری کردن منطقی است'}
    :{v:'?',why:'تارگت اول هنوز نخورده بود'};
  return {v:'?',why:'ادعای مشخصی در متن پیدا نشد'};
}
/* همه‌ی پست‌های نتیجه با سیگنال و حکمشان. حافظه‌دار: فقط وقتی پست، نتیجه‌ی سنجش
   یا اصلاح دستی عوض شود از نو ساخته می‌شود. */
let CLAIMS=null, CLAIMV='';
function claimsAll(){
  const v=POSTS.length+'|'+(POSTS[0]&&POSTS[0].id)+'|'+AUDQ.at+'|'+SETVER+'|'+
    Object.keys(OVERRIDE).length+'|'+Object.keys(DB.results).length+'|'+Object.keys(DB.edits).length;
  if(CLAIMS&&v===CLAIMV)return CLAIMS;
  /* دو نمایه به‌جای جستجوی خطی: با 200 پست نتیجه و 800 پست، جستجوی خطیِ ریپلای و
     خواندنِ دوباره‌ی ورودی هر سیگنال روی گوشی 100 میلی‌ثانیه می‌شد. */
  const memo=new Map(), inpOf=x=>{if(!memo.has(x.id))memo.set(x.id,audInput(x));return memo.get(x.id);};
  const byNum=new Map();
  for(const x of POSTS)byNum.set(String(x.id).split('/').pop(),x);
  const sigIdx=new Map();
  for(const s of POSTS){
    if(!s.date)continue;
    const inp=inpOf(s);if(!inp||!inp.tk)continue;
    if(!sigIdx.has(inp.tk))sigIdx.set(inp.tk,[]);
    sigIdx.get(inp.tk).push(s);
  }
  for(const l of sigIdx.values())l.sort((a,b)=>a.date-b.date);
  const out=[];
  for(const p of POSTS){
    if(!isRes(p))continue;
    const c=claimOf(p)||{kind:'?'};
    const tg=claimTarget(p,sigIdx,byNum,inpOf);
    out.push({p,c,tg,vd:tg?claimVerdict(c,p,tg.p,inpOf):{v:'?',why:'سیگنال اصلی پیدا نشد'}});
  }
  CLAIMS=out;CLAIMV=v;
  return out;
}
const claimOfPost=id=>{for(const c of claimsAll())if(c.p.id===id)return c;return null;};


/* ---- تب کانال‌سنج ---- */
const AFKEY='signaldesk.af.v1';
let AF=Object.assign({dir:'all',mkt:'all',rr:0,span:0,sym:'',noLate:true,iso:false},(()=>{try{return lsGet(AFKEY)||{};}catch(e){return {};}})());
const afSave=()=>lsSet(AFKEY,AF);
let audList='all', audShown=40;
const AUD_ST={win:['برد','win'],loss:['باخت','lose'],exp:['منقضی','mut'],none:['فعال نشد','mut'],
  open:['در جریان','open'],wait:['منتظر ورود','mut'],amb:['نامعلوم','mut'],bad:['نیاز به بررسی','gold'],
  todo:['سنجیده نشده','mut']};
const audStKey=r=>!r?'todo':(r.st==='open'&&!r.tAct?'wait':r.st);
const MODE_FA={mkt:'فوری (قیمت روی ورود بود)',limit:'منتظر برگشت به ورود',break:'منتظر شکستن ورود'};

/* هر سیگنالِ کش با ورودی و نتیجه‌اش */
function audRows(){
  const R=audRules(), rows=[];
  for(const p of POSTS){
    const inp=audInput(p);if(!inp)continue;
    const a=AUD[p.id], r=a&&a.k===audKey(inp,R)?a:null;
    rows.push({p,inp,r,R:r?audR(r,inp,R.rule):null});
  }
  return rows;
}
const rrOf=inp=>inp.entry&&inp.stop&&inp.tps.length?Math.abs(inp.tps[0]-inp.entry)/Math.abs(inp.entry-inp.stop):null;
/* فاصله‌ی استاپ تا ورود (٪) و بیشترین اهرمی که در مارجین ایزوله لیکوئید را آن سوی استاپ نگه می‌دارد
   (با ۱۰٪ حاشیه). کانال با کراس کار می‌کند؛ با حساب کوچک و ایزوله، این سقف اهرم است. */
const stopPctOf=i=>i&&i.entry>0&&i.stop>0?Math.abs(i.entry-i.stop)/i.entry*100:null;
const isoLev=sd=>sd>0?Math.max(1,Math.floor(1/(sd/100*1.1+MMR))):null;
function audFilter(rows){
  const now=Date.now();
  return rows.filter(x=>{
    const i=x.inp;
    if(AF.dir!=='all'&&i.dir!==AF.dir)return false;
    if(AF.mkt!=='all'&&i.mkt!==AF.mkt)return false;
    if(AF.sym&&i.tk!==AF.sym)return false;
    if(AF.span&&i.t0&&now-i.t0>AF.span*DAY)return false;
    if(AF.rr){const q=rrOf(i);if(q==null||q<AF.rr)return false;}
    // یک عدد برای همه‌جا: «بیشترین فاصله‌ی استاپ برای ایزوله» (تنظیمات)
    if(AF.iso){const sd=stopPctOf(i);if(sd==null||sd>isoMaxSd())return false;}
    if(AF.noLate&&x.r&&x.r.late)return false;
    return true;
  });
}
function audStats(rows){
  const s={n:rows.length,win:0,loss:0,exp:0,none:0,open:0,wait:0,amb:0,bad:0,todo:0,late:0,chase:0,
    sumR:0,posR:0,negR:0,cnt:0,maxStreak:0,curve:[],dd:0};
  for(const x of rows){
    s[audStKey(x.r)]++;
    if(x.r&&x.r.late)s.late++;
    if(x.r&&x.r.chase)s.chase++;
  }
  const done=rows.filter(x=>x.r&&['win','loss','exp'].includes(x.r.st)&&x.R!=null)
    .sort((a,b)=>a.inp.t0-b.inp.t0);
  let c=0,peak=0,streak=0;
  for(const x of done){
    s.sumR+=x.R;s.cnt++;
    if(x.R>0)s.posR+=x.R;else s.negR+=-x.R;
    c+=x.R;s.curve.push(c);if(c>peak)peak=c;s.dd=Math.max(s.dd,peak-c);
    if(x.r.st==='loss'){streak++;s.maxStreak=Math.max(s.maxStreak,streak);}else streak=0;
  }
  s.winRate=(s.win+s.loss)?s.win/(s.win+s.loss)*100:null;
  s.avgR=s.cnt?s.sumR/s.cnt:null;
  s.pf=s.negR>0?s.posR/s.negR:(s.posR>0?Infinity:null);
  const tried=s.win+s.loss+s.exp+s.none;
  s.noneRate=tried?s.none/tried*100:null;
  return s;
}
/* منحنی R تجمعی — همان زبانِ منحنی سرمایه‌ی کارنامه */
function rCurve(pts,dd,title){
  if(pts.length<2)return el('div','hint','برای منحنی، دست‌کم دو سیگنالِ تعیین‌تکلیف‌شده لازم است.');
  const W=600,H=140,pad=8;
  const min=Math.min(0,...pts),max=Math.max(0,...pts),rng=(max-min)||1;
  const X=i=>pad+(i/(pts.length-1))*(W-2*pad), Y=v=>H-pad-((v-min)/rng)*(H-2*pad);
  let d='',len=0,px=null;
  pts.forEach((v,i)=>{const x=X(i),y=Y(v);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)+' ';
    if(px)len+=Math.hypot(x-px[0],y-px[1]);px=[x,y];});
  const zero=Y(0), last=pts[pts.length-1], col=last>=0?'var(--up)':'var(--dn)';
  const area=d+'L'+X(pts.length-1).toFixed(1)+' '+zero.toFixed(1)+' L'+X(0).toFixed(1)+' '+zero.toFixed(1)+' Z';
  const w=el('div');
  w.innerHTML='<div style="font-size:12px;color:var(--tx2);font-weight:700;margin:12px 0 4px">'+
    (title||'اگر همه‌ی این سیگنال‌ها را با ریسک ثابت گرفته بودی · بیشترین افت از سقف: '+
    '<span style="color:var(--dn);direction:ltr;display:inline-block">'+fmtR(-dd)+'</span>')+'</div>'+
    '<svg class="eq" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="--len:'+Math.ceil(len)+'">'+
    '<path d="'+area+'" fill="'+col+'" opacity=".10"/>'+
    '<line x1="0" y1="'+zero.toFixed(1)+'" x2="'+W+'" y2="'+zero.toFixed(1)+'" stroke="var(--line2)" stroke-width="1" stroke-dasharray="3 3"/>'+
    '<path class="ln" d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linejoin="round"/></svg>';
  return w;
}
const stHtml=(l,v,c,sub)=>'<div class="st"><b>'+l+'</b><span class="'+(c||'')+'">'+v+'</span>'+(sub?'<small>'+sub+'</small>':'')+'</div>';

/* ---- آکاردئونِ کانال‌سنج: فقط یک بخش باز؛ بقیه فقط سربرگشان دیده می‌شود ---- */
const AUDOPENKEY='signaldesk.audopen.v1';
let AUDOPEN=lsGet(AUDOPENKEY);if(AUDOPEN==null)AUDOPEN='کارنامه‌ی کانال';
// بخش‌هایی که یکی شدند یا رفتند
if(AUDOPEN==='آزمایشگاه خروج'||AUDOPEN==='خروج کوتاه')AUDOPEN='خروج';
else if(AUDOPEN==='نمادها')AUDOPEN='';
// نوسان‌سنج، صحت‌سنجی و «شما در برابر کانال» دیگر پنل جدا نیستند
else if(['نوسان‌سنج','صحت‌سنجی','شما در برابر کانال'].includes(AUDOPEN))AUDOPEN='کارنامه‌ی کانال';
function audAcc(n,name){
  n.dataset.acc=name;
  if(n.tagName==='DETAILS'){
    n.open=AUDOPEN===name;
    n.addEventListener('toggle',()=>{
      if(n.open&&AUDOPEN!==name){AUDOPEN=name;lsSet(AUDOPENKEY,AUDOPEN);audShutOthers(name);}
      else if(!n.open&&AUDOPEN===name){AUDOPEN='';lsSet(AUDOPENKEY,AUDOPEN);}
    });
    return;
  }
  const head=n.querySelector(':scope>.panelhead');
  if(!n.classList.contains('panel')||!head)return;
  n.classList.add('acc');
  const shut=AUDOPEN!==name;n.classList.toggle('shut',shut);
  head.appendChild(el('i','chev'));
  head.setAttribute('role','button');head.tabIndex=0;head.setAttribute('aria-expanded',shut?'false':'true');
  head.addEventListener('click',e=>{if(e.target.closest('button,a,input,select,label,.infob'))return;audAccToggle(n,name);});
  head.addEventListener('keydown',e=>{if(e.target===head&&(e.key==='Enter'||e.key===' ')){e.preventDefault();audAccToggle(n,name);}});
  // بسته که هست، کلِ کادر (نه فقط نوار ۲۶ پیکسلیِ عنوان) جای زدن است
  n.addEventListener('click',e=>{if(n.classList.contains('shut')&&!head.contains(e.target))audAccToggle(n,name);});
}
const AUD_LAZY={'خروج':ic('flag')+'خروج: کدام قاعده بهتر جواب داده','سرمایه و الگوها':ic('trend')+'سرمایه و الگوها',
  'فهرست سیگنال‌ها':'همه‌ی سیگنال‌ها'};
const AUD_LITE_HIDE=new Set(['فیلتر','سرمایه و الگوها']);
function audAccToggle(n,name){
  const y0=n.getBoundingClientRect().top, open=n.classList.contains('shut');
  if(open&&n.dataset.lazy){                               // پنلِ تنبل: حالا بساز، سربرگ سر جایش بماند
    AUDOPEN=name;lsSet(AUDOPENKEY,AUDOPEN);renderAudit();
    const m=document.querySelector('#audBody [data-acc="'+name+'"]');
    if(m){const dy=m.getBoundingClientRect().top-y0;if(Math.abs(dy)>0.5)window.scrollBy(0,dy);}
    return;
  }
  AUDOPEN=open?name:'';lsSet(AUDOPENKEY,AUDOPEN);
  if(open)audShutOthers(name);
  n.classList.toggle('shut',!open);
  const h=n.querySelector(':scope>.panelhead');if(h)h.setAttribute('aria-expanded',open?'true':'false');
  // سربرگِ زده‌شده زیر انگشت بماند؛ بسته شدنِ بخشِ بالاتر صفحه را نپراند
  const dy=n.getBoundingClientRect().top-y0;if(Math.abs(dy)>0.5)window.scrollBy(0,dy);
}
function audShutOthers(name){
  for(const x of document.querySelectorAll('#audBody [data-acc]')){
    if(x.dataset.acc===name)continue;
    if(x.tagName==='DETAILS')x.open=false;
    else{x.classList.add('shut');const h=x.querySelector(':scope>.panelhead');if(h)h.setAttribute('aria-expanded','false');}
  }
}
function renderAudit(){
  const box=$('#audBody');if(!box)return;
  box.innerHTML='';
  const R=audRules();
  const all=audRows(), rows=audFilter(all), st=audStats(rows);

  // ── سربرگ ──
  const hd=el('div','panel audhead');
  /* توضیح‌ها پشت «؟»: سربرگ کوتاه می‌ماند و هر وقت خواستی باز می‌شود */
  hd.innerHTML='<div class="panelhead"><b>کانال‌سنج · <bdi dir="ltr">@'+esc(S.channel)+'</bdi></b>'+
    '<button class="infob" id="audInfoB" aria-expanded="false" aria-controls="audInfo" title="این بخش چطور کار می‌کند؟">؟</button></div>'+
    '<div class="infop hide" id="audInfo"><div class="hint" style="margin-top:0">هر سیگنال از لحظه‌ی دقیق انتشار با کندل واقعی جلو می‌رود. '+
    'پُر شدن همیشه با عددِ اعلامیِ کانال حساب می‌شود — یعنی به نفع کانال، نه علیهش.</div></div>'+
    '<div class="audprog hide" id="audProg"></div>';
  {const b=hd.querySelector('#audInfoB'), pn=hd.querySelector('#audInfo');
   b.onclick=()=>{const o=pn.classList.toggle('hide');b.setAttribute('aria-expanded',o?'false':'true');b.classList.toggle('on',!o);};}
  const bar=el('div','srow');bar.style.marginTop='10px';
  // سنجش فقط وقتی خودت بزنی: «سنجش تازه‌ها» فقط سیگنال‌های سنجیده‌نشده، «از نو» همه را
  const nJob=AUDQ.on?0:audJobs().length;
  if(nJob||!AUDQ.at){const nb=el('div','flag i audpend','<i>i</i><span>'+(nJob?faN(nJob)+' سیگنال منتظر سنجش است (تازه یا هنوز در جریان).':'هنوز سنجشی انجام نشده.')+' سنجش با کندل‌های واقعی چند ثانیه تا چند دقیقه طول می‌کشد و فقط وقتی خودت بزنی انجام می‌شود.</span>');hd.appendChild(nb);}
  const go1=el('button','btn sm ok',ic('play')+'<span>'+(nJob?'سنجش '+faN(nJob)+' سیگنال':'سنجش تازه‌ها')+'</span>');go1.id='audRunB';
  go1.onclick=()=>{if(AUDQ.on)return;audRun(false);renderAudit();};
  const run=el('button','btn sm',ic('refresh')+'<span>سنجش دوباره‌ی همه</span>');
  run.onclick=()=>{if(AUDQ.on)return;audRun(true);renderAudit();};
  if(AUDQ.on){btnBusy(go1,true,'در حال سنجش…');run.disabled=true;}
  bar.appendChild(go1);
  const rules=el('button','btn sm',ic('sliders')+'<span>قانون‌ها</span>');
  rules.onclick=sheetAudRules;
  bar.appendChild(run);bar.appendChild(rules);
  hd.appendChild(bar);
  hd.querySelector('#audInfo').appendChild(el('div','audrules',
    'مهلت ورود '+faN(R.entryDays)+' روز · مهلت نتیجه '+faN(R.days)+' روز · تحمل ورود '+faN(R.tol)+'٪'+(R.fill==='mkt'?' با قیمت بازار':'')+' · '+
    (R.rule==='ladder'?'پله‌ای (⅓ در هر تارگت، بعد از تارگت اول استاپ روی ورود)':'همه در تارگت اول')));
  box.appendChild(hd);

  /* هر بخش جدا ساخته می‌شود؛ خطا در یکی نباید کل تب را خالی بگذارد (قبلاً یک استثنا
     بقیه‌ی بخش‌ها را هم از بین می‌برد و تب فقط سربرگ داشت). خطا روی صفحه نوشته می‌شود. */
  const safe=(name,fn)=>{
    if(F('lite')&&AUD_LITE_HIDE.has(name))return;            // «فقط ضروری»
    // پنلِ بسته تا باز نشود ساخته نمی‌شود؛ فقط سربرگش (با باز شدن، تب از نو ساخته می‌شود)
    if(AUD_LAZY[name]&&AUDOPEN!==name){const n=el('div','panel lazy');n.dataset.lazy='1';
      n.appendChild(el('div','panelhead','<b>'+AUD_LAZY[name]+'</b>'));audAcc(n,name);box.appendChild(n);return;}
    try{const n=fn();if(n){audAcc(n,name);box.appendChild(n);}}
    catch(e){
      logIt('err','کانال‌سنج · '+name+': '+(e&&e.message||e));
      box.appendChild(el('div','panel audfail','<b>بخش «'+esc(name)+'» ساخته نشد</b><br>'+
        '<span dir="ltr">'+esc(String(e&&e.message||e).slice(0,160))+'</span><br>'+
        'بقیه‌ی بخش‌ها کار می‌کنند. اگر تکرار شد، از همین قسمت عکس بفرست.'));
    }
  };
  // ── وضعیت سنجش: چند تا سنجیده شد و چرا بقیه نه ──
  safe('وضعیت سنجش',()=>buildAudDiag(all));

  // ── فیلتر (بک‌تست) ──
  safe('فیلتر',()=>buildAudFilter(all));

  if(!all.length){
    box.appendChild(el('div','empty',STAR+'هنوز سیگنالی در حافظه نیست.<br>از تب سیگنال‌ها بروزرسانی کن.'));
    paintAudProgress();return;
  }

  // ── کارنامه‌ی کانال ──
  safe('کارنامه‌ی کانال',()=>{
  const sc=el('div','panel');
  // کاشی‌ها فقط سیگنال‌هایی که همان لحظه داده شده‌اند؛ یادآوری‌های قدیمی (همه برنده) جدا در یک خط
  const live=rows.filter(x=>!x.inp.old),st=audStats(live);
  sc.appendChild(el('div','panelhead','<b>کارنامه‌ی کانال</b>'+
    (rows.length!==all.length?audFilterPill(all,rows):'')));
  const g=el('div','stats');
  g.innerHTML=
    stHtml('سنجیده',faN(st.win+st.loss+st.exp),'',faN(st.win)+' برد · '+faN(st.loss)+' باخت · '+faN(st.exp)+' منقضی')+
    stHtml('نرخ برد',st.winRate==null?'—':faN(st.winRate.toFixed(0))+'٪',st.winRate==null?'m':(st.winRate>=50?'u':'d'))+
    stHtml('مجموع R',st.cnt?fmtR(st.sumR):'—',st.cnt?cls(st.sumR):'m','اگر همه را گرفته بودی')+
    stHtml('میانگین R',st.avgR==null?'—':fmtR(st.avgR),st.avgR==null?'m':cls(st.avgR),'امید ریاضی هر سیگنال')+
    stHtml('ضریب سود',pfTxt(st.pf),st.pf==null||st.pf===Infinity?'m':(st.pf>=1?'u':'d'),st.pf===Infinity?'هنوز باختی نبوده':'')+
    stHtml('باخت پیاپی',faN(st.maxStreak),st.maxStreak>=4?'d':'','بیشترین')+
    stHtml('فعال نشد',st.noneRate==null?'—':faN(st.noneRate.toFixed(0))+'٪','m',faN(st.none)+' سیگنال')+
    stHtml('در جریان',faN(st.open+st.wait),'m',faN(st.wait)+' منتظر ورود')+
    stHtml('نیاز به بررسی',faN(st.bad+st.amb),st.bad?'d':'m',st.todo?faN(st.todo)+' سنجیده نشده':'');
  g.insertAdjacentHTML('beforeend',audNoneHtml(live));
  g.querySelectorAll('[data-audentry]').forEach(b=>b.onclick=()=>audSetEntry(+b.dataset.audentry,'mkt'));
  {const O=rows.filter(x=>x.inp.old&&x.r&&['win','loss','exp'].includes(x.r.st));
   if(O.length){const s2=audStats(rows.filter(x=>x.inp.old));
     g.insertAdjacentHTML('beforeend','<div class="stnote">'+ic('info')+'<span>عددهای بالا فقط سیگنال‌هایی است که همان لحظه داده شده‌اند. <b>'+faN(O.length)+'</b> سیگنال قدیمیِ «از یادآوری» جدا حساب شده: '+
       faN(s2.win)+' برد · '+faN(s2.loss)+' باخت · مجموع <b class="'+cls(s2.sumR)+'" dir="ltr">'+fmtR(s2.sumR)+'</b> — کانال معمولاً فقط برنده‌ها را یادآوری می‌کند، پس این‌ها کانال را بهتر از آنچه هست نشان می‌دهند.</span></div>');}}
  {const o=st.open+st.wait;if(o)g.insertAdjacentHTML('beforeend','<div class="stnote">'+ic('info')+'<span><b>'+faN(o)+'</b> سیگنال هنوز «در جریان» است: وارد شده ولی نه استاپ خورده نه تارگت (تا '+faN(audRules().days)+' روز دنبال می‌شوند)، یا هنوز منتظر ورود. در آمار نیستند تا نتیجه‌شان معلوم شود؛ «سنجش تازه‌ها» وضعیتشان را به‌روز می‌کند.</span></div>');}
  {const nd=st.win+st.loss+st.exp;
   if(nd>0&&nd<SMALL_N)g.insertAdjacentHTML('beforeend','<div class="stnote">'+ic('info')+'<span>فقط '+faN(nd)+
     ' سیگنال به نتیجه رسیده — برای قضاوت درباره‌ی کانال دست‌کم '+faN(SMALL_N)+' لازم است.</span></div>');}
  sc.appendChild(g);
  sc.insertAdjacentHTML('beforeend',audPeriodHtml(rows));
  {const d=sc.querySelector('.audwk');if(d)d.ontoggle=()=>{AUDWK=d.open;};}
  /* یک منحنی: سرمایه با «قاعده‌ی من» و ریسک دلاری (اگر داده‌اش هست)، وگرنه R قانون کانال‌سنج */
  {const cc=capCurve(live);
   if(cc.pts.length>2)sc.appendChild(rCurve(cc.pts,cc.worst?cc.dd/cc.risk:0,
     'سرمایه با '+(xRule()?'قاعده‌ی من':'قانون کانال‌سنج')+' و ریسک '+fmtUsd(cc.risk)+' در هر معامله: '+fmtUsd(cc.start)+' ← <b class="'+cls(cc.cap-cc.start)+'">'+fmtUsd(cc.cap)+'</b>'+
     ' · بیشترین افت <span style="color:var(--dn)">'+fmtUsd(-cc.dd)+'</span>'));
   else sc.appendChild(rCurve(st.curve,st.dd));}
  // صحت‌سنجی در یک خط؛ جزئیات در برگه
  sc.appendChild(verifyLine(all));
  if(st.late||st.chase)sc.appendChild(el('div','hint',
    (st.late?faN(st.late)+' سیگنال بعد از رسیدن قیمت به تارگت اول منتشر شده بود'+(AF.noLate?' (در آمار نیامده)':'')+'. ':'')+
    (st.chase?faN(st.chase)+' سیگنال وقتی منتشر شد که بیش از نیمی از راه تا تارگت طی شده بود.':'')));
  return sc;
  });

  // ترتیب به اهمیت برای هدفِ «خروج کوتاه در ایزوله»: خروج، بعد افت پیش از سود
  safe('خروج',()=>buildExitPanel(rows));
  safe('سرمایه و الگوها',()=>buildInsights(rows));
  safe('فهرست سیگنال‌ها',()=>buildAudList(rows));

  paintAudProgress();
  // سنجش فقط با زدن دکمه (دیگر با باز شدن تب خودکار شروع نمی‌شود)
}

/* پنل «وضعیت سنجش»: جواب مستقیمِ «چرا کانال‌سنج سیگنال‌ها را نمی‌خواند؟»
   چند پست سیگنال شناخته شد، چند تا سنجیده شد، بقیه به چه دلیل نه، و آخرین خطای شبکه.
   دکمه‌ی آزمایش، از هر منبع کندلِ بیت‌کوین را می‌گیرد تا معلوم شود کدام از مسیرِ تو باز است. */
/* برای سازنده: سیگنالِ اصلی‌ای که استاپ از آن آمد (یا باید می‌آمد) هم کنار پیگیری کپی شود */
function audParentTxt(inp){
  const ref=inp&&(inp.inh||inp.need);if(!ref||ref.id==null)return '';
  const q=POSTS.find(x=>x.id===ref.id);if(!q)return '';
  return '\n↳ سیگنال اصلی'+(q.img?' (تصویری)':'')+': '+String(q.origText||q.text||'').slice(0,200).replace(/\n+/g,' ');
}
/* «تکمیل از روی چارت»: کانال سیگنال اصلی را تصویر می‌دهد («#MOVR» + چارت) و پیگیری‌ها
   («ورود مجدد مجازه») به آن تکیه دارند. عددها را یک بار از روی تصویر وارد کن؛ خودِ پست و همه‌ی
   پیگیری‌هایش سنجیده می‌شوند. ورودِ خالی = قیمت بازار در لحظه‌ی انتشار. */
/* «سیگنال نیست»: چارت یا پستی که فقط چون هشتگ داشت سیگنال حساب شده. از سیگنال‌ها و کانال‌سنج
   بیرون می‌رود (همان کلید «سیگنال نیست» فهرست سیگنال‌ها) و با «برگردان» برمی‌گردد. */
function audNotSig(p,then){
  const prev=OVERRIDE[p.id]?Object.assign({},OVERRIDE[p.id]):null;
  const put=o=>{if(o)OVERRIDE[p.id]=o;else delete OVERRIDE[p.id];DB.overrides=OVERRIDE;save();PCACHE.delete(p.id);};
  put(Object.assign({},prev,{sig:false}));
  if(then)then();else renderAll();
  toastUndo('«سیگنال نیست»: از سیگنال‌ها و کانال‌سنج برداشته شد',()=>{put(prev);renderAll();});
}
/* صف «نیاز به بررسی»: هر چیزی که با عدد زدن تو درست می‌شود، یکی‌یکی. تصویر اصلی‌ای که
   پیگیری‌ها منتظرش‌اند یک بار (پرپیگیری‌ترین اول)؛ سیگنال ناقص متنی هر کدام یک بار.
   rows = ردیف‌های کانال‌سنج که با همین مورد درست (یا با «کنار بگذار» با هم کنار) می‌روند. */
const AUD_FIXW=['img-sl','no-ticker','no-entry','no-stop','bad-stop','px','far-sl','nocandle'];
function audFixQ(rows){
  rows=rows||audRows();const M=new Map();
  const add=(id,why,rid,t)=>{let q=M.get(id);if(!q){q={id,why,rows:new Set(),t:t||0};M.set(id,q);}q.rows.add(rid);};
  for(const x of rows){
    if(!x.inp.stop&&x.inp.need&&x.inp.need.id!=null)add(x.inp.need.id,'img-sl',x.p.id,x.inp.need.t);
    else if(x.r&&x.r.st==='bad'&&AUD_FIXW.includes(x.r.why))add(x.p.id,x.r.why,x.p.id,x.inp.t0);
  }
  return [...M.values()].sort((a,b)=>(b.rows.size-a.rows.size)||(b.t-a.t));
}
/* «کنار بگذار»: عددی نیست که بشود زد (تصویر خوانا نیست، پست پاک شده، ارز در صرافی نیست).
   فقط از کانال‌سنج بیرون می‌رود؛ در فهرست سیگنال‌ها می‌ماند. با «برگرداندن» برمی‌گردد. */
function audSkip(ids,then){
  ids=[...new Set(ids)];
  const prev=ids.map(id=>[id,OVERRIDE[id]?Object.assign({},OVERRIDE[id]):null]);
  for(const id of ids)OVERRIDE[id]=Object.assign({},OVERRIDE[id],{noAud:true});
  DB.overrides=OVERRIDE;save();
  if(then)then();else renderAll();
  toastUndo(faN(ids.length)+' سیگنال از سنجش کنار رفت',()=>{
    for(const [id,o] of prev){if(o)OVERRIDE[id]=o;else delete OVERRIDE[id];}
    DB.overrides=OVERRIDE;save();renderAll();});
}
/* زمان ← مقدار datetime-local (به وقت خود گوشی) */
/* «2026-10-12 14:00» (یا با / و ارقام فارسی؛ سال زیر 1700 = شمسی) به وقت خود گوشی ← زمان؛ نامعتبر ← null */
function parseLocalDT(s){
  const m=normDig(String(s||'')).trim().replace('T',' ').match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);if(!m)return null;
  let [,y,mo,d,h,mi]=m.map(Number);if(!(mo>=1&&mo<=12&&d>=1&&d<=31&&(h||0)<24&&(mi||0)<60))return null;
  if(y<1700){const g=d2g(j2d(y,mo,d));y=g.gy;mo=g.gm;d=g.gd;}
  const t=new Date(y,mo-1,d,h||12,mi||0).getTime();
  return new Date(t).getDate()===d?t:null;      // 31 شهریور میلادی و مانند آن
}
const dtLocal=t=>{const d=new Date(t),z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+'T'+z(d.getHours())+':'+z(d.getMinutes());};
/* «قیمت دور» (px): قیمت لحظه‌ی انتشار در جهت سود از ورود جلوتر بوده (تا 4 برابر) ← به احتمال زیاد یادآوری سیگنال قدیمی
   («ببینید چقدر رشد کرد»)؛ در جهت ضرر یا چند برابر ← عدد یا نماد اشتباه. null اگر داده نیست. */
function audPxKind(x){
  const r=x&&x.r,i=x&&x.inp;if(!r||r.why!=='px'||!(r.px0>0)||!i||!(i.entry>0))return null;
  const d=(r.px0-i.entry)/i.entry,q=r.px0/i.entry;
  // جلوتر در جهت سود ولی نه چند برابر (چند برابر یعنی صفر کم/زیاد یا ارز دیگر)
  return {px0:r.px0,E:i.entry,d,old:i.dir==='long'?q>1.25&&q<4:q<0.8&&q>0.25};
}
/* «پست نتیجه است»: یادآوری یا نتیجه‌ی سیگنالی قدیمی («ببینید چقدر رشد کرد»)؛ به سطل «نتایج» می‌رود و از سنجش بیرون */
/* علامت «سیگنال است» (sig:true، که با ثبت عددها در برگه می‌خورد) بر «نتیجه» می‌چربید و پست در سنجش می‌ماند؛
   پس نتیجه کردن آن علامت را هم برمی‌دارد (عددها می‌مانند) و «برگرداندن» هر دو را برمی‌گرداند */
function audToResults(ids,msg,then){
  const prev=ids.map(id=>[id,DB.results[id],DB.archived[id],OVERRIDE[id]?Object.assign({},OVERRIDE[id]):null]);
  for(const id of ids){DB.results[id]=Date.now();delete DB.archived[id];
    const o=OVERRIDE[id];if(o&&o.sig===true){delete o.sig;delete o.t0;delete o.old;if(!Object.keys(o).length)delete OVERRIDE[id];}
    PCACHE.delete(id);}
  DB.overrides=OVERRIDE;save();
  if(then)then();else renderAll();
  toastUndo(msg,()=>{for(const [id,r,a,o] of prev){if(r==null)delete DB.results[id];else DB.results[id]=r;if(a!=null)DB.archived[id]=a;
      if(o)OVERRIDE[id]=o;else delete OVERRIDE[id];PCACHE.delete(id);}
    DB.overrides=OVERRIDE;save();renderAll();});
}
function audAsResult(p,then){audToResults([p.id],'به «نتایج» رفت؛ سیگنال تازه حساب نمی‌شود',then);}
function audUnskipAll(){
  let n=0;for(const [id,o] of Object.entries(OVERRIDE))if(o&&o.noAud){delete o.noAud;if(!Object.keys(o).length)delete OVERRIDE[id];n++;}
  DB.overrides=OVERRIDE;save();renderAll();toast(faN(n)+' سیگنال به سنجش برگشت','ok');
}
/* بعد از ثبت عددها همان یک سیگنال فوراً سنجیده می‌شود تا از صف «نیاز به بررسی» بیرون برود
   (قبلاً تا بستن برگه و تمام شدن صف «سنجیده نشده» می‌ماند و در همان فهرست دیده می‌شد) */
async function audMeasureOne(p){
  const inp=audInput(p);if(!inp)return;const R=audRules();
  try{await audOne({p,inp,k:audKey(inp,R)},R);audSave();}catch(e){}
  if(view==='audit'&&!document.querySelector('#veil.open'))renderAudit();
}
/* از فهرست سیگنال‌ها (یک پست) و از «وضعیت سنجش» (فقط تصویرها): همان برگه */
function sheetImgFill(ids,need,i){
  sheetAudFix(ids.map(id=>({id,why:'img-sl',rows:new Set([id]),dep:need&&need.get(id)||0})),i);
}
function sheetAudFix(Q,i){
  i=i||0;
  const fin=()=>{closeSheet();renderAll();if(!AUDQ.on)audRun();};
  const q=Q[i];if(!q){fin();return;}
  const p=POSTS.find(x=>x.id===q.id);
  if(!p)return sheetAudFix(Q,i+1);
  const ov=OVERRIDE[p.id]||{}, g=p.origText?parseSignal(p.origText):parseSignal(p.text,p.id);
  const tk=ov.ticker||g.ticker||'', dir=ov.dir||g.direction||'long';
  const v=x=>x==null?'':x, n=Q.length, last=i+1>=n;
  const tp0=ov.tps&&ov.tps.length?ov.tps:(g.targets||[]);
  const dep=q.dep!=null?q.dep:[...q.rows].filter(x=>x!==q.id).length;
  const tg=p.link?'<a href="'+esc(p.link)+'" target="_blank" rel="noopener">پست در تلگرام ↗</a>':'';
  openSheet('<h3>'+(q.why==='img-sl'?'عددها از روی چارت':'سیگنال ناقص')+(n>1?' · '+faN(i+1)+' از '+faN(n):'')+'</h3>'+
   (n>1?'<div class="plprog"><span class="plbar"><i style="width:'+Math.round(i/n*100)+'%"></i></span><b>'+faN(n-i)+' مانده</b></div>':'')+
   (q.why!=='img-sl'&&AUD_WHY[q.why]?'<div class="hint w">'+esc(AUD_WHY[q.why])+'</div>':'')+
   (q.why==='px'?(()=>{const k=audPxKind({r:AUD[p.id],inp:audInput(p)});if(!k)return '';
      return '<div class="hint '+(k.old?'w':'')+'">ورود <b dir="ltr">'+fmtPrice(k.E)+'</b> · قیمت هنگام همین پست <b dir="ltr">'+fmtPrice(k.px0)+'</b> (<bdi dir="ltr">'+(k.d>0?'+':'')+fmtNum(k.d*100)+'٪</bdi>) — '+
        (k.old?'<b>قیمت از ورود جلوتر بود: به احتمال زیاد یادآوری سیگنال قدیمی است.</b> عدد زدن درستش نمی‌کند؛ یکی از دو دکمه‌ی پایین را بزن.':'احتمالاً نماد یا عدد اشتباه است (یک صفر کم یا زیاد؟)؛ نماد و ورود را درست کن.')+'</div>';})():'')+
   (q.why==='px'?'<div class="hint">اگر این پست یادآوری یک سیگنال قدیمی است («ببینید سیگنالم چقدر رشد کرد») و خود سیگنال پیش‌تر داده شده، «پست نتیجه است» را بزن؛ سیگنال تازه نیست و نباید از امروز سنجیده شود.</div>':'')+
   '<div class="hint"><b dir="ltr">'+esc(tk||'—')+'</b> · '+(p.date?jStampFa(p.date):'')+
     (dep?' · '+faN(dep)+' پیگیری منتظر همین عددهاست':'')+(tg?' · '+tg:'')+'</div>'+
   (p.img?'<div id="ifImg" class="imgfill"></div>':(q.why==='img-sl'?'<div class="hint">تصویری ذخیره نشده — '+(tg||'متن پست را ببین')+'</div>':''))+
   '<div class="audtxt">'+esc(p.origText||p.text||'')+'</div>'+
   '<div class="hint" id="ifPx"></div>'+
   '<div class="grid" style="margin-top:8px">'+
     '<div class="fld"><label for="f_tk">نماد</label><input id="f_tk" dir="ltr" autocomplete="off" value="'+esc(tk)+'"></div>'+
     '<div class="fld"><label>جهت</label><select id="f_d"><option value="long"'+(dir==='long'?' selected':'')+'>لانگ</option>'+
       '<option value="short"'+(dir==='short'?' selected':'')+'>شورت</option></select></div>'+
   '</div><div class="grid" style="margin-top:8px">'+
     fldHtml('en','ورود (خالی = قیمت انتشار)',v(ov.entry!=null?ov.entry:g.entry))+
     fldHtml('st','حد ضرر',v(ov.stop!=null?ov.stop:g.stop))+
   '</div><div class="grid" style="margin-top:8px">'+
     fldHtml('t1','تارگت ۱',v(tp0[0]))+fldHtml('t2','تارگت ۲',v(tp0[1]))+fldHtml('t3','تارگت ۳',v(tp0[2]))+
   '</div>'+
   '<div class="srow"><button class="btn pri" id="ok">ثبت'+(last?'':' و بعدی')+'</button>'+
     (last?'':'<button class="btn" id="sk">بعدی</button>')+'<button class="btn" id="cx">بستن</button></div>'+
   '<div class="srow"><button class="btn sm side" id="ax">'+ic('box')+'<span>عدد ندارد؛ کنار بگذار'+(dep?' (با '+faN(dep)+' پیگیری)':'')+'</span></button>'+
     '<button class="btn sm side" id="ns">'+ic('x')+'<span>سیگنال نیست'+(p.img?' (فقط چارت است)':'')+'</span></button>'+
     '<button class="btn sm '+(q.why==='px'?'ok':'side')+'" id="rs">'+ic('flag')+'<span>پست نتیجه است (سیگنال قدیمی)</span></button>'+
     '<button class="btn sm '+(q.why==='px'?'ok':'side')+'" id="od">'+ic('check')+'<span>درست است؛ با تاریخ اصلی بسنج</span></button></div>'+
   '<div class="fld'+(ov.t0>0?'':' hide')+'" id="odw" style="margin-top:8px"><label for="f_t0">تاریخ و ساعت سیگنال اصلی (میلادی؛ از تقویم انتخاب کن)</label>'+
     '<div class="t0row"><input id="f_t0" type="datetime-local" dir="ltr" aria-label="انتخاب از تقویم" value="'+(ov.t0>0?dtLocal(ov.t0):'')+'">'+
       '<input id="f_t0t" dir="ltr" inputmode="numeric" autocomplete="off" placeholder="2026-10-12 14:00" aria-label="ویرایش دستی" value="'+(ov.t0>0?dtLocal(ov.t0).replace('T',' '):'')+'"></div>'+
     '<div class="hint" id="t0fa"></div>'+
     (p.date?'<div class="hint">این پست: <b dir="ltr">'+dtLocal(+p.date).replace('T',' ')+'</b> ('+esc(jStamp(new Date(+p.date)))+'). سیگنال اصلی باید پیش از آن باشد. از تقویم انتخاب کن یا در خانه‌ی کنارش دستی بنویس/اصلاح کن (سال-ماه-روز ساعت:دقیقه).</div>':'')+
     '<div class="hint">سیگنال از همان روز با کندل واقعی سنجیده می‌شود و در آمار می‌آید، با برچسب «از یادآوری». کانال معمولاً فقط برنده‌ها را یادآوری می‌کند؛ برای همین کارنامه نتیجه را بدون این‌ها هم نشان می‌دهد.</div></div>',
   ()=>{
     if(p.img)$('#ifImg').appendChild(postShot(p,p.img,'چارت'));
     $('#cx').onclick=fin;
     const nx=()=>last?fin():sheetAudFix(Q,i+1);
     if($('#sk'))$('#sk').onclick=nx;
     $('#ns').onclick=()=>audNotSig(p,nx);
     $('#ax').onclick=()=>audSkip([q.id,...q.rows],nx);
     $('#rs').onclick=()=>audAsResult(p,nx);
     // تاریخ انتخاب‌شده به شمسی (و میلادی خوانا) زیر همان خانه
     // تقویم و خانه‌ی دستی هم‌گام؛ زیرش شمسی و میلادی خوانا
     const t0Of=()=>parseLocalDT($('#f_t0t').value);
     const t0fa=()=>{const t=t0Of(),n=$('#t0fa');if(!n)return;
       n.innerHTML=t!=null?'= <b>'+esc(jStamp(new Date(t)))+'</b> (شمسی، وقت تهران) · '+faN(new Date(t).getDate())+' '+G_M[new Date(t).getMonth()]+' '+new Date(t).getFullYear()+
         (p.date&&t>=+p.date?' · <span class="d">بعد از همین پست است!</span>':''):($('#f_t0t').value.trim()?'<span class="d">تاریخ خوانده نشد؛ مثل 2026-10-12 14:00</span>':'');};
     $('#f_t0').oninput=$('#f_t0').onchange=()=>{const v=$('#f_t0').value;if(v)$('#f_t0t').value=v.replace('T',' ');t0fa();};
     $('#f_t0t').oninput=()=>{const t=t0Of();if(t!=null)$('#f_t0').value=dtLocal(t);t0fa();};
     t0fa();
     $('#od').onclick=()=>{$('#odw').classList.remove('hide');const f=$('#f_t0');try{f.showPicker&&f.showPicker();}catch(e){}f.focus();};
     const tkOf=()=>normDig($('#f_tk').value||'').toUpperCase().replace(/^[#$]/,'').replace(/[\/\-]?USDT?$/,'').trim();
     // قیمتِ لحظه‌ی انتشار، تا عددی که از چارت می‌خوانی با بازار مقایسه شود
     let PX=null;
     const pxAt=()=>{const t=tkOf(),n0=$('#ifPx');PX=null;if(!t||!p.date||!n0)return Promise.resolve();n0.textContent='';
       return audCandles(t,'5m',Math.ceil(+p.date/3e5)*3e5,1,true).then(C=>{
         const n=$('#ifPx');if(C&&C[0])PX=C[0].o;if(n&&C&&C[0])n.innerHTML='قیمت بازار '+esc(t)+' هنگام انتشار: <b dir="ltr">'+fmtPrice(C[0].o)+'</b>';
         else if(n)n.textContent='قیمت '+t+' از هیچ منبعی نیامد؛ نماد را درست بنویس یا «کنار بگذار».';}).catch(()=>{});};
     pxAt();$('#f_tk').onchange=pxAt;
     $('#ok').onclick=()=>{
       const st=num('f_st');
       if(!st){toast(q.why==='img-sl'?'حد ضرر را از روی چارت بنویس':'حد ضرر را بنویس','err');return;}
       const t=tkOf();
       const tps=['f_t1','f_t2','f_t3'].map(num).filter(x=>x!=null);
       const o=Object.assign({},OVERRIDE[p.id],{sig:true,ticker:t||undefined,dir:$('#f_d').value,stop:st});
       const en=num('f_en');if(en!=null)o.entry=en;else delete o.entry;
       // سیگنال قدیمیِ یادآوری‌شده
       const t0s=($('#f_t0t')||{}).value||'';
       if(t0s.trim()){const t0=parseLocalDT(t0s);
         if(t0==null){toast('تاریخ خوانده نشد؛ مثل 2026-10-12 14:00 بنویس','err');return;}
         if((p.date&&t0>=+p.date)||t0<Date.now()-400*864e5){toast('تاریخ سیگنال اصلی باید پیش از همین پست باشد ('+dtLocal(+p.date).replace('T',' ')+') و حداکثر 400 روز پیش','err');return;}
         o.t0=t0;o.old=true;if(en==null){toast('برای سیگنال قدیمی ورود را هم بنویس','err');return;}}
       else if(!$('#odw').classList.contains('hide')){toast('تاریخ سیگنال اصلی را از تقویم انتخاب کن','err');return;}
       else{delete o.t0;delete o.old;}
       /* ورودی که هنوز بیش از 30٪ با قیمت لحظه‌ی انتشار فاصله دارد، بعد از ثبت هم «نیاز به بررسی» می‌ماند
          (همان چیزی که دیده می‌شد: «اصلاح زدم ولی از صف بیرون نرفت»). پس همین‌جا بگو و عدد درست را پیشنهاد کن */
       if(en!=null&&!o.t0&&PX>0&&Math.abs(en-PX)/PX>0.3){
         let sug=null;for(const k of [-1,1,-2,2,-3,3]){const v=en*Math.pow(10,k);if(Math.abs(v-PX)/PX<=0.3){sug=+v.toPrecision(6);break;}}
         $('#ifPx').innerHTML='<span class="d">ورود <b dir="ltr">'+fmtPrice(en)+'</b> با قیمت هنگام انتشار (<b dir="ltr">'+fmtPrice(PX)+'</b>) '+fmtNum(Math.abs(en-PX)/PX*100)+'٪ فاصله دارد؛ با این عدد باز «نیاز به بررسی» می‌ماند.</span> '+
           (sug?'شاید <b dir="ltr">'+fmtPrice(sug)+'</b>؟ (یک صفر کم یا زیاد) ':'')+'یا ورود را خالی بگذار تا قیمت بازار همان لحظه حساب شود؛ اگر یادآوری سیگنال قدیمی است، «پست نتیجه است» یا «با تاریخ اصلی بسنج».';
         if(sug){const b=el('button','btn xs ok','بگذار '+fmtPrice(sug));b.type='button';b.onclick=()=>{$('#f_en').value=String(sug);$('#ifPx').textContent='';};$('#ifPx').appendChild(b);}
         $('#ifPx').scrollIntoView({block:'center',behavior:'smooth'});
         toast('ورود با قیمت بازار جور نیست','err');return;}
       if(tps.length)o.tps=tps;else delete o.tps;
       if(!o.ticker)delete o.ticker;
       delete o.noAud;
       OVERRIDE[p.id]=o;DB.overrides=OVERRIDE;save();PCACHE.delete(p.id);
       toast('عددهای '+(t||'سیگنال')+' ثبت شد؛ همین الان سنجیده می‌شود','ok');
       audMeasureOne(p);
       nx();
     };
   });
}
function buildAudDiag(all){
  const nSig=POSTS.filter(p=>bucketOf(p)!=='les'&&postKind(p)==='sig').length;
  let done=0,open=0,todo=0;const why={};
  for(const x of all){
    const r=x.r;
    if(!r){todo++;continue;}
    if(r.st==='bad'){why[r.why]=(why[r.why]||0)+1;continue;}
    if(['win','loss','exp','none','amb'].includes(r.st))done++;else open++;
  }
  const nBad=Object.values(why).reduce((a,b)=>a+b,0);
  const good=all.length&&(done+open)>=all.length*0.5;
  const d=el('details','sec audiag');
  d.open=!good;
  d.innerHTML='<summary>وضعیت سنجش <span class="pill '+(good?'win':'gold')+'">'+
    faN(done+open)+' از '+faN(all.length)+' سنجیده</span></summary>';
  const g=el('div','audgrid');
  const cell=(l,v,c,h)=>'<div class="ag"><b>'+l+'</b><span class="'+(c||'')+'">'+v+'</span>'+(h?'<small>'+h+'</small>':'')+'</div>';
  g.innerHTML=cell('سیگنالِ شناخته‌شده',faN(nSig),'','از '+faN(POSTS.length)+' پستِ خوانده‌شده')+
    cell('قابل سنجش',faN(all.length),'','نماد و ورود و استاپ دارد یا منتظر بررسی است')+
    cell('سنجیده',faN(done),done?'u':'m',faN(open)+' هنوز در جریان')+
    cell('سنجیده نشده',faN(todo),todo?'w':'m',AUDQ.on?'در حال سنجش…':(todo?'در صف':''))+
    cell('ناقص / خطا',faN(nBad),nBad?'d':'m','');
  d.appendChild(g);
  if(nBad){
    const ul=el('ul','audwhy');
    for(const [k,n] of Object.entries(why).sort((a,b)=>b[1]-a[1]))
      ul.appendChild(el('li',null,'<b>'+faN(n)+'</b> '+esc(AUD_WHY[k]||k)+
        (k==='nocandle'?' — «آزمایش اتصال» را بزن':
         k==='img-sl'?' — «تکمیل از روی چارت» را بزن':
         k==='no-stop'||k==='no-entry'||k==='no-ticker'?' — در فهرست پایین «اصلاح عددها» را بزن':
         k==='px'?(()=>{const o=all.filter(x=>(audPxKind(x)||{}).old).length;return o?' — '+faN(o)+' تا قیمتشان از ورود جلوتر بود: یادآوری سیگنال قدیمی‌اند، نه سیگنال تازه':'';})():'')));
    d.appendChild(ul);
    {const O=all.filter(x=>(audPxKind(x)||{}).old);
     if(O.length){const b=el('button','btn sm',ic('flag')+'<span>بردن '+faN(O.length)+' یادآوری به «نتایج»</span>');
       b.onclick=async()=>{if(!(await askConfirm({title:faN(O.length)+' یادآوری سیگنال قدیمی',msg:'قیمت هنگام این پست‌ها بیش از 30٪ از ورودشان جلوتر بود؛ یعنی سیگنال خیلی پیش‌تر داده شده و این پست «ببینید چقدر رشد کرد» است. به سطل «نتایج» می‌روند و از سنجش بیرون. اگر تاریخ سیگنال اصلی یکی را داری، به‌جایش در «مرور یکی‌یکی» «درست است؛ با تاریخ اصلی بسنج» را بزن.',ok:'ببر به نتایج',cancel:'نه'})))return;
         audToResults(O.map(x=>x.p.id),faN(O.length)+' یادآوری به «نتایج» رفت');};
       const r=el('div','srow');r.appendChild(b);d.appendChild(r);}}
    // پست‌های تصویری که پیگیری‌ها منتظر عددهایشان‌اند؛ پرتکرارترین اول
    const Q=audFixQ(all);
    if(Q.length){
      const nI=Q.filter(q=>q.why==='img-sl').length;
      const fb=el('button','btn sm pri',ic('edit')+'<span>مرور یکی‌یکی ('+faN(Q.length)+' مورد'+(nI?'؛ '+faN(nI)+' چارت':'')+')</span>');
      fb.onclick=()=>sheetAudFix(Q,0);
      const r=el('div','srow');r.appendChild(fb);d.appendChild(r);
    }
    // متنِ سیگنال‌های بی‌استاپ/بی‌ورود برای فرستادن به سازنده، تا الگوی خواندنشان اضافه شود
    const bad=all.filter(x=>x.r&&x.r.st==='bad'&&['no-stop','no-entry','px','bad-stop','far-sl','img-sl'].includes(x.r.why));
    if(bad.length){
      const cp=el('button','btn sm',ic('share')+'<span>کپی متن '+faN(bad.length)+' سیگنالِ ناقص</span>');
      cp.onclick=async()=>{
        const txt=bad.slice(0,40).map((x,i)=>'#'+(i+1)+' ['+(AUD_WHY[x.r.why]||x.r.why)+']\n'+String(x.p.origText||x.p.text||'').slice(0,600)+audParentTxt(x.inp)).join('\n\n———\n\n');
        try{await navigator.clipboard.writeText(txt);toast('متن '+faN(Math.min(40,bad.length))+' سیگنال کپی شد؛ برای سازنده بفرست','ok');}
        catch(e){openSheet('<h3>متن سیگنال‌های ناقص</h3><textarea class="cptxt" readonly>'+esc(txt)+'</textarea>',sh=>{const ta=sh.querySelector('textarea');ta.focus();ta.select();});}
      };
      const r=el('div','srow');r.appendChild(cp);d.appendChild(r);
    }
  }
  if(nSig&&!all.length)d.appendChild(el('div','hint','سیگنال‌ها شناخته شده‌اند ولی هیچ‌کدام عددِ ورود/استاپِ قابل خواندن ندارند.'));
  {const nk=Object.values(OVERRIDE).filter(o=>o&&o.noAud).length;
   if(nk){const r=el('div','srow');r.appendChild(el('span','hint',faN(nk)+' سیگنال را از سنجش کنار گذاشته‌ای.'));
     const u=el('button','btn sm side',ic('undo')+'<span>برگرداندن همه</span>');u.onclick=audUnskipAll;r.appendChild(u);d.appendChild(r);}}
  const last=AUDQ.at?'آخرین سنجش '+ageTxt(AUDQ.at):'هنوز سنجشی انجام نشده';
  d.appendChild(el('div','hint',last+(AUDQ.err?' · آخرین خطا: <span dir="ltr">'+esc(AUDQ.err)+'</span>':'')+
    (AUDSRC.$!=null&&AUD_SRC[AUDSRC.$]?' · منبع کندل: '+esc(AUD_SRC[AUDSRC.$].n):'')));
  // آزمایش منبع‌های کندل در همان برگه‌ی «وضعیت و عیب‌یابی» (یک جا برای همه‌ی تست‌های اتصال)
  const bt=el('button','btn sm',ic('wifi')+'<span>آزمایش اتصال کندل</span>');
  bt.onclick=sheetHealthCandles;
  /* سنجیده‌نشده‌ها و «در جریان»ها (حتی اگر همین الان سنجیده شده‌اند) و کندل‌نیامده‌ها از نو.
     قبلاً اگر کاری نبود هیچ پیامی نمی‌آمد و صفحه هم عوض نمی‌شد: انگار دکمه کار نمی‌کند */
  const again=el('button','btn sm pri',ic('refresh')+'<span>سنجیدن تازه‌ها و در جریان‌ها</span>');
  again.onclick=()=>{
    for(const k in AUD){const a=AUD[k];if(a&&a.st==='bad'&&a.why==='nocandle'){a.tries=0;a.at=0;}}
    audSave();AUDQ.on=false;
    const n=audJobs(false,false,true).length;
    audRun(false,false,true);
    toast(n?'سنجش '+faN(n)+' سیگنال شروع شد':'چیزی برای سنجیدن نمانده — همه سنجیده و به نتیجه رسیده‌اند. برای از نو: «سنجش دوباره‌ی همه»',n?'info':'ok');
    renderAudit();
  };
  const row=el('div','srow');row.appendChild(bt);row.appendChild(again);
  d.appendChild(row);
  return d;
}
function buildAudFilter(all){
  const d=el('details','sec audf');
  // «دیرهنگام‌ها در آمار نیایند» پیش‌فرض روشن است؛ شمرده می‌شود تا معلوم باشد چیزی کنار رفته،
  // ولی به‌خاطر آن بخش خودبه‌خود باز نمی‌شود
  const user=(AF.dir!=='all')+(AF.mkt!=='all')+(!!AF.rr)+(!!AF.span)+(!!AF.sym)+(!!AF.iso);
  const active=user+(AF.noLate?1:0);
  d.open=!!user;
  d.innerHTML='<summary>فیلتر — «اگر فقط این‌ها را گرفته بودم؟»'+
    (active?' <span class="pill '+(user?'gold':'mut')+'">'+faN(active)+' فیلتر'+(!user&&AF.noLate?' (دیرهنگام)':'')+'</span>':'')+'</summary>';
  const row=(label,opts,key)=>{
    const w=el('div','afrow');
    w.appendChild(el('span','aflab',label));
    const grp=el('div','afopts');
    for(const [v,l] of opts){
      const b=el('button','catchip'+(AF[key]===v?' on':''),l);
      b.onclick=()=>{AF[key]=v;afSave();audShown=40;renderAudit();};
      grp.appendChild(b);
    }
    w.appendChild(grp);d.appendChild(w);
  };
  row('جهت',[['all','همه'],['long','لانگ'],['short','شورت']],'dir');
  row('بازار',[['all','همه'],['futures','فیوچرز'],['spot','اسپات']],'mkt');
  row('سود به ریسک',[[0,'همه'],[1,'1+'],[1.5,'1٫5+'],[2,'2+'],[3,'3+']],'rr');
  row('بازه',[[0,'همه'],[30,'30 روز'],[90,'90 روز']],'span');
  row('فاصله‌ی استاپ',[[false,'همه'],[true,'فقط مناسب ایزوله (تا '+fmtNum(isoMaxSd())+'٪)']],'iso');
  const syms=[...new Set(all.map(x=>x.inp.tk).filter(Boolean))].sort();
  const w=el('div','afrow');
  w.appendChild(el('span','aflab','نماد'));
  const sel=el('select','afsel');sel.setAttribute('aria-label','فیلتر نماد');
  sel.innerHTML='<option value="">همه</option>'+syms.map(x=>'<option'+(AF.sym===x?' selected':'')+'>'+esc(x)+'</option>').join('');
  sel.onchange=()=>{AF.sym=sel.value;afSave();audShown=40;renderAudit();};
  w.appendChild(sel);d.appendChild(w);
  const lt=el('label','shopt');
  lt.innerHTML='<input type="checkbox"'+(AF.noLate?' checked':'')+'><span>سیگنال‌های دیرهنگام در آمار نیایند</span>';
  lt.querySelector('input').onchange=e=>{AF.noLate=e.target.checked;afSave();renderAudit();};
  d.appendChild(lt);
  if(active){
    const c=el('button','btn xs','برداشتن همه‌ی فیلترها');
    c.onclick=()=>{Object.assign(AF,{dir:'all',mkt:'all',rr:0,span:0,sym:'',iso:false});afSave();renderAudit();};
    d.appendChild(c);
  }
  return d;
}

/* صحت‌سنجی: یک خط در «کارنامه‌ی کانال» (نتیجه + چند عدد)؛ با زدن، برگه‌ی جزئیات */
function verifyData(all){
  const claims=claimsAll();
  const ok=claims.filter(x=>x.vd.v==='ok'), no=claims.filter(x=>x.vd.v==='no');
  /* «گزارش شد» یعنی کانال راستش را گفته: برای برد، ادعایی که کندل تأییدش کرد؛ برای
     باخت، پستی که صریحاً گفته استاپ خورد. فقط سیگنال‌های قطعیِ دست‌کم سه‌روزه. */
  const toldWin=new Set(claims.filter(x=>x.tg&&x.vd.v==='ok'&&(x.c.kind==='tp'||x.c.kind==='be')).map(x=>x.tg.p.id));
  const toldLoss=new Set(claims.filter(x=>x.tg&&x.c.kind==='sl').map(x=>x.tg.p.id));
  const old=all.filter(x=>x.r&&x.inp.t0&&Date.now()-x.inp.t0>3*DAY);
  const W=old.filter(x=>x.r.st==='win'), L=old.filter(x=>x.r.st==='loss');
  const wc=W.filter(x=>toldWin.has(x.p.id)).length, lc=L.filter(x=>toldLoss.has(x.p.id)).length;
  const pw=W.length?wc/W.length*100:null, pl=L.length?lc/L.length*100:null;
  const ed=Object.entries(DB.edits).filter(([,e])=>e.nums).sort((a,b)=>b[1].at-a[1].at);
  const gone=Object.entries(DB.gone).sort((a,b)=>b[1].at-a[1].at);
  const enough=W.length>=5&&L.length>=5, gap=enough?pw-pl:0;
  const bad=no.length>ok.length*0.2||gap>30||ed.length+gone.length>=3, warn=no.length||gap>15||ed.length||gone.length;
  const verdict=!claims.length&&!enough?'هنوز داده‌ی کافی نیست.'
    :bad?'احتیاط: '+[no.length?faN(no.length)+' ادعای نادرست':'',gap>30?'بردها خیلی بیشتر از باخت‌ها گزارش می‌شوند':'',
        ed.length+gone.length?faN(ed.length+gone.length)+' پستِ ویرایش‌شده/حذف‌شده':''].filter(Boolean).join('، ')+'.'
    :warn?'تقریباً قابل اعتماد، با چند مورد مشکوک.':'تا اینجا گزارش‌های کانال با قیمت واقعی جور است.';
  return {ok,no,pw,pl,ed,gone,enough,gap,bad,warn,verdict};
}
function verifyLine(all){
  const v=verifyData(all);
  const b=el('button','flag vline '+(v.bad?'d':v.warn?'w':'u'),'<i>'+(v.bad?'!':'✓')+'</i><span><b>صحت‌سنجی:</b> '+v.verdict+
    (!v.bad&&(v.no.length||v.ed.length||v.gone.length)?' <small>'+faN(v.no.length)+' ادعای نادرست · '+faN(v.ed.length)+' ویرایش · '+faN(v.gone.length)+' حذف</small>':'')+
    '</span><em>جزئیات ›</em>');
  b.type='button';b.onclick=()=>sheetVerify(all);
  return b;
}
function sheetVerify(all){
  const v=verifyData(all);
  openSheet('<h3>صحت‌سنجی: کانال راست می‌گوید؟</h3><div id="vfBody"></div><div class="srow"><button class="btn" id="cx">بستن</button></div>',sh=>{
    $('#cx').onclick=closeSheet;
    const c=sh.querySelector('#vfBody');
    c.appendChild(el('div','flag '+(v.bad?'d':v.warn?'w':'u'),'<i>'+(v.bad?'!':'✓')+'</i><span>'+v.verdict+'</span>'));
    const g=el('div','stats');
    g.innerHTML=
      stHtml('ادعای نادرست',faN(v.no.length),v.no.length?'d':'u','از '+faN(v.ok.length+v.no.length)+' ادعای سنجیده')+
      stHtml('گزارش برد / باخت',v.pw==null||v.pl==null?'—':faN(v.pw.toFixed(0))+'٪ / '+faN(v.pl.toFixed(0))+'٪',v.enough&&v.gap>15?'d':'m',
        v.enough?'چند درصد بردها و باخت‌ها را خودش گفت':'دست‌کم ۵ برد و ۵ باخت لازم است')+
      stHtml('ویرایش عدد / حذف',faN(v.ed.length)+' / '+faN(v.gone.length),v.ed.length||v.gone.length?'d':'m','پست بعد از انتشار عوض شد');
    c.appendChild(g);
    const go=p=>{closeSheet();setTimeout(()=>sheetAudPost(p),260);};
    for(const x of v.no.slice(0,8)){const r=claimRow(x);if(x.tg)r.onclick=()=>go(x.tg.p);c.appendChild(r);}
    for(const [id,e] of v.ed.slice(0,6)){
      const r=el('button','arow');
      r.innerHTML='<span class="pill lose">عدد عوض شد</span><span class="atx">'+esc((e.old||'').slice(0,70))+'</span>';
      r.onclick=()=>{const p=POSTS.find(x=>x.id===id);if(p)go(p);};
      c.appendChild(r);
    }
    for(const [id] of v.gone.slice(0,6)){
      const p=POSTS.find(x=>x.id===id);
      const r=el('button','arow');
      r.innerHTML='<span class="pill lose">حذف شد</span><span class="atx">'+esc(p?(p.text||'').slice(0,70):id)+'</span>';
      r.onclick=()=>{if(p)go(p);};
      c.appendChild(r);
    }
  });
}
function claimRow(x){
  const r=el('button','arow');
  const tk=x.tg?audInput(x.tg.p):null;
  r.innerHTML='<span class="pill '+(x.vd.v==='ok'?'win':x.vd.v==='no'?'lose':'mut')+'">'+
    (x.vd.v==='ok'?'ادعا درست':x.vd.v==='no'?'ادعا نادرست':'نامعلوم')+'</span>'+
    (tk&&tk.tk?'<b>'+esc(tk.tk)+'</b>':'')+
    '<span class="atx">'+esc(x.vd.why)+(x.tg&&x.tg.how==='guess'?' · سیگنالِ حدسی':'')+'</span>';
  r.onclick=()=>{if(x.tg)sheetAudPost(x.tg.p);};
  return r;
}

/* شما در برابر کانال: کجا فیلتر کردنت سود آورد و کجا هزینه */
function buildVsChannel(rows){
  const c=el('div','panel');
  c.appendChild(el('div','panelhead','<b>شما در برابر کانال</b>'));
  const done=rows.filter(x=>x.R!=null&&x.r&&['win','loss','exp'].includes(x.r.st));
  const g={taken:{n:0,ch:0,me:0,meN:0},skipped:{n:0,ch:0},none:{n:0,ch:0}};
  const reasons=new Map();
  for(const x of done){
    const d=DB.decisions[x.p.id];
    if(d&&d.action==='taken'){
      g.taken.n++;g.taken.ch+=x.R;
      const pos=d.posId&&DB.positions.find(q=>q.id===d.posId);
      if(pos&&pos.status==='closed'){const m=posMetrics(pos);if(m.r!=null&&isFinite(m.r)){g.taken.me+=m.r;g.taken.meN++;}}
    }else if(d&&d.action==='skipped'){
      g.skipped.n++;g.skipped.ch+=x.R;
      const why=(d.reason||'بدون دلیل').split(' — ')[0];
      const o=reasons.get(why)||{n:0,r:0};o.n++;o.r+=x.R;reasons.set(why,o);
    }else{g.none.n++;g.none.ch+=x.R;}
  }
  if(!done.length){c.appendChild(el('div','hint','هنوز سیگنال قطعی‌شده‌ای نیست.'));return c;}
  const s=el('div','stats');
  s.innerHTML=
    stHtml('گرفتی — کانال',g.taken.n?fmtR(g.taken.ch):'—',g.taken.n?cls(g.taken.ch):'m',faN(g.taken.n)+' سیگنال')+
    stHtml('گرفتی — خودت',g.taken.meN?fmtR(g.taken.me):'—',g.taken.meN?cls(g.taken.me):'m',
      g.taken.meN?faN(g.taken.meN)+' بسته‌شده':'پوزیشن بسته‌ای نیست')+
    stHtml('رد کردی',g.skipped.n?fmtR(g.skipped.ch):'—',g.skipped.n?cls(g.skipped.ch):'m','ارزشِ '+faN(g.skipped.n)+' سیگنال رد‌شده')+
    stHtml('تصمیم نگرفتی',g.none.n?fmtR(g.none.ch):'—',g.none.n?cls(g.none.ch):'m',faN(g.none.n)+' سیگنال');
  c.appendChild(s);
  const lines=[];
  if(g.taken.meN){
    const gap=g.taken.me-g.taken.ch;
    lines.push(Math.abs(gap)<0.3?'اجرای تو روی سیگنال‌هایی که گرفتی تقریباً همان نتیجه‌ی کانال را داده.'
      :gap<0?'روی سیگنال‌هایی که گرفتی '+fmtR(gap)+' کمتر از خود کانال گرفتی — ورود دیر، جابه‌جا کردن استاپ یا بستن زود را بررسی کن.'
      :'روی سیگنال‌هایی که گرفتی '+fmtR(gap)+' بیشتر از خود کانال گرفتی — مدیریتت از کانال بهتر بوده.');
  }
  if(g.skipped.n>=3)lines.push(g.skipped.ch>0
    ?'سیگنال‌هایی که رد کردی روی هم '+fmtR(g.skipped.ch)+' می‌ارزیدند — فیلتر کردنت سود را از دستت گرفته.'
    :'سیگنال‌هایی که رد کردی روی هم '+fmtR(g.skipped.ch)+' بودند — رد کردن‌هایت درست بوده.');
  for(const t of lines)c.appendChild(el('div','hint',t));
  if(reasons.size){
    const tb=el('table','tp');
    tb.innerHTML='<thead><tr><th>دلیلِ رد</th><th>تعداد</th><th>ارزشِ ازدست‌رفته</th></tr></thead>';
    const b=el('tbody');
    b.innerHTML=[...reasons].sort((a,b)=>b[1].r-a[1].r).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td class="num">'+faN(v.n)+
      '</td><td class="num" style="color:var(--'+(v.r>=0?'up':'dn')+')">'+fmtR(v.r)+'</td></tr>').join('');
    tb.appendChild(b);c.appendChild(tWrap(tb));
  }
  return c;
}
/* «فعال نشد» به تفکیک دلیل. «مستقیم به تارگت» (ran) یعنی وقتی سیگنال آمد قیمت بیش از تحمل ورود از نقطه‌ی ورود
   جلوتر بود و بی برگشتن به ورود به تارگت 1 رسید: کانال آن را سود می‌شمارد، ولی با ورود اعلامی پر نمی‌شد.
   اگر همان لحظه با قیمت بازار وارد می‌شدی، استاپ پشت ورود بود و قیمت تا تارگت 1 به آن نرسید؛ پس R همان
   (تارگت 1 − قیمت انتشار) ÷ (قیمت انتشار − استاپ) است، بی کارمزد. */
/* بازه‌ی سنجش و آمار هفته‌به‌هفته (شنبه تا جمعه، وقت تهران)؛ فقط سیگنال‌های همان‌لحظه، یادآوری‌ها جدا شمرده می‌شوند */
let AUDWK=false;
function audPeriodHtml(rows){
  const L=rows.filter(x=>x.inp.t0&&!x.inp.old);if(!L.length)return '';
  const t0s=L.map(x=>x.inp.t0),a=Math.min(...t0s),b=Math.max(...t0s),days=Math.max(1,Math.round((b-a)/DAY)+1);
  const dk=t=>jStamp(new Date(t)).split(' ')[0];
  const wk=t=>Math.floor((Math.floor((t+3.5*36e5)/DAY)+5)/7);          // هفته از شنبه
  const G=new Map();for(const x of L){const k=wk(x.inp.t0);if(!G.has(k))G.set(k,[]);G.get(k).push(x);}
  const row=(lab,X,on)=>{const s=audStats(X),d=s.win+s.loss+s.exp;
    return '<tr'+(on?' class="on"':'')+'><td>'+lab+'</td><td class="num">'+faN(X.length)+'</td><td class="num">'+faN(d)+'</td>'+
      '<td class="num '+(s.winRate==null?'':s.winRate>=50?'win':'lose')+'">'+(s.winRate==null?'—':faN(Math.round(s.winRate))+'٪')+'</td>'+
      '<td class="num '+cls(s.sumR)+'"><bdi>'+(s.cnt?fmtR(s.sumR):'—')+'</bdi></td><td class="num '+cls(s.avgR)+'"><bdi>'+(s.avgR!=null?fmtR(s.avgR):'—')+'</bdi></td>'+
      '<td class="num">'+(s.noneRate==null?'—':faN(Math.round(s.noneRate))+'٪')+'</td><td class="num">'+faN(s.open+s.wait)+'</td></tr>';};
  const W=[...G.entries()].sort((x,y)=>y[0]-x[0]);
  const nOld=rows.filter(x=>x.inp.old).length;
  return '<div class="audper"><b>بازه‌ی سنجش:</b> '+esc(dk(a))+' تا '+esc(dk(b))+' ('+faN(days)+' روز) · '+faN(L.length)+' سیگنال · حدود '+fmtNum(L.length/days)+' در روز'+(nOld?' · <small>'+faN(nOld)+' یادآوری قدیمی جدا</small>':'')+'</div>'+
    '<details class="sec sub2 audwk"'+(AUDWK?' open':'')+'><summary>آمار هفته‌به‌هفته ('+faN(W.length)+' هفته)</summary><div class="tscroll"><table class="tp xtab"><thead><tr><th>هفته از</th><th>سیگنال</th><th>به نتیجه</th><th>برد</th><th>جمع R</th><th>میانگین</th><th>فعال نشد</th><th>در جریان</th></tr></thead><tbody>'+
    W.map(([k,X])=>row(esc(dk(Math.min(...X.map(x=>x.inp.t0))).slice(5)),X)).join('')+row('<b>کل</b>',L,true)+'</tbody></table></div>'+
    '<div class="hint">«به نتیجه» = برد، باخت یا منقضی؛ «برد» از میان برد و باخت؛ جمع R با «همه در تارگت اول» (قانون کانال‌سنج). هفته‌ای که بیشترش «در جریان» است هنوز قضاوت‌پذیر نیست.</div></details>';
}
function audNoneHtml(rows){
  const N=rows.filter(x=>x.r&&x.r.st==='none');if(!N.length)return '';
  const by={ran:[],timeout:[],inval:[]};for(const x of N)(by[x.r.why]||(by[x.r.why]=[])).push(x);
  const alt=by.ran.map(x=>{const i=x.inp,s=i.dir==='long'?1:-1,p0=x.r.px0,T=i.tps&&i.tps[0];
    return p0>0&&T&&i.stop&&(p0-i.stop)*s>0?(T-p0)*s/((p0-i.stop)*s):null;}).filter(v=>v!=null&&isFinite(v));
  const av=alt.length?alt.reduce((a,b)=>a+b,0)/alt.length:null;
  const li=[];
  if(by.ran.length)li.push('<b>'+faN(by.ran.length)+'</b> مستقیم به تارگت رفت، بی برگشت به ورود (کانال احتمالاً «سود» حساب کرده)'+
    (av!=null?' — با ورود بازار همان لحظه میانگین <b dir="ltr" class="'+cls(av)+'">'+fmtR(av)+'</b>':''));
  if(by.timeout.length)li.push('<b>'+faN(by.timeout.length)+'</b> قیمت تا '+faN(audRules().entryDays)+' روز به ورود نرسید');
  if(by.inval.length)li.push('<b>'+faN(by.inval.length)+'</b> پیش از ورود از استاپ گذشت');
  /* پیش‌نمایش «ورود به‌موقع»: چندتا از این‌ها، قیمت لحظه‌ی انتشار تا 2 یا 3٪ با ورود فاصله داشت
     (کانال سر وقت داده، فقط قیمت کمی جلوتر بوده) و با تحمل بیشتر فعال حساب می‌شدند */
  const R0=audRules(),dd=N.map(x=>x.r.px0>0&&x.inp.entry?Math.abs(x.r.px0-x.inp.entry)/x.inp.entry*100:null).filter(v=>v!=null);
  const n2=dd.filter(v=>v<=2).length,n3=dd.filter(v=>v<=3).length;
  const pv=n3&&!(R0.tol>=3&&R0.fill==='mkt')?'<br>در <b>'+faN(n3)+'</b> تا، قیمت لحظه‌ی انتشار تا 3٪ با ورود فاصله داشت'+(n2?' ('+faN(n2)+' تا تا 2٪)':'')+
    ' — یعنی کانال سر وقت داده و قیمت فقط کمی جلوتر بوده. با «ورود به‌موقع» این‌ها با قیمت همان لحظه وارد حساب می‌شوند. '+
    '<button class="btn xs ok" data-audentry="3">ورود به‌موقع: تحمل 3٪ با قیمت بازار</button>':'';
  return '<div class="stnote audnone">'+ic('info')+'<span><b>فعال نشد ('+faN(N.length)+'):</b> '+li.join(' · ')+'.'+
    (R0.fill==='mkt'?' (ورود در محدوده‌ی '+faN(R0.tol)+'٪ با قیمت بازار همان لحظه.)':by.ran.length?' تحمل ورود ('+faN(R0.tol)+'٪) را در «قانون‌ها» می‌توانی عوض کنی.':'')+pv+'</span></div>';
}
/* «در جریان»: قیمت آخرین سنجش و R الان، چند روز از ورود؛ «منتظر ورود»: فاصله تا ورود و مهلت */
function audNowHtml(x){
  const r=x.r,i=x.inp;if(!r||r.st!=='open'||!r.close||!(r.close.px>0))return '';
  const R=audRules(),age=t=>faN(Math.max(0,Math.floor((Date.now()-t)/DAY)))+' روز';
  const when=' <small>(قیمت '+esc(ageTxt(r.close.t))+')</small>';
  if(r.tAct){const v=audR(r,i,'tp1');
    return '<div class="ar2 arnow">الان <b dir="ltr">'+fmtPrice(r.close.px)+'</b>'+(v!=null?' <b class="'+cls(v)+'" dir="ltr">'+fmtR(v)+'</b>':'')+when+
      ' · '+age(r.tAct)+' از ورود (سقف '+faN(R.days)+' روز)</div>';}
  const d=i.entry?Math.abs(r.close.px-i.entry)/i.entry*100:null;
  return '<div class="ar2 arnow">منتظر ورود · قیمت <b dir="ltr">'+fmtPrice(r.close.px)+'</b>'+(d!=null?' ('+fmtNum(d)+'٪ تا ورود)':'')+when+
    ' · '+age(i.t0)+' از انتشار (مهلت '+faN(R.entryDays)+' روز)</div>';
}
/* خلاصه‌ی «در جریان»: چندتا در سود، چندتا در ضرر، چندتا منتظر ورود، و آخرین سنجش */
function audOpenSumHtml(rows){
  const O=rows.filter(x=>x.r&&x.r.st==='open');if(!O.length)return '';
  const act=O.filter(x=>x.r.tAct),w=O.length-act.length,R=act.map(x=>audR(x.r,x.inp,'tp1')).filter(v=>v!=null);
  const up=R.filter(v=>v>0).length,days=act.map(x=>(Date.now()-x.r.tAct)/DAY),avgD=days.length?days.reduce((a,b)=>a+b,0)/days.length:0;
  const old=Math.min(...O.map(x=>x.r.at||Date.now()));
  return ic('info')+'<span><b>'+faN(O.length)+' در جریان:</b> '+faN(act.length)+' وارد شده'+(act.length?' ('+faN(up)+' در سود، '+faN(R.length-up)+' در ضرر، میانگین '+fmtNum(avgD)+' روز از ورود)':'')+
    (w?' · '+faN(w)+' منتظر ورود':'')+'. «در جریان» یعنی ورود فعال شده ولی هنوز نه تارگت اول خورده نه استاپ، و '+faN(audRules().days)+' روز هم نگذشته؛ '+
    'سیگنال‌های این کانال استاپ و تارگت دور دارند، برای همین طول می‌کشد. قیمت‌ها مال آخرین سنجش‌اند (قدیمی‌ترین '+esc(ageTxt(old))+')؛ '+
    'با «سنجیدن تازه‌ها و در جریان‌ها» به‌روز می‌شوند و هر بار چندتایی به برد یا باخت می‌رسند — برای همین کارنامه بعد از هر سنجش عوض می‌شود.</span>';
}
function buildAudList(rows){
  const c=el('div','panel');
  c.appendChild(el('div','panelhead','<b>همه‌ی سیگنال‌ها</b>'));
  const cnt={all:rows.length};
  for(const x of rows){const k=audStKey(x.r);cnt[k]=(cnt[k]||0)+1;}
  const chips=el('div','catrow');
  for(const [k,l] of [['all','همه'],['win','برد'],['loss','باخت'],['none','فعال نشد'],['open','در جریان'],['bad','نیاز به بررسی']]){
    const n=k==='open'?(cnt.open||0)+(cnt.wait||0):k==='bad'?(cnt.bad||0)+(cnt.amb||0)+(cnt.todo||0):(cnt[k]||0);
    const b=el('button','catchip'+(audList===k?' on':''),l+' <i>'+faN(n)+'</i>');
    b.onclick=()=>{audList=k;audShown=40;renderAudit();};
    chips.appendChild(b);
  }
  c.appendChild(chips);
  const FQ=audFixQ(rows), fqAt=new Map();FQ.forEach((q,i)=>{for(const id of q.rows)fqAt.set(id,i);});
  if(audList==='bad'&&FQ.length){
    const r=el('div','srow');
    const g=el('button','btn sm pri',ic('edit')+'<span>مرور یکی‌یکی ('+faN(FQ.length)+')</span>');g.onclick=()=>sheetAudFix(FQ,0);
    const k=el('button','btn sm side',ic('box')+'<span>کنار گذاشتن همه</span>');
    k.onclick=async()=>{const ids=FQ.flatMap(q=>[q.id,...q.rows]);
      if(!(await askConfirm({title:'کنار گذاشتن '+faN(FQ.length)+' مورد',msg:'همه‌ی سیگنال‌های ناقصی که عددشان را نزده‌ای از سنجش کانال بیرون می‌روند (در فهرست سیگنال‌ها می‌مانند). هر وقت خواستی از «وضعیت سنجش › برگرداندن همه» برمی‌گردند.',ok:'کنار بگذار',cancel:'نه'})))return;
      audSkip(ids);};
    r.appendChild(g);r.appendChild(k);c.appendChild(r);
  }
  if(audList==='open'){const h=audOpenSumHtml(rows);if(h)c.appendChild(el('div','stnote audopen',h));}
  const pick=rows.filter(x=>{
    const k=audStKey(x.r);
    return audList==='all'||k===audList||(audList==='open'&&k==='wait')||(audList==='bad'&&(k==='amb'||k==='todo'));
  }).sort((a,b)=>(b.inp.t0||0)-(a.inp.t0||0));
  const cmap=new Map();
  for(const x of claimsAll())if(x.tg){const a=cmap.get(x.tg.p.id)||[];a.push(x);cmap.set(x.tg.p.id,a);}
  for(const x of pick.slice(0,audShown)){
    const i=x.inp, k=audStKey(x.r), S0=AUD_ST[k];
    const r=el('div','arow2');
    const tags=[];
    if(x.r&&x.r.late)tags.push('<span class="pill lose">دیرهنگام</span>');
    else if(x.r&&x.r.chase)tags.push('<span class="pill mut">ورود دیر</span>');
    if(DB.edits[x.p.id]&&DB.edits[x.p.id].nums)tags.push('<span class="pill lose">ویرایش‌شده</span>');
    if(DB.gone[x.p.id])tags.push('<span class="pill lose">حذف‌شده</span>');
    for(const cl of (cmap.get(x.p.id)||[]))
      tags.push('<span class="pill '+(cl.vd.v==='ok'?'win':cl.vd.v==='no'?'lose':'mut')+'">ادعا '+(cl.vd.v==='ok'?'✓':cl.vd.v==='no'?'✗':'؟')+'</span>');
    if(i.tpAssumed)tags.push('<span class="pill mut">تارگت فرضی</span>');
    if(i.old)tags.push('<span class="pill gold" title="از تاریخ اصلی سنجیده شده؛ پست، یادآوری بود">از یادآوری</span>');
    r.innerHTML='<div class="ar1"><b class="tick">'+esc(i.tk||'—')+'</b>'+
      '<span class="pill '+i.dir+'">'+(i.dir==='long'?'لانگ':'شورت')+'</span>'+
      '<span class="pill '+S0[1]+'">'+S0[0]+(x.R!=null&&k!=='open'?' '+fmtR(x.R):'')+'</span>'+
      '<span class="when">'+(i.t0?jStampFa(new Date(i.t0)):'')+'</span></div>'+
      '<div class="ar2">ورود '+(i.entry?fmtPrice(i.entry):'—')+(i.e1?' <small>(قیمت بازار؛ کانال '+fmtPrice(i.e1)+')</small>':'')+' · استاپ '+(i.stop?fmtPrice(i.stop):'—')+
        (stopPctOf(i)!=null&&i.mkt!=='spot'?' ('+fmtNum(stopPctOf(i))+'٪ · ایزوله تا '+faN(isoLev(stopPctOf(i)))+'x)':'')+
      ' · تارگت '+(i.tps.length?i.tps.slice(0,3).map(fmtPrice).join('، '):'—')+'</div>'+
      (k==='bad'&&x.r?'<div class="ar2 bad">'+esc(AUD_WHY[x.r.why]||'')+
        (()=>{const q=audPxKind(x);return q?' · قیمت هنگام پست <bdi dir="ltr">'+fmtPrice(q.px0)+'</bdi>'+(q.old?' — <b>احتمالاً یادآوری سیگنال قدیمی</b>':''):'';})()+'</div>':'')+
      audNowHtml(x)+
      (tags.length?'<div class="ar3">'+tags.join('')+'</div>':'');
    const act=el('div','ar4');
    const d=el('button','btn xs','جزئیات');d.onclick=()=>sheetAudPost(x.p);
    // تصویر پست همین‌جا، برای اصلاح بی رفتن به جای دیگر (فقط با زدن بار می‌شود)
    if(x.p.img){const im=el('button','btn xs',ic('image')+'<span>تصویر</span>');im.setAttribute('aria-expanded','false');
      im.onclick=()=>{let b=r.querySelector('.arimg');
        if(b){b.remove();im.setAttribute('aria-expanded','false');im.classList.remove('on');return;}
        b=el('div','arimg');b.appendChild(postShot(x.p,x.p.img,'تصویر پست'));
        if(x.p.text)b.appendChild(el('div','audtxt',esc(String(x.p.origText||x.p.text).slice(0,500))));
        r.insertBefore(b,act);im.setAttribute('aria-expanded','true');im.classList.add('on');};
      act.appendChild(im);}
    const qi=fqAt.get(x.p.id);
    const f=qi!=null?el('button','btn xs ok','عدد بزن'):el('button','btn xs','اصلاح عددها');
    f.onclick=qi!=null?()=>sheetAudFix(FQ,qi):()=>sheetMarkSignal(x.p,sigOf(x.p));
    const ns=el('button','btn xs','سیگنال نیست');ns.title='چارت یا پست غیرسیگنال؛ از سیگنال‌ها و سنجش بیرون برود';ns.onclick=()=>audNotSig(x.p);
    act.appendChild(d);act.appendChild(f);act.appendChild(ns);r.appendChild(act);
    c.appendChild(r);
  }
  if(pick.length>audShown){
    const m=el('button','showmore','نمایش '+faN(Math.min(40,pick.length-audShown))+' مورد بیشتر <span>از '+faN(pick.length)+'</span>');
    m.onclick=()=>{audShown+=40;renderAudit();};
    c.appendChild(m);
  }else if(!pick.length)c.appendChild(el('div','hint','چیزی در این دسته نیست.'));
  return c;
}

/* جزئیاتِ یک سیگنال: خط زمانیِ واقعی، ادعاهای کانال درباره‌اش، و ویرایش‌ها */
function sheetAudPost(p){
  const inp=audInput(p)||{};
  const R=audRules(), a=AUD[p.id], r=a&&inp.tk&&a.k===audKey(inp,R)?a:null;
  const T=(t,l,c)=>'<li class="'+(c||'')+'">'+(t?'<time>'+jStampFa(new Date(t))+'</time>':'')+l+'</li>';
  let tl='';
  if(inp.t0)tl+=T(inp.t0,'منتشر شد'+(r&&r.px0?' — قیمت بازار '+fmtPrice(r.px0):''));
  if(r){
    if(r.mode)tl+=T(null,'نوع ورود: '+MODE_FA[r.mode]);
    if(r.tAct)tl+=T(r.tAct,'ورود فعال شد روی '+fmtPrice(inp.entry));
    (r.tTp||[]).forEach((t,i)=>{if(t!=null)tl+=T(t,'تارگت '+faN(i+1)+' ('+fmtPrice(inp.tps[i])+')','add');});
    if(r.tBE)tl+=T(r.tBE,'برگشت به نقطه‌ی ورود');
    if(r.tStop)tl+=T(r.tStop,'استاپ خورد ('+fmtPrice(inp.stop)+')','cut');
    if(r.st==='none')tl+=T(r.tEnd,AUD_NONE[r.why]||'فعال نشد');
    if(r.st==='exp'&&r.close)tl+=T(r.close.t,'مهلت تمام شد روی '+fmtPrice(r.close.px));
    if(r.st==='bad')tl+=T(null,AUD_WHY[r.why]||'قابل سنجش نیست','cut');
    if(r.st==='amb')tl+=T(null,'ترتیب رویدادها حتی با کندل یک‌دقیقه‌ای معلوم نشد');
  }else tl+=T(null,'هنوز سنجیده نشده');
  const k=audStKey(r), S0=AUD_ST[k];
  const r1=r?audR(r,inp,'tp1'):null, r2=r?audR(r,inp,'ladder'):null;
  const claims=claimsAll().filter(x=>x.tg&&x.tg.p.id===p.id);
  const ed=DB.edits[p.id];
  openSheet(
   '<h3>'+esc(inp.tk||'سیگنال')+' · <span class="pill '+S0[1]+'">'+S0[0]+'</span></h3>'+
   '<div class="kv">'+
     '<div class="k"><b>ورود</b><span>'+(inp.entry?fmtPrice(inp.entry):'—')+(inp.mktE?' (قیمت بازار هنگام انتشار)':inp.e1?' (قیمت بازار هنگام انتشار؛ عدد کانال '+fmtPrice(inp.e1)+')':'')+'</span></div>'+
     '<div class="k"><b>استاپ</b><span>'+(inp.stop?fmtPrice(inp.stop):'—')+
       (inp.inh?' (از سیگنال قبلی '+esc(inp.tk)+'، '+jStampFa(new Date(inp.inh.t))+')':'')+'</span></div>'+
     '<div class="k"><b>تارگت‌ها</b><span>'+(inp.tps&&inp.tps.length?inp.tps.map(fmtPrice).join('، '):'—')+
       (inp.tpAssumed?' (فرضی)':'')+'</span></div>'+
     '<div class="k"><b>همه در تارگت اول</b><span class="'+(r1==null?'m':cls(r1))+'">'+(r1==null?'—':fmtR(r1))+'</span></div>'+
     '<div class="k"><b>پله‌ای</b><span class="'+(r2==null?'m':cls(r2))+'">'+(r2==null?'—':fmtR(r2))+'</span></div>'+
   '</div>'+
   '<div class="sechd">خط زمانیِ واقعی</div><ol class="audtl">'+tl+'</ol>'+
   (claims.length?'<div class="sechd">ادعاهای کانال درباره‌ی این سیگنال</div>'+
     claims.map(x=>'<div class="flag '+(x.vd.v==='ok'?'u':x.vd.v==='no'?'d':'i')+'"><i>'+
       (x.vd.v==='ok'?'✓':x.vd.v==='no'?'✕':'?')+'</i><span><b>'+esc((x.p.text||'').slice(0,80))+'</b><br>'+
       esc(x.vd.why)+(x.p.date?' · پست: '+jStampFa(x.p.date):'')+'</span></div>').join(''):'')+
   (ed?'<div class="sechd">کانال این پست را ویرایش کرده'+(ed.nums?' — عددها عوض شد':'')+'</div>'+
     '<div class="kv"><div class="k"><b>نسخه‌ی اول (ملاکِ سنجش)</b><span class="atxt">'+esc(ed.old)+'</span></div>'+
     '<div class="k"><b>الان</b><span class="atxt">'+esc(ed.now)+'</span></div></div>':'')+
   (DB.gone[p.id]?'<div class="flag d"><i>!</i><span>این پست دیگر در کانال نیست ('+jStampFa(new Date(DB.gone[p.id].at))+
     ' متوجه شدیم). متن بالا نسخه‌ای است که برنامه پیش از حذف دیده بود.</span></div>':'')+
   '<div class="sechd">متن پست</div><div class="audtxt">'+esc(p.origText||p.text||'')+'</div>'+
   '<div class="srow"><button class="btn" id="fx">اصلاح عددها</button><button class="btn" id="cx">بستن</button></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#fx').onclick=()=>{closeSheet();setTimeout(()=>sheetMarkSignal(p,sigOf(p)),260);};
   });
}
/* تحمل ورود و نوع پر شدن با یک زدن؛ سنجش همان لحظه با قانون تازه شروع می‌شود */
function audSetEntry(tol,fill){
  S.aud=Object.assign({},audRules(),{tol,fill});DB.settings=Object.assign({},S);save();SETVER++;
  AUDQ.on=false;audRun(false,false,true);renderAll();
  toast('ورود: تحمل '+faN(tol)+'٪ با '+(fill==='mkt'?'قیمت بازار همان لحظه':'عدد کانال')+' — سنجش دوباره شروع شد','ok');
}
function sheetAudRules(){
  const R=audRules();
  openSheet(
   '<h3>قانون‌های کانال‌سنج</h3>'+
   '<div class="sub">این‌ها تعیین می‌کنند یک سیگنال کِی «برد»، «باخت» یا «فعال نشد» حساب شود. '+
   'عوض کردن سه مورد اول سنجش را از نو انجام می‌دهد؛ قانون امتیازدهی فوری است.</div>'+
   '<div class="grid">'+
     fldHtml('ed','مهلت فعال شدنِ ورود (روز)',R.entryDays)+
     fldHtml('dd','مهلت رسیدن به نتیجه (روز)',R.days)+
     fldHtml('tl','تحمل ورود (٪)',R.tol)+
     '<div class="fld"><label>در محدوده‌ی تحمل، ورود با</label><select id="f_fl">'+
       '<option value="sig"'+(R.fill!=='mkt'?' selected':'')+'>عدد اعلامی کانال</option>'+
       '<option value="mkt"'+(R.fill==='mkt'?' selected':'')+'>قیمت بازار همان لحظه</option></select></div>'+
     '<div class="fld"><label>امتیازدهی</label><select id="f_rl">'+
       '<option value="tp1"'+(R.rule==='tp1'?' selected':'')+'>همه در تارگت اول</option>'+
       '<option value="ladder"'+(R.rule==='ladder'?' selected':'')+'>پله‌ای، استاپ به ورود بعد از تارگت اول</option></select></div>'+
   '</div>'+
   '<div class="hint">«تحمل ورود» یعنی اگر قیمتِ لحظه‌ی انتشار تا این اندازه با عددِ ورود فاصله داشت، ورود همان لحظه فعال حساب شود. '+
   'بیشتر از آن، منتظر برگشت یا شکستنِ همان عدد می‌مانیم. «قیمت بازار همان لحظه» یعنی همان قیمتی که واقعاً می‌شد گرفت '+
   '(R واقعی‌تر)؛ «عدد اعلامی کانال» کمی به نفع کانال است.<br>R ناخالص است: کارمزد و لغزش در آن نیست.</div>'+
   '<div class="srow"><button class="btn sm ok" id="pr3">'+ic('check')+'<span>ورود به‌موقع: تحمل 3٪ با قیمت بازار (پیشنهادی)</span></button>'+
     '<button class="btn sm" id="pr2"><span>تحمل 2٪ با عدد کانال</span></button>'+
     '<button class="btn sm side" id="pr0"><span>پیش‌فرض (1٪)</span></button></div>'+
   '<div class="srow"><button class="btn pri" id="ok">ذخیره</button><button class="btn" id="cx">انصراف</button></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#pr3').onclick=()=>{closeSheet();audSetEntry(3,'mkt');};
     $('#pr2').onclick=()=>{closeSheet();audSetEntry(2,'sig');};
     $('#pr0').onclick=()=>{closeSheet();audSetEntry(1,'sig');};
     $('#ok').onclick=()=>{
       const n=(id,lo,hi,dv)=>{const v=parseFloat(normDig($('#'+id).value));return isFinite(v)?clamp(v,lo,hi):dv;};
       S.aud={entryDays:n('f_ed',0.1,30,3),days:n('f_dd',1,180,30),tol:n('f_tl',0,20,1),rule:$('#f_rl').value,fill:$('#f_fl').value};
       DB.settings=Object.assign({},S);save();SETVER++;
       closeSheet();AUDQ.at=0;renderAll();toast('قانون‌ها ذخیره شد','ok');
     };
   });
}

