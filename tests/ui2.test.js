/* طرح تازه‌ی سیگنال‌ها و پوزیشن‌ها: نوار وضعیت یک‌ردیفه، «الان چه کنم؟» با کارت وضعیت و بازار کل تاشو،
   کارت پست با «بازار و مبلغ» تاشو، پوزیشن‌ها با منبع و مرتب‌سازی در یک ردیف، آمار یک‌ردیفه و نوار استاپ تا تارگت */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== سیگنال‌ها ===');
 const s=await p.evaluate(()=>{go('signals',true);bucket='live';sigFilter='now';renderAll();const G=document.getElementById('glance');
   const st=document.getElementById('status').getBoundingClientRect().height;
   const h=G.querySelector('.glh'),sig=G.querySelector('.glsig');
   return {st,glnow:G.classList.contains('glnow'),head:h&&h.className,mk:!!G.querySelector('details.rdmk:not([open])'),mkst:!!G.querySelector('.rdmk .mkst, .rdmk .mdbox'),
     kv:sig?[...sig.querySelectorAll('.rdkv>div small:first-child')].map(x=>x.textContent).join(','):'',acts:sig?[...sig.querySelectorAll('[data-a]')].map(x=>x.dataset.a).join(','):'',sw:document.documentElement.scrollWidth};});
 console.log('   ',JSON.stringify(s));
 ok(s.st>0&&s.st<56,'نوار وضعیت یک ردیف ('+Math.round(s.st)+'px)');
 ok(s.glnow&&/\bgo\b/.test(s.head)&&s.mk&&s.mkst,'«الان چه کنم؟»: کارت وضعیت سبز، «بازار کل» تاشو (بسته) با همان حال بازار و دامیننس‌ها داخلش');
 ok(s.kv==='ورود,استاپ,تارگت'&&s.acts==='iso,form,skip,copy','کارت سیگنال: سه خانه‌ی ورود/استاپ/تارگت و همان دکمه‌ها');
 ok(s.sw<=392,'بی اسکرول افقی');

 const c=await p.evaluate(()=>{bucket='live';sigFilter='all';ACCOPEN=null;renderAll();
   const card=[...document.querySelectorAll('#list .card')].find(c=>c.querySelector('.advset'));if(!card)return null;
   const d=card.querySelector('.advset'),sum=d.querySelector('summary').textContent,closed=!d.open,id=card.dataset.id;
   d.querySelector('.mkttag').click();
   const c2=document.querySelector('#list .card[data-id="'+id+'"]'),ov=OVERRIDE[id]||{};
   return {sum,closed,mkt:ov.market,spot:!!(c2&&[...c2.querySelectorAll('.pill')].some(x=>x.textContent==='اسپات'))};});
 console.log('   ',JSON.stringify(c));
 ok(c&&c.closed&&/بازار و مبلغ/.test(c.sum)&&/فیوچرز/.test(c.sum),'کارت پست: «بازار و مبلغ: فیوچرز · …» تاشو و بسته');
 ok(c&&c.mkt==='spot'&&c.spot,'از داخلش اسپات انتخاب شد و کارت اسپات شد');

 console.log('=== پوزیشن‌ها ===');
 const q=await p.evaluate(()=>{go('positions',true);renderAll();
   const bar=document.querySelector('#posSrcBar .psrcbar'),sel=document.getElementById('posSort');
   const r1=bar&&bar.getBoundingClientRect(),r2=sel&&sel.getBoundingClientRect();
   const gram=DB.positions.find(x=>x.ticker==='GRAM'&&x.status==='open'),card=gram&&document.getElementById('pos-'+gram.id);
   const mini=card&&card.querySelector('.pmini'),dot=mini&&mini.querySelector('.pmdot');
   const st=document.querySelector('#posSummary .stats'),cells=st?[...st.children].map(x=>Math.round(x.getBoundingClientRect().top)):[];
   return {row:!!(r1&&r2)&&Math.abs((r1.top+r1.bottom)/2-(r2.top+r2.bottom)/2)<12,cells,mini:!!mini&&getComputedStyle(mini).display!=='none',lab:mini?mini.querySelector('.pmlab').textContent:'',
     dot:dot?parseFloat(dot.style.left):null,pct:card&&card.classList.contains('pct')};});
 console.log('   ',JSON.stringify(q));
 ok(q.row,'فیلتر منبع و مرتب‌سازی در یک ردیف');
 ok(q.cells.length===4&&new Set(q.cells).size===1,'چهار عدد آمار در یک ردیف');
 ok(q.pct&&q.mini&&/SL 1\.39/.test(q.lab)&&/TP2 1\.8/.test(q.lab)&&q.dot>55&&q.dot<70,'کارت بسته‌ی GRAM: نوار استاپ ← تارگت 2 با جای قیمت الان ('+q.dot+'٪)');
 const q2=await p.evaluate(()=>{const g=DB.positions.find(x=>x.ticker==='GRAM'&&x.status==='open');POSOPEN.add(g.id);renderPositions();
   const m=document.querySelector('#pos-'+g.id+' .pmini');const v=m?getComputedStyle(m).display:'none';POSOPEN.delete(g.id);renderPositions();return v;});
 ok(q2==='none','کارت باز: نوار کوچک کنار می‌رود (نردبان کامل هست)');
 await p.screenshot({path:(process.env.TEST_OUT||'/tmp/signaldesk-tests')+'/logs/ui2.png',fullPage:true});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
