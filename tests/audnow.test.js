/* کارنامه: تصویر بالا مال همان دوره‌ی انتخابی (امروز / این ماه / کل).
   کانال‌سنج: زمان آخرین سنجش ماندگار؛ دکمه‌ی «سنجیدن تازه‌ها و در جریان‌ها» همیشه پیام می‌دهد و «در جریان»ها را هم می‌سنجد؛
   کندل کمتر از 1000 تا هم سیگنال را برای همیشه «در جریان» نگه نمی‌دارد؛ ردیف «در جریان» قیمت الان و تصویر پست؛
   برگه‌ی اصلاح: ورودی که با قیمت بازار جور نیست ثبت نمی‌شود (با پیشنهاد عدد درست) و بعد از ثبت همان سیگنال فوراً سنجیده می‌شود */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},H=36e5,D=864e5,$q=s=>document.querySelector(s),now=Date.now();
   // ── کارنامه ──
   const mk=(id,ago,ex)=>ensureBase({id,ticker:'XRP',kind:'futures',dir:'long',entry:100,stop:95,stop0:95,margin:50,lev:5,targets:[],
     openedAt:now-ago-H,closedAt:now-ago,exitPrice:ex,fees:0,status:'closed',partials:[],log:[]});
   const keepP=DB.positions;DB.positions=[mk('r1',60e3,104),mk('r2',2*H,97),mk('r3',70*D,110)];
   const nOf=()=>{const s=[...document.querySelectorAll('#repBody .panel')][0];const c=s&&[...s.querySelectorAll('.st')].find(x=>x.querySelector('b').textContent==='معامله');
     return (s.querySelector('.panelhead b')||{}).textContent+'|'+(c?c.querySelector('span').textContent:'-');};
   go('report',true);const per=async k=>{repPeriod=k;renderReport();await W(60);return nOf();};
   // «امروز» ممکن است r2 (دو ساعت پیش) را در روز قبل بیندازد؛ تعدادش را با همان کلید دوره حساب کن
   const nDay=DB.positions.filter(x=>periodKey(x.closedAt,'day')===periodKey(now,'day')).length,
     nMon=DB.positions.filter(x=>periodKey(x.closedAt,'month')===periodKey(now,'month')).length;
   o.rep={day:await per('day'),month:await per('month'),all:await per('all'),nDay,nMon};
   DB.positions=keepP;
   // ── زمان آخرین سنجش و دکمه ──
   localStorage.removeItem('signaldesk.audat');AUDQ.at=0;
   const jobs=audJobs;audJobs=()=>[];
   go('audit',true);AUDOPEN=null;renderAudit();await W(80);
   const hint=()=>[...document.querySelectorAll('#vAudit .audiag .hint')].map(x=>x.textContent).join('|');
   o.h0=/هنوز سنجشی انجام نشده/.test(hint());
   const btn=[...document.querySelectorAll('#vAudit .audiag button')].find(x=>/سنجیدن تازه‌ها و در جریان‌ها/.test(x.textContent));
   o.btn=!!btn;btn.click();await W(150);
   o.toast=$q('#toast').textContent;o.h1=hint();o.saved=+(localStorage.getItem('signaldesk.audat')||0)>0;
   audJobs=jobs;
   // «در جریان»ِ تازه‌سنجیده: دکمه‌ی دستی می‌سنجدش، خودکار نه
   const post=POSTS.find(x=>{const i=audInput(x);return i&&i.entry&&i.stop&&i.tps.length&&!i.old;});
   const inp=audInput(post),R=audRules(),k=audKey(inp,R),sg=inp.dir==='long'?1:-1;
   const keepA=AUD[post.id];
   AUD[post.id]={k,st:'open',fin:false,at:Date.now(),tAct:now-3*D,tTp:[],close:{t:now-5*60e3,px:inp.entry+(inp.tps[0]-inp.entry)*0.4}};
   o.auto=audJobs().some(j=>j.p.id===post.id);o.man=audJobs(false,false,true).some(j=>j.p.id===post.id);
   // ردیف «در جریان»: قیمت الان، روز از ورود، تصویر
   const img0=post.img;post.img='https://cdn4.telesco.pe/file/now1.jpg';
   audList='open';AUDOPEN='فهرست سیگنال‌ها';renderAudit();await W(100);
   const row=[...document.querySelectorAll('#vAudit .arow2')].find(x=>x.querySelector('.arnow')&&x.querySelector('.ar4 button[aria-expanded]'));
   o.now=row?row.querySelector('.arnow').textContent:'';o.sum=($q('#vAudit .audopen')||{}).textContent||'';
   if(row){row.querySelector('.ar4 button[aria-expanded]').click();await W(80);o.img=!!row.querySelector('.arimg .shot');
     row.querySelector('.ar4 button[aria-expanded]').click();await W(50);o.img2=!row.querySelector('.arimg');}
   post.img=img0;
   // ── کندل کمتر از 1000: باز هم با کندل ساعتی تا امروز ادامه می‌دهد ──
   const ac=audCandles,M5=3e5,t0=Math.floor((now-10*D)/M5)*M5;
   audCandles=async(tk,iv,st,l)=>{const out=[];
     if(iv==='5m'){for(let i=0;i<500;i++)out.push({t:t0+i*M5,o:100,h:100.5,l:99.5,c:100});}       // فقط 500 تا (حدود 41 ساعت)
     else{for(let t=st;t<now&&out.length<l;t+=H){const d=(t-st)/H;out.push({t,o:100,h:101,l:d>100?89:99.5,c:100});}}
     return out;};
   const P={id:'x/1'};const I={tk:'XRP',dir:'long',entry:100,stop:90,tps:[120],t0};
   await audOne({p:P,inp:I,k:'k1'},R);o.ext=AUD['x/1'].st+'|'+!!AUD['x/1'].tStop;delete AUD['x/1'];
   // ── برگه‌ی اصلاح: ورود با قیمت بازار جور نیست ──
   audCandles=async()=>[{t:now,o:0.09226,h:0.093,l:0.092,c:0.0923}];
   const pp={id:'ccoineres/995',num:995,text:'#HBAR خرید 0.926 استاپ 0.06',date:new Date(now-2*H),link:'https://t.me/ccoineres/995'};
   POSTS.unshift(pp);KGEN++;
   let measured=0;const am=audMeasureOne;audMeasureOne=async x=>{measured++;};
   sheetAudFix([{id:pp.id,why:'px',rows:new Set([pp.id])}],0);await W(200);
   $q('#f_tk').value='HBAR';$q('#f_tk').dispatchEvent(new Event('change'));await W(100);$q('#f_en').value='0.926';$q('#f_st').value='0.06';$q('#ok').click();await W(150);
   o.block=$q('#veil').classList.contains('open')&&!(OVERRIDE[pp.id]&&OVERRIDE[pp.id].stop)&&/فاصله دارد/.test($q('#ifPx').textContent);
   const sb=$q('#ifPx button');o.sug=sb?sb.textContent:'';sb&&sb.click();o.en=$q('#f_en').value;
   $q('#ok').click();await W(150);
   o.saved2=OVERRIDE[pp.id]&&OVERRIDE[pp.id].entry===0.0926&&measured===1;
   closeSheet();audMeasureOne=am;audCandles=ac;
   if(keepA)AUD[post.id]=keepA;else delete AUD[post.id];
   delete OVERRIDE[pp.id];POSTS.shift();KGEN++;
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,1500));
 ok(/تصویر امروز/.test(r.rep.day)&&r.rep.day.endsWith('|'+r.rep.nDay),'«روزانه»: تصویر امروز ('+r.rep.day+')');
 ok(/تصویر این ماه/.test(r.rep.month)&&r.rep.month.endsWith('|'+r.rep.nMon),'«ماهانه»: تصویر این ماه ('+r.rep.month+')');
 ok(r.rep.all==='تصویر کلی|3','«کل»: همه‌ی معامله‌ها ('+r.rep.all+')');
 ok(r.h0&&r.btn,'بی سنجش ماندگار: «هنوز سنجشی انجام نشده» و دکمه‌ی تازه');
 ok(/چیزی برای سنجیدن نمانده/.test(r.toast)&&/آخرین سنجش/.test(r.h1)&&r.saved,'دکمه بی کار: پیام می‌دهد، وضعیت عوض می‌شود و زمان سنجش ماندگار است');
 ok(!r.auto&&r.man,'«در جریان»ِ تازه‌سنجیده: خودکار نه، دکمه‌ی دستی آری');
 ok(/الان/.test(r.now)&&/\+0\.\d+R/.test(r.now)&&/باز 3 روز/.test(r.now),'ردیف «در جریان»: قیمت الان، R و روز از ورود: '+r.now);
 ok(/در جریان/.test(r.sum)&&/در سود/.test(r.sum),'خلاصه‌ی «در جریان» بالای فهرست');
 ok(r.img&&r.img2,'دکمه‌ی «تصویر» تصویر پست را همان‌جا باز و بسته می‌کند');
 ok(r.ext==='loss|true','فقط 500 کندل 5 دقیقه‌ای: با کندل ساعتی تا امروز ادامه داد و استاپ را دید ('+r.ext+')');
 ok(r.block&&/0\.0926/.test(r.sug)&&r.en==='0.0926','ورود 0.926 با قیمت 0.09226 ثبت نمی‌شود و 0.0926 پیشنهاد می‌شود');
 ok(r.saved2,'با عدد درست ثبت شد و همان سیگنال فوراً سنجیده شد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
