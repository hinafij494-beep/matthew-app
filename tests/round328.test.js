// Round 3.2.8 — coloring fixes (user notes 2026-11-14, tested on the 3.2.7 APK):
// (1) free-paint must stay inside the picture frame — no paint outside the
//     image rect; (2) gallery cards show REAL thumbnails, no emoji icons;
// (3) arrow navigation between pictures in the picture view (wrap-around).
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

// jsdom has no real 2D canvas: install a recording stub context so the
// paint handlers can be driven and every draw call inspected.
function installPaintStub(window) {
  const log = [];
  const ctx = {
    fillStyle: "", strokeStyle: "", lineWidth: 0, lineCap: "", lineJoin: "",
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
  };
  window.HTMLCanvasElement.prototype.getContext = function () { return ctx; };
  return { log, ctx };
}
function openColoring(window) {
  window.eval(read("color-games.js"));
  const paint = installPaintStub(window);
  const doc = window.document;
  doc.querySelector('[data-coloring="1"]').click();
  return { panel: doc.querySelector("#colorGamesPanel"), log: paint.log };
}
function firePointer(window, el, type, x, y) {
  el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}
function drawCalls(log) {
  return log.filter((c) => ["arc", "moveTo", "lineTo"].includes(c.fn));
}
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
