const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("phase 1-2 modules are loaded by the page and cached offline", () => {
  const html = read("index.html");
  const sw = read("sw.js");
  for (const file of ["mastery.js", "parent.js", "tracing.js", "reading.js"]) {
    assert.ok(fs.existsSync(path.join(root, file)), "missing " + file);
    assert.ok(html.includes(file), "page does not load " + file);
    assert.ok(sw.includes("./" + file), "offline cache missing " + file);
  }
  assert.match(sw, /king-matthew-v15/);
});

test("new modules are included in the Android APK build", () => {
  const workflow = read(".github/workflows/android-apk.yml");
  for (const file of ["mastery.js", "parent.js", "tracing.js", "reading.js"]) {
    assert.ok(workflow.includes(file), "APK workflow missing " + file);
  }
});

test("mastery ladder needs two correct in a row and punishes nothing", () => {
  const store = new Map();
  const context = {
    console,
    module: { exports: {} },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    }
  };
  context.window = context;
  vm.runInNewContext(read("mastery.js"), context);
  const mastery = context.module.exports;
  const day = 24 * 60 * 60 * 1000;
  const t0 = 1_000_000_000;

  let entry = mastery.record("letters:test", true, t0);
  assert.equal(entry.level, 0, "one correct answer must not level up");
  entry = mastery.record("letters:test", true, t0);
  assert.equal(entry.level, 1);
  assert.equal(entry.nextReviewAt, t0 + 1 * day);

  entry = mastery.record("letters:test", false, t0);
  assert.equal(entry.level, 0, "a mistake drops exactly one rung");
  assert.equal(entry.wrong, 1);
  assert.equal(mastery.accuracy(entry), 2 / 3);

  // Climb to mastery: levels 1..3 with clean streaks.
  for (let i = 0; i < 6; i++) mastery.record("letters:test", true, t0);
  entry = mastery.get("letters:test");
  assert.ok(mastery.isMastered(entry), "expected mastered at level >= 3 with accuracy >= 75%");
  assert.equal(mastery.dueSkills(t0).some(s => s.skillId === "letters:test"), false);
});

test("parent dashboard panel uses the shared parentPanel id and a gate", () => {
  const parent = read("parent.js");
  assert.match(parent, /parentPanel/);
  assert.match(parent, /لوحة ولي الأمر/);
  assert.match(parent, /MatthewMastery/);
});

test("tracing covers Arabic letters, English letters and both number sets", () => {
  const tracing = read("tracing.js");
  assert.match(tracing, /اكتب بإصبعك/);
  assert.match(tracing, /pointerdown/);
  assert.match(tracing, /pointermove/);
  for (const setId of ["arLetters", "enLetters", "arNumbers", "enNumbers"]) {
    assert.ok(tracing.includes(setId), "missing tracing set " + setId);
  }
});

test("reading module teaches syllables, blending and CVC words", () => {
  const reading = read("reading.js");
  assert.match(reading, /يلا نقرأ/);
  assert.match(reading, /syllablesFor/);
  assert.match(reading, /بَاب/);
  assert.match(reading, /CVC_WORDS/);
  for (const word of ["cat", "dog", "sun", "fish"]) {
    assert.ok(reading.includes('"' + word + '"') || reading.includes(word), "missing CVC word " + word);
  }
});

test("basic Arabic letter examples do not reuse one emoji for two words", () => {
  const learning = read("learning.js");
  const start = learning.indexOf("const arabicLetters");
  const end = learning.indexOf("].map", start);
  assert.ok(start >= 0 && end > start);
  const entries = [...learning.slice(start, end).matchAll(/\["([^"]+)","([^"]+)","([^"]+)"\]/g)]
    .map(m => ({ letter: m[1], word: m[2], emoji: m[3] }));
  assert.equal(entries.length, 28, "expected 28 basic letter examples");
  const byEmoji = new Map();
  for (const entry of entries) {
    assert.ok(!byEmoji.has(entry.emoji),
      `emoji ${entry.emoji} used for both ${byEmoji.get(entry.emoji)} and ${entry.word}`);
    byEmoji.set(entry.emoji, entry.word);
  }
});

test("quiz answer handlers record mastery in every learning flow", () => {
  assert.match(read("app.js"), /MatthewMastery\?\.record/);
  assert.match(read("lessons.js"), /MatthewMastery\?\.record/);
  assert.match(read("math-journey.js"), /MatthewMastery\?\.record/);
  assert.match(read("math-english.js"), /MatthewMastery\?\.record/);
  assert.match(read("interactive-games.js"), /MatthewMastery\?\.record/);
  assert.match(read("reading.js"), /MatthewMastery\?\.record/);
  assert.match(read("tracing.js"), /MatthewMastery\?\.record/);
});
