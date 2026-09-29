const {chromium} = require('./lib').pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route('**',r=>r.request().url().includes('localhost:8899')?r.continue():r.abort());
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{
   const H=36e5,now=Date.now();
   const L={id:'l',ticker:'X',dir:'long',kind:'futures',entry:100,stop:90,margin:10,lev:5,openedAt:now-17*H,status:'open',partials:[],log:[]};
   const Sh=Object.assign({},L,{id:'s',dir:'short',stop:110});
   const Sp=Object.assign({},L,{id:'p',kind:'spot',lev:1});
   const P=Object.assign({},L,{id:'q',margin:5,partials:[{at:now-8.5*H,price:105,margin:5,pnl:1,fees:0,part:.5}]});
   S.fund=0;const z=posMetrics(L,100).funding;
   S.fund=0.01;
   return {z,l:posMetrics(L,100),s:posMetrics(Sh,100).funding,sp:posMetrics(Sp,100).funding,q:posMetrics(P,100).funding};});
 ok(r.z===0,'نرخ صفر (پیش‌فرض): فاندینگی حساب نمی‌شود');
 ok(Math.abs(r.l.funding-0.01)<1e-12&&Math.abs(r.l.pnl-(-0.05-0.01))<1e-9,'لانگ ۱۷ ساعت، حجم 50، 0.01٪: دو دوره = 0.01 دلار از سود کم شد');
 ok(Math.abs(r.s+0.01)<1e-12,'شورت همان را می‌گیرد (−0.01)');
 ok(r.sp===0,'اسپات فاندینگ ندارد');
 ok(Math.abs(r.q-(25*2*1e-4+25*1*1e-4))<1e-12,'نیمه‌بسته بعد از ۸.۵ ساعت: نیمه‌ی بسته یک دوره، باقی دو دوره');
 ok(errs.length===0,'بدون خطا');
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
