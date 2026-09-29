const {chromium} = require('./lib').pw;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await p.route('**', r => r.request().url().includes('localhost:8899') ? r.continue() : r.abort());
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);

  const run = o => p.evaluate(o => computePlan(o), o);
  const show = (t, r, want) => {
    const errs = [];
    for (const k of Object.keys(want)) {
      const got = typeof r[k] === 'number' ? +r[k].toFixed(3) : r[k];
      const w = want[k];
      const ok = Array.isArray(w) ? JSON.stringify(got)===JSON.stringify(w)
               : (typeof w === 'number' ? Math.abs(got - w) < 0.01 : got === w);
      if (!ok) errs.push(`${k}=${got} ≠ ${w}`);
    }
    console.log(errs.length ? '❌' : '✅', t.padEnd(30), errs.join(' · '));
  };

  const base = {direction:'long', entry:60000, stop:59000, capital:10, riskPct:5,
                maxLeverage:10, mode:'margin', rMultiples:[1.5,3]};

  // sd = 1000/60000 = 0.0166667 ؛ اهرمِ لازم برای ریسک ۵٪ = 0.05/0.0166667 = 3
  let r = await run(base);
  show('اهرم از ریسک', r, {leverage:3, margin:10, notional:30, actualRisk:0.5, actualRiskPct:5,
                           stopDistPct:1.667, qty:0.0005});
  // لیکوئید: 1/3 − 0.005 = 0.328333 → 60000×0.671667 = 40300
  show('  لیکوئید', r, {liqPrice:40300});
  // تارگت ۱٫۵R: 60000×(1+1.5×0.0166667) = 61500 ؛ سود = 30×1.5×0.0166667 = 0.75
  console.log('   تارگت ۱٫۵R →', r.targets[0].price.toFixed(0), '| سود', r.targets[0].profit.toFixed(2),
    (Math.abs(r.targets[0].price-61500)<1 && Math.abs(r.targets[0].profit-0.75)<0.01) ? '✅' : '❌');

  // اهرم دستی ۱۰ → ریسک سه برابر می‌شود
  r = await run({...base, leverageOverride:10});
  show('اهرم دستی ۱۰', r, {leverage:10, notional:100, actualRisk:1.667, actualRiskPct:16.667});
  console.log('   هشدارها:', r.warnings.join(', ') || '(هیچ)',
    r.warnings.includes('over-risk') ? '✅ هشدار ریسک' : '❌ هشدار ریسک نداد');

  // اهرم خیلی بالا → استاپ بعد از لیکوئید می‌افتد
  r = await run({...base, leverageOverride:60, maxLeverage:125});
  console.log('   اهرم ۶۰ → لیکوئید', r.liqPrice.toFixed(0), '| استاپ 59000 |',
    r.warnings.includes('liq-before-stop') ? '✅ هشدار لیکوئید قبل از استاپ' : '❌ هشدار نداد');

  // شورت
  r = await run({...base, direction:'short', entry:3000, stop:3100});
  show('شورت', r, {stopDistPct:3.333, leverage:1.5, notional:15, actualRisk:0.5});
  console.log('   لیکوئید شورت', r.liqPrice.toFixed(0), r.liqPrice>3000 ? '✅ بالای ورود' : '❌');

  // استاپ اشتباه
  r = await run({...base, stop:61000});
  console.log('   استاپ بالای ورود در لانگ →', r.flags.join(',') || 'قبول شد',
    r.flags.includes('bad-stop') ? '✅ رد شد' : '❌ قبول شد');

  // سقف اهرم
  r = await run({...base, stop:59900, maxLeverage:10});   // sd=0.001667 → lfr=30
  show('سقف اهرم', r, {leverage:10, capped:true});
  console.log('   ریسک واقعی', r.actualRiskPct.toFixed(2)+'%', 'به‌جای ۵٪ |',
    r.warnings.includes('lev-capped') ? '✅ هشدار سقف' : '❌');
  await b.close();
})();
