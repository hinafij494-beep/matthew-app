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
  const feedback = (type, onDone) => {
    const fid = ++request;
    // Round 3.2.6 (integrator): optional onDone — mirrors voice.js: fires
    // when the praise clip ENDS, so callers chaining on real completion
    // (story intros, answer explanations) never hang when this fallback
    // voice is the active one (voice.bundle.js absent). Before this the
    // fallback silently dropped every completion callback: a story intro
    // played and the first question never arrived, and an answer
    // explanation never played after the praise.
    let doneFired = false;
    const doneOnce = () => { if (doneFired) return; doneFired = true; if (typeof onDone === "function") { try { onDone(); } catch (_) {} } };
    try { window.MatthewClips?.stop(); } catch (_) {}
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (type === "correct") {
      tone(660, 0.13); tone(880, 0.17, 0.13); tone(1046, 0.2, 0.29);
      try { const c = window.MatthewClips; if (c) setTimeout(() => { if (fid !== request) return; const key = (++correctCount % 3 === 0 ? nancyPraiseKeys[nancyPraiseIndex++ % nancyPraiseKeys.length] : praiseKeys[praiseIndex++ % praiseKeys.length]); if (c.playKey(key, doneOnce)) return; if (key === "praise_nancy" || key.startsWith("nancy_praise_")) { if (c.playKey("praise1", doneOnce)) return; } setTimeout(doneOnce, 0); }, 280); else setTimeout(doneOnce, 0); } catch (_) { setTimeout(doneOnce, 0); }
    } else if (type === "wrong") {
      tone(330, 0.16); tone(260, 0.19, 0.14);
      try { const c = window.MatthewClips; if (c) setTimeout(() => { if (fid !== request) return; const key = (++wrongCount % 2 === 0 ? nancyRetryKeys[nancyRetryIndex++ % nancyRetryKeys.length] : tryKeys[tryIndex++ % tryKeys.length]); if (c.playKey(key, doneOnce)) return; if (key.startsWith("nancy_retry_") && c.playKey("try1", doneOnce)) return; setTimeout(doneOnce, 0); }, 280); else setTimeout(doneOnce, 0); } catch (_) { setTimeout(doneOnce, 0); }
    } else { tone(520, 0.055, 0, 0.03); setTimeout(doneOnce, 0); }
  };

  // Round 3.2.2 P0-4: recorded clips ONLY — the web fallback must never
  // speak in the device voice either. No recorded clip = silence.
  const speak = async (value, lang = "ar-EG") => {
    const text = String(value || "").trim();
    if (!text) return false;
    const id = ++request;
    sayStatus("⏳ جاري تشغيل الصوت...");
    try { if (window.MatthewClips && window.MatthewClips.play(text, lang)) { sayStatus("🔊 اسمع صوت الميس يا بطل"); return true; } } catch (_) {}
    try { window.MatthewClips?.stop(); } catch (_) {}
    if (id === request) sayStatus("🎧 اسمع من الميس — المقطع ده لسه بيتسجّل");
    return false;
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

  // Round 3.2.6 (integrator): optional onDone, passed through to
  // MatthewClips.playSequence — same contract as voice.js: fires once
  // when the last clip ends, or async when there is nothing to play, so
  // a caller waiting on it NEVER hangs. Before this the fallback dropped
  // the callback entirely and every chained screen (story questions,
  // answer explanations) silently never opened.
  const speakSequence = (texts, lang = "ar-EG", onDone) => {
    const list = (texts || []).map(x => String(x || "").trim()).filter(Boolean);
    if (!list.length) { if (typeof onDone === "function") setTimeout(onDone, 0); return false; }
    try { if (window.MatthewClips && window.MatthewClips.playSequence(list, lang, onDone)) { sayStatus("🔊 اسمع صوت الميس يا بطل"); return true; } } catch (_) {}
    if (typeof onDone === "function") setTimeout(onDone, 0);
    return false;
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
