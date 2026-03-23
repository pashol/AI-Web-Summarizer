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
  // Remove script, style, and other non-content elements
  const clone = document.body.cloneNode(true);
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 
    'aside', 'iframe', 'noscript', '[role="navigation"]',
    '[role="banner"]', '[role="complementary"]', '.ad',
    '.advertisement', '.sidebar', '.menu'
  ];
  
  unwantedSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Get text content
  let text = clone.innerText || clone.textContent;
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}