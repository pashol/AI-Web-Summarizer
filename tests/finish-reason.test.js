import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function loadBackground(path, reason, streaming) {
  let metrics = {
    enabled: true, counts: {}, extraction: {}, provider: {}, model: {},
    errors: {}, daily: {}, finishReasons: {}
  };
  const get = (keys, callback) => {
    const data = { metrics: structuredClone(metrics) };
    if (callback) { setImmediate(() => callback(data)); return; }
    return Promise.resolve(data);
  };
  const api = {
    storage: { local: { get, set: (data, callback) => {
      metrics = structuredClone(data.metrics);
      if (callback) setImmediate(callback);
      return Promise.resolve();
    } } },
    runtime: {
      onInstalled: { addListener() {} }, onStartup: { addListener() {} },
      onMessage: { addListener() {} }, getURL: value => value
    },
    contextMenus: { onClicked: { addListener() {} }, create() {} },
    commands: { onCommand: { addListener() {} } },
    tabs: { sendMessage: async () => {} }
  };
  const fetch = async () => streaming
    ? {
        ok: true,
        body: new ReadableStream({ start(controller) {
          controller.enqueue(new TextEncoder().encode(
            `data: {"choices":[{"delta":{"content":"Done"}}]}\n\n` +
            (reason ? `data: {"choices":[{"delta":{},"finish_reason":"${reason}"}]}\n\n` : '') +
            'data: [DONE]\n\n'
          ));
          controller.close();
        } })
      }
    : { ok: true, json: async () => ({ choices: [{ message: { content: 'Done' }, finish_reason: reason }] }) };
  const context = vm.createContext({ browser: api, chrome: api, fetch, TextDecoder, console });
  vm.runInContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
  return { context, get metrics() { return metrics; } };
}

for (const path of ['firefox/background.js', 'chrome/background.js']) {
  test(`${path} retains completion counts from concurrent requests`, async () => {
    const bg = loadBackground(path, 'stop', false);
    await Promise.all([
      vm.runInContext(`recordMetric({ finishReason: 'stop' })`, bg.context),
      vm.runInContext(`recordMetric({ finishReason: 'length' })`, bg.context)
    ]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(bg.metrics?.finishReasons?.stop, 1);
    assert.equal(bg.metrics?.finishReasons?.length, 1);
  });
  for (const streaming of [false, true]) {
    for (const reason of ['length', 'stop', null]) {
      test(`${path} records ${streaming ? 'streamed' : 'non-streamed'} ${reason || 'unavailable'} finish reason`, async () => {
        const bg = loadBackground(path, reason, streaming);
        const result = await vm.runInContext(`getFactCheckFromAI(
          { provider: 'openai', apiKeys: { openai: 'test' } },
          { title: 'Article', url: 'https://example.test/', text: 'A claim' },
          ${streaming ? '{ tabId: 2 }' : 'null'}
        )`, bg.context);
        assert.equal(result, 'Done');
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(bg.metrics?.finishReasons?.[reason || 'unavailable'], 1);
      });
    }
  }
}
