const {chromium} = require('./lib').pw;

// انبار جعلی KV در حافظه — کد واقعی ورکر رویش اجرا می‌شود
const kv = new Map();
const env = { SYNC_TOKEN: 'secret-token-123', STORE: {
  get: async k => kv.get(k) ?? null,
  put: async (k,v) => { kv.set(k,v); },
}};

(async () => {
  const mod = await import(require('./lib').root('proxy/worker.js'));
  const worker = mod.default;
  const b = await chromium.launch();
  const mkPage = async () => {
    const p = await b.newPage({viewport:{width:412,height:880}});
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.route('**', async r => {
      const u = r.request().url();
      if (u.includes('localhost:8899')) return r.continue();
      if (u.includes('my.worker.test')) {                 // ورکر واقعی را صدا بزن
        const req = new Request(u, {method: r.request().method(),
          headers: r.request().headers(), body: r.request().postData() || undefined});
        const res = await worker.fetch(req, env);
        return r.fulfill({status: res.status, headers: Object.fromEntries(res.headers),
                          body: await res.text()});
      }
      return r.abort();
    });
    await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
    await p.waitForTimeout(3500);
    await p.evaluate(t => { syncCfg = {url:'https://my.worker.test', token:t, rev:0, at:0};
                            syncSave(); }, 'secret-token-123');
    return p;
  };

  // ---- دستگاه ۱: یک پوزیشن و یک آموزش بساز و بفرست ----
  const A = await mkPage();
  await A.evaluate(() => {
    DB.positions.push(ensureBase({id:'p1',ticker:'BTC',dir:'long',lev:3,margin:10,
      entry:60000,stop:59000,status:'open',openedAt:Date.now()}));
    DB.lessons['L1']={id:'L1',title:'فیبوناچی',text:'متن آموزش',at:Date.now(),cat:'تکنیکال'};
    save();
  });
  console.log('دستگاه ۱ ارسال:', await A.evaluate(() => syncPush()) ? '✅' : '❌',
    '| نسخه:', await A.evaluate(() => syncCfg.rev));

  // ---- دستگاه ۲: خالی، از سرور بگیر ----
  const B = await mkPage();
  await B.evaluate(() => syncPull());
  const got = await B.evaluate(() => ({p: DB.positions.length, l: Object.keys(DB.lessons).length,
                                       t: (DB.positions[0]||{}).ticker, cat:(DB.lessons.L1||{}).cat}));
  console.log('دستگاه ۲ دریافت:', JSON.stringify(got),
    got.p===1 && got.l===1 && got.t==='BTC' ? '✅' : '❌');

  // ---- رمز غلط ----
  const bad = await B.evaluate(async () => {
    const old = syncCfg.token; syncCfg.token='wrong';
    const r = await syncReq('GET'); syncCfg.token=old;
    return {status:r.status, msg:(r.j||{}).error};
  });
  console.log('رمز غلط →', bad.status, bad.msg, bad.status===401 ? '✅' : '❌');

  // ---- تعارض: هر دو دستگاه بنویسند ----
  await B.evaluate(() => { DB.lessons['L2']={id:'L2',title:'از دستگاه دو',text:'x',at:Date.now()}; });
  await B.evaluate(() => syncPush());                       // سرور می‌رود نسخه ۲
  await A.evaluate(() => { DB.lessons['L3']={id:'L3',title:'از دستگاه یک',text:'y',at:Date.now()}; });
  await A.evaluate(() => syncPush());                       // نسخه‌ی کهنه → باید ۴۰۹
  await A.waitForTimeout(700);
  // از این نسخه به بعد تعارض رکوردبه‌رکورد ادغام می‌شود و پنجره‌ی انتخاب نمی‌آید
  const sheetUp = await A.evaluate(() => !!document.querySelector('#takeSrv'));
  console.log('تعارض بدون پنجره ادغام شد:', !sheetUp ? 'بله ✅' : 'خیر ❌');
  const afterA = await A.evaluate(() => Object.keys(DB.lessons).sort().join(','));
  console.log('دستگاه ۱ بعد از ادغام:', afterA, afterA==='L1,L2,L3' ? '✅' : '❌');
  await B.evaluate(() => syncPull(true));
  const afterB = await B.evaluate(() => Object.keys(DB.lessons).sort().join(','));
  console.log('دستگاه ۲ بعد از دریافت:', afterB, afterB==='L1,L2,L3' ? '✅' : '❌');

  // ---- بدون KV ----
  const noKv = await worker.fetch(new Request('https://my.worker.test/db',
    {headers:{Authorization:'Bearer secret-token-123'}}), {SYNC_TOKEN:'secret-token-123'});
  console.log('بدون KV →', noKv.status, (await noKv.json()).error, noKv.status===500 ? '✅' : '❌');

  // ---- پروکسی هنوز کار می‌کند؟ ----
  const px = await worker.fetch(new Request('https://my.worker.test/?url=https%3A%2F%2Fevil.example%2Fx'), env);
  console.log('میزبان غیرمجاز →', px.status, px.status===403 ? 'رد شد ✅' : 'قبول شد ❌');
  await b.close();
})();
