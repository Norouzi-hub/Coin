/* ==================== شروع ==================== */
load();
loadLog();
// اصلاح‌های دستی (نماد، «این سیگنال است»، ورود/استاپ) از ذخیره‌گاه برمی‌گردند
OVERRIDE=DB.overrides||{};
if(DB.settings&&Object.keys(DB.settings).length)Object.assign(S,DB.settings);
if(DB.settings&&DB.settings.feat&&DB.settings.feat.fx===false&&!lsGet('signaldesk.fxuser')){
  fixFeat();DB.settings=Object.assign({},S);save();      // خاموشیِ باگ‌خورده را روی سرور هم درست کن
}else fixFeat();
DB.positions.forEach(ensureBase);
if(repairBase())save();
if(migrateSpot())save();          // خریدهای اسپاتِ قدیمی به پوزیشن‌ها منتقل می‌شوند
wire();
applySettingsToForm();
readSettings();
showStoreWarn();
loadPxCache();
loadPostCache();
pruneCaches();          // کلیدهای مرده‌ی نشست‌های قبلی همین‌جا برداشته می‌شوند
BOOTED=true;
wireSync();
wireFeed();
// اول از سرور می‌گیریم تا این دستگاه با آخرین وضعیت شروع کند، نه با نسخه‌ی کهنه‌ی خودش
if(syncOn())syncPull(true).catch(()=>{});
// برگشت به برنامه بعد از بیش از ۳۰ ثانیه: آخرین وضعیت از همگام‌سازی
let lastHidden=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){lastHidden=Date.now();return;}
  if(syncOn()&&lastHidden&&Date.now()-lastHidden>30000)syncPull(true).catch(()=>{});
});
try{localStorage.removeItem('signaldesk.lock.v1');}catch(e){}   // قفل ورود برداشته شد
showOriginWarn();
renderAll();
persistStore().finally(()=>setTimeout(showBackupWarn,1500));
wireSW();
{const bt=document.getElementById('boot');
 if(bt){bt.classList.add('gone');setTimeout(()=>bt.remove(),400);}}
moveInd(false);
setTimeout(()=>moveInd(false),80);
refresh(false);
