# MusicBee library snapshot

Status: part of Nova Music Lab `1.2.0` — planned **2026-07-29**, not published or deployed.

MusicBee gives Nova Music Lab a view of a local music **library**: the artists,
albums and tracks it contains, plus any cumulative counters that MusicBee includes
in its XML export. It does not provide a complete list of individual listening
events, so Nova Music Lab keeps it separate from the Spotify, Last.fm, Apple
Music, ListenBrainz and YouTube timelines.

In plain language:

- Spotify and similar archives answer **what played, and when**.
- MusicBee answers **what is in this local library, and what its saved counters say**.
- The two views can appear together, but their play totals are never added together.

## Export from MusicBee

Nova Music Lab accepts MusicBee's iTunes-compatible XML export. It does not read
the binary `MusicBeeLibrary.mbl` database.

The current browser importer rejects XML files larger than 50 MB before parsing.
This is a Nova safety boundary, not a MusicBee limitation. Accepted XML files
are read, sanitized and aggregated in a dedicated background Web Worker so the
interface remains responsive. A future incremental importer would still be
needed for files above the boundary instead of raising the limit blindly.

1. In MusicBee, open **Preferences** and select **Library**.
2. Enable **Export the library as an iTunes formatted XML file**.
3. Apply the setting, then close MusicBee so it writes the current XML file.
4. Find the generated XML in the MusicBee library folder and select it in the
   Nova Music Lab importer.

MusicBee generates or refreshes this XML when the application closes. The
[MusicBee support forum documents the preference and output behavior](https://getmusicbee.com/forum/index.php?topic=41018.0).
If the file is missing, close MusicBee normally after enabling the setting and
check the configured library folder again.

The `.mbl` file is binary and Nova cannot read it directly; see the
[MusicBee database discussion](https://getmusicbee.com/forum/index.php?topic=40772.0).

## Privacy-safe field contract

The importer uses an allowlist. It keeps only fields needed for a useful local
library summary:

| XML field | Use in Nova Music Lab |
|---|---|
| `Artist` or `Album Artist` | Canonical artist identity |
| `Name` | Track title |
| `Album` | Album identity |
| `Genre` | Library genre tags |
| `Total Time` | Track duration when available |
| `Play Count` | MusicBee's cumulative track counter |
| `Skip Count` | MusicBee's cumulative skip counter |
| `Rating` | MusicBee library rating |
| `Play Date UTC` or `Play Date` | Most recent saved play date when available |
| `Date Added` | Library-added date when available |

Nova Music Lab discards:

- `Location` and all local file paths;
- persistent IDs and track IDs;
- playlist membership and unrelated XML metadata;
- every unrecognized field.

Tracks with the same normalized artist, title and album are combined inside the
MusicBee snapshot. Their saved counters may be summed **within that snapshot**
to represent the library record, but they never change the event totals,
sessions, streaks, listening time or date range derived from other providers.

## Evidence and limitations

A MusicBee play count is a cumulative library value, not a series of timestamped
plays. A latest-played value can identify the most recent saved date, but it
cannot reconstruct all earlier listening events. Therefore:

- MusicBee is not part of cross-source event deduplication.
- Its play and skip counters are not reconciled with Spotify or Last.fm totals.
- It cannot independently produce a historical timeline, sessions or streaks.
- Missing counters mean unavailable data, not zero listening.
- Importing a newer XML replaces the local MusicBee snapshot; it does not invent
  changes between snapshots.

The selected XML is parsed in a background Worker inside the browser. Changing
the import or leaving the uploader terminates that Worker and discards its raw
input. Nova Music Lab retains only the sanitized snapshot with the local museum
and does not upload the raw file to a Nova backend. Do not commit personal XML
exports to the repository.

## Presentation by experience depth

The evidence stays the same in every depth; only the amount and vocabulary of
the explanation changes.

| Depth | MusicBee presentation |
|---|---|
| **Guided** | “Your local library” summary, everyday language and one clear next step |
| **Explore** | Artist, album and track context with brief source labels and visible limitations |
| **Deep Dive** | Exact field coverage, counters, normalization rules, provenance and technical limitations |

Guided and Explore must not describe MusicBee as a “timeline source” or show
technical reconciliation language without a plain-language explanation. Deep
Dive may expose implementation details, but it must still state that the
snapshot counters remain separate.
