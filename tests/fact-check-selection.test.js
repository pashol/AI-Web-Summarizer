import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function loadBackground(path, selectedText) {
  const requests = [];
  const messages = [];
  const page = {
    title: 'Example', url: 'https://example.test/', text: 'FULL PAGE CONTENT',
    selectedText, wasTruncated: false
  };
  const settings = { apiKeys: { openai: 'test-key' }, provider: 'openai', model: 'test-model', streaming: false };
  const listeners = {};
  const api = {
    runtime: {
      onInstalled: { addListener() {} }, onStartup: { addListener() {} },
      onMessage: { addListener(fn) { listeners.message = fn; } },
      getURL(path) { return path; }
    },
    contextMenus: { onClicked: { addListener(fn) { listeners.contextMenu = fn; } }, create() {} },
    commands: { onCommand: { addListener(fn) { listeners.command = fn; } } },
    storage: { local: {
      get(keys, callback) {
        if (callback) { callback({ metrics: { enabled: false } }); return; }
        return Promise.resolve(settings);
      },
      set(data, callback) { if (callback) callback(); return Promise.resolve(); }
    } },
    tabs: {
      query: async () => [{ id: 1, title: page.title, url: page.url }],
      sendMessage: async (id, message) => {
        if (message.action === 'getContent') return page;
        messages.push(message);
      }
    },
    windows: { create: async () => ({ tabs: [{ id: 2 }] }) },
    notifications: { create() {} }
  };
  const context = vm.createContext({
    browser: api, chrome: api, console,
    fetch: async (url, options) => {
      requests.push(JSON.parse(options.body).messages.at(-1).content);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'checked' } }] }) };
    }
  });
  vm.runInContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
  return { listeners, requests, messages, tab: { id: 1, title: page.title, url: page.url } };
}

for (const path of ['firefox/background.js', 'chrome/background.js']) {
  test(`${path} fact-check prompt treats out-of-knowledge events as unverified`, async () => {
    const { listeners, requests, tab } = loadBackground(path, null);
    await new Promise(resolve => listeners.message({ action: 'factCheckPage', tab }, null, resolve));
    const prompt = requests[0];
    assert.ok(prompt.includes(`Current date (UTC): ${new Date().toISOString().slice(0, 10)}`));
    assert.match(prompt, /knowledge cutoff/);
    assert.match(prompt, /UNVERIFIED/);
    assert.match(prompt, /lack of knowledge.*not evidence.*false/i);
    assert.match(prompt, /no live web access/i);
  });
  for (const source of ['popup', 'shortcut', 'context menu']) {
    for (const selection of ['SELECTED CLAIM', null]) {
      test(`${path} ${source} fact-checks ${selection ? 'selected text' : 'page text'} when ${selection ? 'selected' : 'unselected'}`, async () => {
        const { listeners, requests, messages, tab } = loadBackground(path, selection);
        if (source === 'popup') {
          const response = await new Promise(resolve => {
            listeners.message({ action: 'factCheckPage', tab }, null, resolve);
          });
          assert.equal(response.isSelectedText, !!selection);
          assert.equal(response.factCheck, 'checked');
        } else if (source === 'shortcut') {
          await listeners.command('fact-check');
          assert.equal(messages.at(-1).isSelectedText, !!selection);
        } else {
          await listeners.contextMenu({ menuItemId: 'factcheck-page-window', selectionText: selection }, tab);
          assert.equal(messages.at(-1).isSelectedText, !!selection);
        }
        assert.equal(requests.length, 1);
        assert.ok(requests[0].includes(`Content:\n${selection || 'FULL PAGE CONTENT'}`));
        if (selection) assert.ok(!requests[0].includes('FULL PAGE CONTENT'));
      });
    }
  }
  test(`${path} context menu uses page selection when selectionText is absent`, async () => {
    const { listeners, requests, messages, tab } = loadBackground(path, 'SELECTED CLAIM');
    await listeners.contextMenu({ menuItemId: 'factcheck-page-window' }, tab);
    assert.equal(messages.at(-1).isSelectedText, true);
    assert.ok(requests[0].includes('Content:\nSELECTED CLAIM'));
    assert.ok(!requests[0].includes('FULL PAGE CONTENT'));
  });
  for (const [name, popupAction, command, menuId, label] of [
    ['summary', 'summarizePage', 'summarize', 'summarize-page-window', 'Selected text:'],
    ['translation', 'translatePage', 'translate', 'translate-page-window', 'Text:']
  ]) {
    for (const selection of ['SELECTED CLAIM', null]) {
      for (const source of ['popup', 'shortcut', 'context menu']) {
        test(`${path} ${source} ${name} uses ${selection ? 'selection' : 'page'}`, async () => {
          const { listeners, requests, messages, tab } = loadBackground(path, selection);
          if (source === 'popup') {
            const response = await new Promise(resolve => {
              listeners.message({ action: popupAction, tab }, null, resolve);
            });
            assert.equal(response.isSelectedText, !!selection);
          } else if (source === 'shortcut') {
            await listeners.command(command);
            assert.equal(messages.at(-1).isSelectedText, !!selection);
          } else {
            await listeners.contextMenu({ menuItemId: menuId, selectionText: selection }, tab);
            assert.equal(messages.at(-1).isSelectedText, !!selection);
          }
          assert.equal(requests.length, 1);
          const contentLabel = name === 'summary' && !selection ? 'Content:' : label;
          assert.ok(requests[0].includes(`${contentLabel}\n${selection || 'FULL PAGE CONTENT'}`));
          if (selection) assert.ok(!requests[0].includes('FULL PAGE CONTENT'));
        });
      }
    }
  }
}
