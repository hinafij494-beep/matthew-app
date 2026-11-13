import { TextToSpeech } from "@capacitor-community/text-to-speech";

(() => {
  let requestId = 0;
  let audioContext = null;
  let audioUnlocked = false;

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

  // Round 3.2.2 P0-4: recorded clips ONLY — no device speechSynthesis
  // and no Capacitor TextToSpeech fallback. A text with no recorded clip
  // stays silent (the UI shows a listen prompt) instead of speaking in a
  // mismatched device voice ("عربي في إنجليزي مشقلب").
  // EXCEPTION — the pronunciation challenge below: hearing a single word
  // and repeating it IS the feature, and most practice words have no
  // recorded clip. It gets its own scoped device-TTS path (challengeSpeak),
  // clip-first, with a voice matched to the word's language, so an English
  // word is never spoken by an Arabic voice or vice versa.
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
  const challengeSpeak = async (text, lang, id) => {
    // Clip first (the teacher's voice where a clip exists), device voice
    // only for practice words with no clip — never for narration.
    try { if (window.MatthewClips && window.MatthewClips.play(text, lang)) return true; } catch (_) {}
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) {
      setStatus("الصوت غير متاح في هذا المتصفح. جرّب محرك تحويل النص إلى كلام في إعدادات أندرويد.");
      return false;
    }
    try {
      synth.cancel();
      const voices = await waitForBrowserVoices(synth);
      if (id !== requestId) return false;
      const prefix = String(lang || "ar-EG").slice(0, 2).toLowerCase();
      const matches = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
      const female = matches.find(v => /female|woman|زينة|سلمى|أميرة|ليلى|salma|zeina|amira|laila|aria/i.test(v.name || ""));
      const exact = female || matches.find(v => v.lang.toLowerCase() === String(lang).toLowerCase());
      const fallback = matches[0];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = exact?.lang || fallback?.lang || lang;
      utterance.rate = 0.92;
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
    } catch (_) { return false; }
  };
  let lastSpokenText = "", lastSpokenAt = 0;
  const speak = async (rawText, lang = "ar-EG") => {
    const text = String(rawText || "").trim();
    if (!text) return false;
    const id = ++requestId;
    const language = String(lang || "ar-EG");
    // 300ms debounce (review P4): a repeated tap of the same listen
    // button while the clip is starting is ignored, never double-spoken.
    const now = Date.now();
    if (text === lastSpokenText && now - lastSpokenAt < 300) return true;
    lastSpokenText = text; lastSpokenAt = now;
    setStatus("⏳ جاري تشغيل الصوت...");
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    try { window.MatthewClips?.stop(); } catch (_) {}

    // صوت الميس المسجل: لو الجملة عندنا كمقطع طبيعي نشغّله.
    try {
      if (window.MatthewClips && window.MatthewClips.play(text, language)) {
        if (id === requestId) setStatus("🔊 اسمع صوت الميس يا بطل");
        return true;
      }
    } catch (_) {}

    // No recorded clip: stay silent (clips-only by design).
    if (id === requestId) setStatus("🎧 اسمع من الميس — المقطع ده لسه بيتسجّل");
    return false;
  };

  // Round 3.2.3 item 14a: optional onDone, passed through to
  // MatthewClips.playSequence — it owns the callback (fires once when the
  // last clip ends, or async when there is nothing to play). Only when
  // the clips runtime is absent entirely does speakSequence fire it
  // itself, so a caller waiting on it never hangs. A debounced duplicate
  // tap does not re-register: the in-flight sequence's own callback
  // handles it.
  const speakSequence = (texts, lang = "ar-EG", onDone) => {
    const list = (texts || []).map(x => String(x || "").trim()).filter(Boolean);
    if (!list.length) { if (typeof onDone === "function") setTimeout(onDone, 0); return false; }
    // 300ms debounce on the whole sequence (review P4) — but NEVER for a
    // chained caller: swallowing an onDone call would hang the chain
    // (the next screen would never open). A debounced repeat is a
    // double-tap; a chained call is programmatic sequencing, so it
    // re-plays and its own onDone fires at the end.
    if (joined === lastSpokenText && now - lastSpokenAt < 300 && typeof onDone !== "function") return true;
    lastSpokenText = joined; lastSpokenAt = now;
    let invoked = false;
    try {
      // The clip runtime plays element-by-element and skips any item with
      // no recorded clip, so one missing key never drops the whole
      // question (review 2.5).
      if (window.MatthewClips) {
        invoked = true;
        if (window.MatthewClips.playSequence(list, lang, onDone)) {
          requestId++;
          setStatus("🔊 اسمع صوت الميس يا بطل");
          return true;
        }
      }
    } catch (_) {}
    if (!invoked && typeof onDone === "function") setTimeout(onDone, 0);
    return false;
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

  // Round 3.2.1 note 25b: مس نانسي joins the praise rotation (1 in 6) —
  // «بحبك يا ماثيو، برافو يا بطل!» (recorded clip praise_nancy, Nancy voice).
  // Nancy-lines draft: her 10 praise variants + 5 gentle try-agains are
  // woven in alongside — every 3rd correct answer gets a rotating
  // nancy_praise_* line, every 2nd wrong answer a rotating nancy_retry_*
  // line — so her voice is regular but never every single time, and the
  // old praise1–5 / try1–3 clips keep their slots. Clip keys are stable:
  // her real recordings will replace these TTS clips under the same keys.
  const praiseKeys = ["praise1", "praise2", "praise3", "praise4", "praise5", "praise_nancy"];
  const nancyPraiseKeys = ["nancy_praise_1", "nancy_praise_2", "nancy_praise_3", "nancy_praise_4", "nancy_praise_5", "nancy_praise_6", "nancy_praise_7", "nancy_praise_8", "nancy_praise_9", "nancy_praise_10"];
  const tryKeys = ["try1", "try2", "try3"];
  const nancyRetryKeys = ["nancy_retry_1", "nancy_retry_2", "nancy_retry_3", "nancy_retry_4", "nancy_retry_5"];
  let praiseIndex = 0, tryIndex = 0, nancyPraiseIndex = 0, nancyRetryIndex = 0, correctCount = 0, wrongCount = 0;
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
        ? (++correctCount % 3 === 0
          ? nancyPraiseKeys[nancyPraiseIndex++ % nancyPraiseKeys.length]
          : praiseKeys[praiseIndex++ % praiseKeys.length])
        : kind === "wrong"
          ? (++wrongCount % 2 === 0
            ? nancyRetryKeys[nancyRetryIndex++ % nancyRetryKeys.length]
            : tryKeys[tryIndex++ % tryKeys.length])
          : null;
      if (key) setTimeout(() => {
        if (id === requestId && clips.playKey(key)) return;
        // Unpacked Nancy clip (not generated yet): fall back to the old
        // generic clip of the same mood, never silence.
        if (id === requestId && (key === "praise_nancy" || key.startsWith("nancy_praise_"))) clips.playKey("praise1");
        else if (id === requestId && key.startsWith("nancy_retry_")) clips.playKey("try1");
      }, 280);
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
    panel.innerHTML = '<div class="quiz-top"><button id="pronounceBack" class="back" type="button">→ رجوع</button><strong>🎙️ تحدي النطق</strong><span id="pronounceScore">0 / 0</span></div><div class="language-switch"><button id="pronounceArabic" class="secondary" type="button">العربية</button><button id="pronounceEnglish" class="primary" type="button">الإنجليزية</button></div><div class="pronounce-card"><div id="pronounceEmoji" class="question-emoji">🍎</div><h2 id="pronounceWord">Apple</h2><p id="pronounceMeaning">تفاحة</p><button id="pronounceListen" class="voice-button" type="button">🔊 اسمع النطق</button><button id="pronounceCorrect" class="primary" type="button">👍 نطقها صح</button><button id="pronounceRetry" class="secondary" type="button">🔄 جرّب تاني</button><p id="pronounceStatus" class="feedback" aria-live="polite">اسمع الكلمة وحاول تكررها</p><button id="pronounceNext" class="secondary" type="button">كلمة جديدة<span class="pager-arrow">←</span></button></div><p class="voice-note">ماما أو بابا يسمعوا ماثيو، ولو نطق الكلمة صح دوسوا 👍 نطقها صح!</p>';
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
    let language = "en", current = null, score = 0, attempts = 0, wordToken = 0;
    const arDigits = v => String(v).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]);
    const showScore = () => { panel.querySelector("#pronounceScore").textContent = arDigits(score) + " / " + arDigits(attempts); };
    const nextWord = () => {
      wordToken++;
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
      speak(current.word, language === "ar" ? "ar-EG" : "en-US");
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
      if (current) challengeSpeak(current.word, language === "ar" ? "ar-EG" : "en-US", ++requestId);
    });
    panel.querySelector("#pronounceNext").addEventListener("click", nextWord);
    // Round 3.2.3 item 3 — PARENT-JUDGED mode: the 🎤 button can never work
    // in the APK (Android WebView has no SpeechRecognition), so the dead
    // mic path and its "غير مدعومة" message are gone. The parent listens
    // and judges: "نطقها صح" counts a correct answer + praise and moves
    // on; "جرّب تاني" replays the word for another try.
    panel.querySelector("#pronounceCorrect").addEventListener("click", () => {
      if (!current) return;
      attempts++;
      score++;
      sound("correct");
      panel.querySelector("#pronounceStatus").textContent = "👏 ممتاز! نطق جميل يا بطل!";
      showScore();
      try { feedback("correct"); } catch (_) {}
      const tk = wordToken;
      setTimeout(() => { if (tk === wordToken) nextWord(); }, 1400);
    });
    panel.querySelector("#pronounceRetry").addEventListener("click", () => {
      if (!current) return;
      panel.querySelector("#pronounceStatus").textContent = "اسمع كويس وحاول تاني يا بطل!";
      challengeSpeak(current.word, language === "ar" ? "ar-EG" : "en-US", ++requestId);
    });
  };

  const ensureQuestionButton = area => {
    // Round 3.2.3 item 18: index.html already has a STATIC #replayBtn
    // (wired in app.js to window.__askNow) — if it is present, never add
    // a second «اسمع السؤال» button next to it.
    if (!area || area.querySelector(".speak-question") || area.querySelector("#replayBtn")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "voice-button speak-question";
    button.textContent = "🔊 اسمع السؤال";
    button.addEventListener("click", () => {
      const question = document.getElementById("questionText")?.textContent?.trim();
      if (!question) return;
      let choices = [];
      try { if (typeof lastChoices !== "undefined" && Array.isArray(lastChoices)) choices = lastChoices; } catch (_) {}
      if (choices.length) speakSequence([question, ...choices], "ar-EG");
      else speak(question, "ar-EG");
    });
    const heading = area.querySelector("#questionText");
    if (heading) heading.after(button);
  };

  // Round 3.2.1: no auto-narration here — showQuestion() already speaks the
  // question + choices in order (350ms). Re-speaking the question alone at
  // 180ms made it play twice. This observer only keeps the replay button.
  const observeQuestions = () => {
    const area = document.querySelector(".question-area");
    if (!area) return;
    ensureQuestionButton(area);
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
