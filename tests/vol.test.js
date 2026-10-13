/* حجم: پروفایل حجم، شکست از فشردگی، استاپ ساختاری، بند هفتم چک‌لیست و سه روش حجم در آزمایشگاه */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const H=36e5,M5=3e5,T0=Math.floor((Date.now()-30*H)/M5)*M5;
 // 30 روز قبل از ورود: بیشتر حجم حول 100 و یک دیوار پرحجم در 104؛ بعد از ورود از 100 تا 105 بالا می‌رود
 // فاز الگو به T0 بسته است (نه به ساعت روز): 6 ساعت پیش از ورود همیشه حول 100؛ قبلاً بسته به ساعت اجرا کف 6 ساعت بالای ورود می‌افتاد و استاپ ساختاری نبود
 const h1=t=>{const k=Math.floor((T0-t)/H)%40;const c=k<30?100+Math.sin(k)*0.3:104+Math.sin(k)*0.3;return {c,v:k<30?50:200};};
 await ctx.route(/klines\?symbol=VOLUSDT&interval=1h&startTime=(\d+)&limit=(\d+)/,r=>{const m=r.request().url().match(/startTime=(\d+)&limit=(\d+)/),out=[];
   for(let t=+m[1];t<Date.now()&&out.length<+m[2];t+=H){const x=h1(t),c=t<T0?x.c:100;out.push([t,String(c),String(c+0.4),String(c-0.4),String(c),String(x.v),t+H-1]);}
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(out)});});
 await ctx.route(/klines\?symbol=VOLUSDT&interval=5m&startTime=(\d+)&limit=(\d+)/,r=>{const m=r.request().url().match(/startTime=(\d+)&limit=(\d+)/),out=[];
   for(let t=+m[1];t<Date.now()&&out.length<+m[2];t+=M5){const q=Math.min(105,100+(t-T0)/H*0.5),o=q,c=q+0.04;out.push([t,String(o),String(c+0.02),String(o-0.02),String(c),'1',t+M5-1]);}
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(out)});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async T0=>{const H=36e5,o={};
   // شکست از فشردگی: 40 کندل آرام حول 100، بعد کندل شکست 101.5 با حجم 3 برابر
   const C=[];for(let i=0;i<60;i++){const c=100+Math.sin(i)*0.2;C.push({t:i*H,o:c,h:c+0.3,l:c-0.3,c,v:100});}
   C.push({t:60*H,o:100.1,h:101.8,l:100,c:101.5,v:320});
   const vs=volSignal(C,60);o.bo=vs.bo&&vs.bo.d;o.st=volStop(C,60,'long',vs);
   // حجم دیررس: 6 کندل پرحجم پشت سر هم و حرکت بزرگ
   const D=C.slice(0,50);for(let i=0;i<8;i++){const c=100+i*1.2;D.push({t:(50+i)*H,o:c-1,h:c+0.2,l:c-1.1,c,v:400});}
   const v2=volSignal(D,D.length-1);o.late=v2.late;o.bo2=!!v2.bo;
   // پروفایل: دیوار پرحجم در 104
   const P=[];for(let i=0;i<200;i++){const hi=i%5===0,c=hi?104:100+(i%7)*0.4;P.push({t:i*H,o:c,h:c+0.2,l:c-0.2,c,v:hi?500:40});}
   const vp=volLevels(P,199);o.tg=volTarget(vp,100.5,'long',0.02);
   // چک‌لیست: بند هفتم
   const ck=rdChkOf({vbo:1,vlt:0},'long',0.03,true),ck2=rdChkOf({vbo:0,vlt:1},'long',0.03,true),ck3=rdChkOf({vbo:0,vlt:0},'long',0.03,true);
   o.ck=[ck.it[6],ck2.it[6],ck3.it[6],RD_CK.length];
   // آزمایشگاه: سه روش حجم
   RB.items=[1,2,3,4,5].map(n=>({id:'V'+n,k:'test',tk:'VOL',dir:'long',t:T0,E:100,SL:98,TP:103,sd:0.02,rr:1.5,st:'sl',R:-1.1,xt:T0+3*H,ex:'tp'}));
   await rbLabRun();const x=RBL.res[0];o.vol=x&&x.vol&&{tg:x.vol.tg,st:x.vol.st,A:x.vol.A,B:x.vol.B,C:x.vol.C};
   RDV='test';RBLOPEN=true;go('radar',true);renderAll();o.tbl=(document.querySelector('#rdView .rbvolt')||{}).textContent||'';
   o.ex=!!JSON.parse(rbLabExport()).trades[0].vol;
   return o;},T0);
 console.log('   ',JSON.stringify(r).slice(0,900));
 ok(r.bo===1&&r.st>99&&r.st<100.1,'شکست از فشردگی با حجم پیدا شد؛ استاپ ساختاری زیر کف کندل شکست ('+r.st+')');
 ok(r.late===1&&!r.bo2,'چند کندل پرحجم و حرکت انجام‌شده = «حجم دیررس»');
 ok(r.tg>103.5&&r.tg<104.5,'تارگت: سطح پرحجم بعدی (حدود 104) — '+r.tg);
 ok(r.ck.join()==='true,false,,7','چک‌لیست: بند هفتم «حجم» (✓ شکست، ✗ دیررس، · هیچ)');
 ok(r.vol&&r.vol.tg>103&&r.vol.A&&r.vol.A.how==='tp'&&r.vol.A.R>1.5&&r.vol.C,'آزمایشگاه: تارگت پرحجم روی مسیر واقعی خورد (الف '+(r.vol&&r.vol.A&&r.vol.A.R.toFixed(2))+'R)');
 ok(/تارگت سطح پرحجم/.test(r.tbl)&&/استاپ ساختاری/.test(r.tbl)&&r.ex,'جدول «حجم: تارگت سطح پرحجم و استاپ ساختاری» و در خروجی');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
