const {chromium} = require('./lib').pw;
const posts=[
 {n:740,t:'#بیت_کوین لانگ<br>ورود ۶۵۰۰۰<br>حد ضرر ۶۳۵۰۰<br>تارگت ۶۹۰۰۰<br>اهرم ۵'},
 {n:739,t:'#اتریوم لانگ<br>ورود ۳۰۰۰<br>حد ضرر ۲۷۰۰<br>تارگت ۳۳۰۰'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div><time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>`).join('')}</body></html>`;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:1100}});await p.addInitScript(()=>addEventListener('DOMContentLoaded',()=>{try{S.feat.accordion=false;renderAll();}catch(e){}}));
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(3500);
 await p.evaluate(()=>{PRICES=new Map([['BTC',65000],['ETH',3000]]);SYMBOLS=new Set(PRICES.keys());SYMVER++;sigFilter='all';renderAll();});
 await p.waitForTimeout(300);
 const open=async n=>{await p.evaluate(n=>[...document.querySelectorAll('#list .card')].find(c=>c.dataset.id.endsWith('/'+n)).querySelector('.brief .btn.ok').click(),n);await p.waitForTimeout(500);};
 // یک مرحله
 await open(739);
 ok(!!(await p.$('#levRow .levtrack')),'«بررسی و ورود» مستقیم فرم ورود را باز کرد');
 const s1=await p.evaluate(()=>({auto:document.getElementById('f_auto').checked,lev:document.getElementById('f_l').value,
   dis:document.getElementById('r_l').disabled,safe:document.getElementById('r_l').style.getPropertyValue('--safe'),
   ticks:[...document.querySelectorAll('#levTicks i')].map(x=>x.textContent),
   pv:[...document.querySelectorAll('#prev .k')].map(k=>k.textContent)}));
 console.log('  ',JSON.stringify(s1));
 ok(s1.auto&&s1.dis&&parseFloat(s1.lev)>0,'بدون اهرم کانال: خودکار روشن، اهرم حساب شد ('+s1.lev+'x)');
 ok(s1.safe&&s1.ticks.some(t=>t.startsWith('امن تا')),'نوار ناحیه‌ی امن و برچسب «امن تا …x»');
 ok(s1.pv.some(t=>t.startsWith('تارگت 1')),'سود تارگت در همان فرم');
 await p.screenshot({path:require('./lib').out('lev_auto.png')});
 // خاموش کردن خودکار و کشیدن
 await p.click('#autoRow');await p.waitForTimeout(200);
 ok(!(await p.$eval('#f_auto',e=>e.checked))&&!(await p.$eval('#r_l',e=>e.disabled)),'کلید «خودکار» خاموش شد و دستگیره آزاد است');
 await p.$eval('#r_l',e=>{e.value=9;e.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(200);
 const s2=await p.evaluate(()=>({lev:document.getElementById('f_l').value,val:document.getElementById('r_l').style.getPropertyValue('--val'),warn:document.getElementById('riskBox').textContent}));
 ok(s2.lev==='9','کشیدن دستگیره اهرم را 9 کرد');
 ok(/لیکوئید/.test(s2.warn),'بالای حد امن هشدار لیکوئید آمد');
 await p.screenshot({path:require('./lib').out('lev_manual.png')});
 await p.click('#cx');await p.waitForTimeout(300);
 // اهرم کانال
 await open(740);
 const s3=await p.evaluate(()=>({auto:document.getElementById('f_auto').checked,lev:document.getElementById('f_l').value}));
 ok(!s3.auto&&s3.lev==='5','اهرم 5 کانال دستی نشست، خودکار خاموش');
 await p.click('#ok');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>DB.positions.some(x=>x.ticker==='BTC'&&x.lev===5)),'پوزیشن با اهرم 5 ثبت شد — بدون مرحله‌ی دوم');
 await b.close();
})();
