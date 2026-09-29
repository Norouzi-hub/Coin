/* ==================== محاسبه پلن ==================== */
const MMR=0.005;
function computePlan(o){
  const {entry,stop,live,capital=10,riskPct=5,mode='margin',
    rMultiples=[1.5,3,5],channelTargets=[],market='futures'}=o;
  /* اسپات یعنی اهرم 1 و لیکوئید ندارد؛ همان فرمول‌ها با سقف اهرم 1 دقیقاً همین را می‌دهند،
     پس ریاضیِ دوم نمی‌نویسیم — فقط ورودی‌ها را قفل می‌کنیم. */
  const spot=market==='spot';
  const direction=spot?'long':(o.direction||'long');
  const maxLeverage=spot?1:(o.maxLeverage!=null?o.maxLeverage:10);
  const leverageOverride=spot?1:(o.leverageOverride||null);
  const r={ok:false,flags:[],warnings:[],mode,market,spot};
  if(!entry||entry<=0){r.flags.push('no-entry');return r;}
  r.entry=entry;r.direction=direction;
  const sign=direction==='long'?1:-1;
  if(live&&live>0){r.live=live;r.gapPct=((live-entry)/entry)*100;r.adverseGapPct=r.gapPct*sign;}
  if(!stop||stop<=0){r.flags.push('no-stop');return r;}
  if(direction==='long'&&stop>=entry){r.flags.push('bad-stop');return r;}
  if(direction==='short'&&stop<=entry){r.flags.push('bad-stop');return r;}
  r.stop=stop;
  const sd=Math.abs(entry-stop)/entry; r.stopDistPct=sd*100;
  const riskAmt=capital*(riskPct/100); r.riskAmount=riskAmt;
  const lfr=(riskPct/100)/sd; r.leverageForRisk=lfr;
  let margin,lev;
  if(mode==='risk'){
    const ni=riskAmt/sd;
    lev=Math.max(1,Math.min(ni/capital,maxLeverage));
    margin=Math.min(ni/lev,capital); r.capped=(ni/capital)>maxLeverage;
  }else{
    margin=capital;
    if(leverageOverride&&leverageOverride>0){lev=Math.min(leverageOverride,maxLeverage);}
    else lev=Math.max(1,Math.min(lfr,maxLeverage));
    r.capped=lfr>maxLeverage;
  }
  r.leverage=lev;r.margin=margin;
  const notional=margin*lev;
  r.notional=notional;r.qty=notional/entry;
  r.actualRisk=notional*sd; r.actualRiskPct=(r.actualRisk/capital)*100;
  const ld=1/lev-MMR;
  if(lev>1.05&&ld>0){
    r.liqPrice=entry*(1-sign*ld); r.liqDistPct=ld*100;
    if(sd>=ld)r.warnings.push('liq-before-stop'); else if(sd>ld*.75)r.warnings.push('liq-close');
  }else{r.liqPrice=null;r.liqDistPct=null;}
  r.suggestedMargin=Math.min(capital,riskAmt/(sd*lev));
  if(sd>.25)r.warnings.push('stop-far');
  if(r.capped&&!spot)r.warnings.push('lev-capped');   // در اسپات «اهرم 1» سقف نیست، ذاتِ کار است
  if(r.actualRiskPct>riskPct*1.5)r.warnings.push('over-risk');
  if(r.adverseGapPct!=null&&r.adverseGapPct>3)r.warnings.push('price-moved');
  if(live&&((direction==='long'&&live<=stop)||(direction==='short'&&live>=stop)))r.warnings.push('past-stop');
  r.targets=rMultiples.map(m=>({r:m,price:entry*(1+sign*m*sd),profit:notional*m*sd}));
  r.channelTargets=(channelTargets||[]).map(p=>{const mv=((p-entry)/entry)*sign;
    return {price:p,r:mv/sd,profit:notional*mv,movePct:mv*100};}).filter(x=>isFinite(x.r)&&x.r>0);
  r.ok=true; return r;
}

