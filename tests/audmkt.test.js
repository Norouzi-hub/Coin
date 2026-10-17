/* کانال‌سنج: «فعال نشد» با دلیل و قیمت لحظه‌ی انتشار روی ردیف؛ دکمه‌ی «ورود همان لحظه» (با قیمت انتشار، فوراً سنجیده)؛
   «اصلاح عددها» روی ردیف برگه‌ی کانال‌سنج را با عددهای فعلی باز می‌کند (نه قیمت امروز)؛ ورود خالی = ورود همان لحظه؛
   پست «ورود مجازه» راهنمای «ورود را خالی بگذار» دارد */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},M5=3e5,$q=s=>document.querySelector(s);
   const ac=audCandles,ar=audRun;audRun=()=>{};
   const post=POSTS.find(x=>{const i=audInput(x);return i&&i.entry&&i.stop&&i.tps.length&&!i.old&&!i.mktE&&i.trig==null;});
   const I0=audInput(post),sg=I0.dir==='long'?1:-1,E=I0.entry,T=I0.tps[0],px0=E*(1+sg*0.015),t0=Math.ceil(I0.t0/M5)*M5;
   // قیمت انتشار 1.5٪ جلوتر از ورود، بعد مستقیم تا تارگت اول (بی برگشت به ورود) ← «فعال نشد»
   audCandles=async()=>{const out=[];for(let i=0;i<60;i++){const c=px0+(T-px0)*Math.min(1,i/50)*1.02;
     out.push({t:t0+i*M5,o:i?c:px0,h:sg>0?Math.max(c,px0)*1.001:Math.max(c,px0),l:sg>0?Math.min(c,px0):Math.min(c,px0)*0.999,c});}return out;};
   const keepOv=OVERRIDE[post.id]?Object.assign({},OVERRIDE[post.id]):null;
   await audMeasureOne(post);
   go('audit',true);audList='none';AUDOPEN='فهرست سیگنال‌ها';renderAudit();await W(100);
   const row=()=>[...document.querySelectorAll('#vAudit .arow2')].find(x=>[...x.querySelectorAll('.ar4 button')].some(b=>b.textContent==='ورود همان لحظه'));
   const rw=row();o.diag=rw?rw.querySelector('.arnow').textContent:'';
   const mn=rw&&[...rw.querySelectorAll('.ar4 button')].find(b=>b.textContent==='ورود همان لحظه');o.btn=!!mn;
   // همه‌ی دکمه‌های ردیف داخل صفحه (قبلاً «سیگنال نیست» از لبه بیرون می‌زد)
   o.fit=rw?[...rw.querySelectorAll('.ar4 button')].every(b=>{const q=b.getBoundingClientRect();return q.left>=0&&q.right<=innerWidth;})&&document.documentElement.scrollWidth<=innerWidth:false;
   mn&&mn.click();await W(300);
   const x=audRows().find(x=>x.p.id===post.id);o.after={mk:!!(OVERRIDE[post.id]&&OVERRIDE[post.id].mktNow),mktE:x.inp.mktE,st:x.r&&x.r.st,e:x.inp.entry,px0};
   // «اصلاح عددها» روی ردیف: برگه‌ی کانال‌سنج با عددهای فعلی
   if(keepOv)OVERRIDE[post.id]=Object.assign({},keepOv,{stop:I0.stop});else OVERRIDE[post.id]={sig:true,stop:I0.stop};
   DB.overrides=OVERRIDE;PCACHE.delete(post.id);
   audList='all';renderAudit();await W(100);
   const rr=[...document.querySelectorAll('#vAudit .arow2')].find(x=>[...x.querySelectorAll('.ar4 button')].some(b=>b.textContent==='اصلاح عددها')&&x.querySelector('.tick').textContent===I0.tk);
   [...rr.querySelectorAll('.ar4 button')].find(b=>b.textContent==='اصلاح عددها').click();await W(200);
   o.sheet={h:($q('#sheet h3')||{}).textContent||'',st:($q('#f_st')||{}).value,en:($q('#f_en')||{}).value};
   $q('#f_en').value='';$q('#ok').click();await W(150);
   o.blank={mk:!!OVERRIDE[post.id].mktNow,en:OVERRIDE[post.id].entry,mktE:audInput(post).mktE};
   closeSheet();await W(400);
   // پست «ورود مجازه»
   const pz={id:'ccoineres/994',num:994,text:'#XRP\nورود مجازه با ریسک یک درصد\nاستاپ 0.5',date:new Date(Date.now()-3*36e5),link:'https://t.me/ccoineres/994'};
   POSTS.unshift(pz);KGEN++;sheetAudFix([{id:pz.id,why:'edit',rows:new Set([pz.id])}],0);await W(200);
   o.hint=[...document.querySelectorAll('#sheet .hint.w')].map(x=>x.textContent).join('|');
   closeSheet();POSTS.shift();KGEN++;
   if(keepOv)OVERRIDE[post.id]=keepOv;else delete OVERRIDE[post.id];DB.overrides=OVERRIDE;save();delete AUD[post.id];
   audCandles=ac;audRun=ar;
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,1400));
 ok(/مستقیم به تارگت/.test(r.diag)&&/قیمت لحظه‌ی انتشار/.test(r.diag)&&/1\.5٪/.test(r.diag)&&/منتظر برگشت به ورود/.test(r.diag),'ردیف «فعال نشد»: دلیل، قیمت انتشار و فاصله با ورود: '+r.diag);
 ok(r.btn&&r.after.mk&&r.after.mktE&&r.after.st==='win'&&Math.abs(r.after.e/r.after.px0-1)<1e-9,'«ورود همان لحظه»: با قیمت انتشار وارد و فوراً سنجیده شد (برد) '+JSON.stringify(r.after));
 ok(r.sheet.h==='اصلاح عددها'&&r.sheet.st!==''&&+r.sheet.st>0,'«اصلاح عددها» روی ردیف: برگه‌ی کانال‌سنج با استاپ فعلی '+JSON.stringify(r.sheet));
 ok(r.blank.mk&&r.blank.en==null&&r.blank.mktE,'ورود خالی در برگه = ورود همان لحظه '+JSON.stringify(r.blank));
 ok(r.fit,'دکمه‌های ردیف (پنج‌تا) همه داخل صفحه‌اند و صفحه از پهلو اسکرول نمی‌خورد');
 ok(/ورود را خالی بگذار/.test(r.hint),'پست «ورود مجازه»: راهنمای ورود خالی');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
