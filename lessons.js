(() => {
  const lessons = [
    {letter:"أ",name:"الألف",forms:["أ","ـأ","ـأ"],words:["أَسَد","سَأَلَ","مَلْجَأ"],emoji:["🦁","❓","🏡"],sound:"أَ"},
    {letter:"ب",name:"الباء",forms:["بـ","ـبـ","ـب"],words:["بَطَّة","جَبَل","كِتَاب"],emoji:["🦆","⛰️","📘"],sound:"بَ"},
    {letter:"ت",name:"التاء",forms:["تـ","ـتـ","ـت"],words:["تُفَّاحَة","مَتْجَر","بَيْت"],emoji:["🍎","🏪","🏠"],sound:"تَ"},
    {letter:"ث",name:"الثاء",forms:["ثـ","ـثـ","ـث"],words:["ثَعْلَب","مِثَال","حَدِيث"],emoji:["🦊","📝","💬"],sound:"ثَ"},
    {letter:"ج",name:"الجيم",forms:["جـ","ـجـ","ـج"],words:["جَمَل","شَجَرَة","تَاج"],emoji:["🐪","🌳","👑"],sound:"جَ"},
    {letter:"ح",name:"الحاء",forms:["حـ","ـحـ","ـح"],words:["حِصَان","بَحْر","مِفْتَاح"],emoji:["🐎","🌊","🔑"],sound:"حَ"},
    {letter:"خ",name:"الخاء",forms:["خـ","ـخـ","ـخ"],words:["خَرُوف","نَخْلَة","بَطِيخ"],emoji:["🐑","🌴","🍉"],sound:"خَ"},
    {letter:"د",name:"الدال",forms:["د","ـد","ـد"],words:["دُبّ","مَدْرَسَة","وَرْد"],emoji:["🐻","🏫","🌹"],sound:"دَ"},
    {letter:"ذ",name:"الذال",forms:["ذ","ـذ","ـذ"],words:["ذِئْب","أُذُن","لَذِيذ"],emoji:["🐺","👂","😋"],sound:"ذَ"},
    {letter:"ر",name:"الراء",forms:["ر","ـر","ـر"],words:["رِيشَة","فَرَاشَة","قَمَر"],emoji:["🪶","🦋","🌙"],sound:"رَ"},
    {letter:"ز",name:"الزاي",forms:["ز","ـز","ـز"],words:["زَرَافَة","مَوْز","خُبْز"],emoji:["🦒","🍌","🍞"],sound:"زَ"},
    {letter:"س",name:"السين",forms:["سـ","ـسـ","ـس"],words:["سَمَكَة","مَسْجِد","شَمْس"],emoji:["🐟","🕌","☀️"],sound:"سَ"},
    {letter:"ش",name:"الشين",forms:["شـ","ـشـ","ـش"],words:["شَمْس","فَرَاشَة","عُشّ"],emoji:["☀️","🦋","🪺"],sound:"شَ"},
    {letter:"ص",name:"الصاد",forms:["صـ","ـصـ","ـص"],words:["صَقْر","عَصِير","قَفَص"],emoji:["🦅","🧃","🪺"],sound:"صَ"},
    {letter:"ض",name:"الضاد",forms:["ضـ","ـضـ","ـض"],words:["ضِفْدَع","بَيْض","مِضْرَب"],emoji:["🐸","🥚","🏏"],sound:"ضَ"},
    {letter:"ط",name:"الطاء",forms:["طـ","ـطـ","ـط"],words:["طَائِر","بَطَّة","خَيْط"],emoji:["🐦","🦆","🧵"],sound:"طَ"},
    {letter:"ظ",name:"الظاء",forms:["ظـ","ـظـ","ـظ"],words:["ظَرْف","نَظِيف","حَظّ"],emoji:["✉️","🧼","🍀"],sound:"ظَ"},
    {letter:"ع",name:"العين",forms:["عـ","ـعـ","ـع"],words:["عُصْفُور","لُعْبَة","شَارِع"],emoji:["🐤","🧸","🛣️"],sound:"عَ"},
    {letter:"غ",name:"الغين",forms:["غـ","ـغـ","ـغ"],words:["غَزَال","مَغَارَة","صَمْغ"],emoji:["🦌","🕳️","🧴"],sound:"غَ"},
    {letter:"ف",name:"الفاء",forms:["فـ","ـفـ","ـف"],words:["فِيل","مِفْتَاح","هَاتِف"],emoji:["🐘","🔑","📱"],sound:"فَ"},
    {letter:"ق",name:"القاف",forms:["قـ","ـقـ","ـق"],words:["قِطَّة","بَقَرَة","سُوق"],emoji:["🐱","🐄","🏪"],sound:"قَ"},
    {letter:"ك",name:"الكاف",forms:["كـ","ـكـ","ـك"],words:["كِتَاب","مَكْتَب","سَمَك"],emoji:["📘","🪑","🐟"],sound:"كَ"},
    {letter:"ل",name:"اللام",forms:["لـ","ـلـ","ـل"],words:["لَبَن","قَلَم","جَمَل"],emoji:["🥛","✏️","🐪"],sound:"لَ"},
    {letter:"م",name:"الميم",forms:["مـ","ـمـ","ـم"],words:["مَوْز","سَمَك","قَلَم"],emoji:["🍌","🐟","✏️"],sound:"مَ"},
    {letter:"ن",name:"النون",forms:["نـ","ـنـ","ـن"],words:["نَمِر","عِنَب","لَبَن"],emoji:["🐅","🍇","🥛"],sound:"نَ"},
    {letter:"هـ",name:"الهاء",forms:["هـ","ـهـ","ـه"],words:["هَدِيَّة","مُهَنْدِس","وَجْه"],emoji:["🎁","👷","🙂"],sound:"هَ"},
    {letter:"و",name:"الواو",forms:["و","ـو","ـو"],words:["وَرْدَة","حَوْت","لَوْن"],emoji:["🌹","🐳","🎨"],sound:"وَ"},
    {letter:"ي",name:"الياء",forms:["يـ","ـيـ","ـي"],words:["يَد","بَيْت","كُرْسِيّ"],emoji:["✋","🏠","🪑"],sound:"يَ"}
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
    {name:"الفتحة",mark:"َ",sample:"بَ",hint:"نفتح الفم قليلاً: بَ",emoji:"☀️"},
    {name:"الضمة",mark:"ُ",sample:"بُ",hint:"نضم الشفتين: بُ",emoji:"⭕"},
    {name:"الكسرة",mark:"ِ",sample:"بِ",hint:"نبتسم ونكسر الصوت: بِ",emoji:"😊"},
    {name:"السكون",mark:"ْ",sample:"بْ",hint:"نسكن الحرف بلا حركة: أَبْ",emoji:"🤫"}
  ];
  const $ = id => document.getElementById(id);
  const learningList = $("learningList") || $("gameList");
  let letterIndex=0, step=0, markIndex=0, quiz=[], quizIndex=0, score=0;
  const say = text => {
    if(window.MatthewVoice&&typeof window.MatthewVoice.speak==="function"){
      window.MatthewVoice.speak(text,"ar-EG");
      return;
    }
    const synth=window.speechSynthesis;
    if(!synth||!window.SpeechSynthesisUtterance){
      const status=document.getElementById("lessonStatus");
      if(status)status.textContent="الصوت غير متاح. افتح التطبيق من Chrome وفعّل خدمات تحويل النص إلى كلام.";
      return;
    }
    synth.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang="ar-EG";u.rate=.78;u.volume=1;
    synth.resume();synth.speak(u);
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
  function open(){ $("gameList").classList.add("hidden");learningList.classList.add("hidden");$("quiz").classList.add("hidden");$("result").classList.add("hidden");panel.classList.remove("hidden");letterIndex=0;step=0;render();}
  function back(){panel.classList.add("hidden");$("gameList").classList.remove("hidden");learningList.classList.remove("hidden");window.MatthewVoice?.stop();}
  function render(){
    $("lessonStatus").textContent="";
    $("lessonStep").textContent=(step+1).toLocaleString("ar-EG")+" / ٤";
    $("lessonProgress").style.width=((step+1)/4*100)+"%";
    if(step===0) renderLetter();
    if(step===1) renderForms();
    if(step===2) renderMarks();
    if(step===3) renderQuizIntro();
    $("lessonNext").textContent=step===3?"ابدأ الاختبار ⭐":"التالي ←";
    const current=lessons[letterIndex];
    if(step===0)setTimeout(()=>say(explainFor(current).short),120);
    if(step===1)setTimeout(()=>say("أشكال حرف "+current.name+". "+current.words.join("، ")),120);
    if(step===2){const mark=marks[markIndex];const sample=current.letter==="أ"?["أَ","أُ","إِ","أْ"][markIndex]:current.letter+mark.mark;setTimeout(()=>say(mark.name+"، "+sample+". "+mark.hint),120)}
    if(step===3)setTimeout(()=>say("أحسنت يا ماثيو. يلا نبدأ الاختبار"),120);
  }
  function renderLetter(){
    const l=lessons[letterIndex];
    const ex=explainFor(l);
    $("lessonBody").innerHTML=`<div class="lesson-title">أهلاً يا ماثيو الملك 👑</div><p>النهارده هنتعلم حرف جديد</p><div class="big-letter">${l.letter}</div><h2>${l.name}</h2><p class="lesson-example">صوت الحرف: <b>${l.sound}</b></p><div class="explain-box"><strong>🧕 الميس بتشرح لك من الصفر</strong><p>${ex.shown}</p></div><div class="lesson-pager"><button id="prevLetter" class="secondary" ${letterIndex===0?"disabled":""}>الحرف السابق</button><button id="nextLetter" class="secondary">${letterIndex===lessons.length-1?"ابدأ من الأول":"الحرف التالي"}</button></div>`;
    $("prevLetter").onclick=()=>{letterIndex=(letterIndex+lessons.length-1)%lessons.length;render()};
    $("nextLetter").onclick=()=>{letterIndex=(letterIndex+1)%lessons.length;render()};
    $("lessonListen").onclick=()=>say(ex.spoken);
  }
  function renderForms(){
    const l=lessons[letterIndex];
    $("lessonBody").innerHTML=`<div class="lesson-title">أشكال حرف ${l.name}</div><p>شكل الحرف بيتغير حسب مكانه في الكلمة</p><div class="form-grid"><div><b>أول الكلمة</b><strong>${l.forms[0]}</strong></div><div><b>وسط الكلمة</b><strong>${l.forms[1]}</strong></div><div><b>آخر الكلمة</b><strong>${l.forms[2]}</strong></div></div><div class="word-examples">${l.words.map((w,i)=>`<div role="button" tabindex="0"><span>${l.emoji[i]}</span><b>${w}</b></div>`).join("")}</div><p class="voice-note">ملحوظة: حرف الألف لا يتصل بما بعده، لذلك شكله يختلف عن باقي الحروف.</p>`;
    panel.querySelectorAll(".word-examples>div").forEach((el,i)=>el.addEventListener("click",()=>say(l.words[i],"ar-EG")));
  }
  function renderMarks(){
    const m=marks[markIndex];
    const l=lessons[letterIndex];
    const samples=l.letter==="أ"?["أَ","أُ","إِ","أْ"]:marks.map(x=>l.letter+x.mark);
    const sample=samples[markIndex];
    const soundHint=markIndex===0?"نفتح الفم قليلاً":markIndex===1?"نضم الشفتين":markIndex===2?"نكسر الصوت":"نسكن الحرف بلا حركة";
    $("lessonBody").innerHTML=`<div class="lesson-title">الحركات الأربع على حرف ${l.letter}</div><div class="mark-tabs">${marks.map((x,i)=>`<button class="${i===markIndex?"active":""}" data-mark="${i}">${x.name}</button>`).join("")}</div><div class="mark-card"><span>${m.emoji}</span><div class="mark-symbol">${sample}</div><h2>${m.name}</h2><p>${soundHint}: ${sample}</p><strong>مثال: ${sample}</strong></div><p>اختار كل حركة واسمعها بصوت واضح</p>`;
    panel.querySelectorAll("[data-mark]").forEach(b=>b.onclick=()=>{markIndex=Number(b.dataset.mark);renderMarks()});
    $("lessonListen").onclick=()=>say(soundHint+"، "+sample);
  }
  function renderQuizIntro(){
    $("lessonBody").innerHTML='<div class="lesson-title">جاهز يا بطل؟ 🏆</div><div class="big-letter">⭐</div><h2>اختبار الحركات والحروف</h2><p>هنسألك أسئلة مختلفة عن صوت الحرف وشكله والفتحة والضمة والكسرة والسكون.</p><p>كل مرة هتلاقي أسئلة بترتيب مختلف!</p>';
    $("lessonListen").onclick=()=>say("أحسنت يا ماثيو. يلا نبدأ الاختبار");
  }
  function makeQuiz(){
    const qs=[];
    lessons.forEach(l=>{
      qs.push({q:"ما اسم هذا الحرف؟ "+l.letter,a:[l.name,"السين","الراء","الفاء"],c:0});
      qs.push({q:"أي شكل لحرف "+l.name+" في أول الكلمة؟",a:[l.forms[0],l.forms[1],l.forms[2],"د"],c:0});
    });
    marks.forEach(m=>qs.push({q:"ما اسم الحركة في "+m.sample+"؟",a:[m.name,"حركة أخرى","الشدة","التنوين"],c:0}));
    qs.push({q:"أي مقطع عليه فتحة؟",a:["بَ","بُ","بِ","بْ"],c:0},{q:"أي مقطع عليه ضمة؟",a:["تِ","تُ","تَ","تْ"],c:1},{q:"أي مقطع عليه كسرة؟",a:["مَ","مْ","مِ","مُ"],c:2},{q:"أي مقطع عليه سكون؟",a:["سَ","سُ","سْ","سِ"],c:2});
    quiz=qs.sort(()=>Math.random()-.5).slice(0,10);quizIndex=0;score=0;showQuiz();
  }
  function showQuiz(){
    const q=quiz[quizIndex];
    if(!q._shuffled){const order=q.a.map((a,i)=>({a,ok:i===q.c})).sort(()=>Math.random()-.5);q.a=order.map(x=>x.a);q.c=order.findIndex(x=>x.ok);q._shuffled=true}$("lessonStep").textContent=(quizIndex+1).toLocaleString("ar-EG")+" / "+quiz.length.toLocaleString("ar-EG");
    $("lessonProgress").style.width=(quizIndex/quiz.length*100)+"%";
    $("lessonBody").innerHTML=`<div class="lesson-title">اختبار الملك ماثيو 👑</div><h2>${q.q}</h2><div class="lesson-answers">${q.a.map((a,i)=>`<button data-answer="${i}"><span class="answer-picture" aria-hidden="true">${({ "أ":"🦁","ب":"🦆","ت":"🍎","ث":"🦊","ج":"🐪","ح":"🐎","خ":"🐑","د":"🐻","ذ":"🐺","ر":"🍎","ز":"🦒","س":"🐟","ش":"☀️","ص":"🦅","ض":"🐸","ط":"🐦","ظ":"✉️","ع":"🐤","غ":"🦌","ف":"🐘","ق":"🐱","ك":"📘","ل":"🥛","م":"🍌","ن":"🐅","ه":"🐦","هـ":"🐦","و":"🌹","ي":"✋"}[a]||"🔤")}</span><span class="answer-label">${a}</span></button>`).join("")}</div>`;
    const questionSpeak=document.createElement("button");questionSpeak.type="button";questionSpeak.className="voice-button question-speak";questionSpeak.textContent="🔊 اسمع السؤال";questionSpeak.onclick=()=>say(q.q+" اختار الإجابة الصحيحة","ar-EG");const questionHeading=panel.querySelector("#lessonBody .lesson-title");if(questionHeading)questionHeading.after(questionSpeak);
    panel.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{if(panel.dataset.done==="1")return;panel.dataset.done="1";const ok=Number(b.dataset.answer)===q.c;try{window.MatthewMastery?.record("arabic-letters",ok);window.MatthewMastery?.record("arabic-letter:"+lessons[letterIndex].letter,ok)}catch(_){}if(ok)score++;panel.querySelectorAll("[data-answer]").forEach(x=>{x.disabled=true;if(Number(x.dataset.answer)===q.c)x.classList.add("correct")});if(!ok)b.classList.add("wrong");$("lessonStatus").textContent=ok?"برافو يا بطل! إجابة صحيحة ⭐":"محاولة جميلة! ركز في الحركة وجرب السؤال التالي";$("lessonNext").textContent=quizIndex===quiz.length-1?"النتيجة 🏆":"السؤال التالي ←"});
    panel.dataset.done="0";$("lessonNext").textContent="اختار الإجابة";
    setTimeout(()=>say(q.q+". اختار الإجابة الصحيحة"),120);
  }
  function finishQuiz(){
    panel.dataset.finished="1";
    $("lessonBody").innerHTML=`<div class="lesson-title">برافو يا ملك ماثيو! 👑</div><div class="big-letter">🏆</div><h2>${score.toLocaleString("ar-EG")} من ${quiz.length.toLocaleString("ar-EG")}</h2><p>${score>=8?"ممتاز! أنت بطل الحروف والحركات ⭐":"شاطر! نعيد الدرس ونجرب تاني 💜"}</p><button id="retryLesson" class="primary">اختبار جديد بأسئلة مختلفة</button>`;
    $("retryLesson").onclick=()=>{step=3;makeQuiz()};
    $("lessonNext").textContent="العودة للدروس";
    $("lessonProgress").style.width="100%";
  }
  $("lessonNext").onclick=()=>{
    if(panel.dataset.finished==="1"){panel.dataset.finished="0";quiz=[];step=0;render();return}
    if(step<3){step++;render();return}
    if(!quiz.length){makeQuiz();return}
    if(quizIndex<quiz.length-1){quizIndex++;showQuiz()}else finishQuiz();
  };
  $("lessonBack").onclick=back;
  $("lessonListen").onclick=()=>{const l=lessons[letterIndex];say(l.name+"، "+l.sound)};
  card.onclick=open;
  panel.addEventListener("click",e=>{if(e.target.id==="retryLesson")return});
  // Keep the first visit instructional; quiz starts only after the lesson sequence.
})();