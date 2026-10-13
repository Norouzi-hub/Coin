/* برگشت هوا: هشدار وقتی هوای یک جهت «نامناسب» می‌شود و بازِ همان جهت داری؛ سنجش «ببند» و «زیان‌ده ببند، سودده ریسک‌فری» روی مسیر واقعی */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[],dlg=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const H=36e5,M5=3e5,T0=Math.floor(Date.now()/H)*H-H,W8=ms=>new Promise(r=>setTimeout(r,ms)),o={};
   // 1) هشدار زنده
   const set=w=>{RD.coins={BTC:{dir:'wait',best:'long',sc:50,t:T0,px:1,parts:{btc:w,mtot:w,mmc:w,mt3:w,mud:w}}};RD.rank=['BTC'];RD.at=Date.now();};
   set(0.5);RD.wxp=null;RD.wxa=null;rdWxTurn();o.p1=JSON.stringify(RD.wxp);
   RB.items.push({id:'tL',k:'test',tk:'AAA',dir:'long',t:Date.now()-H,E:1,SL:0.95,TP:1.1,sd:0.05,rr:1.5,st:'open',ex:'trl',x:exNew(),be:false});
   set(-0.6);rdWxTurn();o.wxa=RD.wxa&&RD.wxa.d+':'+RD.wxa.nT;
   RDV='sig';go('radar',true);renderAll();await W8(60);o.banner=(document.querySelector('#rdView .rdwxturn')||{}).textContent||'';
   set(0.1);rdWxTurn();o.cleared=RD.wxa==null;renderRadar();o.banner2=!!document.querySelector('#rdView .rdwxturn');
   RB.items=RB.items.filter(it=>it.id!=='tL');
   // 2) شبیه‌سازی روی مسیر: لانگ از 100، تا ساعت 2 به 102 (+0.4R)، ساعت 3 هوا برمی‌گردد، بعد ریزش تا 94 (استاپ 95)
   const t0=T0-10*H,E=100,it={id:'s1',k:'test',tk:'X',dir:'long',t:t0+60e3,E,SL:95,TP:107.5,sd:0.05,rr:1.5,st:'sl',R:-1.03,ex:'tp',hold:24};
   const C=[];for(let t=Math.floor(it.t/M5)*M5+M5;t<t0+9*H;t+=M5){const h=(t-t0)/H;const c=h<2?100+h:h<3.2?102:Math.max(94,102-(h-3.2)*6);C.push({t,o:c,h:c+0.05,l:c-0.05,c});}
   const W=new Map();for(let h=-3;h<12;h++)W.set(t0+h*H,h>=2?-0.6:0.3);   // کندل ساعت 2 (بسته در 3) نامناسب
   const sim=rbWxSim(it,C,W);o.sim={armed:sim.armed,trigH:sim.trig?(sim.trig-t0)/H:null,A:sim.A,B:sim.B};
   // ورود در هوای بد: دست نمی‌خورد
   const W2=new Map();for(let h=-3;h<12;h++)W2.set(t0+h*H,-0.6);const s2=rbWxSim(it,C,W2);o.notArmed=!s2.armed&&!s2.trig;
   // 3) جدول
   const res=[{it,wxx:sim},{it:Object.assign({},it,{id:'s2',R:0.5,st:'tp'}),wxx:{armed:false,trig:null,A:{R:0.5,how:'tp'},B:{R:0.5,how:'tp'}}}];
   o.tbl=rbWxTable(res).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');o.noData=rbWxTable([],true).replace(/<[^>]+>/g,' ');
   // 4) ذخیره و خواندن دوباره‌ی تاریخچه‌ی هوا (RDMF فقط در حافظه است)
   await idbSet('rdc:BTC',{rows:Array.from({length:400},(_,i)=>{const t=T0-(400-i)*H,c=100+i*0.1;return [t,c,c+0.2,c-0.2,c,1];})});
   RDMF.clear();RDMF.set(T0-2*H,[-0.5,0,-0.5,0,-0.5,-0.5]);RDMF.set(T0-H,[0.5,0,0.5,0,0.5,0.5]);RDWXH=null;RD.at=Date.now();
   const m1=await rdWxHist();o.saved=!!(m1&&m1.size===2&&await idbGet('rdwxh'));
   RDMF.clear();RDWXH=null;const m2=await rdWxHist();o.loaded=m2?m2.size:0;
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,1500));
 ok(/"long":"go"/.test(r.p1)||/"long":"mid"/.test(r.p1),'هوای اول ثبت شد');
 ok(r.wxa==='long:1'&&/هوا برای لانگ برگشت/.test(r.banner)&&/1 تست لانگ/.test(r.banner),'هوا که برای لانگ نامناسب شد: کادر «هوا برای لانگ برگشت» با شمار بازها');
 ok(r.cleared&&!r.banner2,'هوا که خوب شد، کادر می‌رود');
 ok(r.sim.armed&&r.sim.trigH===3&&r.sim.A.R>0.3&&r.sim.A.R<0.4&&r.sim.B.R>-0.05&&r.sim.B.R<0,'شبیه‌سازی: برگشت در ساعت 3؛ الف ≈ +0.4R (بسته شد)، ب ≈ 0 (ریسک‌فری و برگشت به ورود)');
 ok(r.notArmed,'ورود در هوای بد: قاعده دست نمی‌زند');
 ok(/الف\) هوا که برگشت/.test(r.tbl)&&/قاعده روی 1 تست اجرا شد/.test(r.tbl)&&/−1.03R/.test(r.tbl),'جدول آزمایشگاه با سطر فعلی، الف، ب و خلاصه‌ی تست‌هایی که قاعده رویشان اجرا شد');
 ok(/تازه کن/.test(r.noData),'بی تاریخچه‌ی هوا: راهنمای «تازه کن»');
 ok(r.saved&&r.loaded===2,'تاریخچه‌ی هوا در گوشی ذخیره می‌شود و بی بررسی تازه دوباره خوانده می‌شود');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
