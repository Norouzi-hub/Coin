/* عامل‌های تازه‌ی رادار: شکار نقدینگی (اسپرینگ/آپ‌تراست وایکوف)، CPR روزانه و باریکی‌اش، RSI 4 ساعته، و پهنای بازار */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{const H=36e5,N=900,T0=Math.floor(Date.now()/864e5)*864e5-N*H;
   // رنج آرام حول 10 (سقف 10.1، کف 9.9) با نوسان کوچک؛ دو کندل آخر را هر حالت عوض می‌کند
   const base=()=>Array.from({length:N},(_,q)=>{const m=10+0.05*Math.sin(q/3);return {t:T0+q*H,o:m,h:Math.min(10.1,m+0.04),l:Math.max(9.9,m-0.04),c:m,v:100};});
   const at=(C)=>{const P=rdPrep(C,C,null,null);return rdParts(P,C.length-1);};
   const sp=base();sp[N-2]=Object.assign({},sp[N-2],{l:9.7,c:9.8,v:300});sp[N-1]=Object.assign({},sp[N-1],{o:9.8,l:9.78,h:10.02,c:10});
   const ut=base();ut[N-2]=Object.assign({},ut[N-2],{h:10.3,c:10.2,v:300});ut[N-1]=Object.assign({},ut[N-1],{o:10.2,h:10.22,l:9.98,c:10});
   const lo=base();lo[N-2]=Object.assign({},lo[N-2],{l:9.7,c:9.8,v:110});lo[N-1]=Object.assign({},lo[N-1],{o:9.8,l:9.78,h:10.02,c:10});
   const br=base();br[N-2]=Object.assign({},br[N-2],{l:9.7,c:9.75,v:300});br[N-1]=Object.assign({},br[N-1],{o:9.75,l:9.7,h:9.8,c:9.74});
   const a=at(sp),u=at(ut),l=at(lo),k=at(br),n=at(base());
   // CPR: با دست از روز کامل قبل
   const P=rdPrep(sp,sp,null,null),i=N-1,jd=P.dIdx.get(Math.floor((sp[i].t+H)/(24*H))*24*H-24*H),d=P.D[jd],pp=(d.h+d.l+d.c)/3,bc=(d.h+d.l)/2,tc=2*pp-bc;
   const top=Math.max(tc,bc),bot=Math.min(tc,bc),c=sp[i].c,atr=(P.pre[i+1]-P.pre[i-13])/14,want=c>top?Math.min(1,(c-top)/atr/2):c<bot?-Math.min(1,(bot-c)/atr/2):0;
   return {sp:a.p.swp,ut:u.p.swp,lo:l.p.swp,br:k.p.swp,no:n.p.swp,cpr:a.p.cpr,want,cprw:a.p.cprw,rsi4:a.p.rsi4,m4:a.m.rsi4,
     mss:(()=>{const mk=(up)=>{const C=Array.from({length:45},(_,q)=>({t:q*36e5,o:10,h:10.2,l:9.8,c:10}));
         if(up){C[20].h=12;C[30].h=11;C[39].c=11.2;C[40].c=11.3;C[39].h=11.4;C[40].h=11.4;}
         else{C[20].l=8;C[30].l=9;C[39].c=8.8;C[40].c=8.7;C[39].l=8.6;C[40].l=8.6;}return C;};
       const U=mk(true),D=mk(false),U2=mk(true);U2[30].h=12.5;        // سقف بالاتر: تغییر ساختار نیست
       const U3=mk(true);U3[40].c=10.9;                                // برگشت زیر سطح
       return [rdMss(U,40),rdMss(D,40),rdMss(U2,40),rdMss(U3,40)];})(),
     srsi:(()=>{const C=Array.from({length:400},(_,q)=>{const m=10+0.3*Math.sin(q/6);return {t:q*36e5,o:m,h:m+0.02,l:m-0.02,c:m,v:100};});
       const P=rdPrep(C,C,null,null),v=[];for(let i=250;i<399;i++){const r=rdParts(P,i);if(r)v.push(r.p.srsi);}
       // تقاطع از کف: بعد از کف موج (sin=-1) مثبت، بعد از سقف منفی
       return {pos:v.filter(x=>x===1).length,neg:v.filter(x=>x===-1).length,other:v.filter(x=>x!==0&&x!==1&&x!==-1).length};})(),
     feat:['rsi4','swp','cpr','cprw','mss','srsi'].every(x=>RD_FEAT.includes(x))&&['mbr','mmc'].every(x=>RD_MF.includes(x)),nos:RD_NOSIGN.includes('cprw'),
     fa:['rsi4','swp','cpr','cprw','mss','srsi','mbr','mmc'].every(x=>RD_FA[x])};});
 console.log('   ',JSON.stringify(r));
 ok(r.sp===1&&r.ut===-1,'اسپرینگ (کف 48 ساعته شکست، با حجم برگشت) = +1؛ آپ‌تراست = −1');
 ok(Math.abs(r.lo-0.6)<1e-9,'شکار کف بی حجم بالا = +0.6');
 ok(r.br===0&&r.no===0,'شکست واقعی (برنگشت) یا هیچ = 0');
 ok(r.cpr!=null&&Math.abs(r.cpr-r.want)<1e-9&&r.cprw!=null&&r.cprw>=-1&&r.cprw<=1,'CPR از روز کامل قبل: P=(H+L+C)/3، BC=(H+L)/2، TC=2P−BC ('+r.cpr.toFixed(3)+')');
 ok(r.m4>0&&r.m4<100&&Math.abs(r.rsi4-Math.max(-1,Math.min(1,(r.m4-50)/20)))<1e-9,'RSI 4 ساعته ('+r.m4.toFixed(1)+')');
 ok(r.srsi.pos>0&&r.srsi.neg>0&&r.srsi.other===0,'StochRSI: تقاطع رو به بالا در کف موج (+1، '+r.srsi.pos+' بار) و رو به پایین در سقف (−1، '+r.srsi.neg+' بار)');
 ok(r.mss[0]===0.75&&r.mss[1]===-0.75&&r.mss[2]===0&&r.mss[3]===0,'تغییر ساختار: شکست سقفِ پایین‌تر +0.75 (یک کندل پیش)، کفِ بالاتر −0.75؛ سقفِ بالاتر یا برگشت زیر سطح = 0 ('+r.mss.join(',')+')');
 ok(r.feat&&r.nos&&r.fa,'عامل‌ها در مدل و با نام فارسی؛ باریکی CPR بی‌جهت');
 // پهنای بازار: نمایش در جعبه‌ی کل بازار
 const q=await p.evaluate(()=>{RD.mkl=Object.assign({},RD.mkl||{},{br:{n:40,rsi:34.2,os:35,ob:5,mc:30,rsi24:41}});const h=mdBreadthHtml(RD.mkl.br),dv=document.createElement('div');dv.innerHTML=h;
   return {t:dv.textContent,w:[...dv.querySelectorAll('.mkline i')].map(x=>x.style.width)};});
 console.log('   ',JSON.stringify(q));
 ok(/پهنای بازار/.test(q.t)&&/40 ارز/.test(q.t)&&/34\.2/.test(q.t)&&/اشباع فروش/.test(q.t)&&/ریزش معمولاً خسته/.test(q.t)&&q.w.join()==='35%,60%,5%','پهنای بازار: میانگین RSI، سهم اشباع فروش/خرید، MACD مثبت و خوانش');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
