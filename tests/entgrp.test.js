const {chromium}=require('./lib').pw;const {route,seed}=require('./fixture.js');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));const dl=[];p.on('dialog',d=>{dl.push(d.message().slice(0,40));d.dismiss();});
 await route(p.context());await p.goto('http://localhost:8899/index.html');await p.evaluate(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3500);
 // 14) مبلغ‌های آماده از تنظیمات
 await p.click('#btnSet');await p.waitForTimeout(400);await p.evaluate(()=>document.querySelectorAll('#setVeil details').forEach(d=>d.open=true));
 await p.fill('#sAmts','5, 15, 40, 200');await p.dispatchEvent('#sAmts','change');await p.click('#setDone');await p.waitForTimeout(400);
 const chips=await p.evaluate(()=>amtChips().join(','));
 ok(chips==='5,10,15,40,200','مبلغ‌های آماده از تنظیمات: '+chips);
 // 15) جداکننده‌ی هزارگان در تنظیمات
 await p.click('#btnSet');await p.waitForTimeout(400);
 await p.fill('#sAcct','');await p.type('#sAcct','12500');
 ok(await p.$eval('#sAcct',i=>i.value)==='12,500','«12500» → «12,500» موقع تایپ');
 await p.click('#setDone');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>S.acct)===12500,'مقدار ذخیره‌شده 12500');
 // ورود
 await p.evaluate(()=>{const pp=POSTS.find(x=>x.id.endsWith('/920'));sheetEnter(pp,sigOf(pp),OVERRIDE[pp.id]||{},PRICES.get('BTC'));});
 await p.waitForTimeout(1200);
 await p.fill('#f_m','');await p.type('#f_m','1500');
 ok(await p.$eval('#f_m',i=>i.value)==='1,500','مارجین «1,500» در فرم ورود');
 ok(await p.evaluate(()=>num('f_m'))===1500,'خواندن مارجین با ویرگول درست است');
 // +/- اهرم
 await p.evaluate(()=>{$('#f_auto').checked=false;$('#f_l').value=5;$('#f_l').dispatchEvent(new Event('input'));});
 await p.click('.levst[data-d="1"]');await p.click('.levst[data-d="1"]');
 ok(await p.$eval('#f_l',i=>i.value)==='7','دکمه‌ی + اهرم: 5 → 7');
 await p.click('.levst[data-d="-1"]');ok(await p.$eval('#f_l',i=>i.value)==='6','دکمه‌ی − اهرم: 7 → 6');
 // 13) نوار لیکوئید/استاپ
 const bar=await p.evaluate(()=>{const b=document.querySelector('#riskBox .lsb');return b?b.className+' | '+b.querySelector('.lsbm').textContent:null;});
 ok(bar&&/ok/.test(bar),'نوار استاپ/لیکوئید: '+bar);
 await p.screenshot({path:require('./lib').out('crawl/ent_ok.png')});
 await p.evaluate(()=>{$('#f_l').value=100;$('#f_l').dispatchEvent(new Event('input'));});await p.waitForTimeout(200);
 const bar2=await p.evaluate(()=>document.querySelector('#riskBox .lsb')?.className);
 ok(/bad/.test(bar2||''),'اهرم 100: نوار قرمز '+bar2);
 await p.evaluate(()=>{S.openRisk=100;});   // سقف ریسک باز جدا تست می‌شود (gate)
 await p.click('#ok');await p.waitForTimeout(300);
 ok(dl.some(m=>/لیکوئید/.test(m))&&await p.evaluate(()=>!DB.decisions['ccoineres/920']),'ثبت با لیکوئید پیش از استاپ تأیید می‌خواهد (رد شد → ثبت نشد)');
 // 12) هشدار استاپ تنگ با ATR
 const vol=await p.evaluate(async()=>{VOLC.set('BTC',{at:Date.now(),atr:900,pct:1.4});return 1;});
 await p.evaluate(()=>{closeSheet();});await p.waitForTimeout(450);
 await p.evaluate(()=>{const pp=POSTS.find(x=>x.id.endsWith('/920'));sheetEnter(pp,sigOf(pp),OVERRIDE[pp.id]||{},PRICES.get('BTC'));});await p.waitForTimeout(800);
 const w=await p.evaluate(()=>[...document.querySelectorAll('#riskBox .rwarn')].map(x=>x.textContent).join(' | '));
 ok(/استاپ تنگ است|کمتر از دو برابر/.test(w),'هشدار نوسان: '+w.slice(0,140));
 await p.screenshot({path:require('./lib').out('crawl/ent_vol.png'),fullPage:false});
 console.log('errors',errs);console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
