/* ==================== کانال‌سنج: سرمایه و الگوها (پیشنهادهای ۲۱ تا ۳۰) ====================
   ۲۳ منحنی سرمایه با قاعده‌ی خودت و ریسک دلاری   ۲۶ بدترین افت و بدترین سری
   ۲۱ به تفکیک ساعت انتشار   ۲۲ به تفکیک نوع ورود   ۲۴ زمان تا تارگت ۱ / تا خروج
   ۲۵ ماه‌به‌ماه، با هشدار وقتی ماه اخیر بدتر شد   ۲۷ «نمونه‌ی کم» کنار هر عدد کم‌نمونه
   ۲۸ خروجی CSV   ۲۹ سنجش خودکار هر نیم ساعت (وقتی برنامه باز است)   ۳۰ در برابر نگه‌داشتن بیت‌کوین */

const SMALLN=10;
const lowN=n=>n<SMALLN?' <span class="lown" title="کمتر از '+faN(SMALLN)+' نمونه؛ به این عدد زیاد تکیه نکن">نمونه‌ی کم</span>':'';
const median=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};

/* R هر سیگنال با «قاعده‌ی من» (از جدول خروج کوتاه)، وگرنه با قانون امتیازدهیِ کانال‌سنج */
function ruleR(x){
  const r=xRule();
  if(r&&x.r&&x.r.xg&&x.r.xg.v===XG_V){const i=xgIdx(r.k,r.t,r.h);return {R:x.r.xg.R[i],h:x.r.xg.h[i]};}
  return {R:x.R,h:x.r&&x.r.tAct&&x.r.tEnd?(x.r.tEnd-x.r.tAct)/36e5:null};
}
const finRows=rows=>rows.filter(x=>x.r&&['win','loss','exp'].includes(x.r.st)&&x.inp.t0).sort((a,b)=>a.inp.t0-b.inp.t0);

/* ---- ۲۳ و ۲۶) منحنی سرمایه: از موجودی حساب، هر سیگنال ریسک دلاری ثابت × R ---- */
function capCurve(rows){
  const start=+S.acct||100, risk=riskUsd(), F=finRows(rows);
  let cap=start, peak=start, dd=0, ddPct=0, streak=0, worst=0, n=0, hold=0, hN=0;
  const pts=[0];
  for(const x of F){
    const q=ruleR(x);if(q.R==null||!isFinite(q.R))continue;
    cap+=q.R*risk;n++;
    if(q.h!=null){hold+=q.h;hN++;}
    peak=Math.max(peak,cap);
    if(peak-cap>dd){dd=peak-cap;ddPct=dd/peak*100;}
    streak=q.R<0?streak+1:0;worst=Math.max(worst,streak);
    pts.push((cap-start)/risk);
  }
  return {start,cap,risk,n,dd,ddPct,worst,pts,ret:(cap-start)/start*100,hold:hN?hold/hN:null,
    perH:hN&&hold>0?(cap-start)/hold:null,t0:F.length?F[0].inp.t0:null};
}

/* گروه‌بندی: n، نرخ برد، میانگین R با قاعده */
function groupBy(rows,keyOf){
  const m=new Map();
  for(const x of finRows(rows)){
    const q=ruleR(x);if(q.R==null)continue;
    const k=keyOf(x);if(k==null)continue;
    const o=m.get(k)||{n:0,w:0,r:0};o.n++;if(q.R>0.001)o.w++;o.r+=q.R;m.set(k,o);
  }
  return m;
}
function grpTable(title,m,order,label){
  const ks=(order||[...m.keys()]).filter(k=>m.has(k));
  if(!ks.length)return '';
  return '<div class="sechd">'+title+'</div><div class="tscroll"><table class="tp xtab"><thead><tr><th></th><th>سیگنال</th><th>برد</th><th>میانگین R</th></tr></thead><tbody>'+
    ks.map(k=>{const o=m.get(k);return '<tr><td>'+(label?label(k):esc(k))+lowN(o.n)+'</td><td class="num">'+faN(o.n)+'</td><td class="num">'+faN(Math.round(o.w/o.n*100))+'٪</td>'+
      '<td class="num '+cls(o.r/o.n)+'"><bdi>'+fmtR(o.r/o.n)+'</bdi></td></tr>';}).join('')+'</tbody></table></div>';
}

/* ---- ۳۰) بیت‌کوین در همان بازه (یک کندل، در حافظه) ---- */
const BTCREF={};
async function btcRef(t0){
  const k=Math.floor(t0/36e5);if(BTCREF[k]!==undefined)return BTCREF[k];
  BTCREF[k]=null;
  try{const C=await audCandles('BTC','1h',k*36e5,1,true);BTCREF[k]=C&&C[0]?C[0].o:null;}catch(e){}
  return BTCREF[k];
}

function buildInsights(rows){
  const c=el('div','panel lab');
  c.appendChild(el('div','panelhead','<b>'+ic('trend')+'سرمایه و الگوها</b>'));
  const F=finRows(rows);
  if(!F.length){c.appendChild(el('div','hint','هنوز سیگنالی به نتیجه نرسیده.'));return c;}
  const r=xRule(), cc=capCurve(rows);
  c.appendChild(el('div','hint','اگر از اول همه‌ی این سیگنال‌ها را با '+(r?'<b>قاعده‌ی من</b> ('+esc(xRuleName(r))+')':'قانون کانال‌سنج')+
    ' و ریسک ثابت <b>'+fmtUsd(cc.risk)+'</b> در هر معامله گرفته بودی، از موجودی '+fmtUsd(cc.start)+':'));
  const g=el('div','stats');
  g.innerHTML=stHtml('سرمایه الان',fmtUsd(cc.cap),cls(cc.cap-cc.start),fmtPct(cc.ret)+' در '+faN(cc.n)+' معامله'+(cc.n<SMALLN?' · نمونه‌ی کم':''))+
    stHtml('بیشترین افت',fmtUsd(-cc.dd),cc.dd?'d':'m',faN(+cc.ddPct.toFixed(1))+'٪ از اوج — پول پشتیبانی که لازم است')+
    stHtml('بدترین سری',faN(cc.worst)+' باخت',cc.worst>=4?'d':'','پشت سر هم')+
    stHtml('سود هر ساعت',cc.perH==null?'—':fmtUsd(cc.perH),cc.perH==null?'m':cls(cc.perH),cc.hold!=null?'میانگین نگه‌داری '+fmtNum(cc.hold)+' ساعت':'');
  c.appendChild(g);
  if(cc.pts.length>2)c.appendChild(rCurve(cc.pts,cc.worst?cc.dd/cc.risk:0));
  // ۳۰) در برابر نگه‌داشتن بیت‌کوین
  const bt=el('div','hint btcref');c.appendChild(bt);
  if(cc.t0)btcRef(cc.t0).then(o=>{const now=PRICES.get('BTC');if(!o||!now){bt.textContent='';return;}
    const b=(now-o)/o*100;
    bt.innerHTML='در همین بازه، خریدن و نگه‌داشتن بیت‌کوین: <b class="'+cls(b)+'">'+fmtPct(b)+'</b> · سیگنال‌ها با قاعده: <b class="'+cls(cc.ret)+'">'+fmtPct(cc.ret)+'</b>'+
      (cc.ret>b?' — سیگنال‌ها بهتر بوده‌اند.':' — نگه‌داشتن ساده بهتر بوده.');});
  // ۲۴) زمان تا تارگت ۱ و تا خروج
  const tTp=F.filter(x=>x.r.tAct&&x.r.tTp&&x.r.tTp[0]).map(x=>(x.r.tTp[0]-x.r.tAct)/36e5);
  const tEx=F.map(x=>ruleR(x).h).filter(v=>v!=null);
  c.appendChild(el('div','hint','<b>زمان:</b> میانه‌ی رسیدن به تارگت ۱ کانال '+(tTp.length?fmtNum(median(tTp))+' ساعت'+lowN(tTp.length):'—')+
    ' · میانه‌ی نگه‌داری تا خروج'+(r?' با قاعده‌ی من ':' ')+(tEx.length?fmtNum(median(tEx))+' ساعت':'—')+'.'));
  // ۲۵) ماه‌به‌ماه
  const mm=groupBy(rows,x=>{const p=jParts(new Date(x.inp.t0));return p.jy+'-'+String(p.jm).padStart(2,'0');});
  const months=[...mm.keys()].sort();
  c.appendChild(el('div',null,grpTable('ماه‌به‌ماه',mm,months,k=>{const [y,m]=k.split('-');return J_M[+m-1]+' '+faN(+y);})));
  if(months.length>=2){
    const a=mm.get(months[months.length-1]), b=mm.get(months[months.length-2]);
    if(a.n>=5&&b.n>=5&&a.r/a.n<b.r/b.n-0.3)c.appendChild(el('div','flag w','<i>!</i><span>ماه اخیر کانال بدتر از ماه قبل بوده ('+fmtR(a.r/a.n)+' در برابر '+fmtR(b.r/b.n)+' برای هر سیگنال). با احتیاط بیشتر بگیر.</span>'));
  }
  // ۲۱) ساعت انتشار (به وقت گوشی، بازه‌های ۴ ساعته)
  const HB=['۰–۴','۴–۸','۸–۱۲','۱۲–۱۶','۱۶–۲۰','۲۰–۲۴'];
  c.appendChild(el('div',null,grpTable('به تفکیک ساعت انتشار',groupBy(rows,x=>Math.floor(new Date(x.inp.t0).getHours()/4)),[0,1,2,3,4,5],k=>'ساعت '+HB[k])));
  // ۲۲) نوع ورود
  c.appendChild(el('div',null,grpTable('به تفکیک نوع ورود',groupBy(rows,x=>sigKindOf(x.p,x.inp)),['full','trig','follow','img'],k=>SIGKIND_FA[k])));
  // ۲۸) خروجی CSV
  const ex=el('div','srow');
  const bcsv=el('button','btn sm',ic('down')+'<span>خروجی CSV برای اکسل</span>');
  bcsv.onclick=()=>audCsv(rows);ex.appendChild(bcsv);c.appendChild(ex);
  return c;
}

/* ---- ۲۸) CSV: هر سیگنال یک ردیف، با R قانون کانال‌سنج و R قاعده‌ی من ---- */
function audCsv(rows){
  const q=v=>{const s=v==null?'':String(v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const r=xRule();
  const head=['تاریخ','نماد','جهت','ورود','استاپ','تارگت۱','نوع','وضعیت','R کانال‌سنج',r?'R قاعده‌ی من':'R','ساعت نگه‌داری','لینک'];
  const lines=[head.join(',')];
  for(const x of rows.slice().sort((a,b)=>(a.inp.t0||0)-(b.inp.t0||0))){
    const i=x.inp, rr=x.r?ruleR(x):{R:null,h:null};
    lines.push([i.t0?jStampFa(new Date(i.t0)):'',i.tk,i.dir,i.entry,i.stop,i.tps&&i.tps[0],SIGKIND_FA[sigKindOf(x.p,i)],
      x.r?(AUD_ST[audStKey(x.r)]||[x.r.st])[0]:'سنجیده نشده',x.R!=null?x.R.toFixed(2):'',rr.R!=null?(+rr.R).toFixed(2):'',
      rr.h!=null?(+rr.h).toFixed(1):'',x.p.link||''].map(q).join(','));
  }
  dl('channel-audit-'+jKey(new Date())+'.csv','﻿'+lines.join('\n'),'text/csv');
  toast('فایل CSV ساخته شد','ok');
}

/* ---- ۲۹) سنجش خودکار هر نیم ساعت، حتی وقتی تب کانال‌سنج باز نیست ---- */
setInterval(()=>{try{if(BOOTED&&!AUDQ.on&&Date.now()-AUDQ.at>25*60000&&audJobs().length)audRun();}catch(e){}},30*60000);
