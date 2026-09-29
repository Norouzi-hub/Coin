const {chromium}=require('./lib').pw;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
(async()=>{
 const b=await chromium.launch();const p=await b.newPage();
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));
 await p.route('**',r=>r.request().url().includes('localhost:8899')?r.continue():r.abort());
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.waitForTimeout(1500);
 const R=await p.evaluate(()=>{
   const H=3600000,t0=Date.UTC(2026,8,1);
   // سازنده‌ی کندل: [open,high,low,close] با فاصله‌ی ۵ دقیقه
   const mk=rows=>rows.map((r,i)=>({t:t0+i*300000,o:r[0],h:r[1],l:r[2],c:r[3]}));
   const R={days:30,entryDays:3,tol:1,rule:'tp1'};
   const L={tk:'X',dir:'long',entry:100,trig:null,stop:95,tps:[110,120,130],t0};
   const S={tk:'X',dir:'short',entry:100,trig:null,stop:105,tps:[90,80],t0};
   const w=(inp,rows,rr)=>{const r=audWalk(inp,mk(rows),rr||R);return {st:r.st,why:r.why,mode:r.mode,
     amb:!!r.amb,tp:r.tTp.filter(x=>x!=null).length,stop:!!r.tStop,late:r.late,chase:r.chase,fin:r.fin,
     R1:audR(r,inp,'tp1'),RL:audR(r,inp,'ladder'),be:r.tBE!=null};};
   const o={};
   o.win   =w(L,[[100,101,99,100],[100,106,99,105],[105,111,104,110]]);
   o.loss  =w(L,[[100,101,99,100],[100,101,94,95]]);
   o.all3  =w(L,[[100,101,99,100],[100,131,99,130]]);
   o.ambig =w(L,[[100,111,94,100]]);                      // یک کندل هم استاپ هم تارگت
   o.limit =w(L,[[104,105,103,104],[104,104,99.5,100],[100,111,99,110]]);   // منتظر برگشت
   o.ran   =w(L,[[104,105,103,104],[104,111,103,110]]);   // بدون برگشت رفت
   o.limSL =w(L,[[104,105,103,104],[104,104,94,95]]);     // برگشت و مستقیم استاپ: ترتیب اجباری
   o.brk   =w(L,[[97,98,96,97],[97,101,96.5,100.5],[100,111,99,110]]);   // شکست
   o.brkBad=w(L,[[97,98,96,97],[97,98,94,95]]);           // قبل از شکست، استاپ رد شد
   o.brkMix=w(L,[[97,101,94,96]]);                        // شکست و استاپ در یک کندل
   o.brkUp =w(L,[[97,98,96,97],[97,112,96.5,111]]);       // شکست و تارگت در یک کندل: اجباری
   o.late  =w(L,[[111,112,110,111]]);
   o.chase =w(L,[[106,107,105,106]]);
   o.short =w(S,[[100,101,99,100],[100,101,89,90]]);
   o.shortL=w(S,[[100,101,99,100],[100,106,99,105]]);
   const exp=[];for(let i=0;i<8700;i++)exp.push([100,102,98,101]);
   o.exp   =w(L,exp);
   const tmo=[];for(let i=0;i<900;i++)tmo.push([104,105,103,104]);
   o.timeout=w(L,tmo);
   // پله‌ای: تارگت ۱، برگشت به ورود → دو پله‌ی بعد صفر
   o.ladBE =w(L,[[100,101,99,100],[100,111,104,110],[110,110,99.5,100],[100,100,94,95]]);
   o.lad2  =w(L,[[100,101,99,100],[100,121,104,120],[120,120,99,100]]);
   o.noTp  =w({...L,tps:[]},[[100,101,99,100],[100,101,94,95]]);
   return o;});
 const exp={win:['win',1,2],loss:['loss',-1,-1],all3:['win',2,2],limit:['win',2,null],ran:['none'],limSL:['loss'],
   brk:['win'],brkBad:['none'],brkUp:['win'],short:['win',1],shortL:['loss',-1],exp:['exp'],timeout:['none'],ladBE:['win']};
 for(const [k,v] of Object.entries(R))console.log('  '+k.padEnd(8),JSON.stringify(v));
 console.log('\n=== سنجش ===');
 ok(R.win.st==='win'&&R.win.R1===2,'برد ساده: تارگت اول = +۲R');
 ok(R.loss.st==='loss'&&R.loss.R1===-1,'باخت: −۱R');
 ok(R.all3.st==='win'&&R.all3.tp===3&&R.all3.fin,'هر سه تارگت در یک کندل صعودی');
 ok(R.ambig.amb&&R.ambig.st==='open','کندلِ دوپهلو حدس زده نمی‌شود (amb)');
 ok(R.limit.mode==='limit'&&R.limit.st==='win','ورود لیمیت: منتظر برگشت، بعد برد');
 ok(R.ran.st==='none'&&R.ran.why==='ran','بدون برگشت به ورود رفت → «فعال نشد/فرار کرد»');
 ok(R.limSL.st==='loss','لیمیت: برگشت و استاپ در یک کندل → باخت (ترتیب اجباری)');
 ok(R.brk.mode==='break'&&R.brk.st==='win','ورود شکستی، بعد برد');
 ok(R.brkBad.st==='none'&&R.brkBad.why==='inval','قبل از شکست استاپ رد شد → باطل');
 ok(R.brkMix.amb,'شکست و استاپ در یک کندل → دوپهلو');
 ok(R.brkUp.st==='win','شکست و تارگت در یک کندل → برد (ترتیب اجباری)');
 ok(R.late.late,'قیمت انتشار از تارگت اول گذشته → «دیرهنگام»');
 ok(R.chase.chase&&!R.chase.late,'بیشترِ راه تا تارگت رفته بود → «ورود دیر»');
 ok(R.short.st==='win'&&R.short.R1===2,'شورت برد +۲R');
 ok(R.shortL.st==='loss','شورت باخت');
 ok(R.exp.st==='exp'&&Math.abs(R.exp.R1-0.2)<1e-9,'منقضی بعد از ۳۰ روز با قیمت بسته شدن (+۰٫۲R)');
 ok(R.timeout.st==='none'&&R.timeout.why==='timeout','ورود در ۳ روز فعال نشد');
 // پله‌ای: پله‌ی اول +۲R، دو پله در ورود صفر → میانگین ۰٫۶۷
 ok(R.ladBE.be&&Math.abs(R.ladBE.RL-2/3)<1e-9,'پله‌ای با برگشت به ورود: (۲+۰+۰)/۳ = +۰٫۶۷R');
 ok(Math.abs(R.lad2.RL-(2+4+0)/3)<1e-9,'پله‌ای دو تارگت: (۲+۴+۰)/۳ = +۲R');
 // کفِ کندلِ شکست قبل از شکست بود، نه برگشت بعد از تارگت
 ok(!R.brkUp.be,'کندل شکست: کفِ پیش از شکست «برگشت به ورود» حساب نمی‌شود');
 ok(!R.short.be,'کندلِ تارگت: سقفِ پیش از ریزش «برگشت به ورود» حساب نمی‌شود');
 ok(R.ladBE.be,'برگشت واقعی در کندل بعدی هنوز دیده می‌شود');
 ok(R.noTp.st==='loss','بدون تارگت هم باخت درست تشخیص داده می‌شود');
 await b.close();})();
