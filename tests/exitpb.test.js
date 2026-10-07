const {chromium} = require('./lib').pw;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
const D=d=>new Date(Date.now()-d*864e5).toISOString();
const posts=[
 {n:800,d:1,t:'#بیت_کوین لانگ<br>ورود ۱۰۰<br>حد ضرر ۹۰<br>تارگت ۱۱۰<br>تارگت ۱۲۰<br>تارگت ۱۳۰'},
 {n:799,d:2,t:'#اتریوم لانگ<br>ورود ۱۰۰<br>حد ضرر ۹۰<br>تارگت ۱۱۰<br>تارگت ۱۲۰<br>تارگت ۱۳۰'},
 {n:798,d:3,t:'#سولانا لانگ<br>ورود ۱۰۰<br>حد ضرر ۹۰<br>تارگت ۱۱۰<br>تارگت ۱۲۰<br>تارگت ۱۳۰'},
];
const html=`<html><body>${posts.map(p=>`<div class="tgme_widget_message" data-post="c/1893051/${p.n}"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${p.t}</div><time datetime="${D(p.d)}"></time></div></div>`).join('')}</body></html>`;
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:1000}});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message,(e.stack||'').split('\n').slice(0,4).join(' | ')));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(3500);

 console.log('=== موتور: مسیر قیمت ===');
 const w=await p.evaluate(()=>{
   const t0=Date.now()-5*864e5, k=(i,h,l)=>({t:t0+i*3e5,o:100,h,l,c:(h+l)/2});
   const inp={tk:'X',dir:'long',entry:100,trig:null,stop:90,tps:[110,120,130],t0};
   const C=[k(0,101,99.5),k(1,111,100.5),k(2,112,99),k(3,121,105),k(4,125,109),k(5,131,115)];
   const r=audWalk(inp,C,{days:30,entryDays:3,tol:1});
   const sim=Object.fromEntries(PB_IDS.map(id=>[id,+pbSim(pbDef(id),inp,r).R.toFixed(3)]));
   // باخت: قبل از تارگت به استاپ
   const L=audWalk(inp,[k(0,101,99.5),k(1,105,89)],{days:30,entryDays:3,tol:1});
   const simL=Object.fromEntries(PB_IDS.map(id=>[id,pbSim(pbDef(id),inp,L).R]));
   // دنباله‌دار: بعد از تارگت 2 برگشت تا تارگت 1
   const T=audWalk(inp,[k(0,101,99.5),k(1,111,100.5),k(2,121,111),k(3,122,109.5)],{days:30,entryDays:3,tol:1});
   return {st:r.st,path:r.path,sim,Lpath:L.path,simL,Tpath:T.path,swT:+pbSim(pbDef('sw'),inp,T).R.toFixed(3),balT:+pbSim(pbDef('bal'),inp,T).R.toFixed(3)};
 });
 console.log('  ',JSON.stringify(w));
 ok(w.st==='win'&&JSON.stringify(w.path)==='[2,-2,3,-3,4]','مسیر ثبت شد: TP1 ← برگشت به ورود ← TP2 ← برگشت به TP1 ← TP3');
 ok(w.sim.s1===1&&w.sim.s2===2&&w.sim.bal===0.5&&w.sim.sw===0.333&&w.sim.cu===0.5,'پنج سبک روی همان مسیر: 1 / 2 / 0.5 / 0.33 / 0.5');
 ok(Object.values(w.simL).every(x=>x===-1)&&JSON.stringify(w.Lpath)==='[-1]','باخت قبل از تارگت: همه −1R');
 ok(w.swT===1.333&&w.balT===1.5,'استاپ دنباله‌دار: سوئینگ ⅓+⅔ و باقی روی استاپِ TP1 = 1.33R؛ متعادل 1.5R — '+w.swT+' / '+w.balT);

 console.log('=== آزمایشگاه در کانال‌سنج ===');
 await p.evaluate(()=>{
   const R=audRules();
   const t0=x=>x.date.getTime();
   const paths={'800':{st:'win',path:[2,-2,3,-3,4]},'799':{st:'loss',path:[-1]},'798':{st:'win',path:[2,3,4]}};
   for(const x of POSTS){const inp=audInput(x);const n=x.id.split('/').pop();if(!inp||!paths[n])continue;
     AUD[x.id]=Object.assign({k:audKey(inp,R),fin:true,at:Date.now(),tAct:t0(x),tTp:[],late:false},paths[n]);}
   audSave();AUDOPEN='خروج';XSEL.v='pb';LABAUTO=XLABAUTO=true;go('audit',true);
 });
 await p.waitForTimeout(600);
 const lab=await p.evaluate(()=>{const L=document.querySelector('.lab');if(!L)return null;
   return {rows:[...L.querySelectorAll('.labr')].map(r=>({n:r.querySelector('.labh b').textContent,best:r.classList.contains('best'),on:r.classList.contains('on'),k:r.querySelector('.labk')?.textContent||''})),
     curve:!!L.querySelector('svg.eq')};});
 console.log('  ',JSON.stringify(lab));
 ok(lab&&lab.rows.length===5,'پنج سبک در آزمایشگاه');
 // s1: +1 -1 +1 = 1 ; s2: 2 -1 2 = 3 ; bal: .5 -1 1.5 = 1 ; sw: .333 -1 2 = 1.333
 ok(lab.rows[1].best&&lab.rows[1].k.includes('+3.00R'),'بهترین روی این داده: اسکلپ تارگت 2 با +3R');
 ok(lab.rows[2].on,'سبک پیش‌فرض (متعادل) علامت خورده');
 await p.evaluate(()=>[...document.querySelectorAll('.lab .labr')][3].querySelector('.mark').click());
 await p.waitForTimeout(400);
 ok(await p.evaluate(()=>S.exitPb==='sw'&&document.querySelectorAll('.lab .labr')[3].classList.contains('on')),'«انتخاب» سبک من را سوئینگ کرد');
 // دلخواه
 await p.evaluate(()=>{const d=document.querySelector('.labcu');d.open=true;
   const i=d.querySelectorAll('input[data-i]');i[0].value=100;i[1].value=0;i[2].value=0;i[0].dispatchEvent(new Event('change'));});
 await p.waitForTimeout(400);
 const cu=await p.evaluate(()=>document.querySelectorAll('.lab .labr')[4].querySelector('.labk').textContent);
 ok(cu.includes('+1.00R'),'دلخواه 100٪ در تارگت 1 = همان اسکلپ 1 (+1R)');
 await p.screenshot({path:require('./lib').out('lab.png'),fullPage:false});
 const eh=await p.$('.lab');await eh.screenshot({path:require('./lib').out('lab.png')});

 console.log('=== نقشه روی پوزیشن ===');
 await p.evaluate(()=>{go('signals',true);PRICES=new Map([['BTC',100],['ETH',100],['SOL',100]]);SYMBOLS=new Set(PRICES.keys());SYMVER++;sigFilter='all';S.exitPb='bal';renderAll();});
 await p.waitForTimeout(300);
 await p.evaluate(()=>{const c8=[...document.querySelectorAll('#list .card')].find(c=>c.dataset.id.endsWith('/800'));[...c8.querySelectorAll('.brief .acts .btn')].find(b=>/فرم کامل|بررسی و ورود/.test(b.textContent)).click();});
 await p.waitForTimeout(500);
 const sh=await p.evaluate(()=>({on:document.querySelector('#pbBox .pbc.on')?.textContent,steps:[...document.querySelectorAll('#pbBox .pbsteps li')].map(l=>l.textContent)}));
 console.log('  ',JSON.stringify(sh));
 ok(sh.on==='متعادل'&&sh.steps.length===2,'فرم ورود: سبک متعادل با 2 پله');
 ok(sh.steps[0].includes('50٪')&&sh.steps[0].includes('ورود'),'پله 1: ببند 50٪ · استاپ ← ورود');
 await p.evaluate(()=>[...document.querySelectorAll('#pbBox .pbc')].find(b=>b.textContent.startsWith('سوئینگ')).click());
 await p.waitForTimeout(200);
 const sh2=await p.$$eval('#pbBox .pbsteps li',e=>e.length);
 ok(sh2===3,'با سوئینگ 3 پله');
 await p.evaluate(()=>[...document.querySelectorAll('#pbBox .pbc')].find(b=>b.textContent==='متعادل').click());
 await p.screenshot({path:require('./lib').out('pb_sheet.png')});
 await p.click('#ok');await p.waitForTimeout(400);
 const pos=await p.evaluate(()=>{const x=DB.positions.find(q=>q.ticker==='BTC');return x&&{pb:x.pb&&x.pb.id,tps:x.pb&&x.pb.tps,parts:x.pb&&x.pb.parts,m:x.margin};});
 ok(pos&&pos.pb==='bal'&&pos.tps.join()==='110,120,130','پوزیشن با نقشه‌ی متعادل ثبت شد '+JSON.stringify(pos));
 // رسیدن به TP1
 await p.evaluate(()=>{PRICES.set('BTC',111);checkAlerts();go('positions',true);posFilter='open';renderPositions();});
 await p.waitForTimeout(300);
 const c1=await p.evaluate(()=>({hit:!!document.querySelector('.pbsteps li.hit'),toast:[...document.querySelectorAll('.toast')].map(t=>t.textContent).join('|')}));
 ok(c1.hit,'کارت پوزیشن: پله‌ی 1 «رسید!»');
 ok(/طبق نقشه/.test(c1.toast),'هشدار «طبق نقشه» آمد');
 await p.evaluate(()=>document.querySelectorAll('.toast').forEach(t=>t.style.visibility='hidden'));const eh2=await p.$('#posList .card .pbx');await eh2.screenshot({path:require('./lib').out('pb_card.png')});
 await p.evaluate(()=>document.querySelector('.pbsteps li.hit .pbact .btn').click());
 await p.waitForTimeout(400);
 const after=await p.evaluate(()=>{const x=DB.positions.find(q=>q.ticker==='BTC');return {m:x.margin,stop:x.stop,pbc:x.pbc,parts:x.partials.length,log:x.log.map(l=>l.t).slice(-2)};});
 console.log('  ',JSON.stringify(after));
 ok(after.pbc===1&&after.parts===1&&Math.abs(after.m-pos.m/2)<1e-9&&after.stop===100,'«انجام شد»: نصف بسته شد و استاپ روی ورود (100)');
 // پله‌ی دوم = بستن کامل
 await p.evaluate(()=>{PRICES.set('BTC',121);renderPositions();document.querySelector('.pbsteps li.hit .pbact .btn').click();});
 await p.waitForTimeout(400);
 ok(await p.evaluate(()=>DB.positions.find(q=>q.ticker==='BTC').status==='closed'),'پله‌ی 2: پوزیشن کامل بسته شد');
 // پوزیشن بدون نقشه
 await p.evaluate(()=>{DB.positions.push(ensureBase({id:'old1',ticker:'ETH',kind:'futures',dir:'long',entry:100,stop:90,stop0:90,margin:10,baseMargin:10,lev:2,targets:[110,120],openedAt:Date.now(),status:'open',partials:[],log:[]}));renderPositions();});
 const nop=await p.evaluate(()=>{const c=document.getElementById('pos-old1');return {picker:c.querySelectorAll('.pbpick .pbc').length};});
 ok(nop.picker===5,'پوزیشن قدیمی بدون نقشه: انتخاب سبک');
 await p.evaluate(()=>document.querySelector('#pos-old1 .pbpick .pbc').click());
 ok(await p.evaluate(()=>DB.positions.find(x=>x.id==='old1').pb.id==='s1'),'با یک زدن نقشه‌ی اسکلپ 1 وصل شد');
 await b.close();
})();
