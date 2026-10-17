/* نردبان پوزیشن: تا تارگت اول رد نشده فقط همان روی میله («تارگت 1 از 3»)؛ بعد از رد شدنش (قیمت، بستن بخشی روی آن،
   اجرای پله) همه‌ی تارگت‌ها. «رد کن» بی رسیدن قیمت تارگت را رد‌شده یا خط‌خورده نمی‌کند */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={};
   const P={id:'lt1',ticker:'XRP',dir:'long',kind:'futures',entry:261.6,stop:236,stop0:236,margin:10,lev:10,baseMargin:10,openedAt:Date.now()-36e5,
     status:'open',targets:[342,422.4,529.6],partials:[],log:[]};
   DB.positions.push(P);pbAttach(P,'lad');
   const lab=async px=>{PRICES.set('XRP',px);go('positions',true);POSOPEN.add('lt1');renderPositions();await W(120);
     return [...document.querySelectorAll('#pos-lt1 .ladder .m.tgt')].map(x=>x.querySelector('.lb').textContent+(x.classList.contains('done')?'(done)':''));};
   o.a=await lab(277.2);
   // «رد کن» پله‌ی اول بی رسیدن قیمت (مثل جلو آوردن استاپ به ورود)
   P.pbc=1;P.pbSkip=[0];P.stop=261.6;o.b=await lab(277.2);
   o.c=await lab(350);                                    // قیمت از تارگت اول گذشت
   P.pbc=0;P.pbSkip=[];P.partials=[{price:342,frac:0.33,at:Date.now()}];o.d=await lab(300);   // بستن بخشی روی تارگت اول، قیمت برگشت
   DB.positions=DB.positions.filter(x=>x.id!=='lt1');
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(r.a.length===1&&/342/.test(r.a[0])&&/تارگت 1 از 3/.test(r.a[0]),'قیمت 277، تارگت اول 342: فقط «تارگت 1 از 3» '+JSON.stringify(r.a));
 ok(r.b.length===1&&!/done/.test(r.b[0]),'«رد کن» بی رسیدن قیمت: هنوز فقط تارگت 1، خط‌نخورده '+JSON.stringify(r.b));
 ok(r.c.length===3&&/تارگت 2/.test(r.c[1])&&/تارگت 3/.test(r.c[2])&&!/از 3/.test(r.c.join()),'قیمت 350 (از تارگت اول گذشت): هر سه تارگت '+JSON.stringify(r.c));
 ok(r.d.length===3,'بستن بخشی روی تارگت اول، حتی اگر قیمت برگشت: هر سه '+JSON.stringify(r.d));
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
