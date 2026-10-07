/* پوزیشن‌های کانال در برابر خودم + فیلترهای مخصوص هر تب سیگنال‌ها */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);
 await p.addInitScript(()=>{const db=JSON.parse(localStorage.getItem('signaldesk.v1'));const H=36e5,n=Date.now();
   db.positions.push({id:'r1',sigId:'radar/BTC/1',ticker:'BTC',dir:'long',kind:'futures',entry:60000,stop:59000,stop0:59000,margin:10,lev:5,baseMargin:10,openedAt:n-30*H,closedAt:n-20*H,exitPrice:61500,fees:0,status:'closed',partials:[],log:[]},
     {id:'a1',sigId:'auto/SOL/low7/1',ticker:'SOL',dir:'short',kind:'futures',entry:150,stop:153,stop0:153,margin:10,lev:5,baseMargin:10,openedAt:n-40*H,closedAt:n-35*H,exitPrice:153,fees:0,status:'closed',partials:[],log:[]});
   localStorage.setItem('signaldesk.v1',JSON.stringify(db));localStorage.removeItem('signaldesk.possrc');localStorage.removeItem('signaldesk.repsrc');});
 await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== پوزیشن‌ها: کانال / خودم ===');
 const a=await p.evaluate(()=>{posFilter='all';go('positions',true);renderPositions();
   const src=Object.fromEntries(DB.positions.map(x=>[x.id,posSrc(x).k+'/'+posSrc(x).sub]));
   const pill=id=>{const c=document.getElementById('pos-'+id);return c&&c.querySelector('.pill.psrc')?c.querySelector('.pill.psrc').textContent:null;};
   const chips=[...document.querySelectorAll('#posSummary .psrcbar .fc')].map(x=>x.textContent);
   const cmp=(document.querySelector('#posSummary .srcwrap')||{}).textContent||'';
   return {src,pills:{p1:pill('p1'),p3:pill('p3'),r1:pill('r1'),a1:pill('a1')},chips,cmp};});
 console.log('   ',JSON.stringify(a).slice(0,600));
 ok(a.src.p1==='ch/ch'&&a.src.p2==='ch/ch'&&a.src.p3==='me/manual'&&a.src.r1==='me/radar'&&a.src.a1==='me/auto','منبع: از پست کانال ← کانال؛ رادار، پیشنهاد برنامه و دستی ← خودم');
 ok(a.pills.p1==='کانال'&&a.pills.p3==='خودم'&&a.pills.r1==='رادار'&&a.pills.a1==='برنامه','برچسب روی کارت');
 ok(a.chips.join('|')==='همه5|کانال2|خودم3','فیلتر منبع با شمارش: '+a.chips.join('|'));
 ok(/کانال در برابر خودم/.test(a.cmp)&&/رادار/.test(a.cmp)&&/پیشنهاد برنامه/.test(a.cmp),'جدول «کانال در برابر خودم»');
 const f=await p.evaluate(()=>{[...document.querySelectorAll('#posSummary .psrcbar .fc')][2].click();
   return {ids:[...document.querySelectorAll('#posList .card')].map(c=>c.id.slice(4)).sort().join(','),saved:localStorage.getItem('signaldesk.possrc')};});
 ok(f.ids==='a1,p3,r1'&&f.saved==='me','«خودم»: فقط پوزیشن‌های خودم ('+f.ids+')، روی دستگاه می‌ماند');
 // فرم ویرایش: منبع را دستی عوض کن
 const e=await p.evaluate(async()=>{const d=DB.positions.find(x=>x.id==='p3');sheetEditPos(d);await new Promise(r=>setTimeout(r,400));
   const s=document.getElementById('f_src');const had=!!s;s.value='ch';document.getElementById('ok').click();await new Promise(r=>setTimeout(r,300));
   return {had,src:posSrc(DB.positions.find(x=>x.id==='p3')).k};});
 ok(e.had&&e.src==='ch','فرم ویرایش: «منبع» ← کانال');
 const r=await p.evaluate(()=>{go('report',true);renderReport();const B=document.getElementById('repBody');
   const chips=[...B.querySelectorAll('.psrcbar .fc')].map(x=>x.textContent);const cmp=!!B.querySelector('.srccmp');
   [...B.querySelectorAll('.psrcbar .fc')][2].click();const B2=document.getElementById('repBody');
   return {chips,cmp,me:B2.textContent.slice(0,400),saved:localStorage.getItem('signaldesk.repsrc')};});
 console.log('   ',JSON.stringify(r).slice(0,400));
 ok(r.chips.join('|')==='همه3|کانال1|خودم2'&&r.cmp&&r.saved==='me','کارنامه: فیلتر منبع و جدول مقایسه');

 console.log('=== فیلترهای هر تب سیگنال‌ها ===');
 const t=await p.evaluate(()=>{go('signals',true);const out={};
   for(const k of ['now','mkt','new','all']){bucket='live';sigFilter=k;renderSignals();
     out[k]={side:!!document.querySelector('#fbar .fside'),tab:(document.querySelector('#fbar .ftab')||{}).textContent||''};}
   return out;});
 console.log('   ',JSON.stringify(t));
 ok(t.now.tab.includes('منبع')&&t.now.tab.includes('برنامه')&&t.now.tab.includes('جهت')&&!t.now.side,'«الان چه کنم؟»: منبع (کانال/برنامه) و جهت');
 ok(t.mkt.tab.includes('جهت')&&t.mkt.tab.includes('۳ ستاره')&&!t.mkt.side,'«بازار»: جهت و «فقط ۳ ستاره»');
 ok(t.new.tab.includes('بازار')&&t.new.tab.includes('اسپات')&&!t.new.side,'«در انتظار»: جهت و بازار');
 ok(t.all.side&&!t.all.tab,'«همه»: نتایج، منقضی، آرشیو و تاریخ — فقط همین‌جا');
 const nw=await p.evaluate(()=>{bucket='live';sigFilter='new';setView({newDir:'all'});const n0=document.querySelectorAll('#list .card').length;
   setView({newDir:'short'});const cards=[...document.querySelectorAll('#list .card')].map(c=>sigOf(POSTS.find(x=>x.id===c.dataset.id)).direction||'long');
   const cnt=+[...document.querySelectorAll('#fbar .fseg .fb')][2].querySelector('i').textContent;setView({newDir:'all'});return {n0,cards,cnt};});
 ok(nw.cards.every(d=>d==='short')&&nw.cards.length<nw.n0&&nw.cnt===nw.cards.length,'«در انتظار» + شورت: فقط شورت‌ها، عدد تب هم همان ('+nw.cards.length+' از '+nw.n0+')');
 const mk=await p.evaluate(()=>{const now=Date.now();const pl=(E,d)=>({dir:d,E,SL:d==='long'?E*0.98:E*1.02,TP:d==='long'?E*1.03:E*0.97,sd:0.02,rr:1.5});
   const c=(n,w,r,g,lb)=>({n,w,r,g,lb});const w=Array(RD_FEAT.length+1).fill(0);
   RD={v:4,at:now,mt0:now,n:10,reg:null,fund:{},rank:['AA','BB','CC'],M:{long:{w,q:[]},short:{w,q:[]}},calib:{'long|85-95':c(100,60,30,40,0.1),'short|85-95':c(100,40,-5,40,-0.2)},
     coins:{AA:{sc:90,dir:'long',best:'long',parts:{},px:1,t:now-36e5,pl:pl(1,'long')},BB:{sc:90,dir:'short',best:'short',parts:{},px:2,t:now-36e5,pl:pl(2,'short')},CC:{sc:50,dir:'wait',best:'long',parts:{},px:3,t:now-36e5,pl:null}}};
   bucket='live';sigFilter='mkt';RDV='sig';setView({mktDir:'all',mktOk:false});const all=[...document.querySelectorAll('#glance .rdit')].map(x=>x.dataset.rd).join(',');
   setView({mktDir:'short'});const sh=[...document.querySelectorAll('#glance .rdit')].map(x=>x.dataset.rd).join(',');
   setView({mktDir:'all',mktOk:true});const good=[...document.querySelectorAll('#glance .rdit')].map(x=>x.dataset.rd).join(',');
   const hid=(document.querySelector('#glance').textContent.match(/(\d+) سیگنال دیگر با فیلتر/)||[])[1];setView({mktOk:false});return {all,sh,good,hid};});
 ok(mk.all==='AA,BB'&&mk.sh==='BB'&&mk.good==='AA'&&mk.hid==='1','«بازار»: جهت و فقط ۳ ستاره (همه '+mk.all+'، شورت '+mk.sh+'، ۳★ '+mk.good+')');
 const nowF=await p.evaluate(()=>{bucket='live';sigFilter='now';setView({nowSrc:'app'});const g=document.getElementById('glance');
   const ch=g.querySelectorAll('.glsig:not(.assig):not(.rdit)').length;const as=!!g.querySelector('.assec');
   setView({nowSrc:'ch'});const as2=!!document.querySelector('#glance .assec');setView({nowSrc:'all'});return {ch,as,as2};});
 ok(nowF.ch===0&&nowF.as&&!nowF.as2,'«الان چه کنم؟» + برنامه: فقط پیشنهاد برنامه؛ + کانال: بی پیشنهاد برنامه');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
