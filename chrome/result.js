let isSpeaking = false;
const synth = window.speechSynthesis;
let availableVoices = [];
let resultTabId = null;

// Follow-up chat state
let storedPageContent = null;
let storedSummary = '';
let conversationHistory = [];

// Language code mapping
const langMap = {
  'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
  'italian': 'it', 'portuguese': 'pt', 'russian': 'ru', 'chinese': 'zh',
  'japanese': 'ja', 'korean': 'ko', 'arabic': 'ar', 'hindi': 'hi',
  'dutch': 'nl', 'polish': 'pl', 'turkish': 'tr'
};

// Load voices
function loadVoices() {
  availableVoices = synth.getVoices();
}

if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = loadVoices;
}
loadVoices();

// Apply theme from storage
function applyStoredTheme() {
  chrome.storage.local.get(['theme'], (data) => {
    const theme = data.theme || 'auto';
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  });
}
applyStoredTheme();

// Signal to background that result page is ready
function signalReady() {
  chrome.runtime.sendMessage({ action: 'resultReady' }).catch(err => {
    console.log('resultReady handshake sent (bg may not be listening)');
  });
}

// Call when page is fully loaded
window.addEventListener('load', signalReady);
// Also call immediately in case load already fired
signalReady();

// Detect mode from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const pageMode = urlParams.get('mode') || 'summary';
if (pageMode === 'factcheck') {
  const loadingP = document.querySelector('#loading p');
  if (loadingP) loadingP.textContent = 'Fact-checking with AI...';
  document.title = 'AI Fact Check Result';
}

// Get best voice
function getBestVoice(preferredVoiceName, callback) {
  chrome.storage.local.get(['language'], (data) => {
    const currentLang = data.language || 'english';
    const langCode = langMap[currentLang] || 'en';
    
    // 1. Try saved voice
    if (preferredVoiceName) {
      const savedVoice = availableVoices.find(v => v.name === preferredVoiceName);
      if (savedVoice) {
        callback(savedVoice);
        return;
      }
    }
    
    // 2. Try Google voice for language
    const googleVoice = availableVoices.find(v => 
      v.name.toLowerCase().includes('google') && v.lang.startsWith(langCode)
    );
    if (googleVoice) {
      callback(googleVoice);
      return;
    }
    
    // 3. Any voice matching language
    const langVoice = availableVoices.find(v => v.lang.startsWith(langCode));
    if (langVoice) {
      callback(langVoice);
      return;
    }
    
    // 4. System default
    callback(availableVoices.find(v => v.default) || availableVoices[0] || null);
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Store tab ID for future targeted messages if needed
  if (sender.tab?.id) {
    resultTabId = sender.tab.id;
  }
  
  if (request.action === 'streamStart') {
    setPageInfo(request.title, request.url, request.wasTruncated, request.isSelectedText, request.mode || 'summary');
    document.getElementById('loading').style.display = 'none';
    sendResponse({ success: true });
  } else if (request.action === 'displaySummary') {
    displaySummary(request.summary, request.title, request.url, request.wasTruncated, request.isSelectedText, request.pageText);
    sendResponse({ success: true });
  } else if (request.action === 'displayFactCheck') {
    displayFactCheck(request.factCheck, request.title, request.url, request.isSelectedText);
    sendResponse({ success: true });
  } else if (request.action === 'displayError') {
    displayError(request.error);
    sendResponse({ success: true });
  } else if (request.action === 'appendStreamChunk') {
    appendStreamChunk(request.chunk, request.fullText);
    sendResponse({ success: true });
  }
  return true;
});

function displaySummary(summary, title, url, wasTruncated, isSelectedText, pageText) {
  isStreaming = false;
  document.getElementById('loading').style.display = 'none';
  if (!pageInfoSet) {
    setPageInfo(title, url, wasTruncated, isSelectedText, 'summary');
  }

  const summaryEl = document.getElementById('summary');
  summaryEl.textContent = summary;
  summaryEl.style.display = 'block';
  document.getElementById('actions').style.display = 'flex';

  storedPageContent = { title, url, text: pageText || '' };
  storedSummary = summary;
  conversationHistory = [];
}

let isStreaming = false;
let pageInfoSet = false;

function truncateUrl(url, maxLength = 80) {
  if (url.length <= maxLength) return url;
  const start = url.substring(0, Math.floor(maxLength * 0.55));
  const end = url.substring(url.length - Math.floor(maxLength * 0.35));
  return start + '...' + end;
}

function setPageInfo(title, url, wasTruncated, isSelectedText, mode = 'summary') {
  document.getElementById('pageTitle').textContent = title;

  const pageUrlElement = document.getElementById('pageUrl');
  pageUrlElement.textContent = '';
  const linkElement = document.createElement('a');
  linkElement.href = url;
  linkElement.textContent = truncateUrl(url);
  linkElement.title = url;
  linkElement.target = '_blank';
  linkElement.rel = 'noopener noreferrer';
  pageUrlElement.appendChild(linkElement);

  if (isSelectedText) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size: 12px; color: #888; margin-top: 4px; font-style: italic;';
    note.textContent = mode === 'factcheck'
      ? '(Fact-checking selected text only)'
      : 'Note: summarized selected text only.';
    pageUrlElement.appendChild(note);
  }

  if (wasTruncated) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size: 12px; color: #888; margin-top: 4px; font-style: italic;';
    note.textContent = isSelectedText
      ? 'Note: selected text was truncated to 10,000 characters before summarizing.'
      : 'Note: page content was truncated to 12,000 characters before summarizing.';
    pageUrlElement.appendChild(note);
  }

  pageInfoSet = true;
}

function appendStreamChunk(chunk, fullText) {
  if (!isStreaming) {
    isStreaming = true;
    document.getElementById('loading').style.display = 'none';
    const summaryEl = document.getElementById('summary');
    summaryEl.style.display = 'block';
    document.getElementById('actions').style.display = 'flex';
  }
  const summaryEl = document.getElementById('summary');
  summaryEl.textContent = fullText;
  storedSummary = fullText;
  summaryEl.scrollTop = summaryEl.scrollHeight;
}

function displayFactCheck(factCheck, title, url, isSelectedText) {
  document.getElementById('loading').style.display = 'none';
  document.title = 'AI Fact Check Result';
  if (!pageInfoSet) {
    setPageInfo(title, url, false, isSelectedText, 'factcheck');
  }

  const summaryEl = document.getElementById('summary');
  summaryEl.textContent = factCheck;
  summaryEl.style.display = 'block';
  document.getElementById('actions').style.display = 'flex';
  document.getElementById('copyBtn').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Fact Check';
}

function displayError(error) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').textContent = `Error: ${error}`;
  document.getElementById('error').style.display = 'block';
}

// Read aloud with custom settings
document.getElementById('speakBtn').addEventListener('click', () => {
  if (isSpeaking) {
    synth.cancel();
    updateSpeakButton(false);
    return;
  }

  const text = document.getElementById('summary').textContent;
  const utterance = new SpeechSynthesisUtterance(text);
  
  chrome.storage.local.get(['ttsRate', 'ttsPitch', 'ttsVoice'], (data) => {
    // Apply saved settings
    utterance.rate = parseFloat(data.ttsRate) || 1;
    utterance.pitch = parseFloat(data.ttsPitch) || 1;
    
    // Get best voice
    getBestVoice(data.ttsVoice, (voice) => {
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      
      utterance.onend = () => updateSpeakButton(false);
      utterance.onerror = () => updateSpeakButton(false);
      
      updateSpeakButton(true);
      synth.speak(utterance);
    });
  });
});

function updateSpeakButton(speaking) {
  isSpeaking = speaking;
  const btn = document.getElementById('speakBtn');
  btn.innerHTML = speaking 
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Stop Reading'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg> Read Aloud';
  btn.classList.toggle('speaking', speaking);
}

// Copy to clipboard
document.getElementById('copyBtn').addEventListener('click', async () => {
  const summaryText = document.getElementById('summary').textContent;
  const pageTitle = document.getElementById('pageTitle').textContent;
  const pageUrl = document.getElementById('pageUrl').textContent;
  
  const fullText = `${pageTitle}\n${pageUrl}\n\n${summaryText}`;
  
  try {
    await navigator.clipboard.writeText(fullText);
    showCopiedNotification();
  } catch (err) {
    console.error('Failed to copy:', err);
  }
});

function showCopiedNotification(message = 'Copied to clipboard!') {
  const notification = document.getElementById('copiedNotification');
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

// Toggle follow-up chat section
document.getElementById('followUpToggleBtn').addEventListener('click', () => {
  const section = document.getElementById('chatSection');
  const visible = section.style.display === 'block';
  section.style.display = visible ? 'none' : 'block';
  if (!visible) document.getElementById('followUpInput').focus();
});

document.getElementById('askBtn').addEventListener('click', sendFollowUp);

document.getElementById('followUpInput').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendFollowUp();
});

async function sendFollowUp() {
  const input = document.getElementById('followUpInput');
  const question = input.value.trim();
  if (!question || !storedPageContent) return;

  const askBtn = document.getElementById('askBtn');
  const thinkingEl = document.getElementById('chatThinking');

  askBtn.disabled = true;
  input.disabled = true;
  appendChatMessage('user', question);
  input.value = '';
  thinkingEl.style.display = 'block';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'sendFollowUpQuestion',
      question,
      pageContent: storedPageContent,
      summary: storedSummary,
      conversationHistory
    });

    if (response.error) throw new Error(response.error);

    appendChatMessage('assistant', response.answer);
    conversationHistory.push({ role: 'user', content: question });
    conversationHistory.push({ role: 'assistant', content: response.answer });
    if (conversationHistory.length > 12) conversationHistory = conversationHistory.slice(-12);

  } catch (err) {
    appendChatMessage('assistant', `Error: ${err.message}`);
  } finally {
    askBtn.disabled = false;
    input.disabled = false;
    thinkingEl.style.display = 'none';
    input.focus();
  }
}

function appendChatMessage(role, content) {
  const historyEl = document.getElementById('chatHistory');
  const wrapper = document.createElement('div');
  wrapper.className = `chat-message ${role}`;
  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? 'You' : 'AI';
  wrapper.appendChild(label);
  const text = document.createElement('div');
  text.textContent = content;
  wrapper.appendChild(text);
  historyEl.appendChild(wrapper);
  historyEl.scrollTop = historyEl.scrollHeight;
}