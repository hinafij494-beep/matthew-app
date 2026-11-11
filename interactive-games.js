(() => {
  const gameList=document.getElementById("gameList");
  const learningList=document.getElementById("learningList");
  const main=document.querySelector("main");
  if(!gameList||!main)return;

  const pairs=[
    {id:"apple",emoji:"🍎",word:"تفاحة"},
    {id:"cat",emoji:"🐱",word:"قطة"},
    {id:"sun",emoji:"☀️",word:"شمس"},
    {id:"ball",emoji:"⚽",word:"كرة"},
    {id:"lion",emoji:"🦁",word:"أسد"},
    {id:"banana",emoji:"🍌",word:"موز"},
    {id:"fish",emoji:"🐟",word:"سمكة"},
    {id:"car",emoji:"🚗",word:"سيارة"}
  ];
  const listenItems=[
    {id:"a",emoji:"🔤",value:"أ",spoken:"حرف الألف"},
    {id:"b",emoji:"🔤",value:"ب",spoken:"حرف الباء"},
    {id:"t",emoji:"🔤",value:"ت",spoken:"حرف التاء"},
    {id:"m",emoji:"🔤",value:"م",spoken:"حرف الميم"},
    {id:"1",emoji:"1️⃣",value:"١",spoken:"الرقم واحد"},
    {id:"2",emoji:"2️⃣",value:"٢",spoken:"الرقم اتنين"},
    {id:"3",emoji:"3️⃣",value:"٣",spoken:"الرقم تلاتة"},
    {id:"4",emoji:"4️⃣",value:"٤",spoken:"الرقم أربعة"}
  ];
  const shuffle=list=>[...list].sort(()=>Math.random()-.5);
  const speak=text=>window.MatthewVoice?.speak(text,"ar-EG");
  const panel=document.createElement("section");
  panel.id="touchGames";panel.className="quiz-panel hidden";
  main.insertBefore(panel,document.querySelector("footer"));
  const card=document.createElement("button");
  card.type="button";card.className="game-card pink";
  card.innerHTML='<span class="game-icon">🧩</span><strong>التوصيل واسمع واختار</strong><small>ألعاب سهلة باللمس والصوت</small><span class="play">ابدأ اللعب ←</span>';
  gameList.append(card);

  let mode="match",round=0,score=0,selected=null,matched=new Set(),currentTarget=null,choices=[];
  function open(){
    gameList.classList.add("hidden");learningList?.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    panel.classList.remove("hidden");mode="match";round=0;score=0;renderMenu();
  }
  function back(){
    panel.classList.add("hidden");gameList.classList.remove("hidden");learningList?.classList.remove("hidden");
    window.MatthewVoice?.stop();
  }
  function header(title){
    return '<div class="quiz-top"><button id="touchGameBack" class="back" type="button">→ رجوع</button><strong>'+title+'</strong><span>⭐ '+score+'</span></div>';
  }
  function bindBack(){panel.querySelector("#touchGameBack").onclick=back;}
  function renderMenu(){
    panel.innerHTML=header("🧩 ألعاب الملك ماثيو")+'<h2 class="touch-game-title">اختار اللعبة يا بطل</h2><div class="touch-game-menu"><button id="matchMode" class="science-card"><span>🖼️</span><b>وصل الصورة بالكلمة</b><small>اضغط الصورة وبعدها الكلمة</small></button><button id="listenMode" class="science-card"><span>🔊</span><b>اسمع واختار</b><small>اسمع الحرف أو الرقم واختاره</small></button></div>';
    bindBack();
    panel.querySelector("#matchMode").onclick=()=>{mode="match";round=0;score=0;newMatch()};
    panel.querySelector("#listenMode").onclick=()=>{mode="listen";round=0;score=0;newListen()};
  }
  function newMatch(){
    selected=null;matched=new Set();
    const set=shuffle(pairs).slice(0,4);
    const words=shuffle(set);
    panel.innerHTML=header("🖼️ وصل الصورة بالكلمة")+'<p class="touch-game-instruction">اضغط على الصورة، وبعدها اضغط الكلمة اللي تناسبها</p><div class="matching-board"><div class="matching-column">'+set.map(x=>'<button class="match-image" type="button" data-image="'+x.id+'"><span>'+x.emoji+'</span></button>').join("")+'</div><div class="matching-column">'+words.map(x=>'<button class="match-word" type="button" data-word="'+x.id+'">'+x.word+'</button>').join("")+'</div></div><p id="touchGameFeedback" class="feedback" aria-live="polite">وصل الأربع صور يا بطل ⭐</p><button id="matchNext" class="primary hidden" type="button">جولة جديدة ←</button>';
    bindBack();
    panel.querySelectorAll("[data-image]").forEach(button=>button.onclick=()=>{
      if(matched.has(button.dataset.image))return;
      panel.querySelectorAll(".match-image").forEach(x=>x.classList.remove("selected"));
      selected=button.dataset.image;button.classList.add("selected");
      speak("اختار الكلمة المناسبة للصورة");
    });
    panel.querySelectorAll("[data-word]").forEach(button=>button.onclick=()=>{
      if(!selected){panel.querySelector("#touchGameFeedback").textContent="اختار صورة الأول يا بطل";return}
      const id=button.dataset.word;
      if(id===selected){
        matched.add(id);score++;button.classList.add("matched");
        panel.querySelector('[data-image="'+id+'"]')?.classList.add("matched");
        panel.querySelector("#touchGameFeedback").textContent="برافو! توصيل صحيح ⭐";
        window.MatthewVoice?.feedback("correct");
        selected=null;
        panel.querySelectorAll(".match-image").forEach(x=>x.classList.remove("selected"));
        if(matched.size===4)panel.querySelector("#matchNext").classList.remove("hidden");
      }else{
        panel.querySelector("#touchGameFeedback").textContent="قربت! جرّب توصيل تاني 💜";
        window.MatthewVoice?.feedback("wrong");
        selected=null;panel.querySelectorAll(".match-image").forEach(x=>x.classList.remove("selected"));
      }
      panel.querySelector(".quiz-top span").textContent="⭐ "+score;
    });
    panel.querySelector("#matchNext").onclick=()=>{
      if(round>=2)finish();
      else{round++;newMatch()}
    };
  }
  function newListen(){
    currentTarget=listenItems[Math.floor(Math.random()*listenItems.length)];
    choices=shuffle([currentTarget,...shuffle(listenItems.filter(x=>x.id!==currentTarget.id)).slice(0,3)]);
    panel.innerHTML=header("🔊 اسمع واختار")+'<p class="touch-game-instruction">اضغط اسمع السؤال، وبعدها اختار الحرف أو الرقم اللي سمعته</p><div class="listen-target"><span>🎧</span><strong>مستعد؟</strong><button id="listenAgain" class="voice-button" type="button">🔊 اسمع السؤال</button></div><div class="listen-choices">'+choices.map(x=>'<button class="listen-choice" type="button" data-listen="'+x.id+'"><span>'+x.emoji+'</span><b>'+x.value+'</b></button>').join("")+'</div><p id="touchGameFeedback" class="feedback" aria-live="polite"></p><button id="listenNext" class="primary hidden" type="button">السؤال التالي ←</button>';
    bindBack();
    const sayTarget=()=>speak("اسمع كويس يا ماثيو. اختار "+currentTarget.spoken);
    panel.querySelector("#listenAgain").onclick=sayTarget;
    setTimeout(sayTarget,180);
    let answered=false;
    panel.querySelectorAll("[data-listen]").forEach(button=>button.onclick=()=>{
      if(answered)return;answered=true;
      const correct=button.dataset.listen===currentTarget.id;try{window.MatthewMastery?.record("listening",correct);window.MatthewMastery?.record("listen:"+currentTarget.id,correct)}catch(_){}
      if(correct){score++;button.classList.add("correct");panel.querySelector("#touchGameFeedback").textContent="برافو يا ملك ماثيو! إجابة صحيحة ⭐";window.MatthewVoice?.feedback("correct")}
      else{button.classList.add("wrong");panel.querySelector("#touchGameFeedback").textContent="محاولة جميلة! الإجابة الصحيحة "+currentTarget.value;window.MatthewVoice?.feedback("wrong")}
      panel.querySelectorAll("[data-listen]").forEach(x=>{x.disabled=true;if(x.dataset.listen===currentTarget.id)x.classList.add("correct")});
      panel.querySelector(".quiz-top span").textContent="⭐ "+score;
      panel.querySelector("#listenNext").classList.remove("hidden");
    });
    panel.querySelector("#listenNext").onclick=()=>{if(round>=4)finish();else{round++;newListen()}};
  }
  function finish(){
    const points=score*10,stars=Math.max(0,Math.round(score/(mode==="match"?12:5)*5));
    localStorage.setItem("matthewPoints",Number(localStorage.getItem("matthewPoints")||0)+points);
    localStorage.setItem("matthewStars",Number(localStorage.getItem("matthewStars")||0)+stars);
    if(score>0)localStorage.setItem("matthewTrophies",Number(localStorage.getItem("matthewTrophies")||0)+1);
    panel.innerHTML=header("🏆 النتيجة")+'<div class="academy-visual">🎉</div><h2 class="touch-game-title">برافو يا ملك ماثيو!</h2><p class="academy-hint">جمعت '+score+' نقطة صح!</p><p class="math-tip">⭐ '+stars+' نجمة جديدة و 💎 '+points+' نقطة</p><button id="touchPlayAgain" class="primary">العب تاني</button><button id="touchGameHome" class="secondary">العودة للمملكة</button>';
    panel.querySelector("#touchPlayAgain").onclick=()=>{round=0;score=0;if(mode==="match")newMatch();else newListen()};
    panel.querySelector("#touchGameHome").onclick=back;
    window.updateStats?.();
  }
  card.addEventListener("click",open);
})();

/* =====================================================================
 * Phase 1-2 upgrade bundle — inlined into this file on purpose.
 * The existing Android workflow copies interactive-games.js into the APK
 * but cannot be edited by the Muse GitHub App (workflows permission),
 * so the new modules are bundled here to ship in the APK as well as on
 * the web. Canonical sources stay in mastery.js / parent.js / tracing.js /
 * reading.js — tests/content.test.js verifies this bundle matches them.
 * ===================================================================== */
"use strict";
/*
 * MatthewMastery — per-skill mastery tracking with spaced repetition.
 *
 * Pedagogy (KG1): a skill is only "mastered" after repeated correct answers
 * spread over time, not after one lucky guess. Correct answers move a skill
 * up a ladder of review intervals (same session -> 1 day -> 3 days -> 1 week
 * -> 2 weeks). A wrong answer drops the skill one rung and schedules a
 * near-term review, so mistakes are revisited soon but without punishment.
 *
 * Storage: localStorage key "matthewMasteryV1"
 *   { "<skillId>": { seen, correct, wrong, streak, level, lastAt, nextReviewAt } }
 * The module is environment-agnostic so it can be unit-tested in Node.
 */
(function (root, factory) {
  const api = factory();
  root.MatthewMastery = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const STORAGE_KEY = "matthewMasteryV1";
  const DAY = 24 * 60 * 60 * 1000;
  // Review ladder in days, indexed by level 0..4. Level 0 = review today.
  const INTERVALS_DAYS = [0, 1, 3, 7, 14];
  const MAX_LEVEL = INTERVALS_DAYS.length - 1;

  function storage() {
    try {
      if (typeof localStorage !== "undefined") return localStorage;
    } catch (_) { /* storage can throw in private mode */ }
    return null;
  }

  function load() {
    const store = storage();
    if (!store) return {};
    try {
      const raw = JSON.parse(store.getItem(STORAGE_KEY) || "{}");
      return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    } catch (_) {
      return {};
    }
  }

  function save(data) {
    const store = storage();
    if (!store) return;
    try { store.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) { /* quota */ }
  }

  function blank(now) {
    return { seen: 0, correct: 0, wrong: 0, streak: 0, level: 0, lastAt: 0, nextReviewAt: now };
  }

  // Record one answered question for a skill. Returns the updated record.
  function record(skillId, isCorrect, now) {
    if (!skillId) return null;
    const at = typeof now === "number" ? now : Date.now();
    const data = load();
    const entry = data[skillId] || blank(at);
    entry.seen += 1;
    entry.lastAt = at;
    if (isCorrect) {
      entry.correct += 1;
      entry.streak += 1;
      // Two correct answers in a row are needed to climb one rung, so a
      // single lucky tap never marks a KG1 skill as learned.
      if (entry.streak >= 2 && entry.level < MAX_LEVEL) {
        entry.level += 1;
        entry.streak = 0;
      }
    } else {
      entry.wrong += 1;
      entry.streak = 0;
      if (entry.level > 0) entry.level -= 1;
    }
    entry.nextReviewAt = at + INTERVALS_DAYS[entry.level] * DAY;
    data[skillId] = entry;
    save(data);
    return entry;
  }

  function get(skillId) {
    return load()[skillId] || null;
  }

  function all() {
    return load();
  }

  function accuracy(entry) {
    if (!entry || !entry.seen) return 0;
    return entry.correct / entry.seen;
  }

  // A skill counts as mastered at the top two rungs with solid accuracy.
  function isMastered(entry) {
    return !!entry && entry.level >= 3 && entry.seen >= 4 && accuracy(entry) >= 0.75;
  }

  // Skills whose review date has arrived, weakest first.
  function dueSkills(now) {
    const at = typeof now === "number" ? now : Date.now();
    return Object.entries(load())
      .filter(([, entry]) => entry.seen > 0 && entry.nextReviewAt <= at && !isMastered(entry))
      .sort((a, b) => (accuracy(a[1]) - accuracy(b[1])) || (a[1].nextReviewAt - b[1].nextReviewAt))
      .map(([skillId, entry]) => ({ skillId, ...entry }));
  }

  // Selection weight for question picking: due/weak skills surface more
  // often, new skills get a fair chance, mastered skills mostly rest.
  function weight(skillId, now) {
    const at = typeof now === "number" ? now : Date.now();
    const entry = load()[skillId];
    if (!entry || !entry.seen) return 3; // unseen: introduce it
    if (isMastered(entry)) return entry.nextReviewAt <= at ? 1 : 0.25;
    const dueBoost = entry.nextReviewAt <= at ? 3 : 1;
    return dueBoost * (1 + (1 - accuracy(entry)) * 2);
  }

  function summary(now) {
    const data = load();
    const skills = Object.entries(data).map(([skillId, entry]) => ({
      skillId,
      ...entry,
      accuracy: accuracy(entry),
      mastered: isMastered(entry)
    }));
    const seen = skills.reduce((sum, s) => sum + s.seen, 0);
    const correct = skills.reduce((sum, s) => sum + s.correct, 0);
    return {
      skills,
      totalSeen: seen,
      totalCorrect: correct,
      overallAccuracy: seen ? correct / seen : 0,
      masteredCount: skills.filter(s => s.mastered).length,
      dueCount: dueSkills(now).length,
      strengths: skills.filter(s => s.seen >= 4 && s.accuracy >= 0.8).sort((a, b) => b.accuracy - a.accuracy),
      needsPractice: skills.filter(s => s.seen >= 3 && s.accuracy < 0.6).sort((a, b) => a.accuracy - b.accuracy)
    };
  }

  function reset() {
    const store = storage();
    if (store) { try { store.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ } }
  }

  return {
    STORAGE_KEY,
    INTERVALS_DAYS,
    record,
    get,
    all,
    accuracy,
    isMastered,
    dueSkills,
    weight,
    summary,
    reset
  };
});

"use strict";
/*
 * Parent dashboard (لوحة ولي الأمر) — id "parentPanel".
 * Other modules already hide #parentPanel when they open, so the panel uses
 * exactly that id. Entry is gated by a simple adult arithmetic question so a
 * KG1 child does not wander in and reset progress by accident.
 * All figures come from MatthewMastery (per-skill records) plus the existing
 * matthewHistory / matthewMathProgress keys — nothing new is collected.
 */
(() => {
  const main = document.querySelector("main");
  const learningList = document.getElementById("learningList");
  const gameList = document.getElementById("gameList");
  if (!main || !learningList || document.getElementById("parentPanel")) return;

  const LABELS = {
    "numbers": "عالم الأرقام",
    "letters": "حروف وكلمات",
    "colors": "الألوان والأشكال",
    "world": "معلومات ممتعة",
    "science": "العلوم والكون",
    "mixed": "اختبار المفاجآت",
    "arabic-letters": "مدرسة الحروف العربية",
    "math-ar": "رحلة الحساب بالعربي",
    "math-en": "Math in English",
    "listening": "اسمع واختار",
    "tracing": "تتبّع الكتابة",
    "reading-ar": "بداية القراءة بالعربي",
    "reading-en": "English CVC reading"
  };
  const digits = value => String(value).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  const pct = value => digits(Math.round(value * 100)) + "٪";

  const panel = document.createElement("section");
  panel.id = "parentPanel";
  panel.className = "academy-panel hidden";
  main.insertBefore(panel, document.querySelector("footer"));

  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card blue";
  card.innerHTML = '<span class="game-icon">👨‍👩‍👦</span><strong>لوحة ولي الأمر</strong><small>تقدم ماثيو ونقاط القوة والمراجعة</small><span class="play">للكبار فقط ←</span>';
  learningList.append(card);

  let gateA = 0, gateB = 0;

  function open() {
    gameList.classList.add("hidden");
    learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    panel.classList.remove("hidden");
    renderGate();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    learningList.classList.remove("hidden");
  }

  function renderGate() {
    gateA = 6 + Math.floor(Math.random() * 7); // 6..12
    gateB = 5 + Math.floor(Math.random() * 6); // 5..10
    panel.innerHTML =
      '<div class="quiz-top"><button id="parentBack" class="back" type="button">🏠 الرئيسية</button><strong>لوحة ولي الأمر</strong><span>للكبار</span></div>' +
      '<div class="basic-focus"><div class="basic-emoji">🔐</div><h2>سؤال سريع للكبار</h2>' +
      '<p>كام ناتج ' + digits(gateA) + ' + ' + digits(gateB) + '؟</p>' +
      '<div class="parent-gate"><input id="parentGateInput" inputmode="numeric" autocomplete="off" aria-label="ناتج الجمع">' +
      '<button id="parentGateBtn" class="primary" type="button">دخول</button></div>' +
      '<p id="parentGateMsg" class="feedback" aria-live="polite"></p></div>';
    panel.querySelector("#parentBack").onclick = close;
    const check = () => {
      const value = Number(String(panel.querySelector("#parentGateInput").value).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)));
      if (value === gateA + gateB) renderDashboard();
      else panel.querySelector("#parentGateMsg").textContent = "الإجابة مش صح، ركّز وجرب تاني.";
    };
    panel.querySelector("#parentGateBtn").onclick = check;
    panel.querySelector("#parentGateInput").addEventListener("keydown", e => { if (e.key === "Enter") check(); });
  }

  function topLevelSkills(summary) {
    // Collapse granular skills like "letters:<question>" into their category.
    const byCategory = new Map();
    for (const skill of summary.skills) {
      const category = skill.skillId.split(":")[0];
      if (skill.skillId.includes(":") && LABELS[skill.skillId]) continue; // safety
      const agg = byCategory.get(category) || { category, seen: 0, correct: 0, wrong: 0, mastered: false };
      // Category rows recorded directly carry the totals; granular rows are
      // already included in them, so only add granular rows for categories
      // that have no direct row (e.g. arabic-letter:ب).
      agg.seen += skill.seen; agg.correct += skill.correct; agg.wrong += skill.wrong;
      agg.mastered = agg.mastered || skill.mastered;
      byCategory.set(category, agg);
    }
    const direct = new Set(summary.skills.filter(s => !s.skillId.includes(":")).map(s => s.skillId.split(":")[0]));
    return [...byCategory.values()].map(row => {
      // Avoid double counting: if a direct category row exists it already
      // includes its granular children because both are recorded per answer;
      // in that case prefer the direct row only.
      if (direct.has(row.category)) {
        const directRow = summary.skills.find(s => s.skillId === row.category);
        return { ...row, seen: directRow.seen, correct: directRow.correct, wrong: directRow.wrong, mastered: directRow.mastered };
      }
      return row;
    }).filter(row => row.seen > 0).sort((a, b) => b.seen - a.seen);
  }

  function renderDashboard() {
    const mastery = window.MatthewMastery;
    const summary = mastery ? mastery.summary() : { skills: [], totalSeen: 0, totalCorrect: 0, overallAccuracy: 0, masteredCount: 0, dueCount: 0, strengths: [], needsPractice: [] };
    const rows = topLevelSkills(summary);
    let history = [];
    try { history = JSON.parse(localStorage.getItem("matthewHistory") || "[]"); if (!Array.isArray(history)) history = []; } catch (_) { history = []; }

    const rowsHtml = rows.length ? rows.map(row => {
      const acc = row.seen ? row.correct / row.seen : 0;
      const state = row.mastered ? "أتقنها 🏆" : acc >= 0.8 && row.seen >= 4 ? "قوي 💪" : acc < 0.6 && row.seen >= 3 ? "يحتاج تدريب 🌱" : "بيتعلم 📚";
      return '<div class="parent-row"><strong>' + (LABELS[row.category] || row.category) + '</strong>' +
        '<span>' + digits(row.correct) + ' صح من ' + digits(row.seen) + ' (' + pct(acc) + ')</span>' +
        '<span>' + state + '</span></div>';
    }).join("") : '<p class="academy-hint">لسه مفيش محاولات مسجلة. أول ما ماثيو يلعب، التقدم هيظهر هنا.</p>';

    const due = mastery ? mastery.dueSkills().slice(0, 5) : [];
    const dueHtml = due.length ? '<ul class="parent-list">' + due.map(s => '<li>' + (LABELS[s.skillId.split(":")[0]] || s.skillId) + ' — دقة ' + pct(s.seen ? s.correct / s.seen : 0) + '</li>').join("") + '</ul>'
      : '<p>مفيش مهارات مستحقة للمراجعة دلوقتي. 👍</p>';

    const weak = summary.needsPractice[0];
    const recommendation = !summary.totalSeen
      ? "ابدأ بجلسة قصيرة (٥–١٠ دقائق) في الحروف أو الأرقام، وخلي النهاية دايمًا على لعبة بيحبها."
      : weak
        ? "ركّز الجلسة الجاية على «" + (LABELS[weak.skillId.split(":")[0]] || weak.skillId) + "» بجلسات قصيرة ومتكررة، والتطبيق هيرجّع له أسئلتها تلقائيًا بنظام التكرار المتباعد."
        : summary.strengths.length
          ? "ماثيو ثابت في مهارات قوية. خليه يكمل بنفس الإيقاع، وجرّب قسمًا جديدًا هذا الأسبوع لتوسيع اهتماماته."
          : "الاستمرارية أهم من طول الجلسة: ١٠ دقائق يوميًا أفضل من ساعة مرة واحدة في الأسبوع.";

    const historyHtml = history.length ? '<ul class="parent-list">' + history.slice(0, 5).map(h =>
      '<li>' + h.category + ': ' + digits(h.score) + ' من ' + digits(h.total) + ' — ' + new Date(h.at).toLocaleDateString("ar-EG") + '</li>').join("") + '</ul>'
      : '<p>لسه مفيش جلسات اختبار مسجلة.</p>';

    panel.innerHTML =
      '<div class="quiz-top"><button id="parentBack" class="back" type="button">🏠 الرئيسية</button><strong>لوحة ولي الأمر</strong><span>📊</span></div>' +
      '<div class="stats parent-stats"><span>🎯 محاولات <b>' + digits(summary.totalSeen) + '</b></span>' +
      '<span>✅ دقة عامة <b>' + pct(summary.overallAccuracy) + '</b></span>' +
      '<span>🏆 مهارات أتقنها <b>' + digits(summary.masteredCount) + '</b></span>' +
      '<span>⏰ للمراجعة اليوم <b>' + digits(summary.dueCount) + '</b></span></div>' +
      '<h3>التقدم حسب القسم</h3>' + rowsHtml +
      '<h3>مستحق للمراجعة (تكرار متباعد)</h3>' + dueHtml +
      '<h3>توصية الجلسة الجاية</h3><p class="math-tip">' + recommendation + '</p>' +
      '<h3>آخر جلسات الاختبار</h3>' + historyHtml +
      '<button id="parentResetMastery" class="secondary" type="button">تصفير بيانات الإتقان فقط</button>';
    panel.querySelector("#parentBack").onclick = close;
    panel.querySelector("#parentResetMastery").onclick = () => {
      if (window.MatthewMastery) window.MatthewMastery.reset();
      renderDashboard();
    };
  }

  card.addEventListener("click", open);
})();

"use strict";
/*
 * Finger tracing (تتبّع الكتابة) — KG1 fine-motor writing practice.
 * The child traces a large guide glyph with a finger (pointer events, so it
 * works with touch and mouse). Coverage is measured against a downsampled
 * mask of the guide glyph itself: the stroke only counts where it follows
 * the letter, which teaches shape and stroke path instead of scribbling.
 * Reaching the coverage goal celebrates, awards the usual stars/points and
 * records mastery under "tracing" / "trace:<glyph>".
 */
(() => {
  const main = document.querySelector("main");
  const learningList = document.getElementById("learningList");
  const gameList = document.getElementById("gameList");
  if (!main || !learningList) return;

  const SETS = {
    arLetters: {
      title: "حروف عربية", lang: "ar-EG", dir: "rtl",
      items: ["أ", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "هـ", "و", "ي"],
      speak: item => item
    },
    enLetters: {
      title: "English Letters", lang: "en-US", dir: "ltr",
      items: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      speak: item => item
    },
    arNumbers: {
      title: "أرقام عربية", lang: "ar-EG", dir: "rtl",
      items: ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠"],
      speak: item => item
    },
    enNumbers: {
      title: "English Numbers", lang: "en-US", dir: "ltr",
      items: "123456789".split("").concat(["10"]),
      speak: item => item
    }
  };
  const GOAL = 0.55; // 55% of the guide must be traced
  const GRID = 72;   // mask resolution

  const panel = document.createElement("section");
  panel.id = "tracingPanel";
  panel.className = "academy-panel hidden";
  main.insertBefore(panel, document.querySelector("footer"));

  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card orange";
  card.innerHTML = '<span class="game-icon">✏️</span><strong>اكتب بإصبعك</strong><small>تتبّع الحروف والأرقام واتعلم الكتابة</small><span class="play">يلا نكتب ←</span>';
  learningList.append(card);

  let setId = "arLetters", index = 0, mask = null, covered = null, guideCells = 0, hitCells = 0, drawing = false, done = false;

  const speak = (text, lang) => {
    if (window.MatthewVoice && window.MatthewVoice.speak) window.MatthewVoice.speak(text, lang);
    else if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = lang; speechSynthesis.speak(u);
    }
  };

  function open() {
    gameList.classList.add("hidden");
    learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    document.getElementById("parentPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    learningList.classList.remove("hidden");
    window.MatthewVoice?.stop();
  }

  function buildMask(glyph) {
    const off = document.createElement("canvas");
    off.width = GRID; off.height = GRID;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    if (!ctx) { mask = new Uint8Array(GRID * GRID); covered = new Uint8Array(GRID * GRID); guideCells = 0; return; }
    ctx.fillStyle = "#000";
    ctx.font = "bold 56px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(glyph, GRID / 2, GRID / 2 + 2);
    const data = ctx.getImageData(0, 0, GRID, GRID).data;
    mask = new Uint8Array(GRID * GRID);
    guideCells = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      // Dilate by treating a cell as guide if it or a neighbour is filled,
      // so a small finger on a big screen can realistically follow the line.
      mask[i] = data[i * 4 + 3] > 40 ? 1 : 0;
    }
    // dilation pass
    const dilated = new Uint8Array(mask);
    for (let y = 1; y < GRID - 1; y++) for (let x = 1; x < GRID - 1; x++) {
      if (!mask[y * GRID + x]) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) dilated[(y + dy) * GRID + (x + dx)] = 1;
    }
    mask = dilated;
    for (let i = 0; i < mask.length; i++) guideCells += mask[i];
    covered = new Uint8Array(GRID * GRID);
    hitCells = 0;
  }

  function render() {
    const set = SETS[setId];
    const glyph = set.items[index];
    done = false;
    panel.innerHTML =
      '<div class="quiz-top"><button id="traceBack" class="back" type="button">🏠 الرئيسية</button><strong>✏️ اكتب بإصبعك</strong><span>' +
      String(index + 1).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) + ' / ' + String(set.items.length).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]) + '</span></div>' +
      '<div class="trace-sets">' + Object.entries(SETS).map(([id, s]) => '<button type="button" class="trace-set' + (id === setId ? " active" : "") + '" data-set="' + id + '">' + s.title + '</button>').join("") + '</div>' +
      '<p class="touch-game-instruction">امشِ بإصبعك على الحرف الرمادي لحد ما تلوّنه كله</p>' +
      '<div class="trace-wrap" dir="' + set.dir + '"><canvas id="traceCanvas" width="320" height="320" aria-label="لوحة تتبع ' + glyph + '"></canvas></div>' +
      '<div class="progress"><div id="traceProgress" style="width:0%"></div></div>' +
      '<p id="traceMsg" class="feedback" aria-live="polite"></p>' +
      '<div class="basic-nav"><button id="traceListen" class="voice-button" type="button">🔊 اسمع</button>' +
      '<button id="traceClear" class="secondary" type="button">امسح وابدأ تاني</button>' +
      '<button id="traceNext" class="primary" type="button">اللي بعده ←</button></div>';
    panel.querySelector("#traceBack").onclick = close;
    panel.querySelectorAll("[data-set]").forEach(b => b.onclick = () => { setId = b.dataset.set; index = 0; render(); });
    panel.querySelector("#traceListen").onclick = () => speak(set.speak(glyph), set.lang);
    panel.querySelector("#traceClear").onclick = render;
    panel.querySelector("#traceNext").onclick = () => { index = (index + 1) % set.items.length; render(); };
    setupCanvas(glyph, set);
    setTimeout(() => speak(set.speak(glyph), set.lang), 150);
  }

  function setupCanvas(glyph, set) {
    const canvas = panel.querySelector("#traceCanvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) { panel.querySelector("#traceMsg").textContent = "هذا الجهاز لا يدعم لوحة الرسم."; return; }
    buildMask(glyph);
    // Draw the guide glyph.
    ctx.clearRect(0, 0, 320, 320);
    ctx.font = "bold 230px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(91,60,196,0.18)";
    ctx.fillText(glyph, 160, 172);
    ctx.strokeStyle = "rgba(91,60,196,0.45)";
    ctx.lineWidth = 2;
    ctx.strokeText(glyph, 160, 172);
    // Prepare the tracing stroke style.
    ctx.strokeStyle = "#ff8a3d";
    ctx.lineWidth = 16;
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    const pos = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * (320 / rect.width), y: (event.clientY - rect.top) * (320 / rect.height) };
    };
    const markCoverage = (x, y) => {
      const gx = Math.floor(x / 320 * GRID), gy = Math.floor(y / 320 * GRID);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const cx = gx + dx, cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
        const cell = cy * GRID + cx;
        if (mask[cell] && !covered[cell]) { covered[cell] = 1; hitCells++; }
      }
      const ratio = guideCells ? hitCells / guideCells : 0;
      panel.querySelector("#traceProgress").style.width = Math.min(100, Math.round(ratio * 100)) + "%";
      if (ratio >= GOAL && !done) finishTracing(glyph, set);
    };
    let last = null;
    canvas.addEventListener("pointerdown", event => {
      drawing = true; last = pos(event);
      canvas.setPointerCapture(event.pointerId);
      markCoverage(last.x, last.y);
      event.preventDefault();
    });
    canvas.addEventListener("pointermove", event => {
      if (!drawing || !last) return;
      const p = pos(event);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      markCoverage(p.x, p.y);
      last = p;
      event.preventDefault();
    });
    const stop = () => { drawing = false; last = null; };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
  }

  function finishTracing(glyph, set) {
    done = true;
    panel.querySelector("#traceMsg").textContent = "برافو يا بطل! كتبت " + glyph + " صح ⭐";
    window.MatthewVoice?.feedback("correct");
    try {
      window.MatthewMastery?.record("tracing", true);
      window.MatthewMastery?.record("trace:" + glyph, true);
      localStorage.setItem("matthewPoints", Number(localStorage.getItem("matthewPoints") || 0) + 10);
      localStorage.setItem("matthewStars", Number(localStorage.getItem("matthewStars") || 0) + 1);
    } catch (_) { /* storage unavailable */ }
    window.updateStats?.();
    speak("برافو يا بطل", set.lang === "en-US" ? "en-US" : "ar-EG");
  }

  card.addEventListener("click", open);
})();

"use strict";
/*
 * Beginning reading (يلا نقرأ) — the bridge from letters to words.
 *
 * Arabic path (phonics-first, standard KG sequence):
 *   1. Syllables with short vowels: بَ بِ بُ (fatha / kasra / damma)
 *   2. Long syllables with madd: بَا بِي بُو
 *   3. Blending: build real words syllable by syllable (بَا + ب = بَاب)
 * English path: CVC words split into sounds (c-a-t -> cat) with the same
 * listen -> blend -> choose flow.
 * Every quiz answer is recorded in MatthewMastery ("reading-ar"/"reading-en").
 */
(() => {
  const main = document.querySelector("main");
  const learningList = document.getElementById("learningList");
  const gameList = document.getElementById("gameList");
  if (!main || !learningList) return;

  const FATHA = "َ", KASRA = "ِ", DAMMA = "ُ";
  // Letters that connect to what follows use their joined form in syllables.
  const LETTERS = [
    { base: "ب", joined: "بـ", name: "الباء" },
    { base: "ت", joined: "تـ", name: "التاء" },
    { base: "ث", joined: "ثـ", name: "الثاء" },
    { base: "م", joined: "مـ", name: "الميم" },
    { base: "ن", joined: "نـ", name: "النون" },
    { base: "س", joined: "سـ", name: "السين" },
    { base: "ك", joined: "كـ", name: "الكاف" },
    { base: "ل", joined: "لـ", name: "اللام" },
    { base: "ف", joined: "فـ", name: "الفاء" },
    { base: "ع", joined: "عـ", name: "العين" }
  ];

  function syllablesFor(letter) {
    return [
      { text: letter.joined + FATHA, say: letter.base + FATHA, label: "فتحة" },
      { text: letter.joined + KASRA, say: letter.base + KASRA, label: "كسرة" },
      { text: letter.joined + DAMMA, say: letter.base + DAMMA, label: "ضمة" },
      { text: letter.joined + "ا", say: letter.base + "ا", label: "مد بالألف" },
      { text: letter.joined + "ي", say: letter.base + "ي", label: "مد بالياء" },
      { text: letter.joined + "و", say: letter.base + "و", label: "مد بالواو" }
    ];
  }

  // Words built from parts the child can already say: [parts, whole, meaning, emoji]
  const AR_WORDS = [
    { parts: ["بَا", "ب"], word: "بَاب", meaning: "باب البيت", emoji: "🚪" },
    { parts: ["بَ", "طَّة"], word: "بَطَّة", meaning: "بطة بتعوم", emoji: "🦆" },
    { parts: ["أَ", "سَد"], word: "أَسَد", meaning: "أسد قوي", emoji: "🦁" },
    { parts: ["قَ", "مَر"], word: "قَمَر", meaning: "قمر في السما", emoji: "🌙" },
    { parts: ["شَ", "مْس"], word: "شَمْس", meaning: "شمس منوّرة", emoji: "☀️" },
    { parts: ["كَ", "لْب"], word: "كَلْب", meaning: "كلب صديق", emoji: "🐶" },
    { parts: ["قِ", "طَّة"], word: "قِطَّة", meaning: "قطة صغيرة", emoji: "🐱" },
    { parts: ["بَ", "حْر"], word: "بَحْر", meaning: "بحر كبير", emoji: "🌊" },
    { parts: ["نَ", "جْم"], word: "نَجْم", meaning: "نجم بيلمع", emoji: "⭐" },
    { parts: ["تُ", "فَّاح"], word: "تُفَّاح", meaning: "تفاح حلو", emoji: "🍎" }
  ];

  const CVC_WORDS = [
    { sounds: ["c", "a", "t"], word: "cat", emoji: "🐱" },
    { sounds: ["d", "o", "g"], word: "dog", emoji: "🐶" },
    { sounds: ["p", "i", "g"], word: "pig", emoji: "🐷" },
    { sounds: ["s", "u", "n"], word: "sun", emoji: "☀️" },
    { sounds: ["b", "u", "s"], word: "bus", emoji: "🚌" },
    { sounds: ["e", "g", "g"], word: "egg", emoji: "🥚" },
    { sounds: ["h", "a", "t"], word: "hat", emoji: "🎩" },
    { sounds: ["b", "e", "d"], word: "bed", emoji: "🛏️" },
    { sounds: ["f", "i", "sh"], word: "fish", emoji: "🐟" },
    { sounds: ["c", "u", "p"], word: "cup", emoji: "🥤" }
  ];

  const panel = document.createElement("section");
  panel.id = "readingPanel";
  panel.className = "academy-panel hidden";
  main.insertBefore(panel, document.querySelector("footer"));

  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card green";
  card.innerHTML = '<span class="game-icon">📖</span><strong>يلا نقرأ</strong><small>مقاطع وكلمات عربي وإنجليزي</small><span class="play">ابدأ القراءة ←</span>';
  learningList.append(card);

  const speak = (text, lang) => {
    if (window.MatthewVoice && window.MatthewVoice.speak) window.MatthewVoice.speak(text, lang);
    else if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 0.85; speechSynthesis.speak(u);
    }
  };
  const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  let mode = "ar-syllables", letterIndex = 0, wordIndex = 0;

  function open() {
    gameList.classList.add("hidden");
    learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    document.getElementById("parentPanel")?.classList.add("hidden");
    panel.classList.remove("hidden");
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    learningList.classList.remove("hidden");
    window.MatthewVoice?.stop();
  }

  function header(title) {
    return '<div class="quiz-top"><button id="readBack" class="back" type="button">🏠 الرئيسية</button><strong>' + title + '</strong><span>📖</span></div>' +
      '<div class="trace-sets">' +
      '<button type="button" class="trace-set' + (mode === "ar-syllables" ? " active" : "") + '" data-mode="ar-syllables">مقاطع عربي</button>' +
      '<button type="button" class="trace-set' + (mode === "ar-words" ? " active" : "") + '" data-mode="ar-words">كلمات عربي</button>' +
      '<button type="button" class="trace-set' + (mode === "en-cvc" ? " active" : "") + '" data-mode="en-cvc">English CVC</button>' +
      '<button type="button" class="trace-set' + (mode === "quiz" ? " active" : "") + '" data-mode="quiz">تحدي القراءة</button></div>';
  }

  function bindHeader(title) {
    panel.querySelector("#readBack").onclick = close;
    panel.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { mode = b.dataset.mode; render(); });
  }

  function render() {
    if (mode === "ar-syllables") renderSyllables();
    else if (mode === "ar-words") renderArWord();
    else if (mode === "en-cvc") renderCvc();
    else renderQuiz();
  }

  function renderSyllables() {
    const letter = LETTERS[letterIndex];
    const syllables = syllablesFor(letter);
    panel.innerHTML = header("📖 مقاطع حرف " + letter.name) +
      '<p class="touch-game-instruction">اضغط على كل مقطع واسمع صوته. الحرف بيغيّر صوته مع الفتحة والكسرة والضمة والمد.</p>' +
      '<div class="read-syllables">' + syllables.map((s, i) => '<button type="button" class="read-syllable" data-syl="' + i + '"><b>' + s.text + '</b><small>' + s.label + '</small></button>').join("") + '</div>' +
      '<div class="basic-nav"><button id="readPrevLetter" class="secondary" type="button">الحرف السابق</button>' +
      '<button id="readNextLetter" class="primary" type="button">الحرف التالي ←</button></div>';
    bindHeader();
    panel.querySelectorAll("[data-syl]").forEach(b => b.onclick = () => speak(syllables[Number(b.dataset.syl)].say, "ar-EG"));
    panel.querySelector("#readPrevLetter").onclick = () => { letterIndex = (letterIndex + LETTERS.length - 1) % LETTERS.length; renderSyllables(); };
    panel.querySelector("#readNextLetter").onclick = () => { letterIndex = (letterIndex + 1) % LETTERS.length; renderSyllables(); };
    setTimeout(() => speak(letter.name + ". " + syllables[0].say + ". " + syllables[3].say, "ar-EG"), 150);
  }

  function renderArWord() {
    const item = AR_WORDS[wordIndex % AR_WORDS.length];
    panel.innerHTML = header("📖 نبني كلمة") +
      '<div class="basic-focus"><div class="basic-emoji">' + item.emoji + '</div>' +
      '<div class="read-parts">' + item.parts.map((p, i) => '<button type="button" class="read-part" data-part="' + i + '">' + p + '</button>').join('<span class="read-plus">+</span>') +
      '<span class="read-plus">=</span><button type="button" class="read-part whole" id="readWhole">' + item.word + '</button></div>' +
      '<h2>' + item.meaning + '</h2><p>اضغط على كل مقطع، وبعدين اضغط على الكلمة كلها</p>' +
      '<button id="readWordListen" class="voice-button" type="button">🔊 اسمع الكلمة</button></div>' +
      '<div class="basic-nav"><button id="readPrevWord" class="secondary" type="button">الكلمة السابقة</button>' +
      '<button id="readNextWord" class="primary" type="button">كلمة جديدة ←</button></div>';
    bindHeader();
    panel.querySelectorAll("[data-part]").forEach(b => b.onclick = () => speak(item.parts[Number(b.dataset.part)], "ar-EG"));
    panel.querySelector("#readWhole").onclick = () => speak(item.word, "ar-EG");
    panel.querySelector("#readWordListen").onclick = () => speak(item.parts.join("، ") + ". " + item.word, "ar-EG");
    panel.querySelector("#readPrevWord").onclick = () => { wordIndex = (wordIndex + AR_WORDS.length - 1) % AR_WORDS.length; renderArWord(); };
    panel.querySelector("#readNextWord").onclick = () => { wordIndex = (wordIndex + 1) % AR_WORDS.length; renderArWord(); };
  }

  function renderCvc() {
    const item = CVC_WORDS[wordIndex % CVC_WORDS.length];
    panel.innerHTML = header("📖 English CVC Words") +
      '<div class="basic-focus" dir="ltr"><div class="basic-emoji">' + item.emoji + '</div>' +
      '<div class="read-parts">' + item.sounds.map((s, i) => '<button type="button" class="read-part" data-sound="' + i + '">' + s + '</button>').join('<span class="read-plus">+</span>') +
      '<span class="read-plus">=</span><button type="button" class="read-part whole" id="readWholeEn">' + item.word + '</button></div>' +
      '<p>Tap each sound, then blend them together</p>' +
      '<button id="readCvcListen" class="voice-button" type="button">🔊 Listen</button></div>' +
      '<div class="basic-nav"><button id="readPrevCvc" class="secondary" type="button">Previous</button>' +
      '<button id="readNextCvc" class="primary" type="button">New word →</button></div>';
    bindHeader();
    panel.querySelectorAll("[data-sound]").forEach(b => b.onclick = () => speak(item.sounds[Number(b.dataset.sound)], "en-US"));
    panel.querySelector("#readWholeEn").onclick = () => speak(item.word, "en-US");
    panel.querySelector("#readCvcListen").onclick = () => speak(item.sounds.join(", ") + ". " + item.word, "en-US");
    panel.querySelector("#readPrevCvc").onclick = () => { wordIndex = (wordIndex + CVC_WORDS.length - 1) % CVC_WORDS.length; renderCvc(); };
    panel.querySelector("#readNextCvc").onclick = () => { wordIndex = (wordIndex + 1) % CVC_WORDS.length; renderCvc(); };
  }

  function renderQuiz() {
    const useArabic = Math.random() < 0.5;
    let prompt, spoken, lang, skill, choices;
    if (useArabic) {
      const item = AR_WORDS[Math.floor(Math.random() * AR_WORDS.length)];
      prompt = item.emoji + " " + item.meaning;
      spoken = item.word; lang = "ar-EG"; skill = "reading-ar";
      choices = shuffle([item, ...shuffle(AR_WORDS.filter(w => w.word !== item.word)).slice(0, 3)]);
      panel.innerHTML = header("📖 تحدي القراءة") +
        '<div class="basic-focus"><div class="basic-emoji">' + item.emoji + '</div><h2>اسمع الكلمة واختارها</h2>' +
        '<button id="readQuizListen" class="voice-button" type="button">🔊 اسمع الكلمة</button>' +
        '<div class="read-choices">' + choices.map(c => '<button type="button" class="read-choice" data-word="' + c.word + '">' + c.word + '</button>').join("") + '</div>' +
        '<p id="readQuizMsg" class="feedback" aria-live="polite"></p>' +
        '<button id="readQuizNext" class="primary hidden" type="button">كلمة جديدة ←</button></div>';
      bindHeader();
      panel.querySelector("#readQuizListen").onclick = () => speak(spoken, lang);
      setTimeout(() => speak(spoken, lang), 200);
      let answered = false;
      panel.querySelectorAll("[data-word]").forEach(b => b.onclick = () => {
        if (answered) return; answered = true;
        const correct = b.dataset.word === item.word;
        try { window.MatthewMastery?.record(skill, correct); window.MatthewMastery?.record("read-word:" + item.word, correct); } catch (_) { /* ignore */ }
        b.classList.add(correct ? "correct" : "wrong");
        panel.querySelectorAll("[data-word]").forEach(x => { x.disabled = true; if (x.dataset.word === item.word) x.classList.add("correct"); });
        panel.querySelector("#readQuizMsg").textContent = correct ? "برافو! قرأت الكلمة صح ⭐" : "دي كلمة " + item.word + ". اسمعها كويس وجرب اللي بعدها.";
        if (correct) window.MatthewVoice?.feedback("correct"); else window.MatthewVoice?.feedback("wrong");
        panel.querySelector("#readQuizNext").classList.remove("hidden");
        panel.querySelector("#readQuizNext").onclick = renderQuiz;
      });
    } else {
      const item = CVC_WORDS[Math.floor(Math.random() * CVC_WORDS.length)];
      spoken = item.word; lang = "en-US"; skill = "reading-en";
      choices = shuffle([item, ...shuffle(CVC_WORDS.filter(w => w.word !== item.word)).slice(0, 3)]);
      panel.innerHTML = header("📖 Reading Challenge") +
        '<div class="basic-focus" dir="ltr"><div class="basic-emoji">' + item.emoji + '</div><h2>Listen and choose the word</h2>' +
        '<button id="readQuizListen" class="voice-button" type="button">🔊 Listen</button>' +
        '<div class="read-choices">' + choices.map(c => '<button type="button" class="read-choice" data-word="' + c.word + '">' + c.word + '</button>').join("") + '</div>' +
        '<p id="readQuizMsg" class="feedback" aria-live="polite"></p>' +
        '<button id="readQuizNext" class="primary hidden" type="button">New word →</button></div>';
      bindHeader();
      panel.querySelector("#readQuizListen").onclick = () => speak(spoken, lang);
      setTimeout(() => speak(spoken, lang), 200);
      let answered = false;
      panel.querySelectorAll("[data-word]").forEach(b => b.onclick = () => {
        if (answered) return; answered = true;
        const correct = b.dataset.word === item.word;
        try { window.MatthewMastery?.record(skill, correct); window.MatthewMastery?.record("read-cvc:" + item.word, correct); } catch (_) { /* ignore */ }
        b.classList.add(correct ? "correct" : "wrong");
        panel.querySelectorAll("[data-word]").forEach(x => { x.disabled = true; if (x.dataset.word === item.word) x.classList.add("correct"); });
        panel.querySelector("#readQuizMsg").textContent = correct ? "Great reading! ⭐" : "That word is " + item.word + ". Listen carefully and try the next one.";
        if (correct) window.MatthewVoice?.feedback("correct"); else window.MatthewVoice?.feedback("wrong");
        panel.querySelector("#readQuizNext").classList.remove("hidden");
        panel.querySelector("#readQuizNext").onclick = renderQuiz;
      });
    }
  }

  card.addEventListener("click", open);
})();
