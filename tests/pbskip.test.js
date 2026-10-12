/* نقشه‌ی خروج: پله‌ی «رد شد» با «انجام شد» یکی دیده نشود؛ عوض کردن نقشه شمارنده را از نو می‌سازد؛ برچسب لیکوئید روی ورود نیفتد */
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
   S.feat.autoexec=false;
   const q={id:'apt',ticker:'APT',dir:'long',kind:'futures',entry:0.605,stop:0.455,margin:10,lev:35,openedAt:Date.now()-864e5,status:'open',targets:[0.83,1.055,1.355],partials:[],log:[]};
   DB.positions.push(q);pbAttach(q,'bal');save();applyPrices(new Map([['APT',0.9033],['ZZZ',1]]),'test','direct',1);go('positions',true);renderAll();await W(300);
   const card=()=>[...document.querySelectorAll('.pbsteps li')].map(l=>l.className+':'+l.textContent);
   // «رد کن» روی پله‌ی 1
   const sk=[...document.querySelectorAll('.pbsteps li .mark')].find(b=>/رد کن/.test(b.textContent));if(sk)sk.click();await W(200);
   const a=card(),pa={pbc:q.pbc,skip:q.pbSkip,margin:q.margin};
   // عوض کردن نقشه به سوئینگ: تارگت 1 (0.83) رد شده، 1.055 نه
   const ch=[...document.querySelectorAll('.pbx .mark.ghost')].find(b=>/عوض کن/.test(b.textContent));ch.click();await W(200);
   const sw=[...document.querySelectorAll('.pbx .pbc')].find(b=>b.dataset&&/سوئینگ/.test(b.textContent));sw.click();await W(300);
   const bb=card(),pb={pbc:q.pbc,skip:q.pbSkip,margin:q.margin};
   const lb=[...document.querySelectorAll('.ladder .m.liq .lb')].map(x=>x.className).join();
   return {a,pa,bb,pb,lb};});
 console.log('   ',JSON.stringify(r).slice(0,900));
 ok(r.pa.pbc===1&&r.pa.skip.join()==='0'&&r.pa.margin===10&&r.a.some(x=>/^skip:/.test(x)&&/رد شد \(بسته نشد\)/.test(x)),'«رد کن»: پله «رد شد (بسته نشد)» دیده می‌شود، نه «انجام شد»؛ مارجین دست نخورد');
 ok(r.pb.pbc===1&&r.pb.skip.join()==='0'&&r.pb.margin===10&&r.bb.some(x=>/^skip:/.test(x))&&!r.bb.some(x=>/^done:/.test(x)),'عوض کردن نقشه: تارگتِ ردشده «رد شد» حساب شد، هیچ پله‌ای «انجام شد» بی بستن نیست');
 ok(/top/.test(r.lb),'برچسب لیکوئیدِ نزدیک ورود بالای خط می‌رود (روی «ورود» نمی‌افتد)');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
