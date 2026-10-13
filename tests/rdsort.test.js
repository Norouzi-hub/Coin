/* سیگنال‌های رادار: «سیگنال از … پیش» و خط «ورود و استاپ از کندل …»، مرتب‌سازی (ماندگار)، سن سیگنال با هر تست و جدولش */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const H=36e5,T0=Math.floor(Date.now()/H)*H-H,W=ms=>new Promise(r=>setTimeout(r,ms)),o={};
   const mk=(tk,sc,since,sd,nw)=>({dir:'long',best:'long',sc,sL:sc,sS:20,since,nw:!!nw,p:sc/100,t:T0,px:100,parts:{btc:0.5,mtot:0.5,mmc:0.5},pl:{dir:'long',E:100,SL:100*(1-sd),TP:100*(1+sd*1.5),sd,rr:1.5}});
   RD.coins={AAA:mk('AAA',80,T0-18*H,0.05),BBB:mk('BBB',90,T0+H,0.03,true),CCC:mk('CCC',85,T0-5*H,0.10)};RD.rank=['AAA','BBB','CCC'];RD.at=Date.now();
   S.rdWx=false;RDV='sig';VIEW.rdSort='def';go('radar',true);renderAll();await W(100);
   const order=()=>[...document.querySelectorAll('#rdView .rdit')].map(w=>w.dataset.rd).join();
   const card=document.querySelector('#rdView .rdit[data-rd="AAA"]');
   o.age=(card.querySelector('.rdage')||{}).textContent||'';o.time=(card.querySelector('.rdtime')||{}).textContent||'';
   o.newTime=!!document.querySelector('#rdView .rdit[data-rd="BBB"] .rdtime');
   const sel=document.querySelector('#rdView .rdlisth select');o.opts=sel?sel.options.length:0;
   const pick=async v=>{const s=document.querySelector('#rdView .rdlisth select');s.value=v;s.dispatchEvent(new Event('change'));await W(80);return order();};
   o.sc=await pick('sc');o.nw=await pick('new');o.old=await pick('old');o.sd=await pick('sd');o.tk=await pick('tk');
   o.saved=JSON.parse(localStorage.getItem(VIEWKEY)||'{}').rdSort;
   // تست: سن سیگنال ثبت می‌شود
   PRICES.set('AAA',99);const it=rbAdd('test',Object.assign({tk:'AAA',stars:0},RD.coins.AAA),true);o.sn=it&&it.sn===RD.coins.AAA.since;o.ageH=it&&+rbAgeH(it).toFixed(1);
   // جدول سن: 6 تست بسته‌ی ساختگی
   const base={k:'test',dir:'long',E:100,SL:95,sd:0.05,rr:1.5,st:'sl',xt:Date.now()};
   const D=[[1,1],[1.5,-1],[4,0.5],[10,-1],[30,-1],[30,-1]].map(([h,R],n)=>Object.assign({},base,{id:'g'+n,tk:'G'+n,t:Date.now()-H,sn:Date.now()-H-h*H,R}));
   o.tbl=rbAgeHtml(D).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');o.few=rbAgeHtml(D.slice(0,3)).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
   o.hh=rdHH(new Date(2026,9,13,13,30).getTime());
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,1400));
 ok(/سیگنال از/.test(r.age)&&/ساعت پیش/.test(r.age),'سرکارت: «سیگنال از … ساعت پیش» ('+r.age+')');
 ok(/ورود و استاپ از کندل ساعت/.test(r.time)&&/برقرار است/.test(r.time)&&!r.newTime,'خط «ورود و استاپ از کندل … ؛ خود سیگنال از …» فقط برای سیگنال قدیمی‌تر');
 ok(r.opts===10,'10 گزینه‌ی مرتب‌سازی');
 ok(r.sc==='BBB,CCC,AAA'&&r.nw==='BBB,CCC,AAA'&&r.old==='AAA,CCC,BBB'&&r.sd==='BBB,AAA,CCC'&&r.tk==='AAA,BBB,CCC','امتیاز، تازه‌ترین، قدیمی‌ترین، استاپ نزدیک‌تر، الفبا');
 ok(r.saved==='tk','انتخاب مرتب‌سازی می‌ماند');
 ok(r.sn&&r.ageH>=18&&r.ageH<=20,'تست: شروع سیگنال و سنش ثبت شد ('+r.ageH+' ساعت)');
 ok(/تازه \(تا 2 ساعت\)/.test(r.tbl)&&/بیش از 24 ساعت/.test(r.tbl)&&/−1.00R/.test(r.tbl)&&/\+0.50R/.test(r.tbl),'جدول «نتیجه به تفکیک سن سیگنال»');
 ok(/بعد از 5 تست/.test(r.few),'کمتر از 5 تست: توضیح به‌جای جدول');
 ok(r.hh==='13:30','ساعت کندل با دقیقه (13:30، نه 13:00)');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
