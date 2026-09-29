const {chromium}=require('./lib').pw;
const html='<html><body><div class="tgme_widget_message" data-post="c/1/1"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">سلام</div><time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div></body></html>';
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 // سه خرید اسپات قدیمی + یک پوزیشن فیوچرز
 await p.evaluate(()=>{
   localStorage.setItem('signaldesk.v1',JSON.stringify({
     positions:[{id:'f1',ticker:'BTC',dir:'long',entry:60000,stop:59000,margin:10,lev:5,
       status:'closed',exitPrice:62000,openedAt:1,closedAt:2,targets:[],fees:0.5}],
     spot:[{id:'s1',ticker:'SOL',qty:2,buy:150,note:'بلندمدت',at:1000},
           {id:'s2',ticker:'ETH',qty:0.5,buy:3000,note:'',at:2000},
           {id:'s3',ticker:'XX',qty:0,buy:0,note:'خراب',at:3000}],
     decisions:{},overrides:{},lessons:{},archived:{},pending:[],watch:[]}));});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.waitForTimeout(4000);
 await p.evaluate(()=>{PRICES=new Map([['SOL',178],['ETH',3300],['BTC',60000]]);
   SYMBOLS=new Set(PRICES.keys());SYMVER++;renderAll();});
 await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{
   const sp=DB.positions.filter(x=>x.kind==='spot');
   return {spotArr:DB.spot.length,n:DB.positions.length,
     spots:sp.map(x=>({t:x.ticker,m:x.margin,e:x.entry,lev:x.lev,kind:x.kind,
       qty:+(posMetrics(x,PRICES.get(x.ticker)).qty.toFixed(6)),
       pnl:+(posMetrics(x,PRICES.get(x.ticker)).pnl||0).toFixed(2)})),
     stored:JSON.parse(localStorage.getItem('signaldesk.v1')).spot.length};});
 console.log('=== مهاجرت ===');
 console.log('  پوزیشن‌ها:',r.n,'· اسپات‌ها:',JSON.stringify(r.spots));
 ok(r.spotArr===0&&r.stored===0,'فهرست قدیمی خالی و ذخیره شد');
 ok(r.n===3,'۱ فیوچرز + ۲ اسپات سالم (رکورد خراب رد شد)');
 const sol=r.spots.find(x=>x.t==='SOL');
 ok(sol&&sol.m===300&&sol.qty===2,'SOL: ۲ واحد، $۳۰۰ — مقدار حفظ شد');
 ok(sol&&Math.abs(sol.pnl-(2*28-300*0.001))<0.01,'سود SOL درست حساب شد: '+sol.pnl);
 const eth=r.spots.find(x=>x.t==='ETH');
 ok(eth&&eth.m===1500&&eth.qty===0.5,'ETH: ۰٫۵ واحد، $۱۵۰۰');
 // بار دوم نباید دوباره مهاجرت کند
 await p.reload({waitUntil:'load'});await p.waitForTimeout(4500);
 ok(await p.evaluate(()=>DB.positions.length)===3,'بار دوم تکراری نمی‌سازد');
 // اسپات در کارنامه هم دیده می‌شود
 const rep=await p.evaluate(()=>{
   const s=DB.positions.filter(x=>x.kind==='spot')[0];s.status='closed';s.exitPrice=178;s.closedAt=Date.now();s.fees=0.3;
   save();go('report');return document.querySelector('#repBody').textContent.replace(/\s+/g,' ').slice(0,80);});
 await p.waitForTimeout(500);
 console.log('  کارنامه:',rep);
 ok(/SOL|تصویر کلی/.test(rep),'خرید اسپاتِ بسته‌شده وارد کارنامه شد');
 await b.close();})();
