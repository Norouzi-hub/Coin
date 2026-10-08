/* ==================== دفتر رادار: معامله‌ی آزمایشی و ثبت خودکار پیشنهادها ====================
   - «تست»: هر سیگنال رادار را بی پول می‌گیری؛ مثل معامله‌ی واقعی دنبال می‌شود (هدف، استاپ، ریسک‌فری
     در +1R، حداکثر 24 ساعت، بعد از کارمزد) ولی جدا از پوزیشن‌ها و کارنامه‌ی اصلی.
   - «دفتر پیشنهادها»: هر پیشنهادی که رادار نشان می‌دهد (امتیاز 70+) خودش ثبت و دنبال می‌شود؛ آزمون
     واقعیِ آینده، تا معلوم شود ستاره‌ها در عمل راست می‌گویند یا نه.
   نتیجه از قیمت زنده (وقتی برنامه باز است) و برای زمانی که بسته بود از کندل‌های 5 دقیقه‌ای. */
const RB_KEY='signaldesk.rdbook.v1';
let RB=(()=>{const o=lsGet(RB_KEY);return o&&Array.isArray(o.items)?o:{items:[]};})();
const RBLC=new Map();let RBCU=0,RBCUON=false,RBT=null;
const rbSave=()=>lsSet(RB_KEY,RB);
const rbCost=it=>(2*(+S.fee||0)+(+S.slip||0))/100/it.sd;
/* نقشه‌ی خروج: «خودکار» = همان که رادار در آزمون بیرون از یادگیری بهتر دیده؛ یا انتخاب خودت */
let RBEX=(()=>{try{return localStorage.getItem('signaldesk.rdex')||'auto';}catch(e){return 'auto';}})();
const rbExEff=()=>RBEX!=='auto'&&RD_EXN.includes(RBEX)?RBEX:(RD.ex||'lad');
/* معامله‌های بازِ قدیمی (بی نقشه) یا وقتی نقشه عوض شد: از لحظه‌ی ورود با کندل 5 دقیقه‌ای دوباره پخش می‌شوند */
function rbReplan(ex,onlyMissing){let n=0;
  for(const it of RB.items){if(it.st!=='open'||(!onlyMissing&&it.k!=='test'))continue;if(onlyMissing&&it.x)continue;
    it.ex=it.k==='test'?(ex||rbExEff()):(RD.ex||'tp');it.x=exNew();delete it.chk;it.be=false;RBLC.delete(it.id);n++;}
  if(n){rbSave();setTimeout(()=>rbCatchUp(true),50);}
  return n;}
const rbOpen=()=>{const o={test:0,auto:0};for(const it of RB.items)if(it.st==='open')o[it.k]++;return o;};
function rbRepaint(){clearTimeout(RBT);RBT=setTimeout(()=>{try{if(view==='radar')renderRadar();}catch(e){}},400);}
function rbAdd(kind,x,quiet){
  if(!x||!x.pl)return null;
  if(RB.items.some(it=>it.k===kind&&it.st==='open'&&it.tk===x.tk&&(kind==='auto'||it.dir===x.dir))){if(!quiet)toast('همین معامله‌ی آزمایشی باز است','err');return null;}
  // سقف هم‌جهت: دفتر پیشنهادها همان قانون سنجش را دارد؛ تست با پرسیدن
  if(kind==='auto'&&RB.items.filter(it=>it.k==='auto'&&it.st==='open'&&it.dir===x.dir).length>=RD_CAP)return null;
  if(kind==='test'&&!quiet){const n=rdOpenDir(x.dir);
    if(n>=RD_CAP&&!confirm(faN(n)+' معامله‌ی '+(x.dir==='long'?'لانگ':'شورت')+' باز داری (سقف '+faN(RD_CAP)+'). ارزها با هم حرکت می‌کنند و این‌ها عملاً یک شرط‌اند. باز هم ثبت شود؟'))return null;}
  const pl=rdPlanAt(x.pl,PRICES.get(x.tk)||x.pl.E), now=Date.now();
  const it={id:kind[0]+now.toString(36)+Math.random().toString(36).slice(2,5),k:kind,tk:x.tk,dir:x.dir,t:now,E:pl.E,SL:pl.SL,TP:pl.TP,sd:pl.sd,rr:pl.rr,
    sc:x.sc,stars:x.stars||0,p:x.p!=null?+x.p.toFixed(3):null,exp:x.exp!=null?+x.exp.toFixed(3):null,reg:RD.reg||null,be:false,st:'open',why:x.why||null,
    // عکس عامل‌ها در لحظه‌ی ورود (برای بررسی بعدی در خروجی)
    pv:x.parts?Object.fromEntries(RD_FEAT.filter(k=>x.parts[k]!=null&&x.parts[k]!==0).map(k=>[k,+(+x.parts[k]).toFixed(2)])):null,
    ex:kind==='test'?rbExEff():(RD.ex||'tp'),x:exNew()};
  RB.items.push(it);RBLC.set(it.id,now);
  // اندازه‌ی حافظه: قدیمی‌ترین بسته‌های خودکار اول می‌روند
  const auto=RB.items.filter(i=>i.k==='auto'&&i.st!=='open');
  if(auto.length>400){const drop=new Set(auto.slice(0,auto.length-400).map(i=>i.id));RB.items=RB.items.filter(i=>!drop.has(i.id));}
  rbSave();
  if(!quiet)toast('ثبت شد در «آزمایشی»: '+x.tk+' '+(x.dir==='long'?'لانگ':'شورت')+' از '+fmtPrice(pl.E),'ok');
  return it;
}
/* پوزیشن رادار که فقط برای امتحان ثبت شده (در صرافی گرفته نشده) ← معامله‌ی آزمایشی با همان ورود، استاپ و زمان.
   بازها از لحظه‌ی ورود با کندل 5 دقیقه‌ای و نقشه‌ی خروج فعلی دوباره دنبال می‌شوند؛ بسته‌ها با همان قیمت خروج.
   پوزیشن از «پوزیشن‌ها» و کارنامه‌ی اصلی بیرون می‌رود. */
const rbRadarPos=()=>(DB.positions||[]).filter(p=>posSrc(p).sub==='radar');
function rbFromPos(p){
  const E=+p.entry,SL=+(p.stop0||p.stop),dir=p.dir;if(!(E>0&&SL>0)||!p.ticker)return null;
  const sd=Math.abs(E-SL)/E;if(!(sd>0))return null;
  const rr=+(S.rMul&&S.rMul[0])||1.5,sg=dir==='long'?1:-1,nt=String(p.note||''),m=nt.match(/امتیاز (\d+)/),st=nt.match(/(\d)★/);
  const it={id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),k:'test',tk:p.ticker,dir,t:p.openedAt||Date.now(),E,SL,
    TP:+(E*(1+sg*sd*rr)).toPrecision(8),sd,rr,sc:m?+m[1]:null,stars:st?+st[1]:0,p:null,exp:null,reg:RD.reg||null,be:false,st:'open',ex:rbExEff(),from:'pos'};
  if(p.status!=='open'&&+p.exitPrice>0)rbClose(it,'man',+p.exitPrice,p.closedAt||Date.now());
  RB.items.push(it);
  DB.positions=DB.positions.filter(x=>x.id!==p.id);
  for(const k in DB.decisions)if(DB.decisions[k]&&DB.decisions[k].posId===p.id)delete DB.decisions[k];
  return it;
}
function rbFromPosAll(L){
  L=(L||rbRadarPos()).slice();if(!L.length)return 0;
  const keepP=DB.positions.slice(),keepD=JSON.parse(JSON.stringify(DB.decisions)),keepR=RB.items.slice();let n=0;
  for(const p of L)if(rbFromPos(p))n++;
  if(!n)return 0;
  save();rbSave();rbReplan(null,true);renderAll();
  toastUndo(faN(n)+' پوزیشن رادار به «آزمایشی» رفت',()=>{DB.positions=keepP;DB.decisions=keepD;RB.items=keepR;save();rbSave();renderAll();});
  return n;
}
/* بعد از هر بررسی: همه‌ی پیشنهادهای امتیاز 70+ (برای هر ارز یکی در هر لحظه) */
function rbLogAuto(){let n=0;for(const x of rdList())if(x.dir!=='wait'&&x.pl&&rbAdd('auto',x,true))n++;return n;}
const rbRof=(it,px)=>(px-it.E)*(it.dir==='long'?1:-1)/(it.E*it.sd);      // قیمت ← R
const rbPx=(it,r)=>it.E*(1+(it.dir==='long'?1:-1)*it.sd*r);              // R ← قیمت
/* R الانِ یک معامله‌ی باز: بخش بسته‌شده + باقی با قیمت الان، بعد از کارمزد */
const rbLiveR=(it,px)=>it.x?exR(it.x,rbRof(it,px))-rbCost(it):rbRof(it,px)-rbCost(it);
function rbClose(it,st,px,t){
  const c=rbCost(it);
  it.st=st;it.xt=t||Date.now();it.xp=px;
  if(it.x)it.R=+((st==='time'||st==='man'?exR(it.x,rbRof(it,px)):it.x.acc)-c).toFixed(3);
  else it.R=+(st==='tp'?it.rr-c:st==='sl'?-1-c:st==='be'?-c:rbRof(it,px)-c).toFixed(3);
}
/* یک قدم با یک قیمت یا یک کندل، با نقشه‌ی خروج همان معامله (موتور مشترک با سنجش رادار) */
function rbStep(it,hi,lo,t){
  if(!it.x){it.ex=it.ex||'tp';it.x=exNew();}
  const P=rdExPlans()[it.ex]||rdExPlans().tp, s=it.dir==='long'?1:-1;
  const fav=s>0?rbRof(it,hi):rbRof(it,lo), adv=s>0?rbRof(it,lo):rbRof(it,hi);
  const k0=it.x.k;
  // خروج زمانی (مثلاً بعد از 1 ساعت): با قیمت میانه‌ی همین قدم
  if(P.tmax&&t-it.t>=P.tmax*36e5){rbClose(it,'time',(hi+lo)/2,t);return true;}
  if(exStep(it.x,P,fav,adv)){const how=it.x.how;rbClose(it,how,how==='tp'?rbPx(it,it.x.out):rbPx(it,it.x.stop),t);return true;}
  it.be=it.x.be;
  if(it.x.k>k0)it.x.at=t;                     // زمان آخرین سیو سود
  return false;
}
/* قیمت زنده (از applyPrices): فقط برای معامله‌هایی که تا همین چند دقیقه پیش دنبال شده‌اند؛ بقیه با کندل */
function rbCheck(){
  const now=Date.now();let ch=false,gap=false;
  for(const it of RB.items){if(it.st!=='open')continue;
    if(now-(RBLC.get(it.id)||0)>10*60000){gap=true;continue;}
    const px=PRICES.get(it.tk);if(!(px>0))continue;
    const sig=JSON.stringify(it.x||{});
    if(rbStep(it,px,px,now))ch=true;else if(JSON.stringify(it.x)!==sig)ch=true;
    if(it.st==='open'&&now-it.t>=AS_HOLD*36e5){rbClose(it,'time',px,now);ch=true;}
    RBLC.set(it.id,now);}
  if(ch){rbSave();rbRepaint();}
  if(gap)rbCatchUp();
}
/* وقتی برنامه بسته بود: کندل‌های 5 دقیقه‌ایِ بعد از ورود (کندلِ خودِ ورود حساب نمی‌شود) */
async function rbCatchUp(force){
  const now=Date.now();if(RBCUON||(!force&&now-RBCU<3*60000))return;
  const todo=RB.items.filter(it=>it.st==='open'&&now-(RBLC.get(it.id)||0)>10*60000);if(!todo.length)return;
  RBCU=now;RBCUON=true;let ch=false;const away=[];
  try{
    for(const it of todo){
      const M5=3e5, from=it.chk||Math.floor(it.t/M5)*M5+M5, end=it.t+AS_HOLD*36e5;
      let C;try{C=await audCandles(it.tk,'5m',from,300,true);}catch(e){continue;}
      let last=null;
      for(const k of C){if(k.t<from)continue;if(k.t>=end)break;last=k;if(rbStep(it,k.h,k.l,k.t+M5))break;}
      if(it.st!=='open'&&it.k==='test')away.push(it);
      if(it.st==='open'){
        if(last)it.chk=last.t;                  // کندل آخر شاید نیمه است: بار بعد از همان دوباره
        if(now>=end&&last&&last.t+M5>=end-M5)rbClose(it,'time',last.c,end);
        else RBLC.set(it.id,Date.now());}
      ch=true;
    }
  }finally{RBCUON=false;}
  if(ch){rbSave();rbRepaint();}
  // خلاصه‌ی آنچه در نبودِ برنامه بسته شد
  if(away.length){const r=away.reduce((a,it)=>a+(it.R||0),0);
    const msg='وقتی برنامه بسته بود '+faN(away.length)+' معامله‌ی آزمایشی بسته شد: '+away.map(it=>it.tk+' '+RB_ST[it.st]).join('، ')+' · جمع '+fmtR(r)+' ('+fmtUsd(r*riskUsd())+')';
    try{advise('rbaway:'+Date.now(),{cat:'pos',pri:'mid',title:msg})||toast(msg,'info');}catch(e){toast(msg,'info');}}
}
const RB_ST={tp:'هدف',sl:'استاپ',be:'ریسک‌فری',trail:'استاپ متحرک',time:'24 ساعت',man:'دستی',open:'باز'};
function rbSumOf(L){const n=L.length,w=L.filter(x=>x.R>0).length,r=L.reduce((s,x)=>s+x.R,0);return {n,w,r};}
function rbSumHtml(L,label){const o=rbSumOf(L);if(!o.n)return '';
  return '<div class="rbsum"><b>'+label+'</b><span>'+faN(o.n)+' بسته · '+faN(o.w)+' برد ('+faN(Math.round(o.w/o.n*100))+'٪)</span><span>جمع <b class="'+cls(o.r)+'" dir="ltr">'+fmtR(o.r)+'</b> · میانگین <b class="'+cls(o.r/o.n)+'" dir="ltr">'+fmtR(o.r/o.n)+'</b>'+
    ' · به دلار <b class="'+cls(o.r)+'" dir="ltr">'+fmtUsd(o.r*riskUsd())+'</b></span></div>';}
/* پله‌های نقشه به قیمت: «نصف در 1.234 (+1R) · …» */
function rbPlanTxt(it){
  const P=rdExPlans()[it.ex||'tp'];if(!P)return '';
  const st=P.t.map((r,i)=>(P.f[i]>=0.999?'همه':faN(Math.round(P.f[i]*100))+'٪')+' در <b dir="ltr">'+fmtPrice(rbPx(it,r))+'</b> <small dir="ltr">(+'+r+'R)</small>'+(it.x&&it.x.k>i?' ✓':''));
  return esc(P.n)+': '+(P.tmax?esc(P.d):st.join(' · ')+(P.trail?' · باقی با استاپ متحرک':''));
}
/* سود به R و دلار (دلار = R × ریسک هر معامله در تنظیمات) */
/* و درصد روی مارجین ایزوله (همان مارجینی که دکمه‌ی «ایزوله» پیشنهاد می‌کند) */
const rbRoe=(it,r)=>{const z=it&&isoSize(it.E,it.SL);return z&&z.margin>0?r*riskUsd()/z.margin*100:null;};
const rbMoney=(r,it)=>{const roe=rbRoe(it,r);return '<b class="rbm '+cls(r)+'" dir="ltr">'+fmtUsd(r*riskUsd())+'</b>'+(roe!=null?'<small class="'+cls(r)+'" dir="ltr">'+(roe>0?'+':'')+fmtNum(roe)+'%</small>':'')+'<b class="'+cls(r)+'" dir="ltr">'+fmtR(r)+'</b>';};
function rbRowHtml(it,live){
  const px=PRICES.get(it.tk), lr=it.st==='open'&&px>0?rbLiveR(it,px):null, x=it.x;
  const left=it.st==='open'?Math.max(0,it.t+AS_HOLD*36e5-Date.now()):0;
  const stopNow=it.st==='open'&&x&&x.stop>-1?(x.stop===0?'ورود (ریسک‌فری)':'<b dir="ltr">'+fmtPrice(rbPx(it,x.stop))+'</b> <small dir="ltr">(+'+fmtNum(x.stop)+'R)</small>'):null;
  return '<div class="rbrow" data-id="'+esc(it.id)+'"><div class="rbh"><b dir="ltr">'+esc(it.tk)+'</b><span class="pill '+it.dir+'">'+(it.dir==='long'?'لانگ':'شورت')+'</span>'+
    (it.sc!=null?'<small>امتیاز '+faN(it.sc)+(it.stars?' · '+faN(it.stars)+'★':'')+'</small>':'')+
    (it.st==='open'?'<span class="pill '+(x&&x.k?'win':'mut')+'">'+(x&&x.k?'سیو شد '+faN(Math.round((1-x.rem)*100))+'٪':it.be?'ریسک‌فری':'باز')+'</span>'+(lr!=null?rbMoney(lr,it):''):
      '<span class="pill '+(it.R>0?'win':'lose')+'">'+RB_ST[it.st]+'</span>'+rbMoney(it.R,it))+'</div>'+
    (it.st==='open'&&x&&x.k?'<div class="glnum">سیو شده: <b class="u" dir="ltr">'+fmtR(x.acc)+'</b> · <b class="u" dir="ltr">'+fmtUsd(x.acc*riskUsd())+'</b> (روی '+faN(Math.round((1-x.rem)*100))+'٪ حجم)</div>':'')+
    '<div class="glnum">ورود <b dir="ltr">'+fmtPrice(it.E)+'</b> · استاپ اول <b dir="ltr">'+fmtPrice(it.SL)+'</b>'+(stopNow&&x.stop>-1?' · استاپ الان '+stopNow:'')+
      (it.st==='open'?(px>0?' · الان <b dir="ltr">'+fmtPrice(px)+'</b>':'')+' · '+faN(Math.ceil(left/36e5))+' ساعت مانده':' · '+ageTxt(it.xt))+'</div>'+
    (x?'<div class="glnum rbplan">'+rbPlanTxt(it)+'</div>':'<div class="glnum">هدف <b dir="ltr">'+fmtPrice(it.TP)+'</b></div>')+
    (live?'<div class="glact">'+(it.st==='open'?'<button class="btn sm" data-rb="close">'+ic('x')+'<span>بستن با قیمت الان</span></button>':'')+
      '<button class="btn sm side" data-rb="del" title="حذف از دفتر">'+ic('trash')+'</button></div>':'')+'</div>';
}
function rbHtml(kind){
  const k=kind==='test'?'test':'auto', L=RB.items.filter(it=>it.k===k), open=L.filter(it=>it.st==='open'), done=L.filter(it=>it.st!=='open').sort((a,b)=>b.xt-a.xt);
  let h='';
  if(k==='test'){
    h+=rbSumHtml(done,'نتیجه');
    if(open.length){const px=it=>PRICES.get(it.tk),liv=open.filter(it=>px(it)>0),sum=liv.reduce((a,it)=>a+rbLiveR(it,px(it)),0);
      h+='<div class="rbsum"><b>بازها الان</b><span>'+faN(open.length)+' معامله · جمع <b class="'+cls(sum)+'" dir="ltr">'+fmtR(sum)+'</b> · به دلار <b class="'+cls(sum)+'" dir="ltr">'+fmtUsd(sum*riskUsd())+'</b></span>'+
        '<button class="btn sm" data-rb="closeall">'+ic('x')+'<span>بستن همه با قیمت الان</span></button></div>';}
    {const P=rbRadarPos(),po=P.filter(p=>p.status==='open').length;
      if(P.length)h+='<div class="rdwarn rbfp"><span><b>'+faN(P.length)+' پوزیشن رادار</b> در «پوزیشن‌ها» ثبت شده'+(po?' ('+faN(po)+' باز)':'')+'. اگر این‌ها را در صرافی <b>نگرفته‌ای</b> و فقط برای امتحان بودند، بیاورشان این‌جا تا کارنامه‌ی واقعی‌ات قاطی نشود؛ دنبال کردنشان از لحظه‌ی ورود ادامه پیدا می‌کند.</span>'+
        '<button class="btn sm" data-rb="frompos">'+ic('undo')+'<span>انتقال به آزمایشی</span></button></div>';}
    if(L.length)h+='<div class="srow rbtop"><button class="btn sm ok" data-rbl="dl" title="همه‌ی تست‌ها با مسیر واقعی قیمت، عامل‌های لحظه‌ی ورود و خلاصه‌ی مدل">'+ic('down')+'<span>خروجی برای بررسی</span></button>'+
      '<button class="btn sm side" data-rbl="copy">'+ic('share')+'<span>کپی</span></button></div>';
    h+='<details class="sec sub2 rbexw"><summary>نقشه‌ی خروج: '+esc(rdExPlans()[rbExEff()].n)+(RBEX==='auto'?' (خودکار)':'')+'</summary>'+rbExPicker()+'</details>';
    h+=rbLabHtml();
    if(open.length)h+='<div class="sechd">باز ('+faN(open.length)+')</div>'+open.map(it=>rbRowHtml(it,true)).join('');
    if(done.length)h+='<div class="sechd">بسته</div>'+done.slice(0,40).map(it=>rbRowHtml(it,true)).join('');
    if(!L.length)h+='<div class="empty">هنوز معامله‌ی آزمایشی نداری. در «سیگنال‌ها» روی <b>تست</b> هر سیگنال بزن.</div>';
    h+='<div class="hint">معامله‌ی آزمایشی مثل واقعی دنبال می‌شود (پله‌های سیو سود، استاپ، حداکثر 24 ساعت، بعد از کارمزد) ولی پولی در کار نیست و در پوزیشن‌ها و کارنامه‌ی اصلی نمی‌آید؛ حتی وقتی برنامه بسته است با کندل 5 دقیقه‌ای دنبال می‌شود. '+
      'دلار با ریسک هر معامله‌ی تنظیمات ('+fmtUsd(riskUsd())+') حساب می‌شود. حداکثر '+faN(RD_CAP)+' تست هم‌جهت باز (بیشترش را می‌پرسد).</div>';
    if(done.length)h+='<div class="glact"><button class="btn sm side" data-rb="clear">'+ic('trash')+'<span>پاک کردن همه‌ی بسته‌ها</span></button></div>';
    return h;
  }
  h+='<div class="hint">هر پیشنهاد رادار (امتیاز '+faN(RD_MIN)+'+) از لحظه‌ای که نشان داده شد خودش ثبت و دنبال می‌شود؛ برای هر ارز یکی در هر لحظه. این آزمون واقعیِ <b>آینده</b> است: '+
    'کارنامه از گذشته می‌گوید چه باید بشود، این‌جا می‌بینی چه شد.</div>';
  if(!done.length)h+='<div class="empty">هنوز پیشنهادی بسته نشده'+(open.length?' ('+faN(open.length)+' باز)':'')+'. چند روز بعد این‌جا معلوم می‌شود ستاره‌ها راست می‌گویند یا نه.</div>';
  else{
    const grp=[['3 ستاره و بیشتر',x=>x.stars>=3],['1 و 2 ستاره',x=>x.stars>=1&&x.stars<3],['نمونه‌ی کم',x=>!x.stars]];
    h+='<table class="rdtab rblog"><thead><tr><th></th><th>در عمل</th><th>کارنامه گفته بود</th></tr></thead><tbody>'+grp.map(([t,f])=>{const G=done.filter(f);if(!G.length)return '';
      const o=rbSumOf(G),E=G.filter(x=>x.exp!=null),e=E.length?E.reduce((s,x)=>s+x.exp,0)/E.length:null;
      return '<tr><td>'+t+'</td><td><b class="'+cls(o.r/o.n)+'" dir="ltr">'+fmtR(o.r/o.n)+'</b><small>'+faN(Math.round(o.w/o.n*100))+'٪ برد</small><small class="n">'+faN(o.n)+' بار</small></td><td>'+
        (e!=null?'<b class="'+cls(e)+'" dir="ltr">'+fmtR(e)+'</b>':'<small>—</small>')+'</td></tr>';}).join('')+'</tbody></table>';
    for(const d of ['long','short']){const G=done.filter(x=>x.dir===d);if(G.length)h+=rbSumHtml(G,d==='long'?'لانگ‌ها':'شورت‌ها');}
  }
  if(open.length)h+='<details class="sec sub2"><summary>باز ('+faN(open.length)+')</summary>'+open.map(it=>rbRowHtml(it,false)).join('')+'</details>';
  if(done.length)h+='<details class="sec sub2"><summary>آخرین بسته‌ها</summary>'+done.slice(0,30).map(it=>rbRowHtml(it,false)).join('')+'</details>';
  return h;
}
function rbBind(g){
  rbLabBind(g);
  g.querySelectorAll('[data-rbex]').forEach(b=>b.onclick=()=>{RBEX=b.dataset.rbex;try{localStorage.setItem('signaldesk.rdex',RBEX);}catch(e){}
    const n=rbReplan(rbExEff());paintRadar(g);toast('نقشه‌ی خروج: '+rdExPlans()[rbExEff()].n+(n?' · '+faN(n)+' معامله‌ی باز دوباره حساب می‌شود':''),'ok');});
  g.querySelectorAll('[data-rb]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.rb;
    if(a==='closeall'){const L=RB.items.filter(it=>it.k==='test'&&it.st==='open'&&PRICES.get(it.tk)>0);
      if(!L.length)return;if(!confirm(faN(L.length)+' معامله‌ی آزمایشیِ باز با قیمت الان بسته شود؟'))return;
      for(const it of L)rbClose(it,'man',PRICES.get(it.tk));rbSave();paintRadar(g);toast(faN(L.length)+' معامله بسته شد','ok');return;}
    if(a==='frompos'){const P=rbRadarPos();if(!P.length)return;
      if(!confirm(faN(P.length)+' پوزیشن رادار ('+P.map(p=>p.ticker+' '+(p.dir==='long'?'لانگ':'شورت')).join('، ')+') از «پوزیشن‌ها» و کارنامه بیرون برود و در «آزمایشی» دنبال شود؟\n\nفقط وقتی که در صرافی واقعاً نگرفته‌ای.'))return;
      rbFromPosAll(P);paintRadar(g);return;}
    if(a==='clear'){const keep=RB.items;RB.items=RB.items.filter(it=>it.k!=='test'||it.st==='open');rbSave();paintRadar(g);toastUndo('بسته‌های آزمایشی پاک شد',()=>{RB.items=keep;rbSave();paintRadar(g);});return;}
    const row=b.closest('[data-id]'), it=row&&RB.items.find(x=>x.id===row.dataset.id);if(!it)return;
    if(a==='close'){const px=PRICES.get(it.tk);if(!(px>0)){toast('قیمت الان معلوم نیست','err');return;}rbClose(it,'man',px);}
    if(a==='del'){const keep=RB.items.slice();RB.items=RB.items.filter(x=>x!==it);rbSave();paintRadar(g);toastUndo('حذف شد',()=>{RB.items=keep;rbSave();paintRadar(g);});return;}
    rbSave();paintRadar(g);});
}
/* انتخاب نقشه‌ی خروج با نتیجه‌ی سنجش هر کدام (بیرون از یادگیری) */
function rbExPicker(){
  const PL=rdExPlans(), eff=rbExEff(), S0=RD.exs||{};
  const m=n=>{const o=S0[n]&&S0[n].all;return o&&o.n?' <small dir="ltr" class="'+cls(o.r/o.n)+'">'+fmtR(o.r/o.n)+'</small>':'';};
  return '<div class="rbex"><div class="pbpick">'+
    '<button class="pbc'+(RBEX==='auto'?' on':'')+'" data-rbex="auto">خودکار'+(RD.ex?' ('+esc(PL[RD.ex].n)+')':'')+'</button>'+
    RD_EXN.map(n=>'<button class="pbc'+(RBEX===n?' on':'')+'" data-rbex="'+n+'" title="'+esc(PL[n].d)+'">'+esc(PL[n].n)+m(n)+'</button>').join('')+'</div>'+
    '<div class="hint">'+esc(PL[eff].d)+'. عدد کنار هر نقشه: میانگین R همان سیگنال‌های رادار با آن نقشه، روی دوره‌ای که مدل ندیده. «خودکار» بهترینش را برمی‌دارد. با عوض کردن نقشه، معامله‌های باز هم از لحظه‌ی ورود با نقشه‌ی تازه دوباره حساب می‌شوند.</div></div>';
}
// معامله‌های بازی که پیش از نقشه‌ی خروج ثبت شده‌اند: یک بار با نقشه‌ی فعلی از لحظه‌ی ورود دوباره حساب می‌شوند
setTimeout(()=>{try{rbReplan(null,true);}catch(e){}},1500);
