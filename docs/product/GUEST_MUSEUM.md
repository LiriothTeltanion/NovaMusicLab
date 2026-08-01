# Guest Museum

Status: **implemented, verified and deployed in `1.4.0` — 2026-07-29**.

Guest Museum turns Nova Music Lab from one public flagship exhibition into a
tool any visitor can use from the same GitHub Pages link. It does not require an
account or backend.

## Visitor journey

```text
Open public Nova link
  → choose an optional local museum name
  → import supported listening files
  → inspect the import receipt
  → explore a private personal museum
  → compare the complete available artist catalogs with Kevin's public museum
  → export a portable Nova backup when wanted
```

The optional name is only a display label stored in that browser. It is not a
login, password, globally reserved username or proof of identity.

## What works without a backend

- Spotify Extended Streaming History JSON;
- Last.fm CSV;
- Apple Music play-activity CSV;
- ListenBrainz JSON;
- YouTube Takeout JSON or HTML;
- MusicBee iTunes-compatible library XML; and
- versioned Nova backups.

Files are parsed in the browser. The active personal museum is stored in
IndexedDB, while the small optional display label stays in browser-local
storage. When a visitor opens Compare Museums, Nova loads Kevin's reviewed
public artist catalog lazily and compares it with the visitor's archive-wide
catalog. Older datasets without a complete catalog are clearly marked as a
partial comparison.

## Privacy boundary

Always local:

- selected source files;
- normalized listening events;
- audio;
- Spotify network fields such as IP addresses;
- MusicBee file paths and persistent IDs; and
- the full personal archive.

Public by design:

- Kevin's reviewed aggregate flagship;
- the versioned public artist and genre knowledge bundle; and
- repository screenshots and release media.

Nova does not upload a visitor archive merely because the visitor entered a
name or opened a comparison.

## Optional account future

A later release — **planned, date not verified** — may add an optional Supabase
control plane. It is explicitly outside `1.5.0` — deployed
**2026-08-01**. The intended future account flow is:

1. continue locally with no account;
2. create an internal anonymous identity only when a cloud action is requested;
3. optionally link that identity to Google for recovery across devices; and
4. upload only a previewed, bounded `SafeMuseumSnapshotV1` after explicit
   consent.

A plain display name cannot safely identify a cloud account because another
person could claim the same text. Cloud identity requires an unguessable
provider identifier and authenticated session.

Raw events and audio remain outside the social snapshot schema. Share capsules
must be limited, expiring and revocable.

## Why Supabase is the preferred control plane

Supabase keeps PostgreSQL, authentication, Row Level Security and server-side
functions together. This fits Nova's relational comparison and evidence model
better than a document-only database, while leaving GitHub Pages independently
deployable.

Alternatives remain valid:

- Firebase has mature anonymous and Google authentication, but server functions
  require a paid billing plan and Firestore is less natural for relational
  evidence.
- Cloudflare Workers and D1 are strong for a future connector gateway, but they
  do not provide the complete consumer-identity and row-authorization layer by
  themselves.

No SDK or production dependency should be added until the local compatibility
store and Dexie schema share one repository boundary. Adding a cloud store
before that migration would create a third source of truth.

Official references:

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Supabase anonymous authentication and identity linking](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

## Connector order

1. **Last.fm or ListenBrainz**, behind a server-side proxy, caching, rate limits
   and terms review.
2. **Spotify restricted beta** for Kevin and a small allow-listed tester group.
3. Broader provider connections only after provider policy and quota gates are
   satisfied.

Google sign-in identifies a Nova account; it does not provide music history.

Spotify Development Mode is not suitable for open onboarding: the current
official limit is five allow-listed authenticated users, and the app owner must
have Premium. Public visitors can still import their Spotify export files with
no Spotify login.

Official connector references:

- [Last.fm `user.getRecentTracks`](https://www.last.fm/api/show/user.getRecentTracks)
- [Last.fm API terms](https://www.last.fm/api/tos)
- [ListenBrainz core API](https://listenbrainz.readthedocs.io/en/latest/users/api/core.html)
- [Spotify quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
- [Spotify Authorization Code with PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)

## Offline artist knowledge

The catalog should grow through versioned, cacheable fragments instead of one
ever-larger entry bundle:

```text
small version/hash manifest
  → compact artist identity index
  → on-demand detail fragments
  → IndexedDB cache
  → evidence-aware genre and media enrichment
```

MusicBrainz lookups need a named User-Agent, caching and a queue that respects
the official rate limit. A visitor lookup can reveal part of their taste, so
future remote enrichment requires a visible network boundary and consent.

Reference: [MusicBrainz API rate limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting).
