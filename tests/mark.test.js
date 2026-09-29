const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 let fapi=0;
 await p.route('**',r=>{const u=r.request().url();const H={'content-type':'application/json','access-control-allow-origin':'*'};
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('fapi.binance.com/fapi/v1/premiumIndex')){fapi++;return r.fulfill({status:200,headers:H,body:JSON.stringify(
    [{symbol:'BTCUSDT',markPrice:'89.5'},{symbol:'1000PEPEUSDT',markPrice:'0.012'}].concat(Array.from({length:30},(_,i)=>({symbol:'Z'+i+'USDT',markPrice:'1'}))))});}
  if(u.includes('api.binance.com/api/v3/ticker/price'))return r.fulfill({status:200,headers:H,body:JSON.stringify(
    [{symbol:'BTCUSDT',price:'90.5'},{symbol:'ETHUSDT',price:'100'},{symbol:'PEPEUSDT',price:'0.0000125'}].concat(Array.from({length:40},(_,i)=>({symbol:'Z'+i+'USDT',price:'1'}))))});
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:'<html></html>'});
  return r.abort();});
 await p.addInitScript(()=>localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[
   {id:'f',ticker:'BTC',dir:'long',kind:'futures',entry:100,stop:90,margin:10,lev:5,openedAt:Date.now()-60000,status:'open',targets:[],partials:[],log:[]},
   {id:'s',ticker:'BTC',dir:'long',kind:'spot',entry:100,stop:90,margin:10,lev:1,openedAt:Date.now()-60000,status:'open',targets:[],partials:[],log:[]}],settings:{feat:{autoexec:true}}})));
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(4000);
 const r=await p.evaluate(()=>({mk:MARK.get('BTC'),pepe:MARK.get('PEPE'),f:DB.positions.find(x=>x.id==='f'),s:DB.positions.find(x=>x.id==='s'),mark:H.px.mark}));
 ok(fapi>=1&&r.mk===89.5,'مارک پرایس از بایننس فیوچرز گرفته شد');
 ok(Math.abs(r.pepe-0.000012)<1e-12,'1000PEPE ← PEPE تقسیم بر هزار');
 ok(r.f.status==='closed'&&Math.abs(r.f.exitPrice-90*(1-0.0005))<1e-9,'فیوچرز: مارک 89.5 زیر استاپ 90 ← بسته شد (اسپات 90.5 بود)');
 ok(r.s.status==='open','اسپات: با قیمت اسپات 90.5 باز ماند');
 await p.evaluate(()=>{posFilter='all';POSOPEN.add('f');POSOPEN.add('s');go('positions',true);renderAll();});
 await p.evaluate(()=>{const f=DB.positions.find(x=>x.id==='f');f.status='open';f.exitPrice=null;f.autoOff=true;save();renderAll();});
 const lab=await p.evaluate(()=>[...document.querySelectorAll('.pnlhero .side .lab')].map(x=>x.textContent).join('|'));
 ok(lab.includes('مارک پرایس')&&lab.includes('قیمت الان'),'روی کارت: «مارک پرایس» برای فیوچرز، «قیمت الان» برای اسپات — '+lab);
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
