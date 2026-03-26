# KEXP Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri 2 desktop app for Linux that streams KEXP radio and shows a scrollable, clickable now-playing feed with album art.

**Architecture:** Thin Tauri Rust shell wrapping a Svelte + TypeScript frontend. Audio playback via HTML5 `<audio>` in the webview. KEXP public API polled every 30s from the frontend. All state managed with reactive variables in `App.svelte` — no state library needed.

**Tech Stack:** Tauri 2, Svelte 4 (legacy syntax), TypeScript, Vite, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/kexp.ts` | KEXP API types + `fetchRecentPlays()` |
| `src/components/NowPlaying.svelte` | Album art + current track info |
| `src/components/PlayerControls.svelte` | `<audio>` element, play/pause, volume |
| `src/components/TrackFeed.svelte` | Scrollable recently-played list with hover + DDG links |
| `src/App.svelte` | Root: polling loop, state, layout |
| `src/app.css` | Global dark theme CSS variables |
| `src-tauri/tauri.conf.json` | Window size, CSP, app metadata |
| `src-tauri/capabilities/default.json` | Shell open permission |
| `src-tauri/src/main.rs` | Tauri init + shell plugin registration |
| `src-tauri/Cargo.toml` | Add `tauri-plugin-shell` dependency |
| `tests/kexp.test.ts` | Vitest unit tests for `fetchRecentPlays` |

---

## Task 1: Scaffold the Tauri + Svelte project

**Files:**
- Create: `kexp-player/` (full project scaffold)

- [ ] **Step 1: Verify prerequisites are installed**

```bash
rustc --version       # need 1.70+
cargo --version
node --version        # need 18+
npm --version
```

If Rust is missing: `curl https://sh.rustup.rs -sSf | sh && source ~/.cargo/env`

- [ ] **Step 2: Scaffold the project**

```bash
cd /home/steven/projects
npm create tauri-app@latest kexp-player
```

Answer the prompts:
- Project name: `kexp-player`
- Identifier: `com.kexp.player`
- Frontend language: **TypeScript**
- UI template: **Svelte**

- [ ] **Step 3: Install dependencies and add Vitest**

```bash
cd kexp-player
npm install
npm install --save-dev vitest @vitest/ui jsdom
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts` in the project root:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

Add test script to `package.json` — open `package.json`, find the `"scripts"` block, and add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify the dev server starts**

```bash
npm run tauri dev
```

Expected: A blank Tauri window opens with "Welcome to Tauri + Svelte" content. Close it with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri + Svelte project"
```

---

## Task 2: Configure Tauri (CSP + shell plugin)

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add shell plugin to Cargo.toml**

Open `src-tauri/Cargo.toml`. In the `[dependencies]` section add:

```toml
tauri-plugin-shell = "2"
```

- [ ] **Step 2: Install the JS shell plugin package**

```bash
npm install @tauri-apps/plugin-shell
```

- [ ] **Step 3: Register the plugin in main.rs**

Open `src-tauri/src/main.rs`. Replace the entire file with:

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Update tauri.conf.json — window size and CSP**

Open `src-tauri/tauri.conf.json`. Find the `"app"` section and update it so:

1. The window is sized appropriately — find `"windows"` array, set:
```json
"width": 420,
"height": 720,
"resizable": true,
"title": "KEXP"
```

2. Set the CSP — in the `"security"` object (create it under `"app"` if absent):
```json
"security": {
  "csp": "default-src 'self' ipc: http://ipc.localhost; media-src https://kexp-mp3-128.streamguys1.com; img-src 'self' https: data: blob:; connect-src https://api.kexp.org; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
}
```

- [ ] **Step 5: Add shell:allow-open to capabilities**

Open `src-tauri/capabilities/default.json`. In the `"permissions"` array, add `"shell:allow-open"`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open"
  ]
}
```

- [ ] **Step 6: Verify it still builds**

```bash
npm run tauri build -- --debug 2>&1 | tail -20
```

Expected: Compiles without errors (warnings about unused code are fine). If you see a capability schema error, run `npm run tauri dev` once to regenerate the schema first.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: configure Tauri CSP and shell plugin"
```

---

## Task 3: KEXP API client + tests

**Files:**
- Create: `src/lib/kexp.ts`
- Create: `tests/kexp.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/kexp.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRecentPlays } from '../src/lib/kexp';

const mockPlay = {
  airdate: '2026-03-26T12:00:00Z',
  song: 'Don\'t You (Forget About Me)',
  artist: 'Simple Minds',
  album: 'The Breakfast Club',
  image_uri: 'https://example.com/art.jpg',
  thumbnail_uri: 'https://example.com/thumb.jpg',
};

describe('fetchRecentPlays', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns an array of plays on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [mockPlay] }),
    } as Response);

    const plays = await fetchRecentPlays();

    expect(plays).toHaveLength(1);
    expect(plays[0].artist).toBe('Simple Minds');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.kexp.org/v2/plays/?format=json&limit=20'
    );
  });

  it('respects a custom limit', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await fetchRecentPlays(5);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.kexp.org/v2/plays/?format=json&limit=5'
    );
  });

  it('throws on non-OK HTTP response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(fetchRecentPlays()).rejects.toThrow('KEXP API error: 503');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: 3 tests fail with "Cannot find module '../src/lib/kexp'"

- [ ] **Step 3: Implement kexp.ts**

Create `src/lib/kexp.ts`:

```typescript
export interface Play {
  airdate: string;
  song: string;
  artist: string;
  album: string | null;
  image_uri: string | null;
  thumbnail_uri: string | null;
}

interface PlaysResponse {
  results: Play[];
}

export async function fetchRecentPlays(limit = 20): Promise<Play[]> {
  const res = await fetch(
    `https://api.kexp.org/v2/plays/?format=json&limit=${limit}`
  );
  if (!res.ok) throw new Error(`KEXP API error: ${res.status}`);
  const data: PlaysResponse = await res.json();
  return data.results;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kexp.ts tests/kexp.test.ts
git commit -m "feat: add KEXP API client with tests"
```

---

## Task 4: Global dark theme CSS

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Replace app.css with dark theme variables**

Open `src/app.css` and replace its entire contents with:

```css
:root {
  --bg-primary: #0f0f0f;
  --bg-secondary: #1a1a1a;
  --bg-card: #212121;
  --bg-card-hover: #2a2a2a;
  --accent: #e91e63;
  --accent-dim: rgba(233, 30, 99, 0.15);
  --text-primary: #ffffff;
  --text-secondary: #9e9e9e;
  --text-muted: #616161;
  --border: #2e2e2e;
  --shadow: rgba(0, 0, 0, 0.5);
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  user-select: none;
}

::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app.css
git commit -m "feat: add dark theme CSS variables"
```

---

## Task 5: NowPlaying component

**Files:**
- Create: `src/components/NowPlaying.svelte`

- [ ] **Step 1: Create the component**

Create `src/components/NowPlaying.svelte`:

```svelte
<script lang="ts">
  import type { Play } from '../lib/kexp';

  export let play: Play | null = null;
</script>

<div class="now-playing">
  <div class="art-wrapper">
    {#if play?.image_uri}
      <img src={play.image_uri} alt="Album art" class="art" />
    {:else}
      <div class="art-placeholder">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
    {/if}
  </div>

  <div class="info">
    <div class="label">
      <span class="live-dot" />
      NOW PLAYING
    </div>
    {#if play}
      <div class="song">{play.song}</div>
      <div class="artist">{play.artist}</div>
      {#if play.album}
        <div class="album">{play.album}</div>
      {/if}
    {:else}
      <div class="song muted">Loading...</div>
    {/if}
  </div>
</div>

<style>
  .now-playing {
    display: flex;
    gap: 16px;
    padding: 20px 16px 16px;
    align-items: flex-start;
  }

  .art-wrapper {
    flex-shrink: 0;
    width: 96px;
    height: 96px;
    border-radius: 6px;
    overflow: hidden;
    background: var(--bg-card);
  }

  .art {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .art-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .info {
    flex: 1;
    min-width: 0;
    padding-top: 4px;
  }

  .label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--accent);
    margin-bottom: 8px;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .song {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }

  .artist {
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .album {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .muted {
    color: var(--text-muted);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NowPlaying.svelte
git commit -m "feat: add NowPlaying component"
```

---

## Task 6: PlayerControls component

**Files:**
- Create: `src/components/PlayerControls.svelte`

- [ ] **Step 1: Create the component**

Create `src/components/PlayerControls.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const STREAM_URL = 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3';

  let audio: HTMLAudioElement;
  let isPlaying = false;
  let volume = 0.8;

  onMount(() => {
    audio = new Audio(STREAM_URL);
    audio.volume = volume;
    audio.preload = 'none';
  });

  onDestroy(() => {
    audio?.pause();
  });

  function togglePlay() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
    } else {
      audio.src = STREAM_URL;
      audio.play().catch(console.error);
      isPlaying = true;
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
    background: #f06292;
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

- [ ] **Step 2: Commit**

```bash
git add src/components/PlayerControls.svelte
git commit -m "feat: add PlayerControls component with audio stream"
```

---

## Task 7: TrackFeed component

**Files:**
- Create: `src/components/TrackFeed.svelte`

- [ ] **Step 1: Create the component**

Create `src/components/TrackFeed.svelte`:

```svelte
<script lang="ts">
  import { open } from '@tauri-apps/plugin-shell';
  import type { Play } from '../lib/kexp';

  export let plays: Play[] = [];

  function formatTime(airdate: string): string {
    const date = new Date(airdate);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function searchTrack(play: Play) {
    const query = encodeURIComponent(`${play.artist} ${play.song}`);
    open(`https://duckduckgo.com/?q=${query}`).catch(console.error);
  }
</script>

<div class="feed-section">
  <div class="feed-header">RECENTLY PLAYED</div>
  <div class="feed">
    {#each plays as play, i (play.airdate)}
      <button
        class="track-row"
        class:current={i === 0}
        on:click={() => searchTrack(play)}
        title="Search on DuckDuckGo"
      >
        <div class="thumb-wrap">
          {#if play.thumbnail_uri}
            <img src={play.thumbnail_uri} alt="" class="thumb" />
          {:else}
            <div class="thumb-placeholder" />
          {/if}
        </div>
        <div class="track-info">
          <div class="track-song">{play.song}</div>
          <div class="track-artist">{play.artist}</div>
        </div>
        <div class="track-time">{formatTime(play.airdate)}</div>
      </button>
    {/each}

    {#if plays.length === 0}
      <div class="empty">Loading feed...</div>
    {/if}
  </div>
</div>

<style>
  .feed-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }

  .feed-header {
    padding: 8px 16px 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .feed {
    overflow-y: auto;
    flex: 1;
    padding: 4px 8px 8px;
  }

  .track-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .track-row:hover {
    background: var(--bg-card-hover);
    transform: scale(1.02);
    box-shadow: 0 4px 12px var(--shadow);
  }

  .track-row.current {
    background: var(--accent-dim);
    border: 1px solid rgba(233, 30, 99, 0.25);
  }

  .track-row.current:hover {
    background: rgba(233, 30, 99, 0.22);
  }

  .thumb-wrap {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--bg-card);
  }

  .thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-placeholder {
    width: 100%;
    height: 100%;
    background: var(--bg-secondary);
  }

  .track-info {
    flex: 1;
    min-width: 0;
  }

  .track-song {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-artist {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
  }

  .track-time {
    font-size: 11px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .empty {
    padding: 24px 8px;
    color: var(--text-muted);
    font-size: 13px;
    text-align: center;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TrackFeed.svelte
git commit -m "feat: add TrackFeed component with hover effects and DDG links"
```

---

## Task 8: App.svelte — polling + layout

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Replace App.svelte**

Open `src/App.svelte` and replace the entire file with:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fetchRecentPlays, type Play } from './lib/kexp';
  import NowPlaying from './components/NowPlaying.svelte';
  import PlayerControls from './components/PlayerControls.svelte';
  import TrackFeed from './components/TrackFeed.svelte';

  let plays: Play[] = [];
  let error: string | null = null;
  let intervalId: ReturnType<typeof setInterval>;

  async function poll() {
    try {
      plays = await fetchRecentPlays(20);
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load feed';
    }
  }

  onMount(() => {
    poll();
    intervalId = setInterval(poll, 30_000);
  });

  onDestroy(() => {
    clearInterval(intervalId);
  });

  $: currentPlay = plays[0] ?? null;
</script>

<div class="app">
  <NowPlaying play={currentPlay} />
  <PlayerControls />
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

- [ ] **Step 2: Ensure main.ts imports app.css**

Open `src/main.ts` and confirm it contains (add if missing):

```typescript
import './app.css';
import App from './App.svelte';

const app = new App({ target: document.getElementById('app')! });

export default app;
```

- [ ] **Step 3: Run the app and verify end-to-end**

```bash
npm run tauri dev
```

Expected:
- Window opens with dark background
- NowPlaying section shows current track with album art (may take a few seconds on first load)
- Play button works — KEXP audio streams
- Feed shows recent tracks, first one highlighted pink
- Hovering feed rows scales them up slightly
- Clicking a feed row opens DuckDuckGo in the system browser

- [ ] **Step 4: Run tests to confirm nothing broke**

```bash
npm test
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte src/main.ts
git commit -m "feat: wire App.svelte with polling and full layout"
```

---

## Task 9: Production build verification

**Files:** No changes — verification only.

- [ ] **Step 1: Build for production**

```bash
npm run tauri build
```

Expected: Builds without errors. Output binary at `src-tauri/target/release/kexp-player` (or in `src-tauri/target/release/bundle/`).

- [ ] **Step 2: Run the production binary**

```bash
./src-tauri/target/release/kexp-player
```

Expected: App launches, streams audio, feed populates.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify production build"
```
