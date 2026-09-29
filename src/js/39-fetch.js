/* ==================== گرفتن داده ==================== */
/* بروزرسانی معمولی فقط صفحه‌ی اول کانال را می‌خواند و پست‌های تازه را به آنچه داری اضافه می‌کند؛
   پست‌های قدیمی‌تر فقط وقتی خواسته شوند گرفته می‌شوند */
let pendingRefresh=false;
async function refresh(append,silent){
  // اگر وسط یک بروزرسانی درخواست تازه بیاید (مثلاً واسط را عوض کردی)، دور نمی‌ریزیم؛
  // بعد از تمام شدن کار فعلی خودش دوباره اجرا می‌شود
  if(busy){if(!append)pendingRefresh=true;return false;}
  busy=true;
  const btn=$('#btnRef');
  if(!append)btnBusy(btn,true);
  if(append){$('#moreSkel').classList.remove('hide');$('#moreSkel').innerHTML=skelHTML(2);}
  else if(!POSTS.length&&view==='signals')renderSignals();
  else if(!silent&&view==='signals')showFetching('در حال خواندن کانال…');
  let okAny=false;
  try{
    const pxP=loadPrices(!append);
    const before=append?beforeForOlder():null;
    let res=null,err=null;
    try{res=await loadChannel(before);}catch(e){err=e;}
    await pxP;
    if(res){
      trackChanges(res.posts);
      const have=new Set(POSTS.map(p=>p.id));
      const incoming=res.posts.filter(p=>!have.has(p.id));
      const coldStart=!POSTS.length;      // بار اول همه‌چیز «تازه» است، پس نشان تازه معنی ندارد
      if(append){
        if(!incoming.length)REACHED_END=true;
        POSTS=POSTS.concat(incoming);
      }else{
        if(!coldStart)for(const p of incoming)if(!isStale(p))NEWIDS.add(p.id);
        POSTS=POSTS.concat(incoming);
        if(!res.before&&!POSTS.length)REACHED_END=true;
      }
      POSTS.sort(byNewest);
      if(POSTS.length>CACHE_MAX)POSTS=POSTS.slice(0,CACHE_MAX);
      beforeId=res.before;
      pruneCaches();
      savePostCache();
      okAny=true;
      if(!GUIDE.tried&&guideMissing().length)setTimeout(()=>loadGuide(false),1200);
      if(append){
        const i=$('#moreInfo');
        if(!incoming.length){i.className='moreinfo';i.textContent='تا اولین پست کانال خوانده شد.';}
        else{i.className='moreinfo ok';i.textContent=faN(incoming.length)+' پست قدیمی‌تر اضافه شد.';
          setTimeout(()=>{if(i.textContent.includes('قدیمی‌تر'))i.textContent='';},6000);}
      }else if(!coldStart){
        const nSig=incoming.filter(p=>isSigPost(p)&&!isStale(p)).length;
        showIncoming(incoming.length,nSig);
      }else $('#incoming').classList.add('hide');
    }else if(append){
      const i=$('#moreInfo');i.className='moreinfo bad';
      i.textContent='پست‌های قدیمی‌تر نیامد؛ چند لحظه بعد دوباره بزن.';
    }else{
      $('#incoming').classList.add('hide');
    }
    // پیش از رندر: وگرنه فهرست خالی هنوز «در حال خواندن» حساب می‌شد و اسکلت بارگذاری زیر خطا می‌ماند
    busy=false;
    renderAll();
    if(okAny&&typeof feedSoon==='function')feedSoon();     // سیگنال تازه ← لینک خروجی هم تازه شود
    return okAny;
  }finally{
    busy=false;
    btnBusy(btn,false);
    $('#moreSkel').classList.add('hide');$('#moreSkel').innerHTML='';
    if(!append)setTimer();
    if(pendingRefresh&&!append){pendingRefresh=false;setTimeout(()=>refresh(false,true),60);}
  }
}
/* ویرایش و حذف: برنامه نسخه‌ی خودش از هر پست را نگه می‌دارد. تا نسخه‌ی 1 اگر کانال
   پستی را بعداً ویرایش می‌کرد، متن تازه بی‌صدا دور ریخته می‌شد. حالا مقایسه می‌شود:
   اگر عددی عوض شده باشد (ورود، استاپ، تارگت، نماد) ثبت می‌شود، و کانال‌سنج همیشه با
   همان عددهایی حساب می‌کند که اول منتشر شد. پستی هم که قبلاً دیده بودیم و در بازه‌ی
   همان صفحه دیگر نیست، دو بار پشت سر هم نبودنش یعنی حذف شده. */
const GONEMISS=new Map();
const normTxt=t=>String(t||'').replace(/\s+/g,' ').trim();
const sigNums=t=>{const a=parseSignal(t);return JSON.stringify([a.ticker,a.entry,a.stop,a.targets]);};
function trackChanges(fresh){
  if(!fresh||!fresh.length)return;
  const byId=new Map(POSTS.map(p=>[p.id,p]));
  let changed=false;
  for(const f of fresh){
    const o=byId.get(f.id);if(!o)continue;
    GONEMISS.delete(o.id);
    if(DB.gone[o.id]){delete DB.gone[o.id];changed=true;}
    if(!f.text||normTxt(o.text)===normTxt(f.text))continue;
    const first=o.origText||o.text||'';
    DB.edits[o.id]={at:Date.now(),old:first.slice(0,700),now:f.text.slice(0,700),
      nums:sigNums(first)!==sigNums(f.text)};
    if(!o.origText)o.origText=first;
    o.text=f.text;PCACHE.delete(o.id);RCACHE.delete(o.id);changed=true;
    logIt('warn','کانال پست '+o.id+' را ویرایش کرد'+(DB.edits[o.id].nums?' — عددها عوض شد':''));
  }
  const nums=fresh.map(p=>p.num).filter(Boolean);
  if(nums.length>=2){
    const lo=Math.min(...nums), hi=Math.max(...nums), got=new Set(fresh.map(p=>p.id));
    for(const p of POSTS){
      if(!p.num||p.num<=lo||p.num>=hi||got.has(p.id)||DB.gone[p.id])continue;
      const n=(GONEMISS.get(p.id)||0)+1;GONEMISS.set(p.id,n);
      if(n>=2){DB.gone[p.id]={at:Date.now()};changed=true;
        logIt('warn','پست '+p.id+' دیگر در کانال نیست');}
    }
  }
  if(changed)save();
}
/* برای گرفتن قدیمی‌ترها، از شماره‌ی کوچک‌ترین پستی که داریم عقب می‌رویم */
function beforeForOlder(){
  if(!POSTS.length)return beforeId;
  const min=POSTS.reduce((m,p)=>Math.min(m,p.num||Infinity),Infinity);
  return isFinite(min)?String(min):beforeId;
}
async function switchChannel(){
  PCACHE.clear();NEWIDS.clear();CARDS.clear();
  beforeId=null;COLLAPSED={};
  H.tg={state:'idle',route:null,ms:null,at:null,err:null,ok:0,fail:0};
  loadPostCache();
  go('signals',true);
  toast('کانال عوض شد به @'+S.channel);
  await refresh(false);
  setTimer();
}

