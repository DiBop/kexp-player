export interface Play {
  airdate: string;
  song: string | null;
  artist: string | null;
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
  return data.results.filter((p) => p.song && p.artist);
}
