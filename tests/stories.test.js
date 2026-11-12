const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const stories = require(path.join(root, "stories.js"));

// Every string the app speaks from this module: lines + questions + answers.
// (winStory is display-only text, shown on the win screen but not spoken,
// so it is intentionally NOT in the corpus — same as before.)
function spokenStrings() {
  const out = [stories.PICKER_LINE, stories.LOCKED_LINE, ...stories.STORY_OPENERS];
  for (const s of stories.STORIES) {
    out.push(s.intro, s.closer, s.win);
    for (const st of s.stages) {
      out.push(st.line);
      for (const q of st.questions) out.push(q.q, ...q.a);
    }
  }
  return out;
}
function allQuestions() {
  return stories.STORIES.flatMap(s => s.stages.flatMap(st => st.questions));
}

test("3 draft stories exist, each with 4 stages and 2 questions per stage (8 total, 3 answers each)", () => {
  assert.equal(stories.STORIES.length, 3);
  const ids = stories.STORIES.map(s => s.id);
  assert.deepEqual(ids, ["rescue-mark", "brave-animals", "love-family"]);
  assert.deepEqual(stories.STORIES.map(s => s.title), [
    "الملك ماثيو ينقذ أخوه مارك",
    "الملك ماثيو الشجاع وحيوانات الغابة",
    "الملك ماثيو يحمي مارك ومريم"
  ]);
  for (const s of stories.STORIES) {
    assert.equal(s.stages.length, 4, s.id + ": expected 4 stages");
    assert.ok(s.intro && s.win && s.closer && s.winTitle && s.winStory, s.id + ": missing story text");
    assert.ok(s.stars >= 0, s.id + ": stars threshold must be a number");
    assert.ok(s.scene, s.id + ": story needs a default scene");
    for (const st of s.stages) {
      assert.ok(st.name && st.line && st.icon && st.scene, s.id + ": stage missing text/scene");
      assert.equal(st.questions.length, 2, s.id + " / " + st.name + ": expected exactly 2 questions per stage");
      for (const q of st.questions) {
        assert.equal(q.a.length, 3, s.id + ": question must have 3 choices: " + q.q);
        assert.ok(q.c >= 0 && q.c < 3, s.id + ": bad correct index: " + q.q);
        assert.ok(q.e, s.id + ": question needs an emoji: " + q.q);
        assert.ok(!q.q.includes(q.a[q.c]), s.id + ": spoken question must not contain its own answer: " + q.q);
      }
    }
    const total = s.stages.flatMap(st => st.questions).length;
    assert.equal(total, 8, s.id + ": expected 8 questions in total");
  }
  assert.equal(allQuestions().length, 24, "24 story questions in total");
});

test("Nancy wording rule (round 3.2.2 P1-1): «أنا مس نانسي» only in the opening greeting, never in section intros", () => {
  // The picker greeting and the reworded brave-animals intro must NOT
  // introduce her by name — the user ruled the self-introduction belongs
  // only in the opening greeting (nancy_greet_*).
  assert.ok(!stories.PICKER_LINE.includes("أنا مس نانسي"), "picker greeting must NOT introduce Miss Nancy by name");
  const animals = stories.STORIES.find(s => s.id === "brave-animals");
  assert.ok(animals && !animals.intro.includes("أنا مس نانسي"), "brave-animals intro must NOT introduce Miss Nancy by name");
  // NOTE: rescue-mark and love-family intros still carry the old wording
  // until the Nancy re-record round (deferred) — they are reworded there.
  assert.match(stories.LOCKED_LINE, /مس نانسي/, "locked-story line speaks as Miss Nancy too");
});

test("protector-king arc: jealousy turns into love and protection, no fear/shame/punishment", () => {
  const family = stories.STORIES.find(s => s.id === "love-family");
  assert.match(family.win, /الحامي|بحبهم|بيحبوك/, "family story win must name love/protection");
  assert.match(family.winStory, /الملك الحامي/, "family story ending must crown Matthew the Protector King");
  assert.match(family.stages[0].line, /الملك الحامي/, "family story opens with the protector-king role");
  const mark = stories.STORIES.find(s => s.id === "rescue-mark");
  assert.match(mark.win, /أحلى أخ كبير/, "rescue story win must praise Matthew as the best big brother");
  assert.match(mark.stages[3].line, /أنا بحبك أوي/, "rescue ends with Matthew hugging Mark and saying he loves him");
  const animals = stories.STORIES.find(s => s.id === "brave-animals");
  assert.match(animals.win, /بشجاعتك وطيبتك/, "animals story is won by bravery AND kindness, not by hurting");
  assert.match(animals.winStory, /بقوا أصحاب ماثيو/, "the animals become Matthew's friends");
  const allText = stories.STORIES.map(s => [s.intro, ...s.stages.map(x => x.line), s.closer, s.win, s.winStory].join(" ")).join(" ");
  assert.ok(!/عقاب|هعاقبك|وحش|غبي|هزعق|هضرب/.test(allText), "stories must never use punishment, shame or hurt language");
});

test("star-gating: thresholds 0 / 10 / 15 (first protection story opens free, round 3.2.2 P1-7)", () => {
  const [s1, s2, s3] = stories.STORIES;
  assert.equal(s1.stars, 0, "the first protection story opens with zero stars so Matthew can start as protector-king at once");
  assert.equal(s2.stars, 10);
  assert.equal(s3.stars, 15);
  assert.ok(stories.isUnlocked(s1, 0));
  assert.ok(!stories.isUnlocked(s2, 9) && stories.isUnlocked(s2, 10));
  assert.ok(!stories.isUnlocked(s3, 14) && stories.isUnlocked(s3, 15));
  assert.ok(stories.isUnlocked(s3, 100));
  // starTotal reads the same keys the app writes: matthewStars (hero stat)
  // and the crown store matthewCrownV1; it takes the max, never the sum.
  const fake = { getItem: k => ({ matthewStars: "7", matthewCrownV1: '{"stars":12,"diamonds":1}' }[k] || null) };
  assert.equal(stories.starTotal(fake), 12);
  assert.equal(stories.starTotal({ getItem: () => null }), 0);
});

test("locked stories show as locked with stars needed and current count, no negative language", () => {
  const html = stories.pickerHTML(7);
  assert.match(html, /محتاج ٣ نجمة كمان/, "story 2 (10 stars) must show 3 more stars needed at 7 stars");
  assert.match(html, /محتاج ٨ نجمة كمان/, "story 3 (15 stars) must show 8 more stars needed at 7 stars");
  assert.match(html, /معاك ٧ نجمة، قرّبت يا بطل!/, "locked card shows current stars with encouragement");
  assert.ok(!/مش|ممنوع|مقفول عليك|مش هتقدر|غلط/.test(html), "locked display must not use negative or frustrating language");
  assert.match(html, /🔒/, "locked stories show a lock");
  const at5 = stories.pickerHTML(5);
  assert.ok(!at5.includes("brave-locked") || (at5.match(/brave-locked/g) || []).length === 2, "at 5 stars only story 1 is open");
  const open = stories.pickerHTML(15);
  assert.ok(!open.includes("brave-locked"), "at 15 stars every story is unlocked");
  assert.match(open, /يلا نبدأ المغامرة/, "unlocked cards invite the child in");
});

test("per-stage mapping: a run asks each stage ITS OWN 2 questions, never a flat pool", () => {
  for (const s of stories.STORIES) {
    for (let i = 0; i < 10; i++) {
      const run = stories.buildRun(s);
      assert.equal(run.stages.length, 4);
      run.stages.forEach((runStage, si) => {
        assert.equal(runStage.questions.length, 2, s.id + " stage " + si + ": exactly 2 questions");
        const want = new Set(s.stages[si].questions.map(q => q.q));
        const got = new Set(runStage.questions.map(q => q.q));
        assert.deepEqual([...got].sort(), [...want].sort(), s.id + " stage " + si + ": run must ask that stage's own questions");
      });
      assert.equal(new Set(run.stages.flatMap(st => st.questions.map(q => q.q))).size, 8, "a run covers all 8 questions exactly once");
    }
  }
});

test("variability: two runs differ (question order within stages + choice order)", () => {
  const s = stories.STORIES[0];
  const orders = new Set();
  for (let i = 0; i < 40; i++) {
    const run = stories.buildRun(s);
    orders.add(run.stages.flatMap(st => st.questions.map(q => q.q)).join("|"));
  }
  assert.ok(orders.size > 1, "question order never varies across 40 runs");
  const choiceOrders = new Set();
  for (let i = 0; i < 40; i++) choiceOrders.add(stories.shuffle(s.stages[0].questions[0].a).join("|"));
  assert.ok(choiceOrders.size > 1, "choice order never varies across 40 runs");
});

test("replay button present on question screens (note 22)", () => {
  const q = stories.STORIES[0].stages[0].questions[0];
  const choices = q.a.map((text, i) => ({ text, correct: i === q.c }));
  const html = stories.questionHTML(q, choices);
  assert.match(html, /id="braveReplay"/, "question screen needs a replay button");
  assert.match(html, /🔊 اسمع السؤال/, "replay button must be labelled اسمع السؤال");
  assert.match(html, /class="answers"/, "answers grid present");
});

test("horseback hero: king + horse + sword, animated, swappable hero-face (note 23)", () => {
  const svg = stories.heroSVG();
  assert.match(svg, /class="hero-face"/, "face must be a separate hero-face element for a future photo swap");
  assert.match(svg, /class="brave-horse"/, "hero must include the horse");
  assert.match(svg, /class="brave-king"/, "hero must include the king");
  assert.match(svg, /class="hero-sword"/, "hero must hold a sword");
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(css, /\.brave-hero\{[^}]*animation:matthewBraveRide/, "hero rides with an animation");
  assert.match(css, /@keyframes matthewBraveRide/, "ride keyframes exist");
  assert.match(css, /@keyframes matthewSwordWave/, "sword wave keyframes exist");
  assert.match(css, /\.hero-sword\{[^}]*animation:matthewSwordWave/, "sword animates");
  assert.match(css, /\.brave-scene\.scene-forest/, "forest scene style exists");
  assert.match(css, /\.brave-scene\.scene-river/, "river scene style exists");
  assert.match(css, /\.brave-scene\.scene-castle/, "castle scene style exists");
  assert.match(css, /\.brave-celebrate/, "celebration style exists for story completion");
  // the scene builder puts the hero in the scene with the story's goal
  const scene = stories.sceneHTML(stories.STORIES[2], 0);
  assert.match(scene, /braveHero/, "scene contains the hero");
  assert.match(scene, /🏠/, "story 3 scene shows the home goal");
});

test("per-stage scenes reuse the existing forest/river/castle variants (no new art)", () => {
  const mark = stories.STORIES.find(s => s.id === "rescue-mark");
  assert.equal(stories.sceneFor(mark, 0), "forest", "gate stage: forest");
  assert.equal(stories.sceneFor(mark, 1), "river", "river stage: river");
  assert.equal(stories.sceneFor(mark, 2), "forest", "cave stage: forest (closest existing variant)");
  assert.equal(stories.sceneFor(mark, 3), "forest", "big-tree stage: forest");
  const family = stories.STORIES.find(s => s.id === "love-family");
  assert.equal(stories.sceneFor(family, 0), "forest", "garden stage: forest");
  assert.equal(stories.sceneFor(family, 2), "castle", "lunch stage: castle");
  assert.equal(stories.sceneFor(family, 3), "castle", "home stage: castle");
  for (const s of stories.STORIES) {
    for (let i = 0; i < 4; i++) assert.ok(["forest", "river", "castle"].includes(stories.sceneFor(s, i)), s.id + " stage " + i + ": scene must be an existing variant");
  }
});

test("every story line/question/answer has a corpus entry (ar_EG teacher voice), draft key scheme", () => {
  const keys = new Set();
  for (const e of stories.CORPUS) {
    assert.ok(e.key && e.text, "corpus entry needs key and text");
    assert.equal(e.lang, "ar_EG", "story clips are Egyptian teacher voice: " + e.key);
    assert.ok(!keys.has(e.key), "duplicate corpus key: " + e.key);
    keys.add(e.key);
  }
  const byText = new Map(stories.CORPUS.map(e => [e.text, e.key]));
  for (const text of spokenStrings()) {
    assert.ok(byText.has(text), "spoken string has no corpus entry: " + text);
  }
  // 2 shared lines + 3 stories × (1 intro + 4 stages + 1 closer + 1 win
  // + 8 questions + 24 answers) + 2 Nancy story openers (note 25b) = 121.
  assert.equal(stories.CORPUS.length, 121, "corpus must cover exactly the spoken strings (no orphans, no gaps)");
  assert.equal(stories.CORPUS.length, spokenStrings().length,
    "corpus must cover exactly the spoken strings (no orphans, no gaps)");
  // draft key scheme: story<Mark|Animals|Family><Intro|S1..S4|Closer|Win|S<n>Q<q>[A<a>]>
  // + the two Nancy story openers (note 25b, nancy_intro_story[_2]).
  for (const key of keys) {
    assert.ok(/^story_picker$|^story_locked$|^nancy_intro_story(_2)?$|^story(Mark|Animals|Family)(Intro|S[1-4]|Closer|Win|S[1-4]Q[12](A[123])?)$/.test(key), "corpus key outside the draft scheme: " + key);
  }
  for (const key of ["storyMarkIntro", "storyMarkS1", "storyMarkS4", "storyMarkWin", "storyMarkS1Q1", "storyMarkS1Q1A1",
    "storyAnimalsIntro", "storyAnimalsS2Q2", "storyAnimalsWin",
    "storyFamilyIntro", "storyFamilyS3Q1", "storyFamilyS4Q2", "storyFamilyWin"]) {
    assert.ok(keys.has(key), "missing draft corpus key: " + key);
  }
});

test("number answers are Arabic-Indic digits only (notes 26/27/28): no Latin digits, no finger emojis", () => {
  for (const q of allQuestions()) {
    for (const ans of q.a) {
      assert.ok(!/[0-9]/.test(ans), "Latin digit in answer text: " + ans);
      const pic = stories.answerPic(ans, q);
      // Drawn SVG pictures (e.g. the jumping horse for نط النهر) carry
      // coordinates, not digit characters — the Latin-digit / finger-emoji
      // checks apply to emoji/digit pictures only, like tests/pictures.test.js.
      if (!String(pic).startsWith("<svg")) {
        assert.ok(!/[0-9]/.test(pic), "Latin digit in answer picture for " + ans + " -> " + pic);
        // (string includes, not a regex class: emoji in a [...] class match
        // by surrogate halves and would false-positive on unrelated emoji)
        assert.ok(!["☝️", "✌️", "🤟", "✋"].some(f => pic.includes(f)), "finger emoji in answer picture for " + ans + " -> " + pic);
      }
    }
  }
  assert.equal(stories.answerPic("أربعة", null), "٤");
  assert.equal(stories.answerPic("اثنتان", null), "٢");
  assert.equal(stories.answerPic("ثلاثة", null), "٣");
  assert.equal(stories.answerPic("١", null), "١");
  assert.equal(stories.answerPic("٣", null), "٣");
});

test("question emojis never reveal the answer or depict a wrong choice (picture audit)", () => {
  const picOf = text => stories.answerPic(text, null);
  for (const s of stories.STORIES) {
    for (const st of s.stages) {
      for (const q of st.questions) {
        for (const ans of q.a) {
          assert.notEqual(q.e, picOf(ans), s.id + ": question emoji depicts an answer choice: " + q.q + " -> " + q.e + " vs " + ans);
        }
      }
    }
  }
  // the four mandated reveal fixes, plus the other draft reveals
  const byQ = new Map(allQuestions().map(q => [q.q, q]));
  for (const qtext of [
    "لون الثعلب إيه؟", "لون الكرة إيه؟", "النمر بيجري بسرعة إيه؟", "حيوانات الغابة بقت إيه لماثيو؟",
    "ماثيو راكب إيه؟", "لون المية إيه؟", "ماثيو ولّع إيه في الكهف؟", "ماثيو كان إيه في الكهف؟",
    "ماثيو عمل إيه لما لقى مارك؟", "الأسد ملك إيه؟", "الأسد بياكل إيه؟", "الثعلب ادى ماثيو إيه هدية؟",
    "ماثيو قال للدب إيه؟", "الدب بيحب ياكل إيه؟", "مريم بتجري ورا إيه؟", "ماثيو الملك إيه؟",
    "ماثيو جاب الكرة لمين؟", "مين اللي بيحب ماثيو؟", "ماثيو بيحب مين؟", "مارك ومريم ناموا فين؟"
  ]) {
    assert.equal(byQ.get(qtext).e, "🤔", "reveal-risk question must be neutralised to 🤔: " + qtext);
  }
  // counting questions must not hint a number either (a single 🌲/🍎 would nudge to ١)
  assert.equal(byQ.get("كم شجرة قدام البوابة؟").e, "🤔");
  assert.equal(byQ.get("ماثيو قسّم كام تفاحة؟").e, "🤔");
  // the two kept subject emojis do NOT encode their answers (horse≠action, baby≠age)
  assert.equal(byQ.get("حصان ماثيو عمل إيه عند النهر؟").e, "🐴");
  assert.equal(byQ.get("مارك عنده كام سنة؟").e, "👶");
});

test("every answer is pictured with a real picture (emoji) — Matthew cannot read yet", () => {
  for (const s of stories.STORIES) {
    for (const st of s.stages) {
      for (const q of st.questions) {
        for (const ans of q.a) {
          const pic = stories.answerPic(ans, q);
          assert.ok(pic && pic !== "" && pic !== "⭐" && pic !== "🤔", s.id + ": answer has no real picture: " + ans + " (" + q.q + ")");
        }
      }
    }
  }
});

test("stories.js is wired for the bundle (coordinator check)", () => {
  const src = fs.readFileSync(path.join(root, "stories.js"), "utf8");
  assert.match(src, /MatthewBraveStories/, "module exposes window.MatthewBraveStories");
  assert.match(src, /data-brave-stories/, "home card hook data-brave-stories exists");
  assert.match(src, /sceneFor/, "per-stage scene mapping exists");
  // Round 3.2.2 P1-2: merged picker — rescue.js opens brave stories via
  // the exported openStory, and index.html has ONE stories card.
  assert.match(src, /openStory/, "stories module must export openStory for the merged picker");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.includes('data-stories="1"'), "merged stories card must exist in index.html");
  assert.ok(!html.includes("data-brave-stories"), "the old separate brave-stories card must be gone from index.html");
});
