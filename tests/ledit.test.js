const {chromium}=require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 p.on('pageerror',e=>{bad++;console.log('PAGEERROR:',e.message)});p.on('dialog',d=>d.accept());
 await p.route('**',r=>r.request().url().includes('localhost:8899')?r.continue():r.abort());
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});await p.waitForTimeout(2000);
 await p.evaluate(()=>{
   DB.lessons['ccoineres/54648']={id:'ccoineres/54648',num:54648,guide:true,ord:1,title:'آموزش چارت‌خوانی؛ ورود، حد ضرر و اهداف',
     cat:GUIDE_CAT,text:'متن اصلی کانال',img:null,date:Date.now()-864e5,link:'https://t.me/ccoineres/54648',at:Date.now()};
   save();go('learn');GUIDE.open.add(54648);renderLessons();});
 await p.waitForTimeout(300);
 const marks=await p.$$eval('.gcard.open .markrow .mark',e=>e.map(x=>x.textContent));
 ok(marks.some(t=>t.includes('ویرایش متن')),'دکمه‌ی «ویرایش متن» زیر درس: '+marks.join(' | '));
 // از ورق خروجی
 await p.$$eval('.gcard.open .markrow .mark',e=>e.find(x=>x.textContent.includes('PDF')).click());
 await p.waitForSelector('#lxEdit');
 await p.click('#lxEdit');await p.waitForSelector('#le_steps');
 const steps0=await p.$eval('#le_steps',t=>t.value);
 ok(/روند را بشناس/.test(steps0)&&!/<i>/.test(steps0),'قدم‌ها به صورت متن ساده، بدون تگ');
 await p.fill('#le_title','درس اول: چارت‌خوانی');
 await p.fill('#le_text','متن ویرایش‌شده‌ی من با ورود 2.7–2.8');
 await p.fill('#le_steps',steps0.replace('روند را بشناس','اول روند را پیدا کن'));
 await p.fill('#le_rules','قانون تازه‌ی من با ریسک 1%');
 await p.click('#leOk');
 await p.waitForSelector('#lxPrev img',{timeout:20000});
 const hdr=await p.$eval('#lxEdit',e=>e.textContent);
 ok(/ویرایش‌شده/.test(hdr),'ورق خروجی برگشت و برچسب «ویرایش‌شده» دارد');
 const src=await p.evaluate(async()=>{const s=await lxSource(guideRec(54648),54648,'x',1);
   return {t:s.title,tx:s.text,st:s.note.steps[0][0],r:s.note.rules,sum:!!s.note.sum};});
 ok(src.t==='درس اول: چارت‌خوانی','عنوان خروجی: '+src.t);
 ok(/متن ویرایش‌شده/.test(src.tx),'متن پست در خروجی ویرایش‌شده است');
 ok(/اول روند را پیدا کن/.test(src.st)&&src.r.length===1&&/<i>1%<\/i>/.test(src.r[0]),'قدم و قانون ویرایش‌شده؛ عدد داخل <i>: '+src.r[0]);
 ok(src.sum,'خلاصه‌ی دست‌نخورده سر جایش');
 const ed=await p.evaluate(()=>DB.ledit['g54648']);
 ok(ed&&!('sum' in ed)&&!('pic' in ed),'فقط فیلدهای تغییرکرده ذخیره شدند: '+Object.keys(ed));
 // نمایش در برنامه
 await p.click('#cx');await p.waitForTimeout(450);
 const app=await p.evaluate(()=>{const c=document.querySelector('.gcard.open');return {t:c.querySelector('.gttl').textContent,
   tx:c.querySelector('.txt').textContent,st:c.querySelector('.gsteps b').textContent};});
 ok(app.t==='درس اول: چارت‌خوانی'&&/ویرایش‌شده/.test(app.tx)&&/اول روند/.test(app.st),'در خود برنامه هم ویرایش دیده می‌شود');
 // دوباره باز کردن بدون تغییر نباید عنوان را از دست بدهد
 await p.$$eval('.gcard.open .markrow .mark',e=>e.find(x=>x.textContent.includes('ویرایش متن')).click());
 await p.waitForSelector('#leOk');await p.click('#leOk');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>DB.ledit['g54648'].title==='درس اول: چارت‌خوانی'),'ذخیره‌ی دوباره بدون تغییر عنوان را نگه می‌دارد');
 await p.reload({waitUntil:'load'});await p.waitForTimeout(1800);
 ok(await p.evaluate(()=>!!DB.ledit['g54648']&&Object.keys(dbBlob()).includes('ledit')),'بعد از بارگذاری دوباره هست و در پشتیبان/همگام‌سازی است');
 // بازگرداندن
 await p.evaluate(()=>{go('learn');GUIDE.open.add(54648);renderLessons();});
 await p.$$eval('.gcard.open .markrow .mark',e=>e.find(x=>x.textContent.includes('ویرایش متن')).click());
 await p.waitForSelector('#leReset');await p.screenshot({path:require('./lib').out('ledit.png')});
 await p.click('#leReset');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!DB.ledit['g54648']&&document.querySelector('.gcard.open .gttl').textContent.includes('چارت‌خوانی؛')),'«متن اصلی» همه را برگرداند');
 console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
