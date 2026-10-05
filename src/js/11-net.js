/* ==================== شبکه ==================== */
/* درس گرفته از لاگ واقعی:
   1) اتصال مستقیم به t.me را حذف نکن. در مرورگر معمولی به‌خاطر CORS رد می‌شود (سریع و بی‌هزینه)،
      ولی وقتی فایل داخل یک WebView یا با دسترسی محلی باز شده، همین راه کار می‌کند و از همه سریع‌تر است.
   2) مسیرها را پشت سر هم امتحان نکن. سه تایم‌اوت 11 ثانیه‌ای یعنی 33 ثانیه انتظار، در حالی که
      مسیر پنجم در 300 میلی‌ثانیه جواب می‌داد. پس همه با هم فرستاده می‌شوند و اولین جواب درست برنده است. */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LOCAL_ORIGIN=!/^https?:$/.test(location.protocol);

/* هر مسیر: نام، سازنده‌ی آدرس، و اگر پاسخ را در پوسته‌ای می‌پیچد، بازکننده‌اش */
const BASE_ROUTES=[
  {id:'direct',name:'مستقیم',
    build:u=>u},
  {id:'corslol',name:'cors.lol',
    build:u=>'https://api.cors.lol/?url='+encodeURIComponent(u)},
  {id:'allorigins-raw',name:'allorigins/raw',
    build:u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)},
  {id:'codetabs',name:'codetabs',
    build:u=>'https://api.codetabs.com/v1/proxy/?quest='+encodeURIComponent(u)},
  {id:'allorigins-get',name:'allorigins/get',
    build:u=>'https://api.allorigins.win/get?url='+encodeURIComponent(u),
    unwrap:t=>{try{const j=JSON.parse(t);return typeof j.contents==='string'?j.contents:null;}catch(e){return null;}}}
];
/* thingproxy و corsproxy.io از فهرست درآمدند: اولی سال‌هاست از کار افتاده (در لاگ همیشه زیر 25
   میلی‌ثانیه رد می‌شد، یعنی اصلاً درخواستی از گوشی بیرون نرفته) و دومی حالا کلید API می‌خواهد
   و بدون کلید 401 برمی‌گرداند. نگه داشتنشان فقط وقت هر بروزرسانی را تلف می‌کرد. */
/* واسط‌های خودِ کاربر: هر خط یک آدرس. چون در دسترس بودن هر واسط از شبکه‌ای به شبکه‌ی دیگر
   فرق می‌کند، هرچه بیشتر باشند شانس بیشتر است و همه با هم امتحان می‌شوند. */
function proxyList(){
  return String(S.proxy||'').split(/[\n\r،,;]+/).map(x=>x.trim()).filter(x=>/^https?:\/\//i.test(x)).slice(0,6);
}
function customRoutes(){
  return proxyList().map((tpl,i)=>{
    let host=tpl;
    try{host=new URL(tpl).host;}catch(e){}
    return {id:'custom'+i,name:'واسط خودم ('+host+')',custom:true,
      build:u=>tpl.includes('{url}')?tpl.replace('{url}',encodeURIComponent(u)):tpl+encodeURIComponent(u)};
  });
}
const allRoutes=()=>customRoutes().concat(BASE_ROUTES);
const routeById=id=>allRoutes().find(r=>r.id===id);
const GOODKEY='signaldesk.route.v3';
/* برای تلگرام و صرافی جداگانه یادش می‌ماند؛ اینها معمولاً از یک راه نمی‌آیند */
const GOOD=Object.assign({tg:null,px:null},lsGet(GOODKEY)||{});
const goodFor=kind=>GOOD[kind||'tg']||null;
function setGoodRoute(kind,id){
  const k=kind||'tg';
  if(GOOD[k]===id)return;
  GOOD[k]=id;lsSet(GOODKEY,GOOD);
}
/* مسیرهایی که در همین نشست قطعی معلوم شد جواب نمی‌دهند؛ دوباره وقت‌شان را تلف نمی‌کنیم */
const DEADROUTE=new Set();
/* آخرین نتیجه‌ی هر واسط شخصی، فقط برای اینکه در گزارش دیده شود */
const CUSTOMSEEN={};

async function tfetch(url,ms,ctrl){
  const c=ctrl||new AbortController(), t=setTimeout(()=>{c.__timedOut=true;c.abort();},ms);
  try{return await fetch(url,{cache:'no-store',redirect:'follow',signal:c.signal});}
  finally{clearTimeout(t);}
}
/* یک مسیر را امتحان می‌کند و دقیقاً می‌گوید چه شد */
async function tryRoute(route,url,opt,onCtrl){
  const t0=performance.now();
  const seen=r=>{if(route.custom)CUSTOMSEEN[route.id]=r;return r;};
  let target;
  try{target=route.build(url);}catch(e){seen('آدرس پروکسی درست نیست');return {ok:false,why:'badproxy',msg:'آدرس پروکسی درست نیست'};}
  const ctrl=new AbortController();
  if(onCtrl)onCtrl(ctrl);
  try{
    const r=await tfetch(target,opt.timeout||8000,ctrl);
    const ms=Math.round(performance.now()-t0);
    if(!r.ok){seen('HTTP '+r.status);return {ok:false,ms,status:r.status,why:'http',
      msg:r.status===429?'پروکسی گفت درخواست زیاد بوده (429)':'پاسخ HTTP '+r.status};}
    let body=await r.text();
    if(!body||body.length<40){seen('پاسخ خالی');return {ok:false,ms,why:'empty',msg:'پاسخ خالی برگشت'};}
    if(route.unwrap){
      const inner=route.unwrap(body);
      if(inner==null){seen('پوسته باز نشد');return {ok:false,ms,why:'unwrap',msg:'پوسته‌ی پاسخ پروکسی باز نشد'};}
      body=inner;
    }
    let data=body;
    if(opt.json){
      try{data=JSON.parse(body);}
      catch(e){return {ok:false,ms,why:'badjson',msg:'پاسخ JSON نبود (احتمالاً صفحه‌ی خطای پروکسی)'};}
    }
    // مهم‌ترین قسمت: اگر محتوا آن چیزی نیست که می‌خواستیم، این مسیر ناموفق است و مسیر بعدی امتحان می‌شود
    if(opt.validate&&!opt.validate(data,body)){
      seen('جواب داد ولی محتوا درست نبود');
      return {ok:false,ms,why:'content',msg:'پاسخ آمد ولی محتوایش آن چیزی نبود که انتظار داشتیم (صفحه‌ی خطا یا محدودیت پروکسی)'};}
    seen('سالم — '+ms+'ms');
    return {ok:true,ms,data};
  }catch(e){
    const ms=Math.round(performance.now()-t0);
    if(e.name==='AbortError'){
      if(ctrl.__timedOut){seen('تایم‌اوت');return {ok:false,ms,why:'timeout',msg:'تا '+Math.round((opt.timeout||8000)/1000)+' ثانیه جوابی نداد'};}
      return {ok:false,ms,why:'cancelled',msg:'لغو شد چون مسیر دیگری زودتر جواب داد'};
    }
    seen('اتصال برقرار نشد — آدرس غلط است یا ورکر وجود ندارد');
    return {ok:false,ms,why:'blocked',
      msg:route.id==='direct'
        ? 'مرورگر اجازه نداد (CORS) یا مسیر بسته است'
        : 'اتصال برقرار نشد (فیلتر، قطعی اینترنت، یا CORS)'};
  }
}
/* ترتیب شروع: پروکسی خودت، بعد مستقیم، بعد مسیری که بار قبل جواب داد، بعد بقیه */
function routeOrder(url,only,kind){
  let usable=allRoutes().filter(r=>(r.use?r.use(url):true)&&!DEADROUTE.has(r.id));
  if(only)usable=usable.filter(r=>only.includes(r.id)||(only.includes('custom')&&r.custom));
  const out=[];
  // واسط‌های خودت اول، بعد مسیری که بار قبل جواب داد، بعد مستقیم، بعد بقیه
  for(const r of usable)if(r.custom)out.push(r);
  for(const id of [goodFor(kind),'direct']){
    const r=usable.find(x=>x.id===id);
    if(r&&!out.includes(r))out.push(r);
  }
  for(const r of usable)if(!out.includes(r))out.push(r);
  return out;
}
/* همه‌ی مسیرها کنار هم فرستاده می‌شوند؛ اولین پاسخ درست برنده است و بقیه لغو می‌شوند */
async function fetchVia(url,opt){
  opt=opt||{};
  if(!opt.quiet)netStart();      // quiet: درخواست‌های پشت‌سرهمِ پس‌زمینه (قیمت اسکلپ) نوار بالا و گزارش را پر نکنند
  const label=opt.label||url;
  try{
    const order=routeOrder(url,opt.onlyRoutes,opt.kind);
    if(!order.length){logIt('err',label+' — هیچ مسیری برای امتحان نماند');throw new Error('no-route');}
    const ctrls=[], results=[];
    let done=false, left=order.length, winner=null;
    await new Promise(resolve=>{
      let settled=false;
      const finish=()=>{if(!settled){settled=true;resolve();}};
      order.forEach((route,i)=>{
        (async()=>{
          if(i)await sleep(Math.min(i,4)*150);   // کمی فاصله تا مسیر اول شانس اول را داشته باشد
          if(done){left--;if(left<=0)finish();return;}
          const res=await tryRoute(route,url,opt,c=>ctrls.push({id:route.id,c}));
          results.push({route,res});
          if(res.ok&&!done){
            done=true;winner={route,res};
            for(const x of ctrls)if(x.id!==route.id){try{x.c.abort();}catch(e){}}
            finish();return;
          }
          left--;
          if(left<=0)finish();
        })();
      });
    });
    if(winner){
      const losers=results.filter(x=>x.route.id!==winner.route.id&&x.res.why&&x.res.why!=='cancelled');
      if(!opt.quiet)logIt('ok',label+' آمد',{route:winner.route.name,ms:winner.res.ms});
      if(losers.length&&!opt.quiet)logIt('info','مسیرهای دیگر جواب ندادند: '+
        losers.map(x=>x.route.name+' ('+(x.res.why||'?')+')').join('، '));
      setGoodRoute(opt.kind,winner.route.id);
      return {data:winner.res.data,route:winner.route.name,ms:winner.res.ms};
    }
    const tried=[];
    for(const x of results){
      if(x.res.why==='unwrap'||x.res.why==='badproxy')DEADROUTE.add(x.route.id);
      tried.push(x.route.name+': '+x.res.msg);
      if(!opt.quiet)logIt('warn',label+' — '+x.res.msg,{route:x.route.name,ms:x.res.ms,status:x.res.status,why:x.res.why});
    }
    const gk=opt.kind||'tg';
    if(GOOD[gk]&&results.some(x=>x.route.id===GOOD[gk])){GOOD[gk]=null;lsSet(GOODKEY,GOOD);}
    if(!opt.quiet)logIt('err',label+' از هیچ مسیری نیامد',{why:'all-failed'});
    const err=new Error('no-route');err.tried=tried;throw err;
  }finally{if(!opt.quiet)netEnd();}
}

