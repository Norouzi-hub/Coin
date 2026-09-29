const {chromium}=require('./lib').pw;
const posts=[];
for(let i=0;i<8;i++)posts.push({n:900-i,
  t:i%2===0?`#بیت_کوین لانگ<br>ورود ${60000+i}<br>حد ضرر ${59000+i}`:`یادداشت ${i}`});
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}">
 <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div>
 <time datetime="2026-09-22T10:00:00+00:00"></time></div></div>`).join('')}</body></html>`;
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900},deviceScaleFactor:2});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.waitForTimeout(4000);
 await p.evaluate(()=>{PRICES=new Map([['BTC',60500]]);SYMBOLS=new Set(['BTC']);SYMVER++;
   DB.positions=[ensureBase({id:'p1',ticker:'BTC',kind:'futures',dir:'long',entry:60000,stop:59000,
     stop0:59000,margin:10,baseMargin:10,lev:5,targets:[63000],status:'open',exitPrice:null,
     openedAt:Date.now()-7200000,closedAt:null,partials:[],log:[]})];
   save();renderAll();});
 await p.waitForTimeout(500);
 // اندازه‌ی «هدرِ» بالای فهرست
 const chrome=await p.evaluate(()=>{
   const q=(s)=>{const e=document.querySelector(s);if(!e)return null;
     const r=e.getBoundingClientRect();return {h:Math.round(r.height),top:Math.round(r.top)};};
   const first=document.querySelector('#list .card');
   return {tools:q('#vSignals .tools'),status:q('#status'),sum:q('.sumbar'),
     firstCard:first?Math.round(first.getBoundingClientRect().top):null,
     header:q('header')||q('.top'),
     statusTxt:((document.querySelector('#status')||{}).textContent||'—').replace(/\s+/g,' ').trim(),
     sumTxt:((document.querySelector('.sumbar')||{}).textContent||'—').replace(/\s+/g,' ').trim()};});
 console.log('=== ارتفاع چیزهای بالای اولین کارت ===');
 console.log('  tools (جستجو+فیلتر):',chrome.tools&&chrome.tools.h,'px');
 console.log('  status            :',chrome.status&&chrome.status.h,'px  →',chrome.statusTxt);
 console.log('  sumbar            :',chrome.sum&&chrome.sum.h,'px  →',chrome.sumTxt);
 console.log('  اولین کارت از بالای صفحه:',chrome.firstCard,'px از',900);
 for(const [v,name] of [['positions','pos'],['report','rep'],['market','mkt'],['lessons','les']]){
   await p.evaluate(v=>go(v),v);await p.waitForTimeout(600);
   await p.screenshot({path:require('./lib').out('w-')+name+'.png'});
 }
 await p.click('#btnSet');await p.waitForTimeout(600);
 await p.screenshot({path:require('./lib').out('w-set.png')});
 const setH=await p.evaluate(()=>{const b=document.querySelector('#setVeil .panelbody')||document.querySelector('#setVeil > div');
   return b?Math.round(b.scrollHeight):null;});
 console.log('  ارتفاع کل پنل تنظیمات:',setH,'px');
 await b.close();})();
