import { TextToSpeech } from "@capacitor-community/text-to-speech";

(() => {
  let requestId = 0;
  let audioContext = null;
  let audioUnlocked = false;
  let questionTimer = null;
  let lastAutoQuestion = "";

  const statusNode = () =>
    document.getElementById("speechResult") ||
    document.getElementById("lessonStatus") ||
    document.getElementById("voiceStatus");

  const setStatus = message => {
    const node = statusNode();
    if (node) node.textContent = message;
  };

  const isAndroidNative = () => {
    try {
      const cap = window.Capacitor;
      return !!cap && (
        (typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) ||
        (typeof cap.getPlatform === "function" && cap.getPlatform() === "android")
      ) && (!cap.getPlatform || cap.getPlatform() === "android");
    } catch (_) {
      return false;
    }
  };

  const getAudioContext = () => {
    if (audioContext) return audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      audioContext = new AudioContextClass();
      return audioContext;
    } catch (_) {
      return null;
    }
  };

  const tone = (frequency, duration, delay = 0, volume = 0.07) => {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === "closed") return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.025);
    } catch (_) {}
  };

  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      audioUnlocked = true;
    } catch (_) {}
  };

  const sound = kind => {
    if (!audioUnlocked) unlockAudio();
    if (kind === "correct") {
      tone(660, 0.13, 0, 0.09);
      tone(880, 0.18, 0.12, 0.09);
      tone(1046, 0.22, 0.28, 0.08);
    } else if (kind === "wrong") {
      tone(330, 0.16, 0, 0.07);
      tone(260, 0.2, 0.13, 0.06);
    } else {
      tone(520, 0.055, 0, 0.035);
    }
  };

  document.addEventListener("pointerdown", event => {
    unlockAudio();
    if (event.target && event.target.closest && event.target.closest("button,[role='button']")) {
      sound("tap");
    }
  }, { capture: true, passive: true });

  const waitForBrowserVoices = synth => new Promise(resolve => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      try { synth.removeEventListener("voiceschanged", done); } catch (_) {}
      resolve(synth.getVoices() || []);
    };
    const current = synth.getVoices() || [];
    if (current.length) return resolve(current);
    try { synth.addEventListener("voiceschanged", done); } catch (_) {}
    setTimeout(done, 900);
  });

  const browserSpeak = async (text, lang, id) => {
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) {
      setStatus("الصوت غير متاح في هذا المتصفح. جرّب محرك تحويل النص إلى كلام في إعدادات أندرويد.");
      return false;
    }
    try {
      synth.cancel();
      const voices = await waitForBrowserVoices(synth);
      if (id !== requestId) return false;
      const prefix = lang.slice(0, 2).toLowerCase();
      const matches = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
      const female = matches.find(v => /female|woman|زينة|سلمى|أميرة|ليلى|salma|zeina|amira|laila|aria/i.test(v.name || ""));
      const exact = female || matches.find(v => v.lang.toLowerCase() === lang.toLowerCase());
      const fallback = matches[0];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = exact?.lang || fallback?.lang || lang;
      utterance.rate = prefix === "ar" ? 0.92 : 0.92;
      utterance.pitch = 1.12;
      utterance.volume = 1;
      if (exact || fallback) utterance.voice = exact || fallback;
      utterance.onstart = () => { if (id === requestId) setStatus("🔊 اسمع كويس يا بطل"); };
      utterance.onend = () => { if (id === requestId) setStatus("👏 خلصنا!"); };
      utterance.onerror = () => {
        if (id === requestId) setStatus("الصوت لم يبدأ. ارفع صوت الوسائط وتأكد من تثبيت صوت اللغة على الهاتف.");
      };
      synth.resume();
      synth.speak(utterance);
      return true;
    } catch (_) {
      setStatus("تعذر تشغيل صوت المتصفح. راجع إعدادات تحويل النص إلى كلام.");
      return false;
    }
  };

  const speak = async (rawText, lang = "ar-EG") => {
    const text = String(rawText || "").trim();
    if (!text) return false;
    const id = ++requestId;
    const language = String(lang || "ar-EG");
    const prefix = language.toLowerCase().startsWith("ar") ? "ar" : "en";
    setStatus("⏳ جاري تشغيل الصوت...");
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    try { window.MatthewClips?.stop(); } catch (_) {}

    // صوت الميس المسجل: لو الجملة عندنا كمقطع طبيعي نشغّله بدل صوت الجهاز الآلي.
    try {
      if (window.MatthewClips && window.MatthewClips.play(text)) {
        if (isAndroidNative()) { try { await TextToSpeech.stop(); } catch (_) {} }
        if (id === requestId) setStatus("🔊 اسمع صوت الميس يا بطل");
        return true;
      }
    } catch (_) {}

    if (isAndroidNative()) {
      try {
        try { await TextToSpeech.stop(); } catch (_) {}
        if (id !== requestId) return false;
        const options = {
          text,
          lang: language,
          rate: prefix === "ar" ? 0.95 : 0.92,
          pitch: 1.15,
          volume: 1,
          queueStrategy: 0
        };
        if (id !== requestId) return false;
        await TextToSpeech.speak(options);
        if (id === requestId) setStatus("🔊 الصوت الأصلي شغال");
        return true;
      } catch (_) {
        if (id !== requestId) return false;
        setStatus("جاري تجربة محرك الصوت البديل...");
      }
    }
    return browserSpeak(text, language, id);
  };

  const speakSequence = (texts, lang = "ar-EG") => {
    const list = (texts || []).map(x => String(x || "").trim()).filter(Boolean);
    if (!list.length) return false;
    try {
      if (window.MatthewClips && window.MatthewClips.playSequence(list)) {
        requestId++;
        setStatus("🔊 اسمع صوت الميس يا بطل");
        return true;
      }
    } catch (_) {}
    return speak(list.join("، "), lang);
  };

  const stop = async () => {
    requestId++;
    try { window.MatthewClips?.stop(); } catch (_) {}
    try { await TextToSpeech.stop(); } catch (_) {}
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  };

  const test = async () => {
    unlockAudio();
    sound("correct");
    return speak("أهلاً يا ماثيو يا بطل! أنا الميس بتاعتك، يلا بينا نتعلّم ونلعب مع بعض.", "ar-EG");
  };

  const praiseKeys = ["praise1", "praise2", "praise3", "praise4", "praise5"];
  const tryKeys = ["try1", "try2", "try3"];
  let praiseIndex = 0, tryIndex = 0;
  const feedback = kind => {
    const id = ++requestId;
    try { window.MatthewClips?.stop(); } catch (_) {}
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (isAndroidNative()) { try { TextToSpeech.stop(); } catch (_) {} }
    sound(kind);
    try {
      const clips = window.MatthewClips;
      if (!clips) return;
      const key = kind === "correct"
        ? praiseKeys[praiseIndex++ % praiseKeys.length]
        : kind === "wrong" ? tryKeys[tryIndex++ % tryKeys.length] : null;
      if (key) setTimeout(() => { if (id === requestId) clips.playKey(key); }, 280);
    } catch (_) {}
  };

  window.MatthewVoice = {
    speak,
    speakSequence,
    stop,
    test,
    unlock: unlockAudio,
    feedback,
    installVoiceData: async () => {
      try { await TextToSpeech.openInstall(); return true; }
      catch (_) {
        setStatus("افتح إعدادات تحويل النص إلى كلام في أندرويد وثبّت بيانات الصوت العربي والإنجليزي.");
        return false;
      }
    }
  };

  const addHomeTestButton = () => {
    const hero = document.querySelector(".hero-copy");
    if (!hero || document.getElementById("voiceTestBtn")) return;
    const button = document.createElement("button");
    button.id = "voiceTestBtn";
    button.type = "button";
    button.className = "voice-button home-voice-test";
    button.textContent = "🔊 تجربة الصوت";
    button.addEventListener("click", test);
    hero.append(button);
  };

  const addPronunciationChallenge = () => {
    const gameList = document.getElementById("gameList");
    const main = document.querySelector("main");
    if (!gameList || !main || document.getElementById("pronunciationChallenge")) return;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "game-card pink";
    card.innerHTML = '<span class="game-icon">🎙️</span><strong>تحدي النطق</strong><small>اسمع الكلمة وحاول تنطقها</small><span class="play">ابدأ التدريب ←</span>';
    gameList.append(card);

    const panel = document.createElement("section");
    panel.id = "pronunciationChallenge";
    panel.className = "quiz-panel hidden";
    panel.innerHTML = '<div class="quiz-top"><button id="pronounceBack" class="back" type="button">→ رجوع</button><strong>🎙️ تحدي النطق</strong><span id="pronounceScore">0 / 0</span></div><div class="language-switch"><button id="pronounceArabic" class="secondary" type="button">العربية</button><button id="pronounceEnglish" class="primary" type="button">English</button></div><div class="pronounce-card"><div id="pronounceEmoji" class="question-emoji">🍎</div><h2 id="pronounceWord">Apple</h2><p id="pronounceMeaning">تفاحة</p><button id="pronounceListen" class="voice-button" type="button">🔊 اسمع النطق</button><button id="pronounceRecord" class="primary" type="button">🎤 اضغط واتكلم</button><p id="pronounceStatus" class="feedback" aria-live="polite">اسمع الكلمة وحاول تكررها</p><button id="pronounceNext" class="secondary" type="button">كلمة جديدة ↻</button></div><p class="voice-note">التعرف على كلامك يعتمد على دعم الهاتف والمتصفح وقد يحتاج اتصالاً بالإنترنت.</p>';
    main.insertBefore(panel, document.querySelector("footer"));

    const lists = {
      ar: [
        {word:"أسد",meaning:"حيوان قوي",emoji:"🦁"},
        {word:"تفاحة",meaning:"فاكهة لذيذة",emoji:"🍎"},
        {word:"قمر",meaning:"ينير الليل",emoji:"🌙"},
        {word:"مدرسة",meaning:"مكان التعلم",emoji:"🏫"},
        {word:"سيارة",meaning:"وسيلة مواصلات",emoji:"🚗"},
        {word:"فراشة",meaning:"حشرة جميلة",emoji:"🦋"},
        {word:"كتاب",meaning:"نقرأ فيه",emoji:"📘"},
        {word:"شمس",meaning:"تنير النهار",emoji:"☀️"}
      ],
      en: [
        {word:"Apple",meaning:"تفاحة",emoji:"🍎"},
        {word:"Cat",meaning:"قطة",emoji:"🐱"},
        {word:"Sun",meaning:"شمس",emoji:"☀️"},
        {word:"Book",meaning:"كتاب",emoji:"📘"},
        {word:"Ball",meaning:"كرة",emoji:"⚽"},
        {word:"Dog",meaning:"كلب",emoji:"🐶"},
        {word:"Milk",meaning:"حليب",emoji:"🥛"},
        {word:"Fish",meaning:"سمكة",emoji:"🐟"}
      ]
    };
    let language = "en", current = null, recognition = null, score = 0, attempts = 0;
    const showScore = () => { panel.querySelector("#pronounceScore").textContent = score + " / " + attempts; };
    const nextWord = () => {
      const list = lists[language];
      let candidate = list[Math.floor(Math.random() * list.length)];
      if (current && list.length > 1) {
        while (candidate.word === current.word) candidate = list[Math.floor(Math.random() * list.length)];
      }
      current = candidate;
      panel.querySelector("#pronounceEmoji").textContent = current.emoji;
      panel.querySelector("#pronounceWord").textContent = current.word;
      panel.querySelector("#pronounceMeaning").textContent = current.meaning;
      panel.querySelector("#pronounceStatus").textContent = "اسمع الكلمة وحاول تكررها";
      showScore();
    };
    const setLanguage = value => {
      language = value;
      panel.querySelector("#pronounceArabic").className = value === "ar" ? "primary" : "secondary";
      panel.querySelector("#pronounceEnglish").className = value === "en" ? "primary" : "secondary";
      current = null;
      nextWord();
    };
    const open = () => {
      gameList.classList.add("hidden");
      document.getElementById("learningList")?.classList.add("hidden");
      document.getElementById("quiz")?.classList.add("hidden");
      document.getElementById("result")?.classList.add("hidden");
      panel.classList.remove("hidden");
      setLanguage("en");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    card.addEventListener("click", open);
    panel.querySelector("#pronounceBack").addEventListener("click", () => {
      panel.classList.add("hidden");
      gameList.classList.remove("hidden");
      document.getElementById("learningList")?.classList.remove("hidden");
      stop();
    });
    panel.querySelector("#pronounceArabic").addEventListener("click", () => setLanguage("ar"));
    panel.querySelector("#pronounceEnglish").addEventListener("click", () => setLanguage("en"));
    panel.querySelector("#pronounceListen").addEventListener("click", () => {
      if (current) speak(current.word, language === "ar" ? "ar-EG" : "en-US");
    });
    panel.querySelector("#pronounceNext").addEventListener("click", nextWord);
    panel.querySelector("#pronounceRecord").addEventListener("click", () => {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      const status = panel.querySelector("#pronounceStatus");
      const button = panel.querySelector("#pronounceRecord");
      if (!SpeechRecognitionClass) {
        status.textContent = "ميزة التعرف على الكلام غير مدعومة هنا. استخدم زر اسمع النطق للتدريب.";
        return;
      }
      if (recognition) { try { recognition.abort(); } catch (_) {} }
      recognition = new SpeechRecognitionClass();
      recognition.lang = language === "ar" ? "ar-EG" : "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      button.disabled = true;
      button.textContent = "🎙️ سامعك...";
      recognition.onresult = event => {
        const clean = value => value.toLocaleLowerCase().replace(/[ًٌٍَُِّْـ.,!?؟]/g, "").trim();
        const alternatives = event.results[0];
        const heard = alternatives[0].transcript.trim();
        const correct = Array.from(alternatives).some(item => clean(item.transcript) === clean(current.word));
        attempts++;
        if (correct) { score++; sound("correct"); }
        else sound("wrong");
        status.textContent = (correct ? "👏 ممتاز! نطق جميل. " : "محاولة حلوة! ") + "سمعت: " + heard + " — الكلمة: " + current.word;
        showScore();
      };
      recognition.onerror = event => {
        status.textContent = event.error === "not-allowed" ? "اسمح باستخدام الميكروفون من إعدادات التطبيق." : "مش قادر أسمع بوضوح. جرّب مرة تانية.";
      };
      recognition.onend = () => { button.disabled = false; button.textContent = "🎤 اضغط واتكلم"; };
      try { recognition.start(); }
      catch (_) { button.disabled = false; button.textContent = "🎤 اضغط واتكلم"; }
    });
  };

  const ensureQuestionButton = area => {
    if (!area || area.querySelector(".speak-question")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "voice-button speak-question";
    button.textContent = "🔊 إعادة سماع السؤال";
    button.addEventListener("click", () => {
      const question = document.getElementById("questionText")?.textContent?.trim();
      if (question) speak(question, "ar-EG");
    });
    const heading = area.querySelector("#questionText");
    if (heading) heading.after(button);
  };

  const observeQuestions = () => {
    const area = document.querySelector(".question-area");
    if (!area) return;
    ensureQuestionButton(area);
    const heading = area.querySelector("#questionText");
    if (!heading) return;
    const question = heading.textContent.trim();
    if (!question || question === lastAutoQuestion) return;
    lastAutoQuestion = question;
    clearTimeout(questionTimer);
    questionTimer = setTimeout(() => speak(question, "ar-EG"), 180);
  };

  const observer = new MutationObserver(() => {
    addHomeTestButton();
    addPronunciationChallenge();
    observeQuestions();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    addHomeTestButton();
    addPronunciationChallenge();
    observeQuestions();
  }
})();
