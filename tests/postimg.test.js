/* عکس پست‌ها وقتی CDN تلگرام باز نیست یا آدرس منقضی شده: از واسط، بعد آدرس تازه از صفحه‌ی پست */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const BIG=Buffer.concat([PNG,Buffer.alloc(400)]);
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900}});await route(ctx);
 const seen=[];
 // CDN مستقیم همیشه بسته؛ از واسط: «زنده» می‌آید، «کهنه» نه؛ صفحه‌ی embed پست آدرس تازه می‌دهد
 await ctx.route(/telesco\.pe/,r=>{seen.push('direct');r.abort();});
 await ctx.route(/cors\.lol|allorigins|codetabs/,r=>{const u=decodeURIComponent(r.request().url());
   if(/embed=1/.test(u)){seen.push('embed');return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},
     body:'<div class="tgme_widget_message"><a class="tgme_widget_message_photo_wrap" style="width:10px;background-image:url(\'https://cdn4.telesco.pe/file/fresh.jpg\')"></a></div>'});}
   if(/fresh\.jpg|live\.jpg/.test(u)){seen.push('proxy-ok');return r.fulfill({status:200,headers:{'content-type':'image/png','access-control-allow-origin':'*'},body:BIG});}
   if(/telesco/.test(u)){seen.push('proxy-404');return r.fulfill({status:404,headers:{'access-control-allow-origin':'*'},body:'no'});}
   return r.fallback();});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2000);
 const st=await p.evaluate(async()=>{
   const mk=(id,img)=>({id,text:'#BTC',img,link:'https://t.me/'+id,date:new Date()});
   const A=mk('ccoineres/88001','https://cdn4.telesco.pe/file/live.jpg'), B=mk('ccoineres/88002','https://cdn4.telesco.pe/file/old.jpg'),
         C=mk('nochan','https://cdn4.telesco.pe/file/old.jpg');
   const box=document.createElement('div');document.body.appendChild(box);
   const sa=postShot(A),sb=postShot(B),sc=postShot(C);box.append(sa,sb,sc);
   for(let i=0;i<60&&!(sa.classList.contains('loaded')&&sb.classList.contains('loaded')&&sc.classList.contains('noimg'));i++)await new Promise(r=>setTimeout(r,250));
   return {a:sa.className,b:sb.className,c:sc.className,bimg:B.img,cbtn:[...sc.querySelectorAll('.noimgb .btn')].map(x=>x.textContent).join(',')};});
 console.log('   ',JSON.stringify(st),seen.join(' '));
 ok(/loaded/.test(st.a),'CDN بسته: عکس از راه واسط آمد');
 ok(/loaded/.test(st.b)&&/fresh\.jpg/.test(st.bimg),'آدرس منقضی: آدرس تازه از صفحه‌ی پست گرفته و ذخیره شد');
 ok(/noimg/.test(st.c)&&st.cbtn==='دوباره,در تلگرام','هیچ راهی نشد: «تصویر باز نشد» با «دوباره» و «در تلگرام»');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
