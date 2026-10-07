/* ==================== ذخیره پست‌ها و قیمت‌ها ==================== */
/* پست‌های خوانده‌شده و آخرین قیمت‌ها در همین مرورگر می‌مانند تا باز کردن صفحه فوری باشد
   و هر بروزرسانی فقط چیزهای تازه‌تر از آخرین پست ذخیره‌شده را از تلگرام بگیرد */
const CKEY=ch=>'signaldesk.cache.v2:'+String(ch||'').toLowerCase();
const PXKEY='signaldesk.px.v1', PRKEY='signaldesk.proxy', CACHE_MAX=800;
function lsGet(k){try{const r=localStorage.getItem(k);return r?JSON.parse(r):null;}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}

const H={
  tg:{state:'idle',route:null,ms:null,at:null,err:null,ok:0,fail:0},
  px:{state:'idle',src:null,route:null,ms:null,at:null,n:0,err:null},
  cache:{n:0,kb:0,at:null,fromCache:false}
};
let REACHED_END=false;

/* شماره‌ی پست همیشه آخرین جزء data-post است: «کانال/204» یا «c/1893051/204» */
const postNum=id=>parseInt(String(id||'').split('/').pop()||'0',10)||0;
function loadPostCache(){
  const c=lsGet(CKEY(S.channel));
  POSTS=[];REACHED_END=false;H.cache={n:0,kb:0,at:null,fromCache:false};
  if(!c||!Array.isArray(c.posts))return false;
  // کش‌هایی که نسخه‌ی قبلی ساخته، شماره‌ی غلط دارند (شناسه‌ی کانال به‌جای شماره‌ی پست)
  // و آن پست‌ها بالای همه می‌نشستند؛ پس شماره را همیشه از روی شناسه دوباره حساب می‌کنیم.
  POSTS=c.posts.map(p=>Object.assign({},p,{date:p.date?new Date(p.date):null,num:postNum(p.id)||p.num||0}));
  // پستی که پیش از این اصلاح از کانال دیگری وارد کش شده بود، همین‌جا بیرون می‌رود
  const bad=POSTS.filter(p=>!ownPost(p.id));
  if(bad.length){
    POSTS=POSTS.filter(p=>ownPost(p.id));
    logIt('warn',faN(bad.length)+' پستِ کانال دیگر در حافظه بود و پاک شد: '+
      bad.slice(0,6).map(p=>p.id).join('، '));
    setTimeout(()=>savePostCache(),0);
  }
  POSTS.sort(byNewest);
  REACHED_END=!!c.end;
  H.cache={n:POSTS.length,kb:cacheKB(),at:c.at||null,fromCache:POSTS.length>0};
  return POSTS.length>0;
}
function cacheKB(){try{return Math.round(((localStorage.getItem(CKEY(S.channel))||'').length*2)/1024);}catch(e){return 0;}}
function savePostCache(){
  let posts=POSTS.slice(0,CACHE_MAX).map(p=>({id:p.id,num:p.num,text:p.text,origText:p.origText||undefined,img:p.img,reply:p.reply,
    date:p.date?p.date.getTime():null,link:p.link}));
  const pack=()=>({v:2,at:Date.now(),end:REACHED_END&&posts.length===POSTS.length,posts});
  let ok=lsSet(CKEY(S.channel),pack());
  while(!ok&&posts.length>40){posts=posts.slice(0,Math.floor(posts.length*0.7));ok=lsSet(CKEY(S.channel),pack());}
  H.cache.n=ok?posts.length:0; H.cache.at=Date.now(); H.cache.kb=cacheKB();
}
function clearPostCache(){try{localStorage.removeItem(CKEY(S.channel));}catch(e){}}
/* حافظه‌های جانبی به پست گره خورده‌اند ولی خودشان با بیرون رفتن پست از پنجره‌ی
   800تایی پاک نمی‌شدند. روی کانالی که روزی 20 پست دارد، بعد از چند ماه هزاران
   کلیدِ مرده می‌ماند — و archived/results چون همگام‌سازی می‌شوند، هر بار روی
   شبکه هم می‌روند. اینجا به پنجره‌ی زنده برشان می‌گردانیم. */
const FLAGMAX=1500;                 // سقف پرچم‌های ماندگار (آرشیو/نتایج)
function trimFlags(obj,live){
  let changed=false;
  if(Object.keys(obj).length<=FLAGMAX)return false;   // کوچک است، دست نمی‌زنیم
  // نقضِ «نتیجه نیست» (مقدار صفر) فقط تا وقتی پست دیده می‌شود معنی دارد
  for(const k of Object.keys(obj))if(obj[k]===0&&!live.has(k)){delete obj[k];changed=true;}
  const rest=Object.keys(obj);
  if(rest.length>FLAGMAX){
    // تازه‌ترها می‌مانند؛ پستی که 1500 نشانه پیش کنار گذاشته‌ای برنمی‌گردد
    rest.sort((a,b)=>(obj[b]||0)-(obj[a]||0));
    for(const k of rest.slice(FLAGMAX))delete obj[k];
    changed=true;
  }
  return changed;
}
function pruneCaches(){
  const live=new Set(POSTS.map(p=>p.id));
  for(const k of PCACHE.keys())if(!live.has(k))PCACHE.delete(k);
  for(const k of RCACHE.keys())if(!live.has(k))RCACHE.delete(k);
  for(const k of [...NEWIDS])if(!live.has(k))NEWIDS.delete(k);
  for(const k of [...REPLYOPEN])if(!live.has(k))REPLYOPEN.delete(k);
  let aud=false;
  for(const k of Object.keys(AUD))if(!live.has(k)){delete AUD[k];aud=true;}
  if(aud)audSave();
  let dirty=false;
  for(const o of [DB.edits,DB.gone]){
    const ks=Object.keys(o);
    if(ks.length>300){ks.sort((a,b)=>(o[b].at||0)-(o[a].at||0));for(const k of ks.slice(300))delete o[k];dirty=true;}
  }
  if(trimFlags(DB.archived,live))dirty=true;
  if(trimFlags(DB.results,live))dirty=true;
  if(dirty)save();
}

function loadPxCache(){
  const c=lsGet(PXKEY);
  if(!c||!Array.isArray(c.m)||!c.m.length)return;
  PRICES=new Map(c.m);SYMBOLS=new Set(PRICES.keys());priceSrc=c.src||'—';PX_AT=c.at||null;SYMVER++;
  Object.assign(H.px,{state:'stale',src:c.src,at:c.at,n:PRICES.size});
}
function savePxCache(){lsSet(PXKEY,{at:PX_AT,src:priceSrc,m:[...PRICES]});}

/* انبار بزرگ (IndexedDB) برای تاریخچه‌ی کندل و جریان پولِ رادار: localStorage برای چند مگابایت
   کندل جا ندارد. اگر مرورگر IndexedDB نداد (حالت خصوصی)، فقط در حافظه‌ی همین بار می‌ماند. */
const IDBM=new Map();let IDBP=null;
function idbOpen(){
  if(IDBP)return IDBP;
  IDBP=new Promise(res=>{try{const r=indexedDB.open('signaldesk',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('kv');
    r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);r.onblocked=()=>res(null);}catch(e){res(null);}});
  return IDBP;
}
async function idbGet(k){
  if(IDBM.has(k))return IDBM.get(k);
  const db=await idbOpen();if(!db)return null;
  return new Promise(res=>{try{const q=db.transaction('kv').objectStore('kv').get(k);
    q.onsuccess=()=>{const v=q.result==null?null:q.result;if(v!=null&&IDBM.size<12)IDBM.set(k,v);res(v);};q.onerror=()=>res(null);}catch(e){res(null);}});
}
async function idbSet(k,v){
  IDBM.delete(k);
  const db=await idbOpen();if(!db){IDBM.set(k,v);return false;}
  return new Promise(res=>{try{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);
    tx.oncomplete=()=>res(true);tx.onerror=()=>{IDBM.set(k,v);res(false);};}catch(e){IDBM.set(k,v);res(false);}});
}
