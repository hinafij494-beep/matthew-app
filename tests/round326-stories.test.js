// Round 3.2.6 — Worker C regression tests (items 5, 6, 8, 9, 10).
// The story picker opens EVERY story at 0 stars (star gate removed from
// opening, stars stay a display/reward); home has exactly THREE doors;
// the workshop + coloring cards live in Games; the coloring canvas works
// in free + by-numbers modes with the expanded palette.
// Runtime tests drive the REAL module code in a stub DOM (vm, always) and
// in jsdom (skipped where jsdom is not installed, like round323) — never
// string-only checks.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
let JSDOM = null;
try { ({ JSDOM } = require("jsdom")); } catch (_) { JSDOM = null; }
const skipDom = !JSDOM;

// ---------- classify() (vm, always): every card lands in the right door ----------
const appSrc = read("app.js");
const classifySrc = appSrc.slice(
  appSrc.indexOf("const classify = card => {"),
  appSrc.indexOf("const activityOpen"),
);
const classifyCtx = {};
vm.runInNewContext(classifySrc + "\nglobalThis.classify = classify;", classifyCtx);
const classify = classifyCtx.classify;
const fakeCard = (dataset, inGameList, text) => ({
  dataset,
  textContent: text || "",
  closest: (sel) => (sel === "#gameList" && inGameList ? {} : null),
});

test("3.2.6 items 6/8/9: classify() sends workshop + coloring to Games, tracing to Learn", () => {
  assert.equal(classify(fakeCard({ workshop: "1" }, true)), "games", "workshop card must be Games");
  assert.equal(classify(fakeCard({ coloring: "1" }, true)), "games", "coloring card must be Games");
  assert.equal(classify(fakeCard({ stories: "1" }, true)), "games", "stories card must be Games");
  assert.equal(classify(fakeCard({ category: "numbers" }, true)), "quiz", "quiz category card must be Tests");
  assert.equal(classify(fakeCard({}, false, "اكتب بإصبعك")), "learn", "tracing is a lesson activity now the colors door is gone");
  assert.equal(classify(fakeCard({}, false)), "learn", "learning cards stay in Learn");
  assert.equal(classify(fakeCard({}, false, "لوحة ولي الأمر")), "parent");
});

// ---------- initHomeDoors() in a stub DOM (vm, always) ----------
// Harness adapted from tests/round322.test.js P0-2 (same makeEl/runDoors).
function makeEl(tag) {
  const e = {
    tagName: tag, id: "", children: [], style: {}, dataset: {},
    textContent: "", parentElement: null, _cls: new Set(), _listeners: {},
  };
  e.classList = {
    add: (c) => e._cls.add(c),
    remove: (c) => e._cls.delete(c),
    toggle: (c, f) => {
      if (f === undefined) { if (e._cls.has(c)) e._cls.delete(c); else e._cls.add(c); }
      else if (f) e._cls.add(c); else e._cls.delete(c);
    },
    contains: (c) => e._cls.has(c),
  };
  e.setAttribute = (k, v) => { if (k === "id") e.id = v; else e.dataset[k] = v; };
  e.getAttribute = (k) => (k === "id" ? e.id : e.dataset[k]);
  e.appendChild = (c) => { e.children.push(c); c.parentElement = e; return c; };
  e.append = (...cs) => cs.forEach((c) => e.appendChild(c));
  e.insertBefore = (c, ref) => {
    const i = ref ? e.children.indexOf(ref) : -1;
    if (i >= 0) e.children.splice(i, 0, c); else e.children.push(c);
    c.parentElement = e;
  };
  e.after = (c) => {
    if (e.parentElement) {
      const sibs = e.parentElement.children;
      sibs.splice(sibs.indexOf(e) + 1, 0, c); c.parentElement = e.parentElement;
    }
  };
  e.remove = () => {
    if (e.parentElement) {
      const i = e.parentElement.children.indexOf(e);
      if (i >= 0) e.parentElement.children.splice(i, 1);
      e.parentElement = null;
    }
  };
  e.addEventListener = (ev, fn) => { (e._listeners[ev] = e._listeners[ev] || []).push(fn); };
  e.click = () => (e._listeners.click || []).forEach((fn) => fn());
  e.closest = (sel) => {
    let n = e;
    while (n) {
      if (sel === "#gameList" && n.id === "gameList") return n;
      if (sel === "#learningList" && n.id === "learningList") return n;
      n = n.parentElement;
    }
    return null;
  };
  e.querySelector = (sel) => {
    if (sel === "#doorTitle") return e._doorTitle || (e._doorTitle = makeEl("strong"));
    if (sel === "#doorBack") return e._doorBack || (e._doorBack = makeEl("button"));
    return null;
  };
  e.querySelectorAll = (sel) => (sel === "[data-door]" ? (e._doors || []) : []);
  Object.defineProperty(e, "innerHTML", {
    get: () => e._html || "",
    set: (v) => {
      e._html = v;
      const doors = [...String(v).matchAll(/data-door="([^"]+)"/g)].map((m) => {
        const b = makeEl("button"); b.dataset.door = m[1]; return b;
      });
      if (doors.length) e._doors = doors;
      if (/id="doorBack"/.test(v)) e._doorBack = makeEl("button");
      if (/id="doorTitle"/.test(v)) e._doorTitle = makeEl("strong");
    },
  });
  return e;
}

function runDoors() {
  const src = read("app.js");
  const start = src.indexOf("(function initHomeDoors() {");
  const end = src.lastIndexOf("})();") + 4;
  const code = src.slice(start, end);
  const main = makeEl("main");
  const learnList = makeEl("section"); learnList.id = "learningList";
  const gameList = makeEl("section"); gameList.id = "gameList";
  const hero = makeEl("div");
  main.appendChild(learnList); main.appendChild(gameList);
  const tracingCard = makeEl("button"); tracingCard.textContent = "✏️ اكتب بإصبعك تتبّع الحروف"; learnList.appendChild(tracingCard);
  const learnCard = makeEl("button"); learnList.appendChild(learnCard);
  const quizCard = makeEl("button"); quizCard.dataset.category = "numbers"; gameList.appendChild(quizCard);
  const workshopCard = makeEl("button"); workshopCard.dataset.workshop = "1"; gameList.appendChild(workshopCard);
  const coloringCard = makeEl("button"); coloringCard.dataset.coloring = "1"; gameList.appendChild(coloringCard);
  const storiesCard = makeEl("button"); storiesCard.dataset.stories = "1"; gameList.appendChild(storiesCard);
  const quizPanel = makeEl("section"); quizPanel.id = "quiz";
  quizPanel.classList.add("quiz-panel"); quizPanel.classList.add("hidden");
  main.appendChild(quizPanel);
  const sections = [learnList, gameList, quizPanel];
  const docListeners = {};
  const documentStub = {
    querySelector: (sel) => {
      if (sel === "main") return main;
      if (sel === ".hero") return hero;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === ".section-head") return [];
      if (sel === "main > section") return sections.slice();
      if (/quiz-panel|academy-panel|result-panel/.test(sel)) {
        return sections.filter((s) => ["quiz-panel", "academy-panel", "result-panel"].some((c) => s.classList.contains(c)));
      }
      return [];
    },
    getElementById: (id) => (id === "learningList" ? learnList : id === "gameList" ? gameList : null),
    createElement: (tag) => {
      const el = makeEl(tag);
      if (tag === "section") sections.push(el);
      return el;
    },
    addEventListener: (ev, fn) => { (docListeners[ev] = docListeners[ev] || []).push(fn); },
  };
  const ctx = {
    document: documentStub,
    window: {
      scrollTo: () => {},
      addEventListener: () => {},
      MatthewVoice: { stop: () => {} },
    },
    localStorage: {
      _m: new Map(),
      getItem: function (k) { return this._m.has(k) ? this._m.get(k) : null; },
      setItem: function (k, v) { this._m.set(k, String(v)); },
    },
    MutationObserver: class { constructor() {} observe() {} disconnect() {} },
    setTimeout: (fn, ms) => { if (ms === 0) fn(); return 0; },
    saveQuizProgress: () => {},
    console,
  };
  vm.runInNewContext(code, ctx);
  const nav = main.children.find((c) => c.id === "homeDoors");
  const bar = main.children.find((c) => c.id === "doorBar");
  const fab = main.children.find((c) => c.id === "homeFab");
  return {
    main, learnList, gameList, hero, nav, bar, fab, quizPanel,
    tracingCard, learnCard, quizCard, workshopCard, coloringCard, storiesCard,
    door: (id) => nav.querySelectorAll("[data-door]").find((b) => b.dataset.door === id),
    doorIds: () => nav.querySelectorAll("[data-door]").map((b) => b.dataset.door),
    fireBackButton: () => (docListeners.backbutton || []).forEach((fn) => fn()),
  };
}

test("3.2.6 item 9: home has EXACTLY three doors — Lessons, Tests, Games (live stub DOM)", () => {
  const d = runDoors();
  assert.deepEqual(d.doorIds(), ["learn", "quiz", "games"], "home must have exactly 3 doors, no colors door");
  assert.equal(d.door("colors"), undefined, "there must be no colors door to open");
  // Games door shows the workshop + coloring + stories cards, not quizzes.
  d.door("games").click();
  assert.equal(d.workshopCard.style.display, "", "workshop card must show in the Games door");
  assert.equal(d.coloringCard.style.display, "", "coloring card must show in the Games door");
  assert.equal(d.storiesCard.style.display, "", "stories card must show in the Games door");
  assert.equal(d.quizCard.style.display, "none", "quiz card must NOT show in the Games door");
  // Lessons door shows tracing (it used to hang under the colors door).
  d.door("learn").click();
  assert.equal(d.tracingCard.style.display, "", "tracing card must show in the Lessons door");
  assert.equal(d.learnCard.style.display, "", "learn card must show in the Lessons door");
  // Tests door shows only quiz cards.
  d.door("quiz").click();
  assert.equal(d.quizCard.style.display, "", "quiz card must show in the Tests door");
  assert.equal(d.workshopCard.style.display, "none", "workshop card must NOT show in the Tests door");
  assert.equal(d.coloringCard.style.display, "none", "coloring card must NOT show in the Tests door");
});

// ---------- jsdom runtime: stories + coloring (real index.html DOM) ----------
function makeVoice(spoken) {
  return {
    speak(text, lang, onDone) { spoken.push({ fn: "speak", text }); if (typeof onDone === "function") onDone(); return true; },
    speakSequence(list, lang, onDone) { spoken.push({ fn: "speakSequence", list: [...list] }); if (typeof onDone === "function") onDone(); return true; },
    feedback(kind) { spoken.push({ fn: "feedback", kind }); },
    stop() { spoken.push({ fn: "stop" }); },
  };
}
// SVG <g> regions have no .click() in jsdom — dispatch a real click event.
function fireClick(window, el) {
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
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

test("3.2.6 item 5: EVERY story opens at 0 stars — no star gate (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("stories.js"));
    window.eval(read("rescue.js"));
    const doc = window.document;
    const storiesCard = doc.querySelector('[data-stories="1"]');
    assert.ok(storiesCard, "merged stories card must exist in index.html");
    storiesCard.click();
    const cards = [...doc.querySelectorAll("#rescuePlay [data-story], #rescuePlay [data-brave]")];
    assert.equal(cards.length, 7, "picker must list all 7 stories (4 rescue + 3 brave)");
    const lockedLine = window.MatthewBraveStories.LOCKED_LINE;
    for (let i = 0; i < 7; i++) {
      const before = spoken.length;
      [...doc.querySelectorAll("#rescuePlay [data-story], #rescuePlay [data-brave]")][i].click();
      const openedRescue = !doc.querySelector("#rescuePanel").classList.contains("hidden")
        && doc.querySelector("#rescueTitle").textContent !== "اختار مغامرتك يا ملك! 📖";
      const openedBrave = !doc.querySelector("#bravePanel").classList.contains("hidden")
        && (doc.querySelector("#braveTitle").textContent || "").length > 0
        && doc.querySelector("#braveTitle").textContent !== "اختار قصتك يا ملك! 📖";
      assert.ok(openedRescue || openedBrave, "story " + i + " must OPEN at 0 stars, got rescueTitle=" + doc.querySelector("#rescueTitle").textContent + " braveTitle=" + doc.querySelector("#braveTitle").textContent);
      const fresh = spoken.slice(before);
      assert.ok(!fresh.some(s => s.text === lockedLine || (s.list || []).includes(lockedLine)),
        "story " + i + " must NOT speak the locked line at 0 stars");
      // Back to the picker for the next story.
      const back = doc.querySelector("#braveBack") && !doc.querySelector("#bravePanel").classList.contains("hidden")
        ? doc.querySelector("#braveBack") : doc.querySelector("#rescueBack");
      back.click();
      assert.equal(doc.querySelector("#rescueTitle").textContent, "اختار مغامرتك يا ملك! 📖", "back must return to the picker after story " + i);
    }
    // The star display stays (reward/goal), only the gate is gone.
    const html = window.MatthewBraveStories.pickerHTML(0);
    assert.match(html, /محتاج ١٠ نجمة/, "picker still shows the stars goal as a display");
    assert.match(html, /🔒/, "picker still shows the lock as a display");
  } finally {
    window.close();
  }
});

test("3.2.6 item 5: every story also opens with stars (regression, live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("stories.js"));
    window.eval(read("rescue.js"));
    window.localStorage.setItem("matthewStars", "25");
    const doc = window.document;
    doc.querySelector('[data-stories="1"]').click();
    for (let i = 0; i < 7; i++) {
      [...doc.querySelectorAll("#rescuePlay [data-story], #rescuePlay [data-brave]")][i].click();
      const openedRescue = doc.querySelector("#rescueTitle").textContent !== "اختار مغامرتك يا ملك! 📖";
      const openedBrave = (doc.querySelector("#braveTitle").textContent || "") !== "اختار قصتك يا ملك! 📖"
        && (doc.querySelector("#braveTitle").textContent || "").length > 0;
      assert.ok(openedRescue || openedBrave, "story " + i + " must open at 25 stars");
      const back = !doc.querySelector("#bravePanel").classList.contains("hidden")
        ? doc.querySelector("#braveBack") : doc.querySelector("#rescueBack");
      back.click();
    }
  } finally {
    window.close();
  }
});

test("3.2.6 items 8+10: Games coloring card opens the coloring canvas; free + by-numbers modes work (live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("color-games.js"));
    const doc = window.document;
    const workshopCard = doc.querySelector('[data-workshop="1"]');
    const coloringCard = doc.querySelector('[data-coloring="1"]');
    assert.ok(workshopCard, "workshop card must exist in Games");
    assert.ok(coloringCard, "Games coloring card must exist in Games");
    // The coloring card jumps straight to the coloring tab.
    coloringCard.click();
    const panel = doc.querySelector("#colorGamesPanel");
    assert.ok(!panel.classList.contains("hidden"), "coloring card must open the workshop panel");
    const tabs = [...panel.querySelectorAll(".cg-tab")].map(b => b.dataset.tab);
    assert.deepEqual(tabs, ["numbers", "nature", "patterns", "coloring"], "workshop must have 4 tabs incl. coloring");
    assert.ok(panel.querySelector('[data-tab="coloring"]').classList.contains("active"), "coloring tab must be active after the Games coloring card");
    // Gallery: 18 approved raster pages + the crown tap-to-fill page.
    const pages = [...panel.querySelectorAll("[data-page]")];
    assert.equal(pages.length, 19, "gallery must list the registry pages");
    assert.equal(window.MatthewColorPages.length, 19, "registry hook must expose the pages");
    // Page 0: the king raster page — picture + free-paint canvas, no by-numbers.
    assert.ok(panel.querySelector("#cgPaintImg"), "king page must render the picture");
    assert.match(panel.querySelector("#cgPaintImg").getAttribute("src"), /^data:image\/webp;base64,/, "raster pages must be embedded data URIs");
    assert.ok(panel.querySelector("#cgPaintCanvas"), "king page must render a free-paint canvas over the picture");
    assert.equal(panel.querySelector("[data-mode]"), null, "raster pages are free-paint only (no by-numbers without regions)");
    // Expanded palette: many more colors, big swatches.
    const swatches = [...panel.querySelectorAll(".cg-swatch")];
    assert.ok(swatches.length >= 16, "palette must offer many colors, got " + swatches.length);
    assert.ok(swatches.some(b => b.textContent.includes("لون البشرة")), "palette must include a skin tone for coloring people");
    // Every approved raster page opens its picture with the right label.
    const expected = [
      "الملك ماثيو", "الدكتور ماثيو", "المهندس ماثيو", "رجل الإطفاء ماثيو",
      "الطيار ماثيو", "الظابط ماثيو", "رائد الفضاء ماثيو",
      "ماثيو ومارك", "ماثيو وماما", "ماثيو وبابا", "ماثيو ومريم",
      "المدرس ماثيو", "لاعب الكورة ماثيو", "الفلاح ماثيو", "ماثيو والأسد",
      "الطباخ ماثيو", "الصياد ماثيو", "الرسام ماثيو",
    ];
    for (let i = 0; i < expected.length; i++) {
      [...panel.querySelectorAll("[data-page]")][i].click();
      assert.ok(panel.querySelector("#cgPaintImg"), "page " + i + " must render its picture");
      assert.match(panel.querySelector("#cgPaintImg").getAttribute("src"), /^data:image\/webp;base64,/, "page " + i + " must embed its picture");
      assert.match(panel.querySelector(".cg-page-label").textContent, new RegExp(expected[i]), "page " + i + " label must be " + expected[i]);
    }
    // Crown page (last): the tap-to-fill page with the mode choice.
    [...panel.querySelectorAll("[data-page]")][18].click();
    assert.match(panel.querySelector(".cg-page-label").textContent, /تاج الملك/, "crown page label must be written on the page");
    // Mode choice: free is the default.
    const freeBtn = panel.querySelector('[data-mode="free"]');
    const numBtn = panel.querySelector('[data-mode="numbers"]');
    assert.ok(freeBtn && numBtn, "mode choice (free / by-numbers) must be offered");
    assert.ok(freeBtn.classList.contains("active"), "free coloring must be the default mode");
    // FREE mode: any colour fills any region.
    const crownParts = [...panel.querySelectorAll("#cgGame [data-part]")];
    assert.equal(crownParts.length, 6, "crown page must have 6 colorable regions");
    const fillOf = (el) => el.querySelector("polygon, rect, ellipse, path, circle")?.getAttribute("fill");
    const partFill = (i) => fillOf([...panel.querySelectorAll("#cgGame [data-part]")][i]);
    const swatches0 = [...panel.querySelectorAll(".cg-swatch")];
    swatches0[0].click(); // red
    fireClick(window, crownParts[0]);
    assert.equal(partFill(0), "#e53935", "free mode: tapping a region with red selected must fill it red");
    // BY-NUMBERS mode: numbers show, the legend maps number -> colour,
    // a wrong colour is refused, the right colour fills.
    numBtn.click();
    const numbered = [...panel.querySelectorAll("#cgGame [data-part] text")];
    assert.equal(numbered.length, 6, "by-numbers mode must show a number on every region");
    assert.ok(panel.querySelector(".cg-legend"), "by-numbers mode must show the number->colour legend");
    assert.match(panel.querySelector(".cg-legend").textContent, /١ = أحمر/, "legend must map 1 to red");
    const swatches2 = [...panel.querySelectorAll(".cg-swatch")];
    // Part 1 is still white (part 0 was filled red in free mode above);
    // part 1 wants number 2 = blue. Wrong first, then right.
    swatches2[0].click(); // red — wrong for part 1 (wants blue, number 2)
    fireClick(window, [...panel.querySelectorAll("#cgGame [data-part]")][1]);
    assert.equal(partFill(1), "#ffffff", "by-numbers mode: a wrong colour must NOT fill the region");
    assert.match(panel.querySelector("#cgMsg").textContent, /حاول تاني/, "wrong colour must tell the child to try again");
    swatches2[1].click(); // blue — right for part 1
    fireClick(window, [...panel.querySelectorAll("#cgGame [data-part]")][1]);
    assert.equal(partFill(1), "#1e88e5", "by-numbers mode: the right colour must fill the region");
    // Clear resets the page.
    panel.querySelector("#cgClearPage").click();
    assert.equal(partFill(0), "#ffffff", "clear must reset the page to white");
    // The workshop card still opens at the numbers tab by default.
    panel.querySelector("#cgBack").click();
    assert.ok(panel.classList.contains("hidden"), "workshop back must close the panel");
    workshopCard.click();
    assert.ok(!panel.classList.contains("hidden"), "workshop card must reopen the panel");
    assert.ok(panel.querySelector('[data-tab="numbers"]').classList.contains("active"), "workshop card must open at the numbers tab");
  } finally {
    window.close();
  }
});

test("3.2.6 item 10: raster pages render an image + free-paint canvas (registry img path, live jsdom)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("color-games.js"));
    const doc = window.document;
    // Temporary raster page via the registry hook (push path still works).
    window.MatthewColorPages.push({ id: "tmp-raster", name: "صفحة تجريبية", icon: "🖼️", label: "صفحة تجريبية", img: "./icon.svg" });
    doc.querySelector('[data-coloring="1"]').click();
    const panel = doc.querySelector("#colorGamesPanel");
    const pageBtns = [...panel.querySelectorAll("[data-page]")];
    assert.equal(pageBtns.length, 20, "gallery must list the pushed raster page too");
    pageBtns[19].click();
    assert.ok(panel.querySelector("#cgPaintImg"), "raster page must render the picture");
    assert.equal(panel.querySelector("#cgPaintImg").getAttribute("src"), "./icon.svg");
    assert.ok(panel.querySelector("#cgPaintCanvas"), "raster page must render a free-paint canvas over the picture");
    assert.equal(panel.querySelector("[data-mode]"), null, "raster pages are free-paint only (no by-numbers without regions)");
    window.MatthewColorPages.pop();
  } finally {
    window.close();
  }
});
