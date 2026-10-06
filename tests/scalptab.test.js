/* تب اسکلپ: نوار (بررسی/ربات‌ها/تست‌ها/گزارش/تنظیم)، نگه‌داری ۵ تا ۱۰ دقیقه، ضریب کارمزد، دلیلِ معامله‌نشدن،
   تاریخچه‌ی تست‌ها (ذخیره، برچسب، فیلتر، مقایسه، حذف)، فیلتر ربات‌های خودکار/دستی، و گزارش */
const {pw,out}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
const rng=t=>100*(1+0.02*Math.sin(2*Math.PI*t/(2*36e5))+0.004*Math.sin(2*Math.PI*t/(7*6e4)));
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 await ctx.route(/api\.binance\.com\/api\/v3\/klines\?symbol=RNGUSDT/,r=>{
   const u=new URL(r.request().url()), ms={'1m':6e4,'3m':18e4,'5m':3e5}[u.searchParams.get('interval')]||6e4;
   const st=+u.searchParams.get('startTime'), lim=+u.searchParams.get('limit'), now=Date.now(), rows=[];
   for(let t=Math.ceil(st/ms)*ms;t<=now&&rows.length<lim;t+=ms){const o=rng(t),c=rng(t+ms),w=0.0012*o*(1+Math.sin(t/7e5));
     rows.push([t,String(o),String(Math.max(o,c)+w),String(Math.min(o,c)-w),String(c),String(100+50*Math.abs(Math.sin(t/9e5))),t+ms-1]);}
   r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(rows)});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);

 console.log('=== نوار تب اسکلپ ===');
 await p.evaluate(()=>{Object.assign(SWOPT,{style:'scalp',open:'tok',tf:'1m',lev:10,miss:3,flt:{},costX:3,tmax:60,tearly:0});swOptSave();go('scalp',true);});await p.waitForTimeout(400);
 const bar=await p.evaluate(()=>({v:[...document.querySelectorAll('.scbar [data-v]')].map(x=>x.dataset.v).join(','),sum:document.querySelector('.scsum').textContent,tk:!!document.querySelector('#swTk')}));
 ok(bar.v==='tok,bots,bt,rep,opt'&&bar.tk,'نوار: بررسی، ربات‌ها، تست‌ها، گزارش + تنظیم؛ صفحه‌ی بررسی باز است');
 ok(/اسکلپ/.test(bar.sum)&&/حداکثر/.test(bar.sum),'خلاصه‌ی تنظیم‌ها بالای تب: '+bar.sum.trim().slice(0,60));
 for(const [v,sel] of [['opt','#swTmax'],['bt','#btGo'],['rep','.repp'],['bots','#scLive']]){
   await p.evaluate(v=>document.querySelector('.scbar [data-v="'+v+'"]').click(),v);await p.waitForTimeout(150);
   ok(await p.evaluate(([v,sel])=>scView()===v&&!!document.querySelector(sel)&&document.querySelector('.scbar [data-v="'+v+'"]').getAttribute('aria-pressed')==='true',[v,sel]),'صفحه‌ی «'+v+'»');
 }
 const op=await p.evaluate(()=>{scGo('opt');return {tm:[...document.querySelectorAll('#swTmax option')].map(o=>o.value).join(','),te:[...document.querySelectorAll('#swTearly option')].map(o=>o.value).join(','),cx:!!document.querySelector('#swCostX')};});
 ok(op.tm.startsWith('5,10,')&&op.te.includes('2,3,5')&&op.cx,'تنظیم: نگه‌داری ۵ و ۱۰ دقیقه، خروج زودِ ۲/۳/۵ دقیقه، ضریب کارمزد');

 console.log('=== تارگت به اندازه‌ی مدتِ نگه‌داری؛ ضریب کارمزد ===');
 const sh=await p.evaluate(()=>{
   const x={p:100,k:{o:99.5,h:100.1,l:99,c:100},kp:{o:100,h:100.2,l:99.4,c:99.6},rsi:33,rsiP:28,rsiLo:25,rsiHi:40,atr:0.1,
     bbU:104,bbL:99.9,bbM:102,bbUp:104,bbLp:100.1,vwap:99,volR:1,e20:101,e50:100.5,hm:2,btc:null,i:30};
   const o={lev:10,fee:0.1,slip:0.05,miss:2,flt:{}};
   const a=scDecide(x,Object.assign({},o,{tmax:60})), b5=scDecide(x,Object.assign({},o,{tmax:5}));
   const c3=scDecide(x,Object.assign({},o,{tmax:5,costX:3})), c15=scDecide(x,Object.assign({},o,{tmax:5,costX:1.5}));
   return {tp60:+a.plan.tpP.toFixed(3),tp5:+b5.plan.tpP.toFixed(3),c3:c3.act+':'+c3.why,c15:c15.act};});
 ok(sh.tp60===1.2&&Math.abs(sh.tp5-0.346)<0.002,'تارگت: نگه‌داری ۶۰ دقیقه ۱.۲٪، ۵ دقیقه ۰.۳۵٪ (نوسانِ همان ۵ دقیقه) — '+sh.tp60+' / '+sh.tp5);
 ok(sh.c3==='wait:cost'&&sh.c15==='long','۰.۳۵٪ با کارمزد+لغزش ۰.۲٪: ضریب ۳ ← «ارزش ندارد»، ضریب ۱.۵ ← «الان لانگ»');

 console.log('=== تست ۵ دقیقه‌ای و دلیلِ معامله‌نشدن ===');
 const bt=await p.evaluate(async()=>{S.fee=0.02;S.slip=0;
   const r=await botBacktest('RNG',{style:'scalp',lev:10,tf:'1m',mg:10,tmax:5,tearly:2,miss:3,flt:{},costX:2},1);
   const all=Object.values(r.res).flatMap(v=>v.T);
   const z=await botBacktest('RNG',{style:'scalp',lev:10,tf:'1m',mg:10,tmax:5,miss:3,flt:{},costX:500},1);
   return {n:r.res[r.best].s.n,max:Math.max(0,...all.map(x=>(x.t1-x.t0)/6e4)),hold:r.res[r.best].s.hold,why:r.res[r.best].why,
     zn:z.res[z.best].s.n,zwhy:z.res[z.best].why,zv:botVerdict(z.res[z.best].s,z,z.res[z.best].why)[1],zh:botWhyHtml(z.res[z.best].why)};});
 console.log('   ',JSON.stringify({n:bt.n,max:bt.max,hold:bt.hold,why:bt.why,zwhy:bt.zwhy}));
 ok(bt.n>0&&bt.max<=6,'نگه‌داری ۵ دقیقه: '+bt.n+' معامله، طولانی‌ترین '+bt.max+' دقیقه');
 ok(bt.why&&bt.why.in>0&&bt.why.mid>0,'شمارش تصمیم‌ها: «وارد شد» و «وسطِ باندها» ثبت شد');
 ok(bt.zn===0&&bt.zwhy.cost>0&&/ضریب کارمزد/.test(bt.zv)&&/تارگت کوچک/.test(bt.zh),'بی‌معامله: دلیل صریح («تارگت کوچک در برابر کارمزد» و راه‌حل)');

 console.log('=== تاریخچه‌ی تست‌ها ===');
 await p.evaluate(()=>{Object.assign(SWOPT,{open:'bt',btN:1,btTk:'RNG BTC',tmax:10,tearly:0,costX:2});swOptSave();renderScalp();localStorage.removeItem('signaldesk.bthist.v1');BTH=[];});
 await p.evaluate(()=>document.querySelector('#btGo').click());
 for(let i=0;i<100&&(await p.evaluate(()=>BTQ.on||BTH.length<2));i++)await p.waitForTimeout(300);
 const h1=await p.evaluate(()=>({n:BTH.length,tags:BTH.map(e=>e.tag),open:document.querySelectorAll('#btRes .btres').length,sum:!!document.querySelector('#btRes .btsum'),
   saved:(JSON.parse(localStorage.getItem('signaldesk.bthist.v1'))||[]).length,tabN:document.querySelector('.scbar [data-v="bt"] i')?.textContent}));
 console.log('   ',JSON.stringify(h1));
 ok(h1.n===2&&h1.saved===2&&h1.tabN==='2'&&h1.tags[0]==='اسکلپ ۱ دقیقه · 10 دقیقه','دو تست ذخیره شد با برچسب خودکار «اسکلپ ۱ دقیقه · ۱۰ دقیقه»');
 ok(h1.open===2&&h1.sum,'نتیجه‌های همین اجرا باز، با جدول خلاصه‌ی چندنمادی');
 await p.reload();await p.waitForTimeout(2500);
 await p.evaluate(()=>{SWOPT.open='bt';swOptSave();go('scalp',true);});await p.waitForTimeout(400);
 const h2=await p.evaluate(()=>({rows:document.querySelectorAll('#btRes .btrow').length,n:BTH.length}));
 ok(h2.n===2&&h2.rows===2,'بعد از بستن و باز کردن برنامه: هر دو تست هست (جمع‌شده)');
 await p.evaluate(()=>document.querySelector('#btRes .btrow').click());await p.waitForTimeout(150);
 ok(await p.evaluate(()=>document.querySelectorAll('#btRes .btres').length===1&&!!document.querySelector('#btRes .btres .btv')),'زدن روی یک ردیف: کارت کامل باز شد');
 await p.evaluate(()=>document.querySelector('#btRes .btres [data-act="tag"]').click());await p.waitForTimeout(300);
 await p.evaluate(()=>{document.querySelector('#btTagI').value='آلت‌ها ۱۰ دقیقه';document.querySelector('#btTagGo').click();});await p.waitForTimeout(400);
 ok(await p.evaluate(()=>BTH.some(e=>e.tag==='آلت‌ها ۱۰ دقیقه')&&[...document.querySelectorAll('#btRes .btf [data-tag]')].some(b=>b.dataset.tag==='آلت‌ها ۱۰ دقیقه')),'برچسب دلخواه، و دکمه‌ی فیلترش');
 await p.evaluate(()=>[...document.querySelectorAll('#btRes .btf [data-tag]')].find(b=>b.dataset.tag==='آلت‌ها ۱۰ دقیقه').click());await p.waitForTimeout(150);
 ok(await p.evaluate(()=>document.querySelectorAll('#btRes .btres,#btRes .btrow').length===1),'فیلتر برچسب: فقط همان یک تست');
 await p.evaluate(()=>{SWOPT.btF={tag:'',st:''};BTH.forEach(e=>{BTOPEN.add(e.id);});paintBt();
   document.querySelectorAll('#btRes .btres [data-act="cmp"]').forEach(b=>b.click());});await p.waitForTimeout(200);
 const cm=await p.evaluate(()=>({th:document.querySelectorAll('#btRes .btcmp thead th').length,rows:document.querySelectorAll('#btRes .btcmp tbody tr').length}));
 ok(cm.th===3&&cm.rows>=8,'مقایسه‌ی دو تست کنار هم ('+cm.rows+' ردیف)');
 const ce=await p.$('#btRes');if(ce)await ce.screenshot({path:out('scalptab_tests.png')});
 await p.evaluate(()=>document.querySelector('#btRes .btres [data-act="del"]').click());await p.waitForTimeout(200);
 ok(await p.evaluate(()=>BTH.length===1&&JSON.parse(localStorage.getItem('signaldesk.bthist.v1')).length===1),'حذف یک تست');

 console.log('=== ربات‌ها: خودکار و دستی جدا ===');
 const bf=await p.evaluate(()=>{
   const a=botNew({mode:'scalp',tk:'RNG',lev:10,mg:10,tf:'1m',tmax:10,save:'none'});
   const m=botNew({mode:'fix',tk:'RNG',lev:10,mg:10,L:98,H:102,d:1,first:'long',save:'none'});
   m.on=false;
   const now=Date.now();
   a.trades.push({side:'long',en:100,ex:101,t0:now-2*36e5,t1:now-2*36e5+5*6e4,how:'mkt',by:'tp',roi:9,usd:0.9},{side:'short',en:101,ex:101.5,t0:now-36e5,t1:now-36e5+3*6e4,how:'mkt',by:'stop',roi:-5,usd:-0.5});
   m.trades.push({side:'long',en:98,ex:102,t0:now-5*36e5,t1:now-4*36e5,how:'lim',by:'tp',roi:40,usd:4});
   SWOPT.open='bots';SWOPT.botF={k:'all',s:'all'};renderScalp();
   const cnt=()=>document.querySelectorAll('#scLive .scard').length;
   const r={all:cnt()};
   document.querySelector('.botf [data-k="auto"]').click();r.auto=cnt();
   document.querySelector('.botf [data-k="man"]').click();r.man=cnt();
   document.querySelector('.botf [data-k="all"]').click();document.querySelector('.botf [data-s="off"]').click();r.off=cnt();
   document.querySelector('.botf [data-s="all"]').click();
   return r;});
 ok(bf.all===2&&bf.auto===1&&bf.man===1&&bf.off===1,'فیلتر ربات‌ها: همه ۲، خودکار ۱، دستی ۱، متوقف ۱');

 console.log('=== گزارش ===');
 await p.evaluate(()=>scGo('rep'));await p.waitForTimeout(200);
 const rp=await p.evaluate(()=>({st:[...document.querySelectorAll('.scview .stats .st b')].map(x=>x.textContent).join('|'),
   tg:[...document.querySelectorAll('.scview .tgl')].map(x=>x.textContent).join('|'),net:document.querySelector('.scview .stats .st:nth-child(3) span').textContent,
   mode:[...document.querySelectorAll('.scview .reptb td:first-child')].map(x=>x.textContent).join('|')}));
 console.log('   ',JSON.stringify(rp).slice(0,300));
 ok(/معامله/.test(rp.st)&&/نرخ برد/.test(rp.st)&&/خالص/.test(rp.st)&&/\$4\.40/.test(rp.net),'کارنامه: ۳ معامله، خالص $4.40');
 ok(['روزبه‌روز','خودکار یا دستی','به تفکیک نماد','روش سیو سود','چطور بسته شد','ساعتِ ورود','تست‌ها به تفکیک برچسب'].every(t=>rp.tg.includes(t)),'جدول‌ها: روزانه، خودکار/دستی، نماد، سیو، نوع خروج، ساعت، تست‌ها');
 ok(/خودکار · اسکلپ/.test(rp.mode)&&/دستی · رنج ثابت/.test(rp.mode),'خودکار و دستی جدا');
 const re=await p.$('.scview');if(re)await re.screenshot({path:out('scalptab_report.png')});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
