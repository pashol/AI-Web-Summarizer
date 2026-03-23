// Content script to extract page content
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getContent') {
    const selectedText = window.getSelection().toString().trim();
    const fullText = extractMainContent();
    const wasTruncated = fullText.length > 12000;
    const pageContent = {
      title: document.title,
      url: window.location.href,
      text: fullText.substring(0, 12000),
      selectedText: selectedText || null,
      wasTruncated
    };
    sendResponse(pageContent);
  }
  return true;
});

function extractMainContent() {
  // Prioritize semantic content elements, then common CMS content classes
  const preferred = document.querySelector('article')
    || document.querySelector('main')
    || document.querySelector('[role="main"]')
    || document.querySelector('.post-content, .entry-content, .article-content')
    || document.querySelector('.post-body, .article-body, .story-body')
    || document.querySelector('#content, .content');
  const clone = (preferred || document.body).cloneNode(true);

  // Remove non-content elements
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer',
    'aside', 'iframe', 'noscript', '[role="navigation"]',
    '[role="banner"]', '[role="complementary"]', '.ad',
    '.advertisement', '.sidebar', '.menu',
    // Hidden/invisible elements
    '[aria-hidden="true"]', '[hidden]', '.hidden',
    '.visually-hidden', '.sr-only',
    // Common boilerplate
    'button', 'form', '[class*="cookie"]', '[class*="subscribe"]',
    '[class*="share"]', '[class*="social"]'
  ];

  unwantedSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Get text content
  let text = clone.innerText || clone.textContent;

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Deduplicate repeated lines
  const lines = text.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const unique = [];
  for (const line of lines) {
    if (!seen.has(line)) {
      seen.add(line);
      unique.push(line);
    }
  }
  text = unique.join('. ');

  return text;
}