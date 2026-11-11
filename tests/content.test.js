const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("phase 1-2 modules ship inside the interactive-games bundle", () => {
  // The Android workflow copies interactive-games.js into the APK and cannot
  // be edited by the app integration, so the new modules are inlined there.
  // This test keeps the bundle byte-identical to the canonical sources.
  const bundle = read("interactive-games.js");
  const html = read("index.html");
  const sw = read("sw.js");
  for (const file of ["mastery.js", "parent.js", "tracing.js", "reading.js", "voice-clips.js", "rescue.js"]) {
    assert.ok(fs.existsSync(path.join(root, file)), "missing source " + file);
    const source = read(file).trim();
    assert.ok(bundle.includes(source), "bundle is out of sync with " + file + " — regenerate it from the sources");
    assert.ok(!html.includes('src="./' + file + '"'), "page should load " + file + " via the bundle only");
    assert.ok(!sw.includes("./" + file), "offline cache must not list " + file + " (not a separate request any more)");
  }
  assert.ok(html.includes("interactive-games.js"), "page does not load the bundle file");
  assert.ok(sw.includes("./interactive-games.js"), "offline cache missing the bundle file");
  assert.match(sw, /king-matthew-v17/);
});

test("science content is age-simple: no magnet, dissolving, float/sink or states of matter", () => {
  const banned = /مغناطيس|الذوبان|يذوب|يطفو|يغوص|الاهتزاز|حالات المادة|الخياشيم/;
  assert.ok(!banned.test(read("science.js")), "science lessons still contain an advanced topic");
  assert.ok(!banned.test(read("app.js")), "quiz bank still contains an advanced topic");
});

test("science lessons are many and richly explained", () => {
  const src = read("science.js");
  const lessons = [...src.matchAll(/\["([^"]+)","([^"]+)","([^"]+)","([^"]+)"\]/g)];
  assert.ok(lessons.length >= 40, "expected at least 40 science lessons, got " + lessons.length);
  for (const [, title, , , long] of lessons) {
    assert.ok(long.length >= 100, "lesson explanation too short: " + title);
  }
});

test("recorded teacher voice clips exist and the rescue game uses real clip keys", () => {
  const clips = JSON.parse(read("audio-src/clips.json"));
  const keys = Object.keys(clips);
  assert.ok(keys.length >= 40, "expected at least 40 recorded clips");
  const voiceClips = read("voice-clips.js");
  assert.match(voiceClips, /window\.MatthewClips/);
  for (const key of keys) assert.ok(voiceClips.includes('"' + key + '"'), "voice-clips.js missing clip " + key);
  const rescue = read("rescue.js");
  const used = [...rescue.matchAll(/(?:clip:\s*|playKey\(|speak\([^)]*?,\s*)"(rescue(?:Stage|Closer|Intro|Win|Ask)[A-Za-z0-9]*)"/g)].map(m => m[1])
    .concat([...rescue.matchAll(/"(rescueCloser\d)"/g)].map(m => m[1]));
  assert.ok(new Set(used).size >= 9, "rescue.js should reference its stage/closer/win clips");
  for (const key of new Set(used)) assert.ok(keys.includes(key), "rescue.js uses unknown clip key " + key);
  assert.match(read("voice.js"), /MatthewClips/);
});

test("rescue adventure replaces the plain surprise quiz on the home screen", () => {
  const html = read("index.html");
  assert.ok(html.includes('data-rescue="1"'), "home is missing the rescue card");
  assert.ok(!html.includes('data-category="mixed"'), "plain surprise quiz card still on home");
  const rescue = read("rescue.js");
  assert.ok(rescue.includes("مارك") && rescue.includes("مريم"), "rescue story must star Mark and Maryam");
  assert.ok(rescue.includes("STAGES"), "rescue game must be stage-based");
});

test("arabic letter lessons explain from zero with mouth hints", () => {
  const lessons = read("lessons.js");
  assert.match(lessons, /explainFor/);
  assert.match(lessons, /الميس بتشرح/);
  assert.match(lessons, /HINTS/);
});

// The Muse GitHub App cannot modify workflow files (GitHub reserves the
// "workflows" permission), so on the upgrade branch this check is skipped.
// The local copy of .github/workflows/android-apk.yml already lists the new
// modules in its trigger paths, www asset copy and esbuild validation; it
// must be applied by the repository owner — see UPGRADE_NOTES.md.
test("new modules are included in the Android APK build", { skip: "workflow file must be updated by the repo owner (workflows permission) — see UPGRADE_NOTES.md" }, () => {
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
