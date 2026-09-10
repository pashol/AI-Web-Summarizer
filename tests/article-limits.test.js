import assert from 'node:assert/strict';
import test from 'node:test';

const DEFAULT = 25000;
const MIN = 1000;
const MAX = 100000;

function getArticleTextLimit(settings) {
  const raw = Number(settings?.articleTextLimit);
  if (!Number.isFinite(raw)) return DEFAULT;
  return Math.min(MAX, Math.max(MIN, Math.floor(raw)));
}

function limitArticleText(text, limit) {
  return (text || '').substring(0, limit);
}

test('missing value resolves to default', () => {
  assert.equal(getArticleTextLimit({}), DEFAULT);
});

test('malformed value resolves to default', () => {
  assert.equal(getArticleTextLimit({ articleTextLimit: 'junk' }), DEFAULT);
});

test('below minimum clamps to minimum', () => {
  assert.equal(getArticleTextLimit({ articleTextLimit: 10 }), MIN);
});

test('above maximum clamps to maximum', () => {
  assert.equal(getArticleTextLimit({ articleTextLimit: 250000 }), MAX);
});

test('fractional value floors to whole number', () => {
  assert.equal(getArticleTextLimit({ articleTextLimit: 25000.9 }), 25000);
});

test('limitArticleText clips selected text', () => {
  assert.equal(limitArticleText('abcdef', 4), 'abcd');
});
