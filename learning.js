(() => {
  // Round 3.2.1 note 9: the Arabic-letters card is gone — the letter
  // school (lessons.js) is the one Arabic-letters entry now, with its
  // picker and unified lesson. arNumbers, enLetters, enNumbers stay.
  const englishWords = ["Apple","Ball","Cat","Dog","Elephant","Fish","Grapes","House","Ice cream","Juice","Kite","Lion","Monkey","Nest","Orange","Pencil","Queen","Rabbit","Sun","Tiger","Umbrella","Van","Watch","Xylophone","Yo-yo","Zebra"];
  const arabicMeanings = ["تفاحة","كورة","قطة","كلب","فيل","سمكة","عنب","بيت","آيس كريم","عصير","طيارة ورق","أسد","قرد","عش","برتقالة","قلم رصاص","ملكة","أرنب","شمس","نمر","شمسية","عربية","ساعة","إكسيليفون","يويو","حمار وحشي"];
  const phonicsSounds=["short a","buh","kuh","duh","eh","fff","guh","huh","eye","juh","kuh","lll","mmm","nnn","o","puh","kwuh","rrr","sss","tuh","uh","vvv","wuh","zuh","yuh","zzz"];
  const englishLetters = englishWords.map((word,i) => {
    const letter=String.fromCharCode(65+i);
    return {value:letter,lowercase:letter.toLowerCase(),phonics:phonicsSounds[i],word,emoji:["🍎","⚽","🐱","🐶","🐘","🐟","🍇","🏠","🍦","🧃","🪁","🦁","🐵","🪺","🍊","✏️","👑","🐰","☀️","🐯","☂️","🚐","⌚","<svg viewBox='0 0 64 64' aria-hidden='true'><g stroke='#5b6067' stroke-width='1.5'><rect x='10' y='10' width='44' height='6' rx='3' fill='#e14b6d'/><rect x='12' y='18' width='40' height='6' rx='3' fill='#ff9d45'/><rect x='14' y='26' width='36' height='6' rx='3' fill='#ffd94d'/><rect x='16' y='34' width='32' height='6' rx='3' fill='#8bd9a7'/><rect x='18' y='42' width='28' height='6' rx='3' fill='#69b7ff'/></g><path d='M14 52 L26 34 M50 52 L40 30' stroke='#8a5a24' stroke-width='3' stroke-linecap='round'/><circle cx='26' cy='32' r='4' fill='#e14b6d'/><circle cx='40' cy='28' r='4' fill='#2169a8'/></svg>","🪀","🦓"][i],speak:"حرف "+letter+"، شكله الصغير "+letter.toLowerCase()+"، صوته "+phonicsSounds[i]+"، زي كلمة "+word+" يعني "+arabicMeanings[i]};
  });
  const arabicNames=["واحد","اتنين","تلاتة","أربعة","خمسة","ستة","سبعة","تمانية","تسعة","عشرة","حداشر","اتناشر","تلتاشر","أربعتاشر","خمستاشر","ستاشر","سبعتاشر","تمنتاشر","تسعتاشر","عشرين"];
  const arabicDigits=["١","٢","٣","٤","٥","٦","٧","٨","٩","١٠","١١","١٢","١٣","١٤","١٥","١٦","١٧","١٨","١٩","٢٠"];
  const englishNames=["one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
  const arabicNumbers=arabicDigits.map((n,i)=>({value:n,word:arabicNames[i],emoji:"🔢",speak:arabicNames[i]}));
  const englishNumbers=englishNames.map((n,i)=>({value:String(i+1),word:n,emoji:"🔢",speak:n}));
  const categories=[
    {id:"enLetters",title:"الحروف الإنجليزية (A - Z)",subtitle:"٢٦ حرف مع كلمة لكل حرف",items:englishLetters,lang:"ar-EG"},
    {id:"arNumbers",title:"الأرقام العربية (١ - ٢٠)",subtitle:"نتعلم العدّ باللهجة المصرية",items:arabicNumbers,lang:"ar-EG"},
    {id:"enNumbers",title:"الأرقام الإنجليزية (1 - 20)",subtitle:"نتعلم العدّ بالإنجليزي",items:englishNumbers,lang:"en-US"}
  ];
  const main=document.querySelector("main"),gameList=document.getElementById("gameList"),learningList=document.getElementById("learningList")||gameList;
  if(!main||!gameList)return;
  const panel=document.createElement("section");
  panel.id="basicLearning";panel.className="academy-panel hidden";panel.dir="rtl";
  main.insertBefore(panel,document.querySelector("footer"));
  // Round 3.2.2 P0-4: recorded clips ONLY — no device speechSynthesis.
  const speak=(text,lang)=>{if(window.MatthewVoice&&window.MatthewVoice.speak)window.MatthewVoice.speak(text,lang)};
  let active=null,index=0;
  categories.forEach((cat,i)=>{
    const card=document.createElement("button");card.type="button";card.className="game-card "+["orange","blue","green","purple"][i];
    card.innerHTML='<span class="game-icon">'+["📖","🔤","🔢","🔢"][i]+'</span><strong>'+cat.title+'</strong><small>'+cat.subtitle+'</small><span class="play">ابدأ التعلم ←</span>';
    card.addEventListener("click",()=>open(cat));learningList.append(card);
  });
  function open(cat){active=cat;index=0;gameList.classList.add("hidden");learningList.classList.add("hidden");document.getElementById("quiz")?.classList.add("hidden");document.getElementById("result")?.classList.add("hidden");panel.classList.remove("hidden");render()}
  function render(){
    const item=active.items[index];
    const heading="اتعلم واسمع";
    panel.innerHTML='<div class="quiz-top"><button id="basicBack" class="back" type="button">🏠 الرئيسية</button><strong>'+active.title+'</strong><span>'+String(index+1).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[+d])+' / '+active.items.length.toLocaleString("ar-EG")+'</span></div><div class="progress"><div style="width:'+((index+1)/active.items.length*100)+'%"></div></div><div class="basic-focus sticky-panel"><div class="basic-emoji">'+item.emoji+'</div><div class="basic-value">'+item.value+'</div>'+(active.id==="enLetters"?'<div class="lowercase-letter">الشكل الصغير: '+item.lowercase+'</div><div class="phonics-note">الصوت: '+item.phonics+'</div>':'')+'<h2>'+item.word+'</h2><p>'+heading+'</p><button id="basicListen" class="voice-button" type="button">🔊 اسمع</button></div><div class="basic-grid">'+active.items.map((x,i)=>'<button type="button" class="basic-tile '+(i===index?"active":"")+'" data-index="'+i+'"><span>'+x.emoji+'</span><b>'+(x.lowercase?x.value+" / "+x.lowercase:x.value)+'</b><small>'+x.word+'</small></button>').join("")+'</div><div class="basic-nav"><button id="basicPrev" class="secondary" type="button" '+(index===0?"disabled":"")+'>السابق</button><button id="basicNext" class="primary" type="button">'+(index===active.items.length-1?"ارجع للبداية":"التالي")+' ←</button></div>';
    panel.querySelector("#basicBack").onclick=close;
    panel.querySelector("#basicListen").onclick=()=>speak(item.speak,active.lang);
    panel.querySelector("#basicPrev").onclick=()=>{index=Math.max(0,index-1);render()};
    panel.querySelector("#basicNext").onclick=()=>{index=index===active.items.length-1?0:index+1;render()};
    panel.querySelectorAll("[data-index]").forEach(b=>b.onclick=()=>{index=Number(b.dataset.index);render()});
    const tk=++speakToken;setTimeout(()=>{if(tk!==speakToken)return;speak(item.speak,active.lang)},120);
  }
  let speakToken=0;
  function close(){speakToken++;panel.classList.add("hidden");gameList.classList.remove("hidden");learningList.classList.remove("hidden");window.MatthewVoice?.stop()}
})();