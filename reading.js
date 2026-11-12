"use strict";
/*
 * Beginning reading (يلا نقرأ) — the bridge from letters to words.
 *
 * Arabic path (phonics-first, standard KG sequence):
 *   1. Syllables with short vowels: بَ بِ بُ (fatha / kasra / damma)
 *   2. Long syllables with madd: بَا بِي بُو
 *   3. Blending: build real words syllable by syllable (بَا + ب = بَاب)
 * English path: CVC words split into sounds (c-a-t -> cat) with the same
 * listen -> blend -> choose flow.
 * Every quiz answer is recorded in MatthewMastery ("reading-ar"/"reading-en").
 */
(() => {
  const main = document.querySelector("main");
  const learningList = document.getElementById("learningList");
  const gameList = document.getElementById("gameList");
  if (!main || !learningList) return;

  const FATHA = "َ", KASRA = "ِ", DAMMA = "ُ";
  // Letters that connect to what follows use their joined form in syllables.
  const LETTERS = [
    { base: "أ", joined: "أ", name: "الألف" },
    { base: "ب", joined: "بـ", name: "الباء" },
    { base: "ت", joined: "تـ", name: "التاء" },
    { base: "ث", joined: "ثـ", name: "الثاء" },
    { base: "ج", joined: "جـ", name: "الجيم" },
    { base: "ح", joined: "حـ", name: "الحاء" },
    { base: "خ", joined: "خـ", name: "الخاء" },
    { base: "د", joined: "د", name: "الدال" },
    { base: "ذ", joined: "ذ", name: "الذال" },
    { base: "ر", joined: "ر", name: "الراء" },
    { base: "ز", joined: "ز", name: "الزاي" },
    { base: "س", joined: "سـ", name: "السين" },
    { base: "ش", joined: "شـ", name: "الشين" },
    { base: "ص", joined: "صـ", name: "الصاد" },
    { base: "ض", joined: "ضـ", name: "الضاد" },
    { base: "ط", joined: "طـ", name: "الطاء" },
    { base: "ظ", joined: "ظـ", name: "الظاء" },
    { base: "ع", joined: "عـ", name: "العين" },
    { base: "غ", joined: "غـ", name: "الغين" },
    { base: "ف", joined: "فـ", name: "الفاء" },
    { base: "ق", joined: "قـ", name: "القاف" },
    { base: "ك", joined: "كـ", name: "الكاف" },
    { base: "ل", joined: "لـ", name: "اللام" },
    { base: "م", joined: "مـ", name: "الميم" },
    { base: "ن", joined: "نـ", name: "النون" },
    { base: "هـ", joined: "هـ", name: "الهاء" },
    { base: "و", joined: "و", name: "الواو" },
    { base: "ي", joined: "يـ", name: "الياء" }
  ];

  function syllablesFor(letter) {
    // الألف لها أشكال خاصة: الكسرة على همزة تحت الألف (إِ) والمد بالألف (آ).
    if (letter.base === "أ") return [
      { text: "أَ", say: "أَ", label: "فتحة" },
      { text: "إِ", say: "إِ", label: "كسرة" },
      { text: "أُ", say: "أُ", label: "ضمة" },
      { text: "آ", say: "آ", label: "مد بالألف" },
      { text: "إي", say: "إي", label: "مد بالياء" },
      { text: "أو", say: "أو", label: "مد بالواو" }
    ];
    return [
      { text: letter.joined + FATHA, say: letter.base + FATHA, label: "فتحة" },
      { text: letter.joined + KASRA, say: letter.base + KASRA, label: "كسرة" },
      { text: letter.joined + DAMMA, say: letter.base + DAMMA, label: "ضمة" },
      { text: letter.joined + "ا", say: letter.base + "ا", label: "مد بالألف" },
      { text: letter.joined + "ي", say: letter.base + "ي", label: "مد بالياء" },
      { text: letter.joined + "و", say: letter.base + "و", label: "مد بالواو" }
    ];
  }

  // Words built from parts the child can already say: [parts, whole, meaning, emoji]
  const AR_WORDS = [
    { parts: ["بَا", "ب"], word: "بَاب", meaning: "باب البيت", emoji: "🚪" },
    { parts: ["بَ", "قَرَة"], word: "بَقَرَة", meaning: "بقرة بتقول مو", emoji: "🐄" },
    { parts: ["أَ", "سَد"], word: "أَسَد", meaning: "أسد قوي", emoji: "🦁" },
    { parts: ["قَ", "مَر"], word: "قَمَر", meaning: "قمر في السما", emoji: "🌙" },
    { parts: ["سَ", "مَكَة"], word: "سَمَكَة", meaning: "سمكة بتعوم", emoji: "🐟" },
    { parts: ["كَ", "لْب"], word: "كَلْب", meaning: "كلب صديق", emoji: "🐶" },
    { parts: ["قَ", "لَم"], word: "قَلَم", meaning: "قلم بنكتب بيه", emoji: "✏️" },
    { parts: ["بَ", "حْر"], word: "بَحْر", meaning: "بحر كبير", emoji: "🌊" },
    { parts: ["نَ", "جْم"], word: "نَجْم", meaning: "نجم بيلمع", emoji: "⭐" },
    { parts: ["تَا", "ج"], word: "تَاج", meaning: "تاج الملك", emoji: "👑" }
  ];

  const CVC_WORDS = [
    { sounds: ["c", "a", "t"], word: "cat", emoji: "🐱" },
    { sounds: ["d", "o", "g"], word: "dog", emoji: "🐶" },
    { sounds: ["p", "i", "g"], word: "pig", emoji: "🐷" },
    { sounds: ["s", "u", "n"], word: "sun", emoji: "☀️" },
    { sounds: ["b", "u", "s"], word: "bus", emoji: "🚌" },
    { sounds: ["e", "g"], word: "egg", emoji: "🥚" },
    { sounds: ["h", "a", "t"], word: "hat", emoji: "🎩" },
    { sounds: ["b", "e", "d"], word: "bed", emoji: "🛏️" },
    { sounds: ["f", "i", "sh"], word: "fish", emoji: "🐟" },
    { sounds: ["c", "u", "p"], word: "cup", emoji: "🥤" }
  ];

  const panel = document.createElement("section");
  panel.id = "readingPanel";
  panel.className = "academy-panel hidden";
  main.insertBefore(panel, document.querySelector("footer"));

  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card green";
  card.innerHTML = '<span class="game-icon">📖</span><strong>يلا نقرأ</strong><small>مقاطع وكلمات عربي وإنجليزي</small><span class="play">ابدأ القراءة ←</span>';
  learningList.append(card);

  // Round 3.2.2 P0-4: recorded clips ONLY — no device speechSynthesis.
  const speak = (text, lang) => {
    if (window.MatthewVoice && window.MatthewVoice.speak) window.MatthewVoice.speak(text, lang);
  };
  // Rescue.js pattern: a clip KEY plays first (exact clip, no text-map
  // collision); the spoken text is only the device-TTS fallback. NOTE:
  // MatthewVoice.speak(text, lang) takes a LANGUAGE as 2nd arg, not a key.
  const speakKey = (text, key, lang) => {
    try { if (key && window.MatthewClips && window.MatthewClips.playKey(key)) return; } catch (_) {}
    speak(text, lang);
  };
  // Ordered narration (name then syllables, blend lines): the recorded-clip
  // sequence player resolves texts via EXACT[trim] first (diacritic
  // syllables) then BY_TEXT[norm] (names, blend lines).
  const speakSequence = (texts, lang) => {
    const list = (texts || []).map(t => String(t || "").trim()).filter(Boolean);
    if (!list.length) return;
    try { if (window.MatthewClips && window.MatthewClips.playSequence(list, lang)) return; } catch (_) {}
    if (window.MatthewVoice && window.MatthewVoice.speakSequence) window.MatthewVoice.speakSequence(list, lang);
  };
  const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  let mode = "ar-syllables", letterIndex = 0, wordIndex = 0, picker = true, readToken = 0;

  function open() {
    gameList.classList.add("hidden");
    learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    document.getElementById("parentPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    picker = true;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    readToken++;
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    learningList.classList.remove("hidden");
    window.MatthewVoice?.stop();
  }

  // Hierarchical back (note 16): an item screen goes back to its picker,
  // a picker screen goes home — never straight home from an item. The mode
  // tabs in the header are the mode menu, reachable from every picker.
  function header(title, backToPicker) {
    return '<div class="quiz-top"><button id="readBack" class="back" type="button">' + (backToPicker ? "→ رجوع" : "🏠 الرئيسية") + '</button><strong>' + title + '</strong><span>📖</span></div>' +
      '<div class="trace-sets">' +
      '<button type="button" class="trace-set' + (mode === "ar-syllables" ? " active" : "") + '" data-mode="ar-syllables">مقاطع عربي</button>' +
      '<button type="button" class="trace-set' + (mode === "ar-words" ? " active" : "") + '" data-mode="ar-words">كلمات عربي</button>' +
      '<button type="button" class="trace-set' + (mode === "en-cvc" ? " active" : "") + '" data-mode="en-cvc">كلمات إنجليزية</button>' +
      '<button type="button" class="trace-set' + (mode === "quiz" ? " active" : "") + '" data-mode="quiz">تحدي القراءة</button></div>';
  }

  function bindHeader(backToPicker) {
    panel.querySelector("#readBack").onclick = backToPicker ? () => { picker = true; render(); } : close;
    panel.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { mode = b.dataset.mode; picker = true; render(); });
  }

  function render() {
    if (mode === "ar-syllables") { if (picker) renderSyllablePicker(); else renderSyllables(); }
    else if (mode === "ar-words") { if (picker) renderArWordPicker(); else renderArWord(); }
    else if (mode === "en-cvc") { if (picker) renderCvcPicker(); else renderCvc(); }
    else renderQuiz();
  }

  function renderSyllablePicker() {
    panel.innerHTML = header("📖 مقاطع عربي") +
      '<div class="lesson-title">اختار حرف يا ملك ماثيو 👑</div><p>اضغط على أي حرف عشان تسمع مقاطعه</p>' +
      '<div class="basic-grid letter-picker">' + LETTERS.map((l, i) => '<button type="button" class="basic-tile" data-letter="' + i + '"><b>' + l.base + '</b><small>' + l.name + '</small></button>').join("") + '</div>';
    bindHeader(false);
    panel.querySelectorAll("[data-letter]").forEach(b => b.onclick = () => { letterIndex = Number(b.dataset.letter); picker = false; renderSyllables(); });
  }

  function renderSyllables() {
    const tk = ++readToken;
    const letter = LETTERS[letterIndex];
    const syllables = syllablesFor(letter);
    panel.innerHTML = header("📖 مقاطع حرف " + letter.name, true) +
      '<div class="read-sticky" style="position:sticky;top:0;z-index:5;background:#fff;border-radius:22px;box-shadow:0 6px 18px #30205b1a;display:flex;align-items:center;justify-content:center;gap:14px;padding:10px;margin:10px 0"><span style="font-size:64px;font-weight:900;line-height:1;color:#5b3cc4">' + letter.base + '</span><span style="text-align:right"><b style="font-size:20px;display:block">' + letter.name + '</b><small style="color:#77718b">اضغط على المقطع واسمعه</small></span></div>' +
      '<p class="touch-game-instruction">من الصفر يا بطل: الحرف لوحده ليه صوت، ولما بنحط عليه فتحة أو كسرة أو ضمة صوته بيتغيّر شوية صغيرة. اضغط على كل مقطع واسمع صوته كويس وقوله ورايا، وبعد شوية هنركّب المقاطع على بعض ونعمل منها كلمة كاملة نقراها سوا!</p>' +
      '<div class="read-syllables">' + syllables.map((s, i) => '<button type="button" class="read-syllable" data-syl="' + i + '"><b>' + s.text + '</b><small>' + s.label + '</small></button>').join("") + '</div>' +
      '<div class="basic-nav"><button id="readPrevLetter" class="secondary" type="button">الحرف السابق<span class="pager-arrow">→</span></button>' +
      '<button id="readNextLetter" class="primary" type="button">الحرف التالي<span class="pager-arrow">←</span></button></div>';
    bindHeader(true);
    panel.querySelectorAll("[data-syl]").forEach(b => b.onclick = () => speakKey(syllables[Number(b.dataset.syl)].say, "rd_syl_" + letterIndex + "_" + b.dataset.syl, "ar-EG"));
    panel.querySelector("#readPrevLetter").onclick = () => { letterIndex = (letterIndex + LETTERS.length - 1) % LETTERS.length; renderSyllables(); };
    panel.querySelector("#readNextLetter").onclick = () => { letterIndex = (letterIndex + 1) % LETTERS.length; renderSyllables(); };
    // Full narration on open: the letter name (lsq_name_*) then ALL 6
    // syllables in order (rd_syl_* via the EXACT map) — not a short version.
    setTimeout(() => { if (tk !== readToken) return; speakSequence([letter.name].concat(syllables.map(s => s.say)), "ar-EG"); }, 150);
  }

  function renderArWordPicker() {
    panel.innerHTML = header("📖 نبني كلمة") +
      '<div class="lesson-title">اختار كلمة يا ملك ماثيو 👑</div><p>اضغط على أي كلمة عشان نبنيها سوا</p>' +
      '<div class="basic-grid letter-picker">' + AR_WORDS.map((w, i) => '<button type="button" class="basic-tile" data-word="' + i + '"><span>' + w.emoji + '</span><b>' + w.word + '</b><small>' + w.meaning + '</small></button>').join("") + '</div>';
    bindHeader(false);
    panel.querySelectorAll("[data-word]").forEach(b => b.onclick = () => { wordIndex = Number(b.dataset.word); picker = false; renderArWord(); });
  }

  function renderArWord() {
    const tk = ++readToken;
    const wi = wordIndex % AR_WORDS.length;
    const item = AR_WORDS[wi];
    const blend = item.parts.join("، ") + ". " + item.word;
    panel.innerHTML = header("📖 نبني كلمة", true) +
      '<div class="basic-focus" style="position:sticky;top:0;z-index:5;box-shadow:0 6px 18px #30205b1a"><div class="basic-emoji">' + item.emoji + '</div>' +
      '<div class="read-parts">' + item.parts.map((p, i) => '<button type="button" class="read-part" data-part="' + i + '">' + p + '</button>').join('<span class="read-plus">+</span>') +
      '<span class="read-plus">=</span><button type="button" class="read-part whole" id="readWhole">' + item.word + '</button></div>' +
      '<h2>' + item.meaning + '</h2><p>اضغط على كل مقطع، وبعدين اضغط على الكلمة كلها</p>' +
      '<button id="readWordListen" class="voice-button" type="button">🔊 اسمع الكلمة</button></div>' +
      '<div class="basic-nav"><button id="readPrevWord" class="secondary" type="button">الكلمة السابقة<span class="pager-arrow">→</span></button>' +
      '<button id="readNextWord" class="primary" type="button">كلمة جديدة<span class="pager-arrow">←</span></button></div>';
    bindHeader(true);
    panel.querySelectorAll("[data-part]").forEach(b => b.onclick = () => speakKey(item.parts[Number(b.dataset.part)], "rd_part_" + wi + "_" + b.dataset.part, "ar-EG"));
    panel.querySelector("#readWhole").onclick = () => speakKey(item.word, "rd_word_" + wi, "ar-EG");
    panel.querySelector("#readWordListen").onclick = () => speakKey(blend, "rd_blend_" + wi, "ar-EG");
    panel.querySelector("#readPrevWord").onclick = () => { wordIndex = (wordIndex + AR_WORDS.length - 1) % AR_WORDS.length; renderArWord(); };
    panel.querySelector("#readNextWord").onclick = () => { wordIndex = (wordIndex + 1) % AR_WORDS.length; renderArWord(); };
    // Full narration on open: the whole blend line (rd_blend_*).
    setTimeout(() => { if (tk !== readToken) return; speakKey(blend, "rd_blend_" + wi, "ar-EG"); }, 150);
  }

  function renderCvcPicker() {
    panel.innerHTML = header("📖 كلمات إنجليزية") +
      '<div class="lesson-title">اختار كلمة يا ملك ماثيو 👑</div><p>اضغط على أي كلمة عشان نسمع أصواتها</p>' +
      '<div class="basic-grid letter-picker">' + CVC_WORDS.map((w, i) => '<button type="button" class="basic-tile" data-cvc="' + i + '"><span>' + w.emoji + '</span><b dir="ltr">' + w.word + '</b></button>').join("") + '</div>';
    bindHeader(false);
    panel.querySelectorAll("[data-cvc]").forEach(b => b.onclick = () => { wordIndex = Number(b.dataset.cvc); picker = false; renderCvc(); });
  }

  function renderCvc() {
    const tk = ++readToken;
    const wi = wordIndex % CVC_WORDS.length;
    const item = CVC_WORDS[wi];
    const blend = item.sounds.join(", ") + ". " + item.word;
    panel.innerHTML = header("📖 كلمات إنجليزية", true) +
      '<div class="basic-focus" dir="ltr" style="position:sticky;top:0;z-index:5;box-shadow:0 6px 18px #30205b1a"><div class="basic-emoji">' + item.emoji + '</div>' +
      '<div class="read-parts">' + item.sounds.map((s, i) => '<button type="button" class="read-part" data-sound="' + i + '">' + s + '</button>').join('<span class="read-plus">+</span>') +
      '<span class="read-plus">=</span><button type="button" class="read-part whole" id="readWholeEn">' + item.word + '</button></div>' +
      '<p>اضغط على كل صوت، وبعدين ادمجهم مع بعض</p>' +
      '<button id="readCvcListen" class="voice-button" type="button">🔊 اسمع</button></div>' +
      '<div class="basic-nav"><button id="readPrevCvc" class="secondary" type="button">السابق<span class="pager-arrow">→</span></button>' +
      '<button id="readNextCvc" class="primary" type="button">كلمة جديدة<span class="pager-arrow">←</span></button></div>';
    bindHeader(true);
    panel.querySelectorAll("[data-sound]").forEach(b => b.onclick = () => speakKey(item.sounds[Number(b.dataset.sound)], "rd_cvc_s_" + wi + "_" + b.dataset.sound, "en-US"));
    panel.querySelector("#readWholeEn").onclick = () => speakKey(item.word, "rd_cvc_" + wi, "en-US");
    panel.querySelector("#readCvcListen").onclick = () => speakKey(blend, "rd_cvc_blend_" + wi, "en-US");
    panel.querySelector("#readPrevCvc").onclick = () => { wordIndex = (wordIndex + CVC_WORDS.length - 1) % CVC_WORDS.length; renderCvc(); };
    panel.querySelector("#readNextCvc").onclick = () => { wordIndex = (wordIndex + 1) % CVC_WORDS.length; renderCvc(); };
    // Full narration on open: the whole blend line (rd_cvc_blend_*).
    setTimeout(() => { if (tk !== readToken) return; speakKey(blend, "rd_cvc_blend_" + wi, "en-US"); }, 150);
  }

  function renderQuiz() {
    const tk = ++readToken;
    const useArabic = Math.random() < 0.5;
    let prompt, spoken, lang, skill, choices;
    if (useArabic) {
      const itemIdx = Math.floor(Math.random() * AR_WORDS.length);
      const item = AR_WORDS[itemIdx];
      prompt = item.emoji + " " + item.meaning;
      spoken = item.word; lang = "ar-EG"; skill = "reading-ar";
      choices = shuffle([item, ...shuffle(AR_WORDS.filter(w => w.word !== item.word)).slice(0, 3)]);
      panel.innerHTML = header("📖 تحدي القراءة") +
        '<div class="basic-focus"><div class="basic-emoji">' + item.emoji + '</div><h2>اسمع الكلمة واختارها</h2>' +
        '<button id="readQuizListen" class="voice-button" type="button">🔊 اسمع السؤال</button>' +
        '<div class="read-choices">' + choices.map(c => '<button type="button" class="read-choice" data-word="' + c.word + '">' + c.word + '</button>').join("") + '</div>' +
        '<p id="readQuizMsg" class="feedback" aria-live="polite"></p>' +
        '<button id="readQuizNext" class="primary hidden" type="button">كلمة جديدة<span class="pager-arrow">←</span></button></div>';
      bindHeader();
      // Note 22: the replay button re-speaks the prompt word ONLY — never
      // the choices (this is a listening-identification quiz).
      panel.querySelector("#readQuizListen").onclick = () => speakKey(spoken, "rd_word_" + itemIdx, lang);
      setTimeout(() => { if (tk !== readToken) return; speakKey(spoken, "rd_word_" + itemIdx, lang); }, 200);
      let answered = false;
      panel.querySelectorAll("[data-word]").forEach(b => b.onclick = () => {
        if (answered) return; answered = true;
        const correct = b.dataset.word === item.word;
        try { window.MatthewMastery?.record(skill, correct); window.MatthewMastery?.record("read-word:" + item.word, correct); } catch (_) { /* ignore */ }
        b.classList.add(correct ? "correct" : "wrong");
        panel.querySelectorAll("[data-word]").forEach(x => { x.disabled = true; if (x.dataset.word === item.word) x.classList.add("correct"); });
        panel.querySelector("#readQuizMsg").textContent = correct ? "برافو! قرأت الكلمة صح ⭐" : "دي كلمة " + item.word + ". اسمعها كويس وجرب اللي بعدها.";
        if (correct) window.MatthewVoice?.feedback("correct"); else window.MatthewVoice?.feedback("wrong");
        panel.querySelector("#readQuizNext").classList.remove("hidden");
        panel.querySelector("#readQuizNext").onclick = renderQuiz;
      });
    } else {
      const itemIdx = Math.floor(Math.random() * CVC_WORDS.length);
      const item = CVC_WORDS[itemIdx];
      spoken = item.word; lang = "en-US"; skill = "reading-en";
      choices = shuffle([item, ...shuffle(CVC_WORDS.filter(w => w.word !== item.word)).slice(0, 3)]);
      panel.innerHTML = header("📖 تحدي القراءة") +
        '<div class="basic-focus"><div class="basic-emoji">' + item.emoji + '</div><h2>اسمع واختار الكلمة</h2>' +
        '<button id="readQuizListen" class="voice-button" type="button">🔊 اسمع السؤال</button>' +
        '<div class="read-choices">' + choices.map(c => '<button type="button" class="read-choice" data-word="' + c.word + '">' + c.word + '</button>').join("") + '</div>' +
        '<p id="readQuizMsg" class="feedback" aria-live="polite"></p>' +
        '<button id="readQuizNext" class="primary hidden" type="button">كلمة جديدة<span class="pager-arrow">←</span></button></div>';
      bindHeader();
      // Note 22: the replay button re-speaks the prompt word ONLY — never
      // the choices (this is a listening-identification quiz).
      panel.querySelector("#readQuizListen").onclick = () => speakKey(spoken, "rd_cvc_" + itemIdx, lang);
      setTimeout(() => { if (tk !== readToken) return; speakKey(spoken, "rd_cvc_" + itemIdx, lang); }, 200);
      let answered = false;
      panel.querySelectorAll("[data-word]").forEach(b => b.onclick = () => {
        if (answered) return; answered = true;
        const correct = b.dataset.word === item.word;
        try { window.MatthewMastery?.record(skill, correct); window.MatthewMastery?.record("read-cvc:" + item.word, correct); } catch (_) { /* ignore */ }
        b.classList.add(correct ? "correct" : "wrong");
        panel.querySelectorAll("[data-word]").forEach(x => { x.disabled = true; if (x.dataset.word === item.word) x.classList.add("correct"); });
        panel.querySelector("#readQuizMsg").textContent = correct ? "قراءة جميلة! ⭐" : "الكلمة دي " + item.word + ". اسمعها كويس وجرب اللي بعدها.";
        if (correct) window.MatthewVoice?.feedback("correct"); else window.MatthewVoice?.feedback("wrong");
        panel.querySelector("#readQuizNext").classList.remove("hidden");
        panel.querySelector("#readQuizNext").onclick = renderQuiz;
      });
    }
  }

  card.addEventListener("click", open);
})();
