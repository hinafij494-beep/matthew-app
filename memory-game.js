"use strict";
/*
 * لعبة الذاكرة — بطاقات مقلوبة، يقلب ماثيو بطاقتين ويلاقي الصورتين
 * اللي شبه بعض. ٦ أزواج في كل جولة (١٢ بطاقة)، مختارة عشوائياً من
 * ٨ صور — والموضوع يتبدل كل جولة: حيوانات ← أرقام ← حروف ← حيوانات...
 * فلا تتكرر الجولة نفسها أبداً (ما يزهقش). صور بس، من غير قراءة.
 *
 * الصوت: مقدمة مس نانسي المنطوقة، واسم الصورة عند قلب أي بطاقة
 * (زي لعبة التوصيل: الدوس على الصورة ينطق اسمها)، وتشجيع عند كل تطابق.
 * التشجيع يُقال على جزأين بالترتيب: اسم الصورة أولاً (مقطع الاسم
 * المسجل)، ثم جملة تشجيع دوّارة (mem_match_1/2/3) — الاسم لا يُخبز
 * داخل جملة التشجيع، بل يُنطق بمقطعه الخاص ثم تتبعه الجملة. عند
 * ٣ أزواج (نص الجولة) تُقال جملة النصف (mem_half) بدل جملة التدوير.
 * عند عدم التطابق جملة لطيفة دوّارة (mem_try_1/2) — من غير أي لوم
 * أو كلمة سلبية أبداً. كل تطابق يسجَّل في MatthewMastery تحت
 * "memory-game" (نجمة ⭐ لكل تطابق)، وإنهاء اللعبة يكسب ألماسة 💎.
 *
 * الأرقام والحروف تُرسم كنص كبير بخط القاهرة (الرقم ٢ بالشكل المعتمد
 * زي الـ ٦ المعكوسة)، وأسماؤها تُنطق: الأرقام بالمصري (واحد، اتنين...)
 * والحروف بالفصحى (ألف، باء...).
 *
 * ملحوظة البناء: الملف جزء من حزمة interactive-games.js (يُضاف لقائمة
 * PARTS في build_bundle.py). بطاقته data-memory="1" وتحتاج قاعدة تصنيف
 * في app.js (classify) عشان تظهر في باب الألعاب — شوف تقرير التسليم.
 */
(() => {
  // ---------- pure helpers (exposed for tests even without a DOM) ----------
  // كل موضوع ٨ صور؛ الجولة تسحب ٦ أزواج عشوائياً من موضوعها.
  const ANIMALS = [
    { id: "lion", face: "🦁", kind: "emoji", name: "أسد" },
    { id: "cat", face: "🐱", kind: "emoji", name: "قطة" },
    { id: "dog", face: "🐶", kind: "emoji", name: "كلب" },
    { id: "fish", face: "🐟", kind: "emoji", name: "سمكة" },
    { id: "elephant", face: "🐘", kind: "emoji", name: "فيل" },
    { id: "rabbit", face: "🐰", kind: "emoji", name: "أرنب" },
    { id: "bird", face: "🐦", kind: "emoji", name: "عصفور" },
    { id: "butterfly", face: "🦋", kind: "emoji", name: "فراشة" }
  ];
  const NUMBERS = [
    { id: "num1", face: "١", kind: "text", name: "واحد" },
    { id: "num2", face: "٢", kind: "text", name: "اتنين" },
    { id: "num3", face: "٣", kind: "text", name: "تلاتة" },
    { id: "num4", face: "٤", kind: "text", name: "أربعة" },
    { id: "num5", face: "٥", kind: "text", name: "خمسة" },
    { id: "num6", face: "٦", kind: "text", name: "ستة" },
    { id: "num7", face: "٧", kind: "text", name: "سبعة" },
    { id: "num8", face: "٨", kind: "text", name: "تمانية" }
  ];
  const LETTERS = [
    { id: "let-alif", face: "أ", kind: "text", name: "ألف" },
    { id: "let-baa", face: "ب", kind: "text", name: "باء" },
    { id: "let-taa", face: "ت", kind: "text", name: "تاء" },
    { id: "let-thaa", face: "ث", kind: "text", name: "ثاء" },
    { id: "let-jeem", face: "ج", kind: "text", name: "جيم" },
    { id: "let-haa", face: "ح", kind: "text", name: "حاء" },
    { id: "let-khaa", face: "خ", kind: "text", name: "خاء" },
    { id: "let-daal", face: "د", kind: "text", name: "دال" }
  ];
  const THEMES = [ANIMALS, NUMBERS, LETTERS];
  const POOL = ANIMALS;
  const PAIRS_PER_GAME = 6;
  const MEM_INTRO = "لعبة الذاكرة يا ملك ماثيو! أنا مس نانسي وبحبك أوي! اقلب الكروت ولاقي الصورتين اللي شبه بعض يا بطل!";
  // Round 3.2.1 note 25b (Miss Nancy draft): second intro, rotated with
  // MEM_INTRO so the game opening varies. nancy_intro_memory (the draft's
  // first variant) is a near-duplicate of MEM_INTRO (78% overlap) and is
  // deliberately NOT a separate clip.
  const MEM_INTRO_2 = "يلا يا بطل ماثيو! أنا مس نانسي، افتح كارتين، لو شبه بعض يبقوا بتوعك! افتكر كويس!";
  const MEM_WIN = "برافو يا ملك ماثيو! لقيت كل الصور! أنت بطل الذاكرة! خدت ألماسة جديدة لتاجك!";
  // جمل التشجيع الدوّارة — بلا اسم صورة داخلها: الاسم يُنطق أولاً
  // بمقطعه الخاص، ثم تتبعه الجملة (انظر praiseMatch).
  const MEM_MATCH = [
    "برافو يا ملك ماثيو! شاطر خالص!",
    "يا سلام يا بطل ماثيو! الصورتين شبه بعض! عينك قوية أوي!",
    "أحسنت يا ملك ماثيو! أنت ذكي أوي يا بطل!"
  ];
  const MEM_HALF = "برافو يا ملك ماثيو! لقيت نص الصور! كمّل يا بطل، فاضل شوية صغيرين!";
  const MEM_TRY = [
    "حاول تاني يا بطل",
    "قربت يا ملك ماثيو! افتكر مكان الصور وحاول تاني!"
  ];
  const MEM_AGAIN = "يلا نلعب تاني يا ملك ماثيو! كروت جديدة مستنياك!";
  const themeFor = round => THEMES[((round % THEMES.length) + THEMES.length) % THEMES.length];
  const shuffleWith = (arr, rand) => {
    const b = [...arr];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  // Pick `count` pairs from the pool and return a shuffled 2×count deck.
  function buildDeck(pool, count, rand) {
    const r = typeof rand === "function" ? rand : Math.random;
    const chosen = shuffleWith(pool, r).slice(0, count);
    const deck = [];
    chosen.forEach((p, i) => {
      deck.push({ pair: i, id: p.id, face: p.face, kind: p.kind, name: p.name });
      deck.push({ pair: i, id: p.id, face: p.face, kind: p.kind, name: p.name });
    });
    return shuffleWith(deck, r);
  }
  if (typeof window !== "undefined") {
    window.MatthewMemory = {
      open: () => openGame(),
      buildDeck,
      pool: POOL,
      themes: THEMES,
      themeFor,
      pairsPerGame: PAIRS_PER_GAME,
      intro: MEM_INTRO,
      intro2: MEM_INTRO_2,
      win: MEM_WIN,
      matchLines: MEM_MATCH,
      half: MEM_HALF,
      tryLines: MEM_TRY,
      again: MEM_AGAIN
    };
  }

  // ---------- DOM part ----------
  const main = document.querySelector("main");
  const learningList = document.getElementById("learningList");
  const gameList = document.getElementById("gameList");
  if (!main || !gameList) return;

  if (!document.getElementById("memoryGameStyle")) {
    const style = document.createElement("style");
    style.id = "memoryGameStyle";
    style.textContent =
      ".mem-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0}" +
      ".mem-card{border:0;background:none;padding:0;cursor:pointer;perspective:700px;min-height:100px}" +
      ".mem-inner{position:relative;display:block;width:100%;height:100%;min-height:100px;transform-style:preserve-3d;transition:transform .45s ease}" +
      ".mem-card.flipped .mem-inner{transform:rotateY(180deg)}" +
      ".mem-face{position:absolute;inset:0;display:grid;place-items:center;border-radius:18px;font-size:44px;backface-visibility:hidden;-webkit-backface-visibility:hidden}" +
      ".mem-face.mem-text{font-size:56px;font-family:\"Cairo\",\"Noto Naskh Arabic\",sans-serif;font-weight:700}" +
      ".mem-front{background:linear-gradient(150deg,#7c5cff,#5b3cc4);color:#fff;box-shadow:0 4px 12px #5b3cc42e;border:3px solid #fff}" +
      ".mem-back{background:#fff7e0;transform:rotateY(180deg);border:3px solid #ffd94d;box-shadow:0 4px 12px #30205b14}" +
      ".mem-card.matched .mem-back{border-color:#30b978;background:#e5f8ef}" +
      ".mem-card.matched{cursor:default}" +
      ".mem-win{text-align:center;padding:10px}" +
      ".mem-win .mem-trophy{font-size:72px}" +
      ".mem-win .result-stars{font-size:34px}" +
      "@media(max-width:360px){.mem-board{gap:7px}.mem-card,.mem-inner{min-height:78px}.mem-face{font-size:34px}.mem-face.mem-text{font-size:44px}}";
    document.head.appendChild(style);
  }

  const speak = text => window.MatthewVoice?.speak(text, "ar-EG");
  // نطق جمل متتابعة بمقاطعها المسجلة بالترتيب (الاسم أولاً ثم التشجيع)؛
  // لو غاب speakSequence ننطقها واحدة ورا التانية بفاصل.
  const speakSeq = texts => {
    try {
      if (window.MatthewVoice?.speakSequence) { window.MatthewVoice.speakSequence(texts, "ar-EG"); return; }
    } catch (_) {}
    texts.forEach((t, i) => setTimeout(() => speak(t), i * 1500));
  };
  const arDigits = value => String(value).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

  const panel = document.createElement("section");
  panel.id = "memoryPanel";
  panel.className = "quiz-panel hidden";
  main.insertBefore(panel, document.querySelector("footer"));

  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card purple";
  card.setAttribute("data-memory", "1");
  card.innerHTML = '<span class="game-icon">🧠</span><strong>لعبة الذاكرة</strong><small>اقلب الكروت ولاقي الصورتين اللي شبه بعض</small><span class="play">يلا نلعب ←</span>';
  gameList.append(card);

  let deck = [], flipped = [], matched = new Set(), lock = false, found = 0;
  let round = 0, matchIndex = 0, tryIndex = 0;
  // Round 3.2.1 note 25b: intro rotation — the replay button re-speaks
  // whichever intro opened this round (lastMemIntro), not always MEM_INTRO.
  let memIntroIndex = 0, lastMemIntro = MEM_INTRO;

  // Praise, delayed a beat so it never cuts the card name that just
  // played (MatthewVoice serialises speech; the token drops stale praise
  // when the child flips again quickly). Same pattern as color-games.js.
  // The praise is the picture's name clip FIRST, then the rotating praise
  // line in sequence — the name is never baked into the praise clip.
  // At the halfway mark (3/6) the half-way cheer replaces the rotation.
  let praiseToken = 0;
  function praiseMatch(name) {
    const token = ++praiseToken;
    const line = found === PAIRS_PER_GAME / 2 ? MEM_HALF : MEM_MATCH[matchIndex++ % MEM_MATCH.length];
    setTimeout(() => { if (token === praiseToken) speakSeq([name, line]); }, 900);
  }

  function openGame() {
    gameList.classList.add("hidden");
    if (learningList) learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    document.getElementById("parentPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    newGame();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    try { window.MatthewVoice?.stop(); } catch (_) {}
  }

  function header() {
    return '<div class="quiz-top"><button id="memBack" class="back" type="button">→ رجوع</button><strong>🧠 لعبة الذاكرة</strong><span>⭐ ' + arDigits(found) + " / " + arDigits(PAIRS_PER_GAME) + "</span></div>";
  }

  function newGame(quiet) {
    deck = buildDeck(themeFor(round++), PAIRS_PER_GAME);
    flipped = [];
    matched = new Set();
    lock = false;
    found = 0;
    panel.innerHTML = header() +
      '<button id="memListen" class="voice-button" type="button">🔊 اسمع السؤال</button>' +
      '<div class="mem-board anim-enter">' + deck.map((c, i) =>
        '<button type="button" class="mem-card" data-card="' + i + '" aria-label="بطاقة مقلوبة"><span class="mem-inner">' +
        '<span class="mem-face mem-front">👑</span>' +
        '<span class="mem-face mem-back' + (c.kind === "text" ? " mem-text" : "") + '">' + c.face + "</span></span></button>"
      ).join("") + "</div>" +
      '<p id="memMsg" class="cg-msg" aria-live="polite"></p>';
    panel.querySelector("#memBack").onclick = back;
    panel.querySelector("#memListen").onclick = () => speak(lastMemIntro);
    panel.querySelectorAll("[data-card]").forEach(b => b.addEventListener("click", () => onCard(b)));
    if (!quiet) { lastMemIntro = memIntroIndex++ % 2 === 0 ? MEM_INTRO : MEM_INTRO_2; speak(lastMemIntro); }
  }

  function playAgain() {
    newGame(true);
    speakSeq([MEM_AGAIN, MEM_INTRO]);
  }

  function onCard(button) {
    if (lock) return;
    const card = deck[Number(button.dataset.card)];
    if (!card || button.classList.contains("flipped") || matched.has(card.pair)) return;
    button.classList.add("flipped");
    speak(card.name);
    flipped.push(button);
    if (flipped.length < 2) return;
    const [a, b] = flipped;
    const ca = deck[Number(a.dataset.card)], cb = deck[Number(b.dataset.card)];
    flipped = [];
    if (ca.pair === cb.pair) {
      matched.add(ca.pair);
      found++;
      try { window.MatthewMastery?.record("memory-game", true); } catch (_) {}
      praiseMatch(ca.name);
      a.classList.add("matched", "anim-celebrate");
      b.classList.add("matched", "anim-celebrate");
      const head = panel.querySelector(".quiz-top span");
      if (head) head.textContent = "⭐ " + arDigits(found) + " / " + arDigits(PAIRS_PER_GAME);
      const msg = panel.querySelector("#memMsg");
      if (msg) msg.textContent = "برافو يا ملك ماثيو! لقيت " + ca.name + " ⭐";
      if (found >= PAIRS_PER_GAME) setTimeout(win, 900);
    } else {
      lock = true;
      const msg = panel.querySelector("#memMsg");
      if (msg) msg.textContent = "محاولة جميلة! جرّب تاني 💜";
      const tryLine = MEM_TRY[tryIndex++ % MEM_TRY.length];
      setTimeout(() => speak(tryLine), 700);
      setTimeout(() => {
        a.classList.remove("flipped");
        b.classList.remove("flipped");
        lock = false;
      }, 950);
    }
  }

  function win() {
    try { window.MatthewMastery?.awardCrown?.(0, 1); } catch (_) {}
    speak(MEM_WIN);
    if (typeof updateStats === "function") { try { updateStats(); } catch (_) {} }
    panel.innerHTML = header() +
      '<div class="mem-win anim-enter"><div class="mem-trophy">🏆</div>' +
      '<h2 class="touch-game-title">برافو يا ملك ماثيو!</h2>' +
      '<div class="result-stars">' + "⭐".repeat(PAIRS_PER_GAME) + '</div>' +
      '<p class="feedback">لقيت كل الصور! خدت ألماسة جديدة لتاجك 💎</p>' +
      '<button id="memAgain" class="primary" type="button">العب تاني <span class="pager-arrow">←</span></button>' +
      '<button id="memHome" class="secondary" type="button">اختار لعبة تانية 🎮</button></div>';
    panel.querySelector("#memBack").onclick = back;
    panel.querySelector("#memAgain").onclick = playAgain;
    panel.querySelector("#memHome").onclick = back;
  }

  card.addEventListener("click", openGame);
})();
