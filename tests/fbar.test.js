const {chromium} = require('./lib').pw;
const posts=[];
// ۴ سیگنال + ۳ پست عادی
const sig=(n,t)=>`<div class="tgme_widget_message" data-post="c/1893051/${n}">
 <div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text">${t}</div>
 <time datetime="${new Date(Date.now()-((n%9)+1)*36e5).toISOString()}"></time></div></div>`;
posts.push(sig(610,'#بیت_کوین لانگ بالای ۶۵۰۰۰ ورود حد ضرر ۶۳۰۰۰ تارگت ۷۰۰۰۰'));
posts.push(sig(609,'#اتریوم شورت ورود ۳۰۰۰ حد ضرر ۳۲۰۰ تارگت ۲۷۰۰'));
posts.push(sig(608,'#سولانا لانگ ورود ۱۵۰ حد ضرر ۱۴۰ تارگت ۱۸۰ اهرم ۳'));
posts.push(sig(607,'#بیت_کوین لانگ ورود ۶۴۰۰۰ حد ضرر ۶۲۰۰۰ تارگت ۶۹۰۰۰'));
posts.push(sig(606,'سلام دوستان بازار امروز آرام است'));
posts.push(sig(605,'تحلیل کلی هفته را فردا می‌گذارم'));
posts.push(sig(604,'خبر: صرافی جدید راه افتاد'));
const html=`<html><body>${posts.join('')}</body></html>`;
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+' '+m);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:412,height:1000}});
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  p.on('dialog', d => d.accept());
  await p.route('**', r => { const u=r.request().url();
    if (u.includes('localhost:8899')) return r.continue();
    if (u.includes('t.me/s/')) return r.fulfill({status:200,
      headers:{'content-type':'text/html','access-control-allow-origin':'*'}, body:html});
    return r.abort(); });
  await p.goto('http://localhost:8899/index.html', {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(4000);
  await p.evaluate(() => { PRICES=new Map([['BTC',62000],['ETH',3000],['SOL',150]]);
    SYMBOLS=new Set(PRICES.keys()); SYMVER++; renderAll(); });
  await p.waitForTimeout(500);

  const read=()=>p.evaluate(()=>{
    const segs=[...document.querySelectorAll('#fbar .fseg .fb')].map(b=>({
      label:(b.querySelector('span')||{}).textContent,
      n:(b.querySelector('i')||{}).textContent,
      on:b.classList.contains('on'), sel:b.getAttribute('aria-selected'),
      title:b.title
    }));
    const a=[...document.querySelectorAll('#fbar .fside .fb')].find(x=>x.textContent.includes('آرشیو'));
    return {segs, arch:a?{n:a.querySelector('i').textContent,on:a.classList.contains('on'),
      svg:!!a.querySelector('svg'),label:(a.querySelector('span')||{}).textContent}:null,
      cards:document.querySelectorAll('#list .card').length,
      filter:sigFilter, showArch:bucket==='arch',
      tidy:(document.querySelector('.tidy')||{}).textContent||null};
  });

  console.log('=== نوار فیلتر: ساختار ===');
  let s=await read();
  console.log('  بخش‌ها:', s.segs.map(x=>x.label+'('+x.n+')').join(' | '));
  ok(s.segs.length===3,'سه بخش فیلتر دارد (الان چه کنم؟، در انتظار، همه)');
  ok(s.arch,'دکمه‌ی آرشیو جداست');
  ok(s.arch&&s.arch.svg,'آرشیو آیکون دارد');
  ok(s.arch&&/آرشیو/.test(s.arch.label||''),'آرشیو برچسب متنی دارد');
  ok(s.segs.every(x=>x.title),'هر بخش راهنما (title) دارد');
  const num=t=>Number(String(t).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const [,nNew,nAll]=s.segs.map(x=>num(x.n));
  console.log('  شمارش:', 'در انتظار='+nNew, 'همه='+nAll);
  ok(nAll===4,'۴ سیگنال در «همه»؛ سه پستِ یادداشت/خبر خودشان آرشیو شدند');
  ok(nNew===4,'هر ۴ سیگنال بی‌تصمیم است');
  ok(nNew<=nAll,'شمارش‌ها تودرتو و سازگارند');

  console.log('\n=== انتخاب فعال و فیلتر واقعی ===');
  for (const [i,k,label] of [[1,'new','در انتظار'],[2,'all','همه']]) {
    await p.evaluate(i=>document.querySelectorAll('#fbar .fseg .fb')[i].click(), i);
    await p.waitForTimeout(350);
    s=await read();
    const onIdx=s.segs.findIndex(x=>x.on);
    ok(s.filter===k&&!s.showArch,label+': sigFilter='+s.filter);
    ok(onIdx===i,label+': فقط همین بخش روشن است (idx '+onIdx+')');
    ok(s.segs.filter(x=>x.sel==='true').length===1,label+': aria-selected یکتاست');
    ok(s.cards===num(s.segs[i].n),label+': عدد بخش = تعداد کارت‌ها ('+s.cards+')');
  }

  console.log('\n=== تمایز بصری بخش فعال ===');
  const vis=await p.evaluate(()=>{
    const bs=[...document.querySelectorAll('#fbar .fseg .fb')];
    const g=b=>{const c=getComputedStyle(b);return {bg:c.backgroundColor+' '+c.backgroundImage,fg:c.color,fw:c.fontWeight};};
    return {on:g(bs.find(b=>b.classList.contains('on'))), off:g(bs.find(b=>!b.classList.contains('on')))};
  });
  console.log('  فعال:',JSON.stringify(vis.on));
  console.log('  خاموش:',JSON.stringify(vis.off));
  ok(vis.on.bg!==vis.off.bg,'پس‌زمینه‌ی فعال فرق دارد');
  ok(vis.on.fg!==vis.off.fg,'رنگ متن فعال فرق دارد');

  console.log('\n=== تصمیم و شمارنده‌ی «در انتظار» ===');
  await p.evaluate(()=>{const p0=POSTS.find(x=>sigOf(x).isSignal);
    DB.decisions[p0.id]={skip:true,at:Date.now()};save();renderAll();});
  await p.waitForTimeout(400);
  s=await read();
  ok(num(s.segs[1].n)===3,'«در انتظار» به ۳ رسید، شد '+num(s.segs[1].n));
  ok(num(s.segs[2].n)===4,'«همه» هنوز ۴ است');
  ok(!!s.tidy,'دکمه‌ی کنارگذاشتن ظاهر شد: '+(s.tidy||'—'));

  console.log('\n=== آرشیو ===');
  await p.evaluate(()=>[...document.querySelectorAll('#fbar .fside .fb')].find(x=>x.textContent.includes('آرشیو')).click()); await p.waitForTimeout(400);
  s=await read();
  ok(s.showArch===true,'سطل آرشیو باز شد');
  ok(s.arch.on,'دکمه‌ی آرشیو روشن است');
  ok(s.segs.every(x=>!x.on),'هیچ بخشی روشن نیست وقتی در آرشیوی');
  ok(!s.tidy,'در آرشیو دکمه‌ی کنارگذاشتن نیست');
  const bulk=await p.evaluate(()=>{bucket='live';renderSignals();
    const t=document.querySelector('.tidy'); if(t){t.click();return true;} return false;});
  await p.waitForTimeout(600);
  s=await read();
  console.log('  بعد از کنارگذاشتن:', s.segs.map(x=>x.label+'('+x.n+')').join(' | '),
              'آرشیو='+s.arch.n);
  ok(num(s.arch.n)===4,'شمارنده‌ی آرشیو ۴ شد (۳ خودکار + ۱ کنارگذاشته)');
  ok(num(s.segs[2].n)===3,'«همه» به ۳ افت کرد');
  ok(!s.tidy,'دکمه‌ی کنارگذاشتن رفت');

  console.log('\n=== چیدمان روی موبایل ===');
  const box=await p.evaluate(()=>{
    const r=document.querySelector('#fbar').getBoundingClientRect();
    const bs=[...document.querySelectorAll('#fbar .fb:not(.fday)')].map(b=>b.getBoundingClientRect());
    return {w:Math.round(r.width), top:bs.map(b=>Math.round(b.top)),
      h:bs.map(b=>Math.round(b.height)), over:r.right>innerWidth+1||r.left<-1};
  });
  console.log('  عرض نوار:',box.w,'ارتفاع دکمه‌ها:',box.h.join(','));
  ok(!box.over,'از عرض صفحه بیرون نمی‌زند');
  ok(new Set(box.top.map(t=>Math.round(t/10))).size===2,'دو ردیف: فیلترها بالا، سطل‌ها پایین');
  ok(Math.min(...box.h)>=40,'ارتفاع لمسی کافی است');

  await b.close();
})();
