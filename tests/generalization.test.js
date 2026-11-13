"use strict";
// Round 3.2.1 generalisation tests (reading + tracing): pickers, stacked
// pager arrows, full narration, explicit-clip-key tracing, Cairo glyphs.
//
// NOTE on corpus coverage: audio-src/corpus.json is regenerated centrally
// by the coordinator (build-corpus.js + voice packs). A tracing key that
// is not in corpus.json yet still passes here when build-corpus.js §13
// force-declares it with the right language — the test then verifies the
// declaration, and after the rebuild the same assertion verifies the
// corpus entry itself. Keys already in the corpus are checked strictly.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");

const reading = read("reading.js");
const tracing = read("tracing.js");
const styles = read("styles.css");
const corpusSrc = read("build-corpus.js");
const section13 = corpusSrc.slice(corpusSrc.indexOf("// 13) tracing glyphs"), corpusSrc.indexOf("const out = [...corpus.values()]"));
const corpus = JSON.parse(read("audio-src/corpus.json"));
const byKey = new Map(corpus.map(e => [e.key, e]));
const norm = s => String(s || "")
  .replace(/[٠-٩]/g, c => "٠١٢٣٤٥٦٧٨٩".indexOf(c))
  .replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9 ]/g, " ")
  .replace(/\s+/g, " ").trim().toLowerCase();

const grabArray = (src, name) => {
  const start = src.indexOf("const " + name + " = ");
  assert.ok(start >= 0, "missing const " + name);
  const code = src.slice(start, src.indexOf("];", start) + 2);
  const ctx = {};
  vm.runInNewContext(code + "\nglobalThis." + name + " = " + name + ";", ctx);
  return ctx[name];
};
const LETTERS = grabArray(reading, "LETTERS");
const AR_WORDS = grabArray(reading, "AR_WORDS");
const CVC_WORDS = grabArray(reading, "CVC_WORDS");

const grabSets = src => {
  const start = src.indexOf("const SETS = ");
  assert.ok(start >= 0, "missing const SETS");
  const code = src.slice(start, src.indexOf("};", start) + 2);
  const ctx = {};
  vm.runInNewContext(code + "\nglobalThis.SETS = SETS;", ctx);
  return ctx.SETS;
};
const SETS = grabSets(tracing);

test("reading opens with pickers: 28 letters, 10 words, 10 CVC (round 3.2.1)", () => {
  assert.equal(LETTERS.length, 28, "expected 28 letters, got " + LETTERS.length);
  assert.equal(AR_WORDS.length, 10, "expected 10 Arabic words, got " + AR_WORDS.length);
  assert.equal(CVC_WORDS.length, 10, "expected 10 CVC words, got " + CVC_WORDS.length);
  for (const fn of ["renderSyllablePicker", "renderArWordPicker", "renderCvcPicker"]) {
    assert.ok(reading.includes("function " + fn + "()"), "missing picker " + fn);
  }
  // open() lands on the picker, and a picker tap opens the item.
  // Round 3.2.3 item 9: open() also resets the once-per-open quiz-offer flag.
  assert.match(reading, /picker = true;\s*\n\s*(offerSpoken = false;\s*\n\s*)?render\(\);/, "open() must start on the picker");
  assert.ok(reading.includes('data-letter="'), "letter picker must render letter tiles");
  assert.ok(reading.includes('data-word="'), "word picker must render word tiles");
  assert.ok(reading.includes('data-cvc="'), "CVC picker must render word tiles");
  assert.ok(reading.includes("picker = false; renderSyllables()"), "letter tap must open the letter");
  assert.ok(reading.includes("picker = false; renderArWord()"), "word tap must open the word");
  assert.ok(reading.includes("picker = false; renderCvc()"), "CVC tap must open the word");
  // Hierarchical back (note 16): item -> picker -> home, never home from an item.
  assert.ok(reading.includes("picker = true; render();"), "item back must return to the picker");
  assert.match(reading, /header\("[^"]+", true\)/, "item screens must use the picker back button");
  assert.ok(reading.includes("→ رجوع"), "item back button must say رجوع");
});

test("stacked pager arrows on every reading prev/next pair and the quiz next (round 3.2.1)", () => {
  const arrow = '<span class="pager-arrow">';
  for (const [label, dir] of [
    ["الحرف السابق", "→"], ["الحرف التالي", "←"],
    ["الكلمة السابقة", "→"], ["السابق", "→"]
  ]) {
    assert.ok(reading.includes(label + arrow + dir + "</span>"),
      "missing stacked " + dir + " arrow under " + label);
  }
  // "كلمة جديدة" with a ← arrow appears on the ar-words next, the CVC next and the quiz next.
  const nextArrows = reading.split('كلمة جديدة<span class="pager-arrow">←</span>').length - 1;
  assert.ok(nextArrows >= 3, "expected كلمة جديدة + ← arrow in 3 places, got " + nextArrows);
  // The CSS stacks the arrow under its label (flex column).
  assert.match(styles, /\.basic-nav button,\s*\.trace-nav button\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;/,
    "styles.css must stack .basic-nav/.trace-nav buttons in a column");
  assert.ok(styles.includes(".pager-arrow{display:block;"), "pager-arrow must be a block (own line)");
});

test("syllable open speaks the letter name + all 6 syllables (round 3.2.1)", () => {
  // Round 3.2.3 item 9: the sequence is built in a `seq` variable first so
  // the quiz offer can follow the syllables on first entry — the narration
  // itself is unchanged: name + all 6 syllables, in order.
  assert.match(reading, /const seq = \[letter\.name\]\.concat\(syllables\.map\(s => s\.say\)\);[\s\S]*?speakSequence\(seq, "ar-EG"\)/,
    "syllable open must speakSequence the name + all 6 syllables");
  assert.ok(!reading.includes("syllables[0].say"), "the old 2-syllable short narration must be gone");
  // Every spoken syllable text must match its recorded rd_syl_* clip, and
  // every letter name must resolve to a clip saying that name.
  const FATHA = "َ", KASRA = "ِ", DAMMA = "ُ";
  const sylFor = L => L.base === "أ"
    ? ["أَ", "إِ", "أُ", "آ", "إي", "أو"]
    : [L.base + FATHA, L.base + KASRA, L.base + DAMMA, L.base + "ا", L.base + "ي", L.base + "و"];
  LETTERS.forEach((L, i) => {
    sylFor(L).forEach((say, si) => {
      const entry = byKey.get("rd_syl_" + i + "_" + si);
      assert.ok(entry, "missing corpus clip rd_syl_" + i + "_" + si);
      assert.strictEqual(entry.text, say, "rd_syl_" + i + "_" + si + " text mismatch");
      assert.strictEqual(entry.lang, "ar_SA", "rd_syl_" + i + "_" + si + " must be ar_SA");
    });
    const nameEntry = byKey.get("lsq_name_" + i)
      || corpus.find(e => norm(e.text) === norm(L.name));
    assert.ok(nameEntry, "no recorded clip says the letter name " + L.name);
    assert.strictEqual(norm(nameEntry.text), norm(L.name), "name clip says the wrong word for " + L.name);
  });
});

test("word and CVC opens auto-speak the full blend line (round 3.2.1)", () => {
  assert.ok(reading.includes('speakKey(blend, "rd_blend_" + wi, "ar-EG")'),
    "ar-word open must auto-speak its rd_blend_* clip");
  assert.ok(reading.includes('speakKey(blend, "rd_cvc_blend_" + wi, "en-US")'),
    "CVC open must auto-speak its rd_cvc_blend_* clip");
  AR_WORDS.forEach((w, i) => {
    const entry = byKey.get("rd_blend_" + i);
    assert.ok(entry, "missing corpus clip rd_blend_" + i);
    assert.strictEqual(entry.text, w.parts.join("، ") + ". " + w.word, "rd_blend_" + i + " text mismatch");
  });
  CVC_WORDS.forEach((w, i) => {
    const entry = byKey.get("rd_cvc_blend_" + i);
    assert.ok(entry, "missing corpus clip rd_cvc_blend_" + i);
    assert.strictEqual(entry.text, w.sounds.join(", ") + ". " + w.word, "rd_cvc_blend_" + i + " text mismatch");
  });
});

test("reading quiz replay button speaks the prompt word only, never the choices (note 22)", () => {
  const quiz = reading.slice(reading.indexOf("function renderQuiz()"));
  assert.ok(quiz.includes("🔊 اسمع السؤال"), "quiz must have an اسمع السؤال replay button");
  assert.ok(!quiz.includes("🔊 اسمع الكلمة") && !quiz.includes('"🔊 اسمع"'),
    "the old listen labels must be gone from the quiz");
  assert.ok(quiz.includes('speakKey(spoken, "rd_word_" + itemIdx, lang)'),
    "Arabic quiz replay must play the rd_word_* clip");
  assert.ok(quiz.includes('speakKey(spoken, "rd_cvc_" + itemIdx, lang)'),
    "English quiz replay must play the rd_cvc_* clip");
  // The prompt is a single word: no speak call in the quiz may mention choices.
  const speakCalls = [...quiz.matchAll(/speak\w*\([^)]*\)/g)].map(m => m[0]);
  assert.ok(speakCalls.length > 0, "quiz must speak the prompt");
  for (const call of speakCalls) assert.ok(!call.includes("choices"), "quiz must never speak the choices: " + call);
});

test("tracing opens with a picker; back goes trace -> picker -> home (round 3.2.1)", () => {
  assert.ok(tracing.includes("function renderPicker()"), "missing tracing picker");
  assert.match(tracing, /justOpened = true;\s*\n\s*renderPicker\(\);/, "open() must land on the picker");
  assert.ok(tracing.includes('data-glyph="'), "picker must render a glyph tile per item");
  assert.ok(tracing.includes("index = Number(b.dataset.glyph); render();"), "glyph tap must open the trace screen");
  assert.ok(tracing.includes('panel.querySelector("#traceBack").onclick = renderPicker;'),
    "trace-screen back must return to the picker, not home");
  assert.ok(tracing.includes("اختار حرف أو رقم يا ملك ماثيو"), "picker must invite the child to choose");
  // First render after open speaks instruction + glyph; later renders glyph only.
  assert.ok(tracing.includes("justOpened"), "first-render flag must exist");
  assert.ok(tracing.includes('key: "trace_instr"'), "first render must speak the trace_instr clip");
  assert.ok(tracing.includes('key: "nancy_intro_trace"'), "first render must speak the nancy_intro_trace clip");
  assert.ok(tracing.includes('speakSequence([{ text: NANCY_TRACE_INTRO, key: "nancy_intro_trace", lang: "ar-EG" }, { text: TRACE_INSTR'), "Nancy opens the trace screen, then instruction + glyph must be sequenced");
});

test("tracing has a prev button with a stacked arrow (round 3.2.1)", () => {
  assert.ok(tracing.includes('id="tracePrev"'), "missing tracePrev button");
  assert.ok(tracing.includes('اللي قبله<span class="pager-arrow">→</span>'),
    "prev button must show اللي قبله with a stacked → arrow");
  assert.ok(tracing.includes('اللي بعده<span class="pager-arrow">←</span>'),
    "next button must show اللي بعده with a stacked ← arrow");
  assert.match(tracing, /#tracePrev"\)\.onclick = \(\) => \{ index = \(index \+ set\.items\.length - 1\) % set\.items\.length; render\(\); \}/,
    "prev button must step back and re-render");
});

test("tracing canvas fonts put Cairo first so ٢ renders Egyptian (note 12.3)", () => {
  assert.ok(tracing.includes('"bold 56px Cairo, system-ui, sans-serif"'), "mask font must start with Cairo");
  const big = tracing.split('"bold 230px Cairo, system-ui, sans-serif"').length - 1;
  assert.equal(big, 2, "both 230px canvas fonts must start with Cairo, got " + big);
  assert.ok(!tracing.includes('"bold 56px system-ui'), "no bare 56px system-ui font may remain");
  assert.ok(!tracing.includes('"bold 230px system-ui'), "no bare 230px system-ui font may remain");
  assert.ok(styles.includes("@font-face{font-family:'Cairo'"), "Cairo must be bundled in styles.css");
});

test("every tracing glyph maps to a recorded clip key with the right language (round 3.2.1)", () => {
  // build-corpus.js §13 must force-declare every set (bypassing the norm dedupe).
  for (const [setId, pattern, lang] of [
    ["arLetters", 'addForce("tr_ar_" + i, g, "ar_SA")', "ar_SA"],
    ["enLetters", 'addForce("tr_en_" + i, g, "en_US")', "en_US"],
    ["arNumbers", 'addForce("tr_num_" + (i + 1), g, "ar_EG")', "ar_EG"],
    ["enNumbers", 'addForce("tr_ennum_" + (i + 1), g, "en_US")', "en_US"]
  ]) {
    assert.ok(section13.includes('grabItems("' + setId + '")'), "§13 must read " + setId + " items");
    assert.ok(section13.includes(pattern), "§13 must force-add " + setId + " as " + lang);
  }
  assert.ok(section13.includes('corpus.set("key:" + key'), "§13 force-add must bypass the norm dedupe");
  // tr_ennum_* before tr_num_*: bare-digit BY_TEXT lookups stay Arabic.
  assert.ok(section13.indexOf("tr_ennum_") < section13.indexOf('"tr_num_"'),
    "§13 must add tr_ennum_* before tr_num_* so digit text lookups stay Arabic");
  // Tracing must speak by explicit key, never by bare-text lookup.
  assert.ok(tracing.includes("window.MatthewClips && window.MatthewClips.playKey(key)"),
    "tracing must play glyphs via MatthewClips.playKey");
  assert.ok(!tracing.includes("speak(set.speak(glyph)"), "bare-text glyph speech must be gone");
  assert.ok(!tracing.includes("speak: item => item"), "the old speak: item => item mapping must be gone");
  assert.ok(tracing.includes("speakKey(glyph, set.key(index), set.lang)"),
    "listen/auto narration must use the explicit glyph key");

  const want = {
    arLetters: { prefix: "tr_ar_", lang: "ar_SA" },
    enLetters: { prefix: "tr_en_", lang: "en_US" },
    arNumbers: { prefix: "tr_num_", lang: "ar_EG" },
    enNumbers: { prefix: "tr_ennum_", lang: "en_US" }
  };
  let checked = 0, fromCorpus = 0;
  for (const [setId, set] of Object.entries(SETS)) {
    assert.ok(typeof set.key === "function", setId + " must define a key() mapping");
    set.items.forEach((glyph, i) => {
      const key = set.key(i);
      assert.ok(key.startsWith(want[setId].prefix),
        setId + " glyph " + glyph + " maps to " + key + ", want " + want[setId].prefix + "*");
      const entry = byKey.get(key);
      if (entry) {
        fromCorpus++;
        assert.strictEqual(entry.lang, want[setId].lang,
          key + " is " + entry.lang + ", want " + want[setId].lang);
        assert.strictEqual(entry.text, glyph, key + " text must be the bare glyph");
      }
      // If the corpus does not have the key yet, §13 must declare it (the
      // coordinator's rebuild adds it); a key missing from BOTH fails.
      else assert.ok(section13.includes('"' + want[setId].prefix + '"'),
        "no recorded clip and no §13 declaration for tracing glyph " + glyph + " (" + key + ")");
      checked++;
    });
  }
  assert.equal(checked, 74, "expected to check all 74 tracing glyphs, got " + checked);
  assert.ok(fromCorpus >= 24, "expected at least the 24 pre-existing tracing clips in the corpus, got " + fromCorpus);
});

test("tracing completion and picker/instruction clips exist (round 3.2.1)", () => {
  for (const [key, text] of [
    ["trace_done", "برافو يا بطل"],
    ["trace_picker", "اختار حرف أو رقم يا ملك ماثيو"],
    ["trace_instr", "لوّن الحرف من جوّه بس بإصبعك، واختار اللون اللي يعجبك"]
  ]) {
    const inCorpus = byKey.get(key);
    if (inCorpus) {
      assert.strictEqual(inCorpus.text, text, key + " text mismatch");
      assert.strictEqual(inCorpus.lang, "ar_EG", key + " must be ar_EG");
    } else {
      assert.ok(section13.includes('addForce("' + key + '", "' + text + '", "ar_EG")'),
        key + " is in neither the corpus nor §13");
    }
  }
  // finishTracing: the completion must be HEARD — the recorded trace_done
  // clip plays, and the feedback() call that used to suppress it is gone.
  const finish = tracing.slice(tracing.indexOf("function finishTracing"));
  assert.ok(finish.includes('speakKey("برافو يا بطل", "trace_done", "ar-EG")'),
    "finishTracing must speak the trace_done clip");
  assert.ok(!finish.includes("MatthewVoice?.feedback"),
    "finishTracing must not call feedback() — it suppressed the completion praise");
  assert.ok(tracing.includes('const TRACE_INSTR = "لوّن الحرف من جوّه بس بإصبعك، واختار اللون اللي يعجبك"'),
    "the spoken instruction must match the trace_instr corpus text");
});
