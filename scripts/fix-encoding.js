const fs = require("fs");
const nodePath = require("path");
const targetPath = process.argv[2];
if (!targetPath) {
  console.error("Usage: node fix-encoding.js <path/to/file>");
  process.exit(1);
}
const path = nodePath.resolve(targetPath);
let text = fs.readFileSync(path, "utf8");

const replacements = [
  ["Ã\u0084", "\u00C4"],
  ["Ã\u00a4", "\u00E4"],
  ["Ã\u00b6", "\u00F6"],
  ["Ã\u00bc", "\u00FC"],
  ["Ã\u009f", "\u00DF"],
  ["Ã\u00a9", "\u00E9"],
];

for (const [from, to] of replacements) {
  text = text.split(from).join(to);
}

fs.writeFileSync(path, text, "utf8");
console.log("Done");
const verify = fs.readFileSync(path, "utf8");
const line = verify.split("\n").find((l) => l.includes("nderungen speichern"));
console.log("Sample line:", line ? line.trim() : "not found");
