// Round 3.2.8 — coloring fixes (user notes 2026-11-14, tested on the 3.2.7 APK):
// (1) free-paint must stay inside the picture frame — no paint outside the
//     image rect; (2) gallery cards show REAL thumbnails, no emoji icons;
// (3) arrow navigation between pictures in the picture view (wrap-around).
// Rework: (1) PER-REGION containment — paint never leaves the region it
// started in; (4) save button (PNG download to the device gallery);
// (5) outlines stay visible on top of the paint (line-art overlay);
// (6) nature-game question/picture mapping (systematic shift — stale pack
// audio); (7) more nature pictures (7 -> 11, round 4 -> 8); (8) science
// lesson quiz — any option choosable, questions advance (lessons.js health
// check included).
// Runtime tests drive the REAL module code in jsdom (skipped where jsdom
// is not installed, like round323) — never string-only checks.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
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

// jsdom has no real 2D canvas: install a recording stub context so the
// paint handlers can be driven and every draw call inspected.
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
// Round 3.2.8 rework: the visible paint canvas gets the FIRST context;
// every offscreen canvas (line-art derive, overlay, mask, layer,
// save composite) gets its own recording context in `extra`, so tests
// can tell masked-layer painting apart from direct painting.
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
// Stubs for the save path: a fake blob URL, a toBlob that answers at
// once, a fake Image that fires onload, and an anchor click recorder.
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
function firePointer(window, el, type, x, y) {
  el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}
function drawCalls(log) {
  return log.filter((c) => ["arc", "moveTo", "lineTo"].includes(c.fn));
}
// Deterministic Math.random for shuffle-driven flows (nature round,
// science quiz, letter quiz): same seed => same order every run.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedRandom(window, seed) { window.Math.random = mulberry32(seed); }
// The REAL bank from app.js (the note-8 repro used it: body has 3 bank
// questions + 3 lesson fillers) — the fake makeBank() would give an
// all-filler quiz and miss the reported defect.
function loadRealBank(window) {
  const m = read("app.js").match(/const bank\s*=\s*(\{[\s\S]*?\n\});/);
  assert.ok(m, "bank found in app.js");
  window.bank = window.eval("(" + m[1] + ")");
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
// Every putImageData payload any offscreen canvas received (masks and
// the line-art overlay) — lets tests read the ACTUAL mask bytes the
// runtime built for a stroke.
function putImagePayloads(extra) {
  const out = [];
  for (const e of extra) for (const c of e.log) if (c.fn === "putImageData") out.push(c.args[0]);
  return out;
}
// Pack / text-map loader, same approach as tests/audio-chain.test.js:
// vm-evaluate the shipped files and merge the chunks in file order.
function loadWindowVar(filePattern, varName) {
  const sandbox = {};
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  const files = fs.readdirSync(root)
    .filter((f) => filePattern.test(f))
    .sort((a, b) => parseInt(a.match(/(\d+)\.js$/)[1], 10) - parseInt(b.match(/(\d+)\.js$/)[1], 10));
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  return { chunks: sandbox[varName] || [], files };
}
// Text normalisation, verbatim replica of voice-clips.js keyFor().
const DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
const norm = (value) => String(value || "").replace(/[٠-٩]/g, (c) => DIGITS[c]).replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

function assertInsideFrame(log, w, h, what) {
  for (const c of drawCalls(log)) {
    const [x, y] = c.args;
    assert.ok(x >= 0 && x <= w && y >= 0 && y <= h,
      what + ": " + c.fn + "(" + x + ", " + y + ") escapes the " + w + "x" + h + " frame");
  }
}

test("3.2.8 note 1: a drag sweeping outside the picture paints NOTHING outside the frame (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel, log } = openColoring(window);
    const canvas = panel.querySelector("#cgPaintCanvas");
    assert.ok(canvas, "king page must render a free-paint canvas");
    // jsdom layout is 0-sized: pin the canvas rect to its 300x150 bitmap.
    assert.equal(canvas.width, 300, "canvas bitmap must be the jsdom default 300 wide");
    assert.equal(canvas.height, 150, "canvas bitmap must be the jsdom default 150 high");
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150, x: 0, y: 0 });
    // Drag starts inside, sweeps far outside on every side.
    firePointer(window, canvas, "pointerdown", 50, 50);
    firePointer(window, canvas, "pointermove", 150, 100);
    firePointer(window, canvas, "pointermove", 500, 500);
    firePointer(window, canvas, "pointermove", -40, 200);
    firePointer(window, canvas, "pointermove", 200, -60);
    firePointer(window, canvas, "pointerup", 200, -60);
    assert.ok(drawCalls(log).some((c) => c.fn === "arc" && c.args[0] === 50 && c.args[1] === 50),
      "press inside the frame must still paint (dot at 50,50)");
    assert.ok(drawCalls(log).some((c) => c.fn === "lineTo" && c.args[0] === 300 && c.args[1] === 150),
      "the sweep past the bottom-right must be clamped to the frame corner (300,150)");
    assert.ok(drawCalls(log).some((c) => c.fn === "lineTo" && c.args[0] === 0),
      "the sweep past the left edge must be clamped to x=0");
    assertInsideFrame(log, 300, 150, "drag sweeping outside");
    // Belt-and-braces: every stroke is drawn inside a clip rect of the frame.
    assert.ok(log.some((c) => c.fn === "rect" && c.args[0] === 0 && c.args[1] === 0 && c.args[2] === 300 && c.args[3] === 150),
      "paint must be clipped to rect(0, 0, 300, 150)");
    assert.ok(log.filter((c) => c.fn === "clip").length >= 2, "clip must be applied for the dot and the strokes");
    // A press that STARTS outside the frame draws nothing at all.
    log.length = 0;
    firePointer(window, canvas, "pointerdown", 500, 500);
    firePointer(window, canvas, "pointermove", 50, 50);
    firePointer(window, canvas, "pointerup", 50, 50);
    assert.equal(drawCalls(log).length, 0, "a press starting outside the frame must paint nothing, got " + JSON.stringify(drawCalls(log)));
    log.length = 0;
    firePointer(window, canvas, "pointerdown", -20, 50);
    firePointer(window, canvas, "pointermove", 50, 50);
    firePointer(window, canvas, "pointerup", 50, 50);
    assert.equal(drawCalls(log).length, 0, "a press starting left of the frame must paint nothing");
    // The wrap itself shrink-to-fits the picture so canvas == image box.
    const style = window.document.getElementById("colorGamesStyle").textContent;
    assert.match(style, /\.cg-paint-wrap\{[^}]*width:max-content/, "paint wrap must shrink-to-fit the picture");
    assert.match(style, /\.cg-paint-wrap\{[^}]*overflow:hidden/, "paint wrap must hide any overflow");
  } finally {
    window.close();
  }
});

test("3.2.8 note 2: every gallery card shows a REAL thumbnail, no emoji icons (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel } = openColoring(window);
    const pages = window.MatthewColorPages;
    assert.equal(pages.length, 19, "registry must list 19 pages");
    const cards = [...panel.querySelectorAll("[data-page]")];
    assert.equal(cards.length, 19, "gallery must list all 19 pages");
    const emojiRe = /\p{Extended_Pictographic}/u;
    const knownIcons = pages.map((p) => p.icon);
    for (let i = 0; i < 19; i++) {
      const card = cards[i];
      const page = pages[i];
      assert.equal(card.textContent.trim(), page.name,
        "card " + i + " must show the plain page name, got " + JSON.stringify(card.textContent));
      assert.ok(!emojiRe.test(card.textContent),
        "card " + i + " text must contain no emoji, got " + JSON.stringify(card.textContent));
      for (const icon of knownIcons) {
        assert.ok(!card.innerHTML.includes(icon), "card " + i + " must not contain the icon " + icon);
      }
      if (page.img) {
        const thumb = card.querySelector("img.cg-thumb");
        assert.ok(thumb, "card " + i + " (" + page.name + ") must contain a real <img> thumbnail");
        assert.equal(thumb.getAttribute("src"), page.img, "card " + i + " thumbnail must be its own picture");
        assert.match(thumb.getAttribute("src"), /^data:image\/webp;base64,/, "card " + i + " thumbnail must be the embedded picture");
      } else {
        assert.ok(card.querySelector("svg"), "card " + i + " (crown) must contain an inline SVG preview");
        assert.equal(card.querySelector("img.cg-thumb"), null, "crown card must not have a raster thumbnail");
      }
    }
    const style = window.document.getElementById("colorGamesStyle").textContent;
    assert.match(style, /\.cg-thumb\{/, "injected styles must size the thumbnails");
    assert.ok(!/\.cg-page-btn span\{/.test(style), "the old emoji-span gallery style must be gone");
  } finally {
    window.close();
  }
});

test("3.2.8 note 3: arrows flip pictures in the picture view, with wrap-around (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel } = openColoring(window);
    const pages = window.MatthewColorPages;
    const label = () => panel.querySelector(".cg-page-label").textContent;
    const arrows = () => ({
      prev: panel.querySelector("#cgPrevPage"),
      next: panel.querySelector("#cgNextPage"),
    });
    // Arrows live in the picture view, in a row with the label.
    let a = arrows();
    assert.ok(a.prev && a.next, "prev/next arrows must exist in the picture view");
    assert.equal(a.prev.getAttribute("data-page-prev"), "", "prev arrow must carry data-page-prev");
    assert.equal(a.next.getAttribute("data-page-next"), "", "next arrow must carry data-page-next");
    assert.ok(a.prev.closest(".cg-page-nav") && a.next.closest(".cg-page-nav"), "arrows must sit in the nav row");
    assert.ok(panel.querySelector(".cg-page-nav .cg-page-label"), "the label must sit in the same nav row");
    assert.match(label(), /الملك ماثيو/, "must start on page 0");
    // Next: picture + label update, fresh paint surface.
    const canvas0 = panel.querySelector("#cgPaintCanvas");
    a.next.click();
    assert.match(label(), /الدكتور ماثيو/, "next must move to page 1");
    assert.equal(panel.querySelector("#cgPaintImg").getAttribute("src"), pages[1].img, "next must show page 1's picture");
    assert.notEqual(panel.querySelector("#cgPaintCanvas"), canvas0, "flipping must give a fresh paint surface");
    assert.ok(arrows().prev && arrows().next, "arrows must survive the flip");
    // Prev: back to page 0.
    arrows().prev.click();
    assert.match(label(), /الملك ماثيو/, "prev must move back to page 0");
    assert.equal(panel.querySelector("#cgPaintImg").getAttribute("src"), pages[0].img, "prev must show page 0's picture");
    // Wrap-around forward: crown (last) -> next -> first.
    [...panel.querySelectorAll("[data-page]")][18].click();
    assert.match(label(), /تاج الملك/, "gallery must still open the crown page");
    a = arrows();
    assert.ok(a.prev && a.next, "arrows must also exist in the crown view");
    a.next.click();
    assert.match(label(), /الملك ماثيو/, "next from the last page must wrap to the first");
    assert.ok(panel.querySelector("#cgPaintImg"), "wrapped-to first page must render its picture");
    // Wrap-around backward: first -> prev -> last (crown).
    arrows().prev.click();
    assert.match(label(), /تاج الملك/, "prev from the first page must wrap to the last");
    assert.ok(panel.querySelector("#cgGame [data-part]"), "wrapped-to crown page must render its regions");
    assert.ok(arrows().prev && arrows().next, "arrows must exist after wrapping to the crown");
    // One more step back lands on the last raster page.
    arrows().prev.click();
    assert.match(label(), /الرسام ماثيو/, "prev from the crown must move to page 17");
    assert.equal(panel.querySelector("#cgPaintImg").getAttribute("src"), pages[17].img, "page 17 picture must show");
    // The grid stays the picker alongside the arrows.
    assert.equal(panel.querySelectorAll("[data-page]").length, 19, "gallery grid must stay as the picker");
  } finally {
    window.close();
  }
});

// ------------------------------------------------------------------
// Round 3.2.8 rework — per-region containment (note 1), outlines on top
// (note 5), save button (note 4), nature mapping + pictures (notes 6-7),
// science quiz (note 8). Tests below drive the REAL module code in jsdom.
// ------------------------------------------------------------------

test("3.2.8 note 1 (pure): barrier / labelling / mask on a closed box, + 700x900 timing", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("color-games.js"));
    const R = window.MatthewColorRegions;
    assert.ok(R, "MatthewColorRegions hook must exist");
    const img = boxImageData(20, 20);
    const { barrier, overlay } = R.keyOutWhite(img.data, 20, 20);
    assert.equal(barrier[5 * 20 + 10], 1, "wall pixel is a barrier");
    assert.equal(barrier[10 * 20 + 10], 0, "inside pixel is not a barrier");
    assert.equal(barrier[0], 0, "margin pixel is not a barrier");
    assert.equal(alphaAt({ data: overlay }, 20, 10, 5), 255, "wall stays opaque in the line-art overlay");
    assert.equal(alphaAt({ data: overlay }, 20, 10, 10), 0, "white inside is keyed out of the overlay (transparent)");
    assert.equal(alphaAt({ data: overlay }, 20, 0, 0), 0, "white margin is keyed out of the overlay");
    const dilated = R.dilateBarrier(barrier, 20, 20, 1);
    assert.equal(dilated[4 * 20 + 10], 1, "dilation closes the 1px gap next to the wall");
    assert.equal(dilated[10 * 20 + 10], 0, "dilation must not swallow the inside of the box");
    const { labels, count } = R.labelRegions(dilated, 20, 20);
    assert.equal(count, 2, "closed box => inside + margin regions");
    const inside = labels[10 * 20 + 10], outside = labels[0];
    assert.ok(inside >= 0 && outside >= 0 && inside !== outside, "inside and outside are different regions");
    assert.equal(labels[5 * 20 + 10], -1, "wall pixels belong to no region");
    // A press ON the wall (top edge) resolves to the nearest paintable
    // pixel — the margin, not the inside (scan order finds (8,3) first).
    const hit = R.nearestPaintable(labels, 20, 20, 10, 5, 8);
    assert.ok(hit, "wall press finds a paintable pixel nearby");
    assert.equal(hit.region, outside, "wall press lands in the margin region, got region " + hit.region);
    // (field-wise: the hit object comes from the jsdom realm, so
    // deepStrictEqual would fail on the prototype, not the values.)
    const hitSelf = R.nearestPaintable(labels, 20, 20, 10, 10, 8);
    assert.equal(hitSelf.x, 10, "a press inside its own region resolves to itself (x)");
    assert.equal(hitSelf.y, 10, "a press inside its own region resolves to itself (y)");
    assert.equal(hitSelf.region, inside, "a press inside its own region resolves to itself (region)");
    const maskIn = R.buildRegionMaskData(labels, inside, 20, 20);
    assert.equal(alphaAt({ data: maskIn }, 20, 10, 10), 255, "inside mask covers the inside");
    assert.equal(alphaAt({ data: maskIn }, 20, 0, 0), 0, "inside mask is clear outside the box");
    const maskOut = R.buildRegionMaskData(labels, outside, 20, 20);
    assert.equal(alphaAt({ data: maskOut }, 20, 0, 0), 255, "margin mask covers the outside");
    assert.equal(alphaAt({ data: maskOut }, 20, 10, 10), 0, "margin mask is clear inside the box");
    // One-time cost on a real-page-sized grid (700x900): must stay fast.
    const big = boxImageData(700, 900);
    const t0 = Date.now();
    const bigLab = R.labelRegions(R.dilateBarrier(R.keyOutWhite(big.data, 700, 900).barrier, 700, 900, 1), 700, 900);
    const ms = Date.now() - t0;
    assert.equal(bigLab.count, 2, "700x900 box still labels 2 regions");
    console.log("3.2.8 region labelling 700x900: " + ms + "ms");
    assert.ok(ms < 2000, "labelling a 700x900 page must be fast (one-time per page), took " + ms + "ms");
  } finally {
    window.close();
  }
});

test("3.2.8 note 1 (DOM): a stroke crossing the outline paints NOTHING outside its region", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel, log, extra } = openColoring(window);
    const canvas = panel.querySelector("#cgPaintCanvas");
    assert.ok(canvas, "king page must render a free-paint canvas");
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150, x: 0, y: 0 });
    stubLoadedImage(window, panel.querySelector("#cgPaintImg"), 300, 150);
    // Stroke starts INSIDE the box (10,10) and sweeps far outside it.
    firePointer(window, canvas, "pointerdown", 10, 10);
    firePointer(window, canvas, "pointermove", 100, 100);
    firePointer(window, canvas, "pointerup", 100, 100);
    // No paint ever touches the visible canvas directly: every stroke
    // goes through a temp layer masked with destination-in, then one
    // drawImage composites the layer.
    assert.equal(drawCalls(log).length, 0,
      "visible canvas must receive no direct paint, got " + JSON.stringify(drawCalls(log)));
    assert.ok(log.some((c) => c.fn === "drawImage"), "visible canvas must receive the masked-layer composite");
    assert.ok(extra.some((e) => e.log.some((c) => c.fn === "gco" && c.args[0] === "destination-in")),
      "a layer context must apply the region mask with destination-in");
    // The mask the runtime actually built for this stroke keeps ONLY
    // the inside of the box.
    assert.ok(putImagePayloads(extra).some((d) => alphaAt(d, 300, 10, 10) === 255 && alphaAt(d, 300, 100, 100) === 0),
      "inside-started stroke mask must be opaque inside the box and clear outside it");
    // Note 5: the line-art overlay sits directly ABOVE the paint canvas
    // in DOM order, carrying the processed line art.
    const overlay = panel.querySelector("#cgLineOverlay");
    assert.ok(overlay, "line-art overlay element must exist");
    assert.equal(overlay.previousElementSibling, canvas, "overlay must sit directly above the paint canvas");
    assert.equal(overlay.getAttribute("src"), "data:image/png;base64,TESTLINEART",
      "overlay src must be the processed line art, got " + overlay.getAttribute("src"));
    // A press ON the wall paints the margin region, never the inside.
    firePointer(window, canvas, "pointerdown", 10, 5);
    firePointer(window, canvas, "pointerup", 10, 5);
    assert.ok(putImagePayloads(extra).some((d) => alphaAt(d, 300, 100, 100) === 255 && alphaAt(d, 300, 10, 10) === 0),
      "wall press mask must be opaque outside and clear inside the box");
    assert.equal(drawCalls(log).length, 0, "wall press must not paint directly either");
    // A stroke starting OUTSIDE stays outside.
    firePointer(window, canvas, "pointerdown", 100, 100);
    firePointer(window, canvas, "pointermove", 10, 10);
    firePointer(window, canvas, "pointerup", 10, 10);
    assert.ok(putImagePayloads(extra).some((d) => alphaAt(d, 300, 100, 100) === 255 && alphaAt(d, 300, 10, 10) === 0),
      "outside-started stroke mask must be opaque outside and clear inside the box");
    assert.equal(drawCalls(log).length, 0, "outside press must not paint directly either");
  } finally {
    window.close();
  }
});

test("3.2.8 note 4 (raster): save button composites picture + paint + outlines and downloads the PNG", { skip: skipDom }, async () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { downloads } = installSaveStubs(window);
    const { panel, log, extra } = openColoring(window);
    const canvas = panel.querySelector("#cgPaintCanvas");
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150, x: 0, y: 0 });
    stubLoadedImage(window, panel.querySelector("#cgPaintImg"), 300, 150);
    const saveBtn = panel.querySelector("#cgSavePage");
    assert.ok(saveBtn, "save button must exist on the raster picture view");
    assert.ok(saveBtn.closest(".cg-actions-row"), "save button sits in the actions row");
    assert.ok(saveBtn.closest(".cg-actions-row").querySelector("#cgClearPage"), "save sits next to the clear button");
    // Paint a dab first: the saved PNG must contain the painting, not a blank canvas.
    firePointer(window, canvas, "pointerdown", 10, 10);
    firePointer(window, canvas, "pointermove", 12, 12);
    firePointer(window, canvas, "pointerup", 12, 12);
    clickEl(window, saveBtn);
    assert.equal(downloads.length, 1, "save must trigger exactly one download, got " + JSON.stringify(downloads));
    assert.equal(downloads[0].download, "matthew-coloring-king.png", "download filename must carry the page id");
    assert.equal(downloads[0].href, "blob:test-save", "download must use the PNG blob URL");
    // The composite canvas draws picture, then THE paint canvas (with
    // the dab on it), then the line-art overlay — in that order.
    const img = panel.querySelector("#cgPaintImg");
    const comp = extra.find((e) => {
      const draws = e.log.filter((c) => c.fn === "drawImage");
      return draws.length === 3 && draws[0].args[0] === img && draws[1].args[0] === canvas;
    });
    assert.ok(comp, "save composite must draw picture, paint canvas, overlay — in that order");
    const third = comp.log.filter((c) => c.fn === "drawImage")[2].args[0];
    assert.ok(third instanceof window.HTMLCanvasElement && third !== canvas,
      "third composite draw must be the line-art overlay canvas (outlines on top)");
    assert.ok(spoken.some((s) => s.fn === "speak" && s.text.includes("حفظنا الصورة يا بطل")),
      "spoken confirmation after saving: " + JSON.stringify(spoken));
    assert.match(panel.querySelector("#cgMsg").textContent, /حفظنا الصورة يا بطل/,
      "visible confirmation after saving");
    assert.ok(!log.some((c) => c.fn === "drawImage" && c.args[0] === comp),
      "save must not paint onto the visible canvas");
  } finally {
    window.close();
  }
});

test("3.2.8 notes 4+5 (crown): every part keeps a dark stroke, and save rasterises the filled SVG on white", { skip: skipDom }, async () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { downloads } = installSaveStubs(window);
    const { panel, extra } = openColoring(window);
    [...panel.querySelectorAll("[data-page]")][18].click();
    assert.match(panel.querySelector(".cg-page-label").textContent, /تاج الملك/, "crown page opens");
    const saveBtn = panel.querySelector("#cgSavePage");
    assert.ok(saveBtn, "save button must exist on the crown page too");
    assert.ok(saveBtn.closest(".cg-actions-row").querySelector("#cgClearPage"), "save sits next to clear on the crown page");
    // Note 5 (crown): a fill must not hide its own outline — every part
    // carries a dark stroke drawn with its fill.
    const parts = [...panel.querySelectorAll(".cg-crown-wrap [data-part]")];
    assert.equal(parts.length, 6, "crown has 6 colorable parts");
    for (const g of parts) {
      const shape = g.querySelector("polygon, rect");
      assert.ok(shape, "crown part " + g.dataset.part + " has a shape");
      assert.equal(shape.getAttribute("stroke"), "#3a2a63",
        "part " + g.dataset.part + " must carry the dark outline stroke");
      assert.ok(Number(shape.getAttribute("stroke-width")) >= 2,
        "part " + g.dataset.part + " stroke must be visible");
    }
    // Fill one part, then save.
    clickEl(window, panel.querySelector('.cg-swatch[data-color="0"]'));
    clickEl(window, panel.querySelector('[data-part="0"]'));
    const filled = panel.querySelector('.cg-crown-wrap [data-part="0"] polygon, .cg-crown-wrap [data-part="0"] rect');
    assert.ok(filled && filled.getAttribute("fill") && filled.getAttribute("fill") !== "#ffffff",
      "part 0 must be filled before saving, got " + (filled && filled.getAttribute("fill")));
    clickEl(window, panel.querySelector("#cgSavePage"));
    await sleep(30); // the stub Image fires onload on a timer
    assert.equal(downloads.length, 1, "crown save must trigger exactly one download, got " + JSON.stringify(downloads));
    assert.equal(downloads[0].download, "matthew-coloring-crown.png", "crown download filename must carry the page id");
    const comp = extra.find((e) => {
      const fi = e.log.findIndex((c) => c.fn === "fillRect");
      const di = e.log.findIndex((c) => c.fn === "drawImage");
      return fi >= 0 && di > fi;
    });
    assert.ok(comp, "crown save must fill the background first, then draw the rasterised SVG");
    const whiteIdx = comp.log.findIndex((c) => c.fn === "fillStyle" && c.args[0] === "#ffffff");
    assert.ok(whiteIdx >= 0 && whiteIdx < comp.log.findIndex((c) => c.fn === "fillRect"),
      "crown save background must be white");
    assert.ok(spoken.some((s) => s.fn === "speak" && s.text.includes("حفظنا الصورة يا بطل")),
      "spoken confirmation after crown saving: " + JSON.stringify(spoken));
  } finally {
    window.close();
  }
});

test("3.2.8 notes 6+7: nature game — 11 pictures, spoken question always names the shown picture, 8 per round", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    const { panel } = openColoring(window);
    seedRandom(window, 1234);
    panel.querySelector('[data-tab="nature"]').click();
    const nature = window.MatthewColorNature;
    assert.equal(nature.length, 11, "the game must have 11 pictures (was 7)");
    assert.ok(!nature.some((n) => n.name.includes("سمكة") || n.emoji === "🐟" || n.emoji === "🐠"),
      "no fish anywhere in the game");
    // Every picture's palette colour is on screen, incl. the new ones.
    for (const c of ["purple", "grey", "brown"]) {
      assert.ok(panel.querySelector('[data-color="' + c + '"]'), "palette must offer " + c);
    }
    const names = [], counters = [];
    for (let step = 0; step < 3; step++) {
      const name = panel.querySelector(".cg-nature-name").textContent;
      const emoji = panel.querySelector(".cg-nature-emoji").textContent;
      const item = nature.find((n) => n.name === name);
      assert.ok(item, "shown name is a nature item: " + name);
      assert.equal(emoji, item.emoji, "shown picture matches its name (" + name + ")");
      panel.querySelector("#cgListenNature").click();
      const lastSpeak = [...spoken].reverse().find((s) => s.fn === "speak");
      assert.ok(lastSpeak, "listen button must speak the question");
      const article = (item.masc ? "ده " : "دي ") + name;
      assert.ok(lastSpeak.text.includes(article),
        "question must name the shown picture with the right article, got: " + lastSpeak.text);
      assert.ok(lastSpeak.text.includes(item.masc ? "لونه الحقيقي" : "لونها الحقيقي"),
        "question must use the right gender for " + name + ": " + lastSpeak.text);
      names.push(name);
      counters.push(panel.querySelector(".cg-round").textContent);
      const btn = panel.querySelector('[data-color="' + item.color + '"]');
      assert.ok(btn, "palette must offer the real colour (" + item.color + ") for " + name);
      clickEl(window, btn);
      const next = panel.querySelector("#cgNatureNext");
      assert.ok(next, "next button appears after the right colour for " + name);
      clickEl(window, next);
    }
    assert.equal(new Set(names).size, 3, "three different pictures in three steps: " + JSON.stringify(names));
    assert.deepEqual(counters, ["١ / ٨", "٢ / ٨", "٣ / ٨"],
      "a round shows 8 pictures, counter advances ١/٨ → ٢/٨ → ٣/٨, got " + JSON.stringify(counters));
  } finally {
    window.close();
  }
});

test("3.2.8 note 6 (files): corpus + text map + packs agree on all 44 nature clips, no fish", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("color-games.js"));
    const nature = window.MatthewColorNature;
    assert.equal(nature.length, 11, "11 nature pictures");
    const REAL_COLORS = {
      "تفاحة": "red", "شمس": "yellow", "ورقة شجرة": "green", "سحابة": "white",
      "وردة": "pink", "فراولة": "red", "جزرة": "orange", "بحر": "blue",
      "عنب": "purple", "فيل": "grey", "شوكولاتة": "brown",
    };
    const corpus = JSON.parse(read("audio-src/corpus.json"));
    const byKeyCorpus = new Map(corpus.map((e) => [e.key, e]));
    const textLoad = loadWindowVar(/^voice-clips-text-\d+\.js$/, "__matthewClipText");
    const exactLoad = loadWindowVar(/^voice-clips-text-\d+\.js$/, "__matthewClipExact");
    const BY_TEXT = Object.assign({}, ...textLoad.chunks);
    const EXACT = Object.assign({}, ...exactLoad.chunks);
    const packLoad = loadWindowVar(/^voice-clips-pack-\d+\.js$/, "__matthewClipData");
    const BY_KEY_RAW = Object.assign({}, ...packLoad.chunks);
    const BY_KEY = Object.assign({}, BY_KEY_RAW);
    for (const k of Object.keys(BY_KEY)) {
      const t = k.indexOf("~");
      if (t > 0) { const base = k.slice(0, t); BY_KEY[base] = (BY_KEY[base] || "") + BY_KEY[k]; delete BY_KEY[k]; }
    }
    const INTRO = "لعبة سحب لون الطبيعة يا ملك ماثيو! شوف الصورة الرمادي واختار لونها الحقيقي من اللوحة!";
    nature.forEach((item, i) => {
      assert.equal(item.color, REAL_COLORS[item.name],
        item.name + " real colour must be " + REAL_COLORS[item.name] + ", got " + item.color);
      const q = (item.masc ? "ده " : "دي ") + item.name + "! " +
        (item.masc ? "لونه" : "لونها") + " الحقيقي إيه يا ترى؟ اختار من اللوحة!";
      const expect = {
        ["cg_nat_q_" + i]: q,
        ["cg_nat_tab_" + i]: INTRO + " " + q,
        ["cg_nat_ok_" + i]: item.fact + " برافو يا بطل!",
        ["cg_nat_all_" + i]: item.fact + " برافو يا ملك ماثيو! لوّنت كل حاجات الطبيعة صح! خدت ألماسة جديدة لتاجك!",
      };
      for (const [key, text] of Object.entries(expect)) {
        const entry = byKeyCorpus.get(key);
        assert.ok(entry, "corpus must have " + key);
        assert.equal(entry.text, text, key + " corpus text must be the runtime composition");
        assert.ok(!text.includes("سمكة"), key + " text must not mention a fish: " + text);
        const got = EXACT[text.trim()] || BY_TEXT[norm(text)];
        assert.equal(got, key, "text map must resolve " + key + "'s text to " + key + ", got " + got);
        assert.ok(BY_KEY[key], "pack must contain " + key);
        const oggPath = path.join(root, "audio-src/opus", key + ".ogg");
        if (fs.existsSync(oggPath)) {
          assert.ok(Buffer.from(BY_KEY[key], "base64").equals(fs.readFileSync(oggPath)),
            "pack bytes must equal the ogg for " + key + " (stale pack audio was the note-6 defect)");
        }
      }
    });
    for (const [key, e] of byKeyCorpus) {
      if (key.startsWith("cg_nat_")) assert.ok(!e.text.includes("سمكة"), key + " must not mention a fish: " + e.text);
    }
  } finally {
    window.close();
  }
});

test("3.2.8 note 8: science lesson quiz — any option can be chosen, questions advance (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    loadRealBank(window);
    window.eval(read("science.js"));
    seedRandom(window, 20261114);
    const doc = window.document;
    const card = [...doc.querySelectorAll("#learningList .game-card")]
      .find((c) => c.textContent.includes("عالم العلوم"));
    assert.ok(card, "science card must exist");
    card.click();
    const panel = doc.querySelector("#scienceAcademy");
    assert.ok(panel, "science panel must exist");
    panel.querySelector('[data-subject="body"]').click();
    panel.querySelector('[data-lesson="1"]').click(); // القلب — the reported lesson
    assert.ok(panel.textContent.includes("القلب"), "heart lesson opens");
    panel.querySelector('[data-lesson-tab="quiz"]').click();
    const api = window.MatthewScienceScenes;
    const bankScience = window.bank.science;
    const stages = [], qTexts = [], correctPositions = [];
    const fillerSeen = new Set();
    let reportedSeen = false;
    for (let i = 0; i < 6; i++) {
      const qp = panel.querySelector('[data-tab-panel="quiz"]');
      stages.push(qp.querySelector(".math-stage").textContent);
      const qText = qp.querySelector("h2").textContent;
      qTexts.push(qText);
      if (qText === "ما العضو الذي يضخ الدم في الجسم؟") reportedSeen = true;
      if (api.scienceFillerPrompts.includes(qText)) fillerSeen.add(qText);
      const choices = [...qp.querySelectorAll("[data-value]")];
      assert.equal(choices.length, 4, "4 choices for science question " + (i + 1));
      // Note 8: pick a NON-first option — the old bug only ever let the
      // first option be chosen (correct was always option #1).
      choices[2].click();
      assert.ok(panel.querySelector("#scienceFeedback").textContent.length > 0,
        "choosing the 3rd option must register feedback on question " + (i + 1));
      const correct = choices.findIndex((b) => b.classList.contains("correct"));
      assert.ok(correct >= 0 && correct < 4, "a correct choice is marked on question " + (i + 1));
      correctPositions.push(correct);
      const next = panel.querySelector("#scienceNextQ");
      assert.ok(next && !next.classList.contains("hidden"),
        "next button appears after answering question " + (i + 1));
      next.click();
    }
    assert.deepEqual(stages,
      ["سؤال ١ من ٦", "سؤال ٢ من ٦", "سؤال ٣ من ٦", "سؤال ٤ من ٦", "سؤال ٥ من ٦", "سؤال ٦ من ٦"],
      "counter must advance ١→٦, got " + JSON.stringify(stages));
    assert.equal(new Set(qTexts).size, 6, "all 6 questions differ: " + JSON.stringify(qTexts));
    assert.ok(reportedSeen, "the reported question «ما العضو الذي يضخ الدم في الجسم؟» must appear");
    assert.ok(bankScience.some((b) => qTexts.includes(b.q)), "bank questions appear in the quiz");
    assert.ok(correctPositions.some((p) => p !== 0),
      "correct answer is not always the first option: " + JSON.stringify(correctPositions));
    assert.ok(fillerSeen.size >= 2,
      "filler prompts rotate (not one identical card text): " + JSON.stringify([...fillerSeen]));
    assert.ok(panel.innerHTML.includes("من ٦"), "result screen shows X من ٦");
  } finally {
    window.close();
  }
});

test("3.2.8 note 8 (health): letter-school quiz (lessons.js) — non-first choice advances", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("lessons.js"));
    seedRandom(window, 777);
    const doc = window.document;
    const card = [...doc.querySelectorAll("#learningList .game-card")]
      .find((c) => c.textContent.includes("مدرسة الحروف"));
    assert.ok(card, "letter school card must exist");
    card.click();
    const panel = doc.querySelector("#letterSchool");
    assert.ok(panel, "letter school panel must exist");
    panel.querySelectorAll("[data-letter]")[1].click(); // ب
    panel.querySelector('[data-lesson-tab="quiz"]').click(); // starts the quiz directly
    const steps = [], qTexts = [];
    for (let i = 0; i < 3; i++) {
      const qp = panel.querySelector('[data-tab-panel="quiz"]');
      steps.push(panel.querySelector("#lessonStep").textContent);
      qTexts.push(qp.querySelector("h2").textContent);
      const choices = [...qp.querySelectorAll("[data-answer]")];
      assert.equal(choices.length, 4, "4 choices for letter quiz question " + (i + 1));
      choices[2].click(); // a NON-first option
      assert.ok(choices.some((b) => b.classList.contains("correct")),
        "a correct choice is marked on letter quiz question " + (i + 1));
      assert.ok(panel.querySelector("#lessonStatus").textContent.length > 0,
        "status feedback appears on letter quiz question " + (i + 1));
      panel.querySelector("#lessonNext").click();
    }
    assert.deepEqual(steps, ["١ / ١٠", "٢ / ١٠", "٣ / ١٠"],
      "letter quiz counter advances ١→٣ of ١٠, got " + JSON.stringify(steps));
    assert.equal(new Set(qTexts).size, 3, "letter quiz questions change: " + JSON.stringify(qTexts));
  } finally {
    window.close();
  }
});
