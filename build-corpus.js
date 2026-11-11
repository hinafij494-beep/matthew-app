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
  const n = norm(text);
  if (!n || corpus.has(n)) return;
  corpus.set(n, { key, lang, text });
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
    const syl = [L.base + FATHA, L.base + KASRA, L.base + DAMMA, L.base + "ا", L.base + "ي", L.base + "و"];
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
    add("num_ar_l_" + i, "ده رقم " + n + ". " + (i + 1));
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

const out = [...corpus.values()];
fs.writeFileSync(path.join(root, "audio-src/corpus.json"), JSON.stringify(out, null, 1));
console.log("corpus entries:", out.length);
console.log("ar:", out.filter(x => x.lang === "ar_EG").length, "| en:", out.filter(x => x.lang !== "ar_EG").length);
