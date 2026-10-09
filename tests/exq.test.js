/* خروج زود: +0.3R، +0.75R، +1R و «استاپ با بسته شدن کندل» (سایه‌ی شکار استاپ نمی‌زندش؛ اضطراری −2R)؛
   همان قانون در دفتر تست با کندل 5 دقیقه‌ای (فقط کندلی که ساعت را می‌بندد) */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{const H=36e5,K=(j,o,h,l,c)=>({t:j*H,o,h,l,c});
   const pad=(C)=>{while(C.length<30)C.push(K(C.length,10,10.01,9.99,10));return C;};
   const cT=exCost({tpf:1},0.02),cM=exCost({tpf:0},0.02),W=C=>rdWalkX(pad(C),0,{dir:'long',E:10,sd:0.02});
   // ۱) سایه تا −1.1R ولی بسته شدن −0.25R، بعد +0.6R
   const a=W([K(0,10,10,10,10),K(1,10,10.02,9.78,9.95),K(2,9.95,10.12,9.94,10.1)]);
   // ۲) بسته شدن زیر استاپ: −1.25R
   const c=W([K(0,10,10,10,10),K(1,10,10.01,9.72,9.75)]);
   // ۳) اضطراری: سایه تا −2.25R ← −1.5R
   const e=W([K(0,10,10,10,10),K(1,10,10.01,9.55,9.9)]);
   // ۴) +0.3، +0.75، +1R
   const g=W([K(0,10,10,10,10),K(1,10,10.07,9.99,10.06),K(2,10.06,10.16,10.05,10.15),K(3,10.15,10.21,10.14,10.2)]);
   const f=x=>+x.toFixed(4);
   // دفتر تست با کندل 5 دقیقه‌ای: سایه زیر استاپ وسط ساعت بی‌اثر؛ کندلی که ساعت را می‌بندد زیر استاپ ← بسته
   const T0=Math.floor(Date.now()/H)*H-3*H,it={id:'Q1',k:'test',tk:'ZQ',dir:'long',t:T0,E:10,SL:9.8,TP:10.3,sd:0.02,rr:1.5,st:'open',ex:'q05c',x:exNew()};
   const M5=3e5,s1=rbStep(it,10.01,9.78,T0+M5,9.95),s2=rbStep(it,9.96,9.72,T0+H,9.74);
   return {q05:f(a.q05.R+cM),q05c:f(a.q05c.R+cT),cl:f(c.q05c.R+cM),cl2:c.q05c.how,em:f(e.q05c.R+cM),
     sar:(()=>{const u=0.2,C=[K(0,10,10,10,10)];
         for(let j=1;j<=10;j++){const h=10+u*0.1*j;C.push(K(j,h-u*0.05,h,h-u*0.1,h-u*0.02));}
         C.push(K(11,10.18,10.19,9.9,9.95));const w=W(C.slice()),wt=w.sar;
         // همان مسیر با کندل 5 دقیقه‌ای در دفتر تست (هر ساعت 12 کندل) باید همان SAR را بدهد
         const T0=Math.floor(Date.now()/H)*H-14*H,it={id:'S1',k:'test',tk:'ZS',dir:'long',t:T0,E:10,SL:9.8,TP:10.3,sd:0.02,rr:1.5,st:'open',ex:'sar',x:exNew()};
         const pc=pad(C.slice());for(let j=1;j<pc.length&&it.st==='open';j++){const k=pc[j];
           for(let m=0;m<12&&it.st==='open';m++){const a=k.o+(k.c-k.o)*m/12,b=k.o+(k.c-k.o)*(m+1)/12;
             const hi=m===5?k.h:Math.max(a,b),lo=m===7?k.l:Math.min(a,b);rbStep(it,hi,lo,T0+(j-1)*H+(m+1)*3e5,b);}}
         return {R:f(wt.R+exCost({tpf:0.5},0.02)),how:wt.how,j:wt.j,book:f(it.x.acc),bst:it.st};})(),
     q03:f(g.q03.R+cT),q075:f(g.q075.R+cT),q1:f(g.q1.R+cT),q1j:g.q1.j,s1,s2,R:it.R,st:it.st,pl:Object.keys(rdExPlans()).length};});
 console.log('   ',JSON.stringify(r));
 ok(r.q05===-1&&r.q05c===0.5,'سایه تا −1.1R با بسته شدن −0.25R: «+0.5R» معمولی استاپ خورد (−1R)، با «استاپ با بسته شدن کندل» زنده ماند و +0.5R داد');
 ok(r.cl===-1.25&&r.cl2==='sl','کندل زیر استاپ بسته شد ← خروج با همان بسته شدن (−1.25R)');
 ok(r.em===-1.5,'استاپ اضطراری: سایه تا −2.25R ← −1.5R');
 ok(r.sar.how==='trail'&&r.sar.R>0.25&&r.sar.R<0.6&&r.sar.j===11,'SAR: نصف در +0.5R، باقی با استاپ SAR که هر ساعت بالا آمد؛ با ریزش ساعت 11 روی SAR بسته شد ('+r.sar.R+'R)');
 ok(r.sar.bst!=='open'&&Math.abs(r.sar.book-r.sar.R)<0.03,'دفتر تست با کندل 5 دقیقه‌ای همان SAR یک‌ساعته را می‌دهد ('+r.sar.book+' در برابر '+r.sar.R+')');
 ok(r.q03===0.3&&r.q075===0.75&&r.q1===1&&r.q1j===3,'+0.3R، +0.75R و +1R (1:1) سنجیده می‌شوند');
 ok(r.s1===false&&r.s2===true&&r.st==='sl'&&r.R<-1.2&&r.R>-1.4,'دفتر تست: سایه‌ی وسط ساعت بی‌اثر؛ کندلی که ساعت را بست زیر استاپ ← بسته ('+r.R+'R)');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
