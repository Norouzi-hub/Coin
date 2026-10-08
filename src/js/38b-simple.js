/* ==================== سرعت و سادگی (پیشنهادهای ۳۹ تا ۴۳) ====================
   39 «الان چه کنم؟»: بالای سیگنال‌ها، همه‌ی سیگنال‌های قابل گرفتن با عدد و دکمه‌ی اقدام، نزدیک‌ترین مهلت، پیشنهادهای تازه
   40 حالت «فقط ضروری» (کلید امکانات): پنل‌های تحلیلیِ کانال‌سنج و کارنامه پنهان
   41 پنل‌های بسته‌ی کانال‌سنج تا باز نشوند ساخته نمی‌شوند (32-autoexec.js)
   42 «عکس‌ها فقط با زدن» (کلید امکانات): در اینترنت کند حجم دانلود را کم می‌کند (17-gallery.js)
   43 میان‌برهای آیکون برنامه (manifest) و باز شدن مستقیم با ?v= */

const GLMAX=12;
let GLALL=false;
/* سیگنال‌های قابل گرفتن: تصمیم‌نگرفته، منقضی‌نشده، نه بلندمدت، نه «دیر رسیدی». همه‌شان، نه فقط چهار تا،
   با عددها و دکمه‌ی اقدام، تا همین‌جا بررسی و وارد شوی. دیر رسیده‌ها و بلندمدت‌ها فقط شمرده می‌شوند. */
function glanceData(){
  const now=Date.now(), take=[];let late=0,lt=0,nost=0;
  for(const p of POSTS){
    if(!p.date||now-p.date>(+S.staleDays||7)*864e5)break;
    if(!isOpenSig(p)||decisionOf(p.id)||bucketOf(p)!=='live')continue;
    const sig=sigOf(p), ov=OVERRIDE[p.id]||{}, px=PRICES.get(sig.ticker), I=planInputsOf(p,sig,ov,px);
    if(longTermOf(p,sig,I)){lt++;continue;}
    if(lateOf(I,sig.targets,px)){late++;continue;}
    // پیگیری («ورود مجدد») استاپ ندارد: همان استاپی که کانال‌سنج از سیگنال قبلیِ همین نماد برمی‌دارد
    let ov2=ov;
    if(!I.stop&&!I.spot){const inp=audInput(p);
      // جهت هم از همان سیگنال قبلی (پیگیریِ یک شورت، شورت است؛ پارسر بی‌جهت را لانگ می‌گیرد)
      if(inp&&inp.inh&&inp.stop){I.stop=inp.stop;I.stopInh=true;if(!sig.dirSet&&inp.dir)I.dir=inp.dir;
        ov2=Object.assign({},ov,{stop:inp.stop},!sig.dirSet&&inp.dir?{dir:inp.dir}:{});}}
    // بی‌استاپ برای ایزوله‌ی کوتاه‌مدت قابل گرفتن نیست؛ فقط شمرده می‌شود
    if(!I.stop&&!I.spot){nost++;continue;}
    const E=I.entry||px;
    let z=null,pl=null;if(!I.spot&&E&&I.stop){pl=xRulePlan(I.dir,E,I.stop,sig.targets);z=isoSize(E,pl?pl.stop:I.stop);}
    take.push({p,sig,ov:ov2,px,I,tk:sig.ticker,dir:I.dir,z,pl});
  }
  let dl=null;
  for(const q of DB.positions){const d=posDeadline(q);if(d&&(!dl||d<dl.t))dl={t:d,p:q};}
  let nL=0,nS=0;
  for(const p of POSTS){if(!p.date||now-p.date>30*864e5)break;if(!isSigPost(p))continue;
    const s=sigOf(p);if(!s.dirSet)continue;if(s.direction==='short')nS++;else nL++;}
  return {take,late,lt,nost,nL,nS,dl,open:openPos().length,unread:advUnread(),lock:lossLockOn()};
}
function glSigHtml(x,i){
  const {p,sig,I,px,z,pl}=x, E=I.entry, sd=E&&I.stop?Math.abs(E-I.stop)/E*100:null;
  const tps=(sig.targets||[]).filter(t=>E&&(t-E)*(x.dir==='long'?1:-1)>0).slice(0,3);
  const far=px&&E?(px-E)/E*100*(x.dir==='long'?1:-1):null;     // مثبت: قیمت از ورود به سمت سود رفته
  // سه عدد اصلی در سه خانه (مثل کارت رادار): ورود، استاپ، تارگت
  const kv='<div class="rdkv">'+
    '<div><small>'+(E?'ورود':sig.trigger!=null?'تریگر':'ورود')+'</small><b dir="ltr">'+(E?fmtPrice(E):sig.trigger!=null?fmtPrice(sig.trigger):'بازار')+'</b></div>'+
    '<div><small>استاپ'+(I.stopInh?' (سیگنال قبلی)':'')+'</small>'+(I.stop?'<b dir="ltr">'+fmtPrice(I.stop)+'</b>'+(sd!=null?'<small dir="ltr">'+fmtNum(sd)+'%</small>':''):'<b class="d">بی‌استاپ</b>')+'</div>'+
    '<div><small>تارگت</small><b dir="ltr">'+(tps.length?tps.slice(0,2).map(fmtPrice).join(' / '):'—')+'</b>'+(tps.length>2?'<small>+'+faN(tps.length-2)+'</small>':'')+'</div></div>';
  const now=px!=null?'قیمت الان <b dir="ltr">'+fmtPrice(px)+'</b>'+(far!=null?' · <span class="'+(Math.abs(far)<0.3?'u':far>0?'w':'m')+'">'+
    (Math.abs(far)<0.3?'روی ورود':far>0?fmtNum(far)+'٪ جلوتر از ورود':fmtNum(-far)+'٪ مانده تا ورود')+'</span>':''):'';
  const hl=histLine(p);
  return '<div class="glsig" data-i="'+i+'">'+
    '<button class="glit" data-sig="'+esc(p.id)+'"><b dir="ltr" class="rdtk">'+esc(x.tk||'')+'</b><span class="pill '+x.dir+'">'+(x.dir==='long'?'لانگ':'شورت')+'</span>'+
      (z?'<span class="glz">ایزوله '+faN(z.lev)+'x · '+fmtUsd(z.margin)+'</span>':'')+'<small>'+relTime(p.date)+'</small></button>'+
    kv+
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
  if(view!=='signals'||bucket!=='live'||sigFilter!=='now'){g.innerHTML='';g.className='';return;}
  if(!POSTS.length){g.className='glance gltab';g.innerHTML='<div class="empty">'+STAR+'هنوز پستی نیامده.</div>';return;}
  const d=glanceData();
  // فیلترهای همین تب: منبع (کانال / برنامه) و جهت
  const dirF=VIEW.nowDir||'all', take=d.take.filter(x=>dirF==='all'||x.dir===dirF);
  // حال بازار هر ۱۵ دقیقه؛ رسیدنش دوباره می‌کشد
  // اگر نیامد، حداکثر هر دو دقیقه یک بار؛ فقط وقتی داده‌ی تازه رسید دوباره می‌کشد (نه حلقه)
  if((!MKT||Date.now()-MKT.at>MK_TTL)&&Date.now()-MKTRY>120000){MKTRY=Date.now();const was=MKT&&MKT.at;
    mktLoad().then(m=>{if(m&&m.at!==was&&view==='signals')paintGlance();}).catch(()=>{});}
  g.className='glance gltab glnow';
  // تب است، نه کارت تاشو: سربرگ کارت وضعیت است (سبز: سیگنال قابل گرفتن هست)
  let h='<div class="glh '+(d.lock?'stop':d.take.length?'go':'wait')+'"><i class="glst">'+(d.lock?'✕':d.take.length?'✓':'…')+'</i><b>'+ic('bolt')+'الان چه کنم؟</b><span>'+
    [d.take.length?faN(d.take.length)+' سیگنال قابل گرفتن':'سیگنال قابل گرفتنی نیست',d.dl?'مهلت '+d.dl.p.ticker+': '+(d.dl.t<=Date.now()?'گذشت':fmtLeft(d.dl.t-Date.now())):'',
     d.unread?faN(d.unread)+' پیشنهاد تازه':'',MKT?'بازار '+MK_REG_FA[MKT.reg]:''].filter(Boolean).join(' · ')+'</span></div>';
  {
    h+='<div class="glb">';
    if(d.lock)h+='<div class="flag d"><i>!</i><span>'+faN(d.lock.n)+' باخت پیاپی — تا فردا ورود تازه نه.</span></div>';
    // بازار کل: یک خط تاشو؛ هشدارِ «بازار خلاف سیگنال‌هایت» بیرون از آن، جلوی چشم
    {const dirs={long:0,short:0};for(const x of take)dirs[x.dir]++;h+=mkStripHtml()+mktFlagsHtml(MKT,dirs);}
    if(d.nL+d.nS)h+='<div class="hint gldir">کانال در 30 روز اخیر: <b class="u">'+faN(d.nL)+' لانگ</b> · <b class="d">'+faN(d.nS)+' شورت</b>'+
      (d.nS<d.nL*0.15?' — کانال تقریباً فقط لانگ می‌دهد؛ شورت را در تب «بازار» (رادار) پیدا کن.':'')+'</div>';
    const list=GLALL?take:take.slice(0,GLMAX);
    list.forEach((x,i)=>h+=glSigHtml(x,i));
    if(take.length>list.length)h+='<button class="btn sm glmore" data-more="1">'+faN(take.length-list.length)+' سیگنال دیگر</button>';
    if(!take.length&&d.take.length)h+='<div class="hint">سیگنال کانالی با این فیلتر نیست ('+faN(d.take.length)+' سیگنال دیگر پنهان است).</div>';
    if(d.late||d.lt||d.nost)h+='<div class="hint glskip">'+[d.nost?faN(d.nost)+' سیگنال بی‌استاپ (نه در متن، نه از سیگنال قبلی؛ برای ایزوله نه)':'',d.late?faN(d.late)+' سیگنال دیر رسیده (قیمت بیش از نیمی از راه تا تارگت 1 را رفته)':'',
      d.lt?faN(d.lt)+' سیگنال بلندمدت (اسپات یا استاپ دورتر از '+fmtNum(isoMaxSd())+'٪)':''].filter(Boolean).join(' · ')+' — در فهرست «در انتظار» هستند.</div>';
    if(d.dl)h+='<button class="glit" data-pos="'+esc(d.dl.p.id)+'"><b dir="ltr">'+esc(d.dl.p.ticker)+'</b><span>'+ic('clock')+(d.dl.t<=Date.now()?'مهلت گذشت — ببند':fmtLeft(d.dl.t-Date.now())+' تا پایان مهلت')+'</span></button>';
    if(d.unread)h+='<button class="glit" data-bell="1">'+ic('bell')+'<span>'+faN(d.unread)+' پیشنهاد تازه از مشاور</span></button>';
    h+='</div>';
  }
  g.innerHTML=h;
  g.querySelectorAll('[data-sig]').forEach(b=>b.onclick=()=>advDo({t:'sig',id:b.dataset.sig}));
  g.querySelectorAll('[data-pos]').forEach(b=>b.onclick=()=>advDo({t:'pos',id:b.dataset.pos}));
  g.querySelectorAll('[data-bell]').forEach(b=>b.onclick=sheetAdvice);
  const mb=g.querySelector('[data-more]');if(mb)mb.onclick=()=>{GLALL=true;paintGlance();};
  mkStripBind(g);
  g.querySelectorAll('.glsig').forEach(w=>{
    const x=take[+w.dataset.i];if(!x)return;
    w.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
      const a=b.dataset.a;
      if(a==='iso')isoEnter(x.p,x.sig,x.ov,x.px);
      else if(a==='form')sheetEnter(x.p,x.sig,x.ov,x.px);
      else if(a==='skip')sheetSkip(x.p,x.sig,x.ov,x.px);
      else if(a==='copy')copyExch(x.p,x.sig,x.ov,x.px);
    });
  });
}

/* ۴۳) ?v=signals|positions|audit|report|radar|bell از میان‌برهای آیکون برنامه */
function openFromUrl(){
  let v=null;try{v=new URLSearchParams(location.search).get('v');}catch(e){}
  if(!v)return;
  if(v==='bell')setTimeout(sheetAdvice,400);
  else if(['signals','positions','audit','report','radar'].includes(v)){if(v==='signals'){bucket='live';sigFilter='new';}go(v,true);}
  try{history.replaceState(null,'',location.pathname);}catch(e){}
}
