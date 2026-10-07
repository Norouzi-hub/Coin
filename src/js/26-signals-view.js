/* ==================== نمای سیگنال‌ها ==================== */
let OVERRIDE={},COLLAPSED={},sigFilter='new',query='',beforeId=null,busy=false,coinFilter=null;
/* با 800 پست در کش، ساختن همه‌ی کارت‌ها در هر رندر روی گوشی کند می‌شود.
   فقط یک پنجره می‌سازیم و با دکمه بزرگش می‌کنیم. هر تغییر فیلتر پنجره را صفر می‌کند. */
const PAGE=30; let shownMax=PAGE;
/* آرشیو و نتایج فقط یک پرچم روی پست‌اند: از فهرست فعال بیرون می‌روند ولی چیزی پاک
   نمی‌شود، و از سطل خودشان همیشه قابل برگرداندن‌اند.
   bucket جای کدام‌شان را نشان می‌دهد: live | arch | res */
let bucket='live';
/* فیلترهای صفحه‌ی پست‌ها روی همین دستگاه می‌مانند؛ هر بار همان‌جایی برمی‌گردی که بودی.
   kind: نوع پست در «همه» · cat: دسته‌ی ساخت خودت · day: all|today|yest|week|range */
const VIEWKEY='signaldesk.view.v1';
const VIEW=Object.assign({kind:'all',day:'all',from:'',to:''},lsGet(VIEWKEY)||{});
delete VIEW.cat;                  // دسته‌های دلخواه برداشته شد
if(['new','all'].includes(VIEW.sf))sigFilter=VIEW.sf;
else if(VIEW.sf==='sig'){sigFilter='all';VIEW.kind='sig';}   // بخش «سیگنال‌ها» = «همه» › سیگنال
if(['live','res','arch','exp'].includes(VIEW.bk))bucket=VIEW.bk;
function setView(o){
  Object.assign(VIEW,o);VIEW.sf=sigFilter;VIEW.bk=bucket;
  lsSet(VIEWKEY,VIEW);shownMax=PAGE;renderSignals();
}
/* فیلتر روز. شماره‌ی روزِ هر پست یک بار حساب می‌شود (Intl روی 800 پست کُند است). */
const DNMEMO=new WeakMap();
const postDay=p=>{let v=DNMEMO.get(p);if(v==null){v=dayNo(p.date);DNMEMO.set(p,v);}return v;};
const ymdNo=v=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(v||'');return m?Math.floor(Date.UTC(+m[1],m[2]-1,+m[3])/864e5):null;};
// برچسب‌ها کوتاه‌اند چون انتخاب‌گر یک‌چهارمِ ردیف است؛ «تاریخ» یعنی بدون فیلتر روز
const DAY_FA={all:'تاریخ',today:'امروز',yest:'دیروز',week:'7 روز',range:'بازه'};
function dayPass(){
  const d=VIEW.day;
  if(!DAY_FA[d]||d==='all')return null;
  const t=dayNo(new Date());
  let a,b;
  if(d==='today')a=b=t;else if(d==='yest')a=b=t-1;else if(d==='week'){a=t-6;b=t;}
  else{a=ymdNo(VIEW.from);b=ymdNo(VIEW.to);if(a!=null&&b!=null&&a>b)[a,b]=[b,a];}
  return p=>{if(!p.date)return false;const n=postDay(p);return (a==null||n>=a)&&(b==null||n<=b);};
}
const isArch=id=>!!DB.archived[id];
function setArch(id,on){
  if(on)DB.archived[id]=Date.now(); else delete DB.archived[id];
  save();renderAll();
}
/* پست نتیجه: کانال بعد از هر سیگنال می‌گوید تارگت خورد یا استاپ. اینها نه سیگنال‌اند
   نه آشغال — کارنامه‌اند، پس جای خودشان را دارند. تشخیص خودکار است و با یک ضربه
   قابل نقض؛ صفر یعنی «تو گفتی نتیجه نیست» و روی تشخیص خودکار می‌چربد. */
/* کانال‌ها معمولاً نام ارز را وسط می‌گذارند («تارگت اول #BTC زده شد»)؛ تا نسخه‌ی 1 این
   شکل اصلاً شناخته نمی‌شد. فاصله‌ی تا 30 نویسه‌ی بی‌عدد مجاز است — بی‌عدد تا خطِ
   «تارگت 62000» در خودِ سیگنال با فعلی که جلوتر آمده اشتباه گرفته نشود. */
const RX_RESULT=new RegExp(
  'تارگت\\s*(?:اول|دوم|سوم|چهارم|پنجم|\\d)?[^\\n\\d]{0,30}?(?:زده\\s*شد|زد|خورد|فعال\\s*شد|رسید|داد)'+
  '|به\\s*تارگت[^\\n\\d]{0,25}?رسید'+
  '|سیو\\s*سود|سود\\s*(?:گرفته|زده|شناسایی)'+
  '|(?:استاپ|حد\\s*ضرر)[^\\n\\d]{0,25}?(?:خورد|فعال\\s*شد|زده\\s*شد)'+
  '|ریسک\\s*فری|بریک\\s*ایون|سر\\s*به\\s*سر'+
  '|(?:پوزیشن|معامله|سیگنال)\\s*(?:را\\s*)?(?:بستیم|بسته\\s*شد)'+
  '|نتیجه\\s*(?:ی|\\u200c)?\\s*(?:سیگنال|معامله)'+
  '|\\bTP\\s*\\d?\\s*(?:hit|done|reached)\\b|\\bSL\\s*hit\\b|\\btarget\\s*(?:hit|reached)\\b','i');
const RCACHE=new Map();
function autoRes(p){
  const c=RCACHE.get(p.id);
  if(c!==undefined)return c;
  const t=faNorm(normDig(p.text||''));
  let v=RX_RESULT.test(t);
  /* محافظ: سیگنالِ کاملی که داخلش دستور مدیریتی دارد («اگر تارگت اول را زد، استاپ را
     به ورود بیاور») نتیجه نیست. اشتباه در این جهت سیگنال را از فهرست فعال غیب می‌کرد،
     که بدتر از نشناختنِ یک پست نتیجه است. */
  if(v){const g=parseSignal(p.text,p.id);
    if(g.isSignal&&g.entry!=null&&g.stop!=null&&!p.reply)v=false;}
  RCACHE.set(p.id,v);
  return v;
}
function isRes(p){
  const v=DB.results[p.id];
  if(v===0)return false;                    // کاربر صریح گفته نتیجه نیست
  if(v)return true;                         // کاربر صریح گفته نتیجه است
  return autoRes(p);
}
const resAuto=p=>DB.results[p.id]==null&&autoRes(p);
function setRes(p,on){
  if(on===null)delete DB.results[p.id];
  else if(on){DB.results[p.id]=Date.now();delete DB.archived[p.id];}
  else DB.results[p.id]=0;
  save();renderAll();
}
/* در کدام سطل است؟ آرشیو بر نتیجه می‌چربد تا یک پست هم‌زمان دو جا نباشد. */
/* آموزش هم حالا یک سطل است، نه یک تب: پستی که نگهش داشته‌ای از فهرست فعال بیرون
   می‌رود، مثل آرشیو. انتخابِ صریح تو (آرشیو، آموزش) بر تشخیص خودکار (نتیجه) می‌چربد. */
/* فقط آرشیو و آموزش «جای دیگر»اند. نتیجه، خبر و اطلاع‌رسانی در «همه» می‌مانند و فقط از
   «سیگنال‌ها» و «در انتظار» بیرون‌اند؛ دکمه‌ی «نتایج» فیلترِ همان‌هاست، نه سطلی جدا. */
/* منقضی: سیگنالی که عمرش (پیش‌فرض ۷ روز) گذشته، از «سیگنال‌ها» و «همه» و شمارنده‌هایشان
   بیرون می‌رود و در سطل خودش می‌ماند؛ فقط با «برگرداندن» (دستی) یک عمر تازه می‌گیرد.
   سیگنالی که پوزیشنش هنوز باز است منقضی نمی‌شود — هنوز کار داری با آن. */
const hasOpenPos=p=>{const d=DB.decisions[p.id];
  return !!(d&&d.action==='taken'&&d.posId&&DB.positions.some(x=>x.id===d.posId&&x.status==='open'));};
const isExp=p=>isSigPost(p)&&isStale(p)&&!hasOpenPos(p);
const bucketOf=p=>isArch(p.id)?'arch':(isLesson(p.id)?'les':(isExp(p)?'exp':'live'));
const RX_ANN=/اطلاعیه|اطلاع\s*رسانی|قابل\s*توجه|توجه\s*(?:کنید|داشته)|کمپین|ثبت\s*نام|عضویت|لینک|تخفیف|وی\s*آی\s*پی|\bvip\b|پشتیبانی|ادمین|قوانین|دستورالعمل|لایو|وبینار|قرعه|جایزه|حمایت\s*کنید|رتبه|تبلیغ|پین/i;
const RX_NEWS=/خبر|اخبار|فوری|گزارش|فدرال|نرخ\s*بهره|تورم|\bcpi\b|\betf\b|بلک\s*راک|\bsec\b|ترامپ|هک\s*شد|لیست\s*شد|لیستینگ|دلیست|هاوینگ|آپگرید|آپدیت\s*شبکه|breaking|\bnews\b|بازار\s*امروز/i;
/* نوعِ هر پست: sig سیگنال · res نتیجه · news خبر · ann اطلاع‌رسانی · note بقیه.
   علامتِ دستیِ «این سیگنال است» بر همه می‌چربد؛ پستِ نتیجه حتی اگر شکل سیگنال داشته باشد نتیجه است. */
/* نوع هر پست در هر رندر چند بار پرسیده می‌شود (شمارنده‌ها، فیلتر، کارت) و هر بار چند
   عبارت باقاعده روی متن اجرا می‌شد. نتیجه تا ذخیره‌ی بعدی یا تغییر متن پست معتبر است. */
const KMEMO=new WeakMap();
function postKind(p){
  const s=sigOf(p), m=KMEMO.get(p);
  if(m&&m.g===KGEN&&m.s===s)return m.k;
  const k=postKind0(p,s);
  KMEMO.set(p,{g:KGEN,s,k});
  return k;
}
function postKind0(p,sg){
  const ov=OVERRIDE[p.id];
  if(ov&&ov.sig===true)return 'sig';
  if(isRes(p))return 'res';
  if(sg.isSignal)return 'sig';
  const t=faNorm(p.text||'');
  if(RX_ANN.test(t))return 'ann';
  if(RX_NEWS.test(t))return 'news';
  return 'note';
}
const isSigPost=p=>postKind(p)==='sig';
const KIND_FA={res:'نتیجه',news:'خبر',ann:'اطلاع‌رسانی',note:'یادداشت'};
let ACCOPEN=null;          // کارتِ بازِ آکاردئون؛ null یعنی «اولی»، '' یعنی هیچ‌کدام
const NEWIDS=new Set();          // پستی که در همین نشست تازه رسیده — نشان «تازه» می‌گیرد
const CARDS=new Map();           // برای بازسازی فقط یک کارت، بدون رندر دوباره‌ی کل فهرست
const decisionOf=id=>DB.decisions[id]||null;

