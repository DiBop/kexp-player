<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let streamUrl: string;

  let audio: HTMLAudioElement;
  let isPlaying = false;
  let volume = 0.8;
  let activeUrl = '';
  let playGeneration = 0;

  onMount(() => {
    audio = new Audio();
    audio.volume = volume;
    audio.preload = 'none';
  });

  onDestroy(() => {
    audio?.pause();
  });

  // Stop audio immediately when streamUrl changes (station switch)
  $: if (audio && isPlaying && streamUrl !== activeUrl) {
    playGeneration++;
    audio.pause();
    audio.src = '';
    isPlaying = false;
  }

  function togglePlay() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
    } else {
      const gen = ++playGeneration;
      activeUrl = streamUrl;
      audio.src = streamUrl;
      audio.play()
        .then(() => { if (gen === playGeneration) isPlaying = true; })
        .catch((err) => {
          console.error('Audio playback failed:', err);
          if (gen === playGeneration) isPlaying = false;
        });
    }
  }

  function onVolumeChange(e: Event) {
    volume = parseFloat((e.target as HTMLInputElement).value);
    audio.volume = volume;
  }
</script>

<div class="controls">
  <button class="play-btn" on:click={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
    {#if isPlaying}
      <!-- Pause icon -->
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    {:else}
      <!-- Play icon -->
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21"/>
      </svg>
    {/if}
  </button>

  <div class="volume-group">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="vol-icon">
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      {#if volume > 0.5}
        <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" stroke-width="2" fill="none"/>
      {:else if volume > 0}
        <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" stroke-width="2" fill="none"/>
      {/if}
    </svg>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={volume}
      on:input={onVolumeChange}
      class="volume-slider"
      aria-label="Volume"
    />
  </div>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 16px 16px;
  }

  .play-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    background: var(--accent);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .play-btn:hover {
    background: var(--accent-hover);
    transform: scale(1.05);
  }

  .play-btn:active {
    transform: scale(0.97);
  }

  .volume-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .vol-icon {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .volume-slider {
    flex: 1;
    -webkit-appearance: none;
    height: 3px;
    border-radius: 2px;
    background: var(--border);
    outline: none;
    cursor: pointer;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--text-secondary);
    transition: background 0.15s ease;
  }

  .volume-slider:hover::-webkit-slider-thumb {
    background: var(--text-primary);
  }
</style>
