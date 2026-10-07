/* ==================== کارنامه: رفتار و هدف (پیشنهادهای ۳۱ تا ۳۷) ====================
   ۳۱ سود به ازای ساعتِ پول درگیر   ۳۲ گزارش هفتگی   ۳۳ هدف ماهانه   ۳۶ نوار روزهای سبز و قرمز   ۳۷ کارمزد کل ماه
   (۳۴ «چرا بستم» در دفتر معامله؛ ۳۵ «در برابر قاعده» در «شما در برابر کانال»؛ vsRule همین‌جاست) */

const holdH=p=>p.closedAt&&p.openedAt?Math.max(0,(p.closedAt-p.openedAt)/36e5):0;
const thisMonthKey=()=>{const p=jParts(new Date());return p.jy*100+p.jm;};
const monthKeyOf=t=>{const p=jParts(new Date(t));return p.jy*100+p.jm;};

/* ---- ۳۵) R واقعیِ تو در برابر R قاعده‌ی من روی همان سیگنال ---- */
function vsRule(list){
  const r=xRule();if(!r)return null;
  let n=0,me=0,ru=0;
  for(const p of list){
    if(!p.sigId)continue;
    const a=AUD[p.sigId];if(!a||!a.xg||a.xg.v!==XG_V)continue;
    const R=a.xg.R[xgIdx(r.k,r.t,r.h)], m=posMetrics(p);
    if(R==null||m.r==null||!isFinite(m.r))continue;
    n++;me+=m.r;ru+=R;
  }
  return n?{n,me,ru}:null;
}

/* ---- ۳۲) خلاصه‌ی ۷ روز اخیر ---- */
function weekSummary(now){
  now=now||Date.now();
  const L=DB.positions.filter(p=>p.status==='closed'&&p.closedAt>now-7*864e5);
  const a=agg(L), fees=L.reduce((s,p)=>s+(posMetrics(p).fees||0),0);
  const best=L.map(p=>[p,posMetrics(p).pnl||0]).sort((x,y)=>y[1]-x[1]);
  return {n:L.length,pnl:a.pnl,win:a.winRate,fees,best:best[0]||null,worst:best[best.length-1]||null};
}
const weekText=w=>w.n?'۷ روز اخیر: '+faN(w.n)+' معامله · '+fmtUsd(w.pnl)+' · برد '+faN(Math.round(w.win||0))+'٪ · کارمزد '+fmtUsd(w.fees)+
  (w.n>1&&w.best&&w.best[1]>0?' · بهترین '+w.best[0].ticker+' '+fmtUsd(w.best[1]):''):'۷ روز اخیر معامله‌ی بسته‌ای نداشتی.';

function buildBehavior(inRange){
  const c=el('div','panel');
  c.appendChild(el('div','panelhead','<b>'+ic('star')+'رفتار و هدف</b>'));
  const all=DB.positions.filter(p=>p.status==='closed'&&p.closedAt);
  const g=el('div','stats');
  // ۳۱) سود بر ساعت
  const hrs=inRange.reduce((s,p)=>s+holdH(p),0), pnl=inRange.reduce((s,p)=>s+(posMetrics(p).pnl||0),0);
  // ۳۷) کارمزد این ماه
  const mk=thisMonthKey(), mon=all.filter(p=>monthKeyOf(p.closedAt)===mk);
  const mFee=mon.reduce((s,p)=>s+(posMetrics(p).fees||0),0), mGross=mon.reduce((s,p)=>{const m=posMetrics(p);return s+Math.max(0,(m.pnl||0)+(m.fees||0));},0);
  const mPnl=mon.reduce((s,p)=>s+(posMetrics(p).pnl||0),0);
  g.innerHTML=stHtml('سود هر ساعت',hrs>0?fmtUsd(pnl/hrs):'—',hrs>0?cls(pnl):'m',hrs>0?'پول '+fmtNum(hrs/Math.max(1,inRange.length))+' ساعت درگیر در هر معامله':'')+
    stHtml('کارمزد این ماه',fmtUsd(-mFee),mFee?'d':'m',mGross>0?faN(Math.round(mFee/mGross*100))+'٪ از سود ناخالص به صرافی رسید':faN(mon.length)+' معامله');
  c.appendChild(g);
  // ۳۳) هدف ماهانه
  const goal=+S.goal>0?(+S.acct||0)*S.goal/100:0;
  if(goal>0){
    const f=Math.max(0,Math.min(1,mPnl/goal));
    c.appendChild(el('div','goalbar','<div class="gl"><b>هدف این ماه</b><span>'+fmtUsd(mPnl)+' از '+fmtUsd(goal)+' ('+faN(+S.goal)+'٪ حساب)</span></div>'+
      '<div class="gb"><i class="'+(mPnl<0?'d':'u')+'" style="width:'+(mPnl<0?Math.min(100,-mPnl/goal*100):f*100).toFixed(1)+'%"></i></div>'));
  }else c.appendChild(el('div','hint','هدف ماهانه نگذاشته‌ای (تنظیمات › اندازه و ریسک › «هدف ماهانه»).'));
  // ۳۶) نوار ۳۰ روز
  const day=new Map();
  for(const p of all){const k=jKey(new Date(p.closedAt));day.set(k,(day.get(k)||0)+(posMetrics(p).pnl||0));}
  let strip='';
  for(let i=29;i>=0;i--){const d=new Date(Date.now()-i*864e5), k=jKey(d), v=day.get(k);
    strip+='<i class="'+(v==null?'':v>=0?'u':'d')+'" title="'+esc(jStampFa(d).slice(0,10))+(v!=null?' · '+fmtUsd(v):'')+'"></i>';}
  c.appendChild(el('div','sechd','۳۰ روز اخیر'));
  c.appendChild(el('div','daystrip',strip));
  // ۳۴) «چرا بستم» در «دفتر معامله»؛ ۳۵) «در برابر قاعده‌ی من» در «شما در برابر کانال»
  // ۳۲) هفتگی
  c.appendChild(el('div','hint weekly','<b>هفتگی:</b> '+weekText(weekSummary())));
  return c;
}
