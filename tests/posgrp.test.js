const {chromium}=require('./lib').pw;const {route,seed}=require('./fixture.js');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
 await route(p.context());await p.goto('http://localhost:8899/index.html');await p.evaluate(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3500);
 await p.evaluate(()=>{go('positions',true);posFilter='all';renderPositions();});await p.waitForTimeout(300);
 const st=await p.evaluate(()=>[...document.querySelectorAll('#posList .card')].map(c=>c.className.includes('pct')?'-':'O').join(''));
 ok(st==='---','چند پوزیشن: همه جمع‌شده '+st);
 const vis=await p.evaluate(()=>{const c=document.querySelector('#posList .card');return {hero:!!c.querySelector('.pnlhero').getClientRects().length,lad:!!c.querySelector('.ladder')?.getClientRects().length,acts:!!c.querySelector('.acts')?.getClientRects().length};});
 ok(vis.hero&&!vis.lad&&!vis.acts,'جمع‌شده: فقط سود/ضرر درشت '+JSON.stringify(vis));
 await p.screenshot({path:require('./lib').out('crawl/pos_tight.png')});
 await p.click('#posList .card:nth-child(1) .pnlhero');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.querySelector('#posList .card').classList.contains('pcopen')),'زدن روی کارت بازش می‌کند');
 // منوی ⋯
 const acts=await p.evaluate(()=>[...document.querySelectorAll('#posList .card.pcopen .acts button')].map(x=>x.textContent.trim()||x.getAttribute('aria-label')));
 ok(!acts.some(t=>/حذف/.test(t))&&acts.includes('کارهای بیشتر'),'حذف و ویرایش پشت ⋯: '+acts.join(' | '));
 await p.click('#posList .card.pcopen .pmbtn');await p.waitForTimeout(300);
 const pm=await p.evaluate(()=>[...document.querySelectorAll('#posList .pmore button')].map(x=>x.textContent.trim()));
 ok(pm.join()==='تصویر نتیجه,ویرایش,حذف','منوی ⋯: '+pm);
 await p.screenshot({path:require('./lib').out('crawl/pos_open.png')});
 await p.click('#posList .card.pcopen .chead');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.querySelector('#posList .card.pcopen')),'زدن سربرگ کارت باز → بسته');
 // 18) هشدار نزدیک استاپ: قیمت GRAM را نزدیک استاپ کن
 await p.evaluate(()=>{PRICES.set('GRAM',1.395);checkAlerts();renderPositions();});await p.waitForTimeout(200);
 const al=await p.evaluate(()=>({toast:document.querySelector('#toast.on')?.textContent,pill:[...document.querySelectorAll('#posList .pill.alrt')].map(x=>x.textContent)}));
 ok(/نزدیک حد ضرر/.test(al.toast||'')&&al.pill.includes('نزدیک استاپ'),'هشدار نزدیک استاپ + برچسب روی کارت '+JSON.stringify(al));
 // تکرار نمی‌شود بعد از بارگذاری دوباره
 await p.reload();await p.waitForTimeout(2500);
 await p.evaluate(()=>{document.getElementById('toast').className='toast';PRICES.set('GRAM',1.395);checkAlerts();});
 ok(await p.evaluate(()=>!document.querySelector('#toast.on')),'بعد از بارگذاری دوباره هشدار تکرار نشد');
 // نزدیک تارگت
 await p.evaluate(()=>{PRICES.set('GRAM',1.585);checkAlerts();});await p.waitForTimeout(200);
 ok(/نزدیک تارگت/.test(await p.evaluate(()=>document.querySelector('#toast.on')?.textContent||'')),'هشدار نزدیک تارگت');
 console.log('errors',errs);console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
