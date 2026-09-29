/* ==================== سفارش منتظر ==================== */
/* خیلی از سیگنال‌ها می‌گویند «بالای X وارد شو» — یعنی تا قیمت به آن نرسیده کاری نکن.
   تا حالا یا باید زودتر وارد می‌شدی یا سیگنال را از دست می‌دادی. حالا ثبت می‌شود،
   قیمت که رسید خبر می‌دهد، و با یک زدن به پوزیشن واقعی تبدیل می‌شود. */
function addPending(p,sig,trigger,px){
  const I=planInputsOf(p,sig,OVERRIDE[p.id]||{},px);
  const dir=I.dir;
  // بالای تریگر برای لانگ، زیرش برای شورت — جهت عبور را همین‌جا قفل می‌کنیم
  const side=dir==='long'?'up':'down';
  DB.pending.push({id:uid(),postId:p.id,ticker:sig.ticker||'—',dir,trigger,side,
    market:I.market,postAt:p.date?p.date.getTime():null,
    entry:I.entry!=null?I.entry:trigger,stop:I.stop||null,targets:sig.targets||[],
    at:Date.now(),hit:null});
  save();renderAll();
  toast('منتظر '+fmtPrice(trigger)+' ماند','ok');
}
function dropPending(id){
  DB.pending=DB.pending.filter(x=>x.id!==id);
  save();renderAll();toast('سفارش منتظر برداشته شد','info');
}
/* سفارش منتظری که تا قدیمی شدنِ سیگنالش نرسیده، دیگر منتظرش نیستیم */
function pendingStale(w){
  if(w.hit)return false;
  const post=POSTS.find(x=>x.id===w.postId);
  const until=post?freshUntil(post):(w.postAt||w.at)+staleMs();
  return Date.now()>until;
}
const activePending=()=>DB.pending.filter(w=>!pendingStale(w));
function checkPending(){
  for(const w of DB.pending){
    if(w.hit||pendingStale(w))continue;
    const px=PRICES.get(w.ticker);
    if(px==null)continue;
    const reached=w.side==='up'?px>=w.trigger:px<=w.trigger;
    if(!reached)continue;
    w.hit=Date.now();
    const msg=w.ticker+' به تریگر ورود رسید ('+fmtPrice(w.trigger)+')';
    toast(msg,'ok');
    if(F('notify'))notify('میز سیگنال',msg,'trg'+w.id);
  }
  if(DB.pending.some(w=>w.hit))save();
}
/* سفارش منتظر که به پوزیشن تبدیل شود، از همان فرم ورود رد می‌شود تا محاسبه یکی بماند */
function fillPending(w){
  const post=POSTS.find(x=>x.id===w.postId);
  if(!post){toast('پست این سیگنال در حافظه نیست','err');return;}
  const sig=sigOf(post);
  const ov=OVERRIDE[post.id]||{};
  // ورود را روی تریگر می‌گذاریم چون عملاً همان‌جا پر می‌شود
  OVERRIDE[post.id]=Object.assign({},ov,{entry:w.trigger});
  DB.overrides=OVERRIDE;PCACHE.delete(post.id);
  sheetEnter(post,sig,OVERRIDE[post.id],PRICES.get(w.ticker)||null);
  DB.pending=DB.pending.filter(x=>x.id!==w.id);
  save();
}

