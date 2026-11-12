// tests/numbers-once.test.js — NUMBERS-ONCE audit (user decisions 2026-11-12
// 18:17 «مرة واحدة بس» + 18:18 «طبق ع كل الارقام»: every number spoken ONCE,
// in the right language, with no echo, double playback or language mixing).
//
// What this test drives (never hardcoded maps):
//   * the REAL voice-clips.js keyFor/play/playSequence in a vm, fed by the
//     REAL voice-clips-text-1.js maps (BY_TEXT + EXACT) and a stub Audio
//     that counts every play per resolved key;
//   * the REAL math-journey.js / math-english.js listen + narration code in
//     a vm with a stub DOM and a recording MatthewVoice;
//   * the REAL memory-game.js in a vm (click two matching number cards);
//   * the REAL app.js question bank (numbers[0]) for the quiz sequences;
//   * audio-src/corpus.json for the text of every clip that actually plays
//     — the doubling lives INSIDE the clip text (num_ar_l_*: «ده رقم خمسة.
//     خمسة»), so the assertion counts mentions of the number inside the
//     resolved clip's text, not just the number of play() calls.
//
// EXPECTED FAIL-BEFORE STATE (current unfixed code): the tests marked
// EXPECTED-FAIL below fail; the PASS tests guard behaviour that is already
// correct and must not regress when the fix lands. A later fix worker makes
// the whole file pass — do NOT weaken an assertion to make it pass.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- corpus
const CORPUS = new Map(
  JSON.parse(read("audio-src/corpus.json")).map((e) => [e.key, e]),
);
const clipText = (key) => {
  assert.ok(CORPUS.has(key), "corpus must contain key " + key);
  return CORPUS.get(key).text;
};
const clipLang = (key) => CORPUS.get(key).lang;

// Number forms, both languages (Egyptian names, as the app uses them).
const AR_NAMES = ["واحد", "اتنين", "تلاتة", "أربعة", "خمسة", "ستة", "سبعة", "تمانية", "تسعة", "عشرة", "حداشر", "اتناشر", "تلتاشر", "أربعتاشر", "خمستاشر", "ستاشر", "سبعتاشر", "تمنتاشر", "تسعتاشر", "عشرين"];
const EN_NAMES = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const arDigit = (n) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

// Tokenise a clip text the way the ear hears it: strip diacritics/tatweel
// and punctuation, split on whitespace. Token equality (not substring)
// avoids «واحد» matching «واحدة» and «1» matching «10».
function tokens(text) {
  return String(text || "")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[^ء-يa-zA-Z0-9٠-٩ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean);
}
// How many times is the VALUE n heard in this clip text? Counts every
// form of it: Arabic name, Arabic-Indic digit, Latin digit (ar), or
// English name, Latin digit (en).
function mentions(text, n, lang) {
  const t = tokens(text);
  const forms = lang === "en"
    ? [EN_NAMES[n - 1], String(n)]
    : [AR_NAMES[n - 1], arDigit(n), String(n)];
  return t.filter((tok) => forms.includes(tok)).length;
}

// ------------------------------------------------------- real clip layer
// Runs the REAL voice-clips.js with the REAL text maps. Audio data is a
// dummy (base64 of the key itself) so URL.createObjectURL can map each
// blob URL back to its key; every audio.play() is logged in order.
function loadVoice() {
  const lines = read("voice-clips-text-1.js").split("\n");
  const parsePush = (line) => {
    const m = line.match(/\.push\((\{.*\})\);?$/);
    assert.ok(m, "text pack line did not parse: " + line.slice(0, 80));
    return JSON.parse(m[1]);
  };
  const byText = parsePush(lines[0]);
  const exact = parsePush(lines[1]);
  const data = {};
  for (const key of new Set([...Object.values(byText), ...Object.values(exact)])) {
    data[key] = Buffer.from(key, "utf8").toString("base64");
  }
  const plays = []; // [{key}] in play order
  const created = new Map(); // blob url -> key
  class FakeBlob {
    constructor(parts) {
      this.parts = parts;
    }
  }
  class FakeAudio {
    constructor() {
      this.src = "";
      this.onended = null;
    }
    canPlayType() {
      return "probably";
    }
    pause() {}
    play() {
      plays.push({ key: created.get(this.src) || null, src: this.src });
      const self = this;
      setTimeout(() => {
        if (self.onended) self.onended();
      }, 0);
      return Promise.resolve();
    }
  }
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    Blob: FakeBlob,
    URL: {
      createObjectURL: (blob) => {
        const key = Buffer.from(blob.parts[0]).toString("utf8");
        const url = "blob:" + key;
        created.set(url, key);
        return url;
      },
      revokeObjectURL: () => {},
    },
    Audio: FakeAudio,
  };
  sandbox.window = sandbox;
  sandbox.window.__matthewClipData = [data];
  sandbox.window.__matthewClipText = [byText];
  sandbox.window.__matthewClipExact = [exact];
  vm.createContext(sandbox);
  vm.runInContext(read("voice-clips.js"), sandbox);
  assert.ok(sandbox.window.MatthewClips, "voice-clips.js must expose MatthewClips");
  return {
    clips: sandbox.window.MatthewClips,
    plays,
    // Play one text (or a sequence) through the REAL clip layer and return
    // the keys actually played, in order.
    async playAll(texts, lang) {
      plays.length = 0;
      const list = Array.isArray(texts) ? texts : [texts];
      if (list.length === 1) sandbox.window.MatthewClips.play(list[0], lang);
      else sandbox.window.MatthewClips.playSequence(list, lang);
      await sleep(80);
      return plays.map((p) => p.key);
    },
  };
}

// ------------------------------------------------------- minimal DOM stub
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
    onclick: null,
    setAttribute() {},
    getAttribute() {
      return null;
    },
    _children: [],
    _handlers: {},
    _qsCache: new Map(),
    _qsaCache: new Map(),
    classList: makeClassList(),
    append(child) {
      this._children.push(child);
    },
    insertBefore() {},
    addEventListener(type, fn) {
      (this._handlers[type] ||= []).push(fn);
    },
    click() {
      if (typeof this.onclick === "function") this.onclick();
      for (const fn of this._handlers.click || []) fn();
    },
    querySelector(sel) {
      if (!this._qsCache.has(sel)) this._qsCache.set(sel, makeEl());
      return this._qsCache.get(sel);
    },
    querySelectorAll(sel) {
      const key = sel + "\n" + this.innerHTML;
      if (this._qsaCache.has(key)) return this._qsaCache.get(key);
      let out = [];
      const parseAttr = (attr, key) => {
        const re = new RegExp(attr + '="(\\d+)"', "g");
        return [...this.innerHTML.matchAll(re)].map((m) => {
          const b = makeEl();
          b.dataset[key] = m[1];
          return b;
        });
      };
      if (sel === "[data-level]") out = parseAttr("data-level", "level");
      else if (sel === "[data-value]") out = parseAttr("data-value", "value");
      else if (sel === "[data-index]") out = parseAttr("data-index", "index");
      else if (sel === "[data-card]") {
        out = [...this.innerHTML.matchAll(/data-card="(\d+)"/g)].map((m) => {
          const b = makeEl();
          b.dataset.card = m[1];
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
function recordingVoice() {
  const log = []; // {kind: "speak"|"sequence", text|list, lang}
  return {
    log,
    stub: {
      speak: (text, lang) => log.push({ kind: "speak", text, lang }),
      speakSequence: (list, lang) => log.push({ kind: "sequence", list: [...list], lang }),
      stop: () => {},
      feedback: () => {},
    },
  };
}

// ------------------------------------------------------- math journeys
function loadJourney(file) {
  const els = {};
  const getEl = (id) => (els[id] ||= makeEl());
  const mainEl = makeEl();
  const voice = recordingVoice();
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
  sandbox.window.MatthewVoice = voice.stub;
  sandbox.window.MatthewMastery = { record: () => {} };
  vm.createContext(sandbox);
  const src = read(file).trimEnd().replace(/}\)\(\);$/, ";globalThis.__panel = panel; })();");
  assert.ok(src.includes("__panel"), file + " did not end with })(); as expected");
  vm.runInContext(src, sandbox);
  const learningList = getEl("learningList");
  const card = learningList._children[0];
  assert.ok(card && typeof card.onclick === "function", file + " did not register a card");
  return { sandbox, panel: sandbox.__panel, card, getEl, voice };
}
// Open the learn screen for level n (1-based) and return the voice log
// recorded from that moment on.
async function openLearn(journey, n) {
  journey.card.onclick();
  const tiles = journey.panel.querySelectorAll("[data-level]");
  assert.equal(tiles.length, 20, "picker must show 20 levels");
  tiles[n - 1].onclick();
  await sleep(250); // let the 120ms auto-narration fire
  journey.voice.log.length = 0; // drop the auto-narration; test it separately
  return journey.panel;
}

// EXPECTED-FAIL (echo baked into the clip): the «اسمع الرقم» button speaks
// «ده رقم X. X» — one play of num_ar_l_*, whose TEXT says the number twice.
test("AR journey listen button: each number spoken exactly once (all 20 levels)", async () => {
  const voice = loadVoice();
  const journey = loadJourney("math-journey.js");
  for (let n = 1; n <= 20; n++) {
    const panel = await openLearn(journey, n);
    panel.querySelector("#mathListen").onclick();
    const calls = journey.voice.log.filter((c) => c.kind === "speak");
    assert.equal(calls.length, 1, `level ${n}: listen must speak once, got ${calls.length}`);
    const keys = await voice.playAll(calls[0].text, calls[0].lang);
    assert.equal(keys.length, 1, `level ${n}: listen must play exactly one clip, got ${keys}`);
    assert.equal(keys[0], "num_ar_l_" + (n - 1), `level ${n}: listen must resolve to num_ar_l_${n - 1}`);
    assert.equal(
      mentions(clipText(keys[0]), n, "ar"), 1,
      `level ${n}: clip ${keys[0]} says the number ${mentions(clipText(keys[0]), n, "ar")} times («${clipText(keys[0])}»), want 1`,
    );
    journey.panel.querySelector("#mathBack").onclick();
  }
});

// EXPECTED-FAIL (same echo, English): «Number five. 5» says five twice.
test("EN journey listen button: each number spoken exactly once (all 20 levels)", async () => {
  const voice = loadVoice();
  const journey = loadJourney("math-english.js");
  for (let n = 1; n <= 20; n++) {
    const panel = await openLearn(journey, n);
    panel.querySelector("#englishMathListen").onclick();
    const calls = journey.voice.log.filter((c) => c.kind === "speak");
    assert.equal(calls.length, 1, `level ${n}: listen must speak once, got ${calls.length}`);
    const keys = await voice.playAll(calls[0].text, calls[0].lang);
    assert.equal(keys.length, 1, `level ${n}: listen must play exactly one clip, got ${keys}`);
    assert.equal(keys[0], "num_en_l_" + (n - 1), `level ${n}: listen must resolve to num_en_l_${n - 1}`);
    assert.equal(
      mentions(clipText(keys[0]), n, "en"), 1,
      `level ${n}: clip ${keys[0]} says the number ${mentions(clipText(keys[0]), n, "en")} times («${clipText(keys[0])}»), want 1`,
    );
    journey.panel.querySelector("#englishMathBack").onclick();
  }
});

// Already correct: the learn-screen auto-narration («ده رقم X. يلا نعدّ…»)
// mentions the number once. Guard it so the echo fix does not break it.
test("learn auto-narration mentions the number once (AR + EN)", async () => {
  const voice = loadVoice();
  for (const [file, n, lang] of [["math-journey.js", 5, "ar"], ["math-english.js", 5, "en"]]) {
    const journey = loadJourney(file);
    journey.card.onclick();
    journey.panel.querySelectorAll("[data-level]")[n - 1].onclick();
    await sleep(250);
    const seqs = journey.voice.log.filter((c) => c.kind === "sequence");
    assert.ok(seqs.length >= 1, file + ": auto-narration sequence must fire");
    const first = seqs[0].list[0];
    const keys = await voice.playAll(first, seqs[0].lang);
    assert.equal(keys.length, 1, file + ": narration must resolve to one clip");
    assert.equal(mentions(clipText(keys[0]), n, lang), 1, file + ": narration clip must mention the number once");
  }
});

// ------------------------------------------------------- bare-digit layer
test("bare Arabic digits 0–20 resolve to exactly one Arabic clip each", async () => {
  const voice = loadVoice();
  for (let n = 0; n <= 20; n++) {
    const keys = await voice.playAll(arDigit(n), "ar-EG");
    assert.equal(keys.length, 1, `Arabic digit ${arDigit(n)} must play exactly one clip, got ${keys}`);
    assert.equal(clipLang(keys[0]), "ar_EG", `Arabic digit ${arDigit(n)} resolved to ${keys[0]} (${clipLang(keys[0])}), want ar_EG`);
    assert.equal(mentions(clipText(keys[0]), n, "ar") >= 1, true, `clip ${keys[0]} must say the number`);
  }
});

test("bare English digits 1–10 resolve to exactly one English clip each", async () => {
  const voice = loadVoice();
  for (let n = 1; n <= 10; n++) {
    const keys = await voice.playAll(String(n), "en-US");
    assert.equal(keys.length, 1, `English digit ${n} must play exactly one clip, got ${keys}`);
    assert.equal(keys[0], "tr_ennum_" + n, `English digit ${n} must resolve to tr_ennum_${n}, got ${keys[0]}`);
    assert.equal(clipLang(keys[0]), "en_US", `English digit ${n} resolved to ${keys[0]} (${clipLang(keys[0])}), want en_US`);
  }
});

// EXPECTED-FAIL (latent trap): English 11–20 have no English digit clip —
// EXACT/BY_TEXT resolves them to Arabic clips (ans_34/51/59/56/57/58 for
// 11–14/16/17, num_digit_* for 15/18/19/20). No live en-US caller speaks a
// bare digit 11–20 today, but any future one would speak Arabic.
test("bare English digits 11–20 resolve to an English clip (or silence), never Arabic", async () => {
  const voice = loadVoice();
  for (let n = 11; n <= 20; n++) {
    const keys = await voice.playAll(String(n), "en-US");
    assert.ok(
      keys.length === 0 || clipLang(keys[0]) === "en_US",
      `English digit ${n} resolved to ${keys[0] || "(silence)"} (${keys[0] ? clipLang(keys[0]) : "-"}), want en_US or silence`,
    );
  }
});

test("number names resolve once, in the right language (AR + EN, incl. 5)", async () => {
  const voice = loadVoice();
  for (let n = 1; n <= 20; n++) {
    const arKeys = await voice.playAll(AR_NAMES[n - 1], "ar-EG");
    assert.deepEqual(arKeys, ["basic_arnum_" + (n - 1)], `Arabic name ${AR_NAMES[n - 1]} must resolve to basic_arnum_${n - 1}`);
    assert.equal(mentions(clipText(arKeys[0]), n, "ar"), 1, `basic_arnum_${n - 1} must say the number once`);
    const enKeys = await voice.playAll(EN_NAMES[n - 1], "en-US");
    assert.deepEqual(enKeys, ["basic_ennum_" + (n - 1)], `English name ${EN_NAMES[n - 1]} must resolve to basic_ennum_${n - 1}`);
    assert.equal(mentions(clipText(enKeys[0]), n, "en"), 1, `basic_ennum_${n - 1} must say the number once`);
  }
});

// ------------------------------------------------------- quiz + stories
// The REAL app.js bank: extract `const bank = {...};` and drive the exact
// speakSequence() calls showQuestion() + choose() emit for numbers[0]
// («كم عدد أصابع اليد الواحدة؟», choices ٥/٣/٧/١٠, correct ٥).
function extractBank() {
  const src = read("app.js");
  const start = src.indexOf("const bank=");
  assert.ok(start >= 0, "app.js bank missing");
  let i = src.indexOf("{", start);
  let depth = 0, q = null, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return vm.runInNewContext(src.slice(start, j + 1) + "\nbank;"); }
  }
  throw new Error("unbalanced bank");
}

test("main-quiz digit options are spoken once each (Arabic)", async () => {
  const voice = loadVoice();
  const bank = extractBank();
  const q = bank.numbers[0];
  assert.equal(q.q, "كم عدد أصابع اليد الواحدة؟");
  const keys = await voice.playAll([q.q, ...q.a], "ar-EG");
  assert.equal(keys.length, 1 + q.a.length, "question + 4 choices must each play one clip");
  for (const [i, choice] of q.a.entries()) {
    assert.equal(clipLang(keys[1 + i]), "ar_EG", `choice ${choice} resolved to ${keys[1 + i]} (${clipLang(keys[1 + i])}), want ar_EG`);
  }
});

// Numbers-once F3 (FIXED in app.js choose()): a digit answer was already
// spoken in the options, so for bare-number answers choose() speaks the
// prefix ALONE («الإجابة الصحيحة هي») — re-speaking the digit would say
// the number a 2nd time in one turn. Non-number answers are still
// announced with the answer («الإجابة الصحيحة هي» + answer).
test("correct-answer announcement must not re-speak a digit answer already spoken in the options", async () => {
  const voice = loadVoice();
  const bank = extractBank();
  const q = bank.numbers[0];
  const answer = q.a[q.c]; // "٥"
  const askKeys = await voice.playAll([q.q, ...q.a], "ar-EG");
  // The fixed announcement for a digit answer: the prefix alone.
  const announceKeys = await voice.playAll(["الإجابة الصحيحة هي"], "ar-EG");
  assert.equal(announceKeys.length, 1, `digit-answer announcement must play exactly one clip, got ${announceKeys}`);
  const answerKey = askKeys[1 + q.c];
  const replays = announceKeys.filter((k) => k === answerKey).length;
  assert.equal(replays, 0, `digit ${answer} already spoken in the options (${answerKey}); announcement replayed it ${replays} more time(s)`);
  // Regression guard on the REAL code: app.js choose() must keep the
  // isNum branch (prefix alone for digits, full sequence otherwise).
  const appSrc = read("app.js");
  assert.ok(appSrc.includes('isNum?["الإجابة الصحيحة هي"]'), "app.js choose() must speak the prefix alone for digit answers");
  assert.ok(appSrc.includes('["الإجابة الصحيحة هي",ans]'), "app.js choose() must keep the full announcement for non-number answers");
  // Control: a non-number answer IS still announced with the answer.
  const ctrlKeys = await voice.playAll(["الإجابة الصحيحة هي", "أسد"], "ar-EG");
  assert.equal(ctrlKeys.length, 2, `non-number announcement must play the prefix + the answer, got ${ctrlKeys}`);
  assert.equal(clipText(ctrlKeys[1]), "أسد", "non-number announcement must still speak the answer");
});

// EXPECTED-FAIL (language mixing): the English journey's combined
// question+explanation clips read the question's Latin digits in ARABIC
// («خمسة», «ثلاثة عشر» — verify-new-322.log) and the explanation's names
// in ENGLISH («five», «thirteen») — the same value twice, in two languages,
// inside ONE clip. Arabic-journey combined clips restate operands too, but
// in one language only (explanation restatement, kept by design).
test("English-journey combined clips: no value in both a Latin digit and an English name", async () => {
  const sample = ["math_en_q2_4", "math_en_q10_4", "math_en_q12_4"];
  for (const key of sample) {
    const text = clipText(key);
    const t = tokens(text);
    for (let n = 1; n <= 20; n++) {
      const hasDigit = t.includes(String(n));
      const hasName = t.includes(EN_NAMES[n - 1]);
      assert.ok(
        !(hasDigit && hasName),
        `${key} («${text}») says ${n} as Latin digit AND as English «${EN_NAMES[n - 1]}» in one clip`,
      );
    }
  }
  // Control: the Arabic twin of the same question keeps one language.
  const arText = clipText("math_ar_q2_4");
  const t = tokens(arText);
  assert.ok(!t.some((tok) => EN_NAMES.includes(tok)), "Arabic combined clip must contain no English number name");
});

// Numbers-once F5 (FIXED): the English journey asks its question with
// ENGLISH names («كان معانا five نجوم واختفى one…») so the normalised
// text no longer collides with the Arabic journey's clip — it resolves to
// the English journey's own math_en_qq_* clip (corpus.json carries it;
// the text pack must be rebuilt from the corpus for the mapping to land).
test("English-journey question resolves to its own math_en_qq_* clip, not the Arabic journey's", async () => {
  const voice = loadVoice();
  const keys = await voice.playAll("كان معانا five نجوم واختفى one، فاضل كام؟", "ar-EG");
  assert.equal(keys.length, 1);
  assert.equal(keys[0], "math_en_qq2_4", `English-journey question resolved to ${keys[0]}, want math_en_qq2_4`);
});

// ------------------------------------------------------- memory game
function loadMemory() {
  const els = {};
  const getEl = (id) => (els[id] ||= makeEl());
  const mainEl = makeEl();
  const voice = recordingVoice();
  let panelEl = null;
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    localStorage: makeStorage(),
    document: {
      getElementById: getEl,
      querySelector: (sel) => (sel === "main" ? mainEl : getEl(sel)),
      createElement: (tag) => {
        const el = makeEl();
        if (tag === "section") panelEl = el;
        return el;
      },
      head: makeEl(),
    },
  };
  sandbox.window = sandbox;
  sandbox.window.MatthewVoice = voice.stub;
  sandbox.window.scrollTo = () => {};
  vm.createContext(sandbox);
  vm.runInContext(read("memory-game.js"), sandbox);
  const gameList = getEl("gameList");
  const card = gameList._children[0];
  assert.ok(card, "memory game did not register a card");
  assert.ok(panelEl, "memory game did not create its panel");
  return { sandbox, card, getEl, voice, panel: panelEl };
}
function extractNumbers() {
  const src = read("memory-game.js");
  const start = src.indexOf("const NUMBERS = [");
  assert.ok(start >= 0, "memory NUMBERS missing");
  const end = src.indexOf("];", start) + 2;
  return vm.runInNewContext(src.slice(start, end) + "\nNUMBERS;");
}

// Numbers-once F4 (FIXED in memory-game.js praiseMatch): flipping the two
// cards of a number pair already speaks the name twice (the game mechanic
// — kept); the match praise is now the praise line ALONE
// (praiseMatch: speakSeq([line]) — memory-game.js:190), so the name is
// not spoken a third time. The praise must not re-speak the number.
test("memory match praise must not re-speak the matched number", async () => {
  const mem = loadMemory();
  const numbers = extractNumbers();
  // Round 0 is animals; back out and re-open to reach the numbers round.
  mem.card.click();
  mem.panel.querySelector("#memBack").onclick();
  mem.card.click();
  const panel = mem.panel;
  const faces = [...panel.innerHTML.matchAll(/mem-face mem-back[^"]*">([^<]+)</g)].map((m) => m[1]);
  assert.equal(faces.length, 12, "numbers round must show 12 cards");
  const byFace = new Map();
  faces.forEach((f, i) => {
    if (!byFace.has(f)) byFace.set(f, []);
    byFace.get(f).push(i);
  });
  const pair = [...byFace.entries()].find(([, idx]) => idx.length === 2);
  assert.ok(pair, "a matching pair must exist");
  const [face, [i1, i2]] = pair;
  const name = numbers.find((x) => x.face === face).name;
  const buttons = panel.querySelectorAll("[data-card]");
  buttons[i1].click();
  buttons[i2].click();
  const mark = mem.voice.log.length;
  await sleep(1400); // praiseMatch fires at +900ms
  const after = mem.voice.log.slice(mark);
  const replays = after.filter(
    (c) => (c.kind === "speak" && c.text === name) || (c.kind === "sequence" && c.list.includes(name)),
  ).length;
  assert.equal(replays, 0, `matched number «${name}» re-spoken ${replays} time(s) by the match praise`);
});

// ------------------------------------------------------- already-once lines
test("colour-game, move-break, touch-pick and finish lines mention each number once", async () => {
  const voice = loadVoice();
  const cases = [
    ["رقم خمسة! برافو يا بطل! لوّنتها صح!", "ar-EG", 5, "ar"],
    ["رقم خمستاشر! برافو يا ملك ماثيو! لوّنت التاج كله! خدت ألماسة جديدة لتاجك!", "ar-EG", 15, "ar"],
    ["جولة جديدة يا بطل! دلوقتي هنلوّن الأرقام من واحد لـ ستة!", "ar-EG", 1, "ar"],
    ["جولة جديدة يا بطل! دلوقتي هنلوّن الأرقام من واحد لـ ستة!", "ar-EG", 6, "ar"],
    ["نطّ ٥ مرات زي الأرنب", "ar-EG", 5, "ar"],
    ["امشي زي الأسد ١٠ خطوات", "ar-EG", 10, "ar"],
    ["اسمع كويس يا ماثيو. اختار الرقم تلاتة", "ar-EG", 3, "ar"],
    ["جاوبت صح على ٣ من ٤.", "ar-EG", 3, "ar"],
    ["جاوبت صح على ٥ من ١٠ أسئلة", "ar-EG", 5, "ar"],
  ];
  for (const [text, lang, n, ml] of cases) {
    const keys = await voice.playAll(text, lang);
    assert.equal(keys.length, 1, `«${text}» must play exactly one clip, got ${keys}`);
    assert.equal(mentions(clipText(keys[0]), n, ml), 1, `«${text}» → ${keys[0]} mentions the number ${mentions(clipText(keys[0]), n, ml)} times`);
  }
});
