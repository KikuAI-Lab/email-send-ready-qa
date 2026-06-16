# GitHub Prior Art Pass: Email QA Demo

Date: 2026-06-16

## Goal

Find GitHub projects that can strengthen the current browser-local Email Send-Ready QA demo without turning it into a generic email builder or a heavy Litmus clone.

The target product remains:

- deterministic post-AI verifier/fixer;
- browser-local where possible;
- fixed HTML plus client-ready QA report;
- no backend, telemetry, storage, ESP accounts, or render farm in the first proof.

## Search Notes

Initial `gh search repos` queries found useful candidates for `caniemail`, `email-lint`, and `mjml`, then GitHub API search hit rate limits. Follow-up verification used primary GitHub repository pages through web search.

## Strongest Candidates

| Candidate | Type | Signal | Fit | Limit | Decision |
| --- | --- | --- | --- | --- | --- |
| [hteumeuleu/caniemail](https://github.com/hteumeuleu/caniemail) | Email client support data | ~927 stars, active data repo, MIT | Best source for client-specific HTML/CSS support rules | Data needs shaping into buyer-readable issues | Try first as rule/data source |
| [stewartjarod/email-lint](https://github.com/stewartjarod/email-lint) | Caniemail-powered linter | Small but current, CLI + library, 2026 updates | Directly adjacent to our missing compatibility layer | Very young project, few stars, no releases visible | Study architecture; do not depend blindly yet |
| [shellscape/doiuse-email](https://github.com/shellscape/doiuse-email) | Programmatic caniemail checker | MIT, package API `doIUseEmail(html, options)` | Good library shape for Gmail/Outlook compatibility checks | More generic CSS support output than our send-ready report | Prototype behind an adapter |
| [Automattic/juice](https://github.com/Automattic/juice) | CSS inliner | Mature, 832 commits, MIT | Adds a valuable "prepare/fix" action, not just diagnosis | Can pull/inline remote resources if configured poorly | Use only with no-remote options |
| [inikulin/parse5](https://github.com/inikulin/parse5) | Spec-compliant HTML parser | ~3.9k stars, latest release Apr 2026 | Replace regex parser before serious productization | Node-first; browser bundle size should be checked | Best parser for correctness |
| [fb55/htmlparser2](https://github.com/fb55/htmlparser2) | Fast forgiving parser | ~4.8k stars, latest release Mar 2026 | Faster/lighter alternative if parse5 is too heavy | Less spec-compliant; email HTML can be malformed | Consider for browser bundle |
| [maizzle/framework](https://github.com/maizzle/framework) | Email build framework | ~1.6k stars, latest release Jun 2026 | Good source of email-builder assumptions and fixtures | Too much framework for our product | Study, do not adopt |
| [resend/react-email](https://github.com/resend/react-email) | Email component ecosystem | ~19.3k stars, latest release Jun 2026 | Useful for future React Email input/fixtures and dev audience | Not first ICP; dev-heavy | Later integration angle |
| [emailmonday/Cerberus](https://github.com/emailmonday/Cerberus) | Robust template patterns | ~5k stars | Good "known-good" fixtures and issue inspiration | Not a linter/fixer library | Use as positive fixture source |
| [leemunroe/responsive-html-email-template](https://github.com/leemunroe/responsive-html-email-template) | Popular simple template | ~13k stars | Good baseline fixture and real issue mining | Template project, not tooling | Use as fixture/issue corpus |
| [mailchimp/email-blueprints](https://github.com/mailchimp/email-blueprints) | Legacy Mailchimp templates | ~7k stars | Source for Mailchimp merge tags/template patterns | Older patterns, may be stale | Mine for merge-tag fixtures only |
| [foundation/foundation-emails](https://github.com/foundation/foundation-emails) / [foundation/inky](https://github.com/foundation/inky) | Responsive email framework | Mature ecosystem | Good source of compatibility expectations | Too large for proof demo | Reference only |

## What Should Strengthen Our Demo Next

### 1. Replace Regex Parsing With an Adapter

Current `src/emailQa.js` is good for proof speed, but regex parsing is the weakest technical point.

Recommended next step:

- create `src/htmlModel.js`;
- expose `parseEmailHtml(html)` and `serializeEmailHtml(model)`;
- start with current regex implementation behind the adapter;
- then test `parse5` and `htmlparser2` without touching rule logic.

This keeps the product rule engine stable while parser choice remains reversible.

### 2. Add a Caniemail Compatibility Layer

The most valuable upgrade is not more handmade rules. It is a client-support layer:

- Gmail preset;
- Outlook preset;
- "agency default" preset: Gmail + Outlook + Apple Mail + Yahoo;
- output collapsed into buyer-readable issues.

Best path:

1. Spike `@jsx-email/doiuse-email` first because it has a programmatic API.
2. Study `email-lint` for severity grouping and React Email awareness.
3. If both are awkward, ingest caniemail data directly later.

### 3. Turn CSS Inlining Into a Safe Fix

`juice` is a strong candidate for a paid-feeling fix:

- before: `<style>` in head, CSS not fully inline;
- after: inline-safe HTML;
- report: "CSS inlined for email client compatibility."

Guardrail:

- disable remote resource inlining;
- no URL fetching;
- no external stylesheets in browser-local mode.

This is a better product move than adding 20 more warning-only checks.

### 4. Build a Fixture Corpus From Known-Good and Known-Bad Sources

Use:

- Cerberus templates as known-good responsive examples;
- Lee Munroe template as a simple baseline;
- Mailchimp Blueprints for merge-tag and ESP template-language cases;
- GitHub issues from these repos for real client-specific failure examples.

Fixture categories:

- known-good template should pass or only produce low-level warnings;
- Gmail clipping/size fixture;
- Outlook CSS break fixture;
- AI-fixed-but-still-risky fixture;
- Mailchimp/Klaviyo/Handlebars token fixture;
- CSS-not-inlined fixture.

### 5. Avoid Becoming an Email Builder

Maizzle, React Email, Foundation, and Inky prove the build-framework world is crowded and powerful. Our product should not compete there.

Keep the wedge:

- final pre-send verifier;
- post-AI verification;
- safe fixes;
- client-ready report;
- paste/export workflow.

## Recommended Next Implementation Order

1. Add parser adapter and fixture snapshots.
2. Add `doiuse-email` spike behind a compatibility adapter.
3. Add `juice` spike for "Inline CSS" safe fix with no-remote guard.
4. Add known-good/known-bad fixture corpus from Cerberus, Lee Munroe, and Mailchimp Blueprints.
5. Re-run the demo proof against ChatGPT-fixed samples and known email framework samples.

## 2026-06-16 Implementation Decision

The first strengthening pass implemented the reversible adapter layer before adding package runtime dependencies:

- `src/htmlModel.js` now owns extraction and model shaping.
- `src/compatibility.js` now owns a local compatibility baseline and can later host caniemail/doiuse output.
- `src/cssInline.js` now provides a conservative local CSS inlining safe fix for simple class rules.
- The fixture corpus now includes known-good, CSS-not-inlined, and Mailchimp merge-tag samples.

Package candidates verified through npm:

- `parse5@8.0.1`
- `htmlparser2@12.0.0`
- `juice@12.1.1`
- `@jsx-email/doiuse-email@1.0.4`

Decision: do not add these as browser runtime dependencies until adapter tests prove which one materially improves the send-ready artifact. This preserves the browser-local no-network proof while making the next spike small and reversible.

## Product Implication

The GitHub pass strengthens the product thesis:

- There is strong OSS evidence around email compatibility pain.
- The market has build frameworks and lint libraries, but our wedge is a simpler send-ready artifact for non-enterprise operators.
- The current demo should become more deterministic and credible by borrowing support data and parser/inliner primitives, not by becoming a new framework.
