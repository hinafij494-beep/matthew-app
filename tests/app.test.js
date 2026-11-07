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
  for (const id of ["numbers", "math", "letters", "colors", "world", "mixed"]) {
    assert.ok(html.includes(id), `missing game mode: ${id}`);
  }
});

test("quiz bank has at least 40 questions across five subjects", () => {
  const source = read("app.js");
  const start = source.indexOf("const bank=");
  const end = source.indexOf("\nconst names=", start);
  assert.ok(start >= 0 && end > start, "quiz bank declaration exists");
  const context = {};
  vm.runInNewContext(source.slice(start, end) + "\nglobalThis.bank = bank;", context);
  const categories = Object.values(context.bank);
  assert.equal(categories.length, 5);
  assert.ok(categories.flat().length >= 40);
  assert.ok(context.bank.math.length >= 8, "English Math has its own question bank");
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
  assert.ok(html.includes("voice.js"));
  assert.ok(sw.includes("./voice.js"));
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
  for (const asset of ["manifest.webmanifest", "icon.svg", "styles.css", "app.js", "native-tts.js"]) {
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

test("Arabic numeracy and English Math use distinct numeral systems", () => {
  const source = read("app.js");
  const start = source.indexOf("const bank=");
  const end = source.indexOf("\nconst names=", start);
  const context = {};
  vm.runInNewContext(source.slice(start, end) + "\nglobalThis.bank = bank;", context);
  for (const q of context.bank.numbers) {
    assert.ok(q.a.every(value => /^[٠-٩]+$/.test(value)), "Arabic numeracy choices must be Arabic numerals");
  }
  for (const q of context.bank.math) {
    assert.ok(q.q === q.q && /^[A-Za-z0-9 ?+.,'-]+$/.test(q.q), "Math prompts should be in English");
    assert.ok(q.a.every(value => /^[0-9]+$/.test(value)), "Math choices must use English digits");
  }
});
test("parent progress dashboard and per-skill tracking are present", () => {
  assert.match(read("index.html"), /parentPanel/);
  assert.match(read("app.js"), /matthewLearningStats/);
  assert.match(read("app.js"), /attempts>=5/);
});

test("Android package includes native speech bridge", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.dependencies["@capacitor-community/text-to-speech"], "6.0.0");
  assert.match(read("index.html"), /native-tts\.js/);
  assert.match(read("voice.js"), /MatthewNativeTTS/);
  assert.match(read("scripts/prepare-web.js"), /esbuild/);
});


test("academy includes numbers 1-20, English alphabet and beginner coding", () => { const academy=read("academy.js"); assert.match(academy,/length:20/); assert.match(academy,/ABCDEFGHIJKLMNOPQRSTUVWXYZ/); assert.match(academy,/مغامرة البرمجة/); assert.match(read("scripts/prepare-web.js"),/academy.js/); assert.match(read("sw.js"),/academy.js/); });
test("Arabic letter school covers the complete alphabet",()=>{const lesson=read("lessons.js");assert.match(lesson,/letter:"ي"/);assert.match(lesson,/letter:"ث"/);assert.match(lesson,/ar-EG/);});
test("animal quiz choices include a picture and readable label",()=>{assert.match(read("app.js"),/choice-picture/);assert.match(read("app.js"),/choice-label/);assert.match(read("app.js"),/choicePictures/);});
test("Egyptian Arabic voice locale is preferred",()=>{assert.match(read("voice.js"),/ar-EG/);assert.doesNotMatch(read("voice.js"),/ar-SA/);});

test("coding adventure has ordered movement, repeat and debugging levels", () => {
  const academy = read("academy.js");
  assert.match(academy, /const coding=/);
  assert.match(academy, /c==="repeat"\?\["right","right","right"\]/);
  assert.match(academy, /صحّح الغلطة/);
  assert.match(academy, /localStorage\.setItem\("matthewCoding"/);
  assert.match(academy, /ar-EG/);
});
test("academy JavaScript parses without syntax errors", () => {
  const { spawnSync } = require("node:child_process");
  for (const file of ["academy.js", "app.js", "lessons.js"]) {
    const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
    assert.equal(result.status, 0, file + ": " + (result.stderr || result.stdout));
  }
});

test("parent dashboard includes coding progress", () => {
  assert.match(read("app.js"), /مغامرة البرمجة/);
  assert.match(read("app.js"), /coding\.completed/);
});

test("Arabic number and animal answer options show a picture or numeral with a word label", () => {
  const app = read("app.js");
  assert.match(app, /"أسد":"🦁"/);
  assert.match(app, /"فيل":"🐘"/);
  assert.match(app, /"سبعة"/);
  assert.match(app, /visual-answer/);
  assert.match(app, /dataset\.answer=item\.text/);
});


test("coding levels provide independent hints and a revealable worked example",()=>{const academy=read("academy.js");assert.match(academy,/id="codingHelp"/);assert.match(academy,/id="codingExample"/);assert.match(academy,/solution:\["repeat"\]/);});
test("coding board and command controls use a consistent left-to-right movement axis",()=>{const css=read("styles.css");assert.match(css,/coding-board\{direction:ltr!important\}/);assert.match(css,/academy-controls\{direction:ltr\}/);});
test("Arabic voice detection matches actual Arabic Unicode characters",()=>{assert.match(read("voice.js"),/\\u0600-\\u06FF/);});


test("Arabic letter school has all 28 letters and correct non-joining forms", () => {
  const lesson = read("lessons.js");
  assert.equal((lesson.match(/\\{letter:/g) || []).length, 28);
  for (const letter of ["د", "ذ", "ر", "ز", "و"]) {
    assert.match(lesson, new RegExp('letter:"' + letter + '".{0,50}forms:\\["' + letter + '","ـ' + letter + '","ـ' + letter + '"\\]'));
  }
  assert.match(lesson, /words:\\["[^"]+","[^"]+","[^"]+"\\]/);
  assert.match(lesson, /الفتحة/);
  assert.match(lesson, /الضمة/);
  assert.match(lesson, /الكسرة/);
  assert.match(lesson, /السكون/);
});

test("Math journey teaches all numbers 1 to 20 and practices counting, order, comparison, addition and subtraction", () => {
  const math = read("math-journey.js");
  assert.match(math, /length:20/);
  assert.match(math, /ماث من ١ إلى ٢٠/);
  assert.match(math, /عدّ الصور/);
  assert.match(math, /العدد الأكبر/);
  assert.match(math, /\+ \+|➕/);
  assert.match(math, /➖/);
  assert.match(math, /ar-EG/);
  assert.match(read("scripts/prepare-web.js"), /math-journey\.js/);
  assert.match(read("sw.js"), /math-journey\.js/);
  assert.match(read("index.html"), /math-journey\.js/);
});
test("Math journey has 20 spoken Egyptian Arabic number names", () => {
  const math=read("math-journey.js");
  assert.match(math, /"واحد","اتنين","تلاتة"/);
  assert.match(math, /"حداشر","اتناشر","تلتاشر"/);
  assert.match(math, /"تسعتاشر","عشرين"/);
});
