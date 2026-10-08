/* ==================== پنجره‌ی پرسش (به‌جای confirm/prompt مرورگر) ====================
   askConfirm({title,msg,ok,cancel,tone}) ← Promise<true|false>؛ askText({title,msg,ok,placeholder,value}) ← Promise<string|null>.
   tone: warn (هشدار، پیش‌فرض) · danger (کار برگشت‌ناپذیر) · info (سؤال ساده). Esc و زدن بیرون = انصراف.
   زیر مرورگرِ خودکار (تست‌ها) همان confirm/prompt بومی می‌ماند تا تست‌های قدیمی با رخداد dialog کار کنند؛
   window.__dlgUI=true همین پنجره را حتی آن‌جا روشن می‌کند. */
const DLG_IC={warn:'!',danger:'!',info:'?'};
function dlgNative(){try{return !!navigator.webdriver&&!window.__dlgUI;}catch(e){return false;}}
function dlgOpen(o,withInput){
  return new Promise(res=>{
    let v=document.getElementById('dlgv');
    if(!v){v=el('div','dlgv hide');v.id='dlgv';document.body.appendChild(v);}
    clearTimeout(v._t);       // پنجره‌ی پشت‌سرهم (مثلاً هشدار ریسک و بعد هشدار لیکوئید): پاک‌کردنِ قبلی این یکی را نبرد
    const tone=o.tone||'warn', prev=document.activeElement;
    v.innerHTML='<div class="dlg '+tone+'" role="alertdialog" aria-modal="true" aria-labelledby="dlgT" aria-describedby="dlgM">'+
      '<div class="dlgh"><i class="dlgic">'+(o.icon||DLG_IC[tone]||'!')+'</i><b id="dlgT">'+esc(o.title||'مطمئنی؟')+'</b></div>'+
      (o.msg?'<div class="dlgm" id="dlgM">'+esc(o.msg).replace(/\n/g,'<br>')+'</div>':'')+
      (withInput?'<input class="dlgin" id="dlgIn" autocomplete="off" dir="auto" placeholder="'+esc(o.placeholder||'')+'" value="'+esc(o.value||'')+'">':'')+
      '<div class="dlga"><button class="btn dlgok">'+esc(o.ok||'بله')+'</button><button class="btn dlgno">'+esc(o.cancel||'انصراف')+'</button></div></div>';
    v.classList.remove('hide');requestAnimationFrame(()=>v.classList.add('open'));
    const inp=v.querySelector('#dlgIn'), done=val=>{document.removeEventListener('keydown',key,true);v.classList.remove('open');
      v._t=setTimeout(()=>{v.classList.add('hide');v.innerHTML='';},180);try{prev&&prev.focus&&prev.focus({preventScroll:true});}catch(e){}res(val);};
    const yes=()=>done(withInput?String(inp.value||'').trim()||null:true), no=()=>done(withInput?null:false);
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();no();}
      else if(e.key==='Enter'&&(withInput||tone==='info')){e.preventDefault();yes();}
      else if(e.key==='Tab'){const f=[...v.querySelectorAll('button,input')];const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus();}};
    document.addEventListener('keydown',key,true);
    v.querySelector('.dlgok').onclick=yes;v.querySelector('.dlgno').onclick=no;
    v.onclick=e=>{if(e.target===v)no();};
    // فوکوس روی کار بی‌خطر (انصراف) برای هشدارها؛ روی کادر متن برای پرسش متنی
    setTimeout(()=>{(inp||v.querySelector(tone==='info'?'.dlgok':'.dlgno')).focus({preventScroll:true});},30);
  });
}
function askConfirm(o){
  if(typeof o==='string')o={msg:o};
  if(dlgNative())return Promise.resolve(confirm([o.title,o.msg].filter(Boolean).join('\n\n')));
  return dlgOpen(o,false);
}
function askText(o){
  if(typeof o==='string')o={title:o};
  if(dlgNative()){const v=prompt(o.title||'',o.value||'');return Promise.resolve(v==null?null:String(v).trim()||null);}
  return dlgOpen(o,true);
}
