### **AI Web Summarizer**

A powerful browser extension that uses advanced AI models to instantly summarize webpages, articles, and documents. It helps you save time by extracting key insights from long content with a single click.

**Available for Firefox and Chrome** - Each browser has its own optimized version in dedicated folders.

Word of warning: This is vibe coded. I asked Claude to give me a list of AI summarizer, and instead of providing me with a list, it created an earlier version of this exension. I kind of took it from there. I will not further enhance this exension, as it has all the points i wanted. It could use some refining for the speech synthesis, like speed and voice selection.

#### **Repository Structure**

```
AI-Web-Summarizer/
├── firefox/          # Firefox extension (Manifest V2)
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── background.js
│   ├── content.js
│   ├── result.html
│   ├── result.js
│   └── icons/
├── chrome/           # Chrome extension (coming soon)
│   └── (Chrome-specific files)
└── README.md
```

#### **Key Features**

* **Multi-Provider Support:** Seamlessly connect to **OpenAI (GPT-4o, GPT-4o mini, etc.)** or **OpenRouter** to access models like Gemini, Claude, and Llama.
* **Intelligent Extraction:** Automatically strips away ads, navigation menus, and footers to focus only on the core article content.
* **Interactive Chat:** Beyond just summaries, use the "Ask AI" panel to ask specific questions about the current page.
* **Multilingual:** Supports summarization and translation into over 15 languages (Spanish, French, Japanese, etc.).
* **Audio Playback (TTS):** Includes a built-in "Read Aloud" feature with customizable voice, speed, and pitch settings.
* **Flexible Access:** Summarize via the extension popup or use the right-click context menu to open a dedicated summary window.
* **Developer Friendly:** Built with clean, modular JavaScript using the WebExtensions API (Manifest V2).
