/* خواندن منعطفِ استاپ و ورود، جدول «خروج کوتاه»، فیلتر فاصله‌ی استاپ، اهرم امن ایزوله، و کپی سیگنال‌های ناقص */
const {pw,out}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);

 console.log('=== خواندن استاپ و ورود ===');
 const ps=await p.evaluate(()=>[
   '#BTC لانگ\nورود 64000\nحد ضرر: کلوز ۴ ساعته زیر 62500\nتارگت 66000',
   '#ETH شورت ورود 3100 استاپ 3 درصد تارگت 2900',
   '#SOL لانگ\nخرید در محدوده 150\nحد ضرر:\n140\nتارگت 170',
   '#XRP لانگ ورود ۲ پله‌ای 2.1 و 2.0 حد ضرر 1.9 تارگت 2.4',
   '#BTC لانگ ورود 64800 حد ضرر 63500 تارگت 66000',
   '#BTC لانگ ورود 64000 حد ضرر ۵٪ تارگت 67000'].map(t=>{const s=parseSignal(t);return s.entry+'/'+s.stop;}));
 console.log('   ',ps.join(' | '));
 ok(ps[0]==='64000/62500','«حد ضرر: کلوز ۴ ساعته زیر 62500» ← 62500 (عددِ ساعت رد شد)');
 ok(ps[1]==='3100/3193','«استاپ ۳ درصد» برای شورت ← 3193');
 ok(ps[2]==='150/140','«خرید در محدوده 150» و حد ضرر در خط بعد');
 ok(ps[3]==='2.1/1.9','«ورود ۲ پله‌ای 2.1» ← 2.1 نه 2');
 ok(ps[4]==='64800/63500','الگوی ساده‌ی قبلی سالم است');
 ok(ps[5]==='64000/60800','«حد ضرر ۵٪» لانگ ← 60800');

 console.log('=== جدول خروج کوتاه روی مسیر معلوم ===');
 const xg=await p.evaluate(()=>{S.fee=0;
   // لانگ ۱۰۰، استاپ ۹۰، تارگت ۱ کانال ۱۱۰. فعال در t0؛ قیمت در ۳ ساعت به ۱۰۳ می‌رود، بعد ۹۴، بعد ۱۱۲
   const t0=Date.now()-5*864e5, C=[];let px=100;
   const path=[[0,100],[3,103],[10,94],[40,112],[80,112]];
   for(let i=0;i<=80*12;i++){const t=t0+i*3e5, h=i/12;let v=100;
     for(let j=1;j<path.length;j++)if(h<=path[j][0]){const [h0,v0]=path[j-1],[h1,v1]=path[j];v=v0+(v1-v0)*(h-h0)/(h1-h0);break;}
     C.push({t,o:px,h:Math.max(px,v),l:Math.min(px,v),c:v});px=v;}
   const g=audXGrid({dir:'long',entry:100,stop:90,tps:[110]},C,t0);
   const at=(k,t,h)=>{const i=xgIdx(XK.indexOf(k),XT.indexOf(t),XH.indexOf(h));return [g.R[i],g.h[i]];};
   return {a:at(1,2,8),b:at(1,2,1),c:at(1,'t1',72),d:at(0.5,'t1',72),e:at(0.5,3,24),f:at(1,'t1',24)};});
 console.log('   ',JSON.stringify(xg));
 ok(xg.a[0]===0.2&&xg.a[1]<3,'+۲٪ با استاپ کانال: ۰.۲R، در کمتر از ۳ ساعت');
 ok(Math.abs(xg.b[0]-0.1)<0.02&&xg.b[1]===1,'سقف ۱ ساعت: هر جا بود بسته (قیمت حدود ۱۰۱ ← حدود +۰.۱R)');
 ok(xg.c[0]===1&&xg.c[1]>30,'قاعده‌ی کانال (تارگت ۱، بی‌سقف): +۱R ولی بیش از ۳۰ ساعت درگیر');
 ok(xg.d[0]===-1,'استاپ نصف (۹۵): افت به ۹۴ آن را می‌زند ← −۱R');
 ok(xg.e[0]===0.6,'استاپ نصف + خروج +۳٪: ۳/۵ = ۰.۶R (حجم دو برابر)');
 ok(Math.abs(xg.f[0]-0.24)<0.02&&xg.f[1]===24,'تارگت ۱ با سقف ۲۴ ساعت: هنوز نرسیده، روی حدود ۱۰۲.۴ بسته ← حدود +۰.۲۴R');

 console.log('=== کانال‌سنج: خروج کوتاه، فیلتر، اهرم ایزوله، سیگنال‌های ناقص ===');
 await p.evaluate(()=>{AUDOPEN='خروج کوتاه';go('audit',true);});
 await p.waitForFunction(()=>!AUDQ.on&&AUDQ.at>0,{timeout:90000});await p.waitForTimeout(500);
 await p.evaluate(()=>renderAudit());await p.waitForTimeout(300);
 const ui=await p.evaluate(()=>{const xl=document.querySelector('#audBody [data-acc="خروج کوتاه"]');
   return {xl:!!xl,tab:xl?xl.querySelectorAll('.xtab tbody tr').length:0,txt:xl?xl.textContent:'',
     sd:[...document.querySelectorAll('.audf .catchip')].some(b=>/تا 10٪/.test(b.textContent)),
     iso:[...document.querySelectorAll('#audBody .ar2')].some(x=>/ایزوله تا \d+x/.test(x.textContent)),
     cp:[...document.querySelectorAll('#audBody .audiag button')].some(x=>/کپی متن/.test(x.textContent)),
     xg:Object.values(AUD).filter(a=>a.xg).length};});
 console.log('   ',JSON.stringify(Object.assign({},ui,{txt:ui.txt.slice(0,120)})));
 ok(ui.xl&&ui.tab===5,'پنل «خروج کوتاه» با جدول ۵ نوع خروج');
 ok(ui.xg>=1&&/اهرم امن در ایزوله/.test(ui.txt),'جدولِ سیگنال‌ها ساخته شد و اهرم امن ایزوله برای استاپ کانال/۷۵٪/۵۰٪');
 ok(ui.sd,'فیلتر «فاصله‌ی استاپ» (تا ۵/۱۰/۱۵/۲۵٪)');
 ok(ui.iso,'در فهرست سیگنال‌ها: فاصله‌ی استاپ و «ایزوله تا Nx»');
 ok(ui.cp,'دکمه‌ی «کپی متن سیگنال‌های ناقص» در وضعیت سنجش');
 await p.evaluate(()=>document.querySelector('#audBody [data-acc="خروج کوتاه"] [data-h="5"]').click());await p.waitForTimeout(100);
 ok(await p.evaluate(()=>XSEL.h===5&&document.querySelector('#audBody [data-acc="خروج کوتاه"] [data-h="5"]').classList.contains('on')),'انتخاب سقف زمان');
 const xe=await p.$('#audBody [data-acc="خروج کوتاه"]');if(xe)await xe.screenshot({path:out('xlab.png')});
 await p.evaluate(()=>{AF.maxSd=1;afSave();renderAudit();});await p.waitForTimeout(200);
 ok(await p.evaluate(()=>audFilter(audRows()).every(x=>stopPctOf(x.inp)<=1)),'فیلتر فاصله‌ی استاپ فقط سیگنال‌های با استاپ نزدیک را نگه می‌دارد');
 await p.evaluate(()=>{AF.maxSd=0;afSave();});
 console.log('=== کارت سیگنال ===');
 await p.evaluate(()=>go('signals',true));await p.waitForTimeout(600);
 await p.evaluate(()=>{const c=document.querySelector('#list .card');c&&c.click();});await p.waitForTimeout(500);
 ok(await p.evaluate(()=>[...document.querySelectorAll('.briefkv .bk b')].some(b=>b.textContent==='اهرم امن ایزوله')),'روی کارت سیگنال: «اهرم امن ایزوله»');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
