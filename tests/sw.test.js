const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{window.__SD_SW=1;});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForTimeout(1500);
 const st=await p.evaluate(async()=>({ctrl:!!navigator.serviceWorker.controller||!!(await navigator.serviceWorker.getRegistration()),
   keys:await caches.keys(),n:(await (await caches.open('signaldesk-shell-v1')).keys()).length,on:SW_ON}));
 ok(st.on&&st.keys.includes('signaldesk-shell-v1')&&st.n>=5,'سرویس‌ورکر ثبت شد و فایل‌های برنامه در حافظه‌اند ('+st.n+')');
 await p.reload({waitUntil:'load'});await p.waitForTimeout(800);
 ok(await p.evaluate(()=>!!navigator.serviceWorker.controller),'صفحه زیر کنترل سرویس‌ورکر است');
 await ctx.setOffline(true);
 await p.reload({waitUntil:'load'});await p.waitForTimeout(1500);
 const off=await p.evaluate(()=>({title:document.title,boot:!!document.querySelector('#vSignals'),font:document.fonts.check('16px Vazirmatn')}));
 ok(off.boot,'بدون اینترنت هم برنامه باز شد — '+off.title);
 await ctx.setOffline(false);
 // درخواست بیرونی از حافظه نمی‌آید
 const ext=await p.evaluate(async()=>{try{await fetch('https://api.binance.com/api/v3/ping',{cache:'no-store'});return 'net';}catch(e){return 'err';}});
 ok(await p.evaluate(async()=>(await (await caches.open('signaldesk-shell-v1')).keys()).every(r=>r.url.startsWith(location.origin))),'فقط فایل‌های خود برنامه در حافظه‌اند، نه داده‌ی بیرونی');
 // پیام نسخه‌ی تازه
 await p.evaluate(()=>showUpdateBar());
 ok(await p.evaluate(()=>!document.querySelector('#updBar').classList.contains('hide')&&document.querySelector('#updBar').textContent.includes('نسخه‌ی تازه')),'نوار «نسخه‌ی تازه» با دکمه‌ی بارگذاری');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
