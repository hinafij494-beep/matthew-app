#!/usr/bin/env python3
"""Rebuild interactive-games.js as core + inlined modules.
The Android APK workflow copies interactive-games.js but the GitHub App
cannot edit workflow files, so modules that must ship in the APK are
inlined here in load order. Canonical sources stay as standalone files;
tests/content.test.js asserts byte-identity of each inlined part."""
import re, pathlib
root = pathlib.Path(__file__).parent
BUNDLE = root / "interactive-games.js"
PARTS = (sorted(__import__("glob").glob("voice-clips-pack-*.js"), key=lambda p: int(p.rsplit("-",1)[1].split(".")[0])) + sorted(__import__("glob").glob("voice-clips-text-*.js")) + ["voice-clips.js", "mastery.js", "parent.js", "tracing.js", "reading.js", "rescue.js", "color-games.js", "stories.js", "memory-game.js", "chess.js"])
MARK = "// ==== bundled module: {name} ====\n"
def core_of(text):
    for name in PARTS:
        pat = re.compile(r"\n?" + re.escape(MARK.format(name=name)) + r".*?(?=\n// ==== bundled module: |\n// ==== interactive games core)" , re.S)
        text = pat.sub("", text)
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
