/* عامل‌های رادار: باریکی CPR، تغییر ساختار، پهنای بازار؛ و برداشته شدن عامل‌های همیشه‌کم‌اثر */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{const H=36e5,N=900,T0=Math.floor(Date.now()/864e5)*864e5-N*H;
   const base=()=>Array.from({length:N},(_,q)=>{const m=10+0.05*Math.sin(q/3);return {t:T0+q*H,o:m,h:Math.min(10.1,m+0.04),l:Math.max(9.9,m-0.04),c:m,v:100};});
   const C=base(),P=rdPrep(C,C,null,null),x=rdParts(P,N-1);
   return {cprw:x.p.cprw,mw:x.m.cprw,
     mss:(()=>{const mk=(up)=>{const C=Array.from({length:45},(_,q)=>({t:q*36e5,o:10,h:10.2,l:9.8,c:10}));
         if(up){C[20].h=12;C[30].h=11;C[39].c=11.2;C[40].c=11.3;C[39].h=11.4;C[40].h=11.4;}
         else{C[20].l=8;C[30].l=9;C[39].c=8.8;C[40].c=8.7;C[39].l=8.6;C[40].l=8.6;}return C;};
       const U=mk(true),D=mk(false),U2=mk(true);U2[30].h=12.5;        // سقف بالاتر: تغییر ساختار نیست
       const U3=mk(true);U3[40].c=10.9;                                // برگشت زیر سطح
       return [rdMss(U,40),rdMss(D,40),rdMss(U2,40),rdMss(U3,40)];})(),
     gone:['rsi4','srsi','swp','cpr','mbr'].filter(k=>RD_FEAT.includes(k)||RD_FA[k]),
     feat:['cprw','mss'].every(x=>RD_FEAT.includes(x))&&RD_MF.join()==='mtot,mt2,mt3,mbd,mud,mmc',nos:RD_NOSIGN.includes('cprw'),
     fa:['cprw','mss','mmc'].every(x=>RD_FA[x]),keys:Object.keys(x.p).filter(k=>['rsi4','srsi','swp','cpr'].includes(k))};});
 console.log('   ',JSON.stringify(r));
 ok(r.cprw!=null&&r.cprw>=-1&&r.cprw<=1&&r.mw>0,'باریکی CPR روز قبل در برابر 20 روز ('+r.cprw.toFixed(2)+')');
 ok(r.gone.length===0&&r.keys.length===0,'RSI 4 ساعته، StochRSI، شکار نقدینگی، CPR و پهنای RSI از مدل برداشته شدند (همیشه کم‌اثر بودند)');
 ok(r.mss[0]===0.75&&r.mss[1]===-0.75&&r.mss[2]===0&&r.mss[3]===0,'تغییر ساختار: شکست سقفِ پایین‌تر +0.75 (یک کندل پیش)، کفِ بالاتر −0.75؛ سقفِ بالاتر یا برگشت زیر سطح = 0 ('+r.mss.join(',')+')');
 ok(r.feat&&r.nos&&r.fa,'باریکی CPR، تغییر ساختار و پهنای MACD در مدل و با نام فارسی؛ باریکی CPR بی‌جهت');
 // پهنای بازار: نمایش در جعبه‌ی کل بازار
 const q=await p.evaluate(()=>{RD.mkl=Object.assign({},RD.mkl||{},{br:{n:40,rsi:34.2,os:35,ob:5,mc:30,rsi24:41}});const h=mdBreadthHtml(RD.mkl.br),dv=document.createElement('div');dv.innerHTML=h;
   return {t:dv.textContent,w:[...dv.querySelectorAll('.mkline i')].map(x=>x.style.width)};});
 console.log('   ',JSON.stringify(q));
 ok(/پهنای بازار/.test(q.t)&&/40 ارز/.test(q.t)&&/34\.2/.test(q.t)&&/اشباع فروش/.test(q.t)&&/ریزش معمولاً خسته/.test(q.t)&&q.w.join()==='35%,60%,5%','پهنای بازار: میانگین RSI، سهم اشباع فروش/خرید، MACD مثبت و خوانش');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
