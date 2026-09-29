const {chromium} = require('./lib').pw;
const fs=require('fs');
const html='<html><body><div class="tgme_widget_message" data-post="c/1/1"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">سلام</div><time datetime="2026-09-22T10:00:00+00:00"></time></div></div></body></html>';
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(4000);
 await p.evaluate(()=>{
   const mk=(id,tk,dir,e,st,ex,lev,days)=>ensureBase({id,ticker:tk,kind:'futures',dir,entry:e,
     stop:st,stop0:st,margin:50,baseMargin:50,lev,targets:[],status:'closed',exitPrice:ex,
     openedAt:Date.now()-86400000*days,closedAt:Date.now()-86400000*(days-1),fees:1.2,partials:[],log:[]});
   DB.positions=[mk('1','BTC','long',65000,63500,68200,5,9),mk('2','ETH','short',3000,3100,3085,8,8),
     mk('3','SOL','long',150,140,168,3,7),mk('4','XRP','long',0.6,0.55,0.66,4,6),
     mk('5','ADA','long',0.5,0.46,0.47,5,5)];
   save();renderAll();});
 await p.waitForTimeout(500);
 await p.click('.tab[data-v="report"]');await p.waitForTimeout(700);
 const btns=await p.evaluate(()=>[...document.querySelectorAll('#repBody .btn')]
   .map(x=>x.textContent.trim()).filter(x=>x.includes('تصویر')));
 console.log('  دکمه‌ها:',btns.join(' | '));
 ok(btns.length>=2,'دکمه‌ی تصویر روی کلی و روی هر دوره هست');
 await p.evaluate(()=>[...document.querySelectorAll('#repBody .btn')]
   .find(x=>x.textContent.trim()==='تصویر').click());
 await p.waitForTimeout(800);
 const sh=await p.evaluate(()=>{const im=document.querySelector('#shImg');
   return {w:im&&im.naturalWidth,h:im&&im.naturalHeight,src:(im&&im.src||'').slice(0,15)};});
 ok(sh.w===1080&&sh.h===1350,'کارت خلاصه ساخته شد ('+sh.w+'×'+sh.h+')');
 const uri=await p.evaluate(()=>document.querySelector('#shImg').src);
 fs.writeFileSync(require('./lib').out('share-sum.png'),Buffer.from(uri.split(',')[1],'base64'));
 const uri2=await p.evaluate(()=>drawSummaryCard(agg(DB.positions),'شهریور ۱۴۰۵',
   {amount:false,channel:true,ratio:'11'}).toDataURL('image/png'));
 fs.writeFileSync(require('./lib').out('share-sum-sq.png'),Buffer.from(uri2.split(',')[1],'base64'));
 console.log('  نوشته شد: share-sum.png، share-sum-sq.png');
 await b.close();})();
