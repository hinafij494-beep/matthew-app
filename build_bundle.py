#!/usr/bin/env python3
"""Rebuild interactive-games.js as core + inlined code modules.
Voice data is NOT inlined any more. The 16 voice-clips-pack-*.js files
(base64 Opus audio, ~29 MB total) plus voice-clips-text-*.js used to be
inlined here, which made the bundle 29,522,344 bytes — GitHub's web UI
rejects any single file over 25 MB, so the bundle could not be uploaded.
The packs are now loaded as separate <script> tags in index.html BEFORE
interactive-games.js, and precached in sw.js (offline-first). This is
safe because each pack only pushes one object into
window.__matthewClipData / __matthewClipText / __matthewClipExact, and
voice-clips.js (inlined here, first module) snapshots those arrays when
it runs — with defer scripts executing in document order, every clip key
resolves exactly as before.
The Android APK workflow must copy the pack/text files into www/ too
(it copies only interactive-games.js for voice data today).
Canonical sources stay as standalone files; tests/content.test.js asserts
byte-identity of each inlined part and that the bundle stays under 25 MB."""
import re, pathlib
root = pathlib.Path(__file__).parent
BUNDLE = root / "interactive-games.js"
PARTS = ["voice-clips.js", "mastery.js", "parent.js", "tracing.js", "reading.js", "rescue.js", "color-games.js", "stories.js", "memory-game.js", "chess.js"]
MARK = "// ==== bundled module: {name} ====\n"
def core_of(text):
    # Strip EVERY previously bundled module section — including the voice
    # packs/text chunks from the old 29 MB layout — so a rebuild never
    # carries stale parts forward. The touch-games core itself contains no
    # such marker, so the core boundary below is unambiguous.
    text = re.sub(r"\n?// ==== bundled module: [^\n]*\n.*?(?=\n// ==== bundled module: |\n// ==== interactive games core)", "", text, flags=re.S)
    marker = "\n// ==== interactive games core ====\n"
    if marker in text: text = text.split(marker, 1)[1]
    return text.strip() + "\n"
core = core_of(BUNDLE.read_text())
out = []
for name in PARTS:
    out.append(MARK.format(name=name) + (root / name).read_text().strip() + "\n")
out.append("// ==== interactive games core ====\n" + core)
BUNDLE.write_text("\n".join(out))
print("bundle rebuilt:", BUNDLE.stat().st_size, "bytes")
