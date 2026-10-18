/* کانال‌سنج: استاپ بیش از 75٪ دور یا تارگت اولِ بیش از سه برابر ورود «نیاز به بررسی» می‌شود (حتی نتیجه‌ی قبلی، بی سنجش دوباره)،
   در صف «مرور یکی‌یکی» می‌آید، و برگه‌ی اصلاح چنین عددی را ثبت نمی‌کند و عدد نزدیک پیشنهاد می‌دهد؛
   یادداشت فهرست می‌گوید چرا شمارش‌ها با کارنامه فرق دارد */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},$q=s=>document.querySelector(s);
   const am=audMeasureOne,ar=audRun,ac=audCandles;audMeasureOne=async()=>{};audRun=()=>{};
   const post=POSTS.find(x=>{const i=audInput(x);return i&&i.entry&&i.stop&&i.tps.length&&!i.old&&!i.mktE&&i.dir==='long';});
   const I=audInput(post),R=audRules(),keepOv=OVERRIDE[post.id]?Object.assign({},OVERRIDE[post.id]):null,keepA=AUD[post.id];
   o.unit=[audWild({entry:100,stop:20,tps:[120],dir:'long'}),audWild({entry:0.088,stop:0.066,tps:[1.09],dir:'long'}),
     audWild({entry:1,stop:1.2,tps:[0.2],dir:'short'}),audWild({entry:0.0922,stop:0.06,tps:[0.15],dir:'long'}),audWild({entry:82294,stop:75,tps:[205623],tpAssumed:true,dir:'long'})];
   // نتیجه‌ی قبلی «در جریان» با تارگت ناممکن ← «نیاز به بررسی» بی سنجش دوباره
   OVERRIDE[post.id]=Object.assign({},keepOv,{sig:true,tps:[I.entry*12]});DB.overrides=OVERRIDE;PCACHE.delete(post.id);
   const I2=audInput(post);AUD[post.id]={k:audKey(I2,R),st:'open',fin:false,at:Date.now(),tAct:Date.now()-864e5,tTp:[],close:{t:Date.now(),px:I2.entry}};
   const x=audRows().find(z=>z.p.id===post.id);o.row=x.r.st+'|'+x.r.why;o.q=audFixQ().some(q=>q.id===post.id&&q.why==='wild-tp');
   go('audit',true);audList='all';AUDOPEN='فهرست سیگنال‌ها';renderAudit();await W(100);
   o.note=[...document.querySelectorAll('#vAudit .panel .hint')].map(h=>h.textContent).find(t=>/همه‌ی سیگنال‌هاست/.test(t))||'';
   // برگه‌ی اصلاح: تارگت 12 برابر ثبت نمی‌شود و یک‌دهم پیشنهاد می‌شود
   audCandles=async()=>[{t:Date.now(),o:I.entry,h:I.entry,l:I.entry,c:I.entry}];
   sheetAudFix([{id:post.id,why:'edit',rows:new Set([post.id])}],0);await W(250);
   $q('#f_en').value=String(I.entry);$q('#f_st').value=String(I.stop);$q('#f_t1').value=String(+(I.entry*12).toPrecision(6));$q('#ok').click();await W(150);
   o.block=$q('#veil').classList.contains('open')&&/برابر ورود/.test($q('#ifPx').textContent);
   const sb=$q('#ifPx button');o.sug=sb?sb.textContent:'';sb&&sb.click();o.t1=+$q('#f_t1').value;
   // استاپ 99٪ دور
   $q('#f_st').value=String(+(I.stop/10).toPrecision(6));$q('#ok').click();await W(150);
   o.blockSl=/فاصله دارد/.test($q('#ifPx').textContent)&&($q('#ifPx button')||{}).textContent===('بگذار '+fmtPrice(I.stop));
   closeSheet();audMeasureOne=am;audRun=ar;audCandles=ac;
   if(keepOv)OVERRIDE[post.id]=keepOv;else delete OVERRIDE[post.id];DB.overrides=OVERRIDE;PCACHE.delete(post.id);if(keepA)AUD[post.id]=keepA;else delete AUD[post.id];
   o.E=I.entry;return o;});
 console.log('   ',JSON.stringify(r));
 ok(JSON.stringify(r.unit)===JSON.stringify(['wild-sl','wild-tp','wild-tp',null,'wild-sl']),'قاعده: استاپ 80٪، تارگت 12×، شورت با تارگت یک‌پنجم ← ناممکن؛ HBAR درست ← سالم؛ BTC با استاپ 75 ← ناممکن '+JSON.stringify(r.unit));
 ok(r.row==='bad|wild-tp'&&r.q,'نتیجه‌ی قبلی با تارگت ناممکن: «نیاز به بررسی» و در صف «مرور یکی‌یکی»');
 ok(/یادآوری|دیرهنگام/.test(r.note)||r.note==='','یادداشت فرق شمارش فهرست و کارنامه (اگر یادآوری یا دیرهنگام هست) '+r.note.slice(0,80));
 ok(r.block&&Math.abs(r.t1/r.E-1.2)<1e-6,'برگه: تارگت 12 برابر ثبت نشد و «بگذار» یک‌دهمش را گذاشت ('+r.sug+')');
 ok(r.blockSl,'برگه: استاپ 99٪ دور ثبت نشد و عدد نزدیک پیشنهاد شد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
