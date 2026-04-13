# AI Web Summarizer

A powerful browser extension that uses advanced AI models to instantly summarize webpages, articles, and documents. Save time by extracting key insights from long content with a single click.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H2H21VNZU)

**Available for Firefox (Manifest V2) and [Chrome (Manifest V3)](https://chromewebstore.google.com/detail/kefgmibdgdokjdbgedfpncebalebjali)** - Each browser has its own optimized version in dedicated folders.

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
- **OpenRouter**: Get a key at [openrouter.ai/keys](https://openrouter.ai/keys) (includes free tier)

### Firefox Installation
1. Download the `.xpi` from the [Releases page](https://github.com/pashol/AI-Web-Summarizer/releases/latest)
2. Open `about:addons` → gear icon → **"Install Add-on From File..."**
3. Select the `.xpi` file and click **"Add"**

### Chrome Installation
1. Download or clone this repository
2. Open `chrome://extensions/` → enable **Developer mode**
3. Click **"Load unpacked"** → select the `chrome/` folder

### First-Time Setup
1. Click the extension icon → Settings opens automatically
2. Paste your **API key** and select your **provider**
3. Choose a **model** and **language**
4. Click **Save Settings** → you're ready!

> **Full installation guide, troubleshooting, and detailed feature documentation available in [docs/help.md](docs/help.md).**

---

## ✨ Key Features

### 🤖 Multi-Provider AI Support
- **OpenAI**: GPT-5.4 Nano/Mini, GPT-5.4, GPT-4o (Legacy)
- **OpenRouter**: Gemini 3 Flash, DeepSeek V3.2, Claude Haiku/Sonnet/Opus, Mistral Small 3.2
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

| Method | Instructions |
|--------|--------------|
| **Popup** | Click extension icon → "Summarize This Page" |
| **Context Menu** | Right-click anywhere → "Summarize This Page with AI" |
| **Keyboard** | Firefox: `Ctrl+Alt+S`/`Ctrl+Alt+F`, Chrome: `Ctrl+Shift+S`/`Ctrl+Shift+F` |
| **Selection** | Highlight text → click extension → "Summarize Selected Text" |

See [docs/help.md](docs/help.md) for detailed usage guide, TTS controls, and feature explanations.

---

## 🔧 Technical Details

| | Firefox | Chrome |
|---|---|---|
| Version | 2.0.0 | 2.0.0 |
| Manifest | V2 | V3 |
| Background | Event-driven script | Service worker |
| Content limit | 12,000 chars extracted, 10,000 sent to API | 12,000 chars extracted, 10,000 sent to API |

**API**: OpenAI (GPT-5.4 series) and OpenRouter (Gemini 3 Flash, DeepSeek V3.2, Claude Haiku/Sonnet/Opus, Mistral, free tier)

**Privacy**: Keys stored locally, no telemetry, no third-party data sharing. See [Privacy Policy](docs/privacy-policy.md) and [docs/help.md](docs/help.md#privacy--security).

---

## 🛠️ Development

**Testing locally:**
- **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `manifest.json`
- **Chrome**: `chrome://extensions/` → Load unpacked → select `chrome/` folder

**Documentation:** See `CLAUDE.md` for technical documentation.

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

- **API Keys**: OpenAI at [platform.openai.com](https://platform.openai.com/) or OpenRouter at [openrouter.ai](https://openrouter.ai/)
- **Model Selection**: GPT-5.4 Mini for cost-effective, GPT-5.4/Claude for quality
- **Language**: Summarize in original language for better accuracy
- **Long articles**: Content truncated at 12,000 chars with notice shown

**For detailed documentation, troubleshooting, and FAQ, see [docs/help.md](docs/help.md).**

---

**Version**: Firefox 2.0.0 | Chrome 2.0.0
**Last Updated**: April 14, 2026
