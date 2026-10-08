/* ==================== خروجی آموزش (PNG و PDF) ==================== */
/* یک درس کامل برای فرستادن یا نگه داشتن: عکس(های) خودِ پست، متن کانال، تحلیل و قدم‌ها،
   با سربرگ (لوگو و نام) و پاورقی (کپی‌رایت) که هر دو قابل انتخاب و ویرایش‌اند.
   همه‌چیز روی کانواس کشیده می‌شود (فونت وزیرمتن)، پس روی هر گوشی یک‌شکل است.
   PDF را خودمان می‌سازیم: هر صفحه یک تصویر JPEG در اندازه‌ی A4 — بدون کتابخانه‌ی بیرونی.
   صفحه‌بندی بین سطرها و بخش‌ها انجام می‌شود، نه وسط یک سطر یا عکس. */
const LXKEY='signaldesk.lexp.v1';
let lxOpt=Object.assign({theme:'dark',head:true,foot:true,footLogo:true,logo:'app',logoData:'',
  txt:true,ana:true,brand:'',sub:'',copy:''},lsGet(LXKEY)||{});
const lxSave=()=>lsSet(LXKEY,lxOpt);
const lxBrand=()=>(lxOpt.brand||'').trim()||shBrand();
const lxSub=()=>(lxOpt.sub||'').trim()||shChan();
const lxCopy=()=>(lxOpt.copy||'').trim()||('© '+new Date().getFullYear()+' '+shChan()+' — فقط آموزشی، توصیه‌ی مالی نیست');
const lxRtlTx=s=>lxRtl(s)?lxIso(s):s;     // متن فارسیِ دارای لاتین/عدد برای کشیدن راست‌به‌چپ
const LX_T={
  dark:{bg:'#0D0E12',card:'#16181D',card2:'#1C1E25',line:'#2A2E38',tx:'#E9EBF0',tx2:'#B4B9C4',tx3:'#7C8290',
    gold:'#D9A441',goldL:'#F0C67C',wbg:'#2A2213',wtx:'#F0C67C',up:'#46C08A',dn:'#E0636E'},
  light:{bg:'#FFFFFF',card:'#F6F3EC',card2:'#EEE8DB',line:'#E2DBCB',tx:'#1B1D22',tx2:'#3E434D',tx3:'#7A7F8A',
    gold:'#A8741F',goldL:'#C8902F',wbg:'#FFF3D9',wtx:'#7A4F08',up:'#1E8E5A',dn:'#C23B47'}};
const LXW=1080, LXP=64, LXHH=150, LXFH=104;
const lxFont=(s,w)=>(w||500)+' '+s+'px '+SHARE_FONT;
/* بازه‌ی عددی («2.7–2.8») و نماد لاتین وسط جمله‌ی فارسی در الگوریتم دوجهته برعکس می‌شود
   («2.8–2.7»). در برنامه با <i dir=ltr> حل شده؛ روی کانواس با جداساز LRI…PDI همان کار را می‌کنیم. */
const LRI='\u2066', PDI='\u2069';
const lxIso=s=>String(s).replace(/[$@A-Za-z0-9][\w@.,:/%+\-–—~×$]*(?:\s*[–—\-~]\s*[\w@.,:/%+$]+)*/g,m=>{if(/[\u0600-\u06FF]/.test(m))return m;
  const t=m.match(/[.,:]+$/);const core=t?m.slice(0,-t[0].length):m;   // نقطه‌ی آخر جمله بیرون از جداساز
  return core?LRI+core+PDI+(t?t[0]:''):m;});
const lxPlain=h=>{const d=document.createElement('div');d.innerHTML=String(h||'').replace(/<br\s*\/?>/gi,'\n');
  return d.textContent.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();};
const lxTxt=h=>lxIso(faN(lxPlain(h)));
const lxRtl=s=>/[؀-ۿ]/.test(s);
function lxWrap(c,txt,maxW){
  const out=[];
  for(const para of String(txt||'').split('\n')){
    const words=para.split(/\s+/).filter(Boolean);
    if(!words.length){out.push('');continue;}
    let line='';
    for(let w of words){
      // کلمه‌ی خیلی بلند (مثل لینک) را حرف‌به‌حرف می‌شکنیم تا از کادر بیرون نزند
      while(c.measureText(w).width>maxW&&w.length>1){
        let k=w.length;while(k>1&&c.measureText(w.slice(0,k)).width>maxW)k--;
        if(line){out.push(line);line='';}
        out.push(w.slice(0,k));w=w.slice(k);
      }
      const t=line?line+' '+w:w;
      if(!line||c.measureText(t).width<=maxW)line=t;else{out.push(line);line=w;}
    }
    if(line)out.push(line);
  }
  return out;
}
/* تصویرِ پست از CDN تلگرام می‌آید و بدون اجازه‌ی CORS کانواس را «آلوده» می‌کند (دیگر نمی‌شود
   ذخیره‌اش کرد). پس خودِ فایل را می‌گیریم — مستقیم، بعد از واسط خودت، بعد واسط‌های عمومی —
   و از روی داده‌ی محلی می‌کشیم. */
const LXIMG=new Map();
async function lxLoadImg(url){
  if(!url)return null;
  if(LXIMG.has(url))return LXIMG.get(url);
  const toImg=blob=>new Promise(res=>{const u=URL.createObjectURL(blob),im=new Image();
    im.onload=()=>res(im);im.onerror=()=>{URL.revokeObjectURL(u);res(null);};im.src=u;});
  let img=null;
  if(/^data:/.test(url)){img=await new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=url;});}
  else for(const r of allRoutes().filter(r=>!r.unwrap)){
    try{
      const ctrl=new AbortController(), t=setTimeout(()=>ctrl.abort(),15000);
      const res=await fetch(r.build(url),{signal:ctrl.signal});clearTimeout(t);
      if(!res.ok)continue;
      const b=await res.blob();
      if(b.size<200||(b.type&&!/^image\/|octet-stream/.test(b.type)))continue;   // صفحه‌ی خطای واسط، نه عکس
      img=await toImg(b.type?b:new Blob([b],{type:'image/jpeg'}));
      if(img){logIt('ok','تصویر آموزش آمد',{route:r.name});break;}
    }catch(e){}
  }
  LXIMG.set(url,img);
  return img;
}
/* محتوای درس به صورت فهرستی از «قطعه»ها با ارتفاع معلوم. keep یعنی از بعدی جدا نشود. */
function lxItems(src,T,maxImgH){
  const W=LXW, P=LXP, CW=W-2*P, R=W-P, items=[];
  const mc=document.createElement('canvas').getContext('2d');
  const para=(txt,{size=30,weight=500,color=T.tx,lh=1.72,indent=0,gap=12,first=null,keep=false}={})=>{
    mc.font=lxFont(size,weight);
    const lines=lxWrap(mc,txt,CW-indent);
    lines.forEach((ln,i)=>items.push({h:Math.round(size*lh)+(i===lines.length-1?gap:0),keep:keep&&i===0,
      draw:(c,y)=>{
        if(i===0&&first)first(c,y);
        c.font=lxFont(size,weight);c.fillStyle=color;c.textBaseline='alphabetic';
        c.direction=lxRtl(ln)?'rtl':'ltr';c.textAlign='right';
        c.fillText(ln,R-indent,y+Math.round(size*1.22));
      }}));
  };
  const head=(txt)=>items.push({h:86,keep:true,draw:(c,y)=>{
    c.fillStyle=T.gold;rr(c,R-8,y+26,8,40,4);c.fill();
    c.font=lxFont(34,900);c.fillStyle=T.gold;c.direction='rtl';c.textAlign='right';c.textBaseline='alphabetic';
    c.fillText(txt,R-24,y+60);
    c.fillStyle=T.line;c.fillRect(P,y+80,CW-40,2);
  }});
  const gap=h=>items.push({h,draw:()=>{}});
  const box=(txt,{bg=T.wbg,color=T.wtx,size=28,weight=700,label=''}={})=>{
    mc.font=lxFont(size,weight);
    const lines=lxWrap(mc,(label?label+' ':'')+txt,CW-56);
    const lh=Math.round(size*1.7), h=lines.length*lh+44;
    items.push({h:h+20,draw:(c,y)=>{
      c.fillStyle=bg;rr(c,P,y,CW,h,24);c.fill();
      c.fillStyle=color;rr(c,R-8,y+18,6,h-36,3);c.fill();
      c.font=lxFont(size,weight);c.fillStyle=color;c.direction='rtl';c.textAlign='right';
      lines.forEach((ln,i)=>c.fillText(ln,R-30,y+22+i*lh+Math.round(size*1.22)));
    }});
  };

  // ── عنوان ──
  para(lxRtlTx(src.title||'آموزش'),{size:50,weight:900,color:T.tx,lh:1.5,gap:4});
  if(src.meta)para(src.meta,{size:26,weight:700,color:T.tx3,gap:24});
  // ── عکس(های) پست ──
  for(const im of src.imgs||[]){
    if(!im){
      items.push({h:120,draw:(c,y)=>{c.fillStyle=T.card;rr(c,P,y,CW,100,22);c.fill();
        c.font=lxFont(26,700);c.fillStyle=T.tx3;c.direction='rtl';c.textAlign='center';
        c.fillText('تصویر این پست گرفته نشد — در تلگرام ببین',W/2,y+60);}});
      continue;
    }
    const iw=im.naturalWidth||im.width, ih=im.naturalHeight||im.height;
    let dw=CW, dh=Math.round(CW*ih/iw);
    if(maxImgH&&dh>maxImgH){dh=maxImgH;dw=Math.round(dh*iw/ih);}
    items.push({h:dh+28,draw:(c,y)=>{
      const x=P+(CW-dw)/2;
      c.save();rr(c,x,y,dw,dh,22);c.clip();c.drawImage(im,x,y,dw,dh);c.restore();
      c.strokeStyle=T.line;c.lineWidth=2;rr(c,x,y,dw,dh,22);c.stroke();
    }});
  }
  // ── متن خود پست ──
  if(src.text){head('متن آموزش');para(src.text,{size:30,color:T.tx2,gap:20});}
  // ── تحلیل ──
  const N=src.note;
  if(N){
    head('تحلیل و آموزش قدم‌به‌قدم');
    if(N.sum)para(lxTxt(N.sum),{size:32,weight:800,color:T.tx,gap:18});
    if(N.pic&&N.pic.length){
      head('تحلیل تصویر');
      for(const x of N.pic)para(lxTxt(x),{indent:40,gap:14,first:(c,y)=>{c.fillStyle=T.gold;c.beginPath();c.arc(R-12,y+27,7,0,7);c.fill();}});
    }
    if(N.plan){
      head('نقشه‌ی معامله');
      const pl=N.plan, ent=Array.isArray(pl.entry)?pl.entry.join(' – '):pl.entry;
      const rows=[['جفت ارز',pl.pair],['جهت',pl.side==='short'?'شورت':'لانگ'],['ورود',ent],['حد ضرر',pl.sl],
        ['اهداف',(pl.tps||[]).join('  ·  ')],['تایم‌فریم',pl.tf]].filter(r=>r[1]!=null&&r[1]!=='');
      for(const [k,v] of rows)items.push({h:58,draw:(c,y)=>{
        c.fillStyle=T.card;rr(c,P,y,CW,50,14);c.fill();
        c.font=lxFont(27,700);c.fillStyle=T.tx3;c.direction='rtl';c.textAlign='right';c.fillText(k,R-22,y+35);
        c.font=lxFont(28,900);c.fillStyle=k==='جهت'?(pl.side==='short'?T.dn:T.up):k==='حد ضرر'?T.dn:k==='اهداف'?T.up:T.tx;
        const vs=faN(String(v));c.direction=lxRtl(vs)?'rtl':'ltr';c.textAlign='left';c.fillText(vs,P+22,y+35);
      }});
      gap(14);
    }
    if(N.cmp){
      head('مقایسه');
      const cols=[''].concat(N.cmp.h), cw=CW/cols.length;
      const row=(cells,hd)=>{
        mc.font=lxFont(25,hd?900:600);
        const L=cells.map(t=>lxWrap(mc,lxTxt(t),cw-28));
        const lh=42, h=Math.max(...L.map(l=>l.length))*lh+26;
        items.push({h,draw:(c,y)=>{
          c.fillStyle=hd?T.card2:T.card;c.fillRect(P,y,CW,h);
          c.fillStyle=T.line;c.fillRect(P,y+h-2,CW,2);
          L.forEach((ls,ci)=>{const xr=R-ci*cw-14;
            c.font=lxFont(25,hd||ci===0?900:600);c.fillStyle=hd?T.gold:(ci===0?T.tx:T.tx2);
            ls.forEach((ln,li)=>{c.direction=lxRtl(ln)?'rtl':'ltr';c.textAlign='right';c.fillText(ln,xr,y+44+li*lh);});});
        }});
      };
      row(cols,true);for(const r of N.cmp.rows)row(r,false);gap(18);
    }
    if(N.steps&&N.steps.length){
      head('قدم‌به‌قدم');
      N.steps.forEach((st,i)=>{
        para(lxTxt(st[0]),{size:31,weight:900,indent:66,gap:0,keep:true,first:(c,y)=>{
          c.fillStyle=T.gold;c.beginPath();c.arc(R-24,y+26,24,0,7);c.fill();
          c.font=lxFont(26,900);c.fillStyle=T.bg;c.direction='ltr';c.textAlign='center';c.fillText(String(i+1),R-24,y+36);}});
        para(lxTxt(st[1]),{size:29,color:T.tx2,indent:66,gap:18});
      });
    }
    if(N.rules&&N.rules.length){
      head('قانون‌های کلیدی');
      for(const x of N.rules)para(lxTxt(x),{indent:44,gap:12,first:(c,y)=>{
        c.strokeStyle=T.up;c.lineWidth=5;c.lineCap='round';c.beginPath();
        c.moveTo(R-28,y+27);c.lineTo(R-19,y+36);c.lineTo(R-4,y+17);c.stroke();}});
    }
    for(const x of (N.warn||[])){gap(6);box(lxTxt(x),{label:'⚠'});}
    if(N.app){gap(6);box(lxTxt(N.app),{bg:T.card,color:T.gold,label:'در برنامه‌ی میز سیگنال:'});}
  }
  return items;
}
function lxLogo(c,x,y,s,T,logoImg){
  if(lxOpt.logo==='none')return false;
  if(lxOpt.logo==='custom'&&logoImg){
    c.save();rr(c,x,y,s,s,s*0.22);c.clip();
    const iw=logoImg.naturalWidth||logoImg.width, ih=logoImg.naturalHeight||logoImg.height, k=Math.max(s/iw,s/ih);
    c.drawImage(logoImg,x+(s-iw*k)/2,y+(s-ih*k)/2,iw*k,ih*k);c.restore();return true;
  }
  c.fillStyle=lxOpt.theme==='light'?'#1B1D22':T.card2;rr(c,x,y,s,s,s*0.22);c.fill();
  drawMark(c,x+s*0.06,y+s*0.06,s*0.88);return true;
}
function lxHead(c,T,logoImg){
  const W=LXW,P=LXP,R=W-P;
  c.fillStyle=T.card;c.fillRect(0,0,W,LXHH);
  const g=c.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,T.gold);g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.fillRect(0,LXHH-3,W,3);
  const has=lxLogo(c,R-88,31,88,T,logoImg);
  const tx=has?R-110:R;
  c.font=lxFont(40,900);c.fillStyle=T.gold;c.direction='rtl';c.textAlign='right';c.textBaseline='alphabetic';
  c.fillText(lxRtlTx(lxBrand()),tx,72);
  const sub=lxRtlTx(lxSub());c.font=lxFont(26,700);c.fillStyle=T.tx3;c.direction=lxRtl(sub)?'rtl':'ltr';c.textAlign='right';
  c.fillText(sub,tx,114);
}
function lxFoot(c,T,H,logoImg,pg){
  const W=LXW,P=LXP,R=W-P,y=H-LXFH;
  c.fillStyle=T.line;c.fillRect(P,y,W-2*P,2);
  let left=P;
  if(lxOpt.footLogo&&lxLogo(c,P,y+26,52,T,logoImg))left=P+68;
  if(pg){c.font=lxFont(24,800);c.fillStyle=T.tx3;c.direction='ltr';c.textAlign='left';c.fillText(pg,left,y+62);left+=c.measureText(pg).width+24;}
  const t=lxRtlTx(lxCopy());c.font=lxFont(24,600);c.fillStyle=T.tx3;c.direction=lxRtl(t)?'rtl':'ltr';c.textAlign='right';
  let s=t;while(s.length>4&&c.measureText(s).width>R-left-10)s=s.slice(0,-2);
  c.fillText(s===t?t:s+'…',R,y+62);
}
async function lxSource(L,n,title,idx){
  const urls=L?(L.imgs&&L.imgs.length?L.imgs:(L.img?[L.img]:[])):[];
  const imgs=await Promise.all(urls.map(lxLoadImg));
  const note=n!=null?noteOf(n):null, list=n!=null?guideList():null, tx=lessonText(L,n);
  return {title:lessonTitleOf(L,n,title),imgs,
    meta:n!=null?(GUIDE_CAT+' · درس '+idx+' از '+list.length):(L&&L.cat?L.cat:''),
    text:lxOpt.txt&&tx?lxRtlTx(faN(tx)):'',note:lxOpt.ana?note:null};
}
/* ---- ویرایش متن آموزش‌ها ----
   متنِ کانال و تحلیلِ آماده دست نمی‌خورند؛ ویرایش تو جدا نگه داشته می‌شود و روی هر دو
   (نمایش در برنامه و خروجی PDF/PNG) می‌نشیند. «بازگرداندن» یعنی پاک کردن همین لایه. */
const leKey=(L,n)=>n!=null?'g'+n:(L?L.id:'');
const leOf=(L,n)=>DB.ledit[leKey(L,n)]||null;
const lessonTitleOf=(L,n,t)=>{const E=leOf(L,n);return E&&E.title!=null?E.title:t;};
const lessonText=(L,n)=>{const E=leOf(L,n);return E&&E.text!=null?E.text:(L?L.text||'':'');};
/* متن ساده ← HTML نمایش: عددها مثل تحلیل‌های اصلی داخل <i> (چپ‌به‌راست و پررنگ) */
const le2html=s=>esc(String(s||'').replace(/[$@A-Za-z0-9][\w@.,:/%+\-–—~×$]*(?:\s*[–—\-~]\s*[\w@.,:/%+$]+)*/g,
  m=>/\d/.test(m)?'\u0001'+m.replace(/[.,:]+$/,'')+'\u0002'+(m.match(/[.,:]+$/)||[''])[0]:m))
  .replace(/\u0001/g,'<i>').replace(/\u0002/g,'</i>').replace(/\n/g,'<br>');
function noteOf(n){
  const N=GUIDE_NOTES[n], E=DB.ledit['g'+n];
  if(!N||!E)return N||null;
  const o=Object.assign({},N);
  if(E.sum!=null)o.sum=le2html(E.sum);
  if(E.pic)o.pic=E.pic.map(le2html);
  if(E.steps)o.steps=E.steps.map(([t,d])=>[le2html(t),le2html(d)]);
  if(E.rules)o.rules=E.rules.map(le2html);
  if(E.warn)o.warn=E.warn.map(le2html);
  if(E.app!=null)o.app=le2html(E.app);
  return o;
}
function sheetLessonText(L,n,title,idx,after){
  const N=n!=null?GUIDE_NOTES[n]:null, key=leKey(L,n), E=DB.ledit[key]||{};
  const P=lxPlain;
  // عنوان اصلی از فهرست کانال (نه عنوانی که شاید قبلاً ویرایش شده و به اینجا رسیده)
  const t0=n!=null?((guideList().find(x=>x[0]===n)||[])[1]||title):((L&&L.title)||title);
  const orig={title:t0,text:L?L.text||'':'',
    sum:N&&N.sum?P(N.sum):'',pic:N&&N.pic?N.pic.map(P).join('\n'):'',
    steps:N&&N.steps?N.steps.map(([t,d])=>P(t)+'\n'+P(d)).join('\n\n'):'',
    rules:N&&N.rules?N.rules.map(P).join('\n'):'',warn:N&&N.warn?N.warn.map(P).join('\n'):'',app:N&&N.app?P(N.app):''};
  const cur={title:E.title!=null?E.title:orig.title,text:E.text!=null?E.text:orig.text,
    sum:E.sum!=null?E.sum:orig.sum,pic:E.pic?E.pic.join('\n'):orig.pic,
    steps:E.steps?E.steps.map(([t,d])=>t+'\n'+d).join('\n\n'):orig.steps,
    rules:E.rules?E.rules.join('\n'):orig.rules,warn:E.warn?E.warn.join('\n'):orig.warn,app:E.app!=null?E.app:orig.app};
  const ta=(id,label,hint,rows)=>'<div class="fld lefld"><label>'+label+(hint?' <small>'+hint+'</small>':'')+'</label>'+
    '<textarea id="le_'+id+'" rows="'+(rows||4)+'" dir="auto">'+esc(cur[id])+'</textarea></div>';
  openSheet('<h3>'+ic('edit')+'ویرایش متن آموزش</h3>'+
    '<div class="sub">متن‌ها را قبل از ساختن PDF/PNG درست کن. تغییرها در خود برنامه هم دیده می‌شوند و '+
    'متن اصلی کانال و تحلیل آماده دست نمی‌خورند؛ هر وقت خواستی برشان گردان.</div>'+
    '<div class="fld lefld"><label>عنوان</label><input id="le_title" dir="auto" value="'+esc(cur.title)+'"></div>'+
    ta('text','متن پست','',5)+
    (N?ta('sum','خلاصه','',2)+
      (N.pic?ta('pic','تحلیل تصویر','هر خط یک مورد',5):'')+
      (N.steps?ta('steps','قدم‌به‌قدم','خط اول عنوان قدم، خط بعد توضیح؛ بین قدم‌ها یک خط خالی',10):'')+
      (N.rules?ta('rules','قانون‌های کلیدی','هر خط یک قانون',4):'')+
      (N.warn?ta('warn','هشدارها','هر خط یک هشدار',3):'')+
      (N.app?ta('app','در همین برنامه','',2):''):'')+
    (N&&(N.plan||N.cmp)?'<div class="hint">نقشه‌ی معامله و جدول مقایسه عدد و ساختارند و همان‌طور می‌مانند.</div>':'')+
    '<div class="srow"><button class="btn pri" id="leOk">'+ic('check')+'<span>ذخیره</span></button>'+
    '<button class="btn" id="leReset">'+ic('undo')+'<span>متن اصلی</span></button>'+
    '<button class="btn" id="cx">انصراف</button></div>',
  ()=>{
    const back=()=>{if(after)after();else closeSheet();};
    $('#cx').onclick=back;
    $('#leReset').onclick=async()=>{
      if(!DB.ledit[key])return toast('متن همین حالا اصلی است','info');
      if(!(await askConfirm({title:'برگرداندن متن اصلی',tone:'danger',msg:'همه‌ی ویرایش‌های این آموزش پاک می‌شود و متن اصلی برمی‌گردد.',ok:'پاک کن و برگردان',cancel:'نه'})))return;
      delete DB.ledit[key];save();renderLessons();toast('متن اصلی برگشت','ok');back();
    };
    $('#leOk').onclick=()=>{
      const v=id=>{const x=$('#le_'+id);return x?x.value.replace(/\r/g,'').trim():null;};
      const lines=t=>t.split('\n').map(x=>x.trim()).filter(Boolean);
      const out={};
      const t=v('title');if(t&&t!==orig.title)out.title=t;
      const tx=v('text');if(tx!=null&&tx!==orig.text.trim())out.text=tx;
      if(N){
        const sm=v('sum');if(sm!=null&&sm!==orig.sum)out.sum=sm;
        const ap=v('app');if(ap!=null&&ap!==orig.app)out.app=ap;
        for(const k of ['pic','rules','warn']){const x=v(k);if(x!=null&&x!==orig[k])out[k]=lines(x);}
        const st=v('steps');
        if(st!=null&&st!==orig.steps)out.steps=st.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean)
          .map(b=>{const ls=b.split('\n');return [ls[0].trim(),ls.slice(1).join(' ').trim()];});
      }
      if(Object.keys(out).length)DB.ledit[key]=out;else delete DB.ledit[key];
      save();renderLessons();toast('ویرایش ذخیره شد','ok');back();
    };
  });
}
function lxCanvas(W,H){const cv=document.createElement('canvas');cv.width=W;cv.height=H;return cv;}
function lxPng(src,logoImg){
  const T=LX_T[lxOpt.theme]||LX_T.dark;
  const items=lxItems(src,T,0);
  const top=(lxOpt.head?LXHH:0)+48, bot=(lxOpt.foot?LXFH:0)+40;
  const H=top+items.reduce((a,b)=>a+b.h,0)+bot;
  const s=Math.min(1,16000/H);          // سقف ارتفاع کانواس در مرورگرهای گوشی
  const cv=lxCanvas(Math.round(LXW*s),Math.round(H*s)), c=cv.getContext('2d');
  c.scale(s,s);
  c.fillStyle=T.bg;c.fillRect(0,0,LXW,H);
  if(lxOpt.head)lxHead(c,T,logoImg);
  let y=top;for(const it of items){it.draw(c,y);y+=it.h;}
  if(lxOpt.foot)lxFoot(c,T,H,logoImg,'');
  return cv;
}
const LXPH=Math.round(LXW*Math.SQRT2);   // صفحه‌ی A4
function lxPages(src,logoImg){
  const T=LX_T[lxOpt.theme]||LX_T.dark;
  const top=(lxOpt.head?LXHH:0)+44, bot=LXPH-(lxOpt.foot?LXFH:0)-30, room=bot-top;
  const items=lxItems(src,T,room-40);
  const pages=[[]];let y=0;
  items.forEach((it,i)=>{
    // عنوان بخش (و عنوان هر قدم) تنها ته صفحه نماند: کل زنجیره‌ی keep به‌علاوه‌ی یک سطر بعد
    let need=it.h, j=i;
    while(items[j]&&items[j].keep&&items[j+1]){j++;need+=items[j].h;}
    if(y>0&&y+need>room){pages.push([]);y=0;}
    if(y===0&&it.h<=20&&pages[pages.length-1].length===0)return;   // فاصله‌ی خالی سر صفحه
    pages[pages.length-1].push(it);y+=it.h;
  });
  return pages.map((pg,i)=>{
    const cv=lxCanvas(LXW,LXPH), c=cv.getContext('2d');
    c.fillStyle=T.bg;c.fillRect(0,0,LXW,LXPH);
    if(lxOpt.head)lxHead(c,T,logoImg);
    let y2=top;for(const it of pg){it.draw(c,y2);y2+=it.h;}
    if(lxOpt.foot)lxFoot(c,T,LXPH,logoImg,(i+1)+' / '+pages.length);
    return cv;
  });
}
/* PDF کمینه: کاتالوگ، درخت صفحه‌ها، و برای هر صفحه یک تصویر JPEG تمام‌صفحه */
async function lxPdf(canvases){
  const enc=new TextEncoder(), parts=[], offs=[];let off=0;
  const push=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);off+=b.length;};
  const jpg=await Promise.all(canvases.map(cv=>new Promise(r=>cv.toBlob(b=>r(b),'image/jpeg',0.9))
    .then(b=>b.arrayBuffer()).then(a=>new Uint8Array(a))));
  push('%PDF-1.4\n%âãÏÓ\n');
  const obj=(id,body)=>{offs[id]=off;push(id+' 0 obj\n'+body+'\nendobj\n');};
  const n=canvases.length;
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids ['+canvases.map((_,i)=>(3+3*i)+' 0 R').join(' ')+'] /Count '+n+' >>');
  canvases.forEach((cv,i)=>{
    const PW=595.28, PH=+(PW*cv.height/cv.width).toFixed(2);
    obj(3+3*i,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PW+' '+PH+'] /Resources << /XObject << /Im'+i+' '+(5+3*i)+
      ' 0 R >> >> /Contents '+(4+3*i)+' 0 R >>');
    const cs='q '+PW+' 0 0 '+PH+' 0 0 cm /Im'+i+' Do Q';
    obj(4+3*i,'<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream');
    offs[5+3*i]=off;
    push((5+3*i)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+cv.width+' /Height '+cv.height+
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg[i].length+' >>\nstream\n');
    push(jpg[i]);push('\nendstream\nendobj\n');
  });
  const xref=off, total=3+3*n;
  let x='xref\n0 '+total+'\n0000000000 65535 f \n';
  for(let id=1;id<total;id++)x+=String(offs[id]).padStart(10,'0')+' 00000 n \n';
  push(x+'trailer\n<< /Size '+total+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
  return new Blob(parts,{type:'application/pdf'});
}
async function lxDeliver(blob,name,share){
  const file=new File([blob],name,{type:blob.type});
  if(share){
    try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file]});return 'share';}}
    catch(e){if(e&&e.name==='AbortError')return 'cancel';}
  }
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),6000);
  return 'save';
}
function sheetLessonExport(L,n,title,idx){
  openSheet(
   '<h3>'+ic('share')+'خروجی آموزش</h3>'+
   '<div class="sub">'+esc(lessonTitleOf(L,n,title))+' — عکس پست، متن و تحلیل، با لوگو و کپی‌رایت دلخواه. '+
   'PNG یک تصویر بلند است؛ PDF صفحه‌بندی A4 دارد.</div>'+
   '<button class="btn lxedit" id="lxEdit">'+ic('edit')+'<span>ویرایش متن'+(leOf(L,n)?' <i class="pill gold">ویرایش‌شده</i>':'')+'</span></button>'+
   '<div class="lxprev" id="lxPrev"><div class="hint">در حال ساختن پیش‌نمایش…</div></div>'+
   '<div class="mkt" id="lxTheme"></div>'+
   '<div class="shopts">'+
     '<label class="shopt"><input type="checkbox" id="lx_head"><span>سربرگ: لوگو و نام</span></label>'+
     '<label class="shopt"><input type="checkbox" id="lx_foot"><span>پاورقی: کپی‌رایت</span></label>'+
     '<label class="shopt"><input type="checkbox" id="lx_fl"><span>لوگو در پاورقی هم باشد</span></label>'+
     '<label class="shopt"><input type="checkbox" id="lx_txt"><span>متن پست کانال</span></label>'+
     (n!=null&&GUIDE_NOTES[n]?'<label class="shopt"><input type="checkbox" id="lx_ana"><span>تحلیل و آموزش قدم‌به‌قدم</span></label>':'')+
   '</div>'+
   '<div class="lxlab">لوگو</div><div class="mkt" id="lxLogo"></div>'+
   '<input type="file" id="lxFile" accept="image/*" class="hide">'+
   '<details class="sec sub2 shtx" open><summary>'+ic('edit')+'متن سربرگ و کپی‌رایت</summary><div class="grid">'+
     '<div class="fld"><label>نام بالای صفحه</label><input id="lx_brand" placeholder="'+esc(shBrand())+'"></div>'+
     '<div class="fld"><label>زیر نام (کانال یا شعار)</label><input id="lx_sub" dir="auto" placeholder="'+esc(shChan())+'"></div>'+
     '<div class="fld"><label>متن کپی‌رایت پایین</label><input id="lx_copy" dir="auto" placeholder="'+esc(lxCopy())+'"></div>'+
   '</div><div class="hint">خالی بگذاری، متن پیش‌فرض می‌آید. انتخاب‌ها برای خروجی‌های بعدی هم یادش می‌ماند.</div></details>'+
   '<div class="lxbtns">'+
     '<button class="btn pri" id="lxSPdf">'+ic('share')+'<span>ارسال PDF</span></button>'+
     '<button class="btn pri" id="lxSPng">'+ic('share')+'<span>ارسال PNG</span></button>'+
     '<button class="btn" id="lxDPdf">'+ic('down')+'<span>دانلود PDF</span></button>'+
     '<button class="btn" id="lxDPng">'+ic('down')+'<span>دانلود PNG</span></button>'+
   '</div>'+
   '<div class="srow"><button class="btn" id="cx">بستن</button></div>',
  async()=>{
    let src=null, logoImg=null, pv=null, tm=null, gen=0;
    const fname=ext=>'lesson-'+(n!=null?n:(L&&L.num)||'x')+'-'+new Date().toISOString().slice(0,10)+'.'+ext;
    const loadLogo=async()=>{logoImg=lxOpt.logo==='custom'&&lxOpt.logoData?await lxLoadImg(lxOpt.logoData):null;};
    const paint=async()=>{
      const my=++gen;
      if(!src)src=await lxSource(L,n,title,idx);
      if(my!==gen||!$('#lxPrev'))return;
      const cv=lxPng(src,logoImg);
      const b=await canvasBlob(cv);if(my!==gen||!b||!$('#lxPrev'))return;
      if(pv)URL.revokeObjectURL(pv);pv=URL.createObjectURL(b);
      $('#lxPrev').innerHTML='<img alt="پیش‌نمایش خروجی" src="'+pv+'">';
    };
    const later=(fresh)=>{if(fresh)src=null;clearTimeout(tm);tm=setTimeout(paint,250);};
    const chips=(id,opts,key,after)=>{const box=$('#'+id);box.innerHTML='';
      for(const [k,lab] of opts){const b=el('button','mktb'+(lxOpt[key]===k?' on':''),lab);
        b.setAttribute('aria-pressed',lxOpt[key]===k?'true':'false');
        b.onclick=async()=>{if(after&&await after(k)===false)return;lxOpt[key]=k;lxSave();chips(id,opts,key,after);await loadLogo();later();};
        box.appendChild(b);}};
    chips('lxTheme',[['dark','تیره'],['light','روشن (برای چاپ)']],'theme');
    chips('lxLogo',[['app','لوگوی برنامه'],['custom',lxOpt.logoData?'لوگوی من':'لوگوی من…'],['none','بدون لوگو']],'logo',async k=>{
      if(k==='custom'&&!lxOpt.logoData){$('#lxFile').click();return false;}
      return true;});
    // لوگوی خودت: کوچک می‌شود (256 پیکسل) و روی همین دستگاه می‌ماند
    $('#lxFile').onchange=async e=>{
      const f=e.target.files&&e.target.files[0];if(!f)return;
      const im=await new Promise(res=>{const u=URL.createObjectURL(f),x=new Image();x.onload=()=>res(x);x.onerror=()=>res(null);x.src=u;});
      if(!im)return toast('این فایل تصویر نیست','err');
      const s=256,cv=lxCanvas(s,s),c=cv.getContext('2d'),k=Math.max(s/im.naturalWidth,s/im.naturalHeight);
      c.drawImage(im,(s-im.naturalWidth*k)/2,(s-im.naturalHeight*k)/2,im.naturalWidth*k,im.naturalHeight*k);
      lxOpt.logoData=cv.toDataURL('image/png');lxOpt.logo='custom';lxSave();
      chips('lxLogo',[['app','لوگوی برنامه'],['custom','لوگوی من'],['none','بدون لوگو']],'logo',async()=>true);
      await loadLogo();later();toast('لوگو گذاشته شد','ok');
    };
    for(const [id,key,fresh] of [['lx_head','head'],['lx_foot','foot'],['lx_fl','footLogo'],['lx_txt','txt',1],['lx_ana','ana',1]]){
      const i=$('#'+id);if(!i)continue;i.checked=lxOpt[key]!==false;
      i.onchange=()=>{lxOpt[key]=i.checked;lxSave();later(!!fresh);};
    }
    for(const [id,key] of [['lx_brand','brand'],['lx_sub','sub'],['lx_copy','copy']]){
      const i=$('#'+id);i.value=lxOpt[key]||'';i.oninput=()=>{lxOpt[key]=i.value;lxSave();later();};
    }
    const run=async(btn,kind,share)=>{
      btnBusy(btn,true,'در حال ساختن');
      try{
        if(!src)src=await lxSource(L,n,title,idx);
        const blob=kind==='pdf'?await lxPdf(lxPages(src,logoImg)):await canvasBlob(lxPng(src,logoImg));
        if(!blob)throw new Error('blob');
        const r=await lxDeliver(blob,fname(kind),share);
        if(r==='save')toast(kind==='pdf'?'PDF ذخیره شد':'تصویر ذخیره شد','ok');
      }catch(e){toast('ساخت فایل نشد'+(e&&e.name==='SecurityError'?' — تصویر پست از مسیر امن نیامد':''),'err');logIt('err','خروجی آموزش: '+(e&&e.message||e));}
      finally{btnBusy(btn,false);}
    };
    // بعد از ذخیره‌ی متن، همین ورق با پیش‌نمایش تازه برمی‌گردد
    $('#lxEdit').onclick=()=>sheetLessonText(L,n,title,idx,()=>sheetLessonExport(L,n,title,idx));
    $('#lxSPdf').onclick=e=>run(e.currentTarget,'pdf',true);
    $('#lxSPng').onclick=e=>run(e.currentTarget,'png',true);
    $('#lxDPdf').onclick=e=>run(e.currentTarget,'pdf',false);
    $('#lxDPng').onclick=e=>run(e.currentTarget,'png',false);
    $('#cx').onclick=closeSheet;
    await loadLogo();
    if(document.fonts&&document.fonts.load)await document.fonts.load("900 40px 'Vazirmatn'").catch(()=>{});
    paint();
  });
}


