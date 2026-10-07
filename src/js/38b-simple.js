/* ==================== سرعت و سادگی (پیشنهادهای ۳۹ تا ۴۳) ====================
   39 «الان چه کنم؟»: بالای سیگنال‌ها، همه‌ی سیگنال‌های قابل گرفتن با عدد و دکمه‌ی اقدام، نزدیک‌ترین مهلت، پیشنهادهای تازه
   40 حالت «فقط ضروری» (کلید امکانات): پنل‌های تحلیلیِ کانال‌سنج و کارنامه پنهان
   41 پنل‌های بسته‌ی کانال‌سنج تا باز نشوند ساخته نمی‌شوند (32-autoexec.js)
   42 «عکس‌ها فقط با زدن» (کلید امکانات): در اینترنت کند حجم دانلود را کم می‌کند (17-gallery.js)
   43 میان‌برهای آیکون برنامه (manifest) و باز شدن مستقیم با ?v= */

const GLKEY='signaldesk.glance.v1', GLMAX=12;
let GLSHUT=!!lsGet(GLKEY), GLALL=false;
/* سیگنال‌های قابل گرفتن: تصمیم‌نگرفته، منقضی‌نشده، نه بلندمدت، نه «دیر رسیدی». همه‌شان، نه فقط چهار تا،
   با عددها و دکمه‌ی اقدام، تا همین‌جا بررسی و وارد شوی. دیر رسیده‌ها و بلندمدت‌ها فقط شمرده می‌شوند. */
function glanceData(){
  const now=Date.now(), take=[];let late=0,lt=0;
  for(const p of POSTS){
    if(!p.date||now-p.date>(+S.staleDays||7)*864e5)break;
    if(!isOpenSig(p)||decisionOf(p.id)||bucketOf(p)!=='live')continue;
    const sig=sigOf(p), ov=OVERRIDE[p.id]||{}, px=PRICES.get(sig.ticker), I=planInputsOf(p,sig,ov,px);
    if(longTermOf(p,sig,I)){lt++;continue;}
    if(lateOf(I,sig.targets,px)){late++;continue;}
    const E=I.entry||px;
    let z=null,pl=null;if(!I.spot&&E&&I.stop){pl=xRulePlan(I.dir,E,I.stop,sig.targets);z=isoSize(E,pl?pl.stop:I.stop);}
    take.push({p,sig,ov,px,I,tk:sig.ticker,dir:I.dir,z,pl});
  }
  let dl=null;
  for(const q of DB.positions){const d=posDeadline(q);if(d&&(!dl||d<dl.t))dl={t:d,p:q};}
  return {take,late,lt,dl,open:openPos().length,unread:advUnread(),lock:lossLockOn()};
}
function glSigHtml(x,i){
  const {p,sig,I,px,z,pl}=x, E=I.entry, sd=E&&I.stop?Math.abs(E-I.stop)/E*100:null;
  const tps=(sig.targets||[]).filter(t=>E&&(t-E)*(x.dir==='long'?1:-1)>0).slice(0,3);
  const far=px&&E?(px-E)/E*100*(x.dir==='long'?1:-1):null;     // مثبت: قیمت از ورود به سمت سود رفته
  const nums=[E?'ورود <b dir="ltr">'+fmtPrice(E)+'</b>':(sig.trigger!=null?'تریگر <b dir="ltr">'+fmtPrice(sig.trigger)+'</b>':'ورود بازار'),
    I.stop?'استاپ <b dir="ltr">'+fmtPrice(I.stop)+'</b>'+(sd!=null?' ('+fmtNum(sd)+'٪)':''):'<span class="d">بی‌استاپ</span>',
    tps.length?'تارگت <b dir="ltr">'+tps.map(fmtPrice).join(' / ')+'</b>':''].filter(Boolean).join(' · ');
  const now=px!=null?'قیمت الان <b dir="ltr">'+fmtPrice(px)+'</b>'+(far!=null?' · <span class="'+(Math.abs(far)<0.3?'u':far>0?'w':'m')+'">'+
    (Math.abs(far)<0.3?'روی ورود':far>0?fmtNum(far)+'٪ جلوتر از ورود':fmtNum(-far)+'٪ مانده تا ورود')+'</span>':''):'';
  const hl=histLine(p);
  return '<div class="glsig" data-i="'+i+'">'+
    '<button class="glit" data-sig="'+esc(p.id)+'"><b dir="ltr">'+esc(x.tk||'')+'</b><span class="pill '+x.dir+'">'+(x.dir==='long'?'لانگ':'شورت')+'</span>'+
      (z?'<span>ایزوله '+faN(z.lev)+'x · '+fmtUsd(z.margin)+'</span>':'')+'<small>'+relTime(p.date)+'</small></button>'+
    '<div class="glnum">'+nums+'</div>'+
    (now?'<div class="glnum">'+now+'</div>':'')+
    (pl?'<div class="glnum">قاعده‌ی من: '+esc(xRuleName(pl.r))+' · هدف <b dir="ltr">'+fmtPrice(pl.tp)+'</b></div>':'')+
    (hl?'<div class="glnum glh2">سابقه: '+hl+'</div>':'')+
    (()=>{const e=mkEvPills(x.tk,x.dir);return e?'<div class="glnum">'+e+'</div>':'';})()+
    '<div class="glact">'+
      (z?'<button class="btn sm ok" data-a="iso">'+ic('shield')+'<span>ایزوله '+faN(z.lev)+'x · '+fmtUsd(z.margin)+'</span></button>':'')+
      '<button class="btn sm'+(z?'':' ok')+'" data-a="form">'+(z?'فرم کامل':'بررسی و ورود')+'</button>'+
      '<button class="btn sm no" data-a="skip">وارد نشدم</button>'+
      '<button class="btn sm side" data-a="copy" title="نماد، ورود، استاپ، تارگت، اهرم برای اپ صرافی">'+ic('share')+'</button>'+
    '</div></div>';
}
function paintGlance(){
  const g=$('#glance');if(!g)return;
  if(view!=='signals'||bucket!=='live'||!POSTS.length){g.innerHTML='';return;}
  const d=glanceData();
  // حال بازار هر ۱۵ دقیقه؛ رسیدنش دوباره می‌کشد
  // اگر نیامد، حداکثر هر دو دقیقه یک بار؛ فقط وقتی داده‌ی تازه رسید دوباره می‌کشد (نه حلقه)
  if((!MKT||Date.now()-MKT.at>MK_TTL)&&Date.now()-MKTRY>120000){MKTRY=Date.now();const was=MKT&&MKT.at;
    mktLoad().then(m=>{if(m&&m.at!==was&&view==='signals')paintGlance();}).catch(()=>{});}
  // پیشنهاد برنامه: هر نیم ساعت یک بار بررسی (در پس‌زمینه، دو ارز هم‌زمان)
  if(F('autosig')&&!ASQ.on&&Date.now()-AS.at>30*60000&&(SYMBOLS.size||MKT))setTimeout(()=>asScan(),400);
  if(!d.take.length&&!d.dl&&!d.unread&&!d.lock&&!d.late&&!d.lt&&!MKT&&!F('autosig')){g.innerHTML='';return;}
  g.className='glance'+(GLSHUT?' shut':'');
  let h='<button class="glh" type="button"><b>'+ic('bolt')+'الان چه کنم؟</b><span>'+
    [d.take.length?faN(d.take.length)+' سیگنال قابل گرفتن':'سیگنال قابل گرفتنی نیست',d.dl?'مهلت '+d.dl.p.ticker+': '+(d.dl.t<=Date.now()?'گذشت':fmtLeft(d.dl.t-Date.now())):'',
     d.unread?faN(d.unread)+' پیشنهاد تازه':'',MKT?'بازار '+MK_REG_FA[MKT.reg]:''].filter(Boolean).join(' · ')+'</span><i class="chev"></i></button>';
  if(!GLSHUT){
    h+='<div class="glb">';
    if(d.lock)h+='<div class="flag d"><i>!</i><span>'+faN(d.lock.n)+' باخت پیاپی — تا فردا ورود تازه نه.</span></div>';
    {const dirs={long:0,short:0};for(const x of d.take)dirs[x.dir]++;h+=mktHtml(MKT,dirs);}
    h+=asHtml();
    const list=GLALL?d.take:d.take.slice(0,GLMAX);
    list.forEach((x,i)=>h+=glSigHtml(x,i));
    if(d.take.length>list.length)h+='<button class="btn sm glmore" data-more="1">'+faN(d.take.length-list.length)+' سیگنال دیگر</button>';
    if(d.late||d.lt)h+='<div class="hint glskip">'+[d.late?faN(d.late)+' سیگنال دیر رسیده (قیمت بیش از نیمی از راه تا تارگت 1 را رفته)':'',
      d.lt?faN(d.lt)+' سیگنال بلندمدت (اسپات یا استاپ دورتر از '+fmtNum(isoMaxSd())+'٪)':''].filter(Boolean).join(' · ')+' — در فهرست «در انتظار» هستند.</div>';
    if(d.dl)h+='<button class="glit" data-pos="'+esc(d.dl.p.id)+'"><b dir="ltr">'+esc(d.dl.p.ticker)+'</b><span>'+ic('clock')+(d.dl.t<=Date.now()?'مهلت گذشت — ببند':fmtLeft(d.dl.t-Date.now())+' تا پایان مهلت')+'</span></button>';
    if(d.unread)h+='<button class="glit" data-bell="1">'+ic('bell')+'<span>'+faN(d.unread)+' پیشنهاد تازه از مشاور</span></button>';
    h+='</div>';
  }
  g.innerHTML=h;
  g.querySelector('.glh').onclick=()=>{GLSHUT=!GLSHUT;lsSet(GLKEY,GLSHUT?1:0);paintGlance();};
  g.querySelectorAll('[data-sig]').forEach(b=>b.onclick=()=>advDo({t:'sig',id:b.dataset.sig}));
  g.querySelectorAll('[data-pos]').forEach(b=>b.onclick=()=>advDo({t:'pos',id:b.dataset.pos}));
  g.querySelectorAll('[data-bell]').forEach(b=>b.onclick=sheetAdvice);
  const mb=g.querySelector('[data-more]');if(mb)mb.onclick=()=>{GLALL=true;paintGlance();};
  asWire(g);
  g.querySelectorAll('.glsig').forEach(w=>{
    const x=d.take[+w.dataset.i];if(!x)return;
    w.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
      const a=b.dataset.a;
      if(a==='iso')isoEnter(x.p,x.sig,x.ov,x.px);
      else if(a==='form')sheetEnter(x.p,x.sig,x.ov,x.px);
      else if(a==='skip')sheetSkip(x.p,x.sig,x.ov,x.px);
      else if(a==='copy')copyExch(x.p,x.sig,x.ov,x.px);
    });
  });
}

/* ۴۳) ?v=signals|positions|audit|report|scalp|bell از میان‌برهای آیکون برنامه */
function openFromUrl(){
  let v=null;try{v=new URLSearchParams(location.search).get('v');}catch(e){}
  if(!v)return;
  if(v==='bell')setTimeout(sheetAdvice,400);
  else if(['signals','positions','audit','report','scalp'].includes(v)){if(v==='signals'){bucket='live';sigFilter='new';}go(v,true);}
  try{history.replaceState(null,'',location.pathname);}catch(e){}
}
