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

- Always use async `browser.storage.local.get/set` — never the sync API
- API keys are stored as `apiKeys: { openrouter: '...', openai: '...' }` — **not** a single `apiKey`
- Use `getApiKey(data)` helper in background.js to resolve the correct key for the current provider
- Old `apiKey` is automatically migrated to `apiKeys` on `onInstalled`

## Settings Architecture

**popup.html (quick settings)**: Provider, Model, Language only + "Full Settings" button
**options.html (full settings)**: Provider, API Key (per-provider), Model, Language, TTS, Streaming, Shortcuts

The API key field in options.html dynamically shows the key for the currently selected provider. Switching providers saves the current key and loads the other one.

## Testing

No build step. Load directly:
- **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `manifest.json`
- **Chrome**: `chrome://extensions/` → Developer mode → Load unpacked → select `chrome/` folder

## Important Files

- `CLAUDE.md` — Comprehensive technical docs
- `background.js` — API calls, context menu, message routing, `getApiKey()` helper
- `content.js` — Page content extraction
- `popup.js` — Quick settings UI (provider, model, language)
- `result.js` — Summary/fact-check result window
- `options.js` — Full preferences (API key per provider, TTS, streaming)

## Adding a Model

Add to `MODELS` object in `background.js` in both `firefox/` and `chrome/`.

## Adding a Language

Add option to `popup.html` and `options.html`, then update `langMap` in `popup.js`, `result.js`, and `options.js` in both directories.
