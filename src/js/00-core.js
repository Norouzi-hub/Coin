"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
/* تجزیه‌ی SVG با innerHTML گران‌ترین بخش ساختن کارت‌ها بود (هر کارت چند آیکون دارد).
   برای رشته‌های کوتاهِ آیکون‌دار یک نمونه‌ی تجزیه‌شده نگه می‌داریم و فقط کپی‌اش می‌کنیم. */
const ELC=new Map();
const el=(t,c,h)=>{
  let e;
  if(h!=null&&h.length<700&&h.indexOf('<svg')>=0){
    const k=t+'\u0001'+h;let tp=ELC.get(k);
    if(!tp){tp=document.createElement(t);tp.innerHTML=h;if(ELC.size<600)ELC.set(k,tp);}
    e=tp.cloneNode(true);
  }else{e=document.createElement(t);if(h!=null)e.innerHTML=h;}
  if(c)e.className=c;
  return e;
};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
// جدول‌ها در عرض کم باید داخل خودشان اسکرول شوند، نه اینکه صفحه را پهن کنند
const tWrap=t=>{const d=el('div','tscroll');d.appendChild(t);return d;};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
/* همه‌ی اعداد برنامه انگلیسی (لاتین) نمایش داده می‌شوند؛ اسمش از روزی مانده که فارسی می‌کرد.
   هر رقم فارسی/عربی که از بیرون بیاید هم لاتین می‌شود. */
const faN=n=>String(n).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));

/* داده‌های مشترک */
let POSTS=[], PRICES=new Map(), SYMBOLS=new Set(), SYMVER=0, SETVER=0;
let priceSrc='—', PX_AT=null;

