/* ==================== زمان‌سنج بروزرسانی ==================== */
let timer=null,nextTick=null;
const RING_C=2*Math.PI*11;
function setTimer(){
  if(timer){clearInterval(timer);timer=null;}
  nextTick=null;
  if(S.auto>0){
    timer=setInterval(()=>{if(!document.hidden||F('notify'))refresh(false,true);},S.auto*1000);
    nextTick=Date.now()+S.auto*1000;
  }
  paintRing();
}
function paintRing(){
  const r=$('#ring'), f=$('#ringF'), t=$('#ringT');
  if(!r)return;
  if(!S.auto||!nextTick){r.classList.add('off');t.textContent='';r.title='بروزرسانی خودکار خاموش است';return;}
  r.classList.remove('off');
  const total=S.auto*1000, left=Math.max(0,nextTick-Date.now());
  f.setAttribute('stroke-dasharray',RING_C.toFixed(1));
  f.setAttribute('stroke-dashoffset',(RING_C*(1-left/total)).toFixed(1));
  const s=Math.ceil(left/1000);
  t.textContent=s>=60?faN(Math.ceil(s/60))+'د':faN(s);
  r.title='بروزرسانی خودکار بعدی: '+(s>=60?faN(Math.ceil(s/60))+' دقیقه':faN(s)+' ثانیه')+' دیگر';
}

