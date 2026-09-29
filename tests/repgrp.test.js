const {chromium}=require('./lib').pw;const {route,seed}=require('./fixture.js');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
 await route(p.context());await p.goto('http://localhost:8899/index.html');
 await p.evaluate(seed);
 // چند معامله‌ی بسته برای نمودار و پراکندگی
 await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('signaldesk.v1'));const now=Date.now(),H=36e5;
   const mk=(i,ex,st)=>({id:'c'+i,ticker:['BTC','ETH','SOL','XRP'][i%4],dir:'long',kind:'futures',entry:100,stop:st,stop0:st,margin:10,lev:5,baseMargin:10,
     openedAt:now-(40-i)*H*5,closedAt:now-(40-i)*H*4,exitPrice:ex,fees:0.05,status:'closed',partials:[],log:[]});
   [[104,98],[97,98],[110,98],[99,98],[106,97],[93,97],[101,99]].forEach(([e,s],i)=>d.positions.push(mk(i,e,s)));
   localStorage.setItem('signaldesk.v1',JSON.stringify(d));});
 await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);
 await p.evaluate(()=>{go('report',true);repPeriod='all';renderReport();});await p.waitForTimeout(300);
 const eq=await p.evaluate(()=>({ax:[...document.querySelectorAll('.eqax span')].map(s=>s.textContent),rd:document.querySelectorAll('.rdist .rdr').length,
   rdt:document.querySelector('.rdt')?.textContent}));
 ok(eq.ax.length===2&&eq.rd===7,'نمودار با تاریخ شروع/پایان و پراکندگی R: '+JSON.stringify(eq));
 await p.evaluate(()=>document.querySelector('.eqw').scrollIntoView({block:'center'}));await p.waitForTimeout(200);const svg=await p.$('.eqw svg');const bb=await svg.boundingBox();
 await p.mouse.click(bb.x+bb.width*0.5,bb.y+bb.height/2);await p.waitForTimeout(200);
 const cap=await p.$eval('.eqcap',e=>e.textContent);
 ok(/جمع/.test(cap),'زدن روی نمودار جزئیات معامله: '+cap);
 await p.evaluate(()=>document.querySelector('.eqw').scrollIntoView());await p.screenshot({path:require('./lib').out('crawl/rep_eq.png')});
 // 23) توضیح پشت ؟
 await p.evaluate(()=>go('audit',true));await p.waitForTimeout(600);
 const inf=await p.evaluate(()=>({hid:document.getElementById('audInfo').classList.contains('hide')}));
 ok(inf.hid,'توضیح کانال‌سنج پیش‌فرض پنهان');
 await p.click('#audInfoB');ok(await p.evaluate(()=>!document.getElementById('audInfo').classList.contains('hide')&&document.getElementById('audInfoB').getAttribute('aria-expanded')==='true'),'«؟» توضیح را باز می‌کند');
 // 21) شمارش فیلتر دیرهنگام
 const fs=await p.evaluate(()=>{const s=document.querySelector('.audf summary');return {t:s.textContent,open:s.parentElement.open};});
 ok(/1 فیلتر \(دیرهنگام\)/.test(fs.t)&&!fs.open,'فیلتر پیش‌فرض شمرده می‌شود ولی بخش بسته می‌ماند: '+fs.t);
 // 30) برچسب وضعیت
 await p.evaluate(()=>go('signals',true));await p.waitForTimeout(300);
 const hs=await p.evaluate(()=>({t:document.querySelector('#hsTxt em').textContent,vis:!!document.getElementById('hsTxt').getClientRects().length,dots:!!document.getElementById('hsTg').getClientRects().length}));
 ok(hs.vis&&!hs.dots&&/آنلاین/.test(hs.t),'برچسب وضعیت روی گوشی: '+JSON.stringify(hs));
 await p.screenshot({path:require('./lib').out('crawl/hdr_status.png'),clip:{x:0,y:0,width:390,height:80}});
 // 26) یکدستی چیپ‌ها
 const ch=await p.evaluate(()=>{go('audit',true);document.querySelector('.audf').open=true;
   const hs=[...document.querySelectorAll('.catchip,.fc,.pbc')].filter(e=>e.getClientRects().length).map(e=>Math.round(e.getBoundingClientRect().height)+'/'+getComputedStyle(e).borderRadius);
   return [...new Set(hs)];});
 ok(ch.length===1,'همه‌ی چیپ‌های قرصی یک اندازه و گردی: '+ch);
 console.log('errors',errs);console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
