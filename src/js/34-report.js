/* ==================== کارنامه ==================== */
let repPeriod='month';        // «سالانه» برداشته شد: با «کل» تقریباً یکی بود
let repFrom=null, repTo=null;      // بازه‌ی دلخواه (میلی‌ثانیه)، وقتی repPeriod==='range'
function sheetRange(){
  const d=x=>x?new Date(x).toISOString().slice(0,10):'';
  openSheet(
   '<h3>بازه‌ی دلخواه</h3>'+
   '<div class="sub">تاریخ‌ها میلادی‌اند چون تقویم خود مرورگر است؛ نتیجه با تقویم شمسی نشان داده می‌شود.</div>'+
   '<div class="grid">'+
     '<div class="fld"><label>از</label><input id="f_a" type="date" value="'+d(repFrom)+'"></div>'+
     '<div class="fld"><label>تا</label><input id="f_b" type="date" value="'+d(repTo)+'"></div>'+
   '</div>'+
   '<div class="srow"><button class="btn pri" id="ok">نشان بده</button>'+
   '<button class="btn" id="cx">انصراف</button></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{
       const a=$('#f_a').value, b=$('#f_b').value;
       if(!a||!b)return toast('هر دو تاریخ را بده','err');
       let from=new Date(a+'T00:00:00').getTime(), to=new Date(b+'T23:59:59').getTime();
       if(from>to){const t=from;from=to;to=t;}   // جابه‌جا نوشته شده بود، خودمان مرتبش می‌کنیم
       repFrom=from;repTo=to;repPeriod='range';
       $$('#vReport .fb[data-p]').forEach(x=>x.setAttribute('aria-pressed',x.id==='pRange'?'true':'false'));
       closeSheet();renderReport();
     };
   });
}
function periodKey(ts,mode){
  const p=jParts(new Date(ts));
  if(mode==='day')return p.jy+'-'+String(p.jm).padStart(2,'0')+'-'+String(p.jd).padStart(2,'0');
  if(mode==='month')return p.jy+'-'+String(p.jm).padStart(2,'0');
  if(mode==='year')return ''+p.jy;      // فقط برای داده‌ی قدیمی
  return 'all';
}
function periodLabel(k,mode){
  if(mode==='all')return 'کل دوره';
  const a=k.split('-').map(Number);
  if(mode==='year')return 'سال '+faN(a[0]);
  if(mode==='month')return J_M[a[1]-1]+' '+faN(a[0]);
  return faN(a[2])+' '+J_M[a[1]-1]+' '+faN(a[0]);
}
function agg(list){
  const r={n:list.length,wins:0,losses:0,flat:0,pnl:0,sumWin:0,sumLoss:0,rs:[],best:null,worst:null,fees:0};
  for(const p of list){
    const m=posMetrics(p);
    const v=m.pnl||0;
    r.pnl+=v; r.fees+=m.fees||0;
    if(v>0.0001){r.wins++;r.sumWin+=v;} else if(v<-0.0001){r.losses++;r.sumLoss+=Math.abs(v);} else r.flat++;
    if(m.r!=null&&isFinite(m.r))r.rs.push(m.r);
    if(r.best==null||v>r.best.v)r.best={v,p};
    if(r.worst==null||v<r.worst.v)r.worst={v,p};
  }
  const decided=r.wins+r.losses;
  r.winRate=decided?(r.wins/decided)*100:null;
  r.avgWin=r.wins?r.sumWin/r.wins:0;
  r.avgLoss=r.losses?r.sumLoss/r.losses:0;
  r.pf=r.sumLoss>0?r.sumWin/r.sumLoss:(r.sumWin>0?Infinity:null);
  r.avgR=r.rs.length?r.rs.reduce((a,b)=>a+b,0)/r.rs.length:null;
  r.totalR=r.rs.length?r.rs.reduce((a,b)=>a+b,0):null;
  r.expectancy=decided?r.pnl/decided:null;
  return r;
}
function renderReport(){
  $$('#vReport .fb[data-p]').forEach(b=>{
    const on=b.dataset.p===repPeriod;
    b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');
  });
  renderReportList();
}
function renderReportList(){
  // مثل بقیه‌ی کلیدها همان لحظه اثر کند، نه بعد از بارگذاری دوباره
  const rb=$('#pRange');
  if(rb){
    rb.classList.toggle('hide',!F('range'));
    if(!F('range')&&repPeriod==='range'){
      repPeriod='month';
      $$('#vReport .fb[data-p]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.p==='month'?'true':'false'));
    }
  }
  const body=$('#repBody');body.innerHTML='';
  const closed=DB.positions.filter(p=>p.status==='closed'&&p.closedAt);
  if(!closed.length){
    body.appendChild(el('div','empty',STAR+'هنوز معامله بسته‌شده‌ای نداری.<br>وقتی پوزیشنی را ببندی، کارنامه‌ات اینجا ساخته می‌شود.'));
    body.appendChild(repVsChannel());
    return;
  }
  const groups=new Map();
  for(const p of closed){
    if(repPeriod==='range'&&(p.closedAt<repFrom||p.closedAt>repTo))continue;
    const k=periodKey(p.closedAt,repPeriod==='range'?'all':repPeriod);
    if(!groups.has(k))groups.set(k,[]);
    groups.get(k).push(p);
  }
  const keys=[...groups.keys()].sort().reverse();

  // در «بازه‌ی دلخواه» تصویر کلی هم مال همان بازه است، نه همه‌ی معامله‌ها
  const inRange=repPeriod==='range'?closed.filter(p=>p.closedAt>=repFrom&&p.closedAt<=repTo):closed;
  const total=agg(inRange);
  const head=el('div','panel');
  const ht=el('div','panelhead');
  ht.appendChild(el('b',null,repPeriod==='range'?'تصویر این بازه':'تصویر کلی'));
  const shAll=el('button','btn xs',ic('share')+'<span>تصویر</span>');
  shAll.title='ساختن تصویر کارنامه برای فرستادن';
  shAll.onclick=()=>sheetShareSummary(total,repPeriod==='range'?'این بازه':'همه‌ی معامله‌ها');
  ht.appendChild(shAll);
  head.appendChild(ht);
  head.appendChild(statsOf(total,true));
  head.appendChild(equityCurve(inRange));
  head.appendChild(rDist(inRange));
  body.appendChild(head);
  body.appendChild(buildBehavior(inRange));
  body.appendChild(journalPanel(inRange));

  for(const k of keys){
    const list=groups.get(k).sort((a,b)=>b.closedAt-a.closedAt);
    const a=agg(list);
    const c=el('div','card');
    const h=el('div','chead');
    h.appendChild(el('span','tick',repPeriod==='range'
      ?jStampFa(new Date(repFrom)).slice(0,10)+' تا '+jStampFa(new Date(repTo)).slice(0,10)
      :periodLabel(k,repPeriod)));
    h.appendChild(el('span','pill '+(a.pnl>=0?'win':'lose'),fmtUsd(a.pnl)));
    h.appendChild(el('span','pill mut',faN(a.n)+' معامله'));
    c.appendChild(h);
    const bd=el('div','body');
    bd.appendChild(statsOf(a));
    const lbl=repPeriod==='range'
      ?jStampFa(new Date(repFrom)).slice(0,10)+' تا '+jStampFa(new Date(repTo)).slice(0,10)
      :periodLabel(k,repPeriod);
    const shP=el('button','btn xs',ic('share')+'<span>تصویر این دوره</span>');
    shP.onclick=()=>sheetShareSummary(a,lbl);
    bd.appendChild(shP);
    const tb=el('table','tp');
    tb.innerHTML='<thead><tr><th>نماد</th><th>جهت</th><th>اهرم</th><th>٪ مارجین</th><th>سود/ضرر</th><th>R</th></tr></thead>';
    const tb2=el('tbody');let rows='';
    for(const p of list){
      const m=posMetrics(p);
      rows+='<tr><td>'+esc(p.ticker)+'</td><td>'+(p.dir==='long'?'لانگ':'شورت')+
        '</td><td class="num">'+(+p.lev)+'x</td><td class="num" style="color:var(--'+(m.pnl>=0?'up':'dn')+')">'+
        fmtPct(m.roi)+'</td><td class="num" style="color:var(--'+(m.pnl>=0?'up':'dn')+')">'+fmtUsd(m.pnl)+
        '</td><td class="num">'+(m.r!=null?fmtR(m.r):'—')+'</td></tr>';
    }
    tb2.innerHTML=rows;tb.appendChild(tb2);bd.appendChild(tWrap(tb));
    c.appendChild(bd);body.appendChild(c);
  }
  body.appendChild(repVsChannel());
}
