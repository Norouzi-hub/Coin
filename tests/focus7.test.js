/* 7 تا 14: هوای بازار، حالت تمرکز، بررسی خودکار سبک، «تازه» از rdLive، سنجش رتبه‌بندی، افق بلند، ورود Limit تست‌ها */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const H=36e5,M5=3e5,NOW=Date.now(),T0=Math.floor(NOW/H)*H-H;   // کندل سیگنال: یک ساعت پیش تا الان
 // LIM: از 100 آرام پایین می‌آید و نیم ساعت بعد از ثبت به 99 (Limit لانگ) می‌رسد
 await ctx.route(/klines\?symbol=LIMUSDT&interval=5m&startTime=(\d+)&limit=(\d+)/,r=>{const m=r.request().url().match(/startTime=(\d+)&limit=(\d+)/),out=[];
   for(let t=+m[1];t<Date.now()&&out.length<+m[2];t+=M5){const o=t<NOW-30*6e4?100:98.8,c=o;out.push([t,String(o),String(o+0.1),String(o-0.1),String(c),'1',t+M5-1]);}
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(out)});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async([NOW,T0])=>{
   const H=36e5,o={};
   // هوای بازار از عامل‌های یک کندل
   const mk=(tk,w,dir,sc)=>({dir,best:dir,sc,sL:sc,sS:20,since:T0+H,nw:false,p:0.6,t:T0,px:100,parts:{btc:w,mtot:w,mmc:w},pl:{dir,E:100,SL:98,TP:103,sd:0.02,rr:1.5}});
   RD.coins={BTC:mk('BTC',-0.6,'long',90),ETH:mk('ETH',-0.6,'long',92)};RD.rank=['BTC','ETH'];RD.at=NOW;
   o.wx={now:rdWxNow()&&+rdWxNow().w.toFixed(2),L:rdWxDir('long'),S:rdWxDir('short'),cls:[rdWxCls(0.3,'long'),rdWxCls(0.1,'long'),rdWxCls(-0.3,'short')]};
   RD.calib={long:{n:100,w:60,r:20},'long|85-95':{n:100,w:60,r:20,g:30,lb:0.15},'long|95+':{n:100,w:60,r:20,g:30,lb:0.15}};
   o.gate=rdList().map(x=>x.why);S.rdWx=false;o.gate2=rdList().map(x=>x.why);S.rdWx=true;
   RDV='sig';go('radar',true);renderAll();o.card=(document.querySelector('#rdView .rdwx')||{}).textContent||'';
   // سنجش رتبه‌بندی: امتیاز درست = IC مثبت؛ امتیاز تصادفی = نزدیک صفر
   const xs=new Map(),xr=new Map();let sd=5;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
   for(let d=0;d<20;d++)for(let h=0;h<12;h++){const t=d*864e5+h*2*H,A=[],B=[];
     for(let c=0;c<20;c++){const f=(rnd()-0.5)*0.1;A.push(f*10+(rnd()-0.5)*0.3,f);B.push(rnd(),f);}xs.set(t,A);xr.set(t,B);}
   o.xs=rdXsSum(xs);o.xr=rdXsSum(xr);
   // افق بلند: استاپ پهن‌تر و نمونه هر 4 ساعت
   const C=Array.from({length:400},(_,i)=>{const c=100+Math.sin(i/5)*2;return {t:i*H,o:c,h:c+0.5,l:c-0.5,c};});
   const a=asPlan(C,300,'long',0,RD_HZ.s),l=asPlan(C,300,'long',0,RD_HZ.l);o.hz={s:a.sd,l:l.sd,hold:[RD_HZ.s.hold,RD_HZ.l.hold]};
   // بررسی خودکار
   const a0=RD.at;RD.at=NOW-H;S.rdAuto='2h';o.auto=[rdAutoDue()];S.rdAuto='off';RD.at=NOW-5*H;o.auto.push(rdAutoDue());
   S.rdAuto='fav';RDFAV=['ETH'];RD.at=NOW-H;o.auto.push(rdAutoDue());S.rdAuto='2h';RD.at=NOW-3*H;o.auto.push(rdAutoDue());RD.at=a0;
   // «تازه» از rdLive
   o.nw=[rdNewSig({dir:'long',since:T0+H,nw:true}).nw,rdNewSig({dir:'long',since:T0+H,nw:false}).nw,rdNewSig({dir:'wait'})];
   // ورود Limit: قیمت الان 100، Limit لانگ 99
   RB.items=[];RB.pend=[];RB.voids=[];PRICES.set('LIM',100);
   const x={tk:'LIM',dir:'long',sc:88,stars:3,t:T0,pl:{dir:'long',E:99,SL:97,TP:102,sd:0.0202,rr:1.5}};
   const it=rbAdd('test',x);o.pend={st:it&&it.st,n:rbPend().length,items:RB.items.length,dl:it&&Math.round((it.dl-(T0+H))/H)};
   o.dup=rbAdd('test',x)===null;
   PRICES.set('LIM',99.5);rbCheck();o.still=rbPend().length;
   PRICES.set('LIM',98.9);rbCheck();o.fill={pend:rbPend().length,items:RB.items.length,st:RB.items[0]&&RB.items[0].st,E:RB.items[0]&&RB.items[0].E,hold:RB.items[0]&&RB.items[0].hold};
   // کهنه: کندل سیگنال 5 ساعت پیش ← ثبت نمی‌شود
   o.stale=rbAdd('test',Object.assign({},x,{tk:'OLD',t:T0-5*H}))===null;
   // بی‌قیمت: منتظر؛ بعد از مهلت باطل
   RB.items=[];PRICES.delete('ZZZ');const z=rbAdd('test',Object.assign({},x,{tk:'ZZZ'}));z.dl=Date.now()-1000;RBLC.set(z.id,Date.now());rbCheck();
   o.void={pend:rbPend().length,voids:RB.voids.length,st:RB.voids[0]&&RB.voids[0].st};
   // قیمت همین الان بهتر از Limit: همان لحظه پر می‌شود
   PRICES.set('NOW',98);const nn=rbAdd('test',Object.assign({},x,{tk:'NOW'}));o.now={st:nn&&nn.st,E:nn&&nn.E};
   // برنامه بسته بود: کندل 5 دقیقه‌ای به Limit می‌رسد ← پر می‌شود
   RB.items=[];RB.pend=[];PRICES.delete('LIM');const c=rbAdd('test',Object.assign({},x,{tk:'LIM'}));c.ct=Date.now()-60*6e4;RBLC.set(c.id,0);
   await rbCatchUp(true);o.cu={pend:rbPend().length,st:RB.items[0]&&RB.items[0].st};
   // صفحه‌ی آزمایشی: بخش «منتظر Limit» و باطل‌ها
   RB.pend=[Object.assign({},it,{id:'pp',st:'wait',dl:Date.now()+H})];RDV='test';renderRadar();
   const G=document.getElementById('rdView');o.ui={pend:!!G.querySelector('.rbpend'),void:/باطل شد/.test(G.textContent)};
   o.ui.html=G.innerHTML.slice(0,300);const pc=G.querySelector('[data-rb="pcancel"]');if(pc)pc.click();o.ui.cancel=rbPend().length===0;
   // حالت تمرکز
   S.focus=true;focusApply();go('focus',true);renderAll();
   const F=document.getElementById('focusBody');
   o.focus={tab:!document.querySelector('.tab[data-v="focus"]').classList.contains('hide'),radarTab:document.querySelector('.tab[data-v="radar"]').classList.contains('hide'),
     more:!document.getElementById('moreRadar').classList.contains('hide'),wx:!!F.querySelector('.rdwx'),txt:F.textContent};
   go('radar',true);o.focus.inMore=document.querySelector('.tab[data-v="more"]').getAttribute('aria-selected')==='true';
   F.querySelector&&0;go('focus',true);document.querySelector('#focusBody [data-fc="off"]').click();
   o.focus.off=!S.focus&&!document.querySelector('.tab[data-v="radar"]').classList.contains('hide');
   // کارنامه: انتخاب افق و عامل‌ها
   RD.M={long:{w:new Array(RD_FEAT.length+1).fill(0),q:[0]},short:{w:new Array(RD_FEAT.length+1).fill(0),q:[0]}};RD.hz='s';RD.fs='core';RD.mt0=NOW;
   RD.xs={nt:200,nd:20,k:3,ic:0.01,icT:0.5,sp:-0.1,spT:-0.4,pos:0.4};RD.hold={from:NOW-30*864e5,to:NOW,days:30,r:{'all|f':{n:10,w:3,r:-2,g:5,lb:-0.5}},xs:null};
   RDV='model';go('radar',true);renderRadar();const Mv=document.getElementById('rdView').textContent;
   o.model={hz:/افق معامله/.test(Mv)&&/بلند \(تا 3 روز\)/.test(Mv),xs:/رتبه‌بندی بهتر از شانس نیست/.test(Mv),hold:/در ماه قفل زیان‌ده بود/.test(Mv)};
   return o;},[NOW,T0]);
 console.log('   ',JSON.stringify(r).slice(0,1500));
 ok(r.wx.now===-0.6&&r.wx.L==='no'&&r.wx.S==='go'&&r.wx.cls.join()==='go,mid,go','هوای بازار: میانگین سه عامل؛ −0.6 برای لانگ نامناسب، برای شورت مناسب');
 ok(r.gate.every(w=>w==='wx')&&r.gate2.every(w=>w!=='wx'),'لانگِ خلاف هوا «قابل گرفتن» نیست (دلیل: خلاف هوای بازار)؛ با خاموش کردن فیلتر نه');
 ok(/هوا برای لانگ نامناسب است/.test(r.card),'کارت هوای بازار در «بازار»');
 ok(r.xs.ic>0.3&&r.xs.icT>2&&r.xs.sp>0&&Math.abs(r.xr.ic)<0.1&&Math.abs(r.xr.icT)<2.5,'سنجش رتبه‌بندی: امتیاز درست IC '+r.xs.ic+' (t='+r.xs.icT+')، تصادفی '+r.xr.ic);
 ok(r.hz.l>r.hz.s*1.5&&r.hz.hold.join()==='24,72','افق بلند: استاپ 2.5×ATR چهارساعته ('+(r.hz.l*100).toFixed(2)+'٪ در برابر '+(r.hz.s*100).toFixed(2)+'٪)، 72 ساعت');
 ok(r.auto.join()===',,fav,refresh','بررسی خودکار: هر 2 ساعت، فقط با زدن، واچ‌لیست هر 30 دقیقه');
 ok(r.nw[0]===true&&r.nw[1]===false&&r.nw[2]===null,'«تازه» از خودِ بررسی (rdLive)، بی حافظه‌ی جدا');
 ok(r.pend.st==='wait'&&r.pend.n===1&&r.pend.items===0&&r.pend.dl===2&&r.dup,'تست با Limit: منتظر می‌ماند (مهلت 2 ساعت بعد از کندل)، تکراری ثبت نمی‌شود');
 ok(r.still===1&&r.fill.pend===0&&r.fill.items===1&&r.fill.st==='open'&&r.fill.E===99&&r.fill.hold===24,'قیمت به Limit رسید ← باز با قیمت 99؛ قبلش نه');
 ok(r.stale,'سیگنال کهنه (مهلت Limit گذشته) ثبت نمی‌شود');
 ok(r.void.pend===0&&r.void.voids===1&&r.void.st==='void','مهلت گذشت و قیمت نرسید ← باطل (جدا از نتیجه‌ها)');
 ok(r.now.st==='open'&&r.now.E===98,'قیمت الان بهتر از Limit ← همان لحظه پر می‌شود');
 ok(r.cu.pend===0&&r.cu.st==='open','برنامه بسته بود: از کندل 5 دقیقه‌ای پر شدن Limit پیدا شد');
 ok(r.ui.pend&&r.ui.void&&r.ui.cancel,'«آزمایشی»: بخش «منتظر ورود Limit»، باطل‌ها، و «لغو سفارش»');
 ok(r.focus.tab&&r.focus.radarTab&&r.focus.more&&r.focus.wx&&/سیگنال‌های قابل گرفتن/.test(r.focus.txt)&&/پوزیشن‌های باز/.test(r.focus.txt)&&/7 روز اخیر/.test(r.focus.txt),'حالت تمرکز: تب «امروز» (هوا، سیگنال‌ها، پوزیشن‌ها، هفته)، «بازار» در «سایر»');
 ok(r.focus.inMore&&r.focus.off,'«بازار» زیر «سایر» روشن می‌ماند؛ خاموش کردن، تب «بازار» را برمی‌گرداند');
 ok(r.model.hz&&r.model.xs&&r.model.hold,'کارنامه: انتخاب افق و عامل‌ها، حکم رتبه‌بندی و ماه قفل');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
