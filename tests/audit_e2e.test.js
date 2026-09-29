const {chromium}=require('./lib').pw;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
const H=3600000, NOW=Date.now(), T0=NOW-5*24*H;           // همه‌ی سیگنال‌ها 5 روز پیش
// مسیر قیمت هر نماد: [ساعت بعد از انتشار، قیمت]
const PATH={
  BTC:[[-1,60000],[0,60000],[6,61000],[20,62500],[200,62500]],          // برد
  ETH:[[-1,3000],[0,3000],[3,3050],[10,3150],[200,3150]],               // شورت، استاپ
  SOL:[[-1,160],[0,160],[8,168],[30,175],[200,175]],                    // لیمیت 150، برنگشت → فعال نشد
  XRP:[[-1,2.0],[200,2.0]],                                             // قیمت اعلامی 0٫6 → مشکوک
  DOGE:[[-1,0.1],[0,0.1],[5,0.102],[12,0.121],[200,0.121]],             // فقط روی MEXC
};
const MEXC_ONLY=new Set(['DOGE']);
const px=(sym,t)=>{const p=PATH[sym];const h=(t-T0)/H;
  if(h<=p[0][0])return p[0][1];
  for(let i=1;i<p.length;i++)if(h<=p[i][0]){const [h0,v0]=p[i-1],[h1,v1]=p[i];return v0+(v1-v0)*(h-h0)/(h1-h0);}
  return p[p.length-1][1];};
const IV={'1m':60000,'5m':300000,'1h':3600000,'60m':3600000};
const kl=(sym,iv,st,lim)=>{const ms=IV[iv],out=[];
  for(let t=st;t<NOW&&out.length<lim;t+=ms){const o=px(sym,t),c=px(sym,t+ms);
    out.push([t,String(o),String(Math.max(o,c)),String(Math.min(o,c)),String(c),'1',t+ms-1]);}
  return out;};
let calls={binance:0,fapi:0,mexc:0};
const mkPost=(n,t,at,reply)=>`<div class="tgme_widget_message" data-post="c/1893051/${n}"><div class="tgme_widget_message_bubble">`+
  (reply?`<a class="tgme_widget_message_reply" href="https://t.me/c/1893051/${reply}"><div class="tgme_widget_message_text">x</div></a>`:'')+
  `<div class="tgme_widget_message_text">${t}</div><time datetime="${new Date(at).toISOString()}"></time></div></div>`;
let POSTS_SRC=[
 [910,'#بیت_کوین لانگ فیوچرز<br>ورود 60000<br>حد ضرر 59000<br>تارگت 62000',T0],
 [909,'#اتریوم شورت<br>ورود 3000<br>حد ضرر 3100<br>تارگت 2800',T0],
 [908,'#سولانا لانگ اسپات<br>ورود 150<br>حد ضرر 140<br>تارگت 170',T0],
 [907,'#ریپل لانگ<br>ورود 0.6<br>حد ضرر 0.55<br>تارگت 0.7',T0],
 [906,'#کاردانو لانگ ورود 0.5 تارگت 0.6',T0],
 [905,'#DOGE لانگ<br>ورود 0.1<br>حد ضرر 0.095<br>تارگت 0.12',T0],
 [904,'تارگت اول بیت کوین زده شد ✅',T0+30*H,910],
 [903,'تارگت اول اتریوم زده شد ✅ سیو سود',T0+40*H,909],
 [902,'تارگت اول سولانا زده شد ✅',T0+40*H,908],
 [901,'یک نکته‌ی آموزشی درباره‌ی مدیریت سرمایه',T0+1*H],
 [900,'#بیت_کوین لانگ<br>ورود 60000<br>حد ضرر 59000<br>تارگت 62000<br>اگر تارگت اول را زد، استاپ را به نقطه‌ی ورود بیاورید',T0-2*H],
];
const channelHtml=()=>'<html><body>'+POSTS_SRC.map(x=>mkPost(...x)).join('')+'</body></html>';
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:channelHtml()});
  const m=u.match(/(api\.binance\.com|fapi\.binance\.com|api\.mexc\.com).*klines\?symbol=([A-Z]+)USDT&interval=(\w+)&startTime=(\d+)&limit=(\d+)/);
  if(m){const [,host,s,iv,st,lim]=m, sym=s;
    const src=host.startsWith('api.binance')?'binance':host.startsWith('fapi')?'fapi':'mexc';calls[src]++;
    const has=PATH[sym]&&(src==='mexc'||!MEXC_ONLY.has(sym));
    if(!has)return r.fulfill({status:400,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:'{"code":-1121,"msg":"Invalid symbol."}'});
    return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(kl(sym,iv,+st,+lim))});}
  if(u.includes('ticker/price'))return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},
    body:JSON.stringify(Object.keys(PATH).map(s=>({symbol:s+'USDT',price:String(px(s,NOW))})).concat(Array.from({length:30},(_,i)=>({symbol:'Z'+i+'USDT',price:'1'}))))});
  return r.abort();});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.waitForTimeout(4500);
 await p.evaluate(()=>{DB.lessons['c/1893051/901']={id:'c/1893051/901',title:'مدیریت سرمایه',text:'x',at:Date.now()};save();});
 // برو به کانال‌سنج و بگذار بسنجد
 await p.click('.tab[data-v="audit"]');
 await p.waitForFunction(()=>!AUDQ.on&&AUDQ.at>0,{timeout:60000});
 await p.waitForTimeout(600);
 const st=await p.evaluate(()=>{const o={};for(const x of POSTS){const a=AUD[x.id];if(a)o[x.id.split('/').pop()]=
   {st:a.st,why:a.why,mode:a.mode,late:a.late};}return o;});
 console.log('=== وضعیت‌ها ===');for(const k in st)console.log('  #'+k,JSON.stringify(st[k]));
 console.log('  درخواست کندل:',JSON.stringify(calls));
 ok(st['910']&&st['910'].st==='win','BTC: برد');
 ok(st['909']&&st['909'].st==='loss','ETH شورت: استاپ');
 ok(st['908']&&st['908'].st==='none'&&st['908'].why==='ran','SOL: قیمت برنگشت، مستقیم به تارگت رفت');
 ok(st['907']&&st['907'].st==='bad'&&st['907'].why==='px','XRP: قیمت اعلامی 0٫6 در برابر بازار 2 → نماد مشکوک');
 ok(st['906']&&st['906'].st==='bad'&&st['906'].why==='no-stop','ADA: بدون استاپ → نیاز به بررسی');
 ok(st['905']&&st['905'].st==='win','DOGE: بایننس نداشت، از MEXC آمد و برد');
 ok(calls.mexc>0,'پشتیبانِ MEXC واقعاً استفاده شد');
 ok(!st['904']&&!st['901'],'پست نتیجه و آموزش سنجیده نمی‌شوند');
 const g=await p.evaluate(()=>({b900:postKind(POSTS.find(x=>x.id==='c/1893051/900')),
   b904:postKind(POSTS.find(x=>x.id==='c/1893051/904')),b902:postKind(POSTS.find(x=>x.id==='c/1893051/902'))}));
 ok(g.b900==='sig','سیگنالِ دارای «اگر تارگت اول را زد…» در فهرست فعال ماند');
 ok(g.b904==='res'&&g.b902==='res','«تارگت اول بیت کوین زده شد» حالا نتیجه شناخته می‌شود');

 console.log('\n=== ادعاها ===');
 const cl=await p.evaluate(()=>claimsAll().map(x=>({id:x.p.id.split('/').pop(),v:x.vd.v,why:x.vd.why,how:x.tg&&x.tg.how})));
 for(const c of cl)console.log('  #'+c.id,c.v,c.how,'—',c.why);
 const C=Object.fromEntries(cl.map(x=>[x.id,x]));
 ok(C['904']&&C['904'].v==='ok','ادعای تارگت BTC: درست');
 ok(C['903']&&C['903'].v==='no'&&/استاپ/.test(C['903'].why),'ادعای تارگت ETH: نادرست — قبلش استاپ خورده بود');
 ok(C['902']&&C['902'].v==='no'&&/قابل گرفتن نبود|برگشتن/.test(C['902'].why),'ادعای تارگت SOL: نادرست — ورود هیچ‌وقت فعال نشد');

 console.log('\n=== صفحه‌ی کانال‌سنج ===');
 const ui=await p.evaluate(()=>({
   stats:(()=>{const x=[...document.querySelectorAll('#audBody .panel')].find(q=>/کارنامه‌ی کانال/.test(q.textContent));
     return x?[...x.querySelectorAll('.st')].map(s=>s.querySelector('b').textContent+'='+s.querySelector('span').textContent).join(' | '):'';})(),
   panels:[...document.querySelectorAll('#audBody .panelhead b')].map(x=>x.textContent),
   rows:document.querySelectorAll('#audBody .arow2').length,
   badge:document.querySelector('#cAud').textContent}));
 console.log('  کارنامه:',ui.stats);
 console.log('  بخش‌ها:',ui.panels.join(' · '));
 // #900 هم BTC با همان عددهاست ولی 2 ساعت زودتر → برد +2R
 ok(/نرخ برد=75٪/.test(ui.stats),'نرخ برد: 3 برد از 4 = 75٪');
 // BTC ×2: +2R+2R ؛ DOGE: (0.12-0.1)/0.005 = +4R ؛ ETH −1R → مجموع +7R
 ok(/مجموع R=\+7\.00R/.test(ui.stats),'مجموع R = 2 + 2 + 4 − 1 = +7R');
 ok(ui.panels.length>=6,'همه‌ی بخش‌ها ساخته شدند');
 ok(ui.rows===7,'هفت سیگنال در فهرست');
 ok(ui.badge==='2','نشان تب: 2 ادعای نادرست');
 const sel=await p.evaluate(()=>{const x=[...document.querySelectorAll('#audBody .st')];
   const g=l=>{const s=x.find(q=>q.querySelector('b').textContent===l);return s?s.querySelector('span').textContent:null;};
   return {w:g('گزارشِ بردها'),l:g('اعترافِ باخت‌ها')};});
 console.log('  گزارش بردها:',sel.w,'· اعتراف باخت‌ها:',sel.l);
 ok(sel.l==='0٪','ادعای دروغِ برد روی باختِ ETH «اعتراف به باخت» شمرده نمی‌شود');

 console.log('\n=== فیلتر (بک‌تست) ===');
 const f=await p.evaluate(()=>{AF.dir='long';renderAudit();
   const a=[...document.querySelectorAll('#audBody .st')].find(s=>s.querySelector('b').textContent==='مجموع R').querySelector('span').textContent;
   AF.dir='all';AF.sym='BTC';renderAudit();
   const b2=[...document.querySelectorAll('#audBody .st')].find(s=>s.querySelector('b').textContent==='مجموع R').querySelector('span').textContent;
   AF.sym='';renderAudit();return {long:a,btc:b2};});
 console.log('  فقط لانگ:',f.long,'· فقط BTC:',f.btc);
 ok(f.long==='+8.00R','فقط لانگ‌ها: +8R (شورتِ بازنده حذف شد)');
 ok(f.btc==='+4.00R','فقط BTC: +4R');

 console.log('\n=== قانون پله‌ای ===');
 const lad=await p.evaluate(()=>{S.aud=Object.assign({},S.aud,{rule:'ladder'});renderAudit();
   const v=[...document.querySelectorAll('#audBody .st')].find(s=>s.querySelector('b').textContent==='مجموع R').querySelector('span').textContent;
   S.aud.rule='tp1';renderAudit();return v;});
 console.log('  پله‌ای:',lad);
 ok(lad==='+7.00R','با یک تارگت، پله‌ای همان نتیجه را می‌دهد (همه در تارگت اول)');

 console.log('\n=== فید ===');
 await p.click('.tab[data-v="signals"]');await p.waitForTimeout(500);
 const feed=await p.evaluate(()=>{bucket='live';sigFilter='all';renderSignals();
   const cards=[...document.querySelectorAll('#list .card')];
   const pill=id=>{const c=cards.find(c=>c.dataset.id==='c/1893051/'+id);return c?[...c.querySelectorAll('.chead .pill')].map(x=>x.textContent).join(' | '):null;};
   bucket='res';renderSignals();
   const res=[...document.querySelectorAll('#list .card')].map(c=>[...c.querySelectorAll('.chead .pill')].map(x=>x.textContent).join(' | '));
   go('learn',true);
   const les=document.querySelector('#lessonList').textContent.includes('مدیریت سرمایه');
   go('signals',true);bucket='live';renderSignals();
   return {btc:pill(910),eth:pill(909),res,les};});
 console.log('  BTC:',feed.btc);console.log('  ETH:',feed.eth);console.log('  نتایج:',feed.res.join(' // '));
 ok(/برد \+2\.00R/.test(feed.btc),'روی کارت BTC: «برد +2R»');
 ok(/استاپ خورد/.test(feed.eth),'روی کارت ETH: «استاپ خورد»');
 ok(feed.res.some(x=>/ادعا نادرست/.test(x))&&feed.res.some(x=>/ادعا درست/.test(x)),'روی پست‌های نتیجه حکمِ ادعا');
 ok(feed.les,'تب آموزش، آموزش‌ها را نشان می‌دهد');

 console.log('\n=== ویرایش و حذف ===');
 // کانال عددِ استاپِ BTC را بعداً عوض می‌کند و پست ADA را پاک می‌کند
 POSTS_SRC=POSTS_SRC.map(x=>x[0]===910?[910,'#بیت_کوین لانگ فیوچرز<br>ورود 60000<br>حد ضرر 58000<br>تارگت 62000',T0]:x)
   .filter(x=>x[0]!==906);
 await p.evaluate(()=>refresh(false,true));await p.waitForTimeout(2500);
 const once=await p.evaluate(()=>({gone:Object.keys(DB.gone).length,edit:DB.edits['c/1893051/910']}));
 await p.evaluate(()=>refresh(false,true));await p.waitForTimeout(2500);
 const ed=await p.evaluate(()=>({e:DB.edits['c/1893051/910'],gone:Object.keys(DB.gone),
   inp:audInput(POSTS.find(x=>x.id==='c/1893051/910')).stop,
   now:parseSignal(POSTS.find(x=>x.id==='c/1893051/910').text).stop}));
 console.log('  ویرایش:',JSON.stringify(ed.e&&{nums:ed.e.nums}),'· حذف:',ed.gone.join(','));
 ok(ed.e&&ed.e.nums,'ویرایشِ عدد ثبت شد');
 ok(ed.inp===59000&&ed.now===58000,'کانال‌سنج با استاپِ اولِ منتشرشده (59000) حساب می‌کند، نه ویرایش‌شده');
 ok(once.gone===0,'یک بار نبودن هنوز «حذف» نیست');
 ok(ed.gone.includes('c/1893051/906'),'دو بار پشت سر هم نبودن → حذف ثبت شد');

 console.log('\n=== کارنامه: شما در برابر کانال ===');
 await p.evaluate(()=>{DB.decisions['c/1893051/909']={action:'skipped',at:Date.now(),reason:'قیمت رفته بود'};save();go('report');});
 await p.waitForTimeout(700);
 const rep=await p.evaluate(()=>document.querySelector('#repBody').textContent.replace(/\s+/g,' '));
 ok(/شما در برابر کانال/.test(rep)&&/قیمت رفته بود/.test(rep),'کارنامه مقایسه‌ی واقعی را نشان می‌دهد');
 ok(!/قیمت همین لحظه/.test(rep),'گزارشِ قیمت‌لحظه‌ای کنار رفت');

 console.log('\n=== ماندگاری ===');
 await p.reload({waitUntil:'load'});await p.waitForTimeout(4500);
 const kept=await p.evaluate(()=>({n:Object.keys(AUD).length,ed:!!DB.edits['c/1893051/910'],
   orig:!!POSTS.find(x=>x.id==='c/1893051/910').origText}));
 ok(kept.n>=7,'نتایج سنجش بعد از بارگذاری دوباره مانده ('+kept.n+')');
 ok(kept.ed&&kept.orig,'ویرایش و متن اولیه ماندگارند');
 const before=calls.binance+calls.mexc+calls.fapi;
 await p.click('.tab[data-v="audit"]');await p.waitForTimeout(3000);
 const after=calls.binance+calls.mexc+calls.fapi;
 console.log('  درخواست کندلِ اضافه بعد از بارگذاری دوباره:',after-before);
 ok(after-before<=4,'نتیجه‌های قطعی دوباره گرفته نمی‌شوند');
 await b.close();})();
