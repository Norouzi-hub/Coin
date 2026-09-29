// داده‌ی نمونه‌ی واقع‌گرایانه برای خزنده
const fs=require('fs');
const H=3600000, NOW=Date.now();
const PATH={BTC:[[-400,60000],[-120,60000],[-100,61500],[-90,62500],[0,65000],[200,65000]],
  ETH:[[-400,3000],[-120,3000],[-110,3050],[-100,3150],[0,3100],[200,3100]],
  SOL:[[-400,160],[-50,150],[-30,160],[0,152],[200,152]],
  XRP:[[-400,2.0],[200,2.1]],GRAM:[[-400,1.4],[0,1.65],[200,1.65]]};
const px=(sym,t)=>{const p=PATH[sym]||[[0,1]];const h=(t-NOW)/H;
  if(h<=p[0][0])return p[0][1];
  for(let i=1;i<p.length;i++)if(h<=p[i][0]){const [h0,v0]=p[i-1],[h1,v1]=p[i];return v0+(v1-v0)*(h-h0)/(h1-h0);}
  return p[p.length-1][1];};
const IV={'1m':60000,'5m':300000,'1h':3600000,'60m':3600000};
const kl=(sym,iv,st,lim)=>{const ms=IV[iv],out=[];
  for(let t=st;t<NOW&&out.length<lim;t+=ms){const o=px(sym,t),c=px(sym,t+ms);out.push([t,String(o),String(Math.max(o,c)),String(Math.min(o,c)),String(c),'1',t+ms-1]);}
  return out;};
const post=(n,t,h,reply,img)=>`<div class="tgme_widget_message" data-post="ccoineres/${n}"><div class="tgme_widget_message_bubble">`+
  (reply?`<a class="tgme_widget_message_reply" href="https://t.me/ccoineres/${reply}"><div class="tgme_widget_message_text">x</div></a>`:'')+
  (img?`<a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn4.telesco.pe/file/${n}.jpg')"></a>`:'')+
  `<div class="tgme_widget_message_text">${t}</div><time datetime="${new Date(NOW-h*H).toISOString()}"></time></div></div>`;
const POSTS=[
 [920,'#بیت_کوین لانگ فیوچرز<br>ورود 64800<br>حد ضرر 63500<br>تارگت 66000<br>تارگت 67500',1,0,1],
 [919,'خبر فوری: #بیت_کوین به 65000 رسید؛ ETF ها ورودی بالایی داشتند',2],
 [918,'#اتریوم شورت<br>ورود 3120<br>حد ضرر 3200<br>تارگت 2950',5],
 [917,'ثبت نام در کمپین VIP: روی لینک عضویت کلیک کنید',8],
 [916,'تارگت اول بیت کوین زده شد ✅ سیو سود کنید',20,910],
 [915,'#سولانا لانگ اسپات<br>ورود 150<br>حد ضرر 140<br>تارگت 170',50],
 [914,'صبح بخیر دوستان، بازار امروز آرومه',60],
 [913,'#ریپل لانگ<br>ورود 2<br>حد ضرر 1.9<br>تارگت 2.3',100],
 [912,'#GRAM لانگ<br>ورود 1.413<br>حد ضرر 1.39<br>تارگت 1.6',110],
 [911,'#اتریوم شورت<br>ورود 3000<br>حد ضرر 3100<br>تارگت 2800',120],
 [910,'#بیت_کوین لانگ<br>ورود 60000<br>حد ضرر 59000<br>تارگت 62000',121],
 [909,'نکته‌ی آموزشی: مدیریت سرمایه یعنی هر معامله فقط 1٪ ریسک',130],
 [908,'#کاردانو لانگ ورود 0.5 تارگت 0.6',240],
 [907,'#بیت_کوین شورت<br>ورود 70000<br>حد ضرر 71000<br>تارگت 68000',300],
];
const channelHtml='<html><body>'+POSTS.map(x=>post(...x)).join('')+'</body></html>';
const IMG=fs.readFileSync(require('./lib').root('icons/icon-512.png'));
async function route(ctx,log){
  await ctx.route('**',r=>{const u=r.request().url();
    if(u.includes('localhost:8899'))return r.continue();
    const J=b=>r.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify(b)});
    if(u.includes('t.me/s/'))return r.fulfill({status:200,headers:{'content-type':'text/html','access-control-allow-origin':'*'},body:channelHtml});
    if(u.includes('telesco.pe'))return r.fulfill({status:200,headers:{'content-type':'image/png','access-control-allow-origin':'*'},body:IMG});
    const m=u.match(/(api\.binance\.com|fapi\.binance\.com|api\.mexc\.com).*klines\?symbol=([A-Z]+)USDT&interval=(\w+)&startTime=(\d+)&limit=(\d+)/);
    if(m){const [,,s,iv,st,lim]=m;if(!PATH[s])return r.fulfill({status:400,headers:{'access-control-allow-origin':'*'},body:'{}'});return J(kl(s,iv,+st,+lim));}
    if(u.includes('ticker/price'))return J(Object.keys(PATH).map(s=>({symbol:s+'USDT',price:String(px(s,NOW))})).concat(Array.from({length:30},(_,i)=>({symbol:'Z'+i+'USDT',price:'1'}))));
    if(log)log('blocked '+u.slice(0,90));
    return r.abort();});
}
// وضعیت ذخیره‌شده: پوزیشن باز، بسته، منتظر، آموزش، دسته
function seed(){
  const now=Date.now(),H=3600000;
  const db={positions:[
    {id:'p1',ticker:'GRAM',dir:'long',kind:'futures',entry:1.413,stop:1.39,stop0:1.39,margin:10,lev:5,baseMargin:10,openedAt:now-96*H,status:'open',targets:[1.6,1.8],partials:[],log:[],postId:'ccoineres/912'},
    {id:'p2',ticker:'ETH',dir:'short',kind:'futures',entry:3000,stop:3100,stop0:3100,margin:20,lev:10,baseMargin:20,openedAt:now-120*H,closedAt:now-100*H,exitPrice:2850,fees:0.2,status:'closed',partials:[],log:[]},
    {id:'p3',ticker:'SOL',dir:'long',kind:'spot',entry:150,stop:140,stop0:140,margin:30,lev:1,baseMargin:30,openedAt:now-50*H,status:'open',partials:[],log:[]}],
   decisions:{'ccoineres/912':{action:'taken',at:now-96*H,posId:'p1'},'ccoineres/911':{action:'taken',at:now-120*H,posId:'p2'},'ccoineres/913':{action:'skipped',at:now-99*H,reason:'قیمت رفته بود'}},
   pending:[{id:'w1',postId:'ccoineres/918',ticker:'ETH',dir:'short',trigger:3120,side:'up',market:'futures',entry:3120,stop:3200,targets:[2950],at:now-4*H,hit:null}],
   lessons:{'ccoineres/54648':{id:'ccoineres/54648',num:54648,guide:true,ord:1,title:'آموزش چارت‌خوانی؛ ورود، حد ضرر و اهداف',cat:'دستورالعمل ترید',text:'#دستورالعمل_ترید نمونه',img:'https://cdn4.telesco.pe/file/l1.jpg',date:now-86400000,link:'https://t.me/ccoineres/54648',at:now},
     'ccoineres/909':{id:'ccoineres/909',title:'مدیریت سرمایه',text:'نکته‌ی آموزشی: مدیریت سرمایه',img:null,cat:'مدیریت سرمایه',at:now}},
   cats:[{id:'c1',n:'مهم'}],pcat:{'ccoineres/919':['c1']},settings:{}};
  localStorage.setItem('signaldesk.v1',JSON.stringify(db));localStorage.removeItem('signaldesk.view.v1');
}
module.exports={route,seed,NOW};
