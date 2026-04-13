let isSpeaking = false;
const synth = window.speechSynthesis;
let MODELS = {};
let availableVoices = [];
let hasApiKey = false;

const langMap = {
  'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
  'italian': 'it', 'portuguese': 'pt', 'russian': 'ru', 'chinese': 'zh',
  'japanese': 'ja', 'korean': 'ko', 'arabic': 'ar', 'hindi': 'hi',
  'dutch': 'nl', 'polish': 'pl', 'turkish': 'tr'
};

document.getElementById('ext-version').textContent = browser.runtime.getManifest().version;

browser.runtime.sendMessage({ action: 'getModels' }).then(response => {
  MODELS = response.models;
  loadSettings();
});

function loadVoices() {
  availableVoices = synth.getVoices();
}
if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = loadVoices;
}
loadVoices();

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

document.getElementById('toggleSettingsBtn').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.toggle('hidden');
});

document.getElementById('toggleChatBtn').addEventListener('click', () => {
  if (!hasApiKey) {
    const result = document.getElementById('result');
    result.className = 'summary error';
    result.textContent = 'Please configure your API key in Full Settings first';
    result.classList.remove('hidden');
    setTimeout(() => result.classList.add('hidden'), 3000);
    return;
  }
  document.getElementById('chatPanel').classList.toggle('hidden');
});

document.getElementById('fullSettingsBtn').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

document.getElementById('openFullSettingsLink').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

function showSetupRequired() {
  hasApiKey = false;

  document.getElementById('apiKeyWarning').classList.add('show');

  const summarizeBtn = document.getElementById('summarizeBtn');
  const sendPromptBtn = document.getElementById('sendPromptBtn');
  const toggleChatBtn = document.getElementById('toggleChatBtn');

  summarizeBtn.disabled = true;
  summarizeBtn.classList.add('disabled-feature');
  summarizeBtn.title = 'Please configure API key in Full Settings first';

  const factCheckBtn = document.getElementById('factCheckBtn');
  factCheckBtn.disabled = true;
  factCheckBtn.classList.add('disabled-feature');
  factCheckBtn.title = 'Please configure API key in Full Settings first';

  sendPromptBtn.disabled = true;
  sendPromptBtn.classList.add('disabled-feature');
  sendPromptBtn.title = 'Please configure API key in Full Settings first';

  toggleChatBtn.disabled = true;
  toggleChatBtn.classList.add('disabled-feature');
  toggleChatBtn.title = 'Please configure API key first';

  const settingsPanel = document.getElementById('settingsPanel');
  settingsPanel.classList.remove('hidden');

  document.getElementById('speakBtn').style.display = 'none';
}

function enableFeatures() {
  hasApiKey = true;

  document.getElementById('apiKeyWarning').classList.remove('show');

  const summarizeBtn = document.getElementById('summarizeBtn');
  const sendPromptBtn = document.getElementById('sendPromptBtn');
  const toggleChatBtn = document.getElementById('toggleChatBtn');

  summarizeBtn.disabled = false;
  summarizeBtn.classList.remove('disabled-feature');
  summarizeBtn.title = 'Tip: Select text on the page first to summarize only that portion';

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
}

async function loadSettings() {
  const data = await browser.storage.local.get([
    'provider', 'apiKeys', 'model', 'language'
  ]);

  if (data.provider) document.getElementById('provider').value = data.provider;
  if (data.language) document.getElementById('language').value = data.language;

  updateModelOptions(data.model);

  const provider = data.provider || 'openrouter';
  const apiKeys = data.apiKeys || {};
  if (apiKeys[provider]) {
    enableFeatures();
  } else {
    showSetupRequired();
  }
}

document.getElementById('provider').addEventListener('change', () => updateModelOptions());

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const provider = document.getElementById('provider').value;
  const model = document.getElementById('model').value;
  const language = document.getElementById('language').value;

  await browser.storage.local.set({ provider, model, language });

  const result = document.getElementById('result');
  result.className = 'summary';
  result.textContent = 'Settings saved successfully!';
  result.classList.remove('hidden');

  const currentData = await browser.storage.local.get(['apiKeys']);
  const apiKeys = currentData.apiKeys || {};
  if (apiKeys[provider]) {
    if (!hasApiKey) enableFeatures();
    setTimeout(() => {
      document.getElementById('settingsPanel').classList.add('hidden');
      result.classList.add('hidden');
    }, 1500);
  } else {
    showSetupRequired();
    setTimeout(() => result.classList.add('hidden'), 2000);
  }
});

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
  result.removeAttribute('data-selected-text');
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
    if (response.isSelectedText) {
      result.dataset.selectedText = 'true';
      const badge = document.createElement('div');
      badge.style.cssText = 'font-size: 11px; color: #888; margin-bottom: 8px; font-style: italic;';
      badge.textContent = 'Note: summarized selected text only.';
      result.appendChild(badge);
    }
    if (response.wasTruncated) {
      const note = document.createElement('div');
      note.style.cssText = 'font-size: 11px; color: #888; margin-top: 8px; font-style: italic;';
      note.textContent = response.isSelectedText
        ? 'Note: selected text was truncated to 12,000 characters.'
        : 'Note: page content was truncated to 12,000 characters.';
      result.appendChild(note);
    }
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
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });

    const response = await browser.runtime.sendMessage({
      action: 'factCheckPage',
      tab: tabs[0]
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

document.getElementById('speakBtn').addEventListener('click', async () => {
  if (isSpeaking) {
    synth.cancel();
    updateSpeakButton(false);
    return;
  }

  const text = document.getElementById('result').textContent;
  const utterance = new SpeechSynthesisUtterance(text);

  const data = await browser.storage.local.get(['language', 'ttsRate', 'ttsPitch', 'ttsVoice']);

  utterance.rate = parseFloat(data.ttsRate) || 1;
  utterance.pitch = parseFloat(data.ttsPitch) || 1;

  const voice = getBestVoice(data.ttsVoice);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
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