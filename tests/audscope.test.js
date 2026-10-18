/* کانال‌سنج: فهرست «همه‌ی سیگنال‌ها» پیش‌فرض همان دامنه‌ی کارنامه‌ی کانال است («همان لحظه») تا عدد برد و باخت با
   «سنجیده»ی کارنامه یکی باشد؛ «یادآوری‌های قدیمی» و «همه» با یک زدن، و انتخاب می‌ماند */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(async()=>{const W=ms=>new Promise(r=>setTimeout(r,ms)),o={},D=864e5,now=Date.now();
   audRun=()=>{};
   const sigs=POSTS.filter(x=>{const i=audInput(x);return i&&i.entry&&i.stop&&i.tps.length&&!i.old&&!i.mktE;});
   const R=audRules(),keep=new Map();
   const put=(x,st)=>{const i=audInput(x);keep.set(x.id,AUD[x.id]);AUD[x.id]={k:audKey(i,R),st,fin:st!=='open',at:now,tAct:i.t0,tTp:st==='win'?[i.t0+36e5]:[],tStop:st==='loss'?i.t0+36e5:null,tEnd:i.t0+36e5,close:{t:now,px:i.entry}};};
   // دو یادآوری قدیمی برنده
   const old=sigs.slice(0,2);for(const x of old){OVERRIDE[x.id]=Object.assign({},OVERRIDE[x.id],{sig:true,t0:(x.date?+x.date:now)-60*D,old:true});PCACHE.delete(x.id);}
   DB.overrides=OVERRIDE;for(const x of old)put(x,'win');
   for(const x of sigs.slice(2))put(x,'loss');
   go('audit',true);AUDOPEN='کارنامه‌ی کانال';renderAudit();await W(100);
   const tile=t=>{const s=[...document.querySelectorAll('#vAudit .st')].find(z=>(z.querySelector('b')||{}).textContent===t);return s?s.querySelector('span').textContent:'';};
   o.measured=tile('سنجیده');
   AUDOPEN='فهرست سیگنال‌ها';renderAudit();await W(100);
   const chips=()=>Object.fromEntries([...document.querySelectorAll('#vAudit .panel .catrow:not(.audscope) .catchip')].map(c=>[c.firstChild.textContent.trim(),+c.querySelector('i').textContent]));
   const scope=()=>[...document.querySelectorAll('#vAudit .audscope .catchip')].map(c=>c.textContent+(c.classList.contains('on')?'*':''));
   o.scope0=scope();o.live=chips();
   [...document.querySelectorAll('#vAudit .audscope .catchip')][1].click();await W(100);o.old=chips();o.saved=localStorage.getItem('signaldesk.audscope');
   [...document.querySelectorAll('#vAudit .audscope .catchip')][2].click();await W(100);o.all=chips();
   localStorage.setItem('signaldesk.audscope','live');AUDSCOPE='live';
   for(const x of old){const v=OVERRIDE[x.id];delete v.t0;delete v.old;delete v.sig;if(!Object.keys(v).length)delete OVERRIDE[x.id];PCACHE.delete(x.id);}
   DB.overrides=OVERRIDE;for(const [id,a] of keep){if(a)AUD[id]=a;else delete AUD[id];}
   o.nOld=old.length;o.nLive=sigs.length-2;return o;});
 console.log('   ',JSON.stringify(r));
 ok(/همان لحظه.*\*/.test(r.scope0[0])&&r.scope0.length===3,'پیش‌فرض «همان لحظه (مثل کارنامه)» '+JSON.stringify(r.scope0));
 ok(r.live['برد']===0&&r.live['باخت']===r.nLive&&+r.measured===r.live['برد']+r.live['باخت'],'«همان لحظه»: برد و باخت فهرست = «سنجیده»ی کارنامه ('+r.measured+')');
 ok(r.old['برد']===r.nOld&&r.old['همه']===r.nOld&&r.saved==='old','«یادآوری‌های قدیمی»: فقط '+r.nOld+' برد قدیمی، و انتخاب ماند');
 ok(r.all['برد']===r.nOld&&r.all['باخت']===r.nLive,'«همه»: هر دو با هم');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');process.exit(bad?1:0);})();
