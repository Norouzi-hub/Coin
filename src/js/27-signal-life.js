/* ==================== عمر سیگنال ==================== */
/* سیگنالی که یک هفته از آن گذشته دیگر گرفتنی نیست؛ فقط برای مرور می‌ماند. «قدیمی» یعنی:
   دکمه‌ی ورود ندارد، در «در انتظار» و شمارنده‌ی تب نمی‌آید، سفارش منتظرش هشدار نمی‌دهد و
   اعلانِ «تازه» نمی‌گیرد. کانال‌سنج و کارنامه دست نمی‌خورند — مرور همان‌جاست.
   اگر کانال گفت هنوز می‌شود گرفت، با یک زدن برمی‌گردد و از همان لحظه یک عمرِ تازه دارد. */
const staleMs=()=>Math.max(1,+S.staleDays||7)*864e5;
function freshUntil(p){
  const t=p&&p.date?p.date.getTime():null;
  if(t==null)return Infinity;
  const rv=DB.revived[p.id];
  return Math.max(t,rv&&rv.at||0)+staleMs();
}
const isStale=p=>Date.now()>freshUntil(p);
/* سیگنالی که هنوز می‌شود رویش تصمیم گرفت: سیگنال است، تصمیمش را نگرفته‌ای و قدیمی نشده */
const isOpenSig=p=>isSigPost(p)&&!decisionOf(p.id)&&!isStale(p);
function revive(p,hint){
  DB.revived[p.id]={at:Date.now(),by:hint?'ch':'me',src:hint?hint.id:null};
  save();PCACHE.delete(p.id);renderAll();
  toast('به سیگنال‌ها برگشت — تا '+faN(S.staleDays||7)+' روز دیگر گرفتنی است','ok');
}
function unrevive(p){
  delete DB.revived[p.id];
  save();PCACHE.delete(p.id);renderAll();toast('دوباره منقضی شد','info');
}
/* کانال گاهی درباره‌ی سیگنال قدیمی می‌گوید «هنوز می‌شود وارد شد». چنین پستی را پیدا
   می‌کنیم و کنار سیگنال نشانش می‌دهیم، ولی برگرداندن با خودت است. */
const RX_REENTRY=new RegExp(
  '(?:هنوز|همچنان)[^\\n.!؟?]{0,25}?(?:قابل\\s*(?:ورود|خرید)|(?:می\\s*شه|می\\s*شود|می\\s*تون|می\\s*توان)\\S*\\s*(?:وارد|ورود|خرید|بخر|گرفت|بگیر)|معتبر|فعال|پابرجا|سر\\s*جاش)'+
  '|قابل\\s*(?:ورود|خرید)\\s*(?:است|هست|هستش|می\\s*باشد|ه(?![\\u0600-\\u06FF]))'+
  '|(?:ورود|خرید|انتری)\\s*(?:مجدد|دوباره)|ری\\s*-?\\s*انتری'+
  '|(?:می\\s*شه|می\\s*شود|می\\s*تونید|می\\s*تونین|می\\s*توانید)\\s*(?:وارد\\s*(?:شد|بشید|شید|شوید)|ورود\\s*(?:کرد|بزنید|کنید|زد)|خرید|بخرید|بگیرید|بگیرین|گرفت)'+
  '|بگیرید|بگیرین|بگیریدش|بگیرینش|وارد\\s*(?:بشید|شید|شوید)|ورود\\s*(?:بزنید|کنید|بگیرید)'+
  '|(?:الان|هنوز)\\s*(?:هم\\s*)?(?:وقت|زمان|موقع)\\s*(?:ورود|خرید)'+
  '|(?:تو|در|داخل)\\s*(?:منطقه|ناحیه|محدوده|رنج)\\S*\\s*(?:ی\\s*)?(?:ورود|خرید)'+
  '|(?:دوباره|مجدد)\\s*(?:به\\s*)?(?:نقطه|منطقه|قیمت)\\S*\\s*(?:ی\\s*)?(?:ورود|خرید)'+
  '|\\bre-?entry\\b|\\bstill\\s+(?:valid|active|open)\\b|\\bcan\\s+(?:still\\s+)?(?:enter|buy)\\b','i');
const RX_REENTRY_NO=/نیست|نمی\s*شه|نمی\s*شود|نمی\s*تون|نکنید|نکنین|نشید|نشوید|نگیرید|نگیرین|نخرید|دیر\s*(?:شده|است|ه(?![؀-ۿ]))|از\s*دست\s*رفت|منقضی|کنسل|لغو|باطل|تموم\s*شد|بسته\s*شد|استاپ\s*خورد|\bnot\b|\bexpired\b|\bcancel/i;
const reentryText=p=>{const t=faNorm(normDig(p.text||''));return RX_REENTRY.test(t)&&!RX_REENTRY_NO.test(t);};
let HINTIX=null, HINTKEY='';
function hintIndex(){
  const key=POSTS.length+':'+(POSTS[0]&&POSTS[0].id)+':'+(POSTS.length&&POSTS[POSTS.length-1].id);
  if(HINTIX&&HINTKEY===key)return HINTIX;
  const byReply=new Map(), byTk=new Map();
  for(const q of POSTS){
    if(isStale(q)||!reentryText(q))continue;       // خودِ اشاره باید تازه باشد
    const g=sigOf(q);
    if(q.reply&&q.reply.id){
      const src=findPost(q.reply.id);
      if(src){(byReply.get(src.id)||byReply.set(src.id,[]).get(src.id)).push(q);continue;}
    }
    // سیگنالِ کاملِ تازه روی همان ارز، سیگنال جدید است نه اشاره به قبلی
    if(g.isSignal&&g.entry!=null&&g.stop!=null)continue;
    if(g.ticker)(byTk.get(g.ticker)||byTk.set(g.ticker,[]).get(g.ticker)).push(q);
  }
  HINTKEY=key;HINTIX={byReply,byTk};
  return HINTIX;
}
function reentryHint(p){
  const ix=hintIndex(), t=p.date?p.date.getTime():0;
  const later=q=>q.id!==p.id&&q.date&&q.date.getTime()>t;
  const r=(ix.byReply.get(p.id)||[]).find(later);
  if(r)return r;
  const tk=sigOf(p).ticker;
  return tk?(ix.byTk.get(tk)||[]).find(later)||null:null;
}
/* جای دکمه‌های ورود روی سیگنال قدیمی */
function buildStale(p,sig){
  const w=el('div','stale');
  const days=p.date?Math.floor((Date.now()-p.date.getTime())/864e5):null;
  w.appendChild(el('div','stalehd',ic('clock')+'<span>منقضی — فقط برای مرور</span>'));
  w.appendChild(el('div','staletx',(days!=null?faN(days)+' روز از این سیگنال گذشته. ':'')+
    'بعد از '+faN(S.staleDays||7)+' روز دیگر گرفتنی حساب نمی‌شود: در «منقضی» می‌ماند، دکمه‌ی ورود ندارد و در شمارنده‌ها نمی‌آید. '+
    'اگر هنوز معتبر است، برش گردان تا '+faN(S.staleDays||7)+' روز دیگر زنده بماند.'));
  const h=reentryHint(p);
  if(h){
    const snip=(h.text||'').replace(/\s+/g,' ').trim();
    const box=el('div','stalehint','<b>کانال '+esc(relTime(h.date))+' گفته:</b> «'+
      esc(snip.length>110?snip.slice(0,110)+'…':snip)+'» ');
    const a=el('a',null,'دیدن پست');a.href=h.link;a.target='_blank';a.rel='noopener';
    box.appendChild(a);w.appendChild(box);
  }
  const acts=el('div','acts');
  const b=el('button','btn '+(h?'ok':'side'),ic('undo')+'<span>برگرداندن به سیگنال‌ها</span>');
  b.title='یک عمر تازه می‌گیرد و دکمه‌های ورود برمی‌گردند';
  b.onclick=()=>revive(p,h);
  acts.appendChild(b);
  if(AUD[p.id]&&typeof sheetAudPost==='function'){
    const r=el('button','btn xs side','چه شد؟');
    r.title='مسیر واقعی قیمت بعد از این سیگنال — کانال‌سنج';
    r.onclick=()=>sheetAudPost(p);
    acts.appendChild(r);
  }
  w.appendChild(acts);
  return w;
}

/* lite: کارتِ بسته در آکاردئون فقط سربرگ و خلاصه‌ی یک‌خطی دارد؛ بدنه، ماشین‌حساب و
   دکمه‌ها وقتی ساخته می‌شوند که باز شود (باز کردن به هر حال دوباره رندر می‌کند).
   روی 30 کارت یعنی یک کارت کامل به‌جای سی تا. */
function buildCard(p,lite){
  const sig=sigOf(p), ov=OVERRIDE[p.id]||{}, kind=postKind(p), isSig=kind==='sig', dec=decisionOf(p.id);
  const dir=ov.dir||sig.direction;
  const card=el('div','card'+(isSig?' d-'+dir:'')+(NEWIDS.has(p.id)?' fresh':'')+
    (isSig&&!dec&&isStale(p)?' old':''));
  card.dataset.id=p.id;

  const head=el('div','chead');
  if(sig.ticker){
    const tk=el('button','tick tapme',esc(sig.ticker));
    tk.title='فقط سیگنال‌های '+sig.ticker;
    tk.onclick=()=>{coinFilter=sig.ticker;shownMax=PAGE;renderSignals();window.scrollTo({top:0,behavior:'smooth'});};
    head.appendChild(tk);
    if(isSig)head.appendChild(el('span','pill '+dir,dir==='long'?'لانگ':'شورت'));
  }else head.appendChild(el('span','pill mut','بدون نماد'));
  if(isSig){
    const I=planInputsOf(p,sig,OVERRIDE[p.id]||{},null);
    if(I.spot)head.appendChild(el('span','pill gold','اسپات'));
  }else head.appendChild(el('span','pill kind k-'+kind+(kind==='res'&&!resAuto(p)?' gold':''),KIND_FA[kind]||'یادداشت'));
  if(NEWIDS.has(p.id))head.appendChild(el('span','pill gold','تازه'));
  const stale=isSig&&!dec&&isStale(p);
  if(stale)head.appendChild(el('span','pill mut',ic('clock')+'منقضی'));
  else if(isSig&&!dec&&DB.revived[p.id])head.appendChild(el('span','pill gold','برگشته'));
  const px=sig.ticker?PRICES.get(sig.ticker):null;
  if(px!=null)head.appendChild(el('span','pill live '+(flashOf(sig.ticker)?'fl-'+flashOf(sig.ticker):''),'<i></i>'+fmtPrice(px)));
  if(dec)head.appendChild(el('span','pill '+(dec.action==='taken'?'open':'mut'),dec.action==='taken'?'وارد شدم':'نگرفتم'));
  // کانال‌سنج: فقط وقتی نتیجه قطعی است، یک برچسب — نه شلوغیِ بیشتر
  if(isSig){
    const a=AUD[p.id];
    if(a&&['win','loss','none','exp'].includes(a.st)){
      const inp=audInput(p), rr=inp?audR(a,inp,audRules().rule):null;
      const L={win:'برد',loss:'استاپ خورد',none:'فعال نشد',exp:'منقضی'}[a.st];
      const pl=el('span','pill '+(a.st==='win'?'win':a.st==='loss'?'lose':'mut'),L+(rr!=null&&a.st!=='none'?' '+fmtR(rr):''));
      pl.title='نتیجه‌ی واقعی با کندل — جزئیات در کانال‌سنج';
      head.appendChild(pl);
    }
  }else if(isRes(p)){
    const cl=claimOfPost(p.id);
    if(cl&&cl.vd.v!=='?'){
      const pl=el('span','pill '+(cl.vd.v==='ok'?'win':'lose'),cl.vd.v==='ok'?'ادعا درست':'ادعا نادرست');
      pl.title=cl.vd.why;head.appendChild(pl);
    }
  }
  if(DB.edits[p.id]&&DB.edits[p.id].nums)head.appendChild(el('span','pill lose','ویرایش‌شده'));
  if(DB.gone[p.id])head.appendChild(el('span','pill lose','حذف از کانال'));
  /* تاریخ متن ساده است، نه لینک: وسط سربرگ بود و زدن روی آن به‌جای باز/بسته کردن پست به تلگرام می‌برد.
     لینک تلگرام یک دکمه‌ی کوچک جدا روی کارتِ باز است. */
  const wh=el('div','when',relTime(p.date)+(p.date?' · '+jStampFa(p.date):''));
  if(!lite&&p.link)wh.appendChild(el('a','tglink',ic('share')+'<span>تلگرام</span>'));
  if(!lite&&p.link){const a=wh.querySelector('.tglink');a.href=p.link;a.target='_blank';a.rel='noopener';a.title='دیدن همین پست در تلگرام';}
  head.appendChild(wh);
  card.appendChild(head);
  // خلاصه‌ی یک‌خطی — فقط وقتی کارت در آکاردئون بسته است دیده می‌شود
  {
    let sm='';
    if(isSig){
      const I=planInputsOf(p,sig,ov,px);
      sm=(I.entry!=null?'ورود <b dir="ltr">'+fmtPrice(I.entry)+'</b>':'')+
         (I.stop!=null?' · استاپ <b dir="ltr">'+fmtPrice(I.stop)+'</b>':'')+
         (px!=null&&I.entry?' · فاصله <b dir="ltr">'+fmtPct(((px-I.entry)/I.entry)*100*(I.dir==='long'?1:-1))+'</b>':'');
      if(dec)sm+=(sm?' · ':'')+(dec.action==='taken'?'وارد شدی':'نگرفتی');
    }
    if(!sm)sm=esc(String(p.text||'').split('\n').map(x=>x.trim()).find(Boolean)||'').slice(0,90);
    card.appendChild(el('div','csum',sm+'<i class="chev"></i>'));
  }
  if(lite){CARDS.set(p.id,card);return card;}

  if(p.img){
    const a=el('div','shot');a.setAttribute('role','button');a.setAttribute('aria-label','بزرگ‌نمایی تصویر');a.tabIndex=0;
    const im=el('img');im.loading='lazy';im.decoding='async';im.alt='تصویر سیگنال';
    a.onclick=()=>openLightbox(im);
    a.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLightbox(im);}};
    im.onload=()=>a.classList.add('loaded');
    im.onerror=()=>a.remove();
    im.src=p.img;
    if(im.complete&&im.naturalWidth)a.classList.add('loaded');
    a.appendChild(im);card.appendChild(a);
  }
  const body=el('div','body');
  if(p.reply&&(p.reply.text||p.reply.id))body.appendChild(buildReply(p));
  /* سیگنالی که ورود و استاپش خوانده شده، عددهایش همین پایین در خانه‌ها هست؛ متن خام پیش‌فرض
     دو خط می‌ماند تا کارت کوتاه شود. «متن کامل» همیشه در دسترس است. */
  const parsed=isSig&&sig.entry!=null&&sig.stop!=null&&(p.text||'').split('\n').length>2;
  const long=parsed||(p.text||'').length>320, col=long&&COLLAPSED[p.id]!==false;
  body.appendChild(el('div','txt'+(col?(parsed?' clamp2':' clamp'):''),linkify(esc(faN(p.text||'(بدون متن)')))));
  if(long){
    const b=el('button','more',col?(parsed?'متن کامل':'ادامه متن'):'بستن متن');
    b.onclick=()=>{COLLAPSED[p.id]=!col;rebuildCard(p);};
    body.appendChild(b);
  }
  card.appendChild(body);

  if(isSig){
    // جزئیات محاسبه فقط وقتی باز می‌شود که خودت خواسته باشی. تصمیم که گرفته شد
    // ماشین‌حساب دیگر به کار نمی‌آید، پس فقط سطر وضعیت می‌ماند.
    if(dec){
      card.appendChild(buildActions(p,sig,ov,px,dec));
    }else if(stale){
      card.appendChild(buildStale(p,sig));
    }else{
      card.appendChild(buildBrief(p,sig,ov,px));
    }
  }
  card.appendChild(buildMark(p,sig,ov,isSig,dec,px));
  CARDS.set(p.id,card);
  return card;
}
/* یک پست می‌تواند فقط بگوید «به نقطه ورود رسید» و معنی‌اش کاملاً به پستی باشد که
   جوابش را داده. تا حالا فقط 160 نویسه از آن دیده می‌شد؛ حالا خودِ پست اصلی باز می‌شود. */
const REPLYOPEN=new Set();
const findPost=id=>id?POSTS.find(x=>x.id===id||x.id.endsWith('/'+String(id).split('/').pop())):null;
function buildReply(p){
  const box=el('div','reply');
  const src=findPost(p.reply.id);
  const open=REPLYOPEN.has(p.id);
  const head=el('button','replyhead');
  head.innerHTML='<span>در پاسخ به: '+esc(p.reply.text||'(بدون متن)')+'</span>'+
    '<i class="'+(open?'op':'')+'"></i>';
  head.onclick=()=>{open?REPLYOPEN.delete(p.id):REPLYOPEN.add(p.id);rebuildCard(p);};
  box.appendChild(head);
  if(!open)return box;

  const full=el('div','replyfull');
  if(src){
    const sg=sigOf(src);
    if(sg.ticker){
      const bar=el('div','replysig');
      bar.appendChild(el('span','tick',esc(sg.ticker)));
      bar.appendChild(el('span','pill '+sg.direction,sg.direction==='long'?'لانگ':'شورت'));
      if(sg.entry!=null)bar.appendChild(el('span','pill mut','ورود '+fmtPrice(sg.entry)));
      if(sg.stop!=null)bar.appendChild(el('span','pill mut','استاپ '+fmtPrice(sg.stop)));
      full.appendChild(bar);
    }
    full.appendChild(el('div','replytxt',linkify(esc(faN(src.text||'(بدون متن)')))));
    if(src.img){
      const a=el('div','shot');a.setAttribute('role','button');a.setAttribute('aria-label','بزرگ‌نمایی تصویر');a.tabIndex=0;
      const im=el('img');im.loading='lazy';im.decoding='async';im.alt='تصویر پست اصلی';
      im.onload=()=>a.classList.add('loaded');im.onerror=()=>a.remove();im.src=src.img;
      a.onclick=()=>openLightbox(im);
      a.appendChild(im);full.appendChild(a);
    }
    const go=el('button','mark ghost','رفتن به پست اصلی');
    go.onclick=()=>{
      { const bs=bucketOf(src); if(bs!==bucket)bucket=bs; }
      coinFilter=null;shownMax=Math.max(shownMax,POSTS.indexOf(src)+5);
      renderSignals();
      const c=CARDS.get(src.id);
      if(c){c.scrollIntoView({behavior:'smooth',block:'center'});c.classList.add('flashcard');
        setTimeout(()=>c.classList.remove('flashcard'),1600);}
    };
    full.appendChild(go);
  }else{
    full.appendChild(el('div','replytxt',
      'پست اصلی در حافظه نیست — احتمالاً قدیمی‌تر از آن است که خوانده شده.<br>'+
      'با «پست‌های قدیمی‌تر» پایین صفحه بیاورش، بعد دوباره اینجا را باز کن.'));
    if(p.reply.link)full.appendChild(el('div',null,
      '<a href="'+esc(p.reply.link)+'" target="_blank" rel="noopener" '+
      'style="font-size:12px;color:var(--gold)">دیدن در تلگرام</a>'));
  }
  box.appendChild(full);
  return box;
}
function rebuildCard(p){
  const old=CARDS.get(p.id);
  if(!old||!old.parentNode)return renderSignals();
  // حالت آکاردئونی کارت هم باید بماند، وگرنه کارت بازشده دیگر با زدن بسته نمی‌شد
  const lite=old.classList.contains('tight'), acc=lite||old.classList.contains('accopen');
  const fresh=buildCard(p,lite);
  if(acc)accWire(fresh,p,!lite);
  swipeWire(fresh,p);
  old.replaceWith(fresh);
}

function planInputsOf(p,sig,ov,px){
  const market=ov.market||sig.market||'futures';
  const spot=market==='spot';
  const dir=spot?'long':(ov.dir||sig.direction);   // اسپات شورت ندارد
  const entry=ov.entry!=null?ov.entry:(sig.entry!=null?sig.entry:px);
  const entryAssumed=(ov.entry==null&&sig.entry==null&&px!=null);
  const stop=ov.stop!=null?ov.stop:sig.stop;
  const lev=spot?1:(ov.lev!=null?ov.lev:sig.leverage);
  const amt=ov.amt>0?ov.amt:S.cap;   // مبلغ همین سیگنال؛ اگر دستی نداده باشی همان پیش‌فرض تنظیمات
  return {market,spot,marketGuess:!ov.market&&!!sig.marketGuess,dir,entry,entryAssumed,stop,lev,
    amt,amtManual:ov.amt>0,
    levSrc:spot?'':(ov.lev!=null?' (دستی)':(sig.leverage!=null?' (کانال)':''))};
}
const MKT_LABEL={futures:'فیوچرز',spot:'اسپات'};
/* مبلغِ همین معامله. پیش‌فرضش «مارجین هر معامله»ی تنظیمات است، ولی هر سیگنال
   می‌تواند مبلغ خودش را داشته باشد؛ حجم، ضرر در استاپ، سود تارگت‌ها، ورود سریع و
   فرم ورود همه از همین عدد حساب می‌شوند. */
const AMT_CHIPS=[10,25,50,100];
// مبلغ‌های آماده از تنظیمات («مبلغ‌های آماده»)؛ نبودش یعنی همان چهار عدد پیش‌فرض
const amtPresets=()=>Array.isArray(S.amtChips)&&S.amtChips.length?S.amtChips.map(Number).filter(x=>x>0):AMT_CHIPS;
const amtChips=()=>[...new Set([...amtPresets(),+(+S.cap).toFixed(2)])].sort((a,b)=>a-b);
/* ---- کادر مبلغ با جداکننده‌ی هزارگان ----
   type=number جداکننده نمی‌پذیرد، پس این کادرها متنی‌اند با صفحه‌کلید عددی؛ موقع تایپ
   «1250.5» می‌شود «1,250.5» و مکان‌نما سر جایش می‌ماند. خواندنش همیشه با moneyVal. */
const moneyVal=i=>{const v=parseFloat(normDig(String(i&&i.value!=null?i.value:i)).replace(/[^\d.]/g,''));return isFinite(v)?v:NaN;};
const fmtMoneyIn=v=>{if(v==null||v===''||!isFinite(+v))return '';const [a,b]=String(+(+v).toFixed(8)).split('.');
  return a.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(b?'.'+b:'');};
function moneyInput(i){
  if(!i||i.dataset.money)return;i.dataset.money='1';
  i.type='text';i.inputMode='decimal';i.autocomplete='off';i.dir='ltr';
  const re=()=>{
    const v=normDig(i.value), c=i.selectionStart==null?v.length:i.selectionStart;
    const keep=v.slice(0,c).replace(/[^\d.]/g,'').length;          // چند رقم/نقطه قبل از مکان‌نما بود
    let raw=v.replace(/[^\d.]/g,'');const d=raw.indexOf('.');
    if(d>=0)raw=raw.slice(0,d+1)+raw.slice(d+1).replace(/\./g,'');
    const [a,b]=raw.split('.');
    const out=(a||'').replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,',')+(b!=null?'.'+b:'');
    if(out===i.value)return;
    i.value=out;
    let n=0,pos=out.length;for(let k=0;k<out.length;k++){if(n>=keep){pos=k;break;}if(/[\d.]/.test(out[k]))n++;}
    try{i.setSelectionRange(pos,pos);}catch(e){}
  };
  i.addEventListener('input',re);
  if(i.value)i.value=fmtMoneyIn(moneyVal(i));
}
const amtEq=(a,b)=>Math.abs(a-b)<1e-9;
function amtRow(cur,onPick,spot,bare){
  const w=el('div','amt');
  if(!bare)w.appendChild(el('span','amtl',spot?'مبلغ خرید':'مارجین'));
  const ch=el('div','amtch'), list=amtChips();
  for(const v of list){
    const on=amtEq(v,cur);
    const b=el('button','amtb'+(on?' on':''),faN(v)+'$');
    b.type='button';b.setAttribute('aria-pressed',on?'true':'false');
    b.onclick=()=>{if(!amtEq(v,cur))onPick(v);};
    ch.appendChild(b);
  }
  w.appendChild(ch);
  if(bare)return w;   // در فرم ورود، کادر عدد و کشویی خودشان کنار همین‌اند
  const i=el('input','amtin'+(list.some(v=>amtEq(v,cur))?'':' on'));
  i.placeholder='دستی $';i.value=fmtMoneyIn(+(+cur).toFixed(2));
  i.setAttribute('aria-label','مبلغ دلخواه به دلار');
  moneyInput(i);
  i.onchange=()=>{const v=moneyVal(i);
    if(v>0){if(!amtEq(v,cur))onPick(v);}else i.value=fmtMoneyIn(+(+cur).toFixed(2));};
  i.onkeydown=e=>{if(e.key==='Enter')i.blur();};
  w.appendChild(i);
  return w;
}
/* مبلغی برابر پیش‌فرض را ذخیره نمی‌کنیم تا اگر پیش‌فرض را عوض کردی، این سیگنال هم دنبالش برود */
const setAmt=(p,v)=>setOv(p,'amt',amtEq(v,S.cap)?null:v);
/* کلید دوحالته‌ی بازار. اسپات و فیوچرز دو ماشین‌حساب متفاوت‌اند، پس این کلید
   فقط یک برچسب نیست: با زدنش همه‌ی اعداد پایین عوض می‌شوند. */
/* وقتی خودِ پست صریح گفته فیوچرز است یا اسپات، کلید لازم نیست: یک برچسب بس است
   و با زدنش هنوز می‌شود عوضش کرد. کلیدِ دوتکه فقط برای حالتِ حدس می‌ماند، چون
   آنجاست که واقعاً باید انتخاب کنی. */
function mktBadge(cur,onFlip){
  const other=cur==='futures'?'spot':'futures';
  const b=el('button','mkttag',ic(cur==='spot'?'wallet':'bolt')+'<span>'+MKT_LABEL[cur]+'</span>');
  b.title='برای عوض کردن به '+MKT_LABEL[other]+' بزن';
  b.onclick=()=>onFlip(other);
  return b;
}
function mktPicker(cur,onPick,guess){
  const w=el('div','mkt'+(guess?' guess':''));
  for(const k of ['futures','spot']){
    const b=el('button','mktb'+(cur===k?' on':''),ic(k==='spot'?'wallet':'bolt')+'<span>'+MKT_LABEL[k]+'</span>');
    b.setAttribute('aria-pressed',cur===k?'true':'false');
    b.title=k==='spot'?'خرید نقدی: بدون اهرم، بدون لیکوئید':'با اهرم و مارجین، لیکوئید دارد';
    b.onclick=()=>{if(cur!==k)onPick(k);};
    w.appendChild(b);
  }
  if(guess)w.appendChild(el('span','mkthint','حدس'));
  return w;
}
function mktToggle(cur,guess,onPick){
  return guess?mktPicker(cur,onPick,true):mktBadge(cur,onPick);
}
/* حالت بسته: فقط آنچه برای تصمیم لازم است، به‌علاوه‌ی دو دکمه. باز کردن جزئیات
   یک کار جداست تا لیست بلند نشود و پیمایش سنگین نشود. */
function buildBrief(p,sig,ov,px){
  const I=planInputsOf(p,sig,ov,px);
  const w=el('div','brief');
  const kv=el('div','briefkv');
  const add=(l,v,c)=>{const d=el('div','bk');d.appendChild(el('b',null,l));
    d.appendChild(el('span',c||null,v));kv.appendChild(d);};
  add(I.spot?'قیمت خرید':'ورود',I.entry!=null?fmtPrice(I.entry):'—');
  add('حد ضرر',I.stop!=null?fmtPrice(I.stop):'—');
  // کانال با کراس کار می‌کند؛ در ایزوله اهرمِ بیشتر از این، لیکوئید را جلوتر از استاپ می‌آورد
  if(!I.spot&&I.entry&&I.stop){const sd=Math.abs(I.entry-I.stop)/I.entry*100;
    add('اهرم امن ایزوله','تا '+faN(isoLev(sd))+'x',sd>15?'w':null);}
  if(px!=null&&I.entry){
    const gap=((px-I.entry)/I.entry)*100*(I.dir==='long'?1:-1);
    add('فاصله تا ورود',fmtPct(gap),gap>3?'d':(gap>0?'w':'u'));
  }else add('قیمت الان','—','m');
  w.appendChild(kv);
  /* کلیدی که قبل از هر عددی تکلیف را روشن می‌کند: اسپات یا فیوچرز */
  w.appendChild(mktToggle(I.market,I.marketGuess,k=>setOv(p,'market',k,true)));
  if(!decisionOf(p.id))w.appendChild(amtRow(I.amt,v=>setAmt(p,v),I.spot));
  const a=el('div','acts');
  const b1=el('button','btn ok',ic('check')+'<span>بررسی و ورود</span>');
  // یک مرحله: همان فرم ورود — نردبان، مبلغ، اهرم، سود هر تارگت و هشدارها همه آنجاست
  b1.onclick=()=>sheetEnter(p,sig,ov,px);
  const b2=el('button','btn no',ic('x')+'<span>وارد نشدم</span>');
  b2.onclick=()=>sheetSkip(p,sig,ov,px);
  a.appendChild(b1);a.appendChild(b2);
  /* ورود سریع میان‌بُرِ همان دکمه‌ی اول است، نه کارِ سومی: کنارش و کوچک‌تر،
     وگرنه دو دکمه‌ی طلاییِ هم‌وزن روبه‌روی هم می‌نشینند و انتخاب سخت می‌شود. */
  if(F('quick')&&!decisionOf(p.id)){
    const q=el('button','btn xs side',ic('bolt')+'<span>سریع '+faN(+I.amt.toFixed(2))+'$</span>');
    q.title='ورود با اعداد پیش‌فرض، در یک تأیید';
    q.onclick=()=>quickEnter(p,sig,ov,px);
    a.appendChild(q);
  }
  // سیگنالی که تریگر دارد و هنوز نرسیده: به‌جای ورود زودهنگام، منتظرش می‌مانیم
  const trg=sig.trigger!=null?sig.trigger:(I.entry!=null?I.entry:null);
  const already=DB.pending.some(x=>x.postId===p.id);
  if(trg!=null&&!already){
    const b3=el('button','btn xs side','منتظر '+fmtPrice(trg));
    b3.title='تا رسیدن قیمت به این عدد صبر کن';
    b3.onclick=()=>addPending(p,sig,trg,px);
    a.appendChild(b3);
  }else if(already)a.appendChild(el('span','markhint','در فهرست منتظرها'));
  if(DB.revived[p.id]){
    const u=el('button','btn xs side','منقضی کن');
    u.title='برگرداندن را پس بگیر';
    u.onclick=()=>unrevive(p);
    a.appendChild(u);
  }
  w.appendChild(a);
  return w;
}
function buildActions(p,sig,ov,px,dec){
  const a=el('div','acts');
  {
    const info=el('div',null,'<span style="font-size:12.5px;color:var(--tx2)">'+
      (dec.action==='taken'?'ثبت شده در پوزیشن‌ها':'در آرشیو نگرفته‌ها')+
      ' · '+jStampFa(new Date(dec.at))+(dec.reason?' · '+esc(dec.reason):'')+'</span>');
    info.style.flex='1';info.style.minWidth='140px';
    a.appendChild(info);a.classList.add('mini');
    if(dec.action==='taken'&&dec.posId){
      const g=el('button','btn xs','برو به پوزیشن');
      g.onclick=()=>{go('positions');setTimeout(()=>{
        const n=document.getElementById('pos-'+dec.posId);
        if(n)n.scrollIntoView({behavior:'smooth',block:'center'});},120);};
      a.appendChild(g);
    }
    const u=el('button','btn xs dgr','لغو تصمیم');
    u.onclick=()=>{
      if(dec.action==='taken'&&dec.posId&&DB.positions.some(x=>x.id===dec.posId)){
        return undoable('تصمیم و پوزیشنش لغو شد',()=>{
          DB.positions=DB.positions.filter(x=>x.id!==dec.posId);delete DB.decisions[p.id];});
      }
      undoable('تصمیم لغو شد',()=>{delete DB.decisions[p.id];});
    };
    a.appendChild(u);
  }
  return a;
}
function setOv(p,k,v,isStr){
  const id=p.id;
  OVERRIDE[id]=OVERRIDE[id]||{};
  if(v===null||v===''||(!isStr&&!isFinite(v)))delete OVERRIDE[id][k];
  else OVERRIDE[id][k]=v;
  if(!Object.keys(OVERRIDE[id]).length)delete OVERRIDE[id];
  DB.overrides=OVERRIDE; save();
  PCACHE.delete(id);
  rebuildCard(p);
}
/* دکمه‌های زیر هر پست دو جنس متفاوت‌اند و قبلاً هر دو یک شکل بودند:
     1) «این پست را کجا بگذارم؟»  آرشیو، نتایج، آموزش — سه جای مشخص، سه کلید هم‌اندازه
        که وقتی پست آنجاست روشن می‌مانند. همیشه همان سه‌تا، همیشه همان ترتیب،
        پس با عادت پیدا می‌شوند نه با خواندن.
     2) «این پست سیگنال هست یا نه؟»  یک کلید جدا، چون معنی‌اش با آن سه فرق دارد.
   تشخیص خودکار همیشه کار نمی‌کند، پس هر دو جنس قابل نقض دستی‌اند. */
function fileChip(icon,label,on,hint,onClick,extra){
  const b=el('button','fchip'+(on?' on':'')+(extra?' '+extra:''),ic(icon)+'<span>'+label+'</span>');
  b.setAttribute('aria-pressed',on?'true':'false');
  b.title=hint;
  b.onclick=onClick;
  return b;
}
function buildMark(p,sig,ov,isSig,dec,px){
  const row=el('div','prow');

  const tray=el('div','ftray');
  const bk=bucketOf(p);
  const ar=bk==='arch', rs=isRes(p), au=rs&&resAuto(p), ls=isLesson(p.id);
  tray.appendChild(fileChip('box','آرشیو',ar,
    ar?'برگرداندن از آرشیو':'کنار گذاشتن این پست',
    ()=>{if(ar){setArch(p.id,false);toast('برگشت به فعال','info');}
      else undoable('به آرشیو رفت',()=>{DB.archived[p.id]=Date.now();});}));
  tray.appendChild(fileChip('flag','نتیجه',rs,
    au?'خودش نتیجه تشخیص داده شد — بزن تا برگردد':(rs?'برگرداندن از نتایج':'فرستادن به نتایج'),
    ()=>{setRes(p,!rs);toast(rs?'از نتایج برداشته شد':'به نتایج رفت','info');},
    au?'auto':''));
  tray.appendChild(fileChip('book','آموزش',ls,
    ls?'برداشتن از آموزش‌ها':'نگه داشتن به‌عنوان آموزش',
    ()=>{ls?removeLesson(p.id):addLesson(p);}));
  row.appendChild(tray);

  // کلید «سیگنال یا نه» — بعد از تصمیم دیگر معنی ندارد، پس نمی‌آید
  if(!dec){
    const sw=el('div','psig');
    if(isSig){
      const b=el('button','plink',ic('x')+'<span>سیگنال نیست</span>');
      b.title='از فهرست سیگنال‌ها بردار';
      b.onclick=()=>{setOv(p,'sig',false,true);toast('از سیگنال‌ها برداشته شد','info');};
      sw.appendChild(b);
      if(ov.sig!=null)sw.appendChild(el('span','markhint','دستی علامت خورده'));
      // کانال عددها را روی تصویر می‌دهد: همان‌جا واردشان کن (ورود، استاپ، تارگت ۱ تا ۳)
      if(p.img){
        const done=ov.stop!=null;
        const c=el('button',done?'plink':'padd',ic(done?'check':'edit')+'<span>'+(done?'عددهای چارت ثبت شده':'عددها از روی چارت')+'</span>');
        c.onclick=()=>sheetImgFill([p.id],new Map(),0);
        sw.appendChild(c);
      }
    }else{
      const b=el('button','padd',ic('plus')+'<span>افزودن به سیگنال‌ها</span>');
      b.title='نماد و اعداد را بده تا ماشین‌حساب رویش فعال شود';
      b.onclick=()=>sheetMarkSignal(p,sig);
      sw.appendChild(b);
      if(ov.sig===false){
        const u=el('button','plink',ic('undo')+'<span>برگردان به خودکار</span>');
        u.onclick=()=>{setOv(p,'sig',null);toast('برگشت به حالت خودکار','info');};
        sw.appendChild(u);
      }
    }
    row.appendChild(sw);
  }
  return row;
}
function sheetMarkSignal(p,sig){
  const t=normDig(p.text||'');
  /* نمادهای محتمل: هرچه در متن هست و در فهرست صرافی هم پیدا می‌شود. اگر تشخیص خودکار
     چیزی نیافته، دست‌کم گزینه‌ها جلوی چشم باشد تا تایپ نکنی. */
  const guesses=[...new Set((t.match(/\b[A-Za-z]{2,10}\b/g)||[])
    .map(x=>x.toUpperCase()).filter(x=>!BLOCK.has(x)&&SYMBOLS.has(x)))];
  for(const tok of (t.match(/\b[A-Za-z]{3,12}\b/g)||[])){
    const sym=EN_COIN[tok.toLowerCase()];
    if(sym&&!guesses.includes(sym))guesses.push(sym);
  }
  const fa=faNorm(t);
  for(const [re,sym] of FA_COIN)if(re.test(fa)&&!guesses.includes(sym))guesses.push(sym);
  const all=[...SYMBOLS].sort();
  const start=sig.ticker||guesses[0]||'';
  openSheet(
   '<h3>افزودن به سیگنال‌ها</h3>'+
   '<div class="sub">این کار <b>پوزیشن باز نمی‌کند</b> — فقط پست را به فهرست سیگنال‌ها می‌برد '+
   'تا ماشین‌حساب رویش فعال شود.</div>'+
   '<div class="fld"><label>نماد</label>'+
     '<input id="f_tk" dir="ltr" list="symlist" placeholder="BTC" value="'+esc(start)+'">'+
     '<datalist id="symlist">'+all.slice(0,900).map(x=>'<option value="'+esc(x)+'"></option>').join('')+'</datalist>'+
     '<div class="pxnote" id="pxNote"></div></div>'+
   (guesses.length?'<div class="guessrow" id="guessRow">'+
     guesses.slice(0,6).map(g=>'<button class="catchip" data-g="'+esc(g)+'">'+esc(g)+'</button>').join('')+
     '</div>':'')+
   '<div class="grid" style="margin-top:10px">'+
     '<div class="fld"><label>جهت</label><select id="f_d">'+
       '<option value="long"'+(sig.direction==='long'?' selected':'')+'>لانگ</option>'+
       '<option value="short"'+(sig.direction==='short'?' selected':'')+'>شورت</option></select></div>'+
     fldHtml('en','قیمت ورود سیگنال',sig.entry!=null?sig.entry:'')+
   '</div>'+
   '<div class="grid" style="margin-top:10px">'+
     fldHtml('st','حد ضرر سیگنال',sig.stop!=null?sig.stop:'')+
     fldHtml('tr','تریگر ورود (اختیاری)',sig.trigger!=null?sig.trigger:'')+
   '</div>'+
   '<div class="hint">اگر پست عددی نداده، نماد را که بزنی قیمت روز به‌عنوان ورود پیشنهاد می‌شود. '+
   '«تریگر» یعنی تا قیمت به آن نرسیده وارد نمی‌شوی.</div>'+
   '<div class="srow"><button class="btn pri" id="ok">ثبت سیگنال</button>'+
   '<button class="btn" id="cx">انصراف</button></div>',
   ()=>{
     const tkEl=$('#f_tk');
     /* نماد که عوض شود قیمت روز را نشان می‌دهیم، و اگر کادر ورود خالی است پرش می‌کنیم —
        چون در سیگنال‌های «همین الان بخر» عددی در متن نیست. */
     const syncPx=()=>{
       const tk=(tkEl.value||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
       const px=tk?PRICES.get(tk):null;
       const n=$('#pxNote');
       if(!tk){n.textContent='';return;}
       if(px==null){n.innerHTML='<span class="bad">قیمتی برای '+esc(tk)+' پیدا نشد</span>';return;}
       n.innerHTML='قیمت الان <b>'+fmtPrice(px)+'</b>';
       const e=$('#f_en');
       if(!e.value)e.value=roundP(px);
     };
     tkEl.oninput=syncPx; tkEl.onchange=syncPx;
     const gr=$('#guessRow');
     if(gr)gr.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{
       tkEl.value=b.dataset.g;syncPx();});
     syncPx();
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{
       const tk=(tkEl.value||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
       if(!tk){toast('نماد را بنویس','err');return;}
       const id=p.id;
       OVERRIDE[id]=Object.assign({},OVERRIDE[id],{sig:true,ticker:tk,dir:$('#f_d').value});
       for(const [k,f] of [['entry','f_en'],['stop','f_st'],['trigger','f_tr']]){
         const v=num(f);
         if(v!=null)OVERRIDE[id][k]=v; else delete OVERRIDE[id][k];
       }
       DB.overrides=OVERRIDE; save(); PCACHE.delete(id);
       closeSheet(); renderAll(); toast(tk+' به سیگنال‌ها اضافه شد — پوزیشنی باز نشد','ok');
     };
   });
}
function snapOf(p,sig,entry,stop){
  return {ticker:sig.ticker||null,dir:sig.direction,entry:entry||sig.entry||null,
    stop:stop||sig.stop||null,targets:sig.targets||[],postAt:p.date?p.date.getTime():null,link:p.link};
}

/* ---- ورق «وارد شدم» ---- */
/* ورود با پیش‌فرض‌ها: همان اعدادی که فرم کامل هم می‌ساخت، ولی در یک تأیید.
   اگر چیزی سر جایش نباشد (استاپ ندارد، استاپ بعد از لیکوئید) به فرم کامل می‌فرستد. */
function quickEnter(p,sig,ov,px){
  const I=planInputsOf(p,sig,ov,px);
  const entry=I.entry||px;
  if(!entry||!I.stop){
    toast('برای ورود سریع، ورود و حد ضرر لازم است','err');
    return sheetEnter(p,sig,ov,px);
  }
  const r=computePlan({direction:I.dir,entry,stop:I.stop,live:px,capital:I.amt,
    riskPct:S.risk,maxLeverage:S.maxLev,leverageOverride:I.lev,mode:S.mode,
    rMultiples:S.rMul,market:I.market});
  if(!r.ok){toast('پلن کامل نشد','err');return sheetEnter(p,sig,ov,px);}
  if(r.warnings.includes('liq-before-stop')){
    toast('با این اعداد استاپ بعد از لیکوئید می‌افتد — فرم کامل باز شد','err');
    return sheetEnter(p,sig,ov,px);
  }
  const lev=+r.leverage.toFixed(2);
  const gate=entryGate(r.actualRisk);
  if(gate.length&&!confirm('⚠️ '+gate.join('\n\n')+'\n\nباز هم وارد می‌شوی؟'))return;
  const gateV=gate.length?[{k:'gate',at:Date.now(),t:gate.join(' ')}]:undefined;
  /* بیشتر پست‌های کانال نمی‌گویند فیوچرز است یا اسپات. جلوی ورود سریع را نمی‌گیریم،
     ولی حدس را توی همان پنجره‌ی تأیید صریح می‌نویسیم تا کسی ندانسته فیوچرز نگیرد. */
  if(!confirm((I.spot?'خرید اسپات ':'ورود ')+(sig.ticker||'')+
    (I.spot?'':' '+(I.dir==='long'?'لانگ':'شورت'))+'\n\n'+
    'بازار: '+MKT_LABEL[I.market]+(I.marketGuess?' (حدس — پست نگفته بود)':'')+'\n'+
    'ورود: '+fmtPrice(entry)+'\nحد ضرر: '+fmtPrice(I.stop)+'\n'+
    (I.spot?'مبلغ خرید: '+fmtUsd(I.amt)+'\nمقدار: '+(+r.qty.toPrecision(6))+'\n'
           :'مارجین: '+fmtUsd(I.amt)+'\nاهرم: '+lev+'x\nحجم: '+fmtUsd(r.notional)+'\n')+
    'ضرر در استاپ: '+fmtUsd(-r.actualRisk)+' ('+r.actualRiskPct.toFixed(1)+'٪)\n'+
    (r.liqPrice?'لیکوئید: '+fmtPrice(r.liqPrice)+'\n':'')+'\nثبت شود؟'))return;
  const pos=ensureBase({id:uid(),sigId:p.id,ticker:sig.ticker||'—',kind:I.spot?'spot':'futures',
    dir:I.dir,entry,
    stop:I.stop,stop0:I.stop,margin:I.amt,baseMargin:I.amt,lev,
    targets:sig.targets||[],openedAt:Date.now(),status:'open',
    exitPrice:null,closedAt:null,fees:null,note:'ورود سریع',partials:[],log:[],viol:gateV,
    src:{link:p.link,text:(p.text||'').slice(0,400),img:p.img||null,at:p.date?p.date.getTime():null}});
  logAdd(pos,'open',I.spot?('خرید سریع اسپات '+fmtUsd(I.amt)+' روی '+fmtPrice(entry))
                          :('ورود سریع با '+fmtUsd(I.amt)+' مارجین و اهرم '+lev+'x روی '+fmtPrice(entry)));
  if(pbTps(pos).length&&pbAttach(pos,pbDefault()))logAdd(pos,'plan','نقشه‌ی خروج: '+pos.pb.n);
  DB.positions.push(pos);
  DB.decisions[p.id]={action:'taken',at:Date.now(),posId:pos.id,market:I.spot?'spot':'futures',
    snap:snapOf(p,sig,entry,I.stop)};
  save();renderAll();toast(I.spot?'خرید اسپات ثبت شد':'پوزیشن ثبت شد','ok');
}
/* یک ورق برای هر دو بازار. اسپات همان فرم است با اهرم قفلِ 1: نه لیکوئید دارد،
   نه کشویی اهرم، و به‌جای «مارجین» می‌گوید «مبلغ خرید» و مقدار ارز را نشان می‌دهد. */
/* نوسان معمول: میانگین دامنه‌ی واقعی 14 کندل یک‌ساعته‌ی اخیر (ATR) به درصد قیمت؛ نیم ساعت در حافظه */
const VOLC=new Map();
async function volOf(tk){
  if(!tk)return null;
  const c=VOLC.get(tk);if(c&&Date.now()-c.at<30*60000)return c;
  try{
    const H1=3600000, C=await audCandles(tk,'1h',Math.floor((Date.now()-30*H1)/H1)*H1,30);
    if(!C||C.length<15)return null;
    const n=14;let s=0;
    for(let i=C.length-n;i<C.length;i++){const k=C[i],pc=C[i-1].c;s+=Math.max(k.h-k.l,Math.abs(k.h-pc),Math.abs(k.l-pc));}
    const r={at:Date.now(),atr:s/n,pct:(s/n)/C[C.length-1].c*100};
    VOLC.set(tk,r);return r;
  }catch(e){return null;}
}
/* نوار «استاپ در برابر لیکوئید»: از ورود تا لیکوئید، استاپ کجای آن است. سبز یعنی جای نفس کشیدن هست. */
function liqStopBar(sd,ld){
  const mx=Math.max(sd,ld)*1.12, pct=x=>Math.min(100,x/mx*100);
  const k=sd>=ld?'bad':(sd>ld*.75?'warn':'ok');
  const w=el('div','lsb '+k);
  w.innerHTML='<div class="lsbt"><span>ورود</span><span>استاپ <b dir="ltr">'+(sd*100).toFixed(1)+'%</b></span>'+
    '<span>لیکوئید <b dir="ltr">'+(ld*100).toFixed(1)+'%</b></span></div>'+
    '<div class="lsbb"><i class="lsbs" style="width:'+pct(sd)+'%"></i><i class="lsbl" style="right:'+pct(ld)+'%"></i></div>'+
    '<div class="lsbm">'+(k==='bad'?'لیکوئید پیش از استاپ است — اهرم را کم کن'
      :k==='warn'?'استاپ نزدیک لیکوئید است'
      :'بین استاپ و لیکوئید '+((ld-sd)*100).toFixed(1)+'٪ فاصله هست')+'</div>';
  return w;
}
function sheetEnter(p,sig,ov,px){
  let MK=(planInputsOf(p,sig,ov,px)).market;
  const I0=planInputsOf(p,sig,ov,px);
  const entry0=I0.entry||px||'', stop0=I0.stop||'', amt0=I0.amt;
  // اهرمی که کانال گفته یا خودت روی سیگنال گذاشته‌ای، دستی می‌نشیند؛ وگرنه خودکار
  const lev0=I0.spot?null:(I0.lev>0?Math.min(I0.lev,S.maxLev):null);
  let pbSel=pbDefault();          // سبک خروجِ همین پوزیشن؛ پیش‌فرض از تنظیمات
  const maxMargin=Math.ceil(Math.max(amt0*2,S.cap*4,...AMT_CHIPS,Math.min(S.acct,1000)));
  const spot=()=>MK==='spot';
  let VOL=null;
  openSheet(
   '<h3>ثبت ورود'+(sig.ticker?' · '+esc(sig.ticker):'')+'</h3>'+
   '<div id="mktBox"></div>'+
   '<div class="sub" id="entSub"></div>'+
   '<div id="entLad"></div>'+
   '<div class="grid">'+
     fldHtml('e','قیمت ورود واقعی',entry0)+fldHtml('s','حد ضرر',stop0)+
   '</div>'+
   '<div class="sldrow"><label id="lbl_m" for="f_m">مارجین ($)</label>'+
     '<input type="range" id="r_m" min="1" max="'+maxMargin+'" step="1" value="'+amt0+'" aria-labelledby="lbl_m">'+
     '<input type="number" id="f_m" step="any" inputmode="decimal" value="'+amt0+'"></div>'+
   '<div id="amtBox"></div>'+
   /* اهرم: دستگیره‌ی طلایی مثل دستگیره‌ی استاپ، روی نواری که ناحیه‌ی امن (استاپ قبل از
      لیکوئید) را سبز و بقیه را قرمز نشان می‌دهد */
   '<div class="levbox" id="levRow">'+
     '<div class="levhd"><span class="levt">'+ic('bolt')+'اهرم</span>'+
       '<span class="levv"><button type="button" class="levst" data-d="-1" aria-label="اهرم کمتر">−</button>'+
         '<input type="number" id="f_l" step="any" inputmode="decimal" aria-label="اهرم" value="'+(lev0||'')+'"><em>x</em>'+
         '<button type="button" class="levst" data-d="1" aria-label="اهرم بیشتر">+</button></span>'+
       '<label class="autotog" id="autoRow" title="اهرمی که ضررِ خوردنِ استاپ را دقیقاً به ریسک هدف می‌رساند">'+
         '<input type="checkbox" id="f_auto"'+(lev0?'':' checked')+'><span>'+ic('bolt')+'خودکار</span></label></div>'+
     '<div class="levtrack"><input type="range" id="r_l" min="1" max="'+S.maxLev+'" step="0.5" value="'+(lev0||1)+'"></div>'+
     '<div class="levticks" id="levTicks"></div>'+
   '</div>'+
   '<div class="grid" style="margin-top:10px">'+
     '<div class="fld" id="dirRow"><label>جهت</label><select id="f_d">'+
       '<option value="long"'+(I0.dir==='long'?' selected':'')+'>لانگ</option>'+
       '<option value="short"'+(I0.dir==='short'?' selected':'')+'>شورت</option></select></div>'+
     '<div class="fld"><label>یادداشت</label><input id="f_n" placeholder="چرا وارد شدی؟"></div>'+
   '</div>'+
   tagPickHtml()+
   '<div id="riskBox"></div>'+
   '<div id="gateBox" class="gatebox hide"></div>'+
   '<div id="prev" class="kv" style="margin-top:12px"></div>'+
   '<div id="pbBox" class="pbx pbsheet"></div>'+
   '<div class="srow"><button class="btn pri" id="ok">ثبت پوزیشن</button>'+
   '<button class="btn" id="cx">انصراف</button></div>',
   sh=>{
     const auto=()=>spot()?false:$('#f_auto').checked;
     const grab=()=>({entry:num('f_e'),stop:num('f_s'),margin:num('f_m'),
       lev:spot()?1:num('f_l'),dir:spot()?'long':$('#f_d').value,
       note:($('#f_n').value||'').trim()});
     /* عوض کردن بازار فرم را نمی‌سازد دوباره — فقط چیزهایی که به فیوچرز ربط دارند
        را پنهان/نمایان می‌کند تا عددهایی که وارد کرده‌ای از بین نروند. */
     const paintMkt=()=>{
       const mb=$('#mktBox');mb.innerHTML='';
       mb.appendChild(mktPicker(MK,k=>{MK=k;paintMkt();upd();}));
       const sp=spot();
       $('#levRow').classList.toggle('hide',sp);
       $('#autoRow').classList.toggle('hide',sp);
       $('#dirRow').classList.toggle('hide',sp);
       $('#lbl_m').textContent=sp?'مبلغ خرید ($)':'مارجین ($)';
       $('#ok').textContent=sp?'ثبت خرید اسپات':'ثبت پوزیشن';
       $('#entSub').innerHTML=sp
         ?'خرید نقدی: اهرم ندارد و لیکوئید نمی‌شوی. مبلغ را بده تا مقدار ارز و ضررِ خوردنِ استاپ را بگوید.'
         :'دستگیره‌ی طلایی را بکش تا حد ضرر جابجا شود. مبلغ را بده، اهرم را خودش حساب می‌کند تا ضررِ خوردنِ استاپ همان ریسک هدفت باشد (الان '+faN(S.risk)+'٪ مارجین).';
       if(sp){$('#f_l').value=1;$('#r_l').value=1;}
     };
     /* اهرمی که ضررِ خوردن استاپ را دقیقاً به ریسک هدف می‌رساند. همان فرمول computePlan
        است تا عددِ کارت و عددِ این فرم هیچ‌وقت با هم فرق نکنند. */
     const levFor=v=>{
       if(!v.entry||!v.stop||v.entry<=0)return null;
       const sd=Math.abs(v.entry-v.stop)/v.entry;
       if(!(sd>0))return null;
       return {lev:clamp((S.risk/100)/sd,1,S.maxLev),sd,capped:(S.risk/100)/sd>S.maxLev};
     };
     /* نردبان همان چیزی است که در پوزیشن‌ها هست؛ اینجا فقط استاپش به کادر فرم وصل شده.
        وسط کشیدن دستگیره بازسازی‌اش نمی‌کنیم وگرنه درگ قطع می‌شود. */
     const drawLad=()=>{
       const v=grab(), host=$('#entLad');
       if(!host)return;
       if(!v.entry||!v.lev){host.innerHTML='';return;}
       const fake={id:'__ent',ticker:sig.ticker||'—',dir:v.dir,entry:v.entry,stop:v.stop||null,
         stop0:v.stop||null,margin:v.margin||amt0,baseMargin:v.margin||amt0,lev:v.lev,
         targets:sig.targets||[],status:'open',partials:[],log:[],openedAt:Date.now()};
       const m=posMetrics(fake,px);
       host.innerHTML='';
       host.appendChild(buildLadder(fake,px,m,{
         onStop:val=>{$('#f_s').value=val;updNums();},
         onStopEnd:()=>upd()
       }));
       destackAll();
     };
     const updNums=()=>{
       let v=grab();
       const a=levFor(v);
       if(auto()){
         $('#f_l').readOnly=true;$('#r_l').disabled=true;
         $('#f_l').value=a?(+a.lev.toFixed(2)):'';
         if(a)$('#r_l').value=a.lev;
         v=grab();
       }else{$('#f_l').readOnly=false;$('#r_l').disabled=false;}

       paintLev(v);
       const rb=$('#riskBox'); rb.innerHTML='';
       const note=(txt,kind)=>rb.innerHTML+='<div class="rwarn '+kind+'">'+txt+'</div>';
       const pv=$('#prev'); pv.innerHTML='';
       const sp=spot(), unit=sig.ticker||'ارز';

       if(!v.entry||!v.margin||!v.lev){
         pv.innerHTML='<div class="k"><b>پیش‌نمایش</b><span class="m">اعداد ناقص است</span></div>';
         if(auto()&&!v.stop)note('برای حساب کردن اهرم، حد ضرر لازم است. یا بنویسش یا تیک خودکار را بردار.','warn');
         return;
       }
       const m=posMetrics({dir:v.dir,entry:v.entry,stop:v.stop,margin:v.margin,lev:v.lev,status:'open'},px);
       const add=(l,x,c)=>pv.innerHTML+='<div class="k"><b>'+l+'</b><span class="'+(c||'')+'">'+x+'</span></div>';
       if(sp){
         add('مقدار '+unit,(+m.qty.toPrecision(6))+'');
         add('ارزش خرید',fmtUsd(m.notional));
       }else{
         add('حجم',fmtUsd(m.notional));
         add('مقدار',(+m.qty.toPrecision(6))+'');
         add('لیکوئید',m.liqPrice==null?'ندارد':fmtPrice(m.liqPrice),m.liqPrice==null?'m':'d');
       }

       if(v.stop){
         const risk=m.qty*Math.abs(v.entry-v.stop), pct=(risk/v.margin)*100;
         add('ضرر در استاپ',fmtUsd(-risk)+' ('+pct.toFixed(1)+'٪)','d');
         const ld=1/v.lev-MMR, sd=Math.abs(v.entry-v.stop)/v.entry;
         if(!sp&&v.lev>1.05&&ld>0)rb.appendChild(liqStopBar(sd,ld));
         // استاپ تنگ‌تر از نوسان معمول: همان چیزی که یک سایه‌ی عادی را به استاپ‌خوردن تبدیل می‌کند
         if(VOL&&VOL.pct>0){
           const sdp=sd*100;
           if(sdp<VOL.pct*1.2)note('<b>استاپ تنگ است:</b> فاصله‌ی استاپ '+sdp.toFixed(2)+'٪ است، ولی هر کندل یک‌ساعته‌ی '+
             esc(sig.ticker||'این ارز')+' به‌طور میانگین '+VOL.pct.toFixed(2)+'٪ نوسان دارد. یک سایه‌ی عادی کافی است. '+
             'استاپ را پشت ساختار چارت ببر و به‌جایش مبلغ یا اهرم را کم کن تا ریسک دلاری همان بماند.','warn');
           else if(sdp<VOL.pct*2)note('فاصله‌ی استاپ ('+sdp.toFixed(2)+'٪) کمتر از دو برابر نوسان یک‌ساعته‌ی معمول ('+
             VOL.pct.toFixed(2)+'٪) است؛ در بازار پرنوسان ممکن است زود بخورد.','info');
         }
         if(!sp&&v.lev>1.05&&ld>0&&sd>=ld)
           note('<b>استاپ بعد از لیکوئید می‌افتد.</b> با این اهرم قبل از رسیدن به حد ضرر، کل مارجین از بین می‌رود. اهرم را کم کن.','bad');
         else if(!sp&&v.lev>1.05&&ld>0&&sd>ld*.75)
           note('استاپ خیلی به لیکوئید نزدیک است — کمی نوسان کافی است تا پوزیشن بسته شود.','warn');
         if(pct>S.risk*2)
           note('ریسک این ورود '+pct.toFixed(1)+'٪ '+(sp?'مبلغ خرید':'مارجین')+' است، بیش از دو برابرِ هدف '+faN(S.risk)+'٪.','bad');
         else if(pct>S.risk*1.2)
           note('ریسک این ورود '+pct.toFixed(1)+'٪ '+(sp?'مبلغ خرید':'مارجین')+' است، بالاتر از هدف '+faN(S.risk)+'٪.','warn');
         if(auto()&&a&&a.capped)
           note('برای رسیدن به ریسک هدف، اهرم بیشتر از سقف تو ('+faN(S.maxLev)+'x) لازم بود؛ روی سقف ماند و ریسک کمتر از هدف شد.','warn');
         if(sp){
           const want=(amt0*(S.risk/100))/sd;     // بودجه‌ی این معامله، نه عددی که همین الان تایپ شده
           if(isFinite(want)&&want>0&&Math.abs(want-v.margin)>Math.max(0.05,v.margin*0.02))
             note('در اسپات اهرمی نیست که ریسک را تنظیم کند؛ تنها اهرمِ تو خودِ مبلغ است. با استاپ '+
               (sd*100).toFixed(1)+'٪، برای اینکه ضررت '+faN(S.risk)+'٪ از '+fmtUsd(amt0)+
               ' سرمایه‌ی هر معامله باشد باید '+fmtUsd(want)+' بخری.','warn');
         }
       }else note(sp
         ?'بدون حد ضرر، معلوم نیست کجا می‌خواهی بیرون بیایی. در اسپات لیکوئید نمی‌شوی ولی ضرر بی‌سقف می‌ماند.'
         :'بدون حد ضرر، نه ریسک معلوم است نه لیکوئید معنی دارد. اگر می‌توانی بنویسش.','warn');
       if(px)add('سود/ضرر الان',fmtUsd(m.pnl)+' ('+fmtPct(m.roi)+')',cls(m.pnl));
       // سود هر تارگت کانال با همین مبلغ و اهرم — همان جدولی که قبلاً ماشین‌حساب کارت داشت
       const sgn=v.dir==='long'?1:-1, rsk=v.stop?Math.abs(v.entry-v.stop):null;
       (sig.targets||[]).filter(t=>isFinite(t)&&(t-v.entry)*sgn>0).slice(0,4).forEach((t,i)=>
         add('تارگت '+faN(i+1)+' · '+fmtPrice(t),'+'+fmtUsd(m.qty*Math.abs(t-v.entry))+(rsk?' · '+((t-v.entry)*sgn/rsk).toFixed(1)+'R':''),'u'));
       if(px&&v.entry){
         const gap=((px-v.entry)/v.entry)*100*sgn;
         if(v.stop&&(sgn>0?px<=v.stop:px>=v.stop))
           note('<b>قیمت الان آن‌طرف استاپ است.</b> این سیگنال دیگر معتبر نیست.','bad');
         else if(gap>3)note('قیمت '+gap.toFixed(1)+'٪ از ورود سیگنال فاصله گرفته؛ ورود دیر است.','warn');
       }
       paintPb(v,m);
     };
     /* نقشه‌ی خروج همین پوزیشن، با همین مبلغ و اهرم: هر پله چه سهمی و چقدر سود */
     const paintPb=(v,m)=>{
       const box=$('#pbBox');if(!box)return;
       box.innerHTML='';
       const fake={dir:v.dir,entry:v.entry,stop:v.stop||null,stop0:v.stop||null,targets:sig.targets||[]};
       const tps=pbTps(fake);
       box.appendChild(el('div','pbh',ic('flag')+'<b>نقشه‌ی خروج</b><span class="markhint">مقایسه‌ی سبک‌ها در کانال‌سنج</span>'));
       box.appendChild(pbPicker(pbSel,id=>{pbSel=id;upd();}));
       if(!tps.length){box.appendChild(el('div','hint','برای نقشه، حد ضرر یا تارگت لازم است.'));return;}
       const def=pbDef(pbSel), parts=pbParts(def,tps.length);
       fake.pb={parts,be:def.be||0,trail:!!def.trail,tps};
       const qty=m&&m.qty?m.qty:0, risk=v.stop?Math.abs(v.entry-v.stop):null;
       let tot=0;
       const ol=el('ol','pbsteps');
       tps.forEach((t,i)=>{
         const pr=qty*parts[i]*Math.abs(t-v.entry);tot+=pr;
         if(!(parts[i]>0)&&pbStopPrice(fake,i+1)===(i?pbStopPrice(fake,i):null))return;
         ol.insertAdjacentHTML('beforeend','<li><i>'+faN(i+1)+'</i><div><b>تارگت '+faN(i+1)+' · <span dir="ltr">'+fmtPrice(t)+'</span></b>'+
           '<span>'+pbStepText(fake,i)+(parts[i]>0&&qty?' · <em dir="ltr">+'+fmtUsd(pr)+'</em>':'')+'</span></div></li>');
       });
       box.appendChild(ol);
       if(qty)box.appendChild(el('div','hint','اگر همه‌ی پله‌ها برسد: <b style="color:var(--up)" dir="ltr">+'+fmtUsd(tot)+'</b>'+
         (risk?' · <b dir="ltr">'+(tot/(qty*risk)).toFixed(1)+'R</b>':'')+'. سرِ هر پله خبر می‌دهم.'));
     };
     /* مبلغ‌های آماده زیر کشویی: زدنشان همان کادر مبلغ را پر می‌کند */
     const paintAmt=()=>{
       const box=$('#amtBox'), cur=num('f_m');
       box.innerHTML='';
       box.appendChild(amtRow(cur||0,v=>{$('#f_m').value=v;$('#r_m').value=v;upd();},spot(),true));
     };
     const paintLev=v=>{
       const r=$('#r_l'), tk=$('#levTicks'); if(!r||!tk)return;
       const max=+S.maxLev||10, pos=x=>((clamp(x,1,max)-1)/((max-1)||1))*100;
       const sd=v.entry&&v.stop?Math.abs(v.entry-v.stop)/v.entry:null;
       const safe=sd?1/(sd+MMR):null;
       r.style.setProperty('--val',pos(v.lev||1)+'%');
       r.style.setProperty('--safe',(safe?pos(safe):100)+'%');
       r.classList.toggle('nostop',!sd);
       const rm=$('#r_m');
       if(rm){const lo=+rm.min||1,hi=+rm.max||100;
         rm.style.setProperty('--val',((clamp(v.margin||lo,lo,hi)-lo)/((hi-lo)||1))*100+'%');}
       const at=(p,txt,c)=>'<i class="'+(c||'')+'" style="left:calc(15px + (100% - 30px) * '+(p/100)+')">'+txt+'</i>';
       // برچسب‌ها روی هم نیفتند: برچسبِ «امن تا» اگر نزدیک یکی از دو سر بود، آن سر را کنار می‌زند
       const sp=safe&&safe<max?pos(safe):null;
       let h=(sp!=null&&sp<16?'':at(0,'1x'))+(sp!=null&&sp>80?'':at(100,max+'x'));
       if(sp!=null)h+=at(sp,'امن تا <b dir="ltr">'+(+safe.toFixed(safe<10?1:0))+'x</b>','safe'+(sp>85?' end':sp<15?' start':''));
       tk.innerHTML=h;
     };
     TAGSEL={setup:'',mood:''};wireTagPick(sh,TAGSEL);
     const paintGate=()=>{const g=entryGate(riskOfPlan(grab())), b=$('#gateBox');if(!b)return;
       b.classList.toggle('hide',!g.length);b.innerHTML=g.length?ic('alert')+'<div>'+g.map(esc).join('<br>')+'</div>':'';};
     const upd=()=>{updNums();drawLad();paintAmt();paintGate();};
     moneyInput($('#f_m'));
     paintMkt();

     // کشویی و کادر عدد دو نمای یک مقدارند
     const pair=(r,f)=>{
       $('#'+r).oninput=()=>{$('#'+f).value=f==='f_m'?fmtMoneyIn($('#'+r).value):$('#'+r).value;upd();};
       $('#'+f).addEventListener('input',()=>{const v=num(f);if(v!=null)$('#'+r).value=v;upd();});
     };
     pair('r_m','f_m'); pair('r_l','f_l');
     // + و − اهرم: یک واحد، و اهرم را دستی می‌کند
     sh.querySelectorAll('.levst').forEach(b=>b.onclick=()=>{
       const cur=num('f_l')||1, nv=clamp(Math.round(cur)+(+b.dataset.d),1,+S.maxLev||10);
       $('#f_auto').checked=false;$('#f_l').value=nv;$('#r_l').value=nv;upd();});
     // نوسان یک‌ساعته‌ی همین ارز، برای هشدار استاپ تنگ (بی‌صدا؛ اگر نیامد هشداری هم نیست)
     volOf(sig.ticker).then(r=>{VOL=r;if(r&&$('#riskBox'))updNums();});
     sh.querySelectorAll('#f_e,#f_s,#f_d,#f_auto,#f_n').forEach(i=>{i.oninput=upd;i.onchange=upd;});
     upd();
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{
       const v=grab(), sp=spot();
       if(!v.entry||v.entry<=0)return toast('قیمت ورود را وارد کن','err');
       if(!v.margin||v.margin<=0)return toast((sp?'مبلغ خرید':'مارجین')+' را وارد کن','err');
       if(!v.lev||v.lev<=0)return toast('اهرم را وارد کن','err');
       if(v.stop&&((v.dir==='long'&&v.stop>=v.entry)||(v.dir==='short'&&v.stop<=v.entry)))
         return toast('استاپ با جهت معامله نمی‌خواند','err');
       const gate=entryGate(riskOfPlan(v));
       if(gate.length&&!confirm('⚠️ '+gate.join('\n\n')+'\n\nباز هم ثبت شود؟'))return;
       const gateV=gate.length?[{k:'gate',at:Date.now(),t:gate.join(' ')}]:undefined;
       // تنها جایی که هنوز «مطمئنی؟» می‌پرسیم: لیکوئید پیش از استاپ یعنی حد ضرر عملاً وجود ندارد
       if(!sp&&v.stop&&v.lev>1.05){const ld=1/v.lev-MMR, sd=Math.abs(v.entry-v.stop)/v.entry;
         if(ld>0&&sd>=ld&&!confirm('با اهرم '+(+v.lev)+'x قیمت لیکوئید ('+(ld*100).toFixed(1)+'٪) قبل از حد ضرر ('+(sd*100).toFixed(1)+
           '٪) است؛ یعنی کل مارجین پیش از رسیدن به استاپ از بین می‌رود.\n\nبا همین اهرم ثبت شود؟'))return;}
       const pos=ensureBase({id:uid(),sigId:p.id,ticker:sig.ticker||'—',kind:sp?'spot':'futures',
         dir:v.dir,entry:v.entry,
         stop:v.stop||null,stop0:v.stop||null,margin:v.margin,baseMargin:v.margin,lev:v.lev,
         targets:sig.targets||[],openedAt:Date.now(),status:'open',
         exitPrice:null,closedAt:null,fees:null,note:v.note,partials:[],log:[],viol:gateV,
         setup:TAGSEL.setup||undefined,mood:TAGSEL.mood||undefined,
         src:{link:p.link,text:(p.text||'').slice(0,400),img:p.img||null,at:p.date?p.date.getTime():null}});
       logAdd(pos,'open',sp
         ?('خرید اسپات '+fmtUsd(v.margin)+' روی '+fmtPrice(v.entry))
         :('ورود با '+fmtUsd(v.margin)+' مارجین و اهرم '+(+v.lev)+'x روی '+fmtPrice(v.entry)));
       if(pbTps(pos).length&&pbAttach(pos,pbSel))logAdd(pos,'plan','نقشه‌ی خروج: '+pos.pb.n);
       DB.positions.push(pos);
       DB.decisions[p.id]={action:'taken',at:Date.now(),posId:pos.id,market:sp?'spot':'futures',
         snap:snapOf(p,sig,v.entry,v.stop)};
       save();closeSheet();renderAll();toast(sp?'خرید اسپات ثبت شد':'پوزیشن ثبت شد','ok');
     };
   });
}
/* ---- ورق «وارد نشدم» ---- */
function sheetSkip(p,sig,ov,px){
  const I=planInputsOf(p,sig,ov,px);
  const reasons=['قیمت رفته بود','استاپ خیلی دور','نماد را دوست ندارم','پول نداشتم','حجم/نقدینگی کم','فرصت نشد','دلیل دیگر'];
  openSheet(
   '<h3>ثبت نگرفتن'+(sig.ticker?' · '+esc(sig.ticker):'')+'</h3>'+
   '<div class="sub">در آرشیو ثبت می‌شود و در کارنامه می‌بینی این سیگنال بعداً چه کرد.</div>'+
   '<div class="fld"><label>دلیل</label><select id="f_r">'+
     reasons.map(r=>'<option>'+r+'</option>').join('')+'</select></div>'+
   '<div class="fld" style="margin-top:10px"><label>توضیح (اختیاری)</label><input id="f_t"></div>'+
   '<div class="srow"><button class="btn pri" id="ok">ثبت</button><button class="btn" id="cx">انصراف</button></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{
       const r=$('#f_r').value, t=($('#f_t').value||'').trim();
       DB.decisions[p.id]={action:'skipped',at:Date.now(),reason:t?r+' — '+t:r,snap:snapOf(p,sig,I.entry,I.stop)};
       save();closeSheet();renderAll();toast('در آرشیو ثبت شد','ok');
     };
   });
}

/* ---- ریسک باز و قفل روزانه ---- */
/* ریسک باز یک پوزیشن: اگر همین الان استاپش بخورد، چقدر از حساب می‌رود (استاپِ در سود = صفر).
   بدون استاپ: کل مارجینِ باقی‌مانده، چون عملاً سقفی ندارد. */
function openRiskOf(p){
  if(p.status!=='open'||!(p.margin>0)||!(p.entry>0))return 0;
  if(!p.stop)return p.margin;
  const qty=p.margin*p.lev/p.entry, sign=p.dir==='long'?1:-1;
  return Math.max(0,qty*(p.entry-p.stop)*sign+p.margin*p.lev*(S.fee/100));
}
const riskOfPlan=v=>!(v&&v.entry>0&&v.margin>0)?0:!v.stop?v.margin
  :(v.margin*(v.lev||1)/v.entry)*Math.abs(v.entry-v.stop)+v.margin*(v.lev||1)*(S.fee/100);
function riskNow(){
  const used=DB.positions.reduce((a,p)=>a+openRiskOf(p),0);
  return {used,pct:S.acct>0?used/S.acct*100:0,cap:+S.openRisk||15};
}
/* پیش از هر ورود تازه: حد ضرر روزانه پر شده؟ ریسک باز کل از سقف رد می‌شود؟ خروجی: فهرست هشدارها */
function entryGate(newRisk){
  const m=moneyNow(), r=riskNow(), out=[];
  if(m.left<=0)out.push('امروز به حد ضرر روزانه ('+faN(S.daily)+'٪ حساب) رسیده‌ای؛ قانون خودت می‌گوید ورود تازه نه.');
  const pct=S.acct>0?(r.used+(newRisk||0))/S.acct*100:0;
  if(newRisk>0&&pct>r.cap)out.push('با این ورود ریسک باز کل به '+pct.toFixed(1)+'٪ حساب می‌رسد؛ سقفت '+faN(r.cap)+'٪ است'+
    (r.used>0?' (الان '+r.pct.toFixed(1)+'٪ باز داری)':'')+'.');
  return out;
}
/* یک نگاه به وضعیت امروز، بدون رفتن به تب‌های دیگر */
/* دو عددی که جای دیگری نوشته نمی‌شوند. قبلاً در نوار جداگانه‌ای بودند و آن نوار
   با نوار وضعیت روی هم 141 پیکسل می‌گرفت برای چهار عدد؛ حالا هر دو یک نوارند. */
function moneyNow(){
  const today=jKey(new Date());
  const open=DB.positions.filter(p=>p.status==='open');
  let openPnl=0, hasPx=false;
  for(const p of open){const px=pxOf(p);if(px!=null){hasPx=true;openPnl+=posMetrics(p,px).pnl||0;}}
  // ضرر امروز فقط از معاملات بسته‌شده‌ی امروز؛ سود به حد ضرر روزانه ربطی ندارد
  const realToday=DB.positions.filter(p=>p.status==='closed'&&p.closedAt&&jKey(new Date(p.closedAt))===today)
    .reduce((s,p)=>s+(posMetrics(p).pnl||0),0);
  const cap=S.acct*(S.daily/100), used=Math.max(0,-realToday), left=Math.max(0,cap-used);
  const r=riskNow();
  return {openPnl,hasPx,left,hot:used>=cap?'d':(used>cap*.6?'w':'u'),
    risk:r.pct,riskHot:r.pct>r.cap?'d':r.pct>r.cap*.7?'w':'u',nOpen:open.length};
}

/* یک نوار به‌جای سه دکمه‌ی بی‌عدد به‌علاوه‌ی چیپ‌های آرشیو: هر بخش می‌گوید چند تا
   داخلش هست، و آرشیو — که «جای دیگر» است نه «فیلتر دیگر» — با فاصله جدا شده. */
function renderFbar(){
  const bar=$('#fbar');if(!bar)return;
  // یک پیمایش برای هر پنج شمارنده. قبلاً چهار filter پشت سر هم بود و روی
  // 800 پست هر بار از نو bucketOf می‌گرفت.
  // همه‌ی شمارنده‌ها با فیلتر روز: «امروز» که روشن است، عددها هم مال امروزند
  let nLive=0,nSig=0,nNew=0,nRes=0,nArch=0,nExp=0;
  const KN={sig:0,news:0,ann:0,res:0,note:0}, dp=dayPass();
  for(const p of POSTS){
    if(dp&&!dp(p))continue;
    const bk=bucketOf(p);
    if(bk==='arch'){nArch++;continue;}
    if(bk==='exp'){nExp++;continue;}
    if(bk==='les')continue;
    nLive++;
    const kd=postKind(p);
    KN[kd]++;
    if(kd==='res')nRes++;
    if(kd!=='sig')continue;
    nSig++;
    if(!decisionOf(p.id)&&!isStale(p))nNew++;
  }
  const segs=[
    {k:'new', label:'در انتظار', n:nNew, hint:'سیگنال‌های این '+faN(S.staleDays||7)+' روز که هنوز تصمیمشان را نگرفته‌ای'},
    {k:'sig', label:'سیگنال‌ها', n:nSig, hint:'همه‌ی سیگنال‌ها'},
    {k:'all', label:'همه',       n:nLive, hint:'همه‌ی پست‌های کانال: سیگنال، نتیجه، خبر و اطلاع‌رسانی'}
  ];
  const cur=bucket==='live'?sigFilter:bucket;
  bar.innerHTML='';
  const grp=el('div','fseg');
  for(const sg of segs){
    const b=el('button','fb'+(cur===sg.k?' on':''));
    b.setAttribute('role','tab');b.setAttribute('aria-selected',cur===sg.k?'true':'false');
    b.title=sg.hint;
    b.innerHTML='<span>'+sg.label+'</span><i>'+faN(sg.n)+'</i>';
    b.onclick=()=>{bucket='live';sigFilter=sg.k;setView({});
      window.scrollTo({top:0,behavior:'smooth'});};
    grp.appendChild(b);
  }
  bar.appendChild(grp);
  /* دو سطلِ کنارِ گروه: «جای دیگر»اند نه «فیلتر دیگر»، پس بیرون از گروه می‌ایستند. */
  const side=el('div','fside');
  const mkSide=(key,icon,label,count,hint)=>{
    const b=el('button','fb fbucket'+(bucket===key?' on':''));
    b.setAttribute('role','tab');b.setAttribute('aria-selected',bucket===key?'true':'false');
    b.setAttribute('aria-label',label);b.title=hint;
    b.innerHTML='<span>'+ic(icon)+label+'</span><i>'+faN(count)+'</i>';
    b.onclick=()=>{bucket=bucket===key?'live':key;setView({});
      window.scrollTo({top:0,behavior:'smooth'});};
    side.appendChild(b);
  };
  mkSide('res','flag','نتایج',nRes,'پست‌های نتیجه: تارگت خورد، استاپ خورد، سیو سود');
  mkSide('exp','clock','منقضی',nExp,'سیگنال‌هایی که بیش از '+faN(S.staleDays||7)+' روز از آن‌ها گذشته؛ در آمار نمی‌آیند');
  mkSide('arch','box','آرشیو',nArch,'پست‌هایی که کنار گذاشته‌ای');
  /* فیلتر روز: کنار همان دو سطل، یک انتخاب‌گرِ جمع‌وجور — ردیف جدا صفحه را پایین می‌برد.
     برای همه‌ی بخش‌ها، از جمله نتایج و آرشیو. */
  const day=DAY_FA[VIEW.day]?VIEW.day:'all';
  const dl=el('label','fb fbucket fday'+(day!=='all'?' on':''),'<span>'+ic('cal')+'</span>');
  dl.title='نمایش پست‌های یک روز یا یک بازه';
  const sel=document.createElement('select');sel.setAttribute('aria-label','بازه‌ی زمانی');
  sel.innerHTML=Object.keys(DAY_FA).map(k=>'<option value="'+k+'"'+(k===day?' selected':'')+'>'+DAY_FA[k]+'</option>').join('');
  sel.onchange=()=>{
    const k=sel.value;
    if(k==='range'&&!VIEW.from){
      const iso=d=>{const g=gParts(d);return g.gy+'-'+String(g.gm).padStart(2,'0')+'-'+String(g.gd).padStart(2,'0');};
      setView({day:k,from:iso(new Date(Date.now()-6*864e5)),to:iso(new Date())});
    }else setView({day:k});
  };
  dl.appendChild(sel);side.appendChild(dl);
  bar.appendChild(side);
  const chip=(row,label,n,on,fn,cls)=>{
    const b=el('button','fc'+(on?' on':'')+(cls?' '+cls:''),'<span>'+label+'</span>'+(n!=null?'<i>'+faN(n)+'</i>':''));
    b.setAttribute('aria-pressed',on?'true':'false');b.onclick=fn;row.appendChild(b);return b;
  };
  /* ردیف نوع و دسته فقط در «همه»: خبر، اطلاع‌رسانی، نتیجه… و دسته‌هایی که خودت ساخته‌ای */
  if(bucket==='live'&&sigFilter==='all'){
    const row=el('div','frow');row.setAttribute('aria-label','نوع پست');
    const kind=KN[VIEW.kind]!=null?VIEW.kind:'all';
    chip(row,'همه',nLive,kind==='all',()=>setView({kind:'all'}));
    for(const k of ['sig','news','ann','res','note'])
      chip(row,k==='sig'?'سیگنال':KIND_FA[k],KN[k],kind===k,()=>setView({kind:k}));
    bar.appendChild(row);
    // چیپ روشن ممکن است بیرون از دید افقی باشد؛ بی‌آنکه صفحه بالا-پایین برود جلو بیاوریمش
    const onc=row.querySelector('.fc.on');
    if(onc)requestAnimationFrame(()=>{const r=row.getBoundingClientRect(),c=onc.getBoundingClientRect();
      if(c.left<r.left||c.right>r.right)row.scrollLeft+=c.left<r.left?c.left-r.left-8:c.right-r.right+8;});
  }
  if(day==='range'){
    const rg=el('div','frange');
    const inp=(key,lbl)=>{
      const w=el('label','frin','<b>'+lbl+'</b>');
      const i=document.createElement('input');i.type='date';i.value=VIEW[key]||'';
      i.onchange=()=>setView({[key]:i.value});
      w.appendChild(i);
      const n=ymdNo(VIEW[key]);
      if(n!=null)w.appendChild(el('small',null,jShort(new Date(n*864e5+12*36e5))));
      rg.appendChild(w);
    };
    inp('from','از');inp('to','تا');
    bar.appendChild(rg);
  }
}

/* ---- کشیدن کارت به کنار ----
   راست: آرشیو · چپ: «وارد نشدم» (فقط سیگنالی که هنوز تصمیمش را نگرفته‌ای). هر دو با «برگرداندن».
   فقط وقتی حرکت آشکارا افقی است؛ اسکرول عادی، اسلایدرها و نردبان دست نمی‌خورند. */
function swipeAct(p,dx){
  if(dx>0)return isArch(p.id)?null:{k:'arch',t:'رها کن: آرشیو',
    run:()=>undoable('به آرشیو رفت',()=>{DB.archived[p.id]=Date.now();})};
  if(dx<0&&isSigPost(p)&&!decisionOf(p.id))return {k:'skip',t:'رها کن: وارد نشدم',
    run:()=>undoable('ثبت شد: وارد نشدم',()=>{
      const sg=sigOf(p), I=planInputsOf(p,sg,OVERRIDE[p.id]||{},null);
      DB.decisions[p.id]={action:'skipped',at:Date.now(),reason:'رد سریع (کشیدن کارت)',snap:snapOf(p,sg,I.entry,I.stop)};})};
  return null;
}
let swHint=null;
function swipeWire(c,p){
  let x0=null,y0=null,dx=0,horiz=null;
  const hint=t=>{if(!t){if(swHint){swHint.remove();swHint=null;}return;}
    if(!swHint){swHint=el('div','swhint');document.body.appendChild(swHint);}swHint.textContent=t;};
  c.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||e.target.closest('input,select,textarea,.ladder,.levtrack,.sldrow,.frow,.shot'))return;
    x0=e.touches[0].clientX;y0=e.touches[0].clientY;dx=0;horiz=null;},{passive:true});
  c.addEventListener('touchmove',e=>{
    if(x0==null)return;
    const t=e.touches[0], mx=t.clientX-x0, my=t.clientY-y0;
    if(horiz==null&&(Math.abs(mx)>14||Math.abs(my)>14))horiz=Math.abs(mx)>Math.abs(my)*1.5;
    if(!horiz)return;
    dx=mx;c.style.transition='none';c.style.transform='translateX('+dx+'px)';
    const a=swipeAct(p,dx), far=Math.abs(dx)>c.offsetWidth*0.3;
    c.dataset.sw=a&&far?a.k:'';hint(a&&far?a.t:null);
  },{passive:true});
  const end=()=>{
    if(x0==null)return;x0=null;hint(null);
    const a=horiz?swipeAct(p,dx):null, done=a&&Math.abs(dx)>c.offsetWidth*0.3;
    c.style.transition='transform .25s var(--ease),opacity .25s';
    delete c.dataset.sw;
    if(done){c.style.transform='translateX('+(dx>0?'':'-')+'110%)';c.style.opacity='0';setTimeout(a.run,180);}
    else c.style.transform='';
  };
  c.addEventListener('touchend',end);c.addEventListener('touchcancel',end);
}
/* ---- کشیدن به پایین برای بروزرسانی (فقط وقتی بالای فهرست سیگنال‌هایی) ---- */
function wirePTR(){
  const v=$('#vSignals');if(!v||$('#ptr'))return;
  const ind=el('div','ptr',ic('down')+'<span>بکش برای بروزرسانی</span>');ind.id='ptr';v.prepend(ind);
  const lab=ind.querySelector('span');
  let y0=null;
  v.addEventListener('touchstart',e=>{
    y0=(window.scrollY<=2&&!busy&&$('#veil').classList.contains('hide')&&e.touches.length===1)?e.touches[0].clientY:null;},{passive:true});
  v.addEventListener('touchmove',e=>{
    if(y0==null)return;
    const d=e.touches[0].clientY-y0;
    if(d<=0||window.scrollY>2){ind.style.height='0';return;}
    const h=Math.min(84,d*.5);ind.style.height=h+'px';
    const ready=h>=62;ind.classList.toggle('ready',ready);lab.textContent=ready?'رها کن تا بروز شود':'بکش برای بروزرسانی';
  },{passive:true});
  v.addEventListener('touchend',()=>{
    if(y0==null)return;y0=null;
    if(!ind.classList.contains('ready')){ind.style.height='0';return;}
    ind.classList.remove('ready');ind.classList.add('busy');lab.textContent='در حال بروزرسانی…';ind.style.height='52px';
    Promise.resolve(refresh(false)).finally(()=>{ind.classList.remove('busy');ind.style.height='0';});
  });
}
/* ارتفاع سربرگ برای چسباندن سربرگ روزها زیر آن */
function setHdrH(){const h=document.querySelector('header');if(h)document.documentElement.style.setProperty('--hdrH',h.offsetHeight+'px');}
/* ---- آکاردئون ----
   کارت بسته یک دکمه‌ی بزرگ است: هر جایش را بزنی باز می‌شود. قبلاً وسط سربرگ، تاریخِ پست لینک
   تلگرام بود و نماد دکمه‌ی فیلتر؛ زدن روی آن‌ها کارت را باز نمی‌کرد و یا به تلگرام می‌برد یا
   فهرست را فیلتر و به بالا پرت می‌کرد. آن دو فقط روی کارت باز کار می‌کنند. */
function accWire(c,p,isOpen){
  c.classList.add(isOpen?'accopen':'tight');
  if(!isOpen){
    c.setAttribute('role','button');c.tabIndex=0;c.setAttribute('aria-expanded','false');
    c.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();accToggle(p,true);},true);
    c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();accToggle(p,true);}});
    return;
  }
  c.addEventListener('click',e=>{
    if(e.target.closest('button,a,input,select,label,.shot,.reply,.txt a'))return;
    if(!e.target.closest('.chead,.csum'))return;
    accToggle(p,false);
  });
}
/* باز/بسته کردن در جا: فقط کارتِ زده‌شده و کارتی که باز بود از نو ساخته می‌شوند — نه کل فهرست.
   ساختن دوباره‌ی کل فهرست صفحه را یک لحظه خالی می‌کرد و مرورگر جای اسکرول را گم می‌کرد (پرش،
   گاهی تا ته صفحه). کارتی که زدی زیر انگشتت می‌ماند. */
function accToggle(p,open){
  const card=CARDS.get(p.id);
  if(!card||!card.isConnected){ACCOPEN=open?p.id:'';return renderSignals();}
  const y0=card.getBoundingClientRect().top;
  ACCOPEN=open?p.id:'';
  if(open)for(const oc of [...$('#list').querySelectorAll('.card.accopen')]){
    const q=POSTS.find(x=>x.id===oc.dataset.id);if(q&&q.id!==p.id)accSwap(q,false);
  }
  const nc=accSwap(p,open);
  const dy=nc.getBoundingClientRect().top-y0;
  if(Math.abs(dy)>0.5)window.scrollBy(0,dy);
  // اگر سربرگ کارت زیر نوار بالا و سربرگِ روز رفته، فقط آن‌قدر پایین بیاید که دیده شود
  const top=nc.getBoundingClientRect().top, min=listTopEdge()+6;
  if(top<min)window.scrollBy(0,top-min);
}
function accSwap(p,open){
  const old=CARDS.get(p.id), fresh=buildCard(p,!open);
  accWire(fresh,p,open);swipeWire(fresh,p);
  if(old&&old.isConnected)old.replaceWith(fresh);
  return fresh;
}
/* لبه‌ی بالای ناحیه‌ی دیدنیِ فهرست: زیر سربرگ برنامه و سربرگِ چسبانِ روز */
function listTopEdge(){
  const h=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdrH'))||0;
  const d=document.querySelector('#list .dsep');
  return h+(d?d.offsetHeight:0);
}
/* جای خواندن: اولین کارتی که از زیر سربرگ پیداست و فاصله‌اش از بالا */
function listAnchor(){
  if(window.scrollY<4||$('#vSignals').classList.contains('hide'))return null;
  const edge=listTopEdge();
  for(const c of $('#list').querySelectorAll('.card[data-id]')){
    const r=c.getBoundingClientRect();
    if(r.bottom>edge+4)return {id:c.dataset.id,top:r.top};
  }
  return null;
}
function restoreAnchor(a){
  if(!a)return;
  const c=CARDS.get(a.id);if(!c||!c.isConnected)return;
  const dy=c.getBoundingClientRect().top-a.top;
  if(Math.abs(dy)>0.5)window.scrollBy(0,dy);
}
let RS_KEY='';
function renderSignals(){
  const list=$('#list');
  // بروزرسانی خودکار هر دقیقه همین را صدا می‌زند؛ جای خواندن نباید تکان بخورد
  const anchor=listAnchor();
  /* سطل آموزش فهرست خودش را دارد (عنوان، دسته، اسکن کانال)، پس به‌جای کارت پست
     همان را نشان می‌دهیم. جستجوی بالای صفحه هم همان‌جا روی آموزش‌ها کار می‌کند. */
  if(bucket==='les')bucket='live';     // آموزش حالا تبِ خودش را دارد
  if(!POSTS.length&&busy){list.innerHTML=skelHTML(3);$('#btnMore').classList.add('hide');showStatus();return;}
  const q=query.trim().toLowerCase();
  const frag=document.createDocumentFragment();
  CARDS.clear();
  let n=0, shown=0, matched=0;
  const acc=F('accordion');
  let firstId=null, lastDay=null, sepEl=null, sepN=0;
  const closeSep=()=>{if(sepEl)sepEl.querySelector('.dsn').textContent=sepN+' پست';};
  const dp=dayPass(), kind=bucket==='live'&&sigFilter==='all'&&VIEW.kind!=='all'?VIEW.kind:'';
  // انیمیشن ورود کارت‌ها فقط وقتی فهرست واقعاً عوض شده (فیلتر، سطل، جستجو)، نه با هر بروزرسانی
  const rk=[bucket,sigFilter,coinFilter,q,VIEW.day,kind].join('|'), animate=rk!==RS_KEY;RS_KEY=rk;
  for(const p of POSTS){
    if(dp&&!dp(p))continue;
    const sig=sigOf(p), bk=bucketOf(p);
    if(bucket==='res'){if(bk!=='live'||postKind(p)!=='res')continue;}
    else if(bk!==bucket)continue;
    if(coinFilter&&(sig.ticker||'')!==coinFilter)continue;
    if(kind&&postKind(p)!==kind)continue;
    if(bucket==='live'&&sigFilter==='sig'&&!isSigPost(p))continue;
    if(bucket==='live'&&sigFilter==='new'&&!isOpenSig(p))continue;
    if(q&&!((sig.ticker||'')+' '+p.text).toLowerCase().includes(q))continue;
    matched++;
    if(n>=shownMax)continue;                 // بقیه شمرده می‌شوند ولی ساخته نمی‌شوند
    /* جداکننده‌ی روز: امروز، دیروز، چند روز پیش — تا معلوم باشد هر پست مال کِی است */
    if(p.date){
      const dn=postDay(p);
      if(dn!==lastDay){
        closeSep();lastDay=dn;sepN=0;
        const L=dayLabel(p.date);
        sepEl=el('div','dsep'+(L.diff<=0?' today':L.diff>=(S.staleDays||7)?' old':''),
          '<b>'+L.rel+'</b><span>'+L.wd+' · '+L.date+'</span><i class="dsn"></i>');
        frag.appendChild(sepEl);
      }
      sepN++;
    }
    /* آکاردئون: فقط یک کارت باز است؛ زدن روی کارتِ بسته بازش می‌کند و بقیه بسته می‌شوند.
       اگر هنوز چیزی باز نکرده‌ای، اولین کارت باز است تا صفحه خالی به نظر نرسد. */
    let isOpen=true;
    if(acc){
      if(firstId==null)firstId=p.id;
      isOpen=ACCOPEN===p.id||(ACCOPEN==null&&firstId===p.id);
    }
    const c=buildCard(p,acc&&!isOpen);
    if(acc)accWire(c,p,isOpen);
    swipeWire(c,p);
    if(animate&&shown<8){c.classList.add('enter');c.style.setProperty('--d',(shown*45)+'ms');shown++;}
    frag.appendChild(c);n++;
  }
  closeSep();
  list.innerHTML='';
  renderFbar();
  /* «کنار گذاشتن پست‌های تصمیم‌گرفته» ته فهرست می‌آید، نه بالایش: کار گاه‌به‌گاهی است و
     همیشه اولین چیز زیر فیلترها بود */
  let bulk=null;
  if(bucket==='live'){
    const done=POSTS.filter(x=>decisionOf(x.id)&&bucketOf(x)==='live');
    if(done.length){
      bulk=el('button','tidy',ic('box')+'<span>کنار گذاشتن '+faN(done.length)+' پستِ تصمیم‌گرفته</span>');
      bulk.onclick=()=>{
        undoable(faN(done.length)+' پست به آرشیو رفت',()=>{for(const x of done)DB.archived[x.id]=Date.now();});
      };
    }
  }
  /* نوار «فیلترهای روشن»: فیلترها ذخیره می‌شوند، پس وقتی برمی‌گردی باید معلوم باشد چرا فهرست
     کوتاه یا خالی است. هر برچسب با × خودش برداشته می‌شود و «همه را بردار» به حالت پیش‌فرض می‌برد. */
  {
    const tags=[];
    const BK={res:'نتایج',exp:'منقضی',arch:'آرشیو'};
    // بخش‌های بالا (در انتظار/سیگنال‌ها/همه) خودشان روشن دیده می‌شوند؛ اینجا فقط چیزهایی که از چشم می‌افتند
    if(bucket!=='live'&&BK[bucket])tags.push([BK[bucket],()=>{bucket='live';}]);
    if(bucket==='live'&&sigFilter==='all'&&VIEW.kind&&VIEW.kind!=='all')
      tags.push([VIEW.kind==='sig'?'سیگنال':(KIND_FA[VIEW.kind]||VIEW.kind),()=>{VIEW.kind='all';}]);
    if(DAY_FA[VIEW.day]&&VIEW.day!=='all')tags.push(['روز: '+DAY_FA[VIEW.day],()=>{VIEW.day='all';}]);
    if(coinFilter)tags.push(['فقط '+esc(coinFilter),()=>{coinFilter=null;}]);
    if(q)tags.push(['جستجو: '+esc(query.trim().slice(0,16)),()=>{query='';$('#q').value='';}]);
    if(tags.length){
      const bar=el('div','actf');bar.setAttribute('aria-label','فیلترهای روشن');
      bar.appendChild(el('span','actl',ic('sliders')+'<span>فیلتر روشن</span>'));
      for(const [t,off] of tags){
        const b=el('button','actc',t+' <i aria-hidden="true">×</i>');b.title='برداشتن این فیلتر';
        b.onclick=()=>{off();setView({});};bar.appendChild(b);
      }
      if(tags.length>1){const all=el('button','actall','همه را بردار');
        all.onclick=()=>{bucket='live';sigFilter='sig';coinFilter=null;query='';$('#q').value='';
          setView({kind:'all',day:'all'});};bar.appendChild(all);}
      list.appendChild(bar);
    }
  }
  if(!n&&!POSTS.length&&H.tg.err){/* خطا و راه‌حلش در نوار وضعیت بالاست؛ پیغام «هنوز پستی نیامده» اینجا تکرار نمی‌شود */}
  else if(!n){
    list.appendChild(el('div','empty',STAR+(POSTS.length
      ?(bucket==='arch'?'آرشیو خالی است.<br>روی هر پستی دکمه‌ی «آرشیو» را بزن تا اینجا بیاید.'
        :bucket==='res'?'هنوز پست نتیجه‌ای نیامده.<br>پست‌هایی مثل «تارگت اول زد» یا «استاپ خورد» خودشان اینجا جمع می‌شوند؛ هر پست دیگری را هم با دکمه‌ی «نتیجه» می‌فرستی اینجا.'
        :coinFilter?'برای '+esc(coinFilter)+' چیزی نیست.<br>فیلتر ارز را بردار.'
        :VIEW.day!=='all'?'در «'+DAY_FA[VIEW.day]+'» پستی با این فیلتر نیست.<br>«همه‌ی روزها» را بزن'+(REACHED_END?'.':' یا پست‌های قدیمی‌تر را بخوان.')
        :bucket==='exp'?'سیگنال منقضی‌ای نیست.<br>سیگنال‌هایی که بیش از '+faN(S.staleDays||7)+' روز از آن‌ها گذشته خودشان اینجا می‌آیند.'
        :sigFilter==='new'?'سیگنال تازه‌ای منتظر تصمیم نیست.<br>سیگنال‌های بیش از '+faN(S.staleDays||7)+' روز در «منقضی» برای مرور مانده‌اند.'
                  :'چیزی با این فیلتر نیست.<br>«همه» را بزن یا جستجو را خالی کن.')
      :'هنوز پستی نیامده.<br>دکمه بروزرسانی را بزن.')));
  }else{
    list.appendChild(frag);
    if(matched>n){
      const more=el('button','showmore','نمایش '+faN(Math.min(PAGE,matched-n))+' مورد بیشتر'+
        ' <span>از '+faN(matched)+'</span>');
      more.onclick=()=>{shownMax+=PAGE;renderSignals();};
      list.appendChild(more);
    }
    if(bulk)list.appendChild(bulk);
  }
  renderMore();
  showStatus();
  restoreAnchor(anchor);
}
function renderMore(){
  const b=$('#btnMore'), i=$('#moreInfo');
  if(REACHED_END){
    b.classList.add('hide');
    i.className='moreinfo';
    i.textContent=POSTS.length?'تا اولین پست کانال خوانده شد.':'';
    return;
  }
  b.classList.remove('hide');
  if(b.dataset.lbl==null)b.innerHTML=ic('down')+'<span>پست‌های قدیمی‌تر</span>';
}
function showStatus(){
  const st=$('#status');
  if(!POSTS.length&&!H.tg.err){st.className='status';st.innerHTML='';return;}
  if(H.tg.err&&!POSTS.length){
    st.className='status bad';
    st.innerHTML='<div><b>کانال خوانده نشد.</b><br>'+esc(H.tg.err)+'<br>'+
      'اتصال یا فیلترشکن را عوض کن و چند لحظه بعد دوباره بزن. پوزیشن‌ها و کارنامه‌ات بدون اینترنت هم کار می‌کنند.</div>';
    const row=el('div','srow');row.style.marginTop='10px';
    const b=el('button','btn sm','تلاش دوباره');
    b.onclick=async()=>{btnBusy(b,true,'در حال تلاش');await refresh(false);btnBusy(b,false);};
    // پیغام خطا به «تست اتصال» اشاره می‌کند؛ همان دکمه همین‌جاست، نه فقط پشت نقطه‌های سربرگ
    const t=el('button','btn sm',ic('wifi')+'<span>تست اتصال</span>');t.onclick=sheetHealth;
    row.appendChild(b);row.appendChild(t);st.appendChild(row);
    return;
  }
  /* شمارنده‌های «پست/سیگنال/تصمیم‌نگرفته» از اینجا برداشته شدند: همین سه عدد
     دقیقاً در نوار فیلترِ بالای همین صفحه هستند (همه/سیگنال‌ها/در انتظار).
     اینجا فقط چیزی می‌ماند که جای دیگری نوشته نشده. */
  st.className='status';
  const px=(priceSrc&&priceSrc!=='—')
    ?(H.px.state==='stale'?'قیمت قدیمی ':'قیمت ')+esc(priceSrc)+' · '+ageTxt(PX_AT)
    :'قیمت هنوز نیامده';        // «قیمت — · —» شبیه خرابی بود، نه شبیه انتظار
  let money='';
  if(F('summary')){
    const m=moneyNow();
    money='<span class="sc">سود/ضرر باز <b class="'+(m.hasPx?cls(m.openPnl):'m')+'">'+
        (m.hasPx?fmtUsd(m.openPnl):'—')+'</b></span>'+
      '<span class="sc">تا حد ضرر روزانه <b class="'+m.hot+'">'+fmtUsd(m.left)+'</b></span>'+
      (m.nOpen?'<span class="sc" title="اگر استاپ همه‌ی پوزیشن‌های باز همین الان بخورد، این درصد از حساب می‌رود">ریسک باز <b class="'+m.riskHot+'">'+
        m.risk.toFixed(1)+'٪</b><i class="rcap">/'+faN(+S.openRisk||15)+'٪</i></span>':'');
  }
  st.innerHTML='<span class="sc">مارجین <b>$'+faN(S.cap)+'</b> · ریسک <b>'+faN(S.risk)+'٪</b></span>'+
    money+'<span class="sc grow" style="color:var(--tx3)">'+px+'</span>';
  if(H.tg.err){
    const w=el('span','sc');w.style.color='var(--warn)';w.textContent='آخرین بروزرسانی ناموفق بود؛ این‌ها از حافظه‌اند.';
    st.appendChild(w);
  }
}
/* نوار «تازه رسید»: بعد از هر بروزرسانی می‌گوید چند سیگنال جدید آمده */
let incT=null;
function showIncoming(nNew,nSig){
  if(F('notify')&&nSig>0&&document.hidden)
    notify('میز سیگنال',faN(nSig)+' سیگنال تازه در @'+S.channel,'newsig');
  const b=$('#incoming');
  clearTimeout(incT);
  if(!nNew){b.classList.add('hide');return;}
  b.className='incoming done'+(window.scrollY>240?' float':'');
  b.innerHTML=ic('check')+'<span>'+faN(nNew)+' پست تازه'+(nSig?'، '+faN(nSig)+' سیگنال':'')+
    (window.scrollY>240?' ↑':' رسید — برای دیدن بزن')+'</span>';
  b.onclick=()=>{b.classList.add('hide');window.scrollTo({top:0,behavior:'smooth'});};
  incT=setTimeout(()=>b.classList.add('hide'),12000);
}
function showFetching(txt){
  const b=$('#incoming');
  clearTimeout(incT);
  b.className='incoming';
  b.innerHTML=STAR+'<span>'+txt+'</span>';
}


