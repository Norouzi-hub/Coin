/* ==================== قیمت ==================== */
const PRICE_SRC=[
  {n:'Binance',u:'https://api.binance.com/api/v3/ticker/price',p:d=>d.map(x=>[x.symbol,parseFloat(x.price)])},
  {n:'MEXC',u:'https://api.mexc.com/api/v3/ticker/price',p:d=>d.map(x=>[x.symbol,parseFloat(x.price)])},
  {n:'Gate',u:'https://api.gateio.ws/api/v4/spot/tickers',p:d=>d.map(x=>[x.currency_pair.replace('_',''),parseFloat(x.last)])},
  {n:'OKX',u:'https://www.okx.com/api/v5/market/tickers?instType=SPOT',p:d=>(d.data||[]).map(x=>[x.instId.replace('-',''),parseFloat(x.last)])},
  {n:'KuCoin',u:'https://api.kucoin.com/api/v1/market/allTickers',p:d=>((d.data||{}).ticker||[]).map(x=>[String(x.symbol).replace('-',''),parseFloat(x.last)])},
  {n:'Bitget',u:'https://api.bitget.com/api/v2/spot/market/tickers',p:d=>(d.data||[]).map(x=>[x.symbol,parseFloat(x.lastPr)])}
];
const okRows=d=>{try{return Array.isArray(d)?d.length>20:(!!d&&typeof d==='object');}catch(e){return false;}};
let PX_LOADING=null;
const PX_TTL=20000;                        // قیمت تازه‌تر از 20 ثانیه دوباره گرفته نمی‌شود
const FLASH=new Map(); let FLASH_AT=0;     // جهت آخرین تغییر هر نماد، برای چشمک سبز/قرمز
const flashOf=t=>(t&&Date.now()-FLASH_AT<4000&&FLASH.get(t))||'';
function applyPrices(m,srcName,route,ms,extra){
  FLASH.clear();
  for(const [k,v] of m){const o=PRICES.get(k);if(o!=null&&o!==v)FLASH.set(k,v>o?'u':'d');}
  FLASH_AT=Date.now();
  // سپر دوم: اگر مارک پرایس فیوچرز (تازه) بیش از 20٪ با قیمت اسپات فرق دارد، قیمت اسپات یخ‌زده است
  if(MARK_AT&&Date.now()-MARK_AT<5*60e3)for(const [k,v] of m){const mk=MARK.get(k);
    if(mk>0&&Math.abs(v/mk-1)>0.2){m.set(k,mk);if(!PXBAD.has(k)){PXBAD.add(k);logIt('warn','قیمت '+k+' از '+srcName+' ('+v+') با مارک پرایس ('+mk+') جور نبود؛ مارک به کار رفت');}}}
  const syms=new Set(m.keys());if(extra)for(const k of extra)syms.add(k);
  const symChanged=syms.size!==SYMBOLS.size;
  PRICES=m;SYMBOLS=syms;priceSrc=srcName;PX_AT=Date.now();
  if(symChanged)SYMVER++;
  Object.assign(H.px,{state:'ok',src:srcName,route,ms,at:PX_AT,n:m.size,err:null});
  savePxCache();
  let did=false;
  try{did=checkAutoExec();}catch(e){logIt('err','اجرای خودکار: '+e.message);}
  try{if(!did)checkAlerts();checkPending();}catch(e){}
  try{rbCheck();}catch(e){}
}
/* ---- نمادهای مرده‌ی بایننس ----
   ارزی که بایننس از بازار اسپات حذف کرده (مثل XMR در 2024) هنوز با آخرین قیمتِ یخ‌زده‌اش در
   ticker/price می‌آید؛ ورود با آن قیمت ثبت می‌شد و مارک پرایسِ واقعی بلافاصله از هدف رد بود.
   هر 6 ساعت فهرستشان از ticker/24hr (بی معامله در 24 ساعت) گرفته می‌شود؛ قیمتشان از بایننس کنار
   می‌رود و برای نمادهایی که لازم داریم از صرافی دیگر (تکی) گرفته می‌شود. نماد در فهرست نمادها می‌ماند. */
const PXDKEY='signaldesk.pxdead.v1', PXBAD=new Set(), PXFILL=new Map(), PXOTHER=new Set();
let PXDEAD=lsGet(PXDKEY)||{at:0,list:[]}, PXDBUSY=null;
async function pxDeadLoad(){
  if(PXDEAD.at&&Date.now()-PXDEAD.at<6*36e5)return PXDEAD;
  if(PXDBUSY)return PXDBUSY;
  PXDBUSY=(async()=>{
    try{const got=await fetchVia('https://api.binance.com/api/v3/ticker/24hr?type=MINI',{json:true,timeout:15000,kind:'px',quiet:true,
        label:'نمادهای حذف‌شده‌ی بایننس',validate:d=>Array.isArray(d)&&d.length>100});
      const now=Date.now(),L=[];
      for(const x of got.data){if(!/USDT$/.test(x.symbol))continue;const ct=+x.closeTime||0;
        if((x.count!=null&&+x.count===0)||(ct&&now-ct>864e5))L.push(x.symbol.slice(0,-4));}
      PXDEAD={at:now,list:L};lsSet(PXDKEY,PXDEAD);}
    catch(e){PXDEAD=Object.assign({},PXDEAD,{at:Date.now()-5*36e5});}   // یک ساعت بعد دوباره
    return PXDEAD;
  })();
  try{return await PXDBUSY;}finally{PXDBUSY=null;}
}
/* نمادهایی که قیمتشان واقعاً لازم است: پوزیشن‌ها، منتظرها، آزمایشی‌ها، رادار و سیگنال‌های 3 روز اخیر */
function pxNeed(){
  const s=new Set();
  try{for(const p of DB.positions)if(p.status==='open'&&p.ticker)s.add(p.ticker);}catch(e){}
  try{for(const w of DB.pending)if(w.ticker)s.add(w.ticker);}catch(e){}
  try{for(const it of RB.items)if(it.st==='open')s.add(it.tk);for(const it of rbPend())s.add(it.tk);for(const t of RD.rank)s.add(t);}catch(e){}
  try{const cut=Date.now()-3*864e5;for(const p of POSTS)if(p.date&&+p.date>=cut){const g=sigOf(p);if(g&&g.ticker)s.add(g.ticker);}}catch(e){}
  return s;
}
const PX_ONE=[
  [t=>'https://api.mexc.com/api/v3/ticker/price?symbol='+t+'USDT',d=>+d.price],
  [t=>'https://api.gateio.ws/api/v4/spot/tickers?currency_pair='+t+'_USDT',d=>Array.isArray(d)&&d[0]?+d[0].last:NaN],
  [t=>'https://api.kucoin.com/api/v1/market/orderbook/level1?symbol='+t+'-USDT',d=>d&&d.data?+d.data.price:NaN],
  [t=>'https://api.bitget.com/api/v2/spot/market/tickers?symbol='+t+'USDT',d=>d&&Array.isArray(d.data)&&d.data[0]?+d.data[0].lastPr:NaN],
  [t=>'https://www.okx.com/api/v5/market/ticker?instId='+t+'-USDT',d=>d&&Array.isArray(d.data)&&d.data[0]?+d.data[0].last:NaN],
  [t=>'https://fapi.binance.com/fapi/v1/premiumIndex?symbol='+t+'USDT',d=>+d.markPrice]];
async function pxOne(t){
  // پیدانشده: تا 10 دقیقه دوباره امتحان نمی‌شود
  const c=PXFILL.get(t);if(c&&Date.now()-c.at<(c.px?PX_TTL:10*60000))return c.px;
  for(const [u,p] of PX_ONE){try{const got=await fetchVia(u(t),{json:true,timeout:7000,kind:'px',quiet:true,minLen:12,label:'قیمت '+t,validate:d=>p(d)>0});
    const px=p(got.data);if(px>0){PXFILL.set(t,{px,at:Date.now()});return px;}}catch(e){}}
  PXFILL.set(t,{px:null,at:Date.now()});return null;
}
/* قیمت‌های صرافی اصلی، بی نمادهای مرده‌ی بایننس؛ هر نماد لازمی که در فهرست نیست (مرده، یا ارزی مثل
   ZIG که اصلاً در آن صرافی نیست) تکی از صرافی‌های دیگر پر می‌شود */
async function pxFix(m,src){
  let dead=[];
  if(src==='Binance'){
    if(!PXDEAD.at)await Promise.race([pxDeadLoad(),new Promise(r=>setTimeout(r,5000))]);
    else if(Date.now()-PXDEAD.at>6*36e5)pxDeadLoad();
    dead=(PXDEAD.list||[]).filter(k=>m.has(k));for(const k of dead)m.delete(k);
  }
  const todo=[...pxNeed()].filter(k=>/^[A-Z0-9]{2,15}$/.test(k)&&!m.has(k)).slice(0,12);
  const got=await Promise.all(todo.map(k=>pxOne(k).catch(()=>null)));
  todo.forEach((k,i)=>{if(got[i]>0){m.set(k,got[i]);PXOTHER.add(k);}});
  return dead;
}
/* ---- مارک پرایس فیوچرز ---- */
/* قیمت اصلی از بازار اسپات می‌آید، ولی صرافی استاپ فیوچرز را با «مارک پرایس» اجرا می‌کند؛ در
   نوسان تند این دو چند دهم درصد فرق دارند. فقط وقتی پوزیشن فیوچرز باز داری گرفته می‌شود. */
let MARK=new Map(), MARK_AT=0, MARK_LOADING=null;
const MARK_SRC=[
  {n:'Binance فیوچرز',u:'https://fapi.binance.com/fapi/v1/premiumIndex',
   p:d=>Array.isArray(d)?d.map(x=>[x.symbol,parseFloat(x.markPrice)]):[]},
  {n:'OKX سواپ',u:'https://www.okx.com/api/v5/public/mark-price?instType=SWAP',
   p:d=>((d&&d.data)||[]).filter(x=>/-USDT-SWAP$/.test(x.instId)).map(x=>[x.instId.replace('-USDT-SWAP','USDT'),parseFloat(x.markPx)])}
];
function markRows(rows){
  const m=new Map();
  for(const [sym,px] of rows){
    if(!sym||!isFinite(px)||px<=0||!sym.endsWith('USDT'))continue;
    let b=sym.slice(0,-4), k=1;
    // 1000PEPE روی فیوچرز = هزار تا PEPE
    const mm=b.match(/^(1000000|100000|10000|1000|1M)([A-Z0-9]+)$/);
    if(mm){k=mm[1]==='1M'?1e6:+mm[1];b=mm[2];}
    if(!m.has(b)||k===1)m.set(b,px/k);
  }
  return m;
}
const needMark=()=>DB.positions.some(p=>p.status==='open'&&p.kind!=='spot');
async function loadMarks(){
  if(!needMark())return false;
  if(MARK_LOADING)return MARK_LOADING;
  if(MARK_AT&&Date.now()-MARK_AT<PX_TTL)return true;
  MARK_LOADING=(async()=>{
    for(const s of MARK_SRC){
      try{
        const got=await fetchVia(s.u,{json:true,timeout:7000,kind:'px',label:'مارک پرایس از '+s.n,
          validate:d=>s.p(d).length>20});
        const m=markRows(s.p(got.data));
        if(m.size<20)continue;
        MARK=m;MARK_AT=Date.now();H.px.mark=s.n;
        return true;
      }catch(e){}
    }
    H.px.mark=null;return false;
  })();
  try{return await MARK_LOADING;}finally{MARK_LOADING=null;}
}
/* مارک دیرتر از قیمت اسپات رسید: همان بررسی‌ها دوباره با قیمت درست */
function onMarks(){
  let did=false;
  try{did=checkAutoExec();}catch(e){}
  try{if(!did)checkAlerts();}catch(e){}
  if(!did&&!$('#vPositions').classList.contains('hide'))renderPositions();
}
function rowsToMap(rows){
  const m=new Map();
  for(const [sym,px] of rows){
    if(!sym||!isFinite(px)||px<=0||!sym.endsWith('USDT'))continue;
    const b=sym.slice(0,-4); if(b)m.set(b,px);
  }
  return m;
}
async function loadPrices(force){
  if(!force&&PX_AT&&Date.now()-PX_AT<PX_TTL&&PRICES.size)return true;
  if(PX_LOADING)return PX_LOADING;
  PX_LOADING=(async()=>{
    H.px.state='busy';renderHealth();
    const markP=loadMarks().catch(()=>false);
    // مرحله‌ی اول بدون واسط: صرافی‌ها خودشان CORS می‌دهند، پس واسط الکی شلوغ نمی‌شود
    for(const only of [['custom','direct'],null]){
      // مرحله‌ی دوم (با واسط) فقط روی چند صرافی اول، وگرنه انتظار طولانی می‌شود
      for(const s of (only?PRICE_SRC:PRICE_SRC.slice(0,3))){
        try{
          const got=await fetchVia(s.u,{json:true,validate:okRows,timeout:8000,
            label:'قیمت از '+s.n,onlyRoutes:only,kind:'px'});
          const m=rowsToMap(s.p(got.data)||[]);
          if(m.size<30){logIt('warn','قیمت از '+s.n+' کم بود ('+faN(m.size)+' نماد)',{route:got.route});continue;}
          // مارک همان موقع شروع شده؛ اگر زود رسید با قیمت اسپات یک‌جا بررسی می‌شود
          await Promise.race([markP,new Promise(r=>setTimeout(r,1500))]);
          const late=!MARK_AT||Date.now()-MARK_AT>PX_TTL;
          let dead=null;try{dead=await pxFix(m,s.n);}catch(e){}
          applyPrices(m,s.n,got.route,got.ms,dead);
          if(late)markP.then(ok=>{if(ok)onMarks();});
          return true;
        }catch(e){}
      }
      if(only)logIt('info','قیمت بدون واسط نیامد؛ با واسط‌ها امتحان می‌شود');
    }
    Object.assign(H.px,{state:PRICES.size?'stale':'err',
      err:'هیچ‌کدام از صرافی‌ها جواب ندادند. اگر ایران هستی، این APIها معمولاً IP ایران را رد می‌کنند؛ با فیلترشکن دوباره امتحان کن.'});
    logIt('err','قیمت از هیچ صرافی‌ای نیامد');
    return false;
  })();
  try{return await PX_LOADING;}finally{PX_LOADING=null;renderHealth();}
}

