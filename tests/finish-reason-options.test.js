import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

for (const browserName of ['firefox', 'chrome']) {
  test(`${browserName} options displays finish reasons and resets their counts`, async () => {
    const html = fs.readFileSync(`${browserName}/options.html`, 'utf8');
    const elements = new Map();
    const element = id => {
      if (!html.includes(`id="${id}"`)) return null;
      if (!elements.has(id)) elements.set(id, {
        textContent: '', checked: true, style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener(event, callback) { this[event] = callback; },
        appendChild() {}
      });
      return elements.get(id);
    };
    let savedMetrics;
    const api = {
      runtime: {
        getManifest: () => ({ version: 'test' }),
        sendMessage: () => new Promise(() => {})
      },
      storage: { local: {
        get: async () => ({}),
        set: async value => { savedMetrics = value.metrics; }
      } }
    };
    const context = vm.createContext({
      browser: api, chrome: api,
      document: { getElementById: element, createElement: () => ({}) },
      window: { speechSynthesis: { getVoices: () => [] } }
    });
    vm.runInContext(fs.readFileSync(`${browserName}/options.js`, 'utf8'), context);
    vm.runInContext(`renderMetrics({ finishReasons: { stop: 4, length: 2 } })`, context);
    assert.match(element('metricFinishReasons').textContent, /stop.*4/);
    assert.match(element('metricFinishReasons').textContent, /length.*2/);
    await element('resetMetricsBtn').click();
    assert.equal(Object.keys(savedMetrics.finishReasons).length, 0);
  });
}
