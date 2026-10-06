/* ==================== پارس سیگنال ==================== */
const FA='۰۱۲۳۴۵۶۷۸۹',AR='٠١٢٣٤٥٦٧٨٩';
function normDig(s){
  if(!s)return ''; let o='';
  for(const c of s){const f=FA.indexOf(c),a=AR.indexOf(c);
    if(f>-1)o+=f;else if(a>-1)o+=a;else if(c==='٫')o+='.';else if(c==='،')o+=',';else o+=c;}
  return o;
}
function cleanNum(raw,sfx){
  if(raw==null)return null;
  const s=String(raw).replace(/,/g,'').trim();
  if(!/^\d*\.?\d+$/.test(s))return null;
  let n=parseFloat(s); if(!isFinite(n)||n<=0)return null;
  const f=(sfx||'').toLowerCase(); if(f==='k')n*=1e3; else if(f==='m')n*=1e6;
  return n;
}
const BLOCK=new Set(['USD','USDT','USDC','TP','SL','OK','NO','ON','IN','AT','TO','IT','IS','BE','DO','GO','UP','ME','MY','WE','AND','THE','FOR','YOU','ALL','NEW','NOW','BUY','LOW','HIGH','LONG','SHORT','SPOT','BOT','PM','AM','RSI','MA','EMA','ATH','ATL','TF','HTF','LTF','FVG','OB','BOS','DCA','ROI','PNL','APY','VIP']);
/* کانال‌های فارسی معمولاً «#بیت_کوین» می‌نویسند نه «#BTC». قبلاً فقط حروف لاتین بعد از #
   خوانده می‌شد، نماد پیدا نمی‌شد، و چون isSignal به نماد شرط است کل پست از سیگنال‌ها می‌افتاد
   بیرون — با اینکه ورود و حد ضررش درست خوانده شده بود. ترتیب مهم است: نام‌های طولانی‌تر
   («بیت کوین کش») باید قبل از کوتاه‌ترها («بیت کوین») بیایند. */
const FA_COIN=[
  [/بیت\s*کوین\s*کش/,'BCH'], [/اتریوم\s*کلاسیک/,'ETC'],
  [/بیت\s*کوین|بیتکوین/,'BTC'], [/اتریوم|اتر\b/,'ETH'],
  [/ریپل|ایکس\s*ار\s*پی/,'XRP'], [/سولانا|سولنا/,'SOL'],
  [/کاردانو|ادا\b/,'ADA'], [/دوج/,'DOGE'], [/شیبا/,'SHIB'],
  [/بایننس\s*کوین|بی\s*ان\s*بی/,'BNB'], [/ترون/,'TRX'],
  [/پولکادات|دات\b/,'DOT'], [/چین\s*لینک|لینک\b/,'LINK'],
  [/لایت\s*کوین/,'LTC'], [/اوالانچ|اوالانش/,'AVAX'],
  [/پالیگان|پولیگان|ماتیک/,'MATIC'], [/اربیتروم/,'ARB'], [/اپتیمیزم/,'OP'],
  [/کازماس|اتم\b/,'ATOM'], [/نیر\b/,'NEAR'], [/فایل\s*کوین/,'FIL'],
  [/یونی\s*سواپ|یونی\b/,'UNI'], [/پپه/,'PEPE'], [/ورلد\s*کوین/,'WLD'],
  [/سویی\b/,'SUI'], [/اپتوس/,'APT'], [/تون\s*کوین|تون\b/,'TON'],
  [/فانتوم/,'FTM'], [/الگورند/,'ALGO'], [/استلار/,'XLM'], [/اینجکتیو/,'INJ']
];
/* نام کامل انگلیسی هم رایج است («solana خوبه»)، و در فهرست صرافی فقط نماد کوتاه هست،
   پس SOLANA هیچ‌وقت پیدا نمی‌شد. */
const EN_COIN={bitcoin:'BTC',ethereum:'ETH',ether:'ETH',ripple:'XRP',solana:'SOL',
  cardano:'ADA',dogecoin:'DOGE',doge:'DOGE',shiba:'SHIB',binance:'BNB',tron:'TRX',
  polkadot:'DOT',chainlink:'LINK',litecoin:'LTC',avalanche:'AVAX',polygon:'MATIC',
  arbitrum:'ARB',optimism:'OP',cosmos:'ATOM',near:'NEAR',filecoin:'FIL',uniswap:'UNI',
  pepe:'PEPE',worldcoin:'WLD',aptos:'APT',toncoin:'TON',fantom:'FTM',algorand:'ALGO',
  stellar:'XLM',injective:'INJ',sui:'SUI'};
/* «ك» و «ي» عربی و نیم‌فاصله را یکدست می‌کنیم تا الگوهای بالا به هر دو املا بخورند */
const faNorm=t=>String(t||'').replace(/ك/g,'ک').replace(/ي/g,'ی').replace(/[\u200c_]/g,' ');
function detectTicker(t){
  const h=t.match(/[#$]([A-Za-z][A-Za-z0-9]{1,11})/);
  if(h){const u=h[1].toUpperCase();if(!SYMBOLS.size||SYMBOLS.has(u))return u;}
  for(const tok of (t.split('\n').slice(0,4).join('\n').match(/\b[A-Za-z]{2,10}\b/g)||[])){
    const u=tok.toUpperCase(); if(BLOCK.has(u))continue; if(SYMBOLS.has(u))return u;
  }
  for(const tok of (t.match(/\b[A-Za-z]{3,12}\b/g)||[])){
    const sym=EN_COIN[tok.toLowerCase()];
    if(sym&&(!SYMBOLS.size||SYMBOLS.has(sym)))return sym;
  }
  const fa=faNorm(t);
  for(const [re,sym] of FA_COIN)if(re.test(fa))return sym;
  return null;
}
const NUM='([\\d][\\d,]*\\.?\\d*)\\s*([kKmM])?';
const RX={
  stop:new RegExp('(?:حد\\s*ضرر|حدضرر|استاپ\\s*لاس|استاپ|stop\\s*-?\\s*loss|\\bsl\\b)\\s*(?:رو|روی|در|را|:|：|=|-)?\\s*'+NUM,'i'),
  entry:new RegExp('(?:ورود|انتری|نقطه\\s*ورود|\\bentry\\b|\\bbuy\\b)\\s*(?:رو|روی|در|از|:|：|=|-)?\\s*'+NUM,'i'),
  above:new RegExp('(?:بالای|بالاتر\\s*از|\\babove\\b)\\s*'+NUM,'i'),
  tier2:new RegExp('(?:پله\\s*(?:دوم|2)|پله\\s*بعد)[^\\d\\n]{0,25}?'+NUM,'i'),
  tgt:new RegExp('(?:تارگت|تی\\s*پی|هدف|\\btarget\\b|\\btp\\d?\\b)\\s*(?:رو|روی|:|：|=|-)?\\s*'+NUM,'i'),
  lev:new RegExp('(?:اهرم|لوریج|\\bleverage\\b|\\blev\\b)\\s*(?:رو|:|：|=|-)?\\s*(\\d{1,3})\\s*[xX]?','i'),
  levx:/\b(\d{1,3})\s*[xX]\b/,
  trg:new RegExp('(?:تریگر|\\btrigger\\b)(?:\\s*ورود)?\\s*(?:رو|روی|:|：|=|-)?\\s*'+NUM,'i'),
  brk:new RegExp('شکست\\s*(?:رو|روی|از)?\\s*'+NUM,'i'),
  avg:new RegExp('(?:رو|روی|در)\\s*'+NUM+'\\s*(?:میانگین|اضافه)','i')
};
/* پست‌هایی که شکل سیگنال دارند ولی سیگنال نیستند (از نمونه‌های واقعی کانال):
   هشدار لیکوئید («🟢 #BTC Liquidated Short: $89.5K at $85444») خطِ خبرِ بازار است و نمادش
   مالِ پست نیست؛ مدیریتِ پوزیشنِ باز («۳۵٪ سیو کنید»، «تعداد پوزیشن‌ها را کم می‌کنیم»)؛ و خبر. */
const RX_LIQ=/^.*\bLiquidated\s+(?:Short|Long)\b.*$/gim;
const RX_MGMT=/سیو[\s\u200c]*(?:کنید|می[\s\u200c]*کنید|کردیم|کردم|می[\s\u200c]*کنیم)|تعداد[\s\u200c]*پوزیشن|(?:پوزیشن|لانگ|شورت)[^\n]{0,30}?کم[\s\u200c]*(?:می[\s\u200c]*)?(?:کنید|کنیم|خواهم|کردم)/;
const RX_NEWSY=/(?:^|[\s،.])(?:اخبار|خبر)/;
/* «ورود مجازه»، «یک پله الان»: ورود با قیمت بازارِ لحظه‌ی انتشار (عددی نمی‌آید) */
const RX_GO=/(?:ورود|لانگ|شورت)[^\n\d]{0,20}?مجاز|یک[\s\u200c]*پله[\s\u200c]*(?:الان|اینجا)/;
/* اگر الگوی سفت بالا نخورد: بعد از کلیدواژه تا ۴۵ نویسه (حتی خطِ بعد) دنبال اولین عددی که
   «زمان» یا «پله» نیست (حد ضرر ۴ ساعته زیر 0.85، ورود ۲ پله‌ای) و پیش از آن کلیدواژه‌ی دیگری
   (تارگت، ورود، اهرم…) نیامده. «حد ضرر ۵ درصد» درصد است و بعد از ورود به قیمت تبدیل می‌شود. */
const RX_KW={stop:'حد\\s*ضرر|حدضرر|استاپ\\s*لاس|استاپ|stop\\s*-?\\s*loss|\\bsl\\b',
  entry:'ورود|انتری|\\bentry\\b|\\bbuy\\b|خرید|بخر'};
const RX_GAPSTOP=/تارگت|هدف|تی\s*پی|\btp\d?\b|\btarget\b|حد\s*ضرر|استاپ|\bsl\b|ورود|\bentry\b|اهرم|لوریج/i;
const RX_NOTPX=/^[ \t]*(?:ساعت|روز|دقیقه|هفته|ماه|کندل|پله|مرحله|بار|میانگین|اضافه|[xX]\b|h\b|d\b|min\b)/i;
const RX_PCT=/^[ \t]*(?:%|٪|درصد)/;
function kwNum(t,kw){
  const re=new RegExp(kw,'gi');let m;
  while((m=re.exec(t))){
    const from=m.index+m[0].length, seg=t.slice(from,from+45), nr=/(\d[\d,]*\.?\d*)\s*([kKmM](?![a-zA-Z\u0600-\u06FF]))?/g;let n;
    while((n=nr.exec(seg))){
      if(RX_GAPSTOP.test(seg.slice(0,n.index)))break;
      const after=seg.slice(n.index+n[0].length);
      if(RX_NOTPX.test(after))continue;
      const v=cleanNum(n[1],n[2]);if(v==null)continue;
      return RX_PCT.test(after)?{pct:v}:{v};
    }
    if(m[0].length===0)re.lastIndex++;
  }
  return null;
}
/* اسپات یا فیوچرز؟ کانال همیشه صریح نمی‌گوید، ولی نشانه‌ها روشن‌اند:
   شورت، اهرم، «فیوچرز» و «پرپچوال» فقط در فیوچرز معنی دارند؛ «اسپات» و «هولد»
   و «خرید پله‌ای بلندمدت» نشانه‌ی اسپات‌اند. وقتی هیچ‌کدام نبود حدس می‌زنیم و
   همان‌جا می‌گوییم حدس است، تا با یک ضربه عوضش کنی. */
const RX_SPOT=/اسپات|\bspot\b|هولد|\bhold\b|نگهداری\s*بلندمدت|سرمایه\s*گذاری\s*بلندمدت/i;
const RX_FUT=/فیوچرز|فیوچر|پرپچوال|\bfutures?\b|\bperp(?:etual)?\b|\bmargin\b|اهرم|لوریج|\bleverage\b|\blev\b|مارجین/i;
function detectMarket(t,dir,lev){
  const sp=RX_SPOT.test(t), fu=RX_FUT.test(t)||dir==='short'||lev!=null;
  if(sp&&!fu)return {market:'spot',guess:false};
  if(fu&&!sp)return {market:'futures',guess:false};
  if(sp&&fu)return {market:'futures',guess:true};     // هر دو گفته شده؛ محتاطانه فیوچرز
  return {market:'futures',guess:true};               // هیچ‌کدام نگفته
}
function allNums(re,t){
  const g=new RegExp(re.source,'gi'),o=[];let m;
  while((m=g.exec(t))!==null){const v=cleanNum(m[1],m[2]);if(v!=null)o.push(v);if(m.index===g.lastIndex)g.lastIndex++;}
  return [...new Set(o)];
}
/* پارس هر پست پرهزینه نیست ولی در هر رندر چند بار تکرار می‌شد؛ نتیجه را نگه می‌داریم
   و فقط وقتی فهرست نمادهای صرافی عوض شود دوباره حساب می‌کنیم */
const PCACHE=new Map();
function parseSignal(raw,id){
  if(id){const c=PCACHE.get(id);if(c&&c.v===SYMVER)return c.r;}
  const t0=normDig(raw||''), t=t0.replace(RX_LIQ,'').trim(), liq=t!==t0.trim();
  const sm=t.match(RX.stop),em=t.match(RX.entry),am=t.match(RX.above)||t.match(RX.trg)||t.match(RX.brk),
        t2=t.match(RX.tier2)||t.match(RX.avg),lm=t.match(RX.lev)||t.match(RX.levx);
  const trig=am?cleanNum(am[1],am[2]):null;
  // «ورود ۲ پله‌ای»، «حد ضرر ۴ ساعته»: عددِ چسبیده به کلیدواژه قیمت نیست
  const okAt=m=>{if(!m)return false;
    if(/\d[ \t]*\r?\n/.test(m[0]))return true;           // عدد آخرِ خط است؛ «پله دوم» خطِ بعد مالِ خودش است
    const after=t.slice(m.index+m[0].length);return !RX_NOTPX.test(after)&&!RX_PCT.test(after);};
  let entry=okAt(em)?cleanNum(em[1],em[2]):null;
  if(entry==null){const k=kwNum(t,RX_KW.entry);if(k&&k.v!=null)entry=k.v;}
  const eOwn=entry;                                     // ورودِ صریح، نه تریگر
  if(entry==null&&trig!=null)entry=trig;
  const direction=/\bshort\b|شورت|فروش|ریزش/i.test(t)?'short':'long';
  // «بالای X ببنده ورود» شکستِ رو به بالاست، یعنی لانگ
  const dirSet=direction==='short'||/\blong\b|لانگ|خرید|بخر/i.test(t)||RX.above.test(t);
  let stop=okAt(sm)?cleanNum(sm[1],sm[2]):null;
  if(stop==null){const k=kwNum(t,RX_KW.stop);
    if(k&&k.v!=null)stop=k.v;
    else if(k&&k.pct>0&&k.pct<50&&entry)stop=+(entry*(1+(direction==='long'?-1:1)*k.pct/100)).toPrecision(8);}
  const r={ticker:detectTicker(t),direction,
    entry,trigger:trig,tier2:t2?cleanNum(t2[1],t2[2]):null,stop,
    targets:allNums(RX.tgt,t),leverage:lm?cleanNum(lm[1]):null,hasNum:/\d/.test(t),dirSet};
  const go=RX_GO.test(t);
  // ورود عددی نیامده ولی «ورود مجازه» یا فقط استاپ داده: ورود = قیمت بازارِ لحظه‌ی انتشار
  r.mktEntry=entry==null&&trig==null&&(stop!=null||go);
  const mk=detectMarket(t,r.direction,r.leverage);
  r.market=mk.market; r.marketGuess=mk.guess;
  /* سیگنال یعنی عددِ ورود یا استاپ یا تریگر، یا دست‌کم جهتِ صریح (لانگ/شورت). قبلاً اسم ارز +
     یک عدد + کلمه‌ای مثل «هدف» کافی بود و خبرها («بیت‌کوین به 65 هزار رسید؛ هدف بعدی…») و
     اطلاعیه‌ها هم سیگنال حساب می‌شدند — هم در فهرست سیگنال‌ها و هم در کانال‌سنج. */
  const strong=entry!=null||r.stop!=null||trig!=null||/لانگ|شورت|\blong\b|\bshort\b/i.test(t);
  r.isSignal=!!(r.ticker&&(r.hasNum||go)&&(strong||go)&&
    /حد\s*ضرر|استاپ|ورود|پله|تارگت|هدف|اهرم|فیوچرز|اسپات|لانگ|شورت|تریگر|\bentry\b|\bsl\b|\btp\b|\blong\b|\bshort\b/i.test(t));
  // مدیریتِ پوزیشن و خبر سیگنال تازه نیستند، مگر ورود و استاپِ کامل داشته باشند
  if(r.isSignal&&(RX_MGMT.test(t)&&!(eOwn!=null&&stop!=null)||RX_NEWSY.test(t)&&stop==null))r.isSignal=false;
  r.liq=liq;
  if(id)PCACHE.set(id,{v:SYMVER,r});
  return r;
}
/* سیگنالِ تصویری: کانال گاهی فقط «#MOVR» می‌نویسد و ورود و استاپ و تارگت روی چارتِ پیوست است */
const bareImg=(p,r)=>!!(p&&p.img&&r&&r.ticker&&
  normDig(p.origText||p.text||'').replace(/[#$][A-Za-z][A-Za-z0-9_]*/g,'').replace(/[\s.،:!🟢🔴✅]+/g,'').length<=12);
/* نتیجه‌ی parseSignal کش می‌شود، پس هیچ‌وقت خودش را دست نمی‌زنیم؛ یک رونوشت برمی‌گردانیم
   که نماد و «سیگنال بودن» دستیِ کاربر رویش نشسته است. */
function sigOf(p){
  let r=parseSignal(p.text,p.id);const ov=OVERRIDE[p.id];
  if(!r.isSignal&&bareImg(p,r))r=Object.assign({},r,{isSignal:true,imgOnly:true});
  if(!ov||(ov.ticker==null&&ov.sig==null&&ov.market==null&&!ov.tps))return r;
  const o=Object.assign({},r);
  if(ov.tps&&ov.tps.length)o.targets=ov.tps.slice();
  if(ov.ticker)o.ticker=ov.ticker;
  if(ov.trigger!=null)o.trigger=ov.trigger;
  if(ov.sig!=null)o.isSignal=!!ov.sig;
  if(ov.market){o.market=ov.market;o.marketGuess=false;}
  return o;
}

