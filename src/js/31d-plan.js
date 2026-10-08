/* ==================== نقشه‌ی معامله‌ی کوتاه‌مدت (برای رادار) ====================
   «پیشنهاد برنامه» (قاعده‌های شکست کف/سقف و تقاطع میانگین) برداشته شد؛ رادار همین کار را با مدل
   سنجیده انجام می‌دهد. فقط نقشه ماند: ورود = بسته شدن کندل، استاپ = 1.5 برابر ATR یک‌ساعته
   (بین 0.6٪ و سقف ایزوله)، هدف = تارگت اول تنظیمات (به R)، حداکثر 24 ساعت. */
const AS_HOLD=24;
function asAtr(C,i){let s=0,n=0;for(let j=Math.max(1,i-13);j<=i;j++){const k=C[j],pc=C[j-1].c;s+=Math.max(k.h-k.l,Math.abs(k.h-pc),Math.abs(k.l-pc));n++;}return n?s/n:null;}
function asPlan(C,i,dir,E){
  E=E||C[i].c;const atr=asAtr(C,i);if(!atr||!(E>0))return null;
  const sd=Math.min(Math.max(1.5*atr/E,0.006),isoMaxSd()/100), sign=dir==='long'?1:-1, rr=+(S.rMul&&S.rMul[0])||1.5;
  return {dir,E,SL:+(E*(1-sign*sd)).toPrecision(8),TP:+(E*(1+sign*sd*rr)).toPrecision(8),sd,rr};
}
/* سیگنال برای فرم ورود و خروجی صرافی */
function asSig(x){return {isSignal:true,ticker:x.tk,direction:x.dir,dirSet:true,entry:x.pl.E,stop:x.pl.SL,targets:[x.pl.TP],
  market:'futures',marketGuess:false,leverage:null,trigger:null,tier2:null,hasNum:true};}
