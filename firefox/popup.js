let isSpeaking = false;
const synth = window.speechSynthesis;
let MODELS = {};
let availableVoices = [];

// Language code mapping
const langMap = {
  'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
  'italian': 'it', 'portuguese': 'pt', 'russian': 'ru', 'chinese': 'zh',
  'japanese': 'ja', 'korean': 'ko', 'arabic': 'ar', 'hindi': 'hi',
  'dutch': 'nl', 'polish': 'pl', 'turkish': 'tr'
};

// Get models from background script
browser.runtime.sendMessage({ action: 'getModels' }).then(response => {
  MODELS = response.models;
  loadSettings();
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
  
  MODELS[provider].forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    if (m.id === selectedModelId) opt.selected = true;
    modelSelect.appendChild(opt);
  });
}

// Toggle panels
document.getElementById('toggleSettingsBtn').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.toggle('hidden');
});

document.getElementById('toggleChatBtn').addEventListener('click', () => {
  document.getElementById('chatPanel').classList.toggle('hidden');
});

document.getElementById('toggleTtsBtn').addEventListener('click', () => {
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
document.getElementById('language').addEventListener('change', async () => {
  const data = await browser.storage.local.get(['ttsVoice']);
  populateVoiceDropdown(data.ttsVoice);
});

// Load settings
async function loadSettings() {
  const data = await browser.storage.local.get([
    'provider', 'apiKey', 'model', 'language',
    'ttsRate', 'ttsPitch', 'ttsVoice'
  ]);
  
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
  
  // Show settings panel if no API key
  if (!data.apiKey) {
    document.getElementById('settingsPanel').classList.remove('hidden');
  }
}

document.getElementById('provider').addEventListener('change', () => updateModelOptions());

// Save AI settings
document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const provider = document.getElementById('provider').value;
  const apiKey = document.getElementById('apiKey').value;
  const model = document.getElementById('model').value;
  const language = document.getElementById('language').value;

  await browser.storage.local.set({ provider, apiKey, model, language });
  
  const result = document.getElementById('result');
  result.className = 'summary';
  result.textContent = 'Settings saved successfully!'; 
  result.classList.remove('hidden');
  
  // Refresh voice dropdown for new language
  const data = await browser.storage.local.get(['ttsVoice']);
  populateVoiceDropdown(data.ttsVoice);
  
  if (apiKey) {
    setTimeout(() => {
      document.getElementById('settingsPanel').classList.add('hidden');
      result.classList.add('hidden');
    }, 1500);
  } else {
    setTimeout(() => result.classList.add('hidden'), 2000);
  }
});

// Save TTS settings
document.getElementById('saveTtsBtn').addEventListener('click', async () => {
  const ttsRate = document.getElementById('ttsRate').value;
  const ttsPitch = document.getElementById('ttsPitch').value;
  const ttsVoice = document.getElementById('ttsVoice').value;

  await browser.storage.local.set({ ttsRate, ttsPitch, ttsVoice });
  
  const result = document.getElementById('result');
  result.className = 'summary';
  result.textContent = 'TTS settings saved!'; 
  result.classList.remove('hidden');
  
  setTimeout(() => {
    document.getElementById('ttsPanel').classList.add('hidden');
    result.classList.add('hidden');
  }, 1500);
});

// Test TTS
document.getElementById('testTtsBtn').addEventListener('click', async () => {
  synth.cancel();
  
  const testText = "This is a test of the text-to-speech settings.";
  const utterance = new SpeechSynthesisUtterance(testText);
  
  const data = await browser.storage.local.get(['ttsRate', 'ttsPitch', 'ttsVoice', 'language']);
  
  utterance.rate = parseFloat(data.ttsRate) || 1;
  utterance.pitch = parseFloat(data.ttsPitch) || 1;
  
  const voice = getBestVoice(data.ttsVoice);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  
  synth.speak(utterance);
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
    const response = await browser.runtime.sendMessage({
      action: 'sendCustomPrompt',
      prompt: promptText
    });
    
    if (response.error) throw new Error(response.error);
    
    result.className = 'summary';
    result.textContent = response;
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
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    
    const response = await browser.runtime.sendMessage({
      action: 'summarizePage',
      tab: tabs[0]
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
document.getElementById('speakBtn').addEventListener('click', async () => {
  if (isSpeaking) {
    synth.cancel();
    updateSpeakButton(false);
    return;
  }

  const text = document.getElementById('result').textContent;
  const utterance = new SpeechSynthesisUtterance(text);
  
  const data = await browser.storage.local.get(['language', 'ttsRate', 'ttsPitch', 'ttsVoice']);
  
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

function updateSpeakButton(speaking) {
  isSpeaking = speaking;
  const btn = document.getElementById('speakBtn');
  btn.textContent = speaking ? '⏹ Stop Reading' : '🔊 Read Aloud';
  btn.classList.toggle('speaking', speaking);
}