/* پوزیشن‌ها: آمار بالای صفحه مخصوص هر تب است — «باز» فقط شناور، «بسته» فقط تحقق‌یافته، «همه» جمع هر دو */
const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:1000}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();if(u.includes('localhost:8899'))return r.continue();
   if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:'<html><body></body></html>'});return r.abort();});
 await p.addInitScript(()=>{localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[],settings:{}}));window.__startView='positions';});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms));
   S.feat.autoexec=false;S.fee=0;S.fund=0;
   const P=(id,tk,st,x)=>Object.assign({id,ticker:tk,dir:'long',kind:'futures',entry:100,stop:90,margin:10,lev:10,openedAt:Date.now()-864e5,status:st,exitPrice:null,closedAt:null,fees:0,targets:[],partials:[],log:[]},x);
   DB.positions.push(P('a','AAA','open'),P('b','BBB','open'),P('c','CCC','closed',{exitPrice:110,closedAt:Date.now()-36e5}),P('d','DDD','closed',{exitPrice:95,closedAt:Date.now()-2*864e5}));
   DB.positions.forEach(rebase);save();applyPrices(new Map([['AAA',105],['BBB',98],['ZZZ',1]]),'test','direct',1);go('positions',true);
   const out={};
   for(const [k,id] of [['open','pOpen'],['closed','pClosed'],['all','pAllP']]){$('#'+id).click();await W(150);
     out[k]=[...document.querySelectorAll('#posSummary .stats .st')].map(x=>x.querySelector('b').textContent+'='+x.querySelector('span').textContent.replace(/\s+/g,''));}
   return out;});
 console.log('   ',JSON.stringify(r));
 const has=(a,l,v)=>a.some(x=>x.startsWith(l+'=')&&x.includes(v));
 ok(r.open.length===4&&has(r.open,'سود/ضرر باز','3')&&has(r.open,'در سود','1')&&!r.open.some(x=>/مجموع خالص|بسته‌شده/.test(x)),'تب باز: فقط شناور (+$3، 1 از 2 در سود)، بی مجموع بسته‌شده‌ها');
 ok(r.closed.length===4&&has(r.closed,'مجموع خالص','5')&&has(r.closed,'برد','50')&&!r.closed.some(x=>/سود\/ضرر باز/.test(x)),'تب بسته: مجموع تحقق‌یافته (+$5) و برد 50٪، بی شناور');
 ok(r.all.length===4&&has(r.all,'جمع کل','8')&&has(r.all,'بسته‌شده','5')&&has(r.all,'سود/ضرر باز','3'),'تب همه: باز +$3، بسته +$5، جمع کل +$8');
 ok(new Set([r.open.join(),r.closed.join(),r.all.join()]).size===3,'سه تب سه آمار متفاوت');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
