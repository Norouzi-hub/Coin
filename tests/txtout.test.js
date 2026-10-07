/* خروجی متنی سیگنال‌ها (جای لینک خروجی) و یک کارتِ «خلاصه + الان چه کنم؟» و نوار فیلتر دوبخشی */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900},acceptDownloads:true});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== متن ===');
 const t=await p.evaluate(()=>{DB.decisions['ccoineres/918']={action:'skipped',at:Date.now()};save();
   return {all:txText(60,false),open:txText(60,true),day:txText(1,false)};});
 const L=t.all.text.trim().split('\n');console.log('    '+L.slice(0,4).join('\n    '));
 ok(L[0].startsWith('# signaldesk @ccoineres')&&L[1]==='# TIME | TICKER | DIR | MARKET | ENTRY | SL | TP | LEV | STATUS | LINK','دو خط توضیح با «#»');
 const btc=L.find(x=>/\| BTC \| LONG \|/.test(x)&&/ENTRY 64800/.test(x));
 ok(btc&&/^\d{4}-\d\d-\d\d \d\d:\d\d \| BTC \| LONG \| FUTURES \| ENTRY 64800 \| SL 63500 \| TP 66000,67500 \| LEV - \| STATUS open \| https:\/\/t\.me\/ccoineres\/920$/.test(btc),'یک خط کامل با عدد انگلیسی: '+btc);
 ok(L.some(x=>/\| SOL \| LONG \| SPOT \|/.test(x)),'اسپات: SPOT');
 ok(L.some(x=>/\| ETH \| SHORT \|.*STATUS skipped/.test(x)),'تصمیم «نگرفتم» ← STATUS skipped');
 ok(!L.some(x=>/خبر|کمپین/.test(x)),'خبر و اطلاع‌رسانی نمی‌آیند');
 ok(t.open.n<t.all.n&&!/STATUS (skipped|taken|expired)/.test(t.open.text),'«فقط باز»: '+t.open.n+' از '+t.all.n);
 ok(t.day.n<t.all.n,'بازه‌ی ۲۴ ساعت کمتر: '+t.day.n);

 console.log('=== تنظیمات ===');
 await p.evaluate(()=>{document.querySelector('.tab[data-v="more"]').click();document.querySelector('.moreit[data-go="settings"]').click();});await p.waitForTimeout(400);
 const ui=await p.evaluate(()=>{const d=document.querySelector('details[data-sec="txtout"]');d.open=true;d.dispatchEvent(new Event('toggle'));
   return {feed:!!document.querySelector('[data-sec="feed"],#feedBox'),prev:document.querySelector('#txPrev').value};});
 ok(!ui.feed,'بخش «لینک خروجی» برداشته شد');
 ok(/ENTRY 64800/.test(ui.prev),'پیش‌نمایش در تنظیمات');
 const [dlf]=await Promise.all([p.waitForEvent('download'),p.click('#txDl')]);
 ok(/^signals-ccoineres\.txt$/.test(dlf.suggestedFilename()),'دانلود: '+dlf.suggestedFilename());
 await p.evaluate(()=>closeSheet&&document.querySelector('#setClose,#sClose,.sheet .x')?.click());

 console.log('=== یک کارت بالای سیگنال‌ها، دو بخش فیلتر ===');
 const top=await p.evaluate(()=>{go('signals',true);bucket='live';sigFilter='new';renderAll();paintGlance();
   const c=document.getElementById('topcard');return {kids:[...c.children].map(x=>x.id),segs:[...document.querySelectorAll('#fbar .fseg .fb span')].map(x=>x.textContent)};});
 ok(top.kids.join(',')==='status','کارت خلاصه بالای صفحه؛ «الان چه کنم؟» تبِ خودش را دارد');
 ok(top.segs.join(',')==='الان چه کنم؟,بازار,در انتظار,همه','نوار فیلتر: «الان چه کنم؟»، «بازار»، «در انتظار» و «همه»');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
