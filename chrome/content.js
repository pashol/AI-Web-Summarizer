// Content script to extract page content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getContent') {
    const pageContent = {
      title: document.title,
      url: window.location.href,
      text: extractMainContent()
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
  
  // Limit length (to avoid token limits)
  return text.substring(0, 10000);
}