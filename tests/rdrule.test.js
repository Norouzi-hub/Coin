/* (LATE: «هنوز نرفته» و ماشه ✗ ولی 3/7 ← قاعده دارد، با هشدار «دیر رسیده‌ای»)
   قاعده‌ی پول واقعی: پنج شرط (قابل گرفتن، لانگ، هوا نه «نامناسب»، چک‌لیست ≥3، استاپ 2–8٪)؛ نشان روی کارت، فیلتر، مرتب‌سازی،
   خلاصه در کارت وضعیت، پرسش پیش از «ایزوله» برای سیگنال بی‌قاعده، و جدولش در «آزمایشی» */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[],dlg=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dlg.push(d.message());d.dismiss();});
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const H=36e5,T0=Math.floor(Date.now()/H)*H-H,W=ms=>new Promise(r=>setTimeout(r,ms)),o={};
   // هوای خوب برای لانگ؛ عامل‌هایی که چک‌لیست را 4/7 می‌کنند (هوا، جریان، هنوز نرفته، ماشه)
   const good={btc:0.5,mtot:0.5,mmc:0.5,mt3:0.5,mud:0.5,mom:-0.2,rs:-0.1,vwap:0.5,bbp:0.5};
   const mk=(dir,sd,parts)=>({dir,best:dir,sc:85,sL:85,sS:20,since:T0,p:0.6,t:T0,px:1,parts:Object.assign({},parts),pl:{dir,E:1,SL:1-(dir==='long'?1:-1)*sd,TP:1,sd,rr:1.5}});
   RD.coins={GOOD:mk('long',0.04,good),WIDE:mk('long',0.15,good),SHRT:mk('short',0.04,good),LATE:mk('long',0.04,Object.assign({},good,{mom:0.8,rs:0.6,vwap:-0.5}))};
   RD.rank=Object.keys(RD.coins);RD.at=Date.now();
   // همه «قابل گرفتن» فرض شوند (ستاره‌ها)
   RD.calib={long:{n:100,w:60,r:20},'long|85-95':{n:100,w:60,r:20,g:30,lb:0.15},short:{n:100,w:60,r:20},'short|85-95':{n:100,w:60,r:20,g:30,lb:0.15}};
   const L=rdList();o.ok=L.map(x=>x.tk+':'+x.ok+':'+x.why).join(',');
   o.rule=Object.fromEntries(L.map(x=>{const u=rdRuleX(x);return [x.tk,u.n+(u.pass?'P':'')+'|'+u.fails.join('/')];}));
   RDV='sig';VIEW.mktReal=false;VIEW.rdSort='def';go('radar',true);renderAll();await W(80);
   const card=t=>document.querySelector('#rdView .rdit[data-rd="'+t+'"]');
   o.goodCard=(card('GOOD').querySelector('.rdvd.real')||{}).textContent||'';o.wideCard=(card('WIDE').querySelector('.rdrule')||{}).textContent||'';
   o.lateWarn=(card('LATE').querySelector('.rdrule')||{}).textContent||'';
   o.hero=document.querySelector('#rdView details.rdhero summary').textContent;o.heroBody=(document.querySelector('#rdView .rdrulebox')||{}).textContent||'';
   VIEW.mktReal=true;renderRadar();await W(50);o.filtered=[...document.querySelectorAll('#rdView .rdit')].map(w=>w.dataset.rd).join();VIEW.mktReal=false;
   VIEW.rdSort='real';renderRadar();await W(50);o.sorted=[...document.querySelectorAll('#rdView .rdit')].map(w=>w.dataset.rd)[0];VIEW.rdSort='def';renderRadar();await W(50);
   // ایزوله روی سیگنال بی‌قاعده: پرسش
   card('WIDE').querySelector('[data-a="iso"]').click();await W(250);
   // جدول آزمایشی
   const base={k:'test',E:1,SL:0.96,rr:1.5,st:'sl',xt:Date.now(),t:Date.now()-H,stars:3,why:null,pv:good,ck:{n:4,k:6,it:[1,1,1,null,1,1,null]}};
   const D=[0,1,2,3,4,5].map(n=>Object.assign({},base,{id:'q'+n,tk:'Q'+n,dir:n<3?'long':'short',sd:0.04,R:n<3?1:-1}));
   o.tbl=rbRuleHtml(D).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');o.p0=rbRule(D[0]).pass;o.p3=rbRule(D[3]).pass;
   o.sw=document.documentElement.scrollWidth;
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,1600));
 ok(/^5P/.test(r.rule.GOOD)&&/^4\|/.test(r.rule.WIDE)&&/استاپ 15/.test(r.rule.WIDE)&&/شورت است/.test(r.rule.SHRT)&&/^5P/.test(r.rule.LATE)&&/دیر رسیده‌ای/.test(r.lateWarn),'پنج شرط: GOOD و LATE هر 5 (LATE با هشدار «دیر رسیده‌ای»)؛ WIDE استاپ پهن؛ SHRT شورت');
 ok(/هر 5 شرط درست/.test(r.goodCard)&&/پول واقعی 4\/5/.test(r.wideCard)&&/پهن/.test(r.wideCard),'کارت: نشان «قاعده‌ی پول واقعی» یا «پول واقعی n/5: فقط تست» با شرط‌های رد');
 ok(/پول واقعی: 2/.test(r.hero)&&/GOOD، LATE/.test(r.heroBody)&&/استاپ 2 تا 8٪/.test(r.heroBody),'کارت وضعیت: «💰 پول واقعی: 2» و متن قاعده با نام سیگنال‌ها');
 ok(r.filtered==='GOOD,LATE'&&r.sorted==='GOOD','فیلتر و مرتب‌سازی «قاعده‌ی پول واقعی»');
 ok(dlg.some(m=>/قاعده‌ی پول واقعی را ندارد/.test(m)&&/استاپ 15/.test(m)),'«ایزوله» روی سیگنال بی‌قاعده اول می‌پرسد');
 ok(r.p0&&!r.p3&&/هر 5 شرط 3 100٪ \+1.00R/.test(r.tbl)&&/بقیه 3 0٪ −1.00R/.test(r.tbl),'آزمایشی: جدول تست‌های با قاعده در برابر بقیه');
 ok(r.sw<=392,'بی اسکرول افقی ('+r.sw+')');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
