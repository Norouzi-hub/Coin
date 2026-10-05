/* نوسان‌سنج: موتور روی یک مسیر ساختگی با جواب معلوم، و رابط در کانال‌سنج (فقط با دکمه) */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});
 let kl=0;
 await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 p.on('request',r=>{if(/klines|candles|candlestick/.test(r.url()))kl++;});
 await p.addInitScript(seed);
 await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== موتور: مسیر ساختگی ===');
 const r=await p.evaluate(()=>{
   const t0=Date.now()-5*864e5, seq=[100,97,111,104,111,99,111,92.4,100,91.5,125];
   const C=seq.slice(1).map((c,i)=>{const o=seq[i];return {t:t0+i*3e5,o,h:Math.max(o,c),l:Math.min(o,c),c};});
   const inp={tk:'X',dir:'long',entry:100,trig:null,stop:90,tps:[110,120],t0};
   const R=audRules(), w=audWalk(inp,C,R);
   const o={lev:10,roi:20,win:'sig',near:0.75,hys:0.5};
   const pr=swingProfile(inp,C,w,o), pr20=swingProfile(inp,C,w,Object.assign({},o,{lev:20}));
   const cp=coinProfile(C,o);
   // شورتِ آینه‌ای همان جواب را باید بدهد
   const M=C.map(k=>({t:k.t,o:200-k.o,h:200-k.l,l:200-k.h,c:200-k.c}));
   const inS={tk:'X',dir:'short',entry:100,trig:null,stop:110,tps:[90,80],t0};
   const prS=swingProfile(inS,M,audWalk(inS,M,R),o);
   return {st:w.st,pr,liq20:pr20.liqT!=null,liq10:pr.liqT!=null,cp,prS:{tpN:prS.tpN,beN:prS.beN,nearN:prS.nearN,flips:prS.flips}};
 });
 const pr=r.pr;
 console.log('   ',JSON.stringify({tpN:pr.tpN,beN:pr.beN,nearN:pr.nearN,stopN:pr.stopN,maeBR:pr.maeBR,mfeR:pr.mfeR,maeR:+pr.maeR.toFixed(2),plus:pr.plusN,minus:pr.minusN,flips:pr.flips,legs:pr.legs}));
 ok(r.st==='win'&&pr.act,'سیگنال برد و فعال');
 ok(pr.tpN===4,'۴ بار لمس تارگت ۱ (هر بار بعد از عقب‌نشینیِ دست‌کم ۰.۵R)');
 ok(pr.beN===2,'۲ بار بعد از تارگت ۱ تا ورود برگشت');
 ok(pr.nearN===2&&pr.stopN===0,'۲ بار نزدیک استاپ (−۰.۷۵R)، استاپ نخورد');
 ok(Math.abs(pr.maeBR+0.3)<1e-9,'افت پیش از سود −۰.۳R');
 ok(Math.abs(pr.mfeR-2.5)<1e-9&&Math.abs(pr.maeR+0.85)<1e-9,'سقف +۲.۵R، کف −۰.۸۵R');
 ok(pr.plusN===3&&pr.minusN===3&&pr.flips===3,'باند ±۲۰٪ با ۱۰x (±۲٪ قیمت): ۳ بار بالا، ۳ بار پایین، ۳ رفت‌وآمد');
 ok(pr.legs===10,'زیگزاگ ۲٪: ۱۰ حرکت');
 ok(!r.liq10&&r.liq20,'لیکوئید: با ۱۰x نه (کف −۸.۵٪)، با ۲۰x بله');
 ok(r.prS.tpN===4&&r.prS.beN===2&&r.prS.nearN===2&&r.prS.flips===3,'شورت آینه‌ای همان جواب: '+JSON.stringify(r.prS));
 ok(r.cp.legs===10&&r.cp.overLiq===5,'توکن: ۱۰ حرکت، ۵ تا بزرگ‌تر از فاصله‌ی لیکوئید ۹.۵٪ — '+r.cp.legs+'/'+r.cp.overLiq);

 console.log('=== تایم‌فریم: ساختن ۳۰ دقیقه از ۵ دقیقه ===');
 const ag=await p.evaluate(()=>{const C=[0,1,2,3,4,5,6,7].map(i=>({t:Date.UTC(2026,0,1,0,i*5),o:10+i,h:11+i,l:9+i,c:10.5+i}));const A=swAggr(C,IVMS['30m']);
   return A.map(k=>[new Date(k.t).toISOString().slice(11,16),k.o,k.h,k.l,k.c].join(':'));});
 ok(ag.join(' ')==='00:00:10:16:9:15.5 00:30:16:18:15:17.5','۸ کندل ۵ دقیقه‌ای → ۲ کندل ۳۰ دقیقه‌ای (باز/سقف/کف/بسته درست): '+ag.join(' '));

 console.log('=== رابط: آکاردئون کانال‌سنج ===');
 await p.evaluate(()=>{AF.noLate=false;localStorage.removeItem('signaldesk.audopen.v1');AUDOPEN='کارنامه‌ی کانال';go('audit',true);});
 await p.waitForTimeout(6000);                      // کانال‌سنج خودش سیگنال‌ها را می‌سنجد (کار قبلی)
 const acc=await p.evaluate(()=>[...document.querySelectorAll('#audBody .panel.acc')].map(x=>x.dataset.acc+':'+(x.classList.contains('shut')?0:1)));
 console.log('   ',acc.join(' | '));
 ok(acc.filter(x=>x.endsWith(':1')).length===1&&acc.includes('کارنامه‌ی کانال:1'),'فقط «کارنامه‌ی کانال» باز است؛ بقیه بسته');
 await p.evaluate(()=>document.querySelector('#audBody .panel.acc[data-acc="نوسان‌سنج"] > .panelhead').click());
 const acc2=await p.evaluate(()=>[...document.querySelectorAll('#audBody .panel.acc')].filter(x=>!x.classList.contains('shut')).map(x=>x.dataset.acc));
 ok(acc2.length===1&&acc2[0]==='نوسان‌سنج','زدن روی «نوسان‌سنج»: همان باز شد و کارنامه بسته شد');
 const subs=await p.evaluate(()=>({sec:document.querySelectorAll('#audBody .swsec').length,sig:!!document.querySelector('#audBody .swsig'),tok:!!document.querySelector('#audBody #swTk')}));
 ok(subs.sec===0&&subs.sig&&!subs.tok,'نوسان‌سنجِ کانال‌سنج فقط سیگنال‌ها را دارد؛ ابزار توکن در تب اسکلپ است');

 console.log('=== سیگنال‌ها: فقط با دکمه ===');
 ok(await p.evaluate(()=>Object.keys(SWING).length)===0,'باز کردن کانال‌سنج: نوسان چیزی نسنجید');
 const btn=await p.evaluate(()=>{const b=[...document.querySelectorAll('.swp .btn')].find(x=>/سنجش نوسان/.test(x.textContent));return b&&{t:b.textContent,d:b.disabled};});
 ok(btn&&!btn.d,'دکمه: '+(btn&&btn.t));
 await p.evaluate(()=>[...document.querySelectorAll('.swp .btn')].find(x=>/سنجش نوسان/.test(x.textContent)).click());
 for(let i=0;i<120&&await p.evaluate(()=>SWQ.on);i++)await p.waitForTimeout(500);
 const agg=await p.evaluate(()=>({n:Object.keys(SWING).length,stats:[...document.querySelectorAll('.swp .stats .st b')].map(x=>x.textContent),items:document.querySelectorAll('.swp .swit').length}));
 ok(agg.n>=3&&agg.stats.includes('میانگین لمس تارگت ۱')&&agg.items>=1,'بعد از دکمه: جمع‌بندی و پرنوسان‌ترین‌ها ('+agg.n+')');
 await p.evaluate(()=>document.querySelector('.swp .swit').click());await p.waitForTimeout(500);
 ok(await p.evaluate(()=>/لمس تارگت ۱|نزدیک استاپ/.test(document.querySelector('#sheet').textContent)&&!!document.querySelector('#sheet .swsvg')),'جزئیات یک سیگنال با نمودار');
 await p.evaluate(()=>closeSheet());await p.waitForTimeout(300);

 console.log('=== تایم‌فریم دستی (تب اسکلپ) ===');
 await p.evaluate(()=>[...document.querySelectorAll('#audBody .swp .btn')].find(x=>/تب اسکلپ/.test(x.textContent)).click());await p.waitForTimeout(500);
 ok(await p.evaluate(()=>view==='scalp'&&document.querySelector('.swsec[data-id="opt"]').classList.contains('on')),'«تنظیم اهرم، باند و تایم‌فریم» تب اسکلپ را با تنظیم‌های باز آورد');
 await p.evaluate(()=>[...document.querySelectorAll('.swtf .pbc')].find(b=>b.textContent==='۳ دقیقه').click());await p.waitForTimeout(300);
 ok(await p.evaluate(()=>SWOPT.tf==='3m'&&/کندل ۳ دقیقه/.test(document.querySelector('.swp').textContent)),'۳ دقیقه انتخاب شد');
 await p.evaluate(()=>go('audit',true));await p.waitForTimeout(600);
 ok(await p.evaluate(()=>/^0 از/.test(document.querySelector('#audBody .swsig .hint').textContent)),'تایم‌فریم عوض شد ← نتیجه‌های قبلی برای این تنظیم معتبر نیست: '+await p.evaluate(()=>document.querySelector('#audBody .swsig .hint').textContent));
 await p.evaluate(()=>go('scalp',true));await p.waitForTimeout(400);
 const ivs=[];p.on('request',r=>{const m=r.url().match(/interval=(\w+)/);if(m)ivs.push(m[1]);});

 console.log('=== توکن و ورود دستی ===');
 await p.evaluate(()=>document.querySelector('.swsec[data-id="tok"] .swsh').click());await p.waitForTimeout(200);
 await p.evaluate(()=>{const v=(id,x)=>{const i=document.querySelector(id);i.value=x;i.dispatchEvent(new Event('change'));};
   v('#swTk','btc');v('#swDays','3');v('#swDir','long');v('#swMe','64000');v('#swMt','');v('#swMs','');document.querySelector('#swTkGo').click();});
 for(let i=0;i<60&&!(await p.evaluate(()=>!!document.querySelector('#swCoin .swres')));i++)await p.waitForTimeout(400);
 if(!(await p.evaluate(()=>!!SWCOIN)))console.log('   toast:',await p.evaluate(()=>document.querySelector('#toast').textContent),'busy:',await p.evaluate(()=>document.querySelector('#swTkGo')&&document.querySelector('#swTkGo').textContent));
 const man=await p.evaluate(()=>({sc:SWCOIN&&SWCOIN.sc,mp:SWCOIN&&SWCOIN.mp&&{act:SWCOIN.mp.act,tpN:SWCOIN.mp.tpN,tAct:SWCOIN.mp.tAct},t:document.querySelector('#swCoin').textContent,n:document.querySelectorAll('#swCoin .swres').length}));
 ok(ivs.includes('3m'),'کندل‌ها با تایم‌فریم ۳ دقیقه گرفته شد ('+[...new Set(ivs)].join(',')+')');
 ok(man.sc&&man.sc.entry===64000&&man.sc.tpAuto&&Math.abs(man.sc.tps[0]-65280)<1e-6&&Math.abs(man.sc.stop-62720)<1e-6,'ورود ۶۴۰۰۰؛ تارگت و استاپ خالی ← ±۲٪: ۶۵۲۸۰ / ۶۲۷۲۰');
 ok(man.mp&&man.mp.act&&man.n===2,'ورود در همین سه روز فعال شد؛ دو کارت: سناریو و نوسان توکن');
 ok(/ورود فعال شد/.test(man.t)&&/لمس تارگت ۱/.test(man.t),'کارت سناریو: زمان ورود، لمس تارگت، استاپ، باند');
 // زیر بار (تست‌های موازی) گرفتن کندل ممکن است چند ثانیه طول بکشد: تا نتیجه‌ی تازه صبر
 const until=async f=>{for(let i=0;i<50&&!(await p.evaluate(f));i++)await p.waitForTimeout(300);return p.evaluate(f);};
 await p.evaluate(()=>{const i=document.querySelector('#swMe');i.value='90000';i.dispatchEvent(new Event('change'));document.querySelector('#swTkGo').click();});
 ok(await until(()=>/نرسید/.test(document.querySelector('#swCoin').textContent)),'ورود ۹۰۰۰۰ (دور از قیمت): «قیمت به ورود نرسید»');
 await p.evaluate(()=>{const i=document.querySelector('#swMe');i.value='';i.dispatchEvent(new Event('change'));document.querySelector('#swTkGo').click();});
 ok(await until(()=>!SWCOIN.sc&&document.querySelectorAll('#swCoin .swres').length===1),'ورود خالی: فقط نوسان توکن');
 // پیشنهاد کف/سقف: روی مسیر ساختگیِ رنج
 const sug=await p.evaluate(()=>{const t0=Date.now()-864e5, seq=[100,103,99,103.5,98.8,103.2,99.1];
   const C=seq.slice(1).map((c,i)=>({t:t0+i*36e5,o:seq[i],h:Math.max(seq[i],c),l:Math.min(seq[i],c),c}));
   const pr=coinProfile(C,{lev:10,roi:20,tf:'1h'});return {s:pr.supp,r:pr.res,nl:pr.nLow,nh:pr.nHigh};});
 ok(sug.s>98.7&&sug.s<99.2&&sug.r>102.9&&sug.r<103.6,'پیشنهاد رنج: کف‌ها حوالی ۹۹، سقف‌ها حوالی ۱۰۳ — '+JSON.stringify(sug));
 ok(sug.nl<=3&&sug.nh<=3,'«چند بار» = نقطه‌های چرخشِ واقعی نزدیک سطح، نه همه‌ی حرکت‌ها — '+sug.nl+'/'+sug.nh);
 // روند: دو روزِ اول رنج ۷۸–۸۰، روز آخر رنج ۸۵–۸۷ ← پیشنهاد باید رنجِ اخیر باشد
 const tr=await p.evaluate(()=>{const t0=Date.now()-3*864e5, seq=[];
   for(let i=0;i<48;i++)seq.push(i%2?80:78);for(let i=0;i<24;i++)seq.push(i%2?87:85);
   const C=seq.slice(1).map((c,i)=>({t:t0+i*36e5,o:seq[i],h:Math.max(seq[i],c),l:Math.min(seq[i],c),c}));
   const pr=coinProfile(C,{lev:10,roi:20,tf:'1h'});return {s:pr.supp,r:pr.res};});
 ok(tr.s===85&&tr.r===87,'روند: پیشنهاد از رنجِ اخیر (۸۵ ⇄ ۸۷)، نه میانه‌ی کل دوره — '+JSON.stringify(tr));
 await p.evaluate(()=>{const C=[];const t0=Date.now()-864e5;const seq=[100,103,99,103.5,98.8,103.2,99.1];
   for(let i=1;i<seq.length;i++)C.push({t:t0+i*36e5,o:seq[i-1],h:Math.max(seq[i-1],seq[i]),l:Math.min(seq[i-1],seq[i]),c:seq[i]});
   SWCOIN={tk:'RNG',o:Object.assign({},SWOPT),pr:coinProfile(C,SWOPT),sc:null,mp:null};paintSwCoin();
   document.querySelector('#swUseL').click();});
 ok(await p.evaluate(()=>SWOPT.dir==='long'&&+SWOPT.me>98.7&&+SWOPT.me<99.2&&+SWOPT.mt>102.9&&document.querySelector('#swMe').value===SWOPT.me),'«لانگ از کف، تارگت سقف» فرم را پر کرد: '+await p.evaluate(()=>SWOPT.me+' → '+SWOPT.mt));
 await p.evaluate(()=>{SWOPT.open='tok';SWOPT.me='64000';SWOPT.tf='5m';swOptSave();renderScalp();});await p.waitForTimeout(300);
 await p.evaluate(()=>{document.querySelector('#swTkGo').click();});await p.waitForTimeout(2500);
 const e=await p.$('.swp');await e.screenshot({path:require('./lib').out('swing.png')});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
