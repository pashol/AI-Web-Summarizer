# Final Fix Report: Readability-First Extraction Review Findings

## Scope

Addressed all locally actionable final-review findings without changing extension
production behavior:

- Updated `docs/privacy-policy.md` lines 67 and 72 to state that OpenAI and
  OpenRouter requests can include up to 10,000 characters of page text.
- Replaced the retired persisted extraction-mode guidance in `AGENTS.md` with
  the Readability-first automatic fallback behavior and local success/fallback
  metrics.
- Extended `tests/content-extraction.test.js` for both Firefox and Chrome to
  prove that legacy extraction is returned when Readability returns text below
  the 200-character usable-content threshold or when `Readability.parse()`
  throws.

## Tests And Validation

Executed:

```sh
node --test tests/content-extraction.test.js
node --check firefox/content.js
node --check chrome/content.js
node --check tests/content-extraction.test.js
git diff --check
```

Results:

- The Node test suite passed all 8 tests with 0 failures.
- The two newly added fallback tests passed for each browser implementation.
- JavaScript syntax checks completed successfully with no output.
- `git diff --check` completed successfully with no whitespace errors.
- Focused documentation validation confirmed both provider disclosures now say
  "up to 10,000 characters." Historical plan references to `extractionMode`
  remain intentionally unchanged.

## Self-Review

- The too-short fixture is deliberately below the production 200-character
  threshold; a regression that accepts it as Readability output will fail.
- The thrown-parser fixture verifies the response is still delivered through
  the legacy path, rather than only checking that a mocked parser was called.
- The assertions use the real content-script listener in isolated VM contexts
  and check observable response metadata plus legacy text.
- Firefox and Chrome receive identical coverage, matching the separate
  codebase requirement.
- No extension production files were modified because the existing fallback
  implementation already satisfied the new coverage.

## Commit

Implementation, test, and documentation fixes: `b7bd826`

## Browser Testing

Browser smoke testing was not performed because this environment is headless.
