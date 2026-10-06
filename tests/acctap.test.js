/* زدن روی پست در فهرست بلند: کارت باید همان‌جا باز شود، صفحه نپرد و به ته نرود.
   بروزرسانی خودکار (هر دقیقه renderAll) هم نباید جای خواندن را عوض کند. */
const {pw}=require('./lib');const {chromium}=pw;
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
const H=36e5,tk=['BTC','ETH','SOL','XRP','ADA','DOGE','BNB','AVAX'];
const post=(n,h,t)=>`<div class="tgme_widget_message" data-post="ccoineres/${n}"><div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${t}</div><time datetime="${new Date(Date.now()-h*H).toISOString()}"></time></div></div>`;
const html='<html><body>'+Array.from({length:40},(_,i)=>post(5000-i,i*2,
  '#'+tk[i%8]+' لانگ فیوچرز<br>ورود '+(100+i)+'<br>حد ضرر '+(90+i)+'<br>تارگت '+(110+i)+'<br>تارگت '+(120+i)+'<br>تحلیل: '+'متن توضیح سیگنال برای بلند شدن کارت. '.repeat(4))).join('')+'</body></html>';
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:800},hasTouch:true,isMobile:true});
 await ctx.route('**',r=>{const u=r.request().url();if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:html});
  if(u.includes('ticker/price'))return r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(tk.map(s=>({symbol:s+'USDT',price:'105'})).concat(Array.from({length:40},(_,i)=>({symbol:'Z'+i+'USDT',price:'1'}))))});
  return r.abort();});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(3500);
 await p.evaluate(()=>{sigFilter='all';renderAll();});await p.waitForTimeout(800);
 const n=await p.evaluate(()=>document.querySelectorAll('#list .card').length);
 ok(n>=20,'فهرست بلند: '+n+' کارت');
 const tops=async id=>p.evaluate(id=>{const c=document.querySelector('#list .card[data-id="'+id+'"]');return c?{top:Math.round(c.getBoundingClientRect().top),open:c.classList.contains('accopen'),y:Math.round(scrollY),max:document.documentElement.scrollHeight-innerHeight}:null;},id);
 for(const [k,label] of [[12,'کارت ۱۲ (اولی باز است، بالای آن)'],[20,'کارت ۲۰ (بعد از کارت باز ۱۲)'],[6,'کارت ۶ (بالاتر از کارت باز)']]){
   const id=await p.evaluate(k=>{const c=[...document.querySelectorAll('#list .card')][k];c.scrollIntoView({block:'center'});return c.dataset.id;},k);
   await p.waitForTimeout(400);
   const before=await tops(id);
   const box=await p.evaluate(id=>{const r=document.querySelector('#list .card[data-id="'+id+'"] .chead').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},id);
   await p.touchscreen.tap(box.x,box.y);
   await p.waitForTimeout(900);
   const after=await tops(id);
   console.log('   ',label,JSON.stringify({before,after}));
   ok(after&&after.open,label+': باز شد');
   ok(after&&Math.abs(after.top-before.top)<=140&&after.top>40,label+': سر جایش ماند (جابه‌جایی '+(after?after.top-before.top:'?')+'px)');
   ok(after&&after.y<after.max-5,label+': به ته صفحه نرفت');
 }
 // بروزرسانی خودکار وسط خواندن
 const id=await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .card')][15];c.scrollIntoView({block:'start'});scrollBy(0,-120);return c.dataset.id;});
 await p.waitForTimeout(400);
 const b0=await tops(id);
 await p.evaluate(()=>{renderAll();renderAll();});await p.waitForTimeout(300);
 const b1=await tops(id);
 ok(Math.abs(b1.top-b0.top)<=2,'بروزرسانی خودکار (renderAll): جای خواندن تکان نخورد ('+(b1.top-b0.top)+'px)');
 ok(await p.evaluate(()=>!document.querySelector('#list .card.enter')),'بروزرسانی: انیمیشن ورودِ کارت‌ها دوباره پخش نشد');
 // بستن با زدن روی سربرگ کارت باز
 const oid=await p.evaluate(()=>{const c=document.querySelector('#list .card.accopen');c.scrollIntoView({block:'center'});
   // سربرگ باید کامل پیدا باشد (نه زیر نوار چسبان بالا)، همان‌طور که کاربر رویش می‌زند
   const hd=document.querySelector('header'), top=hd?hd.getBoundingClientRect().bottom:0, r=c.getBoundingClientRect();
   if(r.top<top+40)window.scrollBy(0,r.top-top-80);return c.dataset.id;});
 await p.waitForTimeout(300);
 const ob=await tops(oid);
 const hb=await p.evaluate(id=>{const r=document.querySelector('#list .card[data-id="'+id+'"] .chead').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},oid);
 await p.touchscreen.tap(hb.x,hb.y);await p.waitForTimeout(600);
 const oa=await tops(oid);
 ok(oa&&!oa.open&&Math.abs(oa.top-ob.top)<=2,'زدن روی سربرگ کارت باز: بسته شد و سر جایش ماند');
 // پوزیشن‌ها: قیمت تازه (renderAll) و باز کردن یک کارت پایین‌تر صفحه را نپراند
 await p.evaluate(()=>{for(let i=0;i<14;i++)DB.positions.push({id:'q'+i,ticker:['BTC','ETH','SOL'][i%3],dir:'long',kind:'futures',entry:100,stop:90,margin:10,lev:5,openedAt:Date.now()-i*36e5,status:'open',targets:[110,120],partials:[],log:[]});
   S.feat.autoexec=false;save();posFilter='open';go('positions',true);renderAll();});
 await p.waitForTimeout(500);
 // کارتِ لنگر همان اولین کارتی است که زیر سربرگ پیداست؛ همان باید سر جایش بماند
 const pid=await p.evaluate(()=>{const c=[...document.querySelectorAll('#posList .card[id]')][7];c.scrollIntoView({block:'start'});
   scrollBy(0,-((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdrH'))||0)+20));return c.id;});
 await p.waitForTimeout(300);
 const pt=id=>p.evaluate(id=>Math.round(document.getElementById(id).getBoundingClientRect().top),id);
 const q0=await pt(pid);await p.evaluate(()=>renderAll());const q1=await pt(pid);
 ok(Math.abs(q1-q0)<=2,'پوزیشن‌ها: بروزرسانی قیمت جای خواندن را عوض نکرد ('+(q1-q0)+'px)');
 const tid=await p.evaluate(()=>[...document.querySelectorAll('#posList .card.pct')][8].id);
 await p.evaluate(id=>document.getElementById(id).scrollIntoView({block:'center'}),tid);await p.waitForTimeout(300);
 const t0=await pt(tid);
 const tb=await p.evaluate(id=>{const r=document.querySelector('#'+id+' .chead').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},tid);
 await p.touchscreen.tap(tb.x,tb.y);await p.waitForTimeout(500);
 const t1=await pt(tid);
 ok(await p.evaluate(id=>document.getElementById(id).classList.contains('pcopen'),tid)&&Math.abs(t1-t0)<=2,'پوزیشن‌ها: کارت باز شد و سر جایش ماند ('+(t1-t0)+'px)');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
