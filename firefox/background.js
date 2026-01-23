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

// 3. Handle Messages from popup
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

  try {
    // Get content from active page
    const pageContent = await browser.tabs.sendMessage(tab.id, { action: 'getContent' });
    
    // Fetch Summary
    const summary = await getSummaryFromAI(data, pageContent, null);

    if (openInWindow) {
      // Open Dedicated Result Window
      await browser.windows.create({
        url: browser.runtime.getURL("result.html"),
        type: "popup",
        width: 600,
        height: 700
      });

      // Send to Result Window (with delay for window load)
      setTimeout(() => {
        browser.runtime.sendMessage({
          action: 'displaySummary',
          summary: summary,
          title: pageContent.title,
          url: pageContent.url
        });
      }, 100);
    }

    return { summary, title: pageContent.title, url: pageContent.url };

  } catch (error) {
    console.error('Summarization error:', error);
    
    if (openInWindow) {
      setTimeout(() => {
        browser.runtime.sendMessage({ 
          action: 'displayError', 
          error: error.message 
        });
      }, 800);
    }
    
    throw error;
  }
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