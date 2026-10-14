/* تب «نقشه»: شروع، تنظیمات پیشنهادی با یک زدن، قوانین زنده (✓/✗)، تیک کارها، هفته‌ی جاری،
   تصمیم کانال که هفته‌ی 3 را عوض می‌کند، جدول معیار قبولی، نشان روی «بازار» و پرسش برای تست چهارم روز */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[],dlg=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dlg.push(d.message());d.dismiss();});
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},$q=s=>document.querySelector(s),D=864e5;
   let learn=0;rdScan=m=>{if(m==='learn')learn++;};      // یادگیری واقعی لازم نیست
   S.plan=null;S.rdHz='w';S.maxLev=20;RBEX='trl';
   o.tabs=[...document.querySelectorAll('#tabs .tab:not(.hide)')].map(t=>t.dataset.v).join();
   go('radar',true);await W(50);o.banNo=!$q('#rdView .plban');
   $q('.tab[data-v="plan"]').click();await W(100);
   o.vis=!$q('#vPlan').classList.contains('hide');o.intro=!!$q('#planBody [data-plstart]');
   $q('#planBody [data-plstart]').click();await W(50);
   o.started=plOn()&&plWeek()===1&&!!(DB.settings.plan&&DB.settings.plan.start);
   const rule=t=>[...document.querySelectorAll('#planBody .plrule')].find(x=>x.textContent.includes(t));
   o.levNo=rule('اهرم').classList.contains('no');
   o.w1Open=!!$q('#planBody details.plweek.cur[open]')&&$q('#planBody details.plweek.cur summary').textContent.includes('1');
   o.setTask=$q('#planBody [data-pl="w1set"]').classList.contains('ok');
   o.badge0=+$q('#cPlan').textContent;
   $q('#planBody [data-plbtn="w1set"]').click();await W(80);
   o.applied=S.rdHz==='l'&&RBEX==='q05'&&S.maxLev===10&&localStorage.getItem('signaldesk.rdex')==='q05'&&learn===1;
   o.levOk=rule('اهرم').classList.contains('ok')&&rule('تنظیمات مدل').classList.contains('ok');
   o.setTask2=$q('#planBody [data-pl="w1set"]').classList.contains('ok');
   // تیک دستی
   $q('#planBody [data-pltog="w1send"]').click();await W(50);
   o.tog=!!S.plan.done.w1send&&$q('#planBody [data-pl="w1send"]').classList.contains('ok');
   o.badge1=+$q('#cPlan').textContent;
   // تنظیمات عوض شد ← ✗
   S.rdHz='s';renderPlan();o.chNo=rule('تنظیمات مدل').classList.contains('no');S.rdHz='l';
   // 4 تست امروز ← ✗ و پرسش پیش از تست پنجم
   const now=Date.now(),keep=RB.items.slice();
   for(let i=0;i<4;i++)RB.items.push({id:'pl'+i,k:'test',tk:'X'+i,dir:'long',E:1,SL:0.96,sd:0.04,rr:1.5,st:'sl',R:-1,t:now-i*6e4,xt:now,stars:3});
   renderPlan();o.tpdNo=rule('در روز').classList.contains('no')&&rule('در روز').textContent.includes('4');
   o.ask=await rbAddAsk({dir:'long',tk:'Y'});
   RB.items=keep;renderPlan();o.tpdOk=rule('در روز').classList.contains('ok');
   // نشان روی «بازار»
   go('radar',true);await W(50);o.ban=($q('#rdView .plban')||{}).textContent||'';
   $q('#rdView .plban').click();await W(80);o.banGo=view==='plan';
   // هفته‌ی 2 و تصمیم کانال
   S.plan.start=now-8*D;renderPlan();o.wk2=plWeek()===2&&$q('#planBody details.plweek.cur summary').textContent.includes('2');
   o.w3a=plTasks(3).map(t=>t[0]).join();
   $q('#planBody [data-pldec="ch:pass"]').click();await W(50);
   o.dec=S.plan.dec.ch==='pass'&&$q('#planBody [data-pl="w2dec"]').classList.contains('ok');
   o.w3b=plTasks(3).map(t=>t[0]).join();
   // معیار قبولی: سه ستون، و آمار روی داده‌ی ساختگی
   o.crit=document.querySelectorAll('#planBody table.plcrit thead th').length;
   const L=[];for(let i=0;i<120;i++)L.push({t:now-i*6*36e5,R:i%3?0.6:-0.7});
   const s=plStats(L);o.st={n:s.n,days:s.days,avg:+s.avg.toFixed(3),pf:+s.pf.toFixed(2)};o.pass=PL_CRIT.every(([,,f])=>f(s));
   o.fail=PL_CRIT.every(([,,f])=>f(plStats(L.slice(0,40))));
   S.plan.start=now-30*D;renderPlan();o.over=$q('#planBody .plhero b').textContent.includes('داوری')&&plWeek()===4;
   S.plan.start=now;plSave();
   // پیشرفت «کامل کردن سیگنال‌ها»: هر تصویر یک بار، با سیگنال ناقص متنی
   const aR=audRows;let R=[{p:{id:'a'},inp:{stop:null,need:{id:'img1'}},r:null},{p:{id:'b'},inp:{stop:null,need:{id:'img1'}},r:null},
     {p:{id:'c'},inp:{stop:1},r:{st:'bad',why:'no-stop'}},{p:{id:'d'},inp:{stop:1},r:{st:'bad',why:'no-date'}}];
   audRows=()=>R;S.plan.fx=[];
   const fl=()=>{renderPlan();const t=$q('#planBody [data-pl="w1fill"]');return ((t.querySelector('small.win,small:last-of-type')||{}).textContent||'')+'|'+((t.querySelector('.plprog b')||{}).textContent||'');};
   o.f0=fl();R=R.filter(x=>x.p.id!=='a'&&x.p.id!=='b');o.f1=fl();
   R.push({p:{id:'e'},inp:{stop:null,need:{id:'img2'}},r:null});o.f2=fl();
   R=[R[1]];o.f3=fl()+'|'+$q('#planBody [data-pl="w1fill"]').classList.contains('ok');
   o.hero=[...document.querySelectorAll('#planBody .plhero span')].map(x=>x.textContent).join(' / ');
   audRows=aR;S.plan.fx=[];plSave();
   return o;});
 console.log('   ',JSON.stringify(r),dlg.length);
 ok(r.tabs==='radar,positions,signals,plan,more','تب «نقشه» در نوار پایین');
 ok(r.banNo,'پیش از شروع، نشان نقشه روی «بازار» نیست');
 ok(r.vis&&r.intro,'صفحه‌ی نقشه با دکمه‌ی «شروع از امروز»');
 ok(r.started,'شروع: هفته‌ی 1 و ذخیره در تنظیمات');
 ok(r.levNo&&!r.setTask,'اهرم 20 و افق «هفتگی» ← قانون ✗ و کار «تنظیمات» انجام‌نشده');
 ok(r.w1Open,'هفته‌ی جاری باز است');
 ok(r.applied,'«یک‌جا بگذار»: افق بلند، خروج +0.5R، اهرم 10 و یادگیری دوباره');
 ok(r.levOk&&r.setTask2,'بعد از آن قانون‌ها ✓ و کار تیک خورد');
 ok(r.tog&&r.badge1<r.badge0,'تیک دستی ذخیره شد و نشان تب کم شد ('+r.badge0+'→'+r.badge1+')');
 ok(r.chNo,'عوض کردن افق بعد از شروع ← ✗');
 ok(r.tpdNo&&r.ask===null&&dlg.some(m=>/حداکثر/.test(m)),'4 تست امروز ← ✗ و تست بعدی اول می‌پرسد');
 ok(r.tpdOk,'بی آن تست‌ها ← ✓');
 ok(/هفته‌ی 1/.test(r.ban)&&r.banGo,'نشان «نقشه» روی «بازار» و زدنش به نقشه می‌برد');
 ok(r.wk2,'8 روز بعد: هفته‌ی 2');
 ok(!r.w3a.includes('w3real')&&r.w3a.includes('w3none'),'بی تصمیم: هفته‌ی 3 بدون پول واقعی');
 ok(r.dec&&r.w3b.includes('w3real'),'کانال «قبول» ← هفته‌ی 3 معامله‌ی واقعی کوچک');
 ok(r.crit===4,'جدول معیار: کانال، تست‌ها، واقعی');
 ok(r.pass&&!r.fail,'معیار قبولی: 120 معامله در 30 روز قبول، 40 معامله نه '+JSON.stringify(r.st));
 ok(r.over,'بعد از 4 هفته: «داوری»');
 ok(/2 مانده/.test(r.f0)&&/0٪/.test(r.f0),'کامل کردن سیگنال‌ها: 2 مورد مانده (هر تصویر یک بار) · '+r.f0);
 ok(/1 مانده/.test(r.f1)&&/50٪/.test(r.f1),'یکی کامل شد ← 50٪ · '+r.f1);
 ok(/2 مانده/.test(r.f2)&&/33٪/.test(r.f2),'تصویر تازه به کل اضافه شد، نه عقب‌گرد ← 33٪ · '+r.f2);
 ok(/100٪/.test(r.f3)&&/true$/.test(r.f3),'همه کامل ← 100٪ و تیک · '+r.f3);
 ok(/کارهای این هفته: \d+ از \d+ · \d+٪/.test(r.hero),'نوار کارهای این هفته در بالای نقشه');
 // در حافظه‌ی ماندگار (و پشتیبان) نوشته شد
 const keep=await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('signaldesk.v1')||'{}'),pl=d.settings&&d.settings.plan;return !!(pl&&pl.start&&pl.done.w1send&&pl.dec.ch==='pass');});
 ok(keep,'نقشه، تیک‌ها و تصمیم در حافظه‌ی ماندگار نوشته شدند');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
