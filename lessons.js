(() => {
  const lessons = [
    {letter:"أ",name:"الألف",forms:["أ","ـأ","ـأ"],words:["أَسَد","سَأَلَ","مَلْجَأ"],emoji:["🦁","❓","🏡"],sound:"أَ"},
    {letter:"ب",name:"الباء",forms:["بـ","ـبـ","ـب"],words:["بَطَّة","جَبَل","كِتَاب"],emoji:["🦆","⛰️","📘"],sound:"بَ"},
    {letter:"ت",name:"التاء",forms:["تـ","ـتـ","ـت"],words:["تَمْر","مَتْجَر","بَيْت"],emoji:["🌴","🏪","🏠"],sound:"تَ"},
    {letter:"م",name:"الميم",forms:["مـ","ـمـ","ـم"],words:["مَوْز","سَمَك","قَلَم"],emoji:["🍌","🐟","✏️"],sound:"مَ"}
  ];
  const marks = [
    {name:"الفتحة",mark:"َ",sample:"بَ",hint:"نفتح الفم قليلاً: بَ",emoji:"☀️"},
    {name:"الضمة",mark:"ُ",sample:"بُ",hint:"نضم الشفتين: بُ",emoji:"⭕"},
    {name:"الكسرة",mark:"ِ",sample:"بِ",hint:"نبتسم ونكسر الصوت: بِ",emoji:"😊"},
    {name:"السكون",mark:"ْ",sample:"بْ",hint:"نسكن الحرف بلا حركة: أَبْ",emoji:"🤫"}
  ];
  const $ = id => document.getElementById(id);
  let letterIndex=0, step=0, markIndex=0, quiz=[], quizIndex=0, score=0;
  const say = text => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      $("lessonStatus").textContent="الصوت غير مدعوم في هذا المتصفح.";
      return;
    }
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text); u.lang="ar-SA"; u.rate=.72; u.pitch=1;
    const voices=window.speechSynthesis.getVoices();
    const v=voices.find(x=>x.lang && x.lang.toLowerCase().startsWith("ar"));
    if(v)u.voice=v;
    u.onerror=()=>{$("lessonStatus").textContent="تعذر تشغيل الصوت. تأكد من صوت اللغة العربية في الهاتف."};
    window.speechSynthesis.speak(u);
  };
  const card=document.createElement("button");
  card.className="game-card pink"; card.type="button"; card.dataset.lessonEntry="true";
  card.innerHTML='<span class="game-icon">📚</span><strong>مدرسة الحروف</strong><small>نتعلم الحرف والحركات قبل الاختبار</small><span class="play">ابدأ التعلم ←</span>';
  $("gameList").append(card);
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
  function open(){ $("gameList").classList.add("hidden");$("quiz").classList.add("hidden");$("result").classList.add("hidden");panel.classList.remove("hidden");letterIndex=0;step=0;render();}
  function back(){panel.classList.add("hidden");$("gameList").classList.remove("hidden");window.speechSynthesis?.cancel();}
  function render(){
    $("lessonStatus").textContent="";
    $("lessonStep").textContent=(step+1).toLocaleString("ar-EG")+" / ٤";
    $("lessonProgress").style.width=((step+1)/4*100)+"%";
    if(step===0) renderLetter();
    if(step===1) renderForms();
    if(step===2) renderMarks();
    if(step===3) renderQuizIntro();
    $("lessonNext").textContent=step===3?"ابدأ الاختبار ⭐":"التالي ←";
  }
  function renderLetter(){
    const l=lessons[letterIndex];
    $("lessonBody").innerHTML=`<div class="lesson-title">أهلاً يا ماثيو الملك 👑</div><p>النهارده هنتعلم حرف جديد</p><div class="big-letter">${l.letter}</div><h2>${l.name}</h2><p class="lesson-example">صوت الحرف: <b>${l.sound}</b></p><p>بص للحرف واسمع صوته كويس</p><div class="lesson-pager"><button id="prevLetter" class="secondary" ${letterIndex===0?"disabled":""}>الحرف السابق</button><button id="nextLetter" class="secondary">${letterIndex===lessons.length-1?"ابدأ من الأول":"الحرف التالي"}</button></div>`;
    $("prevLetter").onclick=()=>{letterIndex=(letterIndex+lessons.length-1)%lessons.length;render()};
    $("nextLetter").onclick=()=>{letterIndex=(letterIndex+1)%lessons.length;render()};
  }
  function renderForms(){
    const l=lessons[letterIndex];
    $("lessonBody").innerHTML=`<div class="lesson-title">أشكال حرف ${l.name}</div><p>شكل الحرف بيتغير حسب مكانه في الكلمة</p><div class="form-grid"><div><b>أول الكلمة</b><strong>${l.forms[0]}</strong></div><div><b>وسط الكلمة</b><strong>${l.forms[1]}</strong></div><div><b>آخر الكلمة</b><strong>${l.forms[2]}</strong></div></div><div class="word-examples">${l.words.map((w,i)=>`<div><span>${l.emoji[i]}</span><b>${w}</b></div>`).join("")}</div><p class="voice-note">ملحوظة: حرف الألف لا يتصل بما بعده، لذلك شكله يختلف عن باقي الحروف.</p>`;
  }
  function renderMarks(){
    const m=marks[markIndex];
    $("lessonBody").innerHTML=`<div class="lesson-title">الحركات الأربع</div><div class="mark-tabs">${marks.map((x,i)=>`<button class="${i===markIndex?"active":""}" data-mark="${i}">${x.name}</button>`).join("")}</div><div class="mark-card"><span>${m.emoji}</span><div class="mark-symbol">${sample}</div><h2>${m.name}</h2><p>${soundHint}: ${sample}</p><strong>مثال: ${sample}</strong></div><p>اختار كل حركة واسمعها بصوت واضح</p>`;
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
    const q=quiz[quizIndex];$("lessonStep").textContent=(quizIndex+1).toLocaleString("ar-EG")+" / "+quiz.length.toLocaleString("ar-EG");
    $("lessonProgress").style.width=(quizIndex/quiz.length*100)+"%";
    $("lessonBody").innerHTML=`<div class="lesson-title">اختبار الملك ماثيو 👑</div><h2>${q.q}</h2><div class="lesson-answers">${q.a.map((a,i)=>`<button data-answer="${i}">${a}</button>`).join("")}</div>`;
    panel.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{if(panel.dataset.done==="1")return;panel.dataset.done="1";const ok=Number(b.dataset.answer)===q.c;if(ok)score++;panel.querySelectorAll("[data-answer]").forEach(x=>{x.disabled=true;if(Number(x.dataset.answer)===q.c)x.classList.add("correct")});if(!ok)b.classList.add("wrong");$("lessonStatus").textContent=ok?"برافو يا بطل! إجابة صحيحة ⭐":"محاولة جميلة! ركز في الحركة وجرب السؤال التالي";$("lessonNext").textContent=quizIndex===quiz.length-1?"النتيجة 🏆":"السؤال التالي ←"});
    panel.dataset.done="0";$("lessonNext").textContent="اختار الإجابة";
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