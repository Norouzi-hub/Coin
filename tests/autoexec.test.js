const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
const NOW=Date.now();
// BTC: همیشه 100، فقط یک کندل حدود 60 دقیقه پیش تا 85 پایین رفته
const kl=(sym,iv,st,lim)=>{const ms={'5m':3e5,'1h':36e5}[iv],out=[];
  for(let t=st;t<Date.now()&&out.length<lim;t+=ms){let h=101,l=99;
    if(sym==='BTC'&&t<=NOW-60*6e4&&t+ms>NOW-60*6e4)l=85;
    if(sym==='DOGE'&&t<=NOW-90*6e4&&t+ms>NOW-90*6e4){h=112;}          // تارگت 1 نود دقیقه پیش
    if(sym==='DOGE'&&t<=NOW-30*6e4&&t+ms>NOW-30*6e4){l=99.5;}         // برگشت به ورودِ جابه‌جاشده
    out.push([t,'100',String(h),String(l),'100','1',t+ms-1]);}
  return out;};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});
 const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERROR:',e.message);});p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:'<html><body></body></html>'});
  const m=u.match(/api\.binance\.com.*klines\?symbol=([A-Z]+)USDT&interval=(\w+)&startTime=(\d+)&limit=(\d+)/);
  if(m)return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(kl(m[1],m[2],+m[3],+m[4]))});
  return r.abort();});
 await p.addInitScript(()=>{localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[],settings:{}}));});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(2500);
 const mk=`(id,tk,o)=>{const p=Object.assign({id,ticker:tk,dir:'long',kind:'futures',entry:100,stop:90,margin:10,lev:5,openedAt:Date.now()-60000,status:'open',targets:[110,120,130],partials:[],log:[]},o||{});
   DB.positions.push(p);if(o&&o.pb)pbAttach(p,o.pb);return p;}`;
 const px=async m=>{await p.evaluate(m=>applyPrices(new Map(m.concat([['ZZZ',1]])),'test','direct',1),m);await p.waitForTimeout(300);};
 const P=id=>p.evaluate(id=>{const x=DB.positions.find(q=>q.id===id);return x&&JSON.parse(JSON.stringify(x));},id);

 console.log('=== تارگت و استاپ با قیمت زنده ===');
 await p.evaluate(mk=>{const m=eval(mk);S.feat.autoexec=true;S.exitPb='bal';S.slip=0;
   m('a','AAA',{pb:'bal'});m('b','BBB',{pb:'bal'});m('c','CCC',{dir:'short',stop:110,targets:[]});m('d','DDD',{stop:null,lev:20,targets:[]});
   m('e','EEE',{pb:'bal'});save();renderAll();},mk);
 await px([['AAA',111],['BBB',100],['CCC',100],['DDD',100],['EEE',100]]);
 let a=await P('a');
 ok(a.status==='open'&&a.pbc===1&&Math.abs(a.margin-5)<1e-9,'تارگت 1: نصف بسته شد (مارجین 10 ← 5) — '+a.margin);
 ok(a.stop===100,'طبق نقشه‌ی متعادل، استاپ روی ورود آمد — '+a.stop);
 ok(a.partials.length===1&&a.partials[0].price===110,'قیمت بستن = خود تارگت 110، نه قیمت لحظه');
 ok(a.log.some(l=>l.t.startsWith('خودکار: پله‌ی')),'در تاریخچه با «خودکار» ثبت شد');
 let t=await p.evaluate(()=>({t:document.querySelector('#toast').textContent,u:!!document.querySelector('#toast .tundo')}));
 ok(t.u&&t.t.includes('AAA')&&t.t.includes('پله‌ی'),'پیغام با دکمه‌ی برگرداندن: '+t.t);
 await px([['AAA',99],['BBB',125],['CCC',100],['DDD',100],['EEE',100]]);
 a=await P('a');
 ok(a.status==='closed'&&a.exitPrice===100&&a.autoBy==='stop','برگشت زیر ورود: باقی‌مانده روی استاپِ جابه‌جاشده (100) بسته شد');
 const bb=await P('b');
 ok(bb.pbc===2&&bb.partials.length===2&&bb.partials[0].price===110&&bb.partials[1].price===120,'دو پله با هم (قیمت 125): 50٪ روی 110 و 50٪ روی 120');
 ok(bb.status==='closed'&&bb.autoBy==='tp'&&bb.exitPrice===120,'متعادل با سه تارگت: بعد از پله‌ی 2 چیزی نمانده، «بسته با نقشه»');
 await px([['CCC',111],['DDD',100],['EEE',100]]);
 const c=await P('c');
 ok(c.status==='closed'&&c.exitPrice===110&&c.autoBy==='stop','شورت بدون نقشه: استاپ 110 خورد و بسته شد');
 const cm=await p.evaluate(()=>{const x=DB.positions.find(q=>q.id==='c');return posMetrics(x);});
 ok(Math.abs(cm.pnl-(-5-0.05))<1e-6,'سود/ضرر شورت: −5 دلار − کارمزد = '+cm.pnl.toFixed(3));
 console.log('=== لیکوئید ===');
 await px([['DDD',90],['EEE',100]]);
 const d=await P('d');
 const liq=await p.evaluate(()=>posMetrics(DB.positions.find(q=>q.id==='d')).liqPrice);
 ok(d.status==='closed'&&d.autoBy==='liq'&&Math.abs(d.exitPrice-liq)<1e-9,'بدون استاپ، اهرم 20: روی قیمت لیکوئید ('+liq.toFixed(2)+') بسته شد');

 console.log('=== برگرداندن ===');
 await px([['EEE',111]]);
 ok((await P('e')).pbc===1,'EEE پله‌ی 1 را خورد');
 await p.evaluate(()=>document.querySelector('#toast .tundo').click());await p.waitForTimeout(300);
 let e=await P('e');
 ok(e.pbc===0&&e.margin===10&&e.stop===90&&e.autoOff===true,'برگرداندن: همه‌چیز سر جایش و اجرای خودکارِ این پوزیشن خاموش');
 await px([['EEE',112]]);
 e=await P('e');
 ok(e.pbc===0,'قیمت بعدی دوباره اجرایش نکرد');
 await p.evaluate(()=>{POSOPEN.add('e');go('positions',true);renderAll();});await p.waitForTimeout(300);
 const row=await p.evaluate(()=>{const c=[...document.querySelectorAll('.card')].find(c=>c.textContent.includes('EEE'));const r=c&&c.querySelector('.autorow');return r&&r.textContent;});
 ok(row&&row.includes('خاموش')&&row.includes('روشن کن'),'روی کارت: «اجرای خودکار خاموش · روشن کن»');
 await p.evaluate(()=>[...document.querySelectorAll('.card')].find(c=>c.textContent.includes('EEE')).querySelector('.autorow .mark').click());
 await p.waitForTimeout(300);
 e=await P('e');
 ok(!e.autoOff&&e.pbc===1,'روشن کردن دوباره: همان لحظه با قیمت فعلی پله‌ی 1 اجرا شد');
 const pill=await p.evaluate(()=>{posFilter='all';renderAll();const c=[...document.querySelectorAll('.card')].find(c=>c.textContent.includes('AAA'));return c&&c.querySelector('.chead').textContent;});
 ok(pill&&pill.includes('استاپ خودکار'),'کارت بسته: برچسب «استاپ خودکار»');

 console.log('=== خاموش در تنظیمات ===');
 await p.evaluate(mk=>{const m=eval(mk);S.feat.autoexec=false;m('f','FFF',{pb:'bal'});},mk);
 await px([['FFF',80]]);
 ok((await P('f')).status==='open','کلید کلی خاموش: کاری نکرد (فقط هشدار)');
 await p.evaluate(()=>{S.feat.autoexec=true;});

 console.log('=== وقتی برنامه بسته بود (کندل) ===');
 await p.evaluate(mk=>{const m=eval(mk);
   m('g','BTC',{openedAt:Date.now()-3*36e5,targets:[]});                   // یک ساعت پیش تا 85 رفت
   m('h','DOGE',{openedAt:Date.now()-3*36e5,pb:'bal'});                     // تارگت 1 و بعد برگشت به ورود
   m('i','XRP',{openedAt:Date.now()-3*36e5,pb:'bal'});                      // هیچ اتفاقی
   save();},mk);
 await px([['BTC',100],['DOGE',100],['XRP',100]]);
 await p.waitForTimeout(1500);
 const g=await P('g'), h=await P('h'), i=await P('i');
 ok(g.status==='closed'&&g.exitPrice===90&&g.closedAt<Date.now()-50*6e4,'BTC: استاپی که یک ساعت پیش خورده بود پیدا شد، زمان بستن همان موقع — '+new Date(g.closedAt).toISOString().slice(11,16));
 ok(h.status==='closed'&&h.partials.length===1&&h.exitPrice===100&&h.log.filter(l=>l.t.startsWith('خودکار')).length>=3,'DOGE: پله 1 (نصف روی 110، استاپ به ورود) و بعد استاپِ ورود — به ترتیب');
 ok(i.status==='open'&&i.pbc===0,'XRP: چیزی نخورده، باز ماند');
 const seen=await p.evaluate(()=>AUTOSEEN.i);
 ok(seen>Date.now()-60e3,'زمان آخرین سنجش به‌روز شد (دفعه‌ی بعد دوباره کندل نمی‌گیرد)');
 console.log('=== لغزش روی استاپ ===');
 await p.evaluate(mk=>{const m=eval(mk);S.slip=0.1;m('s1','SSS',{targets:[]});m('s2','TTT',{dir:'short',stop:110,targets:[]});},mk);
 await px([['SSS',89],['TTT',111]]);
 const s1=await P('s1'), s2=await P('s2');
 ok(Math.abs(s1.exitPrice-89.91)<1e-9,'لانگ: استاپ 90 با 0.1٪ لغزش روی 89.91 پر شد — '+s1.exitPrice);
 ok(Math.abs(s2.exitPrice-110.11)<1e-9,'شورت: استاپ 110 روی 110.11 — '+s2.exitPrice);
 ok(errs.length===0,'بدون خطای JS');
 await b.close();
 console.log(bad?'✗ '+bad:'✔ همه درست');
})();
