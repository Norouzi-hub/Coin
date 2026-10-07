/* ==================== ابزار پوزیشن و ریسک (پیشنهادهای ۱۱ تا ۲۰) ====================
   ۱۱ لیکوئید پیش از استاپ   ۱۲ سقف زمان پوزیشن     ۱۳ قفل بعد از باخت‌های پیاپی
   ۱۴ ریسک‌فری خودکار         ۱۵ استاپ دنباله‌دار     ۱۶ هشدار پوزیشن‌های هم‌جهت
   ۱۷ دلار و R کنار هم         ۱۸ بستن سریع با قیمت لحظه (و ۳۴: «چرا بستم»)
   ۱۹ تاریخچه (log هر پوزیشن)  ۲۰ سقف تعداد پوزیشن باز
   ۱۴ و ۱۵ داخل اجرای خودکار (32-autoexec.js → riskManage) اجرا می‌شوند. */

/* ---- ۱۱) لیکوئید پیش از استاپ ---- */
function liqBeforeStop(p){
  if(p.kind==='spot'||p.status!=='open'||!p.stop)return false;
  const liq=posMetrics(p).liqPrice;if(liq==null)return false;
  return (p.stop-liq)*(p.dir==='long'?1:-1)<=0;
}

/* ---- ۱۲) سقف زمان: از «قاعده‌ی من» (pos.until) یا تنظیمات (ساعت) ---- */
function posDeadline(p){
  if(p.status!=='open')return null;
  if(p.until)return p.until;
  return +S.maxHold>0?(p.openedAt||Date.now())+S.maxHold*36e5:null;
}
const fmtLeft=ms=>{const m=Math.round(Math.abs(ms)/6e4);
  return m<60?faN(m)+' دقیقه':m<48*60?faN(+(m/60).toFixed(1))+' ساعت':faN(Math.round(m/1440))+' روز';};

/* ---- ۱۳) باخت‌های پیاپیِ آخر (پوزیشن‌های بسته، جدید به قدیم) ---- */
function lossStreak(){
  const cl=DB.positions.filter(p=>p.status==='closed'&&p.closedAt).sort((a,b)=>b.closedAt-a.closedAt);
  let n=0;for(const p of cl){const m=posMetrics(p);if((m.pnl||0)<0)n++;else break;}
  return {n,last:cl[0]||null};
}
/* قفل تا پایان همان روز (به وقت گوشی) */
function lossLockOn(){
  const k=+S.lossLock;if(!(k>0))return null;
  const s=lossStreak();if(s.n<k||!s.last)return null;
  const end=new Date(s.last.closedAt);end.setHours(24,0,0,0);
  return Date.now()<+end?{n:s.n,until:+end}:null;
}

/* ---- ۱۶ و ۲۰) پوزیشن‌های باز ---- */
const openPos=()=>DB.positions.filter(p=>p.status==='open');
function sameDirOf(dir){return openPos().filter(p=>p.kind!=='spot'&&p.dir===dir);}

/* هشدارهای پیش از ورود (به entryGate اضافه می‌شوند) */
function riskGateExtra(dir){
  const out=[];
  const lk=lossLockOn();
  if(lk)out.push(faN(lk.n)+' باخت پیاپی؛ قانون خودت می‌گوید تا فردا ورود تازه نه.');
  const mx=+S.maxOpen;
  if(mx>0&&openPos().length>=mx)out.push('الان '+faN(openPos().length)+' پوزیشن باز داری؛ سقفت '+faN(mx)+' است.');
  if(dir&&dir!=='spot'){const sd=sameDirOf(dir);
    if(sd.length>=2)out.push('با این، '+faN(sd.length+1)+' پوزیشن '+(dir==='long'?'لانگ':'شورت')+' هم‌زمان داری ('+
      [...new Set(sd.map(p=>p.ticker))].join('، ')+')؛ اگر بیت‌کوین برگردد، همه با هم ضرر می‌کنند.');}
  return out;
}

/* ---- ۱۴ و ۱۵) ریسک‌فری خودکار و استاپ دنباله‌دار — فقط به سمت سود، هیچ‌وقت عقب ---- */
function riskManage(p,hi,lo,at,ev){
  if(p.status!=='open'||!(p.entry>0))return;
  const sign=p.dir==='long'?1:-1, good=sign>0?hi:lo, E=p.entry;
  const move=(good-E)/E*100*sign;
  const fee=E*((+S.fee||0)/100);
  const setStop=(v,why,k)=>{
    v=roundP(v);if(p.stop&&(v-p.stop)*sign<=0)return false;
    p.stop=v;logAdd(p,'plan','خودکار: '+why+' — استاپ روی '+fmtPrice(v),at);
    if(ev&&k)ev.push({p,k,stop:v});return true;};
  if(+S.beAt>0&&!p.beDone&&move>=+S.beAt){
    p.beDone=true;
    setStop(E+sign*fee,'ریسک‌فری بعد از '+faN(+S.beAt)+'٪ حرکت','be');
  }
  const tr=+S.trail;
  if(tr>0){
    p.peak=p.peak==null?good:(sign>0?Math.max(p.peak,good):Math.min(p.peak,good));
    const c=p.peak*(1-sign*tr/100);
    if((c-E)*sign>fee){                                 // فقط وقتی دست‌کم سربه‌سر است
      const first=!p.trailOn;p.trailOn=true;
      // ثبت در تاریخچه فقط برای حرکت‌های معنادار (یک‌چهارمِ فاصله‌ی دنباله)، وگرنه با هر قیمت یک خط
      const big=!p.stop||Math.abs(c-p.stop)/E*100>=tr/4;
      if(big)setStop(c,'استاپ دنباله‌دار '+fmtNum(tr)+'٪ پشت بهترین قیمت ('+fmtPrice(p.peak)+')',first?'trail':null);
    }
  }
}

/* ---- ۱۸ و ۳۴) بستن سریع با قیمت لحظه، با «چرا بستم» ---- */
const WHY_FA={tp:'تارگت',stop:'استاپ',time:'سقف زمان',rule:'طبق قاعده',fear:'ترس',news:'خبر',other:'دیگر'};
function closeAt(p,ex,why,at){
  ensureBase(p);
  p.status='closed';p.exitPrice=ex;p.closedAt=at||Date.now();
  p.fees=p.margin*p.lev*(S.fee/100);
  if(why)p.why=why;
  PENDING.delete(p.id);
  const m=posMetrics(p);
  logAdd(p,'close','بسته شد روی '+fmtPrice(ex)+(why?' · '+WHY_FA[why]:'')+' — '+fmtUsd(m.pnl)+(m.r!=null?' ('+fmtR(m.r)+')':''));
  return m;
}
function sheetQuickClose(p){
  const live=pxOf(p);
  if(live==null)return sheetClose(p);
  const m=posMetrics(p,live);
  const dl=posDeadline(p);
  openSheet('<h3>بستن سریع · '+esc(p.ticker)+'</h3>'+
    '<div class="kv"><div class="k"><b>قیمت لحظه</b><span>'+fmtPrice(live)+'</span></div>'+
    '<div class="k"><b>سود/ضرر</b><span class="'+cls(m.pnl)+'">'+fmtUsd(m.pnl)+(m.r!=null?' · '+fmtR(m.r):'')+'</span></div></div>'+
    '<div class="sub" style="margin-top:10px">چرا می‌بندی؟ (با زدن، بسته می‌شود)</div>'+
    '<div class="whyrow">'+Object.entries(WHY_FA).map(([k,v])=>'<button class="catchip'+(k==='time'&&dl&&Date.now()>dl?' on':'')+'" data-w="'+k+'">'+v+'</button>').join('')+'</div>'+
    '<div class="srow"><button class="btn" id="full">فرم کامل</button><button class="btn" id="cx">انصراف</button></div>',
    sh=>{
      $('#cx').onclick=closeSheet;
      $('#full').onclick=()=>{closeSheet();setTimeout(()=>sheetClose(p),260);};
      sh.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{
        const px=pxOf(p)||live, r=closeAt(p,px,b.dataset.w);
        save();closeSheet();renderAll();toast('بسته شد: '+fmtUsd(r.pnl)+(r.r!=null?' · '+fmtR(r.r):''),r.pnl>=0?'ok':'info');});
    });
}

/* ---- روی کارت پوزیشن باز: مهلت، لیکوئید پیش از استاپ، بستن سریع ---- */
function posRiskBits(p,head,body,acts){
  if(p.status==='open'){
    const dl=posDeadline(p);
    if(dl){const left=dl-Date.now();
      head.appendChild(el('span','pill '+(left<=0?'lose':left<36e5?'gold':'mut'),ic('clock')+(left<=0?'مهلت گذشت':fmtLeft(left)+' مانده')));}
    if(liqBeforeStop(p))body.insertBefore(el('div','flag d','<i>!</i><span>لیکوئید پیش از استاپ است: اگر قیمت برگردد، صرافی کل مارجین را پیش از رسیدن به استاپ می‌بندد. اهرم را کم کن یا استاپ را نزدیک‌تر بیاور.</span>'),body.children[1]||null);
    if(acts&&pxOf(p)!=null){const q=el('button','btn',ic('bolt')+'<span>بستن با قیمت لحظه</span>');q.onclick=()=>sheetQuickClose(p);acts.insertBefore(q,acts.children[1]||null);}
  }else if(p.why)head.appendChild(el('span','pill mut','بستم: '+WHY_FA[p.why]));
}
