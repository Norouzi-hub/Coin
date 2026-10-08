/* آزمایشگاه خروج: مسیر واقعی قیمت هر تست، آستانه‌های خروج سریع و خروجی JSON */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900},acceptDownloads:true});await route(ctx);
 const H=36e5,M5=3e5,T0=Math.floor((Date.now()-30*H)/M5)*M5;
 // LAB: ورود 100؛ تا یک ساعت بعد به 103 می‌رسد (+1.5R با استاپ 2٪)، بعد تا ساعت سوم به 97 می‌افتد (استاپ 98)
 const px=t=>{const m=(t-T0)/6e4;return m<=60?100+3*m/60:m<=180?103-6*(m-60)/120:97;};
 await ctx.route(/klines\?symbol=LABUSDT&interval=5m&startTime=(\d+)&limit=(\d+)/,r=>{const u=r.request().url(),m=u.match(/startTime=(\d+)&limit=(\d+)/),out=[];
   for(let t=+m[1];t<Date.now()&&out.length<+m[2];t+=M5){const o=px(t),c=px(t+M5);out.push([t,String(o),String(Math.max(o,c)),String(Math.min(o,c)),String(c),'1',t+M5-1]);}
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(out)});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async T0=>{
   RB.items=[{id:'L1',k:'test',tk:'LAB',dir:'long',t:T0,E:100,SL:98,TP:103,sd:0.02,rr:1.5,st:'sl',R:-1.1,xt:T0+3*36e5,ex:'tp'}];
   await rbLabRun();const x=RBL.res[0],st=x.st,it=x.it;
   const s1=rbThSim(it,x.C,1),s2=rbThSim(it,x.C,2);
   bucket='live';sigFilter='mkt';RDV='test';RBLOPEN=true;go('signals',true);renderAll();
   const G=document.getElementById('glance'),lab=(G.querySelector('.rblabw')||{}).textContent||'';
   const J=JSON.parse(rbLabExport());
   return {mfe:st.mfe,t:Math.round((st.tMfe-T0)/6e4),stop:Math.round((st.stopAt-T0)/6e4),t1:st.touch[1]!=null,t2:st.touch[2]!=null,full:st.full,lev:st.lev,
     s1,s2,lab,J:{n:J.trades.length,hlc:J.trades[0].path.hlc.length,max:Math.max(...J.trades[0].path.hlc.map(a=>a[0])),stats:J.trades[0].stats,settings:!!J.settings}};},T0);
 console.log('   ',JSON.stringify(Object.assign({},r,{lab:r.lab.slice(0,300)})));
 ok(Math.abs(r.mfe-1.5)<0.01&&Math.abs(r.t-60)<=5&&r.stop>=150&&r.stop<=160,'بیشترین سود پیش از استاپ +1.5R در دقیقه‌ی ~60؛ استاپ ~دقیقه‌ی 155');
 ok(r.t1&&!r.t2&&r.full,'به +1R رسید، به +2R نه؛ 24 ساعت کامل');
 ok(r.s1.how==='th'&&r.s1.R>0.8&&r.s2.how==='sl','خروج سریع در +1R ← برد؛ آستانه‌ی +2R ← استاپ');
 ok(/اگر خارج می‌شدیم در/.test(r.lab)&&/5٪ سود روی مارجین/.test(r.lab)&&/نقشه‌ی فعلی/.test(r.lab)&&/بیشترین سود پیش از استاپ/.test(r.lab),'جدول آستانه‌ها و فهرست معامله‌ها');
 ok(r.J.n===1&&r.J.hlc>=280&&r.J.max===300&&r.J.stats.mfe===1.5&&r.J.settings,'خروجی JSON: مسیر کامل (ده‌هزارم ورود؛ اوج +3٪) و آمار');
 const [d]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#glance [data-rbl="dl"]').click())]);
 ok(/signaldesk-tests-.*\.json$/.test(d.suggestedFilename()),'دکمه‌ی «دانلود فایل»: '+d.suggestedFilename());
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
