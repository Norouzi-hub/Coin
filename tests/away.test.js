/* وقتی برنامه بسته بود: سقف زمان پوزیشن رادار، منتظری که به تریگر رسید، خلاصه‌ی تست‌ها؛ و تأیید ورود 5 دقیقه‌ای رادار */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);
 await p.addInitScript(()=>{const db=JSON.parse(localStorage.getItem('signaldesk.v1'));const H=36e5,n=Date.now();
   // پوزیشن رادار با سقف 24 ساعت که یک ساعت پیش تمام شده؛ برنامه 25 ساعت بسته بوده
   db.positions.push({id:'rd1',sigId:'radar/SOL/1',ticker:'SOL',dir:'long',kind:'futures',entry:155,stop:120,stop0:120,margin:10,lev:2,baseMargin:10,
     openedAt:n-25*H,until:n-H,untilAuto:true,iso:true,status:'open',targets:[],partials:[],log:[]});
   // همان، بی untilAuto (قاعده‌ی من): فقط یادآوری، بسته نمی‌شود
   db.positions.push({id:'rd2',ticker:'SOL',dir:'long',kind:'futures',entry:155,stop:120,stop0:120,margin:10,lev:2,baseMargin:10,
     openedAt:n-25*H,until:n-H,status:'open',targets:[],partials:[],log:[]});
   // منتظر XRP که آخرین بار دو ساعت پیش سنجیده شده؛ قیمت در این فاصله از 2.06 بالاتر رفته
   db.pending.push({id:'wx',postId:'ccoineres/960',ticker:'XRP',dir:'long',trigger:2.06,side:'up',market:'futures',entry:2.06,stop:2,targets:[2.2],at:n-3*H,hit:null});
   localStorage.setItem('signaldesk.v1',JSON.stringify(db));
   localStorage.setItem('signaldesk.pendseen.v1',JSON.stringify({wx:n-2*H}));
   // تست آزمایشیِ باز از 30 ساعت پیش (سقف 24 ساعت)
   localStorage.setItem('signaldesk.rdbook.v1',JSON.stringify({items:[{id:'t1',k:'test',tk:'SOL',dir:'long',t:n-30*H,E:150,SL:147,TP:154.5,sd:0.02,rr:1.5,st:'open',ex:'lad',x:{rem:1,acc:0,stop:-1,k:0,peak:0,be:false}}]}));});
 await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(9000);
 const r=await p.evaluate(()=>{const q=id=>DB.positions.find(x=>x.id===id),w=DB.pending.find(x=>x.id==='wx'),t=RB.items.find(x=>x.id==='t1');
   const msgs=[...(typeof ADV!=='undefined'&&ADV.items?ADV.items:[])].map(x=>x.title).concat([...document.querySelectorAll('.toast')].map(x=>x.textContent)).join(' | ');
   return {rd1:{st:q('rd1').status,by:q('rd1').autoBy,at:q('rd1').closedAt-q('rd1').until,x:q('rd1').exitPrice},rd2:q('rd2').status,
     w:{hit:!!w.hit,away:!!w.hitAway},t:{st:t.st,R:t.R},msgs,log:LOG.slice(-8).map(x=>x.m).join(' | ')};});
 console.log('   ',JSON.stringify(r).slice(0,900));
 ok(r.rd1.st==='closed'&&r.rd1.by==='time'&&Math.abs(r.rd1.at)<1&&r.rd1.x>140,'پوزیشن رادار: سقف 24 ساعت وقتی برنامه بسته بود گذشت ← همان لحظه بسته شد');
 ok(r.rd2==='open','پوزیشن بی «بستن خودکار در سقف زمان» باز ماند (فقط یادآوری)');
 ok(r.w.hit&&r.w.away,'منتظر: رسیدن به تریگر در نبودِ برنامه از کندل پیدا و ثبت شد');
 ok(r.t.st!=='open'&&r.t.R!=null,'تست آزمایشی از 30 ساعت پیش: از کندل‌ها نتیجه گرفت ('+r.t.st+' '+r.t.R+'R)');
 ok(/وقتی برنامه بسته بود/.test(r.msgs+r.log),'پیغام «وقتی برنامه بسته بود …»');

 console.log('=== تأیید ورود 5 دقیقه‌ای (بولینگر و RSI) ===');
 const c=await p.evaluate(async()=>{const d=await rdConf('SOL');const x={tk:'SOL',dir:d.side};
   const h=rdConfHtml(x), x2={tk:'SOL',dir:d.side==='long'?'short':'long'}, h2=rdConfHtml(x2);
   return {side:d.side,act:d.act,why:d.why,h:h.replace(/<[^>]+>/g,''),h2:h2.replace(/<[^>]+>/g,'')};});
 console.log('   ',JSON.stringify(c));
 ok(c.side&&c.h.length>10&&c.h2.length>10&&c.h!==c.h2,'تأیید ورود برای هر دو جهت متن جدا دارد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
