/* پیشنهادهای ۲۱ تا ۳۰: منحنی سرمایه با قاعده‌ی من، بدترین افت و سری، ساعت، نوع ورود، ماه‌به‌ماه،
   نمونه‌ی کم، زمان تا تارگت، CSV */
const {pw}=require('./lib');const {chromium}=pw;const {route,seed}=require('./fixture');
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+m);};
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:900},acceptDownloads:true});await route(ctx);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(seed);await p.goto('http://localhost:8899/index.html');await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{
   Object.assign(S,{acct:100,riskUsd:2});
   setXRule({k:0,t:0,h:XH.length-1});
   const N=XK.length*XT.length*XH.length, H=36e5, base=new Date(2026,8,10,9).getTime();
   const mk=(i,Rv,h,hour,month)=>{const t0=new Date(2026,month,10+i,hour).getTime();
     const R=new Array(N).fill(Rv),hh=new Array(N).fill(h);
     return {p:{id:'i'+i,img:null,link:'https://t.me/x/'+i},inp:{tk:i%2?'AAA':'BBB',dir:'long',entry:100,stop:90,tps:[110],t0,trig:i===3?100:null},
       r:{st:Rv>0?'win':'loss',tAct:t0,tTp:Rv>0?[t0+2*H]:[],tEnd:t0+h*H,xg:{v:XG_V,R,h:hh}},R:Rv};};
   const rows=[mk(0,1,3,9,8),mk(1,-1,3,10,8),mk(2,-1,3,22,9),mk(3,2,3,23,9)];
   const cc=capCurve(rows);
   const hb=groupBy(rows,x=>Math.floor(new Date(x.inp.t0).getHours()/4));
   const kd=groupBy(rows,x=>sigKindOf(x.p,x.inp));
   const n=buildInsights(rows);document.body.appendChild(n);
   const txt=n.textContent;n.remove();
   let csv=null;const keep=dl;dl=(name,text)=>{csv={name,text};};try{audCsv(rows);}finally{dl=keep;}
   return {cap:cc.cap,dd:cc.dd,worst:cc.worst,perH:+cc.perH.toFixed(3),n:cc.n,
     h8:hb.get(2)&&hb.get(2).n,h20:hb.get(5)&&hb.get(5).n,trig:kd.get('trig')&&kd.get('trig').n,full:kd.get('full')&&kd.get('full').n,
     txt:/سرمایه الان/.test(txt)&&/ماه‌به‌ماه/.test(txt)&&/مهر|شهریور/.test(txt)&&/نمونه‌ی کم/.test(txt)&&/ساعت ۸–۱۲/.test(txt)&&/تریگرها/.test(txt)&&/میانه‌ی رسیدن به تارگت ۱ کانال 2 ساعت/.test(txt),
     csv:csv&&{name:csv.name,lines:csv.text.split('\n').length,head:csv.text.split('\n')[0].replace('﻿','')}};});
 console.log('   ',JSON.stringify(r));
 ok(r.cap===102&&r.n===4,'سرمایه: ۱۰۰ + ۲×(+۱ −۱ −۱ +۲) = ۱۰۲ دلار');
 ok(r.dd===4&&r.worst===2,'بیشترین افت ۴ دلار (از ۱۰۲ به ۹۸)، بدترین سری ۲ باخت');
 ok(Math.abs(r.perH-0.167)<0.002,'سود هر ساعت: ۲ دلار در ۱۲ ساعت نگه‌داری');
 ok(r.h8===2&&r.h20===2,'به تفکیک ساعت انتشار: ۸–۱۲ و ۲۰–۲۴');
 ok(r.trig===1&&r.full===3,'به تفکیک نوع ورود: ۱ تریگر، ۳ کامل');
 ok(r.txt,'پنل: سرمایه، ماه‌به‌ماه، «نمونه‌ی کم»، ساعت، نوع، زمان تا تارگت ۱');
 ok(r.csv&&/\.csv$/.test(r.csv.name)&&r.csv.lines===5&&/R قاعده‌ی من/.test(r.csv.head),'CSV: سربرگ + ۴ ردیف، با ستون «R قاعده‌ی من»');
 await p.evaluate(()=>{AUDOPEN='سرمایه و الگوها';go('audit',true);renderAudit();});await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!!document.querySelector('#audBody [data-acc="سرمایه و الگوها"]')),'پنل «سرمایه و الگوها» در کانال‌سنج');
 ok(errs.length===0,'بدون خطا '+errs.join('|'));
 await b.close();console.log(bad?'✗ '+bad:'✔ همه درست');})();
