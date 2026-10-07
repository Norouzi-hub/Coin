const {chromium} = require('./lib').pw;
const posts=[
 {n:740,t:'#بیت_کوین لانگ<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۳۵۰۰<br>تارگت ۶۹۰۰۰<br>اهرم ۵'},
 {n:739,t:'#اتریوم لانگ<br>ورود ۳۰۰۰<br>حد ضرر ۲۸۵۰<br>تارگت ۳۳۰۰'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}">
 <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div>
 <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>`).join('')}</body></html>`;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
const fa=t=>String(t).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٬,]/g,'');
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:360,height:1000}});await p.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{try{S.feat.accordion=false;renderAll();}catch(e){}}));
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(4000);
 await p.evaluate(()=>{PRICES=new Map([['BTC',65000],['ETH',3000]]);
  SYMBOLS=new Set(PRICES.keys());SYMVER++;sigFilter='all';renderAll();});
 await p.waitForTimeout(500);
 const card=n=>`#list .card:nth-of-type(${n})`;
 const cardOf=async id=>p.evaluate(id=>[...document.querySelectorAll('#list .card')].findIndex(c=>c.innerHTML.includes(id)),id);
 const C=async sel=>p.evaluate(s=>{const c=[...document.querySelectorAll('#list .card')].find(c=>c.textContent.includes('BTC'));return c?[...c.querySelectorAll(s)].map(x=>x.value!==undefined&&x.tagName==='INPUT'?x.value:x.textContent.trim()):null;},sel);
 const btc=()=>p.evaluateHandle(()=>[...document.querySelectorAll('#list .card')].find(c=>c.querySelector('.brief,.plan')&&/740/.test(c.innerHTML)));

 console.log('=== کارت بسته ===');
 const cap=await p.evaluate(()=>S.cap);
 const chips=await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')].find(c=>/740/.test(c.innerHTML));
   return {chips:[...c.querySelectorAll('.amtb')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')),
     inp:c.querySelector('.amtin').value};});
 console.log('  ',JSON.stringify(chips),'cap=',cap);
 ok(chips.chips.some(x=>x.endsWith('*')&&+fa(x.replace(/[$*]/g,''))===cap),'پیش‌فرض تنظیمات روشن است');

 const clickIn=async(sel,idx)=>p.evaluate(([s,i])=>{const c=[...document.querySelectorAll('#list .card')].find(c=>/740/.test(c.innerHTML));c.querySelectorAll(s)[i].click();},[sel,idx]);
 const i100=chips.chips.findIndex(x=>x.startsWith('100'));
 await clickIn('.amtb',i100); await p.waitForTimeout(300);
 const a1=await p.evaluate(()=>({ov:OVERRIDE['c/1893051/740']?.amt}));
 ok(a1.ov===100,'زدن 100$ در override ذخیره شد ('+a1.ov+')');

 // مبلغ دستی
 await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')].find(c=>/740/.test(c.innerHTML));
   const i=c.querySelector('.amtin');i.value='37';i.dispatchEvent(new Event('change'));});
 await p.waitForTimeout(300);
 const a2=await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')].find(c=>/740/.test(c.innerHTML));
   return {ov:OVERRIDE['c/1893051/740']?.amt,on:c.querySelector('.amtin').classList.contains('on'),
    anyChip:!!c.querySelector('.amtb.on')};});
 ok(a2.ov===37&&a2.on&&!a2.anyChip,'مبلغ دستی 37 ثبت شد و کادر دستی روشن است');

 console.log('=== یک مرحله: کارت ← فرم ===');
 await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')].find(c=>/740/.test(c.innerHTML));
   [...c.querySelectorAll('.amtb')].find(b=>b.textContent.startsWith('100')).click();});
 await p.waitForTimeout(300);
 ok(!(await p.evaluate(()=>typeof PLANOPEN!=='undefined')),'ماشین‌حساب جدای کارت دیگر نیست');
 console.log('=== فرم «وارد شدم» ===');
 await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')].find(c=>/740/.test(c.innerHTML));
   [...c.querySelectorAll('.brief .acts .btn')].find(b=>/فرم کامل|بررسی و ورود/.test(b.textContent)).click();});
 await p.waitForTimeout(400);
 ok(await p.$eval('#f_m',e=>e.value)==='100','کادر مبلغ فرم با 100 پر شده');
 const sc=await p.$$eval('#amtBox .amtb',e=>e.map(x=>x.textContent+(x.classList.contains('on')?'*':'')));
 ok(sc.includes('100$*'),'چیپ 100 در فرم روشن است '+JSON.stringify(sc));
 await p.evaluate(()=>[...document.querySelectorAll('#amtBox .amtb')].find(b=>b.textContent.startsWith('50')).click());
 await p.waitForTimeout(200);
 ok(await p.$eval('#f_m',e=>e.value)==='50'&&await p.$eval('#r_m',e=>e.value)==='50','زدن 50 کادر و کشویی را عوض کرد');
 const prev=await p.$$eval('#prev .k',e=>e.map(k=>k.textContent));
 console.log('  ',JSON.stringify(prev));
 await p.fill('#f_m','73'); await p.waitForTimeout(200);
 ok(!(await p.$('#amtBox .amtb.on')),'مبلغ تایپ‌شده 73 هیچ چیپی را روشن نمی‌کند');
 await p.screenshot({path:require('./lib').out('amt_sheet.png')});
 await p.click('#ok'); await p.waitForTimeout(400);
 const pos=await p.evaluate(()=>DB.positions.map(x=>({t:x.ticker,m:x.margin,lev:x.lev})));
 ok(pos.length===1&&pos[0].m===73,'پوزیشن با 73$ ثبت شد '+JSON.stringify(pos));

 console.log('=== مبلغ چیپ روی کارت دوم ← فرم ===');
 await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')].find(c=>/739/.test(c.innerHTML));
   [...c.querySelectorAll('.amtb')].find(b=>b.textContent.startsWith('25')).click();});
 await p.waitForTimeout(300);
 await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')].find(c=>/739/.test(c.innerHTML));[...c.querySelectorAll('.acts .btn')].find(b=>/فرم کامل|بررسی و ورود/.test(b.textContent)).click();});
 await p.waitForTimeout(400);
 ok(+(await p.inputValue('#f_m'))===25,'فرم با مبلغ چیپ 25$ باز شد');
 await p.click('#ok'); await p.waitForTimeout(400);
 const pos2=await p.evaluate(()=>DB.positions.map(x=>({t:x.ticker,m:x.margin})));
 ok(pos2.some(x=>x.t==='ETH'&&x.m===25),'ورود با 25$ '+JSON.stringify(pos2));

 console.log('=== برگشت به پیش‌فرض ===');
 await p.evaluate(()=>{OVERRIDE['c/1893051/739']={amt:40};DB.overrides=OVERRIDE;save();PCACHE.clear();
   delete DB.decisions['c/1893051/739'];renderAll();});
 await p.waitForTimeout(300);
 await p.evaluate(cap=>{const c=[...document.querySelectorAll('#list .card')].find(c=>/739/.test(c.innerHTML));
   [...c.querySelectorAll('.amtb')].find(b=>b.textContent===String(cap)+'$').click();},cap);
 await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!OVERRIDE['c/1893051/739']||OVERRIDE['c/1893051/739'].amt==null),'انتخاب مبلغ پیش‌فرض، override را پاک کرد');
 // عرض صفحه
 const ov=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 ok(!ov,'در عرض 360 اسکرول افقی نیست');
 await p.evaluate(()=>{go('signals',true);window.scrollTo(0,0);});
 const eh=await p.evaluateHandle(()=>[...document.querySelectorAll('#list .card')].find(c=>/739/.test(c.innerHTML)));await eh.asElement().screenshot({path:require('./lib').out('amt_card.png')});
 await b.close();
})();
