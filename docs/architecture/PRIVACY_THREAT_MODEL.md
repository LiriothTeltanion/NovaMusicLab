# Privacy Threat Model

## Assets being protected

- Raw listening exports and timestamped event history.
- Browser-local museum state and portable exports.
- API keys entered for optional services.
- Account, network, device and location identifiers.
- Private CV and employment documents.
- The integrity of analytical claims and public curated data.

## Trust boundaries

### Local import boundary

Selected files enter source parsers in the browser. Risks include maliciously large files, malformed formats, formula injection in exports, main-thread denial of service and accidentally retained raw fields.

Controls include format validation, size limits, bounded parsing, formula-safe CSV output, minimal fixtures and explicit error states.

### Browser storage boundary

IndexedDB belongs to the current browser profile and origin. It is accessible to scripts running on that origin, can be unavailable or evicted, and is not encrypted by Nova Music Lab.

Controls include no bundled secrets, a strict Content Security Policy roadmap, explicit save state, portable backups and user-controlled clear behavior.

### Public repository and Pages boundary

Everything committed to the repository or deployed to Pages is public and remains discoverable through Git history unless history is rewritten.

Controls include `public_dataset_manifest.json`, the public-bundle audit, CODEOWNERS, pull-request review and an explicit public data policy.

### External media boundary

Google Fonts, remote images, embeds and links expose ordinary request metadata to their providers. They do not receive raw archive files from Nova Music Lab, but they prevent the current product from being network-isolated.

Controls include clear documentation, referrer restrictions where compatible and a planned Privacy Mode that can disable remote media.

### Optional Gemini boundary

Gemini requests are browser-to-provider and require an explicit visitor action and personal key. Risks include key exposure to same-origin scripts, over-broad summaries and unsafe generated content.

Controls include session-first key storage, explicit remember/clear choices, a bounded aggregate schema, safe React text rendering and no raw-file inclusion.

## Explicit non-goals

- Nova Music Lab does not provide cloud accounts, cross-device sync or encrypted vault storage.
- A public flagship aggregate cannot be made private through UI wording.
- Browser-local storage does not protect against a compromised browser profile or successful same-origin script injection.

## Review triggers

Update this document when adding a runtime API, changing public data, persisting a new field, adding collaboration/sync, accepting a new file format, changing export behavior or broadening AI context.
