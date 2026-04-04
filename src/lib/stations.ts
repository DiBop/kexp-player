import { invoke } from '@tauri-apps/api/core';
import type { Play } from './kexp';
import { fetchRecentPlays } from './kexp';

/**
 * Describes a radio station the app can stream.
 * Add new stations by appending an entry to {@link STATIONS}.
 */
export interface Station {
  /** Unique identifier, e.g. `'kexp'` or `'wfmu'`. */
  id: string;
  /** Human-readable display name shown in the station selector. */
  name: string;
  /** Direct MP3/AAC stream URL passed to the HTML audio element. */
  streamUrl: string;
  /**
   * Fetches the most recent plays for this station,
   * normalized to the shared {@link Play} interface.
   *
   * @returns Array of plays, most recent first.
   * @throws {Error} If the underlying API or fetch fails.
   */
  fetchPlays: () => Promise<Play[]>;
}

/** localStorage key used to persist WFMU play history across sessions. */
const WFMU_HISTORY_KEY = 'wfmu-history';

/** In-memory WFMU play history, seeded from localStorage on startup. */
const wfmuHistory: Play[] = JSON.parse(localStorage.getItem(WFMU_HISTORY_KEY) ?? '[]');

/**
 * Clears the WFMU in-memory play history and removes it from localStorage.
 * Primarily used in tests to reset state between cases.
 */
export function clearWfmuHistory() {
  wfmuHistory.length = 0;
  localStorage.removeItem(WFMU_HISTORY_KEY);
}

/**
 * Fetches the currently playing track on WFMU by invoking a Rust command
 * that performs the HTTP request server-side, bypassing CORS restrictions.
 *
 * WFMU does not expose a JSON API — the now-playing data is parsed from
 * the HTML aggregator page using a regex match on the `&quot;SONG&quot;\nby\nARTIST`
 * pattern. Only the current track is available; history is accumulated
 * in-memory and persisted to localStorage across sessions (up to 10 tracks).
 *
 * @returns Array of up to 10 recent plays, most recent first.
 *          Returns existing history unchanged if no current track is found.
 * @throws {Error} If the Rust `fetch_wfmu_html` command fails.
 */
async function fetchWfmuPlays(): Promise<Play[]> {
  const html: string = await invoke('fetch_wfmu_html');
  const match = html.match(/&quot;(.+?)&quot;\s*\nby\s*\n(.+?)\s*\n/);
  if (!match) return wfmuHistory.slice();

  const current: Play = {
    airdate: new Date().toISOString(),
    song: match[1].trim(),
    artist: match[2].trim(),
    album: null,
    image_uri: null,
    thumbnail_uri: null,
  };

  const last = wfmuHistory[0];
  if (!last || last.song !== current.song || last.artist !== current.artist) {
    wfmuHistory.unshift(current);
    if (wfmuHistory.length > 10) wfmuHistory.pop();
    localStorage.setItem(WFMU_HISTORY_KEY, JSON.stringify(wfmuHistory));
  }

  return wfmuHistory.slice();
}

/**
 * All available stations. Add a new entry here to add a station to the app.
 * Stations with CORS-friendly JSON APIs can use a plain `fetch()` for `fetchPlays`.
 * Stations without CORS support need a corresponding Rust command (see `lib.rs`).
 */
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
    streamUrl: 'https://stream0.wfmu.org/freeform-128k',
    fetchPlays: fetchWfmuPlays,
  },
];

/** The station selected by default on app startup. */
export const DEFAULT_STATION = STATIONS[0];
