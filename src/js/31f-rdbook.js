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
const rbOpen=()=>{const o={test:0,auto:0};for(const it of RB.items)if(it.st==='open')o[it.k]++;return o;};
function rbRepaint(){clearTimeout(RBT);RBT=setTimeout(()=>{try{if(view==='signals'&&sigFilter==='mkt')paintGlance();}catch(e){}},400);}
function rbAdd(kind,x,quiet){
  if(!x||!x.pl)return null;
  if(RB.items.some(it=>it.k===kind&&it.st==='open'&&it.tk===x.tk&&(kind==='auto'||it.dir===x.dir))){if(!quiet)toast('همین معامله‌ی آزمایشی باز است','err');return null;}
  const pl=rdPlanAt(x.pl,PRICES.get(x.tk)||x.pl.E), now=Date.now();
  const it={id:kind[0]+now.toString(36)+Math.random().toString(36).slice(2,5),k:kind,tk:x.tk,dir:x.dir,t:now,E:pl.E,SL:pl.SL,TP:pl.TP,sd:pl.sd,rr:pl.rr,
    sc:x.sc,stars:x.stars||0,p:x.p!=null?+x.p.toFixed(3):null,exp:x.exp!=null?+x.exp.toFixed(3):null,reg:RD.reg||null,be:false,st:'open'};
  RB.items.push(it);RBLC.set(it.id,now);
  // اندازه‌ی حافظه: قدیمی‌ترین بسته‌های خودکار اول می‌روند
  const auto=RB.items.filter(i=>i.k==='auto'&&i.st!=='open');
  if(auto.length>400){const drop=new Set(auto.slice(0,auto.length-400).map(i=>i.id));RB.items=RB.items.filter(i=>!drop.has(i.id));}
  rbSave();
  if(!quiet)toast('ثبت شد در «آزمایشی»: '+x.tk+' '+(x.dir==='long'?'لانگ':'شورت')+' از '+fmtPrice(pl.E),'ok');
  return it;
}
/* بعد از هر بررسی: همه‌ی پیشنهادهای امتیاز 70+ (برای هر ارز یکی در هر لحظه) */
function rbLogAuto(){let n=0;for(const x of rdList())if(x.dir!=='wait'&&x.pl&&rbAdd('auto',x,true))n++;return n;}
function rbClose(it,st,px,t){
  const s=it.dir==='long'?1:-1, c=rbCost(it);
  it.st=st;it.xt=t||Date.now();it.xp=px;
  it.R=+(st==='tp'?it.rr-c:st==='sl'?-1-c:st==='be'?-c:(px-it.E)*s/(it.E*it.sd)-c).toFixed(3);
}
/* یک قدم با یک قیمت یا یک کندل: ریسک‌فری از قدم بعد از رسیدن به +1R */
function rbStep(it,hi,lo,t){
  const s=it.dir==='long'?1:-1, stop=it.be?it.E:it.SL, R1=it.E*(1+s*it.sd);
  if(s>0?lo<=stop:hi>=stop){rbClose(it,it.be?'be':'sl',stop,t);return true;}
  if(s>0?hi>=it.TP:lo<=it.TP){rbClose(it,'tp',it.TP,t);return true;}
  if(!it.be&&(s>0?hi>=R1:lo<=R1))it.be=true;
  return false;
}
/* قیمت زنده (از applyPrices): فقط برای معامله‌هایی که تا همین چند دقیقه پیش دنبال شده‌اند؛ بقیه با کندل */
function rbCheck(){
  const now=Date.now();let ch=false,gap=false;
  for(const it of RB.items){if(it.st!=='open')continue;
    if(now-(RBLC.get(it.id)||0)>10*60000){gap=true;continue;}
    const px=PRICES.get(it.tk);if(!(px>0))continue;
    const be=it.be;
    if(rbStep(it,px,px,now))ch=true;else if(it.be!==be)ch=true;
    if(it.st==='open'&&now-it.t>=AS_HOLD*36e5){rbClose(it,'time',px,now);ch=true;}
    RBLC.set(it.id,now);}
  if(ch){rbSave();rbRepaint();}
  if(gap)rbCatchUp();
}
/* وقتی برنامه بسته بود: کندل‌های 5 دقیقه‌ایِ بعد از ورود (کندلِ خودِ ورود حساب نمی‌شود) */
async function rbCatchUp(force){
  const now=Date.now();if(RBCUON||(!force&&now-RBCU<3*60000))return;
  const todo=RB.items.filter(it=>it.st==='open'&&now-(RBLC.get(it.id)||0)>10*60000);if(!todo.length)return;
  RBCU=now;RBCUON=true;let ch=false;
  try{
    for(const it of todo){
      const M5=3e5, from=it.chk||Math.floor(it.t/M5)*M5+M5, end=it.t+AS_HOLD*36e5;
      let C;try{C=await audCandles(it.tk,'5m',from,300,true);}catch(e){continue;}
      let last=null;
      for(const k of C){if(k.t<from)continue;if(k.t>=end)break;last=k;if(rbStep(it,k.h,k.l,k.t+M5))break;}
      if(it.st==='open'){
        if(last)it.chk=last.t;                  // کندل آخر شاید نیمه است: بار بعد از همان دوباره
        if(now>=end&&last&&last.t+M5>=end-M5)rbClose(it,'time',last.c,end);
        else RBLC.set(it.id,Date.now());}
      ch=true;
    }
  }finally{RBCUON=false;}
  if(ch){rbSave();rbRepaint();}
}
const RB_ST={tp:'هدف',sl:'استاپ',be:'ریسک‌فری',time:'24 ساعت',man:'دستی',open:'باز'};
function rbSumOf(L){const n=L.length,w=L.filter(x=>x.R>0).length,r=L.reduce((s,x)=>s+x.R,0);return {n,w,r};}
function rbSumHtml(L,label){const o=rbSumOf(L);if(!o.n)return '';
  return '<div class="rbsum"><b>'+label+'</b><span>'+faN(o.n)+' بسته · '+faN(o.w)+' برد ('+faN(Math.round(o.w/o.n*100))+'٪)</span><span>جمع <b class="'+cls(o.r)+'" dir="ltr">'+fmtR(o.r)+'</b> · میانگین <b class="'+cls(o.r/o.n)+'" dir="ltr">'+fmtR(o.r/o.n)+'</b>'+
    ' · به دلار <b class="'+cls(o.r)+'" dir="ltr">'+fmtUsd(o.r*riskUsd())+'</b></span></div>';}
function rbRowHtml(it,live){
  const s=it.dir==='long'?1:-1, px=PRICES.get(it.tk), lr=it.st==='open'&&px>0?(px-it.E)*s/(it.E*it.sd)-rbCost(it):null;
  const left=it.st==='open'?Math.max(0,it.t+AS_HOLD*36e5-Date.now()):0;
  return '<div class="rbrow" data-id="'+esc(it.id)+'"><div class="rbh"><b dir="ltr">'+esc(it.tk)+'</b><span class="pill '+it.dir+'">'+(it.dir==='long'?'لانگ':'شورت')+'</span>'+
    (it.sc!=null?'<small>امتیاز '+faN(it.sc)+(it.stars?' · '+faN(it.stars)+'★':'')+'</small>':'')+
    (it.st==='open'?'<span class="pill mut">'+(it.be?'ریسک‌فری':'باز')+'</span>'+(lr!=null?'<b class="'+cls(lr)+'" dir="ltr">'+fmtR(lr)+'</b>':''):
      '<span class="pill '+(it.R>0?'win':'lose')+'">'+RB_ST[it.st]+'</span><b class="'+cls(it.R)+'" dir="ltr">'+fmtR(it.R)+'</b>')+'</div>'+
    '<div class="glnum">ورود <b dir="ltr">'+fmtPrice(it.E)+'</b> · استاپ <b dir="ltr">'+fmtPrice(it.SL)+'</b> · هدف <b dir="ltr">'+fmtPrice(it.TP)+'</b>'+
      (it.st==='open'?(px>0?' · الان <b dir="ltr">'+fmtPrice(px)+'</b>':'')+' · '+faN(Math.ceil(left/36e5))+' ساعت مانده':' · '+ageTxt(it.xt))+'</div>'+
    (live?'<div class="glact">'+(it.st==='open'?'<button class="btn sm" data-rb="close">'+ic('x')+'<span>بستن با قیمت الان</span></button>':'')+
      '<button class="btn sm side" data-rb="del" title="حذف از دفتر">'+ic('trash')+'</button></div>':'')+'</div>';
}
function rbHtml(kind){
  const k=kind==='test'?'test':'auto', L=RB.items.filter(it=>it.k===k), open=L.filter(it=>it.st==='open'), done=L.filter(it=>it.st!=='open').sort((a,b)=>b.xt-a.xt);
  let h='';
  if(k==='test'){
    h+='<div class="hint">معامله‌ی آزمایشی مثل واقعی دنبال می‌شود (هدف، استاپ، ریسک‌فری در <bdi dir="ltr">+1R</bdi>، حداکثر 24 ساعت، بعد از کارمزد) ولی پولی در کار نیست و در پوزیشن‌ها و کارنامه‌ی اصلی نمی‌آید. '+
      'از تب «سیگنال‌ها» روی <b>تست</b> بزن. دلار با ریسک هر معامله‌ی تنظیمات ('+fmtUsd(riskUsd())+') حساب می‌شود.</div>';
    h+=rbSumHtml(done,'نتیجه');
    if(open.length)h+='<div class="sechd">باز ('+faN(open.length)+')</div>'+open.map(it=>rbRowHtml(it,true)).join('');
    if(done.length)h+='<div class="sechd">بسته</div>'+done.slice(0,40).map(it=>rbRowHtml(it,true)).join('');
    if(!L.length)h+='<div class="empty">هنوز معامله‌ی آزمایشی نداری.</div>';
    else h+='<div class="glact"><button class="btn sm side" data-rb="clear">'+ic('trash')+'<span>پاک کردن همه‌ی بسته‌ها</span></button></div>';
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
  g.querySelectorAll('[data-rb]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.rb;
    if(a==='clear'){const keep=RB.items;RB.items=RB.items.filter(it=>it.k!=='test'||it.st==='open');rbSave();paintRadar(g);toastUndo('بسته‌های آزمایشی پاک شد',()=>{RB.items=keep;rbSave();paintRadar(g);});return;}
    const row=b.closest('[data-id]'), it=row&&RB.items.find(x=>x.id===row.dataset.id);if(!it)return;
    if(a==='close'){const px=PRICES.get(it.tk);if(!(px>0)){toast('قیمت الان معلوم نیست','err');return;}rbClose(it,'man',px);}
    if(a==='del'){const keep=RB.items.slice();RB.items=RB.items.filter(x=>x!==it);rbSave();paintRadar(g);toastUndo('حذف شد',()=>{RB.items=keep;rbSave();paintRadar(g);});return;}
    rbSave();paintRadar(g);});
}
