// build-corpus.js — extracts every fixed spoken string in the app into
// audio-src/corpus.json so the teacher-voice clips can cover the whole app.
// Sources: keyed clips.json, quiz bank (app.js), science lessons, letter
// school (lessons.js incl. explainFor port), reading data, math number lines.
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const root = __dirname;
const read = n => fs.readFileSync(path.join(root, n), "utf8");
const ev = code => vm.runInNewContext("(" + String(code).replace(/;\s*$/, "") + ")", Object.create(null));

const corpus = new Map(); // normalized -> {key, lang, text}
const DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
const norm = s => String(s || "")
  .replace(/[٠-٩]/g, c => DIGITS[c])
  .replace(/[ً-ٰٟـ]/g, "")
  .replace(/[^ء-يa-zA-Z0-9 ]/g, " ")
  .replace(/\s+/g, " ").trim().toLowerCase();
const add = (key, text, lang = "ar_EG") => {
  // Round 3.2: taught letter names/sounds/syllables are recorded in Fusha
  // (ar_SA) — the Egyptian dialect renders ج/ق/ث/ذ/ظ non-scholastically.
  // The override keys off the clip key, so it survives regeneration.
  if (/^(les_namesound|basic_ar|rd_syl)_/.test(key)) lang = "ar_SA";
  const n = norm(text);
  if (!n) return;
  // Short vocalised texts (syllables like بَ بِ بُ) differ ONLY by their
  // diacritics: dedupe them by their exact text or the vowels collapse
  // into a single clip and every haraka sounds the same.
  const bare = text.replace(/[ً-ٰٟـ]/g, "").trim();
  const dedupeKey = /[ً-ٟ]/.test(text) && bare.length <= 3 ? "exact:" + text.trim() : n;
  if (corpus.has(dedupeKey)) return;
  corpus.set(dedupeKey, { key, lang, text });
};

// 1) keyed clips (praise, stories, greetings...)
const keyed = JSON.parse(read("audio-src/clips.json"));
for (const [key, v] of Object.entries(keyed)) add(key, v.text, v.lang);

// 2) quiz bank questions
{
  const src = read("app.js");
  const bank = ev(src.slice(src.indexOf("const bank=") + "const bank=".length, src.indexOf("\nconst names=")));
  for (const [cat, qs] of Object.entries(bank)) qs.forEach((q, i) => add("qb_" + cat + "_" + i, q.q));
}

// 2b) quiz ANSWERS (the app must pronounce answers too) + correct-answer prefix
{
  const src = read("app.js");
  const bank = ev(src.slice(src.indexOf("const bank=") + "const bank=".length, src.indexOf("\nconst names=")));
  let ai = 0;
  for (const qs of Object.values(bank)) for (const q of qs) for (const a of q.a) add("ans_" + (ai++), a);
  add("correct_is", "الإجابة الصحيحة هي");
}

// 3) science lessons: spoken string is title + ". " + short + " " + long
{
  const src = read("science.js");
  const subjects = ev(src.slice(src.indexOf("const subjects = ") + "const subjects = ".length, src.indexOf("];", src.indexOf("const subjects = ")) + 1));
  subjects.forEach((s, si) => s.lessons.forEach((l, li) => add("sci_" + si + "_" + li, l[0] + ". " + l[2] + " " + l[3])));
}

// 4) letter school
{
  const src = read("lessons.js");
  const lessons = [...src.matchAll(/\{letter:"([^"]+)",name:"([^"]+)",forms:\[([^\]]+)\],words:\[([^\]]+)\],emoji:\[([^\]]+)\],sound:"([^"]+)"\}/g)]
    .map(m => ({ letter: m[1], name: m[2], forms: JSON.parse("[" + m[3] + "]"), words: JSON.parse("[" + m[4] + "]"), emoji: JSON.parse("[" + m[5] + "]"), sound: m[6] }));
  const hints = ev(src.slice(src.indexOf("const HINTS = ") + "const HINTS = ".length, src.indexOf("};", src.indexOf("const HINTS = ")) + 1));
  const marks = ev(src.slice(src.indexOf("const marks = ") + "const marks = ".length, src.indexOf("];", src.indexOf("const marks = ")) + 1));
  const explainFor = l => {
    const hint = hints[l.letter] || "اسمع صوته كويس وقوله ورايا بصوت عالي.";
    const spoken = "ده حرف " + l.name + "، وصوته " + l.sound + ". " + hint +
      " شكله بيتغير حسب مكانه في الكلمة: في أول الكلمة بيبقى " + l.forms[0] + "، وفي نص الكلمة " + l.forms[1] + "، وفي آخر الكلمة " + l.forms[2] + "." +
      " بنشوفه في كلمات بنعرفها زي " + l.words[0] + " و" + l.words[1] + " و" + l.words[2] + "." +
      " يلا نقول صوته مع بعض بصوت عالي: " + l.sound + "، " + l.sound + "، " + l.sound + "!";
    const short = "ده حرف " + l.name + "، وصوته " + l.sound + ". " + hint;
    return { spoken, short };
  };
  lessons.forEach((l, i) => {
    const ex = explainFor(l);
    add("let_full_" + i, ex.spoken);
    add("let_short_" + i, ex.short);
    add("let_forms_" + i, "أشكال حرف " + l.name + ". " + l.words.join("، "));
    marks.forEach((m, mi) => {
      const sample = l.letter === "أ" ? ["أَ", "أُ", "إِ", "أْ"][mi] : l.letter + m.mark;
      add("let_mark_" + i + "_" + mi, m.name + "، " + sample + ". " + m.hint);
    });
    add("let_q1_" + i, "ما اسم هذا الحرف؟ " + l.letter);
    add("let_q2_" + i, "أي شكل لحرف " + l.name + " في أول الكلمة؟");
    l.words.forEach((w, wi) => add("let_word_" + i + "_" + wi, w));
  });
  marks.forEach(m => add("let_qmark_" + m.name, "ما اسم الحركة في " + m.sample + "؟"));
  add("let_qsyl_1", "أي مقطع عليه فتحة؟");
  add("let_qsyl_2", "أي مقطع عليه ضمة؟");
  add("let_qsyl_3", "أي مقطع عليه كسرة؟");
  add("let_qsyl_4", "أي مقطع عليه سكون؟");
  add("let_quizintro", "أحسنت يا ماثيو. يلا نبدأ الاختبار");
}

// 5) reading
{
  const src = read("reading.js");
  const grab = name => ev(src.slice(src.indexOf("const " + name + " = ") + ("const " + name + " = ").length, src.indexOf("];", src.indexOf("const " + name + " = ")) + 1));
  const LETTERS = grab("LETTERS"), AR_WORDS = grab("AR_WORDS"), CVC = grab("CVC_WORDS");
  const FATHA = "َ", KASRA = "ِ", DAMMA = "ُ";
  LETTERS.forEach((L, i) => {
    // Mirror of reading.js syllablesFor: الألف has special forms (إِ / آ).
    const syl = L.base === "أ" ? ["أَ", "إِ", "أُ", "آ", "إي", "أو"]
      : [L.base + FATHA, L.base + KASRA, L.base + DAMMA, L.base + "ا", L.base + "ي", L.base + "و"];
    syl.forEach((s, si) => add("rd_syl_" + i + "_" + si, s));
    add("rd_intro_" + i, L.name + ". " + syl[0] + ". " + syl[3]);
  });
  AR_WORDS.forEach((w, i) => {
    w.parts.forEach((p, pi) => add("rd_part_" + i + "_" + pi, p));
    add("rd_word_" + i, w.word);
    add("rd_blend_" + i, w.parts.join("، ") + ". " + w.word);
  });
  CVC.forEach((w, i) => {
    w.sounds.forEach((s, si) => add("rd_cvc_s_" + i + "_" + si, s, "en_US"));
    add("rd_cvc_" + i, w.word, "en_US");
    add("rd_cvc_blend_" + i, w.sounds.join(", ") + ". " + w.word, "en_US");
  });
}

// 6) math number lines (1-20, both journeys)
{
  const ar = read("math-journey.js");
  const arNames = ev(ar.slice(ar.indexOf("const names=") + "const names=".length, ar.indexOf("];", ar.indexOf("const names=")) + 1));
  arNames.forEach((n, i) => {
    add("num_ar_" + i, "ده رقم " + n + ". يلا نعدّ الصور سوا");
    add("num_ar_l_" + i, "ده رقم " + n + ". " + n);
  });
  const en = read("math-english.js");
  const enNames = ev(en.slice(en.indexOf("const names=") + "const names=".length, en.indexOf("];", en.indexOf("const names=")) + 1));
  enNames.forEach((n, i) => {
    add("num_en_" + i, "Number " + n + ". Let us count together", "en_US");
    add("num_en_l_" + i, "Number " + n + ". " + (i + 1), "en_US");
  });
}

// 7) a few fixed lines from other modules
add("ig_pickword", "اختار الكلمة المناسبة للصورة");
add("voice_test_line", "أهلاً يا ملك ماثيو! يلا نتعلم ونلعب. برافو يا بطل!");


// 8) math journey question lines — questions(n) is a deterministic function of the
// level in both journeys, and say() speaks q + " " + ex as one string. Mirror the
// generators exactly so every journey question has a recorded clip.
{
  const digits = n => String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]);
  const arSrc = read("math-journey.js");
  const arNames = ev(arSrc.slice(arSrc.indexOf("const names=") + "const names=".length, arSrc.indexOf("];", arSrc.indexOf("const names=")) + 1));
  const enSrc = read("math-english.js");
  const enNames = ev(enSrc.slice(enSrc.indexOf("const names=") + "const names=".length, enSrc.indexOf("];", enSrc.indexOf("const names=")) + 1));
  for (let n = 1; n <= 20; n++) {
    const prev = Math.max(0, n - 1), next = Math.min(20, n + 1);
    const addA = Math.max(1, Math.floor(n / 2)), addB = Math.max(1, Math.min(5, n - addA));
    const subA = Math.min(20, n + 2), subB = 2;
    const apples = a => a === 1 ? "تفاحة واحدة" : digits(a) + " تفاحات";
    const aq = [
      ["عدّ الصور: كام واحدة؟", "عدّ كل صورة واحدة واحدة. المجموع " + digits(n) + "."],
      ["إيه الرقم اللي بعد " + digits(n) + "؟", "بعد " + arNames[n - 1] + " بييجي " + arNames[next - 1] + "."],
      ["إيه الرقم اللي قبل " + digits(next) + "؟", "قبل " + arNames[next - 1] + " بييجي " + arNames[n - 1] + "."],
      ["معانا " + apples(addA) + " وزودنا " + (addB === 1 ? "واحدة" : digits(addB)) + "، بقوا كام؟", arNames[addA - 1] + " زائد " + arNames[addB - 1] + " يساوي " + arNames[addA + addB - 1] + ". عدّهم مع بعض."],
      ["كان معانا " + digits(subA) + " نجوم واختفى " + digits(subB) + "، فاضل كام؟", arNames[subA - 1] + " ناقص " + arNames[subB - 1] + " يساوي " + arNames[subA - subB - 1] + ". شيل اتنين وعدّ الباقي."],
      ["اختار العدد الأكبر: " + digits(n) + " ولا " + digits(prev), "العدد الأكبر هو " + digits(Math.max(n, prev)) + "."]
    ];
    aq.forEach(([q, ex], i) => add("math_ar_q" + n + "_" + i, q + " " + ex));
    const eq = [
      ["Count the pictures. How many are there?", "Count each picture once. There are " + n + "."],
      ["What number comes after " + n + "?", "After " + enNames[n - 1] + " comes " + enNames[next - 1] + "."],
      ["What number comes before " + next + "?", "Before " + enNames[next - 1] + " comes " + enNames[n - 1] + "."],
      ["You have " + addA + " apples and get " + addB + " more. How many now?", addA + " + " + addB + " = " + (addA + addB) + ". Count them together."],
      ["You have " + subA + " stars. " + subB + " disappear. How many are left?", subA + " - " + subB + " = " + (subA - subB) + "."],
      ["Which number is bigger: " + n + " or " + prev + "?", Math.max(n, prev) + " is the bigger number."]
    ];
    eq.forEach(([q, ex], i) => add("math_en_q" + n + "_" + i, q + " " + ex, "en_US"));
  }
}

// 9) letter-school spoken combinations (steps, mark tab, quiz narration)
{
  const src = read("lessons.js");
  const grabArr = decl => { const i = src.indexOf(decl); let depth = 0; const j = src.indexOf("[", i); for (let k = j; k < src.length; k++) { if (src[k] === "[") depth++; if (src[k] === "]") { depth--; if (!depth) return ev(src.slice(j, k + 1)); } } };
  const L = grabArr("const lessons ="), M = grabArr("const marks =");
  const HINTS = ["نفتح الفم قليلاً", "نضم الشفتين", "نكسر الصوت", "نسكن الحرف بلا حركة"];
  const sampleFor = (l, mi) => l.letter === "أ" ? ["أَ", "أُ", "إِ", "أْ"][mi] : l.letter + M[mi].mark;
  L.forEach((l, li) => {
    add("les_namesound_" + li, l.name + "، " + l.sound);
    M.forEach((m, mi) => add("les_marklisten_" + li + "_" + mi, HINTS[mi] + "، " + sampleFor(l, mi)));
    const q1 = "ما اسم هذا الحرف؟ " + l.letter, q2 = "أي شكل لحرف " + l.name + " في أول الكلمة؟";
    add("les_quiz1_" + li, q1 + ". اختار الإجابة الصحيحة"); add("les_quiz1b_" + li, q1 + " اختار الإجابة الصحيحة");
    add("les_quiz2_" + li, q2 + ". اختار الإجابة الصحيحة"); add("les_quiz2b_" + li, q2 + " اختار الإجابة الصحيحة");
  });
  M.forEach((m, mi) => {
    const q = "ما اسم الحركة في " + m.sample + "؟";
    add("les_quizm_" + mi, q + ". اختار الإجابة الصحيحة"); add("les_quizmb_" + mi, q + " اختار الإجابة الصحيحة");
  });
  ["أي مقطع عليه فتحة؟", "أي مقطع عليه ضمة؟", "أي مقطع عليه كسرة؟", "أي مقطع عليه سكون؟"].forEach((q, i) => {
    add("les_qsylq_" + i, q + ". اختار الإجابة الصحيحة"); add("les_qsylqb_" + i, q + " اختار الإجابة الصحيحة");
  });
}

// 10) touch-game target lines
["حرف الألف", "حرف الباء", "حرف التاء", "حرف الميم", "الرقم واحد", "الرقم اتنين", "الرقم تلاتة", "الرقم أربعة"]
  .forEach((s, i) => add("touch_pick_" + i, "اسمع كويس يا ماثيو. اختار " + s));

// 11) basic-learning spoken lines (learning.js item.speak compositions)
{
  const src = read("learning.js");
  const grabLit = decl => { const i = src.indexOf(decl); let depth = 0; const j = src.indexOf("[", i); for (let k = j; k < src.length; k++) { if (src[k] === "[") depth++; if (src[k] === "]") { depth--; if (!depth) return ev(src.slice(j, k + 1)); } } };
  const arPairs = grabLit("const arabicLetters = [");
  arPairs.forEach((x, i) => add("basic_ar_" + i, x[0] + "، " + x[1]));
  const words = grabLit("const englishWords = [");
  const phon = grabLit("const phonicsSounds=[");
  words.forEach((w, i) => { const L = String.fromCharCode(65 + i); add("basic_en_" + i, L + ", lowercase " + L.toLowerCase() + ", " + phon[i] + ", for " + w, "en_US"); });
  const arNames = grabLit("const arabicNames=[");
  const arDigits = grabLit("const arabicDigits=[");
  arDigits.forEach((d, i) => add("basic_arnum_" + i, arNames[i] + "، " + d));
  const enNames = grabLit("const englishNames=[");
  enNames.forEach((n, i) => add("basic_ennum_" + i, n, "en_US"));
}

// 12) workshop color games (color-games.js spoken lines — mirrors the
// runtime generators so every composed sentence has a recorded clip)
{
  const src = read("color-games.js");
  const grabLit = decl => { const i = src.indexOf(decl); let depth = 0; const j = src.indexOf("[", i); for (let k = j; k < src.length; k++) { if (src[k] === "[") depth++; if (src[k] === "]") { depth--; if (!depth) return ev(src.slice(j, k + 1)); } } };
  const grabObj = decl => { const i = src.indexOf(decl); const j = src.indexOf("{", i); let depth = 0; for (let k = j; k < src.length; k++) { if (src[k] === "{") depth++; if (src[k] === "}") { depth--; if (!depth) return ev(src.slice(j, k + 1)); } } };
  const COLORS = grabLit("const COLORS = [");
  const NATURE = grabLit("const NATURE = [");
  const PATTERN_TYPES = grabLit("const PATTERN_TYPES = [");
  const PATTERN_PAIRS = grabLit("const PATTERN_PAIRS = [");
  const NUM_WINDOWS = grabLit("const NUM_WINDOWS = [");
  const NUM_NAMES = grabLit("const NUM_NAMES = [");
  const INSTRUCTIONS = grabObj("const INSTRUCTIONS = {");
  const colorById = id => COLORS.find(c => c.id === id) || COLORS[0];
  add("cg_instr_numbers", INSTRUCTIONS.numbers);
  add("cg_instr_nature", INSTRUCTIONS.nature);
  add("cg_instr_patterns", INSTRUCTIONS.patterns);
  COLORS.forEach((c, i) => add("cg_color_" + i, c.name));
  add("cg_try", "حاول تاني يا بطل");
  // numbers game: 4 round intros + 20 numbers x 5 message types
  NUM_WINDOWS.forEach((w, wi) => add("cg_num_intro_" + wi, "جولة جديدة يا بطل! دلوقتي هنلوّن الأرقام من " + NUM_NAMES[w[0] - 1] + " لـ " + NUM_NAMES[w[5] - 1] + "!"));
  NUM_NAMES.forEach((name, i) => {
    const n = i + 1;
    add("cg_num_done_" + n, "رقم " + name + "! دي اتلوّنت خلاص!");
    add("cg_num_pick_" + n, "رقم " + name + "! اختار لون الأول من اللوحة، وبعدين دوس على الجزء اللي رقمه نفس اللون");
    add("cg_num_all_" + n, "رقم " + name + "! برافو يا ملك ماثيو! لوّنت التاج كله! خدت ألماسة جديدة لتاجك!");
    add("cg_num_ok_" + n, "رقم " + name + "! برافو يا بطل! لوّنتها صح!");
    add("cg_num_try_" + n, "رقم " + name + "! حاول تاني يا بطل");
  });
  // nature game: tab-speech + question + fact lines (plain + set-complete)
  NATURE.forEach((item, i) => {
    add("cg_nat_tab_" + i, INSTRUCTIONS.nature + " دي " + item.name + "! لونها الحقيقي إيه يا ترى؟ اختار من اللوحة!");
    add("cg_nat_q_" + i, "دي " + item.name + "! لونها الحقيقي إيه يا ترى؟ اختار من اللوحة!");
    add("cg_nat_ok_" + i, item.fact + " برافو يا بطل!");
    add("cg_nat_all_" + i, item.fact + " برافو يا ملك ماثيو! لوّنت كل حاجات الطبيعة صح! خدت ألماسة جديدة لتاجك!");
  });
  // patterns game: 6 distinct rounds (type cycles every 3, pair every 6)
  for (let r = 1; r <= 6; r++) {
    const type = PATTERN_TYPES[(r - 1) % PATTERN_TYPES.length];
    const pair = PATTERN_PAIRS[(r - 1) % PATTERN_PAIRS.length];
    const a = colorById(pair[0]), b = colorById(pair[1]);
    const slots = type.slots.map(v => (v === 0 ? a : b));
    const seq = slots.slice(0, 5).map(c => c.name).join("، ");
    const target = slots[5];
    add("cg_pat_tab_" + r, INSTRUCTIONS.patterns + " بص على الصف يا بطل! " + seq + "، وبعدين إيه؟ اختار اللون الصح!");
    add("cg_pat_intro_" + r, "بص على الصف يا بطل! " + seq + "، وبعدين إيه؟ اختار اللون الصح!");
    add("cg_pat_ok_" + r, "برافو يا بطل! النمط كده صح! اللون الناقص هو " + target.name + "!");
    if (r % 3 === 0) add("cg_pat_all_" + r, "برافو يا بطل! النمط كده صح! اللون الناقص هو " + target.name + "! برافو يا ملك ماثيو! خلّصت ٣ أنماط! خدت ألماسة جديدة لتاجك!");
  }
}

const out = [...corpus.values()];
fs.writeFileSync(path.join(root, "audio-src/corpus.json"), JSON.stringify(out, null, 1));
console.log("corpus entries:", out.length);
console.log("ar:", out.filter(x => x.lang === "ar_EG").length, "| en:", out.filter(x => x.lang !== "ar_EG").length);
