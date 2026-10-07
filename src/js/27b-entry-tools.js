/* ==================== ابزار ورود کوتاه‌مدت در ایزوله ====================
   پیشنهادهای ۱ تا ۱۰ (مهر ۱۴۰۵). هدف: سیگنال کانال را با سرمایه‌ی کم، ایزوله و چند ساعته بگیری،
   بی‌آنکه هر بار حساب ذهنی کنی:
     ۱ قاعده‌ی خروج من روی کارت       ۲ و ۳ ورود ایزوله با ریسک دلاری ثابت
     ۴ هشدار «دیر رسیدی»               ۵ سابقه‌ی همین نماد و همین نوع ورود در کانال‌سنج
     ۶ و ۷ برچسب «بلندمدت» و پنهان کردنش از «در انتظار»
     ۸ تریگرِ «کندل ۴ ساعته بالای X بست» (در 14-pending.js)
     ۹ پله‌ی دوم خودکار سفارش منتظر    ۱۰ کپی سریع برای اپ صرافی */

/* ---- ۱) قاعده‌ی خروج من: در کانال‌سنج › خروج › خروج کوتاه انتخاب می‌شود ---- */
const xRule=()=>{const r=S.xrule;return r&&XK[r.k]!=null&&XT[r.t]!=null&&XH[r.h]!=null?r:null;};
const xRuleName=r=>XK_FA[r.k]+' · خروج '+XT_FA[r.t]+' · سقف '+XH_FA[r.h];
function setXRule(r){S.xrule=r;DB.settings=Object.assign({},S);save();}
/* همان تعریفِ جدول خروج کوتاه (audXGrid): استاپ = کسری از فاصله‌ی کانال، سود = درصد حرکت قیمت یا تارگت ۱ */
function xRulePlan(dir,E,SL,tgs){
  const r=xRule();if(!r||!(E>0)||!(SL>0))return null;
  const sign=dir==='long'?1:-1, risk=Math.abs(E-SL);
  if((E-SL)*sign<=0)return null;
  const stop=+(E-sign*XK[r.k]*risk).toPrecision(8), t=XT[r.t];
  let tp;
  if(t==='t1'){
    const T=(tgs||[]).filter(x=>isFinite(x)&&(x-E)*sign>0).sort((a,b)=>(a-b)*sign)[0];
    tp=T!=null?T:+(E+sign*(S.rMul[0]||1.5)*risk).toPrecision(8);
  }else tp=+(E*(1+sign*t/100)).toPrecision(8);
  return {r,stop,tp,h:XH[r.h],sd:XK[r.k]*risk/E*100};
}

/* ---- ۲ و ۳) ریسک دلاری ثابت و اندازه‌ی ایزوله ----
   «هر معامله حداکثر R دلار ضرر»: حجم = R ÷ (فاصله‌ی استاپ + کارمزد و لغزش)، اهرم = اهرم امن ایزوله
   (لیکوئید آن سوی استاپ، با ۱۰٪ حاشیه) و نه بیشتر از سقف اهرم تنظیمات، مارجین = حجم ÷ اهرم. */
const riskUsd=()=>+S.riskUsd>0?+S.riskUsd:Math.max(0.1,+((+S.cap||10)*(+S.risk||5)/100).toFixed(2));
function isoSize(E,SL){
  const sd=Math.abs(E-SL)/E;if(!(sd>0))return null;
  const cost=((+S.fee||0)+(+S.slip||0))/100;
  const lev=Math.max(1,Math.min(isoLev(sd*100),+S.maxLev||10));
  const N=riskUsd()/(sd+cost);
  return {lev,margin:+(N/lev).toFixed(2),notional:N,risk:riskUsd(),sd:sd*100,tooBig:N/lev>(+S.acct||Infinity)};
}
/* ورقِ همان فرم ورود، با عددهای ایزوله پرشده (چیزی روی سیگنال ذخیره نمی‌شود) */
function isoEnter(p,sig,ov,px){
  const I=planInputsOf(p,sig,ov,px), E=I.entry||px;
  if(!E||!I.stop){toast('برای ورود ایزوله، ورود و حد ضرر لازم است','err');return sheetEnter(p,sig,ov,px);}
  const pl=xRulePlan(I.dir,E,I.stop,sig.targets), SL=pl?pl.stop:I.stop, z=isoSize(E,SL);
  if(!z){toast('فاصله‌ی استاپ معلوم نیست','err');return;}
  if(z.tooBig)toast('مارجینِ لازم ('+fmtUsd(z.margin)+') از موجودی حساب بیشتر است','err');
  const sg=pl?Object.assign({},sig,{targets:[pl.tp]}):sig;
  sheetEnter(p,sg,Object.assign({},ov,{stop:SL,lev:z.lev,amt:z.margin,market:'futures'}),px,
    {note:'ایزوله · ریسک '+fmtUsd(z.risk)+(pl?' · '+xRuleName(pl.r):''),until:pl?Date.now()+pl.h*36e5:null,iso:true});
}

/* ---- ۴) دیر رسیدی؟ چقدر از راهِ ورود تا تارگت ۱ را قیمت رفته ---- */
function lateOf(I,tgs,px){
  if(px==null||!I.entry)return null;
  const sign=I.dir==='long'?1:-1, E=I.entry;
  const T=(tgs||[]).filter(x=>isFinite(x)&&(x-E)*sign>0).sort((a,b)=>(a-b)*sign)[0];
  if(T==null)return null;
  const f=(px-E)*sign/((T-E)*sign);
  return f>=1?{k:'past',f,T}:f>0.5?{k:'half',f,T}:null;
}

/* ---- ۵) سابقه در کانال‌سنج: همین نماد، و همین نوع ورود ---- */
const SIGKIND_FA={full:'سیگنال‌های کامل',trig:'تریگرها',follow:'پیگیری‌ها («ورود مجدد»)',img:'سیگنال‌های تصویری'};
const sigKindOf=(p,inp)=>inp.need?'img':inp.inh?'follow':inp.trig!=null?'trig':(p.img&&bareImg(p,sigOf(p))?'img':'full');
let HISTV='',HIST=null;
function sigHistory(){
  const v=POSTS.length+'|'+KGEN+'|'+AUDQ.at+'|'+SETVER;
  if(v===HISTV&&HIST)return HIST;
  const tk=new Map(),kd=new Map();
  const put=(m,k,x)=>{const o=m.get(k)||{n:0,w:0,r:0,ids:new Set()};o.n++;if(x.r.st==='win')o.w++;o.r+=x.R;o.ids.add(x.p.id);m.set(k,o);};
  for(const x of audRows()){
    if(!x.r||!['win','loss','exp'].includes(x.r.st)||x.R==null)continue;
    put(tk,x.inp.tk,x);put(kd,sigKindOf(x.p,x.inp),x);
  }
  HISTV=v;HIST={tk,kd};return HIST;
}
function histLine(p){
  const inp=audInput(p);if(!inp||!inp.tk)return '';
  const H=sigHistory(), ex=o=>{if(!o)return null;const self=o.ids.has(p.id);
    const n=o.n-(self?1:0);if(n<3)return null;
    const a=AUD[p.id], R=self&&a?audR(a,inp,audRules().rule):0, w=o.w-(self&&a&&a.st==='win'?1:0);
    return {n,w,avg:(o.r-(self?R||0:0))/n};};
  const t=ex(H.tk.get(inp.tk)), k=ex(H.kd.get(sigKindOf(p,inp)));
  if(!t&&!k)return '';
  const part=(l,o)=>'<b>'+l+'</b> '+faN(o.w)+' از '+faN(o.n)+' برد <span class="'+cls(o.avg)+'" dir="ltr">'+fmtR(o.avg)+'</span>';
  return [t?part(esc(inp.tk),t):'',k?part(SIGKIND_FA[sigKindOf(p,inp)],k):''].filter(Boolean).join(' · ');
}

/* ---- ۶ و ۷) بلندمدت: اسپات، «هولد/بلندمدت» در متن، یا استاپ دورتر از سقفِ ایزوله ---- */
const isoMaxSd=()=>+S.isoMaxSd>0?+S.isoMaxSd:15;
const RX_LONGT=/بلند\s*مدت|میان\s*مدت|هولد|\bhold\b|اسپات\s*(?:نگه|بلند)/i;
function longTermOf(p,sig,I){
  if(I.spot)return 'اسپات';
  if(RX_LONGT.test(faNorm(p.origText||p.text||'')))return 'متن می‌گوید بلندمدت';
  if(I.entry&&I.stop){const sd=Math.abs(I.entry-I.stop)/I.entry*100;if(sd>isoMaxSd())return 'استاپ '+fmtNum(sd)+'٪ دور';}
  return null;
}
const isLongTerm=p=>{const s=sigOf(p);if(!s.isSignal&&!(OVERRIDE[p.id]||{}).sig)return false;
  return !!longTermOf(p,s,planInputsOf(p,s,OVERRIDE[p.id]||{},null));};

/* ---- ۹) پله‌ی دوم («رو X میانگین») بعد از ورود، خودش سفارش منتظر می‌شود ---- */
function addTier2Pending(p,sig,dir,entry){
  const t2=sig.tier2;
  if(!(t2>0)||!(entry>0)||DB.pending.some(x=>x.postId===p.id&&x.kind==='tier2'))return false;
  const sign=dir==='long'?1:-1;
  if((entry-t2)*sign<=0)return false;                  // پله‌ی دوم باید بدتر از ورود باشد (میانگین)
  DB.pending.push({id:uid(),postId:p.id,ticker:sig.ticker||'—',dir,trigger:t2,side:dir==='long'?'down':'up',
    kind:'tier2',market:'futures',postAt:p.date?p.date.getTime():null,entry:t2,stop:sig.stop||null,
    targets:sig.targets||[],at:Date.now(),hit:null});
  return true;
}

/* ---- ۱۰) کپی برای اپ صرافی ---- */
function exchText(p,sig,ov,px){
  const I=planInputsOf(p,sig,ov,px), E=I.entry||px, sign=I.dir==='long'?1:-1;
  const pl=!I.spot&&E&&I.stop?xRulePlan(I.dir,E,I.stop,sig.targets):null;
  const SL=pl?pl.stop:I.stop, z=!I.spot&&E&&SL?isoSize(E,SL):null;
  const tps=pl?[pl.tp]:(sig.targets||[]).filter(t=>E&&(t-E)*sign>0).slice(0,3);
  return [(sig.ticker||'')+'USDT '+(I.spot?'اسپات (خرید)':(I.dir==='long'?'لانگ':'شورت')+(z?' · ایزوله':'')),
    'ورود: '+(E?fmtPrice(E):'بازار'),
    SL?'حد ضرر: '+fmtPrice(SL):'',
    tps.length?'تارگت: '+tps.map(fmtPrice).join(' / '):'',
    z?'اهرم: '+z.lev+'x · مارجین: '+fmtUsd(z.margin)+' (ریسک '+fmtUsd(z.risk)+')':'',
    pl?'سقف زمان: '+XH_FA[pl.r.h]:''].filter(Boolean).join('\n');
}
async function copyExch(p,sig,ov,px){
  const t=exchText(p,sig,ov,px);
  try{await navigator.clipboard.writeText(t);toast('برای صرافی کپی شد','ok');}
  catch(e){openSheet('<h3>کپی برای صرافی</h3><textarea class="cptxt" readonly>'+esc(t)+'</textarea>',sh=>{const ta=sh.querySelector('textarea');ta.focus();ta.select();});}
}

/* ---- روی کارت: خط قاعده‌ی من، دیر رسیدی، سابقه ---- */
function buildIsoBox(p,sig,ov,px){
  const I=planInputsOf(p,sig,ov,px);
  const w=el('div','isobox');
  const lt=lateOf(I,sig.targets,px);
  if(lt)w.appendChild(el('div','flag '+(lt.k==='past'?'d':'w'),'<i>!</i><span>'+(lt.k==='past'
    ?'دیر رسیدی: قیمت از تارگت ۱ ('+fmtPrice(lt.T)+') هم گذشته'
    :'دیر رسیدی: قیمت '+faN(Math.round(lt.f*100))+'٪ از راه ورود تا تارگت ۱ را رفته؛ سود باقی‌مانده کم و ریسک همان است')+'</span>'));
  const E=I.entry||px;
  if(!I.spot&&E&&I.stop){
    const pl=xRulePlan(I.dir,E,I.stop,sig.targets), z=isoSize(E,pl?pl.stop:I.stop);
    if(pl)w.appendChild(el('div','xrline','<b>قاعده‌ی من</b><span>استاپ <bdi dir="ltr">'+fmtPrice(pl.stop)+'</bdi> · هدف <bdi dir="ltr">'+fmtPrice(pl.tp)+
      '</bdi> · تا '+XH_FA[pl.r.h]+'</span><small>'+esc(xRuleName(pl.r))+'</small>'));
    else{const b=el('button','plink',ic('flag')+'<span>قاعده‌ی خروج کوتاه را انتخاب کن (کانال‌سنج › خروج)</span>');
      b.onclick=()=>{AUDOPEN='خروج';lsSet(AUDOPENKEY,AUDOPEN);XSEL.v='short';go('audit');};w.appendChild(b);}
    if(z)w.appendChild(el('div','xrline','<b>ایزوله</b><span>اهرم '+faN(z.lev)+'x · مارجین '+fmtUsd(z.margin)+' · ضرر در استاپ '+fmtUsd(z.risk)+'</span>'));
  }
  const h=histLine(p);
  if(h)w.appendChild(el('div','xrline hist','<b>سابقه</b><span>'+h+'</span>'));
  return w.childNodes.length?w:null;
}
