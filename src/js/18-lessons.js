/* ==================== آموزش ==================== */
/* پست‌های آموزشی کپی کامل ذخیره می‌شوند، نه ارجاع به POSTS: کشِ کانال 800 تایی است و
   می‌چرخد، پس یک آموزش قدیمی وگرنه روزی از دست می‌رفت. */
let lessonQ='', catFilter=null, pickMode=false;
const picked=new Set();
const isLesson=id=>!!DB.lessons[id];
const lessonTitle=t=>{
  const first=String(t||'').split('\n').map(x=>x.trim()).find(Boolean)||'بدون عنوان';
  return first.replace(/\s+/g,' ').slice(0,60);
};
function addLesson(p){
  DB.lessons[p.id]={id:p.id,title:lessonTitle(p.text),text:p.text||'',img:p.img||null,
    date:p.date?+p.date:null,link:p.link||null,at:Date.now(),cat:''};
  if(p.imgs)DB.lessons[p.id].imgs=p.imgs;
  if(p.video)DB.lessons[p.id].video=p.video;
  save();renderAll();toast('به آموزش‌ها اضافه شد','ok');
}
function removeLesson(id){
  delete DB.lessons[id];
  save();renderAll();toast('از آموزش‌ها برداشته شد','info');
}
/* دسته‌ها جای ثابت ندارند: هر رشته‌ای که روی یک آموزش نوشته شود خودش یک دسته می‌شود.
   این‌طور نه مدیریت دسته لازم است نه دسته‌ی خالی می‌ماند. */
const lessonCats=()=>[...new Set(Object.values(DB.lessons).filter(L=>!L.guide).map(L=>(L.cat||'').trim()).filter(Boolean))].sort();
const CAT_SUGGEST=['تحلیل تکنیکال','مدیریت سرمایه','روانشناسی','پرایس اکشن','اندیکاتور','مفاهیم پایه'];
function sheetEditLesson(id){
  const L=DB.lessons[id];if(!L)return;
  const opts=[...new Set(lessonCats().concat(CAT_SUGGEST))];
  openSheet(
   '<h3>ویرایش آموزش</h3>'+
   '<div class="sub">عنوان و دسته فقط برای پیدا کردن خودت است؛ متن پست دست نمی‌خورد.</div>'+
   '<div class="fld"><label>عنوان</label><input id="f_t" value="'+esc(L.title||'')+'"></div>'+
   '<div class="fld" style="margin-top:10px"><label>دسته</label>'+
     '<input id="f_c" list="catlist" placeholder="مثلاً تحلیل تکنیکال" value="'+esc(L.cat||'')+'">'+
     '<datalist id="catlist">'+opts.map(c=>'<option value="'+esc(c)+'"></option>').join('')+'</datalist></div>'+
   '<div class="hint">دسته را خالی بگذاری، در «بدون دسته» می‌ماند.</div>'+
   '<div class="srow"><button class="btn pri" id="ok">ذخیره</button>'+
   '<button class="btn" id="cx">انصراف</button></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{
       const t=($('#f_t').value||'').trim();
       DB.lessons[id].title=t||lessonTitle(L.text);
       DB.lessons[id].cat=($('#f_c').value||'').trim();
       save();closeSheet();renderAll();toast('ذخیره شد','ok');
     };
   });
}
/* ---- اسکن کانال برای پیدا کردن آموزش‌ها ---- */
/* 150 پست را دستی علامت زدن شدنی نیست. کانال را عقب‌عقب می‌خوانیم، کاندیداها را
   امتیاز می‌دهیم و فهرستِ تیک‌خور نشان می‌دهیم — تصمیم آخر با کاربر است، نه خودکار. */
const LESSON_HINTS=[
  /نکته/,/چیست/,/چطور/,/چگونه/,/یاد\s*بگیر/,/مفهوم/,/استراتژی/,/اندیکاتور/,
  /فیبوناچی/,/پرایس\s*اکشن/,/کندل\s*استیک/,/حمایت\s*و\s*مقاومت/,/مدیریت\s*سرمایه/,
  /روان\s*شناسی|روانشناسی/,/واگرایی/,/تایم\s*فریم/,/الگو/,/درس/,/تحلیل\s*تکنیکال/,
  /ریسک\s*فری/,/حجم\s*معامله/,/اهرم\s*چیست/,/مارجین/,/ترند\s*لاین/,/مووینگ/
];
function lessonScore(p){
  if(sigOf(p).isSignal)return 0;
  const t=faNorm(p.text||'');
  if(t.length<80)return 0;
  let sc=0;
  if(/#\s*(اموزش|آموزشی?|نکته|درس)/.test(t))sc+=3;
  else if(/اموزش|آموزش/.test(t))sc+=2;
  let hits=0;for(const re of LESSON_HINTS)if(re.test(t))hits++;
  sc+=Math.min(hits,3);
  if(t.length>400)sc++;
  return sc;
}
async function scanLessons(maxPages,onStep){
  const found=new Map();
  let before=null,pg=0;
  jobSet('lscan',{title:'خواندن آموزش‌های کانال',pause:true,cancel:true,pct:()=>pg/maxPages*100,msg:()=>'صفحه‌ی '+faN(pg)+' · '+faN(found.size)+' کاندیدا',go:()=>go('learn')});
  try{
  for(let i=0;i<maxPages;i++){
    if(!(await jobGate('lscan')))break;pg=i+1;
    let res;
    try{res=await loadChannel(before);}catch(e){onStep(i+1,found.size,'خطا در صفحه‌ی '+faN(i+1));break;}
    for(const p of res.posts){
      const sc=lessonScore(p);
      if(sc>0&&!isLesson(p.id))found.set(p.id,{p,sc});
    }
    onStep(i+1,found.size,null);
    if(!res.before)break;                 // به اولین پست کانال رسیدیم
    before=res.before;
  }
  }finally{jobEnd('lscan');}
  return [...found.values()].sort((a,b)=>b.sc-a.sc||b.p.num-a.p.num);
}
function sheetScan(){
  openSheet(
   '<h3>آوردن آموزش‌ها از کانال</h3>'+
   '<div class="sub">کانال از تازه به قدیم خوانده می‌شود و پست‌هایی که آموزشی به نظر می‌رسند '+
   'فهرست می‌شوند. هیچ‌چیز خودکار اضافه نمی‌شود — خودت تیک می‌زنی.</div>'+
   '<div class="grid"><div class="fld"><label>تا چند صفحه عقب برود</label>'+
   '<select id="f_pg"><option value="10">10 صفحه (سریع)</option>'+
   '<option value="25">25 صفحه</option><option value="50" selected>50 صفحه</option>'+
   '<option value="120">تا آخر کانال (کند)</option></select></div></div>'+
   '<div class="hint">هر صفحه حدود 20 پست است و یک درخواست به کانال می‌زند. اگر واسط شخصی '+
   'داری سریع است؛ بدون آن ممکن است خیلی طول بکشد.</div>'+
   '<div class="srow"><button class="btn pri" id="ok">شروع اسکن</button>'+
   '<button class="btn" id="cx">انصراف</button></div>'+
   '<div id="scanBox"></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=async e=>{
       const pages=parseInt($('#f_pg').value,10)||50;
       const btn=e.currentTarget; btnBusy(btn,true,'در حال خواندن…');
       const box=$('#scanBox');
       box.innerHTML='<div class="scanprog" id="sp">در حال خواندن صفحه‌ی 1…</div>';
       const rows=await scanLessons(pages,(pg,n,err)=>{
         $('#sp').textContent=err||('صفحه‌ی '+faN(pg)+' خوانده شد · '+faN(n)+' کاندیدا');
       });
       btnBusy(btn,false);
       renderScanResults(rows);
     };
   });
}
function renderScanResults(rows){
  const box=$('#scanBox');
  if(!rows.length){
    box.innerHTML='<div class="hint">کاندیدای تازه‌ای پیدا نشد. '+
      'یا همه‌شان از قبل در آموزش‌ها هستند، یا پست‌های کانال به آموزش شبیه نبودند.</div>';
    return;
  }
  box.innerHTML='<div class="sechd">'+faN(rows.length)+' کاندیدا</div>'+
    '<div class="srow"><button class="btn sm" id="selAll">انتخاب همه</button>'+
    '<button class="btn sm" id="selNone">هیچ‌کدام</button>'+
    '<span class="markhint" id="selCount"></span></div>'+
    '<div class="scanlist" id="sl"></div>'+
    '<div class="srow"><button class="btn pri" id="addSel">افزودن انتخاب‌شده‌ها</button></div>';
  const list=$('#sl');
  for(const {p,sc} of rows){
    const row=el('label','scanrow');
    const cb=el('input');cb.type='checkbox';cb.checked=sc>=3;cb.dataset.id=p.id;
    row.appendChild(cb);
    const txt=el('div','scantxt');
    txt.appendChild(el('div','scanttl',esc(lessonTitle(p.text))));
    txt.appendChild(el('div','scanmeta',(p.date?relTime(p.date):'—')+' · امتیاز '+faN(sc)));
    row.appendChild(txt);
    list.appendChild(row);
    cb.__post=p;
  }
  const count=()=>{$('#selCount').textContent=faN($$('#sl input:checked').length)+' انتخاب شده';};
  list.addEventListener('change',count);
  $('#selAll').onclick=()=>{$$('#sl input').forEach(c=>c.checked=true);count();};
  $('#selNone').onclick=()=>{$$('#sl input').forEach(c=>c.checked=false);count();};
  count();
  $('#addSel').onclick=()=>{
    const picked=$$('#sl input:checked');
    if(!picked.length)return toast('چیزی انتخاب نشده','err');
    for(const c of picked)addLessonQuiet(c.__post);
    save();renderAll();closeSheet();
    toast(faN(picked.length)+' آموزش اضافه شد','ok');
  };
}
/* مثل addLesson ولی بدون ذخیره و رندر در هر مورد — برای افزودن دسته‌جمعی */
function addLessonQuiet(p){
  DB.lessons[p.id]={id:p.id,title:lessonTitle(p.text),text:p.text||'',img:p.img||null,
    date:p.date?+p.date:null,link:p.link||null,at:Date.now(),cat:''};
}

