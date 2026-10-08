/* مبلغ هر تست: پیش‌فرض 10 دلار مارجین با اهرم پیشنهادی؛ دلارِ همه‌ی تست‌ها (قبلی‌ها هم) با همین؛
   اهرم ثابت دلخواه، «اگر همه استاپ بخورند» و برگشت به ریسک ثابت با خالی کردن مبلغ */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{const T=Date.now()-2*36e5;
   RB.items=[{id:'Z1',k:'test',tk:'ZZA',dir:'long',t:T-9e6,E:100,SL:98,TP:103,sd:0.02,rr:1.5,st:'sl',R:-1.1,xt:T,ex:'tp'},
     {id:'Z2',k:'test',tk:'ZZB',dir:'short',t:T-9e6,E:50,SL:51,TP:48.5,sd:0.02,rr:1.5,st:'tp',R:1.4,xt:T-1,ex:'tp'},
     {id:'Z3',k:'test',tk:'ZZC',dir:'long',t:T,E:10,SL:9.8,TP:10.3,sd:0.02,rr:1.5,st:'open',ex:'tp'}];
   const it=RB.items[0],lev=rbLev(it);
   RDV='test';go('radar',true);renderAll();
   const G=document.getElementById('rdView'),txt=G.textContent,sum=G.querySelector('.rbszw summary').textContent,row=G.querySelector('.rbrow[data-id="Z1"] .rbm').textContent;
   return {def:S.tMg,lev,usdR:rbUsdR(it),sum,row,want:fmtUsd(-1.1*10*lev*0.02),tot:fmtUsd((-1.1+1.4)*10*lev*0.02),txt,worst:(G.querySelector('.rbworst')||{}).textContent||''};});
 console.log('   ',JSON.stringify(Object.assign({},r,{txt:undefined})));
 ok(r.def===10&&Math.abs(r.usdR-10*r.lev*0.02)<1e-9,'پیش‌فرض 10 دلار مارجین؛ 1R = 10 × اهرم '+r.lev+' × 2٪ = '+r.usdR.toFixed(2)+' دلار');
 ok(/مبلغ هر تست/.test(r.sum)&&/10/.test(r.sum)&&/اهرم پیشنهادی/.test(r.sum),'جعبه‌ی «مبلغ هر تست» در آزمایشی: '+r.sum);
 ok(r.row===r.want,'تست قبلی (استاپ −1.1R) با 10 دلار نشان داده می‌شود: '+r.row);
 ok(r.txt.includes(r.tot),'جمع نتیجه‌ی دلاری با همین مبلغ: '+r.tot);
 ok(/اگر همه‌ی بازها به استاپِ الانشان بخورند/.test(r.worst)&&/مارجین درگیر/.test(r.worst),'خط «اگر همه استاپ بخورند» و مارجین درگیر');
 // اهرم ثابت 5 از خود جعبه
 const q=await p.evaluate(()=>{const G=document.getElementById('rdView');G.querySelector('.rbszw').open=true;
   document.getElementById('rbMg').value='10';document.getElementById('rbLv').value='5';G.querySelector('[data-rbsz="save"]').click();
   const G2=document.getElementById('rdView');
   return {tMg:S.tMg,tLev:S.tLev,saved:DB.settings.tLev,row:G2.querySelector('.rbrow[data-id="Z1"] .rbm').textContent,roe:G2.querySelector('.rbrow[data-id="Z1"] small').textContent,sum:G2.querySelector('.rbszw summary').textContent};});
 console.log('   ',JSON.stringify(q));
 ok(q.tMg===10&&q.tLev===5&&q.saved===5,'ثبت از جعبه: مارجین 10، اهرم 5 (در تنظیمات ذخیره شد)');
 ok(q.row===await p.evaluate(()=>fmtUsd(-1.1))&&/-11%/.test(q.roe)&&/5x/.test(q.sum),'با اهرم 5: استاپ −1.1R = −1.10 دلار و −11٪ روی مارجین');
 // خالی کردن مبلغ ← روش قبلی (ریسک ثابت)
 const z=await p.evaluate(()=>{document.getElementById('rbMg').value='';document.getElementById('rbLv').value='';document.querySelector('#rdView [data-rbsz="save"]').click();
   return {fix:rbFix(),row:document.querySelector('#rdView .rbrow[data-id="Z1"] .rbm').textContent,want:fmtUsd(-1.1*riskUsd()),sum:document.querySelector('#rdView .rbszw summary').textContent};});
 ok(!z.fix&&z.row===z.want&&/ریسک ثابت/.test(z.sum),'مبلغ خالی ← ریسک ثابت قبلی: '+z.row);
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
