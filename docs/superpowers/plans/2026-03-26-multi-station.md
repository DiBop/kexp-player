# Multi-Station Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a station selector dropdown so users can switch between KEXP and WFMU (and future stations) without breaking any existing behavior.

**Architecture:** A new `stations.ts` registry defines each station's stream URL and API fetch function. The existing `PlayerControls` component gains a `streamUrl` prop (replacing its hardcoded constant) and stops audio when the prop changes. A new `StationSelector` dropdown sits above `NowPlaying` in the layout. The page manages `selectedStation` state and restarts polling on switch.

**Tech Stack:** Svelte 4 (legacy syntax), TypeScript, Vitest, Tauri 2

**Safety constraint:** Run `npm test` after every task. All 4 existing tests must pass throughout. KEXP behavior must be identical after the refactor.

---

## File Map

| File | Change |
|------|--------|
| `src/lib/stations.ts` | **Create** — Station interface + KEXP + WFMU entries |
| `src/components/StationSelector.svelte` | **Create** — dropdown UI |
| `src/components/PlayerControls.svelte` | **Modify** — accept `streamUrl` prop, stop on change |
| `src/routes/+page.svelte` | **Modify** — selectedStation state + switching logic |
| `src-tauri/tauri.conf.json` | **Modify** — add WFMU to CSP |
| `tests/stations.test.ts` | **Create** — tests for WFMU fetch + mapping |

---

## Task 1: Create station registry with KEXP entry

**Files:**
- Create: `src/lib/stations.ts`
- Test: `tests/stations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/stations.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STATIONS, DEFAULT_STATION } from '../src/lib/stations';

describe('STATIONS registry', () => {
  it('has at least two stations', () => {
    expect(STATIONS.length).toBeGreaterThanOrEqual(2);
  });

  it('DEFAULT_STATION is KEXP', () => {
    expect(DEFAULT_STATION.id).toBe('kexp');
    expect(DEFAULT_STATION.name).toBe('KEXP 90.3 FM');
  });

  it('every station has required fields', () => {
    for (const station of STATIONS) {
      expect(typeof station.id).toBe('string');
      expect(typeof station.name).toBe('string');
      expect(typeof station.streamUrl).toBe('string');
      expect(typeof station.fetchPlays).toBe('function');
    }
  });

  it('KEXP station has correct stream URL', () => {
    const kexp = STATIONS.find(s => s.id === 'kexp')!;
    expect(kexp.streamUrl).toBe('https://kexp-mp3-128.streamguys1.com/kexp128.mp3');
  });

  it('WFMU station has correct stream URL', () => {
    const wfmu = STATIONS.find(s => s.id === 'wfmu')!;
    expect(wfmu.streamUrl).toBe('https://stream.wfmu.org/freeform-128k.mp3');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: 5 new tests fail with "Cannot find module '../src/lib/stations'". The 4 existing kexp tests still pass.

- [ ] **Step 3: Create `src/lib/stations.ts`**

```typescript
import type { Play } from './kexp';
import { fetchRecentPlays } from './kexp';

export interface Station {
  id: string;
  name: string;
  streamUrl: string;
  fetchPlays: () => Promise<Play[]>;
}

async function fetchWfmuPlays(): Promise<Play[]> {
  const res = await fetch('https://wfmu.org/api/now-playing');
  if (!res.ok) throw new Error(`WFMU API error: ${res.status}`);
  const data = await res.json();
  const playlist: Array<{
    time: string;
    song_title: string | null;
    artist_name: string | null;
    album: string | null;
    image_url: string | null;
  }> = data.playlist ?? [];

  return playlist
    .filter((entry) => entry.song_title && entry.artist_name)
    .map((entry) => ({
      airdate: parseWfmuTime(entry.time),
      song: entry.song_title,
      artist: entry.artist_name,
      album: entry.album,
      image_uri: entry.image_url,
      thumbnail_uri: entry.image_url,
    }));
}

function parseWfmuTime(timeStr: string): string {
  // WFMU returns times like "4:31 PM" — convert to ISO string for today
  const [time, period] = timeStr.trim().split(' ');
  const [rawHours, minutes] = time.split(':').map(Number);
  let hours = rawHours;
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export const STATIONS: Station[] = [
  {
    id: 'kexp',
    name: 'KEXP 90.3 FM',
    streamUrl: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',
    fetchPlays: fetchRecentPlays,
  },
  {
    id: 'wfmu',
    name: 'WFMU 91.1 FM',
    streamUrl: 'https://stream.wfmu.org/freeform-128k.mp3',
    fetchPlays: fetchWfmuPlays,
  },
];

export const DEFAULT_STATION = STATIONS[0];
```

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
npm test
```

Expected: 9 tests pass (4 existing kexp + 5 new stations), 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stations.ts tests/stations.test.ts
git commit -m "feat: add station registry with KEXP and WFMU"
```

---

## Task 2: Add WFMU fetch tests

**Files:**
- Modify: `tests/stations.test.ts`

- [ ] **Step 1: Add WFMU fetchPlays tests to `tests/stations.test.ts`**

Add this new `describe` block at the bottom of the file (after the existing `describe('STATIONS registry', ...)` block):

```typescript
describe('WFMU fetchPlays', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('maps playlist entries to Play interface', async () => {
    const wfmu = STATIONS.find(s => s.id === 'wfmu')!;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playlist: [
          {
            time: '4:31 PM',
            song_title: 'Psycho Killer',
            artist_name: 'Talking Heads',
            album: 'Talking Heads: 77',
            image_url: 'https://example.com/art.jpg',
          },
        ],
      }),
    } as Response);

    const plays = await wfmu.fetchPlays();

    expect(plays).toHaveLength(1);
    expect(plays[0].song).toBe('Psycho Killer');
    expect(plays[0].artist).toBe('Talking Heads');
    expect(plays[0].album).toBe('Talking Heads: 77');
    expect(plays[0].image_uri).toBe('https://example.com/art.jpg');
    expect(plays[0].thumbnail_uri).toBe('https://example.com/art.jpg');
    expect(typeof plays[0].airdate).toBe('string');
  });

  it('filters out entries with no song or artist', async () => {
    const wfmu = STATIONS.find(s => s.id === 'wfmu')!;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playlist: [
          {
            time: '4:31 PM',
            song_title: 'Psycho Killer',
            artist_name: 'Talking Heads',
            album: null,
            image_url: null,
          },
          {
            time: '4:28 PM',
            song_title: null,
            artist_name: null,
            album: null,
            image_url: null,
          },
        ],
      }),
    } as Response);

    const plays = await wfmu.fetchPlays();

    expect(plays).toHaveLength(1);
    expect(plays[0].artist).toBe('Talking Heads');
  });

  it('throws on non-OK HTTP response', async () => {
    const wfmu = STATIONS.find(s => s.id === 'wfmu')!;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(wfmu.fetchPlays()).rejects.toThrow('WFMU API error: 503');
  });

  it('handles empty playlist gracefully', async () => {
    const wfmu = STATIONS.find(s => s.id === 'wfmu')!;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ playlist: [] }),
    } as Response);

    const plays = await wfmu.fetchPlays();
    expect(plays).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: 13 tests pass (4 kexp + 5 registry + 4 wfmu), 0 fail.

- [ ] **Step 3: Commit**

```bash
git add tests/stations.test.ts
git commit -m "test: add WFMU fetchPlays tests"
```

---

## Task 3: Update PlayerControls to accept streamUrl prop

**Files:**
- Modify: `src/components/PlayerControls.svelte`

- [ ] **Step 1: Run existing tests to confirm baseline**

```bash
npm test
```

Expected: 13 tests pass. Confirm before making changes.

- [ ] **Step 2: Replace `src/components/PlayerControls.svelte`**

Replace the entire file with:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let streamUrl: string;

  let audio: HTMLAudioElement;
  let isPlaying = false;
  let volume = 0.8;
  let activeUrl = '';

  onMount(() => {
    audio = new Audio();
    audio.volume = volume;
    audio.preload = 'none';
  });

  onDestroy(() => {
    audio?.pause();
  });

  // Stop audio immediately when streamUrl changes (station switch)
  $: if (audio && isPlaying && streamUrl !== activeUrl) {
    audio.pause();
    audio.src = '';
    isPlaying = false;
  }

  function togglePlay() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
    } else {
      activeUrl = streamUrl;
      audio.src = streamUrl;
      audio.play()
        .then(() => { isPlaying = true; })
        .catch((err) => {
          console.error('Audio playback failed:', err);
          isPlaying = false;
        });
    }
  }

  function onVolumeChange(e: Event) {
    volume = parseFloat((e.target as HTMLInputElement).value);
    audio.volume = volume;
  }
</script>

<div class="controls">
  <button class="play-btn" on:click={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
    {#if isPlaying}
      <!-- Pause icon -->
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    {:else}
      <!-- Play icon -->
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21"/>
      </svg>
    {/if}
  </button>

  <div class="volume-group">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="vol-icon">
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      {#if volume > 0.5}
        <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" stroke-width="2" fill="none"/>
      {:else if volume > 0}
        <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" stroke-width="2" fill="none"/>
      {/if}
    </svg>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={volume}
      on:input={onVolumeChange}
      class="volume-slider"
      aria-label="Volume"
    />
  </div>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 16px 16px;
  }

  .play-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    background: var(--accent);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .play-btn:hover {
    background: var(--accent-hover);
    transform: scale(1.05);
  }

  .play-btn:active {
    transform: scale(0.97);
  }

  .volume-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .vol-icon {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .volume-slider {
    flex: 1;
    -webkit-appearance: none;
    height: 3px;
    border-radius: 2px;
    background: var(--border);
    outline: none;
    cursor: pointer;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--text-secondary);
    transition: background 0.15s ease;
  }

  .volume-slider:hover::-webkit-slider-thumb {
    background: var(--text-primary);
  }
</style>
```

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
npm test
```

Expected: 13 tests pass, 0 fail.

- [ ] **Step 4: Commit**

```bash
git add src/components/PlayerControls.svelte
git commit -m "refactor: PlayerControls accepts streamUrl prop"
```

---

## Task 4: Create StationSelector component

**Files:**
- Create: `src/components/StationSelector.svelte`

- [ ] **Step 1: Create `src/components/StationSelector.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Station } from '../lib/stations';
  import { STATIONS } from '../lib/stations';

  export let selected: Station;

  const dispatch = createEventDispatcher<{ change: Station }>();

  function onChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    const station = STATIONS.find((s) => s.id === id)!;
    dispatch('change', station);
  }
</script>

<div class="station-selector">
  <select value={selected.id} on:change={onChange} aria-label="Select station">
    {#each STATIONS as station}
      <option value={station.id}>{station.name}</option>
    {/each}
  </select>
  <svg class="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
</div>

<style>
  .station-selector {
    position: relative;
    padding: 10px 16px 6px;
  }

  select {
    width: 100%;
    appearance: none;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 32px 8px 12px;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s ease;
  }

  select:hover {
    border-color: var(--text-muted);
  }

  select:focus {
    border-color: var(--accent);
  }

  .chevron {
    position: absolute;
    right: 28px;
    top: 50%;
    transform: translateY(-2px);
    color: var(--text-muted);
    pointer-events: none;
  }
</style>
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
npm test
```

Expected: 13 tests pass, 0 fail.

- [ ] **Step 3: Commit**

```bash
git add src/components/StationSelector.svelte
git commit -m "feat: add StationSelector dropdown component"
```

---

## Task 5: Wire station switching in page.svelte + update CSP

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Replace `src/routes/+page.svelte`**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { DEFAULT_STATION } from '../lib/stations';
  import type { Station } from '../lib/stations';
  import type { Play } from '../lib/kexp';
  import NowPlaying from '../components/NowPlaying.svelte';
  import PlayerControls from '../components/PlayerControls.svelte';
  import TrackFeed from '../components/TrackFeed.svelte';
  import StationSelector from '../components/StationSelector.svelte';

  let selectedStation: Station = DEFAULT_STATION;
  let plays: Play[] = [];
  let error: string | null = null;
  let intervalId: ReturnType<typeof setInterval>;

  async function poll() {
    try {
      plays = await selectedStation.fetchPlays();
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load feed';
    }
  }

  function startPolling() {
    clearInterval(intervalId);
    plays = [];
    poll();
    intervalId = setInterval(poll, 30_000);
  }

  function onStationChange(e: CustomEvent<Station>) {
    selectedStation = e.detail;
    startPolling();
  }

  onMount(() => {
    startPolling();
  });

  onDestroy(() => {
    clearInterval(intervalId);
  });

  $: currentPlay = plays[0] ?? null;
</script>

<div class="app">
  <StationSelector selected={selectedStation} on:change={onStationChange} />
  <NowPlaying play={currentPlay} />
  <PlayerControls streamUrl={selectedStation.streamUrl} />
  {#if error}
    <div class="error">{error}</div>
  {/if}
  <TrackFeed {plays} />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg-primary);
    overflow: hidden;
  }

  .error {
    margin: 0 16px 8px;
    padding: 8px 12px;
    background: rgba(244, 67, 54, 0.15);
    border: 1px solid rgba(244, 67, 54, 0.3);
    border-radius: 4px;
    color: #ef9a9a;
    font-size: 12px;
  }
</style>
```

- [ ] **Step 2: Update CSP in `src-tauri/tauri.conf.json`**

Find the `"csp"` line (line 22) and replace it with:

```json
"csp": "default-src 'self' ipc: http://ipc.localhost; media-src https://kexp-mp3-128.streamguys1.com https://stream.wfmu.org; img-src 'self' https: data: blob:; connect-src https://api.kexp.org https://wfmu.org; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: 13 tests pass, 0 fail.

- [ ] **Step 4: Verify the app runs with `npm run build`**

```bash
export PATH="$HOME/.cargo/bin:$PATH"
npm run build
```

Expected: Vite build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte src-tauri/tauri.conf.json
git commit -m "feat: wire multi-station switching with StationSelector"
```

---

## Task 6: Production build + final verification

**Files:** No changes — verification only.

- [ ] **Step 1: Run full test suite one final time**

```bash
npm test
```

Expected: 13 tests pass, 0 fail.

- [ ] **Step 2: Build for production**

```bash
export PATH="$HOME/.cargo/bin:$PATH"
npm run tauri build 2>&1 | tail -10
```

Expected: Builds without errors. Bundles produced in `src-tauri/target/release/bundle/`.

- [ ] **Step 3: Manual smoke test checklist**

Run: `./src-tauri/target/release/kexp-player`

Verify:
- [ ] Dropdown shows "KEXP 90.3 FM" by default
- [ ] KEXP stream plays and feed loads (existing behavior unchanged)
- [ ] Switching to "WFMU 91.1 FM": audio stops immediately, feed shows "Loading feed..." then populates
- [ ] WFMU stream plays after pressing play
- [ ] Switching back to KEXP works correctly

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify multi-station production build"
```
