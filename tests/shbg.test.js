const {chromium}=require('./lib').pw;const fs=require('fs');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 p.on('pageerror',e=>{bad++;console.log('PAGEERROR:',e.message)});
 await p.route('**',r=>r.request().url().includes('localhost:8899')?r.continue():r.abort());
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.evaluate(()=>{localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[{id:'g1',ticker:'GRAM',dir:'long',kind:'futures',
   entry:1.413,stop:1.39,stop0:1.39,margin:10,lev:5,baseMargin:10,openedAt:Date.now()-4*864e5-3*36e5,status:'open',partials:[],log:[]}]}));});
 await p.reload({waitUntil:'load'});await p.waitForTimeout(1500);
 await p.evaluate(async()=>{await document.fonts.load("900 40px 'Vazirmatn'");PRICES.set('GRAM',1.6523);});
 const save=async(name)=>{const d=await p.evaluate(()=>drawShareCard(shareDataOf(DB.positions[0]),shareOpt).toDataURL('image/png'));
   fs.writeFileSync(require('./lib').out('')+name,Buffer.from(d.split(',')[1],'base64'));};
 await save('card_plain.png');
 // یک عکس روشن و شلوغ به‌عنوان بدترین حالت
 const png=await p.evaluate(()=>{const cv=document.createElement('canvas');cv.width=900;cv.height=1200;const c=cv.getContext('2d');
   for(let i=0;i<40;i++){c.fillStyle='hsl('+(i*37)+',90%,'+(55+i%3*15)+'%)';c.fillRect((i*97)%900,(i*131)%1200,300,260);}
   c.fillStyle='#fff';c.fillRect(300,400,300,300);return cv.toDataURL('image/png');});
 fs.writeFileSync(require('./lib').out('bright.png'),Buffer.from(png.split(',')[1],'base64'));
 await p.evaluate(()=>{go('positions');});await p.waitForTimeout(200);
 await p.evaluate(()=>sheetShare(DB.positions[0]));await p.waitForSelector('#shBgSel .mktb');
 const chips=await p.$$eval('#shBgSel .mktb',e=>e.map(x=>x.textContent+(x.classList.contains('on')?'*':'')));
 ok(chips.join()==='ساده*,عکس من…','پیش‌فرض ساده: '+chips);
 await p.setInputFiles('#shBgFile',require('./lib').out('bright.png'));await p.waitForTimeout(800);
 const st=await p.evaluate(()=>({on:shareOpt.bgOn,img:!!SHBG.img,stored:!!localStorage.getItem('signaldesk.sharebg.v1'),row:!document.querySelector('#shBgRow').classList.contains('hide')}));
 ok(st.on&&st.img&&st.stored&&st.row,'عکس گذاشته شد، ذخیره شد، کنترل تیرگی پیدا شد');
 await save('card_bg.png');
 await p.screenshot({path:require('./lib').out('shsheet.png')});
 await p.evaluate(()=>{shareOpt.bgDim=.3;});await save('card_bg30.png');
 // ساده برگردد
 await p.$$eval('#shBgSel .mktb',e=>e[0].click());await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!shareOpt.bgOn),'«ساده» عکس را خاموش می‌کند');
 // بعد از بارگذاری دوباره: عکس هنوز هست
 await p.reload({waitUntil:'load'});await p.waitForTimeout(1200);
 await p.evaluate(()=>{shareOpt.bgOn=true;return shBgLoad();});
 ok(await p.evaluate(()=>!!SHBG.img),'عکس بعد از بارگذاری دوباره برمی‌گردد');
 // کارت کارنامه هم
 await p.evaluate(async()=>{await document.fonts.load("900 40px 'Vazirmatn'");});
 const d=await p.evaluate(()=>drawSummaryCard({n:12,wins:8,losses:4,winRate:66.7,pf:2.1,avgR:.8,totalR:9.6,pnl:42.5},'مهر',shareOpt).toDataURL('image/png'));
 fs.writeFileSync(require('./lib').out('sum_bg.png'),Buffer.from(d.split(',')[1],'base64'));
 console.log(bad?'✗'+bad:'✔ همه درست');await b.close();})();
