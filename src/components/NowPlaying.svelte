<script lang="ts">
  import type { Play } from '../lib/kexp';

  export let play: Play | null = null;
</script>

<div class="now-playing">
  <div class="art-wrapper">
    {#if play?.image_uri}
      <img src={play.image_uri} alt="Album art" class="art" />
    {:else}
      <div class="art-placeholder">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
    {/if}
  </div>

  <div class="info">
    <div class="label">
      <span class="live-dot"></span>
      NOW PLAYING
    </div>
    {#if play}
      <div class="song">{play.song}</div>
      <div class="artist">{play.artist}</div>
      {#if play.album}
        <div class="album">{play.album}</div>
      {/if}
    {:else}
      <div class="song muted">Loading...</div>
    {/if}
  </div>
</div>

<style>
  .now-playing {
    display: flex;
    gap: 16px;
    padding: 20px 16px 16px;
    align-items: flex-start;
  }

  .art-wrapper {
    flex-shrink: 0;
    width: 96px;
    height: 96px;
    border-radius: 6px;
    overflow: hidden;
    background: var(--bg-card);
  }

  .art {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .art-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .info {
    flex: 1;
    min-width: 0;
    padding-top: 4px;
  }

  .label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--accent);
    margin-bottom: 8px;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .song {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }

  .artist {
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .album {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .muted {
    color: var(--text-muted);
  }
</style>
