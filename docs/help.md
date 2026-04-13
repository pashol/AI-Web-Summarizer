# AI Web Summarizer - Help Guide

A comprehensive guide to getting the most out of AI Web Summarizer.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Using the Extension](#using-the-extension)
5. [Features in Detail](#features-in-detail)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Text-to-Speech](#text-to-speech)
8. [API Providers](#api-providers)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)
11. [Privacy & Security](#privacy--security)

---

## Getting Started

### What is AI Web Summarizer?

AI Web Summarizer is a browser extension that uses artificial intelligence to summarize webpages, articles, and documents. Instead of reading entire articles, you can get a concise summary in seconds.

### What You Need Before Installing

- **Firefox 142+** (for Firefox version) or **Chrome** (for Chrome version)
- An API key from at least one supported provider:
  - [OpenAI](https://platform.openai.com/api-keys) - Requires payment, offers GPT-4o, GPT-5.4 series
  - [OpenRouter](https://openrouter.ai/keys) - Offers free tiers

---

## Installation

### Firefox Installation (Permanent)

1. Download the latest `.xpi` file from the [Releases page](https://github.com/pashol/AI-Web-Summarizer/releases/latest)
2. Open Firefox and navigate to `about:addons`
3. Click the gear icon ⚙️ and select **"Install Add-on From File..."**
4. Select the downloaded `.xpi` file
5. Click **"Add"** when prompted
6. The extension icon appears in your Firefox toolbar

> **Note**: This installs permanently and persists across restarts.

### Firefox Installation (Temporary/Development)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select the `manifest.json` file in the `firefox/` folder
4. The extension loads temporarily (removed when Firefox closes)

### Chrome Installation

1. Download or clone the repository
2. Open `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right)
4. Click **"Load unpacked"**
5. Select the `chrome/` folder (the entire folder, not a file inside)
6. The extension icon appears in your Chrome toolbar

> **Note**: Unpacked extensions persist across restarts. Chrome may show a developer mode warning—this is normal and harmless.

---

## Configuration

### First-Time Setup

On first use, the Settings panel opens automatically:

1. **Select Provider** - Choose OpenAI or OpenRouter
2. **Enter API Key** - Paste your key from the provider's website
3. **Choose Model** - Select from available models for your provider
4. **Set Language** - Choose the language for summaries and TTS
5. **Save Settings** - Click the save button

### Accessing Settings

- **Quick access**: Click the extension icon → Settings (gear icon)
- **Full settings**: Right-click extension icon → Options

### Settings Explained

| Setting | Description |
|---------|-------------|
| **Provider** | OpenAI (paid) or OpenRouter (includes free tier) |
| **API Key** | Your personal key from the provider |
| **Model** | AI model used for summarization |
| **Language** | Language for summary output and TTS |
| **TTS Voice** | Voice used for text-to-speech |
| **TTS Speed** | Speech rate (0.5x to 2.0x) |
| **TTS Pitch** | Voice pitch (0.5 to 2.0) |

---

## Using the Extension

### Method 1: Popup

1. Click the extension icon in your toolbar
2. Adjust quick settings (provider, model, language) if needed
3. Click **"Summarize This Page"**
4. View results in the popup or dedicated window

### Method 2: Context Menu

1. Right-click anywhere on a webpage
2. Select **"Summarize This Page with AI"**
3. A dedicated window opens with the summary

### Method 3: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+S` | Summarize current page |
| `Ctrl+Alt+F` | Fact-check current page |

### Method 4: Text Selection

1. Highlight any text on the page
2. Click the extension icon
3. Click **"Summarize Selected Text"**
4. Get a focused summary of your selection

---

## Features in Detail

### Multi-Provider AI Support

**OpenAI**
- Direct API access to OpenAI's models
- Models: GPT-5.4 Nano, GPT-5.4 Mini, GPT-5.4, GPT-4o (Legacy)
- Requires paid API usage

**OpenRouter**
- Access to curated models via OpenRouter
- Free tier with auto-selection of best available model
- Available models: Gemini 3 Flash, DeepSeek V3.2, Claude Haiku 4.5, Claude Sonnet 4.6, Claude Opus 4.6, Mistral Small 3.2, GPT-5.4 Mini

### Content Extraction

The extension intelligently extracts content by:
- Removing ads, navigation menus, sidebars
- Stripping headers and footers
- Focusing on main article content
- Handling dynamic content (JavaScript-rendered pages)

**Limits:**
- Firefox: Extracts up to 12,000 characters, sends 10,000 to API
- Chrome: Extracts up to 12,000 characters, sends 10,000 to API

### Fact-Check Mode

Verify claims on any webpage:

1. Click extension icon
2. Click **"Fact-Check This Page"**
3. AI analyzes the content and provides factual assessment
4. Useful for news articles, claims, statistics

### Interactive Chat

Ask custom questions about any webpage:

1. Click extension icon
2. Scroll to **"Ask AI about this page"**
3. Type your question
4. Click **"Send"**
5. Receive AI response based on page content

### Follow-Up Questions

After receiving a summary, ask follow-up questions:

1. View summary in result window
2. Type question in chat input
3. Get context-aware responses

### Streaming Responses

Watch summaries generate in real-time:
- Text appears progressively
- No waiting for complete response
- Cancel mid-generation if needed

---

## Keyboard Shortcuts

| Browser | Summarize | Fact-Check |
|---------|-----------|------------|
| Firefox | `Ctrl+Alt+S` | `Ctrl+Alt+F` |
| Chrome | `Ctrl+Shift+S` | `Ctrl+Shift+F` |

### Customizing Shortcuts

Firefox:
1. Go to `about:addons`
2. Click the gear icon → **"Manage Extension Shortcuts"**
3. Find AI Web Summarizer and set custom shortcuts

Chrome:
1. Go to `chrome://extensions/shortcuts`
2. Find AI Web Summarizer and set custom shortcuts

---

## Text-to-Speech

### Voice Selection

The extension uses your system's available voices:

1. Go to Settings → TTS Settings
2. Select from available voices
3. Voices are grouped by language (e.g., "Google", "Microsoft", "Apple")

**Tips:**
- System voices vary by OS and installed languages
- Some voices support more languages than others
- Try different voices to find one that works well for your language

### Speed Control

Adjust how fast the summary is read:

| Speed | Description |
|-------|-------------|
| 0.5x | Half speed (slow) |
| 1.0x | Normal speed |
| 1.5x | 50% faster |
| 2.0x | Double speed (fast) |

### Pitch Control

Adjust the voice pitch:

| Pitch | Description |
|-------|-------------|
| 0.5 | Lower pitch |
| 1.0 | Normal pitch |
| 2.0 | Higher pitch |

### Language-Aware Selection

When you change the summary language, TTS automatically:
- Filters voices to those supporting the language
- Selects an appropriate voice by default
- Falls back to default voice if no matching voice found

### TTS Controls in Result Window

- **Play/Pause**: Start or pause reading
- **Stop**: Stop reading and reset to beginning
- **Speed**: Adjust speed slider
- **Progress**: See current position in summary

---

## API Providers

### OpenAI

**Website**: https://platform.openai.com/

**Getting an API Key**:
1. Create account or sign in
2. Go to API Keys section
3. Click "Create new secret key"
4. Copy and paste into extension

**Pricing**:
- Pay per token (input + output)

**Available Models**:
- GPT-5.4 Nano
- GPT-5.4 Mini
- GPT-5.4
- GPT-4o (Legacy)

### OpenRouter

**Website**: https://openrouter.ai/

**Getting an API Key**:
1. Create account or sign in
2. Go to Keys section
3. Create a new key
4. Copy and paste into extension

**Pricing**:
- Offers free tier with limited daily usage
- Paid plans available for heavier usage
- Auto-selects best free model by default

**Available Models**:
- Auto (Best Free Model) - automatically selects the best free option
- Gemini 3 Flash
- DeepSeek V3.2
- Claude Haiku 4.5
- Claude Sonnet 4.6
- Claude Opus 4.6
- Mistral Small 3.2
- GPT-5.4 Mini

---

## Troubleshooting

### Common Issues

**"No API Key" Error**
- Go to Settings and enter your API key
- Make sure the key is correct (no extra spaces)
- Keys are case-sensitive

**"Invalid API Key" Error**
- Verify key is active on provider's website
- OpenAI keys start with `sk-`
- OpenRouter keys are longer alphanumeric strings

**"Content Too Long" Notice**
- Page exceeds character limit
- Use "Summarize Selected Text" for specific sections
- The extension extracts up to 12,000 characters

**Summary is Empty or Poor Quality**
- Some websites block content extraction
- Try selecting specific text to summarize
- Check if page has accessible content (not behind paywall)

**TTS Not Working**
- Ensure your browser supports Web Speech API
- Check system has available voices
- Try a different voice in settings
- Ensure audio is not blocked by browser

**Extension Icon Not Visible**
- Firefox: Click puzzle piece icon → find AI Web Summarizer → pin
- Chrome: Click puzzle piece icon → pin AI Web Summarizer

**Streaming Response Stuck**
- Click "Stop" button
- Try again with smaller content
- Check internet connection

**Context Menu Missing**
- Refresh the webpage
- Check extension has "Context Menus" permission
- Restart browser

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `API key not found` | No key entered | Enter API key in settings |
| `Invalid API key` | Wrong or expired key | Get new key from provider |
| `Rate limit exceeded` | Too many requests | Wait and try again |
| `Model not available` | Model unavailable | Select different model |
| `Network error` | Connection issue | Check internet connection |
| `Content extraction failed` | Page blocks bots | Try selecting text manually |

### Debug Mode

To help troubleshoot:

1. Right-click extension icon → Inspect
2. Go to Console tab
3. Look for error messages
4. Note any specific error codes

---

## FAQ

### General

**Q: Is this extension free?**
A: The extension is free to install. However, you need an API key from OpenAI or OpenRouter. OpenRouter offers a free tier.

**Q: How accurate are the summaries?**
A: Summaries are generally accurate and capture main points. Quality depends on the AI model selected and the complexity of the content.

**Q: Can I use both OpenAI and OpenRouter?**
A: Yes! Enter keys for both providers in settings. Switch between them using the provider dropdown.

**Q: Does this work on mobile?**
A: This is a desktop browser extension. Mobile browsers have limited extension support.

### Privacy

**Q: Is my data safe?**
A: Your API keys are stored locally in your browser. Content is processed by your chosen AI provider. See our [Privacy Policy](privacy-policy.md).

**Q: Do you track my usage?**
A: No. We don't collect any telemetry, analytics, or personal data.

**Q: Who processes my webpage content?**
A: Your content is sent directly to your chosen AI provider (OpenAI or OpenRouter) for processing.

### Technical

**Q: Why two separate versions (Firefox/Chrome)?**
A: Firefox uses Manifest V2, Chrome uses Manifest V3. They have different APIs and architectures requiring separate codebases.

**Q: Can I use this with a VPN?**
A: Yes. Your IP address is only used for API communication with your chosen provider.

**Q: What's the character limit?**
A: Up to 12,000 characters extracted, 10,000 sent to API per request.

**Q: Can I summarize selected text only?**
A: Yes! Highlight text on the page, click extension icon, and select "Summarize Selected Text."

**Q: How do I change the language?**
A: Open popup → Language dropdown → Select language. This affects both summaries and TTS.

### Billing

**Q: How much do API calls cost?**
A: Costs depend on your provider and usage. OpenAI charges per token. OpenRouter has a free tier and paid options.

**Q: Why was I charged unexpectedly?**
A: API costs are determined by your provider (OpenAI or OpenRouter), not this extension. Check your provider's dashboard for usage details.

---

## Privacy & Security

### Data Flow

1. You click "Summarize"
2. Extension extracts text content from webpage
3. Content is sent directly to your chosen AI provider
4. AI processes content and returns summary
5. Summary is displayed in extension UI

### What We Don't Collect

- We don't store your webpage content
- We don't track your browsing history
- We don't share data with third parties
- We don't have servers or backend infrastructure

### What Your Provider Collects

Your chosen AI provider (OpenAI or OpenRouter) may log:
- API requests and content processed
- Usage patterns
- IP addresses

Check the provider's privacy policy for details:
- [OpenAI Privacy Policy](https://openai.com/privacy/)
- [OpenRouter Privacy Policy](https://openrouter.ai/privacy)

### Security Measures

- API keys stored in browser local storage
- Keys encrypted by browser's built-in encryption
- No transmission of keys to our servers
- Content sanitization prevents injection attacks
- HTTPS-only communication with API providers

For full details, see [Privacy Policy](privacy-policy.md).

---

## Support

### Getting Help

- **Bug Reports**: Open an issue on GitHub
- **Feature Requests**: Open an issue on GitHub
- **Questions**: Open a discussion on GitHub

### Useful Links

- [GitHub Repository](https://github.com/pashol/AI-Web-Summarizer)
- [Releases Page](https://github.com/pashol/AI-Web-Summarizer/releases)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [OpenRouter Keys](https://openrouter.ai/keys)
- [MDN WebExtensions Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

---

## Tips & Tricks

### Getting Better Summaries

1. **Original Language**: Summarize in the page's original language for better accuracy
2. **Select Key Sections**: For long articles, summarize key sections separately
3. **Choose Right Model**: GPT-4o/Claude for quality, GPT-4o Mini/DeepSeek for cost
4. **Specific Questions**: Use "Ask AI" feature for targeted information

### Saving Costs

1. Use OpenRouter's free tier for testing
2. Select GPT-5.4 Mini for everyday summaries
3. Use shorter text selections when possible

### Voice Quality

1. Try different voices to find the best quality for your language
2. Adjust speed before starting TTS
3. Use pitch adjustment for comfort

---

**Version**: Firefox 2.0.0 | Chrome 2.0.0  
**Last Updated**: April 13, 2026
