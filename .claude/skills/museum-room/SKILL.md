---
name: museum-room
description: Add, move, rename or substantially change a routed museum room in Nova Music Lab. Use when work involves a room, hub, tab, navigation entry, the command palette, or reading depth.
---

# Museum room work

The navigation model is data, not scattered conditionals. `src/components/shell/museumNavigation.ts`
is the single source of truth: five hubs, 24 room ids, three reading depths.

## Hubs

| Hub | Entry | Rooms |
|---|---|---|
| `home` | `dashboard` | dashboard, share |
| `pulse` | `pulse` | pulse, obsessions, achievements, wrapped |
| `atlas` | `artist` | artist, top, cultural |
| `stories` | `eras` | eras, timecapsule, personality, emotions, inner, insights, report |
| `lab` | `upload` | upload, audio, aiassistant, compare, museums, platforms, quality, statsdeep |

Order inside a hub is intentional — landing room first, then approachable → detailed.
Reading depths (`guided`, `explore`, `deep-dive`) come from `ExperienceContext` and
persist at `nml_experience_depth`.

## Checklist for a new room

1. **Register the id** in `CURRENT_MUSEUM_ROOM_IDS` and place it under the right hub in
   `MUSEUM_HUB_ROOMS`. Update `MUSEUM_HUB_ENTRY_ROOMS` only if it becomes the landing room.
2. **Lazy-load it** in `src/App.tsx`: `const Room = lazy(() => import('./components/Room'))`.
   A static import breaks the entry-bundle invariant and fails `build:check`.
3. **Classify it** — add to `EXPLORER_ROOMS` / `ANALYTICS_ROOMS` if it belongs, and confirm
   `roomWidthFor` gives it the right width.
4. **Give it a visual identity** in `museumVisualIdentity.ts`: family
   (`portal | archive | identity | observatory | signal | finale`), palette, motif. Rooms
   without an identity fall out of the Living Sonic Cartography system.
5. **Write copy in EN and ES** in `STRINGS` (`src/context/AppContext.tsx`), then run
   `npm run i18n:hebrew`. Never hand-edit `src/i18n/heStrings.ts`.
6. **Build the UI from existing primitives**: `Surface`, `chartKit`, `SectionNarrative`,
   `SectionQuickRead`, `ExpandableInsightCard`, `MethodologyPanel`,
   `InterpretiveBoundaryNotice`, `MuseumChapterHeader`.
7. **Test**: extend `museumNavigation.test.ts` and add `Room.test.tsx`
   (`describe`/`it`, `afterEach(cleanup)`, role or test-id queries).
8. **Budget it**: `npm run build:check`. A substantial room usually needs an entry in
   `ROOM_GZIP_BUDGETS` in `scripts/check_bundle_budget.mjs`.
9. **Reachability**: verify the sidebar, mobile room dock, command palette and deep links
   (`src/utils/deepLinks.ts`) all resolve the new id.

## Non-negotiables inside a room

- Every claim carries its evidence class; unsupported values render as *unavailable*.
- Emotional/personality material shows its non-clinical boundary.
- Flagship-only narrative never appears as visitor-derived evidence — check the active
  profile metadata, never the presence of a particular artist or date.
- Motion respects `motionMode` and always yields to `prefers-reduced-motion`.
- Emoji may add tone, never carry the only accessible label.

## Review before calling it done

Mobile and desktop · dark and light · EN/ES/HE with RTL · keyboard and visible focus ·
reduced motion · loading, empty, partial, success and failure states.
