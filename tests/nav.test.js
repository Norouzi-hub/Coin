const {chromium} = require('./lib').pw;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:412,height:900}});
  await p.route('**', r => r.request().url().includes('localhost:8899') ? r.continue() : r.abort());
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3500);
  const nav = await p.$('#tabs');
  await nav.screenshot({path:require('./lib').out('nav.png')});
  const w = await p.evaluate(() => [...document.querySelectorAll('.tab')]
    .map(t => Math.round(t.getBoundingClientRect().width)));
  console.log('عرض تب‌ها:', w, '| مجموع:', w.reduce((a,c)=>a+c,0), 'از 412');
  console.log('سرریز افقی؟', await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth) ? 'بله ❌' : 'خیر ✅');
  await b.close();
})();
