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
  if(!lbList.includes(img))lbList=[img];          // تصویرِ داخل ورق (بیرون از نماها)
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


/* ---- عکس پست‌ها، حتی وقتی CDN تلگرام باز نیست ----
   عکس از telesco.pe می‌آید که روی بعضی شبکه‌ها فیلتر است، و آدرسش بعد از چند روز منقضی می‌شود.
   پس سه قدم: ۱) مستقیم ۲) خودِ فایل از راه واسط‌ها (اول واسط خودت) ۳) آدرس تازه از صفحه‌ی همان
   پست در تلگرام، و دوباره ۱ و ۲. اگر هیچ‌کدام نشد، جای عکس «دوباره» و «در تلگرام» می‌آید. */
const IMGBLOB=new Map(), IMGFRESH=new Map();
function imgViaRoutes(url){
  if(!url||/^(data|blob):/.test(url))return Promise.resolve(null);
  if(IMGBLOB.has(url))return IMGBLOB.get(url);
  const pr=(async()=>{
    for(const r of allRoutes().filter(r=>!r.unwrap&&r.id!=='direct')){
      try{
        const ctrl=new AbortController(), t=setTimeout(()=>ctrl.abort(),12000);
        const res=await fetch(r.build(url),{signal:ctrl.signal});clearTimeout(t);
        if(!res.ok)continue;
        const b=await res.blob();
        if(b.size<200||(b.type&&!/^image\/|octet-stream/.test(b.type)))continue;   // صفحه‌ی خطای واسط، نه عکس
        return URL.createObjectURL(b.type&&/^image\//.test(b.type)?b:new Blob([b],{type:'image/jpeg'}));
      }catch(e){}
    }
    return null;
  })();
  IMGBLOB.set(url,pr);
  pr.then(u=>{if(!u)IMGBLOB.delete(url);});         // شکست را نگه نداریم؛ «دوباره» واقعاً دوباره امتحان کند
  return pr;
}
function freshImgOf(p){
  if(!p||!p.id||!/\/\d+$/.test(p.id))return Promise.resolve(null);
  if(IMGFRESH.has(p.id))return IMGFRESH.get(p.id);
  const pr=fetchVia('https://t.me/'+p.id+'?embed=1&mode=tme',{kind:'tg',quiet:true,timeout:11000,label:'تصویر پست '+p.id,
      validate:t=>/tgme_widget_message/.test(String(t))})
    .then(got=>{const m=String(got.data).replace(/&quot;|&#39;/g,"'")
      .match(/tgme_widget_message_photo_wrap[^>]*?background-image:\s*url\(['"]?(https?:[^'")\s]+)/);return m?m[1]:null;})
    .catch(()=>null);
  IMGFRESH.set(p.id,pr);
  pr.then(u=>{if(!u)IMGFRESH.delete(p.id);});
  return pr;
}
/* قاب عکس (.shot) برای پست p؛ src پیش‌فرض p.img. با زدن، گالری باز می‌شود. */
function postShot(p,src,alt){
  const a=el('div','shot');a.setAttribute('role','button');a.setAttribute('aria-label','بزرگ‌نمایی تصویر');a.tabIndex=0;
  const im=el('img');im.loading='lazy';im.decoding='async';im.alt=alt||'تصویر';
  a.onclick=()=>{if(a.classList.contains('loaded'))openLightbox(im);};
  a.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&a.classList.contains('loaded')){e.preventDefault();openLightbox(im);}};
  im.onload=()=>{a.classList.add('loaded');a.classList.remove('noimg');};
  let url=src||p.img, step=0;
  const fail=()=>{
    a.classList.add('noimg');
    const box=el('div','noimgb','<span>'+ic('alert')+'تصویر باز نشد</span>');
    const rt=el('button','btn xs','دوباره');rt.type='button';
    rt.onclick=e=>{e.stopPropagation();box.remove();a.classList.remove('noimg');step=0;IMGFRESH.delete(p.id);im.removeAttribute('src');im.src=url;};
    box.appendChild(rt);
    if(p.link){const tg=el('a','btn xs','در تلگرام');tg.href=p.link;tg.target='_blank';tg.rel='noopener';tg.onclick=e=>e.stopPropagation();box.appendChild(tg);}
    a.appendChild(box);
  };
  im.onerror=async()=>{
    step++;
    if(step===1){const u=await imgViaRoutes(url);if(u){im.src=u;return;}step=2;}
    if(step===2){
      const f=await freshImgOf(p);
      if(f&&f!==url){
        if(!src||src===p.img){p.img=f;try{savePostCache();}catch(e){}}
        url=f;step=2;im.src=f;return;                  // بعد از آدرس تازه: مستقیم، و اگر نشد واسط
      }
    }
    if(step===3){const u=await imgViaRoutes(url);if(u){im.src=u;return;}}
    fail();
  };
  im.src=url;
  if(im.complete&&im.naturalWidth)a.classList.add('loaded');
  a.appendChild(im);
  return a;
}
