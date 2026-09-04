import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function loadContentScript(path, readabilityResult, readabilityError) {
  let listener;
  const runtime = { onMessage: { addListener(fn) { listener = fn; } } };
  const document = {
    title: 'Example page',
    cloneNode() { return {}; },
    body: { cloneNode() { return { querySelectorAll() { return []; }, textContent: 'legacy page text '.repeat(30) }; } },
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };
  const context = {
    browser: { runtime },
    chrome: { runtime },
    document,
    window: { location: { href: 'https://example.test/' }, getSelection() { return { toString() { return ''; } }; } },
    Readability: class {
      parse() {
        if (readabilityError) throw readabilityError;
        return readabilityResult;
      }
    },
    Array, JSON, Set, console
  };
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
  return listener;
}

for (const path of ['firefox/content.js', 'chrome/content.js']) {
  test(`${path} always identifies Readability as the extraction method`, async () => {
    const listener = loadContentScript(path, { textContent: 'article text '.repeat(30) });
    let listenerResult;
    const response = await new Promise(resolve => {
      listenerResult = listener({ action: 'getContent' }, null, resolve);
    });

    assert.equal(listenerResult, true);
    assert.equal(response.extractionMethod, 'readability');
    assert.equal(response.extractionUsed, 'readability');
    assert.equal(response.text, 'article text '.repeat(30).trim());
  });

  test(`${path} falls back to legacy extraction when Readability has no usable article`, async () => {
    const listener = loadContentScript(path, null);
    let listenerResult;
    const response = await new Promise(resolve => {
      listenerResult = listener({ action: 'getContent' }, null, resolve);
    });

    assert.equal(listenerResult, true);
    assert.equal(response.extractionMethod, 'readability');
    assert.equal(response.extractionUsed, 'current');
    assert.match(response.text, /legacy page text/);
  });

  test(`${path} falls back to legacy extraction when Readability text is too short`, async () => {
    const listener = loadContentScript(path, { textContent: 'short article text' });
    const response = await new Promise(resolve => {
      listener({ action: 'getContent' }, null, resolve);
    });

    assert.equal(response.extractionUsed, 'current');
    assert.match(response.text, /legacy page text/);
  });

  test(`${path} falls back to legacy extraction when Readability throws`, async () => {
    const listener = loadContentScript(path, null, new Error('Readability parse failed'));
    const response = await new Promise(resolve => {
      listener({ action: 'getContent' }, null, resolve);
    });

    assert.equal(response.extractionUsed, 'current');
    assert.match(response.text, /legacy page text/);
  });
}
