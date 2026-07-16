## Outcome

<!-- Lead with what changed for visitors or maintainers. -->

## Scope

- Related issue:
- Museum mode affected: Flagship / Visitor / Both
- Rooms or systems affected:

## Evidence, privacy and network boundary

- [ ] Insights remain observed, inferred, estimated or unavailable according to real evidence.
- [ ] No raw listening archive, API key, personal identifier or private CV is committed.
- [ ] Public flagship data changes pass `node scripts/audit_public_bundle_privacy.mjs`.
- [ ] Any new storage, export or third-party request is documented.

## Visual and accessibility review

- [ ] Reviewed at mobile and desktop widths.
- [ ] Reviewed in one dark and one light theme.
- [ ] Reviewed in English, Spanish and Hebrew/RTL when copy or layout changed.
- [ ] Keyboard, focus, contrast and reduced-motion behavior were checked.

### Visual proof

<!-- Add privacy-safe before/after screenshots or explain why none are needed. -->

## Verification

- [ ] `npm run verify`
- [ ] `node scripts/audit_public_bundle_privacy.mjs`
- [ ] Relevant targeted tests
- [ ] Live preview smoke test when visual behavior changed
- [ ] Documentation and `CHANGELOG.md` updated when required

## Notes and follow-ups

<!-- Record intentional limits, deferred work and migration concerns. -->
