# Task 2 Report

## Files Changed

- `firefox/content.js`: Removed the extraction-mode storage lookup; always attempts Readability before the legacy fallback and reports a constant `extractionMethod: 'readability'`.
- `chrome/content.js`: Mirrored the Firefox extraction flow while retaining the callback-compatible listener and `return true`.

## Test

Command:

```sh
node --test tests/content-extraction.test.js
```

Output:

```text
TAP version 13
# Subtest: firefox/content.js always identifies Readability as the extraction method
ok 1 - firefox/content.js always identifies Readability as the extraction method
# Subtest: firefox/content.js falls back to legacy extraction when Readability has no usable article
ok 2 - firefox/content.js falls back to legacy extraction when Readability has no usable article
# Subtest: chrome/content.js always identifies Readability as the extraction method
ok 3 - chrome/content.js always identifies Readability as the extraction method
# Subtest: chrome/content.js falls back to legacy extraction when Readability has no usable article
ok 4 - chrome/content.js falls back to legacy extraction when Readability has no usable article
1..4
# tests 4
# pass 4
# fail 0
```

## Self-Review

- Both scripts preserve their native runtime API and return `true` from the message listener.
- Both responses preserve the 12,000-character cap and truncation calculation.
- `extractionUsed` distinguishes Readability (`'readability'`) from legacy fallback (`'current'`), while `extractionMethod` is always `'readability'`.
- No settings, metrics, project documentation, or test contracts were changed.

## Commit

Implementation: `63501e8 feat: make readability the default extractor`
