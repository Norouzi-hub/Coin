/* ==================== کار بی‌اینترنت ==================== */
/* سرویس‌ورکر (sw.js) فایل‌های خود برنامه را نگه می‌دارد: دفعه‌ی بعد صفحه بدون دانلود ۶۰۰ کیلوبایت
   همان لحظه باز می‌شود و بی‌اینترنت هم باز می‌شود. داده‌ی کانال و صرافی‌ها از آن رد نمی‌شود.
   در تست خودکار (webdriver) ثبت نمی‌شود تا مسیرهای ساختگیِ تست را دور نزند. */
let SW_ON=false;
function wireSW(){
  try{
    if(!('serviceWorker' in navigator)||LOCAL_ORIGIN)return;
    if(navigator.webdriver&&!window.__SD_SW)return;
    if(!(location.protocol==='https:'||/^(localhost|127\.0\.0\.1)$/.test(location.hostname)))return;
    // این صفحه از حافظه باز شده و نسخه‌ی تازه پشت صحنه رسیده؟ (چند بار، چون گرفتنش زمان می‌برد)
    const ask=()=>{const c=navigator.serviceWorker.controller;if(c)c.postMessage({type:'sd-check',since:performance.timeOrigin});};
    navigator.serviceWorker.register('sw.js').then(r=>{SW_ON=true;
      ask();setTimeout(ask,4000);setTimeout(ask,15000);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden){r.update().catch(()=>{});ask();}});
    }).catch(e=>logIt('warn','سرویس‌ورکر ثبت نشد: '+(e&&e.message||e)));
    navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='sd-update')showUpdateBar();});
  }catch(e){}
}
function showUpdateBar(){
  const w=$('#updBar');if(!w)return;
  w.innerHTML='<span>'+ic('refresh')+' نسخه‌ی تازه‌ی برنامه آمده است.</span>';
  const b=el('button','btn sm pri','بارگذاری دوباره');b.onclick=()=>location.reload();
  const x=el('button','btn sm','بعداً');x.onclick=()=>w.classList.add('hide');
  w.appendChild(b);w.appendChild(x);w.classList.remove('hide');
}

