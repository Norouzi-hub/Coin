/* پیشنهاد برنامه: سیگنال از روی رویدادهای بازار، فقط با قاعده‌ای که روی گذشته سود داده */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== موتور ===');
 const e=await p.evaluate(()=>{const H=36e5,t0=Math.floor(Date.now()/H)*H-400*H,C=[];
   // ۲۰۰ ساعت رنج ۱۰۰ تا ۱۰۲، بعد شکست کف و ادامه‌ی ریزش (شورت برنده)
   for(let i=0;i<400;i++){let o,c;
     if(i<200){o=101+Math.sin(i/3);c=101+Math.sin((i+1)/3);}else{o=99.9-(i-200)*0.3;c=o-0.3;}
     C.push({t:t0+i*H,o,h:Math.max(o,c)+0.1,l:Math.min(o,c)-0.1,c});}
   const T=asTriggers(C), lo=T.find(x=>x.k==='low7');
   const pl=asPlan(C,lo.i,'short'), w=asWalk(C,lo.i,pl);
   // همان، ولی بعد از شکست برگشت تند (شورت بازنده)
   const C2=C.map((k,i)=>i>lo.i?{t:k.t,o:k.o,h:105,l:k.l,c:104}:k);const w2=asWalk(C2,lo.i,asPlan(C2,lo.i,'short'));
   return {T:T.map(x=>x.k+'@'+x.i).slice(0,6),lo:lo.i,sd:+(pl.sd*100).toFixed(2),R:+w.R.toFixed(2),how:w.how,R2:+w2.R.toFixed(2),how2:w2.how,
     cool:T.filter(x=>x.k==='low7'&&x.i>lo.i&&x.i<lo.i+24).length};});
 console.log('   ',JSON.stringify(e));
 ok(e.lo>=200&&e.lo<=202,'شکست کف ۷ روزه با بسته شدن کندل، همان‌جا که رنج شکست');
 ok(e.cool===0,'هر قاعده روی هر ارز حداکثر یک بار در ۲۴ ساعت');
 ok(e.how==='tp'&&Math.abs(e.R-(1.5-0.25/e.sd))<0.02,'ادامه‌ی ریزش: هدف 1.5R منهای کارمزد و لغزش (0.25٪ ÷ فاصله‌ی استاپ) = '+e.R);
 ok(e.how2==='sl'&&e.R2<-1,'برگشت تند: استاپ، −1R منهای کارمزد ('+e.R2+')');
 ok(e.sd>=0.6&&e.sd<=15,'استاپ بین ۰٫۶٪ و سقف ایزوله: '+e.sd+'٪');

 console.log('=== فقط قاعده‌ی سودده پیشنهاد می‌شود ===');
 const s=await p.evaluate(()=>{const now=Date.now();SYMBOLS.add('ASA');SYMBOLS.add('ASB');PRICES.set('ASA',50);PRICES.set('ASB',20);SYMVER++;
   MKT=Object.assign({at:now,n:100,up:50,down:50,flat:0,med:0,btc:0.5,bins:new Array(11).fill(9),reg:'flat',top:['ASA','ASB']});
   const pl=(E,dir)=>({dir,E,SL:dir==='short'?E*1.02:E*0.98,TP:dir==='short'?E*0.97:E*1.03,sd:0.02,rr:1.5});
   AS={v:1,at:now,coins:{ASA:{low7:{n:14,w:9,r:5.6,fn:14,fw:9,fr:5.6},maUp:{n:12,w:3,r:-4,fn:12,fw:3,fr:-4}},ASB:{low7:{n:3,w:1,r:0.2,fn:3,fw:1,fr:0.2}}},
     live:[{tk:'ASA',k:'low7',i:0,t:now-36e5,pl:pl(50,'short')},{tk:'ASB',k:'maUp',i:0,t:now-36e5,pl:pl(20,'long')}]};
   const sg=asSuggestions();bucket='live';sigFilter='now';go('signals',true);renderAll();
   const G=document.getElementById('glance').querySelector('.assec');
   return {list:sg.list.map(x=>x.tk+':'+x.k),rej:sg.rej,txt:G&&G.textContent||'',btn:!!(G&&G.querySelector('.assig [data-a="iso"]'))};});
 console.log('   ',s.txt.slice(0,240));
 ok(s.list.join()==='ASA:low7'&&s.rej===1,'شکست کف (۱۷ بار، +0.34R) پیشنهاد شد؛ تقاطع صعودی (−0.33R) کنار رفت');
 ok(/پیشنهاد برنامه \(از بازار، نه کانال\)/.test(s.txt)&&/ASA/.test(s.txt)&&/شورت/.test(s.txt)&&/17 بار، 59٪ برد/.test(s.txt),'در «الان چه کنم؟»: ASA شورت با کارنامه‌ی قاعده');
 ok(/1 رویداد دیگر کنار رفت/.test(s.txt),'شمار رویدادهای ردشده');
 await p.evaluate(()=>document.querySelector('#glance .assig [data-a="iso"]').click());await p.waitForTimeout(600);
 const f=await p.evaluate(()=>({t:(document.querySelector('#sheet')||{}).textContent||'',e:(document.querySelector('#f_e')||{}).value,s:(document.querySelector('#f_s')||{}).value}));
 ok(/ASA/.test(f.t)&&+f.e===50&&Math.abs(+f.s-51)<0.01,'«ایزوله» فرم ورود را با ورود ۵۰ و استاپ ۵۱ باز کرد');
 await p.evaluate(()=>document.querySelector('#ok').click());await p.waitForTimeout(500);
 const pos=await p.evaluate(()=>{const q=DB.positions.find(x=>x.ticker==='ASA');return q&&{dir:q.dir,stop:q.stop,note:q.note,until:!!q.until,iso:q.iso};});
 ok(pos&&pos.dir==='short'&&Math.abs(pos.stop-51)<0.01&&/پیشنهاد برنامه/.test(pos.note||'')&&pos.until,'پوزیشن ثبت شد با یادداشت «پیشنهاد برنامه» و مهلت ۲۴ ساعت: '+JSON.stringify(pos));
 await p.evaluate(()=>sheetAsRules());await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/کارنامه‌ی قاعده‌ها/.test(document.querySelector('#sheet').textContent)&&document.querySelectorAll('#sheet tbody tr').length===6),'برگه‌ی کارنامه‌ی ۶ قاعده');
 await p.evaluate(()=>closeSheet());
 const off=await p.evaluate(()=>{S.feat.autosig=false;renderAll();const r=!document.querySelector('#glance .assec');S.feat.autosig=true;return r;});
 ok(off,'کلید امکانات «پیشنهاد سیگنال از بازار» خاموشش می‌کند');
 console.log('=== چرا پیشنهادی نیست؟ ===');
 const why=await p.evaluate(()=>{const now=Date.now();
   AS.live=[];const a=asHtml();
   AS.coins={ASA:{low7:{n:14,w:4,r:-3,fn:14,fw:4,fr:-3}}};const b=asHtml();
   return {a:(a.match(/<div class="hint">([^<]*(?:<[^>]+>[^<]*)*?)<\/div>/)||[])[0]||a.slice(0,300),b};});
 ok(/قاعده‌های سودده: شکست کف 7 روزه \(شورت، 17 بار/.test(why.a.replace(/<[^>]+>/g,''))&&/رویداد تازه‌ای/.test(why.a),'قاعده‌ی سودده هست ولی رویداد تازه ندارد ← همین را می‌گوید');
 ok(/هیچ قاعده‌ای بعد از کارمزد سود نداده/.test(why.b)&&/بهترینش شکست کف 7 روزه/.test(why.b),'هیچ قاعده‌ای سودده نیست ← می‌گوید و بهترینش را نشان می‌دهد');

 console.log('=== پیگیری بی‌استاپ: استاپ از سیگنال قبلی ===');
 const ih=await p.evaluate(()=>{const now=Date.now();['IHX','NSX'].forEach(t=>{SYMBOLS.add(t);PRICES.set(t,t==='IHX'?10:5);});SYMVER++;
   POSTS.unshift({id:'ccoineres/97301',num:97301,text:'#IHX لانگ\nورود 10\nحد ضرر 9.6\nتارگت 11',date:new Date(now-5*36e5),link:'x'});
   POSTS.unshift({id:'ccoineres/97302',num:97302,text:'#NSX لانگ ورود 5',date:new Date(now-2*36e5),link:'x'});
   POSTS.unshift({id:'ccoineres/97303',num:97303,text:'#IHX ورود مجدد 10 مجازه',date:new Date(now-36e5),link:'x'});
   DB.decisions['ccoineres/97301']={action:'skipped',at:now};KGEN++;S.lossLock=0;renderAll();paintGlance();
   const G=document.getElementById('glance'), it=[...G.querySelectorAll('.glsig')].find(x=>/IHX/.test(x.textContent));
   return {it:it&&it.textContent||'',ns:[...G.querySelectorAll('.glsig')].some(x=>/NSX/.test(x.textContent)),skip:(G.querySelector('.glskip')||{}).textContent||''};});
 console.log('   ',ih.it.slice(0,120),'|',ih.skip.slice(0,80));
 ok(/استاپ 9.6 \(4٪\) از سیگنال قبلی/.test(ih.it)&&/ایزوله/.test(ih.it),'«ورود مجدد» IHX با استاپ 9.6 از سیگنال قبلی و دکمه‌ی ایزوله');
 ok(!ih.ns&&/1 سیگنال بی‌استاپ/.test(ih.skip),'NSX بی‌استاپ در فهرست نیست، فقط شمرده شد');
 const sh=await p.evaluate(()=>{const now=Date.now();SYMBOLS.add('SHX');PRICES.set('SHX',20);SYMVER++;
   POSTS.unshift({id:'ccoineres/97311',num:97311,text:'#SHX شورت\nورود 20\nحد ضرر 20.8\nتارگت 18',date:new Date(now-5*36e5),link:'x'});
   POSTS.unshift({id:'ccoineres/97312',num:97312,text:'#SHX ورود مجدد 20 مجازه',date:new Date(now-30*6e4),link:'x'});
   DB.decisions['ccoineres/97311']={action:'skipped',at:now};KGEN++;renderAll();
   const G=document.getElementById('glance'), it=[...G.querySelectorAll('.glsig')].find(x=>/SHX/.test(x.textContent));
   return {it:it&&it.textContent||'',dir:(G.querySelector('.gldir')||{}).textContent||'',hdr:!!document.getElementById('btnSet')};});
 ok(/شورت/.test(sh.it)&&!/لانگ/.test(sh.it)&&/استاپ 20.8/.test(sh.it),'«ورود مجدد» یک شورت، شورت می‌ماند (نه لانگِ پیش‌فرض) با استاپ 20.8');
 ok(/کانال در 30 روز اخیر: \d+ لانگ · \d+ شورت/.test(sh.dir),'شمار لانگ و شورت کانال: '+sh.dir.slice(0,60));
 ok(!sh.hdr&&await p.evaluate(()=>!!document.querySelector('.moreit[data-go="settings"]')),'دکمه‌ی تنظیمات از سربرگ رفت؛ در «سایر» هست');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
