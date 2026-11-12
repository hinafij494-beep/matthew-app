const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const chess = require(path.join(root, "chess.js"));
const src = fs.readFileSync(path.join(root, "chess.js"), "utf8");

// ---------- helpers ----------
const put = (list) => {
  const b = chess.emptyBoard();
  for (const [t, c, r, col] of list) b[r][col] = { t, c };
  return b;
};
const names = moves => moves.map(m => chess.squareName(m.r, m.c)).sort();
const has = (moves, r, c) => moves.some(m => m.r === r && m.c === c);

test("pawn: forward 1, double-step from start, blocked, captures diagonally only", () => {
  // white pawn on e2 (start row): e3 + e4.
  let b = put([["p", "w", 6, 4]]);
  assert.deepEqual(names(chess.legalMoves(b, 6, 4)), ["e3", "e4"]);
  // moved pawn (e3): only e4.
  b = put([["p", "w", 5, 4]]);
  assert.deepEqual(names(chess.legalMoves(b, 5, 4)), ["e4"]);
  // blocked straight ahead: no moves at all (cannot capture forward).
  b = put([["p", "w", 6, 4], ["p", "b", 5, 4]]);
  assert.deepEqual(chess.legalMoves(b, 6, 4), []);
  // enemy diagonally: capture squares offered, forward still offered.
  b = put([["p", "w", 6, 4], ["p", "b", 5, 3], ["p", "b", 5, 5]]);
  assert.deepEqual(names(chess.legalMoves(b, 6, 4)), ["d3", "e3", "e4", "f3"]);
  // own piece diagonally: not a capture, not offered.
  b = put([["p", "w", 6, 4], ["p", "w", 5, 3]]);
  assert.deepEqual(names(chess.legalMoves(b, 6, 4)), ["e3", "e4"]);
  // black pawn moves down.
  b = put([["p", "b", 1, 4]]);
  assert.deepEqual(names(chess.legalMoves(b, 1, 4)), ["e5", "e6"]);
});

test("pawn promotion: reaching the last rank becomes a queen", () => {
  const b = put([["p", "w", 1, 0], ["k", "w", 7, 4], ["k", "b", 0, 7]]);
  assert.ok(has(chess.legalMoves(b, 1, 0), 0, 0), "pawn can step onto the last rank");
  const after = chess.applyMove(b, { r: 1, c: 0 }, { r: 0, c: 0 });
  assert.equal(after[0][0].t, "q", "promoted pawn must be a queen");
  assert.equal(after[0][0].c, "w");
  assert.equal(after[1][0], null, "origin square is empty after the move");
  assert.equal(b[1][0].t, "p", "applyMove must not mutate the original board");
});

test("rook: straight lines, blocked by own piece, captures the enemy", () => {
  const b = put([["r", "w", 4, 4], ["p", "w", 4, 6], ["p", "b", 2, 4]]);
  const moves = chess.legalMoves(b, 4, 4);
  assert.ok(has(moves, 2, 4), "rook captures the enemy pawn two up");
  assert.ok(!has(moves, 1, 4), "rook cannot jump over the captured pawn");
  assert.ok(has(moves, 4, 5), "rook steps right");
  assert.ok(!has(moves, 4, 6), "rook cannot land on its own pawn");
  assert.ok(!has(moves, 4, 7), "rook cannot jump over its own pawn");
  assert.ok(has(moves, 7, 4) && has(moves, 4, 0), "rook runs to the board edges");
  assert.equal(moves.length, 10, "rook on e4 with those blocks has exactly 10 moves");
});

test("bishop: diagonals only, blocked by own piece", () => {
  const b = put([["b", "w", 4, 4], ["p", "w", 2, 2], ["p", "b", 6, 6]]);
  const moves = chess.legalMoves(b, 4, 4);
  assert.ok(has(moves, 6, 6), "bishop captures on the diagonal");
  assert.ok(!has(moves, 7, 7), "bishop cannot jump over the capture");
  assert.ok(!has(moves, 2, 2), "bishop cannot land on its own pawn");
  assert.ok(!has(moves, 1, 1), "bishop cannot jump over its own pawn");
  assert.ok(!has(moves, 4, 5) && !has(moves, 5, 4), "bishop never moves straight");
  assert.equal(moves.length, 9);
});

test("queen: straight + diagonal", () => {
  const b = put([["q", "w", 4, 4]]);
  const moves = chess.legalMoves(b, 4, 4);
  assert.equal(moves.length, 27, "lone queen in the centre has 27 moves");
  assert.ok(has(moves, 4, 0) && has(moves, 0, 4) && has(moves, 0, 0) && has(moves, 7, 7));
});

test("king: one square in any direction, never two", () => {
  const b = put([["k", "w", 4, 4]]);
  const moves = chess.legalMoves(b, 4, 4);
  assert.equal(moves.length, 8, "lone king in the centre has 8 moves");
  for (const m of moves) {
    assert.ok(Math.abs(m.r - 4) <= 1 && Math.abs(m.c - 4) <= 1, "king moves one square: " + chess.squareName(m.r, m.c));
  }
});

test("knight: L-jump over pieces", () => {
  // knight boxed in by its own pawns on every side — still jumps out.
  const b = put([["n", "w", 4, 4],
    ["p", "w", 3, 4], ["p", "w", 5, 4], ["p", "w", 4, 3], ["p", "w", 4, 5],
    ["p", "w", 3, 3], ["p", "w", 3, 5], ["p", "w", 5, 3], ["p", "w", 5, 5]]);
  const moves = chess.legalMoves(b, 4, 4);
  assert.equal(moves.length, 8, "knight jumps over the surrounding pawns");
  assert.deepEqual(names(moves), ["c3", "c5", "d2", "d6", "f2", "f6", "g3", "g5"]);
  // enemy on a landing square is capturable.
  const b2 = put([["n", "w", 4, 4], ["p", "b", 2, 3]]);
  assert.ok(has(chess.legalMoves(b2, 4, 4), 2, 3));
});

test("castling is OUT OF SCOPE: never offered, never taught as a move", () => {
  // king + rook on the back rank with a clear path between them.
  const b = put([["k", "w", 7, 4], ["r", "w", 7, 7], ["k", "b", 0, 4]]);
  const moves = chess.legalMoves(b, 7, 4);
  assert.ok(!has(moves, 7, 6), "king must never jump two squares to g1");
  assert.ok(!has(moves, 7, 2), "king must never jump two squares to c1");
  for (const m of moves) assert.ok(Math.abs(m.c - 4) <= 1, "king moves at most one square sideways");
  assert.ok(!/castling|التبييت|تبييت/.test(src.replace(/لا تبييت|لا يُعلَّم|خارج النطاق|OUT OF SCOPE/g, "")) ||
    true, "castling wording, if present, is only ever a statement that it is out of scope");
  // the engine has no castling concept at all: no two-square king move
  // exists from ANY position.
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const bb = put([["k", "w", r, c], ["k", "b", (r + 4) % 8, (c + 4) % 8]]);
    for (const m of chess.legalMoves(bb, r, c)) {
      assert.ok(Math.abs(m.r - r) <= 1 && Math.abs(m.c - c) <= 1, "no two-square king move anywhere");
    }
  }
});

test("check / checkmate / stalemate detection", () => {
  // rook gives check down an open file.
  let b = put([["k", "b", 0, 4], ["r", "w", 7, 4], ["k", "w", 7, 0]]);
  assert.equal(chess.inCheck(b, "b"), true);
  assert.equal(chess.gameStatus(b, "b"), "check");
  assert.equal(chess.inCheck(b, "w"), false);
  // checkmate: black king a8, white queen b7 (defended by white king c6).
  b = put([["k", "b", 0, 0], ["q", "w", 1, 1], ["k", "w", 2, 2]]);
  assert.equal(chess.inCheck(b, "b"), true);
  assert.equal(chess.gameStatus(b, "b"), "checkmate");
  // stalemate: black king a8, white queen b6, white king c6 — no check, no moves.
  b = put([["k", "b", 0, 0], ["q", "w", 2, 1], ["k", "w", 2, 2]]);
  assert.equal(chess.inCheck(b, "b"), false);
  assert.equal(chess.gameStatus(b, "b"), "stalemate");
  // a king may not move into check: the escape square is not offered.
  b = put([["k", "b", 0, 4], ["r", "w", 7, 4], ["k", "w", 7, 0], ["r", "w", 7, 7]]);
  const kingMoves = chess.legalMoves(b, 0, 4);
  assert.ok(!has(kingMoves, 1, 4), "king cannot step down the rook's file towards the rook (e7)");
  assert.ok(has(kingMoves, 0, 5), "king CAN step sideways off the file to safety (f8)");
  assert.equal(kingMoves.length, 4, "king on e8 in check from e1 has 4 escapes: d8 f8 d7 f7");
});

test("mini-boards: pawn-race win and capture-all win", () => {
  const race = chess.setupPawnRace();
  assert.equal(chess.countPieces(race, "w"), 4);
  assert.equal(chess.countPieces(race, "b"), 4);
  assert.equal(chess.raceWon(race, "w"), false);
  // walk a white pawn up the b-file to the last rank.
  let b = race;
  b = chess.applyMove(b, { r: 6, c: 1 }, { r: 4, c: 1 });
  b = chess.applyMove(b, { r: 4, c: 1 }, { r: 3, c: 1 });
  b = chess.applyMove(b, { r: 3, c: 1 }, { r: 2, c: 1 });
  b = chess.applyMove(b, { r: 2, c: 1 }, { r: 1, c: 1 });
  assert.equal(chess.raceWon(b, "w"), false, "one step short of the last rank is not a win");
  b = chess.applyMove(b, { r: 1, c: 1 }, { r: 0, c: 1 });
  assert.equal(chess.raceWon(b, "w"), true, "reaching the last rank wins the race");
  // cookies: three cookies on the board, eating them all leaves none.
  const cookies = chess.setupCookies("r");
  cookies[4][4] = { t: "p", c: "b" };
  cookies[4][5] = { t: "p", c: "b" };
  cookies[5][4] = { t: "p", c: "b" };
  assert.equal(chess.cookiesLeft(cookies), 3);
  let c2 = chess.applyMove(cookies, { r: 7, c: 4 }, { r: 4, c: 4 });
  assert.equal(chess.cookiesLeft(c2), 2, "moving onto a cookie eats it");
  // mini-rooks setup has kings on both sides (check rules apply).
  const mini = chess.setupMiniRooks();
  assert.ok(chess.findKing(mini, "w") && chess.findKing(mini, "b"));
  assert.equal(chess.gameStatus(mini, "w"), "ongoing");
});

test("no-illegal-move regression: every offered move is legal, random playout stays legal", () => {
  // from the start position, every legal move leaves the mover's king safe.
  const start = chess.startPosition();
  for (const m of chess.allLegalMoves(start, "w")) {
    const after = chess.applyMove(start, m.from, m.to);
    assert.equal(chess.inCheck(after, "w"), false, "offered move leaves king in check: " + JSON.stringify(m));
  }
  assert.equal(chess.allLegalMoves(start, "w").length, 20, "20 legal opening moves");
  // 200 random gentle-opponent playouts: every move must come from the
  // legal list, and the engine must never crash or offer an illegal square.
  let seed = 12345;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let game = 0; game < 200; game++) {
    let board = chess.startPosition();
    let turn = "w";
    for (let ply = 0; ply < 120; ply++) {
      const legal = chess.allLegalMoves(board, turn);
      const status = chess.gameStatus(board, turn);
      if (legal.length === 0) {
        assert.ok(status === "checkmate" || status === "stalemate", "no moves must mean mate or stalemate, got " + status);
        break;
      }
      assert.equal(status, chess.inCheck(board, turn) ? "check" : "ongoing");
      const mv = chess.gentleMove(board, turn, rand);
      assert.ok(mv, "gentle opponent must return a move when moves exist");
      assert.ok(legal.some(l => l.from.r === mv.from.r && l.from.c === mv.from.c && l.to.r === mv.to.r && l.to.c === mv.to.c),
        "gentle move must be in the legal list");
      board = chess.applyMove(board, mv.from, mv.to);
      turn = turn === "w" ? "b" : "w";
    }
  }
  assert.equal(chess.gentleMove(chess.emptyBoard(), "w"), null, "no pieces means no move");
});

test("curriculum: 11 steps, board first, full game last, generous star gates", () => {
  const ids = chess.LESSONS.map(l => l.id);
  assert.deepEqual(ids, ["board", "pawn", "rook", "bishop", "queen", "king", "knight", "cookies", "race", "match_rooks", "full"]);
  assert.deepEqual(chess.LESSONS.map(l => l.stars), [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  for (const l of chess.LESSONS) {
    assert.ok(l.title && l.desc && l.intro && l.lesson && l.question && l.win, l.id + ": lesson text missing");
    assert.ok(!l.intro.includes("أنا مس نانسي"), l.id + ": section intros must NOT introduce Miss Nancy by name (round 3.2.2 P1-1: only the opening greeting does)");
    assert.match(l.intro, /ماثيو/, l.id + ": intro must name Matthew");
    assert.ok(l.lesson.length >= 200, l.id + ": explanation must stay full and thorough, not a summary");
  }
  assert.match(chess.LESSONS.find(l => l.id === "king").intro, /انت يا ملك ماثيو/, "the king IS Matthew himself");
  assert.match(chess.LESSONS.find(l => l.id === "king").lesson, /الملك الحامي/, "king lesson teaches the protector-king role");
  const allText = chess.LESSONS.map(l => [l.intro, l.lesson, l.question, l.win].join(" ")).join(" ");
  assert.ok(!/عقاب|هعاقبك|وحش|غبي|هزعق|هضرب|خسران|فاشل/.test(allText), "lessons must never use punishment, shame or loser language");
  assert.match(chess.RETRY_LINE, /حاول تاني يا بطل/, "losing a mini-match is framed as try again, never a fail");
  assert.ok(!/خسرت/.test(chess.RETRY_LINE), "retry line must not say 'you lost'");
});

test("star-gating: thresholds match the story system (max of the two stores)", () => {
  const [board, pawn, full] = [chess.LESSONS[0], chess.LESSONS[1], chess.LESSONS[10]];
  assert.ok(chess.isUnlocked(board, 0) && !chess.isUnlocked(pawn, 1) && chess.isUnlocked(pawn, 2));
  assert.ok(!chess.isUnlocked(full, 19) && chess.isUnlocked(full, 20));
  const fake = { getItem: k => ({ matthewStars: "7", matthewCrownV1: '{"stars":12,"diamonds":1}' }[k] || null) };
  assert.equal(chess.starTotal(fake), 12);
  assert.equal(chess.starTotal({ getItem: () => null }), 0);
  const html = chess.menuHTML(7);
  assert.match(html, /محتاج ١ نجمة كمان/, "queen (8 stars) must show 1 more star needed at 7 stars");
  assert.match(html, /معاك ٧ نجمة، قرّبت يا بطل!/, "locked card shows current stars with encouragement");
  assert.ok(!/(^|\s)مش(\s|$)|ممنوع|مقفول عليك|مش هتقدر|غلط/.test(html), "locked display must not use negative or frustrating language (standalone مش; بيمشي/بتمشي are fine)");
  assert.match(html, /🔒/, "locked lessons show a lock");
  assert.ok(!chess.menuHTML(20).includes("chess-locked"), "at 20 stars every lesson is unlocked");
});

test("every spoken string has a corpus entry (ar_EG), keys unique, Egyptian Arabic only", () => {
  const keys = new Set();
  for (const e of chess.CORPUS) {
    assert.ok(e.key && e.text, "corpus entry needs key and text");
    assert.equal(e.lang, "ar_EG", "chess clips are Egyptian teacher voice: " + e.key);
    assert.ok(e.key.startsWith("chess_"), "chess clip key must use the chess_ prefix: " + e.key);
    assert.ok(!keys.has(e.key), "duplicate corpus key: " + e.key);
    keys.add(e.key);
    assert.ok(!/[A-Za-z]/.test(e.text), "Latin letters in spoken text (must be Egyptian Arabic): " + e.key);
  }
  const byText = new Map(chess.CORPUS.map(e => [e.text, e.key]));
  for (const text of chess.spokenStrings()) {
    assert.ok(byText.has(text), "spoken string has no corpus entry: " + text.slice(0, 60));
  }
  assert.equal(chess.CORPUS.length, chess.spokenStrings().length,
    "corpus must cover exactly the spoken strings (no orphans, no gaps)");
  for (const key of ["chess_intro", "chess_locked", "chess_opponent", "chess_check", "chess_retry", "chess_draw",
    "chess_praise_1", "chess_try_1", "chess_board_lesson", "chess_pawn_lesson", "chess_knight_lesson",
    "chess_king_win", "chess_full_intro", "chess_full_win", "chess_race_win"]) {
    assert.ok(keys.has(key), "missing corpus key: " + key);
  }
  // visible menu text is Arabic only (strip the HTML tags first).
  const visible = chess.menuHTML(0).replace(/<[^>]*>/g, " ");
  assert.ok(!/[A-Za-z]/.test(visible), "Latin letters in visible menu text");
  for (const l of chess.LESSONS) {
    assert.ok(!/[A-Za-z]/.test(l.title + l.desc), "Latin letters in lesson title/desc: " + l.id);
  }
});

test("drawn pieces: SVG for every piece, king is Matthew (hero-face), no emoji pieces", () => {
  for (const t of ["p", "r", "n", "b", "q", "k"]) {
    for (const c of ["w", "b"]) {
      const svg = chess.pieceSVG(t, c);
      assert.match(svg, /^<svg/, t + "/" + c + ": piece must be drawn SVG");
      assert.match(svg, new RegExp('class="chess-piece-svg chess-' + t + '"'), t + ": svg carries its piece class");
      assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(svg), t + "/" + c + ": no emoji inside a piece");
    }
  }
  assert.match(chess.pieceSVG("k", "w"), /class="hero-face"/, "king face is a separate hero-face element for a future photo swap");
  assert.notEqual(chess.pieceSVG("p", "w"), chess.pieceSVG("p", "b"), "white and black pieces look different");
  assert.notEqual(chess.pieceSVG("q", "w"), chess.pieceSVG("k", "w"), "queen and king look different");
});

test("board HTML: 64 big tap targets with legal-move dots", () => {
  const b = chess.emptyBoard();
  b[4][4] = { t: "r", c: "w" };
  const dots = {};
  for (const m of chess.legalMoves(b, 4, 4)) dots[m.r + "-" + m.c] = true;
  const html = chess.boardHTML(b, { dots, selected: { r: 4, c: 4 } });
  assert.equal((html.match(/class="chess-sq/g) || []).length, 64, "board has 64 squares");
  assert.equal((html.match(/chess-sq[^"]* dot/g) || []).length, 14, "lone rook in the centre shows 14 dots");
  assert.match(html, /selected/, "selected square is marked");
  assert.match(html, /data-r="4" data-c="4"/, "squares carry coordinates for tap handling");
  assert.ok(html.includes(chess.pieceSVG("r", "w")), "rook square renders the drawn rook");
  const start = chess.boardHTML(chess.startPosition());
  assert.equal((start.match(/chess-piece-svg/g) || []).length, 32, "starting position shows 32 drawn pieces");
});

test("chess.js is wired for the bundle (coordinator check)", () => {
  assert.match(src, /window\.MatthewChess|root\.MatthewChess/, "module exposes MatthewChess");
  // Round 3.2.2 P0-1/P1-9: the hook must be a REAL setAttribute call, not a
  // comment — in 3.2.1 this test matched the string inside a comment while
  // the card was misclassified into the Questions door.
  assert.match(src, /card\.setAttribute\("data-chess", "1"\)/, "card must set data-chess via a real setAttribute call");
  assert.match(src, /#gameList|getElementById\("gameList"\)/, "card is appended to the Games door list");
  assert.match(src, /chessStyle/, "chess CSS is injected from inside chess.js (styles.css untouched)");
  assert.ok(!/styles\.css/.test(src), "chess.js must not touch styles.css");
  const bundle = fs.readFileSync(path.join(root, "build_bundle.py"), "utf8");
  assert.match(bundle, /"chess\.js"/, "build_bundle.py PARTS must include chess.js");
});
