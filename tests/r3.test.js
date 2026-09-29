const {chromium}=require('./lib').pw;const {route,seed}=require('./fixture.js');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:800}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await route(p.context());await p.goto('http://localhost:8899/index.html');await p.evaluate(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);
 // 5) دکمه‌ی کنار گذاشتن ته فهرست
 const pos=await p.evaluate(()=>{sigFilter='all';renderSignals();const l=document.getElementById('list');const kids=[...l.children];const t=l.querySelector('.tidy');return t?[kids.indexOf(t),kids.length]:null;});
 ok(pos&&pos[0]===pos[1]-1,'«کنار گذاشتن» آخرین چیز فهرست است '+pos);
 // 4) منوی پایین با اسکرول
 await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(100);
 await p.mouse.wheel(0,900);await p.waitForTimeout(400);
 ok(await p.evaluate(()=>document.documentElement.classList.contains('navhide')),'اسکرول به پایین منو را پنهان می‌کند');
 await p.mouse.wheel(0,-300);await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!document.documentElement.classList.contains('navhide')),'اسکرول به بالا منو را برمی‌گرداند');
 // 19) مرتب‌سازی
 await p.evaluate(()=>{go('positions',true);posFilter='all';renderPositions();});await p.waitForTimeout(200);
 const order=async()=>p.$$eval('#posList .card .tick',e=>e.map(x=>x.textContent).join(','));
 await p.selectOption('#posSort','pnlD');await p.waitForTimeout(200);const o1=await order();
 await p.selectOption('#posSort','tk');await p.waitForTimeout(200);const o2=await order();
 ok(o2==='ETH,GRAM,SOL','مرتب‌سازی بر اساس نماد: '+o2);
 ok(o1==='ETH,GRAM,SOL','بیشترین سود اول (ETH 9.80، GRAM 6.80، SOL 0.37): '+o1);
 await p.reload();await p.waitForTimeout(2500);
 ok(await p.evaluate(()=>POSSORT)==='tk','مرتب‌سازی ذخیره می‌ماند');
 console.log('errors',errs);console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
