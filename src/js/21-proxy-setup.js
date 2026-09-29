/* ==================== راه‌اندازی واسط ==================== */
/* کد ورکر کنار همین صفحه منتشر شده، پس از خودِ سایت می‌خوانیمش. این‌طور یک نسخه بیشتر
   وجود ندارد و با تغییر proxy/worker.js، دکمه هم همان تغییر را می‌دهد. */
const WORKER_SRC='proxy/worker.js';
async function copyWorker(btn){
  btnBusy(btn,true);
  try{
    const r=await fetch(WORKER_SRC,{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const code=await r.text();
    if(code.length<200)throw new Error('کد ناقص آمد');
    try{
      await navigator.clipboard.writeText(code);
      toast('کد ورکر کپی شد — حالا در Cloudflare بچسبانش','ok');
    }catch(e){
      // بعضی مرورگرها کلیپ‌بورد را نمی‌دهند؛ فایل را باز می‌کنیم تا دستی کپی شود
      window.open(WORKER_SRC,'_blank','noopener');
      toast('کپی خودکار نشد؛ کد باز شد، دستی کپی‌اش کن','info');
    }
  }catch(e){
    toast('کد ورکر خوانده نشد؛ از مخزن بردارش','err');
    logIt('warn','کد ورکر از '+WORKER_SRC+' نیامد: '+(e&&e.message||e));
  }finally{btnBusy(btn,false);}
}
/* واسط را جدا از بقیه‌ی مسیرها امتحان می‌کند تا بشود فهمید خودش سالم است یا نه */
async function testWorker(btn){
  const list=proxyList();
  if(!list.length){toast('اول آدرس واسط را در کادر بالا بنویس','err');return;}
  btnBusy(btn,true);
  const note=$('#wNote');
  try{
    let anyOk=false;
    for(const r of customRoutes()){
      const res=await tryRoute(r,tgUrl(null),{validate:looksLikeTg,timeout:12000});
      logIt(res.ok?'ok':'warn','تست واسط · '+r.name+' — '+(res.ok?'کانال آمد':res.msg),
        {route:r.name,ms:res.ms,status:res.status,why:res.why});
      if(res.ok){
        anyOk=true;
        setGoodRoute('tg',r.id);DEADROUTE.delete(r.id);
        note.innerHTML='<b style="color:var(--up)">واسط جواب داد</b> — کانال در '+
          faN(res.ms)+' میلی‌ثانیه آمد. از این به بعد اول از همین می‌رود.';
        toast('واسط سالم است','ok');
        break;
      }
      note.innerHTML='<b style="color:var(--dn)">واسط جواب نداد</b> — '+esc(res.msg||'')+
        (res.why==='http'&&res.status===403
          ?'<br>403 یعنی ورکر بالا آمده ولی t.me را در فهرست مجازش ندارد.'
          :res.why==='blocked'
            ?'<br>یعنی آدرس اصلاً باز نشد: یا غلط نوشته شده یا روی این شبکه بسته است.'
            :'');
    }
    if(anyOk)refresh(false);
  }finally{btnBusy(btn,false);}
}

