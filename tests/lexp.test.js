const {chromium}=require('./lib').pw;
const fs=require('fs');
const IMG=fs.readFileSync(require('./lib').root('docs/redesign-preview.png'));
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
// pdfjs-dist: از node_modules مخزن (npm ci)، وگرنه نسخه‌ای که محیط محلی کنار گذاشته
const PJ=(()=>{try{return require('path').dirname(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'))+'/';}
  catch(e){return '/tmp/claude-0/pdfj/node_modules/pdfjs-dist/legacy/build/';}})();
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:412,height:900},acceptDownloads:true});
 const p=await ctx.newPage();
 p.on('pageerror',e=>{bad++;console.log('PAGEERROR:',e.message)});
 let viaProxy=0;
 await ctx.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899/pdfjs/'))return r.fulfill({status:200,headers:{'content-type':'text/javascript'},body:fs.readFileSync(PJ+u.split('/pdfjs/')[1])});
  if(u.includes('localhost:8899'))return r.continue();
  if(u.startsWith('https://cdn4.telesco.pe/'))return r.abort();   // مثل نبودِ CORS روی گوشی
  if(u.includes('api.codetabs.com')&&u.includes('telesco.pe')){viaProxy++;
    return r.fulfill({status:200,headers:{'content-type':'image/png','access-control-allow-origin':'*'},body:IMG});}
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});await p.waitForTimeout(2500);
 await p.evaluate(()=>{
   DB.lessons['ccoineres/54648']={id:'ccoineres/54648',num:54648,guide:true,ord:1,title:'آموزش چارت‌خوانی؛ ورود، حد ضرر و اهداف',
     cat:GUIDE_CAT,text:'#دستورالعمل_ترید\nنمونه‌ی یک معامله روی ICP با ورود 2.7 تا 2.8 و حد ضرر 1.998',img:'https://cdn4.telesco.pe/file/abc.jpg',
     date:Date.now()-864e5,link:'https://t.me/ccoineres/54648',at:Date.now()};
   save();go('learn');GUIDE.open.add(54648);renderLessons();});
 await p.waitForTimeout(300);
 const btn=await p.$$eval('.gcard .markrow .mark',e=>e.map(x=>x.textContent));
 ok(btn.some(t=>t.includes('PDF')),'دکمه‌ی خروجی زیر درس: '+btn.join(' | '));
 await p.$$eval('.gcard .markrow .mark',e=>e.find(x=>x.textContent.includes('PDF')).click());
 await p.waitForSelector('#lxPrev img',{timeout:30000});
 const rt=await p.evaluate(()=>LOG.filter(x=>x.m==='تصویر آموزش آمد').map(x=>x.route).join(','));console.log('   مسیر عکس:',rt,'· واسط:',viaProxy);ok(viaProxy>0&&/codetabs/.test(rt),'عکسِ بدون CORS از واسط آمد');
 const dim=await p.$eval('#lxPrev img',i=>[i.naturalWidth,i.naturalHeight]);
 ok(dim[0]===1080&&dim[1]>2500,'پیش‌نمایش PNG: '+dim.join('×'));
 await p.screenshot({path:require('./lib').out('lexp_sheet.png')});
 // PNG دانلود
 let [dl]=await Promise.all([p.waitForEvent('download'),p.click('#lxDPng')]);
 const png=fs.readFileSync(await dl.path());fs.writeFileSync(require('./lib').out('lesson.png'),png);
 ok(png.slice(1,4).toString()==='PNG'&&dl.suggestedFilename().endsWith('.png'),'دانلود PNG: '+dl.suggestedFilename()+' '+Math.round(png.length/1024)+'KB');
 // PDF دانلود
 [dl]=await Promise.all([p.waitForEvent('download'),p.click('#lxDPdf')]);
 const pdf=fs.readFileSync(await dl.path());fs.writeFileSync(require('./lib').out('lesson.pdf'),pdf);
 ok(pdf.slice(0,5).toString()==='%PDF-','دانلود PDF: '+dl.suggestedFilename()+' '+Math.round(pdf.length/1024)+'KB');
 // تغییر گزینه‌ها: روشن، لوگوی من، متن کپی‌رایت
 await p.click('#lxTheme .mktb:nth-child(2)');
 await p.fill('#lx_copy','© آکادمی کوینر — همه‌ی حقوق محفوظ');
 await p.setInputFiles('#lxFile',require('./lib').root('icons/icon-192.png'));
 await p.waitForTimeout(1200);
 const o=await p.evaluate(()=>({t:lxOpt.theme,l:lxOpt.logo,c:lxOpt.copy,d:lxOpt.logoData.length>100}));
 ok(o.t==='light'&&o.l==='custom'&&o.d&&o.c.includes('کوینر'),'گزینه‌ها ذخیره شد: '+JSON.stringify(o));
 [dl]=await Promise.all([p.waitForEvent('download'),p.click('#lxDPng')]);
 fs.writeFileSync(require('./lib').out('lesson_light.png'),fs.readFileSync(await dl.path()));
 // بررسی PDF با pdf.js
 const pg=await ctx.newPage();
 await pg.goto('http://localhost:8899/index.html?x',{waitUntil:'domcontentloaded'});
 const res=await pg.evaluate(async(b64)=>{
   const pdfjs=await import('/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';
   const data=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
   const doc=await pdfjs.getDocument({data}).promise;
   const out={n:doc.numPages,imgs:[]};
   for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const vp=page.getViewport({scale:0.6});
     const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
     await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;out.imgs.push(cv.toDataURL('image/png'));}
   return out;},pdf.toString('base64'));
 ok(res.n>=2,'PDF با pdf.js باز شد: '+res.n+' صفحه');
 res.imgs.forEach((d,i)=>fs.writeFileSync(require('./lib').out('pdfpage')+(i+1)+'.png',Buffer.from(d.split(',')[1],'base64')));
 console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
