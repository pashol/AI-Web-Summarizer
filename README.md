# AI Web Summarizer

A powerful browser extension that uses advanced AI models to instantly summarize webpages, articles, and documents. Save time by extracting key insights from long content with a single click.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H2H21VNZU)

**Available for Firefox (Manifest V2) and Chrome (Manifest V3)** - Each browser has its own optimized version in dedicated folders.

> **A Note from the Author:** This is vibe coded. I asked Claude to give me a list of AI summarizers, and instead of providing a list, it created an earlier version of this extension. I kind of took it from there. The extension now has all the features I wanted, including full TTS controls with speed and voice selection. It works well for my needs!

---

## 📰 Latest Release: v2.0.0

### ✨ What's New
- **Per-provider API keys**: Separate API keys for OpenAI and OpenRouter, seamlessly switching between providers
- **Popup quick settings**: Provider, model, and language can now be changed directly in the popup without opening full settings
- **Follow-up chat**: Ask follow-up questions about the summarized content in the result window
- **Fact-check mode**: Verify claims on any webpage with AI-powered fact-checking
- **Keyboard shortcuts**: Ctrl+Alt+S to summarize, Ctrl+Alt+F to fact-check
- **Streaming responses**: Watch summaries generate in real-time

### 🔧 Improvements
- **UI polish**: Replaced all emoji icons with proper SVG icons for consistent rendering
- **Theme consistency**: Unified color scheme with proper light/dark mode support across all components
- **Button styling**: Improved hover states, focus indicators, and visual hierarchy
- **Better settings UX**: Full settings page accessible via gear icon in popup

### 🐛 Bug Fixes
- Fixed streaming response handling
- Improved result window layout and scrolling

---

## 📰 Previous Release: v1.1.0

### ✨ What's New
- **Enhanced TTS controls**: Full voice selection with speed (0.5x-2.0x) and pitch (0.5-2.0) adjustment
- **Smart truncation**: Intelligent handling of long content with clear indicators
- **Selected text summarization**: Highlight any text before clicking summarize for focused summaries
- **Context menu integration**: Right-click anywhere to summon the summarizer

### 🔧 Improvements
- Refreshed AI model list with latest 2026 models
- Free tier support via OpenRouter with auto-selection of best available model
- Improved content extraction for cleaner summaries

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
- **OpenAI**: GPT-4o, GPT-5.4 series, and more
- **OpenRouter**: Access to Gemini, Claude Opus/Sonnet, DeepSeek, Mistral, and 30+ models
- **Free tier**: Auto-selects best free model via OpenRouter

### 🎯 Intelligent Content Extraction
- Strips ads, navigation, sidebars, headers, and footers
- Focuses only on main article content
- Supports text selection for targeted summarization

### 💬 Interactive Chat Interface
- Ask custom questions about any webpage
- Get AI responses based on page content

### 🌍 Multilingual Support
- 15+ languages: English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Dutch, Polish, Turkish

### 🔊 Text-to-Speech (TTS)
- Voice selection from available system voices
- Speed control (0.5x to 2.0x)
- Pitch adjustment (0.5 to 2.0)
- Language-aware voice auto-selection

### 🖱️ Flexible Access
- **Popup mode**: Click extension icon for quick access
- **Context menu**: Right-click → "Summarize This Page with AI"
- **Dedicated window**: Open summaries in a separate window

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
- **Version**: 2.0.0
- **Min Firefox Version**: 142.0
- **Extension ID**: `ai-summarizer-extension@yourdomain.com`
- **Background**: Non-persistent event-driven script

### Chrome Version (Manifest V3)
- **Version**: 2.0.0
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

**Version**: Firefox 2.0.0 | Chrome 2.0.0
**Last Updated**: April 13, 2026
