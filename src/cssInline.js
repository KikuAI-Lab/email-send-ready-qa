import { getAttribute, hasAttribute } from "./htmlModel.js";

export function applySimpleCssInlining(html) {
  const source = html || "";
  const styleBlocks = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
  if (!styleBlocks.length) {
    return {
      html: source,
      inlinedElementCount: 0,
      inlinedRuleCount: 0,
      removedStyleBlocks: 0
    };
  }

  const rules = [];
  let canRemoveStyleBlocks = true;

  for (const block of styleBlocks) {
    const parsed = parseSimpleClassRules(block[1]);
    rules.push(...parsed.rules);
    if (!parsed.canFullyInline) canRemoveStyleBlocks = false;
  }

  if (!rules.length) {
    return {
      html: source,
      inlinedElementCount: 0,
      inlinedRuleCount: 0,
      removedStyleBlocks: 0
    };
  }

  let inlinedElementCount = 0;
  let nextHtml = source.replace(/<([a-z][a-z0-9:-]*)\b([^>]*?)>/gi, (match, tagName, attrs) => {
    if (tagName.toLowerCase() === "style") return match;
    if (!hasAttribute(attrs, "class")) return match;

    const classes = getAttribute(attrs, "class").split(/\s+/).filter(Boolean);
    const declarations = rules
      .filter((rule) => classes.includes(rule.className))
      .map((rule) => rule.declarations)
      .join("; ");

    if (!declarations) return match;

    inlinedElementCount += 1;
    const existingStyle = getAttribute(attrs, "style");
    const nextStyle = mergeStyleDeclarations(declarations, existingStyle);

    if (hasAttribute(attrs, "style")) {
      return `<${tagName}${attrs.replace(/\bstyle\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i, `style="${nextStyle}"`)}>`;
    }

    return `<${tagName}${attrs} style="${nextStyle}">`;
  });

  let removedStyleBlocks = 0;
  if (canRemoveStyleBlocks) {
    removedStyleBlocks = styleBlocks.length;
    nextHtml = nextHtml.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  }

  return {
    html: nextHtml,
    inlinedElementCount,
    inlinedRuleCount: rules.length,
    removedStyleBlocks
  };
}

function parseSimpleClassRules(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  const rules = [];
  let leftovers = withoutComments;

  for (const match of withoutComments.matchAll(/\.([a-zA-Z0-9_-]+)\s*\{([^{}@]+)\}/g)) {
    const declarations = normalizeDeclarations(match[2]);
    if (declarations) {
      rules.push({
        className: match[1],
        declarations
      });
    }
    leftovers = leftovers.replace(match[0], "").trim();
  }

  return {
    rules,
    canFullyInline: leftovers.length === 0 && rules.length > 0
  };
}

function normalizeDeclarations(value) {
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("; ");
}

function mergeStyleDeclarations(first, second) {
  return [first, second]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("; ");
}
