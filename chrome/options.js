let MODELS = {};
let availableVoices = [];
let currentApiKeys = { openrouter: '', openai: '' };

const langMap = {
  'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
  'italian': 'it', 'portuguese': 'pt', 'russian': 'ru', 'chinese': 'zh',
  'japanese': 'ja', 'korean': 'ko', 'arabic': 'ar', 'hindi': 'hi',
  'dutch': 'nl', 'polish': 'pl', 'turkish': 'tr'
};

document.getElementById('ext-version').textContent = chrome.runtime.getManifest().version;

chrome.runtime.sendMessage({ action: 'getModels' }, (response) => {
  MODELS = response.models;
  loadSettings();
});

function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
  populateVoiceDropdown();
}

if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();

function populateVoiceDropdown(selectedVoiceName = null) {
  const voiceSelect = document.getElementById('ttsVoice');
  const currentLang = document.getElementById('language').value;
  const langCode = langMap[currentLang] || 'en';

  voiceSelect.innerHTML = '';

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '\u2014 Auto (Best Available) \u2014';
  voiceSelect.appendChild(defaultOpt);

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
}

function getBestVoice(preferredVoiceName) {
  const currentLang = document.getElementById('language').value;
  const langCode = langMap[currentLang] || 'en';

  if (preferredVoiceName) {
    const savedVoice = availableVoices.find(v => v.name === preferredVoiceName);
    if (savedVoice) return savedVoice;
  }

  const googleVoice = availableVoices.find(v =>
    v.name.toLowerCase().includes('google') && v.lang.startsWith(langCode)
  );
  if (googleVoice) return googleVoice;

  const langVoice = availableVoices.find(v => v.lang.startsWith(langCode));
  if (langVoice) return langVoice;

  return availableVoices.find(v => v.default) || availableVoices[0] || null;
}

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

function updateProviderHint() {
  const hint = document.getElementById('providerHint');
  const label = document.getElementById('apiKeyLabel');
  const provider = document.getElementById('provider').value;
  if (provider === 'openai') {
    hint.innerHTML = 'Get an OpenAI key at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a>';
    label.textContent = 'OpenAI API Key:';
  } else {
    hint.innerHTML = 'Get an OpenRouter key at <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a>';
    label.textContent = 'OpenRouter API Key:';
  }
}

document.getElementById('provider').addEventListener('change', () => {
  const newProvider = document.getElementById('provider').value;
  const oldProvider = Object.keys(currentApiKeys).find(p => p !== newProvider) || newProvider;

  currentApiKeys[oldProvider] = document.getElementById('apiKey').value;
  document.getElementById('apiKey').value = currentApiKeys[newProvider] || '';

  updateModelOptions();
  updateProviderHint();
});

document.getElementById('language').addEventListener('change', () => {
  chrome.storage.local.get(['ttsVoice'], (data) => {
    populateVoiceDropdown(data.ttsVoice);
  });
});

document.getElementById('ttsRate').addEventListener('input', (e) => {
  document.getElementById('ttsRateValue').textContent = `${e.target.value}x`;
});

document.getElementById('ttsPitch').addEventListener('input', (e) => {
  document.getElementById('ttsPitchValue').textContent = e.target.value;
});

document.getElementById('toggleKeyBtn').addEventListener('click', () => {
  const input = document.getElementById('apiKey');
  const btn = document.getElementById('toggleKeyBtn');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
});

function loadSettings() {
  chrome.storage.local.get([
    'provider', 'apiKeys', 'model', 'language',
    'ttsRate', 'ttsPitch', 'ttsVoice', 'streaming'
  ], (data) => {
    const provider = data.provider || 'openrouter';
    document.getElementById('provider').value = provider;

    currentApiKeys = data.apiKeys || { openrouter: '', openai: '' };
    document.getElementById('apiKey').value = currentApiKeys[provider] || '';

    if (data.language) document.getElementById('language').value = data.language;

    if (data.ttsRate) {
      document.getElementById('ttsRate').value = data.ttsRate;
      document.getElementById('ttsRateValue').textContent = `${data.ttsRate}x`;
    }
    if (data.ttsPitch) {
      document.getElementById('ttsPitch').value = data.ttsPitch;
      document.getElementById('ttsPitchValue').textContent = data.ttsPitch;
    }

    document.getElementById('streaming').checked = data.streaming !== false;

    updateModelOptions(data.model);
    populateVoiceDropdown(data.ttsVoice);
    updateProviderHint();
  });
}

document.getElementById('saveBtn').addEventListener('click', () => {
  const provider = document.getElementById('provider').value;
  const apiKey = document.getElementById('apiKey').value;
  const model = document.getElementById('model').value;
  const language = document.getElementById('language').value;
  const ttsRate = document.getElementById('ttsRate').value;
  const ttsPitch = document.getElementById('ttsPitch').value;
  const ttsVoice = document.getElementById('ttsVoice').value;
  const streaming = document.getElementById('streaming').checked;

  currentApiKeys[provider] = apiKey;

  chrome.storage.local.set({ provider, apiKeys: currentApiKeys, model, language, ttsRate, ttsPitch, ttsVoice, streaming }, () => {
    const msg = document.getElementById('statusMsg');
    msg.className = 'status-msg success';
    msg.textContent = 'Preferences saved.';

    setTimeout(() => { msg.className = 'status-msg'; }, 2500);
  });
});

document.getElementById('testTtsBtn').addEventListener('click', () => {
  const synth = window.speechSynthesis;
  synth.cancel();

  const testText = 'This is a test of the text-to-speech settings.';
  const utterance = new SpeechSynthesisUtterance(testText);

  const ttsRate = document.getElementById('ttsRate').value;
  const ttsPitch = document.getElementById('ttsPitch').value;
  const ttsVoice = document.getElementById('ttsVoice').value;

  utterance.rate = parseFloat(ttsRate) || 1;
  utterance.pitch = parseFloat(ttsPitch) || 1;

  const voice = getBestVoice(ttsVoice);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  synth.speak(utterance);
});