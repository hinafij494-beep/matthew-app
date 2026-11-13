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
  // Round 3.2.3 item 9: lesson → quiz offer. The reading quiz already
  // exists («تحدي القراءة» tab) but a non-reader cannot find a text tab,
  // so every lesson screen gets a big pictured 🏆 button that opens it.
  // The offer line is spoken ONCE, on first entry to a lesson screen
  // (appended to that screen's own narration sequence, so it can never
  // cut the lesson off). NEW CLIP for the audio worker:
  // quiz_offer_reading = this text (Aria, ar-EG).
  const QUIZ_OFFER = "برافو يا بطل! يلا نتحدى القراءة! دوس على الكاس!";
  let offerSpoken = false;
  function quizOfferButton() {
    return '<button id="readQuizOffer" class="primary" type="button">🏆 تحدي القراءة ⭐</button>';
  }
  function bindQuizOffer() {
    const b = panel.querySelector("#readQuizOffer");
    if (b) b.onclick = () => { quizCtx = { base: mode, letterIndex: letterIndex, wordIndex: wordIndex }; mode = "quiz"; render(); };
  }
  // Round 3.2.6 item 2: every item screen opens with three big tabs —
  // 📖 الدرس (the item itself), 🧕 الشرح (the explanation, spoken once
  // when the tab opens), 🏆 الاختبار (the reading challenge, scoped to
  // THIS item only — item 3). The challenge itself is a full screen
  // (mode "quiz"), so the 🏆 tab opens it; the quiz back button returns
  // to the lesson tab of the same item.
  let readTab = "lesson", readExplainFor = "", quizCtx = null, readExplainSpeak = null;
  const readTabsHTML = active => `<div class="lesson-tabs" role="tablist"><button type="button" class="lesson-tab${active === "lesson" ? " active" : ""}" data-lesson-tab="lesson" role="tab">📖 الدرس</button><button type="button" class="lesson-tab${active === "explain" ? " active" : ""}" data-lesson-tab="explain" role="tab">🧕 الشرح</button><button type="button" class="lesson-tab${active === "quiz" ? " active" : ""}" data-lesson-tab="quiz" role="tab">🏆 الاختبار</button></div>`;
  function readItemHTML(lessonHTML, explainHTML) {
    return readTabsHTML(readTab) +
      '<div class="tab-panel' + (readTab === "lesson" ? " active" : "") + '" data-tab-panel="lesson">' + lessonHTML + '</div>' +
      '<div class="tab-panel' + (readTab === "explain" ? " active" : "") + '" data-tab-panel="explain">' + explainHTML + '</div>' +
      '<div class="tab-panel' + (readTab === "quiz" ? " active" : "") + '" data-tab-panel="quiz"><p>تحدي القراءة على الدرس ده بس — اسمع واختار الصح.</p><button id="readQuizStart" class="primary" type="button">🏆 ابدأ التحدي ⭐</button></div>';
  }
  function bindReadTabs() {
    panel.querySelectorAll("[data-lesson-tab]").forEach(b => b.onclick = () => switchReadTab(b.dataset.lessonTab));
    const qs = panel.querySelector("#readQuizStart");
    if (qs) qs.onclick = () => switchReadTab("quiz");
  }
  function maybeSpeakReadExplain() {
    const key = mode + ":" + letterIndex + ":" + wordIndex;
    if (readExplainFor === key || !readExplainSpeak) return;
    readExplainFor = key;
    const tk = ++readToken;
    const speak = readExplainSpeak;
    setTimeout(() => { if (tk !== readToken) return; speak(); }, 120);
  }
  function switchReadTab(name) {
    if (name !== "lesson" && name !== "explain" && name !== "quiz") return;
    readToken++;
    try { window.MatthewVoice?.stop(); } catch (_) {}
    readTab = name;
    panel.querySelectorAll("[data-lesson-tab]").forEach(b => b.classList.toggle("active", b.dataset.lessonTab === name));
    panel.querySelectorAll("[data-tab-panel]").forEach(p => p.classList.toggle("active", p.dataset.tabPanel === name));
    if (name === "explain") maybeSpeakReadExplain();
    if (name === "quiz") { quizCtx = { base: mode, letterIndex: letterIndex, wordIndex: wordIndex }; mode = "quiz"; render(); }
  }

  function open() {
    gameList.classList.add("hidden");
    learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    document.getElementById("parentPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    picker = true;
    offerSpoken = false;
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
    panel.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { if (b.dataset.mode === "quiz") { if (mode !== "quiz") quizCtx = { base: mode, letterIndex: letterIndex, wordIndex: wordIndex }; mode = "quiz"; } else mode = b.dataset.mode; picker = true; render(); });
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
    const tk = ++readToken; // cancels any pending narration timer
    readTab = "lesson";
    const letter = LETTERS[letterIndex];
    const syllables = syllablesFor(letter);
    const lessonHTML =
      '<div class="read-sticky" style="position:sticky;top:0;z-index:5;background:#fff;border-radius:22px;box-shadow:0 6px 18px #30205b1a;display:flex;align-items:center;justify-content:center;gap:14px;padding:10px;margin:10px 0"><span style="font-size:64px;font-weight:900;line-height:1;color:#5b3cc4">' + letter.base + '</span><span style="text-align:right"><b style="font-size:20px;display:block">' + letter.name + '</b><small style="color:#77718b">اضغط على المقطع واسمعه</small></span></div>' +
      '<p class="touch-game-instruction">من الصفر يا بطل: الحرف لوحده ليه صوت، ولما بنحط عليه فتحة أو كسرة أو ضمة صوته بيتغيّر شوية صغيرة. اضغط على كل مقطع واسمع صوته كويس وقوله ورايا، وبعد شوية هنركّب المقاطع على بعض ونعمل منها كلمة كاملة نقراها سوا!</p>' +
      '<div class="read-syllables">' + syllables.map((s, i) => '<button type="button" class="read-syllable" data-syl="' + i + '"><b>' + s.text + '</b><small>' + s.label + '</small></button>').join("") + '</div>' +
      '<div class="basic-nav"><button id="readPrevLetter" class="secondary" type="button">الحرف السابق<span class="pager-arrow">→</span></button>' +
      '<button id="readNextLetter" class="primary" type="button">الحرف التالي<span class="pager-arrow">←</span></button></div>' +
      quizOfferButton();
    const explainHTML =
      '<div class="explain-box"><strong>🧕 الميس بتشرح لك من الصفر</strong><p>الحرف <b>' + letter.name + '</b> لوحده ليه صوت، ولما بنحط عليه فتحة أو كسرة أو ضمة صوته بيتغيّر شوية صغيرة. اضغط على كل مقطع واسمع صوته كويس وقوله ورايا، وبعد شوية هنركّب المقاطع على بعض ونعمل منها كلمة كاملة نقراها سوا!</p></div>' +
      '<button id="readExplainListen" class="voice-button" type="button">🔊 اسمع الشرح</button><p>اسمع الشرح كويس، وبعدين جرّب 🏆 الاختبار على نفس الحرف!</p>';
    panel.innerHTML = header("📖 مقاطع حرف " + letter.name, true) + readItemHTML(lessonHTML, explainHTML);
    bindHeader(true);
    bindReadTabs();
    bindQuizOffer();
    panel.querySelectorAll("[data-syl]").forEach(b => b.onclick = () => speakKey(syllables[Number(b.dataset.syl)].say, "rd_syl_" + letterIndex + "_" + b.dataset.syl, "ar-EG"));
    panel.querySelector("#readPrevLetter").onclick = () => { letterIndex = (letterIndex + LETTERS.length - 1) % LETTERS.length; renderSyllables(); };
    panel.querySelector("#readNextLetter").onclick = () => { letterIndex = (letterIndex + 1) % LETTERS.length; renderSyllables(); };
    // Full narration — now on the 🧕 الشرح tab (Round 3.2.6 item 2):
    // the letter name (lsq_name_*) then ALL 6 syllables in order
    // (rd_syl_* via the EXACT map) — not a short version. Round 3.2.3
    // item 9: on first entry the quiz offer follows the syllables in the
    // same sequence, so it never cuts them off.
    readExplainSpeak = () => { const seq = [letter.name].concat(syllables.map(s => s.say)); if (!offerSpoken) { offerSpoken = true; seq.push(QUIZ_OFFER); } speakSequence(seq, "ar-EG"); };
    panel.querySelector("#readExplainListen").onclick = () => readExplainSpeak();
  }

  function renderArWordPicker() {
    panel.innerHTML = header("📖 نبني كلمة") +
      '<div class="lesson-title">اختار كلمة يا ملك ماثيو 👑</div><p>اضغط على أي كلمة عشان نبنيها سوا</p>' +
      '<div class="basic-grid letter-picker">' + AR_WORDS.map((w, i) => '<button type="button" class="basic-tile" data-word="' + i + '"><span>' + w.emoji + '</span><b>' + w.word + '</b><small>' + w.meaning + '</small></button>').join("") + '</div>';
    bindHeader(false);
    panel.querySelectorAll("[data-word]").forEach(b => b.onclick = () => { wordIndex = Number(b.dataset.word); picker = false; renderArWord(); });
  }

  function renderArWord() {
    const tk = ++readToken; // cancels any pending narration timer
    readTab = "lesson";
    const wi = wordIndex % AR_WORDS.length;
    const item = AR_WORDS[wi];
    const blend = item.parts.join("، ") + ". " + item.word;
    const lessonHTML =
      '<div class="basic-focus" style="position:sticky;top:0;z-index:5;box-shadow:0 6px 18px #30205b1a"><div class="basic-emoji">' + item.emoji + '</div>' +
      '<div class="read-parts">' + item.parts.map((p, i) => '<button type="button" class="read-part" data-part="' + i + '">' + p + '</button>').join('<span class="read-plus">+</span>') +
      '<span class="read-plus">=</span><button type="button" class="read-part whole" id="readWhole">' + item.word + '</button></div>' +
      '<h2>' + item.meaning + '</h2><p>اضغط على كل مقطع، وبعدين اضغط على الكلمة كلها</p>' +
      '<button id="readWordListen" class="voice-button" type="button">🔊 اسمع الكلمة</button></div>' +
      '<div class="basic-nav"><button id="readPrevWord" class="secondary" type="button">الكلمة السابقة<span class="pager-arrow">→</span></button>' +
      '<button id="readNextWord" class="primary" type="button">كلمة جديدة<span class="pager-arrow">←</span></button></div>' +
      quizOfferButton();
    const explainHTML =
      '<div class="explain-box"><strong>🧕 الميس بتشرح لك من الصفر</strong><p>كلمة <b>' + item.word + '</b> (' + item.meaning + ') بنبنيها من مقاطعها: ' + item.parts.join(" + ") + ' = ' + item.word + '. اضغط على كل مقطع واسمع صوته، وبعدين ركّبهم على بعض واقرأ الكلمة كلها على بعضها!</p></div>' +
      '<button id="readExplainListen" class="voice-button" type="button">🔊 اسمع الشرح</button><p>اسمع الشرح كويس، وبعدين جرّب 🏆 الاختبار على نفس الكلمة!</p>';
    panel.innerHTML = header("📖 نبني كلمة", true) + readItemHTML(lessonHTML, explainHTML);
    bindHeader(true);
    bindReadTabs();
    bindQuizOffer();
    panel.querySelectorAll("[data-part]").forEach(b => b.onclick = () => speakKey(item.parts[Number(b.dataset.part)], "rd_part_" + wi + "_" + b.dataset.part, "ar-EG"));
    panel.querySelector("#readWhole").onclick = () => speakKey(item.word, "rd_word_" + wi, "ar-EG");
    panel.querySelector("#readWordListen").onclick = () => speakKey(blend, "rd_blend_" + wi, "ar-EG");
    panel.querySelector("#readPrevWord").onclick = () => { wordIndex = (wordIndex + AR_WORDS.length - 1) % AR_WORDS.length; renderArWord(); };
    panel.querySelector("#readNextWord").onclick = () => { wordIndex = (wordIndex + 1) % AR_WORDS.length; renderArWord(); };
    // Full narration — now on the 🧕 الشرح tab (Round 3.2.6 item 2):
    // the whole blend line (rd_blend_*). Round 3.2.3 item 9: on first
    // entry the quiz offer follows the blend in the same sequence (the
    // blend text resolves via BY_TEXT, verified).
    readExplainSpeak = () => { if (!offerSpoken) { offerSpoken = true; speakSequence([blend, QUIZ_OFFER], "ar-EG"); } else speakKey(blend, "rd_blend_" + wi, "ar-EG"); };
    panel.querySelector("#readExplainListen").onclick = () => readExplainSpeak();
  }

  function renderCvcPicker() {
    panel.innerHTML = header("📖 كلمات إنجليزية") +
      '<div class="lesson-title">اختار كلمة يا ملك ماثيو 👑</div><p>اضغط على أي كلمة عشان نسمع أصواتها</p>' +
      '<div class="basic-grid letter-picker">' + CVC_WORDS.map((w, i) => '<button type="button" class="basic-tile" data-cvc="' + i + '"><span>' + w.emoji + '</span><b dir="ltr">' + w.word + '</b></button>').join("") + '</div>';
    bindHeader(false);
    panel.querySelectorAll("[data-cvc]").forEach(b => b.onclick = () => { wordIndex = Number(b.dataset.cvc); picker = false; renderCvc(); });
  }

  function renderCvc() {
    const tk = ++readToken; // cancels any pending narration timer
    readTab = "lesson";
    const wi = wordIndex % CVC_WORDS.length;
    const item = CVC_WORDS[wi];
    const blend = item.sounds.join(", ") + ". " + item.word;
    const lessonHTML =
      '<div class="basic-focus" dir="ltr" style="position:sticky;top:0;z-index:5;box-shadow:0 6px 18px #30205b1a"><div class="basic-emoji">' + item.emoji + '</div>' +
      '<div class="read-parts">' + item.sounds.map((s, i) => '<button type="button" class="read-part" data-sound="' + i + '">' + s + '</button>').join('<span class="read-plus">+</span>') +
      '<span class="read-plus">=</span><button type="button" class="read-part whole" id="readWholeEn">' + item.word + '</button></div>' +
      '<p>اضغط على كل صوت، وبعدين ادمجهم مع بعض</p>' +
      '<button id="readCvcListen" class="voice-button" type="button">🔊 اسمع</button></div>' +
      '<div class="basic-nav"><button id="readPrevCvc" class="secondary" type="button">السابق<span class="pager-arrow">→</span></button>' +
      '<button id="readNextCvc" class="primary" type="button">كلمة جديدة<span class="pager-arrow">←</span></button></div>' +
      quizOfferButton();
    const explainHTML =
      '<div class="explain-box"><strong>🧕 الميس بتشرح لك من الصفر</strong><p>كلمة <b dir="ltr">' + item.word + '</b> بنبنيها من أصواتها: ' + item.sounds.join(" + ") + ' = ' + item.word + '. اضغط على كل صوت واسمعه، وبعدين ادمجهم مع بعض واقرأ الكلمة كلها!</p></div>' +
      '<button id="readExplainListen" class="voice-button" type="button">🔊 اسمع الشرح</button><p>اسمع الشرح كويس، وبعدين جرّب 🏆 الاختبار على نفس الكلمة!</p>';
    panel.innerHTML = header("📖 كلمات إنجليزية", true) + readItemHTML(lessonHTML, explainHTML);
    bindHeader(true);
    bindReadTabs();
    bindQuizOffer();
    panel.querySelectorAll("[data-sound]").forEach(b => b.onclick = () => speakKey(item.sounds[Number(b.dataset.sound)], "rd_cvc_s_" + wi + "_" + b.dataset.sound, "en-US"));
    panel.querySelector("#readWholeEn").onclick = () => speakKey(item.word, "rd_cvc_" + wi, "en-US");
    panel.querySelector("#readCvcListen").onclick = () => speakKey(blend, "rd_cvc_blend_" + wi, "en-US");
    panel.querySelector("#readPrevCvc").onclick = () => { wordIndex = (wordIndex + CVC_WORDS.length - 1) % CVC_WORDS.length; renderCvc(); };
    panel.querySelector("#readNextCvc").onclick = () => { wordIndex = (wordIndex + 1) % CVC_WORDS.length; renderCvc(); };
    // Full narration — now on the 🧕 الشرح tab (Round 3.2.6 item 2):
    // the whole blend line (rd_cvc_blend_*). Round 3.2.3 item 9: on
    // first entry the quiz offer follows the blend in the same sequence
    // (the blend text resolves via BY_TEXT, verified).
    readExplainSpeak = () => { if (!offerSpoken) { offerSpoken = true; speakSequence([blend, QUIZ_OFFER], "en-US"); } else speakKey(blend, "rd_cvc_blend_" + wi, "en-US"); };
    panel.querySelector("#readExplainListen").onclick = () => readExplainSpeak();
  }

  function renderQuiz() {
    const tk = ++readToken;
    // Round 3.2.6 item 3: the quiz is scoped to ONE item only — the
    // letter/word the child was studying (quizCtx, captured by the offer
    // button, the header tab or the 🏆 tab). No more ar/en coin flip.
    if (!quizCtx) quizCtx = { base: (mode === "quiz" ? "ar-syllables" : mode), letterIndex: letterIndex, wordIndex: wordIndex };
    const base = quizCtx.base;
    if (quizCtx.round === undefined) { quizCtx.round = 0; quizCtx.score = 0; }
    const backToLesson = () => { mode = quizCtx.base; picker = false; readTab = "lesson"; render(); };
    if (quizCtx.round >= 4) {
      panel.innerHTML = header("📖 تحدي القراءة") +
        '<div class="basic-focus"><div class="basic-emoji">' + (quizCtx.score >= 3 ? "🏆" : "💪") + '</div><h2>' + (quizCtx.score >= 3 ? "برافو يا بطل!" : "محاولة جميلة!") + '</h2><p>جاوبت صح على ' + quizCtx.score + ' من 4.</p>' +
        '<button id="readQuizAgain" class="primary" type="button">العب تاني ⭐</button>' +
        '<button id="readQuizBackLesson" class="secondary" type="button">ارجع للدرس<span class="pager-arrow">←</span></button></div>';
      bindHeader();
      panel.querySelector("#readBack").onclick = backToLesson;
      panel.querySelector("#readQuizAgain").onclick = () => { quizCtx.round = 0; quizCtx.score = 0; quizCtx.order = null; renderQuiz(); };
      panel.querySelector("#readQuizBackLesson").onclick = backToLesson;
      return;
    }
    // One round: hear the prompt, pick it from 4 choices of the SAME item.
    let spoken, lang, skill, choices, targetId, promptTitle, nextHTML, sayPrompt, targetLabel;
    if (base === "ar-syllables") {
      const letter = LETTERS[quizCtx.letterIndex];
      const syllables = syllablesFor(letter);
      if (!quizCtx.order) quizCtx.order = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 4);
      const si = quizCtx.order[quizCtx.round];
      const target = syllables[si];
      spoken = target.say; lang = "ar-EG"; skill = "reading-syllables";
      const others = shuffle(syllables.filter((_, i) => i !== si)).slice(0, 3);
      choices = shuffle([target].concat(others));
      targetId = target.text; targetLabel = target.text;
      promptTitle = "اسمع المقطع واختار شكله";
      nextHTML = 'مقطع جديد<span class="pager-arrow">←</span>';
      sayPrompt = () => speakKey(spoken, "rd_syl_" + quizCtx.letterIndex + "_" + si, lang);
    } else if (base === "ar-words") {
      const itemIdx = quizCtx.wordIndex % AR_WORDS.length;
      const item = AR_WORDS[itemIdx];
      const useBlend = quizCtx.round % 2 === 1;
      spoken = useBlend ? item.parts.join("، ") + ". " + item.word : item.word;
      lang = "ar-EG"; skill = "reading-ar";
      choices = shuffle([item].concat(shuffle(AR_WORDS.filter(w => w.word !== item.word)).slice(0, 3)));
      targetId = item.word; targetLabel = item.word;
      promptTitle = "اسمع الكلمة واختارها";
      nextHTML = 'كلمة جديدة<span class="pager-arrow">←</span>';
      // Note 22: the replay button re-speaks the prompt ONLY — never
      // the choices (this is a listening-identification quiz).
      sayPrompt = () => { if (useBlend) speakKey(spoken, "rd_blend_" + itemIdx, lang); else speakKey(spoken, "rd_word_" + itemIdx, lang); };
    } else {
      const itemIdx = quizCtx.wordIndex % CVC_WORDS.length;
      const item = CVC_WORDS[itemIdx];
      const useBlend = quizCtx.round % 2 === 1;
      spoken = useBlend ? item.sounds.join(", ") + ". " + item.word : item.word;
      lang = "en-US"; skill = "reading-en";
      choices = shuffle([item].concat(shuffle(CVC_WORDS.filter(w => w.word !== item.word)).slice(0, 3)));
      targetId = item.word; targetLabel = item.word;
      promptTitle = "اسمع واختار الكلمة";
      nextHTML = 'كلمة جديدة<span class="pager-arrow">←</span>';
      // Note 22: the replay button re-speaks the prompt ONLY — never
      // the choices (this is a listening-identification quiz).
      sayPrompt = () => { if (useBlend) speakKey(spoken, "rd_cvc_blend_" + itemIdx, lang); else speakKey(spoken, "rd_cvc_" + itemIdx, lang); };
    }
    const choiceHTML = base === "ar-syllables"
      ? choices.map(c => '<button type="button" class="read-choice" data-choice="' + c.text + '"><b>' + c.text + '</b><small>' + c.label + '</small></button>').join("")
      : choices.map(c => '<button type="button" class="read-choice" data-choice="' + c.word + '"><span>' + c.emoji + '</span><b>' + c.word + '</b></button>').join("");
    panel.innerHTML = header("📖 تحدي القراءة") +
      '<div class="basic-focus"><div class="basic-emoji">🔊</div><h2>' + promptTitle + '</h2><p>سؤال ' + (quizCtx.round + 1) + ' من 4</p>' +
      '<button id="readQuizListen" class="voice-button" type="button">🔊 اسمع السؤال</button>' +
      '<div class="read-choices">' + choiceHTML + '</div>' +
      '<p id="readQuizMsg" class="feedback" aria-live="polite"></p>' +
      '<button id="readQuizNext" class="primary hidden" type="button">' + nextHTML + '</button></div>';
    bindHeader();
    panel.querySelector("#readBack").onclick = backToLesson;
    panel.querySelector("#readQuizListen").onclick = sayPrompt;
    setTimeout(() => { if (tk !== readToken) return; sayPrompt(); }, 200);
    let answered = false;
    panel.querySelectorAll("[data-choice]").forEach(b => b.onclick = () => {
      if (answered) return; answered = true;
      const correct = b.dataset.choice === targetId;
      try { window.MatthewMastery?.record(skill, correct); window.MatthewMastery?.record(skill + ":" + targetId, correct); } catch (_) { /* ignore */ }
      if (correct) quizCtx.score++;
      b.classList.add(correct ? "correct" : "wrong");
      panel.querySelectorAll("[data-choice]").forEach(x => { x.disabled = true; if (x.dataset.choice === targetId) x.classList.add("correct"); });
      // The praise / correction line is per quiz type, exactly as the
      // lesson taught it: syllables get the plain praise, AR words the
      // reading praise, CVC the "قراءة جميلة" praise — and the miss
      // line names the word ("دي كلمة …" / "الكلمة دي …").
      const praise = base === "ar-words" ? "برافو! قرأت الكلمة صح ⭐" : base === "cvc" ? "قراءة جميلة! ⭐" : "برافو! إجابة صح ⭐";
      const miss = base === "ar-words" ? "دي كلمة " + targetLabel + ". اسمعها كويس وجرب اللي بعدها." : base === "cvc" ? "الكلمة دي " + targetLabel + ". اسمعها كويس وجرب اللي بعدها." : "ولا يهمك! الصح هو " + targetLabel + ". اسمعها كويس وجرب اللي بعدها.";
      panel.querySelector("#readQuizMsg").textContent = correct ? praise : miss;
      if (correct) window.MatthewVoice?.feedback("correct"); else window.MatthewVoice?.feedback("wrong");
      panel.querySelector("#readQuizNext").classList.remove("hidden");
      panel.querySelector("#readQuizNext").onclick = () => { quizCtx.round++; renderQuiz(); };
    });
  }
  card.addEventListener("click", open);
})();
