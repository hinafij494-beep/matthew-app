"use strict";
/*
 * ورشة ألعاب وتلوين الملك ماثيو — ثلاث ألعاب تلوين ذكية تربط اللعب
 * بالتركيز والتعلّم (الأرقام، الألوان، الأنماط)، مع مكافآت ملكية:
 * كل إجابة صح تكسب نجمة ⭐، وكل لعبة كاملة تكسب ألماسة 💎 لتاج الملك.
 *
 * الألعاب:
 *  ١) لوني العدد — تاج مقسّم ٦ أجزاء، كل جزء عليه رقم؛ الطفل يختار لوناً
 *     من اللوحة ثم يضغط الجزء الذي يطابق رقمه ذلك اللون. الجولات تتدرج
 *     بالأرقام من ١ إلى ٢٠ (١–٦، ثم ٧–١٢، ثم ١٣–١٨، ثم ١٥–٢٠).
 *  ٢) سحب لون الطبيعة — صورة رمادية من دروس العلوم (تفاحة، شمس، سمكة...)
 *     والطفل يختار لونها الحقيقي من اللوحة، مع معلومة علمية قصيرة.
 *  ٣) أكمل تلوين النمط — صف من ٦ خانات، آخر خانة فارغة؛ النمط يتدرج
 *     من ABAB إلى AAB ثم AABB، مع ٣ ألوان للاختيار.
 *
 * لا توجد أي عبارة سلبية عند الخطأ — فقط "حاول تاني يا بطل" بصوت لطيف.
 * كل إجابة تُسجَّل في MatthewMastery تحت "color-games" + مهارة اللعبة.
 */
(() => {
  const main = document.querySelector("main");
  const learningList = document.getElementById("learningList");
  const gameList = document.getElementById("gameList");
  if (!main || !gameList) return;

  // ---------- injected styles (unique cg-* / royal-crown-shelf names) ----------
  if (!document.getElementById("colorGamesStyle")) {
    const style = document.createElement("style");
    style.id = "colorGamesStyle";
    style.textContent =
      ".royal-crown-shelf{display:flex;gap:12px;align-items:center;margin-top:14px;background:#ffffff22;border:1px solid #ffffff40;border-radius:999px;padding:7px 16px;font-size:13px;font-weight:800;width:max-content;max-width:100%;color:#fff}" +
      ".royal-crown-shelf b{font-size:15px}" +
      ".game-card[data-workshop]{background:linear-gradient(140deg,#ffd9ec,#ffeef7)}" +
      ".cg-tabs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:12px 0}" +
      ".cg-tab{border:2px solid #e8e2f7;background:#faf8ff;color:#392f54;border-radius:999px;padding:9px 14px;font:800 15px inherit;cursor:pointer}" +
      ".cg-tab.active{border-color:#6d4bd1;background:#eee8ff}" +
      ".cg-counter{text-align:center;background:#fff7e0;border:2px dashed #f0b429;border-radius:16px;padding:8px 12px;margin:10px 0;font-weight:800;font-size:15px;color:#5b3c00}" +
      ".cg-instruction{text-align:center;color:#6e6880;font-weight:700;line-height:1.8;margin:6px 0}" +
      ".cg-round{text-align:center;font-weight:800;color:#5035b2;margin:8px 0}" +
      ".cg-legend{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:12px 0}" +
      ".cg-legend-chip{display:flex;align-items:center;gap:6px;background:#f8f6ff;border:2px solid #e8e2f7;border-radius:999px;padding:6px 12px;font-weight:800;font-size:15px}" +
      ".cg-dot{width:18px;height:18px;border-radius:50%;display:inline-block;border:2px solid #0002;flex-shrink:0}" +
      ".cg-palette{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:14px 0}" +
      ".cg-color-btn{min-width:88px;border:3px solid #0001;border-radius:16px;padding:13px 10px;font:800 15px inherit;cursor:pointer;box-shadow:0 3px 10px #30205b14}" +
      ".cg-color-btn.selected{border-color:#5b3cc4;transform:scale(1.07);box-shadow:0 0 0 3px #d9ccff}" +
      ".cg-crown-wrap{text-align:center;margin:8px 0}" +
      ".cg-crown-wrap svg{max-width:100%;height:auto}" +
      ".cg-crown-part{cursor:pointer;transform-box:fill-box;transform-origin:center}" +
      ".cg-crown-part text{pointer-events:none;font-family:inherit}" +
      ".cg-crown-part.done{animation:cgPop .45s ease}" +
      "@keyframes cgPop{0%{transform:scale(.82);opacity:.5}60%{transform:scale(1.07)}100%{transform:scale(1)}}" +
      ".cg-nature{text-align:center;padding:10px}" +
      ".cg-nature-emoji{font-size:96px;line-height:1.25}" +
      ".cg-nature-emoji.cg-grey{filter:grayscale(1);opacity:.45}" +
      ".cg-nature-emoji.cg-pop{animation:cgPop .5s ease}" +
      ".cg-nature-name{font-size:22px;font-weight:900;margin:6px 0}" +
      ".cg-pattern{display:flex;gap:10px;justify-content:center;margin:18px 0;flex-wrap:wrap}" +
      ".cg-slot{width:52px;height:52px;border-radius:50%;border:3px solid #d9d2f0;display:grid;place-items:center;font-size:24px;font-weight:900;background:#faf8ff;color:#5b3cc4}" +
      ".cg-slot.empty{border-style:dashed;background:#fff;color:#b9a8e8}" +
      ".cg-slot.cg-pop{animation:cgPop .45s ease}" +
      ".cg-msg{min-height:24px;font-weight:800;font-size:14px;text-align:center}" +
      ".cg-next{max-width:420px;margin-left:auto;margin-right:auto}";
    document.head.appendChild(style);
  }

  // ---------- shared data ----------
  const COLORS = [
    { id: "red", name: "أحمر", hex: "#e53935", text: "#ffffff" },
    { id: "blue", name: "أزرق", hex: "#1e88e5", text: "#ffffff" },
    { id: "yellow", name: "أصفر", hex: "#f9a825", text: "#5b3c00" },
    { id: "green", name: "أخضر", hex: "#43a047", text: "#ffffff" },
    { id: "orange", name: "برتقالي", hex: "#fb8c00", text: "#ffffff" },
    { id: "purple", name: "بنفسجي", hex: "#8e24aa", text: "#ffffff" },
    { id: "white", name: "أبيض", hex: "#ffffff", text: "#555555" },
    { id: "pink", name: "وردي", hex: "#f48fb1", text: "#5b2340" }
  ];
  const colorById = id => COLORS.find(c => c.id === id) || COLORS[0];
  const NUM_NAMES = ["واحد", "اتنين", "تلاتة", "أربعة", "خمسة", "ستة", "سبعة", "تمانية", "تسعة", "عشرة", "حداشر", "اتناشر", "تلتاشر", "أربعتاشر", "خمستاشر", "ستاشر", "سبعتاشر", "تمنتاشر", "تسعتاشر", "عشرين"];
  // رقم العدد -> لونه في المفتاح (الألوان الستة تتكرر بعد ٦).
  const legendColorFor = n => COLORS[(n - 1) % 6];

  const NATURE = [
    { emoji: "🍎", name: "تفاحة", color: "red", fact: "التفاحة حمرا وصحية! التفاح بيقوّي جسمك يا بطل!" },
    { emoji: "☀️", name: "شمس", color: "yellow", fact: "الشمس صفرا ومنوّرة! الشمس بتدفّي الدنيا كلها!" },
    { emoji: "🐟", name: "سمكة", color: "blue", fact: "السمكة زرقا وبتعوم في البحر الأزرق!" },
    { emoji: "🍃", name: "ورقة شجرة", color: "green", fact: "ورقة الشجرة خضرا! الشجر الأخضر بينضّف الهوا اللي بنتنفسه!" },
    { emoji: "☁️", name: "سحابة", color: "white", fact: "السحابة بيضا وبتطير في السما! السحاب الأبيض بيجيب المطر!" },
    { emoji: "🌸", name: "وردة", color: "pink", fact: "الوردة وردي وريحتها حلوة! الورد بيجمّل الدنيا!" },
    { emoji: "🍓", name: "فراولة", color: "red", fact: "الفراولة حمرا وحلوة! الفراولة فاكهة لذيذة ومفيدة!" },
    { emoji: "🥕", name: "جزرة", color: "orange", fact: "الجزرة برتقالي وصحية! الجزر بيقوّي عينينا يا بطل!" }
  ];
  const NATURE_PALETTE = ["red", "yellow", "blue", "green", "white", "pink", "orange"];

  const PATTERN_TYPES = [
    { id: "ABAB", label: "واحد ورا واحد", slots: [0, 1, 0, 1, 0, 1] },
    { id: "AAB", label: "اتنين ورا بعض", slots: [0, 0, 1, 0, 0, 1] },
    { id: "AABB", label: "اتنين واتنين", slots: [0, 0, 1, 1, 0, 0] }
  ];
  const PATTERN_PAIRS = [["red", "yellow"], ["blue", "green"], ["orange", "purple"], ["red", "blue"], ["green", "yellow"], ["pink", "orange"]];

  const NUM_WINDOWS = [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12], [13, 14, 15, 16, 17, 18], [15, 16, 17, 18, 19, 20]];
  // أجزاء التاج الستة: ٣ رؤوس مثلثة + ٣ أجزاء في الشريط السفلي.
  const CROWN_PARTS = [
    { shape: "polygon", pts: "40,122 80,38 120,122", cx: 80, cy: 98 },
    { shape: "polygon", pts: "120,122 160,22 200,122", cx: 160, cy: 88 },
    { shape: "polygon", pts: "200,122 240,38 280,122", cx: 240, cy: 98 },
    { shape: "rect", x: 40, y: 122, w: 80, h: 48, rx: 8, cx: 80, cy: 146 },
    { shape: "rect", x: 120, y: 122, w: 80, h: 48, rx: 8, cx: 160, cy: 146 },
    { shape: "rect", x: 200, y: 122, w: 80, h: 48, rx: 8, cx: 240, cy: 146 }
  ];

  const INSTRUCTIONS = {
    numbers: "أهلاً يا ملك ماثيو! لعبة لوني العدد! اختار لون من اللوحة، وبعدين دوس على جزء التاج اللي رقمه نفس اللون. وكل ما تدوس على جزء هقولك رقمه!",
    nature: "لعبة سحب لون الطبيعة! شوف الصورة الرمادي، واختار لونها الحقيقي من اللوحة!",
    patterns: "لعبة أكمل تلوين النمط! بص على الألوان اللي في الصف، وخمّن اللون اللي ناقص في الآخر واختاره!"
  };

  // ---------- helpers ----------
  const arDigits = value => String(value).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  const speak = text => window.MatthewVoice?.speak(text, "ar-EG");
  const shuffle = arr => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const $ = id => panel.querySelector("#" + id);

  // Praise clip, delayed a beat so it never cuts the spoken sentence that
  // just played (MatthewVoice serialises speech; a new speak() cancels a
  // praise clip scheduled before it). The token drops stale praise when the
  // child taps again quickly.
  let praiseToken = 0;
  function praise() {
    const token = ++praiseToken;
    setTimeout(() => { if (token === praiseToken) window.MatthewVoice?.feedback("correct"); }, 900);
  }

  function crownCounts() {
    try {
      const got = window.MatthewMastery?.crown?.();
      if (got && typeof got.stars === "number" && typeof got.diamonds === "number") return got;
    } catch (_) { /* no crown store yet */ }
    return { stars: 0, diamonds: 0 };
  }

  function refreshCrowns() {
    const c = crownCounts();
    const s = $("cgStars"), d = $("cgDiamonds");
    if (s) s.textContent = arDigits(c.stars);
    if (d) d.textContent = arDigits(c.diamonds);
    renderCrownShelf();
  }

  function recordAnswer(skill, correct) {
    try {
      window.MatthewMastery?.record("color-games", correct);
      if (skill && skill !== "color-games") window.MatthewMastery?.record(skill, correct);
    } catch (_) { /* mastery unavailable */ }
    refreshCrowns();
  }

  function awardBonusDiamond() {
    try { window.MatthewMastery?.awardCrown?.(0, 1); } catch (_) { /* ignore */ }
    refreshCrowns();
  }

  // ---------- royal crown shelf in the home hero ----------
  function renderCrownShelf() {
    const heroCopy = document.querySelector(".hero-copy");
    const stats = heroCopy && heroCopy.querySelector(".stats");
    if (!heroCopy || !stats) return;
    let shelf = document.getElementById("royalCrownShelf");
    if (!shelf) {
      shelf = document.createElement("div");
      shelf.id = "royalCrownShelf";
      shelf.className = "royal-crown-shelf";
    }
    if (shelf.previousElementSibling !== stats) stats.after(shelf);
    const c = crownCounts();
    shelf.innerHTML = "<span>👑 تاج الملك</span><span>⭐ <b>" + arDigits(c.stars) + "</b></span><span>💎 <b>" + arDigits(c.diamonds) + "</b></span>";
  }

  renderCrownShelf();
  const heroEl = document.querySelector(".hero");
  if (heroEl && typeof MutationObserver !== "undefined") {
    const heroObserver = new MutationObserver(() => {
      if (heroEl.style.display !== "none") renderCrownShelf();
    });
    heroObserver.observe(heroEl, { attributes: true, attributeFilter: ["style"] });
  }

  // ---------- panel + card ----------
  const panel = document.createElement("section");
  panel.id = "colorGamesPanel";
  panel.className = "academy-panel hidden";
  main.insertBefore(panel, document.querySelector("footer"));

  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card";
  card.setAttribute("data-workshop", "1");
  card.innerHTML = '<span class="game-icon">🎨</span><strong>ورشة ألعاب وتلوين الملك ماثيو</strong><small>ألعاب تلوين ذكية: أرقام وألوان وأنماط</small><span class="play">يلا نلعب ←</span>';
  gameList.append(card);

  // ---------- state ----------
  let activeTab = "numbers";
  const numbersState = { round: 1, selected: null, done: [false, false, false, false, false, false] };
  const natureState = { items: [], index: 0, answered: false, roundDone: false };
  const patternsState = { round: 1, answered: false };

  function numbersWindow() {
    return NUM_WINDOWS[(numbersState.round - 1) % NUM_WINDOWS.length];
  }

  function open() {
    gameList.classList.add("hidden");
    if (learningList) learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    document.getElementById("parentPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    renderPanel();
    refreshCrowns();
    speak(tabSpeech());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    if (learningList) learningList.classList.remove("hidden");
    try { window.MatthewVoice?.stop(); } catch (_) {}
    refreshCrowns();
  }

  function renderPanel() {
    panel.innerHTML =
      '<div class="quiz-top"><button id="cgBack" class="back" type="button">🏠 الرئيسية</button><strong>🎨 ورشة ألعاب وتلوين الملك ماثيو</strong><span>👑</span></div>' +
      '<div class="cg-counter">⭐ <b id="cgStars">٠</b> &nbsp; 💎 <b id="cgDiamonds">٠</b> &nbsp;·&nbsp; 👑 تاج الملك ماثيو</div>' +
      '<div class="cg-tabs" role="tablist">' +
      '<button type="button" class="cg-tab' + (activeTab === "numbers" ? " active" : "") + '" data-tab="numbers">🔢 لوني العدد</button>' +
      '<button type="button" class="cg-tab' + (activeTab === "nature" ? " active" : "") + '" data-tab="nature">🌿 سحب لون الطبيعة</button>' +
      '<button type="button" class="cg-tab' + (activeTab === "patterns" ? " active" : "") + '" data-tab="patterns">🎨 أكمل تلوين النمط</button></div>' +
      '<div id="cgGame"></div>';
    $("cgBack").onclick = close;
    panel.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => {
      activeTab = b.dataset.tab;
      renderPanel();
      refreshCrowns();
      speak(tabSpeech());
    });
    renderGame();
  }

  // One combined spoken sentence per tab opening, so the instruction and
  // the first question/sequence are heard as a single clip (two back-to-back
  // speak() calls would cancel each other — MatthewVoice serialises).
  function tabSpeech() {
    if (activeTab === "nature") {
      if (!natureState.items.length) startNatureRound(true);
      const item = natureItem();
      return INSTRUCTIONS.nature + (item ? " دي " + item.name + "! لونها الحقيقي إيه يا ترى؟ اختار من اللوحة!" : "");
    }
    if (activeTab === "patterns") {
      const p = currentPattern();
      return INSTRUCTIONS.patterns + " بص على الصف يا بطل! " + p.shown.map(c => c.name).join("، ") + "، وبعدين إيه؟ اختار اللون الصح!";
    }
    return INSTRUCTIONS.numbers;
  }

  function renderGame() {
    if (activeTab === "numbers") renderNumbers();
    else if (activeTab === "nature") renderNature();
    else renderPatterns();
  }

  function gameArea() { return $("cgGame"); }

  // ---------- Game 1: لوني العدد ----------
  function renderNumbers() {
    const area = gameArea();
    if (!area) return;
    const win = numbersWindow();
    const allDone = numbersState.done.every(Boolean);
    const crownSvg = '<svg viewBox="0 0 320 185" role="img" aria-label="تاج الملك ماثيو">' +
      '<circle cx="80" cy="38" r="7" fill="#ffb340"/><circle cx="160" cy="22" r="7" fill="#ffb340"/><circle cx="240" cy="38" r="7" fill="#ffb340"/>' +
      CROWN_PARTS.map((p, i) => {
        const n = win[i];
        const col = legendColorFor(n);
        const done = numbersState.done[i];
        const fill = done ? col.hex : "#ece7f7";
        const textFill = done ? col.text : "#5b3cc4";
        const shape = p.shape === "polygon"
          ? '<polygon points="' + p.pts + '" fill="' + fill + '" stroke="#8a6be8" stroke-width="2.5" stroke-linejoin="round"/>'
          : '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="' + p.rx + '" fill="' + fill + '" stroke="#8a6be8" stroke-width="2.5"/>';
        return '<g class="cg-crown-part' + (done ? " done" : "") + '" data-part="' + i + '">' + shape +
          '<text x="' + p.cx + '" y="' + (p.cy + 11) + '" font-size="30" font-weight="900" text-anchor="middle" fill="' + textFill + '">' + arDigits(n) + "</text></g>";
      }).join("") + "</svg>";
    area.innerHTML =
      '<p class="cg-instruction">اختار لون من اللوحة، وبعدين دوس على جزء التاج اللي رقمه نفس اللون</p>' +
      '<p class="cg-round">الجولة ' + arDigits(numbersState.round) + ' • الأرقام من ' + arDigits(win[0]) + ' لـ ' + arDigits(win[5]) + "</p>" +
      '<div class="cg-legend">' + win.map(n => {
        const col = legendColorFor(n);
        return '<span class="cg-legend-chip"><span class="cg-dot" style="background:' + col.hex + '"></span>' + arDigits(n) + " = " + col.name + "</span>";
      }).join("") + "</div>" +
      '<div class="cg-crown-wrap">' + crownSvg + "</div>" +
      '<div class="cg-palette">' + COLORS.slice(0, 6).map((col, i) =>
        '<button type="button" class="cg-color-btn' + (numbersState.selected === i ? " selected" : "") + '" data-color="' + i + '" style="background:' + col.hex + ";color:" + col.text + '">' + col.name + "</button>"
      ).join("") + "</div>" +
      '<p id="cgMsg" class="cg-msg" aria-live="polite"></p>' +
      (allDone ? '<button id="cgNextRound" class="primary cg-next" type="button">الجولة اللي بعدها ←</button>' : "");
    area.querySelectorAll("[data-color]").forEach(b => b.onclick = () => {
      numbersState.selected = Number(b.dataset.color);
      area.querySelectorAll("[data-color]").forEach(x => x.classList.toggle("selected", x === b));
      speak(COLORS[numbersState.selected].name);
    });
    area.querySelectorAll("[data-part]").forEach(g => g.addEventListener("click", () => onCrownPart(Number(g.dataset.part))));
    const next = $("cgNextRound");
    if (next) next.onclick = () => {
      numbersState.round += 1;
      numbersState.selected = null;
      numbersState.done = [false, false, false, false, false, false];
      renderNumbers();
      const w = numbersWindow();
      speak("جولة جديدة يا بطل! دلوقتي هنلوّن الأرقام من " + NUM_NAMES[w[0] - 1] + " لـ " + NUM_NAMES[w[5] - 1] + "!");
    };
  }

  function onCrownPart(i) {
    const n = numbersWindow()[i];
    const name = NUM_NAMES[n - 1];
    const msg = $("cgMsg");
    if (numbersState.done[i]) {
      speak("رقم " + name + "! دي اتلوّنت خلاص!");
      if (msg) msg.textContent = "رقم " + arDigits(n) + " اتلوّنت خلاص ⭐";
      return;
    }
    if (numbersState.selected === null) {
      speak("رقم " + name + "! اختار لون الأول من اللوحة، وبعدين دوس على الجزء اللي رقمه نفس اللون");
      if (msg) msg.textContent = "اختار لون الأول من اللوحة 🎨";
      return;
    }
    const picked = COLORS[numbersState.selected];
    const want = legendColorFor(n);
    if (picked.id === want.id) {
      numbersState.done[i] = true;
      recordAnswer("color-games-numbers", true);
      const allDone = numbersState.done.every(Boolean);
      if (allDone) {
        awardBonusDiamond();
        speak("رقم " + name + "! برافو يا ملك ماثيو! لوّنت التاج كله! خدت ألماسة جديدة لتاجك!");
      } else {
        speak("رقم " + name + "! برافو يا بطل! لوّنتها صح!");
      }
      praise();
      renderNumbers();
      const m = $("cgMsg");
      if (m) m.textContent = allDone ? "برافو يا ملك ماثيو! لوّنت التاج كله 👑💎" : "برافو يا بطل! لوّنت رقم " + arDigits(n) + " صح ⭐";
    } else {
      recordAnswer("color-games-numbers", false);
      speak("رقم " + name + "! حاول تاني يا بطل");
      if (msg) msg.textContent = "حاول تاني يا بطل 💜";
    }
  }

  // ---------- Game 2: سحب لون الطبيعة ----------
  function startNatureRound(quiet) {
    natureState.items = shuffle(NATURE).slice(0, 4);
    natureState.index = 0;
    natureState.answered = false;
    natureState.roundDone = false;
    if (!quiet) renderNature();
  }

  function natureItem() {
    return natureState.items[natureState.index] || null;
  }

  function speakNatureQuestion() {
    const item = natureItem();
    if (item) speak("دي " + item.name + "! لونها الحقيقي إيه يا ترى؟ اختار من اللوحة!");
  }

  function renderNature() {
    const area = gameArea();
    if (!area) return;
    if (!natureState.items.length) startNatureRound(true);
    const item = natureItem();
    if (!item) return;
    const total = natureState.items.length;
    const last = natureState.index === total - 1;
    area.innerHTML =
      '<p class="cg-instruction">شوف الصورة الرمادي، واختار لونها الحقيقي من اللوحة</p>' +
      '<p class="cg-round">' + arDigits(natureState.index + 1) + " / " + arDigits(total) + "</p>" +
      '<div class="cg-nature"><div class="cg-nature-emoji' + (natureState.answered ? " cg-pop" : " cg-grey") + '" aria-hidden="true">' + item.emoji + '</div>' +
      '<div class="cg-nature-name">' + item.name + "</div>" +
      '<button id="cgListenNature" class="voice-button" type="button">🔊 اسمع تاني</button></div>' +
      '<div class="cg-palette">' + NATURE_PALETTE.map(id => {
        const col = colorById(id);
        return '<button type="button" class="cg-color-btn" data-color="' + id + '" style="background:' + col.hex + ";color:" + col.text + (id === "white" ? ";border-color:#d9d2f0" : "") + '">' + col.name + "</button>";
      }).join("") + "</div>" +
      '<p id="cgMsg" class="cg-msg" aria-live="polite"></p>' +
      (natureState.answered
        ? '<button id="cgNatureNext" class="primary cg-next" type="button">' + (natureState.roundDone ? "جولة جديدة ←" : "الحاجة اللي بعدها ←") + "</button>"
        : "");
    $("cgListenNature").onclick = speakNatureQuestion;
    area.querySelectorAll("[data-color]").forEach(b => b.onclick = () => onNatureColor(b.dataset.color));
    const next = $("cgNatureNext");
    if (next) next.onclick = () => {
      if (natureState.roundDone) {
        startNatureRound(false);
        speakNatureQuestion();
      } else {
        natureState.index += 1;
        natureState.answered = false;
        renderNature();
        speakNatureQuestion();
      }
    };
    if (!natureState.answered) {
      const m = $("cgMsg");
      if (m) m.textContent = "";
    }
  }

  function onNatureColor(colorId) {
    const item = natureItem();
    if (!item || natureState.answered) return;
    const msg = $("cgMsg");
    if (colorId === item.color) {
      natureState.answered = true;
      recordAnswer("color-games-nature", true);
      const last = natureState.index === natureState.items.length - 1;
      if (last) {
        natureState.roundDone = true;
        awardBonusDiamond();
        speak(item.fact + " برافو يا ملك ماثيو! لوّنت كل حاجات الطبيعة صح! خدت ألماسة جديدة لتاجك!");
      } else {
        speak(item.fact + " برافو يا بطل!");
      }
      praise();
      renderNature();
      const m = $("cgMsg");
      if (m) m.textContent = last ? "برافو يا ملك ماثيو! خلّصت كل حاجات الطبيعة 💎" : "برافو يا بطل! " + item.name + " لونها " + colorById(item.color).name + " ⭐";
    } else {
      recordAnswer("color-games-nature", false);
      speak("حاول تاني يا بطل");
      if (msg) msg.textContent = "حاول تاني يا بطل 💜";
    }
  }

  // ---------- Game 3: أكمل تلوين النمط ----------
  function currentPattern() {
    const type = PATTERN_TYPES[(patternsState.round - 1) % PATTERN_TYPES.length];
    const pair = PATTERN_PAIRS[(patternsState.round - 1) % PATTERN_PAIRS.length];
    const a = colorById(pair[0]), b = colorById(pair[1]);
    const slots = type.slots.map(v => (v === 0 ? a : b));
    const distractor = COLORS.find(c => c.id !== a.id && c.id !== b.id && c.id !== "white") || COLORS[1];
    return { type, a, b, slots, target: slots[5], shown: slots.slice(0, 5), distractor };
  }

  function speakPatternIntro() {
    const p = currentPattern();
    const seq = p.shown.map(c => c.name).join("، ");
    speak("بص على الصف يا بطل! " + seq + "، وبعدين إيه؟ اختار اللون الصح!");
  }

  function renderPatterns() {
    const area = gameArea();
    if (!area) return;
    const p = currentPattern();
    const other = p.target.id === p.a.id ? p.b : p.a;
    const choices = patternsState.answered ? [] : shuffle([p.target, other, p.distractor]);
    area.innerHTML =
      '<p class="cg-instruction">بص على الألوان اللي في الصف، وخمّن اللون اللي ناقص في الآخر واختاره</p>' +
      '<p class="cg-round">النمط ' + arDigits(patternsState.round) + " • " + p.type.label + "</p>" +
      '<div class="cg-pattern">' + p.shown.map(c =>
        '<span class="cg-slot" style="background:' + c.hex + ";color:" + c.text + ";border-color:" + c.hex + '"></span>'
      ).join("") +
      (patternsState.answered
        ? '<span class="cg-slot cg-pop" style="background:' + p.target.hex + ";color:" + p.target.text + ";border-color:" + p.target.hex + '">✓</span>'
        : '<span class="cg-slot empty">؟</span>') + "</div>" +
      '<div class="cg-palette">' + choices.map(c =>
        '<button type="button" class="cg-color-btn" data-color="' + c.id + '" style="background:' + c.hex + ";color:" + c.text + (c.id === "white" ? ";border-color:#d9d2f0" : "") + '">' + c.name + "</button>"
      ).join("") + "</div>" +
      '<p id="cgMsg" class="cg-msg" aria-live="polite">' + (patternsState.answered ? "برافو يا بطل! النمط كده صح ⭐" : "") + "</p>" +
      (patternsState.answered ? '<button id="cgPatternNext" class="primary cg-next" type="button">النمط اللي بعده ←</button>' : "");
    area.querySelectorAll("[data-color]").forEach(b => b.onclick = () => onPatternColor(b.dataset.color));
    const next = $("cgPatternNext");
    if (next) next.onclick = () => {
      patternsState.round += 1;
      patternsState.answered = false;
      renderPatterns();
      speakPatternIntro();
    };
  }

  function onPatternColor(colorId) {
    if (patternsState.answered) return;
    const p = currentPattern();
    const msg = $("cgMsg");
    if (colorId === p.target.id) {
      patternsState.answered = true;
      recordAnswer("color-games-patterns", true);
      const setComplete = patternsState.round % 3 === 0;
      if (setComplete) awardBonusDiamond();
      speak("برافو يا بطل! النمط كده صح! اللون الناقص هو " + p.target.name + "!" +
        (setComplete ? " برافو يا ملك ماثيو! خلّصت ٣ أنماط! خدت ألماسة جديدة لتاجك!" : ""));
      praise();
      renderPatterns();
    } else {
      recordAnswer("color-games-patterns", false);
      speak("حاول تاني يا بطل");
      if (msg) msg.textContent = "حاول تاني يا بطل 💜";
    }
  }

  card.addEventListener("click", open);
})();
