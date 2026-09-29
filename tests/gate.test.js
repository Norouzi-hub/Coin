const {chromium} = require('./lib').pw;
const {route}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const dialogs=[];let accept=false;p.on('dialog',d=>{dialogs.push(d.message());accept?d.accept():d.dismiss();});
 const now=Date.now(),H=36e5;
 await p.addInitScript(([now,H])=>{if(sessionStorage.getItem('x'))return;sessionStorage.setItem('x',1);
   localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[
   {id:'o1',ticker:'SOL',dir:'long',kind:'futures',entry:150,stop:140,margin:20,lev:5,openedAt:now-H,status:'open',partials:[],log:[]},
   {id:'o2',ticker:'XRP',dir:'long',kind:'futures',entry:2,stop:null,margin:5,lev:3,openedAt:now-H,status:'open',partials:[],log:[]}],
   settings:{acct:100,daily:10,openRisk:15,feat:{autoexec:false}}}));},[now,H]);
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(3500);
 const r=await p.evaluate(()=>({r:riskNow(),st:document.querySelector('#status')?.textContent||document.body.innerText.match(/ریسک باز[^\n]*/)?.[0]}));
 // SOL: qty=100/150=.6667 × 10 = 6.667 + fee .1 = 6.767 ; XRP بدون استاپ: 5  → 11.77٪
 ok(Math.abs(r.r.used-11.7667)<0.01,'ریسک باز: SOL 6.77 + XRP بدون استاپ 5 = '+r.r.used.toFixed(2));
 ok(/ریسک باز\s*11\.8٪/.test(r.st),'در نوار خلاصه: «ریسک باز 11.8٪/15٪» — '+r.st);
 // ورود سریع روی BTC (ورود 64800، استاپ 63500) با ریسک 5٪ حساب ← 16.8٪ > 15
 await p.evaluate(()=>{sigFilter='all';renderAll();});await p.waitForTimeout(300);
 const g=await p.evaluate(()=>entryGate(5));
 ok(g.length===1&&g[0].includes('16.8٪'),'ورود با ۵ دلار ریسک: هشدار سقف ریسک — '+g[0]);
 await p.evaluate(()=>{S.openRisk=12;const post=POSTS.find(x=>x.id.endsWith('/920'));quickEnter(post,sigOf(post),OVERRIDE[post.id]||{},PRICES.get('BTC'));});
 await p.waitForTimeout(300);
 ok(dialogs[0]&&dialogs[0].startsWith('⚠️')&&dialogs[0].includes('سقف'),'ورود سریع (سقف ۱۲٪): اول هشدار سقف ریسک — '+(dialogs[0]||'').slice(0,60));
 ok(await p.evaluate(()=>DB.positions.length)===2,'«نه» زدی: ثبت نشد');
 // حد ضرر روزانه پر
 await p.evaluate(()=>{DB.positions.push({id:'c1',ticker:'ETH',dir:'long',kind:'futures',entry:100,stop:90,margin:20,lev:5,openedAt:Date.now()-2*36e5,closedAt:Date.now()-60e3,exitPrice:89,fees:0,status:'closed',partials:[],log:[]});save();});
 const g2=await p.evaluate(()=>entryGate(0.5));
 ok(g2.some(x=>x.includes('حد ضرر روزانه')),'بعد از ۱۱ دلار ضرر امروز (سقف ۱۰): قفل روزانه — '+g2[0]);
 await p.evaluate(()=>{const post=POSTS.find(x=>x.id.endsWith('/920'));sheetEnter(post,sigOf(post),OVERRIDE[post.id]||{},PRICES.get('BTC'));});
 await p.waitForTimeout(600);
 const gb=await p.evaluate(()=>{const b=document.querySelector('#gateBox');return b&&!b.classList.contains('hide')?b.textContent:null;});
 ok(gb&&gb.includes('حد ضرر روزانه'),'فرم ورود: کادر قرمز هشدار دیده می‌شود');
 {const e=await p.$('#gateBox');await e.screenshot({path:require('./lib').out('gate.png')});}
 dialogs.length=0;accept=true;
 await p.evaluate(()=>document.querySelector('#ok').click());await p.waitForTimeout(300);
 ok(dialogs.some(d=>d.includes('باز هم ثبت شود'))&&await p.evaluate(()=>DB.positions.length)===4,'«باز هم ثبت شود» ← با تأیید ثبت شد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
