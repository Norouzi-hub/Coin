/* تکرارِ سیگنالِ قبلی سیگنال تازه نیست؛ خبر/اطلاع‌رسانی/یادداشت و دسته‌های قدیمی خودشان آرشیو؛
   «الان چه کنم؟» همه‌ی سیگنال‌های قابل گرفتن را با دکمه‌ی اقدام نشان می‌دهد */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== تکرار سیگنال قبلی ===');
 const r=await p.evaluate(()=>{const now=Date.now(),H=36e5;
   const mk=(n,t,h,reply)=>({id:'ccoineres/'+n,num:n,text:t,date:new Date(now-h*H),link:'x',reply:reply?{id:'ccoineres/'+reply,text:'x'}:null});
   POSTS.unshift(
     mk(97005,'#BTC لانگ\nورود 64800\nحد ضرر 63500\nتارگت 66000\n✅ تارگت اول زده شد، سیو سود کنید',0.2),   // همان #920، دوباره
     mk(97004,'#BTC لانگ\nورود 64850\nحد ضرر 63500\nتارگت 66000',0.3),                                 // همان، با اختلاف کمتر از ۰٫۵٪
     mk(97003,'#BTC ورود مجدد 64800 مجازه',0.4),                                                        // ورود مجدد: سیگنال
     mk(97002,'#BTC لانگ ورود 62000 حد ضرر 61000 تارگت 64000',0.5),                                      // عدد تازه: سیگنال
     mk(97001,'#بیت_کوین سیو سود کنید و استاپ رو ببرید روی ورود',0.6,920));                              // پاسخ به #920
   KGEN++;RCACHE.clear();renderAll();
   const k=n=>postKind(POSTS.find(x=>x.num===n));
   return {a:k(97005),b:k(97004),c:k(97003),d:k(97002),e:k(97001),orig:k(920),rep:REPOF.get('ccoineres/97005'),
     au:!!audInput(POSTS.find(x=>x.num===97005)),txt:txText(2,false).text};});
 console.log('   ',JSON.stringify(Object.assign({},r,{txt:undefined})));
 ok(r.orig==='sig','اولین نسخه (#920) سیگنال می‌ماند');
 ok(r.a==='res'&&r.rep==='ccoineres/920','نسخه‌ی دوباره با «سیو سود» ← نتیجه، با اشاره به #920');
 ok(r.b==='res','همان عددها (ورود تا ۰٫۵٪) ← تکرار');
 ok(r.c==='sig','«ورود مجدد» سیگنال تازه است');
 ok(r.d==='sig','ورود و استاپ تازه ← سیگنال تازه');
 ok(r.e==='res','پاسخ «سیو سود» به همان سیگنال ← نتیجه');
 ok(!r.au,'کانال‌سنج تکرار را نمی‌سنجد');
 ok(!/ENTRY 64850/.test(r.txt)&&(r.txt.match(/ENTRY 64800 \| SL 63500/g)||[]).length===1,'خروجی متنی یک بار');
 const pill=await p.evaluate(()=>{bucket='res';renderSignals();const c=document.querySelector('#list .card[data-id="ccoineres/97005"]');
   return c&&c.querySelector('.chead .pill.kind')?.textContent;});
 ok(/تکرار سیگنال قبلی/.test(pill||''),'برچسب روی کارت: «'+pill+'»');
 await p.evaluate(()=>document.querySelector('#list .card[data-id="ccoineres/97005"] .chead .pill.kind').click());await p.waitForTimeout(400);
 ok(await p.evaluate(()=>ACCOPEN==='ccoineres/920'&&bucket!=='res'),'زدن برچسب ← سیگنال اصلی باز شد');

 console.log('=== آرشیو خودکار ===');
 const a=await p.evaluate(()=>{const g=n=>bucketOf(POSTS.find(x=>x.num===n));
   return {news:g(919),ann:g(917),note:g(914),sig:g(920),res:g(916)};});
 console.log('   ',JSON.stringify(a));
 ok(a.news==='arch'&&a.ann==='arch'&&a.note==='arch','خبر، اطلاع‌رسانی و یادداشت در آرشیو');
 ok(a.sig==='live'&&a.res==='live','سیگنال و نتیجه سر جایشان');
 await p.evaluate(()=>{DB.archived['ccoineres/914']=0;delete DB.pcat;DB.pcat={'ccoineres/920':['c1']};save();});
 const a2=await p.evaluate(()=>({note:bucketOf(POSTS.find(x=>x.num===914)),pc:bucketOf(POSTS.find(x=>x.num===920))}));
 ok(a2.note==='live','برگردانده‌شده دیگر خودکار آرشیو نمی‌شود');
 ok(a2.pc==='arch','پستِ دسته‌ی دلخواهِ قدیمی (pcat) ← آرشیو');
 await p.evaluate(()=>{DB.pcat={};save();});

 console.log('=== الان چه کنم؟ ===');
 const g=await p.evaluate(()=>{const now=Date.now();
   for(let i=0;i<6;i++){const tk='GL'+i;SYMBOLS.add(tk);PRICES.set(tk,100);
     POSTS.unshift({id:'ccoineres/9800'+i,num:98000+i,text:'#'+tk+' لانگ\nورود 100\nحد ضرر 96\nتارگت 108',date:new Date(now-(i+1)*6e4),link:'x'});}
   SYMVER++;KGEN++;Object.assign(S,{riskUsd:2});bucket='live';sigFilter='now';go('signals',true);renderAll();
   const G=document.getElementById('glance');
   return {n:G.querySelectorAll('.glsig').length,acts:[...G.querySelectorAll('.glsig')[0].querySelectorAll('[data-a]')].map(x=>x.dataset.a),
     num:G.querySelector('.glsig .glnum').textContent,head:G.querySelector('.glh').textContent};});
 console.log('   ',JSON.stringify(g));
 ok(g.n>=6,'بیش از چهار سیگنال قابل گرفتن فهرست شد: '+g.n);
 ok(g.acts.join(',')==='iso,form,skip,copy','دکمه‌ها: ایزوله، فرم کامل، وارد نشدم، کپی');
 ok(/ورود 100/.test(g.num)&&/استاپ 96 \(4٪\)/.test(g.num),'عددها روی همان ردیف: '+g.num);
 await p.evaluate(()=>document.querySelector('#glance .glsig [data-a="iso"]').click());await p.waitForTimeout(500);
 const isoS=await p.evaluate(()=>({ok:!!document.querySelector('#sheet #ok'),t:(document.querySelector('#sheet')||{}).textContent||'',m:(document.querySelector('#f_m')||{}).value}));
 console.log('   ',isoS.t.slice(0,140));
 ok(isoS.ok&&/GL/.test(isoS.t),'«ایزوله» از همان‌جا فرم ورود را باز کرد (مارجین '+isoS.m+')');
 await p.evaluate(()=>closeSheet());await p.waitForTimeout(500);
 await p.evaluate(()=>document.querySelector('#glance .glsig [data-a="skip"]').click());await p.waitForTimeout(500);
 ok(await p.evaluate(()=>/وارد نشدم|دلیل/.test(document.querySelector('#sheet').textContent)),'«وارد نشدم» برگه‌ی دلیل را باز کرد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
