const {chromium}=require('./lib').pw;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
const post=(id,t)=>`<div class="tgme_widget_message" data-post="${id}"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${t}</div><time datetime="${new Date().toISOString()}"></time></div></div>`;
const LYRIC='🎶 Küstürme kalbimi bir hüzünlü vedayla<br>Bir sorsan halimi daha da dibe batmaz';
let mode='mixed';
const page=()=>'<html><body>'+(
  mode==='mixed'?post('ccoineres/120','#بیت_کوین لانگ ورود ۶۰۰۰۰ حد ضرر ۵۹۰۰۰')+post('turkmuzik/88',LYRIC)+post('ccoineres/119','یادداشت')
 :mode==='foreign'?post('turkmuzik/90',LYRIC)+post('turkmuzik/89','Aldırmıyor gönül')
 :post('ccoineres/121','پست تازه‌ی کانال'))+'</body></html>';
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:page()});
  return r.abort();});
 // ۱) کشی که از قبل یک پستِ کانال دیگر در خودش دارد (همان وضعیت گوشی)
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.evaluate(L=>localStorage.setItem('signaldesk.cache.v2:ccoineres',JSON.stringify({v:2,at:Date.now(),posts:[
   {id:'ccoineres/110',num:110,text:'پست واقعی کانال',date:Date.now()-3600000,link:'https://t.me/ccoineres/110'},
   {id:'turkmuzik/77',num:77,text:L,date:Date.now()-1800000,link:'https://t.me/turkmuzik/77'},
   {id:'c/1893051/105',num:105,text:'شکل عددی شناسه',date:Date.now()-7200000,link:'x'}]})),LYRIC);
 mode='ours';
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.waitForTimeout(4500);
 let r=await p.evaluate(()=>({ids:POSTS.map(x=>x.id),log:LOG.filter(l=>/کانال دیگر/.test(l.msg||l.m||JSON.stringify(l))).map(l=>l.msg||l.m||'').slice(-2),
   cache:JSON.parse(localStorage.getItem('signaldesk.cache.v2:ccoineres')).posts.map(x=>x.id)}));
 console.log('=== ۱) کشِ آلوده ===');console.log('  پست‌ها:',r.ids.join('، '));console.log('  گزارش:',r.log.join(' | '));
 ok(!r.ids.includes('turkmuzik/77'),'پستِ کانال دیگر از فهرست پاک شد');
 ok(!r.cache.includes('turkmuzik/77'),'از حافظه‌ی ذخیره‌شده هم پاک شد');
 ok(r.ids.includes('ccoineres/110')&&r.ids.includes('c/1893051/105'),'پست‌های خودِ کانال (هر دو شکل شناسه) ماندند');
 ok(r.log.length>0,'در گزارش رخدادها ثبت شد که چه پاک شد');

 console.log('\n=== ۲) صفحه‌ی مخلوط ===');
 mode='mixed';await p.evaluate(()=>refresh(false,true));await p.waitForTimeout(2500);
 r=await p.evaluate(()=>({ids:POSTS.map(x=>x.id),log:(LOG.slice(-6).map(l=>l.msg||l.m||'')).filter(x=>/کانال دیگر/.test(x))}));
 ok(r.ids.includes('ccoineres/120')&&!r.ids.includes('turkmuzik/88'),'پست خودی آمد، پست غریبه کنار گذاشته شد');
 console.log('  گزارش:',r.log.join(' | '));

 console.log('\n=== ۳) واسطی که کلِ صفحه‌ی کانال دیگر را پس می‌دهد ===');
 mode='foreign';const before=await p.evaluate(()=>POSTS.length);
 await p.evaluate(()=>refresh(false,true));await p.waitForTimeout(3000);
 r=await p.evaluate(()=>({n:POSTS.length,ids:POSTS.map(x=>x.id),st:H.tg.state}));
 ok(r.n===before&&!r.ids.some(x=>x.startsWith('turkmuzik')),'هیچ پستی از آن صفحه وارد نشد');
 ok(r.st==='err','آن جواب «ناموفق» حساب شد، نه «کانال آمد»');
 await b.close();})();
