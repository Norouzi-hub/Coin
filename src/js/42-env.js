/* ==================== محیط اجرا ==================== */
/* وقتی این فایل از داخل «فایل منیجر» باز می‌شود، آدرس صفحه content:// می‌شود و مرورگرِ داخلیِ
   آن برنامه، صفحه را بدون هویت (origin = null) اجرا می‌کند. نتیجه‌اش این است که بیشتر واسط‌ها
   درخواست را رد می‌کنند و بعضی درخواست‌ها اصلاً از گوشی بیرون نمی‌روند. چون این تنها مشکلی است
   که کاربر خودش در 10 ثانیه می‌تواند حلش کند، به‌جای یک سطر در گزارش، بالای صفحه نشانش می‌دهیم. */
function showOriginWarn(){
  if(!LOCAL_ORIGIN)return;
  if(document.getElementById('originWarn'))return;
  const inApp=/^content:/i.test(location.protocol);
  const box=document.createElement('div');
  box.id='originWarn';
  box.setAttribute('style',
    'margin:10px auto;max-width:720px;padding:12px 14px;border-radius:12px;line-height:1.9;'+
    'background:#3a2410;border:1px solid #8a5a1e;color:#ffd8a8;font-size:13px');
  box.innerHTML=
    '<b>این صفحه جای درستی باز نشده است.</b><br>'+
    (inApp
      ?'الان از داخل فایل‌منیجر باز شده (آدرس صفحه با <code dir="ltr">content://</code> شروع می‌شود). '
      :'الان مستقیم از روی فایل باز شده (آدرس صفحه با <code dir="ltr">file://</code> شروع می‌شود). ')+
    'در این حالت صفحه هویت اینترنتی ندارد و واسط‌ها جوابش را نمی‌دهند — دقیقاً همان «401» و '+
    '«اتصال برقرار نشد»هایی که در گزارش می‌بینی.<br>'+
    '<b>راه‌حل:</b> همین فایل را روی یک آدرس <code dir="ltr">https://</code> بگذار و از مرورگر '+
    'کروم بازش کن. ساده‌ترین راهِ رایگان، GitHub Pages است (در فایل <code dir="ltr">README.md</code> '+
    'قدم‌به‌قدم نوشته شده).';
  const main=document.getElementById('main');
  if(main&&main.parentNode)main.parentNode.insertBefore(box,main);
  else document.body.insertBefore(box,document.body.firstChild);
  logIt('warn','صفحه از '+location.protocol+' باز شده؛ واسط‌ها به صفحه‌ی بی‌هویت جواب نمی‌دهند');
}

