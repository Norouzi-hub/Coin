/* ==================== خروجی متنی سیگنال‌ها ====================
   برای برنامه‌ی خودِ صاحب پروژه که سیگنال‌ها را چک می‌کند: هر سیگنال یک خط، ستون‌ها با « | »،
   عدد انگلیسی و نقطه‌ی اعشار، خانه‌ی نامعلوم «-». خط‌های «#» توضیح‌اند و برنامه می‌تواند ردشان کند.
   2026-10-07 14:32 | BTC | LONG | FUTURES | ENTRY 64800 | SL 63500 | TP 66000,67000 | LEV 10 | STATUS open | https://t.me/... */
const TXST={open:'open',taken:'taken',skipped:'skipped',expired:'expired'};
const txNum=v=>v==null||!isFinite(v)?'-':String(+(+v).toPrecision(8));
const txTime=t=>{const d=new Date(t),z=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes());};
function txItems(days,onlyOpen){
  const since=Date.now()-days*864e5, out=[];
  for(const p of POSTS){
    if(!p.date||+p.date<since||!isSigPost(p))continue;
    const s=sigOf(p), ov=OVERRIDE[p.id]||{}, dec=decisionOf(p.id);
    const st=dec?(dec.action==='taken'?'taken':'skipped'):isStale(p)?'expired':'open';
    if(onlyOpen&&st!=='open')continue;
    out.push({at:+p.date,tk:s.ticker||'-',dir:s.direction==='short'?'SHORT':s.direction==='long'?'LONG':'-',mkt:s.market==='spot'?'SPOT':'FUTURES',
      entry:ov.entry!=null?ov.entry:(s.entry!=null?s.entry:s.trigger),stop:ov.stop!=null?ov.stop:s.stop,
      tps:(s.targets||[]).slice(0,6),lev:s.leverage||null,st,link:p.link||('https://t.me/'+p.id)});
  }
  return out.sort((a,b)=>a.at-b.at);
}
function txText(days,onlyOpen){
  const L=txItems(days,onlyOpen).map(x=>[txTime(x.at),x.tk,x.dir,x.mkt,'ENTRY '+txNum(x.entry),'SL '+txNum(x.stop),
    'TP '+(x.tps.length?x.tps.map(txNum).join(','):'-'),'LEV '+(x.lev?txNum(x.lev):'-'),'STATUS '+TXST[x.st],x.link].join(' | '));
  return {n:L.length,text:'# signaldesk @'+(S.channel||'channel')+' · '+txTime(Date.now())+' (device time) · '+L.length+' signals\n'+
    '# TIME | TICKER | DIR | MARKET | ENTRY | SL | TP | LEV | STATUS | LINK\n'+L.join('\n')+(L.length?'\n':'')};
}
const txOpt=()=>({days:+($('#txDays')||{}).value||7,open:!!($('#txOpen')||{}).checked});
function paintTxtOut(){
  const b=$('#txPrev');if(!b)return;
  const o=txOpt(), r=txText(o.days,o.open);
  b.value=r.n?r.text:'# در این بازه سیگنالی نیست';
}
function wireTxtOut(){
  const box=$('#txtOut');if(!box)return;
  const st=lsGet('signaldesk.txtout.v1')||{};
  if(st.days)$('#txDays').value=String(st.days);
  $('#txOpen').checked=!!st.open;
  const ch=()=>{const o=txOpt();lsSet('signaldesk.txtout.v1',o);paintTxtOut();};
  $('#txDays').onchange=ch;$('#txOpen').onchange=ch;
  $('#txCopy').onclick=async()=>{
    const o=txOpt(), r=txText(o.days,o.open);
    if(!r.n)return toast('در این بازه سیگنالی نیست','info');
    try{await navigator.clipboard.writeText(r.text);toast(faN(r.n)+' سیگنال کپی شد','ok');}
    catch(e){const t=$('#txPrev');t.value=r.text;t.focus();t.select();toast('متن انتخاب شد؛ کپی کن','info');}
  };
  $('#txDl').onclick=()=>{
    const o=txOpt(), r=txText(o.days,o.open);
    if(!r.n)return toast('در این بازه سیگنالی نیست','info');
    dl('signals-'+(S.channel||'channel')+'.txt',r.text,'text/plain;charset=utf-8');
    toast(faN(r.n)+' سیگنال در فایل txt','ok');
  };
  const sec=box.closest('details');
  if(sec)sec.addEventListener('toggle',()=>{if(sec.open)paintTxtOut();});
}
