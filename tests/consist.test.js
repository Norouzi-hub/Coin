const {chromium}=require('./lib').pw;
const posts=[];
for(let i=0;i<9;i++)posts.push({n:900-i,
  t:i%3===0?`#بیت_کوین لانگ<br>ورود ${60000+i}<br>حد ضرر ${59000+i}`
   :i%3===1?`تارگت ${i} زده شد ✅`:`یادداشت ${i}`});
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}">
 <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div>
 <time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>`).join('')}</body></html>`;
const num=t=>Number(String(t).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.waitForTimeout(4000);
 await p.evaluate(()=>{PRICES=new Map([['BTC',60500]]);SYMBOLS=new Set(['BTC']);SYMVER++;renderAll();});
 await p.waitForTimeout(400);
 const read=()=>p.evaluate(()=>{
   const sc=[...document.querySelectorAll('#status .sc')].map(x=>x.textContent.trim());
   const fb=[...document.querySelectorAll('#fbar .fb:not(.fday)')].map(x=>
     x.querySelector('span').textContent.trim()+'='+x.querySelector('i').textContent);
   return {status:sc,fbar:fb,tab:document.querySelector('#cSig').textContent};});
 console.log('=== قبل از آرشیو ===');
 let r=await read();
 console.log('  نوار وضعیت:',r.status.slice(0,3).join(' · '));
 console.log('  نوار فیلتر:',r.fbar.join(' · '));
 console.log('  نشان تب   :',r.tab);
 // یک سیگنال را آرشیو کن
 await p.evaluate(()=>{const s=POSTS.find(x=>sigOf(x).isSignal);setArch(s.id,true);});
 await p.waitForTimeout(500);
 console.log('\n=== بعد از آرشیو کردن یک سیگنال ===');
 r=await read();
 console.log('  نوار وضعیت:',r.status.slice(0,3).join(' · '));
 console.log('  نوار فیلتر:',r.fbar.join(' · '));
 console.log('  نشان تب   :',r.tab);
 // شمارنده‌های پست/سیگنال از نوار وضعیت برداشته شدند تا اصلاً دو جا نوشته نشوند
 const dupe=r.status.some(x=>/^(پست|سیگنال|تصمیم‌نگرفته)\s/.test(x));
 console.log('\n ',dupe?'❌ هنوز در نوار وضعیت تکرار می‌شود':'✅ فقط یک جا شمرده می‌شود');
 const badge=num(r.tab), fSig=num(r.fbar[0].split('=')[1]);
 console.log(' ',badge===fSig?'✅ نشان تب با نوار فیلتر یکی است':'❌ نشان تب '+badge+' ولی نوار '+fSig);
 await b.close();})();
