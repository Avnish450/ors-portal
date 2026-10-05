// ============================================================
// ORS PATIENT PORTAL — MAIN JAVASCRIPT
// Exact Replica Logic + 22 Scheduled Indian Languages + Problem Fixes
// ============================================================

'use strict';

// ─── STATE MANAGEMENT ──────────────────────────────────────────
let currentLanguage = 'en';
let currentSlide = 0;
let totalSlides = 3;
let slideInterval = null;
let wizardCurrentStage = 1;
let selectedBookingDate = '2026-10-02';
let selectedBookingTime = '09:00 AM - 10:00 AM';
let selectedHospital = 'aiims-delhi';
let selectedDept = 'cardio';
let selectedCaseType = 'new';
let bookingType = 'regular'; // 'regular' or 'teleconsultation'
let isGraminMode = false;
let currentFontSize = 0; // -1, 0, 1
let isServerMirror = false;
let waitlistJoined = false;
let waitlistCount = 14;

// ─── INITIALIZATION ON DOM LOAD ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. Render Language Selection Grid (First thing on open)
  renderLanguageGrid();

  // Check if language was previously chosen; if not, show language overlay
  const savedLang = localStorage.getItem('ors_lang');
  if (savedLang && window.ORS_TRANSLATIONS && window.ORS_TRANSLATIONS[savedLang]) {
    currentLanguage = savedLang;
    applyLanguage(currentLanguage);
    // If returning user, can close overlay or leave open if fresh session
    // User requested: "as soon as we open the website the first thing it asks is the language option"
    // So overlay is visible by default in HTML
  } else {
    currentLanguage = 'en';
    applyLanguage('en');
  }

  // 2. Start Hero Carousel Auto-Rotation
  startHeroCarousel();

  // 3. Start 8:00 AM Slot Opening Countdown Timer
  startTatkalTimer();

  // 4. Start Live Clock & Counters
  updateLiveTimestamp();
  setInterval(updateLiveTimestamp, 1000);

  // 5. Populate Initial Calendar Days
  renderCalendarDays(2026, 9); // October (0-indexed: 9 = Oct)
});

// ─── 1. LANGUAGE SELECTION MODAL LOGIC ─────────────────────────
function renderLanguageGrid() {
  const grid = document.getElementById('lang-grid');
  if (!grid || !window.ORS_LANGUAGES) return;

  grid.innerHTML = '';
  window.ORS_LANGUAGES.forEach(lang => {
    const card = document.createElement('div');
    card.className = `lang-card ${lang.code === currentLanguage ? 'selected' : ''}`;
    card.id = `lang-card-${lang.code}`;
    card.onclick = () => selectLanguage(lang.code);

    card.innerHTML = `
      <div class="lang-card__top">
        <span class="lang-card__native">${lang.name}</span>
        <button class="lang-card__audio-btn" onclick="event.stopPropagation(); playLangSample('${lang.code}', '${lang.name}')" title="Listen / सुनें">
          🔊
        </button>
      </div>
      <span class="lang-card__english">${lang.english}</span>
      <span class="lang-card__region">${lang.region}</span>
      <div class="lang-card__check">✓</div>
    `;
    grid.appendChild(card);
  });
}

function selectLanguage(code) {
  currentLanguage = code;
  document.querySelectorAll('.lang-card').forEach(c => c.classList.remove('selected'));
  const activeCard = document.getElementById(`lang-card-${code}`);
  if (activeCard) activeCard.classList.add('selected');

  const langObj = window.ORS_LANGUAGES.find(l => l.code === code);
  const proceedBtnText = document.getElementById('proceed-btn-text');
  if (proceedBtnText && langObj) {
    proceedBtnText.textContent = `Continue in ${langObj.name} (${langObj.english}) →`;
  }

  // Optional voice pronunciation sample
  playLangSample(code, langObj ? langObj.name : '');
}

function filterLanguages() {
  const query = document.getElementById('lang-search-input').value.toLowerCase().trim();
  const cards = document.querySelectorAll('.lang-card');
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(query) ? 'flex' : 'none';
  });
}

function playLangSample(code, nativeName) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const phraseMap = {
    hi: 'ऑनलाइन पंजीकरण प्रणाली में आपका स्वागत है',
    en: 'Welcome to Online Registration System Patient Portal',
    bn: 'অনলাইন নিবন্ধন সিস্টেমে স্বাগতম',
    te: 'ఆన్‌లైన్ నమోదు వ్యవస్థకు స్వాగతం',
    mr: 'ऑनलाइन नोंदणी प्रणालीमध्ये आपले स्वागत आहे',
    ta: 'ஆன்லைன் பதிவு அமைப்பிற்கு வரவேற்கிறோம்',
    gu: 'ઓનલાઈન રજીસ્ટ્રેશન સિસ્ટમમાં આપનું સ્વાગત છે',
    kn: 'ಆನ್‌ಲೈನ್ ನೋಂದಣಿ ವ್ಯವಸ್ಥೆಗೆ ಸುಸ್ವಾಗತ',
    ml: 'ഓൺലൈൻ രജിസ്ട്രേഷൻ സിസ്റ്റത്തിലേക്ക് സ്വാഗതം',
    pa: 'ਔਨਲਾਈਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸਿਸਟਮ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆಗਤ ਹੈ',
    ur: 'آن لائن رجسٹریشن سسٹم میں خوش آمدید',
    or: 'ଅନଲାଇନ୍ ପଞ୍ଜୀକରଣ ବ୍ୟବସ୍ଥାକୁ ସ୍ୱାଗତ',
    as: 'অনলাইন পঞ্জীয়ন ব্যৱস্থালৈ স্বাগতম',
  };

  const textToSpeak = phraseMap[code] || `Welcome to ORS Patient Portal. Selected language: ${nativeName}`;
  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.rate = 0.95;

  // Attempt to match system voice
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => v.lang.startsWith(code));
  if (matchedVoice) utterance.voice = matchedVoice;

  window.speechSynthesis.speak(utterance);
}

function playVoiceWelcome() {
  playLangSample(currentLanguage, 'ORS Portal');
}

function confirmLanguageSelection() {
  localStorage.setItem('ors_lang', currentLanguage);
  applyLanguage(currentLanguage);

  // Close overlay with smooth fade
  const overlay = document.getElementById('lang-overlay');
  if (overlay) {
    overlay.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
    }, 300);
  }

  // Update top nav language name
  const langObj = window.ORS_LANGUAGES.find(l => l.code === currentLanguage);
  const topLangName = document.getElementById('top-lang-name');
  if (topLangName && langObj) {
    topLangName.textContent = langObj.name;
  }
}

function reopenLanguageModal() {
  const overlay = document.getElementById('lang-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    renderLanguageGrid();
  }
}

// ─── TRANSLATION ENGINE ────────────────────────────────────────
function applyLanguage(code) {
  const dict = window.ORS_TRANSLATIONS && window.ORS_TRANSLATIONS[code] ? window.ORS_TRANSLATIONS[code] : window.ORS_TRANSLATIONS['en'];
  if (!dict) return;

  // 1. Text elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // 2. Adjust RTL if Urdu or Sindhi
  const langObj = window.ORS_LANGUAGES.find(l => l.code === code);
  if (langObj && langObj.rtl) {
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
  }
}

// ─── 2. HERO CAROUSEL LOGIC ────────────────────────────────────
function startHeroCarousel() {
  if (slideInterval) clearInterval(slideInterval);
  slideInterval = setInterval(() => {
    nextHeroSlide();
  }, 6000);
}

function showHeroSlide(index) {
  currentSlide = (index + totalSlides) % totalSlides;
  const slides = document.querySelectorAll('.hero-slide');
  slides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === currentSlide);
  });
}

function nextHeroSlide() {
  showHeroSlide(currentSlide + 1);
}

function prevHeroSlide() {
  showHeroSlide(currentSlide - 1);
}

// ─── 3. AIIMS DAILY 8:00 AM SLOT OPENING COUNTDOWN ────────────
function startTatkalTimer() {
  function updateCountdown() {
    const now = new Date();
    const target = new Date();
    target.setHours(8, 0, 0, 0);

    // If past 8:00 AM today, target tomorrow 8:00 AM
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }

    const diff = target - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = n => String(n).padStart(2, '0');
    const formatted = `${pad(hours)} hrs ${pad(minutes)} mins ${pad(seconds)} secs`;
    const formattedShort = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    const heroCountdown = document.getElementById('hero-tatkal-countdown');
    if (heroCountdown) heroCountdown.textContent = formatted;

    const badgeCountdown = document.getElementById('tatkal-countdown-badge');
    if (badgeCountdown) badgeCountdown.textContent = `Opens in: ${formattedShort}`;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// ─── 4. LIVE TIMESTAMP & HIGHLIGHTS COUNTER ────────────────────
function updateLiveTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12

  const timeStr = `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  const el = document.getElementById('live-last-appt-time');
  if (el) el.textContent = timeStr;
}

// ─── 5. INTERACTIVE BOOKING WIZARD ─────────────────────────────
function openBookingWizard(type) {
  bookingType = type || 'regular';
  const modal = document.getElementById('booking-modal');
  const title = document.getElementById('booking-modal-title');
  if (title) {
    title.textContent = bookingType === 'teleconsultation' 
      ? 'Book Teleconsultation Appointment (Stay Home e-OPD)' 
      : 'Book Hospital Appointment (In-Person OPD)';
  }
  goToWizardStage(1);
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
  }
}

function goToWizardStage(stage) {
  wizardCurrentStage = stage;
  for (let i = 1; i <= 5; i++) {
    const stageEl = document.getElementById(`wizard-stage-${i}`);
    const indicatorEl = document.getElementById(`w-step-${i}`);
    if (stageEl) stageEl.classList.toggle('active', i === stage);
    if (indicatorEl) indicatorEl.classList.toggle('active', i <= stage);
  }
}

function onStateChanged() {
  // Update hospitals based on selected state
}

function onHospitalChanged() {
  const hospSelect = document.getElementById('book-hospital-select');
  selectedHospital = hospSelect.value;
  updateScarcityBanner();
}

function onDeptChanged() {
  const deptSelect = document.getElementById('book-dept-select');
  selectedDept = deptSelect.value;
  updateDeptInfoCard();
  updateScarcityBanner();
}

function updateDeptInfoCard() {
  const infoTitle = document.getElementById('dept-info-title');
  const infoLoc = document.getElementById('dept-info-loc');
  const infoSchedule = document.getElementById('dept-info-schedule');
  if (!infoTitle || !infoLoc || !infoSchedule) return;

  const deptData = {
    'cardio': {
      title: 'Cardiology Department (हृदय रोग विभाग) Information',
      loc: 'Location: Dr. B.R. Ambedkar Institute Rotatory Cancer Hospital (IRCH) / CNC Block, Ground Floor.',
      schedule: 'OPD Days: Monday to Saturday (8:30 AM to 1:00 PM).'
    },
    'nephro': {
      title: 'Nephrology & Renal Transplant Department (गुर्दा एवं डायलिसिस विभाग) Information',
      loc: 'Location: Main Hospital Building, Teaching Block (4th Floor) & Hemodialysis Unit, AIIMS New Delhi.',
      schedule: 'OPD Days: Tuesday, Thursday & Saturday (8:30 AM to 1:30 PM). Specialty: CKD, Dialysis & Kidney Transplant.'
    },
    'neuro': {
      title: 'Neurology Department (तंत्रिका तंत्र विभाग) Information',
      loc: 'Location: Neurosciences Centre (CNC Block), 1st Floor, AIIMS New Delhi.',
      schedule: 'OPD Days: Monday, Wednesday & Friday (8:30 AM to 1:00 PM).'
    },
    'onco': {
      title: 'Medical Oncology (कैंसर रोग विभाग) Information',
      loc: 'Location: Dr. B.R. Ambedkar Institute Rotatory Cancer Hospital (IRCH), AIIMS New Delhi.',
      schedule: 'OPD Days: Monday to Friday (8:00 AM to 2:00 PM).'
    },
    'ortho': {
      title: 'Orthopedics Department (हड्डी रोग विभाग) Information',
      loc: 'Location: Rajkumari Amrit Kaur (RAK) OPD Block, Ground Floor, AIIMS New Delhi.',
      schedule: 'OPD Days: Monday to Saturday (8:30 AM to 1:00 PM).'
    },
    'med': {
      title: 'General Medicine Department (सामान्य चिकित्सा विभाग) Information',
      loc: 'Location: Main Hospital OPD Block, 1st Floor, AIIMS New Delhi.',
      schedule: 'OPD Days: Monday to Saturday (8:30 AM to 1:00 PM).'
    },
    'pedia': {
      title: 'Pediatrics Department (बाल रोग विभाग) Information',
      loc: 'Location: Mother & Child Block, 2nd Floor, AIIMS New Delhi.',
      schedule: 'OPD Days: Monday to Saturday (8:30 AM to 1:00 PM).'
    },
    'derma': {
      title: 'Dermatology Department (त्वचा रोग विभाग) Information',
      loc: 'Location: RAK OPD Block, 3rd Floor, AIIMS New Delhi.',
      schedule: 'OPD Days: Monday to Saturday (8:30 AM to 1:00 PM).'
    },
    'gynae': {
      title: 'Obstetrics & Gynecology (स्त्री एवं प्रसूति रोग विभाग) Information',
      loc: 'Location: Mother & Child Block, 1st Floor, AIIMS New Delhi.',
      schedule: 'OPD Days: Monday to Saturday (8:30 AM to 1:00 PM).'
    }
  };

  const curr = deptData[selectedDept] || deptData['cardio'];
  infoTitle.textContent = curr.title;
  infoLoc.textContent = curr.loc;
  infoSchedule.textContent = curr.schedule;
}

function updateCaseTypeUI() {
  const newRadio = document.querySelector('input[name="case-type"]:checked');
  selectedCaseType = newRadio ? newRadio.value : 'new';
  const newLabel = document.getElementById('case-new-label');
  const followLabel = document.getElementById('case-follow-label');
  if (newLabel && followLabel) {
    newLabel.classList.toggle('active', selectedCaseType === 'new');
    followLabel.classList.toggle('active', selectedCaseType === 'followup');
  }
}

function updateScarcityBanner() {
  const scarcityBox = document.getElementById('scarcity-box');
  if (!scarcityBox) return;

  // High demand scarcity solver for AIIMS Delhi cardio, nephro, neuro, onco
  const highDemandDepts = ['cardio', 'nephro', 'neuro', 'onco'];
  if (selectedHospital === 'aiims-delhi' && highDemandDepts.includes(selectedDept)) {
    scarcityBox.style.display = 'block';

    const titleEl = document.getElementById('scarcity-dept-title');
    const slotsEl = document.getElementById('alt-hosp-slots');
    const descEl = document.getElementById('alt-hosp-desc');

    const scarcityDetails = {
      'cardio': {
        title: 'High Demand Notice for Cardiology at AIIMS New Delhi',
        slots: '18 Slots at Safdarjung (2.3 km)',
        desc: 'Safdarjung Cardiology has verified open slots for tomorrow. Same faculty & zero waiting list.'
      },
      'nephro': {
        title: 'High Demand Notice for Nephrology (गुर्दा रोग) at AIIMS New Delhi',
        slots: '14 Slots at Safdarjung Nephrology & Dialysis (2.3 km)',
        desc: 'Safdarjung Nephrology Department has immediate slots for kidney consultations & routine dialysis evaluations.'
      },
      'neuro': {
        title: 'High Demand Notice for Neurology at AIIMS New Delhi',
        slots: '12 Slots at Safdarjung / RML Hospital (3.1 km)',
        desc: 'Dr. RML Hospital Neuro OPD has open slots available for this week with verified specialist doctors.'
      },
      'onco': {
        title: 'High Demand Notice for Medical Oncology at AIIMS New Delhi',
        slots: '9 Slots at Safdarjung Oncology (2.3 km)',
        desc: 'Safdarjung Cancer Institute has priority slots available with zero wait time.'
      }
    };

    const details = scarcityDetails[selectedDept] || scarcityDetails['cardio'];
    if (titleEl) titleEl.textContent = details.title;
    if (slotsEl) slotsEl.textContent = details.slots;
    if (descEl) descEl.textContent = details.desc;
  } else {
    scarcityBox.style.display = 'none';
  }
}

// Calendar Generator
function renderCalendarDays(year, month) {
  const grid = document.getElementById('calendar-days-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(d => {
    const col = document.createElement('div');
    col.className = 'cal-day day-name';
    col.textContent = d;
    grid.appendChild(col);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Blank days before first day of month
  for (let b = 0; b < firstDay; b++) {
    const blank = document.createElement('div');
    blank.className = 'cal-day empty';
    grid.appendChild(blank);
  }

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    const dayOfWeek = (firstDay + day - 1) % 7;

    // Simulation logic for slot status:
    // Sundays = Closed (red)
    // Days 2, 6, 14 = Available (green)
    // Days 3, 4, 5, 8, 9, 10 = Full (red)
    // Days 1, 7, 12 = 8:00 AM Tatkal drop (yellow)
    let statusClass = 'available';
    if (dayOfWeek === 0) {
      statusClass = 'full';
    } else if ([3, 4, 5, 8, 9, 10, 11, 15, 16, 17].includes(day)) {
      statusClass = 'full';
    } else if ([1, 7, 12, 18].includes(day)) {
      statusClass = 'tatkal';
    } else {
      statusClass = 'available';
    }

    if (day === 2) statusClass = 'available selected'; // Default selected

    cell.className = `cal-day ${statusClass}`;
    cell.textContent = day;
    cell.onclick = () => selectCalendarDay(cell, year, month, day, statusClass);

    grid.appendChild(cell);
  }
}

function selectCalendarDay(element, year, month, day, status) {
  if (status === 'full') {
    alert(`All regular slots for ${day} October are currently booked. Please click "Join Smart Waitlist" to get auto-allocated when someone cancels!`);
    return;
  }
  document.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');

  selectedBookingDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const previewBox = document.getElementById('selected-slot-box');
  const dateText = document.getElementById('selected-date-text');
  if (previewBox && dateText) {
    previewBox.style.display = 'block';
    dateText.textContent = `${day} October ${year} (${status === 'tatkal' ? 'Tatkal Quota' : 'Regular Quota'})`;
  }
}

function selectTimeChip(element) {
  document.querySelectorAll('.time-chip').forEach(c => c.classList.remove('active'));
  element.classList.add('active');
  selectedBookingTime = element.textContent;
}

function prevMonth() {
  renderCalendarDays(2026, 8);
  document.getElementById('cal-month-title').textContent = 'September 2026';
}

function nextMonth() {
  renderCalendarDays(2026, 10);
  document.getElementById('cal-month-title').textContent = 'November 2026';
}

// ─── RELIEF SCARCITY ACTIONS ──────────────────────────────────
function joinSmartWaitlist() {
  waitlistJoined = true;
  waitlistCount++;
  const btnText = document.getElementById('waitlist-btn-text');
  if (btnText) {
    btnText.textContent = `✓ Waitlist Joined (Position #${waitlistCount})`;
  }
  alert(`✅ Successfully joined the AIIMS Smart Waitlist (Position #${waitlistCount}). As soon as an existing patient cancels or reschedules, you will receive an automatic confirmation via SMS and WhatsApp!`);
}

function switchToSafdarjung() {
  const hospSelect = document.getElementById('book-hospital-select');
  if (hospSelect) hospSelect.value = 'safdarjung';
  selectedHospital = 'safdarjung';
  updateScarcityBanner();
  renderCalendarDays(2026, 9);
  alert('Switched to Safdarjung Hospital (2.3 km away). 18 slots are verified and open for immediate booking without waitlist delay!');
}

function requestUrgentTriage() {
  const reason = prompt('Please describe clinical urgency or upload referring doctor note details:');
  if (reason) {
    alert('Urgency triage quota applied. A clinical officer has assigned a priority fast-track slot for tomorrow at 10:00 AM.');
    goToWizardStage(4);
  }
}

// ─── 6. MULTI-RAIL AUTHENTICATION & MULTI-CHANNEL OTP ─────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-tab-panel').forEach(p => p.classList.remove('active'));

  event.currentTarget.classList.add('active');
  const panel = document.getElementById(`auth-panel-${tab}`);
  if (panel) panel.classList.add('active');
}

function sendMultiRailOTP() {
  const channelRadio = document.querySelector('input[name="otp-channel"]:checked');
  const channel = channelRadio ? channelRadio.value : 'sms';
  const entrySection = document.getElementById('otp-entry-section');
  const sendBtn = document.getElementById('btn-send-otp');

  if (entrySection) entrySection.style.display = 'block';
  if (sendBtn) sendBtn.textContent = 'OTP Sent ✓';

  let countdown = 30;
  const timerDisplay = document.getElementById('otp-timer-display');
  const interval = setInterval(() => {
    countdown--;
    if (timerDisplay) timerDisplay.textContent = `Resend in ${countdown}s`;
    if (countdown <= 0) {
      clearInterval(interval);
      if (timerDisplay) timerDisplay.textContent = 'Resend Available';
    }
  }, 1000);

  if (channel === 'whatsapp') {
    alert('💬 WhatsApp Instant OTP sent to +91 9876543210 (Code: 123456). High-speed zero delay delivery.');
  } else if (channel === 'voice') {
    alert('📞 Automated Voice Call initiated to +91 9876543210. Your verification code is 123456.');
  } else {
    alert('📩 SMS OTP dispatched via CDAC National Gateway. Code: 123456.');
  }
}

function fallbackToWhatsAppOTP() {
  alert('Switched to WhatsApp Instant OTP. Verification code dispatched immediately: 123456.');
}

function fallbackToVoiceOTP() {
  alert('Initiating automated voice call OTP. Please answer your incoming call: Code is 123456.');
}

function authenticateViaABHA() {
  const abhaInput = document.getElementById('abha-id-input').value;
  if (!abhaInput) {
    alert('Please enter your 14-digit ABHA ID or ABHA Address.');
    return;
  }
  alert('ABHA ID verified successfully! Linked Health Records and UHID retrieved from ABDM Gateway.');
  goToWizardStage(5);
}

function authenticateViaAadhaar() {
  alert('Aadhaar eKYC authenticated via UIDAI Gateway. Linked UHID: DL-AIIMS-893120.');
  goToWizardStage(5);
}

// ─── 7. CONFIRM APPOINTMENT & GENERATE AUTHENTIC SLIP ──────────
function confirmAppointmentAndBook() {
  const pName = document.getElementById('p-name').value || 'Ramesh Kumar';
  const pGender = document.getElementById('p-gender').value || 'Male';
  const pAge = document.getElementById('p-age').value || '48';

  const apptId = `ORS-2026-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const uhid = `DL-AIIMS-${Math.floor(100000 + Math.random() * 900000)}`;

  const hospNames = {
    'aiims-delhi': 'AIIMS New Delhi',
    'safdarjung': 'Safdarjung Hospital & VMMC, New Delhi',
    'rml': 'Dr. Ram Manohar Lohia Hospital, New Delhi',
    'aiims-rishikesh': 'AIIMS Rishikesh',
    'aiims-jodhpur': 'AIIMS Jodhpur',
    'aiims-patna': 'AIIMS Patna',
    'nimhans': 'NIMHANS Bengaluru'
  };

  const deptNames = {
    'cardio': 'Cardiology (CNC Block)',
    'nephro': 'Nephrology & Renal Transplant (Teaching Block)',
    'neuro': 'Neurology (CNC Block)',
    'onco': 'Medical Oncology (IRCH)',
    'ortho': 'Orthopedics (Rajkumari Amrit Kaur OPD)',
    'med': 'General Medicine',
    'pedia': 'Pediatrics',
    'derma': 'Dermatology',
    'gynae': 'Obstetrics & Gynecology'
  };

  // Populate Slip
  document.getElementById('slip-appt-id').textContent = apptId;
  document.getElementById('slip-uhid').textContent = uhid;
  document.getElementById('slip-hospital').textContent = hospNames[selectedHospital] || 'AIIMS New Delhi';
  document.getElementById('slip-dept').textContent = deptNames[selectedDept] || 'Cardiology';
  document.getElementById('slip-name').textContent = pName;
  document.getElementById('slip-demog').textContent = `${pAge} Y / ${pGender}`;
  document.getElementById('slip-datetime').textContent = `${selectedBookingDate}, ${selectedBookingTime}`;
  document.getElementById('slip-case-type').textContent = selectedCaseType === 'new' ? 'New Patient OPD (First Visit)' : 'Follow-up Consultation';

  goToWizardStage(5);
}

function downloadSlipPDF() {
  alert('Downloading Official Printable ORS Appointment Slip (PDF) with NIC Hologram & Gate Entry QR Code.');
}

function downloadManual() {
  alert('Downloading Official ORS Hospital Onboarding Manual (PDF).');
}

// ─── 8. LOGIN / AUTH MODAL ─────────────────────────────────────
function switchLoginRail(rail) {
  document.querySelectorAll('.auth-tabs-row .auth-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.login-rail-panel').forEach(p => p.classList.remove('active'));

  event.currentTarget.classList.add('active');
  const panel = document.getElementById(`login-rail-${rail}`);
  if (panel) panel.classList.add('active');
}

function performLogin() {
  alert('✅ Authentication Successful! You are logged into the ORS Patient Portal.');
  closeModal('auth-modal');
  const loginBtn = document.getElementById('header-login-btn');
  if (loginBtn) {
    loginBtn.innerHTML = '<span>👤 Ramesh Kumar (Logout)</span>';
  }
}

// ─── 9. LIVE SERVER FAILOVER & RESILIENT OFFLINE MODE ─────────
function toggleServerMirror() {
  isServerMirror = !isServerMirror;
  const statusLabel = document.getElementById('nic-status-label');
  const failoverBtn = document.getElementById('failover-btn-label');

  if (isServerMirror) {
    if (statusLabel) statusLabel.textContent = 'Gov Backup Mirror: Active (24ms)';
    if (failoverBtn) failoverBtn.textContent = 'Switch back to NIC Cloud Primary';
    alert('🔄 Traffic seamlessly routed to Government Backup Mirror (Disaster Recovery Center, Hyderabad). Zero service interruption.');
  } else {
    if (statusLabel) statusLabel.textContent = 'NIC Cloud: Online (18ms)';
    if (failoverBtn) failoverBtn.textContent = 'Switch to Gov Backup Mirror';
    alert('🔄 Routed back to NIC Cloud Primary Node (New Delhi).');
  }
}

function simulateOfflineMode() {
  alert('🌐 SIMULATING NETWORK OUTAGE: The portal has activated "Offline Resilient Queue". Your appointment booking data is safely encrypted in browser IndexedDB. Generated Offline Token: ORS-OFFLINE-9821. Auto-synchronization will occur the moment connection restores.');
}

// ─── 10. ANTI-FRAUD VERIFIER & SCAM REPORT ────────────────────
function verifySlipAuthenticity() {
  const input = document.getElementById('verify-slip-input').value.trim();
  const resultBox = document.getElementById('verification-result-box');
  if (!resultBox) return;

  resultBox.style.display = 'block';
  if (!input) {
    resultBox.innerHTML = '<span style="color:#e74c3c;">⚠️ Please enter an appointment reference number.</span>';
    return;
  }

  resultBox.innerHTML = `
    <div style="background:#e8f5e9; border:1px solid #c8e6c9; padding:12px; border-radius:6px; font-size:13px; color:#2e7d32;">
      <strong>✓ VERIFIED AUTHENTIC:</strong> Appointment ID <code>${input}</code> is officially registered on NIC eHospital servers.
      <p style="margin-top:4px; font-size:11.5px;">Valid for AIIMS New Delhi OPD gate entry. Fee paid: ₹0.00 (Free Service).</p>
    </div>
  `;
}

function submitScamReport() {
  const input = document.getElementById('scam-url-input').value.trim();
  if (!input) {
    alert('Please enter a fake website URL or WhatsApp number.');
    return;
  }
  alert(`🚨 Incident submitted to National Cyber Crime Reporting Portal (cybercrime.gov.in). URL "${input}" has been flagged for immediate blocking and enforcement action.`);
  document.getElementById('scam-url-input').value = '';
}

// ─── 11. OTHER FACILITIES MODAL HANDLERS ──────────────────────
function openFacilityModal(type) {
  const modal = document.getElementById('facility-modal');
  const title = document.getElementById('facility-modal-title');
  const body = document.getElementById('facility-modal-body');
  if (!modal || !title || !body) return;

  if (type === 'opd-card') {
    title.textContent = 'e-OPD Card Download & History';
    body.innerHTML = `
      <p>Enter your registered mobile number or UHID to view and reprint your official digital e-OPD card.</p>
      <div class="form-group" style="margin-top:14px;">
        <label>Mobile Number or UHID</label>
        <input type="text" class="styled-input" placeholder="e.g. 9876543210 or DL-AIIMS-123456" value="9876543210" />
      </div>
      <button class="btn-primary" onclick="alert('e-OPD Card fetched successfully! Opening PDF preview.')">Fetch e-OPD Card</button>
    `;
  } else if (type === 'payments') {
    title.textContent = 'Online Hospital Payments (OPD & Diagnostic Tests)';
    body.innerHTML = `
      <p>Pay OPD consultation charges or specialized test fees directly via SBI e-Pay, UPI, or Net Banking.</p>
      <div class="form-group" style="margin-top:14px;">
        <label>Hospital Bill / Receipt Number</label>
        <input type="text" class="styled-input" placeholder="Enter Bill No." value="BILL-AIIMS-2026-891" />
      </div>
      <div style="background:#f8fafc; padding:12px; border-radius:6px; margin-bottom:14px; font-size:13px;">
        <div>Amount Due: <strong>₹10.00 (OPD Card Registration)</strong></div>
        <div>Payment Gateway: <strong>SBI e-Pay / Bharat QR</strong></div>
      </div>
      <button class="btn-primary" onclick="alert('Redirecting to SBI e-Pay Government Gateway...')">Proceed to Pay ₹10.00</button>
    `;
  } else if (type === 'lab-report') {
    title.textContent = 'Diagnostic Lab Reports (Blood, Pathology, Radiology)';
    body.innerHTML = `
      <p>Access your laboratory test results, MRI, CT scans, and pathology reports from central government hospitals.</p>
      <div class="form-group" style="margin-top:14px;">
        <label>UHID / Patient Reference Number</label>
        <input type="text" class="styled-input" placeholder="e.g. DL-AIIMS-893120" value="DL-AIIMS-893120" />
      </div>
      <div class="form-group">
        <label>Sample / Bill Number</label>
        <input type="text" class="styled-input" placeholder="e.g. LAB-2026-4412" value="LAB-2026-4412" />
      </div>
      <button class="btn-primary" onclick="alert('Test Report Found: Complete Blood Count (CBC) & Lipid Profile. Generating PDF...')">View &amp; Download Lab Report</button>
    `;
  } else if (type === 'blood-availability') {
    title.textContent = 'e-Raktkosh Live Blood Bank Stock Availability';
    body.innerHTML = `
      <p>Real-time blood component inventory across central and state government blood centers.</p>
      <div class="form-grid-2" style="margin-top:14px;">
        <div class="form-group">
          <label>Blood Group</label>
          <select class="styled-input">
            <option>All Blood Groups</option>
            <option selected>O Positive (O+)</option>
            <option>A Positive (A+)</option>
            <option>B Positive (B+)</option>
            <option>AB Positive (AB+)</option>
            <option>O Negative (O-)</option>
          </select>
        </div>
        <div class="form-group">
          <label>City / State</label>
          <select class="styled-input">
            <option selected>Delhi (NCT)</option>
            <option>Mumbai</option>
            <option>Bengaluru</option>
          </select>
        </div>
      </div>
      <div style="background:#ffebee; border:1px solid #ffcdd2; padding:12px; border-radius:6px; font-size:13px; color:#b71c1c; margin-bottom:14px;">
        <div>🩸 <strong>AIIMS New Delhi Blood Bank:</strong> 42 Units O+ Available</div>
        <div>🩸 <strong>Safdarjung Hospital:</strong> 28 Units O+ Available</div>
        <div>🩸 <strong>Dr. RML Hospital:</strong> 19 Units O+ Available</div>
      </div>
      <button class="btn-primary" onclick="alert('Connecting with AIIMS Main Blood Center Helpline: 011-26593450')">Contact Blood Bank</button>
    `;
  }

  modal.style.display = 'flex';
}

function openVideoPlayer(type) {
  alert(`Playing Official Ayushman Bharat Health Account (${type.toUpperCase()}) Video Guidance.`);
}

// ─── 12. ACCESSIBILITY & GRAMIN SAHAYAK MODE ──────────────────
function openAccessibilityMenu() {
  openModal('accessibility-modal');
}

function adjustFontSize(delta) {
  if (delta === 0) {
    currentFontSize = 0;
    document.documentElement.style.fontSize = '15px';
  } else if (delta > 0 && currentFontSize < 2) {
    currentFontSize++;
    document.documentElement.style.fontSize = `${15 + currentFontSize * 2}px`;
  } else if (delta < 0 && currentFontSize > -1) {
    currentFontSize--;
    document.documentElement.style.fontSize = `${15 + currentFontSize * 2}px`;
  }
}

function setContrast(mode) {
  if (mode === 'high') {
    document.body.style.filter = 'contrast(1.3) brightness(0.95)';
    document.body.style.background = '#0a1128';
  } else if (mode === 'yellow') {
    document.body.style.filter = 'contrast(1.5)';
    document.body.style.background = '#000000';
    document.body.style.color = '#ffff00';
  } else {
    document.body.style.filter = 'none';
    document.body.style.background = '#f8f9fa';
    document.body.style.color = '#212529';
  }
}

function toggleGraminMode() {
  isGraminMode = !isGraminMode;
  const label = document.getElementById('gramin-mode-label');
  if (isGraminMode) {
    if (label) label.textContent = 'Disable सरल ग्रामीण मोड (Active)';
    document.body.classList.add('gramin-easy-mode');
    alert('सरल ग्रामीण सहायक मोड सक्रिय: बड़े अक्षर, आसान बटन और आवाज़ निर्देश चालू किए गए हैं।');
    playLangSample('hi', 'सरल ग्रामीण मोड');
  } else {
    if (label) label.textContent = 'Enable सरल ग्रामीण मोड';
    document.body.classList.remove('gramin-easy-mode');
    alert('सरल ग्रामीण मोड बंद किया गया।');
  }
}

function toggleVoiceAssistant() {
  const bubble = document.getElementById('voice-bubble');
  if (bubble) {
    bubble.style.display = bubble.style.display === 'none' ? 'flex' : 'none';
    if (bubble.style.display === 'flex') {
      playVoiceWelcome();
    }
  }
}

function closeVoiceBubble() {
  const bubble = document.getElementById('voice-bubble');
  if (bubble) bubble.style.display = 'none';
}

// ─── 13. MODAL HELPERS ─────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    const anyModalOpen = Array.from(document.querySelectorAll('.modal-backdrop')).some(
      m => m.style.display === 'flex'
    );
    if (!anyModalOpen) {
      document.body.classList.remove('modal-open');
    }
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openLegalModal(type) {
  const modal = document.getElementById('info-modal');
  const title = document.getElementById('info-modal-title');
  const body = document.getElementById('info-modal-body');
  if (!modal || !title || !body) return;

  const titles = {
    privacy: 'Privacy Policy',
    terms: 'Terms and Conditions',
    refund: 'Refund and Cancellation Policy',
    about: 'About Online Registration System (ORS)',
    sitemap: 'Portal Site Map'
  };

  const bodies = {
    privacy: '<p>The Online Registration System (ORS) respects patient confidentiality. Personal and medical records linked via ABHA/UHID are cryptographically secured and governed by the Digital Personal Data Protection Act and ABDM health data standards.</p>',
    terms: '<p>ORS is an official Digital India service designed to streamline OPD appointments and reduce queue congestion at government hospitals. Appointments are allocated subject to doctor duty schedules and clinical emergency triage policies.</p>',
    refund: '<p>ORS appointment booking is 100% free of charge. For hospital diagnostic charges or laboratory test payments made online, refunds for cancelled or unperformed tests are processed directly into the source bank account within 3 to 5 working days.</p>',
    about: '<p>Online Registration System (ORS) links hospitals nationwide for online appointments, HMIS integration, lab reports, and blood availability hosted on National Informatics Centre (NIC) cloud services under the Ministry of Health and Family Welfare.</p>',
    sitemap: '<ul><li>Home</li><li>Book Appointment</li><li>Teleconsultation</li><li>Scan and Share</li><li>e-OPD Card</li><li>Payments</li><li>Lab Reports</li><li>Blood Availability</li><li>Dashboard</li><li>ABHA Health ID</li></ul>'
  };

  title.textContent = titles[type] || 'Information';
  body.innerHTML = bodies[type] || '';
  modal.style.display = 'flex';
}
