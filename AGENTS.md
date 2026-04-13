# AI Web Summarizer - Agent Guide

## Critical: Two Parallel Codebases

This repo has **separate Firefox and Chrome implementations** at `firefox/` and `chrome/`. Every change must be applied to **both**. They are not symlinked.

## Key Differences

| | Firefox | Chrome |
|---|---|---|
| Manifest | V2 | V3 |
| API | `browser.*` (promises) | `chrome.*` (callbacks) |
| Background | Event-driven script | Service worker |
| Content limit | 12,000 chars | 10,000 chars |

## Message Listener Pattern

**Always** return `true` from message listeners to keep the async channel open:
```javascript
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  doAsyncWork(request).then(result => sendResponse(result));
  return true;  // CRITICAL
});
```

## Storage

Always use async `browser.storage.local.get/set` — never the sync API.

## Testing

No build step. Load directly:
- **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `manifest.json`
- **Chrome**: `chrome://extensions/` → Developer mode → Load unpacked → select `chrome/` folder

## Important Files

- `CLAUDE.md` — Comprehensive technical docs (852 lines)
- `background.js` — API calls, context menu, message routing
- `content.js` — Page content extraction
- `popup.js` / `result.js` — UI logic

## Adding a Model

Add to `MODELS` object in `background.js` in both `firefox/` and `chrome/`.

## Adding a Language

Add option to `popup.html`, then update `langMap` in `popup.js` and `result.js` in both directories.
