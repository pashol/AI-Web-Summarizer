// Helper: Sanitize headers for fetch
const sanitizeHeader = (str) => str ? str.replace(/[^\x00-\x7F]/g, "").trim() : "";

// Model configurations
const MODELS = {
  openrouter: [
    { id: 'google/gemini-3-flash-preview', name: 'Google: Gemini 3 Flash Preview' },
    { id: 'x-ai/grok-4', name: 'Grok 4' },
    { id: 'x-ai/grok-4-fast', name: 'Grok 4 Fast' },
    { id: 'anthropic/claude-opus-4.5', name: 'Claude 4.5 Opus' }, 
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude 4.5 Haiku' },   
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude 4.5 Sonnet' },
    { id: 'openai/gpt-5.2-chat', name: 'GPT-5.2 Chat' },     
    { id: 'openai/gpt-5.2', name: 'GPT-5.2' },  
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
    { id: 'mistralai/mistral-large-2407', name: 'Mistral Large' },
    { id: 'perplexity/llama-3.1-sonar-large-128k-online', name: 'Perplexity Sonar' },
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' }
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ]
};

// Create Context Menu Item on install and startup
function createContextMenu() {
  chrome.contextMenus.create({
    id: "summarize-page-window",
    title: "Summarize This Page with AI",
    contexts: ["all"]
  }, () => {
    // Ignore error if menu already exists
    if (chrome.runtime.lastError) {
      console.log("Context menu already exists or error:", chrome.runtime.lastError.message);
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// Also create on startup to handle browser restarts
chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarize-page-window") {
    await handleSummarizeRequest(tab, true);
  }
});

// Handle Messages from popup and result page
let pendingResultWindow = null; // Track window waiting for result

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarizePage') {
    handleSummarizeRequest(request.tab, false)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (request.action === 'sendCustomPrompt') {
    handleCustomPrompt(request.prompt)
      .then(result => sendResponse({ summary: result }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (request.action === 'getModels') {
    sendResponse({ models: MODELS });
    return true;
  }
  
  if (request.action === 'resultReady') {
    // Result page is ready to receive messages
    if (pendingResultWindow) {
      sendPendingResult(pendingResultWindow.tabId);
      pendingResultWindow = null;
    }
    return false;
  }
  
  return false;
});

// Centralized function to handle summarization
async function handleSummarizeRequest(tab, openInWindow) {
  const data = await chrome.storage.local.get(['apiKey', 'provider', 'model', 'language']);

  if (!data.apiKey) {
    if (openInWindow) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "API Key Required",
        message: "Please open the extension settings and save your API key first."
      });
    }
    throw new Error('API key required. Please save your API key in Settings.');
  }

  if (openInWindow) {
    // Open result window immediately, then fetch content/summary
    const newWindow = await chrome.windows.create({
      url: chrome.runtime.getURL("result.html"),
      type: "popup",
      width: 600,
      height: 700
    });

    // Store result window info for when page signals ready
    const resultTabId = newWindow.tabs[0].id;
    
    // Fetch content and summary in background
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContent
      });
      
      const pageContent = result.result;
      const summary = await getSummaryFromAI(data, pageContent, null);
      
      // Send result to the result window tab with retries
      await sendWithRetry(resultTabId, {
        action: 'displaySummary',
        summary: summary,
        title: pageContent.title,
        url: pageContent.url
      });
    } catch (error) {
      console.error('Summarization error:', error);
      // Send error to result window with retries
      await sendWithRetry(resultTabId, {
        action: 'displayError',
        error: error.message
      }).catch(() => {
        // If all retries fail, show notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Summarization Failed",
          message: error.message
        });
      });
    }
  } else {
    // Popup mode: return result directly
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContent
      });
      
      const pageContent = result.result;
      const summary = await getSummaryFromAI(data, pageContent, null);
      return { summary, title: pageContent.title, url: pageContent.url };
    } catch (error) {
      console.error('Summarization error:', error);
      throw error;
    }
  }
}

// Send message with retry logic (3 attempts, 100-150ms backoff)
async function sendWithRetry(tabId, message, attempt = 0) {
  const maxAttempts = 3;
  const baseDelay = 100;
  
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (attempt < maxAttempts - 1) {
      const delay = baseDelay + (attempt * 50);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendWithRetry(tabId, message, attempt + 1);
    }
    throw error;
  }
}

// Helper to send result once result page signals ready
async function sendPendingResult(tabId) {
  // This is called when resultReady message arrives
  // The actual data is passed via pendingResultWindow context
  // This function exists for future use if needed
}

// Function to inject into page for content extraction
function extractPageContent() {
  const clone = document.body.cloneNode(true);
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 
    'aside', 'iframe', 'noscript', '[role="navigation"]',
    '[role="banner"]', '[role="complementary"]', '.ad',
    '.advertisement', '.sidebar', '.menu'
  ];
  
  unwantedSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  let text = clone.innerText || clone.textContent;
  text = text.replace(/\s+/g, ' ').trim();
  
  return {
    title: document.title,
    url: window.location.href,
    text: text.substring(0, 10000)
  };
}

// Handle custom prompts
async function handleCustomPrompt(prompt) {
  const data = await chrome.storage.local.get(['apiKey', 'provider', 'model']);

  if (!data.apiKey) {
    throw new Error('API key required. Please save your API key in Settings.');
  }

  return await getSummaryFromAI(data, null, prompt);
}

// Centralized AI Logic
async function getSummaryFromAI(settings, pageContent, customPrompt) {
  let prompt;
  
  if (customPrompt) {
    prompt = customPrompt;
  } else {
    const lang = settings.language || 'english';
    const instruction = lang !== 'english' ? `\n\nIMPORTANT: Summary must be in ${lang}.` : '';
    prompt = `Concise plain text summary (no markdown) of: ${pageContent.title}\nURL: ${pageContent.url}\n\nContent:\n${pageContent.text.substring(0, 8000)}${instruction}`;
  }

  const url = settings.provider === 'openai' 
    ? 'https://api.openai.com/v1/chat/completions' 
    : 'https://openrouter.ai/api/v1/chat/completions';

  const defaultModel = settings.provider === 'openai' ? 'gpt-4o-mini' : 'openai/gpt-4o-mini';
  
  const messages = settings.provider === 'openai'
    ? [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ]
    : [{ role: 'user', content: prompt }];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sanitizeHeader(settings.apiKey)}`,
      'X-Title': 'AI Web Summarizer'
    },
    body: JSON.stringify({
      model: settings.model || defaultModel,
      messages: messages,
      max_tokens: customPrompt ? 1000 : 500
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error?.message || 'API Error');
  }
  
  return resData.choices[0].message.content;
}