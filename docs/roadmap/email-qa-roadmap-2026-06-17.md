# Email QA Roadmap

Date: 2026-06-17

## Current State

The current artifact is useful as a proof demo, not yet as a product.

It already proves several important things:

- deterministic checks can catch residual risks after a ChatGPT-style cleanup;
- safe fixes can produce a changed HTML artifact, not just advice;
- browser-local operation is feasible;
- compatibility warnings and source labels can fit into the same report;
- the project has tests, fixtures, evidence, and a clear adapter path.

It is still "mute" for a real buyer because:

- it does not yet guide a non-technical user through what to do next;
- the report is not polished enough to send to a client as proof of QA;
- safe fixes are too few to feel like a paid repair pack;
- compatibility data is still a local baseline, not caniemail-backed;
- the fixture corpus is not yet strong enough to prove real-world coverage;
- there is no public page, search surface, pricing test, or signup/payment signal.

## Product Thesis

This product should not be an email builder, deliverability platform, or generic AI advisor.

The product should be:

> A browser-local pre-send verifier and repair pack for HTML email campaigns, especially after AI or ESP-builder editing.

The first buyer should be:

- email freelancers;
- small email agencies;
- Klaviyo/Mailchimp/HubSpot operators doing client-facing campaign work.

The paid artifact should be:

- fixed HTML;
- a before/after diff;
- a client-ready QA report;
- clear remaining manual risks.

## North Star

User arrives with an email HTML file or pasted code.

Within two minutes they can:

1. see whether it is send-ready;
2. apply safe fixes;
3. download fixed HTML;
4. download/share a client-ready QA report;
5. understand exactly what still requires manual judgment.

## Phase 0: Keep The Proof Honest

Status: mostly done.

Goal: preserve the original proof while making the next steps easy.

Done:

- browser-local static demo;
- no-network/no-storage checks;
- broken sample;
- ChatGPT-fixed sample;
- Gmail clipping sample;
- known-good sample;
- CSS-not-inlined sample;
- Mailchimp merge-tag sample;
- parser/model adapter;
- compatibility adapter;
- simple CSS inline safe fix;
- test coverage and evidence.

Remaining:

- make the UI explain next actions better;
- make export report more buyer-facing;
- keep old screenshots/evidence organized or ignored before commit.

Acceptance:

- `npm run check` passes;
- browser smoke passes;
- user can see the difference between "fixed automatically" and "manual review".

## Phase 1: Make It Actively Useful

Goal: turn the demo from a diagnostic surface into an actionable repair workflow.

Build:

- grouped issue sections:
  - `Can fix automatically`;
  - `Needs your input`;
  - `Manual review`;
  - `Compatibility warning`;
- per-issue next action text;
- per-issue "why it matters" text;
- improved report export with:
  - campaign status;
  - before/after counts;
  - fixes applied;
  - unresolved blockers;
  - client-safe wording;
- fixed HTML preview pane;
- "Copy fixed HTML" reliability fallback when clipboard fails;
- explicit "Files stay in your browser" copy inside the app;
- "Verify after ChatGPT" as a first-class mode, not just a sample note.

Do not build:

- account system;
- payment;
- backend;
- ESP import;
- email sending.

Acceptance:

- a non-technical operator can tell what to do next without reading code;
- safe fixes feel like a repair pack, not a warning list;
- QA report can plausibly be sent to a client.

## Phase 2: Improve Technical Credibility

Goal: replace fragile internal pieces only where it improves trust.

Build:

- keep `src/htmlModel.js` as the stable adapter;
- test `parse5` behind the adapter;
- compare `parse5` vs current extractor on all fixtures;
- keep current extractor only if it performs better for prototype constraints;
- test `@jsx-email/doiuse-email` behind `src/compatibility.js`;
- map compatibility output into buyer-readable issues;
- test `juice` behind the CSS fix adapter;
- enforce no remote fetching or external stylesheet loading;
- add fixture snapshots before and after fixes.

Acceptance:

- parser swap does not change UI/report contracts;
- compatibility issues become more credible and client-specific;
- CSS inline fix handles real simple campaign patterns better than current local inliner;
- no runtime network path is introduced.

Kill/pause criteria:

- package integration bloats the app without improving report quality;
- browser bundle becomes too heavy for a simple local tool;
- package behavior requires server-side execution for safe operation.

## Phase 3: Build A Real Fixture Corpus

Goal: make claims defensible with examples.

Build fixtures for:

- Gmail clipping;
- missing preheader;
- broken/placeholder links;
- mixed UTM campaigns;
- Mailchimp merge tags;
- Klaviyo/Handlebars-style tags;
- HubSpot token style;
- CSS not inlined;
- unsupported CSS layout;
- image alt/dimensions;
- base64 images;
- known-good conservative template;
- ChatGPT-fixed-but-still-risky output.

Sources to mine:

- Cerberus;
- Lee Munroe responsive template;
- Mailchimp Email Blueprints;
- public GitHub issues from email framework repos;
- Nick-generated AI outputs;
- hand-built bad cases.

Acceptance:

- at least 25 fixtures;
- each rule has at least one positive and one negative fixture when reasonable;
- every claim on the public page maps to a fixture or documented rule.

## Phase 4: Validation With Real Operators

Goal: answer whether people would actually use and pay.

Target testers:

- 5 email freelancers;
- 3 small agency operators;
- 2 ecommerce/lifecycle marketers.

Show:

- one broken campaign;
- one ChatGPT-fixed campaign;
- one CSS-not-inlined campaign;
- final report export.

Questions:

- Would you use this before client approval?
- Would this save at least 15 minutes per campaign?
- Would you send the report to a client?
- What would make this worth paying for?
- What would stop you from using it?

Signals:

- strong: asks for own file test, asks for export, asks for pricing, asks for Klaviyo/Mailchimp-specific mode;
- weak: says "nice checker" but does not care about fixed HTML/report;
- kill: prefers ChatGPT/manual checklist and sees no need for verifier artifact.

Acceptance:

- at least 3 real operators try their own HTML;
- at least 2 say the report/export is the valuable part;
- at least 1 asks for continued use or pricing.

## Phase 5: Public Proof Surface

Goal: create exact-intent discovery without broad marketing.

Build pages:

- `/gmail-clipping-checker`;
- `/html-email-pre-send-checker`;
- `/klaviyo-email-qa-checklist`;
- `/mailchimp-gmail-clipping-checker`;
- `/chatgpt-html-email-qa`;
- `/email-css-inliner-checker`;
- `/email-preheader-checker`;
- `/email-utm-checker`.

Each page should include:

- one direct tool action;
- one sample broken email;
- one before/after screenshot;
- one downloadable sample report;
- exact limitation notes;
- no inflated deliverability claims.

Acceptance:

- static-hostable product page exists;
- exact-intent page has the tool above the fold;
- at least one page targets the post-AI angle directly.

## Phase 6: Monetization Test

Goal: test willingness to pay before building accounts.

Test offers:

- free: analyze and preview issues;
- paid one-off: download fixed HTML plus client-ready report;
- paid monthly: saved local report templates and bulk campaign checks;
- agency tier later: team/seats/history only if demand appears.

Suggested starting prices:

- one-off report: $9-19;
- solo monthly: $19-29;
- small agency monthly: $49-99.

Implementation options:

- simplest: Gumroad/LemonSqueezy-style payment link for a gated download;
- later: real checkout and license key;
- avoid accounts until payment signal exists.

Acceptance:

- at least one real payment or strong pre-payment signal;
- buyers value export/report, not just free checking;
- support burden stays low.

## Phase 7: Productization

Goal: make it reliable enough to publish under KikuAI/KikuTools.

Build:

- clean app shell;
- polished responsive UI;
- report branding;
- privacy copy;
- fixture-backed public claims;
- optional local file upload;
- optional report PDF;
- optional JSON report for agents;
- issue taxonomy versioning;
- rule version and report version in exports;
- public README and changelog.

Acceptance:

- no-network/no-storage boundary is testable;
- all export formats work;
- live page passes smoke on desktop and mobile;
- public claims are supported by fixtures/evidence.

## Phase 8: Agent-Callable Layer

Goal: make AI agents amplify the product instead of replacing it.

Build:

- JSON report schema;
- local API-like function contract;
- CLI wrapper;
- prompt pack: "Use ChatGPT to edit, then verify here";
- sample agent workflow:
  - generate email;
  - run verifier;
  - apply safe fixes;
  - return fixed HTML and report.

Acceptance:

- an agent can call the checker/fixer and consume structured output;
- product is positioned as a deterministic verifier, not an AI writing tool.

## What To Do Next

The next highest-leverage task is Phase 1.

Build:

- grouped issue sections;
- stronger per-issue action text;
- client-ready report export;
- fixed HTML preview;
- first-class "Verify after ChatGPT" mode.

Reason:

- this directly addresses the current "mute product" problem;
- it makes the existing proof understandable to real operators;
- it improves validation quality before we add heavier dependencies or public pages.

## Current Verdict

The product is not dead, but it is not yet actively useful enough.

It has technical proof value now.

It becomes product value when the user can:

- understand next action immediately;
- apply safe fixes confidently;
- send the report to a client;
- see why this is better than only asking ChatGPT.

Until then, it should remain a proof candidate, not a launched product.
