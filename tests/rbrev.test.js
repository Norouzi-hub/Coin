/* «خلاف جهت» تست‌ها: همان استاپ و نقشه با جهت برعکس روی همان کندل‌ها؛ روی ردیف، جمع روز، خلاصه و پر شدن خودکار */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},M5=3e5,H=36e5,D=864e5;
   const t0=Math.floor((Date.now()-3*D)/M5)*M5;
   // لانگ از 100، استاپ 98 (2٪)، نقشه «همه در +0.5R»: قیمت اول به 98.9 می‌ریزد (خلافش، شورت، در 99 = +0.5R می‌برد) و بعد به 97.5 (لانگ استاپ)
   const mk=(i,h,l,c)=>({t:t0+i*M5,o:c,h,l,c});
   const C=[mk(0,100.1,99.9,100),mk(1,100.2,99.6,99.7),mk(2,99.8,98.9,99),mk(3,99,97.5,97.8),mk(4,98,97.6,97.8)];
   for(let i=5;i<900;i++)C.push(mk(i,97.9,97.7,97.8));
   const it={id:'tRev1',k:'test',tk:'SOL',dir:'long',t:t0+1,E:100,SL:98,TP:103,sd:0.02,rr:1.5,ex:'q05',hold:72,st:'sl',R:-1.03,xt:t0+4*M5,xp:98,x:exNew()};
   const v=rbRevSim(it,C);o.rev=v;
   // شورتِ برعکس: استاپ 98 ← خلافش لانگ با استاپ 102
   const it2=Object.assign({},it,{id:'tRev2',dir:'short',SL:102,TP:97,st:'tp',R:0.48});o.rev2=rbRevSim(it2,C);
   // ردیف، جمع روز و خلاصه
   const keep=RB.items;RB.items=[Object.assign({},it,{rev:v}),Object.assign({},it2,{xt:t0+4*M5+D,rev:o.rev2})];
   RDV='test';go('radar',true);renderRadar();await W(100);
   o.row=[...document.querySelectorAll('#rdView .rbrev')].map(x=>x.textContent).join('|');
   o.sum=(document.querySelector('#rdView .rbrevs')||{}).textContent||'';
   o.day=[...document.querySelectorAll('#rdView .rbday summary .rbds')].map(x=>x.textContent).join('|');
   // پر شدن خودکار با مسیر ذخیره‌شده
   const pth=rbPath;rbPath=async()=>C;RB.items=[Object.assign({},it,{id:'tRev3'})];
   await rbRevFill(true);await W(50);o.fill=RB.items[0].rev;rbPath=pth;RB.items=keep;
   return o;});
 console.log('   ',JSON.stringify(r).slice(0,900));
 ok(r.rev&&r.rev.st==='tp'&&r.rev.R>0.4&&r.rev.R<0.5,'لانگِ استاپ‌خورده ← خلافش (شورت) به +0.5R رسید، بعد از کارمزد: '+(r.rev&&r.rev.R));
 ok(r.rev2&&r.rev2.st==='sl'&&r.rev2.R<-1,'شورتِ برنده ← خلافش (لانگ) استاپ خورد: '+(r.rev2&&r.rev2.R));
 ok(/خلاف\s*[+−-]\d\.\d+R/.test(r.row),'روی ردیف هر تست «خلاف ±R» (روز باز): '+r.row);
 ok(/اگر خلاف همه را گرفته بودی/.test(r.sum)&&/2 تست/.test(r.sum)&&/روز از 2 روز/.test(r.sum),'خلاصه: همان در برابر خلاف، و چند روز از چند روز');
 ok(/خلاف/.test(r.day),'جمع هر روز در آرشیو با «خلاف»');
 ok(r.fill&&r.fill.st==='tp','تست بسته‌ی بی «خلاف» خودکار حساب شد');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
