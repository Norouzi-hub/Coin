const {chromium} = require('./lib').pw;
const page_ = (nums, prefix) => `<html><body>${
  nums.map(n => `<div class="tgme_widget_message" data-post="${prefix}${n}">
    <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">POST-${n}</div>
    <time datetime="2026-09-${String(10+(n%20)).padStart(2,'0')}T10:00:00+00:00"></time></div></div>`).join('')}</body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await p.route('**', r => {
    const u = r.request().url();
    if (u.includes('localhost:8899')) return r.continue();
    if (u.includes('t.me/s/')) return r.fulfill({status:200,
      headers:{'content-type':'text/html','access-control-allow-origin':'*'},
      body: page_([203,204], 'c/1893051/')});
    return r.abort();
  });
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});

  // کشِ خراب که نسخه‌ی قبلی ساخته: num = شناسه‌ی کانال برای همه
  await p.evaluate(() => {
    const posts = [200,201,202].map(n => ({
      id:'c/1893051/'+n, num:1893051, text:'POST-'+n, img:null, reply:null,
      date: Date.parse('2026-09-'+String(10+(n%20)).padStart(2,'0')+'T10:00:00Z'),
      link:'https://t.me/c/1893051/'+n }));
    localStorage.setItem('signaldesk.cache.v2:ccoineres', JSON.stringify({v:2,at:Date.now(),end:false,posts}));
  });
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForTimeout(6000);
  await p.evaluate(() => { sigFilter='all'; bucket='arch'; renderSignals(); });   // «POST-n» یادداشت است و خودش آرشیو می‌شود

  const order = await p.$$eval('#list .card', e => e.map(x => (x.textContent.match(/POST-\d+/)||['?'])[0]));
  const nums = order.map(s => +s.replace('POST-',''));
  const ok = nums.length===5 && nums.every((v,i)=> i===0 || nums[i-1] >= v);
  console.log('کشِ خراب + پست تازه →', order.join(' '), ok ? '✅' : '❌');
  await b.close();
})();
