<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { DEFAULT_STATION } from '../lib/stations';
  import type { Station } from '../lib/stations';
  import type { Play } from '../lib/kexp';
  import NowPlaying from '../components/NowPlaying.svelte';
  import PlayerControls from '../components/PlayerControls.svelte';
  import TrackFeed from '../components/TrackFeed.svelte';
  import StationSelector from '../components/StationSelector.svelte';

  let selectedStation: Station = DEFAULT_STATION;
  let plays: Play[] = [];
  let error: string | null = null;
  let intervalId: ReturnType<typeof setInterval>;

  async function poll() {
    try {
      plays = await selectedStation.fetchPlays();
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load feed';
    }
  }

  function startPolling() {
    clearInterval(intervalId);
    plays = [];
    poll();
    intervalId = setInterval(poll, 30_000);
  }

  function onStationChange(e: CustomEvent<Station>) {
    selectedStation = e.detail;
    startPolling();
  }

  onMount(() => {
    startPolling();
  });

  onDestroy(() => {
    clearInterval(intervalId);
  });

  $: currentPlay = plays[0] ?? null;
</script>

<div class="app">
  <StationSelector selected={selectedStation} on:change={onStationChange} />
  <NowPlaying play={currentPlay} />
  <PlayerControls streamUrl={selectedStation.streamUrl} />
  {#if error}
    <div class="error">{error}</div>
  {/if}
  <TrackFeed {plays} />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg-primary);
    overflow: hidden;
  }

  .error {
    margin: 0 16px 8px;
    padding: 8px 12px;
    background: rgba(244, 67, 54, 0.15);
    border: 1px solid rgba(244, 67, 54, 0.3);
    border-radius: 4px;
    color: #ef9a9a;
    font-size: 12px;
  }
</style>
