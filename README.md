# Email Campaign Send-Ready QA Demo

Browser-local throwaway demo for testing a post-AI email HTML verifier/fixer.

## Run

Open `index.html` directly in a browser, or run a static server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

## Check

```bash
npm run check
```

## Scope

- Paste or load sample HTML.
- Run deterministic pre-send checks.
- Apply conservative safe fixes.
- Export fixed HTML and a QA report.
- No backend, accounts, telemetry, storage, or network calls.

## Current Strengthening Layer

- `src/htmlModel.js` is the parser/model adapter boundary. It keeps rule logic away from direct extraction details.
- `src/compatibility.js` is the compatibility adapter. It currently uses a local deterministic baseline and is shaped to host caniemail/doiuse data later.
- `src/cssInline.js` applies simple local class-rule CSS inlining when it can do so without fetching remote resources.
- `src/fixtures.js` includes broken, ChatGPT-fixed, Gmail clipping, known-good, CSS-not-inlined, and Mailchimp merge-tag samples.

## Active Workflow

- Issues are grouped into `Can fix automatically`, `Needs your input`, `Manual review`, and `Compatibility warning`.
- Each issue includes why it matters and what the user should do next.
- `Verify after ChatGPT` is a first-class demo mode.
- Safe fixes update the fixed HTML preview and the downloadable QA report.
- The report is written as a pre-send artifact that can be shared with a client or teammate.

## Verified Package Candidates

These were checked through npm but are not runtime dependencies yet:

- `parse5@8.0.1`
- `htmlparser2@12.0.0`
- `juice@12.1.1`
- `@jsx-email/doiuse-email@1.0.4`
