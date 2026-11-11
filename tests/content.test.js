const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("phase 1-2 modules ship inside the interactive-games bundle", () => {
  // The Android workflow copies interactive-games.js into the APK. The bundle
  // is far too large to commit through the API, so the workflow rebuilds it
  // from the canonical sources (build_bundle.py) before copying. This test
  // runs that same build and keeps the parts byte-identical to the sources.
  const { execFileSync } = require("node:child_process");
  const bundlePath = path.join(root, "interactive-games.js");
  const originalBundle = fs.readFileSync(bundlePath, "utf8");
  let bundle = originalBundle;
  try {
    execFileSync("python3", [path.join(root, "build_bundle.py")], { stdio: "pipe" });
    bundle = fs.readFileSync(bundlePath, "utf8");
  } finally {
    fs.writeFileSync(bundlePath, originalBundle);
  }
  const html = read("index.html");
  const sw = read("sw.js");
  const partFiles = ["mastery.js", "parent.js", "tracing.js", "reading.js", "voice-clips.js", "rescue.js",
    ...fs.readdirSync(root).filter(f => /^voice-clips-(pack|text)-\d+\.js$/.test(f)).sort()];
  for (const file of partFiles) {
    assert.ok(fs.existsSync(path.join(root, file)), "missing source " + file);
    const source = read(file).trim();
    assert.ok(bundle.includes(source), "bundle is out of sync with " + file + " — regenerate it from the sources");
    assert.ok(!html.includes('src="./' + file + '"'), "page should load " + file + " via the bundle only");
    assert.ok(!sw.includes("./" + file), "offline cache must not list " + file + " (not a separate request any more)");
  }
  assert.ok(html.includes("interactive-games.js"), "page does not load the bundle file");
  assert.ok(sw.includes("./interactive-games.js"), "offline cache missing the bundle file");
  assert.match(sw, /king-matthew-v18/);
});

test("science topics are kept but taught simply, like a game (owner correction)", () => {
  const science = read("science.js");
  for (const topic of ["المغناطيس", "يطفو", "يغوص", "السكر بيختفي", "التلج والمية"]) {
    assert.ok(science.includes(topic), "science lesson missing kept topic: " + topic);
  }
  // the dry textbook phrasing the owner rejected must be gone
  for (const dry of ["يجذب بعض الأشياء المصنوعة من الحديد", "يجذب بعض المعادن", "حالات المادة", "الاهتزاز", "الخياشيم"]) {
    assert.ok(!science.includes(dry), "dry phrasing still present: " + dry);
  }
  const bank = read("app.js");
  assert.ok(bank.includes("مشبك معدن"), "quiz bank missing the simple magnet question");
  assert.ok(bank.includes("هتطفو فوق المية"), "quiz bank missing the simple float question");
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
  const fsx = require("node:fs");
  const chunkText = fsx.readdirSync(__dirname + "/..").filter(f => /^voice-clips-pack-\d+\.js$/.test(f)).map(f => read(f)).join("\n");
  for (const key of keys) assert.ok(chunkText.includes('"' + key + '":'), "clip data chunks missing clip " + key);
  const rescue = read("rescue.js");
  const used = [...rescue.matchAll(/(?:clip:\s*|introClip:\s*|winClip:\s*|playKey\(|speak\([^)]*?,\s*)"((?:rescue|story)(?:Stage|Closer|Intro|Win|Ask|Animals|Trip|Treasure|Lion|Fox|Bear|Tiger)[A-Za-z0-9]*)"/g)].map(m => m[1])
    .concat([...rescue.matchAll(/"((?:rescue|story)[A-Za-z]*Closer\d)"/g)].map(m => m[1]));
  assert.ok(new Set(used).size >= 20, "rescue.js should reference its story/stage/closer/win clips, got " + [...new Set(used)].join(","));
  for (const key of new Set(used)) assert.ok(keys.includes(key), "rescue.js uses unknown clip key " + key);
  assert.match(read("voice.js"), /MatthewClips/);
});

test("story adventures replace the plain surprise quiz on the home screen", () => {
  const html = read("index.html");
  assert.ok(html.includes('data-stories="1"'), "home is missing the stories card");
  assert.ok(!html.includes('data-category="mixed"'), "plain surprise quiz card still on home");
  const rescue = read("rescue.js");
  for (const title of ["مغامرة الإنقاذ", "تحدي حيوانات الغابة", "رحلة الغابة مع مارك", "كنز الملك"]) {
    assert.ok(rescue.includes(title), "missing story: " + title);
  }
  assert.ok(rescue.includes("مارك") && rescue.includes("مريم"), "stories must star Mark and Maryam");
  assert.ok(rescue.includes("STORIES"), "stories engine must be story-based");
  assert.match(rescue, /questions = shuffle\(all\)/, "story questions must be reshuffled every run");
});

test("recorded teacher voice covers the whole quiz bank and the corpus", () => {
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  assert.ok(corpus.length >= 600, "corpus should cover the app, got " + corpus.length);
  const fsy = require("node:fs");
  const textChunks = fsy.readdirSync(__dirname + "/..").filter(f => /^voice-clips-text-\d+\.js$/.test(f)).sort();
  assert.ok(textChunks.length >= 1, "missing voice-clips-text chunk files");
  const byText = {};
  for (const f of textChunks) {
    const src = read(f);
    Object.assign(byText, JSON.parse(src.slice(src.indexOf("push(") + 5, src.lastIndexOf(");"))));
  }
  const digits = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const norm = s => String(s || "").replace(/[٠-٩]/g, c => digits[c]).replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const src = read("app.js");
  const bank = vm.runInNewContext("(" + src.slice(src.indexOf("const bank=") + 11, src.indexOf("\nconst names=")).replace(/;\s*$/, "") + ")", Object.create(null));
  let checked = 0;
  for (const qs of Object.values(bank)) for (const q of qs) {
    assert.ok(byText[norm(q.q)], "no teacher clip for question: " + q.q);
    for (const a of q.a) assert.ok(byText[norm(a)], "no teacher clip for answer: " + a);
    checked++;
  }
  assert.ok(checked >= 85, "expected to check the whole bank, got " + checked);
  assert.ok(byText[norm("الإجابة الصحيحة هي")], "missing the correct-answer prefix clip");
});

test("every quiz answer has a picture (Matthew cannot read yet)", () => {
  const src = read("app.js");
  const m = src.match(/window\.AnswerPics=(\{.*?\});/s);
  assert.ok(m, "app.js is missing the AnswerPics map");
  const pics = JSON.parse(m[1]);
  const bank = vm.runInNewContext("(" + src.slice(src.indexOf("const bank=") + 11, src.indexOf("\nconst names=")).replace(/;\s*$/, "") + ")", Object.create(null));
  let checked = 0;
  for (const qs of Object.values(bank)) for (const q of qs) for (const a of q.a) {
    assert.ok(pics[a], "answer has no picture: " + a);
    checked++;
  }
  assert.ok(checked >= 350, "expected to check all bank answers, got " + checked);
  assert.ok(read("rescue.js").includes("answer-picture"), "story answers must show pictures too");
});

test("stories open in a clean full-screen focus with an animated scene", () => {
  const rescue = read("rescue.js");
  assert.ok(rescue.includes("focusMode"), "stories must hide the home clutter while open");
  assert.ok(rescue.includes("scene-ground") && rescue.includes("rescueBob"), "adventure scene must be illustrated and animated");
});

test("quizzes pronounce answers and speech never overlaps", () => {
  const html = read("index.html");
  assert.ok(html.includes('id="listenAllBtn"'), "quiz is missing the listen-to-question-and-answers button");
  const app = read("app.js");
  assert.ok(app.includes("speakSequence"), "main quiz must narrate question + answers in sequence");
  assert.ok(app.includes("answer-say"), "each answer needs its own speaker button");
  const rescue = read("rescue.js");
  assert.ok(rescue.includes("speakSequence") && rescue.includes("answer-say"), "stories must narrate answers too");
  const voice = read("voice.js");
  assert.ok(voice.includes("speakSequence"), "MatthewVoice must expose speakSequence");
  assert.match(voice, /if \(id === requestId\) clips\.playKey\(key\)/, "delayed praise must yield to newer speech (no overlap)");
  assert.match(voice, /const speak = async[\s\S]{0,700}MatthewClips\?\.stop\(\)/, "speak() must stop a playing clip before TTS so voices never overlap");
  const vc = read("voice-clips.js");
  assert.ok(vc.includes("playSequence"), "recorded clips must support chained playback");
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
