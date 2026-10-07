/* ==================== پیشنهاد برنامه: سیگنال از روی رویدادهای بازار ====================
   از همان رویدادهای «حال بازار» (31c-market.js) سیگنال کوتاه‌مدت می‌سازد، ولی هر قاعده اول روی
   گذشته‌ی همان ارزها سنجیده می‌شود و فقط قاعده‌ای پیشنهاد می‌شود که در گذشته سود داده:
   - شکست کف 7 / 30 روزه ← شورت · شکست سقف 7 / 30 روزه ← لانگ
   - تقاطع نزولی MA20/50 (4 ساعته) ← شورت · تقاطع صعودی ← لانگ
   نقشه: ورود = بسته شدن همان کندل، استاپ = 1.5 برابر ATR یک‌ساعته (بین 0.6٪ و سقف ایزوله)،
   هدف = تارگت اول تنظیمات (به R)، حداکثر 24 ساعت؛ اگر استاپ و هدف در یک کندل بودند، استاپ حساب
   می‌شود (به ضرر قاعده). کارمزد و لغزش از R کم می‌شود. فیلتر حال بازار: شورت نه وقتی بیت‌کوین
   صعودی است، لانگ نه وقتی نزولی. */
const AS_RULES={
  low7:{dir:'short',t:'شکست کف 7 روزه'},  low30:{dir:'short',t:'شکست کف 30 روزه'},
  high7:{dir:'long',t:'شکست سقف 7 روزه'}, high30:{dir:'long',t:'شکست سقف 30 روزه'},
  maDn:{dir:'short',t:'تقاطع نزولی MA20/50 (4 ساعته)'}, maUp:{dir:'long',t:'تقاطع صعودی MA20/50 (4 ساعته)'}
};
const AS_HOLD=24, AS_FRESH=4, AS_MINN=10, AS_KEY='signaldesk.autosig.v1';
/* رویدادها در هر کندل (برای سنجش گذشته)؛ هر قاعده روی هر ارز حداکثر یک بار در ۲۴ ساعت */
function asTriggers(C){
  const H=36e5, out=[], last={}, n=C.length;
  const fire=(k,i)=>{if(last[k]!=null&&i-last[k]<24)return;last[k]=i;out.push({k,i});};
  // کمینه/بیشینه‌ی پنجره‌ی لغزان (ساده؛ ۱۰۰۰ کندل سنگین نیست)
  for(const d of [7,30]){
    const w=d*24;
    for(let i=w;i<n;i++){
      let lo=Infinity,hi=-Infinity;for(let j=i-w;j<i;j++){if(C[j].l<lo)lo=C[j].l;if(C[j].h>hi)hi=C[j].h;}
      // شکست با بسته شدن کندل، نه فقط سایه
      if(C[i].c<lo)fire('low'+d,i);
      if(C[i].c>hi)fire('high'+d,i);
    }
  }
  // تقاطع روی کندل ۴ ساعته؛ رویداد در آخرین کندل یک‌ساعته‌ی همان ۴ ساعت
  const F=swAggr(C,4*H);
  if(F.length>=52){
    const ma=(m,j)=>{let s=0;for(let q=j-m+1;q<=j;q++)s+=F[q].c;return s/m;};
    const idx=new Map(C.map((k,i)=>[k.t,i]));
    for(let j=51;j<F.length;j++){
      const a=Math.sign(ma(20,j-1)-ma(50,j-1)), b=Math.sign(ma(20,j)-ma(50,j));
      if(a===b||b===0)continue;
      const i=idx.get(F[j].t+3*H);if(i==null)continue;      // ۴ ساعت هنوز کامل نشده
      fire(b<0?'maDn':'maUp',i);
    }
  }
  return out.sort((x,y)=>x.i-y.i);
}
function asAtr(C,i){let s=0,n=0;for(let j=Math.max(1,i-13);j<=i;j++){const k=C[j],pc=C[j-1].c;s+=Math.max(k.h-k.l,Math.abs(k.h-pc),Math.abs(k.l-pc));n++;}return n?s/n:null;}
function asPlan(C,i,dir,E){
  E=E||C[i].c;const atr=asAtr(C,i);if(!atr||!(E>0))return null;
  const sd=Math.min(Math.max(1.5*atr/E,0.006),isoMaxSd()/100), sign=dir==='long'?1:-1, rr=+(S.rMul&&S.rMul[0])||1.5;
  return {dir,E,SL:+(E*(1-sign*sd)).toPrecision(8),TP:+(E*(1+sign*sd*rr)).toPrecision(8),sd,rr};
}
/* یک معامله روی کندل‌های بعدی: R خالص (بعد از کارمزد و لغزش) */
function asWalk(C,i,pl){
  const sign=pl.dir==='long'?1:-1, cost=(2*(+S.fee||0)+(+S.slip||0))/100/pl.sd;
  for(let j=i+1;j<C.length&&j<=i+AS_HOLD;j++){
    const k=C[j];
    if(sign>0?k.l<=pl.SL:k.h>=pl.SL)return {R:-1-cost,j,how:'sl'};
    if(sign>0?k.h>=pl.TP:k.l<=pl.TP)return {R:pl.rr-cost,j,how:'tp'};
  }
  const end=Math.min(C.length-1,i+AS_HOLD);
  if(end<i+AS_HOLD)return null;                         // هنوز تمام نشده: در سنجش نمی‌آید
  return {R:(C[end].c-pl.E)*sign/(pl.E*pl.sd)-cost,j:end,how:'time'};
}
/* سنجشِ یک ارز: هر قاعده چند بار، چند برد، جمع R؛ و رویدادهای تازه (۳ ساعت اخیر) برای پیشنهاد */
function asCoin(tk,C){
  const T=asTriggers(C), res={}, live=[], L=C.length-1, end=C[L].t+36e5;
  for(const {k,i} of T){
    const dir=AS_RULES[k].dir, pl=asPlan(C,i,dir);if(!pl)continue;
    const reg=regimeAt(C[i].t+36e5), okReg=!(dir==='short'&&reg==='bull')&&!(dir==='long'&&reg==='bear');
    const w=asWalk(C,i,pl);
    if(w){const o=res[k]||(res[k]={n:0,w:0,r:0,fn:0,fw:0,fr:0});o.n++;o.r+=w.R;if(w.R>0)o.w++;
      if(okReg){o.fn++;o.fr+=w.R;if(w.R>0)o.fw++;}}
    if(end-(C[i].t+36e5)<=AS_FRESH*36e5)live.push({tk,k,i,t:C[i].t+36e5});
  }
  return {res,live};
}
let AS=(()=>{const a=lsGet(AS_KEY);return a&&a.v===1?a:{v:1,at:0,coins:{},live:[]};})();
const ASQ={on:false,done:0,n:0};
function asUniverse(){
  const base=(MKT&&Array.isArray(MKT.top)&&MKT.top.length?MKT.top:['BTC','ETH','SOL','XRP','BNB','DOGE','ADA','AVAX','LINK','SUI','TON','TRX','DOT','LTC','NEAR','APT','ARB','OP','PEPE','WIF']).slice(0,25);
  // ارزهای سیگنال‌های اخیر کانال هم
  const ch=[];for(const p of POSTS){if(!p.date||Date.now()-p.date>7*864e5)break;if(isSigPost(p)){const t=sigOf(p).ticker;if(t)ch.push(t);}}
  return [...new Set(base.concat(ch))].filter(t=>/^[A-Z0-9]{2,12}$/.test(t)).slice(0,32);
}
async function asScan(force){
  if(ASQ.on)return;
  if(!force&&Date.now()-AS.at<30*60000)return;
  const U=asUniverse();
  Object.assign(ASQ,{on:true,done:0,n:U.length});
  // تاریخچه‌ی بیت‌کوین برای فیلتر حال بازار (اگر نیامد، فیلتر خاموش می‌ماند)
  try{await btcHistLoad(Date.now()-1000*36e5);}catch(e){}
  const coins={}, live=[], q=U.slice();
  const worker=async()=>{while(q.length){const tk=q.shift();
    try{const C=await mkCandles(tk);if(C&&C.length>200){const r=asCoin(tk,C);coins[tk]=r.res;
      for(const x of r.live){const pl=asPlan(C,x.i,AS_RULES[x.k].dir,PRICES.get(tk)||C[C.length-1].c);if(pl)live.push(Object.assign(x,{pl}));}}}
    catch(e){}
    ASQ.done++;asPaintProg();}};
  await Promise.all([worker(),worker()]);
  AS={v:1,at:Date.now(),coins,live};lsSet(AS_KEY,AS);ASQ.on=false;
  if(view==='signals')paintGlance();
}
const asPaintProg=()=>{const b=$('#asProg');if(b)b.textContent=ASQ.on?'در حال بررسی '+faN(ASQ.done)+' از '+faN(ASQ.n)+' ارز…':'';};
/* کیفیت هر قاعده: جمعِ همه‌ی ارزها؛ با فیلتر حال بازار اگر بهتر است */
function asRuleStats(){
  const S0={};
  for(const r of Object.values(AS.coins||{}))for(const [k,o] of Object.entries(r)){
    const a=S0[k]||(S0[k]={n:0,w:0,r:0,fn:0,fw:0,fr:0});for(const f in o)a[f]+=o[f];}
  for(const [k,a] of Object.entries(S0)){
    const all=a.n?a.r/a.n:null, filt=a.fn?a.fr/a.fn:null;
    a.useF=a.fn>=AS_MINN&&filt!=null&&(all==null||filt>all);
    const n=a.useF?a.fn:a.n, avg=a.useF?filt:all;
    a.ok=n>=AS_MINN&&avg>0.05;a.avg=avg;a.N=n;a.W=a.useF?a.fw:a.w;
  }
  return S0;
}
/* پیشنهادهای امروز: رویداد تازه + قاعده‌ای که در گذشته سود داده + فیلتر حال بازار (اگر بهترش کرده) */
function asSuggestions(){
  const st=asRuleStats(), reg=MKT?regOfBtc(MKT.btc):null, out=[];let rej=0,rejBad=0,rejReg=0;
  for(const x of AS.live||[]){
    const s=st[x.k], dir=AS_RULES[x.k].dir;
    if(!s||!s.ok){rej++;rejBad++;continue;}
    if(s.useF&&((dir==='short'&&reg==='bull')||(dir==='long'&&reg==='bear'))){rej++;rejReg++;continue;}
    out.push(Object.assign({},x,{s,dir}));
  }
  out.sort((a,b)=>b.s.avg-a.s.avg||b.t-a.t);
  return {list:out,rej,rejBad,rejReg,st};
}
function asPost(x){
  return {id:'auto/'+x.tk+'/'+x.k+'/'+x.t,num:0,text:'پیشنهاد برنامه: '+AS_RULES[x.k].t+' · #'+x.tk,date:new Date(x.t),link:null,img:null,auto:true};
}
function asSig(x){return {isSignal:true,ticker:x.tk,direction:x.dir,dirSet:true,entry:x.pl.E,stop:x.pl.SL,targets:[x.pl.TP],
  market:'futures',marketGuess:false,leverage:null,trigger:null,tier2:null,hasNum:true};}
function asEnter(x){
  const p=asPost(x), sig=asSig(x), z=isoSize(x.pl.E,x.pl.SL);
  sheetEnter(p,sig,{stop:x.pl.SL,lev:z?z.lev:null,amt:z?z.margin:null,market:'futures'},PRICES.get(x.tk)||x.pl.E,
    {iso:true,untilAuto:true,note:'پیشنهاد برنامه · '+AS_RULES[x.k].t,until:Date.now()+AS_HOLD*36e5});
}
function asHtml(){
  if(!F('autosig'))return '';
  const sg=asSuggestions();
  let h='<div class="assec"><div class="mkh"><b>'+ic('bolt')+'پیشنهاد برنامه (از بازار، نه کانال)</b><small id="asProg">'+(ASQ.on?'':AS.at?ageTxt(AS.at):'')+'</small></div>';
  if(!AS.at&&!ASQ.on)h+='<div class="hint">هنوز بررسی نشده.</div>';
  for(const [i,x] of sg.list.slice(0,6).entries()){
    if(VIEW.nowDir&&VIEW.nowDir!=='all'&&x.dir!==VIEW.nowDir)continue;   // فیلتر جهتِ تب «الان چه کنم؟»
    const z=isoSize(x.pl.E,x.pl.SL);
    h+='<div class="glsig assig" data-as="'+i+'"><div class="glit"><b dir="ltr">'+esc(x.tk)+'</b><span class="pill '+x.dir+'">'+(x.dir==='long'?'لانگ':'شورت')+'</span><span>'+esc(AS_RULES[x.k].t)+'</span><small>'+relTime(new Date(x.t))+'</small></div>'+
      '<div class="glnum">ورود <b dir="ltr">'+fmtPrice(x.pl.E)+'</b> · استاپ <b dir="ltr">'+fmtPrice(x.pl.SL)+'</b> ('+fmtNum(x.pl.sd*100)+'٪) · هدف <b dir="ltr">'+fmtPrice(x.pl.TP)+'</b> · حداکثر '+faN(AS_HOLD)+' ساعت</div>'+
      '<div class="glnum glh2">این قاعده در گذشته'+(x.s.useF?' (با فیلتر حال بازار)':'')+': '+faN(x.s.N)+' بار، '+faN(Math.round(x.s.W/x.s.N*100))+'٪ برد، میانگین <b class="'+cls(x.s.avg)+'">'+fmtR(x.s.avg)+'</b> بعد از کارمزد</div>'+
      (()=>{const e=mkEvPills(x.tk,x.dir);return e?'<div class="glnum">'+e+'</div>':'';})()+
      '<div class="glact">'+(z?'<button class="btn sm ok" data-a="iso">'+ic('shield')+'<span>ایزوله '+faN(z.lev)+'x · '+fmtUsd(z.margin)+'</span></button>':'')+
      '<button class="btn sm side" data-a="copy" title="برای اپ صرافی">'+ic('share')+'</button></div></div>';
  }
  if(AS.at&&!sg.list.length)h+=asWhyNone(sg);
  else if(sg.rej)h+='<div class="hint">'+faN(sg.rej)+' رویداد دیگر کنار رفت (قاعده‌اش در گذشته سود نداده یا خلاف حال بازار است).</div>';
  h+='<div class="srow"><button class="btn sm" data-asrules="1">'+ic('bars')+'<span>کارنامه‌ی قاعده‌ها</span></button>'+
    '<button class="btn sm" data-asrun="1"'+(ASQ.on?' disabled':'')+'>'+ic('refresh')+'<span>بررسی دوباره</span></button></div>'+
    '<div class="hint">قاعده‌های ساده‌ی تکنیکال، سنجیده روی حدود 40 روز گذشته‌ی '+faN(Object.keys(AS.coins||{}).length)+' ارز پرحجم؛ سود گذشته تضمین آینده نیست. اندازه با «ریسک هر معامله».</div></div>';
  return h;
}
/* چرا الان پیشنهادی نیست؟ سه حالت، با عدد */
function asWhyNone(sg){
  const R=Object.entries(sg.st).map(([k,a])=>Object.assign({k},a));
  const good=R.filter(a=>a.ok).sort((a,b)=>b.avg-a.avg);
  const best=R.filter(a=>a.N>=AS_MINN).sort((a,b)=>b.avg-a.avg)[0];
  const nm=a=>esc(AS_RULES[a.k].t)+' ('+(AS_RULES[a.k].dir==='long'?'لانگ':'شورت')+'، '+faN(a.N)+' بار، <span class="'+cls(a.avg)+'">'+fmtR(a.avg)+'</span>)';
  if(!good.length)return '<div class="hint">الان پیشنهادی نمی‌دهم: در 40 روز گذشته هیچ قاعده‌ای بعد از کارمزد سود نداده'+
    (best?' — بهترینش '+nm(best):'')+'. یعنی این روزها شکست‌ها و تقاطع‌ها ادامه پیدا نکرده‌اند؛ معامله روی آن‌ها شرط‌بندی است.</div>';
  return '<div class="hint">قاعده‌های سودده: '+good.map(nm).join('، ')+'. الان روی هیچ ارزی رویداد تازه‌ای (در '+faN(AS_FRESH)+' ساعت اخیر) نداشته‌اند'+
    (sg.rejReg?'، یا '+faN(sg.rejReg)+' رویدادشان خلاف حال بازار بود':'')+'؛ هر نیم ساعت دوباره بررسی می‌شود.'+
    (sg.rejBad?' '+faN(sg.rejBad)+' رویداد تازه‌ی دیگر مال قاعده‌هایی بود که سود نداده‌اند.':'')+'</div>';
}
function asWire(g){
  const sg=asSuggestions();
  g.querySelectorAll('.assig').forEach(w=>{const x=sg.list[+w.dataset.as];if(!x)return;
    w.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
      if(b.dataset.a==='iso')asEnter(x);
      else copyExch(asPost(x),asSig(x),{stop:x.pl.SL,market:'futures'},PRICES.get(x.tk)||x.pl.E);});});
  const r=g.querySelector('[data-asrun]');if(r)r.onclick=()=>{asScan(true);paintGlance();};
  const k=g.querySelector('[data-asrules]');if(k)k.onclick=sheetAsRules;
}
function sheetAsRules(){
  const st=asRuleStats();
  const row=k=>{const a=st[k];if(!a)return '<tr><td>'+esc(AS_RULES[k].t)+'</td><td colspan="4" class="num">—</td></tr>';
    const c=(n,w,r)=>n?faN(n)+' · '+faN(Math.round(w/n*100))+'٪ · <span class="'+cls(r/n)+'">'+fmtR(r/n)+'</span>':'—';
    return '<tr><td>'+esc(AS_RULES[k].t)+lowN(a.N)+'</td><td>'+(AS_RULES[k].dir==='long'?'لانگ':'شورت')+'</td><td class="num">'+c(a.n,a.w,a.r)+'</td><td class="num">'+c(a.fn,a.fw,a.fr)+'</td><td>'+(a.ok?'<span class="pill win">پیشنهاد می‌شود</span>':'<span class="pill mut">نه</span>')+'</td></tr>';};
  openSheet('<h3>کارنامه‌ی قاعده‌های پیشنهاد برنامه</h3>'+
    '<div class="sub">هر قاعده روی کندل یک‌ساعته‌ی حدود 40 روز گذشته‌ی '+faN(Object.keys(AS.coins||{}).length)+' ارز: ورود با بسته شدن کندل، استاپ 1.5×ATR، هدف '+fmtNum(+(S.rMul&&S.rMul[0])||1.5)+'R، حداکثر '+faN(AS_HOLD)+' ساعت، بعد از کارمزد و لغزش. ستون دوم فقط روزهایی است که حال بازار (بیت‌کوین) خلاف جهت نبوده. پیشنهاد فقط وقتی که دست‌کم '+faN(AS_MINN)+' بار و میانگین بالای +0.05R.</div>'+
    '<div class="tscroll"><table class="tp xtab"><thead><tr><th>قاعده</th><th>جهت</th><th>همه (بار · برد · R)</th><th>با فیلتر بازار</th><th></th></tr></thead><tbody>'+
    Object.keys(AS_RULES).map(row).join('')+'</tbody></table></div>'+
    '<div class="srow"><button class="btn" id="cx">بستن</button></div>',()=>{$('#cx').onclick=closeSheet;});
}
