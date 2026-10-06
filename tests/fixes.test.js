const {chromium}=require('./lib').pw;const {route,seed}=require('./fixture.js');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{const b=await chromium.launch();
 // 1,2) خطای اتصال
 const p0=await b.newPage({viewport:{width:360,height:740}});
 await p0.route('**',r=>r.request().url().includes('localhost:8899')?r.continue():r.abort());
 await p0.goto('http://localhost:8899/index.html');await p0.waitForTimeout(7000);
 const e=await p0.evaluate(()=>({skel:document.querySelectorAll('#list .skel').length,btns:[...document.querySelectorAll('#status button')].map(x=>x.textContent)}));
 ok(e.skel===0,'زیر خطای اتصال اسکلت بارگذاری نمی‌ماند ('+e.skel+')');
 ok(e.btns.join()==='تلاش دوباره,تست اتصال','دکمه‌ی «تست اتصال» کنار «تلاش دوباره»: '+e.btns);
 await p0.click('#status button:nth-child(2)');await p0.waitForTimeout(500);
 ok(await p0.evaluate(()=>/وضعیت/.test(document.querySelector('#sheet h3')?.textContent||'')),'«تست اتصال» پنجره‌ی وضعیت را باز می‌کند');
 await p0.screenshot({path:require('./lib').out('crawl/fix_err.png')});
 const p=await b.newPage({viewport:{width:360,height:740}});
 const errs=[];p.on('pageerror',x=>errs.push(x.message));p.on('dialog',d=>d.dismiss());
 await route(p.context());await p.goto('http://localhost:8899/index.html');await p.evaluate(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3500);
 // 3) برچسب‌های بریده
 const clip=await p.evaluate(()=>{go('report',true);const a=[...document.querySelectorAll('#vReport .fb span')].filter(s=>s.scrollWidth>s.clientWidth+1).map(s=>s.textContent);
   go('signals',true);const b=[...document.querySelectorAll('#fbar .fb span')].filter(s=>s.scrollWidth>s.clientWidth+1).map(s=>s.textContent);return a.concat(b);});
 ok(!clip.length,'هیچ برچسب بریده‌ای در 360 پیکسل نیست '+clip);
 // 5) کارنامه با یک معامله
 const rep=await p.evaluate(()=>{go('report',true);repPeriod='all';renderReport();const t=document.querySelector('#repBody').textContent;return {inf:t.includes('∞'),best:t.includes('بهترین'),note:!!document.querySelector('#repBody .stnote')};});
 ok(!rep.inf&&!rep.best&&rep.note,'کارنامه‌ی یک‌معامله‌ای: بدون ∞ و بهترین/بدترین، با یادداشت نمونه‌ی کم '+JSON.stringify(rep));
 // 6) برچسب فیلتر کانال‌سنج
 await p.evaluate(()=>go('audit',true));await p.waitForFunction(()=>!AUDQ.on&&AUDQ.at>0,{timeout:60000});await p.waitForTimeout(300);
 const pill=await p.evaluate(()=>{const x=[...document.querySelectorAll('#audBody .panel')].find(q=>/کارنامه‌ی کانال/.test(q.textContent));return x?x.querySelector('.panelhead .pill')?.textContent||'(بدون برچسب)':'?';});
 ok(!/^فیلتر/.test(pill),'برچسب کانال‌سنج توضیح می‌دهد: '+pill);
 // 7) نوار فیلتر روشن
 await p.evaluate(()=>{go('signals',true);bucket='arch';setView({day:'today'});});await p.waitForTimeout(300);
 const af=await p.evaluate(()=>[...document.querySelectorAll('.actf .actc')].map(x=>x.textContent.replace('×','').trim()));
 ok(af.join()==='آرشیو,روز: امروز','نوار فیلتر روشن: '+af);
 await p.screenshot({path:require('./lib').out('crawl/fix_actf.png')});
 await p.click('.actall');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>bucket==='live'&&VIEW.day==='all'&&!document.querySelector('.actf')),'«همه را بردار» همه را برمی‌دارد');
 // 8) فوکوس ورق
 await p.evaluate(()=>{go('positions',true);});await p.waitForTimeout(200);
 await p.focus('#btnManual');await p.keyboard.press('Enter');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>document.activeElement.id==='sheetTitle'&&document.getElementById('sheet').getAttribute('aria-modal')==='true'),'فوکوس روی عنوان ورق و aria-modal');
 for(let i=0;i<40;i++)await p.keyboard.press('Tab');
 ok(await p.evaluate(()=>document.getElementById('sheet').contains(document.activeElement)),'Tab داخل ورق می‌ماند');
 await p.keyboard.press('Escape');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>document.activeElement.id==='btnManual'),'بعد از بستن، فوکوس به دکمه‌ی قبلی برمی‌گردد');
 // 9) برچسب‌ها وصل‌اند
 const nl=await p.evaluate(()=>{document.getElementById('btnManual').click();return [...document.querySelectorAll('#sheet .fld input,#sheet .fld select')].filter(i=>!document.querySelector('label[for="'+i.id+'"]')).map(i=>i.id);});
 ok(!nl.length,'همه‌ی فیلدهای ورق برچسب وصل دارند '+nl);
 console.log('errors',errs);console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
