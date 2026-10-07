/* پیشنهادهای ۱ تا ۱۰: قاعده‌ی من، ورود ایزوله با ریسک دلاری، دیر رسیدی، سابقه، بلندمدت،
   تریگرِ بسته شدن کندل، پله‌ی دوم خودکار، کپی برای صرافی */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);

 console.log('=== ۱–۳: قاعده‌ی من و اندازه‌ی ایزوله ===');
 const m=await p.evaluate(()=>{
   Object.assign(S,{riskUsd:2,fee:0.1,slip:0.05,maxLev:10,acct:100});
   setXRule({k:XK.indexOf(0.5),t:XT.indexOf(2),h:XH.indexOf(4)});
   const pl=xRulePlan('long',100,90,[110]), z=isoSize(100,pl.stop), zs=isoSize(100,90);
   return {stop:pl.stop,tp:pl.tp,h:pl.h,lev:z.lev,mg:z.margin,levFar:zs.lev,mgFar:zs.margin,name:xRuleName(pl.r)};});
 console.log('   ',JSON.stringify(m));
 ok(m.stop===95&&m.tp===102&&m.h===4,'قاعده (استاپ ۵۰٪، +۲٪، ۴ ساعت) روی ورود ۱۰۰ و استاپ ۹۰: استاپ ۹۵، هدف ۱۰۲');
 ok(m.lev===10&&Math.abs(m.mg-3.88)<0.01,'ریسک ۲ دلار با استاپ ۵٪: اهرم ۱۰x (سقف)، مارجین ۳٫۸۸ دلار');
 ok(m.levFar===8&&Math.abs(m.mgFar-2.47)<0.02,'استاپ ۱۰٪: اهرم امن ۸x، مارجین حدود ۲٫۴۷ دلار');

 console.log('=== روی کارت ===');
 await p.evaluate(()=>{
   for(const s of ['ISOA','ISOB','ISOC'])SYMBOLS.add(s);SYMVER++;
   const H=36e5,now=Date.now(),mk=(n,text,h,extra)=>Object.assign({id:'ccoineres/'+n,num:n,text,date:new Date(now-h*H),link:'https://t.me/ccoineres/'+n},extra||{});
   POSTS.unshift(mk(99001,'#ISOA لانگ\nورود 100\nحد ضرر 90\nتارگت 110\nپله دوم 95',0.5),
     mk(99002,'#ISOB لانگ\nورود 100\nحد ضرر 70\nتارگت 140',0.6),
     mk(99003,'#ISOC لانگ\nورود 100\nحد ضرر 95\nتارگت 104',0.7));
   PRICES.set('ISOA',100.2);PRICES.set('ISOB',100);PRICES.set('ISOC',103);
   KGEN++;S.feat.accordion=false;bucket='live';sigFilter='new';VIEW.iso=true;go('signals',true);renderAll();});
 await p.waitForTimeout(500);
 const c=await p.evaluate(()=>{const card=id=>document.querySelector('#list .card[data-id="ccoineres/'+id+'"]');
   const A=card(99001),C=card(99003);
   return {a:!!A,rule:A&&A.querySelector('.xrline')?.textContent||'',iso:A&&[...A.querySelectorAll('.btn.iso')].map(x=>x.textContent).join(),
     copy:A&&[...A.querySelectorAll('.btn')].some(x=>/کپی برای صرافی/.test(x.textContent)),
     late:C&&C.querySelector('.isobox .flag')?.textContent||'',hidB:!card(99002),
     chip:[...document.querySelectorAll('#fbar .fc')].map(x=>x.textContent).join('|')};});
 console.log('   ',JSON.stringify(c));
 ok(/قاعده‌ی من/.test(c.rule)&&/95/.test(c.rule)&&/102/.test(c.rule),'خط «قاعده‌ی من» روی کارت: استاپ ۹۵، هدف ۱۰۲');
 ok(/ایزوله 10x · \$3\.88/.test(c.iso),'دکمه‌ی «ایزوله ۱۰x · $3.88»: '+c.iso);
 ok(c.copy,'دکمه‌ی «کپی برای صرافی»');
 ok(/دیر رسیدی/.test(c.late)&&/75٪/.test(c.late),'ISOC: قیمت ۷۵٪ راه را رفته ← «دیر رسیدی»');
 ok(c.hidB&&/فقط مناسب ایزوله/.test(c.chip),'ISOB با استاپ ۳۰٪ در «در انتظار» پنهان است، با چیپ «فقط مناسب ایزوله»');
 await p.evaluate(()=>[...document.querySelectorAll('#fbar .fc')].find(x=>/فقط مناسب ایزوله/.test(x.textContent)).click());await p.waitForTimeout(300);
 const lt=await p.evaluate(()=>{const B=document.querySelector('#list .card[data-id="ccoineres/99002"]');return B?[...B.querySelectorAll('.pill')].map(x=>x.textContent).join(','):null;});
 ok(lt&&/بلندمدت/.test(lt),'با زدن چیپ دیده می‌شود، با برچسب «بلندمدت»');
 await p.evaluate(()=>setView({iso:true}));

 console.log('=== ۱۰: کپی برای صرافی ===');
 const tx=await p.evaluate(()=>{const P=POSTS.find(x=>x.id==='ccoineres/99001');return exchText(P,sigOf(P),OVERRIDE[P.id]||{},PRICES.get('ISOA'));});
 console.log('    '+tx.replace(/\n/g,' | '));
 ok(/^ISOAUSDT لانگ · ایزوله/.test(tx)&&/ورود: 100/.test(tx)&&/حد ضرر: 95/.test(tx)&&/تارگت: 102/.test(tx)&&/اهرم: 10x · مارجین: \$3\.88/.test(tx),'متن کامل: نماد، جهت، ورود، استاپ، هدف، اهرم و مارجین');

 console.log('=== ۲: ورود ایزوله و ۹: پله‌ی دوم ===');
 await p.evaluate(()=>document.querySelector('#list .card[data-id="ccoineres/99001"] .btn.iso').click());await p.waitForTimeout(500);
 const f=await p.evaluate(()=>({s:$('#f_s').value,l:$('#f_l').value,m:$('#f_m').value,n:$('#f_n').value,auto:$('#f_auto').checked}));
 console.log('   ',JSON.stringify(f));
 ok(f.s==='95'&&f.l==='10'&&f.m==='3.88'&&!f.auto&&/ایزوله · ریسک \$2\.00/.test(f.n),'فرم ورود پرشده: استاپ ۹۵، اهرم ۱۰، مارجین ۳٫۸۸، یادداشت');
 await p.click('#sheet #ok');await p.waitForTimeout(500);
 const pos=await p.evaluate(()=>{const x=DB.positions.find(q=>q.sigId==='ccoineres/99001');const w=DB.pending.find(q=>q.postId==='ccoineres/99001');
   return x&&{until:Math.round((x.until-Date.now())/36e5),iso:x.iso,tg:x.targets.join(),t2:w&&[w.kind,w.trigger,w.side].join('/')};});
 console.log('   ',JSON.stringify(pos));
 ok(pos&&pos.iso&&pos.until===4&&pos.tg==='102','پوزیشن ایزوله: هدف ۱۰۲ و سقف ۴ ساعت ثبت شد');
 ok(pos&&pos.t2==='tier2/95/down','پله‌ی دوم (۹۵) خودکار سفارش منتظر شد، رو به پایین');
 const t2hit=await p.evaluate(()=>{PRICES.set('ISOA',94.9);checkPending();const w=DB.pending.find(q=>q.postId==='ccoineres/99001');return !!(w&&w.hit);});
 ok(t2hit,'قیمت به ۹۵ رسید ← پله‌ی دوم «رسید»');

 console.log('=== ۸: تریگرِ بسته شدن کندل ===');
 const tg=await p.evaluate(async()=>{
   const s=parseSignal('#BTC\n\nاگر کندل یکساعته بالای 83500 بست ورود مجازه'), s4=parseSignal('#PENGU\n\nاگر 4 ساعته بالای 0.0116 ببنده ورود مجازه'), s0=parseSignal('#LDO\n\nتریگر ورود 0.41 ست کنید');
   const H=36e5, now=Date.now(), B=Math.floor(now/(4*H))*4*H;
   const w={id:'w1',postId:'x',ticker:'ISOC',dir:'long',trigger:100,side:'up',tf:'4h',postAt:B-6*H,at:B-6*H,hit:null};
   DB.pending.push(w);PRICES.set('ISOC',100.5);
   const keep=audCandles;let close=99.5;
   audCandles=async(tk,iv,st,l)=>[{t:B-H,o:99,h:101,l:98,c:close,v:1}];
   try{checkPending();await new Promise(r=>setTimeout(r,50));const first=!!w.hit, touched=!!w.touch;
     close=100.8;PCLOSE.clear();w.closeChecked=null;checkPending();await new Promise(r=>setTimeout(r,50));
     return {tf:[s.trigTf,s4.trigTf,s0.trigTf||null].join(),touched,first,second:!!w.hit};}
   finally{audCandles=keep;}});
 console.log('   ',JSON.stringify(tg));
 ok(tg.tf==='1h,4h,','«کندل یکساعته … بست» ← 1h، «۴ ساعته … ببنده» ← 4h، «تریگر … ست کنید» ← با لمس');
 ok(tg.touched&&!tg.first,'لمس شد ولی کندل ۴ ساعته زیر تریگر بسته شد ← هنوز منتظر');
 ok(tg.second,'کندل ۴ ساعته بالای تریگر بسته شد ← «رسید»');

 console.log('=== ۵: سابقه در کانال‌سنج ===');
 const h=await p.evaluate(()=>{
   const H=36e5,now=Date.now(),R=audRules();
   for(let i=0;i<4;i++){const P={id:'ccoineres/9880'+i,num:98800+i,text:'#ISOA لانگ\nورود 100\nحد ضرر 90\nتارگت 110',date:new Date(now-(50+i)*H)};
     POSTS.push(P);const inp=audInput(P);AUD[P.id]={k:audKey(inp,R),st:i<3?'win':'loss',fin:true,at:now,tAct:+P.date,tTp:[+P.date+H],late:false};}
   KGEN++;AUDQ.at=Date.now();return histLine(POSTS.find(x=>x.id==='ccoineres/99001'));});
 console.log('    '+h.replace(/<[^>]+>/g,''));
 ok(/ISOA<\/b> 3 از 4 برد/.test(h)&&/سیگنال‌های کامل<\/b> 3 از 4 برد/.test(h),'سابقه: «ISOA ۳ از ۴ برد» و «سیگنال‌های کامل ۳ از ۴ برد»');

 console.log('=== ۱: انتخاب قاعده از جدول خروج کوتاه ===');
 const xs=await p.evaluate(()=>{setXRule(null);const g={v:XG_V,R:new Array(XK.length*XT.length*XH.length).fill(0.1),h:new Array(XK.length*XT.length*XH.length).fill(1)};
   const rows=[0,1,2].map(i=>({p:{id:'z'+i},inp:{entry:100,stop:90,dir:'long',tk:'Z'},r:{st:'win',xg:g}}));
   const n=buildShortLab(rows);document.body.appendChild(n);XSEL.k=1;XSEL.h=3;
   n.querySelectorAll('[data-k]')[1].click();
   const tr=n.querySelector('tr[data-t="2"]');tr.click();
   const r=S.xrule, mine=!!n.querySelector('tr.mine'), line=n.querySelector('.xbest.mine')?.textContent||'';n.remove();return {r,mine,line};});
 console.log('   ',JSON.stringify(xs));
 ok(xs.r&&xs.r.t===2&&xs.r.k===1&&xs.mine&&/قاعده‌ی من/.test(xs.line),'زدن روی ردیف «+۱.۵٪» آن را «قاعده‌ی من» کرد (با استاپ و سقف انتخابی)');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
