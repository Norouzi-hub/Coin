/* ==================== آزمایشگاه خروج: مسیر واقعی قیمت هر معامله‌ی آزمایشی ====================
   برای هر تست (و اگر بخواهی هر پیشنهاد دفتر)، کندل‌های 5 دقیقه‌ای واقعی از لحظه‌ی ورود تا 24 ساعت بعد
   گرفته می‌شود؛ مهم نیست برنامه در آن فاصله باز بوده یا بسته. از روی همین مسیر:
   - بیشترین سود پیش از خوردن استاپ (و زمانش)، بیشترین افت، و اینکه به +1R/+2R رسید یا نه
   - «اگر سریع خارج می‌شدیم»: با هر آستانه‌ی سود روی مارجین (5٪، 10٪، …) یا R، جمع نتیجه چه می‌شد
     (اگر در یک کندل هم استاپ ممکن بوده هم آستانه، استاپ حساب می‌شود؛ بدبینانه)
   - خروجی JSON با مسیر کامل قیمت، برای بررسی بیرون از برنامه. */
const fmtR0=r=>Math.abs(r)<0.005?'0.00R':fmtR(r);
const RBL={on:false,done:0,n:0,res:null,at:0,auto:false};
const RBL_ROE=[5,10,15,20,30,50], RBL_R=[0.5,1,1.5,2,3];
/* کندل‌های 5 دقیقه‌ای از ورود تا 24 ساعت بعد (یا تا الان)؛ مسیرِ کامل‌شده در IndexedDB می‌ماند */
async function rbPath(it){
  const M5=3e5, from=Math.floor(it.t/M5)*M5, end=it.t+AS_HOLD*36e5, key='rbp:'+it.id;
  const st=await idbGet(key);if(st&&st.full)return st.C;
  const C=(await audCandles(it.tk,'5m',from,Math.min(300,Math.ceil((Math.min(Date.now(),end)-from)/M5)+1),true)).filter(k=>k.t>=from&&k.t<end);
  const full=Date.now()>=end+M5&&C.length&&C[C.length-1].t>=end-2*M5;
  await idbSet(key,{C:C.map(k=>({t:k.t,o:k.o,h:k.h,l:k.l,c:k.c})),full});
  return C;
}
/* آمار مسیر: کندلِ خودِ ورود حساب نمی‌شود (مثل دنبال کردن معامله) */
function rbPathStats(it,C){
  const s=it.dir==='long'?1:-1, u=it.E*it.sd, M5=3e5, t1=Math.floor(it.t/M5)*M5+M5, z=isoSize(it.E,it.SL), lev=z?z.lev:1;
  let mfe=0,tMfe=null,mfe24=0,mae=0,stopAt=null,lastR=null,lastT=null;const touch={};
  for(const k of C){if(k.t<t1)continue;
    const fav=s>0?(k.h-it.E)/u:(it.E-k.l)/u, adv=s>0?(k.l-it.E)/u:(it.E-k.h)/u;
    if(stopAt==null&&adv<=-1)stopAt=k.t;
    if(stopAt==null||k.t<stopAt){if(fav>mfe){mfe=fav;tMfe=k.t;}}
    mfe24=Math.max(mfe24,fav);if(stopAt==null)mae=Math.min(mae,adv);
    for(const r of [0.5,1,1.5,2,3])if(touch[r]==null&&fav>=r&&stopAt==null)touch[r]=k.t;
    lastR=(k.c-it.E)*s/u;lastT=k.t;}
  const end=it.t+AS_HOLD*36e5, full=lastT!=null&&lastT>=end-2*M5;
  return {lev,mfe,tMfe,mfe24,mae,stopAt,touch,lastR,full,n:C.length};
}
/* یک آستانه‌ی خروج روی مسیر: اولین لمسِ آستانه پیش از استاپ ← برد؛ استاپ اول ← −1R؛ هیچ ← قیمت پایان 24 ساعت */
function rbThSim(it,C,thR){
  const s=it.dir==='long'?1:-1, u=it.E*it.sd, M5=3e5, t1=Math.floor(it.t/M5)*M5+M5, c=exCost({tpf:0},it.sd), cT=exCost({tpf:1},it.sd);let last=null;
  for(const k of C){if(k.t<t1)continue;
    const fav=s>0?(k.h-it.E)/u:(it.E-k.l)/u, adv=s>0?(k.l-it.E)/u:(it.E-k.h)/u;
    if(adv<=-1)return {R:-1-c,how:'sl'};
    if(fav>=thR)return {R:thR-cT,how:'th'};       // خروج در آستانه با Limit
    last=k;}
  if(!last)return null;
  const done=last.t>=it.t+AS_HOLD*36e5-2*M5;
  return {R:(last.c-it.E)*s/u-c,how:done?'time':'open'};
}
async function rbLabRun(){
  if(RBL.on)return;
  const L=RB.items.filter(it=>it.k==='test'||(RBL.auto&&it.k==='auto')).filter(it=>it.E>0&&it.sd>0);
  if(!L.length){toast('هنوز معامله‌ی آزمایشی نداری','err');return;}
  Object.assign(RBL,{on:true,done:0,n:L.length,res:null});rbRepaint();
  const res=[];
  try{
    for(const it of L){
      try{const C=await rbPath(it);if(C.length)res.push({it,C,st:rbPathStats(it,C)});}catch(e){}
      RBL.done++;if(RBL.done%3===0)rbRepaint();
    }
  }finally{RBL.on=false;}
  RBL.res=res;RBL.at=Date.now();rbRepaint();
  if(!res.length)toast('مسیر قیمت هیچ معامله‌ای نیامد (اینترنت/فیلترشکن؟)','err');
}
/* جدول آستانه‌ها: سود روی مارجین (با اهرم ایزوله‌ی هر معامله) و R */
function rbLabTable(res){
  const row=(lab,thOf)=>{let n=0,w=0,r=0,op=0;
    for(const x of res){const th=thOf(x);if(!(th>0))continue;const o=rbThSim(x.it,x.C,th);if(!o)continue;if(o.how==='open'){op++;continue;}n++;r+=o.R;if(o.R>0)w++;}
    return n?'<tr><td>'+lab+'</td><td class="num">'+faN(n)+(op?' <small>(+'+faN(op)+' باز)</small>':'')+'</td><td class="num">'+faN(Math.round(w/n*100))+'٪</td>'+
      '<td class="num '+cls(r)+'"><bdi>'+fmtR(r)+'</bdi></td><td class="num '+cls(r)+'"><bdi>'+fmtUsd(r*riskUsd())+'</bdi></td></tr>':'';};
  const plan=(()=>{const D=res.filter(x=>x.it.st!=='open');if(!D.length)return '';const r=D.reduce((a,x)=>a+(x.it.R||0),0),w=D.filter(x=>x.it.R>0).length;
    return '<tr class="on"><td>نقشه‌ی فعلی (همان که اجرا شد)</td><td class="num">'+faN(D.length)+'</td><td class="num">'+faN(Math.round(w/D.length*100))+'٪</td><td class="num '+cls(r)+'"><bdi>'+fmtR(r)+'</bdi></td><td class="num '+cls(r)+'"><bdi>'+fmtUsd(r*riskUsd())+'</bdi></td></tr>';})();
  return '<div class="tscroll"><table class="tp xtab rblab"><thead><tr><th>اگر خارج می‌شدیم در</th><th>تعداد</th><th>برد</th><th>جمع R</th><th>دلار</th></tr></thead><tbody>'+plan+
    RBL_ROE.map(p=>row(faN(p)+'٪ سود روی مارجین',x=>p/100/(x.it.sd*x.st.lev))).join('')+
    RBL_R.map(t=>row('<bdi dir="ltr">+'+t+'R</bdi>',()=>t)).join('')+'</tbody></table></div>';
}
function rbLabHtml(){
  let h='<details class="sec sub2 rblabw"'+(RBLOPEN?' open':'')+'><summary>'+ic('bars')+'آزمایشگاه خروج: مسیر واقعی قیمت</summary>'+
    '<div class="hint">برای هر تست کندل‌های 5 دقیقه‌ای واقعی از ورود تا 24 ساعت بعد گرفته می‌شود (شامل زمانی که برنامه بسته بود). '+
    'می‌بینی هر معامله حداکثر چقدر سود داده، کی، و اگر با آستانه‌ی سود (مثلاً 10٪ روی مارجین) سریع خارج می‌شدیم نتیجه چه بود. اگر در یک کندل هم استاپ ممکن بوده هم آستانه، استاپ حساب شده.</div>'+
    '<div class="srow"><button class="btn sm ok" data-rbl="run"'+(RBL.on?' disabled':'')+'>'+ic('refresh')+'<span>'+(RBL.on?'در حال گرفتن مسیر '+faN(RBL.done)+' از '+faN(RBL.n)+'…':'تحلیل مسیر قیمت')+'</span></button>'+
    '<label class="chk"><input type="checkbox" data-rbl="auto"'+(RBL.auto?' checked':'')+'> با پیشنهادهای دفتر</label></div>';
  const res=RBL.res;
  if(res&&res.length){
    const tot=res.length, hit1=res.filter(x=>x.st.touch[1]!=null).length, hitH=res.filter(x=>x.st.touch[0.5]!=null).length;
    const avgM=res.reduce((a,x)=>a+x.st.mfe,0)/tot, avgRoe=res.reduce((a,x)=>a+x.st.mfe*x.it.sd*x.st.lev*100,0)/tot;
    h+='<div class="rbsum"><b>'+faN(tot)+' معامله</b><span>به +0.5R رسید: '+faN(hitH)+' · به +1R: '+faN(hit1)+'</span><span>میانگین بیشترین سود پیش از استاپ: <b dir="ltr">'+fmtR(avgM)+'</b> (حدود '+faN(Math.round(avgRoe))+'٪ روی مارجین)</span></div>';
    h+=rbLabTable(res);
    h+='<div class="sechd">هر معامله</div>'+res.slice().sort((a,b)=>b.it.t-a.it.t).slice(0,40).map(x=>{const it=x.it,s=x.st,roe=s.mfe*it.sd*s.lev*100,
      dt=s.tMfe?Math.round((s.tMfe-it.t)/6e4):null;
      return '<div class="glnum rblabr"><b dir="ltr">'+esc(it.tk)+'</b> <span class="pill '+it.dir+'">'+(it.dir==='long'?'لانگ':'شورت')+'</span> '+
        (it.st==='open'?'<span class="pill mut">باز</span>':'<span class="pill '+(it.R>0?'win':'lose')+'">'+RB_ST[it.st]+' <bdi dir="ltr">'+fmtR(it.R)+'</bdi></span>')+
        ' · بیشترین سود پیش از استاپ <b class="'+(s.mfe>0.005?'u':'m')+'" dir="ltr">'+fmtR0(s.mfe)+'</b> ('+faN(Math.round(roe))+'٪ روی مارجین '+faN(s.lev)+'x'+(dt!=null?'، '+faN(Math.floor(dt/60))+':'+String(dt%60).padStart(2,'0')+' بعد از ورود':'')+')'+
        (s.stopAt?' · <span class="d">استاپ '+faN(Math.round((s.stopAt-it.t)/6e4))+' دقیقه بعد</span>':'')+(s.full?'':' · <small>هنوز 24 ساعت نشده</small>')+'</div>';}).join('');
    h+='<div class="srow"><button class="btn sm" data-rbl="dl">'+ic('down')+'<span>دانلود فایل</span></button><button class="btn sm" data-rbl="copy">'+ic('share')+'<span>کپی متن</span></button></div>'+
      '<div class="hint">فایل همه‌ی عددها و مسیر کامل قیمت هر معامله را دارد؛ برای بررسی دقیق‌تر بفرست.</div>';
  }else if(res)h+='<div class="hint">مسیر قیمت نیامد.</div>';
  return h+'</details>';
}
let RBLOPEN=false;
/* خروجی: تنظیمات، هر معامله، آمار مسیر و خودِ مسیر (h/l/c نسبت به ورود، ده‌هزارم؛ هر 5 دقیقه) */
function rbLabExport(){
  const res=RBL.res||[];
  const H=rdHealth(),M=RD.M||{},W=d=>M[d]&&M[d].w?Object.fromEntries(RD_FEAT.map((k,i)=>[k,M[d].w[i]]).filter(([,v])=>v)):null;
  return JSON.stringify({v:2,app:'signaldesk',kind:'radar-test-paths',at:new Date().toISOString(),
    settings:{fee:+S.fee||0,slip:+S.slip||0,riskUsd:riskUsd(),rMul:S.rMul,maxLev:+S.maxLev||null,isoMaxSd:isoMaxSd(),exit:rbExEff(),hold:AS_HOLD},
    model:{ex:RD.ex||null,exs:RD.exs||null,reg:RD.reg||null,mt0:RD.mt0||null,ncoin:RD.ncoin||null,ns:RD.ns||null,
      span:RD.span?RD.span.map(t=>new Date(t).toISOString()):null,health:H,cap:RD_CAP,capN:RD.capN??null,divs:RD.divs||null,
      calib:Object.fromEntries(Object.entries(RD.calib||{}).filter(([k])=>!/\|/.test(k)||/^base\|/.test(k)||/^(long|short)\|[0-9]/.test(k))),
      weights:{long:W('long'),short:W('short')},drop:{long:M.long&&M.long.drop||null,short:M.short&&M.short.drop||null}},
    trades:res.map(({it,C,st})=>{const t0=C.length?C[0].t:it.t;
      return {id:it.id,kind:it.k,tk:it.tk,dir:it.dir,t:new Date(it.t).toISOString(),E:it.E,SL:it.SL,sd:+it.sd.toFixed(5),rr:it.rr,ex:it.ex||null,sc:it.sc,stars:it.stars,p:it.p,exp:it.exp,reg:it.reg,
        why:it.why||null,pv:it.pv||null,st:it.st,R:it.R??null,xt:it.xt?new Date(it.xt).toISOString():null,xp:it.xp??null,saved:it.x?{k:it.x.k,rem:it.x.rem,acc:+it.x.acc.toFixed(3)}:null,
        lev:st.lev,stats:{mfe:+st.mfe.toFixed(3),tMfeMin:st.tMfe?Math.round((st.tMfe-it.t)/6e4):null,mfe24:+st.mfe24.toFixed(3),mae:+st.mae.toFixed(3),
          stopMin:st.stopAt?Math.round((st.stopAt-it.t)/6e4):null,touchMin:Object.fromEntries(Object.entries(st.touch).map(([k,v])=>[k,Math.round((v-it.t)/6e4)])),full:st.full},
        path:{t0:new Date(t0).toISOString(),stepMin:5,unit:'1e-4 of entry',hlc:C.map(k=>[Math.round((k.h/it.E-1)*1e4),Math.round((k.l/it.E-1)*1e4),Math.round((k.c/it.E-1)*1e4)])}};})});
}
function rbLabBind(g){
  const w=g.querySelector('.rblabw');if(w)w.ontoggle=()=>{RBLOPEN=w.open;};
  g.querySelectorAll('[data-rbl]').forEach(b=>{const a=b.dataset.rbl;
    if(a==='auto'){b.onchange=()=>{RBL.auto=b.checked;};return;}
    b.onclick=async()=>{
      if(a==='run'){RBLOPEN=true;rbLabRun();return;}
      if(!RBL.res){await rbLabRun();if(!RBL.res)return;}
      const txt=rbLabExport();
      if(a==='dl'){dl('signaldesk-tests-'+new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')+'.json',txt);toast('فایل ساخته شد','ok');}
      else{try{await navigator.clipboard.writeText(txt);toast('کپی شد ('+faN(Math.round(txt.length/1024))+' کیلوبایت)','ok');}catch(e){toast('کپی نشد؛ «دانلود فایل» را بزن','err');}}
    };});
}
