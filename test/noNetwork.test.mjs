import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scannedFiles = [
  "index.html",
  "src/app.js",
  "src/compatibility.js",
  "src/cssInline.js",
  "src/emailQa.js",
  "src/fixtures.js",
  "src/htmlModel.js"
];
const forbiddenPatterns = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bsendBeacon\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bindexedDB\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/
];

for (const file of scannedFiles) {
  const source = readFileSync(file, "utf8");
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(source), false, `${file} contains forbidden browser API: ${pattern}`);
  }
}

console.log("noNetwork.test.mjs: PASS");
