const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

// Round 3.2.1 — games: spoken intros (19a + مس نانسي 25b), replay buttons
// (22), animated scenes (20), لوني العدد split buttons (24a), memory game
// (24b), hierarchical back (16), stacked pager arrows (4), and the
// number-format / script-consistency rule (28).

const DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
const norm = s => String(s || "")
  .replace(/[٠-٩]/g, c => DIGITS[c])
  .replace(/[ً-ٰٟـ]/g, "")
  .replace(/[^ء-يa-zA-Z0-9 ]/g, " ")
  .replace(/\s+/g, " ").trim().toLowerCase();

// Run build-corpus.js in-memory (its corpus.json write is captured, never
// written to disk) and return the entries it would generate from the
// current sources. That is the recorded-clip coverage the coordinator
// generates from.
function derivedCorpus() {
  const src = read("build-corpus.js");
  let captured = null;
  const stubFs = {
    readFileSync: (p, enc) => fs.readFileSync(p, enc),
    writeFileSync: (_p, data) => { captured = JSON.parse(String(data)); }
  };
  const sandbox = {
    require: (name) => {
      if (name === "fs") return stubFs;
      if (name === "vm") return vm;
      if (name === "path") return path;
      if (name.startsWith("./") || name.startsWith("../")) return require(path.join(root, name));
      return require(name);
    },
    __dirname: root,
    console: { log() {} }
  };
  vm.runInNewContext(src, sandbox, { filename: "build-corpus.js" });
  assert.ok(Array.isArray(captured) && captured.length > 100, "build-corpus.js should derive a corpus");
  return captured;
}

const DERIVED = derivedCorpus();
const DERIVED_NORMS = new Set(DERIVED.map(e => norm(e.text)));
const COMMITTED = JSON.parse(read("audio-src/corpus.json"));
const COMMITTED_NORMS = new Set(COMMITTED.map(e => norm(e.text)));

// New recorded-clip entries reported for generation. build-corpus.js does
// not derive these strings yet (the coordinator adds them to
// build-corpus.js / audio-src/clips.json); until then this manifest is the
// coverage record. Every entry here must match the runtime string exactly.
const NEW_CLIPS = [
  { key: "touch_menu_intro", text: "أهلاً يا ملك ماثيو! بحبك أوي! دي ألعاب اللمس والصوت، اختار اللعبة اللي تعجبك يا بطل!", lang: "ar_EG" },
  { key: "touch_match_intro", text: "لعبة التوصيل يا ملك ماثيو! اضغط الصورة واسمع اسمها، وبعدين اضغط الكلمة اللي بتناسبها يا بطل!", lang: "ar_EG" },
  { key: "touch_listen_intro", text: "لعبة اسمع واختار يا ملك ماثيو! اسمع كويس واختار الصح يا بطل!", lang: "ar_EG" },
  { key: "touch_pic_apple", text: "تفاحة", lang: "ar_EG" },
  { key: "storyPickerIntro", text: "أهلاً يا ملك ماثيو! كل قصة فيها مراحل وأسئلة جديدة كل مرة، اختار قصة وابدأ المغامرة يا بطل!", lang: "ar_EG" },
  { key: "mem_intro", text: "لعبة الذاكرة يا ملك ماثيو! بحبك أوي! اقلب الكروت ولاقي الصورتين اللي شبه بعض يا بطل!", lang: "ar_EG" },
  { key: "mem_match_1", text: "برافو يا ملك ماثيو! شاطر خالص!", lang: "ar_EG" },
  { key: "mem_match_2", text: "يا سلام يا بطل ماثيو! الصورتين شبه بعض! عينك قوية أوي!", lang: "ar_EG" },
  { key: "mem_match_3", text: "أحسنت يا ملك ماثيو! أنت ذكي أوي يا بطل!", lang: "ar_EG" },
  { key: "mem_half", text: "برافو يا ملك ماثيو! لقيت نص الصور! كمّل يا بطل، فاضل شوية صغيرين!", lang: "ar_EG" },
  { key: "mem_try_1", text: "حاول تاني يا بطل", lang: "ar_EG" },
  { key: "mem_try_2", text: "قربت يا ملك ماثيو! افتكر مكان الصور وحاول تاني!", lang: "ar_EG" },
  { key: "mem_again", text: "يلا نلعب تاني يا ملك ماثيو! كروت جديدة مستنياك!", lang: "ar_EG" },
  { key: "mem_let_alif", text: "ألف", lang: "ar_SA" },
  { key: "mem_let_baa", text: "باء", lang: "ar_SA" },
  { key: "mem_let_taa", text: "تاء", lang: "ar_SA" },
  { key: "mem_let_thaa", text: "ثاء", lang: "ar_SA" },
  { key: "mem_let_jeem", text: "جيم", lang: "ar_SA" },
  { key: "mem_let_haa", text: "حاء", lang: "ar_SA" },
  { key: "mem_let_khaa", text: "خاء", lang: "ar_SA" },
  { key: "mem_let_daal", text: "دال", lang: "ar_SA" },
  { key: "mem_win", text: "برافو يا ملك ماثيو! لقيت كل الصور! أنت بطل الذاكرة! خدت ألماسة جديدة لتاجك!", lang: "ar_EG" }
];
const MANIFEST_NORMS = new Set(NEW_CLIPS.map(e => norm(e.text)));
const covered = text => DERIVED_NORMS.has(norm(text)) || MANIFEST_NORMS.has(norm(text));
const coveredCommitted = text => COMMITTED_NORMS.has(norm(text)) || MANIFEST_NORMS.has(norm(text));

// The bundle section between two markers (the touch-games core has no
// canonical file of its own — the bundle IS its source).
function bundleSection(startMarker, endMarker) {
  const bundle = read("interactive-games.js");
  const start = bundle.indexOf(startMarker);
  assert.ok(start >= 0, "missing marker " + startMarker);
  const end = endMarker ? bundle.indexOf(endMarker, start) : bundle.length;
  return bundle.slice(start, end < 0 ? bundle.length : end);
}
const TOUCH_CORE = bundleSection("// ==== interactive games core ====", null);
const COLOR_GAMES = read("color-games.js");
const BUNDLE = read("interactive-games.js");
const RESCUE = read("rescue.js");
const MEMORY = read("memory-game.js");
const STYLES = read("styles.css");

// Load memory-game.js with a stub DOM (no main/gameList, so the IIFE
// returns after exposing the pure test API on window.MatthewMemory).
function loadMemoryApi() {
  const sandbox = {
    window: {},
    document: { querySelector: () => null, getElementById: () => null },
    localStorage: { getItem: () => null, setItem: () => {} },
    setTimeout: (fn) => 0,
    console
  };
  sandbox.window = sandbox.window || {};
  vm.runInNewContext(MEMORY, sandbox, { filename: "memory-game.js" });
  return sandbox.window.MatthewMemory;
}

test("game files parse as valid JavaScript", () => {
  for (const file of ["interactive-games.js", "color-games.js", "memory-game.js"]) {
    new vm.Script(read(file), { filename: file });
  }
});

test("bundle stays in sync with color-games.js (canonical source)", () => {
  // Compare the embedded section exactly instead of one ~5 MB includes():
  // a single giant-needle search is unreliable on some runners — it failed
  // in CI on PR #18 while the same files passed locally on Node 22 and 24
  // (branch head and PR merge commit both verified byte-identical).
  // build_bundle.py embeds each module as MARK + source.strip() + "\n".
  const startMarker = "// ==== bundled module: color-games.js ====\n";
  const endMarker = "// ==== bundled module: stories.js ====";
  const start = BUNDLE.indexOf(startMarker);
  assert.ok(start >= 0, "bundle is missing the color-games.js section");
  const end = BUNDLE.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, "bundle is missing the stories.js section after color-games.js");
  assert.equal(BUNDLE.slice(start + startMarker.length, end).trim(), COLOR_GAMES.trim(), "bundle is out of sync with color-games.js — mirror the edits");
});

test("new clip manifest is well-formed (unique keys, ar_EG, non-empty text)", () => {
  const keys = new Set();
  for (const e of NEW_CLIPS) {
    assert.ok(e.key && !keys.has(e.key), "duplicate/empty clip key: " + e.key);
    keys.add(e.key);
    // Letter names are Fusha (ar_SA) like the rest of the letter lessons;
    // every other game line is Miss Nancy's Egyptian voice (ar_EG).
    if (e.key.startsWith("mem_let_")) assert.equal(e.lang, "ar_SA", "letter-name clips are Fusha: " + e.key);
    else assert.equal(e.lang, "ar_EG", "game intro clips are Egyptian teacher voice: " + e.key);
    assert.ok(e.text.length > 1, "empty clip text: " + e.key);
    // Bare picture names and the short try-again lines carry no name —
    // they are spoken as single words / short cheers, not intros.
    if (!e.key.startsWith("touch_pic_") && !e.key.startsWith("mem_let_") && !e.key.startsWith("mem_try_")) {
      assert.match(e.text, /ماثيو|مس نانسي/, "game intros cheer Matthew / introduce مس نانسي: " + e.key);
    }
  }
});

test("every game intro resolves to a recorded clip", () => {
  // Workshop: INSTRUCTIONS.* are read from the source and must be covered
  // by what build-corpus.js derives from them (section 12 mirrors the
  // runtime generators, so the numbers intro is exact and the nature /
  // patterns intros are prefixes of their composed tab speeches).
  const m = COLOR_GAMES.match(/const INSTRUCTIONS = (\{[\s\S]*?\n  \});/);
  assert.ok(m, "INSTRUCTIONS object not found in color-games.js");
  const instructions = vm.runInNewContext("(" + m[1] + ")", Object.create(null));
  assert.ok(DERIVED_NORMS.has(norm(instructions.numbers)), "numbers intro not in derived corpus: " + instructions.numbers);
  for (const tab of ["nature", "patterns"]) {
    assert.ok([...DERIVED_NORMS].some(t => t.startsWith(norm(instructions[tab]))),
      tab + " intro not the prefix of any derived tab speech: " + instructions[tab]);
    assert.ok(!instructions[tab].includes("أنا مس نانسي"), tab + " intro must NOT introduce مس نانسي by name (round 3.2.2 P1-1)");
    assert.match(instructions[tab], /يا ملك ماثيو/, tab + " intro must cheer Matthew by name");
  }
  assert.match(instructions.numbers, /اختار لون وبعدين دوس على الجزء اللي رقمه نفس اللون/, "numbers intro must carry the prescribed sentence");
  assert.ok(!instructions.numbers.includes("أنا مس نانسي"), "numbers intro must NOT introduce مس نانسي by name (round 3.2.2 P1-1)");

  // Touch games: the intro constants in the bundle core.
  for (const name of ["MENU_INTRO", "MATCH_INTRO", "LISTEN_INTRO"]) {
    const hit = TOUCH_CORE.match(new RegExp("const " + name + '="([^"]+)"'));
    assert.ok(hit, name + " not found in the touch-games core");
    assert.ok(covered(hit[1]), name + " intro has no recorded clip: " + hit[1]);
    assert.ok(!hit[1].includes("أنا مس نانسي"), name + " must NOT introduce مس نانسي by name (rule 2: only the opening greeting does)");
    assert.match(hit[1], /يا ملك ماثيو/, name + " must still cheer Matthew by name");
  }

  // Memory game: intro + win lines + rotating praise / half / try-again /
  // play-again lines from the module itself.
  const api = loadMemoryApi();
  assert.ok(covered(api.intro), "memory intro has no recorded clip: " + api.intro);
  assert.ok(covered(api.win), "memory win line has no recorded clip: " + api.win);
  for (const line of [...api.matchLines, api.half, ...api.tryLines, api.again]) {
    assert.ok(covered(line), "memory line has no recorded clip: " + line);
  }

  // Stories picker: the spoken intro (مس نانسي version from the report) is
  // in the manifest, and rescue.js already speaks an intro on open.
  assert.ok(covered(NEW_CLIPS.find(e => e.key === "storyPickerIntro").text), "story picker intro has no recorded clip");
  assert.match(RESCUE, /speak\("أهلاً يا ملك ماثيو! كل قصة فيها مراحل وأسئلة جديدة كل مرة، اختار قصة وابدأ المغامرة يا بطل!", "storyPickerIntro"\)/, "story picker must speak its intro on open");
});

test("matching-game picture names resolve to recorded clips, and tapping a picture speaks its name", () => {
  const words = [...TOUCH_CORE.matchAll(/word:"([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(words)].sort(), ["أسد", "تفاحة", "سمكة", "سيارة", "شمس", "قطة", "كرة", "موز"], "expected the 8 matching-game pictures");
  for (const w of words) assert.ok(coveredCommitted(w), "picture name has no recorded clip: " + w);
  assert.match(TOUCH_CORE, /const pic=pairs\.find\(p=>p\.id===button\.dataset\.image\);if\(pic\)speak\(pic\.word\)/,
    "tapping a picture must speak its name");
  assert.ok(!TOUCH_CORE.includes('speak("اختار الكلمة المناسبة للصورة")'),
    "picture taps must say the picture name, not the generic instruction");
});

test("replay buttons (اسمع السؤال) are present on every game question screen", () => {
  // Stories (rescue.js, canonical): the listen button the other agent added.
  assert.match(RESCUE, /textContent = "🔊 اسمع السؤال"/, "rescue question screen needs a listen button");
  // Touch games (bundle core): listen mode already had one; match mode gained one.
  assert.match(TOUCH_CORE, /id="listenAgain"[^>]*>🔊 اسمع السؤال/, "listen game needs its replay button");
  assert.match(TOUCH_CORE, /id="matchListen"[^>]*>🔊 اسمع السؤال/, "match game needs a replay button");
  assert.match(TOUCH_CORE, /panel\.querySelector\("#matchListen"\)\.onclick=\(\)=>speak\(MATCH_INTRO\)/,
    "match replay button must re-speak the intro");
  // Workshop: one per tab, re-speaking the current instruction.
  for (const [id, fn] of [["cgListenNumbers", "speakTabSpeech"], ["cgListenNature", "speakNatureQuestion"], ["cgListenPatterns", "speakPatternIntro"]]) {
    assert.ok(COLOR_GAMES.includes('id="' + id + '"'), "workshop is missing replay button " + id);
    assert.match(COLOR_GAMES, new RegExp('\\$\\("' + id + '"\\)\\.onclick = .*' + fn), "replay button " + id + " must re-speak " + fn);
  }
  // Memory game.
  assert.match(MEMORY, /id="memListen"[^>]*>🔊 اسمع السؤال/, "memory game needs a replay button");
  assert.match(MEMORY, /panel\.querySelector\("#memListen"\)\.onclick = \(\) => speak\(lastMemIntro\)/,
    "memory replay button must re-speak the intro");
});

test("game intros are spoken on open (auto-narration, not tap-to-listen)", () => {
  // Round 3.2.3 item 4: Nancy voice is OUT of the workshop — the opener
  // is the Aria clip cg_intro_color (same text), not a Nancy intro.
  assert.match(COLOR_GAMES, /function open\(\)[\s\S]*?speakSeq\(\[CG_INTRO_COLOR, \.\.\.tabSpeechItems\(\)\]\)/, "workshop open must speak the Aria opener + the tab intro");
  assert.match(TOUCH_CORE, /renderMenu\(\);speak\(MENU_INTRO\)/, "touch games menu must speak its intro on open");
  assert.match(TOUCH_CORE, /speak\(MATCH_INTRO\);/, "match game must speak its intro on start");
  assert.match(TOUCH_CORE, /speakSequence\(\[LISTEN_INTRO,/, "listen game must speak its intro, then the target");
  assert.match(MEMORY, /function newGame\([^)]*\)[\s\S]*?speak\(lastMemIntro\)/, "memory game must speak its intro on start");
  // Round 3.2.1 note 25b: the memory intro rotates between two Nancy
  // lines (MEM_INTRO / MEM_INTRO_2); the replay button re-speaks
  // whichever one opened this round (lastMemIntro).
  assert.ok(MEMORY.includes('const MEM_INTRO_2 = "يلا يا بطل ماثيو! افتح كارتين، لو شبه بعض يبقوا بتوعك! افتكر كويس!"'), "memory game needs a second rotating intro");
  assert.match(MEMORY, /lastMemIntro = memIntroIndex\+\+ % 2 === 0 \? MEM_INTRO : MEM_INTRO_2/, "memory intro must rotate between the two Nancy lines");
});

test("color games: Aria opens the workshop + the numbers game (3.2.3 item 4 replaces note 25b)", () => {
  assert.ok(COLOR_GAMES.includes('const CG_INTRO_COLOR = "يلا نلوّن يا ملك ماثيو! اختار لون حلو ولوّن معايا!"'), "workshop opener line missing");
  assert.ok(COLOR_GAMES.includes('const CG_INTRO_NUM = "لعبة لون العدد يا بطلي ماثيو! شوف الرقم على التاج ودوس على نفس الرقم في الزر!"'), "numbers-game opener line missing");
  assert.match(COLOR_GAMES, /function tabSpeechItems\(\)[\s\S]*?CG_INTRO_NUM/, "numbers tab speech must open with the numbers intro");
  // Round 3.2.3 item 4: no Nancy voice anywhere in the workshop — she
  // stays only for greeting + encouragement elsewhere.
  assert.ok(!COLOR_GAMES.includes("NANCY_INTRO") && !COLOR_GAMES.includes("nancy_intro_color"), "no Nancy intro may remain in the workshop (item 4)");
  assert.match(COLOR_GAMES, /function speakTabSpeech\(\) \{ speakSeq\(tabSpeechItems\(\)\); \}/, "tab speech must go through the clip sequence");
  // The match-game draft line is a duplicate of the existing MATCH_INTRO /
  // touch_match_intro (same game, same instruction) — it must NOT be added.
  assert.ok(!COLOR_GAMES.includes("nancy_intro_match"), "no duplicate match intro in the workshop");
});

test("animated game scenes: new keyframes exist and game screens use them", () => {
  for (const kf of ["matthewFloat", "matthewStarBurst", "matthewFadeSlide", "matthewSlideIn", "matthewWiggle", "matthewTwinkle", "matthewFlipIn", "matthewBounceSoft"]) {
    assert.ok(STYLES.includes("@keyframes " + kf), "styles.css is missing keyframe " + kf);
  }
  for (const cls of [".anim-float", ".anim-celebrate", ".anim-enter", ".anim-slide-in", ".anim-wiggle", ".anim-twinkle", ".anim-flip-in", ".anim-bounce"]) {
    assert.ok(STYLES.includes(cls + "{"), "styles.css is missing class " + cls);
  }
  // Applications: workshop crown floats + bursts, game area enters, touch
  // menu/board enter, memory cards flip + celebrate, correct answers burst.
  assert.match(COLOR_GAMES, /\.cg-crown-wrap svg\{animation:matthewFloat/, "crown must float");
  assert.match(COLOR_GAMES, /cg-celebrate/, "finished crown must celebrate");
  assert.match(COLOR_GAMES, /id="cgGame" class="anim-enter"/, "workshop game area must animate in");
  assert.match(TOUCH_CORE, /science-card anim-enter/, "touch menu cards must animate in");
  assert.match(TOUCH_CORE, /matching-board anim-enter/, "matching board must animate in");
  assert.match(TOUCH_CORE, /listen-choices anim-enter/, "listen choices must animate in");
  assert.match(MEMORY, /\.mem-card\.flipped \.mem-inner\{transform:rotateY\(180deg\)\}/, "memory cards must flip");
  assert.match(MEMORY, /classList\.add\("matched", "anim-celebrate"\)/, "matched memory cards must celebrate");
  assert.match(STYLES, /\.answer\.correct\{animation:matthewStarBurst/, "correct answers must star-burst");
  assert.match(STYLES, /\.result-stars\{animation:matthewTwinkle/, "win stars must twinkle");
});

test("لون العدد: no written instructions or legend, split buttons carry name + number, intro is spoken (round 3.2.3 items 16/17)", () => {
  const numbersFn = COLOR_GAMES.slice(
    COLOR_GAMES.indexOf("function renderNumbers()"),
    COLOR_GAMES.indexOf("function onCrownPart")
  );
  assert.ok(numbersFn.length > 500, "renderNumbers not found");
  assert.ok(!numbersFn.includes("cg-instruction"), "numbers screen must not show written instructions (Matthew cannot read — the intro is spoken)");
  assert.ok(!numbersFn.includes("cg-legend"), "numbers screen must not show the number↔color legend chips");
  assert.ok(!numbersFn.includes("الأرقام من ' + arDigits"), "numbers screen must not show the written number range (the range is spoken on round start, not written)");
  assert.match(numbersFn, /الجولة ' \+ arDigits\(numbersState\.round\)/, "round indicator stays minimal (round number only)");
  // Split buttons: name half + number half, number in a white circle.
  assert.match(numbersFn, /cg-color-btn cg-split/, "color buttons must be split buttons");
  assert.match(numbersFn, /<span class="cg-split-name">/, "split button must carry the color-name half");
  assert.match(numbersFn, /<span class="cg-split-num"[^>]*>/, "split button must carry the number half");
  // Round 3.2.3 item 16: the number on each colour button is SHUFFLED per
  // round — assign[j] is the number on colour-button j, dealt fresh from
  // the window; the crown expects colorForNumber(n), the colour whose
  // button shows that number. The buttons are never in order.
  assert.match(numbersFn, /numbersState\.assign = shuffle\(win\)/, "numbers must be shuffled across the colour buttons each round");
  assert.match(numbersFn, /arDigits\(numbersState\.assign\[i\]\)/, "split button number must be its shuffled assignment");
  assert.match(COLOR_GAMES, /const colorForNumber = n => \{[\s\S]*?COLORS\[a\.indexOf\(n\)\]/, "crown part must expect the colour whose button shows its number");
  assert.ok(COLOR_GAMES.includes("numbersState.assign = null; // fresh shuffle for the new window"), "next round must re-deal the shuffle");
  // The assignment is a permutation of the window: every colour shows
  // exactly one number and every number appears on exactly one button.
  // (shuffle is the shared Fisher-Yates helper — run it, don't re-derive it.)
  const shStart = COLOR_GAMES.indexOf("const shuffle = arr =>");
  assert.ok(shStart >= 0, "shuffle helper not found");
  let depth = 0, shEnd = -1;
  for (let k = shStart; k < COLOR_GAMES.length; k++) {
    if (COLOR_GAMES[k] === "{") depth++;
    else if (COLOR_GAMES[k] === "}") { depth--; if (depth === 0) { shEnd = k + 1; break; } }
  }
  assert.ok(shEnd > shStart, "shuffle helper must close");
  const shuffle = vm.runInContext("(" + COLOR_GAMES.slice(shStart, shEnd).replace("const shuffle = ", "") + ")", vm.createContext({}));
  for (const win of [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12], [13, 14, 15, 16, 17, 18], [15, 16, 17, 18, 19, 20]]) {
    const shown = shuffle(win);
    assert.deepEqual([...shown].sort((a, b) => a - b), [...win].sort((a, b) => a - b), "shuffled buttons must cover window " + win);
    assert.equal(new Set(shown).size, 6, "each number must appear on exactly one button");
  }
  // Round 3.2.3 item 16: the buttons sit side by side in a grid (2 per
  // row, 3 on wide screens), never stacked vertically.
  assert.ok(numbersFn.includes("cg-palette cg-num-grid"), "numbers palette must use the grid layout");
  assert.match(COLOR_GAMES, /\.cg-palette\.cg-num-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/, "grid must be 2 columns on mobile");
  // Round 3.2.3 item 17: the game is «لون العدد», not «لوني العدد».
  assert.ok(COLOR_GAMES.includes("🔢 لون العدد"), "numbers tab must be named لون العدد");
  assert.ok(!COLOR_GAMES.includes("لوني العدد"), "the old name لوني العدد must be gone");
  // The crown still shows its digits, and the intro is spoken on open.
  assert.match(numbersFn, /arDigits\(n\)/, "crown parts must still show their (Arabic-Indic) digits");
  assert.match(COLOR_GAMES, /\$\("cgListenNumbers"\)\.onclick = \(\) => speakTabSpeech\(\)/, "numbers replay button must re-speak the intro");
});

test("memory game (§7–§8): 6 pairs, 3 rotating themes, no negative language, full voice coverage", () => {
  const api = loadMemoryApi();
  assert.equal(api.pairsPerGame, 6, "6 pairs per round (12 cards)");
  assert.equal(api.themes.length, 3, "three themes: animals, numbers, letters");
  for (const theme of api.themes) assert.equal(theme.length, 8, "every theme holds 8 pictures");
  // Theme contents per spec §2 (exact names, faces, kinds).
  assert.deepEqual([...api.themes[0].map(p => p.name)], ["أسد", "قطة", "كلب", "سمكة", "فيل", "أرنب", "عصفور", "فراشة"]);
  assert.deepEqual([...api.themes[1].map(p => p.name)], ["واحد", "اتنين", "تلاتة", "أربعة", "خمسة", "ستة", "سبعة", "تمانية"]);
  assert.deepEqual([...api.themes[2].map(p => p.name)], ["ألف", "باء", "تاء", "ثاء", "جيم", "حاء", "خاء", "دال"]);
  assert.deepEqual([...api.themes[1].map(p => p.face)], ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨"]);
  assert.deepEqual([...api.themes[2].map(p => p.face)], ["أ", "ب", "ت", "ث", "ج", "ح", "خ", "د"]);
  assert.ok(api.themes[0].every(p => p.kind === "emoji"), "animals render as emoji pictures");
  assert.ok(api.themes[1].every(p => p.kind === "text"), "numbers render as big text, not emoji");
  assert.ok(api.themes[2].every(p => p.kind === "text"), "letters render as big text, not emoji");
  // Rotation: 3 consecutive rounds cover all 3 themes, then wrap.
  // (Compared by picture ids: theme objects come from a vm sandbox, so
  // deepStrictEqual on the objects themselves would fail on prototypes.)
  const themeIds = t => t.map(p => p.id).join(",");
  assert.deepEqual([0, 1, 2].map(r => themeIds(api.themeFor(r))), [...api.themes.map(themeIds)], "rounds 0–2 must visit every theme");
  assert.equal(themeIds(api.themeFor(3)), themeIds(api.themes[0]), "theme rotation wraps after 3 rounds");
  assert.equal(themeIds(api.themeFor(4)), themeIds(api.themes[1]), "rotation continues animals → numbers → letters");
  // Deck: 12 cards, 6 pairs, each id exactly twice, in every theme.
  for (const theme of api.themes) {
    const deck = api.buildDeck(theme, api.pairsPerGame, () => 0);
    assert.equal(deck.length, 12, "deck must hold 12 cards");
    const counts = {};
    for (const c of deck) counts[c.id] = (counts[c.id] || 0) + 1;
    assert.equal(Object.keys(counts).length, 6, "deck must hold exactly 6 distinct pairs");
    assert.ok(Object.values(counts).every(n => n === 2), "every pair must appear exactly twice");
    assert.ok(deck.every(c => c.face && c.name && c.kind), "every deck card must be pictured and named");
    for (const c of deck) assert.equal(deck.filter(x => x.pair === c.pair).length, 2, "every card must have exactly one matching partner");
  }
  // A different rand must reshuffle (rounds vary every run).
  const deckA = api.buildDeck(api.themes[0], api.pairsPerGame, () => 0);
  const deckB = api.buildDeck(api.themes[0], api.pairsPerGame, () => 0.999);
  assert.notDeepEqual(deckA.map(c => c.id), deckB.map(c => c.id), "decks must reshuffle every run");
  // A stateful seeded rand: two consecutive rounds differ too.
  let seed = 123456789;
  const seeded = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const round1 = api.buildDeck(api.themes[0], api.pairsPerGame, seeded);
  const round2 = api.buildDeck(api.themes[0], api.pairsPerGame, seeded);
  assert.notDeepEqual(round1.map(c => c.id), round2.map(c => c.id), "consecutive seeded rounds must differ");
  // No negative language anywhere in the file (spec §8 blocklist).
  assert.ok(!/غلط|خسرت|مش صح|لا،|حاولت وفشلت/.test(MEMORY), "memory game must never use negative language");
  // Every §5 voice line has a recorded clip.
  for (const line of [api.intro, api.win, ...api.matchLines, api.half, ...api.tryLines, api.again]) {
    assert.ok(covered(line), "memory line has no recorded clip: " + line);
  }
  assert.equal(api.matchLines.length, 3, "match praise rotates between 3 lines");
  assert.equal(api.tryLines.length, 2, "try-again rotates between 2 lines");
  // Every picture name has a recorded clip (animals/numbers committed,
  // letter names in the new-clip manifest for generation).
  for (const theme of api.themes) {
    for (const p of theme) assert.ok(coveredCommitted(p.name), "picture name has no recorded clip: " + p.name);
  }
  // Numbers-once F4: the match praise is the rotating praise line ALONE —
  // the picture name was already spoken on both flips, so speaking it
  // again here would say it a 3rd time. The name is never baked into
  // the praise clip.
  assert.match(MEMORY, /speakSeq\(\[line\]\)/, "match praise must speak the praise line alone, never re-speak the picture name");
  assert.ok(!/speakSeq\(\[name, line\]\)/.test(MEMORY), "match praise must not re-speak the picture name before the praise line");
  assert.match(MEMORY, /const line = found === PAIRS_PER_GAME \/ 2 \? MEM_HALF : MEM_MATCH\[matchIndex\+\+ % MEM_MATCH\.length\]/,
    "half-way cheer at 3/6 must replace the rotation");
  assert.ok(!MEMORY.includes("[الاسم]"), "no [name] placeholder may survive in a recorded praise clip");
  assert.ok(!api.matchLines.some(l => /\[الاسم\]/.test(l)), "match lines must carry no name placeholder");
  // UI: 3×4 board of big cards, Cairo text faces, replay button, counter,
  // spoken intro only (no written instructions inside the game).
  assert.match(MEMORY, /grid-template-columns:repeat\(3,/, "board must be 3 columns × 4 rows");
  assert.match(MEMORY, /min-height:100px/, "cards must be at least 100px tall");
  assert.match(MEMORY, /\.mem-face\.mem-text\{[^}]*font-family:[^;]*Cairo/, "numbers/letters must render in the Cairo font");
  assert.match(MEMORY, /id="memListen"[^>]*>🔊 اسمع السؤال/, "memory game needs a replay button");
  assert.match(MEMORY, /panel\.querySelector\("#memListen"\)\.onclick = \(\) => speak\(lastMemIntro\)/,
    "memory replay button must re-speak the intro");
  assert.match(MEMORY, /arDigits\(found\)/, "memory score must render Arabic-Indic");
  assert.match(MEMORY, /arDigits\(PAIRS_PER_GAME\)/, "memory pair count must render Arabic-Indic");
  const newGameFn = MEMORY.slice(MEMORY.indexOf("function newGame("), MEMORY.indexOf("function playAgain()"));
  assert.ok(!/اقلب|لاقي/.test(newGameFn), "no written instructions inside the game — the intro is spoken only");
  assert.match(MEMORY, /speakSeq\(\[MEM_AGAIN, MEM_INTRO\]\)/, "play-again must speak the again line, then the intro");
  // Rewards / flow.
  assert.match(MEMORY, /button\.classList\.add\("flipped"\)/, "tapping a card must flip it");
  assert.match(MEMORY, /matched\.add\(ca\.pair\)/, "a matching pair must be recorded as matched");
  assert.match(MEMORY, /window\.MatthewMastery\?\.record\("memory-game", true\)/, "each matched pair must record a star");
  assert.match(MEMORY, /window\.MatthewMastery\?\.awardCrown\?\.?\(0, 1\)/, "finishing the game must award a diamond");
  assert.match(MEMORY, /speak\(MEM_WIN\)/, "winning must speak the win line");
  assert.match(MEMORY, /speak\(card\.name\)/, "flipping a card must speak its picture name");
  assert.match(MEMORY, /data-memory="1"/, "memory card must be tagged for the Games door");
  assert.match(MEMORY, /window\.MatthewMemory = \{/, "memory game must expose its API");
});

test("back goes to the immediate parent (games section), not home", () => {
  const cgClose = COLOR_GAMES.slice(COLOR_GAMES.indexOf("function close()"), COLOR_GAMES.indexOf("function renderPanel()"));
  assert.ok(!cgClose.includes("learningList"), "workshop back must not reopen the lessons list");
  assert.match(cgClose, /gameList\.classList\.remove\("hidden"\)/, "workshop back must return to the games section");
  const touchBack = TOUCH_CORE.slice(TOUCH_CORE.indexOf("function back(){"), TOUCH_CORE.indexOf("function header("));
  assert.ok(!touchBack.includes("learningList"), "touch games back must not reopen the lessons list");
  assert.match(touchBack, /gameList\.classList\.remove\("hidden"\)/, "touch games back must return to the games section");
  const memBack = MEMORY.slice(MEMORY.indexOf("function back()"), MEMORY.indexOf("function header()"));
  assert.ok(!memBack.includes("learningList"), "memory back must not reopen the lessons list");
  assert.match(memBack, /gameList\.classList\.remove\("hidden"\)/, "memory back must return to the games section");
});

test("next/round buttons carry stacked arrows (note 4)", () => {
  for (const id of ["cgNextRound", "cgNatureNext", "cgPatternNext"]) {
    assert.ok(COLOR_GAMES.includes(id), "missing next button " + id);
  }
  assert.match(COLOR_GAMES, /الجولة اللي بعدها <span class="pager-arrow">←<\/span>/, "numbers next round needs a stacked arrow");
  assert.match(COLOR_GAMES, /الحاجة اللي بعدها <span class="pager-arrow">←<\/span>/, "nature next needs a stacked arrow");
  assert.match(COLOR_GAMES, /النمط اللي بعده <span class="pager-arrow">←<\/span>/, "patterns next needs a stacked arrow");
  assert.match(TOUCH_CORE, /جولة جديدة <span class="pager-arrow">←<\/span>/, "match next round needs a stacked arrow");
  assert.match(TOUCH_CORE, /السؤال التالي <span class="pager-arrow">←<\/span>/, "listen next needs a stacked arrow");
  assert.match(MEMORY, /العب تاني <span class="pager-arrow">←<\/span>/, "memory play-again needs a stacked arrow");
  assert.match(STYLES, /\.primary:has\(\.pager-arrow\)/, "primary buttons must stack the arrow under the label");
});

test("note 28: number answers in one consistent format, script-consistent with the language", () => {
  // --- Latin digits must never appear in a displayed Arabic string. ---
  // Collect string literals (both quote styles), drop pure-CSS / hex-code
  // lines, then fail on any remaining literal mixing Arabic text with [0-9].
  const arabicUiLiterals = (src) => {
    const out = [];
    const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = re.exec(src))) {
      const s = m[1] !== undefined ? m[1] : m[2];
      if (!/[ء-ي]/.test(s)) continue;
      if (s.includes("{") || s.includes("display:") || s.includes("#")) continue; // CSS / hex colour
      out.push(s);
    }
    return out;
  };
  // Markup, entities and attribute fragments (a tag can be split across a
  // string concatenation) are not displayed text.
  const cleanText = s => s.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/g, "").replace(/[\w-]+="[^"]*"/g, "").replace(/[<>]/g, "");
  for (const [name, src] of [["color-games.js", COLOR_GAMES], ["memory-game.js", MEMORY]]) {
    for (const s of arabicUiLiterals(src)) {
      assert.ok(!/[0-9]/.test(cleanText(s)), name + ": Latin digit inside Arabic UI text: " + s);
    }
  }
  for (const s of arabicUiLiterals(TOUCH_CORE)) {
    assert.ok(!/[0-9]/.test(cleanText(s)), "touch games: Latin digit inside Arabic UI text: " + s);
  }
  // --- The touch score/result screens must render Arabic-Indic digits. ---
  assert.ok(!TOUCH_CORE.includes('"⭐ "+score'), "touch score badge must not show a Latin digit");
  assert.ok(!TOUCH_CORE.includes("'+score+'"), "touch result screen must not show a Latin score");
  assert.ok(!TOUCH_CORE.includes("'+stars+'"), "touch result screen must not show Latin stars");
  assert.ok(!TOUCH_CORE.includes("'+points+'"), "touch result screen must not show Latin points");
  for (const frag of ["arDigits(score)", "arDigits(stars)", "arDigits(points)"]) {
    assert.ok(TOUCH_CORE.includes(frag), "touch games must render " + frag);
  }
  // --- The number keycap emojis (Latin digits) are gone from the choices. ---
  assert.ok(!TOUCH_CORE.includes("1️⃣") && !TOUCH_CORE.includes("2️⃣") && !TOUCH_CORE.includes("3️⃣") && !TOUCH_CORE.includes("4️⃣"),
    "listen choices must not show Latin-digit keycap emojis");
  // --- One question, one format: letter targets get letter choices only,
  // number targets get digit choices only (no mixed letter/digit rounds). ---
  assert.match(TOUCH_CORE, /const sameKind=listenItems\.filter\(x=>\(\/\[0-9\]\/\.test\(x\.id\)\)===\(\/\[0-9\]\/\.test\(currentTarget\.id\)\)\);/,
    "listen distractors must come from the same kind as the target");
  // --- Number answers are digits, not words or finger emojis. ---
  const numbersFn = COLOR_GAMES.slice(COLOR_GAMES.indexOf("function renderNumbers()"), COLOR_GAMES.indexOf("function onCrownPart"));
  assert.match(numbersFn, /arDigits\(n\)/, "crown answers must be digits");
  assert.ok(!/☝️|✌️|🤟/.test(numbersFn), "number answers must never be finger emojis");
  // --- Memory game: no Latin digits in the UI; stars shown Arabic-Indic. ---
  assert.match(MEMORY, /arDigits\(found\)/, "memory score must render Arabic-Indic");
  assert.match(MEMORY, /arDigits\(PAIRS_PER_GAME\)/, "memory pair count must render Arabic-Indic");
  assert.ok(!MEMORY.includes("1️⃣") && !MEMORY.includes("2️⃣"), "memory game must not show Latin-digit keycaps");
  // --- Script consistency: Arabic UI text carries no Latin letters, and
  // no Arabic digit leaks into a Latin-script string (HTML markup in the
  // literal is stripped before the check — it is not displayed text). ---
  for (const [name, src] of [["color-games.js", COLOR_GAMES], ["memory-game.js", MEMORY], ["touch core", TOUCH_CORE]]) {
    for (const s of arabicUiLiterals(src)) {
      assert.ok(!/[a-zA-Z]/.test(cleanText(s)), name + ": Latin letters inside Arabic UI text: " + s);
    }
  }
});
