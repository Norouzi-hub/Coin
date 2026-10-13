/* هوای بازار: جریان پول آلت‌ها (TOTAL3 و دامیننس تتر در 24 ساعت) عدد چهارم است؛ روز ریزش آلت‌ها با بیت‌کوین صاف دیگر «خنثی» نمی‌شود.
   روی کارت فشرده هم چهار جزء دیده می‌شود */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{const H=36e5,T0=Math.floor(Date.now()/H)*H-H,o={};
   // همان روز اسکرین‌شات: بیت‌کوین هنوز رو به بالا، کل بازار و MACD ارزها منفی، آلت‌ها 11٪ پایین و دامیننس تتر بالا
   const parts={btc:0.6,mtot:-0.5,mmc:-0.67,mt3:-1,mud:-0.8};
   o.old=+rdWxOf(parts.btc,parts.mtot,parts.mmc).toFixed(2);
   RD.coins={BTC:{dir:'long',sc:50,t:T0,px:100,parts}};RD.rank=['BTC'];RD.at=Date.now();
   const w=rdWxNow();o.w=+w.w.toFixed(2);o.flow=+w.flow.toFixed(2);o.L=rdWxDir('long');o.S=rdWxDir('short');
   o.ck=rdChkOf(parts,'long',0.03).it[0];
   o.noFlow=+rdWxOf(0.6,0.6,0.6,null,null).toFixed(2);
   RDV='sig';go('radar',true);renderAll();const c=document.querySelector('#rdView .rdwx');o.card=c?c.textContent:'';o.parts=c?c.querySelectorAll('.rdwxp span').length:0;
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(r.old===-0.19,'سه عدد قدیمی: −0.19 (خنثی، همان که روی گوشی دیده شد)');
 ok(r.flow===-0.9&&r.w===-0.37&&r.L==='no'&&r.S==='go','با جریان آلت‌ها: −0.37 ← لانگ نامناسب، شورت مناسب');
 ok(r.ck===false,'بند «هوا» در چک‌لیست هم با همان فرمول');
 ok(r.noFlow===0.6,'بی داده‌ی جریان: همان میانگین سه عدد');
 ok(r.parts===4&&/پول آلت‌ها/.test(r.card)&&/نامناسب/.test(r.card),'کارت فشرده: چهار جزء دیده می‌شود');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
