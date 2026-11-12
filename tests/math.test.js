// tests/math.test.js — Round 3.2.1: math journeys (Arabic + English).
// Covers the picker, the degenerate-question fixes (L1 T5, L20 T1/T2),
// q-alone corpus coverage, the listen button, and finish narration.
// The journey files are IIFEs, so each is run in a vm with a stub DOM and
// the questions() function is exported by patching the closing `})();`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

// --- minimal DOM stub -------------------------------------------------------
function makeClassList() {
  const set = new Set();
  return {
    add: (...c) => c.forEach((x) => set.add(x)),
    remove: (...c) => c.forEach((x) => set.delete(x)),
    contains: (c) => set.has(c),
    toggle: (c, f) => (f === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : f ? set.add(c) : set.delete(c)),
  };
}
function makeEl() {
  const el = {
    innerHTML: "",
    textContent: "",
    style: {},
    dataset: {},
    disabled: false,
    _children: [],
    _qsCache: new Map(),
    _qsaCache: new Map(),
    classList: makeClassList(),
    append(child) { this._children.push(child); },
    insertBefore() {},
    addEventListener() {},
    querySelector(sel) {
      if (!this._qsCache.has(sel)) this._qsCache.set(sel, makeEl());
      return this._qsCache.get(sel);
    },
    // Parses the current innerHTML so the test clicks the same fake buttons
    // the journey code wired up. Cached per innerHTML string.
    querySelectorAll(sel) {
      const key = sel + "\n" + this.innerHTML;
      if (this._qsaCache.has(key)) return this._qsaCache.get(key);
      let out = [];
      if (sel === "[data-level]") {
        out = [...this.innerHTML.matchAll(/data-level="(\d+)"/g)].map((m) => {
          const b = makeEl();
          b.dataset.level = m[1];
          return b;
        });
      } else if (sel === "[data-value]") {
        out = [...this.innerHTML.matchAll(/data-value="(\d+)"/g)].map((m) => {
          const b = makeEl();
          b.dataset.value = m[1];
          return b;
        });
      }
      this._qsaCache.set(key, out);
      return out;
    },
  };
  return el;
}
function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
function loadJourney(file) {
  const els = {};
  const getEl = (id) => (els[id] ||= makeEl());
  const mainEl = makeEl();
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    localStorage: makeStorage(),
    document: {
      getElementById: getEl,
      querySelector: (sel) => (sel === "main" ? mainEl : getEl(sel)),
      createElement: () => makeEl(),
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const src = read(file).trimEnd().replace(/}\)\(\);$/, ";globalThis.__questions = questions; globalThis.__panel = panel; })();");
  assert.ok(src.includes("__questions"), file + " did not end with })(); as expected");
  vm.runInContext(src, sandbox);
  const learningList = getEl("learningList");
  const card = learningList._children[0];
  assert.ok(card && typeof card.onclick === "function", file + " did not register a card");
  return { sandbox, panel: sandbox.__panel, questions: sandbox.__questions, card, getEl };
}

// Collect every distinct question template questions(n) can produce
// (it shuffles 6 templates and returns 4, so sweep many times).
function collect(questions, n, sweeps = 300) {
  const byQ = new Map();
  for (let i = 0; i < sweeps; i++) {
    for (const q of questions(n)) {
      assert.equal(q.a.length, 4, `level ${n}: four choices`);
      assert.ok(q.a.includes(q.correct), `level ${n}: correct answer among choices`);
      assert.equal(new Set(q.a).size, 4, `level ${n}: distinct choices`);
      if (!byQ.has(q.q)) byQ.set(q.q, q);
    }
  }
  assert.equal(byQ.size, 6, `level ${n}: all 6 templates reachable`);
  return byQ;
}

// --- corpus: evaluate build-corpus.js sections 1-8 only (no file write) ----
function loadCorpusSections() {
  const src = read("build-corpus.js");
  const cut = src.indexOf("// 9)");
  assert.ok(cut > 0, "section 9 marker missing in build-corpus.js");
  const sandbox = {
    console: { log() {} },
    __dirname: root,
    require: (name) => ({ fs, path, vm })[name] || require(name),
  };
  vm.createContext(sandbox);
  vm.runInContext(src.slice(0, cut) + ";globalThis.__corpus = [...corpus.values()];", sandbox);
  return sandbox.__corpus;
}

const EN = () => loadJourney("math-english.js");
const AR = () => loadJourney("math-journey.js");

test("picker renders 20 levels and back returns to the picker, then home", () => {
  const { panel, card, getEl } = EN();
  card.onclick();
  assert.match(panel.innerHTML, /اختار رقم يا ملك ماثيو/);
  const tiles = panel.querySelectorAll("[data-level]");
  assert.equal(tiles.length, 20);
  // tile 5 shows its Latin digit, English name and icon
  assert.match(panel.innerHTML, /<b>5<\/b><small>five/);
  assert.match(panel.innerHTML, /<b>20<\/b><small>twenty/);
  // open a lesson, then back goes to the picker (not home)
  tiles[4].onclick();
  assert.match(panel.innerHTML, /<h2>five<\/h2>/);
  assert.match(panel.innerHTML, /يلا نعد مع بعض/);
  panel.querySelector("#englishMathBack").onclick();
  assert.match(panel.innerHTML, /اختار رقم يا ملك ماثيو/);
  assert.equal(panel.querySelectorAll("[data-level]").length, 20);
  // back from the picker goes home
  panel.querySelector("#englishMathBack").onclick();
  assert.ok(panel.classList.contains("hidden"), "panel hidden after picker back");
  assert.ok(!getEl("gameList").classList.contains("hidden"), "game list shown again");
});

test("English journey: degenerate questions fixed (L1 T5, L20 T1/T2)", () => {
  const { questions } = EN();
  const l1 = collect(questions, 1);
  const t5 = [...l1.values()].find((q) => q.q.startsWith("إيه الرقم الأكبر"));
  assert.equal(t5.q, "إيه الرقم الأكبر: 1 ولا 2؟");
  assert.equal(t5.correct, 2);
  assert.equal(t5.ex, "الرقم الأكبر هو 2.");
  assert.ok(![...l1.keys()].some((q) => q.includes("1 ولا 1")), "no 1-vs-1 question");

  const l20 = collect(questions, 20);
  const after = [...l20.values()].find((q) => q.q.startsWith("إيه الرقم اللي بعد"));
  assert.equal(after.q, "إيه الرقم اللي بعد 19؟");
  assert.equal(after.correct, 20);
  assert.equal(after.ex, "بعد nineteen بييجي twenty.");
  const before = [...l20.values()].find((q) => q.q.startsWith("إيه الرقم اللي قبل"));
  assert.equal(before.q, "إيه الرقم اللي قبل 20؟");
  assert.equal(before.correct, 19);
  assert.equal(before.ex, "قبل twenty بييجي nineteen.");
});

test("Arabic journey: degenerate questions fixed (L1 T5, L20 T1/T2)", () => {
  const { questions } = AR();
  const l1 = collect(questions, 1);
  const t5 = [...l1.values()].find((q) => q.q.startsWith("اختار العدد الأكبر"));
  assert.equal(t5.q, "اختار العدد الأكبر: ١ ولا ٢");
  assert.equal(t5.correct, 2);
  assert.equal(t5.ex, "العدد الأكبر هو ٢.");

  const l20 = collect(questions, 20);
  const after = [...l20.values()].find((q) => q.q.startsWith("إيه الرقم اللي بعد"));
  assert.equal(after.q, "إيه الرقم اللي بعد ١٩؟");
  assert.equal(after.correct, 20);
  assert.equal(after.ex, "بعد تسعتاشر بييجي عشرين.");
  const before = [...l20.values()].find((q) => q.q.startsWith("إيه الرقم اللي قبل"));
  assert.equal(before.q, "إيه الرقم اللي قبل ٢٠؟");
  assert.equal(before.correct, 19);
  assert.equal(before.ex, "قبل عشرين بييجي تسعتاشر.");
});

test("math questions are well-formed at every level, both journeys", () => {
  for (const load of [EN, AR]) {
    const { questions } = load();
    for (let n = 1; n <= 20; n++) {
      for (let i = 0; i < 50; i++) {
        for (const q of questions(n)) {
          assert.equal(q.a.length, 4);
          assert.ok(q.a.every((v) => Number.isInteger(v) && v >= 1 && v <= 20));
          assert.ok(q.a.includes(q.correct));
        }
      }
    }
  }
});

test("q-alone runtime strings are covered by corpus entries in build-corpus.js", () => {
  const corpus = loadCorpusSections();
  const byKey = new Map(corpus.map((e) => [e.key, e]));
  // The clip runtime resolves EXACT[trim] || BY_TEXT[norm(text)] (see
  // voice-clips.js), and norm folds Arabic-Indic digits to Latin ones —
  // so an English-journey q-alone string whose only difference from the
  // Arabic one is digit script resolves to the earlier (Arabic) clip,
  // which pronounces identically. Coverage is therefore checked by norm,
  // the same dedupe the corpus builder itself applies.
  const DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const norm = (s) => String(s || "").replace(/[٠-٩]/g, (c) => DIGITS[c]).replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const norms = new Set(corpus.map((e) => norm(e.text)));
  // §6: English number lines are now the Arabic hint; listen lines unchanged
  assert.equal(byKey.get("num_en_0").text, "ده رقم one. يلا نعد مع بعض!");
  assert.equal(byKey.get("num_en_0").lang, "ar_EG");
  assert.equal(byKey.get("num_en_l_0").text, "Number one. 1");
  assert.equal(byKey.get("num_en_tip").text, "عدّ كل صورة مرة واحدة. آخر رقم تقوله هو المجموع.");
  assert.equal(byKey.get("num_ar_tip").text, "كل صورة بنعدّها مرة واحدة. آخر رقم بنقوله هو عدد الصور كلها.");
  // §8: every runtime question string (q alone) and every composed
  // q + " " + ex string has a corpus entry, both journeys, all levels.
  assert.equal(byKey.get("math_en_q1_5").text, "إيه الرقم الأكبر: 1 ولا 2؟ الرقم الأكبر هو 2.");
  for (const load of [EN, AR]) {
    const { questions } = load();
    for (let n = 1; n <= 20; n++) {
      for (const q of collect(questions, n, 60).values()) {
        assert.ok(norms.has(norm(q.q)), `missing q-alone corpus entry for: ${q.q}`);
        assert.ok(norms.has(norm(q.q + " " + q.ex)), `missing composed corpus entry for: ${q.q}`);
      }
    }
  }
});

test("question screens have the listen button and a full quiz reaches finish", () => {
  const src = read("math-english.js");
  assert.match(src, /🔊 اسمع السؤال/);
  assert.match(src, /id="englishQuestionSpeak"/);
  // listen button replays q + choices before answering, q + ex after
  assert.match(src, /if\(done\)say\(q\.q\+" "\+q\.ex\);else ask\(\)/);
  assert.match(src, /const ask=\(\)=>saySeq\(\[q\.q,\.\.\.q\.a\.map\(n=>names\[n-1\]\)\]\)/);
  // feedback() is called after answering, and the next button has a pager arrow
  assert.match(src, /MatthewVoice\?\.feedback\(correct\?"correct":"wrong"\)/);
  assert.match(src, /السؤال التالي<span class=\\"pager-arrow\\">←<\/span>/);
  assert.match(src, /شوف نتيجتك 🏆/);

  const { panel, card } = EN();
  card.onclick();
  panel.querySelectorAll("[data-level]")[0].onclick(); // level 1 lesson
  panel.querySelector("#englishMathStart").onclick();
  assert.match(panel.innerHTML, /🔊 اسمع السؤال/);
  for (let i = 0; i < 4; i++) {
    const choices = panel.querySelectorAll("[data-value]");
    assert.equal(choices.length, 4);
    choices[0].onclick();
    const next = panel.querySelector("#englishMathNext");
    assert.ok(!next.classList.contains("hidden"), "next button shown after answering");
    next.onclick();
  }
  assert.match(panel.innerHTML, /جاوبت صح على/);
  assert.ok(/المرحلة التالية|راجع الدرس/.test(panel.innerHTML), "finish continue label present");
});

test("finish narration strings present (score line + pass/fail tip)", () => {
  const src = read("math-english.js");
  assert.match(src, /stage="finish"/);
  assert.match(src, /saySeq\(\["جاوبت صح على "\+digits\(score\)\+" من "\+digits\(round\.length\)\+"\."/);
  assert.match(src, /عدّيت المرحلة! نروح للي بعدها\./);
  assert.match(src, /راجع الشرح وجرب تاني، إنت تقدر!/);
  assert.match(src, /راجع الدرس<span class=\\"pager-arrow\\">←<\/span>/);
  assert.match(src, /المرحلة التالية<span class=\\"pager-arrow\\">←<\/span>/);
  assert.match(src, /خلّصت الرياضيات! 🎉/);
  // header back arrow points right in RTL
  assert.match(src, /رجوع →/);
  assert.ok(!src.includes("رجوع ←"), "no left-pointing back label");
  assert.ok(!src.includes("أكمل بعد المراجعة"), "old fail label gone");
});
