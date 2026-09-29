/* ==================== کمکی نمایش ==================== */
const NF2=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
function fmtPrice(n){
  if(n==null||!isFinite(n))return '—';
  const a=Math.abs(n);
  if(a>=1000)return NF2.format(n);
  if(a>=1)return (+n.toFixed(4)).toString();
  if(a>=0.01)return (+n.toFixed(5)).toString();
  return n.toPrecision(4);
}
/* جداکننده‌ی هزارگان: تا وقتی مبلغ‌ها کوچک بودند فرقی نداشت، ولی ارزش اسپات و حجم
   بازار چندرقمی‌اند و بدون آن خواندنشان سخت است. */
const NFU=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtUsd=n=>(n==null||!isFinite(n))?'—':(n<0?'−$':'$')+NFU.format(Math.abs(n));
const fmtPct=n=>(n==null||!isFinite(n))?'—':(n>0?'+':n<0?'−':'')+Math.abs(n).toFixed(2)+'٪';
const fmtR=n=>(n==null||!isFinite(n))?'—':(n>0?'+':'−')+Math.abs(n).toFixed(2)+'R';
const cls=n=>n==null||!isFinite(n)?'m':(n>0.0001?'u':n<-0.0001?'d':'m');
function relTime(d){
  if(!d)return '';
  const s=(Date.now()-d.getTime())/1000;
  if(s<90)return 'همین الان';
  if(s<3600)return faN(Math.round(s/60))+' دقیقه پیش';
  if(s<86400)return faN(Math.round(s/3600))+' ساعت پیش';
  const dd=Math.round(s/86400);
  return dd<30?faN(dd)+' روز پیش':jShort(d);
}
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const linkify=s=>s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');

