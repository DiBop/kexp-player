import { describe, it, expect, vi, beforeEach } from 'vitest';
import { STATIONS, DEFAULT_STATION } from '../src/lib/stations';

// Mock Tauri invoke (used by fetchWfmuPlays to bypass CORS)
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

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
    expect(wfmu.streamUrl).toBe('https://stream0.wfmu.org/freeform-128k');
  });
});

const WFMU_HTML = `<div class="bigline">
<span class="KDBFavIcon KDBsong" id="KDBsong-123"></span>
&quot;Psycho Killer&quot;
by
Talking Heads
</div>`;

describe('WFMU fetchPlays', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parses song and artist from HTML response', async () => {
    const wfmu = STATIONS.find(s => s.id === 'wfmu')!;
    vi.mocked(invoke).mockResolvedValue(WFMU_HTML);

    const plays = await wfmu.fetchPlays();

    expect(plays).toHaveLength(1);
    expect(plays[0].song).toBe('Psycho Killer');
    expect(plays[0].artist).toBe('Talking Heads');
    expect(plays[0].album).toBeNull();
    expect(plays[0].image_uri).toBeNull();
    expect(plays[0].thumbnail_uri).toBeNull();
    expect(new Date(plays[0].airdate).getTime()).not.toBeNaN();
  });

  it('returns empty array when no match found in HTML', async () => {
    const wfmu = STATIONS.find(s => s.id === 'wfmu')!;
    vi.mocked(invoke).mockResolvedValue('<html><body>No track info</body></html>');

    const plays = await wfmu.fetchPlays();
    expect(plays).toHaveLength(0);
  });

  it('throws when invoke rejects', async () => {
    const wfmu = STATIONS.find(s => s.id === 'wfmu')!;
    vi.mocked(invoke).mockRejectedValue(new Error('network error'));

    await expect(wfmu.fetchPlays()).rejects.toThrow('network error');
  });
});
