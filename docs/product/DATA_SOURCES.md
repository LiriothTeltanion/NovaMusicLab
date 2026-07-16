# Supported Data Sources

Nova Music Lab normalizes multiple export formats into one analytical model while preserving source capabilities and limitations.

## Capability matrix

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

## Normalization rules

- Preserve the source of every event used for reconciliation.
- Normalize Unicode and evidence-backed aliases before aggregation.
- Identify tracks by artist and title, not title alone.
- Treat missing duration differently from explicit zero duration.
- Apply provider thresholds only when the provider and field evidence support them.
- Use an explicit analysis timezone for daily, monthly and session boundaries.
- Deduplicate only evidence-backed cross-source overlap; same-source repeated listening remains valid behavior.

## Import receipt

The v1 importer should report:

- files and formats accepted;
- files or rows rejected and why;
- source counts before and after thresholds;
- cross-source duplicates removed;
- final date range and analysis timezone;
- available, partial and unavailable capabilities;
- local save outcome.

The receipt must remain visible after navigation through a toast, archive-status panel or import summary room.
