# Release media contract

Nova Music Lab treats README and profile imagery as release evidence, not as
evergreen decoration. Every product version owns an immutable media directory:

```text
assets/releases/v<version>/
```

`v1.4.0` — deployed 2026-07-29 — is the first release using this contract.
`v1.5.0` — deployed 2026-08-01 — extends it with an evidence image
for the repaired mobile Genres journey and a shorter room-to-room tour. The
unpublished `v1.3.0` private checkpoint from 2026-07-29 was superseded before
it adopted this package.

`v1.6.0` — private candidate 2026-08-09 — must receive a new immutable media
directory only after product freeze. Until those files are generated and pass
the audit, the v1.5.0 directory and raster social preview remain the latest
reviewed visual evidence.

## What each candidate must contain

- English cyber-theme Hero at 1440×900.
- Spanish cyber-theme Hero at 390×844.
- English cyber-theme Genres at 390×844 and Living Artist Atlas at 1440×900.
- English cyber-theme Guest Museum entry at 1440×900.
- Hebrew RTL Share & Feedback at 390×844 in the daylight theme.
- A three-room English Home → Atlas → Genres tour as a static three-panel JPEG
  contact sheet and a short animated GIF.
- The 1280×640 social preview.
- `release-media.json` with SHA-256, byte size, actual dimensions, language,
  theme, viewport, capture date, product-source fingerprint, source commit and
  release status.

The canonical profile IDs are:

- `profile-hero-desktop`
- `profile-hero-mobile`
- `genres-mobile`
- `artist-atlas-desktop`
- `guest-museum-desktop`
- `hebrew-mobile`
- `profile-tour`
- `profile-tour-static`
- `social-preview`

The animated tour always declares the static frame as its fallback. Legacy
README paths remain synchronized so a new version does not silently leave the
repository landing page on old imagery.

## Cross-repository handoff

`public/release-profile-manifest.json` is the stable, machine-readable handoff
for `LiriothTeltanion/LiriothTeltanion`. The profile must consume only a
manifest whose `release.status` is `deployed`, whose 40-character commit is
present, and whose live deployment has been verified independently.

The tracked source handoff deliberately retains:

```json
{
  "status": "private-candidate",
  "commit": null,
  "deployed_on": null
}
```

This does not mean the public product is undeployed. `v1.5.0` remains the
latest verified public release and was deployed on
2026-08-01 from initial release commit
`0e00227cb03d3bb2cbc1c3eead4ed3a5e6603b7d`. The tracked manifest remains
neutral so it never predicts the SHA of a commit that does not exist yet. CI
copies that manifest into `dist`, stamps the exact deployment identity there
and publishes only the stamped artifact. The live `build-meta.json` and live
release-profile manifest are therefore the authoritative deployment evidence.

The tracked candidate always keeps `commit` and `deployed_on` null. The
versioned `release-media.json` records the product-source state, file count and
a deterministic SHA-256 fingerprint. Committed candidates use canonical Git
blob bytes, so Windows and Linux line endings produce the same evidence.
Generated screenshots and manifests are excluded from that fingerprint, so a
later media-only commit does not make the evidence stale. The public `commit`
field is reserved for the exact Pages artifact identity.

The detailed manifest names the `nova-release-source-sha256-v2` algorithm. The
audit always recomputes that fingerprint from the current product tree and,
when the captured source commit is available locally, verifies that commit too.
The fingerprint remains stable when GitHub performs the repository's required
squash merge and creates a new deployment commit with the same product tree.

## Candidate workflow

1. Update `scripts/release-media.config.json` with the package version and
   candidate date. Keep the status `private-candidate`.
2. Finish and verify the product code, data and documentation.
3. Commit that functional source as commit A before preparing publishable
   evidence. A temporary working-tree capture is allowed for review, but it is
   explicitly labeled `working-tree-candidate`.
4. Produce a fresh production build and run
   `node scripts/capture_readme_visuals.mjs`.
5. Visually review every desktop/mobile image and the animated tour.
6. Run `node scripts/audit_release_media.mjs`. The audit recomputes the product
   fingerprint and rejects any source drift after capture.
7. Commit the reviewed media package as commit B, then run the complete release
   gate again. Because generated media is excluded, commit B preserves the
   exact product fingerprint captured from commit A.

On `main`, CI rebuilds with the deployed status and runs
`scripts/stamp_deployment_attestation.mjs`. That script changes only the copied
files inside `dist`: it promotes the served profile manifest to `deployed` and
writes `build-meta.json` with the same exact commit, version and deployment
date. The Pages smoke job accepts the release only when both live files agree.
No follow-up commit is used to claim its own deployment.

The GitHub profile synchronizer must read the live Pages manifest and
`build-meta.json`, verify their identity, then download immutable media from
the declared Git commit. It must prepare a reviewable candidate rather than
writing or publishing the profile automatically.
