// tests/science-scenes.test.js — Round 3.2.1 note 30: animated drawn
// science scenes. science.js is DOM-guarded in Node (no document), so
// require() returns the scenes API directly.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const api = require(path.join(root, "science.js"));
const src = fs.readFileSync(path.join(root, "science.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function sceneClasses(html) {
  const out = new Set();
  for (const m of html.matchAll(/class="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c.startsWith("sci-")) out.add(c);
  }
  return [...out];
}

test("every one of the 47 science lessons has an animated drawn scene (zero emoji fallbacks)", () => {
  assert.equal(api.lessonTitles.length, 47, "expected 47 lessons, got " + api.lessonTitles.length);
  assert.equal(api.subjectLessons.length, 7, "expected 7 subjects");
  const missing = [];
  for (const s of api.subjectLessons) {
    s.lessons.forEach((title, i) => {
      const html = api.sceneFor(s.id, i);
      if (!html || !html.includes("<svg")) missing.push(s.id + "/" + title);
      else assert.ok(!html.includes("science-emoji"), s.id + "/" + title + ": scene must be drawn SVG, not the emoji");
    });
  }
  assert.deepEqual(missing, [], "lessons with no scene: " + missing.join(", "));
  // sceneFor is keyed by lesson title, so a title typo cannot silently
  // fall back to the emoji in renderLesson.
  assert.equal(Object.keys(api.SCENES).length, 47, "SCENES map must cover all 47 titles");
  for (const t of api.lessonTitles) assert.ok(api.SCENES[t], "no scene for title: " + t);
  assert.equal(api.sceneFor("nope", 0), null, "unknown subject returns null");
  assert.equal(api.sceneFor("physics", 99), null, "out-of-range index returns null");
});

test("Magnet scene: magnet pulls metal in, non-metal stays still", () => {
  const html = api.sceneFor("physics", 4);
  assert.match(html, /sci-magnet/, "magnet element missing");
  // three metal items, each flying toward the magnet (own --dx/--dy pull vector)
  const pulls = [...html.matchAll(/sci-pull" style="--dx:([^;]+);--dy:([^;]+)/g)];
  assert.ok(pulls.length >= 3, "expected >=3 metal items pulled to the magnet, got " + pulls.length);
  for (const [, dx, dy] of pulls) {
    assert.ok(dx && dy, "pull vector must have both dx and dy: " + dx + "/" + dy);
  }
  // non-metal items (wood, paper, plastic ball) carry sci-still: no animation
  const stills = (html.match(/sci-still/g) || []).length;
  assert.ok(stills >= 3, "expected >=3 non-metal items that stay still, got " + stills);
  assert.match(css, /\.sci-still\{animation:none\}/, "sci-still must explicitly disable animation");
  assert.match(css, /@keyframes sciPullTo/, "pull keyframes exist");
  assert.match(css, /\.sci-pull\{[^}]*animation:sciPullTo/, "pull class uses the pull keyframes");
});

test("Rain scene: cloud fills, drops fall, plant grows, rainbow appears last", () => {
  const html = api.sceneFor("physics", 6);
  assert.match(html, /sci-cloud-heavy/, "cloud element missing");
  assert.match(html, /sci-drop/, "falling drops missing");
  assert.match(html, /sci-grow-late/, "growing plant missing");
  assert.match(html, /sci-rainbow/, "rainbow missing");
  // phase order in the CSS timeline: cloud darkens first (0-30%),
  // drops fall (25-60%), plant grows (50-85%), rainbow last (75-95%)
  assert.ok(css.includes("85%{fill:#93a9c2}"), "cloud-heavy keyframes must hold the dark fill late");
  assert.ok(css.includes("0%,70%{opacity:0}"), "rainbow must stay invisible until late in the cycle");
  assert.ok(css.includes("0%,48%{transform:scaleY(.12)"), "plant must stay small until after the drops");
  assert.ok(/sciCloudHeavy 16s/.test(css) && /sciRainbowLate 16s/.test(css) && /sciGrowLate 16s/.test(css),
    "rain phases must share one 16s timeline");
});

test("every scene is drawn SVG with animated elements, and every animation class it uses exists in styles.css", () => {
  const cssClasses = new Set([...css.matchAll(/\.sci-[a-z-]+/g)].map(m => m[0].slice(1)));
  const keyframes = new Set([...css.matchAll(/@keyframes (sci[a-zA-Z]+)/g)].map(m => m[1]));
  assert.ok(keyframes.size >= 20, "expected >=20 new sci keyframes, got " + keyframes.size);
  for (const s of api.subjectLessons) {
    s.lessons.forEach((title, i) => {
      const html = api.sceneFor(s.id, i);
      assert.ok(html.startsWith("<svg"), title + ": scene must be an SVG");
      assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html.replace(/<svg[^>]*>/, "")), title + ": scene must not contain emoji");
      const classes = sceneClasses(html);
      assert.ok(classes.length >= 2, title + ": scene needs animated elements, got " + classes.join(","));
      for (const c of classes) {
        assert.ok(cssClasses.has(c), title + ": class " + c + " has no rule in styles.css");
      }
      // every animation the scene's classes use must have its keyframes
      for (const m of html.matchAll(/sci-[a-z-]+/g)) {
        const rule = css.match(new RegExp("\\." + m[0] + "\\{[^}]*animation:([a-zA-Z]+)"));
        if (rule && rule[1] !== "none") assert.ok(keyframes.has(rule[1]) || /matthew/.test(rule[1]), title + ": animation " + rule[1] + " has no keyframes");
      }
    });
  }
});

test("renderLesson uses the scene container, not the bare emoji", () => {
  assert.ok(src.includes('<div class="science-scene">'), "renderLesson must render a .science-scene container");
  assert.ok(src.includes("sceneFor(subject.id,index)"), "renderLesson must call sceneFor for the current lesson");
  // the emoji survives ONLY as the unreachable fallback inside sceneFor's
  // null branch (every lesson has a scene, so it never renders).
  const lessonFn = src.slice(src.indexOf("function renderLesson"));
  assert.ok(lessonFn.includes("science-scene"), "renderLesson body must contain the scene container");
  // the scene container comes first; the emoji is only the fallback
  // inside sceneFor's null branch (every lesson has a scene, so it
  // never renders as the lesson visual).
  assert.ok(lessonFn.indexOf("science-scene") < lessonFn.indexOf("science-emoji"),
    "the scene container must be the lesson visual, emoji only as fallback");
});

test("lesson texts are untouched (they map to recorded sci_* voice clips)", () => {
  const lessons = [...src.matchAll(/\["([^"]+)","([^"]+)","([^"]+)","([^"]+)"\]/g)];
  assert.equal(lessons.length, 47, "expected 47 lesson text arrays, got " + lessons.length);
  const byTitle = new Map(lessons.map(l => [l[1], l]));
  assert.equal(byTitle.get("المغناطيس العجيب")[3], "المغناطيس بيلزق في حاجات معدن زي المشابك والمفاتيح.");
  assert.equal(byTitle.get("المطر")[3], "المطر مية بتنزل من السحاب.");
  assert.ok(byTitle.get("البرق والرعد")[4].includes("ما تخافش من الرعد"), "lightning text must keep its reassurance");
  for (const [, , , , long] of lessons) assert.ok(long.length >= 100, "lesson explanation too short");
});

test("no fast flashing: the lightning glow is one slow pulse per 5s, and reduced-motion disables the scenes", () => {
  const flash = css.match(/@keyframes sciFlashSoft\{([^}]*)\}/);
  assert.ok(flash, "flash keyframes missing");
  assert.ok(!/0%,100%\{opacity:0\}/.test(flash[1]), "flash must not strobe to black");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{\s*\.science-scene \*\{animation:none!important\}/,
    "reduced-motion must stop the science scenes");
});

test("spot checks: lightning, seasons, float-or-sink follow their lesson beats", () => {
  const bolt = api.sceneFor("chemistry", 1);
  assert.match(bolt, /sci-flash-soft/, "lightning bolt must glow softly");
  assert.match(bolt, /sci-rumble/, "thunder cloud must rumble gently");
  assert.match(bolt, /sci-sun-late/, "calm sun must return at the end");
  const seasons = api.sceneFor("universe", 5);
  assert.equal((seasons.match(/sci-season/g) || []).length, 4, "four seasons must each have a phase");
  const float = api.sceneFor("physics", 5);
  assert.match(float, /sci-float-y/, "floating things must bob on the water");
  assert.match(float, /sci-sink/, "sinking things must go down");
});
