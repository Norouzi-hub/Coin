/* ==================== ذخیره‌سازی ==================== */
const KEY='signaldesk.v1';
let storeOK=true;
/* کلیدهای داده در یک جا: ذخیره، بارگذاری، همگام‌سازی و پشتیبان همه از همین فهرست می‌خوانند،
   پس کلید تازه فقط اینجا اضافه می‌شود (قبلاً پنج جا تکرار شده بود).
   cats: دسته‌های ساخت کاربر [{id,n}] · pcat: پست ← فهرست شناسه‌ی دسته‌ها
   ledit: متنِ ویرایش‌شده‌ی آموزش‌ها ('g'+شماره برای دستورالعمل، شناسه‌ی پست برای بقیه)
   tomb: «سنگ قبر» چیزهای پاک‌شده {'positions:id'|'<مجموعه>:<کلید>': زمان} — تا همگام‌سازی
         چیزی را که روی یک دستگاه پاک کرده‌ای از دستگاه دیگر زنده نکند */
const DB_OBJ=['decisions','overrides','lessons','archived','results','edits','gone','revived','pcat','ledit','tomb'];
const DB_ARR=['pending','watch','spot','cats'];
const DB={positions:[],settings:{}};
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function fillDB(d){
  for(const k of DB_OBJ)DB[k]=isObj(d[k])?d[k]:{};
  for(const k of DB_ARR)DB[k]=Array.isArray(d[k])?d[k]:[];
}
fillDB({});
function dbBlob(){
  const o={positions:DB.positions,settings:DB.settings};
  for(const k of DB_OBJ.concat(DB_ARR))o[k]=DB[k];
  return o;
}
let KGEN=0;     // هر ذخیره نسل را جلو می‌برد تا حافظه‌ی نوعِ پست‌ها (postKind) تازه شود
/* ---- ردگیری تغییرها برای ادغام همگام‌سازی ----
   هر پوزیشنی که از ذخیره‌ی قبلی عوض شده، زمان تغییر (upd) می‌گیرد؛ هر چیزی که پاک شده سنگ قبر.
   به این ترتیب دو دستگاه که هم‌زمان کار کرده‌اند، رکوردبه‌رکورد ادغام می‌شوند نه کل‌به‌کل. */
let TRACK=null, NOJUDGE=false;
/* ---- تخلف از نقشه ----
   بی‌آنکه هر جای برنامه را که استاپ یا بستن را عوض می‌کند دست بزنیم، همین‌جا تغییر هر پوزیشن
   را با حالت قبلش می‌سنجیم: استاپ دورتر رفت؟ بی‌استاپ وارد شد؟ پیش از رسیدن به پله‌ی بعدیِ نقشه
   دستی بسته شد؟ (ورود با وجود قفل روزانه/سقف ریسک در خود فرم ورود ثبت می‌شود) */
const VIOL_FA={stopaway:'استاپ را دورتر بردی',nostop:'بدون استاپ وارد شدی',early:'زودتر از نقشه بستی',gate:'با وجود قفل روزانه یا سقف ریسک وارد شدی'};
function addViol(p,k,x){p.viol=(p.viol||[]).concat([Object.assign({k,at:Date.now()},x||{})]);}
function judge(p,old){
  const has=k=>(p.viol||[]).some(v=>v.k===k), sign=p.dir==='long'?1:-1;
  if(!old){if(p.status==='open'&&!p.stop&&p.kind!=='spot'&&!has('nostop'))addViol(p,'nostop');return;}
  if(old.status==='open'&&p.status==='open'&&old.stop&&p.stop&&(p.stop-old.stop)*sign<-1e-12)
    addViol(p,'stopaway',{from:old.stop,to:p.stop});
  if(old.status==='open'&&p.status==='closed'&&!p.autoBy&&p.pb&&(p.pbc||0)<p.pb.tps.length&&!has('early')){
    const ex=p.exitPrice, nx=p.pb.tps[p.pbc||0], atStop=p.stop&&ex&&Math.abs(ex-p.stop)/p.stop<0.003;
    if(ex>0&&!atStop&&(nx-ex)*sign>0)addViol(p,'early',{px:ex,next:nx});
  }
}
const itemId=x=>x&&typeof x==='object'&&x.id!=null?String(x.id):JSON.stringify(x);
const posSig=p=>JSON.stringify(p,(k,v)=>k==='upd'?undefined:v);
function collKeys(k){const v=DB[k];return Array.isArray(v)?v.map(itemId):Object.keys(v||{});}
function trackReset(){
  TRACK={pos:new Map(DB.positions.map(p=>[p.id,posSig(p)])),keys:{}};
  for(const k of DB_OBJ.concat(DB_ARR))if(k!=='tomb')TRACK.keys[k]=new Set(collKeys(k));
}
function trackStamp(){
  if(!TRACK){trackReset();return;}
  const now=Date.now(), T=DB.tomb, seen=new Set();
  for(const p of DB.positions){
    if(p.id==null)continue;
    let sg=posSig(p);seen.add(p.id);
    const prev=TRACK.pos.get(p.id);
    if(prev!==sg){
      p.upd=now;delete T['positions:'+p.id];
      if(!NOJUDGE){try{judge(p,prev?JSON.parse(prev):null);sg=posSig(p);}catch(e){}}
    }
    TRACK.pos.set(p.id,sg);
  }
  for(const id of [...TRACK.pos.keys()])if(!seen.has(id)){T['positions:'+id]=now;TRACK.pos.delete(id);}
  for(const k of DB_OBJ.concat(DB_ARR)){
    if(k==='tomb')continue;
    const cur=new Set(collKeys(k)), old=TRACK.keys[k]||new Set();
    for(const x of old)if(!cur.has(x))T[k+':'+x]=now;
    for(const x of cur)if(!old.has(x))delete T[k+':'+x];
    TRACK.keys[k]=cur;
  }
  NOJUDGE=false;
  // سنگ قبرهای خیلی قدیمی لازم نیست؛ هر دستگاهی تا الان همگام شده
  for(const [x,t] of Object.entries(T))if(now-t>120*864e5)delete T[x];
}
/* ادغام داده‌ی این دستگاه (mine) با سرور (srv). lastAt: آخرین همگام‌سازیِ موفقِ این دستگاه.
   پوزیشن: هر طرف که upd تازه‌تری دارد. پاک‌شده: اگر سنگ قبرش از آخرین تغییرِ رکورد تازه‌تر است.
   بقیه‌ی مجموعه‌ها: اجتماع دو طرف، در کلیدِ مشترک این دستگاه؛ تنظیمات: این دستگاه. */
function syncMerge(mine,srv,lastAt){
  mine=mine||{};srv=srv||{};lastAt=lastAt||0;
  const mt=isObj(mine.tomb)?mine.tomb:{}, st=isObj(srv.tomb)?srv.tomb:{};
  const tomb=Object.assign({},st);
  for(const [x,t] of Object.entries(mt))if(!(tomb[x]>=t))tomb[x]=t;
  const out={settings:Object.assign({},isObj(srv.settings)?srv.settings:{},isObj(mine.settings)?mine.settings:{}),tomb};
  const P=new Map();
  for(const p of srv.positions||[])if(p&&p.id!=null)P.set(p.id,p);
  for(const p of mine.positions||[]){if(!p||p.id==null)continue;const o=P.get(p.id);if(!o||(p.upd||0)>=(o.upd||0))P.set(p.id,p);}
  out.positions=[...P.values()].filter(p=>!(tomb['positions:'+p.id]>(p.upd||0)));
  const gone=(k,x,inMine)=>{
    const tk=k+':'+x;
    if(!inMine)return !!mt[tk];                 // اینجا پاک شده و سرور هنوز دارد
    return (st[tk]||0)>lastAt;                  // آنجا بعد از آخرین همگام‌سازیِ ما پاک شده
  };
  for(const k of DB_OBJ){
    if(k==='tomb')continue;
    const a=isObj(srv[k])?srv[k]:{}, b=isObj(mine[k])?mine[k]:{}, o=Object.assign({},a,b);
    for(const x of Object.keys(o))if(tomb[k+':'+x]&&gone(k,x,x in b))delete o[x];
    out[k]=o;
  }
  for(const k of DB_ARR){
    const a=Array.isArray(srv[k])?srv[k]:[], b=Array.isArray(mine[k])?mine[k]:[];
    const m=new Map(), bi=new Set(b.map(itemId));
    for(const x of a)m.set(itemId(x),x);
    for(const x of b)m.set(itemId(x),x);
    out[k]=[...m].filter(([x])=>!(tomb[k+':'+x]&&gone(k,x,bi.has(x)))).map(([,v])=>v);
  }
  return out;
}
function save(){
  KGEN++;
  try{trackStamp();}catch(e){}
  try{ localStorage.setItem(KEY,JSON.stringify(dbBlob())); }
  catch(e){ storeOK=false; showStoreWarn(); }
  if(typeof syncSoon==='function')syncSoon();
  if(typeof feedSoon==='function')feedSoon();
}
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    localStorage.setItem(KEY+'.probe','1'); localStorage.removeItem(KEY+'.probe');
    if(raw){const d=JSON.parse(raw);
      DB.positions=Array.isArray(d.positions)?d.positions:[];
      DB.settings=isObj(d.settings)?d.settings:{};
      fillDB(d);
    }
  }catch(e){ storeOK=false; }
  trackReset();
}
/* ---- ماندگاری داده ---- */
/* سافاری (و گاهی کروم وقتی حافظه‌ی گوشی پر است) داده‌ی سایت‌هایی را که مدتی باز نشده‌اند خودش
   پاک می‌کند. «حافظه‌ی ماندگار» از مرورگر می‌خواهد این کار را نکند؛ اگر نداد، تنها راه پشتیبان است. */
const BKKEY='signaldesk.backupat.v1', BKSNOOZE='signaldesk.bksnooze.v1', BK_DAYS=7;
let PERSIST=null;                 // true | false | null (مرورگر پشتیبانی نمی‌کند)
async function persistStore(){
  try{
    if(!navigator.storage||!navigator.storage.persist)return;
    PERSIST=await navigator.storage.persisted();
    if(!PERSIST)PERSIST=await navigator.storage.persist();
  }catch(e){}
}
const bkMark=()=>{lsSet(BKKEY,Date.now());const w=$('#bkWarn');if(w)w.classList.add('hide');};
function showBackupWarn(){
  const w=$('#bkWarn');if(!w)return;
  w.classList.add('hide');
  if(!storeOK||syncOn()||!DB.positions.length)return;
  const now=Date.now();
  let at=lsGet(BKKEY);
  if(!at){at=now;lsSet(BKKEY,at);}            // از اولین اجرا شمرده می‌شود، نه از همان روز اول
  if(now-at<BK_DAYS*864e5||now<(lsGet(BKSNOOZE)||0))return;
  const days=Math.floor((now-at)/864e5);
  w.innerHTML='<b>'+faN(days)+' روز است پشتیبان نگرفته‌ای.</b> داده‌ها فقط روی همین مرورگرند'+
    (PERSIST===false?' و مرورگر ماندگاری‌شان را تضمین نکرده':'')+
    '؛ اگر پاک شوند، سوابق معامله‌ها برنمی‌گردد. همگام‌سازی با ورکر هم این نگرانی را برمی‌دارد.<div class="srow"></div>';
  const row=w.querySelector('.srow');
  const b1=el('button','btn sm pri','پشتیبان بگیر');b1.onclick=()=>$('#btnExport').click();
  const b2=el('button','btn sm','بعداً');b2.onclick=()=>{lsSet(BKSNOOZE,now+3*864e5);w.classList.add('hide');};
  row.appendChild(b1);row.appendChild(b2);
  w.classList.remove('hide');
}
function showStoreWarn(){
  if(storeOK)return;
  const w=$('#storeWarn'); w.classList.remove('hide');
  w.innerHTML='حافظه این مرورگر در دسترس نیست، پس پوزیشن‌ها، تاریخچه و پست‌های ذخیره‌شده بعد از بستن صفحه پاک می‌شوند. '+
    'اگر این فایل را داخل پیش‌نمایش یک برنامه باز کرده‌ای، دانلودش کن و مستقیم در مرورگر خودت باز کن. '+
    'تا آن موقع از «پشتیبان JSON» در تنظیمات استفاده کن.';
}
let toastT=null;
function toast(m,kind){
  const t=$('#toast'), k=kind||'info';
  t.className='toast '+k;
  t.innerHTML='<span class="ti">'+ic(k==='ok'?'check':k==='err'?'alert':'info')+'</span><span>'+m+'</span>';
  requestAnimationFrame(()=>t.classList.add('on'));
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),k==='err'?4000:2400);
}
/* به‌جای پنجره‌ی «مطمئنی؟»: کار همان لحظه انجام می‌شود و چند ثانیه دکمه‌ی «برگرداندن» هست.
   برگرداندن از یک عکسِ کامل از داده‌ها پیش از کار است، پس هر کاری با هر پیچیدگی دقیق برمی‌گردد. */
function toastUndo(m,undo){
  const t=$('#toast');
  t.className='toast ok undo';
  t.innerHTML='<span class="ti">'+ic('check')+'</span><span>'+m+'</span>';
  const b=el('button','tundo','برگرداندن');
  b.onclick=()=>{clearTimeout(toastT);t.classList.remove('on');undo();};
  t.appendChild(b);
  requestAnimationFrame(()=>t.classList.add('on'));
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),6500);
}
function undoable(msg,act){
  const snap=JSON.stringify(dbBlob());
  act();
  save();renderAll();
  toastUndo(msg,()=>{
    restoreSnap(snap);
    save();renderAll();toast('برگشت','info');
  });
}

