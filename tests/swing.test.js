/* نوسان‌سنج: موتور روی یک مسیر ساختگی با جواب معلوم، و رابط در کانال‌سنج (فقط با دکمه) */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});
 let kl=0;
 await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 p.on('request',r=>{if(/klines|candles|candlestick/.test(r.url()))kl++;});
 await p.addInitScript(seed);
 await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== موتور: مسیر ساختگی ===');
 const r=await p.evaluate(()=>{
   const t0=Date.now()-5*864e5, seq=[100,97,111,104,111,99,111,92.4,100,91.5,125];
   const C=seq.slice(1).map((c,i)=>{const o=seq[i];return {t:t0+i*3e5,o,h:Math.max(o,c),l:Math.min(o,c),c};});
   const inp={tk:'X',dir:'long',entry:100,trig:null,stop:90,tps:[110,120],t0};
   const R=audRules(), w=audWalk(inp,C,R);
   const o={lev:10,roi:20,win:'sig',near:0.75,hys:0.5};
   const pr=swingProfile(inp,C,w,o), pr20=swingProfile(inp,C,w,Object.assign({},o,{lev:20}));
   const cp=coinProfile(C,o);
   // شورتِ آینه‌ای همان جواب را باید بدهد
   const M=C.map(k=>({t:k.t,o:200-k.o,h:200-k.l,l:200-k.h,c:200-k.c}));
   const inS={tk:'X',dir:'short',entry:100,trig:null,stop:110,tps:[90,80],t0};
   const prS=swingProfile(inS,M,audWalk(inS,M,R),o);
   return {st:w.st,pr,liq20:pr20.liqT!=null,liq10:pr.liqT!=null,cp,prS:{tpN:prS.tpN,beN:prS.beN,nearN:prS.nearN,flips:prS.flips}};
 });
 const pr=r.pr;
 console.log('   ',JSON.stringify({tpN:pr.tpN,beN:pr.beN,nearN:pr.nearN,stopN:pr.stopN,maeBR:pr.maeBR,mfeR:pr.mfeR,maeR:+pr.maeR.toFixed(2),plus:pr.plusN,minus:pr.minusN,flips:pr.flips,legs:pr.legs}));
 ok(r.st==='win'&&pr.act,'سیگنال برد و فعال');
 ok(pr.tpN===4,'۴ بار لمس تارگت ۱ (هر بار بعد از عقب‌نشینیِ دست‌کم ۰.۵R)');
 ok(pr.beN===2,'۲ بار بعد از تارگت ۱ تا ورود برگشت');
 ok(pr.nearN===2&&pr.stopN===0,'۲ بار نزدیک استاپ (−۰.۷۵R)، استاپ نخورد');
 ok(Math.abs(pr.maeBR+0.3)<1e-9,'افت پیش از سود −۰.۳R');
 ok(Math.abs(pr.mfeR-2.5)<1e-9&&Math.abs(pr.maeR+0.85)<1e-9,'سقف +۲.۵R، کف −۰.۸۵R');
 ok(pr.plusN===3&&pr.minusN===3&&pr.flips===3,'باند ±۲۰٪ با ۱۰x (±۲٪ قیمت): ۳ بار بالا، ۳ بار پایین، ۳ رفت‌وآمد');
 ok(pr.legs===10,'زیگزاگ ۲٪: ۱۰ حرکت');
 ok(!r.liq10&&r.liq20,'لیکوئید: با ۱۰x نه (کف −۸.۵٪)، با ۲۰x بله');
 ok(r.prS.tpN===4&&r.prS.beN===2&&r.prS.nearN===2&&r.prS.flips===3,'شورت آینه‌ای همان جواب: '+JSON.stringify(r.prS));
 ok(r.cp.legs===10&&r.cp.overLiq===5,'توکن: ۱۰ حرکت، ۵ تا بزرگ‌تر از فاصله‌ی لیکوئید ۹.۵٪ — '+r.cp.legs+'/'+r.cp.overLiq);

 console.log('=== رابط: فقط با دکمه ===');
 await p.evaluate(()=>{AF.noLate=false;go('audit',true);});
 await p.waitForTimeout(6000);                      // کانال‌سنج خودش سیگنال‌ها را می‌سنجد (کار قبلی)
 const before=await p.evaluate(()=>Object.keys(SWING).length);
 ok(before===0,'باز کردن کانال‌سنج: نوسان چیزی نسنجید');
 const btn=await p.evaluate(()=>{const b=[...document.querySelectorAll('.swp .btn')].find(x=>/سنجش نوسان/.test(x.textContent));return b&&{t:b.textContent,d:b.disabled};});
 ok(btn&&!btn.d,'دکمه: '+(btn&&btn.t));
 await p.evaluate(()=>[...document.querySelectorAll('.swp .btn')].find(x=>/سنجش نوسان/.test(x.textContent)).click());
 for(let i=0;i<40&&await p.evaluate(()=>SWQ.on);i++)await p.waitForTimeout(500);
 const agg=await p.evaluate(()=>({n:Object.keys(SWING).length,stats:[...document.querySelectorAll('.swp .stats .st b')].map(x=>x.textContent),items:document.querySelectorAll('.swp .swit').length}));
 console.log('   ',JSON.stringify(agg));
 ok(agg.n>=3&&agg.stats.includes('میانگین لمس تارگت ۱')&&agg.items>=1,'بعد از دکمه: جمع‌بندی و پرنوسان‌ترین‌ها');
 await p.evaluate(()=>document.querySelector('.swp .swit').click());await p.waitForTimeout(500);
 ok(await p.evaluate(()=>/لمس تارگت ۱|نزدیک استاپ/.test(document.querySelector('#sheet').textContent)&&!!document.querySelector('#sheet .swsvg')),'جزئیات یک سیگنال با نمودار');
 await p.evaluate(()=>closeSheet());await p.waitForTimeout(300);
 console.log('=== یک توکن ===');
 const kl0=kl;
 await p.evaluate(()=>{const i=document.querySelector('#swTk');i.value='btc';document.querySelector('#swDays').value='3';document.querySelector('#swTkGo').click();});
 for(let i=0;i<20&&!(await p.evaluate(()=>!!document.querySelector('#swCoin .swres')));i++)await p.waitForTimeout(400);
 const coin=await p.evaluate(()=>({t:document.querySelector('#swCoin').textContent,svg:!!document.querySelector('#swCoin .swsvg'),tk:SWCOIN&&SWCOIN.tk}));
 ok(coin.tk==='BTC'&&coin.svg&&/حرکت‌های دست‌کم/.test(coin.t)&&/لیکوئید با/.test(coin.t),'BTC سه روز: نتیجه با نمودار و خطر لیکوئید');
 ok(kl>kl0,'کندل فقط با «بسنج» گرفته شد');
 await p.evaluate(()=>{document.querySelector('#swLev').value='50';document.querySelector('#swLev').dispatchEvent(new Event('change'));});await p.waitForTimeout(400);
 ok(await p.evaluate(()=>SWOPT.lev===50&&!/لیکوئید می‌شود/.test(document.querySelector('.swp').textContent)),'اهرم ۵۰ با باند ۲۰٪ (۰.۴٪ قیمت): لیکوئید (۱.۵٪) دورتر از باند، هشداری نیست');
 await p.evaluate(()=>{document.querySelector('#swRoi').value='100';document.querySelector('#swRoi').dispatchEvent(new Event('change'));});await p.waitForTimeout(400);
 ok(await p.evaluate(()=>/لیکوئید می‌شود/.test(document.querySelector('.swp').textContent)),'اهرم ۵۰ با باند ۱۰۰٪ (۲٪ قیمت): هشدار «پیش از −۱۰۰٪ لیکوئید»');
 ok(await p.evaluate(()=>/سنجش نوسان/.test([...document.querySelectorAll('.swp .btn')].map(b=>b.textContent).join())),'تنظیم عوض شد ← نتیجه‌ی قبلی معتبر نیست و دوباره قابل سنجش');
 const e=await p.$('.swp');await e.screenshot({path:require('./lib').out('swing.png')});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
