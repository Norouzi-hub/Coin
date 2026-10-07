/* مشاور: مرکز اعلان، صدا (سه لحن)، ساعت سکوت، اعلان گوشی، و قانون‌های پیشنهاد */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{
   window.__OSC=0;window.__N=[];
   class FakeCtx{constructor(){this.state='running';this.currentTime=0;this.destination={};}
     resume(){} createOscillator(){return {type:'',frequency:{value:0},connect:x=>x,start(){window.__OSC++;},stop(){}};}
     createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:x=>x};}}
   window.AudioContext=FakeCtx;
   window.Notification=class{constructor(t,o){window.__N.push(t+' | '+(o&&o.body||''));}};window.Notification.permission='granted';
 });
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);

 console.log('=== مرکز اعلان و صدا ===');
 const a=await p.evaluate(()=>{
   ADV.items=[];ADV.seen={};ADV.read=0;S.feat.notify=true;S.adv={on:true,sound:true,vol:0.7,vib:true,quiet:'',cats:{sig:true,pos:true,risk:true,rep:true,tip:true}};
   BEEPAT=0;const o0=__OSC;
   const r1=advise('t:1',{cat:'sig',pri:'hi',title:'آزمایش مهم',body:'متن'});
   const r2=advise('t:1',{cat:'sig',pri:'hi',title:'آزمایش مهم'});
   const hiOsc=__OSC-o0;BEEPAT=0;const o1=__OSC;
   advise('t:2',{cat:'tip',pri:'lo',title:'نکته'});const loOsc=__OSC-o1;
   BEEPAT=0;const h=new Date().getHours();S.adv.quiet=h+'-'+((h+2)%24);const o2=__OSC;
   advise('t:3',{cat:'pos',pri:'mid',title:'در سکوت'});const qOsc=__OSC-o2;S.adv.quiet='';
   S.adv.cats.rep=false;const off=advise('t:4',{cat:'rep',pri:'mid',title:'خاموش'});S.adv.cats.rep=true;
   paintBell();
   return {r1,r2,hiOsc,loOsc,qOsc,off,n:ADV.items.length,badge:(document.querySelector('#btnBell .cnt')||{}).textContent,N:__N.slice()};});
 console.log('   ',JSON.stringify(a));
 ok(a.r1&&!a.r2,'یک کلید فقط یک بار پیشنهاد می‌شود');
 ok(a.hiOsc===3&&a.loOsc===1,'صدا: مهم سه نت، نکته یک نت');
 ok(a.qOsc===0,'ساعت سکوت: بی‌صدا (ولی در زنگوله ثبت شد)');
 ok(a.off===false&&a.n===3,'دسته‌ی خاموش (گزارش) ثبت نمی‌شود؛ ۳ پیشنهاد در مرکز');
 ok(a.badge==='3','نشان زنگوله: ۳');
 ok(a.N.some(x=>/آزمایش مهم/.test(x)),'پیشنهاد مهم ← اعلان گوشی');
 await p.click('#btnBell');await p.waitForTimeout(400);
 const sh=await p.evaluate(()=>({items:document.querySelectorAll('#advL .advit').length,badge:!!document.querySelector('#btnBell .cnt')}));
 ok(sh.items===3&&!sh.badge,'زدن زنگوله: فهرست ۳ پیشنهاد و نشان خوانده‌شده پاک شد');
 await p.evaluate(()=>closeSheet());await p.waitForTimeout(300);

 console.log('=== قانون‌ها ===');
 const r=await p.evaluate(()=>{
   ADV.items=[];ADV.seen={};
   Object.assign(S,{riskUsd:2,acct:100,daily:10,beAt:0,lossLock:2});setXRule({k:2,t:3,h:2});
   SYMBOLS.add('ADVA');SYMBOLS.add('ADVB');SYMVER++;
   const now=Date.now();
   POSTS.unshift({id:'ccoineres/97001',num:97001,text:'#ADVA لانگ\nورود 100\nحد ضرر 90\nتارگت 110',date:new Date(now-10*60000),link:'x'},
     {id:'ccoineres/97002',num:97002,text:'#ADVB لانگ\nورود 100\nحد ضرر 60\nتارگت 150',date:new Date(now-12*60000),link:'y'});
   PRICES.set('ADVA',100.1);PRICES.set('ADVB',100);KGEN++;
   DB.positions=[ensureBase({id:'ap1',ticker:'BTC',kind:'futures',dir:'long',entry:100,stop:95,stop0:95,margin:10,lev:30,targets:[],openedAt:now-5*36e5,until:now-1000,status:'open',partials:[],log:[]}),
     ensureBase({id:'ap2',ticker:'ETH',kind:'futures',dir:'long',entry:100,stop:95,stop0:95,margin:10,lev:5,targets:[],openedAt:now-36e5,status:'open',partials:[],log:[]}),
     ensureBase({id:'ac1',ticker:'XRP',kind:'futures',dir:'long',entry:100,stop:95,stop0:95,margin:50,lev:5,targets:[],openedAt:now-3*36e5,closedAt:now-120e3,exitPrice:97,fees:0,status:'closed',partials:[],log:[]}),
     ensureBase({id:'ac2',ticker:'SOL',kind:'futures',dir:'long',entry:100,stop:95,stop0:95,margin:50,lev:5,targets:[],openedAt:now-3*36e5,closedAt:now-60e3,exitPrice:97,fees:0,status:'closed',partials:[],log:[]})];
   PRICES.set('BTC',106);PRICES.set('ETH',100);
   ADVSLOW=0;adviseTick();
   return ADV.items.map(x=>x.key.split(':')[0]+'|'+x.title+'|'+x.body.replace(/\n/g,' / '));});
 console.log('    '+r.join('\n    '));
 const has=(k,re)=>r.some(x=>x.startsWith(k+'|')&&(!re||re.test(x)));
 ok(has('sig',/سیگنال تازه: ADVA لانگ.*ایزوله .*x · مارجین/),'سیگنال تازه‌ی مناسب ایزوله، با اهرم و مارجین و قاعده‌ی من');
 ok(has('sig',/سیگنال بلندمدت: ADVB/),'سیگنال بلندمدت جدا گفته می‌شود');
 ok(has('near',/ADVA به نقطه‌ی ورود رسید/),'قیمت به ورود رسید');
 ok(has('dl',/مهلت پوزیشن تمام شد/),'مهلت پوزیشن گذشت');
 ok(has('liq',/لیکوئید پیش از استاپ/),'لیکوئید پیش از استاپ (اهرم ۳۰)');
 ok(has('be',/یک R در سود است/),'یک R سود ← پیشنهاد ریسک‌فری');
 ok(has('lock',/2 باخت پیاپی/),'دو باخت پیاپی ← استراحت');
 ok(has('daily',/نزدیک حد ضرر روزانه/)||has('dailyx'),'حد ضرر روزانه');
 const again=await p.evaluate(()=>{const n=ADV.items.length;ADVSLOW=0;adviseTick();return ADV.items.length-n;});
 ok(again===0,'سنجش دوباره: تکراری نمی‌سازد');

 console.log('=== تنظیمات ===');
 await p.evaluate(()=>{openPanel('setVeil');document.querySelector('#setVeil details[data-sec="adv"]').open=true;});await p.waitForTimeout(300);
 await p.evaluate(()=>{const s=document.getElementById('aSound');s.checked=false;s.dispatchEvent(new Event('change'));
   const q=document.getElementById('aQuiet');q.value='23-8';q.dispatchEvent(new Event('change'));});
 ok(await p.evaluate(()=>S.adv.sound===false&&S.adv.quiet==='23-8'&&DB.settings.adv.sound===false),'تنظیم صدا و ساعت سکوت ذخیره شد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
