/* ==================== ناوبری ==================== */
let view='signals';
const VIEWS=[['vSignals','signals'],['vPositions','positions'],['vScalp','scalp'],['vReport','report'],['vMore','more'],['vAudit','audit'],['vLearn','learn']];
/* اسکلپ، کارنامه و آموزش زیرِ «سایر»اند: وقتی بازند، همان تب روشن می‌ماند. */
const TAB_OF={scalp:'more',report:'more',learn:'more'};
function go(v,noScroll){
  if(view===v&&noScroll)return;
  view=v;
  document.documentElement.classList.remove('navhide');   // با عوض کردن تب، منو همیشه پیداست
  const tab=TAB_OF[v]||v;
  $$('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.v===tab?'true':'false'));
  for(const [id,name] of VIEWS){
    const n=$('#'+id), on=name===v;
    n.classList.toggle('hide',!on);
    if(on){n.classList.remove('enter');void n.offsetWidth;n.classList.add('enter');}
  }
  $('#disc').classList.toggle('hide',v!=='signals');
  moveInd(true);
  renderAll();
  if(!noScroll)window.scrollTo({top:0,behavior:'smooth'});
}
/* scroll را فقط وقتی می‌خواهیم که کاربر خودش تبی را زده باشد. قبلاً این تابع
   بی‌قید scrollIntoView نرم صدا می‌زد و چون در راه‌اندازی دو بار اجرا می‌شد،
   یک انیمیشن اسکرول روی نخ اصلی راه می‌انداخت: در پروفایلِ گوشی 234 میلی‌ثانیه
   از 695 میلی‌ثانیه‌ی راه‌اندازی همین بود، برای نواری که اغلب اصلاً اسکرول ندارد. */
function moveInd(scroll){
  const t=$('.tab[aria-selected="true"]'), ind=$('#tabInd');
  if(!t||!ind)return;
  // offsetLeft نسبت به همان ظرفی است که نشانگر هم در آن مطلق شده، پس اسکرولِ نوار
  // رویش اثر ندارد. با rect قبلی، هر مقدار scrollLeft نشانگر را به اندازه‌ی خودش کج می‌کرد.
  ind.style.width=t.offsetWidth+'px';
  ind.style.transform='translateX('+t.offsetLeft+'px)';
  if(!scroll)return;
  const box=t.parentNode;
  if(!box||box.scrollWidth<=box.clientWidth+1)return;   // نوار اصلاً اسکرول ندارد
  const l=t.offsetLeft, r=l+t.offsetWidth;
  if(l>=box.scrollLeft&&r<=box.scrollLeft+box.clientWidth)return;  // همین حالا دیده می‌شود
  try{t.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});}catch(e){}
}
/* نشانِ «سایر» = آموزش‌های نخوانده (بعد از رنگ شدنِ خودش) */
function paintMoreBadge(){
  const n=['#cLearn'].reduce((s,id)=>{const b=$(id);return s+(b&&+b.dataset.n||0);},0);
  const b=$('#cMore');if(b){b.textContent=faN(n);b.classList.toggle('z',!n);}
}
function renderAll(){
  document.documentElement.classList.toggle('fx',F('fx'));
  const open=DB.positions.filter(p=>p.status==='open').length;
  const cp=$('#cPos');cp.textContent=faN(open);cp.classList.toggle('z',!open);
  const und=POSTS.filter(p=>isOpenSig(p)&&bucketOf(p)==='live').length;
  const cs=$('#cSig');cs.textContent=faN(und);cs.classList.toggle('z',!und);
  paintAudBadge();
  // شمارنده‌های داخل نوارهای پوزیشن و بازار
  const nOpen=open, nClosed=DB.positions.filter(p=>p.status==='closed').length;
  const setN=(id,v)=>{const n=$('#'+id);if(n)n.textContent=faN(v);};
  const nAct=activePending().length;
  setN('cWait',nAct);setN('cOpenP',nOpen);setN('cClosedP',nClosed);
  setN('cAllP',DB.positions.length+nAct);

  if(view==='signals'){renderSignals();paintGlance();}
  else if(view==='audit')renderAudit();
  else if(view==='positions')renderPositions();
  else if(view==='report')renderReport();
  else if(view==='learn')renderLessons();
  else if(view==='scalp')renderScalp();
  paintLearnBadge();
  paintBotBadge();
  paintMoreBadge();
  destackAll();
  renderHealth();
}

