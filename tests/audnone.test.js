/* کانال‌سنج: «فعال نشد» به تفکیک دلیل؛ «مستقیم به تارگت» با R ورود بازار در لحظه‌ی انتشار */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{
   const row=(why,dir,E,SL,T,px0)=>({p:{id:why+dir},inp:{dir,entry:E,stop:SL,tps:[T]},r:{st:'none',why,px0}});
   // لانگ: ورود 100، انتشار در 103، استاپ 95، تارگت 110 ← (110−103)/(103−95) = +0.875R؛ شورت: ورود 50، انتشار 49، استاپ 52، تارگت 46 ← 3/3 = +1R
   const R=[row('ran','long',100,95,110,103),row('ran','short',50,52,46,49),row('timeout','long',1,0.9,1.2,1.05),row('inval','short',2,2.2,1.8,1.9),
     {p:{id:'w'},inp:{dir:'long',entry:1,stop:0.9,tps:[1.2]},r:{st:'win'}}];
   const h=audNoneHtml(R),d=document.createElement('div');d.innerHTML=h;
   return {t:d.textContent,empty:audNoneHtml(R.slice(4))};});
 console.log('   ',JSON.stringify(r));
 ok(/فعال نشد \(4\)/.test(r.t),'شمار «فعال نشد»: 4');
 ok(/2 مستقیم به تارگت/.test(r.t)&&/\+0\.94R/.test(r.t),'دو «مستقیم به تارگت» با میانگین ورود بازار (0.875+1)/2 = +0.94R');
 ok(/1 قیمت تا 3 روز به ورود نرسید/.test(r.t)&&/1 پیش از ورود از استاپ گذشت/.test(r.t),'مهلت ورود و «پیش از ورود استاپ»');
 ok(r.empty==='','بی «فعال نشد» چیزی نشان نمی‌دهد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
