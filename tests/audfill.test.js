/* کانال‌سنج «ورود به‌موقع»: در محدوده‌ی تحمل ورود، پر شدن با قیمت بازار همان لحظه (نه عدد کانال)؛
   کلید سنجش پایدار می‌ماند (بی سنجش دوباره‌ی بی‌پایان)، R با قیمت واقعی؛ پیش‌نمایش در «فعال نشد» و دکمه‌های قانون‌ها */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},M5=3e5,D=864e5,$q=s=>document.querySelector(s);
   const keepS=S.aud,ac=audCandles,ar=audRun;let runs=0;audRun=()=>{runs++;};
   // سیگنال واقعی از داده‌ی نمونه؛ قیمت لحظه‌ی انتشار 1.5٪ بالاتر از ورود (لانگ) یا پایین‌تر (شورت)، بعد مستقیم تا تارگت اول
   const post=POSTS.find(x=>{const i=audInput(x);return i&&i.entry&&i.stop&&i.tps.length&&!i.old&&!i.mktE&&i.trig==null;});
   const I0=audInput(post),sg=I0.dir==='long'?1:-1,E=I0.entry,T=I0.tps[0],px0=E*(1+sg*0.015),t0=Math.ceil(I0.t0/M5)*M5;
   audCandles=async(tk,iv,st,l)=>{const out=[];for(let i=0;i<60;i++){const c=px0+(T-px0)*Math.min(1,i/50)*1.02;
     out.push({t:t0+i*M5,o:i?c:px0,h:Math.max(c,px0)*(sg>0?1.001:1),l:Math.min(c,px0)*(sg>0?1:0.999),c});}return out;};
   const run=async()=>{const R=audRules(),j=audJobs(true).find(x=>x.p.id===post.id);await audOne(j,R);
     const row=audRows().find(x=>x.p.id===post.id);return {st:row.r&&row.r.st,R:row.R,e:row.inp.entry,e1:row.inp.e1||null,again:audJobs().some(x=>x.p.id===post.id)};};
   S.aud={tol:1,fill:'sig'};o.def=await run();
   S.aud={tol:3,fill:'sig'};o.sig=await run();
   S.aud={tol:3,fill:'mkt'};o.mkt=await run();
   // دوباره‌سنجی (مثلاً برای مسیر قیمت): همان نتیجه، همان کلید
   {const R=audRules(),j={p:post,inp:audInput(post),k:audKey(audInput(post),R)};await audOne(j,R);const row=audRows().find(x=>x.p.id===post.id);
    o.re={st:row.r&&row.r.st,R:row.R,e1:row.inp.e1||null};}
   o.want={sig:(T-E)/(E-I0.stop)*sg*sg,mkt:(T-px0)/(px0-I0.stop)};
   // پیش‌نمایش در «فعال نشد» و دکمه
   S.aud={tol:1,fill:'sig'};await run();
   go('audit',true);AUDOPEN='کارنامه‌ی کانال';renderAudit();await W(100);
   const nb=$q('#vAudit .audnone');o.note=nb?nb.textContent:'';
   const bt=$q('#vAudit [data-audentry]');o.btn=!!bt;bt&&bt.click();await W(80);
   o.applied=JSON.stringify({t:S.aud.tol,f:S.aud.fill,saved:DB.settings.aud&&DB.settings.aud.fill,runs});
   // برگه‌ی قانون‌ها: انتخاب و دکمه‌های آماده
   sheetAudRules();await W(150);
   o.sheet={sel:($q('#f_fl')||{}).value,pr:!!($q('#pr3')&&$q('#pr2')&&$q('#pr0'))};
   $q('#pr2').click();await W(80);o.pr2=S.aud.tol+'|'+S.aud.fill;
   audCandles=ac;audRun=ar;S.aud=keepS;DB.settings=Object.assign({},S);save();delete AUD[post.id];
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,1500));
 ok(r.def.st==='none'&&!r.def.again,'تحمل 1٪: قیمت 1.5٪ جلوتر بود و برنگشت ← «فعال نشد»');
 ok(r.sig.st==='win'&&Math.abs(r.sig.R-r.want.sig)<0.01&&!r.sig.e1,'تحمل 3٪ با عدد کانال: برد با R عدد کانال ('+r.sig.R.toFixed(2)+')');
 ok(r.mkt.st==='win'&&Math.abs(r.mkt.R-r.want.mkt)<0.01&&r.mkt.e1&&Math.abs(r.mkt.e/r.mkt.e1-1-0.015*(r.mkt.e>r.mkt.e1?1:-1))<1e-6,'تحمل 3٪ با قیمت بازار: ورود = قیمت انتشار، R واقعی ('+r.mkt.R.toFixed(2)+')، عدد کانال کنارش');
 ok(r.re.st==='win'&&Math.abs(r.re.R-r.want.mkt)<0.01&&r.re.e1,'دوباره‌سنجیِ سیگنال پرشده با قیمت بازار: همان نتیجه '+JSON.stringify(r.re));
 ok(!r.mkt.again&&!r.sig.again,'بعد از سنجش، کلید پایدار است و دوباره در صف نمی‌آید');
 ok(/تا 3٪ با ورود فاصله داشت/.test(r.note)&&r.btn,'«فعال نشد»: پیش‌نمایش و دکمه‌ی «ورود به‌موقع» '+r.note.slice(0,200));
 ok(/"t":3,"f":"mkt","saved":"mkt","runs":1/.test(r.applied),'دکمه: تحمل 3٪ با قیمت بازار، ذخیره و سنجش دوباره '+r.applied);
 ok(r.sheet.sel==='mkt'&&r.sheet.pr&&r.pr2==='2|sig','برگه‌ی قانون‌ها: انتخاب «ورود با» و دکمه‌های آماده');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
