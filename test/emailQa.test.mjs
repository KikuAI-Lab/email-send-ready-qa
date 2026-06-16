import assert from "node:assert/strict";
import { fixtures } from "../src/fixtures.js";
import { analyzeEmailHtml, applySafeFixes, buildQaReport } from "../src/emailQa.js";
import { applySimpleCssInlining } from "../src/cssInline.js";
import { parseEmailHtml } from "../src/htmlModel.js";

const broken = fixtures.find((item) => item.id === "broken-agency-draft");
const chatgpt = fixtures.find((item) => item.id === "chatgpt-fixed-still-risky");
const clipping = fixtures.find((item) => item.id === "gmail-clipping-risk");
const knownGood = fixtures.find((item) => item.id === "known-good-baseline");
const cssNotInlined = fixtures.find((item) => item.id === "css-not-inlined");
const mailchimp = fixtures.find((item) => item.id === "mailchimp-merge-tags");

assert.ok(broken, "broken fixture exists");
assert.ok(chatgpt, "ChatGPT fixture exists");
assert.ok(clipping, "clipping fixture exists");
assert.ok(knownGood, "known-good fixture exists");
assert.ok(cssNotInlined, "CSS-not-inlined fixture exists");
assert.ok(mailchimp, "Mailchimp fixture exists");

const model = parseEmailHtml(cssNotInlined.html);
assert.equal(model.links.length, 2, "parser adapter extracts links");
assert.equal(model.images.length, 1, "parser adapter extracts images");
assert.equal(model.styleBlocks.length, 1, "parser adapter extracts style blocks");

const brokenResult = analyzeEmailHtml(broken.html);
const brokenIssueIds = new Set(brokenResult.issues.map((item) => item.id));

assert.equal(brokenResult.status, "Not send-ready");
assert.ok(brokenResult.issues.length >= 8, "broken sample should expose at least 8 issue types");
assert.ok(brokenIssueIds.has("placeholder-links"), "detects placeholder links");
assert.ok(brokenIssueIds.has("empty-links"), "detects empty links");
assert.ok(brokenIssueIds.has("missing-unsubscribe"), "detects missing unsubscribe");
assert.ok(brokenIssueIds.has("broken-personalization-token"), "detects broken personalization token");
assert.ok(brokenIssueIds.has("missing-preheader"), "detects missing preheader");
assert.ok(brokenIssueIds.has("missing-image-alt"), "detects missing image alt");
assert.ok(brokenIssueIds.has("mixed-utm-campaigns"), "detects mixed UTM campaigns");
assert.ok(brokenIssueIds.has("draft-copy-leftovers"), "detects draft copy leftovers");
assert.ok(
  brokenResult.issues.every((item) => item.group && item.why && item.nextAction),
  "each issue carries active guidance"
);

const fixed = applySafeFixes(broken.html, {
  preheaderText: "Preview the launch before sending."
});

assert.ok(fixed.appliedFixes.length >= 3, "applies at least 3 safe fix groups");
assert.ok(!fixed.fixedHtml.includes("builder-debug"), "removes HTML comments");
assert.ok(fixed.fixedHtml.includes('alt=""'), "adds empty image alt attributes");
assert.ok(fixed.fixedHtml.includes("noopener noreferrer"), "adds basic link safety attributes");
assert.ok(fixed.fixedHtml.includes("Preview the launch before sending."), "inserts hidden preheader");
assert.ok(fixed.after.issues.length < fixed.before.issues.length, "safe fixes reduce issue count");

const chatgptResult = analyzeEmailHtml(chatgpt.html);
const chatgptIssueIds = new Set(chatgptResult.issues.map((item) => item.id));
assert.equal(chatgptResult.status, "Not send-ready");
assert.ok(chatgptIssueIds.has("placeholder-links"), "ChatGPT sample still has placeholder link");
assert.ok(chatgptIssueIds.has("missing-unsubscribe"), "ChatGPT sample still lacks unsubscribe signal");
assert.ok(chatgptIssueIds.has("missing-utm"), "ChatGPT sample still lacks UTM parameters");

const clippingResult = analyzeEmailHtml(clipping.html);
assert.ok(
  clippingResult.issues.some((item) => item.id === "gmail-clipping-risk"),
  "detects Gmail clipping threshold"
);

const knownGoodResult = analyzeEmailHtml(knownGood.html);
assert.equal(knownGoodResult.summary.critical, 0, "known-good baseline has no critical issues");

const cssResult = analyzeEmailHtml(cssNotInlined.html);
assert.ok(
  cssResult.issues.some((item) => item.id === "css-not-inlined" && item.source === "local-compatibility-baseline"),
  "detects non-inlined CSS through compatibility adapter"
);

const inlineResult = applySimpleCssInlining(cssNotInlined.html);
assert.ok(inlineResult.inlinedElementCount >= 2, "simple CSS inliner touches classed elements");
assert.ok(inlineResult.inlinedRuleCount >= 2, "simple CSS inliner parses class rules");
assert.equal(inlineResult.removedStyleBlocks, 1, "simple CSS inliner removes fully inlined style block");
assert.ok(!/<style\b/i.test(inlineResult.html), "inlined output removes style block");
assert.ok(/style="[^"]*background:#2457d6/i.test(inlineResult.html), "inlined output includes button background");

const cssFixed = applySafeFixes(cssNotInlined.html, {
  preheaderText: "Final proof before sending."
});
assert.ok(
  cssFixed.appliedFixes.some((item) => item.id === "inline-simple-css"),
  "safe fixes include CSS inlining group"
);
assert.ok(
  !cssFixed.after.issues.some((item) => item.id === "css-not-inlined"),
  "CSS-not-inlined issue is resolved after safe fix"
);

const mailchimpResult = analyzeEmailHtml(mailchimp.html);
assert.equal(mailchimpResult.summary.critical, 0, "balanced Mailchimp merge tags should not be critical");

const report = buildQaReport(fixed.after, fixed.appliedFixes);
assert.equal(report.status, fixed.after.status);
assert.ok(report.fixesApplied.length >= 3, "report includes fixes");
assert.ok(report.issues.length === fixed.after.issues.length, "report includes remaining issues");
assert.ok(report.groupedIssues, "report includes grouped issue counts");
assert.ok(report.issues.every((item) => item.group && item.why && item.nextAction), "report keeps guidance fields");

console.log("emailQa.test.mjs: PASS");
