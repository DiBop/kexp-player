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
