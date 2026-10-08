/* ==================== آیکن‌ها ==================== */
const ICO={
  refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  sliders:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  wallet:'<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M16 15h2"/><path d="M6 6l9-3 1 3"/>',
  bars:'<path d="M5 20V12M12 20V5M19 20v-8"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7"/>',
  alert:'<path d="M12 8v5M12 16.4v.2"/><circle cx="12" cy="12" r="9"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.2"/>',
  down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  // کلاه فارغ‌التحصیلی: در 20 پیکسل از کتاب خواناتر است (کتاب مثل دو میله دیده می‌شد)
  book:'<path d="M2 9.5 12 5l10 4.5-10 4.5z"/><path d="M6.5 11.8V16c0 1.6 2.6 2.9 5.5 2.9s5.5-1.3 5.5-2.9v-4.2"/>',
  star:'<path d="M12 3.5 14.6 9l6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 20l1.1-6L3.4 9.8l6-.8z"/>',
  box:'<path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M2 4h20v4H2zM10 12h4"/>',
  coin:'<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.3c-.5-.8-1.4-1.3-2.5-1.3-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2 2.6.8 2.6 2-1.1 2-2.6 2c-1.1 0-2-.5-2.5-1.3M12 6.5V8M12 16v1.5"/>',
  db:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  wifi:'<path d="M2.5 9a14 14 0 0 1 19 0M5.8 12.5a9.5 9.5 0 0 1 12.4 0M9 16a5 5 0 0 1 6 0"/><path d="M12 19.4v.2"/>',
  scissors:'<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5 20 18M8 16.5 20 6"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12h7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  door:'<path d="M14 3H6v18h8"/><path d="M11 12h9M17 8l4 4-4 4"/>',
  bolt:'<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  flag:'<path d="M5 21V4M5 5h11l-1.6 3.5L16 12H5"/>',
  tag:'<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.7 6.7a1.4 1.4 0 0 1-2 0z"/><circle cx="8" cy="8" r="1.6"/>',
  share:'<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  undo:'<path d="M4 9h11a5 5 0 0 1 0 10h-6"/><path d="M8 5 4 9l4 4"/>',
  back:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  play:'<path d="M8 5v14l11-7z"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
};
const ic=(n,c)=>'<svg class="ic'+(c?' '+c:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(ICO[n]||'')+'</svg>';
// شمسه هشت‌پر: هم نشان برنامه است، هم وقتی کاری در جریان است می‌چرخد
const STAR='<svg class="star" viewBox="-12 -12 24 24" aria-hidden="true">'+
  '<path d="M0-11 3.2-7.8 7.8-7.8 7.8-3.2 11 0 7.8 3.2 7.8 7.8 3.2 7.8 0 11-3.2 7.8-7.8 7.8-7.8 3.2-11 0-7.8-3.2-7.8-7.8-3.2-7.8Z"/>'+
  '<path d="M0-5.6 4-4 5.6 0 4 4 0 5.6-4 4-5.6 0-4-4Z" opacity=".75"/><circle r="1.6"/></svg>';

