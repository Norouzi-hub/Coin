/* ==================== رویدادها ==================== */
function wire(){
  $('#emblem').innerHTML=STAR;
  $('#btnSet').innerHTML=ic('sliders');
  $('#btnRef').innerHTML=ic('refresh')+'<span>بروزرسانی</span>';
  $('#qIc').innerHTML=ic('search');
  $('#lqIc').innerHTML=ic('search');
  wireLightbox();
  $('#btnMore').innerHTML=ic('down')+'<span>پست‌های قدیمی‌تر</span>';
  $$('.tab').forEach(t=>{
    t.insertAdjacentHTML('afterbegin',ic(t.dataset.ic));
    t.onclick=()=>go(t.dataset.v);
  });
  // منوی «سایر» و دکمه‌ی برگشت در بالای کانال‌سنج و آموزش
  $$('.moreit [data-ic]').forEach(i=>{i.outerHTML=ic(i.dataset.ic);});
  $$('[data-go]').forEach(b=>b.onclick=()=>b.dataset.go==='settings'?openPanel('setVeil'):go(b.dataset.go));
  $$('.crumb').forEach(b=>b.insertAdjacentHTML('afterbegin',ic('back')));
  $('#hchip').onclick=sheetHealth;
  $('#btnRef').onclick=()=>{readSettings();refresh(false);};
  $('#btnMore').onclick=async e=>{
    const b=e.currentTarget;
    btnBusy(b,true,'در حال گرفتن');
    await refresh(true);
    btnBusy(b,false);
    renderMore();
  };
  const debounce=(fn,ms)=>{let t=null;return function(){clearTimeout(t);
    t=setTimeout(()=>{t=null;fn.apply(this,arguments);},ms);};};
  const runQuery=debounce(()=>{shownMax=PAGE;renderSignals();},160);
  $('#q').oninput=e=>{query=e.target.value;runQuery();};
  const runLq=debounce(()=>renderLessons(),160);
  $('#lq').oninput=e=>{lessonQ=e.target.value;runLq();};


  const pf=(btn,val)=>{$('#'+btn).onclick=()=>{posFilter=val;renderPositions();};};
  pf('pWait','pending');pf('pOpen','open');pf('pClosed','closed');pf('pAllP','all');
  $('#posSort').onchange=e=>{POSSORT=e.target.value;lsSet('signaldesk.possort.v1',POSSORT);renderPositions();};
  $('#btnManual').onclick=()=>sheetEditPos(null);
  $$('#vReport .fb[data-p]').forEach(b=>b.onclick=()=>{
    if(b.dataset.p==='range')return sheetRange();
    repView='list';repPeriod=b.dataset.p;
    $$('#vReport .fb[data-p]').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));
    renderReport();
  });
  $('#repCal').onclick=()=>{repView=repView==='cal'?'list':'cal';renderReport();};
  // تنظیمات
  $('#btnWCopy').onclick=e=>copyWorker(e.currentTarget);
  $('#btnWTest').onclick=e=>testWorker(e.currentTarget);
  /* باز یا بسته بودن هر بخش یادش می‌ماند، وگرنه هر بار باید همان دو تایی را که
     واقعاً استفاده می‌کنی دوباره باز کنی. */
  const SECKEY='signaldesk.sec.v1';
  const secOpen=lsGet(SECKEY)||null;
  $$('#setVeil .sec[data-sec]').forEach(d=>{
    const k=d.dataset.sec;
    if(secOpen&&k in secOpen)d.open=!!secOpen[k];
    d.addEventListener('toggle',()=>{
      const m=lsGet(SECKEY)||{};m[k]=d.open;lsSet(SECKEY,m);});
  });
  /* آموزش ورکر وقتی واسط شخصی داری و جواب داده، کارش تمام است */
  const wsx=$('#wSetup');
  if(wsx&&!proxyList().length&&!goodFor('tg'))wsx.open=true;
  $('#btnSet').onclick=()=>openPanel('setVeil');
  $('#setX').onclick=()=>closePanel('setVeil');
  $('#setDone').onclick=()=>closePanel('setVeil');
  $('#setVeil').onclick=e=>{if(e.target===$('#setVeil'))closePanel('setVeil');};
  $('#veil').onclick=e=>{if(e.target===$('#veil'))closeSheet();};
  for(const id of ['sProxy','sChannel','sAcct','sCap','sAmts','sRisk','sMaxLev','sDaily','sMode','sR','sFee','sSlip','sFund','sOpenRisk','sAuto','sStale','sCal','sPb'])
    $('#'+id).onchange=()=>{readSettings();renderAll();};
  wireIO();
  linkLabels(document.getElementById('setVeil'));
  wirePTR();setHdrH();addEventListener('resize',setHdrH);
  // منوی پایین: پایین رفتن پنهانش می‌کند، بالا آمدن یا رسیدن به ته صفحه نشانش می‌دهد
  {let lastY=scrollY;
   addEventListener('scroll',()=>{
     const y=scrollY, d=y-lastY;if(Math.abs(d)<8)return;
     const atEnd=y+innerHeight>=document.documentElement.scrollHeight-40;
     document.documentElement.classList.toggle('navhide',d>0&&y>180&&!atEnd);
     lastY=y;},{passive:true});}
  moneyInput($('#sAcct'));moneyInput($('#sCap'));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(!$('#veil').classList.contains('hide'))closeSheet();
    else if(!$('#setVeil').classList.contains('hide'))closePanel('setVeil');
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden||busy)return;
    paintRing();
    if(S.auto>0&&(!PX_AT||Date.now()-PX_AT>S.auto*1000))refresh(false,true);
  });
  addEventListener('resize',()=>moveInd(false));
  addEventListener('orientationchange',()=>setTimeout(()=>moveInd(false),200));
  /* شمارنده‌ی حلقه هر ثانیه؛ نوار وضعیت («۲ دقیقه پیش») هر ۵ ثانیه کافی است.
     وقتی صفحه پنهان است هیچ‌کدام لازم نیست. */
  let tk=0;
  setInterval(()=>{
    if(document.hidden)return;
    paintRing();
    if(++tk%5===0&&view==='signals'&&!busy&&POSTS.length)showStatus();
    if(tk%5===0)paintHsTxt();
  },1000);
}

