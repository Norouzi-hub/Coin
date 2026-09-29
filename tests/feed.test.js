/* لینک خروجی: برنامه قالب‌ها را می‌سازد، روی ورکرِ واقعی (همین کد proxy/worker.js) می‌گذارد
   و برنامه‌ی «دیگر» بدون رمز از لینک می‌خواند */
const {pw,root}=require('./lib');const {chromium}=pw;const {route}=require('./fixture');
const fs=require('fs'),os=require('os'),path=require('path'),{pathToFileURL}=require('url');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const tmp=path.join(os.tmpdir(),'sd-worker-feed-'+process.pid+'.mjs');fs.copyFileSync(root('proxy/worker.js'),tmp);
 const W=(await import(pathToFileURL(tmp).href)).default;
 const kv=new Map();const env={SYNC_TOKEN:'tok-123',STORE:{get:async k=>kv.has(k)?kv.get(k):null,put:async(k,v)=>kv.set(k,v),delete:async k=>kv.delete(k)}};
 const call=async(url,init)=>{const r=await W.fetch(new Request(url,init),env);return {status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()};};
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 await ctx.route('https://my.worker.test/**',async r=>{const q=r.request();
   const res=await call(q.url(),{method:q.method(),headers:q.headers(),body:['GET','HEAD'].includes(q.method())?undefined:q.postData()});
   return r.fulfill({status:res.status,headers:res.headers,body:res.body});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{if(sessionStorage.getItem('x'))return;sessionStorage.setItem('x',1);
   localStorage.setItem('signaldesk.sync.v1',JSON.stringify({url:'https://my.worker.test',token:'tok-123',rev:0,at:0}));
   localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[
     {id:'p2',ticker:'ETH',dir:'short',kind:'futures',entry:3000,stop:3100,stop0:3100,margin:20,lev:10,baseMargin:20,openedAt:Date.now()-120*36e5,closedAt:Date.now()-100*36e5,exitPrice:2850,fees:0.2,status:'closed',partials:[],log:[]}],
     decisions:{'ccoineres/911':{action:'taken',at:Date.now()-120*36e5,posId:'p2'},'ccoineres/913':{action:'skipped',at:Date.now()}},settings:{feat:{autoexec:false}}}));});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(3500);

 console.log('=== قالب‌ها ===');
 const f=await p.evaluate(()=>{const r=feedFiles();return {n:r.items.length,items:r.items.map(i=>i.ticker+':'+i.status+(i.pos&&i.pos.r!=null?':'+i.pos.r:'')),files:r.files};});
 console.log('   ',f.items.join(' | '));
 ok(f.n>=6&&f.items.every(x=>!/^:/.test(x)),'فقط سیگنال‌ها ('+f.n+')، خبر و اطلاعیه نه');
 ok(f.items.some(x=>x.startsWith('ETH:taken:1.4'))&&f.items.some(x=>x.startsWith('XRP:skipped')),'وضعیت «گرفتم» با نتیجه‌ی R و «نگرفتم»');
 const ics=f.files.ics, lines=ics.split('\r\n');
 const enc=new TextEncoder();
 ok(ics.startsWith('BEGIN:VCALENDAR\r\n')&&ics.trim().endsWith('END:VCALENDAR'),'ICS: شروع و پایان درست');
 ok(lines.every(l=>enc.encode(l).length<=75),'ICS: هیچ خطی بیش از ۷۵ بایت نیست (فارسی نیمه نشکسته)');
 const unf=ics.replace(/\r\n /g,'');
 ok((unf.match(/BEGIN:VEVENT/g)||[]).length===f.n&&(unf.match(/END:VEVENT/g)||[]).length===f.n,'ICS: یک رویداد برای هر سیگنال');
 ok(/SUMMARY:🟢 BTC لانگ · ورود 64800 · استاپ 63500/.test(unf),'ICS: عنوان خوانا «🟢 BTC لانگ · ورود 64800 · استاپ 63500»');
 ok(/DTSTART:\d{8}T\d{6}Z/.test(unf)&&!/[^\\],(?=.*\n)/.test(''),'ICS: زمان به UTC');
 const rss=await p.evaluate(x=>{const d=new DOMParser().parseFromString(x,'application/xml');return {err:!!d.querySelector('parsererror'),n:d.querySelectorAll('item').length};},f.files.rss);
 ok(!rss.err&&rss.n===f.n,'RSS: XML سالم با '+rss.n+' آیتم');
 const csv=f.files.csv.replace(/^﻿/,'').trim().split('\r\n');
 ok(f.files.csv.startsWith('﻿')&&csv[0].startsWith('time_utc,time_tehran,ticker')&&csv.length===f.n+1,'CSV: BOM، سرستون و یک ردیف برای هر سیگنال');
 const js=JSON.parse(f.files.json);
 ok(js.items.length===f.n&&js.items[0].title&&js.items[0].time,'JSON: آیتم‌ها با عنوان و زمان');

 console.log('=== لینک روی ورکر ===');
 await p.evaluate(()=>{document.querySelector('#setVeil').classList.remove('hide');document.querySelector('#feedBox').closest('details').open=true;
   const c=document.querySelector('#sFeedOn');c.checked=true;c.dispatchEvent(new Event('change'));});
 await p.waitForTimeout(800);
 const urls=await p.evaluate(()=>[...document.querySelectorAll('#feedLinks input')].map(i=>i.value));
 ok(urls.length===4&&urls[0].startsWith('https://my.worker.test/f/')&&urls[0].endsWith('/signals.ics'),'چهار لینک ساخته شد: '+(urls[0]||''));
 const g=await call(urls[0]);
 ok(g.status===200&&g.headers['content-type'].startsWith('text/calendar')&&g.body===ics.replace(/DTSTAMP:\d{8}T\d{6}Z/g,m=>m)||g.body.includes('BEGIN:VEVENT'),'برنامه‌ی دیگر بدون رمز ICS را خواند ('+g.headers['content-type']+')');
 const c2=await call(urls[2]);ok(c2.status===200&&c2.headers['content-type'].startsWith('text/csv')&&c2.body.includes('ticker'),'CSV از لینک');
 ok((await call('https://my.worker.test/f/'+'x'.repeat(24)+'/signals.ics')).status===404,'کلید اشتباه ← ۴۰۴');
 ok((await call('https://my.worker.test/feed',{method:'PUT',headers:{Authorization:'Bearer bad'},body:'{}'})).status===401,'نوشتن بدون رمز همگام‌سازی رد می‌شود');
 const wc=await p.evaluate(()=>document.querySelector('#feedWebcal').getAttribute('href'));
 ok(wc.startsWith('webcal://my.worker.test/f/'),'دکمه‌ی «افزودن به تقویم گوشی» (webcal)');
 console.log('=== تازه شدن و لینک تازه ===');
 const at0=JSON.parse(kv.get('signaldesk:feed')).at;
 await p.evaluate(()=>{DB.decisions['ccoineres/907']={action:'skipped',at:Date.now()};save();});
 await p.evaluate(()=>feedPublish(false));
 const at1=JSON.parse(kv.get('signaldesk:feed')).at;
 ok(at1>=at0&&JSON.parse(kv.get('signaldesk:feed')).files.json.includes('"status": "skipped"'),'تصمیم تازه ← خروجی روی ورکر تازه شد');
 ok(await p.evaluate(()=>feedPublish(false))===false,'بدون تغییر، دوباره نوشته نمی‌شود (صرفه‌جویی در KV)');
 await p.evaluate(()=>document.querySelector('#feedRot').click());await p.waitForTimeout(500);
 const urls2=await p.evaluate(()=>[...document.querySelectorAll('#feedLinks input')].map(i=>i.value));
 ok(urls2[0]!==urls[0]&&(await call(urls[0])).status===404&&(await call(urls2[0])).status===200,'«لینک تازه»: قبلی باطل، تازه کار می‌کند');
 console.log('=== دانلود بدون همگام‌سازی ===');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#feedDlIcs').click())]);
 ok(dl.suggestedFilename()==='signals-ccoineres.ics','دانلود فایل تقویم: '+dl.suggestedFilename());
 const e=await p.$('#feedBox');await e.screenshot({path:require('./lib').out('feed.png')});
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
