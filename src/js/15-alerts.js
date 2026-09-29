/* ==================== اعلان و هشدار ==================== */
/* بدون سرور Push، نوتیفیکیشن فقط وقتی می‌آید که صفحه باز باشد — حتی اگر در پس‌زمینه.
   اگر تب را ببندی هیچ اعلانی نمی‌آید؛ این محدودیت مرورگر است نه کد. */
function canNotify(){return typeof Notification!=='undefined'&&Notification.permission==='granted';}
async function askNotify(){
  if(typeof Notification==='undefined'){toast('این مرورگر اعلان ندارد','err');S.feat.notify=false;return;}
  if(Notification.permission==='granted')return;
  if(Notification.permission==='denied'){
    toast('اعلان را قبلاً رد کرده‌ای؛ از تنظیمات سایت در مرورگر اجازه بده','err');
    S.feat.notify=false;return;
  }
  const r=await Notification.requestPermission();
  if(r!=='granted'){S.feat.notify=false;toast('اجازه داده نشد','info');applySettingsToForm();}
}
function notify(title,body,tag){
  if(!canNotify())return false;
  try{new Notification(title,{body,tag,icon:'icons/icon-192.png',badge:'icons/favicon-32.png'});return true;}
  catch(e){return false;}
}
/* هر هشدار فقط یک بار — حالا روی دستگاه می‌ماند، پس با هر بار باز کردن برنامه تکرار نمی‌شود.
   کلیدِ استاپ شامل عدد استاپ است: اگر استاپ را جابجا کنی، هشدار تازه دوباره فعال می‌شود. */
const ALKEY='signaldesk.alerted.v1';
const ALERTED=new Set(lsGet(ALKEY)||[]);
const alSave=()=>{const live=new Set(DB.positions.filter(p=>p.status==='open').map(p=>p.id));
  lsSet(ALKEY,[...ALERTED].filter(k=>live.has(k.split(':')[0])).slice(-300));};
/* وضعیت هشدارِ هر پوزیشن برای برچسب روی کارت: near | stop | tpN (رسیده) | ntpN (نزدیک) */
function alertState(p,px){
  if(px==null||p.status!=='open')return null;
  const sign=p.dir==='long'?1:-1;
  if(p.stop){
    if((sign>0&&px<=p.stop)||(sign<0&&px>=p.stop))return {k:'stop',t:'به استاپ رسید',c:'lose'};
    if(Math.abs(px-p.stop)/Math.abs(p.entry-p.stop)<0.25)return {k:'near',t:'نزدیک استاپ',c:'lose'};
  }
  const tg=(p.targets||[]).filter(t=>isFinite(t)&&(t-p.entry)*sign>0).sort((x,y)=>(x-y)*sign);
  let hit=-1;tg.forEach((t,i)=>{if((px-t)*sign>=0)hit=i;});
  const nx=tg[hit+1];
  if(nx!=null){const from=hit>=0?tg[hit]:p.entry, left=(nx-px)*sign/Math.abs(nx-from);
    if(left>0&&left<0.15)return {k:'ntp'+(hit+1),t:'نزدیک تارگت '+faN(hit+2),c:'win'};}
  if(hit>=0)return {k:'tp'+hit,t:'تارگت '+faN(hit+1)+' رسید',c:'win'};
  return null;
}
function fireAlert(key,msg,kind){
  if(ALERTED.has(key))return;
  ALERTED.add(key);alSave();
  toast(msg,kind);
  try{if(navigator.vibrate)navigator.vibrate(kind==='err'?[200,80,200]:120);}catch(e){}
  if(F('notify'))notify('میز سیگنال',msg,key);
}
function checkAlerts(){
  if(!F('alerts'))return;
  for(const p of DB.positions){
    if(p.status!=='open')continue;
    const px=pxOf(p);
    if(px==null)continue;
    const sign=p.dir==='long'?1:-1;
    if(p.stop){
      const hit=(p.dir==='long'&&px<=p.stop)||(p.dir==='short'&&px>=p.stop);
      const near=Math.abs(px-p.stop)/Math.abs(p.entry-p.stop)<0.25;
      if(hit||near)fireAlert(p.id+(hit?':stop:':':near:')+p.stop,
        hit?p.ticker+' به حد ضرر رسید ('+fmtPrice(px)+')':p.ticker+' نزدیک حد ضرر است ('+fmtPrice(px)+')',hit?'err':'info');
    }
    // نزدیک شدن به تارگت بعدی (کمتر از 15٪ راه مانده): وقت فکر کردن به سیو سود
    const as=alertState(p,px);
    if(as&&as.k.startsWith('ntp'))fireAlert(p.id+':'+as.k,p.ticker+' '+as.t+' است ('+fmtPrice(px)+')','info');
    if(p.pb){
      const i=p.pbc||0;
      if(i<p.pb.tps.length&&pbReached(p,i,px)){
        fireAlert(p.id+':pb'+i,p.ticker+' به تارگت '+faN(i+1)+' رسید — طبق نقشه: '+pbStepText(p,i),'ok');
      }
      continue;
    }
    const tg=(p.targets||[]).filter(t=>isFinite(t));
    for(let i=0;i<tg.length;i++){
      const reached=sign>0?px>=tg[i]:px<=tg[i];
      const key=p.id+':tp'+i;
      if(reached)fireAlert(key,p.ticker+' به تارگت '+faN(i+1)+' رسید ('+fmtPrice(tg[i])+')','ok');
    }
  }
}

