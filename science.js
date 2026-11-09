(() => {
  const subjects = [
    { id:"animals", title:"الحيوانات", icon:"🦁", lessons:[
      ["الثدييات","🐘","الفيل من الثدييات. يلد صغاره ويرضعها اللبن.","الثدييات حيوانات تلد صغارها وترضعها اللبن. الفيل من أكبر الحيوانات البرية."],
      ["الطيور","🐦","الطيور لها ريش ومنقار، وكثير منها يطير.","الطيور لها ريش ومنقار وجناحان. البطريق طائر لكنه لا يطير."],
      ["حيوانات الماء","🐟","السمكة تعيش في الماء وتتنفس بالخياشيم.","الأسماك تعيش في الماء وتستخدم الخياشيم للتنفس. لا نخرج السمكة من الماء."],
      ["حيوانات الصحراء","🐪","الجمل يستطيع العيش في الصحراء.","الجمل متكيف مع الصحراء، وله أقدام تساعده على السير فوق الرمل."],
      ["بيوت الحيوانات","🐝","النحلة تعيش مع النحل في الخلية.","لكل حيوان مكان يناسبه: النحلة في الخلية، والعصفور في العش، والسمكة في الماء."]
    ]},
    { id:"plants", title:"النباتات", icon:"🌱", lessons:[
      ["أجزاء النبات","🌿","للنبات جذر وساق وأوراق، وكثير من النباتات لها أزهار.","الجذر يثبت النبات ويمتص الماء، والساق تحمل الأوراق، والأوراق تساعد النبات على صنع غذائه."],
      ["ماذا يحتاج النبات؟","☀️","النبات يحتاج إلى الماء والضوء والهواء.","النبات يحتاج إلى ماء وضوء الشمس وهواء وتربة مناسبة لكي ينمو."],
      ["من بذرة إلى نبتة","🌻","البذرة الصغيرة يمكن أن تنمو وتصبح نبتة.","عندما تحصل البذرة على الماء والدفء المناسبين تبدأ في الإنبات، ثم تنمو الجذور والأوراق."],
      ["ثمار وخضروات","🍎","التفاح والبرتقال ثمار، والجزر من الخضروات.","نأكل أنواعاً مختلفة من النباتات؛ بعض أجزائها ثمار وبعضها أوراق أو جذور."]
    ]},
    { id:"body", title:"جسم الإنسان", icon:"🫀", lessons:[
      ["الحواس الخمس","👀","نرى بالعين ونسمع بالأذن ونشم بالأنف ونتذوق باللسان ونلمس بالجلد.","لدينا خمس حواس تساعدنا على اكتشاف العالم: البصر والسمع والشم والتذوق واللمس."],
      ["القلب","❤️","القلب يدق ويساعد الدم على الحركة في الجسم.","القلب عضلة تعمل طوال الوقت وتضخ الدم إلى أجزاء الجسم."],
      ["العظام","🦴","العظام تساعدنا على الوقوف والحركة وتحمي أجزاء من الجسم.","الهيكل العظمي يدعم الجسم ويحمي أعضاء مهمة. نعتني به بالغذاء والحركة الآمنة."],
      ["النظافة","🧼","نغسل أيدينا بالماء والصابون قبل الأكل وبعد اللعب.","غسل اليدين يساعد على إزالة الأوساخ والجراثيم. وننظف أسناننا كل يوم."]
    ]},
    { id:"physics", title:"الفيزياء المبسطة", icon:"🧲", lessons:[
      ["المغناطيس","🧲","المغناطيس يجذب بعض الأشياء المصنوعة من الحديد.","المغناطيس يجذب بعض المعادن مثل الحديد، لكنه لا يجذب الخشب أو الورق. جرّب مع أشياء آمنة وبإشراف كبير."],
      ["يطفو أم يغوص؟","🛶","بعض الأشياء تطفو على الماء وأشياء أخرى تغوص.","قطعة الخشب غالباً تطفو، والحجر غالباً يغوص. جرّب في وعاء ماء صغير مع شخص كبير."],
      ["الضوء والظل","🔦","يتكوّن الظل عندما يقف جسم في طريق الضوء.","الضوء يسير في خطوط مستقيمة تقريباً، وعندما يحجب جسم الضوء يتكوّن ظل خلفه."],
      ["الصوت والاهتزاز","🎵","نسمع الصوت عندما تهتز الأشياء.","الصوت ينتج عن اهتزازات تنتقل خلال الهواء حتى تصل إلى الأذن."]
    ]},
    { id:"chemistry", title:"الكيمياء والألوان", icon:"🎨", lessons:[
      ["حالات المادة","🧊","الماء قد يكون سائلاً أو ثلجاً صلباً أو بخاراً.","المادة حولنا قد تكون صلبة مثل الثلج، أو سائلة مثل الماء، أو غازية مثل بخار الماء."],
      ["خلط الألوان","🖌️","الأصفر مع الأزرق يعطينا الأخضر في ألوان الرسم.","في ألوان الرسم، خلط الأصفر والأزرق يعطينا الأخضر، والأحمر مع الأصفر يعطينا البرتقالي."],
      ["الذوبان","🧂","السكر يذوب في الماء ويختفي عن العين.","عندما نخلط السكر بالماء يذوب وينتشر فيه. لا نتذوق أي تجربة إلا بإذن شخص كبير."],
      ["آمن في التجارب","🥽","نجرب بأشياء آمنة ومع شخص كبير فقط.","لا نخلط مواد التنظيف أو الأدوية أو أي مواد مجهولة. التجارب تكون بألوان الطعام أو الماء وتحت إشراف شخص كبير."]
    ]},
    { id:"universe", title:"الطبيعة والكون", icon:"🌍", lessons:[
      ["كوكب الأرض","🌍","نحن نعيش على كوكب الأرض.","الأرض كوكب فيه يابسة وماء وهواء، وتعيش عليه النباتات والحيوانات والناس."],
      ["الشمس","☀️","الشمس نجم يضيء لنا ويعطينا الدفء.","الشمس نجم قريب من الأرض، وضوؤها يساعد النباتات ويجعل النهار مضيئاً. لا ننظر إليها مباشرة."],
      ["القمر","🌙","نرى القمر في السماء ليلاً في أوقات كثيرة.","القمر جسم يدور حول الأرض، ونرى الجزء الذي يضيئه ضوء الشمس."],
      ["الكواكب","🪐","تدور كواكب حول الشمس، والأرض واحد منها.","توجد ثمانية كواكب تدور حول الشمس. الأرض هي الكوكب الذي نعيش عليه."],
      ["الليل والنهار","🌗","تدور الأرض حول نفسها فيحدث الليل والنهار.","عندما يكون مكاننا مواجهاً للشمس يكون نهاراً، وعندما يبتعد عن ضوئها يكون ليلاً."]
    ]},
    { id:"coding", title:"البرمجة والمنطق", icon:"💻", lessons:[
      ["ما هي البرمجة؟","🤖","البرمجة هي إعطاء الكمبيوتر خطوات واضحة لينفذها.","نكتب أوامر مرتبة للكمبيوتر أو الروبوت. إذا غيّرنا ترتيب الأوامر قد تتغير النتيجة."],
      ["الاتجاهات","⬆️","فوق وتحت ويمين وشمال تساعدنا على تحديد الطريق.","اتبع الأوامر: خطوة للأمام، ثم خطوة لليمين. اطلب من شخص كبير أن يرسم لك طريقاً آمناً."],
      ["الأنماط","🔴","أحمر، أزرق، أحمر، أزرق... ما اللون التالي؟","النمط هو شيء يتكرر بترتيب. لاحظ ما يتكرر ثم اختر العنصر الذي يكمل الترتيب."],
      ["ترتيب الخطوات","🪥","نضع المعجون على الفرشاة ثم ننظف الأسنان.","في البرمجة نرتب الخطوات: نحضر الفرشاة، نضع المعجون، ننظف الأسنان، ثم نشطف الفم."],
      ["حل المشكلات","🧩","نجرّب خطوة، ونلاحظ النتيجة، ثم نصلح الخطأ.","إذا لم يعمل الأمر كما نريد، نفكر أين الخطأ ونجرّب تعديلاً صغيراً. هذا يسمى تصحيح الأخطاء."]
    ]}
  ];
  const main=document.querySelector("main");
  const gameList=document.getElementById("gameList");
  if(!main||!gameList)return;
  const panel=document.createElement("section");
  panel.id="scienceAcademy";panel.className="academy-panel hidden";panel.dir="rtl";
  main.insertBefore(panel,document.querySelector("footer"));
  const speak=(text)=>window.MatthewVoice?.speak(text,"ar-EG");
  let subject=null;
  const card=document.createElement("button");
  card.type="button";card.className="game-card green";
  card.innerHTML='<span class="game-icon">🔬</span><strong>عالم العلوم والكون والبرمجة</strong><small>حيوانات ونباتات وجسم الإنسان وتجارب ومنطق</small><span class="play">اكتشف العلوم ←</span>';
  card.addEventListener("click",open);
  gameList.append(card);
  function open(){
    subject=null;
    gameList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    panel.classList.remove("hidden");
    renderSubjects();
  }
  function back(){
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    window.MatthewVoice?.stop();
  }
  function renderSubjects(){
    panel.innerHTML='<div class="quiz-top"><button id="scienceBack" class="back" type="button">→ الرئيسية</button><strong>🔬 أكاديمية العلوم</strong><span>٧ عوالم</span></div><h2>اختار العالم اللي تحب تكتشفه</h2><div class="science-grid">'+subjects.map(s=>'<button class="science-card" type="button" data-subject="'+s.id+'"><span>'+s.icon+'</span><b>'+s.title+'</b><small>'+s.lessons.length+' دروس ممتعة</small></button>').join("")+'</div>';
    panel.querySelector("#scienceBack").onclick=back;
    panel.querySelectorAll("[data-subject]").forEach(b=>b.onclick=()=>{subject=subjects.find(s=>s.id===b.dataset.subject);renderLessons()});
  }
  function renderLessons(){
    panel.innerHTML='<div class="quiz-top"><button id="scienceBack" class="back" type="button">→ العوالم</button><strong>'+subject.icon+' '+subject.title+'</strong><span>'+subject.lessons.length+' دروس</span></div><div class="science-grid">'+subject.lessons.map((lesson,i)=>'<button class="science-card" type="button" data-lesson="'+i+'"><span>'+lesson[1]+'</span><b>'+lesson[0]+'</b><small>اضغط للتعلم والاستماع</small></button>').join("")+'</div>';
    panel.querySelector("#scienceBack").onclick=renderSubjects;
    panel.querySelectorAll("[data-lesson]").forEach(b=>b.onclick=()=>renderLesson(Number(b.dataset.lesson)));
  }
  function renderLesson(index){
    const lesson=subject.lessons[index];
    panel.innerHTML='<div class="quiz-top"><button id="scienceBack" class="back" type="button">→ الدروس</button><strong>'+subject.title+'</strong><span>'+(index+1).toLocaleString("ar-EG")+' / '+subject.lessons.length+'</span></div><div class="science-lesson"><div class="science-emoji">'+lesson[1]+'</div><h2>'+lesson[0]+'</h2><p class="science-summary">'+lesson[2]+'</p><p class="science-detail">'+lesson[3]+'</p><button id="scienceListen" class="voice-button" type="button">🔊 اسمع الشرح</button><div class="science-nav"><button id="sciencePrev" class="secondary" type="button" '+(index===0?"disabled":"")+'>السابق</button><button id="scienceNext" class="primary" type="button">'+(index===subject.lessons.length-1?"اختار درساً آخر":"الدرس التالي")+' ←</button></div></div>';
    panel.querySelector("#scienceBack").onclick=renderLessons;
    panel.querySelector("#scienceListen").onclick=()=>speak(lesson[0]+". "+lesson[2]+" "+lesson[3]);
    panel.querySelector("#sciencePrev").onclick=()=>renderLesson(Math.max(0,index-1));
    panel.querySelector("#scienceNext").onclick=()=>index===subject.lessons.length-1?renderLessons():renderLesson(index+1);
  }
})();
