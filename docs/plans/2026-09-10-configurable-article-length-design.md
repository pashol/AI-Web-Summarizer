# Configurable Article-Length Design

## Goal

Increase the default article text sent to AI operations from 10,000 to 25,000 characters. Provide one expert setting that lets users choose a limit from 1,000 through 100,000 characters. Remove the separate 12,000-character extraction cap so content is not discarded before it can use the configured prompt-source allowance.

## Scope

The setting applies to article or selected text used by summaries, custom-prompt summaries, translations, fact checks, and article-grounded follow-up chat. It does not apply to a standalone custom prompt with no page content. Firefox and Chrome must have matching behavior.

The setting is an article-text budget, not a total-prompt budget. Prompt wrappers such as the title, URL, instructions, language directives, system messages, summaries, and chat history are outside the allowance. This avoids the current arbitrary gap between extracted text and source text while retaining a clear user-controlled article limit.

## Settings

Add an Expert Settings field to both Options pages:

- Label: `Article text limit (characters)`
- Storage key: `articleTextLimit`
- Default: `25000`
- Minimum: `1000`
- Maximum: `100000`
- Input: whole-number numeric field with an explanation that higher values increase API cost and latency.

The quick settings popup remains unchanged. Options loads and validates the setting before saving it. Invalid values produce a local validation error and preserve the prior valid setting. A missing, malformed, or legacy stored value resolves to 25,000 at runtime, so no storage migration is required.

## Architecture And Data Flow

Add a shared background helper, `getArticleTextLimit(settings)`, that normalizes the stored value to the supported range and supplies the default. Every operation that fetches page content reads this setting with its existing provider settings and sends `articleTextLimit` with the existing `getContent` message.

Each content script accepts the requested numeric limit, normalizes it defensively, extracts content through the existing Readability-first flow, records the full extracted length, and returns text capped at that requested limit. It retains the existing extraction method and fallback behavior. This replaces the fixed 12,000-character cap.

Selected text remains available in full from the content script or context-menu message. Background code applies the same configured limit before constructing an AI request. Shared source-limiting logic replaces every fixed `substring(0, 10000)` article-source slice. Existing summary, translation, fact-check, and chat prompt templates otherwise remain unchanged.

## Diagnostics And Truncation

The summary debug panel reports the original extracted length, returned article-text length, configured article-text limit, source length included in the prompt, and total prompt length. It only states that content was capped when truncation occurred. A 12,443-character article at the default setting therefore reports all 12,443 article characters as sent, plus its prompt-wrapper overhead.

Truncation notices and truncation metrics use the configured limit instead of hard-coded 10,000- or 12,000-character values. API errors, extraction errors, provider handling, language handling, and streaming behavior do not otherwise change.

## Testing

Run `node --check` for each changed JavaScript file in both browser implementations and run `git diff --check`.

Manually verify both Firefox and Chrome:

- A missing setting displays and uses the 25,000 default.
- Invalid, fractional, too-small, and too-large values are rejected; a valid setting persists.
- Articles from 12,001 through 25,000 characters are sent intact by default.
- Longer content is truncated at the configured limit, including selected text.
- A larger valid expert limit is honored by every supported AI operation.
- Debug counts, truncation notices, and metrics reflect the configured limit.
- Readability fallback, API-key errors, language prompts, providers, and streaming still work.

No model-specific token estimation or context-window detection is included. The existing character-count model, explicit cost warning, and 100,000-character guardrail are sufficient for this change.
