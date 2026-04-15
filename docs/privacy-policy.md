# Privacy Policy — AI Web Summarizer

**Extension:** AI Web Summarizer
**Extension ID:** ai-summarizer-extension@yourdomain.com
**Last Updated:** 2026-04-15
**Effective Date:** 2026-04-15

---

## 1. Overview

AI Web Summarizer is a browser extension for Firefox and Chrome that uses third-party AI APIs (OpenAI or OpenRouter) to generate summaries and fact-checks of web pages the user is actively viewing. This policy explains exactly what data is collected, why, how it is used, and how it is protected.

---

## 2. Data We Collect and Why

### 2.1 Data You Provide Directly

| Data | Purpose | Where Stored |
|------|---------|--------------|
| **AI API Key** (OpenAI or OpenRouter) | Required to authenticate requests to the AI provider of your choice | `browser.storage.local` (browser-encrypted, local only) |
| **Preferences** (AI provider, model, language, TTS voice/rate/pitch, extraction mode) | Persist your settings between sessions | `browser.storage.local` (local only) |
| **Usage Metrics** (action counts, extraction method stats, provider/model usage, error counts, daily usage over 30 days) | Help improve the extension by tracking which features are used | `browser.storage.local` (local only; never transmitted; can be disabled in Settings) |
| **Custom prompts** (optional, entered in chat panel) | Sent to AI API to answer your question about the current page | In-memory only during request; not stored |

### 2.2 Web Page Content Accessed When You Initiate a Request

When you click "Summarize This Page", "Fact-Check This Page", or use the context menu, the extension reads **the current tab only** and collects:

| Data | Purpose | Stored? |
|------|---------|---------|
| Page **title** | Included in AI prompt for context | No — in-memory only during request |
| Page **URL** | Included in AI prompt for context | No — in-memory only during request |
| Main body **text content** (up to 12,000 characters; scripts, ads, nav removed) | Sent to AI API to generate the summary or fact-check | No — in-memory only during request |
| **Selected text** (only when fact-checking via context-menu on a selection) | Sent to AI API as the content to fact-check | No — in-memory only during request |

The extension **does not** read page content in the background, on page load, or without a direct user action.

### 2.3 Data We Do NOT Collect

- Browsing history or visited URLs beyond the current active tab at the moment you trigger a request
- Cookies, form data, passwords, or authentication credentials on visited pages
- Personal identity information (name, email, address, etc.)
- Financial or payment information
- Remote usage analytics, telemetry, or crash reports (local usage metrics are stored but never transmitted)
- Any data from pages you visit but do not summarize

---

## 3. How Data Is Used

- **AI API Key** — sent only as a Bearer token in the Authorization header to the AI provider you configured (OpenAI or OpenRouter). It is never logged, displayed in errors, or transmitted anywhere else.
- **Page content (title, URL, text)** — transmitted once per user-initiated request to the AI provider. The response (summary or fact-check) is displayed in the extension UI and immediately discarded. No page content is cached, stored, or re-transmitted.
- **Custom prompts** — transmitted once to the AI provider. Not stored locally or remotely by the extension.
- **Settings** — stored locally in your browser and never sent anywhere.
- **Usage Metrics** — stored locally in your browser. Metrics track how many times you use each feature (summarize, fact-check, custom prompt, follow-up), which extraction and provider methods are used, and how often content is truncated. No page content, URLs, or API keys are included in metrics. Metrics are never transmitted externally. You can disable or reset metrics at any time in the extension Settings page.

---

## 4. Data Sharing and Third Parties

The extension transmits data to **exactly two possible external services**, depending on your chosen provider:

### Option A: OpenAI
- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **Data sent:** Your API key (Authorization header) + page title, URL, and text content (up to 8,000 characters) in the request body.
- **OpenAI's Privacy Policy:** https://openai.com/policies/privacy-policy

### Option B: OpenRouter
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Data sent:** Your API key (Authorization header) + page title, URL, and text content (up to 8,000 characters) in the request body.
- **OpenRouter's Privacy Policy:** https://openrouter.ai/privacy

**No other third parties receive any data.** The extension does not use advertising networks, analytics services, or any other external services.

---

## 5. Data Security

- All transmissions to AI APIs are made over **HTTPS** (TLS).
- API keys are stored in `browser.storage.local`, which Firefox encrypts on disk.
- API keys are sanitized (non-ASCII characters stripped) before being placed in HTTP headers to prevent header injection.
- Page content is held in memory only for the duration of the API request and is never written to disk.
- Summaries and AI responses are displayed in the extension UI only; they are not persisted anywhere.
- Text-to-speech (TTS) is processed entirely **locally** using the browser's Web Speech API. No audio or text is sent to any external server for TTS.

---

## 6. Data Retention

| Data | Retention Period |
|------|-----------------|
| API Key | Until you delete it in Settings or uninstall the extension |
| Settings (model, language, TTS, extraction mode) | Until you change them or uninstall the extension |
| Usage Metrics | Until you reset them in Settings or uninstall the extension; daily usage pruned after 30 days |
| Page content, URLs, titles | Not retained — discarded immediately after AI response is received |
| Summaries / AI responses | Not retained — cleared when the popup or result window is closed |
| TTS audio | Not retained — exists only during active playback |

---

## 7. User Rights and Control

- **Access your stored data:** Open the extension Settings panel to view saved API key, preferences, and usage statistics.
- **Delete your API key:** Clear the API key field in Settings and save.
- **Disable or reset metrics:** Toggle "Enable metrics collection" or click "Reset Statistics" in the Usage Statistics section of Settings.
- **Delete all extension data:** Go to `about:addons` → AI Web Summarizer → Remove, which deletes all `browser.storage.local` data.
- **Stop data transmission:** Simply do not click Summarize / Fact-Check. The extension never acts without explicit user initiation.

---

## 8. Permissions Justification

The following permissions are declared in `manifest.json` and are the minimum required:

| Permission | Why It Is Needed |
|-----------|-----------------|
| `activeTab` | Read the title, URL, and text content of the tab you are currently viewing when you initiate a summarization |
| `storage` | Save your API key, AI provider, model, language, TTS settings, and extraction mode locally |
| `contextMenus` | Add a "Summarize This Page with AI" and "Fact-Check" entry to the browser right-click menu |
| `notifications` | Notify you when an API key is missing or when an error occurs during a request |
| `<all_urls>` (content script) | Inject the content extraction script (including Mozilla's Readability.js library) into any page so it can extract text when you request a summary; no data is collected passively |

No permissions are requested speculatively or for future use.

---

## 9. Children's Privacy

This extension is not directed at children under 13 (or the applicable age in your jurisdiction). The extension does not knowingly collect personal data from children.

---

## 10. Changes to This Policy

If this policy changes materially, the **Last Updated** date at the top of this document will be updated and the version number in `manifest.json` will be incremented. Continued use of the extension after a policy update constitutes acceptance of the new policy.

---

## 11. Contact

This extension is an open-source personal project. To report concerns, request data deletion, or ask questions about this policy, please open an issue at:

**https://github.com/pashol/AI-Web-Summarizer/issues**

---

## 12. Compliance Notes (Chrome Web Store / Firefox Add-on Policies)

This privacy policy is designed to comply with:

- [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Firefox Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)

**Checklist against Chrome Web Store User Data FAQ:**

- [x] Privacy policy posted and describes collection, use, and sharing of user data (Q5, Q6)
- [x] Personal/sensitive data (page content, API keys) transmitted only over HTTPS (Q7, Q8)
- [x] Data handling is directly related to the prominently described core functionality (Q9, Q13)
- [x] No collection of web browsing activity for advertising or monetization (Q12)
- [x] Minimum permissions only — no speculative or future-use permissions (Q17–Q20)
- [x] Local data (settings) also covered by this policy even though not transmitted (Q14)
- [x] Authentication information (API keys) never publicly disclosed (Q11)
- [x] `data_collection_permissions` declared in `manifest.json` (`"websiteContent"`) matches actual collection
