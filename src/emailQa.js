import { getCompatibilityIssues } from "./compatibility.js";
import { applySimpleCssInlining } from "./cssInline.js";
import {
  byteSize,
  countMatches,
  escapeHtml,
  formatBytes,
  getAttribute,
  hasAttribute,
  isHttpHref,
  parseEmailHtml
} from "./htmlModel.js";

export { byteSize, formatBytes } from "./htmlModel.js";

const GMAIL_CLIPPING_BYTES = 102 * 1024;
const GMAIL_WARNING_BYTES = 90 * 1024;

const severityRank = {
  critical: 0,
  warning: 1,
  info: 2
};

const ISSUE_GUIDANCE = {
  "gmail-clipping-risk": {
    group: "needs-input",
    why: "Gmail clipping can hide footer content, tracking pixels, or the final CTA.",
    nextAction: "Remove builder leftovers, duplicated styles, comments, or unused blocks before sending."
  },
  "gmail-clipping-watch": {
    group: "needs-input",
    why: "The email is close enough to clipping territory that one more block can push it over.",
    nextAction: "Run safe fixes, then remove unused sections if the size still looks high."
  },
  "empty-links": {
    group: "needs-input",
    why: "An empty link can waste clicks or make a client-facing campaign look unfinished.",
    nextAction: "Replace every empty href with the final campaign URL."
  },
  "placeholder-links": {
    group: "needs-input",
    why: "Placeholder URLs often survive AI or builder edits and become visible only after send.",
    nextAction: "Replace #, example.com, javascript:, and test URLs with final links."
  },
  "missing-unsubscribe": {
    group: "manual-review",
    why: "The verifier cannot prove the campaign has the ESP unsubscribe or preferences block.",
    nextAction: "Add the unsubscribe/footer block from the ESP before sending."
  },
  "broken-personalization-token": {
    group: "manual-review",
    why: "A broken merge token can show raw template syntax to subscribers.",
    nextAction: "Fix the token in the ESP or template language that will send this email."
  },
  "missing-preheader": {
    group: "auto-fix",
    why: "Without a hidden preheader, inbox preview text may leak random body copy.",
    nextAction: "Apply safe fixes or write a concise preheader before exporting."
  },
  "missing-image-alt": {
    group: "auto-fix",
    why: "Missing alt text weakens accessibility and image-off rendering.",
    nextAction: "Apply safe fixes for decorative images, then replace empty alt text for meaningful images."
  },
  "missing-image-size": {
    group: "needs-input",
    why: "Missing dimensions can cause layout shifts in email clients.",
    nextAction: "Add explicit width and height for important images."
  },
  "base64-images": {
    group: "needs-input",
    why: "Embedded base64 images increase HTML size and can trigger email-client quirks.",
    nextAction: "Replace embedded images with hosted image URLs from your ESP or CDN."
  },
  "missing-utm": {
    group: "needs-input",
    why: "Campaign links without UTM make performance harder to attribute.",
    nextAction: "Add consistent utm_source, utm_medium, and utm_campaign to final CTA links."
  },
  "mixed-utm-campaigns": {
    group: "manual-review",
    why: "Mixed campaign names can split reporting for one send.",
    nextAction: "Confirm whether the campaign split is intentional or normalize the UTM names."
  },
  "draft-copy-leftovers": {
    group: "manual-review",
    why: "Placeholder copy is a visible client/subscriber embarrassment.",
    nextAction: "Replace draft words like lorem, TODO, placeholder, or test copy."
  },
  "dark-mode-risk": {
    group: "compatibility",
    why: "Transparent images and hard-coded colors can invert poorly in dark-mode clients.",
    nextAction: "Preview dark mode or use safer image/color fallbacks for critical blocks."
  },
  "external-link-attrs": {
    group: "auto-fix",
    why: "Basic target and rel attributes are a low-risk hygiene improvement for external links.",
    nextAction: "Apply safe fixes to add missing attributes."
  },
  "css-not-inlined": {
    group: "auto-fix",
    why: "Some production email workflows expect CSS to be inlined before send.",
    nextAction: "Apply safe fixes to inline simple class rules, then manually review complex CSS."
  },
  "css-grid-email-risk": {
    group: "compatibility",
    why: "CSS Grid remains unsafe for conservative email-client compatibility.",
    nextAction: "Use table or hybrid layout for critical campaign content."
  },
  "fixed-position-email-risk": {
    group: "compatibility",
    why: "Fixed positioning is fragile across email clients.",
    nextAction: "Move critical content into normal document flow."
  },
  "interactive-html-email-risk": {
    group: "manual-review",
    why: "Interactive HTML can fail or be stripped in email clients.",
    nextAction: "Provide a static fallback and move interaction to the landing page."
  },
  "web-font-email-risk": {
    group: "compatibility",
    why: "Web font support varies, so typography can change unexpectedly.",
    nextAction: "Confirm fallback fonts preserve layout and brand readability."
  },
  "complex-media-query-risk": {
    group: "compatibility",
    why: "If media queries are ignored, mobile-critical content can break.",
    nextAction: "Check the mobile layout with media queries disabled or simplified."
  }
};

const DEFAULT_GUIDANCE = {
  group: "manual-review",
  why: "This issue needs a human check before the verifier can call the campaign ready.",
  nextAction: "Review this issue in the email builder or source HTML before sending."
};

export function analyzeEmailHtml(html) {
  const model = parseEmailHtml(html);
  const source = model.source;
  const links = model.links;
  const images = model.images;
  const text = model.text;
  const size = model.sizeBytes;
  const issues = [];

  if (!source.trim()) {
    return buildResult(source, size, [
      issue("empty-html", "critical", "No HTML found", "Paste an exported HTML email or load a sample before analyzing.")
    ]);
  }

  if (size >= GMAIL_CLIPPING_BYTES) {
    issues.push(
      issue(
        "gmail-clipping-risk",
        "critical",
        "Gmail clipping risk",
        `HTML is ${formatBytes(size)}. Gmail commonly clips messages around 102 KB, which can hide footer content and distort tracking.`
      )
    );
  } else if (size >= GMAIL_WARNING_BYTES) {
    issues.push(
      issue(
        "gmail-clipping-watch",
        "warning",
        "HTML is close to Gmail clipping territory",
        `HTML is ${formatBytes(size)}. Remove comments, builder leftovers, duplicated styles, or unused blocks before sending.`
      )
    );
  }

  const emptyLinks = links.filter((link) => link.href.trim() === "");
  if (emptyLinks.length) {
    issues.push(
      issue(
        "empty-links",
        "critical",
        "Empty links found",
        `${emptyLinks.length} anchor tag(s) have an empty href. These will not survive a real send review.`
      )
    );
  }

  const placeholderLinks = links.filter((link) => isPlaceholderHref(link.href));
  if (placeholderLinks.length) {
    issues.push(
      issue(
        "placeholder-links",
        "critical",
        "Placeholder links found",
        `${placeholderLinks.length} link(s) still point to #, example.com, javascript:, or obvious test URLs.`
      )
    );
  }

  if (!hasUnsubscribeSignal(source, links, text)) {
    issues.push(
      issue(
        "missing-unsubscribe",
        "critical",
        "No unsubscribe or preferences signal found",
        "The demo cannot prove compliance. Add the ESP unsubscribe/footer block before sending."
      )
    );
  }

  const tokenProblems = detectTokenProblems(source);
  if (tokenProblems.length) {
    issues.push(
      issue(
        "broken-personalization-token",
        "critical",
        "Broken personalization token",
        tokenProblems.join(" ")
      )
    );
  }

  if (!hasPreheaderSignal(source)) {
    issues.push(
      issue(
        "missing-preheader",
        "warning",
        "Missing preheader",
        "No hidden preheader block was found near the top of the email. Inbox preview text may leak body copy."
      )
    );
  }

  const imagesMissingAlt = images.filter((image) => !hasAttribute(image.attrs, "alt"));
  if (imagesMissingAlt.length) {
    issues.push(
      issue(
        "missing-image-alt",
        "warning",
        "Images missing alt text",
        `${imagesMissingAlt.length} image(s) do not include alt attributes. Decorative images can use alt="".`
      )
    );
  }

  const imagesMissingSize = images.filter(
    (image) => !hasAttribute(image.attrs, "width") || !hasAttribute(image.attrs, "height")
  );
  if (imagesMissingSize.length) {
    issues.push(
      issue(
        "missing-image-size",
        "warning",
        "Images missing dimensions",
        `${imagesMissingSize.length} image(s) miss width or height attributes, which can cause layout shifts in email clients.`
      )
    );
  }

  const base64Images = images.filter((image) => /^data:image\//i.test(image.src));
  if (base64Images.length) {
    issues.push(
      issue(
        "base64-images",
        "warning",
        "Embedded base64 images found",
        `${base64Images.length} image(s) are embedded as base64. This increases HTML size and can trigger client quirks.`
      )
    );
  }

  const externalActionLinks = links.filter((link) => isHttpHref(link.href) && !isUnsubscribeHref(link.href));
  const linksWithoutUtm = externalActionLinks.filter((link) => !hasCampaignUtm(link.href));
  if (linksWithoutUtm.length) {
    issues.push(
      issue(
        "missing-utm",
        "warning",
        "Campaign links missing UTM",
        `${linksWithoutUtm.length} external action link(s) are missing utm_source, utm_medium, or utm_campaign.`
      )
    );
  }

  const utmCampaigns = new Set(
    externalActionLinks
      .map((link) => getUrlParam(link.href, "utm_campaign"))
      .filter(Boolean)
      .map((value) => value.toLowerCase())
  );
  if (utmCampaigns.size > 1) {
    issues.push(
      issue(
        "mixed-utm-campaigns",
        "warning",
        "Mixed UTM campaign names",
        `Found ${utmCampaigns.size} different utm_campaign values. Confirm this is intentional before sending.`
      )
    );
  }

  if (/\b(lorem ipsum|todo|replace me|placeholder copy|test copy)\b/i.test(source)) {
    issues.push(
      issue(
        "draft-copy-leftovers",
        "warning",
        "Draft copy leftovers found",
        "The email still contains lorem, TODO, placeholder, or test-copy language."
      )
    );
  }

  const transparentImages = images.filter((image) => /transparent|\.png(\?|$)/i.test(image.src));
  if (transparentImages.length || hasDarkModeStyleRisk(source)) {
    issues.push(
      issue(
        "dark-mode-risk",
        "info",
        "Dark-mode review recommended",
        "Transparent PNGs or hard-coded colors may invert poorly in dark-mode email clients."
      )
    );
  }

  const unsafeExternalLinks = links.filter(
    (link) => isHttpHref(link.href) && (!hasAttribute(link.attrs, "target") || !hasAttribute(link.attrs, "rel"))
  );
  if (unsafeExternalLinks.length) {
    issues.push(
      issue(
        "external-link-attrs",
        "info",
        "External links missing target or rel attributes",
        `${unsafeExternalLinks.length} external link(s) can receive basic target and rel attributes as a safe hygiene fix.`
      )
    );
  }

  issues.push(...getCompatibilityIssues(model));

  return buildResult(source, size, issues);
}

export function applySafeFixes(html, options = {}) {
  let fixedHtml = html || "";
  const appliedFixes = [];

  const commentsBefore = countMatches(fixedHtml, /<!--[\s\S]*?-->/g);
  if (commentsBefore) {
    fixedHtml = fixedHtml.replace(/<!--[\s\S]*?-->/g, "");
    appliedFixes.push({
      id: "remove-html-comments",
      title: "Removed HTML comments",
      detail: `${commentsBefore} comment block(s) removed to reduce send size and builder leakage.`
    });
  }

  const cssInlineResult = applySimpleCssInlining(fixedHtml);
  if (cssInlineResult.inlinedElementCount) {
    fixedHtml = cssInlineResult.html;
    appliedFixes.push({
      id: "inline-simple-css",
      title: "Inlined simple CSS class rules",
      detail: `${cssInlineResult.inlinedRuleCount} class rule(s) were applied to ${cssInlineResult.inlinedElementCount} element(s); ${cssInlineResult.removedStyleBlocks} fully inlined style block(s) removed.`
    });
  }

  const missingAltBefore = countMissingImageAlt(fixedHtml);
  if (missingAltBefore) {
    fixedHtml = fixedHtml.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
      if (hasAttribute(attrs, "alt")) return match;
      return `<img${attrs} alt="">`;
    });
    appliedFixes.push({
      id: "add-empty-image-alt",
      title: "Added empty alt attributes",
      detail: `${missingAltBefore} image(s) received alt="" as a conservative accessibility fallback.`
    });
  }

  const linksNeedingAttrs = countExternalLinksMissingSafeAttrs(fixedHtml);
  if (linksNeedingAttrs) {
    fixedHtml = fixedHtml.replace(/<a\b([^>]*?)>/gi, (match, attrs) => {
      const href = getAttribute(attrs, "href");
      if (!isHttpHref(href)) return match;
      let nextAttrs = attrs;
      if (!hasAttribute(nextAttrs, "target")) nextAttrs += ' target="_blank"';
      if (!hasAttribute(nextAttrs, "rel")) nextAttrs += ' rel="noopener noreferrer"';
      return `<a${nextAttrs}>`;
    });
    appliedFixes.push({
      id: "add-link-safety-attrs",
      title: "Added basic link safety attributes",
      detail: `${linksNeedingAttrs} external link(s) received target and rel attributes where missing.`
    });
  }

  const preheaderText = (options.preheaderText || "").trim();
  if (preheaderText && !hasPreheaderSignal(fixedHtml)) {
    const preheader = `<div class="preheader" style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;max-height:0;max-width:0;">${escapeHtml(preheaderText)}</div>`;
    if (/<body\b[^>]*>/i.test(fixedHtml)) {
      fixedHtml = fixedHtml.replace(/<body\b([^>]*)>/i, `<body$1>\n    ${preheader}`);
    } else {
      fixedHtml = `${preheader}\n${fixedHtml}`;
    }
    appliedFixes.push({
      id: "insert-hidden-preheader",
      title: "Inserted hidden preheader",
      detail: "A hidden preheader block was inserted near the top of the email."
    });
  }

  const before = analyzeEmailHtml(html);
  const after = analyzeEmailHtml(fixedHtml);

  return {
    fixedHtml,
    appliedFixes,
    before,
    after,
    diffSummary: buildDiffSummary(before, after, html || "", fixedHtml)
  };
}

export function buildQaReport(result, appliedFixes = []) {
  const groupedIssues = groupIssues(result.issues);
  return {
    generatedAt: new Date().toISOString(),
    status: result.status,
    summary: result.summary,
    htmlSize: {
      bytes: result.sizeBytes,
      formatted: formatBytes(result.sizeBytes)
    },
    fixesApplied: appliedFixes,
    groupedIssues,
    issues: result.issues.map((item) => ({
      id: item.id,
      severity: item.severity,
      title: item.title,
      detail: item.detail,
      group: item.group,
      why: item.why,
      nextAction: item.nextAction,
      source: item.source || "local-rule"
    }))
  };
}

export function buildReportHtml(report) {
  const issueGroups = [
    ["auto-fix", "Can be fixed automatically"],
    ["needs-input", "Needs your input"],
    ["manual-review", "Manual review"],
    ["compatibility", "Compatibility warning"]
  ]
    .map(([groupId, title]) => {
      const items = report.issues.filter((item) => item.group === groupId);
      if (!items.length) return "";
      const rows = items
        .map(
          (item) => `<li><strong>${escapeHtml(item.severity.toUpperCase())}: ${escapeHtml(item.title)}</strong><br>${escapeHtml(item.detail)}<br><em>Why it matters:</em> ${escapeHtml(item.why || "")}<br><em>Next action:</em> ${escapeHtml(item.nextAction || "")}<br><small>${escapeHtml(item.source || "local-rule")}</small></li>`
        )
        .join("");
      return `<h3>${escapeHtml(title)}</h3><ul>${rows}</ul>`;
    })
    .join("");
  const fixes = report.fixesApplied
    .map((item) => `<li><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.detail)}</li>`)
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Email QA Report</title>
    <style>
      body { font-family: system-ui, sans-serif; line-height: 1.5; color: #171b22; padding: 32px; }
      h1, h2 { margin-bottom: 8px; }
      .status { display: inline-block; padding: 6px 10px; border: 1px solid #d9dee7; border-radius: 6px; }
      li { margin-bottom: 10px; }
    </style>
  </head>
  <body>
    <h1>Email QA Report</h1>
    <p class="status">${escapeHtml(report.status)}</p>
    <p>This report is a pre-send QA artifact. It lists safe fixes already applied and the issues that still need human review before a campaign is sent.</p>
    <p>Generated: ${escapeHtml(report.generatedAt)}</p>
    <p>HTML size: ${escapeHtml(report.htmlSize.formatted)}</p>
    <h2>Summary</h2>
    <ul>
      <li>Critical: ${report.summary.critical}</li>
      <li>Warning: ${report.summary.warning}</li>
      <li>Info: ${report.summary.info}</li>
    </ul>
    <h2>Fixes Applied</h2>
    <ul>${fixes || "<li>No fixes applied.</li>"}</ul>
    <h2>Remaining Issues</h2>
    ${issueGroups || "<p>No issues found by this verifier.</p>"}
  </body>
</html>`;
}

function buildResult(source, size, issues) {
  const sortedIssues = issues
    .map(enrichIssue)
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const summary = {
    critical: sortedIssues.filter((item) => item.severity === "critical").length,
    warning: sortedIssues.filter((item) => item.severity === "warning").length,
    info: sortedIssues.filter((item) => item.severity === "info").length
  };
  const status = summary.critical
    ? "Not send-ready"
    : summary.warning
      ? "Review before send"
      : "Send-ready";

  return {
    source,
    sizeBytes: size,
    sizeFormatted: formatBytes(size),
    status,
    summary,
    issues: sortedIssues
  };
}

function issue(id, severity, title, detail) {
  return { id, severity, title, detail };
}

function groupIssues(issues) {
  return issues.reduce((groups, item) => {
    const group = item.group || "manual-review";
    groups[group] = (groups[group] || 0) + 1;
    return groups;
  }, {});
}

function enrichIssue(item) {
  const guidance = ISSUE_GUIDANCE[item.id] || DEFAULT_GUIDANCE;
  return {
    ...item,
    group: item.group || guidance.group,
    why: item.why || guidance.why,
    nextAction: item.nextAction || guidance.nextAction
  };
}

function isPlaceholderHref(href) {
  const value = (href || "").trim().toLowerCase();
  return (
    value === "#" ||
    value === "" ||
    value.startsWith("javascript:") ||
    value.includes("example.com") ||
    value.includes("todo") ||
    value.includes("replace-me")
  );
}

function hasUnsubscribeSignal(source, links, text) {
  if (/\*?\|unsub\|?\*?/i.test(source)) return true;
  if (/unsubscribe|manage preferences|email preferences|opt out/i.test(text)) return true;
  return links.some((link) => isUnsubscribeHref(link.href));
}

function isUnsubscribeHref(href) {
  return /unsubscribe|preferences|opt-out|optout/i.test(href || "");
}

function detectTokenProblems(source) {
  const problems = [];
  if (countMatches(source, /\{\{/g) !== countMatches(source, /\}\}/g)) {
    problems.push("Handlebars-style token braces are unbalanced.");
  }
  if (countMatches(source, /\*\|/g) !== countMatches(source, /\|\*/g)) {
    problems.push("Mailchimp-style merge tag markers are unbalanced.");
  }
  if (/%[A-Z0-9_]+\b(?!%)/.test(source)) {
    problems.push("Percent-style token appears to be missing a closing percent sign.");
  }
  return problems;
}

function hasPreheaderSignal(source) {
  const firstChunk = source.slice(0, 1200);
  return /preheader|display\s*:\s*none|visibility\s*:\s*hidden|max-height\s*:\s*0/i.test(firstChunk);
}

function hasCampaignUtm(href) {
  return Boolean(getUrlParam(href, "utm_source") && getUrlParam(href, "utm_medium") && getUrlParam(href, "utm_campaign"));
}

function getUrlParam(href, paramName) {
  try {
    const url = new URL(href);
    return url.searchParams.get(paramName) || "";
  } catch {
    return "";
  }
}

function hasDarkModeStyleRisk(source) {
  return /background(-color)?\s*:\s*#?(fff|ffffff|000|000000)\b/i.test(source) && /color\s*:\s*#?(fff|ffffff|000|000000)\b/i.test(source);
}

function countMissingImageAlt(source) {
  return [...source.matchAll(/<img\b([^>]*?)>/gi)].filter((match) => !hasAttribute(match[1], "alt")).length;
}

function countExternalLinksMissingSafeAttrs(source) {
  return [...source.matchAll(/<a\b([^>]*?)>/gi)].filter((match) => {
    const attrs = match[1];
    return isHttpHref(getAttribute(attrs, "href")) && (!hasAttribute(attrs, "target") || !hasAttribute(attrs, "rel"));
  }).length;
}

function buildDiffSummary(before, after, beforeHtml, afterHtml) {
  const sizeDelta = after.sizeBytes - before.sizeBytes;
  const issueDelta = after.issues.length - before.issues.length;
  const lines = [
    `HTML size: ${formatBytes(before.sizeBytes)} -> ${formatBytes(after.sizeBytes)} (${sizeDelta >= 0 ? "+" : ""}${sizeDelta} bytes)`,
    `Issues: ${before.issues.length} -> ${after.issues.length} (${issueDelta >= 0 ? "+" : ""}${issueDelta})`,
    `Critical: ${before.summary.critical} -> ${after.summary.critical}`,
    `Warnings: ${before.summary.warning} -> ${after.summary.warning}`,
    `Changed characters: ${countChangedCharacters(beforeHtml, afterHtml)}`
  ];
  return lines.join("\n");
}

function countChangedCharacters(before, after) {
  const max = Math.max(before.length, after.length);
  let changed = 0;
  for (let index = 0; index < max; index += 1) {
    if (before[index] !== after[index]) changed += 1;
  }
  return changed;
}
