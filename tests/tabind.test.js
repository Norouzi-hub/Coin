const {chromium} = require('./lib').pw;
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 412, 820]) {
    const p = await b.newPage({viewport:{width:w,height:820}});
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.route('**', r => r.request().url().includes('localhost:8899') ? r.continue() : r.abort());
    await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
    await p.waitForTimeout(3000);
    let worst = 0, rows = [];
    for (const v of ['signals','positions','audit','scalp','report','more']) {
      await p.click(`.tab[data-v="${v}"]`);
      await p.waitForTimeout(700);                 // انیمیشن و اسکرول تمام شود
      const m = await p.evaluate(() => {
        const t = document.querySelector('.tab[aria-selected="true"]');
        const i = document.querySelector('#tabInd');
        const tr = t.getBoundingClientRect(), ir = i.getBoundingClientRect();
        return {d: Math.abs((tr.left+tr.right)/2 - (ir.left+ir.right)/2),
                wd: Math.abs(tr.width - ir.width), name: t.textContent.replace(/\d/g,'').trim()};
      });
      worst = Math.max(worst, m.d);
      rows.push(`${m.name}:${m.d.toFixed(1)}`);
    }
    console.log(`عرض ${String(w).padEnd(4)} → بیشترین انحراف مرکز ${worst.toFixed(1)}px`,
      worst < 1.5 ? '✅ روی تب' : '❌ کج', '|', rows.join(' '));
    await p.close();
  }
  await b.close();
})();
