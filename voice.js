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
      // Round 3.2.6 item 4: no tap blip over a playing voice clip — the
      // 55ms tone landing mid-word reads as a second voice stepping in.
      // The blip returns as soon as the clip ends (isPlaying false).
      // Optional-chained: an older cached clips bundle has no isPlaying.
      if (!window.MatthewClips?.isPlaying?.()) sound("tap");
    }
  }, { capture: true, passive: true });

  // Round 3.2.2 P0-4: recorded clips ONLY — no device speechSynthesis
  // and no Capacitor TextToSpeech fallback. A text with no recorded clip
  // stays silent (the UI shows a listen prompt) instead of speaking in a
  // mismatched device voice ("عربي في إنجليزي مشقلب").
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
    // Round 3.2.4 blocker 1: `joined`/`now` were read by the debounce
    // check below but never declared in this scope (they lived only
    // inside speak()) — every speakSequence call threw ReferenceError
    // and no multi-part sequence ever played.
    const joined = list.join(" ");
    const now = Date.now();
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
  const feedback = (kind, onDone) => {
    const id = ++requestId;
    // Round 3.2.6 (integrator, item 4): optional onDone fires when the
    // praise clip ENDS — the answer-explanation call sites chain on it, so
    // the explanation no longer cuts the praise at a fixed 2600ms (every
    // praise clip is 2.4–4.8s). The once-guard keeps the contract exact
    // even if the first playKey fails (it fires its onDone async itself)
    // and the fallback plays too.
    let doneFired = false;
    const doneOnce = () => { if (doneFired) return; doneFired = true; if (typeof onDone === "function") { try { onDone(); } catch (_) {} } };
    // Round 3.2.6 item 4: stop ONLY a running question sequence. A full
    // stop() here killed any narration that had just started in the same
    // tick — stories win() lost its win line in ~2ms, colour-game
    // sentences were cut at the praise delay. A lone context clip is left
    // playing; the praise queues behind it in the clips runtime instead.
    // Fallback to stop() for a clips bundle without stopSequence.
    try { if (window.MatthewClips?.stopSequence) window.MatthewClips.stopSequence(); else window.MatthewClips?.stop(); } catch (_) {}
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (isAndroidNative()) { try { TextToSpeech.stop(); } catch (_) {} }
    sound(kind);
    try {
      const clips = window.MatthewClips;
      if (!clips) { setTimeout(doneOnce, 0); return; }
      const key = kind === "correct"
        ? (++correctCount % 3 === 0
          ? nancyPraiseKeys[nancyPraiseIndex++ % nancyPraiseKeys.length]
          : praiseKeys[praiseIndex++ % praiseKeys.length])
        : kind === "wrong"
          ? (++wrongCount % 2 === 0
            ? nancyRetryKeys[nancyRetryIndex++ % nancyRetryKeys.length]
            : tryKeys[tryIndex++ % tryKeys.length])
          : null;
      // Round 3.2.6 item 4: praise waits 550ms, not 280ms — the correct
      // chime's last tone ends ~+500ms, so at 280ms the praise voice
      // started over the ringing chime (the "two voices at once" the
      // user hears on every answer). 550ms clears the chime first.
      if (key) setTimeout(() => {
        // A newer speak() in the same turn supersedes the praise — its
        // onDone stays unfired, so no stale explanation plays over the
        // new audio (the call-site token guard is the second line).
        if (id !== requestId) return;
        if (clips.playKey(key, doneOnce)) return;
        // Unpacked Nancy clip (not generated yet): fall back to the old
        // generic clip of the same mood, never silence.
        if (key === "praise_nancy" || key.startsWith("nancy_praise_")) { clips.playKey("praise1", doneOnce); return; }
        if (key.startsWith("nancy_retry_")) { clips.playKey("try1", doneOnce); return; }
        setTimeout(doneOnce, 0);
      }, 550);
      else setTimeout(doneOnce, 0);
    } catch (_) { setTimeout(doneOnce, 0); }
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
    observeQuestions();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    addHomeTestButton();
    observeQuestions();
  }
})();
