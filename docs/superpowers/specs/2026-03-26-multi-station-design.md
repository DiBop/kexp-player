# Multi-Station Support — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Overview

Add a station selector dropdown to the KEXP Player so users can switch between multiple hardcoded radio stations. Initial stations: KEXP 90.3 FM and WFMU 91.1 FM. New stations are added by editing `src/lib/stations.ts` and rebuilding.

## Goals

- Switch between stations via a dropdown at the top of the app
- Switching stops the current stream immediately and loads the new station
- Each station has its own stream URL and now-playing API
- Adding a new station requires only adding one object to `stations.ts`
- No user-facing "add station" UI (hardcoded for now)

## Architecture

### New file: `src/lib/stations.ts`

Defines the `Station` interface and exports the `STATIONS` array:

```typescript
interface Station {
  id: string;           // unique key, e.g. 'kexp', 'wfmu'
  name: string;         // display name, e.g. 'KEXP 90.3 FM'
  streamUrl: string;    // MP3/AAC stream URL
  fetchPlays: () => Promise<Play[]>;  // normalizes to shared Play interface
}

export const STATIONS: Station[] = [
  { id: 'kexp', name: 'KEXP 90.3 FM', streamUrl: '...', fetchPlays: ... },
  { id: 'wfmu', name: 'WFMU 91.1 FM', streamUrl: '...', fetchPlays: ... },
];

export const DEFAULT_STATION = STATIONS[0];
```

Each station's `fetchPlays` normalizes its API response to the existing `Play` interface (`airdate`, `song`, `artist`, `album`, `image_uri`, `thumbnail_uri`). Stations with different API response shapes handle the mapping internally.

### New file: `src/components/StationSelector.svelte`

A `<select>` dropdown styled to match the dark theme. Sits at the very top of the app layout, above `NowPlaying`. Emits a `change` event with the selected `Station` object up to the page.

### Modified: `src/lib/kexp.ts`

The existing `fetchRecentPlays` function is reused as KEXP's `fetchPlays` implementation. No logic changes — just wired into the station config.

### Modified: `src/components/PlayerControls.svelte`

Accepts a `streamUrl: string` prop instead of the hardcoded `STREAM_URL` constant. When `streamUrl` changes (station switch), the component stops the current audio, reassigns `audio.src`, and resets `isPlaying` to `false`. User must press play on the new station.

### Modified: `src/routes/+page.svelte`

- Imports `STATIONS` and `DEFAULT_STATION`
- Tracks `selectedStation: Station` as reactive state
- When station changes: clears plays array, cancels current poll interval, starts new poll interval using new station's `fetchPlays`
- Passes `selectedStation.streamUrl` to `PlayerControls`

### Modified: `src-tauri/tauri.conf.json`

Add `https://wfmu.org` to `connect-src` in the CSP:
```
connect-src https://api.kexp.org https://wfmu.org
```

## UI Layout

```
┌─────────────────────────────────┐
│  [▾ KEXP 90.3 FM            ]  │  ← StationSelector (full width)
├─────────────────────────────────┤
│  ██████████  ● NOW PLAYING      │
│  ██ art  ██  Artist             │
│  ██████████  Song               │
│              Album              │
│                                 │
│  [▶]  ════════════════  🔊      │
├─────────────────────────────────┤
│  RECENTLY PLAYED                │
│  ...                            │
└─────────────────────────────────┘
```

- Dropdown styled dark, accent color on focus/hover
- Full width, compact height (~36px)
- Selecting a new station: stream stops immediately, feed shows "Loading feed..." while new API call is in flight

## Station Configs

### KEXP
- Stream: `https://kexp-mp3-128.streamguys1.com/kexp128.mp3`
- API: `https://api.kexp.org/v2/plays/?format=json&limit=20` (existing)
- Response fields: `airdate`, `song`, `artist`, `album`, `image_uri`, `thumbnail_uri`

### WFMU
- Stream: `https://stream.wfmu.org/freeform-128k.mp3`
- API: `https://wfmu.org/api/now-playing` — returns `playlist` array
- Each entry has: `time`, `song_title`, `artist_name`, `album`, `image_url`
- Mapping: `time` → `airdate`, `song_title` → `song`, `artist_name` → `artist`, `image_url` → both `image_uri` and `thumbnail_uri`

## Error Handling

- API failure: existing error banner handles it (no change)
- Stream failure: `audio.play()` rejects → `isPlaying` resets to `false` (existing behavior)
- No additional error UI needed

## Testing

- Add tests in `tests/stations.test.ts` covering:
  - KEXP `fetchPlays` returns normalized `Play[]`
  - WFMU `fetchPlays` correctly maps response fields to `Play` interface
  - WFMU `fetchPlays` filters entries with null song/artist

## File Map

| File | Change |
|------|--------|
| `src/lib/stations.ts` | Create — station registry |
| `src/components/StationSelector.svelte` | Create — dropdown UI |
| `src/lib/kexp.ts` | Minor — reuse as KEXP fetchPlays |
| `src/components/PlayerControls.svelte` | Modify — accept streamUrl prop |
| `src/routes/+page.svelte` | Modify — station state + switching logic |
| `src-tauri/tauri.conf.json` | Modify — add WFMU to CSP |
| `tests/stations.test.ts` | Create — station fetch tests |
