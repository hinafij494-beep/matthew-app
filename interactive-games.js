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
      const correct=button.dataset.listen===currentTarget.id;
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
