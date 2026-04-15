# AI Web Summarizer - Agent Guide

## Critical: Two Parallel Codebases

This repo has **separate Firefox and Chrome implementations** at `firefox/` and `chrome/`. Every change must be applied to **both**. They are not symlinked.

## Key Differences

| | Firefox | Chrome |
|---|---|---|
| Manifest | V2 | V3 |
| API | `browser.*` (promises) | `chrome.*` (callbacks) |
| Background | Event-driven script | Service worker |
| Content limit | 12,000 chars extracted, 10,000 sent to API |

## Message Listener Pattern

**Always** return `true` from message listeners to keep the async channel open:
```javascript
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  doAsyncWork(request).then(result => sendResponse(result));
  return true;  // CRITICAL
});
```

## Architecture

```
Popup UI (popup.html/js)  <--->  Background Script  <--->  Content Script
  - Settings                       - API calls              - extractMainContent()
  - Chat                           - Context menu           - Readability extraction
  - TTS                            - Message routing        - extractWithReadability()
  Result Window (result.html/js)   - getApiKey() helper
  Options Page (options.html/js)    - Metrics recording
```

Message flows:
- **Popup → Background → Content**: summarizePage → getContent → extractMainContent → API call
- **Background → Result window**: displaySummary / displayError
- **Popup → Background**: sendCustomPrompt, getModels

## Storage

- Always use async `browser.storage.local.get/set` — never the sync API
- API keys are stored as `apiKeys: { openrouter: '...', openai: '...' }` — **not** a single `apiKey`
- Use `getApiKey(data)` helper in background.js to resolve the correct key for the current provider
- Old `apiKey` is automatically migrated to `apiKeys` on `onInstalled`
- Extraction mode stored as `extractionMode: 'auto' | 'readability' | 'current'`
- Theme stored as `theme: 'light' | 'dark'`
- Metrics stored as `metrics: { enabled, counts, extraction, provider, model, errors, daily }`

## API Integration

- **OpenAI**: `https://api.openai.com/v1/chat/completions` — system + user messages, `Authorization: Bearer` header
- **OpenRouter**: `https://openrouter.ai/api/v1/chat/completions` — user message only, `Authorization: Bearer` + `HTTP-Referer` headers
- Both use `sanitizeHeader()` to strip non-ASCII chars from headers
- Content truncated to 10,000 chars before sending (8,000 for prompts)
- `max_tokens`: 500 for summaries, 1000 for custom prompts

## Settings Architecture

**popup.html (quick settings)**: Provider, Model, Language only + "Full Settings" button
**options.html (full settings)**: Provider, API Key (per-provider), Model, Language, Extraction Mode, TTS, Streaming, Theme, Usage Statistics, Shortcuts

The API key field in options.html dynamically shows the key for the currently selected provider. Switching providers saves the current key and loads the other one.

## Coding Conventions

- **Naming**: camelCase for functions/variables, UPPERCASE for constants, kebab-case for DOM IDs
- **Async**: Prefer async/await over promise chains
- **Errors**: Try-catch with user-friendly messages; show settings panel on API key errors
- **No innerHTML**: Use DOM manipulation or `textContent`, never `innerHTML` with user input
- **Sanitize headers**: Always use `sanitizeHeader()` before setting API request headers

## Testing

No build step. Load directly:
- **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `manifest.json`
- **Chrome**: `chrome://extensions/` → Developer mode → Load unpacked → select `chrome/` folder

## Important Files

- `background.js` — API calls, context menu, message routing, `getApiKey()` helper, metrics recording
- `content.js` — Page content extraction (Readability + legacy modes)
- `Readability.js` — Mozilla Readability parser for article extraction
- `popup.js` — Quick settings UI (provider, model, language)
- `result.js` — Summary/fact-check result window
- `options.js` — Full preferences (API key per provider, extraction mode, TTS, streaming, theme, metrics)

## Adding a Model

Add to `MODELS` object in `background.js` in both `firefox/` and `chrome/`.

## Adding a Language

Add option to `popup.html` and `options.html`, then update `langMap` in `popup.js`, `result.js`, and `options.js` in both directories.

## Creating Submission Zips

- **Firefox (AMO)**: Zip the *contents* of `firefox/` (not the folder itself):
  ```bash
  cd firefox && zip -r ../aiwebsummarizer-firefox.zip .
  ```
- **Chrome (CWS)**: Zip the `chrome/` folder itself:
  ```bash
  zip -r aiwebsummarizer-chrome.zip chrome/
  ```
