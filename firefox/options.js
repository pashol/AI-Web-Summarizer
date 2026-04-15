let MODELS = {};
let availableVoices = [];
let currentApiKeys = { openrouter: '', openai: '' };

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
  initTheme();
});

function initTheme() {
  browser.storage.local.get(['theme'], (data) => {
    const theme = data.theme || 'auto';
    applyTheme(theme);
    updateThemeUI(theme);
  });
}

function applyTheme(theme) {
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function updateThemeUI(theme) {
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === theme);
  });
}

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
  const oldProvider = Object.keys(currentApiKeys).find(p => p !== document.getElementById('provider').value) || document.getElementById('provider').value;
  const newProvider = document.getElementById('provider').value;

  currentApiKeys[oldProvider] = document.getElementById('apiKey').value;
  document.getElementById('apiKey').value = currentApiKeys[newProvider] || '';

  updateModelOptions();
  updateProviderHint();
});

document.getElementById('language').addEventListener('change', async () => {
  const data = await browser.storage.local.get(['ttsVoice']);
  populateVoiceDropdown(data.ttsVoice);
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

document.getElementById('themeControl').addEventListener('click', (e) => {
  if (e.target.classList.contains('theme-option')) {
    const theme = e.target.dataset.value;
    applyTheme(theme);
    updateThemeUI(theme);
  }
});

const extractionHints = {
  auto: 'Uses Readability for articles, falls back to standard extraction for other pages.',
  readability: 'Always uses Mozilla Readability parser, falls back if it produces no content.',
  current: 'Uses the built-in DOM-based extraction (no Readability).'
};

function updateExtractionUI(mode) {
  document.querySelectorAll('.extraction-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === mode);
  });
  const hint = document.getElementById('extractionHint');
  if (hint) hint.textContent = extractionHints[mode] || extractionHints.auto;
}

document.getElementById('extractionControl').addEventListener('click', (e) => {
  if (e.target.classList.contains('extraction-option')) {
    const mode = e.target.dataset.value;
    updateExtractionUI(mode);
  }
});

document.getElementById('metricsToggle').addEventListener('click', () => {
  const content = document.getElementById('metricsContent');
  const arrow = document.getElementById('metricsArrow');
  content.classList.toggle('visible');
  arrow.classList.toggle('expanded');
});

document.getElementById('metricsEnabled').addEventListener('change', async (e) => {
  const data = await browser.storage.local.get(['metrics']);
  const metrics = data.metrics || {};
  metrics.enabled = e.target.checked;
  await browser.storage.local.set({ metrics });
  const statsEl = document.getElementById('metricsStats');
  statsEl.style.display = e.target.checked ? '' : 'none';
});

document.getElementById('resetMetricsBtn').addEventListener('click', async () => {
  const DEFAULT_METRICS = {
    enabled: true, firstUsed: null, lastUsed: null,
    counts: { summarize: 0, factCheck: 0, customPrompt: 0, followUp: 0 },
    extraction: { auto: 0, readability: 0, current: 0, readabilitySuccess: 0, readabilityFallback: 0, truncatedCount: 0 },
    provider: { openrouter: 0, openai: 0 },
    model: {},
    errors: { apiError: 0, extractionError: 0 },
    daily: {}
  };
  DEFAULT_METRICS.enabled = document.getElementById('metricsEnabled').checked;
  await browser.storage.local.set({ metrics: DEFAULT_METRICS });
  renderMetrics(DEFAULT_METRICS);
});

function renderMetrics(metrics) {
  const counts = metrics.counts || {};
  const extraction = metrics.extraction || {};
  const provider = metrics.provider || {};
  const model = metrics.model || {};
  const errors = metrics.errors || {};

  document.getElementById('metricSummarize').textContent = counts.summarize || 0;
  document.getElementById('metricFactCheck').textContent = counts.factCheck || 0;
  document.getElementById('metricCustomPrompt').textContent = counts.customPrompt || 0;
  document.getElementById('metricFollowUp').textContent = counts.followUp || 0;

  document.getElementById('metricExtractionAuto').textContent = extraction.auto || 0;
  document.getElementById('metricExtractionReadability').textContent = extraction.readability || 0;
  document.getElementById('metricExtractionCurrent').textContent = extraction.current || 0;
  document.getElementById('metricReadabilitySuccess').textContent = extraction.readabilitySuccess || 0;
  document.getElementById('metricReadabilityFallback').textContent = extraction.readabilityFallback || 0;
  document.getElementById('metricTruncated').textContent = extraction.truncatedCount || 0;

  document.getElementById('metricProviderOpenrouter').textContent = provider.openrouter || 0;
  document.getElementById('metricProviderOpenai').textContent = provider.openai || 0;

  const modelEntries = Object.entries(model);
  document.getElementById('metricModels').textContent = modelEntries.length > 0
    ? modelEntries.map(([k, v]) => `${k} (${v})`).join(', ')
    : '-';

  document.getElementById('metricApiErrors').textContent = errors.apiError || 0;
  document.getElementById('metricExtractionErrors').textContent = errors.extractionError || 0;

  document.getElementById('metricFirstUsed').textContent = metrics.firstUsed
    ? new Date(metrics.firstUsed).toLocaleDateString()
    : '-';
  document.getElementById('metricLastUsed').textContent = metrics.lastUsed
    ? new Date(metrics.lastUsed).toLocaleDateString()
    : '-';
}

async function loadMetrics() {
  const data = await browser.storage.local.get(['metrics']);
  const metrics = data.metrics || {
    enabled: true, firstUsed: null, lastUsed: null,
    counts: { summarize: 0, factCheck: 0, customPrompt: 0, followUp: 0 },
    extraction: { auto: 0, readability: 0, current: 0, readabilitySuccess: 0, readabilityFallback: 0, truncatedCount: 0 },
    provider: { openrouter: 0, openai: 0 },
    model: {},
    errors: { apiError: 0, extractionError: 0 },
    daily: {}
  };

  document.getElementById('metricsEnabled').checked = metrics.enabled !== false;
  const statsEl = document.getElementById('metricsStats');
  statsEl.style.display = metrics.enabled !== false ? '' : 'none';

  renderMetrics(metrics);
}

async function loadSettings() {
  const data = await browser.storage.local.get([
    'provider', 'apiKeys', 'model', 'language',
    'ttsRate', 'ttsPitch', 'ttsVoice', 'streaming', 'theme', 'extractionMode'
  ]);

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

  const extractionMode = data.extractionMode || 'auto';
  updateExtractionUI(extractionMode);

  updateModelOptions(data.model);
  populateVoiceDropdown(data.ttsVoice);
  updateProviderHint();
  loadMetrics();
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const provider = document.getElementById('provider').value;
  const apiKey = document.getElementById('apiKey').value;
  const model = document.getElementById('model').value;
  const language = document.getElementById('language').value;
  const ttsRate = document.getElementById('ttsRate').value;
  const ttsPitch = document.getElementById('ttsPitch').value;
  const ttsVoice = document.getElementById('ttsVoice').value;
  const streaming = document.getElementById('streaming').checked;
  const theme = document.querySelector('.theme-option.active').dataset.value;
  const extractionMode = document.querySelector('.extraction-option.active').dataset.value;

  currentApiKeys[provider] = apiKey;

  await browser.storage.local.set({ provider, apiKeys: currentApiKeys, model, language, ttsRate, ttsPitch, ttsVoice, streaming, theme, extractionMode });

  const msg = document.getElementById('statusMsg');
  msg.className = 'status-msg success';
  msg.textContent = 'Preferences saved.';

  setTimeout(() => { msg.className = 'status-msg'; }, 2500);
});

document.getElementById('testTtsBtn').addEventListener('click', async () => {
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