// Round 3.2.2 regression tests — the fixes the 3.2.1 live review found.
// These run the REAL code (classify, apply/initHomeDoors, keyFor, makeQuiz,
// quizPic) in a stub DOM / vm context, not just string matches: the 3.2.1
// chess test passed on a comment, so every test here executes behaviour.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

// ---------- P0-1: classify() sends every dynamically added card to the right door ----------
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

test("P0-1: classify() sends EVERY dynamically added card to the right door", () => {
  // The 3.2.1 live bug: the chess card fell into closest("#gameList") -> "quiz".
  assert.equal(classify(fakeCard({ chess: "1" }, true)), "games", "chess card must be Games");
  assert.equal(classify(fakeCard({ memory: "1" }, true)), "games", "memory card must be Games");
  assert.equal(classify(fakeCard({ workshop: "1" }, true)), "games", "workshop card must be Games");
  assert.equal(classify(fakeCard({ stories: "1" }, true)), "games", "stories card must be Games");
  assert.equal(classify(fakeCard({ braveStories: "1" }, true)), "games", "brave-stories card must be Games");
  // Inverted fallback: a card in #gameList WITH a category is a quiz...
  assert.equal(classify(fakeCard({ category: "numbers" }, true)), "quiz");
  // ...without one it is a game, never a quiz (the old fallback bug).
  assert.equal(classify(fakeCard({}, true)), "games");
  // Learning cards outside #gameList stay in the learn door.
  assert.equal(classify(fakeCard({}, false)), "learn");
  assert.equal(classify(fakeCard({ category: "letters" }, false)), "learn");
  // Text-based rules still work.
  assert.equal(classify(fakeCard({}, false, "لوحة ولي الأمر")), "parent");
  assert.equal(classify(fakeCard({}, false, "اكتب بإصبعك")), "colors");
  assert.equal(classify(fakeCard({}, false, "التوصيل واسمع")), "games");
});

// ---------- P0-2: live-DOM door visibility (stub DOM driving the real initHomeDoors) ----------
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
  const learnCard = makeEl("button"); learnList.appendChild(learnCard);
  const quizCard = makeEl("button"); quizCard.dataset.category = "numbers"; gameList.appendChild(quizCard);
  const chessCard = makeEl("button"); chessCard.dataset.chess = "1"; gameList.appendChild(chessCard);
  const storiesCard = makeEl("button"); storiesCard.dataset.stories = "1"; gameList.appendChild(storiesCard);
  // One activity panel, as the quiz would open it.
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
  let stopCalls = 0;
  const ctx = {
    document: documentStub,
    window: {
      scrollTo: () => {},
      addEventListener: () => {},
      MatthewVoice: { stop: () => { stopCalls++; } },
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
    learnCard, quizCard, chessCard, storiesCard,
    door: (id) => nav.querySelectorAll("[data-door]").find((b) => b.dataset.door === id),
    fireBackButton: () => (docListeners.backbutton || []).forEach((fn) => fn()),
    stopCalls: () => stopCalls,
  };
}

test("P0-2: door visibility — quiz/game + back leaves the lessons list visible (live stub DOM)", () => {
  const d = runDoors();
  const sync = () => {
    for (const l of [d.learnList, d.gameList]) {
      assert.equal(
        l.classList.contains("hidden"), l.style.display === "none",
        "hidden class and display must stay in sync for " + l.id,
      );
    }
  };
  // Home: no door open, both lists hidden, doors shown, FAB hidden.
  sync();
  assert.ok(d.learnList.classList.contains("hidden"));
  assert.equal(d.fab.style.display, "none");
  // Open the quiz door: gameList visible, chess card hidden inside it.
  d.door("quiz").click(); sync();
  assert.ok(!d.gameList.classList.contains("hidden"), "gameList must be visible with the quiz door open");
  assert.ok(d.learnList.classList.contains("hidden"));
  assert.equal(d.quizCard.style.display, "", "quiz card must show in the quiz door");
  assert.equal(d.chessCard.style.display, "none", "chess card must NOT show in the quiz door");
  // Open the games door: chess card shown, quiz card hidden.
  d.door("games").click(); sync();
  assert.equal(d.chessCard.style.display, "", "chess card must show in the games door");
  assert.equal(d.quizCard.style.display, "none");
  // Simulate an activity: the quiz panel opens and both lists hide (start()).
  d.quizPanel.classList.remove("hidden");
  d.learnList.classList.add("hidden"); d.gameList.classList.add("hidden");
  d.main.click(); sync(); // MutationObserver path -> apply()
  assert.equal(d.fab.style.display, "", "FAB must show while an activity is open");
  assert.ok(d.nav.style.display === "none", "doors must hide while an activity is open");
  // Go home via the unified 🏠 FAB: panels hide, audio stops, home returns.
  const stopsBefore = d.stopCalls();
  d.fab.click(); sync();
  assert.ok(d.stopCalls() > stopsBefore, "FAB must stop audio (P0-8)");
  assert.ok(d.quizPanel.classList.contains("hidden"), "activity panel must hide on goHome");
  assert.notEqual(d.nav.style.display, "none", "doors must return on home");
  // THE 3.2.1 BUG, live: open the lessons door after quiz + back — the list
  // must actually be visible (hidden class and display in sync).
  d.door("learn").click(); sync();
  assert.ok(!d.learnList.classList.contains("hidden"), "learningList must be visible with the learn door open after quiz + back");
  assert.equal(d.learnCard.style.display, "", "learn card must show in the learn door");
  // Android back button closes the door back to home.
  d.fireBackButton(); sync();
  assert.ok(d.learnList.classList.contains("hidden"), "back button must close the door");
  assert.notEqual(d.nav.style.display, "none", "back button must return to the doors");
});

test("P0-2/P0-8: every back/close handler unhides the lists and stops audio", () => {
  const app = read("app.js");
  // Main quiz back + home buttons: both lists, token bump, stop.
  assert.ok(!app.slice(app.indexOf('$("backBtn")'), app.indexOf('$("homeBtn")')).includes("learningList"),
    "quiz backBtn must not touch learningList (hierarchical back: quiz door only)");
  assert.ok(app.slice(app.indexOf('$("homeBtn")')).includes('$("learningList")?.classList.remove("hidden")'),
    "homeBtn must unhide learningList (it returns to home)");
  assert.match(app, /homeBtn.*MatthewVoice\?\.stop\(\)/, "homeBtn must stop audio");
  // Hierarchical back (round 3.2.1 note 16): a game back returns to its
  // immediate parent (the Games section) and must NOT touch the lessons
  // list — apply() (single owner of visibility) re-derives the lists from
  // the open door + panel visibility. The rescue close() is the exception
  // the review named explicitly (its fifth leak): it keeps its removal.
  // (scoped to the back/close function bodies — the openers legitimately
  // hide the lists when an activity starts.)
  const memBack = read("memory-game.js");
  assert.ok(!memBack.slice(memBack.indexOf("function back()"), memBack.indexOf("function header()")).includes("learningList"),
    "memory back() must not touch learningList");
  const cg = read("color-games.js");
  assert.ok(!cg.slice(cg.indexOf("function close()"), cg.indexOf("function renderPanel()")).includes("learningList"),
    "colour-games close() must not touch learningList");
  assert.match(read("rescue.js"), /learningList"\)\?\.classList\.remove\("hidden"\)/,
    "rescue close() must unhide learningList (review P0-2 fifth leak)");
  // Touch games back() (interactive-games.js): returns to the games
  // section only, and stops audio.
  const touch = read("interactive-games.js");
  const backFn = touch.slice(touch.indexOf("function back(){", touch.indexOf("mode=\"match\"")));
  assert.ok(!backFn.includes("learningList"), "touch back() must not touch learningList");
  assert.match(backFn, /gameList\.classList\.remove\("hidden"\)/, "touch back() must return to the games section");
  assert.match(backFn, /MatthewVoice\?\.stop\(\)/, "touch back() must stop audio");
  // The unified 🏠 FAB exists and the Android backbutton handler exists.
  assert.match(app, /id = "homeFab"/, "unified home FAB must exist");
  assert.match(app, /addEventListener\("backbutton"/, "Android backbutton handler must exist");
});

// ---------- P0-5: Arabic-digit resolution (keyFor, with the builder's real maps) ----------
test("P0-5: a digit resolves to the Arabic clip in Arabic context, English only in English", () => {
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const norm = (s) => String(s || "")
    .replace(/[٠-٩]/g, (c) => DIGITS[c])
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[^ء-يa-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim().toLowerCase();
  // Rebuild BY_TEXT / EXACT exactly as build-voice-clips.py does.
  const normTexts = {};
  for (const e of corpus) {
    const n = norm(e.text);
    (normTexts[n] = normTexts[n] || new Set()).add(e.text.trim());
  }
  const byText = {}; const exact = {};
  for (const e of corpus) {
    byText[norm(e.text)] = e.key;
    if (normTexts[norm(e.text)].size > 1) exact[e.text.trim()] = e.key;
  }
  const vcSrc = read("voice-clips.js");
  const keyForSrc = vcSrc.slice(vcSrc.indexOf("const DIGITS"), vcSrc.indexOf("const play = (text, lang)"));
  const ctx = { BY_TEXT: byText, EXACT: exact, console };
  vm.runInNewContext(keyForSrc + "\nglobalThis.keyFor = keyFor;", ctx);
  const keyFor = ctx.keyFor;
  // The numbers trap, fixed: Latin "5" in Arabic context must NOT be English.
  assert.equal(keyFor("5", "ar-EG"), "tr_num_5", "Latin 5 in Arabic must resolve to the Arabic clip");
  assert.equal(keyFor("٥", "ar-EG"), "tr_num_5", "Arabic ٥ must resolve to the Arabic clip");
  assert.equal(keyFor("5", "en-US"), "tr_ennum_5", "Latin 5 in English keeps the English clip");
  assert.equal(keyFor("1", "en-US"), "tr_ennum_1");
  // New digit clips (3.2.2): 15/18/19/20/0 resolve, no swaps.
  assert.equal(keyFor("15", "ar-EG"), "num_digit_15");
  assert.equal(keyFor("١٥", "ar-EG"), "num_digit_15");
  assert.equal(keyFor("18", "ar-EG"), "num_digit_18");
  assert.equal(keyFor("19", "ar-EG"), "num_digit_19");
  assert.equal(keyFor("20", "ar-EG"), "num_digit_20");
  assert.equal(keyFor("0", "ar-EG"), "num_digit_0");
  assert.equal(keyFor("11", "ar-EG"), "ans_34", "١١ resolves to the re-recorded ١١ clip");
});

// ---------- P0-6: letter quiz — no duplicate correct answer, every answer has a picture ----------
test("P0-6: letter quiz never offers the correct answer twice, and every answer has a picture", () => {
  const lesSrc = read("lessons.js");
  const sliceDecl = (marker) => {
    const s = lesSrc.indexOf(marker);
    return lesSrc.slice(s, lesSrc.indexOf("];", s) + 2);
  };
  const lessonsDecl = sliceDecl("const lessons = [");
  const marksDecl = sliceDecl("const marks = [");
  const mqStart = lesSrc.indexOf("function makeQuiz(){");
  const makeQuizSrc = lesSrc.slice(mqStart, lesSrc.indexOf("\n  }\n", mqStart) + 5);
  const qpStart = lesSrc.indexOf("const quizPicMap = {};");
  const qpSrc = lesSrc.slice(qpStart, lesSrc.indexOf("  };\n", lesSrc.indexOf("const quizPic = a => {")) + 5);
  const ctx = { Math, console };
  ctx.showQuiz = () => { ctx.captured = ctx.quiz; };
  // Round 3.2.5 FAIL 2: makeQuiz() resets panel.dataset.finished — stub
  // the letterSchool panel, as in tests/round324.test.js.
  ctx.panel = { dataset: {} };
  // Round 3.2.3 item 13: makeQuiz() pushes a history sub-screen via the
  // module-level pushSub() — stub it here; this test exercises the quiz
  // generation, not navigation.
  vm.runInNewContext(
    "const pushSub = () => {};\n" + lessonsDecl + "\n" + marksDecl + "\n" + makeQuizSrc + "\n" + qpSrc
    + "\nglobalThis.lessons = lessons; globalThis.quizPic = quizPic;\nmakeQuiz();",
    ctx,
  );
  const quiz = ctx.captured;
  assert.equal(quiz.length, 10, "quiz is 10 questions");
  for (const q of quiz) {
    assert.equal(new Set(q.a).size, q.a.length,
      "duplicate options in: " + q.q + " — " + q.a.join(" / "));
    assert.equal(q.a.filter((a) => a === q.a[q.c]).length, 1,
      "correct answer appears more than once: " + q.q + " — " + q.a.join(" / "));
  }
  // Every letter name and form resolves to a real picture, never the 🔤 fallback.
  for (const l of ctx.lessons) {
    assert.notEqual(ctx.quizPic(l.name), "🔤", "no picture for letter name " + l.name);
    for (const f of l.forms) {
      assert.notEqual(ctx.quizPic(f), "🔤", "no picture for form " + f + " of " + l.name);
    }
  }
  // The old dead-map cases, fixed by the audit: ر is the feather, هـ the gift.
  assert.equal(ctx.quizPic("الراء"), "🪶");
  assert.equal(ctx.quizPic("الهاء"), "🎁");
  assert.equal(ctx.quizPic("ر"), "🪶");
  assert.equal(ctx.quizPic("هـ"), "🎁");
});

// ---------- P0-7: no rainbow anywhere ----------
test("P0-7: no rainbow anywhere in app sources, corpus or clips manifest", () => {
  const hits = [];
  const pat = /🌈|قوس قزح|sciRainbow|sci-rainbow/i;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (["tests", "android", "node_modules", ".git"].includes(e.name)) continue;
        walk(p);
      } else if (/\.(js|json|html|css|py)$/.test(e.name)) {
        // Generated voice packs are rebuilt in Wave B after re-recording;
        // they still hold the stale 3.2.1 clips until then.
        if (/voice-clips-(pack|text|data)-\d+\.js$/.test(e.name)) continue;
        if (pat.test(fs.readFileSync(p, "utf8"))) hits.push(path.relative(root, p));
      }
    }
  };
  walk(root);
  assert.deepEqual(hits, [], "rainbow found in: " + hits.join(", "));
  // And the corpus itself: no rainbow key or text.
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  assert.equal(corpus.filter((e) => /قوس|🌈/i.test(e.key + " " + e.text)).length, 0,
    "corpus must not mention the rainbow");
  assert.ok(corpus.some((e) => e.text.includes("الشمس بتطلع منين الصبح؟")),
    "the sunrise question that replaces the rainbow question must be in the corpus");
});
