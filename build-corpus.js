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
  // Round 3.2.1 (phonetics expert): rd_intro_* (reading intro: letter name
  // + syllables) and lsq_name_* (spoken letter names as quiz choices) are
  // letter names/sounds too — they were ar_EG, so ج was taught as [g] on
  // the first reading screen, contradicting the Fusha les_namesound/rd_syl.
  if (/^(les_namesound|rd_syl|tr_ar|rd_intro|lsq_name)_/.test(key)) lang = "ar_SA";
  const n = norm(text);
  if (!n) return;
  // Round 3.2.1: bare single-letter quiz answers are letter sounds too —
  // the same dialect defect (ج as "g") reaches tracing through them, so
  // they are recorded in Fusha as well. (Digits stay ar_EG: numbers are
  // spoken in Egyptian dialect by design.)
  if (key.startsWith("ans_") && /^[ء-ي]$/.test(n)) lang = "ar_SA";
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

// F7 (numbers-once): English bare-digit clips 11–20 (tr_ennum_11..20,
// staged in audio-src/opus/). FORCE-added (corpus keyed by clip key,
// bypassing the norm dedupe in add()) like §13's tr_ennum_1..10 — and
// placed BEFORE §2b on purpose: build-voice-clips.py builds BY_TEXT
// last-wins, so the later ans_* Arabic digit entries (١١/١٢/…) must win
// BY_TEXT for Arabic callers, while English callers reach these via the
// EXACT map (exact text "11" ≠ "١١" — the norms collide, so both land in
// EXACT) and via the voice-clips.js keyFor override.
["11", "12", "13", "14", "15", "16", "17", "18", "19", "20"].forEach((t, i) => {
  const k = "tr_ennum_" + (11 + i);
  corpus.set("key:" + k, { key: k, lang: "en_US", text: t });
});

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
    // Round 3.2.1 note 6: the short text is no longer spoken anywhere
    // (step 0 now auto-speaks the full explanation), so it leaves the corpus.
    // Step 1 narrates each letter form in its position with its example word.
    add("let_forms_" + i, "شكل حرف " + l.name + " في أول الكلمة " + l.forms[0] + " زي كلمة " + l.words[0] + "، وفي نص الكلمة " + l.forms[1] + " زي كلمة " + l.words[1] + "، وفي آخر الكلمة " + l.forms[2] + " زي كلمة " + l.words[2] + ".");
    marks.forEach((m, mi) => {
      const sample = l.letter === "أ" ? ["أَ", "أُ", "إِ", "أْ"][mi] : l.letter + m.mark;
      add("let_mark_" + i + "_" + mi, m.name + "، " + sample + ". " + m.hint + ": " + sample);
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
  add("let_picker", "اختار حرف يا ملك ماثيو"); // round 3.2.1 note 7: picker greeting
  // let_quizintro is gone with the quiz-intro screen (notes 10–11: the
  // quiz starts straight from the lesson or the picker).
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
    add("num_ar_l_" + i, "ده رقم " + n + ".");
  });
  const en = read("math-english.js");
  const enNames = ev(en.slice(en.indexOf("const names=") + "const names=".length, en.indexOf("];", en.indexOf("const names=")) + 1));
  enNames.forEach((n, i) => {
    add("num_en_" + i, "ده رقم " + n + ". يلا نعد مع بعض!");
    add("num_en_l_" + i, "Number " + n + ".", "en_US");
  });
  // Round 3.2.2 P0-5: bare-digit clips that did not exist at all.
  add("num_digit_0", "٠");
  add("num_digit_15", "١٥");
  add("num_digit_18", "١٨");
  add("num_digit_19", "١٩");
  add("num_digit_20", "٢٠");
  add("num_ar_tip", "كل صورة بنعدّها مرة واحدة. آخر رقم بنقوله هو عدد الصور كلها.");
  add("num_en_tip", "عدّ كل صورة مرة واحدة. آخر رقم تقوله هو المجموع.");
}

// 7) a few fixed lines from other modules
add("ig_pickword", "اختار الكلمة المناسبة للصورة");
add("voice_test_line", "أهلاً يا ملك ماثيو! يلا نتعلم ونلعب. برافو يا بطل!");
// Round 3.2.1 note 25b: مس نانسي joins the praise rotation (voice.js feedback).
add("praise_nancy", "بحبك يا ماثيو، برافو يا بطل!");
// Round 3.2.2 P1-7: calm medal + movement breaks (texts mirror app.js).
add("calm_medal", "برافو يا ملك ماثيو! خدت وسام الهدوء والدقة عشان جاوبت صح على مهلك!");
add("move_break_1", "نطّ ٥ مرات زي الأرنب");
add("move_break_2", "امشي زي الأسد ١٠ خطوات");
add("move_break_3", "ارفع إيديك لفوق ونزّلهم ٥ مرات");
// Round 3.2.1: math journey picker + finish lines (shared by both journeys).
add("num_picker", "اختار رقم يا ملك ماثيو");
for (let s = 0; s <= 4; s++) add("num_score_" + s, "جاوبت صح على " + "٠١٢٣٤"[s] + " من ٤.");
add("num_pass_tip", "عدّيت المرحلة! نروح للي بعدها.");
add("num_fail_tip", "راجع الشرح وجرب تاني، إنت تقدر!");
// Round 3.2.1: science picker lines + rescue narration + pronunciation
// words + quiz result lines (all spoken by the modules that use them).
add("sci_picker_subjects", "اختار عالم يا ملك ماثيو");
add("sci_picker_lessons", "اختار درس يا ملك ماثيو");
add("rescueInterstitial", "عدّيت مرحلة! كمّل كده وانت هتوصل…");
// Round 3.2.1: game intros (notes 19a/25b) — memory game + touch-game
// intros. Rule (2): the self-introduction belongs only in the opening
// greeting (nancy_greet_*), never in section intros.
add("storyPickerIntro", "أهلاً يا ملك ماثيو! كل قصة فيها مراحل وأسئلة جديدة كل مرة، اختار قصة وابدأ المغامرة يا بطل!");
add("touch_menu_intro", "أهلاً يا ملك ماثيو! بحبك أوي! دي ألعاب اللمس والصوت، اختار اللعبة اللي تعجبك يا بطل!");
add("touch_match_intro", "لعبة التوصيل يا ملك ماثيو! اضغط الصورة واسمع اسمها، وبعدين اضغط الكلمة اللي بتناسبها يا بطل!");
add("touch_listen_intro", "لعبة اسمع واختار يا ملك ماثيو! اسمع كويس واختار الصح يا بطل!");
add("touch_pic_apple", "تفاحة");
add("mem_intro", "لعبة الذاكرة يا ملك ماثيو! بحبك أوي! اقلب الكروت ولاقي الصورتين اللي شبه بعض يا بطل!");
add("mem_win", "برافو يا ملك ماثيو! لقيت كل الصور! أنت بطل الذاكرة! خدت ألماسة جديدة لتاجك!");
// Round 3.2.1 memory-game upgrade (spec §7): rotating match praises (the
// picture name is spoken first by its own clip, then the praise follows),
// half-way line, try-again lines, play-again line — texts mirror
// memory-game.js MEM_MATCH / MEM_HALF / MEM_TRY / MEM_AGAIN exactly.
add("mem_match_1", "برافو يا ملك ماثيو! شاطر خالص!");
add("mem_match_2", "يا سلام يا بطل ماثيو! الصورتين شبه بعض! عينك قوية أوي!");
add("mem_match_3", "أحسنت يا ملك ماثيو! أنت ذكي أوي يا بطل!");
add("mem_half", "برافو يا ملك ماثيو! لقيت نص الصور! كمّل يا بطل، فاضل شوية صغيرين!");
add("mem_try_1", "حاول تاني يا بطل");
add("mem_try_2", "قربت يا ملك ماثيو! افتكر مكان الصور وحاول تاني!");
add("mem_again", "يلا نلعب تاني يا ملك ماثيو! كروت جديدة مستنياك!");
// Round 3.2.2 (audit §2 gap): bare memory-game letter names — 8 cards had
// no clip at all and fell through to device TTS. Texts are the bare names
// the game speaks (memory-game.js card.name).
["ألف", "باء", "تاء", "ثاء", "جيم", "حاء", "خاء", "دال"].forEach((n, i) => add("mem_letter_" + i, n));
// Round 3.2.1 Nancy lines (note 25b — Miss Nancy draft §4, exact keys/texts).
// Game intros — texts mirror the modules: tracing.js NANCY_TRACE_INTRO,
// color-games.js NANCY_INTRO_COLOR[_NUM].
add("nancy_intro_trace", "يلا نتتبع الحرف يا ملك ماثيو! امشي على الخط بصوابعك على مهلك، أنت بطل!");
add("nancy_intro_color", "يلا نلوّن يا ملك ماثيو! اختار لون حلو ولوّن معايا!");
add("nancy_intro_color_num", "لعبة لوني العدد يا بطلي ماثيو! شوف الرقم على التاج ودوس على نفس الرقم في الزر!");
// Round 3.2.3 item 4: Nancy's voice is REMOVED from the coloring workshop —
// the same two intros re-recorded in Aria (new keys cg_intro_*; the Nancy
// keys above stay in the corpus for greeting/encouragement use elsewhere).
// cg_intro_color shares its exact text with nancy_intro_color, so add()
// would dedupe it away — FORCE-add by key like the tr_ennum_11..20
// precedent, AFTER the Nancy entry so BY_TEXT last-wins points the text
// at the Aria clip (color-games.js plays it by key anyway).
corpus.set("key:cg_intro_color", { key: "cg_intro_color", lang: "ar_EG", text: "يلا نلوّن يا ملك ماثيو! اختار لون حلو ولوّن معايا!" });
add("cg_intro_num", "لعبة لون العدد يا بطلي ماثيو! شوف الرقم على التاج ودوس على نفس الرقم في الزر!");
// Round 3.2.3 item 9: lesson-finish quiz offers (code plays them by key
// after a lesson completes, then the quiz opens). Texts mirror the code.
add("les_quiz_offer", "برافو يا بطل! خلصت الدرس! يلا نختبر نفسك! دوس على الكاس!");
add("quiz_offer_numbers", "برافو يا بطل! خلصت الدرس! يلا نختبر نفسك في الأرقام! دوس على الكاس!");
add("quiz_offer_science", "برافو يا بطل! خلصت الدرس! يلا نختبر نفسك في العلوم! دوس على الكاس!");
add("quiz_offer_reading", "برافو يا بطل! يلا نتحدى القراءة! دوس على الكاس!");
add("en_letters_done", "برافو يا بطل! خلصت كل الحروف الإنجليزية!");
// Home greetings (app.js NANCY_GREETS, spoken by text) + quiz intros
// (app.js NANCY_QUIZ_INTROS, first question only) + memory second intro
// (memory-game.js MEM_INTRO_2, rotated with MEM_INTRO) + the praise /
// try-again rotations (voice.js nancyPraiseKeys / nancyRetryKeys, played
// BY KEY — these keys must stay exactly as the draft wrote them, so Miss
// Nancy's real recordings drop in as direct replacements later).
// NOT added: nancy_intro_match (duplicate of touch_match_intro),
// nancy_intro_memory (near-duplicate of mem_intro, 78% overlap — SKIP).
// nancy_intro_story/_2 come via §14 (stories.js CORPUS), not here.
add("nancy_greet_1", "أهلاً يا ملك ماثيو! أنا مس نانسي، وبحبك أوي! يلا نلعب ونتعلم مع بعض!");
add("nancy_greet_2", "أنا مس نانسي وبحبك يا ماثيو! وحشتني أوي، يلا نبدأ يوم جميل مع بعض!");
add("nancy_greet_3", "أهلاً يا بطلي ماثيو! أنا مس نانسي، أنا فخورة بيك أوي! يلا نشوف هنلعب إيه النهارده!");
add("nancy_intro_memory_2", "يلا يا بطل ماثيو! افتح كارتين، لو شبه بعض يبقوا بتوعك! افتكر كويس!");
add("nancy_intro_quiz", "يلا يا ملك ماثيو! اسمع السؤال كويس واختار الإجابة الصح، أنا واثقة فيك يا بطل!");
add("nancy_intro_quiz_2", "اختبار جديد يا بطلي ماثيو! ركّز معايا وجاوب، وكل إجابة صح ليها نجمة!");
add("nancy_praise_1", "برافو يا ملك ماثيو! أنت شاطر أوي!");
add("nancy_praise_2", "أحسنت يا ماثيو! أنا فخورة بيك أوي!");
add("nancy_praise_3", "يا سلام يا ملك ماثيو! إجابة صح، أنت بطل!");
add("nancy_praise_4", "برافو يا بطلي ماثيو! أنا بحبك، أنت ذكي أوي!");
add("nancy_praise_5", "ممتاز يا ماثيو! كده صح، كمّل يا بطل!");
add("nancy_praise_6", "أنت أحلى ملك يا ماثيو! برافو عليك!");
add("nancy_praise_7", "برافو يا ملك ماثيو! أنا فرحانة بيك أوي!");
add("nancy_praise_8", "شاطر شاطر يا ماثيو! أنت بتعمل حاجات جميلة!");
add("nancy_praise_9", "يا بطل يا ماثيو! أنت كسبت نجمة جديدة!");
add("nancy_praise_10", "أحسنت يا ملك ماثيو! أنت بتتعلم بسرعة، أنا بحبك!");
add("nancy_retry_1", "ولا يهمك يا ملك ماثيو! جرّب تاني، أنت هتعرفها!");
add("nancy_retry_2", "قرّبت أوي يا بطلي! فكّر تاني على مهلك، أنا معاك!");
add("nancy_retry_3", "مش مشكلة يا ماثيو! الغلط بيعلّمنا، يلا نحاول تاني!");
add("nancy_retry_4", "أنت بطل يا ماثيو، حاول مرة تانية وهتطلع صح!");
add("nancy_retry_5", "اسمع كويس يا ملك ماثيو، وفكّر تاني، أنا واثقة إنك هتعرفها!");
add("rescueWinStory", "أنقذت مارك ومريم! هما بخير وفرحانين بيك أوي يا أحلى أخ في الدنيا!");
add("storyAnimalsWinStory", "كل حيوانات الغابة بتحييك! الأسد نفسه قال: ده أذكى ملك شفته!");
add("storyTripWinStory", "ماما فرحانة بيكو أوي! مارك بيضحك وبيقول: عايز رحلة تانية مع أخويا الملك!");
add("storyTreasureWinStory", "جوه الكنز لقيت تاج دهب ونجوم كتير، وورقة مكتوب عليها: لأشطر ملك في الدنيا!");
add("pron_apple", "Apple", "en_US");
add("pron_book", "Book", "en_US");
add("pron_ball", "Ball", "en_US");
add("pron_milk", "Milk", "en_US");
add("pron_cat", "Cat", "en_US");
add("pron_sun", "Sun", "en_US");
add("pron_dog", "Dog", "en_US");
add("pron_fish", "Fish", "en_US");
for (let s = 0; s <= 10; s++) add("result_score_" + s, "جاوبت صح على " + ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠"][s] + " من ١٠ أسئلة");
// G1 (numbers-once): half scores 0.5..9.5 — app.js fmtScore renders them
// as "٠ ونص".."٩ ونص", so the result line is a full sentence in exactly
// the result_score_* frame; one clip each, no code change in finish()
// (it already speaks the result line as a single full-sentence lookup).
for (let s = 0; s <= 9; s++) add("result_score_half_" + s, "جاوبت صح على " + ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"][s] + " ونص من ١٠ أسئلة");
add("result_tip_pass", "برافو يا ملك ماثيو! انت بطل شاطر أوي!");
add("result_tip_retry", "محاولة جميلة يا بطل ماثيو! العب تاني وهتجيب نجوم أكتر!");


// 8) math journey question lines — the count/before/after/bigger templates
// are a deterministic function of the level, and the add/sub templates draw
// their operands from a neighbouring level's recorded variant (P2: m in
// [n-2, n+2] in both journeys). Every variant is one of the 20 levels'
// lines below, so say() speaking q + " " + ex as one string always has a
// recorded clip. Mirror the generators exactly so every journey question
// has a recorded clip.
{
  const digits = n => String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]);
  const arSrc = read("math-journey.js");
  const arNames = ev(arSrc.slice(arSrc.indexOf("const names=") + "const names=".length, arSrc.indexOf("];", arSrc.indexOf("const names=")) + 1));
  const enSrc = read("math-english.js");
  const enNames = ev(enSrc.slice(enSrc.indexOf("const names=") + "const names=".length, enSrc.indexOf("];", enSrc.indexOf("const names=")) + 1));
  for (let n = 1; n <= 20; n++) {
    const prev = n === 1 ? 2 : n - 1, next = Math.min(20, n + 1), afterQ = n === 20 ? 19 : n, afterA = n === 20 ? 20 : next;
    const addA = Math.max(1, Math.floor(n / 2)), addB = Math.max(1, Math.min(5, n - addA));
    const subA = Math.min(20, n + 3), subB = 1 + (n % 2); // Round 3.2.2 P1-6: result is never n
    const apples = a => a === 1 ? "تفاحة واحدة" : digits(a) + " تفاحات";
    const aq = [
      ["عدّ الصور: كام واحدة؟", "عدّ كل صورة واحدة واحدة. المجموع " + digits(n) + "."],
      ["إيه الرقم اللي بعد " + digits(afterQ) + "؟", "بعد " + arNames[afterQ - 1] + " بييجي " + arNames[afterA - 1] + "."],
      ["إيه الرقم اللي قبل " + digits(next) + "؟", "قبل " + arNames[next - 1] + " بييجي " + arNames[next - 2] + "."],
      ["معانا " + apples(addA) + " وزودنا " + (addB === 1 ? "واحدة" : digits(addB)) + "، بقوا كام؟", arNames[addA - 1] + " زائد " + arNames[addB - 1] + " يساوي " + arNames[addA + addB - 1] + ". عدّهم مع بعض."],
      ["كان معانا " + digits(subA) + " نجوم واختفى " + digits(subB) + "، فاضل كام؟", arNames[subA - 1] + " ناقص " + arNames[subB - 1] + " يساوي " + arNames[subA - subB - 1] + ". شيل " + arNames[subB - 1] + " وعدّ الباقي."],
      ["اختار العدد الأكبر: " + digits(n) + " ولا " + digits(prev), "العدد الأكبر هو " + digits(Math.max(n, prev)) + "."]
    ];
    aq.forEach(([q, ex], i) => add("math_ar_q" + n + "_" + i, q + " " + ex));
    aq.forEach(([q], i) => add("math_ar_qq" + n + "_" + i, q));
    // Numbers-once F5 (CORRECTED rule): the English journey explains in
    // Egyptian Arabic, but the NUMBERS are single-language now — Latin digits
    // become English number names in BOTH the question part AND the
    // explanation part ("كان معانا five نجوم واختفى one، فاضل كام؟" ...
    // "فيه ten." / "الرقم الأكبر هو ten."), so a value is never heard as
    // an Arabic digit AND an English name in one clip. The Arabic frame and
    // the explanation wording stay exactly as they were, only the digits
    // become English names. The runtime math-english.js questions() mirrors
    // this template word for word.
    const applesEn = a => a === 1 ? "تفاحة واحدة" : enNames[a - 1] + " تفاحات";
    const eq = [
      ["عدّ الصور، فيه كام واحدة؟", "عدّ كل صورة مرة واحدة. فيه " + enNames[n - 1] + "."],
      ["إيه الرقم اللي بعد " + enNames[afterQ - 1] + "؟", "بعد " + enNames[afterQ - 1] + " بييجي " + enNames[afterA - 1] + "."],
      ["إيه الرقم اللي قبل " + enNames[next - 1] + "؟", "قبل " + enNames[next - 1] + " بييجي " + enNames[next - 2] + "."],
      ["معانا " + applesEn(addA) + " وزودنا " + (addB === 1 ? "واحدة" : enNames[addB - 1]) + "، بقوا كام؟", enNames[addA - 1] + " زائد " + enNames[addB - 1] + " يساوي " + enNames[addA + addB - 1] + ". عدّهم مع بعض."],
      ["كان معانا " + enNames[subA - 1] + " نجوم واختفى " + enNames[subB - 1] + "، فاضل كام؟", enNames[subA - 1] + " ناقص " + enNames[subB - 1] + " يساوي " + enNames[subA - subB - 1] + ". شيل " + enNames[subB - 1] + " وعدّ الباقي."],
      ["إيه الرقم الأكبر: " + enNames[n - 1] + " ولا " + enNames[prev - 1] + "؟", "الرقم الأكبر هو " + enNames[Math.max(n, prev) - 1] + "."]
    ];
    eq.forEach(([q, ex], i) => add("math_en_q" + n + "_" + i, q + " " + ex));
    eq.forEach(([q], i) => add("math_en_qq" + n + "_" + i, q));
  }
}

// 9) letter-school spoken combinations (steps, mark tab, quiz narration)
// Round 3.2.1 note 4: the spoken quiz question never names its own
// answer — the glyph/sample is shown visually only (q.show), and the
// spoken string is q.q + " اختار الإجابة الصحيحة" (no period). The
// auto-narration then speaks the choices in order, so the choice strings
// (letter names, haraka names, haraka distractors) need clips too; form
// glyphs and syllables resolve to the bare-glyph / reading-syllable clips.
{
  const src = read("lessons.js");
  const grabArr = decl => { const i = src.indexOf(decl); let depth = 0; const j = src.indexOf("[", i); for (let k = j; k < src.length; k++) { if (src[k] === "[") depth++; if (src[k] === "]") { depth--; if (!depth) return ev(src.slice(j, k + 1)); } } };
  const L = grabArr("const lessons ="), M = grabArr("const marks =");
  const HINTS = ["نفتح الفم قليلاً", "نضم الشفتين", "نكسر الصوت", "نسكن الحرف بلا حركة"];
  const sampleFor = (l, mi) => l.letter === "أ" ? ["أَ", "أُ", "إِ", "أْ"][mi] : l.letter + M[mi].mark;
  L.forEach((l, li) => {
    add("les_namesound_" + li, l.name + "، " + l.sound);
    M.forEach((m, mi) => add("les_marklisten_" + li + "_" + mi, HINTS[mi] + "، " + sampleFor(l, mi)));
    add("lsq_q_form_" + li, "أي شكل لحرف " + l.name + " في أول الكلمة؟ اختار الإجابة الصحيحة");
  });
  // the letter-name and haraka-name questions are one fixed string each
  add("lsq_q_letter", "ما اسم هذا الحرف؟ اختار الإجابة الصحيحة");
  add("lsq_q_haraka", "ما اسم الحركة في المقطع ده؟ اختار الإجابة الصحيحة");
  ["أي مقطع عليه فتحة؟", "أي مقطع عليه ضمة؟", "أي مقطع عليه كسرة؟", "أي مقطع عليه سكون؟"].forEach((q, i) => {
    add("lsq_q_syl_" + i, q + " اختار الإجابة الصحيحة");
  });
  // quiz choice strings (spoken after the question, in order)
  L.forEach((l, li) => add("lsq_name_" + li, l.name));
  M.forEach((m, mi) => add("lsq_haraka_" + mi, m.name));
  ["حركة أخرى", "الشدة", "التنوين"].forEach((n, i) => add("lsq_dist_" + i, n));
  // Round 3.2.1 note 14: the sukun choices (بْ تْ مْ سْ) had no corpus entry
  // at all and fell through to the damma clip. Short vocalised texts dedupe
  // by exact text (see add()), so each lands in the EXACT map like rd_syl_*.
  ["بْ", "تْ", "مْ", "سْ"].forEach((s, i) => add("lsq_syl_sukun_" + i, s, "ar_SA"));
}

// 10) touch-game target lines
["حرف الألف", "حرف الباء", "حرف التاء", "حرف الميم", "الرقم واحد", "الرقم اتنين", "الرقم تلاتة", "الرقم أربعة"]
  .forEach((s, i) => add("touch_pick_" + i, "اسمع كويس يا ماثيو. اختار " + s));

// 11) basic-learning spoken lines (learning.js item.speak compositions)
{
  const src = read("learning.js");
  const grabLit = decl => { const i = src.indexOf(decl); let depth = 0; const j = src.indexOf("[", i); for (let k = j; k < src.length; k++) { if (src[k] === "[") depth++; if (src[k] === "]") { depth--; if (!depth) return ev(src.slice(j, k + 1)); } } };
  // Round 3.2.1 note 9: basic_ar_* is gone with the Arabic-letters card
  // (the letter school covers those letters now).
  const words = grabLit("const englishWords = [");
  const phon = grabLit("const phonicsSounds=[");
  const meanings = grabLit("const arabicMeanings = [");
  // Round 3.2.1: Arabic framing, English letter/sound/word kept (ar_EG).
  words.forEach((w, i) => { const L = String.fromCharCode(65 + i); add("basic_en_" + i, "حرف " + L + "، شكله الصغير " + L.toLowerCase() + "، صوته " + phon[i] + "، زي كلمة " + w + " يعني " + meanings[i]); });
  const arNames = grabLit("const arabicNames=[");
  const arDigits = grabLit("const arabicDigits=[");
  arDigits.forEach((d, i) => add("basic_arnum_" + i, arNames[i]));
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
  // Round 3.2.8 notes 6–7: mirrors color-games.js natureQuestion() exactly
  // (gender-aware: «ده …! لونه …» for masc items) — the corpus text must be
  // byte-identical to the runtime question or the clip will not resolve.
  const natQ = item => (item.masc ? "ده " : "دي ") + item.name + "! " + (item.masc ? "لونه" : "لونها") + " الحقيقي إيه يا ترى؟ اختار من اللوحة!";
  NATURE.forEach((item, i) => {
    add("cg_nat_tab_" + i, INSTRUCTIONS.nature + " " + natQ(item));
    add("cg_nat_q_" + i, natQ(item));
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

// 13) tracing glyphs — tracing.js speaks each glyph by EXPLICIT clip key
// (MatthewClips.playKey), never by bare-text lookup: the text map cannot
// distinguish en "1" from ar "١" (same norm "1"), and bare Arabic glyphs
// collide with damma syllables (rd_syl_*_2) under last-wins, so the text
// map alone can never fix tracing. These entries are FORCE-added, bypassing
// the norm dedupe in add() (the corpus Map is keyed by clip key here, so
// colliding norms coexist and every key gets its own recorded clip).
// Order inside §13: tr_ennum_* before tr_num_*, so BY_TEXT for bare digits
// stays Arabic (as before — Arabic quiz answers saying "1" must stay
// Arabic); the English-numbers set is unaffected because it plays by key.
// tr_ar_* runs last among the letter entries, so it also wins BY_TEXT for
// bare Arabic glyphs looked up from other modules.
{
  const src = read("tracing.js");
  const grabItems = setId => {
    const i = src.indexOf(setId + ": {");
    const line = src.slice(src.indexOf("items:", i)).split("\n")[0];
    return ev(line.slice("items:".length).replace(/,\s*$/, "").trim());
  };
  const addForce = (key, text, lang = "ar_EG") => {
    // Same Fusha override as add() for tr_ar_* (ج/ق/ث/ذ/ظ must sound scholastic).
    if (/^tr_ar_/.test(key)) lang = "ar_SA";
    if (!norm(text)) return;
    corpus.set("key:" + key, { key, lang, text });
  };
  grabItems("arLetters").forEach((g, i) => addForce("tr_ar_" + i, g, "ar_SA"));
  grabItems("enLetters").forEach((g, i) => addForce("tr_en_" + i, g, "en_US"));
  grabItems("enNumbers").forEach((g, i) => addForce("tr_ennum_" + (i + 1), g, "en_US"));
  grabItems("arNumbers").forEach((g, i) => addForce("tr_num_" + (i + 1), g, "ar_EG"));
  addForce("trace_done", "برافو يا بطل", "ar_EG");
  addForce("trace_picker", "اختار حرف أو رقم يا ملك ماثيو", "ar_EG");
  addForce("trace_instr", "لوّن الحرف من جوّه بس بإصبعك، واختار اللون اللي يعجبك", "ar_EG");
}

// 14) brave stories (stories.js — CORPUS is generated from the story data
// there, so it is the single source of truth; no text is duplicated here)
{
  const stories = require("./stories.js");
  stories.CORPUS.forEach(e => add(e.key, e.text, e.lang));
}

// 15) chess (note 31 — chess.js CORPUS is generated from the lesson data
// there, so it is the single source of truth; no text is duplicated here.
// Aria render now; pending re-render in Nancy's cloned voice (Habibi-TTS)
// by the voice-swap workstream — same keys, drop-in replacement.)
{
  const chess = require("./chess.js");
  chess.CORPUS.forEach(e => add(e.key, e.text, e.lang));
}

const out = [...corpus.values()];
fs.writeFileSync(path.join(root, "audio-src/corpus.json"), JSON.stringify(out, null, 1));
console.log("corpus entries:", out.length);
console.log("ar:", out.filter(x => x.lang === "ar_EG").length, "| en:", out.filter(x => x.lang !== "ar_EG").length);
