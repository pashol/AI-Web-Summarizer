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
  loadTtsSettings();
}

if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = loadVoices;
}
loadVoices();

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

// Populate voice dropdown
function populateVoiceDropdown(selectedVoiceName = null) {
  const voiceSelect = document.getElementById('ttsVoice');
  
  chrome.storage.local.get(['language'], (data) => {
    const currentLang = data.language || 'english';
    const langCode = langMap[currentLang] || 'en';
    
    voiceSelect.innerHTML = '';
    
    // Default option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '— Auto (Best Available) —';
    voiceSelect.appendChild(defaultOpt);
    
    // Filter voices
    const filteredVoices = availableVoices.filter(v => v.lang.startsWith(langCode));
    const otherVoices = availableVoices.filter(v => !v.lang.startsWith(langCode));
    
    if (filteredVoices.length > 0) {
      const group = document.createElement('optgroup');
      group.label = `${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)} Voices`;
      filteredVoices.forEach(voice => {
        const opt = document.createElement('option');
        opt.value = voice.name;
        opt.textContent = `${voice.name} (${voice.lang})`;
        if (voice.name === selectedVoiceName) opt.selected = true;
        group.appendChild(opt);
      });
      voiceSelect.appendChild(group);
    }
    
    if (otherVoices.length > 0) {
      const group = document.createElement('optgroup');
      group.label = 'Other Voices';
      otherVoices.forEach(voice => {
        const opt = document.createElement('option');
        opt.value = voice.name;
        opt.textContent = `${voice.name} (${voice.lang})`;
        if (voice.name === selectedVoiceName) opt.selected = true;
        group.appendChild(opt);
      });
      voiceSelect.appendChild(group);
    }
  });
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

// Load TTS settings
function loadTtsSettings() {
  chrome.storage.local.get(['ttsRate', 'ttsPitch', 'ttsVoice'], (data) => {
    if (data.ttsRate) {
      document.getElementById('ttsRate').value = data.ttsRate;
      document.getElementById('ttsRateValue').textContent = `${data.ttsRate}x`;
    }
    if (data.ttsPitch) {
      document.getElementById('ttsPitch').value = data.ttsPitch;
      document.getElementById('ttsPitchValue').textContent = data.ttsPitch;
    }
    
    populateVoiceDropdown(data.ttsVoice);
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Store tab ID for future targeted messages if needed
  if (sender.tab?.id) {
    resultTabId = sender.tab.id;
  }
  
  if (request.action === 'displaySummary') {
    displaySummary(request.summary, request.title, request.url);
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

function displayError(error) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').textContent = `Error: ${error}`;
  document.getElementById('error').style.display = 'block';
}

// Toggle TTS panel
document.getElementById('toggleTtsBtn').addEventListener('click', () => {
  document.getElementById('ttsPanel').classList.toggle('hidden');
});

// Slider displays
document.getElementById('ttsRate').addEventListener('input', (e) => {
  document.getElementById('ttsRateValue').textContent = `${e.target.value}x`;
});

document.getElementById('ttsPitch').addEventListener('input', (e) => {
  document.getElementById('ttsPitchValue').textContent = e.target.value;
});

// Save TTS settings
document.getElementById('saveTtsBtn').addEventListener('click', () => {
  const ttsRate = document.getElementById('ttsRate').value;
  const ttsPitch = document.getElementById('ttsPitch').value;
  const ttsVoice = document.getElementById('ttsVoice').value;

  chrome.storage.local.set({ ttsRate, ttsPitch, ttsVoice }, () => {
    document.getElementById('ttsPanel').classList.add('hidden');
    showCopiedNotification('TTS settings saved!');
  });
});

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