let isSpeaking = false;
const synth = window.speechSynthesis;
let MODELS = {};
let availableVoices = [];
let hasApiKey = false;

// Language code mapping
const langMap = {
  'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
  'italian': 'it', 'portuguese': 'pt', 'russian': 'ru', 'chinese': 'zh',
  'japanese': 'ja', 'korean': 'ko', 'arabic': 'ar', 'hindi': 'hi',
  'dutch': 'nl', 'polish': 'pl', 'turkish': 'tr'
};

// Get models from background script
chrome.runtime.sendMessage({ action: 'getModels' }, (response) => {
  if (response && response.models) {
    MODELS = response.models;
    loadSettings();
  }
});

// Load and populate voices
function loadVoices() {
  availableVoices = synth.getVoices();
  populateVoiceDropdown();
}

// Voices may load asynchronously
if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = loadVoices;
}
loadVoices();

// Populate voice dropdown based on current language
function populateVoiceDropdown(selectedVoiceName = null) {
  const voiceSelect = document.getElementById('ttsVoice');
  const currentLang = document.getElementById('language').value;
  const langCode = langMap[currentLang] || 'en';
  
  voiceSelect.innerHTML = '';
  
  // Add default option
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '— Auto (Best Available) —';
  voiceSelect.appendChild(defaultOpt);
  
  // Filter and sort voices
  const filteredVoices = availableVoices.filter(v => v.lang.startsWith(langCode));
  const otherVoices = availableVoices.filter(v => !v.lang.startsWith(langCode));
  
  // Add matching language voices first
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
  
  // Add other voices
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
}

// Get the best voice for current settings
function getBestVoice(preferredVoiceName) {
  const currentLang = document.getElementById('language').value;
  const langCode = langMap[currentLang] || 'en';
  
  // 1. Try to use saved voice if it exists
  if (preferredVoiceName) {
    const savedVoice = availableVoices.find(v => v.name === preferredVoiceName);
    if (savedVoice) return savedVoice;
  }
  
  // 2. Try to find a Google voice for the language
  const googleVoice = availableVoices.find(v => 
    v.name.toLowerCase().includes('google') && v.lang.startsWith(langCode)
  );
  if (googleVoice) return googleVoice;
  
  // 3. Try any voice matching the language
  const langVoice = availableVoices.find(v => v.lang.startsWith(langCode));
  if (langVoice) return langVoice;
  
  // 4. Fall back to system default
  return availableVoices.find(v => v.default) || availableVoices[0] || null;
}

// Update model dropdown options
function updateModelOptions(selectedModelId) {
  const provider = document.getElementById('provider').value;
  const modelSelect = document.getElementById('model');
  modelSelect.innerHTML = '';
  
  if (MODELS[provider]) {
    MODELS[provider].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === selectedModelId) opt.selected = true;
      modelSelect.appendChild(opt);
    });
  }
}

// Toggle panels
document.getElementById('toggleSettingsBtn').addEventListener('click', () => {
  // Prevent hiding settings panel when no API key is configured
  if (!hasApiKey && !document.getElementById('settingsPanel').classList.contains('hidden')) {
    return; // Don't allow closing settings when API key is required
  }
  document.getElementById('settingsPanel').classList.toggle('hidden');
});

document.getElementById('toggleChatBtn').addEventListener('click', () => {
  if (!hasApiKey) {
    // Show alert and keep settings open
    const result = document.getElementById('result');
    result.className = 'summary error';
    result.textContent = 'Please configure your API key in Settings first';
    result.classList.remove('hidden');
    setTimeout(() => result.classList.add('hidden'), 3000);
    return;
  }
  document.getElementById('chatPanel').classList.toggle('hidden');
});

document.getElementById('toggleTtsBtn').addEventListener('click', () => {
  if (!hasApiKey) {
    // Show alert and keep settings open
    const result = document.getElementById('result');
    result.className = 'summary error';
    result.textContent = 'Please configure your API key in Settings first';
    result.classList.remove('hidden');
    setTimeout(() => result.classList.add('hidden'), 3000);
    return;
  }
  document.getElementById('ttsPanel').classList.toggle('hidden');
});

// Slider value displays
document.getElementById('ttsRate').addEventListener('input', (e) => {
  document.getElementById('ttsRateValue').textContent = `${e.target.value}x`;
});

document.getElementById('ttsPitch').addEventListener('input', (e) => {
  document.getElementById('ttsPitchValue').textContent = e.target.value;
});

// Update voice dropdown when language changes
document.getElementById('language').addEventListener('change', () => {
  chrome.storage.local.get(['ttsVoice'], (data) => {
    populateVoiceDropdown(data.ttsVoice);
  });
});

// Show/hide API key required state
function showSetupRequired() {
  hasApiKey = false;
  
  // Show warning banner
  document.getElementById('apiKeyWarning').classList.add('show');
  
  // Disable main action buttons
  const summarizeBtn = document.getElementById('summarizeBtn');
  const sendPromptBtn = document.getElementById('sendPromptBtn');
  const toggleChatBtn = document.getElementById('toggleChatBtn');
  const toggleTtsBtn = document.getElementById('toggleTtsBtn');
  
  summarizeBtn.disabled = true;
  summarizeBtn.classList.add('disabled-feature');
  summarizeBtn.title = 'Please configure API key in Settings first';

  const factCheckBtn = document.getElementById('factCheckBtn');
  factCheckBtn.disabled = true;
  factCheckBtn.classList.add('disabled-feature');
  factCheckBtn.title = 'Please configure API key in Settings first';

  sendPromptBtn.disabled = true;
  sendPromptBtn.classList.add('disabled-feature');
  sendPromptBtn.title = 'Please configure API key in Settings first';
  
  toggleChatBtn.disabled = true;
  toggleChatBtn.classList.add('disabled-feature');
  toggleChatBtn.title = 'Please configure API key first';
  
  toggleTtsBtn.disabled = true;
  toggleTtsBtn.classList.add('disabled-feature');
  toggleTtsBtn.title = 'Please configure API key first';
  
  // Force settings panel visible with required styling
  const settingsPanel = document.getElementById('settingsPanel');
  settingsPanel.classList.remove('hidden');
  settingsPanel.classList.add('required');
  
  // Add required styling to API key input
  document.getElementById('apiKey').classList.add('required');
  
  // Hide speak button
  document.getElementById('speakBtn').style.display = 'none';
}

// Enable features when API key is present
function enableFeatures() {
  hasApiKey = true;
  
  // Hide warning banner
  document.getElementById('apiKeyWarning').classList.remove('show');
  
  // Enable main action buttons
  const summarizeBtn = document.getElementById('summarizeBtn');
  const sendPromptBtn = document.getElementById('sendPromptBtn');
  const toggleChatBtn = document.getElementById('toggleChatBtn');
  const toggleTtsBtn = document.getElementById('toggleTtsBtn');
  
  summarizeBtn.disabled = false;
  summarizeBtn.classList.remove('disabled-feature');
  summarizeBtn.title = '';

  const factCheckBtn = document.getElementById('factCheckBtn');
  factCheckBtn.disabled = false;
  factCheckBtn.classList.remove('disabled-feature');
  factCheckBtn.title = '';

  sendPromptBtn.disabled = false;
  sendPromptBtn.classList.remove('disabled-feature');
  sendPromptBtn.title = '';
  
  toggleChatBtn.disabled = false;
  toggleChatBtn.classList.remove('disabled-feature');
  toggleChatBtn.title = '';
  
  toggleTtsBtn.disabled = false;
  toggleTtsBtn.classList.remove('disabled-feature');
  toggleTtsBtn.title = '';
  
  // Remove required styling
  const settingsPanel = document.getElementById('settingsPanel');
  settingsPanel.classList.remove('required');
  document.getElementById('apiKey').classList.remove('required');
}

// Load settings
function loadSettings() {
  chrome.storage.local.get([
    'provider', 'apiKey', 'model', 'language',
    'ttsRate', 'ttsPitch', 'ttsVoice'
  ], (data) => {
    if (data.provider) document.getElementById('provider').value = data.provider;
    if (data.apiKey) document.getElementById('apiKey').value = data.apiKey;
    if (data.language) document.getElementById('language').value = data.language;
    
    // TTS settings
    if (data.ttsRate) {
      document.getElementById('ttsRate').value = data.ttsRate;
      document.getElementById('ttsRateValue').textContent = `${data.ttsRate}x`;
    }
    if (data.ttsPitch) {
      document.getElementById('ttsPitch').value = data.ttsPitch;
      document.getElementById('ttsPitchValue').textContent = data.ttsPitch;
    }
    
    updateModelOptions(data.model);
    populateVoiceDropdown(data.ttsVoice);
    
    // Check API key and set UI state
    if (!data.apiKey) {
      showSetupRequired();
    } else {
      enableFeatures();
    }
  });
}

document.getElementById('provider').addEventListener('change', () => updateModelOptions());

// Save AI settings
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const provider = document.getElementById('provider').value;
  const apiKey = document.getElementById('apiKey').value;
  const model = document.getElementById('model').value;
  const language = document.getElementById('language').value;

  chrome.storage.local.set({ provider, apiKey, model, language }, () => {
    const result = document.getElementById('result');
    result.className = 'summary';
    result.textContent = 'Settings saved successfully!'; 
    result.classList.remove('hidden');
    
    // Refresh voice dropdown for new language
    chrome.storage.local.get(['ttsVoice'], (data) => {
      populateVoiceDropdown(data.ttsVoice);
    });
    
    if (apiKey) {
      // Enable features if we just added an API key
      if (!hasApiKey) {
        enableFeatures();
      }
      setTimeout(() => {
        document.getElementById('settingsPanel').classList.add('hidden');
        result.classList.add('hidden');
      }, 1500);
    } else {
      // If API key was removed, show setup required again
      showSetupRequired();
      setTimeout(() => result.classList.add('hidden'), 2000);
    }
  });
});

// Save TTS settings
document.getElementById('saveTtsBtn').addEventListener('click', () => {
  const ttsRate = document.getElementById('ttsRate').value;
  const ttsPitch = document.getElementById('ttsPitch').value;
  const ttsVoice = document.getElementById('ttsVoice').value;

  chrome.storage.local.set({ ttsRate, ttsPitch, ttsVoice }, () => {
    const result = document.getElementById('result');
    result.className = 'summary';
    result.textContent = 'TTS settings saved!'; 
    result.classList.remove('hidden');
    
    setTimeout(() => {
      document.getElementById('ttsPanel').classList.add('hidden');
      result.classList.add('hidden');
    }, 1500);
  });
});

// Test TTS
document.getElementById('testTtsBtn').addEventListener('click', () => {
  synth.cancel();
  
  const testText = "This is a test of the text-to-speech settings.";
  const utterance = new SpeechSynthesisUtterance(testText);
  
  chrome.storage.local.get(['ttsRate', 'ttsPitch', 'ttsVoice', 'language'], (data) => {
    utterance.rate = parseFloat(data.ttsRate) || 1;
    utterance.pitch = parseFloat(data.ttsPitch) || 1;
    
    const voice = getBestVoice(data.ttsVoice);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    
    synth.speak(utterance);
  });
});

// Send custom prompt
document.getElementById('sendPromptBtn').addEventListener('click', async () => {
  const btn = document.getElementById('sendPromptBtn');
  const result = document.getElementById('result');
  const speakBtn = document.getElementById('speakBtn');
  const promptText = document.getElementById('customPrompt').value.trim();
  
  if (!promptText) {
    result.className = 'summary error';
    result.textContent = 'Please enter a prompt.';
    result.classList.remove('hidden');
    return;
  }
  
  synth.cancel();
  updateSpeakButton(false);
  speakBtn.style.display = 'none';

  btn.disabled = true;
  result.className = 'summary loading';
  result.textContent = 'Generating response...';
  result.classList.remove('hidden');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'sendCustomPrompt',
      prompt: promptText
    });
    
    if (response.error) throw new Error(response.error);
    
    result.className = 'summary';
    result.textContent = response.summary;
    speakBtn.style.display = 'block';
  } catch (error) {
    result.className = 'summary error';
    result.textContent = `Error: ${error.message}`;
    
    if (error.message.includes('API key')) {
      document.getElementById('settingsPanel').classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
  }
});

// Fact-check current page
document.getElementById('factCheckBtn').addEventListener('click', async () => {
  const btn = document.getElementById('factCheckBtn');
  const result = document.getElementById('result');
  const speakBtn = document.getElementById('speakBtn');

  synth.cancel();
  updateSpeakButton(false);
  speakBtn.style.display = 'none';

  btn.disabled = true;
  result.className = 'summary loading';
  result.textContent = 'Fact-checking with AI...';
  result.classList.remove('hidden');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.runtime.sendMessage({
      action: 'factCheckPage',
      tab: tab
    });

    if (response.error) throw new Error(response.error);

    result.className = 'summary';
    result.textContent = response.factCheck;
    speakBtn.style.display = 'block';
  } catch (error) {
    result.className = 'summary error';
    result.textContent = `Error: ${error.message}`;

    if (error.message.includes('API key')) {
      document.getElementById('settingsPanel').classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
  }
});

// Summarize current page
document.getElementById('summarizeBtn').addEventListener('click', async () => {
  const btn = document.getElementById('summarizeBtn');
  const result = document.getElementById('result');
  const speakBtn = document.getElementById('speakBtn');
  
  synth.cancel();
  updateSpeakButton(false);
  speakBtn.style.display = 'none';

  btn.disabled = true;
  result.className = 'summary loading';
  result.textContent = 'Generating summary...';
  result.classList.remove('hidden');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.runtime.sendMessage({
      action: 'summarizePage',
      tab: tab
    });
    
    if (response.error) throw new Error(response.error);
    
    result.className = 'summary';
    result.textContent = response.summary;
    speakBtn.style.display = 'block';
  } catch (error) {
    result.className = 'summary error';
    result.textContent = `Error: ${error.message}`;
    
    if (error.message.includes('API key')) {
      document.getElementById('settingsPanel').classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
  }
});

// READ ALOUD with custom settings
document.getElementById('speakBtn').addEventListener('click', () => {
  if (isSpeaking) {
    synth.cancel();
    updateSpeakButton(false);
    return;
  }

  const text = document.getElementById('result').textContent;
  const utterance = new SpeechSynthesisUtterance(text);
  
  chrome.storage.local.get(['language', 'ttsRate', 'ttsPitch', 'ttsVoice'], (data) => {
    // Apply saved settings
    utterance.rate = parseFloat(data.ttsRate) || 1;
    utterance.pitch = parseFloat(data.ttsPitch) || 1;
    
    // Get best voice
    const voice = getBestVoice(data.ttsVoice);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      // Fallback to language code
      const langCode = langMap[data.language] || 'en';
      utterance.lang = langCode + '-' + langCode.toUpperCase();
    }
    
    utterance.onend = () => updateSpeakButton(false);
    utterance.onerror = () => updateSpeakButton(false);
    
    updateSpeakButton(true);
    synth.speak(utterance);
  });
});

function updateSpeakButton(speaking) {
  isSpeaking = speaking;
  const btn = document.getElementById('speakBtn');
  btn.textContent = speaking ? '⏹ Stop Reading' : '🔊 Read Aloud';
  btn.classList.toggle('speaking', speaking);
}