let isSpeaking = false;
const synth = window.speechSynthesis;
let availableVoices = [];

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

// Populate voice dropdown
async function populateVoiceDropdown(selectedVoiceName = null) {
  const voiceSelect = document.getElementById('ttsVoice');
  const data = await browser.storage.local.get(['language']);
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

// Load TTS settings
async function loadTtsSettings() {
  const data = await browser.storage.local.get(['ttsRate', 'ttsPitch', 'ttsVoice']);
  
  if (data.ttsRate) {
    document.getElementById('ttsRate').value = data.ttsRate;
    document.getElementById('ttsRateValue').textContent = `${data.ttsRate}x`;
  }
  if (data.ttsPitch) {
    document.getElementById('ttsPitch').value = data.ttsPitch;
    document.getElementById('ttsPitchValue').textContent = data.ttsPitch;
  }
  
  populateVoiceDropdown(data.ttsVoice);
}

// Listen for messages from background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'displaySummary') {
    displaySummary(request.summary, request.title, request.url);
  } else if (request.action === 'displayError') {
    displayError(request.error);
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
document.getElementById('saveTtsBtn').addEventListener('click', async () => {
  const ttsRate = document.getElementById('ttsRate').value;
  const ttsPitch = document.getElementById('ttsPitch').value;
  const ttsVoice = document.getElementById('ttsVoice').value;

  await browser.storage.local.set({ ttsRate, ttsPitch, ttsVoice });
  
  document.getElementById('ttsPanel').classList.add('hidden');
  showCopiedNotification('TTS settings saved!');
});

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