const {chromium} = require('./lib').pw;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
const html='<html><body><div class="tgme_widget_message" data-post="ccoineres/100"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">سلام</div><time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div></body></html>';
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(3500);
 await p.click('.tab[data-v="more"]');await p.click('.moreit[data-go="learn"]');await p.waitForTimeout(400);
 const pills=await p.$$eval('.gcard .ghead',e=>e.map(h=>h.textContent.includes('آموزش')));
 ok(pills.length===9,'9 درس');
 // همه را باز کن
 await p.evaluate(()=>{guideList().forEach(([n])=>GUIDE.open.add(n));renderLessons();});
 await p.waitForTimeout(400);
 const notes=await p.$$eval('.gcard',e=>e.map(c=>({n:!!c.querySelector('.gn'),steps:c.querySelectorAll('.gsteps li').length,lad:!!c.querySelector('.glad'),w:c.querySelector('.gcalc,.gclock,.grulesnow')?.className||''})));
 console.log('  ',JSON.stringify(notes));
 ok(notes.every(x=>x.n&&x.steps>=4),'هر 9 درس تحلیل و حداقل 4 قدم دارند (حتی بدون پست از کانال)');
 ok(notes[0].lad&&notes[1].lad&&notes[2].lad,'درس 1 تا 3 نردبان قیمت دارند');
 ok(notes[3].w==='gcalc'&&notes[4].w==='gclock'&&notes[8].w==='grulesnow','ابزارهای زنده سر جایشان');
 const lad1=await p.$$eval('.gcard:nth-of-type(1) .glr',e=>e.map(x=>x.textContent));
 const L1=await p.evaluate(()=>[...document.querySelectorAll('.gcard')[0].querySelectorAll('.glr')].map(x=>x.textContent));
 console.log('   نردبان ICP:',JSON.stringify(L1));
 ok(L1.some(x=>x.includes('1.6R'))&&L1.some(x=>x.includes('4.3R'))&&L1.some(x=>x.includes('8.6R')),'R هدف‌های ICP: 1.6 / 4.3 / 8.6');
 // ماشین‌حساب
 const calc=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#gc_out .bk')].map(k=>[k.querySelector('b').textContent,k.querySelector('span').textContent])));
 console.log('   ماشین‌حساب:',JSON.stringify(calc));
 ok(calc['ریسک دلاری'].includes('10.00')&&calc['فاصله‌ی استاپ']==='14.09%'&&calc['حجم پوزیشن'].includes('70.9')||calc['حجم پوزیشن'].includes('71'),'ریسک 10$، فاصله 14.09٪، حجم ~71$');
 ok(calc['مارجین'].includes('3.5')&&calc['تعداد واحد'].startsWith('48.7')||calc['تعداد واحد'].startsWith('48.8'),'مارجین ~3.55$ و 48.8 واحد');
 ok(calc['اهرم امن (ایزوله)']==='6X','اهرم امن 6X — همان عدد متن درس 3');
 ok(await p.$eval('#gc_warn',e=>e.textContent.includes('لیکوئید قبل از حد ضرر')),'هشدار لیکوئید با 20X');
 await p.fill('#gc_lev','5');await p.waitForTimeout(200);
 ok(await p.$eval('#gc_warn',e=>!e.textContent.includes('لیکوئید')),'با 5X هشدار رفت');
 // ساعت
 const clk=await p.evaluate(()=>({next:document.querySelector('.gnext b').textContent,on:document.querySelector('.gslots i.on')?.textContent,ses:[...document.querySelectorAll('.gses')].map(x=>x.textContent)}));
 const now=Date.now(),P=4*3600e3,nx=Math.ceil((now+1000)/P)*P,t=new Date(nx+3.5*3600e3);
 const exp=String(t.getUTCHours()).padStart(2,'0')+':'+String(t.getUTCMinutes()).padStart(2,'0');
 console.log('   ساعت:',JSON.stringify(clk),'انتظار',exp);
 ok(clk.next===exp&&clk.on===exp,'کلوز بعدی درست و در ردیف ساعت‌ها روشن');
 ok(clk.ses.length===2&&clk.ses.every(x=>/باز است|تا باز شدن|بسته/.test(x)),'وضعیت دو سشن');
 // قانون 3 پوزیشن
 await p.evaluate(()=>{S.acct=1000;
   const mk=(t,e,s,m,l)=>ensureBase({id:uid(),ticker:t,kind:'futures',dir:'long',entry:e,stop:s,stop0:s,margin:m,baseMargin:m,lev:l,targets:[],openedAt:Date.now(),status:'open',partials:[],log:[]});
   DB.positions=[mk('BTC',100,90,10,10),mk('ETH',100,95,20,10),mk('SOL',100,100,10,10)];renderLessons();});
 await p.waitForTimeout(200);
 const rn=await p.evaluate(()=>({m:[...document.querySelectorAll('.gmeter')].map(x=>x.textContent),v:document.querySelector('.gverdict').textContent}));
 console.log('   قانون:',JSON.stringify(rn));
 ok(rn.m[0].includes('2 / 3')&&rn.m[1].includes('2.0%'),'2 پوزیشن در ریسک، ریسک فعال 2٪ (SOL ریسک‌فری)');
 ok(rn.v.includes('می‌توانی')&&rn.v.includes('ریسک‌فری'),'حکم: جای پوزیشن تازه هست');
 await p.evaluate(()=>{DB.positions.push(ensureBase({id:uid(),ticker:'XRP',kind:'futures',dir:'long',entry:1,stop:0.9,stop0:0.9,margin:10,baseMargin:10,lev:10,targets:[],openedAt:Date.now(),status:'open',partials:[],log:[]}));renderLessons();});
 const rn2=await p.evaluate(()=>document.querySelector('.gverdict').textContent);
 ok(rn2.includes('نگیر'),'با 3 پوزیشن در ریسک: «پوزیشن تازه نگیر»');
 const over=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 ok(!over,'اسکرول افقی نیست');
 // عکس‌ها
 for(const [i,name] of [[0,'n1'],[3,'n4'],[4,'n5'],[8,'n9'],[5,'n6']]){
   const h=await p.evaluateHandle(i=>document.querySelectorAll('.gcard')[i],i);
   await h.asElement().screenshot({path:require('./lib').out('')+name+'.png'});
 }
 await b.close();
})();
