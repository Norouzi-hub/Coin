/* رادار بازار: امتیاز لانگ/شورت از ۸ عامل، سنجش روی گذشته، اولویت‌بندی، تب «بازار» */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== موتور ===');
 const e=await p.evaluate(()=>{const H=36e5,t0=Math.floor(Date.now()/H)*H-1000*H;
   const mk=f=>{const C=[];let v=100;for(let i=0;i<1000;i++){const o=v;v=f(i,v);C.push({t:t0+i*H,o,h:Math.max(o,v)*1.002,l:Math.min(o,v)*0.998,c:v,v:1000+(i>995?3000:0)});}return C;};
   const up=mk((i,v)=>v*(1+0.002+0.004*Math.sin(i/7))), dn=mk((i,v)=>v*(1-0.002+0.004*Math.sin(i/7))), fl=mk((i,v)=>100+Math.sin(i/9)*0.8);
   const sc=C=>{const P=rdPrep(C,up);const s=rdScore(P,C.length-1);return {net:s.net,dir:rdDir(s.net),parts:s.parts};};
   const a=sc(up),b=sc(dn),c=sc(fl);
   // در طول روند صعودی (نه فقط کندل آخر): بیشترِ ۲۰۰ کندل آخر لانگ، هیچ‌کدام شورت
   const PU=rdPrep(up,up),dirs=[];for(let i=800;i<1000;i++)dirs.push(rdDir(rdScore(PU,i).net));
   a.longs=dirs.filter(x=>x==='long').length;a.shorts=dirs.filter(x=>x==='short').length;
   // پیش‌نگری نه: امتیازِ کندل i با کندل‌های بعدی عوض نمی‌شود
   const P1=rdPrep(up.slice(0,800),up), P2=rdPrep(up,up), s1=rdScore(P1,799).net, s2=rdScore(P2,799).net;
   const cal={};rdBacktest(rdPrep(up,up),cal);
   return {a,b:{net:b.net,dir:b.dir,btc:b.parts.btc},c:{net:c.net,dir:c.dir},s1,s2,cal};});
 console.log('   ',JSON.stringify({a:e.a.net,b:e.b,c:e.c,s1:e.s1,s2:e.s2,cal:e.cal}));
 ok(e.a.longs>=120&&e.a.shorts===0&&e.a.parts.t4>0,'روند صعودی پایدار ← بیشتر لانگ ('+e.a.longs+' از 200)، هیچ شورت');
 ok(e.b.dir==='short'&&e.b.btc>0,'روند نزولی ← شورت؛ عامل بیت‌کوین (صعودی) خلافش حساب شد ('+e.b.net+')');
 ok(e.c.dir==='wait','بازار رنج ← «صبر» ('+e.c.net+')');
 ok(e.s1===e.s2,'امتیاز هر کندل فقط از گذشته (بی نگاه به آینده)');
 const k=Object.keys(e.cal);ok(k.length&&k.every(x=>/^long\|/.test(x))&&e.cal[k[0]].n>20,'سنجش گذشته: نمونه‌های لانگ در روند صعودی '+JSON.stringify(e.cal));

 console.log('=== اولویت و تب «بازار» ===');
 const t=await p.evaluate(()=>{const now=Date.now();['RDA','RDB','RDC','RDD'].forEach((x,i)=>{SYMBOLS.add(x);PRICES.set(x,10+i);});SYMVER++;
   const pl=(E,d)=>({dir:d,E,SL:d==='long'?E*0.98:E*1.02,TP:d==='long'?E*1.03:E*0.97,sd:0.02,rr:1.5});
   const parts={t4:1,t1:1,macd:1,rsi:0.6,brk:0,vol:0.5,btc:1,ext:0};
   RD={v:1,at:now,n:20,fund:{RDA:0.06,RDB:0.01},rank:['RDA','RDB','RDC','RDD'],
     calib:{'long|60+':{n:120,w:72,r:30},'long|45-60':{n:200,w:96,r:10},'short|30-45':{n:90,w:36,r:-9}},
     coins:{RDA:{net:52,dir:'long',parts,rsi:62,rv:1.3,atrPct:1,px:10,pl:pl(10,'long')},
            RDB:{net:75,dir:'long',parts,rsi:66,rv:1.9,atrPct:1,px:11,pl:pl(11,'long')},
            RDC:{net:-35,dir:'short',parts:{t4:-1,t1:-1,macd:-1,rsi:-0.3,brk:-1,vol:0,btc:1,ext:0},rsi:44,rv:1,atrPct:1,px:12,pl:pl(12,'short')},
            RDD:{net:12,dir:'wait',parts,rsi:51,rv:1,atrPct:1,px:13,pl:null}}};
   const L=rdList();bucket='live';sigFilter='mkt';go('signals',true);renderAll();
   const G=document.getElementById('glance'), it=[...G.querySelectorAll('.rdit')];
   return {order:L.map(x=>x.tk+':'+(x.ok?1:0)).join(','),segs:[...document.querySelectorAll('#fbar .fseg .fb span')].map(x=>x.textContent).join(','),
     n:[...document.querySelectorAll('#fbar .fseg .fb')][1].querySelector('i').textContent,
     items:it.map(x=>x.querySelector('.glit').textContent),first:it[0]&&it[0].textContent,wait:(G.querySelector('.rdwait')||{}).textContent||'',cards:document.querySelectorAll('#list .card').length,
     weak:it.filter(x=>x.classList.contains('weak')).length};});
 console.log('   ',JSON.stringify(Object.assign({},t,{first:t.first&&t.first.slice(0,200)})));
 ok(t.segs==='الان چه کنم؟,بازار,در انتظار,همه','تب «بازار» کنار «الان چه کنم؟»: '+t.segs);
 ok(t.order==='RDB:1,RDA:1,RDC:0,RDD:0','اولویت با سابقه‌ی امتیاز مشابه: RDB (+0.25R) بعد RDA (+0.05R)، شورت RDC (−0.1R) و صبر آخر — '+t.order);
 ok(t.n==='2'&&t.weak===1,'عدد تب = فرصت‌های با سابقه‌ی مثبت (۲)؛ شورت RDC «سابقه‌ی ضعیف»');
 ok(/^1RDBلانگامتیاز 75/.test(t.items[0])&&/72 بار|120 بار/.test(t.first)&&/✓ روند 4 ساعته صعودی/.test(t.first),'ردیف اول: رتبه، نماد، جهت، امتیاز، سابقه و دلیل‌ها');
 ok(/صبر/.test(t.wait)&&/RDD/.test(t.wait)&&t.cards===0,'«صبر» جدا؛ کارت پستی در این تب نیست');
 const f=await p.evaluate(()=>{const w=[...document.querySelectorAll('#glance .rdit')].find(x=>x.dataset.rd==='RDA');return w.textContent;});
 ok(/فاندینگ 0.06٪ \(لانگ‌ها شلوغ\)/.test(f),'فاندینگ بالا به‌عنوان اطلاع');
 await p.evaluate(()=>document.querySelector('#glance .rdit[data-rd="RDB"] [data-a="iso"]').click());await p.waitForTimeout(600);
 ok(await p.evaluate(()=>/RDB/.test(document.querySelector('#sheet').textContent)&&+document.querySelector('#f_e').value===11),'«ایزوله» فرم ورود RDB را باز کرد');
 await p.evaluate(()=>closeSheet());await p.waitForTimeout(400);
 const u=await p.evaluate(()=>{RDCAP={at:Date.now(),list:['BTC','USDT','ETH','USDC','STETH','XRP','WBTC','SOL','BNB','FDUSD','DOGE']};return rdUniverse(5).join(',');});
 ok(u==='BTC,ETH,XRP,SOL,BNB','فهرست ارزها بی استیبل و توکن‌های بسته‌بندی‌شده: '+u);
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
