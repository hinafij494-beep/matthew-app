const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("main page includes Arabic layout and all five game modes", () => {
  const html = read("index.html");
  assert.match(html, /lang="ar"/);
  assert.match(html, /dir="rtl"/);
  for (const id of ["numbers", "letters", "colors", "world", "mixed"]) {
    assert.ok(html.includes(id), `missing game mode: ${id}`);
  }
});

test("quiz bank has at least 30 questions across four subjects", () => {
  const source = read("app.js");
  const start = source.indexOf("const bank=");
  const end = source.indexOf("\nconst names=", start);
  assert.ok(start >= 0 && end > start, "quiz bank declaration exists");
  const context = {};
  vm.runInNewContext(source.slice(start, end) + "\nglobalThis.bank = bank;", context);
  const categories = Object.values(context.bank);
  assert.equal(categories.length, 4);
  assert.ok(categories.flat().length >= 30);
});

test("every question has four choices and a valid correct answer", () => {
  const source = read("app.js");
  const start = source.indexOf("const bank=");
  const end = source.indexOf("\nconst names=", start);
  const context = {};
  vm.runInNewContext(source.slice(start, end) + "\nglobalThis.bank = bank;", context);
  for (const [category, questions] of Object.entries(context.bank)) {
    for (const [index, q] of questions.entries()) {
      assert.equal(q.a.length, 4, `${category} question ${index + 1}`);
      assert.ok(Number.isInteger(q.c) && q.c >= 0 && q.c < q.a.length);
      assert.ok(q.q.length > 5);
      assert.ok(q.e.length > 0);
    }
  }
});

test("question prompts are not duplicated inside a category", () => {
  const source = read("app.js");
  const start = source.indexOf("const bank=");
  const end = source.indexOf("\nconst names=", start);
  const context = {};
  vm.runInNewContext(source.slice(start, end) + "\nglobalThis.bank = bank;", context);
  for (const [category, questions] of Object.entries(context.bank)) {
    const prompts = questions.map(q => q.q);
    assert.equal(new Set(prompts).size, prompts.length, `duplicate in ${category}`);
  }
});

test("app includes offline cache and install manifest", () => {
  const html = read("index.html");
  const sw = read("sw.js");
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.match(read("app.js"), /serviceWorker\.register/);
  for (const file of ["./", "./index.html", "./styles.css", "./app.js"]) {
    assert.ok(sw.includes(file), `offline cache missing ${file}`);
  }
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "ar");
  assert.ok(manifest.icons.length > 0);
  assert.ok(fs.existsSync(path.join(root, "voice.js")));
  assert.ok(html.includes("voice.bundle.js"));
  assert.ok(sw.includes("./voice.bundle.js"));
});

test("progress is saved locally and randomization is used", () => {
  const js = read("app.js");
  assert.match(js, /localStorage\.setItem\("matthewBest"/);
  assert.match(js, /localStorage\.setItem\("matthewStars"/);
  assert.match(js, /Math\.random\(\)/);
  assert.match(js, /slice\(0,8\)/);
});

test("all app assets referenced by the page exist", () => {
  const html = read("index.html");
  for (const asset of ["manifest.webmanifest", "icon.svg", "styles.css", "app.js"]) {
    assert.ok(fs.existsSync(path.join(root, asset)), `missing ${asset}`);
    assert.ok(html.includes(asset), `page does not reference ${asset}`);
  }
});
test("voice module supports Arabic and English speech practice", () => {
  const voice = read("voice.js");
  assert.match(voice, /ar-EG/);
  assert.match(voice, /en-US/);
  assert.match(voice, /SpeechSynthesisUtterance/);
  assert.match(voice, /SpeechRecognition/);
  assert.match(voice, /تحدي النطق/);
});

test("expanded learning modules are loaded and included in offline cache", () => {
  const html = read("index.html");
  const sw = read("sw.js");
  for (const file of ["learning.js", "math-journey.js", "math-english.js"]) {
    assert.ok(html.includes(file), "page does not load " + file);
    assert.ok(sw.includes("./" + file), "offline cache missing " + file);
    assert.ok(fs.existsSync(path.join(root, file)), "missing " + file);
  }
});

test("Arabic letter school contains all 28 letters", () => {
  const lessons = read("lessons.js");
  const count = (lessons.match(/\{letter:/g) || []).length;
  assert.ok(count >= 28, "expected 28 Arabic letters, found " + count);
});

test("English alphabet and Arabic/English numbers are available", () => {
  const learning = read("learning.js");
  assert.match(learning, /englishWords/);
  assert.match(learning, /arabicDigits/);
  assert.match(learning, /englishNames/);
  assert.match(learning, /English Alphabet/);
  assert.match(learning, /الأرقام العربية/);
});
