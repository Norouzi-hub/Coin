/* پنجره‌ی پرسش خودمان (به‌جای confirm/prompt مرورگر): ظاهر، انصراف/تأیید، Esc، پرسش متنی، بالای ورق */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});await route(ctx);
 const p=await ctx.newPage();const errs=[],native=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{native.push(d.message());d.dismiss();});
 await p.addInitScript(seed);await p.addInitScript(()=>{window.__dlgUI=true;});
 await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const W=ms=>p.waitForTimeout(ms||300);

 console.log('=== تأیید ===');
 let pr=p.evaluate(()=>askConfirm({title:'11 معامله‌ی لانگ باز داری',msg:'سقف 3 است.\nاین‌ها یک شرط‌اند.',ok:'باز هم ثبت کن',cancel:'نه، صبر می‌کنم'}).then(v=>window.__r=v));
 await W();
 const d=await p.evaluate(()=>{const v=document.getElementById('dlgv'),c=v&&v.querySelector('.dlg');const r=c&&c.getBoundingClientRect();
   return {vis:!!v&&!v.classList.contains('hide'),cls:c&&c.className,title:(v.querySelector('#dlgT')||{}).textContent,msg:(v.querySelector('.dlgm')||{}).innerHTML,
     ok:(v.querySelector('.dlgok')||{}).textContent,no:(v.querySelector('.dlgno')||{}).textContent,focus:document.activeElement&&document.activeElement.className,
     w:r&&Math.round(r.width),z:+getComputedStyle(v).zIndex};});
 console.log('   ',JSON.stringify(d));
 ok(d.vis&&/dlg warn/.test(d.cls)&&d.title==='11 معامله‌ی لانگ باز داری'&&/<br>/.test(d.msg)&&d.ok==='باز هم ثبت کن'&&d.no==='نه، صبر می‌کنم','پنجره‌ی خودمان: عنوان، پیام چندخطی و دو دکمه‌ی فارسی');
 ok(/dlgno/.test(d.focus||'')&&d.w>=340&&d.w<=400&&d.z>100,'فوکوس روی کار بی‌خطر (انصراف)؛ اندازه‌ی گوشی؛ بالای ورق‌ها');
 await p.screenshot({path:(process.env.TEST_OUT||'/tmp/signaldesk-tests')+'/logs/dlg.png'});
 await p.click('#dlgv .dlgno');await pr;await W(250);
 ok(await p.evaluate(()=>window.__r===false&&document.getElementById('dlgv').classList.contains('hide')),'«نه» ← false و پنجره بسته شد');
 pr=p.evaluate(()=>askConfirm({title:'بستن همه',tone:'info'}).then(v=>window.__r=v));await W();
 await p.click('#dlgv .dlgok');await pr;
 ok(await p.evaluate(()=>window.__r===true),'«بله» ← true');
 pr=p.evaluate(()=>askConfirm({title:'x',tone:'danger'}).then(v=>window.__r=v));await W();
 const dz=await p.evaluate(()=>document.querySelector('#dlgv .dlg').className);
 await p.keyboard.press('Escape');await pr;
 ok(/danger/.test(dz)&&await p.evaluate(()=>window.__r===false),'Esc ← انصراف (نوع «خطر» با رنگ قرمز)');
 pr=p.evaluate(()=>askConfirm({title:'x'}).then(v=>window.__r=v));await W();
 await p.mouse.click(10,10);await pr;
 ok(await p.evaluate(()=>window.__r===false),'زدن بیرون پنجره ← انصراف');

 console.log('=== پرسش متنی ===');
 pr=p.evaluate(()=>askText({title:'ستاپ تازه',placeholder:'نام ستاپ',ok:'افزودن',tone:'info'}).then(v=>window.__r=v));await W();
 const fi=await p.evaluate(()=>document.activeElement&&document.activeElement.id);
 await p.keyboard.type('شکست سقف');await p.keyboard.press('Enter');await pr;
 ok(fi==='dlgIn'&&await p.evaluate(()=>window.__r==='شکست سقف'),'کادر متن فوکوس دارد؛ Enter ← همان متن');

 console.log('=== از خود برنامه ===');
 const r=await p.evaluate(async()=>{const now=Date.now(),pl=(E,d)=>({dir:d,E,SL:E*0.98,TP:E*1.03,sd:0.02,rr:1.5});
   RB.items=[1,2,3].map(i=>({id:'o'+i,k:'test',tk:'X'+i,dir:'long',st:'open',t:now,E:1,SL:0.98,sd:0.02}));
   const x={tk:'AAA',dir:'long',sc:90,pl:pl(10,'long'),parts:{}};setTimeout(()=>document.querySelector('#dlgv .dlgno').click(),300);
   const a=await rbAddAsk(x);setTimeout(()=>document.querySelector('#dlgv .dlgok').click(),300);const b2=await rbAddAsk(x);
   return {a:a===null,b:!!b2,n:RB.items.length};});
 ok(r.a&&r.b&&r.n===4,'«تست» با سقف پر: «نه» ثبت نمی‌کند، «باز هم ثبت کن» ثبت می‌کند');
 // بالای ورق باز
 await p.evaluate(()=>{openSheet('<h3>ورق</h3><p>x</p>');});await W();
 pr=p.evaluate(()=>askConfirm({title:'روی ورق'}).then(v=>window.__r=v));await W();
 const top=await p.evaluate(()=>{const e=document.elementFromPoint(195,422);return !!(e&&e.closest('#dlgv'));});
 await p.click('#dlgv .dlgok');await pr;await p.evaluate(()=>closeSheet());
 ok(top,'روی ورقِ باز هم پنجره بالاتر است');
 ok(native.length===0,'هیچ پنجره‌ی بومی مرورگر باز نشد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
