const {chromium} = require('./lib').pw;
const CASES = [
  ['ساده',        '#بیت_کوین لانگ\nورود ۶۰۰۰۰\nحد ضرر ۵۹۰۰۰\nتارگت ۶۲۰۰۰', {entry:60000,stop:59000}],
  ['اهرم دار',    '#اتریوم شورت\nورود ۳۰۰۰\nاستاپ ۳۱۰۰\nاهرم ۵', {entry:3000,stop:3100,leverage:5}],
  ['کاما',        '#بیت_کوین لانگ\nورود 60,000\nحد ضرر 59,000', {entry:60000,stop:59000}],
  ['اعشار',       '#سولانا لانگ\nورود ۱۴۵.۵\nحد ضرر ۱۴۰.۲۵', {entry:145.5,stop:140.25}],
  ['بازه ورود',   '#بیت_کوین لانگ\nورود ۵۹۵۰۰ تا ۶۰۵۰۰\nحد ضرر ۵۸۰۰۰', {entry:59500,stop:58000}],
  ['بالای',       '#بیت_کوین لانگ\nبالای ۶۱۰۰۰ ورود\nحد ضرر ۵۹۵۰۰', {stop:59500}],
  ['چند تارگت',   '#اتریوم لانگ\nورود ۳۰۰۰\nاستاپ ۲۹۰۰\nتارگت ۳۱۰۰\nتارگت ۳۲۰۰\nتارگت ۳۳۰۰', {entry:3000,stop:2900}],
  ['پله دوم',     '#بیت_کوین لانگ\nورود ۶۰۰۰۰\nپله دوم ۵۸۰۰۰\nحد ضرر ۵۶۰۰۰', {entry:60000,stop:56000,tier2:58000}],
  ['k مخفف',      '#بیت_کوین لانگ\nورود 60k\nحد ضرر 59k', {entry:60000,stop:59000}],
  ['بدون فاصله',  '#اتریوم لانگ\nورود:۳۰۰۰\nحدضرر:۲۹۰۰', {entry:3000,stop:2900}],
  ['SL/TP لاتین', '#BTC long\nEntry 60000\nSL 59000\nTP 62000', {entry:60000,stop:59000}],
  ['استاپ اول',   '#بیت_کوین لانگ\nحد ضرر ۵۹۰۰۰\nورود ۶۰۰۰۰', {entry:60000,stop:59000}],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await p.route('**', r => r.request().url().includes('localhost:8899') ? r.continue() : r.abort());
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  const got = await p.evaluate(cs => cs.map(([name,t]) => {
    const r = parseSignal(t, null);
    return {name, ticker:r.ticker, entry:r.entry, stop:r.stop, tier2:r.tier2,
            targets:r.targets, lev:r.leverage, dir:r.direction, isSig:r.isSignal};
  }), CASES.map(c => [c[0], c[1]]));

  let bad = 0;
  got.forEach((g, i) => {
    const want = CASES[i][2];
    const errs = [];
    for (const k of Object.keys(want)) {
      const a = k === 'leverage' ? g.lev : g[k];
      if (a !== want[k]) errs.push(`${k}: ${a} ≠ ${want[k]}`);
    }
    if (!g.isSig) errs.push('سیگنال تشخیص داده نشد');
    if (errs.length) bad++;
    console.log((errs.length ? '❌' : '✅'), CASES[i][0].padEnd(12),
      `نماد=${String(g.ticker).padEnd(5)} ورود=${String(g.entry).padEnd(8)} استاپ=${String(g.stop).padEnd(8)}`,
      `تارگت=[${g.targets}]`, errs.length ? '→ ' + errs.join(' · ') : '');
  });
  console.log('\nخطادار:', bad, 'از', CASES.length);
  await b.close();
})();
