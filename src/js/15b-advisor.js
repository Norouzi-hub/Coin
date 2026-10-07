/* ==================== مشاور: اعلان و پیشنهاد، با صدا ====================
   برنامه هر دقیقه وضعیت را می‌سنجد و هر جا کاری برای انجام دادن هست، یک «پیشنهاد» می‌دهد:
   سیگنال تازه‌ی مناسب ایزوله، رسیدن قیمت به ورود، مهلت پوزیشن، ریسک‌فری، لیکوئید پیش از استاپ،
   حد ضرر روزانه، باخت‌های پیاپی، پیگیری‌های کانال، گزارش هفتگی، هدف ماهانه و نکته‌ی روز.
   هر پیشنهاد: در «مرکز اعلان» (زنگوله‌ی بالای صفحه) می‌ماند، پیغام کوتاه، صدا (سه لحن برای سه
   اهمیت)، لرزش، و اعلان گوشی اگر اجازه داده باشی. ساعت سکوت: فقط صدا و لرزش خاموش می‌شود.
   محدودیت مرورگر: وقتی برنامه کاملاً بسته است، صفحه‌ای نیست که بسنجد؛ برای آن حالت هشدار
   تلگرامِ ورکر هست (استاپ و تارگت). تا وقتی برنامه باز یا در پس‌زمینه است، پیشنهادها می‌آیند. */

const ADVKEY='signaldesk.adv.v1';
const ADV=Object.assign({items:[],seen:{},read:0},lsGet(ADVKEY)||{});
const advSave=()=>{ADV.items=ADV.items.slice(0,120);
  const cut=Date.now()-30*864e5;for(const k in ADV.seen)if(ADV.seen[k]<cut)delete ADV.seen[k];
  lsSet(ADVKEY,ADV);};
const ADV_DEF={on:true,sound:true,vol:0.7,vib:true,quiet:'',cats:{sig:true,pos:true,risk:true,rep:true,tip:true}};
const advCfg=()=>{const c=Object.assign({},ADV_DEF,S.adv||{});c.cats=Object.assign({},ADV_DEF.cats,(S.adv||{}).cats||{});return c;};
const ADV_CAT={sig:'سیگنال',pos:'پوزیشن',risk:'ریسک',rep:'گزارش',tip:'نکته'};
const ADV_IC={sig:'trend',pos:'wallet',risk:'shield',rep:'bars',tip:'info'};

/* ---- صدا: بی‌فایل، با Web Audio (مرورگر اجازه‌ی پخش را فقط بعد از اولین لمس می‌دهد) ---- */
let ACTX=null;
function advAudio(){
  try{if(!ACTX){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ACTX=new A();}
    if(ACTX.state==='suspended')ACTX.resume();}catch(e){return null;}
  return ACTX;
}
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(advCfg().sound)advAudio();},{once:true,passive:true}));
const ADV_TONES={hi:[[880,0],[1175,0.16],[1568,0.32]],mid:[[784,0],[1046,0.14]],lo:[[660,0]]};
let BEEPAT=0;
function advBeep(pri,force){
  const c=advCfg();if(!force&&(!c.sound||advQuiet()))return;
  if(!force&&Date.now()-BEEPAT<3000)return;           // چند پیشنهادِ هم‌زمان: یک صدا، نه رگبار
  BEEPAT=Date.now();
  const a=advAudio();if(!a)return;
  const v=Math.max(0.05,Math.min(1,+c.vol||0.7))*0.25, t0=a.currentTime+0.02;
  for(const [f,dt] of ADV_TONES[pri]||ADV_TONES.mid){
    const o=a.createOscillator(), g=a.createGain();
    o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t0+dt);g.gain.exponentialRampToValueAtTime(v,t0+dt+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dt+0.42);
    o.connect(g).connect(a.destination);o.start(t0+dt);o.stop(t0+dt+0.45);
  }
}
/* ساعت سکوت به شکل «23-8» (از ۲۳ تا ۸ صبح) */
function advQuiet(){
  const m=String(advCfg().quiet||'').match(/^\s*(\d{1,2})\s*[-–تا]+\s*(\d{1,2})\s*$/);if(!m)return false;
  const a=+m[1]%24,b=+m[2]%24,h=new Date().getHours();
  return a<b?h>=a&&h<b:h>=a||h<b;
}

/* ---- اعلان گوشی: روی اندروید فقط از راه سرویس‌ورکر کار می‌کند ---- */
function sysNotify(title,body,tag,data){
  if(!canNotify())return false;
  const opt={body,tag,renotify:true,icon:'icons/icon-192.png',badge:'icons/favicon-32.png',data:data||{},vibrate:advCfg().vib&&!advQuiet()?[120,60,120]:undefined};
  if(navigator.serviceWorker&&navigator.serviceWorker.controller){
    navigator.serviceWorker.ready.then(r=>r.showNotification(title,opt)).catch(()=>{try{new Notification(title,opt);}catch(e){}});
    return true;
  }
  try{new Notification(title,opt);return true;}catch(e){return false;}
}

/* ---- پیشنهاد دادن: key جلوی تکرار را می‌گیرد؛ cool (میلی‌ثانیه) یعنی بعد از این مدت دوباره مجاز ---- */
function advise(key,o){
  const c=advCfg();
  if(!c.on||!c.cats[o.cat||'tip'])return false;
  const last=ADV.seen[key];
  if(last&&(!o.cool||Date.now()-last<o.cool))return false;
  ADV.seen[key]=Date.now();
  const it={id:uid(),key,t:Date.now(),cat:o.cat||'tip',pri:o.pri||'mid',title:o.title,body:o.body||'',act:o.act||null};
  ADV.items.unshift(it);advSave();paintBell();
  if(!o.silent){
    if(it.pri!=='lo')toast(esc(o.title),o.pri==='hi'?'ok':'info');   // نکته‌ها فقط در زنگوله، بی‌پیغام
    advBeep(it.pri);
    if(c.vib&&!advQuiet()){try{if(navigator.vibrate)navigator.vibrate(it.pri==='hi'?[160,70,160]:90);}catch(e){}}
    if(F('notify')&&(document.hidden||it.pri==='hi'))sysNotify('میز سیگنال · '+ADV_CAT[it.cat],o.title+(o.body?'\n'+o.body:''),key,{act:o.act});
  }
  return true;
}
const advUnread=()=>ADV.items.filter(x=>x.t>(ADV.read||0)).length;
function paintBell(){
  const b=$('#btnBell');if(!b)return;
  const n=advUnread();
  b.innerHTML=ic('bell')+(n?'<span class="cnt">'+faN(Math.min(99,n))+'</span>':'');
  b.setAttribute('aria-label','اعلان‌ها'+(n?' — '+n+' تازه':''));
}
/* کار هر پیشنهاد: باز کردن همان سیگنال / پوزیشن / کانال‌سنج */
function advDo(act){
  if(!act)return;
  closeSheet();
  if(act.t==='sig'){bucket='live';sigFilter='all';ACCOPEN=act.id;go('signals');
    setTimeout(()=>{const c=CARDS.get(act.id);if(c)c.scrollIntoView({behavior:'smooth',block:'center'});},300);}
  else if(act.t==='pos'){posFilter='open';POSOPEN.add(act.id);go('positions');
    setTimeout(()=>{const n=document.getElementById('pos-'+act.id);if(n)n.scrollIntoView({behavior:'smooth',block:'center'});},300);}
  else if(act.t==='pend'){posFilter='pending';go('positions');}
  else if(act.t==='view'){if(act.acc){AUDOPEN=act.acc;lsSet(AUDOPENKEY,AUDOPEN);}go(act.v);}
  else if(act.t==='set'){openPanel('setVeil');}
}
function sheetAdvice(){
  const paint=box=>{
    const L=ADV.items;
    box.innerHTML=L.length?'':'<div class="hint">هنوز پیشنهادی نیست. برنامه هر دقیقه وضعیت را می‌سنجد.</div>';
    for(const it of L.slice(0,60)){
      const r=el('div','advit p-'+it.pri+(it.t>(ADV.read||0)?' new':''));
      r.innerHTML='<i class="advic">'+ic(ADV_IC[it.cat]||'info')+'</i><div class="advb"><b>'+esc(it.title)+'</b>'+
        (it.body?'<span>'+esc(it.body)+'</span>':'')+'<small>'+ADV_CAT[it.cat]+' · '+relTime(new Date(it.t))+'</small></div>';
      if(it.act){const g=el('button','btn xs','باز کن');g.onclick=()=>advDo(it.act);r.appendChild(g);}
      box.appendChild(r);
    }
  };
  openSheet('<h3>'+ic('bell')+'اعلان‌ها و پیشنهادها</h3><div class="advlist" id="advL"></div>'+
    '<div class="srow"><button class="btn sm" id="advTest">'+ic('bell')+'<span>آزمایش صدا</span></button>'+
    '<button class="btn sm" id="advSet">'+ic('sliders')+'<span>تنظیم اعلان</span></button>'+
    '<button class="btn sm" id="advClr">پاک کردن</button><button class="btn" id="cx">بستن</button></div>',
  ()=>{
    paint($('#advL'));
    ADV.read=Date.now();advSave();paintBell();
    $('#cx').onclick=closeSheet;
    $('#advTest').onclick=()=>{advBeep('hi',true);setTimeout(()=>advBeep('mid',true),900);setTimeout(()=>advBeep('lo',true),1600);};
    $('#advSet').onclick=()=>{closeSheet();openPanel('setVeil');setTimeout(()=>{const d=document.querySelector('#setVeil details[data-sec="adv"]');if(d){d.open=true;d.scrollIntoView({block:'start'});}},250);};
    $('#advClr').onclick=()=>{ADV.items=[];advSave();paint($('#advL'));paintBell();};
  });
}

/* ==================== قانون‌های پیشنهاد ==================== */
const dayK=()=>jKey(new Date());
function advRulesFast(){
  const now=Date.now();
  // سیگنال تازه‌ی مناسب ایزوله (تا ۳ ساعت بعد از انتشار، تصمیم‌نگرفته، دیر نرسیده)
  for(const p of POSTS){
    if(!p.date||now-p.date>3*36e5)break;
    if(!isOpenSig(p)||decisionOf(p.id))continue;
    const sig=sigOf(p), ov=OVERRIDE[p.id]||{}, px=PRICES.get(sig.ticker), I=planInputsOf(p,sig,ov,px);
    if(longTermOf(p,sig,I)){advise('sig:'+p.id,{cat:'sig',pri:'lo',title:'سیگنال بلندمدت: '+(sig.ticker||'')+' — برای ایزوله‌ی کوتاه‌مدت مناسب نیست',
      body:longTermOf(p,sig,I),act:{t:'sig',id:p.id}});continue;}
    const E=I.entry||px, lt=lateOf(I,sig.targets,px);
    let body='';
    if(!I.spot&&E&&I.stop){const pl=xRulePlan(I.dir,E,I.stop,sig.targets), z=isoSize(E,pl?pl.stop:I.stop);
      if(z)body='ایزوله '+z.lev+'x · مارجین '+fmtUsd(z.margin)+(pl?' · استاپ '+fmtPrice(pl.stop)+' · هدف '+fmtPrice(pl.tp)+' · تا '+XH_FA[pl.r.h]:'');}
    const h=histLine(p).replace(/<[^>]+>/g,'');
    if(!lt)advise('sig:'+p.id,{cat:'sig',pri:'hi',title:'سیگنال تازه: '+(sig.ticker||'')+' '+(I.spot?'اسپات':I.dir==='long'?'لانگ':'شورت'),
      body:[body,h?'سابقه: '+h:''].filter(Boolean).join('\n'),act:{t:'sig',id:p.id}});
    // قیمت به ورود رسید (برای سیگنالی که منتظر برگشت به ورود بود)
    if(I.entry&&px!=null&&Math.abs(px-I.entry)/I.entry<0.002&&now-p.date>5*60000)
      advise('near:'+p.id,{cat:'sig',pri:'hi',title:(sig.ticker||'')+' به نقطه‌ی ورود رسید ('+fmtPrice(I.entry)+')',act:{t:'sig',id:p.id}});
  }
  // پوزیشن‌های باز
  for(const p of DB.positions){
    if(p.status!=='open')continue;
    const px=pxOf(p), dl=posDeadline(p);
    if(dl&&now>=dl)advise('dl:'+p.id,{cat:'pos',pri:'hi',title:p.ticker+': مهلت پوزیشن تمام شد — طبق قاعده ببند',act:{t:'pos',id:p.id}});
    else if(dl&&dl-now<30*60000)advise('dl30:'+p.id,{cat:'pos',pri:'mid',title:p.ticker+': ۳۰ دقیقه تا پایان مهلت پوزیشن',act:{t:'pos',id:p.id}});
    if(liqBeforeStop(p))advise('liq:'+p.id+':'+p.stop+':'+p.lev,{cat:'risk',pri:'hi',title:p.ticker+': لیکوئید پیش از استاپ است',body:'اهرم را کم کن یا استاپ را نزدیک‌تر بیاور.',act:{t:'pos',id:p.id}});
    if(px!=null&&p.stop&&!(+S.beAt>0)){
      const sign=p.dir==='long'?1:-1, R=Math.abs(p.entry-p.stop);
      if((p.entry-p.stop)*sign>0&&(px-p.entry)*sign>=R)
        advise('be:'+p.id,{cat:'pos',pri:'mid',title:p.ticker+' یک R در سود است — استاپ را ریسک‌فری کن',body:'استاپ هنوز زیر ورود است؛ با جابه‌جایی روی ورود، دیگر باختی در کار نیست.',act:{t:'pos',id:p.id}});
    }
    for(const f of followsFor(p))advise('fw:'+f.q.id,{cat:'pos',pri:'hi',title:'کانال درباره‌ی '+p.ticker+': '+followTag(f.f),act:{t:'pos',id:p.id}});
  }
}
function advRulesSlow(){
  const d=dayK();
  // ریسک: حد ضرر روزانه، باخت پیاپی، هم‌جهت
  const m=moneyNow(), lim=(+S.acct||0)*(+S.daily||0)/100;
  if(m&&lim>0&&m.left>0&&m.left<lim*0.25)advise('daily:'+d,{cat:'risk',pri:'hi',title:'نزدیک حد ضرر روزانه: فقط '+fmtUsd(m.left)+' مانده',body:'امروز با احتیاط؛ یا اصلاً وارد نشو.'});
  if(m&&m.left<=0)advise('dailyx:'+d,{cat:'risk',pri:'hi',title:'به حد ضرر روزانه رسیدی — امروز ورود تازه نه'});
  const lk=lossLockOn();
  if(lk)advise('lock:'+d,{cat:'risk',pri:'hi',title:faN(lk.n)+' باخت پیاپی — تا فردا استراحت',body:'قانون خودت (تنظیمات › قفل بعد از باخت پیاپی).'});
  for(const dir of ['long','short']){const n=sameDirOf(dir).length;
    if(n>=3)advise('same:'+dir+':'+n+':'+d,{cat:'risk',pri:'mid',title:faN(n)+' پوزیشن '+(dir==='long'?'لانگ':'شورت')+' هم‌زمان',body:'همه به حرکت بیت‌کوین وابسته‌اند؛ یکی را ببند یا استاپ‌ها را نزدیک کن.',act:{t:'view',v:'positions'}});}
  // گزارش هفتگی: جمعه‌ها از ساعت ۱۸
  const now=new Date();
  if(now.getDay()===5&&now.getHours()>=18)advise('week:'+d,{cat:'rep',pri:'lo',title:'گزارش هفتگی',body:weekText(weekSummary()),act:{t:'view',v:'report'}});
  // هدف ماهانه
  if(+S.goal>0){const mk=thisMonthKey(), pnl=DB.positions.filter(p=>p.status==='closed'&&p.closedAt&&monthKeyOf(p.closedAt)===mk).reduce((s,p)=>s+(posMetrics(p).pnl||0),0);
    if(pnl>=(+S.acct||0)*S.goal/100)advise('goal:'+mk,{cat:'rep',pri:'mid',title:'به هدف این ماه رسیدی 🎯',body:fmtUsd(pnl)+' — حالا حفظ سود مهم‌تر از سود بیشتر است.',act:{t:'view',v:'report'}});}
  // نکته‌ی روز از داده‌ی کانال‌سنج (یک بار در روز)
  try{
    const rows=audFilter(audRows());
    const hb=groupBy(rows,x=>Math.floor(new Date(x.inp.t0).getHours()/4)), kd=groupBy(rows,x=>sigKindOf(x.p,x.inp));
    const best=(mp,lab)=>{let b=null;for(const [k,o] of mp)if(o.n>=5&&(!b||o.r/o.n>b.o.r/b.o.n))b={k,o};return b?{t:lab(b.k),o:b.o}:null;};
    const HB=['۰ تا ۴','۴ تا ۸','۸ تا ۱۲','۱۲ تا ۱۶','۱۶ تا ۲۰','۲۰ تا ۲۴'];
    const a=best(hb,k=>'سیگنال‌های ساعت '+HB[k]), b=best(kd,k=>SIGKIND_FA[k]);
    const pick=[a,b].filter(Boolean).sort((x,y)=>y.o.r/y.o.n-x.o.r/x.o.n)[0];
    if(pick&&pick.o.r/pick.o.n>0)advise('tipd:'+d,{cat:'tip',pri:'lo',title:'نکته‌ی امروز: '+pick.t+' بهتر بوده‌اند',
      body:faN(pick.o.n)+' سیگنال، میانگین '+fmtR(pick.o.r/pick.o.n)+(xRule()?' با قاعده‌ی من':''),act:{t:'view',v:'audit',acc:'سرمایه و الگوها'}});
    // ماه اخیر کانال بدتر شد
    const mm=groupBy(rows,x=>{const p=jParts(new Date(x.inp.t0));return p.jy*100+p.jm;}), ks=[...mm.keys()].sort();
    if(ks.length>=2){const x=mm.get(ks[ks.length-1]), y=mm.get(ks[ks.length-2]);
      if(x.n>=5&&y.n>=5&&x.r/x.n<y.r/y.n-0.3)advise('chq:'+ks[ks.length-1],{cat:'tip',pri:'mid',title:'کیفیت کانال این ماه افت کرده',
        body:fmtR(x.r/x.n)+' در برابر '+fmtR(y.r/y.n)+' ماه قبل، برای هر سیگنال',act:{t:'view',v:'audit',acc:'سرمایه و الگوها'}});}
  }catch(e){}
  // راه‌اندازی: قاعده و ریسک دلاری
  if(!xRule())advise('tip:rule',{cat:'tip',pri:'lo',title:'قاعده‌ی خروج کوتاه را انتخاب کن',body:'کانال‌سنج › خروج › روی یک ردیف بزن؛ روی هر سیگنال آماده می‌آید.',act:{t:'view',v:'audit',acc:'خروج'}});
  if(!(+S.riskUsd>0))advise('tip:riskusd',{cat:'tip',pri:'lo',title:'ریسک دلاری هر معامله را مشخص کن',body:'تنظیمات › اندازه و ریسک › «ریسک هر معامله‌ی ایزوله».',act:{t:'set'}});
}
/* ---- فرم تنظیمات «اعلان و پیشنهاد» ---- */
function advApplyForm(){
  const c=advCfg();if(!$('#aOn'))return;
  $('#aOn').checked=c.on;$('#aSound').checked=c.sound;$('#aVol').value=c.vol;$('#aVib').checked=c.vib;
  $('#aSys').checked=F('notify');$('#aQuiet').value=c.quiet||'';
  $('#aCats').innerHTML=Object.entries(ADV_CAT).map(([k,v])=>'<label class="autotog"><input type="checkbox" data-cat="'+k+'"'+(c.cats[k]?' checked':'')+'><span>'+ic(ADV_IC[k])+v+'</span></label>').join('');
  $('#aCats').querySelectorAll('input').forEach(i=>i.onchange=advReadForm);
}
function advReadForm(){
  const cats={};$('#aCats').querySelectorAll('input[data-cat]').forEach(i=>cats[i.dataset.cat]=i.checked);
  S.adv={on:$('#aOn').checked,sound:$('#aSound').checked,vol:+$('#aVol').value||0.7,vib:$('#aVib').checked,
    quiet:($('#aQuiet').value||'').trim(),cats};
  DB.settings=Object.assign({},S);save();
}
function wireAdvForm(){
  if(!$('#aOn'))return;
  advApplyForm();
  ['aOn','aSound','aVol','aVib','aQuiet'].forEach(id=>$('#'+id).onchange=()=>{advReadForm();if(id==='aSound'&&$('#aSound').checked){advAudio();advBeep('mid',true);}});
  $('#aSys').onchange=()=>{S.feat.notify=$('#aSys').checked;DB.settings=Object.assign({},S);save();
    if(S.feat.notify)askNotify().then(()=>{$('#aSys').checked=F('notify');});setTimer();};
  $('#aTest').onclick=()=>{advAudio();advBeep('hi',true);setTimeout(()=>advBeep('mid',true),900);setTimeout(()=>advBeep('lo',true),1600);};
}
let ADVSLOW=0;
function adviseTick(){
  if(!BOOTED||!advCfg().on)return;
  try{advRulesFast();}catch(e){logIt('err','مشاور: '+(e&&e.message||e));}
  if(Date.now()-ADVSLOW>5*60000){ADVSLOW=Date.now();try{advRulesSlow();}catch(e){logIt('err','مشاور: '+(e&&e.message||e));}}
}
setInterval(adviseTick,60000);
