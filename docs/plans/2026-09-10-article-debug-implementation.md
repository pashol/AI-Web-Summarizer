# Article-Length Debug Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persisted debug setting that shows the exact summary prompt and character counts after a popup summary.

**Architecture:** Full Settings stores `debugEnabled`; popup reads it before sending `summarizePage`. Background builds one API-request object via `buildApiRequest`, derives debug data from that object, and passes that same object to the API caller. It returns summary plus a debug object only when requested; popup renders counts and full prompt below the result. Content scripts add `fullLength` so extraction-cap loss is visible. No API keys or headers ever enter the debug payload.

**Tech Stack:** Vanilla JS browser extensions, Firefox `browser.*` promises (MV2), Chrome `chrome.*` (MV3), no build step, manual load testing.

---

### Task 1: Firefox content script reports pre-cap length

**Files:**
- Modify: `firefox/content.js:1-17`

**Step 1: Apply the edit**

Current code computes `wasTruncated` from `fullText.length` but drops the original length. Add `fullLength`:

```javascript
const pageContent = {
  title: document.title,
  url: window.location.href,
  text: fullText.substring(0, 12000),
  selectedText: selectedText || null,
  wasTruncated,
  fullLength: fullText.length,
  extractionMethod: 'readability',
  extractionUsed
};
```

Do not change the 12000 cap, Readability-first logic, or `return true`.

**Step 2: Syntax check**

Run: `node --check firefox/content.js`
Expected: exit 0, no output.

**Step 3: Commit**

```bash
git add firefox/content.js
git commit -m "feat: report pre-cap content length in Firefox"
```

---

### Task 2: Chrome content script reports pre-cap length

**Files:**
- Modify: `chrome/content.js:1-17`

**Step 1: Apply the same edit as Task 1**

```javascript
const pageContent = {
  title: document.title,
  url: window.location.href,
  text: fullText.substring(0, 12000),
  selectedText: selectedText || null,
  wasTruncated,
  fullLength: fullText.length,
  extractionMethod: 'readability',
  extractionUsed
};
```

**Step 2: Syntax check**

Run: `node --check chrome/content.js`
Expected: exit 0.

**Step 3: Commit**

```bash
git add chrome/content.js
git commit -m "feat: report pre-cap content length in Chrome"
```

---

### Task 3: Firefox background derives debug data from the sent request

**Files:**
- Modify: `firefox/background.js` (message listener ~line 173, `handleSummarizeRequest` popup branch ~lines 330-351, `buildApiRequest` ~line 577, `getSummaryFromAI` ~line 689)

**Step 1: Thread the debug flag**

In the `summarizePage` listener, pass the popup flag through; default off so context-menu calls are unaffected:

```javascript
handleSummarizeRequest(request.tab, false, null, request.debug === true).then(result => {
```

Update the signature:

```javascript
async function handleSummarizeRequest(tab, openInWindow, contextMenuSelection = null, debugRequested = false) {
```

**Step 2: Let `getSummaryFromAI` accept a prepared request**

Add an optional final parameter, then prefer it to rebuilding the request:

```javascript
async function getSummaryFromAI(settings, pageContent, customPrompt, isSelectedText = false, streamTarget = null, apiRequest = null) {
  const { url, headers, body } = apiRequest || buildApiRequest(settings, pageContent, customPrompt, isSelectedText);
```

Existing callers continue to build their own request. Only the debug-enabled popup summary passes a prepared request.

**Step 3: Build the request and debug object in popup branch only**

After `isSelectedText`/`wasTruncated` are computed and before calling the API, build one request. Derive the prompt from its user message, then pass this same object to `getSummaryFromAI`. Never include headers, API key, model body, or URL credentials:

```javascript
const sourceBefore = (contentForAI.text || '').length;
const sourceAfter = Math.min(sourceBefore, 10000);
const apiRequest = debugRequested
  ? buildApiRequest(data, contentForAI, null, isSelectedText)
  : null;
const promptText = apiRequest
  ? apiRequest.body.messages[apiRequest.body.messages.length - 1].content
  : null;
const summary = await getSummaryFromAI(data, contentForAI, null, isSelectedText, null, apiRequest);
const result = { summary, title: pageContent.title, url: pageContent.url, isSelectedText, wasTruncated };
if (debugRequested) {
  result.debug = {
    source: isSelectedText ? 'selected' : 'page',
    extractionUsed: pageContent.extractionUsed || null,
    extractedBefore: pageContent.fullLength ?? pageContent.text.length,
    extractedAfter: pageContent.text.length,
    sourceBefore,
    sourceAfter,
    promptLength: promptText.length,
    prompt: promptText
  };
}
return result;
```

The debug panel is therefore derived from the exact user-message string in the request object supplied to `fetch`. Leave the `openInWindow` branch untouched (no debug).

**Step 4: Syntax check**

Run: `node --check firefox/background.js`
Expected: exit 0.

**Step 5: Commit**

```bash
git add firefox/background.js
git commit -m "feat: return summary debug payload in Firefox"
```

---

### Task 4: Chrome background derives debug data from the sent request

**Files:**
- Modify: `chrome/background.js` (message listener ~line 71, popup branch ~lines 330-351)

**Step 1: Apply the same plumbing as Task 3, using Chrome APIs**

Listener:

```javascript
handleSummarizeRequest(request.tab, false, null, request.debug === true)
  .then(result => sendResponse(result))
```

Add the same optional `apiRequest` parameter to `getSummaryFromAI`, build the request once for a debug-enabled popup summary, derive debug data from its `body.messages`, and pass it into `getSummaryFromAI`. Leave context-menu/`openInWindow` branch untouched.

**Step 2: Syntax check**

Run: `node --check chrome/background.js`
Expected: exit 0.

**Step 3: Commit**

```bash
git add chrome/background.js
git commit -m "feat: return summary debug payload in Chrome"
```

---

### Task 5: Firefox popup debug checkbox and result panel

**Files:**
- Modify: `firefox/popup.html:156-196` (settings panel), `firefox/popup.html:213` (after `#result`)
- Modify: `firefox/popup.js:215-268` (summarize handler)

**Step 1: Add session-only checkbox in settings**

Inside `#settingsPanel`, after the language select and before `.settings-actions`:

```html
<label><input type="checkbox" id="debugMode" style="width:auto;margin-right:6px;"> Debug mode (show sent prompt)</label>
```

**Step 2: Add empty debug container after result**

After `<div id="result" class="summary hidden"></div>` add:

```html
<div id="debugPanel" class="summary hidden"></div>
```

**Step 3: Wire in-memory flag (never persisted)**

At top-level in `popup.js`, add `let debugMode = false;`. After settings load / DOM ready, attach:

```javascript
const debugCheckbox = document.getElementById('debugMode');
debugCheckbox.checked = false;
debugCheckbox.addEventListener('change', () => { debugMode = debugCheckbox.checked; });
```

Do NOT add `debugMode` to any `storage.local.get/set` list.

**Step 4: Send flag, render panel only on success**

In the summarize handler: clear `debugPanel` when the request starts; include `debug: debugMode` in the `summarizePage` message; on success, if `response.debug` exists, build the panel with DOM APIs only (`textContent`, `createElement`), e.g. lines for source type, extraction method, extracted before/after, source before/after, prompt length, plus a read-only scrollable `textarea` with `value = response.debug.prompt`. On catch, hide and clear the panel so no stale debug survives. Never use `innerHTML` with prompt content.

**Step 5: Syntax check**

Run: `node --check firefox/popup.js`
Expected: exit 0.

**Step 6: Commit**

```bash
git add firefox/popup.html firefox/popup.js
git commit -m "feat: add session debug panel to Firefox popup"
```

---

### Task 6: Chrome popup debug checkbox and result panel

**Files:**
- Modify: `chrome/popup.html`, `chrome/popup.js` (same regions as Task 5)

**Step 1: Apply the identical UI and logic as Task 5**

Same checkbox markup, same `#debugPanel` container, same in-memory `debugMode` default-off behavior, same `debug: debugMode` message field, same success-only DOM rendering with `textContent`/`textarea.value`, same clear-on-start and clear-on-error. Adapt only the surrounding runtime calls (`chrome.runtime.sendMessage`, `chrome.storage`); do not persist the flag.

**Step 2: Syntax check**

Run: `node --check chrome/popup.js`
Expected: exit 0.

**Step 3: Commit**

```bash
git add chrome/popup.html chrome/popup.js
git commit -m "feat: add session debug panel to Chrome popup"
```

---

### Task 7: Manual verification in both browsers

**Files:** none (verification only)

**Step 1: Firefox load**

Load `firefox/manifest.json` via `about:debugging#/runtime/this-firefox` → Load Temporary Add-on.

**Step 2: Chrome load**

Load unpacked `chrome/` via `chrome://extensions/` developer mode. Confirm no manifest/service-worker errors.

**Step 3: Behavior checklist (repeat per browser)**

- Popup opens with Debug unchecked; checking it, closing, reopening resets to unchecked; flag absent from stored settings.
- Debug off + Summarize → summary renders, no debug panel, no extra payload.
- Debug on + normal page → panel shows page source, extraction method, extracted before/after, source before/after, prompt length, exact prompt text matching the sent user message.
- Debug on + selected text → panel labels source as selected and reflects selection lengths.
- Page over 12,000 chars shows extraction cap; source over 10,000 shows prompt cap.
- Failed extraction/API shows existing error UI with no stale debug panel.
- `result.html`, translate, fact-check, chat, TTS, streaming paths unchanged.

Expected: all pass. If anything fails, fix in the corresponding Task 1-6 file and re-verify before proceeding.

---

### Task 8: Final review and push readiness

**Step 1: Run final checks**

```bash
git status --short
git diff --check
node --check firefox/content.js
node --check chrome/content.js
node --check firefox/background.js
node --check chrome/background.js
node --check firefox/popup.js
node --check chrome/popup.js
```

Expected: only intended files changed; `git diff --check` clean; all `node --check` exit 0.

**Step 2: Report worktree state**

Report: worktree path `.worktrees/article-length-debug`, branch `feature/article-length-debug`, commits since `origin/main`, ready for review/PR. Do not push unless asked.
