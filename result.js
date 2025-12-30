let isSpeaking = false;
const synth = window.speechSynthesis;

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
  document.getElementById('pageUrl').innerHTML = `<a href="${url}" target="_blank">${url}</a>`;
  document.getElementById('summary').textContent = summary;
  document.getElementById('summary').style.display = 'block';
  document.getElementById('actions').style.display = 'flex';
}

function displayError(error) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').textContent = `Error: ${error}`;
  document.getElementById('error').style.display = 'block';
}

// Read aloud functionality
document.getElementById('speakBtn').addEventListener('click', () => {
  if (isSpeaking) {
    synth.cancel();
    updateSpeakButton(false);
    return;
  }

  const text = document.getElementById('summary').textContent;
  const utterance = new SpeechSynthesisUtterance(text);
  
  browser.storage.local.get('language').then(data => {
    const langMap = {
      'english': 'en-US', 'spanish': 'es-ES', 'french': 'fr-FR', 'german': 'de-DE',
      'italian': 'it-IT', 'portuguese': 'pt-PT', 'russian': 'ru-RU', 'chinese': 'zh-CN',
      'japanese': 'ja-JP', 'korean': 'ko-KR', 'arabic': 'ar-SA', 'hindi': 'hi-IN',
      'dutch': 'nl-NL', 'polish': 'pl-PL', 'turkish': 'tr-TR'
    };
    
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

// Copy to clipboard functionality
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

function showCopiedNotification() {
  const notification = document.getElementById('copiedNotification');
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}