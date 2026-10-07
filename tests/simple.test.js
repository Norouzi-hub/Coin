/* پیشنهادهای ۳۹ تا ۴۳: «الان چه کنم؟»، فقط ضروری، پنل تنبل، عکس با زدن، میان‌برهای آیکون */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);

 console.log('=== ۳۹: الان چه کنم؟ ===');
 const g=await p.evaluate(()=>{
   SYMBOLS.add('GLA');SYMVER++;const now=Date.now();
   POSTS.unshift({id:'ccoineres/96001',num:96001,text:'#GLA لانگ\nورود 100\nحد ضرر 95\nتارگت 110',date:new Date(now-20*60000),link:'x'});
   PRICES.set('GLA',100.1);KGEN++;Object.assign(S,{riskUsd:2});
   DB.positions=[ensureBase({id:'gp1',ticker:'BTC',kind:'futures',dir:'long',entry:100,stop:95,stop0:95,margin:10,lev:5,targets:[],openedAt:now-36e5,until:now+2*36e5,status:'open',partials:[],log:[]})];
   bucket='live';sigFilter='new';go('signals',true);renderAll();
   const G=document.getElementById('glance');
   return {head:G.querySelector('.glh')?.textContent||'',items:[...G.querySelectorAll('.glit')].map(x=>x.textContent)};});
 console.log('   ',JSON.stringify(g));
 ok(/الان چه کنم؟/.test(g.head)&&/سیگنال قابل گرفتن/.test(g.head),'سربرگ: «الان چه کنم؟» با تعداد سیگنال‌های قابل گرفتن');
 ok(g.items.some(x=>/GLA/.test(x)&&/ایزوله/.test(x))&&g.items.some(x=>/BTC/.test(x)&&/تا پایان مهلت/.test(x)),'سیگنال GLA با اندازه‌ی ایزوله، و مهلت پوزیشن BTC');
 await p.evaluate(()=>document.querySelector('#glance .glit[data-sig]').click());await p.waitForTimeout(500);
 ok(await p.evaluate(()=>view==='signals'&&ACCOPEN==='ccoineres/96001'),'زدن روی سیگنال: کارتش باز شد');
 await p.evaluate(()=>document.querySelector('#glance .glh').click());await p.waitForTimeout(200);
 ok(await p.evaluate(()=>document.getElementById('glance').classList.contains('shut')&&!document.querySelector('#glance .glb')&&!!localStorage.getItem('signaldesk.glance.v1')),'جمع شد و یادش می‌ماند');

 console.log('=== ۴۱: پنل تنبل ===');
 const lz=await p.evaluate(()=>{AUDOPEN='کارنامه‌ی کانال';go('audit',true);renderAudit();
   const x=document.querySelector('#audBody [data-acc="خروج"]');const before={lazy:x&&x.dataset.lazy==='1',tab:!!(x&&x.querySelector('.xtab'))};
   x.querySelector('.panelhead').click();
   const y=document.querySelector('#audBody [data-acc="خروج"]');
   return {before,after:{lazy:!!y.dataset.lazy,open:!y.classList.contains('shut'),body:y.querySelectorAll('.xview').length}};});
 console.log('   ',JSON.stringify(lz));
 ok(lz.before.lazy&&!lz.before.tab,'پنل بسته‌ی «خروج» فقط سربرگ دارد (ساخته نشده)');
 ok(!lz.after.lazy&&lz.after.open&&lz.after.body===2,'با زدن: ساخته و باز شد');

 console.log('=== ۴۰: فقط ضروری ===');
 const li=await p.evaluate(()=>{S.feat.lite=true;renderAudit();const acc=[...document.querySelectorAll('#audBody [data-acc]')].map(x=>x.dataset.acc);
   S.feat.lite=false;renderAudit();return acc;});
 console.log('    '+li.join('، '));
 ok(!li.includes('نوسان‌سنج')&&!li.includes('صحت‌سنجی')&&!li.includes('سرمایه و الگوها')&&li.includes('خروج')&&li.includes('کارنامه‌ی کانال'),'«فقط ضروری»: پنل‌های تحلیلی پنهان، کارنامه و خروج می‌مانند');

 console.log('=== ۴۲: عکس فقط با زدن ===');
 const im=await p.evaluate(async()=>{S.feat.imgtap=true;
   const s=postShot({id:'x/1',img:'https://cdn4.telesco.pe/file/a.jpg',link:'l'});document.body.appendChild(s);
   const before={btn:!!s.querySelector('.tapload'),src:s.querySelector('img').getAttribute('src')};
   s.querySelector('.tapload').click();const after=s.querySelector('img').getAttribute('src');S.feat.imgtap=false;s.remove();return {before,after};});
 ok(im.before.btn&&!im.before.src&&/a\.jpg/.test(im.after),'عکس تا «نمایش تصویر» دانلود نمی‌شود');

 console.log('=== ۴۳: میان‌برها ===');
 const mf=await p.evaluate(async()=>(await (await fetch('manifest.webmanifest')).json()).shortcuts.map(s=>s.url).join(' '));
 ok(/v=signals/.test(mf)&&/v=positions/.test(mf)&&/v=audit/.test(mf)&&/v=bell/.test(mf),'manifest: چهار میان‌بر');
 await p.goto('http://localhost:8899/index.html?v=positions');await p.waitForTimeout(2500);
 ok(await p.evaluate(()=>view==='positions'&&!location.search),'?v=positions مستقیم پوزیشن‌ها را باز کرد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
