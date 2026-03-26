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
