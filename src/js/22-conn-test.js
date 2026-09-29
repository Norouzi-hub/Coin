/* ==================== تست اتصال ==================== */
/* همه‌ی مسیرها را یکی‌یکی امتحان می‌کند و نتیجه‌ی هر کدام را جدا برمی‌گرداند */
async function runDiag(onRow){
  logIt('info','— شروع تست اتصال —');
  const rows=[];
  const url=tgUrl(null);
  for(const route of allRoutes()){
    const busyRow={kind:'tg',name:route.name,busy:true};
    rows.push(busyRow);onRow&&onRow(busyRow);
    const res=await tryRoute(route,url,{validate:looksLikeTg,timeout:11000});
    Object.assign(busyRow,{busy:false,ok:res.ok,ms:res.ms,msg:res.ok?'صفحه‌ی کانال آمد':res.msg,why:res.why,status:res.status});
    logIt(res.ok?'ok':'warn','تست تلگرام · '+route.name+' — '+busyRow.msg,{route:route.name,ms:res.ms,status:res.status,why:res.why});
    onRow&&onRow(busyRow);
  }
  for(const s of PRICE_SRC){
    const busyRow={kind:'px',name:s.n,busy:true};
    rows.push(busyRow);onRow&&onRow(busyRow);
    const res=await tryRoute(routeById('direct'),s.u,{json:true,validate:okRows,timeout:9000});
    Object.assign(busyRow,{busy:false,ok:res.ok,ms:res.ms,msg:res.ok?'قیمت‌ها آمد (مستقیم)':res.msg,why:res.why,status:res.status});
    logIt(res.ok?'ok':'warn','تست قیمت · '+s.n+' — '+busyRow.msg,{route:'مستقیم',ms:res.ms,status:res.status,why:res.why});
    onRow&&onRow(busyRow);
  }
  logIt('info','— پایان تست اتصال —');
  // مسیری که در تست جواب داد، همان لحظه مسیر پیش‌فرض می‌شود تا بروزرسانی بعدی از آن برود
  const win=rows.find(r=>r.kind==='tg'&&r.ok);
  if(win){
    const rt=allRoutes().find(x=>x.name===win.name);
    if(rt){setGoodRoute('tg',rt.id);DEADROUTE.delete(rt.id);logIt('info','مسیر پیش‌فرض شد: '+win.name);}
  }
  return rows;
}

