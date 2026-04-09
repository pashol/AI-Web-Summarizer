// Helper: Sanitize headers for fetch
const sanitizeHeader = (str) => str ? str.replace(/[^\x00-\x7F]/g, "").trim() : "";

// Model configurations
const MODELS = {
  openrouter: [
    { id: 'openrouter/free', name: 'Auto (Best Free Model)' },
    { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2' },
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },
    { id: 'openai/gpt-5.4-mini', name: 'GPT-5.4 Mini' },
    { id: 'mistralai/mistral-small-3.2-24b-instruct', name: 'Mistral Small 3.2' },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
    { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
    { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' },
  ],
  openai: [
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
    { id: 'gpt-5.4', name: 'GPT-5.4' },
    { id: 'gpt-4o', name: 'GPT-4o (Legacy)' },
  ]
};

// Create Context Menu Items on install and startup
function createContextMenu() {
  chrome.contextMenus.create({
    id: "summarize-page-window",
    title: "Summerize This",
    contexts: ["all"]
  }, () => {
    // Ignore error if menu already exists
    if (chrome.runtime.lastError) {
      console.log("Context menu already exists or error:", chrome.runtime.lastError.message);
    }
  });

  chrome.contextMenus.create({
    id: "factcheck-page-window",
    title: "Fact Check This",
    contexts: ["all"]
  }, () => {
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
    await handleSummarizeRequest(tab, true, info.selectionText || null);
  } else if (info.menuItemId === "factcheck-page-window") {
    await handleFactCheckRequest(tab, info.selectionText || null);
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
  
  if (request.action === 'factCheckPage') {
    handleFactCheckPageFromPopup(request.tab)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
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
async function handleSummarizeRequest(tab, openInWindow, contextMenuSelection = null) {
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

      // Use context menu selection, then content script selection, then full page
      const selectedText = contextMenuSelection || pageContent.selectedText || null;
      const contentForAI = selectedText
        ? { ...pageContent, text: selectedText }
        : pageContent;
      const isSelectedText = !!selectedText;

      const summary = await getSummaryFromAI(data, contentForAI, null, isSelectedText);

      // Send result to the result window tab with retries
      await sendWithRetry(resultTabId, {
        action: 'displaySummary',
        summary: summary,
        title: pageContent.title,
        url: pageContent.url,
        isSelectedText
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

      const selectedText = pageContent.selectedText || null;
      const contentForAI = selectedText
        ? { ...pageContent, text: selectedText }
        : pageContent;
      const isSelectedText = !!selectedText;

      const summary = await getSummaryFromAI(data, contentForAI, null, isSelectedText);
      return { summary, title: pageContent.title, url: pageContent.url, isSelectedText };
    } catch (error) {
      console.error('Summarization error:', error);
      throw error;
    }
  }
}

// Fact-check request from context menu (opens result window)
async function handleFactCheckRequest(tab, selectedText) {
  const data = await chrome.storage.local.get(['apiKey', 'provider', 'model', 'language']);

  if (!data.apiKey) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "API Key Required",
      message: "Please open the extension settings and save your API key first."
    });
    return;
  }

  const newWindow = await chrome.windows.create({
    url: chrome.runtime.getURL("result.html") + "?mode=factcheck",
    type: "popup",
    width: 600,
    height: 700
  });

  const resultTabId = newWindow.tabs[0].id;

  try {
    let pageContent;
    if (selectedText) {
      pageContent = { title: tab.title || 'Selected Text', url: tab.url || '', text: selectedText };
    } else {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContent
      });
      pageContent = result.result;
    }

    const factCheck = await getFactCheckFromAI(data, pageContent);

    await sendWithRetry(resultTabId, {
      action: 'displayFactCheck',
      factCheck: factCheck,
      title: pageContent.title,
      url: pageContent.url,
      isSelectedText: !!selectedText
    });
  } catch (error) {
    console.error('Fact-check error:', error);
    await sendWithRetry(resultTabId, {
      action: 'displayError',
      error: error.message
    }).catch(() => {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Fact Check Failed",
        message: error.message
      });
    });
  }
}

// Fact-check request from popup (returns result directly)
async function handleFactCheckPageFromPopup(tab) {
  const data = await chrome.storage.local.get(['apiKey', 'provider', 'model', 'language']);

  if (!data.apiKey) {
    throw new Error('API key required. Please save your API key in Settings.');
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractPageContent
  });
  const pageContent = result.result;
  const factCheck = await getFactCheckFromAI(data, pageContent);
  return { factCheck, title: pageContent.title, url: pageContent.url };
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
  // Prioritize semantic content elements, then common CMS content classes
  const preferred = document.querySelector('article')
    || document.querySelector('main')
    || document.querySelector('[role="main"]')
    || document.querySelector('.post-content, .entry-content, .article-content')
    || document.querySelector('.post-body, .article-body, .story-body')
    || document.querySelector('#content, .content');
  const clone = (preferred || document.body).cloneNode(true);

  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer',
    'aside', 'iframe', 'noscript', '[role="navigation"]',
    '[role="banner"]', '[role="complementary"]', '.ad',
    '.advertisement', '.sidebar', '.menu',
    // Hidden/invisible elements
    '[aria-hidden="true"]', '[hidden]', '.hidden',
    '.visually-hidden', '.sr-only',
    // Common boilerplate
    'button', 'form', '[class*="cookie"]', '[class*="subscribe"]',
    '[class*="share"]', '[class*="social"]'
  ];

  unwantedSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  let text = clone.innerText || clone.textContent;
  text = text.replace(/\s+/g, ' ').trim();

  // Deduplicate repeated lines
  const lines = text.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const unique = [];
  for (const line of lines) {
    if (!seen.has(line)) {
      seen.add(line);
      unique.push(line);
    }
  }
  text = unique.join('. ');

  const selectedText = window.getSelection().toString().trim();

  return {
    title: document.title,
    url: window.location.href,
    text: text.substring(0, 10000),
    selectedText: selectedText || null
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
async function getSummaryFromAI(settings, pageContent, customPrompt, isSelectedText = false) {
  let prompt;

  if (customPrompt) {
    prompt = customPrompt;
  } else {
    const lang = settings.language || 'english';
    const instruction = lang !== 'english' ? `\n\nIMPORTANT: Summary must be in ${lang}.` : '';
    if (isSelectedText) {
      prompt = `Concise plain text summary (no markdown) of the following selected text from: ${pageContent.title}\nURL: ${pageContent.url}\n\nSelected text:\n${pageContent.text.substring(0, 8000)}${instruction}`;
    } else {
      prompt = `Concise plain text summary (no markdown) of: ${pageContent.title}\nURL: ${pageContent.url}\n\nContent:\n${pageContent.text.substring(0, 8000)}${instruction}`;
    }
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

  // Build headers with OpenRouter-specific identity headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sanitizeHeader(settings.apiKey)}`
  };

  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/pashol/AI-Web-Summarizer';
    headers['X-Title'] = 'AI Web Summarizer';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
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

// Fact-check AI logic
async function getFactCheckFromAI(settings, pageContent) {
  const lang = settings.language || 'english';
  const langInstruction = lang !== 'english' ? `\n\nIMPORTANT: Your entire response must be in ${lang}.` : '';

  const role = 'You are a critical investigative journalist. Verify the factual claims in the following content with rigorous skepticism.';

  const taskPrompt = `Analyze the content and identify the 5-8 most significant factual claims. For each claim, determine if it is TRUE, FALSE, or UNVERIFIED based on your knowledge.

Respond in EXACTLY this plain text format (no markdown, no asterisks):

Overall: [one sentence summarizing the overall credibility of this content]

✅ TRUE (1): [specific claim] → [brief explanation of why it is true]
❌ FALSE (2): [specific claim] → [brief explanation of what is actually true]
⚠️ UNVERIFIED (3): [specific claim] → [brief explanation of why this is hard to verify]

Use the exact emoji prefixes shown. Number each claim sequentially across all categories. Do not include external links or URLs.${langInstruction}

Page title: ${pageContent.title}
URL: ${pageContent.url}

Content:
${pageContent.text.substring(0, 8000)}`;

  const url = settings.provider === 'openai'
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';

  const defaultModel = settings.provider === 'openai' ? 'gpt-4o-mini' : 'openai/gpt-4o-mini';

  // OpenAI: role in system message, task in user message
  // OpenRouter: role + task combined in user message (no system message)
  const messages = settings.provider === 'openai'
    ? [
        { role: 'system', content: role },
        { role: 'user', content: taskPrompt }
      ]
    : [{ role: 'user', content: `${role}\n\n${taskPrompt}` }];

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sanitizeHeader(settings.apiKey)}`
  };

  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/pashol/AI-Web-Summarizer';
    headers['X-Title'] = 'AI Web Summarizer';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: settings.model || defaultModel,
      messages: messages,
      max_tokens: 1500
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error?.message || 'API Error');
  }

  return resData.choices[0].message.content;
}