/* ==================== گزارش رخدادها ==================== */
/* هر تلاش شبکه، با مسیر و نتیجه و زمانش، اینجا ثبت می‌شود و در حافظه مرورگر می‌ماند.
   وقتی چیزی کار نمی‌کند، همین گزارش می‌گوید کدام حلقه قطع است — نه حدس و گمان. */
const LOGKEY='signaldesk.log.v1', LOGMAX=250;
let LOG=[], logDirty=false;
function loadLog(){const a=lsGet(LOGKEY);if(Array.isArray(a))LOG=a.slice(-LOGMAX);}
function flushLog(){if(logDirty){lsSet(LOGKEY,LOG.slice(-LOGMAX));logDirty=false;}}
function logIt(level,msg,extra){
  const e=Object.assign({t:Date.now(),l:level,m:msg},extra||{});
  LOG.push(e);
  if(LOG.length>LOGMAX)LOG=LOG.slice(-LOGMAX);
  logDirty=true;
  if(typeof paintLog==='function')paintLog();
  return e;
}
function clearLog(){LOG=[];logDirty=true;flushLog();if(typeof paintLog==='function')paintLog();}
setInterval(flushLog,4000);
addEventListener('beforeunload',flushLog);
// خطای پنهانِ برنامه هم در گزارش بیاید؛ وگرنه «کار نمی‌کند» هیچ ردی نداشت
addEventListener('error',e=>{if(e&&e.message)logIt('err','خطای برنامه: '+e.message+(e.lineno?' (سطر '+e.lineno+')':''));});
addEventListener('unhandledrejection',e=>{const r=e&&e.reason;
  logIt('err','خطای ناهمگام: '+String(r&&r.message||r).slice(0,160));});

/* متن گزارش برای کپی کردن و فرستادن */
function logText(){
  const L=['# گزارش میز سیگنال',
    'زمان: '+jStampFa(new Date()),
    'کانال: @'+S.channel,
    'آدرس صفحه: '+location.protocol+'//'+(location.host||'(فایل محلی)'),
    'مرورگر: '+navigator.userAgent,
    'آنلاین بودن مرورگر: '+(navigator.onLine?'بله':'نه'),
    'پروکسی شخصی: '+(S.proxy?S.proxy:'تنظیم نشده'),
    // رشته‌ی خام کافی نیست: باید معلوم باشد که تبدیل به مسیر شده و آخرین بار چه شد،
    // وگرنه واسطی که غلط نوشته شده از واسطی که هست ولی جواب نمی‌دهد قابل تشخیص نیست
    'واسط‌های فعال: '+(()=>{
      const c=customRoutes();
      if(!c.length)return S.proxy?'هیچ‌کدام معتبر نبود — آدرس باید با https:// شروع شود':'—';
      return c.map(r=>r.name+' → '+(CUSTOMSEEN[r.id]||'هنوز امتحان نشده')).join(' · ');
    })(),
    'مسیر موفق اخیر — تلگرام: '+(H.tg.route||'—')+' / قیمت: '+(H.px.route||'—'),
    'مسیر یادگرفته‌شده — تلگرام: '+(GOOD.tg||'—')+' / قیمت: '+(GOOD.px||'—'),
    'پست ذخیره‌شده: '+H.cache.n+' · پوزیشن: '+DB.positions.length,
    '','## رخدادها (تازه‌ترین آخر)'];
  for(const e of LOG){
    const bits=[jStampFa(new Date(e.t)).slice(-5),('['+e.l+']').padEnd(7),e.m];
    if(e.route)bits.push('مسیر='+e.route);
    if(e.ms!=null)bits.push(e.ms+'ms');
    if(e.status)bits.push('HTTP '+e.status);
    if(e.why)bits.push('علت='+e.why);
    if(e.url)bits.push(e.url);
    L.push(bits.join(' · '));
  }
  return L.join('\n');
}
async function copyLog(btn){
  const txt=logText();
  try{
    await navigator.clipboard.writeText(txt);
    toast('گزارش کپی شد؛ همین را برایم بفرست','ok');
  }catch(e){
    // در فایل محلی و بعضی مرورگرها دسترسی به کلیپ‌بورد بسته است: متن را نشان می‌دهیم
    const box=document.querySelector('#logDump');
    if(box){
      box.classList.remove('hide');
      box.querySelector('textarea').value=txt;
      box.querySelector('textarea').select();
      toast('کپی خودکار نشد؛ متن را دستی انتخاب و کپی کن','info');
    }else toast('کپی نشد','err');
  }
}
function downloadLog(){
  dl('signal-desk-log-'+jKey(new Date())+'.txt',logText(),'text/plain;charset=utf-8');
  toast('گزارش ذخیره شد','ok');
}

