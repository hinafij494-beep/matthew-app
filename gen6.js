const fs = require("fs"), { execFileSync } = require("child_process");
const key = process.argv[2], lang = process.argv[3] || "ar_EG";
const text = fs.readFileSync("audio-src/tts-in/" + key + ".txt", "utf8");
let input = text;
if (lang === "ar_EG") {
  input = text.replace(/[ً-ٰٟ]/g, "");
  input = input.replace(/([ء-ي])\1{2,}/g, (m, c) => Array(4).fill(c).join(" "));
}
// A bare single letter ("مُ", "آ") can return empty audio: drill it twice
// for the synthesis input only — the corpus text stays a single syllable.
const bareLetter = input.replace(/[ً-ٰٟـ]/g, "").trim();
if (/^[ء-ي]$/.test(bareLetter)) { const t = input.trim(); input = t + "، " + t; }
// Very short Fusha syllables ("با", "تا") often come back empty from the
// backend: a trailing full stop gives the synthesiser a sentence boundary
// and makes them render reliably. Corpus text is unchanged.
if (lang === "ar_SA" && bareLetter.length <= 2 && !/[.!؟]$/.test(input.trim())) input = input.trim() + ".";
input = input.replace(/\s+/g, " ").trim();
execFileSync("/opt/hatch/bin/tts", ["speak", "--output", "audio-src/raw6/" + key + ".mp3", "--voice", "avocado_v2:MAI_01", "--language", lang, "--text-stdin"], { input, stdio: ["pipe", "inherit", "inherit"], timeout: 180000 });
