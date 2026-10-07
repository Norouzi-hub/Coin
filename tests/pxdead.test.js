/* نماد حذف‌شده از اسپات بایننس (مثل XMR): قیمت یخ‌زده کنار می‌رود و از صرافی دیگر گرفته می‌شود */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed,NOW}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const J=(r,x)=>r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(x)});
 const now=Date.now();let one=0;
 await ctx.route('**/api.binance.com/api/v3/ticker/price',r=>J(r,['BTC','ETH','SOL','XRP','GRAM'].map(s=>({symbol:s+'USDT',price:'100'}))
   .concat([{symbol:'XMRUSDT',price:'118.7'},{symbol:'DEADXUSDT',price:'5'}],Array.from({length:30},(_,i)=>({symbol:'Z'+i+'USDT',price:'1'})))));
 await ctx.route('**/ticker/24hr**',r=>J(r,Array.from({length:120},(_,i)=>({symbol:'Z'+i+'USDT',count:50,closeTime:now,quoteVolume:'1000'}))
   .concat([{symbol:'XMRUSDT',count:0,closeTime:Date.parse('2024-02-20'),quoteVolume:'0'},{symbol:'DEADXUSDT',count:0,closeTime:now-5*864e5,quoteVolume:'0'},{symbol:'BTCUSDT',count:9e5,closeTime:now,quoteVolume:'9e9'}])));
 await ctx.route('**/api.mexc.com/api/v3/ticker/price?symbol=XMRUSDT',r=>{one++;return J(r,{symbol:'XMRUSDT',price:'331.5'});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);
 await p.addInitScript(()=>{const db=JSON.parse(localStorage.getItem('signaldesk.v1'));const H=36e5,n=Date.now();
   db.positions.push({id:'px1',ticker:'XMR',dir:'long',kind:'futures',entry:330,stop:320,stop0:320,margin:10,lev:5,baseMargin:10,openedAt:n-2*H,status:'open',targets:[350],partials:[],log:[]});
   localStorage.setItem('signaldesk.v1',JSON.stringify(db));localStorage.removeItem('signaldesk.pxdead.v1');});
 await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3500);
 const r=await p.evaluate(async()=>{PXFILL.clear();await loadPrices(true);
   const pos=DB.positions.find(x=>x.id==='px1');
   return {xmr:PRICES.get('XMR'),dead:PRICES.get('DEADX'),sym:SYMBOLS.has('XMR')&&SYMBOLS.has('DEADX'),list:PXDEAD.list,btc:PRICES.get('BTC'),st:pos.status};});
 console.log('   ',JSON.stringify(r),'mexc:',one);
 ok(r.list.includes('XMR')&&r.list.includes('DEADX')&&!r.list.includes('BTC')&&!r.list.includes('Z1'),'فهرست نمادهای مرده از ticker/24hr: '+r.list.join(','));
 ok(r.xmr===331.5&&one>=1,'XMR (پوزیشن باز) از MEXC: 331.5، نه قیمت یخ‌زده‌ی 118.7');
 ok(r.dead==null&&r.sym,'نماد مرده‌ای که لازم نیست قیمت ندارد ولی در فهرست نمادها می‌ماند');
 ok(r.st==='open'&&r.btc===100,'پوزیشن XMR با قیمت غلط بسته نشد؛ بقیه دست‌نخورده');
 // سپر دوم: مارک پرایس تازه و قیمت اسپاتِ خیلی متفاوت
 const g=await p.evaluate(()=>{MARK=new Map([['SOL',150]]);MARK_AT=Date.now();const m=new Map(PRICES);m.set('SOL',60);
   applyPrices(m,'تست',null,1);return PRICES.get('SOL');});
 ok(g===150,'قیمت اسپاتی که بیش از 20٪ با مارک پرایس فرق دارد ← مارک ('+g+')');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
