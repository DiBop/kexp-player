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
