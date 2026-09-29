/* ==================== ورق (sheet) ==================== */
let sheetEsc=null, sheetRet=null;
/* هر برچسبِ .fld به فیلد خودش وصل می‌شود تا صفحه‌خوان بگوید این کادر چیست و زدن روی برچسب فیلد را فعال کند */
let fldSeq=0;
function linkLabels(root){
  for(const f of root.querySelectorAll('.fld')){
    const l=f.querySelector('label'), i=f.querySelector('input,select,textarea');
    if(!l||!i||l.htmlFor||l.contains(i))continue;
    if(!i.id)i.id='fld'+(++fldSeq);
    l.htmlFor=i.id;
  }
}
const FOCUSABLE='button:not([disabled]),[href],input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"]),summary';
function openSheet(html,onReady){
  const v=$('#veil'), sh=$('#sheet');
  // فوکوس قبلی نگه داشته می‌شود تا بعد از بستن، کاربر صفحه‌کلید همان‌جا برگردد
  if(v.classList.contains('hide'))sheetRet=document.activeElement;
  sh.innerHTML='<button class="sx" aria-label="بستن">'+ic('x')+'</button>'+html;
  sh.setAttribute('aria-modal','true');
  const h=sh.querySelector('h3');
  if(h){h.id='sheetTitle';h.tabIndex=-1;sh.setAttribute('aria-labelledby','sheetTitle');}
  v.classList.remove('hide');
  requestAnimationFrame(()=>v.classList.add('open'));
  sh.querySelector('.sx').onclick=closeSheet;
  sh.scrollTop=0;
  if(onReady)onReady(sh);
  linkLabels(sh);
  // فوکوس به عنوان ورق (نه اولین فیلد: کیبورد گوشی بی‌دلیل باز نشود)
  (h||sh.querySelector('.sx')).focus({preventScroll:true});
}
/* Tab داخل ورق می‌چرخد و بیرون نمی‌زند */
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||$('#veil').classList.contains('hide'))return;
  const f=[...$('#sheet').querySelectorAll(FOCUSABLE)].filter(x=>x.getClientRects().length);
  if(!f.length)return;
  const a=f[0], z=f[f.length-1], cur=document.activeElement;
  if(!$('#sheet').contains(cur)){e.preventDefault();a.focus();}
  else if(e.shiftKey&&(cur===a||cur.id==='sheetTitle')){e.preventDefault();z.focus();}
  else if(!e.shiftKey&&cur===z){e.preventDefault();a.focus();}
});
function closeSheet(){
  const v=$('#veil');
  if(v.classList.contains('hide'))return;
  v.classList.remove('open');
  setTimeout(()=>{if(!v.classList.contains('open')){v.classList.add('hide');$('#sheet').innerHTML='';}},380);
  if(sheetEsc){sheetEsc();sheetEsc=null;}
  const r=sheetRet;sheetRet=null;
  if(r&&r.isConnected&&r.focus)try{r.focus({preventScroll:true});}catch(e){}
}
/* پنل‌های هم‌شکل: تنظیمات هم همین رفتار باز/بسته شدن را دارد */
function openPanel(id){const v=$('#'+id);v.classList.remove('hide');requestAnimationFrame(()=>v.classList.add('open'));}
function closePanel(id){
  const v=$('#'+id);v.classList.remove('open');
  setTimeout(()=>{if(!v.classList.contains('open'))v.classList.add('hide');},380);
}
// جداکننده‌ی هزارگان و رقم فارسی را هم می‌فهمد (کادرهای مبلغ با ویرگول نوشته می‌شوند)
const num=id=>{const n=$('#'+id);const v=n?moneyVal(n):NaN;return isFinite(v)&&v>0?v:null;};
const fldHtml=(k,l,v,extra)=>'<div class="fld"><label for="f_'+k+'">'+l+'</label><input id="f_'+k+
  '" type="number" step="any" inputmode="decimal" '+(extra||'')+' value="'+(v===''||v==null?'':v)+'"></div>';

