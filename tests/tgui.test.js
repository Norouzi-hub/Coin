const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));let linked=false;const calls=[];
 await p.route('**',r=>{const u=r.request().url();const H={'content-type':'application/json','access-control-allow-origin':'*'};
  if(u.includes('localhost:8899'))return r.continue();
  const m=u.match(/sync\.test\/tg\/(\w+)/);
  if(m){calls.push(m[1]+':'+r.request().headers()['authorization']);
    if(m[1]==='status')return r.fulfill({status:200,headers:H,body:JSON.stringify({linked,name:linked?'Ali':null})});
    if(m[1]==='link'){linked=true;return r.fulfill({status:200,headers:H,body:JSON.stringify({linked:true,name:'Ali'})});}
    if(m[1]==='test')return r.fulfill({status:200,headers:H,body:JSON.stringify({ok:true})});
    if(m[1]==='unlink'){linked=false;return r.fulfill({status:200,headers:H,body:JSON.stringify({linked:false})});}}
  if(u.includes('sync.test/db'))return r.fulfill({status:200,headers:H,body:JSON.stringify({rev:0,at:0,data:null})});
  return r.abort();});
 await p.addInitScript(()=>{localStorage.setItem('signaldesk.sync.v1',JSON.stringify({url:'https://sync.test',token:'tok',rev:0,at:0}));});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);
 await p.evaluate(()=>{document.querySelector('#setVeil').classList.remove('hide');const d=document.querySelector('#tgBox').closest('details');d.open=true;});
 await p.waitForTimeout(600);
 ok(await p.evaluate(()=>document.querySelector('#tgState').textContent)==='وصل نیست','باز کردن بخش: وضعیت از ورکر خوانده شد — وصل نیست');
 await p.evaluate(()=>document.querySelector('#btnTgLink').click());await p.waitForTimeout(400);
 ok(await p.evaluate(()=>document.querySelector('#tgState').textContent)==='وصل · Ali','بعد از وصل کردن: «وصل · Ali»');
 await p.evaluate(()=>document.querySelector('#btnTgTest').click());await p.waitForTimeout(300);
 ok((await p.evaluate(()=>document.querySelector('#toast').textContent)).includes('پیام آزمایشی رفت'),'پیام آزمایشی');
 ok(calls.every(c=>c.endsWith('Bearer tok')),'همه‌ی درخواست‌ها با رمز همگام‌سازی');
 await p.evaluate(()=>document.querySelector('#btnTgOff').click());await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.querySelector('#tgState').textContent)==='وصل نیست','قطع');
 const e=await p.$('#tgBox');await e.screenshot({path:require('./lib').out('tg.png')});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
