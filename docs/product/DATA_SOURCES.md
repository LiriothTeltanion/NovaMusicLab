# Supported Data Sources

Nova Music Lab normalizes multiple export formats into one analytical model while preserving source capabilities and limitations.

Status: reflects Nova Music Lab `1.5.0` — deployed **2026-08-01**.

## Timeline capability matrix

| Capability | Last.fm | Spotify Extended History | Apple Music | ListenBrainz | YouTube Takeout |
|---|:---:|:---:|:---:|:---:|:---:|
| Timestamped listens | Yes | Yes | Yes | Yes | Usually |
| Artist and track | Yes | Yes | Yes | Yes | Parsed from history |
| Album | Often | Often | Often | Sometimes | Rarely |
| Listening duration | No | Yes | Source-dependent | No | No |
| Platform/device family | No | Yes | Source-dependent | No | No |
| Country | No | Yes | Source-dependent | No | No |
| Skip and short-play signals | No | Yes | Source-dependent | No | No |
| Long-term chronology | Strong | Export-window dependent | Export dependent | Strong | Export dependent |

“Source-dependent” means the parser must verify the field exists; it must not assume it from the provider name.

## MusicBee is a separate library snapshot

MusicBee's iTunes-compatible XML export describes a local library and its saved
cumulative counters. It is not a timestamped listening archive. Nova Music Lab
can attach that sanitized snapshot to a museum, but it does not include
MusicBee counters in the timeline or add them to Spotify, Last.fm or any other
provider total.

| MusicBee capability | Support |
|---|---|
| Artists, tracks and albums in the local library | Yes |
| Genre tags, duration, rating and saved counters | When present in the XML |
| Latest saved play date | When present in the XML |
| Complete timestamped listening history | No |
| Sessions, streaks or historical listening time | No |
| Cross-source event reconciliation | No; the snapshot remains separate |

See [MusicBee library snapshot](./MUSICBEE_LIBRARY_SNAPSHOT.md) for export steps,
the exact field allowlist, privacy rules and evidence limitations.

## Normalization rules

- Preserve the source of every event used for reconciliation.
- Normalize Unicode and evidence-backed aliases before aggregation.
- Identify tracks by artist and title, not title alone.
- Treat missing duration differently from explicit zero duration.
- Apply provider thresholds only when the provider and field evidence support them.
- Use an explicit analysis timezone for daily, monthly and session boundaries.
- Deduplicate only evidence-backed cross-source overlap; same-source repeated listening remains valid behavior.
- Keep MusicBee library counters outside event reconciliation and provider timeline totals.

## Import receipt

The importer should report:

- files and formats accepted;
- files or rows rejected and why;
- source counts before and after thresholds;
- cross-source duplicates removed;
- final date range and analysis timezone;
- available, partial and unavailable capabilities;
- local save outcome.

For MusicBee, the receipt should additionally report the sanitized track, artist
and album counts and state that the event timeline was not changed. It must not
display or retain local file paths.

The receipt must remain visible after navigation through a toast, archive-status panel or import summary room.
