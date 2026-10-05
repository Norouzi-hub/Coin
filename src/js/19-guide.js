/* ==================== دستورالعمل ترید ==================== */
/* کانال یک پستِ فهرست دارد (#دستورالعمل_ترید) که 9 آموزشِ پایه را به‌ترتیب لینک داده و
   گفته قبل از هر معامله یک‌بار کامل خوانده شوند. آن 9 پست اینجا به همان ترتیب می‌آیند،
   با عکس و ویدیوشان، و کنار هر کدام «خواندم» هست تا معلوم باشد کجای مسیر هستی.
   اگر کانال فهرست را عوض کند (آموزشی اضافه کند)، پستِ فهرست که در کانال دیده شود،
   فهرست اینجا هم با آن به‌روز می‌شود. */
const GUIDE_CAT='دستورالعمل ترید';
const GUIDE_DEFAULT=[
  [54648,'آموزش چارت‌خوانی؛ ورود، حد ضرر و اهداف'],
  [54649,'آموزش تنظیم سفارش Trigger در صرافی Ourbit'],
  [54650,'محاسبه ریسک، حجم و اهرم با کمک ChatGPT'],
  [54651,'ماشین‌حساب محاسبه ریسک و اهرم'],
  [54652,'تایم‌فریم 4 ساعته و سشن‌های مهم معاملاتی'],
  [54653,'تفاوت Trigger و Confirm'],
  [54654,'اگر پوزیشن ریجکت شد، چه کار کنیم؟'],
  [54655,'نحوه ریسک‌فری و مدیریت پوزیشن'],
  [54656,'حداکثر تعداد پوزیشن‌ها، ریسک مجاز و سیو سود']];
const GUIDE_WARN='این مطالب پایه‌ی دستورالعمل معاملاتی کانال هستند. قبل از ورود به معاملات یک‌بار کامل '+
  'مطالعه‌شان کن و مخصوصاً قوانین مدیریت ریسک، تعداد پوزیشن‌ها، تریگر و ریسک‌فری را جدی بگیر.';
/* تحلیل و آموزش قدم‌به‌قدمِ هر درس، به شماره‌ی پست — از روی عکس و متن خودِ پست‌ها.
   sum: یک خط خلاصه · pic: تحلیل تصویر · plan: اعداد معامله‌ی نمونه (نردبان رسم می‌شود)
   steps: قدم‌ها · cmp: جدول مقایسه · rules: قانون‌ها · warn: هشدار · app: ربطش به همین برنامه
   widget: ابزار زنده (calc ماشین‌حساب، clock ساعت کندل و سشن، rules وضعیت من با قانون کانال).
   اعداد داخل <i> چپ‌به‌راست و پررنگ نمایش داده می‌شوند. */
const GUIDE_NOTES={
 54648:{
  sum:'یک معامله‌ی کامل روی چارت روزانه‌ی ICP: از تشخیص روند تا ورود، حد ضرر و سه هدف.',
  pic:['چارت روزانه‌ی <i>ICP/USDT</i> در بایننس. قیمت ماه‌ها زیر یک <b>خط روند نزولی</b> (خط بنفش که سقف‌ها را به هم وصل کرده) پایین آمده و کف ساخته.',
       'نزدیک <i>2.7–2.8</i> خط روند شکسته شده (فلش آبی «شکست خط روند نزولی») و قیمت بالای آن تثبیت شده. همان ناحیه‌ای که قبلاً مقاومت بود حالا نقش حمایت را دارد.',
       'جعبه‌ی سبز ناحیه‌ی سود و جعبه‌ی قرمز ناحیه‌ی ضرر است. خط‌چین سبز مسیر احتمالی قیمت تا سه هدف را نشان می‌دهد.'],
  plan:{pair:'ICP/USDT',side:'long',entry:[2.7,2.8],sl:1.998,tps:[3.959,5.968,9.25],tf:'روزانه (1D)'},
  steps:[['روند را بشناس','اول ببین قیمت در چه روندی است. اینجا روند نزولی بود و خط روند سقف‌های پایین‌آمده را به هم وصل می‌کند.'],
         ['منتظر شکست بمان','تا خط روند نشکسته، خرید یعنی جنگیدن با روند. شکست و تثبیت بالای <i>2.7</i> اولین نشانه‌ی تغییر روند است.'],
         ['ناحیه‌ی ورود','بهترین ورود بعد از شکست، روی <b>پولبک</b> به حمایتِ تازه است: <i>2.7–2.8</i>. اگر در همین ناحیه یک کندل تأییدی دیدی، وارد شو.'],
         ['حد ضرر','زیر آخرین کف معتبر: <i>1.998</i>. اگر قیمت به زیر آن برگردد، سناریوی صعودی باطل است و نباید در معامله بمانی.'],
         ['اهداف','سه هدف روی مقاومت‌های قبلی: <i>3.959</i>، <i>5.968</i> و <i>9.250</i>. در هر هدف بخشی از سود را سیو کن (درس 9).'],
         ['حجم را از روی استاپ حساب کن','فاصله‌ی ورود تا استاپ حدود <i>27%</i> است، یعنی خیلی زیاد. با قانون ریسک 1٪، روی حساب 1000 دلاری حجم کل پوزیشن فقط حدود <i>37$</i> می‌شود. استاپ دورتر یعنی حجم کمتر (درس 3 و 4).']],
  rules:['ترتیب ثابت است: اول روند، بعد شکست، بعد پولبک، بعد ورود.',
         'حد ضرر جایی است که «ایده غلط از آب درآمده»، نه عددی که دلت می‌خواهد.',
         'هدف اول حدود <i>1.6R</i>، دوم حدود <i>4.3R</i> و سوم حدود <i>8.6R</i> است؛ حتی رسیدن به هدف اول هم معامله را منطقی می‌کند.'],
  warn:['با استاپ 27٪ در مارجین ایزوله، اهرم بیشتر از حدود <i>3X</i> یعنی لیکوئید شدن قبل از رسیدن به حد ضرر.',
        'این مثال آموزشی است، نه سیگنال.'],
  app:'در تب سیگنال‌ها «بررسی و ورود» همین فاصله‌ی استاپ، R هر تارگت و قیمت لیکوئید را خودش حساب می‌کند.'},
 54649:{
  sum:'ثبت سفارش تریگر در Ourbit: وقتی قیمت به ورود رسید، سفارش خودش فعال می‌شود و لازم نیست پای چارت بنشینی.',
  pic:['سمت چپ، فرم سفارش فیوچرز Ourbit روی <i>ADA/USDT</i> است (حالت Cross و اهرم <i>35X</i>). فلش‌های شماره‌دار هر کدام به یک فیلد اشاره می‌کنند.',
       'جدول راست اعداد همین معامله‌ی نمونه است: ورود (تریگر) <i>0.188</i>، حد ضرر <i>0.175</i>، هدف‌ها <i>0.205</i> و <i>0.220</i>، جهت لانگ.',
       'حجم وارد شده <i>4500 ADA</i> است که با قیمت <i>0.188</i> حدود <i>846$</i> ارزش دارد.'],
  plan:{pair:'ADA/USDT',side:'long',entry:0.188,sl:0.175,tps:[0.205,0.22]},
  steps:[['نوع سفارش: Trigger','در فرم سفارش، به‌جای Limit یا Market گزینه‌ی <b>Trigger</b> را انتخاب کن.'],
         ['معیار فعال شدن: Last Price','Last Price یعنی سفارش با «آخرین قیمت معامله‌شده»ی بازار فعال می‌شود.'],
         ['قیمت تریگر','عددی که با رسیدن قیمت به آن سفارش فعال شود: <i>0.188</i>.'],
         ['قیمت سفارش (Limit Price)','قیمتی که سفارش بعد از فعال شدن با آن ثبت می‌شود، معمولاً همان <i>0.188</i>. اگر بازار تند حرکت می‌کند، در لانگ کمی بالاتر بگذار تا جا نمانی.'],
         ['حجم','مقدار را وارد کن (اینجا <i>4500 ADA</i>). حجم را از روی ریسک و فاصله‌ی استاپ حساب کن، نه از روی حس (درس 3).'],
         ['TP/SL را همان‌جا بگذار','تیک TP/SL را بزن: حد ضرر <i>0.175</i> و هدف <i>0.205</i>. سفارش بدون حد ضرر نفرست.'],
         ['Open Long یا Open Short','برای خرید (لانگ) <b>Open Long</b> سبز و برای فروش (شورت) <b>Open Short</b> قرمز را بزن.']],
  rules:['Trigger فقط «شرطِ فعال شدن» است. اگر Limit گذاشتی و قیمت تند رد شد، ممکن است سفارش پر نشود.',
         'اهرم و حجم را بر اساس مدیریت ریسک و فاصله تا حد ضرر انتخاب کن. تنظیمات تصویر فقط نمونه است.',
         'در این معامله فاصله‌ی استاپ حدود <i>6.9%</i> است؛ هدف اول حدود <i>1.3R</i> و هدف دوم حدود <i>2.5R</i>.'],
  warn:['با <i>4500 ADA</i>، خوردن استاپ حدود <i>58$</i> ضرر دارد. این برای ریسک 1٪ یعنی حساب حدود <i>5,800$</i>. با حساب کوچک‌تر حجم را به همان نسبت کم کن.',
        'اهرم <i>35X</i> در حالت <b>ایزوله</b> یعنی لیکوئید حدود <i>2.4%</i> زیر ورود، یعنی قبل از استاپ <i>6.9%</i>. در ایزوله اهرم را حداکثر حدود <i>13X</i> بگذار. تصویر در حالت Cross است که کل موجودی حساب پشت پوزیشن می‌ایستد.'],
  app:'دکمه‌ی «منتظر …» روی کارت سیگنال همین منطق تریگر را در برنامه نگه می‌دارد و وقتی قیمت رسید خبر می‌دهد.'},
 54650:{
  sum:'حساب کردن حجم، مارجین و تعداد واحد با قانون ریسک 1٪، هم با یک پرامپت آماده برای ChatGPT و هم به‌صورت دستی.',
  pic:['چارت روزانه‌ی <i>RENDER/USDT</i> با برنامه‌ی نمونه: ورود <i>1.455</i>، حد ضرر <i>1.250</i> و سه هدف <i>2.124</i>، <i>2.947</i> و <i>4.501</i>. معامله لانگ با اهرم <i>20X</i> و ریسک 1٪ روی سرمایه‌ی <i>1000$</i> است.',
       'پنج جعبه‌ی شماره‌دار پایین تصویر همان پنج قدم محاسبه‌اند. جعبه‌ی سبز پرامپت ChatGPT و جعبه‌ی قرمز نکته‌های مهم است.'],
  plan:{pair:'RENDER/USDT',side:'long',entry:1.455,sl:1.25,tps:[2.124,2.947,4.501],tf:'روزانه (1D)'},
  steps:[['ریسک دلاری','<i>1% × 1000 = 10$</i>. یعنی اگر استاپ بخورد، حداکثر 10 دلار از دست می‌دهی.'],
         ['فاصله‌ی ورود تا استاپ','<i>1.455 − 1.250 = 0.205</i> و به درصد: <i>0.205 ÷ 1.455 = 14.09%</i>.'],
         ['حجم پوزیشن (Position Size)','<i>10 ÷ 0.1409 ≈ 71$</i>. ارزش کل پوزیشن باید حدود 71 دلار باشد.'],
         ['مارجین با اهرم 20X','<i>71 ÷ 20 = 3.55$</i>. اهرم فقط مارجین را کم می‌کند؛ ریسک همان 10 دلار می‌ماند.'],
         ['تعداد واحد (Quantity)','<i>71 ÷ 1.455 ≈ 48.8</i> RENDER. همین عدد را در صرافی وارد می‌کنی.'],
         ['پرامپت ChatGPT','چارت را بفرست و بنویس: «سرمایه‌ی من 1000 دلار است. می‌خواهم در این معامله حداکثر 1٪ سرمایه را ریسک کنم. نقطه‌ی ورود و حد ضرر را از روی چارت پیوست‌شده بخوان. اهرم انتخابی من 20X است. حجم پوزیشن، مارجین موردنیاز و تعداد واحد ارز را حساب کن و بگو در صورت خوردن استاپ تقریباً چند دلار ضرر می‌کنم.» سرمایه، درصد ریسک و اهرم را با حساب خودت عوض کن.']],
  rules:['فرمول اصلی: <b>حجم پوزیشن = ریسک دلاری ÷ درصد فاصله‌ی استاپ</b>. اهرم در این فرمول نیست.',
         'اگر ChatGPT عدد ورود یا استاپ را اشتباه از تصویر خواند، اعداد را دستی بده و جوابش را با همین پنج قدم چک کن.',
         'کارمزد، اسلیپیج و فاندینگ در این حساب نیست؛ حجم را 5 تا 10٪ کمتر بگیر.',
         'حد ضرر را حتماً در خود صرافی ثبت کن.'],
  warn:['در مارجین <b>ایزوله</b> با اهرم <i>20X</i>، لیکوئید حدود <i>4.5%</i> زیر ورود (حدود <i>1.39</i>) است و قبل از استاپ <i>1.250</i> می‌رسد. برای استاپ 14٪ در ایزوله اهرم را حداکثر حدود <i>6X</i> بگذار (مارجین حدود <i>12$</i>)، یا در حالت Cross کار کن.'],
  app:'ماشین‌حساب درس 4 همین پنج قدم را با اعداد خودت انجام می‌دهد و اهرم امن را هم می‌گوید.'},
 54651:{
  sum:'ماشین‌حساب ریسک و اهرم؛ یک نسخه‌ی زنده‌اش همین‌جاست.',
  pic:['اسکرین‌شات این پست به دستم نرسید. به‌جایش ماشین‌حساب را همین‌جا ساختم تا با همان روش کانال (ریسک از کل سرمایه) حساب کنی. اعداد پیش‌فرض همان مثال RENDER درس 3 است.'],
  widget:'calc',
  steps:[['سرمایه و درصد ریسک','کل موجودی حساب و درصدی که حاضری در این معامله از دست بدهی. قانون کانال: <i>1%</i>.'],
         ['ورود و حد ضرر','از پست سیگنال یا چارت. جهت معامله (لانگ یا شورت) از روی همین دو عدد معلوم می‌شود.'],
         ['اهرم','فقط مارجین را تعیین می‌کند. ماشین‌حساب می‌گوید با این اهرم، در حالت ایزوله، لیکوئید قبل از استاپ می‌رسد یا نه.'],
         ['اعداد را در صرافی بزن','تعداد واحد (Quantity) و اهرم را در فرم سفارش وارد کن و حد ضرر را همان‌جا ثبت کن.']],
  rules:['اگر «اهرم امن» کمتر از اهرم انتخابی‌ات شد، یا اهرم را کم کن یا مارجین Cross بگیر.']},
 54652:{
  sum:'کندل 4 ساعته کی بسته می‌شود و کدام ساعت‌ها بازار شلوغ‌تر است؛ همه به وقت تهران.',
  pic:['شش ساعت بالای تصویر، زمان بسته شدن کندل‌های <i>4H</i> به وقت تهران است: <i>3:30</i> بامداد، <i>7:30</i> و <i>11:30</i> صبح، <i>15:30</i> بعدازظهر، <i>19:30</i> عصر و <i>23:30</i> شب.',
       'نوار پایین دو سشن مهم را نشان می‌دهد: بورس شانگهای چین <i>5:00–12:00</i> و بورس نیویورک <i>17:00–24:00</i> به وقت تهران.'],
  widget:'clock',
  steps:[['سطح را مشخص کن','حمایت یا مقاومتی که منتظر شکستش هستی.'],
         ['عبور لحظه‌ای کافی نیست','قیمت ممکن است سایه بزند و برگردد. منتظر <b>بسته شدن</b> کندل 4 ساعته بمان.'],
         ['کلوز پشت سطح یعنی تأیید','اگر کندل 4H بالای مقاومت (در لانگ) یا زیر حمایت (در شورت) بسته شد، شکست تأیید شده. این همان Confirm درس 6 است.'],
         ['ساعت را بدان','کندل‌ها در همین شش ساعت بسته می‌شوند. ابزار بالا کلوز بعدی و وضعیت سشن‌ها را زنده نشان می‌دهد.']],
  rules:['سشن نیویورک بیشترین حجم و نوسان را دارد؛ شکست‌های مهم و فیک‌های تند بیشتر در این ساعت‌ها رخ می‌دهد.',
         'سشن چین روی بازارهای آسیایی و حس ریسک بازار اثر می‌گذارد.'],
  warn:['با تغییر ساعت آمریکا (تقریباً از اواسط آبان تا اواخر اسفند) سشن نیویورک حدود یک ساعت دیرتر می‌شود. ساعت کندل‌های 4H ثابت می‌ماند چون ایران تغییر ساعت ندارد. در تعطیلات رسمی هم ساعت‌ها ممکن است فرق کند.']},
 54653:{
  sum:'دو روش ورود در شکست مقاومت: زود و با قیمت بهتر (Trigger)، یا دیرتر و مطمئن‌تر (Confirm).',
  pic:['این پست عکس جدا ندارد و در جواب آموزش سفارش تریگر Ourbit (درس 2) منتشر شده است.'],
  cmp:{h:['Trigger','Confirm'],rows:[
    ['زمان ورود','زودتر، قبل از تأیید کامل شکست','بعد از تأیید، مثلاً کلوز کندل 4H بالای مقاومت'],
    ['نقطه‌ی ورود','بهتر','دیرتر'],
    ['ریسک اصلی','ریجکت شدن قیمت','شکست فیک کمتر، ولی جا ماندن از حرکت'],
    ['اگر اشتباه شد','خروج با ضرر محدود و انتظار برای Confirm','خروج با حد ضرر']]},
  steps:[['قبل از ورود روش را انتخاب کن','اگر تریگر، باید بپذیری که گاهی ریجکت می‌شوی و این بخشی از بازی است.'],
         ['ورود تریگری','قیمت که به ناحیه رسید (مثلاً با سفارش Trigger درس 2) وارد شو.'],
         ['شکست ادامه داشت؟ بمان','اگر قیمت ریجکت نشد و شکست ادامه پیدا کرد، طبق پلن با پوزیشن بمان.'],
         ['ریجکت شد؟ ضرر کوچک','پوزیشن را با ضرر محدود ببند و منتظر Confirm بمان، مثلاً کلوز کندل 4 ساعته بالای مقاومت، و بعد دوباره وارد شو.']],
  rules:['هدف تریگر «همیشه درست بودن» نیست: اگر موفق شد ورود بهتری داری و اگر ریجکت شد با رعایت حد ضرر بیرون می‌آیی.'],
  app:'دکمه‌ی «منتظر …» روی کارت سیگنال، تریگر را در برنامه نگه می‌دارد تا قیمت برسد.'},
 54654:{
  sum:'قیمت بعد از ورود از مقاومت برگشت؟ دو راه داری، ولی باید از قبل تصمیم گرفته باشی کدام را می‌روی.',
  pic:['این پست عکس ندارد؛ متن آن اینجا به قدم‌های عملی تبدیل شده است.'],
  steps:[['ریجکت را بشناس','قیمت به مقاومت خورده و برگشته، بدون اینکه بالای آن بسته شود.'],
         ['راه اول: خروج','پوزیشن را ببند و منتظر شکست واقعی مقاومت و فرصت ورود تازه بمان.'],
         ['راه دوم: کم کردن حجم','حجم را به <i>1/2</i> یا <i>1/3</i> برسان تا ریسک پوزیشن کمتر شود.'],
         ['شکست تأیید شد؟ دوباره اضافه کن','اگر قیمت برگشت و مقاومت را شکست و در تایم‌فریم <i>1H</i> یا <i>4H</i> تأیید گرفت، طبق مدیریت ریسک دوباره حجم اضافه کن.']],
  rules:['راه دوم مخصوصاً وقتی به کار می‌آید که چند پوزیشن هم‌زمان داری و می‌خواهی در نوسان شدید ریسک کل حساب را پایین بیاوری.',
         'اگر پوزیشن‌هایت کم است و از اول ریسک هر معامله را 1٪ نگه داشته‌ای، کاهش حجم لازم نیست؛ طبق پلن اولیه تا TP یا SL صبر کن.',
         'ریجکت شدن به معنی خراب شدن پلن نیست. مهم این است که قبل از ورود بدانی در ریجکت، شکست یا تأیید دقیقاً چه می‌کنی.'],
  app:'در تب پوزیشن‌ها دکمه‌ی «بستن بخشی» همین کاهش حجم را ثبت می‌کند و کارنامه سودش را جدا حساب می‌کند.'},
 54655:{
  sum:'ریسک‌فری یعنی بعد از گرفتن بخشی از سود، کاری کنی که باقی پوزیشن دیگر نتواند ضرر بدهد. Ourbit دو راه برای بستن و مدیریت پوزیشن دارد.',
  pic:['تصویر دو روش بستن پوزیشن در Ourbit را کنار هم گذاشته. مثال روی یک لانگ <i>EIGEN/USDT</i> با اهرم <i>35X</i> (Cross) است؛ میانگین ورود <i>0.2015</i> و قیمت فعلی <i>0.2070</i>، یعنی حدود <i>2.7%</i> در سود.',
       '<b>روش 1 (سبز)، دکمه‌ی Close:</b> برای بستن سریع همه یا بخشی از پوزیشن. در مثال، <i>25%</i> حجم با سفارش Market بسته می‌شود.',
       '<b>روش 2 (آبی)، TP/SL:</b> برای گذاشتن حد سود و حد ضرر خودکار روی همه یا بخشی از حجم. در مثال <i>25%</i> یعنی <i>100</i> از <i>400</i> EIGEN.'],
  steps:[['سود اول را بگیر','قیمت که به هدف اول رسید، از <b>Close</b> بخشی از حجم (مثلاً <i>25%</i>) را با Market ببند.'],
         ['استاپ را به نقطه‌ی ورود بیاور','در <b>TP/SL</b> قیمت تریگر Stop Loss را روی میانگین ورود (<i>Avg. Price</i>، اینجا <i>0.2015</i>) بگذار. حالا باقی پوزیشن ریسک‌فری است.'],
         ['حد سود پله‌ای','در <b>TP/SL in Batches</b> برای هر هدف یک Take Profit با درصد حجم جدا بگذار تا سود خودکار سیو شود.'],
         ['تأیید و بررسی','بعد از ثبت، در بخش Position ببین TP و SL فعال شده باشند.']],
  rules:['Market سریع‌تر می‌بندد، ولی در بازار تند ممکن است کمی بدتر پر شود.',
         'قبل از گذاشتن SL فاصله‌اش را با قیمت لیکوئید چک کن؛ SL باید قبل از لیکوئید باشد.',
         'طبق درس 9، پوزیشنی که ریسک‌فری شد جای یک پوزیشن تازه را آزاد می‌کند.'],
  app:'در تب پوزیشن‌ها می‌توانی دستگیره‌ی استاپ را روی نردبان تا قیمت ورود بکشی؛ کارنامه R را همچنان با ریسک اولیه حساب می‌کند.'},
 54656:{
  sum:'قانون سقف: حداکثر 3 پوزیشن هم‌زمان، و ریسک همه‌شان روی هم حداکثر 3٪ سرمایه.',
  pic:['این پست عکس ندارد. ابزار بالا وضعیت پوزیشن‌های باز خودت را همین الان با همین قانون می‌سنجد.'],
  widget:'rules',
  steps:[['قبل از هر ورود بشمار','چند پوزیشن «در ریسک» داری؟ اگر 3 تا، پوزیشن تازه نگیر.'],
         ['ریسک کل را جمع بزن','ریسک همه‌ی پوزیشن‌های فعال روی هم نباید از <i>3%</i> سرمایه بیشتر شود؛ با ریسک 1٪ برای هر معامله، یعنی همان 3 پوزیشن.'],
         ['ریسک‌فری یعنی جای خالی','به محض اینکه یک پوزیشن ریسک‌فری شد (درس 8)، می‌توانی یک پوزیشن جدید اضافه کنی.'],
         ['سیو سود پله‌ای','سیو سود را به لحظه‌ی آخر موکول نکن؛ طبق اهداف چارت، سود را پله‌پله ذخیره کن.'],
         ['آپدیت‌های کانال را دنبال کن','ممکن است کانال بگوید پوزیشنی زودتر بسته، ریسک‌فری یا مدیریت شود.']],
  rules:['اولویت همیشه حفظ سرمایه و مدیریت ریسک است، نه تعداد معاملات.'],
  app:'«موجودی حساب» در تنظیمات، بخش «اندازه و ریسک»، مبنای درصد ریسک این ابزار است.'}
};
const GUIDEKEY='signaldesk.guide.v1', GUIDELIST='signaldesk.guide.list';
const GUIDE={busy:false,tried:false,err:null,open:new Set()};
function guideList(){
  const l=lsGet(GUIDELIST);
  return Array.isArray(l)&&l.length?l:GUIDE_DEFAULT;
}
const guideRec=num=>Object.values(DB.lessons).find(L=>L.guide&&L.num===num)||null;
const guideMissing=()=>guideList().filter(([n])=>!guideRec(n));
/* فهرستِ «🔹 عنوان ↵ لینک» را از خودِ پست فهرست بیرون می‌کشد */
function parseGuideIndex(text){
  const lines=String(text||'').split('\n').map(x=>x.trim());
  const out=[];let last='';
  for(const ln of lines){
    const m=ln.match(/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/);
    if(m&&m[1].toLowerCase()===String(S.channel).toLowerCase()){
      const n=+m[2];
      if(!out.some(x=>x[0]===n))out.push([n,last.replace(/^[\s🔹🔸▪️•\-–—\d.)]+/u,'').trim()||('درس '+faN(out.length+1))]);
      last='';continue;
    }
    if(ln&&!/^https?:/.test(ln))last=ln;
  }
  return out;
}
function findGuideIndex(posts){
  let best=null;
  for(const p of posts){
    if(!/دستورالعمل[_\s]ترید/.test(faNorm(p.text||'')))continue;
    const l=parseGuideIndex(p.text);
    if(l.length>=3&&(!best||p.num>best.num))best={num:p.num,list:l};
  }
  return best;
}
function guideMigrate(){
  if(lsGet(GUIDEKEY))return;
  const old=Object.values(DB.lessons).filter(L=>!L.guide);
  if(old.length){
    // یک نسخه کنار می‌ماند؛ اگر اشتباهی بود از حافظه‌ی مرورگر برمی‌گردد
    lsSet('signaldesk.lessons.bak',{at:Date.now(),lessons:DB.lessons});
    for(const L of old)delete DB.lessons[L.id];
    save();
    logIt('info',faN(old.length)+' آموزشِ قبلی پاک شد تا دستورالعمل ترید جایش بیاید');
  }
  lsSet(GUIDEKEY,{at:Date.now(),cleared:old.length,ids:old.map(L=>L.id)});
}
/* فقط همان‌هایی که پاک شدند، با شناسه — نه «هر چه قدیمی‌تر است»، وگرنه آموزشی که روی
   دستگاه دیگر تازه اضافه شده ولی ساعتش عقب‌تر است بی‌صدا پاک می‌شد */
function guidePurgeOld(){
  const g=lsGet(GUIDEKEY);if(!g||!Array.isArray(g.ids))return;
  for(const id of g.ids){const L=DB.lessons[id];if(L&&!L.guide)delete DB.lessons[id];}
}
function guideStore(p,ord,title){
  const prev=guideRec(p.num);
  const L={id:p.id,num:p.num,guide:true,ord,title,cat:GUIDE_CAT,text:p.text||'',img:p.img||null,
    date:p.date?+p.date:null,link:p.link||('https://t.me/'+p.id),at:prev?prev.at:Date.now(),
    read:prev?prev.read||null:null};
  if(p.imgs)L.imgs=p.imgs;
  if(p.video)L.video=p.video;
  if(prev&&prev.id!==p.id)delete DB.lessons[prev.id];
  DB.lessons[p.id]=L;
}
/* پست‌ها را از خودِ کانال می‌خواند: یک صفحه (20 پست) که همه‌ی شماره‌ها را بپوشاند،
   و اگر چیزی جا ماند، صفحه‌ی قبلی. force یعنی حتی آن‌هایی که داری تازه شوند. */
async function loadGuide(force){
  if(GUIDE.busy)return;
  GUIDE.busy=true;GUIDE.tried=true;GUIDE.err=null;
  if(view==='learn')renderLessons();
  let got=0;
  try{
    const ix=findGuideIndex(POSTS);
    if(ix)lsSet(GUIDELIST,ix.list);
    let list=guideList();
    const ord=new Map(list.map(([n,t],i)=>[n,{i:i+1,t}]));
    const want=new Set((force?list:guideMissing()).map(x=>x[0]));
    if(!want.size)return;
    let before=Math.max(...want)+11;         // چند پست بعد از آخری را هم می‌گیرد تا خودِ پست فهرست بیاید
    for(let page=0;page<5&&want.size;page++){
      const res=await loadChannel(before);
      const ix2=findGuideIndex(res.posts);
      if(ix2){lsSet(GUIDELIST,ix2.list);list=ix2.list;
        for(const [n,t] of list){if(!ord.has(n)&&!guideRec(n))want.add(n);}
        ord.clear();list.forEach(([n,t],i)=>ord.set(n,{i:i+1,t}));}
      for(const p of res.posts){
        if(!want.has(p.num))continue;
        const o=ord.get(p.num);
        guideStore(p,o?o.i:99,o?o.t:lessonTitle(p.text));
        want.delete(p.num);got++;
      }
      if(!res.before||!want.size)break;
      const lo=Math.min(...res.posts.map(p=>p.num).filter(Boolean));
      if(!(lo>Math.min(...want)))break;     // آنچه مانده در این صفحه‌ها نیست
      before=res.before;
    }
    // ترتیب و عنوانِ آنچه داری را هم با فهرستِ تازه یکی می‌کنیم
    for(const [n,t] of list){const L=guideRec(n);if(L){L.ord=ord.get(n).i;L.title=t;}}
    if(want.size)GUIDE.err=faN(want.size)+' پست پیدا نشد (شاید کانال پاکشان کرده باشد).';
    save();
    if(got)logIt('ok','دستورالعمل ترید: '+faN(got)+' درس از کانال آمد');
    if(force||got)toast(got?faN(got)+' درس از کانال آمد':'چیز تازه‌ای نبود',got?'ok':'info');
  }catch(e){
    GUIDE.err='کانال جواب نداد. اتصال یا فیلترشکن را عوض کن و «دریافت از کانال» را بزن.';
  }finally{
    GUIDE.busy=false;
    renderAll();
  }
}
function guideRead(num,on){
  const L=guideRec(num);if(!L)return;
  L.read=on?Date.now():null;
  save();renderLessons();paintLearnBadge();
}
function paintLearnBadge(){
  const b=$('#cLearn');if(!b)return;
  const list=guideList();
  const n=list.filter(([num])=>{const L=guideRec(num);return L&&!L.read;}).length;
  b.textContent=faN(n);b.dataset.n=n;b.classList.toggle('z',!n);
}
function mediaOf(L){
  const w=el('div','gmedia');
  if(L.video){
    const v=el('video');v.controls=true;v.preload='none';v.playsInline=true;
    if(L.img)v.poster=L.img;v.src=L.video;
    // لینک ویدیوی تلگرام موقت است؛ اگر پخش نشد، به‌جایش لینک خودِ پست
    v.onerror=()=>{const a=el('a','mark ghost vfail','ویدیو اینجا پخش نشد — در تلگرام ببین');
      a.href=L.link;a.target='_blank';a.rel='noopener';v.replaceWith(a);};
    w.appendChild(v);
  }
  const imgs=L.video?[]:(L.imgs&&L.imgs.length?L.imgs:(L.img?[L.img]:[]));
  for(const src of imgs){
    const a=el('div','shot');a.setAttribute('role','button');a.setAttribute('aria-label','بزرگ‌نمایی تصویر');a.tabIndex=0;
    const im=el('img');im.loading='lazy';im.decoding='async';im.alt='تصویر آموزش';
    a.onclick=()=>openLightbox(im);
    a.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLightbox(im);}};
    im.onload=()=>a.classList.add('loaded');im.onerror=()=>a.remove();im.src=src;
    a.appendChild(im);w.appendChild(a);
  }
  return w;
}

/* ---- نمایش تحلیل هر درس ---- */
function gSec(icon,title){return el('div','gsec',ic(icon)+'<span>'+title+'</span>');}
/* نردبان قیمت: حد ضرر، ورود و هدف‌ها روی مقیاس لگاریتمی، با R هر هدف */
function guideLadder(pl){
  const e=Array.isArray(pl.entry)?(pl.entry[0]+pl.entry[1])/2:pl.entry;
  const sign=pl.side==='short'?-1:1, risk=Math.abs(e-pl.sl);
  const lv=[{p:pl.sl,t:'حد ضرر',c:'dn',lab:pl.sl}]
    .concat([{p:e,t:'ورود',c:'gold',lab:Array.isArray(pl.entry)?pl.entry.join('–'):pl.entry}])
    .concat(pl.tps.map((p,i)=>({p,t:'هدف '+faN(i+1),c:'up',lab:p,r:(p-e)*sign/risk})));
  const ps=lv.map(x=>x.p), lo=Math.min(...ps), hi=Math.max(...ps);
  const H=Math.max(170,lv.length*38+24), top=14, bot=H-14;
  const y=p=>top+(Math.log(hi)-Math.log(p))/(Math.log(hi)-Math.log(lo)||1)*(bot-top);
  const rows=lv.map(x=>Object.assign({},x,{y:y(x.p)})).sort((a,b)=>a.y-b.y);
  for(let i=1;i<rows.length;i++)if(rows[i].y-rows[i-1].y<26)rows[i].y=rows[i-1].y+26;
  const w=el('div','glad');w.style.height=(Math.max(H,rows[rows.length-1].y+14))+'px';
  const yE=y(e), ySl=y(pl.sl), yTop=y(sign>0?hi:lo);
  w.innerHTML='<i class="gz dn" style="top:'+Math.min(yE,ySl)+'px;height:'+Math.abs(ySl-yE)+'px"></i>'+
    '<i class="gz up" style="top:'+Math.min(yE,yTop)+'px;height:'+Math.abs(yE-yTop)+'px"></i>'+
    rows.map(x=>'<div class="glr '+x.c+'" style="top:'+(x.y-11)+'px"><b>'+x.t+
      (x.r!=null?' <em>'+x.r.toFixed(1)+'R</em>':'')+'</b><s></s><span dir="ltr">'+x.lab+'</span></div>').join('');
  return w;
}
function guideKv(pl){
  const e=Array.isArray(pl.entry)?(pl.entry[0]+pl.entry[1])/2:pl.entry;
  const sd=Math.abs(e-pl.sl)/e*100;
  const kv=el('div','briefkv gkv');
  const add=(l,v,c)=>kv.insertAdjacentHTML('beforeend','<div class="bk"><b>'+l+'</b><span class="'+(c||'')+'" dir="ltr">'+v+'</span></div>');
  add('جفت ارز',pl.pair);
  add('جهت',pl.side==='short'?'شورت':'لانگ',pl.side==='short'?'d':'u');
  add('فاصله‌ی استاپ',sd.toFixed(1)+'%','w');
  return kv;
}
/* ماشین‌حساب درس 4: همان روش کانال — ریسک از کل سرمایه، حجم از فاصله‌ی استاپ */
function guideCalc(){
  const w=el('div','gcalc');
  const f=(id,l,v)=>'<div class="fld"><label>'+l+'</label><input id="gc_'+id+'" type="number" step="any" inputmode="decimal" value="'+v+'"></div>';
  w.innerHTML='<div class="grid">'+f('cap','سرمایه‌ی کل ($)',1000)+f('risk','ریسک (٪ سرمایه)',1)+
    f('e','قیمت ورود',1.455)+f('sl','حد ضرر',1.25)+f('lev','اهرم',20)+
    '<div class="fld"><label>&nbsp;</label><button class="mark ghost" id="gc_me" type="button">با موجودی من</button></div></div>'+
    '<div class="briefkv gkv" id="gc_out"></div><div id="gc_warn"></div>';
  const g=id=>parseFloat(normDig((w.querySelector('#gc_'+id)||{}).value||''));
  const paint=()=>{
    const cap=g('cap'),r=g('risk'),e=g('e'),sl=g('sl'),lev=g('lev');
    const out=w.querySelector('#gc_out'),wr=w.querySelector('#gc_warn');
    out.innerHTML='';wr.innerHTML='';
    if(!(cap>0&&r>0&&e>0&&sl>0&&lev>=1)||e===sl){out.innerHTML='<div class="bk"><b>نتیجه</b><span class="m">اعداد ناقص است</span></div>';return;}
    const long=sl<e, sd=Math.abs(e-sl)/e, rUsd=cap*r/100, size=rUsd/sd, mg=size/lev, qty=size/e;
    const ld=1/lev-MMR, liq=ld>0?e*(1-(long?1:-1)*ld):null, safe=Math.floor(1/(sd+MMR));
    const add=(l,v,c)=>out.insertAdjacentHTML('beforeend','<div class="bk"><b>'+l+'</b><span class="'+(c||'')+'" dir="ltr">'+v+'</span></div>');
    add('جهت',long?'لانگ':'شورت',long?'u':'d');
    add('ریسک دلاری',fmtUsd(rUsd),'d');
    add('فاصله‌ی استاپ',(sd*100).toFixed(2)+'%','w');
    add('حجم پوزیشن',fmtUsd(size));
    add('مارجین',fmtUsd(mg));
    add('تعداد واحد',(+qty.toPrecision(5))+'');
    add('لیکوئید (ایزوله)',liq&&lev>1?fmtPrice(liq):'ندارد',lev>1?'d':'m');
    add('اهرم امن (ایزوله)',Math.max(1,safe)+'X',lev>safe?'d':'u');
    if(lev>safe&&lev>1)wr.innerHTML='<div class="rwarn bad">با اهرم <b dir="ltr">'+lev+'X</b> در مارجین ایزوله، لیکوئید قبل از حد ضرر می‌رسد. اهرم را حداکثر <b dir="ltr">'+Math.max(1,safe)+'X</b> بگذار یا Cross کار کن.</div>';
    if(mg>cap)wr.innerHTML+='<div class="rwarn bad">مارجین لازم از کل سرمایه بیشتر است؛ اهرم را بالاتر ببر یا حجم را کم کن.</div>';
  };
  w.addEventListener('input',paint);
  setTimeout(()=>{const b=w.querySelector('#gc_me');if(b)b.onclick=()=>{w.querySelector('#gc_cap').value=S.acct;paint();};paint();},0);
  return w;
}
/* ساعت درس 5: کلوز کندل 4 ساعته‌ی بعدی و وضعیت دو سشن، به وقت تهران */
let GCLOCK=null;
function tehranNow(d){
  try{
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',hour:'2-digit',
      minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
    return {min:(+p.hour%24)*60+(+p.minute),wd:p.weekday};
  }catch(e){return null;}
}
const WD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function sessionState(t,a,b){
  // a..b دقیقه از شروع روز به وقت تهران، فقط دوشنبه تا جمعه
  const work=i=>WD.indexOf(WD[(WD.indexOf(t.wd)+i)%7])<5;
  if(work(0)&&t.min>=a&&t.min<b)return {open:true,left:b-t.min};
  for(let i=0;i<8;i++){
    if(!work(i))continue;
    const start=i*1440+a-t.min;
    if(start>0)return {open:false,left:start};
  }
  return {open:false,left:null};
}
const durFa=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),mm=m%60;
  return (h?faN(h)+' ساعت'+(mm?' و ':''):'')+(mm||!h?faN(mm)+' دقیقه':'');};
function paintClock(w){
  const now=Date.now(), P=4*3600e3, next=Math.ceil((now+1000)/P)*P, t=tehranNow(new Date(now));
  if(!t){w.innerHTML='<div class="hint">این مرورگر منطقه‌ی زمانی تهران را نمی‌شناسد.</div>';return;}
  const slots=['03:30','07:30','11:30','15:30','19:30','23:30'];
  const nt=tehranNow(new Date(next)), nextLbl=String(Math.floor(nt.min/60)).padStart(2,'0')+':'+String(nt.min%60).padStart(2,'0');
  const cn=sessionState(t,300,720), ny=sessionState(t,1020,1440);
  const ses=(flag,name,st)=>'<div class="gses '+(st.open?'on':'')+'"><b>'+flag+' '+name+'</b><span>'+
    (st.open?'باز است · '+durFa(st.left)+' تا بسته شدن':(st.left!=null?'بسته · '+durFa(st.left)+' تا باز شدن':'بسته'))+'</span></div>';
  w.innerHTML='<div class="gnext"><span>کلوز کندل 4 ساعته‌ی بعدی</span><b dir="ltr">'+nextLbl+'</b><em>'+durFa((next-now)/60000)+' دیگر</em></div>'+
    '<div class="gslots">'+slots.map(s=>'<i class="'+(s===nextLbl?'on':'')+'" dir="ltr">'+s+'</i>').join('')+'</div>'+
    '<div class="gsess">'+ses('🇨🇳','چین',cn)+ses('🇺🇸','نیویورک',ny)+'</div>';
}
function guideClock(){
  const w=el('div','gclock');paintClock(w);
  if(!GCLOCK)GCLOCK=setInterval(()=>$$('.gclock').forEach(paintClock),30000);
  return w;
}
/* درس 9: پوزیشن‌های باز همین حالا در برابر قانون 3 پوزیشن / 3٪ ریسک */
function guideRulesNow(){
  const w=el('div','grulesnow');
  const open=DB.positions.filter(p=>p.status==='open');
  let atRisk=0,sum=0,free=0,noStop=0;
  for(const p of open){
    const sign=p.dir==='short'?-1:1, q=(p.margin*p.lev)/p.entry;
    if(!p.stop){noStop++;atRisk++;continue;}
    const r=(p.entry-p.stop)*sign*q;
    if(r>1e-9){atRisk++;sum+=r;}else free++;
  }
  const pct=S.acct>0?sum/S.acct*100:0;
  const bar=(v,max,lbl,val)=>'<div class="gmeter '+(v>max?'bad':v>=max?'full':'')+'"><div><b>'+lbl+'</b><span dir="ltr">'+val+'</span></div>'+
    '<i><s style="width:'+Math.min(100,v/max*100)+'%"></s></i></div>';
  const ok=atRisk<3&&pct<3&&!noStop;
  w.innerHTML=bar(atRisk,3,'پوزیشن در ریسک',faN(atRisk)+' / 3')+
    bar(pct,3,'ریسک فعال از سرمایه',pct.toFixed(1)+'% / 3%')+
    '<div class="gverdict '+(ok?'ok':'no')+'">'+(open.length
      ?(ok?'طبق قانون کانال می‌توانی یک پوزیشن تازه بگیری.':'طبق قانون کانال فعلاً پوزیشن تازه نگیر؛ اول یکی را ریسک‌فری یا بسته کن.')
      :'پوزیشن بازی نداری؛ جا برای 3 پوزیشن هست.')+
    (free?'<br>'+faN(free)+' پوزیشن ریسک‌فری داری که در شمارش نیست.':'')+
    (noStop?'<br>'+faN(noStop)+' پوزیشن بدون حد ضرر است؛ ریسکش نامحدود حساب می‌شود.':'')+'</div>'+
    '<div class="hint">مبنا: موجودی حساب <b dir="ltr">'+fmtUsd(S.acct)+'</b> از تنظیمات.</div>';
  return w;
}
function guideNote(n){
  const N=noteOf(n);if(!N)return null;
  const w=el('div','gn');
  w.appendChild(el('div','ghead2',ic('book')+'<span>تحلیل و آموزش قدم‌به‌قدم</span>'));
  w.appendChild(el('div','gsum',N.sum));
  if(N.widget==='calc')w.appendChild(guideCalc());
  else if(N.widget==='clock')w.appendChild(guideClock());
  else if(N.widget==='rules')w.appendChild(guideRulesNow());
  if(N.pic&&N.pic.length){
    w.appendChild(gSec('search','تحلیل تصویر'));
    const ul=el('ul','gpic');ul.innerHTML=N.pic.map(x=>'<li>'+x+'</li>').join('');w.appendChild(ul);
  }
  if(N.plan){
    w.appendChild(gSec('trend','نقشه‌ی معامله'));
    w.appendChild(guideKv(N.plan));
    w.appendChild(guideLadder(N.plan));
  }
  if(N.cmp){
    w.appendChild(gSec('bars','مقایسه'));
    const t=el('table','gcmp');
    t.innerHTML='<thead><tr><th></th>'+N.cmp.h.map(h=>'<th dir="ltr">'+h+'</th>').join('')+'</tr></thead><tbody>'+
      N.cmp.rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('')+'</tbody>';
    w.appendChild(tWrap(t));
  }
  if(N.steps&&N.steps.length){
    w.appendChild(gSec('flag','قدم‌به‌قدم'));
    const ol=el('ol','gsteps');
    ol.innerHTML=N.steps.map((s,i)=>'<li><i>'+faN(i+1)+'</i><div><b>'+s[0]+'</b><p>'+s[1]+'</p></div></li>').join('');
    w.appendChild(ol);
  }
  if(N.rules&&N.rules.length){
    w.appendChild(gSec('shield','قانون‌های کلیدی'));
    const ul=el('ul','grules');ul.innerHTML=N.rules.map(x=>'<li>'+ic('check')+'<span>'+x+'</span></li>').join('');
    w.appendChild(ul);
  }
  for(const x of (N.warn||[]))w.appendChild(el('div','gwarnbox',ic('alert')+'<span>'+x+'</span>'));
  if(N.app)w.appendChild(el('div','gapp',ic('star')+'<span><b>در همین برنامه:</b> '+N.app+'</span>'));
  return w;
}
function guideCard(n,title,i,q){
  const L=guideRec(n), open=GUIDE.open.has(n)||!!q;
  const c=el('div','card lesson gcard'+(L&&L.read?' done':'')+(open?' open':''));
  const head=el('button','ghead');
  head.setAttribute('aria-expanded',open?'true':'false');
  head.innerHTML='<span class="gnum">'+(L&&L.read?ic('check'):faN(i))+'</span>'+
    '<span class="gttl">'+esc(title)+'</span>'+
    (L?(L.video?'<span class="pill mut">ویدیو</span>':''):'<span class="pill mut">نیامده</span>')+
    '<span class="gchev"></span>';
  head.onclick=()=>{GUIDE.open.has(n)?GUIDE.open.delete(n):GUIDE.open.add(n);renderLessons();};
  c.appendChild(head);
  if(!open)return c;
  const body=el('div','gbody');
  const note=guideNote(n);
  if(!L){
    body.appendChild(el('div','hint','پست این درس هنوز از کانال خوانده نشده. «دریافت از کانال» را بالا بزن، '+
      'یا مستقیم در تلگرام ببین.'));
    const a=el('a','mark ghost','در تلگرام ببین');a.href='https://t.me/'+S.channel+'/'+n;a.target='_blank';a.rel='noopener';
    body.appendChild(a);
    if(note){body.appendChild(note);
      const ex=el('button','mark ghost',ic('share')+'PDF / PNG تحلیل');ex.onclick=()=>sheetLessonExport(null,n,title,i);
      body.appendChild(ex);}
    c.appendChild(body);return c;
  }
  body.appendChild(mediaOf(L));
  const gtx=lessonText(L,n), long=gtx.length>420, col=long&&COLLAPSED['G'+n]!==false&&!q;
  body.appendChild(el('div','txt'+(col?' clamp':''),linkify(esc(faN(gtx||'(این پست متن ندارد)')))));
  if(long){
    const b=el('button','more',col?'ادامه متن':'بستن متن');
    b.onclick=()=>{COLLAPSED['G'+n]=!col;renderLessons();};
    body.appendChild(b);
  }
  if(note)body.appendChild(note);
  const row=el('div','markrow');
  const rd=el('button','mark'+(L.read?' on':''),L.read?ic('check')+'خوانده شد':'خواندم');
  rd.onclick=()=>{
    const was=!!L.read;
    // خواندی؟ این درس بسته و درسِ بعدی باز می‌شود — همان «به‌ترتیب» که کانال خواسته
    if(!was){GUIDE.open.delete(n);const next=guideList()[i];if(next)GUIDE.open.add(next[0]);}
    guideRead(n,!was);
  };
  row.appendChild(rd);
  const ed=el('button','mark ghost',ic('edit')+'ویرایش متن');ed.title='ویرایش متن و تحلیل این درس';
  ed.onclick=()=>sheetLessonText(L,n,title,i,null);
  row.appendChild(ed);
  const ex=el('button','mark ghost',ic('share')+'PDF / PNG');ex.title='خروجی کامل این درس برای فرستادن یا دانلود';
  ex.onclick=()=>sheetLessonExport(L,n,title,i);
  row.appendChild(ex);
  const a=el('a','mark ghost','در تلگرام');a.href=L.link;a.target='_blank';a.rel='noopener';
  row.appendChild(a);
  body.appendChild(row);
  c.appendChild(body);
  return c;
}
function buildGuide(q){
  const list=guideList();
  const match=([n,t])=>{if(!q)return true;const L=guideRec(n);
    return ((t||'')+' '+(L?L.text||'':'')).toLowerCase().includes(q);};
  const shown=list.map((x,i)=>[x,i+1]).filter(([x])=>match(x));
  if(q&&!shown.length)return null;
  const box=el('div','guide');
  const have=list.filter(([n])=>guideRec(n)).length;
  const read=list.filter(([n])=>{const L=guideRec(n);return L&&L.read;}).length;
  const hd=el('div','ghd');
  hd.innerHTML='<div class="gtitle">'+ic('book')+'<b>'+GUIDE_CAT+'</b></div>'+
    '<div class="gprog"><span>'+faN(read)+' از '+faN(list.length)+' خوانده شده</span>'+
    '<i><s style="width:'+Math.round(read/list.length*100)+'%"></s></i></div>';
  box.appendChild(hd);
  box.appendChild(el('div','gwarn',esc(GUIDE_WARN)));
  const bar=el('div','lbar');
  const fb=el('button','mark'+(GUIDE.busy?' busy':''),GUIDE.busy?'در حال خواندن…':(have<list.length?'دریافت از کانال':'به‌روزرسانی از کانال'));
  fb.disabled=GUIDE.busy;fb.onclick=()=>loadGuide(true);
  bar.appendChild(fb);
  if(have<list.length&&!GUIDE.busy)bar.appendChild(el('span','markhint',faN(list.length-have)+' درس هنوز نیامده'));
  box.appendChild(bar);
  if(GUIDE.err)box.appendChild(el('div','rwarn warn',esc(GUIDE.err)));
  for(const [[n,t],i] of shown)box.appendChild(guideCard(n,lessonTitleOf(null,n,t),i,q));
  return box;
}

function renderLessons(){
  const box=$('#lessonList');if(!box)return;
  const all=Object.values(DB.lessons).filter(L=>!L.guide).sort((a,b)=>(b.at||0)-(a.at||0));
  const q=lessonQ.trim().toLowerCase();
  let list=q?all.filter(L=>((L.title||'')+' '+(L.text||'')).toLowerCase().includes(q)):all;
  if(catFilter!=null)list=list.filter(L=>(L.cat||'')===catFilter);
  box.innerHTML='';

  const g=buildGuide(q);
  if(g)box.appendChild(g);

  box.appendChild(el('div','sechd','آموزش‌های دیگر'));
  // نوار بالا: اسکن، و وقتی آموزشی هست، حالت انتخاب
  const bar=el('div','lbar');
  const scan=el('button','mark','آوردن از کانال');scan.onclick=sheetScan;
  bar.appendChild(scan);
  if(all.length){
    const sel=el('button','mark ghost'+(pickMode?' on':''),pickMode?'پایان انتخاب':'انتخاب چندتایی');
    sel.onclick=()=>{pickMode=!pickMode;picked.clear();renderLessons();};
    bar.appendChild(sel);
    if(pickMode){
      const del=el('button','mark ghost','حذف '+faN(picked.size));
      del.onclick=()=>{
        if(!picked.size)return toast('چیزی انتخاب نشده','err');
        const ids=[...picked];picked.clear();pickMode=false;
        undoable(faN(ids.length)+' آموزش حذف شد',()=>{for(const id of ids)delete DB.lessons[id];});
      };
      bar.appendChild(del);
    }
  }
  box.appendChild(bar);

  // چیپ دسته‌ها
  const cats=lessonCats();
  const noCat=all.some(L=>!(L.cat||'').trim());
  if(cats.length||noCat){
    const row=el('div','catrow');
    const chip=(label,val)=>{
      const c=el('button','catchip'+(catFilter===val?' on':''),esc(label));
      c.onclick=()=>{catFilter=(catFilter===val?null:val);renderLessons();};
      row.appendChild(c);
    };
    chip('همه',null);
    for(const c of cats)chip(c,c);
    if(noCat)chip('بدون دسته','');
    box.appendChild(row);
  }

  if(!list.length){
    box.appendChild(el('div','empty sm',(all.length
      ?'با این فیلتر چیزی نیست.'
      :'آموزش دیگری ذخیره نکرده‌ای.<br>«آوردن از کانال» کانال را برای پست‌های آموزشی می‌گردد،<br>یا در تب سیگنال‌ها روی هر پست «آموزش» را بزن.')));
    return;
  }
  for(const L of list){
    const c=el('div','card lesson'+(pickMode&&picked.has(L.id)?' picked':''));
    const head=el('div','chead');
    if(pickMode){
      const cb=el('input');cb.type='checkbox';cb.className='lpick';cb.checked=picked.has(L.id);
      cb.onchange=()=>{cb.checked?picked.add(L.id):picked.delete(L.id);renderLessons();};
      head.appendChild(cb);
    }
    head.appendChild(el('span','ltitle',esc(lessonTitleOf(L,null,L.title||'بدون عنوان'))));
    if((L.cat||'').trim())head.appendChild(el('span','pill mut',esc(L.cat)));
    head.appendChild(el('div','when',L.link
      ?'<a href="'+esc(L.link)+'" target="_blank" rel="noopener">'+relTime(L.date?new Date(L.date):null)+'</a>'
      :relTime(L.date?new Date(L.date):null)));
    c.appendChild(head);
    if(L.img||L.video)c.appendChild(mediaOf(L));
    const body=el('div','body');
    const ltx=lessonText(L,null), long=ltx.length>320, col=long&&COLLAPSED['L'+L.id]!==false;
    body.appendChild(el('div','txt'+(col?' clamp':''),linkify(esc(faN(ltx||'(بدون متن)')))));
    if(long){
      const b=el('button','more',col?'ادامه متن':'بستن متن');
      b.onclick=()=>{COLLAPSED['L'+L.id]=!col;renderLessons();};
      body.appendChild(b);
    }
    c.appendChild(body);
    const row=el('div','markrow');
    const ex=el('button','mark ghost',ic('share')+'PDF / PNG');ex.title='خروجی کامل این آموزش';
    ex.onclick=()=>sheetLessonExport(L,null,L.title||'آموزش',0);
    row.appendChild(ex);
    const rn=el('button','mark ghost','ویرایش');rn.onclick=()=>sheetEditLesson(L.id);
    const rm=el('button','mark ghost','حذف');
    rm.onclick=()=>undoable('«'+esc(L.title||'آموزش')+'» حذف شد',()=>{delete DB.lessons[L.id];});
    row.appendChild(rn);row.appendChild(rm);
    c.appendChild(row);
    box.appendChild(c);
  }
}

