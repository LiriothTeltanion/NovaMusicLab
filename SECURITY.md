# Security Policy

Nova Music Lab is a static, local-first web application, but its browser storage, import parsers, public dataset, external media and optional Gemini integration still create meaningful privacy and security boundaries.

## Supported versions

Until the first stable release, security fixes target the current `main` branch and the live GitHub Pages deployment. After v1.0, the latest stable release will be the supported public version.

## Report a vulnerability privately

Use GitHub's private reporting flow:

**https://github.com/LiriothTeltanion/NovaMusicLab/security/advisories/new**

Do not open a public issue for a vulnerability that could expose user data, API credentials, private files or a working exploit.

Include:

- a concise description and affected room or module;
- privacy-safe reproduction steps;
- browser and operating system;
- expected impact;
- a minimal synthetic fixture if data is required;
- a proposed mitigation, if known.

Never send a real listening export, Gemini key, browser database, personal CV or account identifier. If sensitive material is essential to confirm the report, first request a safe transfer method in the private advisory.

## Security boundaries

High-priority reports include:

- raw visitor data leaving the browser unexpectedly;
- cross-site scripting or unsafe AI response rendering;
- exposure or persistence of API keys beyond the documented boundary;
- public bundle leakage of undeclared identity/network fields;
- malicious import files causing code execution or uncontrolled resource use;
- IndexedDB/export isolation failures;
- supply-chain or GitHub Actions compromise;
- external links or embeds bypassing the documented privacy boundary.

Ordinary data-attribution mistakes, broken artwork and analytical discrepancies belong in the data-quality issue form unless they expose private information.

## Coordinated disclosure

The maintainer will validate the report, define the affected versions, prepare a fix and coordinate disclosure through the private advisory. Please allow remediation time before publishing technical details.
