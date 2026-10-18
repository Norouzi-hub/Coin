/* منبع کندلی که بازه‌ی خواسته‌شده را نادیده می‌گیرد و فقط آخرین کندل‌ها را می‌دهد (MEXC بدون endTime)
   کنار گذاشته می‌شود و از منبع بعدی گرفته می‌شود؛ آدرس‌های بایننس و MEXC پایان بازه (endTime) دارند */
const {chromium}=require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
const J=b=>({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(b)});
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const urls=[];
 await p.route('**',r=>{const u=r.request().url();
   if(u.includes('localhost:8899'))return r.continue();
   if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:'<html></html>'});
   let m;
   if((m=u.match(/api\.mexc\.com\/api\/v3\/klines\?symbol=([A-Z]+)USDT&interval=(\w+)&startTime=(\d+)&limit=(\d+)/))){urls.push(u);
     // MEXC بدرفتار: هر چه بخواهی، آخرین کندل‌ها (تا الان)
     const ms={'5m':3e5,'60m':36e5}[m[2]],n=+m[4],now=Date.now(),out=[];
     for(let i=n;i>0;i--){const t=Math.floor(now/ms)*ms-i*ms;out.push([t,'2','2.1','1.9','2','1']);}return r.fulfill(J(out));}
   if((m=u.match(/api\.gateio\.ws\/api\/v4\/spot\/candlesticks\?currency_pair=([A-Z]+)_USDT&interval=(\w+)&from=(\d+)&to=(\d+)/))){urls.push(u);
     const sec={'5m':300,'1h':3600}[m[2]],f=+m[3],to=+m[4],out=[];
     for(let t=f;t<=to&&t*1000<Date.now();t+=sec)out.push([String(t),'1','5','5.1','4.9','5','1','true']);return r.fulfill(J(out));}
   if(u.includes('api.binance.com/api/v3/klines'))urls.push(u);
   return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});await p.waitForTimeout(3000);
 const r=await p.evaluate(async()=>{const o={},start=Math.floor((Date.now()-10*864e5)/3e5)*3e5;
   AUDSRC.$=2;AUDSRC.XRP=2;                                  // MEXC اول (مثل گوشی کاربر)
   const C=await audCandles('XRP','5m',start,1000,true);
   o.first=C[0].t===start;o.c=C[0].c;o.n=C.length;o.src=AUD_SRC[AUDSRC.XRP].n;
   // بازه‌ی تا الان (سیگنال تازه): همان منبع اول قبول است
   const s2=Math.floor((Date.now()-36e5)/3e5)*3e5;AUDSRC.$=2;AUDSRC.XRP=2;
   const C2=await audCandles('XRP','5m',s2,1000,true);o.recent=C2.length>0&&AUD_SRC[AUDSRC.XRP].n;
   return o;});
 console.log('   ',JSON.stringify(r));
 console.log('    '+urls.filter(u=>/mexc|binance/.test(u)).slice(0,2).join('\n    '));
 ok(r.first&&r.c===5&&r.src==='Gate','بازه‌ی ۱۰ روز پیش: کندل‌های «فقط اخیر» MEXC کنار رفت و از Gate با شروع درست گرفته شد '+JSON.stringify(r));
 ok(urls.filter(u=>/mexc|binance/.test(u)).every(u=>/&endTime=\d+/.test(u))&&urls.some(u=>/mexc/.test(u)),'آدرس MEXC و بایننس پایان بازه (endTime) دارد');
 ok(r.recent==='MEXC','بازه‌ای که تا الان می‌رسد از همان MEXC قبول است');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
