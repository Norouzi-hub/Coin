const {chromium} = require('./lib').pw;
const TITLES=['آموزش چارت‌خوانی؛ ورود، حد ضرر و اهداف','آموزش تنظیم سفارش Trigger در صرافی Ourbit','محاسبه ریسک، حجم و اهرم با کمک ChatGPT','ماشین‌حساب محاسبه ریسک و اهرم','تایم‌فریم 4 ساعته و سشن‌های مهم معاملاتی','تفاوت Trigger و Confirm','اگر پوزیشن ریجکت شد، چه کار کنیم؟','نحوه ریسک‌فری و مدیریت پوزیشن','حداکثر تعداد پوزیشن‌ها، ریسک مجاز و سیو سود'];
const INDEX='📌 #دستورالعمل_ترید<br><br>همه اعضای کانال لطفاً آموزش‌های زیر رو به‌ترتیب مطالعه کنید 👇<br><br>'+
  TITLES.map((t,i)=>`🔹 ${t}<br><a href="https://t.me/ccoineres/${54648+i}">https://t.me/ccoineres/${54648+i}</a>`).join('<br><br>')+'<br><br>⚠️ این مطالب پایه دستورالعمل معاملاتی کانال هستند.';
function post(n){
  let body, media='';
  if(n===54657)body=INDEX;
  else if(n>=54648&&n<=54656){
    const i=n-54648;
    body=`درس ${i+1}: ${TITLES[i]}<br>`+'این متن آموزشی کانال است. '.repeat(i===0?30:3);
    if(i===1)media=`<a class="tgme_widget_message_video_player"><i class="tgme_widget_message_video_thumb" style="background-image:url('https://cdn.example/v${n}.jpg')"></i><video src="https://cdn.example/v${n}.mp4" class="tgme_widget_message_video"></video></a>`;
    else if(i===0)media=`<div class="tgme_widget_message_grouped"><a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn.example/a.jpg')"></a><a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn.example/b.jpg')"></a></div>`;
    else media=`<a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn.example/p${n}.jpg')"></a>`;
  }else body=n%3?'#بیت_کوین لانگ<br>ورود 65000<br>حد ضرر 63500':'یک پست معمولی '+n;
  return `<div class="tgme_widget_message" data-post="ccoineres/${n}"><div class="tgme_widget_message_bubble">${media}<div class="tgme_widget_message_text">${body}</div><time datetime="${new Date(Date.now()-864e5).toISOString()}"></time></div></div>`;
}
const TOP=54700;
function page(before){const hi=Math.min(before?before-1:TOP,TOP), lo=Math.max(hi-19,54600);
  let h='';for(let n=lo;n<=hi;n++)h+=post(n);
  return `<html><body>${h}${lo>54600?`<a class="tme_messages_more" data-before="${lo}"></a>`:''}</body></html>`;}
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:360,height:900}});
 p.on('pageerror',e=>console.log('PAGEERROR:',e.message));p.on('dialog',d=>d.accept());
 const reqs=[];
 await p.route('**',r=>{const u=r.request().url();
  if(u.includes('localhost:8899'))return r.continue();
  if(u.includes('t.me/s/')){const bf=new URL(u).searchParams.get('before');reqs.push(bf);
    return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:page(bf?+bf:null)});}
  if(u.includes('cdn.example')&&u.endsWith('.jpg'))return r.fulfill({status:200,headers:{'content-type':'image/png'},
    body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64')});
  return r.abort();});
 // آموزش‌های قدیمی از نسخه‌ی قبل
 await p.addInitScript(()=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
   localStorage.setItem('signaldesk.v1',JSON.stringify({positions:[],decisions:{},settings:{},overrides:{},
     lessons:{'ccoineres/100':{id:'ccoineres/100',title:'قدیمی ۱',text:'x',at:1},'ccoineres/101':{id:'ccoineres/101',title:'قدیمی ۲',text:'y',at:2}},
     archived:{},results:{}}));});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
 const key=await p.evaluate(()=>KEY);
 if(key!=='signaldesk.v1')console.log('  (KEY='+key+')');
 await p.waitForTimeout(7000);
 const st=await p.evaluate(()=>({les:Object.values(DB.lessons).map(L=>({n:L.num,g:!!L.guide,o:L.ord,t:L.title,img:!!L.img,imgs:(L.imgs||[]).length,v:!!L.video})),
   bak:!!localStorage.getItem('signaldesk.lessons.bak'),list:guideList().length}));
 ok(!st.les.some(L=>!L.g),'آموزش‌های قدیمی پاک شدند');
 ok(st.bak,'یک نسخه‌ی پشتیبان از آموزش‌های قدیمی ماند');
 ok(st.les.length===9&&st.les.every(L=>L.g),'9 درس دستورالعمل خودکار از کانال آمد ('+st.les.length+')');
 const byN=Object.fromEntries(st.les.map(L=>[L.n,L]));
 ok(byN[54648]&&byN[54648].imgs===2,'درس 1 آلبوم دوعکسی دارد');
 ok(byN[54649]&&byN[54649].v,'درس 2 ویدیو دارد');
 ok(byN[54656]&&byN[54656].o===9&&byN[54656].t===TITLES[8],'ترتیب و عنوان از پست فهرست');
 console.log('   درخواست‌های کانال:',JSON.stringify(reqs));
 ok(reqs.filter(x=>x).length<=2,'با کمتر از 3 درخواست اضافه');

 // فید سیگنال‌ها: سطل آموزش دیگر نیست
 const side=await p.$$eval('#fbar .fside .fb',e=>e.map(x=>x.textContent));
 ok(!side.some(x=>x.includes('آموزش')),'سطل آموزش از نوار فیلتر برداشته شد '+JSON.stringify(side));
 // تب پایین
 const tabs=await p.$$eval('.tab',e=>e.map(t=>t.textContent.trim()));
 ok(tabs.some(t=>t.startsWith('آموزش')),'تب آموزش در منوی پایین '+JSON.stringify(tabs));
 const badge=await p.$eval('#cLearn',e=>e.classList.contains('z')?'':e.textContent);
 ok(badge==='9','نشان تب: 9 درس نخوانده');
 const fit=await p.evaluate(()=>{const n=document.getElementById('tabs');return n.scrollWidth<=n.clientWidth+1;});
 ok(fit,'5 تب در عرض 360 جا می‌شوند');
 await p.click('.tab[data-v="learn"]');await p.waitForTimeout(500);
 const g=await p.evaluate(()=>({cards:[...document.querySelectorAll('.gcard')].map(c=>c.querySelector('.gttl').textContent),
   prog:document.querySelector('.gprog span').textContent,warn:!!document.querySelector('.gwarn')}));
 ok(g.cards.length===9&&g.cards[0]===TITLES[0],'9 کارت به ترتیب');
 ok(g.prog.includes('0 از 9'),'پیشرفت: '+g.prog);
 await p.screenshot({path:require('./lib').out('guide_list.png')});
 // باز کردن درس 1 و «خواندم»
 await p.evaluate(()=>document.querySelectorAll('.gcard .ghead')[0].click());await p.waitForTimeout(300);
 const o1=await p.evaluate(()=>{const c=document.querySelectorAll('.gcard')[0];return {shots:c.querySelectorAll('.shot').length,txt:!!c.querySelector('.txt'),clamp:!!c.querySelector('.txt.clamp')};});
 ok(o1.shots===2&&o1.txt&&o1.clamp,'درس 1 باز شد: دو عکس و متن جمع‌شده');
 await p.screenshot({path:require('./lib').out('guide_open.png')});
 await p.evaluate(()=>[...document.querySelectorAll('.gcard')[0].querySelectorAll('.markrow .mark')].find(b=>b.textContent==='خواندم').click());
 await p.waitForTimeout(300);
 const after=await p.evaluate(()=>({done:document.querySelectorAll('.gcard')[0].classList.contains('done'),
   open2:document.querySelectorAll('.gcard')[1].classList.contains('open'),badge:document.getElementById('cLearn').textContent,
   prog:document.querySelector('.gprog span').textContent,vid:!!document.querySelectorAll('.gcard')[1].querySelector('video')}));
 ok(after.done&&after.open2,'بعد از «خواندم»، درس 1 تیک خورد و درس 2 باز شد');
 ok(after.vid,'درس 2 پخش‌کننده‌ی ویدیو دارد');
 ok(after.badge==='8'&&after.prog.includes('1 از 9'),'نشان 8 و پیشرفت '+after.prog);
 // جستجو
 await p.fill('#lq','ریجکت');await p.waitForTimeout(400);
 const sr=await p.$$eval('.gcard .gttl',e=>e.map(x=>x.textContent));
 ok(sr.length===1&&sr[0].includes('ریجکت'),'جستجوی «ریجکت»: '+JSON.stringify(sr));
 await p.fill('#lq','');await p.waitForTimeout(300);
 // ماندگاری بعد از رفرش؛ دوباره پاک نمی‌کند
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForTimeout(3500);
 const r2=await p.evaluate(()=>({n:Object.values(DB.lessons).filter(L=>L.guide).length,read:Object.values(DB.lessons).filter(L=>L.read).length}));
 ok(r2.n===9&&r2.read===1,'بعد از رفرش: 9 درس و وضعیت خوانده‌شده ماند');
 // آموزش جدید از پست بعد از مهاجرت پاک نمی‌شود
 await p.evaluate(()=>{addLesson(POSTS.find(x=>x.num===54690));});
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForTimeout(3000);
 ok(await p.evaluate(()=>!!DB.lessons['ccoineres/54690']),'آموزشی که بعداً اضافه شود پاک نمی‌شود');
 await b.close();
})();
