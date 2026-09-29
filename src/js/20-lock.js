/* ==================== قفل ورود ==================== */
/* صریح باشیم: این صفحه تماماً در مرورگر اجرا می‌شود، پس این یک «پرده» است نه قفل.
   جلوی کسی که گوشی را برمی‌دارد را می‌گیرد؛ جلوی کسی که سورس را باز کند نه.
   با این حال رمز را خام ذخیره نمی‌کنیم: نمک تصادفی + SHA-256، تا اگر کسی سرسری به
   حافظه‌ی مرورگر نگاه کرد رمز را نخواند. */
const LOCKKEY='signaldesk.lock.v1';
let lockBuf='', lockAwaiting=null, lastHidden=0;
const LOCK_GRACE=120000;                 // تا دو دقیقه بعد از بیرون رفتن، دوباره رمز نمی‌خواهد

const lockCfg=()=>lsGet(LOCKKEY)||null;
const hasLock=()=>{const c=lockCfg();return !!(c&&c.hash&&c.salt);};
async function pinHash(pin,salt){
  const data=new TextEncoder().encode(salt+':'+pin);
  const buf=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
const newSalt=()=>[...crypto.getRandomValues(new Uint8Array(16))]
  .map(b=>b.toString(16).padStart(2,'0')).join('');

function paintDots(){
  const d=$('#lockDots');
  d.innerHTML=Array.from({length:Math.max(4,lockBuf.length)},
    (_,i)=>'<i class="'+(i<lockBuf.length?'on':'')+'"></i>').join('');
}
function buildPad(){
  const pad=$('#lockPad');
  pad.innerHTML='';
  const add=(label,cls,fn)=>{const b=el('button',cls||null,label);b.onclick=fn;pad.appendChild(b);};
  for(const n of [1,2,3,4,5,6,7,8,9])add(faN(n),null,()=>lockPush(String(n)));
  add('پاک','wide',()=>{lockBuf='';paintDots();$('#lockMsg').textContent='';});
  add(faN(0),null,()=>lockPush('0'));
  add('تأیید','wide',lockSubmit);
}
function lockPush(d){
  if(lockBuf.length>=8)return;
  lockBuf+=d;paintDots();$('#lockMsg').textContent='';
  if(lockBuf.length>=4&&lockAwaiting&&lockAwaiting.auto)lockSubmit();
}
function lockFail(msg){
  lockBuf='';paintDots();
  $('#lockMsg').textContent=msg;
  const box=document.querySelector('.lockbox');
  box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake');
}
async function lockSubmit(){
  if(lockBuf.length<4)return lockFail('رمز دست‌کم 4 رقم است');
  const job=lockAwaiting; if(!job)return;
  const pin=lockBuf;
  if(job.mode==='verify'){
    const c=lockCfg();
    if(await pinHash(pin,c.salt)!==c.hash)return lockFail('رمز درست نیست');
    lockBuf='';paintDots();job.done();
  }else if(job.mode==='set'){
    if(!job.first){                       // بار اول: فقط نگه می‌داریم و دوباره می‌پرسیم
      job.first=pin;lockBuf='';paintDots();
      $('#lockTitle').textContent='یک بار دیگر بزن';
      $('#lockMsg').textContent='';
      return;
    }
    if(job.first!==pin){
      job.first=null;
      $('#lockTitle').textContent='رمز تازه را بزن';
      return lockFail('یکی نبودند؛ از اول');
    }
    const salt=newSalt();
    lsSet(LOCKKEY,{salt,hash:await pinHash(pin,salt),at:Date.now()});
    lockBuf='';paintDots();job.done();
  }
}
function openLock(opts){
  lockAwaiting=Object.assign({auto:false},opts);
  lockBuf='';
  $('#lockTitle').textContent=opts.title;
  $('#lockMsg').textContent='';
  $('#lockForgot').classList.toggle('hide',!opts.forgot);
  paintDots();buildPad();
  $('#lockv').classList.remove('hide');
}
function closeLock(){
  $('#lockv').classList.add('hide');
  lockAwaiting=null;lockBuf='';
}
/* در شروع، و هر بار که بعد از مدتی برمی‌گردی */
function lockGate(){
  if(!hasLock())return;
  openLock({mode:'verify',title:'رمز را وارد کن',auto:false,forgot:true,done:closeLock});
}
function wireLock(){
  $('#lockForgot').onclick=()=>{
    if(!confirm('راه دیگری برای باز کردن نیست.\n\nقفل فقط با پاک کردن همه‌ی داده‌های برنامه '+
      '(پوزیشن‌ها، تصمیم‌ها، تنظیمات) برداشته می‌شود.\n\nادامه می‌دهی؟'))return;
    if(!confirm('مطمئنی؟ اگر فایل پشتیبان JSON نداری، سوابق معاملاتت برنمی‌گردد.'))return;
    try{for(const k of Object.keys(localStorage))
      if(k.indexOf('signaldesk.')===0)localStorage.removeItem(k);}catch(e){}
    location.reload();
  };
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){lastHidden=Date.now();return;}
    if(syncOn()&&lastHidden&&Date.now()-lastHidden>30000)syncPull(true).catch(()=>{});
    if(hasLock()&&lastHidden&&Date.now()-lastHidden>LOCK_GRACE&&$('#lockv').classList.contains('hide'))
      lockGate();
  });
  const paint=()=>{
    const on=hasLock();
    $('#lockState').textContent=on?'روشن':'خاموش';
    $('#btnLockSet').textContent=on?'تغییر رمز':'گذاشتن رمز';
    $('#btnLockOff').classList.toggle('hide',!on);
  };
  $('#btnLockSet').onclick=()=>{
    const start=()=>openLock({mode:'set',first:null,title:'رمز تازه را بزن',forgot:false,
      done:()=>{closeLock();paint();toast('رمز فعال شد','ok');}});
    if(hasLock())openLock({mode:'verify',title:'اول رمز فعلی',forgot:false,done:start});
    else start();
  };
  $('#btnLockOff').onclick=()=>openLock({mode:'verify',title:'رمز فعلی را بزن',forgot:false,
    done:()=>{try{localStorage.removeItem(LOCKKEY);}catch(e){}
      closeLock();paint();toast('قفل برداشته شد','info');}});
  paint();
}

