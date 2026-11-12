// Round 3.2.2 P2 — quiz resume + mixed-card entry point.
//
// Runs the REAL app.js (start/showQuestion/choose/finish, save/load/clear
// progress) in a stub DOM / vm context, not string matches: the point is
// the behaviour — leave mid-quiz, come back, and the SAME question set
// continues at the SAME question with the SAME score.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

// ---------- bank (for finding the correct answer of a shown question) ------
const bankSrc = read("app.js");
const bankCtx = {};
vm.runInNewContext(
  bankSrc.slice(bankSrc.indexOf("const bank="), bankSrc.indexOf("\nconst names="))
  + "\nglobalThis.bank = bank;",
  bankCtx,
);
const BANK = bankCtx.bank;
const foldDigits = (s) => String(s || "").replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c));
const bankByQ = new Map(); // norm question text -> { cats: Set, correct: Set }
for (const [cat, qs] of Object.entries(BANK)) {
  for (const q of qs) {
    const key = foldDigits(q.q);
    if (!bankByQ.has(key)) bankByQ.set(key, { cats: new Set(), correct: new Set() });
    bankByQ.get(key).cats.add(cat);
    bankByQ.get(key).correct.add(q.a[q.c]);
  }
}
function correctFor(shownText) {
  const entry = bankByQ.get(foldDigits(shownText));
  assert.ok(entry, "shown question not in the bank: " + shownText);
  assert.equal(entry.correct.size, 1, "ambiguous correct answer for: " + shownText);
  return [...entry.correct][0];
}
function categoriesFor(shownText) {
  const entry = bankByQ.get(foldDigits(shownText));
  return entry ? [...entry.cats] : [];
}

// ---------- stub DOM (same shape as tests/round322.test.js) -----------------
function makeEl(tag) {
  const e = {
    tagName: tag, id: "", children: [], style: {}, dataset: {},
    textContent: "", parentElement: null, _cls: new Set(), _listeners: {},
  };
  Object.defineProperty(e, "className", {
    get: () => [...e._cls].join(" "),
    set: (v) => { e._cls = new Set(String(v || "").split(/\s+/).filter(Boolean)); },
  });
  e.classList = {
    add: (...cs) => cs.forEach((c) => e._cls.add(c)),
    remove: (...cs) => cs.forEach((c) => e._cls.delete(c)),
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
  e.replaceChildren = (...cs) => { e.children = []; cs.forEach((c) => e.appendChild(c)); };
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
  // Bubbling click: the gameList handler listens on the parent, so a card
  // click must travel up with the original target.
  e.click = () => {
    const ev = { target: e };
    let n = e;
    while (n) { (n._listeners.click || []).forEach((fn) => fn(ev)); n = n.parentElement; }
  };
  e.closest = (sel) => {
    let n = e;
    while (n) {
      if (sel === "#gameList" && n.id === "gameList") return n;
      if (sel === "#learningList" && n.id === "learningList") return n;
      if (sel === "[data-category]" && n.dataset && n.dataset.category) return n;
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

function runApp() {
  const storage = {
    _m: new Map(),
    getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
    setItem(k, v) { this._m.set(k, String(v)); },
    removeItem(k) { this._m.delete(k); },
  };
  const main = makeEl("main");
  const hero = makeEl("div");
  const learnList = makeEl("section"); learnList.id = "learningList";
  const gameList = makeEl("section"); gameList.id = "gameList";
  const quizPanel = makeEl("section"); quizPanel.id = "quiz";
  quizPanel.classList.add("quiz-panel"); quizPanel.classList.add("hidden");
  const resultPanel = makeEl("section"); resultPanel.id = "result";
  resultPanel.classList.add("result-panel"); resultPanel.classList.add("hidden");
  main.appendChild(learnList); main.appendChild(gameList);
  main.appendChild(quizPanel); main.appendChild(resultPanel);
  const learnCard = makeEl("button"); learnCard.textContent = "الحروف العربية";
  learnList.appendChild(learnCard);
  const seedCard = (dataset, text) => {
    const c = makeEl("button");
    Object.assign(c.dataset, dataset); c.textContent = text;
    gameList.appendChild(c); return c;
  };
  const storiesCard = seedCard({ stories: "1" }, "قصص ومغامرات الملك");
  const cards = {
    numbers: seedCard({ category: "numbers" }, "عالم الأرقام"),
    letters: seedCard({ category: "letters" }, "حروف وكلمات"),
    colors: seedCard({ category: "colors" }, "الألوان والأشكال"),
    world: seedCard({ category: "world" }, "معلومات ممتعة"),
    science: seedCard({ category: "science" }, "اختبار العلوم والكون"),
    mixed: seedCard({ category: "mixed" }, "اختبار المفاجآت"),
  };
  const byId = {};
  const el = (id) => (byId[id] ||= makeEl("div"));
  for (const id of ["gameList", "learningList", "quiz", "result", "categoryName",
    "questionEmoji", "questionText", "questionCount", "progressBar", "feedback",
    "voiceStatus", "nextBtn", "replayBtn", "answers", "backBtn", "homeBtn", "againBtn",
    "installBtn", "totalStars", "totalPoints", "totalTrophies", "bestScore",
    "resultText", "resultStars"]) {
    byId[id] = { gameList, learningList: learnList, quiz: quizPanel, result: resultPanel }[id] || makeEl("div");
    byId[id].id = id;
  }
  const answersEl = byId.answers;
  answersEl.parentElement = quizPanel; quizPanel.children.push(answersEl);
  const sections = [learnList, gameList, quizPanel, resultPanel];
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
        return sections.filter((s) => ["quiz-panel", "academy-panel", "result-panel"]
          .some((c) => s.classList.contains(c)));
      }
      if (sel === ".answer") {
        return answersEl.children.filter((c) => c.classList.contains("answer"));
      }
      return [];
    },
    getElementById: (id) => byId[id] || null,
    createElement: (tag) => makeEl(tag),
    addEventListener: (ev, fn) => { (docListeners[ev] = docListeners[ev] || []).push(fn); },
  };
  const voiceCalls = [];
  const ctx = {
    document: documentStub,
    navigator: {},
    localStorage: storage,
    MutationObserver: class { constructor() {} observe() {} disconnect() {} },
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    console,
    MatthewVoice: {
      speak: (t) => voiceCalls.push(["speak", t]),
      speakSequence: (ts) => voiceCalls.push(["sequence", ts]),
      feedback: (k) => voiceCalls.push(["feedback", k]),
      stop: () => voiceCalls.push(["stop"]),
    },
  };
  ctx.window = ctx;
  ctx.window.addEventListener = () => {};
  ctx.window.scrollTo = () => {};
  vm.createContext(ctx);
  vm.runInContext(read("app.js"), ctx);
  assert.equal(typeof ctx.start, "function", "app.js must expose start() in the vm");
  const answerCorrectly = () => {
    const q = byId.questionText.textContent;
    const correct = correctFor(q);
    const btn = answersEl.children.find((b) => b.dataset.answer === correct);
    assert.ok(btn, "no answer button for the correct answer of: " + q);
    btn.click();
  };
  return {
    ctx, storage, byId, answersEl, cards, storiesCard, voiceCalls,
    start: (cat) => ctx.start(cat),
    questionCount: () => byId.questionCount.textContent,
    questionText: () => byId.questionText.textContent,
    answerCorrectly,
    next: () => byId.nextBtn.click(),
    back: () => byId.backBtn.click(),
    saved: (cat) => {
      const raw = storage.getItem("matthewQuizProgress:" + cat);
      return raw ? JSON.parse(raw) : null;
    },
  };
}

// ---------- P2: quiz resume -------------------------------------------------
test("P2: leaving mid-quiz and re-entering the SAME quiz resumes the exact question and score", () => {
  const t = runApp();
  t.start("numbers");
  assert.equal(t.questionCount(), "١ / ١٠");
  assert.equal(t.byId.categoryName.textContent, "عالم الأرقام");
  // Answer Q1 correctly, move to Q2, remember it, then leave.
  t.answerCorrectly(); t.next();
  assert.equal(t.questionCount(), "٢ / ١٠");
  const q2 = t.questionText();
  t.back();
  const saved = t.saved("numbers");
  assert.ok(saved, "back must save progress");
  assert.equal(saved.index, 1);
  assert.equal(saved.score, 1);
  assert.equal(saved.questions.length, 10);
  // Re-enter the same quiz: the SAME set, the SAME second question.
  t.start("numbers");
  assert.equal(t.questionCount(), "٢ / ١٠");
  assert.equal(t.questionText(), q2, "resume must show the saved question, not a fresh pick");
  // Finish the remaining 9 questions correctly: 1 (saved) + 9 = 10/10,
  // which proves the saved score carried over (a reset would give 9/10).
  for (let i = 0; i < 9; i++) { t.answerCorrectly(); t.next(); }
  assert.ok(!t.byId.result.classList.contains("hidden"), "result panel must show after the last question");
  assert.match(t.byId.resultText.textContent, /١٠ من ١٠/, "score must include the pre-exit correct answer, got: " + t.byId.resultText.textContent);
  // A finished quiz never resurrects: the slot is cleared and the next
  // start is a fresh round from question 1.
  assert.equal(t.saved("numbers"), null, "finish() must clear the saved progress");
  t.start("numbers");
  assert.equal(t.questionCount(), "١ / ١٠");
});

test("P2: resume is per-category — leaving one quiz for another keeps both", () => {
  const t = runApp();
  t.start("numbers");
  t.answerCorrectly(); t.next();
  t.back();
  assert.equal(t.saved("numbers").index, 1);
  // A different quiz starts fresh, and leaving it saves ITS slot only.
  t.start("letters");
  assert.equal(t.questionCount(), "١ / ١٠");
  t.back();
  assert.equal(t.saved("letters").index, 0);
  // The numbers resume survived the detour.
  assert.equal(t.saved("numbers").index, 1);
  t.start("numbers");
  assert.equal(t.questionCount(), "٢ / ١٠");
});

test("P2: corrupt or stale saved progress is ignored — the child always gets a fresh quiz, never a crash", () => {
  const t = runApp();
  t.storage.setItem("matthewQuizProgress:world", "not-json{{{");
  t.start("world");
  assert.equal(t.questionCount(), "١ / ١٠");
  t.back();
  // Index past the end of the saved set.
  t.storage.setItem("matthewQuizProgress:world", JSON.stringify({
    category: "world", questions: BANK.world.slice(0, 10), index: 99, score: 0,
  }));
  t.start("world");
  assert.equal(t.questionCount(), "١ / ١٠");
  // Malformed question entries.
  t.storage.setItem("matthewQuizProgress:world", JSON.stringify({
    category: "world", questions: [{ q: "x", a: ["a", "b"], c: 0 }], index: 0, score: 0,
  }));
  t.start("world");
  assert.equal(t.questionCount(), "١ / ١٠");
  // A save for a DIFFERENT category must not resume this one.
  t.storage.setItem("matthewQuizProgress:world", JSON.stringify({
    category: "science", questions: BANK.science.slice(0, 10), index: 2, score: 2,
  }));
  t.start("world");
  assert.equal(t.questionCount(), "١ / ١٠");
});

// ---------- P2: mixed card --------------------------------------------------
test("P2: the mixed card opens the mixed surprise quiz, drawing from every bank", () => {
  const html = read("index.html");
  assert.ok(html.includes('data-category="mixed"'), "home must have the mixed card");
  const t = runApp();
  t.cards.mixed.click();
  assert.equal(t.byId.categoryName.textContent, "اختبار المفاجآت");
  assert.ok(!t.byId.quiz.classList.contains("hidden"), "quiz panel must open from the mixed card");
  assert.equal(t.questionCount(), "١ / ١٠");
  // The mixed round draws from ALL banks, not one category: over 30 fresh
  // starts the first questions must span at least two categories.
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    t.storage.removeItem("matthewQuizProgress:mixed");
    t.start("mixed");
    for (const c of categoriesFor(t.questionText())) seen.add(c);
  }
  assert.ok(seen.size >= 2, "mixed questions must come from several categories, got: " + [...seen].join(", "));
});
