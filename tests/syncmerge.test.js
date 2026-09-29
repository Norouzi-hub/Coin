const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
// سرور همگام‌سازی در حافظه، با همان قرارداد ورکر
let KV={rev:0,at:0,data:null};
async function dev(b){
  const ctx=await b.newContext({viewport:{width:390,height:800}});
  await ctx.route('**',async r=>{const u=r.request().url();
    if(u.includes('localhost:8899'))return r.continue();
    if(u.startsWith('https://sync.test/db')){
      const H={'content-type':'application/json','access-control-allow-origin':'*'};
      if(r.request().method()==='GET')return r.fulfill({status:200,headers:H,body:JSON.stringify(KV)});
      if(r.request().method()==='PUT'){const body=JSON.parse(r.request().postData());
        if(Number(body.rev)!==Number(KV.rev))return r.fulfill({status:409,headers:H,body:JSON.stringify({error:'conflict',server:KV})});
        KV={rev:KV.rev+1,at:Date.now(),data:body.data};return r.fulfill({status:200,headers:H,body:JSON.stringify({rev:KV.rev,at:KV.at})});}
      return r.fulfill({status:200,headers:H,body:'{}'});}
    return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>{bad++;console.log('PAGEERROR',e.message);});p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{if(!localStorage.getItem('signaldesk.sync.v1')){
    localStorage.setItem('signaldesk.sync.v1',JSON.stringify({url:'https://sync.test',token:'t',rev:0,at:0}));
    localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[],settings:{}}));}});
  await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);
  return p;
}
const mk=(id,o)=>Object.assign({id,ticker:id.toUpperCase(),dir:'long',kind:'futures',entry:100,stop:90,margin:10,lev:5,openedAt:Date.now(),status:'open',targets:[],partials:[],log:[]},o||{});
(async()=>{
 const b=await chromium.launch();
 const A=await dev(b), B=await dev(b);
 const ids=p=>p.evaluate(()=>DB.positions.map(x=>x.id).sort().join(','));
 const push=p=>p.evaluate(()=>syncPush(true));
 console.log('=== دو دستگاه، هر کدام پوزیشن تازه ===');
 await A.evaluate(x=>{DB.positions.push(x);save();},mk('a1'));
 ok(await push(A),'A فرستاد');
 await B.evaluate(x=>{DB.positions.push(x);save();},mk('b1'));
 ok(await push(B),'B با نسخه‌ی کهنه فرستاد، ولی تعارض خودکار ادغام شد (بدون پنجره)');
 ok(await ids(B)==='a1,b1'&&KV.data.positions.map(x=>x.id).sort().join(',')==='a1,b1','سرور و B هر دو پوزیشن را دارند');
 ok(await B.evaluate(()=>!document.querySelector('#sheet:not(.hide) #takeSrv')),'پنجره‌ی «داده‌ها یکی نیستند» باز نشد');
 console.log('=== پاک کردن روی یک دستگاه ===');
 await A.evaluate(()=>{DB.positions=DB.positions.filter(x=>x.id!=='a1');save();});
 ok(await A.evaluate(()=>!!DB.tomb['positions:a1']),'A: سنگ قبر a1 ثبت شد');
 ok(await push(A),'A فرستاد (با ادغام)');
 ok(KV.data.positions.map(x=>x.id).join(',')==='b1','روی سرور a1 زنده نشد: '+KV.data.positions.map(x=>x.id));
 await B.evaluate(()=>syncPull(true));
 ok(await ids(B)==='b1','B بعد از دریافت: a1 رفت');
 console.log('=== ویرایش هم‌زمان یک پوزیشن ===');
 await A.evaluate(()=>syncPull(true));
 await A.evaluate(()=>{const p=DB.positions.find(x=>x.id==='b1');p.note='از A';save();});
 await new Promise(r=>setTimeout(r,30));
 await B.evaluate(()=>{const p=DB.positions.find(x=>x.id==='b1');p.stop=95;save();});
 ok(await push(A),'A فرستاد');ok(await push(B),'B فرستاد (ادغام)');
 const s=KV.data.positions.find(x=>x.id==='b1');
 ok(s.stop===95,'تغییر تازه‌تر (B، استاپ 95) ماند');
 console.log('=== مجموعه‌ها: تصمیم و دسته ===');
 await A.evaluate(()=>{syncPull(true);});await A.waitForTimeout(300);
 await A.evaluate(()=>{DB.decisions['c/1']={action:'skipped',at:Date.now()};DB.cats.push({id:'cA',n:'الف'});save();});
 await B.evaluate(()=>{DB.decisions['c/2']={action:'taken',at:Date.now()};DB.cats.push({id:'cB',n:'ب'});save();});
 await push(A);await push(B);
 ok(Object.keys(KV.data.decisions).sort().join(',')==='c/1,c/2','تصمیم‌های دو دستگاه جمع شدند');
 ok(KV.data.cats.map(c=>c.id).sort().join(',')==='cA,cB','دسته‌های دو دستگاه جمع شدند');
 await A.evaluate(()=>syncPull(true));
 await A.evaluate(()=>{delete DB.decisions['c/2'];save();});
 await B.evaluate(()=>{DB.decisions['c/3']={action:'taken',at:Date.now()};save();});
 await push(A);await push(B);
 ok(!KV.data.decisions['c/2']&&KV.data.decisions['c/3'],'تصمیم پاک‌شده روی A، با ارسال B زنده نشد');
 console.log('=== شروع برنامه: کار بی‌اینترنت گم نمی‌شود ===');
 await B.evaluate(x=>{DB.positions.push(x);save();},mk('off1'));
 await B.evaluate(()=>{clearTimeout(syncTimer);});
 await A.evaluate(x=>{DB.positions.push(x);save();},mk('a2'));await push(A);
 await B.evaluate(()=>syncPull(true));
 ok(await ids(B)==='a2,b1,off1','B بعد از دریافتِ خودکار: هم a2 از سرور، هم off1 خودش');
 await B.waitForTimeout(3200);
 ok(KV.data.positions.map(x=>x.id).sort().join(',')==='a2,b1,off1','و off1 خودکار به سرور رفت');
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
