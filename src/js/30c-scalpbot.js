/* ==================== ربات اسکلپ: تست خودکار و ربات زنده ==================== */
/* کارت «الان لانگ / الان شورت / صبر کن» را خودکار دنبال می‌کند؛ با یک موتور، هم روی روزهای گذشته
   (تست خودکار: جواب در چند ثانیه) و هم از همین حالا به بعد (ربات: معامله‌ی کاغذی، بی‌سفارش به صرافی).

   قاعده‌ها (حالت خودکار):
   - سرِ هر کندلِ تایم‌فریم، اگر پوزیشنی باز نیست، رنج و روند دوباره حساب می‌شود؛ فقط با کندل‌هایی
     که تا همان لحظه بسته شده‌اند (همان swCore و swDecide کارت؛ هیچ نگاهی به آینده نیست).
   - «الان لانگ/شورت» ← همان لحظه با قیمت بازار (با لغزش) وارد می‌شود.
   - «صبر» ← سفارشِ منتظر روی کف (لانگ) و/یا سقف (شورت)، هر جهتی که روند اجازه می‌دهد؛ تا ارزیابی بعد.
   - «رنج شکسته» یا «رنجی نیست» ← هیچ سفارشی.
   - تارگت = لبه‌ی مقابل رنج؛ استاپ = یک باند آن سوی لبه؛ اگر لیکوئید زودتر برسد، لیکوئید (−۱۰۰٪).
   - سیو سود وسطِ راهِ ورود تا تارگت: نصف بسته و استاپ روی ورود (half)، فقط استاپ روی ورود (be)، یا هیچ (none).
   حالت رنج ثابت (fix): کف و سقف خودت؛ لانگ روی کف، شورت روی سقف، سر تارگت همان‌جا برعکس.

   اجرا روی کندل ۱ دقیقه‌ای (تستِ خیلی بلند: ۵ دقیقه‌ای)؛ داخل هر کندل ترتیب تقریبی: سبز اول کف بعد
   سقف، قرمز برعکس. کارمزد رفت‌وبرگشت و لغزشِ ورود بازار و استاپ حساب می‌شود؛ فاندینگ نه.
   ربات زنده هم کندل‌محور است: وقتی برنامه بسته بوده، با باز شدن دقیقاً همان معامله‌هایی را ثبت
   می‌کند که اگر همیشه روشن بود می‌کرد؛ فقط خبرش دیرتر می‌رسد. */
const BOT_SAVE={half:'نصف وسط راه + استاپ روی ورود',be:'وسط راه فقط استاپ روی ورود',none:'بدون سیو: همه سر تارگت'};
const BOT_SAVE_S={half:'نصف + ریسک‌فری',be:'فقط ریسک‌فری',none:'همه سر تارگت'};
const BOT_BY={tp:'تارگت',stop:'استاپ',be:'ریسک‌فری',liq:'لیکوئید',man:'دستی',time:'سقف زمان'};
const BOT_KEEP=300, BOT_EVERY=30000, BOTSTKEY='signaldesk.botst.v1';
/* هر ربات فقط روی دستگاهی که روشنش کرده اجرا می‌شود؛ دستگاه‌های دیگر (با همگام‌سازی) فقط می‌بینند */
const DEVID=(()=>{let d=lsGet('signaldesk.devid');if(!d){d=uid();lsSet('signaldesk.devid',d);}return d;})();
const botMine=b=>!b.dev||b.dev===DEVID;
const faSide=s=>s==='long'?'لانگ':'شورت';

function botCfg(o){
  return {mode:o.mode==='fix'?'fix':o.mode==='scalp'?'scalp':'auto',
    tmax:o.mode==='scalp'?(+o.tmax||60):0,tearly:o.mode==='scalp'?(+o.tearly||0):0,
    miss:o.miss!=null?+o.miss:2,costX:+o.costX||3,flt:Object.assign({},o.flt||{}),lev:Math.min(125,Math.max(1,+o.lev||10)),roi:+o.roi||20,days:+o.days||1,
    tf:IVMS[o.tf]?o.tf:'5m',mg:+o.mg||+S.cap||10,save:BOT_SAVE[o.save]?o.save:'half',
    fee:o.fee!=null?+o.fee:+S.fee||0,slip:o.slip!=null?+o.slip:Math.max(0,+S.slip||0),
    L:o.L!=null?+o.L:null,H:o.H!=null?+o.H:null,d:o.d!=null&&isFinite(o.d)?+o.d:null,first:o.first==='short'?'short':'long'};
}

/* ---- برنامه‌ی هر لحظه: سفارش بازار، سفارش‌های منتظر، یا هیچ ---- */
function botPlan(cfg,pr,st){
  if(cfg.mode==='fix'){
    const {L,H,d}=cfg, lo={side:'long',en:L,tp:H,stop:d!=null?L-d:null}, sh={side:'short',en:H,tp:L,stop:d!=null?H+d:null};
    return {orders:st.started?[lo,sh]:[cfg.first==='short'?sh:lo]};
  }
  if(cfg.mode==='scalp'){
    // اسکلپ: فقط ورود بازار، وقتی کارتِ اسکلپ «الان» می‌گوید
    const d=scDecide(pr,cfg), x=d.x;
    const sum={act:pr?d.act:'nodata',why:d.why,side:d.side,score:d.score,need:d.need,n:d.checks.length,trend:d.trend,
      lo:x?x.bbL:null,hi:x?x.bbU:null,last:x?x.p:null};
    if(d.act==='long'||d.act==='short')return {sum,mkt:{side:d.act,tp:d.plan.tp,stop:d.plan.stop,sc:d.score+'/'+d.checks.length},orders:[]};
    return {sum,orders:[]};
  }
  if(!pr)return {sum:{act:'nodata'},orders:[]};
  const dec=swDecide(pr,{lev:cfg.lev});
  if(dec.act==='none')return {sum:{act:'none'},orders:[]};
  const sum={act:dec.act,trend:dec.trend,where:dec.where,supp:pr.supp,res:pr.res,last:pr.last};
  if(dec.act==='out')return {sum,orders:[]};
  if(dec.act==='long'||dec.act==='short')return {sum,mkt:{side:dec.act,tp:dec.tp,stop:dec.stop},orders:[]};
  const a=pr.aP/100, lo={side:'long',en:pr.supp,tp:pr.res,stop:pr.supp*(1-a)}, sh={side:'short',en:pr.res,tp:pr.supp,stop:pr.res*(1+a)};
  return {sum,orders:dec.trend==='up'?[lo]:dec.trend==='down'?[sh]:[lo,sh]};
}
/* رنج و روند در لحظه‌ی T فقط از کندل‌های تایم‌فریمی که تا T بسته شده‌اند، در «دوره»ی پیش از آن */
function botProf(TF,tfms,days,a){
  let P=null;const memo=new Map(), span=days*864e5;
  const lb=f=>{let lo=0,hi=TF.length;while(lo<hi){const m=(lo+hi)>>1;if(f(TF[m]))hi=m;else lo=m+1;}return lo;};
  return T=>{
    if(memo.has(T))return memo.get(T);
    const i1=lb(k=>k.t+tfms>T), i0=lb(k=>k.t>=T-span);
    let pr=null;
    if(i1-i0>=12&&TF[i1-1].t+tfms-TF[i0].t>=span*0.5){
      if(!P)P=swPts(TF);
      const core=swCore(TF.slice(i0,i1),P.slice(4*i0,4*i1),a);
      pr=Object.assign(core,{aP:a*100,legMax:legStat(core.L).max});
    }
    memo.set(T,pr);return pr;
  };
}

/* ---- موتور ---- */
const xCross=(a,b,x)=>x!=null&&((a<x&&b>=x)||(a>x&&b<=x));
const botMove=(p,x,lev)=>(x-p.en)/p.en*(p.side==='long'?1:-1)*lev*100;     // ٪ روی مارجین، برای کل حجم
function botInitSt(cfg,t0){
  const st={pos:null,pend:[],nextEval:0,lastT:t0,prev:null,started:false,seq:0,plan:null};
  if(cfg.mode==='fix')st.pend=botPlan(cfg,null,st).orders;
  return st;
}
function botOpen(st,cfg,o,px,t,how,ev){
  const sg=o.side==='long'?1:-1, en=how==='mkt'?px*(1+sg*cfg.slip/100):px;
  if(!((o.tp-en)*sg>0)||(o.stop!=null&&!((en-o.stop)*sg>0)))return false;
  const lq=1/cfg.lev-MMR;
  st.pos={side:o.side,en,tp:o.tp,stop:o.stop,stop0:o.stop,liq:cfg.lev>1.05&&lq>0?en*(1-sg*lq):null,
    mid:cfg.save!=='none'?en+(o.tp-en)/2:null,t0:t,how,q:1,real:0,half:false,tr:(st.plan&&st.plan.trend)||null,sc:o.sc||null};
  st.pend=[];st.started=true;st.seq++;
  ev.push({k:'open',t,pos:Object.assign({},st.pos)});
  return true;
}
function botClose(st,cfg,x,t,by,ev){
  const p=st.pos;
  const roi=p.real+(by==='liq'?-100*p.q:p.q*botMove(p,x,cfg.lev))-cfg.fee*cfg.lev;
  const tr={side:p.side,en:p.en,ex:x,t0:p.t0,t1:t,how:p.how,by,half:p.half,roi,usd:roi/100*cfg.mg,tr:p.tr||null,sc:p.sc||null};
  st.pos=null;st.seq++;
  st.pend=cfg.mode==='fix'?botPlan(cfg,null,st).orders:[];
  ev.push({k:'close',t,x:tr});
  return tr;
}
/* حرکت قیمت از cur به b (یک‌نوا)؛ چند رویداد پشت هم در همین پاره ممکن است */
function botSeg(st,cfg,cur,b,t,ev){
  for(let g=0;g<12;g++){
    if(!st.pos){
      let hit=null;
      for(const o of st.pend)if(xCross(cur,b,o.en)&&(!hit||Math.abs(o.en-cur)<Math.abs(hit.en-cur)))hit=o;
      if(!hit)return;
      if(!botOpen(st,cfg,hit,hit.en,t,'lim',ev)){st.pend=st.pend.filter(o=>o!==hit);continue;}
      cur=hit.en;continue;
    }
    const p=st.pos, sg=p.side==='long'?1:-1, dir=(b-cur)*sg;
    if(dir<0){
      const liqFirst=p.liq!=null&&(p.stop==null||(p.liq-p.stop)*sg>0), x=liqFirst?p.liq:p.stop;
      if(!xCross(cur,b,x))return;
      botClose(st,cfg,liqFirst?x:x*(1-sg*cfg.slip/100),t,liqFirst?'liq':p.half?'be':'stop',ev);
      cur=x;continue;
    }
    if(dir>0){
      if(!p.half&&p.mid!=null&&xCross(cur,b,p.mid)){
        if(cfg.save==='half'){p.real+=0.5*botMove(p,p.mid,cfg.lev);p.q=0.5;}
        p.stop=p.en;p.half=true;st.seq++;
        ev.push({k:'save',t,pos:Object.assign({},p)});
        cur=p.mid;continue;
      }
      if(xCross(cur,b,p.tp)){
        const tr=botClose(st,cfg,p.tp,t,'tp',ev);
        cur=tr.ex;
        if(cfg.mode==='fix'){const op=st.pend.find(o=>o.side!==tr.side);if(op)botOpen(st,cfg,op,op.en,t,'lim',ev);}  // همان‌جا برعکس
        continue;
      }
    }
    return;
  }
}
/* کندل‌های بسته‌ی X از st.lastT تا tEnd را جلو می‌برد. prof(T): رنج و روند در لحظه‌ی T (حالت خودکار) */
function botRun(st,cfg,X,xms,prof,tEnd){
  const ev=[], tfms=IVMS[cfg.tf]||3e5;
  for(const k of X){
    if(k.t<st.lastT)continue;
    if(k.t+xms>tEnd)break;
    if(st.prev==null)st.prev=k.o;
    if(cfg.mode!=='fix'&&k.t>=st.nextEval){
      const T=Math.floor(k.t/tfms)*tfms;st.nextEval=T+tfms;
      if(!st.pos){
        const pl=botPlan(cfg,prof?prof(T):null,st);
        st.plan=pl.sum||null;st.pend=pl.orders;
        if(cfg.mode==='scalp'&&pl.sum){const w=st.why||(st.why={}), r=pl.mkt?'in':pl.sum.act==='nodata'?'nodata':pl.sum.why||'mid';w[r]=(w[r]||0)+1;}
        if(pl.mkt)botOpen(st,cfg,pl.mkt,k.o,k.t,'mkt',ev);
      }
    }
    const up=k.c>=k.o;
    for(const q of [k.o,up?k.l:k.h,up?k.h:k.l,k.c]){botSeg(st,cfg,st.prev,q,k.t,ev);st.prev=q;}
    // سقف زمان (اسکلپ): بعد از tmax دقیقه بسته؛ «خروج زود»: بعد از tearly دقیقه اگر هنوز در سود نیست
    const p=st.pos;
    if(p&&cfg.tmax){
      const el=k.t+xms-p.t0;
      if(el>=cfg.tmax*6e4||(cfg.tearly&&!p.half&&el>=cfg.tearly*6e4&&botMove(p,k.c,cfg.lev)<=0))
        botClose(st,cfg,k.c*(1-(p.side==='long'?1:-1)*cfg.slip/100),k.t+xms,'time',ev);
    }
    st.lastT=k.t+xms;
  }
  return ev;
}

/* ---- آمار ---- */
function botStats(T){
  const n=T.length;let usd=0,peak=0,cum=0,dd=0,streak=0,maxL=0,gw=0,gl=0;const by={};
  for(const x of T){usd+=x.usd;cum+=x.usd;peak=Math.max(peak,cum);dd=Math.max(dd,peak-cum);
    if(x.roi>0){streak=0;gw+=x.usd;}else{maxL=Math.max(maxL,++streak);gl-=x.usd;}by[x.by]=(by[x.by]||0)+1;}
  const grp=f=>{const a=T.filter(f);return {n:a.length,w:a.filter(x=>x.roi>0).length,usd:a.reduce((s,x)=>s+x.usd,0)};};
  const w=T.filter(x=>x.roi>0).length;
  return {n,w,wr:n?w/n*100:null,usd,dd,maxL,avg:n?usd/n:null,pf:gl>0?gw/gl:gw>0?Infinity:null,by,
    hold:n?T.reduce((s,x)=>s+(x.t1-x.t0),0)/n/6e4:null,
    long:grp(x=>x.side==='long'),short:grp(x=>x.side==='short'),mkt:grp(x=>x.how==='mkt'),lim:grp(x=>x.how==='lim'),
    flat:grp(x=>x.tr==='flat'),trend:grp(x=>x.tr==='up'||x.tr==='down')};
}
function botTot0(){return {n:0,w:0,usd:0,roi:0,peak:0,dd:0};}
function botBook(b,tr){
  b.trades.push(tr);if(b.trades.length>BOT_KEEP)b.trades=b.trades.slice(-BOT_KEEP);
  const T=b.tot||(b.tot=botTot0());
  T.n++;if(tr.roi>0)T.w++;T.usd+=tr.usd;T.roi+=tr.roi;T[tr.by]=(T[tr.by]||0)+1;
  T.peak=Math.max(T.peak,T.usd);T.dd=Math.max(T.dd,T.peak-T.usd);
}

/* ---- کندل‌ها: یک انبار در حافظه برای هر نماد و تایم‌فریم؛ فقط بخشِ نداشته گرفته می‌شود ---- */
const CC=new Map();
async function ccGet(tk,iv,from,to,x){
  x=x||{};const ms=IVMS[iv], key=tk+'|'+iv;
  let c=CC.get(key);
  const merge=Y=>{if(!Y||!Y.length)return;const t0=Y[0].t;c.X=c.X.filter(k=>k.t<t0).concat(Y);};
  const opt={maxReq:x.maxReq,quiet:x.quiet};
  if(!c||!c.X.length){
    const Y=await swCandles(tk,from,to,x.onProg,iv,opt);
    c={X:Y.slice(),cut:!!Y.cut};CC.set(key,c);
  }else{
    if(c.X[0].t>from+ms){            // بخشِ قدیمی‌تر کم است
      const Y=(await swCandles(tk,from,c.X[0].t-ms,x.onProg,iv,opt)).filter(k=>k.t<c.X[0].t);
      c.X=Y.concat(c.X);
    }
    const last=c.X[c.X.length-1].t;
    if(last<to-ms){                   // کندل‌های تازه (و آخرینِ نیمه‌کاره‌ی قبلی، از نو)
      const Y=await swCandles(tk,last,to,null,iv,opt);
      merge(Y.filter(k=>k.t>=last));
    }
  }
  c.at=Date.now();
  if(c.X.length>20000)c.X=c.X.slice(-20000);
  return c.X;
}

/* ==================== تست خودکار روی روزهای گذشته ==================== */
/* N روز گذشته، با رنجِ «دوره»ی پیش از هر لحظه. هر سه روشِ سیو سود روی همان کندل‌ها. */
/* تست روی گذشته. سبک رنج: رنجِ «دوره»ی پیش از هر لحظه. سبک اسکلپ: اندیکاتورها با ۲۶ ساعت تاریخچه،
   به‌علاوه‌ی «اثر هر شرط»: همان تست یک بار بدون هر شرط، تا معلوم شود کدام واقعاً کمک می‌کند. */
async function botBacktest(tk,o,N,prog){
  const scalp=o.style==='scalp', mode=scalp?'scalp':'auto';
  const D=scalp?SC_HIST/864e5:+o.days||1, tf=IVMS[o.tf]?o.tf:'5m', now=Date.now();
  const exec=N+D<=8?'1m':'5m', xms=IVMS[exec], tfUse=IVMS[tf]>=xms?tf:exec, tfms=IVMS[tfUse];
  const start=Math.ceil((now-N*864e5)/tfms)*tfms, from=Math.floor((start-D*864e5-tfms)/tfms)*tfms;
  const need=Math.ceil((now-from)/xms), maxReq=Math.ceil(need/1000)+1;
  const all=await ccGet(tk,exec,from,now,{maxReq,
    onProg:out=>{prog&&prog('گرفتن کندل '+faN(Math.min(out.length,need))+' از '+faN(need));return false;}});
  const X=all.filter(k=>k.t>=from);
  if(X.length<30)throw new Error('nocandle');
  let prof;
  if(scalp){
    let BX=null;
    if((o.flt||{}).btc!==false&&tk!=='BTC'){
      prog&&prog('گرفتن کندل‌های بیت‌کوین');
      BX=(await ccGet('BTC',exec,from,now,{maxReq}).catch(()=>[])).filter(k=>k.t>=from);
    }
    prof=scSeries(X,xms,tfUse,BX).at;
  }else{
    const TF=tfUse===exec?X:swAggr(X,tfms);
    prof=botProf(TF,tfms,D,(+o.roi||20)/(+o.lev||10)/100);
  }
  // وضعیتِ همه‌ی لحظه‌ها یک بار (برای همه‌ی روش‌ها مشترک)، با مکث‌های کوتاه تا صفحه قفل نشود
  let i=0;
  for(let T=start;T<now;T+=tfms){
    prof(T);
    if(++i%250===0){prog&&prog('سنجش '+faN(Math.round((T-start)/(now-start)*100))+'٪');await sleep(0);}
  }
  const mg=+o.mg||+S.cap||10, base=Object.assign({},o,{mode,tf:tfUse,mg});
  const run=x=>{const cfg=botCfg(Object.assign({},base,x)), st=botInitSt(cfg,start), ev=botRun(st,cfg,X,xms,prof,now);
    const T=ev.filter(e=>e.k==='close').map(e=>e.x);return {T,s:botStats(T),open:st.pos?Object.assign({},st.pos):null,why:st.why||null};};
  const res={};
  for(const save of Object.keys(BOT_SAVE))res[save]=run({save});
  const best=Object.keys(res).sort((x,y)=>res[y].s.usd-res[x].s.usd)[0];
  // اثر هر شرط، با بهترین روشِ سیو سود
  let abl=null;
  if(scalp){
    abl=[];const on=Object.keys(SC_FLT).filter(f=>(o.flt||{})[f]!==false&&!(f==='btc'&&tk==='BTC'));
    for(const f of on)abl.push({k:f,s:run({save:best,flt:Object.assign({},o.flt,{[f]:false})}).s});
    abl.push({k:'all',s:run({save:best,miss:99}).s});
  }
  const t0=X.find(k=>k.t>=start);
  return {tk,N,D,exec,tf:tfUse,style:scalp?'scalp':'range',lev:+o.lev||10,roi:+o.roi||20,mg,fee:+S.fee||0,slip:Math.max(0,+S.slip||0),
    tmax:scalp?+o.tmax||60:0,tearly:scalp?+o.tearly||0:0,miss:o.miss!=null?+o.miss:2,costX:+o.costX||3,flt:Object.assign({},o.flt||{}),
    start,end:now,res,sel:best,best,abl,cut:!!X.cut||X[0].t>from+2*xms,
    hold:t0?(X[X.length-1].c/t0.o-1)*100:null,at:now};
}
/* چرا معامله باز نشد: شمارشِ ارزیابی‌های بی‌پوزیشن (فقط اسکلپ) */
const BOT_WHY={in:'وارد شد',mid:'وسطِ باندها',score:'تأیید کم',cost:'تارگت کوچک در برابر کارمزد',wild:'نزدیک لیکوئید',nodata:'داده کم'};
function botWhyHtml(w){
  if(!w)return '';
  const tot=Object.values(w).reduce((a,b)=>a+b,0);if(!tot)return '';
  const edge=tot-(w.mid||0)-(w.nodata||0);
  return 'از '+faN(tot)+' بار تصمیم‌گیری (بی‌پوزیشن): '+faN(w.mid||0)+' بار قیمت وسطِ باندها بود؛ '+faN(edge)+' بار کنار باند'+
    (edge?' ← '+['in','cost','score','wild'].filter(k=>w[k]).map(k=>BOT_WHY[k]+' '+faN(w[k])).join('، '):'')+(w.nodata?' · داده کم '+faN(w.nodata):'')+'.';
}
function botVerdict(s,r,w){
  if(!s.n){
    let why=r.style==='scalp'?'قیمت به باندها نرسید، تأییدها کامل نشد، یا تارگت در برابر کارمزد کوچک بود.':'رنجی به اندازه‌ی باند نبود، یا قیمت به لبه‌ها نرسید.';
    // وسطِ باندها همیشه زیاد است؛ دلیلِ اصلی از میان بارهایی که قیمت کنار باند بود
    if(w){const top=['cost','score','wild'].filter(k=>w[k]).sort((a,b)=>w[b]-w[a])[0]||(w.mid?'mid':null);
      if(top==='cost')why='بیشترِ بارهایی که قیمت کنار باند بود، تارگت از '+fmtNum(r.costX||3)+' برابرِ کارمزد و لغزش کوچک‌تر بود. «ضریب کارمزد» را کم کن، کارمزدِ تنظیمات را با صرافی‌ات تطبیق بده، یا کندل/سقف زمانِ بزرگ‌تر بگذار.';
      else if(top==='score')why='قیمت کنار باند می‌آمد ولی شرط‌های تأیید کامل نمی‌شد. «حداکثر شرطِ ردشده» را بیشتر کن یا جدول «اثر هر شرط» را ببین.';
      else if(top==='wild')why='استاپ‌ها با این اهرم به لیکوئید نزدیک بودند؛ اهرم را کم کن.';
      else if(top==='mid')why='قیمت تقریباً همیشه وسطِ باندها بود.';}
    return ['i','در این '+faN(r.N)+' روز هیچ معامله‌ای باز نشد: '+why];
  }
  const few=s.n<20, sign=s.usd>0?'مثبت':'منفی';
  return [s.usd>0?(few?'i':'u'):'d',sign+': '+fmtUsd(s.usd)+' با '+faN(s.n)+' معامله (برد '+faN(Math.round(s.wr))+'٪)'+
    (few?' — نمونه کم است (کمتر از ۲۰ معامله)؛ قبل از نتیجه گرفتن، روی چند توکن و بازه‌ی دیگر هم بسنج.':
      s.usd>0?'. ادامه‌ی منطقی: همین را با ربات زنده روی روزهای آینده هم بسنج.':'. این روش با این تنظیم روی این توکن جواب نداده.')];
}

/* تاریخچه‌ی تست‌ها: روی همین دستگاه می‌ماند (حداکثر ۳۰)، با برچسب، فیلتر و مقایسه.
   فهرست معامله‌ها کوتاه نگه داشته می‌شود (بهترین روش ۱۲۰، بقیه ۳۰) تا حافظه‌ی مرورگر پر نشود. */
const BTHKEY='signaldesk.bthist.v1', BTH_MAX=30;
let BTH=(()=>{const v=lsGet(BTHKEY);return Array.isArray(v)?v.filter(e=>e&&e.r):[];})();
const BTOPEN=new Set(), BTCMP=new Set();
const BTQ={on:false,stop:false,msg:''};
const btTagAuto=r=>r.err?'':r.style==='scalp'?'اسکلپ '+SW_TF[r.tf]+' · '+faN(r.tmax)+' دقیقه':'رنج '+SW_TF[r.tf]+' · '+fmtNum(r.D)+' روز';
function btSlim(r){
  if(r.err)return r;const res={};
  for(const [k,v] of Object.entries(r.res))res[k]={s:v.s,why:v.why||null,open:v.open,T:(v.T||[]).slice(-(k===r.best?120:30))};
  return Object.assign({},r,{res});
}
function bthSave(){
  BTH=BTH.slice(0,BTH_MAX);
  while(!lsSet(BTHKEY,BTH)&&BTH.length>3)BTH=BTH.slice(0,Math.ceil(BTH.length/2));   // جا نبود: قدیمی‌ها می‌روند
}
const bthFind=id=>BTH.find(e=>e.id===id);
async function btRun(list){
  if(BTQ.on||!list.length)return;
  Object.assign(BTQ,{on:true,stop:false,msg:''});paintBtProg();
  const o=Object.assign({},SWOPT,{mg:swMg()}), N=+SWOPT.btN||3, batch=uid();
  for(const tk of list){
    if(BTQ.stop)break;
    BTQ.msg=tk+'…';paintBtProg();
    let r;
    try{r=await botBacktest(tk,o,N,m=>{BTQ.msg=tk+': '+m;paintBtProg();});}
    catch(e){r={tk,N,err:e&&e.message==='nocandle'?'کندل '+tk+' نیامد'+(AUDQ.err?' — '+AUDQ.err:''):String(e&&e.message||e)};}
    const en={id:uid(),at:Date.now(),tag:btTagAuto(r),batch,r:btSlim(r)};
    BTH.unshift(en);BTOPEN.add(en.id);
    bthSave();paintBt();
  }
  BTQ.on=false;BTQ.msg='';paintBtProg();paintBt();
}
function paintBtProg(){
  const b=$('#btProg'), go=$('#btGo'), stop=$('#btStop');
  if(go)go.disabled=BTQ.on;
  if(stop)stop.classList.toggle('hide',!BTQ.on);
  if(!b)return;
  b.classList.toggle('hide',!BTQ.on);
  b.innerHTML=BTQ.on?'<span>'+esc(BTQ.msg||'…')+'</span>':'';
}
/* قاعده‌ها، به زبان ساده، با همین تنظیم‌ها */
function botRulesHtml(o){
  const a=(+o.roi||20)/(+o.lev||10);
  if(o.style!=='range'){
    const on=Object.keys(SC_FLT).filter(f=>(o.flt||{})[f]!==false);
    return '<b>ربات اسکلپ چه می‌کند:</b> سرِ هر کندل '+SW_TF[o.tf||'1m']+'، فقط با کندل‌های تا همان لحظه، اندیکاتورها را حساب می‌کند (همان کارت اسکلپ). '+
      'قیمت کنار باند پایین بولینگر ← لانگ، کنار باند بالا ← شورت؛ به شرطی که دست‌کم '+faN(Math.max(0,on.length-(o.miss!=null?+o.miss:2)))+' از '+faN(on.length)+' شرطِ تأیید برقرار باشد '+
      '('+on.map(f=>SC_FLT[f]).join('، ')+'). ورود با قیمت بازار؛ تارگت تا میانه‌ی بولینگر به اندازه‌ی نوسانِ یک ساعت؛ استاپ آن سوی کف/سقف اخیر. '+
      'حداکثر '+faN(+o.tmax||60)+' دقیقه باز می‌ماند'+(+o.tearly?' و اگر بعد از '+faN(o.tearly)+' دقیقه در سود نبود بسته می‌شود':'')+'. '+
      'اهرم '+fmtNum(o.lev)+'x، مارجین $'+fmtNum(swMg())+'، کارمزد '+fmtNum(+S.fee||0)+'٪، لغزش '+fmtNum(+S.slip||0)+'٪. '+
      'هر سه روشِ سیو سود با هم سنجیده می‌شوند، و اثرِ هر شرط جدا.';
  }
  return '<b>ربات چه می‌کند:</b> سرِ هر کندل '+SW_TF[o.tf||'5m']+'، فقط با کندل‌های تا همان لحظه، رنج و روندِ '+
    ({0.5:'۱۲ ساعت',1:'۱ روز',3:'۳ روز',7:'۷ روز'}[+o.days]||faN(o.days)+' روز')+' قبل را حساب می‌کند (همان کارت «الان لانگ/شورت/صبر»). '+
    '«الان لانگ/شورت» ← همان لحظه با قیمت بازار؛ «صبر» ← سفارش روی کف یا سقف، در جهتی که روند اجازه می‌دهد؛ رنج شکسته ← هیچ. '+
    'تارگت لبه‌ی مقابل، استاپ ±'+fmtNum(a)+'٪ آن سوی لبه. '+
    'اهرم '+fmtNum(o.lev)+'x، مارجین $'+fmtNum(swMg())+'، کارمزد '+fmtNum(+S.fee||0)+'٪، لغزش '+fmtNum(+S.slip||0)+'٪ (از تنظیم‌ها). '+
    'هر سه روشِ سیو سود با هم سنجیده می‌شوند.';
}
/* بدنه‌ی بخش «تست خودکار» در تب اسکلپ */
function buildBotBt(b){
  const o=SWOPT;
  const tks=[...new Set(POSTS.map(p=>sigOf(p).ticker).filter(Boolean))].sort();
  b.innerHTML='<div class="grid swopt">'+
    '<div class="fld"><label>نماد (چندتا با فاصله)</label><input id="btTk" dir="ltr" list="btTkL" placeholder="مثلاً AERO SOL" value="'+esc(o.btTk||o.tk||'')+'">'+
      '<datalist id="btTkL">'+tks.map(t=>'<option value="'+esc(t)+'">').join('')+'</datalist></div>'+
    '<div class="fld"><label>بازه‌ی تست</label><select id="btN"><option value="1">۱ روز گذشته</option><option value="3">۳ روز گذشته</option><option value="7">۷ روز گذشته</option></select></div>'+
    (o.style==='range'?'<div class="fld"><label>رنج از</label><select id="btD"><option value="0.5">۱۲ ساعتِ قبل</option><option value="1">۱ روزِ قبل</option><option value="3">۳ روزِ قبل</option><option value="7">۷ روزِ قبل</option></select></div>':'')+
    '</div><div class="hint btrules">'+botRulesHtml(o)+'</div>'+
    '<div class="srow"><button class="btn pri" id="btGo">'+ic('bars')+'<span>تست کن</span></button><button class="btn hide" id="btStop">توقف</button></div>'+
    '<div class="audprog hide" id="btProg"></div><div id="btRes"></div>';
  const q=s=>b.querySelector(s);
  q('#btN').value=String(o.btN||3);if(q('#btD'))q('#btD').value=String(o.days||3);
  const read=()=>{o.btTk=String(q('#btTk').value||'').toUpperCase().replace(/USDT\b/g,'').trim();o.btN=+q('#btN').value||3;
    if(q('#btD'))o.days=+q('#btD').value||3;swOptSave();q('.btrules').innerHTML=botRulesHtml(o);};
  b.querySelectorAll('input,select').forEach(i=>i.onchange=read);
  q('#btGo').onclick=()=>{read();
    const list=[...new Set(o.btTk.split(/[\s,،]+/).filter(t=>/^[A-Z0-9]{2,15}$/.test(t)))].slice(0,6);
    if(!list.length)return toast('نماد را بنویس، مثلاً AERO','err');
    btRun(list);};
  q('#btStop').onclick=()=>{BTQ.stop=true;BTQ.msg='بعد از همین نماد متوقف می‌شود';paintBtProg();};
  setTimeout(()=>{paintBt();paintBtProg();},0);
}
const hmFa=t=>'<bdi>'+jStampFa(new Date(t)).slice(5)+'</bdi>';
function botTradeRows(T){
  return T.slice().reverse().map(x=>'<tr><td class="sd '+x.side+'">'+faSide(x.side)+'</td>'+
    '<td><span class="num" dir="ltr">'+fmtPrice(x.en)+' → '+fmtPrice(x.ex)+'</span><small>'+hmFa(x.t1)+' · '+(x.how==='mkt'?'بازار':'سفارش')+
      ' · '+BOT_BY[x.by]+(x.half&&x.by!=='be'?' · سیو':'')+'</small></td>'+
    '<td class="num '+(x.usd>=0?'u':'d')+'"><bdi>'+fmtUsd(x.usd)+'</bdi><small>'+fmtPct(z0(x.roi))+'</small></td></tr>').join('');
}
const botTradeTable=(T,title,open)=>'<details class="sec sub2 sctr"'+(open?' open':'')+'><summary>'+title+' ('+faN(T.length)+')</summary>'+
  '<div class="tscroll"><table class="tp"><thead><tr><th>جهت</th><th>ورود → خروج</th><th>سود/ضرر</th></tr></thead><tbody>'+botTradeRows(T)+'</tbody></table></div></details>';
function botEqSvg(T,base){
  const v=[base||0];let c=base||0;for(const x of T){c+=x.usd;v.push(+c.toFixed(4));}
  return v.length>1?swSvg(v,[{v:0,c:'e'}],56):'';
}
function botBreak(s){
  const pc=g=>g.n?' (برد '+faN(Math.round(g.w/g.n*100))+'٪)':'';
  const by=Object.entries(s.by).map(([k,n])=>BOT_BY[k]+' '+faN(n)).join(' · ');
  return [by,
    'لانگ '+faN(s.long.n)+pc(s.long)+' · شورت '+faN(s.short.n)+pc(s.short),
    'ورود بازار '+faN(s.mkt.n)+pc(s.mkt)+' · سفارش روی لبه '+faN(s.lim.n)+pc(s.lim),
    (s.flat.n||s.trend.n)?'در رنجِ درجا '+faN(s.flat.n)+pc(s.flat)+' · هم‌جهت روند '+faN(s.trend.n)+pc(s.trend):''].filter(Boolean).join('<br>');
}
function btCardHtml(e){
  const r=e.r, tools='<div class="bttools"><span>'+jStampFa(new Date(e.at))+'</span>'+(e.tag?'<span class="pill mut">'+esc(e.tag)+'</span>':'')+
    '<button class="btn xs" data-act="tag">برچسب</button><button class="btn xs'+(BTCMP.has(e.id)?' on':'')+'" data-act="cmp">مقایسه</button>'+
    '<button class="btn xs" data-act="fold">بستن</button><button class="btn xs" data-act="del">حذف</button></div>';
  if(r.err)return '<div class="swres btres" data-id="'+e.id+'"><div class="swh"><b dir="ltr">'+esc(r.tk)+'</b></div>'+tools+'<div class="flag d"><i>!</i><span>'+esc(r.err)+'</span></div></div>';
  const v=r.res[r.sel], s=v.s, vd=botVerdict(s,r,v.why), T=v.T||[];
  const rows=Object.keys(BOT_SAVE).map(k=>{const q=r.res[k].s;
    return '<tr class="tap'+(k===r.sel?' on':'')+'" data-tk="'+esc(r.tk)+'" data-k="'+k+'"><td>'+(k===r.best&&q.n?'★ ':'')+BOT_SAVE_S[k]+'</td>'+
      '<td class="num">'+faN(q.n)+'</td><td class="num">'+(q.wr==null?'—':faN(Math.round(q.wr))+'٪')+'</td>'+
      '<td class="num '+cls(q.usd)+'"><bdi>'+fmtUsd(q.usd)+'</bdi></td><td class="num'+(q.dd?' d':'')+'"><bdi>'+(q.dd?fmtUsd(-q.dd):'—')+'</bdi></td></tr>';}).join('');
  const sc=r.style==='scalp';
  // اثر هر شرط: بدون آن چه می‌شد (مثبت = شرط ضرر را کم کرده یا سود را زیاد)
  const abl=r.abl&&r.abl.length?'<div class="tgl">اثر هر شرط (با «'+BOT_SAVE_S[r.best]+'»)</div><div class="tscroll"><table class="tp btabl"><thead><tr><th>اگر این شرط نبود</th><th>معامله</th><th>برد</th><th>خالص</th><th>اثرِ شرط</th></tr></thead><tbody>'+
    r.abl.map(a=>{const d=r.res[r.best].s.usd-a.s.usd;return '<tr><td>'+(a.k==='all'?'بدون هیچ تأیید':SC_FLT[a.k])+'</td><td class="num">'+faN(a.s.n)+'</td><td class="num">'+(a.s.wr==null?'—':faN(Math.round(a.s.wr))+'٪')+
      '</td><td class="num '+cls(a.s.usd)+'"><bdi>'+fmtUsd(a.s.usd)+'</bdi></td><td class="num '+cls(d)+'"><bdi>'+(Math.abs(d)<0.005?'بی‌اثر':(d>0?'+':'')+fmtUsd(d))+'</bdi></td></tr>';}).join('')+
    '</tbody></table></div><div class="hint">«اثرِ شرط» مثبت یعنی بودنش نتیجه را بهتر کرده؛ منفی یعنی بهتر است در تنظیم‌ها خاموشش کنی. با نمونه‌ی کم، به تفاوت‌های کوچک اعتماد نکن.</div>':'';
  return '<div class="swres btres" data-id="'+e.id+'" data-tk="'+esc(r.tk)+'"><div class="swh"><b dir="ltr">'+esc(r.tk)+'</b><span>'+faN(r.N)+' روز گذشته · '+(sc?'اسکلپ':'رنج')+' · ارزیابی هر '+SW_TF[r.tf]+
      ' · اجرا با کندل '+SW_TF[r.exec]+' · '+fmtNum(r.lev)+'x · '+(sc?'حداکثر '+faN(r.tmax)+' دقیقه · '+swMissTxt(r.miss)+' · ضریب کارمزد '+fmtNum(r.costX||3):'باند ±'+fmtNum(r.roi)+'٪ · رنج از '+fmtNum(r.D)+' روز')+' · مارجین $'+fmtNum(r.mg)+'</span></div>'+
    tools+
    (r.cut?'<div class="flag i"><i>i</i><span>کندل‌های این نماد کامل نیامد؛ نتیجه فقط برای بخشی از بازه است.</span></div>':'')+
    '<div class="tscroll"><table class="tp btv"><thead><tr><th>سیو سود</th><th>معامله</th><th>برد</th><th>خالص</th><th>بیشترین افت</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="flag '+vd[0]+'"><i>'+(vd[0]==='d'?'!':'i')+'</i><span>«'+BOT_SAVE_S[r.sel]+'»: '+vd[1]+'</span></div>'+
    (v.why?'<div class="hint btwhy">'+botWhyHtml(v.why)+'</div>':'')+
    (s.n?botEqSvg(T)+'<div class="hint btbrk">'+botBreak(s)+
      '<br>بیشترین باخت پیاپی '+faN(s.maxL)+' · ضریب سود '+(s.pf==null?'—':s.pf===Infinity?'∞':fmtNum(s.pf))+
      (s.hold!=null?' · میانگین نگه‌داری '+fmtNum(s.hold)+' دقیقه':'')+
      (r.hold!=null?' · خودِ قیمت در این مدت '+fmtPct(r.hold):'')+'</div>':'')+
    (v.open?'<div class="hint">آخرِ بازه یک '+faSide(v.open.side)+' از '+fmtPrice(v.open.en)+' هنوز باز بود (در آمار نیامده).</div>':'')+
    abl+(T.length?botTradeTable(T,T.length<s.n?'آخرین معامله‌ها':'معامله‌ها',false):'')+
    '<div class="srow"><button class="btn pri sm" data-bot="'+esc(r.tk)+'">'+ic('play')+'<span>ربات زنده با «'+BOT_SAVE_S[r.sel]+'»</span></button></div>'+
  '</div>';
}
const btBest=r=>r.err?null:r.res[r.best].s;
function btRowHtml(e){
  const r=e.r, q=btBest(r);
  return '<div class="btrow tap" data-id="'+e.id+'"><div class="btrh"><b dir="ltr">'+esc(r.tk)+'</b>'+(e.tag?'<span class="pill mut">'+esc(e.tag)+'</span>':'')+
    (q?'<span class="num '+cls(q.usd)+'"><bdi>'+fmtUsd(q.usd)+'</bdi></span>':'<span class="d">خطا</span>')+'</div>'+
    '<small>'+jStampFa(new Date(e.at))+' · '+faN(r.N)+' روز'+(q?' · '+faN(q.n)+' معامله · بهترین: '+BOT_SAVE_S[r.best]:'')+'</small></div>';
}
/* مقایسه‌ی دو تست کنار هم */
function btCmpHtml(){
  const E=[...BTCMP].map(bthFind).filter(e=>e&&!e.r.err);if(E.length<2)return '';
  const row=(l,f)=>'<tr><td>'+l+'</td>'+E.map(e=>'<td class="num">'+f(e.r,btBest(e.r))+'</td>').join('')+'</tr>';
  return '<div class="tgl">مقایسه</div><div class="tscroll"><table class="tp btcmp"><thead><tr><th></th>'+E.map(e=>'<th><bdi>'+esc(e.r.tk)+'</bdi><small>'+esc(e.tag||'')+'</small></th>').join('')+'</tr></thead><tbody>'+
    row('بازه',r=>faN(r.N)+' روز')+row('سبک',r=>r.style==='scalp'?'اسکلپ · '+faN(r.tmax)+' دقیقه':'رنج')+row('کندل',r=>SW_TF[r.tf])+
    row('اهرم',r=>fmtNum(r.lev)+'x')+row('بهترین سیو',r=>BOT_SAVE_S[r.best])+row('معامله',(r,q)=>faN(q.n))+
    row('برد',(r,q)=>q.wr==null?'—':faN(Math.round(q.wr))+'٪')+row('خالص',(r,q)=>'<bdi class="'+cls(q.usd)+'">'+fmtUsd(q.usd)+'</bdi>')+
    row('بیشترین افت',(r,q)=>q.dd?fmtUsd(-q.dd):'—')+row('نگه‌داری',(r,q)=>q.hold!=null?fmtNum(q.hold)+' دقیقه':'—')+
    '</tbody></table></div><div class="srow"><button class="btn xs" data-act="cmpclr">پاک کردن مقایسه</button></div>';
}
function paintBt(){
  const bi=document.querySelector('.scbar [data-v="bt"] i');if(bi)bi.textContent=faN(BTH.length);
  const box=$('#btRes');if(!box)return;
  if(!BTH.length){box.innerHTML='';return;}
  const F=SWOPT.btF||(SWOPT.btF={tag:'',st:''});
  const tags=[...new Set(BTH.map(e=>e.tag).filter(Boolean))];
  if(F.tag&&!tags.includes(F.tag))F.tag='';
  const list=BTH.filter(e=>(!F.tag||e.tag===F.tag)&&(!F.st||(e.r.style||'range')===F.st));
  let h='<div class="tgl">تست‌های ذخیره‌شده ('+faN(BTH.length)+')</div>'+
    '<div class="pbpick btf">'+[['','همه'],['scalp','اسکلپ'],['range','رنج']].map(([k,t])=>'<button class="pbc'+(F.st===k?' on':'')+'" data-st="'+k+'">'+t+'</button>').join('')+'</div>'+
    (tags.length?'<div class="pbpick btf">'+[''].concat(tags).map(t=>'<button class="pbc'+(F.tag===t?' on':'')+'" data-tag="'+esc(t)+'">'+(t?esc(t):'همه‌ی برچسب‌ها')+'</button>').join('')+'</div>':'');
  h+=btCmpHtml();
  // خلاصه‌ی آخرین اجرای چندنمادی
  const last=BTH[0]&&BTH[0].batch, bat=BTH.filter(e=>e.batch===last&&!e.r.err);
  if(bat.length>1)h+='<div class="tgl">آخرین اجرا</div><div class="tscroll"><table class="tp btsum"><thead><tr><th>نماد</th><th>بهترین سیو</th><th>معامله</th><th>خالص</th></tr></thead><tbody>'+
    bat.map(e=>{const q=btBest(e.r);return '<tr class="tap" data-go="'+e.id+'"><td dir="ltr">'+esc(e.r.tk)+'</td><td>'+BOT_SAVE_S[e.r.best]+'</td><td class="num">'+faN(q.n)+
      '</td><td class="num '+cls(q.usd)+'"><bdi>'+fmtUsd(q.usd)+'</bdi></td></tr>';}).join('')+'</tbody></table></div>';
  h+=list.length?list.map(e=>BTOPEN.has(e.id)?btCardHtml(e):btRowHtml(e)).join(''):'<div class="hint">تستی با این فیلتر نیست.</div>';
  box.innerHTML=h;
  const re=()=>{swOptSave();paintBt();};
  box.querySelectorAll('.btf [data-st]').forEach(b=>b.onclick=()=>{F.st=b.dataset.st;re();});
  box.querySelectorAll('.btf [data-tag]').forEach(b=>b.onclick=()=>{F.tag=b.dataset.tag;re();});
  box.querySelectorAll('.btrow').forEach(n=>n.onclick=()=>{BTOPEN.add(n.dataset.id);paintBt();});
  box.querySelectorAll('.btsum tr[data-go]').forEach(tr=>tr.onclick=()=>{BTOPEN.add(tr.dataset.go);paintBt();
    const n=box.querySelector('.btres[data-id="'+tr.dataset.go+'"]');if(n)n.scrollIntoView({block:'start',behavior:'smooth'});});
  box.querySelectorAll('.btv tr[data-k]').forEach(tr=>tr.onclick=()=>{
    const e=bthFind(tr.closest('[data-id]').dataset.id);if(!e)return;e.r.sel=tr.dataset.k;bthSave();paintBt();});
  box.querySelectorAll('[data-act]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();
    const act=b.dataset.act;
    if(act==='cmpclr'){BTCMP.clear();return paintBt();}
    const id=b.closest('[data-id]').dataset.id, e=bthFind(id);if(!e)return;
    if(act==='fold')BTOPEN.delete(id);
    else if(act==='cmp'){if(BTCMP.has(id))BTCMP.delete(id);else{if(BTCMP.size>=2)BTCMP.delete([...BTCMP][0]);BTCMP.add(id);}
      if(BTCMP.size===2)setTimeout(()=>{const t=box.querySelector('.btcmp');if(t)t.scrollIntoView({block:'center',behavior:'smooth'});},50);}
    else if(act==='del'){BTH=BTH.filter(x=>x.id!==id);BTOPEN.delete(id);BTCMP.delete(id);bthSave();toast('تست پاک شد','info');}
    else if(act==='tag')return btTagSheet(e);
    paintBt();});
  box.querySelectorAll('[data-bot]').forEach(bt=>bt.onclick=()=>{
    const e=bthFind(bt.closest('[data-id]').dataset.id);if(!e)return;const r=e.r;
    botStartSheet({mode:r.style==='scalp'?'scalp':'auto',tk:r.tk,lev:r.lev,roi:r.roi,days:r.D,tf:r.tf,mg:r.mg,save:r.sel,
      tmax:r.tmax,tearly:r.tearly,miss:r.miss,costX:r.costX,flt:r.flt});});
}
/* برچسب یک تست: دسته‌بندیِ دلخواه (مثلاً «آلت‌ها ۵ دقیقه») */
function btTagSheet(e){
  const tags=[...new Set(BTH.map(x=>x.tag).filter(Boolean))];
  openSheet('<h3>برچسب تست · <bdi dir="ltr">'+esc(e.r.tk)+'</bdi></h3><div class="sub">با برچسب، تست‌های هم‌دسته را با هم فیلتر و مقایسه کن.</div>'+
    '<div class="fld"><label>برچسب</label><input id="btTagI" value="'+esc(e.tag||'')+'" maxlength="40"></div>'+
    (tags.length?'<div class="pbpick">'+tags.map(t=>'<button class="pbc" data-t="'+esc(t)+'">'+esc(t)+'</button>').join('')+'</div>':'')+
    '<div class="srow"><button class="btn pri" id="btTagGo">ذخیره</button><button class="btn" id="cx">انصراف</button></div>',
  sh=>{
    sh.querySelector('#cx').onclick=closeSheet;
    sh.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{sh.querySelector('#btTagI').value=b.dataset.t;});
    sh.querySelector('#btTagGo').onclick=()=>{e.tag=String(sh.querySelector('#btTagI').value||'').trim().slice(0,40);bthSave();closeSheet();paintBt();};
  });
}

/* ==================== ربات زنده ==================== */
/* حالتِ هر تیک (lastT و سفارش‌های منتظر) روی همین دستگاه نگه داشته می‌شود؛ داده‌ی اصلی (و همگام‌سازی)
   فقط وقتی معامله‌ای باز یا بسته می‌شود ذخیره می‌شود، نه هر ۳۰ ثانیه. */
let BOTFIX=false, BOTTICK=false, BOTLAST=0;
const BOTERR=new Map(), BOTPX=new Map();
function botList(){
  if(!Array.isArray(DB.scalps))DB.scalps=[];
  if(DB.scalps.some(s=>!s||s.v!==2)){DB.scalps=DB.scalps.filter(s=>s&&s.v===2);save();}   // فقط قالب فعلی
  if(!BOTFIX){BOTFIX=true;
    const loc=lsGet(BOTSTKEY)||{};
    for(const b of DB.scalps){const l=loc[b.id];if(l&&botMine(b)&&l.seq===b.st.seq&&l.lastT>b.st.lastT)b.st=l;}
  }
  return DB.scalps;
}
function botLocSave(){const o={};for(const b of botList())if(botMine(b))o[b.id]=b.st;lsSet(BOTSTKEY,o);}
function botNew(o){
  const cfg=botCfg(o), t0=Math.ceil(Date.now()/6e4)*6e4;
  const b={v:2,id:uid(),tk:o.tk,dev:DEVID,cfg,on:true,at:Date.now(),st:botInitSt(cfg,t0),trades:[],tot:botTot0()};
  botList().unshift(b);save();botLocSave();
  logIt('info','ربات '+b.tk+' روشن شد: '+botDesc(b));
  return b;
}
function botDesc(b){
  const c=b.cfg;
  return (c.mode==='fix'?'رنج ثابت '+fmtPrice(c.L)+' ⇄ '+fmtPrice(c.H):c.mode==='scalp'?'اسکلپ · هر '+SW_TF[c.tf]+' · حداکثر '+faN(c.tmax)+' دقیقه · '+swMissTxt(c.miss):
    'خودکار · رنج از '+fmtNum(c.days)+' روز · هر '+SW_TF[c.tf]+' · باند ±'+fmtNum(c.roi)+'٪')+
    ' · '+fmtNum(c.lev)+'x · $'+fmtNum(c.mg)+' · '+BOT_SAVE_S[c.save];
}
/* آخرین قیمت: کندلِ نیمه‌کاره‌ی آخر یا قیمت‌های معمول برنامه، هر کدام تازه‌تر */
function botPx(tk){const a=BOTPX.get(tk), p=PRICES.get(tk);if(a&&(p==null||a.at>=PX_AT))return a.px;return p!=null?p:a?a.px:null;}
async function botTick(force){
  if(BOTTICK||(!force&&document.hidden))return;
  const act=botList().filter(b=>b.on&&botMine(b));
  if(!act.length)return;
  BOTTICK=true;BOTLAST=Date.now();
  try{
    for(const tk of [...new Set(act.map(b=>b.tk))]){
      const bs=act.filter(b=>b.tk===tk), now=Date.now();
      const from=Math.min(...bs.map(b=>botFrom(b)));
      let X,BX=null;
      try{X=await ccGet(tk,'1m',from,now,{maxReq:12,quiet:true});BOTERR.delete(tk);}
      catch(e){BOTERR.set(tk,'کندل '+tk+' نیامد'+(AUDQ.err?' — '+AUDQ.err:'')+'؛ دوباره امتحان می‌شود.');continue;}
      if(X.length)BOTPX.set(tk,{px:X[X.length-1].c,at:Date.now()});
      // شرطِ بیت‌کوین: کندل‌های بیت‌کوین هم (اگر نیامد، آن شرط برای این دور «نامعلوم» است و شمرده نمی‌شود)
      if(tk!=='BTC'&&bs.some(b=>b.cfg.mode==='scalp'&&b.cfg.flt.btc!==false))
        BX=await ccGet('BTC','1m',from,now,{maxReq:12,quiet:true}).catch(()=>null);
      for(const b0 of bs){
        const b=botList().find(x=>x.id===b0.id);      // در این فاصله ممکن است عوض شده باشد (توقف، حذف، همگام‌سازی)
        if(b&&b.on&&botMine(b))botAdvance(b,X,Date.now(),BX);
      }
    }
    botLocSave();
  }catch(e){logIt('err','ربات اسکلپ: '+(e&&e.message||e));}
  finally{BOTTICK=false;if(view==='scalp')paintBots();paintBotBadge();}
}
/* از کِی کندل لازم است: تاریخچه‌ی تصمیم پیش از آخرین لحظه‌ی سنجیده‌شده */
function botFrom(b){
  const c=b.cfg, tfms=IVMS[c.tf]||3e5;
  if(c.mode==='fix')return b.st.lastT-6e4;
  const back=c.mode==='scalp'?SC_HIST:c.days*864e5;
  return Math.floor((b.st.lastT-back-2*tfms)/tfms)*tfms;
}
function botAdvance(b,X,now,BX){
  const c=b.cfg;let prof=null;
  if(c.mode==='scalp'){
    const from=botFrom(b), W=X.filter(k=>k.t>=from&&k.t+6e4<=now);
    prof=scSeries(W,6e4,c.tf,BX?BX.filter(k=>k.t>=from&&k.t+6e4<=now):null).at;
  }else if(c.mode==='auto'){
    const tfms=IVMS[c.tf]||3e5, from=Math.floor((b.st.lastT-c.days*864e5-2*tfms)/tfms)*tfms;
    const W=X.filter(k=>k.t>=from&&k.t+6e4<=now);
    prof=botProf(c.tf==='1m'?W:swAggr(W,tfms),tfms,c.days,c.roi/c.lev/100);
  }
  const ev=botRun(b.st,c,X,6e4,prof,now);
  if(!ev.length)return;
  for(const e of ev)if(e.k==='close')botBook(b,e.x);
  save();
  botReport(b,ev,now);
}
function botMsg(b,e){
  if(e.k==='open'){const p=e.pos;return b.tk+': '+faSide(p.side)+' گرفت روی '+fmtPrice(p.en)+(p.how==='mkt'?' (بازار'+(p.sc?'، تأیید '+p.sc.replace('/',' از '):'')+')':' (سفارش روی لبه)')+
    ' · تارگت '+fmtPrice(p.tp)+(p.stop!=null?' · استاپ '+fmtPrice(p.stop):'');}
  if(e.k==='save'){const p=e.pos;return b.tk+': سیو سود روی '+fmtPrice(p.mid)+(b.cfg.save==='half'?' — نصفِ '+faSide(p.side)+' بسته شد':'')+' و استاپ رفت روی ورود';}
  const x=e.x;return b.tk+': '+faSide(x.side)+' بسته شد ('+BOT_BY[x.by]+' روی '+fmtPrice(x.ex)+') '+fmtUsd(x.usd)+' · جمع ربات '+fmtUsd(b.tot.usd);
}
function botReport(b,ev,now){
  const late=ev.filter(e=>now-e.t>4*60e3), live=ev.filter(e=>now-e.t<=4*60e3);
  logIt('info','ربات '+b.tk+' — '+ev.map(e=>botMsg(b,e)).join('؛ '));
  const parts=[];
  if(late.length){const cl=late.filter(e=>e.k==='close');
    parts.push('ربات '+b.tk+' وقتی برنامه بسته بود '+faN(cl.length)+' معامله بست ('+fmtUsd(cl.reduce((s,e)=>s+e.x.usd,0))+')');}
  parts.push(...live.slice(-2).map(e=>botMsg(b,e)));
  const msg=parts.join('؛ ');
  const bad=ev.some(e=>e.k==='close'&&e.x.roi<=0);
  toast(esc(msg),bad?'err':'ok');
  try{if(live.length&&navigator.vibrate)navigator.vibrate(bad?[200,80,200]:[120,60,120]);}catch(e){}
  if(F('notify'))notify('ربات اسکلپ',msg,'bot'+b.id);
}
function botAct(id,k){
  const b=botList().find(x=>x.id===id);if(!b)return;
  const now=Date.now();
  if(k==='close'){
    const px=botPx(b.tk);if(!b.st.pos)return;
    if(px==null)return toast('قیمت '+b.tk+' هنوز نیامده','err');
    const ev=[], x=botClose(b.st,b.cfg,px,now,'man',ev);botBook(b,x);
    // کندل‌های پیش از این لحظه دیگر با حالتِ «بی‌پوزیشن» دوباره خوانده نشوند
    Object.assign(b.st,{lastT:Math.max(b.st.lastT,Math.ceil(now/6e4)*6e4),prev:null,nextEval:0});
    save();botLocSave();renderAll();
    toast(b.tk+': دستی بسته شد روی '+fmtPrice(px)+' '+fmtUsd(x.usd),'ok');
  }else if(k==='stop'){
    undoable(b.tk+': ربات متوقف شد'+(b.st.pos?' و پوزیشن بازش بسته شد':''),()=>{
      const px=botPx(b.tk);
      if(b.st.pos&&px!=null){const ev=[];botBook(b,botClose(b.st,b.cfg,px,now,'man',ev));}
      b.on=false;});
    botLocSave();
  }else if(k==='take'){
    // دستگاه عوض شده (نصب دوباره، پاک شدن داده‌ی مرورگر، برگرداندن پشتیبان): ربات از همین دقیقه اینجا ادامه می‌دهد
    Object.assign(b.st,{lastT:Math.ceil(now/6e4)*6e4,prev:null,nextEval:0,pos:null,pend:b.cfg.mode==='fix'?botPlan(b.cfg,null,b.st).orders:[]});
    b.dev=DEVID;b.on=true;save();botLocSave();renderAll();toast(b.tk+': ربات روی این دستگاه روشن شد','ok');setTimeout(()=>botTick(true),200);
  }else if(k==='resume'){
    // فاصله‌ی توقف سنجیده نمی‌شود
    Object.assign(b.st,{lastT:Math.ceil(now/6e4)*6e4,prev:null,nextEval:0,pos:null,pend:b.cfg.mode==='fix'?botPlan(b.cfg,null,b.st).orders:[]});
    b.on=true;save();botLocSave();renderAll();toast(b.tk+': ربات دوباره روشن شد','ok');setTimeout(()=>botTick(true),200);
  }else if(k==='del'){
    undoable(b.tk+': ربات پاک شد',()=>{DB.scalps=botList().filter(x=>x.id!==id);});
    botLocSave();
  }
}
setInterval(()=>botTick(),BOT_EVERY);
setTimeout(()=>botTick(),2500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>botTick(),400);});

/* ---- شروع ربات ---- */
function botStartSheet(o){
  const fix=o.mode==='fix', scl=o.mode==='scalp', S0=SWOPT;
  let flt=Object.assign({},o.flt||S0.flt||{});
  if(!o||!/^[A-Z0-9]{2,15}$/.test(o.tk||''))return toast('اول نماد را بنویس و بسنج','err');
  if(fix&&!(o.L>0&&o.H>o.L))return toast('رنج معتبر نیست: کف باید از سقف کمتر باشد','err');
  const fx=v=>v==null||v===''||!isFinite(v)?'':String(+(+v).toPrecision(6));
  let save=BOT_SAVE[o.save]?o.save:BOT_SAVE[S0.bsave]?S0.bsave:'half';
  const sel=(id,opts,v)=>'<select id="'+id+'">'+Object.entries(opts).map(([k,t])=>'<option value="'+k+'"'+(String(k)===String(v)?' selected':'')+'>'+t+'</option>').join('')+'</select>';
  const fld=(l,h)=>'<div class="fld"><label>'+l+'</label>'+h+'</div>';
  const inp=(id,v,ph)=>'<input id="'+id+'" dir="ltr" inputmode="decimal" value="'+fx(v)+'"'+(ph?' placeholder="'+ph+'"':'')+'>';
  openSheet('<h3>'+(fix?'ربات رنج ثابت':scl?'ربات اسکلپ':'ربات خودکار')+' · <bdi dir="ltr">'+esc(o.tk)+'</bdi></h3>'+
    '<div class="sub">'+(fix?'لانگ روی کف، شورت روی سقف، سر تارگت همان‌جا برعکس؛ استاپ آن سوی رنج.'
      :scl?'کارت اسکلپ را خودش دنبال می‌کند: وقتی قیمت کنار باند است و تأییدها کامل است لانگ یا شورت می‌گیرد، سیو سود می‌کند، و حداکثر تا سقف زمان نگه می‌دارد.'
      :'همان کارت «الان لانگ / الان شورت / صبر» را خودش دنبال می‌کند: لانگ و شورت می‌گیرد، سیو سود می‌کند و می‌بندد.')+
      ' معامله‌ی کاغذی است (به صرافی سفارشی نمی‌رود) و جدا از پوزیشن‌ها و کارنامه ثبت می‌شود. وقتی برنامه بسته است هم از دست نمی‌رود: با باز شدن، از روی کندل‌ها همان کارها ثبت می‌شود.</div>'+
    '<div class="grid swopt">'+
    (fix?fld('کف رنج (ورود لانگ)',inp('bL',o.L))+fld('سقف رنج (ورود شورت)',inp('bH',o.H))+
        fld('استاپ لانگ (زیر کف)',inp('bSL',o.d!=null?o.L-o.d:null,'خالی = بی‌استاپ'))+
        fld('اولین معامله',sel('bFirst',{long:'لانگ روی کف',short:'شورت روی سقف'},o.first==='short'?'short':'long'))
      :scl?fld('ارزیابی هر',sel('bTf',{'1m':'۱ دقیقه','3m':'۳ دقیقه','5m':'۵ دقیقه'},IVMS[o.tf||S0.tf]<=3e5?(o.tf||S0.tf):'1m'))+
        fld('حداکثر نگه‌داری',sel('bTmax',SW_TMAX,o.tmax||S0.tmax||60))+
        fld('خروج زود',sel('bTearly',SW_TEARLY,o.tearly!=null?o.tearly:S0.tearly))+
        fld('ضریب کارمزد',sel('bCostX',SW_COSTX,o.costX||S0.costX||3))+
        fld('حداکثر شرطِ ردشده',sel('bMiss',SW_MISS,o.miss!=null?o.miss:S0.miss))
      :fld('باند روی مارجین (٪)',inp('bRoi',o.roi||S0.roi))+fld('رنج از',sel('bDays',{0.5:'۱۲ ساعتِ قبل',1:'۱ روزِ قبل',3:'۳ روزِ قبل',7:'۷ روزِ قبل'},o.days||S0.days||1))+
        fld('ارزیابی هر',sel('bTf',SW_TF,o.tf||S0.tf||'5m')))+
    fld('اهرم',inp('bLev',o.lev||S0.lev))+fld('مارجین هر معامله ($)',inp('bMg',o.mg||swMg()))+
    '</div>'+
    (scl?'<div class="tgl">شرط‌های تأیید</div><div class="pbpick scflt" id="bFlt">'+Object.entries(SC_FLT).map(([k,v])=>
      '<button class="pbc'+(flt[k]!==false?' on':'')+'" data-k="'+k+'" aria-pressed="'+(flt[k]!==false)+'">'+v+'</button>').join('')+'</div>':'')+
    '<div class="tgl">سیو سود</div><div class="pbpick" id="bSave">'+Object.entries(BOT_SAVE).map(([k,v])=>
      '<button class="pbc'+(k===save?' on':'')+'" data-k="'+k+'" aria-pressed="'+(k===save)+'">'+v+'</button>').join('')+'</div>'+
    '<div class="hint" id="bInfo"></div>'+
    '<div class="srow"><button class="btn pri" id="bGo">'+ic('play')+'<span>روشن کردن ربات</span></button><button class="btn" id="cx">انصراف</button></div>',
  sh=>{
    const q=s=>sh.querySelector(s);
    q('#cx').onclick=closeSheet;
    const num=id=>{const n=q(id);if(!n)return null;const v=parseFloat(normDig(String(n.value||'')).replace(/,/g,''));return isFinite(v)&&v>0?v:null;};
    const read=()=>{
      const r={mode:fix?'fix':scl?'scalp':'auto',tk:o.tk,lev:Math.min(125,Math.max(1,num('#bLev')||10)),mg:num('#bMg')||+S.cap||10,save};
      if(scl){r.tf=q('#bTf').value;r.tmax=+q('#bTmax').value||60;r.tearly=+q('#bTearly').value||0;r.miss=+q('#bMiss').value;r.costX=+q('#bCostX').value||3;r.flt=Object.assign({},flt);}
      else if(fix){r.L=num('#bL');r.H=num('#bH');const sl=num('#bSL');r.d=sl!=null&&r.L!=null&&sl<r.L?r.L-sl:null;r.badSl=sl!=null&&r.L!=null&&sl>=r.L;r.first=q('#bFirst').value;}
      else{r.roi=Math.min(500,Math.max(1,num('#bRoi')||20));r.days=+q('#bDays').value||1;r.tf=q('#bTf').value;}
      return r;
    };
    const info=()=>{
      const r=read(), b=q('#bInfo'), lq=(1/r.lev-MMR)*100, f=(+S.fee||0)*r.lev;
      if(scl){
        const on=Object.keys(SC_FLT).filter(k=>r.flt[k]!==false).length;
        b.innerHTML='سرِ هر کندل '+SW_TF[r.tf]+' ارزیابی · ورود وقتی دست‌کم '+faN(Math.max(0,on-r.miss))+' از '+faN(on)+' شرط برقرار است · حداکثر '+faN(r.tmax)+' دقیقه'+
          (r.tearly?' · بعد از '+faN(r.tearly)+' دقیقه در ضرر بسته می‌شود':'')+'<br>لیکوئید با '+fmtNum(r.lev)+'x حدود '+fmtNum(lq)+'٪ خلاف جهت؛ معامله‌ای که استاپش نزدیکِ آن باشد گرفته نمی‌شود.';
      }else if(fix){
        if(!(r.L&&r.H&&r.H>r.L)){b.innerHTML='<span class="d">کف باید از سقف کمتر باشد.</span>';return;}
        const w=(r.H/r.L-1)*100;
        b.innerHTML='استاپ لانگ '+(r.d!=null?'<b dir="ltr">'+fmtPrice(r.L-r.d)+'</b>':'ندارد')+' · استاپ شورت '+(r.d!=null?'<b dir="ltr">'+fmtPrice(r.H+r.d)+'</b>':'ندارد')+
          ' · هر بُرد حدود <b class="u">'+fmtUsd((w*r.lev-f)/100*r.mg)+'</b>'+(r.d!=null?' · هر استاپ حدود <b class="d">'+fmtUsd(-((r.d/r.L)*100*r.lev+f)/100*r.mg)+'</b>':'')+
          (r.badSl?'<br><span class="d">استاپ لانگ باید زیر کف باشد؛ نادیده گرفته شد.</span>':'');
      }else{
        const a=r.roi/r.lev;
        b.innerHTML='سرِ هر کندل '+SW_TF[r.tf]+' ارزیابی · باند و استاپ ±'+fmtNum(a)+'٪ قیمت · هر استاپ حدود <b class="d">'+fmtUsd(-(r.roi+f)/100*r.mg)+'</b> یا کمتر'+
          (lq<=a*1.5?'<br><span class="d">با '+fmtNum(r.lev)+'x لیکوئید حدود '+fmtNum(lq)+'٪ خلاف جهت است؛ نزدیک استاپ. اهرم را کم کن یا باند را کوچک.</span>':'');
      }
      b.innerHTML+='<br>«'+BOT_SAVE[save]+'».';
    };
    sh.querySelectorAll('input,select').forEach(i=>i.oninput=i.onchange=info);
    sh.querySelectorAll('#bFlt .pbc').forEach(x=>x.onclick=()=>{const k=x.dataset.k, on=flt[k]===false;flt[k]=on;
      x.classList.toggle('on',on);x.setAttribute('aria-pressed',on);info();});
    sh.querySelectorAll('#bSave .pbc').forEach(x=>x.onclick=()=>{save=x.dataset.k;
      sh.querySelectorAll('#bSave .pbc').forEach(y=>{y.classList.toggle('on',y===x);y.setAttribute('aria-pressed',y===x);});info();});
    info();
    q('#bGo').onclick=()=>{
      const r=read();
      if(fix&&!(r.L&&r.H&&r.H>r.L))return toast('کف باید از سقف کمتر باشد','err');
      SWOPT.bsave=save;swOptSave();
      const b=botNew(r);
      closeSheet();SWOPT.open='bots';swOptSave();if(view==='scalp')renderScalp();else go('scalp',true);
      setTimeout(()=>{const c=$('#bot-'+b.id);if(c)c.scrollIntoView({block:'center',behavior:'smooth'});},150);
      toast('ربات '+b.tk+' روشن شد؛ '+(fix?'منتظر رسیدن قیمت به '+fmtPrice(r.first==='short'?r.H:r.L):'سرِ کندل بعدی تصمیم می‌گیرد'),'ok');
      setTimeout(()=>botTick(true),300);
    };
  });
}

/* ---- تب اسکلپ: نوار بالا مثل تب سیگنال‌ها — بررسی | ربات‌ها | تست‌ها | گزارش، و «تنظیم» کنارش ---- */
const SC_VIEWS={tok:'بررسی',bots:'ربات‌ها',bt:'تست‌ها',rep:'گزارش'};
const scView=()=>(SC_VIEWS[SWOPT.open]||SWOPT.open==='opt')?SWOPT.open:'tok';
function scGo(v){SWOPT.open=v;swOptSave();renderScalp();window.scrollTo({top:0,behavior:'smooth'});}
function renderScalp(){
  const box=$('#scBody');if(!box)return;
  // وسط تایپ در فرم، رندرِ دوره‌ای (قیمت، بروزرسانی کانال) فرم را از نو نسازد؛ فقط ربات‌ها
  const ae=document.activeElement;
  if(box.firstChild&&ae&&box.contains(ae)&&/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)){paintBots();return;}
  const v=scView(), L=botList();
  box.innerHTML='';
  const cnt={bots:L.filter(b=>b.on).length,bt:BTH.length};
  const bar=el('div','tools');
  bar.innerHTML='<div class="fbar scbar"><div class="fseg" role="tablist" aria-label="اسکلپ">'+
    Object.entries(SC_VIEWS).map(([k,t])=>'<button class="fb" data-v="'+k+'" aria-pressed="'+(v===k)+'"><span>'+t+'</span>'+(cnt[k]!=null?'<i>'+faN(cnt[k])+'</i>':'')+'</button>').join('')+
    '</div><div class="fside"><button class="fb fbucket" data-v="opt" aria-pressed="'+(v==='opt')+'" title="تنظیم‌ها">'+ic('sliders')+'<span>تنظیم</span></button></div></div>'+
    '<div class="scsum">'+scSummary()+'</div>';
  bar.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>scGo(b.dataset.v));
  bar.querySelector('.scsum').onclick=()=>scGo('opt');
  box.appendChild(bar);
  const pn=el('div','panel swp scview');pn.dataset.v=v;
  try{
    if(v==='opt')swOptBody(pn);
    else if(v==='tok')swTokBody(pn);
    else if(v==='bt')buildBotBt(pn);
    else if(v==='rep')scReportBody(pn);
    else{pn.classList.remove('panel','swp');pn.classList.add('sclive');pn.id='scLive';}
  }catch(e){logIt('err','تب اسکلپ: '+(e&&e.message||e));pn.innerHTML='<b>این بخش ساخته نشد</b><br><span dir="ltr">'+esc(String(e&&e.message||e).slice(0,160))+'</span>';}
  box.appendChild(pn);
  if(v==='bots')paintBots();
  if(Date.now()-BOTLAST>15000)setTimeout(()=>botTick(),60);
}
/* یک خط از تنظیم‌های فعلی، بالای هر صفحه (زدنش «تنظیم» را باز می‌کند) */
function scSummary(){
  const o=SWOPT, sc=swScalp();
  return ic('sliders')+'<span>'+SW_STYLE[sc?'scalp':'range']+' · کندل '+SW_TF[o.tf||'5m']+' · '+fmtNum(o.lev)+'x · $'+fmtNum(swMg())+
    (sc?' · حداکثر '+faN(o.tmax||60)+' دقیقه · '+swMissTxt(o.miss)+' · ضریب کارمزد '+fmtNum(o.costX||3):' · باند '+fmtNum(o.roi)+'٪')+'</span>';
}
function paintBotBadge(){
  const n=(Array.isArray(DB.scalps)?DB.scalps:[]).filter(b=>b&&b.on&&b.st&&b.st.pos).length, e=$('#cScalp');
  if(e){e.textContent=faN(n);e.classList.toggle('z',!n);e.title=n?faN(n)+' ربات با پوزیشن باز':'';}
}
const BOTOPEN=new Set();           // تاریخچه‌های باز، تا رندر دوباره ببندشان
const BOT_KIND={all:'همه',auto:'خودکار',man:'دستی (رنج ثابت)'}, BOT_STS={all:'همه',open:'باز',wait:'منتظر',off:'متوقف'};
const botKind=b=>b.cfg.mode==='fix'?'man':'auto';
const botSts=b=>!b.on?'off':b.st&&b.st.pos?'open':'wait';
function paintBots(){
  const box=$('#scLive');if(!box||DRAGGING)return;
  const L=botList(), F=SWOPT.botF||(SWOPT.botF={k:'all',s:'all'});
  box.innerHTML='';
  if(!L.length){
    box.appendChild(el('div','empty sm','هنوز رباتی روشن نکرده‌ای. در «بررسی» یک نماد را بسنج؛ زیر کارت «الان لانگ/شورت/صبر» دو دکمه هست: '+
      '«تست خودکار» همین روش را روی روزهای گذشته می‌سنجد، و «ربات خودکار» از همین حالا خودش معامله می‌کند.'));
    paintBotBadge();return;
  }
  const n=(k,s)=>L.filter(b=>(k==='all'||botKind(b)===k)&&(s==='all'||botSts(b)===s)).length;
  const chips=(m,key,cur,cnt)=>'<div class="pbpick botf">'+Object.entries(m).map(([k,t])=>'<button class="pbc'+(cur===k?' on':'')+'" data-'+key+'="'+k+'">'+t+' <i>'+faN(cnt(k))+'</i></button>').join('')+'</div>';
  const fl=el('div','botfl',chips(BOT_KIND,'k',F.k,k=>n(k,F.s))+chips(BOT_STS,'s',F.s,s=>n(F.k,s)));
  fl.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{F.k=b.dataset.k;swOptSave();paintBots();});
  fl.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{F.s=b.dataset.s;swOptSave();paintBots();});
  box.appendChild(fl);
  const V=L.filter(b=>(F.k==='all'||botKind(b)===F.k)&&(F.s==='all'||botSts(b)===F.s));
  if(!V.length)box.appendChild(el('div','hint','رباتی با این فیلتر نیست.'));
  for(const b of V)box.appendChild(botCard(b));
  box.appendChild(el('div','hint','ربات‌ها هر ۳۰ ثانیه با کندل ۱ دقیقه‌ای جلو می‌روند (تا وقتی برنامه باز است). اگر برنامه بسته بوده، با باز شدن از روی کندل‌ها '+
    'همان معامله‌ها ثبت می‌شود. «خودکار»: خودش لانگ/شورت را تشخیص می‌دهد؛ «دستی»: رنجی که خودت دادی. معامله‌ی کاغذی است؛ فاندینگ حساب نشده.'));
  paintBotBadge();
}

/* ---- گزارش: کارنامه‌ی ربات‌ها و جمع‌بندی تست‌ها ---- */
const SC_REP={d7:['۷ روز',7],d30:['۳۰ روز',30],all:['همه',0]};
function scReportBody(pn){
  const P=SC_REP[SWOPT.repP]?SWOPT.repP:'d7', days=SC_REP[P][1], t0=days?Date.now()-days*864e5:0;
  const L=botList();
  const all=[];for(const b of L)for(const x of b.trades||[])if(x.t1>=t0)all.push(Object.assign({},x,{b}));
  all.sort((a,b)=>a.t1-b.t1);
  let h='<div class="panelhead"><b>گزارش اسکلپ</b></div><div class="pbpick repp">'+Object.entries(SC_REP).map(([k,v])=>'<button class="pbc'+(P===k?' on':'')+'" data-p="'+k+'">'+v[0]+'</button>').join('')+'</div>';
  if(!all.length)h+='<div class="hint">در این بازه ربات‌ها معامله‌ی بسته‌ای نداشته‌اند.</div>';
  else{
    const s=botStats(all);
    h+='<div class="stats">'+stHtml('معامله',faN(s.n),'',faN(s.w)+' برد · '+faN(s.n-s.w)+' باخت')+
      stHtml('نرخ برد',faN(Math.round(s.wr))+'٪',s.wr>=50?'u':'d')+
      stHtml('خالص',fmtUsd(s.usd),cls(s.usd),'میانگین هر معامله '+fmtUsd(s.avg))+
      stHtml('بیشترین افت',s.dd?fmtUsd(-s.dd):'—',s.dd?'d':'')+
      stHtml('ضریب سود',s.pf==null?'—':s.pf===Infinity?'∞':fmtNum(s.pf),s.pf!=null&&s.pf>=1?'u':'d')+
      stHtml('نگه‌داری',s.hold!=null?fmtNum(s.hold)+' دقیقه':'—','','میانگین')+'</div>'+botEqSvg(all);
    const tbl=(title,rows)=>rows.length?'<div class="tgl">'+title+'</div><div class="tscroll"><table class="tp reptb"><thead><tr><th></th><th>معامله</th><th>برد</th><th>خالص</th></tr></thead><tbody>'+
      rows.map(([l,g])=>'<tr><td>'+l+'</td><td class="num">'+faN(g.n)+'</td><td class="num">'+(g.n?faN(Math.round(g.w/g.n*100))+'٪':'—')+'</td><td class="num '+cls(g.usd)+'"><bdi>'+fmtUsd(g.usd)+'</bdi></td></tr>').join('')+'</tbody></table></div>':'';
    const grp=f=>{const m=new Map();for(const x of all){const k=f(x);if(k==null)continue;const g=m.get(k)||{n:0,w:0,usd:0};g.n++;if(x.roi>0)g.w++;g.usd+=x.usd;m.set(k,g);}return m;};
    const day=grp(x=>jStampFa(new Date(x.t1)).slice(0,10));
    h+=tbl('روزبه‌روز',[...day].sort((a,b)=>a[0]<b[0]?1:-1).map(([k,g])=>['<bdi>'+k+'</bdi>',g]));
    h+=tbl('خودکار یا دستی',[...grp(x=>x.b.cfg.mode)].map(([k,g])=>[{scalp:'خودکار · اسکلپ',auto:'خودکار · رنج',fix:'دستی · رنج ثابت'}[k]||k,g]));
    h+=tbl('به تفکیک نماد',[...grp(x=>x.b.tk)].sort((a,b)=>b[1].usd-a[1].usd).map(([k,g])=>['<bdi dir="ltr">'+esc(k)+'</bdi>',g]));
    h+=tbl('روش سیو سود',[...grp(x=>x.b.cfg.save)].map(([k,g])=>[BOT_SAVE_S[k]||k,g]));
    h+=tbl('چطور بسته شد',[...grp(x=>x.by)].sort((a,b)=>b[1].n-a[1].n).map(([k,g])=>[BOT_BY[k]||k,g]));
    h+=tbl('لانگ یا شورت',[...grp(x=>x.side)].map(([k,g])=>[faSide(k),g]));
    h+=tbl('ساعتِ ورود',[...grp(x=>new Date(x.t0).getHours())].sort((a,b)=>a[0]-b[0]).map(([k,g])=>['<bdi>'+faN(k)+' تا '+faN((k+1)%24)+'</bdi>',g]));
  }
  // جمع‌بندی تست‌ها به تفکیک برچسب
  const ok=BTH.filter(e=>!e.r.err&&e.at>=t0);
  if(ok.length){
    const m=new Map();for(const e of ok){const k=e.tag||'بی‌برچسب', g=m.get(k)||{n:0,pos:0,usd:0,tr:0};const q=btBest(e.r);g.n++;if(q.usd>0)g.pos++;g.usd+=q.usd;g.tr+=q.n;m.set(k,g);}
    h+='<div class="tgl">تست‌ها به تفکیک برچسب</div><div class="tscroll"><table class="tp reptb"><thead><tr><th>برچسب</th><th>تست</th><th>مثبت</th><th>معامله</th><th>جمع خالص</th></tr></thead><tbody>'+
      [...m].map(([k,g])=>'<tr><td>'+esc(k)+'</td><td class="num">'+faN(g.n)+'</td><td class="num">'+faN(g.pos)+'</td><td class="num">'+faN(g.tr)+'</td><td class="num '+cls(g.usd)+'"><bdi>'+fmtUsd(g.usd)+'</bdi></td></tr>').join('')+
      '</tbody></table></div><div class="hint">جمع خالص با بهترین روشِ سیو سودِ هر تست. «مثبت»: چند تست سود داد.</div>';
  }
  pn.innerHTML=h;
  pn.querySelectorAll('.repp [data-p]').forEach(b=>b.onclick=()=>{SWOPT.repP=b.dataset.p;swOptSave();renderScalp();});
}
function botCard(b){
  const c=b.cfg, st=b.st, pos=st.pos, px=botPx(b.tk), mine=botMine(b);
  const flo=pos&&px!=null?pos.real+pos.q*botMove(pos,px,c.lev)-c.fee*c.lev:null, flu=flo!=null?flo/100*c.mg:null;
  const card=el('div','card scard'+(pos?' d-'+pos.side+(flu?(flu>0?' pu':' pd'):''):'')+(b.on?'':' off'));card.id='bot-'+b.id;
  const head=el('div','chead');
  head.appendChild(el('span','tick',b.tk));
  head.appendChild(el('span','pill gold',c.mode==='fix'?'رنج ثابت':c.mode==='scalp'?'ربات اسکلپ':'ربات خودکار'));
  if(pos)head.appendChild(el('span','pill '+pos.side,faSide(pos.side)));
  head.appendChild(el('span','pill mut',fmtNum(c.lev)+'x'));
  head.appendChild(el('span','pill '+(!b.on?'mut':pos?'open':'gold'),!b.on?'متوقف':pos?'باز':'منتظر'));
  head.appendChild(el('div','when',pos?'باز: '+jStampFa(new Date(pos.t0)):'روشن از: '+jStampFa(new Date(b.at))));
  card.appendChild(head);
  const bd=el('div','body');
  const err=BOTERR.get(b.tk);
  if(err&&b.on)bd.appendChild(el('div','flag d','<i>!</i><span>'+esc(err)+'</span>'));
  if(!mine)bd.appendChild(el('div','flag i','<i>i</i><span>این ربات روی دستگاه دیگری روشن شده و همان‌جا اجرا می‌شود؛ اینجا فقط آخرین وضعیتِ همگام‌شده دیده می‌شود. '+
    'اگر آن دستگاه دیگر نیست (یا داده‌ی مرورگر پاک شده)، «اجرا روی این دستگاه» را بزن؛ اگر هست، اول آنجا متوقفش کن.</span>'));
  if(pos){
    const hero=el('div','pnlhero');
    hero.innerHTML='<div><span class="lab">سود/ضرر شناور</span><div class="big '+cls(flu)+'">'+fmtUsd(flu)+'</div></div>'+
      '<div><span class="lab">روی مارجین</span><div class="lp '+cls(flo)+'">'+fmtPct(flo)+'</div></div>'+
      '<div class="side"><span class="lab">قیمت الان</span><div class="lp">'+(px!=null?fmtPrice(px):'—')+'</div></div>';
    bd.appendChild(hero);
    const p={id:'bot-'+b.id,ticker:b.tk,kind:'fut',dir:pos.side,entry:pos.en,stop:pos.stop,targets:pos.mid!=null&&!pos.half?[pos.mid,pos.tp]:[pos.tp],
      lev:c.lev,margin:c.mg*pos.q,baseMargin:c.mg,status:'bot',openedAt:pos.t0,partials:[],log:[]};
    try{bd.appendChild(buildLadder(p,px,posMetrics(p,px)));}catch(e){}
    bd.appendChild(el('div','scnext',ic('bolt')+'<span>'+(pos.half?(c.save==='half'?'نصفش روی '+fmtPrice(pos.mid)+' بسته شد؛ ':'')+'استاپ روی ورود (ریسک‌فری) · ':
        pos.mid!=null?'سیو سود روی <b dir="ltr">'+fmtPrice(pos.mid)+'</b> ('+(c.save==='half'?'نصف + ':'')+'استاپ روی ورود) · ':'')+
      'تارگت <b dir="ltr">'+fmtPrice(pos.tp)+'</b> · استاپ <b dir="ltr">'+(pos.stop!=null?fmtPrice(pos.stop):'—')+'</b>'+
      (pos.how==='mkt'?' · ورود بازار':' · ورود با سفارش')+(pos.sc?' · تأیید '+pos.sc.replace('/',' از '):'')+
      (c.tmax?'<br>اگر نرسید، حدود <bdi>'+jStampFa(new Date(pos.t0+c.tmax*6e4)).slice(11)+'</bdi> بسته می‌شود (سقف '+faN(c.tmax)+' دقیقه)':'')+'</span>'));
  }else{
    const pl=st.plan, pend=st.pend||[];
    let t='';
    if(!b.on)t='متوقف است.';
    else if(c.mode!=='fix'&&(!pl||pl.act==='nodata'))t='در حال جمع کردن کندل‌ها برای اولین تصمیم…';
    else if(c.mode==='scalp')t=pl.why==='mid'?'منتظر: لانگ نزدیک <b dir="ltr">'+fmtPrice(pl.lo)+'</b> یا شورت نزدیک <b dir="ltr">'+fmtPrice(pl.hi)+'</b> (باندهای بولینگر)'
      :pl.why==='score'?'قیمت کنار باند است ('+faSide(pl.side)+') ولی تأیید کافی نیست: '+faN(pl.score)+' از '+faN(pl.need)
      :(SC_WHY[pl.why]||'منتظر ارزیابی بعدی.');
    else if(pl&&pl.act==='none')t='در این دوره رنجی به اندازه‌ی باند نیست؛ صبر.';
    else if(pl&&pl.act==='out')t='قیمت از رنج بیرون زده (رنج شکسته)؛ تا رنج تازه صبر.';
    else if(pend.length)t='منتظر: '+pend.map(o=>faSide(o.side)+' روی <b dir="ltr">'+fmtPrice(o.en)+'</b>').join(' یا ');
    else t='منتظر ارزیابی بعدی.';
    if(pl&&pl.trend&&c.mode==='auto')t+='<br>روند: '+SW_TREND[pl.trend]+' · رنج <span dir="ltr">'+fmtPrice(pl.supp)+' ⇄ '+fmtPrice(pl.res)+'</span>';
    if(pl&&pl.trend&&c.mode==='scalp')t+='<br>روند ۱۵ دقیقه: '+SC_TREND[pl.trend];
    if(px!=null&&b.on)t+=' · قیمت الان <b dir="ltr">'+fmtPrice(px)+'</b>';
    bd.appendChild(el('div','scnext wait',ic('clock')+'<span>'+t+'</span>'));
  }
  const T=b.tot||botTot0(), hrs=(Date.now()-b.at)/36e5;
  const kv=el('div','kv');
  kv.innerHTML='<div class="k"><b>روش</b><span class="rt">'+(c.mode==='fix'?'رنج <bdi dir="ltr">'+fmtPrice(c.L)+' ⇄ '+fmtPrice(c.H)+'</bdi>':
      c.mode==='scalp'?'اسکلپ · هر '+SW_TF[c.tf]+' · حداکثر '+faN(c.tmax)+' دقیقه · '+swMissTxt(c.miss):'رنج از '+fmtNum(c.days)+' روز · هر '+SW_TF[c.tf]+' · باند '+fmtNum(c.roi)+'٪')+'</span></div>'+
    '<div class="k"><b>سیو سود</b><span class="rt">'+BOT_SAVE_S[c.save]+'</span></div>'+
    '<div class="k"><b>معامله‌ی بسته</b><span class="rt">بُرد <bdi>'+faN(T.w)+'</bdi> · باخت <bdi>'+faN(T.n-T.w)+'</bdi> · از <bdi>'+faN(T.n)+'</bdi></span></div>'+
    '<div class="k"><b>جمع سود/ضرر</b><span class="rt big '+cls(T.usd)+'"><bdi>'+fmtUsd(T.usd)+'</bdi></span></div>'+
    '<div class="k"><b>بیشترین افت</b><span class="rt'+(T.dd?' d':'')+'"><bdi>'+(T.dd?fmtUsd(-T.dd):'—')+'</bdi></span></div>'+
    '<div class="k"><b>روشن از</b><span class="rt">'+(hrs<48?fmtNum(hrs)+' ساعت پیش':fmtNum(hrs/24)+' روز پیش')+'</span></div>';
  bd.appendChild(kv);
  if(c.mode==='scalp'&&st.why&&!pos)bd.appendChild(el('div','hint btwhy',botWhyHtml(st.why)));
  if(b.trades.length)bd.insertAdjacentHTML('beforeend',botEqSvg(b.trades,T.usd-b.trades.reduce((s,x)=>s+x.usd,0)));
  const act=el('div','srow');
  const btn=(k,t,cl,icn)=>{const x=el('button','btn sm'+(cl?' '+cl:''),(icn?ic(icn):'')+'<span>'+t+'</span>');x.dataset.k=k;x.onclick=()=>botAct(b.id,k);act.appendChild(x);};
  if(pos&&b.on&&mine)btn('close','همین الان ببند','pri','door');
  if(mine){if(b.on)btn('stop','توقف','','pause');else btn('resume','ادامه','pri','play');}
  else btn('take','اجرا روی این دستگاه','','play');
  btn('del','حذف','','trash');
  bd.appendChild(act);
  if(b.trades.length){
    const d=el('details','sec sub2 sctr');d.open=BOTOPEN.has(b.id);
    d.innerHTML='<summary>معامله‌ها ('+faN(b.trades.length)+(T.n>b.trades.length?' از '+faN(T.n):'')+')</summary>'+
      '<div class="tscroll"><table class="tp"><thead><tr><th>جهت</th><th>ورود → خروج</th><th>سود/ضرر</th></tr></thead><tbody>'+botTradeRows(b.trades)+'</tbody></table></div>';
    d.addEventListener('toggle',()=>{d.open?BOTOPEN.add(b.id):BOTOPEN.delete(b.id);});
    bd.appendChild(d);
  }
  card.appendChild(bd);
  return card;
}
