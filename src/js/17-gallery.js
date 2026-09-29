/* ==================== گالری تصویر ==================== */
/* تصویرها قبلاً به t.me لینک بودند و زدنشان کاربر را از برنامه بیرون می‌برد.
   حالا همین‌جا باز می‌شوند و بین همه‌ی تصویرهای همان نما می‌شود جابه‌جا شد. */
let lbList=[], lbAt=0, lbPop=false;
function lbCollect(){
  // ترتیب همان ترتیب صفحه است، پس «بعدی» یعنی تصویر پایین‌تر
  return $$('.shot img').filter(im=>im.src&&im.closest('.view:not(.hide)'));
}
function openLightbox(img){
  lbList=lbCollect();
  lbAt=Math.max(0,lbList.indexOf(img));
  if(!lbList.length)return;
  const lb=$('#lb');
  lb.classList.remove('hide','zoom');
  lbShow();
  // دکمه‌ی برگشت اندروید باید گالری را ببندد، نه از برنامه بیرون برود
  try{history.pushState({lb:1},'');lbPop=true;}catch(e){lbPop=false;}
}
function lbShow(){
  const im=lbList[lbAt];if(!im)return;
  $('#lbImg').src=im.currentSrc||im.src;
  $('#lbNum').textContent=lbList.length>1?faN(lbAt+1)+' از '+faN(lbList.length):'';
  $('#lbPrev').disabled=lbAt<=0;
  $('#lbNext').disabled=lbAt>=lbList.length-1;
  $('#lb').classList.remove('zoom');
  $('#lbWrap').scrollTop=0;$('#lbWrap').scrollLeft=0;
}
function lbGo(d){
  const n=lbAt+d;
  if(n<0||n>=lbList.length)return;
  lbAt=n;lbShow();
}
function closeLightbox(fromPop){
  const lb=$('#lb');
  if(lb.classList.contains('hide'))return;
  lb.classList.add('hide');lb.classList.remove('zoom');
  $('#lbImg').removeAttribute('src');
  if(!fromPop&&lbPop){lbPop=false;try{history.back();}catch(e){}}
  else lbPop=false;
}
function wireLightbox(){
  $('#lbClose').onclick=()=>closeLightbox();
  $('#lbPrev').onclick=()=>lbGo(-1);
  $('#lbNext').onclick=()=>lbGo(1);
  // زدن روی پس‌زمینه می‌بندد، ولی نه وقتی بزرگ‌نمایی روشن است (آنجا در حال جابه‌جا کردنی)
  $('#lbWrap').onclick=e=>{if(e.target===$('#lbWrap')&&!$('#lb').classList.contains('zoom'))closeLightbox();};
  let lastTap=0;
  $('#lbImg').onclick=()=>{
    const now=Date.now();
    if(now-lastTap<320){$('#lb').classList.toggle('zoom');$('#lb').classList.add('seen');}
    lastTap=now;
  };
  // کشیدن افقی برای عکس بعدی/قبلی
  let x0=null,y0=null;
  $('#lb').addEventListener('touchstart',e=>{
    if(e.touches.length!==1||$('#lb').classList.contains('zoom'))return;
    x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  $('#lb').addEventListener('touchend',e=>{
    if(x0==null)return;
    const t=e.changedTouches[0], dx=t.clientX-x0, dy=t.clientY-y0;
    x0=null;
    if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy))return;
    const rtl=getComputedStyle(document.documentElement).direction==='rtl';
    lbGo(rtl?(dx>0?1:-1):(dx>0?-1:1));
    $('#lb').classList.add('seen');
  },{passive:true});
  document.addEventListener('keydown',e=>{
    if($('#lb').classList.contains('hide'))return;
    if(e.key==='Escape')closeLightbox();
    else if(e.key==='ArrowRight')lbGo(1);
    else if(e.key==='ArrowLeft')lbGo(-1);
  });
  window.addEventListener('popstate',()=>{
    if(!$('#lb').classList.contains('hide'))closeLightbox(true);
  });
}

