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
    { base: "ب", joined: "بـ", name: "الباء" },
    { base: "ت", joined: "تـ", name: "التاء" },
    { base: "ث", joined: "ثـ", name: "الثاء" },
    { base: "م", joined: "مـ", name: "الميم" },
    { base: "ن", joined: "نـ", name: "النون" },
    { base: "س", joined: "سـ", name: "السين" },
    { base: "ك", joined: "كـ", name: "الكاف" },
    { base: "ل", joined: "لـ", name: "اللام" },
    { base: "ف", joined: "فـ", name: "الفاء" },
    { base: "ع", joined: "عـ", name: "العين" }
  ];

  function syllablesFor(letter) {
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
    { parts: ["بَ", "طَّة"], word: "بَطَّة", meaning: "بطة بتعوم", emoji: "🦆" },
    { parts: ["أَ", "سَد"], word: "أَسَد", meaning: "أسد قوي", emoji: "🦁" },
    { parts: ["قَ", "مَر"], word: "قَمَر", meaning: "قمر في السما", emoji: "🌙" },
    { parts: ["شَ", "مْس"], word: "شَمْس", meaning: "شمس منوّرة", emoji: "☀️" },
    { parts: ["كَ", "لْب"], word: "كَلْب", meaning: "كلب صديق", emoji: "🐶" },
    { parts: ["قِ", "طَّة"], word: "قِطَّة", meaning: "قطة صغيرة", emoji: "🐱" },
    { parts: ["بَ", "حْر"], word: "بَحْر", meaning: "بحر كبير", emoji: "🌊" },
    { parts: ["نَ", "جْم"], word: "نَجْم", meaning: "نجم بيلمع", emoji: "⭐" },
    { parts: ["تُ", "فَّاح"], word: "تُفَّاح", meaning: "تفاح حلو", emoji: "🍎" }
  ];

  const CVC_WORDS = [
    { sounds: ["c", "a", "t"], word: "cat", emoji: "🐱" },
    { sounds: ["d", "o", "g"], word: "dog", emoji: "🐶" },
    { sounds: ["p", "i", "g"], word: "pig", emoji: "🐷" },
    { sounds: ["s", "u", "n"], word: "sun", emoji: "☀️" },
    { sounds: ["b", "u", "s"], word: "bus", emoji: "🚌" },
    { sounds: ["e", "g", "g"], word: "egg", emoji: "🥚" },
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

  const speak = (text, lang) => {
    if (window.MatthewVoice && window.MatthewVoice.speak) window.MatthewVoice.speak(text, lang);
    else if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 0.85; speechSynthesis.speak(u);
    }
  };
  const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  let mode = "ar-syllables", letterIndex = 0, wordIndex = 0;

  function open() {
    gameList.classList.add("hidden");
    learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    document.getElementById("parentPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    learningList.classList.remove("hidden");
    window.MatthewVoice?.stop();
  }

  function header(title) {
    return '<div class="quiz-top"><button id="readBack" class="back" type="button">🏠 الرئيسية</button><strong>' + title + '</strong><span>📖</span></div>' +
      '<div class="trace-sets">' +
      '<button type="button" class="trace-set' + (mode === "ar-syllables" ? " active" : "") + '" data-mode="ar-syllables">مقاطع عربي</button>' +
      '<button type="button" class="trace-set' + (mode === "ar-words" ? " active" : "") + '" data-mode="ar-words">كلمات عربي</button>' +
      '<button type="button" class="trace-set' + (mode === "en-cvc" ? " active" : "") + '" data-mode="en-cvc">English CVC</button>' +
      '<button type="button" class="trace-set' + (mode === "quiz" ? " active" : "") + '" data-mode="quiz">تحدي القراءة</button></div>';
  }

  function bindHeader(title) {
    panel.querySelector("#readBack").onclick = close;
    panel.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { mode = b.dataset.mode; render(); });
  }

  function render() {
    if (mode === "ar-syllables") renderSyllables();
    else if (mode === "ar-words") renderArWord();
    else if (mode === "en-cvc") renderCvc();
    else renderQuiz();
  }

  function renderSyllables() {
    const letter = LETTERS[letterIndex];
    const syllables = syllablesFor(letter);
    panel.innerHTML = header("📖 مقاطع حرف " + letter.name) +
      '<p class="touch-game-instruction">اضغط على كل مقطع واسمع صوته. الحرف بيغيّر صوته مع الفتحة والكسرة والضمة والمد.</p>' +
      '<div class="read-syllables">' + syllables.map((s, i) => '<button type="button" class="read-syllable" data-syl="' + i + '"><b>' + s.text + '</b><small>' + s.label + '</small></button>').join("") + '</div>' +
      '<div class="basic-nav"><button id="readPrevLetter" class="secondary" type="button">الحرف السابق</button>' +
      '<button id="readNextLetter" class="primary" type="button">الحرف التالي ←</button></div>';
    bindHeader();
    panel.querySelectorAll("[data-syl]").forEach(b => b.onclick = () => speak(syllables[Number(b.dataset.syl)].say, "ar-EG"));
    panel.querySelector("#readPrevLetter").onclick = () => { letterIndex = (letterIndex + LETTERS.length - 1) % LETTERS.length; renderSyllables(); };
    panel.querySelector("#readNextLetter").onclick = () => { letterIndex = (letterIndex + 1) % LETTERS.length; renderSyllables(); };
    setTimeout(() => speak(letter.name + ". " + syllables[0].say + ". " + syllables[3].say, "ar-EG"), 150);
  }

  function renderArWord() {
    const item = AR_WORDS[wordIndex % AR_WORDS.length];
    panel.innerHTML = header("📖 نبني كلمة") +
      '<div class="basic-focus"><div class="basic-emoji">' + item.emoji + '</div>' +
      '<div class="read-parts">' + item.parts.map((p, i) => '<button type="button" class="read-part" data-part="' + i + '">' + p + '</button>').join('<span class="read-plus">+</span>') +
      '<span class="read-plus">=</span><button type="button" class="read-part whole" id="readWhole">' + item.word + '</button></div>' +
      '<h2>' + item.meaning + '</h2><p>اضغط على كل مقطع، وبعدين اضغط على الكلمة كلها</p>' +
      '<button id="readWordListen" class="voice-button" type="button">🔊 اسمع الكلمة</button></div>' +
      '<div class="basic-nav"><button id="readPrevWord" class="secondary" type="button">الكلمة السابقة</button>' +
      '<button id="readNextWord" class="primary" type="button">كلمة جديدة ←</button></div>';
    bindHeader();
    panel.querySelectorAll("[data-part]").forEach(b => b.onclick = () => speak(item.parts[Number(b.dataset.part)], "ar-EG"));
    panel.querySelector("#readWhole").onclick = () => speak(item.word, "ar-EG");
    panel.querySelector("#readWordListen").onclick = () => speak(item.parts.join("، ") + ". " + item.word, "ar-EG");
    panel.querySelector("#readPrevWord").onclick = () => { wordIndex = (wordIndex + AR_WORDS.length - 1) % AR_WORDS.length; renderArWord(); };
    panel.querySelector("#readNextWord").onclick = () => { wordIndex = (wordIndex + 1) % AR_WORDS.length; renderArWord(); };
  }

  function renderCvc() {
    const item = CVC_WORDS[wordIndex % CVC_WORDS.length];
    panel.innerHTML = header("📖 English CVC Words") +
      '<div class="basic-focus" dir="ltr"><div class="basic-emoji">' + item.emoji + '</div>' +
      '<div class="read-parts">' + item.sounds.map((s, i) => '<button type="button" class="read-part" data-sound="' + i + '">' + s + '</button>').join('<span class="read-plus">+</span>') +
      '<span class="read-plus">=</span><button type="button" class="read-part whole" id="readWholeEn">' + item.word + '</button></div>' +
      '<p>Tap each sound, then blend them together</p>' +
      '<button id="readCvcListen" class="voice-button" type="button">🔊 Listen</button></div>' +
      '<div class="basic-nav"><button id="readPrevCvc" class="secondary" type="button">Previous</button>' +
      '<button id="readNextCvc" class="primary" type="button">New word →</button></div>';
    bindHeader();
    panel.querySelectorAll("[data-sound]").forEach(b => b.onclick = () => speak(item.sounds[Number(b.dataset.sound)], "en-US"));
    panel.querySelector("#readWholeEn").onclick = () => speak(item.word, "en-US");
    panel.querySelector("#readCvcListen").onclick = () => speak(item.sounds.join(", ") + ". " + item.word, "en-US");
    panel.querySelector("#readPrevCvc").onclick = () => { wordIndex = (wordIndex + CVC_WORDS.length - 1) % CVC_WORDS.length; renderCvc(); };
    panel.querySelector("#readNextCvc").onclick = () => { wordIndex = (wordIndex + 1) % CVC_WORDS.length; renderCvc(); };
  }

  function renderQuiz() {
    const useArabic = Math.random() < 0.5;
    let prompt, spoken, lang, skill, choices;
    if (useArabic) {
      const item = AR_WORDS[Math.floor(Math.random() * AR_WORDS.length)];
      prompt = item.emoji + " " + item.meaning;
      spoken = item.word; lang = "ar-EG"; skill = "reading-ar";
      choices = shuffle([item, ...shuffle(AR_WORDS.filter(w => w.word !== item.word)).slice(0, 3)]);
      panel.innerHTML = header("📖 تحدي القراءة") +
        '<div class="basic-focus"><div class="basic-emoji">' + item.emoji + '</div><h2>اسمع الكلمة واختارها</h2>' +
        '<button id="readQuizListen" class="voice-button" type="button">🔊 اسمع الكلمة</button>' +
        '<div class="read-choices">' + choices.map(c => '<button type="button" class="read-choice" data-word="' + c.word + '">' + c.word + '</button>').join("") + '</div>' +
        '<p id="readQuizMsg" class="feedback" aria-live="polite"></p>' +
        '<button id="readQuizNext" class="primary hidden" type="button">كلمة جديدة ←</button></div>';
      bindHeader();
      panel.querySelector("#readQuizListen").onclick = () => speak(spoken, lang);
      setTimeout(() => speak(spoken, lang), 200);
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
      const item = CVC_WORDS[Math.floor(Math.random() * CVC_WORDS.length)];
      spoken = item.word; lang = "en-US"; skill = "reading-en";
      choices = shuffle([item, ...shuffle(CVC_WORDS.filter(w => w.word !== item.word)).slice(0, 3)]);
      panel.innerHTML = header("📖 Reading Challenge") +
        '<div class="basic-focus" dir="ltr"><div class="basic-emoji">' + item.emoji + '</div><h2>Listen and choose the word</h2>' +
        '<button id="readQuizListen" class="voice-button" type="button">🔊 Listen</button>' +
        '<div class="read-choices">' + choices.map(c => '<button type="button" class="read-choice" data-word="' + c.word + '">' + c.word + '</button>').join("") + '</div>' +
        '<p id="readQuizMsg" class="feedback" aria-live="polite"></p>' +
        '<button id="readQuizNext" class="primary hidden" type="button">New word →</button></div>';
      bindHeader();
      panel.querySelector("#readQuizListen").onclick = () => speak(spoken, lang);
      setTimeout(() => speak(spoken, lang), 200);
      let answered = false;
      panel.querySelectorAll("[data-word]").forEach(b => b.onclick = () => {
        if (answered) return; answered = true;
        const correct = b.dataset.word === item.word;
        try { window.MatthewMastery?.record(skill, correct); window.MatthewMastery?.record("read-cvc:" + item.word, correct); } catch (_) { /* ignore */ }
        b.classList.add(correct ? "correct" : "wrong");
        panel.querySelectorAll("[data-word]").forEach(x => { x.disabled = true; if (x.dataset.word === item.word) x.classList.add("correct"); });
        panel.querySelector("#readQuizMsg").textContent = correct ? "Great reading! ⭐" : "That word is " + item.word + ". Listen carefully and try the next one.";
        if (correct) window.MatthewVoice?.feedback("correct"); else window.MatthewVoice?.feedback("wrong");
        panel.querySelector("#readQuizNext").classList.remove("hidden");
        panel.querySelector("#readQuizNext").onclick = renderQuiz;
      });
    }
  }

  card.addEventListener("click", open);
})();
