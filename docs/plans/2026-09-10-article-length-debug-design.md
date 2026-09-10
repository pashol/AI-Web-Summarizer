# Article-Length Debug Design

## Goal

Add a user-controlled debug mode that lets a user inspect the exact prompt sent for a page summary, including character counts. The data will help choose a sensible larger article-length limit later.

## Scope

The feature applies to normal page summaries and selected-text summaries in both the Firefox and Chrome extensions. It does not apply to custom chat prompts or fact checks. It does not change the current 12,000-character extraction cap or 10,000-character prompt-source cap.

## User Interface

Add a "Show sent prompts after summaries" checkbox beside "Enable metrics collection" in the Full Settings page's "Diagnostics & Usage Statistics" section. The setting is stored as `debugEnabled` in browser storage and remains enabled until the user turns it off.

When the checkbox was enabled when the user started a summary, display a Debug section below the successful summary. The section includes:

- Extracted content length before the extraction cap and the capped length.
- Content length included in the prompt before and after the prompt-source cap.
- Total user-prompt character length.
- The complete user prompt in a read-only, scrollable text area.

The debug UI must never expose the API key, request headers, or other credentials.

## Architecture And Data Flow

Before each summary request, the popup reads `debugEnabled` and includes it in the existing summarize-page message. The background script remains the single source of truth for prompt construction. It captures the original extraction length, composes the prompt, calculates source and prompt lengths, then calls the AI API.

When debug mode is enabled, the successful background response includes a debug object alongside the summary. When disabled, it omits debug data to avoid duplicating page content in normal messages. The popup clears earlier debug output when a new request starts and renders the new debug section only after a successful response.

## Errors

Existing content-extraction and AI-request error handling remains unchanged. Failed requests do not show a debug panel, since no prompt was reliably sent. Starting another request clears any stale debug output.

## Testing

Verify the behavior in both browser variants:

- Debug Mode defaults to off after each popup load and is not persisted in storage.
- Debug-disabled summaries have no debug payload or visible section.
- Debug-enabled page and selected-text summaries show the expected counts and exact prompt.
- Long pages demonstrate the existing extraction and prompt-source caps.
- Extraction and API failures show the existing error UI without stale debug output.
