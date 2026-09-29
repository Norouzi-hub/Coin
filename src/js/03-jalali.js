/* ==================== تقویم جلالی ==================== */
const TZ='Asia/Tehran', div_=(a,b)=>~~(a/b);
function jalCal(jy){
  const br=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  const bl=br.length, gy=jy+621; let leapJ=-14,jp=br[0],jm,jump=0,leap,n,i;
  if(jy<jp||jy>=br[bl-1])throw new Error('bad year');
  for(i=1;i<bl;i++){jm=br[i];jump=jm-jp;if(jy<jm)break;leapJ+=div_(jump,33)*8+div_(jump%33,4);jp=jm;}
  n=jy-jp; leapJ+=div_(n,33)*8+div_(n%33+3,4);
  if(jump%33===4&&jump-n===4)leapJ+=1;
  const leapG=div_(gy,4)-div_((div_(gy,100)+1)*3,4)-150, march=20+leapJ-leapG;
  if(jump-n<6)n=n-jump+div_(jump+4,33)*33;
  leap=((n+1)%33-1)%4; if(leap===-1)leap=4;
  return {leap,gy,march};
}
function g2d(gy,gm,gd){
  let d=div_((gy+div_(gm-8,6)+100100)*1461,4)+div_(153*((gm+9)%12)+2,5)+gd-34840408;
  return d-div_(div_(gy+100100+div_(gm-8,6),100)*3,4)+752;
}
function d2g(j){
  let x=4*j+139361631; x=x+div_(div_(4*j+183187720,146097)*3,4)*4-3908;
  const i=div_(x%1461,4)*5+308;
  return {gy:div_(x,1461)-100100+div_(8-(div_(i,153)%12+1),6),gm:div_(i,153)%12+1,gd:div_(i%153,5)+1};
}
function j2d(jy,jm,jd){const r=jalCal(jy);return g2d(r.gy,3,r.march)+(jm-1)*31-div_(jm,7)*(jm-7)+jd-1;}
function d2j(jdn){
  const gy=d2g(jdn).gy; let jy=gy-621;
  const r=jalCal(jy), f=g2d(gy,3,r.march); let k=jdn-f;
  if(k>=0){ if(k<=185)return {jy,jm:1+div_(k,31),jd:k%31+1}; k-=186; }
  else { jy-=1; k+=179; if(r.leap===1)k+=1; }
  return {jy,jm:7+div_(k,30),jd:k%30+1};
}
const isJLeap=jy=>jalCal(jy).leap===0;
const jMonthLen=(jy,jm)=>jm<=6?31:(jm<=11?30:(isJLeap(jy)?30:29));
const GF=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:TZ});
function jParts(d){const [y,m,dd]=GF.format(d).split('-').map(Number);return d2j(g2d(y,m,dd));}
function jKey(d){const p=jParts(d);return p.jy+'-'+String(p.jm).padStart(2,'0')+'-'+String(p.jd).padStart(2,'0');}
function jWeekday(jy,jm,jd){const g=d2g(j2d(jy,jm,jd));return (new Date(Date.UTC(g.gy,g.gm-1,g.gd)).getUTCDay()+1)%7;}
const J_M=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const J_D=['ش','ی','د','س','چ','پ','ج'];
const TF=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:TZ});
function jStamp(d){const p=jParts(d);return p.jy+'/'+String(p.jm).padStart(2,'0')+'/'+String(p.jd).padStart(2,'0')+' '+TF.format(d);}
/* تقویمِ نمایش از تنظیمات: j شمسی · g میلادی · jg هر دو. خروجی CSV همیشه شمسی می‌ماند (jStamp). */
const G_M=['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
const J_WD=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه'];
const calMode=()=>['j','g','jg'].includes(S.cal)?S.cal:'j';
const gParts=d=>{const [y,m,dd]=GF.format(d).split('-').map(Number);return {gy:y,gm:m,gd:dd};};
function gStamp(d){const g=gParts(d);return g.gy+'/'+String(g.gm).padStart(2,'0')+'/'+String(g.gd).padStart(2,'0');}
function jStampFa(d){
  const c=calMode();
  if(c==='g')return gStamp(d)+' '+TF.format(d);
  if(c==='jg')return jStamp(d)+' · '+gStamp(d);
  return jStamp(d);
}
function jShort(d){
  const p=jParts(d), g=gParts(d), c=calMode();
  const js=p.jd+' '+J_M[p.jm-1], gs=g.gd+' '+G_M[g.gm-1];
  return c==='g'?gs:c==='jg'?js+' ('+gs+')':js;
}
/* شماره‌ی روز (به وقت تهران) برای حساب «امروز / دیروز / چند روز پیش» */
const dayNo=d=>{const g=gParts(d);return Math.floor(Date.UTC(g.gy,g.gm-1,g.gd)/864e5);};
function dayLabel(d){
  const diff=dayNo(new Date())-dayNo(d), p=jParts(d);
  const wd=J_WD[jWeekday(p.jy,p.jm,p.jd)];
  const rel=diff<=0?'امروز':diff===1?'دیروز':diff+' روز پیش';
  return {rel,wd,date:jShort(d),diff};
}

