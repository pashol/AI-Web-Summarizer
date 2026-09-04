# Task 1 Report: Readability-First Content-Script Regression Tests

## Files Changed

- `tests/content-extraction.test.js` (created)
- `.superpowers/sdd/2026-09-04-readability-first-extraction/task-1-report.md` (created)

No production files were modified.

## Test Command and Output

Command:

```sh
node --test tests/content-extraction.test.js
```

Output summary:

```text
TAP version 13
# tests 4
# suites 0
# pass 0
# fail 4
# cancelled 0
# skipped 0
# todo 0
# duration_ms 461.239988
```

## Expected Failure Evidence

All four tests fail before making any production changes. Firefox fails at
`firefox/content.js:3:21` and Chrome fails at `chrome/content.js:3:20` with:

```text
TypeError: Cannot read properties of undefined (reading 'local')
```

The failure comes from `browser.storage.local` / `chrome.storage.local` access,
demonstrating that content extraction still depends on the retired
`extractionMode` setting. This is the expected red-state failure for Task 1.

## Self-Review

- The suite loads each real content script in an isolated VM and invokes its
  registered `getContent` listener.
- Both Readability-success and Readability-fallback contracts are covered for
  Firefox and Chrome.
- Expectations are literal consumer-visible response fields; the test does not
  assert on fake extension API calls.
- The fallback fixture verifies that legacy text is returned when Readability
  has no usable article.
- Only the requested test and this required report were added; no production
  code or later-task changes were made.
- `git diff --check` completed without whitespace errors before the test commit.

## Commit Hash

Failing regression test commit: `58dda9a64acc4109bf138e5ce884181f56a96098`

## Fix Round 1

### Files Changed

- `tests/content-extraction.test.js` (updated)
- `.superpowers/sdd/2026-09-04-readability-first-extraction/task-1-report.md` (updated)

No production files were modified.

### Test Command and Output

Command:

```sh
node --test tests/content-extraction.test.js
```

Output summary:

```text
TAP version 13
# tests 4
# suites 0
# pass 0
# fail 4
# cancelled 0
# skipped 0
# todo 0
# duration_ms 533.380853
```

All four failures remain the expected `Cannot read properties of undefined
(reading 'local')` error from `browser.storage.local` or `chrome.storage.local`.

### Self-Review

- Readability-success tests now assert the exact normalized `article text`
  fixture is returned, preventing an incorrect legacy result from satisfying
  the reported extraction metadata.
- Both behavior tests record and assert the listener return value is `true`,
  preserving the asynchronous extension-message channel contract without
  mocking or asserting extension API internals.
- The test still invokes each real content script listener in the VM helper and
  preserves the expected pre-production-change failure mode.
- `git diff --check` completed without whitespace errors before committing the
  test change.

### Commit Hash

Fix-round test commit: `6550c07055242a328c679e1842b4faffeded8699`
