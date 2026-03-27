import type { Play } from './kexp';
import { fetchRecentPlays } from './kexp';

export interface Station {
  id: string;
  name: string;
  streamUrl: string;
  fetchPlays: () => Promise<Play[]>;
}

async function fetchWfmuPlays(): Promise<Play[]> {
  const res = await fetch('https://wfmu.org/currentliveshows_aggregator.php?ch=1');
  if (!res.ok) throw new Error(`WFMU API error: ${res.status}`);
  const html = await res.text();
  // HTML contains: &quot;SONG&quot;\nby\nARTIST\n
  const match = html.match(/&quot;(.+?)&quot;\s*\nby\s*\n(.+?)\s*\n/);
  if (!match) return [];
  return [{
    airdate: new Date().toISOString(),
    song: match[1].trim(),
    artist: match[2].trim(),
    album: null,
    image_uri: null,
    thumbnail_uri: null,
  }];
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
