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
    entry:I.entry!=null?I.entry:trigger,stop:I.stop||null,targets:sig.targets||[],tf:sig.trigTf||null,
    at:Date.now(),hit:null});
  save();renderAll();
  toast('منتظر '+fmtPrice(trigger)+(sig.trigTf?' (بسته شدن کندل '+TF_FA[sig.trigTf]+')':'')+' ماند','ok');
}
const TF_FA={'1h':'یک‌ساعته','4h':'۴ ساعته','1d':'روزانه'}, TF_MS={'1h':36e5,'4h':144e5,'1d':864e5};
/* تریگرِ «با بسته شدن کندل»: لمس کافی نیست؛ آخرین کندلِ بسته‌شده‌ی آن تایم‌فریم (هم‌مرز با UTC، مثل
   بایننس) باید آن سوی تریگر بسته شده باشد. کندل ساعتی گرفته و بسته‌ی هر ۴ ساعت/روز از آن خوانده می‌شود. */
const PCLOSE=new Map();
async function pendCloseCheck(w){
  const ms=TF_MS[w.tf];if(!ms)return;
  const last=PCLOSE.get(w.id)||0;if(Date.now()-last<2*60000)return;
  PCLOSE.set(w.id,Date.now());
  const B=Math.floor(Date.now()/ms)*ms;                  // آخرین مرزِ بسته‌شده
  if(B<=(w.postAt||w.at)||w.closeChecked===B)return;     // هنوز کندلی بعد از سیگنال بسته نشده، یا همین را دیده‌ایم
  try{
    const C=await audCandles(w.ticker,'1h',B-3*36e5,4,true);
    const k=C.find(x=>x.t===B-36e5);if(!k)return;
    w.closeChecked=B;
    if(!(w.side==='up'?k.c>=w.trigger:k.c<=w.trigger)){save();return;}
    w.hit=Date.now();
    const msg=w.ticker+': کندل '+TF_FA[w.tf]+' '+(w.side==='up'?'بالای':'زیر')+' '+fmtPrice(w.trigger)+' بسته شد ('+fmtPrice(k.c)+')';
    toast(msg,'ok');if(F('notify'))notify('میز سیگنال',msg,'trg'+w.id);
    save();renderAll();
  }catch(e){}
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
    if(w.tf){                                            // لمس فقط خبر؛ ورود با بسته شدن کندل
      if(reached&&!w.touch){w.touch=Date.now();toast(w.ticker+' تریگر '+fmtPrice(w.trigger)+' را لمس کرد؛ منتظر بسته شدن کندل '+TF_FA[w.tf],'info');save();}
      if(w.touch)pendCloseCheck(w);
      continue;
    }
    if(!reached)continue;
    w.hit=Date.now();
    const msg=w.ticker+(w.kind==='tier2'?' به پله‌ی دوم رسید (':' به تریگر ورود رسید (')+fmtPrice(w.trigger)+')';
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

