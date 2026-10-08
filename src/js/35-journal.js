/* ==================== دفتر معامله ==================== */
/* برچسب ستاپ و حال روحیِ هر معامله؛ بعداً در کارنامه معلوم می‌شود کدام ستاپ و کدام حال
   برایت پول ساخته و کدام برده. هر دو اختیاری‌اند. */
const SETUPS0=['بریک‌اوت','پولبک','حمایت/مقاومت','ترند','اسکلپ','سیگنال کانال'];
const MOODS=[['plan','طبق برنامه'],['fomo','عجله / جا نمونم'],['fear','ترس'],['revenge','جبران ضرر'],['bored','بی‌حوصلگی']];
const MOOD_FA=Object.fromEntries(MOODS);
let TAGSEL={setup:'',mood:''};
const setupList=()=>{const l=Array.isArray(S.setups)&&S.setups.length?S.setups:SETUPS0;
  return [...new Set(l.concat(DB.positions.map(p=>p.setup).filter(Boolean)))].slice(0,14);};
function tagPickHtml(cur){
  cur=cur||{};
  const chip=(g,v,t)=>'<button type="button" class="pbc'+(cur[g]===v?' on':'')+'" data-g="'+g+'" data-v="'+esc(v)+'" aria-pressed="'+(cur[g]===v)+'">'+esc(t)+'</button>';
  return '<details class="sec sub2 tagpick"'+(cur.setup||cur.mood?' open':'')+'><summary>'+ic('tag')+'ستاپ و حال موقع ورود <span class="markhint">اختیاری</span></summary>'+
    '<div class="tgl">ستاپ</div><div class="pbpick">'+setupList().map(x=>chip('setup',x,x)).join('')+
      '<button type="button" class="pbc add" data-g="setup" data-new="1">+ تازه</button></div>'+
    '<div class="tgl">حال</div><div class="pbpick">'+MOODS.map(([k,t])=>chip('mood',k,t)).join('')+'</div></details>';
}
function wireTagPick(root,sel){
  root.querySelectorAll('.tagpick .pbc').forEach(b=>b.onclick=async()=>{
    const g=b.dataset.g;
    if(b.dataset.new){
      const v=((await askText({title:'ستاپ تازه',msg:'اسم کوتاهی برای این نوع ورود (مثلاً «شکست سقف»)',placeholder:'نام ستاپ',ok:'افزودن',tone:'info',icon:'+'}))||'').trim().slice(0,30);if(!v)return;
      S.setups=[...new Set(setupList().concat([v]))];DB.settings=Object.assign({},S);save();
      const nb=el('button','pbc',esc(v));nb.type='button';nb.dataset.g='setup';nb.dataset.v=v;b.before(nb);
      wireTagPick(root,sel);nb.click();return;
    }
    const v=sel[g]===b.dataset.v?'':b.dataset.v;sel[g]=v;
    root.querySelectorAll('.tagpick .pbc[data-g="'+g+'"]').forEach(x=>{const on=x.dataset.v===v&&!!v;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on);});
  });
}
function sheetTags(p){
  const sel={setup:p.setup||'',mood:p.mood||''};
  openSheet('<h3>برچسب معامله · '+esc(p.ticker)+'</h3><div class="sub">در کارنامه، بخش «دفتر معامله»، نتیجه‌ی هر ستاپ و هر حال جدا حساب می‌شود.</div>'+
    tagPickHtml(sel).replace('<details class="sec sub2 tagpick"','<details open class="sec sub2 tagpick"')+
    '<div class="srow"><button class="btn pri" id="ok">ذخیره</button><button class="btn" id="cx">انصراف</button></div>',
   sh=>{wireTagPick(sh,sel);$('#cx').onclick=closeSheet;
     $('#ok').onclick=()=>{p.setup=sel.setup||undefined;p.mood=sel.mood||undefined;save();closeSheet();renderAll();toast('برچسب ثبت شد','ok');};});
}
const WEEK_FA=['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
const cleanTrade=p=>!(p.viol&&p.viol.length);
function journalPanel(list){
  const w=el('div','panel jr');
  w.appendChild(el('div','panelhead','<b>دفتر معامله</b><span class="markhint">از روی '+faN(list.length)+' معامله‌ی بسته</span>'));
  const table=groups=>{
    const rows=groups.filter(g=>g[1].length);
    if(!rows.length)return '<div class="hint">هنوز داده‌ای نیست.</div>';
    return '<div class="tscroll"><table class="tp"><thead><tr><th></th><th>تعداد</th><th>برد</th><th>خالص</th><th>میانگین R</th></tr></thead><tbody>'+
      rows.map(([l,a])=>{const s=agg(a);return '<tr><td>'+esc(l)+'</td><td class="num">'+faN(s.n)+'</td><td class="num">'+
        (s.winRate==null?'—':faN(s.winRate.toFixed(0))+'٪')+'</td><td class="num" style="color:var(--'+(s.pnl>=0?'up':'dn')+')">'+
        fmtUsd(s.pnl)+'</td><td class="num">'+(s.avgR==null?'—':fmtR(s.avgR))+'</td></tr>';}).join('')+'</tbody></table></div>';
  };
  const by=(fn,order)=>{const m=new Map();for(const p of list){const k=fn(p);if(k==null)continue;(m.get(k)||m.set(k,[]).get(k)).push(p);}
    return (order||[...m.keys()]).filter(k=>m.has(k)).map(k=>[k,m.get(k)]);};
  const sec=(title,body,open)=>{const d=el('details','sec sub2 jsec');if(open)d.open=true;d.innerHTML='<summary>'+title+'</summary>'+body;w.appendChild(d);};
  // طبق نقشه در برابر بقیه
  const plan=list.filter(p=>p.pb&&cleanTrade(p)), viol=list.filter(p=>!cleanTrade(p)), nopb=list.filter(p=>!p.pb&&cleanTrade(p));
  const vs=agg(viol), cost=viol.length?vs.pnl-(agg(list.filter(cleanTrade)).expectancy||0)*viol.length:0;
  sec('طبق نقشه یا دستی',table([['طبق نقشه',plan],['بدون نقشه',nopb],['خلاف نقشه',viol]])+
    (viol.length?'<div class="hint">'+faN(viol.length)+' معامله با تخلف: جمعاً '+fmtUsd(vs.pnl)+
      (cost<0?'؛ اگر مثل بقیه‌ی معامله‌هایت بودند حدود <b>'+fmtUsd(-cost)+'</b> بیشتر داشتی':'')+'.</div>':''),true);
  if(viol.length)sec('تخلف‌ها',table(Object.keys(VIOL_FA).map(k=>[VIOL_FA[k],viol.filter(p=>p.viol.some(v=>v.k===k))])));
  sec('چرا بستی',table(by(p=>p.why?WHY_FA[p.why]||p.why:'بدون برچسب')),list.some(p=>p.why));
  sec('ستاپ',table(by(p=>p.setup||'بدون برچسب')));
  sec('حال موقع ورود',table(by(p=>p.mood?MOOD_FA[p.mood]||p.mood:'بدون برچسب')));
  sec('روز هفته (روز ورود)',table(by(p=>p.openedAt?WEEK_FA[new Date(p.openedAt).getDay()]:null,[6,0,1,2,3,4,5].map(i=>WEEK_FA[i]))));
  const hb=h=>String(h).padStart(2,'0');
  sec('ساعت ورود',table(by(p=>{if(!p.openedAt)return null;const h=Math.floor(new Date(p.openedAt).getHours()/4)*4;return hb(h)+' تا '+hb(h+4);},
    [0,4,8,12,16,20].map(h=>hb(h)+' تا '+hb(h+4)))));
  return w;
}
/* ضریب سود بدون هیچ باختی بی‌نهایت است؛ «∞» روی یک معامله گمراه‌کننده بود */
const pfTxt=pf=>pf==null||pf===Infinity?'—':pf.toFixed(2);
const SMALL_N=10;
/* برچسب «فیلتر» کانال‌سنج باید بگوید چه چیزی کنار رفته؛ «دیرهنگام‌ها» پیش‌فرض کنار می‌روند و
   قبلاً بی‌توضیح «8 از 9» دیده می‌شد */
function audFilterPill(all,rows){
  const user=(AF.dir!=='all')+(AF.mkt!=='all')+(!!AF.rr)+(!!AF.span)+(!!AF.sym)+(!!AF.iso);
  const late=AF.noLate?all.filter(x=>x.r&&x.r.late).length:0;
  const t=user?'فیلتر: '+faN(rows.length)+' از '+faN(all.length):faN(late)+' دیرهنگام در آمار نیامد';
  return '<span class="pill gold" title="از بخش «فیلتر» عوضش کن">'+t+'</span>';
}
function statsOf(a,big){
  const st=el('div','stats');
  let h='';
  const add=(l,v,c,sub)=>h+='<div class="st"><b>'+l+'</b><span class="'+(c||'')+'">'+v+'</span>'+(sub?'<small>'+sub+'</small>':'')+'</div>';
  add('خالص',fmtUsd(a.pnl),cls(a.pnl),a.fees?'کارمزد '+fmtUsd(a.fees):'');
  add('معامله',faN(a.n),'',faN(a.wins)+' برد / '+faN(a.losses)+' باخت');
  add('نرخ برد',a.winRate==null?'—':faN(a.winRate.toFixed(0))+'٪',a.winRate==null?'m':(a.winRate>=50?'u':'d'));
  add('ضریب سود',pfTxt(a.pf),a.pf==null||a.pf===Infinity?'m':(a.pf>=1?'u':'d'),a.pf===Infinity?'هنوز باختی نبوده':'سود÷ضرر');
  add('میانگین R',a.avgR==null?'—':fmtR(a.avgR).replace('R',''),a.avgR==null?'m':cls(a.avgR),
    a.totalR!=null?'مجموع '+fmtR(a.totalR):'');
  add('میانگین هر معامله',a.expectancy==null?'—':fmtUsd(a.expectancy),a.expectancy==null?'m':cls(a.expectancy));
  if(big){
    add('میانگین برد',a.wins?fmtUsd(a.avgWin):'—',a.wins?'u':'m');
    add('میانگین باخت',a.losses?fmtUsd(-a.avgLoss):'—',a.losses?'d':'m');
    // بهترین و بدترین با رنگ خودشان: اگر همه معامله‌ها ضرر بوده‌اند، «بهترین» هم سبز نمی‌شود.
    // با یکی دو معامله «بهترین» و «بدترین» همان یک معامله‌اند و فقط شلوغ می‌کنند.
    if(a.n>=3&&a.best)add('بهترین',fmtUsd(a.best.v),cls(a.best.v),esc(a.best.p.ticker));
    if(a.n>=3&&a.worst)add('بدترین',fmtUsd(a.worst.v),cls(a.worst.v),esc(a.worst.p.ticker));
    add('بازده حساب',fmtPct((a.pnl/S.acct)*100),cls(a.pnl),'روی $'+faN(S.acct));
  }
  // صداقت آماری: نرخ برد و ضریب سود با چند معامله تقریباً هیچ چیز نمی‌گویند
  if(a.n>0&&a.n<SMALL_N)h+='<div class="stnote">'+ic('info')+'<span>فقط '+faN(a.n)+' معامله — '+
    'این عددها با دست‌کم '+faN(SMALL_N)+' معامله معنی پیدا می‌کنند.</span></div>';
  st.innerHTML=h;return st;
}
function equityCurve(closed){
  const list=[...closed].sort((a,b)=>a.closedAt-b.closedAt);
  const pts=[];let c=0,peak=0,maxDD=0;
  for(const p of list){c+=posMetrics(p).pnl||0;pts.push(c);
    if(c>peak)peak=c; const dd=peak-c; if(dd>maxDD)maxDD=dd;}
  if(pts.length<2)return el('div','hint','برای نمودار رشد سرمایه حداقل دو معامله بسته‌شده لازم است.');
  const W=600,H=140,pad=8;
  const min=Math.min(0,...pts),max=Math.max(0,...pts),rng=(max-min)||1;
  const X=i=>pad+(i/(pts.length-1))*(W-2*pad);
  const Y=v=>H-pad-((v-min)/rng)*(H-2*pad);
  let d='',len=0,px=null;
  pts.forEach((v,i)=>{
    const x=X(i),y=Y(v);
    d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)+' ';
    if(px)len+=Math.hypot(x-px[0],y-px[1]);
    px=[x,y];
  });
  const zero=Y(0), last=pts[pts.length-1];
  const col=last>=0?'var(--up)':'var(--dn)';
  const area=d+'L'+X(pts.length-1).toFixed(1)+' '+zero.toFixed(1)+' L'+X(0).toFixed(1)+' '+zero.toFixed(1)+' Z';
  const wrap=el('div','eqw');
  const dt=p=>jShort(new Date(p.closedAt));
  wrap.innerHTML='<div style="font-size:12px;color:var(--tx2);font-weight:700;margin:12px 0 4px">'+
    'رشد سرمایه · بیشترین افت از سقف: <span style="color:var(--dn);direction:ltr;display:inline-block">'+fmtUsd(-maxDD)+'</span></div>'+
    '<svg class="eq" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="--len:'+Math.ceil(len)+'" role="img" '+
      'aria-label="نمودار رشد سرمایه؛ برای جزئیات هر معامله رویش بزن">'+
    '<path d="'+area+'" fill="'+col+'" opacity=".10"/>'+
    '<line x1="0" y1="'+zero.toFixed(1)+'" x2="'+W+'" y2="'+zero.toFixed(1)+
    '" stroke="var(--line2)" stroke-width="1" stroke-dasharray="3 3"/>'+
    '<path class="ln" d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linejoin="round"/>'+
    '<line class="eqm" x1="0" x2="0" y1="0" y2="'+H+'" stroke="var(--gold)" stroke-width="1.5" vector-effect="non-scaling-stroke" opacity="0"/></svg>'+
    // محور زمان: زمان همیشه چپ‌به‌راست است، مثل خود نمودار
    '<div class="eqax"><span>'+dt(list[0])+'</span><span>'+dt(list[list.length-1])+'</span></div>'+
    '<div class="eqcap" dir="rtl">روی نمودار بزن تا هر معامله را ببینی</div>';
  /* لمس یا حرکت روی نمودار: نزدیک‌ترین معامله، تاریخش، نتیجه‌اش و جمع تا آن لحظه */
  const svg=wrap.querySelector('svg'), mk=wrap.querySelector('.eqm'), cap=wrap.querySelector('.eqcap');
  const show=e=>{
    const r=svg.getBoundingClientRect(), fr=clamp((e.clientX-r.left)/r.width,0,1);
    const i=Math.round(fr*(pts.length-1)), p=list[i], pn=posMetrics(p).pnl||0, x=X(i);
    mk.setAttribute('x1',x);mk.setAttribute('x2',x);mk.setAttribute('opacity','1');
    cap.innerHTML='<bdi dir="ltr"><b>'+esc(p.ticker||'')+'</b></bdi> · '+dt(p)+' · <bdi class="'+cls(pn)+'" dir="ltr">'+fmtUsd(pn)+'</bdi>'+
      ' · جمع <bdi class="'+cls(pts[i])+'" dir="ltr">'+fmtUsd(pts[i])+'</bdi>';
  };
  svg.addEventListener('pointermove',show);svg.addEventListener('pointerdown',show);
  return wrap;
}
/* جای گزارش قدیمیِ «نگرفته‌ها» که با قیمت همین لحظه حساب می‌کرد: همان مقایسه، ولی با
   نتیجه‌ی واقعیِ کانال‌سنج. اگر هنوز سنجیده نشده، سنجش همین‌جا شروع می‌شود. */
function repVsChannel(list){
  const c=buildVsChannel(audRows());
  // «اجرای تو در برابر قاعده‌ی من» هم همین‌جا: سه مقایسه در یک بخش
  const vr=vsRule(list||[]);
  if(vr){const gap=vr.me-vr.ru;
    c.appendChild(el('div','flag '+(gap<-0.3?'d':gap>0.3?'u':'i'),'<i>'+(gap<-0.3?'!':'✓')+'</i><span>در برابر قاعده‌ی من: روی '+faN(vr.n)+' معامله‌ای که از سیگنال گرفتی، خودت '+fmtR(vr.me)+
      '، اگر دقیقاً «قاعده‌ی من» را اجرا کرده بودی '+fmtR(vr.ru)+'. '+(gap<-0.3?'اجرای دستی‌ات '+fmtR(gap)+' هزینه داشته.':gap>0.3?'اجرای تو بهتر از قاعده بوده.':'تقریباً همان.')+'</span>'));}
  return c;
}

