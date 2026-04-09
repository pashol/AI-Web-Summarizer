# AI Web Summarizer

A powerful browser extension that uses advanced AI models to instantly summarize webpages, articles, and documents. Save time by extracting key insights from long content with a single click.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H2H21VNZU)

**Available for Firefox (Manifest V2) and Chrome (Manifest V3)** - Each browser has its own optimized version in dedicated folders.

> **A Note from the Author:** This is vibe coded. I asked Claude to give me a list of AI summarizers, and instead of providing a list, it created an earlier version of this extension. I kind of took it from there. The extension now has all the features I wanted, including full TTS controls with speed and voice selection. It works well for my needs!

---

## 📰 Latest Release: v1.0.20

### ✨ What's New
- **Refreshed AI model list**: Replaced all outdated/fabricated model IDs with verified 2026 models
- **Updated OpenAI models**: Now offers GPT-5.4 Nano, Mini, and standard — GPT-4o kept as legacy fallback
- **Updated OpenRouter models**: Added Gemini 3 Flash, DeepSeek V3.2, Claude Haiku/Sonnet/Opus 4.5+, GPT-5.4 Mini
- **Free tier via OpenRouter router**: `Auto (Best Free Model)` intelligently selects from available free models
- **Fixed Mistral**: Replaced broken `mistral-small-latest` alias with `mistral-small-3.2-24b-instruct`

### 🔧 Changes
- Removed broken free models: `Llama 4 Maverick (Free)` and `DeepSeek R1 (Free)` (non-functional on OpenRouter)
- Removed stale models: Grok 4, GPT-5.2, Llama 3.1 series, Mistral Large, Perplexity Sonar, Qwen, DeepSeek Chat
- Applied across both Firefox (Manifest V2) and Chrome (Manifest V3)

---

## 📰 Previous Release: v1.0.18

### ✨ What's New
- **Selected text summarization**: Highlight text on any page and summarize just the selection
- **Improved content extraction**: Raised content cap to 12,000 characters with smarter CMS content detection
- **Truncation notice**: Shows a notice when page content exceeds the extraction limit
- **Consolidated TTS settings**: TTS controls merged into the main Settings panel for a cleaner UI
- **Reduced token waste**: Optimized content extraction and API prompts for efficiency
- **Privacy policy**: Added privacy policy compliant with Chrome Web Store requirements

### 🔧 Technical Improvements
- Content extraction cap raised to 12,000 chars, API prompt cap to 10,000 chars
- Added common CMS content class selectors to extraction prioritization
- Removed separate TTS panel from result window
- Context menu renamed to "Summarize This"
- Applied across both Firefox (Manifest V2) and Chrome (Manifest V3)

---

## 🚀 Quick Start

### Prerequisites
You need an API key from one of the following providers:
- **OpenAI**: Get a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **OpenRouter**: Get a key at [openrouter.ai/keys](https://openrouter.ai/keys) (access to 30+ models, including free tiers)

### Firefox Installation
1. Go to the [Releases page](https://github.com/pashol/AI-Web-Summarizer/releases/latest) and download the `.xpi` file attached to the latest release
2. Open Firefox and navigate to `about:addons`
3. Click the gear icon ⚙️ and select **"Install Add-on From File..."**
4. Select the downloaded `.xpi` file
5. Click **"Add"** when prompted
6. The AI Web Summarizer icon will appear in your Firefox toolbar

> **Note**: This installs the extension permanently — it persists across Firefox restarts. If you prefer to load from source, see the [Development](#-development) section.

### Chrome Installation
1. [Download or clone this repository](https://github.com/pashol/AI-Web-Summarizer)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **"Developer mode"** using the toggle in the top-right corner
4. Click **"Load unpacked"**
5. Select the `chrome/` folder (not a file inside it — the whole folder)
6. The AI Web Summarizer icon will appear in your Chrome toolbar

> **Note**: Unpacked extensions persist across restarts. Chrome may show a warning about developer mode extensions — this is normal.

### First-Time Setup
1. Click the extension icon in your toolbar
2. The **Settings panel** will open automatically (required on first use)
3. Paste your **API key** into the API Key field
4. Select your **provider** (OpenAI or OpenRouter)
5. Choose a **model** from the dropdown (GPT-4o Mini is a good starting point)
6. Select your preferred **summary language**
7. Click **Save Settings**
8. You're ready — navigate to any webpage and click **"Summarize This Page"**

---

## ✨ Key Features

### 🤖 Multi-Provider AI Support
Seamlessly connect to:
- **OpenAI**: GPT-4o, GPT-4o Mini, and more
- **OpenRouter**: Access to Gemini, Claude Opus/Sonnet, DeepSeek, Mistral, and more

### 🎯 Intelligent Content Extraction
Automatically strips away:
- Ads and sponsored content
- Navigation menus and sidebars
- Headers and footers
- Focus only on the main article content

### 💬 Interactive Chat Interface
Beyond summaries - ask custom questions about the current page using the "Ask AI" panel.

### 🌍 Multilingual Support
Summarize content in 15+ languages:
- English, Spanish, French, German, Italian
- Portuguese, Russian, Chinese, Japanese, Korean
- Arabic, Hindi, Dutch, Polish, Turkish

### 🔊 Text-to-Speech (TTS)
Full-featured audio playback with:
- **Voice selection**: Choose from available system voices
- **Speed control**: 0.5x to 2.0x playback speed
- **Pitch adjustment**: Customize voice pitch (0.5 to 2.0)
- **Language-aware**: Auto-selects best voice for your chosen language

### 🖱️ Flexible Access
- **Popup mode**: Click extension icon for quick summaries
- **Context menu**: Right-click anywhere → "Summarize This Page with AI"
- **Dedicated window**: Open summaries in a separate window for better focus

### 👨‍💻 Developer Friendly
- Clean, modular JavaScript code
- Well-documented codebase (see `CLAUDE.md`)
- WebExtensions API (cross-browser compatible)
- Manifest V2 (Firefox) and V3 (Chrome) support

---

## 📁 Repository Structure

```
AI-Web-Summarizer/
├── firefox/              # Firefox extension (Manifest V2, v1.0.20)
│   ├── manifest.json     # Extension configuration
│   ├── popup.html        # Main popup interface
│   ├── popup.js          # Popup logic and UI interactions
│   ├── background.js     # Background script (API calls, messaging)
│   ├── content.js        # Content extraction script
│   ├── result.html       # Dedicated summary window UI
│   ├── result.js         # Result window logic
│   └── icons/            # Extension icons
│       ├── icon48.png
│       └── icon96.png
│
├── chrome/               # Chrome extension (Manifest V3, v1.0.20)
│   ├── manifest.json     # Chrome-specific configuration
│   ├── popup.html        # Main popup interface
│   ├── popup.js          # Popup logic (Chrome-adapted)
│   ├── background.js     # Service worker (Manifest V3)
│   ├── content.js        # Content extraction script
│   ├── result.html       # Dedicated summary window UI
│   ├── result.js         # Result window logic
│   └── icons/            # Extension icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── docs/
│   └── privacy-policy.md # Privacy policy
├── README.md             # This file
└── CLAUDE.md             # Comprehensive technical documentation for developers
```

---

## 🎮 How to Use

### Basic Summarization
1. Navigate to any webpage you want to summarize
2. Click the **AI Web Summarizer** extension icon
3. Click **"Summarize This Page"**
4. Wait a few seconds for the AI to process
5. Read your summary or click **"Read Aloud"** for TTS

### Custom Questions
1. Open the extension popup
2. Scroll to the **"Ask AI about this page"** section
3. Type your question (e.g., "What are the main arguments?")
4. Click **"Send"**
5. Get a custom AI response based on page content

### Context Menu
1. Right-click anywhere on a webpage
2. Select **"Summarize This Page with AI"**
3. A dedicated window opens with your summary
4. Copy to clipboard or read aloud directly

### Settings
- **Provider**: Switch between OpenAI and OpenRouter
- **API Key**: Securely stored in browser local storage
- **Model**: Choose from available models for your provider
- **Language**: Select summary language (affects TTS too)
- **TTS Settings**: Customize voice, speed, and pitch

---

## 🔧 Technical Details

### Firefox Version (Manifest V2)
- **Version**: 1.0.20
- **Min Firefox Version**: 142.0
- **Extension ID**: `ai-summarizer-extension@yourdomain.com`
- **Background**: Non-persistent event-driven script

### Chrome Version (Manifest V3)
- **Version**: 1.0.20
- **Background**: Service worker architecture
- **Permissions**: activeTab, storage, contextMenus, scripting
- **Host permissions**: `<all_urls>`

### API Integration
- **OpenAI**: Direct integration with chat completion API
- **OpenRouter**: Unified access to 30+ AI models
- **Token limits**: 500 tokens for summaries, 1000 for custom prompts
- **Content limit**: Up to 12,000 characters extracted per page, 10,000 sent to API

### Privacy & Security
- API keys stored locally (encrypted by browser)
- No telemetry or tracking
- No data sent to third parties (except chosen AI provider)
- Content extraction happens locally
- Header sanitization prevents injection attacks
- See [Privacy Policy](docs/privacy-policy.md) for full details

---

## 🛠️ Development

### Testing Locally
**Firefox:**
```bash
# Navigate to the project directory
cd AI-Web-Summarizer/firefox

# Load in Firefox:
# 1. Open about:debugging#/runtime/this-firefox
# 2. Click "Load Temporary Add-on"
# 3. Select manifest.json
```

**Chrome:**
```bash
# Navigate to the project directory
cd AI-Web-Summarizer/chrome

# Load in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the chrome/ folder
```

### Debugging
- **Background script**: Use browser's extension debugging tools
- **Popup**: Right-click popup → Inspect Element
- **Content script**: Use webpage's DevTools console
- **Console logs**: Check for errors in appropriate context

### Documentation
See `CLAUDE.md` for comprehensive technical documentation including:
- Architecture overview
- Component details
- Message passing patterns
- API integration
- Development workflows
- Coding conventions

---

## 🤝 Contributing

This is a personal project that I consider feature-complete for my needs. However, feel free to:
- Fork the repository
- Submit bug reports
- Share your own modifications
- Use the code as a learning resource

---

## 📜 License

This project is open source. Feel free to use, modify, and distribute as you see fit.

---

## 🔗 Resources

- **OpenAI API**: [platform.openai.com](https://platform.openai.com/)
- **OpenRouter**: [openrouter.ai](https://openrouter.ai/)
- **WebExtensions API**: [MDN Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- **Web Speech API**: [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

## 💡 Tips

1. **API Keys**: Get your OpenAI key from [platform.openai.com](https://platform.openai.com/) or OpenRouter key from [openrouter.ai](https://openrouter.ai/)
2. **Model Selection**: Start with GPT-4o Mini for cost-effective summaries, upgrade to GPT-4o or Claude for better quality
3. **Language**: Summarizing in the original language often gives better results
4. **TTS**: If your preferred voice isn't available, try selecting "Google" voices which are usually higher quality
5. **Long articles**: The extension extracts up to 12,000 characters - longer articles may be truncated. A notice is shown when content is truncated.

---

**Version**: Firefox 1.0.20 | Chrome 1.0.20
**Last Updated**: April 9, 2026
