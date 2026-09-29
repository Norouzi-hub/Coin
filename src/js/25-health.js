/* ==================== وضعیت سرویس‌ها ==================== */
/* دو نقطه‌ی رنگی در هدر خلاصه را می‌گویند؛ کلیک روی آن‌ها این پنجره را باز می‌کند
   تا معلوم باشد داده از کجا آمده، کدام مسیر جواب داده، و اگر نیامده کدام حلقه قطع است */
function renderHealth(){
  const t=$('#hsTg'), p=$('#hsPx');
  if(!t)return;
  t.dataset.s=H.tg.state==='idle'?(POSTS.length?'stale':'idle'):H.tg.state;
  p.dataset.s=H.px.state;
  t.title='تلگرام: '+({ok:'سالم',err:'قطع',busy:'در حال خواندن',stale:'از حافظه',idle:'آماده'}[t.dataset.s]||'');
  p.title='قیمت: '+({ok:'زنده',err:'قطع',busy:'در حال گرفتن',stale:'قدیمی',idle:'آماده'}[p.dataset.s]||'');
  paintHsTxt();
}
/* برچسب خوانای وضعیت به‌جای دو نقطه‌ی رنگی: «آنلاین · 2د» یا «قطع · 17:09» (زمان آخرین داده) */
function paintHsTxt(){
  const x=$('#hsTxt');if(!x)return;
  const ts=$('#hsTg').dataset.s, ps=$('#hsPx').dataset.s;
  const last=Math.max(H.tg.at||0,PX_AT||0);
  const hm=d=>{const t=new Date(d);return String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');};
  const age=()=>{const s=(Date.now()-last)/1000;return s<60?'الان':s<3600?Math.round(s/60)+'د':s<86400?Math.round(s/3600)+'س':hm(last);};
  let s,t;
  if(ts==='busy'||ps==='busy'){s='busy';t='در حال بروزرسانی';}
  else if(ts==='err'&&ps==='err'){s='err';t=last?'قطع · '+hm(last):'قطع';}
  else if(ts==='err'||ps==='err'){s='warn';t='ناقص'+(last?' · '+age():'');}
  else if(ts==='ok'||ps==='ok'){s='ok';t='آنلاین'+(last?' · '+age():'');}
  else{s='idle';t=last?'از حافظه · '+hm(last):'آماده';}
  x.dataset.s=s;x.querySelector('em').textContent=t;
  $('#hchip').setAttribute('aria-label','وضعیت اتصال: '+t);
  const sh=$('#sheet');
  if(sh&&sh.dataset.kind==='health')fillHealth(sh.querySelector('.hlist'));
}
function hrow(name,state,icon,lines,tagOverride){
  const tag=tagOverride||{ok:'سالم',err:'قطع',busy:'در حال کار',stale:'قدیمی',warn:'ناقص',idle:'آماده'}[state]||state;
  return '<div class="hrow2" data-s="'+state+'"><div class="hi">'+ic(icon)+'</div><div class="hb">'+
    '<div class="hn"><span>'+name+'</span><em>'+tag+'</em></div>'+
    '<div class="hd">'+lines.filter(Boolean).join('<br>')+'</div></div></div>';
}
function fillHealth(box){
  if(!box)return;
  const tg=H.tg, px=H.px, c=H.cache;
  const tgState=tg.state==='idle'?(POSTS.length?'stale':'idle'):tg.state;
  box.innerHTML=
    hrow('کانال تلگرام',tgState,'wifi',[
      tg.route?'مسیر: <b>'+esc(tg.route)+'</b>'+(tg.ms!=null?' · <b>'+faN(tg.ms)+'</b> میلی‌ثانیه':''):'هنوز مسیری جواب نداده',
      tg.at?'آخرین خواندن موفق: <b>'+ageTxt(tg.at)+'</b>':null,
      tg.ok||tg.fail?'در این نشست: <b>'+faN(tg.ok)+'</b> موفق، <b>'+faN(tg.fail)+'</b> ناموفق':null,
      tg.err?'<span style="color:var(--dn)">'+esc(tg.err)+'</span>':null
    ])+
    hrow('قیمت لحظه‌ای',px.state,'coin',[
      px.src?'منبع: <b>'+esc(px.src)+'</b> · <b>'+faN(px.n)+'</b> نماد':'هنوز قیمتی گرفته نشده',
      px.route?'مسیر: <b>'+esc(px.route)+'</b>'+(px.ms!=null?' · <b>'+faN(px.ms)+'</b> میلی‌ثانیه':''):null,
      needMark()?(px.mark?'پوزیشن‌های فیوچرز با <b>مارک پرایس</b> ('+esc(px.mark)+') سنجیده می‌شوند'
        :'<span style="color:var(--warn)">مارک پرایس فیوچرز نیامد؛ پوزیشن‌های فیوچرز با قیمت اسپات سنجیده می‌شوند.</span>'):null,
      px.at?'تازه‌شده: <b>'+ageTxt(px.at)+'</b>':null,
      px.state==='stale'&&px.at?'<span style="color:var(--warn)">این قیمت‌ها از حافظه‌اند و ممکن است عقب باشند.</span>':null,
      px.err?'<span style="color:var(--dn)">'+esc(px.err)+'</span>':null
    ])+
    hrow('پست‌های ذخیره‌شده',storeOK?(c.n?'ok':'idle'):'err','db',[
      storeOK?null:'<span style="color:var(--dn)">در این مرورگر چیزی ذخیره نمی‌شود؛ با بستن صفحه داده‌ها می‌روند.</span>',
      storeOK?'<b>'+faN(c.n)+'</b> پست در حافظه مرورگر'+(c.kb?' (حدود <b>'+faN(c.kb)+'</b> کیلوبایت)':''):null,
      c.at?'آخرین ذخیره: <b>'+ageTxt(c.at)+'</b>':null,
      REACHED_END?'تا اولین پست کانال خوانده شده است.':null,
      'پوزیشن‌ها: <b>'+faN(DB.positions.length)+'</b> · تصمیم‌ها: <b>'+faN(Object.keys(DB.decisions).length)+'</b>',
      PERSIST===true?'حافظه‌ی ماندگار: <b>بله</b> — مرورگر داده‌ها را خودش پاک نمی‌کند'
        :PERSIST===false?'<span style="color:var(--warn)">حافظه‌ی ماندگار: نه — مرورگر ممکن است بعد از مدتی داده‌ها را پاک کند؛ پشتیبان یا همگام‌سازی لازم است.</span>':null,
      storeOK?'آخرین پشتیبان: <b>'+(syncOn()&&syncCfg.at?ageTxt(syncCfg.at)+' (همگام‌سازی)':lsGet(BKKEY)?ageTxt(lsGet(BKKEY)):'هیچ‌وقت')+'</b>':null
    ])+
    hrow('محیط اجرا',LOCAL_ORIGIN?'warn':'ok','shield',[
      'صفحه از <b>'+esc(location.protocol+(location.host?'//'+location.host:''))+'</b> باز شده',
      LOCAL_ORIGIN
        ?'<span style="color:var(--warn)">این یک آدرس وب معمولی نیست (فایل محلی یا داخل یک برنامه). '+
         'بعضی واسط‌ها چنین درخواستی را رد می‌کنند و ممکن است حافظه‌ی مرورگر هم پاک شود. '+
         'اگر می‌شود فایل را در مرورگر خودت یا روی هاست خودت باز کن.</span>'
        :'آدرس وب معمولی؛ بهترین حالت.',
      LOCAL_ORIGIN?'در این حالت اتصال مستقیم به تلگرام ممکن است کار کند — برنامه اول همان را امتحان می‌کند.':null,
      SW_ON?'کار بی‌اینترنت: <b>فعال</b> — برنامه از حافظه باز می‌شود':null
    ],LOCAL_ORIGIN?'محلی':'وب')+
    hrow('بروزرسانی خودکار',S.auto?'ok':'idle','refresh',[
      S.auto?'هر <b>'+faN(S.auto/60)+'</b> دقیقه، و هر بار که به این صفحه برگردی':'خاموش است؛ خودت باید «بروزرسانی» را بزنی',
      S.auto&&nextTick?'بعدی: <b>'+faN(Math.max(0,Math.round((nextTick-Date.now())/1000)))+'</b> ثانیه دیگر':null
    ],S.auto?'روشن':'خاموش');
}

/* ---- جدول تست اتصال ---- */
function diagRowHTML(r){
  const st=r.skip?'—':r.busy?'…':r.ok?'✓':'✕';
  const c=r.skip?'var(--tx3)':r.busy?'var(--gold)':r.ok?'var(--up)':'var(--dn)';
  return '<tr><td>'+esc(r.name)+'</td>'+
    '<td class="num" style="color:'+c+';font-weight:900">'+st+'</td>'+
    '<td class="num">'+(r.ms!=null&&!r.busy?faN(r.ms)+'ms':'—')+'</td>'+
    '<td style="font-size:12px;color:var(--tx2)">'+esc(r.busy?'در حال امتحان…':(r.msg||''))+'</td></tr>';
}
function paintDiag(rows,done){
  const box=$('#diagBox');
  if(!box)return;
  const tg=rows.filter(r=>r.kind==='tg'), px=rows.filter(r=>r.kind==='px');
  const tbl=(title,list)=>'<div class="sechd" style="margin:12px 0 6px">'+title+'</div>'+
    '<div class="tscroll"><table class="tp"><thead><tr><th>مسیر</th><th>نتیجه</th><th>زمان</th><th>توضیح</th></tr></thead>'+
    '<tbody>'+list.map(diagRowHTML).join('')+'</tbody></table></div>';
  let h=tbl('رسیدن به کانال تلگرام',tg)+ (px.length?tbl('رسیدن به صرافی‌ها (برای قیمت)',px):'');
  if(done){
    const tgOk=tg.filter(r=>r.ok).map(r=>r.name);
    const pxOk=px.filter(r=>r.ok).map(r=>r.name);
    h+='<div class="flag '+(tgOk.length?'u':'d')+'" style="margin-top:12px"><i>'+(tgOk.length?'✓':'✕')+'</i><span>'+
      (tgOk.length
        ? 'کانال از این مسیر(ها) می‌آید: <b>'+tgOk.map(esc).join('، ')+'</b>. همین را برنامه از این به بعد اول امتحان می‌کند.'
        : 'هیچ مسیر واسطی از این شبکه به تلگرام نرسید. تنها راه مطمئن، یک واسط از خودت است — پایین‌تر توضیح داده‌ام.')+
      '</span></div>';
    if(!pxOk.length&&px.length)h+='<div class="flag w"><i>!</i><span>هیچ صرافی‌ای هم جواب نداد؛ '+
      'یعنی احتمالاً کل این شبکه به سایت‌های خارجی دسترسی ندارد، نه فقط تلگرام.</span></div>';
  }
  box.innerHTML=h;
}

/* ---- گزارش رخدادها ---- */
function paintLog(){
  const box=$('#logBox');
  if(!box)return;
  const items=LOG.slice(-60).reverse();
  if(!items.length){box.innerHTML='<div class="hint">هنوز رخدادی ثبت نشده.</div>';return;}
  const col={ok:'var(--up)',warn:'var(--warn)',err:'var(--dn)',info:'var(--tx3)'};
  box.innerHTML='<div class="logl">'+items.map(e=>
    '<div class="logr"><i style="background:'+(col[e.l]||'var(--tx3)')+'"></i>'+
    '<time>'+esc(jStampFa(new Date(e.t)).slice(-5))+'</time>'+
    '<span>'+esc(e.m)+
      (e.route?' <em>'+esc(e.route)+'</em>':'')+
      (e.ms!=null?' <em>'+faN(e.ms)+'ms</em>':'')+
      (e.status?' <em>HTTP '+faN(e.status)+'</em>':'')+
    '</span></div>').join('')+'</div>'+
    (LOG.length>60?'<div class="hint">60 رخداد آخر نشان داده شده؛ در فایل گزارش همه‌شان هست.</div>':'');
}

function sheetHealth(){
  openSheet(
    '<h3>وضعیت و عیب‌یابی</h3>'+
    '<div class="sub">این صفحه سرور ندارد و داده را مستقیم از تلگرام و صرافی‌ها می‌گیرد. '+
      'اگر چیزی نمی‌آید، «تست اتصال» را بزن تا معلوم شود کدام حلقه قطع است.</div>'+
    '<div class="hlist"></div>'+
    '<div class="srow">'+
      '<button class="btn pri" id="hDiag">تست اتصال</button>'+
      '<button class="btn" id="hRef">بروزرسانی الان</button>'+
      '<button class="btn" id="hPx">فقط قیمت‌ها</button>'+
    '</div>'+
    '<div id="diagBox"></div>'+
    '<div class="sechd">گزارش رخدادها</div>'+
    '<div id="logBox"></div>'+
    '<div class="srow">'+
      '<button class="btn sm" id="hCopy">کپی گزارش</button>'+
      '<button class="btn sm" id="hDl">ذخیره در فایل</button>'+
      '<button class="btn sm dgr" id="hLogClr">پاک کردن گزارش</button>'+
    '</div>'+
    '<div id="logDump" class="hide" style="margin-top:10px"><textarea rows="6" readonly '+
      'style="width:100%;background:var(--inset);border:1px solid var(--line2);border-radius:11px;padding:9px;'+
      'font-size:12px;direction:ltr;text-align:left"></textarea></div>'+
    '<div class="sechd">پست‌های ذخیره‌شده</div>'+
    '<div class="srow" style="margin-top:0"><button class="btn sm dgr" id="hClr">پاک کردن پست‌های ذخیره‌شده</button></div>'+
    '<div class="hint">پاک کردن پست‌های ذخیره‌شده به پوزیشن‌ها و کارنامه‌ات کاری ندارد؛ فقط باعث می‌شود پست‌ها از اول از تلگرام خوانده شوند.</div>',
    sh=>{
      sh.dataset.kind='health';
      fillHealth(sh.querySelector('.hlist'));
      paintLog();
      sh.querySelector('#hDiag').onclick=async e=>{
        const b=e.currentTarget;
        btnBusy(b,true,'در حال تست…');
        const rows=[];
        await runDiag(r=>{if(!rows.includes(r))rows.push(r);paintDiag(rows,false);});
        paintDiag(rows,true);
        fillHealth(sh.querySelector('.hlist'));
        // اگر مسیری پیدا شد، همان‌جا داده را می‌آوریم — نه اینکه کاربر دستی دنبالش بگردد
        if(rows.some(r=>r.kind==='tg'&&r.ok)){
          btnBusy(b,true,'مسیر پیدا شد، در حال گرفتن…');
          await refresh(false);
          fillHealth(sh.querySelector('.hlist'));
          toast(POSTS.length?'کانال از '+H.tg.route+' آمد':'مسیر جواب داد ولی پستی نیامد',POSTS.length?'ok':'err');
        }
        btnBusy(b,false);
      };
      sh.querySelector('#hRef').onclick=async e=>{
        btnBusy(e.currentTarget,true,'در حال بروزرسانی');
        await refresh(false);
        btnBusy(e.currentTarget,false);
        fillHealth(sh.querySelector('.hlist'));
      };
      sh.querySelector('#hPx').onclick=async e=>{
        btnBusy(e.currentTarget,true,'در حال گرفتن قیمت');
        const ok=await loadPrices(true);
        btnBusy(e.currentTarget,false);
        fillHealth(sh.querySelector('.hlist'));renderAll();
        toast(ok?'قیمت‌ها از '+priceSrc+' تازه شد':'قیمت‌ها نیامد',ok?'ok':'err');
      };
      sh.querySelector('#hCopy').onclick=e=>copyLog(e.currentTarget);
      sh.querySelector('#hDl').onclick=downloadLog;
      sh.querySelector('#hLogClr').onclick=()=>{clearLog();toast('گزارش پاک شد','ok');};
      sh.querySelector('#hClr').onclick=()=>{
        clearPostCache();POSTS=[];PCACHE.clear();REACHED_END=false;
        H.cache={n:0,kb:0,at:null,fromCache:false};
        fillHealth(sh.querySelector('.hlist'));renderAll();
        toast('پست‌های ذخیره‌شده پاک شد','ok');
        refresh(false);
      };
    });
}

