// Picture audit regression tests (round 3.2.1, picture-audit.md) — RULE-BASED.
// Every picture is read LIVE from app.js / rescue.js / lessons.js /
// learning.js / stories.js at test time and checked against depiction
// rules a non-reading 5½-year-old needs:
//   * a picture must depict its word — never a whole animal for a body
//     part, never an object for an action, never a coloured dot for a
//     planet, never one picture for several different words;
//   * no question picture may reveal its correct answer or depict a
//     wrong choice (the 🤔 guard);
//   * number answers are Arabic-Indic digits, never fingers or Latin keys;
//   * مستطيل is a drawn SVG rectangle.
// The guard itself is tested with synthetic adversarial questions, not
// just the current bank, and the two copies (app.js + rescue.js) must
// agree on every bank and story question.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const stories = require(path.join(root, "stories.js"));

const appSrc = read("app.js");
const rescueSrc = read("rescue.js");
const lessonsSrc = read("lessons.js");
const learningSrc = read("learning.js");
const storiesSrc = read("stories.js");

// ---------- live extraction (string-aware bracket matching) ----------
function extractValue(src, marker) {
  const start = src.indexOf(marker);
  assert.ok(start >= 0, "missing: " + marker);
  let i = start;
  while (i < src.length && src[i] !== "{" && src[i] !== "[") i++;
  assert.ok(i < src.length, "no value after: " + marker);
  const stack = [];
  let q = null, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{" || c === "[" || c === "(") stack.push(c);
    else if (c === "}" || c === "]" || c === ")") {
      stack.pop();
      if (stack.length === 0) return src.slice(i, j + 1);
    }
  }
  throw new Error("unbalanced value: " + marker);
}
const evalLiteral = lit => vm.runInNewContext("(" + lit + ")", Object.create(null));

const bank = evalLiteral(extractValue(appSrc, "const bank="));
const pics = evalLiteral(extractValue(appSrc, "window.AnswerPics="));
const shapeIcons = evalLiteral(extractValue(appSrc, "const shapeIcons="));
const shapeSvg = evalLiteral(extractValue(appSrc, "const shapeSvg="));
const storyPics = evalLiteral(extractValue(storiesSrc, "const STORY_PICS ="));
const lessons = evalLiteral(extractValue(lessonsSrc, "const lessons ="));
const marks = evalLiteral(extractValue(lessonsSrc, "const marks ="));
const combinedPics = { ...pics, ...storyPics }; // STORY_PICS wins, like answerPic

const allBankQs = Object.values(bank).flat();
function storyQuestions() {
  const out = [];
  for (const s of stories.STORIES) {
    if (Array.isArray(s.questions)) out.push(...s.questions);
    if (Array.isArray(s.stages)) for (const st of s.stages) {
      if (Array.isArray(st.questions)) out.push(...st.questions);
    }
  }
  return out;
}
const allStoryQs = storyQuestions();

// ---------- the two question-picture guards, evaluated live ----------
function loadGuard(src, kind) {
  const m = src.match(/const PIC_MEANS=(\{.*?\});/s);
  assert.ok(m, kind + ": PIC_MEANS missing");
  const fnSrc = kind === "app"
    ? "function questionEmojiSafe(q)" + extractValue(src, "function questionEmojiSafe")
    : "const safeQuestionEmoji=q=>" + extractValue(src, "const safeQuestionEmoji=");
  const ctx = vm.createContext({ window: { AnswerPics: pics } });
  vm.runInContext("const PIC_MEANS=" + m[1] + ";\n" + fnSrc +
    "\nthis.__guard=" + (kind === "app" ? "questionEmojiSafe" : "safeQuestionEmoji") + ";", ctx);
  return ctx.__guard;
}
const appGuard = loadGuard(appSrc, "app");
const rescueGuard = loadGuard(rescueSrc, "rescue");

// ---------- independent depiction check (from the audit, NOT the guard) ----------
// emoji (variation selector stripped) -> the answer words it depicts.
// A question picture is unsafe when it depicts ANY of its choices.
const stripVS = s => String(s || "").replace(/\uFE0F/g, "");
// The three keys with a VS16 form are written as escapes so this table
// can never silently mismatch on an invisible variation selector.
const DEPICTS = {
  "🌞": ["الشمس"],
  "🌙": ["القمر", "قمر"],
  "🦊": ["الثعلب", "ثعلب", "برتقالي"],
  "🐯": ["النمر", "نمر"],
  "🦋": ["الفراشة", "فراشة", "جناحيها", "الأجنحة"],
  "🌿": ["الورقة", "ورقة", "العشب", "أخضر"],
  "\u{1F326}": ["بعد المطر", "المطر"],
  "🏃": ["نزقها برجلينا"],
  "\u{1F3D6}": ["هتطفو فوق المية", "هتطفو فوق", "الماء", "البحر"],
  "🌌": ["بالليل", "الليل", "النجوم"],
  "\u2744": ["بطريق", "الثلج"],
  "🍌": ["الموز", "موز", "أصفر"],
  "🍅": ["الطماطم", "طماطم", "أحمر"],
  "🌱": ["أخضر", "العشب"],
  "🩺": ["القلب"],
  "🟪": ["مربع"],
  "🔺": ["مثلث"],
  "🐔": ["الفرخة", "فرخة"],
  "🌾": ["القمح"],
};
function depictsChoice(shown, word, picMap) {
  if (!shown || !word) return false;
  // Single-letter answers: their AnswerPics entry is the letter's mnemonic
  // word-picture (ت→🍎), not a depiction of the glyph — it cannot reveal
  // which letter is first, so it must not count as depicting the choice.
  if (String(word).length <= 1) return false;
  const s = stripVS(shown);
  if (picMap && picMap[word] && stripVS(picMap[word]) === s) return true;
  for (const [emoji, words] of Object.entries(DEPICTS)) {
    if (s.includes(emoji) && words.includes(word)) return true;
  }
  return false;
}
function questionPictureSafe(q, shown, picMap) {
  return (q.a || []).every(ans => !depictsChoice(shown, ans, picMap));
}
const isSvg = v => typeof v === "string" && v.startsWith("<svg") && v.endsWith("</svg>");
const assertSvg = (v, what) => {
  assert.ok(isSvg(v), what + " must be a drawn inline SVG, got: " + String(v).slice(0, 60));
  assert.ok(/viewBox=["']0 0 64 64["']/.test(v), what + " SVG must use viewBox 0 0 64 64");
  assert.ok(!/[{}]/.test(v), what + " SVG must not contain braces (breaks the AnswerPics regex in content.test.js)");
};

// ---------- the audit's known-wrong mappings (word -> forbidden picture) ----------
// Applied to every map that has the word. Compared variation-selector-free.
const DENY = [
  ["المعدة", "🍽️"], ["المعدة", "🫃"],
  ["ذيله", "🐎"], ["ذيلها", "🐎"],
  ["خرطومه", "🐘"], ["خرطومها", "🐘"], ["الخرطوم", "🐘"],
  ["الفرو", "🦊"], ["الفرو", "🐑"],
  ["القشور", "🐟"], ["القشور", "🐠"],
  ["الزعانف", "🐟"], ["القرون", "🦏"],
  ["الصوف", "🐑"], ["صوف", "🐑"],
  ["الجلد فقط", "🖐️"], ["الجلد فقط", "🧍"],
  ["الرعد", "🔊"],
  ["المريخ", "🔴"], ["المشتري", "🟠"], ["المشتري", "🪐"],
  ["الجذر", "🌱"], ["الجذر", "🥕"],
  ["القطب", "🧊"], ["القطب", "❄️"],
  ["الفضاء", "🚀"],
  ["رمل", "🏖️"], ["رمل فقط", "🏖️"],
  ["هتطير", "🦅"], ["بيطير", "🦅"], ["هيدوب", "💧"],
  ["هتغوص لتحت", "⬇️"], ["هتكبر", "🎈"],
  ["بنحطها في الفرن", "🔥"], ["بندفنها في الرمل", "🏖️"],
  ["هتطفو فوق المية", "🛟"], ["هتطفو فوق", "🛟"],
  ["بيدوب وبيختفي جوه المية", "🍬"], ["نزقها برجلينا", "⚽"],
  ["هتختفي خالص", "🫥"], ["هيتكسر", "💥"],
  ["الشعر", "💇"], ["الأظافر", "💅"], ["نغلق الجهاز", "🔌"],
  ["البحيرة", "🌊"], ["نرتب الخطوات", "🪜"], ["توقف الشمس", "⏸️"],
  ["الماء وضوء الشمس", "🌞"], ["ناكلها", "🍽️"],
];
function checkDeny(map, mapName) {
  for (const [word, bad] of DENY) {
    if (word in map) {
      assert.notEqual(stripVS(map[word]), stripVS(bad),
        mapName + ": " + word + " must not be pictured as " + bad + " (audit: known-wrong mapping)");
    }
  }
}

// Words whose picture must be a DRAWN inline SVG (no emoji can depict them).
const SVG_WORDS_APP = [
  "المعدة", "ذيله", "خرطومه", "الفرو", "القشور", "الزعانف", "القرون", "الجلد فقط",
  "المريخ", "المشتري", "الشعر", "الأظافر", "نغلق الجهاز", "القطب",
  "رمل", "رمل فقط", "هتطفو فوق المية", "هتطفو فوق", "هتغوص لتحت", "هتكبر",
  "بنحطها في الفرن", "بندفنها في الرمل", "الجذر",
  "هتطير", "بيطير", "هيطير بعيد", "هيدوب", "هتدوب",
  "بيدوب وبيختفي جوه المية", "نزقها برجلينا", "هتختفي خالص", "هيتكسر", "نكسرها", "ناكلها",
];
// One picture per meaning: these groups must all have different pictures.
const DISTINCT_GROUPS = [
  ["المعدة", "طبق دائري", "ناكلها"],
  ["الزعانف", "القشور", "سمكة"],
  ["خرطومه", "فيل"],
  ["ذيله", "حصان"],
  ["الفرو", "الصوف"],
  ["الماء وضوء الشمس", "الشمس"],
  ["رمل", "حجر"],
];

test("AnswerPics: body parts and coverings are drawn close-ups, never the whole animal (audit Table 1)", () => {
  for (const word of ["المعدة", "ذيله", "خرطومه", "الفرو", "القشور", "الزعانف", "القرون", "الجلد فقط"]) {
    assert.ok(word in pics, "AnswerPics lost the word: " + word);
    assertSvg(pics[word], "AnswerPics " + word);
  }
  // wool is yarn, thunder is a storm cloud — the audit's exact pictures
  assert.equal(pics["الصوف"], "\u{1F9F6}", "wool must be yarn 🧶, not the sheep");
  assert.equal(pics["صوف"], "\u{1F9F6}", "wool must be yarn 🧶, not the sheep");
  assert.ok(["\u26C8", "\u{1F329}"].includes(stripVS(pics["الرعد"])), "thunder must be a storm cloud, got: " + pics["الرعد"]);
  checkDeny(pics, "AnswerPics");
});

test("AnswerPics: planets are drawn, actions are drawn, not objects or dots (audit Table 4a)", () => {
  for (const word of SVG_WORDS_APP) {
    assert.ok(word in pics, "AnswerPics lost the word: " + word);
    assertSvg(pics[word], "AnswerPics " + word);
  }
  // Jupiter is banded and never the ringed planet (that look is Saturn's,
  // and it would collide with زحل); Mars is a red planet, never a dot.
  assert.ok((pics["المشتري"].match(/fill='#/g) || []).length >= 3,
    "Jupiter must be a banded planet with several colours");
  assert.ok(pics["المشتري"].includes("c74a2a"), "Jupiter must show its red spot");
  assert.notEqual(pics["المشتري"], pics["زحل"], "Jupiter and Saturn must not share a picture");
  assert.ok(pics["المريخ"].includes("#e2603f"), "Mars must be a red planet");
  // space is the starry sky; water+sunlight shows both halves
  assert.equal(pics["الفضاء"], "\u{1F30C}", "space must be the starry sky 🌌, not a rocket");
  assert.equal(stripVS(pics["الماء وضوء الشمس"]), stripVS("\u{1F4A7}\u2600"), "water and sunlight must show both 💧☀️");
  assert.equal(stripVS(pics["ماء وضوء"]), stripVS("\u{1F4A7}\u2600"), "water and light must show both 💧☀️");
});

test("AnswerPics: one picture per meaning, and every value well-formed", () => {
  for (const group of DISTINCT_GROUPS) {
    const values = group.map(w => pics[w]);
    assert.equal(new Set(values).size, values.length,
      "one picture means several words, a child cannot tell them apart: " + group.join(" / ") + " -> " + values.join(" "));
  }
  for (const [k, v] of Object.entries(pics)) {
    assert.ok(v && String(v).length > 0, "AnswerPics has an empty picture: " + k);
    if (String(v).startsWith("<svg")) assertSvg(v, "AnswerPics " + k);
    else assert.ok(!/[0-9]/.test(v) && v !== "🔟", "Latin digit picture in AnswerPics: " + k + " -> " + v);
  }
});

test("shapeIcons fallback is fixed too (audit Table 5a) — dead code must not stay wrong", () => {
  checkDeny(shapeIcons, "shapeIcons");
  for (const word of ["المعدة", "الجلد فقط", "المشتري", "الفرو", "القشور", "الخرطوم",
    "الجذر", "القطب", "رمل", "المريخ", "الشعر", "الأظافر", "نغلق الجهاز", "يطير", "توقف الشمس"]) {
    assert.ok(word in shapeIcons, "shapeIcons lost the word: " + word);
    assertSvg(shapeIcons[word], "shapeIcons " + word);
  }
  assert.equal(shapeIcons["الصوف"], "\u{1F9F6}", "shapeIcons wool must be yarn 🧶");
  assert.equal(shapeIcons["الفضاء"], "\u{1F30C}", "shapeIcons space must be 🌌");
  assert.equal(shapeIcons["نرتب الخطوات"], "\u{1F4CB}", "arranging steps is a checklist 📋, not a ladder");
  assert.equal(stripVS(shapeIcons["الماء وضوء الشمس"]), stripVS("\u{1F4A7}\u2600"), "shapeIcons water+sunlight must show both");
  assert.equal(shapeIcons["زحل"], "🪐", "Saturn keeps its ringed planet");
  assert.notEqual(shapeIcons["المشتري"], shapeIcons["زحل"], "Jupiter must not collide with Saturn");
});

test("question-picture guard: synthetic reveal/distractor cases go 🤔, safe subjects stay", () => {
  const cases = [
    // [question, expected shown emoji]
    [{ q: "الثعلب لونه إيه؟", e: "🦊", a: ["برتقالي", "أزرق", "أخضر", "أسود"], c: 0 }, "🤔"],
    [{ q: "إيه أسرع حيوان في الغابة؟", e: "🐯", a: ["السلحفاة", "النمر", "الدب", "الفيل"], c: 1 }, "🤔"],
    [{ q: "الفراشة بتطير بإيه؟", e: "🦋", a: ["رجليها", "ذيلها", "جناحيها", "خرطومها"], c: 2 }, "🤔"],
    [{ q: "ظلنا بيظهر على الأرض لما نقف قدام إيه؟", e: "🌞", a: ["الشمس", "القمر", "الشجرة", "الباب"], c: 0 }, "🤔"],
    [{ q: "أي كلمة تبدأ بحرف م؟", e: "🌙", a: ["قمر", "موز", "تفاح", "باب"], c: 1 }, "🤔"],
    [{ q: "أي جزء من النبات يمتص الماء من التربة؟", e: "🌿", a: ["الجذر", "الزهرة", "الثمرة", "الورقة"], c: 0 }, "🤔"],
    [{ q: "أي شكل له أربعة أضلاع متساوية؟", e: "🟪", a: ["دائرة", "مربع", "مثلث", "نجمة"], c: 1 }, "🤔"],
    [{ q: "ما لون الموز الناضج؟", e: "🍌", a: ["أزرق", "أصفر", "أحمر", "أسود"], c: 1 }, "🤔"],
    [{ q: "ما لون الطماطم الناضجة غالباً؟", e: "🍅", a: ["أحمر", "أزرق", "بنفسجي", "أسود"], c: 0 }, "🤔"],
    [{ q: "ما العضو الذي يضخ الدم في الجسم؟", e: "🩺", a: ["القلب", "المعدة", "الأذن", "القدم"], c: 0 }, "🤔"],
    // safe subjects: the picture is the thing the question is about, not an answer
    [{ q: "أي حيوان يعطينا اللبن؟", e: "🐾", a: ["البقرة", "الأسد", "السمكة", "النسر"], c: 0 }, "🐾"],
    [{ q: "القمر يدور حول ماذا؟", e: "🌙", a: ["الأرض", "الشمس فقط", "المريخ", "النجوم"], c: 0 }, "🌙"],
    [{ q: "ما أول حرف في كلمة (بيت)؟", e: "🏠", a: ["ب", "ت", "ي", "م"], c: 0 }, "🏠"],
    [{ q: "أين تعيش الأسماك؟", e: "🐟", a: ["في الماء", "على الشجرة", "في الصحراء", "في السحاب"], c: 0 }, "🐟"],
    [{ q: "ماذا تعطينا الفرخة؟", e: "🐔", a: ["بيض", "لبن", "عسل", "صوف"], c: 0 }, "🐔"],
    [{ q: "سؤال بلا صورة؟", e: "", a: ["أ", "ب"], c: 0 }, "🤔"],
  ];
  for (const [q, expected] of cases) {
    assert.equal(appGuard(q), expected, "app guard wrong for: " + q.q + " (emoji " + q.e + ")");
    assert.equal(rescueGuard(q), expected, "rescue guard wrong for: " + q.q + " (emoji " + q.e + ")");
  }
});

test("bank question pictures never reveal the answer or depict a wrong choice (guard applied)", () => {
  assert.ok(allBankQs.length >= 85, "expected the whole bank, got " + allBankQs.length);
  for (const q of allBankQs) {
    const shown = appGuard(q);
    assert.ok(shown === q.e || shown === "🤔", "guard must only keep the emoji or neutralise it: " + q.q);
    assert.ok(questionPictureSafe(q, shown, pics),
      "question picture reveals the answer or depicts a wrong choice: " + q.q + " (shown " + shown + ", correct " + q.a[q.c] + ")");
    assert.equal(rescueGuard(q), shown, "rescue guard disagrees with app guard on: " + q.q);
  }
});

test("audit-flagged bank emojis are fixed in the data (Tables 2#4, 3, 4d)", () => {
  const byText = new Map(allBankQs.map(q => [q.q, q]));
  const expected = new Map([
    ["أي كلمة تبدأ بحرف م؟", "🔤"],
    ["أي جزء من النبات يمتص الماء من التربة؟", "🤔"],
    ["الشمس بتطلع منين الصبح؟", "🌅"],
    ["ظلنا بيظهر على الأرض لما نقف قدام إيه؟", "🤔"],
    ["الكرة بتتدحرج وتجري لما نعمل إيه؟", "🤔"],
    ["لو حطينا كرة خفيفة في المية، هتعمل إيه؟", "🤔"],
    ["إمتى بنشوف القمر والنجوم؟", "🤔"],
    ["ماذا تعطينا الفرخة؟", "🐔"],
    ["ماذا نلبس في القدم؟", "🤔"],
    ["أي طائر لا يستطيع الطيران؟", "🤔"],
  ]);
  for (const [qtext, emoji] of expected) {
    assert.ok(byText.has(qtext), "bank lost the question: " + qtext);
    assert.equal(byText.get(qtext).e, emoji, "question emoji not fixed: " + qtext);
  }
});

test("story question pictures never reveal the answer or depict a wrong choice (rendered questionHTML)", () => {
  assert.ok(allStoryQs.length >= 20, "expected the story questions, got " + allStoryQs.length);
  for (const q of allStoryQs) {
    const choices = q.a.map((text, i) => ({ text, correct: i === q.c }));
    const html = stories.questionHTML(q, choices);
    const m = html.match(/<div class="question-emoji">([\s\S]*?)<\/div>/);
    assert.ok(m, "questionHTML has no question-emoji div: " + q.q);
    const shown = m[1];
    assert.ok(questionPictureSafe(q, shown, combinedPics),
      "story question picture reveals the answer or depicts a wrong choice: " + q.q +
      " (shown " + shown + ", correct " + q.a[q.c] + ")");
  }
});

test("STORY_PICS depict their words (audit Tables 1#11-12, 4a, 4b)", () => {
  checkDeny(storyPics, "STORY_PICS");
  // a forest is a group of trees, never one tree (audit Table 4a)
  for (const word of ["الغابة", "في الغابة"]) {
    assert.ok(word in storyPics, "STORY_PICS lost the word: " + word);
    assert.ok(["🌲🌲", "🌳🌳"].includes(storyPics[word]) || isSvg(storyPics[word]),
      word + " must be a group of trees 🌲🌲, not one tree: " + storyPics[word]);
  }
  for (const [k, v] of Object.entries(storyPics)) {
    assert.ok(v && String(v).length > 0, "STORY_PICS has an empty picture: " + k);
    if (String(v).startsWith("<svg")) assertSvg(v, "STORY_PICS " + k);
    else assert.ok(!/[0-9]/.test(v), "Latin digit picture in STORY_PICS: " + k + " -> " + v);
  }
});

test("STORY_PICS: the river jump is drawn, never its splash (audit Table 4a)", () => {
  // The draft itself flags نط النهر 💦 as a known weak spot and says a
  // drawn jumping-horse picture would be better; the illustrator owns it.
  assert.ok(isSvg(storyPics["نط النهر"]),
    "نط النهر (jumped the river) must be a drawn jumping horse, not a splash: " + storyPics["نط النهر"]);
});

test("every bank and story answer is pictured (Matthew cannot read yet)", () => {
  let checked = 0;
  for (const q of allBankQs) for (const a of q.a) {
    assert.ok(pics[a], "bank answer has no picture: " + a + " (" + q.q + ")");
    checked++;
  }
  for (const q of allStoryQs) for (const a of q.a) {
    assert.ok(combinedPics[a], "story answer has no picture: " + a + " (" + q.q + ")");
    checked++;
  }
  assert.ok(checked >= 400, "expected to check all answers, got " + checked);
});

test("number answers are Arabic-Indic digits (notes 26–28)", () => {
  const wordToDigit = { "واحد": "١", "واحدة": "١", "اثنان": "٢", "اثنتان": "٢", "ثلاثة": "٣", "ثلاث": "٣", "أربعة": "٤", "أربع": "٤", "خمسة": "٥", "خمس": "٥", "ستة": "٦", "سبعة": "٧", "ثمانية": "٨", "تسعة": "٩", "عشرة": "١٠", "اثنا عشر": "١٢" };
  for (const [w, d] of Object.entries(wordToDigit)) assert.strictEqual(pics[w], d, "number-word picture: " + w);
  for (const d of ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠", "١١", "١٢", "١٣", "١٤", "١٦", "١٧"]) assert.strictEqual(pics[d], d, "digit picture: " + d);
  const numWord = /^(واحد|واحدة|اثنان|اثنتان|ثلاثة|ثلاث|أربعة|أربع|خمسة|خمس|ستة|سبعة|ثمانية|تسعة|عشرة|اثنا عشر)$/;
  const isNumberAnswer = a => /^[٠-٩]+$/.test(a) || numWord.test(a);
  for (const q of [...allBankQs, ...allStoryQs]) {
    for (const a of q.a) {
      if (!isNumberAnswer(a)) continue;
      const pic = combinedPics[a];
      assert.ok(/^[٠-٩]+$/.test(pic),
        "number answer must be pictured as Arabic-Indic digits only: " + a + " -> " + pic + " (" + q.q + ")");
    }
  }
  // no finger emoji or Latin keycap anywhere a number is pictured
  for (const [k, v] of Object.entries(combinedPics)) {
    if (isNumberAnswer(k)) assert.ok(!/☝️|✌️|🤟/.test(String(v)), "finger emoji for a number: " + k + " -> " + v);
  }
});

test("مستطيل is a drawn SVG rectangle, not a framed picture (note 29)", () => {
  const rect = pics["مستطيل"];
  assert.ok(isSvg(rect) && rect.includes("<rect"), "مستطيل must be a drawn rectangle SVG, got: " + rect);
  assert.ok(!rect.includes("🖼️"), "مستطيل must not be the framed-picture emoji");
  const m = rect.match(/<rect[^>]*width="(\d+)"[^>]*height="(\d+)"/);
  assert.ok(m && Number(m[1]) > Number(m[2]), "مستطيل rectangle must be wider than tall");
  assert.strictEqual(pics["مربع"], "🟦", "مربع must be a square");
  assert.strictEqual(pics["مثلث"], "🔺", "مثلث must be a triangle");
  assert.strictEqual(pics["دائرة"], "🔵", "دائرة must be a circle");
  const svgRect = shapeSvg.rectangle;
  assert.ok(isSvg(svgRect) && svgRect.includes("<rect"), "shapeSvg rectangle must be a drawn SVG too");
});

test("lessons.js: cage, desk, ask, cave are drawn; example is 📝 (3.2.3 F1b); harakat are mouth drawings (Tables 1#13-14, 4c)", () => {
  const emojiOf = {};
  for (const l of lessons) l.words.forEach((w, i) => { emojiOf[w] = l.emoji[i]; });
  assertSvg(emojiOf["قَفَص"], "قفص (cage)");
  assert.ok(emojiOf["قَفَص"].includes("V54"), "cage must show vertical bars");
  assertSvg(emojiOf["مَكْتَب"], "مكتب (desk)");
  assert.ok(emojiOf["مَكْتَب"].includes("e8b06a"), "desk must show its drawer");
  assertSvg(emojiOf["سَأَلَ"], "سأل (asked)");
  assert.ok(emojiOf["سَأَلَ"].includes("7c5cff"), "asked must show a speech bubble");
  // Round 3.2.3 F1b: the chalkboard "١+١=٢" SVG rendered confusingly
  // (looked like "Γ=1+1") and a maths sum does not depict "an example" —
  // مثال is a 📝 note now, which the audit explicitly allows ("or an emoji").
  assert.equal(emojiOf["مِثَال"], "📝", "مثال (example) must be 📝, not the confusing chalkboard sum");
  assertSvg(emojiOf["مَغَارَة"], "مغارة (cave)");
  assert.ok(emojiOf["مَغَارَة"].includes("#2b2f36"), "cave must show its dark opening");
  const markEmoji = Object.fromEntries(marks.map(m => [m.name, m.emoji]));
  for (const name of ["الفتحة", "الضمة", "الكسرة"]) {
    assertSvg(markEmoji[name], name);
    assert.ok(markEmoji[name].includes("#e14b6d"), name + " must show its red mark");
  }
  assert.equal(markEmoji["السكون"], "🤫", "sukun keeps its shushing face 🤫");
  for (const l of lessons) for (const e of l.emoji) assert.ok(e && String(e).length > 0, "letter word without a picture: " + l.letter);
});

test("learning.js: X is a drawn xylophone, not a music note (Table 1#15)", () => {
  assert.ok(!learningSrc.includes("🎵"), "learning.js must not picture the xylophone as a music note 🎵");
  const m = learningSrc.match(/\["🍎"(?:,"(?:[^"\\]|\\.)*")*\]/);
  assert.ok(m, "english emoji array not found in learning.js");
  const emojis = JSON.parse(m[0]);
  assert.equal(emojis.length, 26, "expected 26 english letter pictures, got " + emojis.length);
  const xylo = emojis[23]; // X
  assertSvg(xylo, "X xylophone");
  assert.ok((xylo.match(/<rect/g) || []).length >= 5, "xylophone must show its bars");
  assert.ok(xylo.includes("<circle"), "xylophone must show its mallets");
});

test("rescue.js: animals hero rides horseback, and the question render uses the guard (§5c, Table 2#4)", () => {
  assert.ok(!rescueSrc.includes("🤴🗡️"), "no adventure hero may be king-plus-sword without the horse");
  assert.equal((rescueSrc.match(/hero: "🤴🐴"/g) || []).length, 2,
    "rescue + animals heroes must both be king on horseback 🤴🐴");
  assert.ok(rescueSrc.includes("safeQuestionEmoji(current)"),
    "rescue.js must guard the question picture at render time");
  assert.ok(appSrc.includes('$("questionEmoji").textContent=questionEmojiSafe(q);'),
    "app.js showQuestion must use the guard");
  assert.ok(appSrc.includes("window.questionEmojiSafe=questionEmojiSafe"),
    "app.js must expose the guard for other modules");
  for (const q of [...allBankQs, ...allStoryQs]) {
    assert.equal(rescueGuard(q), appGuard(q), "guards disagree on: " + q.q);
  }
});
