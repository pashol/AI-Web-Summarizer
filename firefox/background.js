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

// 1. Create Context Menu Item on install and startup
function createContextMenu() {
  browser.contextMenus.create({
    id: "summarize-page-window",
    title: "Summarize This Page with AI",
    contexts: ["all"]
  }, () => {
    // Ignore error if menu already exists
    if (browser.runtime.lastError) {
      console.log("Context menu already exists or error:", browser.runtime.lastError.message);
    }
  });
}

browser.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// Also create on startup to handle Firefox restarts
browser.runtime.onStartup.addListener(() => {
  createContextMenu();
});

// 2. Handle Context Menu Click
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarize-page-window") {
    await handleSummarizeRequest(tab, true); // true = open in window
  }
});

// 3. Handle Messages from popup and result page
let pendingResultWindow = null; // Track window waiting for result

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarizePage') {
    handleSummarizeRequest(request.tab, false).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'sendCustomPrompt') {
    handleCustomPrompt(request.prompt).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
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
});

// Centralized function to handle summarization
async function handleSummarizeRequest(tab, openInWindow) {
  const data = await browser.storage.local.get(['apiKey', 'provider', 'model', 'language']);

  // Check for API key
  if (!data.apiKey) {
    if (openInWindow) {
      browser.notifications.create({
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
    const newWindow = await browser.windows.create({
      url: browser.runtime.getURL("result.html"),
      type: "popup",
      width: 600,
      height: 700
    });

    // Store result window info for when page signals ready
    const resultTabId = newWindow.tabs[0].id;
    
    // Fetch content and summary in background
    try {
      const pageContent = await browser.tabs.sendMessage(tab.id, { action: 'getContent' });
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
        browser.notifications.create({
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
      const pageContent = await browser.tabs.sendMessage(tab.id, { action: 'getContent' });
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
    return await browser.tabs.sendMessage(tabId, message);
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

// Handle custom prompts
async function handleCustomPrompt(prompt) {
  const data = await browser.storage.local.get(['apiKey', 'provider', 'model']);

  if (!data.apiKey) {
    throw new Error('API key required. Please save your API key in Settings.');
  }

  return await getSummaryFromAI(data, null, prompt);
}

// Centralized AI Logic
async function getSummaryFromAI(settings, pageContent, customPrompt) {
  let prompt;
  
  if (customPrompt) {
    // Custom prompt mode
    prompt = customPrompt;
  } else {
    // Page summary mode
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
      'User-Agent': 'AI-Web-Summarizer/1.0.12'
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