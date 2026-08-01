# Third-Party Notices

Nova Music Lab combines original application code and curated project content with third-party libraries, fonts, structured metadata, artwork links and optional external services. Each third-party component remains subject to its own license and terms.

This file is an attribution and boundary guide, not a replacement for the license text distributed by each dependency.

## Runtime and build libraries

The package lock is the authoritative dependency inventory. Principal packages include:

- [React](https://react.dev/) and React DOM;
- [Vite](https://vite.dev/);
- [TypeScript](https://www.typescriptlang.org/);
- [Tailwind CSS](https://tailwindcss.com/);
- [Framer Motion](https://motion.dev/);
- [Recharts](https://recharts.org/);
- [Lucide](https://lucide.dev/);
- [Vitest](https://vitest.dev/) and Testing Library;
- [Playwright](https://playwright.dev/) and [axe-core](https://github.com/dequelabs/axe-core) for browser and accessibility checks;
- `canvas-confetti` and `html-to-image`.

Consult `package-lock.json` and the installed package license files for exact versions and license texts.

## Fonts

The application currently requests Inter, Space Grotesk and Noto Sans Hebrew through Google Fonts. Their font licenses and Google's delivery/privacy terms apply.

## Structured music metadata

Development-time enrichment may use public structured information from services such as MusicBrainz, Wikidata and Deezer. Their respective data licenses, attribution requirements and platform terms apply. Nova Music Lab stores compact source-aware facts and writes original project prose rather than bundling copied biographies.

## Artwork and media

Curated artwork URLs may point to Wikimedia Commons, Cover Art Archive, Apple/iTunes artwork, Spotify CDN, Deezer CDN or other documented public sources. Copyright and reuse rights belong to the original rightsholders; inclusion or linking does not transfer those rights. Deezer artist-image URLs are treated as remote presentation references, validated to reject known empty-placeholder patterns and never described as locally owned artwork.

YouTube, Spotify, Wikipedia and official artist links are external destinations. Their platform terms and privacy policies apply when a visitor opens an embed or link.

## Optional Gemini integration

The Gemini assistant is opt-in and uses a visitor-supplied API key. Google API terms and privacy policies apply to those requests.

## Project content and licensing status

The repository contains original Nova Music Lab interface code, design, generated art, curated narratives and an intentionally published flagship aggregate dataset. These are deliberately **not** all covered by the same terms:

- **Software** — MIT, see [`LICENSE`](./LICENSE).
- **Flagship dataset, generated visuals, narrative copy and brand** — reserved, see [`DATA_LICENSE.md`](./DATA_LICENSE.md). The dataset is one person's listening history published for demonstration and verification, not for redistribution.
- **Third-party artwork** — linked as remote presentation references and never claimed as locally owned; compact, source-aware metadata may be bundled under its applicable terms. Rights stay with the original holders, as described above.

Each stable release must continue to document separate treatment where appropriate for software code, original creative content, public datasets and third-party media.
