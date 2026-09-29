import fs from 'fs'; import os from 'os'; import path from 'path'; import {fileURLToPath,pathToFileURL} from 'url';
// ورکر فایل .js با export است؛ برای import بی‌هشدار، یک کپی .mjs
const here=path.dirname(fileURLToPath(import.meta.url)), tmp=path.join(os.tmpdir(),'sd-worker-'+process.pid+'.mjs');
fs.copyFileSync(path.join(here,'..','proxy','worker.js'),tmp);
const W=(await import(pathToFileURL(tmp).href)).default;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
const kv=new Map();const STORE={get:async k=>kv.has(k)?kv.get(k):null,put:async(k,v)=>kv.set(k,v),delete:async k=>kv.delete(k)};
const env={STORE,SYNC_TOKEN:'sec',TG_BOT_TOKEN:'123:abc'};
const sent=[];let mark={BTC:89.5,ETH:3000,SOL:160};let binanceDown=false;
globalThis.fetch=async(u,o)=>{u=String(u);const J=(b,s)=>new Response(JSON.stringify(b),{status:s||200});
  if(u.includes('api.telegram.org')){const m=u.split('/').pop();const body=JSON.parse(o.body);
    if(m==='getUpdates')return J({ok:true,result:[{message:{chat:{id:777,type:'private',first_name:'Ali'},text:'/start'}}]});
    if(m==='sendMessage'){sent.push(body);return J({ok:true});}}
  if(u.includes('fapi.binance.com'))return binanceDown?J({},451):J(Object.entries(mark).map(([k,v])=>({symbol:k+'USDT',markPrice:String(v)})).concat(Array.from({length:30},(_,i)=>({symbol:'Z'+i+'USDT',markPrice:'1'}))));
  if(u.includes('okx.com'))return J({data:Object.entries(mark).map(([k,v])=>({instId:k+'-USDT-SWAP',markPx:String(v)})).concat(Array.from({length:30},(_,i)=>({instId:'Z'+i+'-USDT-SWAP',markPx:'1'})))});
  if(u.includes('api.binance.com'))return J([{symbol:'BTCUSDT',price:'90.5'},{symbol:'SOLUSDT',price:'158'}].concat(Array.from({length:30},(_,i)=>({symbol:'Z'+i+'USDT',price:'1'}))));
  return J({},404);};
const req=(path,tok)=>new Request('https://w.dev'+path,{method:'POST',headers:{Authorization:'Bearer '+(tok||'sec')}});
const call=async(p,t)=>(await W.fetch(req(p,t),env)).json();
const db={rev:3,at:1,data:{settings:{feat:{alerts:true}},positions:[
  {id:'a',ticker:'BTC',dir:'long',kind:'futures',entry:100,stop:90,lev:5,margin:10,status:'open'},
  {id:'b',ticker:'ETH',dir:'long',kind:'futures',entry:2800,stop:2700,lev:3,margin:10,status:'open',pbc:0,pb:{parts:[0.5,0.5,0],be:1,trail:false,tps:[2950,3100,3300]}},
  {id:'c',ticker:'SOL',dir:'long',kind:'spot',entry:150,stop:140,lev:1,margin:10,status:'open',targets:[155,170]},
  {id:'d',ticker:'BTC',dir:'long',kind:'futures',entry:100,stop:80,lev:5,margin:10,status:'closed'}]}};
kv.set('signaldesk',JSON.stringify(db));
console.log('=== وصل کردن ===');
ok((await call('/tg/link','bad')).error==='unauthorized','بدون رمز درست رد می‌شود');
const l=await call('/tg/link');
ok(l.linked&&JSON.parse(kv.get('signaldesk:tg')).chat===777,'شناسه‌ی چت از getUpdates پیدا و ذخیره شد');
ok(sent.length===1&&sent[0].text.includes('وصل شد'),'پیام «وصل شد» رفت');
ok((await call('/tg/status')).linked,'وضعیت: وصل');
console.log('=== بررسی دقیقه‌ای ===');
sent.length=0;
await new Promise(r=>W.scheduled({},env,{waitUntil:p=>p.then(r)}));
const txt=sent.map(s=>s.text);console.log('   '+txt.join('\n   ').replace(/\n/g,' / '));
ok(txt.some(t=>t.startsWith('🔴 BTC')&&t.includes('مارک: 89.5')),'BTC فیوچرز: مارک 89.5 زیر استاپ 90 ← پیام حد ضرر');
ok(txt.some(t=>t.startsWith('🟢 ETH')&&t.includes('تارگت 1')&&t.includes('ببند 50٪')&&t.includes('استاپ ← ورود')),'ETH: پله‌ی ۱ نقشه با متن «ببند 50٪ · استاپ ← ورود»');
ok(txt.some(t=>t.startsWith('🟢 SOL')&&t.includes('تارگت 1')),'SOL اسپات بدون نقشه: تارگت 1 با قیمت اسپات');
ok(!txt.some(t=>t.includes('تارگت 2')),'تارگت 2 سولانا نرسیده');
ok(sent.length===3,'پوزیشن بسته هیچ پیامی ندارد؛ جمعاً ۳');
sent.length=0;
await new Promise(r=>W.scheduled({},env,{waitUntil:p=>p.then(r)}));
ok(sent.length===0,'دقیقه‌ی بعد: تکراری نمی‌فرستد');
console.log('=== جابه‌جایی استاپ و منبع جایگزین ===');
db.data.positions[0].stop=89;kv.set('signaldesk',JSON.stringify(db));binanceDown=true;mark.BTC=89.2;
await new Promise(r=>W.scheduled({},env,{waitUntil:p=>p.then(r)}));
ok(sent.some(s=>s.text.startsWith('🟠 BTC')),'استاپ عوض شد (89): هشدار تازه «نزدیک حد ضرر» با مارک OKX وقتی بایننس بسته است');
db.data.settings.feat.alerts=false;kv.set('signaldesk',JSON.stringify(db));
ok((await call('/tg/check')).skipped==='alerts-off','هشدارها در برنامه خاموش ← ورکر هم ساکت');
ok((await call('/tg/unlink')).linked===false&&!kv.has('signaldesk:tg'),'قطع کردن');
console.log(bad?'✗ '+bad:'✔ همه درست');
