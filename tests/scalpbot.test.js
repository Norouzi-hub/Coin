/* ربات اسکلپ: موتور (ورود بازار و سفارش، سیو سود، ریسک‌فری، استاپ، لیکوئید، لغزش، رنج ثابت)،
   تست خودکار روی گذشته، ربات زنده با پر کردن فاصله، انتقال جلسه‌های قدیمی، و رابط (منوی سایر و تب اسکلپ) */
const {pw,out}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
// نماد ساختگی RNG: نوسان سینوسی ±۳٪ دور ۱۰۰ با دوره‌ی ۴ ساعت — رنجِ تمیز برای ربات
const rng=t=>100*(1+0.03*Math.sin(2*Math.PI*t/(4*36e5)));
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 await ctx.route(/api\.binance\.com\/api\/v3\/klines\?symbol=RNGUSDT/,r=>{
   const u=new URL(r.request().url()), ms={'1m':6e4,'5m':3e5}[u.searchParams.get('interval')]||6e4;
   const st=+u.searchParams.get('startTime'), lim=+u.searchParams.get('limit'), now=Date.now(), rows=[];
   for(let t=Math.ceil(st/ms)*ms;t<=now&&rows.length<lim;t+=ms){const o=rng(t),c=rng(t+ms);rows.push([t,String(o),String(Math.max(o,c)),String(Math.min(o,c)),String(c),'1',t+ms-1]);}
   r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(rows)});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);

 console.log('=== ناوبری ===');
 const tabs=await p.evaluate(()=>[...document.querySelectorAll('.tab')].map(t=>t.dataset.v).join(','));
 ok(tabs==='signals,positions,scalp,report,more','تب‌ها: '+tabs);
 await p.click('.tab[data-v="more"]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>[...document.querySelectorAll('.moreit')].map(x=>x.dataset.go).join(',')==='audit,learn,settings'),'منوی سایر: کانال‌سنج، آموزش، تنظیمات');
 await p.click('.moreit[data-go="audit"]');await p.waitForTimeout(800);
 ok(await p.evaluate(()=>!document.querySelector('#vAudit').classList.contains('hide')&&document.querySelector('.tab[aria-selected="true"]').dataset.v==='more'),'کانال‌سنج زیر سایر');
 await p.click('#vAudit .crumb');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.querySelector('#vMore').classList.contains('hide')),'برگشت به سایر');

 console.log('=== موتور: ورود بازار، سیو سود نصف، ریسک‌فری، استاپ ===');
 // مسیر قیمت → کندل ۱ دقیقه‌ای؛ رنجِ ثابتِ ساختگی ۱۰۰ ⇄ ۱۱۰ با باند ۲٪ و «درجا»
 const mk=`(path,recChg)=>{const t0=Math.floor(Date.now()/6e4)*6e4-864e5;
   const X=path.slice(0,-1).map((o,i)=>{const c=path[i+1];return {t:t0+i*6e4,o,h:Math.max(o,c),l:Math.min(o,c),c};});
   const prof=T=>{const k=X.filter(x=>x.t<T).pop();return {supp:100,res:110,aP:2,recChg:recChg||0,last:k?k.c:X[0].o,legMax:3};};
   return {X,prof,t0};}`;
 const e1=await p.evaluate(mk=>{const {X,prof,t0}=eval(mk)([101,101.5,103,105.5,104,100.5,100.5,97.5,97,97]);
   const cfg=botCfg({mode:'auto',lev:10,roi:20,days:1,tf:'1m',mg:10,save:'half',fee:0,slip:0});
   const st=botInitSt(cfg,t0), ev=botRun(st,cfg,X,6e4,prof,Date.now());
   return ev.map(e=>e.k==='close'?'close:'+e.x.side+':'+e.x.by+':'+e.x.ex+':'+e.x.usd.toFixed(3)+':'+e.x.how:e.k+':'+(e.pos.side)+':'+(+e.pos.en.toFixed(4))+(e.k==='save'?':'+e.pos.mid:''));},mk);
 console.log('   ',e1.join(' | '));
 ok(e1[0]==='open:long:101','قیمت در یک‌سومِ پایینِ رنج و «درجا» ← لانگ بازار روی ۱۰۱');
 ok(e1[1]==='save:long:101:105.5','وسط راه (۱۰۵.۵): نصف بسته و استاپ روی ورود');
 ok(e1[2]==='close:long:be:101:2.228:mkt','برگشت به ۱۰۱: بقیه ریسک‌فری بسته شد؛ نصفِ اول +$2.23 را نگه داشت');
 ok(e1[3]==='open:long:100.5'&&e1[4]==='close:long:stop:98:-2.488:mkt','لانگ بعدی استاپ ۹۸ (یک باند زیر کف) خورد: −$2.49');
 ok(e1.length===5,'قیمت زیر رنج (شکسته) ← دیگر معامله‌ای باز نشد');

 console.log('=== موتور: سفارش روی لبه، شورت، تارگت ===');
 // وسط رنج «صبر»: دو سفارش روی لبه‌ها
 const e0=await p.evaluate(mk=>{const {X,prof,t0}=eval(mk)([105,106]);
   const cfg=botCfg({mode:'auto',lev:10,roi:20,days:1,tf:'1m',mg:10,save:'half',fee:0,slip:0});
   const st=botInitSt(cfg,t0);botRun(st,cfg,X,6e4,prof,Date.now());return {pend:st.pend.map(o=>o.side+'@'+o.en).join(','),act:st.plan&&st.plan.act,pos:st.pos};},mk);
 ok(e0.act==='wait'&&!e0.pos&&e0.pend==='long@100,short@110','وسط رنجِ درجا «صبر»: سفارش لانگ روی کف و شورت روی سقف');
 // قیمت در همان کندل از وسط به ۱۱۰.۲ می‌پرد ← سفارش شورت روی ۱۱۰ پر می‌شود
 const e2=await p.evaluate(mk=>{const {X,prof,t0}=eval(mk)([105,110.2,108,104,101,99.8,100.5]);
   const cfg=botCfg({mode:'auto',lev:10,roi:20,days:1,tf:'1m',mg:10,save:'half',fee:0,slip:0});
   const st=botInitSt(cfg,t0), ev=botRun(st,cfg,X,6e4,prof,Date.now());
   const c=ev.find(e=>e.k==='close');
   return {k:ev.map(e=>e.k+':'+(e.k==='close'?e.x.side:e.pos.side)),tr:c&&{by:c.x.by,how:c.x.how,half:c.x.half,usd:+c.x.usd.toFixed(3),ex:c.x.ex,en:c.x.en},
     pos:st.pos&&st.pos.side+'@'+st.pos.en+':'+st.pos.how};},mk);
 console.log('   ',JSON.stringify(e2));
 ok(e2.k[0]==='open:short'&&e2.tr&&e2.tr.how==='lim'&&e2.tr.en===110,'سفارش شورت روی سقف (۱۱۰) پر شد');
 ok(e2.tr&&e2.tr.by==='tp'&&e2.tr.half&&e2.tr.ex===100&&e2.tr.usd===6.818,'نصف روی ۱۰۵، بقیه سر تارگت ۱۰۰: +$6.82');
 ok(e2.k.join(',')==='open:short,save:short,close:short,open:long'&&e2.pos==='long@99.8:mkt','بعد از تارگت، قیمت کفِ رنج است ← کارت می‌گوید «الان لانگ» و ربات لانگ بازار می‌گیرد');
 const e3=await p.evaluate(mk=>{const {X,prof,t0}=eval(mk)([105,107,109,110.4,109],5);
   const cfg=botCfg({mode:'auto',lev:10,roi:20,days:1,tf:'1m',mg:10,save:'half',fee:0,slip:0});
   const st=botInitSt(cfg,t0), ev=botRun(st,cfg,X,6e4,prof,Date.now());return {n:ev.length,pend:st.pend.map(o=>o.side+'@'+o.en).join(','),tr:st.plan&&st.plan.trend};},mk);
 ok(e3.n===0&&e3.pend==='long@100'&&e3.tr==='up','روند صعودی: شورت روی سقف نمی‌گیرد؛ فقط سفارش لانگ روی کف');

 console.log('=== موتور: لیکوئید، لغزش، کارمزد ===');
 const e4=await p.evaluate(mk=>{const {X,prof,t0}=eval(mk)([101,100.2,99,98.5]);
   const cfg=botCfg({mode:'auto',lev:50,roi:20,days:1,tf:'1m',mg:10,save:'none',fee:0,slip:0});
   const st=botInitSt(cfg,t0), ev=botRun(st,cfg,X,6e4,prof,Date.now());const c=ev.find(e=>e.k==='close');
   return c&&{by:c.x.by,usd:c.x.usd,ex:+c.x.ex.toFixed(3)};},mk);
 ok(e4&&e4.by==='liq'&&e4.usd===-10&&e4.ex===99.485,'۵۰x: لیکوئید (۹۹.۴۸۵) پیش از استاپ ۹۸ ← کل مارجین −$10');
 const e5=await p.evaluate(mk=>{const {X,prof,t0}=eval(mk)([101,99,97.5]);
   const cfg=botCfg({mode:'auto',lev:10,roi:20,days:1,tf:'1m',mg:10,save:'none',fee:0.05,slip:0.1});
   const st=botInitSt(cfg,t0), ev=botRun(st,cfg,X,6e4,prof,Date.now());const o=ev.find(e=>e.k==='open'),c=ev.find(e=>e.k==='close');
   return {en:+o.pos.en.toFixed(4),ex:+c.x.ex.toFixed(4),roi:+c.x.roi.toFixed(3)};},mk);
 ok(e5.en===101.101&&e5.ex===97.902,'لغزش ۰.۱٪: ورود بازار ۱۰۱.۱۰۱، استاپ ۹۷.۹۰۲ (هر دو بدتر)');
 ok(Math.abs(e5.roi-((97.902-101.101)/101.101*1000-0.5))<0.002,'کارمزد ۰.۰۵٪×۱۰ = −۰.۵٪ روی مارجین: '+e5.roi);

 console.log('=== موتور: رنج ثابت، سر تارگت همان‌جا برعکس ===');
 const e6=await p.evaluate(mk=>{const {X,t0}=eval(mk)([105,101,99.5,104,110.5,113,116,112,109,100,95,95]);
   const cfg=botCfg({mode:'fix',lev:10,mg:10,save:'none',fee:0,slip:0,L:100,H:110,d:5,first:'long'});
   const st=botInitSt(cfg,t0), ev=botRun(st,cfg,X,6e4,null,Date.now());
   return ev.filter(e=>e.k==='close').map(e=>e.x.side+(e.x.roi>0?'+':'-')+e.x.en+'>'+e.x.ex+':'+e.x.usd.toFixed(2));},mk);
 console.log('   ',e6.join(' | '));
 ok(e6.join(' ')==='long+100>110:10.00 short-110>115:-4.55 short+110>100:9.09 long-100>95:-5.00','لانگ ۱۰۰→۱۱۰، شورت استاپ ۱۱۵، شورت دوباره ۱۱۰→۱۰۰، لانگ استاپ ۹۵');

 console.log('=== تست خودکار روی گذشته (نماد ساختگیِ نوسانی) ===');
 const bt=await p.evaluate(async()=>{S.fee=0.05;S.slip=0;
   const r=await botBacktest('RNG',{lev:10,roi:20,days:1,tf:'5m',mg:10},1);
   const sm=k=>{const s=r.res[k].s;return {n:s.n,w:s.w,usd:+s.usd.toFixed(2),dd:+s.dd.toFixed(2),by:s.by};};
   return {exec:r.exec,tf:r.tf,best:r.best,half:sm('half'),be:sm('be'),none:sm('none'),cut:r.cut,
     look:r.res.none.T.slice(0,4).map(x=>x.side+':'+x.how+':'+x.en.toFixed(2)+'>'+x.ex.toFixed(2))};});
 console.log('   ',JSON.stringify(bt));
 ok(bt.exec==='1m'&&bt.tf==='5m'&&!bt.cut,'اجرا با کندل ۱ دقیقه‌ای، ارزیابی هر ۵ دقیقه');
 ok(bt.none.n>=6&&bt.none.w===bt.none.n&&bt.none.usd>0,'روی نوسانِ تمیزِ ±۳٪: '+bt.none.n+' معامله، همه برد ('+bt.none.usd+'$)');
 ok(bt.half.n>=6&&bt.be.n>=6,'هر سه روشِ سیو سود سنجیده شد');
 ok(['half','be','none'].includes(bt.best)&&bt[bt.best].usd>=Math.max(bt.half.usd,bt.be.usd,bt.none.usd),'بهترین روش: '+bt.best);
 ok(bt.look.some(x=>x.startsWith('long'))&&bt.look.some(x=>x.startsWith('short')),'هم لانگ و هم شورت گرفت: '+bt.look.join(' '));

 console.log('=== رابط: تب اسکلپ و تست خودکار ===');
 await p.evaluate(()=>{SWOPT.open='bt';SWOPT.btN=1;SWOPT.days=1;SWOPT.tf='5m';SWOPT.lev=10;SWOPT.roi=20;swOptSave();go('scalp',true);});await p.waitForTimeout(500);
 const secs=await p.evaluate(()=>[...document.querySelectorAll('#scBody .swsec')].map(x=>x.dataset.id+':'+(x.classList.contains('on')?1:0)).join(','));
 ok(secs==='opt:0,tok:0,bt:1','سه بخش: تنظیم‌ها، بررسی توکن، تست خودکار ('+secs+')');
 await p.evaluate(()=>{const i=document.querySelector('#btTk');i.value='rng';i.dispatchEvent(new Event('change'));document.querySelector('#btGo').click();});
 for(let i=0;i<60&&!(await p.evaluate(()=>!!document.querySelector('#btRes .btres .btv')));i++)await p.waitForTimeout(300);
 const ui=await p.evaluate(()=>({rows:document.querySelectorAll('#btRes .btv tbody tr').length,on:document.querySelector('#btRes .btv tr.on')?.dataset.k,
   flag:document.querySelector('#btRes .btres .flag')?.textContent||'',svg:!!document.querySelector('#btRes .swsvg'),btn:!!document.querySelector('#btRes [data-bot="RNG"]')}));
 ok(ui.rows===3&&ui.on&&ui.svg&&ui.btn,'نتیجه: جدول سه روش، نمودار سرمایه و دکمه‌ی ربات');
 ok(/مثبت/.test(ui.flag)&&/نمونه کم است/.test(ui.flag),'جمع‌بندی: مثبت، با هشدارِ «نمونه کم است» — '+ui.flag.slice(0,70));
 await p.evaluate(()=>document.querySelector('#btRes .btv tr[data-k="none"]').click());await p.waitForTimeout(200);
 ok(await p.evaluate(()=>document.querySelector('#btRes .btv tr.on').dataset.k==='none'&&/همه سر تارگت/.test(document.querySelector('#btRes [data-bot]').textContent)),'زدن روی یک روش: همان انتخاب می‌شود');
 const bte=await p.$('#btRes .btres');if(bte)await bte.screenshot({path:out('scalpbot_bt.png')});

 console.log('=== ربات زنده: روشن کردن از نتیجه‌ی تست ===');
 await p.evaluate(()=>document.querySelector('#btRes [data-bot="RNG"]').click());await p.waitForTimeout(400);
 const sh=await p.evaluate(()=>({h:document.querySelector('#sheet h3')?.textContent||'',save:document.querySelector('#bSave .pbc.on')?.dataset.k,tf:document.querySelector('#bTf')?.value,days:document.querySelector('#bDays')?.value}));
 ok(/ربات خودکار/.test(sh.h)&&sh.save==='none'&&sh.tf==='5m'&&sh.days==='1','فرم ربات با تنظیمِ همان تست ('+JSON.stringify(sh)+')');
 await p.evaluate(()=>document.querySelector('#bGo').click());await p.waitForTimeout(800);
 const b1=await p.evaluate(()=>{const b=botList()[0];return {tk:b.tk,mode:b.cfg.mode,save:b.cfg.save,v:b.v,dev:b.dev===DEVID,view,card:!!document.querySelector('#bot-'+b.id)};});
 ok(b1.tk==='RNG'&&b1.mode==='auto'&&b1.save==='none'&&b1.v===2&&b1.dev&&b1.view==='scalp'&&b1.card,'ربات ساخته شد و کارتش در تب اسکلپ است');

 console.log('=== ربات زنده: برنامه ۶ ساعت بسته بوده ===');
 const lv=await p.evaluate(async()=>{const b=botList()[0];
   b.st=botInitSt(b.cfg,Math.floor((Date.now()-6*36e5)/6e4)*6e4);b.at=Date.now()-6*36e5;
   await botTick(true);
   const t=document.querySelector('#toast').textContent;
   return {n:b.tot.n,usd:b.tot.usd,lag:Date.now()-b.st.lastT,plan:b.st.plan&&b.st.plan.act,toast:t,saved:JSON.parse(localStorage.getItem('signaldesk.v1')).scalps[0].tot.n,
     loc:!!(lsGet('signaldesk.botst.v1')||{})[b.id]};});
 console.log('   ',JSON.stringify(lv));
 ok(lv.n>=2&&lv.usd>0,'از روی کندل‌ها همان معامله‌های ۶ ساعت ثبت شد: '+lv.n+' معامله، $'+lv.usd.toFixed(2));
 ok(lv.lag<3*60e3,'ربات تا همین دقیقه جلو آمد');
 ok(/وقتی برنامه بسته بود/.test(lv.toast),'پیغام: «وقتی برنامه بسته بود … معامله بست»');
 ok(lv.saved===lv.n&&lv.loc,'در داده ذخیره شد (برای پشتیبان و همگام‌سازی) و حالت تیک روی دستگاه');
 await p.evaluate(()=>go('scalp',true));await p.waitForTimeout(400);
 const card=await p.evaluate(()=>{const b=botList()[0], c=document.querySelector('#bot-'+b.id);return {t:c?.textContent.replace(/\s+/g,' ')||'',
   btns:[...c.querySelectorAll('.srow button')].map(x=>x.dataset.k).join(','),rows:c.querySelectorAll('.sctr tbody tr').length,svg:!!c.querySelector('.swsvg'),pos:!!b.st.pos};});
 ok(/ربات خودکار/.test(card.t)&&/معامله‌ی بسته/.test(card.t)&&card.rows===lv.n&&card.svg,'کارت ربات: آمار، نمودار سرمایه و فهرست معامله‌ها');
 ok(card.btns===(card.pos?'close,stop,del':'stop,del'),'دکمه‌ها: '+card.btns);
 const ce=await p.$('#scLive .scard');if(ce)await ce.screenshot({path:out('scalpbot_card.png')});

 console.log('=== دکمه‌ها: بستن دستی، توقف، ادامه، حذف و برگرداندن ===');
 const cl=await p.evaluate(()=>{const b=botList()[0];
   if(!b.st.pos){const ev=[];botOpen(b.st,b.cfg,{side:'long',tp:200,stop:50},100,Date.now(),'mkt',ev);}
   BOTPX.set('RNG',{px:101,at:Date.now()+1e4});const n0=b.tot.n;
   document.querySelector('#bot-'+b.id+' button[data-k="close"]')?.click()||botAct(b.id,'close');
   const x=b.trades[b.trades.length-1];return {n:b.tot.n-n0,by:x.by,ex:x.ex,pos:b.st.pos,lag:b.st.lastT-Date.now()};});
 ok(cl.n===1&&cl.by==='man'&&cl.ex===101&&!cl.pos&&cl.lag>=0,'«همین الان ببند»: دستی روی قیمت الان، و کندل‌های قبلش دوباره خوانده نمی‌شوند');
 await p.evaluate(()=>botAct(botList()[0].id,'stop'));await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!botList()[0].on&&!!document.querySelector('#bot-'+botList()[0].id+' button[data-k="resume"]')),'توقف ← دکمه‌ی ادامه');
 await p.evaluate(()=>botAct(botList()[0].id,'resume'));await p.waitForTimeout(200);
 ok(await p.evaluate(()=>botList()[0].on&&Date.now()-botList()[0].st.lastT<=6e4),'ادامه: از همین دقیقه (فاصله‌ی توقف حساب نمی‌شود)');
 const id=await p.evaluate(()=>botList()[0].id);
 await p.evaluate(id=>botAct(id,'del'),id);await p.waitForTimeout(200);
 ok(await p.evaluate(id=>!botList().some(x=>x.id===id),id),'حذف');
 await p.evaluate(()=>document.querySelector('#toast .tundo')?.click());await p.waitForTimeout(200);
 ok(await p.evaluate(id=>botList().some(x=>x.id===id),id),'برگرداندنِ حذف');
 ok(await p.evaluate(()=>!DB.positions.some(x=>x.ticker==='RNG')),'به پوزیشن‌ها و کارنامه اضافه نشد');

 console.log('=== جلسه‌ی «اسکلپ زنده»ی نسخه‌ی قبل ← ربات رنج ثابت ===');
 const mg=await p.evaluate(()=>{const now=Date.now();
   DB.scalps.push({id:'old1',tk:'TST',L:100,H:110,d:5,lev:10,mg:10,fee:0,first:'long',on:true,at:now-36e5,
     st:{pos:{side:'short',en:110,t:now-6e5},started:true,prev:108},trades:[{side:'long',en:100,ex:110,t0:now-3e6,t1:now-6e5,win:true,roi:100,usd:10,by:'tp'}],n:1,w:1,l:0,roi:100,usd:10});
   const b=botList().find(x=>x.id==='old1');
   return b&&{v:b.v,mode:b.cfg.mode,L:b.cfg.L,H:b.cfg.H,pos:b.st.pos&&b.st.pos.side+'@'+b.st.pos.en+'>'+b.st.pos.tp+'/'+b.st.pos.stop,n:b.tot.n,usd:b.tot.usd};});
 ok(mg&&mg.v===2&&mg.mode==='fix'&&mg.L===100&&mg.H===110&&mg.pos==='short@110>100/115'&&mg.n===1&&mg.usd===10,'منتقل شد: رنج، شورتِ باز و تاریخچه ماند — '+JSON.stringify(mg));

 console.log('=== ربات دستگاه دیگر ===');
 const tk=await p.evaluate(()=>{const b=botList().find(x=>x.id==='old1');b.dev='other-device';renderScalp();
   const c=document.querySelector('#bot-old1');const btns=[...c.querySelectorAll('.srow button')].map(x=>x.dataset.k).join(',');
   const ran=b.st.lastT;botTick(true);
   c.querySelector('button[data-k="take"]').click();
   return {btns,info:/دستگاه دیگری/.test(c.textContent),mine:b.dev===DEVID,on:b.on,lag:Math.abs(b.st.lastT-Date.now())};});
 ok(tk.btns==='take,del'&&tk.info,'رباتِ دستگاه دیگر: اینجا اجرا نمی‌شود؛ فقط «اجرا روی این دستگاه» و «حذف»');
 ok(tk.mine&&tk.on&&tk.lag<=6e4,'«اجرا روی این دستگاه»: از همین دقیقه اینجا ادامه می‌دهد');

 console.log('=== وسط تایپ، رندرِ دوره‌ای فرم را از نو نمی‌سازد ===');
 const fo=await p.evaluate(()=>{SWOPT.open='tok';swOptSave();renderScalp();const i=document.querySelector('#swTk');i.focus();i.value='SO';
   renderAll();const j=document.querySelector('#swTk');return {same:i===j,val:j.value};});
 ok(fo.same&&fo.val==='SO','فیلد و نوشته‌ی نیمه‌کاره سر جایش ماند');
 await p.evaluate(()=>document.activeElement.blur());

 console.log('=== کارت تصمیم: دو دکمه‌ی تازه ===');
 await p.evaluate(()=>{SWOPT.open='tok';swOptSave();renderScalp();const t0=Date.now()-3*864e5, seq=[];
   for(let i=0;i<72;i++)seq.push(i%2?103:97);
   const C=seq.slice(1).map((c,i)=>({t:t0+i*36e5,o:seq[i],h:Math.max(seq[i],c),l:Math.min(seq[i],c),c}));
   SWCOIN={tk:'RNG',o:Object.assign({},SWOPT),pr:coinProfile(C,SWOPT),sc:null,mp:null};paintSwCoin();});
 ok(await p.evaluate(()=>!!document.querySelector('.swdec #swDecBt')&&!!document.querySelector('.swdec #swDecBot')),'زیر کارت: «تست خودکار» و «ربات خودکار»');
 await p.evaluate(()=>document.querySelector('#swDecBot').click());await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/ربات خودکار/.test(document.querySelector('#sheet h3').textContent)&&!!document.querySelector('#bRoi')),'«ربات خودکار» فرم ربات را باز می‌کند');
 await p.evaluate(()=>closeSheet());await p.waitForTimeout(300);
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
