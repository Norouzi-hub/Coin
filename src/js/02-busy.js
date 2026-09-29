/* ==================== نشانه‌های «در حال کار» ==================== */
/* هر درخواست شبکه نوار طلایی بالای صفحه و چرخش شمسه را روشن می‌کند */
const NET={n:0};
function netStart(){NET.n++;document.documentElement.classList.add('busy');}
function netEnd(){NET.n=Math.max(0,NET.n-1);if(!NET.n)document.documentElement.classList.remove('busy');}
/* دکمه در حال کار: چرخنده، متن توضیحی، و غیرفعال تا پایان */
function btnBusy(b,on,label){
  if(!b)return;
  if(on){
    if(b.dataset.lbl==null)b.dataset.lbl=b.innerHTML;
    b.classList.add('is-busy');b.disabled=true;b.setAttribute('aria-busy','true');
    b.innerHTML='<span class="bspin"></span>'+(label?'<span>'+label+'</span>':'');
  }else{
    b.classList.remove('is-busy');b.disabled=false;b.removeAttribute('aria-busy');
    if(b.dataset.lbl!=null){b.innerHTML=b.dataset.lbl;delete b.dataset.lbl;}
  }
}
const skelHTML=n=>Array.from({length:n},(_,i)=>
  '<div class="skel" aria-hidden="true"><i></i>'+(i%2?'':'<i class="b"></i>')+'<i></i><i class="s"></i></div>').join('');
function ageTxt(ts){
  if(!ts)return '—';
  const s=(Date.now()-ts)/1000;
  if(s<8)return 'همین الان';
  if(s<60)return faN(Math.round(s))+' ثانیه پیش';
  if(s<3600)return faN(Math.round(s/60))+' دقیقه پیش';
  if(s<86400)return faN(Math.round(s/3600))+' ساعت پیش';
  return faN(Math.round(s/86400))+' روز پیش';
}

