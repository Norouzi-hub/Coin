/* ==================== نمای پوزیشن‌ها ==================== */
let posFilter='open';
let DRAGGING=false;               // وقتی دستگیره استاپ زیر انگشت است، رندر دوباره نباید بپرد
const PENDING=new Map();          // استاپ جابجاشده و هنوز تأیید نشده، برای هر پوزیشن
/* قیمتِ یک پوزیشن: فیوچرز با مارک پرایس (همانی که صرافی استاپ و لیکوئید را با آن می‌سنجد)،
   اسپات یا وقتی مارک در دسترس نیست با قیمت لحظه‌ای بازار اسپات */
const markOf=p=>p&&p.kind!=='spot'&&MARK_AT&&Date.now()-MARK_AT<5*60e3&&MARK.get(p.ticker)||null;
const pxOf=p=>markOf(p)||PRICES.get(p.ticker)||null;
/* منبع پوزیشن: «کانال» (از پست کانال) یا «خودم» (رادار یا دستی؛ «پیشنهاد برنامه»ی قدیمی هم).
   از شناسه‌ی پستی که از آن وارد شدی؛ کاربر در فرم ویرایش می‌تواند عوضش کند (p.srcK). */
function posSrc(p){
  let sid=p&&(p.sigId||p.postId);
  if(p&&!sid)for(const [k,d] of Object.entries(DB.decisions))if(d&&d.posId===p.id){sid=k;break;}
  const sub=sid&&/^radar\//.test(sid)?'radar':sid&&/^auto\//.test(sid)?'auto':sid?'ch':'manual';
  const k=p&&(p.srcK==='ch'||p.srcK==='me')?p.srcK:sub==='ch'?'ch':'me';
  return {k,sub:k==='ch'?'ch':sub==='ch'?'manual':sub};
}
const POSSRC_FA={ch:'کانال',radar:'خودم · رادار',auto:'خودم · پیشنهاد برنامه',manual:'خودم · دستی'};
const posSrcPill=p=>{const s=posSrc(p);return el('span','pill psrc '+s.k,s.k==='ch'?'کانال':s.sub==='radar'?'رادار':s.sub==='auto'?'برنامه':'خودم');};
let POSSRC=(()=>{try{return localStorage.getItem('signaldesk.possrc')||'all';}catch(e){return 'all';}})();
/* کانال در برابر خودم: معامله‌های بسته، هر گروه جدا */
function srcCompareHtml(closed,noHead){
  if(!closed.length)return '';
  const G={ch:[],me:[],radar:[],auto:[],manual:[]};
  for(const p of closed){const s=posSrc(p);G[s.k].push(p);if(s.k==='me')G[s.sub].push(p);}
  const row=(k,lab,sub)=>{const L=G[k];if(!L.length)return '';const a=agg(L);
    return '<tr'+(sub?' class="sub"':'')+'><td>'+lab+'</td><td class="num">'+faN(a.n)+'</td><td class="num">'+(a.winRate!=null?faN(Math.round(a.winRate))+'٪':'—')+'</td>'+
      '<td class="num '+cls(a.pnl)+'"><bdi>'+fmtUsd(a.pnl)+'</bdi></td><td class="num '+cls(a.avgR)+'"><bdi>'+(a.avgR!=null?fmtR(a.avgR):'—')+'</bdi></td></tr>';};
  const subs=['radar','auto','manual'].filter(k=>G[k].length);
  return '<div class="srccmp">'+(noHead?'':'<div class="sechd">کانال در برابر خودم (بسته‌شده‌ها)</div>')+'<div class="tscroll"><table class="tp xtab"><thead><tr><th></th><th>تعداد</th><th>برد</th><th>خالص</th><th>میانگین R</th></tr></thead><tbody>'+
    row('ch','<span class="pill psrc ch">کانال</span>')+row('me','<span class="pill psrc me">خودم</span>')+
    (G.me.length?subs.map(k=>row(k,'— '+POSSRC_FA[k].replace('خودم · ',''),true)).join(''):'')+'</tbody></table></div></div>';
}

function buildPendingCard(w){
  const px=PRICES.get(w.ticker);
  const old=pendingStale(w);
  const c=el('div','card d-'+w.dir+(w.hit?' hitcard':'')+(old?' old':''));
  const head=el('div','chead');
  head.appendChild(el('span','tick',esc(w.ticker)));
  if(w.market==='spot')head.appendChild(el('span','pill gold','اسپات'));
  else head.appendChild(el('span','pill '+w.dir,w.dir==='long'?'لانگ':'شورت'));
  head.appendChild(el('span','pill '+(w.hit?'win':'mut'),w.hit?'رسید':old?ic('clock')+'قدیمی شد':'منتظر'));
  if(w.kind==='tier2')head.appendChild(el('span','pill gold','پله‌ی دوم'));
  if(w.tf&&!w.hit)head.appendChild(el('span','pill mut',(w.touch?'لمس شد · ':'')+'بسته شدن کندل '+TF_FA[w.tf]));
  head.appendChild(el('div','when',relTime(new Date(w.at))));
  c.appendChild(head);

  const kv=el('div','briefkv');kv.style.margin='0 14px 10px';
  const add=(l,v,cl)=>{const d=el('div','bk');d.appendChild(el('b',null,l));
    d.appendChild(el('span',cl||null,v));kv.appendChild(d);};
  add('تریگر',fmtPrice(w.trigger));
  add('قیمت الان',px!=null?fmtPrice(px):'—',px==null?'m':null);
  if(px!=null){
    const gap=((w.trigger-px)/px)*100;
    add('فاصله',fmtPct(gap),Math.abs(gap)<1?'w':'m');
  }else add('حد ضرر',w.stop!=null?fmtPrice(w.stop):'—','m');
  c.appendChild(kv);

  const a=el('div','acts');
  if(old)c.appendChild(el('div','staletx',
    'قیمت تا قدیمی شدنِ سیگنال به تریگر نرسید؛ دیگر منتظرش نیستیم و هشدار نمی‌دهد. برای مرور مانده — برش دار.'));
  const b1=el('button','btn '+(w.hit?'pri':''),ic('check')+'<span>ورود با این تریگر</span>');
  b1.onclick=()=>fillPending(w);
  if(old)b1.classList.add('hide');
  const b2=el('button','btn dgr xs','برداشتن');
  b2.onclick=()=>undoable('سفارش منتظر برداشته شد',()=>{DB.pending=DB.pending.filter(x=>x.id!==w.id);});
  a.appendChild(b1);a.appendChild(b2);
  c.appendChild(a);
  return c;
}
/* سود/ضرر درشت کارت‌ها: وقتی عوض می‌شود، از مقدار قبلی تا تازه روان شمرده می‌شود
   (بار اول از صفر). فقط با «افکت‌های نورانی» و وقتی «کاهش حرکت» روشن نیست. */
const LASTPNL=new Map();
function countUps(){
  if(!F('fx')||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;
  for(const n of $$('#posList .pnlhero .big[data-cu]')){
    const id=n.dataset.cu, v=parseFloat(n.dataset.v);
    if(!isFinite(v))continue;
    const from=LASTPNL.has(id)?LASTPNL.get(id):0;LASTPNL.set(id,v);
    if(Math.abs(from-v)<0.005)continue;
    const t0=performance.now(), dur=750;
    const step=t=>{if(!n.isConnected)return;
      const k=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-k,3);
      n.textContent=fmtUsd(from+(v-from)*e);
      if(k<1)requestAnimationFrame(step);};
    requestAnimationFrame(step);
  }
}
/* فهرست پوزیشن‌ها با هر قیمت تازه و هر باز/بسته کردن کارت از نو ساخته می‌شود؛ جای خواندن
   (اولین کارتی که زیر سربرگ پیداست) قبل و بعدش یکی می‌ماند تا صفحه نپرد */
function renderPositions(){
  if(DRAGGING)return;
  let a=null;
  if(window.scrollY>4&&!$('#vPositions').classList.contains('hide')){
    const edge=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdrH'))||0;
    for(const c of $('#posList').querySelectorAll('.card[id]')){const r=c.getBoundingClientRect();
      if(r.bottom>edge+4){a={id:c.id,top:r.top};break;}}
  }
  renderPositions0();
  if(a){const c=document.getElementById(a.id);
    if(c){const dy=c.getBoundingClientRect().top-a.top;if(Math.abs(dy)>0.5)window.scrollBy(0,dy);}}
}
function renderPositions0(){
  queueMicrotask(countUps);
  const wrap=$('#posList'), sum=$('#posSummary');
  wrap.innerHTML='';sum.innerHTML='';
  const nWait=DB.pending.length, nAct=activePending().length;
  const cw=$('#cWait');if(cw){cw.textContent=faN(nAct);cw.classList.toggle('z',!nAct);}
  for(const[id,v]of[['pWait','pending'],['pOpen','open'],['pClosed','closed'],['pAllP','all']]){
    const b=$('#'+id);if(b){b.classList.toggle('on',posFilter===v);b.setAttribute('aria-pressed',posFilter===v?'true':'false');}}
  if(posFilter==='pending'){
    {const ps=$('#posSort');if(ps)ps.parentElement.classList.add('hide');}
    if(!nWait){wrap.appendChild(el('div','empty',STAR+
      'سفارش منتظری نداری.<br>روی سیگنالی که تریگر ورود دارد،<br>دکمه‌ی «منتظر …» را بزن.'));return;}
    for(const w of [...DB.pending].sort((x,y)=>(y.hit||0)-(x.hit||0)||y.at-x.at))
      wrap.appendChild(buildPendingCard(w));
    return;
  }
  const every=[...DB.positions].sort((a,b)=>(b.closedAt||b.openedAt)-(a.closedAt||a.openedAt));
  // فیلتر منبع: همه / کانال / خودم (روی دستگاه می‌ماند)؛ آمار بالا هم مال همان منبع است
  if(every.length){
    const nC=every.filter(p=>posSrc(p).k==='ch').length, row=el('div','frow psrcbar');
    for(const [k,t,n] of [['all','همه',every.length],['ch','کانال',nC],['me','خودم',every.length-nC]]){
      const b=el('button','fc'+(POSSRC===k?' on':''),'<span>'+t+'</span><i>'+faN(n)+'</i>');b.setAttribute('aria-pressed',POSSRC===k?'true':'false');
      b.onclick=()=>{POSSRC=k;try{localStorage.setItem('signaldesk.possrc',k);}catch(e){}renderPositions();};row.appendChild(b);}
    sum.appendChild(row);
  }
  const all=POSSRC==='all'?every:every.filter(p=>posSrc(p).k===POSSRC);
  const open=all.filter(p=>p.status==='open');

  let unreal=0,hasLive=false;
  for(const p of open){const l=pxOf(p);if(l){const m=posMetrics(p,l);if(m.pnl!=null){unreal+=m.pnl;hasLive=true;}}}
  const todayKey=jKey(new Date());
  const todayPnl=all.filter(p=>p.status==='closed'&&p.closedAt&&jKey(new Date(p.closedAt))===todayKey)
    .reduce((s,p)=>s+(posMetrics(p).pnl||0),0);
  if(all.length){
    const st=el('div','stats');
    let h='';
    const add=(l,v,c,sub)=>h+='<div class="st"><b>'+l+'</b><span class="'+(c||'')+'">'+v+'</span>'+(sub?'<small>'+sub+'</small>':'')+'</div>';
    add('پوزیشن باز',faN(open.length),open.length?'':'m');
    add('سود/ضرر باز',hasLive?fmtUsd(unreal):'—',hasLive?cls(unreal):'m','شناور');
    add('امروز',fmtUsd(todayPnl),cls(todayPnl),'بسته‌شده');
    const totalClosed=all.filter(p=>p.status==='closed').reduce((s,p)=>s+(posMetrics(p).pnl||0),0);
    add('مجموع خالص',fmtUsd(totalClosed),cls(totalClosed));
    st.innerHTML=h;sum.appendChild(st);
    if(POSSRC==='all'){const cmp=srcCompareHtml(every.filter(p=>p.status==='closed'),true);if(cmp){const d=el('details','sec sub2 srcwrap','<summary>کانال در برابر خودم (بسته‌شده‌ها)</summary>'+cmp);sum.appendChild(d);}}
    const limit=S.acct*(S.daily/100);
    if(todayPnl<0&&Math.abs(todayPnl)>=limit){
      sum.appendChild(el('div','status bad','امروز '+fmtUsd(todayPnl)+' ضرر کرده‌ای و این از حد روزانه‌ات ('+
        fmtUsd(-limit)+' یعنی '+S.daily+'٪ حساب) گذشته. اگر برای خودت این حد را گذاشته‌ای، امروز را همین‌جا ببند.'));
    }else if(todayPnl<0&&Math.abs(todayPnl)>=limit*0.6){
      sum.appendChild(el('div','status warn','امروز '+fmtUsd(todayPnl)+' ضرر کرده‌ای؛ نزدیک حد روزانه‌ات ('+fmtUsd(-limit)+') هستی.'));
    }
  }

  const show=all.filter(p=>posFilter==='all'||p.status===posFilter);
  /* مرتب‌سازی انتخابی (روی دستگاه می‌ماند). سود/ضرر پوزیشن باز با قیمت الان حساب می‌شود. */
  const so=POSSORT, mv=new Map(show.map(p=>[p.id,posMetrics(p,p.status==='open'?pxOf(p):undefined)]));
  const t0=p=>p.closedAt||p.openedAt, pn=p=>mv.get(p.id).pnl??-Infinity, rr=p=>mv.get(p.id).r??-Infinity;
  const cmp={new:(a,b)=>t0(b)-t0(a),old:(a,b)=>t0(a)-t0(b),pnlD:(a,b)=>pn(b)-pn(a),
    pnlA:(a,b)=>(mv.get(a.id).pnl??Infinity)-(mv.get(b.id).pnl??Infinity),rD:(a,b)=>rr(b)-rr(a),
    tk:(a,b)=>String(a.ticker).localeCompare(String(b.ticker))||t0(b)-t0(a)}[so]||null;
  if(cmp)show.sort(cmp);
  const ps=$('#posSort');if(ps){ps.value=so;ps.parentElement.classList.toggle('hide',show.length<2);}
  if(!show.length){
    wrap.appendChild(el('div','empty',STAR+(all.length?'در این دسته چیزی نیست.':
      'هنوز پوزیشنی ثبت نکرده‌ای.<br>از تب سیگنال‌ها «وارد شدم» را بزن، یا اینجا دستی اضافه کن.')));
    return;
  }
  let i=0;
  for(const p of show){
    const c=buildPosCard(p,{acc:show.length>1});
    if(i<6){c.classList.add('enter');c.style.setProperty('--d',(i*45)+'ms');}
    i++;wrap.appendChild(c);
  }
}

/* ---- محدوده‌ی نوار قیمت ---- */
function ladderDomain(p,live,m){
  const v=[p.entry];
  if(p.stop)v.push(p.stop);
  if(PENDING.has(p.id))v.push(PENDING.get(p.id));
  if(live)v.push(live);
  if(m&&m.liqPrice)v.push(m.liqPrice);
  if(p.status==='closed'&&p.exitPrice)v.push(p.exitPrice);
  for(const t of (p.targets||[]).slice(0,3))if(isFinite(t)&&t>0)v.push(t);
  for(const x of partialsOf(p))if(x.price)v.push(x.price);
  let lo=Math.min(...v), hi=Math.max(...v);
  if(!(hi>lo)){lo=p.entry*0.97;hi=p.entry*1.03;}
  const pad=(hi-lo)*0.12;
  return {lo:lo-pad,hi:hi+pad};
}
const pctOf=(d,v)=>clamp(((v-d.lo)/(d.hi-d.lo))*100,0,100);
const priceAt=(d,pct)=>d.lo+(d.hi-d.lo)*clamp(pct,0,1);

function buildLadder(p,live,m,opts){
  const ro=p.status!=='open';
  const d=ladderDomain(p,live,m);
  const L=el('div','ladder'+(ro?' ro':''));
  const stopShown=PENDING.has(p.id)?PENDING.get(p.id):p.stop;
  const sign=p.dir==='long'?1:-1;
  let h='<div class="track"></div>';

  // ناحیه‌ی بین ورود و استاپ: قرمز اگر ضرر است، سبز اگر سود قفل شده
  if(stopShown){
    const a=pctOf(d,p.entry), b=pctOf(d,stopShown);
    const lock=(p.dir==='long'&&stopShown>p.entry)||(p.dir==='short'&&stopShown<p.entry);
    h+='<div class="zone '+(lock?'lock':'risk')+'" style="left:'+Math.min(a,b)+'%;width:'+Math.abs(a-b)+'%"></div>';
  }
  const mark=(kind,price,label,sub,top)=>{
    if(price==null||!isFinite(price))return '';
    return '<div class="m '+kind+'" style="left:'+pctOf(d,price)+'%">'+
      '<div class="lb '+(top?'top':'bot')+'">'+fmtPrice(price)+(sub?'<small>'+sub+'</small>':'')+'</div></div>';
  };
  h+=mark('ent',p.entry,null,'ورود');
  if(m&&m.liqPrice)h+=mark('liq',m.liqPrice,null,'لیکوئید');
  for(const t of (p.targets||[]).slice(0,3)){
    if(!isFinite(t)||t<=0)continue;
    if(((t-p.entry)*sign)<=0)continue;
    h+=mark('tgt',t,null,'تارگت',true);
  }
  if(p.status==='closed'&&p.exitPrice)h+=mark('live',p.exitPrice,null,'خروج',true);
  else if(live)h+=mark('live',live,null,'الان',true);
  // دستگیره‌ی استاپ
  const sp=stopShown?pctOf(d,stopShown):pctOf(d,p.entry);
  h+='<div class="slb" style="left:'+sp+'%">'+(stopShown?'استاپ '+fmtPrice(stopShown):'بدون استاپ')+'</div>'+
     '<button class="hs2'+(stopShown?'':' none')+'" style="left:'+sp+'%" aria-label="جابجایی حد ضرر"></button>';
  L.innerHTML=h;

  if(!ro)attachDrag(L,p,d,opts);
  return L;
}
/* کشیدن دستگیره استاپ؛ تا تأیید نکنی چیزی ذخیره نمی‌شود */
function attachDrag(L,p,d,opts){
  const hs=L.querySelector('.hs2'), slb=L.querySelector('.slb'), zone=L.querySelector('.zone');
  let w=0,box=null;
  const live=pxOf(p);
  const move=e=>{
    const x=(e.clientX-box.left)/w;
    let v=priceAt(d,x);
    // استاپی که آن‌طرف قیمت فعلی باشد همان لحظه می‌خورد؛ اجازه نمی‌دهیم
    if(live){const eps=live*0.0008;v=p.dir==='long'?Math.min(v,live-eps):Math.max(v,live+eps);}
    v=roundP(v);
    if(opts&&opts.onStop)opts.onStop(v);else PENDING.set(p.id,v);
    const pc=pctOf(d,v);
    hs.style.left=pc+'%';slb.style.left=pc+'%';slb.textContent='استاپ '+fmtPrice(v);
    if(zone){
      const a=pctOf(d,p.entry);
      const lock=(p.dir==='long'&&v>p.entry)||(p.dir==='short'&&v<p.entry);
      zone.className='zone '+(lock?'lock':'risk');
      zone.style.left=Math.min(a,pc)+'%';zone.style.width=Math.abs(a-pc)+'%';
    }
    if(!(opts&&opts.onStop))paintStopBar(p);
  };
  const up=e=>{
    DRAGGING=false;L.classList.remove('drag');
    if(opts&&opts.onStopEnd)opts.onStopEnd();
    hs.releasePointerCapture&&hs.releasePointerCapture(e.pointerId);
    hs.removeEventListener('pointermove',move);
    hs.removeEventListener('pointerup',up);
    hs.removeEventListener('pointercancel',up);
  };
  hs.addEventListener('pointerdown',e=>{
    e.preventDefault();
    box=L.getBoundingClientRect();w=box.width;
    if(!w)return;
    DRAGGING=true;L.classList.add('drag');
    hs.setPointerCapture&&hs.setPointerCapture(e.pointerId);
    hs.addEventListener('pointermove',move);
    hs.addEventListener('pointerup',up);
    hs.addEventListener('pointercancel',up);
    move(e);
  });
  // با کلید هم می‌شود ریز تنظیم کرد
  hs.addEventListener('keydown',e=>{
    const k=e.key;
    if(k!=='ArrowLeft'&&k!=='ArrowRight')return;
    e.preventDefault();
    const cur=PENDING.has(p.id)?PENDING.get(p.id):(p.stop||p.entry);
    const step=(d.hi-d.lo)/200*(k==='ArrowRight'?1:-1);
    let v=roundP(cur+step);
    if(live){const eps=live*0.0008;v=p.dir==='long'?Math.min(v,live-eps):Math.max(v,live+eps);}
    PENDING.set(p.id,v);renderPositions();
    const n=document.querySelector('#pos-'+p.id+' .hs2');if(n)n.focus();
  });
}
/* نوار تأیید استاپ */
function paintStopBar(p){
  const host=document.querySelector('#pos-'+p.id+' .stopwrap');
  if(!host)return;
  if(!PENDING.has(p.id)){host.innerHTML='';return;}
  const v=PENDING.get(p.id), o=stopOutcome(p,v), old=p.stop;
  const lock=(p.dir==='long'&&v>p.entry)||(p.dir==='short'&&v<p.entry);
  host.innerHTML='<div class="stopbar">'+
    '<div class="t">استاپ جدید <b>'+fmtPrice(v)+'</b>'+(old?' (بود <b>'+fmtPrice(old)+'</b>)':'')+'<br>'+
      (lock?'سود قفل‌شده':'اگر بخورد')+': <b style="color:var(--'+(o&&o.pnl>=0?'up':'dn')+')">'+fmtUsd(o&&o.pnl)+
      '</b> یعنی <b>'+fmtR(o&&o.r)+'</b></div>'+
    '<button class="btn pri sm" data-a="ok">ثبت استاپ</button>'+
    '<button class="btn sm" data-a="no">لغو</button></div>';
  host.querySelector('[data-a="ok"]').onclick=()=>commitStop(p,v);
  host.querySelector('[data-a="no"]').onclick=()=>{PENDING.delete(p.id);renderPositions();};
}
function commitStop(p,v){
  ensureBase(p);
  const old=p.stop;
  p.stop=v;PENDING.delete(p.id);
  logAdd(p,'stop','حد ضرر '+(old?'از '+fmtPrice(old)+' ':'')+'روی '+fmtPrice(v)+
    ((p.dir==='long'&&v>p.entry)||(p.dir==='short'&&v<p.entry)?' — سود قفل شد':''));
  save();renderAll();toast('استاپ روی '+fmtPrice(v)+' ثبت شد','ok');
}

/* هر برچسبی که با برچسب قبلیِ همان سمت تداخل داشته باشد، یک ردیف پایین‌تر/بالاتر می‌رود.
   تا سه ردیف؛ بیشتر از آن نردبان بلند می‌شود و خودش مزاحم است. */
/* برچسب‌ها با درصد چیده می‌شوند، پس نشانه‌های نزدیک هم روی هم می‌افتند. اندازه‌ی واقعی
   فقط وقتی معلوم است که نردبان داخل صفحه باشد — برای همین بعد از رندر صدا زده می‌شود،
   نه موقع ساختن (آنجا هنوز وصل نیست و همه‌ی اندازه‌ها صفرند). */
function destackAll(){
  requestAnimationFrame(()=>{for(const L of $$('.ladder'))destack(L);});
}
function destack(L){
  if(!L.isConnected)return;
  const lanes=[['.lb.bot','down'],['.lb.top','up']];
  for(const [sel,dir] of lanes){
    const items=[...L.querySelectorAll(sel)]
      .map(e=>({e,r:e.getBoundingClientRect()}))
      .filter(x=>x.r.width>0)
      .sort((a,b)=>a.r.left-b.r.left);
    const lastRight=[];
    let deepest=0;
    for(const {e,r} of items){
      e.classList.remove('lv1','lv2','lv3');
      let t=0;
      while(lastRight[t]!=null&&r.left<lastRight[t]+6)t++;
      lastRight[t]=r.right;
      if(t>0){e.classList.add('lv'+Math.min(t,3));deepest=Math.max(deepest,Math.min(t,3));}
    }
    if(deepest)L.classList.add(dir==='down'?'deep'+deepest:'high'+deepest);
  }
}
/* کارت پوزیشن آکاردئونی: وقتی چند پوزیشن در فهرست است، هر کارت پیش‌فرض فقط سربرگ و
   سود/ضرر درشت را نشان می‌دهد؛ با زدن باز می‌شود (نردبان، عددها، نقشه‌ی خروج، دکمه‌ها).
   پوزیشنی که نوار تأیید استاپش باز است همیشه باز می‌ماند. */
const POSOPEN=new Set(), POSMENU=new Set();
let POSSORT=lsGet('signaldesk.possort.v1')||'new';
function buildPosCard(p,opt){
  ensureBase(p);
  const live=pxOf(p), m=posMetrics(p,live), open=p.status==='open';
  const acc=!!(opt&&opt.acc), tight=acc&&!POSOPEN.has(p.id)&&!PENDING.has(p.id);
  const card=el('div','card d-'+p.dir+(open&&m.pnl!=null&&Math.abs(m.pnl)>1e-9?(m.pnl>0?' pu':' pd'):'')+
    (acc?(tight?' pct':' pcopen'):''));card.id='pos-'+p.id;
  if(acc){
    card.addEventListener('click',e=>{
      if(e.target.closest('button,a,input,select,label,summary,.ladder,.stopwrap,.pmore'))return;
      if(!tight&&!e.target.closest('.chead'))return;           // کارت باز فقط با سربرگش بسته می‌شود
      tight?POSOPEN.add(p.id):POSOPEN.delete(p.id);renderPositions();
    });
  }

  const isSpot=p.kind==='spot';     // پوزیشن‌های قدیمی kind ندارند و همه فیوچرز بوده‌اند
  const fw=open?followsFor(p):[];
  const head=el('div','chead');
  head.appendChild(el('span','tick',p.ticker));
  {const sp=posSrcPill(p);sp.title='منبع: '+POSSRC_FA[posSrc(p).sub];head.appendChild(sp);}
  if(isSpot)head.appendChild(el('span','pill gold','اسپات'));
  else{
    head.appendChild(el('span','pill '+p.dir,p.dir==='long'?'لانگ':'شورت'));
    head.appendChild(el('span','pill mut',(+p.lev)+'x'));
  }
  if(open){
    head.appendChild(el('span','pill open','باز'));
    if(m.parts)head.appendChild(el('span','pill gold','پله‌ای'));
    if(m.liquidated)head.appendChild(el('span','pill lose','در محدوده لیکوئید'));
    // برچسب هشدار روی خود کارت، نه فقط یک پیغام گذرا
    else{const as=advCfg().on&&advCfg().cats.pos?alertState(p,live):null;if(as)head.appendChild(el('span','pill '+as.c+' alrt',as.t));}
    if(fw.length)head.appendChild(el('span','pill gold alrt','کانال: '+esc(FOLLOW_FA[fw[fw.length-1].f.kind])));
  }else{
    head.appendChild(el('span','pill '+((m.pnl||0)>=0?'win':'lose'),(m.pnl||0)>=0?'برد':'باخت'));
    if(p.autoBy)head.appendChild(el('span','pill mut',p.autoBy==='liq'?'لیکوئید خودکار':p.autoBy==='tp'?'بسته با نقشه':'استاپ خودکار'));
    if(p.viol&&p.viol.length)head.appendChild(el('span','pill lose','خلاف نقشه'));
  }
  if(acc)head.appendChild(el('i','pchev'));
  head.appendChild(el('div','when',(!open&&p.closedAt?'بسته: '+jStampFa(new Date(p.closedAt)):'باز: '+jStampFa(new Date(p.openedAt)))));
  card.appendChild(head);

  const b=el('div','body');

  // سود/ضرر درشت بالای کارت: چیزی که اول باید ببیند
  const hero=el('div','pnlhero');
  hero.innerHTML='<div><span class="lab">'+(open?'سود/ضرر شناور':'سود/ضرر نهایی')+'</span>'+
      '<div class="big '+cls(m.pnl)+'" data-cu="'+p.id+'" data-v="'+(m.pnl!=null?m.pnl:'')+'">'+fmtUsd(m.pnl)+'</div></div>'+
    '<div><span class="lab">'+(isSpot?'بازده':'روی مارجین')+'</span><div class="lp '+cls(m.pnl)+'">'+fmtPct(m.roi)+'</div></div>'+
    (m.r!=null?'<div><span class="lab">R</span><div class="lp '+cls(m.r)+'">'+fmtR(m.r)+'</div></div>':'')+
    '<div class="side"><span class="lab">'+(open?(markOf(p)?'مارک پرایس':'قیمت الان'):'قیمت خروج')+'</span>'+
      '<div class="lp'+(open&&flashOf(p.ticker)?' fl-'+flashOf(p.ticker):'')+'">'+
      (m.exit!=null?fmtPrice(m.exit):'—')+'</div></div>';
  b.appendChild(hero);

  b.appendChild(buildLadder(p,live,m));
  if(open)b.appendChild(el('div','ladhint',p.stop?'دستگیره طلایی را بکش تا حد ضرر جابجا شود':'برای گذاشتن حد ضرر، دستگیره را بکش'));
  const sw=el('div','stopwrap');b.appendChild(sw);

  const kv=el('div','kv');
  let kh='';
  const add=(l,v,c,big)=>kh+='<div class="k"><b>'+l+'</b><span class="'+(c||'')+(big?' big':'')+'">'+v+'</span></div>';
  add('ورود',fmtPrice(p.entry)+(m.parts?' (میانگین)':''));
  add(isSpot?'مبلغ باقی‌مانده':'مارجین باز',fmtUsd(p.margin));
  if(m.parts)add(isSpot?'کل مبلغ خرید':'مارجین کل',fmtUsd(m.base),'m');
  if(isSpot)add('مقدار '+p.ticker,(+m.qty.toPrecision(6))+'');
  else add('حجم',fmtUsd(m.notional));
  if(m.realized)add('سود قطعی‌شده',fmtUsd(m.realized),cls(m.realized));
  if(m.unreal!=null&&m.realized)add('شناور باقی‌مانده',fmtUsd(m.unreal),cls(m.unreal));
  if(m.movePct!=null)add('حرکت قیمت',fmtPct(m.movePct),cls(m.movePct));
  if(m.acctPct!=null)add('اثر روی حساب',fmtPct(m.acctPct),cls(m.pnl));
  add('حد ضرر',p.stop?fmtPrice(p.stop):'ندارد',p.stop?'':'w');
  if(p.stop&&open){
    const o=stopOutcome(p,p.stop);
    add('اگر استاپ بخورد',fmtUsd(o.pnl)+' ('+fmtR(o.r)+')',cls(o.pnl));
  }
  if(p.stop0!=null&&p.stop!=null&&Math.abs(p.stop0-p.stop)>1e-12)add('استاپ اولیه',fmtPrice(p.stop0),'m');
  if(!isSpot)add('لیکوئید',m.liqPrice==null?'ندارد':fmtPrice(m.liqPrice),m.liqPrice==null?'m':'d');
  if(!open&&p.fees!=null)add('کارمزد',fmtUsd(-(m.fees||0)),'m');
  if(m.funding)add('فاندینگ تخمینی',fmtUsd(-m.funding),cls(-m.funding));
  kv.innerHTML=kh;b.appendChild(kv);
  if(fw.length)b.appendChild(buildFollowBox(p,fw));
  if(open||p.pb)b.appendChild(buildPbBox(p,live));
  // برچسب ستاپ و حال؛ زدن رویش ویرایش می‌کند
  {const tr=el('div','tagrow',ic('tag'));
   tr.appendChild(el('span','pill '+(p.setup?'gold':'mut'),p.setup?esc(p.setup):'ستاپ؟'));
   tr.appendChild(el('span','pill '+(p.mood?(p.mood==='plan'?'win':'lose'):'mut'),p.mood?esc(MOOD_FA[p.mood]||p.mood):'حال؟'));
   tr.onclick=()=>sheetTags(p);tr.title='برچسب ستاپ و حال موقع ورود';
   b.appendChild(tr);}
  if(p.viol&&p.viol.length){
    const vr=el('div','violrow',ic('alert')+' '+[...new Set(p.viol.map(v=>VIOL_FA[v.k]||v.k))].join(' · '));
    const cl=el('button','mark ghost','اشتباه است، پاک کن');cl.type='button';
    cl.onclick=()=>undoable('تخلف پاک شد',()=>{delete p.viol;logAdd(p,'plan','برچسب تخلف پاک شد');});
    vr.appendChild(cl);b.appendChild(vr);
  }

  if(open&&live&&p.stop){
    const fl=el('div','flags');
    const hitStop=(p.dir==='long'&&live<=p.stop)||(p.dir==='short'&&live>=p.stop);
    if(m.liquidated)fl.appendChild(el('div','flag d','<i>✕</i><span>قیمت از محدوده لیکوئید رد شده. احتمالاً صرافی پوزیشن را بسته؛ اگر بسته شده با قیمت لیکوئید ثبتش کن.</span>'));
    else if(hitStop)fl.appendChild(el('div','flag d','<i>!</i><span>قیمت به حد ضررت رسیده یا رد کرده.</span>'));
    if(fl.children.length)b.appendChild(fl);
  }

  // میان‌برهای استاپ: هر کدام فقط نوار تأیید را باز می‌کند
  if(open&&live){
    const ch=el('div','chips');
    const mk=(txt,price,tip)=>{
      if(price==null||!isFinite(price)||price<=0)return;
      if(p.dir==='long'?price>=live:price<=live)return;
      const btn=el('button','btn xs',txt);btn.title=tip||'';
      btn.onclick=()=>{PENDING.set(p.id,roundP(price));renderPositions();
        const n=document.querySelector('#pos-'+p.id+' .stopbar');if(n)n.scrollIntoView({block:'nearest',behavior:'smooth'});};
      ch.appendChild(btn);
    };
    const fee=(p.margin*p.lev*(S.fee/100))/((p.margin*p.lev)/p.entry);   // کارمزد به واحد قیمت
    mk('سربه‌سر',p.entry+(p.dir==='long'?1:-1)*fee,'استاپ روی نقطه‌ای که با کارمزد هم ضرر نکنی');
    const half=p.entry+(live-p.entry)*0.5;
    mk('قفل نصف سود',half,'نصف سود فعلی را قفل می‌کند');
    const q75=p.entry+(live-p.entry)*0.75;
    mk('قفل 75٪ سود',q75);
    if(p.stop0!=null&&Math.abs((p.stop||0)-p.stop0)>1e-12)mk('برگرد به استاپ اولیه',p.stop0);
    if(ch.children.length)b.appendChild(ch);
  }

  if(p.note)b.appendChild(el('div','reply',esc(p.note)));

  // تاریخچه: هر جابجایی استاپ و هر خروج پله‌ای اینجا می‌ماند
  const parts=partialsOf(p), log=p.log||[];
  if(parts.length||log.length){
    const hd=el('details','hist');
    let items='';
    for(const l of log)items+='<li class="'+(l.k==='cut'?'cut':l.k==='add'?'add':'')+'"><time>'+
      jStampFa(new Date(l.at))+'</time>'+esc(l.t)+'</li>';
    hd.innerHTML='<summary>تاریخچه این پوزیشن ('+faN(log.length)+' رویداد)</summary><ol>'+items+'</ol>';
    b.appendChild(hd);
  }
  if(p.src&&p.src.link)b.appendChild(el('div',null,
    '<a href="'+p.src.link+'" target="_blank" rel="noopener" style="font-size:12px;color:var(--gold)">دیدن پست اصلی سیگنال</a>'));
  card.appendChild(b);

  const a=el('div','acts');
  if(open){
    // یک دکمه‌ی بستن: با قیمت لحظه و «چرا بستم»؛ «فرم کامل» داخل همان برگه است
    const c=el('button','btn pri',ic('door')+'<span>بستن</span>');c.onclick=()=>sheetQuickClose(p);
    const pc=el('button','btn',ic('scissors')+'<span>بستن بخشی</span>');pc.onclick=()=>sheetPartial(p);
    const ad=el('button','btn',ic('plus')+'<span>افزودن حجم</span>');ad.onclick=()=>sheetAdd(p);
    a.appendChild(c);a.appendChild(pc);a.appendChild(ad);
  }else{
    const r=el('button','btn','باز کردن دوباره');
    r.onclick=()=>{p.status='open';p.exitPrice=null;p.closedAt=null;p.fees=null;
      // بسته‌شدنِ خودکار را قبول نداری: وگرنه با قیمت بعدی دوباره بسته می‌شود
      if(p.autoBy){delete p.autoBy;p.autoOff=true;}
      logAdd(p,'open','دوباره باز شد');save();renderAll();toast('دوباره باز شد','ok');};
    a.appendChild(r);
  }
  /* کارهای فرعی (تصویر، ویرایش، حذف) پشت «⋯»: دکمه‌ی حذف دیگر یک ردیف کامل نمی‌گیرد */
  const mo=POSMENU.has(p.id);
  const more=el('button','btn icon pmbtn'+(mo?' on':''),ic('more'));
  more.title='کارهای بیشتر';more.setAttribute('aria-label','کارهای بیشتر');more.setAttribute('aria-expanded',mo?'true':'false');
  more.onclick=()=>{mo?POSMENU.delete(p.id):POSMENU.add(p.id);renderPositions();};
  a.appendChild(more);
  posRiskBits(p,head,b,open?a:null);                  // مهلت، لیکوئید پیش از استاپ، بستن سریع، «چرا بستم»
  card.appendChild(a);
  if(mo){
    const pm=el('div','pmore');
    const sh=el('button','btn',ic('share')+'<span>تصویر نتیجه</span>');sh.onclick=()=>sheetShare(p);
    const e=el('button','btn',ic('edit')+'<span>ویرایش</span>');e.onclick=()=>sheetEditPos(p);
    const d=el('button','btn dgr',ic('trash')+'<span>حذف</span>');
    d.onclick=()=>{POSMENU.delete(p.id);
      undoable('پوزیشن '+esc(p.ticker||'')+' حذف شد',()=>{
        DB.positions=DB.positions.filter(x=>x.id!==p.id);
        for(const k in DB.decisions)if(DB.decisions[k].posId===p.id)delete DB.decisions[k];});
    };
    pm.appendChild(sh);pm.appendChild(e);
    // پوزیشن رادار که فقط امتحانی ثبت شده: به «بازار ← آزمایشی» برود (نتیجه‌اش حفظ می‌شود)
    if(posSrc(p).sub==='radar'){const t=el('button','btn',ic('undo')+'<span>انتقال به تست‌ها</span>');
      t.onclick=()=>{if(!confirm((p.ticker||'')+' را در صرافی واقعاً نگرفته‌ای؟ از «پوزیشن‌ها» و کارنامه بیرون می‌رود و در «بازار ← آزمایشی» از لحظه‌ی ورود دنبال می‌شود.'))return;
        POSMENU.delete(p.id);rbFromPosAll([p]);};pm.appendChild(t);}
    pm.appendChild(d);card.appendChild(pm);
  }

  if(PENDING.has(p.id))setTimeout(()=>paintStopBar(p),0);
  return card;
}

/* ---- ورق بستن کامل ---- */
function sheetClose(p){
  const live=pxOf(p);
  let mode='price';
  openSheet(
   '<h3>بستن پوزیشن · '+esc(p.ticker)+'</h3>'+
   '<div class="sub">هر کدام را راحت‌تری وارد کن؛ بقیه خودشان حساب می‌شوند.</div>'+
   '<div class="seg"><button data-m="price" aria-pressed="true">قیمت خروج</button>'+
   '<button data-m="roi">درصد روی مارجین</button><button data-m="usd">مبلغ سود/ضرر</button></div>'+
   '<div class="fld"><label id="lbl">قیمت خروج</label><input id="f_v" type="number" step="any" inputmode="decimal" value="'+(live||'')+'"></div>'+
   (live?'<div style="margin-top:8px"><button class="btn xs" id="useLive">قیمت لحظه‌ای: '+fmtPrice(live)+'</button>'+
     (p.stop?' <button class="btn xs" id="useStop">خورد به استاپ: '+fmtPrice(p.stop)+'</button>':'')+'</div>':'')+
   '<div class="grid" style="margin-top:10px">'+
     fldHtml('fee','کارمزد ($)',(p.margin*p.lev*(S.fee/100)).toFixed(3))+
     '<div class="fld"><label>تاریخ بستن</label><input id="f_when" type="datetime-local"></div>'+
   '</div>'+
   '<div class="fld" style="margin-top:10px"><label>چرا می‌بندی؟</label><select id="f_why"><option value="">—</option>'+
     Object.entries(WHY_FA).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></div>'+
   '<div id="prev" class="kv" style="margin-top:12px"></div>'+
   '<div class="srow"><button class="btn pri" id="ok">ثبت بستن</button><button class="btn" id="cx">انصراف</button></div>',
   sh=>{
     const now=new Date(Date.now()-new Date().getTimezoneOffset()*60000);
     $('#f_when').value=now.toISOString().slice(0,16);
     const calcExit=()=>{
       const v=parseFloat($('#f_v').value);
       if(!isFinite(v))return null;
       if(mode==='price')return v>0?v:null;
       if(mode==='roi')return exitFromRoi(p,v);
       return exitFromPnl(p,v);
     };
     const upd=()=>{
       const ex=calcExit(), fee=Math.max(0,parseFloat($('#f_fee').value)||0);
       const pv=$('#prev');pv.innerHTML='';
       if(ex==null||ex<=0){pv.innerHTML='<div class="k"><b>پیش‌نمایش</b><span class="m">عدد را وارد کن</span></div>';return;}
       const m=posMetrics(Object.assign({},p,{status:'closed',exitPrice:ex,fees:fee}));
       const add=(l,x,c)=>pv.innerHTML+='<div class="k"><b>'+l+'</b><span class="'+(c||'')+'">'+x+'</span></div>';
       add('قیمت خروج',fmtPrice(ex),'a');
       add('سود/ضرر خالص',fmtUsd(m.pnl),cls(m.pnl));
       if(m.realized)add('از آن، قطعی‌شده',fmtUsd(m.realized),cls(m.realized));
       add('درصد روی مارجین',fmtPct(m.roi),cls(m.pnl));
       add('حرکت قیمت',fmtPct(m.movePct),cls(m.movePct));
       if(m.r!=null)add('R',fmtR(m.r),cls(m.r));
       if(m.liquidated)add('هشدار','آن‌طرف لیکوئید','d');
     };
     const setMode=mm=>{
       mode=mm;
       sh.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===mm?'true':'false'));
       $('#lbl').textContent=mm==='price'?'قیمت خروج':mm==='roi'?'درصد روی مارجین (مثلاً −30)':'مبلغ سود یا ضرر ($)';
     };
     sh.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{setMode(b.dataset.m);$('#f_v').value='';upd();});
     if($('#useLive'))$('#useLive').onclick=()=>{setMode('price');$('#f_v').value=live;upd();};
     if($('#useStop'))$('#useStop').onclick=()=>{setMode('price');$('#f_v').value=p.stop;upd();};
     sh.querySelectorAll('input').forEach(i=>{i.oninput=upd;i.onchange=upd;});
     upd();
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{
       const ex=calcExit();
       if(ex==null||ex<=0)return toast('عدد معتبر وارد کن','err');
       ensureBase(p);
       p.status='closed';p.exitPrice=ex;
       p.fees=Math.max(0,parseFloat($('#f_fee').value)||0);
       const w=$('#f_when').value;
       p.closedAt=w?new Date(w).getTime():Date.now();
       const why=$('#f_why').value;if(why)p.why=why;else delete p.why;
       const m=posMetrics(p);
       logAdd(p,'close','بسته شد روی '+fmtPrice(ex)+(why?' · '+WHY_FA[why]:'')+' — '+fmtUsd(m.pnl)+' ('+fmtR(m.r)+')');
       PENDING.delete(p.id);
       save();closeSheet();renderAll();
       toast('پوزیشن بسته شد: '+fmtUsd(m.pnl),m.pnl>=0?'ok':'info');
     };
   });
}

/* ---- ورق بستن بخشی ---- */
/* نصف پوزیشن را روی قیمت تارگت می‌بندد — همان کاری که «بستن بخشی» با 50٪ می‌کرد،
   بدون پر کردن فرم. محاسبه‌اش عیناً از همان مسیر می‌رود تا دو جور حساب نشود. */
function closeHalfAt(p,price){
  ensureBase(p);
  const m=posMetrics(p,price);
  const part=0.5, qty=m.qty*part, marginPart=p.margin*part;
  const gross=qty*(price-p.entry)*(p.dir==='long'?1:-1);
  const fees=(marginPart*p.lev)*(S.fee/100);
  const pnl=gross-fees;
  if(!confirm('بستن 50٪ '+p.ticker+' روی '+fmtPrice(price)+'\n\n'+
    'سود/ضرر این تکه: '+fmtUsd(pnl)+'\nمارجین آزادشده: '+fmtUsd(marginPart)+'\n\nثبت شود؟'))return;
  p.partials=partialsOf(p).concat([{at:Date.now(),price,qty,margin:marginPart,pnl,fees,part}]);
  p.margin=p.margin-marginPart;
  logAdd(p,'partial','50٪ روی '+fmtPrice(price)+' بسته شد · '+fmtUsd(pnl));
  if(p.margin<=0.0001){
    p.status='closed';p.closedAt=Date.now();p.exitPrice=price;
    logAdd(p,'close','پوزیشن کامل بسته شد');
  }
  save();renderAll();toast('50٪ بسته شد · '+fmtUsd(pnl),pnl>=0?'ok':'err');
}
function sheetPartial(p){
  const live=pxOf(p);
  let pct=50;
  openSheet(
   '<h3>بستن بخشی · '+esc(p.ticker)+'</h3>'+
   '<div class="sub">بخشی از پوزیشن را می‌بندی و سودش قطعی می‌شود؛ باقی‌مانده با همان اهرم و همان ورود باز می‌ماند.</div>'+
   '<div class="seg" id="pseg">'+[25,50,75].map(v=>'<button data-p="'+v+'"'+(v===50?' aria-pressed="true"':'')+'>'+faN(v)+'٪</button>').join('')+'</div>'+
   '<div class="fld"><label>چند درصد بسته شود؟ <b id="pl">50٪</b></label>'+
     '<input id="f_p" type="range" min="5" max="95" step="5" value="50"></div>'+
   '<div class="grid" style="margin-top:10px">'+
     fldHtml('v','قیمت خروج این بخش',live||'')+fldHtml('fee','کارمزد ($)','')+
   '</div>'+
   '<div id="prev" class="kv" style="margin-top:12px"></div>'+
   '<div class="srow"><button class="btn pri" id="ok">ثبت این خروج</button><button class="btn" id="cx">انصراف</button></div>',
   sh=>{
     const setPct=v=>{
       pct=clamp(v,5,95);
       $('#f_p').value=pct;$('#pl').textContent=faN(pct)+'٪';
       sh.querySelectorAll('#pseg button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.p===pct?'true':'false'));
       autoFee();upd();
     };
     const cutMargin=()=>p.margin*(pct/100);
     const autoFee=()=>{
       const f=$('#f_fee');
       if(!f.dataset.touched)f.value=(cutMargin()*p.lev*(S.fee/100)).toFixed(3);
     };
     const upd=()=>{
       const ex=num('f_v'), fee=Math.max(0,parseFloat($('#f_fee').value)||0), pv=$('#prev');
       pv.innerHTML='';
       if(!ex){pv.innerHTML='<div class="k"><b>پیش‌نمایش</b><span class="m">قیمت خروج را وارد کن</span></div>';return;}
       const cm=cutMargin(), qty=(cm*p.lev)/p.entry, sign=p.dir==='long'?1:-1;
       const pnl=qty*(ex-p.entry)*sign-fee;
       const rest=p.margin-cm;
       const add=(l,x,c)=>pv.innerHTML+='<div class="k"><b>'+l+'</b><span class="'+(c||'')+'">'+x+'</span></div>';
       add('سود قطعی این بخش',fmtUsd(pnl),cls(pnl));
       add('مارجین آزادشده',fmtUsd(cm));
       add('مارجین باقی‌مانده',fmtUsd(rest),rest<=0?'d':'');
       add('حجم باقی‌مانده',fmtUsd(rest*p.lev));
       const after=Object.assign({},p,{margin:rest,partials:[...partialsOf(p),{pnl,fees:fee,margin:cm,price:ex,at:Date.now(),pct}]});
       const m=posMetrics(after,live);
       add('کل پوزیشن الان',fmtUsd(m.pnl),cls(m.pnl));
       if(m.r!=null)add('R تا اینجا',fmtR(m.r),cls(m.r));
       if(p.stop){const o=stopOutcome(after,p.stop);add('اگر استاپ بخورد',fmtUsd(o.pnl),cls(o.pnl));}
     };
     $('#f_p').oninput=e=>setPct(+e.target.value);
     sh.querySelectorAll('#pseg button').forEach(b=>b.onclick=()=>setPct(+b.dataset.p));
     $('#f_fee').oninput=e=>{e.target.dataset.touched='1';upd();};
     $('#f_v').oninput=upd;
     setPct(50);
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{
       const ex=num('f_v');
       if(!ex)return toast('قیمت خروج را وارد کن','err');
       const fee=Math.max(0,parseFloat($('#f_fee').value)||0);
       const cm=cutMargin();
       if(cm>=p.margin-1e-9)return toast('برای بستن کل پوزیشن از «بستن کامل» استفاده کن','err');
       ensureBase(p);
       const qty=(cm*p.lev)/p.entry, sign=p.dir==='long'?1:-1;
       const pnl=qty*(ex-p.entry)*sign-fee;
       p.partials.push({pnl,fees:fee,margin:cm,price:ex,at:Date.now(),pct});
       p.margin=p.margin-cm;
       logAdd(p,'cut',faN(pct)+'٪ بسته شد روی '+fmtPrice(ex)+' — '+fmtUsd(pnl)+' قطعی شد');
       save();closeSheet();renderAll();
       toast(faN(pct)+'٪ بسته شد: '+fmtUsd(pnl),pnl>=0?'ok':'info');
     };
   });
}

/* ---- ورق افزودن حجم ---- */
function sheetAdd(p){
  const live=pxOf(p);
  openSheet(
   '<h3>افزودن حجم · '+esc(p.ticker)+'</h3>'+
   '<div class="sub">مارجین تازه با همان اهرم اضافه می‌شود و قیمت ورودت میانگین می‌گیرد. اهرم و استاپ دست نمی‌خورند.</div>'+
   '<div class="grid">'+fldHtml('m','مارجین اضافه ($)',S.cap)+fldHtml('v','قیمت ورود این پله',live||'')+'</div>'+
   '<div id="prev" class="kv" style="margin-top:12px"></div>'+
   '<div class="srow"><button class="btn pri" id="ok">ثبت پله</button><button class="btn" id="cx">انصراف</button></div>',
   sh=>{
     const calc=()=>{
       const am=num('f_m'), ap=num('f_v');
       if(!am||!ap)return null;
       const oldNot=p.margin*p.lev, oldQty=oldNot/p.entry;
       const addNot=am*p.lev, addQty=addNot/ap;
       const qty=oldQty+addQty, not=oldNot+addNot;
       return {am,ap,entry:not/qty,margin:p.margin+am,qty,not};
     };
     const upd=()=>{
       const c=calc(), pv=$('#prev');pv.innerHTML='';
       if(!c){pv.innerHTML='<div class="k"><b>پیش‌نمایش</b><span class="m">اعداد ناقص</span></div>';return;}
       const after=Object.assign({},p,{entry:c.entry,margin:c.margin,baseMargin:baseMarginOf(p)+c.am});
       const m=posMetrics(after,live);
       const add=(l,x,cl2)=>pv.innerHTML+='<div class="k"><b>'+l+'</b><span class="'+(cl2||'')+'">'+x+'</span></div>';
       add('ورود میانگین جدید',fmtPrice(c.entry),'a');
       add('مارجین بعد از پله',fmtUsd(c.margin));
       add('حجم بعد از پله',fmtUsd(c.not));
       add('لیکوئید جدید',m.liqPrice==null?'ندارد':fmtPrice(m.liqPrice),m.liqPrice==null?'m':'d');
       if(m.pnl!=null)add('سود/ضرر الان',fmtUsd(m.pnl),cls(m.pnl));
       if(p.stop){
         const o=stopOutcome(after,p.stop);
         add('اگر استاپ بخورد',fmtUsd(o.pnl),cls(o.pnl));
         const bad=(p.dir==='long'&&p.stop>=c.entry)||(p.dir==='short'&&p.stop<=c.entry);
         if(bad)add('هشدار','استاپ آن‌طرف ورود میانگین است','d');
       }
     };
     sh.querySelectorAll('input').forEach(i=>{i.oninput=upd;i.onchange=upd;});
     upd();
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{
       const c=calc();
       if(!c)return toast('مارجین و قیمت پله را وارد کن','err');
       ensureBase(p);
       p.baseMargin=baseMarginOf(p)+c.am;
       p.entry=roundP(c.entry);p.margin=c.margin;
       logAdd(p,'add','پله '+fmtUsd(c.am)+' روی '+fmtPrice(c.ap)+' — ورود میانگین '+fmtPrice(c.entry));
       save();closeSheet();renderAll();toast('پله اضافه شد','ok');
     };
   });
}

/* ---- ورق ویرایش / افزودن دستی ---- */
function sheetEditPos(p){
  const isNew=!p;
  const d=p||{id:uid(),ticker:'',dir:'long',entry:null,stop:null,margin:S.cap,lev:1,
    openedAt:Date.now(),status:'open',exitPrice:null,closedAt:null,fees:0,note:'',targets:[],partials:[],log:[]};
  const dt=v=>v?new Date(v-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  openSheet(
   '<h3>'+(isNew?'افزودن دستی':'ویرایش پوزیشن')+'</h3>'+
   '<div id="mktBox"></div>'+
   '<div class="sub">همه اعداد دست خودت است. محاسبات بر اساس همین‌ها انجام می‌شود.</div>'+
   '<div class="grid">'+
     '<div class="fld"><label>نماد</label><input id="f_t" value="'+esc(d.ticker)+'" dir="ltr" placeholder="BTC"></div>'+
     '<div class="fld" id="dirRow"><label>جهت</label><select id="f_d"><option value="long"'+(d.dir==='long'?' selected':'')+
       '>لانگ</option><option value="short"'+(d.dir==='short'?' selected':'')+'>شورت</option></select></div>'+
     fldHtml('e','ورود',d.entry==null?'':d.entry)+fldHtml('s','حد ضرر',d.stop==null?'':d.stop)+
     '<div class="fld"><label id="lbl_m">مارجین ($)</label><input id="f_m" step="any" inputmode="decimal" value="'+
       (d.margin==null?'':d.margin)+'"></div>'+
     '<div class="fld" id="levRow"><label>اهرم</label><input id="f_l" step="any" inputmode="decimal" value="'+
       (d.lev==null?'':d.lev)+'"></div>'+
   '</div>'+
   '<div class="grid" style="margin-top:10px">'+
     '<div class="fld"><label>زمان ورود</label><input id="f_o" type="datetime-local" value="'+dt(d.openedAt)+'"></div>'+
     '<div class="fld"><label>وضعیت</label><select id="f_st"><option value="open"'+(d.status==='open'?' selected':'')+
       '>باز</option><option value="closed"'+(d.status==='closed'?' selected':'')+'>بسته</option></select></div>'+
   '</div>'+
   '<div class="grid hide" id="closeBox" style="margin-top:10px">'+
     fldHtml('x','قیمت خروج',d.exitPrice==null?'':d.exitPrice)+fldHtml('f','کارمزد ($)',d.fees==null?0:d.fees)+
     '<div class="fld"><label>زمان بستن</label><input id="f_c" type="datetime-local" value="'+dt(d.closedAt)+'"></div>'+
   '</div>'+
   '<div class="grid" style="margin-top:10px">'+
     '<div class="fld"><label>یادداشت</label><input id="f_n" value="'+esc(d.note||'')+'"></div>'+
     (()=>{const k=posSrc(d).k;return '<div class="fld"><label>منبع</label><select id="f_src"><option value="ch"'+(k==='ch'?' selected':'')+'>کانال</option>'+
       '<option value="me"'+(k==='me'?' selected':'')+'>خودم</option></select></div>';})()+
   '</div>'+
   '<div id="prev" class="kv" style="margin-top:12px"></div>'+
   '<div class="srow"><button class="btn pri" id="ok">ذخیره</button><button class="btn" id="cx">انصراف</button></div>',
   sh=>{
     let MK=d.kind==='spot'?'spot':'futures';
     const spot=()=>MK==='spot';
     const syncBox=()=>$('#closeBox').classList.toggle('hide',$('#f_st').value!=='closed');
     const grab=()=>({ticker:($('#f_t').value||'').trim().toUpperCase(),
       dir:spot()?'long':$('#f_d').value,kind:MK,
       entry:num('f_e'),stop:num('f_s'),margin:num('f_m'),lev:spot()?1:num('f_l'),
       status:$('#f_st').value,exitPrice:num('f_x'),fees:Math.max(0,parseFloat($('#f_f').value)||0),
       note:($('#f_n').value||'').trim(),srcK:$('#f_src')?$('#f_src').value:undefined});
     const paintMkt=()=>{
       const mb=$('#mktBox');mb.innerHTML='';
       mb.appendChild(mktPicker(MK,k=>{MK=k;paintMkt();upd();}));
       const sp=spot();
       $('#levRow').classList.toggle('hide',sp);
       $('#dirRow').classList.toggle('hide',sp);
       $('#lbl_m').textContent=sp?'مبلغ خرید ($)':'مارجین ($)';
       if(sp)$('#f_l').value=1;
     };
     const upd=()=>{
       syncBox();
       const v=grab(),pv=$('#prev');pv.innerHTML='';
       if(!v.entry||!v.margin||!v.lev){pv.innerHTML='<div class="k"><b>پیش‌نمایش</b><span class="m">اعداد ناقص</span></div>';return;}
       const live=v.status==='closed'?null:pxOf(v);
       // پیش‌نمایش با مبنای تازه، همان چیزی که بعد از ذخیره می‌بینی
       const m=posMetrics(rebase(Object.assign({},d,v,{partials:partialsOf(d).slice()})),live);
       const add=(l,x,c)=>pv.innerHTML+='<div class="k"><b>'+l+'</b><span class="'+(c||'')+'">'+x+'</span></div>';
       if(spot())add('مقدار '+(v.ticker||'ارز'),(+m.qty.toPrecision(6))+'');
       else{
         add('حجم',fmtUsd(m.notional));
         add('لیکوئید',m.liqPrice==null?'ندارد':fmtPrice(m.liqPrice),m.liqPrice==null?'m':'d');
       }
       if(m.pnl!=null){add('سود/ضرر',fmtUsd(m.pnl),cls(m.pnl));
         add(spot()?'بازده':'٪ مارجین',fmtPct(m.roi),cls(m.pnl));}
     };
     moneyInput($('#f_m'));
     sh.querySelectorAll('input,select').forEach(i=>{i.oninput=upd;i.onchange=upd;});
     paintMkt();upd();
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{
       const v=grab();
       if(!v.ticker)return toast('نماد را وارد کن','err');
       if(!v.entry)return toast('قیمت ورود را وارد کن','err');
       if(!v.margin||!v.lev)return toast((spot()?'مبلغ خرید':'مارجین و اهرم')+' را وارد کن','err');
       if(v.status==='closed'&&!v.exitPrice)return toast('قیمت خروج را وارد کن','err');
       const wasStop=d.stop, wasBase=[d.margin,d.lev,d.entry].join();
       Object.assign(d,v);
       d.openedAt=$('#f_o').value?new Date($('#f_o').value).getTime():Date.now();
       d.closedAt=v.status==='closed'?($('#f_c').value?new Date($('#f_c').value).getTime():Date.now()):null;
       if(v.status==='open'){d.exitPrice=null;d.fees=null;}
       ensureBase(d);
       if(!isNew&&wasBase!==[d.margin,d.lev,d.entry].join())rebase(d);
       if(isNew){d.baseMargin=d.margin;d.stop0=d.stop;d.risk0=risk0Of(d);
         logAdd(d,'open','دستی ثبت شد');DB.positions.push(d);}
       else if(wasStop!==d.stop)logAdd(d,'stop','حد ضرر با ویرایش روی '+(d.stop?fmtPrice(d.stop):'ندارد')+' تنظیم شد');
       save();closeSheet();renderAll();toast(isNew?'اضافه شد':'ذخیره شد','ok');
     };
   });
}

