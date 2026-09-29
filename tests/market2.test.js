const {chromium} = require('./lib').pw;
const posts=[
 {n:720,t:'#سولانا اسپات<br>ورود ۱۵۰<br>حد ضرر ۱۴۰<br>تارگت ۱۸۰'},
 {n:719,t:'#بیت_کوین شورت فیوچرز<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۷۰۰۰<br>اهرم ۵'},
 {n:718,t:'#اتریوم لانگ<br>ورود ۳۰۰۰<br>حد ضرر ۲۹۰۰<br>تارگت ۳۳۰۰'},
 {n:717,t:'#سولانا برای هولد بلندمدت بخرید<br>ورود ۱۵۰<br>حد ضرر ۱۲۰'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}">
 <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div>
 <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>`).join('')}</body></html>`;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:1000}});await p.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{try{S.feat.accordion=false;renderAll();}catch(e){}}));
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(4000);
 await p.evaluate(()=>{PRICES=new Map([['BTC',65000],['ETH',3000],['SOL',150]]);
  SYMBOLS=new Set(PRICES.keys());SYMVER++;sigFilter='all';renderAll();});
 await p.waitForTimeout(500);

 console.log('=== تشخیص بازار از متن ===');
 const det=await p.evaluate(()=>POSTS.map(x=>{const s=sigOf(x);
   return {n:x.id.split('/').pop(),tk:s.ticker,m:s.market,g:s.marketGuess,d:s.direction,lev:s.leverage};}));
 for(const d of det)console.log('  #'+d.n,d.tk,'→',d.m,d.g?'(حدس)':'(صریح)','dir='+d.d);
 const by=n=>det.find(x=>x.n===String(n));
 ok(by(720).m==='spot'&&!by(720).g,'«اسپات» صریح → اسپات');
 ok(by(719).m==='futures'&&!by(719).g,'«فیوچرز»+اهرم+شورت → فیوچرز');
 ok(by(718).m==='futures'&&by(718).g,'لانگ ساده → فیوچرز ولی حدس');
 ok(by(717).m==='spot'&&!by(717).g,'«هولد بلندمدت» → اسپات');

 console.log('\n=== ریاضی اسپات در computePlan ===');
 const r=await p.evaluate(()=>{
  // استاپ تنگ (۱٫۳۳٪) تا اهرمِ لازم واقعاً بالای ۱ بیفتد و لیکوئید معنی پیدا کند
  const f=computePlan({direction:'long',entry:150,stop:148,capital:100,riskPct:5,
    maxLeverage:10,mode:'margin',rMultiples:[1.5,3],market:'futures'});
  const s=computePlan({direction:'long',entry:150,stop:140,capital:100,riskPct:5,
    maxLeverage:10,mode:'margin',rMultiples:[1.5,3],market:'spot'});
  const sh=computePlan({direction:'short',entry:150,stop:140,capital:100,riskPct:5,
    maxLeverage:10,mode:'margin',market:'spot'});
  return {f:{lev:f.leverage,liq:f.liqPrice,not:f.notional,risk:f.actualRisk,w:f.warnings},
          s:{lev:s.leverage,liq:s.liqPrice,not:s.notional,qty:s.qty,risk:s.actualRisk,
             riskPct:s.actualRiskPct,sug:s.suggestedMargin,w:s.warnings,tg:s.targets.map(t=>t.price)},
          shDir:sh.direction,shOk:sh.ok};
 });
 console.log('  فیوچرز: اهرم='+r.f.lev.toFixed(2),'لیکوئید='+(r.f.liq?r.f.liq.toFixed(2):'ندارد'),'حجم='+r.f.not.toFixed(0));
 console.log('  اسپات : اهرم='+r.s.lev,'لیکوئید='+(r.s.liq===null?'ندارد':r.s.liq),'ارزش='+r.s.not,'مقدار='+r.s.qty.toFixed(4));
 ok(r.s.lev===1,'اسپات اهرم ۱ است');
 ok(r.s.liq===null,'اسپات لیکوئید ندارد');
 ok(Math.abs(r.s.not-100)<1e-9,'ارزش خرید = مبلغ ($۱۰۰)');
 ok(Math.abs(r.s.qty-100/150)<1e-9,'مقدار = مبلغ÷قیمت = '+(100/150).toFixed(4));
 // استاپ ۱۴۰ روی ورود ۱۵۰ → افت ۶٫۶۷٪؛ روی ۱۰۰ دلار یعنی ۶٫۶۷ دلار
 ok(Math.abs(r.s.risk-100*(10/150))<1e-9,'ضرر در استاپ = $'+(100*10/150).toFixed(2));
 ok(!r.s.w.includes('lev-capped'),'هشدار بی‌معنیِ «سقف اهرم» در اسپات نمی‌آید');
 ok(r.f.liq!==null&&r.f.lev>1,'فیوچرز همچنان اهرم و لیکوئید دارد');
 ok(r.shDir==='long','اسپاتِ شورت وجود ندارد؛ به لانگ برمی‌گردد');
 // تارگت‌ها: 1.5R روی فاصله ۶٫۶۷٪ → ۱۵۰*(۱+۱٫۵*۰٫۰۶۶۷)=۱۶۵
 ok(Math.abs(r.s.tg[0]-165)<1e-9,'تارگت ۱٫۵R اسپات = ۱۶۵');
 // ریسک هدف ۵٪ روی $۱۰۰ = $۵؛ با افت ۶٫۶۷٪ تا استاپ، خریدِ $۷۵ همان $۵ ضرر می‌دهد
 ok(Math.abs(r.s.sug-75)<1e-9,'مبلغ پیشنهادی اسپات = $۷۵ (شد '+r.s.sug.toFixed(2)+')');

 console.log('\n=== کلید بازار در کارت ===');
 const tg=await p.evaluate(()=>{
   const c=[...document.querySelectorAll('#list .card')][2];   // اتریوم، حدس
   const mk=c.querySelector('.mkt');
   return {has:!!mk,guess:mk&&mk.classList.contains('guess'),
     on:mk&&[...mk.querySelectorAll('.mktb')].map(b=>b.textContent.trim()+(b.classList.contains('on')?'*':'')).join(' ')};
 });
 console.log('  کلید:',tg.on,tg.guess?'· حالت حدس':'');
 ok(tg.has,'کلید روی کارت هست');
 ok(tg.guess,'وقتی پست نگفته، کلید حالت «حدس» می‌گیرد');
 await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')][2];
   [...c.querySelectorAll('.mktb')].find(b=>b.textContent.includes('اسپات')).click();});
 await p.waitForTimeout(500);
 const after=await p.evaluate(()=>{const id=POSTS[2].id;
   return {ov:OVERRIDE[id]&&OVERRIDE[id].market,m:sigOf(POSTS[2]).market,
     guess:!!document.querySelectorAll('#list .card')[2].querySelector('.mkt.guess')};});
 ok(after.ov==='spot'&&after.m==='spot','با یک ضربه اسپات شد و ذخیره شد');
 ok(!after.guess,'بعد از انتخاب دستی دیگر «حدس» نیست');

 console.log('\n=== ورق ورود اسپات ===');
 await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')][2];
   [...c.querySelectorAll('.brief .btn')].find(b=>b.textContent.includes('بررسی')).click();});

 await p.waitForTimeout(700);
 const sheet=await p.evaluate(()=>({
   mkOn:[...document.querySelectorAll('#mktBox .mktb.on')].map(b=>b.textContent.trim()).join(''),
   levHidden:document.querySelector('#levRow').classList.contains('hide'),
   dirHidden:document.querySelector('#dirRow').classList.contains('hide'),
   lbl:document.querySelector('#lbl_m').textContent,
   ok:document.querySelector('#ok').textContent,
   prev:[...document.querySelectorAll('#prev .k')].map(k=>k.querySelector('b').textContent+'='+k.querySelector('span').textContent),
 }));
 console.log('  بازار:',sheet.mkOn,'| برچسب مبلغ:',sheet.lbl,'| دکمه:',sheet.ok);
 console.log('  پیش‌نمایش:',sheet.prev.join(' · '));
 ok(sheet.mkOn==='اسپات','ورق با اسپات باز شد');
 ok(sheet.levHidden,'کشویی اهرم پنهان است');
 ok(sheet.dirHidden,'انتخاب جهت پنهان است');
 ok(sheet.lbl.includes('مبلغ خرید'),'برچسب «مبلغ خرید» شد');
 ok(sheet.ok.includes('اسپات'),'دکمه‌ی ثبت می‌گوید اسپات');
 ok(!sheet.prev.some(x=>x.startsWith('لیکوئید')),'لیکوئید در پیش‌نمایش نیست');
 ok(sheet.prev.some(x=>x.includes('مقدار')),'مقدار ارز نشان داده می‌شود');
 // برگرداندن به فیوچرز داخل همان ورق
 await p.evaluate(()=>[...document.querySelectorAll('#mktBox .mktb')].find(b=>b.textContent.includes('فیوچرز')).click());
 await p.waitForTimeout(400);
 const back=await p.evaluate(()=>({lev:document.querySelector('#levRow').classList.contains('hide'),
   lbl:document.querySelector('#lbl_m').textContent,
   liq:[...document.querySelectorAll('#prev .k b')].some(b=>b.textContent==='لیکوئید'),
   entry:document.querySelector('#f_e').value}));
 ok(!back.lev&&back.lbl.includes('مارجین'),'برگشت به فیوچرز اهرم را برمی‌گرداند');
 ok(back.liq,'لیکوئید دوباره آمد');
 ok(back.entry==='3000','عددهای واردشده با عوض کردن بازار پاک نمی‌شوند');
 // ثبت اسپات
 await p.evaluate(()=>[...document.querySelectorAll('#mktBox .mktb')].find(b=>b.textContent.includes('اسپات')).click());
 await p.waitForTimeout(300);
 await p.fill('#f_m','200');await p.waitForTimeout(300);
 await p.click('#ok');await p.waitForTimeout(700);
 const pos=await p.evaluate(()=>{const x=DB.positions[DB.positions.length-1];
   return x?{kind:x.kind,lev:x.lev,dir:x.dir,margin:x.margin,tk:x.ticker}:null;});
 console.log('  پوزیشن ثبت‌شده:',JSON.stringify(pos));
 ok(pos&&pos.kind==='spot','kind=spot ذخیره شد');
 ok(pos&&pos.lev===1&&pos.dir==='long','اهرم ۱ و جهت لانگ');
 await p.click('.tab[data-v="positions"]');await p.waitForTimeout(600);
 const card=await p.evaluate(()=>{const c=document.querySelector('#posList .card');
   return c?{pills:[...c.querySelectorAll('.pill')].map(x=>x.textContent),
     keys:[...c.querySelectorAll('.kv .k b')].map(x=>x.textContent)}:null;});
 console.log('  برچسب‌های کارت:',card.pills.join(' · '));
 ok(card.pills.includes('اسپات'),'کارت پوزیشن برچسب اسپات دارد');
 ok(!card.pills.some(x=>/x$/.test(x)),'اهرم روی کارت اسپات نوشته نمی‌شود');
 ok(!card.keys.includes('لیکوئید'),'ردیف لیکوئید در کارت اسپات نیست');
 ok(card.keys.some(k=>k.startsWith('مقدار')),'ردیف مقدار ارز هست');
 await b.close();})();
