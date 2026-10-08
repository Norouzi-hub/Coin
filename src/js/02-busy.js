/* ==================== نشانه‌های «در حال کار» ==================== */
/* هر درخواست شبکه نوار طلایی بالای صفحه و چرخش شمسه را روشن می‌کند */
const NET={n:0}, WORK={n:0};
function netStart(){NET.n++;document.documentElement.classList.add('busy');abusyOn();}
function netEnd(){NET.n=Math.max(0,NET.n-1);if(!NET.n&&!WORK.n)document.documentElement.classList.remove('busy');abusyOff();}
/* fetch مستقیم (همگام‌سازی، کد ورکر، عکس) با همان نشانه‌ها */
async function netFetch(u,o){netStart();try{return await fetch(u,o);}finally{netEnd();}}
/* کار طولانیِ بی‌شبکه (یادگیری مدل، ساخت خروجی…): همان نشانه‌ها */
function workStart(){WORK.n++;document.documentElement.classList.add('busy');abusyOn();}
function workEnd(){WORK.n=Math.max(0,WORK.n-1);if(!NET.n&&!WORK.n)document.documentElement.classList.remove('busy');abusyOff();}
/* یک کار طولانیِ دلخواه (Promise) با همان نشانه‌ها؛ دکمه‌ای که زده شده چرخنده می‌گیرد */
async function busyRun(p){workStart();try{return await (typeof p==='function'?p():p);}finally{workEnd();}}
/* هر دکمه‌ای که با زدنش (تا 0.8 ثانیه بعد) درخواست شبکه یا کار طولانی شروع شود، خودکار چرخنده می‌گیرد
   و تا تمام شدن همه‌ی کارها نمی‌شود دوباره زدش. دکمه‌هایی که خودشان حالت «در حال کار» دارند (is-busy)،
   تب‌ها و فیلترها جدا نمی‌گیرند. */
const ABUSY={b:null,t:0,base:0,set:new Map()};
const actN=()=>NET.n+WORK.n;
document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('button,.btn');
  // وسط یک کار طولانیِ پس‌زمینه (مثل بررسی رادار) درخواست‌ها مال آن‌اند، نه این دکمه
  if(b&&!b.disabled&&!WORK.n&&!b.closest('#tabs,[role=tablist],.fseg,.frow,.fbar,.pbpick,#jobBar'))Object.assign(ABUSY,{b,t:Date.now(),base:actN()});},true);
function abusyOn(){const b=ABUSY.b;if(!b)return;ABUSY.b=null;
  if(Date.now()-ABUSY.t>800||!b.isConnected||b.classList.contains('is-busy')||b.disabled)return;
  b.classList.add('abusy');b.setAttribute('aria-busy','true');ABUSY.set.set(b,{base:ABUSY.base,t0:Date.now()});setTimeout(abusyOff,30500);}
function abusyOff(){
  for(const [b,o] of ABUSY.set){
    if(!b.isConnected){ABUSY.set.delete(b);continue;}
    if(actN()>o.base&&Date.now()-o.t0<30000)continue;
    ABUSY.set.delete(b);setTimeout(()=>{b.classList.remove('abusy');b.removeAttribute('aria-busy');},Math.max(0,400-(Date.now()-o.t0)));}
}
/* دکمه در حال کار: چرخنده، متن توضیحی، و غیرفعال تا پایان */
function btnBusy(b,on,label){
  if(!b)return;
  if(on){
    if(b.dataset.lbl==null)b.dataset.lbl=b.innerHTML;
    b.classList.add('is-busy');b.disabled=true;b.setAttribute('aria-busy','true');
    b.innerHTML='<span class="bspin"></span>'+(label?'<span>'+label+'</span>':'');
  }else{
    b.classList.remove('is-busy');b.disabled=false;b.removeAttribute('aria-busy');
    if(b.dataset.lbl!=null){b.innerHTML=b.dataset.lbl;delete b.dataset.lbl;}
  }
}
const skelHTML=n=>Array.from({length:n},(_,i)=>
  '<div class="skel" aria-hidden="true"><i></i>'+(i%2?'':'<i class="b"></i>')+'<i></i><i class="s"></i></div>').join('');
function ageTxt(ts){
  if(!ts)return '—';
  const s=(Date.now()-ts)/1000;
  if(s<8)return 'همین الان';
  if(s<60)return faN(Math.round(s))+' ثانیه پیش';
  if(s<3600)return faN(Math.round(s/60))+' دقیقه پیش';
  if(s<86400)return faN(Math.round(s/3600))+' ساعت پیش';
  return faN(Math.round(s/86400))+' روز پیش';
}

/* ==================== کارهای در حال انجام ====================
   هر کار طولانی (بررسی بازار، سنجش کانال، گرفتن پست‌ها، خروجی تست‌ها…) اینجا ثبت می‌شود و
   در نوار بالای صفحه می‌آید: چه کاری، چند درصد؛ زدنش به همان بخش می‌برد؛ کارهای چندمرحله‌ای
   توقف/ادامه و لغو دارند. توقف و لغو فقط بین مرحله‌ها اثر می‌کند (jobGate)، پس داده نیمه‌کاره نمی‌ماند.
   کاری که زیر 0.6 ثانیه تمام شود اصلاً نشان داده نمی‌شود تا نوار چشمک نزند. */
const JOBS=new Map();
let JOBT=null,JOBIV=null;
function jobSet(id,o){let j=JOBS.get(id);if(!j){j={id,t0:Date.now(),paused:false,stop:false};JOBS.set(id,j);setTimeout(jobPaint,650);}
  Object.assign(j,o||{});jobPaint();return j;}
function jobEnd(id){if(JOBS.delete(id))jobPaint();}
const jobStopped=id=>{const j=JOBS.get(id);return !!(j&&j.stop);};
/* بین دو مرحله صدا بزن: تا «ادامه» صبر می‌کند؛ false یعنی لغو شد */
async function jobGate(id){const j=JOBS.get(id);if(!j)return true;
  while(j.paused&&!j.stop&&JOBS.get(id)===j)await new Promise(r=>setTimeout(r,300));return !j.stop;}
const jobVal=v=>typeof v==='function'?(()=>{try{return v();}catch(e){return null;}})():v;
function jobPaint(){
  if(JOBT)return;JOBT=setTimeout(()=>{JOBT=null;
    const bar=document.getElementById('jobBar');if(!bar)return;
    const L=[...JOBS.values()].filter(j=>Date.now()-j.t0>=600);
    bar.classList.toggle('hide',!L.length);
    if(!L.length){bar.innerHTML='';clearInterval(JOBIV);JOBIV=null;return;}
    if(!JOBIV)JOBIV=setInterval(jobPaint,1000);
    bar.innerHTML=L.map(j=>{const p=jobVal(j.pct),m=jobVal(j.msg),pc=p!=null&&isFinite(p)?Math.max(1,Math.min(99,Math.round(p))):null;
      return '<div class="job'+(j.paused?' paused':'')+'" data-job="'+j.id+'">'+
        '<button class="jobm" data-jgo="1"'+(j.go?'':' disabled')+' title="'+(j.go?'برو به همین بخش':'')+'">'+(j.paused?'<span class="jpz">'+ic('pause')+'</span>':'<span class="bspin"></span>')+
        '<b>'+esc(j.title||'در حال کار')+'</b>'+(m?'<small>'+esc(String(m))+'</small>':'')+(pc!=null?'<i class="jpct" dir="ltr">'+pc+'%</i>':'')+'</button>'+
        (j.pause?'<button class="jbt" data-jp="1" title="'+(j.paused?'ادامه':'توقف')+'" aria-label="'+(j.paused?'ادامه':'توقف')+'">'+ic(j.paused?'play':'pause')+'</button>':'')+
        (j.cancel?'<button class="jbt" data-jx="1" title="لغو" aria-label="لغو">'+ic('x')+'</button>':'')+
        (pc!=null?'<i class="jbar" style="width:'+pc+'%"></i>':'')+'</div>';}).join('');
  },40);
}
document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest&&e.target.closest('#jobBar button');if(!b)return;
  const j=JOBS.get(b.closest('[data-job]').dataset.job);if(!j)return;
  if(b.dataset.jgo&&j.go){j.go();return;}
  if(b.dataset.jp){j.paused=!j.paused;toast((j.title||'کار')+(j.paused?': متوقف شد':': ادامه'),'info');jobPaint();return;}
  if(b.dataset.jx){j.stop=true;j.paused=false;if(j.onCancel)try{j.onCancel();}catch(x){}toast((j.title||'کار')+' لغو شد','info');jobPaint();}
});
