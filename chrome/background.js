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
    { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
    { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6' },
  ],
  openai: [
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
    { id: 'gpt-5.4', name: 'GPT-5.4' },
    { id: 'gpt-4o', name: 'GPT-4o (Legacy)' },
  ]
};

// Default metrics structure
const DEFAULT_METRICS = {
  enabled: true,
  firstUsed: null,
  lastUsed: null,
  counts: { summarize: 0, factCheck: 0, customPrompt: 0, followUp: 0 },
  extraction: { auto: 0, readability: 0, current: 0, readabilitySuccess: 0, readabilityFallback: 0, truncatedCount: 0 },
  provider: { openrouter: 0, openai: 0 },
  model: {},
  errors: { apiError: 0, extractionError: 0 },
  daily: {}
};

function recordMetric(entry) {
  chrome.storage.local.get(['metrics'], (data) => {
    const metrics = data.metrics || { ...DEFAULT_METRICS };
    if (!metrics.enabled) return;
    if (!metrics.counts) metrics.counts = { ...DEFAULT_METRICS.counts };
    if (!metrics.extraction) metrics.extraction = { ...DEFAULT_METRICS.extraction };
    if (!metrics.provider) metrics.provider = { ...DEFAULT_METRICS.provider };
    if (!metrics.model) metrics.model = {};
    if (!metrics.errors) metrics.errors = { ...DEFAULT_METRICS.errors };
    if (!metrics.daily) metrics.daily = {};

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    if (!metrics.firstUsed) metrics.firstUsed = now;
    metrics.lastUsed = now;

    if (entry.type === 'summarize') {
      metrics.counts.summarize++;
    } else if (entry.type === 'factCheck') {
      metrics.counts.factCheck++;
    } else if (entry.type === 'customPrompt') {
      metrics.counts.customPrompt++;
    } else if (entry.type === 'followUp') {
      metrics.counts.followUp++;
    }

    if (entry.extractionMethod !== undefined) {
      metrics.extraction[entry.extractionMethod] = (metrics.extraction[entry.extractionMethod] || 0) + 1;
    }
    if (entry.extractionUsed) {
      if (entry.extractionUsed === 'readability') {
        metrics.extraction.readabilitySuccess = (metrics.extraction.readabilitySuccess || 0) + 1;
      } else if (entry.extractionUsed === 'current' && (entry.extractionMethod === 'auto' || entry.extractionMethod === 'readability')) {
        metrics.extraction.readabilityFallback = (metrics.extraction.readabilityFallback || 0) + 1;
      }
    }
    if (entry.wasTruncated) {
      metrics.extraction.truncatedCount = (metrics.extraction.truncatedCount || 0) + 1;
    }
    if (entry.provider) {
      metrics.provider[entry.provider] = (metrics.provider[entry.provider] || 0) + 1;
    }
    if (entry.model) {
      metrics.model[entry.model] = (metrics.model[entry.model] || 0) + 1;
    }
    if (entry.error === 'api') {
      metrics.errors.apiError = (metrics.errors.apiError || 0) + 1;
    } else if (entry.error === 'extraction') {
      metrics.errors.extractionError = (metrics.errors.extractionError || 0) + 1;
    }

    metrics.daily[today] = (metrics.daily[today] || 0) + 1;

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (const key of Object.keys(metrics.daily)) {
      if (key < cutoff) delete metrics.daily[key];
    }

    chrome.storage.local.set({ metrics });
  });
}

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

chrome.runtime.onInstalled.addListener(async () => {
  createContextMenu();
  chrome.storage.local.get(['apiKey', 'apiKeys'], (data) => {
    if (data.apiKey && !data.apiKeys) {
      chrome.storage.local.set({ apiKeys: { openrouter: data.apiKey, openai: '' } }, () => {
        chrome.storage.local.remove('apiKey');
      });
    } else if (data.apiKey && data.apiKeys) {
      chrome.storage.local.remove('apiKey');
    }
  });
});

// Also create on startup to handle browser restarts
chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

// Handle Keyboard Shortcut
chrome.commands.onCommand.addListener(async (command) => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return;

  if (command === 'summarize') {
    await handleSummarizeRequest(tabs[0], true);
  } else if (command === 'fact-check') {
    await handleFactCheckRequest(tabs[0], null);
  }
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
      .then(result => sendResponse(result))
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

  if (request.action === 'sendFollowUpQuestion') {
    getFollowUpFromAI(request)
      .then(result => sendResponse({ answer: result }))
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

function maxTokensParam(model, count) {
  return /^o\d|gpt-5/i.test(model) ? { max_completion_tokens: count } : { max_tokens: count };
}

function getApiKey(data) {
  if (data.apiKeys && data.apiKeys[data.provider]) return data.apiKeys[data.provider];
  if (data.apiKey) return data.apiKey;
  return '';
}

function hasApiKey(data) {
  const key = getApiKey(data);
  return key && key.trim().length > 0;
}

// Centralized function to handle summarization
async function handleSummarizeRequest(tab, openInWindow, contextMenuSelection = null) {
  const data = await chrome.storage.local.get(['apiKeys', 'apiKey', 'provider', 'model', 'language', 'streaming']);

  if (!hasApiKey(data)) {
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
      const pageContent = await chrome.tabs.sendMessage(tab.id, { action: 'getContent' });

      recordMetric({ type: 'summarize', extractionMethod: pageContent.extractionMethod, extractionUsed: pageContent.extractionUsed, wasTruncated: pageContent.wasTruncated, provider: data.provider, model: data.model });

      // Use context menu selection, then content script selection, then full page
      const selectedText = contextMenuSelection || pageContent.selectedText || null;
      const contentForAI = selectedText
        ? { ...pageContent, text: selectedText }
        : pageContent;
      const isSelectedText = !!selectedText;
      const wasTruncated = isSelectedText ? selectedText.length > 10000 : pageContent.wasTruncated;

      const useStreaming = data.streaming !== false;
      if (useStreaming) {
        await sendWithRetry(resultTabId, {
          action: 'streamStart',
          title: pageContent.title,
          url: pageContent.url,
          wasTruncated,
          isSelectedText,
          mode: 'summary'
        });
      }
      const summary = await getSummaryFromAI(data, contentForAI, null, isSelectedText, useStreaming ? { tabId: resultTabId } : null);

      // Send result to the result window tab with retries
      await sendWithRetry(resultTabId, {
        action: 'displaySummary',
        summary: summary,
        title: pageContent.title,
        url: pageContent.url,
        isSelectedText,
        wasTruncated,
        pageText: pageContent.text
      });
    } catch (error) {
      console.error('Summarization error:', error);
      recordMetric({ error: 'api' });
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
      const pageContent = await chrome.tabs.sendMessage(tab.id, { action: 'getContent' });

      recordMetric({ type: 'summarize', extractionMethod: pageContent.extractionMethod, extractionUsed: pageContent.extractionUsed, wasTruncated: pageContent.wasTruncated, provider: data.provider, model: data.model });

      const selectedText = pageContent.selectedText || null;
      const contentForAI = selectedText
        ? { ...pageContent, text: selectedText }
        : pageContent;
      const isSelectedText = !!selectedText;
      const wasTruncated = isSelectedText ? selectedText.length > 10000 : pageContent.wasTruncated;

      const summary = await getSummaryFromAI(data, contentForAI, null, isSelectedText);
      return { summary, title: pageContent.title, url: pageContent.url, isSelectedText, wasTruncated };
    } catch (error) {
      console.error('Summarization error:', error);
      recordMetric({ error: 'api' });
      throw error;
    }
  }
}

// Fact-check request from context menu (opens result window)
async function handleFactCheckRequest(tab, selectedText) {
  const data = await chrome.storage.local.get(['apiKeys', 'apiKey', 'provider', 'model', 'language', 'streaming']);

  if (!hasApiKey(data)) {
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
      pageContent = await chrome.tabs.sendMessage(tab.id, { action: 'getContent' });
    }

    recordMetric({ type: 'factCheck', extractionMethod: pageContent.extractionMethod, extractionUsed: pageContent.extractionUsed, wasTruncated: pageContent.wasTruncated, provider: data.provider, model: data.model });

    const useStreaming = data.streaming !== false;
    if (useStreaming) {
      await sendWithRetry(resultTabId, {
        action: 'streamStart',
        title: pageContent.title,
        url: pageContent.url,
        wasTruncated: false,
        isSelectedText: !!selectedText,
        mode: 'factcheck'
      });
    }
    const factCheck = await getFactCheckFromAI(data, pageContent, useStreaming ? { tabId: resultTabId } : null);

    await sendWithRetry(resultTabId, {
      action: 'displayFactCheck',
      factCheck: factCheck,
      title: pageContent.title,
      url: pageContent.url,
      isSelectedText: !!selectedText
    });
  } catch (error) {
    console.error('Fact-check error:', error);
    recordMetric({ error: 'api' });
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
  const data = await chrome.storage.local.get(['apiKeys', 'apiKey', 'provider', 'model', 'language']);

  if (!hasApiKey(data)) {
    throw new Error('API key required. Please save your API key in Settings.');
  }

  const pageContent = await chrome.tabs.sendMessage(tab.id, { action: 'getContent' });
  recordMetric({ type: 'factCheck', extractionMethod: pageContent.extractionMethod, extractionUsed: pageContent.extractionUsed, wasTruncated: pageContent.wasTruncated, provider: data.provider, model: data.model });
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

// Handle custom prompts
async function handleCustomPrompt(prompt) {
  const data = await chrome.storage.local.get(['apiKeys', 'apiKey', 'provider', 'model']);

  if (!hasApiKey(data)) {
    throw new Error('API key required. Please save your API key in Settings.');
  }

  recordMetric({ type: 'customPrompt', provider: data.provider, model: data.model });

  return await getSummaryFromAI(data, null, prompt);
}

function buildApiRequest(settings, pageContent, customPrompt, isSelectedText = false) {
  let prompt;

  if (customPrompt) {
    prompt = customPrompt;
  } else {
    const lang = settings.language || 'english';
    const instruction = lang !== 'english' ? `\n\nIMPORTANT: Summary must be in ${lang}.` : '';
    if (isSelectedText) {
      prompt = `Concise plain text summary (no markdown) of the following selected text from: ${pageContent.title}\nURL: ${pageContent.url}\n\nSelected text:\n${pageContent.text.substring(0, 10000)}${instruction}`;
    } else {
      prompt = `Concise plain text summary (no markdown) of: ${pageContent.title}\nURL: ${pageContent.url}\n\nContent:\n${pageContent.text.substring(0, 10000)}${instruction}`;
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

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sanitizeHeader(getApiKey(settings))}`
  };

  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/pashol/AI-Web-Summarizer';
    headers['X-Title'] = 'AI Web Summarizer';
  }

  const resolvedModel = settings.model || defaultModel;
  const body = {
    model: resolvedModel,
    messages: messages,
    ...maxTokensParam(resolvedModel, customPrompt ? 1000 : 500),
    stream: true
  };

  return { url, headers, body };
}

function parseSSEChunk(text) {
  const lines = text.split('\n');
  let content = '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim();
      if (data === '[DONE]') return { done: true, content };
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) content += delta;
      } catch (e) {}
    }
  }
  return { done: false, content };
}

async function streamApiRequest(url, headers, body, onChunk) {
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'API Error');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const result = parseSSEChunk(part);
      if (result.content) {
        fullText += result.content;
        onChunk(result.content, fullText);
      }
    }
  }

  if (buffer.trim()) {
    const result = parseSSEChunk(buffer);
    if (result.content) {
      fullText += result.content;
      onChunk(result.content, fullText);
    }
  }

  return fullText;
}

// Centralized AI Logic
async function getSummaryFromAI(settings, pageContent, customPrompt, isSelectedText = false, streamTarget = null) {
  const { url, headers, body } = buildApiRequest(settings, pageContent, customPrompt, isSelectedText);

  if (streamTarget) {
    return await streamApiRequest(url, headers, body, (chunk, fullText) => {
      try {
        chrome.tabs.sendMessage(streamTarget.tabId, {
          action: 'appendStreamChunk',
          chunk: chunk,
          fullText: fullText
        }, () => { if (chrome.runtime.lastError) {} });
      } catch (e) {}
    });
  }

  const nonStreamBody = { ...body, stream: false };
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(nonStreamBody)
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error?.message || 'API Error');
  }

  return resData.choices[0].message.content;
}

// Follow-up question AI logic (multi-turn, grounded in article)
async function getFollowUpFromAI({ question, pageContent, summary, conversationHistory }) {
  const data = await chrome.storage.local.get(['apiKeys', 'apiKey', 'provider', 'model', 'language']);

  if (!hasApiKey(data)) {
    throw new Error('API key required. Please save your API key in Settings.');
  }

  recordMetric({ type: 'followUp', provider: data.provider, model: data.model });

  const articleSnippet = (pageContent.text || '').substring(0, 10000);
  const lang = data.language || 'english';
  const langInstruction = lang !== 'english' ? `\n\nIMPORTANT: Your entire response must be in ${lang}.` : '';

  const systemContent = `You are an AI assistant helping a user understand a web article.

Article: "${pageContent.title}"
URL: ${pageContent.url}

Article content:
${articleSnippet}

You previously generated this summary:
${summary}

Answer follow-up questions based on the article above. Be concise and accurate. Plain text only, no markdown. If the answer is in the article, refer to it specifically. If it is not, answer from your general knowledge and note that the article doesn't cover this.${langInstruction}`;

  const recentHistory = (conversationHistory || []).slice(-12);

  const apiUrl = data.provider === 'openai'
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';

  const defaultModel = data.provider === 'openai' ? 'gpt-4o-mini' : 'openai/gpt-4o-mini';

  let messages;
  if (data.provider === 'openai') {
    messages = [
      { role: 'system', content: systemContent },
      ...recentHistory,
      { role: 'user', content: question }
    ];
  } else {
    if (recentHistory.length === 0) {
      messages = [{ role: 'user', content: systemContent + '\n\n---\n\nQuestion: ' + question }];
    } else {
      const firstUserWithContext = {
        role: 'user',
        content: systemContent + '\n\n---\n\nQuestion: ' + recentHistory[0].content
      };
      messages = [firstUserWithContext, ...recentHistory.slice(1), { role: 'user', content: question }];
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sanitizeHeader(getApiKey(data))}`
  };

  if (data.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/pashol/AI-Web-Summarizer';
    headers['X-Title'] = 'AI Web Summarizer';
  }

  const resolvedModel = data.model || defaultModel;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ model: resolvedModel, messages, ...maxTokensParam(resolvedModel, 800) })
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error?.message || 'API Error');
  }

  return resData.choices[0].message.content;
}

// Fact-check AI logic
async function getFactCheckFromAI(settings, pageContent, streamTarget = null) {
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
${pageContent.text.substring(0, 10000)}`;

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
    'Authorization': `Bearer ${sanitizeHeader(getApiKey(settings))}`
  };

  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/pashol/AI-Web-Summarizer';
    headers['X-Title'] = 'AI Web Summarizer';
  }

  const resolvedModel = settings.model || defaultModel;
  const body = {
    model: resolvedModel,
    messages: messages,
    ...maxTokensParam(resolvedModel, 1500),
    stream: !!streamTarget
  };

  if (streamTarget) {
    return await streamApiRequest(url, headers, body, (chunk, fullText) => {
      try {
        chrome.tabs.sendMessage(streamTarget.tabId, {
          action: 'appendStreamChunk',
          chunk: chunk,
          fullText: fullText
        }, () => { if (chrome.runtime.lastError) {} });
      } catch (e) {}
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error?.message || 'API Error');
  }

  return resData.choices[0].message.content;
}