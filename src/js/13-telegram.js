/* ==================== کانال تلگرام ==================== */
function nodeText(n){
  if(!n)return '';
  const c=n.cloneNode(true);
  c.querySelectorAll('br').forEach(b=>b.replaceWith(document.createTextNode('\n')));
  c.querySelectorAll('p,div,blockquote,pre,li').forEach(b=>b.appendChild(document.createTextNode('\n')));
  return (c.textContent||'').replace(/ /g,' ').replace(/\n{3,}/g,'\n\n');
}
/* اگر «tgme_» در متن نباشد، آن پاسخ از تلگرام نیست — صفحه‌ی خطای پروکسی است */
const looksLikeTg=t=>typeof t==='string'&&/tgme_/.test(t);
/* فقط پستِ همین کانال. تا اینجا هر صفحه‌ای که «tgme_» داشت قبول می‌شد — یعنی صفحه‌ی
   هر کانال تلگرامی. اگر یکی از واسط‌های عمومی (که بین کاربرها مشترک‌اند و گاهی جوابِ
   اشتباهی از کش خودشان پس می‌دهند) صفحه‌ی کانال دیگری را برمی‌گرداند، پست‌هایش بی‌صدا
   وارد فهرست و کش می‌شد. شناسه‌ی هر پست در صفحه‌ی عمومی «نام‌کانال/شماره» است؛ شکلِ
   عددیِ c/123 هم پذیرفته است چون نام کانال دیگری در آن نیست. */
const postChan=id=>String(id||'').split('/').slice(0,-1).join('/');
const ownPost=id=>{const c=postChan(id);
  return c.toLowerCase()===String(S.channel||'').toLowerCase()||/^c\/\d+$/.test(c);};
/* اعتبارسنجیِ خودِ جواب: اگر صفحه پست دارد ولی هیچ‌کدام مال این کانال نیست، این مسیر
   جوابِ اشتباه داده؛ fetchVia آن را رد می‌کند و سراغ مسیر بعدی می‌رود. */
function looksLikeOurTg(t){
  if(!looksLikeTg(t))return false;
  const ids=[...t.matchAll(/data-post=["']([^"']+)["']/g)].map(m=>m[1]);
  return !ids.length||ids.some(ownPost);
}
function parseChannelHTML(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const out=[];
  let foreign=0;const fromCh=new Set();
  for(const n of doc.querySelectorAll('.tgme_widget_message[data-post]')){
    const id=n.getAttribute('data-post')||'', num=postNum(id);
    if(!ownPost(id)){foreign++;fromCh.add(postChan(id));continue;}
    const b=n.querySelector('.tgme_widget_message_bubble')||n;
    let text='';
    for(const d of b.querySelectorAll('.tgme_widget_message_text')){
      if(d.closest('.tgme_widget_message_reply')||d.className.includes('reply'))continue;
      text=nodeText(d);break;
    }
    let reply=null;
    const rp=b.querySelector('.tgme_widget_message_reply');
    if(rp){
      const rt=rp.querySelector('.tgme_widget_message_text,.tgme_widget_message_metatext');
      // خودِ بلوک ریپلای یک لینک به پست اصلی است؛ شناسه‌اش را برمی‌داریم تا بشود
      // پست اصلی را همین‌جا نشان داد، نه فقط 160 نویسه از متنش
      const href=rp.getAttribute('href')||'';
      const mm=href.match(/t\.me\/(?:s\/)?(.+)$/);
      reply={text:nodeText(rt).trim().replace(/\s+/g,' ').slice(0,160),
             id:mm?mm[1].replace(/[?#].*$/,''):null,link:href||null};
    }
    /* پست آموزشی ممکن است آلبوم چندعکسی یا ویدیو باشد؛ همه‌ی عکس‌ها را برمی‌داریم،
       ولی فقط وقتی بیش از یکی باشد ذخیره‌شان می‌کنیم تا کشِ 800 پستی سنگین نشود */
    const imgs=[];
    for(const ph of b.querySelectorAll('.tgme_widget_message_photo_wrap,.tgme_widget_message_video_thumb,.tgme_widget_message_roundvideo_thumb')){
      if(ph.closest('.tgme_widget_message_reply'))continue;
      const m=(ph.getAttribute('style')||'').match(/background-image\s*:\s*url\(['"]?(.*?)['"]?\)/);
      if(m&&!imgs.includes(m[1]))imgs.push(m[1]);
    }
    const img=imgs[0]||null;
    const vEl=b.querySelector('video[src]');
    const video=vEl?vEl.getAttribute('src'):null;
    const tm=n.querySelector('time[datetime]');
    if(!text&&!img)continue;
    const po={id,num,text:(text||'').trim(),img,reply,
      date:tm?new Date(tm.getAttribute('datetime')):null,link:'https://t.me/'+id};
    if(imgs.length>1)po.imgs=imgs;
    if(video)po.video=video;
    out.push(po);
  }
  const more=doc.querySelector('.tme_messages_more[data-before]');
  return {posts:out,before:more?more.getAttribute('data-before'):null,empty:!out.length,
    foreign,fromCh:[...fromCh]};
}
/* اگر شماره‌ها مساوی باشند مرتب‌سازی بی‌اثر می‌شود و ترتیب خامِ صفحه می‌ماند؛
   تاریخ به عنوان تصمیم‌گیر دوم این حالت را هم می‌پوشاند. */
const postAt=p=>p&&p.date?(+p.date||0):0;
const byNewest=(a,b)=>(b.num-a.num)||(postAt(b)-postAt(a));
function tgUrl(before){
  let u='https://t.me/s/'+encodeURIComponent(S.channel);
  if(before)u+='?before='+before;
  return u;
}
async function loadChannel(before){
  const u=tgUrl(before);
  H.tg.state='busy';renderHealth();
  try{
    const got=await fetchVia(u,{validate:looksLikeOurTg,timeout:11000,kind:'tg',
      label:'کانال @'+S.channel+(before?' (قدیمی‌تر)':'')});
    const res=parseChannelHTML(got.data);
    if(res.foreign)logIt('warn',faN(res.foreign)+' پست از کانال دیگر ('+res.fromCh.join('، ')+
      ') در جوابِ مسیر «'+got.route+'» بود و کنار گذاشته شد');
    Object.assign(H.tg,{state:'ok',route:got.route,ms:got.ms,at:Date.now(),err:null,ok:H.tg.ok+1});
    if(res.empty&&!before)
      logIt('warn','صفحه‌ی کانال آمد ولی پستی داخلش نبود — نام کانال یا عمومی بودنش را چک کن');
    return res;
  }catch(e){
    Object.assign(H.tg,{state:'err',fail:H.tg.fail+1,tried:e.tried||null,
      err:'نه اتصال مستقیم جواب داد نه هیچ واسطی. '+
          (LOCAL_ORIGIN
            ?'این صفحه داخل یک برنامه یا از فایل محلی باز شده؛ بعضی واسط‌ها چنین درخواستی را رد می‌کنند. '+
             'اگر می‌شود همین فایل را در مرورگر خودت باز کن، یا روی هاست خودت بگذار.'
            :'«تست اتصال» را بزن تا معلوم شود کدام مسیر از این شبکه باز است.')});
    throw e;
  }finally{renderHealth();}
}

