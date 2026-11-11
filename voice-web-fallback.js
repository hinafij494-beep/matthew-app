(() => {
  if (window.MatthewVoice) return;

  let audio = null;
  let request = 0;

  const status = () =>
    document.getElementById("speechResult") ||
    document.getElementById("lessonStatus") ||
    document.getElementById("voiceStatus");

  const sayStatus = text => { const node = status(); if (node) node.textContent = text; };

  const getAudio = () => {
    if (audio) return audio;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    try { audio = new Audio(); return audio; } catch (_) { return null; }
  };

  const tone = (hz, duration, delay = 0, volume = 0.06) => {
    const ctx = getAudio();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(hz, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + duration + 0.03);
    } catch (_) {}
  };

  // Round 3.2.1 note 25b (mirrors voice.js): مس نانسي praise/retry lines
  // woven into the same rotation — every 3rd correct answer a rotating
  // nancy_praise_* line, every 2nd wrong answer a rotating nancy_retry_*
  // line; old praise1–5 / try1–3 keep their slots. Clip keys are stable.
  const praiseKeys = ["praise1", "praise2", "praise3", "praise4", "praise5", "praise_nancy"];
  const nancyPraiseKeys = ["nancy_praise_1", "nancy_praise_2", "nancy_praise_3", "nancy_praise_4", "nancy_praise_5", "nancy_praise_6", "nancy_praise_7", "nancy_praise_8", "nancy_praise_9", "nancy_praise_10"];
  const tryKeys = ["try1", "try2", "try3"];
  const nancyRetryKeys = ["nancy_retry_1", "nancy_retry_2", "nancy_retry_3", "nancy_retry_4", "nancy_retry_5"];
  let praiseIndex = 0, tryIndex = 0, nancyPraiseIndex = 0, nancyRetryIndex = 0, correctCount = 0, wrongCount = 0;
  const feedback = type => {
    const fid = ++request;
    try { window.MatthewClips?.stop(); } catch (_) {}
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (type === "correct") {
      tone(660, 0.13); tone(880, 0.17, 0.13); tone(1046, 0.2, 0.29);
      try { const c = window.MatthewClips; if (c) setTimeout(() => { if (fid !== request) return; const key = (++correctCount % 3 === 0 ? nancyPraiseKeys[nancyPraiseIndex++ % nancyPraiseKeys.length] : praiseKeys[praiseIndex++ % praiseKeys.length]); if (c.playKey(key)) return; if (key === "praise_nancy" || key.startsWith("nancy_praise_")) c.playKey("praise1"); }, 280); } catch (_) {}
    } else if (type === "wrong") {
      tone(330, 0.16); tone(260, 0.19, 0.14);
      try { const c = window.MatthewClips; if (c) setTimeout(() => { if (fid !== request) return; const key = (++wrongCount % 2 === 0 ? nancyRetryKeys[nancyRetryIndex++ % nancyRetryKeys.length] : tryKeys[tryIndex++ % tryKeys.length]); if (!c.playKey(key) && key.startsWith("nancy_retry_")) c.playKey("try1"); }, 280); } catch (_) {}
    } else tone(520, 0.055, 0, 0.03);
  };

  const waitVoices = synth => new Promise(resolve => {
    const voices = synth.getVoices();
    if (voices.length) return resolve(voices);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { synth.removeEventListener("voiceschanged", finish); } catch (_) {}
      resolve(synth.getVoices() || []);
    };
    try { synth.addEventListener("voiceschanged", finish); } catch (_) {}
    setTimeout(finish, 900);
  });

  const speak = async (value, lang = "ar-EG") => {
    const text = String(value || "").trim();
    if (!text) return false;
    const id = ++request;
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) {
      sayStatus("الصوت غير مدعوم على هذا الجهاز. راجع إعدادات تحويل النص إلى كلام.");
      return false;
    }
    sayStatus("⏳ جاري تشغيل الصوت...");
    try { if (window.MatthewClips && window.MatthewClips.play(text)) { sayStatus("🔊 اسمع صوت الميس يا بطل"); return true; } } catch (_) {}
    try { window.MatthewClips?.stop(); } catch (_) {}
    try {
      synth.cancel();
      const voices = await waitVoices(synth);
      if (id !== request) return false;
      const prefix = lang.slice(0, 2).toLowerCase();
      const selected = voices.find(v => v.lang?.toLowerCase().startsWith(prefix) && /female|woman|زينة|سلمى|أميرة|ليلى|salma|zeina|amira|laila/i.test(v.name || "")) ||
        voices.find(v => v.lang?.toLowerCase() === lang.toLowerCase()) ||
        voices.find(v => v.lang?.toLowerCase().startsWith(prefix));
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selected?.lang || lang;
      utterance.rate = 0.92;
      utterance.pitch = 1.12;
      utterance.volume = 1;
      if (selected) utterance.voice = selected;
      utterance.onstart = () => { if (id === request) sayStatus("🔊 اسمع كويس يا بطل"); };
      utterance.onend = () => { if (id === request) sayStatus("👏 برافو يا بطل!"); };
      utterance.onerror = () => { if (id === request) sayStatus("تعذر تشغيل الصوت. تأكد من تثبيت صوت اللغة على الهاتف."); };
      synth.resume();
      synth.speak(utterance);
      return true;
    } catch (_) {
      sayStatus("تعذر تشغيل الصوت. راجع إعدادات الهاتف.");
      return false;
    }
  };

  const stop = () => {
    request++;
    try { window.MatthewClips?.stop(); } catch (_) {}
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  };

  const test = () => {
    const ctx = getAudio();
    if (ctx?.state === "suspended") ctx.resume();
    feedback("correct");
    return speak("أهلاً يا ماثيو يا بطل! أنا الميس بتاعتك، يلا بينا نتعلّم ونلعب مع بعض.", "ar-EG");
  };

  const speakSequence = (texts, lang = "ar-EG") => {
    const list = (texts || []).map(x => String(x || "").trim()).filter(Boolean);
    if (!list.length) return false;
    try { if (window.MatthewClips && window.MatthewClips.playSequence(list)) { sayStatus("🔊 اسمع صوت الميس يا بطل"); return true; } } catch (_) {}
    return speak(list.join("، "), lang);
  };

  window.MatthewVoice = { speak, speakSequence, stop, test, feedback, unlock: () => getAudio()?.resume(), installVoiceData: async () => false };

  document.addEventListener("pointerdown", event => {
    const ctx = getAudio();
    if (ctx?.state === "suspended") ctx.resume();
    if (event.target?.closest?.("button,[role='button']")) feedback("tap");
  }, { capture: true, passive: true });

  const addHomeButton = () => {
    const hero = document.querySelector(".hero-copy");
    if (!hero || document.getElementById("voiceTestBtn")) return;
    const button = document.createElement("button");
    button.id = "voiceTestBtn"; button.type = "button";
    button.className = "voice-button home-voice-test";
    button.textContent = "🔊 تجربة الصوت";
    button.addEventListener("click", test);
    hero.append(button);
  };

  const addQuestionButton = area => {
    if (!area || area.querySelector(".speak-question")) return;
    const button = document.createElement("button");
    button.type = "button"; button.className = "voice-button speak-question";
    button.textContent = "🔊 اسمع السؤال";
    button.addEventListener("click", () => {
      const question = document.getElementById("questionText")?.textContent?.trim();
      if (question) speak(question, "ar-EG");
    });
    area.querySelector("#questionText")?.after(button);
  };

  // Round 3.2.1: the observer only ensures the replay button exists — it
  // must NOT re-speak the question (showQuestion already narrates it once).
  const observer = new MutationObserver(() => {
    addHomeButton();
    const area = document.querySelector(".question-area");
    if (!area) return;
    addQuestionButton(area);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    addHomeButton();
  }
})();
