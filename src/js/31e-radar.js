/* ==================== رادار بازار: ۲۰ تا ۱۰۰ ارز اول، لانگ یا شورت، با امتیاز و اولویت ====================
   برای هر ارز (به جز استیبل‌کوین و توکن‌های بسته‌بندی‌شده) از کندل یک‌ساعته‌ی ~۴۱ روز:
   ۸ عامل ← امتیاز خالص از −۱۰۰ (شورت) تا +۱۰۰ (لانگ). بالای ۳۰ لانگ، زیر −۳۰ شورت، بینش «صبر».
   «شانس» ساختگی نیست: همین امتیاز روی همین ۴۱ روزِ همین ارزها هر ۲ ساعت حساب و با همان نقشه
   (استاپ ۱٫۵×ATR، هدف تارگت اول تنظیمات، حداکثر ۲۴ ساعت، بعد از کارمزد) سنجیده می‌شود؛ هر ارز
   امروز با کارنامه‌ی امتیازهای مشابهش در گذشته رتبه می‌گیرد. فاندینگ فیوچرز فقط اطلاع است (تاریخچه ندارد). */
const RD_KEY='signaldesk.radar.v1', RD_W={t4:20,t1:15,macd:15,rsi:10,brk:10,vol:10,btc:15,ext:5}, RD_TH=30;
const RD_FA={t4:'روند 4 ساعته',t1:'روند 1 ساعته',macd:'MACD',rsi:'RSI',brk:'شکست 7 روزه',vol:'حجم',btc:'بیت‌کوین',ext:'فاصله از میانگین'};
const RD_SKIP=/^(USDT|USDC|FDUSD|TUSD|DAI|BUSD|USDP|USDD|USDE|SUSDE|USDS|PYUSD|USD0|USD1|RLUSD|EURC|EURT|PAXG|XAUT|WBTC|WETH|WBETH|STETH|WSTETH|WEETH|CBBTC|BTCB|RETH|METH|LEO|BSC-USD|BFUSD|USDF)$/;
let RD=(()=>{const a=lsGet(RD_KEY);return a&&a.v===1?a:{v:1,at:0,n:20,coins:{},calib:{},fund:{},rank:[]};})();
const RDQ={on:false,done:0,n:0};

/* ---- اندیکاتورها (آرایه‌ای، یک بار برای همه‌ی کندل‌ها) ---- */
function emaArr(a,n){const k=2/(n+1),o=new Array(a.length);let e=a[0];for(let i=0;i<a.length;i++){e=i?a[i]*k+e*(1-k):a[0];o[i]=e;}return o;}
function rsiArr(c,n){const o=new Array(c.length).fill(50);let g=0,l=0;
  for(let i=1;i<c.length;i++){const d=c[i]-c[i-1],up=Math.max(d,0),dn=Math.max(-d,0);
    if(i<=n){g+=up/n;l+=dn/n;}else{g=(g*(n-1)+up)/n;l=(l*(n-1)+dn)/n;}
    if(i>=n)o[i]=l===0?100:100-100/(1+g/l);}
  return o;}
const clamp1=v=>Math.max(-1,Math.min(1,v));
/* همه‌ی سری‌های لازم برای امتیاز؛ ۴ ساعته فقط از کندل‌های کاملِ گذشته (بی نگاه به آینده) */
function rdPrep(C,B){
  const H=36e5,c=C.map(k=>k.c),v=C.map(k=>k.v||0);
  const e20=emaArr(c,20),e50=emaArr(c,50),m12=emaArr(c,12),m26=emaArr(c,26);
  const macd=c.map((_,i)=>m12[i]-m26[i]),sig=emaArr(macd,9),hist=macd.map((x,i)=>x-sig[i]),rsi=rsiArr(c,14);
  const F=swAggr(C,4*H),f=F.map(k=>k.c),f20=emaArr(f,20),f50=emaArr(f,50),fIdx=new Map(F.map((k,j)=>[k.t,j]));
  // بیت‌کوین: روند ۴ ساعته در هر لحظه (برای هم‌جهتی آلت‌ها)
  let bt=null;
  if(B&&B.length>250){const BF=swAggr(B,4*H),bf=BF.map(k=>k.c),b20=emaArr(bf,20),b50=emaArr(bf,50);
    bt=new Map(BF.map((k,j)=>[k.t,j>=50?clamp1((b20[j]-b50[j])/b50[j]/0.01):null]));}
  return {C,c,v,e20,e50,hist,rsi,F,f20,f50,fIdx,bt};
}
/* امتیاز در کندل i (بسته‌شده): {net, parts:{عامل: مقدار −۱..+۱}} */
function rdScore(P,i){
  const {C,c,v,e20,e50,hist,rsi,f20,f50,fIdx,bt}=P, H=36e5;
  if(i<200)return null;
  const j=fIdx.get(Math.floor((C[i].t+H)/(4*H))*4*H-4*H);            // آخرین ۴ ساعتِ کامل
  if(j==null||j<50)return null;
  const atr=asAtr(C,i);if(!atr)return null;
  const p={};
  p.t4=clamp1((f20[j]-f50[j])/f50[j]/0.01);
  p.t1=(Math.sign(c[i]-e50[i])+Math.sign(e20[i]-e50[i]))/2;
  p.macd=0.6*Math.sign(hist[i])+0.4*Math.sign(hist[i]-hist[i-1]);
  const r=rsi[i];p.rsi=r>75?-0.5:r<25?0.5:clamp1((r-50)/20);
  let lo=Infinity,hi=-Infinity;for(let q=i-168;q<i;q++){if(C[q].l<lo)lo=C[q].l;if(C[q].h>hi)hi=C[q].h;}
  p.brk=c[i]>hi?1:c[i]<lo?-1:0;
  let a=0;for(let q=i-26;q<i-2;q++)a+=v[q];a/=24;const rv=a>0?(v[i]+v[i-1]+v[i-2])/3/a:1;
  p.vol=Math.sign(c[i]-c[i-3])*(rv>=1.5?1:Math.max(0,(rv-1)/0.5));
  p.btc=bt?(bt.get(Math.floor((C[i].t+H)/(4*H))*4*H-4*H)??0):0;
  const ex=(c[i]-e20[i])/atr;p.ext=Math.abs(ex)>3?-Math.sign(ex):0;
  let net=0;for(const k in RD_W)net+=RD_W[k]*(p[k]||0);
  return {net:Math.round(net),parts:p,rsi:r,rv,atrPct:atr/c[i]*100};
}
const rdDir=net=>net>=RD_TH?'long':net<=-RD_TH?'short':'wait';
const rdBucket=a=>a>=60?'60+':a>=45?'45-60':'30-45';
/* سنجش گذشته‌ی یک ارز: هر ۲ ساعت، امتیاز ← معامله با نقشه‌ی ثابت ← R خالص */
function rdBacktest(P,cal){
  const C=P.C;
  for(let i=210;i<C.length-25;i+=2){
    const s=rdScore(P,i);if(!s)continue;const d=rdDir(s.net);if(d==='wait')continue;
    const pl=asPlan(C,i,d);if(!pl)continue;const w=asWalk(C,i,pl);if(!w)continue;
    const k=d+'|'+rdBucket(Math.abs(s.net)), o=cal[k]||(cal[k]={n:0,w:0,r:0});
    o.n++;o.r+=w.R;if(w.R>0)o.w++;
  }
}
/* ---- فهرست ارزها: بر اساس ارزش بازار (CoinGecko، روزی یک بار)، وگرنه حجم معامله ---- */
const RDCAP_KEY='signaldesk.mcap.v1';
let RDCAP=lsGet(RDCAP_KEY)||null;
async function rdCapLoad(){
  if(RDCAP&&Date.now()-RDCAP.at<864e5)return RDCAP;
  try{const got=await fetchVia('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1',
      {json:true,timeout:12000,kind:'px',quiet:true,label:'ارزش بازار (CoinGecko)',validate:d=>Array.isArray(d)&&d.length>50});
    RDCAP={at:Date.now(),list:got.data.map(x=>String(x.symbol||'').toUpperCase())};lsSet(RDCAP_KEY,RDCAP);}catch(e){}
  return RDCAP;
}
function rdUniverse(n){
  const src=RDCAP&&RDCAP.list&&RDCAP.list.length?RDCAP.list:(MKT&&MKT.top)||['BTC','ETH','XRP','BNB','SOL','DOGE','TRX','ADA','LINK','AVAX','SUI','XLM','TON','HBAR','BCH','LTC','DOT','NEAR','APT','UNI'];
  const out=[];
  for(const t of src){if(!/^[A-Z0-9]{2,12}$/.test(t)||RD_SKIP.test(t)||MK_STABLE.test(t)||MK_LEV.test(t))continue;if(!out.includes(t))out.push(t);if(out.length>=n)break;}
  return out;
}
/* فاندینگ فیوچرز بایننس (همه‌ی نمادها در یک درخواست): مثبتِ زیاد یعنی لانگ‌ها شلوغ‌اند */
async function rdFundLoad(){
  try{const got=await fetchVia('https://fapi.binance.com/fapi/v1/premiumIndex',{json:true,timeout:10000,kind:'px',quiet:true,label:'فاندینگ',validate:d=>Array.isArray(d)&&d.length>20});
    const m={};for(const x of got.data)if(/USDT$/.test(x.symbol))m[x.symbol.slice(0,-4)]=+x.lastFundingRate*100;return m;}catch(e){return null;}
}
async function rdScan(force){
  if(RDQ.on)return;
  if(!force&&Date.now()-RD.at<30*60000&&RD.rank.length)return;
  await rdCapLoad();
  const U=rdUniverse(RD.n||20);
  Object.assign(RDQ,{on:true,done:0,n:U.length});rdPaintProg();
  let B=null;try{B=await mkCandles('BTC');}catch(e){}
  const fundP=rdFundLoad();
  const coins={}, cal={}, q=U.slice();
  const worker=async()=>{while(q.length){const tk=q.shift();
    try{const C=tk==='BTC'&&B?B:await mkCandles(tk);
      if(C&&C.length>300){const P=rdPrep(C,tk==='BTC'?null:B);rdBacktest(P,cal);
        const L=C.length-1, s=rdScore(P,L);
        if(s){const d=rdDir(s.net);coins[tk]={net:s.net,dir:d,parts:s.parts,rsi:s.rsi,rv:s.rv,atrPct:s.atrPct,px:C[L].c,
          pl:d==='wait'?null:asPlan(C,L,d,PRICES.get(tk)||C[L].c)};}}}
    catch(e){}
    RDQ.done++;rdPaintProg();}};
  await Promise.all([worker(),worker()]);
  const fund=await fundP;
  RD=Object.assign(RD,{at:Date.now(),coins,calib:cal,fund:fund||RD.fund||{},rank:U.filter(t=>coins[t])});
  lsSet(RD_KEY,RD);RDQ.on=false;
  if(view==='signals')renderSignals();
}
const rdPaintProg=()=>{const b=$('#rdProg');if(b)b.textContent=RDQ.on?'در حال بررسی '+faN(RDQ.done)+' از '+faN(RDQ.n)+' ارز…':(RD.at?ageTxt(RD.at):'');};
/* اولویت: میانگین R امتیازهای مشابه در گذشته (همان جهت و همان بازه‌ی امتیاز)، بعد شدت امتیاز */
function rdList(){
  const out=[];
  for(const tk of RD.rank){const x=RD.coins[tk];if(!x)continue;
    const cb=x.dir==='wait'?null:RD.calib[x.dir+'|'+rdBucket(Math.abs(x.net))];
    const exp=cb&&cb.n>=20?cb.r/cb.n:null;
    out.push(Object.assign({tk,cb,exp,ok:exp!=null&&exp>0.03},x));}
  out.sort((a,b)=>(b.ok-a.ok)||((b.exp??-9)-(a.exp??-9))||(Math.abs(b.net)-Math.abs(a.net)));
  return out;
}
const rdCount=()=>rdList().filter(x=>x.ok).length;
function rdReasons(x){
  const want=x.dir==='short'?-1:1, it=[];
  for(const k of Object.keys(RD_W)){const v=x.parts[k]||0;if(Math.abs(v)<0.25)continue;
    let t=RD_FA[k];
    if(k==='t4'||k==='t1')t+=v>0?' صعودی':' نزولی';
    else if(k==='macd')t+=v>0?' مثبت':' منفی';
    else if(k==='rsi')t+=' '+fmtNum(x.rsi)+(x.rsi>75?' (اشباع خرید)':x.rsi<25?' (اشباع فروش)':'');
    else if(k==='brk')t=v>0?'شکست سقف 7 روزه':'شکست کف 7 روزه';
    else if(k==='vol')t='حجم '+fmtNum(x.rv)+' برابر میانگین '+(v>0?'با رشد':'با ریزش');
    else if(k==='btc')t+=v>0?' صعودی':' نزولی';
    else if(k==='ext')t='خیلی دور از میانگین (احتمال برگشت)';
    it.push({t,good:x.dir==='wait'?null:Math.sign(v)===want,w:Math.round(RD_W[k]*Math.abs(v))});
  }
  return it.sort((a,b)=>b.w-a.w);
}
function rdHtml(){
  const L=rdList(), act=L.filter(x=>x.dir!=='wait'), wait=L.filter(x=>x.dir==='wait');
  const tot=Object.values(RD.calib||{}).reduce((s,o)=>s+o.n,0);
  let h='<div class="glh"><b>'+ic('trend')+'رادار بازار</b><span>'+(L.length?faN(L.filter(x=>x.ok).length)+' فرصت با سابقه‌ی مثبت از '+faN(L.length)+' ارز':'')+'</span></div><div class="glb">';
  h+='<div class="rdbar"><div class="pbpick rdn">'+[20,50,100].map(n=>'<button class="pbc'+((RD.n||20)===n?' on':'')+'" data-rdn="'+n+'">'+faN(n)+' ارز اول</button>').join('')+'</div>'+
    '<button class="btn sm" data-rdrun="1"'+(RDQ.on?' disabled':'')+'>'+ic('refresh')+'<span>بررسی دوباره</span></button><small id="rdProg">'+(RDQ.on?'':RD.at?ageTxt(RD.at):'')+'</small></div>';
  if(!RD.at&&!RDQ.on)h+='<div class="hint">هنوز بررسی نشده؛ همین الان شروع می‌شود.</div>';
  if(MKT)h+=mktHtml(MKT,null);
  act.forEach((x,i)=>{
    const z=x.pl?isoSize(x.pl.E,x.pl.SL):null, f=RD.fund&&RD.fund[x.tk];
    const R=rdReasons(x);
    h+='<div class="glsig rdit'+(x.ok?'':' weak')+'" data-rd="'+esc(x.tk)+'"><div class="glit"><span class="rdrk">'+faN(i+1)+'</span><b dir="ltr">'+esc(x.tk)+'</b><span class="pill '+x.dir+'">'+(x.dir==='long'?'لانگ':'شورت')+'</span>'+
      '<span class="rdsc '+(x.net>0?'u':'d')+'">امتیاز '+faN(Math.abs(x.net))+'</span>'+(x.ok?'':'<small>سابقه‌ی ضعیف</small>')+'</div>'+
      (x.cb?'<div class="glnum glh2">امتیازهای مشابه در گذشته ('+(x.dir==='long'?'لانگ':'شورت')+'، '+rdBucket(Math.abs(x.net))+'): '+faN(x.cb.n)+' بار، '+faN(Math.round(x.cb.w/x.cb.n*100))+'٪ برد، میانگین <b class="'+cls(x.exp)+'">'+fmtR(x.cb.r/x.cb.n)+'</b> بعد از کارمزد</div>':'')+
      '<div class="glnum rdwhy">'+R.map(r=>'<span class="pill '+(r.good==null?'mut':r.good?'win':'lose')+'">'+(r.good?'✓ ':r.good===false?'✗ ':'')+esc(r.t)+'</span>').join('')+
        (f!=null&&Math.abs(f)>=0.03?'<span class="pill mut" title="فاندینگ فیوچرز؛ در امتیاز نیست">فاندینگ '+fmtNum(f)+'٪ '+(f>0?'(لانگ‌ها شلوغ)':'(شورت‌ها شلوغ)')+'</span>':'')+
        (RD.fund&&Object.keys(RD.fund).length&&f==null?'<span class="pill mut">فیوچرز بایننس ندارد</span>':'')+'</div>'+
      (x.pl?'<div class="glnum">ورود <b dir="ltr">'+fmtPrice(x.pl.E)+'</b> · استاپ <b dir="ltr">'+fmtPrice(x.pl.SL)+'</b> ('+fmtNum(x.pl.sd*100)+'٪) · هدف <b dir="ltr">'+fmtPrice(x.pl.TP)+'</b> · حداکثر '+faN(AS_HOLD)+' ساعت</div>':'')+
      '<div class="glact">'+(z?'<button class="btn sm ok" data-a="iso">'+ic('shield')+'<span>ایزوله '+faN(z.lev)+'x · '+fmtUsd(z.margin)+'</span></button>':'')+
        '<button class="btn sm side" data-a="copy" title="برای اپ صرافی">'+ic('share')+'</button></div></div>';
  });
  if(wait.length)h+='<div class="hint rdwait"><b>صبر</b> (امتیاز بین −'+faN(RD_TH)+' و +'+faN(RD_TH)+'، جهت روشن نیست): '+wait.map(x=>esc(x.tk)+' <span class="'+cls(x.net)+'" dir="ltr">'+(x.net>0?'+':'')+faN(x.net)+'</span>').join('، ')+'</div>';
  h+='<div class="hint">امتیاز از 8 عامل: روند 4 ساعته (EMA20/50)، روند 1 ساعته، MACD، RSI، شکست 7 روزه، حجم، روند بیت‌کوین و فاصله از میانگین. «سابقه» همین امتیاز روی ~41 روز گذشته‌ی همین '+faN(L.length)+' ارز است ('+faN(tot)+' نمونه، هم‌پوشان)؛ اولویت با سابقه‌ی بهتر. سود گذشته تضمین آینده نیست.</div></div>';
  return h;
}
function paintRadar(g){
  g.className='glance gltab';g.innerHTML=rdHtml();
  if(!RDQ.on&&(Date.now()-RD.at>30*60000||!RD.rank.length))setTimeout(()=>rdScan(),300);
  g.querySelectorAll('[data-rdn]').forEach(b=>b.onclick=()=>{RD.n=+b.dataset.rdn;lsSet(RD_KEY,RD);rdScan(true);paintRadar(g);});
  const r=g.querySelector('[data-rdrun]');if(r)r.onclick=()=>{rdScan(true);paintRadar(g);};
  g.querySelectorAll('.rdit').forEach(w=>{const x=rdList().find(y=>y.tk===w.dataset.rd);if(!x||!x.pl)return;
    const k={tk:x.tk,k:'radar',t:RD.at,pl:x.pl,dir:x.dir};
    w.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
      const p={id:'radar/'+x.tk+'/'+RD.at,num:0,text:'رادار بازار: '+x.tk+' '+(x.dir==='long'?'لانگ':'شورت')+' · امتیاز '+Math.abs(x.net),date:new Date(),link:null,img:null,auto:true};
      if(b.dataset.a==='iso'){const z=isoSize(x.pl.E,x.pl.SL);
        sheetEnter(p,asSig(k),{stop:x.pl.SL,lev:z?z.lev:null,amt:z?z.margin:null,market:'futures'},PRICES.get(x.tk)||x.pl.E,
          {iso:true,note:'رادار بازار · امتیاز '+Math.abs(x.net),until:Date.now()+AS_HOLD*36e5});}
      else copyExch(p,asSig(k),{stop:x.pl.SL,market:'futures'},PRICES.get(x.tk)||x.pl.E);});});
}
