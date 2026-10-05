/* تصمیم ساده‌ی نوسان‌سنج: لانگ / شورت / صبر، از روند و جای قیمت در رنج */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const R=await p.evaluate(()=>{S.fee=0.1;const o={lev:20,roi:20};
   const pr=(chg,last,legMax)=>({supp:100,res:102,aP:1,recChg:chg,last,legMax:legMax||2});
   const d=(chg,last,lm)=>{const x=swDecide(pr(chg,last,lm),o);return x.act+'/'+x.side+'/'+x.trend+'/'+x.where;};
   return {
     upBot:d(5,100.3),upMid:d(5,101),upTop:d(5,101.8),
     dnTop:d(-5,101.8),dnBot:d(-5,100.3),
     flBot:d(0.5,100.3),flTop:d(0.5,101.8),flMid:d(0.5,101),
     above:d(5,104),below:d(-5,98),
     plan:swDecide(pr(5,100.3),o),safe:swDecide(pr(5,100.3,5.9),o).safeLev,none:swDecide({supp:null,res:null,aP:1},o).act};});
 ok(R.upBot==='long/long/up/bottom','روند صعودی + کف رنج ← الان لانگ');
 ok(R.upMid==='wait/long/up/mid'&&R.upTop==='wait/long/up/top','روند صعودی + وسط یا سقف ← صبر (برنامه: لانگ از کف، نه شورت)');
 ok(R.dnTop==='short/short/down/top'&&R.dnBot==='wait/short/down/bottom','روند نزولی: سقف ← شورت؛ کف ← صبر');
 ok(R.flBot==='long/long/flat/bottom'&&R.flTop==='short/short/flat/top'&&R.flMid.startsWith('wait'),'رنج درجا: کف لانگ، سقف شورت، وسط صبر');
 ok(R.above.startsWith('out/')&&R.below.startsWith('out/'),'قیمت بیرون از رنج ← «رنج شکسته شده»');
 const pl=R.plan;
 ok(pl.entry===100&&pl.tp===102&&Math.abs(pl.stop-99)<1e-9,'برنامه‌ی لانگ: ورود کف ۱۰۰، تارگت سقف ۱۰۲، استاپ یک باند زیر کف ۹۹');
 ok(Math.abs(pl.winP-38)<1e-9&&Math.abs(pl.lossP-22)<1e-9,'با ۲۰x: هر بُرد +۳۸٪ (۴۰ − کارمزد ۲)، هر استاپ −۲۲٪');
 ok(R.safe===13,'بزرگ‌ترین حرکت ۵.۹٪ ← اهرم امن حداکثر ۱۳x (۲۰x لیکوئید می‌شد): '+R.safe);
 ok(R.none==='none','بدون کف/سقف: «نمی‌شود گفت»');
 console.log('=== رابط ===');
 await p.evaluate(()=>{SWOPT.open='tok';SWOPT.tf='5m';SWOPT.me='';SWOPT.mt='';SWOPT.ms='';SWOPT.lev=20;go('scalp',true);});await p.waitForTimeout(1200);
 // مسیر ساختگی: دو روز رنجِ پایین، روز آخر رنجِ بالاتر و قیمت الان نزدیک کفِ رنج تازه
 await p.evaluate(()=>{const t0=Date.now()-3*864e5, seq=[];
   for(let i=0;i<48;i++)seq.push(i%2?80:78);for(let i=0;i<23;i++)seq.push(i%2?87:85);seq.push(85.1);
   const C=seq.slice(1).map((c,i)=>({t:t0+i*36e5,o:seq[i],h:Math.max(seq[i],c),l:Math.min(seq[i],c),c}));
   SWCOIN={tk:'TST',o:Object.assign({},SWOPT),pr:coinProfile(C,SWOPT),sc:null,mp:null};paintSwCoin();});
 const ui=await p.evaluate(()=>({v:document.querySelector('.swdec .dv')?.textContent,cls:document.querySelector('.swdec')?.className,
   nums:[...document.querySelectorAll('.swdec .dnum b')].map(x=>x.textContent),more:!document.querySelector('.swmore').open}));
 console.log('   ',JSON.stringify(ui));
 ok(ui.v==='الان: لانگ'&&/long/.test(ui.cls),'کارت بزرگ: «الان: لانگ» (روند صعودی، قیمت کفِ رنجِ تازه)');
 ok(ui.nums[0]==='85'&&ui.nums[1]==='87','ورود ۸۵، تارگت ۸۷ — از رنجِ روز آخر');
 ok(ui.more,'جزئیات نوسان بسته است (صفحه ساده)');
 const e=await p.$('.swdec');await e.screenshot({path:require('./lib').out('decide.png')});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
