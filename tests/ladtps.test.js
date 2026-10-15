/* نردبان پوزیشن: تارگت‌ها روی میله (نقشه‌ی خروج، کانال یا R تنظیمات) و تارگت منفی برای شورت با استاپ دور */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={};
   // شورت بی تارگت کانال: ورود 0.006، استاپ اول 0.009 (50٪)، استاپ جلو آمده 0.004772
   const s={id:'ps1',ticker:'XRP',dir:'short',kind:'futures',entry:0.006,stop:0.004772,stop0:0.009,margin:10,lev:10,baseMargin:10,openedAt:Date.now()-36e5,status:'open',targets:[],partials:[],log:[]};
   o.tps=pbTps(s);
   // نقشه‌ی قدیمی با تارگت منفی (ساخته‌شده پیش از این اصلاح)
   const s2=Object.assign({},s,{id:'ps2',pb:{id:pbDefault(),n:'x',parts:[1/3,1/3,1/3],be:0,trail:false,tps:[0.0015,-0.003,-0.009]},pbc:0});
   DB.positions.push(s,s2);pbAttach(s,pbDefault());
   go('positions',true);POSOPEN.add('ps1');POSOPEN.add('ps2');POSOPEN.add('p1');renderPositions();await W(150);
   const lab=id=>[...document.querySelectorAll('#pos-'+id+' .ladder .m.tgt .lb')].map(x=>x.textContent);
   o.l1=lab('ps1');o.l2=lab('ps2');o.s2=s2.pb.tps;o.p1=lab('p1');
   o.neg=[...document.querySelectorAll('#pos-ps2')].map(x=>x.textContent).join('').includes('-0.003');
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(r.tps.length===1&&r.tps[0]===0.0015,'تارگت R تنظیمات برای شورت با استاپ 50٪: فقط 0.0015 (3R و 5R زیر صفر حذف)');
 ok(r.l1.length===1&&/0\.0015/.test(r.l1[0])&&/تارگت 1/.test(r.l1[0]),'تارگت روی میله‌ی شورت بی تارگت کانال: '+JSON.stringify(r.l1));
 ok(r.s2.join()==='0.0015'&&r.l2.length===1&&!r.neg,'نقشه‌ی قدیمی با تارگت منفی خودش درست شد و −0.003 دیگر نیست');
 ok(r.p1.length===2&&/تارگت 1/.test(r.p1[0])&&/تارگت 2/.test(r.p1[1]),'لانگ با تارگت‌های کانال: دو تارگت شماره‌دار روی میله '+JSON.stringify(r.p1));
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
