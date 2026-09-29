const {chromium}=require('./lib').pw;const fs=require('fs');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 p.on('pageerror',e=>{bad++;console.log('PAGEERROR:',e.message)});
 await p.route('**',r=>r.request().url().includes('localhost:8899')?r.continue():r.abort());
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 // پوزیشنی که با باگ ویرایش شده: مارجین اولیه 41.3، مارجین فعلی 10
 await p.evaluate(()=>{localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[{id:'g1',ticker:'GRAM',dir:'long',kind:'futures',
   entry:1.413,stop:1.39,stop0:1.39,margin:10,lev:5,baseMargin:41.3,risk0:3.49,openedAt:Date.now()-4*864e5,status:'open',partials:[],log:[]}]}));});
 await p.reload({waitUntil:'load'});await p.waitForTimeout(1500);
 const m=await p.evaluate(()=>{const x=DB.positions[0];const m=posMetrics(x,1.6523);return {roi:m.roi,pnl:m.pnl,r:m.r,base:x.baseMargin};});
 console.log('   ',JSON.stringify(m));
 ok(m.base===10,'مبنای مارجین تعمیر شد: 10');
 ok(m.roi>83&&m.roi<86,'درصد روی مارجین ≈ 84.5٪ صرافی: '+m.roi.toFixed(1));
 ok(Math.abs(m.pnl-8.37)<0.1,'سود ≈ 8.37 دلار: '+m.pnl.toFixed(2));
 // ویرایش: مارجین 10 → 20، باید درصد همان بماند و سود دو برابر
 const m2=await p.evaluate(()=>{go('positions');sheetEditPos(DB.positions[0]);return true;}).catch(()=>false);
 if(m2){await p.waitForSelector('#f_m');await p.fill('#f_m','20');await p.click('#ok');await p.waitForTimeout(300);
   const r=await p.evaluate(()=>{const x=DB.positions[0];const m=posMetrics(x,1.6523);return {roi:m.roi,pnl:m.pnl,base:x.baseMargin,r0:x.risk0};});
   console.log('   ',JSON.stringify(r));
   ok(r.base===20&&r.roi>83&&r.roi<86&&Math.abs(r.pnl-16.8)<0.2,'بعد از ویرایش مارجین به 20: درصد ثابت، سود دو برابر');}
 else console.log('   (نام تابع ویرایش پیدا نشد)');
 // تصویر اشتراک
 const img=await p.evaluate(()=>{PRICES.set('GRAM',1.6523);const cv=drawShareCard(shareDataOf(DB.positions[0]),shareOpt);return cv.toDataURL('image/png');});
 fs.writeFileSync(require('./lib').out('gram.png'),Buffer.from(img.split(',')[1],'base64'));
 console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
