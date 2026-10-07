const {chromium}=require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
const H=3600000, NOW=Date.now(), T0=NOW-5*24*H;
const PATH={BTC:[[-1,60000],[0,60000],[6,61000],[20,62500],[200,62500]],
  ETH:[[-1,3000],[0,3000],[3,3050],[10,3150],[200,3150]]};
const px=(sym,t)=>{const p=PATH[sym];const h=(t-T0)/H;
  if(h<=p[0][0])return p[0][1];
  for(let i=1;i<p.length;i++)if(h<=p[i][0]){const [h0,v0]=p[i-1],[h1,v1]=p[i];return v0+(v1-v0)*(h-h0)/(h1-h0);}
  return p[p.length-1][1];};
const bars=(sym,ms,st,lim)=>{const out=[];for(let t=st;t<NOW&&out.length<lim;t+=ms){const o=px(sym,t),c=px(sym,t+ms);out.push({t,o,h:Math.max(o,c),l:Math.min(o,c),c});}return out;};
const SEC={'1m':60,'5m':300,'1h':3600,'1min':60,'5min':300,'1hour':3600};
const J=b=>({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(b)});
const mkPost=(n,t,at)=>`<div class="tgme_widget_message" data-post="c/1893051/${n}"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${t}</div><time datetime="${new Date(at).toISOString()}"></time></div></div>`;
const html='<html><body>'+[[910,'#بیت_کوین لانگ فیوچرز<br>ورود 60000<br>حد ضرر 59000<br>تارگت 62000',T0],
 [909,'#اتریوم شورت<br>ورود 3000<br>حد ضرر 3100<br>تارگت 2800',T0],[908,'#کاردانو لانگ ورود 0.5 تارگت 0.6',T0]].map(x=>mkPost(...x)).join('')+'</body></html>';
async function run(open){
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 p.on('pageerror',e=>{bad++;console.log('PAGEERROR:',e.message)});
 const calls={};
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  if(u.includes('ticker/price')&&u.includes('mexc'))return r.fulfill(J(Object.keys(PATH).map(s=>({symbol:s+'USDT',price:String(px(s,NOW))})).concat(Array.from({length:30},(_,i)=>({symbol:'Z'+i+'USDT',price:'1'})))));
  let m;
  if(open==='gate'&&(m=u.match(/api\.gateio\.ws\/api\/v4\/spot\/candlesticks\?currency_pair=([A-Z]+)_USDT&interval=(\w+)&from=(\d+)&to=(\d+)/))){
    calls.gate=(calls.gate||0)+1;const [,s,iv,f,to]=m;const n=Math.floor((+to-+f)/SEC[iv])+1;
    if(!PATH[s])return r.fulfill({status:400,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:'{"label":"INVALID_CURRENCY_PAIR"}'});
    return r.fulfill(J(bars(s,SEC[iv]*1000,+f*1000,n).map(k=>[String(k.t/1000),'1',String(k.c),String(k.h),String(k.l),String(k.o),'1','true'])));}
  if(open==='kucoin'&&(m=u.match(/api\.kucoin\.com\/api\/v1\/market\/candles\?type=(\w+)&symbol=([A-Z]+)-USDT&startAt=(\d+)&endAt=(\d+)/))){
    calls.kucoin=(calls.kucoin||0)+1;const [,iv,s,f,to]=m;
    if(!PATH[s])return r.fulfill(J({code:'400100',msg:'This pair is not provided at present'}));
    const n=Math.min(1500,Math.floor((+to-+f)/SEC[iv]));
    return r.fulfill(J({code:'200000',data:bars(s,SEC[iv]*1000,+f*1000,n).reverse().map(k=>[String(k.t/1000),String(k.o),String(k.c),String(k.h),String(k.l),'1','1'])}));}
  if(open==='bitget'&&(m=u.match(/api\.bitget\.com\/api\/v2\/spot\/market\/candles\?symbol=([A-Z]+)USDT&granularity=(\w+)&startTime=(\d+)&endTime=(\d+)&limit=(\d+)/))){
    calls.bitget=(calls.bitget||0)+1;const [,s,iv,st,,lim]=m;const ms={'1min':6e4,'5min':3e5,'1h':36e5}[iv];
    if(!PATH[s])return r.fulfill(J({code:'40034',msg:'Parameter does not exist',data:null}));
    return r.fulfill(J({code:'00000',data:bars(s,ms,+st,+lim).map(k=>[String(k.t),String(k.o),String(k.h),String(k.l),String(k.c),'1','1','1'])}));}
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.waitForTimeout(4000);
 await p.click('.tab[data-v="audit"]');
 await p.waitForFunction(()=>!AUDQ.on&&AUDQ.at>0,{timeout:90000});
 await p.waitForTimeout(500);
 const st=await p.evaluate(()=>{const o={};for(const x of POSTS){const a=AUD[x.id];if(a)o[x.id.split('/').pop()]=a.st+(a.why?':'+a.why:'');}return o;});
 console.log('=== فقط '+open+' باز است ===',JSON.stringify(st),JSON.stringify(calls));
 ok(st['910']==='win','BTC برد (از '+open+')');
 ok(st['909']==='loss','ETH استاپ (از '+open+')');
 ok(st['908']==='bad:no-stop','ADA بدون استاپ');
 const diag=await p.evaluate(()=>{const d=document.querySelector('#audBody .audiag');return d?{sum:d.querySelector('summary').textContent,why:d.querySelector('.audwhy')?.textContent||'',hint:[...d.querySelectorAll('.hint')].map(x=>x.textContent).join('|')}:null;});
 ok(diag&&/2 از 3/.test(diag.sum),'وضعیت سنجش: '+(diag&&diag.sum));
 ok(diag&&/حد ضرر ندارد/.test(diag.why),'علت: '+(diag&&diag.why));
 ok(diag&&diag.hint.includes('منبع کندل'),'منبع: '+(diag&&diag.hint));
 if(open==='gate'){
   await p.evaluate(()=>{document.querySelector('#audBody .audiag').open=true;});
   await p.$$eval('#audBody .audiag .btn',bs=>bs.find(b=>b.textContent.includes('آزمایش')).click());
   // در برگه‌ی «وضعیت و عیب‌یابی»، جدول «کندل‌ها»
   await p.waitForFunction(()=>document.querySelector('#diagBox .kdt')&&document.querySelector('#diagBox .flag'),{timeout:60000});
   const pr=await p.$$eval('#diagBox .kdt tbody tr',e=>e.map(x=>x.cells[0].textContent+': '+(x.cells[1].textContent==='✓'?'u':'d')));
   console.log('  ',pr.join(' · '));
   ok(pr.find(x=>x.startsWith('Gate')).endsWith(': u')&&pr.find(x=>x.startsWith('Binance:')).endsWith(': d'),'آزمایش اتصال: Gate باز، بایننس بسته');
   await p.screenshot({path:require('./lib').out('audiag.png'),fullPage:false});
 }
 await b.close();
}
(async()=>{for(const o of ['gate','kucoin','bitget'])await run(o);console.log(bad?'✗'+bad:'✔ همه درست');})();
