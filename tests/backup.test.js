const {chromium} = require('./lib').pw;
const kv = new Map();
const env = { SYNC_TOKEN:'tok', STORE:{ get:async k=>kv.get(k)??null, put:async (k,v)=>{kv.set(k,v);} } };

(async () => {
  const worker = (await import(require('./lib').root('proxy/worker.js'))).default;
  const b = await chromium.launch();
  const mk = async () => {
    const p = await b.newPage({viewport:{width:412,height:900}});
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.route('**', async r => {
      const u = r.request().url();
      if (u.includes('localhost:8899')) return r.continue();
      if (u.includes('my.worker.test')) {
        const req = new Request(u,{method:r.request().method(),headers:r.request().headers(),
                                   body:r.request().postData()||undefined});
        const res = await worker.fetch(req, env);
        return r.fulfill({status:res.status, headers:Object.fromEntries(res.headers), body:await res.text()});
      }
      return r.abort();
    });
    await p.goto('http://localhost:8899/index.html',{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(3200);
    return p;
  };

  // --- دستگاه A: داده‌ی پر ---
  const A = await mk();
  await A.evaluate(() => {
    DB.positions=[ensureBase({id:'p1',ticker:'BTC',dir:'long',entry:60000,stop:59000,margin:10,lev:3,
      status:'open',openedAt:Date.now(),targets:[62000],partials:[],log:[]})];
    DB.lessons={L1:{id:'L1',title:'فیبوناچی',text:'x',at:Date.now(),cat:'تکنیکال'}};
    DB.watch=[{sym:'BTC',cat:'اسپات',at:Date.now()},{sym:'SOL',cat:'نوسانی',at:Date.now()}];
    DB.spot=[{id:'s1',ticker:'BTC',qty:0.5,buy:50000,at:Date.now(),note:''}];
    DB.archived={'c/1/9':Date.now()};
    DB.pending=[{id:'w1',postId:'c/1/5',ticker:'ETH',dir:'long',trigger:3200,side:'up',at:Date.now(),hit:null}];
    DB.overrides={'c/1/5':{sig:true,ticker:'ETH'}};
    DB.decisions={'c/1/5':{action:'taken',at:Date.now()}};
    save();
  });
  const backup = await A.evaluate(() => JSON.stringify({v:4,exportedAt:Date.now(),
    positions:DB.positions,decisions:DB.decisions,settings:S,overrides:DB.overrides,
    lessons:DB.lessons,archived:DB.archived,pending:DB.pending,watch:DB.watch,spot:DB.spot}));
  const src = JSON.parse(backup);
  console.log('=== پشتیبان شامل ===');
  console.log(' ', Object.keys(src).filter(k=>k!=='v'&&k!=='exportedAt').join(', '));

  // --- دستگاه B: خالی، همگام‌سازی روشن، بازیابی از فایل ---
  const B = await mk();
  await B.evaluate(() => { syncCfg={url:'https://my.worker.test',token:'tok',rev:0,at:0}; syncSave(); });
  const before = await B.evaluate(() => ({p:DB.positions.length,l:Object.keys(DB.lessons).length,
    w:DB.watch.length,s:DB.positions.filter(x=>x.kind==='spot').length}));
  console.log('\n=== دستگاه B قبل از بازیابی ===');
  console.log(' ', JSON.stringify(before));

  await B.evaluate(j => sheetRestore(JSON.parse(j),'backup.json'), backup);
  await B.waitForTimeout(500);
  const tab = await B.$$eval('.cmptab tbody tr', e=>e.map(r=>[...r.children].map(c=>c.textContent).join(':')));
  console.log('\n=== جدول مقایسه (فایل / دستگاه) ===');
  console.log(' ', tab.join('  |  '));
  const hilite = await B.$$eval('.cmptab tr.df td:first-child', e=>e.map(x=>x.textContent));
  console.log('  ردیف‌های متفاوت:', hilite.join('، '));

  await B.click('#ok'); await B.waitForTimeout(1800);
  const after = await B.evaluate(() => ({p:DB.positions.length,l:Object.keys(DB.lessons).length,
    w:DB.watch.length,s:DB.positions.filter(x=>x.kind==='spot').length,a:Object.keys(DB.archived).length,
    pe:DB.pending.length,o:Object.keys(DB.overrides).length,d:Object.keys(DB.decisions).length}));
  console.log('\n=== بعد از بازیابی ===');
  console.log(' ', JSON.stringify(after));
  const ok = after.p===2&&after.l===1&&after.w===2&&after.s===1&&after.a===1&&after.pe===1&&after.o===1&&after.d===1;
  console.log('  همه‌ی بخش‌ها آمد:', ok ? '✅' : '❌');
  console.log('  روی سرور نشست:', await B.evaluate(() => syncCfg.rev) > 0 ? '✅ نسخه '+await B.evaluate(()=>syncCfg.rev) : '❌');

  // --- دستگاه C: فقط همگام‌سازی، بدون فایل ---
  const C = await mk();
  await C.evaluate(() => { syncCfg={url:'https://my.worker.test',token:'tok',rev:0,at:0}; syncSave(); });
  await C.evaluate(() => syncPull());
  await C.waitForTimeout(600);
  const got = await C.evaluate(() => ({p:DB.positions.length,l:Object.keys(DB.lessons).length,
    w:DB.watch.length,s:DB.positions.filter(x=>x.kind==='spot').length,pe:DB.pending.length}));
  console.log('\n=== دستگاه C فقط از سرور ===');
  console.log(' ', JSON.stringify(got),
    got.p===2&&got.l===1&&got.w===2&&got.s===1&&got.pe===1 ? '✅ همان داده' : '❌');
  await b.close();
})();
