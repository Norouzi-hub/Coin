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
/* هزینه‌ی معامله‌ی آزمایشی (به R): همان مدل سنجش — ورود و هدف‌ها با Limit (میکر)، بقیه با مارکت و لغزش */
const rbCost=(it,st)=>exCost(it.x||{tpf:st==='tp'?1:0},it.sd);
/* نقشه‌ی خروج: «خودکار» = همان که رادار در آزمون بیرون از یادگیری بهتر دیده؛ یا انتخاب خودت */
let RBEX=(()=>{try{return localStorage.getItem('signaldesk.rdex')||'auto';}catch(e){return 'auto';}})();
/* «خودکار» برای هر جهت جدا (RD.exD)؛ مدلِ قدیمی بی exD همان یکی را برای هر دو دارد */
const rdExAuto=d=>(d&&RD.exD&&RD.exD[d])||RD.ex||'lad';
const rbExEff=d=>RBEX!=='auto'&&RD_EXN.includes(RBEX)?RBEX:rdExAuto(d);
/* متن کوتاه نقشه‌ی خروج: یکی، یا «لانگ X · شورت Y» وقتی دو جهت فرق دارند */
function rbExTxt0(){const P=rdExPlans(),l=rdExAuto('long'),s=rdExAuto('short');return l===s?esc(P[l].n):'لانگ '+esc(P[l].n)+' · شورت '+esc(P[s].n);}
function rbExTxt(){const P=rdExPlans(),l=rbExEff('long'),s=rbExEff('short');
  return l===s?esc(P[l].n):'لانگ '+esc(P[l].n)+' · شورت '+esc(P[s].n);}
/* معامله‌های بازِ قدیمی (بی نقشه) یا وقتی نقشه عوض شد: از لحظه‌ی ورود با کندل 5 دقیقه‌ای دوباره پخش می‌شوند */
function rbReplan(ex,onlyMissing){let n=0;
  for(const it of RB.items){if(it.st!=='open'||(!onlyMissing&&it.k!=='test'))continue;if(onlyMissing&&it.x)continue;
    it.ex=it.k==='test'?(ex||rbExEff(it.dir)):(RD.exD&&RD.exD[it.dir]||RD.ex||'tp');it.x=exNew();delete it.chk;it.be=false;RBLC.delete(it.id);n++;}
  if(n){rbSave();setTimeout(()=>rbCatchUp(true),50);}
  return n;}
const rbOpen=()=>{const o={test:0,auto:0};for(const it of RB.items)if(it.st==='open')o[it.k]++;return o;};
function rbRepaint(){clearTimeout(RBT);RBT=setTimeout(()=>{try{if(view==='radar')renderRadar();}catch(e){}},400);}
function rbAdd(kind,x,quiet){
  if(!x||!x.pl)return null;
  // برای هر ارز فقط یک معامله‌ی باز (مثل سنجش رادار)؛ لانگ و شورتِ هم‌زمانِ یک ارز همدیگر را خنثی می‌کنند
  {const o=RB.items.find(it=>it.k===kind&&it.st==='open'&&it.tk===x.tk);
    if(o){if(!quiet)toast(o.dir===x.dir?'همین معامله‌ی آزمایشی باز است':'تست '+(o.dir==='long'?'لانگ':'شورت')+'ِ '+x.tk+' باز است؛ برای هر ارز یک تست باز. اول آن را ببند','err');return null;}}
  // سقف هم‌جهت: دفتر پیشنهادها همان قانون سنجش را دارد؛ تست با پرسیدن
  if(kind==='auto'&&RB.items.filter(it=>it.k==='auto'&&it.st==='open'&&it.dir===x.dir).length>=RD_CAP)return null;
  if(kind==='auto'&&x.why==='cost')return null;
  const pl=rdPlanAt(x.pl,PRICES.get(x.tk)||x.pl.E), now=Date.now();
  const it={id:kind[0]+now.toString(36)+Math.random().toString(36).slice(2,5),k:kind,tk:x.tk,dir:x.dir,t:now,E:pl.E,SL:pl.SL,TP:pl.TP,sd:pl.sd,rr:pl.rr,
    sc:x.sc,stars:x.stars||0,p:x.p!=null?+x.p.toFixed(3):null,exp:x.exp!=null?+x.exp.toFixed(3):null,reg:RD.reg||null,be:false,st:'open',why:x.why||null,
    // عکس عامل‌ها در لحظه‌ی ورود (برای بررسی بعدی در خروجی)
    pv:x.parts?Object.fromEntries(RD_FEAT.filter(k=>x.parts[k]!=null&&x.parts[k]!==0).map(k=>[k,+(+x.parts[k]).toFixed(2)])):null,
    ex:kind==='test'?rbExEff(x.dir):(RD.exD&&RD.exD[x.dir]||RD.ex||'tp'),x:exNew()};
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
/* پوزیشن‌های رادار که گفته‌ای واقعی‌اند (در صرافی گرفته‌ای): دیگر پیشنهاد انتقال برایشان نمی‌آید */
let RBREAL=(()=>{try{return new Set(JSON.parse(localStorage.getItem('signaldesk.rdreal')||'[]'));}catch(e){return new Set();}})();
const rbRealSave=()=>{try{localStorage.setItem('signaldesk.rdreal',JSON.stringify([...RBREAL]));}catch(e){}};
const rbRadarAsk=()=>rbRadarPos().filter(p=>!RBREAL.has(p.id));
/* یک فهرست تیک‌دار از همه‌ی پوزیشن‌های رادار: تیک یعنی «امتحانی بود، به تست‌ها برود»؛ بی تیک یعنی «واقعی است» */
function sheetRadarToTest(after){
  const P=rbRadarPos().sort((a,b)=>(b.openedAt||0)-(a.openedAt||0));
  if(!P.length){toast('پوزیشن رادار نداری','info');return;}
  const row=p=>{const m=posMetrics(p,p.status==='open'?pxOf(p):undefined);
    return '<label class="rbfr"><input type="checkbox" data-id="'+esc(p.id)+'"'+(RBREAL.has(p.id)?'':' checked')+'>'+
      '<b dir="ltr">'+esc(p.ticker||'')+'</b><span class="pill '+p.dir+'">'+(p.dir==='long'?'لانگ':'شورت')+'</span>'+
      '<span class="pill '+(p.status==='open'?'open':'mut')+'">'+(p.status==='open'?'باز':'بسته')+'</span>'+
      '<small>'+(p.openedAt?relTime(new Date(p.openedAt)):'')+'</small>'+
      (m.pnl!=null?'<b class="'+cls(m.pnl)+'" dir="ltr">'+fmtUsd(m.pnl)+'</b>':'')+'</label>';};
  openSheet('<h3>'+ic('undo')+'پوزیشن‌های رادار ← تست‌ها</h3>'+
    '<div class="hint">تیک‌خورده‌ها از «پوزیشن‌ها» و کارنامه‌ی واقعی بیرون می‌روند و در «بازار ← آزمایشی» از لحظه‌ی ورود دنبال می‌شوند (بسته‌ها با همان قیمت خروج). '+
    'تیکِ آن‌هایی را که <b>واقعاً در صرافی گرفته‌ای</b> بردار؛ آن‌ها همین‌جا می‌مانند و دیگر پرسیده نمی‌شوند.</div>'+
    '<div class="srow rbfa"><button class="btn xs" data-all="1">همه</button><button class="btn xs" data-all="0">هیچ‌کدام</button></div>'+
    '<div class="rbfl">'+P.map(row).join('')+'</div>'+
    '<div class="srow"><button class="btn ok" id="rbfGo">'+ic('undo')+'<span>انتقال</span></button><button class="btn" id="cx">بستن</button></div>',
  sh=>{const boxes=[...sh.querySelectorAll('.rbfl input')],go=sh.querySelector('#rbfGo');
    const upd=()=>{const n=boxes.filter(b=>b.checked).length;go.querySelector('span').textContent=n?'انتقال '+faN(n)+' پوزیشن به تست‌ها':'ذخیره (همه واقعی‌اند)';};
    boxes.forEach(b=>b.onchange=upd);upd();
    sh.querySelectorAll('[data-all]').forEach(b=>b.onclick=()=>{boxes.forEach(x=>x.checked=b.dataset.all==='1');upd();});
    sh.querySelector('#cx').onclick=closeSheet;
    go.onclick=()=>{const sel=new Set(boxes.filter(b=>b.checked).map(b=>b.dataset.id));
      for(const b of boxes)if(!b.checked)RBREAL.add(b.dataset.id);else RBREAL.delete(b.dataset.id);rbRealSave();
      closeSheet();const L=P.filter(p=>sel.has(p.id));
      if(L.length)rbFromPosAll(L);else{toast('همه واقعی ماندند','info');renderAll();}
      if(after)after();};});
}
function rbFromPos(p){
  const E=+p.entry,SL=+(p.stop0||p.stop),dir=p.dir;if(!(E>0&&SL>0)||!p.ticker)return null;
  const sd=Math.abs(E-SL)/E;if(!(sd>0))return null;
  const rr=+(S.rMul&&S.rMul[0])||1.5,sg=dir==='long'?1:-1,nt=String(p.note||''),m=nt.match(/امتیاز (\d+)/),st=nt.match(/(\d)★/);
  const it={id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),k:'test',tk:p.ticker,dir,t:p.openedAt||Date.now(),E,SL,
    TP:+(E*(1+sg*sd*rr)).toPrecision(8),sd,rr,sc:m?+m[1]:null,stars:st?+st[1]:0,p:null,exp:null,reg:RD.reg||null,be:false,st:'open',ex:rbExEff(dir),from:'pos'};
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
/* «تست» از کارت رادار: اگر سقف هم‌جهت پر است، اول با پنجره‌ی خودمان می‌پرسد */
async function rbAddAsk(x){
  if(!x)return null;
  const n=rdOpenDir(x.dir,'test'),dn=x.dir==='long'?'لانگ':'شورت';
  if(n>=RD_CAP&&!(await askConfirm({title:faN(n)+' تست '+dn+' باز داری',msg:'سقف '+faN(RD_CAP)+' معامله‌ی هم‌جهت است. ارزها با هم بالا و پایین می‌روند و این‌ها عملاً یک شرط بزرگ‌اند؛ یک ریزش همه را با هم استاپ می‌زند.',
    ok:'باز هم ثبت کن',cancel:'نه، صبر می‌کنم'})))return null;
  return rbAdd('test',x);
}
/* بعد از هر بررسی: همه‌ی پیشنهادهای امتیاز 70+ (برای هر ارز یکی در هر لحظه) */
function rbLogAuto(){let n=0;for(const x of rdList())if(x.dir!=='wait'&&x.pl&&rbAdd('auto',x,true))n++;return n;}
const rbRof=(it,px)=>(px-it.E)*(it.dir==='long'?1:-1)/(it.E*it.sd);      // قیمت ← R
const rbPx=(it,r)=>it.E*(1+(it.dir==='long'?1:-1)*it.sd*r);              // R ← قیمت
/* R الانِ یک معامله‌ی باز: بخش بسته‌شده + باقی با قیمت الان، بعد از کارمزد */
const rbLiveR=(it,px)=>it.x?exR(it.x,rbRof(it,px))-rbCost(it):rbRof(it,px)-rbCost(it);
function rbClose(it,st,px,t){
  const c=rbCost(it,st);
  it.st=st;it.xt=t||Date.now();it.xp=px;
  if(it.x)it.R=+((st==='time'||st==='man'?exR(it.x,rbRof(it,px)):it.x.acc)-c).toFixed(3);
  else it.R=+(st==='tp'?it.rr-c:st==='sl'?-1-c:st==='be'?-c:rbRof(it,px)-c).toFixed(3);
}
/* یک قدم با یک قیمت یا یک کندل، با نقشه‌ی خروج همان معامله (موتور مشترک با سنجش رادار) */
/* c: قیمت بسته شدن (کندل 5 دقیقه‌ای)؛ برای «استاپ با بسته شدن کندل» فقط کندلی که ساعت را می‌بندد حساب است.
   با قیمت زنده (بی c)، آخرین قیمتِ پیش از رسیدن ساعت جای بسته شدن کندل یک‌ساعته را می‌گیرد. */
function rbStep(it,hi,lo,t,c){
  if(!it.x){it.ex=it.ex||'tp';it.x=exNew();}
  const P=rdExPlans()[it.ex]||rdExPlans().tp, s=it.dir==='long'?1:-1;
  const fav=s>0?rbRof(it,hi):rbRof(it,lo), adv=s>0?rbRof(it,lo):rbRof(it,hi);
  let cl=null,bar=null;
  if(P.cs){if(c!=null){if(t%36e5===0)cl=rbRof(it,c);}
    else{const h=Math.floor(t/36e5);if(it.x.lh!=null&&h>it.x.lh&&it.x.lp>0)cl=rbRof(it,it.x.lp);it.x.lh=h;it.x.lp=(hi+lo)/2;}}
  // SAR: بیشترین/کمترین R هر ساعت جمع می‌شود و با بسته شدن ساعت یک قدم SAR برمی‌دارد (مثل سنجش روی کندل یک‌ساعته)
  if(P.sar){const x=it.x,h=c!=null?Math.floor((t-1)/36e5):Math.floor(t/36e5);
    if(x.bf==null||x.bh==null||h>x.bh){if(x.bf!=null&&x.bh!=null&&h>x.bh)bar={f:x.bf,a:x.ba};x.bh=h;x.bf=fav;x.ba=adv;}
    else{x.bf=Math.max(x.bf,fav);x.ba=Math.min(x.ba,adv);}
    if(c!=null&&t%36e5===0){bar={f:x.bf,a:x.ba};x.bf=null;x.ba=null;}}
  const k0=it.x.k;
  // خروج زمانی (مثلاً بعد از 1 ساعت): با قیمت میانه‌ی همین قدم
  if(P.tmax&&t-it.t>=P.tmax*36e5){rbClose(it,'time',(hi+lo)/2,t);return true;}
  if(exStep(it.x,P,fav,adv,cl,bar)){rbClose(it,it.x.how,rbPx(it,it.x.out),t);return true;}
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
  RBCU=now;RBCUON=true;let ch=false,nd=0;const away=[];
  jobSet('rbcu',{title:'دنبال کردن تست‌ها با کندل 5 دقیقه‌ای',pause:true,cancel:true,pct:()=>nd/todo.length*100,msg:()=>faN(nd)+' از '+faN(todo.length),
    go:()=>{RDV='test';if(view==='radar')renderRadar();else go('radar');}});
  try{
    for(const it of todo){
      if(!(await jobGate('rbcu')))break;nd++;
      const M5=3e5, from=it.chk||Math.floor(it.t/M5)*M5+M5, end=it.t+AS_HOLD*36e5;
      let C;try{C=await audCandles(it.tk,'5m',from,300,true,it.E);}catch(e){continue;}
      let last=null;
      for(const k of C){if(k.t<from)continue;if(k.t>=end)break;last=k;if(rbStep(it,k.h,k.l,k.t+M5,k.c))break;}
      if(it.st!=='open'&&it.k==='test')away.push(it);
      if(it.st==='open'){
        if(last)it.chk=last.t;                  // کندل آخر شاید نیمه است: بار بعد از همان دوباره
        if(now>=end&&last&&last.t+M5>=end-M5)rbClose(it,'time',last.c,end);
        else RBLC.set(it.id,Date.now());}
      ch=true;
    }
  }finally{RBCUON=false;jobEnd('rbcu');}
  if(ch){rbSave();rbRepaint();}
  // خلاصه‌ی آنچه در نبودِ برنامه بسته شد
  if(away.length){const r=away.reduce((a,it)=>a+(it.R||0),0);
    const msg='وقتی برنامه بسته بود '+faN(away.length)+' معامله‌ی آزمایشی بسته شد: '+away.map(it=>it.tk+' '+RB_ST[it.st]).join('، ')+' · جمع '+fmtR(r)+' ('+fmtUsd(rbUsd(away))+')';
    try{advise('rbaway:'+Date.now(),{cat:'pos',pri:'mid',title:msg})||toast(msg,'info');}catch(e){toast(msg,'info');}}
}
const RB_ST={tp:'هدف',sl:'استاپ',be:'ریسک‌فری',trail:'استاپ متحرک',time:'24 ساعت',man:'دستی',open:'باز'};
/* سر زدن به «آزمایشی»: تستی که از آخرین بار تازه باز یا بسته شده، نشان «تازه» می‌گیرد.
   زمان آخرین سر زدن موقع رفتن از این صفحه (یا پنهان شدن برنامه) ذخیره می‌شود؛ تا وقتی این‌جایی، نشان‌ها می‌مانند. */
const RBSEEN_KEY='signaldesk.rbseen', RBVIS={on:false,prev:0};
const rbSeen=()=>{try{return +localStorage.getItem(RBSEEN_KEY)||0;}catch(e){return 0;}};
const rbSeenSet=()=>{try{localStorage.setItem(RBSEEN_KEY,String(Date.now()));}catch(e){}};
function rbEnter(){if(RBVIS.on||view!=='radar')return;RBVIS.on=true;RBVIS.prev=rbSeen();rbSeenSet();}
function rbLeave(){if(!RBVIS.on)return;RBVIS.on=false;rbSeenSet();}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&RBVIS.on)rbSeenSet();});
/* 'closed' = از آخرین سر زدن بسته شده؛ 'opened' = از آخرین سر زدن باز شده؛ بار اول هیچ‌کدام تازه نیست */
const rbNewOf=it=>{const s=RBVIS.on?RBVIS.prev:rbSeen();if(!(s>0))return null;
  return it.st!=='open'?(it.xt>s?'closed':null):(it.t>s?'opened':null);};
const rbNewN=()=>{const s=rbSeen();return s>0?RB.items.filter(it=>it.k==='test'&&(it.st!=='open'?it.xt>s:it.t>s)).length:0;};
/* «اگر نگه داشته بودیم»: از لحظه‌ی ورود تا الان با کندل یک‌ساعته، بی هدف و بی سیو سود.
   الان، بهترین و بدترین جا، و این‌که استاپ اول کِی می‌خورد. فقط با درخواست؛ نتیجه تا بستن برنامه می‌ماند. */
const RBHOLD=new Map();
async function rbHoldCalc(it){
  const H=36e5, h0=Math.floor(it.t/H)*H, hrs=Math.ceil((Date.now()-h0)/H)+1;
  // بیش از 40 روز: کندل 4 ساعته نداریم، پس فقط 1000 ساعت آخر (بهترین/بدترین از همان)
  const from=hrs>1000?Math.floor((Date.now()-999*H)/H)*H:h0;
  const C=await audCandles(it.tk,'1h',from,1000,true,hrs>1000?null:it.E);
  const L=C.filter(k=>k.t>=h0+H);           // کندلِ ساعتِ ورود بخشی از قبل از ورود را دارد
  const px=PRICES.get(it.tk)>0?PRICES.get(it.tk):(C.length?C[C.length-1].c:null);if(!(px>0))throw new Error('nopx');
  const s=it.dir==='long'?1:-1;let best=-Infinity,worst=Infinity,bt=null,wt=null,stopAt=null;
  for(const k of L){const f=rbRof(it,s>0?k.h:k.l),a=rbRof(it,s>0?k.l:k.h);
    if(f>best){best=f;bt=k.t;}if(a<worst){worst=a;wt=k.t;}
    if(stopAt==null&&a<=-1)stopAt=k.t;}
  const c=exCost({tpf:0},it.sd);
  const o={at:Date.now(),px,r:+(rbRof(it,px)-c).toFixed(3),best:isFinite(best)?+(best-c).toFixed(3):null,worst:isFinite(worst)?+(worst-c).toFixed(3):null,bt,wt,stopAt,part:hrs>1000};
  RBHOLD.set(it.id,o);return o;
}
function rbHoldHtml(it){const o=RBHOLD.get(it.id);if(!o)return '';
  const act=it.st!=='open'?it.R:null, d=act!=null?o.r-act:null, hrs=t=>faN(Math.max(0,Math.round((t-it.t)/36e5)))+' ساعت بعد از ورود';
  return '<div class="rbhold"><div><b>اگر نگه داشته بودیم</b> <small>(بی هدف و بی سیو سود، قیمت الان <b dir="ltr">'+fmtPrice(o.px)+'</b>، '+ageTxt(o.at)+')</small></div>'+
    '<div>الان: '+rbMoney(o.r,it)+(d!=null?' · نسبت به نتیجه‌ی واقعی <b class="'+cls(d)+'" dir="ltr">'+fmtR(d)+'</b> <small>('+(d>0.05?'نگه داشتن بهتر بود':d<-0.05?'بستن بهتر بود':'فرقی نکرد')+')</small>':'')+'</div>'+
    (o.best!=null?'<div class="glnum">بهترین جا <b class="'+cls(o.best)+'" dir="ltr">'+fmtR(o.best)+'</b> <small dir="ltr">'+fmtUsd(o.best*rbUsdR(it))+'</small> ('+hrs(o.bt)+') · بدترین <b class="'+cls(o.worst)+'" dir="ltr">'+fmtR(o.worst)+'</b> <small dir="ltr">'+fmtUsd(o.worst*rbUsdR(it))+'</small> ('+hrs(o.wt)+')</div>':'')+
    '<div class="glnum">'+(o.stopAt?'با همان استاپ اول، '+hrs(o.stopAt)+' استاپ می‌خورد (−1R).':'استاپ اول تا الان نخورده.')+(o.part?' <small>(فقط 1000 ساعت آخر دیده شد)</small>':'')+'</div></div>';}
/* داده‌ی کارت تصویری (همان کارت پوزیشن‌های واقعی) برای یک تست */
function rbShareData(it){
  const open=it.st==='open',px=PRICES.get(it.tk), R=open?(px>0?rbLiveR(it,px):0):it.R||0;
  return {ticker:it.tk,spot:false,dir:it.dir,lev:rbLev(it),open,roi:rbRoe(it,R),pnl:R*rbUsdR(it),r:R,entry:it.E,exit:open?(px>0?px:null):it.xp,stop:it.SL,
    since:open?Date.now():it.xt,openedAt:it.t,closedAt:open?null:it.xt,title:open?'تست باز':'تست بسته شد · '+RB_ST[it.st]};
}
/* آرشیو روزانه‌ی بسته‌ها: هر روز یک بخش تاشو با جمع همان روز؛ روز آخر و روزهایی که تست تازه دارند باز */
const RBDAY=new Map();
function rbArchHtml(done){
  const G=new Map();for(const it of done){const k=dayNo(new Date(it.xt));if(!G.has(k))G.set(k,[]);G.get(k).push(it);}
  let h='<div class="sechd">آرشیو بسته‌ها ('+faN(done.length)+' تست در '+faN(G.size)+' روز)</div>',first=true;
  for(const [k,L] of G){const dl=dayLabel(new Date(L[0].xt)),o=rbSumOf(L),nw=L.filter(rbNewOf).length,
      op=RBDAY.has(k)?RBDAY.get(k):(first||nw>0);first=false;
    h+='<details class="rbday"'+(op?' open':'')+' data-day="'+k+'"><summary><span class="rbdl"><b>'+esc(dl.rel)+'</b> <small>'+esc(dl.wd+' '+dl.date)+'</small>'+(nw?' <span class="pill nw">'+faN(nw)+' تازه</span>':'')+'</span>'+
      '<span class="rbds">'+faN(o.n)+' تست · '+faN(o.w)+' برد ('+faN(Math.round(o.w/o.n*100))+'٪) · <b class="'+cls(o.r)+'" dir="ltr">'+fmtR(o.r)+'</b> · <b class="'+cls(o.r)+'" dir="ltr">'+fmtUsd(rbUsd(L))+'</b></span></summary>'+
      (op?L.map(it=>rbRowHtml(it,true)).join(''):'')+'</details>';}
  return h;
}
function rbSumOf(L){const n=L.length,w=L.filter(x=>x.R>0).length,r=L.reduce((s,x)=>s+x.R,0);return {n,w,r};}
function rbSumHtml(L,label){const o=rbSumOf(L);if(!o.n)return '';
  return '<div class="rbsum"><b>'+label+'</b><span>'+faN(o.n)+' بسته · '+faN(o.w)+' برد ('+faN(Math.round(o.w/o.n*100))+'٪)</span><span>جمع <b class="'+cls(o.r)+'" dir="ltr">'+fmtR(o.r)+'</b> · میانگین <b class="'+cls(o.r/o.n)+'" dir="ltr">'+fmtR(o.r/o.n)+'</b>'+
    ' · به دلار <b class="'+cls(o.r)+'" dir="ltr">'+fmtUsd(rbUsd(L))+'</b></span></div>';}
/* پله‌های نقشه به قیمت: «نصف در 1.234 (+1R) · …» */
function rbPlanTxt(it){
  const P=rdExPlans()[it.ex||'tp'];if(!P)return '';
  const st=P.t.map((r,i)=>(P.f[i]>=0.999?'همه':faN(Math.round(P.f[i]*100))+'٪')+' در <b dir="ltr">'+fmtPrice(rbPx(it,r))+'</b> <small dir="ltr">(+'+r+'R)</small>'+(it.x&&it.x.k>i?' ✓':''));
  return esc(P.n)+': '+(P.tmax?esc(P.d):st.join(' · ')+(P.trail?' · باقی با استاپ متحرک':''));
}
/* سود به R و دلار. پیش‌فرض: هر تست با مبلغ ثابت (مارجین S.tMg، مثلاً 10 دلار) و اهرم ایزوله‌ی پیشنهادی
   (یا اهرم ثابت S.tLev)؛ پس 1R = مارجین × اهرم × فاصله‌ی استاپ. بی مبلغ: 1R = ریسک هر معامله‌ی تنظیمات.
   همیشه از تنظیمات الان حساب می‌شود، پس تست‌های قبلی هم با همین مبلغ دیده می‌شوند. */
const rbFix=()=>+S.tMg>0;
const rbLev=it=>+S.tLev>0?Math.round(+S.tLev):((it&&isoSize(it.E,it.SL))||{lev:1}).lev;
const rbUsdR=it=>rbFix()&&it&&it.sd>0?+S.tMg*rbLev(it)*it.sd:riskUsd();
const rbUsd=(L,f)=>L.reduce((a,it)=>a+(f?f(it):it.R||0)*rbUsdR(it),0);    // جمع دلاری یک فهرست
const rbRoe=(it,r)=>{if(rbFix())return it&&it.sd>0?r*it.sd*rbLev(it)*100:null;const z=it&&isoSize(it.E,it.SL);return z&&z.margin>0?r*riskUsd()/z.margin*100:null;};
const rbMoney=(r,it)=>{const roe=rbRoe(it,r);return '<b class="rbm '+cls(r)+'" dir="ltr">'+fmtUsd(r*rbUsdR(it))+'</b>'+(roe!=null?'<small class="'+cls(r)+'" dir="ltr">'+(roe>0?'+':'')+fmtNum(roe)+'%</small>':'')+'<b class="'+cls(r)+'" dir="ltr">'+fmtR(r)+'</b>';};
/* R اگر همین الان به استاپِ فعلی (اول، ریسک‌فری یا سیوشده) بخورد */
const rbStopR=it=>{const x=it.x,st=x&&x.stop>-1?x.stop:-1;return (x?exR(x,st):st)-rbCost(it,'sl');};
/* جعبه‌ی «مبلغ هر تست» */
function rbSizeHtml(){
  const fix=rbFix(),lev=+S.tLev>0?Math.round(+S.tLev):null;
  return '<details class="sec sub2 rbszw"'+(RBSZOPEN?' open':'')+'><summary>مبلغ هر تست: '+(fix?'<b dir="ltr">'+fmtUsd(+S.tMg)+'</b> مارجین · '+(lev?'اهرم <b dir="ltr">'+lev+'x</b>':'اهرم پیشنهادی ایزوله'):'ریسک ثابت <b dir="ltr">'+fmtUsd(riskUsd())+'</b>')+'</summary>'+
    '<div class="rbsz"><label>مارجین هر تست ($)<input id="rbMg" type="text" inputmode="decimal" dir="ltr" value="'+(fix?+S.tMg:'')+'" placeholder="خالی = ریسک ثابت"></label>'+
    '<label>اهرم<input id="rbLv" type="text" inputmode="numeric" dir="ltr" value="'+(lev||'')+'" placeholder="خالی = پیشنهادی"></label>'+
    '<button class="btn sm ok" data-rbsz="save">'+ic('check')+'<span>ثبت</span></button></div>'+
    '<div class="hint">همان مبلغی که در صرافی برای هر تست می‌گذاری. سود و ضرر همه‌ی تست‌ها، <b>قبلی‌ها هم</b>، با همین عددها حساب می‌شود: '+
    '1R = مارجین × اهرم × فاصله‌ی استاپ (مثلاً 10 دلار با اهرم 10 و استاپ 2٪ ≈ 2 دلار ضرر اگر استاپ بخورد). اهرم خالی یعنی همان اهرمی که دکمه‌ی «ایزوله» پیشنهاد می‌دهد (سقفش اهرم تنظیمات). '+
    'مارجین خالی یعنی روش قبلی: هر معامله ریسک ثابت '+fmtUsd(riskUsd())+'.</div></details>';
}
let RBSZOPEN=false;
/* کِی باز و بسته شد و چقدر طول کشید: «ساعت 14:20 تا 18:05 (3 ساعت و 45 دقیقه)» */
function rbTimeTxt(it){const hm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
  const m=Math.max(0,Math.round((it.xt-it.t)/60000)),dur=m<60?faN(m)+' دقیقه':faN(Math.floor(m/60))+' ساعت'+(m%60?' و '+faN(m%60)+' دقیقه':'');
  return '<span dir="ltr">'+hm(it.t)+'</span> تا <span dir="ltr">'+hm(it.xt)+'</span> ('+dur+')';}
function rbRowHtml(it,live){
  const px=PRICES.get(it.tk), lr=it.st==='open'&&px>0?rbLiveR(it,px):null, x=it.x;
  const left=it.st==='open'?Math.max(0,it.t+AS_HOLD*36e5-Date.now()):0;
  const stopNow=it.st==='open'&&x&&x.stop>-1?(x.stop===0?'ورود (ریسک‌فری)':'<b dir="ltr">'+fmtPrice(rbPx(it,x.stop))+'</b> <small dir="ltr">(+'+fmtNum(x.stop)+'R)</small>'):null;
  const nw=it.k==='test'&&rbNewOf(it);
  return '<div class="rbrow'+(nw?' nw':'')+'" data-id="'+esc(it.id)+'"><div class="rbh">'+(nw?'<span class="pill nw" title="'+(nw==='closed'?'از آخرین سر زدن بسته شده':'از آخرین سر زدن باز شده')+'">'+(nw==='closed'?'تازه بسته شد':'تازه')+'</span>':'')+
    '<b dir="ltr">'+esc(it.tk)+'</b><span class="pill '+it.dir+'">'+(it.dir==='long'?'لانگ':'شورت')+'</span>'+
    (it.sc!=null?'<small>امتیاز '+faN(it.sc)+(it.stars?' · '+faN(it.stars)+'★':'')+'</small>':'')+
    (it.st==='open'?'<span class="pill '+(x&&x.k?'win':'mut')+'">'+(x&&x.k?'سیو شد '+faN(Math.round((1-x.rem)*100))+'٪':it.be?'ریسک‌فری':'باز')+'</span>'+(lr!=null?rbMoney(lr,it):''):
      '<span class="pill '+(it.R>0?'win':'lose')+'">'+RB_ST[it.st]+'</span>'+rbMoney(it.R,it))+'</div>'+
    (it.st==='open'&&x&&x.k?'<div class="glnum">سیو شده: <b class="u" dir="ltr">'+fmtR(x.acc)+'</b> · <b class="u" dir="ltr">'+fmtUsd(x.acc*rbUsdR(it))+'</b> (روی '+faN(Math.round((1-x.rem)*100))+'٪ حجم)</div>':'')+
    '<div class="glnum">ورود <b dir="ltr">'+fmtPrice(it.E)+'</b> · استاپ اول <b dir="ltr">'+fmtPrice(it.SL)+'</b>'+(stopNow&&x.stop>-1?' · استاپ الان '+stopNow:'')+
      (it.st==='open'?(px>0?' · الان <b dir="ltr">'+fmtPrice(px)+'</b>':'')+' · '+faN(Math.ceil(left/36e5))+' ساعت مانده':' · خروج <b dir="ltr">'+fmtPrice(it.xp)+'</b> · '+rbTimeTxt(it))+'</div>'+
    (x?'<div class="glnum rbplan">'+rbPlanTxt(it)+'</div>':'<div class="glnum">هدف <b dir="ltr">'+fmtPrice(it.TP)+'</b></div>')+
    (it.st!=='open'?rbHoldHtml(it):'')+
    (live?'<div class="glact">'+(it.st==='open'?'<button class="btn sm" data-rb="close">'+ic('x')+'<span>بستن با قیمت الان</span></button>':
        '<button class="btn sm" data-rb="hold" title="از لحظه‌ی ورود تا الان، اگر نمی‌بستیم">'+ic('clock')+'<span>'+(RBHOLD.has(it.id)?'تازه کن «اگر نگه داشته بودیم»':'اگر نگه داشته بودیم؟')+'</span></button>')+
      '<button class="btn sm" data-rb="share" title="تصویر نتیجه برای فرستادن">'+ic('share')+'<span>تصویر</span></button>'+
      '<button class="btn sm side" data-rb="del" title="حذف از دفتر">'+ic('trash')+'</button></div>':'')+'</div>';
}
function rbHtml(kind){
  const k=kind==='test'?'test':'auto', L=RB.items.filter(it=>it.k===k), open=L.filter(it=>it.st==='open'), done=L.filter(it=>it.st!=='open').sort((a,b)=>b.xt-a.xt);
  let h='';
  if(k==='test'){
    rbEnter();
    {const nO=open.filter(rbNewOf),nC=done.filter(rbNewOf);
      if(nO.length||nC.length){const r=nC.reduce((a,it)=>a+(it.R||0),0);
        h+='<div class="rbnew">'+ic('bell')+'<span>از آخرین سر زدن ('+ageTxt(RBVIS.prev)+'): '+
          [nC.length?faN(nC.length)+' تست بسته شد · جمع <b class="'+cls(r)+'" dir="ltr">'+fmtR(r)+'</b> <b class="'+cls(r)+'" dir="ltr">'+fmtUsd(rbUsd(nC))+'</b>':'',nO.length?faN(nO.length)+' تست تازه باز شد':''].filter(Boolean).join(' · ')+
          '. همه با نشان <span class="pill nw">تازه</span>.</span></div>';}}
    h+=rbSumHtml(done,'نتیجه');
    if(open.length){const px=it=>PRICES.get(it.tk),liv=open.filter(it=>px(it)>0),sum=liv.reduce((a,it)=>a+rbLiveR(it,px(it)),0),usd=rbUsd(liv,it=>rbLiveR(it,px(it))),worst=rbUsd(open,rbStopR);
      h+='<div class="rbsum"><b>بازها الان</b><span>'+faN(open.length)+' معامله · جمع <b class="'+cls(sum)+'" dir="ltr">'+fmtR(sum)+'</b> · به دلار <b class="'+cls(sum)+'" dir="ltr">'+fmtUsd(usd)+'</b></span>'+
        '<span class="rbworst">اگر همه‌ی بازها به استاپِ الانشان بخورند: <b class="'+cls(worst)+'" dir="ltr">'+fmtUsd(worst)+'</b>'+(rbFix()?' · مارجین درگیر <b dir="ltr">'+fmtUsd(open.length*S.tMg)+'</b>':'')+'</span>'+
        '<button class="btn sm" data-rb="closeall">'+ic('x')+'<span>بستن همه با قیمت الان</span></button></div>';}
    {const P=rbRadarAsk(),po=P.filter(p=>p.status==='open').length;
      if(P.length)h+='<div class="rdwarn rbfp"><span><b>'+faN(P.length)+' پوزیشن رادار</b> در «پوزیشن‌ها» ثبت شده'+(po?' ('+faN(po)+' باز)':'')+'. اگر این‌ها را در صرافی <b>نگرفته‌ای</b> و فقط برای امتحان بودند، بیاورشان این‌جا تا کارنامه‌ی واقعی‌ات قاطی نشود؛ دنبال کردنشان از لحظه‌ی ورود ادامه پیدا می‌کند.</span>'+
        '<button class="btn sm" data-rb="frompos">'+ic('undo')+'<span>انتقال به آزمایشی</span></button></div>';}
    if(L.length)h+='<div class="srow rbtop"><button class="btn sm ok'+(RBL.on?' busy':'')+'" data-rbl="dl" title="همه‌ی تست‌ها با مسیر واقعی قیمت، عامل‌های لحظه‌ی ورود و خلاصه‌ی مدل">'+ic('down')+
      '<span>'+(RBL.on?'آماده‌سازی خروجی '+faN(RBL.done)+' از '+faN(RBL.n)+'…':'خروجی برای بررسی')+'</span></button></div>';
    h+=rbSizeHtml();
    h+='<details class="sec sub2 rbexw"><summary>نقشه‌ی خروج: '+rbExTxt()+(RBEX==='auto'?' (خودکار)':'')+'</summary>'+rbExPicker()+'</details>';
    h+=rbLabHtml();
    if(open.length)h+='<div class="sechd">باز ('+faN(open.length)+')</div>'+open.map(it=>rbRowHtml(it,true)).join('');
    if(done.length)h+=rbArchHtml(done);
    if(!L.length)h+='<div class="empty">هنوز معامله‌ی آزمایشی نداری. در «سیگنال‌ها» روی <b>تست</b> هر سیگنال بزن.</div>';
    h+='<div class="hint">معامله‌ی آزمایشی مثل واقعی دنبال می‌شود (پله‌های سیو سود، استاپ، حداکثر 24 ساعت، بعد از کارمزد) ولی پولی در کار نیست و در پوزیشن‌ها و کارنامه‌ی اصلی نمی‌آید؛ حتی وقتی برنامه بسته است با کندل 5 دقیقه‌ای دنبال می‌شود. '+
      (rbFix()?'دلار با مارجین '+fmtUsd(+S.tMg)+' برای هر تست حساب می‌شود (جعبه‌ی «مبلغ هر تست»). ':'دلار با ریسک هر معامله‌ی تنظیمات ('+fmtUsd(riskUsd())+') حساب می‌شود. ')+'حداکثر '+faN(RD_CAP)+' تست هم‌جهت باز (بیشترش را می‌پرسد). بسته‌ها هیچ‌وقت خودشان پاک نمی‌شوند و در پشتیبان هم می‌آیند.</div>';
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
    const n=rbReplan(RBEX==='auto'?null:RBEX);paintRadar(g);toast('نقشه‌ی خروج: '+rbExTxt()+(n?' · '+faN(n)+' معامله‌ی باز دوباره حساب می‌شود':''),'ok');});
  {const d=g.querySelector('.rbszw');if(d)d.ontoggle=()=>{RBSZOPEN=d.open;};}
  // روز بسته‌ای که باز می‌شود تازه ساخته می‌شود (صدها ردیف یک‌جا ساخته نشوند)
  g.querySelectorAll('.rbday').forEach(d=>d.ontoggle=()=>{const k=+d.dataset.day;RBDAY.set(k,d.open);if(d.open&&!d.querySelector('.rbrow'))paintRadar(g);});
  g.querySelectorAll('[data-rbsz]').forEach(b=>b.onclick=()=>{
    const m=parseFloat(normDig(($('#rbMg')||{}).value||'')),l=parseFloat(normDig(($('#rbLv')||{}).value||''));
    S.tMg=m>0?Math.min(1e6,m):null;S.tLev=l>=1?Math.min(125,Math.round(l)):null;DB.settings=Object.assign({},S);save();
    paintRadar(g);toast(rbFix()?'هر تست: '+fmtUsd(S.tMg)+' مارجین'+(S.tLev?' با اهرم '+S.tLev+'x':' با اهرم پیشنهادی')+' · همه‌ی تست‌ها دوباره حساب شد':'هر تست با ریسک ثابت '+fmtUsd(riskUsd()),'ok');});
  g.querySelectorAll('[data-rb]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.rb;
    if(a==='closeall'){const L=RB.items.filter(it=>it.k==='test'&&it.st==='open'&&PRICES.get(it.tk)>0);
      if(!L.length)return;
      askConfirm({title:'بستن همه‌ی تست‌های باز',tone:'info',msg:faN(L.length)+' معامله‌ی آزمایشیِ باز با قیمت الان بسته می‌شود.',ok:'همه را ببند',cancel:'انصراف'}).then(y=>{if(!y)return;
        for(const it of L)rbClose(it,'man',PRICES.get(it.tk));rbSave();paintRadar(g);toast(faN(L.length)+' معامله بسته شد','ok');});return;}
    if(a==='frompos'){sheetRadarToTest(()=>paintRadar(g));return;}
    const row=b.closest('[data-id]'), it=row&&RB.items.find(x=>x.id===row.dataset.id);if(!it)return;
    if(a==='share'){sheetShare(null,rbShareData(it));return;}
    if(a==='hold'){busyRun(()=>rbHoldCalc(it)).then(()=>paintRadar(g)).catch(()=>toast('کندل‌های '+it.tk+' نیامد؛ کمی بعد دوباره بزن','err'));return;}
    if(a==='close'){const px=PRICES.get(it.tk);if(!(px>0)){toast('قیمت الان معلوم نیست','err');return;}rbClose(it,'man',px);}
    if(a==='del'){const keep=RB.items.slice();RB.items=RB.items.filter(x=>x!==it);rbSave();paintRadar(g);toastUndo('حذف شد',()=>{RB.items=keep;rbSave();paintRadar(g);});return;}
    rbSave();paintRadar(g);});
}
/* انتخاب نقشه‌ی خروج با نتیجه‌ی سنجش هر کدام (بیرون از یادگیری) */
function rbExPicker(){
  const PL=rdExPlans(), S0=RD.exs||{}, el=rbExEff('long'), es=rbExEff('short');
  const v=(n,d,t)=>{const o=S0[n]&&S0[n][d];return o&&o.n?'<small dir="ltr" class="'+cls(o.r/o.n)+'">'+t+' '+fmtR(o.r/o.n)+'</small>':'';};
  const m=n=>{const a=v(n,'long','L'),b=v(n,'short','S');return a||b?' '+a+(a&&b?' ':'')+b:'';};
  return '<div class="rbex"><div class="pbpick">'+
    '<button class="pbc'+(RBEX==='auto'?' on':'')+'" data-rbex="auto">خودکار'+(RD.ex?' ('+rbExTxt0()+')':'')+'</button>'+
    RD_EXN.map(n=>'<button class="pbc'+(RBEX===n?' on':'')+'" data-rbex="'+n+'" title="'+esc(PL[n].d)+'">'+esc(PL[n].n)+m(n)+'</button>').join('')+'</div>'+
    '<div class="hint">'+(el===es?esc(PL[el].d):'لانگ: '+esc(PL[el].d)+'؛ شورت: '+esc(PL[es].d))+'. عدد کنار هر نقشه: میانگین R همان سیگنال‌های رادار با آن نقشه برای لانگ (L) و شورت (S)، روی دوره‌ای که مدل ندیده. «خودکار» برای هر جهت بهترینِ همان جهت را برمی‌دارد.'+
    ' با عوض کردن نقشه، معامله‌های باز هم از لحظه‌ی ورود با نقشه‌ی تازه دوباره حساب می‌شوند.</div></div>';
}
// معامله‌های بازی که پیش از نقشه‌ی خروج ثبت شده‌اند: یک بار با نقشه‌ی فعلی از لحظه‌ی ورود دوباره حساب می‌شوند
setTimeout(()=>{try{rbReplan(null,true);}catch(e){}},1500);
