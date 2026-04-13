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

function getBestArticle() {
  const articles = Array.from(document.querySelectorAll('article'));
  if (articles.length === 0) return null;
  const best = articles.reduce((a, b) =>
    b.textContent.length > a.textContent.length ? b : a
  );
  // Ignore teaser-sized article elements; fall through to other selectors
  return best.textContent.length > 300 ? best : null;
}

function extractFromJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch (e) { continue; }

    const candidates = Array.isArray(data) ? data : (data['@graph'] || [data]);
    for (const item of candidates) {
      if (item && typeof item.articleBody === 'string' && item.articleBody.length > 500) {
        return item.articleBody.replace(/\s+/g, ' ').trim();
      }
    }
  }
  return null;
}

function extractMainContent() {
  // Try JSON-LD structured data first — cleanest source when available
  const jsonLdText = extractFromJsonLd();
  if (jsonLdText) return jsonLdText;

  // Prioritize semantic content elements, then common CMS content classes
  const preferred = document.querySelector('[itemprop="articleBody"]')
    || document.querySelector('[role="article"]')
    || getBestArticle()
    || document.querySelector('main')
    || document.querySelector('[role="main"]')
    || document.querySelector('.post-content, .entry-content, .article-content')
    || document.querySelector('.post-body, .article-body, .story-body')
    || document.querySelector('.article-text, .article__body, .article__content')
    || document.querySelector('.content__article, .story__content, .post__content')
    || document.querySelector('.entry, .entry-body')
    || document.querySelector('[data-testid*="article"], [data-qa*="article"]')
    || document.querySelector('#content, .content');
  const clone = (preferred || document.body).cloneNode(true);

  // Remove non-content elements
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer',
    'aside', 'iframe', 'noscript', '[role="navigation"]',
    '[role="banner"]', '[role="complementary"]', '.ad',
    '.advertisement', '.sidebar', '.menu',
    // Hidden/invisible elements (aria-hidden omitted: paywall sites use it on article containers)
    '[hidden]', '.hidden', '.visually-hidden', '.sr-only',
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

  // If cleaned text is too short, retry with full body before deduplicating
  if (text.length < 500 && preferred !== null) {
    const bodyClone = document.body.cloneNode(true);
    unwantedSelectors.forEach(selector => {
      bodyClone.querySelectorAll(selector).forEach(el => el.remove());
    });
    const bodyText = (bodyClone.innerText || bodyClone.textContent).replace(/\s+/g, ' ').trim();
    if (bodyText.length > text.length) {
      text = bodyText;
    }
  }

  // Deduplicate repeated lines (navigation boilerplate, repeated labels)
  // Split ONLY on newlines — never on sentence punctuation, which destroys
  // abbreviations (Dr., U.S., Fig.) and decimal numbers.
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const unique = [];
  for (const line of lines) {
    if (!seen.has(line)) {
      seen.add(line);
      unique.push(line);
    }
  }
  text = unique.join(' ');

  return text;
}
