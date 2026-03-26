# KEXP Player — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Overview

A desktop app for Linux that streams KEXP radio and displays a scrollable now-playing feed. Built with Tauri 2 (Rust shell) + Svelte + TypeScript.

## Goals

- Stream KEXP audio with play/pause and volume control
- Display current track prominently (album art, artist, title, album)
- Show scrollable history of recently played tracks
- Let users click any track to search for it on DuckDuckGo
- Look visually polished with a dark theme; UI fully tweakable by the user

## Stack

| Layer | Technology |
|-------|-----------|
| App shell | Tauri 2 (Rust) |
| Frontend | Svelte + TypeScript |
| Styling | CSS (scoped per component) |
| Build | Vite |

## Audio

- Stream URL: `https://kexp-mp3-128.streamguys1.com/kexp128.mp3` (MP3 128kbps)
- Playback via HTML5 `<audio>` element in the Tauri webview
- Play/pause and volume controlled via JavaScript
- No Rust audio library needed

## Now Playing API

- Endpoint: `https://api.kexp.org/v2/plays/?format=json&limit=20`
- Polled every 30 seconds
- No authentication required
- Response includes: artist, title, album, album art URL, airdate
- Most recent entry = current track

## UI Layout

```
┌─────────────────────────────────┐
│  ██████████  NOW PLAYING        │
│  ██ art  ██  Artist Name        │
│  ██████████  Song Title         │
│              Album Name         │
│                                 │
│  [◀◀]  [▶ / ⏸]  ════════  🔊  │
├─────────────────────────────────┤
│  RECENTLY PLAYED                │
│  ┌─────────────────────────┐   │
│  │ 🎵 Artist · Song · time │   │  ← current (highlighted)
│  └─────────────────────────┘   │
│    Artist · Song · time        │
│    Artist · Song · time        │
│    ...                         │
└─────────────────────────────────┘
```

- Dark theme; album art large and prominent
- Current track has accent color highlight + subtle "live" indicator
- Feed is scrollable

## Interactions

**Hover on feed row:** Smooth scale-up + box-shadow pop via CSS transition (`transform: scale(1.02)`, `transition: 0.15s ease`).

**Click on feed row:** Opens a DuckDuckGo search in the system browser:
`https://duckduckgo.com/?q=<artist>+<title>`
Uses Tauri's `open()` API from `@tauri-apps/plugin-shell`.

## Polling Behavior

- On app load: fetch feed immediately, start 30s interval
- On each poll: compare most recent track to previous; if changed, update current track display and prepend to feed
- Feed shows up to 20 entries; older entries drop off the bottom

## Project Structure

```
kexp-player/
├── src-tauri/          # Rust/Tauri backend
│   ├── src/main.rs
│   └── tauri.conf.json
├── src/                # Svelte frontend
│   ├── App.svelte
│   ├── components/
│   │   ├── NowPlaying.svelte   # Album art + current track info
│   │   ├── PlayerControls.svelte  # Play/pause + volume
│   │   └── TrackFeed.svelte    # Scrollable history
│   ├── lib/
│   │   └── kexp.ts             # API polling logic
│   └── main.ts
├── docs/
│   └── superpowers/specs/
└── package.json
```

## Customization

All visual styling is in scoped CSS within each `.svelte` component. Colors, fonts, spacing, animations, and layout can be freely adjusted without touching logic.
