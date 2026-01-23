# AI Web Summarizer - Codebase Documentation for AI Assistants

## Project Overview

**AI Web Summarizer** is a Firefox browser extension (WebExtensions API, Manifest V2) that provides AI-powered webpage summarization. The extension uses OpenAI or OpenRouter APIs to generate concise summaries of web content, with additional features including custom prompts, multilingual support, and text-to-speech functionality.

**Current Version**: 1.0.7
**Extension ID**: `ai-summarizer-extension@yourdomain.com`
**Min Firefox Version**: 142.0

### Key Features
- Multi-provider AI support (OpenAI, OpenRouter)
- Intelligent content extraction (removes ads, navigation, footers)
- Interactive chat interface for custom questions
- Multilingual summaries (15+ languages)
- Text-to-speech with customizable voice, speed, and pitch
- Context menu integration
- Dedicated summary window view

---

## Architecture Overview

This extension follows the standard WebExtensions architecture with three main components:

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Extension                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐      ┌────────────┐      ┌──────────┐ │
│  │  Popup UI  │◄────►│ Background │◄────►│ Content  │ │
│  │ (popup.js) │      │  Script    │      │  Script  │ │
│  │            │      │(background.│      │(content. │ │
│  │ ┌────────┐ │      │    js)     │      │   js)    │ │
│  │ │Settings│ │      │            │      │          │ │
│  │ │  Chat  │ │      │ ┌────────┐ │      │ Extract  │ │
│  │ │  TTS   │ │      │ │API Call│ │      │  Main    │ │
│  │ └────────┘ │      │ │Handler │ │      │ Content  │ │
│  └────────────┘      │ └────────┘ │      │          │ │
│                      │            │      │          │ │
│  ┌────────────┐      │ Context    │      └──────────┘ │
│  │ Result Win │      │  Menu      │                    │
│  │(result.js) │◄─────┤            │                    │
│  └────────────┘      └────────────┘                    │
│                                                          │
│                   ┌───────────────┐                     │
│                   │ browser.      │                     │
│                   │ storage.local │                     │
│                   └───────────────┘                     │
└─────────────────────────────────────────────────────────┘
           │                         ▲
           │ API Requests            │ Responses
           ▼                         │
    ┌──────────────────────────────────────┐
    │  External AI APIs                    │
    │  • OpenAI (api.openai.com)          │
    │  • OpenRouter (openrouter.ai)       │
    └──────────────────────────────────────┘
```

---

## File Structure

```
AI-Web-Summarizer/
├── manifest.json          # Extension configuration and permissions
├── background.js          # Background script (event-driven, non-persistent)
├── content.js             # Content script (injected into web pages)
├── popup.html             # Main popup UI structure
├── popup.js               # Popup UI logic and interactions
├── result.html            # Dedicated summary window UI
├── result.js              # Result window logic
├── icons/
│   ├── icon48.png        # Extension icon (48x48)
│   └── icon96.png        # Extension icon (96x96)
└── README.md             # User-facing documentation
```

---

## Component Details

### 1. manifest.json
**Purpose**: Extension configuration and metadata

**Key Configurations**:
- **Manifest Version**: 2 (WebExtensions API)
- **Permissions**:
  - `activeTab`: Access to current tab content
  - `storage`: Local storage for settings
  - `contextMenus`: Right-click context menu
  - `notifications`: Browser notifications
  - `<all_urls>`: Access to all web pages

**Browser Action**:
- Default popup: `popup.html`
- Default icons: `icons/icon48.png`, `icons/icon96.png`

**Background Script**:
- Non-persistent (`persistent: false`)
- Event-driven lifecycle

**Content Scripts**:
- Matches: `<all_urls>`
- Injected script: `content.js`

---

### 2. background.js
**Purpose**: Central coordinator for API calls, context menu, and message routing

**Key Responsibilities**:
- Handle API communication with OpenAI/OpenRouter
- Manage context menu interactions
- Route messages between popup, content script, and result window
- Store and retrieve settings from `browser.storage.local`

**Important Functions**:

#### `handleSummarizeRequest(tab, openInWindow)`
- Centralized summarization logic
- Parameters:
  - `tab`: Browser tab object
  - `openInWindow`: Boolean (true = open result window, false = return to popup)
- Retrieves page content via content script
- Calls AI API
- Displays result in popup or dedicated window

#### `getSummaryFromAI(settings, pageContent, customPrompt)`
- Makes API calls to OpenAI or OpenRouter
- Parameters:
  - `settings`: User configuration (apiKey, provider, model, language)
  - `pageContent`: Extracted page content object
  - `customPrompt`: Custom user prompt (optional)
- Returns: Summary text string

**Model Configurations**:
```javascript
const MODELS = {
  openrouter: [
    { id: 'google/gemini-3-flash-preview', name: 'Google: Gemini 3 Flash Preview' },
    { id: 'anthropic/claude-opus-4.5', name: 'Claude 4.5 Opus' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    // ... more models
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    // ... more models
  ]
};
```

**Message Handlers**:
- `summarizePage`: Summarize current page
- `sendCustomPrompt`: Handle custom AI prompts
- `getModels`: Return available models for current provider

**Context Menu**:
- ID: `summarize-page-window`
- Title: "Summarize This Page with AI"
- Context: All page elements

---

### 3. content.js
**Purpose**: Extract main content from web pages

**Key Responsibilities**:
- Listen for `getContent` message from background script
- Clone document body and remove unwanted elements
- Clean and normalize text content
- Return page metadata (title, URL, text)

**Content Extraction Logic**:
```javascript
function extractMainContent() {
  // Remove unwanted elements
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer',
    'aside', 'iframe', 'noscript', '[role="navigation"]',
    '[role="banner"]', '[role="complementary"]', '.ad',
    '.advertisement', '.sidebar', '.menu'
  ];

  // Clean whitespace and limit length
  return text.substring(0, 10000);
}
```

**Return Object**:
```javascript
{
  title: string,      // Page title
  url: string,        // Page URL
  text: string        // Cleaned main content (max 10,000 chars)
}
```

---

### 4. popup.html & popup.js
**Purpose**: Main user interface for the extension

**UI Panels**:
1. **Settings Panel** (`#settingsPanel`):
   - Provider selection (OpenRouter/OpenAI)
   - API key input
   - Model selection
   - Summary language selection

2. **TTS Settings Panel** (`#ttsPanel`):
   - Voice selection (filtered by language)
   - Speed slider (0.5x - 2.0x)
   - Pitch slider (0.5 - 2.0)
   - Test voice button

3. **Chat Panel** (`#chatPanel`):
   - Custom prompt textarea
   - Send button for custom AI queries

4. **Main Actions**:
   - Summarize This Page button
   - Read Aloud button (TTS)
   - Result display area

**Key Functions**:

#### `loadSettings()`
- Loads all settings from `browser.storage.local`
- Populates UI with saved values
- Auto-shows settings panel if no API key exists

#### `updateModelOptions(selectedModelId)`
- Updates model dropdown based on selected provider
- Called when provider changes

#### `populateVoiceDropdown(selectedVoiceName)`
- Filters voices by current language
- Groups voices by matching language and others
- Auto-selects saved voice

#### `getBestVoice(preferredVoiceName)`
- Smart voice selection algorithm:
  1. Saved voice (if exists)
  2. Google voice for current language
  3. Any voice matching language
  4. System default voice

**Language Mapping**:
```javascript
const langMap = {
  'english': 'en', 'spanish': 'es', 'french': 'fr',
  'german': 'de', 'italian': 'it', 'portuguese': 'pt',
  'russian': 'ru', 'chinese': 'zh', 'japanese': 'ja',
  'korean': 'ko', 'arabic': 'ar', 'hindi': 'hi',
  'dutch': 'nl', 'polish': 'pl', 'turkish': 'tr'
};
```

---

### 5. result.html & result.js
**Purpose**: Dedicated window for displaying summaries (context menu triggered)

**Features**:
- Displays page title, URL, and summary
- Read aloud functionality
- Copy to clipboard (includes title, URL, and summary)
- TTS settings panel
- Loading state with spinner
- Error display

**Message Handlers**:
- `displaySummary`: Shows successful summary result
- `displayError`: Shows error message

**Window Creation**:
```javascript
browser.windows.create({
  url: browser.runtime.getURL("result.html"),
  type: "popup",
  width: 600,
  height: 700
});
```

---

## State Management

### browser.storage.local
All extension settings are stored in browser local storage:

```javascript
{
  // AI Settings
  provider: 'openrouter' | 'openai',
  apiKey: string,
  model: string,                    // Model ID
  language: string,                 // Summary language

  // TTS Settings
  ttsRate: number,                  // 0.5 - 2.0
  ttsPitch: number,                 // 0.5 - 2.0
  ttsVoice: string                  // Voice name (optional)
}
```

**Storage Operations**:
```javascript
// Save settings
await browser.storage.local.set({ apiKey, provider, model });

// Load settings
const data = await browser.storage.local.get(['apiKey', 'provider']);
```

---

## Message Passing Patterns

### 1. Popup → Background → Content Script
**Summarize page flow**:
```javascript
// popup.js
browser.runtime.sendMessage({
  action: 'summarizePage',
  tab: tabs[0]
});

// background.js
browser.tabs.sendMessage(tab.id, { action: 'getContent' });

// content.js
browser.runtime.onMessage.addListener((request) => {
  if (request.action === 'getContent') {
    sendResponse({ title, url, text });
  }
});
```

### 2. Background → Result Window
**Display summary in result window**:
```javascript
// background.js
browser.runtime.sendMessage({
  action: 'displaySummary',
  summary: summary,
  title: pageContent.title,
  url: pageContent.url
});

// result.js
browser.runtime.onMessage.addListener((request) => {
  if (request.action === 'displaySummary') {
    displaySummary(request.summary, request.title, request.url);
  }
});
```

### 3. Popup → Background (Custom Prompt)
```javascript
// popup.js
browser.runtime.sendMessage({
  action: 'sendCustomPrompt',
  prompt: promptText
});

// background.js responds with AI-generated text
```

---

## API Integration

### OpenAI API
**Endpoint**: `https://api.openai.com/v1/chat/completions`

**Request Format**:
```javascript
{
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: prompt }
  ],
  max_tokens: 500  // 500 for summaries, 1000 for custom prompts
}
```

**Headers**:
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
  'X-Title': 'AI Web Summarizer'
}
```

### OpenRouter API
**Endpoint**: `https://openrouter.ai/api/v1/chat/completions`

**Request Format**:
```javascript
{
  model: 'openai/gpt-4o-mini',
  messages: [
    { role: 'user', content: prompt }
  ],
  max_tokens: 500
}
```

**Note**: OpenRouter doesn't use system messages in this implementation.

### Prompt Construction
**Summary Prompt**:
```javascript
const prompt = `Concise plain text summary (no markdown) of: ${pageContent.title}
URL: ${pageContent.url}

Content:
${pageContent.text.substring(0, 8000)}

IMPORTANT: Summary must be in ${language}.`;
```

**Custom Prompt**: User input passed directly to API.

---

## Text-to-Speech (TTS) System

### Voice Selection Strategy
1. **User-selected voice** (if saved in settings)
2. **Google voice** matching current language
3. **Any voice** matching current language
4. **System default** voice

### TTS Settings
- **Rate**: 0.5x - 2.0x (default: 1.0x)
- **Pitch**: 0.5 - 2.0 (default: 1.0)
- **Voice**: Auto-selected or user-chosen

### Implementation
```javascript
const utterance = new SpeechSynthesisUtterance(text);
utterance.rate = parseFloat(ttsRate) || 1;
utterance.pitch = parseFloat(ttsPitch) || 1;
utterance.voice = getBestVoice(ttsVoice);
synth.speak(utterance);
```

### Voice Loading
```javascript
// Voices load asynchronously
if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = loadVoices;
}
```

---

## Development Workflows

### Testing the Extension Locally
1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the project directory
5. Extension will be loaded temporarily (until Firefox restarts)

### Debugging
- **Background script**: Open `about:debugging` → Inspect background script
- **Popup**: Right-click popup → Inspect Element
- **Content script**: Open browser DevTools on the target webpage
- **Console logs**: Check browser console for errors

### Common Development Tasks

#### Adding a New AI Model
1. Add model to `MODELS` object in `background.js`:
```javascript
const MODELS = {
  openrouter: [
    { id: 'new-model/id', name: 'New Model Name' },
    // ...
  ]
};
```

#### Adding a New Language
1. Add language option to `popup.html`:
```html
<option value="newlang">New Language (Native Name)</option>
```

2. Add language code mapping in `popup.js` and `result.js`:
```javascript
const langMap = {
  'newlang': 'xx',  // ISO 639-1 code
  // ...
};
```

#### Modifying Content Extraction
Edit `extractMainContent()` in `content.js`:
```javascript
const unwantedSelectors = [
  // Add new selectors to remove
  '.new-unwanted-class',
  // ...
];
```

---

## Coding Conventions

### Naming Conventions
- **Functions**: camelCase (`getSummaryFromAI`, `handleSummarizeRequest`)
- **Constants**: UPPERCASE (`MODELS`)
- **DOM IDs**: kebab-case (`#summary-btn`, `#settings-panel`)
- **Variables**: camelCase (`isSpeaking`, `availableVoices`)

### Code Style
- **Async/Await**: Preferred over promises chains
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Comments**: Minimal, focused on "why" not "what"
- **String Sanitization**: Always sanitize headers with `sanitizeHeader()` function

### Message Patterns
Always return `true` from message listeners to keep async channel open:
```javascript
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleRequest(request).then(result => {
    sendResponse(result);
  });
  return true;  // Keep channel open for async response
});
```

### Storage Operations
Always use async/await with `browser.storage.local`:
```javascript
const data = await browser.storage.local.get(['apiKey', 'provider']);
await browser.storage.local.set({ apiKey, provider });
```

---

## Security Considerations

### API Key Handling
- API keys stored in `browser.storage.local` (encrypted by browser)
- Keys sanitized before use in headers
- Never logged or exposed in error messages

### Content Extraction
- Content limited to 10,000 characters to prevent memory issues
- Only main text content extracted (scripts/styles removed)
- No execution of page JavaScript in content script

### Header Sanitization
```javascript
const sanitizeHeader = (str) => str ? str.replace(/[^\x00-\x7F]/g, "").trim() : "";
```
Removes non-ASCII characters from headers to prevent injection attacks.

---

## Common Issues and Solutions

### Issue: API Key Not Saving
**Solution**: Check browser console for storage errors. Ensure `storage` permission is in manifest.

### Issue: Content Script Not Extracting Content
**Solution**:
- Verify page has loaded completely
- Check if site uses shadow DOM or iframes
- Review console for content script errors

### Issue: Voices Not Loading
**Solution**:
- Voices load asynchronously; use `onvoiceschanged` event
- Some browsers have limited voice support
- Test with `synth.getVoices()` in console

### Issue: Result Window Not Receiving Message
**Solution**:
- Add delay before sending message (100ms) to allow window to load
- Check if window creation succeeded
- Verify message action name matches listener

### Issue: API Rate Limiting
**Solution**:
- Implement exponential backoff
- Cache recent summaries
- Reduce `max_tokens` parameter

---

## Extension Lifecycle

### Installation Flow
1. `browser.runtime.onInstalled` fires
2. Context menu item created: "Summarize This Page with AI"
3. User opens popup
4. If no API key: Settings panel auto-shows
5. User saves API key and settings

### Summarization Flow (Popup)
1. User clicks "Summarize This Page"
2. Popup sends `summarizePage` message to background
3. Background sends `getContent` message to content script
4. Content script extracts and returns page content
5. Background calls AI API with content
6. Background returns summary to popup
7. Popup displays summary with TTS option

### Summarization Flow (Context Menu)
1. User right-clicks → "Summarize This Page with AI"
2. Background handles context menu click
3. Background creates new popup window (`result.html`)
4. Background follows same API flow
5. Background sends `displaySummary` message to result window
6. Result window displays summary

---

## Testing Checklist

### Basic Functionality
- [ ] Extension loads without errors
- [ ] Settings panel opens and closes
- [ ] API key saves successfully
- [ ] Model dropdown updates when provider changes
- [ ] Language selection works
- [ ] Summarize button generates summary
- [ ] Custom prompt chat works
- [ ] TTS plays audio correctly
- [ ] Context menu item appears
- [ ] Result window opens with summary

### Edge Cases
- [ ] Error handling for missing API key
- [ ] Error handling for invalid API key
- [ ] Error handling for network failures
- [ ] Error handling for API rate limits
- [ ] Large page content (>10,000 chars)
- [ ] Pages with heavy JavaScript/SPA
- [ ] Pages with iframes
- [ ] Non-English content
- [ ] Empty pages
- [ ] PDF files

### Cross-Browser Testing
- [ ] Firefox (primary target)
- [ ] Firefox Developer Edition
- [ ] Firefox Nightly

---

## Performance Considerations

### Content Extraction
- Max 10,000 characters extracted to prevent token limit issues
- DOM cloning prevents modifying actual page
- Unwanted elements removed before text extraction

### API Calls
- Summaries: 500 max tokens
- Custom prompts: 1000 max tokens
- Text truncated to 8,000 chars before sending to API

### Background Script
- Non-persistent background script (event-driven)
- Minimal memory footprint
- No continuous processes running

---

## Future Enhancement Ideas

### Feature Ideas
- Bookmark/save summaries locally
- Export summaries to PDF/markdown
- History of previous summaries
- Batch summarization of multiple tabs
- Customizable summary length/style
- Integration with note-taking apps
- Offline mode with local models
- Summary comparison across providers
- Automatic summarization on page load (optional)

### Technical Improvements
- Migrate to Manifest V3
- Add unit tests for core functions
- Implement retry logic with exponential backoff
- Add summary caching to reduce API calls
- Optimize content extraction for SPAs
- Add telemetry/analytics (privacy-respecting)
- Implement A/B testing for prompts

---

## Important Notes for AI Assistants

### When Modifying Code

1. **Always preserve existing functionality**: Don't break existing features when adding new ones.

2. **Test message passing carefully**: Browser extension message passing is async and can be tricky. Always return `true` from listeners and use async/await.

3. **Handle errors gracefully**: Show user-friendly error messages, not raw API errors.

4. **Respect storage schema**: When adding new settings, update all relevant files (popup.js, result.js, background.js).

5. **Consider token limits**: AI APIs have token limits. Keep prompts concise and content truncated.

6. **Test TTS thoroughly**: Voice availability varies by browser/OS. Always have fallbacks.

7. **Sanitize all inputs**: Especially API keys and headers to prevent injection attacks.

8. **Update version numbers**: When making changes, increment version in `manifest.json`.

9. **Document new features**: Add to README.md and update this CLAUDE.md.

10. **Follow WebExtensions API**: Use `browser.*` namespace (Firefox standard), not `chrome.*`.

### Code Patterns to Follow

#### Good Pattern: Async Message Handling
```javascript
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'myAction') {
    doAsyncWork(request).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;  // CRITICAL: Keep channel open
  }
});
```

#### Good Pattern: Storage Operations
```javascript
async function saveSettings() {
  const settings = {
    apiKey: document.getElementById('apiKey').value,
    provider: document.getElementById('provider').value
  };
  await browser.storage.local.set(settings);
}
```

#### Good Pattern: Error Display
```javascript
try {
  const result = await doSomething();
  displaySuccess(result);
} catch (error) {
  result.className = 'summary error';
  result.textContent = `Error: ${error.message}`;

  if (error.message.includes('API key')) {
    document.getElementById('settingsPanel').classList.remove('hidden');
  }
}
```

### Common Pitfalls to Avoid

1. **Don't forget `return true` in message listeners**: Async responses won't work without it.

2. **Don't send messages to windows immediately after creation**: Add 100ms delay for window to load.

3. **Don't assume voices are loaded synchronously**: Use `onvoiceschanged` event.

4. **Don't store sensitive data in plain text**: Browser storage is encrypted, but avoid unnecessary exposure.

5. **Don't make API calls without checking for API key**: Always validate settings first.

6. **Don't ignore token limits**: Truncate content appropriately (8000 chars for summaries).

7. **Don't use synchronous storage API**: Always use async `browser.storage.local.get/set`.

---

## Glossary

- **Content Script**: JavaScript that runs in the context of web pages
- **Background Script**: JavaScript that runs in the extension's background context
- **Browser Action**: Extension icon and popup in browser toolbar
- **Context Menu**: Right-click menu integration
- **WebExtensions API**: Cross-browser extension API (Firefox standard)
- **TTS**: Text-to-Speech synthesis
- **OpenRouter**: AI model aggregator/proxy service
- **Manifest V2**: Second version of extension manifest format
- **SpeechSynthesis**: Web API for text-to-speech
- **browser.storage.local**: Browser's local storage API for extensions

---

## References

- [WebExtensions API Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Firefox Extension Workshop](https://extensionworkshop.com/)

---

## Version History

- **1.0.7**: Current version (as of documentation creation)
- Development history visible in git commits

---

## Contact & Support

This is a personal "vibe coded" project. See README.md for author's note about the project's origins and current state.

---

*This documentation was created to help AI assistants understand and work with the AI Web Summarizer codebase. Last updated: 2026-01-23*
