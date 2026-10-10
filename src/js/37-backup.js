/* ==================== خروجی و بازیابی ==================== */
function dl(name,text,type){
  const b=new Blob([text],{type:type||'application/json'});
  const u=URL.createObjectURL(b), a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(u);a.remove();},400);
}
/* شمارشِ همه‌ی چیزهایی که پشتیبان نگه می‌دارد — هم برای فایل هم برای دستگاه،
   تا قبل از جایگزینی معلوم باشد دقیقاً چه چیزی جای چه چیزی می‌نشیند. */
function dataCounts(d){
  const n=x=>Array.isArray(x)?x.length:(x&&typeof x==='object'?Object.keys(x).length:0);
  const spots=(Array.isArray(d.positions)?d.positions.filter(x=>x&&x.kind==='spot').length:0)+n(d.spot);
  return [['پوزیشن',n(d.positions)+n(d.spot)],['تصمیم',n(d.decisions)],['آموزش',n(d.lessons)],
          ['از این‌ها اسپات',spots],['منتظر',n(d.pending)],
          ['آرشیو',n(d.archived)],['نتایج',n(d.results)],['اصلاح دستی',n(d.overrides)],
          ['ویرایشِ کانال',n(d.edits)],['حذفِ کانال',n(d.gone)],['برگشته از قدیمی',n(d.revived)],
          ['تست بازار',d.rdbook&&Array.isArray(d.rdbook.items)?d.rdbook.items.filter(x=>x&&x.k==='test').length:0]];
}
function applyBackup(d){
  DB.positions=(d.positions||[]).map(ensureBase);
  // پشتیبان‌های قدیمی‌تر بعضی کلیدها را ندارند؛ نبودشان یعنی خالی، نه خطا
  fillDB(d);repairBase();
  OVERRIDE=DB.overrides; PCACHE.clear();
  if(d.settings&&typeof d.settings==='object'){Object.assign(S,d.settings);fixFeat();}
  // تست‌های بازار: پشتیبان‌های قدیمی ندارندشان؛ آن وقت تست‌های همین دستگاه می‌مانند
  if(d.rdbook&&Array.isArray(d.rdbook.items)){RB={items:d.rdbook.items.filter(x=>x&&x.id&&x.tk)};RBLC.clear();rbSave();}
  applySettingsToForm();readSettings();
  save();renderAll();
  migrateSpot();
}
function sheetRestore(d,name){
  const mine=dataCounts(Object.assign({},dbBlob(),{rdbook:RB})), file=dataCounts(d);
  if(!d.rdbook)file[file.length-1][1]=mine[mine.length-1][1];   // فایل قدیمی تست ندارد: تست‌های این دستگاه می‌مانند
  const when=d.exportedAt?jStampFa(new Date(d.exportedAt)):'نامعلوم';
  const rows=file.map(([l,v],i)=>{
    const m=mine[i][1], diff=v!==m;
    return '<tr'+(diff?' class="df"':'')+'><td>'+l+'</td><td>'+faN(v)+'</td><td>'+faN(m)+'</td></tr>';
  }).join('');
  openSheet(
   '<h3>بازیابی از پشتیبان</h3>'+
   '<div class="sub">فایل: <b dir="ltr">'+esc(name||'—')+'</b><br>ساخته شده: '+when+'</div>'+
   '<div class="tscroll"><table class="cmptab">'+
     '<thead><tr><th></th><th>در فایل</th><th>این دستگاه</th></tr></thead>'+
     '<tbody>'+rows+'</tbody></table></div>'+
   '<div class="rwarn bad">داده‌ی این دستگاه <b>کامل جایگزین</b> می‌شود، نه ادغام. '+
   'ردیف‌های برجسته آن‌هایی‌اند که فرق دارند.</div>'+
   (syncOn()?'<div class="hint">همگام‌سازی روشن است، پس بعد از بازیابی همین داده به سرور '+
     'فرستاده می‌شود و دستگاه‌های دیگر هم همین را می‌گیرند.</div>':
     '<div class="hint">همگام‌سازی خاموش است؛ این کار فقط روی همین دستگاه اثر دارد.</div>')+
   '<div class="srow"><button class="btn pri" id="ok">جایگزین کن</button>'+
   '<button class="btn" id="cx">انصراف</button></div>',
   ()=>{
     $('#cx').onclick=closeSheet;
     $('#ok').onclick=async()=>{
       applyBackup(d);
       closeSheet();
       toast('بازیابی شد','ok');
       if(syncOn()){
         // اول rev تازه را می‌گیریم، وگرنه نوشتن روی نسخه‌ی کهنه تعارض می‌دهد
         try{
           const r=await syncReq('GET');
           if(r.ok&&r.j){syncCfg.rev=r.j.rev||0;syncSave();}
           const ok=await syncPush();
           toast(ok?'روی سرور هم نشست':'به سرور نرفت — دستی «ارسال به سرور» را بزن',ok?'ok':'err');
         }catch(err){toast('به سرور نرفت','err');}
       }
     };
   });
}
function wireIO(){
  $('#btnExport').onclick=()=>{
    const now=new Date(), hh=String(now.getHours()).padStart(2,'0'),
          mm=String(now.getMinutes()).padStart(2,'0');
    dl('signal-desk-'+jKey(now)+'-'+hh+mm+'.json',
      JSON.stringify(Object.assign({v:5,exportedAt:Date.now()},dbBlob(),{settings:S,rdbook:RB}),null,2));
    bkMark();
    toast('پشتیبان گرفته شد','ok');
  };
  $('#btnCsv').onclick=()=>{
    const rows=[['نماد','جهت','اهرم','مارجین_باز','مارجین_کل','ورود','استاپ','استاپ_اولیه','خروج','کارمزد',
      'سود_قطعی_پله‌ها','سود_ضرر','درصد_مارجین','R','باز','بسته','یادداشت']];
    for(const p of DB.positions.filter(x=>x.status==='closed')){
      const m=posMetrics(p);
      rows.push([p.ticker,p.dir,p.lev,p.margin,baseMarginOf(p),p.entry,p.stop==null?'':p.stop,
        p.stop0==null?'':p.stop0,p.exitPrice==null?'':p.exitPrice,p.fees==null?0:p.fees,
        (m.realized||0).toFixed(4),(m.pnl==null?0:m.pnl).toFixed(4),(m.roi==null?0:m.roi).toFixed(2),
        m.r!=null?m.r.toFixed(3):'',jStamp(new Date(p.openedAt)),p.closedAt?jStamp(new Date(p.closedAt)):'',
        (p.note||'').replace(/"/g,'""')]);
    }
    if(rows.length===1)return toast('معامله بسته‌شده‌ای نیست','err');
    dl('trades-'+jKey(new Date())+'.csv','﻿'+rows.map(r=>r.map(x=>'"'+String(x)+'"').join(',')).join('\n'),'text/csv');
    toast('CSV ساخته شد','ok');
  };
  $('#btnImport').onclick=()=>$('#fileIn').click();
  $('#fileIn').onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const rd=new FileReader();
    rd.onload=()=>{
      let d=null;
      try{
        d=JSON.parse(rd.result);
        if(!d||typeof d!=='object'||!Array.isArray(d.positions))throw 0;
      }catch(err){toast('فایل معتبر نیست','err');e.target.value='';return;}
      sheetRestore(d,f.name);
      e.target.value='';
    };
    rd.readAsText(f);
  };
}

