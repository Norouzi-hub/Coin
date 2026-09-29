const {chromium}=require('./lib').pw;
const fs=require('fs');const {route,seed}=require('./fixture.js');
const OUT=[];const note=m=>console.log(m);
const ONLY=process.argv[2];
const SCOPES0=[
 {name:'سربرگ و منو',tab:'signals',sel:'#hdr'},
 {name:'سیگنال‌ها',tab:'signals',sel:'#vSignals',reboot:true},
 {name:'پوزیشن‌ها',tab:'positions',sel:'#vPositions'},
 {name:'کانال‌سنج',tab:'audit',sel:'#vAudit'},
 {name:'کارنامه',tab:'report',sel:'#vReport'},
 {name:'آموزش',tab:'learn',sel:'#vLearn'},
 {name:'تنظیمات',tab:'signals',sel:'#setVeil',open:'settings'},
];
const SCOPES=ONLY?SCOPES0.filter(x=>x.name===ONLY):SCOPES0;
const CAND='button,[role=button],summary,a.mark,label.shopt,.fc,select';
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const p=await ctx.newPage();
 let errs=[],dialogs=[],downloads=0,files=0;
 p.on('pageerror',e=>errs.push('JS: '+e.message));
 p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR/.test(m.text()))errs.push('console: '+m.text().slice(0,160));});
 p.on('dialog',d=>{dialogs.push(d.type()+': '+d.message().slice(0,80));d.dismiss().catch(()=>{});});
 p.on('download',()=>downloads++);
 p.on('filechooser',()=>files++);
 await route(ctx);
 const boot=async()=>{
   await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
   await p.evaluate(seed);
   await p.goto('http://localhost:8899/index.html',{waitUntil:'load'});
   await p.waitForTimeout(3500);
 };
 const fresh=async(sc)=>{
   await p.evaluate(({tab,open})=>{try{closeSheet();}catch(e){}
     try{const v=document.getElementById('setVeil');if(v&&!v.classList.contains('hide'))closePanel('setVeil');}catch(e){}
     const lb=document.getElementById('lb');if(lb&&!lb.classList.contains('hide'))lb.classList.add('hide');
     go(tab,true);window.scrollTo(0,0);
     if(open==='settings')document.getElementById('btnSet').click();},sc);
   await p.waitForTimeout(open(sc)?500:250);
 };
 const open=sc=>sc.open;
 const list=(scope)=>p.evaluate(({scope,CAND})=>{
   const root=document.querySelector(scope);if(!root)return [];
   const seen={},out=[];
   for(const e of root.querySelectorAll(CAND)){
     if(!e.getClientRects().length)continue;
     const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.pointerEvents==='none')continue;
     if(e.closest('a[target=_blank]'))continue;
     const d=e.tagName.toLowerCase()+'|'+(e.className&&e.className.baseVal==null?e.className:'').replace(/\b(on|tapme|enter|busy)\b/g,'').trim()+'|'+
       (e.getAttribute('aria-label')||e.textContent||e.title||'').replace(/\s+/g,' ').trim().slice(0,34);
     seen[d]=(seen[d]||0)+1;if(seen[d]>2)continue;
     out.push({d,n:seen[d]-1});
   }
   return out;},{scope,CAND});
 const clickIn=(scope,d,n)=>p.evaluate(({scope,d,n,CAND})=>{
   const root=document.querySelector(scope);if(!root)return {miss:true};
   let k=0;
   for(const e of root.querySelectorAll(CAND)){
     if(!e.getClientRects().length)continue;
     const dd=e.tagName.toLowerCase()+'|'+(e.className&&e.className.baseVal==null?e.className:'').replace(/\b(on|tapme|enter|busy)\b/g,'').trim()+'|'+
       (e.getAttribute('aria-label')||e.textContent||e.title||'').replace(/\s+/g,' ').trim().slice(0,34);
     if(dd!==d)continue;
     if(k++<n)continue;
     const h=()=>{const s=document.body.innerHTML;let x=0;for(let i=0;i<s.length;i++)x=(x*31+s.charCodeAt(i))|0;return x+':'+s.length;};
     window.__h0=h();window.__sh0=!document.getElementById('veil').classList.contains('hide');
     window.__t0=document.querySelector('#toast.on')?.textContent||'';window.__log0=(typeof LOG!=='undefined'?LOG.length:0);
     const r=e.getBoundingClientRect();
     const t=performance.now();
     if(e.tagName==='SELECT'){const o=[...e.options].find(o=>!o.selected);if(o){e.value=o.value;e.dispatchEvent(new Event('change',{bubbles:true}));}}
     else e.click();
     return {ms:+(performance.now()-t).toFixed(0),w:Math.round(r.width),h:Math.round(r.height)};
   }
   return {miss:true};},{scope,d,n,CAND});
 const after=()=>p.evaluate(()=>{
   const s=document.body.innerHTML;let x=0;for(let i=0;i<s.length;i++)x=(x*31+s.charCodeAt(i))|0;
   const sh=!document.getElementById('veil').classList.contains('hide');
   const toast=document.querySelector('#toast.on')?.textContent||'';
   const errLog=(typeof LOG!=='undefined'?LOG.slice(window.__log0).filter(e=>e.l==='err').map(e=>e.m):[]);
   return {changed:(x+':'+s.length)!==window.__h0,sheet:sh&&!window.__sh0,sheetOpen:sh,toast:toast!==window.__t0?toast:'',errLog,
     sheetTitle:sh?(document.querySelector('#sheet h3')?.textContent||''):''};});
 const rec=async(sc,d,n,path)=>{
   errs=[];dialogs=[];downloads=0;files=0;
   let c;
   try{c=await clickIn(path?'#sheet':sc.sel,d,n);}catch(e){return {d,err:['nav/eval: '+e.message.slice(0,100)]};}
   if(c.miss)return {d,miss:true};
   await p.waitForTimeout(450);
   let a;try{a=await after();}catch(e){a={changed:true,err:'eval after'};}
   const r={scope:sc.name,path,d,n,ms:c.ms,size:c.w+'x'+c.h,...a,errs:errs.slice(),dialogs:dialogs.slice(),downloads,files};
   r.dead=!r.changed&&!r.dialogs.length&&!r.downloads&&!r.files&&!r.toast&&!r.errs.length;
   return r;
 };
 for(const sc of SCOPES){
   await boot();await fresh(sc);
   const items=await list(sc.sel);
   note('== '+sc.name+': '+items.length+' کنترل');
   for(const it of items){
     if(sc.reboot)await boot();
     await fresh(sc);
     const r=await rec(sc,it.d,it.n,null);
     OUT.push(r);
     if(r.errs&&r.errs.length)note('  ✗ '+it.d+' → '+r.errs.join(' | '));
     // داخل ورق: یک سطح پایین‌تر
     if(r.sheet){
       const sub=(await list('#sheet')).slice(0,30);
       for(const s of sub){
         if(sc.reboot)await boot();
         await fresh(sc);
         await clickIn(sc.sel,it.d,it.n);await p.waitForTimeout(500);
         const r2=await rec(sc,s.d,s.n,r.sheetTitle||it.d);
         OUT.push(r2);
         if(r2.errs&&r2.errs.length)note('  ✗ ['+(r.sheetTitle||it.d)+'] '+s.d+' → '+r2.errs.join(' | '));
       }
     }
   }
 }
 fs.writeFileSync(require('./lib').out('crawl/out')+(ONLY?'_sig':'')+'.json',JSON.stringify(OUT,null,1));
 const errsN=OUT.filter(r=>r.errs&&r.errs.length).length, dead=OUT.filter(r=>r.dead), miss=OUT.filter(r=>r.miss);
 note('\nکل کلیک‌ها: '+OUT.length+' · با خطا: '+errsN+' · بی‌اثر: '+dead.length+' · ناپیدا: '+miss.length);
 await b.close();
})();
