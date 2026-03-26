import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STATIONS, DEFAULT_STATION, parseWfmuTime } from '../src/lib/stations';

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
    expect(new Date(plays[0].airdate).getTime()).not.toBeNaN();
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

  it('handles missing playlist key gracefully', async () => {
    const wfmu = STATIONS.find(s => s.id === 'wfmu')!;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const plays = await wfmu.fetchPlays();
    expect(plays).toHaveLength(0);
  });
});

describe('parseWfmuTime', () => {
  it('parses a valid 12-hour PM time', () => {
    const result = parseWfmuTime('4:31 PM');
    expect(new Date(result).getTime()).not.toBeNaN();
    expect(new Date(result).getHours()).toBe(16);
    expect(new Date(result).getMinutes()).toBe(31);
  });

  it('parses noon correctly', () => {
    const result = parseWfmuTime('12:00 PM');
    expect(new Date(result).getHours()).toBe(12);
  });

  it('parses midnight correctly', () => {
    const result = parseWfmuTime('12:00 AM');
    expect(new Date(result).getHours()).toBe(0);
  });

  it('falls back to current time on empty string', () => {
    const before = Date.now();
    const result = parseWfmuTime('');
    expect(new Date(result).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('falls back to current time on malformed input', () => {
    const before = Date.now();
    const result = parseWfmuTime('not-a-time');
    expect(new Date(result).getTime()).toBeGreaterThanOrEqual(before);
  });
});
