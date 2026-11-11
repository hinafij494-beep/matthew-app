(() => {
  if (window.MatthewVoice) return;

  let audio = null;
  let request = 0;
  let lastQuestion = "";

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

  const praiseKeys = ["praise1", "praise2", "praise3", "praise4", "praise5"];
  const tryKeys = ["try1", "try2", "try3"];
  let praiseIndex = 0, tryIndex = 0;
  const feedback = type => {
    if (type === "correct") {
      tone(660, 0.13); tone(880, 0.17, 0.13); tone(1046, 0.2, 0.29);
      try { const c = window.MatthewClips; if (c) setTimeout(() => c.playKey(praiseKeys[praiseIndex++ % praiseKeys.length]), 280); } catch (_) {}
    } else if (type === "wrong") {
      tone(330, 0.16); tone(260, 0.19, 0.14);
      try { const c = window.MatthewClips; if (c) setTimeout(() => c.playKey(tryKeys[tryIndex++ % tryKeys.length]), 280); } catch (_) {}
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

  window.MatthewVoice = { speak, stop, test, feedback, unlock: () => getAudio()?.resume(), installVoiceData: async () => false };

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
    button.textContent = "🔊 إعادة سماع السؤال";
    button.addEventListener("click", () => {
      const question = document.getElementById("questionText")?.textContent?.trim();
      if (question) speak(question, "ar-EG");
    });
    area.querySelector("#questionText")?.after(button);
  };

  const observer = new MutationObserver(() => {
    addHomeButton();
    const area = document.querySelector(".question-area");
    if (!area) return;
    addQuestionButton(area);
    const heading = area.querySelector("#questionText");
    const question = heading?.textContent?.trim() || "";
    if (!question || question === lastQuestion) return;
    lastQuestion = question;
    setTimeout(() => speak(question, "ar-EG"), 180);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    addHomeButton();
  }
})();
