/* ==================== حالت تمرکز: یک صفحه‌ی «امروز» ====================
   با کلید «حالت تمرکز» در «سایر»: تب اول به‌جای «بازار» می‌شود «امروز» و «بازار» به «سایر» می‌رود.
   در «امروز» فقط چیزهایی که برای تصمیم لازم است:
   1) هوای بازار (چراغ لانگ/شورت)
   2) سیگنال‌های کانال که از قاعده رد شده‌اند (همان «الان چه کنم؟»، بی آن‌هایی که خلاف هوای بازارند)
   3) پوزیشن‌های باز با سود/ضرر الان
   4) نتیجه‌ی 7 روز اخیر (معامله‌های واقعی و تست‌های بازار) */
function focusApply(){
  const on=!!S.focus, tf=document.querySelector('.tab[data-v="focus"]'), tr=document.querySelector('.tab[data-v="radar"]');
  if(tf)tf.classList.toggle('hide',!on);if(tr)tr.classList.toggle('hide',on);
  const mr=$('#moreRadar');if(mr)mr.classList.toggle('hide',!on);
  const sw=$('#focusSw');if(sw)sw.classList.toggle('on',on);
  const t=$('#focusTgl');if(t){t.setAttribute('aria-pressed',on?'true':'false');
    t.onclick=()=>{S.focus=!S.focus;DB.settings=Object.assign({},S);save();focusApply();
      toast(S.focus?'حالت تمرکز روشن شد: تب «امروز»؛ «بازار» در «سایر» است':'حالت تمرکز خاموش شد','ok');
      if(S.focus)go('focus');else{renderAll();moveInd(false);}};}
  moveInd(false);
}
/* سیگنال‌های کانال برای «امروز»: همان «الان چه کنم؟»؛ خلاف هوای بازار جدا شمرده می‌شوند */
function focusTake(){
  const d=glanceData(),take=[],wx=[];
  for(const x of d.take)(rdWxDir(x.dir)==='no'?wx:take).push(x);
  return Object.assign({},d,{take,wx});
}
let FOCALL=false;
function renderFocus(){
  const g=$('#focusBody');if(!g)return;
  const d=focusTake(), now=Date.now();
  let h='<div class="focus">';
  h+=rdWxHtml(true);
  if(!RD.at||Date.now()-RD.at>2*36e5)h+='<div class="srow"><button class="btn sm" data-fc="scan">'+ic('refresh')+'<span>تازه کردن هوای بازار</span></button></div>';
  // سیگنال‌های قابل گرفتن
  h+='<div class="sechd">سیگنال‌های قابل گرفتن ('+faN(d.take.length)+')</div>';
  if(d.lock)h+='<div class="flag d"><i>!</i><span>'+faN(d.lock.n)+' باخت پیاپی — تا فردا ورود تازه نه.</span></div>';
  const list=FOCALL?d.take:d.take.slice(0,8);
  list.forEach((x,i)=>h+=glSigHtml(x,i));
  if(d.take.length>list.length)h+='<button class="btn sm glmore" data-fc="more">'+faN(d.take.length-list.length)+' سیگنال دیگر</button>';
  if(!d.take.length)h+='<div class="empty">الان سیگنال کانالیِ قابل گرفتنی نیست'+(d.wx.length?'؛ '+faN(d.wx.length)+' سیگنال خلاف هوای بازار کنار رفت':'')+'.</div>';
  else if(d.wx.length)h+='<div class="hint">'+faN(d.wx.length)+' سیگنال کانال خلاف هوای بازار است و این‌جا نیامد ('+d.wx.map(x=>esc(x.tk)+' '+(x.dir==='long'?'لانگ':'شورت')).slice(0,6).join('، ')+'). در «سیگنال‌ها › الان چه کنم؟» هست.</div>';
  {const ok=rdList().filter(x=>x.ok);if(ok.length)h+='<button class="glit" data-fc="radar">'+ic('bars')+'<span>رادار: '+faN(ok.length)+' فرصت قابل گرفتن ('+ok.slice(0,3).map(x=>esc(x.tk)).join('، ')+')</span></button>';}
  // پوزیشن‌های باز
  const P=openPos();
  h+='<div class="sechd">پوزیشن‌های باز ('+faN(P.length)+')</div>';
  if(P.length){let sum=0,nk=0;
    h+=P.map(p=>{const m=posMetrics(p,pxOf(p)),pn=m&&m.pnl;if(pn!=null){sum+=pn;nk++;}const dl=posDeadline(p);
      return '<button class="glit fcpos" data-fpos="'+esc(p.id)+'"><b dir="ltr">'+esc(p.ticker)+'</b><span class="pill '+p.dir+'">'+(p.dir==='long'?'لانگ':'شورت')+'</span>'+
        (pn!=null?'<b class="'+cls(pn)+'" dir="ltr">'+fmtUsd(pn)+'</b>':'')+(m&&m.r!=null?'<small class="'+cls(m.r)+'" dir="ltr">'+fmtR(m.r)+'</small>':'')+
        (dl?'<small>'+ic('clock')+(dl<=now?'مهلت گذشت':fmtLeft(dl-now))+'</small>':'')+'</button>';}).join('');
    if(nk)h+='<div class="hint">جمع سود/ضرر باز: <b class="'+cls(sum)+'" dir="ltr">'+fmtUsd(sum)+'</b></div>';}
  else h+='<div class="hint">پوزیشن بازی نداری.</div>';
  {const T=rbPend().filter(it=>it.k==='test').length,O=RB.items.filter(it=>it.k==='test'&&it.st==='open').length;
    if(T||O)h+='<button class="glit" data-fc="tests">'+ic('flag')+'<span>تست‌های بازار: '+faN(O)+' باز'+(T?' · '+faN(T)+' منتظر Limit':'')+'</span></button>';}
  // نتیجه‌ی هفته
  h+='<div class="sechd">7 روز اخیر</div><div class="hint weekly"><b>معامله‌های واقعی:</b> '+weekText(weekSummary())+'</div>';
  {const W=RB.items.filter(it=>it.k==='test'&&it.st!=='open'&&it.xt>now-7*864e5);if(W.length)h+=rbSumHtml(W,'تست‌های بازار');}
  h+='<div class="srow fcfoot"><button class="btn sm side" data-fc="off">'+ic('x')+'<span>خاموش کردن حالت تمرکز</span></button></div>';
  g.innerHTML=h+'</div>';
  rdWxBind(g,renderFocus);
  g.querySelectorAll('[data-fc]').forEach(b=>b.onclick=()=>{const a=b.dataset.fc;
    if(a==='more'){FOCALL=true;renderFocus();}
    else if(a==='scan'){rdScan('refresh');setTimeout(renderFocus,50);}
    else if(a==='radar'){RDV='sig';go('radar');}
    else if(a==='tests'){RDV='test';go('radar');}
    else if(a==='off'){S.focus=false;DB.settings=Object.assign({},S);save();focusApply();go('radar');toast('حالت تمرکز خاموش شد','ok');}});
  g.querySelectorAll('[data-fpos]').forEach(b=>b.onclick=()=>advDo({t:'pos',id:b.dataset.fpos}));
  g.querySelectorAll('[data-sig]').forEach(b=>b.onclick=()=>advDo({t:'sig',id:b.dataset.sig}));
  g.querySelectorAll('.glsig').forEach(w=>{
    const x=list[+w.dataset.i];if(!x)return;
    w.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
      const a=b.dataset.a;
      if(a==='iso')isoEnter(x.p,x.sig,x.ov,x.px);
      else if(a==='form')sheetEnter(x.p,x.sig,x.ov,x.px);
      else if(a==='skip')sheetSkip(x.p,x.sig,x.ov,x.px);
      else if(a==='copy')copyExch(x.p,x.sig,x.ov,x.px);
    });
  });
}
