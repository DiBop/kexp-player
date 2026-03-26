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

  it('filters out plays with no song or artist', async () => {
    const musicPlay = { ...mockPlay };
    const airbreak = { airdate: '2026-03-26T12:01:00Z', song: null, artist: null, album: null, image_uri: null, thumbnail_uri: null };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [musicPlay, airbreak] }),
    } as Response);

    const plays = await fetchRecentPlays();

    expect(plays).toHaveLength(1);
    expect(plays[0].artist).toBe('Simple Minds');
  });
});
