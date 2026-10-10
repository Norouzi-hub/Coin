/* آزمایشی: آرشیو روزانه‌ی ماندگار، نشان «تازه»، تصویر، «اگر نگه داشته بودیم»، «قبلاً گرفته شده؟» و پشتیبان */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const H=36e5,NOW=Date.now();
 // HOLD: از ورود (100) هر ساعت 1٪ بالا می‌رود
 const h0=Math.floor((NOW-5*H)/H)*H;
 await ctx.route(/klines\?symbol=HOLDUSDT&interval=1h&startTime=(\d+)&limit=(\d+)/,r=>{const m=r.request().url().match(/startTime=(\d+)&limit=(\d+)/),out=[];
   for(let t=+m[1];t<Date.now()&&out.length<+m[2];t+=H){const k=(t-h0)/H,o=100+k,c=101+k;out.push([t,String(o),String(c),String(o),String(c),'1',t+H-1]);}
   return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(out)});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async([NOW,h0])=>{
   const H=36e5,base={k:'test',dir:'long',E:100,SL:98,TP:103,sd:0.02,rr:1.5,ex:'tp',sc:80};
   RB.items=[Object.assign({},base,{id:'A',tk:'HOLD',t:h0+60000,st:'man',R:0.5,xp:101,xt:NOW-H}),          // تازه بسته شد
     Object.assign({},base,{id:'B',tk:'OLD',t:NOW-50*H,st:'sl',R:-1.1,xp:98,xt:NOW-48*H}),                    // دو روز پیش
     Object.assign({},base,{id:'C',tk:'OPEN',t:NOW-30*60000,st:'open',x:exNew()})];                           // تازه باز شد
   rbSave();localStorage.setItem('signaldesk.rbseen',String(NOW-3*H));
   const dot=(()=>{RDV='sig';go('radar',true);renderAll();return !!document.querySelector('#rdFbar .rbdot');})();
   RDV='test';renderAll();const G=document.getElementById('rdView');
   const days=[...G.querySelectorAll('.rbday')],o={dot,nw:(G.querySelector('.rbnew')||{}).textContent||'',days:days.length,
     open0:days[0]&&days[0].open,rows0:days[0]&&days[0].querySelectorAll('.rbrow').length,open1:days[1]&&days[1].open,rows1:days[1]&&days[1].querySelectorAll('.rbrow').length,
     sum0:days[0]&&days[0].querySelector('summary').textContent,clear:!!G.querySelector('[data-rb="clear"]'),nwrows:G.querySelectorAll('.rbrow.nw').length,
     holdBtn:!!G.querySelector('.rbrow[data-id="A"] [data-rb="hold"]'),openHold:!!G.querySelector('.rbrow[data-id="C"] [data-rb="hold"]'),share:G.querySelectorAll('[data-rb="share"]').length};
   // روز دوم با باز کردن ساخته می‌شود
   days[1].open=true;await new Promise(r=>setTimeout(r,120));
   o.rows1b=G.querySelectorAll('.rbday')[1].querySelectorAll('.rbrow').length;
   // تصویر
   G.querySelector('.rbrow[data-id="A"] [data-rb="share"]').click();await new Promise(r=>setTimeout(r,300));
   o.sheet=(document.querySelector('#sheet h3')||{}).textContent||'';o.img=((document.getElementById('shImg')||{}).src||'').length;
   const d=rbShareData(RB.items[0]);o.sd={r:d.r,exit:d.exit,open:d.open,lev:d.lev>0,title:d.title};closeSheet();
   // اگر نگه داشته بودیم
   G.querySelector('.rbrow[data-id="A"] [data-rb="hold"]').click();
   for(let i=0;i<40&&!RBHOLD.has('A');i++)await new Promise(r=>setTimeout(r,100));
   await new Promise(r=>setTimeout(r,100));
   o.hold=RBHOLD.get('A');o.holdTx=(document.querySelector('#rdView .rbrow[data-id="A"] .rbhold')||{}).textContent||'';
   // قبلاً گرفته شده؟
   const t1=rdTaken('OPEN'),t2=rdTaken('OLD'),t3=rdTaken('NONE');
   o.tk={ot:!!t1.ot,h1:rdTakenHtml({dir:'short'},t1),lt:t2.lt.length,h2:rdTakenHtml({dir:'long'},t2),none:rdTakenHtml({dir:'long'},t3)};
   // استیبل‌کوین
   const flat=Array.from({length:800},(_,i)=>({c:1+0.001*Math.sin(i)})),move=Array.from({length:800},(_,i)=>({c:1+0.2*Math.sin(i/50)}));
   o.peg=[RD_SKIP.test('USDGO'),RD_SKIP.test('BTC'),RD_SKIP.test('CRVUSD'),rdPegged(flat),rdPegged(move)];
   // رفتن از صفحه ← دیده شد
   go('positions',true);o.after=rbNewN();
   // پشتیبان: تست‌ها در شمارش و بازیابی
   const c=dataCounts({rdbook:{items:RB.items}}).find(x=>x[0]==='تست بازار');o.cnt=c&&c[1];
   const keep=RB.items.slice();applyBackup(Object.assign({},dbBlob(),{settings:S}));o.keep=RB.items.length===keep.length;
   applyBackup(Object.assign({},dbBlob(),{settings:S,rdbook:{items:keep.slice(0,1)}}));o.rest=RB.items.length;
   return o;},[NOW,h0]);
 console.log('   ',JSON.stringify(r).slice(0,900));
 ok(r.dot,'تب «آزمایشی» نقطه‌ی «تازه» دارد وقتی جای دیگری هستی');
 ok(/از آخرین سر زدن/.test(r.nw)&&/1 تست بسته شد/.test(r.nw)&&/1 تست تازه باز شد/.test(r.nw),'سطر «از آخرین سر زدن»: یکی بسته و یکی باز شد');
 ok(r.nwrows===2,'ردیف‌های تازه نشان دارند ('+r.nwrows+')');
 ok(r.days===2&&r.open0&&r.rows0===1&&!r.open1&&r.rows1===0&&r.rows1b===1,'آرشیو روزانه: دو روز، امروز باز؛ روز قبل با باز کردن ساخته می‌شود');
 ok(/امروز/.test(r.sum0)&&/1 تست/.test(r.sum0)&&/\+0\.5/.test(r.sum0),'سرِ هر روز: تعداد، برد و جمع R و دلار');
 ok(!r.clear,'دکمه‌ی «پاک کردن همه‌ی بسته‌ها» دیگر نیست');
 ok(r.holdBtn&&!r.openHold&&r.share===2,'دکمه‌ی «اگر نگه داشته بودیم» برای بسته‌ها، «تصویر» برای همه');
 ok(/تصویر نتیجه · HOLD/.test(r.sheet)&&r.img>1000&&r.sd.r===0.5&&r.sd.exit===101&&!r.sd.open&&r.sd.lev&&/تست بسته شد/.test(r.sd.title),'تصویر: همان کارت پوزیشن واقعی با داده‌ی تست');
 ok(r.hold&&r.hold.r>2&&r.hold.best>2&&r.hold.stopAt==null&&/اگر نگه داشته بودیم/.test(r.holdTx)&&/نگه داشتن بهتر بود/.test(r.holdTx),'«اگر نگه داشته بودیم»: الان +'+(r.hold&&r.hold.r)+'R، بیشتر از نتیجه‌ی واقعی');
 ok(r.tk.ot&&/در تست/.test(r.tk.h1)&&/خلاف این سیگنال/.test(r.tk.h1)&&r.tk.lt===1&&/قبلاً تست شده/.test(r.tk.h2)&&r.tk.none==='','روی کارت سیگنال: «در تست»، «قبلاً تست شده» یا هیچ');
 ok(r.peg.join()==='true,false,true,true,false','استیبل‌کوین‌ها (USDGO، قیمت میخ‌شده) بیرون؛ BTC و ارز پرنوسان نه');
 ok(r.after===0,'بعد از رفتن از صفحه، دیگر تازه نیستند');
 ok(r.cnt===3&&r.keep&&r.rest===1,'پشتیبان: تست‌ها شمرده و بازیابی می‌شوند؛ فایل قدیمی بی تست، تست‌ها را پاک نمی‌کند');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
