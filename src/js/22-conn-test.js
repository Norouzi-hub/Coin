/* ==================== تست اتصال ==================== */
/* همه‌ی مسیرها را یکی‌یکی امتحان می‌کند و نتیجه‌ی هر کدام را جدا برمی‌گرداند */
async function runDiag(onRow,only){
  logIt('info','— شروع تست اتصال —');
  const rows=[];
  // only==='kd': فقط منبع‌های کندل (دکمه‌ی «آزمایش اتصال» در کانال‌سنج)
  if(only==='kd'){await diagCandles(rows,onRow);logIt('info','— پایان تست اتصال —');return rows;}
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
  await diagCandles(rows,onRow);
  logIt('info','— پایان تست اتصال —');
  // مسیری که در تست جواب داد، همان لحظه مسیر پیش‌فرض می‌شود تا بروزرسانی بعدی از آن برود
  const win=rows.find(r=>r.kind==='tg'&&r.ok);
  if(win){
    const rt=allRoutes().find(x=>x.name===win.name);
    if(rt){setGoodRoute('tg',rt.id);DEADROUTE.delete(rt.id);logIt('info','مسیر پیش‌فرض شد: '+win.name);}
  }
  return rows;
}

/* منبع‌های کندل کانال‌سنج: از هر کدام چند کندل ۵ دقیقه‌ای بیت‌کوین، هم‌زمان (از هر مسیری که باز است) */
async function diagCandles(rows,onRow){
  const st=Date.now()-3*3600e3;
  await Promise.all(AUD_SRC.map(async src=>{
    const row={kind:'kd',name:src.n,busy:true};rows.push(row);onRow&&onRow(row);
    const t0=performance.now();
    try{
      const url=src.u('BTC',src.iv['5m'],Math.floor(st/3e5)*3e5,5);
      const got=await fetchVia(url,{json:true,timeout:12000,kind:'px',label:'آزمایش کندل · '+src.n,validate:src.ok||(x=>Array.isArray(x))});
      const n=audParse(src,got.data).length;
      Object.assign(row,{busy:false,ok:!!n,ms:Math.round(performance.now()-t0),msg:n?'باز است · '+got.route:'جواب داد ولی کندلی نداشت'});
    }catch(e){const m=String(e&&e.message||e);
      Object.assign(row,{busy:false,ok:false,msg:'بسته · '+(m==='no-route'?'از هیچ مسیری جواب نیامد':m.slice(0,90))});}
    onRow&&onRow(row);
  }));
}
