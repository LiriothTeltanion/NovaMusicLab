# ADR 0004 — Optional cloud control plane

- **Status:** Proposed; not implemented
- **Decision date:** 2026-07-29

## Context

Nova Music Lab needs a future path for account sign-in, revocable sharing,
feedback and official music-service refreshes. GitHub Pages is intentionally a
static host, while raw listening events and audio are too sensitive to become a
default cloud payload.

The current application also has two local persistence layers: the active
aggregate compatibility store and the wider Dexie schema-v4 model. Adding cloud
state before those layers share one repository boundary would create a third
source of truth.

## Proposed decision

Keep GitHub Pages as the public museum host and retain IndexedDB as the
authoritative store for raw visitor history. After the local persistence cutover
is complete, add Supabase as an optional control plane for:

- anonymous identities that can later be linked to Google;
- Google authentication;
- bounded, consented aggregate snapshots;
- expiring and revocable share capsules;
- structured feedback;
- synchronization receipts; and
- server-side connector calls that require secrets.

The museum must remain usable when the control plane is absent, paused or
offline. No raw listening event, uploaded audio file or provider secret belongs
in a public bundle or client-readable cloud row.

An optional visitor display name is not a cloud identity. Anonymous cloud
accounts require an internal provider UUID and authenticated session; Google
may later make that identity recoverable without replacing the local-first guest
flow.

## Required gates before implementation

1. Put the active archive behind one repository interface and verify reversible
   migration from the compatibility store to Dexie.
2. Define versioned, bounded snapshot schemas with preview and explicit consent.
3. Create migrations with Row Level Security enabled and deny-by-default
   policies for every exposed table.
4. Keep service-role keys, connector secrets and token-encryption material only
   in trusted server-side functions.
5. Test exact production and localhost redirect/CORS allowlists, rate limits,
   idempotency, expiry, revocation and degraded states.
6. Complete provider terms review before enabling each connector.
7. Add abuse controls for anonymous identities, including rate limits, expiry
   and a bot challenge on public write endpoints.

## Consequences

- GitHub Pages remains simple, inexpensive and independently deployable.
- Authentication is optional product capability, not an entry requirement.
- Supabase provides a relational evidence model, social login and row-level
  authorization in one control plane, but free-project pausing requires an
  honest offline state.
- Cloudflare Workers and D1 remain a viable later gateway if scale-to-zero API
  execution becomes more important than integrated authentication.
- No backend dependency is added until its schema, threat model and operational
  ownership are approved.
