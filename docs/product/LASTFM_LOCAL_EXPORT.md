# Private Last.fm history export

Nova Music Lab includes a local developer tool that downloads a dated Last.fm
history into the CSV shape already accepted by the browser importer. It is a
manual snapshot, not a live connection, account system or background sync.

Status: local workflow prepared after `1.5.0` — deployed **2026-08-01**. It does
not change the public flagship dataset or its verified freshness dates.

## Safest Windows workflow

From the repository root, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-lastfm-history.ps1
```

The launcher asks for the Last.fm account name and then for the API key. The key
entry is hidden. The launcher keeps it only in the current process environment,
passes it to the Node.js child process and clears or restores that variable in a
`finally` block. Do not paste the key into chat, a command, `.env.local`, an
issue, a screenshot or a committed file.

The generic output filename is written beneath:

```text
%LOCALAPPDATA%\NovaMusicLab\private-exports\lastfm\
```

This directory is outside the repository and outside its OneDrive workspace.
The output contains raw timestamped listening activity and must remain private.

## What the exporter guarantees

- Calls the official `user.getRecentTracks` API sequentially, at up to 200 rows per page.
- Freezes one UTC upper boundary before page one so new scrobbles do not shift pagination.
- Retries bounded transient network, HTTP rate-limit/server and Last.fm temporary failures.
- Applies a 20-second timeout to each request and supports safe `Ctrl+C` cancellation.
- Excludes only the explicit undated `nowplaying` item.
- Preserves repeated same-source scrobbles because repeated listening is valid evidence.
- Requires stable page metadata and an exact match with Last.fm's reported dated-row total.
- Writes a temporary file first, then atomically promotes it only after validation.
- Refuses to overwrite an earlier valid export.
- Prints a private local receipt with count, date range, pages, size and SHA-256.
- Never writes the API key, account name, API response JSON or full request URL to disk.

The CSV contract is:

```csv
Artist,Album,Track,Date
"Example Artist","Example Album","Example Track","2026-08-01T12:34:56.000Z"
```

Fields are RFC 4180-escaped and timestamps are ISO 8601 UTC. Last.fm does not
provide listening duration, device, country or reliable skip evidence through
this endpoint, so Nova must keep those capabilities unavailable for this source.

## Optional date window

For a bounded refresh, provide UTC dates or timestamps:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-lastfm-history.ps1 -From 2026-07-04 -To 2026-08-01
```

Date-only `-From` starts at `00:00:00Z`; date-only `-To` ends at `23:59:59Z`.
Omit both values for the complete available history.

## Import without publishing

1. Open Nova Music Lab locally or on the public Pages app.
2. Enter **Upload** and select the generated CSV.
3. Review the import receipt, total and date range.
4. Keep the resulting Guest Museum in browser-local storage.

Do not copy the CSV into `src/data`. Replacing the public flagship bundle is a
separate, review-gated data release that requires reconciliation, public-field
reduction, privacy auditing and explicit publication approval.

## Troubleshooting

| Message | Meaning | Safe action |
|---|---|---|
| `API error 10` | The API key is invalid | Copy the API key again in the hidden prompt |
| `API error 6` | The account name was not found | Check spelling and renamed-account history |
| Retry budget expired | Network or Last.fm stayed unavailable | Retry later; no final CSV was promoted |
| Pagination changed | The snapshot contract became unstable | Run again; do not use a partial result |
| Malformed dated row | Last.fm returned an unsafe row | Keep the failure and review before importing |

The endpoint contract is documented by
[Last.fm `user.getRecentTracks`](https://www.last.fm/api/show/user.getRecentTracks).
