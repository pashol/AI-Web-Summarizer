import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function loadPopup(path, response) {
  const elements = new Map();
  function element() {
    return {
      children: [], dataset: {}, style: {}, lastChild: { textContent: '' },
      classList: { add() {}, remove() {}, toggle() {} },
      listeners: {},
      set textContent(value) { this.text = value; this.children = []; },
      get textContent() { return this.text + this.children.map(child => child.textContent).join(''); },
      appendChild(child) { this.children.push(child); },
      removeAttribute(name) { if (name === 'data-selected-text') delete this.dataset.selectedText; },
      addEventListener(event, listener) { this.listeners[event] = listener; },
      querySelector() { return { innerHTML: '' }; }
    };
  }
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    createElement: element
  };
  const api = {
    runtime: {
      getManifest: () => ({ version: 'test' }),
      sendMessage: async request => request.action === 'getModels'
        ? new Promise(() => {})
        : response
    },
    tabs: { query: async () => [{ id: 1 }] }
  };
  const context = vm.createContext({
    browser: api, chrome: api, document,
    window: { speechSynthesis: { cancel() {}, getVoices: () => [] } }
  });
  vm.runInContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
  document.getElementById('result');
  return elements;
}

for (const path of ['firefox/popup.js', 'chrome/popup.js']) {
  for (const selected of [true, false]) {
    test(`${path} fact-check ${selected ? 'shows selection note' : 'omits selection note for page'}`, async () => {
      const elements = loadPopup(path, {
        factCheck: 'Verified claims', isSelectedText: selected, wasTruncated: false
      });
      elements.get('result').dataset.selectedText = 'true';
      await elements.get('factCheckBtn').listeners.click();
      const result = elements.get('result');
      assert.equal(result.text, 'Verified claims');
      assert.equal(result.children.length, selected ? 1 : 0);
      if (selected) {
        assert.equal(result.children[0].textContent, 'Note: fact-checked selected text only.');
        assert.equal(result.dataset.selectedText, 'true');
      } else {
        assert.equal(result.dataset.selectedText, undefined);
      }
    });
  }
}
