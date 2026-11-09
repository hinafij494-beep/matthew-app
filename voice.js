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
      const exact = matches.find(v => v.lang.toLowerCase() === lang.toLowerCase());
      const fallback = matches[0];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = exact?.lang || fallback?.lang || lang;
      utterance.rate = prefix === "ar" ? 0.82 : 0.85;
      utterance.pitch = 1.04;
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

    if (isAndroidNative()) {
      try {
        try { await TextToSpeech.stop(); } catch (_) {}
        if (id !== requestId) return false;
        let voices = [];
        try {
          const result = await TextToSpeech.getSupportedVoices();
          voices = Array.isArray(result?.voices) ? result.voices : [];
        } catch (_) {}
        const candidates = voices.map((voice, index) => ({ voice, index }))
          .filter(item => item.voice.lang && item.voice.lang.toLowerCase().startsWith(prefix));
        const requested = language.toLowerCase();
        const selected = candidates.find(item => item.voice.lang.toLowerCase() === requested) || candidates[0];
        const options = {
          text,
          lang: selected?.voice.lang || (prefix === "ar" ? "ar-EG" : "en-US"),
          rate: prefix === "ar" ? 0.82 : 0.85,
          pitch: 1.04,
          volume: 1,
          queueStrategy: 0
        };
        if (selected) options.voice = selected.index;
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

  const stop = async () => {
    requestId++;
    try { await TextToSpeech.stop(); } catch (_) {}
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  };

  const test = async () => {
    unlockAudio();
    sound("correct");
    return speak("أهلاً يا ملك ماثيو! يلا نتعلم ونلعب. برافو يا بطل!", "ar-EG");
  };

  window.MatthewVoice = {
    speak,
    stop,
    test,
    unlock: unlockAudio,
    feedback: sound,
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
    observeQuestions();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    addHomeTestButton();
    observeQuestions();
  }
})();
