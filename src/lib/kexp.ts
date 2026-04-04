/**
 * Represents a single track play as returned by the KEXP API
 * and used as the shared data shape across all stations.
 */
export interface Play {
  /** ISO 8601 timestamp of when the track aired. */
  airdate: string;
  /** Track title, or `null` if unavailable. */
  song: string | null;
  /** Artist name, or `null` if unavailable. */
  artist: string | null;
  /** Album title, or `null` if unavailable. */
  album: string | null;
  /** Full-size album art URL, or `null` if unavailable. */
  image_uri: string | null;
  /** Thumbnail album art URL, or `null` if unavailable. */
  thumbnail_uri: string | null;
}

/** Raw response shape from the KEXP v2 plays API. */
interface PlaysResponse {
  results: Play[];
}

/**
 * Fetches recent plays from the KEXP public API.
 *
 * @param limit - Maximum number of plays to fetch. Defaults to 20.
 * @returns Array of plays with non-null song and artist, most recent first.
 * @throws {Error} If the API returns a non-2xx response.
 */
export async function fetchRecentPlays(limit = 20): Promise<Play[]> {
  const res = await fetch(
    `https://api.kexp.org/v2/plays/?format=json&limit=${limit}`
  );
  if (!res.ok) throw new Error(`KEXP API error: ${res.status}`);
  const data: PlaysResponse = await res.json();
  return data.results.filter((p) => p.song && p.artist);
}
