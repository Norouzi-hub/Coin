/* ==================== دفترچه‌ی خروج ==================== */
/* کانال ورود را می‌دهد و اگر آنلاین باشد ریسک‌فری و سیو سود اول را؛ بقیه‌ی خروج با خودِ
   معامله‌گر است. «سبک خروج» همین بقیه را یک بار تعریف می‌کند: در هر تارگت چه سهمی بسته
   شود و استاپ کِی جابه‌جا شود. همان تعریف دو جا کار می‌کند:
     روی پوزیشن‌ها  — نقشه‌ی خروج با عدد، هشدار سرِ هر پله و «انجام شد» با یک زدن
     در کانال‌سنج   — آزمایشگاه: هر سبک روی مسیر واقعیِ همه‌ی سیگنال‌های گذشته
   parts سهمِ هر تارگت از کل حجم است (eq یعنی مساوی بین همه‌ی تارگت‌ها)؛ be یعنی بعد از
   چندمین تارگت استاپ به ورود برود (0 = هیچ‌وقت)؛ trail یعنی بعد از هر تارگت، استاپ به
   تارگتِ قبلی بیاید (بعد از تارگت اول: ورود). */
const PB={
  s1:{n:'اسکلپ · تارگت 1',d:'همه در تارگت اول بسته می‌شود.',parts:[1],be:0,trail:false},
  s2:{n:'اسکلپ · تارگت 2',d:'همه در تارگت دوم؛ استاپ سر جایش می‌ماند.',parts:[0,1],be:0,trail:false},
  bal:{n:'متعادل',d:'نصف در تارگت اول و استاپ به ورود؛ باقی در تارگت دوم.',parts:[.5,.5],be:1,trail:false},
  sw:{n:'سوئینگ پله‌ای',d:'در هر تارگت سهمی مساوی؛ استاپ پله‌پله پشت قیمت می‌آید.',parts:'eq',be:1,trail:true},
  rd:{n:'رادار · سیو سود پله‌ای',d:'نصف در +1R و استاپ به ورود؛ یک‌چهارم در +2R و استاپ به +1R؛ باقی در +3R.',parts:[.5,.25,.25],be:1,trail:true},
  cu:{n:'دلخواه',d:'درصد هر تارگت و قانون استاپ را خودت می‌چینی.'}
};
const PB_IDS=['s1','s2','bal','sw','cu'];
const pbCustom=()=>Object.assign({parts:[50,25,25,0],be:1,trail:false},S.pbCustom||{});
function pbDef(id){
  if(id==='cu'){const c=pbCustom();
    return {id,n:PB.cu.n,d:PB.cu.d,parts:c.parts.map(x=>Math.max(0,+x||0)/100),be:+c.be||0,trail:!!c.trail};}
  return Object.assign({id},PB[id]||PB.bal);
}
/* سهم هر تارگت برای سیگنالی که n تارگت دارد. سهمِ تارگت‌هایی که وجود ندارند به آخرین
   تارگت می‌رسد؛ اگر جمع کمتر از 100٪ بود، باقی هم همان‌جا بسته می‌شود. */
function pbParts(def,n){
  if(n<1)return [];
  const a=def.parts==='eq'?Array(n).fill(1/n):(def.parts||[1]);
  const out=Array(n).fill(0);
  a.forEach((f,i)=>{out[Math.min(i,n-1)]+=Math.max(0,+f||0);});
  const sum=out.reduce((x,y)=>x+y,0);
  if(sum>1)return out.map(x=>x/sum);
  out[n-1]+=1-sum;
  return out;
}
/* پله‌ی استاپ بعد از c تارگت: 0 استاپ اولیه، 1 ورود، 2 تارگت اول، … */
function pbStopLevel(def,c,cur){
  let s=cur;
  if(def.trail&&c>=1)s=Math.max(s,c);
  else if(def.be&&c>=def.be)s=Math.max(s,1);
  return s;
}
/* یک سبک روی مسیرِ ثبت‌شده‌ی یک سیگنال: R نهایی و اینکه چطور تمام شد */
function pbSim(def,inp,a){
  if(!a||!a.path||!['win','loss','exp'].includes(a.st)||!inp||!inp.entry||!inp.stop)return null;
  const sign=inp.dir==='long'?1:-1, E=inp.entry, risk=Math.abs(E-inp.stop), T=inp.tps, n=T.length;
  if(!n||!(risk>0))return null;
  const lvR=[-1,0].concat(T.map(t=>(t-E)*sign/risk));
  const parts=pbParts(def,n);
  let rem=1,R=0,stop=0,c=0,how='open';
  for(const ev of a.path){
    if(ev>0){
      while(c<n&&c+2<=ev){
        const f=Math.min(rem,parts[c]);
        if(f>0){R+=f*lvR[c+2];rem-=f;}
        c++;stop=pbStopLevel(def,c,stop);
      }
      if(rem<=1e-9){rem=0;how='tp';break;}
    }else{
      const j=-ev-1;
      if(j<=stop){R+=rem*lvR[stop];how=stop===0?'sl':stop===1?'be':'trail';rem=0;break;}
    }
  }
  if(rem>1e-9){
    if(a.close&&a.close.px){R+=rem*((a.close.px-E)*sign/risk);how='exp';}
    else R+=rem*lvR[stop];
  }
  return {R,c,how};
}
function pbStats(def,rows){
  const done=[];
  for(const x of rows){
    const r=x.r&&x.r.path?pbSim(def,x.inp,x.r):null;
    if(r)done.push({t:x.inp.t0,R:r.R});
  }
  done.sort((a,b)=>a.t-b.t);
  let sum=0,peak=0,dd=0,win=0;const curve=[];
  for(const d of done){sum+=d.R;curve.push(sum);if(sum>peak)peak=sum;dd=Math.max(dd,peak-sum);if(d.R>0.001)win++;}
  return {n:done.length,sum,avg:done.length?sum/done.length:null,win:done.length?win/done.length*100:null,dd,curve};
}
const pbDefault=()=>(PB[S.exitPb]?S.exitPb:'bal');
function pbSetDefault(id){
  S.exitPb=id;DB.settings=Object.assign({},S);save();SETVER++;
  const sp=$('#sPb');if(sp)sp.value=id;
  toast('سبک خروج پیش‌فرض: '+pbDef(id).n,'ok');
}

/* ==== خروج کوتاه: پول کمتر درگیر بماند ====
   برای هر سیگنالِ فعال‌شده، روی همان کندل‌های کانال‌سنج (بی‌درخواستِ اضافه) یک جدول ساخته می‌شود:
   استاپ (۱۰۰٪، ۷۵٪ یا ۵۰٪ فاصله‌ی استاپِ کانال) × خروج با سود (تارگت ۱ کانال، یا +۱، +۱.۵، +۲، +۳٪
   حرکت قیمت) × سقف زمان (۱، ۲، ۴، ۸، ۲۴ ساعت یا ۳ روز؛ بعدش هر جا بود بسته می‌شود).
   نتیجه به R نسبت به همان استاپ (حجم طوری که هر استاپ «یک واحد» ضرر باشد) و ساعتِ درگیری پول.
   کندلِ لحظه‌ی فعال شدن کنار گذاشته می‌شود (ترتیبِ داخلش معلوم نیست)؛ کارمزد کم می‌شود. */
const XK=[1,0.75,0.5], XT=['t1',1,1.5,2,3], XH=[1,2,4,8,24,72], XG_V=1;
const xgIdx=(ki,ti,hi)=>(ki*XT.length+ti)*XH.length+hi;
function audXGrid(inp,C,tAct){
  const sign=inp.dir==='long'?1:-1, E=inp.entry, risk=Math.abs(E-inp.stop);
  if(!(risk>0)||!C.length)return null;
  const K=C.filter(k=>k.t>tAct);if(!K.length)return null;
  const R=new Array(XK.length*XT.length*XH.length).fill(null), Hh=R.slice();
  const lastT=K[K.length-1].t, fee=(+S.fee||0)/100*E;
  const closeAt=T=>{let j=-1;for(let i=0;i<K.length&&K[i].t+3e5<=T;i++)j=i;return j<0?null:{px:K[j].c,t:K[j].t+3e5};};
  XK.forEach((kf,ki)=>{
    const sl=E-sign*kf*risk, rk=kf*risk;
    XT.forEach((tg,ti)=>{
      const tp=tg==='t1'?(inp.tps&&inp.tps[0]):E*(1+sign*tg/100);
      if(!(tp>0)||(tp-E)*sign<=0)return;
      // اولین برخورد به استاپ یا سود
      let hit=null,prev=E;
      for(const k of K){
        const up=k.c>=k.o;
        for(const q of [k.o,up?k.l:k.h,up?k.h:k.l,k.c]){
          if((q-sl)*sign<=0&&(prev-sl)*sign>0){hit={px:sl,t:k.t};break;}
          if((q-tp)*sign>=0&&(prev-tp)*sign<0){hit={px:tp,t:k.t};break;}
          prev=q;
        }
        if(hit)break;
      }
      XH.forEach((h,hi)=>{
        const cap=tAct+h*36e5;let ex=null;
        if(hit&&hit.t<cap)ex=hit;
        else if(lastT+3e5>=cap)ex=closeAt(cap);
        if(!ex)return;                                  // هنوز آن‌قدر زمان نگذشته
        R[xgIdx(ki,ti,hi)]=+(((ex.px-E)*sign-fee)/rk).toFixed(3);
        Hh[xgIdx(ki,ti,hi)]=+((ex.t-tAct)/36e5).toFixed(2);
      });
    });
  });
  return {v:XG_V,R,h:Hh};
}

/* ---- پنل «خروج کوتاه» در کانال‌سنج ---- */
const XT_FA=['تارگت ۱ کانال','+۱٪','+۱.۵٪','+۲٪','+۳٪'], XK_FA=['استاپ کانال','۷۵٪ فاصله','۵۰٪ فاصله'],
  XH_FA=['۱ ساعت','۲ ساعت','۴ ساعت','۸ ساعت','۲۴ ساعت','۳ روز'];
const XSELKEY='signaldesk.xsel.v1';
const XSEL=Object.assign({k:0,h:2,v:'short'},lsGet(XSELKEY)||{});
let XLABAUTO=false;
function xStat(G,ki,ti,hi){
  const i=xgIdx(ki,ti,hi);let n=0,sum=0,w=0,hs=0;
  for(const x of G){const v=x.r.xg.R[i];if(v==null)continue;n++;sum+=v;if(v>0.001)w++;hs+=x.r.xg.h[i]||0;}
  return {n,sum,avg:n?sum/n:null,win:n?w/n*100:null,hold:n?hs/n:null};
}
function buildShortLab(rows){
  const c=el('div','panel lab xlab');
  c.appendChild(el('div','panelhead','<b>'+ic('clock')+'خروج کوتاه: پول کمتر درگیر</b>'));
  c.appendChild(el('div','hint','همان سیگنال‌های کانال روی مسیر واقعی قیمت، با خروج زودتر: سود کوچک‌تر، سقف زمان، یا استاپ نزدیک‌تر. '+
    'نتیجه به R نسبت به همان استاپی که انتخاب می‌کنی است — یعنی اگر حجم را طوری بگیری که هر استاپ یک واحد ضرر باشد (با استاپ نزدیک‌تر، حجم بزرگ‌تر). کارمزد کم شده.'));
  const fin=rows.filter(x=>x.r&&['win','loss','exp'].includes(x.r.st));
  const G=fin.filter(x=>x.r.xg&&x.r.xg.v===XG_V);
  if(fin.length>G.length){
    c.appendChild(el('div','rwarn warn',faN(fin.length-G.length)+' سیگنالِ سنجیده‌شده هنوز جدول خروج کوتاه ندارد'+(AUDQ.on?' — در حال محاسبه…':'؛ یک بار دیگر با کندل سنجیده می‌شوند.')));
    // فقط وقتی همین بخش باز است (سنجش دوباره سنگین است و کل تب را از نو می‌سازد)
    if(!XLABAUTO&&!AUDQ.on&&AUDOPEN==='خروج'){XLABAUTO=true;setTimeout(()=>audRun(false,true),600);}
  }
  if(!G.length){c.appendChild(el('div','hint','هنوز سیگنالی با جدول خروج کوتاه نیست.'));return c;}
  const body=el('div');c.appendChild(body);
  const paint=()=>{
    const {k,h}=XSEL, MR=xRule();
    const chips=(arr,key,cur)=>'<div class="afopts">'+arr.map((t,i)=>'<button class="catchip'+(cur===i?' on':'')+'" data-'+key+'="'+i+'">'+t+'</button>').join('')+'</div>';
    // بهترین‌ها روی همه‌ی ترکیب‌ها (با دست‌کم ۶۰٪ سیگنال‌ها، تا ترکیبی با نمونه‌ی کم برنده نشود)
    const minN=Math.max(3,Math.ceil(G.length*0.6));let best=null,bestS=null;
    for(let ki=0;ki<XK.length;ki++)for(let ti=0;ti<XT.length;ti++)for(let hi=0;hi<XH.length;hi++){
      const s=xStat(G,ki,ti,hi);if(s.n<minN)continue;
      const z={ki,ti,hi,s};
      if(!best||s.sum>best.s.sum)best=z;
      if(s.hold!=null&&s.hold<=8&&(!bestS||s.sum>bestS.s.sum))bestS=z;
    }
    const base=xStat(G,0,0,XH.length-1);
    const sdM=medOf(G.map(x=>stopPctOf(x.inp)).filter(v=>v!=null));
    const name=z=>XK_FA[z.ki]+' · خروج '+XT_FA[z.ti]+' · سقف '+XH_FA[z.hi];
    const line=(t,z)=>z?'<div class="xbest"><b>'+t+'</b><span>'+name(z)+'</span><span>'+fmtR(z.s.sum)+' در '+faN(z.s.n)+' سیگنال · برد '+faN(Math.round(z.s.win))+'٪ · نگه‌داری '+fmtNum(z.s.hold)+' ساعت</span></div>':'';
    let html='<div class="afrow"><span class="aflab">استاپ</span>'+chips(XK_FA,'k',k)+'</div>'+
      '<div class="afrow"><span class="aflab">سقف زمان</span>'+chips(XH_FA,'h',h)+'</div>'+
      '<div class="tscroll"><table class="tp xtab"><thead><tr><th>خروج با سود</th><th>سیگنال</th><th>برد</th><th>جمع</th><th>میانگین</th><th>نگه‌داری</th></tr></thead><tbody>'+
      XT.map((t,ti)=>{const s=xStat(G,k,ti,h), mine=MR&&MR.k===k&&MR.h===h&&MR.t===ti;
        return '<tr class="tap'+(best&&best.ki===k&&best.hi===h&&best.ti===ti?' on':'')+(mine?' mine':'')+'" data-t="'+ti+'"><td>'+XT_FA[ti]+(s.n?lowN(s.n):'')+(mine?' <span class="pill gold">قاعده‌ی من</span>':'')+'</td><td class="num">'+faN(s.n)+'</td><td class="num">'+(s.win==null?'—':faN(Math.round(s.win))+'٪')+
        '</td><td class="num '+cls(s.sum)+'"><bdi>'+(s.n?fmtR(s.sum):'—')+'</bdi></td><td class="num"><bdi>'+(s.avg==null?'—':fmtR(s.avg))+'</bdi></td><td class="num">'+(s.hold==null?'—':fmtNum(s.hold)+' س')+'</td></tr>';}).join('')+
      '</tbody></table></div>'+
      '<div class="hint">روی هر ردیف بزن تا همان (با استاپ و سقف زمانِ بالا) «قاعده‌ی من» شود؛ روی هر کارت سیگنال آماده می‌آید.</div>'+
      (MR?'<div class="xbest mine"><b>قاعده‌ی من:</b><span>'+esc(xRuleName(MR))+'</span><span><button class="btn xs" data-xr="0">برداشتن</button></span></div>':'')+
      line('بهترین کوتاه‌مدت (نگه‌داری تا ۸ ساعت):',bestS)+line('بهترین کل:',best)+
      '<div class="hint">مبنا — قاعده‌ی کانال (تارگت ۱، استاپ کانال، تا ۳ روز): '+(base.n?fmtR(base.sum)+' در '+faN(base.n)+' سیگنال، نگه‌داری '+fmtNum(base.hold)+' ساعت':'—')+'.</div>'+
      (sdM!=null?'<div class="hint">فاصله‌ی استاپِ معمولِ این کانال '+fmtNum(sdM)+'٪ است؛ اهرم امن در ایزوله: با استاپ کانال حدود <b>'+faN(isoLev(sdM))+'x</b>، با ۷۵٪ حدود <b>'+faN(isoLev(sdM*0.75))+'x</b>، با ۵۰٪ حدود <b>'+faN(isoLev(sdM*0.5))+'x</b>.</div>':'')+
      (G.length<20?'<div class="rwarn warn">فقط '+faN(G.length)+' سیگنال؛ برای انتخاب قاعده دست‌کم ۲۰ تا لازم است. به تفاوت‌های کوچک اعتماد نکن.</div>':'');
    body.innerHTML=html;
    body.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{XSEL.k=+b.dataset.k;lsSet(XSELKEY,XSEL);paint();});
    body.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{XSEL.h=+b.dataset.h;lsSet(XSELKEY,XSEL);paint();});
    body.querySelectorAll('tr[data-t]').forEach(tr=>tr.onclick=()=>{
      const r={k:XSEL.k,t:+tr.dataset.t,h:XSEL.h};setXRule(r);paint();toast('قاعده‌ی من: '+xRuleName(r),'ok');});
    const rm=body.querySelector('[data-xr]');if(rm)rm.onclick=()=>{setXRule(null);paint();toast('قاعده‌ی من برداشته شد','info');};
  };
  paint();
  return c;
}

/* ---- آزمایشگاه خروج (در کانال‌سنج) ---- */
let LABAUTO=false;
function buildExitLab(rows){
  const c=el('div','panel lab');
  c.appendChild(el('div','panelhead','<b>'+ic('flag')+'آزمایشگاه خروج</b>'));
  c.appendChild(el('div','hint','هر سبک روی همان سیگنال‌ها و همان مسیر واقعی قیمت اجرا شده؛ فرقشان فقط نحوه‌ی خروج است. '+
    'ورود برای همه یکی است و کارمزد حساب نشده. ببین روی همین کانال کدام سبک بیشتر جواب داده، بعد همان را انتخاب کن.'));
  const fin=rows.filter(x=>x.r&&['win','loss','exp'].includes(x.r.st));
  const miss=fin.filter(x=>!x.r.path).length;
  if(miss){
    c.appendChild(el('div','rwarn warn',faN(miss)+' سیگنالِ سنجیده‌شده هنوز مسیر قیمت ندارد'+
      (AUDQ.on?' — در حال محاسبه…':'؛ یک بار دیگر با کندل سنجیده می‌شوند.')));
    if(!LABAUTO&&!AUDQ.on&&AUDOPEN==='خروج'){LABAUTO=true;setTimeout(()=>audRun(false,true),400);}
  }
  const cur=pbDefault();
  const res=PB_IDS.map(id=>({id,def:pbDef(id),st:pbStats(pbDef(id),rows)}));
  const ok=res.filter(x=>x.st.n);
  if(!ok.length){c.appendChild(el('div','hint','هنوز سیگنالی با مسیر قیمت نیست.'));return c;}
  const best=ok.reduce((a,b)=>b.st.sum>a.st.sum?b:a);
  const maxAbs=Math.max(...ok.map(x=>Math.abs(x.st.sum)),0.01);
  const list=el('div','labl');
  for(const x of res){
    const {st,def,id}=x, on=id===cur, top=x===best&&ok.length>1;
    const row=el('div','labr'+(on?' on':'')+(top?' best':''));
    const w=st.n?Math.abs(st.sum)/maxAbs*100:0;
    row.innerHTML='<div class="labh"><b>'+esc(def.n)+'</b>'+
      (top?'<span class="pill win">بهترین روی این کانال</span>':'')+(on?'<span class="pill gold">سبک من</span>':'')+'</div>'+
      '<div class="labd">'+esc(def.d)+'</div>'+
      (st.n?'<div class="labbar" title="'+esc(def.n)+': '+fmtR(st.sum)+' در '+faN(st.n)+' سیگنال"><i class="'+(st.sum>=0?'u':'d')+'" style="width:'+w.toFixed(1)+'%"></i></div>'+
        '<div class="labk"><span>مجموع <b dir="ltr">'+fmtR(st.sum)+'</b></span><span>میانگین <b dir="ltr">'+fmtR(st.avg)+'</b></span>'+
        '<span>سودده <b>'+faN(Math.round(st.win))+'٪</b></span><span>بیشترین افت <b dir="ltr">'+fmtR(-st.dd)+'</b></span></div>'
       :'<div class="labd">داده‌ای نیست</div>');
    if(!on){const b=el('button','mark ghost','انتخاب به‌عنوان سبک من');b.onclick=()=>{pbSetDefault(id);renderAudit();};row.appendChild(b);}
    list.appendChild(row);
  }
  c.appendChild(list);
  // سبک دلخواه
  const cu=pbCustom();
  const ed=el('details','sec sub2 labcu');
  ed.innerHTML='<summary>چیدن سبک دلخواه</summary>'+
    '<div class="grid labg">'+[0,1,2,3].map(i=>'<div class="fld"><label>تارگت '+faN(i+1)+' (٪)</label>'+
      '<input type="number" min="0" max="100" step="5" inputmode="decimal" data-i="'+i+'" value="'+(cu.parts[i]||0)+'"></div>').join('')+
    '</div><div class="grid" style="margin-top:10px"><div class="fld"><label>استاپ به ورود</label><select id="cu_be">'+
      '<option value="0">هیچ‌وقت</option><option value="1">بعد از تارگت 1</option><option value="2">بعد از تارگت 2</option></select></div>'+
    '<label class="autotog" style="align-self:end;margin:0"><input type="checkbox" id="cu_tr"'+(cu.trail?' checked':'')+'><span>'+ic('trend')+'استاپ دنباله‌دار</span></label></div>'+
    '<div class="hint">جمع کمتر از 100٪ باشد، باقی در آخرین تارگت بسته می‌شود. «استاپ دنباله‌دار» بعد از هر تارگت، استاپ را به تارگت قبلی می‌آورد.</div>';
  c.appendChild(ed);
  setTimeout(()=>{
    const be=ed.querySelector('#cu_be');if(be)be.value=String(cu.be||0);
    const saveCu=()=>{
      const parts=[...ed.querySelectorAll('input[data-i]')].map(i=>Math.max(0,Math.min(100,parseFloat(normDig(i.value))||0)));
      S.pbCustom={parts,be:+ed.querySelector('#cu_be').value||0,trail:ed.querySelector('#cu_tr').checked};
      DB.settings=Object.assign({},S);save();LABOPEN=true;renderAudit();
    };
    ed.querySelectorAll('input,select').forEach(i=>i.onchange=saveCu);
    if(LABOPEN)ed.open=true;
  },0);
  const mine=res.find(x=>x.id===cur);
  if(mine&&mine.st.n>1){
    c.appendChild(el('div','sechd','منحنی R سبک من · '+esc(mine.def.n)));
    c.appendChild(rCurve(mine.st.curve,mine.st.dd));
  }
  return c;
}
let LABOPEN=false;
/* «خروج کوتاه» و «آزمایشگاه خروج» یک پنل‌اند با دو نما؛ هر دو یک سؤال را جواب می‌دهند:
   روی همین سیگنال‌ها، کدام قاعده‌ی خروج بهتر جواب داده. نمای انتخابی یادش می‌ماند. */
function buildExitPanel(rows){
  const c=el('div','panel lab xlab');
  c.appendChild(el('div','panelhead','<b>'+ic('flag')+'خروج: کدام قاعده بهتر جواب داده</b>'));
  const seg=el('div','afopts xseg');
  seg.innerHTML='<button class="catchip" data-v="short">خروج کوتاه · پول کمتر درگیر</button><button class="catchip" data-v="pb">سبک‌های پله‌ای</button>';
  c.appendChild(seg);
  for(const [v,n] of [['short',buildShortLab(rows)],['pb',buildExitLab(rows)]]){
    const h=n.querySelector(':scope>.panelhead');if(h)h.remove();
    const w=el('div','xview');w.dataset.v=v;
    while(n.firstChild)w.appendChild(n.firstChild);
    c.appendChild(w);
  }
  const show=()=>{
    c.querySelectorAll(':scope>.xview').forEach(w=>w.hidden=w.dataset.v!==XSEL.v);
    seg.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===XSEL.v));
  };
  seg.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{XSEL.v=b.dataset.v;lsSet(XSELKEY,XSEL);show();});
  show();
  return c;
}

/* ---- نقشه‌ی خروج روی پوزیشن ---- */
function pbTps(p){
  const sign=p.dir==='long'?1:-1;
  let T=(p.targets||[]).filter(t=>isFinite(t)&&t>0&&(t-p.entry)*sign>0);
  T=[...new Set(T)].sort((a,b)=>(a-b)*sign);
  const st=p.stop0!=null?p.stop0:p.stop;
  // کانال تارگت نداده: تارگت‌های R تنظیمات
  if(!T.length&&st&&(p.entry-st)*sign>0)T=(S.rMul||[1.5,3,5]).map(r=>+(p.entry+sign*r*Math.abs(p.entry-st)).toPrecision(8));
  return T.slice(0,5);
}
function pbAttach(p,id){
  const def=pbDef(id), tps=pbTps(p);
  if(!tps.length){toast('این پوزیشن نه تارگت دارد نه استاپ؛ نقشه ساخته نشد','err');return false;}
  p.pb={id,n:def.n,parts:pbParts(def,tps.length),be:def.be||0,trail:!!def.trail,tps};
  if(p.pbc==null)p.pbc=0;
  return true;
}
function pbStopPrice(p,c){
  const pb=p.pb, lvl=pbStopLevel(pb,c,0);
  return lvl===0?null:lvl===1?p.entry:pb.tps[lvl-2];
}
const pbReached=(p,i,live)=>live!=null&&(p.dir==='long'?live>=p.pb.tps[i]:live<=p.pb.tps[i]);
function pbStepText(p,i){
  const pb=p.pb, f=pb.parts[i], sp=pbStopPrice(p,i+1), prev=i?pbStopPrice(p,i):null;
  const bits=[];
  if(f>0)bits.push('ببند '+faN(Math.round(f*100))+'٪');
  if(sp!=null&&sp!==prev)bits.push('استاپ ← '+(sp===p.entry?'ورود':fmtPrice(sp)));
  return bits.join(' · ')||'فقط رد شو';
}
/* اجرای یک پله‌ی نقشه با قیمت تارگت: بستن سهمِ این پله و جابه‌جایی استاپ. هم دکمه‌ی «انجام شد»
   از این می‌رود، هم اجرای خودکار — تا دو جور حساب نشود. */
function pbApply(p,i,at,pre){
  ensureBase(p);
  const pb=p.pb, tp=pb.tps[i];
  const before=pb.parts.slice(0,i).reduce((a,b)=>a+b,0), remain=1-before;
  const frac=remain<=pb.parts[i]+1e-9?1:pb.parts[i]/remain;
  let pnl=0;
  if(pb.parts[i]>0)pnl=closePartAt(p,tp,frac,(pre||'')+'پله‌ی '+faN(i+1)+' نقشه: '+faN(Math.round(pb.parts[i]*100))+'٪ روی '+fmtPrice(tp),at);
  const sp=pbStopPrice(p,i+1), sign=p.dir==='long'?1:-1;
  if(p.status==='open'&&sp!=null&&(p.stop==null||(sp-p.stop)*sign>0)){
    const old=p.stop;p.stop=sp;PENDING.delete(p.id);
    logAdd(p,'stop',(pre||'')+'طبق نقشه، حد ضرر '+(old?'از '+fmtPrice(old)+' ':'')+'روی '+(sp===p.entry?'ورود ('+fmtPrice(sp)+')':fmtPrice(sp)),at);
  }
  p.pbc=i+1;
  return pnl;
}
/* «انجام شد»: همان پله را با قیمت تارگت اجرا می‌کند */
function pbDo(p,i){
  const pnl=pbApply(p,i);
  save();renderAll();
  toast('پله‌ی '+faN(i+1)+' انجام شد'+(p.pb.parts[i]>0?' · '+fmtUsd(pnl):''),'ok');
}
function closePartAt(p,price,frac,label,at){
  ensureBase(p);at=at||Date.now();
  const m=posMetrics(p,price);
  const part=Math.min(1,Math.max(0,frac)), qty=m.qty*part, marginPart=p.margin*part;
  const gross=qty*(price-p.entry)*(p.dir==='long'?1:-1);
  const fees=(marginPart*p.lev)*(S.fee/100), pnl=gross-fees;
  p.partials=partialsOf(p).concat([{at,price,qty,margin:marginPart,pnl,fees,part}]);
  p.margin=p.margin-marginPart;
  logAdd(p,'partial',label+' · '+fmtUsd(pnl),at);
  if(p.margin<=0.0001){
    p.margin=0;p.status='closed';p.closedAt=at;p.exitPrice=price;
    logAdd(p,'close','پوزیشن کامل بسته شد',at);
  }
  return pnl;
}
function pbPicker(cur,onPick){
  const w=el('div','pbpick');
  for(const id of PB_IDS.includes(cur)||!PB[cur]?PB_IDS:[cur].concat(PB_IDS)){
    const b=el('button','pbc'+(id===cur?' on':''),esc(pbDef(id).n));
    b.type='button';b.title=pbDef(id).d;b.setAttribute('aria-pressed',id===cur?'true':'false');
    b.onclick=()=>onPick(id);
    w.appendChild(b);
  }
  return w;
}
/* ---- پیگیری کانال روی پوزیشن ---- */
/* وقتی کانال درباره‌ی سیگنالی که گرفته‌ای پست بعدی می‌گذارد (ریسک‌فری، سیو سود، استاپ خورد،
   ببندید، استاپ را بیارید روی X)، زیر همان پوزیشن با یک دکمه برای انجامش می‌آید.
   خودکار کاری نمی‌شود — تصمیم با خودت؛ «نادیده بگیر» هم هست. */
const RX_FCLOSE=/ببندید|ببندین|ببندیدش|کلوز\s*کنید|خارج\s*(?:بشید|شید|شوید)|خروج\s*(?:بزنید|کنید|بگیرید)|(?:پوزیشن|معامله)\s*(?:رو|را)\s*ببند/;
const RX_FSTOP=/(?:استاپ|حد\s*ضرر)\s*(?:رو|را)?\s*(?:ببرید|بیارید|بذارید|بگذارید|منتقل\s*کنید|جا\s*به\s*جا\s*کنید)\s*(?:روی|رو|به|تا)\s*(?:قیمت\s*)?([\d.,]+)/;
const RX_FBE=/(?:استاپ|حد\s*ضرر)[^\n\d]{0,25}?(?:نقطه\s*(?:ی\s*)?)?ورود/;
function followOf(q){
  const t=faNorm(normDig(q.text||''));
  const ms=t.match(RX_FSTOP);
  if(ms){const v=parseFloat(ms[1].replace(/,/g,''));if(v>0)return {kind:'stop',v};}
  if(RX_FBE.test(t))return {kind:'be'};
  const c=claimOf(q);
  if(c)return c;
  if(RX_FCLOSE.test(t))return {kind:'close'};
  return null;
}
let FIDX=null, FKEY='';
function followIndex(){
  const key=POSTS.length+':'+(POSTS[0]&&POSTS[0].id)+':'+(POSTS.length&&POSTS[POSTS.length-1].id);
  if(FIDX&&FKEY===key)return FIDX;
  const sigIdx=new Map();
  for(const s of POSTS.filter(x=>x.date&&isSigPost(x)).sort((a,b)=>a.date-b.date)){
    const tk=sigOf(s).ticker;if(tk)(sigIdx.get(tk)||sigIdx.set(tk,[]).get(tk)).push(s);
  }
  const m=new Map();
  for(const q of POSTS){
    if(!q.date)continue;
    const f=followOf(q);if(!f)continue;
    const g=sigOf(q);
    if(g.isSignal&&g.entry!=null&&g.stop!=null)continue;      // سیگنال تازه است، نه پیگیری
    const tg=claimTarget(q,sigIdx);if(!tg||tg.p.id===q.id)continue;
    (m.get(tg.p.id)||m.set(tg.p.id,[]).get(tg.p.id)).push({q,f,how:tg.how});
  }
  for(const l of m.values())l.sort((a,b)=>a.q.date-b.q.date);
  FKEY=key;FIDX=m;
  return m;
}
const followDone=(p,f)=>{
  const sign=p.dir==='long'?1:-1;
  if(f.kind==='be')return p.stop!=null&&(p.stop-p.entry)*sign>=-1e-12;
  if(f.kind==='stop')return p.stop!=null&&Math.abs(p.stop-f.v)<=Math.abs(f.v)*1e-9;
  if(f.kind==='tp')return !!p.pb&&(p.pbc||0)>=f.n;
  return false;
};
/* پیگیری‌های باز یک پوزیشن: بعد از ورود تو، هنوز انجام یا رد نشده */
function followsFor(p){
  if(p.status!=='open'||!POSTS.length)return [];
  // پوزیشن‌های ثبت‌شده از سیگنال sigId دارند؛ قدیمی‌ترها فقط از روی «تصمیم» به پست وصل‌اند
  let sid=p.sigId||p.postId;
  if(!sid)for(const [k,d] of Object.entries(DB.decisions))if(d&&d.posId===p.id){sid=k;break;}
  if(!sid)return [];
  const since=(p.openedAt||0)-10*60e3, fd=p.fdone||{};
  return (followIndex().get(sid)||[]).filter(x=>+x.q.date>=since&&!fd[x.q.id]&&!followDone(p,x.f));
}
const FOLLOW_FA={be:'ریسک‌فری',stop:'جابه‌جایی استاپ',tp:'سیو سود',sl:'استاپ خورد',close:'خروج'};
function followTag(f){return f.kind==='tp'?'تارگت '+faN(f.n||1)+' / سیو سود':f.kind==='stop'?'استاپ روی '+fmtPrice(f.v):FOLLOW_FA[f.kind];}
function followMark(p,q,how){p.fdone=Object.assign({},p.fdone,{[q.id]:how});}
function buildFollowBox(p,list){
  const w=el('div','fwx');
  w.appendChild(el('div','pbh',ic('info')+'<b>کانال درباره‌ی این پوزیشن</b>'));
  for(const {q,f,how} of list){
    const it=el('div','fwi');
    it.innerHTML='<div class="fwt"><span class="pill gold">'+esc(followTag(f))+'</span><time>'+jStampFa(q.date)+'</time>'+
      (how==='guess'?'<span class="markhint">حدسی (ریپلای نبود)</span>':'')+'</div>'+
      '<div class="fwq">'+esc((q.text||'').replace(/\s+/g,' ').slice(0,180))+'</div>';
    const acts=el('div','pbact');
    const act=(label,fn,pri)=>{const b=el('button','btn xs'+(pri?' pri':''),label);b.type='button';b.onclick=fn;acts.appendChild(b);};
    const sign=p.dir==='long'?1:-1;
    if(f.kind==='be')act(ic('shield')+'<span>استاپ روی ورود</span>',()=>undoable('استاپ روی ورود آمد',()=>{
      ensureBase(p);const o=p.stop;p.stop=p.entry;PENDING.delete(p.id);followMark(p,q,'done');
      logAdd(p,'stop','طبق پست کانال (ریسک‌فری): حد ضرر '+(o?'از '+fmtPrice(o)+' ':'')+'روی ورود');}),true);
    if(f.kind==='stop'){
      const live=pxOf(p), okSide=live==null||(live-f.v)*sign>0;
      act(ic('shield')+'<span>استاپ روی '+fmtPrice(f.v)+'</span>',()=>{
        if(!okSide)return toast('قیمت الان از '+fmtPrice(f.v)+' رد شده؛ این استاپ همان لحظه می‌خورد','err');
        undoable('استاپ جابه‌جا شد',()=>{ensureBase(p);const o=p.stop;p.stop=f.v;PENDING.delete(p.id);followMark(p,q,'done');
          logAdd(p,'stop','طبق پست کانال: حد ضرر '+(o?'از '+fmtPrice(o)+' ':'')+'روی '+fmtPrice(f.v));});
      },true);
    }
    if(f.kind==='tp'){
      if(p.pb&&(p.pbc||0)<Math.min(f.n||1,p.pb.tps.length)){
        const upto=Math.min(f.n||1,p.pb.tps.length);
        act(ic('check')+'<span>اجرای نقشه تا پله‌ی '+faN(upto)+'</span>',()=>undoable('نقشه تا پله‌ی '+faN(upto)+' اجرا شد',()=>{
          for(let i=p.pbc||0;i<upto&&p.status==='open';i++)pbApply(p,i,Date.now(),'طبق پست کانال: ');
          followMark(p,q,'done');}),true);
      }else act(ic('scissors')+'<span>بستن بخشی…</span>',()=>{followMark(p,q,'done');save();sheetPartial(p);},true);
    }
    if(f.kind==='sl'||f.kind==='close')act(ic('door')+'<span>بستن پوزیشن…</span>',()=>{followMark(p,q,'done');save();sheetClose(p);},true);
    act('نادیده بگیر',()=>{followMark(p,q,'skip');save();renderAll();});
    it.appendChild(acts);
    w.appendChild(it);
  }
  return w;
}
const PBEDIT=new Set();
/* وضعیت اجرای خودکار روی همین پوزیشن، با کلید خاموش/روشن */
function autoRow(p){
  const on=!p.autoOff;
  const r=el('div','autorow'+(on?' on':''),'<span>'+ic(on?'check':'clock')+'<b>'+(on?'اجرای خودکار روشن':'اجرای خودکار خاموش')+'</b> · '+
    (on?(p.pb?'استاپ بخورد می‌بندم؛ تارگت برسد، پله‌ی نقشه را ثبت می‌کنم':'استاپ بخورد می‌بندم')+'. به صرافی سفارش نمی‌فرستم؛ استاپ و تارگت را آنجا هم بگذار.'
       :'سرِ استاپ و تارگت فقط خبر می‌دهم؛ ثبت با خودت.')+'</span>');
  const b=el('button','mark ghost',on?'خاموش کن':'روشن کن');b.type='button';
  b.onclick=()=>{
    if(on)p.autoOff=true;else{delete p.autoOff;AUTOSEEN[p.id]=Date.now();autoSeenSave();}
    logAdd(p,'plan','اجرای خودکار '+(on?'خاموش':'روشن')+' شد');
    save();renderAll();
    if(!on)checkAutoExec();
  };
  r.appendChild(b);
  return r;
}
function buildPbBox(p,live){
  const w=el('div','pbx');
  const auto=F('autoexec')&&p.status==='open';
  if(!p.pb){
    w.appendChild(el('div','pbh',ic('flag')+'<b>نقشه‌ی خروج</b><span class="markhint">ندارد</span>'));
    w.appendChild(el('div','hint','یک سبک انتخاب کن تا پله‌های خروج با عدد ساخته شوند و سرِ هر پله '+(auto&&!p.autoOff?'خودم اجرایشان کنم.':'خبر بدهم.')));
    w.appendChild(pbPicker(null,id=>{if(pbAttach(p,id)){logAdd(p,'plan','نقشه‌ی خروج: '+pbDef(id).n);save();renderAll();}}));
    if(auto)w.appendChild(autoRow(p));
    return w;
  }
  const pb=p.pb, done=p.pbc||0, n=pb.tps.length;
  const hd=el('div','pbh',ic('flag')+'<b>نقشه‌ی خروج · '+esc(pb.n)+'</b>');
  if(p.status==='open'){
    const ch=el('button','mark ghost',PBEDIT.has(p.id)?'بستن':'عوض کن');
    ch.onclick=()=>{PBEDIT.has(p.id)?PBEDIT.delete(p.id):PBEDIT.add(p.id);renderPositions();};
    hd.appendChild(ch);
  }
  w.appendChild(hd);
  if(PBEDIT.has(p.id))w.appendChild(pbPicker(pb.id,id=>{if(pbAttach(p,id)){PBEDIT.delete(p.id);
    logAdd(p,'plan','نقشه‌ی خروج عوض شد: '+pbDef(id).n);save();renderAll();}}));
  const ol=el('ol','pbsteps');
  for(let i=0;i<n;i++){
    if(!(pb.parts[i]>0)&&pbStopPrice(p,i+1)===(i?pbStopPrice(p,i):null))continue;
    const hit=i===done&&p.status==='open'&&pbReached(p,i,live);
    const li=el('li',i<done?'done':hit?'hit':i===done?'next':'');
    const dist=live!=null&&i>=done?((pb.tps[i]-live)/live*100*(p.dir==='long'?1:-1)):null;
    li.innerHTML='<i>'+(i<done?ic('check'):faN(i+1))+'</i><div><b>تارگت '+faN(i+1)+' · <span dir="ltr">'+fmtPrice(pb.tps[i])+'</span></b>'+
      '<span>'+pbStepText(p,i)+(i<done?' · انجام شد':hit?' · <em>رسید!</em>':(dist!=null&&dist>0&&i===done?' · '+dist.toFixed(1)+'٪ مانده':''))+'</span></div>';
    if(i===done&&p.status==='open'){
      const acts=el('div','pbact');
      const ok=el('button','btn '+(hit?'pri':'')+' xs',ic('check')+'<span>انجام شد</span>');
      ok.title='همین پله را اجرا کن: بستن سهمش روی '+fmtPrice(pb.tps[i])+' و جابه‌جایی استاپ';
      ok.onclick=()=>pbDo(p,i);
      const sk=el('button','mark ghost','رد کن');sk.title='این پله را خودت جور دیگری انجام دادی';
      sk.onclick=()=>{p.pbc=i+1;logAdd(p,'plan','پله‌ی '+faN(i+1)+' نقشه رد شد');save();renderAll();};
      acts.appendChild(ok);acts.appendChild(sk);li.appendChild(acts);
    }
    ol.appendChild(li);
  }
  w.appendChild(ol);
  if(done>=n&&p.status==='open')w.appendChild(el('div','hint','همه‌ی پله‌های نقشه انجام شد؛ باقی‌مانده با استاپ فعلی مدیریت می‌شود.'));
  if(auto)w.appendChild(autoRow(p));
  return w;
}

