/* ==================== لینک خروجی برای برنامه‌های دیگر ==================== */
/* سیگنال‌ها در چهار قالب که بیشتر برنامه‌ها «از روی لینک» می‌خوانند:
   - ICS  (تقویم): گوگل‌کلندر، تقویم آیفون، Outlook و برنامه‌های برنامه‌ریزی روزانه — هر سیگنال یک رویداد
   - RSS : خبرخوان‌ها، IFTTT و Zapier
   - CSV : گوگل‌شیت (=IMPORTDATA)، اکسل
   - JSON: هر برنامه‌ی دیگری
   قالب‌ها همین‌جا ساخته می‌شوند (یک جا، هم برای دانلود و هم برای لینک). اگر همگام‌سازی روشن
   باشد، نسخه‌ی تازه روی ورکر خودت می‌رود و ورکر آن را پشت یک لینک ثابت و محرمانه نگه می‌دارد؛
   برنامه‌ی دیگر هر چند دقیقه همان لینک را دوباره می‌خواند. */
const FEED_DAYS=60, FEED_MAX=200;
const FEED_ST_FA={open:'باز',taken:'گرفتم',skipped:'نگرفتم',expired:'منقضی'};
function feedItems(){
  const since=Date.now()-FEED_DAYS*864e5, out=[];
  for(const p of POSTS){
    if(!p.date||+p.date<since||!isSigPost(p))continue;
    const s=sigOf(p), ov=OVERRIDE[p.id]||{}, dec=decisionOf(p.id);
    const pos=dec&&dec.posId?DB.positions.find(x=>x.id===dec.posId):null;
    const it={id:p.id,at:+p.date,ticker:s.ticker||'',dir:s.direction,market:s.market||'futures',
      entry:ov.entry!=null?ov.entry:s.entry,stop:ov.stop!=null?ov.stop:s.stop,
      targets:(s.targets||[]).slice(0,6),lev:s.leverage||null,
      status:dec?(dec.action==='taken'?'taken':'skipped'):isStale(p)?'expired':'open',
      link:p.link||('https://t.me/'+p.id),text:(p.text||'').replace(/\s+\n/g,'\n').slice(0,600)};
    // نتیجه فقط وقتی بسته شده؛ سود شناورِ لحظه‌ای هر دقیقه عوض می‌شود و خروجی را بی‌دلیل تازه می‌کرد
    if(pos){it.pos={status:pos.status,entry:pos.entry};
      if(pos.status==='closed'){const m=posMetrics(pos);it.pos.pnl=m.pnl!=null?+m.pnl.toFixed(2):null;it.pos.r=m.r!=null?+m.r.toFixed(2):null;}}
    out.push(it);
  }
  return out.sort((a,b)=>b.at-a.at).slice(0,FEED_MAX);
}
const fNum=v=>v==null||!isFinite(v)?'':String(+(+v).toPrecision(8));
function feedTitle(it){
  const d=it.dir==='short'?'🔴':'🟢';
  let t=d+' '+it.ticker+' '+(it.dir==='short'?'شورت':'لانگ')+(it.market==='spot'?' اسپات':'');
  if(it.entry!=null)t+=' · ورود '+fNum(it.entry);
  if(it.stop!=null)t+=' · استاپ '+fNum(it.stop);
  if(it.pos&&it.pos.status==='closed'&&it.pos.r!=null)t+=' · نتیجه '+(it.pos.r>=0?'+':'')+it.pos.r+'R';
  else if(it.status!=='open')t+=' · '+FEED_ST_FA[it.status];
  return t;
}
function feedDesc(it){
  const L=[];
  L.push('نماد: '+it.ticker+' · '+(it.dir==='short'?'شورت':'لانگ')+' · '+(it.market==='spot'?'اسپات':'فیوچرز'));
  if(it.entry!=null)L.push('ورود: '+fNum(it.entry));
  if(it.stop!=null)L.push('حد ضرر: '+fNum(it.stop));
  if(it.targets.length)L.push('تارگت‌ها: '+it.targets.map(fNum).join(' / '));
  if(it.lev)L.push('اهرم: '+it.lev+'x');
  L.push('وضعیت: '+FEED_ST_FA[it.status]+(it.pos?(it.pos.status==='closed'
    ?' · بسته شد'+(it.pos.pnl!=null?' '+(it.pos.pnl>=0?'+':'')+it.pos.pnl+'$':'')+(it.pos.r!=null?' ('+it.pos.r+'R)':'')
    :' · پوزیشن باز'):''));
  L.push('');L.push(it.text);L.push('');L.push(it.link);
  return L.join('\n');
}
/* ---- ICS (RFC 5545) ---- */
const icsEsc=s=>String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
const icsTime=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
// هر خط حداکثر 75 بایت؛ ادامه با یک فاصله در خط بعد. نویسه‌ی فارسی دو بایتی است، پس نیمه نشکند.
function icsFold(line){
  const enc=new TextEncoder();if(enc.encode(line).length<=75)return line;
  const out=[];let cur='',n=0;
  for(const ch of line){const b=enc.encode(ch).length;
    if(n+b>(out.length?74:75)){out.push(cur);cur='';n=0;}
    cur+=ch;n+=b;}
  out.push(cur);
  return out.join('\r\n ');
}
function feedICS(items,ch){
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SignalDesk//Signals//FA','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'X-WR-CALNAME:'+icsEsc('سیگنال‌های @'+ch),'X-WR-CALDESC:'+icsEsc('میز سیگنال — هر سیگنال یک رویداد'),
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M','X-PUBLISHED-TTL:PT15M'];
  const now=icsTime(Date.now());
  for(const it of items){
    L.push('BEGIN:VEVENT','UID:'+it.id.replace(/[^\w-]/g,'-')+'@signaldesk','DTSTAMP:'+now,
      'DTSTART:'+icsTime(it.at),'DTEND:'+icsTime(it.at+30*60e3),
      'SUMMARY:'+icsEsc(feedTitle(it)),'DESCRIPTION:'+icsEsc(feedDesc(it)),'URL:'+it.link,
      'CATEGORIES:'+icsEsc(it.ticker+','+FEED_ST_FA[it.status]),'TRANSP:TRANSPARENT','END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n')+'\r\n';
}
/* ---- RSS 2.0 ---- */
const xmlEsc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function feedRSS(items,ch){
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'+
    '<title>'+xmlEsc('سیگنال‌های @'+ch)+'</title><link>https://t.me/s/'+xmlEsc(ch)+'</link>'+
    '<description>'+xmlEsc('میز سیگنال')+'</description><language>fa</language><ttl>15</ttl>'+
    '<lastBuildDate>'+new Date().toUTCString()+'</lastBuildDate>'+
    items.map(it=>'<item><title>'+xmlEsc(feedTitle(it))+'</title><link>'+xmlEsc(it.link)+'</link>'+
      '<guid isPermaLink="false">'+xmlEsc(it.id)+'</guid><pubDate>'+new Date(it.at).toUTCString()+'</pubDate>'+
      '<category>'+xmlEsc(it.ticker)+'</category>'+
      '<description>'+xmlEsc(feedDesc(it)).replace(/\n/g,'&lt;br&gt;')+'</description></item>').join('')+
    '</channel></rss>\n';
}
/* ---- CSV (با BOM تا اکسل فارسی را درست نشان دهد) ---- */
function feedCSV(items){
  const q=v=>{const s=v==null?'':String(v);return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const teh=t=>{try{return new Date(t).toLocaleString('sv-SE',{timeZone:'Asia/Tehran'}).slice(0,16);}catch(e){return '';}};
  const rows=[['time_utc','time_tehran','ticker','direction','market','entry','stop','targets','leverage','status','position','pnl_usd','r','link','text']];
  for(const it of items)rows.push([new Date(it.at).toISOString(),teh(it.at),it.ticker,it.dir,it.market,fNum(it.entry),fNum(it.stop),
    it.targets.map(fNum).join('|'),it.lev||'',it.status,it.pos?it.pos.status:'',it.pos&&it.pos.pnl!=null?it.pos.pnl:'',
    it.pos&&it.pos.r!=null?it.pos.r:'',it.link,it.text.replace(/\n+/g,' ').slice(0,300)]);
  return '\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';
}
function feedJSON(items,ch){
  return JSON.stringify({channel:ch,updated:new Date().toISOString(),source:'SignalDesk',
    items:items.map(it=>Object.assign({},it,{time:new Date(it.at).toISOString(),title:feedTitle(it)}))},null,1);
}
function feedFiles(){
  const items=feedItems(), ch=S.channel||'channel';
  return {items,files:{ics:feedICS(items,ch),rss:feedRSS(items,ch),csv:feedCSV(items),json:feedJSON(items,ch)}};
}

/* ---- انتشار روی ورکر ---- */
const FEEDKEY='signaldesk.feed.v1';
let feedCfg=lsGet(FEEDKEY)||{key:'',at:0,sig:''};
let feedTimer=null, feedBusy=false, feedLast=0;
const feedOn=()=>!!S.feedOn&&syncOn();
const feedSave=()=>lsSet(FEEDKEY,feedCfg);
const feedBase=()=>String(syncCfg.url||'').replace(/\/+$/,'');
const feedUrl=ext=>feedCfg.key?feedBase()+'/f/'+feedCfg.key+'/signals.'+ext:'';
function feedSoon(){
  if(!feedOn())return;
  clearTimeout(feedTimer);
  // هر تغییر کوچک یک نوشتن روی KV است؛ حداکثر هر ۹۰ ثانیه یک بار
  const wait=Math.max(5000,feedLast+90e3-Date.now());
  feedTimer=setTimeout(()=>feedPublish(false),wait);
}
async function feedReq(method,path,body){
  const r=await fetch(feedBase()+path,{method,cache:'no-store',
    headers:Object.assign({'Authorization':'Bearer '+syncCfg.token},body?{'Content-Type':'application/json'}:{}),
    body:body?JSON.stringify(body):undefined});
  let j=null;try{j=await r.json();}catch(e){}
  if(r.status===404&&!(j&&j.error))throw new Error('ورکر قدیمی است؛ کد تازه‌ی proxy/worker.js را Deploy کن');
  if(!r.ok)throw new Error((j&&j.message)||('HTTP '+r.status));
  return j||{};
}
/* force: از دکمه؛ بدون آن فقط وقتی محتوا عوض شده باشد */
async function feedPublish(force){
  if(!feedOn()||feedBusy)return false;
  const {items,files}=feedFiles();
  const sig=JSON.stringify(items);
  if(!force&&sig===feedCfg.sig&&feedCfg.key)return false;
  feedBusy=true;
  try{
    const j=await feedReq('PUT','/feed',{files,n:items.length});
    feedCfg.key=j.key||feedCfg.key;feedCfg.at=j.at||Date.now();feedCfg.sig=sig;feedSave();
    feedLast=Date.now();paintFeed();
    return true;
  }catch(e){logIt('warn','لینک خروجی: '+e.message);if(force)toast(e.message,'err');return false;}
  finally{feedBusy=false;}
}
function feedDownload(ext){
  const {items,files}=feedFiles();
  if(!items.length)return toast('سیگنالی در '+faN(FEED_DAYS)+' روز اخیر نیست','info');
  const mime={ics:'text/calendar',rss:'application/rss+xml',csv:'text/csv',json:'application/json'}[ext];
  dl('signals-'+(S.channel||'channel')+'.'+ext,files[ext],mime+';charset=utf-8');
  toast(faN(items.length)+' سیگنال در فایل '+ext.toUpperCase(),'ok');
}
function paintFeed(){
  const box=$('#feedBox');if(!box)return;
  const cb=$('#sFeedOn');if(cb)cb.checked=!!S.feedOn;
  const st=$('#feedState'), links=$('#feedLinks');
  if(!syncOn()){st.textContent='اول همگام‌سازی';links.innerHTML='';return;}
  if(!S.feedOn){st.textContent='خاموش';st.dataset.k='';links.innerHTML='';return;}
  st.textContent=feedCfg.key?'روشن · '+(feedCfg.at?ageTxt(feedCfg.at):''):'در حال ساختن لینک…';st.dataset.k=feedCfg.key?'ok':'';
  if(!feedCfg.key){links.innerHTML='';return;}
  const row=(ext,label,hint)=>'<div class="flink"><div class="flh"><b>'+label+'</b><span>'+hint+'</span></div>'+
    '<div class="flr"><input readonly dir="ltr" value="'+esc(feedUrl(ext))+'"><button type="button" class="btn sm" data-copy="'+ext+'">کپی</button></div></div>';
  links.innerHTML=row('ics','تقویم (ICS)','گوگل‌کلندر، تقویم آیفون، Outlook و برنامه‌ریزهای روزانه')+
    row('rss','RSS','خبرخوان، IFTTT، Zapier')+row('csv','CSV','گوگل‌شیت: ‎=IMPORTDATA("لینک")‎، اکسل')+
    row('json','JSON','هر برنامه‌ی دیگر')+
    '<div class="srow"><a class="btn sm" id="feedWebcal" href="'+esc(feedUrl('ics').replace(/^https?:/,'webcal:'))+'">افزودن به تقویم گوشی</a>'+
    '<button type="button" class="btn sm" id="feedNow">به‌روز کن</button><button type="button" class="btn sm" id="feedRot">لینک تازه</button></div>';
  links.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
    const u=feedUrl(b.dataset.copy);
    try{await navigator.clipboard.writeText(u);toast('لینک کپی شد','ok');}
    catch(e){const i=b.previousElementSibling;i.select();toast('لینک را انتخاب کردم؛ کپی کن','info');}
  });
  $('#feedNow').onclick=async e=>{btnBusy(e.currentTarget,true);const ok=await feedPublish(true);btnBusy(e.currentTarget,false);if(ok)toast('خروجی به‌روز شد','ok');};
  $('#feedRot').onclick=async e=>{
    if(!confirm('لینک‌های قبلی از کار می‌افتند و باید لینک تازه را دوباره در برنامه‌ی دیگر بگذاری. ادامه؟'))return;
    btnBusy(e.currentTarget,true);
    try{const j=await feedReq('POST','/feed/rotate');feedCfg.key=j.key;feedSave();paintFeed();toast('لینک تازه ساخته شد','ok');}
    catch(err){toast(err.message,'err');}
    btnBusy(e.currentTarget,false);
  };
}
function wireFeed(){
  const cb=$('#sFeedOn');if(!cb)return;
  cb.onchange=async()=>{
    if(cb.checked&&!syncOn()){cb.checked=false;return toast('اول همگام‌سازی را با ورکر خودت روشن کن','err');}
    S.feedOn=cb.checked;DB.settings=Object.assign({},S);save();paintFeed();
    if(S.feedOn){const ok=await feedPublish(true);if(ok)toast('لینک خروجی آماده است','ok');}
  };
  $('#feedDlIcs').onclick=()=>feedDownload('ics');
  $('#feedDlCsv').onclick=()=>feedDownload('csv');
  const sec=$('#feedBox').closest('details');
  if(sec)sec.addEventListener('toggle',()=>{if(sec.open)paintFeed();});
  paintFeed();
}
