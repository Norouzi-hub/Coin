/* ==================== همگام‌سازی بین دستگاه‌ها ==================== */
/* داده روی ورکر خودت نگه داشته می‌شود، نه جای دیگر. هر نوشتن یک شماره‌ی نسخه جلو می‌برد؛
   اگر دستگاه دیگری وسط کار نوشته باشد سرور 409 می‌دهد. آن وقت دو طرف رکوردبه‌رکورد ادغام
   می‌شوند (syncMerge) و دوباره فرستاده می‌شود؛ فقط اگر ادغام هم نشد، از کاربر می‌پرسیم. */
const SYNCKEY='signaldesk.sync.v1';
let syncCfg=lsGet(SYNCKEY)||{url:'',token:'',rev:0,at:0};
let syncTimer=null, syncing=false;
const syncOn=()=>!!(syncCfg.url&&syncCfg.token);
function applyBlob(d){
  DB.positions=Array.isArray(d.positions)?d.positions.map(ensureBase):[];
  fillDB(d);repairBase();
  guidePurgeOld();   // دستگاه دیگری که هنوز آموزش‌های قدیمی را دارد، برشان نگرداند
  if(d.settings&&typeof d.settings==='object'){DB.settings=d.settings;Object.assign(S,d.settings);fixFeat();}
  OVERRIDE=DB.overrides;PCACHE.clear();
  trackReset();
  save();applySettingsToForm();renderAll();
  migrateSpot();
}
const blobCount=d=>d?(faN((d.positions||[]).length)+' پوزیشن · '+
  faN(Object.keys(d.lessons||{}).length)+' آموزش · '+
  faN(Object.keys(d.decisions||{}).length)+' تصمیم'):'خالی';
function syncSave(){lsSet(SYNCKEY,syncCfg);}
function syncNote(msg,kind){
  const n=$('#syncNote');if(!n)return;
  n.innerHTML=msg;
  n.className='hint'+(kind?' sync-'+kind:'');
}
async function syncReq(method,body){
  const base=String(syncCfg.url||'').replace(/\/+$/,'');
  const r=await fetch(base+'/db',{method,cache:'no-store',
    headers:Object.assign({'Authorization':'Bearer '+syncCfg.token},
      body?{'Content-Type':'application/json'}:{}),
    body:body?JSON.stringify(body):undefined});
  let j=null;try{j=await r.json();}catch(e){}
  return {ok:r.ok,status:r.status,j};
}
async function syncPull(silent){
  if(!syncOn())return false;
  const res=await syncReq('GET');
  if(!res.ok){
    syncNote('دریافت نشد: '+((res.j&&res.j.message)||('HTTP '+res.status)),'bad');
    return false;
  }
  const {rev,at,data}=res.j||{};
  if(!data){syncNote('سرور هنوز داده‌ای ندارد. «ارسال الان» را بزن.','');syncCfg.rev=rev||0;syncSave();return false;}
  /* شروع برنامه (silent): ادغام، تا کاری که روی این دستگاه بی‌اینترنت کرده‌ای گم نشود.
     دکمه‌ی «دریافت از سرور»: همان داده‌ی سرور، چون خودت خواسته‌ای. */
  const merged=silent?syncMerge(dbBlob(),data,syncCfg.at):data;
  const diff=silent&&JSON.stringify(merged.positions)!==JSON.stringify(data.positions||[]);
  applyBlob(merged);
  syncCfg.rev=rev||0;syncCfg.at=at||0;syncSave();
  if(diff)syncSoon();
  if(!silent)syncNote('دریافت شد · '+blobCount(data),'good');
  return true;
}
async function syncPush(silent){
  if(!syncOn())return false;
  if(syncing)return false;
  syncing=true;
  try{
    let res=await syncReq('PUT',{rev:syncCfg.rev,data:dbBlob()});
    /* دستگاه دیگری وسط کار نوشته: رکوردبه‌رکورد ادغام و دوباره ارسال. پنجره‌ی انتخاب فقط
       وقتی می‌آید که ادغام هم نشد (مثلاً سرور داده‌اش را نفرستاد یا باز هم هم‌زمان نوشته شد) */
    for(let tries=0;res.status===409&&tries<2;tries++){
      const server=(res.j&&res.j.server)||null;
      if(!server||!server.data)break;
      applyBlob(syncMerge(dbBlob(),server.data,syncCfg.at));
      syncCfg.rev=server.rev||0;
      res=await syncReq('PUT',{rev:syncCfg.rev,data:dbBlob()});
      if(res.ok)logIt('info','همگام‌سازی: داده‌ی دستگاه دیگر ادغام شد');
    }
    if(res.status===409){
      const server=(res.j&&res.j.server)||null;
      syncing=false;
      sheetSyncConflict(server);
      return false;
    }
    if(!res.ok){
      syncNote('ارسال نشد: '+((res.j&&res.j.message)||('HTTP '+res.status)),'bad');
      return false;
    }
    syncCfg.rev=res.j.rev;syncCfg.at=res.j.at;syncSave();bkMark();
    if(!silent)syncNote('ارسال شد · نسخه '+faN(syncCfg.rev),'good');
    return true;
  }finally{syncing=false;}
}
/* بعد از هر تغییر، با کمی تأخیر می‌فرستد تا ده تا ویرایش پشت سر هم ده تا درخواست نشود */
function syncSoon(){
  if(!syncOn())return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>syncPush(true),2500);
}
function sheetSyncConflict(server){
  const mine=dbBlob();
  openSheet(
   '<h3>داده‌ها یکی نیستند</h3>'+
   '<div class="sub">از وقتی این دستگاه آخرین بار همگام شده، دستگاه دیگری هم چیزی نوشته. '+
   'خودت انتخاب کن کدام بماند — چیزی بی‌صدا بازنویسی نمی‌شود.</div>'+
   '<div class="cmp"><div class="cmpbox"><b>این دستگاه</b><span>'+blobCount(mine)+'</span></div>'+
   '<div class="cmpbox"><b>سرور</b><span>'+blobCount(server&&server.data)+'</span></div></div>'+
   '<div class="hint">اگر مطمئن نیستی، اول «پشتیبان JSON» بگیر بعد انتخاب کن.</div>'+
   '<div class="srow"><button class="btn pri" id="takeSrv">داده‌ی سرور را بگیر</button>'+
   '<button class="btn" id="takeMine">مال این دستگاه بماند</button></div>'+
   '<div class="srow"><button class="btn" id="cx">فعلاً هیچ‌کدام</button></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#takeSrv').onclick=()=>{
       if(server&&server.data)applyBlob(server.data);
       syncCfg.rev=(server&&server.rev)||0;syncSave();
       closeSheet();syncNote('داده‌ی سرور گرفته شد','good');toast('از سرور گرفته شد','ok');
     };
     $('#takeMine').onclick=async()=>{
       syncCfg.rev=(server&&server.rev)||0;syncSave();
       closeSheet();
       const ok=await syncPush();
       toast(ok?'داده‌ی این دستگاه روی سرور رفت':'ارسال نشد',ok?'ok':'err');
     };
   });
}
function wireSync(){
  const paint=()=>{
    $('#sSyncUrl').value=syncCfg.url||'';
    $('#sSyncTok').value=syncCfg.token||'';
    $('#syncState').textContent=syncOn()
      ?('روشن · نسخه '+faN(syncCfg.rev||0)+(syncCfg.at?' · '+ageTxt(syncCfg.at):''))
      :'خاموش';
  };
  const readFields=()=>{
    syncCfg.url=($('#sSyncUrl').value||'').trim().replace(/\/+$/,'');
    syncCfg.token=($('#sSyncTok').value||'').trim();
    syncSave();paint();
  };
  $('#sSyncUrl').onchange=readFields;
  $('#sSyncTok').onchange=readFields;
  $('#btnSyncPull').onclick=async e=>{
    readFields();if(!syncOn())return toast('آدرس و رمز را بنویس','err');
    btnBusy(e.currentTarget,true);await syncPull();btnBusy(e.currentTarget,false);paint();
  };
  $('#btnSyncPush').onclick=async e=>{
    readFields();if(!syncOn())return toast('آدرس و رمز را بنویس','err');
    btnBusy(e.currentTarget,true);await syncPush();btnBusy(e.currentTarget,false);paint();
  };
  /* ---- هشدار تلگرام از ورکر ---- */
  const tgPaint=(t,kind)=>{const e=$('#tgState');if(!e)return;e.textContent=t;e.dataset.k=kind||'';};
  const tgReq=async(action,btn)=>{
    readFields();if(!syncOn()){toast('اول همگام‌سازی را روشن کن','err');return null;}
    if(btn)btnBusy(btn,true);
    try{
      const r=await fetch(String(syncCfg.url).replace(/\/+$/,'')+'/tg/'+action,
        {method:'POST',cache:'no-store',headers:{'Authorization':'Bearer '+syncCfg.token}});
      let j=null;try{j=await r.json();}catch(e){}
      if(r.status===404&&(!j||j.error!=='no-chat'))throw new Error('ورکر قدیمی است؛ کد تازه‌ی proxy/worker.js را Deploy کن');
      if(!r.ok)throw new Error((j&&j.message)||('HTTP '+r.status));
      return j||{};
    }catch(e){toast(e.message||'به ورکر نرسید','err');tgPaint('وصل نیست');return null;}
    finally{if(btn)btnBusy(btn,false);}
  };
  const tgStatus=async()=>{
    if(!syncOn()){tgPaint('اول همگام‌سازی');return;}
    const j=await tgReq('status');
    if(j)tgPaint(j.linked?'وصل'+(j.name?' · '+j.name:''):'وصل نیست',j.linked?'ok':'');
  };
  $('#btnTgLink').onclick=async e=>{const j=await tgReq('link',e.currentTarget);
    if(j&&j.linked){tgPaint('وصل'+(j.name?' · '+j.name:''),'ok');toast('تلگرام وصل شد؛ پیامش را ببین','ok');}};
  $('#btnTgTest').onclick=async e=>{const j=await tgReq('test',e.currentTarget);if(j&&j.ok)toast('پیام آزمایشی رفت','ok');};
  $('#btnTgOff').onclick=async e=>{const j=await tgReq('unlink',e.currentTarget);if(j){tgPaint('وصل نیست');toast('هشدار تلگرام قطع شد','info');}};
  const tgSec=$('#tgBox')&&$('#tgBox').closest('details');
  if(tgSec)tgSec.addEventListener('toggle',()=>{if(tgSec.open)tgStatus();});
  $('#btnSyncOff').onclick=()=>{
    syncCfg={url:'',token:'',rev:0,at:0};syncSave();paint();
    syncNote('همگام‌سازی خاموش شد. داده‌ی روی این دستگاه دست‌نخورده است.','');
  };
  paint();
}

