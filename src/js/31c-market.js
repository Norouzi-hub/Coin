/* ==================== حال بازار و رویدادهای هر ارز ====================
   از صفحه‌ی «سیگنال ارز دیجیتال» تبدیل الهام گرفته، ولی همه از داده‌ی خود صرافی‌ها (همان منبع‌های قیمت):
   1) حال بازار: چند ارز در 24 ساعت مثبت و چند منفی، پخش درصد تغییرها، و تغییر بیت‌کوین
   2) رویدادهای هر ارز روی کارت سیگنال: شکست کف/سقف 7 و 30 روزه، تقاطع MA20/50 (4 ساعته)،
      رشد/ریزش ناگهانی؛ اگر خلاف جهتِ سیگنال است، هشدار
   3) کانال‌سنج: لانگ‌ها و شورت‌های کانال در روزهای صعودی، خنثی و نزولیِ بیت‌کوین */

/* ---- ۱) حال بازار ---- */
const MKKEY='signaldesk.mkt.v1', MK_TTL=15*60000;
let MKT=lsGet(MKKEY)||null, MKBUSY=null, MKTRY=0;
const MK_STABLE=/^(USDC|FDUSD|TUSD|DAI|BUSD|USDP|USDD|USDE|PYUSD|EUR|EURI|AEUR|GBP|TRY|BRL|USD1|XUSD|UST|USTC|PAXG|WBTC|WBETH|BFUSD)$/;
const MK_LEV=/(UP|DOWN|BULL|BEAR|[2-5][LS])$/;
const MK_SRC=[
  {n:'Binance',u:'https://api.binance.com/api/v3/ticker/24hr?type=MINI',
   p:d=>Array.isArray(d)?d.map(x=>[x.symbol,+x.openPrice>0?(+x.lastPrice/+x.openPrice-1)*100:null,+x.quoteVolume]):[]},
  {n:'OKX',u:'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
   p:d=>(d.data||[]).map(x=>[x.instId.replace('-',''),+x.open24h>0?(+x.last/+x.open24h-1)*100:null,+x.volCcy24h])},
  {n:'Gate',u:'https://api.gateio.ws/api/v4/spot/tickers',
   p:d=>Array.isArray(d)?d.map(x=>[String(x.currency_pair).replace('_',''),+x.change_percentage,+x.quote_volume]):[]},
  {n:'KuCoin',u:'https://api.kucoin.com/api/v1/market/allTickers',
   p:d=>((d.data||{}).ticker||[]).map(x=>[String(x.symbol).replace('-',''),+x.changeRate*100,+x.volValue])},
  {n:'Bitget',u:'https://api.bitget.com/api/v2/spot/market/tickers',
   p:d=>(d.data||[]).map(x=>[x.symbol,+x.change24h*100,+x.usdtVolume])}
];
const MK_BINS=[-Infinity,-10,-7,-5,-3,-1,1,3,5,7,10,Infinity];
const MK_BIN_FA=['<−10٪','−10…−7','−7…−5','−5…−3','−3…−1','≈0','1…3','3…5','5…7','7…10','>10٪'];
/* تابع خالص: ردیف‌های [نماد، درصد ۲۴ساعته، حجم دلاری] ← خلاصه‌ی بازار */
function mkSummarize(rows){
  const bins=new Array(MK_BIN_FA.length).fill(0);
  let n=0,up=0,down=0,btc=null;const all=[], vols=[];
  for(const [sym,pct,vol] of rows){
    if(!/USDT$/.test(sym)||pct==null||!isFinite(pct))continue;
    const base=sym.slice(0,-4);
    if(!base||MK_STABLE.test(base)||MK_LEV.test(base))continue;
    if(base==='BTC')btc=pct;
    if(vol!=null&&isFinite(vol)&&vol<20000)continue;            // بازار مرده (حجم ۲۴ ساعت زیر ۲۰ هزار دلار)
    n++;all.push(pct);if(vol!=null&&isFinite(vol))vols.push([base,vol]);
    if(pct>0.3)up++;else if(pct<-0.3)down++;
    for(let i=0;i<bins.length;i++)if(pct>=MK_BINS[i]&&pct<MK_BINS[i+1]){bins[i]++;break;}
  }
  if(n<30)return null;
  all.sort((a,b)=>a-b);
  const med=all[all.length>>1], dn=down/n, upS=up/n;
  const reg=dn>=0.75?'bear2':dn>=0.6?'bear':upS>=0.75?'bull2':upS>=0.6?'bull':'flat';
  // پرحجم‌ترین‌ها: فهرست پشتیبان رادار وقتی ارزش بازار CoinGecko نیامد
  const top=vols.sort((a,b)=>b[1]-a[1]).slice(0,120).map(x=>x[0]);
  return {at:Date.now(),n,up,down,flat:n-up-down,med,btc,bins,reg,top};
}
const MK_REG_FA={bear2:'خیلی نزولی',bear:'نزولی',flat:'خنثی',bull:'صعودی',bull2:'خیلی صعودی'};
async function mktLoad(force){
  if(!force&&MKT&&Date.now()-MKT.at<MK_TTL)return MKT;
  if(MKBUSY)return MKBUSY;
  MKBUSY=(async()=>{
    for(const s of MK_SRC){
      try{
        const got=await fetchVia(s.u,{json:true,timeout:10000,kind:'px',quiet:true,label:'حال بازار از '+s.n,validate:okRows});
        const m=mkSummarize(s.p(got.data)||[]);
        if(!m)continue;
        m.src=s.n;MKT=m;lsSet(MKKEY,MKT);return MKT;
      }catch(e){}
    }
    return MKT;
  })();
  try{return await MKBUSY;}finally{MKBUSY=null;}
}
/* رژیم امروز برای مقایسه با کانال‌سنج: همان تعریف (تغییر ۲۴ ساعته‌ی بیت‌کوین) */
const regOfBtc=p=>p==null||!isFinite(p)?null:p<=-2?'bear':p>=2?'bull':'flat';
const REG_FA={bear:'نزولی',flat:'خنثی',bull:'صعودی'};
function mktHtml(m,dirs){
  if(!m)return '';
  const mx=Math.max(...m.bins)||1;
  const bars=m.bins.map((v,i)=>'<i class="'+(i<5?'d':i>5?'u':'m')+'" style="height:'+Math.max(2,Math.round(v/mx*26))+'px" title="'+MK_BIN_FA[i]+': '+faN(v)+'"></i>').join('');
  const pu=m.up/m.n*100, pd=m.down/m.n*100;
  let h='<div class="mkst"><div class="mkh"><b>'+ic('trend')+'حال بازار · '+MK_REG_FA[m.reg]+'</b><small>'+ageTxt(m.at)+'</small></div>'+
    '<div class="mkbars">'+bars+'</div>'+
    '<div class="mkline"><i class="u" style="width:'+pu.toFixed(1)+'%"></i><i class="m" style="width:'+(100-pu-pd).toFixed(1)+'%"></i><i class="d" style="width:'+pd.toFixed(1)+'%"></i></div>'+
    '<div class="mknum"><span class="u">صعودی '+faN(m.up)+'</span><span>میانه '+fmtPct(m.med)+(m.btc!=null?' · بیت‌کوین <b class="'+cls(m.btc)+'">'+fmtPct(m.btc)+'</b>':'')+'</span><span class="d">نزولی '+faN(m.down)+'</span></div>'+
    '<details class="mkwhy"><summary>این عددها یعنی چه؟</summary><div class="hint">'+faN(m.n)+' ارزِ بازار اسپات '+esc(m.src||'')+' (جفت تتری با حجم 24 ساعتِ بالای 20 هزار دلار؛ بی استیبل‌کوین و توکن اهرمی). '+
      'هر ارز با تغییر قیمتش در 24 ساعت گذشته شمرده شده: <b class="d">'+faN(m.down)+'</b> بیش از 0.3٪ ریخته‌اند، <b class="u">'+faN(m.up)+'</b> بیش از 0.3٪ رشد کرده‌اند و '+faN(m.flat)+' تقریباً بی‌تغییرند. '+
      'ستون‌ها از چپ: چند ارز بیش از 10٪ ریخته‌اند، 7 تا 10٪، 5 تا 7٪، 3 تا 5٪، 1 تا 3٪، تقریباً صفر، و همین‌طور تا رشد بیش از 10٪. «میانه» تغییرِ ارزِ وسطِ صف است. '+
      'نام حال بازار: بیش از 75٪ ارزها منفی = خیلی نزولی، 60٪ = نزولی (و برعکس برای صعودی)، وگرنه خنثی.</div></details>';
  return h+mktFlagsHtml(m,dirs)+'</div>';
}
/* هشدار وقتی بازار خلاف جهتِ سیگنال‌های قابل گرفتن است، با سابقه‌ی کانال در همین حال */
function mktFlagsHtml(m,dirs){
  if(!m||!dirs)return '';const pu=m.up/m.n*100, pd=m.down/m.n*100;let h='';
  const reg=regOfBtc(m.btc);
  for(const d of ['long','short']){
    if(!dirs||!dirs[d])continue;
    const against=d==='long'?(m.reg==='bear2'||m.reg==='bear'):(m.reg==='bull2'||m.reg==='bull');
    const st=reg?regimeStat(reg,d):null;
    if(!against&&!(st&&st.n>=5))continue;
    h+='<div class="flag '+(against?'w':'i')+'"><i>'+(against?'!':'i')+'</i><span>'+
      (against?'بازار '+MK_REG_FA[m.reg]+' است ('+faN(Math.round((d==='long'?pd:pu)))+'٪ ارزها '+(d==='long'?'منفی':'مثبت')+') و '+faN(dirs[d])+' سیگنالِ '+(d==='long'?'لانگ':'شورت')+' داری؛ استاپ نزدیکِ ایزوله در این حال راحت‌تر می‌خورد.':'')+
      (st&&st.n>=5?' سابقه‌ی کانال: '+(d==='long'?'لانگ‌ها':'شورت‌ها')+' در روزهای '+REG_FA[reg]+'ِ بیت‌کوین '+faN(st.w)+' از '+faN(st.n)+' برد، میانگین <b class="'+cls(st.r/st.n)+'">'+fmtR(st.r/st.n)+'</b>.':'')+
      '</span></div>';
  }
  return h;
}

/* ---- ۲) رویدادهای هر ارز (از کندل یک‌ساعته‌ی ۳۰ روز اخیر) ---- */
const MKEV=new Map(), MKEVQ=[];let MKEVRUN=0, MKEVT=null;
const MKEV_TTL=30*60000;
/* تابع خالص: کندل‌های یک‌ساعته‌ی صعودی ← رویدادها */
function mkEventsOf(C){
  if(!C||C.length<60)return null;
  const end=C[C.length-1].t+36e5, H=36e5, last=C.filter(k=>k.t>=end-24*H);
  const lo24=Math.min(...last.map(k=>k.l)), hi24=Math.max(...last.map(k=>k.h));
  const before=(d)=>C.filter(k=>k.t>=end-d*24*H&&k.t<end-24*H);
  const ev=[];
  for(const d of [30,7]){
    const P=before(d);if(P.length<(d-1)*20)continue;
    const lo=Math.min(...P.map(k=>k.l)), hi=Math.max(...P.map(k=>k.h));
    if(lo24<lo&&!ev.some(e=>e.k==='low'))ev.push({k:'low',d,bear:true,t:'شکست کف '+faN(d)+' روزه'});
    if(hi24>hi&&!ev.some(e=>e.k==='high'))ev.push({k:'high',d,bear:false,t:'شکست سقف '+faN(d)+' روزه'});
  }
  // تقاطع میانگین ۲۰ و ۵۰ روی کندل ۴ ساعته، در ۲۴ ساعت اخیر (۷ کندل: آخری ممکن است نیمه باشد)
  const F=swAggr(C,4*H).map(k=>k.c);
  if(F.length>=56){
    const ma=(n,i)=>{let s=0;for(let j=i-n+1;j<=i;j++)s+=F[j];return s/n;};
    const sg=i=>Math.sign(ma(20,i)-ma(50,i)), L=F.length-1;
    for(let i=L;i>L-7;i--)if(sg(i)!==sg(i-1)&&sg(i)!==0){ev.push({k:'ma',bear:sg(L)<0,t:'تقاطع '+(sg(L)<0?'نزولی':'صعودی')+' MA20/50 (4 ساعته)'});break;}
  }
  // حرکت ناگهانی: ۳ ساعت اخیر بیش از ۵٪
  const k3=C[Math.max(0,C.length-3)], mv=(C[C.length-1].c/k3.o-1)*100;
  if(Math.abs(mv)>=5)ev.push({k:'move',bear:mv<0,t:(mv<0?'ریزش':'رشد')+' ناگهانی '+fmtPct(mv)+' در 3 ساعت'});
  return ev;
}
/* کندل یک‌ساعته‌ی ~۴۱ روز هر ارز، نیم ساعت در حافظه؛ برای رویدادهای کارت سیگنال */
const MKC=new Map();
async function mkCandles(tk){
  const c=MKC.get(tk);if(c&&Date.now()-c.at<MKEV_TTL)return c.C;
  const H=36e5, C=await audCandles(tk,'1h',Math.floor((Date.now()-1000*H)/H)*H,1000,true);
  MKC.set(tk,{at:Date.now(),C});
  if(MKC.size>60){const k=[...MKC.keys()][0];MKC.delete(k);}
  return C;
}
function mkEvents(tk){
  if(!tk)return null;
  const c=MKEV.get(tk);
  if(c&&Date.now()-c.at<(c.err?10*60000:MKEV_TTL))return c.ev;
  if(!MKEVQ.includes(tk)&&!(c&&c.busy)){MKEVQ.push(tk);MKEV.set(tk,Object.assign({},c||{at:0,ev:null},{busy:true}));mkEvPump();}
  return c?c.ev:null;
}
function mkEvPump(){
  while(MKEVRUN<2&&MKEVQ.length){
    const tk=MKEVQ.shift();MKEVRUN++;
    (async()=>{
      let ev=null,err=false;
      try{const C=await mkCandles(tk);ev=mkEventsOf(C)||[];}
      catch(e){err=true;}
      MKEV.set(tk,{at:Date.now(),ev,err});
      MKEVRUN--;mkEvPump();
      if(ev&&ev.length)mkRepaint();
    })();
  }
}
function mkRepaint(){
  clearTimeout(MKEVT);
  MKEVT=setTimeout(()=>{if(view==='signals'){try{renderSignals();paintGlance();}catch(e){}}},600);
}
/* برای کارت و «الان چه کنم؟»: رویدادها با نسبتشان به جهتِ سیگنال */
function mkEvFor(tk,dir){
  const ev=mkEvents(tk);if(!ev||!ev.length)return null;
  return ev.map(e=>Object.assign({},e,{against:dir==='long'?e.bear:!e.bear}));
}
const mkEvPills=(tk,dir)=>{const E=mkEvFor(tk,dir);if(!E)return '';
  return '<span class="mkev">'+E.map(e=>'<span class="pill '+(e.against?'lose':'win')+'" title="'+(e.against?'خلاف جهت سیگنال':'هم‌جهت با سیگنال')+'">'+(e.against?'⚠ ':'')+e.t+'</span>').join('')+'</span>';};
function mkEvFlag(tk,dir){
  const E=mkEvFor(tk,dir);if(!E)return null;
  const a=E.filter(e=>e.against), w=E.filter(e=>!e.against);
  return el('div','flag '+(a.length?'w':'i')+' mkevf','<i>'+(a.length?'!':'i')+'</i><span>'+
    (a.length?'خلاف '+(dir==='long'?'لانگ':'شورت')+': '+a.map(e=>e.t).join('، ')+'.':'')+
    (w.length?(a.length?' ':'')+'هم‌جهت: '+w.map(e=>e.t).join('، ')+'.':'')+'</span>');
}

/* ---- ۳) کانال‌سنج: نتیجه‌ی سیگنال‌ها به تفکیک حال بازار (بیت‌کوین ۲۴ ساعت پیش از انتشار) ---- */
const BTCHKEY='signaldesk.btch.v1';
let BTCHTRY=0;
let BTCH=(()=>{const o=lsGet(BTCHKEY);return o&&Array.isArray(o.c)?o:{c:[],at:0};})(), BTCHBUSY=null;
const btcCloseAt=t=>{const c=BTCH.c;if(!c.length)return null;
  let lo=0,hi=c.length-1;if(t<c[0][0]||t>c[hi][0]+36e5)return null;
  while(lo<hi){const m=(lo+hi+1)>>1;if(c[m][0]<=t)lo=m;else hi=m-1;}
  return c[lo][1];};
function regimeAt(t){
  if(!t)return null;
  const a=btcCloseAt(t-24*36e5), b=btcCloseAt(t);
  return a&&b?regOfBtc((b/a-1)*100):null;
}
/* تاریخچه‌ی بیت‌کوین (یک‌ساعته) برای بازه‌ی سیگنال‌ها؛ هر بار فقط تکه‌ی تازه گرفته می‌شود */
async function btcHistLoad(from){
  if(BTCHBUSY)return BTCHBUSY;
  BTCHBUSY=(async()=>{
    const H=36e5, start=Math.floor((from-26*H)/H)*H, have=BTCH.c, first=have.length?have[0][0]:Infinity, last=have.length?have[have.length-1][0]:0;
    const ranges=[];
    if(start<first)ranges.push([start,Math.min(first,Date.now())]);
    if(Date.now()-last>2*H)ranges.push([Math.max(last+H,start),Date.now()]);
    const m=new Map(have);
    for(const [a,b] of ranges){
      for(let t=a;t<b;t+=1000*H){
        try{const C=await audCandles('BTC','1h',t,1000,true);for(const k of C)m.set(k.t,k.c);}catch(e){break;}
      }
    }
    // ۹۰ روز بس است؛ حافظه‌ی گوشی پر نشود
    const keep=Date.now()-90*864e5;
    BTCH={c:[...m].filter(x=>x[0]>=keep).sort((x,y)=>x[0]-y[0]),at:Date.now()};
    lsSet(BTCHKEY,BTCH);
    return BTCH;
  })();
  try{return await BTCHBUSY;}finally{BTCHBUSY=null;}
}
let REGV='',REGS=null;
function regimeStats(){
  const v=POSTS.length+'|'+KGEN+'|'+AUDQ.at+'|'+SETVER+'|'+BTCH.at;
  if(v===REGV&&REGS)return REGS;
  REGV=v;REGS=groupBy(audRows(),x=>{const r=regimeAt(x.inp.t0);return r?r+'|'+x.inp.dir:null;});
  return REGS;
}
const regimeStat=(reg,dir)=>regimeStats().get(reg+'|'+dir)||null;
const REG_ORDER=['bull|long','flat|long','bear|long','bull|short','flat|short','bear|short'];
const regLabel=k=>{const [r,d]=k.split('|');return (d==='long'?'لانگ':'شورت')+' · بازار '+REG_FA[r];};
function regimeTableHtml(rows){
  const F=finRows(rows);if(!F.length)return '';
  const t0=Math.min(...F.map(x=>x.inp.t0));
  const covered=BTCH.c.length&&BTCH.c[0][0]<=t0-24*36e5&&Date.now()-BTCH.c[BTCH.c.length-1][0]<6*36e5;
  // یک بار در ده دقیقه؛ اگر کندل بیت‌کوین نیامد، تب در حلقه‌ی «بگیر و دوباره بکش» نیفتد
  if(!covered&&Date.now()-BTCHTRY>10*60000){BTCHTRY=Date.now();
    btcHistLoad(t0).then(h=>{if(view==='audit'&&h.c.length)renderAudit();});}
  if(!covered){
    if(!BTCH.c.length)return '<div class="hint">در حال گرفتن تاریخچه‌ی بیت‌کوین برای «حال بازار»…</div>';}
  const m=groupBy(rows,x=>{const r=regimeAt(x.inp.t0);return r?r+'|'+x.inp.dir:null;});
  const html=grpTable('به تفکیک حال بازار (تغییر بیت‌کوین در 24 ساعتِ پیش از سیگنال: نزولی ≤ −2٪، صعودی ≥ +2٪)',m,REG_ORDER,regLabel);
  // جمع‌بندی یک‌خطی: آیا لانگ در روزهای نزولی بدتر بوده؟
  const a=m.get('bear|long'), b=m.get('bull|long')||m.get('flat|long');
  let note='';
  if(a&&b&&a.n>=5&&b.n>=5){const ra=a.r/a.n, rb=b.r/b.n;
    if(ra<rb-0.3)note='<div class="flag w"><i>!</i><span>لانگ‌های کانال در روزهای نزولیِ بیت‌کوین بدتر بوده‌اند ('+fmtR(ra)+' در برابر '+fmtR(rb)+'). در این روزها لانگ نگیر یا ریسک را کم کن.</span></div>';
    else if(ra>=rb)note='<div class="hint">لانگ‌های کانال در روزهای نزولی هم بدتر نبوده‌اند ('+fmtR(ra)+' در برابر '+fmtR(rb)+').</div>';}
  return html+note;
}

/* ---- ۴) کل بازار و دامیننس‌ها (CoinGecko) ----
   TOTAL = ارزش کل بازار رمزارز، TOTAL2 = بی بیت‌کوین، TOTAL3 = بی بیت‌کوین و اتریوم (آلت‌ها)،
   دامیننس بیت‌کوین، اتریوم و تتر (سهم از TOTAL). تغییر 24 ساعته از تغییر ارزش بازار هر کدام.
   تاریخچه‌ی ساعتی‌شان (برای مدل رادار و نمودار 7 روزه) در 31e-radar.js از کندل‌ها بازسازی می‌شود. */
const MDKEY='signaldesk.dom.v1', MD_TTL=15*60000;
let MD=lsGet(MDKEY)||null, MDTRY=0, MDBUSY=null;
async function mdLoad(force){
  if(!force&&MD&&Date.now()-MD.at<MD_TTL)return MD;
  if(MDBUSY)return MDBUSY;
  MDBUSY=(async()=>{
    try{
      const opt=(l,v)=>({json:true,timeout:12000,kind:'px',quiet:true,label:l,validate:v});
      const [g,mk]=await Promise.all([
        fetchVia('https://api.coingecko.com/api/v3/global',opt('کل بازار (CoinGecko)',d=>!!(d&&d.data&&d.data.total_market_cap))),
        fetchVia('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1',
          opt('ارزش بازار (CoinGecko)',d=>Array.isArray(d)&&d.length>=10)).catch(()=>null)]);
      const G=g.data.data, caps={};
      if(mk)for(const x of mk.data){const s=String(x.symbol||'').toUpperCase();if(!caps[s]&&+x.market_cap>0)caps[s]=[+x.market_cap,+x.market_cap_change_percentage_24h||0];}
      const P=G.market_cap_percentage||{};
      MD={at:Date.now(),tot:+G.total_market_cap.usd,totC:+G.market_cap_change_percentage_24h_usd||0,pct:{btc:+P.btc||0,eth:+P.eth||0,usdt:+P.usdt||0},
        caps:mk?caps:(MD&&MD.caps)||{}};
      lsSet(MDKEY,MD);
      // فهرست 500 تایی رادار (روزی یک بار) با 150 تای این‌جا عوض نشود
      if(mk&&!(RDCAP&&RDCAP.deep&&Date.now()-RDCAP.at<864e5)){RDCAP={at:Date.now(),list:mk.data.map(x=>String(x.symbol||'').toUpperCase())};lsSet(RDCAP_KEY,RDCAP);}
    }catch(e){}
    return MD;
  })();
  try{return await MDBUSY;}finally{MDBUSY=null;}
}
/* تابع خالص: الان و تغییر 24 ساعته؛ ارزش به دلار و تغییرش به درصد، دامیننس به درصد و تغییرش به «واحد درصد» */
function mdMetrics(M){
  if(!M||!(M.tot>0)||!M.pct||!(M.pct.btc>0))return null;
  const ago=(v,c)=>v/(1+c/100), T=M.tot, T0=ago(T,M.totC), cp=s=>M.caps&&M.caps[s]?M.caps[s][1]:null;
  const B=T*M.pct.btc/100, E=T*M.pct.eth/100, U=T*M.pct.usdt/100;
  const B0=cp('BTC')!=null?ago(B,cp('BTC')):null, E0=cp('ETH')!=null?ago(E,cp('ETH')):null, U0=cp('USDT')!=null?ago(U,cp('USDT')):null;
  return {tot:[T,M.totC],
    t2:[T-B,B0!=null?((T-B)/(T0-B0)-1)*100:null],
    t3:[T-B-E,B0!=null&&E0!=null?((T-B-E)/(T0-B0-E0)-1)*100:null],
    bd:[M.pct.btc,B0!=null?M.pct.btc-B0/T0*100:null],
    ed:[M.pct.eth,E0!=null?M.pct.eth-E0/T0*100:null],
    ud:[M.pct.usdt,U0!=null?M.pct.usdt-U0/T0*100:null]};
}
const fmtCap=v=>v>=1e12?'$'+(v/1e12).toFixed(2)+'T':v>=1e9?'$'+(v/1e9).toFixed(0)+'B':'$'+fmtNum(v);
/* خوانش ساده: پول کجا می‌رود؟ */
function mdRead(r){
  const s=[];if(!r)return s;
  if(r.ud[1]!=null&&r.ud[1]>=0.1&&r.tot[1]<0)s.push(['w','دامیننس تتر بالا رفت و کل بازار پایین آمد: پول به تتر فرار می‌کند (فشار فروش).']);
  else if(r.ud[1]!=null&&r.ud[1]<=-0.1&&r.tot[1]>0)s.push(['u','دامیننس تتر پایین آمد و کل بازار بالا رفت: پول تازه از تتر وارد بازار می‌شود.']);
  if(r.bd[1]!=null&&r.t3[1]!=null){
    if(r.bd[1]>=0.2&&r.t3[1]<r.tot[1])s.push(['w','دامیننس بیت‌کوین بالا رفت و آلت‌ها (TOTAL3) از کل بازار ضعیف‌ترند: روز آلت‌کوین نیست؛ لانگ آلت ریسکی‌تر است.']);
    else if(r.bd[1]<=-0.2&&r.t3[1]>r.tot[1])s.push(['u','دامیننس بیت‌کوین پایین آمد و آلت‌ها (TOTAL3) قوی‌ترند: پول به آلت‌کوین‌ها می‌رود.']);}
  return s;
}
const mdSpark=(a,cl)=>{if(!a||a.length<3)return '';const lo=Math.min(...a),hi=Math.max(...a),d=hi-lo||1;
  return '<svg class="mdsp '+cl+'" viewBox="0 0 60 18" preserveAspectRatio="none"><polyline fill="none" stroke="currentColor" stroke-width="1.5" points="'+
    a.map((v,i)=>(i/(a.length-1)*60).toFixed(1)+','+(16-(v-lo)/d*14).toFixed(1)).join(' ')+'"/></svg>';};
/* پهنای بازار: میانگین RSI 4 ساعته، سهم اشباع فروش/خرید و MACD مثبتِ ارزهای رادار (از rdMktBuild) */
function mdBreadthHtml(b){
  if(!b||!b.n)return '';
  const os=Math.round(b.os),ob=Math.round(b.ob),mid=Math.max(0,100-os-ob),rc=b.rsi<40?'d':b.rsi>60?'u':'',d=b.rsi24!=null?b.rsi-b.rsi24:null;
  const rd=b.os>=30?'بیشتر ارزها اشباع فروش‌اند: ریزش معمولاً خسته است؛ شورت تازه پرخطرتر، برگشت محتمل‌تر.':b.ob>=30?'بیشتر ارزها اشباع خرید‌اند: صعود داغ است؛ لانگ تازه پرخطرتر.':
    b.mc>=65?'بیشتر ارزها مومنتوم مثبت دارند (MACD).':b.mc<=35?'بیشتر ارزها مومنتوم منفی دارند (MACD).':'بازار یکدست نیست؛ هر ارز حال خودش را دارد.';
  return '<div class="mdbr"><div class="mkh"><b>پهنای بازار</b><small>RSI و MACD 4 ساعته‌ی '+faN(b.n)+' ارز</small></div>'+
    '<div class="mdbrr"><span>میانگین RSI <b class="'+rc+'" dir="ltr">'+fmtNum(b.rsi)+'</b>'+(d!=null?' <small dir="ltr" class="'+cls(d)+'">'+(d>0?'+':'')+fmtNum(d)+'</small>':'')+'</span>'+
    '<span>MACD مثبت <b dir="ltr">'+faN(Math.round(b.mc))+'%</b></span></div>'+
    '<div class="mkline"><i class="u" style="width:'+os+'%"></i><i class="m" style="width:'+mid+'%"></i><i class="d" style="width:'+ob+'%"></i></div>'+
    '<div class="mdbrl"><small>اشباع فروش (زیر 30): '+faN(os)+'٪</small><small>اشباع خرید (بالای 70): '+faN(ob)+'٪</small></div>'+
    '<div class="hint">'+rd+'</div></div>';
}
function mdHtml(){
  if((!MD||Date.now()-MD.at>MD_TTL)&&Date.now()-MDTRY>120000){MDTRY=Date.now();const was=MD&&MD.at;
    mdLoad().then(m=>{if(m&&m.at!==was){if(view==='signals')paintGlance();else if(view==='radar')renderRadar();}}).catch(()=>{});}
  const r=mdMetrics(MD);
  if(!r)return '<div class="mdbox"><div class="hint">'+(Date.now()-MDTRY<15000?'در حال گرفتن TOTAL و دامیننس‌ها از CoinGecko…':'TOTAL و دامیننس‌ها نیامد (CoinGecko در دسترس نبود).')+'</div></div>';
  const S=typeof RD!=='undefined'&&RD.mk7||{};
  // رنگ: برای ارزش بازار بالا = سبز؛ برای دامیننس تتر بالا = قرمز (پول از بازار بیرون)؛ دامیننس بیت‌کوین بالا = زرد (برای آلت‌ها بد)
  const T=[['tot','TOTAL','کل بازار',0],['t2','TOTAL2','بی بیت‌کوین',0],['t3','TOTAL3','آلت‌کوین‌ها',0],
    ['bd','BTC.D','دامیننس بیت‌کوین',1],['ud','USDT.D','دامیننس تتر',1],['ed','ETH.D','دامیننس اتریوم',1]];
  // اگر تغییر 24 ساعته‌ی بیت‌کوین/اتریوم/تتر نیامد، از تاریخچه‌ی بازسازی‌شده‌ی رادار
  const K2={t2:'t2c',t3:'t3c',bd:'bdD',ud:'udD'}, ML=typeof RD!=='undefined'&&RD.mkl;
  const tile=([k,n,fa,dom])=>{let [v,c]=r[k];if(c==null&&ML&&K2[k]&&ML[K2[k]]!=null)c=ML[K2[k]];
    const col=c==null?'':k==='ud'?(c>0.03?'d':c<-0.03?'u':''):k==='bd'?(c>0.1?'w':c<-0.1?'u':''):cls(c);
    return '<div class="mdt"><div class="mdn"><b dir="ltr">'+n+'</b><small>'+fa+'</small></div><div class="mdv" dir="ltr">'+(dom?v.toFixed(2)+'%':fmtCap(v))+'</div>'+
      '<div class="mdc"><b class="'+col+'" dir="ltr">'+(c==null?'—':(c>0?'+':c<0?'−':'')+Math.abs(c).toFixed(2)+(dom?'':'%'))+'</b><small>'+(dom?'واحد در 24h':'در 24h')+'</small>'+mdSpark(S[k],col)+'</div></div>';};
  let h='<div class="mdbox"><div class="mkh"><b>'+ic('coin')+'کل بازار و دامیننس‌ها</b><small>'+ageTxt(MD.at)+'</small></div><div class="mdgrid">'+T.map(tile).join('')+'</div>';
  for(const [c,t] of mdRead(r))h+='<div class="flag '+c+'"><i>'+(c==='u'?'✓':'!')+'</i><span>'+t+'</span></div>';
  h+=mdBreadthHtml(ML&&ML.br);
  h+='<details class="mkwhy"><summary>این‌ها چیست؟</summary><div class="hint"><b>TOTAL</b> ارزش کل بازار رمزارز است؛ <b>TOTAL2</b> همان بدون بیت‌کوین؛ <b>TOTAL3</b> بدون بیت‌کوین و اتریوم، یعنی آلت‌کوین‌ها. '+
    '<b>BTC.D</b> سهم بیت‌کوین از TOTAL است: بالا رفتنش یعنی پول به سمت بیت‌کوین می‌رود و آلت‌ها معمولاً ضعیف‌ترند. '+
    '<b>USDT.D</b> سهم تتر است: بالا رفتنش یعنی مردم می‌فروشند و تتر نگه می‌دارند (نزولی)، پایین آمدنش یعنی تتر خرج خرید می‌شود (صعودی). '+
    'تغییر دامیننس به «واحد درصد» است (مثلاً 58.10٪ ← 58.40٪ = +0.30). نمودار کوچک: 7 روز اخیر (بعد از بررسی رادار). منبع CoinGecko؛ با TradingView کمی فرق دارد چون فهرست ارزهایشان یکی نیست. '+
    '<b>پهنای بازار</b> همان نقشه‌ی حرارتی RSI و MACD است ولی برای ارزهای فهرست رادار: میانگین RSI 4 ساعته‌شان و سهم آن‌هایی که MACD 4 ساعته‌شان بالای خط سیگنال است. '+
    'TOTAL با ارزش بازار وزن می‌گیرد (بیت‌کوین غالب است)، پهنا به هر ارز یک رأی می‌دهد؛ پس می‌گوید «بیشتر ارزها» چه حالی دارند. وقتی بیشتر ارزها اشباع فروش‌اند، ریزش معمولاً خسته است و شورت تازه پرخطرتر؛ برعکس برای لانگ. '+
    'رادار این‌ها را به‌عنوان عامل هم می‌سنجد.</div></details></div>';
  return h;
}
