const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "www");
const files = ["index.html", "app.js", "styles.css", "voice.js", "lessons.js", "manifest.webmanifest", "icon.svg", "sw.js"];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(out, file));
console.log("Prepared offline web assets in www/");

const esbuild = require("esbuild");
esbuild.buildSync({
  entryPoints: [path.join(root, "native-tts.js")],
  bundle: true,
  format: "iife",
  outfile: path.join(out, "native-tts.js")
});
