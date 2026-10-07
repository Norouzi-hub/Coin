/* ==================== سرعت و سادگی (پیشنهادهای ۳۹ تا ۴۳) ====================
   ۳۹ «الان چه کنم؟»: بالای سیگنال‌ها، سیگنال‌های قابل گرفتن، نزدیک‌ترین مهلت، پیشنهادهای تازه
   ۴۰ حالت «فقط ضروری» (کلید امکانات): پنل‌های تحلیلیِ کانال‌سنج و کارنامه پنهان
   ۴۱ پنل‌های بسته‌ی کانال‌سنج تا باز نشوند ساخته نمی‌شوند (32-autoexec.js)
   ۴۲ «عکس‌ها فقط با زدن» (کلید امکانات): در اینترنت کند حجم دانلود را کم می‌کند (17-gallery.js)
   ۴۳ میان‌برهای آیکون برنامه (manifest) و باز شدن مستقیم با ?v= */

const GLKEY='signaldesk.glance.v1';
let GLSHUT=!!lsGet(GLKEY);
function glanceData(){
  const now=Date.now(), take=[];
  for(const p of POSTS){
    if(!p.date||now-p.date>(+S.staleDays||7)*864e5)break;
    if(!isOpenSig(p)||decisionOf(p.id)||bucketOf(p)!=='live')continue;
    const sig=sigOf(p), ov=OVERRIDE[p.id]||{}, px=PRICES.get(sig.ticker), I=planInputsOf(p,sig,ov,px);
    if(longTermOf(p,sig,I)||lateOf(I,sig.targets,px))continue;
    const E=I.entry||px;
    let z=null;if(!I.spot&&E&&I.stop){const pl=xRulePlan(I.dir,E,I.stop,sig.targets);z=isoSize(E,pl?pl.stop:I.stop);}
    take.push({p,tk:sig.ticker,dir:I.dir,z});
    if(take.length>=4)break;
  }
  let dl=null;
  for(const q of DB.positions){const d=posDeadline(q);if(d&&(!dl||d<dl.t))dl={t:d,p:q};}
  return {take,dl,open:openPos().length,unread:advUnread(),lock:lossLockOn()};
}
function paintGlance(){
  const g=$('#glance');if(!g)return;
  if(view!=='signals'||bucket!=='live'||!POSTS.length){g.innerHTML='';return;}
  const d=glanceData();
  if(!d.take.length&&!d.dl&&!d.unread&&!d.lock){g.innerHTML='';return;}
  g.className='glance'+(GLSHUT?' shut':'');
  let h='<button class="glh" type="button"><b>'+ic('bolt')+'الان چه کنم؟</b><span>'+
    [d.take.length?faN(d.take.length)+' سیگنال قابل گرفتن':'',d.dl?'مهلت '+d.dl.p.ticker+': '+(d.dl.t<=Date.now()?'گذشت':fmtLeft(d.dl.t-Date.now())):'',
     d.unread?faN(d.unread)+' پیشنهاد تازه':''].filter(Boolean).join(' · ')+'</span><i class="chev"></i></button>';
  if(!GLSHUT){
    h+='<div class="glb">';
    if(d.lock)h+='<div class="flag d"><i>!</i><span>'+faN(d.lock.n)+' باخت پیاپی — تا فردا ورود تازه نه.</span></div>';
    for(const x of d.take)h+='<button class="glit" data-sig="'+esc(x.p.id)+'"><b dir="ltr">'+esc(x.tk||'')+'</b><span class="pill '+x.dir+'">'+(x.dir==='long'?'لانگ':'شورت')+'</span>'+
      (x.z?'<span>ایزوله '+faN(x.z.lev)+'x · '+fmtUsd(x.z.margin)+'</span>':'')+'<small>'+relTime(x.p.date)+'</small></button>';
    if(d.dl)h+='<button class="glit" data-pos="'+esc(d.dl.p.id)+'"><b dir="ltr">'+esc(d.dl.p.ticker)+'</b><span>'+ic('clock')+(d.dl.t<=Date.now()?'مهلت گذشت — ببند':fmtLeft(d.dl.t-Date.now())+' تا پایان مهلت')+'</span></button>';
    if(d.unread)h+='<button class="glit" data-bell="1">'+ic('bell')+'<span>'+faN(d.unread)+' پیشنهاد تازه از مشاور</span></button>';
    h+='</div>';
  }
  g.innerHTML=h;
  g.querySelector('.glh').onclick=()=>{GLSHUT=!GLSHUT;lsSet(GLKEY,GLSHUT?1:0);paintGlance();};
  g.querySelectorAll('[data-sig]').forEach(b=>b.onclick=()=>advDo({t:'sig',id:b.dataset.sig}));
  g.querySelectorAll('[data-pos]').forEach(b=>b.onclick=()=>advDo({t:'pos',id:b.dataset.pos}));
  g.querySelectorAll('[data-bell]').forEach(b=>b.onclick=sheetAdvice);
}

/* ۴۳) ?v=signals|positions|audit|report|scalp|bell از میان‌برهای آیکون برنامه */
function openFromUrl(){
  let v=null;try{v=new URLSearchParams(location.search).get('v');}catch(e){}
  if(!v)return;
  if(v==='bell')setTimeout(sheetAdvice,400);
  else if(['signals','positions','audit','report','scalp'].includes(v)){if(v==='signals'){bucket='live';sigFilter='new';}go(v,true);}
  try{history.replaceState(null,'',location.pathname);}catch(e){}
}
