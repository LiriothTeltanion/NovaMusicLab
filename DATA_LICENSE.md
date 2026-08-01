# Content, data and brand terms

`LICENSE` (MIT) covers the **software**: the application source, scripts, tests,
configuration and build tooling in this repository.

It does **not** cover everything the repository contains. Nova Music Lab bundles
one person's listening history, a visual identity and links to media owned by
other people. Those need different treatment, and this file records it.

## 1. Software — MIT

Application code under `src/`, together with `scripts/`, tests, build and CI
configuration, is MIT licensed **except for the data and original-content
artifacts listed below**. Fork the software, learn from it, reuse it and ship
your own version commercially while keeping the copyright notice.

The directory name alone does not decide the license: files under `src/data/`
can contain the reserved flagship aggregate, curated assertions, original
narrative content or third-party metadata references. Those files remain
subject to sections 2, 3 and 5 of this document.

## 2. The flagship dataset — demonstration use only

`src/data/music_dna_compiled.json`, `src/data/recent_pulse.json`, the public
dataset manifest and derived public aggregates are a
curated summary of **Kevin Cusnir's personal listening history**: eras, sessions,
obsessions, daily activity and platform patterns spanning 2015-2026.

It is published so the museum has something real to show and so the analysis is
verifiable. It is autobiographical material, not a general-purpose dataset.

You may read it, and quote figures from it with attribution, in order to
understand or evaluate this project. You may not redistribute it as a dataset,
republish it as your own, include it in a training corpus, or use it to build a
profile of its subject.

Nothing here restricts a visitor's own imported data. That never leaves their
browser and belongs to them.

## 3. Generated visuals and written content

The generative artwork, room narratives, interpretive copy and the trilingual
EN/ES/HE writing are original creative work, © 2026 Kevin Cusnir, and are **not**
covered by the MIT grant. Reuse of the code to generate *your own* artwork from
*your own* data is exactly what the MIT license is for; lifting the produced
prose or imagery wholesale is not.

## 4. Brand

"Nova Music Lab", "Lirioth Teltanion", the logo, icons and social preview are
brand assets, © 2026 Kevin Cusnir. A fork must not present itself as Nova Music
Lab or imply endorsement. Rename your fork.

## 5. Third-party media and metadata

Album covers, artist photographs and band-member portraits are normally
**referenced by remote URL, not copied into the release bundle**. They remain
the property of their rightsholders — Cover Art Archive, Wikimedia Commons,
Apple/iTunes, Spotify, Deezer and others. Any locally generated release image
that depicts the Nova interface is governed by section 3; it does not grant
reuse rights over third-party media visible inside that interface. Structured
facts from MusicBrainz, Wikidata and Deezer remain subject to their respective
licenses, attribution requirements and service terms.

Including a URL in this repository transfers no rights. See
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

---

If a specific reuse is not clearly answered here, ask rather than assume.
