/* ==================== کارت اشتراک‌گذاری ==================== */
/* چرا کانواس و نه اسکرین‌شات: تصویری که برای دیگران می‌فرستی نباید هرچه روی صفحه‌ی
   توست را لو بدهد — نه مانده‌ی حساب، نه بقیه‌ی پوزیشن‌ها. این کارت فقط همان چیزی
   را می‌کشد که خودت انتخاب کرده‌ای، در اندازه‌ی ثابت، مستقل از گوشی و زوم.
   طراحی از خود برنامه آمده (همان تیره، همان طلایی، همان کندل‌های نشان) تا هرکس
   دیدش بداند از کجاست، بدون اینکه لوگوی بزرگ رویش بنشیند. */
const SHARE_FONT="'Vazirmatn','Segoe UI',Tahoma,system-ui,-apple-system,sans-serif";
const SHKEY='signaldesk.share.v1';
let shareOpt=Object.assign({amount:true,channel:true,dates:true,ratio:'45',brand:'',chText:'',foot:'',bgOn:false,bgDim:.55},lsGet(SHKEY)||{});
/* متن‌های قابل ویرایشِ تصویر؛ خالی یعنی پیش‌فرض */
const shBrand=()=>(shareOpt.brand||'').trim()||'میز سیگنال';
const shChan=()=>(shareOpt.chText||'').trim()||('@'+S.channel);
const shFoot=()=>(shareOpt.foot||'').trim()||'گزارش شخصی — توصیه‌ی مالی نیست';
const shareSave=()=>lsSet(SHKEY,shareOpt);
/* ---- پس‌زمینه‌ی دلخواه ----
   عکس جدا از بقیه‌ی گزینه‌ها ذخیره می‌شود (حجمش زیاد است). روی عکس یک لایه‌ی تیره با
   شدتِ قابل تنظیم می‌آید و پشت عدد اصلی و خانه‌ها صفحه‌ی نیمه‌شفاف، پس هر عکسی بگذاری
   عددها خوانا می‌مانند. خاموش باشد، کارت همان کارت ساده‌ی قبلی است. */
const SHBGKEY='signaldesk.sharebg.v1';
const SHBG={img:null,src:null};
async function shBgLoad(){
  const src=SHBG.src||lsGet(SHBGKEY);
  if(!src){SHBG.img=null;return null;}
  if(SHBG.img&&SHBG.src===src)return SHBG.img;
  SHBG.src=src;
  SHBG.img=await new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=src;});
  return SHBG.img;
}
async function shBgSet(file){
  const im=await new Promise(r=>{const u=URL.createObjectURL(file),x=new Image();x.onload=()=>r(x);x.onerror=()=>r(null);x.src=u;});
  if(!im)return false;
  // کوچک‌سازی تا 1350 پیکسل: برای کارت کافی است و در حافظه‌ی مرورگر جا می‌شود
  const k=Math.min(1,1350/Math.max(im.naturalWidth,im.naturalHeight));
  const cv=document.createElement('canvas');cv.width=Math.round(im.naturalWidth*k);cv.height=Math.round(im.naturalHeight*k);
  cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
  const url=cv.toDataURL('image/jpeg',0.84);
  SHBG.src=url;SHBG.img=null;
  if(!lsSet(SHBGKEY,url))toast('عکس برای همین بار گذاشته شد؛ حافظه‌ی مرورگر برای نگه داشتنش جا نداشت','info');
  await shBgLoad();
  return true;
}
/* زمینه‌ی کارت: رنگ ساده، یا عکس + لایه‌ی تیره. خروجی می‌گوید عکس کشیده شد یا نه. */
function shDrawBg(c,W,H,acc,heroY,o){
  c.fillStyle=SH.bg;c.fillRect(0,0,W,H);
  const img=o.bgOn&&SHBG.img;
  SHX.bg=!!img;
  if(img){
    const iw=img.naturalWidth,ih=img.naturalHeight,k=Math.max(W/iw,H/ih);
    c.drawImage(img,(W-iw*k)/2,(H-ih*k)/2,iw*k,ih*k);
    const dim=Math.min(.9,Math.max(.2,+o.bgDim||.55));
    c.fillStyle='rgba(8,9,12,'+dim+')';c.fillRect(0,0,W,H);
    // بالا و پایین کمی تیره‌تر: سربرگ و پاورقی روی هر عکسی خوانا
    const g=c.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgba(8,9,12,.45)');g.addColorStop(.22,'rgba(8,9,12,0)');
    g.addColorStop(.78,'rgba(8,9,12,0)');g.addColorStop(1,'rgba(8,9,12,.55)');
    c.fillStyle=g;c.fillRect(0,0,W,H);
  }
  const glow=c.createRadialGradient(W/2,heroY-60,0,W/2,heroY-60,W*0.8);
  glow.addColorStop(0,img?'rgba(0,0,0,0)':mix(acc,0.17));glow.addColorStop(1,img?'rgba(0,0,0,0)':SH.bg);
  if(!img){c.fillStyle=glow;c.fillRect(0,0,W,H);}
  c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=3;
  rr(c,6,6,W-12,H-12,54);c.stroke();
  return !!img;
}
/* صفحه‌ی شیشه‌ای پشت عدد اصلی — فقط وقتی عکس هست */
function shGlass(c,x,y,w,h){
  if(!SHX.bg)return;
  c.save();c.fillStyle='rgba(10,11,15,.7)';rr(c,x,y,w,h,36);c.fill();
  c.strokeStyle='rgba(255,255,255,.10)';c.lineWidth=2;rr(c,x,y,w,h,36);c.stroke();c.restore();
}
const shCellBg=()=>SHX.bg?'rgba(18,20,26,.86)':SH.card;

const SH={bg:'#0D0E12',card:'#16181D',card2:'#1C1E25',line:'#262A33',
  tx:'#F1F3F7',tx2:'#C2C7D1',tx3:'#99A0AD',
  up:'#46C08A',dn:'#E0636E',gold:'#D9A441',gold2:'#B8842F',goldL:'#F0C67C'};

function rr(c,x,y,w,h,r){
  c.beginPath();
  if(c.roundRect)c.roundRect(x,y,w,h,r);
  else{c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);
       c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
}
/* نشان برنامه: همان سه کندل صعودیِ آیکون، از فضای 512 به اندازه‌ی دلخواه */
function drawMark(c,x,y,size){
  const k=size/512;
  c.save();c.translate(x,y);c.scale(k,k);
  const g=c.createLinearGradient(0,420,0,105);
  g.addColorStop(0,SH.gold2);g.addColorStop(1,SH.goldL);
  c.fillStyle=g;c.strokeStyle=g;c.lineCap='round';
  const cd=(tx,y1,y2,ry,rh)=>{
    c.lineWidth=14;c.beginPath();c.moveTo(tx,y1);c.lineTo(tx,y2);c.stroke();
    rr(c,tx-34,ry,68,rh,18);c.fill();
  };
  cd(140,252,418,300,76); cd(256,186,382,238,102); cd(372,112,346,162,140);
  c.restore();
}
const shFont=(c,size,weight)=>{c.font=(weight||700)+' '+size+'px '+SHARE_FONT;};
/* عددها همیشه چپ‌به‌راست‌اند حتی وسط متن فارسی؛ متن فارسی راست‌به‌چپ. */
/* وقتی تصویر پس‌زمینه هست، هر نوشته یک سایه‌ی نرم تیره می‌گیرد تا روی هر رنگی خوانا بماند */
const SHX={bg:false};
function shShadow(c){if(SHX.bg){c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=16;c.shadowOffsetY=2;}}
function shText(c,txt,x,y,{size=32,weight=700,color=SH.tx,align='right',rtl=true}={}){
  c.save();shFont(c,size,weight);c.fillStyle=color;shShadow(c);
  c.direction=rtl?'rtl':'ltr';c.textAlign=align;c.textBaseline='alphabetic';
  c.fillText(txt,x,y);c.restore();
}
function shPill(c,txt,x,y,{bg,fg,size=26,padX=22,h=48,align='right'}={}){
  c.save();shFont(c,size,800);
  const w=c.measureText(txt).width+padX*2;
  const left=align==='right'?x-w:x;
  c.fillStyle=bg;rr(c,left,y,w,h,h/2);c.fill();
  c.fillStyle=fg;c.direction='rtl';c.textAlign='center';c.textBaseline='middle';
  c.fillText(txt,left+w/2,y+h/2+1);
  c.restore();
  return w;
}
const mix=(hex,pct)=>{
  const n=parseInt(hex.slice(1),16), r=n>>16, g=(n>>8)&255, b=n&255;
  const bg=parseInt(SH.bg.slice(1),16);
  const br=bg>>16, bgc=(bg>>8)&255, bb=bg&255;
  const m=(a,bv)=>Math.round(bv+(a-bv)*pct);
  return 'rgb('+m(r,br)+','+m(g,bgc)+','+m(b,bb)+')';
};

/* ورودیِ کارت را از پوزیشن می‌سازیم تا همان اعدادی برود روی تصویر که در برنامه دیده‌ای */
function shareDataOf(p){
  const live=pxOf(p), m=posMetrics(p,live), open=p.status==='open';
  const spot=p.kind==='spot';
  return {ticker:p.ticker,spot,dir:p.dir,lev:p.lev,open,
    roi:m.roi,pnl:m.pnl,r:m.r,entry:p.entry,exit:m.exit,stop:p.stop0!=null?p.stop0:p.stop,
    since:open?Date.now():p.closedAt,openedAt:p.openedAt,closedAt:open?null:p.closedAt,
    title:open?(spot?'خرید باز':'پوزیشن باز'):(spot?'فروش انجام شد':'پوزیشن بسته شد')};
}
function drawShareCard(d,opt){
  const o=opt||shareOpt;
  const sq=o.ratio==='11';
  const W=1080, H=sq?1080:1350;
  /* چیدمان با عدد ثابت نوشته می‌شود نه با «هرچه آمد»: در 4:5 و مربع باید هر دو
     پر و متعادل باشند، وگرنه پایین کارت یک وجب خالی می‌ماند. */
  const L=sq
    ?{sym:236,hero:420,heroLab:476,pnl:548,lad:626,cells:694,cellH:128,fs:128,dates:890}
    :{sym:300,hero:575,heroLab:638,pnl:718,lad:838,cells:922,cellH:150,fs:168,dates:1148};
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d');
  const win=(d.pnl||0)>=0, acc=win?SH.up:SH.dn;
  const P=76;

  // هاله‌ی پشت عدد: قبل از خواندن هر رقمی، سبز یا قرمز بودنش را می‌فهمی (یا عکس دلخواه)
  shDrawBg(c,W,H,acc,L.hero,o);

  // ── سربرگ ──
  drawMark(c,W-P-64,P-6,64);
  shText(c,shBrand(),W-P-84,P+46,{size:38,weight:900,color:SH.goldL});
  shText(c,jStampFa(new Date(d.since||Date.now())).split(' ')[0],P,P+42,
    {size:28,weight:700,color:SH.tx2,align:'left'});

  // ── نماد و برچسب‌ها ──
  c.save();shFont(c,86,900);c.fillStyle=SH.tx;c.direction='ltr';c.textAlign='right';
  c.fillText(d.ticker||'—',W-P,L.sym);
  const tw=c.measureText(d.ticker||'—').width;c.restore();
  let px=W-P-tw-24;
  if(d.spot)px-=shPill(c,'اسپات',px,L.sym-46,{bg:mix(SH.gold,.18),fg:SH.gold})+12;
  else{
    px-=shPill(c,d.dir==='long'?'لانگ':'شورت',px,L.sym-46,
      {bg:mix(d.dir==='long'?SH.up:SH.dn,.18),fg:d.dir==='long'?SH.up:SH.dn})+12;
    shPill(c,(+d.lev)+'x',px,L.sym-46,{bg:SH.card2,fg:SH.tx2});
  }
  {const tt=(d.titleOv||'').trim()||d.title;shText(c,tt,P,L.sym-8,{size:31,weight:800,color:SH.tx2,align:'left',rtl:/[\u0600-\u06FF]/.test(tt)});}
  shGlass(c,P-24,L.hero-L.fs-10,W-2*P+48,L.cells-18-(L.hero-L.fs-10));   // عدد اصلی تا نردبان

  // ── عدد اصلی ──
  const roiTxt=(d.roi==null||!isFinite(d.roi))?'—':
    (d.roi>0?'+':d.roi<0?'−':'')+Math.abs(d.roi).toFixed(1)+'٪';
  c.save();
  c.shadowColor=mix(acc,.9);c.shadowBlur=SHX.bg?40:90;
  shFont(c,L.fs,900);c.fillStyle=acc;c.direction='ltr';c.textAlign='center';
  c.fillText(roiTxt,W/2,L.hero);
  c.restore();
  shText(c,d.spot?'بازده':'بازده روی مارجین',W/2,L.heroLab,
    {size:31,weight:800,color:SH.tx2,align:'center'});
  if(o.amount){
    c.save();shFont(c,66,900);c.fillStyle=acc;c.direction='ltr';c.textAlign='center';shShadow(c);
    c.fillText(fmtUsd(d.pnl),W/2,L.pnl);c.restore();
  }

  // ── نردبان: همان تصویری که در خود برنامه تصمیم را با آن می‌گیری ──
  /* نوار درصدیِ ساده گمراه‌کننده بود: حرکتِ 4٪ قیمت با اهرم 5 یعنی 21٪ بازده،
     ولی نوار تقریباً خالی می‌ماند. اینجا به‌جای «چقدر حرکت کرد»، «کجا ایستاد
     نسبت به استاپ و ورود» را نشان می‌دهیم — همان چیزی که واقعاً معنی دارد. */
  drawShareLadder(c,d,acc,P,L.lad,W-P*2);

  // ── سه خانه‌ی عدد ──
  const bw=W-P*2, cw=(bw-24*2)/3, y=L.cells;
  const cells=[
    [d.spot?'قیمت خرید':'ورود',d.entry!=null?fmtPrice(d.entry):'—',SH.tx],
    [d.open?'قیمت الان':'خروج',d.exit!=null&&isFinite(d.exit)?fmtPrice(d.exit):'—',SH.tx],
    (d.r!=null&&isFinite(d.r))
      ?['نسبت به ریسک',fmtR(d.r),acc]
      :['مدت نگهداری',shDur(d.openedAt,d.since),SH.tx]
  ];
  cells.forEach((cl,i)=>{
    const x=W-P-cw-(cw+24)*i;
    c.fillStyle=shCellBg();rr(c,x,y,cw,L.cellH,26);c.fill();
    c.strokeStyle=SHX.bg?'rgba(255,255,255,.14)':SH.line;c.lineWidth=2;rr(c,x,y,cw,L.cellH,26);c.stroke();
    shText(c,cl[0],x+cw/2,y+(L.cellH>140?52:48),{size:27,weight:800,color:SH.tx2,align:'center'});
    c.save();shFont(c,L.cellH>140?46:42,900);c.fillStyle=cl[2];
    c.direction=/[0-90-9]/.test(cl[1])&&!/[آ-ی]/.test(cl[1])?'ltr':'rtl';
    c.textAlign='center';
    c.fillText(cl[1],x+cw/2,y+(L.cellH>140?116:104));c.restore();
  });

  // ── تاریخ باز شدن، بسته شدن و مدتِ باز بودن ──
  if(o.dates&&d.openedAt){
    const dy=L.dates, bw2=W-P*2;
    c.fillStyle=SHX.bg?'rgba(22,19,12,.86)':mix(SH.gold,.08);rr(c,P,dy-54,bw2,86,22);c.fill();
    c.strokeStyle=mix(SH.gold,.3);c.lineWidth=2;rr(c,P,dy-54,bw2,86,22);c.stroke();
    const seg=[['باز شد',jStampFa(new Date(d.openedAt))]];
    if(d.closedAt)seg.push(['بسته شد',jStampFa(new Date(d.closedAt))]);
    seg.push([d.open?'باز از':'مدت',shDur(d.openedAt,d.closedAt||Date.now())]);
    const sw=bw2/seg.length;
    seg.forEach((sg,i)=>{
      const cx=W-P-sw*i-sw/2;
      shText(c,sg[0],cx,dy-18,{size:23,weight:700,color:SH.tx2,align:'center'});
      c.save();shFont(c,27,900);c.fillStyle=SH.tx;c.textAlign='center';
      c.direction=/[آ-ی]/.test(sg[1])?'rtl':'ltr';
      c.fillText(sg[1],cx,dy+18);c.restore();
    });
  }

  // ── پاورقی ──
  const fy=H-P-4;
  c.strokeStyle=mix(SH.gold,.3);c.lineWidth=3;
  c.beginPath();c.moveTo(P,fy-56);c.lineTo(W-P,fy-56);c.stroke();
  if(o.channel)shText(c,shChan(),W-P,fy,{size:30,weight:800,color:SH.goldL,align:'right',rtl:/[\u0600-\u06FF]/.test(shChan())});
  shText(c,shFoot(),P,fy,{size:26,weight:700,color:SH.tx2,align:'left',rtl:/[\u0600-\u06FF]/.test(shFoot())});
  return cv;
}
/* نردبانِ کوچکِ کارت: استاپ، ورود و خروج روی یک محور.
   راست‌به‌چپ نیست — قیمت یک محور عددی است و باید مثل نمودار چپ‌به‌راست بماند. */
function drawShareLadder(c,d,acc,x,y,w){
  const pts=[d.entry,d.exit,d.stop].filter(v=>v!=null&&isFinite(v)&&v>0);
  if(pts.length<2){                       // چیزی برای کشیدن نیست: فقط یک خط آرام
    c.fillStyle=SH.card2;rr(c,x,y,w,12,6);c.fill();return;
  }
  let lo=Math.min.apply(null,pts), hi=Math.max.apply(null,pts);
  const pad=(hi-lo)*0.18||hi*0.01;
  lo-=pad;hi+=pad;
  const at=v=>x+((v-lo)/(hi-lo))*w;
  const h=12;
  c.fillStyle=SH.card2;rr(c,x,y,w,h,h/2);c.fill();
  // ناحیه‌ی بین ورود و خروج: همان فاصله‌ای که سود یا ضرر از آن آمده
  if(d.exit!=null&&isFinite(d.exit)&&d.entry){
    const a=at(d.entry), b=at(d.exit);
    c.fillStyle=mix(acc,.75);rr(c,Math.min(a,b),y,Math.abs(a-b),h,h/2);c.fill();
  }
  const tick=(v,label,color,below,lx)=>{
    if(v==null||!isFinite(v)||v<=0)return;
    const tx=Math.max(x+2,Math.min(x+w-2,at(v)));
    c.fillStyle=color;c.beginPath();c.arc(tx,y+h/2,11,0,Math.PI*2);c.fill();
    c.fillStyle=SH.bg;c.beginPath();c.arc(tx,y+h/2,4.5,0,Math.PI*2);c.fill();
    shText(c,label,lx!=null?lx:tx,below?y+h+42:y-26,{size:26,weight:800,color,align:'center'});
  };
  /* استاپ و ورود هر دو زیر خط‌اند؛ وقتی نزدیک هم‌اند (استاپ تنگ) برچسب‌ها روی هم می‌افتادند.
     اگر هم‌پوشانی دارند، هر کدام نصفِ هم‌پوشانی را از دیگری دور می‌شود. */
  const sL='استاپ '+fmtPrice(d.stop), eL='ورود';
  let sx=null, ex=null;
  if(d.stop>0&&d.entry>0){
    shFont(c,26,800);
    const ws=c.measureText(sL).width, we=c.measureText(eL).width;
    const cl=v=>Math.max(x+2,Math.min(x+w-2,at(v)));
    sx=cl(d.stop);ex=cl(d.entry);
    const gap=(ws+we)/2+18-Math.abs(sx-ex);
    if(gap>0){const dirn=sx<=ex?-1:1;sx+=dirn*gap/2;ex-=dirn*gap/2;}
    sx=Math.max(x+ws/2,Math.min(x+w-ws/2,sx));ex=Math.max(x+we/2,Math.min(x+w-we/2,ex));
    if(Math.abs(sx-ex)<(ws+we)/2+18){           // لبه‌ی کارت جا نگذاشت: از طرف دیگر جا باز کن
      if(sx<=ex)ex=sx+(ws+we)/2+18;else sx=ex+(ws+we)/2+18;
    }
  }
  tick(d.stop,sL,SH.dn,true,sx);
  tick(d.entry,eL,SH.tx2,true,ex);
  tick(d.exit,d.open?'قیمت الان':'خروج',acc,false);
}
/* همان کارت، ولی برای یک بازه به‌جای یک پوزیشن. عمداً همان چیدمان است تا کسی
   که هر دو را دیده باشد بداند از یک جا آمده‌اند. */
function drawSummaryCard(a,label,opt){
  const o=opt||shareOpt;
  const sq=o.ratio==='11';
  const W=1080,H=sq?1080:1350;
  const L=sq?{hero:430,heroLab:490,pnl:566,cells:640,cellH:132,fs:132}
            :{hero:580,heroLab:642,pnl:730,cells:840,cellH:150,fs:160};
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d');
  /* عدد اصلی مجموع R است نه نرخ برد: نرخ برد می‌تواند 70٪ باشد و حساب در ضرر،
     و آن‌وقت عددِ سبز روی کارتِ ضرر می‌نشیند. R هم مستقل از اندازه‌ی حساب است،
     پس فرستادنش چیزی از سرمایه‌ات لو نمی‌دهد. */
  const hasR=a.totalR!=null&&isFinite(a.totalR);
  const heroVal=hasR?a.totalR:(a.pnl||0);
  const acc=heroVal>=0?SH.up:SH.dn, P=76;
  shDrawBg(c,W,H,acc,L.hero,o);

  drawMark(c,W-P-64,P-6,64);
  shText(c,shBrand(),W-P-84,P+46,{size:38,weight:900,color:SH.goldL});
  shText(c,jStampFa(new Date()).split(' ')[0],P,P+42,{size:28,weight:700,color:SH.tx2,align:'left'});
  shText(c,label,W-P,sq?230:280,{size:46,weight:900,color:SH.tx});
  shText(c,'کارنامه',P,sq?226:276,{size:31,weight:800,color:SH.tx2,align:'left'});
  shGlass(c,P-24,L.hero-L.fs-10,W-2*P+48,L.cells-18-(L.hero-L.fs-10));   // عدد اصلی تا نردبان

  const heroTxt=hasR?fmtR(a.totalR):(a.winRate==null?'—':faN(a.winRate.toFixed(0))+'٪');
  c.save();c.shadowColor=mix(acc,.9);c.shadowBlur=SHX.bg?40:90;
  shFont(c,L.fs,900);c.fillStyle=acc;c.direction=hasR?'ltr':'rtl';c.textAlign='center';
  c.fillText(heroTxt,W/2,L.hero);c.restore();
  shText(c,hasR?'مجموع R — چند برابر ریسکِ هر معامله':'نرخ برد',
    W/2,L.heroLab,{size:hasR?28:31,weight:800,color:SH.tx2,align:'center'});
  if(o.amount){
    c.save();shFont(c,64,900);c.fillStyle=acc;c.direction='ltr';c.textAlign='center';shShadow(c);
    c.fillText(fmtUsd(a.pnl),W/2,L.pnl);c.restore();
  }

  const bw=W-P*2, cw=(bw-20*2)/3, y=L.cells, y2=y+L.cellH+20;
  const cells=[
    ['معامله',faN(a.n),SH.tx],['برد',faN(a.wins),SH.up],['باخت',faN(a.losses),SH.dn],
    ['نرخ برد',a.winRate==null?'—':faN(a.winRate.toFixed(0))+'٪',
      a.winRate==null?SH.tx3:(a.winRate>=50?SH.up:SH.dn)],
    ['ضریب سود',pfTxt(a.pf),
      a.pf!=null&&a.pf>=1?SH.up:SH.tx],
    ['میانگین R',a.avgR!=null?fmtR(a.avgR):'—',a.avgR!=null?(a.avgR>=0?SH.up:SH.dn):SH.tx3]
  ];
  cells.forEach((cl,i)=>{
    const row=i<3?0:1, col=i%3;
    const x=W-P-cw-(cw+20)*col, cy=row?y2:y;
    c.fillStyle=shCellBg();rr(c,x,cy,cw,L.cellH,26);c.fill();
    c.strokeStyle=SHX.bg?'rgba(255,255,255,.14)':SH.line;c.lineWidth=2;rr(c,x,cy,cw,L.cellH,26);c.stroke();
    shText(c,cl[0],x+cw/2,cy+50,{size:26,weight:800,color:SH.tx2,align:'center'});
    c.save();shFont(c,42,900);c.fillStyle=cl[2];
    c.direction=/[آ-ی]/.test(cl[1])?'rtl':'ltr';c.textAlign='center';   // «+0.80R» چپ‌به‌راست، وگرنه «0.80R+» می‌شد
    c.fillText(cl[1],x+cw/2,cy+(L.cellH>140?112:106));c.restore();
  });

  const fy=H-P-4;
  c.strokeStyle=mix(SH.gold,.3);c.lineWidth=3;
  c.beginPath();c.moveTo(P,fy-56);c.lineTo(W-P,fy-56);c.stroke();
  if(o.channel)shText(c,shChan(),W-P,fy,{size:30,weight:800,color:SH.goldL,align:'right',rtl:/[\u0600-\u06FF]/.test(shChan())});
  shText(c,shFoot(),P,fy,{size:26,weight:700,color:SH.tx2,align:'left',rtl:/[\u0600-\u06FF]/.test(shFoot())});
  return cv;
}
function sheetShareSummary(a,label){
  openSheet(
   '<h3>تصویر کارنامه · '+esc(label)+'</h3>'+
   '<div class="sub">خلاصه‌ی این بازه در یک تصویر. مانده‌ی حساب و جزئیات معامله‌ها رویش نمی‌رود.</div>'+
   '<div class="shprev"><img id="shImg" alt="پیش‌نمایش کارت"></div>'+
   '<div class="shopts">'+
     '<label class="shopt"><input type="checkbox" id="o_amt"><span>نمایش مبلغ خالص</span></label>'+
     '<label class="shopt"><input type="checkbox" id="o_ch"><span>نوشتن نام کانال</span></label>'+
     shTextsHtml(false,false)+
   '</div>'+
   '<div class="mkt" id="shRatio" style="margin:10px 0"></div>'+
   '<div class="srow"><button class="btn pri" id="ok">'+ic('share')+'<span>اشتراک‌گذاری</span></button>'+
   '<button class="btn" id="cx">بستن</button></div>',
   ()=>{
     let cv=null;
     const paint=()=>{
       cv=drawSummaryCard(a,label,shareOpt);
       $('#shImg').src=cv.toDataURL('image/png');
       const rb=$('#shRatio');rb.innerHTML='';
       for(const [k,lab] of [['45','4:5 — استوری و پست'],['11','مربع']]){
         const b=el('button','mktb'+(shareOpt.ratio===k?' on':''),lab);
         b.setAttribute('aria-pressed',shareOpt.ratio===k?'true':'false');
         b.onclick=()=>{shareOpt.ratio=k;shareSave();paint();};
         rb.appendChild(b);
       }
     };
     $('#o_amt').checked=shareOpt.amount;$('#o_ch').checked=shareOpt.channel;
     $('#o_amt').onchange=()=>{shareOpt.amount=$('#o_amt').checked;shareSave();paint();};
     $('#o_ch').onchange=()=>{shareOpt.channel=$('#o_ch').checked;shareSave();paint();};
     shTextsWire(paint,null);
     paint();
     if(document.fonts&&document.fonts.load)document.fonts.load("900 40px 'Vazirmatn'").then(()=>{if($('#shImg'))paint();}).catch(()=>{});
     $('#ok').onclick=async()=>{
       const r=await busyRun(()=>shareOrSave(cv,'report-'+new Date().toISOString().slice(0,10)));
       if(r==='save')toast('تصویر ذخیره شد — از گالری بفرستش','ok');
       else if(r==='share')closeSheet();
     };
     $('#cx').onclick=closeSheet;
   });
}
function shDur(a,b){
  if(!a||!b)return '—';
  const mn=Math.max(0,Math.round((b-a)/60000));
  if(mn<60)return faN(mn)+' دقیقه';
  const d=Math.floor(mn/1440), h=Math.floor((mn%1440)/60), m=mn%60;
  if(!d)return h+' ساعت'+(m?' و '+m+' دقیقه':'');
  return d+' روز'+(h?' و '+h+' ساعت':'');
}
const canvasBlob=cv=>new Promise(r=>cv.toBlob(r,'image/png'));
/* اشتراک‌گذاری بومی فقط در بستر امن و با پشتیبانی فایل کار می‌کند؛ هرجا نشد،
   دانلود می‌کنیم — تصویر در هر دو حالت یکی است. */
async function shareOrSave(cv,name){
  const blob=await canvasBlob(cv);
  if(!blob)return toast('ساخت تصویر نشد','err');
  const file=new File([blob],name+'.png',{type:'image/png'});
  try{
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file]});
      return 'share';
    }
  }catch(e){ if(e&&e.name==='AbortError')return 'cancel'; }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name+'.png';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
  return 'save';
}
/* متن‌های قابل ویرایش تصویر — مشترک بین تصویر پوزیشن و تصویر کارنامه */
function shTextsHtml(withTitle,withDates){
  return '<div class="shbg"><div class="lxlab">پس‌زمینه</div><div class="mkt" id="shBgSel"></div>'+
    '<div class="shbgrow hide" id="shBgRow"><label class="shdim"><span>تیرگی روی عکس</span>'+
    '<input type="range" id="shDim" min="20" max="90" step="5"><b id="shDimV"></b></label>'+
    '<button class="btn xs" id="shBgNew">'+ic('edit')+'<span>عوض کردن عکس</span></button></div>'+
    '<input type="file" id="shBgFile" accept="image/*" class="hide"></div>'+
    '<details class="sec sub2 shtx"><summary>'+ic('edit')+'ویرایش متن‌های تصویر</summary><div class="grid">'+
    (withTitle?'<div class="fld"><label>عنوان</label><input id="t_title" placeholder="خودکار"></div>':'')+
    '<div class="fld"><label>نام بالای تصویر</label><input id="t_brand" placeholder="میز سیگنال"></div>'+
    '<div class="fld"><label>نام کانال</label><input id="t_ch" dir="auto" placeholder="@'+esc(S.channel)+'"></div>'+
    '<div class="fld"><label>متن پایین (کپی‌رایت)</label><input id="t_foot" placeholder="گزارش شخصی — توصیه‌ی مالی نیست"></div>'+
    '</div><div class="hint">خالی بگذاری، متن پیش‌فرض می‌آید. نام، کانال و متن پایین برای تصویرهای بعدی هم یادش می‌ماند.</div></details>'+
    (withDates?'<label class="shopt"><input type="checkbox" id="o_dt"><span>تاریخ باز و بسته شدن و مدت</span></label>':'');
}
function shTextsWire(paint,d){
  const paintBg=()=>{
    const box=$('#shBgSel');if(!box)return;box.innerHTML='';
    const has=!!(SHBG.src||lsGet(SHBGKEY));
    for(const [k,lab] of [[false,'ساده'],[true,has?'عکس من':'عکس من…']]){
      const on=!!shareOpt.bgOn===k;
      const b=el('button','mktb'+(on?' on':''),lab);b.setAttribute('aria-pressed',on?'true':'false');
      b.onclick=async()=>{
        if(k&&!(SHBG.src||lsGet(SHBGKEY))){$('#shBgFile').click();return;}
        shareOpt.bgOn=k;shareSave();if(k)await shBgLoad();paintBg();paint();
      };
      box.appendChild(b);
    }
    $('#shBgRow').classList.toggle('hide',!shareOpt.bgOn);
    const r=$('#shDim');r.value=Math.round((+shareOpt.bgDim||.55)*100);$('#shDimV').textContent=r.value+'%';
  };
  if($('#shBgSel')){
    $('#shBgFile').onchange=async e=>{
      const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
      if(!await shBgSet(f))return toast('این فایل تصویر نیست','err');
      shareOpt.bgOn=true;shareSave();paintBg();paint();
    };
    $('#shBgNew').onclick=()=>$('#shBgFile').click();
    $('#shDim').oninput=e=>{shareOpt.bgDim=+e.target.value/100;$('#shDimV').textContent=e.target.value+'%';shareSave();paint();};
    paintBg();
    if(shareOpt.bgOn)shBgLoad().then(()=>{if($('#shImg'))paint();});
  }
  const bind=(id,key)=>{const i=$('#'+id);if(!i)return;i.value=shareOpt[key]||'';
    i.oninput=()=>{shareOpt[key]=i.value;shareSave();paint();};};
  bind('t_brand','brand');bind('t_ch','chText');bind('t_foot','foot');
  const t=$('#t_title');if(t&&d){t.value=d.titleOv||'';t.oninput=()=>{d.titleOv=t.value;paint();};}
  const dt=$('#o_dt');if(dt){dt.checked=shareOpt.dates!==false;dt.onchange=()=>{shareOpt.dates=dt.checked;shareSave();paint();};}
}
/* dIn: داده‌ی آماده (مثلاً تست بازار) به جای پوزیشن */
function sheetShare(p,dIn){
  const d=dIn||shareDataOf(p);
  openSheet(
   '<h3>تصویر نتیجه · '+esc(d.ticker||'')+'</h3>'+
   '<div class="sub">یک تصویر آماده برای فرستادن. فقط همین اعداد رویش می‌رود — '+
   'مانده‌ی حساب و بقیه‌ی پوزیشن‌هایت هیچ‌جای تصویر نیست.</div>'+
   '<div class="shprev"><img id="shImg" alt="پیش‌نمایش کارت"></div>'+
   '<div class="shopts">'+
     '<label class="shopt"><input type="checkbox" id="o_amt"><span>نمایش مبلغ سود/ضرر</span></label>'+
     '<label class="shopt"><input type="checkbox" id="o_ch"><span>نوشتن نام کانال</span></label>'+
     shTextsHtml(true,true)+
   '</div>'+
   '<div class="mkt" id="shRatio" style="margin:10px 0"></div>'+
   '<div class="srow"><button class="btn pri" id="ok">'+ic('share')+'<span>اشتراک‌گذاری</span></button>'+
   '<button class="btn" id="dlb">'+ic('down')+'<span>ذخیره</span></button>'+
   '<button class="btn" id="cx">بستن</button></div>',
   ()=>{
     let cv=null;
     const paint=()=>{
       cv=drawShareCard(d,shareOpt);
       $('#shImg').src=cv.toDataURL('image/png');
       const rb=$('#shRatio');rb.innerHTML='';
       for(const [k,lab] of [['45','4:5 — استوری و پست'],['11','مربع']]){
         const b=el('button','mktb'+(shareOpt.ratio===k?' on':''),lab);
         b.setAttribute('aria-pressed',shareOpt.ratio===k?'true':'false');
         b.onclick=()=>{shareOpt.ratio=k;shareSave();paint();};
         rb.appendChild(b);
       }
     };
     $('#o_amt').checked=shareOpt.amount;
     $('#o_ch').checked=shareOpt.channel;
     $('#o_amt').onchange=()=>{shareOpt.amount=$('#o_amt').checked;shareSave();paint();};
     $('#o_ch').onchange=()=>{shareOpt.channel=$('#o_ch').checked;shareSave();paint();};
     shTextsWire(paint,d);
     paint();
     // فونت وزیرمتن اگر هنوز نیامده، بعد از رسیدنش تصویر را دوباره بکش
     if(document.fonts&&document.fonts.load)document.fonts.load("900 40px 'Vazirmatn'").then(()=>{if($('#shImg'))paint();}).catch(()=>{});
     const name=()=>'signal-'+(d.ticker||'x')+'-'+new Date().toISOString().slice(0,10);
     $('#ok').onclick=async()=>{
       const r=await busyRun(()=>shareOrSave(cv,name()));
       if(r==='save')toast('تصویر ذخیره شد — از گالری بفرستش','ok');
       else if(r==='share')closeSheet();
     };
     $('#dlb').onclick=async()=>{
       const blob=await busyRun(()=>canvasBlob(cv));if(!blob)return;
       const url=URL.createObjectURL(blob);
       const a=document.createElement('a');a.href=url;a.download=name()+'.png';
       document.body.appendChild(a);a.click();a.remove();
       setTimeout(()=>URL.revokeObjectURL(url),4000);
       toast('تصویر ذخیره شد','ok');
     };
     $('#cx').onclick=closeSheet;
   });
}

