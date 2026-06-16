import { countMatches } from "./htmlModel.js";

export const COMPATIBILITY_SOURCE = {
  id: "local-compatibility-baseline",
  upstreamCandidates: ["caniemail", "@jsx-email/doiuse-email"],
  mode: "deterministic-local"
};

export function getCompatibilityIssues(model) {
  const issues = [];
  const css = model.styleBlocks.map((block) => block.css).join("\n");
  const source = model.source;

  if (model.styleBlocks.length) {
    issues.push(
      compatibilityIssue(
        "css-not-inlined",
        "warning",
        "CSS is not fully inlined",
        `${model.styleBlocks.length} <style> block(s) found. Many production email workflows inline CSS before sending.`
      )
    );
  }

  if (/display\s*:\s*grid/i.test(css) || /display\s*:\s*grid/i.test(source)) {
    issues.push(
      compatibilityIssue(
        "css-grid-email-risk",
        "warning",
        "CSS Grid requires email-client review",
        "CSS Grid support is not safe enough for a conservative email pre-send gate. Use table or hybrid layout for critical content."
      )
    );
  }

  if (/position\s*:\s*fixed/i.test(css) || /position\s*:\s*fixed/i.test(source)) {
    issues.push(
      compatibilityIssue(
        "fixed-position-email-risk",
        "warning",
        "Fixed positioning is risky in email",
        "Fixed-position elements are fragile across email clients and should not carry critical campaign content."
      )
    );
  }

  if (/<(video|form|input|script)\b/i.test(source)) {
    issues.push(
      compatibilityIssue(
        "interactive-html-email-risk",
        "critical",
        "Interactive HTML found",
        "Video, form, input, or script tags require a fallback path before this email is send-ready."
      )
    );
  }

  if (/@font-face/i.test(css) || /fonts\.googleapis\.com/i.test(source)) {
    issues.push(
      compatibilityIssue(
        "web-font-email-risk",
        "info",
        "Web font fallback review recommended",
        "Web fonts need robust fallback fonts because email-client support is uneven."
      )
    );
  }

  const mediaQueryCount = countMatches(css, /@media\b/gi);
  if (mediaQueryCount > 3) {
    issues.push(
      compatibilityIssue(
        "complex-media-query-risk",
        "info",
        "Complex responsive CSS",
        `${mediaQueryCount} media queries found. Confirm mobile-critical content still works when media queries are ignored.`
      )
    );
  }

  return issues;
}

function compatibilityIssue(id, severity, title, detail) {
  return {
    id,
    severity,
    title,
    detail,
    source: COMPATIBILITY_SOURCE.id
  };
}
