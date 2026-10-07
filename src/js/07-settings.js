/* ==================== تنظیمات ==================== */
/* هر امکان تازه یک کلید مستقل دارد تا بشود بدون دست زدن به کد خاموشش کرد.
   هر کدام فقط یک شرط است، پس خاموش کردنش دقیقاً به حالت قبل برمی‌گردد. */
const FEAT={
  summary:{on:true, t:'نوار خلاصه', d:'بالای سیگنال‌ها: سیگنال امروز، پوزیشن باز، سود/ضرر و فاصله تا حد ضرر روزانه'},
  accordion:{on:true,t:'کارت‌های آکاردئونی', d:'فقط یک کارت باز می‌ماند؛ زدن روی کارتی دیگر، قبلی را می‌بندد تا صفحه شلوغ نشود'},
  quick:  {on:true, t:'ورود سریع',  d:'دکمه‌ی ورود با مبلغ پیش‌فرض، بدون باز کردن فرم'},
  notify: {on:false,t:'اعلان سیگنال تازه', d:'وقتی سیگنال تازه بیاید، نوتیفیکیشن مرورگر'},
  alerts: {on:true, t:'هشدار استاپ و تارگت', d:'روی پوزیشن‌های باز، نزدیک شدن قیمت به استاپ یا رسیدن به تارگت'},
  autoexec:{on:true,t:'اجرای خودکار استاپ و نقشه', d:'استاپ بخورد، پوزیشن خودش بسته می‌شود؛ تارگت برسد، پله‌ی نقشه‌ی خروج (بستن سهم و جابه‌جایی استاپ) خودش ثبت می‌شود. به صرافی سفارش نمی‌فرستد'},
  tpclose:{on:true, t:'بستن روی تارگت', d:'دکمه‌ی بستن نصف پوزیشن روی تارگت، بدون پر کردن فرم'},
  range:  {on:true, t:'بازه‌ی دلخواه کارنامه', d:'انتخاب تاریخ شروع و پایان در کارنامه'},
  fx:     {on:true, t:'افکت‌های نورانی', d:'هاله‌ها، درخشش و انیمیشن‌های «نور طلایی». روی گوشی ضعیف خاموشش کن تا سبک‌تر شود'}
};
const featDefaults=()=>Object.fromEntries(Object.entries(FEAT).map(([k,v])=>[k,v.on]));
/* تنظیمات ذخیره‌شده فقط کلیدهایی را دارد که آن روز وجود داشتند. امکانی که بعداً اضافه شده
   (مثل «افکت‌های نورانی») نباید برای کاربرِ قدیمی خاموش حساب شود — پیش‌فرض خودش را می‌گیرد. */
const fixFeat=()=>{S.feat=Object.assign(featDefaults(),S.feat||{});fxGuard();};
/* «افکت‌های نورانی» را نسخه‌ی معیوبِ قبلی برای کاربران قدیمی «خاموش» ذخیره کرده بود — روی
   این دستگاه و روی سرور همگام‌سازی. خاموش فقط وقتی پذیرفته می‌شود که خودت کلیدش را روی همین
   دستگاه زده باشی؛ وگرنه آن مقدار، یادگارِ همان باگ است. */
function fxGuard(){
  if(S.feat&&S.feat.fx===false&&!lsGet('signaldesk.fxuser')){S.feat.fx=true;return true;}
  return false;
}
const S={channel:'ccoineres',acct:100,cap:10,risk:5,maxLev:10,daily:10,mode:'margin',rMul:[1.5,3,5],fee:0.1,slip:0.05,fund:0,openRisk:15,feedOn:false,auto:60,proxy:'',feat:featDefaults(),staleDays:7,exitPb:'bal',cal:'j',
  aud:{days:30,entryDays:3,tol:1,rule:'tp1'}};
const F=k=>!!(S.feat&&S.feat[k]);
let BOOTED=false;
function buildFeatList(){
  const box=$('#featList');if(!box)return;
  box.innerHTML='';
  for(const [k,v] of Object.entries(FEAT)){
    const row=el('label','featrow');
    const cb=el('input');cb.type='checkbox';cb.id='feat_'+k;
    // همان لحظه اعمال و ذخیره شود؛ قبلاً تا «بروزرسانی» زده نمی‌شد، تیک فقط ظاهری عوض می‌شد
    cb.onchange=()=>{if(k==='fx')lsSet('signaldesk.fxuser',1);readSettings();renderAll();};
    row.appendChild(cb);
    const t=el('div','feattxt');
    t.appendChild(el('div','featttl',esc(v.t)));
    t.appendChild(el('div','featdesc',esc(v.d)));
    row.appendChild(t);
    box.appendChild(row);
  }
}
function applySettingsToForm(){
  if(!$('#feat_summary'))buildFeatList();
  for(const k of Object.keys(FEAT)){const c=$('#feat_'+k);if(c)c.checked=F(k);}
  $('#sProxy').value=S.proxy||'';
  $('#sChannel').value=S.channel; $('#sAcct').value=fmtMoneyIn(S.acct); $('#sCap').value=fmtMoneyIn(S.cap);
  $('#sAmts').value=amtPresets().join(', ');
  $('#sRisk').value=S.risk; $('#sMaxLev').value=S.maxLev; $('#sDaily').value=S.daily;
  $('#sMode').value=S.mode; $('#sStale').value=S.staleDays||7; $('#sCal').value=calMode(); $('#sPb').value=pbDefault(); $('#sR').value=S.rMul.join(', '); $('#sFee').value=S.fee; $('#sAuto').value=S.auto;
  $('#sSlip').value=S.slip; $('#sFund').value=S.fund; $('#sOpenRisk').value=S.openRisk;
  $('#sRiskUsd').value=S.riskUsd>0?S.riskUsd:''; $('#sIsoSd').value=S.isoMaxSd||15;
}
function readSettings(){
  const prevCh=S.channel, prevAuto=S.auto, prevProxy=S.proxy;
  const px=($('#sProxy').value||'').trim();
  const lines=px.split(/[\n\r،,;]+/).map(x=>x.trim()).filter(Boolean);
  const good=lines.filter(x=>/^https?:\/\//i.test(x));
  S.proxy=good.join('\n');
  if(lines.length&&!good.length)toast('آدرس واسط باید با https:// شروع شود','err');
  else if(good.length<lines.length)toast(faN(lines.length-good.length)+' خط بی‌اعتبار نادیده گرفته شد','info');
  // رایج‌ترین اشتباه: آدرس ورکر را بدون {url} می‌چسبانند و بعد آدرس مقصد ته آن می‌چسبد
  // و ورکر پارامتری برای خواندن ندارد. بی‌صدا رد نمی‌کنیم، می‌گوییم کجا اشکال دارد.
  else if(good.some(x=>!x.includes('{url}')&&!/[?&][a-z]+=$/i.test(x)))
    toast('آدرس واسط احتمالاً ناقص است — آخرش /?url={url} لازم دارد','info');
  S.channel=($('#sChannel').value||'ccoineres').trim().replace(/^@/,'')
    .replace(/^.*t\.me\//,'').replace(/^s\//,'').replace(/[/?#].*$/,'')||'ccoineres';
  S.acct=Math.max(1,moneyVal($('#sAcct'))||100);
  S.cap=Math.max(1,moneyVal($('#sCap'))||10);
  {const a=[...new Set(normDig($('#sAmts').value||'').split(/[^\d.]+/).map(Number).filter(x=>x>0&&x<1e7))].sort((a,b)=>a-b).slice(0,6);
   S.amtChips=a.length?a:null;}
  S.risk=Math.min(100,Math.max(.1,parseFloat($('#sRisk').value)||5));
  S.maxLev=Math.min(125,Math.max(1,parseFloat($('#sMaxLev').value)||10));
  S.daily=Math.min(100,Math.max(1,parseFloat($('#sDaily').value)||10));
  S.mode=$('#sMode').value; S.fee=Math.max(0,parseFloat($('#sFee').value)||0);
  S.slip=Math.min(2,Math.max(0,parseFloat($('#sSlip').value)||0));
  S.fund=Math.min(1,Math.max(-1,parseFloat($('#sFund').value)||0));
  S.openRisk=Math.min(100,Math.max(1,parseFloat($('#sOpenRisk').value)||15));
  {const r=parseFloat(normDig($('#sRiskUsd').value||''));S.riskUsd=r>0?Math.min(1e6,r):null;}
  S.isoMaxSd=Math.min(60,Math.max(1,parseFloat($('#sIsoSd').value)||15));
  S.auto=parseInt($('#sAuto').value)||0;
  S.staleDays=Math.min(60,Math.max(1,parseInt($('#sStale').value,10)||7));
  S.exitPb=$('#sPb').value||'bal';
  S.cal=$('#sCal').value||'j';
  const prevNotify=F('notify');
  fixFeat();
  for(const k of Object.keys(FEAT)){const c=$('#feat_'+k);if(c)S.feat[k]=!!c.checked;}
  // روشن کردن اعلان بدون اجازه‌ی مرورگر بی‌معنی است، پس همان‌جا می‌پرسیم
  if(!prevNotify&&S.feat.notify)askNotify();
  const rs=normDig($('#sR').value||'').split(/[,،\s]+/).map(parseFloat).filter(n=>isFinite(n)&&n>0);
  S.rMul=rs.length?rs.slice(0,5):[1.5,3,5];
  DB.settings=Object.assign({},S); save(); SETVER++;
  $('#bchan').textContent='@'+S.channel;
  // واسط که عوض شود، مسیرهای سوخته را از نو امتحان می‌کنیم و همان لحظه تست می‌کنیم
  const proxyChanged=BOOTED&&prevProxy!==S.proxy;
  if(proxyChanged){
    DEADROUTE.clear();GOOD.tg=null;GOOD.px=null;
    logIt('info','واسط شخصی عوض شد: '+(S.proxy||'حذف شد'));
  }
  if(BOOTED&&prevCh.toLowerCase()!==S.channel.toLowerCase())switchChannel();
  else if(proxyChanged){setTimer();refresh(false);}
  else if(!BOOTED||prevAuto!==S.auto)setTimer();
}

