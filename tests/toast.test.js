const {chromium} = require('./lib').pw;
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 412, 820]) {
    const p = await b.newPage({viewport:{width:w,height:760}});
    await p.route('**', r => r.request().url().includes('localhost:8899') ? r.continue() : r.abort());
    await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
    await p.waitForTimeout(3000);
    for (const [msg,label] of [['کوتاه','کوتاه'],['این یک پیام نسبتاً بلند برای تست وسط‌چین بودن است','بلند']]) {
      await p.evaluate(m => toast(m, 'ok'), msg);
      await p.waitForTimeout(500);
      const r = await p.evaluate(() => {
        const t = document.querySelector('.toast');
        const b = t.getBoundingClientRect();
        return {left: b.left, right: b.right, w: b.width, vw: innerWidth};
      });
      const centre = r.left + r.w/2, off = Math.abs(centre - r.vw/2);
      const clipped = r.left < 0 || r.right > r.vw;
      console.log(`عرض ${String(w).padEnd(4)} · ${label.padEnd(5)} → مرکز انحراف ${off.toFixed(1)}px`,
        `| بریده: ${clipped ? 'بله ❌' : 'خیر ✅'}`, off < 1.5 ? '| وسط ✅' : '| کج ❌');
      await p.waitForTimeout(2600);
    }
    if (w === 412) { await p.evaluate(() => toast('این یک پیام نسبتاً بلند برای تست وسط‌چین بودن است','ok'));
      await p.waitForTimeout(500); await p.screenshot({path:require('./lib').out('toast.png')}); }
    await p.close();
  }
  await b.close();
})();
