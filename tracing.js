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

  const SETS = {
    arLetters: {
      title: "حروف عربية", lang: "ar-EG", dir: "rtl",
      items: ["أ", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "هـ", "و", "ي"],
      speak: item => item
    },
    enLetters: {
      title: "English Letters", lang: "en-US", dir: "ltr",
      items: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      speak: item => item
    },
    arNumbers: {
      title: "أرقام عربية", lang: "ar-EG", dir: "rtl",
      items: ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠"],
      speak: item => item
    },
    enNumbers: {
      title: "English Numbers", lang: "en-US", dir: "ltr",
      items: "123456789".split("").concat(["10"]),
      speak: item => item
    }
  };
  const GOAL = 0.55; // 55% of the guide must be traced
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
  const COLORS = [
    { c: "#e53935", n: "أحمر" }, { c: "#fb8c00", n: "برتقالي" }, { c: "#f9a825", n: "أصفر" },
    { c: "#43a047", n: "أخضر" }, { c: "#1e88e5", n: "أزرق" }, { c: "#8e24aa", n: "بنفسجي" }
  ];
  let traceColor = COLORS[1].c, strokeCtx = null;

  const speak = (text, lang) => {
    if (window.MatthewVoice && window.MatthewVoice.speak) window.MatthewVoice.speak(text, lang);
    else if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = lang; speechSynthesis.speak(u);
    }
  };

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

  function buildMask(glyph) {
    const off = document.createElement("canvas");
    off.width = GRID; off.height = GRID;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    if (!ctx) { mask = new Uint8Array(GRID * GRID); covered = new Uint8Array(GRID * GRID); guideCells = 0; return; }
    ctx.fillStyle = "#000";
    ctx.font = "bold 56px system-ui, sans-serif";
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

  function render() {
    const set = SETS[setId];
    const glyph = set.items[index];
    done = false;
    panel.innerHTML =
      '<div class="quiz-top"><button id="traceBack" class="back" type="button">🏠 الرئيسية</button><strong>✏️ اكتب بإصبعك</strong><span>' +
      String(index + 1).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) + ' / ' + String(set.items.length).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) + '</span></div>' +
      '<div class="trace-sets">' + Object.entries(SETS).map(([id, s]) => '<button type="button" class="trace-set' + (id === setId ? " active" : "") + '" data-set="' + id + '">' + s.title + '</button>').join("") + '</div>' +
      '<p class="touch-game-instruction">لوّن الحرف من جوّه بس بإصبعك، واختار اللون اللي يعجبك</p>' +
      '<div class="trace-colors" role="group" aria-label="اختار لون التلوين">' + COLORS.map(col => '<button type="button" class="trace-color' + (col.c === traceColor ? " active" : "") + '" data-color="' + col.c + '" style="background:' + col.c + '" aria-label="لون ' + col.n + '"></button>').join("") + '</div>' +
      '<div class="trace-wrap" dir="' + set.dir + '"><canvas id="traceGuide" width="320" height="320" aria-hidden="true"></canvas><canvas id="traceCanvas" width="320" height="320" aria-label="لوحة تتبع ' + glyph + '"></canvas></div>' +
      '<div class="progress"><div id="traceProgress" style="width:0%"></div></div>' +
      '<p id="traceMsg" class="feedback" aria-live="polite"></p>' +
      '<div class="basic-nav"><button id="traceListen" class="voice-button" type="button">🔊 اسمع</button>' +
      '<button id="traceClear" class="secondary" type="button">امسح وابدأ تاني</button>' +
      '<button id="traceNext" class="primary" type="button">اللي بعده ←</button></div>';
    panel.querySelector("#traceBack").onclick = close;
    panel.querySelectorAll("[data-set]").forEach(b => b.onclick = () => { setId = b.dataset.set; index = 0; render(); });
    panel.querySelector("#traceListen").onclick = () => speak(set.speak(glyph), set.lang);
    panel.querySelector("#traceClear").onclick = render;
    panel.querySelector("#traceNext").onclick = () => { index = (index + 1) % set.items.length; render(); };
    setupCanvas(glyph, set);
    panel.querySelectorAll(".trace-color").forEach(b => b.onclick = () => {
      traceColor = b.dataset.color;
      panel.querySelectorAll(".trace-color").forEach(x => x.classList.toggle("active", x === b));
      if (strokeCtx) { strokeCtx.strokeStyle = traceColor; strokeCtx.fillStyle = traceColor; }
    });
    setTimeout(() => speak(set.speak(glyph), set.lang), 150);
  }

  function setupCanvas(glyph, set) {
    const guide = panel.querySelector("#traceGuide");
    const canvas = panel.querySelector("#traceCanvas");
    const gtx = guide && guide.getContext("2d");
    const ctx = canvas && canvas.getContext("2d");
    if (!gtx || !ctx) { panel.querySelector("#traceMsg").textContent = "هذا الجهاز لا يدعم لوحة الرسم."; return; }
    buildMask(glyph);
    // Full-resolution glyph mask: paint may only exist inside the letter.
    const maskC = document.createElement("canvas");
    maskC.width = 320; maskC.height = 320;
    const mctx = maskC.getContext("2d", { willReadFrequently: true });
    let maskData = null;
    if (mctx) {
      mctx.fillStyle = "#000";
      mctx.font = "bold 230px system-ui, sans-serif";
      mctx.textAlign = "center"; mctx.textBaseline = "middle";
      mctx.fillText(glyph, 160, 172);
      try { maskData = mctx.getImageData(0, 0, 320, 320).data; } catch (_) { /* no mask: fall back to grid */ }
    }
    const inside = (x, y) => {
      if (!maskData) return true;
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= 320 || yi >= 320) return false;
      return maskData[(yi * 320 + xi) * 4 + 3] > 40;
    };
    // Draw the guide glyph on the bottom canvas.
    gtx.clearRect(0, 0, 320, 320);
    gtx.font = "bold 230px system-ui, sans-serif";
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
    ctx.lineWidth = 16;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    strokeCtx = ctx;

    const pos = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * (320 / rect.width), y: (event.clientY - rect.top) * (320 / rect.height) };
    };
    const markCoverage = (x, y) => {
      const gx = Math.floor(x / 320 * GRID), gy = Math.floor(y / 320 * GRID);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const cx = gx + dx, cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
        const cell = cy * GRID + cx;
        if (mask[cell] && !covered[cell]) { covered[cell] = 1; hitCells++; }
      }
      const ratio = guideCells ? hitCells / guideCells : 0;
      panel.querySelector("#traceProgress").style.width = Math.min(100, Math.round(ratio * 100)) + "%";
      if (ratio >= GOAL && !done) finishTracing(glyph, set);
    };
    const dot = p => { ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill(); };
    let pen = null; // last point INSIDE the glyph, or null while outside
    const paintTo = p => {
      if (!inside(p.x, p.y)) { pen = null; return; }
      if (!pen) { dot(p); pen = p; markCoverage(p.x, p.y); return; }
      const dist = Math.hypot(p.x - pen.x, p.y - pen.y);
      const steps = Math.max(1, Math.ceil(dist / 4));
      let from = pen;
      for (let s = 1; s <= steps; s++) {
        const sp = { x: pen.x + (p.x - pen.x) * s / steps, y: pen.y + (p.y - pen.y) * s / steps };
        if (inside(sp.x, sp.y)) {
          if (from) { ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(sp.x, sp.y); ctx.stroke(); }
          else dot(sp);
          from = sp;
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

  function finishTracing(glyph, set) {
    done = true;
    panel.querySelector("#traceMsg").textContent = "برافو يا بطل! كتبت " + glyph + " صح ⭐";
    window.MatthewVoice?.feedback("correct");
    try {
      window.MatthewMastery?.record("tracing", true);
      window.MatthewMastery?.record("trace:" + glyph, true);
      localStorage.setItem("matthewPoints", Number(localStorage.getItem("matthewPoints") || 0) + 10);
      localStorage.setItem("matthewStars", Number(localStorage.getItem("matthewStars") || 0) + 1);
    } catch (_) { /* storage unavailable */ }
    window.updateStats?.();
    speak("برافو يا بطل", set.lang === "en-US" ? "en-US" : "ar-EG");
  }

  card.addEventListener("click", open);
})();
