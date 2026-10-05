/* منوی «سایر»، تب اسکلپ و اسکلپ زنده: باز شدن، بستن سر تارگت و برعکس، استاپ، بستن دستی، توقف و پر کردن فاصله با کندل */
const {pw,out}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);

 console.log('=== ناوبری ===');
 const tabs=await p.evaluate(()=>[...document.querySelectorAll('.tab')].map(t=>t.dataset.v).join(','));
 ok(tabs==='signals,positions,scalp,report,more','تب‌ها: '+tabs);
 await p.click('.tab[data-v="more"]');await p.waitForTimeout(400);
 const m=await p.evaluate(()=>({vis:!document.querySelector('#vMore').classList.contains('hide'),
   items:[...document.querySelectorAll('.moreit')].map(x=>x.dataset.go).join(','),aud:!!document.querySelector('.moreit #cAud'),learn:!!document.querySelector('.moreit #cLearn')}));
 ok(m.vis&&m.items==='audit,learn,settings','منوی سایر: '+m.items);
 ok(m.aud&&m.learn,'شمارنده‌های کانال‌سنج و آموزش داخل منو');
 await p.click('.moreit[data-go="audit"]');await p.waitForTimeout(800);
 const a=await p.evaluate(()=>({aud:!document.querySelector('#vAudit').classList.contains('hide'),
   sel:document.querySelector('.tab[aria-selected="true"]').dataset.v,sw:!!document.querySelector('#audBody .swp'),tok:!!document.querySelector('#audBody #swTk')}));
 ok(a.aud&&a.sel==='more','کانال‌سنج باز شد و تب «سایر» روشن ماند');
 ok(a.sw&&!a.tok,'در کانال‌سنج فقط نوسانِ سیگنال‌ها هست، نه ابزار توکن');
 await p.click('#vAudit .crumb');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!document.querySelector('#vMore').classList.contains('hide')),'دکمه‌ی «سایر» برمی‌گرداند');
 await p.click('.moreit[data-go="learn"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!document.querySelector('#vLearn').classList.contains('hide')&&document.querySelector('.tab[aria-selected="true"]').dataset.v==='more'),'آموزش هم زیر سایر');
 await p.evaluate(()=>{const n=document.querySelector('#cLearn');n.dataset.n='2';n.classList.remove('z');paintMoreBadge();});
 ok(await p.evaluate(()=>{const c=document.querySelector('#cMore');return !c.classList.contains('z')&&c.textContent.trim()!=='0';}),'نشان «سایر» جمع شمارنده‌هاست');

 console.log('=== تب اسکلپ ===');
 await p.evaluate(()=>{SWOPT.open='tok';});
 await p.click('.tab[data-v="scalp"]');await p.waitForTimeout(600);
 const sc=await p.evaluate(()=>({tok:!!document.querySelector('#scBody #swTk'),live:document.querySelector('#scLive')?.textContent||''}));
 ok(sc.tok,'ابزار بررسی توکن و ورود دستی در تب اسکلپ');
 ok(/اسکلپ‌های زنده/.test(sc.live)&&/هنوز اسکلپی/.test(sc.live),'بخش اسکلپ‌های زنده (خالی)');

 console.log('=== موتور زنده: رنج 100 ⇄ 110، استاپ 5 ===');
 const r=await p.evaluate(()=>{
   S.fee=0;
   const s=scStart({tk:'TST',L:100,H:110,d:5,lev:10,mg:10,first:'long'},false);
   let t=Date.now();const log=[];
   const step=px=>{t+=1000;SCPX.set('TST',{px,at:t});checkScalp();const z=scList().find(x=>x.id===s.id);
     log.push(px+':'+(z.st.pos?z.st.pos.side+'@'+z.st.pos.en:'-')+':'+z.n);};
   [105,101,99.5,104,110.5,113,116,112,109,100,95].forEach(step);
   const z=scList().find(x=>x.id===s.id);
   return {log,tr:z.trades.map(x=>x.side+(x.win?'+':'-')+x.en+'>'+x.ex+':'+x.usd.toFixed(2)),usd:z.usd,n:z.n,w:z.w,l:z.l,id:s.id,
     badge:document.querySelector('#cScalp').textContent};
 });
 console.log('   ',r.log.join(' | '));console.log('   ',r.tr.join(' | '));
 ok(r.log[1].endsWith(':-:0')&&r.log[2].startsWith('99.5:long@100'),'تا قیمت به کف نرسیده صبر؛ با رد شدن از ۱۰۰ لانگ از ۱۰۰ باز شد');
 ok(r.tr[0]==='long+100>110:10.00','لانگ ۱۰۰ → ۱۱۰ با ۱۰x و $10: +$10');
 ok(r.log[4].startsWith('110.5:short@110'),'همان‌جا شورت از ۱۱۰');
 ok(r.tr[1]==='short-110>115:-4.55','شورت استاپ ۱۱۵ خورد: −$4.55');
 ok(r.log[7].startsWith('112:-')&&r.log[8].startsWith('109:short@110'),'بعد از استاپ صبر؛ برگشت به ۱۱۰ ← شورت تازه');
 ok(r.tr[2]==='short+110>100:9.09'&&r.log[9].startsWith('100:long@100'),'شورت سر کف بسته شد و لانگ باز شد');
 ok(r.tr[3]==='long-100>95:-5.00'&&r.n===4&&r.w===2&&r.l===2,'لانگ استاپ ۹۵؛ ۴ معامله، ۲ بُرد، ۲ باخت');
 ok(Math.abs(r.usd-(10-4.545+9.091-5))<0.01,'جمع '+r.usd.toFixed(2));

 console.log('=== کارت و دکمه‌ها ===');
 await p.evaluate(id=>{const s=scList().find(x=>x.id===id);let t=Date.now()+60000;SCPX.set('TST',{px:101,at:t});checkScalp();},r.id);
 await p.evaluate(()=>go('scalp',true));await p.waitForTimeout(400);
 const c=await p.evaluate(id=>{const k=document.querySelector('#sc-'+id);return {txt:k?.textContent||'',lad:!!k?.querySelector('.ladder'),
   btns:[...(k?.querySelectorAll('.srow button')||[])].map(x=>x.dataset.k).join(','),badge:document.querySelector('#cScalp').textContent.trim()};},r.id);
 ok(/باز/.test(c.txt)&&/لانگ/.test(c.txt)&&c.lad,'کارت شبیه پوزیشن: باز، لانگ، نردبان قیمت');
 ok(/روی\s*110\s*ببند و همان‌جا شورت/.test(c.txt.replace(/\s+/g,' ')),'قدم بعد: روی ۱۱۰ ببند و شورت بگیر');
 ok(c.btns==='close,stop,del','دکمه‌ها: '+c.btns);
 ok(c.badge!=='0','نشان تب اسکلپ: یک اسکلپ باز');
 const card=await p.$('#sc-'+r.id);if(card)await card.screenshot({path:out('scalplive.png')});
 await p.evaluate(id=>{SCPX.set('TST',{px:104,at:Date.now()+120000});document.querySelector('#sc-'+id+' button[data-k="close"]').click();},r.id);
 await p.waitForTimeout(300);
 const cl=await p.evaluate(id=>{const z=scList().find(x=>x.id===id);const t=z.trades[z.trades.length-1];return {pos:z.st.pos,by:t.by,ex:t.ex,usd:t.usd};},r.id);
 ok(!cl.pos&&cl.by==='man'&&cl.ex===104&&Math.abs(cl.usd-4)<1e-9,'بستن دستی روی ۱۰۴: +$4، منتظر کف یا سقف');
 await p.evaluate(id=>document.querySelector('#sc-'+id+' button[data-k="stop"]').click(),r.id);await p.waitForTimeout(300);
 ok(await p.evaluate(id=>!scList().find(x=>x.id===id).on&&!!document.querySelector('#sc-'+id+' button[data-k="resume"]'),r.id),'توقف ← دکمه‌ی ادامه');
 await p.evaluate(id=>document.querySelector('#sc-'+id+' button[data-k="resume"]').click(),r.id);await p.waitForTimeout(300);
 ok(await p.evaluate(id=>scList().find(x=>x.id===id).on,r.id),'ادامه');
 await p.evaluate(id=>document.querySelector('#sc-'+id+' button[data-k="del"]').click(),r.id);await p.waitForTimeout(300);
 ok(await p.evaluate(id=>!scList().find(x=>x.id===id)&&!document.querySelector('#sc-'+id),r.id),'حذف');
 await p.evaluate(()=>document.querySelector('#toast .tundo')?.click());await p.waitForTimeout(300);
 ok(await p.evaluate(id=>!!scList().find(x=>x.id===id),r.id),'برگرداندنِ حذف');
 ok(await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('signaldesk.v1'));return Array.isArray(d.scalps)&&d.scalps.length===1;}),'جلسه در داده‌ی ذخیره‌شده (پشتیبان و همگام‌سازی)');
 ok(await p.evaluate(()=>!DB.positions.some(x=>x.ticker==='TST')),'به پوزیشن‌ها و کارنامه اضافه نشد');

 console.log('=== برنامه بسته بوده: پر کردن فاصله با کندل ۱ دقیقه‌ای ===');
 const g=await p.evaluate(async()=>{
   const H=3600000,now=Date.now();
   // مسیر ساختگیِ BTC در fixture: از ۶۲۵۰۰ (۹۰ ساعت پیش) تا ۶۵۰۰۰ (الان) یکنواخت بالا می‌رود:
   // ۶۴۰۰۰ حدود ۳۶ ساعت پیش، ۶۴۹۰۰ حدود ۴ ساعت پیش
   const s=scStart({tk:'BTC',L:64000,H:64900,d:300,lev:5,mg:10,first:'long'},false);
   SCSEEN[s.id]={t:now-40*H,p:63900};          // آخرین سنجش ۴۰ ساعت پیش، زیر کف
   s.st.prev=63900;
   await scCatchUp([s]);
   const z=scList().find(x=>x.id===s.id);
   return {n:z.n,tr:z.trades.map(x=>x.side+(x.win?'+':'-')),pos:z.st.pos&&z.st.pos.side,seen:Date.now()-SCSEEN[s.id].t};
 });
 ok(g.n===1&&g.tr[0]==='long+'&&g.pos==='short','با کندل‌ها لانگ از کف باز و سر سقف بسته شد و شورت باز ماند ('+g.tr.join(',')+' · '+g.pos+')');
 ok(g.seen<5*60e3,'بعد از پر کردن، آخرین سنجش به الان رسید');

 console.log('=== شروع از کارت تصمیم ===');
 await p.evaluate(()=>{scStartSheet({tk:'BTC',first:'short',L:64000,H:65500,d:500,lev:20,mg:15});});await p.waitForTimeout(400);
 const sh=await p.evaluate(()=>({L:document.querySelector('#scL')?.value,H:document.querySelector('#scH')?.value,sl:document.querySelector('#scSL')?.value,f:document.querySelector('#scFirst')?.value,
   info:document.querySelector('#scInfo')?.textContent||''}));
 ok(sh.L==='64000'&&sh.H==='65500'&&sh.sl==='63500'&&sh.f==='short','فرم: کف، سقف، استاپ لانگ و جهت از کارت');
 ok(/استاپ شورت\s*66,?000/.test(sh.info),'استاپ شورت = سقف + همان فاصله: '+sh.info.slice(0,80));
 await p.evaluate(()=>{document.querySelector('#scGo').click();});await p.waitForTimeout(600);
 ok(await p.evaluate(()=>scList()[0].tk==='BTC'&&scList()[0].first==='short'&&scList()[0].lev===20&&view==='scalp'),'جلسه ساخته شد و تب اسکلپ باز شد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
