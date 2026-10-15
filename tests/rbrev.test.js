/* «اگر خلافش را گرفته بودیم»: همان استاپ و نقشه با جهت برعکس، فقط برای همان مدتی که معامله باز بود؛
   با دکمه روی هر تست و هر پوزیشن واقعی، خلاصه، جمع روز، آمار پوزیشن‌های بسته و خروجی یکجا برای بررسی */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},M5=3e5,D=864e5;
   const t0=Math.floor((Date.now()-3*D)/M5)*M5;
   // لانگ از 100، استاپ 98، «همه در +0.5R»: کندل 2 تا 98.9 می‌ریزد (خلافش، شورت، در 99 = +0.5R)، بعد 97.5
   const mk=(i,h,l,c)=>({t:t0+i*M5,o:c,h,l,c});
   const C=[mk(0,100.1,99.9,100),mk(1,100.2,99.6,99.7),mk(2,99.8,98.9,99),mk(3,99,97.5,97.8),mk(4,98,97.6,97.8)];
   for(let i=5;i<900;i++)C.push(mk(i,97.9,97.7,97.8));
   const base={k:'test',tk:'SOL',dir:'long',t:t0+1,E:100,SL:98,TP:103,sd:0.02,rr:1.5,ex:'q05',hold:72,x:exNew()};
   const it=Object.assign({},base,{id:'tRev1',st:'sl',R:-1.03,xt:t0+4*M5,xp:98});
   o.a=rbRevSim(it,C);
   // همان معامله ولی فقط 10 دقیقه باز (تا پیش از ریزش): خلافش هم فقط 10 دقیقه، با قیمت خروج خودش
   const it2=Object.assign({},base,{id:'tRev2',st:'man',R:-0.17,xt:t0+2*M5,xp:99.7});
   o.b=rbRevSim(it2,C);
   // ردیف: دکمه، حساب با زدن، خط نتیجه؛ خلاصه بی حساب خودکار
   const keep=RB.items,pth=rbPath;rbPath=async()=>C;
   RB.items=[it,it2];RDV='test';go('radar',true);renderRadar();await W(150);
   o.auto=RB.items.some(x=>x.rev);
   o.btn=document.querySelectorAll('#rdView [data-rb="rev"]').length;
   o.sum0=(document.querySelector('#rdView .rbrevs')||{}).textContent||'';
   document.querySelector('#rdView .rbrow[data-id="tRev1"] [data-rb="rev"]').click();await W(300);
   o.line=(document.querySelector('#rdView .rbrow[data-id="tRev1"] .rbrevl')||{}).textContent||'';
   o.sum1=(document.querySelector('#rdView .rbrevs')||{}).textContent||'';
   // پوزیشن واقعی بسته: لانگ از 100، استاپ اول 98، بسته روی 99.7 بعد از 10 دقیقه
   const ac=audCandles;audCandles=async()=>C.map(k=>Object.assign({},k));
   const P={id:'pr1',ticker:'SOL',dir:'long',kind:'futures',entry:100,stop:98,stop0:98,margin:10,lev:10,baseMargin:10,targets:[103],partials:[],log:[],
     openedAt:t0+1,closedAt:t0+2*M5,exitPrice:99.7,status:'closed'};
   DB.positions.push(P);
   const v=await posRevCalc(P);o.pos=v;
   posFilter='closed';go('positions',true);POSOPEN.add('pr1');renderPositions();await W(150);
   o.card=(document.querySelector('#pos-pr1 .posrev')||{}).textContent||'';
   o.stat=[...document.querySelectorAll('#posSummary .st')].map(x=>x.textContent).join('|');
   // خروجی یکجا: تست باقی‌مانده هم حساب و در فایل
   RB.items=[it,it2];delete it2.rev;
   await revExportStart();await W(200);
   o.sheet=(document.querySelector('#sheet h3')||{}).textContent||'';
   const J=JSON.parse(document.querySelector('#exTx').value);o.exp={k:J.kind,t:J.tests.length,p:J.positions.length,s:J.summary};
   closeSheet();await W(400);
   // زدن نوار کار: به بخش خودش در «آزمایشی» و چشمک
   go('positions',true);revGo();await W(300);
   o.goTo=view==='radar'&&RDV==='test'&&!!document.querySelector('#rbRevBox.flash');
   closeSheet();rbPath=pth;audCandles=ac;RB.items=keep;
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,1200));
 ok(r.a&&r.a.st==='tp'&&r.a.R>0.4&&r.a.R<0.5,'لانگِ استاپ‌خورده ← خلافش (شورت) در همان مدت به +0.5R رسید: '+JSON.stringify(r.a));
 ok(r.b&&r.b.st==='time'&&r.b.R>0.05&&r.b.R<0.15&&Math.round(r.b.dur/6e4)===10,'فقط 10 دقیقه باز ← خلافش هم 10 دقیقه، با قیمت خروج خودش (+0.15R منهای کارمزد ≈ +0.09R): '+JSON.stringify(r.b));
 ok(!r.auto&&r.btn===2&&/2 تست هنوز حساب نشده/.test(r.sum0),'خودکار حساب نمی‌شود؛ روی هر تست دکمه‌ی «اگر خلافش را گرفته بودیم؟»');
 ok(/اگر خلافش را گرفته بودیم/.test(r.line)&&/همان 20 دقیقه/.test(r.line)&&/خلافش بهتر بود/.test(r.line),'با زدن دکمه: «همان 20 دقیقه»، نتیجه و مقایسه با خودش: '+r.line);
 ok(/1 تست حساب شده/.test(r.sum1),'خلاصه فقط حساب‌شده‌ها را می‌شمارد');
 ok(r.pos&&r.pos.st==='time'&&r.pos.R>0.05&&r.pos.R<0.15&&r.pos.usd>0,'پوزیشن واقعی: خلافش همان 10 دقیقه با قیمت خروج خودش، R و دلار: '+JSON.stringify(r.pos));
 ok(/اگر خلافش را گرفته بودیم/.test(r.card)&&/خلافش بهتر بود/.test(r.card),'روی کارت پوزیشن: نتیجه و دکمه');
 ok(/اگر خلافش/.test(r.stat)&&/1 از/.test(r.stat),'آمار «بسته»: جمع «اگر خلافش» برای حساب‌شده‌ها');
 ok(/خروجی/.test(r.sheet)&&r.exp.k==='reverse'&&r.exp.t===2&&r.exp.p>=1,'خروجی یکجا برای بررسی: تست‌ها و پوزیشن‌ها، حساب‌نشده‌ها هم حساب شدند '+JSON.stringify(r.exp));
 ok(r.goTo,'زدن نوار «اگر خلافش…»: به «آزمایشی» می‌رود و بخش خودش روشن می‌شود');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
