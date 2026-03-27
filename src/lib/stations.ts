import { invoke } from '@tauri-apps/api/core';
import type { Play } from './kexp';
import { fetchRecentPlays } from './kexp';

export interface Station {
  id: string;
  name: string;
  streamUrl: string;
  fetchPlays: () => Promise<Play[]>;
}

const WFMU_HISTORY_KEY = 'wfmu-history';
const wfmuHistory: Play[] = JSON.parse(localStorage.getItem(WFMU_HISTORY_KEY) ?? '[]');
export function clearWfmuHistory() {
  wfmuHistory.length = 0;
  localStorage.removeItem(WFMU_HISTORY_KEY);
}

async function fetchWfmuPlays(): Promise<Play[]> {
  // Fetch via Rust to bypass CORS (WFMU has no Access-Control-Allow-Origin header)
  const html: string = await invoke('fetch_wfmu_html');
  // HTML contains: &quot;SONG&quot;\nby\nARTIST\n
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

export const DEFAULT_STATION = STATIONS[0];
