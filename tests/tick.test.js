const {chromium}=require('./lib').pw;
const mkPosts=n=>{const a=[];for(let i=0;i<n;i++){const sig=i%3===0;
  a.push({id:'c/1893051/'+(9000-i),num:9000-i,
    text:sig?'#بیت_کوین لانگ\nورود '+(60000+i)+'\nحد ضرر '+(59000+i):'تحلیل '+i,
    link:'https://t.me/x/'+i,date:new Date(Date.now()-i*3600000).toISOString(),img:null});}
  return a;};
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:900}});
 const cdp=await p.context().newCDPSession(p);
 await p.route('**',r=>r.request().url().includes('localhost:8899')?r.continue():r.abort());
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.evaluate(posts=>localStorage.setItem('signaldesk.cache.v2:ccoineres',
   JSON.stringify({at:Date.now(),posts})),mkPosts(800));
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
 await p.waitForFunction(()=>typeof POSTS!=='undefined'&&POSTS.length>0,{timeout:30000});
 const r=await p.evaluate(()=>{
   const avg=(f,n)=>{let s=0;for(let i=0;i<n;i++){const a=performance.now();f();s+=performance.now()-a;}
     return +(s/n).toFixed(2);};
   return {status:avg(()=>showStatus(),20),ring:avg(()=>paintRing(),20)};});
 console.log('تیکِ هر ثانیه روی گوشی شبیه‌سازی‌شده:');
 console.log('  showStatus',r.status,'ms  +  paintRing',r.ring,'ms  =',(r.status+r.ring).toFixed(2),'ms');
 await b.close();})();
