import { fixtures } from "./fixtures.js";
import {
  analyzeEmailHtml,
  applySafeFixes,
  buildQaReport,
  buildReportHtml,
  formatBytes
} from "./emailQa.js";

const state = {
  currentHtml: "",
  fixedHtml: "",
  lastResult: null,
  lastFixResult: null,
  appliedFixes: []
};

const elements = {
  sampleSelect: document.querySelector("#sampleSelect"),
  htmlInput: document.querySelector("#htmlInput"),
  preheaderInput: document.querySelector("#preheaderInput"),
  analyzeBtn: document.querySelector("#analyzeBtn"),
  fixBtn: document.querySelector("#fixBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  modeBrokenBtn: document.querySelector("#modeBrokenBtn"),
  modeChatGptBtn: document.querySelector("#modeChatGptBtn"),
  modeCssBtn: document.querySelector("#modeCssBtn"),
  downloadHtmlBtn: document.querySelector("#downloadHtmlBtn"),
  downloadReportBtn: document.querySelector("#downloadReportBtn"),
  statusText: document.querySelector("#statusText"),
  issueCount: document.querySelector("#issueCount"),
  htmlSize: document.querySelector("#htmlSize"),
  fixCount: document.querySelector("#fixCount"),
  summary: document.querySelector("#summary"),
  fixes: document.querySelector("#fixes"),
  issues: document.querySelector("#issues"),
  diff: document.querySelector("#diff"),
  fixedPreview: document.querySelector("#fixedPreview")
};

init();

function init() {
  for (const sample of fixtures) {
    const option = document.createElement("option");
    option.value = sample.id;
    option.textContent = sample.name;
    elements.sampleSelect.append(option);
  }

  elements.sampleSelect.addEventListener("change", handleSampleChange);
  elements.analyzeBtn.addEventListener("click", handleAnalyze);
  elements.fixBtn.addEventListener("click", handleFix);
  elements.copyBtn.addEventListener("click", handleCopy);
  elements.modeBrokenBtn.addEventListener("click", () => loadSample("broken-agency-draft"));
  elements.modeChatGptBtn.addEventListener("click", () => loadSample("chatgpt-fixed-still-risky"));
  elements.modeCssBtn.addEventListener("click", () => loadSample("css-not-inlined"));
  elements.downloadHtmlBtn.addEventListener("click", handleDownloadHtml);
  elements.downloadReportBtn.addEventListener("click", handleDownloadReport);
  elements.htmlInput.addEventListener("input", () => {
    state.currentHtml = elements.htmlInput.value;
    renderIdle();
  });

  loadSample("broken-agency-draft");
}

function handleSampleChange(event) {
  if (!event.target.value) return;
  loadSample(event.target.value);
}

function loadSample(sampleId) {
  const sample = fixtures.find((item) => item.id === sampleId);
  if (!sample) return;
  elements.sampleSelect.value = sampleId;
  elements.htmlInput.value = sample.html;
  state.currentHtml = sample.html;
  state.fixedHtml = "";
  state.lastFixResult = null;
  state.appliedFixes = [];
  analyzeAndRender(sample.html);
}

function handleAnalyze() {
  state.currentHtml = elements.htmlInput.value;
  state.fixedHtml = "";
  state.lastFixResult = null;
  state.appliedFixes = [];
  analyzeAndRender(state.currentHtml);
}

function handleFix() {
  state.currentHtml = elements.htmlInput.value;
  const fixResult = applySafeFixes(state.currentHtml, {
    preheaderText: elements.preheaderInput.value
  });
  state.fixedHtml = fixResult.fixedHtml;
  state.lastFixResult = fixResult;
  state.lastResult = fixResult.after;
  state.appliedFixes = fixResult.appliedFixes;
  elements.htmlInput.value = fixResult.fixedHtml;
  renderResult(fixResult.after, fixResult.appliedFixes, fixResult.diffSummary);
}

async function handleCopy() {
  const value = getExportHtml();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    elements.copyBtn.textContent = "Copied";
  } catch {
    elements.htmlInput.focus();
    elements.htmlInput.select();
    elements.copyBtn.textContent = "Select and copy";
  }
  window.setTimeout(() => {
    elements.copyBtn.textContent = "Copy Fixed HTML";
  }, 1200);
}

function handleDownloadHtml() {
  const value = getExportHtml();
  if (!value) return;
  downloadFile("fixed-email.html", value, "text/html");
}

function handleDownloadReport() {
  if (!state.lastResult) return;
  const report = buildQaReport(state.lastResult, state.appliedFixes);
  downloadFile("qa-report.html", buildReportHtml(report), "text/html");
}

function analyzeAndRender(html) {
  const result = analyzeEmailHtml(html);
  state.lastResult = result;
  renderResult(result, [], "No fixes applied yet.");
}

function renderIdle() {
  const size = new TextEncoder().encode(elements.htmlInput.value || "").length;
  elements.statusText.textContent = "Edited, not analyzed";
  elements.issueCount.textContent = "-";
  elements.htmlSize.textContent = formatBytes(size);
  elements.fixCount.textContent = String(state.appliedFixes.length);
  elements.fixedPreview.textContent = "Analyze or apply safe fixes to preview export-ready HTML.";
}

function renderResult(result, fixes, diffText) {
  elements.statusText.textContent = result.status;
  elements.issueCount.textContent = String(result.issues.length);
  elements.htmlSize.textContent = result.sizeFormatted;
  elements.fixCount.textContent = String(fixes.length);

  elements.summary.innerHTML = "";
  for (const item of [
    ["Critical", result.summary.critical],
    ["Warning", result.summary.warning],
    ["Info", result.summary.info]
  ]) {
    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `<span>${item[0]}</span><strong>${item[1]}</strong>`;
    elements.summary.append(div);
  }

  elements.fixes.innerHTML = "";
  if (fixes.length) {
    for (const fix of fixes) {
      const div = document.createElement("div");
      div.className = "fix-item";
      div.innerHTML = `<strong>${escapeHtml(fix.title)}</strong><br>${escapeHtml(fix.detail)}`;
      elements.fixes.append(div);
    }
  }

  elements.issues.innerHTML = "";
  if (result.issues.length) {
    for (const group of issueGroups(result.issues)) {
      const section = document.createElement("section");
      section.className = "issue-group";
      section.innerHTML = `
        <div class="issue-group-header">
          <h3>${escapeHtml(group.title)}</h3>
          <span>${group.items.length}</span>
        </div>
      `;

      for (const item of group.items) {
        const div = document.createElement("div");
        div.className = `issue-item severity-${item.severity}`;
        div.innerHTML = `
          <h4><span class="pill pill-${item.severity}">${item.severity}</span>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.detail)}</p>
          <p><strong>Why it matters:</strong> ${escapeHtml(item.why || "")}</p>
          <p><strong>Next action:</strong> ${escapeHtml(item.nextAction || "")}</p>
          <p class="issue-source">${escapeHtml(item.source || "local-rule")}</p>
        `;
        section.append(div);
      }

      elements.issues.append(section);
    }
  } else {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.textContent = "No issues found by this demo rule set.";
    elements.issues.append(div);
  }

  elements.diff.textContent = diffText || "No diff yet.";
  elements.fixedPreview.textContent = getExportHtml() || "Apply safe fixes to preview export-ready HTML.";
}

function getExportHtml() {
  return state.fixedHtml || elements.htmlInput.value || "";
}

function downloadFile(filename, contents, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function issueGroups(issues) {
  const labels = [
    ["auto-fix", "Can fix automatically"],
    ["needs-input", "Needs your input"],
    ["manual-review", "Manual review"],
    ["compatibility", "Compatibility warning"]
  ];

  return labels
    .map(([id, title]) => ({
      id,
      title,
      items: issues.filter((item) => item.group === id)
    }))
    .filter((group) => group.items.length > 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
