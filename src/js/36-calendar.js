/* ==================== تقویم ==================== */
let calY=null,calM=null,calSel=null;
function dayEvents(){
  const map=new Map();
  const push=k=>{if(!map.has(k))map.set(k,{pnl:0,closed:[],opened:[],skipped:[]});return map.get(k);};
  for(const p of DB.positions){
    if(p.openedAt)push(jKey(new Date(p.openedAt))).opened.push(p);
    if(p.status==='closed'&&p.closedAt){
      const g=push(jKey(new Date(p.closedAt)));
      g.closed.push(p);g.pnl+=posMetrics(p).pnl||0;
    }
  }
  for(const [sid,d] of Object.entries(DB.decisions)){
    if(d.action!=='skipped')continue;
    push(jKey(new Date(d.at))).skipped.push({sid,d});
  }
  return map;
}
function renderCalendar(){
  const body=$('#calBody');body.innerHTML='';
  const today=jParts(new Date());
  if(calY==null){calY=today.jy;calM=today.jm;}
  const ev=dayEvents();
  const len=jMonthLen(calY,calM), first=jWeekday(calY,calM,1);
  const kOf=d=>calY+'-'+String(calM).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  // بیشینه قدرمطلق سود/ضرر ماه، برای شدت رنگ روزها
  let mx=0;
  for(let d=1;d<=len;d++){const g=ev.get(kOf(d));if(g)mx=Math.max(mx,Math.abs(g.pnl));}

  const cal=el('div','cal');
  const h=el('div','calhead');
  const prev=el('button','btn sm','‹');
  prev.onclick=()=>{calM--;if(calM<1){calM=12;calY--;}calSel=null;renderCalendar();};
  const next=el('button','btn sm','›');
  next.onclick=()=>{calM++;if(calM>12){calM=1;calY++;}calSel=null;renderCalendar();};
  const now=el('button','btn sm','امروز');
  now.onclick=()=>{calY=today.jy;calM=today.jm;calSel=jKey(new Date());renderCalendar();};
  h.appendChild(el('div','t',J_M[calM-1]+' '+faN(calY)));
  h.appendChild(now);h.appendChild(prev);h.appendChild(next);
  cal.appendChild(h);

  const g=el('div','calgrid');
  for(const d of J_D)g.appendChild(el('div','dow',d));
  for(let i=0;i<first;i++)g.appendChild(el('div','day empty'));
  let mPnl=0,mTrades=0,mSkips=0;
  const todayKey=jKey(new Date());
  for(let d=1;d<=len;d++){
    const key=kOf(d), e=ev.get(key);
    const cell=el('div','day');
    if(key===todayKey)cell.classList.add('today');
    if(key===calSel)cell.classList.add('sel');
    cell.appendChild(el('div','n',faN(d)));
    if(e){
      mTrades+=e.closed.length;mSkips+=e.skipped.length;mPnl+=e.pnl;
      if(e.closed.length){
        const inten=mx>0?Math.min(.5,.12+Math.abs(e.pnl)/mx*.38):.2;
        cell.style.background='color-mix(in srgb,var(--'+(e.pnl>=0?'up':'dn')+') '+(inten*100).toFixed(0)+'%,transparent)';
        cell.style.borderColor='color-mix(in srgb,var(--'+(e.pnl>=0?'up':'dn')+') 45%,transparent)';
        cell.appendChild(el('div','v',(e.pnl>=0?'+':'−')+Math.abs(e.pnl).toFixed(Math.abs(e.pnl)<10?1:0)));
      }else if(e.skipped.length||e.opened.length)cell.appendChild(el('span','mk'));
    }
    cell.onclick=()=>{calSel=calSel===key?null:key;renderCalendar();};
    g.appendChild(cell);
  }
  cal.appendChild(g);
  cal.appendChild(el('div','legend',
    '<span><span class="sw" style="background:color-mix(in srgb,var(--up) 40%,transparent)"></span>روز سودده</span>'+
    '<span><span class="sw" style="background:color-mix(in srgb,var(--dn) 40%,transparent)"></span>روز ضررده</span>'+
    '<span><span class="sw" style="background:var(--tx3)"></span>فقط ورود یا سیگنال ردشده</span>'));
  body.appendChild(cal);

  const sm=el('div','stats');
  let sh='';
  const add=(l,v,c,s2)=>sh+='<div class="st"><b>'+l+'</b><span class="'+(c||'')+'">'+v+'</span>'+(s2?'<small>'+s2+'</small>':'')+'</div>';
  add('خالص ماه',fmtUsd(mPnl),cls(mPnl));
  add('معامله بسته',faN(mTrades),mTrades?'':'m');
  add('سیگنال ردشده',faN(mSkips),mSkips?'':'m');
  sm.innerHTML=sh;body.appendChild(sm);

  if(calSel){
    const e=ev.get(calSel);
    const a=calSel.split('-').map(Number);
    const c=el('div','card');
    const hh=el('div','chead');
    hh.appendChild(el('span','tick',faN(a[2])+' '+J_M[a[1]-1]+' '+faN(a[0])));
    if(e&&e.closed.length)hh.appendChild(el('span','pill '+(e.pnl>=0?'win':'lose'),fmtUsd(e.pnl)));
    c.appendChild(hh);
    const bb=el('div','body');
    if(!e)bb.appendChild(el('div','hint','این روز هیچ فعالیتی ثبت نشده.'));
    else{
      if(e.closed.length){
        bb.appendChild(el('div',null,'<b style="font-size:13px">بسته‌شده</b>'));
        const t=el('table','tp');
        t.innerHTML='<thead><tr><th>نماد</th><th>جهت</th><th>٪ مارجین</th><th>سود/ضرر</th></tr></thead>';
        const t2=el('tbody');let rr='';
        for(const p of e.closed){const m=posMetrics(p);
          rr+='<tr><td>'+esc(p.ticker)+'</td><td>'+(p.dir==='long'?'لانگ':'شورت')+
          '</td><td class="num" style="color:var(--'+(m.pnl>=0?'up':'dn')+')">'+fmtPct(m.roi)+
          '</td><td class="num" style="color:var(--'+(m.pnl>=0?'up':'dn')+')">'+fmtUsd(m.pnl)+'</td></tr>';}
        t2.innerHTML=rr;t.appendChild(t2);bb.appendChild(tWrap(t));
      }
      if(e.opened.length)bb.appendChild(el('div','hint','ورود ثبت‌شده در این روز: '+e.opened.map(p=>esc(p.ticker)).join('، ')));
      if(e.skipped.length){
        bb.appendChild(el('div',null,'<b style="font-size:13px">سیگنال‌های ردشده</b>'));
        const ul=el('div','flags');
        for(const s of e.skipped)
          ul.appendChild(el('div','flag i','<i>•</i><span>'+esc((s.d.snap&&s.d.snap.ticker)||'—')+
            ' — '+esc(s.d.reason||'')+'</span>'));
        bb.appendChild(ul);
      }
    }
    c.appendChild(bb);body.appendChild(c);
  }else body.appendChild(el('div','hint','روی یک روز بزن تا جزئیات همان روز را ببینی.'));
}

