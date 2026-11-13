(()=> {
 const $=id=>document.getElementById(id);
 const learningList=$("learningList")||$("gameList");
 const digits=n=>String(n).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[+d]);
 const names=["واحد","اتنين","تلاتة","أربعة","خمسة","ستة","سبعة","تمانية","تسعة","عشرة","حداشر","اتناشر","تلتاشر","أربعتاشر","خمستاشر","ستاشر","سبعتاشر","تمنتاشر","تسعتاشر","عشرين"];
 const icons=["🍎","⭐","🧸","🚗","⚽","🐠","🌼","🦋","🍓","🎈","🐥","🍉","🚀","🐢","🦁","🐘","🍌","🦄","🧩","🎁"];
 const panel=document.createElement("section");panel.id="mathJourney";panel.lang="ar";panel.dir="rtl";panel.className="academy-panel hidden";document.querySelector("main").insertBefore(panel,document.querySelector("footer"));
 // Round 3.2.3 item 9: lesson → quiz offer. The finish screen offers the
 // main numbers quiz (bank `numbers` — a direct fit: Arabic counting /
 // add / sub). NEW CLIP for the audio worker: quiz_offer_numbers = this
 // text (Aria, ar-EG). Spoken as part of the finish sequence below, so it
 // plays after the score lines, in order — never a guessed timeout.
 const QUIZ_OFFER_NUMBERS="برافو يا بطل! خلصت الدرس! يلا نختبر نفسك في الأرقام! دوس على الكاس!";
 const card=document.createElement("button");card.type="button";card.className="game-card orange";card.innerHTML='<span class="game-icon">➕</span><strong>الحساب بالعربي: الأرقام ١–٢٠</strong><small>شرح بالصورة والعدّ، وبعده تمارين متنوعة</small><span class="play">ابدأ الحساب ←</span>';learningList.append(card);
 let level=1,round=[],qIndex=0,score=0,stage="learn",best=0,speechToken=0,moveShown=false,activeTab="lesson",explainSpokenFor=-1;
 const later=(fn,ms)=>{const tk=++speechToken;setTimeout(()=>{if(tk===speechToken)fn()},ms)};
 const safeNum=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
 const rand=a=>a[Math.floor(Math.random()*a.length)];
 const sample=(answer,max)=>{const set=new Set([answer]);while(set.size<4){let n=answer+Math.floor(Math.random()*7)-3;if(n<1||n>max)n=Math.floor(Math.random()*max)+1;set.add(n)}return [...set].sort(()=>Math.random()-.5)};
 const countPic=n=>Array.from({length:n},(_,i)=>icons[i%icons.length]).join(" ");
 // Round 3.2.2 P2: the add/sub operands are drawn from a NEIGHBOURING
 // level's recorded variant (m in [n-2, n+2]) instead of being fixed per
 // level — replaying a level no longer asks the same operation every time.
 // Only already-recorded variants are used, so every emitted question and
 // explanation string already has a clip in the corpus (build-corpus.js §8
 // enumerates all 20 levels' variants); no new spoken text is introduced.
 function questions(n){const max=Math.min(20,Math.max(5,n+3)),prev=n===1?2:n-1,next=Math.min(20,n+1),afterQ=n===20?19:n,afterA=n===20?20:next;const nearLevel=()=>{const lo=Math.max(1,n-2),hi=Math.min(20,n+2);return lo+Math.floor(Math.random()*(hi-lo+1))};const addM=nearLevel(),subM=nearLevel();const addA=Math.max(1,Math.floor(addM/2)),addB=Math.max(1,Math.min(5,addM-addA));const subA=Math.min(20,subM+3),subB=1+(subM%2);const apples=a=>a===1?"تفاحة واحدة":digits(a)+" تفاحات";return [
 {q:"عدّ الصور: كام واحدة؟",pic:countPic(n),a:sample(n,20),correct:n,ex:"عدّ كل صورة واحدة واحدة. المجموع "+digits(n)+"."},
 {q:"إيه الرقم اللي بعد "+digits(afterQ)+"؟",pic:"➡️ 🔢",a:sample(afterA,20),correct:afterA,ex:"بعد "+names[afterQ-1]+" بييجي "+names[afterA-1]+"."},
 {q:"إيه الرقم اللي قبل "+digits(next)+"؟",pic:"⬅️ 🔢",a:sample(next-1,20),correct:next-1,ex:"قبل "+names[next-1]+" بييجي "+names[next-2]+"."},
 {q:"معانا "+apples(addA)+" وزودنا "+(addB===1?"واحدة":digits(addB))+"، بقوا كام؟",pic:"🍎 ➕ 🍎",a:sample(addA+addB,20),correct:addA+addB,ex:names[addA-1]+" زائد "+names[addB-1]+" يساوي "+names[addA+addB-1]+". عدّهم مع بعض."},
 {q:"كان معانا "+digits(subA)+" نجوم واختفى "+digits(subB)+"، فاضل كام؟",pic:"⭐ ➖ ⭐",a:sample(subA-subB,20),correct:subA-subB,ex:names[subA-1]+" ناقص "+names[subB-1]+" يساوي "+names[subA-subB-1]+". شيل "+names[subB-1]+" وعدّ الباقي."},
 {q:"اختار العدد الأكبر: "+digits(n)+" ولا "+digits(prev),pic:"🐘 🐭",a:sample(Math.max(n,prev),20),correct:Math.max(n,prev),ex:"العدد الأكبر هو "+digits(Math.max(n,prev))+"."}
 ].sort(()=>Math.random()-.5).slice(0,4)}
 function open(){score=0;document.getElementById("gameList").classList.add("hidden");learningList.classList.add("hidden");document.getElementById("quiz").classList.add("hidden");document.getElementById("result").classList.add("hidden");document.getElementById("parentPanel")?.classList.add("hidden");panel.classList.remove("hidden");renderPicker()}
 function renderPicker(){stage="picker";let completed=0;try{completed=Number(JSON.parse(localStorage.getItem("matthewMathProgress")||"{}").completed)||0}catch(_){}panel.innerHTML='<div class="quiz-top"><button id="mathBack" class="back" type="button">رجوع →</button><strong>🔢 اختار رقم يا ملك ماثيو</strong><span>١–٢٠</span></div><p class="academy-hint">اختار رقم عشان تتعلمه وتتدرب عليه</p><div class="basic-grid">'+names.map((nm,i)=>'<button type="button" class="basic-tile" data-level="'+(i+1)+'"><span>'+icons[i]+'</span><b>'+digits(i+1)+'</b><small>'+nm+(i+1<=completed?" ⭐":"")+'</small></button>').join("")+'</div>';bindBack();panel.querySelectorAll("[data-level]").forEach(b=>b.onclick=()=>{level=Number(b.dataset.level);score=0;renderLearn()});later(()=>say("اختار رقم يا ملك ماثيو"),120)}
 function back(){speechToken++;try{window.MatthewVoice?.stop()}catch(_){}if(stage==="picker"){panel.classList.add("hidden");document.getElementById("gameList").classList.remove("hidden");learningList.classList.remove("hidden");window.updateStats?.()}else renderPicker()}
 // Round 3.2.2 P0-4: recorded clips ONLY — no device speechSynthesis.
 function say(t){if(window.MatthewVoice?.speak)window.MatthewVoice.speak(t,"ar-EG")}
 function saySeq(list){if(window.MatthewVoice?.speakSequence)window.MatthewVoice.speakSequence(list,"ar-EG");else if(list&&list.length)say(list.join("، "))}
 function header(){return '<div class="quiz-top"><button id="mathBack" class="back" type="button">رجوع →</button><strong>الحساب بالعربي - الملك ماثيو</strong><span>'+digits(level)+' / ٢٠</span></div><div class="progress"><div style="width:'+level*5+'%"></div></div>'}
 function bindBack(){panel.querySelector("#mathBack").onclick=back}
 // Round 3.2.6 item 2: the level opens with three big tabs — 📖 الدرس
 // (the number, its pictures and the count tip), 🧕 الشرح (the counting
 // explanation, spoken once when the tab opens), 🏆 الاختبار (the
 // journey's own 4 exercises for THIS number). Item 3: the quiz tab IS
 // the level's exercises — the finish screen no longer opens the general
 // numbers bank (see the note by the mathQuiz handler).
 const mathTabsHTML=active=>`<div class="lesson-tabs" role="tablist"><button type="button" class="lesson-tab${active==="lesson"?" active":""}" data-lesson-tab="lesson" role="tab">📖 الدرس</button><button type="button" class="lesson-tab${active==="explain"?" active":""}" data-lesson-tab="explain" role="tab">🧕 الشرح</button><button type="button" class="lesson-tab${active==="quiz"?" active":""}" data-lesson-tab="quiz" role="tab">🏆 الاختبار</button></div>`;
 function mathLessonHTML(n){
   return '<div class="academy-visual">🔢</div><div class="math-number">'+digits(n)+'</div><h2>'+names[n-1]+'</h2><p class="academy-hint">ده رقم '+names[n-1]+'. يلا نعدّ الصور سوا!</p><div class="math-count-pictures">'+countPic(n)+'</div><p class="math-tip">كل صورة بنعدّها مرة واحدة. آخر رقم بنقوله هو عدد الصور كلها.</p><button id="mathListen" class="voice-button">🔊 اسمع الرقم</button><button id="mathStart" class="primary">فهمت! ابدأ التمارين ⭐</button>';
 }
 function mathExplainHTML(n){
   return '<div class="explain-box"><strong>🧕 الميس بتشرح لك من الصفر</strong><p>ده رقم <b>'+names[n-1]+'</b>. يلا نعدّ الصور سوا!</p><p class="math-count-pictures">'+countPic(n)+'</p><p>كل صورة بنعدّها مرة واحدة. آخر رقم بنقوله هو عدد الصور كلها.</p></div><button id="mathExplainListen" class="voice-button">🔊 اسمع الشرح</button><p>اسمع الشرح كويس، وبعدين جرّب 🏆 الاختبار على نفس الرقم!</p>';
 }
 // One paint for every tabbed screen (lesson / question / break): header +
 // tabs + all three panels, so the tabs never disappear mid-lesson.
 function paintMathLearn(quizHTML){
   const n=level;
   panel.innerHTML=header()+mathTabsHTML(activeTab)
     +'<div class="tab-panel'+(activeTab==="lesson"?" active":"")+'" data-tab-panel="lesson">'+mathLessonHTML(n)+'</div>'
     +'<div class="tab-panel'+(activeTab==="explain"?" active":"")+'" data-tab-panel="explain">'+mathExplainHTML(n)+'</div>'
     +'<div class="tab-panel'+(activeTab==="quiz"?" active":"")+'" data-tab-panel="quiz">'+(quizHTML||'<p>تمارين على رقم '+names[n-1]+' بس — عدّ وجمع وطرح على نفس الرقم.</p><button id="mathQuizStart" class="primary">🏆 ابدأ التمارين ⭐</button>')+'</div>';
   bindBack();bindMathTabs();
   panel.querySelector("#mathListen").onclick=()=>say("ده رقم "+names[n-1]+".");
   panel.querySelector("#mathStart").onclick=()=>switchMathTab("quiz");
   panel.querySelector("#mathExplainListen").onclick=()=>saySeq(["ده رقم "+names[n-1]+". يلا نعدّ الصور سوا","كل صورة بنعدّها مرة واحدة. آخر رقم بنقوله هو عدد الصور كلها."]);
   const qs=panel.querySelector("#mathQuizStart");if(qs)qs.onclick=()=>switchMathTab("quiz");
 }
 function bindMathTabs(){panel.querySelectorAll("[data-lesson-tab]").forEach(b=>b.onclick=()=>switchMathTab(b.dataset.lessonTab))}
 function switchMathTab(name){
   if(name!=="lesson"&&name!=="explain"&&name!=="quiz")return;
   try{window.MatthewVoice?.stop()}catch(_){}
   activeTab=name;
   panel.querySelectorAll("[data-lesson-tab]").forEach(b=>b.classList.toggle("active",b.dataset.lessonTab===name));
   panel.querySelectorAll("[data-tab-panel]").forEach(p=>p.classList.toggle("active",p.dataset.tabPanel===name));
   if(name==="explain"&&explainSpokenFor!==level){explainSpokenFor=level;const n=level;later(()=>saySeq(["ده رقم "+names[n-1]+". يلا نعدّ الصور سوا","كل صورة بنعدّها مرة واحدة. آخر رقم بنقوله هو عدد الصور كلها."]),120);}
   if(name==="quiz")startQuiz();
 }
 function renderLearn(){stage="learn";activeTab="lesson";explainSpokenFor=-1;paintMathLearn()}
 function startQuiz(){activeTab="quiz";round=questions(level);qIndex=0;score=0;moveShown=false;renderQuestion()}
 function renderQuestion(){stage="quiz";const q=round[qIndex];
  // Round 3.2.2 P1-5: binding movement break before the 3rd question,
  // once per round — same 25s timer as the main quiz. The break lives in
  // the quiz panel so the tabs stay on screen.
  const MB=(typeof window!=="undefined")?window.MatthewMoveBreak:null;
  if(qIndex===2&&!moveShown&&MB){moveShown=true;paintMathLearn('<div class="move-break" id="mathMoveBreak"></div>');MB.show(panel.querySelector("#mathMoveBreak"),()=>renderQuestion());return}
  paintMathLearn('<p class="math-stage">تحدّي '+digits(qIndex+1)+' من '+digits(round.length)+'</p><div class="math-count-pictures">'+q.pic+'</div><h2>'+q.q+'</h2><button id="mathQuestionSpeak" class="voice-button" type="button">🔊 اسمع السؤال</button><div class="math-choices">'+q.a.map(n=>'<button type="button" data-value="'+n+'"><span class="answer-picture" aria-hidden="true">'+(n<=10?countPic(n):'🔢 '+countPic(10))+'</span><b>'+digits(n)+'</b><small>'+names[n-1]+'</small></button>').join("")+'</div><p id="mathFeedback" class="feedback" aria-live="polite"></p><button id="mathNext" class="primary hidden">السؤال التالي<span class="pager-arrow">←</span></button>');let done=false;const ask=()=>saySeq([q.q,...q.a.map(n=>names[n-1])]);panel.querySelector("#mathQuestionSpeak").onclick=()=>{if(done)say(q.q+" "+q.ex);else ask()};later(()=>{if(!done)ask()},120);panel.querySelectorAll("[data-value]").forEach(b=>b.onclick=()=>{if(done)return;done=true;const correct=+b.dataset.value===q.correct;try{window.MatthewMastery?.record("math-ar",correct);window.MatthewMastery?.record("math-ar-number:"+level,correct)}catch(_){}if(correct){score++;b.classList.add("correct");$("mathFeedback").textContent="برافو يا بطل! إجابة صح ⭐"}else{b.classList.add("wrong");$("mathFeedback").textContent="ولا يهمك، نتعلم سوا. "+q.ex+" والإجابة "+digits(q.correct)}try{window.MatthewVoice?.feedback(correct?"correct":"wrong")}catch(_){}panel.querySelectorAll("[data-value]").forEach(x=>{x.disabled=true;if(+x.dataset.value===q.correct)x.classList.add("correct")});const next=panel.querySelector("#mathNext");next.classList.remove("hidden");next.innerHTML=qIndex===round.length-1?"شوف نتيجتك 🏆":"السؤال التالي<span class=\"pager-arrow\">←</span>"});panel.querySelector("#mathNext").onclick=()=>{if(qIndex<round.length-1){qIndex++;renderQuestion()}else finishLevel()}}
 function finishLevel(){stage="finish";const key="matthewMathProgress";let old={completed:0,attempts:0,correct:0};try{old=Object.assign(old,JSON.parse(localStorage.getItem(key)||"{}"))}catch(_){}old.completed=safeNum(old.completed);old.attempts=safeNum(old.attempts);old.correct=safeNum(old.correct);old.attempts+=round.length;old.correct+=score;if(score>=3)old.completed=Math.max(old.completed,level);localStorage.setItem(key,JSON.stringify(old));localStorage.setItem("matthewPoints",safeNum(localStorage.getItem("matthewPoints"))+score*10);localStorage.setItem("matthewStars",safeNum(localStorage.getItem("matthewStars"))+Math.max(0,Math.round(score/round.length*3)));if(score>=3)localStorage.setItem("matthewTrophies",safeNum(localStorage.getItem("matthewTrophies"))+1);panel.innerHTML=header()+'<div class="academy-visual">'+(score>=3?"🏆":"💪")+'</div><h2>'+(score>=3?"برافو يا بطل!":"محاولة جميلة يا ماثيو!")+'</h2><p class="academy-hint">جاوبت صح على '+digits(score)+' من '+digits(round.length)+'.</p><p class="math-tip">'+(score>=3?"عدّيت المرحلة! نروح للي بعدها.":"راجع الشرح وجرب تاني، إنت تقدر!")+'</p><button id="mathRetry" class="secondary">أعيد التمارين</button><button id="mathContinue" class="primary">'+(level===20?"خلصت رحلة الماث! 🎉":score>=3?"المرحلة التالية<span class=\"pager-arrow\">←</span>":"راجع الدرس<span class=\"pager-arrow\">←</span>")+'</button><button id="mathQuiz" class="primary">🏆 اختبر نفسك في الأرقام ⭐</button>';bindBack();panel.querySelector("#mathRetry").onclick=startQuiz;panel.querySelector("#mathContinue").onclick=()=>{if(score>=3&&level<20)level++;renderLearn()};panel.querySelector("#mathQuiz").onclick=()=>{speechToken++;try{window.MatthewVoice?.stop()}catch(_){}startQuiz()};
// Round 3.2.6 item 3: the finish screen's quiz button opens the
// level's own exercises in the 🏆 tab (the general bank lives ONLY
// in the Tests section now).
later(()=>saySeq(["جاوبت صح على "+digits(score)+" من "+digits(round.length)+".",score>=3?"عدّيت المرحلة! نروح للي بعدها.":"راجع الشرح وجرب تاني، إنت تقدر!",QUIZ_OFFER_NUMBERS]),150)}
 card.onclick=open;
})();