/* COUNTRY-DROPDOWN-FIX-V5: foreign State -> City fallback; UK London guaranteed */
/* COUNTRY-DROPDOWN-FIX-V4: UK London State -> City fallback */
// ============ CONFIG ============
// এখানে আপনার Google Apps Script Web App URL বসান (নতুন Deploy করে যেটা পাবেন)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2FzjW0j1KP9rGUtiRO73WcUWXvajeSej5yVfBN0aH7gj7cfJRirwgX6DlyrAKxb3U/exec";

// Level 3: heavy receipt/PDF libraries load only when the visitor requests a receipt.
const __lazyScriptCache={};
function loadExternalScriptOnce(src,id){if(window[id])return Promise.resolve();if(__lazyScriptCache[src])return __lazyScriptCache[src];__lazyScriptCache[src]=new Promise((resolve,reject)=>{const x=document.createElement('script');if(id)x.id=id;x.src=src;x.async=true;x.onload=()=>resolve();x.onerror=reject;document.head.appendChild(x);});return __lazyScriptCache[src];}
async function ensureReceiptLibraries(){await loadExternalScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js','html2canvas-sdk');await loadExternalScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','jspdf-sdk');}
// First-paint performance: আগে HTML/মূল UI paint হবে, তারপর non-critical network কাজ শুরু হবে।
function afterFirstPaint(fn, timeout){
  const run=()=>{
    try{
      if('requestIdleCallback' in window){ requestIdleCallback(fn,{timeout:timeout||1800}); }
      else { setTimeout(fn,180); }
    }catch(e){ setTimeout(fn,180); }
  };
  try{ requestAnimationFrame(()=>requestAnimationFrame(run)); }catch(e){ setTimeout(run,120); }
}

// ============ পাবলিক সাইট সেটিংস ============
function applyPublicSiteSettings(){const defaultTitle=document.title;fetch(SCRIPT_URL+'?action=getPublicSiteSettings').then(r=>r.json()).then(d=>{if(!d.success)return;const s=d.settings||{};if(s.siteTitle)document.title=s.siteTitle;else document.title=defaultTitle;if(s.whatsapp){const n=String(s.whatsapp).replace(/\D/g,'');const full=n.startsWith('88')?n:'88'+n;document.querySelectorAll('a[href*='+'"wa.me/"'+']').forEach(a=>{const old=a.getAttribute('href')||'';const text=old.includes('?text=')?old.substring(old.indexOf('?text=')):'';a.setAttribute('href','https://wa.me/'+full+text);});}if(s.facebook)document.querySelectorAll('a[href*='+'"facebook.com/AlaminIslamAi13"'+'],a[href*='+'"facebook.com/AlaminIslam13AI"'+']').forEach(a=>a.setAttribute('href',s.facebook));if(s.youtube)document.querySelectorAll('[data-site-youtube]').forEach(a=>a.href=s.youtube);if(s.telegram)document.querySelectorAll('[data-site-telegram]').forEach(a=>a.href=s.telegram);if(s.contactEmail)document.querySelectorAll('[data-site-email]').forEach(a=>a.href='mailto:'+s.contactEmail);}).catch(()=>{});}
afterFirstPaint(applyPublicSiteSettings,1800);
// ==================================

// ============ পেমেন্ট নম্বর কপি + পেমেন্ট মাধ্যম অটো-সিলেক্ট ============
function copyFeeNumber(btn, number, method){
  const done = ()=>{
    const original = btn.textContent;
    btn.textContent = '✓ কপি হয়েছে';
    btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent = original; btn.classList.remove('copied'); }, 1500);
  };
  const runCopy = ()=>{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(number).then(done).catch(()=>{
        const ta = document.createElement('textarea');
        ta.value = number; document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); done(); }catch(e){}
        document.body.removeChild(ta);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = number; document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); done(); }catch(e){}
      document.body.removeChild(ta);
    }
  };
  runCopy();
  if(method) selectPaymentMethodFromFee(method);
}
function selectPaymentMethodFromFee(method){
  const select = document.getElementById('paymentMethod');
  select.value = method;
  select.dispatchEvent(new Event('change'));
  markFeeMethodSelected(method);
}
function markFeeMethodSelected(method){
  document.querySelectorAll('.fee-method').forEach(el=>{
    el.classList.toggle('selected', el.id === 'feeMethod-' + method);
  });
  const status = document.getElementById('selectedMethodStatus');
  if(status){
    status.textContent = '✓ পেমেন্ট মাধ্যম নির্বাচিত হয়েছে: ' + method;
    status.classList.add('show');
  }
}

// ============ ডার্ক মোড ============
(function initTheme(){
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
})();

// ============ লোকেশন পারমিশন ============
// নোটিফিকেশন পারমিশন এখন OneSignal-এর নিজস্ব বড় পপআপ (Slidedown) দিয়ে চাওয়া হয় (উপরে init দেখুন)।
// এখানে আলাদাভাবে ব্রাউজারের ডিফল্ট ছোট পারমিশন বার চাওয়া হচ্ছে না — সেটাই আগে সাবস্ক্রাইব
// ঠিকমতো যোগ না হওয়ার কারণ ছিল (OneSignal-কে পাশ কাটিয়ে সরাসরি Notification.requestPermission() কল হচ্ছিল)।
(function requestSitePermissions(){
  if('geolocation' in navigator){
    navigator.geolocation.getCurrentPosition(
      ()=>{ /* অনুমতি দিলে — এখানে বর্তমানে কোনো তথ্য সংগ্রহ/ব্যবহার করা হয় না */ },
      ()=>{ /* অনুমতি না দিলে বা ব্যর্থ হলে — নীরবে উপেক্ষা করা হয় */ },
      { timeout: 8000 }
    );
  }
})();


function applyTheme(theme){
  const isEn = document.documentElement.lang === 'en';
  if(theme === 'dark'){
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggleLabel').textContent = isEn ? 'Light Mode' : 'লাইট মোড';
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeToggleLabel').textContent = isEn ? 'Dark Mode' : 'ডার্ক মোড';
  }
  localStorage.setItem('theme', theme);
}

document.getElementById('themeToggleBtn').addEventListener('click', ()=>{
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(isDark ? 'light' : 'dark');
});

// ============ ভাষা পরিবর্তন (বাংলা ⇄ English) ============
// পেজ লোড হওয়ার সাথে সাথে প্রতিটা data-i18n এলিমেন্টের মূল বাংলা টেক্সট
// সংরক্ষণ করে রাখা হয়, যাতে ইংরেজি থেকে আবার বাংলায় ফেরার সময় নতুন করে
// লিখতে না হয় — শুধু ইংরেজি অনুবাদগুলো নিচে দেওয়া থাকলেই চলবে।
const I18N_ORIGINAL_BN = {};
document.querySelectorAll('[data-i18n]').forEach(el=>{
  const key = el.getAttribute('data-i18n');
  if(!(key in I18N_ORIGINAL_BN)) I18N_ORIGINAL_BN[key] = el.innerHTML;
});

const I18N_EN = {
  'header.share': 'Share',
  'header.shareVia': 'Share via',
  'header.email': 'Email',
  'header.copyLink': 'Copy link',
  'nav.home': 'Home',
  'nav.blog': 'Blog',
  'nav.services': 'Services',
  'nav.reviews': 'Reviews',
  'nav.contact': 'Contact',
  'hero.eyebrow': 'Social Media Problem-Solving Service',
  'hero.tagline': 'Let your dream become your future',
  'hero.h1': 'Facebook, Instagram, TikTok, YouTube — ID/Page/Channel Hack, Disable, Monetization Problem Solutions',
  'hero.byline': 'Md Alamin Islam &nbsp;•&nbsp; Gopsena, Keshabpur, Jessore',
  'hero.desc': 'If your Facebook, Instagram, TikTok, or YouTube ID/Page/Channel has been hacked, disabled, monetization has stopped, or you have any other social media related problem — fill out the form below and I will review it and contact you.',
  'hero.trustBadge': '✓ Direct contact &nbsp;•&nbsp; ✓ Safe information &nbsp;•&nbsp; ✓ Quick response',
  'hero.online': 'Online now',
  'hero.totalVisit': 'Total Visits',
  'stats.solved': 'Solved',
  'stats.totalApp': 'Total Applications',
  'stats.ongoing': 'In Progress',
  'stats.rating': 'Customer Rating',
  'posts.heading': 'Blog &amp; Latest Updates',
  'posts.viewAll': 'View all posts →',
  'posts.sub': 'Regular writing and updates on Facebook, Instagram, TikTok, YouTube issues, recovery, and monetization',
  'posts.loading': 'Loading updates...',
  'btn.whatsapp': 'Contact on WhatsApp',
  'btn.facebook': 'Visit our Facebook Page',
  'btn.liveChat': 'Start Live Chat',
  'services.heading': 'Our Services',
  'services.note': 'Facebook, Instagram, TikTok, YouTube Help — solving Account/Page/Channel Hacked, Disabled, Suspended, and Monetization issues',
  'services.li1': 'Full Facebook ID and Page setup',
  'services.li2': 'ID review',
  'services.li3': 'Payout account creation',
  'services.li4': 'Payout name correction',
  'services.li5': 'TIN certificate opening',
  'services.li6': 'Bank account setup',
  'services.li7': 'Suspended ID recovery',
  'services.li8': 'Hacked page/account recovery',
  'services.li9': 'Disabled ID or page recovery',
  'services.li10': 'Stopped monetization solutions (including in-stream ad issues)',
  'services.li11': 'Community standard violation and copyright strike solutions',
  'services.li12': 'Business Manager and ad account disabled solutions',
  'services.li13': 'Any other Facebook/Meta related issue',
  'services.li14': 'Instagram account hack and disable solutions',
  'services.li15': 'TikTok account hack and ban solutions',
  'services.li16': 'YouTube channel hack, suspension, and monetization solutions',
  'cta.text': 'Click the button below to apply in just 3 steps',
  'cta.btn': 'Fill in your information',
  'cta.trust': '✓ Completely safe &nbsp;·&nbsp; ✓ Quick response &nbsp;·&nbsp; ✓ Refund if unresolved',
  'faq.heading': 'Frequently Asked Questions',
  'faq.q1': 'How soon will I be contacted after applying?',
  'faq.a1': 'After receiving your application, we verify it and contact you as soon as possible via WhatsApp or phone. We usually respond within 24 hours.',
  'faq.q2': 'Is the application fee refundable?',
  'faq.a2': 'The application fee is only for verifying the application, so it is non-refundable. Service charges are determined separately through discussion.',
  'faq.q3': 'What kind of problems do you solve?',
  'faq.a3': 'We handle Facebook, Instagram, TikTok, and YouTube — full ID/page/channel setup, ID review, payout account creation, payout name correction, fixing any issue, opening TIN certificates, bank account setup, fixing suspended or banned IDs, recovering hacked pages/accounts/channels, restoring disabled IDs or pages, fixing stopped monetization, and other related problems.',
  'faq.q4': 'How much will the service cost in total?',
  'faq.a4': 'The cost varies depending on the type of problem. After verifying your application, the cost is discussed directly with you — no work is done for free.',
  'faq.q6': 'How long does it usually take to resolve an issue?',
  'faq.a6': 'The time varies depending on the type of problem and the platform\'s process. Minor issues are usually resolved within a few days, while complex cases (such as bank or payout-level verification) may take a bit longer. You will be updated on every step via WhatsApp.',
  'faq.q7': 'Can I apply for multiple IDs/pages/channels at once?',
  'faq.a7': 'Yes, but a separate form must be filled out for each ID/page/channel so that every issue can be verified and tracked individually. If you need direct help applying for multiple accounts, feel free to message the WhatsApp number above.',
  'faq.q8': 'Can I apply from another country?',
  'faq.a8': 'Yes, people can apply from any country. The form accepts country, state/province, district/city, locality, and village/area details, and verification and communication are handled online and via WhatsApp.',
  'faq.q9': 'What happens if the problem cannot be solved?',
  'faq.a9': 'Every application is first verified so you get a clear picture of the chances of a solution before work begins. If any obstacle comes up during the process, you are informed right away on WhatsApp. If, despite everything, the problem ultimately cannot be resolved, the service charge you paid will be refunded (excluding the initial application verification fee) — nothing is kept hidden.',
  'faq.q5': 'Privacy Policy',
  'faq.a5': 'The name, mobile number, email, date of birth, address, photo, and ID/profile/channel link you provide are used only to verify your application and to contact you. This information is stored in our own Google Sheet and Google Drive and is not shared or sold to any third party.<br><br>Payment screenshots and transaction IDs are kept only to verify fee payment.<br><br>Notification or location permissions are entirely optional — you can fill out the form and register even without granting permission.<br><br>If you want your information deleted or have any related questions, please contact the WhatsApp number above.',
  'reviews.heading': "Customer Reviews",
  'reviewForm.heading': 'Share Your Experience',
  'reviewForm.rating': 'Give a rating',
  'reviewForm.name': 'Your name (optional)',
  'reviewForm.text': 'Your feedback',
  'reviewForm.submit': 'Submit Review',
  'footer.brand': 'Social Media Problem Solution Service',
  'footer.tag': 'A trusted service for solving Facebook, Instagram, TikTok, and YouTube related problems — Keshabpur, Jessore',
  'footer.copy': 'Md Alamin Islam. All rights reserved.'
};

function applyLanguage(lang){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(lang === 'en' && I18N_EN[key] !== undefined){
      el.innerHTML = I18N_EN[key];
    } else {
      el.innerHTML = I18N_ORIGINAL_BN[key];
    }
  });
  document.documentElement.lang = lang;
  document.getElementById('langToggleLabel').textContent = lang === 'en' ? 'বাং' : 'EN';
  localStorage.setItem('siteLang', lang);
  // থিম বাটনের লেবেলও ভাষা অনুযায়ী ঠিক করা দরকার (dark/light state অনুযায়ী)
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(isDark ? 'dark' : 'light');
}

document.getElementById('langToggleBtn').addEventListener('click', ()=>{
  const current = document.documentElement.lang === 'en' ? 'en' : 'bn';
  applyLanguage(current === 'en' ? 'bn' : 'en');
});

(function initLanguage(){
  const saved = localStorage.getItem('siteLang');
  if(saved === 'en') applyLanguage('en');
})();

// ============ শেয়ার বাটন — কাস্টম প্যানেলে বিভিন্ন প্লাটফর্মের আইকন ============
const shareData = {
  title: 'ফেসবুক সমস্যা সমাধান — রেজিস্ট্রেশন',
  text: 'ফেসবুক পেজ/অ্যাকাউন্ট হ্যাক, নিষ্ক্রিয় বা মনিটাইজেশন সমস্যায় রেজিস্ট্রেশন করুন:',
  get url(){ return window.location.href; }
};

const sharePanel = document.getElementById('sharePanel');
document.getElementById('shareBtn').addEventListener('click', (e)=>{
  e.stopPropagation();
  sharePanel.classList.toggle('show');
});
document.addEventListener('click', (e)=>{
  if(sharePanel.classList.contains('show') && !e.target.closest('.share-wrap')){
    sharePanel.classList.remove('show');
  }
});

function buildShareLink(platform){
  const url = encodeURIComponent(shareData.url);
  const text = encodeURIComponent(shareData.text);
  switch(platform){
    case 'whatsapp': return 'https://wa.me/?text=' + text + '%20' + url;
    case 'facebook': return 'https://www.facebook.com/sharer/sharer.php?u=' + url;
    case 'messenger': return 'fb-messenger://share/?link=' + url;
    case 'telegram': return 'https://t.me/share/url?url=' + url + '&text=' + text;
    case 'twitter': return 'https://twitter.com/intent/tweet?url=' + url + '&text=' + text;
    default: return '';
  }
}

document.querySelectorAll('.share-icon').forEach(el=>{
  const platform = el.getAttribute('data-platform');
  if(['whatsapp','facebook','messenger','telegram','twitter'].includes(platform)){
    el.href = buildShareLink(platform);
  } else if(platform === 'email'){
    el.addEventListener('click', ()=>{
      window.location.href = 'mailto:?subject=' + encodeURIComponent(shareData.title) + '&body=' + encodeURIComponent(shareData.text + ' ' + shareData.url);
    });
  } else if(platform === 'copy'){
    el.addEventListener('click', async ()=>{
      const labelEl = el.querySelector('.si-label');
      const original = labelEl.textContent;
      try{
        await navigator.clipboard.writeText(shareData.url);
        labelEl.textContent = (document.documentElement.lang === 'en') ? 'Copied!' : 'কপি হয়েছে!';
        el.classList.add('copied');
      }catch(err){
        alert(shareData.url);
      }
      setTimeout(()=>{ labelEl.textContent = original; el.classList.remove('copied'); }, 1800);
    });
  }
});

// ============ ব্রাউজার নোটিফিকেশন (আবেদন সফল হলে) ============
function notifyApplicationSuccess(appId){
  if(!('Notification' in window)) return;
  const fire = () => {
    try{
      new Notification('✓ রেজিস্ট্রেশন সফল হয়েছে', {
        body: 'আবেদন নম্বর: ' + appId + ' — শীঘ্রই যোগাযোগ করা হবে।',
        icon: 'icon-192.png'
      });
    }catch(err){ /* নোটিফিকেশন দেখাতে ব্যর্থ হলেও ফর্ম সাবমিট প্রভাবিত হবে না */ }
  };
  if(Notification.permission === 'granted'){
    fire();
  } else if(Notification.permission !== 'denied'){
    Notification.requestPermission().then(perm => { if(perm === 'granted') fire(); });
  }
}

// আবেদন নম্বরের সাথে এই ব্রাউজারের push subscription যুক্ত করা হয়,
// যাতে পরে অ্যাডমিন স্ট্যাটাস আপডেট করলে ঠিক এই মানুষটার কাছেই নোটিফিকেশন যায়।
function linkOneSignalToApplication(appId){
  if(typeof OneSignalDeferred === 'undefined' || !appId) return;
  OneSignalDeferred.push(async function(OneSignal){
    try{ await OneSignal.login(String(appId)); }catch(err){ /* ব্যর্থ হলেও ফর্ম সাবমিট প্রভাবিত হবে না */ }
  });
}

// WhatsApp বাটনে আবেদন নম্বরসহ একটা রেডি মেসেজ বসিয়ে দেওয়া হয়, যাতে ইউজারকে টাইপ করতে না হয়।
function personalizeWhatsappButton(appId){
  const msg = 'আসসালামু আলাইকুম, আমার আবেদন নম্বর: ' + appId + '। এই বিষয়ে যোগাযোগ করতে চাই।';
  const href = 'https://wa.me/8801764324313?text=' + encodeURIComponent(msg);
  const waBtn = document.getElementById('contactSection');
  if(waBtn && appId) waBtn.href = href;
  const waFloat = document.getElementById('whatsappFloatBtn');
  if(waFloat && appId) waFloat.href = href;
}

// বিভাগ ও জেলার তালিকা সরাসরি কোডে রাখা হয়েছে, তাই ইন্টারনেট/CDN এর উপর নির্ভর না করে
// সাথে সাথে লোড হবে এবং কখনো ফাঁকা থাকবে না।
const DIVISIONS = [
  { id: "1", name: "ঢাকা" },
  { id: "2", name: "চট্টগ্রাম" },
  { id: "3", name: "রাজশাহী" },
  { id: "4", name: "খুলনা" },
  { id: "5", name: "বরিশাল" },
  { id: "6", name: "সিলেট" },
  { id: "7", name: "রংপুর" },
  { id: "8", name: "ময়মনসিংহ" }
];

const DISTRICTS = {
  "1": ["ঢাকা","গাজীপুর","নারায়ণগঞ্জ","নরসিংদী","মানিকগঞ্জ","মুন্সিগঞ্জ","টাঙ্গাইল","কিশোরগঞ্জ","ফরিদপুর","গোপালগঞ্জ","মাদারীপুর","রাজবাড়ী","শরীয়তপুর"],
  "2": ["চট্টগ্রাম","কক্সবাজার","কুমিল্লা","ব্রাহ্মণবাড়িয়া","চাঁদপুর","ফেনী","লক্ষ্মীপুর","নোয়াখালী","খাগড়াছড়ি","রাঙামাটি","বান্দরবান"],
  "3": ["রাজশাহী","বগুড়া","পাবনা","সিরাজগঞ্জ","নাটোর","জয়পুরহাট","চাঁপাইনবাবগঞ্জ"],
  "4": ["খুলনা","যশোর","সাতক্ষীরা","বাগেরহাট","ঝিনাইদহ","কুষ্টিয়া","মাগুরা","মেহেরপুর","নড়াইল","চুয়াডাঙ্গা"],
  "5": ["বরিশাল","পটুয়াখালী","ভোলা","পিরোজপুর","বরগুনা","ঝালকাঠি"],
  "6": ["সিলেট","মৌলভীবাজার","হবিগঞ্জ","সুনামগঞ্জ"],
  "7": ["রংপুর","দিনাজপুর","কুড়িগ্রাম","গাইবান্ধা","নীলফামারী","পঞ্চগড়","ঠাকুরগাঁও","লালমনিরহাট"],
  "8": ["ময়মনসিংহ","জামালপুর","নেত্রকোণা","শেরপুর"]
};

const UPAZILAS = {
  "ঢাকা": ["ঢাকা সদর","ধামরাই","দোহার","কেরানীগঞ্জ","নবাবগঞ্জ","সাভার"],
  "গাজীপুর": ["গাজীপুর সদর","কালীগঞ্জ","কালিয়াকৈর","কাপাসিয়া","শ্রীপুর"],
  "নারায়ণগঞ্জ": ["নারায়ণগঞ্জ সদর","আড়াইহাজার","বন্দর","রূপগঞ্জ","সোনারগাঁও"],
  "নরসিংদী": ["নরসিংদী সদর","বেলাবো","মনোহরদী","পলাশ","রায়পুরা","শিবপুর"],
  "মানিকগঞ্জ": ["মানিকগঞ্জ সদর","ঘিওর","দৌলতপুর","হরিরামপুর","সাটুরিয়া","শিবালয়","সিংগাইর"],
  "মুন্সিগঞ্জ": ["মুন্সিগঞ্জ সদর","গজারিয়া","লৌহজং","শ্রীনগর","সিরাজদিখান","টঙ্গিবাড়ী"],
  "টাঙ্গাইল": ["টাঙ্গাইল সদর","বাসাইল","ভূঞাপুর","দেলদুয়ার","ঘাটাইল","গোপালপুর","কালিহাতী","মধুপুর","মির্জাপুর","নাগরপুর","সখীপুর","ধনবাড়ী"],
  "কিশোরগঞ্জ": ["কিশোরগঞ্জ সদর","বাজিতপুর","ভৈরব","হোসেনপুর","ইটনা","করিমগঞ্জ","কটিয়াদী","কুলিয়ারচর","মিঠামইন","নিকলী","পাকুন্দিয়া","তাড়াইল","অষ্টগ্রাম"],
  "ফরিদপুর": ["ফরিদপুর সদর","আলফাডাঙ্গা","বোয়ালমারী","চরভদ্রাসন","ভাঙ্গা","মধুখালী","নগরকান্দা","সদরপুর","সালথা"],
  "গোপালগঞ্জ": ["গোপালগঞ্জ সদর","কাশিয়ানী","কোটালীপাড়া","মুকসুদপুর","টুঙ্গিপাড়া"],
  "মাদারীপুর": ["মাদারীপুর সদর","কালকিনি","রাজৈর","শিবচর","ডাসার"],
  "রাজবাড়ী": ["রাজবাড়ী সদর","বালিয়াকান্দি","গোয়ালন্দ","পাংশা","কালুখালী"],
  "শরীয়তপুর": ["শরীয়তপুর সদর","ভেদরগঞ্জ","ডামুড্যা","গোসাইরহাট","নড়িয়া","জাজিরা"],

  "চট্টগ্রাম": ["চট্টগ্রাম সদর (কোতোয়ালী)","আনোয়ারা","বাঁশখালী","বোয়ালখালী","চন্দনাইশ","ফটিকছড়ি","হাটহাজারী","লোহাগাড়া","মিরসরাই","পটিয়া","রাঙ্গুনিয়া","রাউজান","সাতকানিয়া","সীতাকুণ্ড","সন্দ্বীপ"],
  "কক্সবাজার": ["কক্সবাজার সদর","চকরিয়া","কুতুবদিয়া","মহেশখালী","পেকুয়া","রামু","টেকনাফ","উখিয়া"],
  "কুমিল্লা": ["কুমিল্লা সদর","সদর দক্ষিণ","বরুড়া","ব্রাহ্মণপাড়া","চান্দিনা","চৌদ্দগ্রাম","দাউদকান্দি","দেবিদ্বার","হোমনা","লাকসাম","মেঘনা","মুরাদনগর","নাঙ্গলকোট","তিতাস","বুড়িচং","লালমাই","মনোহরগঞ্জ"],
  "ব্রাহ্মণবাড়িয়া": ["ব্রাহ্মণবাড়িয়া সদর","আখাউড়া","বাঞ্ছারামপুর","বিজয়নগর","কসবা","নাসিরনগর","নবীনগর","সরাইল"],
  "চাঁদপুর": ["চাঁদপুর সদর","ফরিদগঞ্জ","হাইমচর","হাজীগঞ্জ","কচুয়া","মতলব উত্তর","মতলব দক্ষিণ","শাহরাস্তি"],
  "ফেনী": ["ফেনী সদর","ছাগলনাইয়া","দাগনভূঞা","ফুলগাজী","পরশুরাম","সোনাগাজী"],
  "লক্ষ্মীপুর": ["লক্ষ্মীপুর সদর","কমলনগর","রামগঞ্জ","রায়পুর","রামগতি"],
  "নোয়াখালী": ["নোয়াখালী সদর","বেগমগঞ্জ","চাটখিল","কোম্পানীগঞ্জ","হাতিয়া","কবিরহাট","সেনবাগ","সোনাইমুড়ী","সুবর্ণচর"],
  "খাগড়াছড়ি": ["খাগড়াছড়ি সদর","দীঘিনালা","লক্ষ্মীছড়ি","মহালছড়ি","মানিকছড়ি","মাটিরাঙ্গা","পানছড়ি","রামগড়","গুইমারা"],
  "রাঙামাটি": ["রাঙামাটি সদর","বাঘাইছড়ি","বরকল","বিলাইছড়ি","জুরাছড়ি","কাউখালী","কাপ্তাই","লংগদু","নানিয়ারচর","রাজস্থলী"],
  "বান্দরবান": ["বান্দরবান সদর","আলীকদম","লামা","নাইক্ষ্যংছড়ি","রোয়াংছড়ি","রুমা","থানচি"],

  "রাজশাহী": ["রাজশাহী সদর (বোয়ালিয়া)","বাগমারা","বাঘা","চারঘাট","দুর্গাপুর","গোদাগাড়ী","মোহনপুর","পবা","পুঠিয়া","তানোর"],
  "বগুড়া": ["বগুড়া সদর","আদমদীঘি","ধুনট","দুপচাঁচিয়া","গাবতলী","কাহালু","নন্দীগ্রাম","সারিয়াকান্দি","শাজাহানপুর","শেরপুর","শিবগঞ্জ","সোনাতলা"],
  "পাবনা": ["পাবনা সদর","আটঘরিয়া","বেড়া","ভাঙ্গুড়া","চাটমোহর","ফরিদপুর","ঈশ্বরদী","সাঁথিয়া","সুজানগর"],
  "সিরাজগঞ্জ": ["সিরাজগঞ্জ সদর","বেলকুচি","চৌহালী","কামারখন্দ","কাজীপুর","রায়গঞ্জ","শাহজাদপুর","তাড়াশ","উল্লাপাড়া"],
  "নাটোর": ["নাটোর সদর","বাগাতিপাড়া","বড়াইগ্রাম","গুরুদাসপুর","লালপুর","নলডাঙ্গা","সিংড়া"],
  "জয়পুরহাট": ["জয়পুরহাট সদর","আক্কেলপুর","কালাই","ক্ষেতলাল","পাঁচবিবি"],
  "চাঁপাইনবাবগঞ্জ": ["চাঁপাইনবাবগঞ্জ সদর","গোমস্তাপুর","নাচোল","শিবগঞ্জ","ভোলাহাট"],

  "খুলনা": ["খুলনা সদর","বটিয়াঘাটা","দাকোপ","দিঘলিয়া","ডুমুরিয়া","কয়রা","পাইকগাছা","ফুলতলা","রূপসা","তেরখাদা"],
  "যশোর": ["যশোর সদর","অভয়নগর","বাঘারপাড়া","চৌগাছা","ঝিকরগাছা","কেশবপুর","মণিরামপুর","শার্শা"],
  "সাতক্ষীরা": ["সাতক্ষীরা সদর","আশাশুনি","দেবহাটা","কলারোয়া","কালীগঞ্জ","শ্যামনগর","তালা"],
  "বাগেরহাট": ["বাগেরহাট সদর","চিতলমারী","ফকিরহাট","কচুয়া","মোল্লাহাট","মংলা","মোরেলগঞ্জ","রামপাল","শরণখোলা"],
  "ঝিনাইদহ": ["ঝিনাইদহ সদর","হরিণাকুণ্ডু","কালীগঞ্জ","কোটচাঁদপুর","মহেশপুর","শৈলকুপা"],
  "কুষ্টিয়া": ["কুষ্টিয়া সদর","ভেড়ামারা","দৌলতপুর","খোকসা","কুমারখালী","মিরপুর"],
  "মাগুরা": ["মাগুরা সদর","মহম্মদপুর","শালিখা","শ্রীপুর"],
  "মেহেরপুর": ["মেহেরপুর সদর","গাংনী","মুজিবনগর"],
  "নড়াইল": ["নড়াইল সদর","কালিয়া","লোহাগড়া"],
  "চুয়াডাঙ্গা": ["চুয়াডাঙ্গা সদর","আলমডাঙ্গা","দামুড়হুদা","জীবননগর"],

  "বরিশাল": ["বরিশাল সদর","আগৈলঝাড়া","বাবুগঞ্জ","বাকেরগঞ্জ","বানারীপাড়া","গৌরনদী","হিজলা","মেহেন্দিগঞ্জ","মুলাদী","উজিরপুর"],
  "পটুয়াখালী": ["পটুয়াখালী সদর","বাউফল","দশমিনা","দুমকি","গলাচিপা","কলাপাড়া","মির্জাগঞ্জ","রাঙ্গাবালী"],
  "ভোলা": ["ভোলা সদর","বোরহানউদ্দিন","চরফ্যাশন","দৌলতখান","লালমোহন","মনপুরা","তজুমদ্দিন"],
  "পিরোজপুর": ["পিরোজপুর সদর","ভান্ডারিয়া","কাউখালী","মঠবাড়িয়া","নাজিরপুর","নেছারাবাদ","জিয়ানগর"],
  "বরগুনা": ["বরগুনা সদর","আমতলী","বামনা","বেতাগী","পাথরঘাটা","তালতলী"],
  "ঝালকাঠি": ["ঝালকাঠি সদর","কাঁঠালিয়া","নলছিটি","রাজাপুর"],

  "সিলেট": ["সিলেট সদর","বালাগঞ্জ","বিয়ানীবাজার","বিশ্বনাথ","কোম্পানীগঞ্জ","ফেঞ্চুগঞ্জ","গোলাপগঞ্জ","গোয়াইনঘাট","জৈন্তাপুর","কানাইঘাট","ওসমানীনগর","দক্ষিণ সুরমা","জকিগঞ্জ"],
  "মৌলভীবাজার": ["মৌলভীবাজার সদর","বড়লেখা","কমলগঞ্জ","কুলাউড়া","জুড়ী","রাজনগর","শ্রীমঙ্গল"],
  "হবিগঞ্জ": ["হবিগঞ্জ সদর","আজমিরীগঞ্জ","বাহুবল","বানিয়াচং","চুনারুঘাট","লাখাই","মাধবপুর","নবীগঞ্জ","শায়েস্তাগঞ্জ"],
  "সুনামগঞ্জ": ["সুনামগঞ্জ সদর","বিশ্বম্ভরপুর","ছাতক","দক্ষিণ সুনামগঞ্জ","দিরাই","দোয়ারাবাজার","ধর্মপাশা","জগন্নাথপুর","জামালগঞ্জ","শাল্লা","তাহিরপুর","মধ্যনগর"],

  "রংপুর": ["রংপুর সদর","বদরগঞ্জ","গঙ্গাচড়া","কাউনিয়া","মিঠাপুকুর","পীরগঞ্জ","পীরগাছা","তারাগঞ্জ"],
  "দিনাজপুর": ["দিনাজপুর সদর","বিরামপুর","বিরল","বীরগঞ্জ","বোচাগঞ্জ","চিরিরবন্দর","ফুলবাড়ী","ঘোড়াঘাট","হাকিমপুর","কাহারোল","খানসামা","নবাবগঞ্জ","পার্বতীপুর"],
  "কুড়িগ্রাম": ["কুড়িগ্রাম সদর","ভুরুঙ্গামারী","চর রাজিবপুর","চিলমারী","ফুলবাড়ী","নাগেশ্বরী","রাজারহাট","রৌমারী","উলিপুর"],
  "গাইবান্ধা": ["গাইবান্ধা সদর","ফুলছড়ি","গোবিন্দগঞ্জ","পলাশবাড়ী","সাঘাটা","সাদুল্লাপুর","সুন্দরগঞ্জ"],
  "নীলফামারী": ["নীলফামারী সদর","ডিমলা","ডোমার","জলঢাকা","কিশোরগঞ্জ","সৈয়দপুর"],
  "পঞ্চগড়": ["পঞ্চগড় সদর","আটোয়ারী","বোদা","দেবীগঞ্জ","তেঁতুলিয়া"],
  "ঠাকুরগাঁও": ["ঠাকুরগাঁও সদর","বালিয়াডাঙ্গী","হরিপুর","পীরগঞ্জ","রাণীশংকৈল"],
  "লালমনিরহাট": ["লালমনিরহাট সদর","আদিতমারী","কালীগঞ্জ","হাতীবান্ধা","পাটগ্রাম"],

  "ময়মনসিংহ": ["ময়মনসিংহ সদর","ভালুকা","ফুলবাড়ীয়া","গফরগাঁও","গৌরীপুর","হালুয়াঘাট","ঈশ্বরগঞ্জ","মুক্তাগাছা","নান্দাইল","ফুলপুর","তারাকান্দা","ত্রিশাল","ধোবাউড়া"],
  "জামালপুর": ["জামালপুর সদর","বকশীগঞ্জ","দেওয়ানগঞ্জ","ইসলামপুর","মাদারগঞ্জ","মেলান্দহ","সরিষাবাড়ী"],
  "নেত্রকোণা": ["নেত্রকোণা সদর","আটপাড়া","বারহাট্টা","দুর্গাপুর","খালিয়াজুরী","কলমাকান্দা","কেন্দুয়া","মদন","মোহনগঞ্জ","পূর্বধলা"],
  "শেরপুর": ["শেরপুর সদর","ঝিনাইগাতী","নকলা","নালিতাবাড়ী","শ্রীবরদী"]
};

const countrySelect = document.getElementById('country');
const divisionSelect = document.getElementById('division');
const districtSelect = document.getElementById('district');
const upazilaInput = document.getElementById('upazila');
const upazilaList = document.getElementById('upazilaList');

let __CSC = null;
let __globalStates = [];
let __globalCities = [];
let __locationLoadPromise = null;
let __locationChangeToken = 0;

function setSelectOptions(select, items, placeholder){
  select.innerHTML = '';
  const first = document.createElement('option');
  first.value = '';
  first.textContent = placeholder;
  select.appendChild(first);
  (items || []).forEach(item=>{
    const opt = document.createElement('option');
    opt.value = String(item.value ?? item.code ?? item.id ?? item.name ?? '');
    opt.textContent = String(item.text ?? item.name ?? '');
    select.appendChild(opt);
  });
  populateSearchList(select.id);
}

// ============ সার্চ ইনপুট + দেশভিত্তিক ফোন কোড ============
const __locationSearchMap = {
  country: {input:'countrySearch', list:'countrySearchList'},
  division: {input:'divisionSearch', list:'divisionSearchList'},
  district: {input:'districtSearch', list:'districtSearchList'}
};
function populateSearchList(selectId){
  const cfg=__locationSearchMap[selectId]; if(!cfg) return;
  const dl=document.getElementById(cfg.list); const sel=document.getElementById(selectId);
  if(!dl||!sel) return;
  dl.innerHTML='';
  Array.from(sel.options).slice(1).forEach(o=>{
    const x=document.createElement('option'); x.value=o.textContent; dl.appendChild(x);
  });
}
function syncSearchFromSelect(selectId){
  const cfg=__locationSearchMap[selectId]; const sel=document.getElementById(selectId);
  const inp=cfg&&document.getElementById(cfg.input); if(!sel||!inp) return;
  inp.value=sel.value ? (sel.options[sel.selectedIndex]?.textContent||'') : '';
}
function bindLocationSearch(selectId){
  const cfg=__locationSearchMap[selectId]; const sel=document.getElementById(selectId); const inp=cfg&&document.getElementById(cfg.input);
  if(!sel||!inp||inp.dataset.bound) return; inp.dataset.bound='1';
  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toLocaleLowerCase();
    const opts=Array.from(sel.options).slice(1);
    if(!q){ sel.value=''; sel.dispatchEvent(new Event('change',{bubbles:true})); return; }
    const exact=opts.find(o=>o.textContent.trim().toLocaleLowerCase()===q);
    const match=exact || opts.find(o=>o.textContent.trim().toLocaleLowerCase().startsWith(q));
    if(match){
      sel.value=match.value;
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    } else {
      sel.value='';
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    }
  });
  inp.addEventListener('change',()=>{
    const q=inp.value.trim().toLocaleLowerCase();
    const opts=Array.from(sel.options).slice(1);
    const match=opts.find(o=>o.textContent.trim().toLocaleLowerCase()===q) || opts.find(o=>o.textContent.trim().toLocaleLowerCase().startsWith(q));
    if(match){ sel.value=match.value; sel.dispatchEvent(new Event('change',{bubbles:true})); syncSearchFromSelect(selectId); }
  });
  sel.addEventListener('change',()=>syncSearchFromSelect(selectId));
}
function refreshLocationSearchUI(){
  Object.keys(__locationSearchMap).forEach(id=>{ bindLocationSearch(id); populateSearchList(id); syncSearchFromSelect(id); });
}
function setupPhoneCountrySelector(countries){
  const sel=document.getElementById('phoneCountry'); if(!sel) return;
  const current=countrySelect?.value || 'BD';
  const items=(countries||[]).map(c=>({iso:c.iso2||c.isoCode||'',name:c.name||'',emoji:c.emoji||'',code:c.phonecode||c.phone_code||c.phoneCode||c.callingCode||''})).filter(x=>x.iso&&x.name);
  sel.innerHTML='';
  items.sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{
    const o=document.createElement('option'); o.value=c.iso; o.dataset.phonecode=String(c.code||'').replace(/^\+/,''); o.textContent=(c.emoji?(c.emoji+' '):'')+c.name+(c.code?' (+'+String(c.code).replace(/^\+/,'')+')':''); sel.appendChild(o);
  });
  if(!sel.options.length){ const o=document.createElement('option');o.value='BD';o.dataset.phonecode='880';o.textContent='🇧🇩 Bangladesh (+880)';sel.appendChild(o); }
  sel.value=items.some(x=>x.iso===current)?current:(items.some(x=>x.iso==='BD')?'BD':sel.options[0].value);
  updatePhoneHint();
}
function syncPhoneCountry(countryCode){
  const sel=document.getElementById('phoneCountry'); if(!sel) return;
  const opt=Array.from(sel.options).find(o=>o.value===countryCode); if(opt){ sel.value=countryCode; updatePhoneHint(); }
}
function updatePhoneHint(){
  const sel=document.getElementById('phoneCountry'); const hint=document.getElementById('phoneHint');
  if(!sel||!hint) return;
  const opt=sel.options[sel.selectedIndex]; const code=opt?.dataset.phonecode||'';
  hint.textContent=code ? 'দেশ অনুযায়ী country code: +'+code+' — নম্বরটি international format-এ লিখুন।' : 'দেশ অনুযায়ী আন্তর্জাতিক মোবাইল নম্বর লিখুন।';
}
const __phoneCountryEl=document.getElementById('phoneCountry');
if(__phoneCountryEl){
  __phoneCountryEl.addEventListener('change',()=>{
    updatePhoneHint();
    if(countrySelect && countrySelect.value!==__phoneCountryEl.value){
      countrySelect.value=__phoneCountryEl.value;
      countrySelect.dispatchEvent(new Event('change',{bubbles:true}));
    }
  });
}
['country','division','district'].forEach(bindLocationSearch);

function clearUpazilaSuggestions(message){
  upazilaList.innerHTML = '';
  upazilaInput.value = '';
  upazilaInput.placeholder = message || 'থানা / উপজেলা / Locality লিখুন';
}

function fillUpazilaSuggestions(list){
  upazilaList.innerHTML = '';
  (list || []).forEach(name=>{
    const opt = document.createElement('option');
    opt.value = name;
    upazilaList.appendChild(opt);
  });
  upazilaInput.placeholder = list && list.length
    ? 'উপজেলা নির্বাচন করুন বা লিখুন'
    : 'থানা / উপজেলা / Locality লিখুন';
}

function addBangladeshDivisions(){
  setSelectOptions(divisionSelect, DIVISIONS.map(d=>({value:d.id,text:d.name})), 'বিভাগ নির্বাচন করুন');
  divisionSelect.disabled = false;
  districtSelect.disabled = true;
  setSelectOptions(districtSelect, [], 'প্রথমে বিভাগ নির্বাচন করুন');
  clearUpazilaSuggestions('প্রথমে জেলা নির্বাচন করুন');
}

function addGlobalStates(states){
  __globalStates = states || [];
  const items = __globalStates.map(s=>({value:s.iso2 || s.isoCode || s.id, text:s.name}));
  if(items.length){
    setSelectOptions(divisionSelect, items, 'State / Province / Region নির্বাচন করুন');
    divisionSelect.disabled = false;
  } else {
    setSelectOptions(divisionSelect, [{value:'__none__',text:'State / Province নেই'}], 'State / Province / Region নির্বাচন করুন');
    divisionSelect.disabled = false;
  }
  districtSelect.disabled = true;
  setSelectOptions(districtSelect, [], 'প্রথমে State / Province নির্বাচন করুন');
  clearUpazilaSuggestions('থানা / Locality / County লিখুন');
}

async function loadCountryStateCityLibrary(){
  if(__CSC) return __CSC;
  if(__locationLoadPromise) return __locationLoadPromise;
  __locationLoadPromise = import('https://cdn.jsdelivr.net/npm/@countrystatecity/countries-browser@1.0.4/+esm')
    .then(mod=>{ __CSC = mod; return mod; })
    .catch(err=>{ __locationLoadPromise = null; throw err; });
  return __locationLoadPromise;
}

async function loadGlobalCountries(){
  if(countrySelect.options.length > 1 && !countrySelect.disabled) return;
  try{
    const csc = await loadCountryStateCityLibrary();
    const countries = await csc.getCountries();
    const items = (countries || []).map(c=>({
      value: c.iso2 || c.isoCode,
      text: (c.emoji ? c.emoji + ' ' : '') + c.name
    })).sort((a,b)=>a.text.localeCompare(b.text));
    setSelectOptions(countrySelect, items, 'দেশ নির্বাচন করুন');
    setupPhoneCountrySelector(countries || []);
    countrySelect.disabled = false;
    const countrySearchEl = document.getElementById('countrySearch');
    if(countrySearchEl) countrySearchEl.disabled = false;
    // বাংলাদেশের ব্যবহারকারীর আগের অভিজ্ঞতা বজায় রাখতে বাংলাদেশকে ডিফল্ট রাখা হচ্ছে।
    if((countries || []).some(c => (c.iso2 || c.isoCode) === 'BD')){
      countrySelect.value = 'BD';
      syncSearchFromSelect('country');
      syncPhoneCountry('BD');
      await handleCountryChange();
    }
  }catch(err){
    countrySelect.innerHTML = '<option value="">দেশের তালিকা লোড হয়নি — আবার চেষ্টা করুন</option>';
    countrySelect.disabled = true;
    const countrySearchEl = document.getElementById('countrySearch');
    if(countrySearchEl) countrySearchEl.disabled = true;
    divisionSelect.disabled = true;
    districtSelect.disabled = true;
    clearUpazilaSuggestions('দেশ নির্বাচন করার পর লিখুন');
    console.warn('Country/State/City data load failed:', err);
  }
}

async function handleCountryChange(){
  const requestToken = ++__locationChangeToken;
  const countryCode = countrySelect.value;
  syncSearchFromSelect('country');
  syncPhoneCountry(countryCode);
  __globalStates = [];
  __globalCities = [];
  divisionSelect.disabled = true;
  districtSelect.disabled = true;
  setSelectOptions(divisionSelect, [], 'লোকেশন লোড হচ্ছে…');
  setSelectOptions(districtSelect, [], 'প্রথমে বিভাগ / State নির্বাচন করুন');
  clearUpazilaSuggestions('থানা / Locality লিখুন');

  if(!countryCode) return;

  if(countryCode === 'BD'){
    addBangladeshDivisions();
    return;
  }

  try{
    const csc = await loadCountryStateCityLibrary();
    const states = await csc.getStatesOfCountry(countryCode);
    if(requestToken !== __locationChangeToken || countrySelect.value !== countryCode) return;
    addGlobalStates(states || []);
    if(!(states || []).length){
      __globalCities = await csc.getCitiesOfCountry(countryCode);
      if(requestToken !== __locationChangeToken || countrySelect.value !== countryCode) return;
      const items = (__globalCities || []).map(c=>({value:String(c.id ?? c.name), text:c.name}));
      setSelectOptions(districtSelect, items, 'City / District নির্বাচন করুন');
      districtSelect.disabled = false;
    }
  }catch(err){
    divisionSelect.disabled = true;
    districtSelect.disabled = true;
    setSelectOptions(divisionSelect, [], 'লোকেশন ডেটা লোড হয়নি');
    setSelectOptions(districtSelect, [], 'লোকেশন ডেটা লোড হয়নি');
    console.warn('State data load failed:', err);
  }
}

countrySelect.addEventListener('change', ()=>{ handleCountryChange(); });

function loadDivisions(){
  // Country-State-City data is loaded only for the address step, keeping the first screen fast.
  loadGlobalCountries();
}
afterFirstPaint(loadGlobalCountries, 1800);

divisionSelect.addEventListener('change', async ()=>{
  const requestToken = ++__locationChangeToken;
  const countryCode = countrySelect.value;
  const divCode = divisionSelect.value;
  districtSelect.disabled = true;
  setSelectOptions(districtSelect, [], 'জেলা / City লোড হচ্ছে…');
  clearUpazilaSuggestions('থানা / Locality লিখুন');
  if(!countryCode || !divCode) return;

  if(countryCode === 'BD'){
    const list = DISTRICTS[divCode] || [];
    setSelectOptions(districtSelect, list.map(name=>({value:name,text:name})), 'জেলা নির্বাচন করুন');
    districtSelect.disabled = false;
    return;
  }

  if(divCode === '__none__'){
    try{
      const csc = await loadCountryStateCityLibrary();
      __globalCities = await csc.getCitiesOfCountry(countryCode);
      if(requestToken !== __locationChangeToken || countrySelect.value !== countryCode) return;
      const items = (__globalCities || []).map(c=>({value:String(c.id ?? c.name),text:c.name})).filter(x=>x.text);
      setSelectOptions(districtSelect, items, 'City / District নির্বাচন করুন');
      districtSelect.disabled = false;
    }catch(err){
      // Even if the external service fails, keep the next required field usable.
      setSelectOptions(districtSelect, [{value:divCode,text:divCode}], 'City / District নির্বাচন করুন');
      districtSelect.disabled = false;
      console.warn('Country cities load failed:', err);
    }
    return;
  }

  // Foreign countries: make the next required field usable immediately.
  // This is important for cases such as UK -> London, where the API can
  // return no city records for a State/Province that is itself a city/region.
  const stateName = (divisionSelect.options[divisionSelect.selectedIndex]?.text || '')
    .replace(/^[^\w\u0980-\u09FF]+/u, '')
    .trim();
  const knownFallback = GLOBAL_STATE_CITY_FALLBACK[countryCode]?.[stateName] || [];
  // The selected State/Province itself must also be a selectable City/District.
  // Example: UK -> London should allow selecting London directly before any
  // London boroughs returned by the API.
  const immediateFallback = stateName
    ? [stateName, ...knownFallback.filter(name => String(name).trim().toLowerCase() !== stateName.toLowerCase())]
    : knownFallback.slice();
  if(immediateFallback.length){
    setSelectOptions(districtSelect, immediateFallback.map(name=>({value:name,text:name})), 'City / District নির্বাচন করুন');
    districtSelect.disabled = false;
  }

  try{
    const csc = await loadCountryStateCityLibrary();
    const cities = await csc.getCitiesOfState(countryCode, divCode);
    if(requestToken !== __locationChangeToken || countrySelect.value !== countryCode) return;
    __globalCities = cities || [];

    const apiItems = __globalCities.map(c=>({
      value:String(c.id ?? c.name),
      text:String(c.name ?? '')
    })).filter(x=>x.text.trim());

    // Prefer real API cities when available. Otherwise retain the fallback
    // already placed above, so the select can never be left empty.
    if(apiItems.length){
      const mergedItems = [
        ...(stateName ? [{value:stateName, text:stateName}] : []),
        ...apiItems.filter(item => !stateName || item.text.trim().toLowerCase() !== stateName.toLowerCase())
      ];
      setSelectOptions(districtSelect, mergedItems, 'City / District নির্বাচন করুন');
    } else if(immediateFallback.length){
      setSelectOptions(districtSelect, immediateFallback.map(name=>({value:name,text:name})), 'City / District নির্বাচন করুন');
    } else {
      setSelectOptions(districtSelect, [{value:stateName,text:stateName}], 'City / District নির্বাচন করুন');
    }
    districtSelect.disabled = false;
  }catch(err){
    if(immediateFallback.length){
      setSelectOptions(districtSelect, immediateFallback.map(name=>({value:name,text:name})), 'City / District নির্বাচন করুন');
      districtSelect.disabled = false;
    } else if(stateName){
      setSelectOptions(districtSelect, [{value:stateName,text:stateName}], 'City / District নির্বাচন করুন');
      districtSelect.disabled = false;
    }
    console.warn('State cities load failed:', err);
  }

});

// State -> City/District fallback. API ব্যর্থ হলেও নির্বাচিত State-এর পরের ঘর খালি থাকবে না।
const GLOBAL_STATE_CITY_FALLBACK = {
  GB: {
    London: [
      'City of London','Westminster','Camden','Greenwich','Hackney',
      'Hammersmith and Fulham','Haringey','Islington','Kensington and Chelsea',
      'Lambeth','Lewisham','Newham','Southwark','Tower Hamlets',
      'Waltham Forest','Wandsworth','Brent','Bromley','Croydon','Ealing',
      'Enfield','Harrow','Havering','Hillingdon','Hounslow',
      'Kingston upon Thames','Merton','Redbridge','Richmond upon Thames',
      'Sutton','Barnet','Barking and Dagenham','Bexley'
    ]
  }
};

const GLOBAL_LOCALITY_SUGGESTIONS = {
  GB: {
    'London': ['City of London','Westminster','Camden','Greenwich','Hackney','Hammersmith and Fulham','Haringey','Islington','Kensington and Chelsea','Lambeth','Lewisham','Newham','Southwark','Tower Hamlets','Waltham Forest','Wandsworth','Brent','Bromley','Croydon','Ealing','Enfield','Harrow','Havering','Hillingdon','Hounslow','Kingston upon Thames','Merton','Redbridge','Richmond upon Thames','Sutton','Barnet','Barking and Dagenham','Bexley','Hillingdon','Waltham Forest']
  }
};

districtSelect.addEventListener('change', ()=>{
  const countryCode = countrySelect.value;
  const distName = districtSelect.options[districtSelect.selectedIndex]?.text || '';
  if(countryCode === 'BD'){
    fillUpazilaSuggestions(UPAZILAS[distName] || []);
  } else {
    const suggestions = GLOBAL_LOCALITY_SUGGESTIONS[countryCode]?.[distName] || [];
    if(suggestions.length){
      fillUpazilaSuggestions(suggestions);
    } else {
      clearUpazilaSuggestions('থানা / Locality / County লিখুন');
    }
  }
});

// ============ FORM SUBMIT ============
const form = document.getElementById('regForm');
const statusBox = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');
const downloadBtn = document.getElementById('downloadBtn');

// ============ আবেদন নম্বর কপি বাটন (রশিদ ডাউনলোড না করলেও নম্বর হাতে থাকুক) ============
const appIdCopyBtn = document.getElementById('appIdCopyBtn');
if(appIdCopyBtn){
  appIdCopyBtn.addEventListener('click', async ()=>{
    const val = document.getElementById('appIdDisplayValue').textContent.trim();
    if(!val) return;
    const showCopied = () => {
      appIdCopyBtn.textContent = '✓ কপি হয়েছে';
      setTimeout(()=>{ appIdCopyBtn.textContent = '📋 কপি করুন'; }, 2000);
    };
    try{
      await navigator.clipboard.writeText(val);
      showCopied();
    }catch(err){
      // পুরনো ব্রাউজারে clipboard API না থাকলে ফলব্যাক
      const ta = document.createElement('textarea');
      ta.value = val;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); showCopied(); }catch(e){ /* নীরবে ব্যর্থ */ }
      document.body.removeChild(ta);
    }
  });
}

// ============ জন্ম তারিখ: বয়স কমপক্ষে ১৩ বছর ============
const dobInput = document.getElementById('dob');
(function setDobLimits(){
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
  const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
  const fmt = (d) => d.toISOString().split('T')[0];
  dobInput.max = fmt(maxDate);
  dobInput.min = fmt(minDate);
})();

function calcAge(dobStr){
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if(m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// ============ ছবি প্রিভিউ ============
const photoPreviewEl = document.getElementById('photoPreview');
document.getElementById('applicantPhoto').addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f){ photoPreviewEl.classList.remove('show'); return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
    photoPreviewEl.src = ev.target.result;
    photoPreviewEl.classList.add('show');
  };
  reader.readAsDataURL(f);
});

function resetFormAfterDownload(){
  form.reset();
  districtSelect.disabled = true;
  setSelectOptions(districtSelect, [], 'প্রথমে বিভাগ / State নির্বাচন করুন');
  clearUpazilaSuggestions('থানা / উপজেলা / Locality লিখুন');
  if(countrySelect && countrySelect.options.length){
    countrySelect.value = 'BD';
    handleCountryChange();
  }
  downloadBtn.classList.remove('show');
  document.getElementById('whatsappNote').classList.remove('show');
  const appIdDisplayResetEl = document.getElementById('appIdDisplay');
  if(appIdDisplayResetEl) appIdDisplayResetEl.classList.remove('show');
  statusBox.className = 'status';
  photoPreviewEl.classList.remove('show');
  newCaptcha(true);
  resetToStep1();
}

downloadBtn.addEventListener('click', async ()=>{
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'তৈরি হচ্ছে...';
  try{
    await ensureReceiptLibraries();
    const receiptEl = document.getElementById('receipt');
    const canvas = await html2canvas(receiptEl, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

    const pdfBlob = pdf.output('blob');
    const fileName = 'আবেদন-রশিদ.pdf';

    // ১. ফোনে PDF ডাউনলোড করুন
    pdf.save(fileName);

    // ২. সম্ভব হলে মোবাইলের নিজস্ব শেয়ার মেনু খুলুন, যাতে এক ট্যাপে WhatsApp-এ পাঠানো যায়
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if(navigator.canShare && navigator.canShare({ files: [pdfFile] })){
      try{
        await navigator.share({
          files: [pdfFile],
          title: 'আবেদন রশিদ',
          text: 'আমার রেজিস্ট্রেশন আবেদন রশিদ'
        });
      }catch(shareErr){
        // ব্যবহারকারী শেয়ার মেনু বাতিল করলে কিছু করার দরকার নেই
        console.log('Share cancelled or unsupported', shareErr);
      }
    }

    // ডাউনলোড সম্পন্ন হয়েছে — এবার ফর্মটা পরের আবেদনকারীর জন্য রিসেট করা হচ্ছে
    resetFormAfterDownload();
  }catch(err){
    console.error(err);
    alert('রশিদ ডাউনলোড করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।');
  }finally{
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'রশিদ ডাউনলোড করুন (PDF)';
  }
});

const checkBtn = document.getElementById('checkBtn');
const checkResult = document.getElementById('checkResult');

// ============ আবেদনের অবস্থা ধাপে ধাপে (ভিজ্যুয়াল) দেখানো ============
function renderStatusSteps(status){
  if(status === 'বাতিল'){
    return '<div class="cr-steps cr-steps-cancelled"><p>❌ এই আবেদনটি বাতিল করা হয়েছে। বিস্তারিত জানতে যোগাযোগ করুন।</p></div>';
  }
  const steps = [
    { key: 'অপেক্ষমান', label: 'অপেক্ষমান' },
    { key: 'কাজ চলছে', label: 'কাজ চলছে' },
    { key: 'সম্পন্ন', label: 'সম্পন্ন' }
  ];
  const currentIndex = steps.findIndex(s => s.key === status);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;
  const stepsHtml = steps.map((s, i) => {
    let cls = 'cr-step';
    if(i < activeIndex) cls += ' done';
    else if(i === activeIndex) cls += ' active';
    return '<div class="' + cls + '"><span class="cr-step-dot"></span><span class="cr-step-label">' + s.label + '</span></div>';
  }).join('<div class="cr-step-line"></div>');
  return '<div class="cr-steps">' + stepsHtml + '</div>';
}

checkBtn.addEventListener('click', async ()=>{
  const id = document.getElementById('checkId').value.trim();
  if(!id){
    checkResult.className = 'check-result show';
    checkResult.innerHTML = '<div class="cr-box cr-notfound">অনুগ্রহ করে আপনার আবেদন নম্বর লিখুন।</div>';
    return;
  }
  checkBtn.disabled = true;
  checkBtn.textContent = 'যাচাই করা হচ্ছে...';
  checkResult.className = 'check-result';
  try{
    const res = await fetch(SCRIPT_URL + '?action=status&id=' + encodeURIComponent(id));
    const data = await res.json();
    checkResult.className = 'check-result show';
    if(data.found){
      lastCheckedData = { id: id, name: data.name, date: data.date, status: data.status };
      checkResult.innerHTML =
        '<div class="cr-box cr-found">' +
        'নাম: <strong>' + blogEscape(data.name) + '</strong><br>' +
        'আবেদনের তারিখ: ' + blogEscape(data.date) + '<br>' +
        'বর্তমান অবস্থা: <span class="cr-status-badge">' + blogEscape(data.status) + '</span>' +
        renderStatusSteps(data.status) +
        '<button onclick="printStatusResult()" style="margin-top:12px; padding:8px 14px; border:1px solid var(--forest); border-radius:6px; background:transparent; color:var(--forest); font-size:13px; cursor:pointer;">🖨️ প্রিন্ট / সংরক্ষণ করুন</button>' +
        '</div>';
    }else{
      lastCheckedData = null;
      checkResult.innerHTML = '<div class="cr-box cr-notfound">এই নম্বরে কোনো আবেদন পাওয়া যায়নি। নম্বরটি আবার যাচাই করুন।</div>';
    }
  }catch(err){
    console.error(err);
    checkResult.className = 'check-result show';
    checkResult.innerHTML = '<div class="cr-box cr-notfound">যাচাই করতে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।</div>';
  }finally{
    checkBtn.disabled = false;
    checkBtn.textContent = 'যাচাই করুন';
  }
});

// ============ আবেদনের অবস্থা প্রিন্ট/PDF হিসেবে সংরক্ষণের জন্য রিসিট তৈরি ============
let lastCheckedData = null;
function printStatusResult(){
  if(!lastCheckedData) return;
  const d = lastCheckedData;
  const w = window.open('', '_blank', 'width=420,height=600');
  if(!w) { alert('পপ-আপ ব্লক করা আছে, অনুগ্রহ করে অ্যালাউ করুন।'); return; }
  const safeName = blogEscape(d.name);
  w.document.write(
    '<html><head><meta charset="utf-8"><title>আবেদনের অবস্থা - ' + blogEscape(d.id) + '</title>' +
    '<style>' +
    'body{font-family:"Hind Siliguri",Arial,sans-serif; padding:24px; color:#1f2d24;}' +
    'h2{color:#1f5f3f; margin-bottom:4px;}' +
    '.row{margin:10px 0; font-size:14.5px;}' +
    '.label{color:#5a6b60; font-size:12px;}' +
    '.badge{display:inline-block; padding:4px 12px; border-radius:999px; background:#1f5f3f; color:#fff; font-size:13px; margin-top:2px;}' +
    'hr{border:none; border-top:1px solid #ddd; margin:16px 0;}' +
    '.foot{font-size:11.5px; color:#8a9690; margin-top:20px;}' +
    '</style>' +
    '</head><body>' +
    '<h2>আবেদনের অবস্থা রিসিট</h2>' +
    '<div class="foot">' + window.location.origin + window.location.pathname + '</div><hr>' +
    '<div class="row"><div class="label">আবেদন নম্বর</div>' + blogEscape(d.id) + '</div>' +
    '<div class="row"><div class="label">নাম</div>' + safeName + '</div>' +
    '<div class="row"><div class="label">আবেদনের তারিখ</div>' + blogEscape(d.date) + '</div>' +
    '<div class="row"><div class="label">বর্তমান অবস্থা</div><span class="badge">' + blogEscape(d.status) + '</span></div>' +
    '<hr><div class="foot">প্রিন্ট করার তারিখ: ' + new Date().toLocaleString('bn-BD') + '</div>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
  setTimeout(()=>{ w.print(); }, 300);
}

function showStatus(type, msg){
  statusBox.className = 'status show ' + type;
  statusBox.textContent = msg;
}

function fileToBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============ ছবি কমপ্রেশন (ধীরগতির নেটে দ্রুত সাবমিটের জন্য) ============
function compressImage(file, maxDim, quality){
  return new Promise((resolve, reject)=>{
    if(!file.type.startsWith('image/')){ resolve({ dataUrl: null, blob: file }); return; }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e)=>{
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w > maxDim || h > maxDim){
          if(w > h){ h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality || 0.75);
        resolve({ dataUrl: dataUrl });
      };
      img.onerror = ()=> resolve({ dataUrl: e.target.result });
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============ CAPTCHA ============
// captchaA/captchaB সার্ভারে পাঠানো হয় যাতে Code.gs নিজে যোগফল মিলিয়ে যাচাই
// করতে পারে — শুধু ব্রাউজারের JS-এর উপর নির্ভর করলে সরাসরি API কল করে এটা
// এড়িয়ে যাওয়া সম্ভব হতো।
let captchaAnswer = -1;
let captchaA = 0;
let captchaB = 0;
let captchaToken = '';
let captchaLoading = false;
let captchaSeq = 0;
// সার্ভার থেকে সই-করা (signed) ক্যাপচা আনা হয়, যাতে সার্ভার নিজে উত্তর যাচাই করতে পারে।
// সার্ভার সাড়া না দিলে (যেমন পুরনো ব্যাকএন্ড) আগের মতো ব্রাউজারেই প্রশ্ন বানানো হয়।
function requestServerCaptcha(apply){
  const fallback = function(){
    apply(Math.floor(Math.random() * 8) + 1, Math.floor(Math.random() * 8) + 1, '');
  };
  try{
    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 15000);
    fetch(SCRIPT_URL + '?action=getCaptcha&_=' + Date.now(), { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function(r){ return r.json(); })
      .then(function(d){
        clearTimeout(timer);
        if(d && d.success && d.token && Number(d.a) > 0 && Number(d.b) > 0){ apply(Number(d.a), Number(d.b), String(d.token)); }
        else { fallback(); }
      })
      .catch(function(){ clearTimeout(timer); fallback(); });
  }catch(e){ fallback(); }
}
// lazy = true হলে এখনই সার্ভারকে ডাকা হয় না (ফর্মের ৩য় ধাপে গেলে তখন আনা হয়)
function newCaptcha(lazy){
  const seq = ++captchaSeq;
  const qEl = document.getElementById('captchaQ');
  const aEl = document.getElementById('captchaAns');
  captchaAnswer = -1; captchaToken = ''; captchaA = 0; captchaB = 0;
  if(aEl) aEl.value = '';
  if(lazy){ captchaLoading = false; if(qEl) qEl.textContent = '… ='; return; }
  captchaLoading = true;
  if(qEl) qEl.textContent = '… =';
  requestServerCaptcha(function(a, b, token){
    if(seq !== captchaSeq) return;
    captchaLoading = false;
    captchaA = a; captchaB = b; captchaAnswer = a + b; captchaToken = token;
    if(qEl) qEl.textContent = a + ' + ' + b + ' =';
  });
}
function ensureCaptcha(){
  if(captchaToken || captchaLoading || captchaAnswer !== -1) return;
  newCaptcha();
}
newCaptcha(true);

// ============ ধাপে ধাপে ফর্ম নেভিগেশন ============
const stepFields = {
  1: ['fullName', 'phone', 'applicantPhoto', 'platform', 'idLink', 'dob', 'gender', 'email'],
  2: ['country', 'division', 'district', 'upazila', 'areaDetail', 'comment', 'screenshot'],
  3: ['paymentMethod', 'txnId', 'senderNumber', 'captchaAns']
};

function validateStep(stepNum){
  const fields = stepFields[stepNum];
  for(const id of fields){
    const el = document.getElementById(id);
    if(!el) continue;
    if(id === 'paymentMethod' && !el.value){
      showStatus('err', 'অনুগ্রহ করে উপরের তালিকা থেকে যেকোনো একটি নম্বরের পাশে "কপি" বাটনে ক্লিক করুন — এতে পেমেন্ট মাধ্যম স্বয়ংক্রিয়ভাবে নির্বাচিত হবে।');
      document.querySelector('.fee-methods').scrollIntoView({ behavior:'smooth', block:'center' });
      return false;
    } else if(el.type === 'file'){
      if(!el.files || el.files.length === 0){
        el.reportValidity ? el.reportValidity() : alert('সব প্রয়োজনীয় ঘর পূরণ করুন।');
        el.focus();
        return false;
      }
    } else if(!el.value || !el.value.trim()){
      el.reportValidity ? el.reportValidity() : alert('সব প্রয়োজনীয় ঘর পূরণ করুন।');
      el.focus();
      return false;
    } else if(el.checkValidity && !el.checkValidity()){
      el.reportValidity();
      el.focus();
      return false;
    }
  }
  if(stepNum === 1){
    const dobVal = document.getElementById('dob').value;
    if(dobVal && calcAge(dobVal) < 13){
      showStatus('err', 'দুঃখিত, আবেদন করতে হলে বয়স কমপক্ষে ১৩ বছর হতে হবে।');
      return false;
    }
  }
  return true;
}

function goToStep(stepNum){
  const current = document.querySelector('.form-step:not([style*="display: none"])');
  const currentNum = current ? parseInt(current.id.replace('step',''), 10) : 1;

  if(stepNum > currentNum && !validateStep(currentNum)){
    return;
  }

  document.querySelectorAll('.form-step').forEach(s => s.style.display = 'none');
  document.getElementById('step' + stepNum).style.display = 'block';
  if(stepNum === 2 && countrySelect.options.length <= 1) loadGlobalCountries();
  if(stepNum === 3) ensureCaptcha();

  for(let i = 1; i <= 3; i++){
    const dot = document.getElementById('stepDot' + i);
    dot.classList.remove('active', 'done');
    if(i < stepNum) dot.classList.add('done');
    else if(i === stepNum) dot.classList.add('active');
  }

  window.scrollTo({ top: document.getElementById('regForm').offsetTop - 20, behavior: 'smooth' });
}

function resetToStep1(){
  goToStep(1);
}

// ============ FAQ ============
function toggleFaq(el){
  el.parentElement.classList.toggle('open');
}

const paymentSelect = document.getElementById('paymentMethod');

// ============ রিয়েল-টাইম ভ্যালিডেশন (ফোন/ইমেইল) ============
function attachLiveValidation(id, testFn, errorMsg){
  const el = document.getElementById(id);
  if(!el) return;
  const errEl = document.createElement('div');
  errEl.className = 'field-error';
  errEl.textContent = errorMsg;
  el.insertAdjacentElement('afterend', errEl);

  function check(){
    const val = el.value.trim();
    if(!val){
      el.classList.remove('invalid', 'valid-ok');
      errEl.classList.remove('show');
      return;
    }
    const ok = testFn(val);
    el.classList.toggle('invalid', !ok);
    el.classList.toggle('valid-ok', ok);
    errEl.classList.toggle('show', !ok);
  }
  el.addEventListener('input', check);
  el.addEventListener('blur', check);
}

const internationalPhonePattern = /^\+?[0-9\s().-]{7,25}$/;
attachLiveValidation('phone', v => internationalPhonePattern.test(v), 'সঠিক আন্তর্জাতিক মোবাইল নম্বর দিন (যেমনঃ +8801712345678)।');
attachLiveValidation('senderNumber', v => internationalPhonePattern.test(v), 'সঠিক আন্তর্জাতিক নম্বর দিন (যেমনঃ +8801712345678)।');
attachLiveValidation('email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'সঠিক ইমেইল ঠিকানা দিন (যেমনঃ example@gmail.com)।');
attachLiveValidation('txnId', v => v.replace(/\s/g,'').length >= 6, 'ট্রানজেকশন আইডি কমপক্ষে ৬ ক্যারেক্টারের হতে হবে।');

// ============ উপরে ফিরুন বাটন ============
const footerYearEl = document.getElementById('footerYear');
if(footerYearEl){ footerYearEl.textContent = new Date().getFullYear(); }
const backToTopBtn = document.getElementById('backToTopBtn');
if(backToTopBtn){
  window.addEventListener('scroll', ()=>{
    backToTopBtn.classList.toggle('show', window.scrollY > 420);
  }, { passive: true });
  backToTopBtn.addEventListener('click', ()=>{
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ============ ড্রাফট অটো-সেভ ============
const DRAFT_KEY = 'fbFormDraftV1';
const draftFieldIds = ['fullName','phone','platform','idLink','dob','gender','email','country','division','district','upazila','areaDetail','comment','paymentMethod','txnId','senderNumber'];

function saveDraft(){
  const draft = {};
  draftFieldIds.forEach(id=>{
    const el = document.getElementById(id);
    if(el) draft[id] = el.value;
  });
  try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }catch(err){}
}

let draftSaveTimer = null;
function scheduleDraftSave(){
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(saveDraft, 400);
}

function clearDraft(){
  try{ localStorage.removeItem(DRAFT_KEY); }catch(err){}
  const banner = document.getElementById('draftBanner');
  if(banner) banner.style.display = 'none';
}

function applyRegFormView(show, shouldScroll){
  if(show){ try{ reportFormStage(1); }catch(err){} }
  const section = document.getElementById('mainFormSection');
  const landingTop = document.getElementById('landingTop');
  const landingBottom = document.getElementById('landingBottom');
  if(section){ section.style.display = show ? 'block' : 'none'; }
  if(landingTop){ landingTop.style.display = show ? 'none' : ''; }
  if(landingBottom){ landingBottom.style.display = show ? 'none' : ''; }
  if(shouldScroll !== false){
    window.scrollTo({ top:0, behavior:'smooth' });
  }
}

// রেজিস্ট্রেশন ফর্ম খোলা/বন্ধ করার সময় URL-এ ?form=1 বসানো/সরানো হয় যাতে রিফ্রেশ করলেও
// ব্যবহারকারী যেখানে ছিলেন সেখানেই থাকেন, হোমে ফিরে না যান।
function revealRegForm(shouldScroll){
  applyRegFormView(true, shouldScroll);
  try{
    const params = new URLSearchParams(window.location.search);
    if(params.get('form') !== '1'){
      params.set('form', '1');
      const qs = params.toString();
      history.pushState({form:1}, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    }
  }catch(err){}
}

function hideRegForm(){
  applyRegFormView(false);
  try{
    const params = new URLSearchParams(window.location.search);
    if(params.has('form')){
      params.delete('form');
      const qs = params.toString();
      history.pushState({}, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    }
  }catch(err){}
}

window.addEventListener('popstate', function(){
  const params = new URLSearchParams(window.location.search);
  applyRegFormView(params.get('form') === '1', false);
});

// ============ URL প্যারামিটার (?form=1) দিয়ে সরাসরি রেজিস্ট্রেশন ফর্ম ওপেন করার রাউটার ============
// এটা থাকলে https://alamingazi533.github.io/?form=1 লিংকে ঢুকলেই
// ল্যান্ডিং পেজ না দেখিয়ে সরাসরি রেজিস্ট্রেশন ফর্ম দেখানো হবে।
(function initFormRouter(){
  try{
    const params = new URLSearchParams(window.location.search);
    if(params.get('form') === '1'){
      revealRegForm(false);
    }
  }catch(err){}
})();

async function restoreDraft(){
  let draft = null;
  try{ draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); }catch(err){ draft = null; }
  if(!draft) return;

  const hasData = Object.values(draft).some(v => v && String(v).trim());
  if(!hasData) return;

  ['fullName','phone','platform','idLink','dob','gender','email','areaDetail','comment','txnId','senderNumber'].forEach(id=>{
    if(draft[id]) document.getElementById(id).value = draft[id];
  });

  if(draft.paymentMethod){
    paymentSelect.value = draft.paymentMethod;
    markFeeMethodSelected(draft.paymentMethod);
  }

  try{
    if(countrySelect.options.length <= 1) loadGlobalCountries();
    if(__locationLoadPromise) await __locationLoadPromise;
    const countryOption = Array.from(countrySelect.options).find(o => String(o.value) === String(draft.country));
    if(countryOption) countrySelect.value = countryOption.value;
    else if(!draft.country && Array.from(countrySelect.options).some(o=>o.value==='BD')) countrySelect.value = 'BD';

    if(countrySelect.value){
      await handleCountryChange();
      if(draft.division){
        const divOption = Array.from(divisionSelect.options).find(o=>String(o.value) === String(draft.division))
          || Array.from(divisionSelect.options).find(o=>String(o.textContent) === String(draft.division));
        if(divOption) divisionSelect.value = divOption.value;
        divisionSelect.dispatchEvent(new Event('change'));
        // Wait briefly for country/state city data to populate.
        await new Promise(r=>setTimeout(r,120));
        if(draft.district){
          const distOption = Array.from(districtSelect.options).find(o=>String(o.value) === String(draft.district))
            || Array.from(districtSelect.options).find(o=>String(o.textContent) === String(draft.district));
          if(distOption) districtSelect.value = distOption.value;
          districtSelect.dispatchEvent(new Event('change'));
        }
        if(draft.upazila) upazilaInput.value = draft.upazila;
      }
    }
  }catch(err){ console.warn('Draft location restore failed:', err); }

  const banner = document.getElementById('draftBanner');
  if(banner) banner.style.display = 'flex';
}

draftFieldIds.forEach(id=>{
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('input', scheduleDraftSave);
  if(el.tagName === 'SELECT') el.addEventListener('change', scheduleDraftSave);
});

restoreDraft();

const clearDraftBtn = document.getElementById('clearDraftBtn');
if(clearDraftBtn){
  clearDraftBtn.addEventListener('click', ()=>{
    if(confirm('আপনার সংরক্ষিত অসম্পূর্ণ তথ্য মুছে ফেলা হবে, আপনি কি নিশ্চিত?')){
      clearDraft();
      location.reload();
    }
  });
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();

  // ============ হানিপট চেক (বট প্রতিরোধ) ============
  // এই ফিল্ডটা মানুষের কাছে অদৃশ্য; শুধু বট এটা পূরণ করে। পূরণ থাকলে
  // নীরবে বাতিল করা হয়, কোনো এরর দেখানো হয় না যাতে বট বুঝতে না পারে।
  const hpField = document.getElementById('hpField');
  if(hpField && hpField.value.trim()){
    return;
  }

  if(!document.getElementById('paymentMethod').value){
    showStatus('err', 'অনুগ্রহ করে উপরের তালিকা থেকে যেকোনো একটি নম্বরের পাশে "কপি" বাটনে ক্লিক করুন — এতে পেমেন্ট মাধ্যম স্বয়ংক্রিয়ভাবে নির্বাচিত হবে।');
    document.querySelector('.fee-methods').scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  if(!document.getElementById('confirmCheck').checked){
    showStatus('err', 'সকল তথ্য সঠিক থাকলে চেক বক্সে ক্লিক করুন।');
    return;
  }

  if(captchaAnswer < 0 || parseInt(document.getElementById('captchaAns').value.trim(), 10) !== captchaAnswer){
    showStatus('err', 'যাচাই ঘরের উত্তরটি সঠিক নয়, আবার চেষ্টা করুন।');
    newCaptcha();
    return;
  }

  if(SCRIPT_URL.includes("PASTE_YOUR")){
    showStatus('err', 'প্রথমে কোডে আপনার Google Apps Script URL বসান।');
    return;
  }

  const dobVal = document.getElementById('dob').value;
  if(!dobVal){
    showStatus('err', 'জন্ম তারিখ দিন।');
    return;
  }
  if(calcAge(dobVal) < 13){
    showStatus('err', 'দুঃখিত, আবেদন করতে হলে বয়স কমপক্ষে ১৩ বছর হতে হবে।');
    return;
  }

  let appId = (function(){ try{ const a = new Uint32Array(1); crypto.getRandomValues(a); return 'APP-' + String(a[0] % 100000000).padStart(8,'0'); }catch(e){ return 'APP-' + Date.now().toString().slice(-8); } })();

  const payload = {
    appId: appId,
    fullName: document.getElementById('fullName').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    dob: document.getElementById('dob').value.trim(),
    gender: document.getElementById('gender').value.trim(),
    email: document.getElementById('email').value.trim(),
    platform: document.getElementById('platform').value.trim(),
    idLink: document.getElementById('idLink').value.trim(),
    country: countrySelect.options[countrySelect.selectedIndex]?.text || '',
    division: divisionSelect.options[divisionSelect.selectedIndex]?.text || '',
    district: districtSelect.options[districtSelect.selectedIndex]?.text || '',
    upazila: upazilaInput.value.trim(),
    areaDetail: document.getElementById('areaDetail').value.trim(),
    comment: document.getElementById('comment').value.trim(),
    paymentMethod: document.getElementById('paymentMethod').value.trim(),
    txnId: document.getElementById('txnId').value.trim(),
    senderNumber: document.getElementById('senderNumber').value.trim(),
    submittedAt: new Date().toISOString(),
    captchaA: captchaA,
    captchaB: captchaB,
    captchaToken: captchaToken,
    captchaAns: document.getElementById('captchaAns').value.trim(),
    hp: hpField ? hpField.value.trim() : '',
    screenshotBase64: '',
    screenshotName: '',
    screenshotType: '',
    photoBase64: '',
    photoName: '',
    photoType: ''
  };

  const photoInput = document.getElementById('applicantPhoto');
  const photoFile = photoInput.files[0];

  const screenshotInput = document.getElementById('screenshot');
  const file = screenshotInput.files[0];

  submitBtn.disabled = true;
  submitBtn.textContent = 'পাঠানো হচ্ছে...';
  showStatus('loading', 'অনুগ্রহ করে অপেক্ষা করুন...');

  try{
    if(photoFile){
      if(photoFile.size > 8 * 1024 * 1024){
        showStatus('err', 'আপনার ছবির সাইজ ৮ এমবি এর কম হতে হবে।');
        submitBtn.disabled = false;
        submitBtn.textContent = 'রেজিস্ট্রেশন সম্পন্ন করুন';
        return;
      }
      showStatus('loading', 'ছবি প্রস্তুত করা হচ্ছে...');
      const compressedPhoto = await compressImage(photoFile, 1000, 0.75);
      payload.photoBase64 = compressedPhoto.dataUrl || await fileToBase64(photoFile);
      payload.photoName = photoFile.name.replace(/\.[^.]+$/, '.jpg');
      payload.photoType = 'image/jpeg';
    }

    if(file){
      if(file.size > 8 * 1024 * 1024){
        showStatus('err', 'ছবির সাইজ ৮ এমবি এর কম হতে হবে।');
        submitBtn.disabled = false;
        submitBtn.textContent = 'রেজিস্ট্রেশন সম্পন্ন করুন';
        return;
      }
      showStatus('loading', 'স্ক্রিনশট প্রস্তুত করা হচ্ছে...');
      const compressedShot = await compressImage(file, 1280, 0.8);
      payload.screenshotBase64 = compressedShot.dataUrl || await fileToBase64(file);
      payload.screenshotName = file.name.replace(/\.[^.]+$/, '.jpg');
      payload.screenshotType = 'image/jpeg';
    }

    showStatus('loading', 'অনুগ্রহ করে অপেক্ষা করুন...');
    const submitRes = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    let submitData = null;
    try { submitData = await submitRes.json(); } catch(parseErr) { submitData = null; }
    if(!submitData || (submitData.status !== 'success' && submitData.status !== 'duplicate' && submitData.status !== 'error')){
      // সার্ভারের উত্তর বোঝা যায়নি — আবেদন সেভ হয়েছে কিনা নিশ্চিত নয়, তাই "সফল" দেখানো হচ্ছে না
      showStatus('err', 'সার্ভার থেকে নিশ্চিত উত্তর পাওয়া যায়নি, তাই আবেদন জমা হয়েছে কিনা জানা যাচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন — আগে জমা হয়ে থাকলে "ইতিমধ্যে জমা হয়েছে" বার্তা দেখাবে।');
      newCaptcha();
      submitBtn.disabled = false;
      submitBtn.textContent = 'রেজিস্ট্রেশন সম্পন্ন করুন';
      return;
    }
    // সার্ভার নতুন আবেদন নম্বর দিলে (নম্বর মিলে গেলে) সেটাই ব্যবহার হবে
    if(submitData.appId && /^APP-\d{8}$/.test(String(submitData.appId))){ appId = String(submitData.appId); payload.appId = appId; }

    if(submitData.status === 'duplicate'){
      showStatus('err', submitData.error || 'এই ট্রানজেকশন আইডি দিয়ে ইতিমধ্যে একটি আবেদন জমা হয়েছে।');
      submitBtn.disabled = false;
      submitBtn.textContent = 'রেজিস্ট্রেশন সম্পন্ন করুন';
      return;
    }

    if(submitData.status === 'error'){
      showStatus('err', submitData.error || 'আবেদন জমা হয়নি, আবার চেষ্টা করুন।');
      newCaptcha();
      submitBtn.disabled = false;
      submitBtn.textContent = 'রেজিস্ট্রেশন সম্পন্ন করুন';
      return;
    }

    showStatus('ok', '✓ রেজিস্ট্রেশন সফল হয়েছে। ধন্যবাদ!');
    if(typeof gtag === 'function'){
      gtag('event', 'registration_submit', { 'event_category': 'engagement', 'event_label': 'application_form' });
    }
    try{ reportFormStage(3); }catch(err){}

    const now = new Date();
    const appIdDisplayEl = document.getElementById('appIdDisplay');
    const appIdDisplayValueEl = document.getElementById('appIdDisplayValue');
    if(appIdDisplayEl && appIdDisplayValueEl){
      appIdDisplayValueEl.textContent = appId;
      appIdDisplayEl.classList.add('show');
    }
    document.getElementById('r-id').textContent = appId;
    document.getElementById('r-date').textContent = now.toLocaleDateString('bn-BD') + ' ' + now.toLocaleTimeString('bn-BD');
    document.getElementById('r-name').textContent = payload.fullName || '-';
    document.getElementById('r-phone').textContent = payload.phone || '-';
    document.getElementById('r-dob').textContent = payload.dob || '-';
    document.getElementById('r-gender').textContent = payload.gender || '-';
    document.getElementById('r-email').textContent = payload.email || '-';
    document.getElementById('r-country').textContent = payload.country || '-';
    document.getElementById('r-division').textContent = payload.division || '-';
    document.getElementById('r-district').textContent = payload.district || '-';
    document.getElementById('r-upazila').textContent = payload.upazila || '-';
    document.getElementById('r-area').textContent = payload.areaDetail || '-';
    document.getElementById('r-comment').textContent = payload.comment || '-';
    document.getElementById('r-payment').textContent = payload.paymentMethod || '-';
    document.getElementById('r-txn').textContent = payload.txnId || '-';
    document.getElementById('r-sender').textContent = payload.senderNumber || '-';
    document.getElementById('r-platform').textContent = payload.platform || '-';
    document.getElementById('r-idlink').textContent = payload.idLink || '-';
    const rPhotoEl = document.getElementById('r-applicant-photo');
    if(payload.photoBase64){
      rPhotoEl.src = payload.photoBase64;
      rPhotoEl.style.display = 'block';
    } else {
      rPhotoEl.style.display = 'none';
    }
    downloadBtn.classList.add('show');
    document.getElementById('whatsappNote').classList.add('show');

    // সাবমিট সফল হওয়ার পর সংখ্যাগুলো আপডেট করা (নতুন আবেদন যোগ হয়েছে)
    loadStats();
    notifyApplicationSuccess(appId);
    linkOneSignalToApplication(appId);
    personalizeWhatsappButton(appId);
    clearDraft();
  }catch(err){
    console.error(err);
    showStatus('err', 'দুঃখিত, পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    newCaptcha();
  }finally{
    submitBtn.disabled = false;
    submitBtn.textContent = 'রেজিস্ট্রেশন সম্পন্ন করুন';
  }
});// ============ রিভিউ সেকশন ============
function renderStars(container, val){
  container.querySelectorAll('span').forEach(s=>{
    s.textContent = parseInt(s.dataset.val,10) <= val ? '★' : '☆';
    s.style.color = parseInt(s.dataset.val,10) <= val ? '#F7B928' : 'var(--muted)';
  });
}

let selectedRating = 0;
const starPicker = document.getElementById('starPicker');
if(starPicker){
  starPicker.querySelectorAll('span').forEach(s=>{
    s.addEventListener('click', ()=>{
      selectedRating = parseInt(s.dataset.val, 10);
      renderStars(starPicker, selectedRating);
    });
  });
}

function toBengaliNumber(n){
  const map = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
  return String(n).split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('');
}

// ============ আসল পরিসংখ্যান (ভিজিট, সমাধান সংখ্যা, গড় রেসপন্স টাইম) ============
function formatResponseDuration(minutes){
  if(!minutes || minutes <= 0) return '—';
  if(minutes < 60){
    return toBengaliNumber(Math.round(minutes)) + ' মিনিট';
  }
  const hours = minutes / 60;
  if(hours < 24){
    const rounded = Math.round(hours * 10) / 10;
    return toBengaliNumber(rounded) + ' ঘণ্টা';
  }
  const days = hours / 24;
  const roundedDays = Math.round(days * 10) / 10;
  return toBengaliNumber(roundedDays) + ' দিন';
}

function renderStats(data){
  if(!data) return;
  const solvedEl = document.getElementById('solvedStatNum');
  const totalAppEl = document.getElementById('totalAppStatNum');
  const ongoingEl = document.getElementById('ongoingStatNum');
  const bigVisitEl = document.getElementById('bigVisitNum');
  const solved = data.solvedCount || 0;
  const totalApp = data.totalApplications || 0;
  const ongoing = Math.max(totalApp - solved, 0);
  const isEn = document.documentElement.lang === 'en';
  const fmt = n => isEn ? String(n) : toBengaliNumber(n);
  if(solvedEl) solvedEl.textContent = fmt(solved);
  if(totalAppEl) totalAppEl.textContent = fmt(totalApp);
  if(ongoingEl) ongoingEl.textContent = fmt(ongoing);
  if(bigVisitEl) bigVisitEl.textContent = fmt(data.visitorCount || 0);
}

function loadStats(){
  fetch(SCRIPT_URL + '?action=getStats')
    .then(r => r.json())
    .then(data => { if(data.success) renderStats(data); })
    .catch(()=>{
      // ব্যর্থ হলে চুপচাপ থাকা, ড্যাশ দেখানো থাকবে
    });
}

function updateRatingSchema(avgRating, totalCount){
  // real, লাইভ রিভিউ ডেটা দিয়ে LocalBusiness JSON-LD-তে aggregateRating যোগ করা হয়,
  // যাতে স্ট্রাকচার্ড ডেটা সবসময় পেজে দেখানো আসল রেটিং-এর সাথে মিলে থাকে
  const schemaEl = document.getElementById('localBusinessSchema');
  if(!schemaEl) return;
  try{
    const data = JSON.parse(schemaEl.textContent);
    data.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": String(avgRating),
      "reviewCount": String(totalCount)
    };
    schemaEl.textContent = JSON.stringify(data);
  }catch(e){}
}

function renderReviews(data){
  const container = document.getElementById('reviewsContainer');
  const ratingNumEl = document.getElementById('ratingStatNum');
  const ratingLabelEl = document.getElementById('ratingStatLabel');
  const isEn = document.documentElement.lang === 'en';
  if(data.totalCount > 0){
    ratingNumEl.textContent = (isEn ? data.avgRating : toBengaliNumber(data.avgRating)) + '★';
    ratingLabelEl.textContent = isEn
      ? ('Customer Rating (' + data.totalCount + ' reviews)')
      : ('কাস্টমার রেটিং (' + toBengaliNumber(data.totalCount) + ' রিভিউ)');
    updateRatingSchema(data.avgRating, data.totalCount);
  } else {
    ratingNumEl.textContent = '—';
    ratingLabelEl.textContent = isEn ? 'No rating yet' : 'এখনো রেটিং নেই';
  }

  if(!data.reviews || data.reviews.length === 0){
    container.innerHTML = '<p style="font-size:13.5px; color:var(--muted); text-align:center; padding:10px 0;">এখনো কোনো রিভিউ নেই — প্রথম রিভিউ দিন!</p>';
    return;
  }
  container.innerHTML = data.reviews.map(rev => {
    const ratingNum = Math.max(0, Math.min(5, parseInt(rev.rating, 10) || 0));
    const stars = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
    const safeName = blogEscape(rev.name);
    const safeText = blogEscape(rev.text);
    return '<div class="testi-item">' +
      '<div class="testi-stars">' + stars + '</div>' +
      '<p class="testi-text">' + safeText + '</p>' +
      '<div class="testi-name">— ' + safeName + '</div>' +
    '</div>';
  }).join('');
}

function loadReviews(){
  fetch(SCRIPT_URL + '?action=getReviews')
    .then(r => r.json())
    .then(data => {
      if(data.success) renderReviews(data);
      else renderReviews({totalCount:0, reviews:[]});
    })
    .catch(()=>{
      document.getElementById('reviewsContainer').innerHTML = '<p style="font-size:13.5px; color:var(--muted); text-align:center; padding:10px 0;">রিভিউ লোড করতে সমস্যা হয়েছে।</p>';
    });
}

// ============ স্ন্যাপশট: সাইটের সাথেই রাখা পোস্ট/রিভিউ/স্ট্যাটসের কপি (snapshot.json) ============
// নতুন ভিজিটরের ফোনে আগের কোনো সংরক্ষিত ডেটা থাকে না, আর Apps Script ধীর হতে পারে। তাই সাইট
// আগে এই ফাইলটা পড়ে (GitHub থেকে দ্রুত আসে) এবং সাথে সাথে পোস্ট/রিভিউ দেখায়; এরপর পেছনে
// Apps Script থেকে নতুন ডেটা এনে মিলিয়ে নেয়। ফাইল না থাকলে বা ব্যর্থ হলে কিছুই বদলায় না।
let __snapshotPromise = null;
function loadSnapshot(){
  if(!__snapshotPromise){
    __snapshotPromise = fetch(window.location.origin + '/snapshot.json?v=' + Math.floor(Date.now() / 300000))
      .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => (d && d.success) ? d : null)
      .catch(() => null);
  }
  return __snapshotPromise;
}

// ============ হোমপেজে stats+reviews একসাথে একটা মাত্র রিকোয়েস্টে আনা (আগে ২টা আলাদা কল লাগতো, এখন ১টা — দ্রুত লোড হবে) ============
let __homeDataRequest = null;
let __homeShown = false;
function loadHomeData(force){
  const key = 'publicHomeDataCacheV2';
  const ttl = 60 * 1000;
  if(!force){
    try{
      const raw = sessionStorage.getItem(key);
      if(raw){
        const obj = JSON.parse(raw);
        if(obj && obj.time && (Date.now()-obj.time) < ttl && obj.data && obj.data.success){
          renderStats(obj.data.stats);
          renderReviews(obj.data.reviews);
          __homeShown = true;
        }
      }
    }catch(e){}
    if(!__homeShown){
      loadSnapshot().then(snap => {
        if(snap && snap.home && !__homeShown){
          renderStats(snap.home.stats);
          renderReviews(snap.home.reviews);
          __homeShown = true;
        }
      });
    }
  }
  if(__homeDataRequest && !force) return __homeDataRequest;
  __homeDataRequest = fetch(SCRIPT_URL + '?action=getHomeData&_=' + Date.now(), {cache:'no-store'})
    .then(r => r.json())
    .then(data => {
      if(data && data.success){
        renderStats(data.stats);
        renderReviews(data.reviews);
        __homeShown = true;
        try{ sessionStorage.setItem(key, JSON.stringify({time:Date.now(),data:data})); }catch(e){}
      }
      return data;
    })
    .catch(()=>null)
    .finally(()=>{ __homeDataRequest = null; });
  return __homeDataRequest;
}
afterFirstPaint(()=>loadHomeData(false),1400);
// ঘন ঘন API কল না করে ৬০ সেকেন্ড পরপর ব্যাকগ্রাউন্ডে আপডেট। ট্যাব লুকানো থাকলে কল হবে না।
setInterval(()=>{ if(document.visibilityState === 'visible') loadHomeData(true); }, 60000);

// ============ ব্লগ/পোস্ট: লোড, কার্ড রেন্ডার ও রাউটিং (?post=ID / ?blog=all) ============
let __allPosts = [];

function blogEscape(s){
  return String(s || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// শুধুমাত্র http/https মিডিয়া URL গ্রহণ করি এবং HTML attribute-এ নিরাপদভাবে বসাই।
function blogSafeUrl(s){
  try{
    const u = new URL(String(s || ''), window.location.href);
    if(u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return blogEscape(u.href);
  }catch(e){ return ''; }
}

// টাইমজোনের নাম (যেমন "GMT+0600 (Bangladesh Standard Time)") বাদ দিয়ে শুধু তারিখ/সময়টা দেখানো
function cleanPostDate(dateStr){
  return String(dateStr || '')
    .replace(/\s*GMT[+-]\d{4}\s*/i, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function blogExcerpt(text, len){
  const t = String(text || '').trim();
  if(t.length <= len) return t;
  return t.slice(0, len).trim() + '…';
}

const BLOG_CATEGORIES = ['রিকভারি','মনিটাইজেশন','টিপস','সতর্কতা','সাধারণ আপডেট'];

function renderCategoryNav(activeCat){
  const nav = document.getElementById('blogCatNav');
  if(!nav) return;
  const isAll = !activeCat || activeCat === 'all';
  let html = '<a class="blog-cat-pill' + (isAll ? ' active' : '') + '" href="?blog=all">সব</a>';
  html += BLOG_CATEGORIES.map(cat =>
    '<a class="blog-cat-pill' + (activeCat === cat ? ' active' : '') + '" href="?blog=' + encodeURIComponent(cat) + '">' + cat + '</a>'
  ).join('');
  nav.innerHTML = html;
}

function renderRecentWidget(){
  const wrap = document.getElementById('blogRecentWidget');
  const list = document.getElementById('blogRecentList');
  if(!wrap || !list) return;
  if(__allPosts.length === 0){ wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  list.innerHTML = __allPosts.slice(0, 6).map(renderBlogListItem).join('');
}

// ============ "এইমাত্র পাওয়া" — শুধু লেখার তালিকা (ছবি ছাড়া), শিক্ষাবার্তার টিকারের ধাঁচে ============
function renderTickerList(){
  const wrap = document.getElementById('blogTickerWrap');
  const list = document.getElementById('blogTickerList');
  if(!wrap || !list) return;
  if(__allPosts.length === 0){ wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  list.innerHTML = __allPosts.slice(0, 8).map((p, i) =>
    '<li><span class="num">' + (i + 1) + '.</span><a href="?post=' + encodeURIComponent(p.id) + '">' + blogEscape(p.title) + '</a></li>'
  ).join('');
}

// ============ শিক্ষাবার্তার হোমপেজের মতো ৫টা ছবিসহ কার্ডের সারি ============
function renderPhotoGrid(){
  const wrap = document.getElementById('blogPhotoGrid');
  if(!wrap) return;
  const withImages = __allPosts.filter(p => blogSafeUrl(p.imageUrl)).slice(0, 5);
  if(withImages.length === 0){ wrap.innerHTML = ''; return; }
  wrap.innerHTML = withImages.map(p =>
    '<a class="blog-photo-card" href="?post=' + encodeURIComponent(p.id) + '">' +
      '<img src="' + blogSafeUrl(p.imageUrl) + '" alt="' + blogEscape(p.title) + '" loading="lazy">' +
      '<div class="post-title">' + blogEscape(p.title) + '</div>' +
    '</a>'
  ).join('');
}

// ============ ডানপাশে সাইডবারের ক্যালেন্ডার উইজেট — যেসব দিনে পোস্ট আছে সেগুলো হাইলাইট করা ============
function renderCalendarWidget(){
  const cap = document.getElementById('blogCalendarCap');
  const head = document.getElementById('blogCalendarHead');
  const body = document.getElementById('blogCalendarBody');
  if(!cap || !head || !body) return;

  const monthNames = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  const dayNames = ['র','সো','ম','বু','বৃ','শু','শ'];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  cap.textContent = monthNames[month] + ' ' + year;
  head.innerHTML = dayNames.map(d => '<th>' + d + '</th>').join('');

  const postDaysSet = new Set();
  __allPosts.forEach(p => {
    const d = new Date(p.date);
    if(!isNaN(d) && d.getFullYear() === year && d.getMonth() === month){
      postDaysSet.add(d.getDate());
    }
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let html = '<tr>';
  for(let i = 0; i < firstDay; i++) html += '<td></td>';
  let col = firstDay;
  for(let day = 1; day <= daysInMonth; day++){
    const cls = postDaysSet.has(day) ? ' class="has-post"' : '';
    html += '<td' + cls + '>' + day + '</td>';
    col++;
    if(col === 7 && day !== daysInMonth){ html += '</tr><tr>'; col = 0; }
  }
  html += '</tr>';
  body.innerHTML = html;
}

// ============ "সব" ভিউতে প্রতিটা ক্যাটাগরির নিজস্ব সেকশন — ১টা বড় ফিচার্ড পোস্ট + পাশে ছোট তালিকা ============
function renderCategorySections(){
  const wrap = document.getElementById('blogCatSections');
  if(!wrap) return;
  let html = '';
  BLOG_CATEGORIES.forEach(cat => {
    const posts = __allPosts.filter(p => (p.category || 'সাধারণ আপডেট') === cat).slice(0, 5);
    if(posts.length === 0) return;
    const mainPost = posts[0];
    const sideList = posts.slice(1);
    const mainImg = blogSafeUrl(mainPost.imageUrl) ? '<img src="' + blogSafeUrl(mainPost.imageUrl) + '" alt="' + blogEscape(mainPost.title) + '" loading="lazy">' : '';
    const mainExcerpt = blogEscape(blogExcerpt(mainPost.content, 110));
    html +=
      '<div class="blog-cat-block">' +
        '<div class="blog-cat-block-head">' +
          '<h2>' + cat + '</h2>' +
          '<a class="blog-viewall-link" href="?blog=' + encodeURIComponent(cat) + '">সব দেখুন →</a>' +
        '</div>' +
        '<div class="blog-cat-block-body">' +
          '<a class="blog-cat-main-post" href="?post=' + encodeURIComponent(mainPost.id) + '">' +
            mainImg +
            '<div class="post-date">' + cleanPostDate(mainPost.date) + '</div>' +
            '<div class="post-title">' + blogEscape(mainPost.title) + '</div>' +
            '<p class="post-excerpt">' + mainExcerpt + '</p>' +
            '<span class="blog-readmore">বিস্তারিত পড়ুন →</span>' +
          '</a>' +
          (sideList.length > 0
            ? '<ul class="blog-cat-side-list">' + sideList.map(p =>
                '<li>' +
                  (p.imageUrl ? '<img src="' + blogSafeUrl(p.imageUrl) + '" alt="' + blogEscape(p.title) + '" loading="lazy">' : '') +
                  '<a href="?post=' + encodeURIComponent(p.id) + '">' + blogEscape(p.title) + '</a>' +
                '</li>'
              ).join('') + '</ul>'
            : '') +
        '</div>' +
      '</div>';
  });
  wrap.innerHTML = html;
}

function renderBlogCard(p, featured, small){
  const safeTitle = blogEscape(p.title);
  const excerpt = blogEscape(blogExcerpt(p.content, featured ? 150 : (small ? 60 : 110)));
  const href = '?post=' + encodeURIComponent(p.id);
  const clickAttr = ' onclick="trackPostClick(\'' + String(p.id).replace(/'/g, "\\'") + '\')"';
  const thumbHtml = p.imageUrl
    ? '<img src="' + blogSafeUrl(p.imageUrl) + '" alt="' + safeTitle + '" loading="lazy" style="' + (featured ? '' : ('width:100%; object-fit:cover; border-radius:8px; margin-bottom:' + (small ? '8px; max-height:100px;' : '10px; max-height:170px;'))) + '">'
    : '';
  const mediaTag = (!p.imageUrl && p.videoUrl)
    ? '<span style="display:inline-block; font-size:11.5px; color:var(--forest); margin-bottom:6px;">🎬 ভিডিওসহ পোস্ট</span>'
    : '';
  const eyebrow = small ? '' : '<span class="post-eyebrow">' + (featured ? '★ সর্বশেষ আপডেট' : 'আপডেট') + '</span>';
  const body =
    '<div class="post-date">' + cleanPostDate(p.date) + '</div>' +
    eyebrow +
    mediaTag +
    '<div class="post-title">' + safeTitle + '</div>' +
    (small ? '' : (
      '<p class="post-excerpt">' + excerpt + '</p>' +
      '<div class="post-meta-row">' +
        '<span>❤️ ' + (p.likes || 0) + '</span>' +
        '<span>💬 ' + (p.commentCount || 0) + '</span>' +
      '</div>' +
      '<span class="blog-readmore">বিস্তারিত পড়ুন →</span>'
    ));
  if(featured){
    return '<a class="blog-card featured" href="' + href + '"' + clickAttr + '>' +
      thumbHtml +
      '<div class="featured-inner">' + body + '</div>' +
    '</a>';
  }
  return '<a class="blog-card' + (small ? ' small' : '') + '" href="' + href + '"' + clickAttr + '>' + thumbHtml + body + '</a>';
}

function loadPosts(){
  const container = document.getElementById('postsContainer');
  const cacheKey = 'publicBlogPostsCacheV5';
  const oldCacheKeys = ['publicBlogPostsCacheV4','publicBlogPostsCacheV3','publicBlogPostsCacheV2'];
  let settled = false;
  let timer = null;

  const finish = (fn)=>{
    if(settled) return;
    settled = true;
    if(timer) clearTimeout(timer);
    fn();
  };

  const render = (posts)=>{
    __allPosts = Array.isArray(posts) ? posts : [];
    if(container){
      if(!__allPosts.length){
        container.innerHTML = '<p class="posts-empty">এখনো কোনো আপডেট নেই।</p>';
      } else {
        container.innerHTML = __allPosts.slice(0,4).map((p,i)=>renderBlogCard(p,i===0)).join('');
      }
    }
    renderRecentWidget();
    renderCalendarWidget();
    initBlogRouter();
  };

  // পুরনো ক্যাশ থাকলে সঙ্গে সঙ্গে দেখাই; এরপর নতুন ডেটা ব্যাকগ্রাউন্ডে আনা হবে।
  try{
    let cached = localStorage.getItem(cacheKey);
    if(!cached){
      for(const k of oldCacheKeys){ cached = localStorage.getItem(k); if(cached) break; }
    }
    if(cached){
      const obj = JSON.parse(cached);
      if(obj && Array.isArray(obj.posts) && obj.posts.length){
        render(obj.posts);
        if(obj.time && (Date.now()-obj.time) < 24*60*60*1000) return;
      }
    }
  }catch(err){}

  if(container && !__allPosts.length){
    container.innerHTML = '<p class="posts-empty">সর্বশেষ পোস্টগুলো আসছে…</p>';
  }

  // সংরক্ষিত ডেটা না থাকলে (নতুন ভিজিটর) সাইটের snapshot.json থেকে সাথে সাথে পোস্ট দেখাই;
  // পরে Apps Script-এর নতুন ডেটা এলে সেটা এর ওপর বসে যাবে।
  if(!__allPosts.length){
    loadSnapshot().then(snap => {
      if(snap && Array.isArray(snap.posts) && snap.posts.length && !__allPosts.length){
        render(snap.posts);
      }
    });
  }

  const controller = new AbortController();
  timer = setTimeout(()=>{
    try{ controller.abort(); }catch(e){}
    finish(()=>{
      if(container && !__allPosts.length){
        container.innerHTML = '<div class="posts-empty">পোস্ট লোড হতে দেরি হচ্ছে।<br><button type="button" onclick="loadPosts()" style="margin-top:10px;padding:8px 14px;border:1px solid #ccc;border-radius:8px;background:transparent;cursor:pointer">আবার চেষ্টা করুন</button></div>';
      }
      initBlogRouter();
    });
  }, 5000);

  fetch(SCRIPT_URL + '?action=getPosts', {cache:'default', signal:controller.signal})
    .then(r=>{
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    })
    .then(data=>{
      if(!data || data.success !== true) throw new Error(data && data.error ? data.error : 'getPosts failed');
      const posts = Array.isArray(data.posts) ? data.posts : [];
      try{ localStorage.setItem(cacheKey, JSON.stringify({time:Date.now(),posts:posts})); }catch(err){}
      finish(()=>render(posts));
    })
    .catch(err=>{
      console.error('getPosts error:', err);
      // পুরনো ক্যাশ থাকলে সেটি দেখিয়েই রাখি। একেবারে ডেটা না থাকলে ping দিয়ে API-র
      // সংযোগ আছে কিনা যাচাই করে ব্যবহারকারীকে নির্দিষ্ট বার্তা দেখানো হবে।
      if(settled) return;
      fetch(SCRIPT_URL + '?action=ping&_=' + Date.now(), {cache:'no-store'})
        .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(ping=>finish(()=>{
          if(container && !__allPosts.length){
            const detail = ping && ping.success ? 'Apps Script সংযোগ আছে, কিন্তু Posts ডেটা লোডে সমস্যা হচ্ছে।' : 'Apps Script সংযোগে সমস্যা হচ্ছে।';
            container.innerHTML = '<div class="posts-empty">'+detail+'<br><button type="button" onclick="loadPosts()" style="margin-top:10px;padding:8px 14px;border:1px solid #ccc;border-radius:8px;background:transparent;cursor:pointer">আবার চেষ্টা করুন</button></div>';
          }
          initBlogRouter();
        }))
        .catch(()=>finish(()=>{
          if(container && !__allPosts.length){
            container.innerHTML = '<div class="posts-empty">Apps Script সংযোগ পাওয়া যাচ্ছে না। Apps Script Web App-এর সর্বশেষ version Deploy করুন।<br><button type="button" onclick="loadPosts()" style="margin-top:10px;padding:8px 14px;border:1px solid #ccc;border-radius:8px;background:transparent;cursor:pointer">আবার চেষ্টা করুন</button></div>';
          }
          initBlogRouter();
        }));
    });
}

(new URLSearchParams(window.location.search).get('post') || new URLSearchParams(window.location.search).get('p') || new URLSearchParams(window.location.search).get('blog') || window.location.hash) ? loadPosts() : afterFirstPaint(loadPosts,1800);

// ============ URL অনুযায়ী ব্লগ আর্কাইভ/ডিটেইল ভিউ দেখানো ============
// ============ Canonical URL ও og:url ডায়নামিকভাবে আপডেট ============
// এটা ছাড়া প্রতিটা ব্লগ পোস্ট পেজেও canonical ট্যাগ হোমপেজেই স্থির থাকত,
// ফলে Google পোস্টগুলোকে হোমপেজের ডুপ্লিকেট ভেবে আলাদাভাবে ইনডেক্স নাও করতে পারত।
function updateCanonicalUrl(url){
  const canonicalEl = document.querySelector('link[rel="canonical"]');
  if(canonicalEl) canonicalEl.setAttribute('href', url);
  const ogUrlEl = document.querySelector('meta[property="og:url"]');
  if(ogUrlEl) ogUrlEl.setAttribute('content', url);
}

// ============ নিরাপদ ultra-short post key ============
// UUID (128-bit) হলে 16 bytes -> Base64url without padding = 22 characters।
function __base64UrlFromBytes(bytes){
  let bin = '';
  for(let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function __uuidToShortKey(id){
  const s = String(id || '').trim();
  const m = s.match(/^([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{12})$/);
  if(!m) return null;
  const hex = m.slice(1).join('');
  const bytes = new Uint8Array(16);
  for(let i=0;i<16;i++) bytes[i] = parseInt(hex.slice(i*2,i*2+2),16);
  return __base64UrlFromBytes(bytes);
}
function shortPostKey(id){
  const uuidKey = __uuidToShortKey(id);
  return uuidKey || String(id || '');
}
function resolveShortPostKey(key){
  if(!key || !Array.isArray(__allPosts) || !__allPosts.length) return null;
  const k = String(key);
  const found = __allPosts.find(p => shortPostKey(p.id) === k);
  if(found) return String(found.id);
  // Legacy 12-character ?p= links created by an older router.
  const legacy = k.replace(/[^a-zA-Z0-9]/g,'').slice(0,12).toLowerCase();
  if(legacy.length === 12){
    const oldFound = __allPosts.find(p => String(p.id || '').replace(/[^a-zA-Z0-9]/g,'').slice(0,12).toLowerCase() === legacy);
    if(oldFound) return String(oldFound.id);
  }
  return null;
}

function initBlogRouter(){
  const params = new URLSearchParams(window.location.search);
  const hash = String(window.location.hash || '').replace(/^#/, '');
  const directPostId = params.get('post');
  const legacyShortKey = params.get('p');
  const blogParam = params.get('blog');

  // Canonical ?post=ID links do not depend on the post list being loaded yet.
  // Open the blog view immediately, then showBlogDetail() will be refreshed by
  // loadPosts() / snapshot when the data arrives.
  const postId = directPostId || resolveShortPostKey(legacyShortKey) || resolveShortPostKey(hash);
  const hasPostRoute = !!(directPostId || legacyShortKey || hash);

  if(!postId && !blogParam && !hasPostRoute) return; // স্বাভাবিক হোমপেজ

  const landingTop = document.getElementById('landingTop');
  const landingBottom = document.getElementById('landingBottom');
  const mainFormSection = document.getElementById('mainFormSection');
  const blogView = document.getElementById('blogView');
  if(landingTop) landingTop.style.display = 'none';
  if(landingBottom) landingBottom.style.display = 'none';
  if(mainFormSection) mainFormSection.style.display = 'none';
  if(blogView) blogView.style.display = '';
  window.scrollTo({ top:0, behavior:'auto' });

  if(postId){
    renderCategoryNav(null);
    showBlogDetail(postId);
  } else if(directPostId || legacyShortKey || hash){
    // URL is a post route but the post list has not arrived yet.
    // Never fall back to the home page; keep the detail view open.
    const archiveWrap = document.getElementById('blogArchiveWrap');
    const detailWrap = document.getElementById('blogDetailWrap');
    const contentEl = document.getElementById('blogDetailContent');
    if(archiveWrap) archiveWrap.style.display = 'none';
    if(detailWrap) detailWrap.style.display = '';
    if(contentEl && !__allPosts.length){
      contentEl.innerHTML = '<p class="posts-empty">পোস্টটি লোড হচ্ছে…</p>';
    }
  } else {
    showBlogArchive(blogParam);
  }
}

// ============ ব্লগ পোস্ট পড়ার সময় স্ক্রল প্রোগ্রেস বার ============
(function initReadingProgressBar(){
  const bar = document.getElementById('readingProgressBar');
  if(!bar) return;
  function update(){
    const detailWrap = document.getElementById('blogDetailWrap');
    if(!detailWrap || detailWrap.style.display === 'none'){
      bar.style.width = '0%';
      return;
    }
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

function showBlogArchive(cat){
  const archiveWrap = document.getElementById('blogArchiveWrap');
  const detailWrap = document.getElementById('blogDetailWrap');
  const searchInput = document.getElementById('blogSearchInput');
  const titleEl = document.getElementById('blogArchiveTitle');
  const subEl = document.getElementById('blogArchiveSub');
  if(detailWrap) detailWrap.style.display = 'none';
  if(archiveWrap) archiveWrap.style.display = '';
  const readingBarEl = document.getElementById('readingProgressBar');
  if(readingBarEl) readingBarEl.style.width = '0%';
  const isCategory = cat && cat !== 'all';
  renderCategoryNav(isCategory ? cat : 'all');
  if(titleEl) titleEl.textContent = isCategory ? cat : 'সব আপডেট / পোস্ট';
  if(subEl) subEl.textContent = isCategory
    ? ('"' + cat + '" বিভাগের সব পোস্ট একসাথে')
    : 'ফেসবুক, ইনস্টাগ্রাম, টিকটক, ইউটিউব সংক্রান্ত সব সমাধান, টিপস ও সর্বশেষ খবর একসাথে';
  updateCanonicalUrl('https://alamingazi533.github.io/?blog=' + encodeURIComponent(cat || 'all'));
  if(searchInput){
    searchInput.value = '';
    if(!searchInput.dataset.bound){
      searchInput.dataset.bound = '1';
      searchInput.addEventListener('input', ()=> renderBlogArchiveGrid(searchInput.value, __currentBlogCat));
    }
  }
  __currentBlogCat = isCategory ? cat : 'all';
  renderBlogArchiveGrid('', __currentBlogCat);
  renderRecentWidget();
}
let __currentBlogCat = 'all';

function renderBlogArchiveGrid(query, cat){
  const grid = document.getElementById('blogArchiveGrid');
  const catSectionsWrap = document.getElementById('blogCatSections');
  const tickerWrap = document.getElementById('blogTickerWrap');
  const photoGrid = document.getElementById('blogPhotoGrid');
  if(!grid) return;
  const q = String(query || '').trim().toLowerCase();
  const isCategory = cat && cat !== 'all';

  if(__allPosts.length === 0){
    grid.innerHTML = '<p class="posts-empty">এখনো কোনো আপডেট নেই।</p>';
    if(catSectionsWrap) catSectionsWrap.innerHTML = '';
    if(tickerWrap) tickerWrap.style.display = 'none';
    if(photoGrid) photoGrid.innerHTML = '';
    return;
  }

  // ============ নির্দিষ্ট ক্যাটাগরি নির্বাচিত হলে: শুধু সেই ক্যাটাগরির পোস্ট গ্রিড আকারে ============
  if(isCategory){
    if(catSectionsWrap) catSectionsWrap.innerHTML = '';
    if(tickerWrap) tickerWrap.style.display = 'none';
    if(photoGrid) photoGrid.innerHTML = '';
    let list = __allPosts.filter(p => (p.category || 'সাধারণ আপডেট') === cat);
    if(q){
      list = list.filter(p =>
        String(p.title).toLowerCase().includes(q) ||
        String(p.content).toLowerCase().includes(q)
      );
    }
    grid.innerHTML = list.length === 0
      ? '<p class="posts-empty">এই বিভাগে কোনো পোস্ট পাওয়া যায়নি।</p>'
      : list.map(p => renderBlogCard(p, false, false)).join('');
    return;
  }

  // ============ "সব" ভিউতে সার্চ করা হলে: সব ক্যাটাগরির মধ্যে ফ্ল্যাট তালিকা ============
  if(q){
    if(catSectionsWrap) catSectionsWrap.innerHTML = '';
    if(tickerWrap) tickerWrap.style.display = 'none';
    if(photoGrid) photoGrid.innerHTML = '';
    const list = __allPosts.filter(p =>
      String(p.title).toLowerCase().includes(q) ||
      String(p.content).toLowerCase().includes(q) ||
      String(p.category || '').toLowerCase().includes(q)
    );
    grid.innerHTML = list.length === 0
      ? '<p class="posts-empty">এই বিষয়ে কোনো পোস্ট পাওয়া যায়নি।</p>'
      : list.map(p => renderBlogCard(p, false, false)).join('');
    return;
  }

  // ============ "সব" ভিউ, সার্চ নেই: এইমাত্র পাওয়া (টেক্সট তালিকা) + ছবির সারি + প্রতি ক্যাটাগরির আলাদা সেকশন ============
  grid.innerHTML = '';
  renderTickerList();
  renderPhotoGrid();
  renderCategorySections();
}

function renderFeatureHero(p){
  const safeTitle = blogEscape(p.title);
  const excerpt = blogEscape(blogExcerpt(p.content, 80));
  const href = '?post=' + encodeURIComponent(p.id);
  const clickAttr = ' onclick="trackPostClick(\'' + String(p.id).replace(/'/g, "\\'") + '\')"';
  const thumbHtml = p.imageUrl
    ? '<img src="' + blogSafeUrl(p.imageUrl) + '" alt="' + safeTitle + '" loading="lazy">'
    : '';
  return '<a class="blog-feature-main" href="' + href + '"' + clickAttr + '>' +
    thumbHtml +
    '<div class="post-date">' + cleanPostDate(p.date) + '</div>' +
    '<div class="post-title">' + safeTitle + '</div>' +
    '<p class="post-excerpt">' + excerpt + '</p>' +
    '<span class="blog-feature-btn">বিস্তারিত পড়ুন</span>' +
  '</a>';
}

function renderThumbItem(p){
  const safeTitle = blogEscape(p.title);
  const href = '?post=' + encodeURIComponent(p.id);
  const clickAttr = ' onclick="trackPostClick(\'' + String(p.id).replace(/'/g, "\\'") + '\')"';
  const thumbHtml = p.imageUrl
    ? '<img src="' + blogSafeUrl(p.imageUrl) + '" alt="' + safeTitle + '" loading="lazy">'
    : '';
  return '<a class="blog-thumb-item" href="' + href + '"' + clickAttr + '>' +
    thumbHtml +
    '<div class="blog-thumb-text">' +
      '<div class="blog-thumb-date">' + cleanPostDate(p.date) + '</div>' +
      '<div class="blog-thumb-title">' + safeTitle + '</div>' +
    '</div>' +
  '</a>';
}

function renderBlogListItem(p){
  const safeTitle = blogEscape(p.title);
  const href = '?post=' + encodeURIComponent(p.id);
  const clickAttr = ' onclick="trackPostClick(\'' + String(p.id).replace(/'/g, "\\'") + '\')"';
  return '<a class="blog-list-item" href="' + href + '"' + clickAttr + '>' +
    '<span class="blog-list-title">' + safeTitle + '</span>' +
    '<span class="blog-list-date">' + cleanPostDate(p.date) + '</span>' +
  '</a>';
}

function showBlogDetail(postId){
  const archiveWrap = document.getElementById('blogArchiveWrap');
  const detailWrap = document.getElementById('blogDetailWrap');
  const contentEl = document.getElementById('blogDetailContent');
  if(archiveWrap) archiveWrap.style.display = 'none';
  if(detailWrap) detailWrap.style.display = '';
  if(!contentEl) return;

  const post = __allPosts.find(p => String(p.id) === String(postId));
  if(!post){
    if(!__allPosts.length){
      contentEl.innerHTML = '<p class="posts-empty">পোস্টটি লোড হচ্ছে…</p>';
    } else {
      contentEl.innerHTML = '<p class="blog-not-found">এই পোস্টটি খুঁজে পাওয়া যায়নি। এটি হয়তো মুছে ফেলা হয়েছে।</p>';
    }
    return;
  }
  trackPostView(String(post.id));

  const safeTitle = blogEscape(post.title);
  const safeContent = blogEscape(post.content)
    .replace(/^## (.+)$/gm, '<h2 class="post-sub">$1</h2>')
    .replace(/!\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)/g, (m, cap, src) => '<figure class="post-fig"><img src="' + src + '" alt="' + cap + '" loading="lazy">' + (cap ? '<figcaption>' + cap + '</figcaption>' : '') + '</figure>');
  const imageHtml = blogSafeUrl(post.imageUrl)
    ? '<img src="' + blogSafeUrl(post.imageUrl) + '" alt="' + safeTitle + '" loading="lazy" style="width:100%; border-radius:10px; margin-bottom:14px; display:block;">'
    : '';
  const videoUrl = blogSafeUrl(post.videoUrl);
  const isOwnSiteEmbed = (() => {
    if(!videoUrl) return false;
    try{
      const u = new URL(videoUrl, location.href);
      return u.hostname === location.hostname && (u.pathname === location.pathname || u.pathname === '/fb-help/' || u.pathname === '/fb-help');
    }catch(e){ return false; }
  })();
  const videoHtml = videoUrl && !isOwnSiteEmbed
    ? '<div style="position:relative; width:100%; padding-top:56.25%; margin-bottom:14px; border-radius:10px; overflow:hidden; background:#000;">' +
        '<iframe src="' + videoUrl + '" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allow="autoplay" allowfullscreen loading="lazy"></iframe>' +
      '</div>'
    : '';
  const alreadyLiked = getLikedPostIds().includes(String(post.id));
  const likeLabel = alreadyLiked ? '❤️ পছন্দ হয়েছে' : '🤍 পছন্দ';

  contentEl.innerHTML =
    '<article>' +
      '<span class="post-eyebrow">আপডেট</span>' +
      '<h1>' + safeTitle + '</h1>' +
      '<div class="byline">' +
        '<img src="profile.jpg" alt="মোঃ আলামিন ইসলাম" loading="lazy" decoding="async">' +
        '<div>' +
          '<div class="byline-name">মোঃ আলামিন ইসলাম</div>' +
          '<div class="byline-date">' + cleanPostDate(post.date) + '</div>' +
        '</div>' +
      '</div>' +
      blogShareRowHtml(post) +
      imageHtml +
      videoHtml +
      '<div class="post-content">' + safeContent + '</div>' +
      '<div class="blog-engage-row">' +
        '<button type="button" id="postLikeBtn" class="' + (alreadyLiked ? 'liked' : '') + '"' + (alreadyLiked ? ' disabled' : '') + '>' + likeLabel + ' (<span id="postLikeCount">' + (post.likes || 0) + '</span>)</button>' +
        '<button type="button" id="postShareBtn">🔗 শেয়ার করুন</button>' +
      '</div>' +
    '</article>' +
    '<div class="blog-cta">' +
      '<a class="whatsapp-btn" style="max-width:340px; margin:16px auto 0;" href="https://wa.me/8801764324313" target="_blank" rel="noopener">WhatsApp-এ যোগাযোগ করুন</a>' +
    '</div>' +
    '<div class="blog-comments">' +
      '<h2>💬 কমেন্ট (<span id="commentCountLabel">' + (post.commentCount || 0) + '</span>)</h2>' +
      '<div id="commentsList"><p class="posts-empty">লোড হচ্ছে...</p></div>' +
      '<div class="comment-form">' +
        '<input type="text" id="commentNameInput" placeholder="আপনার নাম (ঐচ্ছিক)">' +
        '<textarea id="commentTextInput" placeholder="আপনার মতামত লিখুন..."></textarea>' +
        '<input type="text" id="commentHpField" name="website" autocomplete="off" tabindex="-1" style="position:absolute; left:-9999px; width:1px; height:1px; opacity:0;">' +
        '<div class="captcha-box" style="margin-bottom:8px;">' +
          '<span id="commentCaptchaQ"></span>' +
          '<input type="text" id="commentCaptchaAns" inputmode="numeric" placeholder="উত্তর">' +
        '</div>' +
        '<button type="button" id="commentSubmitBtn">কমেন্ট করুন</button>' +
        '<div id="commentMsg" class="comment-msg" style="display:none;"></div>' +
      '</div>' +
    '</div>' +
    '<div class="blog-more-link-wrap">' +
      '<a class="blog-viewall-link" href="?blog=all">← আরও পোস্ট দেখুন</a>' +
    '</div>';
  renderRelatedPosts(post);
  renderInstallButton();
  renderRecentWidget();
  newCommentCaptcha();

  const likeBtn = document.getElementById('postLikeBtn');
  if(likeBtn) likeBtn.addEventListener('click', ()=> likeCurrentPost(String(post.id)));
  const shareBtnEl = document.getElementById('postShareBtn');
  if(shareBtnEl) shareBtnEl.addEventListener('click', ()=> sharePost(String(post.id), post.title));
  const commentSubmitBtnEl = document.getElementById('commentSubmitBtn');
  if(commentSubmitBtnEl) commentSubmitBtnEl.addEventListener('click', ()=> submitPostComment(String(post.id)));
  loadPostComments(String(post.id));

  document.title = post.title + ' | সোশ্যাল মিডিয়া সমস্যা সমাধান — যশোর';
  updateCanonicalUrl('https://alamingazi533.github.io/?post=' + encodeURIComponent(post.id));
  const metaDesc = document.querySelector('meta[name="description"]');
  const postExcerpt = blogExcerpt(post.content, 155);
  if(metaDesc) metaDesc.setAttribute('content', postExcerpt);
  const ogTitleEl = document.querySelector('meta[property="og:title"]');
  if(ogTitleEl) ogTitleEl.setAttribute('content', post.title);
  const ogDescEl = document.querySelector('meta[property="og:description"]');
  if(ogDescEl) ogDescEl.setAttribute('content', postExcerpt);
}



// ============ হোম স্ক্রিনে যোগ করুন (ব্রাউজার অফার করলে তবেই দেখায়) ============
let __installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); __installEvt = e; renderInstallButton(); });
function renderInstallButton(){
  const wrap = document.querySelector('#blogDetailContent .blog-cta');
  if(!wrap || !__installEvt || wrap.querySelector('.install-btn')) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'install-btn'; b.textContent = '📲 হোম স্ক্রিনে যোগ করুন';
  b.addEventListener('click', async () => { const e = __installEvt; __installEvt = null; b.remove(); try{ e.prompt(); await e.userChoice; }catch(_){} });
  wrap.appendChild(b);
}

// ============ নিউজ-স্টাইল রঙিন শেয়ার আইকন সারি ============
function blogShareRowHtml(post){
  const url = encodeURIComponent('https://alamingazi533.github.io/?post=' + post.id);
  const t = encodeURIComponent(post.title || '');
  const b = (cls, href, label, svg) => '<a class="share-ic ' + cls + '" href="' + href + '" target="_blank" rel="noopener" aria-label="' + label + '">' + svg + '</a>';
  const svg = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  return '<div class="post-share-row">' +
    b('fb', 'https://www.facebook.com/sharer/sharer.php?u=' + url, 'Facebook-এ শেয়ার', svg('M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3z')) +
    b('wa', 'https://wa.me/?text=' + t + '%20' + url, 'WhatsApp-এ শেয়ার', svg('M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3zm4.6 12.4c-.2.5-1.1 1-1.5 1-.4.1-.9.1-2.9-.7-2.4-1-3.9-3.5-4-3.6-.1-.2-1-1.3-1-2.5s.6-1.7.8-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .5.4l.8 1.9c.1.1.1.3 0 .4l-.3.5-.4.4c-.1.1-.3.3-.1.5.2.3.7 1.2 1.5 1.9 1 .9 1.900 1.200 2.200 1.300.3.1.4.1.5-.1l.7-.9c.2-.2.3-.2.5-.1l1.800.9c.2.1.4.2.4.3.1.2.1.700-.1 1.200z')) +
    b('tg', 'https://t.me/share/url?url=' + url + '&text=' + t, 'Telegram-এ শেয়ার', svg('M20.7 4.3 3.4 11c-.8.3-.8.8-.1 1l4.400 1.400 1.700 5.200c.2.600.4.700.9.400l2.500-2 4.600 3.400c.8.5 1.400.2 1.600-.8l3-14.300c.3-1.200-.4-1.700-1.300-1.300zM9 13.200l8.600-5.400c.4-.3.800-.1.500.2l-7 6.300-.3 3-1.800-4.100z')) +
    b('x', 'https://twitter.com/intent/tweet?url=' + url + '&text=' + t, 'X-এ শেয়ার', svg('M17.800 3h3l-6.600 7.500L22 21h-6.100l-4.800-6.200L5.600 21h-3l7.100-8.100L2.200 3h6.200l4.300 5.700L17.800 3zm-1 16.200h1.700L7.400 4.700H5.600l11.200 14.500z')) +
  '</div>';
}

// ============ একই ক্যাটাগরির রিলেটেড পোস্ট দেখানো ============
function renderRelatedPosts(post){
  const contentEl = document.getElementById('blogDetailContent');
  const moreLinkWrap = contentEl ? contentEl.querySelector('.blog-more-link-wrap') : null;
  if(!contentEl || !moreLinkWrap) return;
  const related = __allPosts
    .filter(p => String(p.id) !== String(post.id) && (p.category || 'সাধারণ আপডেট') === (post.category || 'সাধারণ আপডেট'))
    .slice(0, 4);
  if(related.length === 0) return;
  const itemsHtml = related.map((p, i) =>
    '<a class="blog-related-item' + (i < 2 && blogSafeUrl(p.imageUrl) ? ' is-big' : '') + '" href="?post=' + encodeURIComponent(p.id) + '">' +
      (blogSafeUrl(p.imageUrl) ? '<img src="' + blogSafeUrl(p.imageUrl) + '" alt="" loading="lazy" decoding="async">' : '') +
      '<span>' + blogEscape(p.title) + '</span></a>'
  ).join('');
  const html =
    '<div class="blog-related-wrap">' +
      '<h3>আরও পড়ুন</h3>' +
      '<div class="blog-related-grid">' + itemsHtml + '</div>' +
    '</div>';
  moreLinkWrap.insertAdjacentHTML('beforebegin', html);
}

// ============ পোস্টের ভিউ/ক্লিক ট্র্যাকিং (অ্যাডমিন প্যানেলে দেখা যায়) ============
// View: পোস্ট ডিটেইল পেজ যতবার খোলা হয়েছে (সরাসরি লিংক, সার্চ, শেয়ার — যেকোনো উৎস থেকে)
// Click: তালিকা/কার্ড থেকে সাইটের ভেতরেই কতবার ক্লিক করে পোস্টে ঢোকা হয়েছে
function trackPostView(postId){
  if(!postId) return;
  try{
    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'trackPostView', postId: postId })
    }).catch(()=>{});
  }catch(e){}
}
function trackPostClick(postId){
  if(!postId) return;
  try{
    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'trackPostClick', postId: postId })
    }).catch(()=>{});
  }catch(e){}
}

// ============ পোস্ট লাইক (localStorage দিয়ে একই ব্রাউজার থেকে একবারই) ============
function getLikedPostIds(){
  try{ return JSON.parse(localStorage.getItem('likedPostIds') || '[]'); }catch(e){ return []; }
}
function markPostLiked(postId){
  const liked = getLikedPostIds();
  if(!liked.includes(postId)){
    liked.push(postId);
    try{ localStorage.setItem('likedPostIds', JSON.stringify(liked)); }catch(e){}
  }
}
function likeCurrentPost(postId){
  if(getLikedPostIds().includes(postId)) return;
  const btn = document.getElementById('postLikeBtn');
  const countEl = document.getElementById('postLikeCount');
  if(btn) btn.disabled = true;
  fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'likePost', postId: postId })
  }).then(()=>{
    markPostLiked(postId);
    const post = __allPosts.find(p => String(p.id) === postId);
    const newCount = (post ? (Number(post.likes) || 0) : 0) + 1;
    if(post) post.likes = newCount;
    if(countEl) countEl.textContent = newCount;
    if(btn){
      btn.classList.add('liked');
      btn.innerHTML = '❤️ পছন্দ হয়েছে (<span id="postLikeCount">' + newCount + '</span>)';
    }
  }).catch(()=>{
    if(btn) btn.disabled = false;
  });
}

// ============ পোস্ট শেয়ার (Web Share API, নাহলে লিংক কপি) ============
async function sharePost(postId, title){
  const shareData = {
    title: title || 'ফেসবুক সমস্যা সমাধান — আপডেট',
    text: 'ফেসবুক সমস্যা সমাধান — এই আপডেটটি দেখুন:',
    url: window.location.origin + window.location.pathname + '?post=' + encodeURIComponent(postId)
  };
  if(navigator.share){
    try{ await navigator.share(shareData); }
    catch(err){ /* ব্যবহারকারী শেয়ার বাতিল করলে কিছু করার দরকার নেই */ }
  } else {
    try{
      await navigator.clipboard.writeText(shareData.url);
      alert('লিংক কপি হয়েছে! এখন যেকোনো জায়গায় পেস্ট করে শেয়ার করতে পারবেন।');
    }catch(err){
      alert('শেয়ার করতে সমস্যা হয়েছে। লিংক: ' + shareData.url);
    }
  }
}

// ============ কমেন্ট ফর্মের ছোট ম্যাথ ক্যাপচা (বট ঠেকাতে) ============
let commentCaptchaAnswer = -1;
let commentCaptchaA = 0;
let commentCaptchaB = 0;
let commentCaptchaToken = '';
let commentCaptchaSeq = 0;
function newCommentCaptcha(){
  const seq = ++commentCaptchaSeq;
  const qEl = document.getElementById('commentCaptchaQ');
  const ansEl = document.getElementById('commentCaptchaAns');
  commentCaptchaAnswer = -1; commentCaptchaToken = ''; commentCaptchaA = 0; commentCaptchaB = 0;
  if(qEl) qEl.textContent = '… =';
  if(ansEl) ansEl.value = '';
  requestServerCaptcha(function(a, b, token){
    if(seq !== commentCaptchaSeq) return;
    commentCaptchaA = a; commentCaptchaB = b; commentCaptchaAnswer = a + b; commentCaptchaToken = token;
    const q2 = document.getElementById('commentCaptchaQ');
    if(q2) q2.textContent = a + ' + ' + b + ' =';
  });
}

// ============ পোস্টের কমেন্ট দেখানো ও জমা দেওয়া (এখন সাবমিট করলেই সাথে সাথে পাবলিক হয়) ============
function loadPostComments(postId){
  const listEl = document.getElementById('commentsList');
  if(!listEl) return;
  fetch(SCRIPT_URL + '?action=getComments&postId=' + encodeURIComponent(postId))
    .then(r => r.json())
    .then(data => {
      const comments = (data.success && data.comments) ? data.comments : [];
      if(comments.length === 0){
        listEl.innerHTML = '<p class="posts-empty">এখনো কোনো কমেন্ট নেই। প্রথম কমেন্টটি আপনিই করুন।</p>';
        return;
      }
      listEl.innerHTML = comments.map(c =>
        '<div class="comment-item">' +
          '<div class="comment-name">' + blogEscape(c.name || 'অজ্ঞাত') + '</div>' +
          '<div class="comment-text">' + blogEscape(c.text) + '</div>' +
          '<div class="comment-date">' + blogEscape(c.date || '') + '</div>' +
        '</div>'
      ).join('');
    })
    .catch(()=>{
      listEl.innerHTML = '<p class="posts-empty">কমেন্ট লোড করতে সমস্যা হয়েছে।</p>';
    });
}

// ============ ব্লগ লিস্ট/আর্কাইভ/কমেন্ট — নিরাপদে পটভূমিতে অটো-রিফ্রেশ ============
// সার্চ বক্সের লেখা, স্ক্রল পজিশন বা কমেন্ট লেখার বক্স — কোনোকিছুই না ঘেঁটে শুধু নতুন ডেটা টেনে দেখানো হয়
function refreshBlogDataSilently(){
  fetch(SCRIPT_URL + '?action=getPosts')
    .then(r => r.json())
    .then(data => {
      if(!data.success || !data.posts) return;
      __allPosts = data.posts;

      const blogView = document.getElementById('blogView');
      const archiveWrap = document.getElementById('blogArchiveWrap');
      const detailWrap = document.getElementById('blogDetailWrap');
      const isBlogViewOpen = blogView && blogView.style.display !== 'none';
      const isArchiveOpen = isBlogViewOpen && archiveWrap && archiveWrap.style.display !== 'none';
      const isDetailOpen = isBlogViewOpen && detailWrap && detailWrap.style.display !== 'none';

      if(!isBlogViewOpen){
        const container = document.getElementById('postsContainer');
        if(container){
          if(__allPosts.length === 0){
            container.innerHTML = '<p class="posts-empty">এখনো কোনো আপডেট নেই।</p>';
          } else {
            const shown = __allPosts.slice(0, 4);
            container.innerHTML = shown.map((p, i) => renderBlogCard(p, i === 0)).join('');
          }
        }
        renderRecentWidget();
        renderCalendarWidget();
      } else if(isArchiveOpen){
        const searchInput = document.getElementById('blogSearchInput');
        renderBlogArchiveGrid(searchInput ? searchInput.value : '', __currentBlogCat);
        renderRecentWidget();
      } else if(isDetailOpen){
        const params = new URLSearchParams(window.location.search);
        const hash = String(window.location.hash || '').replace(/^#/, '');
        const postId = params.get('post') || resolveShortPostKey(params.get('p')) || resolveShortPostKey(hash);
        if(postId){
          loadPostComments(postId); // নতুন কমেন্ট এলে দেখাবে, লেখার বক্স স্পর্শ করা হয় না
          const post = __allPosts.find(p => String(p.id) === String(postId));
          const countLabel = document.getElementById('commentCountLabel');
          if(post && countLabel) countLabel.textContent = post.commentCount || 0;
          const likeCountEl = document.getElementById('postLikeCount');
          if(post && likeCountEl && !getLikedPostIds().includes(String(post.id))){
            likeCountEl.textContent = post.likes || 0;
          }
        }
      }
    })
    .catch(()=>{});
}
setInterval(()=>{ if(document.visibilityState === 'visible') refreshBlogDataSilently(); }, 90000);

function submitPostComment(postId){
  const nameInput = document.getElementById('commentNameInput');
  const textInput = document.getElementById('commentTextInput');
  const hpInput = document.getElementById('commentHpField');
  const captchaInput = document.getElementById('commentCaptchaAns');
  const btn = document.getElementById('commentSubmitBtn');
  const msgBox = document.getElementById('commentMsg');
  const text = textInput ? textInput.value.trim() : '';
  const name = nameInput ? nameInput.value.trim() : '';
  const hp = hpInput ? hpInput.value.trim() : '';

  if(!text){
    if(msgBox){
      msgBox.style.display = 'block';
      msgBox.style.color = 'var(--maroon)';
      msgBox.textContent = 'কমেন্ট লিখুন।';
    }
    return;
  }

  if(commentCaptchaAnswer < 0 || parseInt(captchaInput ? captchaInput.value.trim() : '', 10) !== commentCaptchaAnswer){
    if(msgBox){
      msgBox.style.display = 'block';
      msgBox.style.color = 'var(--maroon)';
      msgBox.textContent = 'যাচাই ঘরের উত্তরটি সঠিক নয়।';
    }
    newCommentCaptcha();
    return;
  }

  const submittedCaptchaA = commentCaptchaA;
  const submittedCaptchaB = commentCaptchaB;
  const submittedCaptchaToken = commentCaptchaToken;

  if(btn){ btn.disabled = true; btn.textContent = 'জমা হচ্ছে...'; }
  fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      action: 'addComment', postId: postId, name: name, comment: text, hp: hp,
      captchaA: submittedCaptchaA, captchaB: submittedCaptchaB, captchaToken: submittedCaptchaToken,
      captchaAns: submittedCaptchaA + submittedCaptchaB
    })
  }).then(r => r.json().catch(() => null)).then(res => {
    if(res && res.success === false){
      // সার্ভার স্পষ্টভাবে বলেছে কমেন্ট নেওয়া হয়নি — ইনপুট না মুছে কারণ জানানো হচ্ছে
      newCommentCaptcha();
      if(msgBox){
        msgBox.style.display = 'block';
        msgBox.style.color = 'var(--maroon)';
        msgBox.textContent = res.error === 'captcha' ? 'যাচাই উত্তর সঠিক নয়, আবার চেষ্টা করুন।' : 'দুঃখিত, কমেন্ট জমা দেওয়া যায়নি। আবার চেষ্টা করুন।';
      }
      return;
    }
    if(textInput) textInput.value = '';
    if(nameInput) nameInput.value = '';
    newCommentCaptcha();
    if(msgBox){
      msgBox.style.display = 'block';
      msgBox.style.color = 'var(--ok)';
      msgBox.textContent = '✓ আপনার কমেন্ট পাবলিশ হয়েছে!';
    }
    setTimeout(()=> loadPostComments(postId), 800);
  }).catch(()=>{
    if(msgBox){
      msgBox.style.display = 'block';
      msgBox.style.color = 'var(--maroon)';
      msgBox.textContent = 'দুঃখিত, কমেন্ট জমা দিতে সমস্যা হয়েছে।';
    }
  }).finally(()=>{
    if(btn){ btn.disabled = false; btn.textContent = 'কমেন্ট করুন'; }
  });
}

// ============ ভিজিট ট্র্যাক করা (নীরবে, সময়, ডিভাইস ও আনুমানিক লোকেশনসহ) ============
// ============ ভিজিটর কত সময় সাইটে সক্রিয় ছিলেন তা মাপা (শুধু পেজ স্ক্রিনে খোলা থাকলে সময় ধরা হয়) ============
var __visitId = null;
let __activeMs = 0;
let __visibleSince = (document.visibilityState === 'visible') ? Date.now() : null;
let __lastSentSec = 0;
function __activeSeconds(){
  let ms = __activeMs;
  if(__visibleSince) ms += (Date.now() - __visibleSince);
  return Math.round(ms / 1000);
}
function sendVisitDuration(){
  if(!__visitId) return;
  const sec = __activeSeconds();
  if(sec < 1 || sec === __lastSentSec) return;
  __lastSentSec = sec;
  try{
    fetch(SCRIPT_URL + '?action=trackDuration&id=' + encodeURIComponent(__visitId) + '&sec=' + sec,
      { keepalive: true, mode: 'no-cors' }).catch(()=>{});
  }catch(err){}
}
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'hidden'){
    if(__visibleSince){ __activeMs += (Date.now() - __visibleSince); __visibleSince = null; }
    sendVisitDuration();
  } else {
    __visibleSince = Date.now();
  }
});
window.addEventListener('pagehide', sendVisitDuration);
// মোবাইলে ব্রাউজার হঠাৎ বন্ধ হয়ে গেলে যেন সময় হারিয়ে না যায়, তাই স্ক্রিনে থাকা অবস্থায় প্রতি ৪৫ সেকেন্ডে একবার পাঠানো হয়
setInterval(function(){ if(document.visibilityState === 'visible') sendVisitDuration(); }, 45000);


// ============ ভিজিটর কোথা থেকে এল (Google, Facebook...) ============
function detectTrafficSource(){
  try{
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_source') || params.get('src');
    if(utm) return String(utm).slice(0, 30);
    const ref = (document.referrer || '').toLowerCase();
    if(!ref) return 'সরাসরি';
    if(ref.indexOf(window.location.hostname.toLowerCase()) !== -1) return 'সরাসরি';
    if(/facebook|fb\.com|fb\.me|fbcdn|com\.facebook/.test(ref)) return 'Facebook';
    if(/instagram/.test(ref)) return 'Instagram';
    if(/youtube|youtu\.be/.test(ref)) return 'YouTube';
    if(/whatsapp/.test(ref)) return 'WhatsApp';
    if(/tiktok/.test(ref)) return 'TikTok';
    if(/t\.co\/|twitter\.com|x\.com/.test(ref)) return 'X/Twitter';
    if(/bing\./.test(ref)) return 'Bing';
    if(/google\.|googlequicksearchbox/.test(ref)) return 'Google';
    if(/^android-app:\/\//.test(ref)) return 'অ্যাপ';
    const host = new URL(document.referrer).hostname.replace(/^www\./, '');
    return host.slice(0, 40) || 'অন্যান্য';
  }catch(err){ return 'সরাসরি'; }
}

// ============ নতুন না আগে এসেছেন (এই ব্রাউজারে) ============
function markReturningVisitor(){
  try{
    const k = 'fbh_seen_v1';
    const seen = localStorage.getItem(k);
    localStorage.setItem(k, String(Date.now()));
    return seen ? '1' : '0';
  }catch(err){ return ''; }
}

// ============ ফর্ম ফানেল: ১ = ফর্ম খুলেছে, ২ = লেখা শুরু, ৩ = জমা দিয়েছে ============
// ভিজিটের আইডি আসার আগে ঘটলে মনে রেখে পরে পাঠানো হয় (এই ভেরিয়েবলে ইচ্ছে করেই শুরুর মান দেওয়া নেই)
var __wantedStage;
var __sentStage;
function reportFormStage(stage){
  __wantedStage = Math.max(__wantedStage || 0, stage);
  flushFormStage();
}
function flushFormStage(){
  if(!__visitId) return;
  if((__wantedStage || 0) > (__sentStage || 0)){
    __sentStage = __wantedStage;
    try{
      fetch(SCRIPT_URL + '?action=trackFormStage&id=' + encodeURIComponent(__visitId) + '&stage=' + __sentStage,
        { keepalive: true, mode: 'no-cors' }).catch(()=>{});
    }catch(err){}
  }
}
(function(){
  try{
    const f = document.getElementById('regForm');
    if(f){ f.addEventListener('input', function(){ reportFormStage(2); }, { once: true }); }
  }catch(err){}
})();

function detectDeviceType(){
  const ua = navigator.userAgent || '';
  if(/iPad|Tablet|Nexus 7|Nexus 10|KFAPWI/i.test(ua)) return 'ট্যাবলেট';
  if(/Mobi|Android|iPhone|iPod|Windows Phone|BlackBerry/i.test(ua)) return 'মোবাইল';
  return 'ডেস্কটপ';
}
function trackVisitWithLocation(){
  const device = detectDeviceType();
  const __trafficSource = detectTrafficSource();
  const __returningFlag = markReturningVisitor();
  // IP ঠিকানা থেকে আনুমানিক শহর/দেশ বের করা হয় (একটা ফ্রি, নিবন্ধনবিহীন সার্ভিস দিয়ে)।
  // এটা ব্যর্থ হলেও ভিজিট গণনা যাতে থেমে না যায়, তাই সবসময় ৩ সেকেন্ডের মধ্যে ফলাফল না
  // পেলে লোকেশন ছাড়াই ট্র্যাক করে ফেলা হয়।
  const timeout = new Promise(resolve => setTimeout(()=> resolve(null), 3000));
  const geoLookup = fetch('https://get.geojs.io/v1/ip/geo.json')
    .then(r => r.json())
    .then(d => {
      const city = (d && d.city) ? d.city : '';
      const country = (d && d.country) ? d.country : '';
      return city && country ? (city + ', ' + country) : (country || '');
    })
    .catch(()=> null);

  Promise.race([geoLookup, timeout]).then(location => {
    let url = SCRIPT_URL + '?action=trackVisit&device=' + encodeURIComponent(device);
    if(location) url += '&location=' + encodeURIComponent(location);
    url += '&src=' + encodeURIComponent(__trafficSource) + '&ret=' + __returningFlag;
    fetch(url)
      .then(r => r.json().catch(()=> null))
      .then(d => { if(d && d.id){ __visitId = d.id; flushFormStage(); } loadStats(); })
      .catch(()=>{});
  });
}
afterFirstPaint(trackVisitWithLocation,2500);

// ============ ব্লগ ইমেইল সাবস্ক্রিপশন ============
function loadBlogSubscriberCount(){
  fetch(SCRIPT_URL + '?action=getSubscriberCount')
    .then(r => r.json())
    .then(d => {
      if(d && d.success){
        const el = document.getElementById('blogSubscriberCount');
        if(el) el.textContent = d.count;
      }
    })
    .catch(()=>{});
}
function submitBlogSubscribe(){
  const emailInput = document.getElementById('blogSubscribeEmail');
  const msgEl = document.getElementById('blogSubscribeMsg');
  const btn = document.getElementById('blogSubscribeBtn');
  if(!emailInput || !msgEl || !btn) return;
  const email = (emailInput.value || '').trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailPattern.test(email)){
    msgEl.style.color = '#b3261e';
    msgEl.textContent = 'সঠিক ইমেইল ঠিকানা দিন।';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'সাবস্ক্রাইব হচ্ছে...';
  msgEl.textContent = '';
  fetch(SCRIPT_URL + '?action=subscribeToBlog&email=' + encodeURIComponent(email))
    .then(r => r.json())
    .then(d => {
      btn.disabled = false;
      btn.textContent = 'সাবস্ক্রাইব';
      if(d && d.success){
        msgEl.style.color = 'var(--forest)';
        msgEl.textContent = d.already ? 'আপনি ইতিমধ্যে সাবস্ক্রাইব করা আছেন।' : 'ধন্যবাদ! আপনি সফলভাবে সাবস্ক্রাইব করেছেন।';
        emailInput.value = '';
        loadBlogSubscriberCount();
      } else {
        msgEl.style.color = '#b3261e';
        msgEl.textContent = 'দুঃখিত, সাবস্ক্রাইব করা যায়নি। আবার চেষ্টা করুন।';
      }
    })
    .catch(()=>{
      btn.disabled = false;
      btn.textContent = 'সাবস্ক্রাইব';
      msgEl.style.color = '#b3261e';
      msgEl.textContent = 'নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন।';
    });
}
loadBlogSubscriberCount();

const reviewSubmitBtn = document.getElementById('reviewSubmitBtn');
if(reviewSubmitBtn){
  reviewSubmitBtn.addEventListener('click', async ()=>{
    const text = document.getElementById('reviewText').value.trim();
    const name = document.getElementById('reviewName').value.trim();
    const msgBox = document.getElementById('reviewMsg');

    if(selectedRating < 1){
      msgBox.style.display = 'block';
      msgBox.style.background = 'var(--err-bg)';
      msgBox.style.color = 'var(--maroon)';
      msgBox.textContent = 'রেটিং দিন (কমপক্ষে ১ তারা)।';
      return;
    }
    if(!text){
      msgBox.style.display = 'block';
      msgBox.style.background = 'var(--err-bg)';
      msgBox.style.color = 'var(--maroon)';
      msgBox.textContent = 'আপনার মতামত লিখুন।';
      return;
    }

    reviewSubmitBtn.disabled = true;
    reviewSubmitBtn.textContent = 'জমা হচ্ছে...';

    try{
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'submitReview', rating: selectedRating, text: text, name: name })
      });
      msgBox.style.display = 'block';
      msgBox.style.background = 'var(--ok-bg)';
      msgBox.style.color = 'var(--ok)';
      msgBox.textContent = '✓ ধন্যবাদ! আপনার রিভিউ জমা হয়েছে, অনুমোদনের পর এখানে দেখানো হবে।';
      document.getElementById('reviewText').value = '';
      document.getElementById('reviewName').value = '';
      selectedRating = 0;
      renderStars(starPicker, 0);
    }catch(err){
      msgBox.style.display = 'block';
      msgBox.style.background = 'var(--err-bg)';
      msgBox.style.color = 'var(--maroon)';
      msgBox.textContent = 'দুঃখিত, রিভিউ জমা দিতে সমস্যা হয়েছে।';
    }finally{
      reviewSubmitBtn.disabled = false;
      reviewSubmitBtn.textContent = 'রিভিউ জমা দিন';
    }
  });
}// ============ Service Worker রেজিস্ট্রেশন এখন OneSignal.init()-এর serviceWorkerPath দিয়েই হয় (উপরে দেখুন) —
// এখানে আলাদা করে আবার register() ডাকা হলে একই ফাইল দুইবার রেজিস্টার/যাচাই হতো, যা বাড়তি দেরির একটা কারণ ছিল।
