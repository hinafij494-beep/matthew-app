"use strict";
/*
 * Finger tracing (تتبّع الكتابة) — KG1 fine-motor writing practice.
 * The child traces a large guide glyph with a finger (pointer events, so it
 * works with touch and mouse). Coverage is measured against a downsampled
 * mask of the guide glyph itself: the stroke only counts where it follows
 * the letter, which teaches shape and stroke path instead of scribbling.
 * Reaching the coverage goal celebrates, awards the usual stars/points and
 * records mastery under "tracing" / "trace:<glyph>".
 */
(() => {
  const main = document.querySelector("main");
  const learningList = document.getElementById("learningList");
  const gameList = document.getElementById("gameList");
  if (!main || !learningList) return;

  // Every glyph maps to an EXPLICIT recorded clip key (tr_ar_* / tr_en_* /
  // tr_num_* / tr_ennum_*): the text map structurally cannot tell en "1"
  // from ar "١" (same norm "1"), and bare Arabic glyphs collide with damma
  // syllables there, so tracing never speaks by bare-text lookup. Keys are
  // played with MatthewClips.playKey via speakKey below (rescue.js
  // pattern); MatthewVoice.speak(text, lang) takes a LANGUAGE as 2nd arg,
  // not a key. Corpus §13 force-adds every key below.
  const SETS = {
    arLetters: {
      title: "حروف عربية", lang: "ar-EG", dir: "rtl",
      items: ["أ", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "هـ", "و", "ي"],
      key: i => "tr_ar_" + i
    },
    enLetters: {
      title: "الحروف الإنجليزية", lang: "en-US", dir: "ltr",
      items: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      key: i => "tr_en_" + i
    },
    arNumbers: {
      title: "أرقام عربية", lang: "ar-EG", dir: "rtl",
      items: ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠"],
      key: i => "tr_num_" + (i + 1)
    },
    enNumbers: {
      title: "الأرقام الإنجليزية", lang: "en-US", dir: "ltr",
      items: "123456789".split("").concat(["10"]),
      key: i => "tr_ennum_" + (i + 1)
    }
  };
  const GOAL = 0.40; // 40% of the guide must be traced — easier for a 5-year-old
  const GRID = 72;   // mask resolution

  const panel = document.createElement("section");
  panel.id = "tracingPanel";
  panel.className = "academy-panel hidden";
  main.insertBefore(panel, document.querySelector("footer"));

  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card orange";
  card.innerHTML = '<span class="game-icon">✏️</span><strong>اكتب بإصبعك</strong><small>تتبّع الحروف والأرقام واتعلم الكتابة</small><span class="play">يلا نكتب ←</span>';
  learningList.append(card);

  let setId = "arLetters", index = 0, mask = null, covered = null, guideCells = 0, hitCells = 0, drawing = false, done = false;
  let traceTab = "lesson", traceExplainFor = "", traceChallenge = null, traceKeepTab = false;
  const traceTabsHTML = active => `<div class="lesson-tabs" role="tablist"><button type="button" class="lesson-tab${active === "lesson" ? " active" : ""}" data-lesson-tab="lesson" role="tab">📖 الدرس</button><button type="button" class="lesson-tab${active === "explain" ? " active" : ""}" data-lesson-tab="explain" role="tab">🧕 الشرح</button><button type="button" class="lesson-tab${active === "quiz" ? " active" : ""}" data-lesson-tab="quiz" role="tab">🏆 الاختبار</button></div>`;
  let justOpened = false, narrationToken = 0;
  const COLORS = [
    { c: "#e53935", n: "أحمر" }, { c: "#fb8c00", n: "برتقالي" }, { c: "#ffeb3b", n: "أصفر" },
    { c: "#43a047", n: "أخضر" }, { c: "#1e88e5", n: "أزرق" }, { c: "#8e24aa", n: "بنفسجي" }
  ];
  let traceColor = COLORS[1].c, strokeCtx = null;

  // Round 3.2.2 P0-4: recorded clips ONLY — no device speechSynthesis.
  const speak = (text, lang) => {
    if (window.MatthewVoice && window.MatthewVoice.speak) window.MatthewVoice.speak(text, lang);
  };

  const TRACE_INSTR = "لوّن الحرف من جوّه بس بإصبعك، واختار اللون اللي يعجبك";
  // Round 3.2.1 note 25b (Nancy-lines draft): مس نانسي opens the tracing
  // activity herself (nancy_intro_trace) before the instruction + glyph.
  // Spoken as the first item of the first-open sequence, with the same
  // ~5s gap as the instruction (it is a full sentence, not a bare glyph).
  const NANCY_TRACE_INTRO = "يلا نتتبع الحرف يا ملك ماثيو! امشي على الخط بصوابعك على مهلك، أنت بطل!";
  // Rescue.js pattern: a clip KEY plays first (exact clip, no text-map
  // collision); the spoken text is only the device-TTS fallback.
  const speakKey = (text, key, lang) => {
    try { if (key && window.MatthewClips && window.MatthewClips.playKey(key)) return; } catch (_) {}
    speak(text, lang);
  };
  // Ordered keyed playback (instruction then glyph on first open). The clip
  // runtime exposes no end-of-clip callback, so keyed items are chained
  // with timed gaps: ~5s after the spoken instruction, ~1.3s after a
  // single glyph. playKey pauses the shared audio first, so a late item
  // can only cut the tail of the previous one, never overlap it. The token
  // silences items scheduled by a render the child has already left.
  const speakSequence = (items, tk) => {
    const list = (items || []).filter(Boolean);
    if (!list.length) return;
    let delay = 0;
    list.forEach(it => {
      const text = typeof it === "string" ? it : it.text;
      const key = typeof it === "string" ? null : it.key;
      const lang = typeof it === "string" ? "ar-EG" : (it.lang || "ar-EG");
      setTimeout(() => { if (tk === undefined || tk === narrationToken) speakKey(text, key, lang); }, delay);
      delay += (key === "trace_instr" || key === "nancy_intro_trace") ? 5000 : 1300;
    });
  };

  function open() {
    gameList.classList.add("hidden");
    learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    document.getElementById("parentPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    traceTab = "lesson"; traceChallenge = null;
    justOpened = true;
    renderPicker();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    narrationToken++;
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    learningList.classList.remove("hidden");
    window.MatthewVoice?.stop();
  }

  function buildMask(glyph) {
    const off = document.createElement("canvas");
    off.width = GRID; off.height = GRID;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    if (!ctx) { mask = new Uint8Array(GRID * GRID); covered = new Uint8Array(GRID * GRID); guideCells = 0; return; }
    ctx.fillStyle = "#000";
    ctx.font = "bold 56px Cairo, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(glyph, GRID / 2, GRID / 2 + 2);
    const data = ctx.getImageData(0, 0, GRID, GRID).data;
    mask = new Uint8Array(GRID * GRID);
    guideCells = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      // Dilate by treating a cell as guide if it or a neighbour is filled,
      // so a small finger on a big screen can realistically follow the line.
      mask[i] = data[i * 4 + 3] > 40 ? 1 : 0;
    }
    // dilation pass
    const dilated = new Uint8Array(mask);
    for (let y = 1; y < GRID - 1; y++) for (let x = 1; x < GRID - 1; x++) {
      if (!mask[y * GRID + x]) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) dilated[(y + dy) * GRID + (x + dx)] = 1;
    }
    mask = dilated;
    for (let i = 0; i < mask.length; i++) guideCells += mask[i];
    covered = new Uint8Array(GRID * GRID);
    hitCells = 0;
  }

  // Picker-first flow (note 16): open() lands on the glyph picker; tapping
  // a glyph opens its trace screen; back from a trace screen returns to the
  // picker, and only the picker's back goes home.
  function renderPicker() {
    const set = SETS[setId];
    const tk = ++narrationToken;
    panel.innerHTML =
      '<div class="quiz-top"><button id="traceBack" class="back" type="button">🏠 الرئيسية</button><strong>✏️ اكتب بإصبعك</strong><span>👑</span></div>' +
      '<div class="trace-sets">' + Object.entries(SETS).map(([id, s]) => '<button type="button" class="trace-set' + (id === setId ? " active" : "") + '" data-set="' + id + '">' + s.title + '</button>').join("") + '</div>' +
      '<div class="lesson-title">اختار حرف أو رقم يا ملك ماثيو 👑</div><p>اضغط على أي حرف أو رقم عشان تكتبه بإصبعك</p>' +
      '<div class="basic-grid letter-picker" dir="' + set.dir + '">' + set.items.map((g, i) => '<button type="button" class="basic-tile" data-glyph="' + i + '"><b>' + g + '</b></button>').join("") + '</div>';
    panel.querySelector("#traceBack").onclick = close;
    panel.querySelectorAll("[data-set]").forEach(b => b.onclick = () => { setId = b.dataset.set; renderPicker(); });
    panel.querySelectorAll("[data-glyph]").forEach(b => b.onclick = () => { index = Number(b.dataset.glyph); render(); });
    setTimeout(() => { if (tk === narrationToken) speakKey("اختار حرف أو رقم يا ملك ماثيو", "trace_picker", "ar-EG"); }, 150);
  }

  function render() {
    const set = SETS[setId];
    const glyph = set.items[index];
    const tk = ++narrationToken;
    done = false;
    // Round 3.2.6 item 2: the trace screen opens with three big tabs —
    // 📖 الدرس (the trace canvas itself), 🧕 الشرح (the instruction,
    // spoken once when the tab opens), 🏆 الاختبار (a trace-and-check
    // challenge for the current set). Tab switches re-paint (traceKeepTab)
    // so each canvas gets fresh listeners and a fresh mask; the lesson
    // progress resets on tab switch — the challenge is the quiz, the
    // lesson is practice.
    if (!traceKeepTab) { traceTab = "lesson"; traceChallenge = null; }
    traceKeepTab = false;
    const lessonHTML =
      '<div class="trace-sets">' + Object.entries(SETS).map(([id, s]) => '<button type="button" class="trace-set' + (id === setId ? " active" : "") + '" data-set="' + id + '">' + s.title + '</button>').join("") + '</div>' +
      '<p class="touch-game-instruction">' + TRACE_INSTR + '</p>' +
      '<div class="trace-colors" role="group" aria-label="اختار لون التلوين">' + COLORS.map(col => '<button type="button" class="trace-color' + (col.c === traceColor ? " active" : "") + '" data-color="' + col.c + '" style="background:' + col.c + '" aria-label="لون ' + col.n + '"></button>').join("") + '</div>' +
      '<div class="trace-wrap" dir="' + set.dir + '"><canvas id="traceGuide" width="320" height="320" aria-hidden="true"></canvas><canvas id="traceCanvas" width="320" height="320" aria-label="لوحة تتبع ' + glyph + '"></canvas></div>' +
      '<div class="progress"><div id="traceProgress" style="width:0%"></div></div>' +
      '<p id="traceMsg" class="feedback" aria-live="polite"></p>' +
      '<div class="basic-nav"><button id="tracePrev" class="secondary" type="button">اللي قبله<span class="pager-arrow">→</span></button>' +
      '<button id="traceNext" class="primary" type="button">اللي بعده<span class="pager-arrow">←</span></button>' +
      '<button id="traceListen" class="voice-button" type="button">🔊 اسمع</button>' +
      '<button id="traceClear" class="secondary" type="button">امسح وابدأ تاني</button></div>';
    const explainHTML =
      '<div class="explain-box"><strong>🧕 الميس بتشرح لك من الصفر</strong><p style="font-size:64px;font-weight:900;text-align:center;color:#5b3cc4;margin:8px 0">' + glyph + '</p><p>' + TRACE_INSTR + '</p><p>امشي على الخط بصوابعك على مهلك، ولوّن الحرف من جوّه بس. اختار اللون اللي يعجبك من الألوان، ولما تخلص كل الخط هتسمع برافو!</p></div>' +
      '<button id="traceExplainListen" class="voice-button" type="button">🔊 اسمع الشرح</button><p>اسمع الشرح كويس، وبعدين جرّب 🏆 الاختبار — اكتب ٣ حروف من نفس المجموعة!</p>';
    let quizHTML;
    if (!traceChallenge) {
      quizHTML = '<p>تحدي التتبع على نفس المجموعة — اكتب ٣ حروف بإصبعك من غير غلط!</p><button id="traceQuizStart" class="primary" type="button">🏆 ابدأ التحدي ⭐</button>';
    } else if (traceChallenge.done) {
      quizHTML = '<div class="academy-visual">' + (traceChallenge.score >= 2 ? "🏆" : "💪") + '</div><h2>' + (traceChallenge.score >= 2 ? "برافو يا بطل!" : "محاولة جميلة!") + '</h2><p class="academy-hint">كتبت صح ' + traceChallenge.score + ' من ٣.</p><button id="traceQuizAgain" class="secondary" type="button">العب تاني</button><button id="traceQuizBack" class="primary" type="button">ارجع للدرس<span class="pager-arrow">←</span></button>';
    } else {
      const ch = traceChallenge.glyphs[traceChallenge.pos];
      quizHTML = '<p class="math-stage">تحدّي ' + (traceChallenge.pos + 1) + ' من ٣ — اكتب ' + ch.glyph + ' بإصبعك</p>' +
        '<div class="trace-wrap" dir="' + set.dir + '"><canvas id="traceGuide2" width="320" height="320" aria-hidden="true"></canvas><canvas id="traceCanvas2" width="320" height="320" aria-label="لوحة تحدي ' + ch.glyph + '"></canvas></div>' +
        '<div class="progress"><div id="traceProgress2" style="width:0%"></div></div>' +
        '<p id="traceMsg2" class="feedback" aria-live="polite"></p>' +
        '<button id="traceChallengeListen" class="voice-button" type="button">🔊 اسمع الحرف</button>' +
        '<button id="traceQuizBack" class="secondary" type="button">ارجع للدرس<span class="pager-arrow">←</span></button>';
    }
    panel.innerHTML =
      '<div class="quiz-top"><button id="traceBack" class="back" type="button">→ رجوع</button><strong>✏️ اكتب بإصبعك</strong><span>' +
      String(index + 1).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) + ' / ' + String(set.items.length).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) + '</span></div>' +
      traceTabsHTML(traceTab) +
      '<div class="tab-panel' + (traceTab === "lesson" ? " active" : "") + '" data-tab-panel="lesson">' + lessonHTML + '</div>' +
      '<div class="tab-panel' + (traceTab === "explain" ? " active" : "") + '" data-tab-panel="explain">' + explainHTML + '</div>' +
      '<div class="tab-panel' + (traceTab === "quiz" ? " active" : "") + '" data-tab-panel="quiz">' + quizHTML + '</div>';
    panel.querySelector("#traceBack").onclick = renderPicker;
    panel.querySelectorAll("[data-lesson-tab]").forEach(b => b.onclick = () => switchTraceTab(b.dataset.lessonTab));
    panel.querySelectorAll("[data-set]").forEach(b => b.onclick = () => { setId = b.dataset.set; index = 0; traceChallenge = null; render(); });
    panel.querySelector("#traceListen").onclick = () => speakKey(glyph, set.key(index), set.lang);
    panel.querySelector("#traceClear").onclick = render;
    panel.querySelector("#tracePrev").onclick = () => { index = (index + set.items.length - 1) % set.items.length; render(); };
    panel.querySelector("#traceNext").onclick = () => { index = (index + 1) % set.items.length; render(); };
    panel.querySelector("#traceExplainListen").onclick = () => speakTraceExplain();
    const qs = panel.querySelector("#traceQuizStart");
    if (qs) qs.onclick = () => startTraceChallenge();
    const qa = panel.querySelector("#traceQuizAgain");
    if (qa) qa.onclick = () => startTraceChallenge();
    panel.querySelectorAll("#traceQuizBack").forEach(b => b.onclick = () => { traceTab = "lesson"; traceKeepTab = true; render(); });
    const cl = panel.querySelector("#traceChallengeListen");
    if (cl) cl.onclick = () => { const ch = traceChallenge.glyphs[traceChallenge.pos]; speakKey(ch.glyph, set.key(ch.idx), set.lang); };
    if (traceTab === "lesson") setupCanvas(glyph, set);
    else if (traceTab === "quiz" && traceChallenge && !traceChallenge.done) {
      const ch = traceChallenge.glyphs[traceChallenge.pos];
      setupCanvas(ch.glyph, set, { guide: "traceGuide2", canvas: "traceCanvas2", progress: "traceProgress2", msg: "traceMsg2" }, () => {
        traceChallenge.score++;
        traceChallenge.pos++;
        if (traceChallenge.pos >= traceChallenge.glyphs.length) traceChallenge.done = true;
        traceKeepTab = true;
        render();
      });
      setTimeout(() => { if (tk === narrationToken) speakKey(ch.glyph, set.key(ch.idx), set.lang); }, 150);
    }
    panel.querySelectorAll(".trace-color").forEach(b => b.onclick = () => {
      traceColor = b.dataset.color;
      panel.querySelectorAll(".trace-color").forEach(x => x.classList.toggle("active", x === b));
      if (strokeCtx) { strokeCtx.strokeStyle = traceColor; strokeCtx.fillStyle = traceColor; }
    });
  }
  // Instruction narration — now on the 🧕 الشرح tab (Round 3.2.6 item 2).
  // On the first explain open after open(), مس نانسي opens the activity
  // herself (nancy_intro_trace) before the instruction + glyph; later
  // glyphs speak the instruction + glyph only.
  function speakTraceExplain() {
    const set = SETS[setId];
    const glyph = set.items[index];
    const tk = ++narrationToken;
    if (justOpened) {
      justOpened = false;
      speakSequence([{ text: NANCY_TRACE_INTRO, key: "nancy_intro_trace", lang: "ar-EG" }, { text: TRACE_INSTR, key: "trace_instr", lang: "ar-EG" }, { text: glyph, key: set.key(index), lang: set.lang }], tk);
    } else {
      speakSequence([{ text: TRACE_INSTR, key: "trace_instr", lang: "ar-EG" }, { text: glyph, key: set.key(index), lang: set.lang }], tk);
    }
  }
  function maybeSpeakTraceExplain() {
    const key = setId + ":" + index;
    if (traceExplainFor === key) return;
    traceExplainFor = key;
    speakTraceExplain();
  }
  function switchTraceTab(name) {
    if (name !== "lesson" && name !== "explain" && name !== "quiz") return;
    narrationToken++;
    try { window.MatthewVoice?.stop(); } catch (_) {}
    traceTab = name;
    traceKeepTab = true;
    render();
    if (name === "explain") maybeSpeakTraceExplain();
  }
  // Round 3.2.6 item 3: the 🏆 tab is a trace-and-check challenge for the
  // current set — the current glyph + the next 2 in set order, each traced
  // to the same 40% goal. 0 new clips (the trace_done clip celebrates).
  function startTraceChallenge() {
    const set = SETS[setId];
    const glyphs = [0, 1, 2].map(k => { const idx = (index + k) % set.items.length; return { glyph: set.items[idx], idx: idx }; });
    traceChallenge = { glyphs: glyphs, pos: 0, score: 0, done: false };
    traceTab = "quiz";
    traceKeepTab = true;
    render();
  }
  function setupCanvas(glyph, set, ids, onDone) {
    ids = ids || { guide: "traceGuide", canvas: "traceCanvas", progress: "traceProgress", msg: "traceMsg" };
    const guide = panel.querySelector("#" + ids.guide);
    const canvas = panel.querySelector("#" + ids.canvas);
    const gtx = guide && guide.getContext("2d");
    const ctx = canvas && canvas.getContext("2d");
    if (!gtx || !ctx) { panel.querySelector("#" + ids.msg).textContent = "هذا الجهاز لا يدعم لوحة الرسم."; return; }
    buildMask(glyph);
    // Full-resolution glyph mask: paint may only exist inside the letter.
    const maskC = document.createElement("canvas");
    maskC.width = 320; maskC.height = 320;
    const mctx = maskC.getContext("2d", { willReadFrequently: true });
    let maskData = null;
    if (mctx) {
      mctx.fillStyle = "#000";
      mctx.font = "bold 230px Cairo, system-ui, sans-serif";
      mctx.textAlign = "center"; mctx.textBaseline = "middle";
      mctx.fillText(glyph, 160, 172);
      // Dilate the full-resolution mask by ~3px so strokes just outside
      // the visible outline still paint (forgiving edge for a 5-year-old).
      // A centred stroke expands the glyph outline by ~half its width
      // on each side; the destination-in clip below uses this same
      // dilated mask, so tolerant strokes are not erased on pointerup.
      mctx.strokeStyle = "#000";
      mctx.lineWidth = 6;
      mctx.strokeText(glyph, 160, 172);
      try { maskData = mctx.getImageData(0, 0, 320, 320).data; } catch (_) { /* no mask: fall back to grid */ }
    }
    const inside = (x, y) => {
      if (!maskData) return true;
      const xi = Math.round(x), yi = Math.round(y);
      // ~3px tolerance: a point counts as inside if ANY pixel in a
      // 3px neighbourhood has mask alpha > 40, so a finger landing
      // just outside the visible outline still paints.
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const nx = xi + dx, ny = yi + dy;
        if (nx < 0 || ny < 0 || nx >= 320 || ny >= 320) continue;
        if (maskData[(ny * 320 + nx) * 4 + 3] > 40) return true;
      }
      return false;
    };
    // Draw the guide glyph on the bottom canvas.
    gtx.clearRect(0, 0, 320, 320);
    gtx.font = "bold 230px Cairo, system-ui, sans-serif";
    gtx.textAlign = "center"; gtx.textBaseline = "middle";
    gtx.fillStyle = "rgba(91,60,196,0.18)";
    gtx.fillText(glyph, 160, 172);
    gtx.strokeStyle = "rgba(91,60,196,0.45)";
    gtx.lineWidth = 2;
    gtx.strokeText(glyph, 160, 172);
    // The stroke canvas (top) starts empty; colour comes from the palette.
    ctx.clearRect(0, 0, 320, 320);
    ctx.strokeStyle = traceColor;
    ctx.fillStyle = traceColor;
    ctx.lineWidth = 26;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    strokeCtx = ctx;

    const pos = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * (320 / rect.width), y: (event.clientY - rect.top) * (320 / rect.height) };
    };
    const markCoverage = (x, y) => {
      const gx = Math.floor(x / 320 * GRID), gy = Math.floor(y / 320 * GRID);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const cx = gx + dx, cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
        const cell = cy * GRID + cx;
        if (mask[cell] && !covered[cell]) { covered[cell] = 1; hitCells++; }
      }
      const ratio = guideCells ? hitCells / guideCells : 0;
      panel.querySelector("#" + ids.progress).style.width = Math.min(100, Math.round(ratio * 100)) + "%";
      if (ratio >= GOAL && !done) finishTracing(glyph, set, ids, onDone);
    };
    const dot = p => { ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill(); };
    let pen = null; // last point INSIDE the glyph, or null while outside
    const paintTo = p => {
      if (!inside(p.x, p.y)) { pen = null; return; }
      if (!pen) { dot(p); pen = p; markCoverage(p.x, p.y); return; }
      const dist = Math.hypot(p.x - pen.x, p.y - pen.y);
      const steps = Math.max(1, Math.ceil(dist / 2)); // 2px steps: gap-free even on fast swipes
      let from = pen;
      for (let s = 1; s <= steps; s++) {
        const sp = { x: pen.x + (p.x - pen.x) * s / steps, y: pen.y + (p.y - pen.y) * s / steps };
        if (inside(sp.x, sp.y)) {
          if (from) { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(sp.x, sp.y); ctx.stroke(); }
          else dot(sp);
          from = sp;
          markCoverage(sp.x, sp.y); // count coverage along the whole stroke, not only at the endpoint
        } else from = null;
      }
      pen = p;
      markCoverage(p.x, p.y);
    };
    const clipToGlyph = () => {
      if (!maskData) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(maskC, 0, 0);
      ctx.restore();
    };
    canvas.addEventListener("pointerdown", event => {
      drawing = true; pen = null;
      try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
      paintTo(pos(event));
      event.preventDefault();
    });
    canvas.addEventListener("pointermove", event => {
      if (!drawing) return;
      paintTo(pos(event));
      event.preventDefault();
    });
    const stop = () => { if (drawing) clipToGlyph(); drawing = false; pen = null; };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
  }

  function finishTracing(glyph, set, ids, onDone) {
    done = true;
    ids = ids || { guide: "traceGuide", canvas: "traceCanvas", progress: "traceProgress", msg: "traceMsg" };
    panel.querySelector("#" + ids.msg).textContent = "برافو يا بطل! كتبت " + glyph + " صح ⭐";
    // No feedback("correct") here: it bumps MatthewVoice's requestId and
    // its delayed (+280ms) praise clip is suppressed by any speak() after
    // it — so completion was effectively silent — while calling it after
    // the clip would stop the clip. The recorded trace_done clip IS the
    // celebration, played by explicit key.
    try {
      window.MatthewMastery?.record("tracing", true);
      window.MatthewMastery?.record("trace:" + glyph, true);
      localStorage.setItem("matthewPoints", Number(localStorage.getItem("matthewPoints") || 0) + 10);
      localStorage.setItem("matthewStars", Number(localStorage.getItem("matthewStars") || 0) + 1);
    } catch (_) { /* storage unavailable */ }
    window.updateStats?.();
    speakKey("برافو يا بطل", "trace_done", "ar-EG");
    // Challenge mode: let the child see + hear the celebration, then
    // advance to the next challenge glyph (guarded on the same challenge
    // object, so leaving the challenge cancels the advance).
    if (onDone) { const ch = traceChallenge; setTimeout(() => { if (traceChallenge === ch) onDone(); }, 1200); }
  }

  card.addEventListener("click", open);
})();
