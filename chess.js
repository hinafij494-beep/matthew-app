// chess.js — «لعبة الشطرنج» للملك ماثيو (Round 3.2.1، ملاحظة ٣١):
// تعليم الشطرنج من الصفر لطفل كي جي ١ لا يقرأ بعد.
// المنهج قطعة قطعة، ببوابات نجوم (نفس نظام القصص والذاكرة)، والملك هو
// ماثيو نفسه — الملك الحامي. الخصم لطيف ومتعمَّد يخسر، ولا يوجد فشل أبداً:
// الخسارة تُقال «حاول تاني يا بطل» وتُعاد القطع، بلا شاشة فشل.
//
// البنية: محرك شطرنج صغير مكتفٍ بذاته (بلا أي اعتماد خارجي، يعمل دون
// إنترنت): رقعة ٨×٨، حركات قانونية لكل قطعة، أسر، كش/كش مات/جمود.
// الكش مات والجمود يُكتشفان على الرقعة الكاملة وعلى رقع المباريات
// الصغيرة. التبييت خارج النطاق تماماً لكي جي ١: لا يُعلَّم ولا يُنفَّذ
// ولا يُعرَض أبداً. الترقية: البيدق الذي يصل آخر صف يصبح وزيراً تلقائياً.
//
// الصوت: كل سطر منطوق له مقطع مسجل بصوت مس نانسي (CORPUS أدناه، ar_EG)؛
// الشرح كامل ووافٍ بالعامية المصرية — لا اختصار أبداً. الملف جزء من حزمة
// interactive-games.js (يُضاف لقائمة PARTS في build_bundle.py). بطاقته
// data-chess="1" داخل #gameList، مثل لعبة الذاكرة تماماً.
"use strict";
(function (root, factory) {
  const api = factory();
  root.MatthewChess = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {

  // ================= محرك الشطرنج (نقي، بلا DOM) =================
  // الصف ٠ = الصف الثامن (صف الأسود الخلفي)، الصف ٧ = الصف الأول.
  // القطعة: { t: "p"|"r"|"n"|"b"|"q"|"k", c: "w"|"b" }.
  const FILES = "abcdefgh";
  const inBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const squareName = (r, c) => FILES[c] + String(8 - r);
  const cloneBoard = board => board.map(row => row.map(p => (p ? { t: p.t, c: p.c } : null)));
  const emptyBoard = () => Array.from({ length: 8 }, () => Array(8).fill(null));
  const pieceAt = (board, r, c) => (inBoard(r, c) ? board[r][c] : null);
  const other = color => (color === "w" ? "b" : "w");
  const START_ROW = { w: 6, b: 1 };
  const LAST_ROW = { w: 0, b: 7 };

  function startPosition() {
    const b = emptyBoard();
    const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
    for (let c = 0; c < 8; c++) {
      b[0][c] = { t: back[c], c: "b" };
      b[1][c] = { t: "p", c: "b" };
      b[6][c] = { t: "p", c: "w" };
      b[7][c] = { t: back[c], c: "w" };
    }
    return b;
  }

  // رقعة سباق البيادق: ٤ بيادق بيضاء و٤ سوداء فقط.
  function setupPawnRace() {
    const b = emptyBoard();
    [1, 3, 4, 6].forEach(c => { b[1][c] = { t: "p", c: "b" }; b[6][c] = { t: "p", c: "w" }; });
    return b;
  }

  // رقعة مباراة البيادق + الطابيات الصغيرة: بيادق وطابية لكل لون.
  function setupMiniRooks() {
    const b = emptyBoard();
    [2, 3, 4, 5].forEach(c => { b[1][c] = { t: "p", c: "b" }; b[6][c] = { t: "p", c: "w" }; });
    b[0][0] = { t: "r", c: "b" }; b[0][7] = { t: "r", c: "b" };
    b[7][0] = { t: "r", c: "w" }; b[7][7] = { t: "r", c: "w" };
    b[0][4] = { t: "k", c: "b" }; b[7][4] = { t: "k", c: "w" };
    return b;
  }

  // رقعة لعبة «كُل الكوكيز»: قطعة ماثيو + كوكيز (بيادق سوداء لا تتحرك).
  function setupCookies(pieceType) {
    const b = emptyBoard();
    b[7][4] = { t: pieceType, c: "w" };
    return b;
  }

  // حركات شبه قانونية (قبل فلتر الكش) لقطعة في (r,c).
  function pseudoMoves(board, r, c) {
    const p = pieceAt(board, r, c);
    if (!p) return [];
    const out = [];
    const push = (nr, nc) => {
      if (!inBoard(nr, nc)) return false;
      const q = board[nr][nc];
      if (!q) { out.push({ r: nr, c: nc }); return true; }
      if (q.c !== p.c) out.push({ r: nr, c: nc });
      return false;
    };
    const slide = dirs => {
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (inBoard(nr, nc)) {
          const q = board[nr][nc];
          if (!q) out.push({ r: nr, c: nc });
          else { if (q.c !== p.c) out.push({ r: nr, c: nc }); break; }
          nr += dr; nc += dc;
        }
      }
    };
    if (p.t === "p") {
      const dir = p.c === "w" ? -1 : 1;
      if (!pieceAt(board, r + dir, c)) {
        out.push({ r: r + dir, c });
        if (r === START_ROW[p.c] && !pieceAt(board, r + 2 * dir, c)) out.push({ r: r + 2 * dir, c });
      }
      for (const dc of [-1, 1]) {
        const q = pieceAt(board, r + dir, c + dc);
        if (q && q.c !== p.c) out.push({ r: r + dir, c: c + dc });
      }
      // لا أخذ بالمرور (en passant): خارج منهج كي جي ١.
    } else if (p.t === "r") {
      slide([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    } else if (p.t === "b") {
      slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    } else if (p.t === "q") {
      slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
    } else if (p.t === "n") {
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) push(r + dr, c + dc);
    } else if (p.t === "k") {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr || dc) push(r + dr, c + dc);
      }
      // لا تبييت أبداً: الملك يتحرك مربعاً واحداً فقط (كي جي ١).
    }
    return out;
  }

  function findKing(board, color) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.t === "k" && p.c === color) return { r, c };
    }
    return null;
  }

  // هل المربع (r,c) مهدد من لون by؟ (يُستخدم لكشف الكش وفلترته)
  function isAttacked(board, r, c, by) {
    // بيادق
    const dir = by === "w" ? 1 : -1; // بيدق أبيض يهاجم من الصف الأعلى رقماً
    for (const dc of [-1, 1]) {
      const q = pieceAt(board, r + dir, c + dc);
      if (q && q.t === "p" && q.c === by) return true;
    }
    // حصان وملك
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
      const q = pieceAt(board, r + dr, c + dc);
      if (q && q.t === "n" && q.c === by) return true;
    }
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const q = pieceAt(board, r + dr, c + dc);
      if (q && q.t === "k" && q.c === by) return true;
    }
    // قطع منزلقة: طابية/وزير في الخطوط، فيل/وزير في الأقطار
    const rays = [
      [[1, 0], [-1, 0], [0, 1], [0, -1]], ["r", "q"],
      [[1, 1], [1, -1], [-1, 1], [-1, -1]], ["b", "q"]
    ];
    for (let i = 0; i < rays.length; i += 2) {
      for (const [dr, dc] of rays[i]) {
        let nr = r + dr, nc = c + dc;
        while (inBoard(nr, nc)) {
          const q = board[nr][nc];
          if (q) { if (q.c === by && rays[i + 1].includes(q.t)) return true; break; }
          nr += dr; nc += dc;
        }
      }
    }
    return false;
  }

  function inCheck(board, color) {
    const k = findKing(board, color);
    if (!k) return false; // رقع صغيرة بلا ملك: لا يوجد كش.
    return isAttacked(board, k.r, k.c, other(color));
  }

  // تنفيذ نقلة على نسخة جديدة (لا يعدّل الرقعة الأصلية). البيدق الذي يصل
  // آخر صف يصبح وزيراً تلقائياً (أقوى قطعة — أبسط قاعدة لكي جي ١).
  function applyMove(board, from, to) {
    const b = cloneBoard(board);
    const p = b[from.r][from.c];
    if (!p) return b;
    b[to.r][to.c] = p;
    b[from.r][from.c] = null;
    if (p.t === "p" && to.r === LAST_ROW[p.c]) b[to.r][to.c] = { t: "q", c: p.c };
    return b;
  }

  // الحركات القانونية الكاملة: شبه قانونية، مع استبعاد أي نقلة تترك ملك
  // صاحبها في كش (فقط عندما يوجد ملك على الرقعة).
  function legalMoves(board, r, c) {
    const p = pieceAt(board, r, c);
    if (!p) return [];
    const king = findKing(board, p.c);
    return pseudoMoves(board, r, c).filter(to => {
      if (!king) return true;
      return !inCheck(applyMove(board, { r, c }, to), p.c);
    });
  }

  function allLegalMoves(board, color) {
    const out = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.c === color) {
        for (const to of legalMoves(board, r, c)) out.push({ from: { r, c }, to });
      }
    }
    return out;
  }

  // حالة اللعبة لمن عليه الدور: كش مات / جمود (تعادل) / كش / مستمرة.
  function gameStatus(board, turn) {
    const moves = allLegalMoves(board, turn);
    if (moves.length === 0) return inCheck(board, turn) ? "checkmate" : "stalemate";
    return inCheck(board, turn) ? "check" : "ongoing";
  }

  // هل وصل أي بيدق من هذا اللون إلى آخر صف؟ (فوز سباق البيادق)
  // ملاحظة: البيدق الذي يصل آخر صف يترقّى لوزير في applyMove، فيُقبل أي
  // قطعة من لون المتسابق على آخر صف — في السباق لا توجد إلا البيادق.
  function raceWon(board, color) {
    const row = LAST_ROW[color];
    return board[row].some(p => p && p.c === color);
  }

  function countPieces(board, color) {
    let n = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.c === color) n++;
    }
    return n;
  }
  const cookiesLeft = board => countPieces(board, "b");

  // الخصم اللطيف: نقلة قانونية عشوائية (مع ميل خفيف للأسر نصف الوقت)،
  // بلا أي بحث أو تخطيط — متعمَّد يُغلَب. يقبل rand للحقن في الاختبارات.
  function gentleMove(board, color, rand) {
    const r = typeof rand === "function" ? rand : Math.random;
    const moves = allLegalMoves(board, color);
    if (!moves.length) return null;
    const captures = moves.filter(m => board[m.to.r][m.to.c]);
    if (captures.length && r() < 0.5) return captures[Math.floor(r() * captures.length)];
    return moves[Math.floor(r() * moves.length)];
  }

  // ================= المنهج: من الصفر، قطعة قطعة =================
  // عتبات النجوم سخية عن قصد (٢ نجمة بين درس ودرس): ماثيو يجمع النجوم
  // بسرعة من أي درس يخلّصه، فلا إحباط أبداً.
  const PICKER_LINE = "أنا مس نانسي وبحبك يا ماثيو! أهلاً بيك في لعبة الشطرنج يا ملك ماثيو! الشطرنج لعبة الملوك والأذكياء، وهنعلّمها سوا من الصفر، قطعة قطعة، بلعب وضحك! كل قطعة ليها حركة خاصة بيها، وهنلعب بيها لعبة صغيرة عشان تفهمها كويس! اختار أول درس ويلا بينا يا بطل!";
  const LOCKED_LINE = "مس نانسي بتقولك: لسه شوية يا بطل! العب الدرس اللي قبله واجمع نجوم، والدرس ده هيتفتح لك قريب! أنت تقدر يا ملك ماثيو!";
  const OPPONENT_LINE = "أنا صاحبك اللطيف، هلعب معاك بالقطع السودا! متخافش خالص، هنلعب سوا ونتعلم، ولو حصل أي حاجة هنحاول تاني يا بطل! أنت الملك ماثيو الشجاع!";
  const CHECK_LINE = "خد بالك يا ملك ماثيو! الملك بتاعك في خطر! دي اسمها كش، يعني في قطعة من العدو بتهدد الملك! متخافش، حرّك قطعة تحميه، أو حرّك الملك نفسه لمكان آمن! أنت الملك الحامي وبتعرف تحمي نفسك وأصحابك يا بطل!";
  const RETRY_LINE = "حاول تاني يا بطل! مفيش أي مشكلة خالص، كل الأبطال بيحاولوا تاني! هنرجّع القطع من الأول ونلعب تاني، وأنت هتكسب المرة دي يا ملك ماثيو!";
  const DRAW_LINE = "تعادل يا بطل! يعني محدش كسب ومحدش خسر، وانت لعبت لعبة جميلة أوي! مس نانسي فخورة بيك يا ملك ماثيو، خد نجمة والعب تاني لو حابب!";
  const PRAISE = [
    "برافو يا ملك ماثيو! شاطر خالص!",
    "يا سلام يا بطل ماثيو! حركة ذكية أوي!",
    "أحسنت يا ملك ماثيو! أنت بتلعب شطرنج زي الملوك!"
  ];
  const TRY_LINES = [
    "حاول تاني يا بطل",
    "قربت يا ملك ماثيو! جرّب مربع تاني!"
  ];
  const GREAT_MOVE = [
    "حركة جميلة أوي يا ملك ماثيو! أنت ذكي خالص!",
    "يا سلام! دي حركة ملك بجد يا بطل!"
  ];

  // كل درس: شرح كامل ووافٍ بالعامية المصرية يفهّم الطفل المعنى من الصفر،
  // مع أمثلة ولماذا يهم — لا اختصار أبداً (قاعدة الجودة الدائمة).
  const LESSONS = [
    {
      id: "board", title: "الرقعة", piece: null, stars: 0, kind: "board",
      icon: "board",
      desc: "اتعلّم الرقعة: مربعات فاتحة وغامقة، واعرف مكان كل قطعة",
      intro: "أنا مس نانسي وبحبك يا ماثيو! أول حاجة في الشطرنج هي الرقعة، يعني الملعب اللي هنلعب عليه! الرقعة دي مربع كبير متقسّم مربعات صغيرة، عدّهم معايا: تمانية في الطول وتمانية في العرض، يبقى كلهم أربعة وستين مربع! شايف الألوان؟ مربع فاتح ومربع غامق، مربع فاتح ومربع غامق، زي رقعة الشطرنج اللي في الكرتون! وكل مربع ليه لون ثابت، يعني المربع الغامق هيفضل غامق على طول، والفاتح هيفضل فاتح! والقطع بتقف على المربعات دي، وكل قطعة بتتحرك بطريقة معينة هنعرفها سوا! يلا نلعب لعبة: هدوس على مربعات وانت تقول لي لونها إيه!",
      lesson: "يا ملك ماثيو، الرقعة دي هي مملكة الشطرنج بتاعتك! تخيّلها زي مدينة صغيرة فيها شوارع، كل مربع فيها بيت صغير لقطعة من قطعك! المربعات الفاتحة لونها زي الرمل، والمربعات الغامقة لونها زي الشوكولاتة! وفيه قاعدة مهمة أوي: لما تحط الرقعة قدامك، المربع اللي على يمينك تحت لازم يكون فاتح، يعني لونه أبيض! دي قاعدة الملوك، احفظها! والقطع البيضا بتاعتك بتقف في الصفين اللي قريبين منك، والقطع السودا بتاعة صاحبك بتقف في الصفين البعيدين! وفي النص فيه أربع صفوف فاضية، دي أرض المعركة اللي القطع هتمشي فيها! ليه الرقعة مهمة؟ لأن كل حركة في الشطرنج معناها إن القطعة بتنتقل من مربع لمربع، ولو عرفت المربعات كويس، هتعرف تخطط وتكسب! يلا ندوّر على المربعات سوا!",
      question: "دوس على مربع غامق يا بطل!",
      question2: "برافو! دلوقتي دوس على مربع فاتح يا ملك ماثيو!",
      question3: "جميل أوي! آخر واحد: دوس على مربع في نص الرقعة!",
      win: "برافو يا ملك ماثيو! بقيت تعرف الرقعة كويس أوي! المربعات الفاتحة والغامقة بقوا أصحابك! خدت نجمة جديدة، ويلا نتعلّم أول قطعة: البيدق الشجاع!"
    },
    {
      id: "pawn", title: "البيدق", piece: "p", stars: 2, kind: "piece",
      icon: "pawn",
      desc: "الجندي الشجاع: بيمشي لقدام مربع واحد، وبياكل من الجنب",
      intro: "أنا مس نانسي وبحبك يا ماثيو! دي أول قطعة هنتعلّمها: البيدق! البيدق ده الجندي الصغير الشجاع بتاعك! هو أصغر قطعة في الشطرنج، بس شجاع أوي وبيحب يحمي الملك! عندك تمانية بيادق، واقفين صف واحد قدام كل القطع الكبيرة، زي الجنود اللي بيحموا القلعة! ولو البيدق وصل لآخر الرقعة، بيحصل له حاجة سحرية جميلة: بيكبر ويبقى وزير، أقوى قطعة في اللعبة! يلا نتعلّم بيمشي إزاي!",
      lesson: "يا ملك ماثيو، البيدق بيمشي لقدام بس، مربع واحد كل مرة، زي الجندي اللي بيمشي بخطوة واحدة لقدام! عمره ما بيرجع لورا أبداً، لأنه شجاع وبيتقدم على طول! وأول مرة بس يتحرك من مكانه، يقدر يمشي مربعين بدل مربع واحد، يعني نطة كبيرة في البداية! بس خد بالك: البيدق بياكل بطريقة مختلفة عن مشيه! هو بياكل القطعة اللي قدامه على الجنب، يعني بيمشي لقدام على طول، لكن لما ييجي ياكل، بياكل القطعة اللي واقفة قدامه يمين أو شمال على شكل حرف في! يعني لو فيه قطعة سودا واقفة قدامه على طول، البيدق مش هيقدر ياكلها، لازم تكون على الجنب! وليه البيدق مهم؟ لأنه بيحمي القطع الكبيرة وراه، وبيفتح الطريق ليهم، ولو وصل لآخر الرقعة بيبقى وزير! يعني الجندي الصغير ده ممكن يبقى أقوى واحد في اللعبة! يلا نلعب سباق البيادق ونشوف بيدقك هيوصل الأول ولا لأ!",
      question: "حرّك البيدق لقدام يا بطل! دوس على البيدق وبعدين دوس على المربع اللي قدامه!",
      win: "برافو يا ملك ماثيو! بقيت تعرف البيدق بيمشي إزاي وبياكل إزاي! الجندي الشجاع بقى صاحبك! خدت نجمة جديدة، ويلا نتعلّم الطابية القوية!"
    },
    {
      id: "rook", title: "الطابية", piece: "r", stars: 4, kind: "piece",
      icon: "rook",
      desc: "برج القلعة: بتمشي في خط مستقيم، يمين وشمال وقدام وورا",
      intro: "أنا مس نانسي وبحبك يا ماثيو! دي الطابية! شايف شكلها؟ دي زي برج القلعة الكبير اللي بيحمي المملكة! الطابية قوية أوي، وبتمشي في خط مستقيم، يعني زي العربية اللي بتمشي في الشارع على طول، يمين أو شمال، وقدام أو ورا! عندك طابيتين، واحدة في كل ركن من أركان الرقعة، زي برجين بيحرسوا القلعة من الناحيتين! يلا نتعلّم بتمشي إزاي!",
      lesson: "يا ملك ماثيو، الطابية بتمشي في خط مستقيم بس، يعني تقدر تمشي قدّام كام مربع زي ما انت عايز، أو ترجع لورا، أو تمشي يمين أو شمال، المهم تمشي على طول في نفس الصف أو نفس العمود، زي العربية اللي بتمشي في شارع مستقيم! بس خد بالك: الطابية مش بتقدر تنط فوق أي قطعة! لو فيه قطعة واقفة في طريقها، لازم تقف قبلها، أو تاكلها لو كانت من قطع العدو! ولو القطعة اللي في طريقها من قطعك انت، يبقى الطابية لازم تقف قبلها خالص! ليه الطابية مهمة؟ لأنها قوية وبتوصل لأي مكان في الرقعة بسرعة، وبتحمي الملك من بعيد، وبتاكل قطع العدو من مسافة كبيرة! والطابية مع الملك بيعملوا فريق قوي أوي في آخر اللعبة! يلا حرّك الطابية في الخط المستقيم وكل الكوكيز!",
      question: "حرّك الطابية في خط مستقيم يا بطل! دوس عليها وبعدين دوس على مربع في نفس الصف أو نفس العمود!",
      win: "برافو يا ملك ماثيو! بقيت تعرف الطابية بتمشي في خط مستقيم! برج القلعة بقى صاحبك! خدت نجمة جديدة، ويلا نتعلّم الفيل الذكي!"
    },
    {
      id: "bishop", title: "الفيل", piece: "b", stars: 6, kind: "piece",
      icon: "bishop",
      desc: "بيمشي على الوتر: خط مايل، وبيفضل على نفس لون مربعه",
      intro: "أنا مس نانسي وبحبك يا ماثيو! ده الفيل! شايف القبعة المدببة اللي لابسها؟ الفيل ده ذكي أوي وبيحب يمشي على الوتر، يعني في خط مايل! عندك فيلين، واحد واقف على مربع فاتح والتاني واقف على مربع غامق، وكل واحد فيهم هيفضل على لون مربعه على طول، مش هيغيّر لونه أبداً! يلا نتعلّم بيمشي إزاي!",
      lesson: "يا ملك ماثيو، الفيل بيمشي على الوتر بس، يعني في خط مايل، زي اللي بيمشي على سلم مايل! يقدر يمشي كام مربع زي ما انت عايز في الاتجاه المايل، يمين قدام أو شمال قدام، أو يمين ورا أو شمال ورا! بس خد بالك من حاجة جميلة: الفيل اللي واقف على مربع فاتح هيفضل يمشي على المربعات الفاتحة بس طول اللعبة، والفيل اللي واقف على مربع غامق هيفضل على المربعات الغامقة بس! يعني كل فيل ليه لون خاص بيه! والفيل برضه مش بينط فوق القطع، لازم طريقه يكون فاضي! ليه الفيل مهم؟ لأنه بيوصل لأماكن بعيدة في الرقعة بسرعة، وبيهاجم من بعيد على الوتر، وبيحمي الملك من الجنب! ولما الفيلين يشتغلوا سوا، واحد على الفاتح وواحد على الغامق، بيغطوا كل الرقعة! يلا حرّك الفيل على الوتر وكل الكوكيز!",
      question: "حرّك الفيل على الوتر يا بطل! دوس عليه وبعدين دوس على مربع مايل عنه!",
      win: "برافو يا ملك ماثيو! بقيت تعرف الفيل بيمشي على الوتر! الفيل الذكي بقى صاحبك! خدت نجمة جديدة، ويلا نتعلّم الوزير، أقوى قطعة!"
    },
    {
      id: "queen", title: "الوزير", piece: "q", stars: 8, kind: "piece",
      icon: "queen",
      desc: "أقوى قطعة: بتمشي مستقيم ومايل، في كل الاتجاهات",
      intro: "أنا مس نانسي وبحبك يا ماثيو! دي الوزير! شايفة التاج الجميل اللي لابساه؟ الوزير دي أقوى قطعة في الشطرنج كله! هي الملكة اللي بتحمي الملك ماثيو وبتساعده! الوزير بتقدر تعمل كل حاجة: تمشي زي الطابية في خط مستقيم، وتمشي زي الفيل على الوتر! يعني بتتحرك في كل الاتجاهات! يلا نتعلّم بتمشي إزاي!",
      lesson: "يا ملك ماثيو، الوزير أقوى قطعة في اللعبة، لأنها بتجمع قوة الطابية وقوة الفيل مع بعض! يعني الوزير تقدر تمشي قدّام وورا ويمين وشمال زي الطابية، وكمان تقدر تمشي على الوتر زي الفيل، في كل الاتجاهات، وكام مربع زي ما انت عايز! يعني الوزير تقدر توصل لأي مكان في الرقعة بسرعة أوي! بس خد بالك: الوزير قوية وغالية أوي، يعني لازم تحافظ عليها كويس، ومتحطهاش في مكان تقدر قطعة من العدو تاكلها ببلاش! والوزير برضه مش بتنط فوق القطع، لازم طريقها يكون فاضي! ليه الوزير مهمة؟ لأنها بتهاجم من بعيد ومن قريب، وبتحمي الملك، وبتاكل قطع العدو، ولو خسرتها هيبقى صعب تكسب! فالعب بيها بذكاء يا ملك ماثيو، واستخدم قوتها في الوقت الصح! يلا حرّك الوزير وكل الكوكيز!",
      question: "حرّك الوزير يا بطل! دوس عليها وبعدين دوس على أي مربع في خط مستقيم أو على الوتر!",
      win: "برافو يا ملك ماثيو! بقيت تعرف الوزير، أقوى قطعة في اللعبة! الملكة القوية بقت صاحبتك! خدت نجمة جديدة، ويلا نتعلّم الملك، وانت الملك نفسه!"
    },
    {
      id: "king", title: "الملك ماثيو", piece: "k", stars: 10, kind: "piece",
      icon: "king",
      desc: "ده انت يا ملك ماثيو! بيمشي مربع واحد في أي اتجاه، ولازم تحميه",
      intro: "أنا مس نانسي وبحبك يا ماثيو! ده الملك! وده انت يا ملك ماثيو! شايف التاج الدهبي؟ ده تاجك انت، والملك ده هو أهم قطعة في اللعبة كلها! كل القطع التانية موجودة عشان تحمي الملك، ولو الملك اتحاصر ومبقاش ليه أي مكان يهرب له، اللعبة بتخلص! يلا نتعلّم الملك بيمشي إزاي!",
      lesson: "يا ملك ماثيو، انت الملك! الملك بيمشي مربع واحد بس كل مرة، بس يقدر يمشي في أي اتجاه: قدّام أو ورا، يمين أو شمال، أو على الوتر! يعني الملك بيمشي خطوة واحدة صغيرة، زي الملك اللي بيمشي بهدوء في قصره! بس خد بالك من أهم قاعدة في الشطرنج: الملك هو أهم قطعة، وكل اللعبة بتدور حوالين حمايته! لو قطعة من العدو هددت الملك، دي اسمها كش، ولازم تحمي الملك فوراً: يا إما تحرّك الملك لمكان آمن، يا إما تحط قطعة تحميه، يا إما تاكل القطعة اللي بتهدده! ولو الملك اتحاصر ومبقاش فيه أي حل، دي اسمها كش مات، واللعبة بتخلص! عشان كده انت الملك الحامي يا ماثيو: بتحمي نفسك، وبتحمي أخوك مارك ومريم، وكل قطعك بتحميك! يلا حرّك الملك خطوة واحدة وحافظ عليه!",
      question: "حرّك الملك يا بطل! دوس عليه وبعدين دوس على أي مربع جنبه على طول!",
      win: "برافو يا ملك ماثيو! بقيت تعرف الملك بيمشي إزاي، وإنك لازم تحميه! انت الملك الحامي الشجاع! خدت نجمة جديدة، ويلا نتعلّم الحصان اللي بينط!"
    },
    {
      id: "knight", title: "الحصان", piece: "n", stars: 12, kind: "piece",
      icon: "knight",
      desc: "بينط على شكل حرف إل: مربعين في اتجاه ومربع على الجنب",
      intro: "أنا مس نانسي وبحبك يا ماثيو! ده الحصان! شايف شكله؟ ده الحصان بتاعك اللي بتركبه في مغامراتك! الحصان ده مميز أوي، لأنه القطعة الوحيدة اللي بتقدر تنط فوق القطع التانية! حركته غريبة وجميلة: بينط على شكل حرف إل، يعني مربعين في اتجاه ومربع واحد على الجنب! يلا نتعلّم بينط إزاي!",
      lesson: "يا ملك ماثيو، الحصان بينط على شكل حرف إل! يعني بيمشي مربعين في اتجاه واحد، وبعدين مربع واحد على الجنب! مثلاً: مربعين لقدام ومربع واحد يمين، أو مربعين يمين ومربع واحد لقدام! جرّب تعدّ معايا: واحد، اتنين لقدام، وواحد على الجنب، نط! والحاجة الجميلة أوي في الحصان إنه بينط فوق أي قطعة في طريقه، يعني لو فيه قطعة واقفة قدامه، الحصان بينط من فوقها ولا يهمه! هو القطعة الوحيدة اللي بتعمل كده! ليه الحصان مهم؟ لأنه بيقدر يوصل لأماكن القطع التانية مش بتقدر توصلها، وبيفاجئ العدو بنطته، وبيهاجم من فوق القطع! عشان كده الحصان صعب أوي يتوقع حركته! يلا خلّي الحصان ينط نطته الجميلة وكل الكوكيز!",
      question: "خلّي الحصان ينط يا بطل! دوس عليه وبعدين دوس على مربع على شكل حرف إل!",
      win: "برافو يا ملك ماثيو! بقيت تعرف الحصان بينط إزاي على شكل حرف إل! الحصان بتاعك بقى صاحبك! خدت نجمة جديدة، ويلا نلعب لعبة أكل الكوكيز!"
    },
    {
      id: "cookies", title: "كُل الكوكيز", piece: null, stars: 14, kind: "cookies",
      icon: "cookies",
      desc: "اختار القطعة الصح وكل كل الكوكيز اللي على الرقعة",
      intro: "أنا مس نانسي وبحبك يا ماثيو! دي لعبة كُل الكوكيز! شايف الكوكيز اللذيذة اللي على الرقعة؟ كل كوكي واقف في مكان، وانت لازم تختار القطعة الصح اللي تقدر توصله وتاكله! كل قطعة بتتحرك بطريقة مختلفة، ففكّر كويس: مين اللي يقدر يوصل للكوكي ده؟ الطابية ولا الفيل ولا الحصان؟ دوس على القطعة وبعدين دوس على الكوكي، وكلهم يا بطل!",
      lesson: "يا ملك ماثيو، في اللعبة دي هنلعب بكل القطع اللي اتعلّمناها سوا! الكوكيز واقفة على الرقعة، وكل كوكي محتاج قطعة معينة توصله! الطابية بتوصل في خط مستقيم، والفيل بيوصل على الوتر، والحصان بينط نطة حرف الإل، والوزير بتوصل من أي مكان، والبيدق بياكل من الجنب! فقبل ما تحرّك أي قطعة، بص على الكوكي واسأل نفسك: القطعة دي تقدر توصله ولا لأ؟ ولو اخترت القطعة الغلط، مفيش أي مشكلة، جرّب قطعة تانية! دي لعبة ذكاء وتفكير، وكل مرة هتبقى أذكى من اللي قبلها! وكل كوكي تاكله هتاخد نجمة، ولو كلت كل الكوكيز هتاخد ألماسة لتاجك!",
      question: "اختار قطعة وكل الكوكي يا بطل! دوس على القطعة وبعدين دوس على الكوكي!",
      win: "برافو يا ملك ماثيو! كلت كل الكوكيز! بقيت تعرف كل قطعة بتوصل لفين! خدت ألماسة جديدة لتاجك، ويلا نلعب أول مباراة حقيقية: سباق البيادق!"
    },
    {
      id: "race", title: "سباق البيادق", piece: "p", stars: 16, kind: "race",
      icon: "race",
      desc: "مين بيدقه يوصل لآخر الرقعة الأول: انت ولا صاحبك اللطيف؟",
      intro: "أنا مس نانسي وبحبك يا ماثيو! دي أول مباراة حقيقية ليك: سباق البيادق! عندك أربع بيادق بيضا، وصاحبك اللطيف عنده أربع بيادق سودا! اللي بيدقه يوصل لآخر الرقعة الأول هو اللي يكسب السباق! فكّر كويس: هتحرّك أنهي بيدق؟ البيدق اللي قدامك فاضي؟ ولا فيه بيدق أسود هياكله من الجنب؟ يلا يا بطل، السباق بدأ!",
      lesson: "يا ملك ماثيو، سباق البيادق دي أول مباراة شطرنج كاملة تلعبها! القاعدة بسيطة: كل واحد في دوره بيحرّك بيدق واحد بس، مربع واحد لقدام، وأول مرة ممكن مربعين! ولو بيدقك وقف قدام بيدق أسود على الجنب، تقدر تاكله! واللي يوصل بيدقه لآخر الرقعة الأول يكسب! ليه السباق ده مهم؟ لأنه بيعلّمك تفكّر قبل ما تحرّك: لو حرّكت البيدق ده، البيدق الأسود هياكله ولا لأ؟ ولو سيبت البيدق ده هنا، هيوصل الأول ولا البيدق التاني أسرع؟ وبيعلّمك كمان إن البيدق الصغير ممكن يكسب لو فكّر كويس! وصاحبك اللطيف بيلعب معاك بلطف، فمتخافش، ولو خسرت السباق هنحاول تاني يا بطل!",
      question: "دورك يا ملك ماثيو! حرّك بيدق من بيادقك لقدام!",
      win: "برافو يا ملك ماثيو! بيدقك وصل لآخر الرقعة الأول وكسب السباق! انت بطل السباق! خدت نجمة جديدة، ويلا نلعب مباراة أكبر: بيادق وطابيات!"
    },
    {
      id: "match_rooks", title: "مباراة البيادق والطابيات", piece: null, stars: 18, kind: "match",
      icon: "match",
      desc: "مباراة صغيرة ببيادق وطابيات ضد صاحبك اللطيف",
      intro: "أنا مس نانسي وبحبك يا ماثيو! دي مباراة أكبر شوية: بيادق وطابيات! عندك أربع بيادق وطابيتين وملك، وصاحبك اللطيف عنده زيهم بالظبط! اللي ياكل كل قطع التاني، أو يعمل كش مات للملك، هو اللي يكسب! فكّر قبل كل حركة، واحمي ملكك كويس يا ملك ماثيو الحامي!",
      lesson: "يا ملك ماثيو، في المباراة دي هنلعب بقطع أكتر: البيادق بتمشي لقدام وبتاكل من الجنب، والطابيات بتمشي في خط مستقيم وبتاكل من بعيد، والملك بيمشي خطوة واحدة ولازم تحميه! والقاعدة الجديدة هنا هي الكش مات: لو ملكك اتهدد ومبقاش ليه أي مكان يهرب له، اللعبة بتخلص! ولو أكلت كل قطع صاحبك، برضه تكسب! ليه المباراة دي مهمة؟ لأنها بيعلّمك تلعب بقطع مختلفة سوا: البيادق تحمي الطابيات، والطابيات تحمي البيادق، وكلهم يحموا الملك! وبيعلّمك تخطط خطوتين لقدام: لو حرّكت الطابية هنا، صاحبك هيعمل إيه؟ فكّر كويس يا بطل، وانت تقدر تكسب!",
      question: "دورك يا ملك ماثيو! حرّك قطعة من قطعك!",
      win: "برافو يا ملك ماثيو! كسبت مباراة البيادق والطابيات! بقيت بتلعب شطرنج بجد! خدت نجمة جديدة، ويلا نلعب اللعبة الكاملة!"
    },
    {
      id: "full", title: "اللعبة الكاملة", piece: null, stars: 20, kind: "full",
      icon: "full",
      desc: "لعبة شطرنج كاملة بكل القطع ضد صاحبك اللطيف",
      intro: "أنا مس نانسي وبحبك يا ماثيو! وصلنا للعبة الكاملة! دي لعبة شطرنج حقيقية بكل القطع: بيادق وطابيات وفيلة ووزير وحصانين والملك، يعني انت! هتلعب بالقطع البيضا، وصاحبك اللطيف هيلعب بالقطع السودا! اللي يعمل كش مات لملك التاني يكسب، ولو محدش قدر يعمل كش مات والملك اتحاصر من غير كش، يبقى تعادل يا بطل! يلا يا ملك ماثيو، دي مملكتك!",
      lesson: "يا ملك ماثيو، اللعبة الكاملة هي كل اللي اتعلّمناه سوا في لعبة واحدة! في الأول، حرّك البيادق عشان تفتح الطريق للقطع الكبيرة، وبعدين طلّع الفيلة والحصانين، وبعدين حرّك الوزير بحرص، وخلي الملك في مكان آمن ورا البيادق! وكل حركة فكّر فيها: القطعة دي هتروح فين؟ وهل فيه قطعة من العدو هتاكلها؟ وهل الملك بتاعي في أمان؟ ولو ملك صاحبك اتهدد، دي كش، ولو اتحاصر من غير أي حل، دي كش مات وانت تكسب! ولو اللعبة خلصت تعادل، دي برضه نتيجة جميلة، لأنك لعبت لعبة كاملة زي الملوك! أهم حاجة إنك تستمتع وتفكّر، ومس نانسي فخورة بيك أوي يا ملك ماثيو!",
      question: "دورك يا ملك ماثيو! حرّك قطعة من قطعك!",
      win: "برافو يا ملك ماثيو! خلّصت لعبة شطرنج كاملة! انت بطل الشطرنج الحقيقي! خدت ألماسة جديدة لتاجك، ومس نانسي فخورة بيك أوي! العب تاني كل ما تحب يا ملك!"
    }
  ];

  // ================= CORPUS: كل سطر منطوق له مقطع مسجل (ar_EG) =================
  // نمط stories.js: مفتاح ثابت + النص الكامل + اللغة، ليضيفها المنسّق إلى
  // build-corpus.js ويولّد الصوت. لا يُولَّد صوت هنا أبداً.
  const CORPUS = [];
  const addClip = (key, text) => CORPUS.push({ key, text, lang: "ar_EG" });
  addClip("chess_intro", PICKER_LINE);
  addClip("chess_locked", LOCKED_LINE);
  addClip("chess_opponent", OPPONENT_LINE);
  addClip("chess_check", CHECK_LINE);
  addClip("chess_retry", RETRY_LINE);
  addClip("chess_draw", DRAW_LINE);
  PRAISE.forEach((t, i) => addClip("chess_praise_" + (i + 1), t));
  TRY_LINES.forEach((t, i) => addClip("chess_try_" + (i + 1), t));
  GREAT_MOVE.forEach((t, i) => addClip("chess_great_" + (i + 1), t));
  for (const l of LESSONS) {
    addClip("chess_" + l.id + "_intro", l.intro);
    addClip("chess_" + l.id + "_lesson", l.lesson);
    addClip("chess_" + l.id + "_question", l.question);
    if (l.question2) addClip("chess_" + l.id + "_question2", l.question2);
    if (l.question3) addClip("chess_" + l.id + "_question3", l.question3);
    addClip("chess_" + l.id + "_win", l.win);
  }
  // كل سطر منطوق في الوحدة (لاختبار التغطية الكاملة):
  function spokenStrings() {
    const out = [PICKER_LINE, LOCKED_LINE, OPPONENT_LINE, CHECK_LINE, RETRY_LINE, DRAW_LINE,
      ...PRAISE, ...TRY_LINES, ...GREAT_MOVE];
    for (const l of LESSONS) {
      out.push(l.intro, l.lesson, l.question);
      if (l.question2) out.push(l.question2);
      if (l.question3) out.push(l.question3);
      out.push(l.win);
    }
    return out;
  }

  // ================= نجوم وبوابات (نفس نظام القصص) =================
  function starTotal(store) {
    const s = store || (typeof localStorage !== "undefined" ? localStorage : null);
    let total = 0;
    if (s) {
      try { total = Math.max(total, Number(s.getItem("matthewStars") || 0) || 0); } catch (_) {}
      try {
        const crown = JSON.parse(s.getItem("matthewCrownV1") || "{}");
        total = Math.max(total, Number(crown.stars) || 0);
      } catch (_) {}
    }
    return total;
  }
  function isUnlocked(lesson, total) {
    const t = typeof total === "number" ? total : starTotal();
    return t >= (lesson.stars || 0);
  }
  const arabicDigits = value => String(value).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

  // ================= قطع مرسومة SVG (لا إيموجي للقطع أبداً) =================
  // الملك هو ماثيو نفسه: تاج دهبي + وجه مبتسم (عنصر hero-face مستقل،
  // مثل stories.js، ليتبدل بصورة ماثيو الحقيقية لاحقاً إن أرسلها المستخدم).
  function pieceSVG(type, color) {
    const w = color === "w";
    const body = w ? "#fff7e0" : "#4a2f6b";
    const edge = w ? "#b8860b" : "#241a4d";
    const gold = "#ffb340";
    const dark = "#4a2f14";
    const open = '<svg viewBox="0 0 64 64" class="chess-piece-svg chess-' + type + '" aria-hidden="true">';
    const base = '<ellipse cx="32" cy="56" rx="20" ry="4" fill="#00000022"/>';
    if (type === "p") return open + base +
      '<circle cx="32" cy="18" r="9" fill="' + body + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<path d="M24 30 q8 -6 16 0 l4 18 q-12 6 -24 0 Z" fill="' + body + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<rect x="18" y="50" width="28" height="6" rx="3" fill="' + gold + '" stroke="' + edge + '" stroke-width="2"/></svg>';
    if (type === "r") return open + base +
      '<path d="M20 14 h6 v6 h4 v-6 h4 v6 h4 v-6 h6 v14 h-24 Z" fill="' + body + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<rect x="23" y="28" width="18" height="22" rx="3" fill="' + body + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<rect x="18" y="50" width="28" height="6" rx="3" fill="' + gold + '" stroke="' + edge + '" stroke-width="2"/></svg>';
    if (type === "b") return open + base +
      '<path d="M32 8 q10 12 8 20 q-2 8 -8 8 q-6 0 -8 -8 q-2 -8 8 -20 Z" fill="' + body + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<circle cx="32" cy="20" r="2.5" fill="' + gold + '"/>' +
      '<path d="M24 38 q8 -6 16 0 l3 12 q-11 5 -22 0 Z" fill="' + body + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<rect x="18" y="50" width="28" height="6" rx="3" fill="' + gold + '" stroke="' + edge + '" stroke-width="2"/></svg>';
    if (type === "q") return open + base +
      '<path d="M18 22 L22 10 L28 18 L32 8 L36 18 L42 10 L46 22 Z" fill="' + gold + '" stroke="' + edge + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="22" cy="9" r="2.5" fill="' + gold + '" stroke="' + edge + '" stroke-width="1.5"/>' +
      '<circle cx="32" cy="7" r="2.5" fill="' + gold + '" stroke="' + edge + '" stroke-width="1.5"/>' +
      '<circle cx="42" cy="9" r="2.5" fill="' + gold + '" stroke="' + edge + '" stroke-width="1.5"/>' +
      '<path d="M22 26 q10 -6 20 0 l3 22 q-13 6 -26 0 Z" fill="' + body + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<rect x="18" y="50" width="28" height="6" rx="3" fill="' + gold + '" stroke="' + edge + '" stroke-width="2"/></svg>';
    if (type === "k") return open + base +
      '<path d="M22 20 L25 8 L30 15 L32 6 L34 15 L39 8 L42 20 Z" fill="' + gold + '" stroke="#e08e00" stroke-width="2" stroke-linejoin="round"/>' +
      '<g class="hero-face"><circle cx="32" cy="28" r="11" fill="#ffd9b3" stroke="' + edge + '" stroke-width="1.5"/>' +
      '<circle cx="28" cy="27" r="1.8" fill="' + dark + '"/><circle cx="36" cy="27" r="1.8" fill="' + dark + '"/>' +
      '<path d="M28 33 q4 4 8 0" stroke="#b5651d" stroke-width="2" fill="none" stroke-linecap="round"/></g>' +
      '<path d="M22 40 q10 -5 20 0 l3 10 q-13 5 -26 0 Z" fill="#5b3cc4" stroke="' + edge + '" stroke-width="2"/>' +
      '<rect x="18" y="50" width="28" height="6" rx="3" fill="' + gold + '" stroke="' + edge + '" stroke-width="2"/></svg>';
    if (type === "n") return open + base +
      '<path d="M22 52 L20 34 q-2 -12 8 -20 q4 -3 8 -2 l4 -4 l2 6 q10 2 12 12 q1 8 -4 12 l-4 14 Z" fill="' + body + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<path d="M28 12 l-2 -6 l6 4 Z" fill="' + body + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<circle cx="36" cy="22" r="2" fill="' + dark + '"/>' +
      '<path d="M24 34 q8 4 16 0" stroke="' + edge + '" stroke-width="2" fill="none"/>' +
      '<rect x="18" y="50" width="28" height="6" rx="3" fill="' + gold + '" stroke="' + edge + '" stroke-width="2"/></svg>';
    return open + base + "</svg>";
  }
  // أيقونة البطاقة في قائمة الألعاب: حصان مرسوم (بلا إيموجي).
  function cardIconSVG() {
    return '<svg viewBox="0 0 64 64" class="chess-card-icon" aria-hidden="true">' +
      '<path d="M22 52 L20 34 q-2 -12 8 -20 q4 -3 8 -2 l4 -4 l2 6 q10 2 12 12 q1 8 -4 12 l-4 14 Z" fill="#fff7e0" stroke="#7c4a21" stroke-width="2"/>' +
      '<circle cx="36" cy="22" r="2" fill="#4a2f14"/></svg>';
  }

  // ================= HTML نقي (يُختبَر بلا DOM) =================
  function menuHTML(total) {
    return '<div class="chess-stars-line">معاك ⭐ ' + arabicDigits(total) + ' نجمة — اجمع نجوم من الدروس والألعاب عشان تفتح دروس جديدة!</div>' +
      '<div class="science-grid chess-grid">' + LESSONS.map(l => {
        const open = isUnlocked(l, total);
        const need = Math.max(0, (l.stars || 0) - total);
        const icon = l.piece ? pieceSVG(l.piece, "w") : (l.id === "board" ? '<span class="chess-board-mini">▦</span>' : l.id === "race" ? pieceSVG("p", "w") : l.id === "match_rooks" ? pieceSVG("r", "w") : l.id === "full" ? pieceSVG("k", "w") : '<span class="chess-menu-emoji">🍪</span>');
        return '<button type="button" class="science-card chess-card' + (open ? "" : " chess-locked") + '" data-chess-lesson="' + l.id + '">' +
          '<span class="chess-menu-icon">' + (open ? icon : "🔒") + '</span><b>' + l.title + '</b>' +
          '<small>' + l.desc + '</small>' +
          (open
            ? '<small class="chess-open-hint">يلا نتعلّم ←</small>'
            : '<small class="chess-lock-hint">🔒 محتاج ' + arabicDigits(need) + ' نجمة كمان — معاك ' + arabicDigits(total) + ' نجمة، قرّبت يا بطل!</small>') +
          '</button>';
      }).join("") + '</div>';
  }

  // رقعة كأزرار: كل مربع زر ≥ ٤٤ بكسل، مع النقاط القانونية اختيارياً.
  function boardHTML(board, opts) {
    const o = opts || {};
    const dots = o.dots || {};
    const selected = o.selected || null;
    const target = o.target || null;
    const lastMove = o.lastMove || null;
    let html = '<div class="chess-board" role="grid" aria-label="رقعة الشطرنج">';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const light = (r + c) % 2 === 0;
        const key = r + "-" + c;
        const p = board[r][c];
        const isSel = selected && selected.r === r && selected.c === c;
        const isDot = !!dots[key];
        const isTarget = target && target.r === r && target.c === c;
        const isLast = lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c));
        const isCookie = p && p.t === "p" && p.c === "b" && o.cookies;
        html += '<button type="button" role="gridcell" class="chess-sq' + (light ? " light" : " dark") +
          (isSel ? " selected" : "") + (isDot ? " dot" : "") + (isTarget ? " target" : "") + (isLast ? " last" : "") +
          '" data-r="' + r + '" data-c="' + c + '" aria-label="مربع ' + (light ? "فاتح" : "غامق") + '">' +
          (p ? (isCookie ? '<span class="chess-cookie" aria-hidden="true">🍪</span>' : pieceSVG(p.t, p.c)) : "") +
          "</button>";
      }
    }
    return html + "</div>";
  }

  // ================= واجهة اللعب (متصفح فقط) =================
  let openFn = null; // تُضبط داخل كتلة DOM، ويُصدَّر open عبر api أدناه.
  if (typeof document !== "undefined") {
    const main = document.querySelector("main");
    const gameList = document.getElementById("gameList");
    if (main && gameList) {
      if (!document.getElementById("chessStyle")) {
        const style = document.createElement("style");
        style.id = "chessStyle";
        style.textContent =
          ".chess-board{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px;margin:14px auto;max-width:480px;background:#7c4a21;padding:6px;border-radius:14px;box-shadow:0 6px 18px #30205b22}" +
          ".chess-sq{position:relative;border:0;padding:0;cursor:pointer;aspect-ratio:1;min-width:44px;min-height:44px;display:grid;place-items:center}" +
          ".chess-sq.light{background:#f0d9b5}.chess-sq.dark{background:#b58863}" +
          ".chess-sq.selected{outline:4px solid #ffb340;outline-offset:-4px}" +
          ".chess-sq.last{background:#e8c85a!important}" +
          ".chess-sq.dot::after{content:'';position:absolute;width:34%;height:34%;border-radius:50%;background:#30b978cc;pointer-events:none}" +
          ".chess-sq.target{outline:4px solid #30b978;outline-offset:-4px;animation:chessPulse 1s infinite}" +
          "@keyframes chessPulse{0%,100%{outline-color:#30b978}50%{outline-color:#ffd94d}}" +
          ".chess-piece-svg{width:88%;height:88%;filter:drop-shadow(0 2px 2px #0003)}" +
          ".chess-piece-svg.chess-n{animation:chessHop 1.6s ease-in-out infinite}" +
          "@keyframes chessHop{0%,100%{transform:translateY(0)}50%{transform:translateY(-18%)}}" +
          ".chess-cookie{font-size:30px;animation:chessPulse 1.2s infinite}" +
          ".chess-hero{display:grid;place-items:center;margin:8px auto}" +
          ".chess-hero .chess-piece-svg{width:120px;height:120px}" +
          ".chess-lesson-text{background:#fff7e0;border:2px solid #ffd94d;border-radius:16px;padding:14px 16px;line-height:1.9;font-size:17px;margin:12px 0}" +
          ".chess-grid .chess-card .chess-menu-icon{display:grid;place-items:center;min-height:64px}" +
          ".chess-grid .chess-card .chess-menu-icon .chess-piece-svg{width:64px;height:64px}" +
          ".chess-grid .chess-card .chess-menu-icon .chess-board-mini{font-size:52px}" +
          ".chess-grid .chess-card .chess-menu-icon .chess-menu-emoji{font-size:52px}" +
          ".chess-card.chess-locked{opacity:.75}" +
          ".chess-stars-line{text-align:center;font-weight:700;margin:8px 0}" +
          ".chess-msg{text-align:center;min-height:1.6em;font-weight:700}" +
          ".chess-turn{text-align:center;font-size:18px;font-weight:700}" +
          ".chess-win{text-align:center;padding:10px}" +
          ".chess-win .result-stars{font-size:34px}" +
          ".chess-card-icon{width:34px;height:34px;vertical-align:middle}" +
          "@media(max-width:360px){.chess-sq{min-width:36px;min-height:36px}.chess-cookie{font-size:22px}}";
        document.head.appendChild(style);
      }

      const speak = (text, key) => {
        try { if (key && window.MatthewClips && window.MatthewClips.playKey(key)) return; } catch (_) {}
        window.MatthewVoice?.speak(text, "ar-EG");
      };
      const speakSeq = list => {
        if (window.MatthewVoice?.speakSequence) window.MatthewVoice?.speakSequence(list, "ar-EG");
        else window.MatthewVoice?.speak(list.join("، "), "ar-EG");
      };
      const recordStar = skill => { try { window.MatthewMastery?.record(skill, true); } catch (_) {} };
      const addStars = n => {
        try {
          const old = Number(localStorage.getItem("matthewStars") || 0);
          localStorage.setItem("matthewStars", old + n);
        } catch (_) {}
        if (typeof updateStats === "function") { try { updateStats(); } catch (_) {} }
      };

      const panel = document.createElement("section");
      panel.id = "chessPanel";
      panel.className = "quiz-panel hidden";
      panel.setAttribute("aria-live", "polite");
      panel.innerHTML =
        '<div class="quiz-top"><button id="chessBack" class="back" type="button">→ رجوع</button><strong>♞ لعبة الشطرنج</strong><span id="chessProgress"></span></div>' +
        '<div id="chessBody"></div>';
      main.insertBefore(panel, document.querySelector("footer"));
      const $ = id => panel.querySelector("#" + id);
      const body = () => $("chessBody");

      const card = document.createElement("button");
      card.type = "button";
      card.className = "game-card gold";
      card.setAttribute("data-chess", "1");
      card.innerHTML = '<span class="game-icon">' + cardIconSVG() + '</span><strong>لعبة الشطرنج</strong><small>اتعلّم الشطرنج من الصفر، قطعة قطعة، والعب مع صاحبك اللطيف</small><span class="play">يلا نلعب ←</span>';
      gameList.append(card);

      let lesson = null;          // الدرس الحالي
      let mode = "menu";          // menu | lesson | game
      let board = null, turn = "w", selected = null, dots = {};
      let target = null, round = 0, cookiesEaten = 0, lock = false;
      let praiseIndex = 0, tryIndex = 0, greatIndex = 0;
      let boardTargets = [];      // أهداف لعبة الرقعة (غامق/فاتح/نص)

      const hideOthers = () => {
        gameList.classList.add("hidden");
        document.getElementById("learningList")?.classList.add("hidden");
        document.getElementById("quiz")?.classList.add("hidden");
        document.getElementById("result")?.classList.add("hidden");
        ["numbersPanel", "englishMathPanel", "scienceAcademy", "interactivePanel", "parentPanel", "tracingPanel", "readingPanel", "pronunciationChallenge", "lessonHub", "lessonView", "rescuePanel", "memoryPanel", "bravePanel"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
      };

      const openMenu = () => {
        lesson = null; mode = "menu";
        hideOthers();
        panel.classList.remove("hidden");
        $("chessProgress").textContent = "";
        body().innerHTML =
          '<h2 class="touch-game-title">لعبة الشطرنج يا ملك ماثيو! ♞</h2>' +
          '<p class="chess-lesson-text">أنا مس نانسي، وهنلعب شطرنج سوا من الصفر! اختار درس من تحت، وكل درس هتخلّصه هتاخد نجوم تفتح بيها الدرس اللي بعده!</p>' +
          '<button type="button" class="voice-button" id="chessListenIntro">🔊 اسمع الشرح</button>' +
          menuHTML(starTotal());
        $("chessListenIntro").onclick = () => speak(PICKER_LINE, "chess_intro");
        body().querySelectorAll("[data-chess-lesson]").forEach(b => b.addEventListener("click", () => {
          const l = LESSONS.find(x => x.id === b.dataset.chessLesson);
          if (!l) return;
          if (!isUnlocked(l, starTotal())) { speak(LOCKED_LINE, "chess_locked"); return; }
          openLesson(l);
        }));
        speak(PICKER_LINE, "chess_intro");
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      const close = () => {
        mode = "menu"; lesson = null;
        panel.classList.add("hidden");
        gameList.classList.remove("hidden");
        document.getElementById("learningList")?.classList.remove("hidden");
        try { window.MatthewVoice?.stop(); } catch (_) {}
        if (typeof updateStats === "function") { try { updateStats(); } catch (_) {} }
      };
      // رجوع هرمي: داخل درس/لعبة ← قائمة الشطرنج، ومن القائمة ← باب الألعاب.
      $("chessBack").addEventListener("click", () => { if (mode === "menu") close(); else openMenu(); });

      const openLesson = l => {
        lesson = l; mode = "lesson";
        hideOthers();
        panel.classList.remove("hidden");
        $("chessProgress").textContent = "";
        const hero = l.piece ? pieceSVG(l.piece, "w")
          : (l.id === "board" ? '<span class="chess-board-mini" style="font-size:96px">▦</span>'
          : l.id === "cookies" ? '<span style="font-size:96px">🍪</span>'
          : l.id === "race" ? pieceSVG("p", "w")
          : l.id === "match_rooks" ? pieceSVG("r", "w")
          : pieceSVG("k", "w"));
        body().innerHTML =
          '<div class="chess-hero">' + hero + '</div>' +
          '<h2 class="touch-game-title">' + l.title + '</h2>' +
          '<p class="chess-lesson-text">' + l.lesson + '</p>' +
          '<button type="button" class="voice-button" id="chessListenLesson">🔊 اسمع الشرح</button>' +
          '<button type="button" class="primary" id="chessPlay">يلا نلعب ←</button>' +
          '<button type="button" class="secondary" id="chessBackMenu">اختار درس تاني</button>';
        $("chessListenLesson").onclick = () => speak(l.lesson, "chess_" + l.id + "_lesson");
        $("chessPlay").onclick = () => startGame(l);
        $("chessBackMenu").onclick = openMenu;
        speak(l.intro, "chess_" + l.id + "_intro");
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      // ---------- محرك عرض الرقعة التفاعلي ----------
      const PIECE_START = { p: { r: 6, c: 4 }, r: { r: 4, c: 4 }, b: { r: 4, c: 4 }, q: { r: 4, c: 4 }, k: { r: 4, c: 4 }, n: { r: 4, c: 4 } };
      const pickTarget = (b, from) => {
        const moves = legalMoves(b, from.r, from.c);
        return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
      };
      const setDots = from => {
        dots = {};
        if (from) for (const m of legalMoves(board, from.r, from.c)) dots[m.r + "-" + m.c] = true;
      };

      const renderBoard = msg => {
        const b = body();
        b.querySelector(".chess-board-wrap")?.remove();
        const wrap = document.createElement("div");
        wrap.className = "chess-board-wrap";
        wrap.innerHTML = boardHTML(board, { dots, selected, target, cookies: lesson && lesson.kind === "cookies" }) +
          '<p class="chess-msg" id="chessMsg">' + (msg || "") + '</p>';
        b.appendChild(wrap);
        wrap.querySelectorAll(".chess-sq").forEach(sq => sq.addEventListener("click", () => onSquare(Number(sq.dataset.r), Number(sq.dataset.c))));
      };

      const showMsg = text => {
        const m = panel.querySelector("#chessMsg");
        if (m) m.textContent = text;
      };
      const praise = () => speak(PRAISE[praiseIndex++ % PRAISE.length], "chess_praise_" + ((praiseIndex - 1) % PRAISE.length + 1));
      const tryAgain = () => speak(TRY_LINES[tryIndex++ % TRY_LINES.length], "chess_try_" + ((tryIndex - 1) % TRY_LINES.length + 1));
      const great = () => speak(GREAT_MOVE[greatIndex++ % GREAT_MOVE.length], "chess_great_" + ((greatIndex - 1) % GREAT_MOVE.length + 1));

      function startGame(l) {
        lesson = l; mode = "game"; lock = false;
        selected = null; dots = {}; target = null; round = 0; cookiesEaten = 0;
        hideOthers();
        panel.classList.remove("hidden");
        $("chessProgress").textContent = "";
        if (l.kind === "board") {
          board = emptyBoard();
          boardTargets = [{ name: "dark", text: l.question }, { name: "light", text: l.question2 }, { name: "center", text: l.question3 }];
          body().innerHTML = '<h2 class="touch-game-title">' + l.title + '</h2>' +
            '<p class="chess-turn" id="chessQ">' + l.question + '</p>' +
            '<button type="button" class="voice-button" id="chessListenQ">🔊 اسمع السؤال</button>';
          $("chessListenQ").onclick = () => speak(boardTargets[round].text, "chess_board_question" + (round === 0 ? "" : round + 1));
          renderBoard("");
          speak(l.question, "chess_board_question");
        } else if (l.kind === "piece") {
          board = emptyBoard();
          const start = PIECE_START[l.piece];
          board[start.r][start.c] = { t: l.piece, c: "w" };
          target = pickTarget(board, start);
          body().innerHTML = '<h2 class="touch-game-title">' + l.title + '</h2>' +
            '<p class="chess-turn">دوس على القطعة، وبعدين دوس على المربع الأخضر اللي بينوّر!</p>' +
            '<button type="button" class="voice-button" id="chessListenQ">🔊 اسمع السؤال</button>';
          $("chessListenQ").onclick = () => speak(l.question, "chess_" + l.id + "_question");
          renderBoard("");
          speak(l.question, "chess_" + l.id + "_question");
        } else if (l.kind === "cookies") {
          board = setupCookies("r");
          placeCookies();
          body().innerHTML = '<h2 class="touch-game-title">' + l.title + ' 🍪</h2>' +
            '<p class="chess-turn" id="chessQ">كل الكوكيز يا بطل! 🍪 ' + arabicDigits(cookiesEaten) + ' / ٤</p>' +
            '<button type="button" class="voice-button" id="chessListenQ">🔊 اسمع السؤال</button>';
          $("chessListenQ").onclick = () => speak(l.question, "chess_cookies_question");
          renderBoard("");
          speak(l.question, "chess_cookies_question");
        } else if (l.kind === "race") {
          board = setupPawnRace(); turn = "w";
          body().innerHTML = '<h2 class="touch-game-title">' + l.title + '</h2>' +
            '<p class="chess-turn" id="chessQ">دورك يا ملك ماثيو! حرّك بيدق أبيض لقدام!</p>' +
            '<button type="button" class="voice-button" id="chessListenQ">🔊 اسمع السؤال</button>';
          $("chessListenQ").onclick = () => speak(l.question, "chess_race_question");
          renderBoard("");
          speakSeq([OPPONENT_LINE, l.question]);
        } else {
          board = l.kind === "full" ? startPosition() : setupMiniRooks(); turn = "w";
          body().innerHTML = '<h2 class="touch-game-title">' + l.title + '</h2>' +
            '<p class="chess-turn" id="chessQ">دورك يا ملك ماثيو! حرّك قطعة بيضا!</p>' +
            '<button type="button" class="voice-button" id="chessListenQ">🔊 اسمع السؤال</button>';
          $("chessListenQ").onclick = () => speak(l.question, "chess_" + l.id + "_question");
          renderBoard("");
          speakSeq([OPPONENT_LINE, l.question]);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      // لعبة الكوكيز: ضع كوكيز (بيادق سوداء) على مربعات قانونية للقطعة.
      const PIECE_CYCLE = ["r", "b", "n", "q"];
      function piecePos() {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.c === "w") return { r, c, p };
        }
        return null;
      }
      function placeCookies() {
        const pos = piecePos();
        if (!pos) return;
        const moves = legalMoves(board, pos.r, pos.c).filter(m => !board[m.r][m.c]);
        let placed = cookiesLeft(board);
        for (const m of moves) {
          if (placed >= 3) break;
          board[m.r][m.c] = { t: "p", c: "b" };
          placed++;
        }
      }

      function onSquare(r, c) {
        if (lock || !lesson) return;
        const kind = lesson.kind;
        if (kind === "board") {
          const t = boardTargets[round];
          const light = (r + c) % 2 === 0;
          const center = r >= 3 && r <= 4 && c >= 3 && c <= 4;
          const ok = (t.name === "dark" && !light) || (t.name === "light" && light) || (t.name === "center" && center);
          if (ok) {
            recordStar("chess:board");
            round++;
            if (round >= boardTargets.length) { winGame(); return; }
            const q = panel.querySelector("#chessQ");
            if (q) q.textContent = boardTargets[round].text;
            praise();
            showMsg("برافو يا ملك ماثيو! ⭐");
          } else {
            tryAgain();
            showMsg("جرّب مربع تاني يا بطل!");
          }
          return;
        }
        const p = board[r][c];
        if (kind === "piece") {
          if (selected && dots[r + "-" + c]) {
            const from = selected;
            const hitTarget = target && target.r === r && target.c === c;
            board = applyMove(board, from, { r, c });
            selected = null; dots = {}; target = null;
            if (hitTarget) {
              recordStar("chess:" + lesson.id);
              round++;
              if (round >= 3) { renderBoard(""); winGame(); return; }
              const np = piecePos();
              target = np ? pickTarget(board, np) : null;
              praise();
              showMsg("برافو يا ملك ماثيو! ⭐");
            } else {
              showMsg("حركة قانونية جميلة! كمّل للمربع الأخضر!");
            }
            renderBoard("");
            return;
          }
          if (p && p.c === "w") { selected = { r, c }; setDots(selected); renderBoard(""); }
          else if (selected) { tryAgain(); showMsg("دوس على مربع أخضر يا بطل!"); }
          return;
        }
        if (kind === "cookies") {
          if (selected && dots[r + "-" + c]) {
            const from = selected;
            const ate = board[r][c] && board[r][c].c === "b";
            board = applyMove(board, from, { r, c });
            selected = null; dots = {};
            if (ate) {
              cookiesEaten++;
              recordStar("chess:cookies");
              const q = panel.querySelector("#chessQ");
              if (q) q.textContent = "كل الكوكيز يا بطل! 🍪 " + arabicDigits(cookiesEaten) + " / ٤";
              if (cookiesEaten >= 4) { renderBoard(""); winGame(); return; }
              great();
              // بدّل القطعة كل كوكي: طابية ← فيل ← حصان ← وزير ← طابية…
              const np = piecePos();
              if (np) {
                const next = PIECE_CYCLE[cookiesEaten % PIECE_CYCLE.length];
                board[np.r][np.c] = { t: next, c: "w" };
              }
              placeCookies();
              showMsg("ممم! كوكي لذيذ! 🍪⭐");
            } else {
              placeCookies();
              showMsg("حركة جميلة! دوّر على الكوكي!");
            }
            renderBoard("");
            return;
          }
          if (p && p.c === "w") { selected = { r, c }; setDots(selected); renderBoard(""); }
          else if (selected) { tryAgain(); showMsg("دوس على مربع أخضر يا بطل!"); }
          return;
        }
        // مباريات (سباق / بيادق وطابيات / كاملة): دور أبيض ثم خصم لطيف.
        if (turn !== "w") return;
        if (selected && dots[r + "-" + c]) {
          const from = selected;
          const captured = board[r][c] && board[r][c].c === "b";
          board = applyMove(board, from, { r, c });
          selected = null; dots = {};
          recordStar("chess:" + lesson.id);
          if (captured) great(); else if (Math.random() < 0.3) praise();
          renderBoard("");
          if (checkEnd("w")) return;
          turn = "b";
          lock = true;
          showMsg("دور صاحبك اللطيف…");
          setTimeout(opponentTurn, 900);
          return;
        }
        if (p && p.c === "w") { selected = { r, c }; setDots(selected); renderBoard(""); }
        else if (selected) { tryAgain(); showMsg("دوس على مربع أخضر يا بطل!"); }
      }

      // نهاية دور ماثيو: فوز؟ تعادل؟ كش على العدو؟ (false = كمّل اللعب)
      function checkEnd(mover) {
        if (lesson.kind === "race") {
          if (raceWon(board, "w")) { winGame(); return true; }
          return false;
        }
        if (countPieces(board, "b") === 0) { winGame(); return true; }
        const st = gameStatus(board, "b");
        if (st === "checkmate") { winGame(); return true; }
        if (st === "stalemate") { drawGame(); return true; }
        return false;
      }

      function opponentTurn() {
        if (!lesson || mode !== "game") { lock = false; return; }
        const mv = gentleMove(board, "b");
        if (!mv) {
          // العدو بلا حركات: كش مات له (فوز ماثيو) أو جمود (تعادل).
          lock = false;
          if (lesson.kind === "race") { retryGame(); return; }
          if (inCheck(board, "b")) winGame(); else drawGame();
          return;
        }
        board = applyMove(board, mv.from, mv.to);
        turn = "w";
        lock = false;
        renderBoard("");
        if (lesson.kind === "race") {
          if (raceWon(board, "b")) { retryGame(); return; }
          showMsg("دورك يا ملك ماثيو!");
          return;
        }
        if (countPieces(board, "w") === 0) { retryGame(); return; }
        const st = gameStatus(board, "w");
        if (st === "checkmate") { retryGame(); return; }
        if (st === "stalemate") { drawGame(); return; }
        if (st === "check") {
          speak(CHECK_LINE, "chess_check");
          showMsg("خد بالك! الملك في خطر — احميه يا بطل!");
        } else {
          showMsg("دورك يا ملك ماثيو!");
        }
      }

      function winGame() {
        mode = "lesson";
        recordStar("chess:" + lesson.id);
        addStars(2);
        try { window.MatthewMastery?.awardCrown?.(0, 1); } catch (_) {}
        speak(lesson.win, "chess_" + lesson.id + "_win");
        body().innerHTML =
          '<div class="chess-win anim-enter"><div class="mem-trophy">🏆</div>' +
          '<h2 class="touch-game-title">برافو يا ملك ماثيو!</h2>' +
          '<div class="result-stars">⭐⭐</div>' +
          '<p class="feedback">' + lesson.win + '</p>' +
          '<button id="chessAgain" class="primary" type="button">العب تاني <span class="pager-arrow">←</span></button>' +
          '<button id="chessMenuBtn" class="secondary" type="button">اختار درس تاني ♞</button></div>';
        $("chessAgain").onclick = () => startGame(lesson);
        $("chessMenuBtn").onclick = openMenu;
      }

      function drawGame() {
        mode = "lesson";
        recordStar("chess:" + lesson.id);
        addStars(1);
        speak(DRAW_LINE, "chess_draw");
        body().innerHTML =
          '<div class="chess-win anim-enter"><div class="mem-trophy">🤝</div>' +
          '<h2 class="touch-game-title">تعادل يا بطل!</h2>' +
          '<p class="feedback">' + DRAW_LINE + '</p>' +
          '<button id="chessAgain" class="primary" type="button">العب تاني <span class="pager-arrow">←</span></button>' +
          '<button id="chessMenuBtn" class="secondary" type="button">اختار درس تاني ♞</button></div>';
        $("chessAgain").onclick = () => startGame(lesson);
        $("chessMenuBtn").onclick = openMenu;
      }

      // لا شاشة فشل أبداً: إعادة هادئة مع «حاول تاني يا بطل».
      function retryGame() {
        mode = "lesson";
        speak(RETRY_LINE, "chess_retry");
        body().innerHTML =
          '<div class="chess-win anim-enter"><div class="mem-trophy">💜</div>' +
          '<h2 class="touch-game-title">حاول تاني يا بطل!</h2>' +
          '<p class="feedback">' + RETRY_LINE + '</p>' +
          '<button id="chessAgain" class="primary" type="button">يلا نلعب تاني <span class="pager-arrow">←</span></button>' +
          '<button id="chessMenuBtn" class="secondary" type="button">اختار درس تاني ♞</button></div>';
        $("chessAgain").onclick = () => startGame(lesson);
        $("chessMenuBtn").onclick = openMenu;
      }

      card.addEventListener("click", openMenu);
      openFn = openMenu;
    }
  }

  return {
    LESSONS, CORPUS, PICKER_LINE, LOCKED_LINE, OPPONENT_LINE, CHECK_LINE,
    RETRY_LINE, DRAW_LINE, PRAISE, TRY_LINES, GREAT_MOVE,
    spokenStrings, starTotal, isUnlocked, menuHTML, boardHTML, pieceSVG,
    cardIconSVG, arabicDigits, squareName,
    emptyBoard, startPosition, setupPawnRace, setupMiniRooks, setupCookies,
    legalMoves, pseudoMoves, applyMove, inCheck, isAttacked, gameStatus,
    allLegalMoves, gentleMove, raceWon, cookiesLeft, countPieces, findKing,
    open: () => { if (openFn) openFn(); }
  };
});
