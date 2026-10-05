/* ==================== اسکلپ زنده ==================== */
/* همان اسکلپ رنجِ نوسان‌سنج (لانگ روی کف ⇄ شورت روی سقف، استاپ آن سوی رنج)، این بار با قیمت زنده:
   هر «جلسه» یک رنج روی یک نماد است. برنامه با هر قیمت تازه همان scalpStep را یک قدم جلو می‌برد،
   معامله‌ها را باز و بسته می‌کند و هر بار خبر می‌دهد (پیغام، اعلان، لرزش) که الان چه بگیری.
   به صرافی سفارشی نمی‌رود و جدا از پوزیشن‌ها و کارنامه است (DB.scalps).
   - قیمت: هر ۱۵ ثانیه فقط نمادهای جلسه‌های فعال (اول مارک پرایس فیوچرز)، به‌علاوه‌ی قیمت‌های معمول برنامه.
   - وقتی برنامه بسته بوده (فاصله‌ی بیش از ۳ دقیقه)، فاصله با کندل ۱ دقیقه‌ای پر می‌شود.
   - قیمت بین دو نمونه دیده نمی‌شود: سایه‌ای که در کمتر از ۱۵ ثانیه برگشته ممکن است جا بماند. */
const SCSEENKEY='signaldesk.scseen.v1';
const SCSEEN=lsGet(SCSEENKEY)||{};          // شناسه‌ی جلسه ← {t,p}: آخرین قیمتی که روی این دستگاه سنجیده شد
const SCPX=new Map();                        // نماد ← {px,at} از نمونه‌گیریِ خودِ اسکلپ
const SCOPEN=new Set();                      // تاریخچه‌های باز (بعد از رندرِ دوباره باز بمانند)
const SC_GAP=3*60e3, SC_KEEP=100, SC_EVERY=15000;
function scSeenSave(){
  const ids=new Set((DB.scalps||[]).map(s=>s.id));
  for(const k of Object.keys(SCSEEN))if(!ids.has(k))delete SCSEEN[k];
  lsSet(SCSEENKEY,SCSEEN);
}
const scList=()=>Array.isArray(DB.scalps)?DB.scalps:[];
const scCfg=s=>({L:s.L,H:s.H,d:s.d,lev:s.lev,fee:s.fee,first:s.first,mg:s.mg});
const scSeen=s=>SCSEEN[s.id]||{t:s.at,p:s.st&&s.st.prev};
/* تازه‌ترین قیمتِ یک نماد و زمانش: نمونه‌ی اسکلپ، مارک پرایس یا قیمت معمول برنامه */
function scPxAt(tk){
  let best=null;
  const a=SCPX.get(tk);if(a)best={px:a.px,at:a.at};
  const m=MARK_AT&&Date.now()-MARK_AT<5*60e3&&MARK.get(tk);
  if(m&&(!best||MARK_AT>best.at))best={px:m,at:MARK_AT};
  const p=PRICES.get(tk);
  if(p&&PX_AT&&(!best||PX_AT>best.at))best={px:p,at:PX_AT};
  return best;
}
const scPx=tk=>{const q=scPxAt(tk);return q?q.px:null;};

/* ---- قیمتِ تک‌نماد، بی‌سروصدا (نوار بالا و گزارش پر نشود) ---- */
const SC_PX=[
  {n:'Binance فیوچرز',u:s=>'https://fapi.binance.com/fapi/v1/premiumIndex?symbol='+s+'USDT',p:d=>parseFloat(d&&d.markPrice)},
  {n:'Binance',u:s=>'https://api.binance.com/api/v3/ticker/price?symbol='+s+'USDT',p:d=>parseFloat(d&&d.price)},
  {n:'MEXC',u:s=>'https://api.mexc.com/api/v3/ticker/price?symbol='+s+'USDT',p:d=>parseFloat(d&&d.price)},
  {n:'OKX',u:s=>'https://www.okx.com/api/v5/market/ticker?instId='+s+'-USDT',p:d=>parseFloat(d&&d.data&&d.data[0]&&d.data[0].last)},
  {n:'Gate',u:s=>'https://api.gateio.ws/api/v4/spot/tickers?currency_pair='+s+'_USDT',p:d=>parseFloat(Array.isArray(d)&&d[0]&&d[0].last)}
];
const SCSRC={};
async function scFetchPx(tk){
  const order=SC_PX.map((_,i)=>i), pref=SCSRC[tk];
  if(pref!=null){order.splice(order.indexOf(pref),1);order.unshift(pref);}
  for(const i of order){
    const src=SC_PX[i];
    const opt={json:true,timeout:6000,kind:'px',quiet:true,label:'قیمت اسکلپ '+tk+' · '+src.n,
      validate:d=>{const v=src.p(d);return isFinite(v)&&v>0;}};
    try{
      const good=goodFor('px');let got=null;
      if(good)got=await fetchVia(src.u(tk),Object.assign({onlyRoutes:[good]},opt)).catch(()=>null);
      if(!got)got=await fetchVia(src.u(tk),opt);
      const px=src.p(got.data);
      SCSRC[tk]=i;SCPX.set(tk,{px,at:Date.now()});
      return px;
    }catch(e){}
  }
  return null;
}

/* ---- موتور ----
   P: نقطه‌های قیمت {t,p} به ترتیب زمان. رویدادها (باز شدن، تارگت، استاپ) به ev اضافه می‌شوند. */
function scFeed(s,P,ev,late){
  const before=s.st.pos?s.st.pos.t+':'+s.st.pos.en+':'+s.st.pos.side:null;
  const tr=scalpStep(P,scCfg(s),s.st);
  for(const x of tr){
    const t=Object.assign({},x,{usd:x.roi/100*s.mg,by:x.win?'tp':x.liq?'liq':'stop'});
    s.trades.push(t);
    s.n=(s.n||0)+1;if(x.win)s.w=(s.w||0)+1;else s.l=(s.l||0)+1;
    s.roi=(s.roi||0)+x.roi;s.usd=(s.usd||0)+t.usd;
    ev.push({s,k:t.by,x:t,late});
  }
  if(s.trades.length>SC_KEEP)s.trades=s.trades.slice(-SC_KEEP);
  const pos=s.st.pos, now=pos?pos.t+':'+pos.en+':'+pos.side:null, lt=tr[tr.length-1];
  // معامله‌ی تازه‌ای باز شده که ادامه‌ی همان «بستن سر تارگت و برعکس» نیست
  if(now&&now!==before&&!(lt&&lt.win&&pos.en===lt.ex&&pos.t===lt.t1))ev.push({s,k:'open',late});
  return tr.length>0||now!==before;
}
function scMsg(e){
  const s=e.s, fa=x=>x==='long'?'لانگ':'شورت', pos=s.st.pos;
  if(e.k==='open')return s.tk+': '+fa(pos.side)+' از '+fmtPrice(pos.en)+' باز شد · تارگت '+fmtPrice(pos.side==='long'?s.H:s.L);
  const x=e.x, r=fmtUsd(x.usd)+' ('+fmtPct(x.roi)+')';
  if(e.k==='tp')return s.tk+': تارگت '+fa(x.side)+' روی '+fmtPrice(x.ex)+' خورد '+r+(pos?' — همان‌جا '+fa(pos.side)+' بگیر':'');
  return s.tk+': '+(e.k==='liq'?'لیکوئید ':'استاپ ')+fa(x.side)+' روی '+fmtPrice(x.ex)+' '+r+' — صبر تا قیمت به کف یا سقف برگردد';
}
function scReport(ev){
  save();
  const msgs=ev.map(e=>(e.late?'(وقتی برنامه بسته بود) ':'')+scMsg(e));
  const msg=msgs.length>3?msgs.slice(-3).join('؛ ')+' (و '+faN(msgs.length-3)+' مورد قبل‌تر)':msgs.join('؛ ');
  logIt('info','اسکلپ زنده — '+msgs.join('؛ '));
  const bad=ev.some(e=>e.k==='stop'||e.k==='liq');
  toast(esc(msg),bad?'err':'ok');
  try{if(navigator.vibrate)navigator.vibrate(bad?[200,80,200]:[120,60,120]);}catch(e){}
  if(F('notify'))notify('اسکلپ زنده',msg,'scalp'+ev[ev.length-1].s.id);
  renderAll();
}
/* با هر قیمت تازه. فاصله‌ی طولانی (برنامه بسته بوده) با کندل پر می‌شود */
function checkScalp(){
  const L=scList().filter(s=>s.on);
  if(!L.length)return false;
  const now=Date.now(), ev=[], late=[];
  for(const s of L){
    const seen=scSeen(s), q=scPxAt(s.tk);
    if(now-seen.t>SC_GAP){late.push(s);continue;}
    if(!q||q.at<=seen.t)continue;              // قیمتی تازه‌تر از آخرین سنجش نیامده
    if(seen.p!=null)s.st.prev=seen.p;
    scFeed(s,[{t:q.at,p:q.px}],ev);
    SCSEEN[s.id]={t:q.at,p:q.px};
  }
  scSeenSave();
  if(ev.length)scReport(ev);
  else if(view==='scalp')paintScalpLive();
  if(late.length)scCatchUp(late);
  return ev.length>0;
}
const SCBUSY=new Set();
async function scCatchUp(list){
  for(const s0 of list){
    if(SCBUSY.has(s0.id))continue;
    SCBUSY.add(s0.id);
    try{
      const seen=scSeen(s0), now=Date.now();
      let C=[];
      try{C=await swCandlesTf(s0.tk,'1m',seen.t,now);}
      catch(e){logIt('warn','اسکلپ زنده: کندل '+s0.tk+' نیامد؛ فاصله‌ی '+faN(Math.round((now-seen.t)/6e4))+' دقیقه سنجیده نشد');}
      const s=scList().find(x=>x.id===s0.id);
      if(!s||!s.on||scSeen(s).t!==seen.t)continue;       // در این فاصله عوض شده (توقف، حذف، همگام‌سازی)
      const ev=[];
      if(seen.p!=null)s.st.prev=seen.p;
      const W=C.filter(k=>k.t+6e4>seen.t);
      if(W.length)scFeed(s,swPts(W),ev,true);
      let t=W.length?Math.min(Date.now(),W[W.length-1].t+6e4):Date.now(), p=W.length?W[W.length-1].c:seen.p;
      const q=scPxAt(s.tk);
      if(q&&q.at>t){scFeed(s,[{t:q.at,p:q.px}],ev);t=q.at;p=q.px;}
      SCSEEN[s.id]={t,p};scSeenSave();
      if(ev.length)scReport(ev);else if(view==='scalp')paintScalpLive();
    }catch(e){logIt('err','اسکلپ زنده '+s0.tk+': '+e.message);}
    finally{SCBUSY.delete(s0.id);}
  }
}
let SCTICK=false;
async function scTick(){
  if(SCTICK||document.hidden)return;
  const act=scList().filter(s=>s.on);
  if(!act.length)return;
  SCTICK=true;
  try{await Promise.all([...new Set(act.map(s=>s.tk))].map(tk=>scFetchPx(tk)));checkScalp();}
  catch(e){}
  finally{SCTICK=false;}
}
setInterval(scTick,SC_EVERY);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(scTick,300);});

/* ---- شروع، بستن، توقف ---- */
function scStart(o,now){
  const t=Date.now(), px=now?scPx(o.tk):null;
  const s={id:uid(),tk:o.tk,L:o.L,H:o.H,d:o.d,lev:o.lev,mg:o.mg,fee:+S.fee||0,first:o.first,on:true,at:t,
    st:{pos:now?{side:o.first,en:px,t}:null,started:!!now,prev:px},trades:[],n:0,w:0,l:0,roi:0,usd:0};
  DB.scalps.unshift(s);
  SCSEEN[s.id]={t,p:px};scSeenSave();
  save();
  logIt('info','اسکلپ زنده شروع شد: '+s.tk+' '+fmtPrice(s.L)+' ⇄ '+fmtPrice(s.H)+(now?' · '+(o.first==='long'?'لانگ':'شورت')+' همین الان از '+fmtPrice(px):''));
  return s;
}
function scStartSheet(o){
  if(!o||!/^[A-Z0-9]{2,15}$/.test(o.tk||''))return toast('اول نماد را بسنج','err');
  if(!(o.L>0&&o.H>o.L))return toast('رنج معتبر نیست: کف باید از سقف کمتر باشد','err');
  const fx=v=>v==null?'':String(+(+v).toPrecision(6));
  let now=false;
  openSheet('<h3>اسکلپ زنده · <bdi dir="ltr">'+esc(o.tk)+'</bdi></h3>'+
    '<div class="sub">برنامه با قیمت زنده جلو می‌رود: روی کف لانگ، روی سقف می‌بندد و همان‌جا شورت، روی کف می‌بندد و دوباره لانگ… '+
      'هر بار پیغام می‌دهد چه بگیری. به صرافی سفارشی نمی‌رود؛ جدا از پوزیشن‌ها و کارنامه است.</div>'+
    '<div class="grid swopt">'+
      '<div class="fld"><label>کف رنج (ورود لانگ)</label><input id="scL" dir="ltr" inputmode="decimal" value="'+fx(o.L)+'"></div>'+
      '<div class="fld"><label>سقف رنج (ورود شورت)</label><input id="scH" dir="ltr" inputmode="decimal" value="'+fx(o.H)+'"></div>'+
      '<div class="fld"><label>استاپ لانگ (زیر کف)</label><input id="scSL" dir="ltr" inputmode="decimal" placeholder="خالی = بی‌استاپ" value="'+(o.d!=null?fx(o.L-o.d):'')+'"></div>'+
      '<div class="fld"><label>اولین معامله</label><select id="scFirst"><option value="long">لانگ روی کف</option><option value="short">شورت روی سقف</option></select></div>'+
      '<div class="fld"><label>اهرم</label><input id="scLev" type="number" min="1" max="125" inputmode="decimal" value="'+fx(o.lev)+'"></div>'+
      '<div class="fld"><label>مارجین هر معامله ($)</label><input id="scMg" dir="ltr" inputmode="decimal" value="'+fx(o.mg)+'"></div>'+
    '</div>'+
    '<div class="hint" id="scInfo"></div>'+
    '<div class="tgl">ورود</div>'+
    '<div class="pbpick" id="scWhen"><button class="pbc on" data-now="0" aria-pressed="true">صبر تا رسیدن قیمت به ورود</button>'+
      '<button class="pbc" data-now="1" aria-pressed="false">همین الان با قیمت فعلی</button></div>'+
    '<div class="srow"><button class="btn pri" id="scGo">'+ic('play')+'<span>شروع</span></button><button class="btn" id="cx">انصراف</button></div>',
  sh=>{
    $('#scFirst').value=o.first==='short'?'short':'long';
    $('#cx').onclick=closeSheet;
    const num=id=>{const v=parseFloat(normDig(String($(id).value||'')).replace(/,/g,''));return isFinite(v)&&v>0?v:null;};
    const read=()=>{
      const L=num('#scL'), H=num('#scH'), sl=num('#scSL'), lev=Math.min(125,Math.max(1,num('#scLev')||10)), mg=num('#scMg')||+S.cap||10;
      return {tk:o.tk,L,H,d:sl!=null&&L!=null&&sl<L?L-sl:null,lev,mg,first:$('#scFirst').value,badSl:sl!=null&&L!=null&&sl>=L};
    };
    const info=()=>{
      const r=read(), px=scPx(o.tk), b=$('#scInfo');if(!b)return;
      if(!(r.L&&r.H&&r.H>r.L)){b.innerHTML='<span class="d">کف باید از سقف کمتر باشد.</span>';return;}
      const w=(r.H/r.L-1)*100, f=(+S.fee||0)*r.lev;
      b.innerHTML='استاپ لانگ '+(r.d!=null?'<b dir="ltr">'+fmtPrice(r.L-r.d)+'</b>':'ندارد')+' · استاپ شورت '+(r.d!=null?'<b dir="ltr">'+fmtPrice(r.H+r.d)+'</b>':'ندارد')+
        ' · هر بُرد حدود <b class="u">'+fmtUsd((w*r.lev-f)/100*r.mg)+'</b>'+
        (r.d!=null?' · هر استاپ حدود <b class="d">'+fmtUsd(-((r.d/r.L)*100*r.lev+f)/100*r.mg)+'</b>':'')+
        '<br>قیمت الان: '+(px!=null?'<b dir="ltr">'+fmtPrice(px)+'</b>':'در حال گرفتن…')+
        (r.badSl?'<br><span class="d">استاپ لانگ باید زیر کف باشد؛ نادیده گرفته شد.</span>':'')+
        (r.d==null&&1/r.lev-MMR>0?'<br><span class="d">بی‌استاپ: خلاف جهت تا لیکوئید (حدود '+fmtNum((1/r.lev-MMR)*100)+'٪) می‌ماند.</span>':'');
    };
    sh.querySelectorAll('input,select').forEach(i=>i.oninput=i.onchange=info);
    sh.querySelectorAll('#scWhen .pbc').forEach(b=>b.onclick=()=>{now=b.dataset.now==='1';
      sh.querySelectorAll('#scWhen .pbc').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b);});});
    info();
    scFetchPx(o.tk).then(info);
    $('#scGo').onclick=()=>{
      const r=read();
      if(!(r.L&&r.H&&r.H>r.L))return toast('کف باید از سقف کمتر باشد','err');
      if(now){
        const px=scPx(o.tk);
        if(px==null)return toast('قیمت '+o.tk+' هنوز نیامده؛ چند ثانیه بعد دوباره بزن','err');
        const ok=r.first==='long'?px<r.H&&(r.d==null||px>r.L-r.d):px>r.L&&(r.d==null||px<r.H+r.d);
        if(!ok)return toast('قیمت الان ('+fmtPrice(px)+') بیرون از محدوده‌ی این '+(r.first==='long'?'لانگ':'شورت')+' است؛ «صبر تا ورود» را بزن','err');
      }
      const s=scStart(r,now);
      closeSheet();
      SCOPEN.delete(s.id);
      go('scalp',true);
      setTimeout(()=>{const c=$('#sc-'+s.id);if(c)c.scrollIntoView({block:'center',behavior:'smooth'});},120);
      toast(now?'اسکلپ '+s.tk+' شروع شد؛ '+(r.first==='long'?'لانگ':'شورت')+' همین الان باز است':'اسکلپ '+s.tk+' شروع شد؛ منتظر رسیدن قیمت به '+fmtPrice(r.first==='long'?r.L:r.H),'ok');
      setTimeout(scTick,200);
    };
  });
}
/* بستنِ دستیِ معامله‌ی باز روی قیمت فعلی؛ جلسه ادامه دارد و منتظر کف یا سقف می‌ماند */
function scCloseNow(s,why){
  const pos=s.st.pos;if(!pos)return null;
  const px=scPx(s.tk);if(px==null){toast('قیمت '+s.tk+' هنوز نیامده','err');return null;}
  const roi=scalpRoi(scCfg(s),pos.side,pos.en,px,false), t=Date.now();
  const x={side:pos.side,en:pos.en,ex:px,t0:pos.t,t1:t,win:roi>0,roi,usd:roi/100*s.mg,by:'man'};
  s.trades.push(x);if(s.trades.length>SC_KEEP)s.trades=s.trades.slice(-SC_KEEP);
  s.n=(s.n||0)+1;if(x.win)s.w=(s.w||0)+1;else s.l=(s.l||0)+1;s.roi=(s.roi||0)+roi;s.usd=(s.usd||0)+x.usd;
  s.st.pos=null;s.st.started=true;s.st.prev=px;
  SCSEEN[s.id]={t,p:px};scSeenSave();
  return x;
}
function scAct(id,k){
  const s=scList().find(x=>x.id===id);if(!s)return;
  if(k==='close'){
    const x=scCloseNow(s);if(!x)return;
    save();renderAll();toast(s.tk+': بسته شد روی '+fmtPrice(x.ex)+' '+fmtUsd(x.usd)+'؛ منتظر کف یا سقف','ok');
  }else if(k==='stop'){
    undoable(s.tk+': اسکلپ متوقف شد'+(s.st.pos?' و معامله‌ی باز بسته شد':''),()=>{if(s.st.pos)scCloseNow(s);s.on=false;});
  }else if(k==='resume'){
    const px=scPx(s.tk);
    s.on=true;s.st.prev=px;SCSEEN[s.id]={t:Date.now(),p:px};scSeenSave();   // فاصله‌ی توقف سنجیده نمی‌شود
    save();renderAll();toast(s.tk+': اسکلپ دوباره روشن شد','ok');setTimeout(scTick,200);
  }else if(k==='del'){
    undoable(s.tk+': اسکلپ پاک شد',()=>{DB.scalps=scList().filter(x=>x.id!==id);});
  }
}

/* ---- تب اسکلپ ---- */
function renderScalp(){
  const box=$('#scBody');if(!box)return;
  box.innerHTML='';
  try{box.appendChild(buildSwingPanel(null,'scalp'));}
  catch(e){logIt('err','تب اسکلپ: '+(e&&e.message||e));box.appendChild(el('div','panel audfail','<b>بخش سنجش ساخته نشد</b><br><span dir="ltr">'+esc(String(e&&e.message||e).slice(0,160))+'</span>'));}
  const lv=el('div','sclive');lv.id='scLive';box.appendChild(lv);
  paintScalpLive();
}
function paintScalpBadge(){
  const n=scList().filter(s=>s.on&&s.st&&s.st.pos).length, b=$('#cScalp');
  if(b){b.textContent=faN(n);b.classList.toggle('z',!n);b.title=n?faN(n)+' اسکلپ باز':'';}
}
function paintScalpLive(){
  const box=$('#scLive');if(!box)return;
  if(DRAGGING)return;
  const L=scList();
  box.innerHTML='';
  box.appendChild(el('div','sechd schd','<b>اسکلپ‌های زنده</b>'+(L.length?'<span>'+faN(L.filter(s=>s.on).length)+' روشن</span>':'')));
  if(!L.length){
    box.appendChild(el('div','empty sm','هنوز اسکلپی روشن نکرده‌ای. نماد را بالا بسنج، بعد «شروع اسکلپ زنده» را بزن؛ '+
      'برنامه با قیمت زنده لانگ و شورت را روی کف و سقف رنج جلو می‌برد و هر بار خبرت می‌کند.'));
    paintScalpBadge();return;
  }
  for(const s of L)box.appendChild(scCard(s));
  box.appendChild(el('div','hint','قیمت هر ۱۵ ثانیه گرفته می‌شود (تا وقتی برنامه باز است)؛ اگر بسته بوده، با کندل ۱ دقیقه‌ای عقب‌مانده پر می‌شود. '+
    'لغزش و فاندینگ حساب نشده. این شبیه‌سازی است؛ سفارش را خودت در صرافی بگذار.'));
  paintScalpBadge();
}
function scCard(s){
  const pos=s.st&&s.st.pos, live=scPx(s.tk), cfg=scCfg(s), fa=x=>x==='long'?'لانگ':'شورت';
  const roi=pos&&live!=null?scalpRoi(cfg,pos.side,pos.en,live,false):null, usd=roi!=null?roi/100*s.mg:null;
  const card=el('div','card scard'+(pos?' d-'+pos.side+(usd?(usd>0?' pu':' pd'):''):'')+(s.on?'':' off'));card.id='sc-'+s.id;
  const head=el('div','chead');
  head.appendChild(el('span','tick',s.tk));
  head.appendChild(el('span','pill gold','اسکلپ'));
  if(pos)head.appendChild(el('span','pill '+pos.side,fa(pos.side)));
  head.appendChild(el('span','pill mut',(+s.lev)+'x'));
  head.appendChild(el('span','pill '+(!s.on?'mut':pos?'open':'gold'),!s.on?'متوقف':pos?'باز':'منتظر ورود'));
  head.appendChild(el('div','when',(pos?'باز: '+jStampFa(new Date(pos.t)):'شروع: '+jStampFa(new Date(s.at)))));
  card.appendChild(head);
  const b=el('div','body');
  if(pos){
    const hero=el('div','pnlhero');
    hero.innerHTML='<div><span class="lab">سود/ضرر شناور</span><div class="big '+cls(usd)+'">'+fmtUsd(usd)+'</div></div>'+
      '<div><span class="lab">روی مارجین</span><div class="lp '+cls(roi)+'">'+fmtPct(roi)+'</div></div>'+
      '<div class="side"><span class="lab">قیمت الان</span><div class="lp">'+(live!=null?fmtPrice(live):'—')+'</div></div>';
    b.appendChild(hero);
    const v=scalpLv(cfg,pos.side);
    const p={id:'sc-'+s.id,ticker:s.tk,kind:'fut',dir:pos.side,entry:pos.en,stop:v.liq?null:v.adv,targets:[v.tp],lev:s.lev,
      margin:s.mg,baseMargin:s.mg,status:'scalp',openedAt:pos.t,partials:[],log:[]};
    try{b.appendChild(buildLadder(p,live,posMetrics(p,live)));}catch(e){}
    b.appendChild(el('div','scnext',ic('bolt')+'<span>'+(pos.side==='long'?'روی <b dir="ltr">'+fmtPrice(s.H)+'</b> ببند و همان‌جا شورت بگیر':'روی <b dir="ltr">'+fmtPrice(s.L)+'</b> ببند و همان‌جا لانگ بگیر')+
      (v.adv!=null?' · '+(v.liq?'لیکوئید':'استاپ')+' <b dir="ltr">'+fmtPrice(v.adv)+'</b>':'')+'</span>'));
  }else{
    const want=s.st.started?'لانگ روی <b dir="ltr">'+fmtPrice(s.L)+'</b> یا شورت روی <b dir="ltr">'+fmtPrice(s.H)+'</b>'
      :(s.first==='long'?'لانگ روی <b dir="ltr">'+fmtPrice(s.L)+'</b>':'شورت روی <b dir="ltr">'+fmtPrice(s.H)+'</b>');
    const dist=live!=null?(s.st.started?Math.min(Math.abs(live/s.L-1),Math.abs(live/s.H-1)):Math.abs(live/(s.first==='long'?s.L:s.H)-1))*100:null;
    b.appendChild(el('div','scnext wait',ic('clock')+'<span>'+(s.on?'منتظر: ':'متوقف · ')+want+
      (live!=null?' · قیمت الان <b dir="ltr">'+fmtPrice(live)+'</b> ('+fmtNum(dist)+'٪ فاصله)':'')+'</span>'));
  }
  const kv=el('div','kv');
  kv.innerHTML='<div class="k"><b>رنج</b><span dir="ltr">'+fmtPrice(s.L)+' ⇄ '+fmtPrice(s.H)+'</span></div>'+
    '<div class="k"><b>استاپ لانگ / شورت</b><span dir="ltr">'+(s.d!=null?fmtPrice(s.L-s.d)+' / '+fmtPrice(s.H+s.d):'بی‌استاپ')+'</span></div>'+
    '<div class="k"><b>مارجین هر معامله</b><span>'+fmtUsd(s.mg)+'</span></div>'+
    '<div class="k"><b>معامله‌ی بسته</b><span class="rt">بُرد <bdi>'+faN(s.w||0)+'</bdi> · باخت <bdi>'+faN(s.l||0)+'</bdi> · از <bdi>'+faN(s.n||0)+'</bdi></span></div>'+
    '<div class="k"><b>جمع سود/ضرر</b><span class="rt big '+cls(s.usd)+'"><bdi>'+fmtUsd(s.usd||0)+'</bdi> · <bdi>'+fmtPct(z0(s.roi||0))+'</bdi> روی مارجین</span></div>';
  b.appendChild(kv);
  const act=el('div','srow');
  const btn=(k,t,c,icn)=>{const x=el('button','btn sm'+(c?' '+c:''),(icn?ic(icn):'')+'<span>'+t+'</span>');x.dataset.k=k;x.onclick=()=>scAct(s.id,k);act.appendChild(x);};
  if(pos&&s.on)btn('close','همین الان ببند','pri','door');
  if(s.on)btn('stop','توقف','', 'pause');else btn('resume','ادامه','pri','play');
  btn('del','حذف','','trash');
  b.appendChild(act);
  if(s.trades&&s.trades.length){
    const hm=t=>'<bdi>'+jStampFa(new Date(t)).slice(5)+'</bdi>';
    const rows=s.trades.slice().reverse().map(x=>'<tr><td class="sd '+x.side+'">'+fa(x.side)+'</td>'+
      '<td><span class="num" dir="ltr">'+fmtPrice(x.en)+' → '+fmtPrice(x.ex)+'</span><small>'+hm(x.t1)+' · '+({tp:'تارگت',stop:'استاپ',liq:'لیکوئید',man:'دستی'}[x.by]||'')+'</small></td>'+
      '<td class="num '+(x.usd>=0?'u':'d')+'"><bdi>'+fmtUsd(x.usd)+'</bdi><small>'+fmtPct(z0(x.roi))+'</small></td></tr>').join('');
    const d=el('details','sec sub2 sctr');d.open=SCOPEN.has(s.id);
    d.innerHTML='<summary>معامله‌ها ('+faN(s.trades.length)+(s.n>s.trades.length?' از '+faN(s.n):'')+')</summary>'+
      '<div class="tscroll"><table class="tp"><thead><tr><th>جهت</th><th>ورود → خروج</th><th>سود/ضرر</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    d.addEventListener('toggle',()=>{d.open?SCOPEN.add(s.id):SCOPEN.delete(s.id);});
    b.appendChild(d);
  }
  card.appendChild(b);
  return card;
}
