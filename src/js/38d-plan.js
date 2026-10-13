/* ==================== نقشه‌ی یک‌ماهه ====================
   یک منوی جدا برای چهار هفته‌ی بعد از بررسی کل پروژه (مهر ۱۴۰۵): به‌جای ساختن قابلیت تازه، سنجیدن.
   - قوانین ثابت با وضعیت زنده (تنظیمات قفل، حداکثر ۳ تست در روز، حداکثر ۳ تست هم‌جهت، اهرم ≤۱۰)
   - کارهای هر هفته: بعضی خودشان تیک می‌خورند (از روی داده‌ی برنامه)، بقیه با دست
   - معیار قبولی، از قبل تعیین‌شده، روی کانال، تست‌های همین ماه و معامله‌های واقعی همین ماه
   هیچ بخش قبلی حذف نشده؛ این فقط مسیر یک ماه را جلوی چشم می‌گذارد. وضعیت در S.plan (در پشتیبان و همگام‌سازی). */
const PL_DAY=864e5, PL_WEEKS=4, PL_TPD=3, PL_SAME=3, PL_LEV=10;
const PL_SET={hz:'l',ex:'q05'};          // افق «بلند»، خروج لانگ «همه در +0.5R»
const plOn=()=>!!(S.plan&&S.plan.start);
const plWeek=()=>plOn()?Math.min(PL_WEEKS,Math.floor((Date.now()-S.plan.start)/(7*PL_DAY))+1):0;
const plDayN=()=>plOn()?Math.floor((Date.now()-S.plan.start)/PL_DAY)+1:0;
const plSave=()=>{DB.settings=Object.assign({},S);save();};
const plDone=id=>!!(S.plan&&S.plan.done&&S.plan.done[id]);
/* تنظیمات فعلی که قفل می‌شوند */
const plSnap=()=>({hz:rdHzK(),ex:RBEX,fs:rdFsK(),hist:rdHistD()});
const plSetOk=()=>rdHzK()===PL_SET.hz&&RBEX===PL_SET.ex&&(+S.maxLev||10)<=PL_LEV;
/* تست‌های یک روز (به وقت گوشی)، با سفارش‌های Limit منتظر */
function plTestsOn(d0){const d1=d0+PL_DAY;let n=0;
  for(const it of RB.items)if(it.k==='test'&&it.t>=d0&&it.t<d1)n++;
  for(const it of rbPend())if(it.k==='test'&&(it.ct||it.t)>=d0&&(it.ct||it.t)<d1)n++;
  return n;}
const plDay0=t=>{const d=new Date(t);d.setHours(0,0,0,0);return +d;};
/* روزهای یک بازه که قانون «حداکثر ۳ تست» رعایت شده (فقط روزهای گذشته‌ی همان هفته و امروز) */
function plDaysOk(w){const s=S.plan.start+(w-1)*7*PL_DAY,e=Math.min(Date.now(),s+7*PL_DAY);let ok=0,n=0;
  for(let d=plDay0(s);d<e;d+=PL_DAY){n++;if(plTestsOn(d)<=PL_TPD)ok++;}return {ok,n};}
/* کانال‌سنج: سیگنال‌های به‌نتیجه‌رسیده و «نیاز به بررسی» */
const PL_FIXW=['no-stop','no-entry','no-ticker','px','bad-stop','far-sl'];
function plChan(){
  let rows=[];try{rows=audRows();}catch(e){}
  const dec=rows.filter(x=>x.r&&['win','loss','exp'].includes(x.r.st)&&x.R!=null).sort((a,b)=>(a.inp.t0||0)-(b.inp.t0||0));
  const bad=rows.filter(x=>x.r&&(x.r.st==='bad'||x.r.st==='amb')).length, todo=rows.filter(x=>!x.r).length;
  return {dec,bad,todo,n:rows.length,fill:plFill(rows)};
}
/* کار «کامل کردن سیگنال‌ها»: پست‌های تصویری که عددهایشان را باید از روی چارت نوشت (یکی برای هر تصویر،
   هر چند پیگیری به آن تکیه کرده باشد) و سیگنال‌های ناقصی که «اصلاح عددها» می‌خواهند.
   هر موردی که یک بار دیده شد در S.plan.fx می‌ماند؛ پس «انجام‌شده» = دیده‌شده‌هایی که دیگر ناقص نیستند
   و سیگنال ناقص تازه فقط به کل اضافه می‌شود، نه این‌که درصد را عقب ببرد. */
function plFill(rows){
  const left=new Set();
  for(const x of rows){
    if(!x.inp.stop&&x.inp.need&&x.inp.need.id!=null)left.add('i:'+x.inp.need.id);
    else if(x.r&&x.r.st==='bad'&&PL_FIXW.includes(x.r.why))left.add('b:'+x.p.id);
  }
  if(!S.plan)return {left:left.size,done:0,total:left.size};
  const seen=new Set(S.plan.fx||[]);let add=false;
  for(const k of left)if(!seen.has(k)){seen.add(k);add=true;}
  if(add){S.plan.fx=[...seen];plSave();}
  return {left:left.size,done:seen.size-left.size,total:seen.size};
}
/* «X از Y · Z٪» برای نوار پیشرفت */
const plPct=(a,b)=>b>0?Math.round(Math.min(1,a/b)*100):0;
/* آمار معیار قبولی برای یک فهرست {t,R} */
function plStats(L){
  L=L.filter(x=>x.R!=null&&isFinite(x.R)).sort((a,b)=>a.t-b.t);
  const n=L.length;if(!n)return {n:0};
  let sum=0,pos=0,neg=0,c=0,peak=0,dd=0;const wk=new Map(),days=new Set();
  for(const x of L){sum+=x.R;if(x.R>0)pos+=x.R;else neg-=x.R;c+=x.R;if(c>peak)peak=c;dd=Math.max(dd,peak-c);
    const w=Math.floor(x.t/(7*PL_DAY));wk.set(w,(wk.get(w)||0)+x.R);days.add(plDay0(x.t));}
  const W=[...wk.values()];
  return {n,days:days.size,avg:sum/n,sum,pf:neg>0?pos/neg:(pos>0?Infinity:null),wp:W.length?W.filter(v=>v>0).length/W.length:null,dd};
}
const PL_CRIT=[['n','دست‌کم 100 معامله',s=>s.n>=100,s=>faN(s.n)],['days','در دست‌کم 30 روز',s=>s.days>=30,s=>faN(s.days)+' روز'],
  ['avg','میانگین ≥ +0.1R بعد از کارمزد',s=>s.avg>=0.1,s=>fmtR(s.avg)],['pf','ضریب سود ≥ 1.3',s=>s.pf>=1.3,s=>s.pf==null?'—':s.pf===Infinity?'∞':fmtNum(s.pf)],
  ['wp','مثبت در ≥ 60٪ هفته‌ها',s=>s.wp>=0.6,s=>s.wp==null?'—':faN(Math.round(s.wp*100))+'٪'],['dd','بیشترین افت ≤ 10R',s=>s.dd<=10,s=>fmtR(-s.dd)]];
function plCritHtml(){
  const st=S.plan.start, ch=plChan();
  const src=[['سیگنال‌های کانال (همه‌ی سنجیده‌ها)',ch.dec.map(x=>({t:x.inp.t0||0,R:x.R}))],
    ['تست‌های رادار در همین ماه',RB.items.filter(it=>it.k==='test'&&it.st!=='open'&&it.R!=null&&it.t>=st).map(it=>({t:it.t,R:it.R}))],
    ['معامله‌های واقعی در همین ماه',(DB.positions||[]).filter(p=>p.status==='closed'&&(p.closedAt||0)>=st).map(p=>{const m=posMetrics(p);return {t:p.closedAt,R:m.r};})]];
  let h='<div class="tscroll"><table class="tp xtab plcrit"><thead><tr><th>معیار</th>'+src.map(([t])=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>';
  const S0=src.map(([,L])=>plStats(L));
  for(const [k,t,f,v] of PL_CRIT)h+='<tr><td>'+t+'</td>'+S0.map(s=>s.n?'<td class="num '+(f(s)?'win':'lose')+'">'+(f(s)?'✓ ':'✗ ')+v(s)+'</td>':'<td class="num">—</td>').join('')+'</tr>';
  h+='<tr class="on"><td><b>حکم</b></td>'+S0.map(s=>{const p=s.n&&PL_CRIT.every(([,,f])=>f(s));return '<td class="num '+(p?'win':'')+'"><b>'+(s.n?(p?'قبول':'هنوز نه'):'داده نیست')+'</b></td>';}).join('')+'</tr></tbody></table></div>'+
    '<div class="hint">این معیارها از قبل تعیین شده‌اند و وسط کار عوض نمی‌شوند. پول واقعی بیشتر فقط روی منبعی که «قبول» شود.'+(ch.bad?' کانال‌سنج '+faN(ch.bad)+' سیگنال «نیاز به بررسی» دارد؛ تا کامل نشوند، عدد کانال ناقص است.':'')+'</div>';
  return h;
}
/* کارهای هر هفته: [id، کار کیست، عنوان، توضیح، خودکار: ()=>{ok,txt}|null، دکمه: [برچسب، کار]] */
function plTasks(w){
  const ch=plChan(), st=S.plan.start, ws=st+(w-1)*7*PL_DAY, dec=S.plan.dec||{};
  const daily=()=>{const d=plDaysOk(w);return {ok:d.n>=7&&d.ok===d.n,txt:faN(d.ok)+' از '+faN(d.n)+' روز ≤ '+faN(PL_TPD)+' تست'+(d.n<7?' · '+faN(7-d.n)+' روز دیگر':''),p:d.ok/7};};
  const goAud=['کانال‌سنج',()=>go('audit')], goExp=['آزمایشی',()=>{RDV='test';go('radar');}];
  const T={
    1:[['w1set','تو','تنظیمات پیشنهادی را بگذار و دو هفته دست نزن','افق «بلند» (72 ساعت)، خروج لانگ «همه در +0.5R»، سقف اهرم 10. شورت فقط برای تست.',
        ()=>({ok:plSetOk(),txt:plSetOk()?'درست است':'هنوز نه'}),['یک‌جا بگذار',plApply]],
      ['w1learn','تو','مدل را با افق «بلند» دوباره یاد بده','بعد از عوض شدن افق، یک بار «یادگیری دوباره» لازم است (خودکار شروع می‌شود؛ چند دقیقه).',
        ()=>{const ok=!!(RD.mt0&&RD.mt0>st&&rdHzK()===PL_SET.hz);
          if(!ok&&RDQ.on&&RDQ.n)return {ok,txt:'در حال یادگیری: '+faN(RDQ.done)+' از '+faN(RDQ.n)+' ارز',p:RDQ.done/RDQ.n};
          return {ok,txt:RD.mt0?'آخرین یادگیری '+ageTxt(RD.mt0):'هنوز نه'};},['بازار › کارنامه',()=>{RDV='model';go('radar');}]],
      ['w1fill','تو','سیگنال‌های ناقص کانال را کامل کن','در کانال‌سنج، فهرست «نیاز به بررسی»: برای سیگنال‌های عکسی «عددها از روی چارت» را بزن و ورود، استاپ و تارگت را وارد کن.',
        ()=>{const f=ch.fill;if(!f.total)return {ok:ch.n>0,txt:ch.n?'سیگنال ناقصی نمانده':'هنوز سیگنالی سنجیده نشده'};
          return {ok:!f.left,txt:f.left?faN(f.left)+' مانده · '+faN(f.done)+' از '+faN(f.total)+' کامل شد':'همه‌ی '+faN(f.total)+' سیگنال کامل شد',p:f.done/f.total};},goAud],
      ['w1aud','تو','کانال‌سنج › «سنجش دوباره‌ی همه»','همه‌ی پست‌ها با کندل واقعی دوباره سنجیده شوند.',
        ()=>{const ok=!!(AUDQ.at&&AUDQ.at>st);
          if(AUDQ.on&&AUDQ.n)return {ok:false,txt:'در حال سنجش: '+faN(AUDQ.done)+' از '+faN(AUDQ.n)+' سیگنال',p:AUDQ.done/AUDQ.n};
          const m=ch.n-ch.todo;return {ok,txt:(AUDQ.at?'آخرین سنجش '+ageTxt(AUDQ.at)+' · ':'')+faN(m)+' از '+faN(ch.n)+' سیگنال سنجیده',p:ch.n?m/ch.n:null};},goAud],
      ['w1send','تو','CSV کانال‌سنج و فایل پشتیبان را بفرست','CSV از کانال‌سنج، پشتیبان از تنظیمات › پشتیبان. با این‌ها کانال و معامله‌های واقعی‌ات را بررسی می‌کنم.',null,null],
      ['w1me','من','بررسی کانال: R واقعی و بهترین قاعده‌ی خروج کوتاه روی 70٪ اول سیگنال‌ها','وقتی فایل‌ها رسید. 30٪ آخر دست‌نخورده می‌ماند برای هفته‌ی 2.',null,null],
      ['w1day','تو','قوانین روزانه','حداکثر '+faN(PL_TPD)+' تست در روز و '+faN(PL_SAME)+' تست هم‌جهت باز.',daily,null],
      ['w1exp','تو','آخر هفته: «خروجی برای بررسی» تست‌ها را بفرست','',null,goExp]],
    2:[['w2me','من','آزمون قاعده‌ی کانال روی 30٪ آخر سیگنال‌ها','سیگنال‌هایی که قاعده از رویشان ساخته نشده. اگر آن‌جا هم مثبت بود، قاعده معتبر است.',null,null],
      ['w2dec','تو','تصمیم: کانال قبول یا رد','بر اساس نتیجه‌ی آزمون من.',()=>dec.ch?{ok:true,txt:dec.ch==='pass'?'قبول':'رد'}:{ok:false,txt:'هنوز تصمیم نگرفته‌ای'},null,'dec'],
      ['w2day','تو','قوانین روزانه','همان قوانین؛ تنظیمات هنوز دست نخورد.',daily,null],
      ['w2exp','تو','آخر هفته: خروجی تست‌ها و CSV تازه‌ی کانال‌سنج','',null,goExp]],
    3:dec.ch==='pass'?[
      ['w3real','تو','معامله‌ی واقعی کوچک فقط روی سیگنال‌های کانال، با همان قاعده','هدف 30 معامله تا آخر ماه. ریسک هر معامله 0.5 تا 1 دلار؛ با «ایزوله» وارد شو.',
        ()=>{const n=(DB.positions||[]).filter(p=>posSrc(p).k==='ch'&&(p.openedAt||0)>=ws).length;return {ok:n>=15,txt:faN(n)+' معامله از '+faN(15)+' (این هفته)',p:n/15};},['سیگنال‌ها',()=>go('signals')]],
      ['w3risk','تو','ریسک ثابت و حداکثر 3 پوزیشن باز','تنظیمات › سرمایه و ریسک: «ریسک هر معامله» حداکثر 1 دلار.',
        ()=>{const r=riskUsd(),o=(DB.positions||[]).filter(p=>p.status==='open').length;return {ok:r<=1&&o<=3,txt:'ریسک '+fmtUsd(r)+' · '+faN(o)+' باز'};},['تنظیمات',()=>openPanel('setVeil')]],
      ['w3day','تو','قوانین روزانه برای تست‌ها','',daily,null],
      ['w3exp','تو','آخر هفته: خروجی تست‌ها و پشتیبان','',null,goExp]]:[
      ['w3none','تو','بدون پول واقعی؛ فقط تست','کانال قبول نشده (یا هنوز تصمیم نگرفته‌ای). پول واقعی نه.',
        ()=>{const n=(DB.positions||[]).filter(p=>(p.openedAt||0)>=ws).length;return {ok:n===0,txt:n?faN(n)+' پوزیشن واقعی تازه':'بی پوزیشن واقعی تازه'};},null],
      ['w3day','تو','قوانین روزانه','',daily,null],
      ['w3exp','تو','آخر هفته: خروجی تست‌ها','',null,goExp]],
    4:[['w4crit','تو','معیار قبولی را ببین','جدول پایین صفحه، روی کانال، تست‌ها و معامله‌های واقعی همین ماه.',null,null],
      ['w4me','من','بررسی نهایی همه‌ی خروجی‌ها و پیشنهاد ماه بعد','',null,null],
      ['w4dec','تو','تصمیم نهایی','ادامه با پول بیشتر فقط اگر معیار قبولی «قبول» شد.',()=>dec.fin?{ok:true,txt:{more:'ادامه با پول بیشتر',same:'ادامه با همین اندازه',test:'فقط تست',stop:'توقف'}[dec.fin]}:{ok:false,txt:'هنوز نه'},null,'fin'],
      ['w4exp','تو','خروجی نهایی تست‌ها، CSV کانال و پشتیبان را بفرست','',null,goExp]]};
  const L=T[w]||[];
  // هفته‌ی نیامده: بررسی خودکار هنوز معنی ندارد
  return w>plWeek()?L.map(t=>t[4]&&!t[6]?Object.assign(t.slice(),{4:()=>({ok:false,txt:'هنوز نرسیده'})}):t):L;
}
const PL_WT={1:'آماده‌سازی و سنجش کانال',2:'آزمون قاعده‌ی کانال روی داده‌ی دست‌نخورده',3:'اجرای کوچک (یا فقط تست)',4:'داوری با معیار قبولی'};
/* تنظیمات پیشنهادی با یک زدن؛ افق که عوض شد مدل از نو یاد می‌گیرد */
function plApply(){
  const hzCh=rdHzK()!==PL_SET.hz;
  S.rdHz=PL_SET.hz;S.maxLev=Math.min(+S.maxLev||10,PL_LEV);
  RBEX=PL_SET.ex;try{localStorage.setItem('signaldesk.rdex',RBEX);}catch(e){}
  try{rbReplan(RBEX);}catch(e){}
  if(S.plan)S.plan.base=plSnap();
  plSave();
  toast('تنظیمات برنامه گذاشته شد'+(hzCh?' · مدل با افق «بلند» از نو یاد می‌گیرد':''),'ok');
  if(hzCh){try{if(RDQ.on)RDQ.next='learn';else rdScan('learn');}catch(e){}}
  renderAll();
}
/* قوانین ثابت با وضعیت زنده */
function plRules(){
  const today=plTestsOn(plDay0(Date.now())), L=rdOpenDir('long','test'), Sh=rdOpenDir('short','test'), b=S.plan.base, cur=plSnap();
  const ch=b&&(b.hz!==cur.hz||b.ex!==cur.ex||b.fs!==cur.fs||b.hist!==cur.hist);
  return [
    [today<=PL_TPD,'حداکثر '+faN(PL_TPD)+' تست در روز','امروز '+faN(today)],
    [L<=PL_SAME&&Sh<=PL_SAME,'حداکثر '+faN(PL_SAME)+' تست هم‌جهت باز','لانگ '+faN(L)+' · شورت '+faN(Sh)],
    [(+S.maxLev||10)<=PL_LEV,'اهرم حداکثر '+faN(PL_LEV)+'x','سقف الان '+faN(+S.maxLev||10)+'x'],
    [!ch,'تنظیمات مدل و خروج تا پایان هفته‌ی 2 عوض نشود',ch?'از شروع عوض شده':'همان است'],
    [null,'پول واقعی فقط با «قاعده‌ی پول واقعی» (یا سیگنال کانال از هفته‌ی 3، اگر قبول شد)','—'],
    [null,'بعد از یکی دو روز بد هیچ قاعده‌ای عوض نمی‌شود؛ قضاوت فقط با معیار قبولی','—']];
}
function plBannerHtml(){
  if(!plOn())return '';
  const w=plWeek(), all=plTasks(w), dn=all.filter(t=>plTaskOk(t)).length, today=plTestsOn(plDay0(Date.now()));
  return '<button class="plban" data-plgo="1">'+ic('flag')+'<span><b>نقشه · هفته‌ی '+faN(w)+' از '+faN(PL_WEEKS)+'</b> · '+faN(dn)+' از '+faN(all.length)+' کار · امروز '+faN(today)+' از '+faN(PL_TPD)+' تست</span></button>';
}
const plTaskOk=t=>{if(plDone(t[0]))return true;const a=t[4]&&t[4]();return !!(a&&a.ok);};
function renderPlan(){
  const g=$('#planBody');if(!g)return;
  let h='<div class="plan">';
  if(!plOn()){
    h+='<div class="plhero"><b>نقشه‌ی یک‌ماهه: کمتر ساختن، بیشتر سنجیدن</b>'+
      '<span>چهار هفته با کارهای روشن برای هر هفته. هدف: معلوم شود سیگنال‌های کانال بعد از کارمزد لبه دارند یا نه، و تا آن موقع پولت حفظ شود. هیچ بخشی از برنامه حذف نمی‌شود.</span>'+
      '<ol class="plwk">'+[1,2,3,4].map(w=>'<li><b>هفته‌ی '+faN(w)+'</b> · '+PL_WT[w]+'</li>').join('')+'</ol>'+
      '<button class="btn ok" data-plstart="1">'+ic('flag')+'<span>شروع از امروز</span></button></div>';
    g.innerHTML=h+'</div>';paintPlanBadge();
    g.querySelector('[data-plstart]').onclick=()=>{S.plan={start:Date.now(),done:{},dec:{},base:plSnap()};plSave();toast('نقشه شروع شد: هفته‌ی 1','ok');renderPlan();};
    return;
  }
  const w=plWeek(), d=plDayN(), end=S.plan.start+PL_WEEKS*7*PL_DAY, over=Date.now()>=end;
  h+='<div class="plhero"><b>'+(over?'ماه تمام شد · داوری':'هفته‌ی '+faN(w)+' از '+faN(PL_WEEKS)+' · '+PL_WT[w])+'</b>'+
    '<span>روز '+faN(Math.min(d,28))+' از 28 · شروع '+jStampFa(new Date(S.plan.start)).split(' ')[0]+'</span>'+
    '<span class="plbar"><i style="width:'+Math.min(100,Math.round(d/28*100))+'%"></i></span>'+
    (()=>{const L=plTasks(w),n=L.filter(plTaskOk).length;return '<span>کارهای این هفته: '+faN(n)+' از '+faN(L.length)+' · '+faN(plPct(n,L.length))+'٪</span><span class="plbar wk"><i style="width:'+plPct(n,L.length)+'%"></i></span>';})()+'</div>';
  // قوانین
  h+='<div class="sechd">قوانین ثابت این ماه</div><div class="plrules">'+plRules().map(([ok,t,s])=>'<div class="plrule '+(ok==null?'':ok?'ok':'no')+'"><i>'+(ok==null?'·':ok?'✓':'✗')+'</i><span>'+t+'</span><small>'+s+'</small></div>').join('')+'</div>';
  // کارهای هفته‌ها: هفته‌ی جاری باز، بقیه تاشو
  for(let k=1;k<=PL_WEEKS;k++){
    const L=plTasks(k), dn=L.filter(plTaskOk).length;
    h+='<details class="sec sub2 plweek'+(k===w?' cur':'')+'"'+(k===w?' open':'')+'><summary><b>هفته‌ی '+faN(k)+'</b> · '+PL_WT[k]+' <i>'+faN(dn)+'/'+faN(L.length)+'</i>'+(k<w?' <small>گذشته</small>':k>w?' <small>بعدی</small>':'')+'</summary><div class="pltasks">'+
      L.map(t=>{const [id,who,ti,ds,auto,btn,kind]=t,a=auto&&auto(),ok=plTaskOk(t),man=!auto||kind;
        return '<div class="pltask'+(ok?' ok':'')+'" data-pl="'+id+'"><button class="plchk" '+(man&&!kind?'data-pltog="'+id+'"':'disabled')+' aria-label="انجام شد">'+(ok?'✓':'')+'</button>'+
          '<div><b><span class="plwho '+(who==='من'?'me':'')+'">'+who+'</span> '+ti+'</b>'+(ds?'<small>'+ds+'</small>':'')+(a?'<small class="'+(a.ok?'win':'')+'">'+(auto&&!kind?'خودکار: ':'')+a.txt+'</small>':'')+
          (a&&a.p!=null?'<span class="plprog'+(a.ok?' ok':'')+'"><span class="plbar"><i style="width:'+plPct(a.p,1)+'%"></i></span><b>'+faN(plPct(a.p,1))+'٪</b></span>':'')+
          (kind==='dec'?'<div class="plchoice"><button class="btn sm'+((S.plan.dec||{}).ch==='pass'?' ok':'')+'" data-pldec="ch:pass">قبول</button><button class="btn sm'+((S.plan.dec||{}).ch==='fail'?' ok':'')+'" data-pldec="ch:fail">رد</button></div>':'')+
          (kind==='fin'?'<div class="plchoice">'+[['more','پول بیشتر'],['same','همین اندازه'],['test','فقط تست'],['stop','توقف']].map(([v,l])=>'<button class="btn sm'+((S.plan.dec||{}).fin===v?' ok':'')+'" data-pldec="fin:'+v+'">'+l+'</button>').join('')+'</div>':'')+
          (btn?'<div><button class="btn sm side" data-plbtn="'+id+'">'+btn[0]+'</button></div>':'')+'</div></div>';}).join('')+'</div></details>';
  }
  h+='<div class="sechd">معیار قبولی</div>'+plCritHtml();
  h+='<div class="srow"><button class="btn sm side" data-plreset="1">'+ic('undo')+'<span>از نو شروع کن</span></button></div>';
  g.innerHTML=h+'</div>';
  g.querySelectorAll('[data-pltog]').forEach(b=>b.onclick=()=>{const id=b.dataset.pltog,D=S.plan.done||(S.plan.done={});if(D[id])delete D[id];else D[id]=Date.now();plSave();renderPlan();});
  g.querySelectorAll('[data-pldec]').forEach(b=>b.onclick=()=>{const [k,v]=b.dataset.pldec.split(':'),D=S.plan.dec||(S.plan.dec={});D[k]=D[k]===v?null:v;plSave();renderPlan();});
  g.querySelectorAll('[data-plbtn]').forEach(b=>b.onclick=()=>{for(let k=1;k<=PL_WEEKS;k++){const t=plTasks(k).find(x=>x[0]===b.dataset.plbtn);if(t&&t[5]){t[5][1]();break;}}});
  const rs=g.querySelector('[data-plreset]');if(rs)rs.onclick=async()=>{if(!(await askConfirm({title:'نقشه از نو',msg:'تاریخ شروع امروز می‌شود و تیک‌ها پاک می‌شوند. داده‌ی تست‌ها و پوزیشن‌ها دست نمی‌خورد.',ok:'از نو',cancel:'نه'})))return;
    S.plan={start:Date.now(),done:{},dec:{},base:plSnap()};plSave();renderPlan();};
  paintPlanBadge();
}
function plBannerBind(g){const b=g&&g.querySelector('[data-plgo]');if(b)b.onclick=()=>go('plan');}
/* نشان تب «نقشه»: کارهای مانده‌ی هفته‌ی جاری (پیش از شروع: خالی) */
function paintPlanBadge(){
  const c=$('#cPlan');if(!c)return;let n=0;
  if(plOn())try{n=plTasks(plWeek()).filter(t=>!plTaskOk(t)).length;}catch(e){}
  c.textContent=faN(n);c.classList.toggle('z',!n);
}
