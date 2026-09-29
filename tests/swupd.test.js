const {chromium} = require('./lib').pw;const fs=require('fs');const {spawn}=require('child_process');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
let srv;process.on('exit',()=>{try{srv&&srv.kill();}catch(e){}});
(async()=>{
 {const L=require('./lib'),d=L.out('swt');fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true});
  for(const x of ['index.html','sw.js','manifest.webmanifest','fonts','icons'])fs.cpSync(L.root(x),require('path').join(d,x),{recursive:true});}
 const PORT=String(18000+Math.floor(Math.random()*2000));
 srv=spawn('python3',['-m','http.server',PORT],{cwd:require('./lib').out('swt'),stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 const b=await chromium.launch();const ctx=await b.newContext();const p=await ctx.newPage();
 await p.addInitScript(()=>{window.__SD_SW=1;});
 await p.goto('http://localhost:'+PORT+'/index.html',{waitUntil:'load'});await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForTimeout(1200);
 await p.reload({waitUntil:'load'});await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>document.querySelector('#updBar').classList.contains('hide')),'بدون تغییر: نواری نیست');
 fs.appendFileSync(require('./lib').out('swt/index.html'),'\n<!-- v2 -->');
 await p.reload({waitUntil:'load'});await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!document.querySelector('#updBar').classList.contains('hide')),'فایل عوض شد: نوار «نسخه‌ی تازه» آمد');
 await p.evaluate(()=>document.querySelector('#updBar .btn.pri').click());await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>document.documentElement.outerHTML.includes('v2')||document.body.nextSibling!==null),'«بارگذاری دوباره» نسخه‌ی تازه را آورد');
 await b.close();srv.kill();console.log(bad?'✗ '+bad:'✔ همه درست');})();
