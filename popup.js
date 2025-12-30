let isSpeaking = false;
const synth = window.speechSynthesis;
let MODELS = {};

// Get models from background script
browser.runtime.sendMessage({ action: 'getModels' }).then(response => {
  MODELS = response.models;
  loadSettings();
});

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

// Toggle settings panel
document.getElementById('toggleSettingsBtn').addEventListener('click', () => {
  const settingsPanel = document.getElementById('settingsPanel');
  settingsPanel.classList.toggle('hidden');
});

// Toggle chat panel
document.getElementById('toggleChatBtn').addEventListener('click', () => {
  const chatPanel = document.getElementById('chatPanel');
  chatPanel.classList.toggle('hidden');
});

// Load settings and determine initial visibility
async function loadSettings() {
  const data = await browser.storage.local.get(['provider', 'apiKey', 'model', 'language']);
  
  if (data.provider) document.getElementById('provider').value = data.provider;
  if (data.apiKey) document.getElementById('apiKey').value = data.apiKey;
  if (data.language) document.getElementById('language').value = data.language;
  
  updateModelOptions(data.model);
  
  // Show settings panel if no API key is set
  const settingsPanel = document.getElementById('settingsPanel');
  if (!data.apiKey) {
    settingsPanel.classList.remove('hidden');
  }
}

document.getElementById('provider').addEventListener('change', () => updateModelOptions());

// Save settings
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
  
  // Hide settings panel after saving if API key is set
  if (apiKey) {
    setTimeout(() => {
      document.getElementById('settingsPanel').classList.add('hidden');
      result.classList.add('hidden');
    }, 1500);
  } else {
    setTimeout(() => result.classList.add('hidden'), 2000);
  }
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
    
    if (response.error) {
      throw new Error(response.error);
    }
    
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
    
    if (response.error) {
      throw new Error(response.error);
    }
    
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

// READ ALOUD LOGIC
document.getElementById('speakBtn').addEventListener('click', () => {
  if (isSpeaking) {
    synth.cancel();
    updateSpeakButton(false);
    return;
  }

  const text = document.getElementById('result').textContent;
  const utterance = new SpeechSynthesisUtterance(text);
  
  const langMap = {
    'english': 'en-US', 'spanish': 'es-ES', 'french': 'fr-FR', 'german': 'de-DE',
    'italian': 'it-IT', 'portuguese': 'pt-PT', 'russian': 'ru-RU', 'chinese': 'zh-CN',
    'japanese': 'ja-JP', 'korean': 'ko-KR', 'arabic': 'ar-SA', 'hindi': 'hi-IN',
    'dutch': 'nl-NL', 'polish': 'pl-PL', 'turkish': 'tr-TR'
  };

  browser.storage.local.get('language').then(data => {
    utterance.lang = langMap[data.language] || 'en-US';
    utterance.onend = () => updateSpeakButton(false);
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