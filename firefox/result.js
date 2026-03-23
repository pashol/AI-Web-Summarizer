let isSpeaking = false;
const synth = window.speechSynthesis;
let availableVoices = [];
let resultTabId = null;

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

// Signal to background that result page is ready
function signalReady() {
  browser.runtime.sendMessage({ action: 'resultReady' }).catch(err => {
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
async function getBestVoice(preferredVoiceName) {
  const data = await browser.storage.local.get(['language']);
  const currentLang = data.language || 'english';
  const langCode = langMap[currentLang] || 'en';
  
  // 1. Try saved voice
  if (preferredVoiceName) {
    const savedVoice = availableVoices.find(v => v.name === preferredVoiceName);
    if (savedVoice) return savedVoice;
  }
  
  // 2. Try Google voice for language
  const googleVoice = availableVoices.find(v => 
    v.name.toLowerCase().includes('google') && v.lang.startsWith(langCode)
  );
  if (googleVoice) return googleVoice;
  
  // 3. Any voice matching language
  const langVoice = availableVoices.find(v => v.lang.startsWith(langCode));
  if (langVoice) return langVoice;
  
  // 4. System default
  return availableVoices.find(v => v.default) || availableVoices[0] || null;
}

// Listen for messages from background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Store tab ID for future targeted messages if needed
  if (sender.tab?.id) {
    resultTabId = sender.tab.id;
  }
  
  if (request.action === 'displaySummary') {
    displaySummary(request.summary, request.title, request.url);
    sendResponse({ success: true });
  } else if (request.action === 'displayFactCheck') {
    displayFactCheck(request.factCheck, request.title, request.url, request.isSelectedText);
    sendResponse({ success: true });
  } else if (request.action === 'displayError') {
    displayError(request.error);
    sendResponse({ success: true });
  }
  return true;
});

function displaySummary(summary, title, url) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('pageTitle').textContent = title;

  // Safely create link element to prevent XSS
  const pageUrlElement = document.getElementById('pageUrl');
  pageUrlElement.textContent = '';
  const linkElement = document.createElement('a');
  linkElement.href = url;
  linkElement.textContent = url;
  linkElement.target = '_blank';
  linkElement.rel = 'noopener noreferrer';
  pageUrlElement.appendChild(linkElement);

  document.getElementById('summary').textContent = summary;
  document.getElementById('summary').style.display = 'block';
  document.getElementById('actions').style.display = 'flex';
}

function displayFactCheck(factCheck, title, url, isSelectedText) {
  document.getElementById('loading').style.display = 'none';
  document.title = 'AI Fact Check Result';
  document.getElementById('pageTitle').textContent = title;

  const pageUrlElement = document.getElementById('pageUrl');
  pageUrlElement.textContent = '';
  const linkElement = document.createElement('a');
  linkElement.href = url;
  linkElement.textContent = url;
  linkElement.target = '_blank';
  linkElement.rel = 'noopener noreferrer';
  pageUrlElement.appendChild(linkElement);

  if (isSelectedText) {
    const note = document.createElement('div');
    note.style.cssText = 'font-size: 12px; color: #888; margin-top: 4px; font-style: italic;';
    note.textContent = '(Fact-checking selected text only)';
    pageUrlElement.appendChild(note);
  }

  const summaryEl = document.getElementById('summary');
  summaryEl.textContent = factCheck;
  summaryEl.style.display = 'block';
  document.getElementById('actions').style.display = 'flex';
  document.getElementById('copyBtn').textContent = '📋 Copy Fact Check';
}

function displayError(error) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').textContent = `Error: ${error}`;
  document.getElementById('error').style.display = 'block';
}

// Read aloud with custom settings
document.getElementById('speakBtn').addEventListener('click', async () => {
  if (isSpeaking) {
    synth.cancel();
    updateSpeakButton(false);
    return;
  }

  const text = document.getElementById('summary').textContent;
  const utterance = new SpeechSynthesisUtterance(text);
  
  const data = await browser.storage.local.get(['ttsRate', 'ttsPitch', 'ttsVoice']);
  
  // Apply saved settings
  utterance.rate = parseFloat(data.ttsRate) || 1;
  utterance.pitch = parseFloat(data.ttsPitch) || 1;
  
  // Get best voice
  const voice = await getBestVoice(data.ttsVoice);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  
  utterance.onend = () => updateSpeakButton(false);
  utterance.onerror = () => updateSpeakButton(false);
  
  updateSpeakButton(true);
  synth.speak(utterance);
});

function updateSpeakButton(speaking) {
  isSpeaking = speaking;
  const btn = document.getElementById('speakBtn');
  btn.textContent = speaking ? '⏹ Stop Reading' : '🔊 Read Aloud';
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
    showCopiedNotification('✓ Copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
});

function showCopiedNotification(message = '✓ Copied to clipboard!') {
  const notification = document.getElementById('copiedNotification');
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}