// rescue.js — «مغامرة الإنقاذ»: الملك ماثيو على حصانه يعبر مراحل الغابة
// لينقذ أخاه مارك وابنة عمه مريم. الأسئلة من نفس بنك «اختبار المفاجآت»
// لكن داخل قصة بمراحل وتشجيع صوتي من الميس.
(() => {
  const main = document.querySelector("main");
  const gameList = document.getElementById("gameList");
  if (!main || !gameList) return;

  const STAGES = [
    { name: "بوابة الغابة", icon: "🌲", clip: "rescueStage1", line: "المرحلة الأولى: بوابة الغابة. جاوب على الأسئلة وعدّي البوابة يا بطل!" },
    { name: "النهر الكبير", icon: "🛶", clip: "rescueStage2", line: "المرحلة التانية: النهر الكبير. قرّبت من مارك ومريم يا بطل!" },
    { name: "الكهف", icon: "🕯️", clip: "rescueStage3", line: "المرحلة التالتة: الكهف. ما تخافش يا بطل، أنت شجاع!" },
    { name: "الشجرة الكبيرة", icon: "🌳", clip: "rescueStage4", line: "آخر مرحلة: الشجرة الكبيرة. مارك ومريم مستنيّينك هناك!" }
  ];
  const CLOSER_CLIPS = ["rescueCloser1", "rescueCloser2", "rescueCloser3"];
  const PER_STAGE = 3;

  const speak = (text, key) => {
    try {
      if (key && window.MatthewClips && window.MatthewClips.playKey(key)) return;
    } catch (_) {}
    window.MatthewVoice?.speak(text, "ar-EG");
  };
  const arabicDigits = value => String(value).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  const shuffle = arr => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  const panel = document.createElement("section");
  panel.id = "rescuePanel";
  panel.className = "quiz-panel hidden";
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML =
    '<div class="quiz-top"><button id="rescueBack" class="back" type="button">→ رجوع</button><strong>🐴 مغامرة الإنقاذ</strong><span id="rescueProgress"></span></div>' +
    '<div class="rescue-map" id="rescueMap" aria-hidden="true"></div>' +
    '<div class="rescue-scene" id="rescueScene"><span class="rescue-king">🤴🐴</span><span class="rescue-stage-icon" id="rescueStageIcon">🌲</span><span class="rescue-kids">👶👧</span></div>' +
    '<h2 id="rescueTitle">أنقذ مارك ومريم!</h2>' +
    '<p id="rescueStory" class="rescue-story"></p>' +
    '<div id="rescuePlay"></div>';
  main.insertBefore(panel, document.querySelector("footer"));
  const $ = id => panel.querySelector("#" + id);

  let stage = 0, inStage = 0, questions = [], current = null, answered = false, score = 0, total = 0;

  const pool = () => {
    try {
      if (typeof bank === "undefined" || !bank) return [];
      return ["numbers", "letters", "colors", "world", "science"].flatMap(cat => (bank[cat] || []).map(q => ({ ...q, cat })));
    } catch (_) { return []; }
  };

  const renderMap = () => {
    const map = $("rescueMap");
    map.innerHTML = STAGES.map((s, i) =>
      '<span class="rescue-stop' + (i < stage ? " done" : i === stage ? " now" : "") + '">' + (i < stage ? "⭐" : s.icon) + '</span>'
    ).join('<span class="rescue-path">- - -</span>') + '<span class="rescue-stop goal">👶👧</span>';
    const king = panel.querySelector(".rescue-king");
    if (king) king.style.transform = "translateX(" + (stage * -18) + "px)";
    $("rescueStageIcon").textContent = STAGES[Math.min(stage, STAGES.length - 1)].icon;
    $("rescueProgress").textContent = arabicDigits("المرحلة " + Math.min(stage + 1, STAGES.length) + " من " + STAGES.length);
  };

  const hideOthers = () => {
    gameList.classList.add("hidden");
    document.getElementById("learningList")?.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    ["numbersPanel", "englishMathPanel", "scienceAcademy", "interactivePanel", "parentPanel", "tracingPanel", "readingPanel", "pronunciationChallenge", "lessonHub", "lessonView"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
  };

  const open = () => {
    const all = pool();
    if (!all.length) return;
    questions = shuffle(all);
    stage = 0; inStage = 0; score = 0; total = 0;
    hideOthers();
    panel.classList.remove("hidden");
    startStage(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startStage = first => {
    renderMap();
    const s = STAGES[stage];
    $("rescueTitle").textContent = s.icon + " " + s.name;
    $("rescueStory").textContent = first && stage === 0
      ? "يا خبر! مارك ومريم تايهين في الغابة! اركب حصانك وخد سيفك وروح أنقذهم يا ملك ماثيو!"
      : s.line;
    if (first && stage === 0) speak("يا خبر! مارك ومريم تايهين في الغابة! يلا يا ملك ماثيو، اركب حصانك وخد سيفك وروح أنقذهم!", "rescueIntro");
    else speak(s.line, s.clip);
    nextQuestion();
  };

  const nextQuestion = () => {
    answered = false;
    current = questions[(stage * PER_STAGE + inStage) % questions.length];
    const play = $("rescuePlay");
    play.innerHTML =
      '<div class="question-emoji">' + current.e + '</div>' +
      '<h3 class="rescue-question">' + arabicDigits(current.q) + '</h3>' +
      '<button type="button" class="voice-button" id="rescueListen">🔊 اسمع السؤال</button>' +
      '<div class="answers" id="rescueAnswers"></div>' +
      '<p class="feedback" id="rescueFeedback"></p>' +
      '<button type="button" class="primary hidden" id="rescueNext">كمّل الرحلة ←</button>';
    play.querySelector("#rescueListen").addEventListener("click", () => window.MatthewVoice?.speak(current.q, "ar-EG"));
    setTimeout(() => window.MatthewVoice?.speak(current.q, "ar-EG"), 350);
    const answers = play.querySelector("#rescueAnswers");
    shuffle(current.a.map((text, i) => ({ text, correct: i === current.c }))).forEach(item => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "answer"; b.dataset.answer = item.text;
      b.innerHTML = '<span class="answer-label">' + arabicDigits(item.text) + '</span>';
      b.addEventListener("click", () => choose(b, item.correct, answers));
      answers.append(b);
    });
    play.querySelector("#rescueNext").addEventListener("click", advance);
  };

  const choose = (button, correct, answers) => {
    if (answered) return;
    answered = true; total++;
    try { window.MatthewMastery?.record("rescue:" + current.q, correct); window.MatthewMastery?.record(current.cat + ":" + current.q, correct); } catch (_) {}
    answers.querySelectorAll(".answer").forEach(b => { b.disabled = true; });
    const feedback = $("rescuePlay").querySelector("#rescueFeedback");
    if (correct) {
      score++;
      button.classList.add("correct");
      feedback.textContent = "برافو يا بطل! إجابة صح ⭐";
      window.MatthewVoice?.feedback("correct");
    } else {
      button.classList.add("wrong");
      feedback.textContent = "محاولة جميلة يا بطل! الإجابة الصح باللون الأخضر 💜";
      answers.querySelectorAll(".answer").forEach(b => { if (b.dataset.answer === current.a[current.c]) b.classList.add("correct"); });
      window.MatthewVoice?.feedback("wrong");
    }
    $("rescuePlay").querySelector("#rescueNext").classList.remove("hidden");
  };

  const advance = () => {
    inStage++;
    if (inStage < PER_STAGE) { nextQuestion(); return; }
    inStage = 0; stage++;
    if (stage >= STAGES.length) { win(); return; }
    renderMap();
    const s = STAGES[stage];
    $("rescueTitle").textContent = "قرّبت يا بطل! 🎉";
    $("rescueStory").textContent = "عدّيت مرحلة! مارك ومريم بقوا أقرب… كمّل يا بطل!";
    speak(s.line, CLOSER_CLIPS[Math.min(stage - 1, CLOSER_CLIPS.length - 1)]);
    const play = $("rescuePlay");
    play.innerHTML = '<div class="question-emoji">' + s.icon + '</div><h3 class="rescue-question">المرحلة اللي جاية: ' + s.name + '</h3><button type="button" class="primary" id="rescueGo">يلا كمّل ←</button>';
    play.querySelector("#rescueGo").addEventListener("click", () => startStage(false));
  };

  const win = () => {
    renderMap();
    panel.querySelector(".rescue-king").style.transform = "translateX(-72px)";
    $("rescueTitle").textContent = "وصلت يا بطل! 🎉";
    $("rescueStory").textContent = "أنقذت مارك ومريم! هما بخير وفرحانين بيك أوي يا أحلى أخ في الدنيا!";
    speak("عملتها يا بطل! أنقذت مارك ومريم! أنت أحسن أخ في الدنيا!", "rescueWin");
    window.MatthewVoice?.feedback("correct");
    const stars = Math.max(1, Math.round((score / Math.max(1, total)) * 5));
    try {
      const old = Number(localStorage.getItem("matthewStars") || 0);
      localStorage.setItem("matthewStars", old + stars);
      const trophies = Number(localStorage.getItem("matthewTrophies") || 0);
      localStorage.setItem("matthewTrophies", trophies + 1);
      let history = [];
      try { history = JSON.parse(localStorage.getItem("matthewHistory") || "[]"); if (!Array.isArray(history)) history = []; } catch (_) { history = []; }
      history.unshift({ category: "مغامرة الإنقاذ", score, total, stars, points: score * 10, at: Date.now() });
      localStorage.setItem("matthewHistory", JSON.stringify(history.slice(0, 30)));
    } catch (_) {}
    const play = $("rescuePlay");
    play.innerHTML =
      '<div class="question-emoji">🤴🐴👶👧</div>' +
      '<div class="result-stars">' + "⭐".repeat(stars) + "☆".repeat(5 - stars) + '</div>' +
      '<p class="feedback">جاوبت صح على ' + arabicDigits(score) + ' من ' + arabicDigits(total) + ' أسئلة</p>' +
      '<button type="button" class="primary" id="rescueAgain">مغامرة جديدة ←</button>' +
      '<button type="button" class="secondary" id="rescueHome">العودة للمملكة</button>';
    play.querySelector("#rescueAgain").addEventListener("click", open);
    play.querySelector("#rescueHome").addEventListener("click", close);
  };

  const close = () => {
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    document.getElementById("learningList")?.classList.remove("hidden");
    try { window.MatthewVoice?.stop(); } catch (_) {}
    if (typeof updateStats === "function") { try { updateStats(); } catch (_) {} }
  };
  $("rescueBack").addEventListener("click", close);

  if (!document.getElementById("rescueStyle")) {
    const style = document.createElement("style");
    style.id = "rescueStyle";
    style.textContent =
      ".rescue-map{display:flex;align-items:center;justify-content:center;gap:6px;font-size:1.5rem;margin:10px 0}" +
      ".rescue-map .rescue-path{color:#b9a8e8;font-size:1rem;letter-spacing:2px}" +
      ".rescue-map .rescue-stop{opacity:.45;filter:grayscale(.4)}" +
      ".rescue-map .rescue-stop.done{opacity:1;filter:none}" +
      ".rescue-map .rescue-stop.now{opacity:1;filter:none;transform:scale(1.25)}" +
      ".rescue-map .rescue-stop.goal{opacity:1}" +
      ".rescue-scene{display:flex;align-items:center;justify-content:space-between;font-size:2.2rem;background:linear-gradient(180deg,#bfe8ff,#e8ffd9);border-radius:20px;padding:10px 18px;margin:8px 0}" +
      ".rescue-king{transition:transform .6s ease}" +
      ".rescue-kids{font-size:1.8rem}" +
      ".rescue-story{font-size:1.1rem;line-height:1.9;color:#4a3f75}" +
      ".rescue-question{font-size:1.35rem;margin:10px 0}";
    document.head.append(style);
  }

  const rescueCard = document.querySelector("[data-rescue]");
  if (rescueCard) rescueCard.addEventListener("click", open);

  window.MatthewRescue = { open, close, stages: STAGES.map(s => s.name) };
})();
