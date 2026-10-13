/* نقشه‌ی خروج پوزیشن: «33٪» یعنی سهم حجم (جمع 100، نه 99) با سود همان سهم؛ پله‌ای که قیمت از آن خیلی جلوتر رفته با قیمت الان
   اجرا می‌شود نه قیمت تارگت؛ استاپی که خودت جلوتر برده‌ای پایین نمی‌آید؛ پله‌های ردشده‌ی بعدی هم نشان داده می‌شوند */
const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:1000}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();if(u.includes('localhost:8899'))return r.continue();
   if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:'<html><body></body></html>'});return r.abort();});
 await p.addInitScript(()=>{localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[],settings:{}}));window.__startView='positions';});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms));
   S.feat.autoexec=false;S.fee=0;S.rMul=[1.5,3,5];
   // همان اسکرین‌شات: S لانگ، ورود 0.0249، استاپ اولیه 0.01، مارجین 10 با اهرم 10، قیمت الان 0.07099، استاپ را خودت به 0.05938 برده‌ای
   const q={id:'s',ticker:'SSS',dir:'long',kind:'futures',entry:0.0249,stop:0.01,margin:10,lev:10,openedAt:Date.now()-6e4,status:'open',targets:[],partials:[],log:[]};
   DB.positions.push(q);rebase(q);pbAttach(q,'sw');q.stop=0.05938;save();
   applyPrices(new Map([['SSS',0.07099],['ZZZ',1]]),'test','direct',1);go('positions',true);renderAll();await W(300);
   const steps=()=>[...document.querySelectorAll('.pbsteps li')].map(l=>l.textContent.replace(/\s+/g,' '));
   const a=steps();
   const done=[...document.querySelectorAll('.pbsteps li .btn')].find(x=>/انجام شد/.test(x.textContent));done.click();await W(200);
   const part=q.partials[0],m1=+q.margin.toFixed(3),st1=q.stop;
   // اجرای خودکار روی پوزیشنی که دیر ثبت شده: پله‌ها با قیمت الان، نه تارگت
   const q2={id:'s2',ticker:'SS2',dir:'long',kind:'futures',entry:0.0249,stop:0.01,margin:10,lev:10,openedAt:Date.now()-6e4,status:'open',targets:[],partials:[],log:[]};
   DB.positions.push(q2);rebase(q2);pbAttach(q2,'sw');q2.stop=0.05938;S.feat.autoexec=true;save();
   applyPrices(new Map([['SS2',0.07099],['SSS',0.07099],['ZZZ',1]]),'test','direct',1);await W(300);
   const auto={n:q2.partials.length,px:q2.partials.map(x=>x.price).join(),stop:q2.stop,pbc:q2.pbc};
   // و تارگتی که جلوی چشم رد شد (قیمت قبلی زیرش): همان تارگت، مثل Limit
   const q3={id:'s3',ticker:'SS3',dir:'long',kind:'futures',entry:100,stop:90,margin:10,lev:5,openedAt:Date.now()-6e4,status:'open',targets:[110,120,130],partials:[],log:[]};
   DB.positions.push(q3);rebase(q3);pbAttach(q3,'bal');save();
   applyPrices(new Map([['SS3',105],['ZZZ',1]]),'test','direct',1);await W(150);applyPrices(new Map([['SS3',118],['ZZZ',1]]),'test','direct',1);await W(300);
   const cross={px:q3.partials.map(x=>x.price).join()};
   return {auto,cross,a,tps:q.pb.tps,partPx:part&&part.price,partPnl:part&&+part.pnl.toFixed(2),margin:m1,stop:st1,
     pct:pbPctShow([1/3,1/3,1/3]).join(),pct2:pbPctShow([.5,.25,.25]).join()};});
 console.log('   ',JSON.stringify(r).slice(0,1400));
 ok(r.pct==='33,33,34'&&r.pct2==='50,25,25','درصد پله‌ها جمعشان 100 است (33، 33، 34)');
 ok(/ببند 33٪ حجم/.test(r.a[0])&&/\$/.test(r.a[0])&&/ببند 33٪ حجم \(نصف باقی\)/.test(r.a[1])&&/ببند باقی \(34٪ حجم\)/.test(r.a[2]),'متن: «ببند 33٪ حجم ≈ $…»، «(نصف باقی)»، «ببند باقی (34٪ حجم)»');
 ok(/جلوتر از نقشه/.test(r.a[0])&&/جلوتر از نقشه/.test(r.a[1]),'استاپ 0.05938 جلوتر از نقشه: «استاپ همان … (جلوتر از نقشه)» به‌جای «استاپ ← ورود»');
 ok(/رسید!/.test(r.a[0])&&/قیمت الان/.test(r.a[0])&&/این هم رد شد/.test(r.a[1])&&!/رد شد/.test(r.a[2]),'تارگت 1 «رسید» با قیمت الان؛ تارگت 2 «این هم رد شد»؛ تارگت 3 نه');
 ok(r.partPx===0.07099&&r.partPnl>60&&r.partPnl<63&&Math.abs(r.margin-6.667)<0.01&&r.stop===0.05938,'«انجام شد»: یک‌سوم روی 0.07099 (نه 0.04725) ≈ $61.7، مارجین 6.67 ماند، استاپ پایین نیامد');
 ok(r.auto.n===2&&r.auto.px==='0.07099,0.0696'&&r.auto.stop===0.05938&&r.auto.pbc===2,'اجرای خودکار، پوزیشن دیر ثبت‌شده: تارگت 1 روی قیمت الان 0.07099 (1.6R جلوتر)، تارگت 2 روی خودش (قیمت فقط 0.09R جلوتر)، استاپ 0.05938 ماند');
 ok(r.cross.px==='110','تارگتی که جلوی چشم رد شد (105 ← 118): روی خود تارگت 110، مثل Limit');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
