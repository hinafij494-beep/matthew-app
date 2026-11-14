// Round 3.2.9 — coloring fixes (user notes 2026-11-14, tested on the 3.2.8 APK):
// (1) the coloring gallery grid is GONE — the tab opens straight into
//     the single-picture view; (2) navigation ONLY via the ← → arrows;
// (3) the picture area is BIG (flex viewport, compact palette);
// (4) the picture zooms in/out (pinch + buttons) so he can color the
//     details — picture + paint + overlay zoom together, pointer coords
//     map back to base space; (5) ONLY the picture is colorable — the
//     background stays fixed white and is NOT paintable.
// Runtime tests drive the REAL module code in jsdom (skipped where jsdom
// is not installed, like round323) — never string-only checks.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
let JSDOM = null;
try { ({ JSDOM } = require("jsdom")); } catch (_) { JSDOM = null; }
const skipDom = !JSDOM;

function makeVoice(spoken) {
  return {
    speak(text, lang, onDone) { spoken.push({ fn: "speak", text }); if (typeof onDone === "function") onDone(); return true; },
    speakSequence(list, lang, onDone) { spoken.push({ fn: "speakSequence", list: [...list] }); if (typeof onDone === "function") onDone(); return true; },
    feedback(kind) { spoken.push({ fn: "feedback", kind }); },
    stop() { spoken.push({ fn: "stop" }); },
  };
}
function makeBank() {
  const mk = (cat, n) => Array.from({ length: n }, (_, i) => ({
    q: cat + " سؤال " + (i + 1) + "؟", e: "🤔", a: ["أ", "ب", "ج"], c: 0,
  }));
  return { numbers: mk("numbers", 15), letters: mk("letters", 15), colors: mk("colors", 15), world: mk("world", 15), science: mk("science", 15) };
}
function bootDom(spoken) {
  const dom = new JSDOM(read("index.html"), { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  window.scrollTo = () => {};
  window.MatthewVoice = makeVoice(spoken);
  window.MatthewClips = { playKey() { return false; }, play() { return false; }, playSequence() { return false; }, stop() {} };
  window.MatthewMastery = { record() {}, weight() { return 0; }, crown: () => ({ stars: 0, diamonds: 0 }), awardCrown() {} };
  window.bank = makeBank();
  window.localStorage.clear();
  return dom;
}
function makeCtx(log, window) {
  const ctx = {
    lineWidth: 0, lineCap: "", lineJoin: "",
    _gco: "source-over", _fillStyle: "", _strokeStyle: "",
    save() { log.push({ fn: "save", args: [] }); },
    restore() { log.push({ fn: "restore", args: [] }); },
    beginPath() { log.push({ fn: "beginPath", args: [] }); },
    rect(x, y, w, h) { log.push({ fn: "rect", args: [x, y, w, h] }); },
    clip() { log.push({ fn: "clip", args: [] }); },
    arc(x, y, r, a, b) { log.push({ fn: "arc", args: [x, y, r, a, b] }); },
    fill() { log.push({ fn: "fill", args: [] }); },
    stroke() { log.push({ fn: "stroke", args: [] }); },
    moveTo(x, y) { log.push({ fn: "moveTo", args: [x, y] }); },
    lineTo(x, y) { log.push({ fn: "lineTo", args: [x, y] }); },
    clearRect(x, y, w, h) { log.push({ fn: "clearRect", args: [x, y, w, h] }); },
    fillRect(x, y, w, h) { log.push({ fn: "fillRect", args: [x, y, w, h] }); },
    drawImage(...args) { log.push({ fn: "drawImage", args }); },
    putImageData(data, x, y) { log.push({ fn: "putImageData", args: [data, x, y] }); },
    getImageData(x, y, w, h) { log.push({ fn: "getImageData", args: [x, y, w, h] }); return window.__matthewTestImageData || null; },
    createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
  };
  Object.defineProperty(ctx, "globalCompositeOperation", {
    get() { return this._gco; },
    set(v) { this._gco = v; log.push({ fn: "gco", args: [v] }); },
  });
  Object.defineProperty(ctx, "fillStyle", {
    get() { return this._fillStyle; },
    set(v) { this._fillStyle = v; log.push({ fn: "fillStyle", args: [v] }); },
  });
  Object.defineProperty(ctx, "strokeStyle", {
    get() { return this._strokeStyle; },
    set(v) { this._strokeStyle = v; log.push({ fn: "strokeStyle", args: [v] }); },
  });
  return ctx;
}
function installPaintStub(window) {
  const log = [];
  const ctx = makeCtx(log, window);
  const extra = [];
  let first = true;
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (first) { first = false; return ctx; }
    const e = { log: [], ctx: null };
    e.ctx = makeCtx(e.log, window);
    extra.push(e);
    return e.ctx;
  };
  window.HTMLCanvasElement.prototype.toDataURL = function () { return "data:image/png;base64,TESTLINEART"; };
  return { log, ctx, extra };
}
function openColoring(window) {
  window.eval(read("color-games.js"));
  const paint = installPaintStub(window);
  const doc = window.document;
  doc.querySelector('[data-coloring="1"]').click();
  return { panel: doc.querySelector("#colorGamesPanel"), log: paint.log, extra: paint.extra };
}
function installSaveStubs(window) {
  const downloads = [];
  window.URL.createObjectURL = () => "blob:test-save";
  window.URL.revokeObjectURL = () => {};
  window.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(new window.Blob(["fakepng"], { type: "image/png" })); };
  window.__capturedImages = [];
  window.Image = class {
    constructor() { window.__capturedImages.push(this); }
    set src(v) { this._src = v; setTimeout(() => { if (this.onload) this.onload(); }, 0); }
  };
  window.HTMLAnchorElement.prototype.click = function () {
    downloads.push({ href: this.href, download: this.download });
  };
  return { downloads };
}
function clickEl(window, el) {
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}
// Synthetic page image: white with a closed black box wall at rows/cols
// 5..14 (a tiny stand-in for a real outline drawing).
function boxImageData(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wall = (x >= 5 && x <= 14 && (y === 5 || y === 14)) || (y >= 5 && y <= 14 && (x === 5 || x === 14));
    const v = wall ? 0 : 255, o = (y * w + x) * 4;
    data[o] = v; data[o + 1] = v; data[o + 2] = v; data[o + 3] = 255;
  }
  return { width: w, height: h, data };
}
const alphaAt = (imgData, w, x, y) => imgData.data[(y * w + x) * 4 + 3];
function firePointer(window, el, type, x, y, pointerId) {
  const ev = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  if (pointerId !== undefined) ev.pointerId = pointerId;
  el.dispatchEvent(ev);
}
function drawCalls(log) {
  return log.filter((c) => ["arc", "moveTo", "lineTo"].includes(c.fn));
}
function putImagePayloads(extra) {
  const out = [];
  for (const e of extra) for (const c of e.log) if (c.fn === "putImageData") out.push(c.args[0]);
  return out;
}
// Pin a raster page's <img> as "loaded" so deriveArt() runs in jsdom
// (jsdom never loads images: complete=false, naturalWidth=0).
function stubLoadedImage(window, img, w, h) {
  Object.defineProperty(img, "complete", { value: true });
  Object.defineProperty(img, "naturalWidth", { value: w });
  Object.defineProperty(img, "naturalHeight", { value: h });
  Object.defineProperty(img, "clientWidth", { value: w });
  Object.defineProperty(img, "clientHeight", { value: h });
  window.__matthewTestImageData = boxImageData(w, h);
}
function flipNext(panel, n) {
  for (let i = 0; i < n; i++) panel.querySelector("#cgNextPage").click();
}
function stageScale(panel) {
  const t = panel.querySelector("#cgZoomStage").style.transform || "";
  const m = t.match(/scale\(([0-9.]+)\)/);
  return m ? parseFloat(m[1]) : null;
}
const PAGE_NAMES = [
  "الملك ماثيو", "الدكتور ماثيو", "المهندس ماثيو", "رجل الإطفاء ماثيو",
  "الطيار ماثيو", "الظابط ماثيو", "رائد الفضاء ماثيو",
  "ماثيو ومارك", "ماثيو وماما", "ماثيو وبابا", "ماثيو ومريم",
  "المدرس ماثيو", "لاعب الكورة ماثيو", "الفلاح ماثيو", "ماثيو والأسد",
  "الطباخ ماثيو", "الصياد ماثيو", "الرسام ماثيو", "تاج الملك",
];

test("3.2.9 note 1: no gallery anywhere — coloring opens straight into the picture view (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel } = openColoring(window);
    assert.equal(panel.querySelector(".cg-gallery"), null, "the gallery grid element must not exist");
    assert.equal(panel.querySelectorAll("[data-page]").length, 0, "no gallery picker buttons may exist");
    assert.equal(panel.querySelector(".cg-page-btn"), null, "no gallery card buttons may exist");
    assert.equal(panel.querySelector(".cg-thumb"), null, "no gallery thumbnails may exist");
    // The picture view is directly visible on entry: page 0 (king).
    assert.ok(panel.querySelector("#cgPaintImg"), "entry must show the first picture directly");
    assert.ok(panel.querySelector("#cgPaintCanvas"), "entry must show the free-paint canvas directly");
    assert.match(panel.querySelector(".cg-page-label").textContent, /الملك ماثيو/, "entry must open on page 0");
    assert.ok(panel.querySelector("#cgPrevPage") && panel.querySelector("#cgNextPage"), "arrows must exist on entry");
    // The registry still lists all 19 pages (navigation just moved to arrows).
    assert.equal(window.MatthewColorPages.length, 19, "registry must still list 19 pages");
    const style = window.document.getElementById("colorGamesStyle").textContent;
    assert.ok(!/\.cg-gallery\{/.test(style), "injected styles must not define a gallery");
    assert.ok(!/\.cg-page-btn\{/.test(style), "injected styles must not define gallery card buttons");
  } finally {
    window.close();
  }
});

test("3.2.9 note 2: arrows are the only navigation — full 19-picture cycle with wrap (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel } = openColoring(window);
    const label = () => panel.querySelector(".cg-page-label").textContent;
    assert.match(label(), /الملك ماثيو/, "must start on page 0");
    // Forward through all 19: every label in registry order.
    for (let i = 1; i < 19; i++) {
      panel.querySelector("#cgNextPage").click();
      assert.match(label(), new RegExp(PAGE_NAMES[i]), "next must land on page " + i + " (" + PAGE_NAMES[i] + "), got " + label());
    }
    // One more next wraps to the first picture.
    panel.querySelector("#cgNextPage").click();
    assert.match(label(), /الملك ماثيو/, "next from the last page must wrap to the first");
    // Backward from the first wraps to the last (crown), then to page 17.
    panel.querySelector("#cgPrevPage").click();
    assert.match(label(), /تاج الملك/, "prev from the first page must wrap to the last");
    panel.querySelector("#cgPrevPage").click();
    assert.match(label(), /الرسام ماثيو/, "prev from the crown must move to page 17");
    // No other picture-picking control exists: no gallery, no select,
    // no page buttons — only the two arrows change the picture.
    assert.equal(panel.querySelectorAll("[data-page]").length, 0, "no gallery buttons");
    assert.equal(panel.querySelector("select"), null, "no picture dropdown");
    assert.ok(panel.querySelector("#cgPrevPage") && panel.querySelector("#cgNextPage"), "only the arrows navigate");
  } finally {
    window.close();
  }
});

test("3.2.9 note 3: the picture dominates — big zoom viewport, compact palette (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel } = openColoring(window);
    const view = panel.querySelector(".cg-color-view");
    assert.ok(view, "the coloring view must be a flex column");
    const viewport = panel.querySelector("#cgZoomViewport");
    assert.ok(viewport, "the zoom viewport must exist");
    assert.equal(viewport.parentElement, view, "the viewport must be a direct child of the color view");
    assert.ok(viewport.querySelector("#cgZoomStage"), "the zoom stage must live inside the viewport");
    assert.ok(viewport.querySelector("#cgPaintImg"), "the picture must live inside the zoom stage");
    const style = window.document.getElementById("colorGamesStyle").textContent;
    assert.match(style, /\.cg-color-view\{[^}]*display:flex/, "color view must be a flex column");
    assert.match(style, /\.cg-color-view\{[^}]*height:100dvh/, "color view must have a fixed viewport height");
    assert.match(style, /\.cg-color-view\{[^}]*user-select:none/, "color view must block text selection on background drags");
    assert.match(style, /\.cg-zoom-viewport\{[^}]*flex:1/, "viewport must flex-grow to dominate the screen");
    assert.match(style, /\.cg-zoom-viewport\{[^}]*min-height:0/, "viewport must be allowed to shrink to its flex share");
    assert.match(style, /\.cg-zoom-viewport\{[^}]*overflow:hidden/, "viewport must hide overflow");
    // Compact palette: ONE horizontally scrolling row of small chips,
    // NOT the old wrapping grid (5 rows / 252px on a phone) and NOT
    // the 3-column grid of tall buttons.
    assert.match(style, /\.cg-big-palette\{display:flex/, "palette must be a compact flex row");
    assert.match(style, /\.cg-big-palette\{[^}]*flex-wrap:nowrap/, "palette must be a single row");
    assert.match(style, /\.cg-big-palette\{[^}]*overflow-x:auto/, "palette must scroll horizontally");
    assert.ok(!/\.cg-big-palette\{display:grid/.test(style), "the old 3-column palette grid must be gone");
    assert.match(style, /\.cg-swatch\{[^}]*min-height:44px/, "swatches must be compact (44px)");
    // Clear + save share one row: the actions row must stretch full
    // width (the old auto margins shrank it to fit content, so the
    // two buttons wrapped onto two rows). Round 2 of the note 3 fix:
    // a 180px flex basis wrapped them BEFORE the shrink step (flex
    // lines break on the basis), so the basis is 0 with min-width 0
    // and the two buttons grow to half the row each on one line.
    assert.match(style, /\.cg-actions-row\{[^}]*width:100%/, "actions row must stretch full width so clear and save share one row");
    assert.match(style, /\.cg-actions-row \.cg-clear-btn,\.cg-actions-row \.cg-save-btn\{[^}]*flex:1 1 0/, "actions buttons must start from a zero basis so both fit one line");
    assert.match(style, /\.cg-actions-row \.cg-clear-btn,\.cg-actions-row \.cg-save-btn\{[^}]*min-width:0/, "actions buttons must be allowed to shrink below content width");
    // Round 2: the header goes static while coloring is open, so the
    // 100dvh view fits one screen; the message row keeps only a
    // 4px margin and the palette scrollbar is hidden — every spare
    // pixel goes to the picture.
    assert.match(style, /#colorGamesPanel\.cg-coloring-open \.quiz-top\{position:static\}/, "panel header must go static while coloring is open");
    assert.match(style, /\.cg-msg\{[^}]*margin:4px 0/, "message row must keep only a small margin");
    assert.match(style, /\.cg-big-palette\{[^}]*scrollbar-width:none/, "palette scrollbar must be hidden");
    assert.ok(style.includes(".cg-big-palette::-webkit-scrollbar{display:none}"), "palette scrollbar must be hidden on webkit too");
    const src = read("color-games.js");
    assert.ok(src.includes("🧽 امسح</button>"), "clear button must use the short one-line label");
    assert.ok(src.includes("💾 احفظ</button>"), "save button must use the short one-line label");
    assert.ok(src.includes("getComputedStyle(header).position"), "entry scroll must read the header position so a static header costs 0px");
    assert.ok(src.includes("el.offsetTop"), "entry scroll must use the offsetTop chain so the entrance animation cannot shift the park by 10px");
    assert.ok(src.includes("Math.round(aw * s)"), "contain-fit must round, not floor, so the tablet king picture reaches 709x940");
    const swatches = [...panel.querySelectorAll(".cg-swatch")];
    assert.equal(swatches.length, 19, "palette must still offer all 19 colors");
    assert.ok(swatches.some((b) => b.textContent.includes("لون البشرة")), "palette must keep the skin tone");
  } finally {
    window.close();
  }
});

test("3.2.9 note 4 (buttons): zoom in/out/reset change the stage transform (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel } = openColoring(window);
    const row = panel.querySelector(".cg-zoom-row");
    assert.ok(row, "zoom controls must exist in their own row");
    const zoomIn = panel.querySelector("#cgZoomIn");
    const zoomOut = panel.querySelector("#cgZoomOut");
    const zoomReset = panel.querySelector("#cgZoomReset");
    assert.ok(zoomIn && zoomOut && zoomReset, "zoom in/out/reset buttons must exist");
    assert.equal(stageScale(panel), 1, "must start at 1x");
    assert.equal(zoomReset.disabled, true, "reset must be disabled at 1x");
    zoomIn.click();
    assert.equal(stageScale(panel), 1.5, "one + click must zoom to 1.5x");
    assert.equal(zoomReset.disabled, false, "reset must enable once zoomed");
    zoomIn.click();
    assert.equal(stageScale(panel), 2, "two + clicks must zoom to 2x");
    zoomOut.click();
    assert.equal(stageScale(panel), 1.5, "one − click must zoom back to 1.5x");
    zoomReset.click();
    assert.equal(stageScale(panel), 1, "reset must return to 1x");
    assert.equal(zoomReset.disabled, true, "reset must disable again at 1x");
    // Clamped at 3x: five more + clicks never pass 3.
    for (let i = 0; i < 5; i++) panel.querySelector("#cgZoomIn").click();
    assert.equal(stageScale(panel), 3, "zoom must clamp at 3x");
    // And − never goes below 1x.
    for (let i = 0; i < 8; i++) panel.querySelector("#cgZoomOut").click();
    assert.equal(stageScale(panel), 1, "zoom must clamp at 1x");
  } finally {
    window.close();
  }
});

test("3.2.9 note 4 (mapping): painting at zoom 2 maps pointer coords back to base space (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel, log, extra } = openColoring(window);
    const canvas = panel.querySelector("#cgPaintCanvas");
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150, x: 0, y: 0 });
    stubLoadedImage(window, panel.querySelector("#cgPaintImg"), 300, 150);
    // Zoom to 2x with the buttons.
    panel.querySelector("#cgZoomIn").click();
    panel.querySelector("#cgZoomIn").click();
    assert.equal(stageScale(panel), 2, "must be at 2x for the mapping check");
    // Client (20,20) maps to base (10,10) — inside the box: paints.
    firePointer(window, canvas, "pointerdown", 20, 20);
    firePointer(window, canvas, "pointerup", 20, 20);
    assert.ok(putImagePayloads(extra).some((d) => alphaAt(d, 300, 10, 10) === 255 && alphaAt(d, 300, 100, 100) === 0),
      "zoomed press on the figure must build an inside-only mask");
    assert.equal(drawCalls(log).length, 0, "zoomed press must not paint directly");
    // Client (200,200) maps to base (100,100) — background: nothing.
    const masksBefore = putImagePayloads(extra).length;
    firePointer(window, canvas, "pointerdown", 200, 200);
    firePointer(window, canvas, "pointerup", 200, 200);
    assert.equal(putImagePayloads(extra).length, masksBefore, "zoomed background press must build no mask");
    assert.equal(drawCalls(log).length, 0, "zoomed background press must paint nothing");
  } finally {
    window.close();
  }
});

test("3.2.9 note 4 (pinch): two-pointer spread zooms the stage and pauses painting (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel, log } = openColoring(window);
    const canvas = panel.querySelector("#cgPaintCanvas");
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150, x: 0, y: 0 });
    stubLoadedImage(window, panel.querySelector("#cgPaintImg"), 300, 150);
    const viewport = panel.querySelector("#cgZoomViewport");
    assert.ok(viewport, "pinch happens on the zoom viewport");
    // First finger down (paints a dot at base 10,10 — inside the box).
    firePointer(window, canvas, "pointerdown", 10, 10, 1);
    const drawsAfterFirst = drawCalls(log).length;
    // Second finger down: the gesture starts, the stroke stops.
    firePointer(window, canvas, "pointerdown", 60, 60, 2);
    // Spread the two fingers apart: distance 70.7 -> 113.1 (x1.6).
    firePointer(window, canvas, "pointermove", 90, 90, 2);
    const scale = stageScale(panel);
    assert.ok(scale !== null && scale > 1.3 && scale < 1.7, "pinch spread must zoom to ~1.6x, got " + scale);
    // A move of the first finger during the gesture paints nothing
    // (the spread only widens, so the zoom stays up).
    firePointer(window, canvas, "pointermove", 0, 0, 1);
    assert.equal(drawCalls(log).length, drawsAfterFirst, "no paint may happen while two fingers are down");
    assert.ok(stageScale(panel) > 1.3, "the pinch zoom must hold while both fingers are down");
    // Lift both fingers: the gesture ends, the zoom stays.
    firePointer(window, canvas, "pointerup", 0, 0, 1);
    firePointer(window, canvas, "pointerup", 90, 90, 2);
    assert.ok(stageScale(panel) > 1.3, "zoom must stay after the pinch ends");
  } finally {
    window.close();
  }
});

test("3.2.9 note 5 (pure): borderRegions + nearestPaintable skip the background", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("color-games.js"));
    const R = window.MatthewColorRegions;
    assert.ok(R.borderRegions, "MatthewColorRegions must expose borderRegions");
    const img = boxImageData(20, 20);
    const { barrier } = R.keyOutWhite(img.data, 20, 20);
    const { labels, count } = R.labelRegions(R.dilateBarrier(barrier, 20, 20, 1), 20, 20);
    assert.equal(count, 2, "closed box => inside + margin regions");
    const inside = labels[10 * 20 + 10], outside = labels[0];
    const bg = R.borderRegions(labels, 20, 20);
    assert.ok(bg instanceof window.Set || bg instanceof Set, "borderRegions must return a Set");
    assert.equal(bg.size, 1, "exactly one background region (the margin)");
    assert.ok(bg.has(outside), "the margin region must be background");
    assert.ok(!bg.has(inside), "the inside region must NOT be background");
    // Without the skip set, the old behaviour is unchanged (wall press
    // resolves to the margin) — backward compatibility for the 3.2.8 test.
    const hitOld = R.nearestPaintable(labels, 20, 20, 10, 5, 8);
    assert.equal(hitOld.region, outside, "no skip set: wall press still lands in the margin");
    // With the background skipped, the same wall press snaps INWARD.
    const hitNew = R.nearestPaintable(labels, 20, 20, 10, 5, 8, bg);
    assert.equal(hitNew.region, inside, "background skipped: wall press must snap to the inside region");
    // Deep in the margin of a BIGGER picture, skipping the background
    // finds nothing at all (the box is far beyond the 8px search
    // radius — in the 20x20 image every margin point sits within 8px
    // of the box, so it is not a deep-background press).
    const big = boxImageData(40, 40);
    const { barrier: bBarrier } = R.keyOutWhite(big.data, 40, 40);
    const bLab = R.labelRegions(R.dilateBarrier(bBarrier, 40, 40, 1), 40, 40);
    const bBg = R.borderRegions(bLab.labels, 40, 40);
    assert.equal(bLab.count, 2, "bigger picture still has inside + margin regions");
    assert.equal(bBg.size, 1, "bigger picture has exactly one background region");
    assert.equal(R.nearestPaintable(bLab.labels, 40, 40, 39, 39, 8, bBg), null,
      "deep background press must resolve to nothing when the background is skipped");
    assert.equal(R.nearestPaintable(bLab.labels, 40, 40, 0, 39, 8, bBg), null,
      "far-margin background press must resolve to nothing when the background is skipped");
  } finally {
    window.close();
  }
});

test("3.2.9 note 5 (DOM): a background press paints nothing; a wall press snaps inward (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel, log, extra } = openColoring(window);
    const canvas = panel.querySelector("#cgPaintCanvas");
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150, x: 0, y: 0 });
    stubLoadedImage(window, panel.querySelector("#cgPaintImg"), 300, 150);
    // A stroke starting in the background paints NOTHING — no mask, no draws.
    firePointer(window, canvas, "pointerdown", 100, 100);
    firePointer(window, canvas, "pointermove", 10, 10);
    firePointer(window, canvas, "pointerup", 10, 10);
    assert.equal(drawCalls(log).length, 0, "background press must not paint directly");
    assert.ok(!putImagePayloads(extra).some((d) => alphaAt(d, 300, 100, 100) === 255),
      "no mask may ever cover the background (100,100)");
    // A press ON the wall snaps inward: its mask keeps the inside only.
    firePointer(window, canvas, "pointerdown", 10, 5);
    firePointer(window, canvas, "pointerup", 10, 5);
    assert.ok(putImagePayloads(extra).some((d) => alphaAt(d, 300, 10, 10) === 255 && alphaAt(d, 300, 100, 100) === 0),
      "wall press mask must be opaque inside the box and clear outside it");
    // A stroke starting inside still paints the inside only.
    firePointer(window, canvas, "pointerdown", 10, 10);
    firePointer(window, canvas, "pointermove", 12, 12);
    firePointer(window, canvas, "pointerup", 12, 12);
    assert.ok(putImagePayloads(extra).some((d) => alphaAt(d, 300, 10, 10) === 255 && alphaAt(d, 300, 100, 100) === 0),
      "inside stroke mask must be opaque inside and clear outside");
    assert.equal(drawCalls(log).length, 0, "no stroke may paint directly on the visible canvas");
  } finally {
    window.close();
  }
});

test("3.2.9 note 5 (save): after background presses, save still downloads a white-background PNG (live jsdom)", { skip: skipDom }, async () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { downloads } = installSaveStubs(window);
    const { panel, log, extra } = openColoring(window);
    const canvas = panel.querySelector("#cgPaintCanvas");
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150, x: 0, y: 0 });
    stubLoadedImage(window, panel.querySelector("#cgPaintImg"), 300, 150);
    // Background presses first (must paint nothing), then a real dab inside.
    firePointer(window, canvas, "pointerdown", 100, 100);
    firePointer(window, canvas, "pointerup", 100, 100);
    firePointer(window, canvas, "pointerdown", 10, 10);
    firePointer(window, canvas, "pointermove", 12, 12);
    firePointer(window, canvas, "pointerup", 12, 12);
    clickEl(window, panel.querySelector("#cgSavePage"));
    assert.equal(downloads.length, 1, "save must trigger exactly one download");
    assert.equal(downloads[0].download, "matthew-coloring-king.png", "download filename must carry the page id");
    // The composite draws the picture FIRST (its own white background),
    // then the paint canvas (which never holds background paint), then
    // the line-art overlay — so the saved background stays white.
    const img = panel.querySelector("#cgPaintImg");
    const comp = extra.find((e) => {
      const draws = e.log.filter((c) => c.fn === "drawImage");
      return draws.length === 3 && draws[0].args[0] === img && draws[1].args[0] === canvas;
    });
    assert.ok(comp, "save composite must draw picture, paint canvas, overlay — in that order");
    assert.ok(spoken.some((s) => s.fn === "speak" && s.text.includes("حفظنا الصورة يا بطل")),
      "spoken confirmation after saving: " + JSON.stringify(spoken));
    assert.equal(drawCalls(log).length, 0, "background presses must not paint directly");
  } finally {
    window.close();
  }
});
