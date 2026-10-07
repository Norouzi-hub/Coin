/* حال بازار، رویدادهای هر ارز روی کارت و «الان چه کنم؟»، و کانال‌سنج به تفکیک حال بازار */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 // ۹۰ ارز منفی، ۱۰ مثبت، ۵ استیبل و اهرمی (کنار می‌روند)، بیت‌کوین −۳٪
 const rows=[{symbol:'BTCUSDT',openPrice:'100',lastPrice:'97',quoteVolume:'1e9'}];
 for(let i=0;i<89;i++)rows.push({symbol:'D'+i+'USDT',openPrice:'100',lastPrice:String(100-1-(i%12)),quoteVolume:'1e6'});
 for(let i=0;i<10;i++)rows.push({symbol:'U'+i+'USDT',openPrice:'100',lastPrice:'104',quoteVolume:'1e6'});
 for(const s of ['USDCUSDT','FDUSDUSDT','BTCUPUSDT','ETH3LUSDT'])rows.push({symbol:s,openPrice:'1',lastPrice:'0.5',quoteVolume:'1e6'});
 rows.push({symbol:'DEADUSDT',openPrice:'1',lastPrice:'0.5',quoteVolume:'100'});
 await ctx.route('**/ticker/24hr**',r=>r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(rows)}));
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3000);

 console.log('=== ۱: حال بازار ===');
 const m=await p.evaluate(async()=>{const m=await mktLoad(true);return m&&{n:m.n,up:m.up,down:m.down,reg:m.reg,btc:m.btc,bins:m.bins.join(','),src:m.src};});
 console.log('   ',JSON.stringify(m));
 ok(m&&m.n===100&&m.down===90&&m.up===10,'۱۰۰ بازار (استیبل، اهرمی و مرده کنار رفتند): ۹۰ نزولی، ۱۰ صعودی');
 ok(m&&m.reg==='bear2'&&Math.abs(m.btc+3)<1e-9,'«خیلی نزولی»، بیت‌کوین −۳٪');
 const g=await p.evaluate(()=>{const now=Date.now();SYMBOLS.add('MKA');PRICES.set('MKA',100);SYMVER++;
   POSTS.unshift({id:'ccoineres/97100',num:97100,text:'#MKA لانگ\nورود 100\nحد ضرر 96\nتارگت 108',date:new Date(now-6e4),link:'x'});
   KGEN++;GLSHUT=false;bucket='live';sigFilter='new';go('signals',true);renderAll();
   const G=document.getElementById('glance');return {mkt:(G.querySelector('.mkt')||{}).textContent||'',head:G.querySelector('.glh').textContent,bars:G.querySelectorAll('.mkbars i').length};});
 console.log('   ',g.mkt.slice(0,160));
 ok(/حال بازار · خیلی نزولی/.test(g.mkt)&&/صعودی 10/.test(g.mkt)&&/نزولی 90/.test(g.mkt)&&g.bars===11,'در «الان چه کنم؟»: عددها و نمودار ۱۱ ستونه');
 ok(/بازار خیلی نزولی/.test(g.head),'در سربرگ بسته هم: «بازار خیلی نزولی»');
 ok(/سیگنالِ لانگ داری/.test(g.mkt),'هشدار: بازار نزولی و سیگنال لانگ');

 console.log('=== ۲: رویدادهای ارز ===');
 const e=await p.evaluate(()=>{const H=36e5,t0=Math.floor(Date.now()/H)*H-30*24*H,C=[];
   // ۲۹ روز رنج ۱۰۰–۱۰۲، روز آخر ریزش تا ۹۰ (شکست کف ۳۰ روزه، تقاطع نزولی، ریزش ناگهانی)
   // ۲۹ روز صاف روی ۱۰۱، روز آخر آرام پایین، ۳ ساعت آخر تند (−۶٪)
   let v=101;
   for(let i=0;i<30*24;i++){const j=i-29*24, o=v;if(j>=0)v-=j<21?0.15:2.1;
     C.push({t:t0+i*H,o,h:Math.max(o,v)+0.05,l:Math.min(o,v)-0.05,c:v});}
   const ev=mkEventsOf(C);
   const up=mkEventsOf(C.map(k=>({t:k.t,o:200-k.o,h:200-k.l,l:200-k.h,c:200-k.c})));
   return {ev:ev.map(x=>x.k+':'+(x.bear?'b':'u')+':'+x.t),up:up.map(x=>x.k+':'+(x.bear?'b':'u'))};});
 console.log('   ',JSON.stringify(e));
 ok(e.ev.some(x=>/^low:b:شکست کف 30 روزه/.test(x))&&!e.ev.some(x=>/کف 7/.test(x)),'شکست کف ۳۰ روزه (۷ روزه تکرار نمی‌شود)');
 ok(e.ev.some(x=>/^ma:b/.test(x)),'تقاطع نزولی MA20/50 (۴ ساعته)');
 ok(e.ev.some(x=>/^move:b/.test(x)),'ریزش ناگهانی در ۳ ساعت');
 ok(e.up.includes('high:u')&&e.up.includes('ma:u')&&e.up.includes('move:u'),'آینه‌ی صعودی: شکست سقف، تقاطع صعودی، رشد ناگهانی');
 const card=await p.evaluate(async()=>{MKEV.set('MKA',{at:Date.now(),ev:[{k:'low',d:7,bear:true,t:'شکست کف 7 روزه'},{k:'ma',bear:false,t:'تقاطع صعودی MA20/50 (۴ ساعته)'}]});
   renderAll();const c=document.querySelector('#list .card[data-id="ccoineres/97100"]');
   const G=document.getElementById('glance');
   return {flag:(c&&c.querySelector('.mkevf')||{}).textContent||'',gl:(G.querySelector('.mkev')||{}).textContent||''};});
 console.log('   ',JSON.stringify(card));
 ok(/خلاف لانگ: شکست کف 7 روزه/.test(card.flag)&&/هم‌جهت: تقاطع صعودی/.test(card.flag),'روی کارت: «خلاف لانگ» و «هم‌جهت»');
 ok(/⚠ شکست کف 7 روزه/.test(card.gl),'در «الان چه کنم؟» کنار همان سیگنال');

 console.log('=== ۳: کانال‌سنج به تفکیک حال بازار ===');
 const r=await p.evaluate(()=>{const H=36e5,now=Math.floor(Date.now()/H)*H,R=audRules();
   // بیت‌کوین: ۱۰ روز اول نزولی (−۵٪ در روز)، بعد صعودی
   const c=[];let v=100;for(let i=20*24;i>=0;i--){const t=now-i*H;v*=i>10*24?0.998:1.002;c.push([t,v]);}
   BTCH={c,at:Date.now()};
   for(let i=0;i<12;i++)SYMBOLS.add('RG'+i);SYMVER++;
   for(let i=0;i<12;i++){const t0=now-(i<6?15:3)*24*H-i*H;
     const P={id:'ccoineres/9720'+i,num:97200+i,text:'#RG'+i+' لانگ\nورود 100\nحد ضرر 90\nتارگت 110',date:new Date(t0)};POSTS.push(P);
     const inp=audInput(P);AUD[P.id]={k:audKey(inp,R),st:(i<6?i<1:i<10)?'win':'loss',fin:true,at:Date.now(),tAct:t0,tTp:[t0+H],late:false};}
   KGEN++;AUDQ.at=Date.now();
   const rows=audRows(), h=regimeTableHtml(rows), bear=regimeStat('bear','long'), bull=regimeStat('bull','long');
   return {h,bear,bull};});
 console.log('   ',JSON.stringify({bear:r.bear,bull:r.bull}));
 ok(r.bear&&r.bear.n===6&&r.bear.w===1&&r.bull&&r.bull.n===6&&r.bull.w===4,'لانگ در روزهای نزولی ۱ از ۶، صعودی ۴ از ۶');
 ok(/به تفکیک حال بازار/.test(r.h)&&/لانگ · بازار نزولی/.test(r.h)&&/بدتر بوده‌اند/.test(r.h),'جدول و هشدار «لانگ‌ها در روزهای نزولی بدتر»');
 const g2=await p.evaluate(()=>{paintGlance();return (document.querySelector('#glance .mkt')||{}).textContent||'';});
 ok(/سابقه‌ی کانال: لانگ‌ها در روزهای نزولیِ بیت‌کوین 1 از 6 برد/.test(g2),'در «الان چه کنم؟»: سابقه‌ی کانال در همین حال بازار');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
