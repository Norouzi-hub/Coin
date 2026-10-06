/* پست‌های واقعی کانال که کانال‌سنج نمی‌خواند: هشدار لیکوئید، سیو سود، خبر، «تریگر/شکست X»،
   «رو X میانگین»، «ورود مجازه» (ورود با قیمت بازار) و ارث‌بردنِ استاپ و تارگت از سیگنالِ قبلیِ همان نماد */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2000);

 console.log('=== غیرسیگنال‌ها ===');
 const ns=await p.evaluate(()=>{for(const s of ['BTC','ETH','XRP','LINK','LDO','WLD','ADA','HBAR','SUSHI'])SYMBOLS.add(s);SYMVER++;
   return [
   '🟢 #BTC Liquidated Short: $89.5K at $85444.00\n\n4 ساعته بالای 85400 میخواییم',
   '🟢 #BTC Liquidated Short: $81.1K at $84012.50\n\nتارگت اول را داد مبارکه دوستان ✅',
   '#ETH\n\nلانگ اتریوم 25-35 درصد سیو کنید\nنظرم 2800 بود که بهش نرسید',
   '#BTC\n\nلانگ بیت رو 84000 اندازه 35 درصد سیو میکنید، اوردر ست کنید',
   '#BTC\n\nبعد شکست 87300 لانگ هامونو کم میکنیم، باید سومین شدو را بزنه فعلا برا سل مونده',
   'یکسری آلتکوینا بالا بیان مثل:\n\nXRP XLM DOGE\n\nطبق پلن تعداد پوزیشن هامو بعد شکست 87300 کم خواهم کرد.\nبرا بیت هم یه سل قبلا رو 90.6K با حد ضرر 93.5K دادم',
   'یکسری اخبار بیرون اومده که شی جین‌پینگ بمحض ورود به امریکا تو 83700 بیت کوین خریده'
   ].map(t=>parseSignal(t).isSignal);});
 console.log('   ',ns.join(' '));
 ok(!ns[0]&&!ns[1],'هشدار «Liquidated Short» سیگنال نیست (نمادِ خطِ لیکوئید مالِ پست نیست)');
 ok(!ns[2]&&!ns[3],'«سیو کنید/میکنید» مدیریتِ پوزیشن است، نه سیگنال');
 ok(!ns[4]&&!ns[5],'«لانگ‌ها را کم می‌کنیم» و «تعداد پوزیشن‌ها» سیگنال نیست');
 ok(!ns[6],'خبر سیگنال نیست');
 ok(await p.evaluate(()=>RX_RESULT.test('تارگت اول را داد مبارکه دوستان')),'«تارگت اول را داد» پستِ نتیجه است');

 console.log('=== پیگیری‌ها ===');
 const fs=await p.evaluate(()=>[
   '#LDO\n\nتریگر ورود 0.41 یا 0.51 ست کنید',
   '#BTC\n\nبرا ورود مجدد منتظر شکست 84500 تو 4 ساعته باشید',
   '#HBAR\n\nیک پله الان و اگر پایینی زد رو 0.091 میانگین بزنید',
   '#ADA\n\nورود مجدد مجازه، یک پله اینجا و اگر پایینی داد رو 0.24 میانگین بزنید.',
   '#BTC\n\nمجدد با حد ضرر 81K ورود\nریسک یک درصد',
   '#WLD\n\nورود جدید مجازید',
   '#BTC\n\nاینجا ورود مجازه با حدضرر 81000\nنقطه ورود: زیر 83300'
   ].map(t=>{const s=parseSignal(t);return [s.isSignal?1:0,s.entry,s.trigger,s.tier2,s.stop,s.mktEntry?'M':''].join('/');}));
 console.log('   ',fs.join(' | '));
 ok(fs[0]==='1/0.41/0.41///','«تریگر ورود 0.41» ← تریگر و ورود');
 ok(fs[1]==='1/84500/84500///','«منتظر شکست 84500» ← تریگر');
 ok(fs[2]==='1///0.091//M','«یک پله الان … رو 0.091 میانگین» ← ورود بازار، پله‌ی دوم 0.091');
 ok(fs[3]==='1///0.24//M','«ورود مجازه … رو 0.24 میانگین» ← 0.24 ورود نیست، پله‌ی دوم است');
 ok(fs[4]==='1////81000/M','«با حد ضرر 81K ورود» ← استاپ 81000، ورود بازار');
 ok(fs[5]==='1/////M','«ورود جدید مجازید» بی‌عدد هم سیگنال است (ورود بازار)');
 ok(fs[6]==='1/83300///81000/','سیگنال کامل دست نخورد');

 console.log('=== ارث‌بردن استاپ و تارگت در کانال‌سنج ===');
 const ih=await p.evaluate(()=>{
   const H=36e5, t0=Date.now()-10*24*H;
   const mk=(n,text,h)=>({id:'ccoineres/'+n,text,date:new Date(t0+h*H)});
   const add=[mk(9001,'#SUSHI لانگ\nورود 0.25\nحد ضرر 0.22\nتارگت 0.3\nتارگت 0.35',0),
     mk(9002,'#SUSHI\n\nمجدد بالای 0.26 ببنده ورود میکنیم',48),
     mk(9003,'#SUSHI\n\nورود مجازه',72),
     mk(9004,'#LINK\n\nورود مجازه',72),
     mk(9005,'#ETH شورت\nورود 3000\nحد ضرر 3100\nتارگت 2800',0),
     mk(9006,'#ETH\n\nتریگر 2950 ست کنید',24)];
   POSTS.push(...add);KGEN++;
   const I=id=>audInput(POSTS.find(x=>x.id===id));
   const a=I('ccoineres/9002'),c=I('ccoineres/9003'),d=I('ccoineres/9004'),e=I('ccoineres/9006');
   return {a:[a.entry,a.trig,a.stop,a.tps.join(','),a.inh&&a.inh.id],c:[c.entry,c.stop,c.mktE,audPre(c)],
     d:[d.stop,audPre(d)],e:[e.dir,e.stop,e.tps.join(',')]};});
 console.log('   ',JSON.stringify(ih));
 ok(ih.a.join('/')==='0.26/0.26/0.22/0.3,0.35/ccoineres/9001','«بالای 0.26 ببنده ورود» استاپ 0.22 و تارگت‌ها را از سیگنال قبلی می‌گیرد');
 ok(ih.c[0]===null&&ih.c[1]===0.22&&ih.c[2]===true&&ih.c[3]===null,'«ورود مجازه»: ورود بازار، استاپ ارثی، قابل سنجش');
 ok(ih.d[0]===null&&ih.d[1]==='no-stop','بی سیگنالِ قبلی: همچنان «حد ضرر ندارد»');
 ok(ih.e.join('/')==='short/3100/2800','جهتِ نگفته (شورت) هم از سیگنال قبلی می‌آید');

 console.log('=== سنجشِ ورود بازار ===');
 const ms=await p.evaluate(async()=>{
   const p9=POSTS.find(x=>x.id==='ccoineres/9003'), inp=audInput(p9), R=audRules(), k=audKey(inp,R);
   const t=Math.ceil(inp.t0/3e5)*3e5, C=[];
   for(let i=0;i<300;i++){const v=i<100?0.27:0.27+(i-100)*0.0005;C.push({t:t+i*3e5,o:v,h:v+0.0002,l:v-0.0002,c:v,v:1});}
   const keep=audCandles;audCandles=async()=>C;
   try{await audOne({p:p9,inp,k},R);}finally{audCandles=keep;}
   const a=AUD[p9.id], again=audInput(p9);
   return {st:a.st,e0:a.e0,mode:a.mode,entry:again.entry,tps:again.tps.join(','),same:audKey(again,R)===a.k,
     row:audRows().some(x=>x.p.id===p9.id&&x.r&&x.r.st==='win')};});
 console.log('   ',JSON.stringify(ms));
 ok(ms.e0===0.27&&ms.mode==='mkt','ورود = قیمت اولین کندل بعد از انتشار (0.27)، فوری');
 ok(ms.entry===0.27&&ms.tps==='0.3,0.35'&&ms.same,'بعد از سنجش، ورودی همان ورود را دارد و کلید عوض نمی‌شود');
 ok(ms.st==='win'&&ms.row,'نتیجه در فهرست کانال‌سنج: برد');
 console.log('=== سیگنال تصویری و تکمیل از روی چارت ===');
 const im=await p.evaluate(async()=>{
   const H=36e5, t0=Date.now()-8*24*H;
   const mk=(n,text,h,img)=>Object.assign({id:'ccoineres/'+n,text,date:new Date(t0+h*H)},img?{img:'data:image/gif;base64,R0lGODlhAQABAAAAACw='}:{});
   POSTS.push(mk(9101,'#ADA',0,1),mk(9102,'#ADA\n\nورود مجدد مجازه',30),mk(9103,'#ADA\n\nتریگر 0.3 ست کنید',40),
     mk(9201,'#BTC لانگ\nورود 82000\nحد ضرر 81000\nتارگت 86000',0),
     mk(9202,'#BTC شورت\nورود 90600\nحد ضرر 93500',20),
     mk(9203,'#BTC\n\nاگر کندل یکساعته بالای 83500 بست ورود مجازه، ریسک یک درصد',30));
   KGEN++;
   const P=id=>POSTS.find(x=>x.id===id), I=id=>audInput(P(id)), R=audRules();
   const a=I('ccoineres/9101'),b=I('ccoineres/9102'),c=I('ccoineres/9103'),btc=I('ccoineres/9203');
   for(const id of ['ccoineres/9101','ccoineres/9102','ccoineres/9103']){const x=I(id);await audOne({p:P(id),inp:x,k:audKey(x,R)},R);}
   return {pre:[audPre(a),audPre(b),audPre(c)],need:[a.need&&a.need.id,b.need&&b.need.id,c.need&&c.need.id],
     btc:[btc.dir,btc.stop,btc.inh&&btc.inh.id],why:AUD['ccoineres/9102'].why};});
 console.log('   ',JSON.stringify(im));
 ok(im.pre.join()==='img-sl,img-sl,img-sl'&&im.need.every(x=>x==='ccoineres/9101'),'«#ADA» تصویری و پیگیری‌هایش: «عددها روی تصویر چارت است» با اشاره به همان پست');
 ok(im.btc.join('/')==='long/81000/ccoineres/9201','«بالای 83500 بست ورود» لانگ است: از سیگنال شورتِ ناجور می‌گذرد و استاپ 81000 لانگ قبلی را می‌گیرد');
 await p.evaluate(()=>{AUDOPEN=null;go('audit',true);renderAudit();});await p.waitForTimeout(400);
 const fb=await p.evaluate(()=>{const b=[...document.querySelectorAll('#audBody .audiag button')].find(x=>/تکمیل از روی چارت/.test(x.textContent));
   if(b)b.click();return b?b.textContent:null;});
 await p.waitForTimeout(300);
 ok(fb&&/۱|1/.test(fb),'دکمه‌ی «تکمیل از روی چارت (۱ پست)» در وضعیت سنجش');
 const sh=await p.evaluate(()=>({img:!!document.querySelector('#sheet .imgfill img'),h:(document.querySelector('#sheet h3')||{}).textContent||'',
   dep:/(۲|2) پیگیری منتظر/.test((document.querySelector('#sheet .hint')||{}).textContent||'')}));
 ok(sh.img&&sh.dep,'برگه: تصویر چارت و «۲ پیگیری منتظر همین عددهاست»');
 await p.fill('#f_st','0.25');await p.fill('#f_t1','0.32');await p.fill('#f_t2','0.36');
 await p.evaluate(()=>{AUDQ.at=Date.now();});
 await p.click('#sheet #ok');await p.waitForTimeout(300);
 const af=await p.evaluate(()=>{const P=id=>POSTS.find(x=>x.id===id);
   const o=OVERRIDE['ccoineres/9101'], a=audInput(P('ccoineres/9101')), b=audInput(P('ccoineres/9102')), c=audInput(P('ccoineres/9103'));
   return {o:[o.stop,o.tps.join(','),o.dir,o.sig],a:[a.mktE,a.stop,audPre(a)],b:[b.stop,b.tgs.join(','),b.inh&&b.inh.id,audPre(b)],c:[c.entry,c.stop,c.tps.join(',')]};});
 console.log('   ',JSON.stringify(af));
 ok(af.o.join('/')==='0.25/0.32,0.36/long/true','عددها ثبت شد (استاپ، تارگت‌ها، جهت)');
 ok(af.a[0]&&af.a[1]===0.25&&af.a[2]===null,'خودِ پست تصویری: ورود بازار، قابل سنجش');
 ok(af.b.join('/')==='0.25/0.32,0.36/ccoineres/9101/','پیگیری «ورود مجدد مجازه» استاپ و تارگت‌ها را از همان پست می‌گیرد');
 ok(af.c.join('/')==='0.3/0.25/0.32,0.36','پیگیری «تریگر 0.3» هم');
 console.log('=== کارت سیگنال: عددها از روی چارت ===');
 const cd=await p.evaluate(async()=>{
   const H=36e5;SYMBOLS.add('ZIG');SYMVER++;POSTS.unshift({id:'ccoineres/9301',text:'#ZIG',date:new Date(Date.now()-H),img:'data:image/gif;base64,R0lGODlhAQABAAAAACw='});
   KGEN++;go('signals',true);renderAll();await new Promise(r=>setTimeout(r,500));
   const card=[...document.querySelectorAll('#list .card')].find(c=>/ZIG/.test(c.textContent));
   if(card&&!card.classList.contains('accopen'))card.click();
   await new Promise(r=>setTimeout(r,400));
   const c2=[...document.querySelectorAll('#list .card')].find(c=>/ZIG/.test(c.textContent));
   const b=c2&&[...c2.querySelectorAll('button')].find(x=>/عددها از روی چارت/.test(x.textContent));
   if(b)b.click();await new Promise(r=>setTimeout(r,300));
   return {sig:isSigPost(POSTS[0]),btn:!!b,f:['f_en','f_st','f_t1','f_t2','f_t3'].every(id=>!!document.getElementById(id))};});
 console.log('   ',JSON.stringify(cd));
 ok(cd.sig,'پستِ «#ZIG» + تصویر خودش سیگنال است');
 ok(cd.btn&&cd.f,'روی کارت: «عددها از روی چارت» با ورود، حد ضرر، تارگت ۱، ۲ و ۳');
 await p.fill('#f_en','0.048');await p.fill('#f_st','0.0256');await p.fill('#f_t1','0.0744');await p.fill('#f_t2','0.1819');await p.fill('#f_t3','0.495');
 await p.click('#sheet #ok');await p.waitForTimeout(400);
 const cz=await p.evaluate(()=>{const s=sigOf(POSTS[0]),I=planInputsOf(POSTS[0],s,OVERRIDE[POSTS[0].id],null);
   return [I.entry,I.stop,s.targets.join(',')].join('/');});
 ok(cz==='0.048/0.0256/0.0744,0.1819,0.495','کارت همان عددها را دارد (ورود/استاپ/سه تارگت)');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
