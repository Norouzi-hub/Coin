/* ==================== آزمایشگاه خروج: مسیر واقعی قیمت هر معامله‌ی آزمایشی ====================
   برای هر تست (و اگر بخواهی هر پیشنهاد دفتر)، کندل‌های 5 دقیقه‌ای واقعی از لحظه‌ی ورود تا 24 ساعت بعد
   گرفته می‌شود؛ مهم نیست برنامه در آن فاصله باز بوده یا بسته. از روی همین مسیر:
   - بیشترین سود پیش از خوردن استاپ (و زمانش)، بیشترین افت، و اینکه به +1R/+2R رسید یا نه
   - «اگر سریع خارج می‌شدیم»: با هر آستانه‌ی سود روی مارجین (5٪، 10٪، …) یا R، جمع نتیجه چه می‌شد
     (اگر در یک کندل هم استاپ ممکن بوده هم آستانه، استاپ حساب می‌شود؛ بدبینانه)
   - خروجی JSON با مسیر کامل قیمت، برای بررسی بیرون از برنامه. */
const fmtR0=fmtR;
const RBL={on:false,done:0,n:0,res:null,at:0,auto:false};
const RBL_ROE=[5,10,15,20,30,50], RBL_R=[0.5,1,1.5,2,3];
/* کندل‌های 5 دقیقه‌ای از ورود تا 24 ساعت بعد (یا تا الان)؛ مسیرِ کامل‌شده در IndexedDB می‌ماند */
async function rbPath(it){
  const M5=3e5, from=Math.floor(it.t/M5)*M5, end=it.t+rbHoldH(it)*36e5, key='rbp:'+it.id;
  // مسیر ذخیره‌شده‌ای که از ارز هم‌نامِ دیگری آمده بود (کندل اول دور از ورود) دور ریخته می‌شود
  const st=await idbGet(key);if(st&&st.full&&!(st.C.length&&Math.abs(st.C[0].c/it.E-1)>0.3))return st.C;
  // تا 300 کندل در هر درخواست (بیشتر منبع‌ها)؛ افق 3 روزه چند تکه می‌شود
  const C=[],stop=Math.min(Date.now(),end);let a=from;
  for(let n=0;a<stop&&n<12;n++){const got=(await audCandles(it.tk,'5m',a,Math.min(300,Math.ceil((stop-a)/M5)+1),true,n?null:it.E)).filter(k=>k.t>=a&&k.t<end);
    if(!got.length)break;C.push(...got);a=got[got.length-1].t+M5;if(got.length<250)break;}
  const full=Date.now()>=end+M5&&C.length&&C[C.length-1].t>=end-2*M5;
  await idbSet(key,{C:C.map(k=>({t:k.t,o:k.o,h:k.h,l:k.l,c:k.c})),full});
  return C;
}
/* کندل‌های یک‌ساعته‌ی 30 روزِ پیش از ورود (برای پروفایل حجم و استاپ ساختاری)؛ در IndexedDB می‌ماند */
async function rbHist(it){
  const H=36e5,key='rbh:'+it.id,st=await idbGet(key);if(st&&st.C)return st.C;
  const end=Math.floor(it.t/H)*H,C=(await audCandles(it.tk,'1h',end-720*H,720,true)).filter(k=>k.t<end);
  // ارز هم‌نام: آخرین کندل پیش از ورود باید نزدیک قیمت ورود باشد
  if(!C.length||Math.abs(C[C.length-1].c/it.E-1)>0.3)return [];
  const o=C.map(k=>({t:k.t,o:k.o,h:k.h,l:k.l,c:k.c,v:k.v||0}));await idbSet(key,{C:o});return o;
}
/* یک معامله روی مسیر 5 دقیقه‌ای با استاپ و تارگت دلخواه (R نسبت به ریسکِ همین استاپ، بعد از کارمزد):
   be: در +1R استاپ به ورود؛ بی تارگت تا سقف زمان. اگر در یک کندل هم استاپ ممکن بوده هم تارگت، استاپ (بدبینانه). */
function rbSimX(it,C,stop,tp,be){
  const s=it.dir==='long'?1:-1,E=it.E,risk=(E-stop)*s;if(!(risk>0))return null;
  const sd=risk/E,M5=3e5,t1=Math.floor(it.t/M5)*M5+M5,end=it.t+rbHoldH(it)*36e5,c=exCost({tpf:0},sd),cT=exCost({tpf:1},sd);let st=stop,last=null;
  for(const k of C){if(k.t<t1)continue;if(k.t>=end)break;last=k;
    const lo=s>0?k.l:k.h,hi=s>0?k.h:k.l;
    if((lo-st)*s<=0)return {R:(st-E)*s/risk-c,how:st===E?'be':'sl'};
    if(tp&&(hi-tp)*s>=0)return {R:(tp-E)*s/risk-cT,how:'tp'};
    if(be&&(hi-E)*s>=risk)st=E;}
  if(!last)return null;
  return {R:(last.c-E)*s/risk-c,how:last.t>=end-2*M5?'time':'open'};
}
/* سه روش حجم روی هر تست: الف) استاپ همان، تارگت سطح پرحجم بعدی؛ ب) استاپ ساختاری و تارگت پرحجم؛
   پ) استاپ ساختاری، ریسک‌فری در +1R و نگه داشتن تا سقف زمان */
function rbVolSim(it,C,H){
  const H1=36e5;let i=-1;for(let j=0;j<H.length;j++)if(H[j].t+H1<=it.t)i=j;if(i<48)return null;
  const vp=volLevels(H,i),vs=volSignal(H,i),tg=volTarget(vp,it.E,it.dir,it.sd);let st=volStop(H,i,it.dir,vs);
  if(st&&(it.E-st)*(it.dir==='long'?1:-1)<=0)st=null;
  return {tg,st,bo:vs&&vs.bo&&vs.bo.d===(it.dir==='long'?1:-1),late:vs?vs.late*(it.dir==='long'?1:-1)>0:false,
    A:tg?rbSimX(it,C,it.SL,tg,false):null,B:tg&&st?rbSimX(it,C,st,tg,false):null,C:st?rbSimX(it,C,st,null,true):null};
}
function rbVolTable(res){
  const L=res.filter(x=>x.vol);if(L.length<5)return '';
  const row=(lab,f)=>{const A=L.map(f).filter(o=>o&&o.how!=='open');if(!A.length)return '';const r=A.reduce((a,o)=>a+o.R,0),w=A.filter(o=>o.R>0).length;
    return '<tr><td>'+lab+'</td><td class="num">'+faN(A.length)+'</td><td class="num">'+faN(Math.round(w/A.length*100))+'٪</td><td class="num '+cls(r/A.length)+'"><bdi>'+fmtR(r/A.length)+'</bdi></td><td class="num '+cls(r)+'"><bdi>'+fmtR(r)+'</bdi></td></tr>';};
  const act=x=>x.it.st!=='open'&&x.it.R!=null?{R:x.it.R,how:x.it.st}:null, b1=x=>x.pl&&x.pl.be1&&x.pl.be1.st!=='open'?{R:x.pl.be1.R,how:x.pl.be1.st}:null;
  const g=(k,f)=>row(k,f);
  const bo=L.filter(x=>x.vol.bo).length,lt=L.filter(x=>x.vol.late).length;
  return '<div class="sechd">حجم: تارگت سطح پرحجم و استاپ ساختاری</div><div class="tscroll"><table class="tp xtab rbvolt"><thead><tr><th>روش</th><th>تعداد</th><th>برد</th><th>میانگین</th><th>جمع R</th></tr></thead><tbody>'+
    g('نقشه‌ی فعلی (همان که اجرا شد)',act)+g('ریسک‌فری در +1R، بقیه تا سقف زمان',b1)+
    g('الف) استاپ همان، تارگت سطح پرحجم بعدی',x=>x.vol.A)+g('ب) استاپ ساختاری، تارگت سطح پرحجم',x=>x.vol.B)+g('پ) استاپ ساختاری، ریسک‌فری در +1R، تا سقف زمان',x=>x.vol.C)+
    g('فقط شکست با حجم · نقشه‌ی فعلی',x=>x.vol.bo?act(x):null)+g('فقط حجم دیررس · نقشه‌ی فعلی',x=>x.vol.late?act(x):null)+
    '</tbody></table></div><div class="hint">روی مسیر واقعی 5 دقیقه‌ای همین تست‌ها، بعد از کارمزد. سطح پرحجم: از پروفایل حجم 30 روزِ پیش از ورود (کندل یک‌ساعته). '+
    'استاپ ساختاری: زیر کف کندل شکست اگر شکست با حجم بوده، وگرنه زیر کف 6 ساعت اخیر. R هر روش نسبت به ریسکِ همان استاپ است (با ریسک دلاری ثابت، حجم با استاپ عوض می‌شود). '+
    faN(bo)+' تست شکست با حجم داشتند و '+faN(lt)+' تست حجم دیررس.</div>';
}
/* برگشت هوا روی مسیر واقعی یک تست: همان نقشه‌ای که اجرا شد (rbStep روی یک کپی)، و از ساعتی که هوای همان جهت «نامناسب» شد
   (فقط اگر لحظه‌ی ورود نامناسب نبود): الف) باقی را با قیمت همان لحظه ببند؛ ب) اگر در ضرر است ببند، اگر در سود است استاپ را روی ورود بگذار.
   W: تاریخچه‌ی ساعتی هوا (شروع کندل ← عدد) */
function rbWxSim(it,C,W){
  if(!W||!W.size)return null;
  const H=36e5,M5=3e5,t1=Math.floor(it.t/M5)*M5+M5,end=it.t+rbHoldH(it)*36e5,full=C.length>0&&C[C.length-1].t>=end-2*M5,s=it.dir==='long'?1:-1;
  const w0=W.get(Math.floor(it.t/H)*H-H);if(w0==null)return null;
  const armed=rdWxCls(w0,it.dir)!=='no';
  const run=mode=>{const y={id:it.id,k:it.k,tk:it.tk,dir:it.dir,t:it.t,E:it.E,SL:it.SL,TP:it.TP,sd:it.sd,rr:it.rr,st:'open',ex:it.ex||'tp',x:exNew(),be:false};
    let last=null,trig=null,bk=false;
    for(const k of C){if(k.t<t1)continue;if(k.t>=end)break;
      if(armed&&!trig&&k.t%H===0){const w=W.get(k.t-H);if(w!=null&&rdWxCls(w,it.dir)==='no'){trig=k.t;
        if(mode==='x'||rbLiveR(y,k.o)<=0){rbClose(y,'man',k.o,k.t);break;}bk=true;}}
      if(bk&&(s>0?k.l<=it.E:k.h>=it.E)){rbClose(y,'man',it.E,k.t+M5);break;}
      last=k;if(rbStep(y,k.h,k.l,k.t+M5,k.c))break;}
    if(y.st!=='open')return {R:y.R,how:y.st,trig};
    return last?{R:+rbLiveR(y,last.c).toFixed(3),how:full?'time':'open',trig}:null;};
  const A=run('x'),B=run('b');
  return {armed,trig:A&&A.trig||null,A,B};
}
function rbWxTable(res,noData){
  const L=res.filter(x=>x.wxx&&x.it.st!=='open'&&x.it.R!=null);
  if(!L.length)return '<div class="sechd">برگشت هوا: ببند یا ریسک‌فری</div><div class="hint">'+(noData?'تاریخچه‌ی هوا هنوز ساخته نشده؛ یک بار در «بازار» «تازه کن» بزن (از آن به بعد در گوشی می‌ماند)، بعد دوباره «تحلیل مسیر قیمت».':'تستی با داده‌ی هوای لحظه‌ی ورود نیست.')+'</div>';
  const av=A=>A.length?A.reduce((a,v)=>a+v,0)/A.length:null;
  const row=(lab,f,on)=>{const V=L.map(x=>({v:f(x),d:x.it.dir})).filter(o=>o.v!=null&&o.v.how!=='open');if(!V.length)return '';
    const r=V.reduce((a,o)=>a+o.v.R,0),w=V.filter(o=>o.v.R>0).length,lo=av(V.filter(o=>o.d==='long').map(o=>o.v.R)),sh=av(V.filter(o=>o.d==='short').map(o=>o.v.R));
    const c=v=>v==null?'<td class="num">—</td>':'<td class="num '+cls(v)+'"><bdi>'+fmtR(v)+'</bdi></td>';
    return '<tr'+(on?' class="on"':'')+'><td>'+lab+'</td><td class="num">'+faN(V.length)+'</td><td class="num">'+faN(Math.round(w/V.length*100))+'٪</td>'+c(r/V.length)+c(lo)+c(sh)+c(r)+'</tr>';};
  const act=x=>({R:x.it.R,how:x.it.st}),hit=L.filter(x=>x.wxx.trig),arm=L.filter(x=>x.wxx.armed).length;
  const sub=hit.length?(()=>{const a=av(hit.map(x=>x.it.R)),b=av(hit.map(x=>x.wxx.A.R)),c=av(hit.map(x=>x.wxx.B.R));
    return '<div class="hint">قاعده روی <b>'+faN(hit.length)+'</b> تست اجرا شد (هوا وسط معامله برگشت): میانگین فعلی <b class="'+cls(a)+'" dir="ltr">'+fmtR(a)+'</b> ← الف <b class="'+cls(b)+'" dir="ltr">'+fmtR(b)+'</b> ← ب <b class="'+cls(c)+'" dir="ltr">'+fmtR(c)+'</b>.</div>';})():'';
  return '<div class="sechd">برگشت هوا: ببند یا ریسک‌فری</div><div class="tscroll"><table class="tp xtab rbwxt"><thead><tr><th>روش</th><th>تعداد</th><th>برد</th><th>میانگین</th><th>لانگ</th><th>شورت</th><th>جمع</th></tr></thead><tbody>'+
    row('نقشه‌ی فعلی (همان که اجرا شد)',act,true)+row('الف) هوا که برگشت، باقی را ببند',x=>x.wxx.A)+row('ب) هوا که برگشت: زیان‌ده ببند، سودده ریسک‌فری',x=>x.wxx.B)+'</tbody></table></div>'+sub+
    '<div class="hint">روی مسیر واقعی 5 دقیقه‌ای همین تست‌ها، بعد از کارمزد، با تاریخچه‌ی ساعتی هوا (همان چهار جزء). فقط تست‌هایی که لحظه‌ی ورود هوایشان «نامناسب» نبود ('+faN(arm)+' از '+faN(L.length)+')؛ بقیه دست نمی‌خورند. '+
    'هوا با بسته شدن هر کندل یک‌ساعته دیده می‌شود، پس قاعده از ریزش‌های تند چند دقیقه‌ای عقب می‌ماند.</div>';
}
/* همه‌ی نقشه‌های خروج روی مسیر واقعی یک تست: همان موتور دفتر تست (rbStep) روی یک کپی از معامله.
   باز مانده: اگر 24 ساعت کامل شده با قیمت آخر (خروج زمانی)، وگرنه «باز» با سود/ضرر الان */
function rbAllPlans(it,C){
  const M5=3e5,t1=Math.floor(it.t/M5)*M5+M5,end=it.t+rbHoldH(it)*36e5,out={};
  const full=C.length>0&&C[C.length-1].t>=end-2*M5;
  for(const n of RD_EXN){
    const y={id:it.id,k:it.k,tk:it.tk,dir:it.dir,t:it.t,E:it.E,SL:it.SL,TP:it.TP,sd:it.sd,rr:it.rr,st:'open',ex:n,x:exNew(),be:false};
    let last=null;
    for(const k of C){if(k.t<t1)continue;if(k.t>=end)break;last=k;if(rbStep(y,k.h,k.l,k.t+M5,k.c))break;}
    if(y.st!=='open')out[n]={R:y.R,st:y.st};
    else if(last)out[n]={R:+rbLiveR(y,last.c).toFixed(3),st:full?'time':'open'};
  }
  return out;
}
/* ==== «اگر خلافش را گرفته بودیم» (فقط با درخواست، یکی‌یکی؛ یا یکجا برای خروجی) ====
   همان معامله با جهت برعکس: همان ورود، استاپ آینه‌ی استاپ اول (همان فاصله)، هدف آینه‌ی هدف/تارگت اول،
   و فقط برای همان مدتی که خودش باز بود (ورود تا خروج؛ اگر هنوز باز است تا الان). اگر در آن مدت نه استاپ
   خورد نه هدف، با قیمت لحظه‌ی خروج خودش بسته می‌شود. بعد از کارمزد. v:2 = این تعریف (قبلی تا سقف زمان بود). */
const REV_V=2;
const revDur=ms=>{const m=Math.max(0,Math.round(ms/6e4));return m<60?faN(m)+' دقیقه':faN(Math.floor(m/60))+' ساعت'+(m%60?' و '+faN(m%60)+' دقیقه':'');};
function rbRevSim(it,C){
  const M5=3e5,t1=Math.floor(it.t/M5)*M5+M5,open=it.st==='open',end=!open&&it.xt?it.xt:Date.now();
  const y={id:it.id,k:it.k,tk:it.tk,dir:it.dir==='long'?'short':'long',t:it.t,E:it.E,SL:2*it.E-it.SL,TP:it.TP!=null?2*it.E-it.TP:null,
    sd:it.sd,rr:it.rr,st:'open',ex:it.ex||'tp',x:exNew(),be:false};
  let last=null;
  for(const k of C){if(k.t<t1)continue;if(k.t>=end)break;last=k;if(rbStep(y,k.h,k.l,Math.min(k.t+M5,end),k.c))break;}
  const v={v:REV_V,dur:end-it.t,at:Date.now()};
  if(y.st!=='open')return Object.assign(v,{R:+y.R.toFixed(3),st:y.st});
  // هنوز باز: با قیمت خروج خود معامله (همان لحظه)، یا آخرین کندل
  const px=!open&&it.xp>0?it.xp:last?last.c:null;if(px==null)return null;
  return Object.assign(v,{R:+rbLiveR(y,px).toFixed(3),st:open?'open':'time'});
}
async function rbRevCalc(it){const C=await rbPath(it);const o=rbRevSim(it,C);if(!o)throw new Error('short');it.rev=o;rbSave();return o;}
const revOk=o=>o&&o.v===REV_V;
const REV_ST={tp:'به هدف رسید',sl:'استاپ خورد',be:'ریسک‌فری',trail:'استاپ متحرک',time:'با قیمت خروج خودش',open:'تا الان',man:'با قیمت خروج خودش'};
function rbRevLine(it){const o=it.rev;if(!revOk(o))return '';
  const d=it.st!=='open'&&it.R!=null?o.R-it.R:null;
  return '<div class="rbhold rbrevl"><div><b>اگر خلافش را گرفته بودیم</b> <small>(همان '+revDur(o.dur)+'، '+REV_ST[o.st]+')</small>: '+rbMoney(o.R,it)+
    (d!=null?' · نسبت به خودش <b class="'+cls(d)+'" dir="ltr">'+fmtR(d)+'</b> <small>('+(d>0.05?'خلافش بهتر بود':d<-0.05?'خودش بهتر بود':'فرقی نکرد')+')</small>':'')+'</div></div>';}
/* پوزیشن واقعی: کندل 5 دقیقه‌ای (تا 3 روز) یا یک‌ساعته؛ R با فاصله‌ی استاپ اول، دلار با ریسک اول */
async function posRevCalc(p){
  const E=+p.entry,st0=+(p.stop0!=null?p.stop0:p.stop),s=p.dir==='long'?1:-1;
  if(!(E>0)||!(st0>0)||(E-st0)*s<=0)throw new Error('nostop');
  const t0=+p.openedAt,closed=p.status==='closed'&&p.closedAt,t1=closed?+p.closedAt:Date.now();
  const iv=t1-t0<=3*864e5?'5m':'1h',ms=iv==='5m'?3e5:36e5,C=[];let a=Math.floor(t0/ms)*ms;
  for(let n=0;a<t1&&n<15;n++){const got=(await audCandles(p.ticker,iv,a,Math.min(300,Math.ceil((t1-a)/ms)+1),true,n?null:E)).filter(k=>k.t>=a&&k.t<t1);
    if(!got.length)break;C.push(...got);a=got[got.length-1].t+ms;if(got.length<250)break;}
  const rs=-s,risk=Math.abs(E-st0),SL=2*E-st0,T1=ladTps(p)[0],TP=T1&&2*E-T1>0?2*E-T1:null,c=exCost({tpf:0},risk/E);
  const rOf=px=>(px-E)*rs/risk;let R=null,st=null,last=null;
  for(const k of C){if(k.t<Math.floor(t0/ms)*ms+ms)continue;last=k;
    const adv=rs>0?k.l:k.h,fav=rs>0?k.h:k.l;
    if((adv-SL)*rs<=0){R=-1;st='sl';break;}
    if(TP&&(fav-TP)*rs>=0){R=rOf(TP);st='tp';break;}}
  if(R==null){const px=closed&&p.exitPrice>0?+p.exitPrice:last?last.c:null;if(px==null)throw new Error('short');R=rOf(px);st=closed?'time':'open';}
  R=+(R-c).toFixed(3);
  const r0=risk0Of(p)||0;
  p.rev={v:REV_V,R,usd:+(R*r0).toFixed(2),st,dur:t1-t0,at:Date.now(),iv};save();return p.rev;
}
function posRevHtml(p,m){const o=p.rev;if(!revOk(o))return '';
  const d=p.status==='closed'&&m&&m.r!=null&&isFinite(m.r)?o.R-m.r:null;
  return '<div><b>اگر خلافش را گرفته بودیم</b> <small>(همان '+revDur(o.dur)+'، '+REV_ST[o.st]+')</small>: <b class="'+cls(o.R)+'" dir="ltr">'+fmtR(o.R)+'</b> <b class="'+cls(o.usd)+'" dir="ltr">'+fmtUsd(o.usd)+'</b>'+
    (d!=null?' · نسبت به خودش <b class="'+cls(d)+'" dir="ltr">'+fmtR(d)+'</b> <small>('+(d>0.05?'خلافش بهتر بود':d<-0.05?'خودش بهتر بود':'فرقی نکرد')+')</small>':'')+'</div>';}
/* یکجا (فقط با زدن دکمه): همه‌ی تست‌ها و پوزیشن‌های بسته‌ای که هنوز حساب نشده‌اند، با نوار کار */
let REVALLON=false;
async function revAll(){
  if(REVALLON)return;
  const T=RB.items.filter(it=>it.k==='test'&&it.st!=='open'&&it.st!=='void'&&it.E>0&&it.sd>0&&!revOk(it.rev));
  const P=(DB.positions||[]).filter(p=>p.status==='closed'&&!revOk(p.rev)&&(p.stop0||p.stop));
  const L=[...T.map(x=>['t',x]),...P.map(x=>['p',x])];let nd=0,fail=0;
  if(!L.length)return {n:0,fail:0};
  REVALLON=true;
  jobSet('revall',{title:'«اگر خلافش را گرفته بودیم» برای همه',pause:true,cancel:true,pct:()=>nd/L.length*100,msg:()=>faN(nd)+' از '+faN(L.length),go:revGo});
  try{for(const [k,x] of L){if(!(await jobGate('revall')))break;nd++;
    try{if(k==='t'){const C=await rbPath(x);const o=rbRevSim(x,C);if(o)x.rev=o;else fail++;}else await posRevCalc(x);}catch(e){fail++;}
    if(nd%20===0)rbSave();}}
  finally{REVALLON=false;jobEnd('revall');rbSave();save();}
  return {n:nd,fail};
}
function revExport(){
  const tm=t=>t?new Date(t).toISOString():null;
  const T=RB.items.filter(it=>it.k==='test'&&it.st!=='open'&&revOk(it.rev)).map(it=>({tk:it.tk,dir:it.dir,t:tm(it.t),xt:tm(it.xt),durMin:Math.round(it.rev.dur/6e4),ex:it.ex||null,sc:it.sc,
    E:it.E,SL:it.SL,st:it.st,R:it.R,rev:{R:it.rev.R,st:it.rev.st}}));
  const P=(DB.positions||[]).filter(p=>p.status==='closed'&&revOk(p.rev)).map(p=>{const m=posMetrics(p);return {tk:p.ticker,dir:p.dir,src:posSrc(p).sub,lev:+p.lev||null,
    openedAt:tm(p.openedAt),closedAt:tm(p.closedAt),durMin:Math.round(p.rev.dur/6e4),entry:p.entry,stop0:p.stop0??p.stop,exit:p.exitPrice??null,r:m.r!=null?+m.r.toFixed(3):null,pnl:m.pnl!=null?+m.pnl.toFixed(2):null,
    rev:{R:p.rev.R,usd:p.rev.usd,st:p.rev.st,iv:p.rev.iv}};});
  const sum=L=>{const a=L.reduce((x,o)=>x+(o.R??o.r??0),0),b=L.reduce((x,o)=>x+o.rev.R,0);return {n:L.length,same:+a.toFixed(2),rev:+b.toFixed(2)};};
  return JSON.stringify({v:1,app:'signaldesk',kind:'reverse',at:new Date().toISOString(),
    note:'rev = same trade, opposite direction, mirrored first stop/target, only for the time the trade itself was open, after fees',
    summary:{tests:sum(T),positions:sum(P)},tests:T,positions:P});
}
async function revExportStart(){
  const r=await revAll();if(r&&r.fail)toast(faN(r.fail)+' مورد حساب نشد (کندل نیامد یا استاپ نداشت)','info');
  const txt=revExport(),n=JSON.parse(txt);
  sheetExportTxt(txt,'signaldesk-reverse-'+new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')+'.json',
    faN(n.tests.length)+' تست و '+faN(n.positions.length)+' پوزیشن بسته با «اگر خلافش را گرفته بودیم»');
  if(view==='radar')renderRadar();else renderAll();
}
/* رفتن به بخش «اگر خلافش را گرفته بودیم» در آزمایشی و روشن کردنش لحظه‌ای */
function revGo(){
  RDV='test';try{localStorage.setItem('signaldesk.rdview',RDV);}catch(e){}
  if(view==='radar')renderRadar();else go('radar',true);
  setTimeout(()=>{const n=$('#rbRevBox');if(!n)return;n.scrollIntoView({block:'center',behavior:'smooth'});
    n.classList.remove('flash');void n.offsetWidth;n.classList.add('flash');},120);
}
/* خلاصه‌ی تست‌ها: فقط آن‌هایی که حساب شده‌اند (یکی‌یکی یا یکجا) */
function rbRevHtml(done){
  const L=done.filter(it=>revOk(it.rev)&&it.R!=null),miss=done.length-L.length;
  let h='<div class="rbsum rbrevs" id="rbRevBox"><b class="rbrevh">'+ic('undo')+'اگر خلافش را گرفته بودیم'+(REVALLON?' <small>در حال حساب…</small>':'')+'</b>';
  if(L.length){
    const sum=f=>L.reduce((a,it)=>a+f(it),0),a=sum(it=>it.R),b=sum(it=>it.rev.R),n=L.length,w=f=>Math.round(L.filter(f).length/n*100);
    const D=new Map();for(const it of L){const k=dayNo(new Date(it.xt)),o=D.get(k)||{a:0,b:0};o.a+=it.R;o.b+=it.rev.R;D.set(k,o);}
    const days=[...D.values()],better=days.filter(o=>o.b>o.a).length;
    h+='<span>'+faN(n)+' تست حساب شده · خودش <b class="'+cls(a)+'" dir="ltr">'+fmtR(a)+'</b> ('+faN(w(it=>it.R>0))+'٪ برد) · خلافش <b class="'+cls(b)+'" dir="ltr">'+fmtR(b)+'</b> ('+faN(w(it=>it.rev.R>0))+'٪ برد)</span>'+
      '<span>خلافش در <b>'+faN(better)+'</b> روز از '+faN(days.length)+' روز بهتر بود</span>';
  }
  h+='<span>'+(miss?faN(miss)+' تست هنوز حساب نشده؛ روی هر تست «اگر خلافش را گرفته بودیم؟» را بزن، یا همه را یکجا برای خروجی.':'همه حساب شده‌اند.')+'</span>'+
    '<div class="srow"><button class="btn sm" data-rbrev="exp">'+ic('down')+'<span>خروجی «خلاف جهت» برای بررسی</span></button></div>'+
    '<small>همان استاپ و نقشه، جهت برعکس، فقط برای همان مدتی که خود تست باز بود؛ بعد از کارمزد. اگر برتری خلاف فقط در یکی دو روز است، شانس جهت بازار است نه قاعده. «خروجی» تست‌ها و پوزیشن‌های واقعی بسته را یکجا حساب می‌کند.</small></div>';
  return h;
}
/* جدول: هر نقشه روی همین تست‌های واقعی (بسته‌ها؛ بازها جدا شمرده می‌شوند) */
function rbPlansTable(res){
  const PL=rdExPlans(),av=(a,b)=>b?a/b:null;
  const rows=RD_EXN.map(n=>{const o={n,c:0,w:0,r:0,u:0,op:0,L:[0,0],S:[0,0]};
    for(const x of res){const v=x.pl&&x.pl[n];if(!v)continue;if(v.st==='open'){o.op++;continue;}
      o.c++;o.r+=v.R;o.u+=v.R*rbUsdR(x.it);if(v.R>0)o.w++;const d=x.it.dir==='long'?o.L:o.S;d[0]+=v.R;d[1]++;}
    return o;}).filter(o=>o.c);
  if(!rows.length)return '';
  const best=rows.filter(o=>o.c>=5).sort((a,b)=>b.r/b.c-a.r/a.c)[0];
  const cur={long:rbExEff('long'),short:rbExEff('short')};
  const cell=v=>v==null?'<td class="num">—</td>':'<td class="num '+cls(v)+'"><bdi>'+fmtR(v)+'</bdi></td>';
  return '<div class="sechd">همه‌ی نقشه‌های خروج روی همین تست‌ها</div><div class="tscroll"><table class="tp xtab rbpls"><thead><tr><th>نقشه</th><th>تعداد</th><th>برد</th><th>میانگین</th><th>لانگ</th><th>شورت</th><th>جمع</th><th>دلار</th></tr></thead><tbody>'+
    rows.map(o=>'<tr class="'+(best&&o.n===best.n?'on':'')+'"><td>'+esc(PL[o.n].n)+(best&&o.n===best.n?' ✓':'')+
      (cur.long===o.n||cur.short===o.n?' <small>(الان '+[cur.long===o.n?'لانگ':'',cur.short===o.n?'شورت':''].filter(Boolean).join('، ')+')</small>':'')+'</td>'+
      '<td class="num">'+faN(o.c)+(o.op?' <small>(+'+faN(o.op)+' باز)</small>':'')+'</td><td class="num">'+faN(Math.round(o.w/o.c*100))+'٪</td>'+
      cell(av(o.r,o.c))+cell(av(o.L[0],o.L[1]))+cell(av(o.S[0],o.S[1]))+cell(o.r)+'<td class="num '+cls(o.u)+'"><bdi>'+fmtUsd(o.u)+'</bdi></td></tr>').join('')+'</tbody></table></div>'+
    '<div class="hint">هر ردیف: اگر همه‌ی همین تست‌ها با آن نقشه خارج می‌شدند، روی مسیر واقعی قیمت (کندل 5 دقیقه‌ای، بعد از کارمزد). ✓ بهترین میانگین (دست‌کم 5 معامله). '+
    'این روی تست‌های خودت است؛ «کارنامه» همین را روی 4 ماه گذشته می‌سنجد. وقتی دو تا با هم نمی‌خوانند، یعنی بازار این روزها با میانگین آن 4 ماه فرق دارد.</div>';
}
/* آمار مسیر: کندلِ خودِ ورود حساب نمی‌شود (مثل دنبال کردن معامله) */
function rbPathStats(it,C){
  const s=it.dir==='long'?1:-1, u=it.E*it.sd, M5=3e5, t1=Math.floor(it.t/M5)*M5+M5, lev=rbLev(it);
  let mfe=0,tMfe=null,mfe24=0,mae=0,stopAt=null,lastR=null,lastT=null;const touch={};
  for(const k of C){if(k.t<t1)continue;
    const fav=s>0?(k.h-it.E)/u:(it.E-k.l)/u, adv=s>0?(k.l-it.E)/u:(it.E-k.h)/u;
    if(stopAt==null&&adv<=-1)stopAt=k.t;
    if(stopAt==null||k.t<stopAt){if(fav>mfe){mfe=fav;tMfe=k.t;}}
    mfe24=Math.max(mfe24,fav);if(stopAt==null)mae=Math.min(mae,adv);
    for(const r of [0.5,1,1.5,2,3])if(touch[r]==null&&fav>=r&&stopAt==null)touch[r]=k.t;
    lastR=(k.c-it.E)*s/u;lastT=k.t;}
  const end=it.t+rbHoldH(it)*36e5, full=lastT!=null&&lastT>=end-2*M5;
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
  const done=last.t>=it.t+rbHoldH(it)*36e5-2*M5;
  return {R:(last.c-it.E)*s/u-c,how:done?'time':'open'};
}
async function rbLabRun(){
  if(RBL.on)return;
  const L=RB.items.filter(it=>it.k==='test'||(RBL.auto&&it.k==='auto')).filter(it=>it.E>0&&it.sd>0&&it.st!=='void');
  if(!L.length){toast('هنوز معامله‌ی آزمایشی نداری','err');return;}
  Object.assign(RBL,{on:true,done:0,n:L.length,res:null});rbRepaint();
  jobSet('rblab',{title:'آماده‌سازی خروجی تست‌ها',pause:true,cancel:true,pct:()=>RBL.done/Math.max(1,RBL.n)*100,msg:()=>faN(RBL.done)+' از '+faN(RBL.n)+' تست',
    go:()=>{RDV='test';if(view==='radar')renderRadar();else go('radar');}});
  const res=[];let stop=false,W=null;
  try{W=await rdWxHist();}catch(e){}
  try{
    for(const it of L){
      if(!(await jobGate('rblab'))){stop=true;break;}
      try{const C=await rbPath(it);if(C.length){const x={it,C,st:rbPathStats(it,C),pl:rbAllPlans(it,C)};
        try{const v=rbRevSim(it,C);if(v){x.rev=v;if(it.st!=='open')it.rev=v;}}catch(e){}
        try{const H=await rbHist(it);if(H.length)x.vol=rbVolSim(it,C,H);}catch(e){}
        try{const w=rbWxSim(it,C,W);if(w)x.wxx=w;}catch(e){}
        res.push(x);}}catch(e){}
      RBL.done++;rbRepaint();
    }
  }finally{RBL.on=false;jobEnd('rblab');}
  if(stop){rbRepaint();return;}                // لغو: خروجی نیمه‌کاره ساخته نمی‌شود
  RBL.noWx=!W;RBL.res=res;RBL.at=Date.now();RBL.sig=rbLabSig();try{rbSave();}catch(e){}rbRepaint();
  if(!res.length)toast('مسیر قیمت هیچ معامله‌ای نیامد (اینترنت/فیلترشکن؟)','err');
}
/* جدول آستانه‌ها: سود روی مارجین (با اهرم ایزوله‌ی هر معامله) و R */
function rbLabTable(res){
  const row=(lab,thOf)=>{let n=0,w=0,r=0,op=0,u=0;
    for(const x of res){const th=thOf(x);if(!(th>0))continue;const o=rbThSim(x.it,x.C,th);if(!o)continue;if(o.how==='open'){op++;continue;}n++;r+=o.R;u+=o.R*rbUsdR(x.it);if(o.R>0)w++;}
    return n?'<tr><td>'+lab+'</td><td class="num">'+faN(n)+(op?' <small>(+'+faN(op)+' باز)</small>':'')+'</td><td class="num">'+faN(Math.round(w/n*100))+'٪</td>'+
      '<td class="num '+cls(r)+'"><bdi>'+fmtR(r)+'</bdi></td><td class="num '+cls(r)+'"><bdi>'+fmtUsd(u)+'</bdi></td></tr>':'';};
  const plan=(()=>{const D=res.filter(x=>x.it.st!=='open');if(!D.length)return '';const r=D.reduce((a,x)=>a+(x.it.R||0),0),w=D.filter(x=>x.it.R>0).length;
    return '<tr class="on"><td>نقشه‌ی فعلی (همان که اجرا شد)</td><td class="num">'+faN(D.length)+'</td><td class="num">'+faN(Math.round(w/D.length*100))+'٪</td><td class="num '+cls(r)+'"><bdi>'+fmtR(r)+'</bdi></td><td class="num '+cls(r)+'"><bdi>'+fmtUsd(rbUsd(D.map(x=>x.it)))+'</bdi></td></tr>';})();
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
    h+=rbPlansTable(res);
    h+=rbLabTable(res);
    h+=rbVolTable(res);
    h+=rbWxTable(res,RBL.noWx);
    h+='<div class="sechd">هر معامله</div>'+res.slice().sort((a,b)=>b.it.t-a.it.t).slice(0,40).map(x=>{const it=x.it,s=x.st,roe=s.mfe*it.sd*s.lev*100,
      dt=s.tMfe?Math.round((s.tMfe-it.t)/6e4):null;
      return '<div class="glnum rblabr"><b dir="ltr">'+esc(it.tk)+'</b> <span class="pill '+it.dir+'">'+(it.dir==='long'?'لانگ':'شورت')+'</span> '+
        (it.st==='open'?'<span class="pill mut">باز</span>':'<span class="pill '+(it.R>0?'win':'lose')+'">'+RB_ST[it.st]+' <bdi dir="ltr">'+fmtR(it.R)+'</bdi></span>')+
        ' · بیشترین سود پیش از استاپ <b class="'+(s.mfe>0.005?'u':'m')+'" dir="ltr">'+fmtR0(s.mfe)+'</b> ('+faN(Math.round(roe))+'٪ روی مارجین '+faN(s.lev)+'x'+(dt!=null?'، '+faN(Math.floor(dt/60))+':'+String(dt%60).padStart(2,'0')+' بعد از ورود':'')+')'+
        (s.stopAt?' · <span class="d">استاپ '+faN(Math.round((s.stopAt-it.t)/6e4))+' دقیقه بعد</span>':'')+(s.full?'':' · <small>هنوز 24 ساعت نشده</small>')+rbPlRow(x)+'</div>';}).join('');
    h+='<div class="srow"><button class="btn sm" data-rbl="dl">'+ic('down')+'<span>دانلود فایل</span></button><button class="btn sm" data-rbl="copy">'+ic('share')+'<span>کپی متن</span></button></div>'+
      '<div class="hint">فایل همه‌ی عددها و مسیر کامل قیمت هر معامله را دارد؛ برای بررسی دقیق‌تر بفرست.</div>';
  }else if(res)h+='<div class="hint">مسیر قیمت نیامد.</div>';
  return h+'</details>';
}
let RBLOPEN=false;
/* زیر هر معامله: بهترین و بدترین نقشه، و همه با یک زدن */
function rbPlRow(x){
  const P=x.pl;if(!P)return '';const PL=rdExPlans(),L=RD_EXN.filter(n=>P[n]).map(n=>[n,P[n]]);if(!L.length)return '';
  const srt=L.slice().sort((a,b)=>b[1].R-a[1].R),b=srt[0],w=srt[srt.length-1],chip=([n,v])=>'<span class="rbplc '+cls(v.R)+'">'+esc(PL[n].n)+' <bdi dir="ltr">'+fmtR(v.R)+'</bdi>'+(v.st==='open'?' <small>باز</small>':'')+'</span>';
  return '<details class="rbpl"><summary>در '+faN(L.length)+' نقشه: بهترین '+esc(PL[b[0]].n)+' <bdi dir="ltr" class="'+cls(b[1].R)+'">'+fmtR(b[1].R)+'</bdi> · بدترین '+esc(PL[w[0]].n)+' <bdi dir="ltr" class="'+cls(w[1].R)+'">'+fmtR(w[1].R)+'</bdi></summary>'+
    '<div class="rbplw">'+srt.map(chip).join('')+'</div></details>';
}
/* خروجی: تنظیمات، هر معامله، آمار مسیر و خودِ مسیر (h/l/c نسبت به ورود، ده‌هزارم؛ هر 5 دقیقه) */
function rbLabExport(){
  const res=RBL.res||[];
  const H=rdHealth(),M=RD.M||{},W=d=>M[d]&&M[d].w?Object.fromEntries(RD_FEAT.map((k,i)=>[k,M[d].w[i]]).filter(([,v])=>v)):null;
  return JSON.stringify({v:2,app:'signaldesk',kind:'radar-test-paths',at:new Date().toISOString(),
    settings:{fee:+S.fee||0,slip:+S.slip||0,riskUsd:riskUsd(),testMargin:rbFix()?+S.tMg:null,testLev:+S.tLev>0?+S.tLev:null,rMul:S.rMul,maxLev:+S.maxLev||null,isoMaxSd:isoMaxSd(),exit:{long:rbExEff('long'),short:rbExEff('short')},hold:rdHz().hold,hz:rdHzK(),fs:rdFsK(),wxFilter:S.rdWx!==false,limH:RB_LIMH},
    model:{ex:RD.ex||null,exD:RD.exD||null,exs:RD.exs||null,reg:RD.reg||null,mt0:RD.mt0||null,ncoin:RD.ncoin||null,ns:RD.ns||null,
      span:RD.span?RD.span.map(t=>new Date(t).toISOString()):null,health:H,cap:RD_CAP,capN:RD.capN??null,divs:RD.divs||null,
      hz:RD.hz||null,fs:RD.fs||null,wx:RD.wxs||null,hold:RD.hold||null,xs:RD.xs||null,wxNow:rdWxNow(),
      voids:(RB.voids||[]).filter(it=>it.k==='test').length,
      calib:Object.fromEntries(Object.entries(RD.calib||{}).filter(([k])=>!/\|/.test(k)||/^base\|/.test(k)||/^(long|short)\|[0-9]/.test(k))),
      weights:{long:W('long'),short:W('short')},drop:{long:M.long&&M.long.drop||null,short:M.short&&M.short.drop||null}},
    trades:res.map(x=>{const {it,C,st}=x,t0=C.length?C[0].t:it.t;
      return {id:it.id,kind:it.k,tk:it.tk,dir:it.dir,t:new Date(it.t).toISOString(),E:it.E,SL:it.SL,sd:+it.sd.toFixed(5),rr:it.rr,ex:it.ex||null,sc:it.sc,stars:it.stars,p:it.p,exp:it.exp,reg:it.reg,
        why:it.why||null,pv:it.pv||null,ck:(()=>{const c=rbCk(it);return c?{n:c.n,k:c.k,it:c.it}:null;})(),hold:rbHoldH(it),lim:it.lim??null,sigT:it.sig?new Date(it.sig).toISOString():null,sinceT:it.sn?new Date(it.sn).toISOString():null,rule:(()=>{const u=rbRule(it);return u?{pass:u.pass,n:u.n,it:u.it}:null;})(),ageH:rbAgeH(it)!=null?+rbAgeH(it).toFixed(1):null,st:it.st,R:it.R??null,xt:it.xt?new Date(it.xt).toISOString():null,xp:it.xp??null,saved:it.x?{k:it.x.k,rem:it.x.rem,acc:+it.x.acc.toFixed(3)}:null,
        wxx:x.wxx?{armed:x.wxx.armed,trig:x.wxx.trig?new Date(x.wxx.trig).toISOString():null,A:x.wxx.A,B:x.wxx.B}:null,
        vol:x.vol?{tg:x.vol.tg,st:x.vol.st,bo:x.vol.bo,late:x.vol.late,A:x.vol.A,B:x.vol.B,C:x.vol.C}:null,
        rev:x.rev||null,lev:st.lev,plans:x.pl?Object.fromEntries(Object.entries(x.pl).map(([n,v])=>[n,v.st==='open'?{R:v.R,open:true}:v.R])):null,usdPerR:+rbUsdR(it).toFixed(3),usd:it.R!=null?+(it.R*rbUsdR(it)).toFixed(2):null,stats:{mfe:+st.mfe.toFixed(3),tMfeMin:st.tMfe?Math.round((st.tMfe-it.t)/6e4):null,mfe24:+st.mfe24.toFixed(3),mae:+st.mae.toFixed(3),
          stopMin:st.stopAt?Math.round((st.stopAt-it.t)/6e4):null,touchMin:Object.fromEntries(Object.entries(st.touch).map(([k,v])=>[k,Math.round((v-it.t)/6e4)])),full:st.full},
        path:{t0:new Date(t0).toISOString(),stepMin:5,unit:'1e-4 of entry',hlc:C.map(k=>[Math.round((k.h/it.E-1)*1e4),Math.round((k.l/it.E-1)*1e4),Math.round((k.c/it.E-1)*1e4)])}};})});
}
/* ---- خروجی برای بررسی ----
   روی گوشی، دانلود و کپی فقط وقتی کار می‌کنند که مستقیم از زدن خودِ کاربر باشند؛ قبلاً دکمه اول مسیر قیمت همه‌ی
   تست‌ها را می‌گرفت (چند ثانیه تا یک دقیقه، بی نشانه) و بعد دانلود می‌کرد، که مرورگر گوشی بی‌صدا جلویش را می‌گرفت.
   حالا: یک زدن ← آماده‌سازی با پیشرفت روی خود دکمه ← ورقی با «دانلود فایل»، «اشتراک» و «کپی متن» که هر کدام زدن تازه‌اند. */
const rbLabSig=()=>RB.items.filter(it=>(it.k==='test'||(RBL.auto&&it.k==='auto'))&&it.E>0&&it.sd>0).map(it=>it.id+':'+it.st).join(',');
const rbExpName=()=>'signaldesk-tests-'+new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')+'.json';
async function rbExportStart(){
  if(RBL.on){toast('خروجی در حال آماده شدن است ('+faN(RBL.done)+' از '+faN(RBL.n)+')…','info');return;}
  if(!(RBL.res&&RBL.sig===rbLabSig())){
    const n=RB.items.filter(it=>(it.k==='test'||(RBL.auto&&it.k==='auto'))&&it.E>0&&it.sd>0).length;
    if(!n){toast('هنوز معامله‌ی آزمایشی نداری','err');return;}
    toast('آماده‌سازی خروجی: مسیر قیمت '+faN(n)+' معامله گرفته می‌شود…','info');
    await rbLabRun();if(!RBL.res)return;
  }
  sheetExport();
}
function sheetExport(){
  let txt='';try{txt=rbLabExport();}catch(e){toast('ساختن خروجی نشد: '+e.message,'err');return;}
  sheetExportTxt(txt,rbExpName(),faN((RBL.res||[]).length)+' معامله با مسیر واقعی قیمت، عامل‌های لحظه‌ی ورود و خلاصه‌ی مدل');
}
function sheetExportTxt(txt,name,desc){
  const kb=Math.max(1,Math.round(txt.length/1024));
  let file=null;try{file=new File([txt],name,{type:'application/json'});}catch(e){}
  const canShare=!!(file&&navigator.canShare&&navigator.canShare({files:[file]}));
  openSheet('<h3>'+ic('down')+'خروجی برای بررسی آماده است</h3>'+
    '<div class="hint">'+desc+' · '+faN(kb)+' کیلوبایت. یکی را بزن و فایل (یا متن) را برایم بفرست.</div>'+
    '<div class="exacts">'+(canShare?'<button class="btn ok" id="exSh">'+ic('share')+'<span>اشتراک (تلگرام، …)</span></button>':'')+
      '<button class="btn'+(canShare?'':' ok')+'" id="exDl">'+ic('down')+'<span>دانلود فایل</span></button>'+
      '<button class="btn" id="exCp">'+ic('book')+'<span>کپی متن</span></button></div>'+
    '<textarea class="cptxt extx" id="exTx" readonly aria-label="متن خروجی"></textarea>'+
    '<div class="srow"><button class="btn" id="cx">بستن</button></div>',
  sh=>{const ta=sh.querySelector('#exTx');ta.value=txt;
    sh.querySelector('#cx').onclick=closeSheet;
    sh.querySelector('#exDl').onclick=()=>{try{dl(name,txt);toast('فایل ساخته شد: '+name,'ok');}catch(e){toast('دانلود نشد؛ «کپی متن» را بزن','err');}};
    const sb=sh.querySelector('#exSh');if(sb)sb.onclick=async()=>{try{await navigator.share({files:[file],title:name,text:'خروجی تست‌های میز سیگنال'});}
      catch(e){if(e&&e.name!=='AbortError')toast('اشتراک نشد؛ «دانلود فایل» یا «کپی متن» را بزن','err');}};
    sh.querySelector('#exCp').onclick=async()=>{let ok=false;
      try{await navigator.clipboard.writeText(txt);ok=true;}catch(e){}
      if(!ok){try{ta.focus();ta.select();ta.setSelectionRange(0,txt.length);ok=document.execCommand('copy');}catch(e){}}
      toast(ok?'کپی شد ('+faN(kb)+' کیلوبایت)':'کپی نشد؛ متن پایین را نگه دار و «انتخاب همه» بزن',ok?'ok':'err');};});
}
function rbLabBind(g){
  const w=g.querySelector('.rblabw');if(w)w.ontoggle=()=>{RBLOPEN=w.open;};
  g.querySelectorAll('[data-rbl]').forEach(b=>{const a=b.dataset.rbl;
    if(a==='auto'){b.onchange=()=>{RBL.auto=b.checked;};return;}
    b.onclick=async()=>{
      if(a==='run'){RBLOPEN=true;rbLabRun();return;}
      rbExportStart();
    };});
}
