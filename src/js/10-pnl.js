/* ==================== محاسبه سود و ضرر پوزیشن ==================== */
/* پوزیشن باز می‌تواند در طول عمرش تکه‌تکه بسته شود و استاپش جابجا شود:
   partials[]  : تکه‌های بسته‌شده — سود/ضررشان قطعی است
   baseMargin  : کل مارجینی که در طول عمر پوزیشن درگیر شده؛ مبنای «درصد روی مارجین»
   risk0/stop0 : ریسک و استاپ اولیه — R همیشه نسبت به ریسک اولیه است، حتی بعد از جابجایی استاپ */
/* اسپات دو جا بود: DB.spot (خرید دستی در تب بازار) و پوزیشن‌های kind='spot'
   (ورود از روی سیگنال). یک مفهوم با دو مدل یعنی دو جای نگهداری، دو فرم ورود و
   کارنامه‌ای که نیمی از خریدهایت را نمی‌بیند. حالا فقط پوزیشن است. */
function migrateSpot(){
  if(!Array.isArray(DB.spot)||!DB.spot.length)return false;
  for(const x of DB.spot){
    const cost=(+x.qty||0)*(+x.buy||0);
    if(!cost)continue;
    DB.positions.push(ensureBase({id:x.id||uid(),ticker:x.ticker,kind:'spot',dir:'long',
      entry:+x.buy,stop:null,stop0:null,margin:cost,baseMargin:cost,lev:1,targets:[],
      openedAt:x.at||Date.now(),status:'open',exitPrice:null,closedAt:null,fees:null,
      note:x.note||'',partials:[],log:[{at:x.at||Date.now(),k:'open',t:'از فهرست اسپاتِ قدیمی منتقل شد'}]}));
  }
  DB.spot=[];
  return true;
}
const partialsOf=p=>Array.isArray(p.partials)?p.partials:[];
const baseMarginOf=p=>p.baseMargin||(p.margin+partialsOf(p).reduce((s,x)=>s+(x.margin||0),0));
function risk0Of(p){
  if(p.risk0!=null&&p.risk0>0)return p.risk0;
  const st=p.stop0!=null?p.stop0:p.stop;
  if(!st||!p.entry)return null;
  const q=(baseMarginOf(p)*p.lev)/p.entry;
  const r=q*Math.abs(p.entry-st);
  return r>0?r:null;
}
/* قبل از هر تغییر روی پوزیشن، مبناها را قطعی می‌کنیم تا بعد از جابجایی استاپ گم نشوند */
function ensureBase(p){
  if(p.baseMargin==null)p.baseMargin=baseMarginOf(p);
  if(p.stop0==null&&p.stop!=null)p.stop0=p.stop;
  if(p.risk0==null){const r=risk0Of(p);if(r)p.risk0=r;}
  if(!Array.isArray(p.partials))p.partials=[];
  if(!Array.isArray(p.log))p.log=[];
  return p;
}
/* مبنای درصد و R دوباره از روی اعداد فعلی: وقتی مارجین، اهرم یا ورودِ پوزیشن را ویرایش
   می‌کنی، «مارجین اولیه» و «ریسک اولیه» باید همراهش عوض شوند. قبلاً نمی‌شدند و درصد سود
   با مارجینِ قبلی تقسیم می‌شد: پوزیشن 10 دلاری با اهرم 5 و 85٪ سود، 20٪ نشان داده می‌شد. */
function rebase(p){
  p.baseMargin=(p.margin||0)+partialsOf(p).reduce((s,x)=>s+(x.margin||0),0);
  delete p.risk0;
  if(p.stop0==null&&p.stop!=null)p.stop0=p.stop;
  const r=risk0Of(p);if(r)p.risk0=r;
  return p;
}
/* تعمیر داده‌های قبلی: پوزیشنی که تکه‌ای از آن بسته نشده، مارجین اولیه‌اش همان مارجین فعلی است.
   اگر فرق دارد، یعنی با باگ بالا ویرایش شده. */
function repairBase(){
  let n=0;
  for(const p of DB.positions){
    if(partialsOf(p).length||!(p.margin>0)||p.baseMargin==null)continue;
    if(Math.abs(p.baseMargin-p.margin)>1e-9){rebase(p);n++;}
  }
  if(n)logIt('info','مبنای درصد سود '+n+' پوزیشنِ ویرایش‌شده درست شد');
  return n;
}
function posMetrics(p,live){
  const sign=p.dir==='long'?1:-1;
  const notional=p.margin*p.lev, qty=notional/p.entry;
  const closed=p.status==='closed';
  const exit=closed?p.exitPrice:live;
  const parts=partialsOf(p);
  const realized=parts.reduce((s,x)=>s+(x.pnl||0),0);
  const partFees=parts.reduce((s,x)=>s+(x.fees||0),0);
  const base=baseMarginOf(p);
  const m={notional,qty,closed,exit,sign,realized,base,parts:parts.length};
  const ld=1/p.lev-MMR;
  m.liqPrice=p.lev>1.05&&ld>0?p.entry*(1-sign*ld):null;
  if(exit==null||!isFinite(exit)||exit<=0){
    if(parts.length){m.pnl=realized;m.roi=base>0?(realized/base)*100:null;m.fees=partFees;}
    return m;
  }
  m.movePct=((exit-p.entry)/p.entry)*100*sign;
  m.gross=qty*(exit-p.entry)*sign;
  const ownFee=closed?(p.fees||0):notional*(S.fee/100);
  m.fees=ownFee+partFees;
  m.unreal=m.gross-ownFee;
  m.funding=fundingOf(p,closed?(p.closedAt||Date.now()):Date.now());
  if(m.funding)m.unreal-=m.funding;
  m.pnl=m.unreal+realized;
  m.roi=base>0?(m.pnl/base)*100:null;   // درصد روی مارجین — اثر اهرم اینجاست
  m.acctPct=(m.pnl/S.acct)*100;
  const r0=risk0Of(p);
  m.r=r0?m.pnl/r0:null;
  m.liquidated=m.liqPrice!=null&&((p.dir==='long'&&exit<=m.liqPrice)||(p.dir==='short'&&exit>=m.liqPrice));
  return m;
}
/* فاندینگ تخمینی فیوچرز: نرخ ثابتِ تنظیمات در هر ۸ ساعتِ نگه‌داری، روی حجمی که آن مدت باز بوده.
   لانگ با نرخ مثبت می‌پردازد، شورت می‌گیرد. خروجی: هزینه (منفی یعنی درآمد). نرخ صفر = حساب نمی‌شود. */
function fundingOf(p,end){
  const r=+S.fund||0;
  if(!r||p.kind==='spot'||!p.openedAt||!(p.lev>0))return 0;
  const per=t=>Math.max(0,Math.floor((t-p.openedAt)/(8*36e5)));
  const sign=p.dir==='long'?1:-1;
  let c=(p.margin||0)*p.lev*per(end);
  for(const x of partialsOf(p))c+=(x.margin||0)*p.lev*per(x.at||end);
  return sign*c*r/100;
}
/* اگر استاپ فعلی بخورد، نتیجه کل پوزیشن (با احتساب تکه‌های بسته‌شده) چه می‌شود */
function stopOutcome(p,stop){
  if(!stop||!p.entry)return null;
  const sign=p.dir==='long'?1:-1, qty=(p.margin*p.lev)/p.entry;
  const fee=p.margin*p.lev*(S.fee/100);
  const pnl=qty*(stop-p.entry)*sign-fee+partialsOf(p).reduce((s,x)=>s+(x.pnl||0),0);
  const r0=risk0Of(p), base=baseMarginOf(p);
  return {pnl,roi:base>0?(pnl/base)*100:null,r:r0?pnl/r0:null};
}
// از درصد روی مارجین به قیمت خروج (روی حجم باقی‌مانده)
const exitFromRoi=(p,roi)=>p.entry*(1+(p.dir==='long'?1:-1)*(roi/100)/p.lev);
// از مبلغ سود/ضرر به قیمت خروج (روی حجم باقی‌مانده)
const exitFromPnl=(p,pnl)=>{const qty=(p.margin*p.lev)/p.entry;return p.entry+(p.dir==='long'?1:-1)*(pnl/qty);};
const roundP=v=>v>0?+v.toPrecision(8):v;
function logAdd(p,kind,text,at){ensureBase(p);p.log.push({at:at||Date.now(),k:kind,t:text});}

