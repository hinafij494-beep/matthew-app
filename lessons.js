(() => {
  const lessons = [
    {letter:"أ",name:"الألف",forms:["أ","ـأ","ـأ"],words:["أَسَد","سَأَلَ","مَلْجَأ"],emoji:["🦁","<svg viewBox='0 0 64 64' aria-hidden='true'><circle cx='18' cy='44' r='10' fill='#ffd9b3' stroke='#b5651d' stroke-width='2.5'/><circle cx='15' cy='43' r='1.5' fill='#4a2f14'/><circle cx='21' cy='43' r='1.5' fill='#4a2f14'/><path d='M15 49 q3 3 6 0' stroke='#b5651d' stroke-width='2' fill='none' stroke-linecap='round'/><path d='M30 10 h22 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 h-12 l-8 8 v-8 h-2 a6 6 0 0 1 -6 -6 V16 a6 6 0 0 1 6 -6Z' fill='#fff' stroke='#7c5cff' stroke-width='2.5'/><path d='M44 14 q6 0 6 6 q0 4 -4 5 q-2 1 -2 3' stroke='#7c5cff' stroke-width='3' fill='none' stroke-linecap='round'/><circle cx='44' cy='30' r='2' fill='#7c5cff'/></svg>","🏡"],sound:"أَ"},
    {letter:"ب",name:"الباء",forms:["بـ","ـبـ","ـب"],words:["بَطَّة","جَبَل","بَاب"],emoji:["🦆","⛰️","🚪"],sound:"بَ"},
    {letter:"ت",name:"التاء",forms:["تـ","ـتـ","ـت"],words:["تُفَّاحَة","مَتْجَر","بَيْت"],emoji:["🍎","🏪","🏠"],sound:"تَ"},
    {letter:"ث",name:"الثاء",forms:["ثـ","ـثـ","ـث"],words:["ثَعْلَب","مِثَال","حَدِيث"],emoji:["🦊","📝","💬"],sound:"ثَ"},
    {letter:"ج",name:"الجيم",forms:["جـ","ـجـ","ـج"],words:["جَمَل","شَجَرَة","تَاج"],emoji:["🐪","🌳","👑"],sound:"جَ"},
    {letter:"ح",name:"الحاء",forms:["حـ","ـحـ","ـح"],words:["حِصَان","بَحْر","مِفْتَاح"],emoji:["🐎","🌊","🔑"],sound:"حَ"},
    {letter:"خ",name:"الخاء",forms:["خـ","ـخـ","ـخ"],words:["خَرُوف","نَخْلَة","بَطِيخ"],emoji:["🐑","🌴","🍉"],sound:"خَ"},
    {letter:"د",name:"الدال",forms:["د","ـد","ـد"],words:["دُبّ","مَدْرَسَة","وَرْد"],emoji:["🐻","🏫","🌹"],sound:"دَ"},
    {letter:"ذ",name:"الذال",forms:["ذ","ـذ","ـذ"],words:["ذِئْب","أُذُن","لَذِيذ"],emoji:["🐺","👂","😋"],sound:"ذَ"},
    {letter:"ر",name:"الراء",forms:["ر","ـر","ـر"],words:["رِيشَة","قِرْد","قَمَر"],emoji:["🪶","🐒","🌙"],sound:"رَ"},
    {letter:"ز",name:"الزاي",forms:["ز","ـز","ـز"],words:["زَرَافَة","وَزَّة","خُبْز"],emoji:["🦒","🪿","🍞"],sound:"زَ"},
    {letter:"س",name:"السين",forms:["سـ","ـسـ","ـس"],words:["سَمَكَة","مَسْجِد","قَوْس"],emoji:["🐟","🕌","🏹"],sound:"سَ"},
    {letter:"ش",name:"الشين",forms:["شـ","ـشـ","ـش"],words:["شَمْس","فَرَاشَة","عُشّ"],emoji:["☀️","🦋","🪺"],sound:"شَ"},
    {letter:"ص",name:"الصاد",forms:["صـ","ـصـ","ـص"],words:["صَقْر","عَصِير","قَفَص"],emoji:["🦅","🧃","<svg viewBox='0 0 64 64' aria-hidden='true'><circle cx='32' cy='10' r='3.5' fill='none' stroke='#8a8f96' stroke-width='3'/><path d='M14 54 V30 q0 -16 18 -16 q18 0 18 16 V54 Z' fill='#fdf6e3' stroke='#8a8f96' stroke-width='3'/><path d='M22 20 V54 M32 15 V54 M42 20 V54' stroke='#8a8f96' stroke-width='2.5'/><path d='M14 40 h36 M14 28 q18 -6 36 0' stroke='#8a8f96' stroke-width='2.5' fill='none'/><rect x='10' y='54' width='44' height='5' rx='2.5' fill='#c89b4e' stroke='#8f6a1e' stroke-width='2'/></svg>"],sound:"صَ"},
    {letter:"ض",name:"الضاد",forms:["ضـ","ـضـ","ـض"],words:["ضِفْدَع","مِضْرَب","بَيْض"],emoji:["🐸","🏏","🥚"],sound:"ضَ"},
    {letter:"ط",name:"الطاء",forms:["طـ","ـطـ","ـط"],words:["طَائِر","مِطْبَخ","خَيْط"],emoji:["🐦","🍳","🧵"],sound:"طَ"},
    {letter:"ظ",name:"الظاء",forms:["ظـ","ـظـ","ـظ"],words:["ظَرْف","نَظِيف","حَظّ"],emoji:["✉️","🧼","🍀"],sound:"ظَ"},
    {letter:"ع",name:"العين",forms:["عـ","ـعـ","ـع"],words:["عُصْفُور","لُعْبَة","شَارِع"],emoji:["🐦","🧸","🛣️"],sound:"عَ"},
    {letter:"غ",name:"الغين",forms:["غـ","ـغـ","ـغ"],words:["غَزَال","مَغَارَة","صَمْغ"],emoji:["🦌","<svg viewBox='0 0 64 64' aria-hidden='true'><path d='M6 56 L24 14 L32 26 L40 10 L58 56 Z' fill='#a97e3f' stroke='#7c4a21' stroke-width='3' stroke-linejoin='round'/><path d='M24 56 v-10 a8 8 0 0 1 16 0 v10 Z' fill='#2b2f36'/><circle cx='18' cy='48' r='2' fill='#7c4a21'/><circle cx='47' cy='44' r='2' fill='#7c4a21'/></svg>","🧴"],sound:"غَ"},
    {letter:"ف",name:"الفاء",forms:["فـ","ـفـ","ـف"],words:["فِيل","سَفِينَة","هَاتِف"],emoji:["🐘","🚢","📱"],sound:"فَ"},
    {letter:"ق",name:"القاف",forms:["قـ","ـقـ","ـق"],words:["قِطَّة","بَقَرَة","سُوق"],emoji:["🐱","🐄","🛒"],sound:"قَ"},
    {letter:"ك",name:"الكاف",forms:["كـ","ـكـ","ـك"],words:["كِتَاب","مَكْتَب","مَلِك"],emoji:["📘","<svg viewBox='0 0 64 64' aria-hidden='true'><rect x='8' y='20' width='48' height='7' rx='3' fill='#c89b4e' stroke='#8f6a1e' stroke-width='2.5'/><rect x='12' y='27' width='8' height='27' fill='#b5793b' stroke='#7c4a21' stroke-width='2.5'/><rect x='44' y='27' width='8' height='27' fill='#b5793b' stroke='#7c4a21' stroke-width='2.5'/><rect x='24' y='27' width='16' height='10' rx='2' fill='#e8b06a' stroke='#8f6a1e' stroke-width='2'/><circle cx='32' cy='32' r='2' fill='#8f6a1e'/><rect x='26' y='12' width='12' height='8' rx='2' fill='#69b7ff' stroke='#2169a8' stroke-width='2'/></svg>","👑"],sound:"كَ"},
    {letter:"ل",name:"اللام",forms:["لـ","ـلـ","ـل"],words:["لَبَن","قَلَم","عَسَل"],emoji:["🥛","✏️","🍯"],sound:"لَ"},
    {letter:"م",name:"الميم",forms:["مـ","ـمـ","ـم"],words:["مَوْز","سَمَك","عَلَم"],emoji:["🍌","🐟","🚩"],sound:"مَ"},
    {letter:"ن",name:"النون",forms:["نـ","ـنـ","ـن"],words:["نَمِر","عِنَب","لَوْن"],emoji:["🐅","🍇","🎨"],sound:"نَ"},
    {letter:"هـ",name:"الهاء",forms:["هـ","ـهـ","ـه"],words:["هَدِيَّة","مُهَنْدِس","وَجْه"],emoji:["🎁","👷","🙂"],sound:"هَ"},
    {letter:"و",name:"الواو",forms:["و","ـو","ـو"],words:["وَرْدَة","حَوْت","دَلْو"],emoji:["🌹","🐳","🪣"],sound:"وَ"},
    {letter:"ي",name:"الياء",forms:["يـ","ـيـ","ـي"],words:["يَد","سَيَّارَة","كُرْسِيّ"],emoji:["✋","🚗","🪑"],sound:"يَ"}
  ];
  const HINTS = {
    "أ":"بنفتح بُقنا على الآخر وبنقول آ بصوت واضح من حلقنا.",
    "ب":"بنقفل شفايفنا على بعض وبنفتحها بسرعة واحنا بنقول بَ.",
    "ت":"طرف لساننا بيلمس سناننا اللي فوق من ورا وبنقول تَ.",
    "ث":"بنطلّع طرف لساننا بره شوية صغيرة بين سناننا وبننفخ هوا خفيف.",
    "ج":"الصوت بيطلع من نص اللسان وبيبقى صوت قوي وجميل: جَ.",
    "ح":"صوت دافي بيطلع من نص حلقنا، زي ما بننفخ على إيدينا عشان ندفيها.",
    "خ":"صوت بيطلع من آخر الحلق وبنحس بيه بيهز حلقنا، زي الشخير الخفيف.",
    "د":"لساننا بيلمس سناننا اللي فوق وبنقول دَ بصوت قوي.",
    "ذ":"بنطلّع طرف لساننا بره شوية زي الثاء بالظبط وبنقول ذَ.",
    "ر":"لساننا بيهتز وبيتكرر بسرعة: رررر، زي صوت العربية وهي ماشية.",
    "ز":"صوت زنّان بيهز سناننا، زي صوت النحلة وهي طايرة: زززز.",
    "س":"هوا خفيف بيعدي بين سناننا المقفولين ويعمل صفارة صغيرة: سسس.",
    "ش":"بنقول شششش بهدوء، زي ما بنسكّت حد عشان يسمع.",
    "ص":"صوت تقيل ومفخّم أتقل من السين، بنحس بيه بيملأ بُقنا.",
    "ض":"صوت تقيل مميز، بيطلع لما نضغط جنب لساننا على ضروسنا. الحرف ده مشهور إنه حرف اللغة العربية نفسه!",
    "ط":"أتقل وأقوى من التاء، صوت مفخّم بنحس بيه في بُقنا كله.",
    "ظ":"أتقل من الذال، بنطلّع طرف لساننا بره شوية والصوت بيطلع تقيل.",
    "ع":"صوت بيطلع من نص الحلق ومحتاج تدريب شوية، جرب تقول عَ ببطء.",
    "غ":"صوت بيطلع من آخر الحلق، زي صوت الغرغرة بالماء الخفيفة.",
    "ف":"شفايفنا اللي تحت بتلمس سناننا اللي فوق وبننفخ هوا خفيف: فَ.",
    "ق":"صوت تقيل بيطلع من آخر الحلق خالص ورا خالص، أتقل من الكاف.",
    "ك":"الصوت بيطلع من آخر اللسان مع نفخة هوا: كَ.",
    "ل":"طرف لساننا بيلمس سقف البُق من قدام وبنقول لَ.",
    "م":"بنقفل شفايفنا خالص والصوت بيطلع من المناخير: مممم، زي ما بنقول على حاجة لذيذة.",
    "ن":"لساننا بيلمس سقف البُق والصوت بيطلع من المناخير خفيف: نَ.",
    "ه":"هوا هادي بيطلع من صدرنا على مهله: هَ.",
    "هـ":"هوا هادي بيطلع من صدرنا على مهله: هَ.",
    "و":"بنقوّر شفايفنا ونضمها على بعض وبنقول وَ.",
    "ي":"بنبتسم ابتسامة صغيرة وبنقول يَ بصوت ناعم."
  };
  const explainFor = l => {
    const hint = HINTS[l.letter] || "اسمع صوته كويس وقوله ورايا بصوت عالي.";
    const spoken = "ده حرف " + l.name + "، وصوته " + l.sound + ". " + hint +
      " شكله بيتغير حسب مكانه في الكلمة: في أول الكلمة بيبقى " + l.forms[0] + "، وفي نص الكلمة " + l.forms[1] + "، وفي آخر الكلمة " + l.forms[2] + "." +
      " بنشوفه في كلمات بنعرفها زي " + l.words[0] + " و" + l.words[1] + " و" + l.words[2] + "." +
      " يلا نقول صوته مع بعض بصوت عالي: " + l.sound + "، " + l.sound + "، " + l.sound + "!";
    const shown = "ده حرف <b>" + l.name + "</b>، وصوته <b>" + l.sound + "</b>. " + hint +
      "<br>شكله بيتغيّر حسب مكانه في الكلمة: في الأول <b>" + l.forms[0] + "</b>، وفي النص <b>" + l.forms[1] + "</b>، وفي الآخر <b>" + l.forms[2] + "</b>." +
      "<br>بنشوفه في كلمات بنعرفها: " + l.words.map((w, i) => l.emoji[i] + " " + w).join("، ") + "." +
      "<br>يلا نقول صوته مع بعض بصوت عالي: <b>" + l.sound + "، " + l.sound + "، " + l.sound + "</b>!";
    const short = "ده حرف " + l.name + "، وصوته " + l.sound + ". " + hint;
    return { spoken, shown, short };
  };
  const marks = [
    {name:"الفتحة",mark:"َ",sample:"بَ",hint:"نفتح الفم قليلاً",emoji:"<svg viewBox='0 0 64 64' aria-hidden='true'><path d='M22 16 L42 9' stroke='#e14b6d' stroke-width='5' stroke-linecap='round'/><ellipse cx='32' cy='44' rx='14' ry='10' fill='#ff7b9b' stroke='#a83258' stroke-width='3'/><ellipse cx='32' cy='44' rx='8' ry='5' fill='#7c1f2e'/></svg>"},
    {name:"الضمة",mark:"ُ",sample:"بُ",hint:"نضم الشفتين",emoji:"<svg viewBox='0 0 64 64' aria-hidden='true'><path d='M28 14 q2 -7 9 -5 q5 2 2 7 q-3 4 -7 1 q-2 -2 0 -4' stroke='#e14b6d' stroke-width='4' fill='none' stroke-linecap='round'/><circle cx='32' cy='44' r='11' fill='#ff7b9b' stroke='#a83258' stroke-width='3'/><circle cx='32' cy='44' r='5' fill='#7c1f2e'/></svg>"},
    {name:"الكسرة",mark:"ِ",sample:"بِ",hint:"نكسر الصوت",emoji:"<svg viewBox='0 0 64 64' aria-hidden='true'><ellipse cx='32' cy='24' rx='14' ry='6' fill='#ff7b9b' stroke='#a83258' stroke-width='3'/><path d='M24 24 q8 3 16 0' stroke='#7c1f2e' stroke-width='2.5' fill='none' stroke-linecap='round'/><path d='M22 52 L42 59' stroke='#e14b6d' stroke-width='5' stroke-linecap='round'/></svg>"},
    {name:"السكون",mark:"ْ",sample:"بْ",hint:"نسكن الحرف بلا حركة",emoji:"🤫"}
  ];
  const $ = id => document.getElementById(id);
  const learningList = $("learningList") || $("gameList");
  let letterIndex=0, step=0, markIndex=0, quiz=[], quizIndex=0, score=0, moveBreakShown=false;
  // Round 3.2.6 item 2: the lesson opens with three big tabs — 📖 الدرس /
  // 🧕 الشرح / 🏆 الاختبار — sharing the .lesson-tabs styles. activeTab is
  // the open tab; explainSpokenFor is the letter whose explanation already
  // auto-played once on this visit (a fresh letter visit resets it).
  let activeTab="lesson", explainSpokenFor=-1;
  // Round 3.2.2 P0-4: recorded clips ONLY — no device speechSynthesis.
  const say = text => {
    if(window.MatthewVoice&&typeof window.MatthewVoice.speak==="function"){
      window.MatthewVoice.speak(text,"ar-EG");
      return;
    }
    const status=document.getElementById("lessonStatus");
    if(status)status.textContent="🎧 اسمع من الميس — المقطع ده لسه بيتسجّل";
  };
  // Round 3.2.3 item 9: the quiz offer is SPOKEN, not text-only — a
  // non-reader cannot discover a button he cannot read. The offer follows
  // the lesson explanation in the SAME sequence, so it can never cut the
  // lesson off. NEW CLIP for the audio worker: les_quiz_offer = this text
  // (Aria, ar-EG). The button and makeQuiz() are unchanged.
  const QUIZ_OFFER="برافو يا بطل! خلصت الدرس! يلا نختبر نفسك! دوس على الكاس!";
  const saySeq = list => {
    if(window.MatthewVoice&&typeof window.MatthewVoice.speakSequence==="function"){window.MatthewVoice.speakSequence(list,"ar-EG");return;}
    say(list[0]);
  };
  // Round 3.2.3 item 13: a lesson/quiz is one sub-screen level above the
  // letter picker — the system back returns to the picker, not out of
  // the app. subPushed guards the push (lesson→quiz stays on the same
  // level; prev/next letter too).
  let subPushed = false;
  const toPicker = () => { quiz = []; quizIndex = 0; score = 0; step = -1; render(); };
  const pushSub = () => {
    if (subPushed) return;
    subPushed = true;
    // Guarded for non-browser contexts (tests run makeQuiz in a bare vm
    // sandbox with no window): without it the quiz test throws.
    if (typeof window !== "undefined") {
      window.__matthewBack = () => { subPushed = false; toPicker(); };
      window.MatthewNav?.pushSubscreen();
    }
  };
  const popSub = () => {
    if (!subPushed) return;
    subPushed = false;
    if (typeof window !== "undefined") window.MatthewNav?.popSubscreen();
  };
  const card=document.createElement("button");
  card.className="game-card pink"; card.type="button"; card.dataset.lessonEntry="true";
  card.innerHTML='<span class="game-icon">📚</span><strong>مدرسة الحروف</strong><small>نتعلم الحرف والحركات قبل الاختبار</small><span class="play">ابدأ التعلم ←</span>';
  learningList.append(card);
  const panel=document.createElement("section");
  panel.id="letterSchool"; panel.className="quiz-panel hidden";
  panel.innerHTML=`
    <div class="quiz-top"><button id="lessonBack" class="back" type="button">→ رجوع</button><strong>📚 مدرسة الحروف</strong><span id="lessonStep">١ / ٤</span></div>
    <div class="progress"><div id="lessonProgress"></div></div>
    <div id="lessonBody" class="lesson-body"></div>
    <p id="lessonStatus" class="feedback" aria-live="polite"></p>
    <div class="lesson-actions"><button id="lessonListen" class="voice-button" type="button">🔊 اسمع الدرس</button><button id="lessonNext" class="primary" type="button">التالي ←</button></div>
  `;
  document.querySelector("main").insertBefore(panel,document.querySelector("footer"));
  function open(){ $("gameList").classList.add("hidden");learningList.classList.add("hidden");$("quiz").classList.add("hidden");$("result").classList.add("hidden");panel.classList.remove("hidden");letterIndex=0;step=-1;quiz=[];quizIndex=0;score=0;render();}
  function back(){subPushed=false;window.__qToken=(window.__qToken||0)+1;panel.classList.add("hidden");$("gameList").classList.remove("hidden");learningList.classList.remove("hidden");window.MatthewVoice?.stop();}
  // Round 3.2.1 notes 9–11: no step wizard any more — one scrollable
  // lesson screen holds everything about the letter (explanation, forms,
  // words, marks, quiz button). step: -1 = picker, 0 = lesson, 3 = quiz.
  function render(){
    $("lessonStatus").textContent="";
    if(step===-1){renderPicker();return}
    renderLesson();
  }
  // Round 3.2.1 note 7: the school opens with a picker of all 28 letters
  // (big glyph + name, same grid style as the other sections). Tap one to
  // jump straight to its lesson; back from a lesson returns here, and
  // back from here returns home.
  function renderPicker(){
    $("lessonStep").textContent="اختار حرف";
    $("lessonProgress").style.width="0%";
    panel.querySelector(".lesson-actions").style.display="none";
    $("lessonBody").innerHTML=`<div class="lesson-title">اختار حرف يا ملك ماثيو 👑</div><p>اضغط على أي حرف عشان تتعلمه</p><div class="basic-grid letter-picker">${lessons.map((l,i)=>`<button type="button" class="basic-tile" data-letter="${i}"><span>${l.emoji[0]}</span><b>${l.letter}</b><small>${l.name}</small></button>`).join("")}</div><button id="letterQuizBtn" class="primary" type="button">🏆 اختبر نفسك</button>`;
    panel.querySelectorAll("[data-letter]").forEach(b=>b.onclick=()=>{letterIndex=Number(b.dataset.letter);step=0;render()});
    // Round 3.2.6 item 3: the picker quiz is a scoped quiz for ONE letter
    // (picked at random) — never the old 10-from-all-28 mixed bank.
    $("letterQuizBtn").onclick=()=>{letterIndex=Math.floor(Math.random()*lessons.length);step=0;render();activeTab="quiz";makeQuiz();};
    const tkP=window.__qToken=(window.__qToken||0)+1;setTimeout(()=>{if(window.__qToken!==tkP)return;say("اختار حرف يا ملك ماثيو")},120);
  }
  // The unified lesson (notes 9–11): everything about the letter on ONE
  // scrollable screen — big letter, name, sound, full explanation, forms
  // with words, harakat, word examples, quiz button. No steps to tap through.
  // Round 3.2.6 item 2: the lesson opens with three big tabs — 📖 الدرس
  // (practice: letter, forms, words, harakat), 🧕 الشرح (the full
  // explanation, spoken once when the tab opens), 🏆 الاختبار (the quiz
  // for THIS letter only). The tabs share the .lesson-tabs styles; every
  // lessonBody paint rebuilds tabs + all three panels, so the lesson, the
  // explanation and the quiz are always one tap apart.
  const lessonTabsHTML=active=>`<div class="lesson-tabs" role="tablist"><button type="button" class="lesson-tab${active==="lesson"?" active":""}" data-lesson-tab="lesson" role="tab">📖 الدرس</button><button type="button" class="lesson-tab${active==="explain"?" active":""}" data-lesson-tab="explain" role="tab">🧕 الشرح</button><button type="button" class="lesson-tab${active==="quiz"?" active":""}" data-lesson-tab="quiz" role="tab">🏆 الاختبار</button></div>`;
  function lessonPanelHTML(l){
    return `<div class="lesson-title">أهلاً يا ماثيو الملك 👑</div>`+
      `<div class="big-letter sticky-panel">${l.letter}</div><h2>${l.name}</h2>`+
      `<p class="lesson-example">صوت الحرف: <b>${l.sound}</b></p>`+
      `<div class="lesson-pager"><button id="prevLetter" class="secondary" ${letterIndex===0?"disabled":""}><span>الحرف السابق</span><span class="pager-arrow" aria-hidden="true">→</span></button><button id="nextLetter" class="secondary"><span>${letterIndex===lessons.length-1?"ابدأ من الأول":"الحرف التالي"}</span><span class="pager-arrow" aria-hidden="true">←</span></button></div>`+
      `<h3 class="lesson-section">أشكال الحرف</h3><p>شكل الحرف بيتغير حسب مكانه في الكلمة</p>`+
      `<div class="form-grid"><div><b>أول الكلمة</b><strong>${l.forms[0]}</strong></div><div><b>وسط الكلمة</b><strong>${l.forms[1]}</strong></div><div><b>آخر الكلمة</b><strong>${l.forms[2]}</strong></div></div>`+
      `<button id="formsListen" class="voice-button" type="button">🔊 اسمع أشكال الحرف</button>`+
      `<div class="word-examples">${l.words.map((w,i)=>`<div role="button" tabindex="0"><span>${l.emoji[i]}</span><b>${w}</b></div>`).join("")}</div>`+
      `${["أ","د","ذ","ر","ز","و"].includes(l.letter)?`<p class="voice-note">ملحوظة: حرف ${l.name} لا يتصل بما بعده، لذلك شكله يختلف عن باقي الحروف.</p>`:""}`+
      `<h3 class="lesson-section">الحركات والسكون على حرف ${l.letter}</h3>`+
      `<div class="mark-tabs">${marks.map((x,i)=>`<button class="${i===markIndex?"active":""}" data-mark="${i}">${x.name}</button>`).join("")}</div>`+
      `<div class="mark-card" id="markCard"></div>`+
      `<p>اختار كل حركة واسمعها بصوت واضح</p>`;
  }
  function explainPanelHTML(l,ex){
    return `<div class="explain-box"><strong>🧕 الميس بتشرح لك من الصفر</strong><p>${ex.shown}</p></div>`+
      `<button id="explainListen" class="voice-button" type="button">🔊 اسمع الشرح</button>`+
      `<p>اسمع الشرح كويس، وبعدين دوس على 🏆 الاختبار عشان تختبري نفسك في حرف ${l.name} بس.</p>`;
  }
  // Every paint rebuilds tabs + all three panels (the lesson, the
  // explanation and the quiz stay one tap apart); quizHTML fills the quiz
  // panel when a quiz is showing, otherwise a start button sits there.
  function paintLessonBody(quizHTML){
    const l=lessons[letterIndex];
    const ex=explainFor(l);
    const quizPanel=quizHTML||`<p>اختبر نفسك في حرف ${l.name} بس — من غير أي حرف تاني.</p><button id="lessonQuizStart" class="primary" type="button">🏆 اختبر نفسك ⭐</button>`;
    $("lessonBody").innerHTML=lessonTabsHTML(activeTab)+
      `<div class="tab-panel${activeTab==="lesson"?" active":""}" data-tab-panel="lesson">${lessonPanelHTML(l)}</div>`+
      `<div class="tab-panel${activeTab==="explain"?" active":""}" data-tab-panel="explain">${explainPanelHTML(l,ex)}</div>`+
      `<div class="tab-panel${activeTab==="quiz"?" active":""}" data-tab-panel="quiz"><div id="lessonQuizPanel">${quizPanel}</div></div>`;
    bindTabs();bindLessonPanel();bindExplainPanel();
    const qs=$("lessonQuizStart");if(qs)qs.onclick=()=>{activeTab="quiz";makeQuiz()};
  }
  function bindTabs(){
    panel.querySelectorAll("[data-lesson-tab]").forEach(b=>b.onclick=()=>switchTab(b.dataset.lessonTab));
  }
  function bindLessonPanel(){
    const l=lessons[letterIndex];
    updateMark();
    $("prevLetter").onclick=()=>{letterIndex=(letterIndex+lessons.length-1)%lessons.length;render()};
    $("nextLetter").onclick=()=>{letterIndex=(letterIndex+1)%lessons.length;render()};
    $("formsListen").onclick=()=>say("شكل حرف "+l.name+" في أول الكلمة "+l.forms[0]+" زي كلمة "+l.words[0]+"، وفي نص الكلمة "+l.forms[1]+" زي كلمة "+l.words[1]+"، وفي آخر الكلمة "+l.forms[2]+" زي كلمة "+l.words[2]+".");
    panel.querySelectorAll(".word-examples>div").forEach((el,i)=>el.addEventListener("click",()=>say(l.words[i],"ar-EG")));
    panel.querySelectorAll("[data-mark]").forEach(b=>b.onclick=()=>{markIndex=Number(b.dataset.mark);updateMark();const m=marks[markIndex];say(m.name+"، "+markSample()+". "+m.hint+": "+markSample())});
  }
  function bindExplainPanel(){
    const ex=explainFor(lessons[letterIndex]);
    $("explainListen").onclick=()=>say(ex.spoken);
  }
  function syncFooterButtons(){
    const l=lessons[letterIndex];
    $("lessonListen").textContent=activeTab==="explain"?"🔊 اسمع الشرح":activeTab==="quiz"?"🔊 اسمع السؤال":"🔊 اسمع الدرس";
    if(activeTab!=="quiz")$("lessonNext").textContent="🏆 اختبر نفسك ⭐";
    $("lessonListen").onclick=()=>{
      if(panel.dataset.finished==="1"){say(explainFor(l).spoken);return}
      if(activeTab==="explain"){say(explainFor(l).spoken);return}
      if(activeTab==="quiz"&&quiz.length){const q=quiz[quizIndex];if(q){const spoken=q.q+" اختار الإجابة الصحيحة";if(window.MatthewVoice?.speakSequence)window.MatthewVoice.speakSequence([spoken,...q.a],"ar-EG");else say(spoken)}return}
      say(l.name+"، "+l.sound);
    };
  }
  // The explanation auto-plays ONCE per letter visit, when the 🧕 tab
  // opens — the quiz offer follows it in the same sequence, so it can
  // never cut the lesson off. Switching tabs always stops current audio.
  function maybeSpeakExplain(){
    if(explainSpokenFor===letterIndex)return;
    explainSpokenFor=letterIndex;
    const ex=explainFor(lessons[letterIndex]);
    const tkL=window.__qToken=(window.__qToken||0)+1;setTimeout(()=>{if(window.__qToken!==tkL)return;saySeq([ex.spoken,QUIZ_OFFER])},120);
  }
  function switchTab(name){
    if(name!=="lesson"&&name!=="explain"&&name!=="quiz")return;
    try{window.MatthewVoice?.stop()}catch(_){}
    activeTab=name;
    panel.querySelectorAll("[data-lesson-tab]").forEach(b=>b.classList.toggle("active",b.dataset.lessonTab===name));
    panel.querySelectorAll("[data-tab-panel]").forEach(p=>p.classList.toggle("active",p.dataset.tabPanel===name));
    syncFooterButtons();
    if(name==="explain")maybeSpeakExplain();
    if(name==="quiz"){if(!quiz.length||panel.dataset.finished==="1")makeQuiz();else showQuiz()}
  }
  function renderLesson(){
    pushSub();
    activeTab="lesson";explainSpokenFor=-1;
    $("lessonStep").textContent=lessons[letterIndex].name;
    $("lessonProgress").style.width="100%";
    panel.querySelector(".lesson-actions").style.display="";
    paintLessonBody();
    syncFooterButtons();
  }
  // This letter's sample for haraka mi (0 فتحة، 1 ضمة، 2 كسرة، 3 سكون).
  // Round 3.2.1 note 14: only these four letters' sukun syllables have
  // recorded Fusha clips (lsq_syl_sukun_0..3) — "بْ", "تْ", "مْ", "سْ".
  // The map returns the same strings the computed form gives
  // (letter + "ْ"); it documents the recorded coverage.
  const SUKUN_CLIPS={"ب":"بْ","ت":"تْ","م":"مْ","س":"سْ"};
  function sampleFor(mi){
    const l=lessons[letterIndex];
    if(mi===3&&SUKUN_CLIPS[l.letter])return SUKUN_CLIPS[l.letter];
    return l.letter==="أ"?["أَ","أُ","إِ","أْ"][mi]:l.letter+marks[mi].mark;
  }
  function markSample(){
    return sampleFor(markIndex);
  }
  function updateMark(){
    const m=marks[markIndex];
    const sample=markSample();
    const soundHint=m.hint;
    const card=$("markCard");
    if(card)card.innerHTML=`<span>${m.emoji}</span><div class="mark-symbol">${sample}</div><h2>${m.name}</h2><p>${soundHint}: ${sample}</p><strong>مثال: ${sample}</strong>`;
    panel.querySelectorAll("[data-mark]").forEach(b=>b.classList.toggle("active",Number(b.dataset.mark)===markIndex));
  }
  function makeQuiz(){
    pushSub();
    // Round 3.2.5 FAIL 2: finishQuiz() sets panel.dataset.finished="1",
    // and retry calls makeQuiz() without resetting it — the next tap then
    // fires the finished branch and bounces to the picker instead of q2.
    // A fresh quiz always starts unfinished.
    panel.dataset.finished="0";
    step=3;
    // Round 3.2.6 item 3: the quiz is scoped to the CURRENT letter only —
    // its name, its first form, its four harakat (with its own samples),
    // and finding the syllable that carries each haraka. 10 questions, all
    // about this one letter; every question text already has a recorded
    // clip (lsq_q_letter / lsq_q_form_* / lsq_q_haraka / lsq_q_syl_*), so
    // NO new clips are needed. Distractors come from the other letters /
    // other harakat, never from a fake list.
    // Round 3.2.1 note 4: the spoken question must never contain its own
    // correct answer. The glyph/sample is shown VISUALLY only (q.show) and
    // stays out of the spoken question (q.q + " اختار الإجابة الصحيحة").
    // makeQuiz() is also run standalone by the round 3.2.2 / 3.2.4
    // regression tests, which extract it into a vm sandbox that has
    // lessons/marks/quiz/showQuiz/panel/pushSub but NO letterIndex and
    // NO sampleFor — so the current letter resolves safely here (a
    // missing letterIndex means the first letter, أ) and the sample is
    // computed by a local helper, never by a free function.
    const l=lessons[typeof letterIndex!=="undefined"?letterIndex:0];
    const sampleForMi=mi=>l.letter==="أ"?["أَ","أُ","إِ","أْ"][mi]:l.letter+marks[mi].mark;
    const qs=[];
    const allNames=lessons.map(x=>x.name);
    const allForms=[...new Set(lessons.flatMap(x=>x.forms))];
    const nameDist=allNames.filter(n=>n!==l.name).sort(()=>Math.random()-.5).slice(0,3);
    qs.push({q:"ما اسم هذا الحرف؟",show:l.letter,a:[l.name,...nameDist],c:0});
    const formDist=allForms.filter(f=>f!==l.forms[0]).sort(()=>Math.random()-.5).slice(0,3);
    qs.push({q:"أي شكل لحرف "+l.name+" في أول الكلمة؟",a:[l.forms[0],...formDist],c:0});
    // Round 3.2.4 blocker 2: the old fixed distractors contained a fake
    // "other haraka" choice. Every question now draws its 3 distractors
    // from real haraka names only — the other three marks + الشدة + التنوين.
    // The shown sample is THIS letter's own: m.sample is refreshed here,
    // because the marks table carries the ب sample (بَ/بُ/بِ/بْ).
    marks.forEach((m,mi)=>{m.sample=sampleForMi(mi);const pool=[...marks.map(x=>x.name).filter(n=>n!==m.name),"الشدة","التنوين"].sort(()=>Math.random()-.5).slice(0,3);qs.push({q:"ما اسم الحركة في المقطع ده؟",show:m.sample,a:[m.name,...pool],c:0});});
    [["أي مقطع عليه فتحة؟",0],["أي مقطع عليه ضمة؟",1],["أي مقطع عليه كسرة؟",2],["أي مقطع عليه سكون؟",3]].forEach(([qq,mi])=>{qs.push({q:qq,a:[0,1,2,3].map(sampleForMi),c:mi});});
    quiz=qs.sort(()=>Math.random()-.5);quizIndex=0;score=0;moveBreakShown=false;showQuiz();
  }
  // Round 3.2.2 P0-6 (audit): the old glyph-keyed picture map NEVER matched
  // anything — quiz answers are letter NAMES ("الألف") and FORMS ("بـ"),
  // not bare glyphs — so every answer picture fell back to 🔤. Re-key by
  // answer text from the lessons data (each letter's own first-word picture);
  // syllable answers fall back to their letter's picture, haraka names to 🔤.
  const quizPicMap = {};
  lessons.forEach(l => { quizPicMap[l.name] = l.emoji[0]; l.forms.forEach(f => { if (!(f in quizPicMap)) quizPicMap[f] = l.emoji[0]; }); });
  const quizPic = a => {
    if (quizPicMap[a]) return quizPicMap[a];
    // Round 3.2.3 F3: syllable answers (one letter + one haraka/sukun)
    // all showed the same letter picture (e.g. all 🍌) — a neutral tile
    // instead, so the four options stop looking like duplicates.
    if (/^[ء-ي][ً-ٟ]?$/.test(String(a || ""))) return "🔤";
    const base = String(a || "").replace(/[ً-ٰٟـ]/g, "").charAt(0);
    const l = lessons.find(x => x.letter === base);
    return l ? l.emoji[0] : "🔤";
  };
  function showQuiz(){
    activeTab="quiz";
    const q=quiz[quizIndex];
    // Round 3.2.2 P1-5: binding movement break before question 6 (mid-quiz),
    // once per quiz — same 25s timer as the main quiz. The break lives in
    // the quiz panel so the tabs stay on screen.
    const MB=(typeof window!=="undefined")?window.MatthewMoveBreak:null;
    if(quizIndex===5&&!moveBreakShown&&MB){moveBreakShown=true;$("lessonStep").textContent="وقت الحركة! 🏃";$("lessonProgress").style.width=(quizIndex/quiz.length*100)+"%";paintLessonBody('<div class="move-break" id="lessonMoveBreak"></div>');const host=panel.querySelector("#lessonMoveBreak");const ln=$("lessonNext"),ll=$("lessonListen");if(ln)ln.disabled=true;if(ll)ll.disabled=true;MB.show(host,()=>{if(ln)ln.disabled=false;if(ll)ll.disabled=false;showQuiz()});return}
    if(!q._shuffled){const order=q.a.map((a,i)=>({a,ok:i===q.c})).sort(()=>Math.random()-.5);q.a=order.map(x=>x.a);q.c=order.findIndex(x=>x.ok);q._shuffled=true}$("lessonStep").textContent=(quizIndex+1).toLocaleString("ar-EG")+" / "+quiz.length.toLocaleString("ar-EG");
    $("lessonProgress").style.width=(quizIndex/quiz.length*100)+"%";
    const spoken=q.q+" اختار الإجابة الصحيحة";
    paintLessonBody(`<div class="lesson-title">اختبار الملك ماثيو 👑</div>${q.show?`<div class="big-letter sticky-panel">${q.show}</div>`:""}<h2>${q.q}</h2><div class="lesson-answers">${q.a.map((a,i)=>`<button data-answer="${i}"><span class="answer-picture" aria-hidden="true">${quizPic(a)}</span><span class="answer-label">${a}</span></button>`).join("")}</div>`);
    panel.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{if(panel.dataset.done==="1")return;panel.dataset.done="1";const ok=Number(b.dataset.answer)===q.c;try{window.MatthewMastery?.record("arabic-letters",ok);window.MatthewMastery?.record("arabic-letter:"+lessons[letterIndex].letter,ok)}catch(_){}if(ok)score++;panel.querySelectorAll("[data-answer]").forEach(x=>{x.disabled=true;if(Number(x.dataset.answer)===q.c)x.classList.add("correct")});if(!ok)b.classList.add("wrong");$("lessonStatus").textContent=ok?"برافو يا بطل! إجابة صحيحة ⭐":"محاولة جميلة! ركز في الحركة وجرب السؤال التالي";$("lessonNext").innerHTML=quizIndex===quiz.length-1?"النتيجة 🏆":"السؤال التالي<span class=\"pager-arrow\">←</span>"});
    panel.dataset.done="0";$("lessonNext").textContent="اختار الإجابة";
    $("lessonListen").textContent="🔊 اسمع السؤال";$("lessonListen").onclick=()=>{if(window.MatthewVoice?.speakSequence)window.MatthewVoice.speakSequence([spoken,...q.a],"ar-EG");else say(spoken)};
    // Round 3.1 auto-narration: the question, then the choices in order —
    // no tap-to-listen button, and the spoken question never names its
    // answer (the glyph/sample is shown visually only, in q.show).
    const tk=window.__qToken=(window.__qToken||0)+1;
    setTimeout(()=>{if(window.__qToken!==tk)return;if(window.MatthewVoice?.speakSequence)window.MatthewVoice.speakSequence([spoken,...q.a],"ar-EG");else say(spoken)},350);
  }
  function finishQuiz(){
    panel.dataset.finished="1";
    paintLessonBody(`<div class="lesson-title">برافو يا ملك ماثيو! 👑</div><div class="big-letter sticky-panel">🏆</div><h2>${score.toLocaleString("ar-EG")} من ${quiz.length.toLocaleString("ar-EG")}</h2><p>${score>=8?"ممتاز! أنت بطل الحروف والحركات ⭐":"شاطر! نعيد الدرس ونجرب تاني 💜"}</p><button id="retryLesson" class="primary">اختبار جديد بأسئلة مختلفة</button>`);
    $("retryLesson").onclick=()=>{step=3;makeQuiz()};
    $("lessonNext").innerHTML="العودة للدروس<span class=\"pager-arrow\">→</span>";
    syncFooterButtons();$("lessonListen").textContent="🔊 اسمع الدرس";
    $("lessonProgress").style.width="100%";
  }
  $("lessonNext").onclick=()=>{
    if(panel.dataset.finished==="1"){panel.dataset.finished="0";popSub();toPicker();return}
    if(step===0){activeTab="quiz";makeQuiz();return}
    if(quizIndex<quiz.length-1){quizIndex++;showQuiz()}else finishQuiz();
  };
  // Round 3.2.3 item 13: from a lesson/quiz the back goes through
  // history when we own an entry (popstate returns to the picker via
  // the hook); with no entry it returns directly. From the picker it
  // closes the panel.
  $("lessonBack").onclick=()=>{if(step===-1){back()}else if(!window.MatthewNav?.back()){popSub();toPicker()}};
  $("lessonListen").onclick=()=>{const l=lessons[letterIndex];say(l.name+"، "+l.sound)};
  card.onclick=open;
  panel.addEventListener("click",e=>{if(e.target.id==="retryLesson")return});
  // The picker is the entry point; the lesson is one screen; the quiz
  // starts straight from the lesson or the picker, with no intro screen.
})();