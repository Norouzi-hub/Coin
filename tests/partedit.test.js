/* ویرایش قیمت خروج بخشی/پله‌ای: فهرست خروج‌ها روی کارت پوزیشن، «ویرایش قیمت» سود همان بخش را از نو حساب می‌کند (با برگرداندن) */
const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:1000}});
 const errs=[];let ans='0.07099';p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept(ans));
 await p.route('**',r=>{const u=r.request().url();if(u.includes('localhost:8899'))return r.continue();
   if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:'<html><body></body></html>'});return r.abort();});
 await p.addInitScript(()=>{localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[],settings:{}}));window.__startView='positions';});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms));
   S.feat.autoexec=false;S.fee=0;
   // همان S: پله‌ی 1 با نسخه‌ی قبلی روی تارگت 0.04725 ثبت شده بود
   const q={id:'s',ticker:'SSS',dir:'long',kind:'futures',entry:0.0249,stop:0.05938,stop0:0.01,margin:10,lev:10,openedAt:Date.now()-36e5,status:'open',targets:[],partials:[],log:[]};
   DB.positions.push(q);rebase(q);closePartAt(q,0.04725,1/3,'پله‌ی 1 نقشه');save();
   applyPrices(new Map([['SSS',0.07099],['ZZZ',1]]),'test','direct',1);go('positions',true);POSOPEN.add('s');renderAll();await W(300);
   const card=document.getElementById('pos-s'),row=card&&card.querySelector('.partr');
   const o={row:row?row.textContent:'',pnl0:+q.partials[0].pnl.toFixed(2)};
   row.querySelector('button').click();await W(300);
   o.pnl1=+q.partials[0].pnl.toFixed(2);o.px1=q.partials[0].price;o.log=q.log.some(l=>/قیمت خروج بخش 1 از/.test(l.t));
   o.row2=(document.querySelector('#pos-s .partr')||{}).textContent||'';
   const u=document.querySelector('#toast .tundo');if(u){u.click();await W(300);}
   const q2=DB.positions.find(x=>x.id==='s');o.undo=q2.partials[0].price;
   return o;});
 console.log('   ',JSON.stringify(r));
 ok(/33٪ روی 0.04725/.test(r.row)&&/ویرایش قیمت/.test(r.row)&&r.pnl0>29.8&&r.pnl0<30.1,'کارت: «1. 33٪ روی 0.04725 … $29.9 · ویرایش قیمت»');
 ok(r.px1===0.07099&&r.pnl1>61.5&&r.pnl1<61.9&&r.log&&/0.07099/.test(r.row2),'بعد از ویرایش به 0.07099: سود همان بخش ≈ $61.7 و در تاریخچه ثبت شد');
 ok(r.undo===0.04725,'«برگرداندن» قیمت قبلی را برمی‌گرداند');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
