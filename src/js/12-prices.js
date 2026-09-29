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
function applyPrices(m,srcName,route,ms){
  FLASH.clear();
  for(const [k,v] of m){const o=PRICES.get(k);if(o!=null&&o!==v)FLASH.set(k,v>o?'u':'d');}
  FLASH_AT=Date.now();
  const symChanged=m.size!==SYMBOLS.size;
  PRICES=m;SYMBOLS=new Set(m.keys());priceSrc=srcName;PX_AT=Date.now();
  if(symChanged)SYMVER++;
  Object.assign(H.px,{state:'ok',src:srcName,route,ms,at:PX_AT,n:m.size,err:null});
  savePxCache();
  let did=false;
  try{did=checkAutoExec();}catch(e){logIt('err','اجرای خودکار: '+e.message);}
  try{if(!did)checkAlerts();checkPending();}catch(e){}
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
          applyPrices(m,s.n,got.route,got.ms);
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

