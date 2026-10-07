/* پیشنهادهای ۳۱ تا ۳۷: سود بر ساعت، هفتگی، هدف ماهانه، «چرا بستم»، در برابر قاعده، نوار روزها، کارمزد */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{
   Object.assign(S,{acct:100,goal:20,fee:0.1});
   setXRule({k:0,t:0,h:XH.length-1});
   const H=36e5,now=Date.now(),N=XK.length*XT.length*XH.length;
   const mk=(id,ex,why,h,ago,sig)=>ensureBase({id,sigId:sig,ticker:'B'+id,kind:'futures',dir:'long',entry:100,stop:90,stop0:90,margin:10,lev:5,targets:[],
     openedAt:now-ago-h*H,closedAt:now-ago,status:'closed',exitPrice:ex,fees:0.05,why,partials:[],log:[]});
   DB.positions=[mk('a',110,'tp',2,H,'s1'),mk('b',95,'fear',2,2*H,'s2'),mk('c',104,'time',4,3*H)];
   AUD.s1={xg:{v:XG_V,R:new Array(N).fill(1)}};AUD.s2={xg:{v:XG_V,R:new Array(N).fill(-1)}};
   const inR=DB.positions;
   const n=buildBehavior(inR);document.body.appendChild(n);
   const t=n.textContent, strip=n.querySelectorAll('.daystrip i').length, stripU=n.querySelectorAll('.daystrip i.u').length;
   const w=weekSummary(), vr=vsRule(inR);n.remove();
   return {t,strip,stripU,w:{n:w.n,pnl:+w.pnl.toFixed(2),fees:+w.fees.toFixed(2)},vr};});
 console.log('   ',JSON.stringify(Object.assign({},r,{t:r.t.slice(0,160)})));
 // سود: (110-100)*0.5 −0.05 = 4.95 ؛ (95-100)*0.5 −0.05 = −2.55 ؛ (104-100)*0.5 −0.05 = 1.95 → 4.35 در ۸ ساعت
 ok(/سود هر ساعت\$0\.54/.test(r.t),'سود هر ساعت: ۴٫۳۵ دلار در ۸ ساعت ≈ ۰٫۵۴');
 ok(/هدف این ماه\$4\.35 از \$20\.00/.test(r.t),'هدف ماهانه: ۴٫۳۵ از ۲۰ دلار (۲۰٪ حساب)');
 ok(/کارمزد این ماه/.test(r.t)&&r.w.fees===0.15,'کارمزد: ۰٫۱۵ دلار در ۳ معامله');
 ok(/تارگت · 1/.test(r.t)&&/ترس · 1/.test(r.t)&&/سقف زمان · 1/.test(r.t),'«چرا بستی»: تارگت، ترس، سقف زمان');
 ok(r.vr&&r.vr.n===2&&Math.abs(r.vr.ru)<1e-9&&Math.abs(r.vr.me-0.48)<0.01,'در برابر قاعده: خودت +0.48R (با کارمزد)، قاعده 0R روی ۲ معامله');
 ok(r.strip===30&&r.stripU===1,'نوار ۳۰ روز، امروز سبز');
 ok(r.w.n===3&&r.w.pnl===4.35&&/هفتگی/.test(r.t),'خلاصه‌ی هفتگی: ۳ معامله، ۴٫۳۵ دلار');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
