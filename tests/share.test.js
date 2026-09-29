const {chromium} = require('./lib').pw;
const html='<html><body><div class="tgme_widget_message" data-post="c/1/1"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">#بیت_کوین لانگ ورود ۶۵۰۰۰ حد ضرر ۶۳۵۰۰ اهرم ۵</div><time datetime="2026-09-22T10:00:00+00:00"></time></div></div></body></html>';
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:412,height:900},
   permissions:[]});
 const p=await ctx.newPage();
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(4000);
 await p.evaluate(()=>{PRICES=new Map([['BTC',68200]]);SYMBOLS=new Set(['BTC']);SYMVER++;
   DB.positions=[ensureBase({id:'p1',ticker:'BTC',kind:'futures',dir:'long',entry:65000,
     stop:63500,stop0:63500,margin:50,baseMargin:50,lev:5,targets:[69000],status:'closed',
     exitPrice:68200,openedAt:Date.now()-86400000*2,closedAt:Date.now(),fees:1.6,partials:[],log:[]})];
   save();renderAll();});
 await p.waitForTimeout(500);

 console.log('=== دکمه روی کارت پوزیشن ===');
 await p.click('.tab[data-v="positions"]');await p.waitForTimeout(500);
 await p.evaluate(()=>{posFilter='all';const id=DB.positions[0].id;POSOPEN.add(id);POSMENU.add(id);renderPositions();});
 await p.waitForTimeout(400);
 // «تصویر نتیجه» حالا در منوی «⋯» کارت است
 const has=await p.evaluate(()=>[...document.querySelectorAll('#posList .pmore .btn')]
   .some(b=>b.textContent.includes('تصویر')));
 ok(has,'دکمه‌ی «تصویر» روی کارت پوزیشن هست');
 await p.evaluate(()=>[...document.querySelectorAll('#posList .pmore .btn')]
   .find(b=>b.textContent.includes('تصویر')).click());
 await p.waitForTimeout(800);

 console.log('\n=== ورق و پیش‌نمایش ===');
 const sh=await p.evaluate(()=>{const im=document.querySelector('#shImg');
   return {img:!!im,src:(im&&im.src||'').slice(0,22),
     w:im&&im.naturalWidth,h:im&&im.naturalHeight,
     opts:[...document.querySelectorAll('.shopt span')].map(x=>x.textContent),
     ratios:[...document.querySelectorAll('#shRatio .mktb')].map(x=>x.textContent.trim()+(x.classList.contains('on')?'*':'')),
     btns:[...document.querySelectorAll('.srow .btn')].map(x=>x.textContent.trim())};});
 console.log('  تصویر:',sh.w+'×'+sh.h,'·',sh.src);
 console.log('  گزینه‌ها:',sh.opts.join(' | '),'· نسبت:',sh.ratios.join(' | '));
 console.log('  دکمه‌ها:',sh.btns.join(' | '));
 ok(sh.img&&sh.src.startsWith('data:image/png'),'پیش‌نمایش PNG واقعی است');
 ok(sh.w===1080&&sh.h===1350,'اندازه 1080×1350 (4:5)');
 ok(sh.opts.length===3,'سه گزینه‌ی نمایش (مبلغ، کانال، تاریخ‌ها)');
 ok(sh.ratios.length===2,'دو نسبت');

 console.log('\n=== خاموش کردن مبلغ، تصویر را عوض می‌کند ===');
 const before=await p.evaluate(()=>document.querySelector('#shImg').src.length);
 await p.uncheck('#o_amt');await p.waitForTimeout(500);
 const after=await p.evaluate(()=>({len:document.querySelector('#shImg').src.length,
   opt:shareOpt.amount,ls:JSON.parse(localStorage.getItem('signaldesk.share.v1')||'{}').amount}));
 ok(before!==after.len,'تصویر با برداشتن تیک عوض شد');
 ok(after.opt===false&&after.ls===false,'انتخاب ذخیره شد');

 console.log('\n=== تغییر نسبت ===');
 await p.evaluate(()=>[...document.querySelectorAll('#shRatio .mktb')]
   .find(x=>x.textContent.includes('مربع')).click());
 await p.waitForTimeout(500);
 const sq=await p.evaluate(()=>({w:document.querySelector('#shImg').naturalWidth,
   h:document.querySelector('#shImg').naturalHeight,on:shareOpt.ratio}));
 ok(sq.w===1080&&sq.h===1080,'مربع شد: '+sq.w+'×'+sq.h);
 ok(sq.on==='11','انتخاب نسبت ذخیره شد');

 console.log('\n=== دانلود واقعی ===');
 const dlp=p.waitForEvent('download',{timeout:8000}).catch(()=>null);
 await p.click('#dlb');
 const dl=await dlp;
 ok(!!dl,'فایل دانلود شد'+(dl?': '+dl.suggestedFilename():''));
 if(dl)ok(/^signal-BTC-\d{4}-\d{2}-\d{2}\.png$/.test(dl.suggestedFilename()),'نام فایل درست است');

 console.log('\n=== محتوای تصویر: چه چیزهایی نباید باشد ===');
 const px=await p.evaluate(()=>{
   const pos=DB.positions[0];
   const cv=drawShareCard(shareDataOf(pos),{amount:true,channel:true,ratio:'45'});
   const c=cv.getContext('2d');
   // چند نقطه‌ی کلیدی: پس‌زمینه باید تیره بماند، عدد اصلی سبز
   const at=(x,y)=>{const d=c.getImageData(x,y,1,1).data;return [d[0],d[1],d[2]];};
   return {corner:at(20,20),hero:at(540,580),bg:at(540,1330)};});
 console.log('  گوشه:',px.corner.join(','),'· عدد:',px.hero.join(','));
 ok(px.corner[0]<40&&px.corner[1]<40,'پس‌زمینه تیره است (با تم برنامه می‌خواند)');
 ok(px.hero[1]>px.hero[0]&&px.hero[1]>px.hero[2],'عدد اصلی سبز رنگ شده (سود)');

 console.log('\n=== کارت ضرر قرمز است ===');
 const red=await p.evaluate(()=>{
   const pos=ensureBase({id:'x',ticker:'ETH',kind:'futures',dir:'short',entry:3000,stop:3100,
     stop0:3100,margin:40,baseMargin:40,lev:8,targets:[],status:'closed',exitPrice:3085,
     openedAt:Date.now()-3600000,closedAt:Date.now(),fees:2.5,partials:[],log:[]});
   const c=drawShareCard(shareDataOf(pos),{amount:true,channel:true,ratio:'45'}).getContext('2d');
   const d=c.getImageData(540,580,1,1).data;return [d[0],d[1],d[2]];});
 ok(red[0]>red[1]&&red[0]>red[2],'کارت ضرر قرمز است ('+red.join(',')+')');

 console.log('\n=== نبود navigator.share ⇒ دانلود، نه خطا ===');
 const fb=await p.evaluate(async()=>{
   const old=navigator.canShare;
   try{Object.defineProperty(navigator,'canShare',{value:undefined,configurable:true});}catch(e){}
   const cv=drawShareCard(shareDataOf(DB.positions[0]),shareOpt);
   const r=await shareOrSave(cv,'t');
   try{Object.defineProperty(navigator,'canShare',{value:old,configurable:true});}catch(e){}
   return r;});
 ok(fb==='save','بدون پشتیبانی اشتراک بومی، ذخیره می‌کند ('+fb+')');
 await b.close();})();
